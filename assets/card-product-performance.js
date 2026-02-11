(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    INTERSECTION_ROOT_MARGIN: '100px',
    DISCOUNT_COLORS: {
      35: '#009147',
      25: '#01A652',
      20: '#27B169',
      default: '#4CBC7F'
    }
  };

  /**
   * Get discount color based on percentage
   */
  function getDiscountColor(percent) {
    if (percent >= 35) return CONFIG.DISCOUNT_COLORS[35];
    if (percent >= 25) return CONFIG.DISCOUNT_COLORS[25];
    if (percent >= 20) return CONFIG.DISCOUNT_COLORS[20];
    return CONFIG.DISCOUNT_COLORS.default;
  }

  /**
   * Calculate diamond discount from config
   */
  function calculateDiamondDiscount(config, stonePricingDb) {
    let diamondFinal = 0.0;
    let diamondOriginal = 0.0;

    if (!config || !config.advanced_stone_config) return 0;

    config.advanced_stone_config.forEach(stoneItem => {
      if (stoneItem.stone_type === 'diamond') {
        let slabRate = 0;
        let slabDiscount = 0;

        // Find pricing reference
        const pricingRef = stonePricingDb?.find(p => p.id === stoneItem.pricing_id);

        if (pricingRef && pricingRef.slabs) {
          const avgWeight = (stoneItem.stone_weight * 1.0) / stoneItem.stone_quantity;
          
          // Find matching slab
          for (const slab of pricingRef.slabs) {
            if (avgWeight >= slab.from_weight && avgWeight <= slab.to_weight) {
              slabRate = slab.price * 100;
              slabDiscount = slab.discount || 0;
              break;
            }
          }
        }

        const itemBaseCost = slabRate * stoneItem.stone_weight;
        const appliedDiscount = config.diamond_discount || slabDiscount;
        const discountAmount = (itemBaseCost * appliedDiscount) / 100.0;
        const itemFinalCost = itemBaseCost - discountAmount;

        diamondFinal += itemFinalCost;
        diamondOriginal += itemBaseCost;
      }
    });

    if (diamondOriginal > diamondFinal && diamondOriginal > 0) {
      return Math.round(((diamondOriginal - diamondFinal) * 100) / diamondOriginal);
    }

    return 0;
  }

  /**
   * Calculate making charges discount
   */
  function calculateMCDiscount(config) {
    if (!config) return 0;

    const mcRateOriginal = (config.making_charges || 0) * 100;
    const mcDiscountPercent = config.making_charges_discount || 0;
    const mcRateDiscAmt = (mcRateOriginal * mcDiscountPercent) / 100.0;
    const mcRateFinal = mcRateOriginal - mcRateDiscAmt;

    const mcCostOriginal = mcRateOriginal * config.metal_weight;
    const mcCostFinal = mcRateFinal * config.metal_weight;

    if (mcCostOriginal > mcCostFinal && mcCostOriginal > 0) {
      return Math.round(((mcCostOriginal - mcCostFinal) * 100) / mcCostOriginal);
    }

    return 0;
  }

  /**
   * Render discount badges
   */
  function renderDiscounts(diamondPercent, mcPercent, container) {
    if (diamondPercent === 0 && mcPercent === 0) return;

    const flipWrapper = document.createElement('div');
    flipWrapper.className = 'flip-wrapper';
    
    if (diamondPercent > 0 && mcPercent > 0) {
      flipWrapper.classList.add('animate-flip');
    }

    if (diamondPercent > 0) {
      const diamondText = document.createElement('small');
      diamondText.className = 'discount-text';
      diamondText.style.color = getDiscountColor(diamondPercent);
      diamondText.textContent = `${diamondPercent}% OFF on Diamond Price`;
      flipWrapper.appendChild(diamondText);
    }

    if (mcPercent > 0) {
      const mcText = document.createElement('small');
      mcText.className = 'discount-text';
      mcText.style.color = getDiscountColor(mcPercent);
      mcText.textContent = `${mcPercent}% OFF on Making Charges`;
      flipWrapper.appendChild(mcText);
    }

    container.appendChild(flipWrapper);
  }

  /**
   * Load discount information for a variant
   */
  async function loadDiscountInfo(variantId, container) {
    try {
      // Fetch variant data
      const variantResponse = await fetch(`/variants/${variantId}.js`);
      if (!variantResponse.ok) throw new Error('Failed to fetch variant');
      
      const variant = await variantResponse.json();
      
      // Check if variant has pricing config
      if (!variant.metafields?.['DI-GoldPrice']?.variant_config) {
        return;
      }

      const config = variant.metafields['DI-GoldPrice'].variant_config;
      
      // Fetch shop metafields for stone pricing database (cached)
      let stonePricingDb = window.__stonePricingDb;
      if (!stonePricingDb) {
        try {
          // This would need to be fetched from your shop's metafields
          // For now, we'll skip this if not available
          stonePricingDb = [];
        } catch (e) {
          console.warn('Could not load stone pricing database', e);
          stonePricingDb = [];
        }
        window.__stonePricingDb = stonePricingDb;
      }

      // Calculate discounts
      const diamondPercent = calculateDiamondDiscount(config, stonePricingDb);
      const mcPercent = calculateMCDiscount(config);

      // Render discounts
      renderDiscounts(diamondPercent, mcPercent, container);

    } catch (error) {
      console.warn('Error loading discount info:', error);
    }
  }

  /**
   * Initialize lazy discount loading with Intersection Observer
   */
  function initLazyDiscounts() {
    const discountContainers = document.querySelectorAll('.discount-container[data-has-config="true"]');
    
    if (!discountContainers.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const container = entry.target;
          const variantId = container.dataset.variantId;
          
          if (variantId) {
            loadDiscountInfo(variantId, container);
          }
          
          // Stop observing once loaded
          observer.unobserve(container);
        }
      });
    }, {
      rootMargin: CONFIG.INTERSECTION_ROOT_MARGIN,
      threshold: 0.01
    });

    discountContainers.forEach(container => {
      observer.observe(container);
    });
  }

  /**
   * Initialize icon carousel
   */
  function initIconCarousels() {
    const carousels = document.querySelectorAll('.carousel-container');
    
    carousels.forEach(carousel => {
      const icons = carousel.querySelectorAll('.icon');
      const textContent = carousel.querySelector('.text-content');
      
      if (icons.length <= 1) return;

      let currentIndex = 0;
      const labels = Array.from(icons).map(icon => icon.alt || icon.title || '');

      function rotateIcons() {
        icons.forEach((icon, idx) => {
          icon.classList.toggle('active', idx === currentIndex);
        });
        
        if (textContent && labels[currentIndex]) {
          textContent.textContent = labels[currentIndex];
        }

        currentIndex = (currentIndex + 1) % icons.length;
      }

      // Start rotation after a slight delay
      const intervalId = setInterval(rotateIcons, 3000);
      carousel.dataset.intervalId = intervalId;
    });
  }

  /**
   * Handle color variant switching
   */
  function initColorVariants() {
    document.addEventListener('click', function(e) {
      const colorButton = e.target.closest('.color-option');
      if (!colorButton) return;

      const productId = colorButton.dataset.productId;
      const variantId = colorButton.dataset.variantId;
      const imageSrc = colorButton.dataset.imageSrc;
      const imageAlt = colorButton.dataset.imageAlt;

      // Update active state
      const siblings = colorButton.parentElement.querySelectorAll('.color-option');
      siblings.forEach(btn => btn.classList.remove('active'));
      colorButton.classList.add('active');

      // Update primary image
      if (imageSrc) {
        const primaryImage = document.querySelector(
          `.card-wrapper[data-product-handle] .primary-image`
        );
        
        const cardWrapper = colorButton.closest('.card-wrapper');
        if (cardWrapper) {
          const img = cardWrapper.querySelector('.primary-image');
          if (img) {
            img.src = imageSrc;
            if (imageAlt) {
              img.alt = imageAlt;
            }
          }
        }
      }

      // Update all product links with new variant
      const cardWrapper = colorButton.closest('.card-wrapper');
      if (cardWrapper) {
        const links = cardWrapper.querySelectorAll('a[href*="/products/"]');
        links.forEach(link => {
          const url = new URL(link.href, window.location.origin);
          url.searchParams.set('variant', variantId);
          link.href = url.toString();
        });
      }
    });
  }

  /**
   * Initialize all optimizations
   */
  function init() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        initLazyDiscounts();
        initIconCarousels();
        initColorVariants();
      }, { timeout: 2000 });
    } else {
      setTimeout(() => {
        initLazyDiscounts();
        initIconCarousels();
        initColorVariants();
      }, 100);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Reinitialize on AJAX page updates
  document.addEventListener('shopify:section:load', init);

})();
