import Link from "next/link";
import { FilmIcon } from "@/components/icons";
import { MediaRow } from "@/components/media-row";
import { getViewer } from "@/lib/watched";
import styles from "../dashboard.module.css";

const PAGE_SIZE = 12;

export default async function HistoryPage({ searchParams }: PageProps<"/dashboard/history">) {
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.trim() : "";
  const type = query.type === "movie" || query.type === "tv" ? query.type : "all";
  const sort = query.sort === "oldest" || query.sort === "title" ? query.sort : "recent";
  const requestedPage = typeof query.page === "string" ? Number.parseInt(query.page, 10) : 1;
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const { watched } = await getViewer();
  const filtered = watched
    .filter((item) => type === "all" || item.mediaType === type)
    .filter((item) => !q || item.title.toLocaleLowerCase("id-ID").includes(q.toLocaleLowerCase("id-ID")))
    .sort((a, b) => sort === "title" ? a.title.localeCompare(b.title, "id-ID") : sort === "oldest" ? Date.parse(a.watchedAt) - Date.parse(b.watchedAt) : Date.parse(b.watchedAt) - Date.parse(a.watchedAt));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const items = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const href = (nextPage: number) => `/dashboard/history?${new URLSearchParams({ ...(q ? { q } : {}), ...(type !== "all" ? { type } : {}), ...(sort !== "recent" ? { sort } : {}), page: String(nextPage) })}`;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}><div><p className={styles.eyebrow}>PUSTAKA PRIBADI</p><h1>Riwayat tontonan.</h1></div><p>{filtered.length} judul ditemukan dari arsipmu.</p></header>
      <form className={styles.filters} method="get">
        <label>Cari judul<input name="q" type="search" defaultValue={q} placeholder="Contoh: Interstellar…" autoComplete="off" /></label>
        <label>Jenis<select name="type" defaultValue={type}><option value="all">Semua</option><option value="movie">Film</option><option value="tv">Serial</option></select></label>
        <label>Urutkan<select name="sort" defaultValue={sort}><option value="recent">Terbaru</option><option value="oldest">Terlama</option><option value="title">Judul A–Z</option></select></label>
        <button type="submit">Terapkan</button>
      </form>
      <section className={styles.panel} aria-label="Daftar riwayat">
        {items.length ? items.map((item) => <MediaRow key={item.id} item={item} />) : <div className={styles.empty}><FilmIcon size={28} /><h2>Belum ada yang cocok</h2><p>Ubah kata pencarian atau filter untuk melihat judul lain.</p><Link href="/dashboard/history">Reset filter →</Link></div>}
      </section>
      {pages > 1 && <nav className={styles.pagination} aria-label="Paginasi riwayat">{currentPage > 1 && <Link href={href(currentPage - 1)}>← Sebelumnya</Link>}<span>Halaman {currentPage} dari {pages}</span>{currentPage < pages && <Link href={href(currentPage + 1)}>Berikutnya →</Link>}</nav>}
    </div>
  );
}
