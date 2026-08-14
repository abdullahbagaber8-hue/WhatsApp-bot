/**
 * كل نصوص البوت في مكان واحد ليسهل على المكتب مراجعتها وتعديل الصياغة.
 */
import { OFFICE_CONTACT, OFFICE_NAME } from '../config.js';

const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** يحوّل 2026-09-03 إلى "الخميس 2026-09-03" ليسهل على العميل قراءته */
export function formatHearingDate(value) {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return `${WEEKDAYS[parsed.getDay()]} ${value}`;
}

const DISCLAIMER = 'هذه الخدمة للاستعلام عن حالة القضية فقط ولا تُعد استشارة قانونية.';

export const messages = {
  welcome: (clientName) =>
    `أهلاً ${clientName} 👋\nمرحباً بك في خدمة الاستعلام الآلي لـ${OFFICE_NAME}.\n\n` +
    'اختر من القائمة بإرسال الرقم:\n' +
    '1️⃣ حالة قضاياي\n' +
    '2️⃣ موعد الجلسة القادمة\n' +
    '3️⃣ التحدث مع موظف\n\n' +
    'أو أرسل رقم القضية مباشرة.',

  unknownCaller: () =>
    'عذراً، لم نجد أي قضايا مرتبطة برقم الجوال الذي تراسلنا منه.\n\n' +
    'إذا كنت من عملاء المكتب، فقد يكون رقمك مسجّلاً لدينا بصيغة أخرى.\n' +
    `يرجى التواصل مع ${OFFICE_NAME} على: ${OFFICE_CONTACT}`,

  caseCard: (item) => {
    const lines = [
      `📁 *القضية ${item.case_number}*`,
      `👤 الموكل: ${item.client_name}`,
    ];

    if (item.case_type) lines.push(`⚖️ النوع: ${item.case_type}`);
    if (item.court) lines.push(`🏛️ المحكمة: ${item.court}`);
    if (item.status) lines.push(`📌 الحالة: ${item.status}`);

    if (item.next_hearing_date) {
      const time = item.next_hearing_time ? ` الساعة ${item.next_hearing_time}` : '';
      lines.push(`📅 الجلسة القادمة: ${formatHearingDate(item.next_hearing_date)}${time}`);
    } else {
      lines.push('📅 الجلسة القادمة: لم يُحدَّد موعد بعد');
    }

    if (item.last_update_note) lines.push(`📝 آخر تحديث: ${item.last_update_note}`);
    if (item.assigned_lawyer) lines.push(`👔 المحامي المسؤول: ${item.assigned_lawyer}`);

    lines.push('', `_${DISCLAIMER}_`);
    return lines.join('\n');
  },

  caseList: (items) => {
    const lines = [`لديك ${items.length} قضايا مسجّلة لدى المكتب:`, ''];
    items.forEach((item, index) => {
      const status = item.status ? ` — ${item.status}` : '';
      lines.push(`${index + 1}. ${item.case_number} (${item.case_type || 'غير محدد'})${status}`);
    });
    lines.push('', 'أرسل رقم الخيار لعرض التفاصيل، أو 0 للرجوع للقائمة الرئيسية.');
    return lines.join('\n');
  },

  hearingsSummary: (items) => {
    const upcoming = items
      .filter((item) => item.next_hearing_date)
      .sort((a, b) => a.next_hearing_date.localeCompare(b.next_hearing_date));

    if (!upcoming.length) {
      return 'لا توجد جلسات محددة حالياً في أي من قضاياك.\nسيتم تحديث البيانات فور تحديد المحكمة للموعد.';
    }

    const lines = ['📅 *جلساتك القادمة:*', ''];
    for (const item of upcoming) {
      const time = item.next_hearing_time ? ` الساعة ${item.next_hearing_time}` : '';
      lines.push(`• ${item.case_number}: ${formatHearingDate(item.next_hearing_date)}${time}`);
      if (item.court) lines.push(`  ${item.court}`);
    }
    lines.push('', 'أرسل 0 للرجوع للقائمة الرئيسية.');
    return lines.join('\n');
  },

  caseNotFound: (query) =>
    `لم نجد قضية بالرقم "${query}" ضمن قضاياك المسجّلة.\n\n` +
    'تأكد من رقم القضية، أو أرسل 1 لعرض قائمة قضاياك.',

  handoff: () =>
    `سيتم تحويلك لأحد موظفي ${OFFICE_NAME}.\n` +
    `للاستعجال يمكنك الاتصال مباشرة على: ${OFFICE_CONTACT}\n\n` +
    'أوقات العمل: الأحد إلى الخميس، 9 صباحاً – 5 مساءً.',

  fallback: () =>
    'لم أفهم طلبك 🤔\n\n' +
    'يمكنك إرسال:\n' +
    '1️⃣ لعرض حالة قضاياك\n' +
    '2️⃣ لمعرفة موعد الجلسة القادمة\n' +
    '3️⃣ للتحدث مع موظف\n\n' +
    'أو أرسل رقم القضية مباشرة.',

  invalidOption: () => 'الخيار غير صحيح. أرسل رقماً من القائمة، أو 0 للرجوع للقائمة الرئيسية.',

  legalQuestion: () =>
    'سؤالك يحتاج مراجعة المحامي المختص، ولا يمكن للخدمة الآلية الإجابة عليه.\n\n' +
    `تم تسجيل طلبك وسيتواصل معك المكتب. للاستعجال: ${OFFICE_CONTACT}`,

  serviceError: () =>
    'حدث خلل مؤقت في الخدمة 🙏\n' +
    `يرجى المحاولة بعد قليل أو التواصل مع المكتب على: ${OFFICE_CONTACT}`,
};
