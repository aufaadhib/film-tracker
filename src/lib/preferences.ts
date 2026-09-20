import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/watched";

export const DEFAULT_COMPLETION_THRESHOLD = 80;

export async function getCompletionThreshold() {
  const user = await getCurrentUser();
  if (!user) return DEFAULT_COMPLETION_THRESHOLD;

  const supabase = await createClient();
  if (!supabase) return DEFAULT_COMPLETION_THRESHOLD;

  const { data, error } = await supabase
    .from("profiles")
    .select("completion_threshold")
    .eq("id", user.id)
    .single();
  if (error) {
    console.error("Completion threshold query failed", JSON.stringify({ code: error.code, message: error.message }));
    throw new Error("Ambang selesai tidak dapat dimuat.");
  }
  return data.completion_threshold;
}
