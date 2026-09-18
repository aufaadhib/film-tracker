import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans, Space_Mono } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import { getSiteUrl } from "@/lib/site";
import "sweetalert2/dist/sweetalert2.min.css";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

const description = "Catat film dan episode yang sudah kamu tonton, otomatis maupun manual.";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  applicationName: "Reelmark",
  title: { default: "Reelmark — Riwayat tontonanmu", template: "%s · Reelmark" },
  description,
  category: "entertainment",
  creator: "Reelmark",
  publisher: "Reelmark",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Reelmark",
    title: "Reelmark — Riwayat tontonanmu",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Reelmark — Riwayat tontonanmu",
    description,
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f14" },
  ],
};

const themeScript = `try{const t=localStorage.getItem("reelmark-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch{}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head><link rel="preconnect" href="https://image.tmdb.org" /></head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <PwaRegister />
        <a className="skip-link" href="#main-content">Lewati ke konten utama</a>
        {children}
      </body>
    </html>
  );
}
