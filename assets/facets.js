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
    const onHistoryChange = (event) => {
      const searchParams = event.state ? event.state.searchParams : FacetFiltersForm.searchParamsInitial;
      if (searchParams === FacetFiltersForm.searchParamsPrev) return;
      FacetFiltersForm.renderPage(searchParams, null, false);
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
      
      // Add styles if not already present
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
            transition: opacity 0.2s ease, visibility 0.2s ease;
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
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(2px);
          }
          .facet-preloader__spinner {
            position: relative;
            z-index: 1;
          }
          .spinner {
            animation: rotate 2s linear infinite;
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

  static renderPage(searchParams, event, updateURLHash = true) {
    FacetFiltersForm.searchParamsPrev = searchParams;
    const sections = FacetFiltersForm.getSections();
    const countContainer = document.getElementById('ProductCount');
    const countContainerDesktop = document.getElementById('ProductCountDesktop');
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    window.lastScrollPosition = scrollY;
    FacetFiltersForm.showPreloader();
    
    const loadingSpinners = document.querySelectorAll(
      '.facets-container .loading__spinner, facet-filters-form .loading__spinner'
    );
    loadingSpinners.forEach((spinner) => spinner.classList.remove('hidden'));
    
    const productGrid = document.getElementById('ProductGridContainer');
    if (productGrid && productGrid.querySelector('.collection')) {
      productGrid.querySelector('.collection').classList.add('loading');
    }
    
    if (countContainer) {
      countContainer.classList.add('loading');
    }
    if (countContainerDesktop) {
      countContainerDesktop.classList.add('loading');
    }

    sections.forEach((section) => {
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
      const filterDataUrl = (element) => element.url === url;

      FacetFiltersForm.filterData.some(filterDataUrl)
        ? FacetFiltersForm.renderSectionFromCache(filterDataUrl, event)
        : FacetFiltersForm.renderSectionFromFetch(url, event);
    });

    if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
  }

  static renderSectionFromFetch(url, event) {
    fetch(url)
      .then((response) => response.text())
      .then((responseText) => {
        const html = responseText;
        FacetFiltersForm.filterData = [...FacetFiltersForm.filterData, { html, url }];
        FacetFiltersForm.renderFilters(html, event);
        FacetFiltersForm.renderProductGridContainer(html);
        FacetFiltersForm.renderProductCount(html);
        if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger(html.innerHTML);
        FacetFiltersForm.restoreScrollPosition();
      })
      .catch((error) => {
        console.error('Error fetching products:', error);
        FacetFiltersForm.hidePreloader();
      });
  }

  static renderSectionFromCache(filterDataUrl, event) {
    const html = FacetFiltersForm.filterData.find(filterDataUrl).html;
    FacetFiltersForm.renderFilters(html, event);
    FacetFiltersForm.renderProductGridContainer(html);
    FacetFiltersForm.renderProductCount(html);
    if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger(html.innerHTML);
    FacetFiltersForm.restoreScrollPosition();
  }

  static restoreScrollPosition() {
    const scrollY = window.lastScrollPosition || 0;
    const restoreScroll = () => {
      if (window.pageYOffset !== scrollY) {
        window.scrollTo(0, scrollY);
      }
    };
    restoreScroll();
    requestAnimationFrame(() => {
      restoreScroll();
      requestAnimationFrame(() => {
        restoreScroll();
        setTimeout(() => {
          FacetFiltersForm.hidePreloader();
        }, 50);
      });
    });
  }

  static renderProductGridContainer(html) {
    document.getElementById('ProductGridContainer').innerHTML = new DOMParser()
      .parseFromString(html, 'text/html')
      .getElementById('ProductGridContainer').innerHTML;

    document
      .getElementById('ProductGridContainer')
      .querySelectorAll('.scroll-trigger')
      .forEach((element) => {
        element.classList.add('scroll-trigger--cancel');
      });
  }

  static renderProductCount(html) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');

    const newCount = parsedHTML.getElementById('ProductCount');
    if (!newCount) return;

    const container = document.getElementById('ProductCount');
    const containerDesktop = document.getElementById('ProductCountDesktop');

    if (container) {
      container.innerHTML = newCount.innerHTML;
      container.classList.remove('loading');
    }

    if (containerDesktop) {
      containerDesktop.innerHTML = newCount.innerHTML;
      containerDesktop.classList.remove('loading');
    }

    document
      .querySelectorAll('.facets-container .loading__spinner, facet-filters-form .loading__spinner')
      .forEach((spinner) => spinner.classList.add('hidden'));
  }



  static renderFilters(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');
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

    const facetsToRender = Array.from(facetDetailsElementsFromFetch).filter((element) => !matchesId(element));
    const countsToRender = Array.from(facetDetailsElementsFromFetch).find(matchesId);

    facetsToRender.forEach((elementToRender, index) => {
      const currentElement = document.getElementById(elementToRender.id);
      if (currentElement) {
        document.getElementById(elementToRender.id).innerHTML = elementToRender.innerHTML;
      } else {
        if (index > 0) {
          const { className: previousElementClassName, id: previousElementId } = facetsToRender[index - 1];
          if (elementToRender.className === previousElementClassName) {
            document.getElementById(previousElementId).after(elementToRender);
            return;
          }
        }

        if (elementToRender.parentElement) {
          document.querySelector(`#${elementToRender.parentElement.id} .js-filter`).before(elementToRender);
        }
      }
    });

    FacetFiltersForm.renderActiveFacets(parsedHTML);
    FacetFiltersForm.renderAdditionalElements(parsedHTML);

    if (countsToRender) {
      const closestJSFilterID = event.target.closest('.js-filter').id;

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
      if (!activeFacetsElement) return;
      document.querySelector(selector).innerHTML = activeFacetsElement.innerHTML;
    });

    FacetFiltersForm.toggleActiveFacets(false);
  }

  static renderAdditionalElements(html) {
    const mobileElementSelectors = ['.mobile-facets__open', '.mobile-facets__count', '.sorting'];

    mobileElementSelectors.forEach((selector) => {
      if (!html.querySelector(selector)) return;
      document.querySelector(selector).innerHTML = html.querySelector(selector).innerHTML;
    });

    document.getElementById('FacetFiltersFormMobile').closest('menu-drawer').bindEvents();
  }

  static renderCounts(source, target) {
    const targetSummary = target.querySelector('.facets__summary');
    const sourceSummary = source.querySelector('.facets__summary');

    if (sourceSummary && targetSummary) {
      targetSummary.outerHTML = sourceSummary.outerHTML;
    }

    const targetHeaderElement = target.querySelector('.facets__header');
    const sourceHeaderElement = source.querySelector('.facets__header');

    if (sourceHeaderElement && targetHeaderElement) {
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

      targetWrapElement.outerHTML = sourceWrapElement.outerHTML;
    }
  }

  static renderMobileCounts(source, target) {
    const targetFacetsList = target.querySelector('.mobile-facets__list');
    const sourceFacetsList = source.querySelector('.mobile-facets__list');

    if (sourceFacetsList && targetFacetsList) {
      targetFacetsList.outerHTML = sourceFacetsList.outerHTML;
    }
  }

  static updateURLHash(searchParams) {
    history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
  }

  static getSections() {
    return [
      {
        section: document.getElementById('product-grid').dataset.id,
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
    if (event.srcElement && event.srcElement.className == 'mobile-facets__checkbox') {
      const searchParams = this.createSearchParams(event.target.closest('form'));
      this.onSubmitForm(searchParams, event);
    } else {
      const forms = [];
      const isMobile = event.target.closest('form') && event.target.closest('form').id === 'FacetFiltersFormMobile';

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
      event.currentTarget.href.indexOf('?') == -1
        ? ''
        : event.currentTarget.href.slice(event.currentTarget.href.indexOf('?') + 1);
    FacetFiltersForm.renderPage(url);
  }
}

FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();

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

// Function to update sort UI elements
function updateSortUI(value) {
  // Update all select dropdowns
  document.querySelectorAll('select[name="sort_by"]').forEach(select => {
    select.value = value;
  });
  
  // Update mobile sort drawer checkmarks
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

// Function to trigger form submission for sorting
function triggerSortSubmit(sortValue) {
  // Update all forms with the new sort value
  const forms = document.querySelectorAll('facet-filters-form form');
  
  forms.forEach(form => {
    // Update or create sort_by input
    let sortInput = form.querySelector('[name="sort_by"]');
    if (!sortInput) {
      sortInput = document.createElement('input');
      sortInput.type = 'hidden';
      sortInput.name = 'sort_by';
      form.appendChild(sortInput);
    }
    sortInput.value = sortValue;
  });
  
  // Get the main facet form element
  const facetForm = document.querySelector('facet-filters-form');
  if (facetForm) {
    // Create form data with all current filters + new sort
    const mainForm = facetForm.querySelector('form');
    if (mainForm) {
      const formData = new FormData(mainForm);
      formData.set('sort_by', sortValue);
      const searchParams = new URLSearchParams(formData).toString();
      
      // Trigger the render
      FacetFiltersForm.renderPage(searchParams, null, true);
    }
  }
}

// Desktop sort handler
document.addEventListener('change', function(event) {
  if (event.target.matches('#SortBy, #SortBy-mobile')) {
    event.preventDefault();
    const sortValue = event.target.value;
    updateSortUI(sortValue);
    triggerSortSubmit(sortValue);
  }
});

// Mobile sort drawer click handler
document.addEventListener('click', function(event) {
  const sortOption = event.target.closest('.mobile-sort-option');
  if (sortOption) {
    event.preventDefault();
    const sortValue = sortOption.getAttribute('data-value');
    
    if (sortValue) {
      updateSortUI(sortValue);
      triggerSortSubmit(sortValue);
      
      // Close drawer
      if (typeof closeSortDrawer === 'function') {
        closeSortDrawer();
      }
    }
  }
});

// Initialize sort UI on page load
window.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const currentSort = urlParams.get('sort_by');
  if (currentSort) {
    updateSortUI(currentSort);
  }
});

// Update sort UI after AJAX updates
const originalRenderPage = FacetFiltersForm.renderPage;
FacetFiltersForm.renderPage = function(searchParams, event, updateURLHash) {
  // Call original function
  originalRenderPage.call(this, searchParams, event, updateURLHash);
  
  // Update sort UI after render
  setTimeout(() => {
    const urlParams = new URLSearchParams(searchParams);
    const sortValue = urlParams.get('sort_by');
    if (sortValue) {
      updateSortUI(sortValue);
    }
  }, 100);
};



































// // Utility: Enhanced debounce with immediate option
// function debounce(func, wait, immediate = false) {
//   let timeout;
//   return function executedFunction(...args) {
//     const context = this;
//     const later = () => {
//       timeout = null;
//       if (!immediate) func.apply(context, args);
//     };
//     const callNow = immediate && !timeout;
//     clearTimeout(timeout);
//     timeout = setTimeout(later, wait);
//     if (callNow) func.apply(context, args);
//   };
// }

// // Request manager to handle cancellation
// class RequestManager {
//   constructor() {
//     this.controller = null;
//   }

//   cancelPending() {
//     if (this.controller) {
//       this.controller.abort();
//     }
//     this.controller = new AbortController();
//     return this.controller.signal;
//   }

//   reset() {
//     this.controller = null;
//   }
// }

// class FacetFiltersForm extends HTMLElement {
//   constructor() {
//     super();
//     this.onActiveFilterClick = this.onActiveFilterClick.bind(this);
//     this.requestManager = new RequestManager();
//     this.pendingUpdate = null;

//     // Reduced debounce for better UX (300ms for input, instant for checkboxes)
//     this.debouncedOnSubmit = debounce((event) => {
//       this.onSubmitHandler(event);
//     }, 300);

//     const facetForm = this.querySelector('form');
    
//     // Use different handlers for different input types
//     facetForm.addEventListener('input', (event) => {
//       // Instant for checkboxes and radio buttons
//       if (event.target.type === 'checkbox' || event.target.type === 'radio') {
//         this.onSubmitHandler(event);
//       } else {
//         // Debounced for text inputs (like price range)
//         this.debouncedOnSubmit(event);
//       }
//     });

//     const facetWrapper = this.querySelector('#FacetsWrapperDesktop');
//     if (facetWrapper) facetWrapper.addEventListener('keyup', onKeyUpEscape);
//   }

//   static setListeners() {
//     const onHistoryChange = (event) => {
//       const searchParams = event.state ? event.state.searchParams : FacetFiltersForm.searchParamsInitial;
//       if (searchParams === FacetFiltersForm.searchParamsPrev) return;
//       FacetFiltersForm.renderPage(searchParams, null, false);
//     };
//     window.addEventListener('popstate', onHistoryChange);
//   }

//   static toggleActiveFacets(disable = true) {
//     document.querySelectorAll('.js-facet-remove').forEach((element) => {
//       element.classList.toggle('disabled', disable);
//     });
//   }

//   static showPreloader() {
//     let preloader = document.getElementById('facet-preloader');
//     if (!preloader) {
//       preloader = document.createElement('div');
//       preloader.id = 'facet-preloader';
//       preloader.className = 'facet-preloader';
//       preloader.innerHTML = `
//         <div class="facet-preloader__overlay"></div>
//         <div class="facet-preloader__spinner">
//           <svg class="spinner" viewBox="0 0 50 50">
//             <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
//           </svg>
//         </div>
//       `;
//       document.body.appendChild(preloader);
      
//       if (!document.getElementById('facet-preloader-styles')) {
//         const style = document.createElement('style');
//         style.id = 'facet-preloader-styles';
//         style.textContent = `
//           .facet-preloader {
//             position: fixed;
//             top: 0;
//             left: 0;
//             right: 0;
//             bottom: 0;
//             z-index: 999999;
//             display: flex;
//             align-items: center;
//             justify-content: center;
//             opacity: 0;
//             visibility: hidden;
//             transition: opacity 0.15s ease, visibility 0.15s ease;
//             pointer-events: none;
//           }
//           .facet-preloader.active {
//             opacity: 1;
//             visibility: visible;
//             pointer-events: auto;
//           }
//           .facet-preloader__overlay {
//             position: absolute;
//             top: 0;
//             left: 0;
//             right: 0;
//             bottom: 0;
//             background: rgba(255, 255, 255, 0.85);
//             backdrop-filter: blur(3px);
//           }
//           .facet-preloader__spinner {
//             position: relative;
//             z-index: 1;
//           }
//           .spinner {
//             animation: rotate 1.5s linear infinite;
//             width: 50px;
//             height: 50px;
//           }
//           .spinner .path {
//             stroke: #000;
//             stroke-linecap: round;
//             animation: dash 1.5s ease-in-out infinite;
//           }
//           @keyframes rotate {
//             100% { transform: rotate(360deg); }
//           }
//           @keyframes dash {
//             0% {
//               stroke-dasharray: 1, 150;
//               stroke-dashoffset: 0;
//             }
//             50% {
//               stroke-dasharray: 90, 150;
//               stroke-dashoffset: -35;
//             }
//             100% {
//               stroke-dasharray: 90, 150;
//               stroke-dashoffset: -124;
//             }
//           }
//           .collection.loading {
//             opacity: 0.6;
//             pointer-events: none;
//           }
//           .loading {
//             position: relative;
//           }
//         `;
//         document.head.appendChild(style);
//       }
//     }
    
//     requestAnimationFrame(() => {
//       preloader.classList.add('active');
//     });
//   }

//   static hidePreloader() {
//     const preloader = document.getElementById('facet-preloader');
//     if (preloader) {
//       preloader.classList.remove('active');
//     }
//   }

//   // OPTIMIZED: Single fetch with better error handling and cancellation
//   static async renderPage(searchParams, event, updateURLHash = true) {
//     // Cancel any pending requests
//     const signal = FacetFiltersForm.requestManagerInstance.cancelPending();
    
//     FacetFiltersForm.searchParamsPrev = searchParams;
//     const sections = FacetFiltersForm.getSections();
//     const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
//     window.lastScrollPosition = scrollY;
    
//     // Show loading states
//     FacetFiltersForm.showPreloader();
//     FacetFiltersForm.setLoadingStates(true);
    
//     // Check cache first
//     const cacheKey = `${window.location.pathname}?${searchParams}`;
//     const cached = FacetFiltersForm.getFromCache(cacheKey);
    
//     if (cached) {
//       FacetFiltersForm.applyUpdate(cached, event);
//       if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
//       return;
//     }

//     // Single optimized fetch for all sections
//     try {
//       const section = sections[0];
//       const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
      
//       const response = await fetch(url, { 
//         signal,
//         headers: {
//           'X-Requested-With': 'XMLHttpRequest'
//         }
//       });
      
//       if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
//       const html = await response.text();
      
//       // Cache the result with size limit
//       FacetFiltersForm.addToCache(cacheKey, html);
      
//       // Apply the update
//       FacetFiltersForm.applyUpdate(html, event);
      
//       if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
      
//     } catch (error) {
//       if (error.name === 'AbortError') {
//         console.log('Request cancelled');
//         return;
//       }
//       console.error('Error fetching products:', error);
//       FacetFiltersForm.hidePreloader();
//       FacetFiltersForm.setLoadingStates(false);
//     }
//   }

//   // OPTIMIZED: Smarter cache with LRU strategy
//   static addToCache(key, html) {
//     const MAX_CACHE_SIZE = 20; // Keep last 20 filter combinations
    
//     // Remove oldest if cache is full
//     if (FacetFiltersForm.filterData.length >= MAX_CACHE_SIZE) {
//       FacetFiltersForm.filterData.shift();
//     }
    
//     FacetFiltersForm.filterData.push({ url: key, html, timestamp: Date.now() });
//   }

//   static getFromCache(key) {
//     const cached = FacetFiltersForm.filterData.find(item => item.url === key);
    
//     // Cache expires after 5 minutes
//     if (cached && (Date.now() - cached.timestamp) < 300000) {
//       return cached.html;
//     }
    
//     // Remove expired cache
//     if (cached) {
//       FacetFiltersForm.filterData = FacetFiltersForm.filterData.filter(item => item.url !== key);
//     }
    
//     return null;
//   }

//   // OPTIMIZED: Apply update with efficient DOM manipulation
//   static applyUpdate(html, event) {
//     const parser = new DOMParser();
//     const parsedHTML = parser.parseFromString(html, 'text/html');
    
//     // Batch DOM updates
//     requestAnimationFrame(() => {
//       FacetFiltersForm.renderFilters(html, event, parsedHTML);
//       FacetFiltersForm.renderProductGridContainer(parsedHTML);
//       FacetFiltersForm.renderProductCount(parsedHTML);
      
//       if (typeof initializeScrollAnimationTrigger === 'function') {
//         initializeScrollAnimationTrigger(html);
//       }
      
//       // Efficient scroll restoration
//       FacetFiltersForm.restoreScrollPosition();
//     });
//   }

//   static setLoadingStates(loading) {
//     const productGrid = document.getElementById('ProductGridContainer');
//     const countContainer = document.getElementById('ProductCount');
//     const countContainerDesktop = document.getElementById('ProductCountDesktop');
//     const spinners = document.querySelectorAll('.facets-container .loading__spinner, facet-filters-form .loading__spinner');
    
//     if (loading) {
//       if (productGrid?.querySelector('.collection')) {
//         productGrid.querySelector('.collection').classList.add('loading');
//       }
//       countContainer?.classList.add('loading');
//       countContainerDesktop?.classList.add('loading');
//       spinners.forEach(spinner => spinner.classList.remove('hidden'));
//     } else {
//       if (productGrid?.querySelector('.collection')) {
//         productGrid.querySelector('.collection').classList.remove('loading');
//       }
//       countContainer?.classList.remove('loading');
//       countContainerDesktop?.classList.remove('loading');
//       spinners.forEach(spinner => spinner.classList.add('hidden'));
//     }
//   }

//   // OPTIMIZED: Single RAF for scroll restoration
//   static restoreScrollPosition() {
//     const scrollY = window.lastScrollPosition || 0;
    
//     requestAnimationFrame(() => {
//       window.scrollTo(0, scrollY);
//       FacetFiltersForm.hidePreloader();
//       FacetFiltersForm.setLoadingStates(false);
//       FacetFiltersForm.requestManagerInstance.reset();
//     });
//   }

//   // OPTIMIZED: More efficient DOM updates using DocumentFragment
//   static renderProductGridContainer(parsedHTML) {
//     const container = document.getElementById('ProductGridContainer');
//     const newContainer = parsedHTML.getElementById('ProductGridContainer');
    
//     if (!container || !newContainer) return;
    
//     // Use morphdom-like approach for minimal DOM changes
//     const currentProducts = Array.from(container.querySelectorAll('[data-product-id]'));
//     const newProducts = Array.from(newContainer.querySelectorAll('[data-product-id]'));
    
//     // Quick check if we can do a simple replace
//     const needsFullReplace = currentProducts.length !== newProducts.length || 
//                             !currentProducts.every((el, i) => el.dataset.productId === newProducts[i]?.dataset.productId);
    
//     if (needsFullReplace) {
//       container.innerHTML = newContainer.innerHTML;
//     } else {
//       // Update only changed elements (prices, availability, etc.)
//       currentProducts.forEach((el, i) => {
//         const newEl = newProducts[i];
//         if (el.innerHTML !== newEl.innerHTML) {
//           el.innerHTML = newEl.innerHTML;
//         }
//       });
//     }
    
//     // Cancel scroll animations
//     container.querySelectorAll('.scroll-trigger').forEach((element) => {
//       element.classList.add('scroll-trigger--cancel');
//     });
//   }

//   static renderProductCount(parsedHTML) {
//     const newCount = parsedHTML.getElementById('ProductCount');
//     if (!newCount) return;

//     const container = document.getElementById('ProductCount');
//     const containerDesktop = document.getElementById('ProductCountDesktop');

//     if (container && container.textContent !== newCount.textContent) {
//       container.innerHTML = newCount.innerHTML;
//     }

//     if (containerDesktop && containerDesktop.textContent !== newCount.textContent) {
//       containerDesktop.innerHTML = newCount.innerHTML;
//     }
//   }

//   static renderFilters(html, event, parsedHTML) {
//     parsedHTML = parsedHTML || new DOMParser().parseFromString(html, 'text/html');
    
//     const facetDetailsElementsFromFetch = parsedHTML.querySelectorAll(
//       '#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter'
//     );
//     const facetDetailsElementsFromDom = document.querySelectorAll(
//       '#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter, #FacetFiltersPillsForm .js-filter'
//     );

//     // Remove filters that no longer exist
//     Array.from(facetDetailsElementsFromDom).forEach((currentElement) => {
//       if (!Array.from(facetDetailsElementsFromFetch).some(({ id }) => currentElement.id === id)) {
//         currentElement.remove();
//       }
//     });

//     const matchesId = (element) => {
//       const jsFilter = event ? event.target.closest('.js-filter') : undefined;
//       return jsFilter ? element.id === jsFilter.id : false;
//     };

//     const facetsToRender = Array.from(facetDetailsElementsFromFetch).filter((element) => !matchesId(element));
//     const countsToRender = Array.from(facetDetailsElementsFromFetch).find(matchesId);

//     // Batch render all facets
//     facetsToRender.forEach((elementToRender, index) => {
//       const currentElement = document.getElementById(elementToRender.id);
//       if (currentElement) {
//         // Only update if content changed
//         if (currentElement.innerHTML !== elementToRender.innerHTML) {
//           currentElement.innerHTML = elementToRender.innerHTML;
//         }
//       } else {
//         if (index > 0) {
//           const { className: previousElementClassName, id: previousElementId } = facetsToRender[index - 1];
//           if (elementToRender.className === previousElementClassName) {
//             document.getElementById(previousElementId).after(elementToRender);
//             return;
//           }
//         }

//         if (elementToRender.parentElement) {
//           document.querySelector(`#${elementToRender.parentElement.id} .js-filter`)?.before(elementToRender);
//         }
//       }
//     });

//     FacetFiltersForm.renderActiveFacets(parsedHTML);
//     FacetFiltersForm.renderAdditionalElements(parsedHTML);

//     if (countsToRender) {
//       const closestJSFilterID = event.target.closest('.js-filter')?.id;

//       if (closestJSFilterID) {
//         FacetFiltersForm.renderCounts(countsToRender, event.target.closest('.js-filter'));
//         FacetFiltersForm.renderMobileCounts(countsToRender, document.getElementById(closestJSFilterID));
//       }
//     }
//   }

//   static renderActiveFacets(html) {
//     const activeFacetElementSelectors = ['.active-facets-mobile', '.active-facets-desktop'];

//     activeFacetElementSelectors.forEach((selector) => {
//       const activeFacetsElement = html.querySelector(selector);
//       const currentElement = document.querySelector(selector);
      
//       if (activeFacetsElement && currentElement) {
//         if (currentElement.innerHTML !== activeFacetsElement.innerHTML) {
//           currentElement.innerHTML = activeFacetsElement.innerHTML;
//         }
//       }
//     });

//     FacetFiltersForm.toggleActiveFacets(false);
//   }

//   static renderAdditionalElements(html) {
//     const mobileElementSelectors = ['.mobile-facets__open', '.mobile-facets__count', '.sorting'];

//     mobileElementSelectors.forEach((selector) => {
//       const newElement = html.querySelector(selector);
//       const currentElement = document.querySelector(selector);
      
//       if (newElement && currentElement && newElement.innerHTML !== currentElement.innerHTML) {
//         currentElement.innerHTML = newElement.innerHTML;
//       }
//     });

//     document.getElementById('FacetFiltersFormMobile')?.closest('menu-drawer')?.bindEvents();
//   }

//   static renderCounts(source, target) {
//     const targetSummary = target.querySelector('.facets__summary');
//     const sourceSummary = source.querySelector('.facets__summary');

//     if (sourceSummary && targetSummary && sourceSummary.outerHTML !== targetSummary.outerHTML) {
//       targetSummary.outerHTML = sourceSummary.outerHTML;
//     }

//     const targetHeaderElement = target.querySelector('.facets__header');
//     const sourceHeaderElement = source.querySelector('.facets__header');

//     if (sourceHeaderElement && targetHeaderElement && sourceHeaderElement.outerHTML !== targetHeaderElement.outerHTML) {
//       targetHeaderElement.outerHTML = sourceHeaderElement.outerHTML;
//     }

//     const targetWrapElement = target.querySelector('.facets-wrap');
//     const sourceWrapElement = source.querySelector('.facets-wrap');

//     if (sourceWrapElement && targetWrapElement) {
//       const isShowingMore = Boolean(target.querySelector('show-more-button .label-show-more.hidden'));
//       if (isShowingMore) {
//         sourceWrapElement
//           .querySelectorAll('.facets__item.hidden')
//           .forEach((hiddenItem) => hiddenItem.classList.replace('hidden', 'show-more-item'));
//       }

//       if (targetWrapElement.outerHTML !== sourceWrapElement.outerHTML) {
//         targetWrapElement.outerHTML = sourceWrapElement.outerHTML;
//       }
//     }
//   }

//   static renderMobileCounts(source, target) {
//     const targetFacetsList = target?.querySelector('.mobile-facets__list');
//     const sourceFacetsList = source.querySelector('.mobile-facets__list');

//     if (sourceFacetsList && targetFacetsList && sourceFacetsList.outerHTML !== targetFacetsList.outerHTML) {
//       targetFacetsList.outerHTML = sourceFacetsList.outerHTML;
//     }
//   }

//   static updateURLHash(searchParams) {
//     history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
//   }

//   static getSections() {
//     return [
//       {
//         section: document.getElementById('product-grid')?.dataset.id,
//       },
//     ];
//   }

//   createSearchParams(form) {
//     const formData = new FormData(form);
//     return new URLSearchParams(formData).toString();
//   }

//   onSubmitForm(searchParams, event) {
//     FacetFiltersForm.renderPage(searchParams, event);
//   }

//   onSubmitHandler(event) {
//     event.preventDefault();
//     const sortFilterForms = document.querySelectorAll('facet-filters-form form');
    
//     if (event.srcElement?.className === 'mobile-facets__checkbox') {
//       const searchParams = this.createSearchParams(event.target.closest('form'));
//       this.onSubmitForm(searchParams, event);
//     } else {
//       const forms = [];
//       const isMobile = event.target.closest('form')?.id === 'FacetFiltersFormMobile';

//       sortFilterForms.forEach((form) => {
//         if (!isMobile) {
//           if (form.id === 'FacetSortForm' || form.id === 'FacetFiltersForm' || form.id === 'FacetSortDrawerForm') {
//             forms.push(this.createSearchParams(form));
//           }
//         } else if (form.id === 'FacetFiltersFormMobile') {
//           forms.push(this.createSearchParams(form));
//         }
//       });
//       this.onSubmitForm(forms.join('&'), event);
//     }
//   }

//   onActiveFilterClick(event) {
//     event.preventDefault();
//     FacetFiltersForm.toggleActiveFacets();
//     const url =
//       event.currentTarget.href.indexOf('?') === -1
//         ? ''
//         : event.currentTarget.href.slice(event.currentTarget.href.indexOf('?') + 1);
//     FacetFiltersForm.renderPage(url);
//   }
// }

// // Initialize static properties
// FacetFiltersForm.filterData = [];
// FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
// FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
// FacetFiltersForm.requestManagerInstance = new RequestManager();

// customElements.define('facet-filters-form', FacetFiltersForm);
// FacetFiltersForm.setListeners();

// // ============================================
// // PRICE RANGE COMPONENT
// // ============================================
// class PriceRange extends HTMLElement {
//   constructor() {
//     super();
//     this.querySelectorAll('input').forEach((element) => {
//       element.addEventListener('change', this.onRangeChange.bind(this));
//       element.addEventListener('keydown', this.onKeyDown.bind(this));
//     });
//     this.setMinAndMaxValues();
//   }

//   onRangeChange(event) {
//     this.adjustToValidValues(event.currentTarget);
//     this.setMinAndMaxValues();
//   }

//   onKeyDown(event) {
//     if (event.metaKey) return;

//     const pattern = /[0-9]|\.|,|'| |Tab|Backspace|Enter|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Delete|Escape/;
//     if (!event.key.match(pattern)) event.preventDefault();
//   }

//   setMinAndMaxValues() {
//     const inputs = this.querySelectorAll('input');
//     const minInput = inputs[0];
//     const maxInput = inputs[1];
//     if (maxInput.value) minInput.setAttribute('data-max', maxInput.value);
//     if (minInput.value) maxInput.setAttribute('data-min', minInput.value);
//     if (minInput.value === '') maxInput.setAttribute('data-min', 0);
//     if (maxInput.value === '') minInput.setAttribute('data-max', maxInput.getAttribute('data-max'));
//   }

//   adjustToValidValues(input) {
//     const value = Number(input.value);
//     const min = Number(input.getAttribute('data-min'));
//     const max = Number(input.getAttribute('data-max'));

//     if (value < min) input.value = min;
//     if (value > max) input.value = max;
//   }
// }

// customElements.define('price-range', PriceRange);

// // ============================================
// // FACET REMOVE COMPONENT
// // ============================================
// class FacetRemove extends HTMLElement {
//   constructor() {
//     super();
//     const facetLink = this.querySelector('a');
//     facetLink.setAttribute('role', 'button');
//     facetLink.addEventListener('click', this.closeFilter.bind(this));
//     facetLink.addEventListener('keyup', (event) => {
//       event.preventDefault();
//       if (event.code.toUpperCase() === 'SPACE') this.closeFilter(event);
//     });
//   }

//   closeFilter(event) {
//     event.preventDefault();
//     const form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
//     form.onActiveFilterClick(event);
//   }
// }

// customElements.define('facet-remove', FacetRemove);

// // ============================================
// // SORT FUNCTIONALITY
// // ============================================
// function updateSortUI(value) {
//   document.querySelectorAll('select[name="sort_by"]').forEach(select => {
//     select.value = value;
//   });
  
//   document.querySelectorAll('.mobile-sort-option').forEach(option => {
//     const optionValue = option.getAttribute('data-value');
//     if (optionValue === value) {
//       option.classList.add('active');
//       if (!option.querySelector('.mobile-sort-option__check')) {
//         const check = document.createElement('span');
//         check.className = 'mobile-sort-option__check';
//         check.textContent = '✓';
//         option.appendChild(check);
//       }
//     } else {
//       option.classList.remove('active');
//       const check = option.querySelector('.mobile-sort-option__check');
//       if (check) check.remove();
//     }
//   });
// }

// function triggerSortSubmit(sortValue) {
//   const forms = document.querySelectorAll('facet-filters-form form');
  
//   forms.forEach(form => {
//     let sortInput = form.querySelector('[name="sort_by"]');
//     if (!sortInput) {
//       sortInput = document.createElement('input');
//       sortInput.type = 'hidden';
//       sortInput.name = 'sort_by';
//       form.appendChild(sortInput);
//     }
//     sortInput.value = sortValue;
//   });
  
//   const facetForm = document.querySelector('facet-filters-form');
//   if (facetForm) {
//     const mainForm = facetForm.querySelector('form');
//     if (mainForm) {
//       const formData = new FormData(mainForm);
//       formData.set('sort_by', sortValue);
//       const searchParams = new URLSearchParams(formData).toString();
//       FacetFiltersForm.renderPage(searchParams, null, true);
//     }
//   }
// }

// // Desktop sort handler
// document.addEventListener('change', function(event) {
//   if (event.target.matches('#SortBy, #SortBy-mobile')) {
//     event.preventDefault();
//     const sortValue = event.target.value;
//     updateSortUI(sortValue);
//     triggerSortSubmit(sortValue);
//   }
// });

// // Mobile sort drawer click handler
// document.addEventListener('click', function(event) {
//   const sortOption = event.target.closest('.mobile-sort-option');
//   if (sortOption) {
//     event.preventDefault();
//     const sortValue = sortOption.getAttribute('data-value');
    
//     if (sortValue) {
//       updateSortUI(sortValue);
//       triggerSortSubmit(sortValue);
      
//       if (typeof closeSortDrawer === 'function') {
//         closeSortDrawer();
//       }
//     }
//   }
// });

// // Initialize sort UI on page load
// window.addEventListener('DOMContentLoaded', function() {
//   const urlParams = new URLSearchParams(window.location.search);
//   const currentSort = urlParams.get('sort_by');
//   if (currentSort) {
//     updateSortUI(currentSort);
//   }
// });

// // ============================================
// // PERFORMANCE MONITORING (Optional)
// // ============================================
// if (window.performance && console.table) {
//   const originalRenderPage = FacetFiltersForm.renderPage;
//   FacetFiltersForm.renderPage = async function(...args) {
//     const startTime = performance.now();
//     await originalRenderPage.apply(this, args);
//     const endTime = performance.now();
//     console.log(`Filter render took ${(endTime - startTime).toFixed(2)}ms`);
//   };
// }