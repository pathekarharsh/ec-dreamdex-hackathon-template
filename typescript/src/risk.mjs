export class RiskManager {
  constructor({ minConfidence = 0.72, cooldownMs = 30000, dailyLossCapUsd = 50, maxPositionSize = 10 } = {}) {
    this.minConfidence = minConfidence;
    this.cooldownMs = cooldownMs;
    this.dailyLossCapUsd = dailyLossCapUsd;
    this.maxPositionSize = maxPositionSize;
    this.lastTradeByMarket = new Map();
    this.recentLosses = []; // { timestamp, amount }
    this.tripped = false;
  }

  getDailyLossUsd() {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.recentLosses = this.recentLosses.filter((l) => l.timestamp >= oneDayAgo);
    return this.recentLosses.reduce((sum, l) => sum + l.amount, 0);
  }

  evaluate({ marketId, confidence, quantity, estimatedLossUsd = 0, action }) {
    const reject = (reason) => ({ approved: false, reason, action });
    
    const currentDailyLoss = this.getDailyLossUsd();
    if (currentDailyLoss >= this.dailyLossCapUsd) {
      this.tripped = true;
      return reject(`daily loss cap circuit breaker is active ($${currentDailyLoss.toFixed(2)} / $${this.dailyLossCapUsd})`);
    } else {
      this.tripped = false;
    }

    if (!marketId) return reject("marketId is required");
    if (!["BUY_YES", "BUY_NO"].includes(action)) return reject("action is not executable");
    if (confidence < this.minConfidence) {
      return reject(`confidence ${(confidence * 100).toFixed(1)}% is below ${(this.minConfidence * 100).toFixed(0)}% threshold`);
    }
    if (quantity <= 0 || quantity > this.maxPositionSize) {
      return reject(`quantity must be between 0 and ${this.maxPositionSize}`);
    }

    const last = this.lastTradeByMarket.get(marketId);
    if (last && Date.now() - last < this.cooldownMs) {
      const remainingSec = Math.ceil((this.cooldownMs - (Date.now() - last)) / 1000);
      return reject(`market cooldown active (${remainingSec}s remaining)`);
    }

    if (currentDailyLoss + estimatedLossUsd > this.dailyLossCapUsd) {
      return reject("daily loss cap would be exceeded");
    }

    return { approved: true, reason: "all deterministic risk checks passed", action };
  }

  recordTrade(marketId) {
    this.lastTradeByMarket.set(marketId, Date.now());
  }

  recordLoss(lossUsd, timestamp = Date.now()) {
    if (lossUsd > 0) {
      this.recentLosses.push({ timestamp, amount: lossUsd });
      if (this.getDailyLossUsd() >= this.dailyLossCapUsd) {
        this.tripped = true;
      }
    }
  }

  reset() {
    this.recentLosses = [];
    this.tripped = false;
    this.lastTradeByMarket.clear();
    console.log("[risk] Risk manager state reset: circuit breaker cleared.");
  }
}
