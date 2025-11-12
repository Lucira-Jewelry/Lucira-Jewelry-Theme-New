if (!customElements.get('media-gallery')) {
  customElements.define(
    'media-gallery',
    class MediaGallery extends HTMLElement {
      constructor() {
        super();
        this.elements = {
          liveRegion: this.querySelector('[id^="GalleryStatus"]'),
          viewer: this.querySelector('[id^="GalleryViewer"]'),
          thumbnails: this.querySelector('[id^="GalleryThumbnails"]'),
        };
        this.mql = window.matchMedia('(min-width: 750px)');
        if (!this.elements.thumbnails) return;

        this.elements.viewer.addEventListener('slideChanged', debounce(this.onSlideChanged.bind(this), 500));
        this.elements.thumbnails.querySelectorAll('[data-target]').forEach((mediaToSwitch) => {
          mediaToSwitch
            .querySelector('button')
            .addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false));
        });
        if (this.dataset.desktopLayout.includes('thumbnail') && this.mql.matches) this.removeListSemantic();
      }

      onSlideChanged(event) {
        const thumbnail = this.elements.thumbnails.querySelector(
          `[data-target="${event.detail.currentElement.dataset.mediaId}"]`
        );
        this.setActiveThumbnail(thumbnail);
      }

      setActiveMedia(mediaId, prepend) {
        const activeMedia =
          this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`) ||
          this.elements.viewer.querySelector('[data-media-id]');
        if (!activeMedia) {
          return;
        }
        this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
          element.classList.remove('is-active');
        });
        activeMedia?.classList?.add('is-active');

        if (prepend) {
          activeMedia.parentElement.firstChild !== activeMedia && activeMedia.parentElement.prepend(activeMedia);

          if (this.elements.thumbnails) {
            const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
            activeThumbnail.parentElement.firstChild !== activeThumbnail && activeThumbnail.parentElement.prepend(activeThumbnail);
          }

          if (this.elements.viewer.slider) this.elements.viewer.resetPages();
        }

        this.preventStickyHeader();
        window.setTimeout(() => {
          if (!this.mql.matches || this.elements.thumbnails) {
            activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft });
          }
          const activeMediaRect = activeMedia.getBoundingClientRect();
          if (activeMediaRect.top > -0.5) return;
          const top = activeMediaRect.top + window.scrollY;
          window.scrollTo({ top: top, behavior: 'smooth' });
        });
        this.playActiveMedia(activeMedia);

        if (!this.elements.thumbnails) return;
        const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
        this.setActiveThumbnail(activeThumbnail);
        this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);
      }

      setActiveThumbnail(thumbnail) {
        if (!this.elements.thumbnails || !thumbnail) return;

        this.elements.thumbnails
          .querySelectorAll('button')
          .forEach((element) => element.removeAttribute('aria-current'));
        thumbnail.querySelector('button').setAttribute('aria-current', true);
        if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

        this.elements.thumbnails.slider.scrollTo({ left: thumbnail.offsetLeft });
      }

      announceLiveRegion(activeItem, position) {
        const image = activeItem.querySelector('.product__modal-opener--image img');
        if (!image) return;
        image.onload = () => {
          this.elements.liveRegion.setAttribute('aria-hidden', false);
          this.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace('[index]', position);
          setTimeout(() => {
            this.elements.liveRegion.setAttribute('aria-hidden', true);
          }, 2000);
        };
        image.src = image.src;
      }

      playActiveMedia(activeItem) {
        window.pauseAllMedia();
        const deferredMedia = activeItem.querySelector('.deferred-media');
        if (deferredMedia) deferredMedia.loadContent(false);
      }

      preventStickyHeader() {
        this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
        if (!this.stickyHeader) return;
        this.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
      }

      removeListSemantic() {
        if (!this.elements.viewer.slider) return;
        this.elements.viewer.slider.setAttribute('role', 'presentation');
        this.elements.viewer.sliderItems.forEach((slide) => slide.setAttribute('role', 'presentation'));
      }
    }
  );
}

(function() {
  const COLOR_TOKENS = ["white", "yellow", "rose", "Plt"];
  const ALWAYS_SHOW_CODES = ["mq", "mh", "ci", "mv", "360v"];
  let currentSelectedColor = null;
  let isInitialized = false;
  let currentSlide = 0;
  let totalSlides = 0;
  let dotsContainer = null;
  let mediaList = null;
  let observer = null;
  let isReordering = false;
  let visibleSlides = [];
  
  let touchStartX = 0;
  let touchEndX = 0;
  let isSwiping = false;
  let isTransitioning = false;

  function cacheDOMElements() {
    mediaList = document.querySelector('.product__media-list');
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function getColorFromAlt(text) {
    const lower = (text || "").toLowerCase();
    if (lower.includes("white")) return "white";
    if (lower.includes("yellow")) return "yellow";
    if (lower.includes("rose")) return "rose";
    if (lower.includes("plt") || lower.includes("platinum")) return "plt";
    return "";
  }

  function classifyItemsByColor(targetColor) {
    const items = Array.from(document.querySelectorAll(".product__media-item"));
    const buckets = {
      color: [],
      codes: { mq: [], ci: [], mh: [], mv: [], v360: [] },
      extras: []
    };

    items.forEach(item => {
      const img = item.querySelector("img");
      const alt = (img?.alt || "").toLowerCase();
      const itemColor = getColorFromAlt(alt);
      const isAnyColor = COLOR_TOKENS.some(c => alt.includes(c));

      if (itemColor === targetColor || (!isAnyColor && ALWAYS_SHOW_CODES.some(code => alt.includes(code)))) {
        if (alt.includes("mq")) buckets.codes.mq.push(item);
        else if (alt.includes("ci")) buckets.codes.ci.push(item);
        else if (alt.includes("mh")) buckets.codes.mh.push(item);
        else if (alt.includes("mv")) buckets.codes.mv.push(item);
        else if (alt.includes("360v") || alt.includes("360°")) buckets.codes.v360.push(item);
        else if (itemColor === targetColor) buckets.color.push(item);
      } else {
        item.style.display = 'none';
      }
    });

    return { buckets, allItems: items };
  }

  function takeColor(buckets) {
    return buckets.color.length ? buckets.color.shift() : null;
  }

  function takeCode(buckets) {
    for (const key of ALWAYS_SHOW_CODES) {
      const k = key === "360v" ? "v360" : key;
      if (buckets.codes[k].length) return buckets.codes[k].shift();
    }
    return null;
  }

  function buildRepeatedPattern(buckets) {
    const slotPattern = [
      "color", "code", "code",
      "color", "color", "code", "code",
      "color", "color", "code", "code",
      "color"
    ];
    const ordered = [];

    for (const slot of slotPattern) {
      let node = slot === "color" ? takeColor(buckets) : takeCode(buckets);
      if (node) {
        node.style.display = 'block';
        ordered.push(node);
      }
    }

    Object.values(buckets.codes).forEach(arr => arr.forEach(node => { 
      node.style.display = 'block'; 
      ordered.push(node); 
    }));
    buckets.color.forEach(node => { 
      node.style.display = 'block'; 
      ordered.push(node); 
    });
    buckets.extras.forEach(node => { 
      node.style.display = 'block'; 
      ordered.push(node); 
    });

    return ordered;
  }

  function reorderByColor(targetColor) {
    const { buckets, allItems } = classifyItemsByColor(targetColor);
    const ordered = buildRepeatedPattern(buckets);
    const container = allItems[0]?.parentNode;
    if (!container) return;

    const fragment = document.createDocumentFragment();
    ordered.forEach(node => fragment.appendChild(node));
    container.appendChild(fragment);

    return ordered;
  }

  function getVisibleSlides() {
    if (!mediaList) return [];
    return Array.from(mediaList.querySelectorAll('.product__media-item'))
      .filter(slide => slide.style.display !== 'none');
  }

  function createDotsNavigation() {
    if (dotsContainer) { 
      dotsContainer.remove(); 
      dotsContainer = null; 
    }
    if (!mediaList) return;

    visibleSlides = getVisibleSlides();
    totalSlides = visibleSlides.length;
    
    if (totalSlides <= 1) return;

    dotsContainer = document.createElement('div');
    dotsContainer.className = 'custom-slider-dots';

    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('button'); // better for a11y
      dot.className = 'slider-dot';
      dot.type = 'button';
      dot.dataset.index = i;

      const slide = visibleSlides[i];
      const isVideo = !!slide && (slide.querySelector('video') || slide.querySelector('.video'));
      const baseLabel = `Slide ${i + 1} of ${totalSlides}`;
      dot.setAttribute('aria-label', isVideo ? `${baseLabel}, video` : baseLabel);

      if (i === currentSlide) {
        dot.classList.add('active');
        dot.setAttribute('aria-current', 'true');
      }

      // inner dot visual
      const dotInner = document.createElement('span');
      dotInner.className = 'slider-dot__inner';
      dot.appendChild(dotInner);

      // video icon placed centered inside the dot when slide has video
      if (isVideo) {
        const videoIcon = document.createElement('span');
        videoIcon.className = 'slider-dot__video-icon';
        videoIcon.innerHTML = `
          <svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true" focusable="false">
            <path d="M4 2v20l18-10L4 2z" fill="currentColor"/>
          </svg>
        `;
        dot.appendChild(videoIcon);
      }

      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    }
    
    // center the dots container relative to the media area
    const parent = mediaList.parentNode;
    parent.appendChild(dotsContainer);
  }



  function updateDots() {
    if (!dotsContainer) return;
    const dots = dotsContainer.querySelectorAll('.slider-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });
  }

  function setActiveSlide(index) {
    visibleSlides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === index);
    });
  }

  function goToSlide(index) {
    if (index < 0 || index >= totalSlides || isReordering) return;
    
    currentSlide = index;
    visibleSlides = getVisibleSlides();
    
    // Update slide classes
    setActiveSlide(currentSlide);
    
    // Update dots
    updateDots();

    // Scroll to slide
    const targetSlide = visibleSlides[currentSlide];
    if (targetSlide) {
      // Temporarily disable scroll sync during programmatic scroll
      const scrollHandler = () => {
        targetSlide.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest', 
          inline: 'center' 
        });
      };
      
      scrollHandler();

      // Play video if present
      const activeVideo = targetSlide.querySelector('video');
      if (activeVideo) {
        activeVideo.loop = true;
        activeVideo.muted = true;
        activeVideo.play().catch(() => {});
      }
    }
  }

  function nextSlide() {
    const nextIndex = (currentSlide + 1) % totalSlides;
    goToSlide(nextIndex);
  }

  function prevSlide() {
    const prevIndex = (currentSlide - 1 + totalSlides) % totalSlides;
    goToSlide(prevIndex);
  }

  function setupSwipeDetection() {
    if (!mediaList) return;
    
    const handleSwipe = () => {
      if (!isSwiping) return;
      isSwiping = false;
      
      const swipeThreshold = 50;
      const diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      } else {
        // Small swipe, sync to nearest slide
        setTimeout(() => syncSlideFromScroll(), 200);
      }
    };
    
    mediaList.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      isSwiping = true;
    }, { passive: true });

    mediaList.addEventListener('touchmove', (e) => {
      if (!isSwiping) return;
      touchEndX = e.changedTouches[0].screenX;
    }, { passive: true });

    mediaList.addEventListener('touchend', handleSwipe, { passive: true });
  }

  // Detect scroll-based slide changes
  function setupScrollSync() {
    if (!mediaList) return;
    
    let scrollTimeout;
    let isManualScroll = false;
    
    mediaList.addEventListener('scrollstart', () => {
      isManualScroll = true;
    }, { passive: true });
    
    mediaList.addEventListener('scroll', () => {
      if (isReordering) return;
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (!isReordering) {
          syncSlideFromScroll();
        }
        isManualScroll = false;
      }, 100);
    }, { passive: true });
  }

  function syncSlideFromScroll() {
    if (!mediaList || isReordering || isSwiping) return;
    
    const currentVisibleSlides = getVisibleSlides();
    if (currentVisibleSlides.length === 0) return;

    const containerRect = mediaList.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;

    let closestIndex = currentSlide; // Start with current instead of 0
    let closestDistance = Infinity;

    currentVisibleSlides.forEach((slide, index) => {
      const slideRect = slide.getBoundingClientRect();
      const slideCenter = slideRect.left + slideRect.width / 2;
      const distance = Math.abs(slideCenter - containerCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    // Only update if actually changed
    if (closestIndex !== currentSlide && closestDistance < containerRect.width * 0.6) {
      currentSlide = closestIndex;
      visibleSlides = currentVisibleSlides;
      setActiveSlide(currentSlide);
      updateDots();
    }
  }

  function initSliderNavigation() {
    if (!mediaList) return;
    
    const sliderButtons = document.querySelector('.slider-buttons.quick-add-hidden');
    if (sliderButtons) sliderButtons.style.display = 'none';
    
    createDotsNavigation();
    setupSwipeDetection();
    setupScrollSync();
  }

  function playAllVideos() {
    if (!mediaList) return;
    const videos = mediaList.querySelectorAll('video');
    videos.forEach(video => {
      video.loop = true;
      video.muted = true;
      video.play().catch(() => {});
    });
  }

  function safeReorderByColor(targetColor) {
    if (isReordering) return;
    isReordering = true;

    if (!mediaList) { 
      isReordering = false; 
      return; 
    }

    // Store current slide index before reordering
    const previousSlide = currentSlide;
    
    reorderByColor(targetColor);
    
    // Reset to first slide only on color change
    currentSlide = 0;
    
    initSliderNavigation();
    
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      goToSlide(currentSlide);
      playAllVideos();
      isReordering = false;
    }, 150);

    mediaList.setAttribute('data-media-reordered', 'true');
  }

  function getSelectedColor() {
    const colorInputs = document.querySelectorAll(
      'input[name*="Color"], input[name*="color"], select[name*="Color"], select[name*="color"], fieldset[data-type="color"] input[type="radio"]:checked, .variant-input-wrapper input[type="radio"]:checked'
    );
    for (const input of colorInputs) {
      if (input.checked || input.tagName === 'SELECT') {
        const color = getColorFromAlt(input.value);
        if (color) return color;
      }
    }
    const selectedVariants = document.querySelectorAll(
      '[data-selected-value], .variant-input-wrapper .selected, .product-form__buttons [data-value], .variant-selector__button.selected'
    );
    for (const element of selectedVariants) {
      const text = element.textContent || element.getAttribute('data-value') || element.getAttribute('data-selected-value');
      const color = getColorFromAlt(text);
      if (color) return color;
    }
    const urlParams = new URLSearchParams(window.location.search);
    const colorParam = urlParams.get('color') || urlParams.get('Color');
    if (colorParam) return getColorFromAlt(colorParam);
    return "yellow";
  }

  const debouncedHandleColorChange = debounce(function () {
    const selectedColor = getSelectedColor();
    if (!selectedColor || selectedColor === currentSelectedColor) return;

    currentSelectedColor = selectedColor;
    safeReorderByColor(selectedColor);
  }, 100);

  function setupVariantChangeListeners() {
    document.addEventListener('change', debouncedHandleColorChange);
    document.addEventListener('variant:change', debouncedHandleColorChange);
    document.addEventListener('variant:selected', debouncedHandleColorChange);
    window.addEventListener('popstate', debouncedHandleColorChange);

    if (mediaList) {
      if (observer) observer.disconnect();
      observer = new MutationObserver(() => {
        if (!isReordering) {
          safeReorderByColor(currentSelectedColor);
        }
      });
      observer.observe(mediaList, { childList: true, subtree: true });
    }
  }

  function cleanup() {
    if (observer) observer.disconnect();
    document.removeEventListener('change', debouncedHandleColorChange);
    document.removeEventListener('variant:change', debouncedHandleColorChange);
    document.removeEventListener('variant:selected', debouncedHandleColorChange);
    window.removeEventListener('popstate', debouncedHandleColorChange);
  }

  function initialize() {
    if (isInitialized) return;
    
    cacheDOMElements();
    if (!mediaList) return;

    currentSelectedColor = getSelectedColor();
    
    const wrapper = mediaList.closest('.media-gallery-wrapper');
    if (wrapper) {
      wrapper.classList.add('loaded');
    }

    safeReorderByColor(currentSelectedColor);
    playAllVideos();
    setupVariantChangeListeners();
    isInitialized = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  if (window.Shopify && window.Shopify.theme) {
    document.addEventListener('shopify:section:load', () => { 
      cleanup(); 
      isInitialized = false; 
      initialize(); 
    });
    document.addEventListener('theme:loaded', initialize);
  }

  window.addEventListener('beforeunload', cleanup);
})();


document.addEventListener('DOMContentLoaded', () => {
  const deferredButtons = document.querySelectorAll('.deferred-media__poster');

  deferredButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const wrapper = button.closest('deferred-media');
      if (!wrapper) return;

      // Wait for Shopify to inject the video iframe or video element
      setTimeout(() => {
        const iframe = wrapper.querySelector('iframe');
        const video = wrapper.querySelector('video');

        // --- YouTube or Vimeo ---
        if (iframe) {
          const src = iframe.getAttribute('src') || '';
          if (!src.includes('autoplay=1')) {
            const connector = src.includes('?') ? '&' : '?';
            iframe.setAttribute('src', `${src}${connector}autoplay=1`);
          }
        }

        // --- Native <video> ---
        if (video) {
          video.muted = true; // browsers block autoplay without mute
          video.play().catch((err) => console.warn('Autoplay blocked:', err));
        }
      }, 300); // small delay ensures the iframe/video is added
    });
  });
});

