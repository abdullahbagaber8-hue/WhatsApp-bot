/**
 * محاكي محادثة للعرض والتجربة بدون أي إعداد على واتساب.
 * يُطفأ في الإنتاج عبر SIMULATOR_ENABLED=false.
 */
import { Router } from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { handleIncomingMessage } from '../bot/handler.js';
import { clearSession } from '../bot/session.js';
import { store } from '../store/excelStore.js';
import { normalizePhone } from '../utils/phone.js';

const here = dirname(fileURLToPath(import.meta.url));

export const simulatorRouter = Router();

simulatorRouter.get('/', (_req, res) => {
  res.sendFile(join(here, 'public', 'index.html'));
});

/** أرقام العملاء في الملف، لتسهيل التجربة بالتبديل بينهم */
simulatorRouter.get('/api/demo-numbers', (_req, res) => {
  const seen = new Map();
  for (const item of store.cases) {
    if (!seen.has(item.phone_normalized)) {
      seen.set(item.phone_normalized, { phone: item.phone_normalized, name: item.client_name, cases: 0 });
    }
    seen.get(item.phone_normalized).cases += 1;
  }
  res.json({ numbers: [...seen.values()], stats: store.stats() });
});

/** تصفير الجلسة عند التبديل بين الأرقام حتى يبدأ العرض من الترحيب */
simulatorRouter.post('/api/reset', (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (phone) clearSession(phone);
  res.json({ ok: true });
});

simulatorRouter.post('/api/message', async (req, res) => {
  const { phone, text } = req.body ?? {};
  if (!phone) return res.status(400).json({ error: 'phone is required' });

  const replies = await handleIncomingMessage(phone, text ?? '');
  res.json({ replies });
});
