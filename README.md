# بوت واتساب لمتابعة القضايا

بوت يمكّن عملاء مكتب المحاماة من الاستعلام عن حالة قضاياهم عبر واتساب، بالاعتماد على ملف إكسل يديره المكتب.

**الحالة: نسخة تجريبية (Demo) على بيانات وهمية.**

---

## التشغيل خلال دقيقة

```bash
npm install
npm run seed     # يولّد ملف إكسل تجريبي في data/cases.xlsx
npm start
```

افتح <http://localhost:3000> — يظهر محاكي محادثة يشبه واتساب، تختار فيه رقم عميل وتتحدث بصفته.
**لا يحتاج أي إعداد على واتساب**، وهو المناسب لعرض الفكرة على العميل.

```bash
npm test         # 21 اختباراً تغطي الخصوصية والتدفق وقراءة الإكسل
```

---

## صفحة العرض للعميل

**منشورة الآن على:** <https://abdullahbagaber8-hue.github.io/WhatsApp-bot/>

رابط عام لا يحتاج تسجيل دخول، ويُحدَّث تلقائياً عند تعديل `demo/standalone.html` ودفعه
(انظر `.github/workflows/deploy-demo.yml`). المحتوى يُنشر من فرع `gh-pages`.

للاستضافة على نطاق العميل بدل ذلك، اتبع الخطوات أدناه.

---

### بناء نسخة للاستضافة الذاتية

لعرض الفكرة على المحامي دون تشغيل أي خادم، هناك صفحة واحدة مستقلة تحوي المنطق والبيانات الوهمية بداخلها:

```bash
npm run build:demo                                  # يبني demo/index.html
DEMO_URL=https://demo.example.com npm run build:demo # مع معاينة الرابط في واتساب
```

`demo/index.html` ملف ساكن واحد — يُفتح مباشرة بالمتصفح، أو يُرفع على أي استضافة.

**الرفع على نفس سيرفر Oracle:**

```bash
sudo mkdir -p /var/www/case-demo
sudo cp demo/index.html demo/preview.png /var/www/case-demo/
```

ثم كتلة Nginx على نطاق فرعي:

```nginx
server {
    server_name demo.example.com;
    root /var/www/case-demo;
    index index.html;
}
```

و `sudo certbot --nginx -d demo.example.com` لتفعيل HTTPS.

بديل بلا نطاق فرعي: انسخ الملفات إلى مجلد داخل موقع العميل الحالي (`/var/www/site/case-demo/`) فيصبح الرابط `https://example.com/case-demo/`.

> `demo/standalone.html` هو المصدر، و `demo/index.html` مبني منه — عدّل المصدر ثم أعد البناء.
> الصفحة تعكس منطق `src/bot/` لكنها نسخة منه؛ عند تغيير نصوص الردود تُحدَّث في الاثنين.

---

## الأمان: كيف يتم التحقق من الهوية

**رقم جوال المرسل هو الهوية.** البوت يجلب القضايا المرتبطة برقم الواتساب المرسِل فقط، ولا يوجد في النظام أي بحث عام برقم القضية.

النتيجة عملياً:

| الحالة | النتيجة |
|---|---|
| عميل مسجّل يرسل رقم قضيته | ✅ يحصل على التفاصيل |
| عميل مسجّل يرسل رقم قضية عميل آخر | ❌ "لم نجد قضية بهذا الرقم ضمن قضاياك" |
| رقم غير مسجّل يرسل أي رقم قضية | ❌ لا تُكشف أي بيانات إطلاقاً |

هذا مغطّى باختبارات في `tests/bot.test.js` تحت `التحقق من الهوية بالجوال`.

السجلات تكتب الأرقام مقنّعة (`96650****567`) ولا تكتب تفاصيل القضايا.

---

## قالب ملف الإكسل

صف واحد لكل قضية. الأعمدة الإلزامية: `case_number` و `client_phone` — أي صف ينقصه أحدهما يُتجاوز دون إيقاف الخدمة.

| العمود | مثال |
|---|---|
| `case_number` | 1445/ت/2301 |
| `client_name` | محمد عبدالله السالم |
| `client_phone` | 0501234567 أو 966501234567 |
| `case_type` | تجاري |
| `court` | المحكمة التجارية بالرياض |
| `status` | قيد المرافعة |
| `next_hearing_date` | 2026-09-03 |
| `next_hearing_time` | 10:30 |
| `last_update_note` | تم تقديم المذكرة الجوابية |
| `assigned_lawyer` | أ. خالد الحربي |

**العناوين العربية مقبولة أيضاً** («رقم القضية»، «اسم الموكل»، «رقم الجوال» …) — انظر `COLUMN_ALIASES` في `src/store/excelStore.js`. المكتب ليس مضطراً لإعادة تسمية أعمدة ملفه.

صيغ الجوال المختلطة تُوحَّد تلقائياً: `0501234567` و `+966501234567` و `00966...` و الأرقام العربية `٠٥٠١...` كلها تُقرأ كرقم واحد.

يُعاد قراءة الملف تلقائياً عند تغيّره (كل 60 ثانية افتراضياً) — لا حاجة لإعادة تشغيل البوت بعد كل تعديل من المكتب.

---

## ما يفهمه البوت

| المدخل | الرد |
|---|---|
| تحية / أول رسالة | ترحيب باسم العميل + القائمة |
| `1` أو «حالة قضيتي» | تفاصيل القضية، أو قائمة مرقّمة إذا كان له أكثر من قضية |
| `2` أو «متى الجلسة» | الجلسات القادمة مرتبة بالتاريخ |
| `3` أو «أبي أكلم موظف» | بيانات التواصل مع المكتب |
| رقم القضية مباشرة | بطاقة القضية (تُقبل صيغ `1445/ت/2301` و `1445 ت 2301` و `1445-ت-2301`) |
| اسم الموكل | بطاقة القضية |
| سؤال قانوني («هل أعترض؟») | تحويل للمحامي — البوت لا يفتي |
| `0` أو «رجوع» | القائمة الرئيسية |

كل بطاقة قضية تنتهي بإخلاء مسؤولية: الخدمة للاستعلام فقط وليست استشارة قانونية.

---

## الربط بواتساب

### أ. للتجربة على جوالك — رقم اختبار مجاني من Meta

**لا تسجّل رقمك الشخصي على Cloud API؛ الرقم المسجّل يُفصل نهائياً من تطبيق واتساب العادي.** استخدم رقم الاختبار المجاني:

1. أنشئ تطبيقاً على <https://developers.facebook.com> نوع Business، وأضف منتج WhatsApp.
2. من `WhatsApp → API Setup` تحصل على: رقم اختبار جاهز، و `Phone number ID`، و `Temporary access token` (صلاحيته 24 ساعة).
3. في نفس الصفحة أضف رقم جوالك تحت *To* — يصلك كود تأكيد. (حتى 5 أرقام مستقبِلة.)
4. عدّل ملف الإكسل ليحوي رقم جوالك في عمود `client_phone`، حتى يتعرّف عليك البوت.
5. املأ `.env`:
   ```
   WHATSAPP_TOKEN=<التوكن>
   WHATSAPP_PHONE_NUMBER_ID=<المعرّف>
   WHATSAPP_VERIFY_TOKEN=<أي نص تختاره>
   ```
6. اربط الـ Webhook: في `WhatsApp → Configuration` ضع `https://<نطاقك>/webhook` ونفس `VERIFY_TOKEN`، ثم اشترك في حقل `messages`.
   للتجربة محلياً استخدم نفقاً مؤقتاً: `npx localtunnel --port 3000`.
7. أرسل رسالة من جوالك إلى رقم الاختبار.

### ب. عند الإطلاق — رقم المكتب

اشترِ/خصّص رقماً **غير مستخدم على واتساب**، وثّق حساب Meta Business، ثم غيّر `WHATSAPP_TOKEN` و `WHATSAPP_PHONE_NUMBER_ID` فقط. لا تغيير في الكود.
اطلب توكناً دائماً (System User Token) بدل التوكن المؤقت.

---

## النشر على Oracle Cloud (Free Tier)

الـ Free Tier كافٍ تماماً لهذا الحمل.

### 0) اعرف سيرفرك أولاً

نظام Oracle الافتراضي هو **Oracle Linux** لا Ubuntu، والأوامر تختلف. شغّل على السيرفر:

```bash
bash scripts/server-check.sh
```

يطبع التوزيعة والمعمارية وما هو مثبّت وحالة الجدران النارية، ويحدد أي مسار تتبع أدناه.
(قراءة فقط، لا يغيّر شيئاً.)

### 1) تثبيت Node.js 20

```bash
# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Oracle Linux / RHEL / Rocky
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo -E bash -
sudo dnf install -y nodejs
```

المعمارية (ARM أو x86) لا تهم — Node يعمل على الاثنين، والمشروع بلا مكتبات مبنية أصلاً.

### 2) المشروع

```bash
git clone <رابط-المستودع> ~/whatsapp-bot && cd ~/whatsapp-bot
npm install --omit=dev
cp .env.example .env && nano .env      # املأ المفاتيح وضع SIMULATOR_ENABLED=false
```

### 3) تشغيل دائم

```bash
sudo npm install -g pm2
pm2 start src/index.js --name whatsapp-bot
pm2 save && pm2 startup
```

### 4) فتح المنفذ — خطوتان في Oracle، لا واحدة

هذي أكثر نقطة يعلق فيها الناس: تفتح المنفذ من اللوحة ويظل مقفولاً، لأن أوراكل تضع جداراً ثانياً داخل الخادم نفسه.

**أ) لوحة Oracle:** `Networking → VCN → Security Lists` → أضف Ingress Rule للمنفذ 443.

**ب) داخل الخادم:**

```bash
# Ubuntu (أوراكل تثبّت قواعد iptables تمنع المنافذ افتراضياً)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# Oracle Linux (يستخدم firewalld)
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 5) فخ SELinux — على Oracle Linux فقط

SELinux مفعّل افتراضياً على Oracle Linux، **ويمنع Nginx من تمرير الطلبات للبوت**. النتيجة: كل شيء يبدو صحيحاً لكن المتصفح يعطي `502 Bad Gateway` بلا سبب ظاهر.

```bash
sudo setsebool -P httpd_can_network_connect 1
```

سطر واحد، لكن بدونه تضيع ساعات. (لا يوجد SELinux على Ubuntu — تجاوز هذه الخطوة.)

### 6) HTTPS — واتساب يشترطه للـ Webhook

بما أن السيرفر يستضيف موقع العميل أصلاً، أضف البوت كنطاق فرعي خلف خادم الويب الموجود. اعرف أيهما يعمل من `server-check.sh`:

**Nginx:**

```nginx
server {
    server_name bot.example.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**Apache** (يحتاج تفعيل الوحدات أولاً: `sudo a2enmod proxy proxy_http` على Ubuntu):

```apache
<VirtualHost *:80>
    ServerName bot.example.com
    ProxyPreserveHost On
    ProxyPass        / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
</VirtualHost>
```

ثم الشهادة المجانية:

```bash
sudo certbot --nginx -d bot.example.com     # أو --apache
```

على Oracle Linux قد يحتاج certbot تفعيل EPEL أولاً: `sudo dnf install -y epel-release certbot`.

**ملف الإكسل على السيرفر:** أبسط طريقة تبقي المكتب على عادته هي مزامنة مجلد (rclone مع OneDrive/Google Drive) ثم توجيه `EXCEL_PATH` إليه. أو يرفع المكتب الملف عبر SFTP عند التحديث.

`GET /health` يعطي حالة الخدمة وعدد القضايا المحمّلة ووقت آخر قراءة للملف — مفيد للمراقبة.

---

## هيكل المشروع

```
demo/
├── standalone.html          مصدر صفحة العرض المستقلة (المنطق والبيانات بداخلها)
├── index.html               مبني من المصدر — هذا ما يُرفع على الاستضافة
└── preview.png              صورة معاينة الرابط عند إرساله في واتساب

src/
├── index.js                 نقطة التشغيل وربط المسارات
├── config.js                كل الإعدادات من متغيرات البيئة
├── store/excelStore.js      قراءة الإكسل + الفهرسة بالجوال + إعادة التحميل التلقائي
├── bot/
│   ├── handler.js           منطق المحادثة والتحقق من الهوية
│   ├── messages.js          نصوص الردود (لمراجعة المكتب وتعديل الصياغة)
│   └── session.js           حالة المحادثة المؤقتة
├── whatsapp/
│   ├── webhook.js           استقبال رسائل Cloud API
│   └── client.js            إرسال الرسائل
├── simulator/               محاكي المحادثة للعرض
└── utils/                   توحيد الأرقام + السجلات
```

`handleIncomingMessage(phone, text)` هي قلب النظام: دالة واحدة يستخدمها الواتساب والمحاكي والاختبارات بنفس الطريقة.

---

## غير مشمول في هذه المرحلة

- **تذكيرات الجلسات التلقائية** — مؤجلة بطلب العميل. تحتاج قوالب معتمدة من Meta ومهمة مجدولة.
- الوسائط (صور/مستندات القضايا) — البوت يرد نصاً فقط.
- لوحة تحكم للمكتب — الإدارة تتم عبر ملف الإكسل مباشرة.
- تخزين المحادثات في قاعدة بيانات — الجلسات في الذاكرة وتنتهي بعد 30 دقيقة.
