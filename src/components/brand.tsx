import Link from "next/link";
import styles from "./brand.module.css";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={styles.brand} href="/" aria-label="Reelmark — Beranda">
      <span className={styles.mark} aria-hidden="true"><i /><i /><i /></span>
      {!compact && <strong>reelmark</strong>}
    </Link>
  );
}
