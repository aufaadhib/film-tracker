# Reelmark Watch Detector

Manifest V3 extension untuk Chrome dan Edge. Sesi tetap disimpan lokal dan tontonan selesai disinkronkan setelah browser dipasangkan ke akun Reelmark.

## Memuat extension

1. Buka `chrome://extensions` atau `edge://extensions`.
2. Aktifkan Developer mode.
3. Jalankan `npm run extension:dev`.
4. Pilih **Load unpacked** dan arahkan ke folder `build/reelmark-extension-development`.
5. Buka Netflix, Disney+, Prime Video, atau Max dan putar video.
6. Salin ID extension yang tampil pada halaman extension browser.
7. Isi `REELMARK_EXTENSION_IDS` di `.env.local` dengan ID tersebut, lalu restart server Next.js dan reload extension.
8. Buka popup extension dan pilih **Masuk dengan Google**. Pairing manual pada dashboard hanya diperlukan sebagai pemulihan.

Extension membaca posisi pemutaran video. Judul ditandai selesai mengikuti ambang akun (default 80%) dan disimpan di `chrome.storage.local`. Item yang belum berhasil terkirim tetap menjadi antrean dan dicoba lagi ketika popup dibuka.

Jalankan pemeriksaan algoritme dengan:

```bash
npm run test:extension
```

Source extension menggunakan `https://reelmark.afana.id` agar aman bila dimuat langsung. `npm run extension:dev` membuat salinan localhost di `build/reelmark-extension-development`, sedangkan `npm run extension:prod` membuat ZIP production di `public/downloads`.
