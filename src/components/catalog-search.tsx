"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDisplayTitle, type CatalogSearchItem } from "@/lib/catalog";
import { addToWatchlist } from "@/app/dashboard/watchlist/actions";
import { BookmarkIcon, CheckIcon, SearchIcon } from "@/components/icons";

type SearchState = "idle" | "loading" | "ready" | "empty" | "error";

export function CatalogSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogSearchItem[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [watchlistSaved, setWatchlistSaved] = useState<string[]>([]);
  const [savingWatchlist, setSavingWatchlist] = useState<string | null>(null);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setState("loading");
      setMessage("");

      try {
        const response = await fetch(`/api/catalog/search?q=${encodeURIComponent(normalized)}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        setResults(payload.results);
        setState(payload.results.length ? "ready" : "empty");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMessage(error instanceof Error ? error.message : "Pencarian gagal.");
        setState("error");
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function updateQuery(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setState("idle");
      setResults([]);
      setMessage("");
    }
  }

  async function markWatched(title: CatalogSearchItem) {
    const key = `${title.mediaType}:${title.tmdbId}`;
    setSaving(key);
    setMessage("");

    try {
      const response = await fetch("/api/watched", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: title.tmdbId, mediaType: title.mediaType }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);

      setSaved((current) => [...current, key]);
      setWatchlistSaved((current) => current.filter((item) => item !== key));
      setResults((current) => current.map((item) =>
        `${item.mediaType}:${item.tmdbId}` === key ? { ...item, watchlist: null } : item,
      ));
      setMessage(
        payload.mode === "demo"
          ? "Tersimpan untuk sesi demo. Hubungkan Supabase agar sinkron antarperangkat."
          : `${formatDisplayTitle(title.title, title.originalTitle)} ditambahkan ke riwayat.`,
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Riwayat gagal disimpan.");
    } finally {
      setSaving(null);
    }
  }

  async function saveToWatchlist(title: CatalogSearchItem) {
    const key = `${title.mediaType}:${title.tmdbId}`;
    setSavingWatchlist(key);
    setMessage("");
    try {
      const result = await addToWatchlist({ tmdbId: title.tmdbId, mediaType: title.mediaType });
      if (result.status === "error") throw new Error(result.message);
      setWatchlistSaved((current) => [...current, key]);
      setMessage(`${formatDisplayTitle(title.title, title.originalTitle)} tersimpan di watchlist.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Watchlist gagal disimpan.");
    } finally {
      setSavingWatchlist(null);
    }
  }

  return (
    <section className="rounded-[17px] border border-line bg-surface p-4.5 min-[768px]:p-6" aria-labelledby="search-title">
      <div className="mb-4.25 flex items-start justify-between gap-4 [&_h2]:m-0 [&_h2]:font-display [&_h2]:text-[1.45rem] [&_h2]:tracking-[-.045em]">
        <div>
          <p className="mb-1.25 font-mono text-[.53rem] font-bold tracking-[.11em] text-reel-blue">CATAT MANUAL</p>
          <h2 id="search-title">Temukan satu judul</h2>
        </div>
        <span className="rounded-full border border-line-strong px-2 py-1.5 font-mono text-[.48rem] font-bold text-muted" aria-hidden="true">TMDB</span>
      </div>

      <label className="flex min-h-14 items-center gap-2.5 rounded-[11px] border border-line-strong bg-canvas px-3.5 text-reel-blue transition-[border-color,box-shadow] duration-150 focus-within:border-reel-blue focus-within:shadow-[0_0_0_3px_rgb(109_140_255/14%)] [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:text-[.9rem] [&_input]:font-semibold [&_input]:text-ink [&_input]:outline-0 [&_input::placeholder]:font-[450] [&_input::placeholder]:text-muted">
        <span className="sr-only">Cari film atau serial</span>
        <SearchIcon size={21} />
        <input
          name="catalog-query"
          type="search"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder="Cari Interstellar, The Bear…"
          autoComplete="off"
        />
        {state === "loading" && <span className="size-4.5 animate-spin rounded-full border-2 border-line border-t-watched-mint motion-reduce:animate-none" aria-label="Mencari" />}
      </label>

      <div className="min-h-8.5 px-0.5 pt-2.25 pb-0.5 text-[.7rem] text-muted" aria-live="polite">
        {state === "idle" && <span>Mulai dengan minimal 2 karakter.</span>}
        {state === "loading" && <span>Mencari judul yang cocok…</span>}
        {state === "empty" && <span>Belum ada hasil. Coba judul asli atau ejaan lain.</span>}
        {state === "error" && <span>{message}</span>}
        {state === "ready" && message && <span>{message}</span>}
      </div>

      {state === "ready" && (
        <ul className="grid list-none p-0">
          {results.slice(0, 6).map((title) => {
            const key = `${title.mediaType}:${title.tmdbId}`;
            const isSaved = saved.includes(key) || Boolean(title.watched);
            const isInWatchlist = watchlistSaved.includes(key) || Boolean(title.watchlist);
            return (
              <li key={`${title.mediaType}-${title.tmdbId}`} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 border-t border-line py-3.5 min-[768px]:grid-cols-[58px_minmax(0,1fr)_auto] min-[768px]:items-center min-[768px]:gap-4">
                <div className="relative row-span-2 grid h-18.5 w-13 place-items-center overflow-hidden rounded-lg bg-reel-blue-strong font-display text-[1.4rem] font-extrabold text-[#f5f7fa] [&_img]:object-cover min-[768px]:row-auto min-[768px]:h-20.5 min-[768px]:w-14.5">
                  {title.posterPath ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w154${title.posterPath}`}
                      alt=""
                      fill
                      sizes="62px"
                    />
                  ) : (
                    <span>{title.title.slice(0, 1)}</span>
                  )}
                </div>
                <div className="min-w-0 [&_h3]:mb-1 [&_h3]:overflow-hidden [&_h3]:text-ellipsis [&_h3]:whitespace-nowrap [&_h3]:font-display [&_h3]:text-[.98rem] [&_h3]:tracking-tight [&>p]:line-clamp-2 [&>p]:text-[.67rem] [&>p]:leading-[1.4] [&>p]:text-muted">
                  <div className="mb-1 flex flex-wrap gap-x-2.5 gap-y-1.25 font-mono text-[.48rem] font-bold tracking-wider text-reel-blue">
                    <span>{title.mediaType === "movie" ? "FILM" : "SERIAL"}</span>
                    <span>{title.year ?? "—"}</span>
                    {title.seriesStatus === "ongoing" && <span className="-my-0.5 rounded-[5px] bg-ongoing-bg px-1.25 py-0.5 text-[.43rem] tracking-[.035em] text-ongoing-text">MASIH TAYANG</span>}
                    {title.voteAverage > 0 && <span>★ {title.voteAverage.toFixed(1)}</span>}
                    {title.watched && <span>{title.watched.watchCount}× ditonton</span>}
                  </div>
                  <h3>{formatDisplayTitle(title.title, title.originalTitle)}</h3>
                  <p>{title.overview}</p>
                </div>
                <div className="col-2 flex flex-wrap gap-1.75 justify-self-start min-[768px]:col-auto min-[768px]:max-w-62.5 min-[768px]:justify-end min-[768px]:justify-self-end">
                  <button
                    className={isSaved ? "inline-flex min-h-11 cursor-pointer items-center gap-1.25 rounded-lg border-0 bg-surface-soft px-3 text-[.65rem] font-extrabold text-ink-soft disabled:cursor-default disabled:opacity-70" : "min-h-11 cursor-pointer rounded-lg border-0 bg-watched-mint px-3 text-[.65rem] font-extrabold text-[#071019] hover:bg-[#75e4ba] disabled:cursor-default disabled:opacity-70"}
                    type="button"
                    onClick={() => markWatched(title)}
                    disabled={saving === key || isSaved}
                  >
                    {isSaved ? <><CheckIcon size={17} /> Sudah ditonton</> : saving === key ? "Menyimpan…" : "Tandai ditonton"}
                  </button>
                  <button
                    className={isInWatchlist ? "inline-flex min-h-11 cursor-pointer items-center gap-1.25 rounded-lg border-0 bg-surface-soft px-3 text-[.65rem] font-extrabold text-ink-soft disabled:cursor-default disabled:opacity-70" : "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-line-strong bg-transparent px-3 text-[.65rem] font-extrabold text-ink hover:border-reel-blue hover:text-reel-blue disabled:cursor-default disabled:opacity-70"}
                    type="button"
                    onClick={() => saveToWatchlist(title)}
                    disabled={savingWatchlist === key || isInWatchlist}
                  >
                    <BookmarkIcon size={16} /> {isInWatchlist ? "Di watchlist" : savingWatchlist === key ? "Menyimpan…" : isSaved ? "Tonton lagi" : "Watchlist"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {message.includes("Masuk") && (
        <Link className="mt-2 inline-block text-[.72rem] font-extrabold text-reel-blue" href="/auth/login">Masuk ke akun →</Link>
      )}
    </section>
  );
}
