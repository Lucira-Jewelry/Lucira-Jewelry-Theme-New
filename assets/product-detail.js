document.addEventListener("DOMContentLoaded", function () {
  const container = document.querySelector("#pdp-delivery-check");
  if (!container) return;

  const submitBtn = container.querySelector(".lucira-delivery-input-container button");
  const pincodeInput = document.querySelector("#lucira-delivery-zipcode");

  const deliveryDays = Number(container.getAttribute("data-delivery-days")) || 4;
  const productSku = container.getAttribute("data-product-sku");
  const productTitle = container.getAttribute("data-product-title");

  if (pincodeInput) {
    pincodeInput.addEventListener("input", () => {
      submitBtn.disabled = pincodeInput.value.trim().length === 0;
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", function () {
      const pincode = pincodeInput?.value?.trim();
      if (!pincode || submitBtn.disabled) return;

      // Push to GTM
      const productData = {
        promo_id: productSku,
        promo_name: productTitle,
        creative_name: "pincodeEntered",
        promo_position: pincode,
        pincode: pincode
      };

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "promoClick",
        promoClick: productData
      });

      // Add +2 buffer days
      const totalDays = deliveryDays + 2;

      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + totalDays);

      const formattedDate = deliveryDate.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });

      const deliveryTextElement = document.querySelector(".lucira-delivery-time");
      if (deliveryTextElement) {
        deliveryTextElement.innerHTML = `Dispatch by <span style="color:#147217;font-weight:bold;">${formattedDate}</span>`;
      }

      const deliveryHint = document.querySelector(".lucira-delivery-text");
      if (deliveryHint) deliveryHint.style.display = "none";
    });
  }
});