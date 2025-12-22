/**
 * Insurance Manager for Shopify Cart - Compatible with cart.js
 * Place this in assets/insurance-manager.js
 * Include AFTER cart.js: <script src="{{ 'insurance-manager.js' | asset_url }}" defer></script>
 */

(function() {
  'use strict';
  
  console.log('🎯 Insurance Manager v3.0 Starting...');
  
  // ==================== CONFIGURATION ====================
  const CONFIG = {
    VARIANT_ID: '47220042989786',
    PRICE: 10000, // ₹100 in cents
    CHECKBOX_ID: 'insuranceCheckbox',
    LOADER_ID: 'insuranceLoader',
    BOX_ID: 'insuranceBox'
  };
  
  // ==================== STATE ====================
  let state = {
    processing: false,
    initialized: false,
    lastCartState: null
  };
  
  // ==================== UTILITIES ====================
  
  function log(emoji, ...args) {
    console.log(emoji, '[Insurance]', ...args);
  }
  
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  function getElements() {
    return {
      checkbox: document.getElementById(CONFIG.CHECKBOX_ID),
      loader: document.getElementById(CONFIG.LOADER_ID),
      box: document.getElementById(CONFIG.BOX_ID)
    };
  }
  
  function showLoader(show) {
    const elements = getElements();
    if (elements.loader) {
      elements.loader.classList.toggle('active', show);
    }
    if (elements.box) {
      elements.box.classList.toggle('updating', show);
    }
  }
  
  function setCheckbox(checked, silent = false) {
    const elements = getElements();
    if (elements.checkbox && elements.checkbox.checked !== checked) {
      if (silent) {
        // Remove event listener temporarily
        elements.checkbox.removeEventListener('change', handleCheckboxChange);
        elements.checkbox.checked = checked;
        // Re-attach after a tick
        setTimeout(() => {
          elements.checkbox.addEventListener('change', handleCheckboxChange);
        }, 0);
      } else {
        elements.checkbox.checked = checked;
      }
    }
  }
  
  // ==================== CART OPERATIONS ====================
  
  async function getCart() {
    try {
      const response = await fetch('/cart.js', {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch cart');
      const cart = await response.json();
      state.lastCartState = cart;
      return cart;
    } catch (error) {
      log('❌', 'Cart fetch error:', error);
      return null;
    }
  }
  
  function hasInsurance(cartData) {
    if (!cartData || !cartData.items) return false;
    return cartData.items.some(item => 
      String(item.variant_id) === CONFIG.VARIANT_ID || 
      String(item.id) === CONFIG.VARIANT_ID
    );
  }
  
  async function addInsuranceToCart() {
    log('➕', 'Adding insurance to cart...');
    
    try {
      // Use the standard Shopify cart add endpoint
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          items: [{
            id: CONFIG.VARIANT_ID,
            quantity: 1
          }]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.description || errorData.message || 'Failed to add insurance');
      }
      
      const result = await response.json();
      log('✅', 'Insurance added successfully:', result);
      return result;
    } catch (error) {
      log('❌', 'Add error:', error);
      throw error;
    }
  }
  
  async function removeInsuranceFromCart() {
    log('➖', 'Removing insurance from cart...');
    
    try {
      // Use cart/change.js to set quantity to 0
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
      
      if (!response.ok) {
        throw new Error('Failed to remove insurance');
      }
      
      const result = await response.json();
      log('✅', 'Insurance removed successfully:', result);
      return result;
    } catch (error) {
      log('❌', 'Remove error:', error);
      throw error;
    }
  }
  
  function updateGrandTotalDisplay(cartData) {
    if (!cartData) return;
    
    const totalPrice = cartData.total_price;
    const formattedTotal = formatMoney(totalPrice);
    
    // Update grand total in price breakup
    const grandTotalValue = document.getElementById('grandTotalValue');
    if (grandTotalValue) {
      grandTotalValue.textContent = formattedTotal;
    }
    
    // Update grand total in checkout section
    const grandTotalCheckout = document.querySelector('#grandTotalCheckout strong');
    if (grandTotalCheckout) {
      grandTotalCheckout.textContent = formattedTotal;
    }
    
    log('✅', 'Grand total updated:', formattedTotal);
  }
  
  function formatMoney(cents) {
    const rupees = cents / 100;
    return '₹' + rupees.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }
  
  function triggerCartUpdate() {
    log('🔄', 'Triggering cart refresh...');
    
    // Trigger the cart-items update which will fetch fresh HTML
    const cartItems = document.querySelector('cart-drawer-items') || document.querySelector('cart-items');
    
    if (cartItems && typeof cartItems.onCartUpdate === 'function') {
      // Use the existing cart update mechanism
      cartItems.onCartUpdate().then(() => {
        log('✅', 'Cart updated via onCartUpdate');
        // Re-initialize after DOM update
        setTimeout(() => {
          syncCheckboxState();
          getCart().then(cart => updateGrandTotalDisplay(cart));
        }, 100);
      });
    } else {
      // Fallback: Publish cart update event
      if (typeof publish === 'function') {
        publish('cart:refresh', {});
      }
      
      // Double fallback: Fetch and replace cart drawer section
      fetch(window.location.pathname + '?section_id=cart-drawer')
        .then(response => response.text())
        .then(html => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          
          const newCartItems = doc.querySelector('cart-drawer-items');
          const currentCartItems = document.querySelector('cart-drawer-items');
          
          if (newCartItems && currentCartItems) {
            currentCartItems.replaceWith(newCartItems);
          }
          
          const newFooter = doc.querySelector('.cart-drawer__footer');
          const currentFooter = document.querySelector('.cart-drawer__footer');
          
          if (newFooter && currentFooter) {
            currentFooter.replaceWith(newFooter);
          }
          
          log('✅', 'Cart updated via section fetch');
          
          // Re-initialize after DOM update
          setTimeout(() => {
            syncCheckboxState();
            getCart().then(cart => updateGrandTotalDisplay(cart));
          }, 100);
        })
        .catch(error => {
          log('❌', 'Section fetch failed:', error);
        });
    }
  }
  
  // ==================== MAIN LOGIC ====================
  
  async function handleAdd() {
    if (state.processing) {
      log('⏳', 'Already processing...');
      return;
    }
    
    state.processing = true;
    showLoader(true);
    
    try {
      // Check if already in cart
      const cartData = await getCart();
      if (hasInsurance(cartData)) {
        log('ℹ️', 'Insurance already in cart');
        state.processing = false;
        showLoader(false);
        return;
      }
      
      // Add to cart
      await addInsuranceToCart();
      
      // Wait for cart to process
      await wait(300);
      
      // Trigger cart update
      triggerCartUpdate();
      
    } catch (error) {
      log('❌', 'Failed to add insurance:', error);
      alert('Failed to add insurance: ' + error.message);
      setCheckbox(false, true);
    } finally {
      state.processing = false;
      showLoader(false);
    }
  }
  
  async function handleRemove() {
    if (state.processing) {
      log('⏳', 'Already processing...');
      return;
    }
    
    state.processing = true;
    showLoader(true);
    
    try {
      // Remove from cart
      await removeInsuranceFromCart();
      
      // Wait for cart to process
      await wait(300);
      
      // Trigger cart update
      triggerCartUpdate();
      
    } catch (error) {
      log('❌', 'Failed to remove insurance:', error);
      alert('Failed to remove insurance: ' + error.message);
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
      log('🔄', 'Syncing checkbox state:', has);
      setCheckbox(has, true); // Silent update
      
      // Also update the grand total display
      updateGrandTotalDisplay(cartData);
    } catch (error) {
      log('❌', 'Sync error:', error);
    }
  }
  
  function handleCheckboxChange(event) {
    if (state.processing) {
      event.preventDefault();
      return;
    }
    
    const checked = event.target.checked;
    log('📝', 'Checkbox changed by user:', checked);
    
    if (checked) {
      handleAdd();
    } else {
      handleRemove();
    }
  }
  
  // ==================== INITIALIZATION ====================
  
  function attachEventListeners() {
    const elements = getElements();
    
    if (!elements.checkbox) {
      log('⚠️', 'Checkbox not found, skipping event attachment');
      return false;
    }
    
    // Remove any existing listener first
    elements.checkbox.removeEventListener('change', handleCheckboxChange);
    
    // Attach new listener
    elements.checkbox.addEventListener('change', handleCheckboxChange);
    
    log('✅', 'Event listeners attached');
    return true;
  }
  
  function init() {
    log('🚀', 'Initializing Insurance Manager...');
    
    // Attach event listeners
    if (!attachEventListeners()) {
      log('⚠️', 'Failed to attach listeners, will retry on cart open');
    }
    
    // Sync initial state
    syncCheckboxState();
    
    // Watch for cart drawer mutations (when cart updates via AJAX)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Check if cart drawer items were added/changed
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
              if (node.matches && (node.matches('cart-drawer-items') || node.querySelector && node.querySelector('cart-drawer-items'))) {
                log('🔄', 'Cart drawer updated, re-initializing...');
                setTimeout(() => {
                  attachEventListeners();
                  syncCheckboxState();
                }, 100);
              }
            }
          });
        }
        
        // Check if cart drawer was opened
        if (mutation.type === 'attributes' && mutation.attributeName === 'open') {
          const target = mutation.target;
          if (target.tagName === 'CART-DRAWER' && target.hasAttribute('open')) {
            log('🔄', 'Cart drawer opened, syncing state...');
            setTimeout(() => {
              attachEventListeners();
              syncCheckboxState();
            }, 100);
          }
        }
      }
    });
    
    // Observe the entire document for cart updates
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['open']
    });
    
    // Also listen for custom cart update events
    document.addEventListener('cart:refresh', () => {
      log('🔄', 'Cart refresh event detected');
      setTimeout(() => {
        attachEventListeners();
        syncCheckboxState();
      }, 100);
    });
    
    // Listen for PUB_SUB cart updates if available
    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
        log('🔄', 'PUB_SUB cartUpdate event detected');
        setTimeout(() => {
          syncCheckboxState();
        }, 100);
      });
    }
    
    state.initialized = true;
    log('✅', 'Insurance Manager initialized successfully!');
  }
  
  // ==================== START ====================
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded, but wait a bit for other scripts
    setTimeout(init, 100);
  }
  
})();