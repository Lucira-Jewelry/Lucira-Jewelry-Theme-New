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
        if (!activeMedia) return;

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

  function cacheDOMElements() {
    mediaList = document.querySelector('.product__media-list');
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
      otherColors: [],
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
        else buckets.extras.push(item);
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
    const slotPattern = ["color", "code", "code", "color", "color", "code", "code", "color", "color", "code", "code", "color"];
    const ordered = [];

    while (buckets.color.length || Object.values(buckets.codes).some(arr => arr.length)) {
      for (const slot of slotPattern) {
        let node = slot === "color" ? takeColor(buckets) : takeCode(buckets);
        if (node) {
          node.style.display = 'block';
          ordered.push(node);
        }
      }
    }

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

    const activeIndex = Array.from(container.children).findIndex(item => 
      item.classList.contains('is-active')
    );

    ordered.forEach(node => container.appendChild(node));

    return ordered.findIndex(item => 
      activeIndex >= 0 && item === allItems[activeIndex]
    );
  }

  function createDotsNavigation() {
    if (dotsContainer) {
      dotsContainer.remove();
      dotsContainer = null;
    }
    if (!mediaList) return;

    const slides = Array.from(mediaList.querySelectorAll('.product__media-item'))
      .filter(slide => slide.style.display !== 'none');

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

    const slides = Array.from(mediaList.querySelectorAll('.product__media-item'))
      .filter(slide => slide.style.display !== 'none');

    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === index);
    });

    if (dotsContainer) {
      dotsContainer.querySelectorAll('.slider-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
    }

    if (slides[index]) {
      slides[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  function initSliderNavigation() {
    if (!mediaList) return;

    const sliderButtons = document.querySelector('.slider-buttons.quick-add-hidden');
    if (sliderButtons) sliderButtons.style.display = 'none';

    createDotsNavigation();

    let startX, currentX, isDragging = false;

    const handleTouchStart = (e) => { startX = e.touches[0].clientX; isDragging = true; };
    const handleTouchMove = (e) => { if (!isDragging) return; currentX = e.touches[0].clientX; };
    const handleTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      const diff = startX - currentX;
      if (Math.abs(diff) > 50) {
        if (diff > 0 && currentSlide < totalSlides - 1) goToSlide(currentSlide + 1);
        else if (diff < 0 && currentSlide > 0) goToSlide(currentSlide - 1);
      }
    };

    const handleMouseDown = (e) => { startX = e.clientX; isDragging = true; };
    const handleMouseMove = (e) => { if (!isDragging) return; currentX = e.clientX; };
    const handleMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      const diff = startX - currentX;
      if (Math.abs(diff) > 50) {
        if (diff > 0 && currentSlide < totalSlides - 1) goToSlide(currentSlide + 1);
        else if (diff < 0 && currentSlide > 0) goToSlide(currentSlide - 1);
      }
    };

    mediaList.addEventListener('touchstart', handleTouchStart, { passive: true });
    mediaList.addEventListener('touchmove', handleTouchMove, { passive: true });
    mediaList.addEventListener('touchend', handleTouchEnd);

    mediaList.addEventListener('mousedown', handleMouseDown);
    mediaList.addEventListener('mousemove', handleMouseMove);
    mediaList.addEventListener('mouseup', handleMouseUp);
    mediaList.addEventListener('mouseleave', handleMouseUp);

    mediaList._touchStartHandler = handleTouchStart;
    mediaList._touchMoveHandler = handleTouchMove;
    mediaList._touchEndHandler = handleTouchEnd;
    mediaList._mouseDownHandler = handleMouseDown;
    mediaList._mouseMoveHandler = handleMouseMove;
    mediaList._mouseUpHandler = handleMouseUp;
  }

  function safeReorderByColor(targetColor) {
    if (!mediaList) return;
    const newActiveIndex = reorderByColor(targetColor);
    currentSlide = 0;
    initSliderNavigation();
    if (newActiveIndex >= 0) {
      currentSlide = newActiveIndex;
      goToSlide(newActiveIndex);
    }
    mediaList.setAttribute('data-media-reordered', 'true');
  }

  function getSelectedColor() {
    const colorInputs = document.querySelectorAll(
      'input[name*="Color"], input[name*="color"], ' +
      'select[name*="Color"], select[name*="color"], ' +
      'fieldset[data-type="color"] input[type="radio"]:checked, ' +
      '.variant-input-wrapper input[type="radio"]:checked'
    );

    for (const input of colorInputs) {
      if (input.checked || input.tagName === 'SELECT') {
        const color = getColorFromAlt(input.value);
        if (color) return color;
      }
    }

    const selectedVariants = document.querySelectorAll(
      '[data-selected-value], .variant-input-wrapper .selected, ' +
      '.product-form__buttons [data-value], .variant-selector__button.selected'
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

  // -------------------- Unified reorder function --------------------
  function reorderAfterSelection() {
    const selectedColor = getSelectedColor();
    if (!selectedColor || selectedColor === currentSelectedColor) return;

    console.log(`Reordering media for color: ${selectedColor}`);
    currentSelectedColor = selectedColor;
    safeReorderByColor(selectedColor);
  }

  const debouncedHandleColorChange = debounce(reorderAfterSelection, 100);

  function setupVariantChangeListeners() {
    document.addEventListener('change', function(e) {
      const target = e.target;
      if ((target.name && target.name.toLowerCase().includes('color')) ||
          target.closest('.variant-input-wrapper, .product-form__input, .variant-selector')) {
        debouncedHandleColorChange();
      }
    });

    document.addEventListener('variant:change', debouncedHandleColorChange);
    document.addEventListener('variant:selected', debouncedHandleColorChange);
    window.addEventListener('popstate', debouncedHandleColorChange);

    if (observer) observer.disconnect();

    observer = new MutationObserver(function(mutations) {
      let shouldUpdate = false;
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          const attributesOfInterest = ['data-selected-value', 'data-value', 'checked', 'selected'];
          if (attributesOfInterest.includes(mutation.attributeName)) { shouldUpdate = true; break; }
        }
        if (mutation.type === 'childList' && mutation.addedNodes.length) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1 && 
                (node.matches('.variant-input-wrapper, .product-form__input, .variant-selector') ||
                 node.querySelector('.variant-input-wrapper, .product-form__input, .variant-selector'))) {
              shouldUpdate = true; break;
            }
          }
        }
        if (shouldUpdate) break;
      }
      if (shouldUpdate) debouncedHandleColorChange();
    });

    const observeTargets = [
      document.querySelector('.product-form'),
      document.querySelector('[data-product-form]'),
      document.querySelector('.variant-selector'),
      document.querySelector('.product__info-wrapper'),
      document.body
    ].filter(Boolean);

    observeTargets.forEach(target => {
      observer.observe(target, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-selected-value', 'data-value', 'checked', 'selected']
      });
    });
  }

  function handleCustomizeConfirm() {
    document.addEventListener('click', function(e) {
      if (e.target.closest('#customize_close_drawer, .customize-close, [data-customize-close]') ||
          e.target.matches('[data-confirm], .confirm-customization, .apply-customization')) {
        setTimeout(reorderAfterSelection, 250);
      }
    });
  }

  function cleanup() {
    if (mediaList && mediaList._touchStartHandler) {
      mediaList.removeEventListener('touchstart', mediaList._touchStartHandler);
      mediaList.removeEventListener('touchmove', mediaList._touchMoveHandler);
      mediaList.removeEventListener('touchend', mediaList._touchEndHandler);
      mediaList.removeEventListener('mousedown', mediaList._mouseDownHandler);
      mediaList.removeEventListener('mousemove', mediaList._mouseMoveHandler);
      mediaList.removeEventListener('mouseup', mediaList._mouseUpHandler);
      mediaList.removeEventListener('mouseleave', mediaList._mouseUpHandler);
    }
    if (dotsContainer) { dotsContainer.remove(); dotsContainer = null; }
    if (observer) { observer.disconnect(); observer = null; }
  }

  function initialize() {
    if (isInitialized) return;
    cacheDOMElements();
    currentSelectedColor = getSelectedColor();
    console.log(`Initial color detected: ${currentSelectedColor}`);
    safeReorderByColor(currentSelectedColor);
    setupVariantChangeListeners();
    handleCustomizeConfirm();
    isInitialized = true;

    if (!document.querySelector('.product-media-reorder-initialized')) {
      const marker = document.createElement('div');
      marker.className = 'product-media-reorder-initialized';
      marker.style.display = 'none';
      document.body.appendChild(marker);
    }
  }

  initialize();
  if (window.Shopify && window.Shopify.theme) {
    document.addEventListener('shopify:section:load', function() { cleanup(); isInitialized = false; initialize(); });
    document.addEventListener('theme:loaded', initialize);
  }
  setTimeout(initialize, 1000);
  window.addEventListener('beforeunload', cleanup);
});
