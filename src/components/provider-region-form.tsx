"use client";

import { useActionState } from "react";
import { updateProviderRegion, type WatchlistActionState } from "@/app/dashboard/watchlist/actions";
import type { WatchRegion } from "@/lib/tmdb";

const initialState: WatchlistActionState = { status: "idle", message: "" };

export function ProviderRegionForm({ regions, countryCode }: { regions: WatchRegion[]; countryCode: string }) {
  const [state, action, pending] = useActionState(updateProviderRegion, initialState);
  return (
    <article className="grid gap-3 rounded-[15px] border border-line bg-surface p-4.5 min-[640px]:grid-cols-[minmax(0,1fr)_auto] min-[640px]:items-center [&_h2]:mb-1.25 [&_h2]:text-[.82rem] [&_p]:text-[.68rem] [&_p]:leading-normal [&_p]:text-muted [&_button]:inline-flex [&_button]:min-h-10 [&_button]:cursor-pointer [&_button]:items-center [&_button]:justify-center [&_button]:justify-self-start [&_button]:gap-1.75 [&_button]:rounded-[9px] [&_button]:border [&_button]:border-line-strong [&_button]:bg-surface-soft [&_button]:px-3 [&_button]:text-[.65rem] [&_button]:font-[750] [&_button]:leading-none [&_button:hover]:border-reel-blue">
      <div>
        <h2>Negara layanan streaming</h2>
        <p>Ketersediaan watchlist mengikuti katalog streaming di negara ini.</p>
      </div>
      <form action={action} className="grid w-[min(100%,390px)] min-w-0 grid-cols-[minmax(150px,1fr)_auto] items-end justify-self-end gap-1.75 max-[520px]:w-full max-[520px]:grid-cols-1 [&_label]:grid [&_select]:min-h-11 [&_select]:min-w-0 [&_select]:rounded-[9px] [&_select]:border [&_select]:border-line-strong [&_select]:bg-canvas [&_select]:px-2.5 [&_select]:text-ink [&_button]:self-stretch max-[520px]:[&_button]:w-full [&_small]:col-span-full [&_small]:min-h-[1em] [&_small]:text-[.55rem] [&_small]:text-muted max-[520px]:[&_small]:col-auto">
        <label>
          <span className="sr-only">Pilih negara layanan streaming</span>
          <select key={countryCode} name="countryCode" defaultValue={countryCode} disabled={pending}>
            {regions.map((region) => <option key={region.code} value={region.code}>{region.name} ({region.code})</option>)}
          </select>
        </label>
        <button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan negara"}</button>
        <small aria-live="polite" className={state.status === "error" ? "text-[#a33b38]!" : undefined}>{state.message}</small>
      </form>
    </article>
  );
}
