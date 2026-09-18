import Link from "next/link";
import { Suspense } from "react";
import { FilmIcon } from "@/components/icons";
import { WatchArchive } from "@/components/watch-archive";
import { groupWatchedTitles } from "@/lib/catalog";
import { getViewer } from "@/lib/watched";
import styles from "../dashboard.module.css";

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
    <section className={`${styles.panel} ${styles.historyResultsLoading}`} aria-label="Memuat hasil riwayat" aria-busy="true">
      <span className={styles.historySkeletonToolbar} />
      <div className={styles.historySkeletonRow}><i /><span /><span /></div>
      <div className={styles.historySkeletonRow}><i /><span /><span /></div>
      <div className={styles.historySkeletonRow}><i /><span /><span /></div>
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
      <section className={styles.panel} aria-label="Daftar riwayat">
        {items.length
          ? <WatchArchive items={items} />
          : <div className={styles.empty}><FilmIcon size={28} /><h2>Belum ada yang cocok</h2><p>Ubah kata pencarian atau filter untuk melihat judul lain.</p><Link href="/dashboard/history">Reset filter →</Link></div>}
      </section>
      {pages > 1 && (
        <nav className={styles.pagination} aria-label="Paginasi riwayat">
          {currentPage > 1
            ? <Link href={href(currentPage - 1)} aria-label="Buka halaman sebelumnya">← <span>Sebelumnya</span></Link>
            : <span className={styles.pageDisabled}>← <span>Sebelumnya</span></span>}
          <div className={styles.pageNumbers}>
            {pageNumbers.map((pageNumber, index) => [
              index > 0 && pageNumber - pageNumbers[index - 1] > 1
                ? <span className={styles.pageEllipsis} key={`ellipsis-${pageNumber}`}>…</span>
                : null,
              pageNumber === currentPage
                ? <span className={styles.pageCurrent} aria-current="page" key={pageNumber}>{pageNumber}</span>
                : <Link href={href(pageNumber)} aria-label={`Buka halaman ${pageNumber}`} key={pageNumber}>{pageNumber}</Link>,
            ])}
          </div>
          {currentPage < pages
            ? <Link href={href(currentPage + 1)} aria-label="Buka halaman berikutnya"><span>Berikutnya</span> →</Link>
            : <span className={styles.pageDisabled}><span>Berikutnya</span> →</span>}
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
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p className={styles.eyebrow}>PUSTAKA PRIBADI</p><h1>Riwayat tontonan.</h1></div>
        <Suspense fallback={<p aria-live="polite">Memuat ringkasan…</p>}><HistorySummary data={history} /></Suspense>
      </header>
      <form className={styles.filters} method="get">
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
