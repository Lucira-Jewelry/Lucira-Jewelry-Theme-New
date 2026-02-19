function initWishlist() {
  try {
    if (typeof iWish !== "undefined" && typeof iWish.init === "function") {
      iWish.init();
    }
    document.dispatchEvent(new CustomEvent("iwish:reload"));
    document.dispatchEvent(new CustomEvent("wishlist:init"));
    if (typeof iWishCounter === "function") {
      iWishCounter();
    }
  } catch (e) {
    console.log("Wishlist init error", e);
  }
}

// ── Debounce ──────────────────────────────────────────────────────────────────
function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const context = this;
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

// ── Request manager ───────────────────────────────────────────────────────────
// FIX 1: abort() is wrapped in try/catch.
// In some browsers/environments, calling abort() on a controller that was never
// attached to a fetch() throws synchronously. We silence that — it is harmless.
class RequestManager {
  constructor() {
    this.controller = null;
  }

  cancelPending() {
    if (this.controller) {
      try {
        this.controller.abort();
      } catch (_) {
        // Intentionally ignored — abort() can throw when no fetch is in flight
      }
    }
    this.controller = new AbortController();
    return this.controller.signal;
  }

  reset() {
    this.controller = null;
  }
}

// ── FacetFiltersForm ──────────────────────────────────────────────────────────
class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();
    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);
    this.requestManager = new RequestManager();
    this.pendingUpdate = null;

    this.debouncedOnSubmit = debounce((event) => {
      this.onSubmitHandler(event);
    }, 300);

    const facetForm = this.querySelector('form');

    // FIX 2: Skip sort_by inputs in the input listener.
    // All sort changes are handled exclusively by triggerSortSubmit() via the
    // document-level 'change' listener. Handling them here too fires a second
    // competing renderPage() that sends sort_by=discount-high-low raw to Shopify
    // (Shopify ignores it) and resets _pendingDiscountSort before the first call
    // can use it — breaking the client-side discount sort entirely.
    facetForm.addEventListener('input', (event) => {
      if (event.target.name === 'sort_by') return;

      if (event.target.type === 'checkbox' || event.target.type === 'radio') {
        this.onSubmitHandler(event);
      } else {
        this.debouncedOnSubmit(event);
      }
    });

    const facetWrapper = this.querySelector('#FacetsWrapperDesktop');
    if (facetWrapper) facetWrapper.addEventListener('keyup', onKeyUpEscape);
  }

  static setListeners() {
    const onHistoryChange = (event) => {
      const searchParams = event.state
        ? event.state.searchParams
        : FacetFiltersForm.searchParamsInitial;
      if (searchParams === FacetFiltersForm.searchParamsPrev) return;

      const restoredParams = new URLSearchParams(searchParams);
      if (restoredParams.get('sort_by') === 'discount-high-low') {
        restoredParams.set('sort_by', 'manual');
        FacetFiltersForm._pendingDiscountSort = true;
        FacetFiltersForm.renderPage(restoredParams.toString(), null, false);
      } else {
        FacetFiltersForm._pendingDiscountSort = false;
        FacetFiltersForm.renderPage(searchParams, null, false);
      }
    };
    window.addEventListener('popstate', onHistoryChange);
  }

  static toggleActiveFacets(disable = true) {
    document.querySelectorAll('.js-facet-remove').forEach((element) => {
      element.classList.toggle('disabled', disable);
    });
  }

  static showPreloader() {
    let preloader = document.getElementById('facet-preloader');
    if (!preloader) {
      preloader = document.createElement('div');
      preloader.id = 'facet-preloader';
      preloader.className = 'facet-preloader';
      preloader.innerHTML = `
        <div class="facet-preloader__overlay"></div>
        <div class="facet-preloader__spinner">
          <svg class="spinner" viewBox="0 0 50 50">
            <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
          </svg>
        </div>
      `;
      document.body.appendChild(preloader);

      if (!document.getElementById('facet-preloader-styles')) {
        const style = document.createElement('style');
        style.id = 'facet-preloader-styles';
        style.textContent = `
          .facet-preloader {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            z-index: 999999; display: flex; align-items: center;
            justify-content: center; opacity: 0; visibility: hidden;
            transition: opacity 0.15s ease, visibility 0.15s ease;
            pointer-events: none;
          }
          .facet-preloader.active { opacity: 1; visibility: visible; pointer-events: auto; }
          .facet-preloader__overlay {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255,255,255,0.85); backdrop-filter: blur(3px);
          }
          .facet-preloader__spinner { position: relative; z-index: 1; }
          .spinner { animation: rotate 1.5s linear infinite; width: 50px; height: 50px; }
          .spinner .path {
            stroke: #000; stroke-linecap: round;
            animation: dash 1.5s ease-in-out infinite;
          }
          @keyframes rotate { 100% { transform: rotate(360deg); } }
          @keyframes dash {
            0%   { stroke-dasharray: 1,150;  stroke-dashoffset: 0; }
            50%  { stroke-dasharray: 90,150; stroke-dashoffset: -35; }
            100% { stroke-dasharray: 90,150; stroke-dashoffset: -124; }
          }
          .collection.loading { opacity: 0.6; pointer-events: none; }
          .loading { position: relative; }
        `;
        document.head.appendChild(style);
      }
    }
    requestAnimationFrame(() => preloader.classList.add('active'));
  }

  static hidePreloader() {
    const preloader = document.getElementById('facet-preloader');
    if (preloader) preloader.classList.remove('active');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // renderPage
  //   searchParams     = params sent to Shopify  (discount → 'manual')
  //   displaySortValue = value written to browser URL ('discount-high-low')
  // ─────────────────────────────────────────────────────────────────────────
  static async renderPage(searchParams, event, updateURLHash = true, displaySortValue = null) {
    const signal = FacetFiltersForm.requestManagerInstance.cancelPending();

    FacetFiltersForm.searchParamsPrev = searchParams;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    window.lastScrollPosition = scrollY;

    FacetFiltersForm.showPreloader();
    FacetFiltersForm.setLoadingStates(true);

    // Cache key always uses the display value so URL stays consistent
    const urlKeyParams = displaySortValue
      ? (() => {
          const p = new URLSearchParams(searchParams);
          p.set('sort_by', displaySortValue);
          return p.toString();
        })()
      : searchParams;

    const cacheKey = `${window.location.pathname}?${urlKeyParams}`;
    const cached = FacetFiltersForm.getFromCache(cacheKey);

    if (cached) {
      FacetFiltersForm.applyUpdate(cached, event);
      if (updateURLHash) FacetFiltersForm.updateURLHash(urlKeyParams);
      return;
    }

    try {
      const sections = FacetFiltersForm.getSections();
      const section = sections[0];
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;

      const response = await fetch(url, {
        signal,
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const html = await response.text();
      FacetFiltersForm.addToCache(cacheKey, html);
      FacetFiltersForm.applyUpdate(html, event);

      if (updateURLHash) FacetFiltersForm.updateURLHash(urlKeyParams);

    } catch (error) {
      // AbortError = a newer request superseded this one — expected, not an error
      if (error.name === 'AbortError') return;

      console.error('Error fetching products:', error);
      FacetFiltersForm.hidePreloader();
      FacetFiltersForm.setLoadingStates(false);
    }
  }

  // LRU cache — last 20 combinations, expires after 5 min
  static addToCache(key, html) {
    const MAX_CACHE_SIZE = 20;
    if (FacetFiltersForm.filterData.length >= MAX_CACHE_SIZE) {
      FacetFiltersForm.filterData.shift();
    }
    FacetFiltersForm.filterData.push({ url: key, html, timestamp: Date.now() });
  }

  static getFromCache(key) {
    const cached = FacetFiltersForm.filterData.find(item => item.url === key);
    if (cached && (Date.now() - cached.timestamp) < 300000) return cached.html;
    if (cached) {
      FacetFiltersForm.filterData = FacetFiltersForm.filterData.filter(item => item.url !== key);
    }
    return null;
  }

  static applyUpdate(html, event) {
    const parser = new DOMParser();
    const parsedHTML = parser.parseFromString(html, 'text/html');

    requestAnimationFrame(() => {
      FacetFiltersForm.renderFilters(html, event, parsedHTML);
      FacetFiltersForm.renderProductGridContainer(parsedHTML);
      FacetFiltersForm.renderProductCount(parsedHTML);

      if (typeof initializeScrollAnimationTrigger === 'function') {
        initializeScrollAnimationTrigger(html);
      }

      // Client-side discount sort runs after grid is painted
      if (FacetFiltersForm._pendingDiscountSort) {
        requestAnimationFrame(() => {
          FacetFiltersForm.sortProductsByDiscount();
          FacetFiltersForm._pendingDiscountSort = false;
        });
      }

      FacetFiltersForm.restoreScrollPosition();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // sortProductsByDiscount
  //   Reads data-price / data-compare-price set on each <li class="grid__item">
  //   in main-collection-product-grid.liquid.
  //   Shopify prices are integers in cents — no currency parsing needed.
  //   Banner <li>s have no data-price so they are untouched.
  // ─────────────────────────────────────────────────────────────────────────
  static sortProductsByDiscount() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    const items = Array.from(grid.querySelectorAll('li.grid__item[data-price]'));

    if (items.length === 0) {
      console.warn('[DiscountSort] No grid items with data-price found. Verify main-collection-product-grid.liquid has data-price / data-compare-price on <li class="grid__item">.');
      return;
    }

    items.sort((a, b) => {
      const aPrice   = parseFloat(a.dataset.price)        || 0;
      const aCompare = parseFloat(a.dataset.comparePrice) || aPrice;
      const bPrice   = parseFloat(b.dataset.price)        || 0;
      const bCompare = parseFloat(b.dataset.comparePrice) || bPrice;

      const aDiscount = aCompare > aPrice ? ((aCompare - aPrice) / aCompare) * 100 : 0;
      const bDiscount = bCompare > bPrice ? ((bCompare - bPrice) / bCompare) * 100 : 0;

      return bDiscount - aDiscount; // High → Low
    });

    items.forEach(item => grid.appendChild(item));
  }

  static setLoadingStates(loading) {
    const productGrid = document.getElementById('ProductGridContainer');
    const countContainer = document.getElementById('ProductCount');
    const countContainerDesktop = document.getElementById('ProductCountDesktop');
    const spinners = document.querySelectorAll(
      '.facets-container .loading__spinner, facet-filters-form .loading__spinner'
    );

    if (loading) {
      productGrid?.querySelector('.collection')?.classList.add('loading');
      countContainer?.classList.add('loading');
      countContainerDesktop?.classList.add('loading');
      spinners.forEach(s => s.classList.remove('hidden'));
    } else {
      productGrid?.querySelector('.collection')?.classList.remove('loading');
      countContainer?.classList.remove('loading');
      countContainerDesktop?.classList.remove('loading');
      spinners.forEach(s => s.classList.add('hidden'));
    }
  }

  static restoreScrollPosition() {
    const scrollY = window.lastScrollPosition || 0;
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
      FacetFiltersForm.hidePreloader();
      FacetFiltersForm.setLoadingStates(false);
      FacetFiltersForm.requestManagerInstance.reset();
    });
  }

  static renderProductGridContainer(parsedHTML) {
    const container = document.getElementById('ProductGridContainer');
    const newContainer = parsedHTML.getElementById('ProductGridContainer');
    if (!container || !newContainer) return;

    const currentProducts = Array.from(container.querySelectorAll('[data-product-id]'));
    const newProducts = Array.from(newContainer.querySelectorAll('[data-product-id]'));

    const needsFullReplace =
      currentProducts.length !== newProducts.length ||
      !currentProducts.every((el, i) => el.dataset.productId === newProducts[i]?.dataset.productId);

    if (needsFullReplace) {
      container.innerHTML = newContainer.innerHTML;
    } else {
      currentProducts.forEach((el, i) => {
        const newEl = newProducts[i];
        if (el.innerHTML !== newEl.innerHTML) el.innerHTML = newEl.innerHTML;
      });
    }

    container.querySelectorAll('.scroll-trigger').forEach(el =>
      el.classList.add('scroll-trigger--cancel')
    );

    requestAnimationFrame(() => initWishlist());
  }

  static renderProductCount(parsedHTML) {
    const newCount = parsedHTML.getElementById('ProductCount');
    if (!newCount) return;

    const container = document.getElementById('ProductCount');
    const containerDesktop = document.getElementById('ProductCountDesktop');

    if (container && container.textContent !== newCount.textContent) {
      container.innerHTML = newCount.innerHTML;
    }
    if (containerDesktop && containerDesktop.textContent !== newCount.textContent) {
      containerDesktop.innerHTML = newCount.innerHTML;
    }
  }

  static renderFilters(html, event, parsedHTML) {
    parsedHTML = parsedHTML || new DOMParser().parseFromString(html, 'text/html');

    const facetDetailsElementsFromFetch = parsedHTML.querySelectorAll(
      '#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter'
    );
    const facetDetailsElementsFromDom = document.querySelectorAll(
      '#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter'
    );

    Array.from(facetDetailsElementsFromDom).forEach((currentElement) => {
      if (!Array.from(facetDetailsElementsFromFetch).some(({ id }) => currentElement.id === id)) {
        currentElement.remove();
      }
    });

    const matchesId = (element) => {
      const jsFilter = event ? event.target.closest('.js-filter') : undefined;
      return jsFilter ? element.id === jsFilter.id : false;
    };

    const facetsToRender = Array.from(facetDetailsElementsFromFetch).filter(el => !matchesId(el));
    const countsToRender = Array.from(facetDetailsElementsFromFetch).find(matchesId);

    facetsToRender.forEach((elementToRender, index) => {
      const currentElement = document.getElementById(elementToRender.id);
      if (currentElement) {
        if (currentElement.innerHTML !== elementToRender.innerHTML) {
          currentElement.innerHTML = elementToRender.innerHTML;
        }
      } else {
        if (index > 0) {
          const { className: prevClass, id: prevId } = facetsToRender[index - 1];
          if (elementToRender.className === prevClass) {
            document.getElementById(prevId).after(elementToRender);
            return;
          }
        }
        if (elementToRender.parentElement) {
          document.querySelector(`#${elementToRender.parentElement.id} .js-filter`)?.before(elementToRender);
        }
      }
    });

    FacetFiltersForm.renderActiveFacets(parsedHTML);
    FacetFiltersForm.renderAdditionalElements(parsedHTML);

    if (countsToRender) {
      const closestJSFilterID = event.target.closest('.js-filter')?.id;
      if (closestJSFilterID) {
        FacetFiltersForm.renderCounts(countsToRender, event.target.closest('.js-filter'));
        FacetFiltersForm.renderMobileCounts(countsToRender, document.getElementById(closestJSFilterID));
      }
    }
  }

  static renderActiveFacets(html) {
    ['.active-facets-mobile', '.active-facets-desktop'].forEach((selector) => {
      const newEl = html.querySelector(selector);
      const currentEl = document.querySelector(selector);
      if (newEl && currentEl && currentEl.innerHTML !== newEl.innerHTML) {
        currentEl.innerHTML = newEl.innerHTML;
      }
    });
    FacetFiltersForm.toggleActiveFacets(false);
  }

  static renderAdditionalElements(html) {
    ['.mobile-facets__open', '.mobile-facets__count', '.sorting'].forEach((selector) => {
      const newEl = html.querySelector(selector);
      const currentEl = document.querySelector(selector);
      if (newEl && currentEl && newEl.innerHTML !== currentEl.innerHTML) {
        currentEl.innerHTML = newEl.innerHTML;
      }
    });
    document.getElementById('FacetFiltersFormMobile')?.closest('menu-drawer')?.bindEvents();
  }

  static renderCounts(source, target) {
    const sourceSummary = source.querySelector('.facets__summary');
    const targetSummary = target.querySelector('.facets__summary');
    if (sourceSummary && targetSummary && sourceSummary.outerHTML !== targetSummary.outerHTML) {
      targetSummary.outerHTML = sourceSummary.outerHTML;
    }

    const sourceHeader = source.querySelector('.facets__header');
    const targetHeader = target.querySelector('.facets__header');
    if (sourceHeader && targetHeader && sourceHeader.outerHTML !== targetHeader.outerHTML) {
      targetHeader.outerHTML = sourceHeader.outerHTML;
    }

    const sourceWrap = source.querySelector('.facets-wrap');
    const targetWrap = target.querySelector('.facets-wrap');
    if (sourceWrap && targetWrap) {
      const isShowingMore = Boolean(target.querySelector('show-more-button .label-show-more.hidden'));
      if (isShowingMore) {
        sourceWrap.querySelectorAll('.facets__item.hidden').forEach(el =>
          el.classList.replace('hidden', 'show-more-item')
        );
      }
      if (targetWrap.outerHTML !== sourceWrap.outerHTML) {
        targetWrap.outerHTML = sourceWrap.outerHTML;
      }
    }
  }

  static renderMobileCounts(source, target) {
    const srcList = source.querySelector('.mobile-facets__list');
    const tgtList = target?.querySelector('.mobile-facets__list');
    if (srcList && tgtList && srcList.outerHTML !== tgtList.outerHTML) {
      tgtList.outerHTML = srcList.outerHTML;
    }
  }

  static updateURLHash(searchParams) {
    history.pushState(
      { searchParams },
      '',
      `${window.location.pathname}${searchParams ? '?' + searchParams : ''}`
    );
  }

  static getSections() {
    return [{ section: document.getElementById('product-grid')?.dataset.id }];
  }

  createSearchParams(form) {
    return new URLSearchParams(new FormData(form)).toString();
  }

  onSubmitForm(searchParams, event) {
    FacetFiltersForm.renderPage(searchParams, event);
  }

  onSubmitHandler(event) {
    event.preventDefault();
    const sortFilterForms = document.querySelectorAll('facet-filters-form form');

    if (event.srcElement?.className === 'mobile-facets__checkbox') {
      const searchParams = this.createSearchParams(event.target.closest('form'));
      this.onSubmitForm(searchParams, event);
    } else {
      const forms = [];
      const isMobile = event.target.closest('form')?.id === 'FacetFiltersFormMobile';

      sortFilterForms.forEach((form) => {
        if (!isMobile) {
          if (
            form.id === 'FacetSortForm' ||
            form.id === 'FacetFiltersForm' ||
            form.id === 'FacetSortDrawerForm'
          ) {
            forms.push(this.createSearchParams(form));
          }
        } else if (form.id === 'FacetFiltersFormMobile') {
          forms.push(this.createSearchParams(form));
        }
      });
      this.onSubmitForm(forms.join('&'), event);
    }
  }

  onActiveFilterClick(event) {
    event.preventDefault();
    FacetFiltersForm.toggleActiveFacets();
    const url =
      event.currentTarget.href.indexOf('?') === -1
        ? ''
        : event.currentTarget.href.slice(event.currentTarget.href.indexOf('?') + 1);
    FacetFiltersForm.renderPage(url);
  }
}

// ── Static initialisers ───────────────────────────────────────────────────────
FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
FacetFiltersForm.requestManagerInstance = new RequestManager();
FacetFiltersForm._pendingDiscountSort = false;

customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();

// ── PriceRange ────────────────────────────────────────────────────────────────
class PriceRange extends HTMLElement {
  constructor() {
    super();
    this.querySelectorAll('input').forEach((element) => {
      element.addEventListener('change', this.onRangeChange.bind(this));
      element.addEventListener('keydown', this.onKeyDown.bind(this));
    });
    this.setMinAndMaxValues();
  }

  onRangeChange(event) {
    this.adjustToValidValues(event.currentTarget);
    this.setMinAndMaxValues();
  }

  onKeyDown(event) {
    if (event.metaKey) return;
    const pattern = /[0-9]|\.|,|'| |Tab|Backspace|Enter|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Delete|Escape/;
    if (!event.key.match(pattern)) event.preventDefault();
  }

  setMinAndMaxValues() {
    const inputs = this.querySelectorAll('input');
    const minInput = inputs[0];
    const maxInput = inputs[1];
    if (maxInput.value) minInput.setAttribute('data-max', maxInput.value);
    if (minInput.value) maxInput.setAttribute('data-min', minInput.value);
    if (minInput.value === '') maxInput.setAttribute('data-min', 0);
    if (maxInput.value === '') minInput.setAttribute('data-max', maxInput.getAttribute('data-max'));
  }

  adjustToValidValues(input) {
    const value = Number(input.value);
    const min = Number(input.getAttribute('data-min'));
    const max = Number(input.getAttribute('data-max'));
    if (value < min) input.value = min;
    if (value > max) input.value = max;
  }
}

customElements.define('price-range', PriceRange);

// ── FacetRemove ───────────────────────────────────────────────────────────────
class FacetRemove extends HTMLElement {
  constructor() {
    super();
    const facetLink = this.querySelector('a');
    facetLink.setAttribute('role', 'button');
    facetLink.addEventListener('click', this.closeFilter.bind(this));
    facetLink.addEventListener('keyup', (event) => {
      event.preventDefault();
      if (event.code.toUpperCase() === 'SPACE') this.closeFilter(event);
    });
  }

  closeFilter(event) {
    event.preventDefault();
    const form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
    form.onActiveFilterClick(event);
  }
}

customElements.define('facet-remove', FacetRemove);

// ── Sort UI helpers ───────────────────────────────────────────────────────────
function updateSortUI(value) {
  // Sync all <select name="sort_by"> dropdowns
  document.querySelectorAll('select[name="sort_by"]').forEach(select => {
    select.value = value;
  });

  // Sync mobile sort drawer active states
  document.querySelectorAll('.mobile-sort-option').forEach(option => {
    const isActive = option.getAttribute('data-value') === value;
    option.classList.toggle('active', isActive);

    const existingCheck = option.querySelector('.mobile-sort-option__check');
    if (isActive && !existingCheck) {
      const check = document.createElement('span');
      check.className = 'mobile-sort-option__check';
      check.textContent = '✓';
      option.appendChild(check);
    } else if (!isActive && existingCheck) {
      existingCheck.remove();
    }
  });
}

// ── triggerSortSubmit ─────────────────────────────────────────────────────────
// Central handler for ALL sort changes — called from:
//   1. document 'change' listener (desktop/mobile <select>)
//   2. selectSortOption() in facets.liquid (mobile sort drawer buttons)
//
// discount-high-low → sends sort_by=manual to Shopify, then re-orders DOM client-side.
// All other values   → sent directly to Shopify unchanged.
// ─────────────────────────────────────────────────────────────────────────────
function triggerSortSubmit(sortValue) {
  const isDiscountSort = sortValue === 'discount-high-low';
  const shopifySortValue = isDiscountSort ? 'manual' : sortValue;

  // Flag must be set BEFORE renderPage so applyUpdate() picks it up
  FacetFiltersForm._pendingDiscountSort = isDiscountSort;

  // Sync all hidden sort inputs to the Shopify-safe value
  document.querySelectorAll('facet-filters-form form').forEach(form => {
    let sortInput = form.querySelector('[name="sort_by"]');
    if (!sortInput) {
      sortInput = document.createElement('input');
      sortInput.type = 'hidden';
      sortInput.name = 'sort_by';
      form.appendChild(sortInput);
    }
    sortInput.value = shopifySortValue;
  });

  const facetForm = document.querySelector('facet-filters-form');
  if (!facetForm) return;

  const mainForm = facetForm.querySelector('form');
  if (!mainForm) return;

  const formData = new FormData(mainForm);
  formData.set('sort_by', shopifySortValue);
  const searchParams = new URLSearchParams(formData).toString();

  // displaySortValue → browser URL shows 'discount-high-low'
  //                    Shopify fetch receives 'manual'
  FacetFiltersForm.renderPage(
    searchParams,
    null,
    true,
    isDiscountSort ? sortValue : null
  );
}

// ── Desktop & mobile <select> change ─────────────────────────────────────────
// Handles #SortBy (desktop horizontal/drawer) and #SortBy-mobile
document.addEventListener('change', function (event) {
  if (event.target.matches('#SortBy, #SortBy-mobile')) {
    event.preventDefault();
    const sortValue = event.target.value;
    updateSortUI(sortValue);
    triggerSortSubmit(sortValue);
  }
});

// ── Mobile sort drawer option click ──────────────────────────────────────────
// NOTE: The mobile sort drawer uses onclick="selectSortOption(value, name)" defined
// in facets.liquid. That function calls updateSortUI() + triggerSortSubmit() directly.
// We do NOT add a document click listener for .mobile-sort-option here because that
// would call triggerSortSubmit() a second time (double-fire).
// If selectSortOption in facets.liquid also dispatches change/submit/input events,
// those must be removed — see the updated selectSortOption in facets.liquid.

// ── Page load: direct links / refresh with sort in URL ───────────────────────
window.addEventListener('DOMContentLoaded', function () {
  const urlParams = new URLSearchParams(window.location.search);
  const currentSort = urlParams.get('sort_by');

  if (currentSort) {
    updateSortUI(currentSort);
  }

  // Page loaded with ?sort_by=discount-high-low (shared link / browser refresh)
  // Server rendered with 'manual' — run client-side sort immediately.
  if (currentSort === 'discount-high-low') {
    requestAnimationFrame(() => {
      FacetFiltersForm.sortProductsByDiscount();
    });
  }
});

// ── Performance logging (dev only) ───────────────────────────────────────────
// FIX 3: Wrap with try/catch so AbortErrors from cancelled requests don't
//         surface as unhandled promise rejections in the console.
if (window.performance && console.table) {
  const _originalRenderPage = FacetFiltersForm.renderPage.bind(FacetFiltersForm);

  FacetFiltersForm.renderPage = async function (...args) {
    const startTime = performance.now();
    try {
      await _originalRenderPage(...args);
    } catch (e) {
      if (e.name !== 'AbortError') throw e;
      // AbortError = superseded by a newer request — not a real error, don't log
      return;
    }
    const endTime = performance.now();
    console.log(`Filter render took ${(endTime - startTime).toFixed(2)}ms`);
  };
}
