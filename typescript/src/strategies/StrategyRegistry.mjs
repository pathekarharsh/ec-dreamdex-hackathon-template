export class StrategyRegistry {
  constructor() {
    this.strategies = new Map();
  }

  register(strategy) {
    if (!strategy.name) throw new Error("Strategy must have a name");
    this.strategies.set(strategy.name, strategy);
    console.log(`[strategy-registry] Registered strategy: ${strategy.name}`);
    return this;
  }

  unregister(name) {
    return this.strategies.delete(name);
  }

  get(name) {
    return this.strategies.get(name);
  }

  list() {
    return Array.from(this.strategies.values()).map((s) => ({
      name: s.name,
      enabled: s.enabled !== false,
      type: s.constructor.name,
    }));
  }

  async evaluateSignal(signal) {
    const decisions = [];
    for (const [name, strategy] of this.strategies.entries()) {
      if (strategy.enabled === false) continue;
      try {
        const decision = await strategy.onSignal(signal);
        decisions.push({
          strategyName: name,
          ...decision,
        });
      } catch (err) {
        console.warn(`[strategy-registry] Strategy ${name} error evaluating signal: ${err.message}`);
      }
    }
    return decisions;
  }
}
