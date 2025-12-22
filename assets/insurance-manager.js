
// final working script

// /**
//  * Insurance Manager for Shopify Cart - Complete Solution
//  * Place this in assets/insurance-manager.js
//  * Include AFTER cart.js: <script src="{{ 'insurance-manager.js' | asset_url }}" defer></script>
//  */

// (function() {
//   'use strict';
  
//   console.log('🎯 Insurance Manager v4.0 Starting...');
  
//   // ==================== CONFIGURATION ====================
//   const CONFIG = {
//     VARIANT_ID: '47220042989786',
//     PRICE: 10000, // ₹100 in cents
//     CHECKBOX_ID: 'insuranceCheckbox',
//     LOADER_ID: 'insuranceLoader',
//     BOX_ID: 'insuranceBox'
//   };
  
//   // ==================== STATE ====================
//   let state = {
//     processing: false,
//     initialized: false,
//     currentCart: null
//   };
  
//   // ==================== UTILITIES ====================
  
//   function log(emoji, ...args) {
//     console.log(emoji, '[Insurance]', ...args);
//   }
  
//   function wait(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
//   }
  
//   function formatMoney(cents) {
//     const rupees = cents / 100;
//     return '₹' + rupees.toLocaleString('en-IN', {
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2
//     });
//   }
  
//   function getElements() {
//     return {
//       checkbox: document.getElementById(CONFIG.CHECKBOX_ID),
//       loader: document.getElementById(CONFIG.LOADER_ID),
//       box: document.getElementById(CONFIG.BOX_ID)
//     };
//   }
  
//   function showLoader(show) {
//     const elements = getElements();
//     if (elements.loader) {
//       elements.loader.classList.toggle('active', show);
//     }
//     if (elements.box) {
//       elements.box.classList.toggle('updating', show);
//     }
//   }
  
//   function setCheckbox(checked, silent = false) {
//     const elements = getElements();
//     if (elements.checkbox && elements.checkbox.checked !== checked) {
//       if (silent) {
//         elements.checkbox.removeEventListener('change', handleCheckboxChange);
//         elements.checkbox.checked = checked;
//         setTimeout(() => {
//           elements.checkbox.addEventListener('change', handleCheckboxChange);
//         }, 0);
//       } else {
//         elements.checkbox.checked = checked;
//       }
//     }
//   }
  
//   // ==================== CART OPERATIONS ====================
  
//   async function getCart() {
//     try {
//       const response = await fetch('/cart.js', {
//         headers: { 'Accept': 'application/json' }
//       });
//       if (!response.ok) throw new Error('Failed to fetch cart');
//       const cart = await response.json();
//       state.currentCart = cart;
//       return cart;
//     } catch (error) {
//       log('❌', 'Cart fetch error:', error);
//       return null;
//     }
//   }
  
//   function hasInsurance(cartData) {
//     if (!cartData || !cartData.items) return false;
//     return cartData.items.some(item => 
//       String(item.variant_id) === CONFIG.VARIANT_ID || 
//       String(item.id) === CONFIG.VARIANT_ID
//     );
//   }
  
//   function getNonInsuranceCount(cartData) {
//     if (!cartData || !cartData.items) return 0;
//     return cartData.items.reduce((count, item) => {
//       if (String(item.variant_id) !== CONFIG.VARIANT_ID && String(item.id) !== CONFIG.VARIANT_ID) {
//         return count + item.quantity;
//       }
//       return count;
//     }, 0);
//   }
  
//   async function addInsuranceToCart() {
//     log('➕', 'Adding insurance to cart...');
    
//     try {
//       const response = await fetch('/cart/add.js', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Accept': 'application/json'
//         },
//         body: JSON.stringify({
//           items: [{
//             id: CONFIG.VARIANT_ID,
//             quantity: 1
//           }]
//         })
//       });
      
//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.description || errorData.message || 'Failed to add insurance');
//       }
      
//       const result = await response.json();
//       log('✅', 'Insurance added successfully:', result);
//       return result;
//     } catch (error) {
//       log('❌', 'Add error:', error);
//       throw error;
//     }
//   }
  
//   async function removeInsuranceFromCart() {
//     log('➖', 'Removing insurance from cart...');
    
//     try {
//       const response = await fetch('/cart/change.js', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Accept': 'application/json'
//         },
//         body: JSON.stringify({
//           id: CONFIG.VARIANT_ID,
//           quantity: 0
//         })
//       });
      
//       if (!response.ok) {
//         throw new Error('Failed to remove insurance');
//       }
      
//       const result = await response.json();
//       log('✅', 'Insurance removed successfully:', result);
//       return result;
//     } catch (error) {
//       log('❌', 'Remove error:', error);
//       throw error;
//     }
//   }
  
//   // ==================== UI UPDATES ====================
  
//   function updateGrandTotalUI(cartData) {
//     if (!cartData) return;
    
//     log('💰', 'Updating grand total UI:', cartData.total_price);
    
//     // Update all grand total displays
//     const grandTotalSelectors = [
//       '.totals__total-value', // In price breakup
//       '.grand-total strong', // In checkout info
//       '.checkout-info .grand-total strong'
//     ];
    
//     grandTotalSelectors.forEach(selector => {
//       const elements = document.querySelectorAll(selector);
//       elements.forEach(el => {
//         // Check if this is a grand total element
//         const parent = el.closest('.totals, .grand-total, .checkout-info');
//         if (parent && (
//           parent.textContent.includes('GRAND TOTAL') || 
//           parent.textContent.includes('Grand Total')
//         )) {
//           el.textContent = formatMoney(cartData.total_price);
//           log('✅', 'Updated grand total element:', el);
//         }
//       });
//     });
    
//     // Update item count (excluding insurance)
//     const itemCount = getNonInsuranceCount(cartData);
//     const itemCountElements = document.querySelectorAll('.totals__total');
//     itemCountElements.forEach(el => {
//       if (el.textContent.includes('Items')) {
//         el.textContent = `Items (${itemCount})`;
//       }
//     });
    
//     // Show/hide insurance line item in price breakup
//     const insuranceLine = document.getElementById('insurance-line-item');
//     if (insuranceLine) {
//       insuranceLine.style.display = hasInsurance(cartData) ? 'flex' : 'none';
//     }
//   }
  
//   function triggerCartUpdate() {
//     log('🔄', 'Triggering cart refresh...');
    
//     // Get fresh cart data first
//     getCart().then(cartData => {
//       if (cartData) {
//         // Update UI immediately
//         updateGrandTotalUI(cartData);
//       }
      
//       // Then trigger full cart refresh
//       const cartItems = document.querySelector('cart-drawer-items') || document.querySelector('cart-items');
      
//       if (cartItems && typeof cartItems.onCartUpdate === 'function') {
//         cartItems.onCartUpdate().then(() => {
//           log('✅', 'Cart updated via onCartUpdate');
//           // Update UI again after refresh
//           getCart().then(freshCart => {
//             if (freshCart) {
//               updateGrandTotalUI(freshCart);
//               syncCheckboxState();
//             }
//           });
//         });
//       } else {
//         // Fallback: Fetch and replace cart sections
//         fetch(window.location.pathname + '?section_id=cart-drawer')
//           .then(response => response.text())
//           .then(html => {
//             const parser = new DOMParser();
//             const doc = parser.parseFromString(html, 'text/html');
            
//             // Replace cart items
//             const newCartItems = doc.querySelector('cart-drawer-items');
//             const currentCartItems = document.querySelector('cart-drawer-items');
            
//             if (newCartItems && currentCartItems) {
//               currentCartItems.replaceWith(newCartItems);
//             }
            
//             // Replace footer
//             const newFooter = doc.querySelector('.cart-drawer__footer');
//             const currentFooter = document.querySelector('.cart-drawer__footer');
            
//             if (newFooter && currentFooter) {
//               currentFooter.replaceWith(newFooter);
//             }
            
//             log('✅', 'Cart updated via section fetch');
            
//             // Update UI after section replacement
//             getCart().then(freshCart => {
//               if (freshCart) {
//                 updateGrandTotalUI(freshCart);
//                 syncCheckboxState();
//               }
//             });
//           })
//           .catch(error => {
//             log('❌', 'Section fetch failed:', error);
//           });
//       }
//     });
//   }
  
//   // ==================== MAIN LOGIC ====================
  
//   async function handleAdd() {
//     if (state.processing) {
//       log('⏳', 'Already processing...');
//       return;
//     }
    
//     state.processing = true;
//     showLoader(true);
    
//     try {
//       // Check if already in cart
//       const cartData = await getCart();
//       if (hasInsurance(cartData)) {
//         log('ℹ️', 'Insurance already in cart');
//         state.processing = false;
//         showLoader(false);
//         return;
//       }
      
//       // Add to cart
//       const result = await addInsuranceToCart();
      
//       // Get fresh cart data
//       const freshCart = await getCart();
      
//       // Update UI immediately with new total
//       if (freshCart) {
//         updateGrandTotalUI(freshCart);
//       }
      
//       // Wait a bit before triggering full refresh
//       await wait(200);
      
//       // Trigger full cart update
//       triggerCartUpdate();
      
//     } catch (error) {
//       log('❌', 'Failed to add insurance:', error);
//       alert('Failed to add insurance: ' + error.message);
//       setCheckbox(false, true);
//     } finally {
//       state.processing = false;
//       showLoader(false);
//     }
//   }
  
//   async function handleRemove() {
//     if (state.processing) {
//       log('⏳', 'Already processing...');
//       return;
//     }
    
//     state.processing = true;
//     showLoader(true);
    
//     try {
//       // Remove from cart
//       const result = await removeInsuranceFromCart();
      
//       // Get fresh cart data
//       const freshCart = await getCart();
      
//       // Update UI immediately with new total
//       if (freshCart) {
//         updateGrandTotalUI(freshCart);
//       }
      
//       // Wait a bit before triggering full refresh
//       await wait(200);
      
//       // Trigger full cart update
//       triggerCartUpdate();
      
//     } catch (error) {
//       log('❌', 'Failed to remove insurance:', error);
//       alert('Failed to remove insurance: ' + error.message);
//       setCheckbox(true, true);
//     } finally {
//       state.processing = false;
//       showLoader(false);
//     }
//   }
  
//   async function syncCheckboxState() {
//     try {
//       const cartData = await getCart();
//       if (!cartData) return;
      
//       const has = hasInsurance(cartData);
//       log('🔄', 'Syncing checkbox state:', has);
//       setCheckbox(has, true);
      
//       // Also update UI
//       updateGrandTotalUI(cartData);
//     } catch (error) {
//       log('❌', 'Sync error:', error);
//     }
//   }
  
//   function handleCheckboxChange(event) {
//     if (state.processing) {
//       event.preventDefault();
//       return;
//     }
    
//     const checked = event.target.checked;
//     log('📝', 'Checkbox changed by user:', checked);
    
//     if (checked) {
//       handleAdd();
//     } else {
//       handleRemove();
//     }
//   }
  
//   // ==================== INITIALIZATION ====================
  
//   function attachEventListeners() {
//     const elements = getElements();
    
//     if (!elements.checkbox) {
//       log('⚠️', 'Checkbox not found');
//       return false;
//     }
    
//     // Remove any existing listener
//     elements.checkbox.removeEventListener('change', handleCheckboxChange);
    
//     // Attach new listener
//     elements.checkbox.addEventListener('change', handleCheckboxChange);
    
//     log('✅', 'Event listeners attached');
//     return true;
//   }
  
//   function observeCartChanges() {
//     // Watch for cart drawer mutations
//     const observer = new MutationObserver((mutations) => {
//       for (const mutation of mutations) {
//         // Check if cart items were updated
//         if (mutation.addedNodes.length > 0) {
//           mutation.addedNodes.forEach(node => {
//             if (node.nodeType === 1) {
//               if (node.matches && (node.matches('cart-drawer-items') || node.querySelector && node.querySelector('cart-drawer-items'))) {
//                 log('🔄', 'Cart drawer updated, re-initializing...');
//                 setTimeout(() => {
//                   attachEventListeners();
//                   syncCheckboxState();
//                 }, 100);
//               }
//             }
//           });
//         }
        
//         // Check if cart drawer was opened
//         if (mutation.type === 'attributes' && mutation.attributeName === 'open') {
//           const target = mutation.target;
//           if (target.tagName === 'CART-DRAWER' && target.hasAttribute('open')) {
//             log('🔄', 'Cart drawer opened');
//             setTimeout(() => {
//               attachEventListeners();
//               syncCheckboxState();
//             }, 100);
//           }
//         }
//       }
//     });
    
//     observer.observe(document.body, {
//       childList: true,
//       subtree: true,
//       attributes: true,
//       attributeFilter: ['open']
//     });
//   }
  
//   function listenToCartEvents() {
//     // Listen for custom cart events
//     document.addEventListener('cart:refresh', () => {
//       log('🔄', 'Cart refresh event');
//       setTimeout(() => {
//         attachEventListeners();
//         syncCheckboxState();
//       }, 100);
//     });
    
//     // Listen for PUB_SUB events if available
//     if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
//       subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
//         log('🔄', 'PUB_SUB cartUpdate event');
//         setTimeout(() => {
//           syncCheckboxState();
//         }, 100);
//       });
//     }
//   }
  
//   function init() {
//     log('🚀', 'Initializing Insurance Manager...');
    
//     // Attach event listeners
//     attachEventListeners();
    
//     // Sync initial state
//     syncCheckboxState();
    
//     // Start observing cart changes
//     observeCartChanges();
    
//     // Listen to cart events
//     listenToCartEvents();
    
//     state.initialized = true;
//     log('✅', 'Insurance Manager initialized successfully!');
//   }
  
//   // ==================== START ====================
  
//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', init);
//   } else {
//     setTimeout(init, 100);
//   }
  
//   // Expose functions for debugging
//   window.InsuranceManager = {
//     getCart,
//     hasInsurance,
//     syncCheckboxState,
//     updateGrandTotalUI,
//     state
//   };
  
// })();


/**
 * Insurance Manager for Shopify Cart - Complete Solution
 * Place this in assets/insurance-manager.js
 * Include AFTER cart.js: <script src="{{ 'insurance-manager.js' | asset_url }}" defer></script>
 */

/**
 * Insurance Manager for Shopify Cart - Complete Solution
 * Place this in assets/insurance-manager.js
 * Include AFTER cart.js: <script src="{{ 'insurance-manager.js' | asset_url }}" defer></script>
 */

(function() {
  'use strict';
  
  console.log('🎯 Insurance Manager v4.0 Starting...');
  
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
    currentCart: null
  };
  
  // ==================== UTILITIES ====================
  
  function log(emoji, ...args) {
    console.log(emoji, '[Insurance]', ...args);
  }
  
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  function formatMoney(cents) {
    const rupees = Math.round(cents / 100); // Round to remove decimals
    return '₹' + rupees.toLocaleString('en-IN');
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
        elements.checkbox.removeEventListener('change', handleCheckboxChange);
        elements.checkbox.checked = checked;
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
      state.currentCart = cart;
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
  
  function getNonInsuranceCount(cartData) {
    if (!cartData || !cartData.items) return 0;
    return cartData.items.reduce((count, item) => {
      if (String(item.variant_id) !== CONFIG.VARIANT_ID && String(item.id) !== CONFIG.VARIANT_ID) {
        return count + item.quantity;
      }
      return count;
    }, 0);
  }
  
  async function addInsuranceToCart() {
    log('➕', 'Adding insurance to cart...');
    
    try {
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
  
  // ==================== UI UPDATES ====================
  
  async function updateInsuranceSectionVisibility(cartData) {
    if (!cartData) return;
    
    const nonInsuranceCount = getNonInsuranceCount(cartData);
    const hasProducts = nonInsuranceCount > 0;
    const hasInsuranceInCart = hasInsurance(cartData);
    
    log('👁️', 'Products in cart (excluding insurance):', nonInsuranceCount);
    log('👁️', 'Insurance in cart:', hasInsuranceInCart);
    
    // Find insurance section wrapper
    const insuranceWrapper = document.getElementById(CONFIG.BOX_ID);
    const insuranceHeader = insuranceWrapper ? insuranceWrapper.previousElementSibling : null;
    
    if (insuranceWrapper) {
      if (hasProducts) {
        insuranceWrapper.style.display = '';
        if (insuranceHeader && insuranceHeader.textContent.includes('APPLY INSURANCE')) {
          insuranceHeader.style.display = '';
        }
        log('✅', 'Insurance section visible');
      } else {
        insuranceWrapper.style.display = 'none';
        if (insuranceHeader && insuranceHeader.textContent.includes('APPLY INSURANCE')) {
          insuranceHeader.style.display = 'none';
        }
        log('🚫', 'Insurance section hidden - no products in cart');
        
        // If insurance exists but no products, remove it
        if (hasInsuranceInCart) {
          log('⚠️', 'Removing insurance - no products in cart');
          try {
            await removeInsuranceFromCart();
            await wait(200);
            triggerCartUpdate();
          } catch (error) {
            log('❌', 'Failed to auto-remove insurance:', error);
          }
        }
        
        const elements = getElements();
        if (elements.checkbox && elements.checkbox.checked) {
          setCheckbox(false, true);
        }
      }
    }
  }
  
  async function updateGrandTotalUI(cartData) {
    if (!cartData) return;
    
    log('💰', 'Updating grand total UI:', cartData.total_price);
    
    // Update all grand total displays
    const grandTotalSelectors = [
      '.totals__total-value',
      '.grand-total strong',
      '.checkout-info .grand-total strong'
    ];
    
    grandTotalSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const parent = el.closest('.totals, .grand-total, .checkout-info');
        if (parent && (
          parent.textContent.includes('GRAND TOTAL') || 
          parent.textContent.includes('Grand Total')
        )) {
          el.textContent = formatMoney(cartData.total_price);
          log('✅', 'Updated grand total element:', el);
        }
      });
    });
    
    // Update item count (excluding insurance)
    const itemCount = getNonInsuranceCount(cartData);
    const itemCountElements = document.querySelectorAll('.totals__total');
    itemCountElements.forEach(el => {
      if (el.textContent.includes('Items')) {
        el.textContent = `Items (${itemCount})`;
      }
    });
    
    // Show/hide insurance line item
    const insuranceLine = document.getElementById('insurance-line-item');
    if (insuranceLine) {
      insuranceLine.style.display = hasInsurance(cartData) ? 'flex' : 'none';
    }
    
    // Update insurance section visibility
    await updateInsuranceSectionVisibility(cartData);
  }
  
  function triggerCartUpdate() {
    log('🔄', 'Triggering cart refresh...');
    
    getCart().then(cartData => {
      if (cartData) {
        updateGrandTotalUI(cartData);
      }
      
      const cartItems = document.querySelector('cart-drawer-items') || document.querySelector('cart-items');
      
      if (cartItems && typeof cartItems.onCartUpdate === 'function') {
        cartItems.onCartUpdate().then(() => {
          log('✅', 'Cart updated via onCartUpdate');
          getCart().then(freshCart => {
            if (freshCart) {
              updateGrandTotalUI(freshCart);
              syncCheckboxState();
            }
          });
        });
      } else {
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
            
            getCart().then(freshCart => {
              if (freshCart) {
                updateGrandTotalUI(freshCart);
                syncCheckboxState();
              }
            });
          })
          .catch(error => {
            log('❌', 'Section fetch failed:', error);
          });
      }
    });
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
      const cartData = await getCart();
      if (hasInsurance(cartData)) {
        log('ℹ️', 'Insurance already in cart');
        state.processing = false;
        showLoader(false);
        return;
      }
      
      const result = await addInsuranceToCart();
      const freshCart = await getCart();
      
      if (freshCart) {
        updateGrandTotalUI(freshCart);
      }
      
      await wait(200);
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
      const result = await removeInsuranceFromCart();
      const freshCart = await getCart();
      
      if (freshCart) {
        updateGrandTotalUI(freshCart);
      }
      
      await wait(200);
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
      log('⚠️', 'Checkbox not found');
      return false;
    }
    
    elements.checkbox.removeEventListener('change', handleCheckboxChange);
    elements.checkbox.addEventListener('change', handleCheckboxChange);
    
    log('✅', 'Event listeners attached');
    return true;
  }
  
  function observeCartChanges() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
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
        
        if (mutation.type === 'attributes' && mutation.attributeName === 'open') {
          const target = mutation.target;
          if (target.tagName === 'CART-DRAWER' && target.hasAttribute('open')) {
            log('🔄', 'Cart drawer opened');
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
    document.addEventListener('cart:refresh', () => {
      log('🔄', 'Cart refresh event');
      setTimeout(() => {
        attachEventListeners();
        syncCheckboxState();
      }, 100);
    });
    
    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
        log('🔄', 'PUB_SUB cartUpdate event');
        setTimeout(() => {
          syncCheckboxState();
        }, 100);
      });
    }
  }
  
  function init() {
    log('🚀', 'Initializing Insurance Manager...');
    
    attachEventListeners();
    syncCheckboxState();
    observeCartChanges();
    listenToCartEvents();
    
    state.initialized = true;
    log('✅', 'Insurance Manager initialized successfully!');
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
    state
  };
  
})();