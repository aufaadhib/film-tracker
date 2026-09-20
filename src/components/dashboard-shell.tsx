"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/brand";
import { BookmarkIcon, CollectionIcon, ExtensionIcon, HistoryIcon, HomeIcon, ImportIcon, LogoutIcon, MoreIcon, SearchIcon, SettingsIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/app/auth/actions";

const primaryNavigation = [
  { href: "/dashboard", label: "Overview", icon: HomeIcon },
  { href: "/dashboard/watchlist", label: "Watchlist", icon: BookmarkIcon },
  { href: "/dashboard/history", label: "Riwayat", icon: HistoryIcon },
  { href: "/dashboard/discover", label: "Jelajahi", icon: SearchIcon },
];

const accountNavigation = [
  { href: "/dashboard/extension", label: "Extension", icon: ExtensionIcon },
  { href: "/dashboard/import", label: "Import", icon: ImportIcon },
  { href: "/dashboard/settings", label: "Pengaturan", icon: SettingsIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function DashboardShell({ children, name, email, databaseConnected }: { children: React.ReactNode; name: string; email: string; databaseConnected: boolean }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-61 flex-col bg-console px-4.5 pt-6 pb-4.5 text-[#f5f7fa] min-[768px]:flex min-[768px]:w-19 min-[768px]:items-center min-[768px]:px-3 min-[1120px]:w-61 min-[1120px]:items-stretch min-[1120px]:px-4.5 [&_nav]:mt-10.5 [&_nav]:grid [&_nav]:gap-1 min-[768px]:[&_nav]:w-full [&_nav_p]:mx-2.75 [&_nav_p]:mt-6 [&_nav_p]:mb-2 [&_nav_p]:font-mono [&_nav_p]:text-[.48rem] [&_nav_p]:tracking-[.12em] [&_nav_p]:text-[#687587] min-[768px]:[&_nav_p]:hidden min-[1120px]:[&_nav_p]:grid [&_nav_a]:flex [&_nav_a]:min-h-10.75 [&_nav_a]:items-center [&_nav_a]:gap-3 [&_nav_a]:rounded-[10px] [&_nav_a]:px-3 [&_nav_a]:text-[.76rem] [&_nav_a]:font-[650] [&_nav_a]:text-[#929eae] [&_nav_a]:transition-colors [&_nav_a:hover]:bg-[#171e29] [&_nav_a:hover]:text-[#f5f7fa] min-[768px]:[&_nav_a]:justify-center min-[768px]:[&_nav_a]:p-0 min-[1120px]:[&_nav_a]:justify-start min-[1120px]:[&_nav_a]:px-3 min-[768px]:[&_nav_a_span]:hidden min-[1120px]:[&_nav_a_span]:grid">
        <div className="flex w-full justify-start min-[768px]:justify-center min-[768px]:overflow-hidden min-[768px]:[&_strong]:hidden min-[1120px]:justify-start min-[1120px]:overflow-visible min-[1120px]:[&_strong]:inline"><Brand /></div>
        <nav aria-label="Navigasi dashboard">
          <p>RUANG TONTON</p>
          {primaryNavigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={isActive(pathname, href) ? "bg-[#1c2533]! text-[#f5f7fa]! shadow-[inset_3px_0_var(--reel-blue)] [&_svg]:text-watched-mint" : undefined} aria-current={isActive(pathname, href) ? "page" : undefined}>
              <Icon size={19} /><span>{label}</span>
            </Link>
          ))}
          <p>AKUN</p>
          {accountNavigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={isActive(pathname, href) ? "bg-[#1c2533]! text-[#f5f7fa]! shadow-[inset_3px_0_var(--reel-blue)] [&_svg]:text-watched-mint" : undefined} aria-current={isActive(pathname, href) ? "page" : undefined}>
              <Icon size={19} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto grid gap-2.5 rounded-xl border border-[#273040] p-2.5 [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_strong]:text-[.7rem] [&_small]:overflow-hidden [&_small]:text-ellipsis [&_small]:whitespace-nowrap [&_small]:text-[.53rem] [&_small]:text-[#7f8b9d] [&_form]:border-t [&_form]:border-[#273040] [&_form]:pt-2 min-[768px]:p-2 min-[768px]:[&_form]:flex min-[768px]:[&_form]:justify-center min-[1120px]:p-2.5 min-[1120px]:[&_form]:block">
          <div className="grid min-w-0 grid-cols-[35px_minmax(0,1fr)] items-center gap-2.5 [&>span]:grid [&>span]:size-8.75 [&>span]:place-items-center [&>span]:rounded-full [&>span]:bg-watched-mint [&>span]:font-mono [&>span]:text-[.67rem] [&>span]:font-bold [&>span]:text-[#071019] min-[768px]:block min-[1120px]:grid">
            <span>{name.slice(0, 1).toUpperCase()}</span>
            <div className="grid min-w-0 gap-0.75 min-[768px]:hidden min-[1120px]:grid"><strong>{name}</strong><small>{email}</small></div>
          </div>
          <form action={signOut}>
            <button className="flex min-h-9 w-full cursor-pointer items-center gap-2.25 rounded-lg border-0 bg-transparent px-2 text-[.65rem] font-bold text-[#929eae] hover:bg-[#25202a] hover:text-white min-[768px]:justify-center min-[768px]:p-0 min-[768px]:[&_span]:hidden min-[1120px]:justify-start min-[1120px]:px-2 min-[1120px]:[&_span]:inline" type="submit" aria-label="Keluar dari akun" title="Keluar dari akun">
              <LogoutIcon size={18} /><span>Keluar</span>
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 min-[768px]:ml-19 min-[1120px]:ml-61">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-4 backdrop-blur-2xl [&>p]:m-0 [&>p]:hidden [&>p]:items-center [&>p]:gap-2 [&>p]:font-mono [&>p]:text-[.5rem] [&>p]:text-muted [&>p_span]:size-1.75 [&>p_span]:rounded-full [&>p_span]:bg-watched-mint min-[768px]:justify-end min-[768px]:px-7 min-[768px]:[&>p]:mr-auto min-[768px]:[&>p]:flex">
          <div className="mr-auto min-[768px]:hidden"><Brand /></div>
          <p><span className={databaseConnected ? undefined : "bg-warning!"} /> {databaseConnected ? "Supabase terhubung" : "Mode demo"}</p>
          <ThemeToggle className="flex min-h-9.5 cursor-pointer items-center gap-1.75 rounded-[10px] border border-line bg-surface px-2.75 text-[.62rem] text-muted hover:border-reel-blue hover:text-ink" />
        </header>
        <main id="main-content" className="mx-auto max-w-370 px-4 pt-7 pb-[calc(100px+env(safe-area-inset-bottom))] min-[768px]:px-7 min-[768px]:pt-9.5 min-[768px]:pb-16 min-[1120px]:px-10.5 min-[1120px]:pt-11 min-[1120px]:pb-17.5">{children}</main>
      </div>

      <nav className="fixed right-[max(8px,env(safe-area-inset-right))] bottom-[calc(8px+env(safe-area-inset-bottom))] left-[max(8px,env(safe-area-inset-left))] z-40 grid grid-cols-5 rounded-2xl border border-line-strong bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-1.25 shadow-reel backdrop-blur-[18px] min-[768px]:hidden [&>a]:flex [&>a]:min-h-12.25 [&>a]:min-w-0 [&>a]:flex-col [&>a]:items-center [&>a]:justify-center [&>a]:gap-1 [&>a]:rounded-[11px] [&>a]:text-[.49rem] [&>a]:text-muted [&_details]:relative [&_summary]:flex [&_summary]:min-h-12.25 [&_summary]:cursor-pointer [&_summary]:list-none [&_summary]:flex-col [&_summary]:items-center [&_summary]:justify-center [&_summary]:gap-1 [&_summary]:rounded-[11px] [&_summary]:text-[.49rem] [&_summary]:text-muted [&_details[open]_summary]:text-reel-blue [&_details>div]:absolute [&_details>div]:right-0 [&_details>div]:bottom-15.5 [&_details>div]:grid [&_details>div]:w-45 [&_details>div]:gap-1 [&_details>div]:rounded-[13px] [&_details>div]:border [&_details>div]:border-line [&_details>div]:bg-surface-raised [&_details>div]:p-1.75 [&_details>div]:shadow-reel [&_details>div_a]:flex [&_details>div_a]:min-h-10.5 [&_details>div_a]:w-full [&_details>div_a]:items-center [&_details>div_a]:gap-2.5 [&_details>div_a]:rounded-lg [&_details>div_a]:px-2.5 [&_details>div_a]:text-[.72rem] [&_details>div_a]:text-ink-soft [&_details>div_a:hover]:bg-surface-soft [&_details>div_button]:flex [&_details>div_button]:min-h-10.5 [&_details>div_button]:w-full [&_details>div_button]:cursor-pointer [&_details>div_button]:items-center [&_details>div_button]:gap-2.5 [&_details>div_button]:rounded-lg [&_details>div_button]:border-0 [&_details>div_button]:bg-transparent [&_details>div_button]:px-2.5 [&_details>div_button]:text-left [&_details>div_button]:text-[.72rem] [&_details>div_button]:text-[#bc3e3a] [&_details>div_button:hover]:bg-surface-soft [&_details>div_form]:border-t [&_details>div_form]:border-line [&_details>div_form]:pt-1" aria-label="Navigasi dashboard seluler">
        {primaryNavigation.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={isActive(pathname, href) ? "bg-watched-mint! text-[#071019]!" : undefined} aria-current={isActive(pathname, href) ? "page" : undefined}>
            <Icon size={19} /><span>{label}</span>
          </Link>
        ))}
        <details>
          <summary aria-label="Buka menu lainnya"><MoreIcon size={19} /><span>Lainnya</span></summary>
          <div>
            <Link href="/dashboard/extension"><ExtensionIcon size={18} /> Extension</Link>
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
