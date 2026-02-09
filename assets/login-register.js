const spinPrizes = [
{ label: '₹1,500 OFF', value: '1500_off', chance: 20 },
{ label: '₹1,000 OFF', value: '1000_off', chance: 20 },
{ label: '₹750 OFF', value: '750_off', chance: 60 },
{ label: 'Diamond Pendant', value: 'diamond_pendant', chance: 0 },
{ label: '₹5,000 OFF', value: '5000_off', chance: 0 },
{ label: '₹10,000 OFF', value: '10000_off', chance: 0 },
];

const globalOffset = 0;

const wheelSegments = [
{
    value: '10000_off',
    label: '₹10,000 OFF',
    centerAngle: 0,
},
{
    value: '1000_off',
    label: '₹1,000 OFF',
    centerAngle: 60,
},
{
    value: '5000_off',
    label: '₹5,000 OFF',
    centerAngle: 120,
},
{
    value: '750_off',
    label: '₹750 OFF',
    centerAngle: 180,
},
{
    value: 'diamond_pendant',
    label: 'Diamond Pendant',
    centerAngle: 240,
},
{
    value: '1500_off',
    label: '₹1,500 OFF',
    centerAngle: 300,
},
];

function openloginPopup(id) {
document.getElementById(id).style.display = 'flex';
}

function closeloginPopup(e, id) {
  if (typeof id === 'undefined') id = e;
  document.getElementById(id).style.display = 'none';
  resetToLoginView();
  const popup = document.getElementById('login-popup');
  if (!popup) return;
  const h2 = popup.querySelector('.otp-number-wrapper h2');
  const p = popup.querySelector('.otp-number-wrapper p');
  if (h2) h2.innerText = ORIGINAL_POPUP_HEADING;
  if (p) p.innerText = ORIGINAL_POPUP_SUBTEXT;
}


document.querySelectorAll('.otp-login-form-wrapper').forEach((el) => {
el.addEventListener('click', (e) => e.stopPropagation());
});

function showError(elementId, message) {
const errorElement = document.getElementById(elementId);
errorElement.textContent = message;
errorElement.style.display = 'block';
const inputId = elementId.replace('Error', '');
const inputElement = document.getElementById(inputId);
if (inputElement) inputElement.style.border = '1px solid red';
}

function hideError(elementId) {
const errorElement = document.getElementById(elementId);
errorElement.style.display = 'none';
const inputId = elementId.replace('Error', '');
const inputElement = document.getElementById(inputId);
if (inputElement) inputElement.style.border = '';
}

function validateMobile(mobile) {
if (!mobile) return 'Please enter your phone number';
if (mobile.length !== 10) return 'Phone number must be 10 digits';
if (!/^\d+$/.test(mobile)) return 'Phone number must contain only digits';
return null;
}

function validateEmail(email) {
if (!email) return 'Please enter your email address';
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) return 'Please enter a valid email address';
return null;
}

function validateName(name, fieldName) {
if (!name) return `Please enter your ${fieldName}`;
if (name.length < 2) return `${fieldName} must be at least 2 characters`;
return null;
}

const emailInput = document.getElementById('regEmail');
if (emailInput) {
emailInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toLowerCase();
});
}

function focusOtp() {
const firstOtp = document.querySelector('.otp-inputs input');
if (firstOtp) firstOtp.focus();
}

const sendBtn = document.getElementById('sendOtp');
if (sendBtn) {
sendBtn.addEventListener('click', async () => {
    const rawInput = document.getElementById('loginMobile').value;
    let cleanMobile = rawInput.replace(/\D/g, ''); 

    if (cleanMobile.length === 10) {
    cleanMobile = '91' + cleanMobile;
    }

    if (cleanMobile.length < 10) {
    showError('mobileError', 'Please enter a valid phone number');
    return;
    }
    hideError('mobileError');

    sendBtn.disabled = true;
    sendBtn.style.opacity = '0.6';

    document.querySelector('.otp-number-wrapper').style.display = 'none';
    sendBtn.style.display = 'none';
    document.getElementById('otpSection').style.display = 'block';
    
    document.getElementById('otpMobile').value = rawInput; 
    focusOtp();
    startTimer();

    try {
        const response = await fetch('https://login-otp-385594025448.asia-south1.run.app', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            body: JSON.stringify({ mobile: cleanMobile }),
        });
        
        const data = await response.json();
        
        if (data.type !== 'success') {
            showError('mobileError', data.message || 'Failed to send OTP');
            sendBtn.disabled = false;
            sendBtn.style.opacity = '1';
            document.querySelector('.otp-number-wrapper').style.display = 'block';
            sendBtn.style.display = 'block';
            document.getElementById('otpSection').style.display = 'none';
            return;
        }
    } catch (e) {
        console.error('OTP Send Error:', e);
        showError('mobileError', 'Failed to send OTP. Please try again.');
        sendBtn.disabled = false;
        sendBtn.style.opacity = '1';
        document.querySelector('.otp-number-wrapper').style.display = 'block';
        sendBtn.style.display = 'block';
        document.getElementById('otpSection').style.display = 'none';
    }
});
}

const verifyBtn = document.getElementById('verifyOtp');
if (verifyBtn) {
verifyBtn.addEventListener('click', async () => {
    const otp = [...document.querySelectorAll('.otp-inputs input')].map((i) => i.value).join('');
    const mobile = document.getElementById('otpMobile').value.replace(/\s+/g, '').trim();

    if (otp.length !== 4) {
    showError('otpError', 'Please enter a valid 4-digit OTP');
    return;
    }
    hideError('otpError');
    verifyBtn.textContent = 'Verifying...';
    verifyBtn.disabled = true;

    try {
    const res = await fetch('https://otp-verification-385594025448.asia-south1.run.app', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        body: JSON.stringify({ otp, mobile }),
    });

    const data = await res.json();

    function pushLoginEvent(email, mobile) {
        window.dataLayer = window.dataLayer || [];

        const params = new URLSearchParams(window.location.search);

        dataLayer.push({
        event: 'login',
        User: {
            email: email || '',
            mobile: mobile || '',
            source: params.get('utm_source') || '',
            medium: params.get('utm_medium') || '',
            campaign: params.get('utm_campaign') || ''
        }
        });
    }


    if (data.type === 'success' && data.credentials) {
        const email = data.credentials.email;
        const mobile = document.getElementById('otpMobile').value.trim();
        pushLoginEvent(email, mobile);

        shopifyAutoLogin(email, data.credentials.password);
        return;
    }


    if (data.type === 'register') {
        document.getElementById('signupMobile').value = mobile;
        showSignupWithSpinWheel();
        verifyBtn.textContent = 'VERIFY OTP';
        verifyBtn.disabled = false;
        return;
    }
    showError('otpError', data.msg || 'Invalid OTP');
    } catch (err) {
    console.error(err);
    showError('otpError', 'Something went wrong');
    }
    verifyBtn.textContent = 'VERIFY OTP';
    verifyBtn.disabled = false;
});
}

function getWeightedPrize() {
let totalChance = spinPrizes.reduce((sum, prize) => sum + prize.chance, 0);
let random = Math.random() * totalChance;

for (let i = 0; i < spinPrizes.length; i++) {
    if (random < spinPrizes[i].chance) {
    return spinPrizes[i];
    }
    random -= spinPrizes[i].chance;
}
return spinPrizes[0];
}

function findWheelSegmentsForPrize(prizeValue) {
return wheelSegments.filter((seg) => seg.value === prizeValue);
}

function getRandomSegmentForPrize(prizeValue) {
const matchingSegments = findWheelSegmentsForPrize(prizeValue);

if (matchingSegments.length === 0) {
    console.error('No wheel segment found for prize:', prizeValue);
    return wheelSegments[0];
}

const randomIndex = Math.floor(Math.random() * matchingSegments.length);
return matchingSegments[randomIndex];
}

const regBtn = document.getElementById('completeRegistration');

if (regBtn) {
regBtn.addEventListener('click', async () => {
    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const email = document.getElementById('regEmail').value.trim();

    let hasError = false;
    if (validateName(firstName, 'first name')) {
    showError('firstNameError', validateName(firstName, 'first name'));
    hasError = true;
    } else hideError('firstNameError');
    if (validateName(lastName, 'last name')) {
    showError('lastNameError', validateName(lastName, 'last name'));
    hasError = true;
    } else hideError('lastNameError');
    if (validateEmail(email)) {
    showError('emailError', validateEmail(email));
    hasError = true;
    } else hideError('emailError');

    if (hasError) return;

    regBtn.textContent = 'Spinning...';
    regBtn.disabled = true;

    const wonPrize = getWeightedPrize();
    console.log('🎯 Prize selected (weighted):', wonPrize);

    const targetSegment = getRandomSegmentForPrize(wonPrize.value);
    console.log('🎡 Target segment:', targetSegment);

    const wheel = document.getElementById('spin-wheel-image');

    const extraSpins = 360 * 5;
    const targetRotation = -targetSegment.centerAngle;
    const finalRotation = -(extraSpins + Math.abs(targetRotation));

    console.log('🔄 Rotation:', {
    segmentCenter: targetSegment.centerAngle + '°',
    finalRotation: finalRotation + '°',
    extraSpins: extraSpins,
    });

    if (wheel) {
    wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    wheel.style.transform = `translate(-50%, -50%) rotate(${finalRotation}deg)`;
    }

    setTimeout(async () => {
    console.log('✅ Spin complete! Winner:', wonPrize);
    document.getElementById('spinResult').value = wonPrize.value;
    await processRegistration(firstName, lastName, email, wonPrize);
    }, 4200);
});
}

async function processRegistration(firstName, lastName, email, prizeData) {
const mobile = document.getElementById('signupMobile').value.trim();
const otp = [...document.querySelectorAll('.otp-inputs input')].map((i) => i.value).join('');
const regBtn = document.getElementById('completeRegistration');

regBtn.textContent = 'Creating Account...';

try {
    const res = await fetch('https://otp-verification-385594025448.asia-south1.run.app', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    body: JSON.stringify({
        mobile: mobile,
        otp: otp,
        email: email,
        first_name: firstName,
        last_name: lastName,
        won_prize: prizeData.value,
        prize_label: prizeData.label,
    }),
    });

    const data = await res.json();

    if (data.type === 'success' && data.credentials) {
    showSuccessCoupon(prizeData.value);

    window.dataLayer = window.dataLayer || [];
    dataLayer.push({
        event: 'signup',
        user: {
        name: firstName + ' ' + lastName,
        email: email,
        mobile: mobile,
        signupoffer: prizeData.label,
        },
    });

    setTimeout(() => {
        closeloginPopup('login-popup');
        shopifyAutoLogin(data.credentials.email, data.credentials.password);
    }, 5000);
    } else {
    showError('emailError', data.msg || 'Registration failed.');
    regBtn.textContent = 'SPIN & CREATE ACCOUNT';
    regBtn.disabled = false;
    }
} catch (error) {
    console.error('Registration Error:', error);
    showError('emailError', 'Connection error. Please try again.');
    regBtn.textContent = 'SPIN & CREATE ACCOUNT';
    regBtn.disabled = false;
}
}

function shopifyAutoLogin(email, password) {
var currentPath = window.location.pathname + window.location.search;
document.getElementById('loginReturnTo').value = currentPath;
document.getElementById('ShopifyEmail').value = email;
document.getElementById('ShopifyPassword').value = password;
document.getElementById('shopify-auto-login-form').submit();
}

function showSignupWithSpinWheel() {
const wrapper = document.querySelector('.otp-login-form-wrapper');
const wheel = document.querySelector('.spin-wheel-wrapper');
if (!wrapper || !wheel) return;

document.querySelector('.otp-number-wrapper')?.style.setProperty('display', 'none');
document.getElementById('sendOtp')?.style.setProperty('display', 'none');
document.getElementById('otpSection')?.style.setProperty('display', 'none');

document.querySelector('.signupSection')?.style.setProperty('display', 'block');
wheel.style.display = 'flex';
wheel.style.visibility = 'visible';

wrapper.classList.add('signup-active');
}

function resetToLoginView() {
const wrapper = document.querySelector('.otp-login-form-wrapper');
if (!wrapper) return;

wrapper.classList.remove('signup-active');
document.querySelector('.signupSection')?.style.setProperty('display', 'none');
document.querySelector('.otp-number-wrapper')?.style.setProperty('display', 'block');
document.getElementById('sendOtp')?.style.setProperty('display', 'block');
document.getElementById('otpSection')?.style.setProperty('display', 'none');

const sendBtn = document.getElementById('sendOtp');
if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.style.opacity = '1';
}

const wheel = document.getElementById('spin-wheel-image');

if (wheel) {
    wheel.style.transition = 'none';
    wheel.style.transform = 'translate(-50%, -50%) rotate(0deg)';
    setTimeout(() => {
    wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    }, 50);
}

const wheelWrapper = document.querySelector('.spin-wheel-wrapper');
if (wheelWrapper) {
    wheelWrapper.style.display = 'none';
    wheelWrapper.style.visibility = 'hidden';
}

document.getElementById('regFirstName').value = '';
document.getElementById('regLastName').value = '';
document.getElementById('regEmail').value = '';
document.querySelectorAll('.otp-inputs input').forEach((input) => (input.value = ''));

hideError('firstNameError');
hideError('lastNameError');
hideError('emailError');
hideError('mobileError');
hideError('otpError');

const regBtn = document.getElementById('completeRegistration');
if (regBtn) {
    regBtn.textContent = 'SPIN & CREATE ACCOUNT';
    regBtn.disabled = false;
}
}

const otpInputs = document.querySelectorAll('.otp-inputs input');
otpInputs.forEach((input, index) => {
input.addEventListener('input', (e) => {
    const value = e.target.value.replace(/\D/g, '');
    e.target.value = value;
    if (value && index < otpInputs.length - 1) otpInputs[index + 1].focus();
});
input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !e.target.value && index > 0) otpInputs[index - 1].focus();
});
});

let timer = 30;
let timerInterval;
function startTimer() {
timer = 30;
clearInterval(timerInterval);

timerInterval = setInterval(() => {
    if (timer <= 0) {
    clearInterval(timerInterval);
    document.getElementById(
        'otp-timer'
    ).innerHTML = `<a href="javascript:void(0)" onclick="resendOtp()">Resend OTP</a>`;
    return; // 🔥 IMPORTANT
    }

    let min = Math.floor(timer / 60);
    let sec = timer % 60;
    document.getElementById('otp-timer').innerText = `Resend OTP in ${min}:${sec < 10 ? '0' + sec : sec}`;

    timer--;
}, 1000);
}
async function resendOtp() {
    const rawMobile = document.getElementById('otpMobile').value.trim();
    let mobileToVerify = rawMobile.replace(/\D/g, '');

    // Normalize to 91 prefix
    if (mobileToVerify.length === 10) mobileToVerify = '91' + mobileToVerify;

    await fetch('https://login-otp-385594025448.asia-south1.run.app', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        body: JSON.stringify({ mobile: mobileToVerify }), // Use the local variable
    });

    document.getElementById('otp-timer').innerText = 'Resend OTP in 00:30';
    startTimer(); 
}

document.addEventListener('DOMContentLoaded', function () {
const registerBtn = document.getElementById('completeRegistration');
const consent = document.getElementById('privacyConsent');
const error = document.getElementById('consentError');

if (!registerBtn) return;

registerBtn.addEventListener('click', function () {
    if (!consent || !consent.checked) {
    error.style.display = 'block';
    return;
    }

    error.style.display = 'none';
    // existing spin + register logic will continue
});
});

document.documentElement.classList.remove('popup-boot-lock');

function showSuccessCoupon(prizeValue) {
const couponMap = {
    '750_off': 'GRAND750',
    '1000_off': 'GRAND1000',
    '1500_off': 'GRAND1500',
};

const coupon = couponMap[prizeValue] || '';

document.querySelector('.signupSection')?.style.setProperty('display', 'none');
document.getElementById('otpSection')?.style.setProperty('display', 'none');
document.getElementById('successSection').style.display = 'block';
document.getElementById('couponCode').innerText = coupon;
}

document.addEventListener('DOMContentLoaded', function() {
const copyBtn = document.getElementById('copyCoupon');
const codeSpan = document.getElementById('couponCode');
const feedbackMsg = document.getElementById('copyFeedback'); // From your previous code

if (copyBtn) {
    copyBtn.addEventListener('click', function(e) {
    e.preventDefault(); // Prevent any default button behavior

    // 1. Get the text to copy
    // We check data-coupon first, fallback to innerText
    const textToCopy = codeSpan.getAttribute('data-coupon') || codeSpan.innerText;

    if (!textToCopy) {
        alert('No code available to copy!');
        return;
    }

    // 2. Copy to Clipboard API
    navigator.clipboard.writeText(textToCopy).then(function() {
        
        // --- Success State ---
        
        // Option A: Show the feedback text below (if you have that element)
        if (feedbackMsg) {
        feedbackMsg.style.display = 'block';
        feedbackMsg.innerText = 'Code copied!';
        setTimeout(() => {
            feedbackMsg.style.display = 'none';
        }, 2000);
        }

        // Option B: Visual feedback on the button itself (optional)
        const originalTitle = copyBtn.getAttribute('title');
        copyBtn.setAttribute('title', 'Copied!');
        copyBtn.classList.add('copied-success'); // Add a class for CSS styling
        
        setTimeout(() => {
        copyBtn.setAttribute('title', originalTitle);
        copyBtn.classList.remove('copied-success');
        }, 2000);

    }).catch(function(err) {
        console.error('Failed to copy: ', err);
    });
    });
}
});

function hasLuciraSessionPopup() {
return sessionStorage.getItem('lucira_login_popup_seen') === 'true';
}

function setLuciraSessionPopup() {
sessionStorage.setItem('lucira_login_popup_seen', 'true');
}
document.addEventListener('DOMContentLoaded', function () {
const POPUP_ID = 'login-popup';
const SHOW_DELAY = 15000;

const popup = document.getElementById(POPUP_ID);
if (!popup) return;

if (hasLuciraSessionPopup()) return;
if (document.body.classList.contains('customer-logged-in')) return;
setTimeout(() => {
    if (hasLuciraSessionPopup()) return;
    popup.style.display = 'flex';
    document.querySelector('.otp-login-form-wrapper')
    ?.classList.add('signup-active');
    document.querySelector('.otp-number-wrapper')
    ?.style.setProperty('display', 'block');
    document.getElementById('sendOtp')
    ?.style.setProperty('display', 'block');
    document.getElementById('otpSection')
    ?.style.setProperty('display', 'none');
    document.querySelector('.signupSection')
    ?.style.setProperty('display', 'none');

    const wheelWrapper = document.querySelector('.spin-wheel-wrapper');
    if (wheelWrapper) {
    wheelWrapper.style.display = 'flex';
    wheelWrapper.style.visibility = 'visible';
    }
    const heading = popup.querySelector('.otp-number-wrapper h2');
    const subtext = popup.querySelector('.otp-number-wrapper p');
    if (heading) heading.innerText = 'REGISTER & WIN';
    if (subtext) subtext.innerText = 'Get assured reward of ₹750';
    setLuciraSessionPopup();
}, SHOW_DELAY);
});

let ORIGINAL_POPUP_HEADING = '';
let ORIGINAL_POPUP_SUBTEXT = '';

document.addEventListener('DOMContentLoaded', () => {
  const popup = document.getElementById('login-popup');
  if (!popup) return;

  const h2 = popup.querySelector('.otp-number-wrapper h2');
  const p = popup.querySelector('.otp-number-wrapper p');

  if (h2) ORIGINAL_POPUP_HEADING = h2.innerText;
  if (p) ORIGINAL_POPUP_SUBTEXT = p.innerText;
});
