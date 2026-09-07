# Sentinel Reactive — User-Defined Strategies Guide

Sentinel Reactive is designed as an extensible agent framework for Somnia and DreamDEX event contracts. Beyond the default LLM news reasoning, any developer can plug in custom quantitative or heuristic trading logic.

Every strategy produces decisions, but **no strategy can bypass Sentinel's deterministic Risk Manager** (minimum confidence thresholds, max position size, cooldowns, and daily loss circuit breakers).

---

## 1. The Strategy Interface

All strategies implement the `Strategy` base class:

```javascript
import { Strategy } from "./strategies/strategyInterface.mjs";

export class MyCustomStrategy extends Strategy {
  constructor(name = "MyCustomStrategy") {
    super(name);
  }

  /**
   * @param {Object} signal
   * @param {string} signal.marketId
   * @param {string} signal.source       // "news", "on-chain-reactivity", "custom"
   * @param {any} signal.payload          // Raw headline or on-chain event
   * @returns {Promise<{ action: "BUY_YES" | "BUY_NO" | "HOLD", confidence: number, reasoning: string, keyEvidence?: string }>}
   */
  async onSignal(signal) {
    // Return action ("BUY_YES" | "BUY_NO" | "HOLD") and confidence (0.0 to 1.0)
  }
}
```

---

## 2. Minimal Example in Under 20 Lines

Here is a ready-to-run mean-reversion strategy in under 20 lines:

```javascript
import { Strategy } from "./strategies/strategyInterface.mjs";

export class SimpleContrarianStrategy extends Strategy {
  constructor() {
    super("ContrarianStrategy");
  }

  async onSignal({ source, payload }) {
    if (source !== "news" || !payload?.title) return { action: "HOLD", confidence: 0, reasoning: "Neutral" };
    
    // Fade extreme fear or euphoria keywords
    const isExtremeFud = /crash|collapse|panic|bloodbath/i.test(payload.title);
    const isExtremeHype = /guaranteed|moon|astronomical|infinite/i.test(payload.title);

    if (isExtremeFud) {
      return { action: "BUY_YES", confidence: 0.76, reasoning: "Fading headline capitulation" };
    }
    if (isExtremeHype) {
      return { action: "BUY_NO", confidence: 0.76, reasoning: "Fading retail top euphoria" };
    }
    return { action: "HOLD", confidence: 0.5, reasoning: "No extreme sentiment detected" };
  }
}
```

---

## 3. Registering Your Strategy

Register your custom strategy in `typescript/src/strategies/index.mjs` or at runtime:

```javascript
import { defaultRegistry } from "./strategies/index.mjs";
import { SimpleContrarianStrategy } from "./myStrategy.mjs";

defaultRegistry.register(new SimpleContrarianStrategy());
```

---

## 4. Built-In Strategies

1. **`NewsSentimentStrategy`**:
   - Ingests live news feeds (NewsAPI.org).
   - Queries Groq AI (`openai/gpt-oss-120b`) for directional probability and evidence extraction.

2. **`ReactivityMomentumStrategy`**:
   - Ingests real-time Somnia WebSocket pool logs and trade fill events.
   - Computes rolling order flow skew and fill velocity across DreamDEX pools.

3. **Performance Tracking**:
   - Sentinel automatically attributes every trade to its origin strategy in SQLite (`data/sentinel.db`).
   - The dashboard visualizes Win Rates, Net P&L, and Trade counts on a per-strategy leaderboard.
