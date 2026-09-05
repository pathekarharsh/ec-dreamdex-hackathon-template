import { sentinelConfig, printConfig } from "./config.mjs";
import { RiskManager } from "./risk.mjs";
import { SentinelStore } from "./store.mjs";
import { NewsAdapter } from "./news.mjs";
import { ReasoningCore } from "./reasoner.mjs";
import { ExecutionLayer } from "./executor.mjs";
import { ReactiveEventBridge } from "./reactive.mjs";

const store = new SentinelStore();
const risk = new RiskManager(sentinelConfig);
const news = new NewsAdapter({ query: sentinelConfig.newsQuery });
const reasoner = new ReasoningCore();
const executor = new ExecutionLayer({ dryRun: sentinelConfig.dryRun });
const bridge = new ReactiveEventBridge({
  wsUrl: sentinelConfig.wsRpcUrl,
  marketId: sentinelConfig.marketId,
  pool: sentinelConfig.pool,
});

printConfig();
await store.load();
console.log(`Sentinel Reactive initialized. Execution mode: ${sentinelConfig.dryRun ? "DRY RUN (safe)" : "LIVE TRADING"}.`);

bridge.on("connected", (data) => console.log(`[reactive] Somnia WebSocket stream connected: ${data.wsUrl}`));
bridge.on("block", (b) => console.log(`[reactive] Somnia block #${b.blockNumber}`));
bridge.on("error", (err) => console.warn(`[reactive] Stream warning: ${err?.message || err}`));
bridge.on("warn", (w) => console.warn(`[reactive] Stream notice: ${w?.message || w}`));
bridge.on("poolEvent", (e) => {
  console.log(`[reactive-pool] Event detected on pool ${e.pool}`);
  store.append({
    source: "onchain-reactive",
    title: `Somnia Pool Event`,
    detail: `Live pool log detected on ${e.pool}`,
    txHash: e.txHash,
    status: "confirmed",
    tone: "cyan",
  });
});
bridge.connect();

export async function processHeadline(headline) {
  console.log(`\n[signal] Ingesting: "${headline.title}"`);
  const reasoning = await reasoner.decide(headline);
  console.log(`[reasoning] Action=${reasoning.action}, Confidence=${(reasoning.confidence * 100).toFixed(1)}%`);

  const gate = risk.evaluate({
    marketId: sentinelConfig.marketId || "active-somnia-window",
    confidence: reasoning.confidence,
    quantity: 1,
    action: reasoning.action,
  });

  let executionResult = { executed: false, status: "held", reason: "Model decided HOLD or risk blocked" };
  if (gate.approved) {
    console.log(`[risk-gate] APPROVED: ${gate.reason}`);
    executionResult = await executor.execute(reasoning, { quantity: 1 });
    console.log(`[execution] Status=${executionResult.status}, Executed=${executionResult.executed}`);
    if (executionResult.txHash) {
      console.log(`[execution-tx] ${executionResult.explorerUrl || executionResult.txHash}`);
    }
    if (executionResult.executed) {
      risk.recordTrade(executionResult.order?.marketId || sentinelConfig.marketId);
    }
  } else {
    console.log(`[risk-gate] BLOCKED: ${gate.reason}`);
  }

  const record = {
    source: "news",
    title: headline.title,
    url: headline.url,
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

export async function ingestOnce() {
  const headlines = await news.fetchLatest();
  const results = [];
  for (const headline of headlines) {
    results.push(await processHeadline(headline));
    await new Promise((r) => setTimeout(r, 600));
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


