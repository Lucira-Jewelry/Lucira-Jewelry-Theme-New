/**
 * Secondary Image Lazy Loader on Hover
 * Loads secondary product images only when user hovers over product cards
 * Improves initial page load performance
 */

(function() {
  'use strict';

  // Track which images have been loaded
  const loadedImages = new Set();

  /**
   * Load secondary image on first hover
   */
  function loadSecondaryImage(secondaryImg) {
    // Check if already loaded
    if (loadedImages.has(secondaryImg)) return;

    const src = secondaryImg.dataset.secondarySrc;
    const srcset = secondaryImg.dataset.secondarySrcset;
    const sizes = secondaryImg.dataset.secondarySizes;

    if (!src) return;

    // Set the image sources
    secondaryImg.src = src;
    if (srcset) secondaryImg.srcset = srcset;
    if (sizes) secondaryImg.sizes = sizes;

    // Mark as loaded
    loadedImages.add(secondaryImg);

    // Clean up data attributes to save memory
    delete secondaryImg.dataset.secondarySrc;
    delete secondaryImg.dataset.secondarySrcset;
    delete secondaryImg.dataset.secondarySizes;
  }

  /**
   * Setup hover listeners on product cards
   */
  function initHoverLoaders() {
    const productCards = document.querySelectorAll('.card-wrapper');

    productCards.forEach(card => {
      const secondaryImg = card.querySelector('.secondary-image[data-secondary-src]');
      
      if (!secondaryImg) return;

      let hoverTimeout;
      let hasLoaded = false;

      // Load on mouseenter (desktop)
      card.addEventListener('mouseenter', function() {
        if (hasLoaded) return;

        // Small delay to avoid loading if user quickly moves over card
        hoverTimeout = setTimeout(() => {
          loadSecondaryImage(secondaryImg);
          hasLoaded = true;
        }, 50);
      }, { passive: true });

      // Cancel if mouse leaves before delay
      card.addEventListener('mouseleave', function() {
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
        }
      }, { passive: true });

      // For touch devices: load on touchstart
      card.addEventListener('touchstart', function() {
        if (hasLoaded) return;
        loadSecondaryImage(secondaryImg);
        hasLoaded = true;
      }, { once: true, passive: true });
    });
  }

  /**
   * Preload secondary images that are near viewport
   * Uses Intersection Observer for better performance
   */
  function preloadNearViewport() {
    if (!('IntersectionObserver' in window)) return;

    const options = {
      root: null,
      rootMargin: '300px 0px', // Load 300px before entering viewport
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const card = entry.target;
          const secondaryImg = card.querySelector('.secondary-image[data-secondary-src]');
          
          if (secondaryImg && !loadedImages.has(secondaryImg)) {
            // Delay loading slightly to prioritize visible content
            setTimeout(() => {
              loadSecondaryImage(secondaryImg);
            }, 100);
          }

          // Stop observing once loaded
          observer.unobserve(card);
        }
      });
    }, options);

    // Observe all product cards
    document.querySelectorAll('.card-wrapper').forEach(card => {
      const secondaryImg = card.querySelector('.secondary-image[data-secondary-src]');
      if (secondaryImg) {
        observer.observe(card);
      }
    });
  }

  /**
   * Initialize on DOM ready
   */
  function init() {
    initHoverLoaders();
    
    // Optional: Preload images near viewport for smoother experience
    // Comment out the line below if you want strictly hover-only loading
    preloadNearViewport();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-initialize when new products are loaded (infinite scroll, filtering, etc.)
  document.addEventListener('shopify:section:load', init);
  
  // For collection filtering/sorting
  if (window.FacetFiltersForm) {
    const originalRender = window.FacetFiltersForm.prototype.renderPage;
    window.FacetFiltersForm.prototype.renderPage = function(...args) {
      const result = originalRender.apply(this, args);
      setTimeout(init, 100); // Re-init after new products load
      return result;
    };
  }
})();