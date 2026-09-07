import { resolveActiveMarket, loadMarketConfig } from "./market.mjs";
import { sentinelConfig } from "./config.mjs";
import { ex, pub, me, COLLATERAL, ONE } from "./client.mjs";

const ACTIONS = new Map([
  ["BUY_YES", "BUY_YES"],
  ["BUY_NO", "BUY_NO"],
]);

const isPostOnlyRevert = (error) => /post.?only|would.?take|cross|maker/i.test(error?.shortMessage || error?.message || "");

const formatFills = (fills = []) =>
  (fills || []).map((f) => ({
    takerOrderId: f.takerOrderId ? String(f.takerOrderId) : undefined,
    makerOrderId: f.makerOrderId ? String(f.makerOrderId) : undefined,
    quantityFilled: f.quantityFilled ? Number(f.quantityFilled) / 1e6 : undefined,
    fillPrice: f.fillPrice ? Number(f.fillPrice) / 1e6 : undefined,
  }));

export class ExecutionLayer {
  constructor({ dryRun = sentinelConfig.dryRun } = {}) {
    this.dryRun = dryRun;
  }

  async execute(decision, { quantity = 1, limitPrice } = {}) {
    const activeMarket = await resolveActiveMarket();
    if (!activeMarket.valid) return { executed: false, status: "blocked", reason: activeMarket.errors.join("; ") };
    const marketConfig = activeMarket.config;

    const action = ACTIONS.get(decision?.action);
    if (!action) return { executed: false, status: "blocked", reason: "Unsupported execution action" };
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) return { executed: false, status: "blocked", reason: "Quantity must be a positive integer" };
    
    const targetPrice = limitPrice ?? decision?.confidence ?? 0.5;
    if (targetPrice <= 0 || targetPrice >= 1) return { executed: false, status: "blocked", reason: "Limit price must be between 0 and 1" };

    const order = { marketId: marketConfig.marketId, pool: marketConfig.pool, side: action, quantity, limitPrice: targetPrice };
    if (this.dryRun) return { executed: false, status: "dry-run", order, reason: "DRY_RUN is enabled (simulated trade)" };

    // 1. Confirm target market is actively trading on-chain
    try {
      const mo = activeMarket.onchain || (await ex.client.getMarketOnchain(marketConfig.marketId));
      if (mo.status !== 1 || mo.finalized) {
        return { executed: false, status: "market-closed", order, reason: `Market is not trading (status=${mo.status}, finalized=${mo.finalized})` };
      }
    } catch (err) {
      console.warn(`[executor] On-chain market verification warning: ${err.message}`);
    }

    // 2. Pre-flight collateral verification
    try {
      const erc20Abi = [{ constant: true, inputs: [{ name: "_owner", type: "address" }], name: "balanceOf", outputs: [{ name: "balance", type: "uint256" }], type: "function" }];
      const usdcRaw = await pub.readContract({ address: COLLATERAL, abi: erc20Abi, functionName: "balanceOf", args: [me] });
      if (usdcRaw === 0n) {
        return {
          executed: false,
          status: "awaiting-collateral",
          order,
          reason: "Wallet collateral balance is 0.00 tUSDC. Pending faucet confirmation.",
        };
      }
    } catch (err) {
      console.warn(`[executor] Collateral check warning: ${err.message}`);
    }

    // 3. Live order submission
    const price = BigInt(Math.round(targetPrice * 1_000_000));
    const sdkOrder = { pool: marketConfig.pool, side: action, price, quantity: BigInt(quantity) * ONE, orderType: 3 };

    try {
      console.log(`[executor] Submitting live PostOnly order on-chain: ${action} @ ${(targetPrice * 100).toFixed(1)}% (pool=${marketConfig.pool})...`);
      const result = await ex.trader.placeOrder(sdkOrder);
      const txHash = result?.hash || result?.transactionHash;
      const orderId = result?.orderId ? String(result.orderId) : undefined;
      console.log(`[executor] ✅ Order placed! Tx: ${txHash} OrderId: ${orderId || "n/a"}`);
      return {
        executed: true,
        status: "submitted",
        order,
        orderId,
        fills: formatFills(result?.fills),
        txHash,
        explorerUrl: txHash ? `https://shannon-explorer.somnia.network/tx/${txHash}` : undefined,
      };
    } catch (error) {
      if (!isPostOnlyRevert(error)) {
        console.warn(`[executor] Order submission failed: ${error?.shortMessage || error?.message}`);
        return { executed: false, status: "failed", order, reason: error?.shortMessage || error?.message || "Order submission failed" };
      }
      console.log("[executor] PostOnly would cross book; falling back to IOC (taker crossing)...");
      try {
        const result = await ex.trader.placeOrder({ ...sdkOrder, orderType: 2 });
        const txHash = result?.hash || result?.transactionHash;
        const orderId = result?.orderId ? String(result.orderId) : undefined;
        console.log(`[executor] ✅ IOC Order executed! Tx: ${txHash}`);
        return {
          executed: true,
          status: "submitted-ioc",
          order,
          orderId,
          fills: formatFills(result?.fills),
          txHash,
          explorerUrl: txHash ? `https://shannon-explorer.somnia.network/tx/${txHash}` : undefined,
        };
      } catch (retryError) {
        console.log("[executor] IOC fallback did not fill; attempting standard LIMIT order...");
        try {
          const result = await ex.trader.placeOrder({ ...sdkOrder, orderType: 0 });
          const txHash = result?.hash || result?.transactionHash;
          const orderId = result?.orderId ? String(result.orderId) : undefined;
          console.log(`[executor] ✅ Limit Order placed! Tx: ${txHash}`);
          return {
            executed: true,
            status: "submitted-limit",
            order,
            orderId,
            fills: formatFills(result?.fills),
            txHash,
            explorerUrl: txHash ? `https://shannon-explorer.somnia.network/tx/${txHash}` : undefined,
          };
        } catch (limitErr) {
          console.warn(`[executor] Order execution fallback exhausted: ${limitErr?.shortMessage || limitErr?.message}`);
          return { executed: false, status: "failed", order, reason: limitErr?.shortMessage || limitErr?.message || "All order types rejected" };
        }
      }
    }
  }
}

