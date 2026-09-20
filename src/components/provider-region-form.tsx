"use client";

import { useActionState } from "react";
import { updateProviderRegion, type WatchlistActionState } from "@/app/dashboard/watchlist/actions";
import type { WatchRegion } from "@/lib/tmdb";
import styles from "@/app/dashboard/dashboard.module.css";

const initialState: WatchlistActionState = { status: "idle", message: "" };

export function ProviderRegionForm({ regions, countryCode }: { regions: WatchRegion[]; countryCode: string }) {
  const [state, action, pending] = useActionState(updateProviderRegion, initialState);
  return (
    <article className={styles.setting}>
      <div>
        <h2>Negara layanan streaming</h2>
        <p>Ketersediaan watchlist mengikuti katalog streaming di negara ini.</p>
      </div>
      <form action={action} className={styles.regionForm}>
        <label>
          <span className="sr-only">Pilih negara layanan streaming</span>
          <select key={countryCode} name="countryCode" defaultValue={countryCode} disabled={pending}>
            {regions.map((region) => <option key={region.code} value={region.code}>{region.name} ({region.code})</option>)}
          </select>
        </label>
        <button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan negara"}</button>
        <small aria-live="polite" className={state.status === "error" ? styles.formError : undefined}>{state.message}</small>
      </form>
    </article>
  );
}
