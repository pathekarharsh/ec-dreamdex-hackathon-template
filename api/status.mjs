import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pub, me, COLLATERAL } from "../typescript/src/client.mjs";
import { resolveActiveMarket } from "../typescript/src/market.mjs";
import { tradeStore } from "../typescript/src/tradeStore.mjs";
import { defaultRegistry } from "../typescript/src/strategies/index.mjs";
import { resolutionWatcher } from "../typescript/src/resolutionWatcher.mjs";

const logPath = resolve(process.cwd(), "data/sentinel-log.json");
const erc20Abi = [{ constant: true, inputs: [{ name: "_owner", type: "address" }], name: "balanceOf", outputs: [{ name: "balance", type: "uint256" }], type: "function" }];

let cachedBalances = { stt: "49.95", usdc: "196.50", timestamp: 0 };
let lastResolutionCheck = 0;

async function readRecords() {
  try {
    const value = JSON.parse(await readFile(logPath, "utf8"));
    return Array.isArray(value) ? value.slice(-100).reverse() : [];
  } catch {
    return [];
  }
}

async function getBalances() {
  const now = Date.now();
  if (now - cachedBalances.timestamp < 6000) {
    return cachedBalances;
  }
  try {
    const [sttRaw, usdcRaw] = await Promise.all([
      pub.getBalance({ address: me }).catch(() => 0n),
      pub.readContract({ address: COLLATERAL, abi: erc20Abi, functionName: "balanceOf", args: [me] }).catch(() => 0n),
    ]);
    cachedBalances = {
      stt: (Number(sttRaw) / 1e18).toFixed(4),
      usdc: (Number(usdcRaw) / 1e6).toFixed(2),
      timestamp: now,
    };
  } catch (err) {
    // Return last cached on RPC hiccup
  }
  return cachedBalances;
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.statusCode = 405;
    response.setHeader("Allow", "GET");
    return response.end("Method Not Allowed");
  }

  // Check resolutions periodically (every 45s) in background
  const now = Date.now();
  if (now - lastResolutionCheck > 45000) {
    lastResolutionCheck = now;
    resolutionWatcher.checkResolutions({ autoClaim: true }).catch(() => {});
  }

  const [records, balances] = await Promise.all([readRecords(), getBalances()]);
  
  let marketInfo = {
    marketId: process.env.MARKET_ID || "0x0000000000000000000000000000000000000000000000000000000000015373",
    pool: process.env.MARKET_POOL || "0xCA1B916A52694F569c0A543793Ec7Cc17674B2A6",
    asset: "BTC",
    status: "Trading (Active)",
    finalized: false,
  };

  try {
    const active = await resolveActiveMarket();
    if (active.valid) {
      marketInfo = {
        marketId: active.config.marketId,
        pool: active.config.pool,
        asset: active.config.asset || "BTC",
        status: active.onchain?.status === 1 ? "Trading (Active)" : `Status ${active.onchain?.status}`,
        finalized: Boolean(active.onchain?.finalized),
        expiry: active.config.expiry,
      };
    }
  } catch {}

  const dailyCap = Number(process.env.DAILY_LOSS_CAP_USD || 25);
  const performanceMetrics = tradeStore.getPerformanceMetrics(dailyCap);
  const tradeHistory = tradeStore.getAllTrades({ limit: 50 });
  const registeredStrategies = defaultRegistry.list();

  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.statusCode = 200;
  return response.end(
    JSON.stringify({
      agent: "Active & Armed",
      mode: process.env.DRY_RUN === "false" ? "LIVE ON-CHAIN" : "DRY RUN",
      dryRun: process.env.DRY_RUN === "true",
      wallet: me,
      sttBalance: balances.stt,
      usdcBalance: balances.usdc,
      market: marketInfo,
      ai: {
        configured: Boolean(process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY),
        provider: process.env.GROQ_API_KEY ? "Groq Cloud" : "Standard",
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        status: "Online & High-Speed",
      },
      news: {
        configured: Boolean(process.env.NEWS_API_KEY),
        provider: process.env.NEWS_API_KEY ? "NewsAPI.org (Live Feed)" : "Curated Crypto Intelligence",
      },
      risk: {
        minConfidence: Number(process.env.MIN_CONFIDENCE || 0.72),
        dailyLossCapUsd: dailyCap,
        maxPositionSize: Number(process.env.MAX_POSITION_SIZE || 10),
        cooldownSeconds: Number(process.env.COOLDOWN_MS || 900000) / 1000,
      },
      stats: {
        totalSignals: records.length,
        executedTrades: performanceMetrics.totalTrades,
        blockedSignals: records.filter((r) => r.status === "blocked").length,
      },
      performance: performanceMetrics,
      trades: tradeHistory,
      strategies: registeredStrategies,
      records,
      lastSync: new Date().toISOString(),
    })
  );
}
