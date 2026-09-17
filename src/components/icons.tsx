type IconProps = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
});

export function HomeIcon({ size = 20, className }: IconProps) {
  return <svg {...base(size)} className={className}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></svg>;
}

export function SearchIcon({ size = 20, className }: IconProps) {
  return <svg {...base(size)} className={className}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>;
}

export function HistoryIcon({ size = 20, className }: IconProps) {
  return <svg {...base(size)} className={className}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>;
}

export function CollectionIcon({ size = 20, className }: IconProps) {
  return <svg {...base(size)} className={className}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m9 8 6 4-6 4V8Z"/></svg>;
}

export function SettingsIcon({ size = 20, className }: IconProps) {
  return <svg {...base(size)} className={className}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>;
}

export function FilmIcon({ size = 20, className }: IconProps) {
  return <svg {...base(size)} className={className}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M17 9h4M3 15h4M17 15h4"/></svg>;
}

export function CheckIcon({ size = 20, className }: IconProps) {
  return <svg {...base(size)} className={className}><path d="m5 12 4 4L19 6"/></svg>;
}

export function ExtensionIcon({ size = 20, className }: IconProps) {
  return <svg {...base(size)} className={className}><path d="M8 3h3v3a2 2 0 1 0 4 0V3h3a2 2 0 0 1 2 2v4h-3a2 2 0 1 0 0 4h3v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4h3a2 2 0 1 0 0-4H4V5a2 2 0 0 1 2-2h2Z"/></svg>;
}

export function ImportIcon({ size = 20, className }: IconProps) {
  return <svg {...base(size)} className={className}><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>;
}

export function MoreIcon({ size = 20, className }: IconProps) {
  return <svg {...base(size)} className={className}><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></svg>;
}

export function SunIcon({ size = 20, className }: IconProps) {
  return <svg {...base(size)} className={className}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg>;
}

export function LogoutIcon({ size = 20, className }: IconProps) {
  return <svg {...base(size)} className={className}><path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5"/><path d="M14 8l4 4-4 4M18 12H8"/></svg>;
}
