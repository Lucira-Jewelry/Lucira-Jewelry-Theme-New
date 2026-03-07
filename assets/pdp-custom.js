/**
 * PDP Custom Logic & Tracking
 * Consolidated from inline scripts in main-product.liquid and product-media-gallery.liquid
 */

// Nector Reviews Style Injection
(function() {
    const targetId = 'nector-reviews';
    const styles = `
        .nector-text button { font-size: 14px !important; }
        .nector-container .nector-text { font-size: 0; line-height: 2; padding: 8px 30px; font-family: 'Futura Std', sans-serif; text-transform: capitalize; border-radius: 8px !important; }
        .nector-text br { display: none; }
        .nector-reviews-qna-segment-group {justify-content: center; width: 100%;}
        .nector-reviews-heading-container + div {padding: 0 !important;}
        .nector-container .nector-reviews {max-width: 1600px;}
        .nector-reviews-sorter {font-size: 12px !important;padding: 8px 12px !important;}
        .nector-reviews .card .card-body div + div + div {display: grid; grid-template-columns: repeat(3, 1fr);}
        .nector-reviews .card .card-body img {height: auto; width: 100%; aspect-ratio: 1 / 1;}
        .nector-reviews .card {border: 1px solid #eaeaea; background: #f9f9f9;}
        .nector-truncate-text.nector-subtitle {display: flex; align-items: center; text-transform: capitalize; font-size: 16px; letter-spacing: 0.6px; margin-bottom: 8px; font-weight: 500;}
        .nector-pretext.nector-review-product-title {font-size: 12px; font-weight: 500; letter-spacing: 0.6px;text-decoration: none;}
        .nector-center a {color: #1A1A1A;font-size: 12px; font-weight: 500; letter-spacing: 0.6px;}
        .nector-center a span { text-decoration: none !important;}
        .rc-rate-star-half .rc-rate-star-first, .rc-rate-star-full .rc-rate-star-second { color: #f5a623 !important; }
        #nector-reviews + div div span {font-size: 14px; letter-spacing: 0.8px; color: #666;}
    `;

    function injectStyles(element) {
        if (element && element.shadowRoot) {
            const styleTag = document.createElement('style');
            styleTag.textContent = styles.trim();
            element.shadowRoot.appendChild(styleTag);
            return true;
        }
        return false;
    }

    const initNector = () => {
        const el = document.getElementById(targetId);
        if (el && injectStyles(el)) return;

        const observer = new MutationObserver((mutations, obs) => {
            const el = document.getElementById(targetId);
            if (el && el.shadowRoot) {
                if (injectStyles(el)) {
                    obs.disconnect();
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 10000);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNector);
    } else {
        initNector();
    }
})();

// Try at Home & Visit Store Popups
window.openTryAtHomeOverlay = function() {
    const el = document.getElementById('tryAtHomeOverlay');
    if(el) el.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.closeTryAtHomeOverlay = function() {
    const el = document.getElementById('tryAtHomeOverlay');
    if(el) el.style.display = 'none';
    document.body.style.overflow = 'auto';
    resetTryAtHomeForm();
};

function resetTryAtHomeForm() {
    const section = document.getElementById('tryAtHomeFormSection');
    const success = document.getElementById('tryAtHomeSuccessMessage');
    const form = document.getElementById('tryAtHomeContactForm');
    const btn = document.getElementById('tryAtHomeSubmitBtn');
    if(section) section.style.display = 'block';
    if(success) success.style.display = 'none';
    if(form) form.reset();
    if(btn) {
        btn.disabled = true;
        btn.textContent = 'Submit';
    }
}

window.openVisitStoreOverlay = function() {
    const el = document.getElementById('visitStoreOverlay');
    if(el) el.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.closeVisitStoreOverlay = function() {
    const el = document.getElementById('visitStoreOverlay');
    if(el) el.style.display = 'none';
    document.body.style.overflow = 'auto';
    resetVisitStoreForm();
};

function resetVisitStoreForm() {
    const section = document.getElementById('visitStoreFormSection');
    const success = document.getElementById('visitStoreSuccessMessage');
    const form = document.getElementById('visitStoreContactForm');
    const btn = document.getElementById('visitStoreSubmitBtn');
    if(section) section.style.display = 'block';
    if(success) success.style.display = 'none';
    if(form) form.reset();
    if(btn) {
        btn.disabled = true;
        btn.textContent = 'Submit';
    }
}

// Validation and Submissions
document.addEventListener('DOMContentLoaded', function() {
    const tryAtHomePhone = document.getElementById('try_at_home_phone');
    const tryAtHomeName = document.getElementById('try_at_home_name');
    const tryAtHomeSubmitBtn = document.getElementById('tryAtHomeSubmitBtn');
    const tryAtHomePhoneError = document.getElementById('try_at_home_phoneError');
    const tryAtHomeForm = document.getElementById('tryAtHomeContactForm');

    function validateTryAtHome() {
        if(!tryAtHomePhone || !tryAtHomeName) return;
        const phoneValue = tryAtHomePhone.value;
        const nameValue = tryAtHomeName.value.trim();
        const isPhoneValid = phoneValue.length === 10;
        if (tryAtHomePhoneError) tryAtHomePhoneError.style.display = (phoneValue.length > 0 && !isPhoneValid) ? 'block' : 'none';
        if (tryAtHomeSubmitBtn) tryAtHomeSubmitBtn.disabled = !(isPhoneValid && nameValue);
    }

    if(tryAtHomePhone) tryAtHomePhone.addEventListener('input', validateTryAtHome);
    if(tryAtHomeName) tryAtHomeName.addEventListener('input', validateTryAtHome);

    if(tryAtHomeForm) {
        tryAtHomeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            tryAtHomeSubmitBtn.disabled = true;
            tryAtHomeSubmitBtn.textContent = 'Submitting...';
            const formData = {
                name: tryAtHomeName.value.trim(),
                phone: tryAtHomePhone.value,
                product_title: document.getElementById('try_at_home_product_title')?.value || 'Unknown Product',
                type: 'try_at_home',
            };
            try {
                const response = await fetch('https://try-at-home-webhook-385594025448.asia-south1.run.app', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });
                if (response.ok) {
                    document.getElementById('tryAtHomeFormSection').style.display = 'none';
                    document.getElementById('tryAtHomeSuccessMessage').style.display = 'block';
                    setTimeout(() => window.closeTryAtHomeOverlay(), 6000);
                } else { throw new Error('Failed'); }
            } catch (error) {
                alert('Something went wrong.');
                tryAtHomeSubmitBtn.disabled = false;
                tryAtHomeSubmitBtn.textContent = 'Submit';
            }
        });
    }

    const visitStorePhone = document.getElementById('visit_store_phone');
    const visitStoreName = document.getElementById('visit_store_name');
    const visitStoreSubmitBtn = document.getElementById('visitStoreSubmitBtn');
    const visitStorePhoneError = document.getElementById('visit_store_phoneError');
    const visitStoreForm = document.getElementById('visitStoreContactForm');

    function validateVisitStore() {
        if(!visitStorePhone || !visitStoreName) return;
        const phoneValue = visitStorePhone.value;
        const nameValue = visitStoreName.value.trim();
        const isPhoneValid = phoneValue.length === 10;
        if (visitStorePhoneError) visitStorePhoneError.style.display = (phoneValue.length > 0 && !isPhoneValid) ? 'block' : 'none';
        if (visitStoreSubmitBtn) visitStoreSubmitBtn.disabled = !(isPhoneValid && nameValue);
    }

    if(visitStorePhone) visitStorePhone.addEventListener('input', validateVisitStore);
    if(visitStoreName) visitStoreName.addEventListener('input', validateVisitStore);

    if(visitStoreForm) {
        visitStoreForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            visitStoreSubmitBtn.disabled = true;
            visitStoreSubmitBtn.textContent = 'Submitting...';
            const storeName = document.getElementById('visit_store_location')?.value || 'Unknown Store';
            const formData = {
                name: visitStoreName.value.trim(),
                phone: visitStorePhone.value,
                type: 'visit_store',
                store: storeName,
            };
            try {
                const response = await fetch('https://try-at-home-webhook-385594025448.asia-south1.run.app', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });
                if (response.ok) {
                    document.getElementById('visitStoreFormSection').style.display = 'none';
                    document.getElementById('visitStoreSuccessMessage').style.display = 'block';
                    setTimeout(() => window.closeVisitStoreOverlay(), 6000);
                } else { throw new Error('Failed'); }
            } catch (error) {
                alert('Something went wrong.');
                visitStoreSubmitBtn.disabled = false;
                visitStoreSubmitBtn.textContent = 'Submit';
            }
        });
    }
});

// GA Tracking & Listeners
(function() {
    function addTrackingListeners() {
        document.querySelectorAll('.try-at-home-button').forEach((btn) => {
            if (!btn.dataset.trackingBound) {
                btn.addEventListener('click', function () {
                    window.dataLayer = window.dataLayer || [];
                    window.dataLayer.push({
                        event: 'promoClick',
                        promoClick: {
                            promo_id: 'Try at Home',
                            promo_name: 'Try at Home Button',
                            creative_name: 'Try at Home Section',
                            location_id: 'TryAtHomeOverlay',
                        },
                    });
                });
                btn.dataset.trackingBound = true;
            }
        });

        document.querySelectorAll('.visit-store-home-button').forEach((btn) => {
            if (!btn.dataset.trackingBound) {
                btn.addEventListener('click', function () {
                    window.dataLayer = window.dataLayer || [];
                    window.dataLayer.push({
                        event: 'promoClick',
                        promoClick: {
                            promo_id: window.ShopifyAnalytics?.meta?.product?.id || '',
                            creative_name: 'Visit Store Button clicked',
                            location_id: 'Pdp',
                        },
                    });
                });
                btn.dataset.trackingBound = true;
            }
        });

        const visitStoreSubmitBtn = document.getElementById('visitStoreSubmitBtn');
        if (visitStoreSubmitBtn && !visitStoreSubmitBtn.dataset.trackingBound) {
            visitStoreSubmitBtn.addEventListener('click', function () {
                if (!this.disabled) {
                    const personName = document.getElementById('visit_store_name')?.value || '';
                    const locationSelected = document.getElementById('visit_store_location')?.value || '';
                    window.dataLayer = window.dataLayer || [];
                    window.dataLayer.push({
                        event: 'promoClick',
                        promoClick: {
                            promo_id: window.ShopifyAnalytics?.meta?.product?.id || '',
                            creative_name: 'Visit Store Form-Submit',
                            promo_name: personName,
                            location_id: locationSelected,
                        },
                    });
                }
            });
            visitStoreSubmitBtn.dataset.trackingBound = true;
        }

        const engravingBtn = document.getElementById('product_engraving_confirm_submit');
        if (engravingBtn && !engravingBtn.dataset.trackingBound) {
            engravingBtn.addEventListener('click', function () {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    event: 'promoClick',
                    promoClick: {
                        promo_id: 'Engraving',
                        promo_name: 'Add Engraving Clicked',
                        creative_name: 'Engraving Drawer',
                    },
                });
            });
            engravingBtn.dataset.trackingBound = true;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addTrackingListeners);
    } else {
        addTrackingListeners();
    }
    document.addEventListener('shopify:section:load', addTrackingListeners);
})();

// Add to Cart Tracking
(function() {
    if (window.atcListenerInitialized) return;
    window.atcListenerInitialized = true;
    window.lastAddToCartTime = 0;

    function getSelectedVariant(atcForm) {
        if (!atcForm) return null;
        const variantInput = atcForm.querySelector('input[name="id"]');
        if (!variantInput) return null;
        const variantId = variantInput.value;
        if (window.meta && window.meta.product && window.meta.product.variants) {
            return window.meta.product.variants.find((v) => v.id == variantId) || null;
        }
        return { id: variantId };
    }

    function setupATC() {
        const atcButton = document.querySelector('[type="submit"][name="add"]');
        const atcForm = atcButton ? atcButton.closest('form') : null;
        if (!atcButton || !atcForm) return;

        atcForm.addEventListener('submit', function(e) {
            const now = Date.now();
            if (now - window.lastAddToCartTime < 2000) return;
            window.lastAddToCartTime = now;
            const variant = getSelectedVariant(atcForm);
            const product = window.ShopifyAnalytics?.meta?.product;

            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: 'addToCart',
                eventId: 'atc_' + now,
                products: {
                    productId: product?.id,
                    variantId: variant?.id,
                    sku: variant?.sku,
                    productName: product?.variants?.find(v => v.id == variant?.id)?.name || '',
                    price: variant?.price ? (variant.price / 100).toFixed(2) : '0.00'
                },
            });
        }, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupATC);
    } else {
        setupATC();
    }
})();

// Share functionality
window.share = function(productTitle, productUrl, sku, productId) {
    const shareData = { title: 'Lucira', url: productUrl || window.location.href };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        event: 'promoClick',
        promoClick: {
            promo_id: sku,
            promo_name: productTitle,
            creative_name: 'share',
            location_id: productId
        },
    });
    if (navigator.share) {
        navigator.share(shareData).catch(() => {});
    } else {
        navigator.clipboard.writeText(shareData.url).then(() => alert('Link copied!'));
    }
};

// Exit Intent Logic
(function() {
    const STORAGE_KEY_PREFIX = 'exit_intent_';
    const PDP_COUNT_KEY = 'pdp_view_count';
    const ATC_KEY_PREFIX = 'atc_clicked_';

    const CONFIG = {
        RAPID_SCROLL_PX: 120,
        RAPID_SCROLL_MS: 300,
        SCROLL_ARM_DEPTH_PX: 300,
        VISIBILITY_RETURN_MS: 8000,
        MOUSE_EXIT_MAX_Y: 50,
        MIN_PDP_VIEWS: 2,
        MIN_TIME_ON_PDP_MS: 20000,
    };

    let state = {
        drawn: false,
        armed: false,
        hiddenAt: null,
        scrollSamples: [],
        lastScrollY: window.scrollY,
        lastMouseY: null,
        mouseVelY: 0,
        pendingMouseY: null,
        pageEnterTime: Date.now(),
    };

    function getPDPId() {
        return window.ShopifyAnalytics?.meta?.product?.id || 'default';
    }

    function incrementPDPCount() {
        try {
            const current = parseInt(sessionStorage.getItem(PDP_COUNT_KEY) || '0', 10);
            sessionStorage.setItem(PDP_COUNT_KEY, String(current + 1));
        } catch (e) {}
    }

    function initATCWatcher() {
        const ATC_SELECTORS = '[name="add"], .product-form__submit, [data-testid="Sticky-Add-To-Cart"], .sticky-atc-btn, .product-form button[type="submit"]';
        document.addEventListener('click', (e) => {
            if (e.target.closest(ATC_SELECTORS)) {
                sessionStorage.setItem(ATC_KEY_PREFIX + getPDPId(), '1');
            }
        }, { passive: true });
    }

    function canFire() {
        if (state.drawn) return false;
        if (sessionStorage.getItem(STORAGE_KEY_PREFIX + getPDPId())) return false;
        if (sessionStorage.getItem(ATC_KEY_PREFIX + getPDPId())) return false;
        if (parseInt(sessionStorage.getItem(PDP_COUNT_KEY) || '0', 10) < CONFIG.MIN_PDP_VIEWS) return false;
        if (Date.now() - state.pageEnterTime < CONFIG.MIN_TIME_ON_PDP_MS) return false;
        return true;
    }

    function fire() {
        if (!canFire()) return;
        state.drawn = true;
        sessionStorage.setItem(STORAGE_KEY_PREFIX + getPDPId(), '1');

        const btn = document.querySelector('.view-similar-btn');
        if (btn) {
            const observer = new MutationObserver((mutations, obs) => {
                const titleEl = document.getElementById('similar-items-title');
                if (titleEl) {
                    titleEl.textContent = 'Still Deciding? Explore More';
                    obs.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => observer.disconnect(), 3000);
            btn.click();
        }
    }

    function init() {
        if (!document.querySelector('.view-similar-btn')) return;
        incrementPDPCount();
        initATCWatcher();

        if (window.innerWidth <= 768) {
            window.addEventListener('scroll', () => {
                const currentY = window.scrollY;
                const now = Date.now();
                if (currentY > CONFIG.SCROLL_ARM_DEPTH_PX) state.armed = true;
                if (state.armed && currentY < state.lastScrollY) {
                    state.scrollSamples.push({ y: currentY, t: now });
                    state.scrollSamples = state.scrollSamples.filter(s => now - s.t <= CONFIG.RAPID_SCROLL_MS);
                    if (state.scrollSamples.length >= 2) {
                        const oldest = state.scrollSamples[0];
                        const newest = state.scrollSamples[state.scrollSamples.length - 1];
                        if (oldest.y - newest.y >= CONFIG.RAPID_SCROLL_PX) fire();
                    }
                } else { state.scrollSamples = []; }
                state.lastScrollY = currentY;
            }, { passive: true });

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    state.hiddenAt = Date.now();
                } else if (document.visibilityState === 'visible' && state.hiddenAt) {
                    if (Date.now() - state.hiddenAt <= CONFIG.VISIBILITY_RETURN_MS) setTimeout(() => fire(), 200);
                    state.hiddenAt = null;
                }
            });
        } else {
            document.addEventListener('mouseleave', (e) => {
                if (e.clientY <= CONFIG.MOUSE_EXIT_MAX_Y) fire();
            });
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

// Wishlist Tracking
document.addEventListener('DOMContentLoaded', function() {
    const wishlistBtns = document.querySelectorAll('.product-form .iWishAdd');
    wishlistBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (btn.classList.contains('iwishAdded')) return;
            const variantId = parseInt(btn.getAttribute('data-variant')) || 0;
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: 'addToWishlist',
                products: {
                    productId: btn.getAttribute('data-product'),
                    variant_id: variantId,
                    productName: btn.getAttribute('data-ptitle')
                },
            });
            btn.classList.add('iwishAdded');
        });
    });
});

// Delivery Widget Logic
(function () {
  'use strict';
  function showError(msg) {
    const el = document.getElementById('lucira-pincode-error');
    if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
  }
  function setLocateBtnState(loading) {
    const btn = document.getElementById('lucira-locate-btn');
    const label = btn && btn.querySelector('.locate-btn-label');
    if (btn) { btn.disabled = loading; if (label) label.textContent = loading ? 'Locating...' : 'Locate Me'; }
  }
  function pushPromoClick(pincode) {
    const container = document.getElementById('pdp-delivery-check');
    if (!container) return;
    const variantId = window.ShopifyAnalytics?.meta?.selectedVariantId || '';
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'promoClick',
      promoClick: {
        promo_id: container.dataset.productSku,
        promo_name: container.dataset.productTitle,
        creative_name: 'pincodeEntered',
        promo_position: pincode,
        location_id: variantId
      }
    });
  }
  function fetchWithRetry(url, retries = 1) {
    return fetch(url).then(r => r.json()).catch(err => { if (retries > 0) return fetchWithRetry(url, retries - 1); throw err; });
  }
  function initDeliveryWidget() {
    const locateBtn = document.getElementById('lucira-locate-btn');
    const pincodeInput = document.getElementById('lucira-delivery-zipcode');
    if (!pincodeInput) return;
    const handleManualSearch = () => {
      const val = pincodeInput.value.replace(/\s+/g, '').trim();
      if (/^\d{6}$/.test(val)) {
        showError('');
        fetchWithRetry('https://nominatim.openstreetmap.org/search?postalcode=' + val + '&country=India&format=json')
          .then(data => { if (data && data.length > 0) pushPromoClick(val); else showError('Pincode not found.'); })
          .catch(() => showError('Service unavailable.'));
      } else showError('Please enter a valid 6-digit pincode.');
    };
    if (locateBtn) {
      locateBtn.addEventListener('click', () => {
        showError('');
        if (!navigator.geolocation) { showError('Geolocation not supported.'); return; }
        setLocateBtnState(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            fetchWithRetry(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`)
              .then(data => {
                let p = data?.address?.postcode?.replace(/\s+/g, '');
                if (p && /^\d{6}$/.test(p)) { pincodeInput.value = p; pushPromoClick(p); }
                else showError('Invalid pincode detected.');
              })
              .catch(() => showError('Lookup failed.'))
              .finally(() => setLocateBtnState(false));
          },
          () => { setLocateBtnState(false); showError('Location unavailable.'); }
        );
      });
    }
    pincodeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleManualSearch(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDeliveryWidget);
  else initDeliveryWidget();
})();

// Certification Tracking
window.trackCertificateClick = function(sku, title) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        event: "promoClick",
        promoClick: {
            promo_id: sku,
            creative_name: 'View Sample Certificate',
            promo_position: title,
            location_id: 'pdp'
        }
    });
};

// Audio Player
(function () {
    function initAudioPlayers() {
        const audioPlayers = document.querySelectorAll('.product-audio-player');
        audioPlayers.forEach((wrapper) => {
            const button = wrapper.querySelector('.audio-play-button');
            const audio = wrapper.querySelector('audio');
            if (!button || !audio) return;
            const newBtn = button.cloneNode(true);
            button.replaceWith(newBtn);
            const playIcon = newBtn.querySelector('.icon-play');
            const pauseIcon = newBtn.querySelector('.icon-pause');
            newBtn.addEventListener('click', () => {
                if (audio.paused) { audio.play(); playIcon.style.display = 'none'; pauseIcon.style.display = 'block'; }
                else { audio.pause(); playIcon.style.display = 'block'; pauseIcon.style.display = 'none'; }
            });
            audio.addEventListener('ended', () => { playIcon.style.display = 'block'; pauseIcon.style.display = 'none'; });
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAudioPlayers);
    else initAudioPlayers();
})();

// Trust Icons Drawer (Always With You)
(function() {
    window.openAlwaysWithYou = function(index) {
        document.documentElement.classList.add('awy-open');
        const details = document.querySelectorAll('.awy-drawer details');
        details.forEach((d) => {
            d.removeAttribute('open');
            if (parseInt(d.dataset.index) === index) {
                d.setAttribute('open', '');
                d.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    };

    window.closeAlwaysWithYou = function() {
        document.documentElement.classList.remove('awy-open');
    };

    document.addEventListener('DOMContentLoaded', () => {
        const accordionItems = document.querySelectorAll('.awy-drawer details');
        accordionItems.forEach((item) => {
            item.addEventListener('toggle', function() {
                if (this.open) {
                    accordionItems.forEach((other) => { if (other !== this) other.removeAttribute('open'); });
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (!document.documentElement.classList.contains('awy-open')) return;
            if (e.key === 'Escape') window.closeAlwaysWithYou();
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                const openDetails = document.querySelector('.awy-drawer details[open]');
                if (!openDetails) return;
                const currIdx = parseInt(openDetails.dataset.index);
                const total = accordionItems.length;
                let nextIdx = (e.key === 'ArrowRight') ? (currIdx % total + 1) : (currIdx === 1 ? total : currIdx - 1);
                window.openAlwaysWithYou(nextIdx);
            }
        });
    });
})();
