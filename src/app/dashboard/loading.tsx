import styles from "./dashboard.module.css";

export default function DashboardLoading() {
  return (
    <div className={styles.loadingPage} aria-label="Memuat dashboard" aria-busy="true">
      <span />
      <span />
      <div><i /><i /><i /><i /></div>
      <section><i /><i /><i /></section>
    </div>
  );
}
