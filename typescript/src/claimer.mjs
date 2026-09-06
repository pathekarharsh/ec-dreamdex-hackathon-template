import { ex, me } from "./client.mjs";
import { tradeStore } from "./tradeStore.mjs";

export class Claimer {
  async claimWinnings({ tradeId }) {
    const trade = tradeStore.getTrade(tradeId);
    if (!trade) {
      return { success: false, reason: `Trade #${tradeId} not found in store` };
    }

    if (trade.status === "REDEEMED" && trade.redeem_tx_hash) {
      return {
        success: true,
        alreadyRedeemed: true,
        txHash: trade.redeem_tx_hash,
        payoutAmount: trade.payout_amount,
      };
    }

    try {
      console.log(`[claimer] Fetching fresh on-chain market status for ${trade.market_id}...`);
      const mo = await ex.client.getMarketOnchain(trade.market_id);

      const isResolved = Boolean(mo.finalized || mo.isResolved || mo.isVoided || mo.status === 4 || mo.status === 5);
      if (!isResolved) {
        return {
          success: false,
          reason: `Market ${trade.market_id.slice(0, 10)}... is still trading or settling (status=${mo.status}). Not finalized yet.`,
        };
      }

      if (mo.isVoided || mo.status === 5) {
        // Voided market: both outcomes can redeem
        const outcomeIdx = trade.side === "BUY_YES" ? 0 : 1;
        const tokenId = outcomeIdx === 0 ? mo.yesId : mo.noId;
        const heldAmount = await ex.client.getOutcomeBalance({
          outcomeToken: mo.outcomeToken,
          account: me,
          id: BigInt(tokenId),
        });

        if (heldAmount === 0n) {
          return {
            success: false,
            reason: `Zero balance for outcome on voided market. May have already been refunded.`,
          };
        }

        console.log(`[claimer] Redeeming voided market tokens: ${Number(heldAmount) / 1e6} units...`);
        const r = await ex.trader.redeem({
          marketId: trade.market_id,
          outcomeIdx,
          amount: heldAmount,
          outcomeToken: mo.outcomeToken,
        });

        const txHash = r?.hash || r?.transactionHash;
        const payout = (Number(heldAmount) / 1e6) * 0.5; // voided refunds at 0.5

        tradeStore.updateTradeStatus(trade.id, {
          status: "REDEEMED",
          redeemTxHash: txHash,
          payoutAmount: payout,
          resolvedAt: trade.resolved_at || new Date().toISOString(),
        });

        return {
          success: true,
          txHash,
          payoutAmount: payout,
          explorerUrl: txHash ? `https://shannon-explorer.somnia.network/tx/${txHash}` : undefined,
        };
      }

      const winner = Number(mo.winningOutcome); // 0 = Up/BUY_YES, 1 = Down/BUY_NO
      const agentSideIdx = trade.side === "BUY_YES" ? 0 : 1;

      if (agentSideIdx !== winner) {
        tradeStore.updateTradeStatus(trade.id, {
          status: "LOST",
          resolvedAt: trade.resolved_at || new Date().toISOString(),
          payoutAmount: 0,
        });
        return {
          success: false,
          reason: `Market resolved in favor of ${winner === 0 ? "YES" : "NO"}, but trade was ${trade.side}.`,
        };
      }

      // Winning trade: query token balance
      const winningTokenId = winner === 0 ? mo.yesId : mo.noId;
      const heldAmount = await ex.client.getOutcomeBalance({
        outcomeToken: mo.outcomeToken,
        account: me,
        id: BigInt(winningTokenId),
      });

      if (heldAmount === 0n) {
        return {
          success: false,
          reason: `Wallet holds 0 outcome tokens for market ${trade.market_id.slice(0, 10)}... (already claimed or unfilled).`,
        };
      }

      console.log(`[claimer] 💰 Redeeming ${Number(heldAmount) / 1e6} winning outcome tokens on Somnia...`);
      const r = await ex.trader.redeem({
        marketId: trade.market_id,
        outcomeIdx: winner,
        amount: heldAmount,
        outcomeToken: mo.outcomeToken,
      });

      const txHash = r?.hash || r?.transactionHash;
      const payout = Number(heldAmount) / 1e6; // 1:1 payout in tUSDC collateral

      tradeStore.updateTradeStatus(trade.id, {
        status: "REDEEMED",
        redeemTxHash: txHash,
        payoutAmount: payout,
        resolvedAt: trade.resolved_at || new Date().toISOString(),
      });

      console.log(`[claimer] ✅ Payout claimed! Tx: ${txHash} ($${payout} tUSDC)`);
      return {
        success: true,
        txHash,
        payoutAmount: payout,
        explorerUrl: txHash ? `https://shannon-explorer.somnia.network/tx/${txHash}` : undefined,
      };
    } catch (error) {
      console.error(`[claimer] Redemption error for trade #${trade.id}:`, error);
      return { success: false, reason: error?.shortMessage || error?.message || "Redemption failed" };
    }
  }

  async claimAllWonTrades() {
    const claimable = tradeStore.getWonUnclaimedTrades();
    const results = [];
    let totalPayout = 0;

    for (const trade of claimable) {
      const res = await this.claimWinnings({ tradeId: trade.id });
      results.push({ tradeId: trade.id, ...res });
      if (res.success && res.payoutAmount) {
        totalPayout += res.payoutAmount;
      }
    }

    return {
      totalClaimable: claimable.length,
      processed: results.length,
      totalPayoutUsd: Number(totalPayout.toFixed(2)),
      results,
    };
  }
}

export const claimer = new Claimer();
