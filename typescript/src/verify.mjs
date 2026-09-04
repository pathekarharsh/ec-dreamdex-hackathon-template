import assert from "node:assert/strict";
import { RiskManager } from "./risk.mjs";
import { parseReasoning } from "./reasoning.mjs";
import { SentinelStore } from "./store.mjs";

const risk = new RiskManager({ minConfidence: 0.72, cooldownMs: 60_000, dailyLossCapUsd: 10, maxPositionSize: 5 });
assert.equal(risk.evaluate({ marketId: "m", confidence: 0.5, quantity: 1, action: "BUY_YES" }).approved, false);
assert.equal(risk.evaluate({ marketId: "m", confidence: 0.9, quantity: 1, action: "BUY_YES" }).approved, true);
risk.recordTrade("m");
assert.equal(risk.evaluate({ marketId: "m", confidence: 0.9, quantity: 1, action: "BUY_YES" }).approved, false);
assert.deepEqual(parseReasoning('{"action":"HOLD","confidence":0.4,"reasoning":"unclear","keyEvidence":"none"}').action, "HOLD");
const store = new SentinelStore(new URL("../../data/verify-log.json", import.meta.url));
await store.append({ source: "verification", action: "HOLD", executed: false });
assert.equal((await store.recent(1)).length, 1);
console.log("Sentinel verification checks passed: risk gates, JSON parsing, persistence.");
process.exit(0);
