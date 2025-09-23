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
  let currentSlide = 0;
  let dotsContainer = null;
  let observer = null;

  // Debounce function
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function getColorFromAlt(text) {
    const lower = (text || "").toLowerCase();
    if (lower.includes("white")) return "white";
    if (lower.includes("yellow")) return "yellow";
    if (lower.includes("rose")) return "rose";
    return "";
  }

  function getMediaList() {
    return document.querySelector('.product__media-list');
  }

  function classifyItemsByColor(targetColor) {
    const mediaList = getMediaList();
    const items = mediaList ? Array.from(mediaList.querySelectorAll(".product__media-item")) : [];
    const buckets = { color: [], codes: { mq: [], ci: [], mh: [], mv: [], v360: [] }, extras: [] };

    items.forEach(item => {
      const alt = (item.querySelector("img")?.alt || "").toLowerCase();
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
      } else item.style.display = 'none';
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
    const pattern = ["color", "code", "code", "color", "color", "code", "code", "color", "color", "code", "code", "color"];
    const ordered = [];
    while (buckets.color.length || Object.values(buckets.codes).some(arr => arr.length)) {
      pattern.forEach(slot => {
        const node = slot === "color" ? takeColor(buckets) : takeCode(buckets);
        if (node) { node.style.display = 'block'; ordered.push(node); }
      });
    }
    buckets.extras.forEach(node => { node.style.display = 'block'; ordered.push(node); });
    return ordered;
  }

  function reorderByColor(targetColor) {
    const mediaList = getMediaList();
    if (!mediaList) return -1;

    const { buckets, allItems } = classifyItemsByColor(targetColor);
    const ordered = buildRepeatedPattern(buckets);
    const container = allItems[0]?.parentNode;
    if (!container) return -1;

    const activeIndex = Array.from(container.children).findIndex(item => item.classList.contains('is-active'));

    ordered.forEach(node => container.appendChild(node));
    return ordered.findIndex(item => activeIndex >= 0 && item === allItems[activeIndex]);
  }

  function createDotsNavigation() {
    const mediaList = getMediaList();
    if (!mediaList) return;
    if (dotsContainer) dotsContainer.remove();

    const slides = Array.from(mediaList.querySelectorAll('.product__media-item')).filter(s => s.style.display !== 'none');
    totalSlides = slides.length;
    if (totalSlides <= 1) return;

    dotsContainer = document.createElement('div');
    dotsContainer.className = 'custom-slider-dots';
    slides.forEach((_, i) => {
      const dot = document.createElement('span');
      dot.className = 'slider-dot';
      if (i === currentSlide) dot.classList.add('active');
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    });
    mediaList.parentNode.appendChild(dotsContainer);
  }

  function goToSlide(index) {
    const mediaList = getMediaList();
    if (!mediaList) return;
    const slides = Array.from(mediaList.querySelectorAll('.product__media-item')).filter(s => s.style.display !== 'none');
    if (index < 0 || index >= slides.length) return;

    currentSlide = index;
    slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
    if (dotsContainer) dotsContainer.querySelectorAll('.slider-dot').forEach((dot, i) => dot.classList.toggle('active', i === index));
    slides[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  function initSliderNavigation() {
    const mediaList = getMediaList();
    if (!mediaList) return;

    // Remove default slider buttons
    const sliderButtons = document.querySelector('.slider-buttons.quick-add-hidden');
    if (sliderButtons) sliderButtons.style.display = 'none';

    // Create dots navigation
    createDotsNavigation();
  }


  function safeReorderByColor(targetColor) {
    waitForMediaUpdate(() => {
      const newIndex = reorderByColor(targetColor);
      if (dotsContainer) dotsContainer.remove();
      currentSlide = 0;
      initSliderNavigation();
      if (newIndex >= 0) goToSlide(newIndex);
    });
  }

  function getSelectedColor() {
    const inputs = document.querySelectorAll('input[name*="color"], select[name*="color"], fieldset[data-type="color"] input[type="radio"]:checked, .variant-input-wrapper input[type="radio"]:checked');
    for (const input of inputs) if (input.checked || input.tagName === 'SELECT') return getColorFromAlt(input.value);
    const variants = document.querySelectorAll('[data-selected-value], .variant-input-wrapper .selected, .product-form__buttons [data-value], .variant-selector__button.selected');
    for (const el of variants) { const val = el.textContent || el.getAttribute('data-value') || el.getAttribute('data-selected-value'); const color = getColorFromAlt(val); if (color) return color; }
    const urlParams = new URLSearchParams(window.location.search);
    return getColorFromAlt(urlParams.get('color') || urlParams.get('Color')) || 'yellow';
  }

  const debouncedHandleColorChange = debounce(() => { currentSelectedColor = getSelectedColor(); safeReorderByColor(currentSelectedColor); }, 100);

  function setupVariantChangeListeners() {
    document.addEventListener('variant:change', () => setTimeout(debouncedHandleColorChange, 50));
    document.addEventListener('variant:selected', () => setTimeout(debouncedHandleColorChange, 50));
    document.addEventListener('change', e => { if (e.target.name?.toLowerCase().includes('color')) setTimeout(debouncedHandleColorChange, 50); });

    if (observer) observer.disconnect();
    observer = new MutationObserver(() => setTimeout(debouncedHandleColorChange, 50));
    const container = getMediaList()?.parentNode;
    if (container) observer.observe(container, { childList: true, subtree: true });
  }

  function handleCustomizeConfirm() {
    document.addEventListener('click', e => {
      if (e.target.closest('#customize_close_drawer, .customize-close, [data-customize-close]') ||
          e.target.matches('[data-confirm], .confirm-customization, .apply-customization')) {
        setTimeout(debouncedHandleColorChange, 200);
      }
    });
  }

  function cleanup() {
    const mediaList = getMediaList();
    if (mediaList?._handlers) {
      const { handleStart, handleMove, handleEnd } = mediaList._handlers;
      mediaList.removeEventListener('touchstart', handleStart);
      mediaList.removeEventListener('touchmove', handleMove);
      mediaList.removeEventListener('touchend', handleEnd);
      mediaList.removeEventListener('mousedown', handleStart);
      mediaList.removeEventListener('mousemove', handleMove);
      mediaList.removeEventListener('mouseup', handleEnd);
      mediaList.removeEventListener('mouseleave', handleEnd);
    }
    if (dotsContainer) dotsContainer.remove();
    if (observer) observer.disconnect();
  }

  function waitForMediaUpdate(callback, timeout = 2000) {
    const start = Date.now();
    function check() {
      if (getMediaList()?.querySelectorAll('.product__media-item').length) callback();
      else if (Date.now() - start < timeout) requestAnimationFrame(check);
    }
    check();
  }

  function initialize() {
    currentSelectedColor = getSelectedColor();
    safeReorderByColor(currentSelectedColor);
    setupVariantChangeListeners();
    handleCustomizeConfirm();
  }

  initialize();
  window.addEventListener('beforeunload', cleanup);
  if (window.Shopify && window.Shopify.theme) {
    document.addEventListener('shopify:section:load', () => { cleanup(); initialize(); });
    document.addEventListener('theme:loaded', initialize);
  }
});
