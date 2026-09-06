const state = {
  status: null,
  records: [],
  trades: [],
  performance: null,
  strategies: [],
  isRunning: false,
};

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));

function shortAddr(addr) {
  if (!addr || addr.length < 10) return addr || "—";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function shortTx(tx) {
  if (!tx || tx.length < 12) return tx || "—";
  return `${tx.slice(0, 8)}...${tx.slice(-6)}`;
}

function renderUI(data) {
  if (!data) return;
  state.status = data;
  state.records = data.records || [];
  state.trades = data.trades || [];
  state.performance = data.performance || {};
  state.strategies = data.strategies || [];

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

  // 3. Core Telemetry Row
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

  // 4. MODULE 15: Performance Stat Cards
  renderPerformanceMetrics(data.performance);

  // 5. MODULE 13 & 14: Trades & Settlement Ledger Table
  renderTradesLedger(data.trades);

  // 6. MODULE 16: Strategy Leaderboard
  renderStrategyLeaderboard(data.performance?.strategyBreakdown, data.strategies);

  // 7. Signal Room (Groq AI)
  renderLatestSignal(data.records);

  // 8. Activity Feed (On-Chain Stream)
  renderActivityList(data.records);

  // 9. Telemetry details
  const dl = $("#protection-details");
  if (dl) {
    dl.innerHTML = `
      <div><dt>Somnia Wallet</dt><dd><a href="https://shannon-explorer.somnia.network/address/${data.wallet}" target="_blank" class="link">${shortAddr(data.wallet)} ↗</a></dd></div>
      <div><dt>Active Pool</dt><dd><a href="https://shannon-explorer.somnia.network/address/${data.market?.pool}" target="_blank" class="link">${shortAddr(data.market?.pool)} ↗</a></dd></div>
      <div><dt>AI Reasoning</dt><dd>${data.ai?.provider || "Groq"} (${data.ai?.model || "gpt-oss-120b"})</dd></div>
      <div><dt>News Intelligence</dt><dd>${data.news?.provider || "NewsAPI.org"}</dd></div>
      <div><dt>Database Engine</dt><dd>SQLite (data/sentinel.db via node:sqlite)</dd></div>
      <div><dt>Execution Mode</dt><dd style="color:var(--mint)">LIVE ON-CHAIN (Somnia Shannon 50312)</dd></div>
    `;
  }

  const lastSync = $("#last-sync-time");
  if (lastSync) lastSync.textContent = `Last sync — ${new Date().toLocaleTimeString()}`;
}

function renderPerformanceMetrics(perf = {}) {
  const valWinrate = $("#val-winrate");
  const valWinsLosses = $("#val-wins-losses");
  if (valWinrate) valWinrate.textContent = `${perf.winRate || 0}%`;
  if (valWinsLosses) {
    valWinsLosses.textContent = `${perf.wonCount || 0 + (perf.redeemedCount || 0)} Won · ${perf.lostCount || 0} Lost`;
  }

  const valPnl = $("#val-pnl");
  const valLargestWin = $("#val-largest-win");
  const perfPnlCard = $("#perf-pnl");
  const pnl = perf.netRealizedPnL || 0;
  if (valPnl) {
    valPnl.textContent = `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`;
  }
  if (perfPnlCard) {
    perfPnlCard.className = pnl >= 0 ? "perf-card pnl-positive" : "perf-card pnl-negative";
  }
  if (valLargestWin) {
    valLargestWin.textContent = `+$${perf.largestWin || 0}`;
  }

  const valClaimable = $("#val-claimable");
  const valUnclaimedCount = $("#val-unclaimed-count");
  if (valClaimable) {
    valClaimable.textContent = `$${(perf.claimableWinningsUsd || 0).toFixed(2)}`;
  }
  if (valUnclaimedCount) {
    valUnclaimedCount.textContent = `${perf.wonCount || 0} trade(s) ready to claim`;
  }

  const valRiskCap = $("#val-risk-cap");
  if (valRiskCap) {
    valRiskCap.textContent = `$0.00 / $${perf.dailyLossCapUsd || 25}`;
  }

  const badgeTotal = $("#trades-total-badge");
  if (badgeTotal) {
    badgeTotal.textContent = `${perf.totalTrades || 0} TRADES RECORDED`;
  }
}

function renderTradesLedger(trades = []) {
  const tbody = $("#trades-ledger-body");
  if (!tbody) return;

  if (!trades.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; color:var(--muted); padding:28px;">
          No trades placed yet. Click "Run Live Cycle Now" to execute trades!
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = trades.map((t) => {
    const isBuyYes = t.side === "BUY_YES";
    const sideClass = isBuyYes ? "badge-side-yes" : "badge-side-no";
    
    let statusBadge = "";
    if (t.status === "OPEN") {
      statusBadge = `<span class="badge badge-open">● OPEN</span>`;
    } else if (t.status === "WON") {
      statusBadge = `<span class="badge badge-won">🏆 WON</span>`;
    } else if (t.status === "LOST") {
      statusBadge = `<span class="badge badge-lost">✕ LOST</span>`;
    } else if (t.status === "REDEEMED") {
      statusBadge = `<span class="badge badge-redeemed">💎 REDEEMED</span>`;
    }

    let outcomePayout = "—";
    if (t.status === "REDEEMED") {
      const pnl = (t.payout_amount || 1.0) - (t.price || 0.5) * (t.quantity || 1);
      outcomePayout = `<span style="color:var(--mint)">+$${pnl.toFixed(2)} ($${t.payout_amount} payout)</span>`;
    } else if (t.status === "WON") {
      outcomePayout = `<span style="color:var(--mint)">Eligible for $${(t.quantity || 1).toFixed(2)}</span>`;
    } else if (t.status === "LOST") {
      const loss = (t.price || 0.5) * (t.quantity || 1);
      outcomePayout = `<span style="color:#ff8a80">-$${loss.toFixed(2)}</span>`;
    }

    let actionCell = "—";
    if (t.status === "WON") {
      actionCell = `<button class="btn-claim-row" onclick="claimSingleTrade(${t.id})" id="btn-claim-${t.id}">⚡ Claim Now</button>`;
    } else if (t.status === "REDEEMED" && t.redeem_tx_hash) {
      actionCell = `
        <a href="https://shannon-explorer.somnia.network/tx/${t.redeem_tx_hash}" target="_blank" class="tx-link-chip">
          Redeem: ${shortTx(t.redeem_tx_hash)} ↗
        </a>`;
    } else if (t.tx_hash) {
      actionCell = `
        <a href="https://shannon-explorer.somnia.network/tx/${t.tx_hash}" target="_blank" class="tx-link-chip">
          Tx: ${shortTx(t.tx_hash)} ↗
        </a>`;
    }

    const timeStr = t.placed_at ? new Date(t.placed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
    const stratName = (t.strategy_name || "NewsSentimentStrategy").replace("Strategy", "");

    return `
      <tr>
        <td><strong>#${t.id}</strong></td>
        <td><small style="color:var(--muted)">${timeStr}</small></td>
        <td><span style="font-size:11px">${stratName}</span></td>
        <td><span class="badge ${sideClass}">${t.side}</span></td>
        <td>$${Number(t.price || 0.5).toFixed(2)}</td>
        <td>${t.quantity || 1}</td>
        <td>${statusBadge}</td>
        <td>${outcomePayout}</td>
        <td>${actionCell}</td>
      </tr>
    `;
  }).join("");
}

function renderStrategyLeaderboard(strategyStats = [], registeredStrategies = []) {
  const list = $("#strategy-breakdown-list");
  if (!list) return;

  const statsMap = new Map();
  (strategyStats || []).forEach((s) => statsMap.set(s.name, s));

  const items = registeredStrategies.map((strat) => {
    const s = statsMap.get(strat.name) || {
      name: strat.name,
      totalTrades: 0,
      won: 0,
      lost: 0,
      open: 0,
      redeemed: 0,
      realizedPnL: 0,
      winRate: 0,
    };

    const isNews = strat.name.includes("News");
    const engineTag = isNews ? "Groq AI 120B" : "Somnia WebSocket Flow";

    return `
      <div class="strategy-item">
        <div>
          <div class="strategy-title">${escapeHtml(strat.name)}</div>
          <span class="strategy-tag">${engineTag}</span>
        </div>
        <div class="strategy-stats">
          <div>Win Rate: <strong>${s.winRate || 0}%</strong></div>
          <small style="color:var(--muted)">${s.totalTrades} trade(s) · P&L: +$${(s.realizedPnL || 0).toFixed(2)}</small>
        </div>
      </div>
    `;
  });

  list.innerHTML = items.join("");
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
        banner.innerHTML = `✅ <strong>Cycle Complete:</strong> Processed ${result.processed} signals. Executed <strong>${result.executedTrades}</strong> on-chain trade(s)!`;
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

async function claimAllWinnings() {
  const btn = $("#btn-claim-all");
  const banner = $("#action-feedback");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Claiming Payouts...`;
  }

  try {
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    const result = await res.json();

    if (banner) {
      banner.style.display = "block";
      if (result.processed > 0) {
        banner.className = "feedback-banner success";
        banner.innerHTML = `💰 <strong>Claiming Complete:</strong> Processed ${result.processed} trade(s). Redeemed <strong>+$${result.totalPayoutUsd} tUSDC</strong> on-chain!`;
      } else {
        banner.className = "feedback-banner running";
        banner.textContent = "No won trades pending redemption on-chain.";
      }
    }
    await fetchStatus();
  } catch (err) {
    if (banner) {
      banner.className = "feedback-banner error";
      banner.textContent = `Claim failed: ${err.message}`;
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `💰 Claim All Won Payouts`;
    }
  }
}

async function claimSingleTrade(tradeId) {
  const btn = $(`#btn-claim-${tradeId}`);
  const banner = $("#action-feedback");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Claiming...`;
  }

  try {
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeId }),
    });
    const result = await res.json();

    if (banner) {
      banner.style.display = "block";
      if (result.success) {
        banner.className = "feedback-banner success";
        banner.innerHTML = `💰 <strong>Trade #${tradeId} Claimed:</strong> Received <strong>+$${result.payoutAmount} tUSDC</strong>! <a href="${result.explorerUrl}" target="_blank" class="tx-link">View Tx ↗</a>`;
      } else {
        banner.className = "feedback-banner error";
        banner.textContent = `Claim notice: ${result.reason || "Unable to redeem on-chain"}`;
      }
    }
    await fetchStatus();
  } catch (err) {
    if (banner) {
      banner.className = "feedback-banner error";
      banner.textContent = `Claim error: ${err.message}`;
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `⚡ Claim Now`;
    }
  }
}

window.claimSingleTrade = claimSingleTrade;

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

  const claimAllBtn = $("#btn-claim-all");
  if (claimAllBtn) claimAllBtn.addEventListener("click", claimAllWinnings);

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
