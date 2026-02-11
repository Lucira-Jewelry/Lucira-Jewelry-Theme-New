(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    INTERSECTION_ROOT_MARGIN: '100px',
    DISCOUNT_COLORS: {
      35: '#009147',
      25: '#01A652',
      20: '#27B169',
      default: '#4CBC7F'
    }
  };

  /**
   * Get discount color based on percentage
   */
  function getDiscountColor(percent) {
    if (percent >= 35) return CONFIG.DISCOUNT_COLORS[35];
    if (percent >= 25) return CONFIG.DISCOUNT_COLORS[25];
    if (percent >= 20) return CONFIG.DISCOUNT_COLORS[20];
    return CONFIG.DISCOUNT_COLORS.default;
  }

  /**
   * Render discount badges from pre-calculated values
   */
  function renderDiscounts(diamondPercent, mcPercent, container) {
    // Clear any existing content
    container.innerHTML = '';
    
    if (diamondPercent === 0 && mcPercent === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';

    const flipWrapper = document.createElement('div');
    flipWrapper.className = 'flip-wrapper';
    
    if (diamondPercent > 0 && mcPercent > 0) {
      flipWrapper.classList.add('animate-flip');
    }

    if (diamondPercent > 0) {
      const diamondText = document.createElement('small');
      diamondText.className = 'discount-text';
      diamondText.style.color = getDiscountColor(diamondPercent);
      diamondText.textContent = `${diamondPercent}% OFF on Diamond Price`;
      flipWrapper.appendChild(diamondText);
    }

    if (mcPercent > 0) {
      const mcText = document.createElement('small');
      mcText.className = 'discount-text';
      mcText.style.color = getDiscountColor(mcPercent);
      mcText.textContent = `${mcPercent}% OFF on Making Charges`;
      flipWrapper.appendChild(mcText);
    }

    container.appendChild(flipWrapper);
  }

  /**
   * Load discount information from pre-calculated data attributes
   */
  function loadDiscountInfo(container) {
    const diamondPercent = parseInt(container.dataset.diamondPercent || '0', 10);
    const mcPercent = parseInt(container.dataset.mcPercent || '0', 10);
    
    renderDiscounts(diamondPercent, mcPercent, container);
  }

  /**
   * Initialize lazy discount loading with Intersection Observer
   */
  function initLazyDiscounts() {
    const discountContainers = document.querySelectorAll('.discount-container[data-diamond-percent]');
    
    if (!discountContainers.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const container = entry.target;
          
          // Load pre-calculated discounts
          loadDiscountInfo(container);
          
          // Stop observing once loaded
          observer.unobserve(container);
        }
      });
    }, {
      rootMargin: CONFIG.INTERSECTION_ROOT_MARGIN,
      threshold: 0.01
    });

    discountContainers.forEach(container => {
      observer.observe(container);
    });
  }

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
   * Handle color variant switching - UPDATED to update discount container
   */
  function initColorVariants() {
    document.addEventListener('click', function(e) {
      const colorButton = e.target.closest('.color-option');
      if (!colorButton) return;

      const variantId = colorButton.dataset.variantId;
      const imageSrc = colorButton.dataset.imageSrc;
      const imageAlt = colorButton.dataset.imageAlt;
      const discountData = colorButton.dataset.discountData;

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

      // Update discount container with variant-specific data
      const cardWrapper = colorButton.closest('.card-wrapper');
      if (cardWrapper && discountData) {
        try {
          const discount = JSON.parse(discountData.replace(/&quot;/g, '"'));
          const discountContainer = cardWrapper.querySelector('.discount-container');
          
          if (discountContainer) {
            discountContainer.dataset.diamondPercent = discount.diamondPercent || '0';
            discountContainer.dataset.mcPercent = discount.mcPercent || '0';
            discountContainer.dataset.variantId = variantId;
            
            // Clear existing content
            discountContainer.innerHTML = '';
            
            // Reload if visible
            const rect = discountContainer.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom >= 0;
            if (isVisible) {
              loadDiscountInfo(discountContainer);
            } else {
              discountContainer.style.display = 'none';
            }
          }
        } catch (e) {
          console.warn('Failed to parse discount data', e);
        }
      }

      // Update all product links with new variant
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
    });
  }

  /**
   * Initialize all optimizations
   */
  function init() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        initLazyDiscounts();
        initIconCarousels();
        initColorVariants();
      }, { timeout: 2000 });
    } else {
      setTimeout(() => {
        initLazyDiscounts();
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