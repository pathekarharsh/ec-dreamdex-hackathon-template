import { claimer } from "../typescript/src/claimer.mjs";
import { resolutionWatcher } from "../typescript/src/resolutionWatcher.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.statusCode = 405;
    response.setHeader("Allow", "POST");
    return response.end("Method Not Allowed");
  }

  let body = {};
  try {
    const raw = await new Promise((resolve) => {
      let data = "";
      request.on("data", (chunk) => (data += chunk));
      request.on("end", () => resolve(data));
    });
    if (raw) {
      body = JSON.parse(raw);
    }
  } catch (err) {
    // defaults to body = {}
  }

  response.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    // First, run a resolution check so any freshly settled market updates to WON
    try {
      await resolutionWatcher.checkResolutions({ autoClaim: false });
    } catch (err) {
      console.warn("[api/claim] Resolution pre-check notice:", err.message);
    }

    if (body.tradeId) {
      const result = await claimer.claimWinnings({ tradeId: Number(body.tradeId) });
      response.statusCode = result.success ? 200 : 400;
      return response.end(JSON.stringify(result));
    }

    // Otherwise claim all won trades
    const result = await claimer.claimAllWonTrades();
    response.statusCode = 200;
    return response.end(JSON.stringify(result));
  } catch (error) {
    console.error("[api/claim] Error:", error);
    response.statusCode = 500;
    return response.end(JSON.stringify({ success: false, error: error.message }));
  }
}
