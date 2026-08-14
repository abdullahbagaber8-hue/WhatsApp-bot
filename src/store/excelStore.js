/**
 * يقرأ ملف الإكسل ويحوّله إلى فهرس في الذاكرة.
 * المكتب يستمر بالعمل على الإكسل كالمعتاد؛ البوت يعيد التحميل تلقائياً عند تغيّر الملف.
 */
import { statSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import XLSX from 'xlsx';

import { EXCEL_PATH, EXCEL_SHEET_NAME, EXCEL_RELOAD_SECONDS } from '../config.js';
import { normalizePhone } from '../utils/phone.js';
import { logger } from '../utils/logger.js';

/**
 * مرادفات أسماء الأعمدة: نقبل الإنجليزي القياسي والعربي الشائع،
 * حتى لا نجبر المكتب على إعادة تسمية أعمدة ملفه.
 */
const COLUMN_ALIASES = {
  case_number: ['case_number', 'caseno', 'case no', 'رقم القضية', 'رقم القضيه', 'رقم الدعوى', 'رقم الملف'],
  client_name: ['client_name', 'client', 'name', 'اسم الموكل', 'اسم العميل', 'الموكل', 'العميل', 'الاسم'],
  client_phone: ['client_phone', 'phone', 'mobile', 'رقم الجوال', 'الجوال', 'جوال العميل', 'رقم العميل', 'الهاتف'],
  case_type: ['case_type', 'type', 'نوع القضية', 'نوع القضيه', 'النوع', 'التصنيف'],
  court: ['court', 'المحكمة', 'المحكمه', 'الجهة', 'الدائرة'],
  status: ['status', 'case_status', 'الحالة', 'الحاله', 'حالة القضية', 'الوضع'],
  next_hearing_date: ['next_hearing_date', 'hearing_date', 'موعد الجلسة', 'موعد الجلسه', 'تاريخ الجلسة', 'تاريخ الجلسه', 'الجلسة القادمة'],
  next_hearing_time: ['next_hearing_time', 'hearing_time', 'وقت الجلسة', 'وقت الجلسه', 'الساعة'],
  last_update_note: ['last_update_note', 'notes', 'note', 'ملاحظات', 'آخر تحديث', 'اخر تحديث', 'الملاحظات'],
  assigned_lawyer: ['assigned_lawyer', 'lawyer', 'المحامي', 'المحامي المسؤول', 'الوكيل'],
};

const canonicalKey = (header) => {
  const cleaned = String(header ?? '').trim().toLowerCase().replace(/[_\s]+/g, ' ');
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some((alias) => alias.toLowerCase().replace(/[_\s]+/g, ' ') === cleaned)) return key;
  }
  return null;
};

const cellToText = (value) => {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) {
    // نعرض التاريخ بصيغة YYYY-MM-DD بالتوقيت المحلي للملف
    const pad = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).trim();
};

/** رقم القضية للمقارنة: بدون مسافات أو فواصل، لأن العميل قد يكتبه بصيغة مختلفة */
export const caseKey = (value) =>
  String(value ?? '')
    .replace(/[\s\-–—_/\\.]+/g, '')
    .toLowerCase();

/** تطبيع نص عربي للبحث بالاسم: إزالة التشكيل وتوحيد الألف والهاء والياء */
export const normalizeArabic = (value) =>
  String(value ?? '')
    .replace(/[ً-ْٰ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

class ExcelStore {
  constructor() {
    this.cases = [];
    this.byPhone = new Map();
    this.lastLoadedAt = null;
    this.lastMtimeMs = 0;
    this.loadError = null;
  }

  get path() {
    return resolve(EXCEL_PATH);
  }

  load({ force = false } = {}) {
    const file = this.path;

    if (!existsSync(file)) {
      this.loadError = `ملف الإكسل غير موجود: ${file}`;
      logger.error('excel file missing', { path: file });
      return false;
    }

    const { mtimeMs } = statSync(file);
    if (!force && mtimeMs === this.lastMtimeMs) return false;

    try {
      const book = XLSX.readFile(file, { cellDates: true });
      const sheetName = EXCEL_SHEET_NAME || book.SheetNames[0];
      const sheet = book.Sheets[sheetName];
      if (!sheet) throw new Error(`الورقة "${sheetName}" غير موجودة في الملف`);

      const raw = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false, dateNF: 'yyyy-mm-dd' });

      const cases = [];
      let skipped = 0;

      for (const row of raw) {
        const record = {};
        for (const [header, value] of Object.entries(row)) {
          const key = canonicalKey(header);
          if (key) record[key] = cellToText(value);
        }

        // صف بلا رقم قضية أو بلا جوال لا يمكن استخدامه — نتجاوزه بدل أن يكسر التحميل
        if (!record.case_number || !record.client_phone) {
          skipped += 1;
          continue;
        }

        record.phone_normalized = normalizePhone(record.client_phone);
        record.case_key = caseKey(record.case_number);
        record.name_normalized = normalizeArabic(record.client_name);

        if (!record.phone_normalized) {
          skipped += 1;
          continue;
        }

        cases.push(record);
      }

      const byPhone = new Map();
      for (const item of cases) {
        if (!byPhone.has(item.phone_normalized)) byPhone.set(item.phone_normalized, []);
        byPhone.get(item.phone_normalized).push(item);
      }

      this.cases = cases;
      this.byPhone = byPhone;
      this.lastMtimeMs = mtimeMs;
      this.lastLoadedAt = new Date();
      this.loadError = null;

      logger.info('excel loaded', { cases: cases.length, skipped, sheet: sheetName });
      return true;
    } catch (error) {
      this.loadError = error.message;
      logger.error('excel load failed', { message: error.message });
      return false;
    }
  }

  startWatching() {
    this.load({ force: true });
    const interval = Math.max(5, EXCEL_RELOAD_SECONDS) * 1000;
    const timer = setInterval(() => this.load(), interval);
    timer.unref?.();
    return timer;
  }

  /** كل قضايا رقم جوال معيّن — أساس التحقق من الهوية */
  findByPhone(phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) return [];
    return this.byPhone.get(normalized) ?? [];
  }

  /**
   * البحث برقم القضية داخل قضايا هذا الرقم فقط.
   * لا يوجد بحث عام برقم القضية — هذا هو ضمان الخصوصية.
   */
  findCaseForPhone(phone, query) {
    const owned = this.findByPhone(phone);
    const key = caseKey(query);
    if (!key) return null;
    return (
      owned.find((item) => item.case_key === key) ??
      owned.find((item) => item.case_key.endsWith(key) && key.length >= 4) ??
      null
    );
  }

  /** البحث بالاسم داخل قضايا هذا الرقم */
  findByNameForPhone(phone, query) {
    const owned = this.findByPhone(phone);
    const needle = normalizeArabic(query);
    if (needle.length < 3) return [];
    return owned.filter((item) => item.name_normalized.includes(needle));
  }

  stats() {
    return {
      cases: this.cases.length,
      clients: this.byPhone.size,
      lastLoadedAt: this.lastLoadedAt,
      path: this.path,
      error: this.loadError,
    };
  }
}

export const store = new ExcelStore();
