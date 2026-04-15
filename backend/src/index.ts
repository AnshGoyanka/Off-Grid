// backend/src/index.ts — Bitpay backend server
// Provides REST endpoints for: health, on-chain balance, settlement relay,
// tx status, account sequence helper, and testnet faucet helper.

import express, {Request, Response, NextFunction} from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import {config} from './config';

// Routes
import healthRouter from './routes/health';
import balanceRouter from './routes/balance';
import settleRouter from './routes/settle';
import txRouter from './routes/tx';
import nonceRouter from './routes/nonce';
import faucetRouter from './routes/faucet';

const app = express();

// ─── Security middleware ────────────────────────────────────────────────────

app.use(
  cors({
    origin: config.corsOrigins === '*' ? '*' : config.corsOrigins.split(','),
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  }),
);

// Parse JSON body — cap at 64kb to prevent large-payload DoS
app.use(express.json({limit: '64kb'}));

// General rate limit: 200 req / 15 min per IP
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxGeneral,
  standardHeaders: true,
  legacyHeaders: false,
  message: {error: 'Too many requests', message: 'Rate limit exceeded. Try again later.'},
});

// Faucet rate limit: 5 req / 15 min per IP (stricter)
const faucetLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxFaucet,
  standardHeaders: true,
  legacyHeaders: false,
  message: {error: 'Too many requests', message: 'Faucet rate limit exceeded. Wait 15 minutes.'},
});

app.use(generalLimiter);

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use('/api/health',   healthRouter);
app.use('/api/balance',  balanceRouter);
app.use('/api/settle',   settleRouter);
app.use('/api/tx',       txRouter);
app.use('/api/nonce',    nonceRouter);
app.use('/api/faucet',   faucetLimiter, faucetRouter);

// Root — redirect to health
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/api/health');
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    message: 'Available endpoints: GET /api/health, GET /api/balance/:address, POST /api/settle, GET /api/tx/:hash, GET /api/nonce/:address, POST /api/faucet',
  });
});

// Global error handler — never leak stack traces in production
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server] Unhandled error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : 'Something went wrong',
  });
});

// ─── Start ──────────────────────────────────────────────────────────────────

export {app}; // exported for testing

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`\n🟢 Bitpay Backend`);
    console.log(`   Environment : ${config.nodeEnv}`);
    console.log(`   Listening   : http://localhost:${config.port}`);
    console.log(`   Network     : ${config.algorand.network}`);
    console.log(`   Algod       : ${config.algorand.algodUrl}`);
    console.log(`   Indexer     : ${config.algorand.indexerUrl}`);
    console.log(`\n   Endpoints:`);
    console.log(`   GET  /api/health`);
    console.log(`   GET  /api/balance/:address`);
    console.log(`   POST /api/settle`);
    console.log(`   GET  /api/tx/:hash`);
    console.log(`   GET  /api/nonce/:address`);
    console.log(`   POST /api/faucet\n`);
  });
}
