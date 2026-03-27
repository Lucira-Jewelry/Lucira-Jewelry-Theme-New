(function() {
  'use strict';
  
  console.log('🎯 Insurance Manager v7.1 Starting...');
  
  // ==================== CONFIGURATION ====================
  const CONFIG = {
    VARIANT_ID: '47709366026458',
    CHECKBOX_ID: 'insuranceCheckbox',
    LOADER_ID: 'insuranceLoader',
    BOX_ID: 'insuranceBox',
    MAX_RETRIES: 5,
    RETRY_DELAY: 400
  };
  
  // ==================== STATE ====================
  const state = {
    processing: false,
    initialized: false,
    currentCart: null,
    removalInProgress: false,
    handlingLastProductRemoval: false,
    insurancePrice: null
  };
  
  // ==================== UTILITIES ====================
  
  const log = (emoji, ...args) => console.log(emoji, '[Insurance]', ...args);
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const formatMoney = (cents) => '₹' + Math.round(cents / 100).toLocaleString('en-IN');
  
  const getElements = () => ({
    checkbox: document.getElementById(CONFIG.CHECKBOX_ID),
    loader: document.getElementById(CONFIG.LOADER_ID),
    box: document.getElementById(CONFIG.BOX_ID)
  });
  
  // ==================== PRICE FETCHING ====================
  
  async function fetchInsurancePrice() {
    if (state.insurancePrice !== null) return state.insurancePrice;
    
    try {
      log('💰', 'Fetching insurance price...');
      const response = await fetch(`/products/${CONFIG.VARIANT_ID}.js`);
      
      if (!response.ok) {
        const cart = await fetch('/cart.js').then(r => r.json());
        const insuranceItem = cart.items.find(item => 
          String(item.variant_id) === CONFIG.VARIANT_ID
        );
        
        if (insuranceItem) {
          state.insurancePrice = insuranceItem.price;
          log('✅', 'Price from cart:', formatMoney(state.insurancePrice));
          return state.insurancePrice;
        }
        throw new Error('Unable to fetch price');
      }
      
      const data = await response.json();
      state.insurancePrice = data.price;
      log('✅', 'Price from variant:', formatMoney(state.insurancePrice));
      return state.insurancePrice;
    } catch (error) {
      log('❌', 'Price fetch error:', error);
      state.insurancePrice = 100;
      return state.insurancePrice;
    }
  }

 // ==================== OVERLAY SYSTEM ====================

  function createOverlay() {
    let overlay = document.getElementById('insurance-removal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'insurance-removal-overlay';
      overlay.innerHTML = `
        <div class="insurance-overlay-content">
          <div class="insurance-loader-animation">
            <div class="insurance-dot"></div>
            <div class="insurance-dot"></div>
            <div class="insurance-dot"></div>
          </div>
          <p class="insurance-overlay-text">Removing Product's From your cart...</p>
        </div>
      `;
      
      const style = document.createElement('style');
      style.textContent = `
        #insurance-removal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(8px);
          z-index: 10000;
          display: none;
          align-items: center;
          justify-content: center;
        }
        
        .insurance-overlay-content {
          text-align: center;
          padding: 0;
        }
        
        .insurance-loader-animation {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        
        .insurance-dot {
          width: 12px;
          height: 12px;
          background: #1a1a1a;
          border-radius: 50%;
          animation: insurance-bounce 1.4s infinite ease-in-out both;
        }
        
        .insurance-dot:nth-child(1) {
          animation-delay: -0.32s;
        }
        
        .insurance-dot:nth-child(2) {
          animation-delay: -0.16s;
        }
        
        .insurance-overlay-text {
          margin: 0;
          font-size: 18px;
          font-weight: 500;
          color: #1a1a1a;
          letter-spacing: 0.3px;
        }
        
        @keyframes insurance-bounce {
          0%, 80%, 100% { 
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% { 
            transform: scale(1.2);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
      
      // Append to drawer__inner instead of body
      const drawerInner = document.querySelector('.drawer__inner');
      if (drawerInner) {
        // Make sure drawer__inner has position relative
        if (getComputedStyle(drawerInner).position === 'static') {
          drawerInner.style.position = 'relative';
        }
        drawerInner.appendChild(overlay);
      } else {
        // Fallback to body if drawer__inner not found
        document.body.appendChild(overlay);
      }
    }
    return overlay;
  }

  function showOverlay() {
    const overlay = createOverlay();
    overlay.style.display = 'flex';
    
    // Prevent interactions with drawer content
    const drawerInner = document.querySelector('.drawer__inner');
    if (drawerInner) {
      drawerInner.style.pointerEvents = 'none';
      overlay.style.pointerEvents = 'auto';
    }
  }

  function hideOverlay() {
    const overlay = document.getElementById('insurance-removal-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    
    // Re-enable interactions
    const drawerInner = document.querySelector('.drawer__inner');
    if (drawerInner) {
      drawerInner.style.pointerEvents = '';
    }
  }

  function showLoader(show) {
    const { loader, box } = getElements();
    if (loader) loader.classList.toggle('active', show);
    if (box) box.classList.toggle('updating', show);
  }
  
  function setCheckbox(checked, silent = false) {
    const { checkbox } = getElements();
    if (checkbox && checkbox.checked !== checked) {
      if (silent) {
        checkbox.removeEventListener('change', handleCheckboxChange);
        checkbox.checked = checked;
        setTimeout(() => checkbox.addEventListener('change', handleCheckboxChange), 0);
      } else {
        checkbox.checked = checked;
      }
    }
  }
  
  // ==================== CART OPERATIONS ====================
  
  async function getCart() {
    try {
      const response = await fetch('/cart.js', {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('Failed to fetch cart');
      const cart = await response.json();
      state.currentCart = cart;
      return cart;
    } catch (error) {
      log('❌', 'Cart fetch error:', error);
      return null;
    }
  }
  
  const hasInsurance = (cartData) => 
    cartData?.items?.some(item => String(item.variant_id) === CONFIG.VARIANT_ID) || false;
  
  const getInsuranceQuantity = (cartData) => 
    cartData?.items?.find(item => String(item.variant_id) === CONFIG.VARIANT_ID)?.quantity || 0;
  
  const getInsurancePrice = (cartData) => 
    cartData?.items?.find(item => String(item.variant_id) === CONFIG.VARIANT_ID)?.price 
    || state.insurancePrice || 10000;
  
  const getNonInsuranceCount = (cartData) => 
    cartData?.items?.reduce((count, item) => 
      String(item.variant_id) !== CONFIG.VARIANT_ID ? count + item.quantity : count, 0) || 0;
  
  const getTotalNonInsuranceQuantity = (cartData) => getNonInsuranceCount(cartData);
  
  async function addInsuranceToCart(quantity) {
    log('➕', `Adding ${quantity} insurance item(s)...`);
    
    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          items: [{ id: CONFIG.VARIANT_ID, quantity }]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.description || errorData.message || 'Failed to add insurance');
      }
      
      const result = await response.json();
      log('✅', 'Insurance added');
      
      const insuranceItem = result.items?.find(item => String(item.variant_id) === CONFIG.VARIANT_ID);
      if (insuranceItem?.price) state.insurancePrice = insuranceItem.price;
      
      return result;
    } catch (error) {
      log('❌', 'Add error:', error);
      throw error;
    }
  }
  
  async function updateInsuranceQuantity(quantity) {
    log('🔄', `Updating insurance to ${quantity}...`);
    
    try {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          id: CONFIG.VARIANT_ID,
          quantity
        })
      });
      
      if (!response.ok) throw new Error('Failed to update quantity');
      
      const result = await response.json();
      log('✅', 'Quantity updated');
      return result;
    } catch (error) {
      log('❌', 'Update error:', error);
      throw error;
    }
  }
  
  async function removeInsuranceFromCart(withRetry = true) {
    log('➖', 'Removing insurance...');
    state.removalInProgress = true;
    
    try {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          id: CONFIG.VARIANT_ID,
          quantity: 0
        })
      });
      
      if (!response.ok) throw new Error('Failed to remove insurance');
      
      const result = await response.json();
      
      if (withRetry) {
        for (let i = 0; i < CONFIG.MAX_RETRIES; i++) {
          await wait(CONFIG.RETRY_DELAY);
          const verifyCart = await getCart();
          
          if (verifyCart && !hasInsurance(verifyCart)) {
            log('✅', `Verified removed (attempt ${i + 1})`);
            break;
          }
          
          if (i < CONFIG.MAX_RETRIES - 1) {
            log('⚠️', `Retry ${i + 1}/${CONFIG.MAX_RETRIES}`);
            await fetch('/cart/change.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: CONFIG.VARIANT_ID, quantity: 0 })
            });
          }
        }
      }
      
      state.removalInProgress = false;
      return result;
    } catch (error) {
      log('❌', 'Remove error:', error);
      state.removalInProgress = false;
      throw error;
    }
  }

  // Add this function to update price display in cart unnecessary function
    function updateInsurancePriceDisplay() {
      const cartItems = document.querySelectorAll('.cart-item');
      
      cartItems.forEach(item => {
        const variantIdElement = item.querySelector('[name="id"]') || item.querySelector('[data-variant-id]');
        if (!variantIdElement) return;
        
        const variantId = variantIdElement.value || variantIdElement.dataset.variantId;
        
        if (variantId === CONFIG.VARIANT_ID) {
          const quantityElement = item.querySelector('.quantity__input');
          const priceElement = item.querySelector('.cart-item__price');
          
          if (quantityElement && priceElement) {
            const quantity = parseInt(quantityElement.value);
            const unitPrice = state.insurancePrice || 10000;
            const totalPrice = unitPrice * quantity;
            
            // Update price display
            priceElement.innerHTML = `<div class="cart-item__price-wrapper">
              <span class="visually-hidden">Regular price</span>
              <span class="cart-item__price">${formatMoney(totalPrice)}</span>
            </div>`;
          }
        }
      });
    }

    // Then call this in your updateGrandTotalUI function:
    async function updateGrandTotalUI(cartData) {
      if (!cartData) return;
      
      // ... existing code ...
      
      // Add this line:
      setTimeout(updateInsurancePriceDisplay, 100);
      
      await updateInsuranceDisplay(cartData);
    }
  
  // ==================== UI UPDATES ====================
  
  async function updateInsuranceDisplay(cartData) {
    if (!cartData) return;
    
    const insurancePrice = getInsurancePrice(cartData);
    const insuranceQuantity = getInsuranceQuantity(cartData);
    const hasInsuranceInCart = hasInsurance(cartData);
    
    const { checkbox } = getElements();
    if (checkbox) {
      const label = checkbox.closest('label') || checkbox.parentElement;
      if (label) {
        const existingIndicator = label.querySelector('.insurance-quantity');
        if (existingIndicator) existingIndicator.remove();
        
        if (hasInsuranceInCart && insuranceQuantity > 0) {
          const quantitySpan = document.createElement('span');
          quantitySpan.className = 'insurance-quantity';
          quantitySpan.textContent = ` (${insuranceQuantity})`;
          quantitySpan.style.cssText = 'font-weight:400;margin-left:0px;color:#1a1a1a;display:none;';
          label.appendChild(quantitySpan);
          
          const priceElement = label.querySelector('.insurance-price');
          if (priceElement) {
            priceElement.textContent = formatMoney(insuranceQuantity * insurancePrice);
          }
        }
      }
    }
    
    await updateInsuranceSectionVisibility(cartData);
  }
  
  async function updateInsuranceSectionVisibility(cartData) {
    if (!cartData) return;
    
    const nonInsuranceCount = getNonInsuranceCount(cartData);
    const hasProducts = nonInsuranceCount > 0;
    const hasInsuranceInCart = hasInsurance(cartData);
    
    const insuranceWrapper = document.getElementById(CONFIG.BOX_ID);
    const insuranceHeader = insuranceWrapper?.previousElementSibling;
    
    if (insuranceWrapper) {
      if (hasProducts) {
        insuranceWrapper.style.display = '';
        if (insuranceHeader?.textContent.includes('APPLY INSURANCE')) {
          insuranceHeader.style.display = '';
        }
      } else {
        insuranceWrapper.style.display = 'none';
        if (insuranceHeader?.textContent.includes('APPLY INSURANCE')) {
          insuranceHeader.style.display = 'none';
        }
        
        if (hasInsuranceInCart && !state.removalInProgress) {
          log('⚠️', 'Removing orphaned insurance');
          try {
            await removeInsuranceFromCart(false);
          } catch (error) {
            log('❌', 'Auto-remove failed:', error);
          }
        }
        
        const { checkbox } = getElements();
        if (checkbox?.checked) setCheckbox(false, true);
      }
    }
  }
  
  async function updateGrandTotalUI(cartData) {
    if (!cartData) return;
    
    const grandTotalSelectors = [
      '.totals__total-value',
      '.grand-total strong',
      '.checkout-info .grand-total strong'
    ];
    
    grandTotalSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        const parent = el.closest('.totals, .grand-total, .checkout-info');
        if (parent && (parent.textContent.includes('GRAND TOTAL') || parent.textContent.includes('Grand Total'))) {
          el.textContent = formatMoney(cartData.total_price);
        }
      });
    });
    
    const itemCount = getNonInsuranceCount(cartData);
    document.querySelectorAll('.totals__total').forEach(el => {
      if (el.textContent.includes('Items')) {
        el.textContent = `Items (${itemCount})`;
      }
    });
    
    const hasInsuranceInCart = hasInsurance(cartData);
    const insuranceQuantity = getInsuranceQuantity(cartData);
    const insurancePrice = getInsurancePrice(cartData);
    
    const insuranceLineItem = document.getElementById('insurance-line-item');
    if (insuranceLineItem) {
      const insuranceValueElement = insuranceLineItem.querySelector('.totals__total-value');
      if (insuranceValueElement && hasInsuranceInCart) {
        insuranceValueElement.textContent = formatMoney(insuranceQuantity * insurancePrice);
        insuranceLineItem.style.display = 'flex';
      } else if (!hasInsuranceInCart) {
        insuranceLineItem.style.display = 'none';
      }
    }
    
    await updateInsuranceDisplay(cartData);
  }
  
  function triggerCartUpdate() {
    log('🔄', 'Triggering cart refresh...');
    
    const cartItems = document.querySelector('cart-drawer-items') || document.querySelector('cart-items');
    
    if (cartItems?.onCartUpdate) {
      cartItems.onCartUpdate().then(() => {
        getCart().then(freshCart => {
          if (freshCart) {
            updateGrandTotalUI(freshCart);
            syncCheckboxState();
          }
        });
      });
    }
  }
  
  // ==================== MAIN LOGIC ====================
  
  async function handleAdd() {
    if (state.processing) return;
    
    state.processing = true;
    showLoader(true);
    
    try {
      const cartData = await getCart();
      if (!cartData) throw new Error('Unable to fetch cart');
      
      const totalNonInsuranceQuantity = getTotalNonInsuranceQuantity(cartData);
      
      if (totalNonInsuranceQuantity === 0) {
        setCheckbox(false, true);
        return;
      }
      
      if (hasInsurance(cartData)) {
        const currentInsuranceQuantity = getInsuranceQuantity(cartData);
        if (currentInsuranceQuantity !== totalNonInsuranceQuantity) {
          await updateInsuranceQuantity(totalNonInsuranceQuantity);
        }
      } else {
        await addInsuranceToCart(totalNonInsuranceQuantity);
      }
      
      await wait(200);
      const freshCart = await getCart();
      if (freshCart) updateGrandTotalUI(freshCart);
      
      triggerCartUpdate();
      
    } catch (error) {
      log('❌', 'Failed to add/update:', error);
      setCheckbox(false, true);
    } finally {
      state.processing = false;
      showLoader(false);
    }
  }
  
  async function handleRemove() {
    if (state.processing) return;
    
    state.processing = true;
    showLoader(true);
    
    try {
      await removeInsuranceFromCart();
      
      await wait(200);
      const freshCart = await getCart();
      if (freshCart) updateGrandTotalUI(freshCart);
      
      triggerCartUpdate();
      
    } catch (error) {
      log('❌', 'Failed to remove:', error);
      setCheckbox(true, true);
    } finally {
      state.processing = false;
      showLoader(false);
    }
  }
  
  async function syncCheckboxState() {
    try {
      const cartData = await getCart();
      if (!cartData) return;
      
      const has = hasInsurance(cartData);
      setCheckbox(has, true);
      await updateGrandTotalUI(cartData);
    } catch (error) {
      log('❌', 'Sync error:', error);
    }
  }
  
  function handleCheckboxChange(event) {
    if (state.processing) {
      event.preventDefault();
      return;
    }
    
    event.target.checked ? handleAdd() : handleRemove();
  }
  
  // ==================== QUANTITY SYNC ====================
  
  async function syncInsuranceWithProducts() {
    if (state.processing || state.removalInProgress || state.handlingLastProductRemoval) return;
    
    try {
      const cartData = await getCart();
      if (!cartData) return;
      
      const hasInsuranceInCart = hasInsurance(cartData);
      const totalNonInsuranceQuantity = getTotalNonInsuranceQuantity(cartData);
      const currentInsuranceQuantity = getInsuranceQuantity(cartData);
      
      if (totalNonInsuranceQuantity === 0 && hasInsuranceInCart) {
        state.processing = true;
        await removeInsuranceFromCart(false);
        state.processing = false;
        return;
      }
      
      if (!hasInsuranceInCart) return;
      
      if (currentInsuranceQuantity !== totalNonInsuranceQuantity) {
        state.processing = true;
        showLoader(true);
        
        await updateInsuranceQuantity(totalNonInsuranceQuantity);
        await wait(200);
        
        const freshCart = await getCart();
        if (freshCart) updateGrandTotalUI(freshCart);
        
        state.processing = false;
        showLoader(false);
      }
    } catch (error) {
      log('❌', 'Sync error:', error);
      state.processing = false;
      showLoader(false);
    }
  }
  
  // additional function for removing the product from - sign

  function interceptMinusWhenLastItem() {
    document.addEventListener('click', async function (event) {
      const minusBtn = event.target.closest('button[name="minus"]');
      if (!minusBtn) return;

      const quantityInput = minusBtn
        .closest('quantity-input')
        ?.querySelector('.quantity__input');

      if (!quantityInput) return;

      const currentQty = parseInt(quantityInput.value, 10);
      if (currentQty !== 1) return; // Only care about 1 → 0

      const variantId = quantityInput.dataset.quantityVariantId;
      if (variantId === CONFIG.VARIANT_ID) return;

      const cartData = await getCart();
      if (!cartData) return;

      const nonInsuranceCount = getNonInsuranceCount(cartData);
      const hasInsuranceInCart = hasInsurance(cartData);

      // If this is the LAST product + insurance exists → intercept
      if (nonInsuranceCount === 1 && hasInsuranceInCart) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        log('🚨', 'Minus on last item detected — routing via insurance-safe removal');

        state.handlingLastProductRemoval = true;
        showOverlay();

        try {
          await removeInsuranceFromCart(true);
          await wait(600);

          // Now remove product safely
          const lineIndex = quantityInput.dataset.index;
          const cartItems =
            quantityInput.closest('cart-items') ||
            quantityInput.closest('cart-drawer-items');

          if (cartItems && lineIndex) {
            await cartItems.updateQuantity(lineIndex, 0, event);
          }

          await wait(400);
          triggerCartUpdate();
        } catch (err) {
          log('❌', 'Minus intercept failed:', err);
        } finally {
          hideOverlay();
          state.handlingLastProductRemoval = false;
        }
      }
    }, true);
  }


  // ==================== CART REMOVAL INTERCEPTOR ====================
  
  function interceptCartItemRemoval() {
    document.addEventListener('click', async function(event) {
      const removeButton = event.target.closest('cart-remove-button');
      if (!removeButton || state.handlingLastProductRemoval) return;
      
      const lineIndex = removeButton.dataset.index;
      const variantId = removeButton.querySelector('button')?.dataset?.variantId;
      
      if (variantId === CONFIG.VARIANT_ID) return;
      
      const cartData = await getCart();
      if (!cartData) return;
      
      const nonInsuranceCount = getNonInsuranceCount(cartData);
      const hasInsuranceInCart = hasInsurance(cartData);
      const removingItem = cartData.items[lineIndex - 1];
      const removingQuantity = removingItem?.quantity || 0;
      
      if (nonInsuranceCount === removingQuantity && hasInsuranceInCart) {
        log('🚨', 'Last product - intercepting');
        
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        state.handlingLastProductRemoval = true;
        showOverlay();
        
        try {
          log('🗑️', 'Removing insurance first...');
          await removeInsuranceFromCart(true);
          await wait(600);
          
          const verifyCart = await getCart();
          if (verifyCart && hasInsurance(verifyCart)) {
            log('❌', 'Insurance still exists, forcing removal');
            await fetch('/cart/change.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: CONFIG.VARIANT_ID, quantity: 0 })
            });
            await wait(500);
          }
          
          log('✅', 'Insurance removed, removing product...');
          
          const cartItems = removeButton.closest('cart-items') || removeButton.closest('cart-drawer-items');
          if (cartItems) {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
              event: 'removeFromCart',
              products: { ...removeButton.dataset }
            });
            
            await cartItems.updateQuantity(lineIndex, 0, event);
          }
          
          await wait(400);
          hideOverlay();
          state.handlingLastProductRemoval = false;
          triggerCartUpdate();
          
        } catch (error) {
          log('❌', 'Removal error:', error);
          hideOverlay();
          state.handlingLastProductRemoval = false;
        }
      } else {
        setTimeout(() => syncInsuranceWithProducts(), 600);
      }
      
    }, true);
  }
  
  // ==================== INITIALIZATION ====================
  
  function attachEventListeners() {
    const { checkbox } = getElements();
    if (!checkbox) return false;
    
    checkbox.removeEventListener('change', handleCheckboxChange);
    checkbox.addEventListener('change', handleCheckboxChange);
    return true;
  }
  
  function observeCartChanges() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
              if (node.matches?.('cart-drawer-items') || node.querySelector?.('cart-drawer-items')) {
                setTimeout(() => {
                  attachEventListeners();
                  syncCheckboxState();
                }, 100);
              }
            }
          });
        }
        
        if (mutation.type === 'attributes' && mutation.attributeName === 'open') {
          const target = mutation.target;
          if (target.tagName === 'CART-DRAWER' && target.hasAttribute('open')) {
            setTimeout(() => {
              attachEventListeners();
              syncCheckboxState();
            }, 100);
          }
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['open']
    });
  }
  
  function listenToCartEvents() {
    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      subscribe(PUB_SUB_EVENTS.cartUpdate, () => {
        setTimeout(() => {
          syncCheckboxState();
          syncInsuranceWithProducts();
        }, 100);
      });
    }
  }
  
  async function init() {
    log('🚀', 'Initializing v7.1...');
    
    await fetchInsurancePrice();
    interceptCartItemRemoval();
    interceptMinusWhenLastItem();
    attachEventListeners();
    syncCheckboxState();
    observeCartChanges();
    listenToCartEvents();
    
    state.initialized = true;
    log('✅', 'Initialized!');
  }
  
  // ==================== START ====================
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }
  
  window.InsuranceManager = {
    getCart,
    hasInsurance,
    syncCheckboxState,
    updateGrandTotalUI,
    syncInsuranceWithProducts,
    removeInsuranceFromCart,
    fetchInsurancePrice,
    state
  };
  
})();