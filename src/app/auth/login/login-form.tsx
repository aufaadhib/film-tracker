"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { FilmIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

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
    <main id="main-content" className="relative grid min-h-screen place-items-center overflow-hidden bg-console px-4.5 pt-19 pb-9 before:absolute before:-top-55 before:-left-70 before:size-130 before:rounded-full before:bg-reel-blue before:opacity-20 before:blur-[100px] before:content-[''] min-[600px]:px-7 min-[600px]:py-18.5 min-[1100px]:bg-[linear-gradient(90deg,#0b0f14_0_42%,var(--canvas)_42%)]">
      <Link className="absolute top-6 left-4.5 z-2 text-[.72rem] font-bold text-[#a6b1c0] min-[600px]:top-7.5 min-[600px]:left-8" href="/">← Kembali ke beranda</Link>
      <section className="relative z-1 w-full max-w-130 rounded-[22px] border border-[#2b3545] bg-[#121822] px-5.5 py-6.5 text-[#f5f7fa] shadow-[0_35px_90px_rgb(0_0_0/30%)] [&_h1]:m-0 [&_h1]:text-balance [&_h1]:font-display [&_h1]:text-[clamp(2.7rem,12vw,4.2rem)] [&_h1]:leading-[.9] [&_h1]:font-[720] [&_h1]:tracking-[-.07em] [&_label]:mb-1.75 [&_label]:block [&_label]:text-[.68rem] [&_label]:font-[750] min-[600px]:p-9.5 min-[1100px]:translate-x-[15vw]">
        <div className="flex items-center gap-2.5 [&_p]:font-mono [&_p]:text-[.55rem] [&_p]:font-bold [&_p]:tracking-[.12em]">
          <span className="grid size-10 place-items-center rounded-full bg-watched-mint text-[#071019]"><FilmIcon size={26} /></span>
          <p>REELMARK / {extensionMode ? "EXTENSION" : "AKUN"}</p>
        </div>
        <p className="mt-8.5 mb-2.25 font-mono text-[.67rem] text-[#7f8b9d] [&_span]:text-live-coral">00:00:<span>01</span></p>
        <h1>{extensionMode ? <>Hubungkan<br />browser ini.</> : <>Satu riwayat,<br />di semua layar.</>}</h1>
        <p className="mt-4.5 mb-7 text-[.82rem] leading-[1.6] text-[#9ca7b7]">{extensionMode
          ? "Masuk dengan akun Reelmark. Setelah selesai, popup extension akan terhubung otomatis."
          : "Masuk untuk menyimpan tontonan manual dan membangun arsip pribadimu."}</p>

        <p id="oauth-error" className="-mt-2.25 mb-5 hidden rounded-[9px] border border-[#6d423e] bg-[#321d1c] px-3 py-2.75 text-[.7rem] leading-[1.45] text-[#ffd7d3] target:block">
          Login Google tidak selesai. Pastikan provider Google dan redirect URL sudah aktif di Supabase.
        </p>

        <button className="flex min-h-12.5 w-full cursor-pointer items-center justify-center gap-2.5 rounded-[11px] border-0 bg-watched-mint text-[.78rem] font-extrabold text-[#071019] hover:bg-[#75e4ba] disabled:cursor-wait disabled:opacity-65 [&_span]:grid [&_span]:size-5.5 [&_span]:place-items-center [&_span]:rounded-full [&_span]:bg-white [&_span]:font-[Arial,sans-serif] [&_span]:text-[#3254c5]" type="button" onClick={continueWithGoogle} disabled={pending}>
          <span>G</span> {pending ? "Membuka Google…" : "Lanjutkan dengan Google"}
        </button>

        {!extensionMode ? (
          <>
            <div className="my-6 flex items-center gap-3 font-mono text-[.5rem] text-[#7f8b9d] uppercase before:h-px before:flex-1 before:bg-[#2b3545] before:content-[''] after:h-px after:flex-1 after:bg-[#2b3545] after:content-['']"><span>atau email</span></div>
            <form onSubmit={sendMagicLink}>
              <label htmlFor="email">Alamat email</label>
              <div className="grid gap-2.25 min-[600px]:grid-cols-[minmax(0,1fr)_auto] [&_input]:min-h-12.25 [&_input]:min-w-0 [&_input]:rounded-[9px] [&_input]:border [&_input]:border-[#394456] [&_input]:bg-[#0d1219] [&_input]:px-3.25 [&_input]:text-[#f5f7fa] [&_input]:outline-0 [&_input]:focus-visible:border-reel-blue [&_button]:min-h-12.25 [&_button]:cursor-pointer [&_button]:rounded-[9px] [&_button]:border-0 [&_button]:bg-warning [&_button]:px-4 [&_button]:text-[.72rem] [&_button]:font-extrabold [&_button]:text-[#071019] [&_button]:hover:bg-[#ffd06d] [&_button]:disabled:cursor-wait [&_button]:disabled:opacity-65">
                <input id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com…" autoComplete="email" spellCheck={false} required />
                <button type="submit" disabled={pending}>{pending ? "Mengirim…" : "Kirim tautan"}</button>
              </div>
            </form>
          </>
        ) : null}

        <p className="min-h-9.5 pt-3 text-[.7rem] leading-[1.4] text-watched-mint" aria-live="polite">{status}</p>
        <p className="border-t border-[#2b3545] pt-3.75 text-[.58rem] leading-normal text-[#7f8b9d]">{extensionMode
          ? "Extension hanya menerima token perangkat terbatas, bukan sesi Google atau sesi Supabase milikmu."
          : "Dengan melanjutkan, kamu menyetujui penyimpanan riwayat tontonan privat di akunmu."}</p>
      </section>
    </main>
  );
}
