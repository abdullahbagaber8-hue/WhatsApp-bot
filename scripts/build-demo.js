/**
 * يبني نسخة قابلة للاستضافة الذاتية من صفحة العرض.
 *
 * demo/standalone.html يحوي محتوى الصفحة فقط (بلا <head>) لأنه يُنشر على منصة
 * تضيف الغلاف بنفسها. هذا السكربت يلفّه في مستند HTML كامل مع إعدادات الجوال
 * ومعاينة الرابط، فيبقى مصدر واحد للمحتوى دون نسختين تتفرقان.
 *
 * التشغيل:
 *   npm run build:demo
 *   DEMO_URL=https://demo.example.com npm run build:demo   # لمعاينة الرابط
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCE = resolve(root, 'demo/standalone.html');
const OUTPUT = resolve(root, 'demo/index.html');

// العنوان والوصف كما يظهران في تبويب المتصفح وفي معاينة الرابط داخل واتساب
const PAGE_TITLE = 'خدمة الاستعلام الآلي عن القضايا';
const PAGE_DESCRIPTION =
  'جرّب كيف يستعلم عملاء المكتب عن حالة قضاياهم عبر واتساب. نسخة تجريبية على بيانات وهمية.';

// يُستخدم لمعاينة الرابط؛ يجب أن يكون رابطاً مطلقاً ليعمل داخل واتساب
const BASE_URL = (process.env.DEMO_URL ?? '').replace(/\/+$/, '');

const FAVICON =
  'data:image/svg+xml,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⚖️</text></svg>');

const body = readFileSync(SOURCE, 'utf8');

// نستخرج <title> من المصدر إن وجد، لأن المستند الكامل يضع عنوانه في <head>
const source = body.replace(/^\s*<title>[\s\S]*?<\/title>\s*/i, '');

const preview = BASE_URL
  ? `
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${BASE_URL}/" />
  <meta property="og:title" content="${PAGE_TITLE}" />
  <meta property="og:description" content="${PAGE_DESCRIPTION}" />
  <meta property="og:image" content="${BASE_URL}/preview.png" />
  <meta property="og:locale" content="ar_SA" />
  <meta name="twitter:card" content="summary_large_image" />`
  : `
  <!-- لتفعيل معاينة الرابط في واتساب: DEMO_URL=https://your-domain npm run build:demo -->`;

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="color-scheme" content="dark" />
  <meta name="theme-color" content="#172026" />
  <meta name="description" content="${PAGE_DESCRIPTION}" />
  <meta name="robots" content="noindex" />
  <title>${PAGE_TITLE}</title>
  <link rel="icon" href="${FAVICON}" />${preview}
  <style>
    /* إعادة ضبط بسيطة — المنصة كانت توفّرها، ونوفّرها هنا بأنفسنا */
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; }
  </style>
</head>
<body>
${source.trim()}
</body>
</html>
`;

writeFileSync(OUTPUT, html);

console.log(`تم بناء: ${OUTPUT}`);
console.log(BASE_URL
  ? `معاينة الرابط مفعّلة على: ${BASE_URL}`
  : 'ملاحظة: لم يُحدَّد DEMO_URL، فمعاينة الرابط داخل واتساب معطّلة.');
