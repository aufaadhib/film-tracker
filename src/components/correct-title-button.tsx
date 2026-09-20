"use client";

import Image from "next/image";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { correctUnmatchedWatch, type CorrectTitleState } from "@/app/dashboard/actions";
import { formatDisplayTitle, type CatalogSearchItem } from "@/lib/catalog";
import { SearchIcon } from "@/components/icons";

const initialState: CorrectTitleState = { status: "idle", message: "" };

export function CorrectTitleButton({ sessionId, detectedTitle }: { sessionId: string; detectedTitle: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resultId = useId();
  const [query, setQuery] = useState(detectedTitle);
  const [results, setResults] = useState<CatalogSearchItem[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [searchMessage, setSearchMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState("");
  const [state, action, isPending] = useActionState(correctUnmatchedWatch, initialState);

  useEffect(() => {
    const normalized = query.trim();
    if (!isOpen || normalized.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchState("loading");
      setSearchMessage("");
      try {
        const response = await fetch(`/api/catalog/search?q=${encodeURIComponent(normalized)}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        setResults(payload.results);
        setSearchState(payload.results.length ? "ready" : "empty");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSearchMessage(error instanceof Error ? error.message : "Pencarian gagal.");
        setSearchState("error");
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, query]);

  useEffect(() => {
    if (state.status === "success") dialogRef.current?.close();
  }, [state.status]);

  function openDialog() {
    setIsOpen(true);
    dialogRef.current?.showModal();
  }

  function updateQuery(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setSearchState("idle");
      setSearchMessage("");
    }
  }

  return (
    <>
      <button className="min-h-8.5 cursor-pointer whitespace-nowrap rounded-lg border border-[#d69b25] bg-warning px-2.5 text-[.57rem] font-extrabold text-[#5d3d00] hover:brightness-96" type="button" onClick={openDialog}>Koreksi judul</button>
      <dialog ref={dialogRef} className="max-h-[calc(100dvh-24px)] w-[min(620px,calc(100vw-24px))] overflow-y-auto overscroll-contain rounded-[18px] border border-line-strong bg-surface p-0 text-ink shadow-[0_24px_80px_rgb(0_0_0/28%)] backdrop:bg-[rgb(7_16_25/68%)] backdrop:backdrop-blur-xs" onClose={() => setIsOpen(false)}>
        <form action={action} className="grid p-5 max-[520px]:p-4 [&_header]:flex [&_header]:items-start [&_header]:justify-between [&_header]:gap-5 [&_header_span]:font-mono [&_header_span]:text-[.5rem] [&_header_span]:font-[750] [&_header_span]:tracking-[.08em] [&_header_span]:text-reel-blue [&_h2]:mt-1.25 [&_h2]:font-display [&_h2]:text-[1.7rem] [&_h2]:tracking-[-.045em]">
          <input type="hidden" name="sessionId" value={sessionId} />
          <header>
            <div><span>BELUM COCOK · TMDB</span><h2>Koreksi judul</h2></div>
            <button className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-[9px] border border-line bg-transparent text-[1.3rem] text-muted" type="button" onClick={() => dialogRef.current?.close()} aria-label="Tutup koreksi judul">×</button>
          </header>
          <p className="my-3.5 text-[.68rem] leading-[1.45] text-muted [&_strong]:text-ink">Terdeteksi sebagai <strong>{detectedTitle}</strong></p>
          <div className="min-w-0">
            <label className="relative z-2 flex min-h-12.5 items-center gap-2.25 rounded-[10px] border border-line-strong bg-canvas px-3 text-reel-blue focus-within:border-reel-blue focus-within:shadow-[0_0_0_3px_rgb(109_140_255/14%)] [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:text-[.82rem] [&_input]:font-semibold [&_input]:text-ink [&_input]:outline-0 [&_i]:size-4.25 [&_i]:animate-spin [&_i]:rounded-full [&_i]:border-2 [&_i]:border-line [&_i]:border-t-reel-blue motion-reduce:[&_i]:animate-none">
              <span className="sr-only">Cari judul TMDB</span>
              <SearchIcon size={19} />
              <input
                type="search"
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                placeholder="Cari judul yang benar…"
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-controls={resultId}
                aria-expanded={searchState === "ready"}
              />
              {searchState === "loading" && <i aria-label="Mencari" />}
            </label>
            {searchState === "ready" && (
              <ul id={resultId} className="mt-3 grid list-none rounded-[11px] border border-line-strong bg-surface p-1.25 [&_li]:grid [&_li]:grid-cols-[42px_minmax(0,1fr)_auto] [&_li]:items-center [&_li]:gap-2.5 [&_li]:rounded-lg [&_li]:p-1.75 [&_li+li]:rounded-t-none [&_li+li]:border-t [&_li+li]:border-line [&_li:hover]:bg-surface-soft max-[520px]:[&_li]:grid-cols-[38px_minmax(0,1fr)_auto] max-[520px]:[&_li]:gap-2 max-[520px]:[&_li]:p-1.5 [&_li>div:nth-child(2)]:min-w-0 [&_li>div:nth-child(2)_span]:mb-1 [&_li>div:nth-child(2)_span]:block [&_li>div:nth-child(2)_span]:font-mono [&_li>div:nth-child(2)_span]:text-[.45rem] [&_li>div:nth-child(2)_span]:text-reel-blue [&_strong]:block [&_strong]:overflow-hidden [&_strong]:text-[.7rem] [&_strong]:leading-[1.3] [&_strong]:text-ellipsis max-[520px]:[&_strong]:text-[.64rem] [&_li>button]:min-h-8 [&_li>button]:cursor-pointer [&_li>button]:rounded-[7px] [&_li>button]:border-0 [&_li>button]:bg-watched-mint [&_li>button]:px-2.5 [&_li>button]:text-[.57rem] [&_li>button]:font-extrabold [&_li>button]:text-[#071019] [&_li>button:disabled]:cursor-wait [&_li>button:disabled]:opacity-60 max-[520px]:[&_li>button]:min-h-7.5 max-[520px]:[&_li>button]:px-2" role="listbox" aria-label="Hasil pencarian TMDB">
                {results.slice(0, 6).map((item) => (
                  <li key={`${item.mediaType}:${item.tmdbId}`} role="option" aria-selected="false">
                    <div className="relative grid h-14 w-10.5 place-items-center overflow-hidden rounded-md bg-reel-blue-strong font-extrabold text-white [&_img]:object-cover max-[520px]:h-13 max-[520px]:w-9.5">
                      {item.posterPath ? <Image src={`https://image.tmdb.org/t/p/w154${item.posterPath}`} alt="" fill sizes="42px" /> : <span>{item.title.slice(0, 1)}</span>}
                    </div>
                    <div><span>{item.mediaType === "movie" ? "FILM" : "SERIAL"} · {item.year ?? "—"}</span><strong>{formatDisplayTitle(item.title, item.originalTitle)}</strong></div>
                    <button
                      type="submit"
                      name="selection"
                      value={`${item.mediaType}:${item.tmdbId}`}
                      disabled={isPending && pendingSelection === `${item.mediaType}:${item.tmdbId}`}
                      onClick={() => setPendingSelection(`${item.mediaType}:${item.tmdbId}`)}
                    >
                      {isPending && pendingSelection === `${item.mediaType}:${item.tmdbId}` ? "Menyimpan…" : "Pilih"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="min-h-9 px-0.5 pt-2.25 pb-1 text-[.62rem] text-muted" aria-live="polite">
            {searchState === "idle" && "Masukkan minimal 2 karakter."}
            {searchState === "loading" && "Mencari di TMDB…"}
            {searchState === "empty" && "Belum ada hasil. Coba ejaan atau bahasa lain."}
            {searchState === "error" && searchMessage}
            {state.status === "error" && state.message}
          </div>
        </form>
      </dialog>
    </>
  );
}
