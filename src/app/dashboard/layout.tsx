import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/watched";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  if (!hasSupabaseEnv()) {
    return <DashboardShell name="Mode demo" email="Data tidak disimpan" databaseConnected={false}>{children}</DashboardShell>;
  }

  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/dashboard");

  const name = user.user_metadata?.full_name?.trim() || user.email?.split("@")[0] || "Penonton";
  return <DashboardShell name={name} email={user.email ?? ""} databaseConnected>{children}</DashboardShell>;
}
