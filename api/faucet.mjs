import { ex, ONE } from "../typescript/src/client.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.statusCode = 405;
    response.setHeader("Allow", "POST");
    return response.end(JSON.stringify({ error: "Method Not Allowed" }));
  }

  response.setHeader("Content-Type", "application/json");
  try {
    console.log("[api] Triggering on-chain tUSDC faucet top-up...");
    const tx = await ex.trader.faucet({ amount: 100n * ONE });
    const hash = tx?.hash || tx;
    response.statusCode = 200;
    return response.end(
      JSON.stringify({
        success: true,
        amount: "100.00 tUSDC",
        txHash: hash,
        explorerUrl: `https://shannon-explorer.somnia.network/tx/${hash}`,
      })
    );
  } catch (error) {
    console.error("[api] Faucet failed:", error);
    response.statusCode = 500;
    return response.end(JSON.stringify({ error: error?.shortMessage || error.message }));
  }
}
