import Image from "next/image";
import Link from "next/link";
import styles from "./brand.module.css";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={styles.brand} href="/" aria-label="Reelmark — Beranda">
      <Image className={styles.mark} src="/reelmark-mark.svg" width={34} height={34} alt="" aria-hidden="true" />
      {!compact && <strong>reelmark</strong>}
    </Link>
  );
}
