#!/usr/bin/env bash
# يفحص السيرفر ويطبع ما نحتاجه قبل رفع البوت.
# التشغيل على السيرفر:  bash server-check.sh
# آمن تماماً: قراءة فقط، لا يغيّر أي شيء.

echo "════════ نظام التشغيل ════════"
if [ -r /etc/os-release ]; then
  . /etc/os-release
  echo "التوزيعة : $PRETTY_NAME"
  echo "العائلة  : ${ID_LIKE:-$ID}"
else
  echo "غير معروف"
fi
echo "النواة   : $(uname -r)"
echo "المعمارية: $(uname -m)   ← aarch64 يعني ARM، x86_64 يعني إنتل/AMD"

echo
echo "════════ الموارد ════════"
echo "المعالج  : $(nproc) نواة"
free -h 2>/dev/null | awk '/Mem|الذاكرة/ {print "الذاكرة  : " $2 " إجمالي، " $7 " متاح"}'
df -h / 2>/dev/null | awk 'NR==2 {print "القرص    : " $2 " إجمالي، " $4 " فاضي"}'

echo
echo "════════ ما هو مثبّت ════════"
for cmd in node npm git nginx apache2 httpd certbot pm2 docker; do
  if command -v "$cmd" >/dev/null 2>&1; then
    printf "✅ %-9s %s\n" "$cmd" "$("$cmd" --version 2>&1 | head -1)"
  else
    printf "❌ %-9s غير مثبّت\n" "$cmd"
  fi
done

echo
echo "════════ خادم الويب ════════"
for svc in nginx apache2 httpd; do
  if systemctl is-active --quiet "$svc" 2>/dev/null; then
    echo "✅ $svc يعمل الآن"
  fi
done
echo "المنافذ المفتوحة:"
(ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null) | awk 'NR>1 {print "   " $4}' | sort -u | head -15

echo
echo "════════ الجدران النارية ════════"
echo "— SELinux (يخص Oracle Linux/RHEL) —"
if command -v getenforce >/dev/null 2>&1; then
  mode=$(getenforce)
  echo "   الحالة: $mode"
  if [ "$mode" = "Enforcing" ]; then
    echo "   ⚠️  سيمنع Nginx من تمرير الطلبات للبوت حتى تُفعّل:"
    echo "       sudo setsebool -P httpd_can_network_connect 1"
  fi
else
  echo "   غير موجود (طبيعي على Ubuntu)"
fi

echo "— جدار الخادم —"
if command -v firewall-cmd >/dev/null 2>&1 && systemctl is-active --quiet firewalld 2>/dev/null; then
  echo "   firewalld يعمل. المسموح: $(firewall-cmd --list-services 2>/dev/null)"
elif command -v ufw >/dev/null 2>&1; then
  echo "   ufw: $(ufw status 2>/dev/null | head -1)"
fi
echo "   قواعد iptables على المنفذ 443:"
sudo iptables -L INPUT -n 2>/dev/null | grep -c 443 | xargs -I{} echo "      {} قاعدة (0 يعني المنفذ مقفول — انظر README)"

echo
echo "════════ الخلاصة ════════"
case "${ID:-}" in
  ubuntu|debian) echo "→ عائلة Debian: استخدم apt. اتبع مسار Ubuntu في README." ;;
  ol|rhel|centos|rocky|almalinux|fedora)
    echo "→ عائلة RHEL: استخدم dnf، وانتبه لـ SELinux أعلاه. اتبع مسار Oracle Linux في README." ;;
  *) echo "→ توزيعة غير متوقعة — أرسل مخرجات هذا السكربت." ;;
esac
