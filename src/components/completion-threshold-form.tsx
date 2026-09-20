"use client";

import { useActionState } from "react";
import {
  updateCompletionThreshold,
  type SettingsActionState,
} from "@/app/dashboard/settings/actions";

const initialState: SettingsActionState = { status: "idle", message: "" };

export function CompletionThresholdForm({ threshold }: { threshold: number }) {
  const [state, action, pending] = useActionState(updateCompletionThreshold, initialState);

  return (
    <article className="grid gap-3 rounded-[15px] border border-line bg-surface p-4.5 min-[640px]:grid-cols-[minmax(0,1fr)_auto] min-[640px]:items-center [&_h2]:mb-1.25 [&_h2]:text-[.82rem] [&_p]:text-[.68rem] [&_p]:leading-normal [&_p]:text-muted [&_button]:inline-flex [&_button]:min-h-10 [&_button]:cursor-pointer [&_button]:items-center [&_button]:justify-center [&_button]:justify-self-start [&_button]:gap-1.75 [&_button]:rounded-[9px] [&_button]:border [&_button]:border-line-strong [&_button]:bg-surface-soft [&_button]:px-3 [&_button]:text-[.65rem] [&_button]:font-[750] [&_button]:leading-none [&_button:hover]:border-reel-blue">
      <div>
        <h2>Dianggap selesai</h2>
        <p>Film atau episode otomatis masuk riwayat setelah posisi pemutaran mencapai angka ini.</p>
      </div>
      <form action={action} className="grid w-[min(100%,390px)] min-w-0 grid-cols-[minmax(130px,1fr)_auto] items-end justify-self-end gap-1.75 max-[520px]:w-full max-[520px]:grid-cols-1 [&>label]:col-span-full [&>label]:text-[.56rem] [&>label]:text-muted max-[520px]:[&>label]:col-auto [&_button]:min-h-11 [&_button]:self-stretch max-[520px]:[&_button]:w-full [&_small]:col-span-full [&_small]:min-h-[1em] [&_small]:text-[.55rem] [&_small]:leading-[1.45] [&_small]:text-muted max-[520px]:[&_small]:col-auto">
        <label htmlFor="completion-threshold">Persentase selesai</label>
        <div className="relative min-w-0 [&_input]:min-h-11 [&_input]:w-full [&_input]:rounded-[9px] [&_input]:border [&_input]:border-line-strong [&_input]:bg-canvas [&_input]:pr-8.5 [&_input]:pl-2.75 [&_input]:text-ink [&_input]:tabular-nums [&_span]:pointer-events-none [&_span]:absolute [&_span]:top-1/2 [&_span]:right-3 [&_span]:-translate-y-1/2 [&_span]:font-mono [&_span]:text-[.65rem] [&_span]:text-muted">
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
          className={state.status === "error" ? "text-[#a33b38]!" : undefined}
        >{state.message}</small>
      </form>
    </article>
  );
}
