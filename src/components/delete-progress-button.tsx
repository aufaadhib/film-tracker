"use client";

import { useActionState } from "react";
import { deleteInProgress, type DeleteProgressState } from "@/app/dashboard/actions";
import { TrashIcon } from "@/components/icons";
import styles from "@/app/dashboard/dashboard.module.css";

const initialState: DeleteProgressState = { status: "idle", message: "" };

export function DeleteProgressButton({ progressId, title }: { progressId: string; title: string }) {
  const [state, action, isPending] = useActionState(deleteInProgress, initialState);

  return (
    <form
      action={action}
      className={styles.continueDeleteForm}
      onSubmit={(event) => {
        if (!window.confirm(`Hapus “${title}” dari daftar lanjutkan menonton?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="progressId" value={progressId} />
      <button type="submit" disabled={isPending} aria-label={`Hapus progres ${title}`}>
        <TrashIcon size={14} />
        <span>{isPending ? "Menghapus…" : "Hapus"}</span>
      </button>
      {state.status === "error" && <small role="alert">{state.message}</small>}
    </form>
  );
}
