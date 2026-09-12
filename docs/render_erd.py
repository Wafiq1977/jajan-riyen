"""Render docs/erd.html -> docs/erd.png (Playwright + CSS route, per charts skill)."""
import asyncio
import os
from playwright.async_api import async_playwright

HTML = "/home/z/my-project/docs/erd.html"
OUT = "/home/z/my-project/docs/erd.png"


async def html_to_image(html_path, output_path, selector="#root", width=1960, height=None, scale=2):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            viewport={"width": width, "height": height or 1500},
            device_scale_factor=scale,
        )
        await page.goto(f"file://{html_path}", wait_until="networkidle")
        await page.wait_for_timeout(500)

        el = page.locator(selector)
        bbox = await el.bounding_box()
        if bbox:
            fit_w = max(width, int(bbox["width"] + 100))
            fit_h = int(bbox["height"] + 100)
            await page.set_viewport_size({"width": fit_w, "height": fit_h})
            await page.wait_for_timeout(200)
        await el.screenshot(path=output_path)
        await browser.close()
        print(f"OK {output_path} ({os.path.getsize(output_path)/1024:.0f}KB)")
        if bbox:
            print(f"#root bbox: {bbox['width']:.0f} x {bbox['height']:.0f} CSS px (scale {scale})")


if __name__ == "__main__":
    asyncio.run(html_to_image(HTML, OUT))
