import { EventEmitter } from "node:events";
import { sentinelConfig } from "./config.mjs";

export class ReactiveEventBridge extends EventEmitter {
  constructor({
    wsUrl = sentinelConfig.wsRpcUrl,
    marketId = sentinelConfig.marketId,
    pool = sentinelConfig.pool,
  } = {}) {
    super();
    this.wsUrl = wsUrl;
    this.marketId = marketId;
    this.pool = pool;
    this.socket = null;
    this.connected = false;
    this.reconnectTimer = null;
    this.autoReconnect = true;
  }

  connect() {
    if (typeof WebSocket === "undefined") throw new Error("WebSocket is unavailable in this runtime");
    if (this.socket) return;

    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.addEventListener("open", () => {
        this.connected = true;
        this.emit("connected", { wsUrl: this.wsUrl, timestamp: new Date().toISOString() });

        // 1. Subscribe to new block headers for live block ticks
        this.socket.send(JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_subscribe",
          params: ["newHeads"],
        }));

        // 2. Subscribe to DreamDEX pool event logs if pool is configured
        if (this.pool) {
          this.socket.send(JSON.stringify({
            jsonrpc: "2.0",
            id: 2,
            method: "eth_subscribe",
            params: ["logs", { address: this.pool }],
          }));
        }
      });

      this.socket.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(event.data);
          const message = { receivedAt: new Date().toISOString(), marketId: this.marketId, pool: this.pool, payload };

          if (payload?.method === "eth_subscription") {
            const result = payload.params?.result;
            if (result?.number) {
              const blockNum = parseInt(result.number, 16);
              this.emit("block", { blockNumber: blockNum, hash: result.hash, receivedAt: new Date().toISOString() });
            } else if (result?.topics) {
              this.emit("poolEvent", { pool: result.address, topics: result.topics, data: result.data, txHash: result.transactionHash });
            }
          }

          this.emit("event", message);
          if (payload?.marketId === this.marketId || payload?.market === this.marketId) this.emit("market", message);
        } catch (error) {
          this.emit("warn", new Error(`Invalid reactive event: ${error.message}`));
        }
      });

      this.socket.addEventListener("error", (error) => {
        this.emit("warn", error);
      });

      this.socket.addEventListener("close", () => {
        this.connected = false;
        this.socket = null;
        this.emit("disconnected");
        if (this.autoReconnect && !this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 3000);
        }
      });
    } catch (err) {
      this.emit("warn", err);
    }
  }

  close() {
    this.autoReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = null;
    this.connected = false;
  }
}

