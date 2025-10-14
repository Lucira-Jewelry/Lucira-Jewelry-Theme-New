if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.variantIdInput.disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton.querySelector('span');

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        if (window.cartAddInProgress) {
          console.log('Cart add already in progress from product form');
          return;
        }

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading__spinner').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButtonText.classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            const startMarker = CartPerformance.createStartingMarker('add:wait-for-subscribers');
            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              }).then(() => {
                CartPerformance.measureFromMarker('add:wait-for-subscribers', startMarker);
              });
            this.error = false;
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    CartPerformance.measure("add:paint-updated-sections", () => {
                      this.cart.renderContents(response);
                    });
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              CartPerformance.measure("add:paint-updated-sections", () => {
                this.cart.renderContents(response);
              });
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading__spinner').classList.add('hidden');

            CartPerformance.measureFromEvent("add:user-action", evt);
            
            // Reset flag after operation completes
            setTimeout(() => {
              window.cartAddInProgress = false;
            }, 500);
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled');
          if (text) this.submitButtonText.textContent = text;
        } else {
          this.submitButton.removeAttribute('disabled');
          this.submitButtonText.textContent = window.variantStrings.addToCart;
        }
      }

      get variantIdInput() {
        return this.form.querySelector('[name=id]');
      }
    }
  );
}

function openDrawer() {
  drawer.classList.add('active');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  drawer.classList.remove('active');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

const sizeDrawer = document.getElementById('size-drawer');
const sizeOverlay = document.getElementById('size-drawer-overlay');

function openSizeDrawer() {
  sizeDrawer.classList.add('active');
  sizeOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSizeDrawer() {
  sizeDrawer.classList.remove('active');
  sizeOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// Open drawer button
document.addEventListener('click', function(e) {
  if (e.target.closest('#size_drawer')) {
    openSizeDrawer();
  }
});

// Close drawer buttons (X button or Customize button inside)
document.addEventListener('click', function(e) {
  if (
    e.target.closest('#close-size-button') ||
    e.target.closest('#size-drawer-overlay')
  ) {
    closeSizeDrawer();
  }
});

// Escape key support
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && drawer.classList.contains('active')) {
    closeSizeDrawer();
  }
});

const engravingDrawer = document.getElementById('engraving-drawer');
const engravingOverlay = document.getElementById('engraving-drawer-overlay');

function openEngravingDrawer() {
  engravingDrawer.classList.add('active');
  engravingOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeEngravingDrawer() {
  engravingDrawer.classList.remove('active');
  engravingOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// Open drawer button
document.addEventListener('click', function(e) {
  if (e.target.closest('#engraving_drawer')) {
    openEngravingDrawer();
  }
});

// Close drawer buttons (X button or overlay click)
document.addEventListener('click', function(e) {
  if (
    e.target.closest('#close-engraving-button') ||
    e.target.closest('#engraving-drawer-overlay')
  ) {
    closeEngravingDrawer();
  }
});

// Escape key support
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && engravingDrawer.classList.contains('active')) {
    closeEngravingDrawer();
  }
});


const priceDrawer = document.getElementById('price-drawer');
const priceOverlay = document.getElementById('price-drawer-overlay');

function openPriceDrawer() {
  priceDrawer.classList.add('active');
  priceOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closePriceDrawer() {
  priceDrawer.classList.remove('active');
  priceOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// Open drawer button
document.addEventListener('click', function(e) {
  if (e.target.closest('#price-breakup-button')) {
    openPriceDrawer();
  }
});

// Close drawer buttons (X button or Customize button inside)
document.addEventListener('click', function(e) {
  if (
    e.target.closest('#close-price-button') ||
    e.target.closest('#price-drawer-overlay')
  ) {
    closePriceDrawer();
  }
});

// Escape key support
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && drawer.classList.contains('active')) {
    closePriceDrawer();
  }
});


const drawer = document.getElementById('variant-drawer');
const overlay = document.getElementById('drawer-overlay');
// Open drawer button
document.addEventListener('click', function(e) {
  if (e.target.closest('#product_variant_drawer')) {
    openDrawer();
  }
});

// Close drawer buttons (X button or Customize button inside)
document.addEventListener('click', function(e) {
  if (
    e.target.closest('#close-drawer') ||
    e.target.closest('#customize_close_drawer') ||
    e.target.closest('#drawer-overlay')
  ) {
    closeDrawer();
  }
});

(function () {
  if (!window.ShopifyIconCarousel) {
    window.ShopifyIconCarousel = class {
      constructor(container) {
        this.container = container;
        this.textContent = this.container.querySelector('.text-content');
        this.icons = Array.from(this.container.querySelectorAll('.icon'));
        this.currentIndex = 0;
        this.isAnimating = false;
        this.productId = this.container.dataset.productId;
        this.items = [];
        this.widthCache = {};
        this.isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 768;
        this.hasBeenViewed = false;

        this.icons.forEach((icon, i) => {
          const tagType = icon.dataset.tagType || `tag-${i}`;
          this.items.push({ iconClass: `.tag-icon-${i}`, text: icon.alt || `Tag ${i+1}`, tagType });
        });

        if (this.items.length > 0) this.init();
      }

      async init() {
        await this.waitForDOMReady();
        this.preCalculateWidths();
        this.setInitialState();
        this.setupScrollObserver();
        this.setupInteraction();
      }

      waitForDOMReady() {
        return new Promise(resolve => {
          if (document.readyState === 'complete') resolve();
          else window.addEventListener('load', resolve, { once: true });
        });
      }

      preCalculateWidths() {
        const measurer = document.createElement('div');
        measurer.className = 'text-measurer';
        document.body.appendChild(measurer);

        this.items.forEach((item, i) => {
          measurer.textContent = item.text;
          measurer.offsetWidth; // force reflow
          this.widthCache[i] = 36 + 7 + measurer.offsetWidth + 6 + 3; // icon + margin + text + padding + extra
        });

        document.body.removeChild(measurer);
      }

      setInitialState() {
        const width = this.widthCache[0] || 50;
        this.container.style.setProperty('--dynamic-width', width + 'px');
        this.icons[0].classList.add('active');
        this.textContent.textContent = this.items[0].text;
      }

      setupScrollObserver() {
        const observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting && !this.hasBeenViewed) {
              this.hasBeenViewed = true;
              this.startAnimation();
            }
          });
        }, { threshold: 0.5, rootMargin: '0px 0px -50px 0px' });

        observer.observe(this.container);
      }

      setupInteraction() {
        if (this.isMobile) {
          this.container.addEventListener('click', () => this.toggleMobile());
        } else {
          this.container.addEventListener('mouseenter', () => this.expandContainer());
          this.container.addEventListener('mouseleave', () => this.collapseContainer());
        }
      }

      expandContainer() {
        if (this.isAnimating) return;
        const width = this.widthCache[this.currentIndex];
        this.container.style.setProperty('--dynamic-width', width + 'px');
        this.container.classList.add('expanded');
      }

      collapseContainer() {
        if (this.isAnimating) return;
        this.container.classList.remove('expanded');
        if (this.items.length > 1) setTimeout(() => this.nextItem(), 150);
      }

      toggleMobile() {
        if (this.isAnimating) return;
        if (!this.container.classList.contains('expanded')) {
          this.expandContainer();
          setTimeout(() => this.collapseContainer(), 2500);
        } else this.nextItem();
      }

      async nextItem() {
        const nextIndex = (this.currentIndex + 1) % this.items.length;
        await this.switchIcon(nextIndex);
        this.currentIndex = nextIndex;
      }

      async switchIcon(newIndex) {
        if (this.items.length <= 1) return;

        const current = this.icons[this.currentIndex];
        const next = this.icons[newIndex];
        if (!current || !next) return;

        this.textContent.textContent = this.items[newIndex].text;
        const width = this.widthCache[newIndex];
        this.container.style.setProperty('--dynamic-width', width + 'px');

        current.classList.remove('active');
        current.classList.add('exit');
        await this.wait(100);
        current.classList.remove('exit');

        next.classList.add('active', 'enter');
        setTimeout(() => next.classList.remove('enter'), 200);
      }

      async startAnimation() {
        let index = 0;
        const maxCycles = Math.max(2, this.items.length * 2);
        for (let count = 0; count < maxCycles; count++) {
          await this.animateItem(index);
          index = (index + 1) % this.items.length;
        }
      }

      async animateItem(index) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.container.classList.add('animating');
        await this.switchIcon(index);
        const width = this.widthCache[index];
        this.container.style.setProperty('--dynamic-width', width + 'px');
        this.container.classList.add('expanded');
        await this.wait(2000);
        this.container.classList.remove('expanded');
        await this.wait(400);
        this.container.classList.remove('animating');
        this.isAnimating = false;
      }

      wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }
    };
  }

  function initCarousels() {
    document.querySelectorAll('.carousel-container').forEach(c => {
      if (!c.dataset.carouselInitialized) {
        new ShopifyIconCarousel(c);
        c.dataset.carouselInitialized = 'true';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(initCarousels, 50));
})();


// Enhanced Comparison Table Integration
class ComparisonTableManager {
  constructor(priceGuideConfig) {
    this.config = priceGuideConfig;
    this.labGrownRates = {
      'sc': 40000,
      'vvs': 32000,
      'default': 40000
    };
    
    this.numberFormatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    });
    
    this.init();
  }

  init() {
    // Update comparison table on page load
    this.updateComparisonTable(this.config.currentVariantId);
    
    // Listen for variant changes
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for variant changes from the main form
    document.addEventListener('change', (e) => {
      if (e.target.name === 'id' || e.target.classList.contains('variant-selector')) {
        const variantId = this.getCurrentVariantId();
        this.updateComparisonTable(variantId);
      }
    });

    // Listen for URL changes (for variant parameter updates)
    window.addEventListener('popstate', () => {
      const variantId = this.getCurrentVariantId();
      this.updateComparisonTable(variantId);
    });
  }

  getCurrentVariantId() {
    const url = new URL(window.location);
    return url.searchParams.get("variant") || this.config.currentVariantId;
  }

  updateComparisonTable(variantId) {
    try {
      const variantConfig = this.config.variantConfigs[variantId];
      if (!variantConfig) {
        console.warn('[Comparison Table] No configuration found for variant:', variantId);
        return;
      }

      // Calculate diamond data
      const diamondData = this.calculateDiamondComparison(variantConfig);
      
      // Update comparison table elements
      this.renderComparisonTable(diamondData);
      
      console.log('[Comparison Table] Updated for variant:', variantId, diamondData);
      
    } catch (error) {
      console.error('[Comparison Table] Error updating comparison:', error);
    }
  }

  calculateDiamondComparison(variantConfig) {
    if (!variantConfig.advanced_stone_config) {
      return {
        totalWeight: 0,
        minedPrice: 0,
        labGrownPrice: 0,
        savings: 0
      };
    }

    let totalWeight = 0;
    let totalMinedPrice = 0;
    let totalLabGrownPrice = 0;

    // Filter for diamond stones only
    const diamondStones = variantConfig.advanced_stone_config.filter(
      stone => stone.stone_type.toLowerCase() === 'diamond'
    );

    for (const stoneConfig of diamondStones) {
      try {
        // Get stone pricing slab
        const { slab, title } = this.fetchStonePricingSlab(stoneConfig);
        if (!slab) continue;

        const stoneWeight = parseFloat(stoneConfig.stone_weight) || 0;
        const stoneQuantity = parseInt(stoneConfig.stone_quantity) || 1;
        
        // Calculate per piece weight for mined diamond rate
        const perPieceWeight = stoneWeight / stoneQuantity;
        
        // Calculate mined diamond price using the existing rate structure
        // Use the original slab price (not the discounted rate from price breakdown)
        const minedRate = this.getMinedDiamondRate(perPieceWeight);
        const minedPrice = minedRate * stoneWeight;
        
        // For comparison table, we don't apply discounts to show true market comparison

        // Calculate lab grown price
        const labGrownRate = this.getLabGrownRate(title);
        const labGrownPrice = labGrownRate * stoneWeight;

        totalWeight += stoneWeight;
        totalMinedPrice += minedPrice;
        totalLabGrownPrice += labGrownPrice;

        console.log(`Diamond: ${title}, Weight: ${stoneWeight} Ct, Mined: ${this.formatCurrency(minedPrice)}, Lab Grown: ${this.formatCurrency(labGrownPrice)}`);

      } catch (error) {
        console.warn('Error calculating diamond comparison:', error);
      }
    }

    const savings = Math.max(0, totalMinedPrice - totalLabGrownPrice);

    return {
      totalWeight,
      minedPrice: totalMinedPrice,
      labGrownPrice: totalLabGrownPrice,
      savings
    };
  }

  getMinedDiamondRate(caratWeight) {
    // Rate structure from your original comparison table script
    if (caratWeight <= 0.109) return 86800;
    else if (caratWeight <= 0.249) return 97020;
    else if (caratWeight <= 0.499) return 114917;
    else if (caratWeight <= 0.749) return 74266;
    else if (caratWeight <= 0.999) return 89373;
    else if (caratWeight <= 1.499) return 126906;
    else if (caratWeight <= 1.999) return 179840;
    else if (caratWeight <= 2.999) return 301515;
    else return 395589;
  }

  getLabGrownRate(diamondDetails) {
    const details = diamondDetails.toLowerCase();
    if (details.includes('sc')) {
      return this.labGrownRates.sc;
    } else if (details.includes('vvs')) {
      return this.labGrownRates.vvs;
    }
    return this.labGrownRates.default;
  }

  fetchStonePricingSlab(stoneConfig) {
    const perStoneWeight = (+stoneConfig.stone_weight) / (+stoneConfig.stone_quantity);

    for (const shopStonePricing of this.config.shopStonePricings) {
      if (shopStonePricing.id != stoneConfig.pricing_id) continue;

      for (const slab of shopStonePricing.slabs) {
        if (perStoneWeight >= slab.from_weight && perStoneWeight <= slab.to_weight) {
          return { slab: slab, title: shopStonePricing.title };
        }
      }
    }

    throw new Error(`Slab not found for stone weight: ${perStoneWeight.toFixed(4)} carat (Pricing ID: ${stoneConfig.pricing_id})`);
  }

  renderComparisonTable(diamondData) {
    // Update carat weight values
    const labGrownWeight = document.querySelector('.carate-weight-value-1');
    const minedWeight = document.querySelector('.carate-weight-value-2');
    
    if (labGrownWeight) {
      labGrownWeight.textContent = `${diamondData.totalWeight.toFixed(2)}`;
    }
    if (minedWeight) {
      minedWeight.textContent = `${diamondData.totalWeight.toFixed(2)}`;
    }

    // Update price values
    const labGrownPrice = document.querySelector('.caret-weight-price-1');
    const minedPrice = document.querySelector('.caret-weight-price-2');
    
    if (labGrownPrice) {
      labGrownPrice.textContent = this.formatCurrency(diamondData.labGrownPrice);
    }
    if (minedPrice) {
      minedPrice.textContent = this.formatCurrency(diamondData.minedPrice);
    }

    // Update savings
    const savingsElement = document.querySelector('.Total-saving-price');
    if (savingsElement) {
      savingsElement.textContent = this.formatCurrency(diamondData.savings);
      
      // Add visual indicator for savings
      if (diamondData.savings > 0) {
        savingsElement.classList.add('green');
        savingsElement.classList.remove('red');
      } else {
        savingsElement.classList.add('red');
        savingsElement.classList.remove('green');
      }
    }
  }

  formatCurrency(price) {
    return this.numberFormatter.format(price);
  }
}

// Integration with existing PriceGuideManager
if (typeof PriceGuideConfig !== 'undefined') {
  // Initialize comparison table manager
  let comparisonManager = null;

  function initializeComparisonTable() {
    if (!comparisonManager) {
      comparisonManager = new ComparisonTableManager(PriceGuideConfig);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeComparisonTable);
  } else {
    initializeComparisonTable();
  }

  // If PriceGuideManager exists, integrate with it
  if (typeof PriceGuideManager !== 'undefined') {
    const originalUpdatePriceBreakdown = PriceGuideManager.prototype.updatePriceBreakdown;
    
    PriceGuideManager.prototype.updatePriceBreakdown = function(variantId) {
      // Call original method
      originalUpdatePriceBreakdown.call(this, variantId);
      
      // Update comparison table
      if (comparisonManager) {
        comparisonManager.updateComparisonTable(variantId);
      }
    };
  }
} else {
  console.warn('[Comparison Table] PriceGuideConfig not found. Make sure the price breakdown script is loaded first.');
}

// Fallback initialization for cases where PriceGuideConfig is available but not immediately
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    if (typeof PriceGuideConfig !== 'undefined' && !window.comparisonManager) {
      window.comparisonManager = new ComparisonTableManager(PriceGuideConfig);
    }
  }, 100);
});

function luciraLocateMe() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;

        fetch(url)
          .then((response) => response.json())
          .then((data) => {
            if (data.address && data.address.postcode) {
              document.getElementById("lucira-delivery-zipcode").value =
                data.address.postcode;

              document
                .getElementById("lucira-delivery-zipcode")
                .dispatchEvent(new Event("input", { bubbles: true }));
            } else {
              alert("Pincode not found for your location.");
            }
          })
          .catch((error) => console.error("Error fetching pincode:", error));
      },
      (error) => {
        alert("Unable to retrieve location. Please allow location access.");
      }
    );
  } else {
    alert("Geolocation is not supported by this browser.");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const container = document.querySelector("#pdp-delivery-check");
  if (!container) return;

  const submitBtn = container.querySelector(".lucira-delivery-input-container button");
  const pincodeInput = document.querySelector("#lucira-delivery-zipcode");

  const deliveryDays = Number(container.getAttribute("data-delivery-days")) || 4;
  const productSku = container.getAttribute("data-product-sku");
  const productTitle = container.getAttribute("data-product-title");

  if (pincodeInput) {
    pincodeInput.addEventListener("input", () => {
      submitBtn.disabled = pincodeInput.value.trim().length === 0;
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", function () {
      const pincode = pincodeInput?.value?.trim();
      if (!pincode || submitBtn.disabled) return;

      // Push to GTM
      const productData = {
        promo_id: productSku,
        promo_name: productTitle,
        creative_name: "pincodeEntered",
        promo_position: pincode,
        pincode: pincode
      };

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "promoClick",
        promoClick: productData
      });

      // Add +2 buffer days
      const totalDays = deliveryDays + 2;

      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + totalDays);

      const formattedDate = deliveryDate.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });

      const deliveryTextElement = document.querySelector(".lucira-delivery-time");
      if (deliveryTextElement) {
        deliveryTextElement.innerHTML = `Expected Delivery By <span style="color:#147217;font-weight:600;">${formattedDate}</span>`;
      }

      const deliveryHint = document.querySelector(".lucira-delivery-text");
      if (deliveryHint) deliveryHint.style.display = "none";
    });
  }
});

(function() {
  const passportDrawer = document.getElementById('product-passport-drawer');
  const passportOverlay = document.getElementById('passport-overlay');
  const passportOpenBtn = document.getElementById('trace-badge');
  const passportCloseBtn = passportDrawer.querySelector('.close-drawer');

  function openPassportDrawer() {
    passportDrawer.classList.add('active');
    passportOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // prevent background scroll
  }

  function closePassportDrawer() {
    passportDrawer.classList.remove('active');
    passportOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // open
  passportOpenBtn.addEventListener('click', openPassportDrawer);

  // close
  passportCloseBtn.addEventListener('click', closePassportDrawer);
  passportOverlay.addEventListener('click', closePassportDrawer);

  // escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && passportDrawer.classList.contains('active')) {
      closePassportDrawer();
    }
  });
})();

document.addEventListener("DOMContentLoaded", function () {
  initEngraving();
});

function initEngraving() {
  const engravingInput = document.getElementById("lucira_engraving_text");
  const previewText = document.getElementById("engraving-preview-text");
  const fontOptions = document.querySelectorAll(".lucira_engraving_font_option");
  const saveButton = document.getElementById("product_engraving_confirm_submit");
  const savedWrapper = document.getElementById("engraving-saved-wrapper");
  const closeButton = document.getElementById("close-engraving-button");
  const overlay = document.getElementById("engraving-drawer-overlay");

  if (!engravingInput || !previewText || !fontOptions.length) {
    console.warn('Engraving elements not found');
    return;
  }

  // Get main product form
  const mainForm = document.querySelector('form[data-type="add-to-cart-form"]') || 
                   document.querySelector('form[action*="/cart/add"]') ||
                   engravingInput.closest('form');

  // Create or get hidden inputs
  let fontInput = mainForm?.querySelector('input[name="properties[EngravingFont]"]');
  let textInput = mainForm?.querySelector('input[name="properties[EngravingText]"]');

  if (mainForm && !fontInput) {
    fontInput = document.createElement("input");
    fontInput.type = "hidden";
    fontInput.name = "properties[EngravingFont]";
    fontInput.id = "hidden-engraving-font";
    mainForm.appendChild(fontInput);
  }

  if (mainForm && !textInput) {
    textInput = document.createElement("input");
    textInput.type = "hidden";
    textInput.name = "properties[EngravingText]";
    textInput.id = "hidden-engraving-text";
    mainForm.appendChild(textInput);
  }

  const allowedChars = /^[A-Za-z0-9❤∞]*$/;

  // Set default font from active option
  const activeOption = document.querySelector(".lucira_engraving_font_option.active");
  if (activeOption) {
    const defaultFont = activeOption.dataset.font;
    previewText.style.fontFamily = defaultFont;
    if (fontInput) fontInput.value = defaultFont;
  }

  // Update save button state
  function toggleSaveButton() {
    const engravingValue = engravingInput?.value.trim();
    const selectedFont = document.querySelector(".lucira_engraving_font_option.active")?.dataset.font || "";
    if (engravingValue && selectedFont) {
      saveButton.disabled = false;
    } else {
      saveButton.disabled = true;
    }
  }

  // Update preview & hidden inputs on input
  engravingInput.addEventListener("input", function () {
    if (!allowedChars.test(this.value)) {
      this.value = this.value.split('').filter(c => allowedChars.test(c)).join('');
    }
    if (this.value.length > 8) this.value = this.value.slice(0, 8);
    previewText.textContent = this.value;
    if (textInput) textInput.value = this.value;
    toggleSaveButton();
  });

  // Symbol insertion
  function insertAtCursor(input, text) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.slice(0, start) + text + input.value.slice(end);
    input.setSelectionRange(start + text.length, start + text.length);
    input.focus();
    input.dispatchEvent(new Event("input"));
  }

  window.EngravingAddSymbol = function(symbol) {
    if (engravingInput.value.length + symbol.length <= 8) {
      insertAtCursor(engravingInput, symbol);
    } else {
      alert('Maximum 8 characters reached');
    }
  };
  window.ProductEngravAddSymbol = window.EngravingAddSymbol;

  // Font selection
  fontOptions.forEach(option => {
    option.addEventListener("click", () => {
      fontOptions.forEach(opt => opt.classList.remove("active"));
      option.classList.add("active");
      const font = option.dataset.font;
      previewText.style.fontFamily = font;
      if (fontInput) fontInput.value = font;
      toggleSaveButton();
    });
  });

  // Save button functionality
  if (saveButton) {
    saveButton.addEventListener("click", e => {
      e.preventDefault();
      const engravingValue = engravingInput.value.trim();
      const selectedFont = document.querySelector(".lucira_engraving_font_option.active")?.dataset.font || "";

      if (!engravingValue || !selectedFont) {
        alert("Please enter engraving text and choose a font before saving.");
        return;
      }

      if (textInput) textInput.value = engravingValue;
      if (fontInput) fontInput.value = selectedFont;

      if (savedWrapper) {
        savedWrapper.style.display = "flex";
        savedWrapper.innerHTML = `
          <p><strong>Saved Engraving:</strong></p>
          <div style="font-family: ${selectedFont}; font-size:14px; margin-top:0px;">
            ${engravingValue}
          </div>
        `;
      }

      saveButton.textContent = "Saved ✓";
      setTimeout(() => {
        saveButton.textContent = "SAVE";
        closeEngravingDrawer();
      }, 2000);
    });
  }

  // Drawer open/close
  window.openEngravingDrawer = function() {
    const drawer = document.getElementById("engraving-drawer");
    if (drawer && overlay) {
      drawer.classList.add("active");
      overlay.classList.add("active");
    }
  };

  function closeEngravingDrawer() {
    const drawer = document.getElementById("engraving-drawer");
    if (drawer && overlay) {
      drawer.classList.remove("active");
      overlay.classList.remove("active");
    }
  }

  if (closeButton) closeButton.addEventListener("click", closeEngravingDrawer);
  if (overlay) overlay.addEventListener("click", closeEngravingDrawer);

  // Load existing engraving if present
  function loadExistingEngraving() {
    if (textInput && textInput.value) {
      engravingInput.value = textInput.value;
      previewText.textContent = textInput.value;
    }
    if (fontInput && fontInput.value) {
      const fontToSelect = Array.from(fontOptions).find(opt => opt.dataset.font === fontInput.value);
      if (fontToSelect) {
        fontOptions.forEach(opt => opt.classList.remove("active"));
        fontToSelect.classList.add("active");
        previewText.style.fontFamily = fontInput.value;
      }
    }
    toggleSaveButton();
  }

  loadExistingEngraving();

  // DEBUG helper
  window.debugEngravingInputs = function() {
    console.log('=== ENGRAVING DEBUG ===');
    console.log('Visible Text:', engravingInput.value);
    console.log('Preview Text:', previewText.textContent);
    console.log('Selected Font:', document.querySelector('.lucira_engraving_font_option.active')?.dataset.font);
    console.log('Hidden Text Input:', textInput?.value);
    console.log('Hidden Font Input:', fontInput?.value);
    console.log('=====================');
  };
}




//customise button clicked datalayer
document.addEventListener("DOMContentLoaded", function () {
  var customizeBtn = document.getElementById("product_variant_drawer");

  if (customizeBtn) {
    customizeBtn.addEventListener("click", function () {
      window.dataLayer = window.dataLayer || [];

      window.dataLayer.push({
        event: "promoClick",
        promoClick: {
          creative_name: "Customize Button Clicked"
        }
      });
    });
  }
});

function share() {
  const shareData = {
    title: "Lucira",
    url: "{{ product.url }}"
  };
  const shareEventData = {
    promo_id: "{{ product.selected_or_first_available_variant.sku }}",
    promo_name: "{{ product.title }}",
    creative_name: "share",
  };
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "promoClick",
    promoClick: shareEventData
  });
  console.log("✅ Share dataLayer pushed:", shareEventData);
  // Proceed with native share if supported
  if (navigator.share) {
    navigator.share(shareData).catch((error) => {
      console.warn("Sharing failed:", error);
    });
  } else {
    console.log("Web Share API not supported.");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const stickyBar = document.getElementById("sticky-add-to-cart");
  const targetEl = document.querySelector(".small-devicePosition");

  if (!stickyBar || !targetEl) return;

  // Check if target is above the viewport
  function isElementAboveViewport(el) {
    const rect = el.getBoundingClientRect();
    return rect.bottom < 0;
  }

  // Toggle sticky bar
  function toggleStickyBar() {
    const elementAbove = isElementAboveViewport(targetEl);
    if (elementAbove) {
      stickyBar.classList.add("show");
    } else {
      stickyBar.classList.remove("show");
    }
  }

  window.addEventListener("scroll", toggleStickyBar);
});