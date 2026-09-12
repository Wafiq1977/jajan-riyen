"""Geometric QA for docs/erd.html: overlap, clipping, wire-through-box checks."""
import asyncio
from playwright.async_api import async_playwright

HTML = "/home/z/my-project/docs/erd.html"


def inter(a, b):
    x = max(0, min(a["x"] + a["width"], b["x"] + b["width"]) - max(a["x"], b["x"]))
    y = max(0, min(a["y"] + a["height"], b["y"] + b["height"]) - max(a["y"], b["y"]))
    return x * y


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1960, "height": 1500})
        await page.goto(f"file://{HTML}", wait_until="networkidle")
        await page.wait_for_timeout(300)

        result = await page.evaluate(
            """() => {
            const bb = el => { const r = el.getBoundingClientRect();
                return {x:r.x, y:r.y, width:r.width, height:r.height}; };
            const out = {boxes:{}, wires:[], root:null};

            // Collect independent decorative/card elements (their children excluded)
            const sels = ['.entity', '.pill', '.chip', '.legend', '.title', '.foot'];
            for (const sel of sels)
                for (const el of document.querySelectorAll(sel))
                    out.boxes[(sel + ':' + (el.className)).slice(0, 40) + '#' + out.boxes.length
                              + '|' + (el.querySelector('.e-name')?.textContent
                                       || el.textContent.trim().slice(0, 22))] = bb(el);

            const root = document.querySelector('#root');
            out.root = bb(root);

            // Sample every SVG path
            for (const path of document.querySelectorAll('svg.wires path')) {
                const L = path.getTotalLength(), pts = [];
                const n = Math.max(24, Math.ceil(L / 4));
                for (let i = 0; i <= n; i++) {
                    const pt = path.getPointAtLength(L * i / n);
                    pts.push([pt.x, pt.y]);
                }
                out.wires.push({d: path.getAttribute('d').slice(0, 60), pts});
            }
            for (const c of document.querySelectorAll('svg.wires circle')) {
                const r = c.r.baseVal.value, cx = c.cx.baseVal.value, cy = c.cy.baseVal.value;
                out.wires.push({d: 'circle', pts: [[cx - r, cy], [cx, cy - r], [cx + r, cy], [cx, cy + r]]});
            }
            return out;
        }"""
        )
        await browser.close()

    boxes = result["boxes"]
    errors = []

    # 1) pairwise overlap between distinct elements
    keys = list(boxes)
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            ov = inter(boxes[keys[i]], boxes[keys[j]])
            if ov > 4:  # >4px² = real overlap (tolerate antialiasing touch)
                errors.append(
                    f"OVERLAP {ov:.0f}px²: [{keys[i]}] x [{keys[j]}] "
                    f"{boxes[keys[i]]} x {boxes[keys[j]]}"
                )

    # 2) wires must not pass through entity boxes (endpoints touching edges allowed)
    for w in result["wires"]:
        for k, b in boxes.items():
            if not k.startswith(".entity"):
                continue
            for (x, y) in w["pts"]:
                inside = (
                    b["x"] + 1.5 < x < b["x"] + b["width"] - 1.5
                    and b["y"] + 1.5 < y < b["y"] + b["height"] - 1.5
                )
                if inside:
                    errors.append(f"WIRE-THROUGH-BOX: {w['d']} inside {k} at ({x:.0f},{y:.0f})")
                    break

    # 3) clipping: everything inside #root
    r = result["root"]
    for k, b in boxes.items():
        if (
            b["x"] < r["x"] - 0.5
            or b["y"] < r["y"] - 0.5
            or b["x"] + b["width"] > r["x"] + r["width"] + 0.5
            or b["y"] + b["height"] > r["y"] + r["height"] + 0.5
        ):
            errors.append(f"CLIPPED: {k} outside #root")

    print(f"elements checked: {len(boxes)} | wire samples: {sum(len(w['pts']) for w in result['wires'])}")
    if errors:
        print("FAILURES:")
        for e in errors:
            print(" -", e)
    else:
        print("PASS: zero overlap, no wire through any box, nothing clipped")


asyncio.run(main())
