/**
 * يولّد ملف إكسل تجريبي (بيانات وهمية) بنفس القالب المتوقع من مكتب المحاماة.
 * التشغيل: npm run seed
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import XLSX from 'xlsx';

import { EXCEL_PATH } from '../src/config.js';

// رقم واحد يملك أكثر من قضية لاختبار قائمة الاختيار المتعددة
const DEMO_PHONE = '966501234567';

const rows = [
  {
    case_number: '1445/ت/2301',
    client_name: 'محمد عبدالله السالم',
    client_phone: DEMO_PHONE,
    case_type: 'تجاري',
    court: 'المحكمة التجارية بالرياض',
    status: 'قيد المرافعة',
    next_hearing_date: '2026-09-03',
    next_hearing_time: '10:30',
    last_update_note: 'تم تقديم المذكرة الجوابية وننتظر رد الطرف الآخر',
    assigned_lawyer: 'أ. خالد الحربي',
  },
  {
    case_number: '1445/ع/1180',
    client_name: 'محمد عبدالله السالم',
    client_phone: DEMO_PHONE,
    case_type: 'عمالي',
    court: 'المحكمة العمالية بالرياض',
    status: 'صدر الحكم الابتدائي',
    next_hearing_date: '',
    next_hearing_time: '',
    last_update_note: 'صدر الحكم لصالح الموكل، ومدة الاعتراض تنتهي 2026-08-28',
    assigned_lawyer: 'أ. خالد الحربي',
  },
  {
    case_number: '1445/ح/0742',
    client_name: 'نورة سعد القحطاني',
    client_phone: '966555987654',
    case_type: 'أحوال شخصية',
    court: 'محكمة الأحوال الشخصية بجدة',
    status: 'بانتظار تحديد موعد الجلسة',
    next_hearing_date: '',
    next_hearing_time: '',
    last_update_note: 'تم قيد الدعوى وننتظر إشعار المحكمة بموعد الجلسة الأولى',
    assigned_lawyer: 'أ. سارة العتيبي',
  },
  {
    case_number: '1446/ت/0055',
    client_name: 'شركة الأفق للمقاولات',
    client_phone: '966533112244',
    case_type: 'تجاري',
    court: 'المحكمة التجارية بالدمام',
    status: 'قيد المرافعة',
    next_hearing_date: '2026-08-19',
    next_hearing_time: '09:00',
    last_update_note: 'الجلسة القادمة لتبادل المذكرات، يرجى إحضار أصل العقد',
    assigned_lawyer: 'أ. خالد الحربي',
  },
  {
    case_number: '1446/ج/0311',
    client_name: 'فهد ناصر الدوسري',
    client_phone: '966544778899',
    case_type: 'جزائي',
    court: 'المحكمة الجزائية بالرياض',
    status: 'مؤجلة',
    next_hearing_date: '2026-10-12',
    next_hearing_time: '11:15',
    last_update_note: 'أُجلت الجلسة بناءً على طلب الادعاء لاستكمال التحقيق',
    assigned_lawyer: 'أ. سارة العتيبي',
  },
  {
    case_number: '1446/ن/0902',
    client_name: 'عبدالرحمن يوسف الزهراني',
    client_phone: '966566334455',
    case_type: 'تنفيذ',
    court: 'محكمة التنفيذ بالرياض',
    status: 'قيد التنفيذ',
    next_hearing_date: '',
    next_hearing_time: '',
    last_update_note: 'تم إيقاع الحجز على حسابات المنفذ ضده',
    assigned_lawyer: 'أ. خالد الحربي',
  },
];

const sheet = XLSX.utils.json_to_sheet(rows);
sheet['!cols'] = [
  { wch: 16 }, { wch: 26 }, { wch: 16 }, { wch: 14 }, { wch: 30 },
  { wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 50 }, { wch: 18 },
];

const book = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(book, sheet, 'القضايا');

const target = resolve(EXCEL_PATH);
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }));

console.log(`تم إنشاء ${rows.length} قضية تجريبية في: ${target}`);
console.log(`رقم التجربة الذي يملك قضيتين: ${DEMO_PHONE}`);
