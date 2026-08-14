import 'dotenv/config';

const bool = (value, fallback) =>
  value === undefined ? fallback : ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());

export const PORT = Number(process.env.PORT ?? 3000);

// مسار ملف الإكسل. عند الإطلاق يُوجَّه إلى مجلد المزامنة (OneDrive/Drive) عند المكتب.
export const EXCEL_PATH = process.env.EXCEL_PATH ?? './data/cases.xlsx';
export const EXCEL_SHEET_NAME = process.env.EXCEL_SHEET_NAME ?? '';
// كل كم ثانية نتحقق من تغيّر الملف
export const EXCEL_RELOAD_SECONDS = Number(process.env.EXCEL_RELOAD_SECONDS ?? 60);

// إعدادات WhatsApp Cloud API — تُترك فارغة أثناء التجربة بالمحاكي
export const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN ?? '';
export const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
export const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? '';
export const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION ?? 'v21.0';

export const WHATSAPP_ENABLED = Boolean(WHATSAPP_TOKEN && WHATSAPP_PHONE_NUMBER_ID);

// محاكي المحادثة على المتصفح — يُطفأ في الإنتاج
export const SIMULATOR_ENABLED = bool(process.env.SIMULATOR_ENABLED, true);

// رقم المكتب الذي يُحوَّل إليه العميل عند طلب موظف
export const OFFICE_CONTACT = process.env.OFFICE_CONTACT ?? '0500000000';
export const OFFICE_NAME = process.env.OFFICE_NAME ?? 'مكتب المحاماة';

// مدة صلاحية جلسة المحادثة بالدقائق (لتذكّر خيارات القائمة)
export const SESSION_TTL_MINUTES = Number(process.env.SESSION_TTL_MINUTES ?? 30);
