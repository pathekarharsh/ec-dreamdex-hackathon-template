import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, "../../data/sentinel.db");
const LOG_JSON_PATH = resolve(__dirname, "../../data/sentinel-log.json");

const s = (v, def = null) => (v === undefined || v === null ? def : v);

export class TradeStore {
  constructor(dbPath = DB_PATH) {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
    this.initSchema();
    this.seedFromLogIfEmpty();
  }

  initSchema() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;

      CREATE TABLE IF NOT EXISTS decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        strategy_name TEXT,
        market_id TEXT,
        source TEXT,
        title TEXT,
        action TEXT,
        confidence REAL,
        reasoning TEXT,
        key_evidence TEXT,
        risk_status TEXT,
        risk_reason TEXT
      );

      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        decision_id INTEGER,
        strategy_name TEXT DEFAULT 'NewsSentimentStrategy',
        market_id TEXT,
        pool TEXT,
        side TEXT,
        price REAL,
        quantity REAL,
        tx_hash TEXT,
        order_id TEXT,
        placed_at TEXT,
        status TEXT DEFAULT 'OPEN',
        resolved_at TEXT,
        payout_amount REAL,
        redeem_tx_hash TEXT,
        FOREIGN KEY(decision_id) REFERENCES decisions(id)
      );

      CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
      CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market_id);
    `);
  }

  seedFromLogIfEmpty() {
    const countRow = this.db.prepare("SELECT COUNT(*) as cnt FROM trades").get();
    if (countRow && countRow.cnt > 0) return;

    if (!existsSync(LOG_JSON_PATH)) return;

    try {
      const data = JSON.parse(readFileSync(LOG_JSON_PATH, "utf8"));
      if (!Array.isArray(data)) return;

      const insertDecision = this.db.prepare(`
        INSERT INTO decisions (timestamp, strategy_name, market_id, source, title, action, confidence, reasoning, key_evidence, risk_status, risk_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertTrade = this.db.prepare(`
        INSERT INTO trades (decision_id, strategy_name, market_id, pool, side, price, quantity, tx_hash, order_id, placed_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let imported = 0;
      for (const item of data) {
        const isExecuted = item.executed || item.execution?.executed || (item.status && item.status.startsWith("submitted"));
        if (!isExecuted) continue;

        const order = item.execution?.order || {};
        const txHash = item.execution?.txHash || item.txHash;
        const marketId = order.marketId || item.marketId || "0x0000000000000000000000000000000000000000000000000000000000013f34";
        const pool = order.pool || item.pool || "0xA34e33f71C566134CeeCdd6869BcC693B3D69c17";
        const side = order.side || item.action || "BUY_YES";
        const price = order.limitPrice || (item.confidence ? item.confidence / 100 : 0.72);
        const quantity = order.quantity || 1;
        const placedAt = item.timestamp || new Date().toISOString();
        const orderId = item.execution?.orderId ? String(item.execution.orderId) : null;

        const decResult = insertDecision.run(
          s(placedAt),
          "NewsSentimentStrategy",
          s(marketId),
          s(item.source, "news"),
          s(item.title, "Somnia Order"),
          s(item.action, side),
          s(item.confidence ? item.confidence / 100 : 0.72),
          s(item.reasoning, ""),
          s(item.keyEvidence, ""),
          s(item.status, "submitted"),
          s(item.detail, "")
        );

        const decisionId = Number(decResult.lastInsertRowid);
        insertTrade.run(
          decisionId,
          "NewsSentimentStrategy",
          s(marketId),
          s(pool),
          s(side),
          s(price),
          s(quantity, 1),
          s(txHash),
          s(orderId),
          s(placedAt),
          "OPEN"
        );
        imported++;
      }
      if (imported > 0) {
        console.log(`[tradeStore] Seeded ${imported} historical live trade(s) from sentinel-log.json into sentinel.db`);
      }
    } catch (err) {
      console.warn(`[tradeStore] Warning seeding historical trades: ${err.message}`);
    }
  }

  recordDecision({
    timestamp = new Date().toISOString(),
    strategyName = "NewsSentimentStrategy",
    marketId,
    source = "news",
    title,
    action,
    confidence,
    reasoning,
    keyEvidence,
    riskStatus,
    riskReason,
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO decisions (timestamp, strategy_name, market_id, source, title, action, confidence, reasoning, key_evidence, risk_status, risk_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(
      s(timestamp),
      s(strategyName, "NewsSentimentStrategy"),
      s(marketId, ""),
      s(source, "news"),
      s(title, ""),
      s(action, "HOLD"),
      s(confidence, 0),
      s(reasoning, ""),
      s(keyEvidence, ""),
      s(riskStatus, "pending"),
      s(riskReason, "")
    );
    return Number(res.lastInsertRowid);
  }

  recordTrade({
    decisionId = null,
    strategyName = "NewsSentimentStrategy",
    marketId,
    pool,
    side,
    price,
    quantity = 1,
    txHash = null,
    orderId = null,
    placedAt = new Date().toISOString(),
    status = "OPEN",
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO trades (decision_id, strategy_name, market_id, pool, side, price, quantity, tx_hash, order_id, placed_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(
      s(decisionId),
      s(strategyName, "NewsSentimentStrategy"),
      s(marketId, ""),
      s(pool, ""),
      s(side, "BUY_YES"),
      s(price, 0.5),
      s(quantity, 1),
      s(txHash),
      orderId ? String(orderId) : null,
      s(placedAt),
      s(status, "OPEN")
    );
    return Number(res.lastInsertRowid);
  }

  getTrade(id) {
    return this.db.prepare("SELECT * FROM trades WHERE id = ?").get(id);
  }

  getOpenTrades() {
    return this.db.prepare("SELECT * FROM trades WHERE status = 'OPEN' ORDER BY id ASC").all();
  }

  getWonUnclaimedTrades() {
    return this.db.prepare("SELECT * FROM trades WHERE status = 'WON' AND redeem_tx_hash IS NULL ORDER BY id ASC").all();
  }

  updateTradeStatus(id, { status, resolvedAt, payoutAmount, redeemTxHash }) {
    const trade = this.getTrade(id);
    if (!trade) return null;

    const newStatus = status !== undefined ? status : trade.status;
    const newResolvedAt = resolvedAt !== undefined ? resolvedAt : trade.resolved_at;
    const newPayout = payoutAmount !== undefined ? payoutAmount : trade.payout_amount;
    const newRedeemTx = redeemTxHash !== undefined ? redeemTxHash : trade.redeem_tx_hash;

    const stmt = this.db.prepare(`
      UPDATE trades 
      SET status = ?, resolved_at = ?, payout_amount = ?, redeem_tx_hash = ?
      WHERE id = ?
    `);
    stmt.run(
      s(newStatus),
      s(newResolvedAt),
      s(newPayout),
      s(newRedeemTx),
      id
    );
    return this.getTrade(id);
  }

  getAllTrades({ limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT t.*, d.title as signal_title, d.reasoning as signal_reasoning
      FROM trades t
      LEFT JOIN decisions d ON t.decision_id = d.id
      ORDER BY t.id DESC
      LIMIT ?
    `).all(limit);
  }

  getRecentDecisions({ limit = 50 } = {}) {
    return this.db.prepare(`
      SELECT d.*, t.id as trade_id, t.status as trade_status, t.tx_hash, t.price as trade_price, t.payout_amount, t.redeem_tx_hash
      FROM decisions d
      LEFT JOIN trades t ON d.id = t.decision_id
      WHERE d.action != 'HOLD'
      ORDER BY d.id DESC
      LIMIT ?
    `).all(limit);
  }

  getPerformanceMetrics(dailyLossCapUsd = 25) {
    const trades = this.db.prepare("SELECT * FROM trades").all();

    let openCount = 0;
    let wonCount = 0;
    let lostCount = 0;
    let redeemedCount = 0;

    let totalPayout = 0;
    let totalRedeemedCost = 0;
    let largestWin = 0;
    let largestLoss = 0;
    let claimableWinningsUsd = 0;

    const strategyMap = new Map();

    for (const t of trades) {
      const strat = t.strategy_name || "NewsSentimentStrategy";
      if (!strategyMap.has(strat)) {
        strategyMap.set(strat, {
          name: strat,
          totalTrades: 0,
          won: 0,
          lost: 0,
          open: 0,
          redeemed: 0,
          realizedPnL: 0,
        });
      }
      const s = strategyMap.get(strat);
      s.totalTrades++;

      const cost = (t.price || 0.5) * (t.quantity || 1);

      if (t.status === "OPEN") {
        openCount++;
        s.open++;
      } else if (t.status === "WON") {
        wonCount++;
        s.won++;
        const estimatedPayout = (t.quantity || 1) * 1.0;
        claimableWinningsUsd += estimatedPayout;
      } else if (t.status === "LOST") {
        lostCount++;
        s.lost++;
        if (cost > largestLoss) largestLoss = cost;
      } else if (t.status === "REDEEMED") {
        redeemedCount++;
        s.redeemed++;
        const payout = t.payout_amount !== null && t.payout_amount !== undefined ? t.payout_amount : (t.quantity || 1) * 1.0;
        totalPayout += payout;
        totalRedeemedCost += cost;
        const tradePnL = payout - cost;
        s.realizedPnL += tradePnL;
        if (tradePnL > largestWin) largestWin = tradePnL;
      }
    }

    const resolvedCount = wonCount + lostCount + redeemedCount;
    const winsTotal = wonCount + redeemedCount;
    const winRate = resolvedCount > 0 ? (winsTotal / resolvedCount) * 100 : 0;
    const netRealizedPnL = totalPayout - totalRedeemedCost;

    const strategyBreakdown = Array.from(strategyMap.values()).map((s) => {
      const stratResolved = s.won + s.lost + s.redeemed;
      const stratWins = s.won + s.redeemed;
      return {
        ...s,
        winRate: stratResolved > 0 ? Number(((stratWins / stratResolved) * 100).toFixed(1)) : 0,
        realizedPnL: Number(s.realizedPnL.toFixed(2)),
      };
    });

    return {
      totalTrades: trades.length,
      openCount,
      wonCount,
      lostCount,
      redeemedCount,
      resolvedCount,
      winRate: Number(winRate.toFixed(1)),
      netRealizedPnL: Number(netRealizedPnL.toFixed(2)),
      claimableWinningsUsd: Number(claimableWinningsUsd.toFixed(2)),
      largestWin: Number(largestWin.toFixed(2)),
      largestLoss: Number(largestLoss.toFixed(2)),
      dailyLossCapUsd,
      strategyBreakdown,
    };
  }

  close() {
    this.db.close();
  }
}

export const tradeStore = new TradeStore();
