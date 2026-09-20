const providerLabels = {
  netflix: "Netflix",
  disney: "Disney+",
  prime_video: "Prime Video",
  max: "Max",
};

const pairForm = document.getElementById("pair-form");
const pairCode = document.getElementById("pair-code");
const pairMessage = document.getElementById("pair-message");
const connectionState = document.getElementById("connection-state");
const footerState = document.getElementById("footer-state");
const loginButton = document.getElementById("login-button");
const disconnectButton = document.getElementById("disconnect-button");
const retrySync = document.getElementById("retry-sync");
const manualRecovery = document.getElementById("manual-recovery");
const deviceName = `Chrome / Edge · ${navigator.platform || "Browser"}`;
let lastSummary = null;

function renderSummary(summary) {
  lastSummary = summary;
  const watched = summary?.watched ?? [];
  const recentWatched = summary?.recent ?? watched;
  const inProgress = summary?.inProgress ?? [];
  const connected = Boolean(summary?.connected);
  const completionThreshold = Number(summary?.completionThreshold) || 80;
  const pendingItems = watched.filter((item) => !item.syncedAt);
  const pendingSync = pendingItems.length;
  const firstSyncError = pendingItems.find((item) => item.syncError)?.syncError;
  document.getElementById("watched-count").textContent = String(watched.length).padStart(2, "0");
  document.getElementById("active-count").textContent = String(summary?.activeCount ?? 0).padStart(2, "0");
  document.getElementById("completion-copy").textContent = `Judul ditandai selesai saat posisi video mencapai ${completionThreshold}%.`;
  connectionState.textContent = connected ? "Terhubung" : "Belum terhubung";
  connectionState.classList.toggle("connected", connected);
  loginButton.hidden = connected;
  disconnectButton.hidden = !connected;
  retrySync.hidden = !connected || !pendingSync;
  retrySync.disabled = false;
  retrySync.textContent = "Coba lagi";
  manualRecovery.hidden = connected;
  pairMessage.textContent = connected
    ? pendingSync
      ? firstSyncError
        ? `${pendingSync} tontonan gagal disinkronkan. ${firstSyncError}`
        : `${pendingSync} tontonan selesai masih menunggu sinkronisasi.`
      : "Tontonan selesai akan disinkronkan otomatis."
    : "Masuk sekali untuk menyinkronkan tontonan ke akunmu.";
  footerState.textContent = connected
    ? "Terhubung ke akun Reelmark · antrean offline aktif."
    : "Data disimpan lokal sampai akun dihubungkan.";

  const progressList = document.getElementById("in-progress");
  progressList.replaceChildren(...(inProgress.length ? inProgress.slice(0, 4).map((item) => {
    const row = document.createElement("li");
    row.className = "progress-item";
    const heading = document.createElement("div");
    const title = document.createElement("strong");
    const percent = document.createElement("span");
    const provider = document.createElement("small");
    const meta = document.createElement("div");
    const progress = document.createElement("progress");
    title.textContent = item.title;
    percent.textContent = `${item.progress}%`;
    provider.textContent = `${providerLabels[item.provider] ?? item.provider} · posisi pemutaran`;
    progress.max = 100;
    progress.value = item.progress;
    progress.setAttribute("aria-label", `Posisi tontonan ${item.title}: ${item.progress}%`);
    heading.append(title, percent);
    meta.className = "progress-meta";
    meta.append(provider);
    if (item.active) {
      const active = document.createElement("span");
      active.className = "active-badge";
      active.textContent = "SEDANG DITONTON";
      meta.append(active);
    }
    row.append(heading, progress, meta);
    return row;
  }) : [Object.assign(document.createElement("li"), {
    className: "empty",
    textContent: "Belum ada riwayat progres.",
  })]));

  const recent = document.getElementById("recent");
  recent.replaceChildren(...(recentWatched.length ? recentWatched.slice(0, 3).map((item) => {
    const row = document.createElement("li");
    const title = document.createElement("strong");
    const provider = document.createElement("span");
    title.textContent = item.title;
    provider.textContent = item.syncedAt
      ? providerLabels[item.provider] ?? item.provider
      : `${providerLabels[item.provider] ?? item.provider} · ${item.syncError ? "gagal sinkron" : "menunggu sinkron"}`;
    provider.classList.toggle("pending", !item.syncedAt);
    row.append(title, provider);
    if (item.syncError) {
      const error = document.createElement("small");
      error.className = "sync-error";
      error.textContent = item.syncError;
      row.append(error);
    }
    return row;
  }) : [Object.assign(document.createElement("li"), {
    className: "empty",
    textContent: "Belum ada tontonan yang selesai.",
  })]));
}

function refreshSummary() {
  const pendingSync = (lastSummary?.watched ?? []).filter((item) => !item.syncedAt).length;
  if (pendingSync) {
    pairMessage.textContent = `Sedang menyinkronkan ${pendingSync} tontonan…`;
    retrySync.hidden = false;
    retrySync.disabled = true;
    retrySync.textContent = "Menyinkronkan…";
  }

  chrome.runtime.sendMessage({ type: "REFRESH_SUMMARY" }, (refreshed) => {
    if (chrome.runtime.lastError || refreshed?.error) {
      pairMessage.textContent = refreshed?.error ?? "Sinkronisasi gagal. Periksa koneksi lalu coba lagi.";
      retrySync.hidden = false;
      retrySync.disabled = false;
      retrySync.textContent = "Coba lagi";
      return;
    }
    renderSummary(refreshed);
  });
}

function loadSummary() {
  chrome.runtime.sendMessage({ type: "GET_SUMMARY" }, (summary) => {
    if (chrome.runtime.lastError || summary?.error) {
      pairMessage.textContent = "Service worker extension belum siap. Buka kembali popup.";
      return;
    }
    renderSummary(summary);
    refreshSummary();
  });
}

retrySync.addEventListener("click", refreshSummary);

loginButton.addEventListener("click", () => {
  loginButton.disabled = true;
  pairMessage.textContent = "Membuka login Google…";
  chrome.runtime.sendMessage({ type: "LOGIN", payload: { deviceName } }, (result) => {
    loginButton.disabled = false;
    if (chrome.runtime.lastError || !result?.ok) {
      pairMessage.textContent = result?.error ?? "Login belum berhasil. Pastikan Reelmark lokal sedang berjalan.";
      return;
    }
    loadSummary();
  });
});

disconnectButton.addEventListener("click", () => {
  disconnectButton.disabled = true;
  pairMessage.textContent = "Memutuskan akun…";
  chrome.runtime.sendMessage({ type: "DISCONNECT" }, (result) => {
    disconnectButton.disabled = false;
    if (chrome.runtime.lastError || !result?.ok) {
      pairMessage.textContent = result?.error ?? "Akun belum berhasil diputuskan.";
      return;
    }
    loadSummary();
  });
});

pairCode.addEventListener("input", () => {
  const normalized = pairCode.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 8);
  pairCode.value = normalized.length > 4 ? `${normalized.slice(0, 4)} ${normalized.slice(4)}` : normalized;
});

pairForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const button = pairForm.querySelector("button");
  button.disabled = true;
  pairMessage.textContent = "Menghubungkan…";

  chrome.runtime.sendMessage({
    type: "PAIR",
    payload: { code: pairCode.value, deviceName },
  }, (result) => {
    button.disabled = false;
    if (chrome.runtime.lastError || !result?.ok) {
      pairMessage.textContent = result?.error ?? "Pairing gagal. Pastikan dashboard lokal sedang berjalan.";
      return;
    }
    loadSummary();
  });
});

loadSummary();
