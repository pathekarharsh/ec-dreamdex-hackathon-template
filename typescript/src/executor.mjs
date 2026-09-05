import { loadMarketConfig } from "./market.mjs";
import { sentinelConfig } from "./config.mjs";
import { ex, ONE } from "./client.mjs";

const ACTIONS = new Map([
  ["BUY_YES", "BUY_YES"],
  ["BUY_NO", "BUY_NO"],
]);

const isPostOnlyRevert = (error) => /post.?only|would.?take|cross|maker/i.test(error?.shortMessage || error?.message || "");

export class ExecutionLayer {
  constructor({ dryRun = sentinelConfig.dryRun, market = loadMarketConfig() } = {}) {
    this.dryRun = dryRun;
    this.market = market;
  }

  async execute(decision, { quantity = 1, limitPrice } = {}) {
    if (!this.market.valid) return { executed: false, status: "blocked", reason: this.market.errors.join("; ") };
    const action = ACTIONS.get(decision?.action);
    if (!action) return { executed: false, status: "blocked", reason: "Unsupported execution action" };
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) return { executed: false, status: "blocked", reason: "Quantity must be a positive integer" };
    if (limitPrice !== undefined && (!Number.isFinite(limitPrice) || limitPrice <= 0 || limitPrice >= 1)) return { executed: false, status: "blocked", reason: "Limit price must be between 0 and 1" };
    const order = { marketId: this.market.config.marketId, pool: this.market.config.pool, side: action, quantity, limitPrice };
    if (this.dryRun) return { executed: false, status: "dry-run", order, reason: "DRY_RUN is enabled" };

    const price = BigInt(Math.round((limitPrice ?? 0.5) * 1_000_000));
    const sdkOrder = { pool: this.market.config.pool, side: action, price, quantity: BigInt(quantity) * ONE, orderType: 3 };
    try {
      const result = await ex.trader.placeOrder(sdkOrder);
      return { executed: true, status: "submitted", order, orderId: result?.orderId, txHash: result?.hash || result?.transactionHash };
    } catch (error) {
      if (!isPostOnlyRevert(error)) return { executed: false, status: "failed", order, reason: error?.shortMessage || error?.message || "Order submission failed" };
      try {
        const result = await ex.trader.placeOrder({ ...sdkOrder, orderType: 1 });
        return { executed: true, status: "submitted-ioc", order, orderId: result?.orderId, txHash: result?.hash || result?.transactionHash };
      } catch (retryError) {
        return { executed: false, status: "failed", order, reason: retryError?.shortMessage || retryError?.message || "IOC fallback failed" };
      }
    }
  }
}
