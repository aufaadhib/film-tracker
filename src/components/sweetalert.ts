"use client";

import Swal from "sweetalert2";

export async function confirmDelete(message: string) {
  const result = await Swal.fire({
    title: "Konfirmasi penghapusan",
    text: message,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, hapus",
    cancelButtonText: "Batal",
    confirmButtonColor: "#ff6b63",
    cancelButtonColor: "#6f7b8c",
    focusCancel: true,
    reverseButtons: true,
    heightAuto: false,
  });

  return result.isConfirmed;
}
