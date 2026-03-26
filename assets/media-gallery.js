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
  const ALWAYS_SHOW_CODES = ["mv", "mq-ai", "mq", "mh-ai", "mh", "ci-ai", "ci", "360v"];
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
  let isSwiping = false; // Flag to prevent scroll sync during swipe animation

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
      codes: { mv: [], "mq-ai": [], mq: [], "mh-ai": [], mh: [], "ci-ai": [], ci: [], v360: [] },
      cert: [],   // ✅ ADD
      extras: []
    };

    items.forEach(item => {
      const img = item.querySelector("img");
      const alt = (img?.alt || "").toLowerCase();
      const itemColor = getColorFromAlt(alt);
      const isAnyColor = COLOR_TOKENS.some(c => alt.includes(c));

      // ✅ CERT detection (only classification, no reordering logic)
      if (alt.includes("cert")) {
        buckets.cert.push(item);
        return;
      }

      const isMatch =
      itemColor === targetColor ||
      (
        targetColor.includes("-") &&
        itemColor &&
        targetColor.split("-").includes(itemColor)
      );

      if (isMatch || (!isAnyColor && ALWAYS_SHOW_CODES.some(code => alt.includes(code)))) {
        if (alt.includes("mv")) buckets.codes.mv.push(item);
        else if (alt.includes("mq-ai")) buckets.codes["mq-ai"].push(item);
        else if (alt.includes("mq")) buckets.codes.mq.push(item);
        else if (alt.includes("mh-ai")) buckets.codes["mh-ai"].push(item);
        else if (alt.includes("mh")) buckets.codes.mh.push(item);
        else if (alt.includes("ci-ai")) buckets.codes["ci-ai"].push(item);
        else if (alt.includes("ci")) buckets.codes.ci.push(item);
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
      if (buckets.codes[k]?.length) return buckets.codes[k].shift();
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

    Object.values(buckets.codes).forEach(arr =>
      arr.forEach(node => {
        node.style.display = 'block';
        ordered.push(node);
      })
    );

    buckets.color.forEach(node => {
      node.style.display = 'block';
      ordered.push(node);
    });

    buckets.extras.forEach(node => {
      node.style.display = 'block';
      ordered.push(node);
    });

    // ✅ CERT — always last
    buckets.cert.forEach(node => {
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
      const dot = document.createElement('button');
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

      const dotInner = document.createElement('span');
      dotInner.className = 'slider-dot__inner';
      dot.appendChild(dotInner);

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
    
    const parent = mediaList.parentNode;
    parent.appendChild(dotsContainer);
  }

  function updateDots() {
    if (!dotsContainer) return;

    const dots = dotsContainer.querySelectorAll('.slider-dot');

    dots.forEach((dot, i) => {
      const isActive = i === currentSlide;
      dot.classList.toggle('active', isActive);
      if (isActive) {
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.removeAttribute('aria-current');
      }
    });
  }

  function setActiveSlide(index) {
    visibleSlides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === index);
    });
  }

  function goToSlide(index) {
    if (index < 0 || index >= totalSlides || isReordering) return;
    
    isSwiping = true; // Lock scroll sync
    currentSlide = index;
    visibleSlides = getVisibleSlides();
    
    setActiveSlide(currentSlide);
    updateDots();

    const targetSlide = visibleSlides[currentSlide];
    
    if (targetSlide && mediaList) {
      // FIX: Use scrollTo on the container instead of scrollIntoView
      // This calculates the center position manually to avoid page jumping
      const slideLeft = targetSlide.offsetLeft;
      const slideWidth = targetSlide.clientWidth;
      const containerWidth = mediaList.clientWidth;
      
      // Calculate position to center the image
      const targetScrollLeft = slideLeft - (containerWidth / 2) + (slideWidth / 2);

      mediaList.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });

      // Handle video autoplay
      const activeVideo = targetSlide.querySelector('video');
      if (activeVideo) {
        activeVideo.loop = true;
        activeVideo.muted = true;
        activeVideo.play().catch(() => {});
      }
    }
    
    // Release the lock after animation roughly completes
    setTimeout(() => {
        isSwiping = false;
    }, 500);
  }

  function moveSlide(direction) {
    let nextIndex = currentSlide + direction;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex > totalSlides - 1) nextIndex = totalSlides - 1;
    goToSlide(nextIndex);
  }

  // --- SWIPE LOGIC (UNCHANGED AS REQUESTED) ---
  function setupSwipeDetection() {
    if (!mediaList) return;

    let startX = 0;
    let isTouching = false;

    mediaList.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      isTouching = true;
    }, { passive: true });

    mediaList.addEventListener('touchend', (e) => {
      if (!isTouching) return;
      isTouching = false;

      const endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      const threshold = 40;

      if (Math.abs(diff) < threshold) return;

      if (diff > 0) {
        moveSlide(1); 
      } else {
        moveSlide(-1); 
      }
    }, { passive: true });
  }

  // --- SCROLL SYNC (IMPROVED FOR DOTS) ---
  function setupScrollSync() {
    if (!mediaList) return;
    
    let isScrolling = false;

    mediaList.addEventListener('scroll', () => {
      if (isReordering || isSwiping) return; // Don't sync if script is driving the animation
      
      if (!isScrolling) {
        window.requestAnimationFrame(() => {
          syncSlideFromScroll();
          isScrolling = false;
        });
        isScrolling = true;
      }
    }, { passive: true });
  }

  function syncSlideFromScroll() {
    if (!mediaList || isReordering) return;

    const slides = getVisibleSlides();
    if (!slides.length) return;

    const containerRect = mediaList.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;

    let closestIndex = currentSlide;
    let closestDistance = Infinity;

    // Determine which slide is closest to center
    slides.forEach((slide, index) => {
      const rect = slide.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const dist = Math.abs(center - containerCenter);

      if (dist < closestDistance) {
        closestDistance = dist;
        closestIndex = index;
      }
    });

    if (closestIndex !== currentSlide) {
      currentSlide = closestIndex;
      setActiveSlide(currentSlide);
      updateDots();
      // NOTE: Removed scrollIntoView here to prevent fighting the user's manual scroll
    }
  }

  function initSliderNavigation() {
    if (!mediaList) return;

    const isMobile = window.innerWidth < 750;

    const sliderButtons = document.querySelector('.slider-buttons.quick-add-hidden');
    if (sliderButtons) sliderButtons.style.display = 'none';

    createDotsNavigation();

    // 1. SETUP SWIPE (Only on Desktop if you want custom swipe, or disable if native is preferred)
    // Your original code disabled this on mobile to use native Dawn swipe. Kept as is.
    if (!isMobile) {
      setupSwipeDetection();
    }

    // 2. SETUP SCROLL SYNC (Run this on ALL devices)
    // This was previously inside the !isMobile check, causing dots to fail on mobile.
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

    const previousSlide = currentSlide;
    
    reorderByColor(targetColor);
    
    currentSlide = 0;
    
    initSliderNavigation();
    
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
  // Target modal openers that open video media
  const openers = document.querySelectorAll('.product__modal-opener--video, modal-opener[data-modal]');

  openers.forEach(opener => {
    opener.addEventListener('click', () => {
      const modalSelector = opener.dataset.modal;
      if (!modalSelector) return;
      const modal = document.querySelector(modalSelector);
      if (!modal) return;

      // Wait until modal becomes visible, then bootstrap media autoplay
      waitForModalVisible(modal, 2000 /*ms timeout*/).then(() => {
        handleDeferredMediaInModal(modal);
      }).catch(() => {
        // fallback: still try once after a short delay
        setTimeout(() => handleDeferredMediaInModal(modal), 400);
      });
    });
  });

  // --- helpers ---
  function waitForModalVisible(modalEl, timeout = 2000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();

      function isVisible(el) {
        // consider aria-hidden, display, or presence in layout
        if (!el) return false;
        if (el.getAttribute('aria-hidden') === 'true') return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        // check bounding box
        const rect = el.getBoundingClientRect();
        return (rect.width > 0 && rect.height > 0);
      }

      if (isVisible(modalEl)) return resolve();

      const interval = setInterval(() => {
        if (isVisible(modalEl)) {
          clearInterval(interval);
          return resolve();
        }
        if (Date.now() - start > timeout) {
          clearInterval(interval);
          return reject(new Error('modal not visible within timeout'));
        }
      }, 80);
    });
  }

  function handleDeferredMediaInModal(modalEl) {
    // Find deferred-media inside modal (Dawn uses <deferred-media> or .deferred-media__poster)
    const deferred = modalEl.querySelector('deferred-media, .deferred-media, [data-deferred-media]');
    const posterBtn = modalEl.querySelector('.deferred-media__poster, button[id^="Deferred-Poster-"]');

    // If poster button exists, click it to let Shopify inject iframe/video
    if (posterBtn) {
      // hide poster quickly (so it doesn't cover the injected iframe) — we'll still trigger click so Shopify loads the media
      posterBtn.classList.add('deferred-media__poster--hidden');
      const spinner = modalEl.querySelector('.loading__spinner');
      if (spinner) spinner.classList.remove('hidden'); // show spinner while loading
      try { posterBtn.click(); } catch (e) { /* ignore */ }
    } else if (deferred) {
      // if deferred tag present but no poster btn, we'll continue to look for iframe/video
    } else {
      // no deferred media found
      return;
    }

    // After injection, attempt to autoplay. Use MutationObserver to detect insertion of iframe/video
    const observerTarget = deferred || modalEl;
    const observer = new MutationObserver((mutations, obs) => {
      // look for iframe/video now
      const iframe = modalEl.querySelector('iframe');
      const video = modalEl.querySelector('video');

      if (iframe || video) {
        obs.disconnect();
        finalizeAutoplay(modalEl, iframe, video);
      }
    });

    observer.observe(observerTarget, { childList: true, subtree: true });

    // also fallback: try after fixed delay if MutationObserver didn't trigger
    setTimeout(() => {
      const iframe = modalEl.querySelector('iframe');
      const video = modalEl.querySelector('video');
      if (iframe || video) {
        try { observer.disconnect() } catch(e){}
        finalizeAutoplay(modalEl, iframe, video);
      } else {
        // give one more attempt: unhide poster if still nothing
        const posterBtn2 = modalEl.querySelector('.deferred-media__poster, button[id^="Deferred-Poster-"]');
        if (posterBtn2) posterBtn2.classList.remove('deferred-media__poster--hidden');
        const spinner2 = modalEl.querySelector('.loading__spinner');
        if (spinner2) spinner2.classList.add('hidden');
      }
    }, 700); // tune this if needed
  }

  function finalizeAutoplay(modalEl, iframe, video) {
    // Hide poster/spinner
    const poster = modalEl.querySelector('.deferred-media__poster, button[id^="Deferred-Poster-"]');
    if (poster) poster.classList.add('hidden');

    const spinner = modalEl.querySelector('.loading__spinner');
    if (spinner) spinner.classList.add('hidden');

    // If iframe (YouTube/Vimeo), append autoplay param
    if (iframe) {
      const src = iframe.getAttribute('src') || iframe.src || '';
      if (!src) return;
      // If src already contains autoplay=, still try to ensure it's 1
      let newSrc;
      if (src.includes('autoplay=')) {
        newSrc = src.replace(/autoplay=\d/, 'autoplay=1');
      } else {
        const connector = src.includes('?') ? '&' : '?';
        newSrc = src + connector + 'autoplay=1';
      }
      // assign only if changed (reassigning will reload iframe which stops previous play; that's OK)
      if (newSrc !== src) {
        iframe.setAttribute('src', newSrc);
      } else {
        // If same, force a reload to ensure autoplay param recognized
        iframe.setAttribute('src', src);
      }
      // For YouTube, ensure muted for autoplay on some browsers:
      // YouTube autoplay respects the URL param 'mute=1' in some players; add if missing
      if (!/mute=1/.test(newSrc)) {
        const connector2 = newSrc.includes('?') ? '&' : '?';
        iframe.setAttribute('src', newSrc + connector2 + 'mute=1');
      }
    }

    // If native video element
    if (video) {
      // browsers usually require muted to allow autoplay
      video.muted = true;
      // try to play
      const p = video.play();
      if (p && p.catch) {
        p.catch(err => {
          console.warn('Video autoplay failed:', err);
        });
      }
    }
  }
});