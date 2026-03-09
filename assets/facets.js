function initWishlist() {
  try {
    if (typeof iWish !== "undefined" && typeof iWish.init === "function") {
      iWish.init();
    }
    document.dispatchEvent(new CustomEvent("iwish:reload"));
    document.dispatchEvent(new CustomEvent("wishlist:init"));
    if (typeof iWishCounter === "function") iWishCounter();
  } catch (e) {
    console.log("Wishlist init error", e);
  }
}

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

class RequestManager {
  constructor() { this.controller = null; }
  cancelPending() {
    if (this.controller) this.controller.abort();
    this.controller = new AbortController();
    return this.controller.signal;
  }
  reset() { this.controller = null; }
}


// =====================================================
// FACET FILTERS FORM
// =====================================================
class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();
    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);
    this.requestManager = new RequestManager();

    this.debouncedOnSubmit = debounce((event) => {
      this.onSubmitHandler(event);
    }, 300);

    const facetForm = this.querySelector('form');
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
    window.addEventListener('popstate', (event) => {
      const searchParams = event.state ? event.state.searchParams : FacetFiltersForm.searchParamsInitial;
      if (searchParams === FacetFiltersForm.searchParamsPrev) return;
      FacetFiltersForm.renderPage(searchParams, null, false);
    });
  }

  static toggleActiveFacets(disable = true) {
    document.querySelectorAll('.js-facet-remove').forEach(el => el.classList.toggle('disabled', disable));
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
        </div>`;
      document.body.appendChild(preloader);

      if (!document.getElementById('facet-preloader-styles')) {
        const style = document.createElement('style');
        style.id = 'facet-preloader-styles';
        style.textContent = `
          .facet-preloader{position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999;
            display:flex;align-items:center;justify-content:center;
            opacity:0;visibility:hidden;transition:opacity .15s ease,visibility .15s ease;pointer-events:none;}
          .facet-preloader.active{opacity:1;visibility:visible;pointer-events:auto;}
          .facet-preloader__overlay{position:absolute;top:0;left:0;right:0;bottom:0;
            background:rgba(255,255,255,.85);backdrop-filter:blur(3px);}
          .facet-preloader__spinner{position:relative;z-index:1;}
          .spinner{animation:rotate 1.5s linear infinite;width:50px;height:50px;}
          .spinner .path{stroke:#000;stroke-linecap:round;animation:dash 1.5s ease-in-out infinite;}
          @keyframes rotate{100%{transform:rotate(360deg)}}
          @keyframes dash{
            0%{stroke-dasharray:1,150;stroke-dashoffset:0}
            50%{stroke-dasharray:90,150;stroke-dashoffset:-35}
            100%{stroke-dasharray:90,150;stroke-dashoffset:-124}}
          .collection.loading{opacity:.6;pointer-events:none;}
          .loading{position:relative;}`;
        document.head.appendChild(style);
      }
    }
    requestAnimationFrame(() => preloader.classList.add('active'));
  }

  static hidePreloader() {
    document.getElementById('facet-preloader')?.classList.remove('active');
  }

  // ── MAIN ENTRY POINT ─────────────────────────────────────────────────────
  static async renderPage(searchParams, event, updateURLHash = true) {
    const signal = FacetFiltersForm.requestManagerInstance.cancelPending();

    FacetFiltersForm.searchParamsPrev = searchParams;
    window.lastScrollPosition = window.pageYOffset || document.documentElement.scrollTop || 0;

    FacetFiltersForm.showPreloader();
    FacetFiltersForm.setLoadingStates(true);

    const cacheKey = `${window.location.pathname}?${searchParams}`;
    const cached = FacetFiltersForm.getFromCache(cacheKey);
    if (cached) {
      FacetFiltersForm.applyUpdate(cached, event, false);
      if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
      return;
    }

    try {
      const sectionId = FacetFiltersForm.getSections()[0].section;
      const url = `${window.location.pathname}?section_id=${sectionId}&${searchParams}`;
      const response = await fetch(url, { signal, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      FacetFiltersForm.addToCache(cacheKey, html);
      FacetFiltersForm.applyUpdate(html, event, false);
      if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Filter fetch error:', err);
      FacetFiltersForm.hidePreloader();
      FacetFiltersForm.setLoadingStates(false);
    }
  }

  // ── Normal-sort cache ────────────────────────────────────────────────────
  static addToCache(key, html) {
    if (FacetFiltersForm.filterData.length >= 20) FacetFiltersForm.filterData.shift();
    FacetFiltersForm.filterData.push({ url: key, html, timestamp: Date.now() });
  }
  static getFromCache(key) {
    const cached = FacetFiltersForm.filterData.find(i => i.url === key);
    if (cached && (Date.now() - cached.timestamp) < 300000) return cached.html;
    if (cached) FacetFiltersForm.filterData = FacetFiltersForm.filterData.filter(i => i.url !== key);
    return null;
  }

  // ── DOM update helpers ───────────────────────────────────────────────────
  static applyUpdate(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');
    requestAnimationFrame(() => {
      FacetFiltersForm.renderFilters(html, event, parsedHTML);
      FacetFiltersForm.renderProductGridContainer(parsedHTML);
      FacetFiltersForm.renderProductCount(parsedHTML);
      if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger(html);
      FacetFiltersForm.restoreScrollPosition();
    });
  }

  static setLoadingStates(loading) {
    const productGrid           = document.getElementById('ProductGridContainer');
    const countContainer        = document.getElementById('ProductCount');
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
    requestAnimationFrame(() => {
      window.scrollTo(0, window.lastScrollPosition || 0);
      FacetFiltersForm.hidePreloader();
      FacetFiltersForm.setLoadingStates(false);
      FacetFiltersForm.requestManagerInstance.reset();
    });
  }

  static renderProductGridContainer(parsedHTML) {
    const container    = document.getElementById('ProductGridContainer');
    const newContainer = parsedHTML.getElementById('ProductGridContainer');
    if (!container || !newContainer) return;

    const currentProducts = Array.from(container.querySelectorAll('[data-product-id]'));
    const newProducts     = Array.from(newContainer.querySelectorAll('[data-product-id]'));

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

    container.querySelectorAll('.scroll-trigger').forEach(el => el.classList.add('scroll-trigger--cancel'));
    requestAnimationFrame(() => initWishlist());
  }

  static renderProductCount(parsedHTML) {
    const newCount = parsedHTML.getElementById('ProductCount');
    if (!newCount) return;
    const c  = document.getElementById('ProductCount');
    const cd = document.getElementById('ProductCountDesktop');
    if (c  && c.textContent  !== newCount.textContent)  c.innerHTML  = newCount.innerHTML;
    if (cd && cd.textContent !== newCount.textContent) cd.innerHTML  = newCount.innerHTML;
  }

  static renderFilters(html, event, parsedHTML) {
    parsedHTML = parsedHTML || new DOMParser().parseFromString(html, 'text/html');

    const fromFetch = parsedHTML.querySelectorAll(
      '#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter'
    );
    const fromDom = document.querySelectorAll(
      '#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter'
    );

    Array.from(fromDom).forEach(cur => {
      if (!Array.from(fromFetch).some(({ id }) => cur.id === id)) cur.remove();
    });

    const matchesId = el => {
      const jsFilter = event ? event.target.closest('.js-filter') : undefined;
      return jsFilter ? el.id === jsFilter.id : false;
    };

    const facetsToRender = Array.from(fromFetch).filter(el => !matchesId(el));
    const countsToRender = Array.from(fromFetch).find(matchesId);

    facetsToRender.forEach((elToRender, index) => {
      const cur = document.getElementById(elToRender.id);
      if (cur) {
        if (cur.innerHTML !== elToRender.innerHTML) cur.innerHTML = elToRender.innerHTML;
      } else {
        if (index > 0) {
          const { className: prevClass, id: prevId } = facetsToRender[index - 1];
          if (elToRender.className === prevClass) {
            document.getElementById(prevId)?.after(elToRender);
            return;
          }
        }
        if (elToRender.parentElement) {
          document.querySelector(`#${elToRender.parentElement.id} .js-filter`)?.before(elToRender);
        }
      }
    });

    FacetFiltersForm.renderActiveFacets(parsedHTML);
    FacetFiltersForm.renderAdditionalElements(parsedHTML);

    if (countsToRender) {
      const id = event?.target.closest('.js-filter')?.id;
      if (id) {
        FacetFiltersForm.renderCounts(countsToRender, event.target.closest('.js-filter'));
        FacetFiltersForm.renderMobileCounts(countsToRender, document.getElementById(id));
      }
    }
  }

  static renderActiveFacets(html) {
    ['.active-facets-mobile', '.active-facets-desktop'].forEach(sel => {
      const n = html.querySelector(sel);
      const c = document.querySelector(sel);
      if (n && c && c.innerHTML !== n.innerHTML) c.innerHTML = n.innerHTML;
    });
    FacetFiltersForm.toggleActiveFacets(false);
  }

  static renderAdditionalElements(html) {
    ['.mobile-facets__open', '.mobile-facets__count'].forEach(sel => {
      const n = html.querySelector(sel);
      const c = document.querySelector(sel);
      if (n && c && n.innerHTML !== c.innerHTML) c.innerHTML = n.innerHTML;
    });
    document.getElementById('FacetFiltersFormMobile')?.closest('menu-drawer')?.bindEvents();
  }

  static renderCounts(source, target) {
    [
      [target.querySelector('.facets__summary'), source.querySelector('.facets__summary')],
      [target.querySelector('.facets__header'),  source.querySelector('.facets__header')],
    ].forEach(([t, s]) => {
      if (s && t && s.outerHTML !== t.outerHTML) t.outerHTML = s.outerHTML;
    });

    const tWrap = target.querySelector('.facets-wrap');
    const sWrap = source.querySelector('.facets-wrap');
    if (sWrap && tWrap) {
      if (Boolean(target.querySelector('show-more-button .label-show-more.hidden'))) {
        sWrap.querySelectorAll('.facets__item.hidden')
          .forEach(item => item.classList.replace('hidden', 'show-more-item'));
      }
      if (tWrap.outerHTML !== sWrap.outerHTML) tWrap.outerHTML = sWrap.outerHTML;
    }
  }

  static renderMobileCounts(source, target) {
    const s = source.querySelector('.mobile-facets__list');
    const t = target?.querySelector('.mobile-facets__list');
    if (s && t && s.outerHTML !== t.outerHTML) t.outerHTML = s.outerHTML;
  }

  static updateURLHash(searchParams) {
    history.pushState(
      { searchParams },
      '',
      `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`
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
      this.onSubmitForm(this.createSearchParams(event.target.closest('form')), event);
    } else {
      const forms  = [];
      const isMob  = event.target.closest('form')?.id === 'FacetFiltersFormMobile';
      sortFilterForms.forEach(form => {
        if (!isMob) {
          if (['FacetSortForm', 'FacetFiltersForm', 'FacetSortDrawerForm'].includes(form.id)) {
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
    const url = event.currentTarget.href.indexOf('?') === -1
      ? ''
      : event.currentTarget.href.slice(event.currentTarget.href.indexOf('?') + 1);
    FacetFiltersForm.renderPage(url);
  }
}

// ── Static property initialisation ───────────────────────────────────────────
FacetFiltersForm.filterData             = [];
FacetFiltersForm.searchParamsInitial    = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev       = window.location.search.slice(1);
FacetFiltersForm.requestManagerInstance = new RequestManager();

customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();


// ============================================
// PRICE RANGE COMPONENT
// ============================================
class PriceRange extends HTMLElement {
  constructor() {
    super();
    this.querySelectorAll('input').forEach(el => {
      el.addEventListener('change', this.onRangeChange.bind(this));
      el.addEventListener('keydown', this.onKeyDown.bind(this));
    });
    this.setMinAndMaxValues();
  }
  onRangeChange(event) { this.adjustToValidValues(event.currentTarget); this.setMinAndMaxValues(); }
  onKeyDown(event) {
    if (event.metaKey) return;
    if (!/[0-9]|\.|,|'| |Tab|Backspace|Enter|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Delete|Escape/.test(event.key)) {
      event.preventDefault();
    }
  }
  setMinAndMaxValues() {
    const [min, max] = this.querySelectorAll('input');
    if (max.value) min.setAttribute('data-max', max.value);
    if (min.value) max.setAttribute('data-min', min.value);
    if (min.value === '') max.setAttribute('data-min', 0);
    if (max.value === '') min.setAttribute('data-max', max.getAttribute('data-max'));
  }
  adjustToValidValues(input) {
    const val = Number(input.value), min = Number(input.getAttribute('data-min')), max = Number(input.getAttribute('data-max'));
    if (val < min) input.value = min;
    if (val > max) input.value = max;
  }
}
customElements.define('price-range', PriceRange);


// ============================================
// FACET REMOVE COMPONENT
// ============================================
class FacetRemove extends HTMLElement {
  constructor() {
    super();
    const link = this.querySelector('a');
    link.setAttribute('role', 'button');
    link.addEventListener('click', this.closeFilter.bind(this));
    link.addEventListener('keyup', e => { e.preventDefault(); if (e.code.toUpperCase() === 'SPACE') this.closeFilter(e); });
  }
  closeFilter(event) {
    event.preventDefault();
    const form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
    form.onActiveFilterClick(event);
  }
}
customElements.define('facet-remove', FacetRemove);


// ============================================
// SORT FUNCTIONALITY
// ============================================
function updateSortUI(value) {
  document.querySelectorAll('select[name="sort_by"]').forEach(s => { s.value = value; });
  document.querySelectorAll('.mobile-sort-option').forEach(opt => {
    const isActive = opt.getAttribute('data-value') === value;
    opt.classList.toggle('active', isActive);
    opt.querySelector('.mobile-sort-option__check')?.remove();
    if (isActive) {
      const check = document.createElement('span');
      check.className = 'mobile-sort-option__check';
      check.textContent = '✓';
      opt.appendChild(check);
    }
  });
}

function triggerSortSubmit(sortValue) {
  document.querySelectorAll('facet-filters-form form').forEach(form => {
    let inp = form.querySelector('[name="sort_by"]');
    if (!inp) {
      inp = document.createElement('input');
      inp.type = 'hidden';
      inp.name = 'sort_by';
      form.appendChild(inp);
    }
    inp.value = sortValue;
  });

  const facetForm = document.querySelector('facet-filters-form');
  if (facetForm) {
    const mainForm = facetForm.querySelector('form');
    if (mainForm) {
      const formData = new FormData(mainForm);
      formData.set('sort_by', sortValue);
      FacetFiltersForm.renderPage(new URLSearchParams(formData).toString(), null, true);
    }
  }
}

// Desktop sort dropdown
document.addEventListener('change', function (event) {
  if (event.target.matches('#SortBy, #SortBy-mobile')) {
    event.preventDefault();
    updateSortUI(event.target.value);
    triggerSortSubmit(event.target.value);
  }
});

// Mobile sort drawer option
document.addEventListener('click', function (event) {
  const sortOption = event.target.closest('.mobile-sort-option');
  if (sortOption) {
    event.preventDefault();
    const val = sortOption.getAttribute('data-value');
    if (val) {
      updateSortUI(val);
      triggerSortSubmit(val);
      if (typeof closeSortDrawer === 'function') closeSortDrawer();
    }
  }
});

// Initialise on page load
window.addEventListener('DOMContentLoaded', function () {
  const currentSort = new URLSearchParams(window.location.search).get('sort_by');
  if (currentSort) updateSortUI(currentSort);
});

if (window.performance && console.table) {
  const _orig = FacetFiltersForm.renderPage;
  FacetFiltersForm.renderPage = async function (...args) {
    const t = performance.now();
    await _orig.apply(this, args);
    console.log(`[Facets] renderPage: ${(performance.now() - t).toFixed(2)}ms`);
  };
}