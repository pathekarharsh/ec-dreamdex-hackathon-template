import { buildPrompt, parseReasoning } from "./reasoning.mjs";

export class ReasoningCore {
  constructor({ endpoint = process.env.LLM_ENDPOINT, apiKey = process.env.LLM_API_KEY, model = process.env.LLM_MODEL || "claude-sonnet-4-5" } = {}) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.model = model;
  }

  async decide(signal, context = "") {
    if (!this.endpoint) return { action: "HOLD", confidence: 0, reasoning: "No reasoning endpoint configured", keyEvidence: "LLM_ENDPOINT is missing" };
    const response = await fetch(this.endpoint, { method: "POST", headers: { "content-type": "application/json", ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}) }, body: JSON.stringify({ model: this.model, prompt: buildPrompt(signal.title, context), signal }) });
    if (!response.ok) throw new Error(`reasoning provider returned ${response.status}`);
    const payload = await response.json();
    return parseReasoning(payload.text ?? payload.output_text ?? payload.content ?? payload);
  }
}
