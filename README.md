# ⚡ Sentinel Reactive

> **Autonomous AI Trading Agent & Live Reactive Intelligence Dashboard for DreamDEX Event Contracts on Somnia Shannon Testnet (Chain ID 50312).**

[![Somnia Shannon Testnet](https://img.shields.io/badge/Somnia-Shannon_Testnet_50312-7928CA?style=for-the-badge&logo=ethereum)](https://shannon-explorer.somnia.network)
[![DreamDEX](https://img.shields.io/badge/DreamDEX-Event_Contracts-00DF8F?style=for-the-badge)](https://app.dreamdex.io/event-contracts)
[![Groq Cloud](https://img.shields.io/badge/LLM-Groq_GPT--OSS_/_LLaMA-F55036?style=for-the-badge)](https://groq.com)
[![Status](https://img.shields.io/badge/Production-Ready-00E5FF?style=for-the-badge)]()

---

## 🧭 Overview

**Sentinel Reactive** is an end-to-end autonomous algorithmic trading system designed specifically for **DreamDEX binary prediction markets (Event Contracts)** on the ultra-high-throughput **Somnia Blockchain**.

By bridging real-world news intelligence with on-chain order books, Sentinel transforms incoming macro and crypto events into deterministic trading signals, validates them against rigorous risk gates, and executes live maker/taker orders directly on Somnia using `@somnia-chain/markets-sdk`.

### 🌟 Key Highlights
- 🧠 **High-Speed AI Reasoning Core**: Powered by **Groq** (`openai/gpt-oss-120b` / LLaMA), generating structured JSON signals with key evidence and calibrated confidence.
- 🛡️ **Deterministic Risk Protection**: Zero blind execution. Strict hard-coded gates enforce confidence floors (≥72%), cooldown timers (15 mins), max positions (10 contracts), and daily loss circuit breakers.
- 🔄 **Dynamic Market Auto-Discovery**: Automatically monitors Somnia Shannon testnet block logs (`MarketCreated`) to discover active trading windows (e.g., BTC 60-min, ETH 60-min) and seamlessly migrates when windows finalize.
- ⚡ **Smart Order Routing (PostOnly → IOC → LIMIT)**: Targets maker liquidity first for fee advantages; gracefully falls back to Immediate-Or-Cancel (IOC) crossing or Limit orders when books tighten.
- 📡 **Native Somnia WebSocket Event Streaming**: Subscribes directly to `newHeads` and pool contract event logs via JSON-RPC WebSockets (`wss://api.infra.testnet.somnia.network/ws`).
- 🖥️ **Live Cyberpunk Web Dashboard**: Real-time monitoring UI served on `http://localhost:3000/` featuring Server-Sent Events (SSE), trade tape, telemetry, and Somnia Shannon Explorer links.

---

## 🏗️ System Architecture

```
                 ┌────────────────────────────────┐
                 │       Live Intelligence        │
                 │  NewsAPI / Curated RSS Feeds   │
                 └───────────────┬────────────────┘
                                 │ Ingests Headlines
                                 ▼
                 ┌────────────────────────────────┐
                 │    Groq AI Reasoning Engine    │
                 │   (openai/gpt-oss-120b/LLaMA)  │
                 │  Structured Direction + Conf   │
                 └───────────────┬────────────────┘
                                 │ { action: BUY_YES, confidence: 87% }
                                 ▼
                 ┌────────────────────────────────┐
                 │   Deterministic Risk Engine    │
                 │ • Min Confidence ≥ 72%         │
                 │ • Max Position ≤ 10 contracts  │
                 │ • 15-Minute Market Cooldown    │
                 │ • Daily Loss Cap ($25 Breaker) │
                 └───────┬───────────────┬────────┘
             REJECTED    │               │ APPROVED
       ┌─────────────────┘               └────────────────┐
       ▼                                                  ▼
┌──────────────┐                                ┌───────────────────┐
│ Log & Ignore │                                │ Dynamic Discovery │
│ (Dashboard)  │                                │ Find Active Window│
└──────────────┘                                └─────────┬─────────┘
                                                          │
                                                          ▼
                                                ┌───────────────────┐
                                                │ Execution Layer   │
                                                │  • Preflight Bal  │
                                                │  • PostOnly Maker │
                                                │  • IOC Crossing   │
                                                └─────────┬─────────┘
                                                          │
                                                          ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                       SOMNIA SHANNON TESTNET (50312)                      │
│   • Gas: Native STT                                                       │
│   • Collateral: testnet tUSDC (0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E)│
│   • DreamDEX Binary Pools (ERC-6909 Mint / Orderbook Match / Settlement)   │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
                 ┌────────────────────────────────┐
                 │  Reactive Event Bridge (WSS)   │
                 │   eth_subscribe(newHeads/logs) │
                 └───────────────┬────────────────┘
                                 │ Realtime Push
                                 ▼
                 ┌────────────────────────────────┐
                 │    Sentinel Web Dashboard      │
                 │    http://localhost:3000/      │
                 │  (Live SSE Telemetry & Trades) │
                 └────────────────────────────────┘
```

---

## 🔗 Verified On-Chain Transactions (Shannon Testnet)

All trades execute live on Somnia Shannon Testnet. Recent real transactions from Sentinel Reactive:

| Operation | Transaction Hash | Status | Details |
| :--- | :--- | :--- | :--- |
| **Faucet Mint** | [`0x6238d71c162f83...`](https://shannon-explorer.somnia.network/tx/0x6238d71c162f83b7cc912288cc99beae1b1629cf29f04a23f6297b9fdfdae005) | Confirmed | Minted 100.00 tUSDC Collateral |
| **PostOnly Order** | [`0xf902467041c333...`](https://shannon-explorer.somnia.network/tx/0xf902467041c333fb0881e5c440442762d627c4abe53d91c7c641dbbe859a7d0d) | Confirmed | Placed Resting Order (`OrderId: 202914184810805081071`) |
| **IOC Crossing** | [`0x3f0cfa127f97fa...`](https://shannon-explorer.somnia.network/tx/0x3f0cfa127f97fae4907f9b69cd1b789c69d5952d667e3f4d779445396289afdb) | Confirmed | Taker Crossing Fill on Live Book |
| **Active Trade** | [`0xb34700ce491552...`](https://shannon-explorer.somnia.network/tx/0xb34700ce491552ce17d39e1cadbe8894b5cc60de597dd7cac28816c6d47376e3) | Confirmed | Live Order (`OrderId: 92233720368547767327`) |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v20+ or v22+
- **Somnia Shannon Testnet Wallet**:
  - Native Gas: **STT**
  - Market Collateral: **tUSDC**
  - *Get testnet tokens via Telegram Dev Faucet*: [https://t.me/+XHq0F0JXMyhmMzM0](https://t.me/+XHq0F0JXMyhmMzM0)
- **API Keys**:
  - **Groq API Key** (Free, ultra-fast LLM inference: [https://console.groq.com](https://console.groq.com))
  - **NewsAPI Key** (Free news feed: [https://newsapi.org](https://newsapi.org))

---

### 2. Installation & Setup

```bash
# Clone the repository
git clone https://github.com/pathekarharsh/ec-dreamdex-hackathon-template.git
cd ec-dreamdex-hackathon-template

# Install dependencies
npm --prefix typescript install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and insert your credentials:

```bash
cp .env.example .env
```

Your `.env` should look like this:
```env
# Funded Somnia Shannon Private Key (Gas + Collateral)
PRIVATE_KEY=your_private_key_here

# Network Endpoints
RPC_URL=https://dream-rpc.somnia.network
WS_RPC_URL=wss://api.infra.testnet.somnia.network/ws
INDEXER_URL=https://dev.smk.somnia.host/v1/graphql

# Intelligence & LLM Engine
NEWS_API_KEY=your_news_api_key
GROQ_API_KEY=gsk_your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b

# Deterministic Risk & Execution Settings
DRY_RUN=false
MIN_CONFIDENCE=0.72
COOLDOWN_MS=900000
DAILY_LOSS_CAP_USD=25
MAX_POSITION_SIZE=10
POLL_INTERVAL_MS=60000
```

---

### 4. Run System Diagnostic Check

Before trading, verify all credentials, RPC connection, wallet balances, AI engine, and market status with the built-in diagnostic doctor:

```bash
npm run doctor
```

Expected output:
```text
========================================================
       SENTINEL REACTIVE — SYSTEM HEALTH DOCTOR         
========================================================

1. WALLET & CREDENTIALS
  ✅ Private Key: Configured
  🔑 Derived Address: 0xb6C0D3a50B5Cd2eAf531eb3fEC9dFb68249ffDAf

2. SOMNIA SHANNON TESTNET (Chain 50312)
  ✅ RPC Connected: https://dream-rpc.somnia.network
  📦 Current Block: #480102307

3. BALANCES (Faucet: https://t.me/+XHq0F0JXMyhmMzM0)
  ✅ Native STT (Gas): 49.9985 STT
  ✅ Testnet tUSDC (Collateral): 100.00 tUSDC

4. TARGET DREAMDEX EVENT CONTRACT
  ✅ Market Active: 0x0000000000000000000000000000000000000000000000000000000000013e10
  🏛️  Pool Address: 0x0Be08A9A6F84f147a01fEc2Ba98445Ead85F8f85
  🎯 Asset: BTC
  📊 On-chain Status: 1 (Trading / Active) (Finalized: false)

5. INTELLIGENCE & REASONING PIPELINE
  ✅ News Provider: NewsAPI.org configured
  ✅ LLM Engine: Live provider configured — Groq (openai/gpt-oss-120b)

6. DETERMINISTIC RISK GATES
  🛡️  Min Confidence: 72%
  🛡️  Daily Loss Cap: $25.00 USD
  🛡️  Max Position: 10 contracts
  🛡️  Market Cooldown: 900s
  🔒 Execution Mode: LIVE EXECUTION (Real Orders)

========================================================
  🚀 ALL CHECKS PASSED: Sentinel is production ready!
========================================================
```

---

## 💻 Running Sentinel Reactive

### Option A: Launch the Web Dashboard
Start the production server and open the live real-time UI:

```bash
npm start
# or: npm run dashboard
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to view live order logs, reactive pool events, and agent telemetry.

---

### Option B: Run a Single Trading Cycle
To ingest current headlines, reason over them, check risk gates, and place orders for high-conviction opportunities:

```bash
npm run sentinel
```

---

### Option C: Run Autonomous Daemon Loop
To let Sentinel continuously monitor news, evaluate incoming signals, and execute trades 24/7:

```bash
npm run agent
```

---

## 🛠️ Exploring DreamDEX Contracts & Lifecycle

Sentinel includes verified utilities for interacting with DreamDEX primitives:

### 1. Discover Live Markets
Query on-chain `MarketCreated` events directly from Somnia:
```bash
npm run discover
```

### 2. Full Testnet Primitive Lifecycle
Execute the complete lifecycle (`mintSet` → `placeOrder` maker → taker crossing → cancel order):
```bash
npm run lifecycle
```

### 3. Redeem Settled Contracts
When a trading window closes and resolves, redeem your winning Up/Down tokens for 1:1 USDC collateral:
```bash
npm run redeem
```

---

## 📁 Repository Structure

```
├── .env.example              # Template environment variables (safe)
├── .env                      # Local credentials (git-ignored)
├── package.json              # Root unified execution scripts
├── server.mjs                # Production HTTP & SSE API server
├── index.html                # Cyberpunk Reactive Dashboard UI
├── app.js                    # UI state management & SSE consumer
├── style.css                 # Cyberpunk dark mode styling
├── scripts/
│   └── doctor.mjs            # End-to-end health check diagnostic tool
├── data/
│   └── sentinel-log.json     # Append-only persistence for signals & trades
└── typescript/               # Core Agent & Somnia SDK Layer
    ├── package.json          # TypeScript package scripts & SDK dependencies
    ├── src/
    │   ├── client.mjs        # Viem + SomniaMarkets SDK instance & addresses
    │   ├── config.mjs        # Centralized typed configuration loader
    │   ├── market.mjs        # Dynamic on-chain market auto-discovery & cache
    │   ├── news.mjs          # NewsAPI adapter with curated fallback
    │   ├── reasoner.mjs      # Groq LLM integration (JSON structured output)
    │   ├── reasoning.mjs     # Reasoning data schema & validator
    │   ├── risk.mjs          # Hard deterministic risk & circuit breakers
    │   ├── executor.mjs      # Smart order router (PostOnly -> IOC -> Limit)
    │   ├── reactive.mjs      # Somnia WebSocket JSON-RPC event bridge
    │   ├── store.mjs         # Safe BigInt-aware JSON logger
    │   ├── agent.mjs         # Main orchestrator (single-shot & daemon loop)
    │   ├── discover.mjs      # On-chain market discovery script
    │   ├── lifecycle.mjs     # Verified complete-set lifecycle demo
    │   └── redeem.mjs        # Winning token redemption utility
```

---

## 🛡️ Risk Management Parameters

Sentinel does not gamble. Every order must clear four independent safety layers before reaching the chain:

| Parameter | Default | Purpose |
| :--- | :--- | :--- |
| `MIN_CONFIDENCE` | `0.72` (72%) | Prevents low-conviction signals from trading. |
| `MAX_POSITION_SIZE` | `10` contracts | Limits single-trade exposure. |
| `COOLDOWN_MS` | `900,000` (15m) | Prevents repeated order spam on the same contract. |
| `DAILY_LOSS_CAP_USD` | `$25.00` | Circuit breaker that disables trading if loss threshold is breached. |
| `DRY_RUN` | `false` | When set to `true`, simulates orders without broadcasting on-chain. |

---

## 🤝 Hackathon Evaluation Highlights

- **Innovation**: Real-time integration of high-speed Groq LLM intelligence with Somnia's sub-second finality.
- **Ecosystem Impact**: Automated maker liquidity provision on DreamDEX Event Contracts with PostOnly fee optimization.
- **Execution Quality**: Safe on-chain execution with dynamic fallback handling (`PostOnlyWouldCross` → `IOC` → `LIMIT`).
- **Completeness**: 100% working live implementation with on-chain testnet verification, health checks, and cyberpunk monitoring UI.

---

## 📜 License
MIT © 2026 Sentinel Reactive Team. Built for the **Somnia × DreamDEX Event Contracts Hackathon**.
