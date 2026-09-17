import { ImportIcon } from "@/components/icons";
import styles from "../dashboard.module.css";

export default function ImportPage() {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}><div><p className={styles.eyebrow}>NETFLIX HISTORY</p><h1>Import riwayat.</h1></div><p>Bawa tontonan lama ke satu arsip Reelmark.</p></header>
      <div className={styles.empty}><ImportIcon size={30} /><h2>Import CSV segera hadir</h2><p>Alur upload dan pemrosesan belum tersedia. Reelmark tidak akan meminta file sebelum validasi, pencocokan judul, dan penanganan duplikat siap digunakan dengan aman.</p></div>
    </div>
  );
}
