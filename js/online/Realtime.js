/* Realtime.js — WebSocket client for the Phase-6 backend (remote mode only).
   Delivers live leaderboard refreshes and server notifications. Auto-
   reconnects with backoff. In local mode this is never started, so the
   offline/static build is unaffected. */

import { ONLINE } from './Backend.js';

export class Realtime {
  constructor() { this.ws = null; this.handlers = {}; this._backoff = 1000; this._closed = false; }

  on(type, cb) { (this.handlers[type] = this.handlers[type] || []).push(cb); }
  _emit(type, msg) { (this.handlers[type] || []).forEach(cb => cb(msg)); }

  connect() {
    if (ONLINE.mode !== 'remote' || !ONLINE.baseUrl) return;
    this._closed = false;
    const url = ONLINE.baseUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws';
    try { this.ws = new WebSocket(url); } catch (_) { return this._retry(); }

    this.ws.onopen = () => {
      this._backoff = 1000;
      if (ONLINE.token) this.ws.send(JSON.stringify({ type: 'auth', token: ONLINE.token }));
    };
    this.ws.onmessage = (ev) => {
      let msg; try { msg = JSON.parse(ev.data); } catch (_) { return; }
      this._emit(msg.type, msg);
    };
    this.ws.onclose = () => { if (!this._closed) this._retry(); };
    this.ws.onerror = () => { try { this.ws.close(); } catch (_) {} };
  }

  _retry() {
    this._backoff = Math.min(this._backoff * 2, 30000);
    setTimeout(() => this.connect(), this._backoff);
  }

  close() { this._closed = true; if (this.ws) try { this.ws.close(); } catch (_) {} }
}
