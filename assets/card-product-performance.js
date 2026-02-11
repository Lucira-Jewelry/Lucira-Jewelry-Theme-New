(function() {
  'use strict';

  /**
   * Initialize icon carousel - EXACTLY as in your original JS
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
   * Handle color variant switching - EXACTLY as in your original JS
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
})();