"use client";

import { type FormEvent, useActionState, useRef } from "react";
import { deleteUnmatchedWatch, deleteWatchedTitle, type DeleteWatchedState } from "@/app/dashboard/actions";
import { confirmDelete } from "@/components/sweetalert";
import { TrashIcon } from "@/components/icons";

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
      className="grid justify-items-end gap-1 [&_button]:inline-flex [&_button]:min-h-11 [&_button]:cursor-pointer [&_button]:items-center [&_button]:gap-1.25 [&_button]:rounded-lg [&_button]:border [&_button]:border-line [&_button]:bg-transparent [&_button]:px-2.75 [&_button]:text-[.57rem] [&_button]:font-[750] [&_button]:text-[#a33b38] [&_button]:hover:border-[#bc3e3a] [&_button]:hover:bg-[rgb(188_62_58/7%)] [&_button]:disabled:cursor-wait [&_button]:disabled:opacity-55 [&_small]:max-w-37.5 [&_small]:text-right [&_small]:text-[.52rem] [&_small]:leading-[1.35] [&_small]:text-[#a33b38] max-[480px]:[&_button]:w-11 max-[480px]:[&_button]:justify-center max-[480px]:[&_button]:p-0 max-[480px]:[&_button_span]:sr-only"
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
