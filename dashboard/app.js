const state = {
  status: null,
  records: [],
  trades: [],
  decisions: [],
  performance: null,
  strategies: [],
  isRunning: false,
  ledgerTab: "trades", // "trades" | "decisions"
  wallet: null,
  provider: null,
};

const SOMNIA_CHAIN_ID = "0xc498";
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

function setWalletFeedback(message, kind = "running") {
  const banner = $("#action-feedback");
  if (!banner) return;
  banner.style.display = "block";
  banner.className = `feedback-banner ${kind}`;
  banner.textContent = message;
}

function renderWallet(address, chainId = SOMNIA_CHAIN_ID) {
  state.wallet = address || null;
  const chip = $("#wallet-chip");
  const button = $("#btn-connect-wallet");
  if (!chip) return;
  if (!address) {
    chip.innerHTML = `<span class="wallet-dot"></span><b>Wallet not connected</b><small>Connect MetaMask or Rabby</small>`;
    if (button) button.textContent = "Connect wallet";
    return;
  }
  const chainOk = chainId?.toLowerCase() === SOMNIA_CHAIN_ID;
  chip.innerHTML = `<span class="wallet-dot"></span><b>${shortAddr(address)}</b><small>${chainOk ? "Somnia Shannon" : "Wrong network"}</small>`;
  if (button) button.textContent = chainOk ? "Wallet connected" : "Switch to Somnia";
}

  function getWalletProvider() {
  const injected = window.ethereum;
  if (!injected) return null;
  const providers = Array.isArray(injected.providers) ? injected.providers : [injected];
  return providers.find((provider) => provider.isMetaMask || provider.isRabby) || providers[0];
  }

  async function connectWallet() {
  const provider = getWalletProvider();
  if (!provider) {
  setWalletFeedback("No wallet extension detected. Install MetaMask or Rabby, then reload this page.", "error");
  return;
  }
  try {
  state.provider = provider;
    const accounts = await state.provider.request({ method: "eth_requestAccounts" });
    let chainId = await state.provider.request({ method: "eth_chainId" });
    if (chainId.toLowerCase() !== SOMNIA_CHAIN_ID) {
      try {
        await state.provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SOMNIA_CHAIN_ID }] });
        chainId = await state.provider.request({ method: "eth_chainId" });
      } catch (switchError) {
        if (switchError?.code === 4902) {
          await state.provider.request({ method: "wallet_addEthereumChain", params: [{ chainId: SOMNIA_CHAIN_ID, chainName: "Somnia Shannon", nativeCurrency: { name: "Somnia Testnet Token", symbol: "STT", decimals: 18 }, rpcUrls: ["https://dream-rpc.somnia.network"], blockExplorerUrls: ["https://shannon-explorer.somnia.network"] }] });
          chainId = SOMNIA_CHAIN_ID;
        } else throw switchError;
      }
    }
    renderWallet(accounts[0], chainId);
    state.provider.on?.("accountsChanged", (nextAccounts) => {
      if (nextAccounts?.[0]) renderWallet(nextAccounts[0], chainId);
      else disconnectWallet();
    });
    state.provider.on?.("chainChanged", (nextChainId) => renderWallet(state.wallet, nextChainId));
    setWalletFeedback("Wallet connected. Review and sign transactions only when the app requests them.", "success");
  } catch (error) {
    setWalletFeedback(error?.message || "Wallet connection was rejected.", "error");
  }
}

function disconnectWallet() {
  state.wallet = null;
  state.provider = null;
  renderWallet(null);
}

function renderUI(data) {
  if (!data) return;
  state.status = data;
  state.records = data.records || [];
  state.trades = data.trades || [];
  state.decisions = data.decisions || [];
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
  if (walletChip && state.wallet) {
    walletChip.innerHTML = `<span class="wallet-dot"></span><b>${shortAddr(state.wallet)}</b><small>${data.sttBalance || "0"} STT · ${data.usdcBalance || "0"} tUSDC</small>`;
  }

  // 2. Pulse Card
  const pulseStrong = $(".pulse-card strong");
  const pulseSmall = $(".pulse-card small");
  if (pulseStrong && pulseSmall) {
    const isLive = data.mode === "LIVE ON-CHAIN" || !data.dryRun;
    pulseStrong.textContent = isLive ? "LIVE & ARMED" : "DRY RUN";
    pulseStrong.style.color = isLive ? "var(--mint)" : "var(--amber)";
    const asset = data.market?.asset || "BTC";
    pulseSmall.textContent = `Targeting ${asset} 60m Window`;
  }

  // 3. Telemetry Row
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
    if (metricRiskSub) {
      const isTripped = data.risk?.tripped;
      metricRiskSub.textContent = isTripped ? "⚠️ Circuit Breaker Tripped" : `Min confidence · Max ${data.risk?.maxPositionSize || 10} contracts`;
      metricRiskSub.style.color = isTripped ? "#ff5252" : "";
    }
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

  // 4. Performance Stat Cards
  renderPerformanceMetrics(data.performance, data.risk);

  // 5. Trades & Decisions Ledger
  renderTradesLedger();

  // 6. Strategy Leaderboard
  renderStrategyLeaderboard(data.performance?.strategyBreakdown, data.strategies);

  // 7. Latest Signal (Groq AI)
  renderLatestSignal(data.records);

  // 8. Activity Stream
  renderActivityList(data.records);

  // 9. Details
  const dl = $("#protection-details");
  if (dl) {
    dl.innerHTML = `
      <div><dt>Somnia Wallet</dt><dd><a href="https://shannon-explorer.somnia.network/address/${data.wallet}" target="_blank" class="link">${shortAddr(data.wallet)} ↗</a></dd></div>
      <div><dt>Active Pool</dt><dd><a href="https://shannon-explorer.somnia.network/address/${data.market?.pool}" target="_blank" class="link">${shortAddr(data.market?.pool)} ↗</a></dd></div>
      <div><dt>AI Reasoning</dt><dd>${data.ai?.provider || "Groq"} (${data.ai?.model || "gpt-oss-120b"})</dd></div>
      <div><dt>News Feed</dt><dd>${data.news?.provider || "NewsAPI.org"}</dd></div>
      <div><dt>Database Engine</dt><dd>${data.database?.connected ? "Neon Postgres (shared agent ledger)" : "Neon database not configured"}</dd></div>
      <div><dt>Risk Circuit Breaker</dt><dd style="color:${data.risk?.tripped ? '#ff5252' : 'var(--mint)'}">${data.risk?.tripped ? 'TRIPPED (Click Reset)' : 'ACTIVE & NORMAL'}</dd></div>
      <div><dt>Execution Mode</dt><dd style="color:var(--mint)">LIVE ON-CHAIN (Somnia Shannon 50312)</dd></div>
    `;
  }

  const lastSync = $("#last-sync-time");
  if (lastSync) lastSync.textContent = `Last sync — ${new Date().toLocaleTimeString()}`;
}

function renderPerformanceMetrics(perf = {}, risk = {}) {
  const valWinrate = $("#val-winrate");
  const valWinsLosses = $("#val-wins-losses");
  if (valWinrate) valWinrate.textContent = `${perf.winRate || 0}%`;
  if (valWinsLosses) {
    valWinsLosses.textContent = `${(perf.wonCount || 0) + (perf.redeemedCount || 0)} Won · ${perf.lostCount || 0} Lost`;
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
    valRiskCap.textContent = `$${risk.dailyLossUsd || 0} / $${risk.dailyLossCapUsd || 50}`;
  }

  const badgeTotal = $("#trades-total-badge");
  if (badgeTotal) {
    badgeTotal.textContent = `${perf.totalTrades || 0} TRADES`;
  }
}

function switchLedgerTab(tab) {
  state.ledgerTab = tab;
  const btnTrades = $("#tab-trades");
  const btnDecisions = $("#tab-decisions");

  if (btnTrades && btnDecisions) {
    if (tab === "trades") {
      btnTrades.className = "btn-action btn-primary";
      btnDecisions.className = "btn-action";
    } else {
      btnTrades.className = "btn-action";
      btnDecisions.className = "btn-action btn-primary";
    }
  }

  renderTradesLedger();
}

window.switchLedgerTab = switchLedgerTab;

function renderTradesLedger() {
  const tbody = $("#trades-ledger-body");
  const thead = $(".ledger-table thead tr");
  if (!tbody) return;

  if (state.ledgerTab === "decisions") {
    // Show AI Decisions & Risk Log
    if (thead) {
      thead.innerHTML = `
        <th>ID</th>
        <th>TIME</th>
        <th>STRATEGY</th>
        <th>SIGNAL HEADLINE</th>
        <th>ACTION</th>
        <th>CONF</th>
        <th>RISK STATUS</th>
        <th>ON-CHAIN ORDER</th>
      `;
    }

    const decs = state.decisions || [];
    if (!decs.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--muted); padding:24px;">No AI trading decisions recorded yet. Click "Run Live Cycle Now"!</td></tr>`;
      return;
    }

    tbody.innerHTML = decs.map((d) => {
      const isBuyYes = d.action === "BUY_YES";
      const sideClass = isBuyYes ? "badge-side-yes" : "badge-side-no";
      const isApproved = d.risk_status === "approved" || d.trade_id;
      const riskBadge = isApproved
        ? `<span class="badge badge-won">● APPROVED</span>`
        : `<span class="badge badge-lost" title="${escapeHtml(d.risk_reason)}">▲ BLOCKED</span>`;
      
      const timeStr = d.timestamp ? new Date(d.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
      const stratName = (d.strategy_name || "NewsSentiment").replace("Strategy", "");

      let orderCell = "—";
      if (d.trade_id) {
        orderCell = `<span style="color:var(--mint)">Order #${d.trade_id} (${d.trade_status})</span>`;
      } else if (d.risk_reason) {
        orderCell = `<small style="color:var(--muted); font-size:10px;">${escapeHtml(d.risk_reason)}</small>`;
      }

      return `
        <tr>
          <td><strong>#${d.id}</strong></td>
          <td><small style="color:var(--muted)">${timeStr}</small></td>
          <td><span style="font-size:11px">${stratName}</span></td>
          <td><span style="color:#fff; font-size:11px;" title="${escapeHtml(d.title)}">${escapeHtml(d.title ? d.title.slice(0, 45) + '...' : 'Signal')}</span></td>
          <td><span class="badge ${sideClass}">${d.action}</span></td>
          <td>${Math.round((d.confidence || 0) * 100)}%</td>
          <td>${riskBadge}</td>
          <td>${orderCell}</td>
        </tr>
      `;
    }).join("");
    return;
  }

  // Show On-Chain Trades
  if (thead) {
    thead.innerHTML = `
      <th>ID</th>
      <th>PLACED</th>
      <th>STRATEGY</th>
      <th>SIDE</th>
      <th>PRICE</th>
      <th>QTY</th>
      <th>STATUS</th>
      <th>OUTCOME / PAYOUT</th>
      <th>ACTION</th>
    `;
  }

  const trades = state.trades || [];
  if (!trades.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; color:var(--muted); padding:28px;">
          No on-chain trades placed yet. Click "Run Live Cycle Now" to execute trades!
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
  if (!state.wallet) {
    setWalletFeedback("Connect MetaMask or Rabby before requesting a live cycle.", "error");
    return;
  }
  if (!state.provider) {
    setWalletFeedback("Wallet provider unavailable. Reconnect your wallet.", "error");
    return;
  }
  const chainId = await state.provider.request({ method: "eth_chainId" });
  if (chainId.toLowerCase() !== SOMNIA_CHAIN_ID) {
    setWalletFeedback("Switch your wallet to Somnia Shannon before trading.", "error");
    return;
  }

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
        if (result.executedTrades > 0) {
          banner.className = "feedback-banner success";
          banner.innerHTML = `✅ <strong>Cycle Complete:</strong> Processed ${result.processed} signals. Executed <strong>${result.executedTrades}</strong> live trade(s) on Somnia!`;
        } else if (result.blockedReason) {
          banner.className = "feedback-banner running";
          banner.innerHTML = `🛡️ <strong>Risk Gate Intervened:</strong> Model evaluated signals, but order was blocked: <em>${escapeHtml(result.blockedReason)}</em>. (Click "Reset Risk Gates" if on cooldown).`;
        } else {
          banner.className = "feedback-banner running";
          banner.textContent = `Cycle complete: Analyzed ${result.processed} headlines. Model decided HOLD (neutral market sentiment).`;
        }
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
  }
}

async function resetRiskGates() {
  const btn = $("#btn-reset-risk");
  const banner = $("#action-feedback");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Resetting...`;
  }

  try {
    const res = await fetch("/api/risk-reset", { method: "POST" });
    const result = await res.json();
    if (banner) {
      banner.style.display = "block";
      banner.className = "feedback-banner success";
      banner.innerHTML = `🛡️ <strong>Risk Gates Reset:</strong> Market cooldowns and circuit breaker cleared. Ready for new live trades!`;
    }
    await fetchStatus();
  } catch (err) {
    if (banner) {
      banner.className = "feedback-banner error";
      banner.textContent = `Reset failed: ${err.message}`;
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `🛡️ Reset Risk Gates`;
    }
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
        banner.innerHTML = `💰 <strong>Trade #${tradeId} Claimed:</strong> Received <strong>+$${result.payoutAmount} tUSDC</strong>! <a href="${result.explorerUrl}" target="_blank" class="tx-link">View Tx ���</a>`;
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
  function initializeDashboard() {
  const connectBtn = $("#btn-connect-wallet");
  if (connectBtn && !connectBtn.dataset.bound) {
  connectBtn.dataset.bound = "true";
  connectBtn.addEventListener("click", connectWallet);
  }
  const provider = getWalletProvider();
  if (provider) {
  state.provider = provider;
  provider.request({ method: "eth_accounts" }).then(async (accounts) => {
  if (accounts?.[0]) renderWallet(accounts[0], await provider.request({ method: "eth_chainId" }));
  }).catch(() => {});
  }



  const runBtn = $("#btn-run-sentinel");
  if (runBtn) runBtn.addEventListener("click", runSentinelCycle);

  const resetRiskBtn = $("#btn-reset-risk");
  if (resetRiskBtn) resetRiskBtn.addEventListener("click", resetRiskGates);

  const claimAllBtn = $("#btn-claim-all");
  if (claimAllBtn) claimAllBtn.addEventListener("click", claimAllWinnings);

  const faucetBtn = $("#btn-faucet");
  if (faucetBtn) faucetBtn.addEventListener("click", claimFaucet);

  const refreshBtn = $("#btn-refresh");
  if (refreshBtn) refreshBtn.addEventListener("click", fetchStatus);

  const tabTrades = $("#tab-trades");
  if (tabTrades) tabTrades.addEventListener("click", () => switchLedgerTab("trades"));

  const tabDecisions = $("#tab-decisions");
  if (tabDecisions) tabDecisions.addEventListener("click", () => switchLedgerTab("decisions"));

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
  }

  if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initializeDashboard, { once: true });
  } else {
  initializeDashboard();
  }
