import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import routes from './routes/index.js';
import webhookRoutes from './routes/webhook.routes.js';
import { globalLimiter } from './middlewares/rateLimiter.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN }));

// Keep the raw bytes: the webhook handler needs them to verify Monnify's HMAC-SHA512 signature
app.use(express.json({ limit: '100kb', verify: (req, _res, buf) => { req.rawBody = buf; } }));

// Webhook is mounted BEFORE the rate-limited public API
app.use('/api/webhooks', webhookRoutes);
app.use('/api', globalLimiter, routes);
app.use(notFound);
app.use(errorHandler);

export default app;
