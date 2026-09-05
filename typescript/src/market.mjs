import { sentinelConfig } from "./config.mjs";
import { pub, COLLATERAL, ex } from "./client.mjs";
import { marketCreatorEventsAbi } from "../node_modules/@somnia-chain/markets-sdk/dist/eventsAbi.js";

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

let cachedResolution = null;
let cacheTimestamp = 0;

export async function resolveActiveMarket() {
  const nowMs = Date.now();
  if (cachedResolution && nowMs - cacheTimestamp < 60000) {
    return cachedResolution;
  }

  const staticConf = loadMarketConfig();
  if (staticConf.valid) {
    try {
      const mo = await ex.client.getMarketOnchain(staticConf.config.marketId);
      if (mo.status === 1 && !mo.finalized) {
        cachedResolution = { config: staticConf.config, valid: true, errors: [], onchain: mo };
        cacheTimestamp = nowMs;
        return cachedResolution;
      }
      console.log(`[market] Statically configured market is closed/finalized (status=${mo.status}). Auto-discovering live active window...`);
    } catch {
      // Fall through to auto-discovery
    }
  }

  // Auto-discover live trading market from Somnia chain logs
  try {
    const mc = marketCreatorEventsAbi.find((e) => e.name === "MarketCreated");
    const now = Math.floor(Date.now() / 1000);
    const head = await pub.getBlockNumber();
    const found = [];

    for (let i = 0; i < 45; i++) {
      const to = head - BigInt(i * 1000);
      try {
        const logs = await pub.getLogs({ event: mc, fromBlock: to - 999n, toBlock: to });
        found.push(...logs.map((l) => l.args));
      } catch {}
    }

    const live = found
      .filter((m) => Number(m.expiry) > now + 60 && m.collateral?.toLowerCase() === COLLATERAL.toLowerCase())
      .sort((a, b) => Number(a.expiry) - Number(b.expiry));

    for (const m of live) {
      try {
        const mo = await ex.client.getMarketOnchain(m.marketId);
        if (mo.status === 1 && !mo.finalized) {
          const autoConfig = {
            marketId: m.marketId,
            pool: m.pool,
            marketType: "binary",
            yesTokenId: String(mo.yesId),
            noTokenId: String(mo.noId),
            asset: m.asset,
            expiry: Number(m.expiry),
            rpcUrl: sentinelConfig.rpcUrl,
            wsRpcUrl: sentinelConfig.wsRpcUrl,
          };
          cachedResolution = { config: autoConfig, valid: true, errors: [], onchain: mo };
          cacheTimestamp = nowMs;
          return cachedResolution;
        }
      } catch {}
    }
  } catch (err) {
    console.warn(`[market] Auto-discovery warning: ${err.message}`);
  }

  return staticConf;
}

export async function printMarketConfig() {
  const result = await resolveActiveMarket();
  console.table({ ...result.config, status: result.valid ? "ready" : "incomplete" });
  if (result.errors.length) console.warn(`Market configuration incomplete: ${result.errors.join('; ')}`);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await printMarketConfig();
  process.exit(0);
}

