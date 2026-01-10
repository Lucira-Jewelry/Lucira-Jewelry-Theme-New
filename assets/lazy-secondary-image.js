/**
 * Lazy Load Secondary Product Images on Hover
 * Optimized for performance and robustness
 */
(function() {
  'use strict';

  // Cache to track loaded images and prevent duplicate loads
  const loadedImages = new Set();
  const loadingImages = new Map();
  
  // Configuration
  const CONFIG = {
    hoverDelay: 50, // Delay before starting load (ms)
    resetDelay: 300, // Delay before clearing timeout (ms)
  };

  /**
   * Loads the secondary image for a product card
   * @param {HTMLElement} mediaContainer - The media container element
   * @param {HTMLImageElement} secondaryImg - The secondary image element
   */
  function loadSecondaryImage(mediaContainer, secondaryImg) {
    const imageId = secondaryImg.id;
    
    // If already loaded, just show it
    if (loadedImages.has(imageId)) {
      secondaryImg.style.display = '';
      return;
    }
    
    // If currently loading, don't trigger again
    if (loadingImages.has(imageId)) {
      return;
    }
    
    // Mark as loading
    loadingImages.set(imageId, true);
    
    // Get data attributes
    const srcset = secondaryImg.getAttribute('data-srcset');
    const src = secondaryImg.getAttribute('data-src');
    const sizes = secondaryImg.getAttribute('data-sizes');
    
    // Validate data exists
    if (!src) {
      console.warn('Secondary image missing data-src:', imageId);
      loadingImages.delete(imageId);
      return;
    }
    
    // Create a temporary image to preload
    const tempImg = new Image();
    
    // Success handler
    tempImg.onload = function() {
      // Transfer attributes to actual image
      if (srcset) {
        secondaryImg.srcset = srcset;
        secondaryImg.removeAttribute('data-srcset');
      }
      
      secondaryImg.src = src;
      secondaryImg.removeAttribute('data-src');
      
      if (sizes) {
        secondaryImg.sizes = sizes;
        secondaryImg.removeAttribute('data-sizes');
      }
      
      // Show the image
      secondaryImg.style.display = '';
      
      // Mark as loaded
      loadedImages.add(imageId);
      loadingImages.delete(imageId);
      secondaryImg.removeAttribute('data-lazy-secondary');
      
      // Remove loading class if exists
      mediaContainer.classList.remove('loading-secondary');
    };
    
    // Error handler
    tempImg.onerror = function() {
      console.error('Failed to load secondary image:', src);
      loadingImages.delete(imageId);
      mediaContainer.classList.remove('loading-secondary');
    };
    
    // Start loading
    mediaContainer.classList.add('loading-secondary');
    
    // Load srcset first if available, then src as fallback
    if (srcset) {
      tempImg.srcset = srcset;
    }
    tempImg.src = src;
  }

  /**
   * Handles mouseenter event on product card
   * @param {Event} event - The mouseenter event
   */
  function handleMouseEnter(event) {
    const mediaContainer = event.currentTarget;
    const secondaryImg = mediaContainer.querySelector('img.secondary-image[data-lazy-secondary="true"]');
    
    if (!secondaryImg) {
      return; // No lazy secondary image found
    }
    
    // Clear any existing timeout
    if (mediaContainer._hoverTimeout) {
      clearTimeout(mediaContainer._hoverTimeout);
    }
    
    // Set a small delay to avoid loading on quick mouse passes
    mediaContainer._hoverTimeout = setTimeout(() => {
      loadSecondaryImage(mediaContainer, secondaryImg);
    }, CONFIG.hoverDelay);
  }

  /**
   * Handles mouseleave event on product card
   * @param {Event} event - The mouseleave event
   */
  function handleMouseLeave(event) {
    const mediaContainer = event.currentTarget;
    
    // Clear timeout if user leaves before delay completes
    if (mediaContainer._hoverTimeout) {
      clearTimeout(mediaContainer._hoverTimeout);
      mediaContainer._hoverTimeout = null;
    }
  }

  /**
   * Handles color variant changes
   * When color changes, the primary image changes but secondary should reload if needed
   */
  function handleColorChange(event) {
    const colorButton = event.currentTarget;
    const productId = colorButton.getAttribute('data-product-id');
    
    if (!productId) return;
    
    // Find the media container for this product
    const mediaContainer = document.querySelector(`[data-product-card-media="${productId}"]`);
    
    if (!mediaContainer) return;
    
    // The secondary image might have changed with the variant
    // If it has data-lazy-secondary, it hasn't been loaded yet
    const secondaryImg = mediaContainer.querySelector('img.secondary-image');
    
    if (secondaryImg && secondaryImg.hasAttribute('data-lazy-secondary')) {
      // The image was swapped but not loaded yet - that's fine
      // It will load on next hover
      return;
    }
    
    // If the image was already loaded and swapped, we need to check if it's a new one
    if (secondaryImg && secondaryImg.hasAttribute('data-src')) {
      // This is a new lazy image that hasn't been loaded
      const imageId = secondaryImg.id;
      
      // Remove from loaded set since it's a different image now
      if (loadedImages.has(imageId)) {
        loadedImages.delete(imageId);
      }
    }
  }

  /**
   * Initialize lazy loading for all product cards on the page
   */
  function initializeLazyLoading() {
    // Find all media containers with lazy secondary images
    const mediaContainers = document.querySelectorAll('[data-product-card-media]');
    
    mediaContainers.forEach(container => {
      const secondaryImg = container.querySelector('img.secondary-image[data-lazy-secondary="true"]');
      
      if (!secondaryImg) {
        return; // Skip if no lazy secondary image
      }
      
      // Remove existing listeners to avoid duplicates
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      
      // Add event listeners
      container.addEventListener('mouseenter', handleMouseEnter, { passive: true });
      container.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    });
    
    // Add listeners for color variant changes
    const colorButtons = document.querySelectorAll('.color-option');
    colorButtons.forEach(button => {
      button.removeEventListener('click', handleColorChange);
      button.addEventListener('click', handleColorChange, { passive: true });
    });
  }

  /**
   * Handle dynamic content (AJAX pagination, infinite scroll, etc.)
   */
  function observeDOMChanges() {
    // Use MutationObserver to detect new product cards
    const observer = new MutationObserver((mutations) => {
      let shouldReinitialize = false;
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Check if the added node contains product cards
            if (node.matches && (
                node.matches('[data-product-card-media]') ||
                node.querySelector('[data-product-card-media]')
            )) {
              shouldReinitialize = true;
            }
          }
        });
      });
      
      if (shouldReinitialize) {
        // Debounce reinitializations
        clearTimeout(observer._reinitTimeout);
        observer._reinitTimeout = setTimeout(() => {
          initializeLazyLoading();
        }, 100);
      }
    });
    
    // Observe the product grid for changes
    const productGrid = document.getElementById('product-grid');
    if (productGrid) {
      observer.observe(productGrid, {
        childList: true,
        subtree: true
      });
    }
  }

  /**
   * Prefetch secondary images for visible products during idle time
   * This provides a better UX by preloading images likely to be hovered
   */
  function prefetchVisibleSecondaryImages() {
    if (!('requestIdleCallback' in window)) {
      return; // Browser doesn't support idle callbacks
    }
    
    requestIdleCallback(() => {
      const mediaContainers = document.querySelectorAll('[data-product-card-media]');
      
      mediaContainers.forEach(container => {
        // Check if container is in viewport
        const rect = container.getBoundingClientRect();
        const isVisible = (
          rect.top >= -100 &&
          rect.left >= -100 &&
          rect.bottom <= (window.innerHeight + 100) &&
          rect.right <= (window.innerWidth + 100)
        );
        
        if (isVisible) {
          const secondaryImg = container.querySelector('img.secondary-image[data-lazy-secondary="true"]');
          if (secondaryImg) {
            // Prefetch with low priority
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.as = 'image';
            link.href = secondaryImg.getAttribute('data-src');
            document.head.appendChild(link);
          }
        }
      });
    }, { timeout: 2000 });
  }

  /**
   * Initialize on DOM ready
   */
  function init() {
    initializeLazyLoading();
    observeDOMChanges();
    
    // Optional: Prefetch visible images during idle time
    // Uncomment the line below if you want this feature
    // prefetchVisibleSecondaryImages();
  }

  // Run initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-initialize on Shopify section re-renders
  if (typeof Shopify !== 'undefined' && Shopify.designMode) {
    document.addEventListener('shopify:section:load', initializeLazyLoading);
  }
})();