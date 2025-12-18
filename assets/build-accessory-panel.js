function resetJourneyOnLoad() {
  try {
    localStorage.removeItem('charm_cart_v1');
    localStorage.removeItem('lucira_price_breakdown');
  } catch (e) {}
}
resetJourneyOnLoad();
window.MainBaseCharm = function () {
  const CANVAS_ID = 'vis-Visualiser_Canvas';
  const LS_KEY = 'SelectedVariant';
  const IDLE =
    typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback
      : (fn) => setTimeout(fn, 1);

  const DEFAULT_CHARM_SCALE = 0.058;
  const DEFAULT_CHARM_POSITION = 0.62;

  const SIZE_MULTIPLIER = 2.0;


  const ARC_START_DEG = 210;
  const ARC_END_DEG = 330;

  const CHAIN_LENGTH_CM = 18;
  const CHARM_SPACING_CM = 2.54;
  const MIN_SPACING_PX = 26;

  const MIN_ZOOM = 1.0;
  const MAX_ZOOM = 2.0;

  const CHAIN_CENTER_Y_FACTOR = 0.42;
  const CHAIN_RADIUS_FACTOR = 0.55;
  const CHARM_ATTACH_OFFSET_FACTOR = 0.008;
  const CHARM_TOUCH_OVERLAP = 3;

  const $ = (id) => document.getElementById(id);

  const safeJSON = (s) => {
    try {
      return JSON.parse(s);
    } catch (e) {
      return null;
    }
  };

  const money = (c) =>
    window.Shopify && Shopify.formatMoney
      ? Shopify.formatMoney(c)
      : (Number(c) / 100).toLocaleString();

  const visualiser = {
    product: {
      image: '',
      price: 0,
      charmScale: DEFAULT_CHARM_SCALE,
      charmPosition: DEFAULT_CHARM_POSITION,
    },
    charms: [],
  };

  const __VariantIndex = { built: false, idToVariant: new Map(), idToProduct: new Map() };

  function buildVariantIndexOnce() {
    if (__VariantIndex.built) return;

    try {
      const scripts = Array.from(
        document.querySelectorAll(
          'script[type="application/json"],script[id^="product-json-"],script[type="application/json+product"]'
        )
      );

      for (const s of scripts) {
        let pj = null;

        try {
          const txt = s.textContent || s.innerText || '';
          if (!txt) continue;
          pj = JSON.parse(txt);
        } catch (_) {
          continue;
        }

        const variants = pj?.variants || pj?.product?.variants || [];
        const productTitle = pj?.title || pj?.product?.title || null;
        const productImage = pj?.featured_image || (pj?.images && pj.images[0]) || null;

        for (const v of variants) {
          if (!v || typeof v.id === 'undefined') continue;
          const idStr = String(v.id);
          __VariantIndex.idToVariant.set(idStr, v);
          __VariantIndex.idToProduct.set(idStr, { title: productTitle, image: productImage });
        }
      }

      __VariantIndex.built = true;
    } catch (_) {}
  }

  function getBaseCollections() {
    const el = document.getElementById('lucira-accessory-fullscreen');
    const raw = (el?.dataset?.baseCollections || '').toLowerCase();

    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function detectBaseType() {
    const cols = getBaseCollections();

    if (cols.some((h) => /bracelet/.test(h))) return 'bracelet';
    if (cols.some((h) => /anklet|ankle/.test(h))) return 'anklet';
    if (cols.some((h) => /necklace/.test(h))) return 'necklace';

    const url = location.pathname.toLowerCase();
    if (/bracelet/.test(url)) return 'bracelet';
    if (/anklet|ankle/.test(url)) return 'anklet';
    if (/necklace/.test(url)) return 'necklace';

    return null;
  }

  function getCapForBaseType(bt) {
    return bt === 'anklet' ? 3 : 5;
  }

  const __BASE_TYPE__ = detectBaseType();
  const MAX_CHARMS = getCapForBaseType(__BASE_TYPE__);

function getSelectedCount() {
  try {
    const cart = JSON.parse(localStorage.getItem('charm_cart_v1'));
    if (!cart || !cart.items) return 0;

    return Object.values(cart.items).reduce(
      (sum, item) => sum + Number(item.qty || 0),
      0
    );
  } catch {
    return 0;
  }
}

  function ensureCapLabel() {
    const bar = document.getElementById('lf-color-filter');
    if (!bar) return null;

    let el = document.getElementById('lf-selected-cap');

    if (!el) {
      el = document.createElement('div');
      el.id = 'lf-selected-cap';
      bar.appendChild(el);
    }

    return el;
  }

  function updateSelectedCapUI() {
    const el = ensureCapLabel();
    if (el) el.textContent = `${getSelectedCount()}/${MAX_CHARMS} SELECTED`;
  }

  function setPlusButtonsDisabled(disabled) {
    document.querySelectorAll('.charm-card .qty-incr').forEach((btn) => {
      btn.disabled = !!disabled;
      btn.style.opacity = disabled ? 0.35 : 1;
      btn.style.pointerEvents = disabled ? 'none' : 'auto';
      btn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    });
  }

  function refreshCapState() {
    const atCap = getSelectedCount() >= MAX_CHARMS;

    updateSelectedCapUI();
    setPlusButtonsDisabled(atCap);
    updateMinusButtonsForCap(atCap);
  }

 function updateMinusButtonsForCap(atCap) {
  document.querySelectorAll('.charm-card').forEach((card) => {
    const minus = card.querySelector('.qty-decr');
    const input = card.querySelector('.qty-input');
    if (!minus || !input) return;

    const qty = Number(input.value || 0);
    const shouldDisable = qty === 0;
    minus.disabled = shouldDisable;
    minus.style.opacity = shouldDisable ? 0.35 : 1;
    minus.style.pointerEvents = shouldDisable ? 'none' : 'auto';
    minus.setAttribute('aria-disabled', shouldDisable ? 'true' : 'false');
  });
}
  function setSelectedBorder(card) {
    try {
      const v = Number(card.querySelector('.qty-input')?.value || 0);
      card.classList.toggle('is-selected', v > 0);
    } catch (_) {}
  }

  function refreshSelectedBorders() {
    document.querySelectorAll('.charm-card').forEach(setSelectedBorder);
  }

  function getBaseVariantPriceCents() {
    if (visualiser?.product?.price && !Number.isNaN(Number(visualiser.product.price))) {
      return Number(visualiser.product.price);
    }

    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return 0;

      let data = safeJSON(raw);
      if (!data && /&quot;/.test(raw)) data = safeJSON(raw.replace(/&quot;/g, '"'));
      if (!data) return 0;

      if (typeof data.price === 'number') return data.price;

      const vid = String(data.variantId || data.id || '').trim();
      if (!vid) return 0;

      buildVariantIndexOnce();

      let v = __VariantIndex.idToVariant.get(vid);
      if (!v) {
        const hit = Array.from(__VariantIndex.idToVariant.entries()).find(([k]) => k.endsWith(vid));
        if (hit) v = hit[1];
      }
      if (v && typeof v.price === 'number') return v.price;
    } catch (e) {}

    return 0;
  }

  function getCharmsTotalCents() {
    let sum = 0;

    try {
      for (const c of visualiser.charms || []) {
        const p = Number(c.price || 0);
        if (!Number.isNaN(p)) sum += p;
      }
    } catch (_) {}

    return sum;
  }

  function formatINR(centsOrPaise) {
    const value = Number(centsOrPaise || 0) / 100;

    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(value);
    } catch (e) {
      return '₹' + value.toFixed(2);
    }
  }

  function updateCTATotal() {
    const footer = document.querySelector('.cta-footer');
    const btn = document.getElementById('lf-total-cta');
    if (!footer || !btn) return;

    const charmsTotal = getCharmsTotalCents();

    if (charmsTotal <= 0) {
      footer.style.display = 'none';
      return;
    }

    if (window.innerWidth <= 768) {
      const ctaFooter = document.querySelector('.cta-footer');
      const targetContainer = document.querySelector('.title_coll_container');

      if (ctaFooter && targetContainer) {
        targetContainer.appendChild(ctaFooter);
      }
    }

    footer.style.display = 'block';

    const base = getBaseVariantPriceCents();
    const total = Number(base || 0) + Number(charmsTotal || 0);

    btn.textContent = 'PROCEED : ' + formatINR(total);

    try {
      localStorage.setItem(
        'lucira_price_breakdown',
        JSON.stringify({
          baseCents: Number(base) || 0,
          charmsCents: Number(charmsTotal) || 0,
          totalCents: Number(total) || 0,
          savedAt: Date.now(),
        })
      );
    } catch (e) {
      console.error('Failed saving price breakdown', e);
    }
  }

  let currentCollectionId = null;
  let currentColorLabel = 'All';

  function isMobileLayout() {
    return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  }

  function moveGridsColumnBelowTile(targetId) {
    const gridsColumn = document.querySelector('.grids-column');
    const tilesColumn = document.getElementById('lf-collection-tiles');
    const rightInner = document.querySelector('.right-split-inner');
    if (!gridsColumn || !tilesColumn || !rightInner) return;

    tilesColumn.querySelectorAll('.collection-tile.open-with-grid').forEach((btn) =>
      btn.classList.remove('open-with-grid')
    );

    if (!isMobileLayout()) {
      if (rightInner.contains(gridsColumn) === false) rightInner.insertBefore(gridsColumn, tilesColumn);
      return;
    }

    const activeTile = tilesColumn.querySelector(`.collection-tile[data-target="${targetId}"]`);
    if (!activeTile) return;

    const tileWrapper = activeTile.closest('.main-collection-tile-div') || activeTile;

    if (activeTile.classList.contains('open-with-grid')) {
      activeTile.classList.remove('open-with-grid');
      tileWrapper.removeChild(gridsColumn);
    } else {
      activeTile.classList.add('open-with-grid');
      if (tileWrapper.nextSibling === gridsColumn) return;
      tileWrapper.parentNode.insertBefore(gridsColumn, tileWrapper.nextSibling);
    }
  }

  function setActiveCollectionById(targetId) {
    console.log('339')
    const wrapper = $('lf-charms-grids-wrapper');
    if (!wrapper) return;

    wrapper.querySelectorAll('.charms-grid-container').forEach((c) => {
      if (c.id === targetId) {
        c.style.display = '';
        c.classList.add('active');
      } else {
        c.style.display = 'none';
        c.classList.remove('active');
      }
    });

    currentCollectionId = targetId;

    document.querySelectorAll('.collection-tile').forEach((t) => {
      const active = t.dataset.target === targetId;

      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    setTimeout(() => {
      document
        .querySelectorAll('.charms-grid-container.active .custom-charm-grid')
        .forEach((each) => {
          const title = each.getAttribute('data-title')?.toLowerCase().replace(/\s+/g, '') || '';
          const colorName =
            document.querySelector('#lf-color-name')?.textContent.toLowerCase().replace(/\s+/g, '') || '';

          each.style.display =
            title.includes(colorName) || colorName.includes(title)
              ? ''
              : 'none';
        });
    }, 500);

    moveGridsColumnBelowTile(targetId);

    buildColorMapForActiveGrid();
    buildSwatchDots();
    refreshSelectedBorders();
    refreshCapState();
  }

  (function () {
    if (window._charmCartInit) return;
    window._charmCartInit = true;

    const STORAGE_KEY = 'charm_cart_v1';

    const parseNumber = (v) => {
      if (v === null || v === undefined || v === '') return 0;
      const cleaned = String(v).replace(/[, ]+/g, '').replace(/[^0-9.-]/g, '');
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : 0;
    };

    const loadCart = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : { items: {}, totals: { metal: 0, diamond: 0 } };
      } catch (err) {
        console.error('loadCart error', err);
        return { items: {}, totals: { metal: 0, diamond: 0 } };
      }
    };

    const saveCart = (cart) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      } catch (err) {
        console.error('saveCart error', err);
      }
    };

    const recomputeTotals = (cart) => {
      let metal = 0;
      let diamond = 0;

      for (const id in cart.items) {
        const it = cart.items[id];
        const qty = parseInt(it.qty || 0, 10);
        metal += parseNumber(it.metalPerUnit) * qty;
        diamond += parseNumber(it.diamondPerUnit) * qty;
      }

      cart.totals = { metal, diamond };
    };

    const upsertItem = (cart, id, metalPerUnit, diamondPerUnit, qty) => {
      cart.items[id] = {
        qty,
        metalPerUnit,
        diamondPerUnit,
      };
    };

    const changeQty = (variantId, delta, metalPerUnit, diamondPerUnit) => {
      const cart = loadCart();
      const items = cart.items || {};

      const existing = items[variantId] || {
        qty: 0,
        metalPerUnit: metalPerUnit,
        diamondPerUnit: diamondPerUnit,
      };

      let newQty = parseInt(existing.qty || 0, 10) + delta;
      if (newQty < 0) newQty = 0;

      if (newQty === 0) {
        if (items[variantId]) delete items[variantId];
      } else {
        upsertItem(cart, variantId, metalPerUnit, diamondPerUnit, newQty);
      }

      cart.items = items;
      recomputeTotals(cart);
      saveCart(cart);

      document.dispatchEvent(new CustomEvent('charmCartUpdated', { detail: { cart } }));

      return cart;
    };

    const initUIFromCart = () => {
      const cart = loadCart();

      document.querySelectorAll('.charm-card').forEach((card) => {
        const variantId =
          card.dataset.productId || card.dataset.variantId || card.dataset.productId;
        if (!variantId) return;

        const item = cart.items[variantId];
        const input = card.querySelector('.qty-input');
        if (input) input.value = item ? item.qty : 0;
      });

      document.dispatchEvent(new CustomEvent('charmCartLoaded', { detail: { cart } }));
    };

    let lastClickTs = 0;

    document.addEventListener('click', function (e) {
      if (!e.isTrusted) return;

      const btn = e.target.closest && e.target.closest('.qty-btn');
      if (!btn) return;

      const now = Date.now();
      if (now - lastClickTs < 40) {
        return;
      }
      lastClickTs = now;

      const card = btn.closest('.charm-card');
      if (!card) return;

      const input = card.querySelector('.qty-input');
      if (!input) return;

      const parseNumber = (v) => {
        if (v === null || v === undefined || v === '') return 0;
        const cleaned = String(v).replace(/[, ]+/g, '').replace(/[^0-9.-]/g, '');
        const n = parseFloat(cleaned);
        return Number.isFinite(n) ? n : 0;
      };

      const metalPerUnit = parseNumber(
        card.dataset.metaMetalWeight || card.getAttribute('data-meta-metal-weight')
      );
      const diamondPerUnit = parseNumber(
        card.dataset.metaDiamondWeight || card.getAttribute('data-meta-diamond-weight')
      );

      const variantId =
        card.dataset.productId ||
        card.dataset.variantId ||
        card.getAttribute('data-product-id') ||
        card.getAttribute('data-variant-id');

      if (!variantId) {
        console.warn('variant id missing on card', card);
        return;
      }

      let delta = 0;
      if (btn.classList.contains('qty-incr')) delta = 1;
      else if (btn.classList.contains('qty-decr')) delta = -1;
      else return;

      let currentQty = parseInt(input.value, 10);
      if (!Number.isFinite(currentQty)) currentQty = 0;

      const cart = changeQty(variantId, delta, metalPerUnit, diamondPerUnit);
      const item = cart.items[variantId];
      input.value = item ? item.qty : 0;

      const totalMetalEl = document.getElementById('total-metal');
      const totalDiamondEl = document.getElementById('total-diamond');

      if (totalMetalEl) totalMetalEl.textContent = cart.totals.metal.toFixed(3);
      if (totalDiamondEl) totalDiamondEl.textContent = cart.totals.diamond.toFixed(3);
    });

    window.CharmCart = {
      getCart: () => loadCart(),

      clearCart: () => {
        const empty = { items: {}, totals: { metal: 0, diamond: 0 } };
        saveCart(empty);
        document.dispatchEvent(new CustomEvent('charmCartUpdated', { detail: { cart: empty } }));
        return empty;
      },

      recompute: () => {
        const cart = loadCart();
        recomputeTotals(cart);
        saveCart(cart);
        document.dispatchEvent(new CustomEvent('charmCartUpdated', { detail: { cart } }));
        return cart;
      },
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initUIFromCart);
    } else {
      initUIFromCart();
    }
  })();
document.addEventListener('charmCartUpdated', () => {
  try {
    syncUIFromCart();
  } catch (e) {
    console.warn('Visualiser sync failed', e);
  }
});

document.addEventListener('charmCartLoaded', () => {
  try {
    syncUIFromCart();
  } catch (e) {
    console.warn('Sync after cart load failed', e);
  }
});

  function bindCollectionTiles() {
    const tiles = document.querySelectorAll('.collection-tile');
    if (!tiles.length) return;

    const first = tiles[0];
    if (!currentCollectionId && first) currentCollectionId = first.dataset.target;

    tiles.forEach((tile) => {
      tile.addEventListener('click', () => setActiveCollectionById(tile.dataset.target));
    });

    if (currentCollectionId) setActiveCollectionById(currentCollectionId);
  }
class BVCanvas {
  constructor(containerId) {
    this.containerId = containerId;
    this.stage = null;
    this.productLayer = null;
    this.charmLayer = null;
    this.stageSize = 400;
    this.zoomFactor = 1;
    this.slider = $('zoom-range');
    this.btnIn = $('zoom-in');
    this.btnOut = $('zoom-out');

    this._updateZoomTrack = null;
    this._setSliderValue = null;

    this._bindZoomUI();
    this.initStage();
  }
  _bindZoomUI() {
    const slider = this.slider;
    const btnIn = this.btnIn;
    const btnOut = this.btnOut;

    if (!slider) {
      btnIn?.addEventListener('click', () =>
        this.setZoom(Math.min(MAX_ZOOM, this.zoomFactor + 0.1))
      );
      btnOut?.addEventListener('click', () =>
        this.setZoom(Math.max(MIN_ZOOM, this.zoomFactor - 0.1))
      );
      return;
    }

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const updateTrack = () => {
      const min = +slider.min || MIN_ZOOM;
      const max = +slider.max || MAX_ZOOM;
      const val = clamp(+slider.value || min, min, max);
      const pct = ((val - min) / (max - min)) * 100;
      slider.style.background =
        `linear-gradient(90deg,#000 ${pct}%,#ddd ${pct}%)`;
    };

    const setValue = (v, emit = true) => {
      const min = +slider.min || MIN_ZOOM;
      const max = +slider.max || MAX_ZOOM;
      const val = clamp(v, min, max);
      slider.value = val.toFixed(2);
      updateTrack();
      if (emit) {
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    const applyZoom = (animate) => {
      this.setZoom(+slider.value, { animate });
    };

    this._updateZoomTrack = updateTrack;
    this._setSliderValue = setValue;

    slider.addEventListener(
      'input',
      () => {
        updateTrack();
        this.setZoom(+slider.value, { animate: false });
      },
      { passive: true }
    );

    slider.addEventListener('change', () => applyZoom(true));

    const step = +slider.step || 0.1;

    btnIn?.addEventListener(
      'click',
      (e) => {
        e.preventDefault();
        setValue(+slider.value + step, false);
        applyZoom(true);
      },
      { passive: false }
    );

    btnOut?.addEventListener(
      'click',
      (e) => {
        e.preventDefault();
        setValue(+slider.value - step, false);
        applyZoom(true);
      },
      { passive: false }
    );

    updateTrack();
  }
  initStage() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const size = Math.max(
      300,
      Math.floor(Math.min(rect.width || 400, rect.height || 400))
    );
    this.stageSize = size;

    if (this.stage) this.stage.destroy();
    this._productRendered = false;
    this.stage = new Konva.Stage({
      container: this.containerId,
      width: this.stageSize,
      height: this.stageSize,
      draggable: false, 
    });
    this.stage.on('wheel', (e) => {
      e.evt.preventDefault();

      const current = this.zoomFactor || this.stage.scaleX() || 1;
      const step = 0.12; 
      const dir = e.evt.deltaY > 0 ? -1 : 1; 
      const target = current + dir * step;

      this.setZoom(target, { animate: false });
    });

    this.productLayer = new Konva.Layer();
    this.charmLayer = new Konva.Layer();

    this.stage.add(this.productLayer);
    this.stage.add(this.charmLayer);

    if (this.slider) {
      this.slider.min = MIN_ZOOM;
      this.slider.max = MAX_ZOOM;
      this.slider.step = 0.01;
    }

    this.setZoom(1, { animate: false });

    this._updateZoomTrack && this._updateZoomTrack();
  }
createImage(url) {
  return new Promise((resolve, reject) => {
    if (!url) return reject('no-url');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject('load-fail');
    img.src = url;
  });
}
_renderProductIfNeeded() {
  if (this._productRendered) return;

  const imgUrl = this.visualiser?.product?.image;
  if (!imgUrl) return;

  this.createImage(imgUrl)
    .then((img) => {
      this.productLayer.destroyChildren();
      this.productLayer.add(
        new Konva.Image({
          x: 0,
          y: 0,
          image: img,
          width: this.stageSize,
          height: this.stageSize,
        })
      );
      this.productLayer.draw();
      this._productRendered = true;
    })
    .catch(() => {});
}

_resetToBaseView(animate = true) {
  const stage = this.stage;
  if (!stage) return;

  const center = {
    x: this.stageSize / 2,
    y: this.stageSize * CHAIN_CENTER_Y_FACTOR,
  };

  const posX = center.x - center.x * 1;
  const posY = center.y - center.y * 1;

  if (animate) {
    stage.to({
      scaleX: 1,
      scaleY: 1,
      x: posX,
      y: posY,
      duration: 0.18,
    });
  } else {
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: posX, y: posY });
    stage.batchDraw();
  }

  this.zoomFactor = 1;
  stage.draggable(false);

  if (this.slider) {
    this.slider.value = '1';
    this._updateZoomTrack && this._updateZoomTrack();
  }
}

 async render(vis) {
  if (!vis || !vis.product) return;

  this.visualiser = vis;
  this.charmScale = vis.product.charmScale || DEFAULT_CHARM_SCALE;
  this.charmPosition = vis.product.charmPosition || DEFAULT_CHARM_POSITION;
  this.charmLayer.destroyChildren();
  this._placedCharmPositions = [];
  this._renderProductIfNeeded();

  if (Array.isArray(vis.charms) && vis.charms.length) {
    await this._placeCharmsSymmetric(vis.charms);

    if (vis.charms.length < 3) {
      this.autoZoomToCharms();
    } else {
      this._resetToBaseView(true);
    }
  } else {
    this._resetToBaseView(true);
  }

  this.stage.draw();
}

  _computeArcPositionsLinear(count) {
    const center = {
      x: this.stageSize / 2,
      y: this.stageSize * CHAIN_CENTER_Y_FACTOR,
    };

    const radius = Math.max(8, this.stageSize * CHAIN_RADIUS_FACTOR);

    this._chainGeom = { center, radius };

    const pts = [];
    if (count <= 0) return pts;

    const fullArcDeg = Math.abs(ARC_END_DEG - ARC_START_DEG);
    const fullArcRad = (fullArcDeg * Math.PI) / 180;
    const arcLength = radius * fullArcRad;

    let spacing = (CHARM_SPACING_CM / CHAIN_LENGTH_CM) * arcLength;
    spacing = Math.max(MIN_SPACING_PX, spacing);

    if ((count - 1) * spacing > arcLength) {
      spacing = arcLength / Math.max(1, count - 1);
    }

    const usedTotalLength = Math.max(0, (count - 1) * spacing);
    const usedAngleRad = usedTotalLength / radius;

    const midDeg = (ARC_START_DEG + ARC_END_DEG) / 2;
    const midRad = (midDeg * Math.PI) / 180;

    const startAngleRad = midRad - usedAngleRad / 2;

    for (let i = 0; i < count; i++) {
      const angleRad = startAngleRad + (i * spacing) / radius;
      const angleDeg = (angleRad * 180) / Math.PI;

      const x = center.x + radius * Math.cos(angleRad);
      const y = center.y - radius * Math.sin(angleRad);

      pts.push({ x, y, angle: angleDeg });
    }

    return pts;
  }

  _computeSymmetricOrder(linearPts) {
    if (!linearPts.length) return [];

    const midIndex = Math.floor((linearPts.length - 1) / 2);
    const ordered = [];

    ordered.push(linearPts[midIndex]);

    for (let offset = 1; ordered.length < linearPts.length; offset++) {
      const right = linearPts[midIndex + offset];
      if (right) ordered.push(right);

      const left = linearPts[midIndex - offset];
      if (left && ordered.length < linearPts.length) ordered.push(left);
    }

    return ordered;
  }

  async _placeCharmsSymmetric(charms) {
    const count = charms.length;
    if (count === 0) return;

    const linear = this._computeArcPositionsLinear(count);
    const pts = this._computeSymmetricOrder(linear);

    const baseSize = Math.round(this.stageSize * this.charmScale);
    const size = Math.max(10, Math.round(baseSize * SIZE_MULTIPLIER));

    this._placedCharmPositions = [];

   const geom =
  this._chainGeom || {
    center: {
      x: this.stageSize / 2,
      y: this.stageSize * CHAIN_CENTER_Y_FACTOR,
    },
    radius: Math.max(8, this.stageSize * CHAIN_RADIUS_FACTOR),
  };

const chainR = geom.radius;

const charmR = chainR * (1 - CHARM_ATTACH_OFFSET_FACTOR);


    for (let i = 0; i < count; i++) {
      const c = charms[i];
      const basePt = pts[i] || pts[0];

      const angleRad = (basePt.angle * Math.PI) / 180;

      const x = geom.center.x + charmR * Math.cos(angleRad);
      const y = geom.center.y - charmR * Math.sin(angleRad);

      try {
        const img = await this.createImage(c.image || '');
        const kimg = new Konva.Image({
          x: Math.round(x),
          y: Math.round(y),
          image: img,
          width: size,
          height: size,
          listening: true,
        });

        kimg.offsetX(size / 2);
        kimg.offsetY(size / 2);
        kimg.rotation(0);
        kimg._productId = c.id;

        kimg.on('mouseenter', () => {
          document.body.style.cursor = 'pointer';
          kimg.to({ scaleX: 1.08, scaleY: 1.08, duration: 0.12 });
        });

        kimg.on('mouseleave', () => {
          document.body.style.cursor = 'default';
          kimg.to({ scaleX: 1, scaleY: 1, duration: 0.12 });
        });

        this.charmLayer.add(kimg);
        this._placedCharmPositions.push({ x, y, w: size, h: size });
      } catch (e) {
        console.warn('Charm image load failed', e);
      }
    }
  }
  _focusCharmsAtScale(scale, animate = true) {
    const pts = this._placedCharmPositions || [];
    const stage = this.stage;
    if (!stage) return;

    if (!pts.length) {
      const center = {
        x: this.stageSize / 2,
        y: this.stageSize * CHAIN_CENTER_Y_FACTOR,
      };
      const posX = center.x - center.x * scale;
      const posY = center.y - center.y * scale;

      if (animate) {
        stage.to({
          scaleX: scale,
          scaleY: scale,
          x: posX,
          y: posY,
          duration: 0.18,
        });
      } else {
        stage.scale({ x: scale, y: scale });
        stage.position({ x: posX, y: posY });
        stage.batchDraw();
      }
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    pts.forEach((p) => {
      const left = p.x - p.w / 2;
      const right = p.x + p.w / 2;
      const top = p.y - p.h / 2;
      const bottom = p.y + p.h / 2;

      minX = Math.min(minX, left);
      maxX = Math.max(maxX, right);
      minY = Math.min(minY, top);
      maxY = Math.max(maxY, bottom);
    });

    const boxCenterX = minX + (maxX - minX) / 2;
    const boxCenterY = minY + (maxY - minY) / 2;

    const viewportCenter = {
      x: this.stageSize / 2,
      y: this.stageSize * CHAIN_CENTER_Y_FACTOR,
    };

    const posX = viewportCenter.x - boxCenterX * scale;
    const posY = viewportCenter.y - boxCenterY * scale;

    if (animate) {
      stage.to({
        scaleX: scale,
        scaleY: scale,
        x: posX,
        y: posY,
        duration: 0.18,
      });
    } else {
      stage.scale({ x: scale, y: scale });
      stage.position({ x: posX, y: posY });
      stage.batchDraw();
    }
  }
  autoZoomToCharms() {
    const pts = this._placedCharmPositions || [];
    if (!pts.length) {
      this.setZoom(1, { animate: true });
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    pts.forEach((p) => {
      const left = p.x - p.w / 2;
      const right = p.x + p.w / 2;
      const top = p.y - p.h / 2;
      const bottom = p.y + p.h / 2;

      minX = Math.min(minX, left);
      maxX = Math.max(maxX, right);
      minY = Math.min(minY, top);
      maxY = Math.max(maxY, bottom);
    });

    const boxW = Math.max(1, maxX - minX);
    const boxH = Math.max(1, maxY - minY);
    const boxCenterX = minX + boxW / 2;
    const boxCenterY = minY + boxH / 2;

    const desiredFraction = 0.42;
    const scaleX = (this.stageSize * desiredFraction) / boxW;
    const scaleY = (this.stageSize * desiredFraction) / boxH;

    let targetScale = Math.min(scaleX, scaleY);
    targetScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetScale));
    targetScale = Math.max(1.0, targetScale);

    const sx = targetScale;
    const viewportCenter = {
      x: this.stageSize / 2,
      y: this.stageSize * CHAIN_CENTER_Y_FACTOR,
    };

    const posX = viewportCenter.x - boxCenterX * sx;
    const posY = viewportCenter.y - boxCenterY * sx;

    this.stage.to({
      scaleX: sx,
      scaleY: sx,
      x: posX,
      y: posY,
      duration: 0.22,
    });
    this.zoomFactor = sx;

    if (this.slider) this.slider.value = sx.toFixed(2);
    this._updateZoomTrack && this._updateZoomTrack();

    this.stage.draggable(sx > 1);
  }
  setZoom(scale, opts = { animate: true }) {
  const stage = this.stage;
  if (!stage) return;

  if (!this._placedCharmPositions || this._placedCharmPositions.length === 0) {
    this._resetToBaseView(opts?.animate !== false);
    return;
  }
  scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));
  this.zoomFactor = scale;

  const animate = opts && opts.animate !== false;
  const hasCharms = this._placedCharmPositions && this._placedCharmPositions.length;

  const center = {
    x: this.stageSize / 2,
    y: this.stageSize * CHAIN_CENTER_Y_FACTOR,
  };

  const applyCenterZoom = () => {
    const posX = center.x - center.x * scale;
    const posY = center.y - center.y * scale;

    if (animate) {
      stage.to({
        scaleX: scale,
        scaleY: scale,
        x: posX,
        y: posY,
        duration: 0.18,
      });
    } else {
      stage.scale({ x: scale, y: scale });
      stage.position({ x: posX, y: posY });
      stage.batchDraw();
    }
  };

  if (!hasCharms || scale <= 1.0001) {
    applyCenterZoom();
  } else {
    this._focusCharmsAtScale(scale, animate);
  }

  if (this.slider) {
    this.slider.value = scale.toFixed(2);
    this._updateZoomTrack && this._updateZoomTrack();
  }
  stage.draggable(scale > 1);
}

}
  let bv = null;
  function ensureBV() {
    if (!bv) {
      bv = new BVCanvas(CANVAS_ID);
      window.bv = bv;
            window.setZoomSliderValue = function (v) {
        if (bv && typeof bv._setSliderValue === 'function') {
          bv._setSliderValue(v);
        }
      };
    }
    return bv;
  }
  function readSavedVariantFromLS() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;

      const parsed = safeJSON(raw);
      if (parsed && typeof parsed === 'object') return parsed;

      if (/^\d+$/.test(raw)) return { variantId: raw };

      try {
        return JSON.parse(raw.replace(/&quot;/g, '"'));
      } catch (e) {}

      return { variantId: raw };
    } catch (e) {
      return null;
    }
  }

  function resolveVariantFromPage(variantId) {
    if (!variantId) return null;

    buildVariantIndexOnce();
    const idStr = String(variantId);

    let match = __VariantIndex.idToVariant.get(idStr);

    if (!match) {
      const entry = Array.from(__VariantIndex.idToVariant.entries()).find(([k]) =>
        k.endsWith(idStr)
      );
      if (entry) match = entry[1];
    }

    if (match) {
      const prod = __VariantIndex.idToProduct.get(String(match.id)) || {};
      match.product_title = prod.title || match.product_title || null;
      match.image = match.featured_image?.src || match.image || prod.image || null;
      return match;
    }

    return null;
  }
  function renderLeftSafe(variant) {
  try {
    const img =
      variant?.image ||
      variant?.featured_image?.src ||
      variant?.image_src ||
      variant ||
      '';

    if (img) {
      visualiser.product.image = img;
      if (typeof variant.price === 'number')
        visualiser.product.price = variant.price;
      ensureBV()._productRendered = false;
      bv.render(visualiser);
        }
  } catch (e) {}
  }
function ensureBaseProductFromLS() {
  if (visualiser.product.image) return;

  const saved = readSavedVariantFromLS();
  if (!saved) return;

  const vid = saved.variantId || saved.id;
  if (!vid) return;

  const resolved = resolveVariantFromPage(vid);
  if (!resolved) return;

  visualiser.product.image =
    resolved.image ||
    resolved.featured_image?.src ||
    '';

  if (typeof resolved.price === 'number') {
    visualiser.product.price = resolved.price;
  }
}

  const full = $('lucira-accessory-fullscreen');

  function openPanel() {
    try {
      ['.popup-overlay', '#product-popup', '.fancybox-opened'].forEach((sel) =>
        document.querySelectorAll(sel).forEach((n) => {
          n.style.display = 'none';
          n.classList?.remove('active');
        })
      );
    } catch (_) {}

    try {
      const saved = readSavedVariantFromLS();

      if (saved && (saved.variantId || saved.id)) {
        const vid = saved.variantId || saved.id;
        const resolved = resolveVariantFromPage(vid);

        if (resolved) renderLeftSafe(resolved);
        else renderLeftSafe(saved);
      } else {
        const first = document.querySelector('script[id^="product-json-"]');

        if (first) {
          const pj =
            (function () {
              try {
                return JSON.parse(first.textContent);
              } catch (e) {
                return null;
              }
            })() || {};

          const v = pj?.variants?.[0];

          if (v) {
            renderLeftSafe({
              product_title: pj.title || pj.product?.title || 'Selected variant',
              image:
                v.featured_image?.src ||
                v.image?.src ||
                pj.featured_image ||
                (pj.images && pj.images[0]) ||
                '',
              price: v.price,
            });
          }
        }
      }
    } catch (e) {}

   setTimeout(() => {
  ensureBV();
  attachQtyHandlersKonva();
  syncUIFromCart();
  refreshSelectedBorders();
  bindCollectionTiles();
  buildColorMapForActiveGrid();
  buildSwatchDots();
}, 80);
    if (full) {
      full.style.display = 'block';
      document.querySelector('.carat-section').style.display = 'none';
      full.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  setTimeout(() => {
      try {
        ensureBV();
        if (visualiser.charms && visualiser.charms.length && visualiser.charms.length < 3)
          bv.autoZoomToCharms();
        else bv.setZoom(1);
      } catch (_) {}
    }, 150);
  }

  function closePanel() {
    if (full) {
      full.style.display = 'none';
      full.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    try {
      ensureBV().setZoom(1);
    } catch (_) {}
  }

  (function bindProceedRobustly() {
    const selectors = [
      '.vis-Visualiser_StepSummaryButton',
      '[data-role="proceed"]',
      '.Proceed_button',
      '.proceed',
      '#proceed',
      '[data-proceed]',
    ];

    function bind(el) {
      if (!el.__lucira_bound) {
        el.addEventListener(
          'click',
          function (e) {
            try {
              e.preventDefault();
              e.stopPropagation();
            } catch (_) {}

            openPanel();
          },
          { passive: false }
        );

        el.__lucira_bound = true;
      }
    }

    selectors.forEach((sel) => document.querySelectorAll(sel).forEach(bind));

    document.body.addEventListener(
      'click',
      function (e) {
        const btn = e.target.closest(selectors.join(','));
        if (btn) {
          try {
            e.preventDefault();
          } catch (_) {}
          openPanel();
        }
      },
      { passive: false }
    );

    const mo = new MutationObserver((muts) => {
      muts.forEach((m) =>
        (m.addedNodes || []).forEach((node) => {
          if (!(node instanceof Element)) return;

          selectors.forEach((sel) => {
            try {
              if (node.matches && node.matches(sel)) bind(node);
              node.querySelectorAll && node.querySelectorAll(sel).forEach(bind);
            } catch (_) {}
          });
        })
      );
    });

    mo.observe(document.body, { childList: true, subtree: true });
  })();
  function productJsonForCard(card) {
    const pid = card?.dataset?.productId;
    if (!pid) return null;

    const el = document.getElementById('product-json-' + pid);
    return el ? safeJSON(el.textContent || el.innerText) : null;
  }

  function getCardImageSrc(card) {
    try {
      const imgEl = card.querySelector('.charm-thumb-wrap img');
      if (imgEl && (imgEl.currentSrc || imgEl.src)) return imgEl.currentSrc || imgEl.src;

      const pj = productJsonForCard(card);
      if (pj) {
        const defImg =
          pj.featured_image ||
          (pj.images && pj.images[0]) ||
          (pj.variants &&
            pj.variants[0] &&
            (pj.variants[0].featured_image || pj.variants[0].image));

        if (defImg) return typeof defImg === 'string' ? defImg : defImg.src || defImg.url || defImg;
      }

      if (card.dataset.previewImage) return card.dataset.previewImage;

      const anyImg = card.querySelector('img');
      if (anyImg && (anyImg.currentSrc || anyImg.src)) return anyImg.currentSrc || anyImg.src;

      return '';
    } catch (e) {
      return '';
    }
  }

  function getCharmMeta(variantId) {
    const el = document.getElementById('variant-meta-' + variantId);
    if (!el || !el.textContent) {
      return { metal: 0, diamond: 0 };
    }

    const raw = el.textContent.trim();
    let json;

    try {
      json = JSON.parse(raw);
    } catch (e) {
      console.error('JSON PARSE ERROR for variant:', variantId, e);
      console.log('RAW JSON:', raw);
      return { metal: 0, diamond: 0 };
    }

    console.log('PARSED JSON:', json);

    return {
      metal: Number(json.metal_weight || 0),
      diamond: Number(json.diamond_1_weight || 0),
    };
  }

  function buildCharmObjFromCard(card) {
    const pj = productJsonForCard(card) || {};

    const variantId = pj.variants?.[0]?.id || card.dataset.variantId || null;
    const mf = variantId ? getCharmMeta(variantId) : { metal: 0, diamond: 0 };

    return {
      id: Number(card.dataset.productId),
      variant_id: variantId,
      name: pj.title || card.querySelector('.charm-title')?.innerText || 'Charm',
      image: getCardImageSrc(card),
      price: Number(card.dataset.price || pj.price || 0),
      max: pj.variants?.[0]?.inventory_policy || 99,
      category: pj.product_type || '',
      metal_weight: mf.metal,
      diamond_1_weight: mf.diamond,
    };
  }
function rebuildVisualiserFromCart() {
  try {
    const cart = JSON.parse(localStorage.getItem('charm_cart_v1'));

    // 🔥 HARD RESET every time
    visualiser.charms.length = 0;

    if (!cart || !cart.items) return;

    Object.keys(cart.items).forEach((variantId) => {
      const qty = Number(cart.items[variantId].qty || 0);
      if (qty <= 0) return;

      // 🔥 FIX: variantId ≠ productId
      const card = document.querySelector(
        `.charm-card[data-variant-id="${variantId}"],
         .charm-card[data-product-id="${variantId}"]`
      );
      if (!card) return;

      for (let i = 0; i < qty; i++) {
        visualiser.charms.push(buildCharmObjFromCard(card));
      }
    });
  } catch (e) {
    console.warn('rebuildVisualiserFromCart failed', e);
    visualiser.charms.length = 0;
  }
}

function syncUIFromCart() {
    ensureBaseProductFromLS();
  rebuildVisualiserFromCart();
  const bv = ensureBV();
  bv._productRendered = false;
  bv.render(visualiser).catch(() => {});
  const selectedCount = getSelectedCount();

  if (selectedCount > 0) {
    updateCTATotal();
  } else {
    const footer = document.querySelector('.cta-footer');
    if (footer) footer.style.display = 'none';
  }
  refreshCapState();
}
  function attachQtyHandlersKonva() {
    const gridsWrapper = document.getElementById('lf-charms-grids-wrapper');
    if (!gridsWrapper) return;

    const cards = gridsWrapper.querySelectorAll('.charm-card');
    if (!cards) return;

    const clamp = (v) => Math.max(0, Math.min(99, Number(v) || 0));

    cards.forEach((card) => {
      const input = card.querySelector('.qty-input');
      if (!input) return;

      let incr = card.querySelector('.qty-incr');
      let decr = card.querySelector('.qty-decr');

      if (incr) {
        const n = incr.cloneNode(true);
        incr.parentNode.replaceChild(n, incr);
        incr = n;
      }

      if (decr) {
        const n = decr.cloneNode(true);
        decr.parentNode.replaceChild(n, decr);
        decr = n;
      }

      const newIn = card.querySelector('.qty-incr');
      const newDe = card.querySelector('.qty-decr');

     newIn?.addEventListener(
  'click',
  () => {
    if (getSelectedCount() >= MAX_CHARMS) {
      refreshCapState();
      return;
    }

    let v = clamp(input.value);
    input.value = String(++v);
    setSelectedBorder(card);
    updateBadgesKonva();
    refreshCapState();
  },
  { passive: true }
);


     newDe?.addEventListener(
  'click',
  () => {
    let v = clamp(input.value);
    if (v <= 0) return;

    input.value = String(--v);
    setSelectedBorder(card);
    updateBadgesKonva();
    refreshCapState();
  },
  { passive: true }
);

      input?.addEventListener('keydown', (e) => e.preventDefault());
    });
  }

  function updateBadgesKonva() {
    const counts = {};

    document.querySelectorAll('.charms-grid-container').forEach((cont) => {
      const handle = cont.dataset.collectionHandle;

      cont.querySelectorAll('.charm-card').forEach((card) => {
        const q = Number(card.querySelector('.qty-input')?.value || 0);
        if (q > 0) counts[handle] = (counts[handle] || 0) + q;
      });
    });

    document.querySelectorAll('.collection-tile').forEach((t) => {
      const b = t.querySelector('.ct-qty');
      const val = counts[t.dataset.collectionHandle] || 0;
      if (b) b.textContent = val > 0 ? val : '';
    });
  }

  IDLE(attachQtyHandlersKonva);
  IDLE(refreshSelectedBorders);
  IDLE(refreshCapState);

  const moCards = new MutationObserver((muts) => {
    let needs = false;

    for (const m of muts) {
      for (const n of m.addedNodes || []) {
        if (!(n instanceof Element)) continue;
        if (n.matches?.('.charm-card') || n.querySelector?.('.charm-card')) {
          needs = true;
          break;
        }
      }
      if (needs) break;
    }

    if (needs) IDLE(attachQtyHandlersKonva);
  });

  moCards.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('visualiser:remove', (e) => {
    if (e?.detail?.productId) {
      removeCharmByProductId(e.detail.productId);
    } else {
      const idx = Number(e?.detail?.index);
      if (!Number.isNaN(idx)) {
        ensureBV().render(visualiser).catch(() => {});
      }
    }
    updateBadgesKonva();
    refreshCapState();
  });

  window.addEventListener(
    'resize',
    () => {
      try {
        ensureBV().initStage();
        bv.render(visualiser);

        if (typeof currentCollectionId === 'string' && currentCollectionId) {
        }
      } catch (e) {}
    },
    { passive: true }
  );

  function normMetal(str) {
    if (!str) return null;
    const s = String(str).toLowerCase();

    if (/(^|\W)(yellow\s*gold|yellow|yg)(\W|$)/.test(s)) return 'Yellow Gold';
    if (/(^|\W)(rose\s*gold|rose|rg)(\W|$)/.test(s)) return 'Rose Gold';
    if (/(^|\W)(white\s*gold|white|wg|silver|platinum)(\W|$)/.test(s)) return 'White Gold';

    return null;
  }

  function normCarat(str) {
    if (!str) return null;
    const m = String(str)
      .toUpperCase()
      .match(/(9|14|18)\s*KT/);
    return m ? m[1] + 'KT' : null;
  }

  function findOptIndex(pj, names) {
    const opts = pj.options || pj.product?.options || [];

    for (let i = 0; i < opts.length; i++) {
      const nm = String(opts[i]?.name || '').toLowerCase();
      for (const nn of names) {
        if (nm.includes(nn)) return i;
      }
    }

    return -1;
  }

  function getOpt(v, i) {
    return i === 0 ? v.option1 : i === 1 ? v.option2 : i === 2 ? v.option3 : null;
  }

  function variantCarat(v) {
    const vals = [v.option1, v.option2, v.option3].filter(Boolean);

    for (const val of vals) {
      const c = normCarat(val);
      if (c) return c;
    }

    return normCarat(v.title);
  }

  function variantMetal(pj, v) {
    const metalIdx = findOptIndex(pj, ['metal', 'color', 'colour', 'finish']);
    const fromOpt = metalIdx > -1 ? getOpt(v, metalIdx) : null;
    return normMetal(fromOpt) || normMetal(v.title);
  }

  function pickVariant(pj, wantedCarat, wantedMetal) {
    const vs = pj.variants || pj.product?.variants || [];

    const pool = wantedCarat ? vs.filter((v) => variantCarat(v) === wantedCarat) : vs.slice();
    const mPool =
      wantedMetal && wantedMetal !== 'All'
        ? pool.filter((v) => variantMetal(pj, v) === wantedMetal)
        : pool;

    return mPool[0] || null;
  }

  function deriveCaratFromLS() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;

      const parsed = safeJSON(raw) || (/&quot;/.test(raw) ? safeJSON(raw.replace(/&quot;/g, '"')) : null);
      const data = parsed || {};
      const vid = data?.variantId || data?.id || '';

      if (!vid && data?.title) return normCarat(data.title);

      const scripts = Array.from(
        document.querySelectorAll(
          'script[type="application/json"],script[id^="product-json-"],script[type="application/json+product"]'
        )
      );

      for (const s of scripts) {
        const pj = safeJSON(s.textContent || s.innerText);
        if (!pj) continue;

        const vs = pj.variants || pj.product?.variants || [];
        const hit = vs.find(
          (v) => String(v.id) === String(vid) || String(v.id).endsWith(String(vid))
        );

        if (hit) {
          const c = [hit.option1, hit.option2, hit.option3, hit.title].map(normCarat).find(Boolean);
          if (c) return c;
        }
      }

      return data?.title ? normCarat(data.title) : null;
    } catch (_) {
      return null;
    }
  }

  const COLOR_ORDER = ['Yellow Gold', 'Rose Gold', 'White Gold'];

  const COLOR_KEYWORDS = {
    'Yellow Gold': ['yellow gold', 'yellow', 'yg'],
    'Rose Gold': ['rose gold', 'rose', 'rg'],
    'White Gold': ['white gold', 'white', 'wg', 'silver', 'platinum'],
  };

  let productColorMap = {};
  let currentCarat = null;

  function detectColorForProductJSON(pj) {
    if (!pj) return null;

    const variants = pj.variants || pj.product?.variants || [];

    for (const v of variants) {
      const vt = (v.title || '').toLowerCase();
      for (const [label, kws] of Object.entries(COLOR_KEYWORDS)) {
        if (kws.some((kw) => vt.includes(kw))) return label;
      }
    }

    const opts = pj.options || pj.product?.options || [];
    for (const opt of opts) {
      const on = (opt.name || '').toLowerCase();

      if (['metal', 'color', 'colour', 'finish'].some((k) => on.includes(k))) {
        const values = (opt.values || []).join(' ').toLowerCase();
        for (const [label, kws] of Object.entries(COLOR_KEYWORDS)) {
          if (kws.some((kw) => values.includes(kw))) return label;
        }
      }
    }

    const meta = `${(pj.title || '').toLowerCase()} ${
      Array.isArray(pj.tags)
        ? pj.tags.join(' ').toLowerCase()
        : String(pj.tags || '').toLowerCase()
    }`;

    for (const [label, kws] of Object.entries(COLOR_KEYWORDS)) {
      if (kws.some((kw) => meta.includes(kw))) return label;
    }

    return null;
  }

  function getActiveGrid() {
    const id = currentCollectionId || document.querySelector('.collection-tile')?.dataset.target;
    return id ? document.getElementById(id) : null;
  }

  function buildColorMapForActiveGrid() {
    productColorMap = {};
    const grid = getActiveGrid();
    if (!grid) return;

    grid.querySelectorAll('script[id^="product-json-"]').forEach((s) => {
      try {
        const pid = s.id.replace('product-json-', '');
        const pj = safeJSON(s.textContent || s.innerText);
        if (!pj) return;

        const color = detectColorForProductJSON(pj);
        if (color) productColorMap[pid] = color;
      } catch (e) {}
    });
  }

  function setActiveLabel(color) {
    const name = $('lf-color-name');
    const dot = $('lf-active-dot');
    if (!name || !dot) return;

    if (!color || color === 'All') {
      name.textContent = 'All Metals';
      dot.style.background = '#e5e7eb';
      return;
    }
    name.textContent = color;
    dot.style.background =
      color === 'Yellow Gold'
        ? '#f2c84b'
        : color === 'Rose Gold'
        ? '#d88c8c'
        : '#e5e7eb';
  }

  function availableVariantMetalsInActiveGrid() {
    const grid = getActiveGrid();
    if (!grid) return [];

    const set = new Set();

    grid.querySelectorAll('script[id^="product-json-"]').forEach((s) => {
      const pj = safeJSON(s.textContent || s.innerText);
      if (!pj) return;

      const vs = pj.variants || pj.product?.variants || [];
      vs.forEach((v) => {
        if (currentCarat && variantCarat(v) !== currentCarat) return;
        const m = variantMetal(pj, v);
        if (m) set.add(m);
      });
    });

    return COLOR_ORDER.filter((c) => set.has(c));
  }

  function availableColorsInActiveGrid() {
    const metals = availableVariantMetalsInActiveGrid();
    if (metals.length) return metals;

    const set = new Set(Object.values(productColorMap));
    return COLOR_ORDER.filter((c) => set.has(c));
  }

  function buildSwatchDots() {
    const wrap = $('lf-dots');
    if (!wrap) return;

    wrap.innerHTML = '';

    if (currentCarat == null) currentCarat = deriveCaratFromLS();

    const colors = availableColorsInActiveGrid();

    if (currentColorLabel !== 'All' && !colors.includes(currentColorLabel)) {
      currentColorLabel = colors[0] || 'All';
    }

    if (currentColorLabel === 'All' && colors.length) currentColorLabel = colors[0];

    colors.forEach((color) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'color-dot' + (currentColorLabel === color ? ' active' : '');
      dot.dataset.color = color;
      dot.setAttribute('aria-label', color);

      dot.addEventListener('click', () => {
        currentColorLabel = color;
        applyColorFilter(color);

        wrap.querySelectorAll('.color-dot').forEach((d) => d.classList.remove('active'));
        dot.classList.add('active');

        setActiveLabel(color);
        refreshCapState();
      });

      wrap.appendChild(dot);
    });

    applyColorFilter(currentColorLabel);
    setActiveLabel(currentColorLabel);
  }

  function applyColorFilter(colorLabel) {
    const grid = getActiveGrid();
    if (!grid) return;

    buildColorMapForActiveGrid();

    grid.querySelectorAll('.charm-card').forEach((card) => {
      const pid = card.dataset.productId;
      const pjEl = document.getElementById('product-json-' + pid);
      const pj = pjEl ? safeJSON(pjEl.textContent || pjEl.innerText) : null;

      if (!pj) {
        card.style.display = '';
        return;
      }

      pickVariant(pj, currentCarat, colorLabel === 'All' ? null : colorLabel);
    });
  }

  function extractKT(x) {
    if (!x) return null;

    const s = String(x).toUpperCase().replace(/\s+/g, '');
    const m = s.match(/(9|14|18)K(T)?/);

    return m ? m[1] + 'KT' : null;
  }

  function vKT(v) {
    return (
      extractKT(v?.option1) ||
      extractKT(v?.option2) ||
      extractKT(v?.option3) ||
      extractKT(v?.title)
    );
  }

  let __initDone = false;

  function runInit() {
    if (__initDone) return;
    __initDone = true;
    buildVariantIndexOnce();

    if (!currentCollectionId) {
      const firstGrid = document.querySelector('.charms-grid-container');
      if (firstGrid) currentCollectionId = firstGrid.id;
    }

    currentCarat = deriveCaratFromLS();

    bindCollectionTiles();
    buildColorMapForActiveGrid();
    buildSwatchDots();
    refreshSelectedBorders();
    // updateCTATotal();
    refreshCapState();
  }

  document.addEventListener('DOMContentLoaded', runInit);
  setTimeout(runInit, 500);

  window.luciraGetPreview = function () {
    try {
      ensureBV();
      return bv.stage.toDataURL({ mimeType: 'image/jpeg' });
    } catch (e) {
      return '';
    }
  };

  window.luciraOpenAccessory = openPanel;
  window.luciraCloseAccessory = closePanel;

};

document.addEventListener('DOMContentLoaded', function () {
  const label = document.getElementById('lf-color-name');

  const dotsWrap = document.getElementById('lf-dots');
  const activeDot = document.getElementById('lf-active-dot');
  const caratValue = localStorage.getItem('Carat-value');
  if (caratValue) {
    label.insertAdjacentText('afterbegin', `<span class="carat-value">${caratValue}</span> `);
  }

  if (dotsWrap && dotsWrap.children.length === 0) {
    dotsWrap.innerHTML = `
      <button type="button" class="lf-dot" data-carat="14KT" aria-pressed="false">14KT</button>
      <button type="button" class="lf-dot" data-carat="18KT" aria-pressed="false">18KT</button>
    `;
  }

  const saved = (localStorage.getItem('Carat-value') || '').toUpperCase().replace(/\s+/g, '');
  const dots = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.lf-dot')) : [];

  if (saved && dots.length) {
    activateKT(saved);
  } else {
    if (label) label.textContent = 'All Metals';
  }

  dotsWrap?.addEventListener('click', function () {
    setTimeout(() => {
      const label = document.getElementById('lf-color-name');
      if (!label) return;

      document
        .querySelectorAll('.charms-grid-container.active .custom-charm-grid')
        .forEach((each) => {
          const title = each.getAttribute('data-title')?.toLowerCase().replace(/\s+/g, '') || '';
          const colorName =
            document.querySelector('#lf-color-name')?.textContent.toLowerCase().replace(/\s+/g, '') || '';
          if (title.includes(colorName) || colorName.includes(title)) {
            each.style.display = '';
          } else {
            each.style.display = 'none';
          }
        });
      window.__luciraUpdateCTATotal && window.__luciraUpdateCTATotal();
    }, 100);
  });

  function activateKT(kt) {
    dots.forEach((b) => {
      const isActive = (b.dataset.carat || '').toUpperCase().replace(/\s+/g, '') === kt;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', String(isActive));
    });
    try {
      const current = dots.find((b) => b.classList.contains('active'));
      if (activeDot && current) {
        const rect = current.getBoundingClientRect();
        const parentRect = dotsWrap.getBoundingClientRect();
        activeDot.style.display = 'block';
        activeDot.style.left = rect.left - parentRect.left + rect.width / 2 + 'px';
      }
    } catch {}
    if (label) label.textContent = kt;
  }

  window.filterProductsByCarat =
    window.filterProductsByCarat ||
    function (selectedKT) {
      const cards = document.querySelectorAll('.charm-card');
      cards.forEach((card) => {
        const arr = (card.dataset.carat || '')
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
        const show = arr.some((v) => v.includes(selectedKT));
        card.style.display = show ? '' : 'none';
      });
    };
});

function readKT() {
  return localStorage.getItem('Carat-value');
}

function readMetal() {
  const dot = document.querySelector('.color-dot.active');
  return dot ? dot.dataset.color : 'All';
}

function getVariantJSON(id) {
  const el = document.getElementById('product-json-' + id);
  if (!el) return null;
  try {
    return JSON.parse(el.textContent);
  } catch {
    return null;
  }
}

function findKT(v) {
  const txt = (v.option1 + ' ' + v.option2 + ' ' + v.option3 + ' ' + v.title).toUpperCase();
  if (txt.includes('9')) return '9KT';
  if (txt.includes('14')) return '14KT';
  if (txt.includes('18')) return '18KT';
  return null;
}

function findMetal(v) {
  const t = (v.option1 + ' ' + v.option2 + ' ' + v.option3 + ' ' + v.title).toLowerCase();
  if (t.includes('yellow')) return 'Yellow Gold';
  if (t.includes('rose')) return 'Rose Gold';
  return 'White Gold';
}

function computeCountsSimple() {
  document.querySelectorAll('.charms-grid-container').forEach((container) => {
    const containerId = container.id;
    if (!containerId) return;
    const cards = container.querySelectorAll('.charm-card');
    const totalCount = cards.length;
    let selected = 0;
    cards.forEach((card) => {
      const q = Number(card.querySelector('.qty-input')?.value || 0);
      if (q > 0) selected += q;
    });
    const tile = document.querySelector(
      `.collection-tile[data-target="${containerId}"]`
    );
    if (!tile) return;

    const visible = tile.querySelector('.ct-visible-count');
    const qty = tile.querySelector('.ct-qty');

    if (visible) visible.textContent = totalCount;
    if (qty) qty.textContent = selected > 0 ? `(${selected})` : '';
  });
}

function updateCountsUI() {
  computeCountsSimple();
}

let __countsScheduled = false;
function scheduleUpdateCounts() {
  console.log('2166');
  let totalQty = 0;
  document.querySelectorAll('.qty-input').forEach((each)=>{
      totalQty+=Number(each.value)
  });
  if(totalQty >= 5) return;
  // console.log('2172');


  if (__countsScheduled) return;
  __countsScheduled = true;
  const run = () => {
    __countsScheduled = false;
    updateCountsUI();
  };
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() =>
      (typeof window.requestIdleCallback === 'function' ? requestIdleCallback(run) : setTimeout(run, 1))
    );
  } else {
    (typeof window.requestIdleCallback === 'function' ? requestIdleCallback(run) : setTimeout(run, 1));
  }
}

document.addEventListener('DOMContentLoaded', updateCountsUI);

document.addEventListener('click', (e) => {
  if (
    e.target.closest('.color-dot') ||
    e.target.closest('.collection-tile') ||
    e.target.closest('.qty-incr') ||
    e.target.closest('.qty-decr')
  ) {
    scheduleUpdateCounts();
  }
});

window.addEventListener('storage', (e) => {
  if (e.key === 'Carat-value') scheduleUpdateCounts();
});

window.updateCharmCounts = updateCountsUI;
