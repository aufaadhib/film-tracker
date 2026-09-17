"use client";

import { useEffect } from "react";
import styles from "./dashboard.module.css";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Dashboard render failed", error);
  }, [error]);

  return (
    <section className={styles.errorState} role="alert">
      <p className={styles.eyebrow}>DATA TIDAK TERSEDIA</p>
      <h1>Dashboard belum dapat dimuat.</h1>
      <p>Periksa koneksi dan konfigurasi database, lalu coba kembali.</p>
      <button type="button" onClick={reset}>Coba lagi</button>
    </section>
  );
}
