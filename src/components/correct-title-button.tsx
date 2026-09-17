"use client";

import Image from "next/image";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { correctUnmatchedWatch, type CorrectTitleState } from "@/app/dashboard/actions";
import { formatDisplayTitle, type CatalogSearchItem } from "@/lib/catalog";
import { SearchIcon } from "@/components/icons";
import styles from "./correct-title-button.module.css";

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
      <button className={styles.trigger} type="button" onClick={openDialog}>Koreksi judul</button>
      <dialog ref={dialogRef} className={styles.dialog} onClose={() => setIsOpen(false)}>
        <form action={action} className={styles.form}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <header>
            <div><span>BELUM COCOK · TMDB</span><h2>Koreksi judul</h2></div>
            <button className={styles.close} type="button" onClick={() => dialogRef.current?.close()} aria-label="Tutup koreksi judul">×</button>
          </header>
          <p className={styles.detected}>Terdeteksi sebagai <strong>{detectedTitle}</strong></p>
          <div className={styles.searchWrap}>
            <label className={styles.search}>
              <span className={styles.srOnly}>Cari judul TMDB</span>
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
              <ul id={resultId} className={styles.results} role="listbox" aria-label="Hasil pencarian TMDB">
                {results.slice(0, 6).map((item) => (
                  <li key={`${item.mediaType}:${item.tmdbId}`} role="option" aria-selected="false">
                    <div className={styles.poster}>
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
          <div className={styles.feedback} aria-live="polite">
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
