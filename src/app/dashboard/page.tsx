import Link from "next/link";
import { DeleteProgressButton } from "@/components/delete-progress-button";
import { ExtensionIcon, FilmIcon } from "@/components/icons";
import { ProgressRefresh } from "@/components/progress-refresh";
import { WatchArchive } from "@/components/watch-archive";
import { formatEpisodeDisplayTitle, groupWatchedTitles } from "@/lib/catalog";
import { getViewer, type InProgressWatch } from "@/lib/watched";

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
    <div className="min-w-0">
      <ProgressRefresh />
      <header className="mb-6.5 flex items-end justify-between gap-5 max-[620px]:flex-col max-[620px]:items-start [&_h1]:font-display [&_h1]:text-[clamp(2.25rem,6vw,3.8rem)] [&_h1]:leading-[.95] [&_h1]:tracking-[-.06em] [&_h1]:text-balance [&>p]:max-w-130 [&>p]:text-pretty [&>p]:text-[.78rem] [&>p]:leading-[1.6] [&>p]:text-muted"><div><p className="mb-1.75 font-mono text-[.55rem] font-bold tracking-[.11em] text-reel-blue">SELAMAT DATANG, {name.toLocaleUpperCase("id-ID")}</p><h1>Arsip tontonanmu.</h1></div><Link className="inline-flex min-h-10.5 items-center gap-2 rounded-[10px] bg-watched-mint px-3.5 text-[.72rem] font-extrabold text-[#071019] hover:bg-[#75e4ba]" href="/dashboard/discover">Cari judul <span>→</span></Link></header>
      <section className="grid grid-cols-2 gap-2.5 min-[640px]:grid-cols-4" aria-label="Ringkasan tontonan">
        <article className="min-w-0 rounded-[15px] border border-line bg-surface p-4.25 [&_p]:mb-4.25 [&_p]:text-[.63rem] [&_p]:text-muted [&_strong]:block [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:font-display [&_strong]:text-[clamp(1.75rem,5vw,2.65rem)] [&_strong]:leading-none [&_strong]:tracking-[-.055em] [&_strong]:tabular-nums [&_span]:mt-1.5 [&_span]:block [&_span]:font-mono [&_span]:text-[.46rem] [&_span]:text-muted"><p>Total judul</p><strong>{archiveEntries.length}</strong><span>TERSIMPAN</span></article>
        <article className="min-w-0 rounded-[15px] border border-line bg-surface p-4.25 [&_p]:mb-4.25 [&_p]:text-[.63rem] [&_p]:text-muted [&_strong]:block [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:font-display [&_strong]:text-[clamp(1.75rem,5vw,2.65rem)] [&_strong]:leading-none [&_strong]:tracking-[-.055em] [&_strong]:tabular-nums [&_span]:mt-1.5 [&_span]:block [&_span]:font-mono [&_span]:text-[.46rem] [&_span]:text-muted"><p>Film</p><strong>{movies}</strong><span>SUDAH DITONTON</span></article>
        <article className="min-w-0 rounded-[15px] border border-line bg-surface p-4.25 [&_p]:mb-4.25 [&_p]:text-[.63rem] [&_p]:text-muted [&_strong]:block [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:font-display [&_strong]:text-[clamp(1.75rem,5vw,2.65rem)] [&_strong]:leading-none [&_strong]:tracking-[-.055em] [&_strong]:tabular-nums [&_span]:mt-1.5 [&_span]:block [&_span]:font-mono [&_span]:text-[.46rem] [&_span]:text-muted"><p>Serial</p><strong>{series}</strong><span>SUDAH DITONTON</span></article>
        <article className="min-w-0 rounded-[15px] border border-line bg-surface p-4.25 [&_p]:mb-4.25 [&_p]:text-[.63rem] [&_p]:text-muted [&_strong]:block [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:font-display [&_strong]:text-[clamp(1.75rem,5vw,2.65rem)] [&_strong]:leading-none [&_strong]:tracking-[-.055em] [&_strong]:tabular-nums [&_span]:mt-1.5 [&_span]:block [&_span]:font-mono [&_span]:text-[.46rem] [&_span]:text-muted"><p>Dalam progres</p><strong>{inProgress.length}</strong><span>BELUM SELESAI</span></article>
      </section>
      <section className="mt-3.5 min-w-0 rounded-[17px] border border-line bg-surface p-5" aria-labelledby="continue-heading">
        <div className="mb-4 flex items-end justify-between gap-3.5 max-[520px]:flex-col max-[520px]:items-start [&_h2]:font-display [&_h2]:text-[1.28rem] [&_h2]:tracking-[-.035em]"><div><p className="mb-1.75 font-mono text-[.55rem] font-bold tracking-[.11em] text-reel-blue">PLAYHEAD TERSINKRON</p><h2 id="continue-heading">Lanjutkan menonton.</h2></div><span>Diperbarui otomatis</span></div>
        {inProgress.length ? (
          <div className="grid gap-2.5 min-[640px]:grid-cols-2 min-[1000px]:grid-cols-3">
            {inProgress.map((item) => (
              <article className="min-w-0 rounded-[13px] border border-line bg-surface-soft p-3.75 [&_h3]:my-5 [&_h3]:mb-3.5 [&_h3]:line-clamp-2 [&_h3]:min-h-[2.5em] [&_h3]:font-display [&_h3]:text-[1.05rem] [&_h3]:leading-[1.2] [&_h3]:tracking-tight [&_progress]:block [&_progress]:h-2 [&_progress]:w-full [&_progress]:overflow-hidden [&_progress]:rounded-full [&_progress]:bg-line [&_footer]:mt-5 [&_footer]:flex [&_footer]:items-end [&_footer]:justify-between [&_footer]:gap-2.5 max-[520px]:[&_footer]:flex-col max-[520px]:[&_footer]:items-start [&_small]:max-w-[52%] [&_small]:text-[.5rem] [&_small]:leading-[1.35] [&_small]:text-muted max-[520px]:[&_small]:max-w-none [&_a]:text-right [&_a]:text-[.58rem] [&_a]:font-extrabold [&_a]:text-reel-blue max-[520px]:[&_a]:text-left" key={item.id}>
                <div className="flex items-center justify-between gap-2.5 [&>strong]:font-mono [&>strong]:text-[.72rem]">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5 [&_span]:font-mono [&_span]:text-[.5rem] [&_span]:font-bold [&_span]:tracking-[.08em] [&_span]:text-reel-blue [&_span]:uppercase">
                    <span>{providerLabels[item.provider]}</span>
                    <span className="rounded-[5px] bg-[color-mix(in_srgb,var(--warning)_72%,transparent)] px-1.25 py-0.5 text-[.43rem]! tracking-[.035em]! text-[#4f3500]!">BELUM SELESAI</span>
                    {item.seriesStatus === "ongoing" && <span className="rounded-[5px] bg-ongoing-bg px-1.25 py-0.5 text-[.43rem]! tracking-[.035em]! text-ongoing-text!">MASIH TAYANG</span>}
                  </div>
                  <strong>{Math.round(item.progress)}%</strong>
                </div>
                <h3>{progressTitle(item)}</h3>
                <progress max="100" value={item.progress} aria-label={`Posisi tontonan ${progressTitle(item)}: ${Math.round(item.progress)}%`} />
                <div className="mt-1.75 flex items-center justify-between gap-2.5 font-mono text-[.48rem] text-muted"><span>{duration(item.currentTime)} / {duration(item.duration)}</span><span>Posisi pemutaran</span></div>
                <footer>
                  <small>Terakhir {lastSeenFormatter.format(new Date(item.lastSeenAt))}</small>
                  <div className="flex items-center justify-end gap-2 max-[520px]:w-full max-[520px]:justify-between">
                    {item.url ? <a href={item.url} target="_blank" rel="noreferrer">Buka di {providerLabels[item.provider]} →</a> : null}
                    <DeleteProgressButton progressId={item.id} title={progressTitle(item)} />
                  </div>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3.25 rounded-xl border border-dashed border-line-strong bg-surface-soft p-4 text-reel-blue [&_div]:min-w-0 [&_strong]:text-[.72rem] [&_strong]:text-ink [&_p]:mt-1 [&_p]:text-[.64rem] [&_p]:leading-[1.45] [&_p]:text-muted"><ExtensionIcon size={22} /><div><strong>Belum ada tontonan tertunda.</strong><p>Putar film atau episode melalui browser yang terhubung; posisinya akan muncul di sini.</p></div></div>
        )}
      </section>
      <div className="mt-3.5 grid gap-3.5 min-[1000px]:grid-cols-[minmax(0,1.45fr)_minmax(290px,.65fr)]">
        <section className="min-w-0 rounded-[17px] border border-line bg-surface p-5" aria-labelledby="recent-heading">
          <div className="mb-1.5 flex items-center justify-between gap-3.5 [&_h2]:font-display [&_h2]:text-[1.28rem] [&_h2]:tracking-[-.035em]"><h2 id="recent-heading">Baru ditonton</h2><Link className="inline-flex items-center gap-2 text-[.72rem] font-extrabold text-reel-blue hover:text-ink" href="/dashboard/history">Lihat semua →</Link></div>
          {watched.length ? (
            <>
              <WatchArchive items={recentItems} />
              {archivePages > 1 && (
                <nav className="mt-5 flex items-center justify-center gap-2 text-[.67rem] text-muted max-[520px]:justify-between [&>a]:inline-flex [&>a]:min-h-11 [&>a]:min-w-11 [&>a]:items-center [&>a]:justify-center [&>a]:gap-1.25 [&>a]:rounded-lg [&>a]:border [&>a]:border-line [&>a]:px-3 [&>a]:text-ink [&_a:hover]:border-reel-blue [&_a:hover]:bg-[color-mix(in_srgb,var(--reel-blue)_7%,transparent)] max-[520px]:[&>a]:w-11 max-[520px]:[&>a]:p-0 max-[520px]:[&>a_span]:sr-only" aria-label="Paginasi tontonan terbaru">
                  {archivePage > 1
                    ? <Link href={`/dashboard?archivePage=${archivePage - 1}`} aria-label="Buka halaman tontonan sebelumnya">← <span>Sebelumnya</span></Link>
                    : <span className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.25 rounded-lg border border-line px-3 opacity-42 max-[520px]:w-11 max-[520px]:p-0 max-[520px]:[&_span]:sr-only">← <span>Sebelumnya</span></span>}
                  <span>Halaman {archivePage} dari {archivePages}</span>
                  {archivePage < archivePages
                    ? <Link href={`/dashboard?archivePage=${archivePage + 1}`} aria-label="Buka halaman tontonan berikutnya"><span>Berikutnya</span> →</Link>
                    : <span className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.25 rounded-lg border border-line px-3 opacity-42 max-[520px]:w-11 max-[520px]:p-0 max-[520px]:[&_span]:sr-only"><span>Berikutnya</span> →</span>}
                </nav>
              )}
            </>
          ) : <div className="grid min-h-60 place-items-center content-center gap-2.5 rounded-2xl border border-dashed border-line-strong p-7.5 text-center [&_svg]:text-reel-blue [&_h2]:font-display [&_h2]:text-[1.28rem] [&_h2]:tracking-[-.035em] [&_p]:max-w-107.5 [&_p]:text-[.75rem] [&_p]:leading-[1.55] [&_p]:text-muted [&_a]:mt-2 [&_a]:text-[.72rem] [&_a]:font-extrabold [&_a]:text-reel-blue"><FilmIcon size={28} /><h2>Arsipmu masih kosong</h2><p>Cari film atau serial lalu tandai sebagai sudah ditonton untuk membuat catatan pertama.</p><Link href="/dashboard/discover">Cari judul →</Link></div>}
        </section>
        <aside className="relative overflow-hidden rounded-[17px] border border-console-line bg-console p-5.5 text-[#f5f7fa] after:absolute after:-top-25 after:-right-20 after:size-45 after:rounded-full after:bg-reel-blue after:opacity-16 after:blur-[60px] after:content-[''] [&_h2]:relative [&_h2]:mt-10.5 [&_h2]:font-display [&_h2]:text-[2rem] [&_h2]:tracking-[-.035em] [&>p]:relative [&>p]:max-w-90 [&>p]:text-[.73rem] [&>p]:leading-[1.6] [&>p]:text-[#9ba7b7] [&_a]:relative [&_a]:mt-4 [&_a]:inline-flex [&_a]:text-[.68rem] [&_a]:font-extrabold [&_a]:text-watched-mint">
          <span className="relative inline-flex items-center gap-1.75 font-mono text-[.49rem] tracking-[.08em] text-warning [&_i]:size-1.75 [&_i]:rounded-full [&_i]:bg-current"><i /> EXTENSION BETA</span><h2>{latestProgress ? "Playhead tersambung." : "Hubungkan detector."}</h2><p>{latestProgress ? "Posisi tontonan disinkronkan dari browser tanpa menunggu film selesai." : "Hubungkan extension agar progres dan tontonan selesai masuk ke akunmu."}</p><Link href="/dashboard/extension">Atur extension →</Link>
          <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[#263141] bg-[#121822] p-3.25 [&>span:first-child]:grid [&>span:first-child]:h-13 [&>span:first-child]:w-10 [&>span:first-child]:place-items-center [&>span:first-child]:rounded-lg [&>span:first-child]:bg-[#202a38] [&>span:first-child]:text-reel-blue [&_div]:min-w-0 [&_div_span]:font-mono [&_div_span]:text-[.44rem] [&_div_span]:text-[#7f8b9c] [&_div_strong]:mt-1.25 [&_div_strong]:block [&_div_strong]:overflow-hidden [&_div_strong]:text-ellipsis [&_div_strong]:whitespace-nowrap [&_div_strong]:text-[.72rem] [&>strong]:font-mono [&>strong]:text-[.65rem] [&>strong]:text-warning"><span><ExtensionIcon size={20} /></span><div><span>{latestProgress ? providerLabels[latestProgress.provider].toLocaleUpperCase("id-ID") : "STATUS PERANGKAT"}</span><strong>{latestProgress ? progressTitle(latestProgress) : "Periksa browser tertaut"}</strong></div><strong>{latestProgress ? `${Math.round(latestProgress.progress)}%` : "PAIRING"}</strong></div>
        </aside>
      </div>
    </div>
  );
}
