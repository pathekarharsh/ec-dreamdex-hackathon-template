const actions = new Set(["BUY_YES", "BUY_NO", "HOLD"]);

export function parseReasoning(raw) {
  const cleaned = String(raw).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  let parsed;
  try { parsed = JSON.parse(cleaned); } catch (error) { throw new Error(`reasoning JSON parse failed: ${error.message}`); }
  if (typeof parsed.confidence === "number" && parsed.confidence > 1 && parsed.confidence <= 100) {
    parsed.confidence = parsed.confidence / 100;
  }
  if (Array.isArray(parsed.keyEvidence)) {
    parsed.keyEvidence = parsed.keyEvidence.join("; ");
  } else if (typeof parsed.keyEvidence !== "string") {
    parsed.keyEvidence = String(parsed.keyEvidence ?? "");
  }
  if (typeof parsed.reasoning !== "string") {
    parsed.reasoning = String(parsed.reasoning ?? "");
  }
  if (!actions.has(parsed.action)) throw new Error("reasoning action must be BUY_YES, BUY_NO, or HOLD");
  if (typeof parsed.confidence !== "number" || parsed.confidence < 0 || parsed.confidence > 1) throw new Error("reasoning confidence must be a number from 0 to 1");
  return parsed;
}

export function buildPrompt(headline, context = "") {
  return `Return ONLY JSON with keys action, confidence, reasoning, keyEvidence. action must be BUY_YES, BUY_NO, or HOLD. confidence must be 0..1. Headline: ${headline}. Context: ${context}`;
}
