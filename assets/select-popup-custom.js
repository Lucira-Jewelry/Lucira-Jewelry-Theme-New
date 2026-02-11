
  document.addEventListener('DOMContentLoaded', function () {
    const selectButtons = document.querySelectorAll('.select-class');
    const popup = document.getElementById('product-popup');
    const popupImg = document.getElementById('popup-product-img');
    const popupTitle = document.getElementById('popup-product-title');
    const popupPrice = document.getElementById('popup-product-price');
    const popupCompare = document.getElementById('popup-product-compare');
    const popupSizes = document.getElementById('popup-sizes');
    const popupColors = document.querySelector('.popup-color-options');
    const popupClose = document.querySelector('.popup-close');
    const proceedEl = document.querySelector('[data-role="proceed"]') || document.querySelector('.Proceed_button');

    let currentProduct = null;
    let optionIndex = { color: null, size: null, carat: null };
    let sel = { carat: null, color: null, size: null, variant: null };

    const fmtMoney = (cents) => {
      if (cents == null) return '';

      const amount = cents / 100;

      return '₹ ' + amount.toLocaleString('en-IN', {
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
      });
    };
    const lsKey = () => 'SelectedVariant';

    function saveVariantToLS(variant) {
      try {
        if (variant && variant.id) localStorage.setItem(lsKey(), String(variant.id));
        else localStorage.removeItem(lsKey());
      } catch (e) {}
    }

    function splitCaratColor(value) {
      if (!value) return { carat: null, color: '' };
      const m = String(value)
        .trim()
        .match(/^(\d+\s?KT)\s+(.*)$/i);
      if (m) return { carat: m[1].toUpperCase(), color: m[2].trim() };
      return { carat: null, color: String(value).trim() };
    }

    function detectOptionIndexes(product) {
      const opts = product?.options || [];
      const findBy = (regex) => {
        const i = opts.findIndex((o) => regex.test((o || '').toString().toLowerCase()));
        return i >= 0 ? i : null;
      };
      return {
        color: findBy(/color|metal|finish|tone/),
        size: findBy(/size/),
        carat: findBy(/carat|kt|karat/),
      };
    }
    function getImageFromVariant(variant, product) {
      if (!variant && !product) return '';
      if (variant) {
        if (variant.featured_image && (variant.featured_image.src || variant.featured_image.url)) {
          return variant.featured_image.src || variant.featured_image.url;
        }
        if (variant.image) {
          if (typeof variant.image === 'string') return variant.image;
          if (variant.image.src || variant.image.url) return variant.image.src || variant.image.url;
        }
        if (variant.preview_image && (variant.preview_image.src || variant.preview_image.url)) {
          return variant.preview_image.src || variant.preview_image.url;
        }
        if (
          variant.featured_media &&
          variant.featured_media.preview_image &&
          (variant.featured_media.preview_image.src || variant.featured_media.preview_image.url)
        ) {
          return variant.featured_media.preview_image.src || variant.featured_media.preview_image.url;
        }
        if (variant.image_id && product && Array.isArray(product.images)) {
          const found = product.images.find((img) => {
            if (!img) return false;
            if (typeof img === 'string') return false;
            if (img.id && String(img.id) === String(variant.image_id)) return true;
            if (img.variant_ids && Array.isArray(img.variant_ids) && img.variant_ids.includes(variant.id)) return true;
          });
          if (found) return found.src || found.url || '';
        }
      }
      if (product) {
        if (product.featured_image && (product.featured_image.src || product.featured_image.url)) {
          return product.featured_image.src || product.featured_image.url;
        }
        if (Array.isArray(product.images) && product.images.length) {
          const img0 = product.images[0];
          if (typeof img0 === 'string') return img0;
          if (img0 && (img0.src || img0.url)) return img0.src || img0.url;
        }
      }
      return '';
    }

    function renderImage(variant, product) {
      const imgSrc = getImageFromVariant(variant, product);
      if (!popupImg) return;
      if (imgSrc) {
        if (popupImg.src !== imgSrc) popupImg.src = imgSrc;
        if (variant && (variant.title || variant.name)) popupImg.alt = variant.title || variant.name;
        else if (product && product.title) popupImg.alt = product.title;
        else popupImg.alt = 'Product image';
        popupImg.style.display = ''; 
      } else {
        console.warn('No image found for variant/product. Falling back to existing image or hiding.', {
          variant,
          product,
        });
      }
    }

    function renderPrices(variant) {
      if (!popupPrice) return;
      if (!variant) {
        popupPrice.textContent = '';
        popupCompare.textContent = '';
        if (popupCompare) popupCompare.style.display = 'none';
        setProceedUI(false);
        return;
      }
      popupPrice.textContent = fmtMoney(variant.price);
      popupCompare.textContent = variant.compare_at_price ? fmtMoney(variant.compare_at_price) : '';
      if (popupCompare) popupCompare.style.display = variant.compare_at_price ? '' : 'none';
    }

    function findVariant(product, selected) {
      if (!product || !product.variants) return null;
      return (
        product.variants.find((v) => {
          if (!v.available) return false;
          const opts = v.options || [];
          const pick = (i) => (i === 0 ? opts[0] : i === 1 ? opts[1] : i === 2 ? opts[2] : null);
          if (optionIndex.carat !== null) {
            const okCarat = !selected.carat || pick(optionIndex.carat) === selected.carat;
            const okColor = !selected.color || pick(optionIndex.color) === selected.color;
            const okSize = !selected.size || pick(optionIndex.size) === selected.size;
            return okCarat && okColor && okSize;
          } else {
            const colorRaw = pick(optionIndex.color);
            const parts = splitCaratColor(colorRaw);
            const okCarat =
              !selected.carat || (parts.carat && parts.carat.toUpperCase() === selected.carat.toUpperCase());
            const okColor = !selected.color || parts.color === selected.color;
            const okSize = !selected.size || pick(optionIndex.size) === selected.size;
            return okCarat && okColor && okSize;
          }
        }) || null
      );
    }
   function buildColorButtonsFromCard(productCard, preSelectedColor, skipInitialRender) {
      if (!popupColors) return;
      popupColors.innerHTML = '';
      if (!sel.carat) return;
      const grp = productCard.querySelector(`.color-group[data-carat="${sel.carat}"]`);
      if (!grp) return;
      const seen = new Set();
      let matchingBtn = null;
      
      grp.querySelectorAll('.color-option').forEach((srcBtn) => {
        const baseColor = srcBtn.dataset.color || srcBtn.title || srcBtn.textContent.trim();
        if (!baseColor || seen.has(baseColor)) return;
        seen.add(baseColor);
        const clone = srcBtn.cloneNode(true);
        clone.classList.remove('active');
        
        if (preSelectedColor && baseColor === preSelectedColor) {
          matchingBtn = clone;
        }
        
        clone.addEventListener('click', () => {
          popupColors.querySelectorAll('.color-option').forEach((b) => b.classList.remove('active'));
          clone.classList.add('active');
          const currentSize = sel.size; 
          sel.color = baseColor; 
          
          let potentialVariant = findVariant(currentProduct, sel);
          if (currentSize) {
             const variantSize = potentialVariant?.options?.[optionIndex.size];
             
             if (potentialVariant && variantSize === currentSize) {
                 sel.variant = potentialVariant; 
             } else {
                 sel.size = null; 
                 sel.variant = findVariant(currentProduct, { ...sel, size: null });
             }
          } else {
             sel.variant = potentialVariant;
          }

          buildSizeButtons(currentProduct); 
          renderPrices(sel.variant);
          renderImage(sel.variant, currentProduct);
          saveVariantToLS(sel.variant);
        
          setProceedUI(!!(sel.size && sel.variant && sel.variant.id));
        });
        popupColors.appendChild(clone);
      });
      
      const toActivate = matchingBtn || popupColors.querySelector('.color-option');
      if (toActivate) {
        toActivate.classList.add('active');
        sel.color = toActivate.dataset.color || toActivate.title || toActivate.textContent.trim();
        sel.variant = findVariant(currentProduct, sel);
        
        if (!skipInitialRender) {
          renderPrices(sel.variant);
          renderImage(sel.variant, currentProduct);
        }
      }
    }
    function buildSizeButtons(product) {
      if (!popupSizes) return;
      popupSizes.innerHTML = '';
      if (optionIndex.size === null) return;

      const sizeSet = new Set();
      (product.variants || []).forEach((v) => {
        if (!v.available) return;
        let match = true;
        if (optionIndex.carat !== null) {
          if (sel.carat && v.options[optionIndex.carat] !== sel.carat) match = false;
          if (sel.color && v.options[optionIndex.color] !== sel.color) match = false;
        } else {
          const parts = splitCaratColor(v.options[optionIndex.color]);
          if (sel.carat && (!parts.carat || parts.carat.toUpperCase() !== sel.carat.toUpperCase())) match = false;
          if (sel.color && parts.color !== sel.color) match = false;
        }
        if (match) sizeSet.add(v.options[optionIndex.size]);
      });

      Array.from(sizeSet).forEach((size) => {
        const sizeBtn = document.createElement('button');
        sizeBtn.className = 'size-btn';
                if (sel.size && sel.size === size) {
            sizeBtn.classList.add('active');
        }

        sizeBtn.innerHTML = `<span class="size-subtext">princess</span><span class="size-number">${size}</span>`;
        sizeBtn.addEventListener('click', () => {
          popupSizes.querySelectorAll('.size-btn').forEach((b) => b.classList.remove('active'));
          sizeBtn.classList.add('active');
          sel.size = size; 
          sel.variant = findVariant(product, sel);
          renderPrices(sel.variant);
          renderImage(sel.variant, product);
          saveVariantToLS(sel.variant);
          setProceedUI(!!(sel.size && sel.variant && sel.variant.id)); 
        });
        popupSizes.appendChild(sizeBtn);
      });
    }
    function setProceedUI(enabled) {
      if (!proceedEl) return;
      const isMobile = window.matchMedia('(max-width:768px)').matches;

      if (!isMobile) {
        proceedEl.style.display = enabled ? 'block' : 'none';
        proceedEl.classList.remove('mobile-enabled', 'mobile-disabled');
        if ('disabled' in proceedEl) proceedEl.disabled = !enabled;
        proceedEl.setAttribute('aria-disabled', enabled ? 'false' : 'true');
        popup.classList.remove('proceed-active');
        document.querySelector('.popup-content')?.classList.remove('with-proceed-padding');
        proceedEl.style.cursor = enabled ? 'pointer' : 'not-allowed';
        proceedEl.style.opacity = enabled ? '1' : '.6';
        return;
      }

      if (enabled) {
        proceedEl.classList.add('mobile-enabled');
        proceedEl.classList.remove('mobile-disabled');
        proceedEl.style.display = 'block';
        popup.classList.add('proceed-active');
        document.querySelector('.popup-content')?.classList.add('with-proceed-padding');
      } else {
        proceedEl.classList.remove('mobile-enabled');
        proceedEl.classList.remove('mobile-disabled');
        proceedEl.style.display = 'none';
        popup.classList.remove('proceed-active');
        document.querySelector('.popup-content')?.classList.remove('with-proceed-padding');
      }
      proceedEl.style.cursor = enabled ? 'pointer' : 'not-allowed';
      proceedEl.style.opacity = enabled ? '1' : '.6';
      proceedEl.setAttribute('aria-disabled', enabled ? 'false' : 'true');
    }

    selectButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const productCard = button.closest('.carat-item');
        const productId = productCard && productCard.dataset.productId;
        const caratValue = (button.dataset.carat || '').toUpperCase();
        const activeColorBtn = productCard.querySelector('.color-option.active');
        const preSelectedColor = activeColorBtn ? (activeColorBtn.dataset.color || activeColorBtn.title || '') : null;
                const cardImg = productCard.querySelector('.product-img');
        const preSelectedImage = cardImg ? cardImg.src : null;
        const cardPrice = productCard.querySelector('.price-text');
        const preSelectedPrice = cardPrice ? cardPrice.textContent : null;
        const cardComparePrice = productCard.querySelector('.carat-comp_price');
        const preSelectedComparePrice = cardComparePrice ? cardComparePrice.textContent : null;

        try {
          currentProduct = productId
            ? JSON.parse(document.getElementById('product-data-' + productId).textContent)
            : null;
        } catch (e) {
          console.error('Product JSON parse error', e);
          return;
        }

        optionIndex = detectOptionIndexes(currentProduct || { options: [] });
        sel = { carat: caratValue, color: preSelectedColor, size: null, variant: null };

        saveVariantToLS(null);
        setProceedUI(false);
        popup.classList.remove('proceed-active');
        popupTitle.textContent = currentProduct?.title || '';
                if (popupImg && preSelectedImage) {
          popupImg.src = preSelectedImage;
          popupImg.alt = currentProduct?.title || 'Product image';
          popupImg.style.display = '';
        } else {
          renderImage(null, currentProduct);
        }
                if (popupPrice && preSelectedPrice) {
          popupPrice.textContent = preSelectedPrice;
        }
                if (popupCompare) {
          if (preSelectedComparePrice) {
            popupCompare.textContent = preSelectedComparePrice;
            popupCompare.style.display = '';
          } else {
            popupCompare.textContent = '';
            popupCompare.style.display = 'none';
          }
        }
                buildColorButtonsFromCard(productCard, preSelectedColor, true);
        buildSizeButtons(currentProduct);
        popup.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

function closePopup() {
  popup.classList.remove('active', 'proceed-active');
  document.body.style.overflow = 'auto';
  setProceedUI(false);
  sel = { carat: null, color: null, size: null, variant: null };
  if (proceedEl) {
    proceedEl.classList.remove('mobile-enabled', 'mobile-disabled');
    proceedEl.style.display = '';
    proceedEl.textContent = proceedEl.getAttribute('data-default-text') || 'PROCEED';
  }

  const activeSizeBtn = document.querySelector('.popup-sizes .size-btn.active');
  if (!activeSizeBtn && window.progressSteps) {
    window.progressSteps.resetTo(2, 's2'); 
  }
}


    popupClose?.addEventListener('click', closePopup);
    popup.addEventListener('click', (e) => {
      if (e.target === popup) closePopup();
    });
    if (proceedEl) {
      proceedEl.addEventListener('click', () => {
        if (!sel.variant || !sel.variant.id) return;
        const activeCaratBtn = document.querySelector('.carat-filter-btn.active');
        if (activeCaratBtn) {
          const caratValue = activeCaratBtn.getAttribute('data-carat');
          localStorage.setItem('Carat-value', caratValue);
          let starImage = document.querySelectorAll(".steps-container .step")[2]
          starImage.classList.add("is-complete");
          starImage.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true" focusable="false">
            <path d="M80 40C66.6718 40 40 66.6718 40 80C40 66.6718 13.3282 40 0 40C13.3282 40 40 13.3282 40 0C40 13.3282 66.6718 40 80 40Z" fill="#008000"/>
            <mask id="mask0_149_1045" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="24" y="24" width="32" height="32">
              <rect x="24" y="24" width="32" height="32" fill="#D9D9D9"/>
            </mask>
            <g mask="url(#mask0_149_1045)">
              <path d="M36.7333 44.6874L48.2513 33.1694C48.4495 32.9709 48.6815 32.8696 48.9473 32.8654C49.213 32.8611 49.4494 32.9625 49.6563 33.1694C49.8631 33.3762 49.9666 33.6138 49.9666 33.882C49.9666 34.1505 49.8631 34.3881 49.6563 34.595L37.5769 46.695C37.3358 46.9359 37.0546 47.0564 36.7333 47.0564C36.4119 47.0564 36.1307 46.9359 35.8896 46.695L30.3229 41.1284C30.1247 40.9299 30.0269 40.6944 30.0296 40.4217C30.032 40.1492 30.1367 39.9096 30.3436 39.7027C30.5505 39.4958 30.788 39.3924 31.0563 39.3924C31.3247 39.3924 31.5624 39.4958 31.7693 39.7027L36.7333 44.6874Z" fill="white"/>
            </g>
          </svg>
          `;
          const centerLabel = document.querySelector(".center-label");
            if (centerLabel) {
              centerLabel.innerText = "SELECT YOUR CHARM";
            }
            let charm_cart_v1 = JSON.parse(localStorage.getItem("charm_cart_v1")) || { items: {} };

        let totalQty = Object.keys(charm_cart_v1.items).reduce((sum, key) => {
          return sum + (charm_cart_v1.items[key].qty || 0);
        }, 0);

        console.log("Total Qty:", totalQty);
        if (totalQty >= 5) {
          setTimeout(()=>{
            console.log('inside if', totalQty)
          document.querySelectorAll('button.qty-incr').forEach(btn => {
            btn.setAttribute('aria-disabled', 'true'); 
            btn.setAttribute('disabled', true);        
            btn.style.pointerEvents = "none";         
            btn.style.opacity = "0.5";               
          });
          }, 1000)
        }

          updateCenterLabelPosition();
          refreshCapState();
        } else {
          console.log('inside else', totalQty)
        }
        const value = localStorage.getItem('Carat-value');
        const charmsGrid = document.querySelector('.charms-grid');
        if (charmsGrid && value) {
          charmsGrid.setAttribute('data-original-value', value);
        }
      });
      if (proceedEl.getAttribute && proceedEl.getAttribute('role') === 'button') {
        proceedEl.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            proceedEl.click();
          }
        });
      }
    }
    window.addEventListener('resize', () => {
      setProceedUI(!!(sel.variant && sel.variant.id));
    });

    document.addEventListener('click', function (e) {
      const step2El = e.target.closest('.steps-container .step[data-step="2"]');
      if (!step2El) return;
      const step3El = document.querySelector('.steps-container .step[data-step="3"]');
      if (!step3El || !step3El.classList.contains('is-complete')) return;
      popup.classList.add('active');
      document.body.style.overflow = 'hidden';

      setProceedUI(!!(sel.variant && sel.variant.id));
    });

    window._popupDebug = {
      sel,
      currentProduct,
      getImageFromVariant: (v) => getImageFromVariant(v, currentProduct),
    };
  });

  function proceedBtnClicked() {
    MainBaseCharm();
    setTimeout(() => {
      const label = document.getElementById('lf-color-name');
      const dotsWrap = document.getElementById('lf-dots');
      const activeDot = document.getElementById('lf-active-dot');
      const caratValue = localStorage.getItem('Carat-value');
      if (caratValue) {
        label.insertAdjacentHTML('afterbegin', `<span class="carat-value">${caratValue}</span> `);
      }

      if (window.filterCharmsBySelectedVariantCarat) {
        window.filterCharmsBySelectedVariantCarat();
      }

      document.querySelectorAll('.charms-grid-container.active .custom-charm-grid').forEach((each) => {
        const title = each.getAttribute('data-title')?.toLowerCase().replace(/\s+/g, '') || '';
        const colorName = document.querySelector('#lf-color-name')?.textContent.toLowerCase().replace(/\s+/g, '') || '';
        if (title.includes(colorName) || colorName.includes(title)) {
          each.style.display = '';
        } else {
          each.style.display = 'none';
        }
      });

      
      
      
      function resizeKonvaCanvas() {
        if(window.innerWidth > 768){
          const baseScreen = 1920;   
          const baseSize = 550;     

          let canvasSize = (window.innerWidth / baseScreen) * baseSize;

          canvasSize = Math.max(350, Math.min(canvasSize, 700));
          document.querySelectorAll('.konvajs-content canvas').forEach((each) => {
            each.style.width = canvasSize + 'px';
            each.style.height = canvasSize + 'px';
          });
          document.querySelector('.variant-img-wrap').style.width = canvasSize + 'px';
          //document.querySelector('.variant-img-wrap').style.height = canvasSize + 'px';
          document.querySelector('.konvajs-content').style.width = canvasSize + 'px';
          document.querySelector('.konvajs-content').style.height = canvasSize + 'px';
        } else {
          const baseScreen = 768;   
          const baseSize = 400;     

          let canvasSize = (window.innerWidth / baseScreen) * baseSize;

          canvasSize = Math.max(180, Math.min(canvasSize, 550));
          document.querySelectorAll('.konvajs-content canvas').forEach((each) => {
            each.style.width = canvasSize + 'px';
            each.style.height = canvasSize + 'px';
          });
          document.querySelector('.variant-img-wrap').style.width = canvasSize + 'px';
          document.querySelector('.variant-img-wrap').style.height = canvasSize + 'px';
          document.querySelector('.konvajs-content').style.width = canvasSize + 'px';
          // document.querySelector('.konvajs-content').style.height = canvasSize + 'px';
        }
        
      }
      const tile = document.querySelector('.main-collection-tile-div');
      const targets = document.querySelectorAll('.scrollable');

      const tileHeight = tile.offsetHeight;
      targets.forEach(target => {
        target.style.maxHeight = `calc(400px - ${tileHeight}px)`;
      });

    resizeKonvaCanvas();
    if (window.innerWidth <= 768) {
      const container = document.querySelector('.title_coll_container');
      const rect = container.getBoundingClientRect();
      const visibleHeight = Math.min(rect.height, window.innerHeight - Math.max(rect.top, 0));
      container.style.maxHeight = visibleHeight + 'px';
    }
    }, 200);
    
  }