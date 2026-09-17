"use client";

import { useActionState } from "react";
import { deleteWatchedTitle, type DeleteWatchedState } from "@/app/dashboard/actions";
import { TrashIcon } from "@/components/icons";
import styles from "./media-row.module.css";

const initialState: DeleteWatchedState = { status: "idle", message: "" };

export function DeleteWatchedButton({ stateId, title }: { stateId: string; title: string }) {
  const [state, action, isPending] = useActionState(deleteWatchedTitle, initialState);

  return (
    <form
      action={action}
      className={styles.deleteForm}
      onSubmit={(event) => {
        if (!window.confirm(`Hapus “${title}” dari arsip dan seluruh riwayat tontonan?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="stateId" value={stateId} />
      <button type="submit" disabled={isPending} aria-label={`Hapus ${title} dari riwayat`}>
        <TrashIcon size={15} />
        <span>{isPending ? "Menghapus…" : "Hapus"}</span>
      </button>
      {state.status === "error" && <small role="alert">{state.message}</small>}
    </form>
  );
}
