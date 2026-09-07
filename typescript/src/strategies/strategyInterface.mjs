/**
 * Base Strategy Interface
 * 
 * Every trading strategy in Sentinel Reactive implements this contract.
 * Strategies produce decisions (BUY_YES, BUY_NO, HOLD) given market signals.
 * All decisions MUST pass through Sentinel's deterministic RiskManager before execution.
 */
export class Strategy {
  constructor(name = "UnnamedStrategy") {
    this.name = name;
    this.enabled = true;
  }

  /**
   * @param {Object} signal
   * @param {string} signal.marketId
   * @param {string} signal.source - e.g. "news", "on-chain-reactivity", "custom"
   * @param {any} signal.payload - Raw signal data (headline, pool event, etc.)
   * @returns {Promise<{ action: "BUY_YES" | "BUY_NO" | "HOLD", confidence: number, reasoning: string, keyEvidence?: string }>}
   */
  async onSignal(signal) {
    throw new Error(`Method onSignal() not implemented on strategy ${this.name}`);
  }
}
