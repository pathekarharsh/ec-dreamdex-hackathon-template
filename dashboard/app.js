const state = {
  status: null,
  records: [],
  isRunning: false,
};

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));

function shortAddr(addr) {
  if (!addr || addr.length < 10) return addr || "—";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function renderUI(data) {
  if (!data) return;
  state.status = data;
  state.records = data.records || [];

  // 1. Topbar Chips
  const statusChip = $("#status-chip");
  if (statusChip) {
    const isLive = data.mode === "LIVE ON-CHAIN" || !data.dryRun;
    statusChip.className = isLive ? "status-chip live" : "status-chip dry";
    statusChip.innerHTML = `<i></i><b>${isLive ? "LIVE EXECUTION" : "DRY RUN"}</b><small>${isLive ? "Somnia Shannon 50312" : "Simulated Safe Mode"}</small>`;
  }

  const walletChip = $("#wallet-chip");
  if (walletChip && data.wallet) {
    walletChip.innerHTML = `<span class="wallet-dot"></span><b>${shortAddr(data.wallet)}</b><small>${data.sttBalance || "0"} STT · ${data.usdcBalance || "0"} tUSDC</small>`;
  }

  // 2. Pulse Card (Agent Radar)
  const pulseStrong = $(".pulse-card strong");
  const pulseSmall = $(".pulse-card small");
  if (pulseStrong && pulseSmall) {
    const isLive = data.mode === "LIVE ON-CHAIN" || !data.dryRun;
    pulseStrong.textContent = isLive ? "LIVE & ARMED" : "DRY RUN";
    pulseStrong.style.color = isLive ? "var(--mint)" : "var(--amber)";
    const asset = data.market?.asset || "BTC";
    pulseSmall.textContent = `Targeting ${asset} 60m Window`;
  }

  // 3. Metrics Row
  const metricState = $("#metric-state strong");
  const metricStateSub = $("#metric-state span");
  if (metricState) {
    metricState.textContent = data.agent || "Live Trading";
    if (metricStateSub) metricStateSub.textContent = data.dryRun ? "● Dry-run protected" : "● Live on Somnia Testnet";
  }

  const metricRisk = $("#metric-risk strong");
  const metricRiskSub = $("#metric-risk span");
  if (metricRisk) {
    metricRisk.textContent = `${Math.round((data.risk?.minConfidence || 0.72) * 100)}%`;
    if (metricRiskSub) metricRiskSub.textContent = `Min confidence · Max ${data.risk?.maxPositionSize || 10} contracts`;
  }

  const metricBalance = $("#metric-balance strong");
  const metricBalanceSub = $("#metric-balance span");
  if (metricBalance) {
    metricBalance.textContent = `${data.usdcBalance || "0.00"} tUSDC`;
    if (metricBalanceSub) metricBalanceSub.textContent = `Gas: ${data.sttBalance || "0.00"} STT`;
  }

  const metricMarket = $("#metric-market strong");
  const metricMarketSub = $("#metric-market span");
  if (metricMarket) {
    metricMarket.textContent = `${data.market?.asset || "BTC"} Window`;
    if (metricMarketSub) metricMarketSub.textContent = data.market?.status || "Trading (Active)";
  }

  // 4. Signal Room (Latest Real AI Signal)
  renderLatestSignal(data.records);

  // 5. Activity Feed / Recent Trades Tape
  renderActivityList(data.records);

  // 6. Protection Layer / Configuration details
  const dl = $("#protection-details");
  if (dl) {
    dl.innerHTML = `
      <div><dt>Somnia Wallet</dt><dd><a href="https://shannon-explorer.somnia.network/address/${data.wallet}" target="_blank" class="link">${shortAddr(data.wallet)} ↗</a></dd></div>
      <div><dt>Active Pool</dt><dd><a href="https://shannon-explorer.somnia.network/address/${data.market?.pool}" target="_blank" class="link">${shortAddr(data.market?.pool)} ↗</a></dd></div>
      <div><dt>AI Reasoning</dt><dd>${data.ai?.provider || "Groq"} (${data.ai?.model || "gpt-oss-120b"})</dd></div>
      <div><dt>News Intelligence</dt><dd>${data.news?.provider || "NewsAPI.org"}</dd></div>
      <div><dt>Collateral Token</dt><dd>tUSDC (${data.usdcBalance || "0"} available)</dd></div>
    `;
  }

  const lastSync = $("#last-sync-time");
  if (lastSync) lastSync.textContent = `Last sync — ${new Date().toLocaleTimeString()}`;
}

function renderLatestSignal(records = []) {
  const signalRoom = $("#signal-content");
  if (!signalRoom) return;

  const latestSignal = records.find((r) => r.action && r.confidence) || records[0];
  if (!latestSignal) {
    signalRoom.innerHTML = `
      <div class="empty">
        <div class="hex">↯</div>
        <p>No signals ingested yet</p>
        <small>Click "Run Live Cycle Now" above to analyze the latest market news.</small>
      </div>`;
    return;
  }

  const isBuyYes = latestSignal.action === "BUY_YES";
  const isBuyNo = latestSignal.action === "BUY_NO";
  const actionColor = isBuyYes ? "var(--mint)" : (isBuyNo ? "#ff5252" : "var(--amber)");
  const isApproved = latestSignal.status !== "blocked" && latestSignal.action !== "HOLD";
  const hasTx = latestSignal.execution?.txHash || latestSignal.txHash;
  const txHash = hasTx || "";

  signalRoom.innerHTML = `
    <div class="signal-headline-box">
      <div class="signal-header-row">
        <span class="action-tag" style="background:${actionColor}22; color:${actionColor}; border:1px solid ${actionColor}66;">
          ${escapeHtml(latestSignal.action)}
        </span>
        <span class="conf-badge">Confidence: <strong>${latestSignal.confidence || 0}%</strong></span>
        <span class="risk-badge ${isApproved ? 'approved' : 'blocked'}">
          ${isApproved ? "● RISK GATE APPROVED" : "▲ RISK GATE BLOCKED"}
        </span>
        <time class="signal-time">${latestSignal.timestamp ? new Date(latestSignal.timestamp).toLocaleTimeString() : 'Recent'}</time>
      </div>
      <h4 class="signal-title">
        ${latestSignal.url ? `<a href="${latestSignal.url}" target="_blank" rel="noopener">${escapeHtml(latestSignal.title)} ↗</a>` : escapeHtml(latestSignal.title)}
      </h4>
      <div class="reasoning-box">
        <p><strong>Groq AI Reasoning:</strong> ${escapeHtml(latestSignal.reasoning || latestSignal.detail || "No reasoning available")}</p>
        ${latestSignal.keyEvidence ? `<p class="key-evidence"><strong>Key Evidence:</strong> ${escapeHtml(latestSignal.keyEvidence)}</p>` : ""}
      </div>
      ${hasTx ? `
        <div class="tx-badge-box">
          <span>⚡ On-chain Order:</span>
          <a href="https://shannon-explorer.somnia.network/tx/${txHash}" target="_blank" class="tx-link">
            ${txHash.slice(0, 14)}...${txHash.slice(-8)} ↗
          </a>
          ${latestSignal.execution?.orderId ? `<span class="order-id">OrderId: ${latestSignal.execution.orderId}</span>` : ""}
        </div>
      ` : `
        <div class="tx-status-note">Status: ${escapeHtml(latestSignal.detail || latestSignal.status)}</div>
      `}
    </div>
  `;
}

function renderActivityList(records = []) {
  const panel = $("#activity-list");
  if (!panel) return;

  const relevant = records.filter((r) => r.execution?.txHash || r.txHash || r.executed || r.action).slice(0, 8);
  if (!relevant.length) {
    panel.innerHTML = `
      <div class="empty">
        <div class="hex">↯</div>
        <p>No transactions yet</p>
        <small>Trades will appear here with clickable Explorer links.</small>
      </div>`;
    return;
  }

  panel.innerHTML = relevant.map((item) => {
    const tx = item.execution?.txHash || item.txHash;
    const isTrade = Boolean(tx || item.executed);
    const tone = item.tone || (item.status === "blocked" ? "amber" : (isTrade ? "mint" : "cyan"));
    const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "recent";
    
    return `
      <div class="activity-row">
        <span class="activity-dot ${tone}"></span>
        <div class="activity-body">
          <div class="activity-title">
            <strong>${escapeHtml(item.action || item.title || "Sentinel Event")}</strong>
            ${item.confidence ? `<span class="activity-conf">${item.confidence}%</span>` : ""}
          </div>
          <small class="activity-desc">${escapeHtml(item.title ? item.title.slice(0, 60) + "..." : item.detail)}</small>
          ${tx ? `
            <a href="https://shannon-explorer.somnia.network/tx/${tx}" target="_blank" class="tx-link-chip">
              Tx: ${tx.slice(0, 10)}...${tx.slice(-6)} ↗
            </a>
          ` : ""}
        </div>
        <time>${timeStr}</time>
      </div>
    `;
  }).join("");
}

async function fetchStatus() {
  try {
    const res = await fetch("/api/status", { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    renderUI(data);
  } catch (err) {
    console.warn("Status fetch warning:", err);
  }
}

async function runSentinelCycle() {
  const btn = $("#btn-run-sentinel");
  const banner = $("#action-feedback");
  if (state.isRunning) return;

  state.isRunning = true;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Running AI Pipeline...`;
  }
  if (banner) {
    banner.style.display = "block";
    banner.className = "feedback-banner running";
    banner.textContent = "Ingesting live news → Querying Groq AI → Evaluating risk gates → Executing on Somnia...";
  }

  try {
    const res = await fetch("/api/run-sentinel", { method: "POST" });
    const result = await res.json();

    if (result.success) {
      if (banner) {
        banner.className = "feedback-banner success";
        banner.innerHTML = `✅ <strong>Cycle Complete:</strong> Processed ${result.processed} headlines. Executed <strong>${result.executedTrades}</strong> on-chain trade(s)!`;
      }
    } else {
      if (banner) {
        banner.className = "feedback-banner error";
        banner.textContent = `Notice: ${result.error || "Execution completed with warnings"}`;
      }
    }
    await fetchStatus();
  } catch (err) {
    if (banner) {
      banner.className = "feedback-banner error";
      banner.textContent = `Error running cycle: ${err.message}`;
    }
  } finally {
    state.isRunning = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `⚡ Run Live Cycle Now`;
    }
    setTimeout(() => {
      if (banner && banner.className.includes("success")) banner.style.display = "none";
    }, 10000);
  }
}

async function claimFaucet() {
  const btn = $("#btn-faucet");
  const banner = $("#action-feedback");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Claiming Faucet...`;
  }

  try {
    const res = await fetch("/api/faucet", { method: "POST" });
    const result = await res.json();
    if (result.success) {
      if (banner) {
        banner.style.display = "block";
        banner.className = "feedback-banner success";
        banner.innerHTML = `💧 <strong>Faucet Success:</strong> Minted 100.00 tUSDC! <a href="${result.explorerUrl}" target="_blank" class="tx-link">View Tx ↗</a>`;
      }
      await fetchStatus();
    } else {
      alert(`Faucet error: ${result.error}`);
    }
  } catch (err) {
    alert(`Faucet request failed: ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `💧 Claim 100 tUSDC Faucet`;
    }
  }
}

// Attach event listeners
window.addEventListener("DOMContentLoaded", () => {
  const runBtn = $("#btn-run-sentinel");
  if (runBtn) runBtn.addEventListener("click", runSentinelCycle);

  const faucetBtn = $("#btn-faucet");
  if (faucetBtn) faucetBtn.addEventListener("click", claimFaucet);

  const refreshBtn = $("#btn-refresh");
  if (refreshBtn) refreshBtn.addEventListener("click", fetchStatus);

  fetchStatus();

  // SSE Live Event Stream
  if (window.EventSource) {
    const events = new EventSource("/api/events");
    events.addEventListener("snapshot", (e) => {
      try {
        const records = JSON.parse(e.data);
        if (state.status) {
          state.status.records = records;
          renderLatestSignal(records);
          renderActivityList(records);
        }
      } catch {}
    });
  }

  // Periodic status poll (every 10s)
  setInterval(fetchStatus, 10000);
});
