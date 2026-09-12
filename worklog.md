---
Task ID: 4
Agent: general-purpose (image generation)
Task: Generate product images for TOSKA marketplace

Work Log:
- Read worklog.md (did not exist; this is one of the first records).
- Verified z-ai CLI is available at /usr/local/bin/z-ai.
- Created directory /home/z/my-project/public/products.
- Generated 10 square product images (1024x1024) sequentially via `z-ai image -p "<prompt>" -o <path> -s 1024x1024`: ayam-geprek, es-teh, nasi-goreng, burger, kopi, martabak, mie-ayam, sate, dimsum, es-krim. All succeeded on first attempt.
- Banner (1440x720) FAILED on first attempt: API rejected size (error 1214: dimensions must be between 512-2880px AND multiples of 32; 720 is not a multiple of 32). Second attempt at 1472x736 rejected by CLI's own size whitelist. Third attempt succeeded at 1344x768 (CLI-supported wide format, both dims multiples of 32) — used as the closest valid wide-banner substitute.
- Noticed z-ai CLI wrote JPEG data with .png extension; converted all 11 files to true PNG format with Python PIL (Pillow) to match extensions.
- Verified all files with `file` and `ls -la`: 10 product PNGs at 1024x1024, banner PNG at 1344x768.

Stage Summary:
- SUCCESS (10 product images, 1024x1024 PNG):
  - /home/z/my-project/public/products/ayam-geprek.png
  - /home/z/my-project/public/products/es-teh.png
  - /home/z/my-project/public/products/nasi-goreng.png
  - /home/z/my-project/public/products/burger.png
  - /home/z/my-project/public/products/kopi.png
  - /home/z/my-project/public/products/martabak.png
  - /home/z/my-project/public/products/mie-ayam.png
  - /home/z/my-project/public/products/sate.png
  - /home/z/my-project/public/products/dimsum.png
  - /home/z/my-project/public/products/es-krim.png
- SUCCESS (1 banner, 1344x768 PNG — note: requested 1440x720 was not supported by the image API; 1344x768 used as closest valid wide format):
  - /home/z/my-project/public/banner-promo.png
- No permanent failures: 11/11 images generated.

---
Task ID: 2,3,5,6,7,8
Agent: Z.ai Code (main)
Task: Build TOSKA mobile marketplace (teal/white theme) — DB, APIs, all frontend screens, verification

Work Log:
- Rewrote prisma/schema.prisma: User (phone login, isSeller), Store (1:1 user, seller profile), Product, Order (status: PENDING/PROCESSING/COMPLETED/CANCELLED; payment: TUNAI/QRIS). Pushed with db:push.
- Seeded 5 demo stores + 14 products via prisma/seed.ts (bunx tsx).
- Created API routes: POST /api/auth/login (upsert by phone), GET /api/user/[id], POST /api/seller/register (creates Store + sets isSeller in a transaction), GET /api/stores (q + category filter), GET /api/stores/[id], POST /api/products, DELETE /api/products/[id] (blocks delete if orders exist), GET/POST /api/orders (transaction: create order + increment sold/decrement stock), PATCH /api/orders/[id] (status transitions).
- Built single-route mobile app (src/app/page.tsx -> components/app/toska-app.tsx): client-side screen state machine with history stack + direction-aware framer-motion transitions (splash, login, home, orders, account, seller, store, product, checkout, success, seller-form).
- Screens: animated splash; phone+OTP login (simulated SMS shows the code); home (search, category chips, promo banner, flash sale rail, store list); store detail (hero, info card, menu with voucher-notch buy rows); product detail (hero image, badges, sticky buy bar); checkout (qty stepper, TUNAI/QRIS method cards, real QR generated via qrcode lib, savings summary); success (confetti + order code); orders (status filter tabs w/ counts, cancel pending, refresh); account (stats, seller CTA / dashboard entry, help/about/logout dialogs); seller form (benefits, store form); seller dashboard (stats grid, orders tab with Terima/Tandai Selesai actions, products tab with add-product dialog incl. emoji picker + flash sale switch, delete product).
- Bottom nav auto-grows a "Toko" tab the moment a user registers as a seller.
- Theming: globals.css teal/tosca palette (primary #0d9488), brand gradients, press feedback, voucher notches, custom scrollbars; Plus Jakarta Sans font; 430px phone frame centered on desktop.
- Installed qrcode + @types/qrcode. Generated favicon.svg.
- Browser verification (agent-browser, 400x850 + 1280x800): splash -> OTP login -> home -> store -> product -> checkout QRIS -> order created (Rp54.000 x3 qty later cancelled; Rp12.000 completed) -> success -> orders tab -> account -> seller registration -> dashboard auto-active with new "Toko" nav tab -> added product (Es Kelapa Muda Segar, flash sale) -> bought own product -> accepted order -> completed order -> cancelled pending order -> search works -> desktop frame OK. No browser console errors.
- Fixed issue found during verification: overlap stacking bug where gradient headers (positioned) covered -mt overlap cards; added relative z-10 to overlap wrappers in 6 screens. Fixed react-hooks/set-state-in-effect lint error by deferring setState to timeout callbacks.
- Lint: 0 errors, 0 warnings.

Stage Summary:
- Complete TOSKA marketplace: buyer flow (phone OTP login, browse, buy via TUNAI/QRIS, cancel) + seller flow (register from Akun page, dashboard auto-added, manage products/orders).
- Key decisions: single-route SPA with state-machine navigation (per sandbox constraint); simulated OTP; real QR via qrcode package; all users default buyers; seller registration is one transaction that flips isSeller + creates store.
- Artifacts: prisma/schema.prisma, prisma/seed.ts, 9 API routes, 10 screens + shared components, updated globals.css/layout/page.

---
Task ID: 1 (poster asset)
Agent: general-purpose (image generation)
Task: Generate flash-sale popup poster for Jajan Riyen

Work Log:
- Generated /home/z/my-project/public/flashsale-poster.png at 768x1344 (CLI whitelist portrait size) via z-ai CLI.
- Converted JPEG->true PNG with PIL (same CLI quirk as before). Vision-QA'd: clean dark-teal top for text overlay, no text in image.

Stage Summary:
- Poster asset ready at public/flashsale-poster.png (768x1344 PNG).

---
Task ID: 2-9 (main)
Agent: Z.ai Code (main)
Task: Rebrand TOSKA -> Jajan Riyen (JR) + 10 user requests: JR logo, responsive fixes, cart per UMKM, Jelajahi tab, flash-sale popup, clickable flash banner, separate seller dashboard, person icon, transparent navbar

Work Log:
- Schema: added OrderItem model (orderId, productId, name, price, quantity, emoji, imageUrl); Order now has items[] + total quantity/totalPrice; removed Order.productId FK. db:push --accept-data-loss + reseeded (5 stores, 14 products).
- API: rewrote POST /api/orders to accept {userId, storeId, paymentMethod, items[]} — validates ALL items belong to ONE store (never merges UMKM transactions), dedupes quantities, stock-checks, transactional create with nested items + stock/sold updates. LEARNED: Prisma checked-input mode (nested writes) requires relation `connect:{id}` instead of scalar FK — had to restart dev server after client regen because the running process held the stale generated client.
- Fixed GET orders / PATCH order includes (items instead of product); products DELETE now counts orderItem.
- Cart: new persisted zustand useCartStore (single-store cart; addItem returns added|replaced|conflict; conflict -> AlertDialog "Ganti isi keranjang?" in store & product screens). Cart badge on navbar + floating CartBar (home/explore/orders/account above nav; store screen bottom).
- Brand: recreated owner's logo as SVG component (brand.tsx: JrMark/JrBadge/BrandWordmark "Jajan**Riyen**", Jajan ink + Riyen emerald); new favicon.svg (JR + leaf on teal gradient); renamed app shell toska-app.tsx -> jr-app.tsx; all TOSKA strings -> Jajan Riyen; order codes JR-XXXXXX; QR payload JRPAY.
- Navbar: buyer tabs now Beranda | Jelajahi | Keranjang(badge) | Pesanan | Akun in floating glass pill (bottom-glass, rounded-[26px], safe-area). Seller tab REMOVED — seller dashboard is a separate pushed page with dark slate header + back button + "MODE PENJUAL" badge (menu via Akun card & menu item).
- TopBar widget: transparent over gradient heroes, smooth transition to frosted glass (nav-glass, blur 18px + saturate) after 24px scroll; used on home/explore/flash-sale.
- New screens: explore-screen (Jelajahi: search, emoji category circles, "Pilihan JajanRiyen" gradient quick-filter cards [Diskon Besar/Paling Dicari/Paling Dekat/Flash Sale], 2-col "Rekomendasi di Sekitarmu" grid with distance badges); flash-sale-screen (orange hero + midnight countdown chip, all flash items with stock bars, Beli -> product); cart-screen (per-UMKM note, multi-item qty steppers, TUNAI/QRIS + shared QrisPanel, floating sticky footer above nav; empty state -> Jelajahi).
- Flash sale popup (widgets.FlashSalePopup): shows once per session ~650ms after login lands on beranda; poster + countdown to midnight + "Serbu Diskonnya!" -> flash-sale screen. BUGFIX: initial effect cleanup cancelled the timeout when goTab re-created screen object; removed cleanup intentionally.
- Home: clickable FLASH SALE banner -> flash-sale screen; flash rail header "Lihat Semua" + countdown chip; store rows get "+" quick-add w/ check feedback.
- Orders: multi-item rendering (emoji/img thumb rows, price x qty, per-item subtotal, max-h scroll if >3 items, "N item" chip).
- Account: person icon avatar (CircleUserRound + verified dot), dark "Dashboard Penjual MODE PENJUAL" card, menu items Keranjang Belanja/Lihat Toko Saya/Buka Dashboard Penjual, JR branding, help/FAQ updated (cart per UMKM).
- Seller dashboard: separate page (back + dark header), multi-item order cards, compact omzet (formatRupiahCompact 15rb), stats grid fixed (was invalid h-13 w-13).
- Responsive/cut-off fixes: login card z-10 under rounded header (was clipped), phone input flex-1 min-w-0 + shrink-0 prefix, cart note text wrapped in span (was broken into flex columns), cart sticky footer lifted above nav (bottom-[calc(76px+env)] + floating rounded), valid Tailwind sizes only.
- Verified via agent-browser (400x850, 360x740, 1280x800): splash->login(OTP)->popup->home->banner->flash sale->product->+cart->store 2nd item->cart qty+/QRIS->order JR-6QZCLH 3 item Rp44.000->success->orders multi-item; cross-store conflict dialog (Ya Ganti replaces cart); Akun person icon; seller register (Warung Jajanan Mbak Yuli) -> separate dark dashboard -> add flash product -> buy own product (direct checkout TUNAI) -> Terima -> Selesai; explore filters render; transparent->glass navbar on scroll; desktop frame centered. User's live store "wafiq" (Es Tosca 50% flash) renders fine.
- Lint 0/0, tsc clean (app code). Dev server 200, no runtime errors in dev.log.

Stage Summary:
- App fully rebranded Jajan Riyen (JR) with all 10 requested features working and browser-verified.
- Key decisions: OrderItem table for multi-product orders (one transaction per UMKM enforced server-side); cart = single-store client-side with replace-or-cancel conflict UX; seller mode never mixes into buyer navbar (separate dark page via Akun); popup once per browser session.
- Artifacts: brand.tsx, widgets.tsx (TopBar/QrisPanel/CartBar/FlashSalePopup/countdown), jr-app.tsx, 3 new screens (explore/flash-sale/cart), rewritten screens (home/store/product/checkout/orders/account/seller-dashboard/splash/login), orders API v2 (items[]), schema OrderItem, favicon.svg, flashsale-poster.png.

---
Task ID: 2-a
Agent: general-purpose (image generation)
Task: Generate 5 UMKM banner images for Jajan Riyen store heroes

Work Log:
- Read worklog.md; confirmed z-ai CLI workflow (1344x768 wide size is CLI-whitelisted, both dims multiples of 32) and the known JPEG-data-with-png-extension quirk.
- Created directory /home/z/my-project/public/banners (mkdir -p), verified z-ai at /usr/local/bin/z-ai.
- Generated 5 wide banners sequentially via `z-ai image -p "<prompt>" -o <path> -s 1344x768`: banner-geprek (ayam geprek dusk warung), banner-kopi (coffee shop golden hour), banner-dapur (nasi goreng homey warung), banner-burger (double cheeseburger bokeh), banner-dessert (martabak pastel stall). All succeeded on first attempt with prompts center-framed / warm-moody for white-text overlay.
- Ran `file` on all 5: all were JPEG data despite .png extension (known CLI quirk). Converted all 5 to true PNG with Python PIL (Pillow) preserving 1344x768.
- Re-verified with `file` + PIL: all 5 now true PNG (8-bit RGB non-interlaced), 1344x768; sizes 784KB-1.33MB. Sanity brightness check: mean 70-121, stddev 53-60 => real photographic content, darker moody tones for geprek/burger, brighter pastel for dessert, suitable as hero backgrounds behind white store names.

Stage Summary:
- SUCCESS (5 UMKM store-hero banners, all 1344x768 true PNG):
  - /home/z/my-project/public/banners/banner-geprek.png (~1.33 MB, warm dusk warung, ayam geprek + sambal)
  - /home/z/my-project/public/banners/banner-kopi.png (~0.78 MB, golden-hour coffee counter, teal/cream)
  - /home/z/my-project/public/banners/banner-dapur.png (~1.13 MB, nasi goreng + satay homey warung)
  - /home/z/my-project/public/banners/banner-burger.png (~1.21 MB, cheeseburger + fries, warm bokeh)
  - /home/z/my-project/public/banners/banner-dessert.png (~1.20 MB, martabak dessert stall, pastel)
- No failures; only issue was the documented CLI JPEG-as-.png quirk, fixed via PIL conversion. Note: PNG re-encode raised file sizes from ~90-146KB (JPEG) to 0.78-1.33MB (PNG) — acceptable for hero banners; consider WebP conversion later if payload weight matters.

---
Task ID: 9 (main)
Agent: Z.ai Code (main)
Task: 8 permintaan baru — upload logo/banner/produk UMKM, QRIS penjual opsional, barcode + scan pesanan, keranjang ke pojok kanan atas, lokasi & notifikasi klik-able, logo JR menyatu tanpa latar putih splash

Work Log:
- Schema: Store += logoUrl, bannerUrl, qrisEnabled(default false), qrisImageUrl, qrisCode. db:push + regen client + RESTART dev server (stale client issue seperti sebelumnya). Reseed: 5 toko demo kini punya logoUrl (product images), bannerUrl (/banners/*.png), Geprek Bu Rina qrisEnabled + /qris-demo/qris-bu-rina.png (dibuat via qrcode lib) + qrisCode ID10203340056781.
- Task 2-a (subagent, paralel): generate 5 banner UMKM 1344x768 di public/banners/ (geprek/kopi/dapur/burger/dessert), JPEG->PNG dikonversi, worklog dicatat.
- API baru: POST /api/upload (multipart, validasi tipe & max 5MB, simpan public/uploads/, return url); PATCH /api/seller/store (update logoUrl/bannerUrl/qrisEnabled/qrisImageUrl/qrisCode + validasi QRIS butuh gambar/kode, return user fresh); GET /api/orders/[id] (baru, untuk success screen); GET /api/orders/code/[code] (lookup JR-XXXXXX utk scan). seller/register kini terima logoUrl/bannerUrl.
- brand.tsx v2: JrMark digambar PATH murni — J hook menyatu ke stem R (ligature satu garis) + daun di puncak J; splash pakai mark putih langsung di gradient (kartu putih DIHAPUS); favicon.svg & logo.svg diganti desain sama.
- widgets.tsx: CartIconButton (ikon keranjang + badge, pojok kanan atas), BellIconButton (dot unread), AreaButton (nama area + ▾) — dipakai Home & Explore TopBar; LocationSheet (Drawer, 8 area, persist usePrefsStore); NotificationSheet (feed buildNotifications dari orders + promo, klik → pesanan/flash sale, markRead saat buka); QrisPanel + sellerQris prop (tampilkan gambar QRIS penjual + chip NMID).
- order-widgets.tsx baru: Barcode (JsBarcode CODE128), OrderTrackCard (barcode + timeline PENDING→PROCESSING→COMPLETED + ringkasan), TrackSheet (Drawer "Lacak & Barcode"), ScanDialog (html5-qrcode kamera + fallback manual "Kamera tidak tersedia", parse regex JR-code, lookup /api/orders/code, mode penjual: tombol Terima/Selesai cepat bila order dari toko sendiri).
- app-store.ts: usePrefsStore (area, persist), useNotifStore (orders + lastRead), buildNotifications().
- jr-app: nav 4 tab (Keranjang tab DIHAPUS), CartBar global dihapus (tetap ada di store screen sebagai checkout shortcut), refresh orders → notif store, sheet/dialog state global, ScanDialog + TrackSheet global.
- Home/Explore: 3 tombol top bar (lokasi klik-able, notifikasi klik-able, keranjang badge); kartu toko pakai logoUrl (home) & bannerUrl cover (explore).
- Store screen: hero = banner image + overlay gelap di belakang nama toko + logo img + chip "Terima QRIS" bila aktif.
- Checkout & Cart: QRIS hanya bisa dipilih bila store.qrisEnabled (kartu disabled + keterangan "Penjual belum aktifkan"); QrisPanel menampilkan QRIS milik penjual; cart fetch store by cart.storeId.
- Success screen: fetch order by id → kode asli + barcode Code128 + copy + tombol "Lihat & Lacak".
- Orders: header tombol "Scan"; tiap kartu tombol "Lacak & Barcode" → TrackSheet; barcode disembunyikan utk order CANCELLED.
- Seller form: section "Logo & Banner Toko" (ImageUploader logo + banner) → dikirim ke register API; benefit list + QRIS.
- Seller dashboard: header pakai banner bg + logo img; tab baru "Toko" (StoreSettingsTab): Switch QRIS + ImageUploader gambar QRIS + input NMID + Simpan (PATCH, "Tersimpan!"); edit logo/banner; tombol "Scan Barcode Pembeli" di tab Pesanan; AddProductDialog + ImageUploader foto produk.
- upload.tsx: ImageUploader (variant logo/banner/image/qris, preview, hapus, loading, error).
- FIX saat verifikasi: field QRIS awalnya gated di balik switch (chicken-and-egg) → dibuat selalu tampil; switch divalidasi saat save via API.
- Verifikasi agent-browser (400x850 + 360x740 + 1280x800): splash tanpa kartu putih; login OTP; popup flash sale; top bar kanan-atas (area/bell/cart); sheet lokasi (ganti Banyumanik → TopBar update); sheet notifikasi (promo + order BARU); toko Geprek: banner belakang nama + logo + badge QRIS; checkout QRIS menampilkan QRIS penjual + NMID; order JR-TB6834 → success barcode Code128; TrackSheet timeline; ScanDialog fallback manual → temukan pesanan; daftar penjual "Warung Sate Pak Slamet" + upload logo(sate) & banner (terunggah ke /uploads, preview benar); dashboard banner+logo; QRIS toggle menolak tanpa data → upload QRIS + kode + aktif + tersimpan; tambah produk dengan foto (tersimpan, tampil); etalase toko baru benar; beli produk sendiri QRIS → JR-Y39M7Q; scan sisi penjual → "Terima Pesanan Ini" → status Diproses real-time; cart QRIS disabled di toko tanpa QRIS; notifikasi order BARU muncul; desktop frame center; 360px responsif. Console bersih, dev.log tanpa error.
- Lint 0/0; tsc bersih (app code).

Stage Summary:
- Semua 8 permintaan selesai & terverifikasi browser: (1) upload logo UMKM, (2) upload banner latar nama toko, (3) upload foto produk, (4) QRIS penjual opsional (gambar+kode, gating per toko di checkout/keranjang), (5) barcode Code128 + scan kamera/manual + lacak timeline + aksi penjual, (6) keranjang ikon pojok kanan atas (tab nav dihapus), (7) lokasi & notifikasi klik-able (sheet + persist), (8) logo JR ligature menyatu + splash tanpa latar putih.
- Keputusan kunci: upload disimpan ke public/uploads via API (bukan base64 di DB); notifikasi = feed turunan orders (tanpa tabel baru); scan = html5-qrcode dengan fallback input manual (kamera sandbox tak tersedia); QRIS penjual bersifat opt-in per toko.
- Artefak: api/upload, api/seller/store, api/orders/code/[code], GET api/orders/[id], order-widgets.tsx, upload.tsx, widgets.tsx v2, brand.tsx v2, app-store v3, semua screen diperbarui, seed+banner aset, favicon/logo.svg baru.

---
Task ID: 10 (main)
Agent: Z.ai Code (main)
Task: 8 permintaan baru — OTP WA/SMS real, scan kamera real, lokasi real, form penjual data lengkap (NIK+Gmaps), scan hanya dashboard penjual, hapus notifikasi, logo "mulut melet", panduan deploy

Work Log:
- Schema: VerificationCode baru (phone, codeHash, expiresAt, attempts, consumed); User += nik, address; Store += latitude, longitude. db:push + reseed (5 toko demo kini punya koordinat Semarang).
- OTP engine (src/lib/otp.ts): generate+hash SHA256(salt), provider Fonnte (WA) → Wablas (WA) → Twilio (SMS) via env token; rate limit 5/jam/nomor. API baru POST /api/auth/otp (kirim/invalidasi kode lama; tanpa gateway → devMode+devCode) & POST /api/auth/verify (hash compare, kedaluwarsa 5 menit, max 5 percobaan, konsumsi sekali pakai, upsert user). Route lama /api/auth/login DIHAPUS (bypass OTP).
- Login screen: 2 langkah asli — kirim kode via WA/SMS (tanpa simulasi), banner "Mode pengembangan" HANYA saat gateway belum dikonfigurasi, InputOTP verifikasi server, countdown 60s resend, pesan sisa percobaan.
- Lokasi real: LocationSheet v2 — navigator.geolocation (highAccuracy) + reverse geocoding Nominatim (label kampung/kelurahan), persist coords di usePrefsStore (source gps|manual), pesan error izin/HTTPS + fallback 8 area manual; sheet auto-close saat pilih. Explore: jarak haversine real (userCoords↔store lat/lng) bila GPS aktif, sort "Paling Dekat" pakai jarak real.
- Form penjual WAJIB data pribadi: Nama sesuai KTP, NIK 16 digit (validasi regex + counter), alamat KTP (min 10 char); lokasi toko WAJIB via LocationPicker (map-picker.tsx): peta Leaflet OSM (dynamic import, divIcon pin draggable, klik peta), tombol GPS, dan parser link share Google Maps (@lat,lng / !3d!4d / q=). Register API validasi NIK 16 digit + koordinat, simpan ke User (name/nik/address) + Store (latitude/longitude).
- Scan seller-only: tombol Scan dihapus dari header Pesanan pembeli & menu Akun; ScanDialog kini hanya dibuka dari dashboard penjual (badge "PENJUAL"), selalu tampil di tab Pesanan penjual (pindah keluar kondisi empty-state).
- ScanDialog v2 (real di HP): engine native BarcodeDetector API (getUserMedia environment + detect loop 350ms, torch toggle) → fallback html5-qrcode → fallback input manual; fix crash html5-qrcode "Cannot stop" (throw sinkron saat scanner belum start — try/catch + null scannerRef).
- Notifikasi DIHAPUS total: BellIconButton, NotificationSheet, useNotifStore, buildNotifications dari widgets/app-store/jr-app/home/explore.
- Logo v3 "mulut melet": JrMark digambar ulang murni garis (bibir atas cupid's bow, bibir bawah, seam, lidah menjulur + garis tengah), stroke-only tanpa fill; dipakai di splash (tanpa kartu putih, wiggle animasi), login, favicon.svg, logo.svg; ikon PWA digenerate via sharp (192/512/maskable/apple-touch) di scripts/gen-icons.mjs.
- PWA lengkap: manifest.webmanifest (standalone, 3 icons, shortcuts), sw.js (network-first nav/API, cache-first static), pwa-register.tsx (register di production + capture beforeinstallprompt), metadata lengkap (appleWebApp, viewportFit cover), menu "Install Aplikasi di HP" di Akun (prompt native + panduan Android/iOS).
- FIX saat verifikasi: LocationSheet tidak menutup saat pilih area manual (tambah onOpenChange(false)); TS error markerRef null + torch constraint cast.
- Verifikasi agent-browser (400x850 & 1280x800): splash logo mulut melet tanpa putih; login → OTP request API asli (devCode tampil karena gateway kosong) → verifikasi 6 digit → home; top bar kini hanya lokasi+keranjang (bell hilang); sheet lokasi GPS (izin ditolak di sandbox → pesan error + manual fallback benar, Banyumanik persist); form penjual: NIK 16 digit valid, peta Leaflet tile Semarang termuat, paste link Gmaps @-7.0597,110.4483 → pin pindah + tombol aktif → register sukses (DB: user dengan nik/nama KTP/alamat, store lat/lng persis); dashboard penjual: scan dialog (kamera sandbox tak ada → fallback manual rapi), lookup JR-6DVVBM → aksi Terima → status Diproses real-time → Tandai Selesai; pesanan pembeli: header TANPA tombol scan, TrackSheet barcode Code128 + timeline; manifest tersaji (3 icons standalone); console bersih; lint 0/0; tsc app code bersih.
- Dokumen: PANDUAN-DEPLOY.md (deploy VPS/Vercel+Turso/Railway, aktivasi Fonnte/Wablas/Twilio, install PWA di HP, APK via PWABuilder/Bubblewrap, publish Play Store $25, .env reference, troubleshooting, checklist go-live) + .env.example.

Stage Summary:
- Semua 8 permintaan selesai & terverifikasi browser: (1) OTP dikirim beneran via WA/SMS begitu token gateway diisi (arsitektur siap, mode dev otomatis tanpa token), (2) scan barcode engine native BarcodeDetector + torch untuk HP (HTTPS wajib, tercakup di panduan), (3) lokasi GPS + reverse geocoding + jarak real, (4) pendaftaran penjual wajib NIK/nama KTP/alamat + pin peta atau share Gmaps, (5) scanner hanya di dashboard penjual (pembeli tetap punya barcode & lacak), (6) notifikasi dihapus total, (7) logo garis "mulut melet" (bibir + lidah menjulur) tanpa latar putih, (8) PANDUAN-DEPLOY.md lengkap + aplikasi sudah PWA-installable (bisa diinstall ke HP, bisa dijadikan APK via PWABuilder).
- Keputusan kunci: OTP ter-hash + kedaluwarsa + rate limit di server; tanpa gateway token sistem otomatis turun ke mode dev (kode tampil) agar tidak pernah "mati"; scanner tidak lagi dibagikan ke pembeli (hanya tampilan barcode); upload tetap ke public/uploads (catatan Cloudinary untuk Vercel ada di panduan).
- Artefak baru: lib/otp.ts, api/auth/otp, api/auth/verify, map-picker.tsx, pwa-register.tsx, manifest.webmanifest, sw.js, icons/*, scripts/gen-icons.mjs, PANDUAN-DEPLOY.md, .env.example; schema VerificationCode; perubahan besar di login/seller-form/widgets/order-widgets/jr-app.
