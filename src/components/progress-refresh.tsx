"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProgressRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [router]);

  return null;
}
