"use client";

import { type FormEvent, useActionState, useRef } from "react";
import { deleteInProgress, type DeleteProgressState } from "@/app/dashboard/actions";
import { confirmDelete } from "@/components/sweetalert";
import { TrashIcon } from "@/components/icons";

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
      className="grid justify-items-end gap-1 [&_button]:inline-flex [&_button]:min-h-8 [&_button]:cursor-pointer [&_button]:items-center [&_button]:gap-1.25 [&_button]:rounded-lg [&_button]:border [&_button]:border-line [&_button]:bg-transparent [&_button]:px-2.25 [&_button]:text-[.56rem] [&_button]:font-[750] [&_button]:text-[#a33b38] [&_button]:hover:border-[#bc3e3a] [&_button]:hover:bg-[rgb(188_62_58/7%)] [&_button]:disabled:cursor-wait [&_button]:disabled:opacity-55 [&_small]:max-w-42.5 [&_small]:text-right [&_small]:text-[#a33b38]"
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
