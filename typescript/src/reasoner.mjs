import { buildPrompt, parseReasoning } from "./reasoning.mjs";

export class ReasoningCore {
  constructor({
    endpoint = process.env.LLM_ENDPOINT,
    apiKey = process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY,
    model = process.env.LLM_MODEL || process.env.GROQ_MODEL,
  } = {}) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.isGroq = Boolean(process.env.GROQ_API_KEY || apiKey?.startsWith("gsk_"));
    this.isAnthropic = Boolean(process.env.ANTHROPIC_API_KEY || apiKey?.startsWith("sk-ant-"));
    this.model = model || (this.isGroq ? "openai/gpt-oss-120b" : (this.isAnthropic ? "claude-3-5-sonnet-20241022" : "gpt-4o-mini"));
  }

  evaluateHeuristically(title = "") {
    const text = title.toLowerCase();
    const bullishPattern = /\b(soar|soars|surge|surges|breakthrough|rally|rallies|partnership|faster|upgrade|upgrades|approved|bullish|inflows|inflow|adoption|ath|high)\b/i;
    const bearishPattern = /\b(crash|crashes|drop|drops|plunge|plunges|hack|hacks|hacked|exploit|exploited|\bsec\b|ban|bans|banned|lawsuit|bearish|outflow|outflows|fraud|halt|halts|halted|down)\b/i;

    const isBull = bullishPattern.test(text);
    const isBear = bearishPattern.test(text);

    if (isBull && !isBear) {
      return { action: "BUY_YES", confidence: 0.85, reasoning: "Positive directional signal detected from keyword sentiment analysis.", keyEvidence: `Bullish indicators found in: "${title}"` };
    }
    if (isBear && !isBull) {
      return { action: "BUY_NO", confidence: 0.82, reasoning: "Negative directional risk detected from keyword sentiment analysis.", keyEvidence: `Bearish indicators found in: "${title}"` };
    }
    return { action: "HOLD", confidence: 0.45, reasoning: "Neutral or conflicting market indicators; maintaining risk-averse hold.", keyEvidence: "No clear directional breakout detected" };
  }

  async decide(signal, context = "") {
    // If no LLM credentials configured, use deterministic financial heuristic fallback
    if (!this.apiKey && !this.endpoint) {
      return this.evaluateHeuristically(signal?.title || "");
    }

    try {
      if (this.isGroq) {
        const url = this.endpoint || "https://api.groq.com/openai/v1/chat/completions";
        const candidateModels = [this.model, "openai/gpt-oss-120b", "openai/gpt-oss-20b"].filter(Boolean);
        let lastErr;

        for (const m of candidateModels) {
          try {
            const response = await fetch(url, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                authorization: `Bearer ${this.apiKey}`,
              },
              body: JSON.stringify({
                model: m,
                max_tokens: 500,
                messages: [
                  {
                    role: "system",
                    content: "You are a financial prediction market analyst for DreamDEX on Somnia. Return strictly a JSON object with keys: action (\"BUY_YES\"|\"BUY_NO\"|\"HOLD\"), confidence (number between 0.0 and 1.0), reasoning (string explanation), keyEvidence (string).",
                  },
                  { role: "user", content: buildPrompt(signal.title, context) },
                ],
                response_format: { type: "json_object" },
                temperature: 0.1,
              }),
            });
            if (response.ok) {
              const data = await response.json();
              return parseReasoning(data.choices?.[0]?.message?.content ?? "");
            }
            lastErr = new Error(`Groq model ${m} returned ${response.status}`);
          } catch (e) {
            lastErr = e;
          }
        }
        throw lastErr || new Error("All Groq model candidates failed");
      }

      if (this.isAnthropic) {
        const url = this.endpoint || "https://api.anthropic.com/v1/messages";
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": this.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: this.model,
            max_tokens: 500,
            messages: [{ role: "user", content: buildPrompt(signal.title, context) }],
          }),
        });
        if (!response.ok) throw new Error(`Anthropic returned ${response.status}: ${await response.text()}`);
        const data = await response.json();
        return parseReasoning(data.content?.[0]?.text ?? "");
      }

      const url = this.endpoint || "https://api.openai.com/v1/chat/completions";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: buildPrompt(signal.title, context) }],
        }),
      });
      if (!response.ok) throw new Error(`LLM provider returned ${response.status}: ${await response.text()}`);
      const data = await response.json();
      return parseReasoning(data.choices?.[0]?.message?.content ?? data.text ?? "");
    } catch (error) {
      console.warn(`[reasoner] Live LLM call failed (${error.message}); utilizing deterministic heuristic fallback.`);
      return this.evaluateHeuristically(signal?.title || "");
    }
  }
}


