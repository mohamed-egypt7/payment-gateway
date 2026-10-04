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

async function fetchClientIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        clientIp = data.ip;
    } catch(e) {
        clientIp = 'غير معروف';
    }
}

function getDeviceInfo() {
    const ua = navigator.userAgent;
    let device = "كمبيوتر / جهاز مكتبي";
    if (/android/i.test(ua)) device = "أندرويد (Android)";
    else if (/iphone|ipad|ipod/i.test(ua)) device = "آبل (iOS / iPhone)";
    else if (/tablet/i.test(ua)) device = "جهاز لوحي (Tablet)";
    return device;
}

function getConnectionType() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return "غير متوفر بالمتصفح";
    
    let typeDesc = conn.type || conn.effectiveType || "غير معروف";
    if (conn.type === 'cellular') typeDesc = "بيانات المحمول (Mobile Data)";
    else if (conn.type === 'wifi') typeDesc = "واي فاي (WiFi)";
    else if (conn.effectiveType) typeDesc = `شبكة (${conn.effectiveType})`;
    return typeDesc;
}

// استرجاع المسودة المحفوظة في LocalStorage لمنع فقدان البيانات عند التحديث
window.onload = function() {
    fetchClientIP();
    
    const savedName = localStorage.getItem('draft_sender_name');
    const savedPhone = localStorage.getItem('draft_sender_phone');
    const savedWhatsapp = localStorage.getItem('draft_sender_whatsapp');
    
    if (savedName) document.getElementById('sender-name').value = savedName;
    if (savedPhone) document.getElementById('sender-phone').value = savedPhone;
    if (savedWhatsapp) document.getElementById('sender-whatsapp').value = savedWhatsapp;

    // حفظ تلقائي عند الكتابة
    ['sender-name', 'sender-phone', 'sender-whatsapp'].forEach(id => {
        document.getElementById(id).addEventListener('input', function() {
            localStorage.setItem('draft_sender_name', document.getElementById('sender-name').value);
            localStorage.setItem('draft_sender_phone', document.getElementById('sender-phone').value);
            localStorage.setItem('draft_sender_whatsapp', document.getElementById('sender-whatsapp').value);
        });
    });
};

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

// معاينة صورة الإيصال لحظياً
window.updateFileLabel = function() {
    const fileInput = document.getElementById('receipt-file');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const labelText = document.getElementById('file-label-text');

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            previewContainer.classList.remove('hidden');
            uploadPlaceholder.classList.add('hidden');
        }
        reader.readAsDataURL(file);

        labelText.innerText = "تم اختيار: " + file.name;
        logTelegramAlert("📎 [إرفاق إيصال]: قام العميل برفع واختيار صورة الإيصال بانتظار التأكيد.");
    }
}

// دالة لضغط حجم الصور (Image Compression) لضمان سرعة الرفع الفائق
function compressImage(file, maxWidth = 1200, quality = 0.7) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                }, 'image/jpeg', quality);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

window.toggleChatModal = function() {
    const modal = document.getElementById('chat-modal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        logTelegramAlert(`💬 [فتح نافذة الدردشة]: قام العميل بفتح نافذة المراسلة والدعم.\n🌐 IP: ${clientIp}`);
    } else {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
}

window.submitSupportTicket = async function() {
    const name = document.getElementById('support-name').value.trim();
    const email = document.getElementById('support-email').value.trim();
    const phone = document.getElementById('support-phone').value.trim();
    const reason = document.getElementById('support-reason').value.trim();
    const details = document.getElementById('support-details').value.trim();

    if (!name) { showToast("يرجى إدخال اسمك الكريم!"); return; }
    const egyptianPhoneRegex = /^01[0125][0-9]{8}$/;
    if (!egyptianPhoneRegex.test(phone)) { showToast("يرجى إدخال رقم تليفون صحيح (11 رقم)!"); return; }
    if (!reason) { showToast("يرجى إدخال سبب المشكلة!"); return; }
    if (!details) { showToast("يرجى كتابة تفاصيل المشكلة!"); return; }

    showToast("🚀 جاري إرسال استفسارك...");

    const text = `🛠 [رسالة دعم فني جديدة من العملاء]\n\n` +
                 `👤 الاسم: ${name}\n` +
                 `📧 البريد الإلكتروني: ${email || 'غير مدخل'}\n` +
                 `📱 الهاتف: ${phone}\n` +
                 `📌 سبب المشكلة: ${reason}\n` +
                 `📝 تفاصيل المشكلة:\n${details}\n\n` +
                 `🌐 عنوان الـ IP: ${clientIp}\n` +
                 `💻 نوع الجهاز: ${getDeviceInfo()}\n` +
                 `📶 نوع الاتصال: ${getConnectionType()}`;

    try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text: text })
        });
        const data = await res.json();

        if (data.ok) {
            showToast("تم ارسال اسالتك وهيتم رد عليك في اسرع وقت ممكن");
            setTimeout(() => {
                document.getElementById('support-name').value = '';
                document.getElementById('support-email').value = '';
                document.getElementById('support-phone').value = '';
                document.getElementById('support-reason').value = '';
                document.getElementById('support-details').value = '';
                toggleChatModal();
            }, 2500);
        } else {
            showToast("فشل إرسال الاستفسار، حاول مرة أخرى.");
        }
    } catch (error) {
        console.error(error);
        showToast("حدث خطأ أثناء الاتصال.");
    }
}

window.toggleDropdown = function() {
    const menu = document.getElementById('dropdown-menu');
    const arrow = document.getElementById('dropdown-arrow');
    menu.classList.toggle('hidden');
    arrow.classList.toggle('rotate-180');
}

window.selectCustomOption = function(optionText) {
    document.getElementById('transfer-method').value = optionText;
    document.getElementById('dropdown-selected-text').innerText = optionText;
    toggleDropdown();
}

window.addEventListener('click', function(e) {
    const btn = document.getElementById('dropdown-btn');
    const menu = document.getElementById('dropdown-menu');
    const arrow = document.getElementById('dropdown-arrow');
    if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add('hidden');
        arrow.classList.remove('rotate-180');
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
    document.getElementById('dropdown-selected-text').innerText = wallet.name;
    showPage('page-action');
    logTelegramAlert(`📱 [اختيار محفظة]: المستخدم اختار التحويل عبر (${wallet.name})`);
}

window.selectBankTransferMethod = function() {
    document.getElementById('transfer-method').value = 'تحويل بنكي';
    document.getElementById('dropdown-selected-text').innerText = 'تحويل بنكي';
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
    navigator.clipboard.writeText("01003013765").then => {
        showToast(`تم نسخ رقمك، جاري فتح ${wallet.name}...`);
    };
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

// زر الإرسال مع حماية ضد التكرار (Double Submit Prevention) وضغط الصورة
window.submitWithoutAI = async function() {
    const senderName = document.getElementById('sender-name').value.trim();
    const phone = document.getElementById('sender-phone').value.trim();
    const whatsapp = document.getElementById('sender-whatsapp').value.trim();
    const method = document.getElementById('transfer-method').value;
    const transferTime = document.getElementById('transfer-time').value.trim();
    const fileInput = document.getElementById('receipt-file');
    const submitBtn = document.getElementById('submit-btn');
    const submitBtnText = document.getElementById('submit-btn-text');

    if (!senderName) { showToast("يرجى إدخال اسم صاحب الحساب أو المحفظة!"); return; }
    const egyptianPhoneRegex = /^01[0125][0-9]{8}$/;
    if (!egyptianPhoneRegex.test(phone)) { showToast("يرجى إدخال رقم هاتف محول منه صحيح (11 رقم)!"); return; }
    if (!egyptianPhoneRegex.test(whatsapp)) { showToast("يرجى إدخال رقم واتساب صحيح للتواصل (11 رقم)!"); return; }
    if (!transferTime) { showToast("يرجى إدخال توقيت التحويل!"); return; }
    if (fileInput.files.length === 0) {
        showToast("يرجى إرفاق صورة إيصال التحويل!");
        logTelegramAlert(`⚠ [موقف ناقص]: حاول العميل إرسال البيانات (الاسم: ${senderName}) بدون إرفاق صورة الإيصال.`);
        return;
    }

    // تعطيل الزر لمنع الضغط المتكرر
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-55', 'cursor-not-allowed');
    submitBtnText.innerText = "جاري ضغط الصورة وإرسال الطلب...";

    try {
        // ضغط حجم الصورة لتكون سريعة جداً في الرفع
        const compressedImage = await compressImage(fileInput.files[0]);

        const formData = new FormData();
        formData.append('chat_id', CHAT_ID);
        formData.append('photo', compressedImage);
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

        const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
        });
        const tgData = await tgRes.json();

        if (tgData.ok) {
            isPaymentCompleted = true;
            localStorage.clear(); // مسح المسودة بعد النجاح
            showToast("تم اتمام عملية الدفع بنجاح! شكراً لك.");
            setTimeout(() => {
                document.getElementById('sender-name').value = '';
                document.getElementById('sender-phone').value = '';
                document.getElementById('sender-whatsapp').value = '';
                document.getElementById('transfer-time').value = '';
                fileInput.value = '';
                document.getElementById('preview-container').classList.add('hidden');
                document.getElementById('upload-placeholder').classList.remove('hidden');
                document.getElementById('file-label-text').innerText = "اضغط هنا لاختيار صورة الإيصال";
                showPage('page-main');
            }, 2500);
        } else {
            showToast("فشل إرسال الإشعار، حاول مرة أخرى.");
        }

    } catch (error) {
        console.error(error);
        showToast("حدث خطأ أثناء معالجة الطلب.");
    } finally {
        // إعادة تفعيل الزر
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-55', 'cursor-not-allowed');
        submitBtnText.innerText = "تأكيد وإرسال التحويل";
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
