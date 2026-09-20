import Link from "next/link";
import { Suspense } from "react";
import { FilmIcon } from "@/components/icons";
import { WatchArchive } from "@/components/watch-archive";
import { groupWatchedTitles } from "@/lib/catalog";
import { getViewer } from "@/lib/watched";

const PAGE_SIZE = 12;

type HistoryFilters = {
  q: string;
  type: "all" | "movie" | "tv";
  sort: "recent" | "oldest" | "title";
  page: number;
};

async function loadHistory(filters: HistoryFilters) {
  const { watched } = await getViewer();
  const filtered = watched
    .filter((item) => filters.type === "all" || item.mediaType === filters.type)
    .filter((item) => !filters.q || `${item.title} ${item.originalTitle} ${item.episodeTitle}`
      .toLocaleLowerCase("id-ID").includes(filters.q.toLocaleLowerCase("id-ID")))
    .sort((a, b) => filters.sort === "title"
      ? a.title.localeCompare(b.title, "id-ID")
      : filters.sort === "oldest"
        ? Date.parse(a.watchedAt) - Date.parse(b.watchedAt)
        : Date.parse(b.watchedAt) - Date.parse(a.watchedAt));
  const grouped = groupWatchedTitles(filtered);
  const pages = Math.max(1, Math.ceil(grouped.length / PAGE_SIZE));
  const currentPage = Math.min(filters.page, pages);
  const entries = grouped.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return {
    groupedCount: grouped.length,
    filteredCount: filtered.length,
    items: entries.flatMap((entry) => entry.kind === "series" ? entry.items : [entry.item]),
    pages,
    currentPage,
  };
}

async function HistorySummary({ data }: { data: ReturnType<typeof loadHistory> }) {
  const history = await data;
  return <p>{history.groupedCount} judul · {history.filteredCount} film dan episode tersimpan.</p>;
}

function HistoryResultsSkeleton() {
  return (
    <section className="grid min-h-105 min-w-0 animate-pulse content-start gap-3.5 rounded-[17px] border border-line bg-surface p-5 motion-reduce:animate-none" aria-label="Memuat hasil riwayat" aria-busy="true">
      <span className="h-11 w-29 justify-self-end rounded-[9px] border border-line bg-surface-soft" />
      <div className="grid min-h-27 grid-cols-[64px_minmax(0,1fr)] grid-rows-[22px_14px] content-center gap-x-3.5 gap-y-2.25 border-t border-line py-3 [&_i]:row-[1/3] [&_i]:h-21 [&_i]:w-16 [&_i]:rounded-[9px] [&_i]:bg-surface-soft [&_span]:w-[min(460px,82%)] [&_span]:rounded-md [&_span]:bg-surface-soft [&_span:last-child]:w-[min(280px,58%)]"><i /><span /><span /></div>
      <div className="grid min-h-27 grid-cols-[64px_minmax(0,1fr)] grid-rows-[22px_14px] content-center gap-x-3.5 gap-y-2.25 border-t border-line py-3 [&_i]:row-[1/3] [&_i]:h-21 [&_i]:w-16 [&_i]:rounded-[9px] [&_i]:bg-surface-soft [&_span]:w-[min(460px,82%)] [&_span]:rounded-md [&_span]:bg-surface-soft [&_span:last-child]:w-[min(280px,58%)]"><i /><span /><span /></div>
      <div className="grid min-h-27 grid-cols-[64px_minmax(0,1fr)] grid-rows-[22px_14px] content-center gap-x-3.5 gap-y-2.25 border-t border-line py-3 [&_i]:row-[1/3] [&_i]:h-21 [&_i]:w-16 [&_i]:rounded-[9px] [&_i]:bg-surface-soft [&_span]:w-[min(460px,82%)] [&_span]:rounded-md [&_span]:bg-surface-soft [&_span:last-child]:w-[min(280px,58%)]"><i /><span /><span /></div>
    </section>
  );
}

async function HistoryResults({ data, filters }: {
  data: ReturnType<typeof loadHistory>;
  filters: HistoryFilters;
}) {
  const { items, pages, currentPage } = await data;
  const href = (nextPage: number) => `/dashboard/history?${new URLSearchParams({
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.type !== "all" ? { type: filters.type } : {}),
    ...(filters.sort !== "recent" ? { sort: filters.sort } : {}),
    page: String(nextPage),
  })}`;
  const pageNumbers = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, pages])]
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= pages)
    .sort((a, b) => a - b);

  return (
    <>
      <section className="min-w-0 rounded-[17px] border border-line bg-surface p-5" aria-label="Daftar riwayat">
        {items.length
          ? <WatchArchive items={items} />
          : <div className="grid min-h-60 place-items-center content-center gap-2.5 rounded-2xl border border-dashed border-line-strong p-7.5 text-center [&_svg]:text-reel-blue [&_h2]:font-display [&_h2]:text-[1.28rem] [&_h2]:tracking-[-.035em] [&_p]:max-w-107.5 [&_p]:text-[.75rem] [&_p]:leading-[1.55] [&_p]:text-muted [&_a]:mt-2 [&_a]:text-[.72rem] [&_a]:font-extrabold [&_a]:text-reel-blue"><FilmIcon size={28} /><h2>Belum ada yang cocok</h2><p>Ubah kata pencarian atau filter untuk melihat judul lain.</p><Link href="/dashboard/history">Reset filter →</Link></div>}
      </section>
      {pages > 1 && (
        <nav className="mt-5 flex items-center justify-center gap-2 text-[.67rem] text-muted max-[520px]:justify-between [&>a]:inline-flex [&>a]:min-h-11 [&>a]:min-w-11 [&>a]:items-center [&>a]:justify-center [&>a]:gap-1.25 [&>a]:rounded-lg [&>a]:border [&>a]:border-line [&>a]:px-3 [&>a]:text-ink [&_a:hover]:border-reel-blue [&_a:hover]:bg-[color-mix(in_srgb,var(--reel-blue)_7%,transparent)] max-[520px]:[&>a]:w-11 max-[520px]:[&>a]:p-0 max-[520px]:[&>a_span]:sr-only" aria-label="Paginasi riwayat">
          {currentPage > 1
            ? <Link href={href(currentPage - 1)} aria-label="Buka halaman sebelumnya">← <span>Sebelumnya</span></Link>
            : <span className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.25 rounded-lg border border-line px-3 opacity-42 max-[520px]:w-11 max-[520px]:p-0 max-[520px]:[&_span]:sr-only">← <span>Sebelumnya</span></span>}
          <div className="flex items-center gap-1.25 max-[520px]:gap-0.75 [&>a]:inline-flex [&>a]:min-h-11 [&>a]:min-w-11 [&>a]:items-center [&>a]:justify-center [&>a]:rounded-lg [&>a]:border [&>a]:border-line [&>a]:text-ink max-[520px]:[&>a]:min-w-10">
            {pageNumbers.map((pageNumber, index) => [
              index > 0 && pageNumber - pageNumbers[index - 1] > 1
                ? <span className="inline-flex min-h-11 min-w-7 items-center justify-center rounded-lg border border-transparent" key={`ellipsis-${pageNumber}`}>…</span>
                : null,
              pageNumber === currentPage
                ? <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-reel-blue bg-reel-blue font-extrabold text-white max-[520px]:min-w-10" aria-current="page" key={pageNumber}>{pageNumber}</span>
                : <Link href={href(pageNumber)} aria-label={`Buka halaman ${pageNumber}`} key={pageNumber}>{pageNumber}</Link>,
            ])}
          </div>
          {currentPage < pages
            ? <Link href={href(currentPage + 1)} aria-label="Buka halaman berikutnya"><span>Berikutnya</span> →</Link>
            : <span className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.25 rounded-lg border border-line px-3 opacity-42 max-[520px]:w-11 max-[520px]:p-0 max-[520px]:[&_span]:sr-only"><span>Berikutnya</span> →</span>}
        </nav>
      )}
    </>
  );
}

export default async function HistoryPage({ searchParams }: PageProps<"/dashboard/history">) {
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const type = query.type === "movie" || query.type === "tv" ? query.type : "all";
  const sort = query.sort === "oldest" || query.sort === "title" ? query.sort : "recent";
  const requestedPage = typeof query.page === "string" ? Number.parseInt(query.page, 10) : 1;
  const filters: HistoryFilters = {
    q,
    type,
    sort,
    page: Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
  };
  const history = loadHistory(filters);
  const resultKey = `${q}:${type}:${sort}:${filters.page}`;

  return (
    <div className="min-w-0">
      <header className="mb-6.5 flex items-end justify-between gap-5 max-[620px]:flex-col max-[620px]:items-start [&_h1]:font-display [&_h1]:text-[clamp(2.25rem,6vw,3.8rem)] [&_h1]:leading-[.95] [&_h1]:tracking-[-.06em] [&_h1]:text-balance [&>p]:max-w-130 [&>p]:text-pretty [&>p]:text-[.78rem] [&>p]:leading-[1.6] [&>p]:text-muted">
        <div><p className="mb-1.75 font-mono text-[.55rem] font-bold tracking-[.11em] text-reel-blue">PUSTAKA PRIBADI</p><h1>Riwayat tontonan.</h1></div>
        <Suspense fallback={<p aria-live="polite">Memuat ringkasan…</p>}><HistorySummary data={history} /></Suspense>
      </header>
      <form className="mb-3.5 grid gap-2.25 rounded-[14px] border border-line bg-surface p-3.5 min-[640px]:grid-cols-[minmax(180px,1fr)_140px_150px_auto] [&_label]:grid [&_label]:gap-1.25 [&_label]:text-[.56rem] [&_label]:text-muted [&_input]:min-h-10.25 [&_input]:min-w-0 [&_input]:rounded-[9px] [&_input]:border [&_input]:border-line-strong [&_input]:bg-canvas [&_input]:px-2.75 [&_input]:text-ink [&_select]:min-h-10.25 [&_select]:min-w-0 [&_select]:rounded-[9px] [&_select]:border [&_select]:border-line-strong [&_select]:bg-canvas [&_select]:px-2.75 [&_select]:text-ink [&_button]:min-h-10.25 [&_button]:cursor-pointer [&_button]:self-end [&_button]:rounded-[9px] [&_button]:border-0 [&_button]:bg-watched-mint [&_button]:text-[.68rem] [&_button]:font-extrabold [&_button]:text-[#071019] [&_button:hover]:bg-[#75e4ba]" method="get">
        <label>Cari judul<input name="q" type="search" defaultValue={q} placeholder="Contoh: Interstellar…" autoComplete="off" /></label>
        <label>Jenis<select name="type" defaultValue={type}><option value="all">Semua</option><option value="movie">Film</option><option value="tv">Serial</option></select></label>
        <label>Urutkan<select name="sort" defaultValue={sort}><option value="recent">Terbaru</option><option value="oldest">Terlama</option><option value="title">Judul A–Z</option></select></label>
        <button type="submit">Terapkan</button>
      </form>
      <Suspense key={resultKey} fallback={<HistoryResultsSkeleton />}>
        <HistoryResults data={history} filters={filters} />
      </Suspense>
    </div>
  );
}
