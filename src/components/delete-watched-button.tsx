"use client";

import { useActionState } from "react";
import { deleteUnmatchedWatch, deleteWatchedTitle, type DeleteWatchedState } from "@/app/dashboard/actions";
import { TrashIcon } from "@/components/icons";
import styles from "./media-row.module.css";

const initialState: DeleteWatchedState = { status: "idle", message: "" };

export function DeleteWatchedButton({ itemId, matched, title }: { itemId: string; matched: boolean; title: string }) {
  const [state, action, isPending] = useActionState(matched ? deleteWatchedTitle : deleteUnmatchedWatch, initialState);

  return (
    <form
      action={action}
      className={styles.deleteForm}
      onSubmit={(event) => {
        const message = matched
          ? `Hapus “${title}” dari arsip dan seluruh riwayat tontonan?`
          : `Hapus “${title}” dari riwayat tontonan?`;
        if (!window.confirm(message)) event.preventDefault();
      }}
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
