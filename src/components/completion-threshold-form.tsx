"use client";

import { useActionState } from "react";
import {
  updateCompletionThreshold,
  type SettingsActionState,
} from "@/app/dashboard/settings/actions";
import styles from "@/app/dashboard/dashboard.module.css";

const initialState: SettingsActionState = { status: "idle", message: "" };

export function CompletionThresholdForm({ threshold }: { threshold: number }) {
  const [state, action, pending] = useActionState(updateCompletionThreshold, initialState);

  return (
    <article className={styles.setting}>
      <div>
        <h2>Dianggap selesai</h2>
        <p>Film atau episode otomatis masuk riwayat setelah posisi pemutaran mencapai angka ini.</p>
      </div>
      <form action={action} className={styles.thresholdForm}>
        <label htmlFor="completion-threshold">Persentase selesai</label>
        <div className={styles.thresholdControl}>
          <input
            id="completion-threshold"
            name="completionThreshold"
            type="number"
            inputMode="numeric"
            min="50"
            max="100"
            step="1"
            defaultValue={threshold}
            aria-describedby="completion-threshold-help completion-threshold-status"
            disabled={pending}
            required
          />
          <span aria-hidden="true">%</span>
        </div>
        <button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan ambang"}</button>
        <small id="completion-threshold-help">Pilih 50–100%. Extension mengambil perubahan saat tersambung kembali.</small>
        <small
          id="completion-threshold-status"
          aria-live="polite"
          className={state.status === "error" ? styles.formError : undefined}
        >{state.message}</small>
      </form>
    </article>
  );
}
