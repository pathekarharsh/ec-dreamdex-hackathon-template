# 🎬 Sentinel Reactive — Complete Demo Video Script (With Step-by-Step UI Actions)

**Total Duration:** 2:30 – 3:00 minutes  
**Tone:** Confident, energetic, and clear  
**Setup before recording:**
1. Have **`http://localhost:3000/`** open in Tab 1 (make sure `npm start` is running in your terminal).
2. Have **`https://shannon-explorer.somnia.network`** open in Tab 2.
3. Have **`https://app.dreamdex.io/event-contracts`** open in Tab 3.
4. Have your terminal ready in the background to show `npm run doctor`.

---

## 🎙️ Video Script & Step-by-Step Visual Walkthrough

---

### [0:00 – 0:30] Scene 1: The Problem & DreamDEX Context
`[ACTION: Start video recording on Tab 3 showing the DreamDEX Event Contracts page https://app.dreamdex.io/event-contracts]`  
`[ACTION: Slowly move cursor over the 15-minute and 60-minute Up/Down contract cards]`

> **Say this:**  
> "Welcome! This is DreamDEX Event Contracts running on the Somnia blockchain.  
> 
> Here, traders can bet on binary outcomes—like whether Bitcoin or Ethereum will be Up or Down in short 15-minute or 1-hour windows.  
> 
> But for human traders, the real challenge is **speed**. Breaking news happens in seconds. Evaluating geopolitical events, estimating probabilistic odds, checking risk limits, and placing orders on-chain before the window expires is nearly impossible to do manually.  
> 
> That’s why we built **Sentinel Reactive**—an autonomous AI trading agent with deterministic risk guardrails and live sub-second reactivity on Somnia."

---

### [0:30 – 1:00] Scene 2: The Sentinel Reactive Dashboard
`[ACTION: Switch to Tab 1: http://localhost:3000/ showing the Sentinel Reactive Cyberpunk Dashboard]`  
`[ACTION: Point cursor to the top-right badges: 'LIVE EXECUTION' and the wallet chip showing your balance]`

> **Say this:**  
> "Here is the Sentinel Reactive Dashboard running live.  
> 
> In the top bar, you can see our system is in **LIVE EXECUTION** mode, connected to the **Somnia Shannon Testnet** (Chain 50312).  
> 
> Our wallet is funded with native **STT** for gas and **tUSDC** for market collateral.  
> 
> In the metrics bar below, the agent is actively targeting the live BTC 60-minute trading window. Every signal we evaluate is powered by **Groq Cloud** using `openai/gpt-oss-120b` for ultra-fast, structured JSON reasoning."

---

### [1:00 – 1:45] Scene 3: Live Execution — Running the AI Trading Cycle
`[ACTION: Move cursor to the Autonomous Operator section]`  
`[ACTION: Highlight the '⚡ Run Live Cycle Now' button]`  
`[ACTION: CLICK the '⚡ Run Live Cycle Now' button!]`  
`[ACTION: Point cursor to the button as it displays the spinner: 'Running AI Pipeline...']`  
`[ACTION: Wait 8–10 seconds while the pipeline ingests news, prompts Groq AI, verifies risk gates, and executes on-chain]`  
`[ACTION: Point cursor to the green feedback banner that appears: '✅ Cycle Complete: Processed 10 headlines. Executed on-chain trade(s)!']`

> **Say this:**  
> "Now let's see the agent execute live!  
> 
> I am clicking **'Run Live Cycle Now'**.  
> 
> `[Wait 5 seconds while spinner is running]`  
> 
> As you can see, the pipeline is running in real-time. It ingests the latest market headlines via NewsAPI, streams them to Groq AI to calculate directional sentiment and confidence, and runs each signal through our deterministic risk engine.  
> 
> And look right here—the cycle is complete! The risk gate approved high-conviction trades, and our execution layer immediately submitted them to the DreamDEX orderbook on Somnia!"

---

### [1:45 – 2:15] Scene 4: Inspecting AI Reasoning & Real On-Chain Proof
`[ACTION: Scroll down slightly to the 'Latest Signal Analysis (Groq AI)' panel]`  
`[ACTION: Point cursor to the 'BUY_YES' tag, the 'Confidence: 86%', and the '● RISK GATE APPROVED' badge]`  
`[ACTION: Point cursor to the 'Groq AI Reasoning' and 'Key Evidence' text]`  
`[ACTION: Move cursor to the right panel: 'On-Chain Trades & Activity']`  
`[ACTION: CLICK the latest transaction link: 'Tx: 0x... ↗']`  
`[ACTION: Tab 2 (Somnia Shannon Explorer) opens automatically. Show the green 'Success' status, block number, and contract interaction]`

> **Say this:**  
> "Let's inspect the intelligence:  
> 
> In the Signal Room, you can see the exact headline analyzed. Groq generated a **BUY_YES** signal with **86% confidence**, citing concrete evidence.  
> 
> Because the confidence exceeded our strict **72% risk threshold**, the trade was approved.  
> 
> Now let's look at the On-Chain Activity panel on the right. Here is our live trade. When I click the transaction link...  
> 
> `[Explorer tab opens]`  
> 
> ...it opens the live **Somnia Shannon Explorer**! You can see the transaction is confirmed with block finality. This isn't a simulation—this is real collateral and a real order resting on the DreamDEX binary pool contract!"

---

### [2:15 – 2:35] Scene 5: Collateral Faucet & Smart Routing
`[ACTION: Switch back to Tab 1 (Dashboard)]`  
`[ACTION: Point cursor to the '💧 Claim 100 tUSDC Faucet' button]`  
`[ACTION: CLICK the '💧 Claim 100 tUSDC Faucet' button!]`  
`[ACTION: Wait 3–4 seconds as the button shows 'Claiming Faucet...']`  
`[ACTION: Show the green success message: '💧 Faucet Success: Minted 100.00 tUSDC!']`  
`[ACTION: Point cursor to the Collateral Balance metric showing the updated balance]`

> **Say this:**  
> "We also built direct operator controls into the UI. For instance, if you need more collateral, clicking **'Claim 100 tUSDC Faucet'**...  
> 
> `[Click button, wait 3 seconds]`  
> 
> ...calls the testnet faucet contract directly on Somnia, adding 100 tUSDC to our balance in seconds!  
> 
> Notice also our smart order routing: Sentinel places **PostOnly maker orders** to earn fee rebates, with an automatic fallback to **IOC taker crossing** if the book is tight. And our dynamic market discovery automatically rotates to the next live window when one finalizes."

---

### [2:35 – 2:50] Scene 6: Turnkey Developer Health Check
`[ACTION: Switch to Terminal window]`  
`[ACTION: Type and run: npm run doctor]`  
`[ACTION: Highlight the output showing all 6 green checkmarks and '🚀 ALL CHECKS PASSED: Sentinel is production ready!']`

> **Say this:**  
> "For judges and developers wanting to run this locally, the experience is completely turnkey.  
> 
> Running `npm run doctor` performs a full 6-point diagnostic: verifying private keys, RPC latency, gas balances, collateral balances, active market discovery, and AI inference. Everything reports green out of the box."

---

### [2:50 – 3:00] Scene 7: Wrap-up & Conclusion
`[ACTION: Switch back to the dashboard or your GitHub repository page]`

> **Say this:**  
> "Sentinel Reactive delivers the speed, intelligence, and risk management needed to bring autonomous liquidity and intelligent volume to DreamDEX on Somnia.  
> 
> The code is fully open source on GitHub, verified on testnet, and ready to deploy.  
> 
> Thank you for watching!"

---

## 📋 Quick Cheat-Sheet for Recording

1. **Tab 1:** `http://localhost:3000` (Make sure `node server.mjs` is running).
2. **First Click:** Click **`⚡ Run Live Cycle Now`** → wait ~8 seconds → show green banner and new signal!
3. **Second Click:** Click the new **`Tx: 0x... ↗`** link → shows Somnia Explorer with green `Success`!
4. **Third Click:** Switch back to Dashboard, click **`💧 Claim 100 tUSDC Faucet`** → shows 100 tUSDC added!
5. **Terminal:** Run `npm run doctor` → shows `🚀 ALL CHECKS PASSED`!
