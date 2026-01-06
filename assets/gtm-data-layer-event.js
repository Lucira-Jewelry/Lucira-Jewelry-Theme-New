// Promo Click data layer insertion
// function handleGTMPromoBannerClick(event) {
//   event.preventDefault();
//   const target = event.currentTarget;

// window.dataLayer.push({
//   event: 'promoClick',
//   promoClick: 
//     {
//       promo_id: target.dataset.promoId,          
//       promo_name: target.dataset.promoName,       
//       creative_name: 'homepage_banner',          
//       promo_position: 'homepage_top'             
//     }
  
// });

// window.location.assign(target.href);
// }
window.handleGTMProductCardClick = function(event) {
  event.preventDefault();
  const target = event.currentTarget;

  console.log("Product card clicked");
  console.log("Data attributes:", target.dataset);

  const productData = {
    event: "productClick",
    products:{
    productId: target.dataset.productId,
    variantId: target.dataset.variantId,
    sku: target.dataset.sku,
    productName: target.dataset.productName,
    productType: target.dataset.productType,
    productCategory: target.dataset.productCategory,
    category: target.dataset.category,
    subCategory: target.dataset.subCategory,
    productUrl: target.dataset.productUrl,
    thumbnailImage: target.dataset.thumbnailImage,
    purity: target.dataset.purity,
    price: target.dataset.price,
    offerPrice: target.dataset.offerPrice,
    expectedDeliveryDate: target.dataset.expectedDeliveryDate,
    couponCode: target.dataset.couponCode,
    makingCharges: target.dataset.makingCharges,
    numberOfReview: target.dataset.numberOfReview,
    rating: target.dataset.rating,
    indexPosition: target.dataset.indexPosition
    }
  };

  window.dataLayer = window.dataLayer || [];
  console.log("Pushing to dataLayer:", productData);
  window.dataLayer.push(productData);

  setTimeout(function() {
    window.location.href = target.href;
  }, 300);
};

function handleGTMAddToCartSubmit(event) {
  let productData = window.dataLayer.find(
    (item) => item.event === "productView"
  );

  // window.dataLayer.push({
  //   event: "addToCart",
  //   products:{
  //   productId: productData.productId,
  //   variantId: productData.variantId,
  //   sku: productData.sku,
  //   productName: productData.productName,
  //   productType: productData.productType,
  //   price: productData.price,
  //   currency: productData.currency,
  //   quantity: 1,
  //   image: productData.image,
  //   category: productData.category,
  //   subCategory: productData.subCategory,
  //   productPersona: productData.productPersona,
  //   codStatus: productData.codStatus,
  //   emiStatus: productData.emiStatus,
  //   engrave: productData.engrave,
  //   }
  // });
}

function handleGTMViewCart() {
  const cartData = JSON.parse(document.getElementById("cart-information").textContent);

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    ...cartData,
  });
};

// function handleGTMBeginCheckout(event) {
//   event.preventDefault();
//   console.log("hello")
//   const cartData = JSON.parse(document.getElementById("cart-information").textContent);
//   const checkoutData = JSON.parse(document.getElementById("checkout-information").textContent);

  // window.dataLayer = window.dataLayer || [];
  // window.dataLayer.push({
   
  //   event: 'beginCheckout',
  //    ...cartData,
  //   ...checkoutData,
  // });
  // console.log("world")
  
  
//}

function handleGTMNewsletterSubscription(event) {
  const form = event.target;
  const formData = new FormData(form);
  const email = formData.get("contact[email]")

 window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'newsletterSubscription',
    newsletter:{
        email,
    }
   
  })
  console.log(window.dataLayer);
}