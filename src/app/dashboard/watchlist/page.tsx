import Image from "next/image";
import Link from "next/link";
import { BookmarkIcon } from "@/components/icons";
import { WatchlistControls } from "@/components/watchlist-controls";
import { formatDisplayTitle } from "@/lib/catalog";
import { getWatchlist } from "@/lib/watchlist";
import { formatReleaseDate } from "@/lib/watchlist-utils";

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
    <div className="min-w-0">
      <header className="mb-6.5 flex items-end justify-between gap-6 max-[620px]:flex-col max-[620px]:items-start [&_p]:mb-1.75 [&_p]:font-mono [&_p]:text-[.55rem] [&_p]:font-bold [&_p]:tracking-[.11em] [&_p]:text-reel-blue [&_h1]:font-display [&_h1]:text-[clamp(2.25rem,6vw,3.8rem)] [&_h1]:leading-[.95] [&_h1]:tracking-[-.06em]">
        <div><p>ANTREAN PRIBADI</p><h1>Mau nonton apa?</h1></div>
        <div className="grid justify-items-end gap-2 text-[.66rem] text-muted max-[620px]:justify-items-start [&_a]:text-[.72rem] [&_a]:font-extrabold [&_a]:text-reel-blue"><span>{total} judul · wilayah {countryCode}</span><Link href="/dashboard/discover">Tambah dari Jelajahi →</Link></div>
      </header>

      <form className="mb-4 grid gap-2.25 rounded-[14px] border border-line bg-surface p-3.5 min-[640px]:grid-cols-[minmax(180px,1fr)_140px_160px_auto] [&_label]:grid [&_label]:gap-1.25 [&_label]:text-[.56rem] [&_label]:text-muted [&_input]:min-h-11 [&_input]:min-w-0 [&_input]:rounded-[9px] [&_input]:border [&_input]:border-line-strong [&_input]:bg-canvas [&_input]:px-2.75 [&_input]:text-ink [&_select]:min-h-11 [&_select]:min-w-0 [&_select]:rounded-[9px] [&_select]:border [&_select]:border-line-strong [&_select]:bg-canvas [&_select]:px-2.75 [&_select]:text-ink [&_button]:min-h-11 [&_button]:cursor-pointer [&_button]:self-end [&_button]:rounded-[9px] [&_button]:border-0 [&_button]:bg-watched-mint [&_button]:text-[.68rem] [&_button]:font-extrabold [&_button]:text-[#071019]" method="get">
        <label>Cari judul<input name="q" type="search" defaultValue={q} placeholder="Film atau serial…" autoComplete="off" /></label>
        <label>Jenis<select name="type" defaultValue={type}><option value="all">Semua</option><option value="movie">Film</option><option value="tv">Serial</option></select></label>
        <label>Rilis<select name="release" defaultValue={release}><option value="all">Semua</option><option value="released">Sudah rilis</option><option value="upcoming">Akan datang</option><option value="unknown">Belum diumumkan</option></select></label>
        <button type="submit">Terapkan</button>
      </form>

      {items.length ? (
        <section className="grid gap-3 min-[640px]:grid-cols-2 min-[1500px]:grid-cols-3" aria-label="Daftar watchlist">
          {items.map((item) => {
            const displayTitle = formatDisplayTitle(item.title, item.originalTitle);
            const isOngoing = item.mediaType === "tv" && item.seriesStatus === "ongoing";
            return (
              <article className="grid min-w-0 grid-cols-[108px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-line bg-surface min-[640px]:grid-cols-[124px_minmax(0,1fr)] min-[1500px]:grid-cols-[138px_minmax(0,1fr)] max-[390px]:grid-cols-[92px_minmax(0,1fr)] [&_h2]:my-1.5 [&_h2]:mb-1.75 [&_h2]:font-display [&_h2]:text-[1.1rem] [&_h2]:leading-[1.15] [&_h2]:tracking-[-.03em]" key={item.id}>
                <div className="relative grid min-h-41 place-items-center overflow-hidden bg-reel-blue-strong font-display text-[2.5rem] font-extrabold text-white [&_img]:object-cover min-[640px]:min-h-49 max-[390px]:min-h-35.5">
                  {item.posterPath ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w500${item.posterPath}`}
                      alt={`Poster ${displayTitle}`}
                      fill
                      sizes="(max-width: 639px) 34vw, (max-width: 999px) 24vw, 180px"
                    />
                  ) : <span aria-hidden="true">{item.title.slice(0, 1)}</span>}
                  {item.isPriority && <span className="absolute top-1.75 left-1.75 z-1 rounded-md bg-warning px-1.5 py-1 font-mono text-[.42rem] font-extrabold tracking-[.06em] text-[#071019]">PRIORITAS</span>}
                </div>
                <div className="flex min-w-0 flex-col p-3.5">
                  <div className="flex flex-wrap items-center gap-x-2.25 gap-y-1.25 font-mono text-[.45rem] font-[750] tracking-[.055em] text-reel-blue">
                    <span>{item.mediaType === "movie" ? "FILM" : "SERIAL"}</span>
                    {isOngoing && <span className="inline-flex min-h-4.5 items-center rounded-md border border-[color-mix(in_srgb,var(--ongoing-text)_24%,transparent)] bg-ongoing-bg px-1.5 py-0.5 text-[.46rem] font-black leading-none tracking-wider text-ongoing-text shadow-[0_1px_4px_color-mix(in_srgb,var(--ongoing-bg)_18%,transparent)]">MASIH TAYANG</span>}
                    {item.voteAverage > 0 && <span>★ {item.voteAverage.toFixed(1)}</span>}
                  </div>
                  <h2>{displayTitle}</h2>
                  <p className="flex flex-wrap items-center gap-1.75 text-[.57rem] text-muted [&>span]:rounded-[5px] [&>span]:bg-[color-mix(in_srgb,var(--watched-mint)_70%,transparent)] [&>span]:px-1.25 [&>span]:py-0.75 [&>span]:font-mono [&>span]:text-[.4rem] [&>span]:font-extrabold [&>span]:text-ongoing-text">
                    <span className={item.releaseState === "upcoming" ? "bg-[color-mix(in_srgb,var(--warning)_72%,transparent)]! text-[#4f3500]!" : undefined}>
                      {item.releaseState === "upcoming" ? "AKAN DATANG" : item.releaseState === "released" ? "SUDAH RILIS" : "BELUM DIUMUMKAN"}
                    </span>
                    {item.releaseDate ? formatReleaseDate(item.releaseDate) : null}
                  </p>
                  <p className="my-2.5 mb-3 line-clamp-2 text-[.65rem] leading-[1.48] text-muted max-[390px]:hidden">{item.overview}</p>

                  <div className="mt-auto grid gap-1.75 border-t border-line pt-2.5 [&>strong]:text-[.57rem] [&_small]:text-[.55rem] [&_small]:leading-[1.4] [&_small]:text-muted">
                    <strong>{item.providerStatus === "ready" ? "Tersedia untuk streaming" : item.networks.length ? "Jaringan penayang" : "Tersedia untuk streaming"}</strong>
                    {item.providerStatus === "ready" ? (
                      <div className="flex flex-wrap items-center gap-1.5 [&>span]:grid [&>span]:size-8 [&>span]:place-items-center [&>span]:overflow-hidden [&>span]:rounded-lg [&>span]:bg-console [&>span]:text-[.65rem] [&>span]:font-extrabold [&>span]:text-white [&_img]:size-8 [&_img]:object-contain [&_a]:ml-0.75 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:text-[.56rem] [&_a]:font-extrabold [&_a]:text-reel-blue">
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
                        <div className="flex flex-wrap gap-1.75 [&>span]:grid [&>span]:size-8 [&>span]:place-items-center [&>span]:overflow-hidden [&>span]:rounded-lg [&>span]:bg-console [&>span]:text-[.65rem] [&>span]:font-extrabold [&>span]:text-white [&_img]:size-8 [&_img]:object-contain">
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
        <section className="grid min-h-90 place-items-center content-center gap-2.5 rounded-2xl border border-dashed border-line-strong p-7.5 text-center text-reel-blue [&_h2]:font-display [&_h2]:text-[1.4rem] [&_h2]:text-ink [&_p]:max-w-107.5 [&_p]:text-[.75rem] [&_p]:leading-[1.55] [&_p]:text-muted [&_a]:mt-1.75 [&_a]:text-[.72rem] [&_a]:font-extrabold">
          <BookmarkIcon size={30} />
          <h2>{hasFilters ? "Tidak ada judul yang cocok" : "Watchlist masih kosong"}</h2>
          <p>{hasFilters ? "Ubah pencarian atau filter untuk melihat judul lain." : "Simpan film dan serial yang ingin kamu tonton nanti agar tidak terlupakan."}</p>
          <Link href={hasFilters ? "/dashboard/watchlist" : "/dashboard/discover"}>{hasFilters ? "Reset filter" : "Cari judul"} →</Link>
        </section>
      )}

      {pages > 1 && (
        <nav className="mt-5 flex items-center justify-center gap-2 text-[.67rem] text-muted max-[620px]:justify-between [&>a]:inline-flex [&>a]:min-h-11 [&>a]:min-w-11 [&>a]:items-center [&>a]:justify-center [&>a]:gap-1.25 [&>a]:rounded-lg [&>a]:border [&>a]:border-line [&>a]:px-3 max-[620px]:[&>a]:w-11 max-[620px]:[&>a]:p-0 max-[620px]:[&>a_span]:sr-only [&>span]:inline-flex [&>span]:min-h-11 [&>span]:min-w-11 [&>span]:items-center [&>span]:justify-center [&>span]:gap-1.25 [&>span]:rounded-lg [&>span]:border [&>span]:border-line [&>span]:px-3 max-[620px]:[&>span]:w-11 max-[620px]:[&>span]:p-0 max-[620px]:[&>span_span]:sr-only [&_div]:flex [&_div]:gap-1.25 [&_div>a]:inline-flex [&_div>a]:min-h-11 [&_div>a]:min-w-11 [&_div>a]:items-center [&_div>a]:justify-center [&_div>a]:rounded-lg [&_div>a]:border [&_div>a]:border-line [&_div>b]:inline-flex [&_div>b]:min-h-11 [&_div>b]:min-w-11 [&_div>b]:items-center [&_div>b]:justify-center [&_div>b]:rounded-lg [&_div>b]:border [&_div>b]:border-reel-blue [&_div>b]:bg-reel-blue [&_div>b]:text-white" aria-label="Paginasi watchlist">
          {page > 1 ? <Link href={href(page - 1)}>← <span>Sebelumnya</span></Link> : <span className="opacity-42">← <span>Sebelumnya</span></span>}
          <div>{pageNumbers.map((number, index) => [
            index > 0 && number - pageNumbers[index - 1] > 1 ? <span key={`ellipsis-${number}`}>…</span> : null,
            number === page ? <b key={number} aria-current="page">{number}</b> : <Link key={number} href={href(number)} aria-label={`Buka halaman ${number}`}>{number}</Link>,
          ])}</div>
          {page < pages ? <Link href={href(page + 1)}><span>Berikutnya</span> →</Link> : <span className="opacity-42"><span>Berikutnya</span> →</span>}
        </nav>
      )}
      <p className="mt-4.5 text-center text-[.52rem] text-muted">Data ketersediaan oleh JustWatch melalui TMDB. Opsi dapat berbeda menurut wilayah.</p>
    </div>
  );
}
