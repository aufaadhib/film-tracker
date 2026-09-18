import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reelmark — Riwayat tontonanmu",
    short_name: "Reelmark",
    description: "Catat film dan episode yang sudah kamu tonton, otomatis maupun manual.",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0b0f14",
    theme_color: "#6d8cff",
    lang: "id-ID",
    categories: ["entertainment", "utilities"],
    icons: [
      { src: "/reelmark-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/reelmark-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/reelmark-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
