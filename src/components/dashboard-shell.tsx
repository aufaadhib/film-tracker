"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/brand";
import { CollectionIcon, ExtensionIcon, HistoryIcon, HomeIcon, ImportIcon, LogoutIcon, MoreIcon, SearchIcon, SettingsIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/app/auth/actions";
import styles from "./dashboard-shell.module.css";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: HomeIcon },
  { href: "/dashboard/history", label: "Riwayat", icon: HistoryIcon },
  { href: "/dashboard/discover", label: "Jelajahi", icon: SearchIcon },
  { href: "/dashboard/extension", label: "Extension", icon: ExtensionIcon },
  { href: "/dashboard/import", label: "Import", icon: ImportIcon },
  { href: "/dashboard/settings", label: "Pengaturan", icon: SettingsIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function DashboardShell({ children, name, email, databaseConnected }: { children: React.ReactNode; name: string; email: string; databaseConnected: boolean }) {
  const pathname = usePathname();
  const mobileItems = navigation.slice(0, 4);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Brand />
        <nav aria-label="Navigasi dashboard">
          <p>RUANG TONTON</p>
          {navigation.slice(0, 4).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={isActive(pathname, href) ? styles.active : undefined} aria-current={isActive(pathname, href) ? "page" : undefined}>
              <Icon size={19} /><span>{label}</span>
            </Link>
          ))}
          <p>AKUN</p>
          {navigation.slice(4).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={isActive(pathname, href) ? styles.active : undefined} aria-current={isActive(pathname, href) ? "page" : undefined}>
              <Icon size={19} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className={styles.sideFoot}>
          <div className={styles.identity}>
            <span>{name.slice(0, 1).toUpperCase()}</span>
            <div className={styles.identityCopy}><strong>{name}</strong><small>{email}</small></div>
          </div>
          <form action={signOut}>
            <button className={styles.sideLogout} type="submit" aria-label="Keluar dari akun" title="Keluar dari akun">
              <LogoutIcon size={18} /><span>Keluar</span>
            </button>
          </form>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.mobileBrand}><Brand /></div>
          <p><span className={databaseConnected ? undefined : styles.demoDot} /> {databaseConnected ? "Supabase terhubung" : "Mode demo"}</p>
          <ThemeToggle className={styles.themeButton} />
        </header>
        <main id="main-content" className={styles.main}>{children}</main>
      </div>

      <nav className={styles.mobileNav} aria-label="Navigasi dashboard seluler">
        {mobileItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={isActive(pathname, href) ? styles.mobileActive : undefined} aria-current={isActive(pathname, href) ? "page" : undefined}>
            <Icon size={19} /><span>{label}</span>
          </Link>
        ))}
        <details>
          <summary aria-label="Buka menu lainnya"><MoreIcon size={19} /><span>Lainnya</span></summary>
          <div>
            <Link href="/dashboard/import"><ImportIcon size={18} /> Import</Link>
            <Link href="/dashboard/settings"><SettingsIcon size={18} /> Pengaturan</Link>
            <Link href="/"><CollectionIcon size={18} /> Landing</Link>
            <form action={signOut}><button type="submit"><LogoutIcon size={18} /> Keluar</button></form>
          </div>
        </details>
      </nav>
    </div>
  );
}
