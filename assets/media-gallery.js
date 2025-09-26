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
          // Don't scroll if the image is already in view
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

document.addEventListener("DOMContentLoaded", function () {
  const COLOR_TOKENS = ["white", "yellow", "rose"];
  const ALWAYS_SHOW_CODES = ["mq", "ci", "mh", "mv", "360v"];
  let currentSelectedColor = null;
  let isInitialized = false;
  let currentSlide = 0;
  let totalSlides = 0;
  let dotsContainer = null;
  let mediaList = null;
  let observer = null;
  let isReordering = false;
  let lastActiveSlide = null;
  let swipeDetectionInterval = null;

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

    Object.values(buckets.codes).forEach(arr => arr.forEach(node => { node.style.display = 'block'; ordered.push(node); }));
    buckets.color.forEach(node => { node.style.display = 'block'; ordered.push(node); });
    buckets.extras.forEach(node => { node.style.display = 'block'; ordered.push(node); });

    return ordered;
  }

  function reorderByColor(targetColor) {
    const { buckets, allItems } = classifyItemsByColor(targetColor);
    const ordered = buildRepeatedPattern(buckets);
    const container = allItems[0]?.parentNode;
    if (!container) return;

    const activeIndex = Array.from(container.children).findIndex(item => item.classList.contains('is-active'));

    ordered.forEach(node => container.appendChild(node));

    return ordered.findIndex(item => activeIndex >= 0 && item === allItems[activeIndex]);
  }

  function createDotsNavigation() {
    if (dotsContainer) { dotsContainer.remove(); dotsContainer = null; }
    if (!mediaList) return;

    const slides = Array.from(mediaList.querySelectorAll('.product__media-item')).filter(slide => slide.style.display !== 'none');
    totalSlides = slides.length;
    if (totalSlides <= 1) return;

    dotsContainer = document.createElement('div');
    dotsContainer.className = 'custom-slider-dots';

    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('span');
      dot.className = 'slider-dot';
      if (i === currentSlide) dot.classList.add('active');
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    }

    mediaList.parentNode.appendChild(dotsContainer);
  }

  function goToSlide(index) {
    if (index < 0 || index >= totalSlides) return;
    currentSlide = index;
    if (!mediaList) return;

    const slides = Array.from(mediaList.querySelectorAll('.product__media-item')).filter(slide => slide.style.display !== 'none');
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));

    if (dotsContainer) dotsContainer.querySelectorAll('.slider-dot').forEach((dot, i) => dot.classList.toggle('active', i === index));

    if (slides[index]) slides[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

    const activeVideo = slides[index].querySelector('video');
    if (activeVideo) {
      activeVideo.loop = true;
      activeVideo.muted = true;
      activeVideo.play().catch(() => {});
    }
  }

  // ✅ Main function to detect and sync active slide changes
  function detectAndSyncActiveSlide() {
    if (!mediaList || !dotsContainer) return;
    
    const slides = Array.from(mediaList.querySelectorAll('.product__media-item')).filter(slide => slide.style.display !== 'none');
    if (slides.length === 0) return;

    // Method 1: Check for is-active class
    let activeSlideIndex = slides.findIndex(slide => slide.classList.contains('is-active'));
    
    // Method 2: Check which slide is most visible in viewport
    if (activeSlideIndex === -1) {
      const container = mediaList;
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      
      let closestIndex = 0;
      let closestDistance = Infinity;
      
      slides.forEach((slide, index) => {
        const slideRect = slide.getBoundingClientRect();
        const slideCenter = slideRect.left + slideRect.width / 2;
        const distance = Math.abs(slideCenter - containerCenter);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      
      activeSlideIndex = closestIndex;
    }

    // Method 3: Check scroll position as fallback
    if (activeSlideIndex === -1) {
      const scrollLeft = mediaList.scrollLeft;
      const slideWidth = slides[0]?.offsetWidth || 0;
      if (slideWidth > 0) {
        activeSlideIndex = Math.round(scrollLeft / slideWidth);
      }
    }

    // Update dots if active slide changed
    if (activeSlideIndex >= 0 && activeSlideIndex !== currentSlide && activeSlideIndex < totalSlides) {
      currentSlide = activeSlideIndex;
      
      // Update dot indicators
      dotsContainer.querySelectorAll('.slider-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === activeSlideIndex);
      });
      
      // Update slide active states
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === activeSlideIndex);
      });

      console.log('✅ Synced dots - Active slide:', activeSlideIndex); // Debug log
    }
  }

  // ✅ Set up multiple detection methods
  function setupSwipeDetection() {
    if (!mediaList) return;

    // Method 1: Intersection Observer (most reliable for visibility)
    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          const slides = Array.from(mediaList.querySelectorAll('.product__media-item')).filter(slide => slide.style.display !== 'none');
          const slideIndex = slides.indexOf(entry.target);
          if (slideIndex >= 0 && slideIndex !== currentSlide) {
            currentSlide = slideIndex;
            if (dotsContainer) {
              dotsContainer.querySelectorAll('.slider-dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === slideIndex);
              });
            }
          }
        }
      });
    }, {
      root: mediaList,
      threshold: 0.5
    });

    // Observe all visible slides
    const slides = Array.from(mediaList.querySelectorAll('.product__media-item')).filter(slide => slide.style.display !== 'none');
    slides.forEach(slide => intersectionObserver.observe(slide));

    // Method 2: Scroll events
    const handleScroll = debounce(() => {
      detectAndSyncActiveSlide();
    }, 100);
    
    mediaList.addEventListener('scroll', handleScroll);

    // Method 3: Touch events
    let startX = 0;
    let endX = 0;

    mediaList.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });

    mediaList.addEventListener('touchend', (e) => {
      endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      
      if (Math.abs(diff) > 50) { // Minimum swipe distance
        setTimeout(() => {
          detectAndSyncActiveSlide();
        }, 100);
      }
    }, { passive: true });

    // Method 4: Periodic check (fallback)
    if (swipeDetectionInterval) clearInterval(swipeDetectionInterval);
    swipeDetectionInterval = setInterval(() => {
      detectAndSyncActiveSlide();
    }, 500);

    // Store observer for cleanup
    if (observer) observer.disconnect();
    observer = intersectionObserver;
  }

  function initSliderNavigation() {
    if (!mediaList) return;
    const sliderButtons = document.querySelector('.slider-buttons.quick-add-hidden');
    if (sliderButtons) sliderButtons.style.display = 'none';
    createDotsNavigation();
    setupSwipeDetection(); // ✅ Set up comprehensive swipe detection
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

    if (!mediaList) { isReordering = false; return; }
    const newActiveIndex = reorderByColor(targetColor);
    currentSlide = 0;
    initSliderNavigation();
    if (newActiveIndex >= 0) { currentSlide = newActiveIndex; goToSlide(newActiveIndex); }

    setTimeout(() => {
      playAllVideos();
      detectAndSyncActiveSlide(); // ✅ Sync after reorder
      isReordering = false;
    }, 300);

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

    setTimeout(() => {
      safeReorderByColor(selectedColor);
    }, 100); 
  }, 50);

  function setupVariantChangeListeners() {
    document.addEventListener('change', debouncedHandleColorChange);
    document.addEventListener('variant:change', debouncedHandleColorChange);
    document.addEventListener('variant:selected', debouncedHandleColorChange);
    window.addEventListener('popstate', debouncedHandleColorChange);

    if (mediaList) {
      if (observer) observer.disconnect();
      observer = new MutationObserver(() => {
        safeReorderByColor(currentSelectedColor);
      });
      observer.observe(mediaList, { childList: true, subtree: true });
    }
  }

  function cleanup() {
    if (observer) observer.disconnect();
    if (swipeDetectionInterval) clearInterval(swipeDetectionInterval);
  }

  function initialize() {
    if (isInitialized) return;
    cacheDOMElements();
    currentSelectedColor = getSelectedColor();
    safeReorderByColor(currentSelectedColor);
    playAllVideos();
    setupVariantChangeListeners();
    isInitialized = true;
  }

  initialize();

  if (window.Shopify && window.Shopify.theme) {
    document.addEventListener('shopify:section:load', () => { cleanup(); isInitialized = false; initialize(); });
    document.addEventListener('theme:loaded', initialize);
  }

  setTimeout(initialize, 1000);
  window.addEventListener('beforeunload', cleanup);
});