import { sentinelConfig } from "./config.mjs";

const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export function loadMarketConfig(env = process.env) {
  const config = {
    marketId: env.MARKET_ID || "",
    pool: env.MARKET_POOL || "",
    marketType: env.MARKET_TYPE || "binary",
    yesTokenId: env.YES_TOKEN_ID || "",
    noTokenId: env.NO_TOKEN_ID || "",
    outcome: env.MARKET_OUTCOME || "",
    closeTime: env.MARKET_CLOSE_TIME || "",
    rpcUrl: env.RPC_URL || sentinelConfig.rpcUrl,
    wsRpcUrl: env.WS_RPC_URL || sentinelConfig.wsRpcUrl,
  };
  const errors = [];
  if (!config.marketId) errors.push("MARKET_ID is required");
  if (config.pool && !ADDRESS.test(config.pool)) errors.push("MARKET_POOL must be a 20-byte hex address");
  if (!['binary', 'spot', 'perp'].includes(config.marketType)) errors.push("MARKET_TYPE must be binary, spot, or perp");
  if (!config.yesTokenId && config.marketType === 'binary') errors.push("YES_TOKEN_ID is required for binary markets");
  if (!config.noTokenId && config.marketType === 'binary') errors.push("NO_TOKEN_ID is required for binary markets");
  return { config, valid: errors.length === 0, errors };
}

export function printMarketConfig() {
  const result = loadMarketConfig();
  console.table({ ...result.config, status: result.valid ? "ready" : "incomplete" });
  if (result.errors.length) console.warn(`Market configuration incomplete: ${result.errors.join('; ')}`);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) printMarketConfig();
