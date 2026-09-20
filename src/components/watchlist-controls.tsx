"use client";

import { type FormEvent, useActionState, useRef } from "react";
import { removeWatchlist, toggleWatchlistPriority, type WatchlistActionState } from "@/app/dashboard/watchlist/actions";
import { PinIcon, TrashIcon } from "@/components/icons";
import { confirmDelete } from "@/components/sweetalert";

const initialState: WatchlistActionState = { status: "idle", message: "" };

export function WatchlistControls({ itemId, title, isPriority }: {
  itemId: string;
  title: string;
  isPriority: boolean;
}) {
  const [priorityState, priorityAction, priorityPending] = useActionState(toggleWatchlistPriority, initialState);
  const [removeState, removeAction, removePending] = useActionState(removeWatchlist, initialState);
  const confirmed = useRef(false);

  async function confirmRemoval(event: FormEvent<HTMLFormElement>) {
    if (confirmed.current) {
      confirmed.current = false;
      return;
    }
    event.preventDefault();
    const form = event.currentTarget;
    if (await confirmDelete(`Hapus “${title}” dari watchlist?`)) {
      confirmed.current = true;
      form.requestSubmit();
    }
  }

  const message = priorityState.status === "error" ? priorityState.message
    : removeState.status === "error" ? removeState.message : "";

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.75 [&_form]:flex [&_button]:inline-flex [&_button]:min-h-11 [&_button]:cursor-pointer [&_button]:items-center [&_button]:gap-1.5 [&_button]:rounded-lg [&_button]:border [&_button]:border-line [&_button]:bg-surface-soft [&_button]:px-3 [&_button]:text-[.56rem] [&_button]:font-[750] [&_button]:text-ink-soft [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-55 [&>span]:w-full [&>span]:text-[.52rem] [&>span]:text-[#a33b38]">
      <form action={priorityAction}>
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="priority" value={String(!isPriority)} />
        <button type="submit" disabled={priorityPending} className={isPriority ? "border-[color-mix(in_srgb,var(--warning)_70%,var(--line))]! bg-[color-mix(in_srgb,var(--warning)_18%,var(--surface))]! text-[#785000]!" : undefined}>
          <PinIcon size={15} />
          {priorityPending ? "Menyimpan…" : isPriority ? "Prioritas" : "Sematkan"}
        </button>
      </form>
      <form action={removeAction} onSubmit={confirmRemoval}>
        <input type="hidden" name="itemId" value={itemId} />
        <button type="submit" disabled={removePending} className="bg-transparent! text-[#a33b38]!" aria-label={`Hapus ${title} dari watchlist`}>
          <TrashIcon size={15} /> {removePending ? "Menghapus…" : "Hapus"}
        </button>
      </form>
      <span aria-live="polite" role={message ? "alert" : undefined}>{message}</span>
    </div>
  );
}
