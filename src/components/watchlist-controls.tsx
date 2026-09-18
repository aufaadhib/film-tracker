"use client";

import { type FormEvent, useActionState, useRef } from "react";
import { removeWatchlist, toggleWatchlistPriority, type WatchlistActionState } from "@/app/dashboard/watchlist/actions";
import { PinIcon, TrashIcon } from "@/components/icons";
import { confirmDelete } from "@/components/sweetalert";
import styles from "@/app/dashboard/watchlist/watchlist.module.css";

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
    <div className={styles.cardControls}>
      <form action={priorityAction}>
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="priority" value={String(!isPriority)} />
        <button type="submit" disabled={priorityPending} className={isPriority ? styles.pinned : undefined}>
          <PinIcon size={15} />
          {priorityPending ? "Menyimpan…" : isPriority ? "Prioritas" : "Sematkan"}
        </button>
      </form>
      <form action={removeAction} onSubmit={confirmRemoval}>
        <input type="hidden" name="itemId" value={itemId} />
        <button type="submit" disabled={removePending} className={styles.removeButton} aria-label={`Hapus ${title} dari watchlist`}>
          <TrashIcon size={15} /> {removePending ? "Menghapus…" : "Hapus"}
        </button>
      </form>
      <span aria-live="polite" role={message ? "alert" : undefined}>{message}</span>
    </div>
  );
}
