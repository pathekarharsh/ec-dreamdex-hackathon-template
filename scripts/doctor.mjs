import { config as loadEnv } from "../typescript/node_modules/dotenv/lib/main.js";
import path from "node:path";
loadEnv({ path: path.join(process.cwd(), ".env") });

import { pub, me, COLLATERAL, ex } from "../typescript/src/client.mjs";
import { sentinelConfig } from "../typescript/src/config.mjs";
import { loadMarketConfig, resolveActiveMarket } from "../typescript/src/market.mjs";
import { ReasoningCore } from "../typescript/src/reasoner.mjs";
import { NewsAdapter } from "../typescript/src/news.mjs";
import { RiskManager } from "../typescript/src/risk.mjs";

console.log("\n========================================================");
console.log("       SENTINEL REACTIVE — SYSTEM HEALTH DOCTOR         ");
console.log("========================================================\n");

async function checkSystem() {
  const issues = [];
  const warnings = [];

  // 1. Environment & Wallet
  console.log("1. WALLET & CREDENTIALS");
  if (!process.env.PRIVATE_KEY) {
    issues.push("PRIVATE_KEY is missing in .env");
    console.log("  ❌ Private Key: Missing");
  } else {
    console.log(`  ✅ Private Key: Configured`);
    console.log(`  🔑 Derived Address: ${me}`);
  }

  // 2. Network & RPC
  console.log("\n2. SOMNIA SHANNON TESTNET (Chain 50312)");
  try {
    const blockNumber = await pub.getBlockNumber();
    console.log(`  ✅ RPC Connected: ${sentinelConfig.rpcUrl}`);
    console.log(`  📦 Current Block: #${blockNumber}`);
  } catch (error) {
    issues.push(`RPC Connection failed: ${error.message}`);
    console.log(`  ❌ RPC Connection: Failed (${error.message})`);
  }

  // 3. Balances
  console.log("\n3. BALANCES (Faucet: https://t.me/+XHq0F0JXMyhmMzM0)");
  let sttBalance = 0;
  let usdcBalance = 0;
  try {
    const sttRaw = await pub.getBalance({ address: me });
    sttBalance = Number(sttRaw) / 1e18;
    console.log(`  ${sttBalance > 0 ? "✅" : "⚠️"} Native STT (Gas): ${sttBalance.toFixed(4)} STT`);
    if (sttBalance === 0) warnings.push("STT balance is 0. You need STT to pay for gas.");

    const erc20Abi = [{ constant: true, inputs: [{ name: "_owner", type: "address" }], name: "balanceOf", outputs: [{ name: "balance", type: "uint256" }], type: "function" }];
    const usdcRaw = await pub.readContract({ address: COLLATERAL, abi: erc20Abi, functionName: "balanceOf", args: [me] });
    usdcBalance = Number(usdcRaw) / 1e6;
    console.log(`  ${usdcBalance > 0 ? "✅" : "⚠️"} Testnet tUSDC (Collateral): ${usdcBalance.toFixed(2)} tUSDC`);
    if (usdcBalance === 0) warnings.push("tUSDC balance is 0. Get tUSDC from faucet to place live trades.");
  } catch (error) {
    warnings.push(`Balance check failed: ${error.message}`);
    console.log(`  ❌ Balance query failed: ${error.message}`);
  }

  // 4. Market Readiness
  console.log("\n4. TARGET DREAMDEX EVENT CONTRACT");
  const marketCheck = await resolveActiveMarket();
  if (marketCheck.valid) {
    console.log(`  ✅ Market Active: ${marketCheck.config.marketId}`);
    console.log(`  🏛️  Pool Address: ${marketCheck.config.pool}`);
    console.log(`  🎯 Asset: ${marketCheck.config.asset || "BTC"}`);
    try {
      const mo = marketCheck.onchain || (await ex.client.getMarketOnchain(marketCheck.config.marketId));
      console.log(`  📊 On-chain Status: ${mo.status === 1 ? "1 (Trading / Active)" : mo.status} (Finalized: ${mo.finalized})`);
      if (mo.status !== 1) warnings.push("Configured market is not in active Trading state.");
    } catch (e) {
      warnings.push(`Could not query market on-chain: ${e.message}`);
    }
  } else {
    warnings.push(`Market incomplete: ${marketCheck.errors.join(", ")}`);
    console.log(`  ⚠️ Market config: ${marketCheck.errors.join("; ")}`);
  }

  // 5. Intelligence Feeds
  console.log("\n5. INTELLIGENCE & REASONING PIPELINE");
  if (process.env.NEWS_API_KEY) {
    console.log(`  ✅ News Provider: NewsAPI.org configured`);
  } else {
    console.log(`  ℹ️  News Provider: NewsAPI key not set — using built-in curated feed fallback`);
  }

  const reasoner = new ReasoningCore();
  if (reasoner.apiKey) {
    const providerName = reasoner.isGroq ? `Groq (${reasoner.model})` : (reasoner.isAnthropic ? "Anthropic Claude" : "OpenAI/Generic");
    console.log(`  ✅ LLM Engine: Live provider configured — ${providerName}`);
  } else {
    console.log(`  ℹ️  LLM Engine: No API key — using deterministic keyword sentiment heuristic`);
  }

  // 6. Risk Manager
  console.log("\n6. DETERMINISTIC RISK GATES");
  const risk = new RiskManager(sentinelConfig);
  console.log(`  🛡️  Min Confidence: ${(sentinelConfig.minConfidence * 100).toFixed(0)}%`);
  console.log(`  🛡️  Daily Loss Cap: $${sentinelConfig.dailyLossCapUsd}.00 USD`);
  console.log(`  🛡️  Max Position: ${sentinelConfig.maxPositionSize} contracts`);
  console.log(`  🛡️  Market Cooldown: ${sentinelConfig.cooldownMs / 1000}s`);
  console.log(`  🔒 Execution Mode: ${sentinelConfig.dryRun ? "DRY RUN (Simulated, Funds Protected)" : "LIVE EXECUTION (Real Orders)"}`);

  console.log("\n========================================================");
  if (issues.length === 0 && warnings.length === 0) {
    console.log("  🚀 ALL CHECKS PASSED: Sentinel is production ready!");
  } else if (issues.length === 0) {
    console.log("  ✅ READY (WITH NOTICES):");
    warnings.forEach((w) => console.log(`     • ${w}`));
  } else {
    console.log("  ❌ ACTION REQUIRED:");
    issues.forEach((i) => console.log(`     • ${i}`));
    warnings.forEach((w) => console.log(`     • ${w}`));
  }
  console.log("========================================================\n");

  process.exit(issues.length > 0 ? 1 : 0);
}

checkSystem().catch((err) => {
  console.error("Doctor encountered fatal error:", err);
  process.exit(1);
});
