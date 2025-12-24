class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();
    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);

    this.debouncedOnSubmit = debounce((event) => {
      this.onSubmitHandler(event);
    }, 800);

    const facetForm = this.querySelector('form');
    facetForm.addEventListener(
      'change',
      (event) => {
        FacetFiltersForm.showImmediateFilterLoader();
        this.debouncedOnSubmit(event);
      },
      true
    );

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

  static toggleActiveFacets(disable = true) {
    document.querySelectorAll('.js-facet-remove').forEach((el) => {
      el.classList.toggle('disabled', disable);
    });
  }

  static showImmediateFilterLoader() {
    const grid = document.getElementById('ProductGridContainer');
    const collection = grid?.querySelector('.collection');

    document
      .querySelectorAll('.facets-container .loading__spinner, facet-filters-form .loading__spinner')
      .forEach((s) => s.classList.remove('hidden'));

    if (collection && !collection.classList.contains('loading')) {
      collection.classList.add('loading');
    }
  }

  static triggerExternalLoading() {
    const grid = document.getElementById('ProductGridContainer');
    const collection = grid?.querySelector('.collection');

    document
      .querySelectorAll('.facets-container .loading__spinner, facet-filters-form .loading__spinner')
      .forEach((s) => s.classList.remove('hidden'));

    if (collection) {
      collection.classList.remove('loading');
      void collection.offsetHeight;
      collection.classList.add('loading');
    }
  }

  static renderPage(searchParams, event, updateURLHash = true) {
    FacetFiltersForm.searchParamsPrev = searchParams;

    FacetFiltersForm.showImmediateFilterLoader();

    FacetFiltersForm.getSections().forEach((section) => {
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
      .then((r) => r.text())
      .then((html) => {
        FacetFiltersForm.filterData.push({ html, url });
        FacetFiltersForm.renderFilters(html, event);
        FacetFiltersForm.renderProductGridContainer(html);
        FacetFiltersForm.renderProductCount(html);
      });
  }

  static renderSectionFromCache(cache, event) {
    FacetFiltersForm.renderFilters(cache.html, event);
    FacetFiltersForm.renderProductGridContainer(cache.html);
    FacetFiltersForm.renderProductCount(cache.html);
  }

  static renderProductGridContainer(html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const newGrid = parsed.getElementById('ProductGridContainer');
    const container = document.getElementById('ProductGridContainer');

    container.innerHTML = newGrid.innerHTML;
    container.querySelector('.collection')?.classList.remove('loading');
  }

  static renderProductCount(html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const count = parsed.getElementById('ProductCount')?.innerHTML;

    const container = document.getElementById('ProductCount');
    const containerDesktop = document.getElementById('ProductCountDesktop');

    if (container) {
      container.innerHTML = count;
      container.classList.remove('loading');
    }

    if (containerDesktop) {
      containerDesktop.innerHTML = count;
      containerDesktop.classList.remove('loading');
    }

    document
      .querySelectorAll('.facets-container .loading__spinner, facet-filters-form .loading__spinner')
      .forEach((s) => s.classList.add('hidden'));
  }

  static renderFilters(html) {
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
    ['.active-facets-mobile', '.active-facets-desktop'].forEach((s) => {
      const el = html.querySelector(s);
      if (el) document.querySelector(s).innerHTML = el.innerHTML;
    });

    FacetFiltersForm.toggleActiveFacets(false);
  }

  static renderAdditionalElements(html) {
    ['.mobile-facets__open', '.mobile-facets__count', '.sorting'].forEach((s) => {
      const el = html.querySelector(s);
      if (el) document.querySelector(s).innerHTML = el.innerHTML;
    });

    document.getElementById('FacetFiltersFormMobile')?.closest('menu-drawer')?.bindEvents();
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
    const isMobile = event.target.closest('form')?.id === 'FacetFiltersFormMobile';

    document.querySelectorAll('facet-filters-form form').forEach((form) => {
      if (
        (!isMobile &&
          ['FacetFiltersForm', 'FacetSortForm', 'FacetSortDrawerForm'].includes(form.id)) ||
        (isMobile && form.id === 'FacetFiltersFormMobile')
      ) {
        forms.push(this.createSearchParams(form));
      }
    });

    FacetFiltersForm.renderPage(forms.join('&'), event);
  }

  onActiveFilterClick(event) {
    event.preventDefault();
    FacetFiltersForm.toggleActiveFacets();

    const params =
      event.currentTarget.href.indexOf('?') === -1
        ? ''
        : event.currentTarget.href.split('?')[1];

    FacetFiltersForm.renderPage(params);
  }
}

FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);

customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();

(function () {
  const originalPushState = history.pushState;

  history.pushState = function (state, title, url) {
    const oldUrl = window.location.href;
    originalPushState.apply(this, arguments);

    try {
      const oldParams = new URL(oldUrl).searchParams;
      const newParams = new URL(url, window.location.origin).searchParams;

      if (oldParams.get('sort_by') !== newParams.get('sort_by')) {
        FacetFiltersForm.triggerExternalLoading();
      }
    } catch (e) {}
  };
})();

class PriceRange extends HTMLElement {
  constructor() {
    super();
    this.querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', this.onRangeChange.bind(this));
      input.addEventListener('keydown', this.onKeyDown.bind(this));
    });
    this.setMinAndMaxValues();
  }

  onRangeChange(event) {
    this.adjustToValidValues(event.currentTarget);
    this.setMinAndMaxValues();
  }

  onKeyDown(event) {
    if (!event.key.match(/[0-9]|\.|,|Backspace|Tab|Enter|Arrow/)) {
      event.preventDefault();
    }
  }

  setMinAndMaxValues() {
    const [min, max] = this.querySelectorAll('input');
    if (max.value) min.dataset.max = max.value;
    if (min.value) max.dataset.min = min.value;
  }

  adjustToValidValues(input) {
    const value = Number(input.value);
    const min = Number(input.dataset.min);
    const max = Number(input.dataset.max);

    if (value < min) input.value = min;
    if (value > max) input.value = max;
  }
}

customElements.define('price-range', PriceRange);

class FacetRemove extends HTMLElement {
  constructor() {
    super();
    const link = this.querySelector('a');
    link.setAttribute('role', 'button');
    link.addEventListener('click', this.closeFilter.bind(this));
    link.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.closeFilter(e);
    });
  }

  closeFilter(event) {
    event.preventDefault();
    const form =
      this.closest('facet-filters-form') ||
      document.querySelector('facet-filters-form');
    form.onActiveFilterClick(event);
  }
}

customElements.define('facet-remove', FacetRemove);
