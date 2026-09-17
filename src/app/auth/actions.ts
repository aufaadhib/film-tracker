"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();

  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out failed", JSON.stringify({ name: error.name, message: error.message }));
      throw new Error("Sesi belum berhasil diakhiri.");
    }
  }

  revalidatePath("/", "layout");
  redirect("/");
}
