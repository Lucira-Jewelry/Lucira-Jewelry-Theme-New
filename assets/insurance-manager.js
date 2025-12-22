/**
 * Insurance Manager for Shopify Cart
 * Place this in assets/insurance-manager.js and include with:
 * <script src="{{ 'insurance-manager.js' | asset_url }}" defer></script>
 */

(function() {
  'use strict';
  
  console.log('🎯 Insurance Manager Loading...');
  
  // ==================== CONFIGURATION ====================
  const CONFIG = {
    VARIANT_ID: '47220042989786',
    PRICE: 100,
    CHECKBOX_ID: 'insuranceCheckbox',
    LOADER_ID: 'insuranceLoader',
    BOX_ID: 'insuranceBox'
  };
  
  // ==================== STATE ====================
  let processing = false;
  let elements = {
    checkbox: null,
    loader: null,
    box: null
  };
  
  // ==================== UTILITIES ====================
  
  function log(emoji, ...args) {
    console.log(emoji, ...args);
  }
  
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  function showLoader(show) {
    if (elements.loader) {
      elements.loader.classList.toggle('active', show);
    }
    if (elements.box) {
      elements.box.classList.toggle('updating', show);
    }
  }
  
  function setCheckbox(checked) {
    if (elements.checkbox) {
      elements.checkbox.checked = checked;
    }
  }
  
  // ==================== CART OPERATIONS ====================
  
  async function getCart() {
    try {
      const response = await fetch('/cart.js');
      if (!response.ok) throw new Error('Failed to fetch cart');
      return await response.json();
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
  
  async function addInsurance() {
    log('➕', 'Adding insurance...');
    
    try {
      // Method 1: Try form data (most compatible)
      const formData = new FormData();
      formData.append('id', CONFIG.VARIANT_ID);
      formData.append('quantity', '1');
      
      let response = await fetch('/cart/add.js', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        // Method 2: Try JSON if form data fails
        response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [{
              id: CONFIG.VARIANT_ID,
              quantity: 1
            }]
          })
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.description || 'Add failed');
      }
      
      log('✅', 'Insurance added');
      return true;
    } catch (error) {
      log('❌', 'Add error:', error);
      throw error;
    }
  }
  
  async function removeInsurance() {
    log('➖', 'Removing insurance...');
    
    try {
      // Method 1: Use /cart/change.js
      let response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: CONFIG.VARIANT_ID,
          quantity: 0
        })
      });
      
      if (!response.ok) {
        // Method 2: Use /cart/update.js
        response = await fetch('/cart/update.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            updates: {
              [CONFIG.VARIANT_ID]: 0
            }
          })
        });
      }
      
      if (!response.ok) {
        throw new Error('Remove failed');
      }
      
      log('✅', 'Insurance removed');
      return true;
    } catch (error) {
      log('❌', 'Remove error:', error);
      throw error;
    }
  }
  
  function reloadCart() {
    log('🔄', 'Reloading cart...');
    
    // Try to trigger theme events
    document.dispatchEvent(new CustomEvent('cart:refresh'));
    document.dispatchEvent(new CustomEvent('cart:updated'));
    
    // Fallback: hard reload after delay
    setTimeout(() => {
      window.location.reload();
    }, 800);
  }
  
  // ==================== MAIN LOGIC ====================
  
  async function handleAdd() {
    if (processing) return;
    
    processing = true;
    showLoader(true);
    
    try {
      // Check current cart state
      const cartData = await getCart();
      if (hasInsurance(cartData)) {
        log('ℹ️', 'Insurance already in cart');
        processing = false;
        showLoader(false);
        return;
      }
      
      // Add insurance
      await addInsurance();
      
      // Wait a moment for cart to update
      await wait(500);
      
      // Reload cart display
      reloadCart();
      
    } catch (error) {
      alert('Failed to add insurance: ' + error.message);
      setCheckbox(false);
      processing = false;
      showLoader(false);
    }
  }
  
  async function handleRemove() {
    if (processing) return;
    
    processing = true;
    showLoader(true);
    
    try {
      // Remove insurance
      await removeInsurance();
      
      // Wait a moment for cart to update
      await wait(500);
      
      // Reload cart display
      reloadCart();
      
    } catch (error) {
      alert('Failed to remove insurance: ' + error.message);
      setCheckbox(true);
      processing = false;
      showLoader(false);
    }
  }
  
  async function syncCheckbox() {
    try {
      const cartData = await getCart();
      const has = hasInsurance(cartData);
      log('🔄', 'Syncing checkbox:', has);
      setCheckbox(has);
    } catch (error) {
      log('❌', 'Sync error:', error);
    }
  }
  
  function onCheckboxChange(event) {
    if (processing) {
      event.preventDefault();
      return;
    }
    
    const checked = event.target.checked;
    log('📝', 'Checkbox changed:', checked);
    
    if (checked) {
      handleAdd();
    } else {
      handleRemove();
    }
  }
  
  // ==================== INITIALIZATION ====================
  
  function init() {
    log('🚀', 'Initializing...');
    
    // Find elements
    elements.checkbox = document.getElementById(CONFIG.CHECKBOX_ID);
    elements.loader = document.getElementById(CONFIG.LOADER_ID);
    elements.box = document.getElementById(CONFIG.BOX_ID);
    
    if (!elements.checkbox) {
      log('❌', 'Checkbox not found');
      return;
    }
    
    // Sync initial state
    syncCheckbox();
    
    // Attach event
    elements.checkbox.addEventListener('change', onCheckboxChange);
    
    // Watch for cart drawer opening
    const observer = new MutationObserver(() => {
      const drawer = document.querySelector('cart-drawer');
      if (drawer && drawer.hasAttribute('open')) {
        log('🔄', 'Drawer opened, syncing...');
        syncCheckbox();
      }
    });
    
    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['open']
    });
    
    log('✅', 'Insurance Manager Ready!');
  }
  
  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();