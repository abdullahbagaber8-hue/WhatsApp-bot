import { test, describe, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';

import { store } from '../src/store/excelStore.js';
import { handleIncomingMessage } from '../src/bot/handler.js';
import { resetSessions } from '../src/bot/session.js';
import { normalizePhone } from '../src/utils/phone.js';

const MULTI_CASE_CLIENT = '966501234567'; // محمد — قضيتان
const SINGLE_CASE_CLIENT = '966555987654'; // نورة — قضية واحدة
const STRANGER = '966599999999';

before(() => {
  assert.ok(store.load({ force: true }), 'يجب أن يُحمَّل ملف الإكسل التجريبي (شغّل npm run seed)');
});

beforeEach(() => resetSessions());

describe('توحيد أرقام الجوال', () => {
  test('يقبل الصيغ المحلية والدولية ويوحّدها', () => {
    const expected = '966501234567';
    for (const input of ['0501234567', '+966501234567', '966501234567', '00966501234567', '966 50 123 4567', '٠٥٠١٢٣٤٥٦٧']) {
      assert.equal(normalizePhone(input), expected, `فشل التوحيد للمدخل: ${input}`);
    }
  });

  test('يرفض المدخلات غير الصالحة', () => {
    for (const input of ['', null, undefined, 'abc', '123']) {
      assert.equal(normalizePhone(input), '');
    }
  });
});

describe('التحقق من الهوية بالجوال', () => {
  test('رقم غير مسجّل لا يحصل على أي بيانات', async () => {
    const replies = await handleIncomingMessage(STRANGER, '1445/ت/2301');
    assert.equal(replies.length, 1);
    assert.match(replies[0], /لم نجد أي قضايا/);
    assert.doesNotMatch(replies[0], /محمد|المحكمة التجارية|قيد المرافعة/);
  });

  test('عميل لا يستطيع رؤية قضية عميل آخر', async () => {
    // 1446/ت/0055 تخص شركة الأفق، والمرسل هو محمد
    const replies = await handleIncomingMessage(MULTI_CASE_CLIENT, '1446/ت/0055');
    const combined = replies.join('\n');
    assert.doesNotMatch(combined, /الأفق|الدمام/);
    assert.match(combined, /لم نجد قضية/);
  });

  test('الصيغة المحلية للرقم تعمل كالدولية', async () => {
    const replies = await handleIncomingMessage('0501234567', '1');
    assert.match(replies.join('\n'), /1445\/ت\/2301/);
  });
});

describe('تدفق المحادثة', () => {
  test('أول رسالة ترحّب باسم العميل', async () => {
    const replies = await handleIncomingMessage(MULTI_CASE_CLIENT, 'السلام عليكم');
    assert.equal(replies.length, 1);
    assert.match(replies[0], /محمد عبدالله السالم/);
    assert.match(replies[0], /حالة قضاياي/);
  });

  test('العميل بقضية واحدة يحصل على التفاصيل مباشرة عند اختيار 1', async () => {
    await handleIncomingMessage(SINGLE_CASE_CLIENT, 'مرحبا');
    const replies = await handleIncomingMessage(SINGLE_CASE_CLIENT, '1');
    assert.match(replies[0], /1445\/ح\/0742/);
    assert.match(replies[0], /نورة سعد القحطاني/);
  });

  test('العميل بعدة قضايا يحصل على قائمة ثم يختار منها', async () => {
    await handleIncomingMessage(MULTI_CASE_CLIENT, 'مرحبا');

    const list = await handleIncomingMessage(MULTI_CASE_CLIENT, '1');
    assert.match(list[0], /لديك 2 قضايا/);
    assert.match(list[0], /1\. 1445\/ت\/2301/);
    assert.match(list[0], /2\. 1445\/ع\/1180/);

    const detail = await handleIncomingMessage(MULTI_CASE_CLIENT, '2');
    assert.match(detail[0], /1445\/ع\/1180/);
    assert.match(detail[0], /صدر الحكم الابتدائي/);
  });

  test('الرد على رقم القضية مباشرة', async () => {
    await handleIncomingMessage(MULTI_CASE_CLIENT, 'مرحبا');
    const replies = await handleIncomingMessage(MULTI_CASE_CLIENT, '1445/ت/2301');
    assert.match(replies[0], /المحكمة التجارية بالرياض/);
    assert.match(replies[0], /الخميس 2026-09-03/);
    assert.match(replies[0], /10:30/);
  });

  test('رقم القضية يُقبل بصيغ كتابة مختلفة', async () => {
    await handleIncomingMessage(MULTI_CASE_CLIENT, 'مرحبا');
    for (const variant of ['1445 ت 2301', '1445-ت-2301', '1445/ت/2301 ']) {
      const replies = await handleIncomingMessage(MULTI_CASE_CLIENT, variant);
      assert.match(replies[0], /المحكمة التجارية/, `فشلت الصيغة: ${variant}`);
    }
  });

  test('خيار الجلسات يعرض المواعيد مرتبة ويتجاهل ما لا موعد له', async () => {
    await handleIncomingMessage(MULTI_CASE_CLIENT, 'مرحبا');
    const replies = await handleIncomingMessage(MULTI_CASE_CLIENT, '2');
    assert.match(replies[0], /1445\/ت\/2301/);
    assert.doesNotMatch(replies[0], /1445\/ع\/1180/); // لا يوجد لها موعد
  });

  test('العميل بلا جلسات يُبلَّغ بوضوح', async () => {
    await handleIncomingMessage(SINGLE_CASE_CLIENT, 'مرحبا');
    const replies = await handleIncomingMessage(SINGLE_CASE_CLIENT, '2');
    assert.match(replies[0], /لا توجد جلسات محددة/);
  });

  test('طلب موظف يعطي بيانات التواصل', async () => {
    await handleIncomingMessage(MULTI_CASE_CLIENT, 'مرحبا');
    const replies = await handleIncomingMessage(MULTI_CASE_CLIENT, '3');
    assert.match(replies[0], /تحويلك/);
  });

  test('السؤال القانوني يُحوَّل للمحامي ولا يُجاب عليه', async () => {
    await handleIncomingMessage(MULTI_CASE_CLIENT, 'مرحبا');
    const replies = await handleIncomingMessage(MULTI_CASE_CLIENT, 'هل ينفع أعترض على الحكم؟');
    assert.match(replies[0], /يحتاج مراجعة المحامي/);
  });

  test('الصيغ العامية الشائعة تُفهم بلا ذكاء اصطناعي', async () => {
    const phrasings = [
      'وش صار على قضيتي', 'فيه جديد؟', 'وين وصلنا', 'عطني تفاصيل الملف',
      'هل صدر الحكم', 'شنو اخر تطور', 'تم رفع الدعوى ولا لأ',
      'متى الجلسة الجاية', 'كم باقي على الجلسة',
      'ودي اكلم المحامي', 'ممكن رقم المكتب', 'ابغى استفسر',
    ];

    for (const text of phrasings) {
      resetSessions();
      await handleIncomingMessage(MULTI_CASE_CLIENT, 'مرحبا');
      const replies = await handleIncomingMessage(MULTI_CASE_CLIENT, text);
      assert.doesNotMatch(replies.join('\n'), /لم أفهم طلبك/, `لم تُفهم: "${text}"`);
    }
  });

  test('كلمات الحالة لا تبتلع الأسئلة القانونية', async () => {
    // «الحكم» و«اعتراض» عمداً خارج قائمة كلمات الحالة، وإلا سبقت فحص الأسئلة القانونية
    for (const text of ['هل ينفع أعترض على الحكم؟', 'ليش صدر الحكم ضدي']) {
      resetSessions();
      await handleIncomingMessage(MULTI_CASE_CLIENT, 'مرحبا');
      const replies = await handleIncomingMessage(MULTI_CASE_CLIENT, text);
      assert.match(replies[0], /يحتاج مراجعة المحامي/, `تسربت: "${text}"`);
    }
  });

  test('رقم قضية غير موجود يعطي رسالة واضحة', async () => {
    await handleIncomingMessage(MULTI_CASE_CLIENT, 'مرحبا');
    const replies = await handleIncomingMessage(MULTI_CASE_CLIENT, '9999');
    assert.match(replies[0], /لم نجد قضية/);
  });

  test('0 يرجع للقائمة الرئيسية', async () => {
    await handleIncomingMessage(MULTI_CASE_CLIENT, 'مرحبا');
    await handleIncomingMessage(MULTI_CASE_CLIENT, '1');
    const replies = await handleIncomingMessage(MULTI_CASE_CLIENT, '0');
    assert.match(replies[0], /اختر من القائمة/);
  });

  test('أول رسالة تحمل طلباً ترد بالترحيب والنتيجة معاً', async () => {
    const replies = await handleIncomingMessage(SINGLE_CASE_CLIENT, '1');
    assert.equal(replies.length, 2);
    assert.match(replies[0], /مرحباً بك/);
    assert.match(replies[1], /1445\/ح\/0742/);
  });

  test('التحية في منتصف المحادثة تعيد القائمة لا رسالة عدم الفهم', async () => {
    await handleIncomingMessage(MULTI_CASE_CLIENT, 'مرحبا');
    await handleIncomingMessage(MULTI_CASE_CLIENT, '1');
    const replies = await handleIncomingMessage(MULTI_CASE_CLIENT, 'السلام عليكم');
    assert.match(replies[0], /اختر من القائمة/);
    assert.doesNotMatch(replies[0], /لم أفهم/);
  });

  test('الكلام غير المفهوم يعيد عرض الخيارات', async () => {
    await handleIncomingMessage(MULTI_CASE_CLIENT, 'مرحبا');
    const replies = await handleIncomingMessage(MULTI_CASE_CLIENT, 'ؤؤؤ');
    assert.match(replies[0], /لم أفهم طلبك/);
  });
});

describe('قراءة الإكسل', () => {
  test('يُحمَّل الملف ويُفهرس بالجوال', () => {
    const stats = store.stats();
    assert.equal(stats.error, null);
    assert.equal(stats.cases, 6);
    assert.equal(stats.clients, 5);
  });

  test('البحث بالجوال يعيد قضايا ذلك الرقم فقط', () => {
    const owned = store.findByPhone(MULTI_CASE_CLIENT);
    assert.equal(owned.length, 2);
    assert.ok(owned.every((item) => item.client_name === 'محمد عبدالله السالم'));
  });
});
