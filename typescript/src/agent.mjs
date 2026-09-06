import { sentinelConfig, printConfig } from "./config.mjs";
import { RiskManager } from "./risk.mjs";
import { SentinelStore } from "./store.mjs";
import { NewsAdapter } from "./news.mjs";
import { ExecutionLayer } from "./executor.mjs";
import { ReactiveEventBridge } from "./reactive.mjs";
import { tradeStore } from "./tradeStore.mjs";
import { resolutionWatcher } from "./resolutionWatcher.mjs";
import { defaultRegistry } from "./strategies/index.mjs";

const store = new SentinelStore();
const risk = new RiskManager(sentinelConfig);
const news = new NewsAdapter({ query: sentinelConfig.newsQuery });
const executor = new ExecutionLayer({ dryRun: sentinelConfig.dryRun });
const bridge = new ReactiveEventBridge({
  wsUrl: sentinelConfig.wsRpcUrl,
  marketId: sentinelConfig.marketId,
  pool: sentinelConfig.pool,
});

resolutionWatcher.setRiskManager(risk);

printConfig();
await store.load();
console.log(`Sentinel Reactive initialized. Execution mode: ${sentinelConfig.dryRun ? "DRY RUN (safe)" : "LIVE TRADING"}.`);
console.log(`Active strategies: ${defaultRegistry.list().map((s) => s.name).join(", ")}`);

bridge.on("connected", (data) => console.log(`[reactive] Somnia WebSocket stream connected: ${data.wsUrl}`));
bridge.on("block", (b) => console.log(`[reactive] Somnia block #${b.blockNumber}`));
bridge.on("error", (err) => console.warn(`[reactive] Stream warning: ${err?.message || err}`));
bridge.on("warn", (w) => console.warn(`[reactive] Stream notice: ${w?.message || w}`));
let lastPoolEventEvaluation = 0;
bridge.on("poolEvent", async (e) => {
  console.log(`[reactive-pool] Event detected on pool ${e.pool}`);
  store.append({
    source: "onchain-reactive",
    title: `Somnia Pool Event`,
    detail: `Live pool log detected on ${e.pool}`,
    txHash: e.txHash,
    status: "confirmed",
    tone: "cyan",
  });

  const now = Date.now();
  if (now - lastPoolEventEvaluation < 30000) {
    return;
  }
  lastPoolEventEvaluation = now;

  // Evaluate reactive strategies on pool event
  try {
    const signal = {
      marketId: sentinelConfig.marketId || "active-somnia-window",
      source: "on-chain-reactivity",
      payload: e,
    };
    const decisions = await defaultRegistry.evaluateSignal(signal);
    for (const d of decisions) {
      if (d.action !== "HOLD") {
        await handleStrategyDecision(d, signal, "Somnia On-Chain Flow");
      }
    }
  } catch (err) {
    console.warn(`[reactive-pool] Signal processing notice: ${err.message}`);
  }
});
bridge.connect();

async function handleStrategyDecision(reasoning, signal, signalTitle, url = null) {
  const gate = risk.evaluate({
    marketId: sentinelConfig.marketId || "active-somnia-window",
    confidence: reasoning.confidence,
    quantity: 1,
    action: reasoning.action,
  });

  const decisionId = tradeStore.recordDecision({
    timestamp: new Date().toISOString(),
    strategyName: reasoning.strategyName || "NewsSentimentStrategy",
    marketId: sentinelConfig.marketId,
    source: signal.source,
    title: signalTitle,
    action: reasoning.action,
    confidence: reasoning.confidence,
    reasoning: reasoning.reasoning,
    keyEvidence: reasoning.keyEvidence,
    riskStatus: gate.approved ? "approved" : "blocked",
    riskReason: gate.reason,
  });

  let executionResult = { executed: false, status: "held", reason: "Model decided HOLD or risk blocked" };
  if (gate.approved) {
    console.log(`[risk-gate] APPROVED (${reasoning.strategyName}): ${gate.reason}`);
    executionResult = await executor.execute(reasoning, { quantity: 1 });
    console.log(`[execution] Status=${executionResult.status}, Executed=${executionResult.executed}`);
    if (executionResult.txHash) {
      console.log(`[execution-tx] ${executionResult.explorerUrl || executionResult.txHash}`);
    }
    if (executionResult.executed) {
      risk.recordTrade(executionResult.order?.marketId || sentinelConfig.marketId);
      tradeStore.recordTrade({
        decisionId,
        strategyName: reasoning.strategyName || "NewsSentimentStrategy",
        marketId: executionResult.order?.marketId || sentinelConfig.marketId,
        pool: executionResult.order?.pool || sentinelConfig.pool,
        side: executionResult.order?.side || reasoning.action,
        price: executionResult.order?.limitPrice || reasoning.confidence || 0.72,
        quantity: executionResult.order?.quantity || 1,
        txHash: executionResult.txHash || null,
        orderId: executionResult.orderId ? String(executionResult.orderId) : null,
        placedAt: new Date().toISOString(),
        status: "OPEN",
      });
    }
  } else {
    console.log(`[risk-gate] BLOCKED (${reasoning.strategyName}): ${gate.reason}`);
  }

  const record = {
    source: signal.source,
    strategyName: reasoning.strategyName,
    title: signalTitle,
    url,
    action: reasoning.action,
    confidence: Math.round(reasoning.confidence * 100),
    reasoning: reasoning.reasoning,
    keyEvidence: reasoning.keyEvidence,
    status: gate.approved ? executionResult.status : "blocked",
    tone: gate.approved ? (executionResult.executed ? "mint" : "cyan") : (reasoning.action === "HOLD" ? "cyan" : "amber"),
    detail: gate.approved ? `Approved: ${executionResult.reason || executionResult.status}` : `Risk gate blocked: ${gate.reason}`,
    executed: executionResult.executed,
    execution: executionResult,
  };

  await store.append(record);
  return { reasoning, gate, execution: executionResult };
}

export async function processHeadline(headline) {
  console.log(`\n[signal] Ingesting: "${headline.title}"`);
  const signal = {
    marketId: sentinelConfig.marketId || "active-somnia-window",
    source: "news",
    payload: headline,
  };

  const decisions = await defaultRegistry.evaluateSignal(signal);
  const results = [];

  for (const decision of decisions) {
    if (decision.action !== "HOLD") {
      console.log(`[strategy:${decision.strategyName}] Action=${decision.action}, Confidence=${(decision.confidence * 100).toFixed(1)}%`);
      results.push(await handleStrategyDecision(decision, signal, headline.title, headline.url));
    } else {
      console.log(`[strategy:${decision.strategyName}] Decided HOLD`);
      tradeStore.recordDecision({
        timestamp: new Date().toISOString(),
        strategyName: decision.strategyName,
        marketId: sentinelConfig.marketId,
        source: "news",
        title: headline.title,
        action: "HOLD",
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        keyEvidence: decision.keyEvidence,
        riskStatus: "held",
        riskReason: "Strategy decided HOLD",
      });
    }
  }

  // Fallback if no strategy placed a non-hold trade
  if (!results.length && decisions.length) {
    results.push({
      reasoning: decisions[0],
      gate: { approved: false, reason: "Strategy decided HOLD" },
      execution: { executed: false, status: "held" },
    });
  }

  return results[0] || null;
}

export async function ingestOnce() {
  const headlines = await news.fetchLatest();
  const results = [];
  for (const headline of headlines) {
    const res = await processHeadline(headline);
    if (res) results.push(res);
    await new Promise((r) => setTimeout(r, 600));
  }

  // Perform resolution and auto-claim checks at the end of each cycle
  try {
    console.log("\n[watcher] Checking on-chain market resolutions & auto-claimable payouts...");
    const resSummary = await resolutionWatcher.checkResolutions({ autoClaim: true });
    if (resSummary.won.length || resSummary.lost.length) {
      console.log(`[watcher] Resolutions updated: ${resSummary.won.length} won, ${resSummary.lost.length} lost.`);
    }
  } catch (err) {
    console.warn(`[watcher] Resolution check warning: ${err.message}`);
  }

  return results;
}

export async function startLoop(intervalMs = sentinelConfig.pollIntervalMs) {
  console.log(`\n[daemon] Continuous monitoring started. Cycle interval: ${intervalMs / 1000}s`);
  let running = true;
  const shutdown = () => {
    console.log("\n[daemon] Graceful shutdown initiated...");
    running = false;
    bridge.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  while (running) {
    try {
      const results = await ingestOnce();
      console.log(`[daemon] Cycle complete. Processed ${results.length} signal(s).`);
    } catch (error) {
      console.error(`[daemon] Cycle error: ${error.message}`);
    }
    if (running) await new Promise((r) => setTimeout(r, intervalMs));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const isLoop = process.argv.includes("--loop") || process.argv.includes("-l");
  if (isLoop) {
    await startLoop();
  } else {
    try {
      const results = await ingestOnce();
      console.log(`\nProcessed ${results.length} signal(s). Total store records: ${(await store.recent()).length}`);
    } catch (error) {
      console.error(`[sentinel] Pipeline error: ${error.message}`);
    }
    bridge.close();
    process.exit(0);
  }
}
