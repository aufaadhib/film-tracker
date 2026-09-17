import Link from "next/link";
import { ExtensionIcon, FilmIcon } from "@/components/icons";
import { MediaRow } from "@/components/media-row";
import { getViewer } from "@/lib/watched";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  const { user, watched } = await getViewer();
  const name = user?.user_metadata?.full_name?.split(" ")[0] ?? "Penonton";
  const movies = watched.filter((item) => item.mediaType === "movie").length;
  const series = watched.filter((item) => item.mediaType === "tv").length;
  const sessions = watched.reduce((total, item) => total + item.watchCount, 0);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}><div><p className={styles.eyebrow}>SELAMAT DATANG, {name.toLocaleUpperCase("id-ID")}</p><h1>Arsip tontonanmu.</h1></div><Link className={styles.primaryAction} href="/dashboard/discover">Cari judul <span>→</span></Link></header>
      <section className={styles.stats} aria-label="Ringkasan tontonan">
        <article className={styles.statCard}><p>Total judul</p><strong>{watched.length}</strong><span>TERSIMPAN</span></article>
        <article className={styles.statCard}><p>Film</p><strong>{movies}</strong><span>SUDAH DITONTON</span></article>
        <article className={styles.statCard}><p>Serial</p><strong>{series}</strong><span>SUDAH DITONTON</span></article>
        <article className={styles.statCard}><p>Sesi putar</p><strong>{sessions}</strong><span>TERCATAT</span></article>
      </section>
      <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="recent-heading">
          <div className={styles.panelHead}><h2 id="recent-heading">Baru ditonton</h2><Link className={styles.textLink} href="/dashboard/history">Lihat semua →</Link></div>
          {watched.length ? watched.slice(0, 6).map((item) => <MediaRow key={item.id} item={item} />) : <div className={styles.empty}><FilmIcon size={28} /><h2>Arsipmu masih kosong</h2><p>Cari film atau serial lalu tandai sebagai sudah ditonton untuk membuat catatan pertama.</p><Link href="/dashboard/discover">Cari judul →</Link></div>}
        </section>
        <aside className={styles.darkPanel}>
          <span className={styles.live}><i /> EXTENSION BETA</span><h2>Hubungkan detector.</h2><p>Pasangkan extension dengan kode sekali pakai agar tontonan yang selesai dapat masuk ke akunmu.</p><Link href="/dashboard/extension">Atur extension →</Link>
          <div className={styles.nowRail}><span><ExtensionIcon size={20} /></span><div><span>STATUS PERANGKAT</span><strong>Periksa browser tertaut</strong></div><strong>PAIRING</strong></div>
        </aside>
      </div>
    </div>
  );
}
