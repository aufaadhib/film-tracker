"use client";

import { type Theme, useTheme } from "@/components/theme-toggle";

const themes: Array<{ value: Theme; label: string; description: string }> = [
  { value: "light", label: "Terang", description: "Tampilan cerah untuk penggunaan pada siang hari." },
  { value: "dark", label: "Gelap", description: "Tampilan gelap untuk mengurangi silau pada malam hari." },
  { value: "system", label: "Sistem", description: "Mengikuti pengaturan tema dari sistem operasi." },
];

export function ThemePicker() {
  const [theme, setTheme] = useTheme();

  return (
    <section className="rounded-[17px] border border-line bg-surface p-[clamp(18px,3vw,28px)]" aria-labelledby="theme-heading">
      <header className="[&_p]:mb-2.5 [&_p]:font-mono [&_p]:text-[.5rem] [&_p]:font-bold [&_p]:tracking-[.12em] [&_p]:text-reel-blue [&_h2]:font-display [&_h2]:text-[clamp(1.35rem,4vw,1.75rem)] [&_h2]:tracking-[-.045em] [&_span]:mt-1.75 [&_span]:block [&_span]:max-w-175 [&_span]:text-[.72rem] [&_span]:leading-[1.55] [&_span]:text-muted">
        <p>TAMPILAN</p>
        <h2 id="theme-heading">Tema aplikasi</h2>
        <span>Pilih tema yang paling nyaman untuk mata. Pengaturan ini disimpan di browser dan berlaku langsung.</span>
      </header>
      <div className="mt-6 grid gap-3 min-[720px]:grid-cols-3" role="radiogroup" aria-labelledby="theme-heading">
        {themes.map((option) => (
          <button
            className={`grid min-w-0 cursor-pointer rounded-[13px] border border-line-strong bg-surface-soft p-3.5 text-left text-ink transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-reel-blue motion-reduce:transition-none [&_strong]:mt-3 [&_strong]:text-[.76rem] [&_small]:mt-1.75 [&_small]:text-[.62rem] [&_small]:leading-[1.45] [&_small]:text-muted min-[720px]:min-h-42 ${theme === option.value ? "border-watched-mint! shadow-[0_0_0_2px_color-mix(in_srgb,var(--watched-mint)_55%,transparent)]" : ""}`}
            key={option.value}
            type="button"
            role="radio"
            aria-checked={theme === option.value}
            onClick={() => setTheme(option.value)}
          >
            <span className={`relative block h-16.5 overflow-hidden rounded-lg border before:absolute before:inset-y-0 before:left-0 before:w-[14%] before:border-r before:border-[rgb(120_130_145/25%)] before:bg-[#e4e8ee] before:content-[''] [&_i]:absolute [&_i]:left-[20%] [&_i]:top-4.25 [&_i]:z-2 [&_i]:h-1.5 [&_i]:w-[72%] [&_i]:rounded-full [&_i]:bg-[#d8dce3] [&_b]:absolute [&_b]:left-[20%] [&_b]:z-2 [&_b]:h-1.5 [&_b]:rounded-full [&_b]:bg-[#d8dce3] [&_b:nth-of-type(1)]:top-7.5 [&_b:nth-of-type(1)]:w-[48%] [&_b:nth-of-type(2)]:top-10.75 [&_b:nth-of-type(2)]:w-[31%] ${
              option.value === "light" ? "border-[#c8ced8] bg-white" : option.value === "dark" ? "border-[#303947] bg-[#11161e] before:border-[#303947] before:bg-[#090d13] [&_i]:bg-[#303641] [&_b]:bg-[#303641]" : "bg-white after:absolute after:inset-0 after:z-1 after:bg-[#11161e] after:[clip-path:polygon(62%_0,100%_0,100%_100%,38%_100%)] after:content-['']"
            }`} aria-hidden="true">
              <i /><b /><b />
            </span>
            <strong>{option.label}</strong>
            <small>{option.description}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
