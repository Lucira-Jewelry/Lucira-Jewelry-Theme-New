/**
 * Homepage Custom Logic & Tracking
 */

(function() {
    // 1. Home Image Banner Tracking
    window.handleGTMPromoBannerClick = function(event) {
        event.preventDefault();
        const target = event.currentTarget;
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: "promoClick",
            promoClick: {
                promo_id: target.dataset.promoId || target.id,
                promo_name: target.dataset.promoName,
                creative_name: "homepage_banner_image",
                promo_position: "homepage_top"
            }
        });
        setTimeout(() => { window.location.assign(target.href); }, 100);
    };

    // 2. Store Experience Logic
    window.handleStoreExpGTMClick = function(event) {
        event.preventDefault();
        const target = event.currentTarget;
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: "promoClick",
            promoClick: {
                promo_id: target.dataset.promoId || target.id,
                promo_name: target.dataset.promoName,
                creative_name: "store_experience_banner_image",
                promo_position: "Home Page"
            }
        });
        setTimeout(() => { window.location.assign(target.href); }, 100);
    };

    window.initStoreExpSkeleton = function() {
        const section = document.querySelector('[data-store-exp-lazy]');
        if (!section) return;
        const skeleton = section.querySelector('.store-experience-skeleton');
        const content = section.querySelector('.store-experience-content');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    content.style.display = 'block';
                    requestAnimationFrame(() => {
                        content.classList.add('loaded');
                        if (skeleton) skeleton.remove();
                    });
                    observer.disconnect();
                }
            });
        }, { rootMargin: '200px' });
        observer.observe(section);
    };

    // 3. Deal of the Week Logic
    window.initDealOfWeek = function(sectionId) {
        const section = document.querySelector(`.deal-week-section-${sectionId}`);
        if (!section) return;

        // Skeleton Observer
        const skeletonObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const skeleton = section.querySelector('.deal-week-skeleton-wrapper');
                    const content = section.querySelector('.deal-week-content-wrapper');
                    if (skeleton && content) {
                        content.style.display = 'block';
                        requestAnimationFrame(() => {
                            content.style.opacity = '1';
                            setTimeout(() => skeleton.remove(), 500);
                        });
                    }
                    skeletonObserver.disconnect();
                }
            });
        }, { rootMargin: '200px' });
        skeletonObserver.observe(section);

        // Load More
        const loadMoreBtn = document.getElementById(`load-more-btn-${sectionId}`);
        const productGrid = document.getElementById(`deal-week-grid-${sectionId}`);
        if (loadMoreBtn && productGrid) {
            loadMoreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                productGrid.classList.add('show-all');
                loadMoreBtn.parentElement.style.display = 'none';
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    event: 'promoClick',
                    promoClick: {
                        promo_id: 'deal_of_week_load_more',
                        creative_name: 'Deal of the Week',
                        promo_name: 'Load More Button',
                    },
                });
            });
        }

        // Tracking & Color Options
        section.querySelectorAll('.card-wrapper').forEach((card, index) => {
            card.querySelectorAll('a.card-link, a.card__heading, a.card__title, .product-card-link, .card__media img').forEach(el => {
                el.addEventListener('click', () => {
                    const title = card.querySelector('.card__heading, .card__title')?.textContent.trim() || '';
                    const sku = card.querySelector('[data-product-sku]')?.dataset.productSku || '';
                    window.dataLayer = window.dataLayer || [];
                    window.dataLayer.push({
                        event: 'promoClick',
                        promoClick: {
                            promo_id: sku || `deal_of_week_product_${index + 1}`,
                            creative_name: 'Deal of the Week',
                            promo_name: title,
                        },
                    });
                });
            });
        });
    };

    // 4. Gifting Section Tracking
    window.initGiftingTracking = function() {
        document.querySelectorAll(".gift-link").forEach((link, index) => {
            link.addEventListener("click", function() {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    event: "promoClick",
                    promoClick: {
                        promo_id: "Gift Box " + (index + 1),
                        promo_name: this.querySelector("img")?.alt || "Gift Image",
                        creative_name: "Gifting Section - Gift Box",
                        location_id: this.getAttribute("href") || "N/A"
                    }
                });
            });
        });
    };

    // 5. Shop The Look Tracking
    window.initSTLTracking = function() {
        document.querySelectorAll('.stl-shop-now').forEach(link => {
            link.addEventListener('click', () => {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    event: "promoClick",
                    promoClick: {
                        promo_id: link.getAttribute('data-promo-id') || '',
                        creative_name: link.getAttribute('data-creative-name') || 'Shop_the_look_banner_image',
                        promo_position: link.getAttribute('data-promo-position') || 'homepage_shop_the_look'
                    }
                });
            });
        });
    };

    // 6. Watch and Buy Logic
    window.initWatchAndBuy = function() {
        const popup = document.getElementById('videoPopup');
        if (!popup) return;
        const popupIframe = document.getElementById('popupIframe');
        const videoProgressFill = document.getElementById('videoProgressFill');
        let currentVideoIndex = 0;
        let videoItems = [];

        const collectItems = () => {
            videoItems = Array.from(document.querySelectorAll('.watch-buy-item')).filter(item => {
                return item.dataset.video || item.dataset.iframeUrl;
            });
        };

        const updateProgress = () => {
            const popupVideo = document.getElementById('popupVideo');
            if (popupVideo && popupVideo.duration && videoProgressFill) {
                videoProgressFill.style.width = (popupVideo.currentTime / popupVideo.duration) * 100 + '%';
            }
        };

        const loadVideo = (index) => {
            if (index < 0 || index >= videoItems.length) return;
            currentVideoIndex = index;
            const item = videoItems[index];
            const iframeSrc = item.dataset.iframeUrl;
            const videoSrc = item.dataset.video;

            let popupVideo = document.getElementById('popupVideo');
            if (!popupVideo) {
                popupVideo = document.createElement('video');
                popupVideo.id = 'popupVideo';
                popupVideo.className = 'popup-video';
                popupVideo.controls = true;
                popupVideo.loop = true;
                popupVideo.playsInline = true;
                popupVideo.style.width = '100%';
                popupVideo.style.borderRadius = '8px';
                document.getElementById('popupVideoContainer').appendChild(popupVideo);
            }

            if (iframeSrc) {
                if (popupIframe) {
                    popupIframe.src = iframeSrc;
                    popupIframe.style.display = 'block';
                }
                popupVideo.style.display = 'none';
            } else if (videoSrc) {
                if (popupIframe) popupIframe.style.display = 'none';
                popupVideo.style.display = 'block';
                popupVideo.src = videoSrc;
                popupVideo.play().catch(() => {});
                popupVideo.addEventListener('timeupdate', updateProgress);
            }

            const prodImg = document.getElementById('popupProductImage');
            if (prodImg) prodImg.src = item.dataset.productImage;
            const prodTitle = document.getElementById('popupProductTitle');
            if (prodTitle) prodTitle.textContent = item.dataset.productTitle;
            const prodPrice = document.getElementById('popupProductPrice');
            if (prodPrice) prodPrice.textContent = item.dataset.productPrice;
        };

        document.querySelectorAll('.watch-buy-item').forEach((item) => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.carousel-shopping-bag')) return;
                popup.style.display = 'block';
                document.body.style.overflow = 'hidden';
                collectItems();
                const videoIndex = videoItems.indexOf(item);
                loadVideo(videoIndex !== -1 ? videoIndex : 0);
            });
        });

        document.getElementById('closePopup')?.addEventListener('click', () => {
            popup.style.display = 'none';
            document.body.style.overflow = 'auto';
            const v = document.getElementById('popupVideo');
            if (v) { v.pause(); v.src = ''; }
            if (popupIframe) popupIframe.src = '';
        });

        // Simple Next/Prev
        document.getElementById('popupNext')?.addEventListener('click', () => {
            loadVideo((currentVideoIndex + 1) % videoItems.length);
        });
        document.getElementById('popupPrev')?.addEventListener('click', () => {
            loadVideo((currentVideoIndex - 1 + videoItems.length) % videoItems.length);
        });
    };

    // Generic Lazy Section Loader
    const lazyLoadSections = () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const section = entry.target;
                    const skeleton = section.querySelector('.skeleton-loader, [class*="skeleton"]');
                    const content = section.querySelector('.lazy-content, [class*="-content"]');

                    if (content) {
                        content.style.display = 'block';
                        requestAnimationFrame(() => content.classList.add('loaded'));
                    }
                    if (skeleton) skeleton.remove();

                    observer.unobserve(section);
                }
            });
        }, { rootMargin: '200px' });

        document.querySelectorAll('[data-lazy-section]').forEach(s => observer.observe(s));
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lazyLoadSections);
    else lazyLoadSections();

})();
