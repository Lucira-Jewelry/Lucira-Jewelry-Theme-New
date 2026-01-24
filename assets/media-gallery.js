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
        this.elements.thumbnails.querySelectorAll('button').forEach((element) => element.removeAttribute('aria-current'));
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
  let isReordering = false;
  let visibleSlides = [];
  let isSwiping = false;

  const isMobile = () => window.innerWidth < 750;

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
    const buckets = { color: [], codes: { mq: [], ci: [], mh: [], mv: [], v360: [] }, extras: [] };

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
      }
    });
    return { buckets, allItems: items };
  }

  function takeColor(buckets) { return buckets.color.length ? buckets.color.shift() : null; }
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
    for (const slot of slotPattern) {
      let node = slot === "color" ? takeColor(buckets) : takeCode(buckets);
      if (node) { node.style.display = 'block'; ordered.push(node); }
    }
    Object.values(buckets.codes).forEach(arr => arr.forEach(node => { node.style.display = 'block'; ordered.push(node); }));
    buckets.color.forEach(node => { node.style.display = 'block'; ordered.push(node); });
    return ordered;
  }

  function reorderByColor(targetColor) {
    const { buckets, allItems } = classifyItemsByColor(targetColor);
    const ordered = buildRepeatedPattern(buckets);
    const container = allItems[0]?.parentNode;
    if (!container) return;

    // FIX 1: Hide all items immediately to prevent "wrong" images showing during move
    allItems.forEach(item => item.style.display = 'none');

    // FIX 2: Set high priority on the new first image
    if (ordered.length > 0) {
      const firstImg = ordered[0].querySelector('img');
      if (firstImg) {
        firstImg.setAttribute('loading', 'eager');
        firstImg.setAttribute('fetchpriority', 'high');
      }
      ordered.forEach(node => node.style.display = 'block');
    }

    // FIX 3: Atomic reorder using DocumentFragment
    const fragment = document.createDocumentFragment();
    ordered.forEach(node => fragment.appendChild(node));
    container.appendChild(fragment);
    
    return ordered;
  }

  function getVisibleSlides() {
    if (!mediaList) return [];
    return Array.from(mediaList.querySelectorAll('.product__media-item')).filter(slide => slide.style.display !== 'none');
  }

  function createDotsNavigation() {
    if (dotsContainer) { dotsContainer.remove(); dotsContainer = null; }
    if (!mediaList || !isMobile()) return;

    visibleSlides = getVisibleSlides();
    totalSlides = visibleSlides.length;
    if (totalSlides <= 1) return;

    dotsContainer = document.createElement('div');
    dotsContainer.className = 'custom-slider-dots';

    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('button');
      dot.className = 'slider-dot';
      dot.type = 'button';
      dot.dataset.index = i;
      if (i === currentSlide) { dot.classList.add('active'); dot.setAttribute('aria-current', 'true'); }
      const dotInner = document.createElement('span');
      dotInner.className = 'slider-dot__inner';
      dot.appendChild(dotInner);
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    }
    mediaList.parentNode.appendChild(dotsContainer);
  }

  function updateDots() {
    if (!dotsContainer) return;
    const dots = dotsContainer.querySelectorAll('.slider-dot');
    dots.forEach((dot, i) => {
      const isActive = i === currentSlide;
      dot.classList.toggle('active', isActive);
      isActive ? dot.setAttribute('aria-current', 'true') : dot.removeAttribute('aria-current');
    });
  }

  function goToSlide(index) {
    if (index < 0 || index >= totalSlides || isReordering || isSwiping || !isMobile()) return;
    
    isSwiping = true;
    currentSlide = index;
    visibleSlides = getVisibleSlides();
    updateDots();

    const targetSlide = visibleSlides[currentSlide];
    if (targetSlide && mediaList) {
      const targetScrollLeft = targetSlide.offsetLeft - (mediaList.clientWidth / 2) + (targetSlide.clientWidth / 2);
      mediaList.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
    }
    setTimeout(() => { isSwiping = false; }, 500);
  }

  function moveSlide(direction) {
    let nextIndex = currentSlide + direction;
    if (nextIndex < 0) nextIndex = totalSlides - 1;
    else if (nextIndex >= totalSlides) nextIndex = 0;
    goToSlide(nextIndex);
  }

  function setupSwipeDetection() {
    if (!mediaList) return;
    let startX = 0, startY = 0, isTouching = false;

    mediaList.addEventListener('touchstart', (e) => {
      if (isSwiping || !isMobile()) return;
      startX = e.touches[0].clientX; 
      startY = e.touches[0].clientY;
      isTouching = true;
    }, { passive: true });

    mediaList.addEventListener('touchend', (e) => {
      if (!isTouching || !isMobile()) return;
      isTouching = false;
      const diffX = startX - e.changedTouches[0].clientX;
      const diffY = startY - e.changedTouches[0].clientY;
      if (Math.abs(diffY) > Math.abs(diffX) || Math.abs(diffX) < 40) return;
      diffX > 0 ? moveSlide(1) : moveSlide(-1);
    }, { passive: true });
  }

  function initSliderNavigation() {
    if (!mediaList) return;
    if (isMobile()) {
      mediaList.style.overflowX = 'hidden';
      mediaList.style.display = 'flex';
      mediaList.style.gap = '0';
      mediaList.style.scrollSnapType = 'none';
      mediaList.style.touchAction = 'pan-y pinch-zoom';

      const slides = getVisibleSlides();
      slides.forEach(slide => {
        slide.style.minWidth = '100%';
        slide.style.width = '100%';
        slide.style.margin = '0';
        slide.style.flexShrink = '0';
      });
      createDotsNavigation();
    } else {
      mediaList.style.overflowX = '';
      mediaList.style.display = '';
      mediaList.style.gap = '';
      mediaList.style.scrollSnapType = '';
      const slides = Array.from(mediaList.querySelectorAll('.product__media-item'));
      slides.forEach(slide => {
        slide.style.minWidth = ''; slide.style.width = ''; slide.style.margin = ''; slide.style.flexShrink = '';
      });
      if (dotsContainer) dotsContainer.remove();
    }
    setupSwipeDetection();
  }

  function safeReorderByColor(targetColor) {
    if (isReordering || !mediaList) return;
    isReordering = true;
    reorderByColor(targetColor);
    currentSlide = 0;
    initSliderNavigation();
    setTimeout(() => {
      if (mediaList && isMobile()) mediaList.scrollTo({ left: 0 });
      isReordering = false;
    }, 150);
  }

  function getSelectedColor() {
    const colorInputs = document.querySelectorAll('input[name*="Color"], input[name*="color"], select[name*="Color"], fieldset[data-type="color"] input:checked');
    for (const input of colorInputs) {
      if (input.checked || input.tagName === 'SELECT') {
        const color = getColorFromAlt(input.value);
        if (color) return color;
      }
    }
    return "yellow";
  }

  const debouncedHandleColorChange = debounce(function () {
    const selectedColor = getSelectedColor();
    if (!selectedColor || selectedColor === currentSelectedColor) return;
    currentSelectedColor = selectedColor;
    safeReorderByColor(selectedColor);
  }, 100);

  function initialize() {
    if (isInitialized) return;
    cacheDOMElements();
    if (!mediaList) return;
    currentSelectedColor = getSelectedColor();
    safeReorderByColor(currentSelectedColor);
    document.addEventListener('variant:change', debouncedHandleColorChange);
    window.addEventListener('resize', debounce(initSliderNavigation, 200));
    isInitialized = true;
  }
  
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', initialize) : initialize();
})();

document.addEventListener('DOMContentLoaded', () => {
  const openers = document.querySelectorAll('.product__modal-opener--video, modal-opener[data-modal]');
  openers.forEach(opener => {
    opener.addEventListener('click', () => {
      const modalSelector = opener.dataset.modal;
      if (!modalSelector) return;
      const modal = document.querySelector(modalSelector);
      if (!modal) return;
      waitForModalVisible(modal).then(() => handleDeferredMediaInModal(modal));
    });
  });

  function waitForModalVisible(modalEl, timeout = 2000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        const style = window.getComputedStyle(modalEl);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          clearInterval(interval); resolve();
        } else if (Date.now() - start > timeout) {
          clearInterval(interval); reject();
        }
      }, 80);
    });
  }

  function handleDeferredMediaInModal(modalEl) {
    const deferred = modalEl.querySelector('deferred-media, .deferred-media');
    const posterBtn = modalEl.querySelector('.deferred-media__poster');
    if (posterBtn) {
      posterBtn.click();
    }
    const observer = new MutationObserver((mutations, obs) => {
      const iframe = modalEl.querySelector('iframe');
      const video = modalEl.querySelector('video');
      if (iframe || video) {
        obs.disconnect();
        finalizeAutoplay(modalEl, iframe, video);
      }
    });
    observer.observe(deferred || modalEl, { childList: true, subtree: true });
  }

  function finalizeAutoplay(modalEl, iframe, video) {
    if (iframe) {
      let src = iframe.src;
      const connector = src.includes('?') ? '&' : '?';
      iframe.src = src.includes('autoplay=1') ? src : src + connector + 'autoplay=1&mute=1';
    }
    if (video) {
      video.muted = true;
      video.play().catch(() => {});
    }
  }
});