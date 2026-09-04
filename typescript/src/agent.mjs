import { sentinelConfig, printConfig } from "./config.mjs";
import { RiskManager } from "./risk.mjs";
import { SentinelStore } from "./store.mjs";
import { NewsAdapter } from "./news.mjs";

const store = new SentinelStore();
const risk = new RiskManager(sentinelConfig);
const news = new NewsAdapter({ query: sentinelConfig.newsQuery });

printConfig();
await store.load();
console.log("Sentinel Reactive is ready. Execution is dry-run by default.");
if (!process.env.NEWS_API_KEY) console.log("Signal adapter is idle: set NEWS_API_KEY to enable headline ingestion.");

export async function evaluateHeadline(headline, reasoning) {
  const decision = { headline, ...reasoning };
  const gate = risk.evaluate({ marketId: sentinelConfig.marketId, confidence: reasoning.confidence, quantity: sentinelConfig.maxPositionSize, action: reasoning.action });
  await store.append({ source: "news", ...decision, executed: false, risk: gate });
  if (gate.approved && !sentinelConfig.dryRun) console.log("Execution is approved but requires the SDK executor and a configured market.");
  return gate;
}

export async function ingestOnce() {
  const headlines = await news.fetchLatest();
  for (const headline of headlines) await store.append({ source: "news", ...headline, action: "HOLD", confidence: 0, executed: false, risk: { approved: false, reason: "reasoning provider not configured" } });
  return headlines;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { await ingestOnce(); console.log(`Stored recent signal batch. Records: ${(await store.recent()).length}`); } catch (error) { console.error(`[sentinel] ${error.message}`); }
  process.exit(0);
}
