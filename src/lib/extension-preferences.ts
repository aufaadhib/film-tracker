import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_COMPLETION_THRESHOLD } from "@/lib/preferences";

export async function getExtensionCompletionThreshold(supabase: SupabaseClient, tokenHash: string) {
  const { data, error } = await supabase.rpc("get_extension_preferences", {
    p_token_hash: tokenHash,
  });
  if (error) {
    console.error("Extension preferences query failed", JSON.stringify({ code: error.code, message: error.message }));
    return { error: true, authenticated: false, completionThreshold: DEFAULT_COMPLETION_THRESHOLD } as const;
  }

  const result = data as { authenticated?: boolean; completion_threshold?: number } | null;
  return {
    error: false,
    authenticated: Boolean(result?.authenticated),
    completionThreshold: Number(result?.completion_threshold ?? DEFAULT_COMPLETION_THRESHOLD),
  } as const;
}
