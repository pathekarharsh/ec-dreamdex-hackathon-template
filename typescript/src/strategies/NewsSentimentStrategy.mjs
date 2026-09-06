import { Strategy } from "./strategyInterface.mjs";
import { ReasoningCore } from "../reasoner.mjs";

export class NewsSentimentStrategy extends Strategy {
  constructor(name = "NewsSentimentStrategy", { reasoner = null } = {}) {
    super(name);
    this.reasoner = reasoner || new ReasoningCore();
  }

  async onSignal(signal) {
    if (signal.source !== "news") {
      return {
        action: "HOLD",
        confidence: 0,
        reasoning: `Signal source '${signal.source}' not targeted by ${this.name}`,
      };
    }

    const headline = signal.payload;
    if (!headline || !headline.title) {
      return {
        action: "HOLD",
        confidence: 0,
        reasoning: "Invalid or empty headline payload",
      };
    }

    const decision = await this.reasoner.decide(headline);
    return {
      action: decision.action,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      keyEvidence: decision.keyEvidence,
    };
  }
}
