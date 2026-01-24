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

        this.elements.viewer.addEventListener(
          'slideChanged',
          debounce(this.onSlideChanged.bind(this), 300)
        );

        this.elements.thumbnails
          .querySelectorAll('[data-target]')
          .forEach((item) => {
            item
              .querySelector('button')
              .addEventListener(
                'click',
                this.setActiveMedia.bind(this, item.dataset.target, false)
              );
          });

        if (this.dataset.desktopLayout?.includes('thumbnail') && this.mql.matches) {
          this.removeListSemantic();
        }
      }

      onSlideChanged(event) {
        const thumb = this.elements.thumbnails.querySelector(
          `[data-target="${event.detail.currentElement.dataset.mediaId}"]`
        );
        this.setActiveThumbnail(thumb);
      }

      setActiveMedia(mediaId) {
        const activeMedia =
          this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`) ||
          this.elements.viewer.querySelector('[data-media-id]');

        if (!activeMedia) return;

        this.elements.viewer
          .querySelectorAll('[data-media-id]')
          .forEach((el) => el.classList.remove('is-active'));

        activeMedia.classList.add('is-active');

        this.playActiveMedia(activeMedia);
      }

      setActiveThumbnail(thumbnail) {
        if (!thumbnail) return;
        this.elements.thumbnails
          .querySelectorAll('button')
          .forEach((btn) => btn.removeAttribute('aria-current'));

        thumbnail.querySelector('button')?.setAttribute('aria-current', true);
      }

      playActiveMedia(activeItem) {
        window.pauseAllMedia?.();
        const deferred = activeItem.querySelector('.deferred-media');
        if (deferred) deferred.loadContent(false);
      }

      removeListSemantic() {
        if (!this.elements.viewer.slider) return;
        this.elements.viewer.slider.setAttribute('role', 'presentation');
        this.elements.viewer.sliderItems.forEach((slide) =>
          slide.setAttribute('role', 'presentation')
        );
      }
    }
  );
}

(function () {
  const COLOR_TOKENS = ['white', 'yellow', 'rose', 'plt', 'platinum'];
  const ALWAYS_SHOW_CODES = ['mq', 'ci', 'mh', 'mv', '360v'];

  let mediaList = null;
  let observer = null;
  let isReordering = false;
  let isInitialized = false;
  let currentSelectedColor = null;

  const isMobile = () => window.innerWidth < 750;

  /* ---------- Utils ---------- */
  function debounce(fn, wait = 100) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function getColorFromAlt(text) {
    const lower = (text || '').toLowerCase();
    if (lower.includes('white')) return 'white';
    if (lower.includes('yellow')) return 'yellow';
    if (lower.includes('rose')) return 'rose';
    if (lower.includes('plt') || lower.includes('platinum')) return 'plt';
    return '';
  }

  function getSelectedColor() {
    const inputs = document.querySelectorAll(
      `
      input[name*="Color"]:checked,
      input[name*="color"]:checked,
      select[name*="Color"],
      select[name*="color"],
      fieldset[data-type="color"] input:checked,
      .variant-input-wrapper .selected,
      .variant-selector__button.selected
    `
    );

    for (const el of inputs) {
      const value =
        el.value ||
        el.textContent ||
        el.dataset?.value ||
        el.dataset?.selectedValue;
      const color = getColorFromAlt(value);
      if (color) return color;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const param = urlParams.get('color') || urlParams.get('Color');
    if (param) return getColorFromAlt(param);

    return 'yellow';
  }

  function classifyItems(targetColor) {
    const items = Array.from(mediaList.querySelectorAll('.product__media-item'));

    items.forEach((item) => {
      const img = item.querySelector('img');
      const alt = (img?.alt || '').toLowerCase();
      const itemColor = getColorFromAlt(alt);
      const hasAnyColor = COLOR_TOKENS.some((c) => alt.includes(c));
      const isAlwaysShow = ALWAYS_SHOW_CODES.some((c) => alt.includes(c));

      if (itemColor === targetColor || (!hasAnyColor && isAlwaysShow)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  }

  function reorderByColor(color) {
    if (!mediaList) return;
    classifyItems(color);
  }

  function setupObserver() {
    if (!mediaList) return;
    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
      if (!isReordering && currentSelectedColor) {
        reorderByColor(currentSelectedColor);
      }
    });

    observer.observe(mediaList, {
      childList: true,
      subtree: true,
    });
  }

  const handleVariantChange = debounce(() => {
    const color = getSelectedColor();
    if (!color || color === currentSelectedColor) return;

    currentSelectedColor = color;
    isReordering = true;
    reorderByColor(color);
    setTimeout(() => (isReordering = false), 50);
  }, 120);

  function init() {
    if (isInitialized) return;

    mediaList = document.querySelector('.product__media-list');
    if (!mediaList) return;

    currentSelectedColor = getSelectedColor();
    reorderByColor(currentSelectedColor);
    setupObserver();

    document.addEventListener('variant:change', handleVariantChange);
    document.addEventListener('change', handleVariantChange);
    window.addEventListener('popstate', handleVariantChange);

    isInitialized = true;
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
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
        if (!el) return false;
        if (el.getAttribute('aria-hidden') === 'true') return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
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