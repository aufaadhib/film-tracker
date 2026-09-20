"use client";

import { useActionState } from "react";
import { createPairingCode, type PairingActionState } from "./actions";

const initialState: PairingActionState = {
  status: "idle",
  message: "Gunakan kode ini hanya jika login Google dari popup extension tidak dapat dibuka.",
};

export function ExtensionPairing() {
  const [state, formAction, isPending] = useActionState(createPairingCode, initialState);

  return (
    <section className="mt-3.5 grid gap-4 rounded-2xl border border-line bg-surface p-5 [&_h2]:font-display [&_h2]:text-[1.4rem] [&>div>p:last-child]:mt-2 [&>div>p:last-child]:max-w-145 [&>div>p:last-child]:text-[.72rem] [&>div>p:last-child]:leading-[1.55] [&>div>p:last-child]:text-muted [&_form]:flex max-[520px]:[&_form]:w-full [&_button]:min-h-10.5 [&_button]:cursor-pointer [&_button]:rounded-[9px] [&_button]:border-0 [&_button]:bg-watched-mint [&_button]:px-3.5 [&_button]:text-[.68rem] [&_button]:font-extrabold [&_button]:text-[#071019] [&_button:hover]:bg-[#75e4ba] [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-65 max-[520px]:[&_button]:w-full" aria-labelledby="pairing-title">
      <div>
        <p className="mb-1.75 font-mono text-[.55rem] font-bold tracking-[.11em] text-reel-blue">PEMULIHAN MANUAL</p>
        <h2 id="pairing-title">Butuh kode pairing?</h2>
        <p>{state.message}</p>
      </div>
      {state.code ? (
        <output className="w-fit rounded-[10px] border border-line-strong bg-canvas px-3.75 py-3 font-mono text-[clamp(1.3rem,5vw,2rem)] font-extrabold tracking-[.12em] text-ink" aria-label="Kode pairing extension">
          {state.code.slice(0, 4)}&nbsp;{state.code.slice(4)}
        </output>
      ) : null}
      <form action={formAction}>
        <button type="submit" disabled={isPending}>
          {isPending ? "Membuat kode…" : state.code ? "Buat kode baru" : "Buat kode pairing"}
        </button>
      </form>
      <p className="-mt-2 min-h-[1em] text-[.62rem] text-muted" aria-live="polite">
        {state.status === "error" ? state.message : state.code && state.expiresAt
          ? `Berlaku sampai ${new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(state.expiresAt))}.`
          : ""}
      </p>
    </section>
  );
}
