"use client";

import { type FormEvent, useActionState, useRef } from "react";
import { deleteUnmatchedWatch, deleteWatchedTitle, type DeleteWatchedState } from "@/app/dashboard/actions";
import { confirmDelete } from "@/components/sweetalert";
import { TrashIcon } from "@/components/icons";
import styles from "./media-row.module.css";

const initialState: DeleteWatchedState = { status: "idle", message: "" };

export function DeleteWatchedButton({ itemId, matched, title, episode = false }: { itemId: string; matched: boolean; title: string; episode?: boolean }) {
  const [state, action, isPending] = useActionState(matched ? deleteWatchedTitle : deleteUnmatchedWatch, initialState);
  const confirmed = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirmed.current) {
      confirmed.current = false;
      return;
    }
    event.preventDefault();
    const form = event.currentTarget;
    const message = matched && episode
      ? `Hapus episode “${title}” dari riwayat tontonan?`
      : matched
      ? `Hapus “${title}” dari arsip dan seluruh riwayat tontonan?`
      : `Hapus “${title}” dari riwayat tontonan?`;
    if (await confirmDelete(message)) {
      confirmed.current = true;
      form.requestSubmit();
    }
  }

  return (
    <form
      action={action}
      className={styles.deleteForm}
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="itemId" value={itemId} />
      <button type="submit" disabled={isPending} aria-label={`Hapus ${title} dari riwayat`}>
        <TrashIcon size={15} />
        <span>{isPending ? "Menghapus…" : "Hapus"}</span>
      </button>
      {state.status === "error" && <small role="alert">{state.message}</small>}
    </form>
  );
}
