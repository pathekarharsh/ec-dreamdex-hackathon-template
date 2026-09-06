import { tradeStore } from "./tradeStore.mjs";
import { ex } from "./client.mjs";
import { claimer } from "./claimer.mjs";

export class ResolutionWatcher {
  constructor({ claimerInstance = claimer, riskManager = null } = {}) {
    this.claimer = claimerInstance;
    this.riskManager = riskManager;
  }

  setRiskManager(riskManager) {
    this.riskManager = riskManager;
  }

  async checkResolutions({ autoClaim = true } = {}) {
    const openTrades = tradeStore.getOpenTrades();
    const results = {
      checked: openTrades.length,
      won: [],
      lost: [],
      unresolved: [],
      errors: [],
    };

    if (!openTrades.length) {
      return results;
    }

    const marketCache = new Map();

    for (const trade of openTrades) {
      try {
        let mo = marketCache.get(trade.market_id);
        if (!mo) {
          mo = await ex.client.getMarketOnchain(trade.market_id);
          marketCache.set(trade.market_id, mo);
        }

        const isSettled = Boolean(mo.finalized || mo.isResolved || mo.isVoided || mo.status === 4 || mo.status === 5);

        if (!isSettled) {
          results.unresolved.push(trade.id);
          continue;
        }

        const resolvedAt = new Date().toISOString();

        if (mo.isVoided || mo.status === 5) {
          console.log(`[resolutionWatcher] Trade #${trade.id} market was VOIDED — eligible for refund.`);
          tradeStore.updateTradeStatus(trade.id, {
            status: "WON",
            resolvedAt,
            payoutAmount: (trade.quantity || 1) * 0.5,
          });
          results.won.push(trade.id);

          if (autoClaim && this.claimer) {
            try {
              await this.claimer.claimWinnings({ tradeId: trade.id });
            } catch (err) {
              console.warn(`[resolutionWatcher] Auto-claim error for trade #${trade.id}: ${err.message}`);
            }
          }
          continue;
        }

        const winner = Number(mo.winningOutcome); // 0 = Up/BUY_YES, 1 = Down/BUY_NO
        const agentSideIdx = trade.side === "BUY_YES" ? 0 : 1;
        const isWin = agentSideIdx === winner;

        if (isWin) {
          console.log(`[resolutionWatcher] 🏆 Trade #${trade.id} (${trade.side}) WON on market ${trade.market_id.slice(0, 10)}...!`);
          tradeStore.updateTradeStatus(trade.id, {
            status: "WON",
            resolvedAt,
          });
          results.won.push(trade.id);

          if (autoClaim && this.claimer) {
            try {
              console.log(`[resolutionWatcher] Auto-claiming payout for winning trade #${trade.id}...`);
              await this.claimer.claimWinnings({ tradeId: trade.id });
            } catch (err) {
              console.warn(`[resolutionWatcher] Auto-claim failed for trade #${trade.id}: ${err.message}`);
            }
          }
        } else {
          console.log(`[resolutionWatcher] ❌ Trade #${trade.id} (${trade.side}) LOST on market ${trade.market_id.slice(0, 10)}...`);
          const cost = (trade.price || 0.5) * (trade.quantity || 1);
          tradeStore.updateTradeStatus(trade.id, {
            status: "LOST",
            resolvedAt,
            payoutAmount: 0,
          });
          results.lost.push(trade.id);

          if (this.riskManager && typeof this.riskManager.recordLoss === "function") {
            this.riskManager.recordLoss(cost);
          }
        }
      } catch (error) {
        results.errors.push({ tradeId: trade.id, error: error.message });
      }
    }

    return results;
  }
}

export const resolutionWatcher = new ResolutionWatcher();
