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

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && engravingDrawer.classList.contains('active')) {
    closeEngravingDrawer();
  }
});


const drawer = document.getElementById('variant-drawer');
const overlay = document.getElementById('drawer-overlay');
document.addEventListener('click', function(e) {
  if (e.target.closest('#product_variant_drawer')) {
    openDrawer();
  }
});

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
          creative_name: "Customize Button Clicked",
          location_id:"PDP"
        }
      });
    });
  }
});


// pdp-delivery-details
function luciraLocateMe() {
  const submitBtn = document.querySelector("#pdp-delivery-check .submitButton");
  const pincodeInput = document.getElementById("lucira-delivery-zipcode");

  // Show loading state
  submitBtn.innerHTML = "Locating...";
  submitBtn.disabled = true;

  if (navigator.geolocation) {
    // Force fresh and accurate location
    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&timestamp=${Date.now()}`;

        fetch(url)
          .then((response) => response.json())
          .then((data) => {
            if (data.address && data.address.postcode) {
              pincodeInput.value = data.address.postcode;

              // Trigger input event to update button to Submit
              pincodeInput.dispatchEvent(new Event("input", { bubbles: true }));

              // Push GA4 event
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({
                event: "promoClick",
                promoClick: {
                  creative_name:"Locate Me Clicked",
                  location_id:"Pdp"
                }
              });
            } else {
              alert("Pincode not found for your location.");
              resetToLocateMe();
            }
          })
          .catch((error) => {
            console.error("Error fetching pincode:", error);
            alert("Error fetching pincode. Please try again.");
            resetToLocateMe();
          });
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to retrieve location. Please allow location access.");
        resetToLocateMe();
      },
      geoOptions
    );
  } else {
    alert("Geolocation is not supported by this browser.");
    resetToLocateMe();
  }

  // helper function to reset button back to "Locate Me"
  function resetToLocateMe() {
    submitBtn.innerHTML = `
      <svg width="16" height="16" class="icon icon-locate">
        <use xlink:href="#icon-locate"></use>
      </svg> Locate Me
    `;
    submitBtn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const content = document.getElementById("readMoreContent");
  const btn = document.getElementById("readMoreBtn");

  if (!content || !btn) return;

  const lineHeight = parseFloat(window.getComputedStyle(content).lineHeight);
  const maxHeight = lineHeight * 2;
  
  const clone = content.cloneNode(true);
  clone.style.display = 'block';
  clone.style.webkitLineClamp = 'unset';
  clone.style.position = 'absolute';
  clone.style.visibility = 'hidden';
  content.parentElement.appendChild(clone);
  
  const fullHeight = clone.offsetHeight;
  content.parentElement.removeChild(clone);

  if (fullHeight <= maxHeight) {
    btn.style.display = 'none';
    content.classList.remove('collapsed');
    return;
  }

  btn.addEventListener("click", function () {
    const isCollapsed = content.classList.toggle("collapsed");
    btn.textContent = isCollapsed ? "Read More" : "Read Less";
    
    if (!isCollapsed) {
      btn.style.display = 'inline-block';
      btn.style.marginLeft = '0';
      btn.style.marginTop = '0';
    } else {
      btn.style.display = 'inline';
      btn.style.marginLeft = '0';
      btn.style.marginTop = '0';
    }
  });
});

document.addEventListener('DOMContentLoaded', function() {
  const copyButton = document.getElementById('sku-copy-button');
  const skuContent = document.getElementById('sku-content');
  
  copyButton.addEventListener('click', function() {
    // Get the SKU text (remove "SKU: " prefix)
    const skuText = skuContent.textContent.replace('SKU: ', '');
    
    // Copy to clipboard
    navigator.clipboard.writeText(skuText).then(function() {
      // Get both SVG icons
      const copyIcon = copyButton.querySelector('svg:not(.check-icon)');
      const checkIcon = copyButton.querySelector('.check-icon');
      
      // Hide copy icon, show check icon
      copyIcon.style.display = 'none';
      checkIcon.style.display = 'block';
      
      // Revert back to copy icon after 2 seconds
      setTimeout(function() {
        copyIcon.style.display = 'block';
        checkIcon.style.display = 'none';
      }, 2000);
    }).catch(function(err) {
      console.error('Failed to copy SKU: ', err);
    });
  });
});

(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const animatedButton = document.querySelector('.animated-cart-btn');

    if (!animatedButton) return;

    const form = animatedButton.closest('form');

    if (form) {
      form.addEventListener('submit', function (e) {
        if (animatedButton.disabled || animatedButton.classList.contains('cart-animating')) return;

        // Add animation class - CSS will handle showing/hiding icons
        animatedButton.classList.add('cart-animating');

        // Reset animation after complete
        setTimeout(function () {
          animatedButton.classList.remove('cart-animating');
        }, 2000);
      });
    }
  });
 })();