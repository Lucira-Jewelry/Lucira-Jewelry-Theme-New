if (!customElements.get('product-info')) {
  customElements.define(
    'product-info',
    class ProductInfo extends HTMLElement {
      quantityInput = undefined;
      quantityForm = undefined;
      onVariantChangeUnsubscriber = undefined;
      cartUpdateUnsubscriber = undefined;
      abortController = undefined;
      pendingRequestUrl = null;
      preProcessHtmlCallbacks = [];
      postProcessHtmlCallbacks = [];

      constructor() {
        super();

        this.quantityInput = this.querySelector('.quantity__input');
      }

      connectedCallback() {
        this.initializeProductSwapUtility();

        this.onVariantChangeUnsubscriber = subscribe(
          PUB_SUB_EVENTS.optionValueSelectionChange,
          this.handleOptionValueChange.bind(this)
        );

        this.initQuantityHandlers();
        this.dispatchEvent(new CustomEvent('product-info:loaded', { bubbles: true }));
      }

      addPreProcessCallback(callback) {
        this.preProcessHtmlCallbacks.push(callback);
      }

      initQuantityHandlers() {
        if (!this.quantityInput) return;

        this.quantityForm = this.querySelector('.product-form__quantity');
        if (!this.quantityForm) return;

        this.setQuantityBoundries();
        if (!this.dataset.originalSection) {
          this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, this.fetchQuantityRules.bind(this));
        }
      }

      disconnectedCallback() {
        this.onVariantChangeUnsubscriber();
        this.cartUpdateUnsubscriber?.();
      }

      initializeProductSwapUtility() {
        this.preProcessHtmlCallbacks.push((html) =>
          html.querySelectorAll('.scroll-trigger').forEach((element) => element.classList.add('scroll-trigger--cancel'))
        );
        this.postProcessHtmlCallbacks.push((newNode) => {
          window?.Shopify?.PaymentButton?.init();
          window?.ProductModel?.loadShopifyXR();
        });
      }

      handleOptionValueChange({ data: { event, target, selectedOptionValues } }) {
        if (!this.contains(event.target)) return;

        this.resetProductFormState();

        const productUrl = target.dataset.productUrl || this.pendingRequestUrl || this.dataset.url;
        this.pendingRequestUrl = productUrl;
        const shouldSwapProduct = this.dataset.url !== productUrl;
        const shouldFetchFullPage = this.dataset.updateUrl === 'true' && shouldSwapProduct;

        this.renderProductInfo({
          requestUrl: this.buildRequestUrlWithParams(productUrl, selectedOptionValues, shouldFetchFullPage),
          targetId: target.id,
          callback: shouldSwapProduct
            ? this.handleSwapProduct(productUrl, shouldFetchFullPage)
            : this.handleUpdateProductInfo(productUrl),
        });
      }

      resetProductFormState() {
        const productForm = this.productForm;
        productForm?.toggleSubmitButton(true);
        productForm?.handleErrorMessage();
      }

      handleSwapProduct(productUrl, updateFullPage) {
        return (html) => {
          this.productModal?.remove();

          const selector = updateFullPage ? "product-info[id^='MainProduct']" : 'product-info';
          const variant = this.getSelectedVariant(html.querySelector(selector));
          this.updateURL(productUrl, variant?.id);

          if (updateFullPage) {
            document.querySelector('head title').innerHTML = html.querySelector('head title').innerHTML;

            HTMLUpdateUtility.viewTransition(
              document.querySelector('main'),
              html.querySelector('main'),
              this.preProcessHtmlCallbacks,
              this.postProcessHtmlCallbacks
            );
          } else {
            HTMLUpdateUtility.viewTransition(
              this,
              html.querySelector('product-info'),
              this.preProcessHtmlCallbacks,
              this.postProcessHtmlCallbacks
            );
          }
        };
      }

      renderProductInfo({ requestUrl, targetId, callback }) {
        this.abortController?.abort();
        this.abortController = new AbortController();

        fetch(requestUrl, { signal: this.abortController.signal })
          .then((response) => response.text())
          .then((responseText) => {
            this.pendingRequestUrl = null;
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            callback(html);
          })
          .then(() => {
            // set focus to last clicked option value
            document.querySelector(`#${targetId}`)?.focus();
          })
          .catch((error) => {
            if (error.name === 'AbortError') {
              console.log('Fetch aborted by user');
            } else {
              console.error(error);
            }
          });
      }

      getSelectedVariant(productInfoNode) {
        const selectedVariant = productInfoNode.querySelector('variant-selects [data-selected-variant]')?.innerHTML;
        return !!selectedVariant ? JSON.parse(selectedVariant) : null;
      }

      buildRequestUrlWithParams(url, optionValues, shouldFetchFullPage = false) {
        const params = [];

        !shouldFetchFullPage && params.push(`section_id=${this.sectionId}`);

        if (optionValues.length) {
          params.push(`option_values=${optionValues.join(',')}`);
        }

        return `${url}?${params.join('&')}`;
      }

      updateOptionValues(html) {
        const variantSelects = html.querySelector('variant-selects');
        if (variantSelects) {
          HTMLUpdateUtility.viewTransition(this.variantSelectors, variantSelects, this.preProcessHtmlCallbacks);
        }
      }

      updateTryAtHome(variant) {
        try {
          if (!variant) return;

          const container = this.querySelector(`#TryAtHome-${this.dataset.section}`);
          if (!container) return;

          const showTryAtHome =
            variant.available &&
            variant.inventory_quantity > 0 &&
            variant.in_store_available;

          container.classList.toggle('hidden', !showTryAtHome);
        } catch (e) {
          console.error('updateTryAtHome error', e);
        }
      }

      handleUpdateProductInfo(productUrl) {
        return (html) => {
          const variant = this.getSelectedVariant(html);

          this.pickupAvailability?.update(variant);
          this.updateOptionValues(html);
          this.updateURL(productUrl, variant?.id);
          this.updateVariantInputs(variant?.id);
          this.updateMetafields(html);
          this.updateSku(html);
          this.updatePriceBreakup(html);
          this.updateComparison?.(html);
          this.updateStickyATC({ html, variant });
          this.updateDeliveryWidget(variant);
          this.updateTryAtHome(variant);
          const propInputs = html.querySelectorAll('input[id^="prop-"]');
          propInputs.forEach((src) => {
            const dest = document.getElementById(src.id);
            if (dest && dest.value !== src.value) {
              dest.value = src.value;

              // Trigger input & change events so scripts using these fields react correctly
              dest.dispatchEvent(new Event('input', { bubbles: true }));
              dest.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });

          if (!variant) {
            this.setUnavailable();
            return;
          }

          this.updateMedia(html, variant?.featured_media?.id);
          

          const updateSourceFromDestination = (id, shouldHide = (source) => false) => {
            const source = html.getElementById(`${id}-${this.sectionId}`);
            const destination = this.querySelector(`#${id}-${this.dataset.section}`);
            if (source && destination) {
              destination.innerHTML = source.innerHTML;
              destination.classList.toggle('hidden', shouldHide(source));
            }
          };

          updateSourceFromDestination('price');
          updateSourceFromDestination('Sku', ({ classList }) => classList.contains('hidden'));
          updateSourceFromDestination('Inventory', ({ innerText }) => innerText === '');
          updateSourceFromDestination('Volume');
          updateSourceFromDestination('Price-Per-Item', ({ classList }) => classList.contains('hidden'));
          this.updateMetafields(html);

          this.updateQuantityRules(this.sectionId, html);
          this.querySelector(`#Quantity-Rules-${this.dataset.section}`)?.classList.remove('hidden');
          this.querySelector(`#Volume-Note-${this.dataset.section}`)?.classList.remove('hidden');

          this.productForm?.toggleSubmitButton(
            html.getElementById(`ProductSubmitButton-${this.sectionId}`)?.hasAttribute('disabled') ?? true,
            window.variantStrings.soldOut
          );

          publish(PUB_SUB_EVENTS.variantChange, {
            data: {
              sectionId: this.sectionId,
              html,
              variant,
            },
          });
        };
      }

      updateVariantInputs(variantId) {
        this.querySelectorAll(
          `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`
        ).forEach((productForm) => {
          const input = productForm.querySelector('input[name="id"]');
          input.value = variantId ?? '';
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }

      updateMetafields(html) {
        const sourceRoot = html.querySelector('product-info') || html;
        const fieldElements = Array.from(sourceRoot.querySelectorAll('[data-field]'));
        const gridIdElements = Array.from(
          sourceRoot.querySelectorAll('.grid-information [id]')
        );
        const sourceElements = [...fieldElements, ...gridIdElements];
        const seen = new Set();
        sourceElements.forEach((srcEl) => {
          try {
            const id = srcEl.id;
            if (!id || seen.has(id)) return;
            seen.add(id);
            const destEl = this.querySelector(`#${id}`);
            if (!destEl) return;
            destEl.innerHTML = srcEl.innerHTML;
            if (srcEl.classList.contains('hidden')) destEl.classList.add('hidden');
            else destEl.classList.remove('hidden');
            Array.from(srcEl.attributes).forEach((attr) => {
              if (attr.name === 'id') return;
              if (attr.name.startsWith('data-') || attr.name.startsWith('aria-')) {
                destEl.setAttribute(attr.name, attr.value);
              }
            });
          } catch (e) {
            console.error('updateMetafields error for id:', srcEl?.id, e);
          }
        });
      }

      updateSku(html) {
        try {
          const src = html.querySelector('#sku-content');
          const dest = this.querySelector('#sku-content');
          if (!src || !dest) return;
          dest.innerHTML = src.innerHTML;
          if (src.classList.contains('hidden')) dest.classList.add('hidden');
          else dest.classList.remove('hidden');
          Array.from(src.attributes).forEach((attr) => {
            if (attr.name === 'id') return;
            if (attr.name.startsWith('data-') || attr.name.startsWith('aria-')) {
              dest.setAttribute(attr.name, attr.value);
            }
          });
        } catch (e) {
          console.error('updateSku error', e);
        }
      }

      updatePriceBreakup(html) {
        try {
          const source = html.querySelector('.pdp-price-breakup-tabs') || html.getElementById('price-breakup');
          const dest =
            this.querySelector(`.pdp-price-breakup-tabs`) ||
            this.querySelector(`#price-breakup-${this.dataset.section}`) ||
            document.querySelector('.pdp-price-breakup-tabs');

          if (!source || !dest) return;
          dest.innerHTML = source.innerHTML;
          const readMoreBtn = dest.querySelector('#readMoreBtn');
          const readMoreContent = dest.querySelector('#readMoreContent');
          if (readMoreBtn && readMoreContent) {
            readMoreBtn.addEventListener('click', () => {
              readMoreContent.classList.toggle('collapsed');
              readMoreBtn.textContent = readMoreContent.classList.contains('collapsed') ? 'Read More' : 'Read Less';
            });
          }
          publish?.(PUB_SUB_EVENTS.priceBreakupUpdate, { data: { section: this.sectionId } });
        } catch (e) {
          console.error('updatePriceBreakup error', e);
        }
      }

      updateComparison(html) {
        try {
          const source =
            html.querySelector('.comp-container') ||
            html.getElementById(`comp-container-${this.dataset.section}`);

          const dest =
            this.querySelector('.comp-container') ||
            this.querySelector(`#comp-container-${this.dataset.section}`) ||
            document.querySelector('.comp-container');

          if (!source || !dest) return;
          dest.innerHTML = source.innerHTML;
          dest.querySelectorAll('.cw-info-wrapper').forEach((wrapper) => {
            const infoIcon = wrapper.querySelector('.cw-info-icon');
            const tooltip = wrapper.querySelector('.tooltip-box');
            wrapper.replaceWith(wrapper.cloneNode(true));
          });
          const freshDest = this.querySelector('.comp-container') || document.querySelector('.comp-container');
          if (!freshDest) return;
          freshDest.querySelectorAll('.cw-info-wrapper').forEach((wrapper) => {
            const tooltip = wrapper.querySelector('.tooltip-box');
            const icon = wrapper.querySelector('.cw-info-icon');
            if (!tooltip || !icon) return;
            const show = () => tooltip.classList.add('visible');
            const hide = () => tooltip.classList.remove('visible');
            icon.addEventListener('mouseenter', show);
            icon.addEventListener('mouseleave', hide);
            icon.addEventListener('focus', show);
            icon.addEventListener('blur', hide);
            icon.addEventListener('click', (e) => {
              e.preventDefault();
              tooltip.classList.toggle('visible');
            });
            document.addEventListener('click', (e) => {
              if (!wrapper.contains(e.target)) tooltip.classList.remove('visible');
            });
          });
          publish?.(PUB_SUB_EVENTS.comparisonUpdate, { data: { section: this.sectionId } });
        } catch (e) {
          console.error('updateComparison error', e);
        }
      }

      updateURL(url, variantId) {
        this.querySelector('share-button')?.updateUrl(
          `${window.shopUrl}${url}${variantId ? `?variant=${variantId}` : ''}`
        );

        if (this.dataset.updateUrl === 'false') return;
        window.history.replaceState({}, '', `${url}${variantId ? `?variant=${variantId}` : ''}`);
      }

      setUnavailable() {
        this.productForm?.toggleSubmitButton(true, window.variantStrings.unavailable);

        const selectors = ['price', 'Inventory', 'Sku', 'Price-Per-Item', 'Volume-Note', 'Volume', 'Quantity-Rules']
          .map((id) => `#${id}-${this.dataset.section}`)
          .join(', ');
        document.querySelectorAll(selectors).forEach(({ classList }) => classList.add('hidden'));
      }

      updateMedia(html, variantFeaturedMediaId) {
        if (!variantFeaturedMediaId) return;

        const mediaGallerySource = this.querySelector('media-gallery ul');
        const mediaGalleryDestination = html.querySelector(`media-gallery ul`);

        const refreshSourceData = () => {
          if (this.hasAttribute('data-zoom-on-hover')) enableZoomOnHover(2);
          const mediaGallerySourceItems = Array.from(mediaGallerySource.querySelectorAll('li[data-media-id]'));
          const sourceSet = new Set(mediaGallerySourceItems.map((item) => item.dataset.mediaId));
          const sourceMap = new Map(
            mediaGallerySourceItems.map((item, index) => [item.dataset.mediaId, { item, index }])
          );
          return [mediaGallerySourceItems, sourceSet, sourceMap];
        };

        if (mediaGallerySource && mediaGalleryDestination) {
          let [mediaGallerySourceItems, sourceSet, sourceMap] = refreshSourceData();
          const mediaGalleryDestinationItems = Array.from(
            mediaGalleryDestination.querySelectorAll('li[data-media-id]')
          );
          const destinationSet = new Set(mediaGalleryDestinationItems.map(({ dataset }) => dataset.mediaId));
          let shouldRefresh = false;

          // add items from new data not present in DOM
          for (let i = mediaGalleryDestinationItems.length - 1; i >= 0; i--) {
            if (!sourceSet.has(mediaGalleryDestinationItems[i].dataset.mediaId)) {
              mediaGallerySource.prepend(mediaGalleryDestinationItems[i]);
              shouldRefresh = true;
            }
          }

          // remove items from DOM not present in new data
          for (let i = 0; i < mediaGallerySourceItems.length; i++) {
            if (!destinationSet.has(mediaGallerySourceItems[i].dataset.mediaId)) {
              mediaGallerySourceItems[i].remove();
              shouldRefresh = true;
            }
          }

          // refresh
          if (shouldRefresh) [mediaGallerySourceItems, sourceSet, sourceMap] = refreshSourceData();

          // if media galleries don't match, sort to match new data order
          mediaGalleryDestinationItems.forEach((destinationItem, destinationIndex) => {
            const sourceData = sourceMap.get(destinationItem.dataset.mediaId);

            if (sourceData && sourceData.index !== destinationIndex) {
              mediaGallerySource.insertBefore(
                sourceData.item,
                mediaGallerySource.querySelector(`li:nth-of-type(${destinationIndex + 1})`)
              );

              // refresh source now that it has been modified
              [mediaGallerySourceItems, sourceSet, sourceMap] = refreshSourceData();
            }
          });
        }

        // set featured media as active in the media gallery
        this.querySelector(`media-gallery`)?.setActiveMedia?.(
          `${this.dataset.section}-${variantFeaturedMediaId}`,
          true
        );

        // update media modal
        const modalContent = this.productModal?.querySelector(`.product-media-modal__content`);
        const newModalContent = html.querySelector(`product-modal .product-media-modal__content`);
        if (modalContent && newModalContent) modalContent.innerHTML = newModalContent.innerHTML;
      }

      updateDeliveryWidget(variant) {
        try {
          if (!variant || !window.variantDeliveryData) return;

          const data = window.variantDeliveryData[variant.id];
          if (!data) return;

          const container = document.getElementById('pdp-delivery-check');
          if (!container) return;

          // Update data attributes so the widget JS stays in sync
          container.dataset.variantId         = String(variant.id);
          container.dataset.available         = String(!!variant.available);
          container.dataset.inventoryQuantity = String(variant.inventory_quantity ?? 0);
          container.dataset.isInStock         = String(data.available && data.inventory > 0);

          // Update the displayed date
          const dateSpan = container.querySelector('.lucira-delivery-time .delivry_txt');
          if (dateSpan) dateSpan.textContent = data.date;

          const statusText = container.querySelector('#delivery-status-text');
          if (statusText) {
            statusText.textContent = data.days === 2
              ? 'Estimated Free Dispatch by'
              : 'Available & Dispatched by';
          }

        } catch (e) {
          console.error('updateDeliveryWidget error', e);
        }
      }

      updateStickyATC({ html, variant }) {
        const stickyATC = document.getElementById('md-sticky-atc');
        if (!stickyATC || !variant) return;

        const stickyVariantInput = stickyATC.querySelector('input[name="id"]');
        if (stickyVariantInput) {
          stickyVariantInput.value = variant.id;
          stickyVariantInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const sourcePrice =
          html.querySelector(`#price-${this.sectionId}`) ||
          html.querySelector('.price');

        const stickyPrice = stickyATC.querySelector('.price-mirror');
        if (sourcePrice && stickyPrice) {
          stickyPrice.innerHTML = sourcePrice.innerHTML;
          stickyPrice.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        }

        const stickyImg = stickyATC.querySelector('.product-content img');
        if (!stickyImg || !variant.featured_media?.id) return;

        const variantMediaId = `${this.sectionId}-${variant.featured_media.id}`;
        const sourceImg = html.querySelector(
          `li[data-media-id="${variantMediaId}"] img`
        );

        if (sourceImg) {
          stickyImg.src = sourceImg.src;
          stickyImg.srcset = sourceImg.srcset || sourceImg.src;
        }
      }

      setQuantityBoundries() {
        const data = {
          cartQuantity: this.quantityInput.dataset.cartQuantity ? parseInt(this.quantityInput.dataset.cartQuantity) : 0,
          min: this.quantityInput.dataset.min ? parseInt(this.quantityInput.dataset.min) : 1,
          max: this.quantityInput.dataset.max ? parseInt(this.quantityInput.dataset.max) : null,
          step: this.quantityInput.step ? parseInt(this.quantityInput.step) : 1,
        };

        let min = data.min;
        const max = data.max === null ? data.max : data.max - data.cartQuantity;
        if (max !== null) min = Math.min(min, max);
        if (data.cartQuantity >= data.min) min = Math.min(min, data.step);

        this.quantityInput.min = min;

        if (max) {
          this.quantityInput.max = max;
        } else {
          this.quantityInput.removeAttribute('max');
        }
        this.quantityInput.value = min;

        publish(PUB_SUB_EVENTS.quantityUpdate, undefined);
      }

      fetchQuantityRules() {
        const currentVariantId = this.productForm?.variantIdInput?.value;
        if (!currentVariantId) return;

        this.querySelector('.quantity__rules-cart .loading__spinner').classList.remove('hidden');
        return fetch(`${this.dataset.url}?variant=${currentVariantId}&section_id=${this.dataset.section}`)
          .then((response) => response.text())
          .then((responseText) => {
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            this.updateQuantityRules(this.dataset.section, html);
          })
          .catch((e) => console.error(e))
          .finally(() => this.querySelector('.quantity__rules-cart .loading__spinner').classList.add('hidden'));
      }

      updateQuantityRules(sectionId, html) {
        if (!this.quantityInput) return;
        this.setQuantityBoundries();

        const quantityFormUpdated = html.getElementById(`Quantity-Form-${sectionId}`);
        const selectors = ['.quantity__input', '.quantity__rules', '.quantity__label'];
        for (let selector of selectors) {
          const current = this.quantityForm.querySelector(selector);
          const updated = quantityFormUpdated.querySelector(selector);
          if (!current || !updated) continue;
          if (selector === '.quantity__input') {
            const attributes = ['data-cart-quantity', 'data-min', 'data-max', 'step'];
            for (let attribute of attributes) {
              const valueUpdated = updated.getAttribute(attribute);
              if (valueUpdated !== null) {
                current.setAttribute(attribute, valueUpdated);
              } else {
                current.removeAttribute(attribute);
              }
            }
          } else {
            current.innerHTML = updated.innerHTML;
            if (selector === '.quantity__label') {
              const updatedAriaLabelledBy = updated.getAttribute('aria-labelledby');
              if (updatedAriaLabelledBy) {
                current.setAttribute('aria-labelledby', updatedAriaLabelledBy);
                // Update the referenced visually hidden element
                const labelId = updatedAriaLabelledBy;
                const currentHiddenLabel = document.getElementById(labelId);
                const updatedHiddenLabel = html.getElementById(labelId);
                if (currentHiddenLabel && updatedHiddenLabel) {
                  currentHiddenLabel.textContent = updatedHiddenLabel.textContent;
                }
              }
            }
          }
        }
      }

      get productForm() {
        return this.querySelector(`product-form`);
      }

      get productModal() {
        return document.querySelector(`#ProductModal-${this.dataset.section}`);
      }

      get pickupAvailability() {
        return this.querySelector(`pickup-availability`);
      }

      get variantSelectors() {
        return this.querySelector('variant-selects');
      }

      get relatedProducts() {
        const relatedProductsSectionId = SectionId.getIdForSection(
          SectionId.parseId(this.sectionId),
          'related-products'
        );
        return document.querySelector(`product-recommendations[data-section-id^="${relatedProductsSectionId}"]`);
      }

      get quickOrderList() {
        const quickOrderListSectionId = SectionId.getIdForSection(
          SectionId.parseId(this.sectionId),
          'quick_order_list'
        );
        return document.querySelector(`quick-order-list[data-id^="${quickOrderListSectionId}"]`);
      }

      get sectionId() {
        return this.dataset.originalSection || this.dataset.section;
      }
    }
  );
}

document.addEventListener("DOMContentLoaded", function () {
  const variantSelectsDrawer = document.querySelector(
    "#variant-drawer variant-selects"
  );
  const drawerPriceEl = document.getElementById("drawer-price");

  if (!variantSelectsDrawer || !drawerPriceEl) return;

  // Listen for variant change from this variant-selects only
  variantSelectsDrawer.addEventListener("variant:change", function (event) {
    const variant = event.detail?.variant;
    if (!variant) return;

    // Format prices
    const formatPrice = (amount) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(amount / 100);

    let html = `<span class="sale-price">${formatPrice(variant.price)}</span>`;

    if (variant.compare_at_price && variant.compare_at_price > variant.price) {
      html += ` <s class="compare-price">${formatPrice(
        variant.compare_at_price
      )}</s>`;
    }

    // Update drawer price instantly
    drawerPriceEl.innerHTML = html;
    drawerPriceEl.dataset.price = variant.price;
  });
});