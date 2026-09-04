import { config as loadEnv } from "dotenv";
loadEnv({ path: new URL("../../.env", import.meta.url) });

const number = (key, fallback) => Number(process.env[key] ?? fallback);
const bool = (key, fallback) => (process.env[key] ?? String(fallback)).toLowerCase() === "true";

export const sentinelConfig = {
  dryRun: bool("DRY_RUN", true),
  minConfidence: number("MIN_CONFIDENCE", 0.72),
  cooldownMs: number("COOLDOWN_MS", 15 * 60 * 1000),
  dailyLossCapUsd: number("DAILY_LOSS_CAP_USD", 25),
  maxPositionSize: number("MAX_POSITION_SIZE", 10),
  pollIntervalMs: number("NEWS_POLL_INTERVAL_MS", 60_000),
  newsQuery: process.env.NEWS_QUERY || "crypto market prediction",
  marketId: process.env.MARKET_ID || "",
  pool: process.env.MARKET_POOL || "",
  rpcUrl: process.env.RPC_URL || "https://dream-rpc.somnia.network",
  wsRpcUrl: process.env.WS_RPC_URL || "wss://api.infra.testnet.somnia.network/ws",
};

export function printConfig() {
  console.table({ ...sentinelConfig, privateKey: process.env.PRIVATE_KEY ? "configured" : "missing" });
}

if (import.meta.url === `file://${process.argv[1]}`) printConfig();
