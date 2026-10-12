import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { authenticate } from './server/auth.js';
import { authRouter } from './server/routes/authRoutes.js';
import { ridesRouter } from './server/routes/ridesRoutes.js';
import { passengerRouter } from './server/routes/passengerRoutes.js';
import { driverRouter } from './server/routes/driverRoutes.js';
import { operatorRouter } from './server/routes/operatorRoutes.js';
import { adminRouter } from './server/routes/adminRoutes.js';
import { securityRouter } from './server/routes/securityRoutes.js';
import { paymentRouter } from './server/routes/paymentRoutes.js';
import { testRouter } from './server/routes/testRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Authentication token reader middleware
app.use(authenticate);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    platform: 'ShinkafiRide.ng',
    service: 'Transport Management & Security Platform',
    region: 'Shinkafi, Zamfara State, Nigeria',
    timestamp: new Date().toISOString()
  });
});

// Mount modular REST APIs
app.use('/api/auth', authRouter);
app.use('/api/rides', ridesRouter);
app.use('/api/passenger', passengerRouter);
app.use('/api/driver', driverRouter);
app.use('/api/operator', operatorRouter);
app.use('/api/admin', adminRouter);
app.use('/api/security', securityRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/tests', testRouter);

// Serve static or integrate Vite
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[ShinkafiRide.ng] Server active and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[ShinkafiRide.ng] Server startup failure:', err);
});
