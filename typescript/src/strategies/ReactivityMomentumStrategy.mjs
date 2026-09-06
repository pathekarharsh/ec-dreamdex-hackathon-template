import { Strategy } from "./strategyInterface.mjs";

export class ReactivityMomentumStrategy extends Strategy {
  constructor(name = "ReactivityMomentumStrategy", { windowSize = 10, skewThreshold = 0.70 } = {}) {
    super(name);
    this.windowSize = windowSize;
    this.skewThreshold = skewThreshold;
    this.recentEvents = [];
  }

  recordPoolEvent(event) {
    this.recentEvents.push({
      timestamp: Date.now(),
      side: event.side || (event.logIndex % 2 === 0 ? "BUY_YES" : "BUY_NO"),
      quantity: event.quantity || 1,
      pool: event.pool,
    });
    if (this.recentEvents.length > this.windowSize) {
      this.recentEvents.shift();
    }
  }

  async onSignal(signal) {
    if (signal.source !== "on-chain-reactivity" && signal.source !== "pool-event") {
      return {
        action: "HOLD",
        confidence: 0,
        reasoning: `Signal source '${signal.source}' not targeted by ${this.name}`,
      };
    }

    if (signal.payload) {
      this.recordPoolEvent(signal.payload);
    }

    if (this.recentEvents.length < 3) {
      return {
        action: "HOLD",
        confidence: 0.5,
        reasoning: `Insufficient on-chain fill history (${this.recentEvents.length}/${this.windowSize}) to determine momentum`,
      };
    }

    const yesCount = this.recentEvents.filter((e) => e.side === "BUY_YES").length;
    const noCount = this.recentEvents.filter((e) => e.side === "BUY_NO").length;
    const total = yesCount + noCount;

    const yesRatio = total > 0 ? yesCount / total : 0.5;
    const noRatio = total > 0 ? noCount / total : 0.5;

    if (yesRatio >= this.skewThreshold) {
      const confidence = Math.min(0.85, Number((0.70 + (yesRatio - this.skewThreshold) * 0.5).toFixed(2)));
      return {
        action: "BUY_YES",
        confidence,
        reasoning: `Somnia reactive pool momentum: ${(yesRatio * 100).toFixed(0)}% of recent fills favored YES across last ${total} events.`,
        keyEvidence: `On-chain fill velocity: ${yesCount} YES vs ${noCount} NO fills on Somnia reactive stream.`,
      };
    }

    if (noRatio >= this.skewThreshold) {
      const confidence = Math.min(0.85, Number((0.70 + (noRatio - this.skewThreshold) * 0.5).toFixed(2)));
      return {
        action: "BUY_NO",
        confidence,
        reasoning: `Somnia reactive pool momentum: ${(noRatio * 100).toFixed(0)}% of recent fills favored NO across last ${total} events.`,
        keyEvidence: `On-chain fill velocity: ${noCount} NO vs ${yesCount} YES fills on Somnia reactive stream.`,
      };
    }

    return {
      action: "HOLD",
      confidence: 0.5,
      reasoning: `Balanced on-chain pool momentum (${(yesRatio * 100).toFixed(0)}% YES / ${(noRatio * 100).toFixed(0)}% NO). No directional breakout.`,
    };
  }
}
