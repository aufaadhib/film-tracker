import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { CheckIcon, ExtensionIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import styles from "./page.module.css";

const description = "Panduan memasang Reelmark Watch Detector untuk Chrome dan Edge.";

export const metadata: Metadata = {
  title: "Extension Beta",
  description,
  alternates: { canonical: "/extension" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Reelmark",
    url: "/extension",
    title: "Extension Beta · Reelmark",
    description,
  },
  twitter: { card: "summary", title: "Extension Beta · Reelmark", description },
};

export default function ExtensionSetupPage() {
  return (
    <div className={styles.page}>
      <header><Brand /><div><ThemeToggle className={styles.theme} /><Link href="/dashboard/extension">Buka dashboard</Link></div></header>
      <main id="main-content">
        <section className={styles.hero}>
          <span className={styles.badge}>BETA · DEVELOPER MODE</span>
          <ExtensionIcon size={36} />
          <h1>Pasang detector<br />di browsermu.</h1>
          <p>Versi beta Reelmark dapat mendeteksi tontonan di Chrome dan Edge. Instalasi masih menggunakan Developer mode dan belum tersedia di browser store.</p>
          <div className={styles.heroActions}>
            <a className={styles.download} href="/downloads/reelmark-extension-0.3.0.zip" download>Unduh extension v0.3.0 (.zip)</a>
            <a className={styles.guide} href="#steps-title">Lihat cara memasang</a>
          </div>
        </section>
        <section className={styles.steps} aria-labelledby="steps-title">
          <p>INSTALASI · ± 2 MENIT</p>
          <h2 id="steps-title">Chrome atau Edge</h2>
          <ol>
            <li><span>01</span><div><h3>Unduh dan ekstrak ZIP</h3><p>Tekan tombol unduh di atas, lalu ekstrak <code>reelmark-extension.zip</code>.</p></div></li>
            <li><span>02</span><div><h3>Buka halaman extension</h3><p>Kunjungi <code>chrome://extensions</code> atau <code>edge://extensions</code>.</p></div></li>
            <li><span>03</span><div><h3>Aktifkan Developer mode</h3><p>Gunakan toggle Developer mode yang ada pada halaman tersebut.</p></div></li>
            <li><span>04</span><div><h3>Pilih Load unpacked</h3><p>Pilih folder hasil ekstraksi yang berisi file <code>manifest.json</code>.</p></div></li>
            <li><span>05</span><div><h3>Mulai menonton</h3><p>Buka platform yang didukung dan putar video seperti biasa.</p></div></li>
          </ol>
        </section>
        <aside className={styles.notice}><CheckIcon size={22} /><div><h2>Yang sudah bekerja</h2><p>Deteksi empat platform, coverage waktu unik, antrean offline, serta login dan sinkronisasi ke dashboard lokal.</p></div><span>BETA</span></aside>
        <aside className={styles.warning}><strong>Setelah instalasi</strong><p>Buka popup extension lalu pilih Masuk dengan Google. Distribusi Chrome Web Store belum tersedia.</p></aside>
      </main>
      <footer><Brand /><Link href="/">← Kembali ke landing</Link></footer>
    </div>
  );
}
