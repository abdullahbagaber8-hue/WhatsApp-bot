/**
 * حالة محادثة قصيرة العمر في الذاكرة، لتذكّر القائمة المعروضة على العميل
 * حتى نفهم معنى "2" في رسالته التالية.
 * الذاكرة كافية للتجربة؛ عند التوسّع تُستبدل بـ Redis أو SQLite دون تغيير الواجهة.
 */
import { SESSION_TTL_MINUTES } from '../config.js';

const sessions = new Map();
const ttlMs = SESSION_TTL_MINUTES * 60 * 1000;

export function getSession(phone) {
  const existing = sessions.get(phone);
  if (existing && Date.now() - existing.updatedAt < ttlMs) return existing;

  const fresh = { phone, greeted: false, pendingList: null, updatedAt: Date.now() };
  sessions.set(phone, fresh);
  return fresh;
}

export function saveSession(session) {
  session.updatedAt = Date.now();
  sessions.set(session.phone, session);
}

export function resetSessions() {
  sessions.clear();
}

/** إنهاء جلسة رقم واحد — يستخدمه المحاكي ليبدأ كل عرض من نقطة نظيفة */
export function clearSession(phone) {
  sessions.delete(phone);
}

/** تنظيف دوري للجلسات المنتهية حتى لا تنمو الذاكرة */
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [phone, session] of sessions) {
    if (now - session.updatedAt >= ttlMs) sessions.delete(phone);
  }
}, ttlMs);
cleanup.unref?.();
