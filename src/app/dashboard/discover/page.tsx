import { CatalogSearch } from "@/components/catalog-search";
import styles from "../dashboard.module.css";

export default function DiscoverPage() {
  return <div className={styles.page}><header className={styles.pageHeader}><div><p className={styles.eyebrow}>TMDB CATALOG</p><h1>Temukan satu judul.</h1></div><p>Cari film atau serial, lalu tambahkan langsung ke riwayat pribadimu.</p></header><CatalogSearch /></div>;
}
