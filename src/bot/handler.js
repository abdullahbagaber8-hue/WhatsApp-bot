/**
 * منطق المحادثة. دالة نقية بقدر الإمكان: تستقبل (رقم، نص) وتعيد نصوص الرد،
 * حتى يستخدمها الواتساب والمحاكي والاختبارات بنفس الطريقة.
 */
import { store } from '../store/excelStore.js';
import { getSession, saveSession } from './session.js';
import { messages } from './messages.js';
import { normalizePhone, maskPhone, toLatinDigits } from '../utils/phone.js';
import { logger } from '../utils/logger.js';

const GREETINGS = ['السلام', 'سلام', 'مرحبا', 'مرحبتين', 'هلا', 'اهلا', 'أهلا', 'صباح', 'مساء', 'hi', 'hello', 'start', 'ابدأ', 'البدايه', 'البداية'];
const MENU_WORDS = ['قائمة', 'القائمة', 'خيارات', 'رجوع', 'menu'];
const HANDOFF_WORDS = ['موظف', 'محامي', 'اتصال', 'تحويل', 'اكلم', 'أكلم', 'بشر', 'استفسار', 'استفسر', 'المكتب'];
const HEARING_WORDS = ['جلسة', 'جلسه', 'الجلسة', 'الجلسه', 'موعد', 'مواعيد', 'جلسات'];
// ملاحظة: لا تُضف هنا كلمات مثل «الحكم» أو «اعتراض» — تسبق فحص الأسئلة القانونية فتبتلعها
const STATUS_WORDS = [
  'حالة', 'حاله', 'وضع', 'قضاياي', 'قضيتي', 'قضايا', 'قضيه', 'القضيه', 'القضية',
  'ملفي', 'ملف', 'الملف', 'مستجدات', 'تحديث', 'جديد', 'وصل', 'تفاصيل',
  'صدر', 'تطور', 'دعوى', 'الدعوى', 'اخر', 'آخر',
];
/**
 * أسئلة الرأي القانوني. تُفحص قبل كلمات الحالة، لأن سؤالاً مثل
 * «ليش صدر الحكم ضدي» يحوي كلمة حالة وسؤالاً قانونياً معاً — والأولوية للثاني.
 * لذلك تُكتب هنا عبارات محددة لا كلمات عامة مثل «كيف» وحدها.
 */
const LEGAL_QUESTION_HINTS = [
  'ليش', 'لماذا', 'وش السبب', 'ايش السبب',
  'هل يمكن', 'هل ينفع', 'هل اقدر', 'هل أقدر',
  'كيف اقدر', 'كيف أقدر', 'كيف يمكن',
  'رأيك', 'رايك', 'نصيحة', 'نصيحه', 'استشارة', 'استشاره', 'أستشير', 'استشير',
  'اعترض', 'أعترض', 'اعتراض',
  'ماذا لو', 'وش الحل', 'ايش الحل', 'وش اسوي', 'ايش اسوي',
];

const containsAny = (text, words) => words.some((word) => text.includes(word));

/** يبدو رقم قضية: يحوي أرقاماً وطوله معقول (مثل 1445/ت/2301 أو 2301) */
const looksLikeCaseNumber = (text) => /\d/.test(text) && text.length >= 3 && text.length <= 40;

/**
 * @param {string} rawPhone رقم المرسل كما ورد من واتساب
 * @param {string} rawText  نص الرسالة
 * @returns {Promise<string[]>} رسائل الرد بالترتيب
 */
export async function handleIncomingMessage(rawPhone, rawText) {
  const phone = normalizePhone(rawPhone);
  const text = toLatinDigits(String(rawText ?? '')).trim();

  if (!phone) return [messages.unknownCaller()];

  // التحقق من الهوية: رقم الجوال نفسه هو المفتاح. لا قضايا لهذا الرقم ⇒ لا بيانات.
  const owned = store.findByPhone(phone);
  if (owned.length === 0) {
    logger.info('unknown caller', { phone: maskPhone(phone) });
    return [messages.unknownCaller()];
  }

  const session = getSession(phone);
  const clientName = owned[0].client_name;
  const replies = [];

  const respond = (...items) => {
    replies.push(...items);
    saveSession(session);
    return replies;
  };

  // أول تواصل خلال هذه الجلسة: ترحيب قبل أي شيء آخر
  if (!session.greeted) {
    session.greeted = true;
    replies.push(messages.welcome(clientName));

    // لو كانت أول رسالة مجرد تحية، نكتفي بالترحيب
    if (!text || containsAny(text.toLowerCase(), GREETINGS)) {
      return respond();
    }
  }

  const lower = text.toLowerCase();

  // التحية في أي وقت تعيد عرض القائمة، لا في أول رسالة فقط
  if (containsAny(lower, GREETINGS)) {
    session.pendingList = null;
    return respond(messages.welcome(clientName));
  }

  // اختيار من قائمة معروضة سابقاً
  if (session.pendingList?.length) {
    const index = Number.parseInt(text, 10);
    if (Number.isInteger(index) && index >= 1 && index <= session.pendingList.length) {
      const caseNumber = session.pendingList[index - 1];
      const item = store.findCaseForPhone(phone, caseNumber);
      session.pendingList = null;
      logger.info('case viewed from list', { phone: maskPhone(phone) });
      return respond(item ? messages.caseCard(item) : messages.serviceError());
    }
  }

  // 0 أو "رجوع" → القائمة الرئيسية
  if (text === '0' || containsAny(lower, MENU_WORDS)) {
    session.pendingList = null;
    return respond(messages.welcome(clientName));
  }

  // سؤال قانوني — يُفحص قبل كلمات الحالة كي لا تبتلعه
  if (containsAny(lower, LEGAL_QUESTION_HINTS)) {
    session.pendingList = null;
    logger.warn('legal question received', { phone: maskPhone(phone) });
    return respond(messages.legalQuestion());
  }

  // 1 أو سؤال عن الحالة → عرض القضايا
  if (text === '1' || containsAny(lower, STATUS_WORDS)) {
    if (owned.length === 1) {
      session.pendingList = null;
      logger.info('single case viewed', { phone: maskPhone(phone) });
      return respond(messages.caseCard(owned[0]));
    }
    session.pendingList = owned.map((item) => item.case_number);
    return respond(messages.caseList(owned));
  }

  // 2 أو سؤال عن الجلسات
  if (text === '2' || containsAny(lower, HEARING_WORDS)) {
    session.pendingList = null;
    return respond(messages.hearingsSummary(owned));
  }

  // 3 أو طلب موظف
  if (text === '3' || containsAny(lower, HANDOFF_WORDS)) {
    session.pendingList = null;
    logger.warn('handoff requested', { phone: maskPhone(phone) });
    return respond(messages.handoff());
  }

  // رقم قضية مباشر — يُبحث عنه ضمن قضايا هذا الرقم فقط
  if (looksLikeCaseNumber(text)) {
    const item = store.findCaseForPhone(phone, text);
    if (item) {
      session.pendingList = null;
      logger.info('case viewed by number', { phone: maskPhone(phone) });
      return respond(messages.caseCard(item));
    }

    // ربما أرسل اسمه بدل الرقم
    const byName = store.findByNameForPhone(phone, text);
    if (byName.length === 1) return respond(messages.caseCard(byName[0]));
    if (byName.length > 1) {
      session.pendingList = byName.map((entry) => entry.case_number);
      return respond(messages.caseList(byName));
    }

    return respond(messages.caseNotFound(text));
  }

  // بحث بالاسم
  const byName = store.findByNameForPhone(phone, text);
  if (byName.length === 1) {
    session.pendingList = null;
    return respond(messages.caseCard(byName[0]));
  }
  if (byName.length > 1) {
    session.pendingList = byName.map((entry) => entry.case_number);
    return respond(messages.caseList(byName));
  }

  session.pendingList = null;
  return respond(messages.fallback());
}
