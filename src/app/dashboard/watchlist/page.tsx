import Image from "next/image";
import Link from "next/link";
import { BookmarkIcon } from "@/components/icons";
import { WatchlistControls } from "@/components/watchlist-controls";
import { formatDisplayTitle } from "@/lib/catalog";
import { getWatchlist } from "@/lib/watchlist";
import { formatReleaseDate } from "@/lib/watchlist-utils";
import styles from "./watchlist.module.css";

export default async function WatchlistPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const type = query.type === "movie" || query.type === "tv" ? query.type : "all";
  const release = query.release === "released" || query.release === "upcoming" || query.release === "unknown"
    ? query.release : "all";
  const requestedPage = typeof query.page === "string" ? Number.parseInt(query.page, 10) : 1;
  const { items, total, pages, page, countryCode } = await getWatchlist({
    q,
    type,
    release,
    page: Number.isFinite(requestedPage) ? requestedPage : 1,
  });

  const href = (nextPage: number) => `/dashboard/watchlist?${new URLSearchParams({
    ...(q ? { q } : {}),
    ...(type !== "all" ? { type } : {}),
    ...(release !== "all" ? { release } : {}),
    page: String(nextPage),
  })}`;
  const pageNumbers = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((number) => number >= 1 && number <= pages)
    .sort((a, b) => a - b);
  const hasFilters = Boolean(q || type !== "all" || release !== "all");

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p>ANTREAN PRIBADI</p><h1>Mau nonton apa?</h1></div>
        <div className={styles.headerAside}><span>{total} judul · wilayah {countryCode}</span><Link href="/dashboard/discover">Tambah dari Jelajahi →</Link></div>
      </header>

      <form className={styles.filters} method="get">
        <label>Cari judul<input name="q" type="search" defaultValue={q} placeholder="Film atau serial…" autoComplete="off" /></label>
        <label>Jenis<select name="type" defaultValue={type}><option value="all">Semua</option><option value="movie">Film</option><option value="tv">Serial</option></select></label>
        <label>Rilis<select name="release" defaultValue={release}><option value="all">Semua</option><option value="released">Sudah rilis</option><option value="upcoming">Akan datang</option><option value="unknown">Belum diumumkan</option></select></label>
        <button type="submit">Terapkan</button>
      </form>

      {items.length ? (
        <section className={styles.grid} aria-label="Daftar watchlist">
          {items.map((item) => {
            const displayTitle = formatDisplayTitle(item.title, item.originalTitle);
            const isOngoing = item.mediaType === "tv" && item.seriesStatus === "ongoing";
            return (
              <article className={styles.card} key={item.id}>
                <div className={styles.poster}>
                  {item.posterPath ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w500${item.posterPath}`}
                      alt={`Poster ${displayTitle}`}
                      fill
                      sizes="(max-width: 639px) 34vw, (max-width: 999px) 24vw, 180px"
                    />
                  ) : <span aria-hidden="true">{item.title.slice(0, 1)}</span>}
                  {item.isPriority && <span className={styles.priorityBadge}>PRIORITAS</span>}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.meta}>
                    <span>{item.mediaType === "movie" ? "FILM" : "SERIAL"}</span>
                    {isOngoing && <span className={styles.ongoingBadge}>MASIH TAYANG</span>}
                    {item.voteAverage > 0 && <span>★ {item.voteAverage.toFixed(1)}</span>}
                  </div>
                  <h2>{displayTitle}</h2>
                  <p className={styles.releaseLine}>
                    <span className={item.releaseState === "upcoming" ? styles.upcoming : undefined}>
                      {item.releaseState === "upcoming" ? "AKAN DATANG" : item.releaseState === "released" ? "SUDAH RILIS" : "BELUM DIUMUMKAN"}
                    </span>
                    {item.releaseDate ? formatReleaseDate(item.releaseDate) : null}
                  </p>
                  <p className={styles.overview}>{item.overview}</p>

                  <div className={styles.providers}>
                    <strong>{item.providerStatus === "ready" ? "Tersedia untuk streaming" : item.networks.length ? "Jaringan penayang" : "Tersedia untuk streaming"}</strong>
                    {item.providerStatus === "ready" ? (
                      <div className={styles.providerRow}>
                        {item.providers.map((provider) => (
                          <span key={provider.id} title={`${provider.name} · ${provider.categories.join(", ")}`}>
                            {provider.logoPath ? <Image src={`https://image.tmdb.org/t/p/w92${provider.logoPath}`} alt={provider.name} width={32} height={32} /> : provider.name.slice(0, 1)}
                          </span>
                        ))}
                        {item.providerLink && <a href={item.providerLink} target="_blank" rel="noreferrer">Lihat opsi →</a>}
                      </div>
                    ) : item.providerStatus === "error" ? (
                      <small>Data provider sedang tidak dapat dimuat.</small>
                    ) : item.networks.length ? (
                      <>
                        <div className={styles.networkRow}>
                          {item.networks.map((network) => (
                            <span key={network.id} title={network.name}>
                              {network.logoPath ? <Image src={`https://image.tmdb.org/t/p/w92${network.logoPath}`} alt={network.name} width={32} height={32} /> : network.name.slice(0, 1)}
                            </span>
                          ))}
                        </div>
                        <small>TMDB mencatat jaringan penayang ini; data paket streaming belum tersedia dari JustWatch.</small>
                      </>
                    ) : (
                      <small>Belum tersedia lewat langganan, gratis, atau iklan di {countryCode}.</small>
                    )}
                  </div>
                  <WatchlistControls itemId={item.id} title={displayTitle} isPriority={item.isPriority} />
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className={styles.empty}>
          <BookmarkIcon size={30} />
          <h2>{hasFilters ? "Tidak ada judul yang cocok" : "Watchlist masih kosong"}</h2>
          <p>{hasFilters ? "Ubah pencarian atau filter untuk melihat judul lain." : "Simpan film dan serial yang ingin kamu tonton nanti agar tidak terlupakan."}</p>
          <Link href={hasFilters ? "/dashboard/watchlist" : "/dashboard/discover"}>{hasFilters ? "Reset filter" : "Cari judul"} →</Link>
        </section>
      )}

      {pages > 1 && (
        <nav className={styles.pagination} aria-label="Paginasi watchlist">
          {page > 1 ? <Link href={href(page - 1)}>← <span>Sebelumnya</span></Link> : <span className={styles.disabled}>← <span>Sebelumnya</span></span>}
          <div>{pageNumbers.map((number, index) => [
            index > 0 && number - pageNumbers[index - 1] > 1 ? <span key={`ellipsis-${number}`}>…</span> : null,
            number === page ? <b key={number} aria-current="page">{number}</b> : <Link key={number} href={href(number)} aria-label={`Buka halaman ${number}`}>{number}</Link>,
          ])}</div>
          {page < pages ? <Link href={href(page + 1)}><span>Berikutnya</span> →</Link> : <span className={styles.disabled}><span>Berikutnya</span> →</span>}
        </nav>
      )}
      <p className={styles.attribution}>Data ketersediaan oleh JustWatch melalui TMDB. Opsi dapat berbeda menurut wilayah.</p>
    </div>
  );
}
