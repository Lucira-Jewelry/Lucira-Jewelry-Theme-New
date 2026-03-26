(function () {
  // Safe DataLayer init once
  window.dataLayer = window.dataLayer || [];

  // Optimized query param getter
  function getParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  // Capture UTM params (only if exist)
  ["utm_source", "utm_medium", "utm_campaign"].forEach(param => {
    const value = getParam(param);
    if (value) {
      localStorage.setItem(param, value);
    }
  });

  // Push UTM once
  dataLayer.push({
    event: "utm_capture",
    utm_source: localStorage.getItem("utm_source") || null,
    utm_medium: localStorage.getItem("utm_medium") || null,
    utm_campaign: localStorage.getItem("utm_campaign") || null
  });

  // Product click tracking
  // window.handleGTMProductCardClick = function (event) {
  //   event.preventDefault();
  //   const target = event.currentTarget;
  //   const d = target.dataset;

  //   dataLayer.push({
  //     event: "productClick",
  //     products: {
  //       productId: d.productId,
  //       variantId: d.variantId,
  //       sku: d.sku,
  //       productName: d.productName,
  //       productType: d.productType,
  //       productCategory: d.productCategory,
  //       category: d.category,
  //       subCategory: d.subCategory,
  //       productUrl: d.productUrl,
  //       thumbnailImage: d.thumbnailImage,
  //       purity: d.purity,
  //       price: d.price,
  //       offerPrice: d.offerPrice,
  //       expectedDeliveryDate: d.expectedDeliveryDate,
  //       couponCode: d.couponCode,
  //       makingCharges: d.makingCharges,
  //       numberOfReview: d.numberOfReview,
  //       rating: d.rating,
  //       indexPosition: d.indexPosition
  //     }
  //   });

  //   // Faster redirect (no blocking timeout)
  //   requestAnimationFrame(() => { window.location.href = target.href; });
  // };








  // Add to cart (stub) do not delete
  window.handleGTMAddToCartSubmit = function () {
    const productData = dataLayer.find(i => i.event === "productView");
    if (!productData) return;

    dataLayer.push({
      event: "addToCart",
      products: { ...productData, quantity: 1 }
    });
  };






  

  // View cart
  window.handleGTMViewCart = function () {
    try {
      const cartInfo = document.getElementById("cart-information");
      if (!cartInfo) return;
      const cartData = JSON.parse(cartInfo.textContent);
      dataLayer.push(cartData);
    } catch (e) {
      console.warn("Cart data not available", e);
    }
  };

  // Newsletter subscription
  window.handleGTMNewsletterSubscription = function (event) {
    const email = new FormData(event.target).get("contact[email]");
    if (email) {
      dataLayer.push({ event: "newsletterSubscription", newsletter: { email } });
    }
  };
})();