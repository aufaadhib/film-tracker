import Link from "next/link";
import { DeleteProgressButton } from "@/components/delete-progress-button";
import { ExtensionIcon, FilmIcon } from "@/components/icons";
import { ProgressRefresh } from "@/components/progress-refresh";
import { WatchArchive } from "@/components/watch-archive";
import { formatEpisodeDisplayTitle, groupWatchedTitles } from "@/lib/catalog";
import { getViewer, type InProgressWatch } from "@/lib/watched";
import styles from "./dashboard.module.css";

const providerLabels = {
  netflix: "Netflix",
  disney: "Disney+",
  prime_video: "Prime Video",
  max: "Max",
};
const ARCHIVE_PAGE_SIZE = 6;

const lastSeenFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

function duration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function progressTitle(item: InProgressWatch) {
  return formatEpisodeDisplayTitle(item.title, item.seasonNumber, item.episodeNumber, item.episodeTitle);
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const query = await searchParams;
  const requestedArchivePage = typeof query.archivePage === "string" ? Number.parseInt(query.archivePage, 10) : 1;
  const { user, watched, inProgress } = await getViewer();
  const name = user?.user_metadata?.full_name?.split(" ")[0] ?? "Penonton";
  const movies = watched.filter((item) => item.mediaType === "movie").length;
  const series = new Set(watched
    .filter((item) => item.mediaType === "tv")
    .map((item) => `${item.title}:${item.year ?? ""}`)).size;
  const archiveEntries = groupWatchedTitles(watched);
  const archivePages = Math.max(1, Math.ceil(archiveEntries.length / ARCHIVE_PAGE_SIZE));
  const archivePage = Math.min(Number.isFinite(requestedArchivePage) && requestedArchivePage > 0 ? requestedArchivePage : 1, archivePages);
  const recentItems = archiveEntries.slice((archivePage - 1) * ARCHIVE_PAGE_SIZE, archivePage * ARCHIVE_PAGE_SIZE)
    .flatMap((entry) => entry.kind === "series" ? entry.items : [entry.item]);
  const latestProgress = inProgress[0];

  return (
    <div className={styles.page}>
      <ProgressRefresh />
      <header className={styles.pageHeader}><div><p className={styles.eyebrow}>SELAMAT DATANG, {name.toLocaleUpperCase("id-ID")}</p><h1>Arsip tontonanmu.</h1></div><Link className={styles.primaryAction} href="/dashboard/discover">Cari judul <span>→</span></Link></header>
      <section className={styles.stats} aria-label="Ringkasan tontonan">
        <article className={styles.statCard}><p>Total judul</p><strong>{archiveEntries.length}</strong><span>TERSIMPAN</span></article>
        <article className={styles.statCard}><p>Film</p><strong>{movies}</strong><span>SUDAH DITONTON</span></article>
        <article className={styles.statCard}><p>Serial</p><strong>{series}</strong><span>SUDAH DITONTON</span></article>
        <article className={styles.statCard}><p>Dalam progres</p><strong>{inProgress.length}</strong><span>BELUM SELESAI</span></article>
      </section>
      <section className={styles.continuePanel} aria-labelledby="continue-heading">
        <div className={styles.panelHead}><div><p className={styles.eyebrow}>PLAYHEAD TERSINKRON</p><h2 id="continue-heading">Lanjutkan menonton.</h2></div><span>Diperbarui otomatis</span></div>
        {inProgress.length ? (
          <div className={styles.continueGrid}>
            {inProgress.map((item) => (
              <article className={styles.continueCard} key={item.id}>
                <div className={styles.continueMeta}>
                  <div className={styles.continueBadges}>
                    <span>{providerLabels[item.provider]}</span>
                    <span className={styles.progressBadge}>BELUM SELESAI</span>
                    {item.seriesStatus === "ongoing" && <span className={styles.releaseBadge}>MASIH TAYANG</span>}
                  </div>
                  <strong>{Math.round(item.progress)}%</strong>
                </div>
                <h3>{progressTitle(item)}</h3>
                <progress max="100" value={item.progress} aria-label={`Posisi tontonan ${progressTitle(item)}: ${Math.round(item.progress)}%`} />
                <div className={styles.continueTime}><span>{duration(item.currentTime)} / {duration(item.duration)}</span><span>Posisi pemutaran</span></div>
                <footer>
                  <small>Terakhir {lastSeenFormatter.format(new Date(item.lastSeenAt))}</small>
                  <div className={styles.continueActions}>
                    {item.url ? <a href={item.url} target="_blank" rel="noreferrer">Buka di {providerLabels[item.provider]} →</a> : null}
                    <DeleteProgressButton progressId={item.id} title={progressTitle(item)} />
                  </div>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.continueEmpty}><ExtensionIcon size={22} /><div><strong>Belum ada tontonan tertunda.</strong><p>Putar film atau episode melalui browser yang terhubung; posisinya akan muncul di sini.</p></div></div>
        )}
      </section>
      <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="recent-heading">
          <div className={styles.panelHead}><h2 id="recent-heading">Baru ditonton</h2><Link className={styles.textLink} href="/dashboard/history">Lihat semua →</Link></div>
          {watched.length ? (
            <>
              <WatchArchive items={recentItems} />
              {archivePages > 1 && (
                <nav className={styles.pagination} aria-label="Paginasi tontonan terbaru">
                  {archivePage > 1
                    ? <Link href={`/dashboard?archivePage=${archivePage - 1}`} aria-label="Buka halaman tontonan sebelumnya">← <span>Sebelumnya</span></Link>
                    : <span className={styles.pageDisabled}>← <span>Sebelumnya</span></span>}
                  <span>Halaman {archivePage} dari {archivePages}</span>
                  {archivePage < archivePages
                    ? <Link href={`/dashboard?archivePage=${archivePage + 1}`} aria-label="Buka halaman tontonan berikutnya"><span>Berikutnya</span> →</Link>
                    : <span className={styles.pageDisabled}><span>Berikutnya</span> →</span>}
                </nav>
              )}
            </>
          ) : <div className={styles.empty}><FilmIcon size={28} /><h2>Arsipmu masih kosong</h2><p>Cari film atau serial lalu tandai sebagai sudah ditonton untuk membuat catatan pertama.</p><Link href="/dashboard/discover">Cari judul →</Link></div>}
        </section>
        <aside className={styles.darkPanel}>
          <span className={styles.live}><i /> EXTENSION BETA</span><h2>{latestProgress ? "Playhead tersambung." : "Hubungkan detector."}</h2><p>{latestProgress ? "Posisi tontonan disinkronkan dari browser tanpa menunggu film selesai." : "Hubungkan extension agar progres dan tontonan selesai masuk ke akunmu."}</p><Link href="/dashboard/extension">Atur extension →</Link>
          <div className={styles.nowRail}><span><ExtensionIcon size={20} /></span><div><span>{latestProgress ? providerLabels[latestProgress.provider].toLocaleUpperCase("id-ID") : "STATUS PERANGKAT"}</span><strong>{latestProgress ? progressTitle(latestProgress) : "Periksa browser tertaut"}</strong></div><strong>{latestProgress ? `${Math.round(latestProgress.progress)}%` : "PAIRING"}</strong></div>
        </aside>
      </div>
    </div>
  );
}
