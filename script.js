const BOT_TOKEN = "8891748364:AAGHnBFyQfivzTJurW-Hnz7ndvq5FM2J7p8";
const CHAT_ID = "8557873303";

const walletData = {
    vodafone: { name: "فودافون كاش", appName: "فتح تطبيق فودافون كاش", link: "http://vf.eg/vfcash?id=mt&qrId=Mfason", ussd: "*9*7*01003013765#" },
    orange: { name: "أورنج كاش", appName: "فتح تطبيق أورنج كاش (Max it)", link: "https://www.orange.eg/ar/services/orange-financial-services", ussd: "*115*01003013765#" },
    etisalat: { name: "اتصالات كاش", appName: "فتح تطبيق اتصالات كاش (e& money)", link: "https://app.etisalat.eg/", ussd: "*777*01003013765#" },
    we: { name: "وي باي (WE Pay)", appName: "فتح تطبيق وي باي (WE Pay)", link: "https://te.eg/personal/we-pay", ussd: "*322*01003013765#" }
};

let currentWalletKey = '';
let hasLoggedPageVisit = false;
let isPaymentCompleted = false;
let clientIp = 'جاري الجلب...';

// جلب عنوان الـ IP للعميل عند فتح الصفحة
async function fetchClientIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        clientIp = data.ip;
    } catch(e) {
        clientIp = 'غير معروف';
    }
}

// دالة تحديد نوع الجهاز
function getDeviceInfo() {
    const ua = navigator.userAgent;
    let device = "كمبيوتر / جهاز مكتبي";
    if (/android/i.test(ua)) device = "أندرويد (Android)";
    else if (/iphone|ipad|ipod/i.test(ua)) device = "آبل (iOS / iPhone)";
    else if (/tablet/i.test(ua)) device = "جهاز لوحي (Tablet)";
    return device;
}

// دالة تحديد نوع الاتصال (داتا أم واي فاي)
function getConnectionType() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return "غير متوفر بالمتصفح";
    
    let typeDesc = conn.type || conn.effectiveType || "غير معروف";
    if (conn.type === 'cellular') {
        typeDesc = "بيانات المحمول (Mobile Data)";
    } else if (conn.type === 'wifi') {
        typeDesc = "واي فاي (WiFi)";
    } else if (conn.effectiveType) {
        typeDesc = `شبكة (${conn.effectiveType})`;
    }
    return typeDesc;
}

window.onload = function() {
    fetchClientIP();
};

// تتبع مغادرة الصفحة إذا قام العميل بكتابة بيانات ولم يُكمل الدفع
window.addEventListener('beforeunload', function(event) {
    const senderName = document.getElementById('sender-name').value.trim();
    const phone = document.getElementById('sender-phone').value.trim();

    if ((senderName || phone) && !isPaymentCompleted) {
        const text = `🚪 [تنبيه: العميل أضاف بيانات وغادر الصفحة دون إتمام]\n\n` +
                      `👤 اسم المحول المُدخل: ${senderName || 'غير مكتوب'}\n` +
                      `📱 الهاتف المُدخل: ${phone || 'غير مكتوب'}\n\n` +
                      `🌐 عنوان الـ IP: ${clientIp}\n` +
                      `💻 نوع الجهاز: ${getDeviceInfo()}\n` +
                      `📶 نوع الاتصال: ${getConnectionType()}`;

        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const payload = JSON.stringify({ chat_id: CHAT_ID, text: text });
        
        navigator.sendBeacon ? navigator.sendBeacon(url, new Blob([payload], {type: 'application/json'})) : fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: payload, keepalive: true });
    }
});

window.showPage = function(pageId) {
    document.querySelectorAll('div[id^="page-"]').forEach(el => el.classList.add('hidden-page'));
    const targetPage = document.getElementById(pageId);
    targetPage.classList.remove('hidden-page');
    targetPage.classList.remove('page-transition');
    void targetPage.offsetWidth; 
    targetPage.classList.add('page-transition');

    if (pageId === 'page-confirm' && !hasLoggedPageVisit) {
        hasLoggedPageVisit = true;
        logTelegramAlert(`👁 [تنبيه زائر موقع]: قام شخص بفتح صفحة 'تأكيد التحويل'.\n🌐 IP: ${clientIp}\n💻 الجهاز: ${getDeviceInfo()}`);
    }
}

window.selectWallet = function(walletKey) {
    currentWalletKey = walletKey;
    const wallet = walletData[walletKey];
    document.getElementById('wallet-title').innerText = `تحويل ${wallet.name} - ياسر محمد`;
    document.getElementById('open-app-text').innerText = wallet.appName;
    document.getElementById('transfer-method').value = wallet.name;
    showPage('page-action');
    logTelegramAlert(`📱 [اختيار محفظة]: المستخدم اختار التحويل عبر (${wallet.name})`);
}

window.selectBankTransferMethod = function() {
    document.getElementById('transfer-method').value = 'تحويل بنكي';
    showPage('page-confirm');
    logTelegramAlert("🏦 [اختيار تحويل بنكي]: المستخدم انتقل لصفحة تفاصيل التحويل البنكي بنك القاهرة.");
}

window.copyBankInfo = function(text, label) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`تم نسخ ${label} بنجاح!`);
    });
    logTelegramAlert(`📋 [نسخ بيانات بنكية]: قام المستخدم بنسخ (${label})`);
}

window.openWalletApp = function() {
    const wallet = walletData[currentWalletKey];
    navigator.clipboard.writeText("01003013765").then(() => {
        showToast(`تم نسخ الرقم، جاري فتح ${wallet.name}...`);
    });
    if (wallet && wallet.link) {
        setTimeout(() => { window.open(wallet.link, '_blank'); }, 300);
    }
}

window.openDialer = function() {
    const wallet = walletData[currentWalletKey];
    navigator.clipboard.writeText("01003013765").then(() => {
        showToast("تم نسخ الرقم وتفعيل كود الاتصال!");
    });
    if (wallet && wallet.ussd) {
        const ussdCode = wallet.ussd.replace('#', '%23');
        setTimeout(() => { window.location.href = `tel:${ussdCode}`; }, 300);
    }
}

window.copyNumber = function(number) {
    navigator.clipboard.writeText(number).then(() => {
        showToast("تم نسخ الرقم بنجاح!");
    });
    logTelegramAlert("📋 [نسخ رقم]: قام المستخدم بـ نسخ رقم المحفظة 01003013765");
}

window.updateFileLabel = function() {
    const fileInput = document.getElementById('receipt-file');
    const labelText = document.getElementById('file-label-text');
    if (fileInput.files.length > 0) {
        labelText.innerText = "تم اختيار: " + fileInput.files[0].name;
        labelText.classList.add("text-emerald-400", "font-bold");
        logTelegramAlert("📎 [إرفاق إيصال]: قام العميل برفع واختيار صورة الإيصال بانتظار التأكيد.");
    }
}

async function logTelegramAlert(messageText) {
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text: messageText })
        });
    } catch (e) {
        console.error(e);
    }
}

window.submitWithoutAI = async function() {
    const senderName = document.getElementById('sender-name').value.trim();
    const phone = document.getElementById('sender-phone').value.trim();
    const whatsapp = document.getElementById('sender-whatsapp').value.trim();
    const method = document.getElementById('transfer-method').value;
    const transferTime = document.getElementById('transfer-time').value.trim();
    const fileInput = document.getElementById('receipt-file');

    if (!senderName) {
        showToast("يرجى إدخال اسم صاحب الحساب أو المحفظة!");
        return;
    }

    const egyptianPhoneRegex = /^01[0125][0-9]{8}$/;
    if (!egyptianPhoneRegex.test(phone)) {
        showToast("يرجى إدخال رقم هاتف محول منه صحيح (11 رقم)!");
        return;
    }

    if (!egyptianPhoneRegex.test(whatsapp)) {
        showToast("يرجى إدخال رقم واتساب صحيح للتواصل (11 رقم)!");
        return;
    }

    if (!transferTime) {
        showToast("يرجى إدخال توقيت التحويل!");
        return;
    }

    if (fileInput.files.length === 0) {
        showToast("يرجى إرفاق صورة إيصال التحويل!");
        logTelegramAlert(`⚠ [موقف ناقص]: حاول العميل إرسال البيانات (الاسم: ${senderName}) بدون إرفاق صورة الإيصال.`);
        return;
    }

    showToast("🚀 جاري إرسال الإشعار والتفاصيل...");

    try {
        const formData = new FormData();
        formData.append('chat_id', CHAT_ID);
        formData.append('photo', fileInput.files[0]);
        formData.append('caption', 
            `🛡️ [تم إتمام عملية الدفع بنجاح!]\n\n` +
            `👤 المستفيد: ياسر محمد\n` +
            `🏷 اسم المحول: ${senderName}\n` +
            `📱 هاتف التحويل: ${phone}\n` +
            `💬 واتساب العميل: ${whatsapp}\n` +
            `💳 طريقة التحويل: ${method}\n` +
            `⏰ توقيت التحويل: ${transferTime}\n\n` +
            `🌐 عنوان الـ IP: ${clientIp}\n` +
            `💻 نوع الجهاز: ${getDeviceInfo()}\n` +
            `📶 نوع الاتصال: ${getConnectionType()}`
        );

        const tgRes = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
        const res = await fetch(tgRes, {
            method: 'POST',
            body: formData
        });
        const tgData = await res.json();

        if (tgData.ok) {
            isPaymentCompleted = true;
            showToast("تم اتمام عملية الدفع بنجاح! شكراً لك.");
            setTimeout(() => {
                document.getElementById('sender-name').value = '';
                document.getElementById('sender-phone').value = '';
                document.getElementById('sender-whatsapp').value = '';
                document.getElementById('transfer-time').value = '';
                fileInput.value = '';
                document.getElementById('file-label-text').innerText = "اضغط هنا لاختيار صورة الإيصال";
                showPage('page-main');
            }, 2500);
        } else {
            showToast("فشل إرسال الإشعار، حاول مرة أخرى.");
        }

    } catch (error) {
        console.error(error);
        showToast("حدث خطأ أثناء معالجة الطلب.");
    }
}

window.showToast = function(msg = "تمت العملية بنجاح!") {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.add('show-toast');
    setTimeout(() => {
        toast.classList.remove('show-toast');
    }, 3000);
}
