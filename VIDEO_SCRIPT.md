# 🎬 Sentinel Reactive — 2 to 3 Minute Hackathon Demo Video Script

**Target Duration:** 2:30 – 3:00 minutes  
**Tone:** Confident, technical, energetic, and clear  
**Key Goal:** Show judges a working, autonomous AI agent executing live on Somnia Shannon Testnet with a live dashboard and verifiable on-chain transactions.

---

## ⏱️ Video Breakdown at a Glance

| Time | Scene | On-Screen Visual | Audio / Narration |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:30** | Hook & Problem | DreamDEX Event Contracts UI | The challenge of 15m/60m binary prediction markets |
| **0:30 – 1:00** | Solution Intro | Sentinel Reactive Dashboard | Introducing Sentinel Reactive: AI + Deterministic Risk + Somnia |
| **1:00 – 1:50** | Live Execution Demo | Click "Run Live Cycle Now" | Real-time news analysis, Groq reasoning, on-chain execution |
| **1:50 – 2:25** | Explorer & Mechanics | Somnia Shannon Explorer | Verifying the tx, PostOnly routing & dynamic auto-discovery |
| **2:25 – 2:50** | Architecture & Risk | Architecture Diagram / Terminal | 4-layer risk gates & native Somnia WebSocket streaming |
| **2:50 – 3:00** | Outro | GitHub Repo / Summary Slide | Ecosystem impact on DreamDEX & Somnia |

---

## 🎙️ Detailed Script (Word-for-Word Voiceover & Screen Actions)

### [0:00 – 0:30] SCENE 1: The Problem with Fast Prediction Markets
**Visual on screen:**  
Start on the [DreamDEX Event Contracts page](https://app.dreamdex.io/event-contracts) showing the fast 15-minute and 60-minute Up/Down binary prediction windows.

> **Voiceover:**  
> "Prediction markets are the ultimate frontier for real-time information discovery. On DreamDEX and the Somnia blockchain, event contracts settle rapidly in 15-minute and 1-hour windows.  
> 
> But for human traders, reacting in time is nearly impossible. Breaking news breaks in seconds. Evaluating geopolitical news, calculating probabilistic odds, sizing risk, and executing orders before the window closes requires superhuman speed.  
> 
> What if an autonomous AI agent could reason clearly, enforce strict risk guardrails, and react instantly on-chain?  
> 
> Meet **Sentinel Reactive**."

---

### [0:30 – 1:00] SCENE 2: Introducing Sentinel Reactive
**Visual on screen:**  
Switch to the browser showing the Sentinel Reactive Dashboard running at **`http://localhost:3000/`**.  
Highlight the top bar: `🟢 LIVE EXECUTION · Somnia Shannon 50312`, the connected wallet (`0xb6C0...fDAf`), and the live balance (`STT` gas and `tUSDC` collateral).

> **Voiceover:**  
> "Sentinel Reactive is an autonomous AI trading agent and live intelligence dashboard built specifically for DreamDEX Event Contracts on Somnia Shannon testnet.  
> 
> In our dashboard, you can see our live status: we are connected live on-chain, funded with native STT gas and testnet USDC collateral, targeting active BTC and ETH 60-minute prediction windows.  
> 
> Sentinel combines ultra-fast LLM reasoning via **Groq Cloud** with deterministic on-chain risk gates, ensuring zero hallucinated trades and complete capital protection."

---

### [1:00 – 1:50] SCENE 3: The Live Demonstration
**Visual on screen:**  
Cursor hovers over and clicks the **`⚡ Run Live Cycle Now`** button in the Autonomous Operator panel.  
Show the live spinner `Running AI Pipeline...`.  
Then show the Signal Room updating with the latest headline, the Groq reasoning, the `BUY_YES` badge, and the `● RISK GATE APPROVED` badge.

> **Voiceover:**  
> "Let's see it in action. I'll trigger a live cycle directly from the operator dashboard.  
> 
> Behind the scenes, Sentinel ingests breaking global headlines from NewsAPI. It passes each event to our Groq reasoning core running `openai/gpt-oss-120b`.  
> 
> The model extracts the directional bias—Up or Down—along with a calibrated probability and key evidence.  
> 
> But AI alone isn't allowed to trade. The signal must pass our **deterministic risk engine**:
> - It requires at least **72% confidence**.
> - Enforces a strict **15-minute market cooldown**.
> - Caps position size at **10 contracts**.
> - And enforces an automatic **$25 daily loss circuit breaker**.  
> 
> If approved, our execution router immediately submits the order to DreamDEX on Somnia!"

---

### [1:50 – 2:25] SCENE 4: Verifying On-Chain Proof & Smart Routing
**Visual on screen:**  
In the "On-Chain Trades & Activity" panel, point out the new trade row.  
Click the **`Tx: 0x... ↗`** link to open the transaction in a new tab on **Somnia Shannon Explorer**.  
Show the green `Success` status, the contract interaction, and the token transfer.

> **Voiceover:**  
> "And here is the magic: our trade just landed on-chain!  
> 
> Clicking the transaction hash opens the live Somnia Shannon Explorer. Here's our transaction confirmed with sub-second finality.  
> 
> Notice how Sentinel routes orders: it places **PostOnly maker orders** first to capture maker fee rebates. If the orderbook is tight and a PostOnly would cross, it gracefully falls back to an **Immediate-Or-Cancel (IOC)** taker order.  
> 
> Even better—our dynamic market discovery continuously monitors Somnia block logs. When a 60-minute window finalizes, Sentinel automatically rotates to the next live window without any downtime."

---

### [2:25 – 2:50] SCENE 5: Architecture & Developer Experience
**Visual on screen:**  
Briefly show terminal running `npm run doctor` showing all 6 green checks:
`🚀 ALL CHECKS PASSED: Sentinel is production ready!`, or show the architecture ASCII diagram from the `README.md`.

> **Voiceover:**  
> "Architecturally, Sentinel is built with `@somnia-chain/markets-sdk` and connects directly to Somnia's JSON-RPC WebSockets for instant block and pool event streaming.  
> 
> For developers and operators, everything is turnkey. A single command—`npm run doctor`—validates RPC connectivity, balances, AI inference, and market status.  
> 
> You can run Sentinel in single-shot mode, launch the cyberpunk dashboard, or deploy it as a continuous autonomous daemon loop with `npm run agent`."

---

### [2:50 – 3:00] SCENE 6: Outro & Impact
**Visual on screen:**  
Return to the dashboard or the GitHub repository: `https://github.com/pathekarharsh/ec-dreamdex-hackathon-template`.

> **Voiceover:**  
> "Sentinel Reactive brings intelligent volume, continuous liquidity, and transparent, risk-managed automation to DreamDEX and the Somnia ecosystem.  
> 
> The codebase is fully verified, open-source, and running live on testnet right now.  
> 
> Thank you for watching!"

---

## 💡 Quick Tips for Recording:
1. **Screen Resolution**: Record in 1080p (1920x1080) with browser zoom at 100% or 110% so all text and badges are crisp.
2. **Tab Setup**: Have 3 tabs open in advance:
   - Tab 1: `http://localhost:3000` (Sentinel Dashboard)
   - Tab 2: `https://app.dreamdex.io/event-contracts` (DreamDEX Event Contracts)
   - Tab 3: `https://github.com/pathekarharsh/ec-dreamdex-hackathon-template` (GitHub Repository)
3. **Cursor Movement**: Move the cursor smoothly; highlight key badges like `🟢 LIVE EXECUTION`, `92.45 tUSDC`, and the clickable Explorer links.
