// function initWishlist() {
//   try {
//     if (typeof iWish !== "undefined" && typeof iWish.init === "function") {
//       iWish.init();
//     }

//     document.dispatchEvent(new CustomEvent("iwish:reload"));
//     document.dispatchEvent(new CustomEvent("wishlist:init"));

//     if (typeof iWishCounter === "function") {
//       iWishCounter();
//     }
//   } catch (e) {
//     console.log("Wishlist init error", e);
//   }
// }

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

// // =====================================================
// // DISCOUNT SORT UTILITY
// // =====================================================
// const DiscountSort = {
//   SORT_VALUE: 'discount-high-to-low',

//   /**
//    * Parse the discount percentage from a grid <li> element.
//    */
//   getDiscount(liEl) {
//     const span = liEl.querySelector('.js-discount-value');
//     if (span) {
//       const val = parseFloat(span.dataset.v);
//       if (!isNaN(val)) return val;
//     }
//     if (liEl.dataset.discountPercentage !== undefined && liEl.dataset.discountPercentage !== '') {
//       const val = parseFloat(liEl.dataset.discountPercentage);
//       if (!isNaN(val)) return val;
//     }
//     return 0;
//   },

//   /**
//    * Sort the product grid by discount percentage descending.
//    * Only sorts what is currently in the DOM — used after full-page fetches.
//    */
//   apply() {
//     const grid = document.getElementById('product-grid');
//     if (!grid) {
//       console.warn('[DiscountSort] product-grid not found');
//       return;
//     }

//     const items = Array.from(grid.querySelectorAll('li.grid__item'));
//     if (!items.length) {
//       console.warn('[DiscountSort] No grid items found');
//       return;
//     }

//     console.log('[DiscountSort] Items found:', items.length);

//     const bannerItems = items.filter(li => li.classList.contains('lucira-collec-banner'));
//     const productItems = items.filter(li => !li.classList.contains('lucira-collec-banner'));

//     // Track original positions of banners
//     const bannerOriginalIndices = {};
//     bannerItems.forEach(bi => {
//       bannerOriginalIndices[items.indexOf(bi)] = bi;
//     });

//     // Sort product items by discount descending
//     productItems.sort((a, b) => DiscountSort.getDiscount(b) - DiscountSort.getDiscount(a));

//     // Rebuild final order: insert banners back at their original positions
//     const finalOrder = [];
//     let productCursor = 0;

//     for (let i = 0; i < items.length; i++) {
//       if (bannerOriginalIndices[i]) {
//         finalOrder.push(bannerOriginalIndices[i]);
//       } else {
//         if (productCursor < productItems.length) {
//           finalOrder.push(productItems[productCursor++]);
//         }
//       }
//     }

//     finalOrder.forEach(el => grid.appendChild(el));
//     console.log('[DiscountSort] Sort applied successfully');
//   },

//   /**
//    * Apply sort to an explicit array of <li> items (used in all-pages fetch).
//    * Replaces the current grid content with sorted items.
//    * Banner items are placed at their first-page position (index 6 by default).
//    */
//   applyFromItems(allItems, bannerInsertIndex = 6) {
//     const grid = document.getElementById('product-grid');
//     if (!grid) return;

//     const bannerItems = allItems.filter(li => li.classList.contains('lucira-collec-banner'));
//     const productItems = allItems.filter(li => !li.classList.contains('lucira-collec-banner'));

//     // Sort product items by discount descending
//     productItems.sort((a, b) => DiscountSort.getDiscount(b) - DiscountSort.getDiscount(a));

//     // Interleave banners back at their insert positions
//     const finalOrder = [];
//     let prodCursor = 0;
//     let bannerCursor = 0;
//     const totalSlots = productItems.length + bannerItems.length;

//     for (let i = 0; i < totalSlots; i++) {
//       if (bannerCursor < bannerItems.length && i === bannerInsertIndex) {
//         finalOrder.push(bannerItems[bannerCursor++]);
//       } else if (prodCursor < productItems.length) {
//         finalOrder.push(productItems[prodCursor++]);
//       }
//     }
//     // Append any remaining banners (edge case)
//     while (bannerCursor < bannerItems.length) {
//       finalOrder.push(bannerItems[bannerCursor++]);
//     }

//     // Replace grid content (use cloneNode so items from parsed docs are adopted)
//     grid.innerHTML = '';
//     finalOrder.forEach(el => grid.appendChild(el.cloneNode(true)));

//     console.log('[DiscountSort] applyFromItems: rendered', finalOrder.length, 'items total');
//   },

//   isActive() {
//     const params = new URLSearchParams(window.location.search);
//     return params.get('sort_by') === DiscountSort.SORT_VALUE;
//   },

//   isActiveInParams(searchParams) {
//     const params = new URLSearchParams(searchParams);
//     return params.get('sort_by') === DiscountSort.SORT_VALUE;
//   },

//   stripFromParams(searchParams) {
//     const params = new URLSearchParams(searchParams);
//     params.set('sort_by', 'manual');
//     return params.toString();
//   }
// };


// class FacetFiltersForm extends HTMLElement {
//   constructor() {
//     super();
//     this.onActiveFilterClick = this.onActiveFilterClick.bind(this);
//     this.requestManager = new RequestManager();
//     this.pendingUpdate = null;

//     this.debouncedOnSubmit = debounce((event) => {
//       this.onSubmitHandler(event);
//     }, 300);

//     const facetForm = this.querySelector('form');

//     facetForm.addEventListener('input', (event) => {
//       // ── FIX 1: Skip sort_by changes here.
//       // The document-level 'change' handler (triggerSortSubmit) is the single
//       // source of truth for sort changes. Handling them here too causes a
//       // second renderPage call 300 ms later that overwrites the sorted DOM.
//       if (event.target.name === 'sort_by') return;

//       if (event.target.type === 'checkbox' || event.target.type === 'radio') {
//         this.onSubmitHandler(event);
//       } else {
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
//             position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 999999;
//             display: flex; align-items: center; justify-content: center;
//             opacity: 0; visibility: hidden;
//             transition: opacity 0.15s ease, visibility 0.15s ease;
//             pointer-events: none;
//           }
//           .facet-preloader.active { opacity: 1; visibility: visible; pointer-events: auto; }
//           .facet-preloader__overlay {
//             position: absolute; top: 0; left: 0; right: 0; bottom: 0;
//             background: rgba(255,255,255,0.85); backdrop-filter: blur(3px);
//           }
//           .facet-preloader__spinner { position: relative; z-index: 1; }
//           .spinner { animation: rotate 1.5s linear infinite; width: 50px; height: 50px; }
//           .spinner .path { stroke: #000; stroke-linecap: round; animation: dash 1.5s ease-in-out infinite; }
//           @keyframes rotate { 100% { transform: rotate(360deg); } }
//           @keyframes dash {
//             0%   { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
//             50%  { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
//             100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
//           }
//           .collection.loading { opacity: 0.6; pointer-events: none; }
//           .loading { position: relative; }
//         `;
//         document.head.appendChild(style);
//       }
//     }
//     requestAnimationFrame(() => preloader.classList.add('active'));
//   }

//   static hidePreloader() {
//     const preloader = document.getElementById('facet-preloader');
//     if (preloader) preloader.classList.remove('active');
//   }

//   // ── FIX 2: Route discount sort through a dedicated all-pages fetcher
//   static async renderPage(searchParams, event, updateURLHash = true) {
//     const signal = FacetFiltersForm.requestManagerInstance.cancelPending();

//     const isDiscountSort = DiscountSort.isActiveInParams(searchParams);

//     FacetFiltersForm.searchParamsPrev = searchParams;
//     const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
//     window.lastScrollPosition = scrollY;

//     FacetFiltersForm.showPreloader();
//     FacetFiltersForm.setLoadingStates(true);

//     // Restore infinite-scroll visibility when switching away from discount sort
//     FacetFiltersForm._restoreInfiniteScroll();

//     if (isDiscountSort) {
//       // Special path — fetch ALL pages and sort globally
//       await FacetFiltersForm.renderPageWithDiscountSort(searchParams, event, updateURLHash, signal);
//       return;
//     }

//     // ── Normal path (non-discount sort) ──────────────────────────────────────
//     const shopifySearchParams = searchParams;

//     const cacheKey = `${window.location.pathname}?${searchParams}`;
//     const cached = FacetFiltersForm.getFromCache(cacheKey);

//     if (cached) {
//       FacetFiltersForm.applyUpdate(cached, event, false);
//       if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
//       return;
//     }

//     try {
//       const sections = FacetFiltersForm.getSections();
//       const section = sections[0];
//       const url = `${window.location.pathname}?section_id=${section.section}&${shopifySearchParams}`;

//       const response = await fetch(url, {
//         signal,
//         headers: { 'X-Requested-With': 'XMLHttpRequest' }
//       });

//       if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

//       const html = await response.text();
//       FacetFiltersForm.addToCache(cacheKey, html);
//       FacetFiltersForm.applyUpdate(html, event, false);

//       if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);

//     } catch (error) {
//       if (error.name === 'AbortError') { console.log('Request cancelled'); return; }
//       console.error('Error fetching products:', error);
//       FacetFiltersForm.hidePreloader();
//       FacetFiltersForm.setLoadingStates(false);
//     }
//   }

//   /**
//    * Fetch ALL pages of the collection (stripping the custom sort value so
//    * Shopify returns products), collect every <li.grid__item>, sort them all
//    * by discount descending, then replace the grid in one shot.
//    *
//    * The infinite-scroll <a> link is hidden so it doesn't try to load more
//    * pages on top of our already-complete sorted list.
//    */
//   static async renderPageWithDiscountSort(searchParams, event, updateURLHash, signal) {
//     const shopifyParams = DiscountSort.stripFromParams(searchParams);
//     const sectionId = document.getElementById('product-grid')?.dataset.id;

//     if (!sectionId) {
//       FacetFiltersForm.hidePreloader();
//       FacetFiltersForm.setLoadingStates(false);
//       return;
//     }

//     const parser = new DOMParser();
//     let allItems = [];
//     let page = 1;
//     let page1Html = null;
//     const MAX_PAGES = 50; // safety cap

//     try {
//       while (page <= MAX_PAGES) {
//         const url = `${window.location.pathname}?section_id=${sectionId}&${shopifyParams}&page=${page}`;
//         console.log(`[DiscountSort] Fetching page ${page}: ${url}`);

//         const resp = await fetch(url, {
//           signal,
//           headers: { 'X-Requested-With': 'XMLHttpRequest' }
//         });

//         if (!resp.ok) break;

//         const html = await resp.text();
//         const doc = parser.parseFromString(html, 'text/html');

//         // Save page-1 HTML to update filters / product count UI
//         if (page === 1) page1Html = html;

//         const grid = doc.getElementById('product-grid');
//         if (!grid) break;

//         const pageItems = Array.from(grid.querySelectorAll('li.grid__item'));
//         if (!pageItems.length) break;

//         allItems = allItems.concat(pageItems);

//         // Check whether there is a next page via the infinite-scroll link
//         const nextLink = doc.querySelector('infinite-scroll a[href]');
//         const nextHref = nextLink ? nextLink.getAttribute('href') : null;

//         if (!nextHref) break; // no more pages

//         page++;
//       }

//       console.log(`[DiscountSort] Total items fetched across ${page} page(s): ${allItems.length}`);

//       // Update filters and count from page-1 response (without touching sort UI)
//       if (page1Html) {
//         const page1Doc = parser.parseFromString(page1Html, 'text/html');
//         requestAnimationFrame(() => {
//           FacetFiltersForm.renderFilters(page1Html, event, page1Doc);
//           FacetFiltersForm.renderProductCount(page1Doc);
//           FacetFiltersForm.ensureDiscountSortOption();
//         });
//       }

//       // Sort all collected items and inject into DOM
//       requestAnimationFrame(() => {
//         DiscountSort.applyFromItems(allItems);

//         // Hide infinite-scroll trigger — all products are already loaded
//         FacetFiltersForm._hideInfiniteScroll();

//         // Re-init wishlist for the new cards
//         requestAnimationFrame(() => initWishlist());

//         if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);

//         FacetFiltersForm.restoreScrollPosition();
//       });

//     } catch (error) {
//       if (error.name === 'AbortError') { console.log('Discount sort fetch cancelled'); return; }
//       console.error('[DiscountSort] Error fetching all pages:', error);
//       FacetFiltersForm.hidePreloader();
//       FacetFiltersForm.setLoadingStates(false);
//     }
//   }

//   /** Hide the infinite-scroll <a> trigger so no more pages auto-load. */
//   static _hideInfiniteScroll() {
//     const is = document.querySelector('infinite-scroll');
//     if (is && !is.dataset.discountHidden) {
//       is.dataset.discountHidden = '1';
//       is.dataset.discountOrigDisplay = is.style.display || '';
//       is.style.display = 'none';
//     }
//   }

//   /** Restore infinite-scroll visibility when switching away from discount sort. */
//   static _restoreInfiniteScroll() {
//     const is = document.querySelector('infinite-scroll');
//     if (is && is.dataset.discountHidden) {
//       is.style.display = is.dataset.discountOrigDisplay || '';
//       delete is.dataset.discountHidden;
//       delete is.dataset.discountOrigDisplay;
//     }
//   }

//   // ── Cache helpers ────────────────────────────────────────────────────────

//   static addToCache(key, html) {
//     const MAX_CACHE_SIZE = 20;
//     if (FacetFiltersForm.filterData.length >= MAX_CACHE_SIZE) {
//       FacetFiltersForm.filterData.shift();
//     }
//     FacetFiltersForm.filterData.push({ url: key, html, timestamp: Date.now() });
//   }

//   static getFromCache(key) {
//     const cached = FacetFiltersForm.filterData.find(item => item.url === key);
//     if (cached && (Date.now() - cached.timestamp) < 300000) return cached.html;
//     if (cached) {
//       FacetFiltersForm.filterData = FacetFiltersForm.filterData.filter(item => item.url !== key);
//     }
//     return null;
//   }

//   // ── DOM update helpers ──────────────────────────────────────────────────

//   static applyUpdate(html, event, isDiscountSort = false) {
//     const parser = new DOMParser();
//     const parsedHTML = parser.parseFromString(html, 'text/html');

//     requestAnimationFrame(() => {
//       FacetFiltersForm.renderFilters(html, event, parsedHTML);
//       FacetFiltersForm.renderProductGridContainer(parsedHTML);
//       FacetFiltersForm.renderProductCount(parsedHTML);

//       if (typeof initializeScrollAnimationTrigger === 'function') {
//         initializeScrollAnimationTrigger(html);
//       }

//       FacetFiltersForm.ensureDiscountSortOption();

//       // This branch is only reached for non-discount sort (isDiscountSort is always
//       // false when called from the normal path). Kept for safety.
//       if (isDiscountSort) {
//         requestAnimationFrame(() => {
//           setTimeout(() => DiscountSort.apply(), 50);
//         });
//       }

//       FacetFiltersForm.restoreScrollPosition();
//     });
//   }

//   static setLoadingStates(loading) {
//     const productGrid = document.getElementById('ProductGridContainer');
//     const countContainer = document.getElementById('ProductCount');
//     const countContainerDesktop = document.getElementById('ProductCountDesktop');
//     const spinners = document.querySelectorAll('.facets-container .loading__spinner, facet-filters-form .loading__spinner');

//     if (loading) {
//       productGrid?.querySelector('.collection')?.classList.add('loading');
//       countContainer?.classList.add('loading');
//       countContainerDesktop?.classList.add('loading');
//       spinners.forEach(s => s.classList.remove('hidden'));
//     } else {
//       productGrid?.querySelector('.collection')?.classList.remove('loading');
//       countContainer?.classList.remove('loading');
//       countContainerDesktop?.classList.remove('loading');
//       spinners.forEach(s => s.classList.add('hidden'));
//     }
//   }

//   static restoreScrollPosition() {
//     const scrollY = window.lastScrollPosition || 0;
//     requestAnimationFrame(() => {
//       window.scrollTo(0, scrollY);
//       FacetFiltersForm.hidePreloader();
//       FacetFiltersForm.setLoadingStates(false);
//       FacetFiltersForm.requestManagerInstance.reset();
//     });
//   }

//   static renderProductGridContainer(parsedHTML) {
//     const container = document.getElementById('ProductGridContainer');
//     const newContainer = parsedHTML.getElementById('ProductGridContainer');

//     if (!container || !newContainer) return;

//     const currentProducts = Array.from(container.querySelectorAll('[data-product-id]'));
//     const newProducts = Array.from(newContainer.querySelectorAll('[data-product-id]'));

//     const needsFullReplace =
//       currentProducts.length !== newProducts.length ||
//       !currentProducts.every((el, i) => el.dataset.productId === newProducts[i]?.dataset.productId);

//     if (needsFullReplace) {
//       container.innerHTML = newContainer.innerHTML;
//     } else {
//       currentProducts.forEach((el, i) => {
//         const newEl = newProducts[i];
//         if (el.innerHTML !== newEl.innerHTML) el.innerHTML = newEl.innerHTML;
//       });
//     }

//     container.querySelectorAll('.scroll-trigger').forEach(el => el.classList.add('scroll-trigger--cancel'));

//     requestAnimationFrame(() => initWishlist());
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

//     Array.from(facetDetailsElementsFromDom).forEach((currentElement) => {
//       if (!Array.from(facetDetailsElementsFromFetch).some(({ id }) => currentElement.id === id)) {
//         currentElement.remove();
//       }
//     });

//     const matchesId = (element) => {
//       const jsFilter = event ? event.target.closest('.js-filter') : undefined;
//       return jsFilter ? element.id === jsFilter.id : false;
//     };

//     const facetsToRender = Array.from(facetDetailsElementsFromFetch).filter(el => !matchesId(el));
//     const countsToRender = Array.from(facetDetailsElementsFromFetch).find(matchesId);

//     facetsToRender.forEach((elementToRender, index) => {
//       const currentElement = document.getElementById(elementToRender.id);
//       if (currentElement) {
//         if (currentElement.innerHTML !== elementToRender.innerHTML) {
//           currentElement.innerHTML = elementToRender.innerHTML;
//         }
//       } else {
//         if (index > 0) {
//           const { className: prevClass, id: prevId } = facetsToRender[index - 1];
//           if (elementToRender.className === prevClass) {
//             document.getElementById(prevId)?.after(elementToRender);
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
//     ['.active-facets-mobile', '.active-facets-desktop'].forEach((selector) => {
//       const newEl = html.querySelector(selector);
//       const curEl = document.querySelector(selector);
//       if (newEl && curEl && curEl.innerHTML !== newEl.innerHTML) {
//         curEl.innerHTML = newEl.innerHTML;
//       }
//     });
//     FacetFiltersForm.toggleActiveFacets(false);
//   }

//   static renderAdditionalElements(html) {
//     // Intentionally excluded: '.sorting' — replacing it from Shopify's AJAX
//     // response would wipe our custom "Discount High to Low" option.
//     ['.mobile-facets__open', '.mobile-facets__count'].forEach((selector) => {
//       const newEl = html.querySelector(selector);
//       const curEl = document.querySelector(selector);
//       if (newEl && curEl && newEl.innerHTML !== curEl.innerHTML) {
//         curEl.innerHTML = newEl.innerHTML;
//       }
//     });

//     document.getElementById('FacetFiltersFormMobile')?.closest('menu-drawer')?.bindEvents();
//     FacetFiltersForm.ensureDiscountSortOption();
//   }

//   /**
//    * Ensures "Discount High to Low" is always present in every sort <select>
//    * and the current URL sort_by value is reflected.
//    */
//   static ensureDiscountSortOption() {
//     const DISCOUNT_VALUE = 'discount-high-to-low';
//     const DISCOUNT_LABEL = 'Discount High to Low';
//     const urlParams = new URLSearchParams(window.location.search);
//     const currentSort = urlParams.get('sort_by') || '';

//     document.querySelectorAll('select[name="sort_by"]').forEach(select => {
//       // Remove A-Z / Z-A
//       Array.from(select.options).forEach(opt => {
//         if (opt.value === 'title-ascending' || opt.value === 'title-descending') opt.remove();
//       });

//       // Ensure Discount option exists
//       if (!Array.from(select.options).some(o => o.value === DISCOUNT_VALUE)) {
//         const opt = document.createElement('option');
//         opt.value = DISCOUNT_VALUE;
//         opt.textContent = DISCOUNT_LABEL;
//         select.appendChild(opt);
//       }

//       // Sync selected value
//       if (currentSort) {
//         const exists = Array.from(select.options).some(o => o.value === currentSort);
//         if (exists && select.value !== currentSort) select.value = currentSort;
//       }
//     });
//   }

//   static renderCounts(source, target) {
//     const targetSummary = target.querySelector('.facets__summary');
//     const sourceSummary = source.querySelector('.facets__summary');
//     if (sourceSummary && targetSummary && sourceSummary.outerHTML !== targetSummary.outerHTML) {
//       targetSummary.outerHTML = sourceSummary.outerHTML;
//     }

//     const targetHeader = target.querySelector('.facets__header');
//     const sourceHeader = source.querySelector('.facets__header');
//     if (sourceHeader && targetHeader && sourceHeader.outerHTML !== targetHeader.outerHTML) {
//       targetHeader.outerHTML = sourceHeader.outerHTML;
//     }

//     const targetWrap = target.querySelector('.facets-wrap');
//     const sourceWrap = source.querySelector('.facets-wrap');
//     if (sourceWrap && targetWrap) {
//       const isShowingMore = Boolean(target.querySelector('show-more-button .label-show-more.hidden'));
//       if (isShowingMore) {
//         sourceWrap.querySelectorAll('.facets__item.hidden')
//           .forEach(item => item.classList.replace('hidden', 'show-more-item'));
//       }
//       if (targetWrap.outerHTML !== sourceWrap.outerHTML) {
//         targetWrap.outerHTML = sourceWrap.outerHTML;
//       }
//     }
//   }

//   static renderMobileCounts(source, target) {
//     const targetList = target?.querySelector('.mobile-facets__list');
//     const sourceList = source.querySelector('.mobile-facets__list');
//     if (sourceList && targetList && sourceList.outerHTML !== targetList.outerHTML) {
//       targetList.outerHTML = sourceList.outerHTML;
//     }
//   }

//   static updateURLHash(searchParams) {
//     history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
//   }

//   static getSections() {
//     return [{ section: document.getElementById('product-grid')?.dataset.id }];
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

// // Static property initialization
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
//       option.querySelector('.mobile-sort-option__check')?.remove();
//     }
//   });
// }

// function triggerSortSubmit(sortValue) {
//   // Sync sort_by across all sort-related forms
//   document.querySelectorAll('facet-filters-form form').forEach(form => {
//     let sortInput = form.querySelector('[name="sort_by"]');
//     if (!sortInput) {
//       sortInput = document.createElement('input');
//       sortInput.type = 'hidden';
//       sortInput.name = 'sort_by';
//       form.appendChild(sortInput);
//     }
//     sortInput.value = sortValue;
//   });

//   // Build search params from the main form and trigger renderPage
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

// // Desktop sort dropdown change
// document.addEventListener('change', function (event) {
//   if (event.target.matches('#SortBy, #SortBy-mobile')) {
//     event.preventDefault();
//     const sortValue = event.target.value;
//     updateSortUI(sortValue);
//     triggerSortSubmit(sortValue);
//   }
// });

// // Mobile sort drawer option click
// document.addEventListener('click', function (event) {
//   const sortOption = event.target.closest('.mobile-sort-option');
//   if (sortOption) {
//     event.preventDefault();
//     const sortValue = sortOption.getAttribute('data-value');
//     if (sortValue) {
//       updateSortUI(sortValue);
//       triggerSortSubmit(sortValue);
//       if (typeof closeSortDrawer === 'function') closeSortDrawer();
//     }
//   }
// });

// // Initialise sort UI and run discount sort on direct page load
// window.addEventListener('DOMContentLoaded', function () {
//   const urlParams = new URLSearchParams(window.location.search);
//   const currentSort = urlParams.get('sort_by');
//   if (currentSort) updateSortUI(currentSort);

//   FacetFiltersForm.ensureDiscountSortOption();

//   if (DiscountSort.isActive()) {
//     // Page was loaded directly with discount-high-to-low in URL.
//     // Fetch all pages and apply global sort.
//     const shopifyParams = DiscountSort.stripFromParams(window.location.search.slice(1));
//     FacetFiltersForm.showPreloader();
//     FacetFiltersForm.setLoadingStates(true);
//     FacetFiltersForm.renderPageWithDiscountSort(
//       window.location.search.slice(1),
//       null,
//       false,
//       FacetFiltersForm.requestManagerInstance.cancelPending()
//     );
//   }
// });

// if (window.performance && console.table) {
//   const originalRenderPage = FacetFiltersForm.renderPage;
//   FacetFiltersForm.renderPage = async function (...args) {
//     const startTime = performance.now();
//     await originalRenderPage.apply(this, args);
//     console.log(`Filter render took ${(performance.now() - startTime).toFixed(2)}ms`);
//   };
// }

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
// DISCOUNT SORT UTILITY
// =====================================================
const DiscountSort = {
  SORT_VALUE: 'discount-high-to-low',

  getDiscount(liEl) {
    const span = liEl.querySelector('.js-discount-value');
    if (span) {
      const val = parseFloat(span.dataset.v);
      if (!isNaN(val)) return val;
    }
    if (liEl.dataset.discountPercentage !== undefined && liEl.dataset.discountPercentage !== '') {
      const val = parseFloat(liEl.dataset.discountPercentage);
      if (!isNaN(val)) return val;
    }
    return 0;
  },

  /**
   * Sort a flat array of <li> elements and interleave banners at their
   * original position (default index 6 = after 6th product).
   */
  sortItems(allItems, bannerInsertIndex = 6) {
    const bannerItems  = allItems.filter(li =>  li.classList.contains('lucira-collec-banner'));
    const productItems = allItems.filter(li => !li.classList.contains('lucira-collec-banner'));

    productItems.sort((a, b) => DiscountSort.getDiscount(b) - DiscountSort.getDiscount(a));

    const finalOrder  = [];
    let prodCursor = 0, bannerCursor = 0;
    const totalSlots  = productItems.length + bannerItems.length;

    for (let i = 0; i < totalSlots; i++) {
      if (bannerCursor < bannerItems.length && i === bannerInsertIndex) {
        finalOrder.push(bannerItems[bannerCursor++]);
      } else if (prodCursor < productItems.length) {
        finalOrder.push(productItems[prodCursor++]);
      }
    }
    while (bannerCursor < bannerItems.length) finalOrder.push(bannerItems[bannerCursor++]);
    return finalOrder;
  },

  /** Replace grid content using a DocumentFragment (single reflow). */
  renderSorted(finalOrder) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    const frag = document.createDocumentFragment();
    finalOrder.forEach(el => frag.appendChild(el.cloneNode(true)));
    grid.innerHTML = '';
    grid.appendChild(frag);
  },

  isActive() {
    return new URLSearchParams(window.location.search).get('sort_by') === DiscountSort.SORT_VALUE;
  },
  isActiveInParams(searchParams) {
    return new URLSearchParams(searchParams).get('sort_by') === DiscountSort.SORT_VALUE;
  },
  stripFromParams(searchParams) {
    const p = new URLSearchParams(searchParams);
    p.set('sort_by', 'manual');
    return p.toString();
  }
};


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
      // Skip sort_by — handled exclusively by triggerSortSubmit via the
      // document-level 'change' listener to avoid a double renderPage call.
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
          .loading{position:relative;}
          #discount-sort-progress{
            position:fixed;top:0;left:0;height:3px;background:#c0a080;z-index:9999999;
            transition:width .35s ease;width:0%;pointer-events:none;}`;
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

    const isDiscountSort = DiscountSort.isActiveInParams(searchParams);
    FacetFiltersForm.searchParamsPrev = searchParams;
    window.lastScrollPosition = window.pageYOffset || document.documentElement.scrollTop || 0;

    FacetFiltersForm.showPreloader();
    FacetFiltersForm.setLoadingStates(true);
    FacetFiltersForm._restoreInfiniteScroll();

    if (isDiscountSort) {
      await FacetFiltersForm.renderDiscountSort(searchParams, event, updateURLHash, signal);
      return;
    }

    // ── Normal (non-discount) path ────────────────────────────────────────
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

  // ── OPTIMISED DISCOUNT SORT ───────────────────────────────────────────────
  //
  // Timeline:
  //   0 ms  → fetch page 1
  //   ~T ms → render page-1 products sorted  ← user sees content here
  //           kick off parallel fetch for ALL remaining pages at once
  //   ~T+Δ  → re-render with globally sorted set, hide infinite-scroll
  //
  static async renderDiscountSort(searchParams, event, updateURLHash, signal) {
    const shopifyParams = DiscountSort.stripFromParams(searchParams);
    const sectionId = document.getElementById('product-grid')?.dataset.id;
    if (!sectionId) {
      FacetFiltersForm.hidePreloader();
      FacetFiltersForm.setLoadingStates(false);
      return;
    }

    // ── Check full-result cache first (instant on revisit) ─────────────────
    const discountCacheKey = `ds::${window.location.pathname}::${shopifyParams}`;
    const cachedItems = FacetFiltersForm.discountSortCache.get(discountCacheKey);
    if (cachedItems) {
      console.log('[DiscountSort] Cache hit — instant render');
      requestAnimationFrame(() => {
        const sorted = DiscountSort.sortItems(cachedItems);
        DiscountSort.renderSorted(sorted);
        FacetFiltersForm._hideInfiniteScroll();
        requestAnimationFrame(() => initWishlist());
        if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
        FacetFiltersForm.restoreScrollPosition();
      });
      return;
    }

    const parser = new DOMParser();
    const base   = `${window.location.pathname}?section_id=${sectionId}&${shopifyParams}`;

    try {
      // ── STEP 1: Fetch page 1 ──────────────────────────────────────────────
      const page1Resp = await fetch(`${base}&page=1`, {
        signal,
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      if (!page1Resp.ok) throw new Error(`HTTP ${page1Resp.status}`);
      const page1Html = await page1Resp.text();
      const page1Doc  = parser.parseFromString(page1Html, 'text/html');
      const page1Grid = page1Doc.getElementById('product-grid');
      const page1Items = page1Grid ? Array.from(page1Grid.querySelectorAll('li.grid__item')) : [];

      // ── STEP 2: Render page 1 immediately so user sees content at once ────
      requestAnimationFrame(() => {
        FacetFiltersForm.renderFilters(page1Html, event, page1Doc);
        FacetFiltersForm.renderProductCount(page1Doc);
        FacetFiltersForm.ensureDiscountSortOption();

        const sorted1 = DiscountSort.sortItems(page1Items);
        DiscountSort.renderSorted(sorted1);

        // Drop the full-page preloader; show a slim progress bar instead
        FacetFiltersForm.hidePreloader();
        FacetFiltersForm.setLoadingStates(false);
        FacetFiltersForm._showProgressBar(15);
        requestAnimationFrame(() => initWishlist());
      });

      // ── STEP 3: Determine total pages then fetch ALL remaining in parallel ─
      const totalPages = FacetFiltersForm._parseTotalPages(page1Doc, page1Items.length);
      console.log(`[DiscountSort] Total pages: ${totalPages}`);

      let allItems = [...page1Items];

      if (totalPages > 1) {
        // Build array of page numbers 2..N
        const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

        // Fetch ALL remaining pages simultaneously (parallel, not sequential)
        // Batch in groups of 6 to be a polite client
        const BATCH_SIZE = 6;
        for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
          const batch = remaining.slice(i, i + BATCH_SIZE);

          const batchResults = await Promise.all(
            batch.map(async (pageNum) => {
              try {
                const resp = await fetch(`${base}&page=${pageNum}`, {
                  signal,
                  headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                if (!resp.ok) return [];
                const doc  = parser.parseFromString(await resp.text(), 'text/html');
                const grid = doc.getElementById('product-grid');
                return grid ? Array.from(grid.querySelectorAll('li.grid__item')) : [];
              } catch (_) {
                return []; // silently skip failed pages
              }
            })
          );

          batchResults.forEach(items => { allItems = allItems.concat(items); });

          // Advance progress bar proportionally
          const pct = Math.min(15 + Math.round(((i + BATCH_SIZE) / remaining.length) * 80), 95);
          FacetFiltersForm._showProgressBar(pct);
        }
      }

      console.log(`[DiscountSort] Total items collected: ${allItems.length}`);

      // ── STEP 4: Final global sort and re-render ───────────────────────────
      const finalSorted = DiscountSort.sortItems(allItems);

      requestAnimationFrame(() => {
        DiscountSort.renderSorted(finalSorted);
        FacetFiltersForm._hideInfiniteScroll();
        FacetFiltersForm._showProgressBar(100);

        // Cache raw item collection for instant subsequent loads (5 min TTL)
        FacetFiltersForm.discountSortCache.set(discountCacheKey, allItems);
        setTimeout(() => FacetFiltersForm.discountSortCache.delete(discountCacheKey), 300000);

        setTimeout(() => FacetFiltersForm._hideProgressBar(), 350);
        requestAnimationFrame(() => initWishlist());
        if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
        FacetFiltersForm.requestManagerInstance.reset();
      });

    } catch (err) {
      if (err.name === 'AbortError') { console.log('[DiscountSort] Cancelled'); return; }
      console.error('[DiscountSort] Error:', err);
      FacetFiltersForm.hidePreloader();
      FacetFiltersForm.setLoadingStates(false);
      FacetFiltersForm._hideProgressBar();
    }
  }

  /**
   * Determine total page count from a fetched Shopify section document.
   *
   * Priority:
   *  1. "X of Y products" in product-count text  → ceil(Y / X)
   *  2. "Y products" (no filter)                 → ceil(Y / page1ItemCount)
   *  3. Highest page= number found in pagination links
   *  4. No next-page link present                → 1
   *  5. Fallback                                 → 50 (empty pages are ignored)
   */
  static _parseTotalPages(doc, page1ItemCount) {
    const countEl = doc.getElementById('ProductCount') || doc.querySelector('.product-count__text');
    if (countEl) {
      const text = countEl.textContent || '';

      const matchOf = text.match(/(\d[\d,]*)\s+of\s+(\d[\d,]*)/i);
      if (matchOf) {
        const perPage = parseInt(matchOf[1].replace(/,/g, ''), 10);
        const total   = parseInt(matchOf[2].replace(/,/g, ''), 10);
        if (perPage > 0 && total > 0) return Math.ceil(total / perPage);
      }

      const matchSimple = text.match(/^(\d[\d,]*)\s+product/i);
      if (matchSimple && page1ItemCount > 0) {
        const total = parseInt(matchSimple[1].replace(/,/g, ''), 10);
        return Math.ceil(total / page1ItemCount);
      }
    }

    // Pagination links (if theme renders classic pagination alongside infinite scroll)
    let maxPage = 1;
    doc.querySelectorAll('a[href*="page="]').forEach(a => {
      const m = a.href.match(/[?&]page=(\d+)/);
      if (m) maxPage = Math.max(maxPage, parseInt(m[1], 10));
    });
    if (maxPage > 1) return maxPage;

    if (!doc.querySelector('infinite-scroll a[href]')) return 1;

    return 50; // safe upper bound; empty-grid pages produce zero items and are harmless
  }

  // ── Progress bar (cosmetic, non-blocking) ────────────────────────────────
  static _showProgressBar(pct) {
    let bar = document.getElementById('discount-sort-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'discount-sort-progress';
      document.body.appendChild(bar);
    }
    bar.style.width = pct + '%';
  }
  static _hideProgressBar() {
    const bar = document.getElementById('discount-sort-progress');
    if (bar) { bar.style.width = '100%'; setTimeout(() => { if (bar) bar.style.width = '0%'; }, 250); }
  }

  // ── Infinite-scroll visibility ───────────────────────────────────────────
  static _hideInfiniteScroll() {
    const is = document.querySelector('infinite-scroll');
    if (is && !is.dataset.discountHidden) {
      is.dataset.discountHidden = '1';
      is.dataset.discountOrigDisplay = is.style.display || '';
      is.style.display = 'none';
    }
  }
  static _restoreInfiniteScroll() {
    const is = document.querySelector('infinite-scroll');
    if (is && is.dataset.discountHidden) {
      is.style.display = is.dataset.discountOrigDisplay || '';
      delete is.dataset.discountHidden;
      delete is.dataset.discountOrigDisplay;
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
  static applyUpdate(html, event, isDiscountSort = false) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');
    requestAnimationFrame(() => {
      FacetFiltersForm.renderFilters(html, event, parsedHTML);
      FacetFiltersForm.renderProductGridContainer(parsedHTML);
      FacetFiltersForm.renderProductCount(parsedHTML);
      if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger(html);
      FacetFiltersForm.ensureDiscountSortOption();
      FacetFiltersForm.restoreScrollPosition();
    });
  }

  static setLoadingStates(loading) {
    const productGrid          = document.getElementById('ProductGridContainer');
    const countContainer       = document.getElementById('ProductCount');
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
    // '.sorting' intentionally excluded — replacing it wipes the custom option.
    ['.mobile-facets__open', '.mobile-facets__count'].forEach(sel => {
      const n = html.querySelector(sel);
      const c = document.querySelector(sel);
      if (n && c && n.innerHTML !== c.innerHTML) c.innerHTML = n.innerHTML;
    });
    document.getElementById('FacetFiltersFormMobile')?.closest('menu-drawer')?.bindEvents();
    FacetFiltersForm.ensureDiscountSortOption();
  }

  static ensureDiscountSortOption() {
    const DISCOUNT_VALUE = 'discount-high-to-low';
    const DISCOUNT_LABEL = 'Discount High to Low';
    const currentSort = new URLSearchParams(window.location.search).get('sort_by') || '';

    document.querySelectorAll('select[name="sort_by"]').forEach(select => {
      Array.from(select.options).forEach(opt => {
        if (opt.value === 'title-ascending' || opt.value === 'title-descending') opt.remove();
      });
      if (!Array.from(select.options).some(o => o.value === DISCOUNT_VALUE)) {
        const opt = document.createElement('option');
        opt.value = DISCOUNT_VALUE;
        opt.textContent = DISCOUNT_LABEL;
        select.appendChild(opt);
      }
      if (currentSort) {
        const exists = Array.from(select.options).some(o => o.value === currentSort);
        if (exists && select.value !== currentSort) select.value = currentSort;
      }
    });
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
FacetFiltersForm.discountSortCache      = new Map(); // keyed by path+params, stores raw item arrays
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
  FacetFiltersForm.ensureDiscountSortOption();

  if (DiscountSort.isActive()) {
    FacetFiltersForm.showPreloader();
    FacetFiltersForm.setLoadingStates(true);
    FacetFiltersForm.renderDiscountSort(
      window.location.search.slice(1),
      null,
      false,
      FacetFiltersForm.requestManagerInstance.cancelPending()
    );
  }
});

if (window.performance && console.table) {
  const _orig = FacetFiltersForm.renderPage;
  FacetFiltersForm.renderPage = async function (...args) {
    const t = performance.now();
    await _orig.apply(this, args);
    console.log(`[Facets] renderPage: ${(performance.now() - t).toFixed(2)}ms`);
  };
}