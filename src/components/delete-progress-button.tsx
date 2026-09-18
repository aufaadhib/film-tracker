"use client";

import { type FormEvent, useActionState, useRef } from "react";
import { deleteInProgress, type DeleteProgressState } from "@/app/dashboard/actions";
import { confirmDelete } from "@/components/sweetalert";
import { TrashIcon } from "@/components/icons";
import styles from "@/app/dashboard/dashboard.module.css";

const initialState: DeleteProgressState = { status: "idle", message: "" };

export function DeleteProgressButton({ progressId, title }: { progressId: string; title: string }) {
  const [state, action, isPending] = useActionState(deleteInProgress, initialState);
  const confirmed = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirmed.current) {
      confirmed.current = false;
      return;
    }
    event.preventDefault();
    const form = event.currentTarget;
    if (await confirmDelete(`Hapus “${title}” dari daftar lanjutkan menonton?`)) {
      confirmed.current = true;
      form.requestSubmit();
    }
  }

  return (
    <form
      action={action}
      className={styles.continueDeleteForm}
      onSubmit={handleSubmit}
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
