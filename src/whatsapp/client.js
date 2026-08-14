/**
 * إرسال الرسائل عبر WhatsApp Cloud API.
 * أثناء التجربة بالمحاكي تكون المفاتيح فارغة، فنكتفي بطباعة الرسالة في السجل.
 */
import {
  WHATSAPP_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_API_VERSION,
  WHATSAPP_ENABLED,
} from '../config.js';
import { maskPhone } from '../utils/phone.js';
import { logger } from '../utils/logger.js';

export async function sendText(to, body) {
  if (!WHATSAPP_ENABLED) {
    logger.info('whatsapp disabled — reply not sent', { to: maskPhone(to), chars: body.length });
    return { skipped: true };
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    logger.error('whatsapp send failed', { status: response.status, detail: detail.slice(0, 300) });
    throw new Error(`WhatsApp API responded ${response.status}`);
  }

  return response.json();
}

/** يرسل عدة رسائل بالترتيب حتى تصل بنفس ترتيب المنطق */
export async function sendAll(to, bodies) {
  for (const body of bodies) {
    await sendText(to, body);
  }
}
