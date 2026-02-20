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

function decodeHtmlEntities(str) {
  if (!str) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

window.handleGTMProductCardClick = function(event) {
  event.preventDefault();
  const target = event.currentTarget;

  console.log("Product card clicked");
  console.log("Data attributes:", target.dataset);

  const productData = {
    event: "select_item", // GA4 standard event name
    ecommerce: {
      items: [
        {
          item_id: target.dataset.productId,
          item_variant: target.dataset.variantId,
          sku: target.dataset.sku,
          item_name: decodeHtmlEntities(target.dataset.productName),
          item_category: target.dataset.productCategory,
          item_category2: target.dataset.category,
          item_category3: target.dataset.subCategory,
          item_type: target.dataset.productType,
          price: Number(target.dataset.price) || 0,
          discount_price: Number(target.dataset.offerPrice) || 0,
          index: target.dataset.indexPosition,
          item_brand: "Lucira", // optional
          item_list_name: "Product Listing",
          thumbnail: target.dataset.thumbnailImage,
          purity: target.dataset.purity,
          making_charges: target.dataset.makingCharges,
          rating: target.dataset.rating,
          reviews: target.dataset.numberOfReview,
          coupon: target.dataset.couponCode,
          expected_delivery: target.dataset.expectedDeliveryDate
        }
      ]
    }
  };

  window.dataLayer = window.dataLayer || [];
  console.log("Pushing to dataLayer:", productData);
  window.dataLayer.push(productData);

  // small delay ensures GTM reads the push
  setTimeout(() => {
    window.location.href = target.href;
  }, 200);
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