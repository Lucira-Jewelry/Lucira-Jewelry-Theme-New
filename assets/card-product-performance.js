class ProductCardPerformance {
  constructor() {
    this.init();
  }

  init() {
    // Use requestIdleCallback for non-critical initialization
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => this.setupCards(), { timeout: 2000 });
    } else {
      setTimeout(() => this.setupCards(), 200);
    }
  }

  async setupCards() {
    const cards = document.querySelectorAll('.product-card-wrapper[data-product-id]');
    
    // Use Intersection Observer for lazy processing
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.processCard(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '200px' });
      
      cards.forEach(card => observer.observe(card));
    } else {
      // Fallback: process all cards
      for (const card of cards) {
        await this.processCard(card);
      }
    }
  }

  async processCard(card) {
    try {
      const productId = card.dataset.productId;
      const productHandle = card.dataset.productHandle;
      const firstVariantId = card.dataset.firstVariant;
      const is9kt = card.dataset.is9kt === 'true';
      const currentCollection = this.getCurrentCollection();
      
      // Parse product data once
      const productData = JSON.parse(decodeURIComponent(card.dataset.productJson));
      
      // Run all enhancements in parallel
      await Promise.all([
        this.setupImages(card, productData, firstVariantId),
        this.setupColorVariants(card, productData, is9kt, currentCollection),
        this.setupDiscounts(card, productData, firstVariantId),
        this.setupTags(card, productData, is9kt, currentCollection),
        this.setupVideoIcon(card, productData)
      ]);
      
    } catch (error) {
      console.debug('Product card processing error:', error);
    }
  }

  setupImages(card, productData, firstVariantId) {
    const primaryImg = card.querySelector('[data-primary]');
    const secondaryImg = card.querySelector('[data-secondary]');
    
    if (!primaryImg) return;
    
    // Find variant-specific images
    const firstVariant = productData.variants.find(v => v.id == firstVariantId);
    
    // Try to find MQ image
    const mqImage = productData.media?.find(m => 
      m.alt?.toLowerCase() === 'mq' && m.id !== productData.featured_media?.id
    );
    
    // Set secondary image
    if (mqImage) {
      this.setImageSrc(secondaryImg, mqImage);
      secondaryImg.style.display = 'block';
    }
    
    // Store image data for color variant switching
    card.imageData = {
      primary: primaryImg.src,
      variantImages: this.extractVariantImages(productData)
    };
  }

  setupColorVariants(card, productData, is9kt, currentCollection) {
    const colorContainer = card.querySelector('[data-color-container]');
    if (!colorContainer || !productData.variants) return;
    
    // Skip if on 9kt collection and product is 9kt
    if (currentCollection === '9kt-collection' && is9kt) {
      return;
    }
    
    const colors = ['Yellow Gold', 'Rose Gold', 'White Gold', 'Platinum'];
    const processed = new Set();
    let html = '';
    
    for (const variant of productData.variants) {
      const variantTitle = variant.title.toLowerCase();
      
      for (const color of colors) {
        if (processed.has(color)) continue;
        
        if (variantTitle.includes(color.toLowerCase())) {
          const variantMedia = productData.media?.find(m => m.id === variant.featured_media);
          const icon = this.getColorIcon(color);
          
          html += `
            <button class="color-option${processed.size === 0 ? ' active' : ''}"
                    data-variant-id="${variant.id}"
                    data-product-id="${productData.id}"
                    data-image-src="${variantMedia?.src || ''}"
                    title="${color}">
              <img src="${icon}" alt="${color}" width="20" height="20" loading="lazy">
            </button>
          `;
          
          processed.add(color);
          break;
        }
      }
    }
    
    colorContainer.innerHTML = html;
    
    // Add click handler
    colorContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.color-option');
      if (!btn) return;
      
      e.preventDefault();
      
      // Update active state
      colorContainer.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update image if available
      const imgSrc = btn.dataset.imageSrc;
      if (imgSrc) {
        const primaryImg = card.querySelector('[data-primary]');
        if (primaryImg) {
          primaryImg.src = imgSrc;
          primaryImg.srcset = `${imgSrc} 1x, ${imgSrc.replace('width=400', 'width=800')} 2x`;
        }
      }
      
      // Update product link
      const links = card.querySelectorAll('a[href*="variant="]');
      const variantId = btn.dataset.variantId;
      links.forEach(link => {
        link.href = link.href.replace(/variant=\d+/, `variant=${variantId}`);
      });
    });
  }

  async setupDiscounts(card, productData, firstVariantId) {
    const discountContainer = card.querySelector('[data-discount-container] .flip-wrapper');
    if (!discountContainer) return;
    
    const variant = productData.variants?.find(v => v.id == firstVariantId) || productData.variants?.[0];
    if (!variant) return;
    
    // Get metafield data
    const variantConfig = productData.metafields?.['DI-GoldPrice']?.variant_config?.value;
    
    if (variantConfig) {
      const diamondDiscount = variantConfig.diamond_discount || 0;
      const mcDiscount = variantConfig.making_charges_discount || 0;
      
      let html = '';
      
      if (diamondDiscount > 0) {
        html += `<small class="discount-text" style="color: ${this.getDiscountColor(diamondDiscount)};">${diamondDiscount}% OFF on Diamond Price</small>`;
      }
      
      if (mcDiscount > 0) {
        html += `<small class="discount-text" style="color: ${this.getDiscountColor(mcDiscount)};">${mcDiscount}% OFF on Making Charges</small>`;
      }
      
      discountContainer.innerHTML = html;
      
      // Animate if both discounts exist
      if (diamondDiscount > 0 && mcDiscount > 0) {
        this.animateDiscounts(discountContainer);
      }
    }
  }

  setupTags(card, productData, is9kt, currentCollection) {
    const tagsContainer = card.querySelector('[data-tags-container]');
    if (!tagsContainer) return;
    
    let html = '<div class="carousel-container"><div class="icon-container">';
    let labels = [];
    
    // Check for fast shipping
    let showFastShipping = false;
    
    if (currentCollection === '9kt-collection') {
      // On 9kt collection: show only if 9kt variants in stock
      showFastShipping = productData.variants?.some(v => 
        v.available && v.inventory_quantity > 0 && 
        (v.title.toLowerCase().includes('9kt') || v.title.toLowerCase().includes('9 kt'))
      ) || false;
    } else {
      // Default: show if any variant in stock
      showFastShipping = productData.variants?.some(v => 
        v.available && v.inventory_quantity > 0
      ) || false;
    }
    
    if (showFastShipping) {
      html += `<img src="https://cdn.shopify.com/s/files/1/0739/8516/3482/files/Fast_Box.svg?v=1752218539" 
                    class="icon active" width="16" height="16" 
                    alt="Fast Shipping" title="Fast Shipping" data-tag-type="shipping">`;
      labels.push('Fast Shipping');
    }
    
    // Check for engraving
    if (productData.tags?.includes('Engraving Available')) {
      html += `<img src="https://www.lucirajewelry.com/cdn/shop/files/draw_1_50x.png?v=1751278108" 
                    class="icon" width="16" height="16" 
                    alt="Engraving" title="Engraving" data-tag-type="engraving">`;
      labels.push('Engraving');
    }
    
    html += `</div><div class="text-content">${labels[0] || ''}</div></div>`;
    tagsContainer.innerHTML = html;
    
    // Setup icon rotation if multiple tags
    if (labels.length > 1) {
      this.rotateTags(tagsContainer, labels);
    }
  }

  setupVideoIcon(card, productData) {
    const video = productData.media?.find(m => m.media_type === 'video');
    if (!video) return;
    
    const videoHtml = `
      <div class="product-video-icon-wrapper" 
           data-product-handle="${productData.handle}"
           data-video-id="${video.id}">
        <img src="https://cdn.shopify.com/s/files/1/0739/8516/3482/files/play_circle.svg?v=1753099595"
             width="28" height="28" loading="lazy"
             alt="Play product video" title="Play product video"
             class="product-video-icon">
      </div>
    `;
    
    card.querySelector('.card__media')?.insertAdjacentHTML('afterend', videoHtml);
  }

  // Helper Methods
  getCurrentCollection() {
    return document.body.dataset.collection || '';
  }

  getColorIcon(color) {
    const icons = {
      'Yellow Gold': 'Yellow_Gold.svg',
      'Rose Gold': 'Rose_Gold.svg',
      'White Gold': 'White_Gold.svg',
      'Platinum': 'Platinum.svg'
    };
    return `https://cdn.shopify.com/s/files/1/0739/8516/3482/files/${icons[color]}?v=1752822068`;
  }

  getDiscountColor(percent) {
    percent = parseInt(percent);
    if (percent >= 35) return '#009147';
    if (percent >= 25) return '#01A652';
    if (percent >= 20) return '#27B169';
    return '#4CBC7F';
  }

  setImageSrc(img, mediaData) {
    if (!img || !mediaData) return;
    img.src = mediaData.src || `${mediaData.preview_image?.src}&width=400`;
    img.srcset = `${img.src} 1x, ${img.src.replace('width=400', 'width=800')} 2x`;
    img.alt = mediaData.alt || '';
  }

  extractVariantImages(productData) {
    const images = {};
    productData.variants?.forEach(v => {
      if (v.featured_media) {
        const media = productData.media?.find(m => m.id === v.featured_media);
        if (media) {
          images[v.id] = media.src;
        }
      }
    });
    return images;
  }

  animateDiscounts(container) {
    const discounts = container.children;
    if (discounts.length < 2) return;
    
    container.classList.add('animate-flip');
    let showFirst = true;
    
    setInterval(() => {
      discounts[0]?.style.setProperty('display', showFirst ? 'block' : 'none');
      discounts[1]?.style.setProperty('display', showFirst ? 'none' : 'block');
      showFirst = !showFirst;
    }, 3000);
  }

  rotateTags(container, labels) {
    const iconContainer = container.querySelector('.icon-container');
    const textContainer = container.querySelector('.text-content');
    let currentIndex = 0;
    
    setInterval(() => {
      // Update active icon
      iconContainer?.querySelectorAll('.icon').forEach((icon, index) => {
        icon.classList.toggle('active', index === currentIndex);
      });
      
      // Update text
      if (textContainer) {
        textContainer.textContent = labels[currentIndex];
      }
      
      currentIndex = (currentIndex + 1) % labels.length;
    }, 3000);
  }
}

// Single initialization point
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.productCardPerformance = new ProductCardPerformance();
  });
} else {
  window.productCardPerformance = new ProductCardPerformance();
}