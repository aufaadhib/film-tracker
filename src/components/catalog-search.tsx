"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDisplayTitle, type CatalogSearchItem } from "@/lib/catalog";
import { CheckIcon, SearchIcon } from "@/components/icons";
import styles from "./catalog-search.module.css";

type SearchState = "idle" | "loading" | "ready" | "empty" | "error";

export function CatalogSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogSearchItem[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);

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

  return (
    <section className={styles.searchPanel} aria-labelledby="search-title">
      <div className={styles.headingRow}>
        <div>
          <p className={styles.eyebrow}>CATAT MANUAL</p>
          <h2 id="search-title">Temukan satu judul</h2>
        </div>
        <span className={styles.shortcut} aria-hidden="true">TMDB</span>
      </div>

      <label className={styles.searchBox}>
        <span className={styles.srOnly}>Cari film atau serial</span>
        <SearchIcon size={21} />
        <input
          name="catalog-query"
          type="search"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder="Cari Interstellar, The Bear…"
          autoComplete="off"
        />
        {state === "loading" && <span className={styles.loader} aria-label="Mencari" />}
      </label>

      <div className={styles.status} aria-live="polite">
        {state === "idle" && <span>Mulai dengan minimal 2 karakter.</span>}
        {state === "loading" && <span>Mencari judul yang cocok…</span>}
        {state === "empty" && <span>Belum ada hasil. Coba judul asli atau ejaan lain.</span>}
        {state === "error" && <span>{message}</span>}
        {state === "ready" && message && <span>{message}</span>}
      </div>

      {state === "ready" && (
        <ul className={styles.results}>
          {results.slice(0, 6).map((title) => {
            const key = `${title.mediaType}:${title.tmdbId}`;
            const isSaved = saved.includes(key) || Boolean(title.watched);
            return (
              <li key={`${title.mediaType}-${title.tmdbId}`} className={styles.result}>
                <div className={styles.poster}>
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
                <div className={styles.resultCopy}>
                  <div className={styles.meta}>
                    <span>{title.mediaType === "movie" ? "FILM" : "SERIAL"}</span>
                    <span>{title.year ?? "—"}</span>
                    {title.voteAverage > 0 && <span>★ {title.voteAverage.toFixed(1)}</span>}
                    {title.watched && <span>{title.watched.watchCount}× ditonton</span>}
                  </div>
                  <h3>{formatDisplayTitle(title.title, title.originalTitle)}</h3>
                  <p>{title.overview}</p>
                </div>
                <button
                  className={isSaved ? styles.savedButton : styles.addButton}
                  type="button"
                  onClick={() => markWatched(title)}
                  disabled={saving === key || isSaved}
                >
                  {isSaved ? <><CheckIcon size={17} /> Sudah ditonton</> : saving === key ? "Menyimpan…" : "Tandai ditonton"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {message.includes("Masuk") && (
        <Link className={styles.loginLink} href="/auth/login">Masuk ke akun →</Link>
      )}
    </section>
  );
}
