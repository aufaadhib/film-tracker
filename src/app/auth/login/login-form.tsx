"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { FilmIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import styles from "./login.module.css";

type LoginFormProps = {
  nextPath: string;
  extensionMode: boolean;
};

export function LoginForm({ nextPath, extensionMode }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const supabase = createClient();

  function callbackUrl() {
    const callback = new URL(
      "/auth/callback",
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin,
    );
    if (nextPath !== "/") callback.searchParams.set("next", nextPath);
    return callback.toString();
  }

  async function continueWithGoogle() {
    if (!supabase) return setStatus("Tambahkan konfigurasi Supabase di .env.local terlebih dahulu.");
    setPending(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setStatus(error.message);
      setPending(false);
    }
  }

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return setStatus("Tambahkan konfigurasi Supabase di .env.local terlebih dahulu.");
    setPending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    setStatus(error ? error.message : "Tautan masuk sudah dikirim. Periksa emailmu.");
    setPending(false);
  }

  return (
    <main id="main-content" className={styles.page}>
      <Link className={styles.back} href="/">← Kembali ke beranda</Link>
      <section className={styles.card}>
        <div className={styles.identity}>
          <span className={styles.reel}><FilmIcon size={26} /></span>
          <p>REELMARK / {extensionMode ? "EXTENSION" : "AKUN"}</p>
        </div>
        <p className={styles.timecode}>00:00:<span>01</span></p>
        <h1>{extensionMode ? <>Hubungkan<br />browser ini.</> : <>Satu riwayat,<br />di semua layar.</>}</h1>
        <p className={styles.intro}>{extensionMode
          ? "Masuk dengan akun Reelmark. Setelah selesai, popup extension akan terhubung otomatis."
          : "Masuk untuk menyimpan tontonan manual dan membangun arsip pribadimu."}</p>

        <p id="oauth-error" className={styles.oauthError}>
          Login Google tidak selesai. Pastikan provider Google dan redirect URL sudah aktif di Supabase.
        </p>

        <button className={styles.google} type="button" onClick={continueWithGoogle} disabled={pending}>
          <span>G</span> {pending ? "Membuka Google…" : "Lanjutkan dengan Google"}
        </button>

        {!extensionMode ? (
          <>
            <div className={styles.divider}><span>atau email</span></div>
            <form onSubmit={sendMagicLink}>
              <label htmlFor="email">Alamat email</label>
              <div className={styles.emailRow}>
                <input id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com…" autoComplete="email" spellCheck={false} required />
                <button type="submit" disabled={pending}>{pending ? "Mengirim…" : "Kirim tautan"}</button>
              </div>
            </form>
          </>
        ) : null}

        <p className={styles.status} aria-live="polite">{status}</p>
        <p className={styles.privacy}>{extensionMode
          ? "Extension hanya menerima token perangkat terbatas, bukan sesi Google atau sesi Supabase milikmu."
          : "Dengan melanjutkan, kamu menyetujui penyimpanan riwayat tontonan privat di akunmu."}</p>
      </section>
    </main>
  );
}
