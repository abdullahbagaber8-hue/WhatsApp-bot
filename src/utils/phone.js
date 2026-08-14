/**
 * توحيد صيغ أرقام الجوال.
 * ملف المكتب عادة يحوي صيغاً مختلطة (0501234567 / +966501234567 / 966501234567)
 * بينما واتساب يرسل الرقم دائماً بالصيغة الدولية بدون +.
 * الهدف: تحويل كل الصيغ إلى مفتاح واحد قابل للمطابقة.
 */

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EXTENDED_ARABIC_INDIC = '۰۱۲۳۴۵۶۷۸۹';

/** يحوّل الأرقام العربية والفارسية إلى أرقام لاتينية */
export function toLatinDigits(input = '') {
  return String(input).replace(/[٠-٩۰-۹]/g, (char) => {
    const arabic = ARABIC_INDIC.indexOf(char);
    if (arabic !== -1) return String(arabic);
    return String(EXTENDED_ARABIC_INDIC.indexOf(char));
  });
}

/**
 * يعيد الرقم بالصيغة الدولية بدون + وبدون فواصل، أو '' إذا كان غير صالح.
 * الافتراض: الأرقام المحلية سعودية (966). يُغيَّر DEFAULT_COUNTRY_CODE عند الحاجة.
 */
const DEFAULT_COUNTRY_CODE = '966';

export function normalizePhone(input) {
  if (input === undefined || input === null) return '';

  let digits = toLatinDigits(input).replace(/[^\d]/g, '');
  if (!digits) return '';

  // 00966... → 966...
  if (digits.startsWith('00')) digits = digits.slice(2);

  // 0501234567 → 966501234567
  if (digits.startsWith('0')) {
    digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
  } else if (digits.length === 9 && digits.startsWith('5')) {
    // 501234567 (بدون صفر وبدون مفتاح دولي)
    digits = DEFAULT_COUNTRY_CODE + digits;
  }

  // أقصر من ذلك ليس رقم جوال
  return digits.length >= 10 ? digits : '';
}

/** صيغة عرض مختصرة للسجلات دون كشف الرقم كاملاً */
export function maskPhone(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return '—';
  return `${normalized.slice(0, 5)}****${normalized.slice(-3)}`;
}
