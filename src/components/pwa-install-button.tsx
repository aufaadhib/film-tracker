"use client";

import { useEffect, useState } from "react";
import { ImportIcon } from "@/components/icons";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallButton({ className }: { className?: string }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const onInstalled = () => setInstallPrompt(null);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installPrompt) return null;

  async function install() {
    if (!installPrompt) return;
    setInstalling(true);
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } finally {
      setInstalling(false);
    }
  }

  return (
    <button className={className} type="button" onClick={install} disabled={installing}>
      <ImportIcon size={18} /> {installing ? "Membuka instalasi…" : "Pasang aplikasi"}
    </button>
  );
}
