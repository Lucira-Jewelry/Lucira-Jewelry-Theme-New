class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();
    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);

    this.debouncedOnSubmit = debounce((event) => {
      this.onSubmitHandler(event);
    }, 800);

    const facetForm = this.querySelector('form');
    facetForm.addEventListener('input', this.debouncedOnSubmit.bind(this));

    const facetWrapper = this.querySelector('#FacetsWrapperDesktop');
    if (facetWrapper) facetWrapper.addEventListener('keyup', onKeyUpEscape);
  }

  static setListeners() {
    window.addEventListener('popstate', (event) => {
      const searchParams = event.state
        ? event.state.searchParams
        : FacetFiltersForm.searchParamsInitial;

      if (searchParams === FacetFiltersForm.searchParamsPrev) return;
      FacetFiltersForm.renderPage(searchParams, null, false);
    });
  }

  /* =========================
     🔥 LOADER CONTROLLER
     ========================= */
  static showLoader() {
    const grid = document.getElementById('ProductGridContainer');
    const collection = grid?.querySelector('.collection');

    document
      .querySelectorAll('.facets-container .loading__spinner, facet-filters-form .loading__spinner')
      .forEach((s) => s.classList.remove('hidden'));

    if (collection) {
      collection.classList.remove('loading');
      void collection.offsetHeight; // force repaint
      collection.classList.add('loading');
    }
  }

  static hideLoader() {
    const grid = document.getElementById('ProductGridContainer');
    const collection = grid?.querySelector('.collection');

    document
      .querySelectorAll('.facets-container .loading__spinner, facet-filters-form .loading__spinner')
      .forEach((s) => s.classList.add('hidden'));

    collection?.classList.remove('loading');
  }

  static toggleActiveFacets(disable = true) {
    document.querySelectorAll('.js-facet-remove').forEach((el) => {
      el.classList.toggle('disabled', disable);
    });
  }

  static renderPage(searchParams, event, updateURLHash = true) {
    FacetFiltersForm.searchParamsPrev = searchParams;

    // 🔥 SHOW LOADER FOR FILTERS
    FacetFiltersForm.showLoader();

    const sections = FacetFiltersForm.getSections();

    sections.forEach((section) => {
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
      const cached = FacetFiltersForm.filterData.find((el) => el.url === url);

      cached
        ? FacetFiltersForm.renderSectionFromCache(cached, event)
        : FacetFiltersForm.renderSectionFromFetch(url, event);
    });

    if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
  }

  static renderSectionFromFetch(url, event) {
    fetch(url)
      .then((res) => res.text())
      .then((html) => {
        FacetFiltersForm.filterData.push({ html, url });
        FacetFiltersForm.renderFilters(html, event);
        FacetFiltersForm.renderProductGridContainer(html);
        FacetFiltersForm.renderProductCount(html);
        FacetFiltersForm.hideLoader();
      });
  }

  static renderSectionFromCache(cache, event) {
    FacetFiltersForm.renderFilters(cache.html, event);
    FacetFiltersForm.renderProductGridContainer(cache.html);
    FacetFiltersForm.renderProductCount(cache.html);
    FacetFiltersForm.hideLoader();
  }

  static renderProductGridContainer(html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const newGrid = parsed.getElementById('ProductGridContainer');
    document.getElementById('ProductGridContainer').innerHTML = newGrid.innerHTML;
  }

  static renderProductCount(html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const count = parsed.getElementById('ProductCount')?.innerHTML;

    const container = document.getElementById('ProductCount');
    const containerDesktop = document.getElementById('ProductCountDesktop');

    if (container) container.innerHTML = count;
    if (containerDesktop) containerDesktop.innerHTML = count;
  }

  static renderFilters(html, event) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');

    const fetched = parsed.querySelectorAll(
      '#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter'
    );

    const existing = document.querySelectorAll(
      '#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter'
    );

    existing.forEach((el) => {
      if (![...fetched].some((f) => f.id === el.id)) el.remove();
    });

    fetched.forEach((el) => {
      const current = document.getElementById(el.id);
      if (current) current.innerHTML = el.innerHTML;
    });

    FacetFiltersForm.renderActiveFacets(parsed);
    FacetFiltersForm.renderAdditionalElements(parsed);
  }

  static renderActiveFacets(html) {
    ['.active-facets-mobile', '.active-facets-desktop'].forEach((selector) => {
      const el = html.querySelector(selector);
      if (el) document.querySelector(selector).innerHTML = el.innerHTML;
    });

    FacetFiltersForm.toggleActiveFacets(false);
  }

  static renderAdditionalElements(html) {
    ['.mobile-facets__open', '.mobile-facets__count', '.sorting'].forEach((selector) => {
      const el = html.querySelector(selector);
      if (el) document.querySelector(selector).innerHTML = el.innerHTML;
    });

    document
      .getElementById('FacetFiltersFormMobile')
      ?.closest('menu-drawer')
      ?.bindEvents();
  }

  static updateURLHash(searchParams) {
    history.pushState(
      { searchParams },
      '',
      `${window.location.pathname}${searchParams ? '?' + searchParams : ''}`
    );
  }

  static getSections() {
    return [{ section: document.getElementById('product-grid').dataset.id }];
  }

  createSearchParams(form) {
    return new URLSearchParams(new FormData(form)).toString();
  }

  onSubmitHandler(event) {
    event.preventDefault();
    const forms = [];

    document.querySelectorAll('facet-filters-form form').forEach((form) => {
      if (
        ['FacetFiltersForm', 'FacetSortForm', 'FacetSortDrawerForm', 'FacetFiltersFormMobile'].includes(form.id)
      ) {
        forms.push(this.createSearchParams(form));
      }
    });

    FacetFiltersForm.renderPage(forms.join('&'), event);
  }

  onActiveFilterClick(event) {
    event.preventDefault();
    FacetFiltersForm.toggleActiveFacets();
    const params = event.currentTarget.href.split('?')[1] || '';
    FacetFiltersForm.renderPage(params);
  }
}

FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);

customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();

/* ============================
   🔥 SORT → LOADER BRIDGE
   ============================ */
(function () {
  const originalPushState = history.pushState;

  history.pushState = function (state, title, url) {
    const oldUrl = window.location.href;
    originalPushState.apply(this, arguments);

    try {
      const oldParams = new URL(oldUrl).searchParams;
      const newParams = new URL(url, window.location.origin).searchParams;

      if (oldParams.get('sort_by') !== newParams.get('sort_by')) {
        FacetFiltersForm.showLoader();
        setTimeout(() => FacetFiltersForm.hideLoader(), 350);
      }
    } catch (e) {}
  };
})();
