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

// Utility: Enhanced debounce with immediate option
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

// Request manager to handle cancellation
class RequestManager {
  constructor() {
    this.controller = null;
  }

  cancelPending() {
    if (this.controller) {
      this.controller.abort();
    }
    this.controller = new AbortController();
    return this.controller.signal;
  }

  reset() {
    this.controller = null;
  }
}

class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();
    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);
    this.requestManager = new RequestManager();
    this.pendingUpdate = null;

    // Reduced debounce for better UX (300ms for input, instant for checkboxes)
    this.debouncedOnSubmit = debounce((event) => {
      this.onSubmitHandler(event);
    }, 300);

    const facetForm = this.querySelector('form');

    // Use different handlers for different input types
    facetForm.addEventListener('input', (event) => {
      // Instant for checkboxes and radio buttons
      if (event.target.type === 'checkbox' || event.target.type === 'radio') {
        this.onSubmitHandler(event);
      } else {
        // Debounced for text inputs (like price range)
        this.debouncedOnSubmit(event);
      }
    });

    const facetWrapper = this.querySelector('#FacetsWrapperDesktop');
    if (facetWrapper) facetWrapper.addEventListener('keyup', onKeyUpEscape);
  }

  static setListeners() {
    const onHistoryChange = (event) => {
      const searchParams = event.state ? event.state.searchParams : FacetFiltersForm.searchParamsInitial;
      if (searchParams === FacetFiltersForm.searchParamsPrev) return;

      // On popstate, check if the restored URL has discount-high-low
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
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.15s ease, visibility 0.15s ease;
            pointer-events: none;
          }
          .facet-preloader.active {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
          }
          .facet-preloader__overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(3px);
          }
          .facet-preloader__spinner {
            position: relative;
            z-index: 1;
          }
          .spinner {
            animation: rotate 1.5s linear infinite;
            width: 50px;
            height: 50px;
          }
          .spinner .path {
            stroke: #000;
            stroke-linecap: round;
            animation: dash 1.5s ease-in-out infinite;
          }
          @keyframes rotate {
            100% { transform: rotate(360deg); }
          }
          @keyframes dash {
            0% {
              stroke-dasharray: 1, 150;
              stroke-dashoffset: 0;
            }
            50% {
              stroke-dasharray: 90, 150;
              stroke-dashoffset: -35;
            }
            100% {
              stroke-dasharray: 90, 150;
              stroke-dashoffset: -124;
            }
          }
          .collection.loading {
            opacity: 0.6;
            pointer-events: none;
          }
          .loading {
            position: relative;
          }
        `;
        document.head.appendChild(style);
      }
    }

    requestAnimationFrame(() => {
      preloader.classList.add('active');
    });
  }

  static hidePreloader() {
    const preloader = document.getElementById('facet-preloader');
    if (preloader) {
      preloader.classList.remove('active');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // renderPage
  //   searchParams     = params actually sent to Shopify (discount sort → 'manual')
  //   displaySortValue = value written to the browser URL (e.g. 'discount-high-low')
  // ─────────────────────────────────────────────────────────────────────────────
  static async renderPage(searchParams, event, updateURLHash = true, displaySortValue = null) {
    // Cancel any pending requests
    const signal = FacetFiltersForm.requestManagerInstance.cancelPending();

    FacetFiltersForm.searchParamsPrev = searchParams;
    const sections = FacetFiltersForm.getSections();
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    window.lastScrollPosition = scrollY;

    // Show loading states
    FacetFiltersForm.showPreloader();
    FacetFiltersForm.setLoadingStates(true);

    // Build cache key using what the USER sees in the URL
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

    // Single optimised fetch for all sections
    try {
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
      if (error.name === 'AbortError') {
        console.log('Request cancelled');
        return;
      }
      console.error('Error fetching products:', error);
      FacetFiltersForm.hidePreloader();
      FacetFiltersForm.setLoadingStates(false);
    }
  }

  // LRU cache — keep last 20 filter combinations, expire after 5 min
  static addToCache(key, html) {
    const MAX_CACHE_SIZE = 20;
    if (FacetFiltersForm.filterData.length >= MAX_CACHE_SIZE) {
      FacetFiltersForm.filterData.shift();
    }
    FacetFiltersForm.filterData.push({ url: key, html, timestamp: Date.now() });
  }

  static getFromCache(key) {
    const cached = FacetFiltersForm.filterData.find(item => item.url === key);
    if (cached && (Date.now() - cached.timestamp) < 300000) {
      return cached.html;
    }
    if (cached) {
      FacetFiltersForm.filterData = FacetFiltersForm.filterData.filter(item => item.url !== key);
    }
    return null;
  }

  // Batch DOM updates
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

      // ── CLIENT-SIDE DISCOUNT SORT ───────────────────────────────────────────
      // Runs after grid is painted whenever _pendingDiscountSort flag is set
      if (FacetFiltersForm._pendingDiscountSort) {
        requestAnimationFrame(() => {
          FacetFiltersForm.sortProductsByDiscount();
          FacetFiltersForm._pendingDiscountSort = false;
        });
      }

      FacetFiltersForm.restoreScrollPosition();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // sortProductsByDiscount
  //   Reads data-price / data-compare-price from each <li class="grid__item">
  //   (set in main-collection-product-grid.liquid) and re-orders them highest
  //   discount % → lowest discount %.
  //   Shopify prices are in cents (integer), so no currency parsing needed.
  // ─────────────────────────────────────────────────────────────────────────────
  static sortProductsByDiscount() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    // Only sort regular product items — banner li's have no data-price
    const items = Array.from(grid.querySelectorAll('li.grid__item[data-price]'));

    items.sort((a, b) => {
      const aPrice   = parseFloat(a.dataset.price)        || 0;
      const aCompare = parseFloat(a.dataset.comparePrice) || aPrice;
      const bPrice   = parseFloat(b.dataset.price)        || 0;
      const bCompare = parseFloat(b.dataset.comparePrice) || bPrice;

      // discount% = (comparePrice - price) / comparePrice * 100
      const aDiscount = aCompare > aPrice ? ((aCompare - aPrice) / aCompare) * 100 : 0;
      const bDiscount = bCompare > bPrice ? ((bCompare - bPrice) / bCompare) * 100 : 0;

      return bDiscount - aDiscount; // High → Low
    });

    // Re-append in sorted order (banner li's stay in their original DOM position
    // because they don't have data-price and aren't moved)
    items.forEach(item => grid.appendChild(item));
  }

  static setLoadingStates(loading) {
    const productGrid = document.getElementById('ProductGridContainer');
    const countContainer = document.getElementById('ProductCount');
    const countContainerDesktop = document.getElementById('ProductCountDesktop');
    const spinners = document.querySelectorAll('.facets-container .loading__spinner, facet-filters-form .loading__spinner');

    if (loading) {
      if (productGrid?.querySelector('.collection')) {
        productGrid.querySelector('.collection').classList.add('loading');
      }
      countContainer?.classList.add('loading');
      countContainerDesktop?.classList.add('loading');
      spinners.forEach(spinner => spinner.classList.remove('hidden'));
    } else {
      if (productGrid?.querySelector('.collection')) {
        productGrid.querySelector('.collection').classList.remove('loading');
      }
      countContainer?.classList.remove('loading');
      countContainerDesktop?.classList.remove('loading');
      spinners.forEach(spinner => spinner.classList.add('hidden'));
    }
  }

  // Single RAF for scroll restoration
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
      !currentProducts.every(
        (el, i) => el.dataset.productId === newProducts[i]?.dataset.productId
      );

    if (needsFullReplace) {
      container.innerHTML = newContainer.innerHTML;
    } else {
      currentProducts.forEach((el, i) => {
        const newEl = newProducts[i];
        if (el.innerHTML !== newEl.innerHTML) {
          el.innerHTML = newEl.innerHTML;
        }
      });
    }

    // Cancel scroll animations
    container.querySelectorAll('.scroll-trigger').forEach((element) => {
      element.classList.add('scroll-trigger--cancel');
    });

    // Always re-init wishlist after grid update
    requestAnimationFrame(() => {
      initWishlist();
    });
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

    // Remove filters that no longer exist
    Array.from(facetDetailsElementsFromDom).forEach((currentElement) => {
      if (!Array.from(facetDetailsElementsFromFetch).some(({ id }) => currentElement.id === id)) {
        currentElement.remove();
      }
    });

    const matchesId = (element) => {
      const jsFilter = event ? event.target.closest('.js-filter') : undefined;
      return jsFilter ? element.id === jsFilter.id : false;
    };

    const facetsToRender = Array.from(facetDetailsElementsFromFetch).filter((element) => !matchesId(element));
    const countsToRender = Array.from(facetDetailsElementsFromFetch).find(matchesId);

    // Batch render all facets
    facetsToRender.forEach((elementToRender, index) => {
      const currentElement = document.getElementById(elementToRender.id);
      if (currentElement) {
        if (currentElement.innerHTML !== elementToRender.innerHTML) {
          currentElement.innerHTML = elementToRender.innerHTML;
        }
      } else {
        if (index > 0) {
          const { className: previousElementClassName, id: previousElementId } = facetsToRender[index - 1];
          if (elementToRender.className === previousElementClassName) {
            document.getElementById(previousElementId).after(elementToRender);
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
    const activeFacetElementSelectors = ['.active-facets-mobile', '.active-facets-desktop'];

    activeFacetElementSelectors.forEach((selector) => {
      const activeFacetsElement = html.querySelector(selector);
      const currentElement = document.querySelector(selector);

      if (activeFacetsElement && currentElement) {
        if (currentElement.innerHTML !== activeFacetsElement.innerHTML) {
          currentElement.innerHTML = activeFacetsElement.innerHTML;
        }
      }
    });

    FacetFiltersForm.toggleActiveFacets(false);
  }

  static renderAdditionalElements(html) {
    const mobileElementSelectors = ['.mobile-facets__open', '.mobile-facets__count', '.sorting'];

    mobileElementSelectors.forEach((selector) => {
      const newElement = html.querySelector(selector);
      const currentElement = document.querySelector(selector);

      if (newElement && currentElement && newElement.innerHTML !== currentElement.innerHTML) {
        currentElement.innerHTML = newElement.innerHTML;
      }
    });

    document.getElementById('FacetFiltersFormMobile')?.closest('menu-drawer')?.bindEvents();
  }

  static renderCounts(source, target) {
    const targetSummary = target.querySelector('.facets__summary');
    const sourceSummary = source.querySelector('.facets__summary');

    if (sourceSummary && targetSummary && sourceSummary.outerHTML !== targetSummary.outerHTML) {
      targetSummary.outerHTML = sourceSummary.outerHTML;
    }

    const targetHeaderElement = target.querySelector('.facets__header');
    const sourceHeaderElement = source.querySelector('.facets__header');

    if (sourceHeaderElement && targetHeaderElement && sourceHeaderElement.outerHTML !== targetHeaderElement.outerHTML) {
      targetHeaderElement.outerHTML = sourceHeaderElement.outerHTML;
    }

    const targetWrapElement = target.querySelector('.facets-wrap');
    const sourceWrapElement = source.querySelector('.facets-wrap');

    if (sourceWrapElement && targetWrapElement) {
      const isShowingMore = Boolean(target.querySelector('show-more-button .label-show-more.hidden'));
      if (isShowingMore) {
        sourceWrapElement
          .querySelectorAll('.facets__item.hidden')
          .forEach((hiddenItem) => hiddenItem.classList.replace('hidden', 'show-more-item'));
      }
      if (targetWrapElement.outerHTML !== sourceWrapElement.outerHTML) {
        targetWrapElement.outerHTML = sourceWrapElement.outerHTML;
      }
    }
  }

  static renderMobileCounts(source, target) {
    const targetFacetsList = target?.querySelector('.mobile-facets__list');
    const sourceFacetsList = source.querySelector('.mobile-facets__list');

    if (sourceFacetsList && targetFacetsList && sourceFacetsList.outerHTML !== targetFacetsList.outerHTML) {
      targetFacetsList.outerHTML = sourceFacetsList.outerHTML;
    }
  }

  static updateURLHash(searchParams) {
    history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
  }

  static getSections() {
    return [
      {
        section: document.getElementById('product-grid')?.dataset.id,
      },
    ];
  }

  createSearchParams(form) {
    const formData = new FormData(form);
    return new URLSearchParams(formData).toString();
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
          if (form.id === 'FacetSortForm' || form.id === 'FacetFiltersForm' || form.id === 'FacetSortDrawerForm') {
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

// ── Static property initialisation ───────────────────────────────────────────
FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
FacetFiltersForm.requestManagerInstance = new RequestManager();
FacetFiltersForm._pendingDiscountSort = false; // flag for client-side discount sort

customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();

// ─────────────────────────────────────────────────────────────────────────────
// PriceRange component — unchanged
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// FacetRemove component — unchanged
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Sort UI helpers
// ─────────────────────────────────────────────────────────────────────────────
function updateSortUI(value) {
  document.querySelectorAll('select[name="sort_by"]').forEach(select => {
    select.value = value;
  });

  document.querySelectorAll('.mobile-sort-option').forEach(option => {
    const optionValue = option.getAttribute('data-value');
    if (optionValue === value) {
      option.classList.add('active');
      if (!option.querySelector('.mobile-sort-option__check')) {
        const check = document.createElement('span');
        check.className = 'mobile-sort-option__check';
        check.textContent = '✓';
        option.appendChild(check);
      }
    } else {
      option.classList.remove('active');
      const check = option.querySelector('.mobile-sort-option__check');
      if (check) check.remove();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// triggerSortSubmit
//
//  discount-high-low → sends sort_by=manual to Shopify (Shopify ignores unknown
//  keys anyway but 'manual' = Featured which returns all products in store order).
//  After the fetch completes, sortProductsByDiscount() re-orders the DOM.
//
//  All other sort values → sent directly to Shopify as-is.
// ─────────────────────────────────────────────────────────────────────────────
function triggerSortSubmit(sortValue) {
  const isDiscountSort = sortValue === 'discount-high-low';

  // What Shopify actually receives
  const shopifySortValue = isDiscountSort ? 'manual' : sortValue;

  // Set flag BEFORE renderPage so applyUpdate picks it up
  FacetFiltersForm._pendingDiscountSort = isDiscountSort;

  // Sync all form sort inputs to the Shopify-safe value
  const forms = document.querySelectorAll('facet-filters-form form');
  forms.forEach(form => {
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
  if (facetForm) {
    const mainForm = facetForm.querySelector('form');
    if (mainForm) {
      const formData = new FormData(mainForm);
      formData.set('sort_by', shopifySortValue);
      const searchParams = new URLSearchParams(formData).toString();

      // Pass displaySortValue so the browser URL shows 'discount-high-low'
      // while the actual Shopify fetch uses 'manual'
      FacetFiltersForm.renderPage(
        searchParams,
        null,
        true,
        isDiscountSort ? sortValue : null
      );
    }
  }
}

// ── Desktop & mobile <select> change ─────────────────────────────────────────
document.addEventListener('change', function(event) {
  if (event.target.matches('#SortBy, #SortBy-mobile')) {
    event.preventDefault();
    const sortValue = event.target.value;
    updateSortUI(sortValue);
    triggerSortSubmit(sortValue);
  }
});

// ── Mobile sort drawer option click ──────────────────────────────────────────
document.addEventListener('click', function(event) {
  const sortOption = event.target.closest('.mobile-sort-option');
  if (sortOption) {
    event.preventDefault();
    const sortValue = sortOption.getAttribute('data-value');
    if (sortValue) {
      updateSortUI(sortValue);
      triggerSortSubmit(sortValue);
      if (typeof closeSortDrawer === 'function') {
        closeSortDrawer();
      }
    }
  }
});

// ── Page load: handle direct links / refresh with sort in URL ─────────────────
window.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const currentSort = urlParams.get('sort_by');

  if (currentSort) {
    updateSortUI(currentSort);
  }

  // If the page was loaded with ?sort_by=discount-high-low (shared link / refresh),
  // the server rendered with 'manual' sort — apply client-side discount sort immediately.
  if (currentSort === 'discount-high-low') {
    requestAnimationFrame(() => {
      FacetFiltersForm.sortProductsByDiscount();
    });
  }
});

// ── Performance logging (dev) ─────────────────────────────────────────────────
if (window.performance && console.table) {
  const originalRenderPage = FacetFiltersForm.renderPage;
  FacetFiltersForm.renderPage = async function(...args) {
    const startTime = performance.now();
    await originalRenderPage.apply(this, args);
    const endTime = performance.now();
    console.log(`Filter render took ${(endTime - startTime).toFixed(2)}ms`);
  };
}
