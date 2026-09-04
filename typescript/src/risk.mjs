export class RiskManager {
  constructor({ minConfidence = 0.72, cooldownMs = 900000, dailyLossCapUsd = 25, maxPositionSize = 10 } = {}) {
    this.minConfidence = minConfidence;
    this.cooldownMs = cooldownMs;
    this.dailyLossCapUsd = dailyLossCapUsd;
    this.maxPositionSize = maxPositionSize;
    this.lastTradeByMarket = new Map();
    this.dailyLossUsd = 0;
    this.tripped = false;
  }

  evaluate({ marketId, confidence, quantity, estimatedLossUsd = 0, action }) {
    const reject = (reason) => ({ approved: false, reason, action });
    if (this.tripped) return reject("daily loss cap circuit breaker is active");
    if (!marketId) return reject("marketId is required");
    if (!["BUY_YES", "BUY_NO"].includes(action)) return reject("action is not executable");
    if (confidence < this.minConfidence) return reject(`confidence ${confidence.toFixed(2)} is below ${this.minConfidence.toFixed(2)}`);
    if (quantity <= 0 || quantity > this.maxPositionSize) return reject(`quantity must be between 0 and ${this.maxPositionSize}`);
    const last = this.lastTradeByMarket.get(marketId);
    if (last && Date.now() - last < this.cooldownMs) return reject("market cooldown is active");
    if (this.dailyLossUsd + estimatedLossUsd > this.dailyLossCapUsd) return reject("daily loss cap would be exceeded");
    return { approved: true, reason: "all deterministic risk checks passed", action };
  }

  recordTrade(marketId) { this.lastTradeByMarket.set(marketId, Date.now()); }
  recordLoss(lossUsd) { this.dailyLossUsd += Math.max(0, lossUsd); if (this.dailyLossUsd >= this.dailyLossCapUsd) this.tripped = true; }
  reset() { this.dailyLossUsd = 0; this.tripped = false; this.lastTradeByMarket.clear(); }
}
