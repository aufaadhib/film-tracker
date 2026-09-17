import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasSupabaseEnv } from "./env";

export async function createClient() {
  if (!hasSupabaseEnv()) return null;

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies. proxy.ts refreshes the session.
          }
        },
      },
    },
  );
}
