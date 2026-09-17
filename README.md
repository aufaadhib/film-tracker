# Reelmark

Pelacak film dan episode yang sudah ditonton. Vertical slice saat ini mencakup dashboard responsif, pencarian TMDB, login Supabase, pencatatan manual, serta extension Manifest V3 dengan pairing dan antrean sinkronisasi.

## Menjalankan lokal

1. Salin `.env.example` menjadi `.env.local`.
2. Login dan hubungkan Supabase CLI dengan `npx supabase login` lalu `npm run db:link`.
3. Periksa dan jalankan migration dengan `npm run db:push:dry` lalu `npm run db:push`.
4. Aktifkan Google OAuth di Supabase bila diperlukan. Tambahkan `http://localhost:3000/auth/callback` sebagai redirect URL.
5. Buat TMDB API Read Access Token dan isi `TMDB_READ_ACCESS_TOKEN`.
6. Jalankan `npm run dev`.
7. Setelah extension dimuat, salin ID extension dari `chrome://extensions`, isi `REELMARK_EXTENSION_IDS`, lalu restart server.
8. Buka popup extension dan pilih **Masuk dengan Google**. Kode pairing di dashboard tetap tersedia sebagai pemulihan manual.

Untuk mencoba deteksi otomatis, muat folder `extension/` sebagai unpacked extension. Petunjuk lengkap ada di `extension/README.md`.

Tanpa environment variable, dashboard dan pencarian tetap berjalan dalam mode demo. Data yang ditandai pada mode ini hanya berlaku untuk sesi UI dan tidak disimpan ke server.

### Menyiapkan login Google

1. Di Google Cloud Console, buat OAuth Client ID bertipe **Web application**.
2. Isi **Authorized redirect URI** dengan `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Di Supabase Dashboard → Authentication → Providers → Google, aktifkan provider lalu masukkan Client ID dan Client Secret dari Google.
4. Di Supabase Dashboard → Authentication → URL Configuration, isi Site URL `http://localhost:3000` dan tambahkan `http://localhost:3000/auth/callback` ke Redirect URLs.
5. Restart `npm run dev` setelah mengubah environment variable lokal.

## Pemeriksaan

```bash
npm run lint
npm run build
npm run test:extension
```

UI ditata untuk tiga breakpoint utama: mobile di bawah 768 px, tablet 768–1199 px, dan desktop mulai 1200 px.

## Data film

Produk ini menggunakan TMDB API. Reelmark tidak didukung atau disertifikasi oleh TMDB.

## Batas versi awal

Login extension menggunakan alur OAuth web, tetapi extension hanya menerima token perangkat terbatas yang disimpan dalam bentuk hash di database. Sinkronisasi saat ini otomatis memasukkan hasil dengan kecocokan judul TMDB yang persis; judul ambigu dan detail episode masih membutuhkan alur konfirmasi pada tahap berikutnya.

Extension beta saat ini mengarah ke `http://localhost:3000`. Sebelum distribusi production, ubah `apiBase` di `extension/sync.js` dan tambahkan origin production yang spesifik ke `host_permissions` pada manifest.
