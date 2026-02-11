(function() {
  'use strict';

  /**
   * Initialize icon carousel
   */
  function initIconCarousels() {
    const carousels = document.querySelectorAll('.carousel-container');
    
    carousels.forEach(carousel => {
      // Clear any existing interval
      if (carousel.dataset.intervalId) {
        clearInterval(parseInt(carousel.dataset.intervalId));
      }

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

      // Set initial state
      icons.forEach((icon, idx) => {
        icon.classList.toggle('active', idx === 0);
      });
      
      if (textContent && labels[0]) {
        textContent.textContent = labels[0];
      }

      const intervalId = setInterval(rotateIcons, 3000);
      carousel.dataset.intervalId = intervalId;
    });
  }

  /**
   * Handle color variant switching - UPDATED to preserve discount strip
   */
  function initColorVariants() {
    document.addEventListener('click', function(e) {
      const colorButton = e.target.closest('.color-option');
      if (!colorButton) return;

      const variantId = colorButton.dataset.variantId;
      const imageSrc = colorButton.dataset.imageSrc;
      const imageAlt = colorButton.dataset.imageAlt;

      // Update active state
      const siblings = colorButton.parentElement.querySelectorAll('.color-option');
      siblings.forEach(btn => btn.classList.remove('active'));
      colorButton.classList.add('active');

      // Update primary image
      if (imageSrc) {
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
          try {
            const url = new URL(link.href, window.location.origin);
            url.searchParams.set('variant', variantId);
            link.href = url.toString();
          } catch (e) {
            // Ignore invalid URLs
          }
        });
      }
      
      // Note: Discount strip content is handled by Liquid on page load
      // No need to update via JavaScript - each variant button should link to 
      // the correct variant URL which will have its own pre-calculated discounts
    });
  }

  /**
   * Initialize all optimizations
   */
  function init() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        initIconCarousels();
        initColorVariants();
      }, { timeout: 2000 });
    } else {
      setTimeout(() => {
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
  document.addEventListener('shopify:section:select', init);
  document.addEventListener('shopify:block:select', init);

})();