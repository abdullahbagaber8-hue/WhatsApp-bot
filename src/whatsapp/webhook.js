/**
 * Webhook الخاص بـ WhatsApp Cloud API.
 * GET  → تحقق Meta من الرابط عند الربط
 * POST → استقبال الرسائل الواردة
 */
import { Router } from 'express';

import { WHATSAPP_VERIFY_TOKEN } from '../config.js';
import { handleIncomingMessage } from '../bot/handler.js';
import { sendAll } from './client.js';
import { maskPhone } from '../utils/phone.js';
import { logger } from '../utils/logger.js';
import { messages } from '../bot/messages.js';

export const webhookRouter = Router();

webhookRouter.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token && token === WHATSAPP_VERIFY_TOKEN) {
    logger.info('webhook verified by meta');
    return res.status(200).send(challenge);
  }

  logger.warn('webhook verification rejected');
  return res.sendStatus(403);
});

webhookRouter.post('/webhook', async (req, res) => {
  // Meta تعيد المحاولة إذا لم نرد خلال ثوانٍ، لذا نرد فوراً ثم نعالج.
  res.sendStatus(200);

  try {
    const entries = req.body?.entry ?? [];

    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};

        for (const message of value.messages ?? []) {
          // نتعامل مع الرسائل النصية فقط في هذه المرحلة
          if (message.type !== 'text') {
            await sendAll(message.from, [messages.fallback()]);
            continue;
          }

          const from = message.from;
          const body = message.text?.body ?? '';
          logger.info('message received', { from: maskPhone(from), chars: body.length });

          const replies = await handleIncomingMessage(from, body);
          await sendAll(from, replies);
        }
      }
    }
  } catch (error) {
    logger.error('webhook processing failed', { message: error.message });
  }
});
