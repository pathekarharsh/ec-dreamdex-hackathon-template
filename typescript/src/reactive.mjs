import { EventEmitter } from "node:events";
import { sentinelConfig } from "./config.mjs";

export class ReactiveEventBridge extends EventEmitter {
  constructor({ wsUrl = sentinelConfig.wsRpcUrl, marketId = sentinelConfig.marketId } = {}) {
    super();
    this.wsUrl = wsUrl;
    this.marketId = marketId;
    this.socket = null;
    this.connected = false;
  }

  connect() {
    if (typeof WebSocket === "undefined") throw new Error("WebSocket is unavailable in this runtime");
    if (this.socket) return;
    this.socket = new WebSocket(this.wsUrl);
    this.socket.addEventListener("open", () => { this.connected = true; this.emit("connected"); });
    this.socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data);
        const message = { receivedAt: new Date().toISOString(), marketId: this.marketId, payload };
        this.emit("event", message);
        if (payload?.marketId === this.marketId || payload?.market === this.marketId) this.emit("market", message);
      } catch (error) { this.emit("error", new Error(`invalid reactive event: ${error.message}`)); }
    });
    this.socket.addEventListener("error", (error) => this.emit("error", error));
    this.socket.addEventListener("close", () => { this.connected = false; this.socket = null; this.emit("disconnected"); });
  }

  close() { this.socket?.close(); this.socket = null; this.connected = false; }
}
