import express from 'express';

import { PORT, SIMULATOR_ENABLED, WHATSAPP_ENABLED } from './config.js';
import { store } from './store/excelStore.js';
import { webhookRouter } from './whatsapp/webhook.js';
import { simulatorRouter } from './simulator/router.js';
import { logger } from './utils/logger.js';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  const stats = store.stats();
  res.status(stats.error ? 503 : 200).json({
    status: stats.error ? 'degraded' : 'ok',
    whatsapp: WHATSAPP_ENABLED ? 'connected' : 'simulator-only',
    ...stats,
  });
});

app.use(webhookRouter);
if (SIMULATOR_ENABLED) app.use(simulatorRouter);

store.startWatching();

app.listen(PORT, () => {
  const stats = store.stats();
  logger.info('server started', { port: PORT, cases: stats.cases, whatsapp: WHATSAPP_ENABLED });
  if (SIMULATOR_ENABLED) logger.info(`simulator ready at http://localhost:${PORT}`);
  if (stats.error) logger.error('excel not loaded', { error: stats.error });
});
