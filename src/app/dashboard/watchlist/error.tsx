"use client";

import { useEffect } from "react";
import styles from "../dashboard.module.css";

export default function WatchlistError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <section className={styles.errorState}><p className={styles.eyebrow}>WATCHLIST TIDAK TERSEDIA</p><h1>Daftar belum bisa dimuat.</h1><p>Periksa koneksi atau konfigurasi database, lalu coba kembali.</p><button type="button" onClick={reset}>Coba lagi</button></section>;
}
