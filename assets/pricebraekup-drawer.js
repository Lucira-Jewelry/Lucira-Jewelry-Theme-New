
document.addEventListener("DOMContentLoaded", function () {

  function s(n) { return isFinite(Number(n)) ? Number(n) : 0; }

  function fmt(v) {
    try {
      return Number(v).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    } catch (e) {
      return String(v);
    }
  }


  function getLS(k) {
    try {
      var r = localStorage.getItem(k);
      return r ? JSON.parse(r) : null;
    } catch (e) {
      return null;
    }
  }

  function readCharm() {
    var c = getLS('charm_cart_v1') || getLS('charm_cart') || {};
    if (c.totals) return { metal: s(c.totals.metal), diamond: s(c.totals.diamond), price: 0 };

    var m = 0, d = 0, p = 0;
    var it = c.items || {};

    for (var id in it) {
      if (!it.hasOwnProperty(id)) continue;
      var o = it[id];
      var q = parseInt(o.qty || 0, 10) || 0;

      m += s(o.metalPerUnit) * q;
      d += s(o.diamondPerUnit) * q;
      p += (o.price ? s(o.price) : (o.price_cents ? s(o.price_cents) / 100 : 0)) * q;
    }
    return { metal: m, diamond: d, price: p };
  }

  function readBase() {
    var keys = [
      'SelectedVariantCombinedTotals',
      'SelectedVariantCombined',
      'SelectedVariant',
      'SelectedVariantLabel'
    ];

    for (var i = 0; i < keys.length; i++) {
      var o = getLS(keys[i]);
      if (!o) continue;

      if (o.base) {
        return {
          metal: s(o.base.metal_weight_num || o.base.metal_num || o.base.metal || o.base.metal_weight),
          diamond: s(o.base.diamond_1_weight_num || o.base.diamond_num || o.base.diamond || o.base.diamond_1_weight),
          variantId: o.variant_id || o.id || null,
          image: o.base.image || o.image || null,
          title: o.title || o.product_name || null
        };
      }

      if (o.metal_weight_num || o.diamond_1_weight_num || o.metal_weight || o.diamond_1_weight) {
        return {
          metal: s(o.metal_weight_num || o.metal_weight),
          diamond: s(o.diamond_1_weight_num || o.diamond_1_weight),
          variantId: o.variant_id || o.id || null,
          image: o.image || null,
          title: o.title || null
        };
      }
    }

    return { metal: 0, diamond: 0, variantId: null, image: null, title: null };
  }

  function readBreakdown() {
    var b = getLS('lucira_price_breakdown');
    if (!b) return null;

    if (b.baseCents !== undefined || b.charmsCents !== undefined)
      return { base: s(b.baseCents) / 100, charms: s(b.charmsCents) / 100, total: s(b.totalCents) / 100 };

    if (b.base !== undefined || b.charms !== undefined)
      return { base: s(b.base), charms: s(b.charms), total: s(b.total || b.base + b.charms) };

    if (b.base_price !== undefined || b.charms_price !== undefined)
      return { base: s(b.base_price), charms: s(b.charms_price), total: s(b.total_price || b.base_price + b.charms_price) };

    return null;
  }

  function readVariantImageFromPage(id) {
    try {
      if (!id) return null;

      var n = document.getElementById('variant-meta-' + id);
      if (!n) return null;

      var p = JSON.parse(n.textContent || n.innerText || '{}');
      if (p.image) {
        var im = p.image;
        if (im.indexOf('//') === 0) im = window.location.protocol + im;
        return im;
      }

    } catch (e) { }
    return null;
  }

  // DOM refs
  var backdrop = document.getElementById('lucira-drawer-backdrop');
  var drawer = document.getElementById('lucira-drawer');
  var closeBtn = document.getElementById('lucira-drawer-close');

  var imgEl = document.getElementById('lucira-variant-img');
  var titleEl = document.getElementById('lucira-variant-title');
  var subEl = document.getElementById('lucira-variant-sub');

  var metalEl = document.getElementById('lucira-metal-value');
  var diamondEl = document.getElementById('lucira-diamond-value');

  var basePriceEl = document.getElementById('lucira-base-price');
  var charmsPriceEl = document.getElementById('lucira-charms-price');
  var totalPriceEl = document.getElementById('lucira-total-price');

  async function prepareAndStoreVisualiserImage() {
    const debugImg = document.getElementById('lucira-variant-img');
    if (typeof window.getVisualizerImage !== 'function') {
      console.warn('Visualizer: window.getVisualizerImage missing');
      return;
    }
    const dataURL = window.getVisualizerImage();
    if (!dataURL || dataURL.length < 1000) {
      console.warn('Visualizer: Capture failed or too small');
      return;
    }

    // Immediate update
    if (debugImg) {
      debugImg.src = dataURL;
      debugImg.style.objectFit = 'contain';
      console.log('Visualizer: Immediate UI update with dataURL');
    }
    localStorage.setItem('visualiser_image_url', dataURL);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch('http://72.61.251.237:3000/api/upload-shopify-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataURL }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.fileUrl) {
          localStorage.setItem('visualiser_image_url', data.fileUrl);
          if (debugImg) debugImg.src = data.fileUrl;
          console.log('Visualizer: Shopify CDN URL saved:', data.fileUrl);
        }
      }
    } catch (e) {
      console.warn('Visualizer: Upload background task failed', e);
    }
  }

  function populate() {
    console.log('Visualizer: populate() called');
    var charm = readCharm();
    var base = readBase();

    var totalMetal = s(base.metal) + s(charm.metal);
    var totalDiamond = s(base.diamond) + s(charm.diamond);

    if (metalEl) metalEl.textContent = totalMetal.toFixed(3);
    if (diamondEl) diamondEl.textContent = totalDiamond.toFixed(3);

    var breakdown = readBreakdown();
    var basePrice = 0;
    var charmsPrice = 0;

    if (breakdown) {
      basePrice = breakdown.base;
      charmsPrice = breakdown.charms;
    } else {
      basePrice = getLS('SelectedVariantCombinedTotals')?.base?.price ||
        getLS('SelectedVariant')?.basePrice || 0;
      charmsPrice = charm.price || 0;
    }

    const vImg = localStorage.getItem('visualiser_image_url');
    const targetImg = document.getElementById('lucira-variant-img');

    if (targetImg) {
      if (vImg && vImg.length > 500) {
        targetImg.src = vImg;
        targetImg.style.objectFit = 'contain';
        console.log('Visualizer populate: Applied capture from cache');
      } else {
        targetImg.src = base.image || readVariantImageFromPage(base.variantId) || targetImg.src;
        console.log('Visualizer populate: Fallback to base image');
      }
    }

    if (titleEl) titleEl.textContent = base.title || 'Selected product';
    if (subEl) subEl.textContent = base.variantId ? ('Variant: ' + base.variantId) : '';

    if (basePriceEl) basePriceEl.textContent = basePrice ? fmt(basePrice) : '-';
    if (charmsPriceEl) charmsPriceEl.textContent = charmsPrice ? fmt(charmsPrice) : '-';
    if (totalPriceEl) totalPriceEl.textContent = (s(basePrice) + s(charmsPrice)) ? fmt(s(basePrice) + s(charmsPrice)) : '-';
  }

  if (!backdrop || !drawer) return;

  function openDrawer() {
    backdrop.style.display = 'flex';
    document.body.classList.add('drawer-open');
    setTimeout(() => drawer.classList.add('open'), 20);
    setTimeout(populate, 30);
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    document.body.classList.remove('drawer-open');
    setTimeout(() => backdrop.style.display = 'none', 280);
  }

  document.body.addEventListener('click', async function (e) {
    const btn = e.target.closest('.cta-footer, #lf-total-cta');
    if (!btn) return;

    e.preventDefault();
    const originalContent = btn.innerHTML;
    const isMainBtn = btn.id === 'lf-total-cta';

    if (isMainBtn) {
      btn.innerText = 'GENERATING IMAGE...';
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.7';
    }

    try {
      await prepareAndStoreVisualiserImage();
    } catch (err) {
      console.error('Visualiser upload failed:', err);
    } finally {
      if (isMainBtn) {
        btn.innerHTML = originalContent;
        btn.style.pointerEvents = '';
        btn.style.opacity = '';
      }
    }

    openDrawer();
  }, { passive: false });


  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) closeDrawer();
  });

  window.luciraDrawerRefresh = populate;
  window.luciraOpenDrawer = openDrawer;
  window.luciraCloseDrawer = closeDrawer;

  document.addEventListener('charmCartUpdated', populate);
  document.addEventListener('SelectedVariantChanged', populate);

});

function sendToCart() {
  const bundleId = 'bundle_' + Date.now() + '_' + Math.floor(Math.random() * 100000);

  console.log("clicked");

  function getFinalItemsArray() {
    const items = [];

    const charm = JSON.parse(localStorage.getItem("charm_cart_v1") || "{}");
    const baseObj = JSON.parse(localStorage.getItem("SelectedVariant") || "null");

    /* BASE PRODUCT */
    if (baseObj) {
      const cachedImage = localStorage.getItem('visualiser_image_url');
      const props = {
        _bundle_id: bundleId,
        _bundle_type: 'base'
      };
      if (cachedImage) props._visualiser_image = cachedImage;

      items.push({
        id: Number(baseObj),
        quantity: 1,
        properties: props
      });
    }

    if (Array.isArray(charm.sequence) && charm.items) {
      const used = new Set();

      charm.sequence.forEach((id) => {
        if (used.has(id)) return;

        const item = charm.items[id];
        if (!item) return;

        const qty = parseInt(item.qty || 0, 10);
        if (qty <= 0) return;

        items.push({
          id: Number(id),
          quantity: qty,
          properties: {
            _bundle_id: bundleId,
            _bundle_type: 'charm'
          }
        });

        used.add(id);
      });
    }

    return items;
  }

  const items = getFinalItemsArray();

  fetch("/cart/add.js", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items })
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Products added:", data);
      // Fetch both drawer and bubble sections
      return fetch(`${window.location.pathname}?sections=cart-drawer,cart-icon-bubble`);
    })
    .then((response) => response.json())
    .then((sections) => {
      const parser = new DOMParser();

      // 1. Update Cart Drawer
      if (sections['cart-drawer']) {
        const drawerHtml = parser.parseFromString(sections['cart-drawer'], "text/html");
        const newDrawerInner = drawerHtml.querySelector("#CartDrawer");
        const currentDrawer = document.querySelector("#CartDrawer");
        if (currentDrawer && newDrawerInner) {
          currentDrawer.innerHTML = newDrawerInner.innerHTML;
        }
      }

      // 2. Update Cart Bubble (Count)
      if (sections['cart-icon-bubble']) {
        const bubbleHtml = parser.parseFromString(sections['cart-icon-bubble'], "text/html");
        const newBubbleInner = bubbleHtml.querySelector("#cart-icon-bubble");
        const currentBubble = document.querySelector("#cart-icon-bubble");
        if (currentBubble && newBubbleInner) {
          currentBubble.innerHTML = newBubbleInner.innerHTML;
        }
      }

      // 3. Open Drawer
      document.querySelector("cart-drawer")?.classList.add("is-open");
      document.querySelector("cart-drawer")?.classList.remove("is-empty");
      document.querySelector("cart-drawer")?.classList.add("active");
      const drawerInner = document.querySelector(".drawer__inner");
      if (drawerInner) drawerInner.style.transform = "translateX(0)";
      document.body.classList.add("overflow-hidden");

      // 4. Trigger theme event for other components
      document.dispatchEvent(new CustomEvent('cart:change', {
        bubbles: true,
        detail: { base_item: data }
      }));
    })
    .catch((err) => console.error("Add to cart error:", err));
}

