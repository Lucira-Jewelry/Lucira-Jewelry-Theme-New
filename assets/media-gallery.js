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

        // 3D deferred media
        const deferredMedia = activeItem.querySelector('.deferred-media');
        if (deferredMedia) deferredMedia.loadContent(false);

        // Video
        const videoEl = activeItem.querySelector('video');
        if (videoEl) playVideo(videoEl);
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

  // ----- Utility Functions -----
  const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const getColorFromAlt = (text) => {
    const alt = (text || "").toLowerCase();
    if (alt.includes("white")) return "white";
    if (alt.includes("yellow")) return "yellow";
    if (alt.includes("rose")) return "rose";
    return "";
  };

  const playVideo = (videoEl) => {
    if (!videoEl) return;
    videoEl.loop = true;
    videoEl.muted = true;
    videoEl.playsInline = true;

    if (videoEl.ended) videoEl.currentTime = 0;

    videoEl.play().catch(() => {});

    // Ensure loop works even if browser ignores loop
    videoEl.removeEventListener("ended", videoEl._loopHandler);
    videoEl._loopHandler = () => {
      videoEl.currentTime = 0;
      videoEl.play().catch(() => {});
    };
    videoEl.addEventListener("ended", videoEl._loopHandler);
  };

  const pauseAllMedia = () => {
    document.querySelectorAll(".product__media-item video").forEach(v => v.pause());
    document.querySelectorAll(".product__media-item .deferred-media").forEach(dm => dm.pause && dm.pause());
  };

  const cacheDOM = () => {
    mediaList = document.querySelector(".product__media-list");
  };

  // ----- Reorder Functions -----
  const classifyItemsByColor = (targetColor) => {
    const items = Array.from(document.querySelectorAll(".product__media-item"));
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
      } else {
        item.style.display = "none";
      }
    });

    return { buckets, allItems: items };
  };

  const takeColor = (buckets) => buckets.color.length ? buckets.color.shift() : null;
  const takeCode = (buckets) => {
    for (const key of ALWAYS_SHOW_CODES) {
      const k = key === "360v" ? "v360" : key;
      if (buckets.codes[k].length) return buckets.codes[k].shift();
    }
    return null;
  };

  const buildPattern = (buckets) => {
    const slotPattern = ["color","code","code","color","color","code","code","color","color","code","code","color"];
    const ordered = [];
    slotPattern.forEach(slot => {
      let node = slot === "color" ? takeColor(buckets) : takeCode(buckets);
      if (node) { node.style.display = "block"; ordered.push(node); }
    });
    Object.values(buckets.codes).forEach(arr => arr.forEach(node => { node.style.display = "block"; ordered.push(node); }));
    buckets.color.forEach(node => { node.style.display = "block"; ordered.push(node); });
    buckets.extras.forEach(node => { node.style.display = "block"; ordered.push(node); });
    return ordered;
  };

  const reorderByColor = (targetColor) => {
    if (!mediaList) return -1;
    const { buckets, allItems } = classifyItemsByColor(targetColor);
    const ordered = buildPattern(buckets);
    const container = allItems[0]?.parentNode;
    if (!container) return -1;

    const activeIndex = Array.from(container.children).findIndex(item => item.classList.contains("is-active"));
    ordered.forEach(node => container.appendChild(node));
    return ordered.findIndex(item => activeIndex >= 0 && item === allItems[activeIndex]);
  };

  // ----- Slider Functions -----
  const createDotsNavigation = () => {
    if (!mediaList) return;
    if (dotsContainer) dotsContainer.remove();

    const slides = Array.from(mediaList.querySelectorAll(".product__media-item")).filter(s => s.style.display !== "none");
    totalSlides = slides.length;
    if (totalSlides <= 1) return;

    dotsContainer = document.createElement("div");
    dotsContainer.className = "custom-slider-dots";

    slides.forEach((_, i) => {
      const dot = document.createElement("span");
      dot.className = "slider-dot" + (i === currentSlide ? " active" : "");
      dot.addEventListener("click", () => goToSlide(i));
      dotsContainer.appendChild(dot);
    });

    mediaList.parentNode.appendChild(dotsContainer);
  };

  const goToSlide = (index) => {
    if (!mediaList || index < 0 || index >= totalSlides) return;
    currentSlide = index;

    const slides = Array.from(mediaList.querySelectorAll(".product__media-item")).filter(s => s.style.display !== "none");
    slides.forEach((s, i) => s.classList.toggle("is-active", i === index));

    if (dotsContainer) dotsContainer.querySelectorAll(".slider-dot").forEach((d, i) => d.classList.toggle("active", i === index));

    slides[index]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });

    // Play active video
    const videoEl = slides[index].querySelector("video");
    if (videoEl) playVideo(videoEl);

    // Load deferred media if exists
    const deferredMedia = slides[index].querySelector(".deferred-media");
    if (deferredMedia && deferredMedia.loadContent) deferredMedia.loadContent(false);
  };

  const initSlider = () => {
    if (!mediaList) return;
    createDotsNavigation();
    goToSlide(currentSlide);
  };

  // ----- Core Logic -----
  const safeReorderByColor = (targetColor) => {
    if (isReordering || !mediaList) return;
    isReordering = true;

    const newActiveIndex = reorderByColor(targetColor);
    currentSlide = 0;
    initSlider();
    if (newActiveIndex >= 0) { currentSlide = newActiveIndex; goToSlide(newActiveIndex); }

    setTimeout(() => { isReordering = false; }, 200);
    mediaList.setAttribute("data-media-reordered", "true");
  };

  const getSelectedColor = () => {
    const inputs = document.querySelectorAll(
      'input[name*="Color"]:checked, select[name*="Color"], input[name*="color"]:checked, select[name*="color"]'
    );
    for (const input of inputs) {
      const color = getColorFromAlt(input.value);
      if (color) return color;
    }
    const urlColor = new URLSearchParams(window.location.search).get("color");
    if (urlColor) return getColorFromAlt(urlColor);
    return "yellow";
  };

  const handleColorChange = debounce(() => {
    const selectedColor = getSelectedColor();
    if (!selectedColor || selectedColor === currentSelectedColor) return;
    currentSelectedColor = selectedColor;
    setTimeout(() => safeReorderByColor(selectedColor), 100);
  }, 50);

  const restartActiveVideo = () => {
    const activeItem = document.querySelector(".product__media-item.is-active");
    if (!activeItem) return;

    const videoEl = activeItem.querySelector("video");
    if (videoEl) playVideo(videoEl);

    const deferredMedia = activeItem.querySelector(".deferred-media");
    if (deferredMedia && deferredMedia.loadContent) deferredMedia.loadContent(false);
  };

  const setupListeners = () => {
    ["change","variant:change","variant:selected","popstate"].forEach(evt => document.addEventListener(evt, handleColorChange));

    // Observe media list for DOM updates
    if (mediaList) {
      if (observer) observer.disconnect();
      observer = new MutationObserver(() => safeReorderByColor(currentSelectedColor));
      observer.observe(mediaList, { childList: true, subtree: true });
    }

    // Restart videos on drawer close
    document.querySelectorAll(".customize-drawer-close").forEach(btn => {
      btn.addEventListener("click", restartActiveVideo);
    });
  };

  const cleanup = () => { if (observer) observer.disconnect(); };

  const initialize = () => {
    if (isInitialized) return;
    cacheDOM();
    currentSelectedColor = getSelectedColor();
    safeReorderByColor(currentSelectedColor);
    setupListeners();
    isInitialized = true;
  };

  initialize();
  setTimeout(initialize, 1000);

  window.addEventListener("beforeunload", cleanup);
  document.addEventListener("shopify:section:load", () => { cleanup(); isInitialized = false; initialize(); });
  document.addEventListener("theme:loaded", initialize);
});

function restartActiveVideo() {
  // Wait for DOM updates after variant change or drawer close
  setTimeout(() => {
    const activeItem = document.querySelector('.product__media-item.is-active');
    if (!activeItem) return;

    const videoEl = activeItem.querySelector('video');
    if (videoEl) {
      videoEl.loop = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.currentTime = 0;
      videoEl.play().catch(() => {});

      // Ensure loop works if browser ignores loop
      videoEl.removeEventListener('ended', videoEl._loopHandler);
      videoEl._loopHandler = () => {
        videoEl.currentTime = 0;
        videoEl.play().catch(() => {});
      };
      videoEl.addEventListener('ended', videoEl._loopHandler);
    }

    // Load deferred 3D media if exists
    const deferredMedia = activeItem.querySelector('.deferred-media');
    if (deferredMedia && deferredMedia.loadContent) deferredMedia.loadContent(false);
  }, 100); // Delay to let Shopify finish re-render
}

// Listen for variant changes
document.addEventListener('variant:change', restartActiveVideo);
document.addEventListener('variant:selected', restartActiveVideo);

// Listen for customize drawer close
document.querySelectorAll('#customize_close_drawer').forEach(btn => {
  btn.addEventListener('click', restartActiveVideo);
});