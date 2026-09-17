"use client";

import { useActionState } from "react";
import { createPairingCode, type PairingActionState } from "./actions";
import styles from "../dashboard.module.css";

const initialState: PairingActionState = {
  status: "idle",
  message: "Gunakan kode ini hanya jika login Google dari popup extension tidak dapat dibuka.",
};

export function ExtensionPairing() {
  const [state, formAction, isPending] = useActionState(createPairingCode, initialState);

  return (
    <section className={styles.pairingCard} aria-labelledby="pairing-title">
      <div>
        <p className={styles.eyebrow}>PEMULIHAN MANUAL</p>
        <h2 id="pairing-title">Butuh kode pairing?</h2>
        <p>{state.message}</p>
      </div>
      {state.code ? (
        <output className={styles.pairingCode} aria-label="Kode pairing extension">
          {state.code.slice(0, 4)}&nbsp;{state.code.slice(4)}
        </output>
      ) : null}
      <form action={formAction}>
        <button type="submit" disabled={isPending}>
          {isPending ? "Membuat kode…" : state.code ? "Buat kode baru" : "Buat kode pairing"}
        </button>
      </form>
      <p className={styles.pairingStatus} aria-live="polite">
        {state.status === "error" ? state.message : state.code && state.expiresAt
          ? `Berlaku sampai ${new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(state.expiresAt))}.`
          : ""}
      </p>
    </section>
  );
}
