import { ingestOnce } from "../typescript/src/agent.mjs";

let isRunning = false;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.statusCode = 405;
    response.setHeader("Allow", "POST");
    return response.end(JSON.stringify({ error: "Method Not Allowed" }));
  }

  if (isRunning) {
    response.statusCode = 429;
    response.setHeader("Content-Type", "application/json");
    return response.end(JSON.stringify({ error: "A trading cycle is already in progress. Please wait..." }));
  }

  isRunning = true;
  response.setHeader("Content-Type", "application/json");

  try {
    console.log("[api] Triggering live Sentinel cycle from dashboard UI...");
    const results = await ingestOnce();
    const executed = results.filter((r) => r.execution?.executed);
    const blocked = results.filter((r) => !r.gate?.approved || (!r.execution?.executed && r.reasoning?.action !== "HOLD"));
    const blockedReasons = blocked.map((b) => b.gate?.reason || b.execution?.reason).filter(Boolean);

    response.statusCode = 200;
    return response.end(
      JSON.stringify({
        success: true,
        processed: results.length,
        executedTrades: executed.length,
        blockedTrades: blocked.length,
        blockedReason: blockedReasons[0] || null,
        trades: executed.map((e) => ({
          action: e.reasoning?.action,
          txHash: e.execution?.txHash,
          orderId: e.execution?.orderId,
          explorerUrl: e.execution?.explorerUrl,
        })),
      })
    );
  } catch (error) {
    console.error("[api] Run Sentinel failed:", error);
    response.statusCode = 500;
    return response.end(JSON.stringify({ error: error.message }));
  } finally {
    isRunning = false;
  }
}
