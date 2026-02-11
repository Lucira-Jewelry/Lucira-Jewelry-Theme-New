/**
 * Card Product Performance Optimizations
 * Handles deferred diamond discount calculations for product cards
 */

(function () {
  'use strict';

  /* ================= CONFIG ================= */

  const CONFIG = {
    INTERSECTION_ROOT_MARGIN: '100px',
    DISCOUNT_COLORS: {
      35: '#009147',
      25: '#01A652',
      20: '#27B169',
      default: '#4CBC7F'
    }
  };

  /* ================= HELPERS ================= */

  function getDiscountColor(percent) {
    if (percent >= 35) return CONFIG.DISCOUNT_COLORS[35];
    if (percent >= 25) return CONFIG.DISCOUNT_COLORS[25];
    if (percent >= 20) return CONFIG.DISCOUNT_COLORS[20];
    return CONFIG.DISCOUNT_COLORS.default;
  }

  /* ================= CALCULATIONS ================= */

  function calculateDiamondDiscount(config, stonePricingDb) {
    let diamondFinal = 0;
    let diamondOriginal = 0;

    if (!config || !config.advanced_stone_config) return 0;

    config.advanced_stone_config.forEach(stoneItem => {
      if (stoneItem.stone_type !== 'diamond') return;

      let slabRate = 0;
      let slabDiscount = 0;

      const pricingRef = stonePricingDb?.find(p => p.id === stoneItem.pricing_id);

      if (pricingRef && pricingRef.slabs && stoneItem.stone_quantity > 0) {
        const avgWeight = stoneItem.stone_weight / stoneItem.stone_quantity;

        for (const slab of pricingRef.slabs) {
          if (avgWeight >= slab.from_weight && avgWeight <= slab.to_weight) {
            slabRate = slab.price * 100;
            slabDiscount = slab.discount || 0;
            break;
          }
        }
      }

      const baseCost = slabRate * stoneItem.stone_weight;
      const appliedDiscount = config.diamond_discount || slabDiscount;
      const discountAmount = (baseCost * appliedDiscount) / 100;
      const finalCost = baseCost - discountAmount;

      diamondOriginal += baseCost;
      diamondFinal += finalCost;
    });

    if (diamondOriginal > diamondFinal && diamondOriginal > 0) {
      return Math.round(((diamondOriginal - diamondFinal) * 100) / diamondOriginal);
    }

    return 0;
  }

  function calculateMCDiscount(config) {
    if (!config) return 0;

    const mcRateOriginal = (config.making_charges || 0) * 100;
    const mcDiscountPercent = config.making_charges_discount || 0;

    if (!mcRateOriginal || !mcDiscountPercent) return 0;

    const mcRateFinal = mcRateOriginal - (mcRateOriginal * mcDiscountPercent) / 100;

    const mcCostOriginal = mcRateOriginal * config.metal_weight;
    const mcCostFinal = mcRateFinal * config.metal_weight;

    if (mcCostOriginal > mcCostFinal && mcCostOriginal > 0) {
      return Math.round(((mcCostOriginal - mcCostFinal) * 100) / mcCostOriginal);
    }

    return 0;
  }

  /* ================= RENDER ================= */

  function renderDiscounts(diamondPercent, mcPercent, container) {
    if (diamondPercent === 0 && mcPercent === 0) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'flip-wrapper';

    if (diamondPercent > 0 && mcPercent > 0) {
      wrapper.classList.add('animate-flip');
    }

    if (diamondPercent > 0) {
      const el = document.createElement('small');
      el.className = 'discount-text';
      el.style.color = getDiscountColor(diamondPercent);
      el.textContent = `${diamondPercent}% OFF on Diamond Price`;
      wrapper.appendChild(el);
    }

    if (mcPercent > 0) {
      const el = document.createElement('small');
      el.className = 'discount-text';
      el.style.color = getDiscountColor(mcPercent);
      el.textContent = `${mcPercent}% OFF on Making Charges`;
      wrapper.appendChild(el);
    }

    container.appendChild(wrapper);
  }

  /* ================= MAIN LOADER ================= */

  function loadDiscountInfo(container) {
    if (container.dataset.loaded === 'true') return;
    container.dataset.loaded = 'true';

    try {
      const configRaw = container.dataset.pricingConfig;
      if (!configRaw) return;

      const config = JSON.parse(configRaw);

      let stonePricingDb = window.__stonePricingDb || [];
      window.__stonePricingDb = stonePricingDb;

      const diamondPercent = calculateDiamondDiscount(config, stonePricingDb);
      const mcPercent = calculateMCDiscount(config);

      renderDiscounts(diamondPercent, mcPercent, container);
    } catch (e) {
      console.warn('Discount calculation failed', e);
    }
  }

  /* ================= LAZY INIT ================= */

  function initLazyDiscounts() {
    const containers = document.querySelectorAll('.discount-container[data-has-config]');

    if (!containers.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const container = entry.target;
        if (container.dataset.hasConfig !== 'true') return;

        loadDiscountInfo(container);
        observer.unobserve(container);
      });
    }, {
      rootMargin: CONFIG.INTERSECTION_ROOT_MARGIN,
      threshold: 0.01
    });

    containers.forEach(el => observer.observe(el));
  }

  /* ================= ICON CAROUSEL ================= */

  function initIconCarousels() {
    document.querySelectorAll('.carousel-container').forEach(carousel => {
      const icons = carousel.querySelectorAll('.icon');
      const text = carousel.querySelector('.text-content');

      if (icons.length <= 1) return;

      let index = 0;
      const labels = [...icons].map(i => i.alt || i.title || '');

      setInterval(() => {
        icons.forEach((icon, i) => icon.classList.toggle('active', i === index));
        if (text && labels[index]) text.textContent = labels[index];
        index = (index + 1) % icons.length;
      }, 3000);
    });
  }

  /* ================= COLOR VARIANTS ================= */

  function initColorVariants() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.color-option');
      if (!btn) return;

      const card = btn.closest('.card-wrapper');
      if (!card) return;

      btn.parentElement.querySelectorAll('.color-option')
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const img = card.querySelector('.primary-image');
      if (img && btn.dataset.imageSrc) {
        img.src = btn.dataset.imageSrc;
        if (btn.dataset.imageAlt) img.alt = btn.dataset.imageAlt;
      }

      card.querySelectorAll('a[href*="/products/"]').forEach(link => {
        const url = new URL(link.href, location.origin);
        url.searchParams.set('variant', btn.dataset.variantId);
        link.href = url.toString();
      });
    });
  }

  /* ================= INIT ================= */

  function init() {
    initLazyDiscounts();
    initIconCarousels();
    initColorVariants();
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(init, { timeout: 2000 });
  } else {
    setTimeout(init, 100);
  }

  document.addEventListener('shopify:section:load', init);

})();
