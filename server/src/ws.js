/* ws.js — WebSocket hub for real-time features: live leaderboard pushes,
   notifications, online-player count and server announcements. Clients
   authenticate by sending {type:'auth', token} after connecting. */
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { CONFIG } from './config.js';

let wss = null;
const clients = new Set();           // all sockets
const byPlayer = new Map();          // pid -> Set<socket>

export function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws) => {
    ws.isAlive = true; ws.pid = null;
    clients.add(ws);
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', (buf) => {
      let msg; try { msg = JSON.parse(buf.toString()); } catch (_) { return; }
      if (msg.type === 'auth' && msg.token) {
        try {
          const p = jwt.verify(msg.token, CONFIG.jwtSecret);
          ws.pid = p.pid;
          if (!byPlayer.has(p.pid)) byPlayer.set(p.pid, new Set());
          byPlayer.get(p.pid).add(ws);
          ws.send(JSON.stringify({ type: 'auth_ok' }));
        } catch (_) { ws.send(JSON.stringify({ type: 'auth_err' })); }
      }
      if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
    });
    ws.on('close', () => {
      clients.delete(ws);
      if (ws.pid && byPlayer.has(ws.pid)) { byPlayer.get(ws.pid).delete(ws); if (!byPlayer.get(ws.pid).size) byPlayer.delete(ws.pid); }
    });
    ws.send(JSON.stringify({ type: 'welcome', online: onlineCount() }));
  });

  // Heartbeat: drop dead sockets.
  setInterval(() => {
    for (const ws of clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; try { ws.ping(); } catch (_) {} }
  }, 30000);
}

export function onlineCount() { return byPlayer.size; }

/** Broadcast to everyone (e.g. leaderboard refresh, announcements). */
export function broadcast(payload) {
  const s = JSON.stringify(payload);
  for (const ws of clients) if (ws.readyState === 1) { try { ws.send(s); } catch (_) {} }
}

/** Send to one player's sockets (e.g. reward notification). */
export function sendToPlayer(pid, payload) {
  const set = byPlayer.get(pid); if (!set) return;
  const s = JSON.stringify(payload);
  for (const ws of set) if (ws.readyState === 1) { try { ws.send(s); } catch (_) {} }
}
