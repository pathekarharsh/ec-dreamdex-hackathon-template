import { readEvents, hasDatabase } from "../lib/neon.mjs";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.statusCode = 405;
    response.setHeader("Allow", "GET");
    return response.end("Method Not Allowed");
  }

  let records = [];
  let databaseError = null;
  if (hasDatabase()) {
    try {
      records = await readEvents(100);
    } catch (error) {
      databaseError = "Database temporarily unavailable";
    }
  }

  const dryRun = process.env.DRY_RUN !== "false";
  const marketConfigured = Boolean(process.env.MARKET_ID && process.env.MARKET_POOL);
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.statusCode = 200;
  return response.end(JSON.stringify({
    agent: "Dashboard connected",
    mode: dryRun ? "DRY RUN" : "LIVE ON-CHAIN",
    dryRun,
    wallet: null,
    sttBalance: "—",
    usdcBalance: "—",
    market: { asset: process.env.MARKET_ASSET || "BTC", status: marketConfigured ? "Configured" : "Awaiting market configuration", finalized: false },
    ai: { configured: Boolean(process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY), provider: process.env.GROQ_API_KEY ? "Groq" : "Not configured", model: process.env.GROQ_MODEL || "—", status: "Dashboard only" },
    news: { configured: Boolean(process.env.NEWS_API_KEY), provider: process.env.NEWS_API_KEY ? "NewsAPI.org" : "Not configured" },
    database: { connected: hasDatabase() && !databaseError, error: databaseError },
    risk: { minConfidence: Number(process.env.MIN_CONFIDENCE || 0.72), dailyLossCapUsd: Number(process.env.DAILY_LOSS_CAP_USD || 50), maxPositionSize: Number(process.env.MAX_POSITION_SIZE || 10), tripped: false, dailyLossUsd: 0 },
    stats: { totalSignals: records.length, executedTrades: records.filter((record) => record.type === "trade").length, blockedSignals: records.filter((record) => record.status === "blocked").length },
    performance: { totalTrades: records.filter((record) => record.type === "trade").length, wonCount: 0, lostCount: 0, winRate: 0, netRealizedPnL: 0, claimableWinningsUsd: 0, strategyBreakdown: [] },
    trades: records.filter((record) => record.type === "trade"),
    decisions: records.filter((record) => record.type === "decision"),
    strategies: [],
    records,
    lastSync: new Date().toISOString(),
  }));
}
