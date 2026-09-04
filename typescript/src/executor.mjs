import { loadMarketConfig } from "./market.mjs";
import { sentinelConfig } from "./config.mjs";

export class ExecutionLayer {
  constructor({ dryRun = sentinelConfig.dryRun, market = loadMarketConfig() } = {}) { this.dryRun = dryRun; this.market = market; }

  async execute(decision, { quantity = 1, limitPrice = undefined } = {}) {
    if (!this.market.valid) return { executed: false, status: "blocked", reason: this.market.errors.join("; ") };
    if (decision.action === "HOLD") return { executed: false, status: "held", reason: decision.reasoning || "model selected HOLD" };
    const order = { marketId: this.market.config.marketId, side: decision.action === "BUY_YES" ? "YES" : "NO", quantity, limitPrice };
    if (this.dryRun) return { executed: false, status: "dry-run", order, reason: "DRY_RUN is enabled" };
    throw new Error("Live execution adapter is intentionally gated until the SDK contract method and market status are verified on Shannon.");
  }
}
