/**
 * Collection Page Custom Logic & Tracking
 */

(function() {
    window.addEventListener('DOMContentLoaded', function () {
        const collectionUrl = window.location.pathname;
        const collectionTitle = document.querySelector('.collection-hero__title')?.textContent?.trim() || '';
        if (collectionUrl) sessionStorage.setItem('lastCollectionUrl', collectionUrl);
        if (collectionTitle) sessionStorage.setItem('lastCollectionTitle', collectionTitle);
    });

    // Product Click Tracking
    if (!window.__gtmProductClickBound) {
        window.__gtmProductClickBound = true;
        document.addEventListener('click', function (event) {
            const link = event.target.closest('.product-image-link.custom-image-link');
            if (!link) return;

            event.preventDefault();
            const productData = {
                event: 'productClick',
                products: {
                    productId: link.dataset.productId,
                    variantId: link.dataset.variantId,
                    sku: link.dataset.sku,
                    productName: link.dataset.productName,
                    productType: link.dataset.productType,
                    productCategory: link.dataset.productCategory,
                    category: link.dataset.category,
                    subCategory: link.dataset.subCategory,
                    productUrl: link.dataset.productUrl || link.href,
                    thumbnailImage: link.dataset.thumbnailImage,
                    purity: link.dataset.purity,
                    price: link.dataset.price,
                    offerPrice: link.dataset.offerPrice,
                    expectedDeliveryDate: link.dataset.expectedDeliveryDate,
                    couponCode: link.dataset.couponCode,
                    makingCharges: link.dataset.makingCharges,
                    numberOfReview: link.dataset.numberOfReview,
                    rating: link.dataset.rating,
                    indexPosition: link.dataset.indexPosition,
                },
            };

            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push(productData);

            setTimeout(() => {
                window.location.href = link.href;
            }, 250);
        });
    }

    // Product Impression Tracking
    window.initCollectionImpressions = function(products) {
        if (!products || !products.length) return;
        window.dataLayer = window.dataLayer || [];
        // Filter out any products with missing essential details
        const validProducts = products.filter(p => p.item_id && p.item_name && p.price != null);

        // Push to dataLayer asynchronously
        setTimeout(() => {
            window.dataLayer.push({
                event: 'productImpression',
                products: validProducts
            });
        }, 500);
    };
})();
