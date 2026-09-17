import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { CheckIcon, ExtensionIcon, FilmIcon, HistoryIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/watched";
import styles from "./page.module.css";

const platforms = ["Netflix", "Disney+", "Prime Video", "Max"];
const description = "Catat film dan episode yang sudah kamu tonton, otomatis maupun manual.";

export const metadata: Metadata = {
  title: { absolute: "Reelmark — Riwayat tontonanmu" },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Reelmark",
    url: "/",
    title: "Reelmark — Riwayat tontonanmu",
    description,
  },
  twitter: { card: "summary", title: "Reelmark — Riwayat tontonanmu", description },
};

export default async function LandingPage() {
  const user = await getCurrentUser();
  const primaryHref = user ? "/dashboard" : "/auth/login?next=/dashboard";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Brand />
        <nav aria-label="Navigasi landing">
          <Link href="#cara-kerja">Cara kerja</Link>
          <Link href="#platform">Platform</Link>
          <Link href="#privasi">Privasi</Link>
        </nav>
        <div className={styles.headerActions}>
          <ThemeToggle className={styles.themeButton} />
          <Link className={styles.loginLink} href={primaryHref}>{user ? "Buka dashboard" : "Masuk"}</Link>
        </div>
      </header>

      <main id="main-content">
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span /> DETEKTOR TONTONAN PRIBADI</p>
            <h1>Film selesai.<br /><em>Ingatan tersimpan.</em></h1>
            <p className={styles.lead}>Reelmark mengingat film dan serial yang pernah kamu tonton—otomatis dari browser atau dicatat manual dalam hitungan detik.</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href={primaryHref}>{user ? "Buka dashboard" : "Mulai gratis"} <span>→</span></Link>
              <Link className={styles.secondaryButton} href="/extension"><ExtensionIcon size={18} /> Pasang extension beta</Link>
            </div>
            <p className={styles.helper}>Chrome & Edge · Netflix, Disney+, Prime Video, dan Max</p>
          </div>

          <div className={styles.console} aria-label="Contoh deteksi Reelmark">
            <div className={styles.consoleTop}><span><i /> REELMARK DETECTOR</span><span>21:48:06</span></div>
            <div className={styles.nowPlaying}>
              <div className={styles.poster}><FilmIcon size={34} /></div>
              <div className={styles.titleCopy}><p>SEKARANG DIPUTAR · NETFLIX</p><h2>Glass Onion</h2><span>Film · 2022</span></div>
              <strong>78%</strong>
            </div>
            <div className={styles.timeline}><span /></div>
            <div className={styles.markers}><span>00:00</span><b>Ambang ditonton · 80%</b><span>02:19:00</span></div>
            <div className={styles.consoleEvent}><CheckIcon size={18} /><span><strong>Past Lives</strong> ditandai sudah ditonton</span><time>kemarin</time></div>
          </div>
        </section>

        <section className={styles.trustStrip} id="platform" aria-labelledby="platform-title">
          <p id="platform-title">BEKERJA SAAT KAMU MENONTON DI</p>
          <div>{platforms.map((platform) => <span key={platform}>{platform}</span>)}</div>
          <small>Versi beta</small>
        </section>

        <section className={styles.section} id="cara-kerja">
          <div className={styles.sectionIntro}><p className={styles.eyebrow}>CARA KERJA</p><h2>Menonton tetap biasa.<br />Catatannya yang otomatis.</h2></div>
          <div className={styles.steps}>
            <article><span>01</span><ExtensionIcon size={24} /><h3>Pasang detector</h3><p>Aktifkan extension beta di Chrome atau Edge dan pilih platform yang ingin dipantau.</p></article>
            <article><span>02</span><FilmIcon size={24} /><h3>Putar seperti biasa</h3><p>Reelmark membaca posisi video untuk menampilkan progres tontonanmu.</p></article>
            <article><span>03</span><HistoryIcon size={24} /><h3>Buka arsipmu</h3><p>Setelah 80% terputar, judul masuk ke antrean extension dan disinkronkan ke akun yang sudah dipasangkan.</p></article>
          </div>
        </section>

        <section className={styles.previewSection}>
          <div className={styles.previewCopy}>
            <p className={styles.eyebrow}>SATU ARSIP</p>
            <h2>Semua jejak tontonan, tanpa spreadsheet.</h2>
            <p>Cari film manual, lihat kapan terakhir menonton, dan temukan judul yang pernah kamu selesaikan.</p>
            <Link href={primaryHref}>Lihat dashboard <span>→</span></Link>
          </div>
          <div className={styles.dashboardPreview}>
            <aside><Brand compact /><span /><span /><span /></aside>
            <div><header><small>SELAMAT MALAM</small><b>Arsip tontonanmu</b></header><section><article><small>Total ditonton</small><strong>128</strong></article><article><small>Film</small><strong>86</strong></article><article><small>Serial</small><strong>42</strong></article></section><div className={styles.previewRail}><i /><p><small>TERAKHIR DITONTON</small><strong>Dune: Part Two</strong></p><span>100%</span></div></div>
          </div>
        </section>

        <section className={styles.privacy} id="privasi">
          <div><span className={styles.lock}>PRIVATE BY DEFAULT</span><h2>Riwayatmu bukan umpan iklan.</h2><p>Reelmark hanya mencatat informasi yang dibutuhkan untuk mengingat tontonan. Extension menyimpan antrean lokal dan baru menyinkronkannya setelah kamu memasangkan browser.</p></div>
          <ul><li><CheckIcon size={18} /> Tidak membaca isi halaman lain</li><li><CheckIcon size={18} /> Tidak menjual data tontonan</li><li><CheckIcon size={18} /> Kontrol situs ada di tanganmu</li></ul>
        </section>

        <section className={styles.faq}>
          <div className={styles.sectionIntro}><p className={styles.eyebrow}>FAQ</p><h2>Sebelum mulai.</h2></div>
          <div>
            <details><summary>Apakah extension sudah tersedia di Chrome Web Store?</summary><p>Belum. Versi ini adalah beta yang dipasang melalui Developer mode di Chrome atau Edge.</p></details>
            <details><summary>Kapan sebuah judul dianggap sudah ditonton?</summary><p>Saat posisi pemutaran video mencapai 80% dari total durasi.</p></details>
            <details><summary>Apakah extension sudah tersinkron ke dashboard?</summary><p>Sudah untuk versi lokal. Buat kode di Dashboard → Extension, lalu masukkan kode itu pada popup extension.</p></details>
          </div>
        </section>

        <section className={styles.finalCta}>
          <p>REELMARK / MEMORY ON</p><h2>Tak perlu bertanya,<br />“pernah nonton belum?”</h2>
          <div><Link className={styles.primaryButton} href={primaryHref}>{user ? "Buka dashboard" : "Buat arsipmu"} <span>→</span></Link><Link className={styles.secondaryButton} href="/extension">Pelajari extension beta</Link></div>
        </section>
      </main>

      <footer className={styles.footer}><Brand /><p>Data film oleh TMDB. Reelmark tidak didukung atau disertifikasi oleh TMDB.</p><span>© 2026 · JKT</span></footer>
    </div>
  );
}
