# Reelmark Watch Detector

Manifest V3 extension untuk Chrome dan Edge. Sesi tetap disimpan lokal dan tontonan selesai disinkronkan setelah browser dipasangkan ke akun Reelmark.

## Memuat extension

1. Buka `chrome://extensions` atau `edge://extensions`.
2. Aktifkan Developer mode.
3. Pilih **Load unpacked** dan arahkan ke folder `extension/` ini.
4. Buka Netflix, Disney+, Prime Video, atau Max dan putar video.
5. Salin ID extension yang tampil pada halaman extension browser.
6. Isi `REELMARK_EXTENSION_IDS` di `.env.local` dengan ID tersebut, lalu restart server Next.js dan reload extension.
7. Buka popup extension dan pilih **Masuk dengan Google**. Pairing manual pada dashboard hanya diperlukan sebagai pemulihan.

Extension membaca posisi pemutaran video. Saat posisi mencapai 80%, judul ditandai selesai dan disimpan di `chrome.storage.local`. Item yang belum berhasil terkirim tetap menjadi antrean dan dicoba lagi ketika popup dibuka.

Jalankan pemeriksaan algoritme dengan:

```bash
npm run test:extension
```
