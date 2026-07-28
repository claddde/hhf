/* index.js — HoodLust Survivor backend entrypoint.
   Wires Express (REST) + WebSocket on one HTTP server, security
   middleware, all route modules, the weekly-reward scheduler and daily
   backups. Production-ready and horizontally scalable behind a proxy. */
import http from 'node:http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { CONFIG } from './config.js';
import { log } from './logger.js';
import { initWebSocket, onlineCount, broadcast } from './ws.js';
import { authRouter } from './routes/auth.js';
import { playerRouter } from './routes/player.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { rewardsRouter } from './routes/rewards.js';
import { ecosystemRouter } from './routes/ecosystem.js';
import { adminRouter } from './routes/admin.js';
import { eventContext } from './services/events.js';
import { processWeeklyRewards } from './services/rewards.js';
import { scheduleBackups } from './backup.js';

const app = express();

// --- security & parsing ---
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: CONFIG.corsOrigins.length ? CONFIG.corsOrigins : true, credentials: true }));
app.use(express.json({ limit: '128kb' }));

// Global rate limit (per IP); tighten per-route as needed.
app.use('/api/', rateLimit({ windowMs: 60_000, max: 240, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/', rateLimit({ windowMs: 60_000, max: 30 }));

// --- health & public context ---
app.get('/api/health', (req, res) => res.json({ ok: true, online: onlineCount(), uptime: Math.floor(process.uptime()) }));
app.get('/api/context', async (req, res) => res.json({ events: await eventContext() }));

// --- routes ---
app.use('/api/auth', authRouter);
app.use('/api/player', playerRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/rewards', rewardsRouter);
app.use('/api/ecosystem', ecosystemRouter);
app.use('/api/admin', adminRouter);

// Static admin dashboard (protected client-side by admin token).
app.use('/admin', express.static(new URL('../admin', import.meta.url).pathname));

// --- error handler ---
app.use((err, req, res, next) => { log.error('unhandled', { err: err.message, path: req.path }); res.status(500).json({ error: 'SERVER_ERROR' }); });

// --- HTTP + WebSocket on one server ---
const server = http.createServer(app);
initWebSocket(server);

// --- schedulers ---
// Weekly reward processor: every 10 min, process the just-finished week once.
setInterval(() => { processWeeklyRewards({}).then(r => { if (r.processed) broadcast({ type: 'notification', kind: 'reward', title: 'Weekly rewards distributed', body: `${r.granted.length} winners` }); }).catch(e => log.error('weekly', { err: e.message })); }, 10 * 60 * 1000);
scheduleBackups();

server.listen(CONFIG.port, () => log.info(`HoodLust backend listening on :${CONFIG.port} (${CONFIG.env})`));

// Graceful shutdown.
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { log.info('shutting down'); server.close(() => process.exit(0)); });
