"use client";

import { useEffect } from "react";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Dashboard render failed", error);
  }, [error]);

  return (
    <section className="grid min-h-[55vh] max-w-155 place-items-start content-center gap-3 [&_h1]:font-display [&_h1]:text-[clamp(2rem,7vw,3.6rem)] [&_h1]:leading-none [&_h1]:tracking-[-.055em] [&>p:not(.eyebrow)]:text-[.78rem] [&>p:not(.eyebrow)]:leading-[1.6] [&>p:not(.eyebrow)]:text-muted [&_button]:mt-1.5 [&_button]:min-h-10.5 [&_button]:cursor-pointer [&_button]:rounded-[9px] [&_button]:border-0 [&_button]:bg-watched-mint [&_button]:px-3.5 [&_button]:text-[.7rem] [&_button]:font-extrabold [&_button]:text-[#071019]" role="alert">
      <p className="mb-1.75 font-mono text-[.55rem] font-bold tracking-[.11em] text-reel-blue">DATA TIDAK TERSEDIA</p>
      <h1>Dashboard belum dapat dimuat.</h1>
      <p>Periksa koneksi dan konfigurasi database, lalu coba kembali.</p>
      <button type="button" onClick={reset}>Coba lagi</button>
    </section>
  );
}
