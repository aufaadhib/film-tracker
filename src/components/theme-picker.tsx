"use client";

import { type Theme, useTheme } from "@/components/theme-toggle";
import styles from "./theme-picker.module.css";

const themes: Array<{ value: Theme; label: string; description: string }> = [
  { value: "light", label: "Terang", description: "Tampilan cerah untuk penggunaan pada siang hari." },
  { value: "dark", label: "Gelap", description: "Tampilan gelap untuk mengurangi silau pada malam hari." },
  { value: "system", label: "Sistem", description: "Mengikuti pengaturan tema dari sistem operasi." },
];

export function ThemePicker() {
  const [theme, setTheme] = useTheme();

  return (
    <section className={styles.panel} aria-labelledby="theme-heading">
      <header className={styles.header}>
        <p>TAMPILAN</p>
        <h2 id="theme-heading">Tema aplikasi</h2>
        <span>Pilih tema yang paling nyaman untuk mata. Pengaturan ini disimpan di browser dan berlaku langsung.</span>
      </header>
      <div className={styles.grid} role="radiogroup" aria-labelledby="theme-heading">
        {themes.map((option) => (
          <button
            className={`${styles.option} ${theme === option.value ? styles.active : ""}`}
            key={option.value}
            type="button"
            role="radio"
            aria-checked={theme === option.value}
            onClick={() => setTheme(option.value)}
          >
            <span className={`${styles.preview} ${styles[option.value]}`} aria-hidden="true">
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
