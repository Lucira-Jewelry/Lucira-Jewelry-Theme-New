class CartDrawer extends HTMLElement {
  constructor() {
    super();

    // Initialize event listeners
    this.addEventListener(
      "keyup",
      (evt) => evt.code === "Escape" && this.close()
    );
    this.querySelector("#CartDrawer-Overlay")?.addEventListener(
      "click",
      this.close.bind(this)
    );
    this.setHeaderCartIconAccessibility();
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector("#cart-icon-bubble");
    if (!cartLink) return;

    cartLink.setAttribute("role", "button");
    cartLink.setAttribute("aria-haspopup", "dialog");
    cartLink.addEventListener("click", (event) => {
      event.preventDefault();

      // Push cart data to dataLayer if available
      const cartInfo = document.getElementById("cart-information");
      if (cartInfo) {
        try {
          const cartData = JSON.parse(cartInfo.textContent);
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            ...cartData,
          });
        } catch (e) {
          console.error("Error parsing cart information:", e);
        }
      }

      this.open(cartLink);
    });

    cartLink.addEventListener("keydown", (event) => {
      if (event.code.toUpperCase() === "SPACE") {
        event.preventDefault();
        this.open(cartLink);
      }
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);

    // Set up accessibility for cart drawer note if exists
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute("role")) {
      this.setSummaryAccessibility(cartDrawerNote);
    }

    // Activate overlay and drawer
    const overlay = this.querySelector("#CartDrawer-Overlay");
    if (overlay) overlay.classList.add("active");

    // Add slight delay to ensure animation triggers
    setTimeout(() => {
      this.classList.add("animate", "active");
    }, 10);

    // Set up focus trapping after transition ends
    this.addEventListener(
      "transitionend",
      () => {
        const containerToTrapFocusOn = this.classList.contains("is-empty")
          ? this.querySelector(".drawer__inner-empty")
          : document.getElementById("CartDrawer");
        const focusElement =
          this.querySelector(".drawer__inner") ||
          this.querySelector(".drawer__close");
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );

    // Disable page scrolling
    document.body.classList.add("overflow-hidden");

    // Trigger cross-selling animation with delay for smooth opening
    setTimeout(() => {
      this.activateCrossSelling();
    }, 200);
  }

  close() {
    this.classList.remove("active");

    // Deactivate overlay
    const overlay = this.querySelector("#CartDrawer-Overlay");
    if (overlay) overlay.classList.remove("active");

    // Deactivate cross-selling
    this.deactivateCrossSelling();

    // Restore focus and enable scrolling
    removeTrapFocus(this.activeElement);
    document.body.classList.remove("overflow-hidden");
  }

  activateCrossSelling() {
    const youMayAlsoLike = this.querySelector(".you-may-also-like-wrapper");
    const youMayAlsoLikeMobile = this.querySelector(
      ".you-may-also-like-wrapper-mobile"
    );

    if (youMayAlsoLike) {
      youMayAlsoLike.style.display = "block"; // Ensure it's visible
      setTimeout(() => {
        youMayAlsoLike.classList.add("active");
        // Attach event listeners specifically for desktop
        this.attachDesktopRecommendationListeners();
      }, 300);
    }

    if (youMayAlsoLikeMobile) {
      setTimeout(() => {
        youMayAlsoLikeMobile.style.display = "block";
        youMayAlsoLikeMobile.classList.add("active");
      }, 300);
    }
  }

  attachDesktopRecommendationListeners() {
    const desktopWrapper = this.querySelector(".you-may-also-like-wrapper");
    if (!desktopWrapper) return;

    desktopWrapper
      .querySelectorAll(".you-may-also-like-add-button")
      .forEach((button) => {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          handleRecommendationAddToCart(button);
        });
      });
  }

  deactivateCrossSelling() {
    const youMayAlsoLike = this.querySelector(".you-may-also-like-wrapper");
    const youMayAlsoLikeMobile = this.querySelector(
      ".you-may-also-like-wrapper-mobile"
    );

    if (youMayAlsoLike) {
      youMayAlsoLike.classList.remove("active");
    }

    if (youMayAlsoLikeMobile) {
      youMayAlsoLikeMobile.classList.remove("active");
    }
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute("role", "button");
    cartDrawerNote.setAttribute("aria-expanded", "false");

    if (cartDrawerNote.nextElementSibling?.getAttribute("id")) {
      cartDrawerNote.setAttribute(
        "aria-controls",
        cartDrawerNote.nextElementSibling.id
      );
    }

    cartDrawerNote.addEventListener("click", (event) => {
      event.currentTarget.setAttribute(
        "aria-expanded",
        !event.currentTarget.closest("details").hasAttribute("open")
      );
    });

    cartDrawerNote.parentElement.addEventListener("keyup", onKeyUpEscape);
  }

  renderContents(parsedState) {
    // Remove empty state if present
    const drawerInner = this.querySelector(".drawer__inner");
    if (drawerInner?.classList.contains("is-empty")) {
      drawerInner.classList.remove("is-empty");
    }

    this.productId = parsedState.id;

    // Store current recommendations state before update
    const currentRecommendations = this.preserveRecommendationsState();

    // Update all relevant sections
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);

      if (!sectionElement) return;

      const newHTML = this.getSectionInnerHTML(
        parsedState.sections[section.id],
        section.selector
      );
      sectionElement.innerHTML = newHTML;
    });

    // Reinitialize event listeners after content update
    setTimeout(() => {
      this.querySelector("#CartDrawer-Overlay")?.addEventListener(
        "click",
        this.close.bind(this)
      );

      // Restore recommendations with smooth transition
      this.restoreRecommendationsState(currentRecommendations);
    }, 50);
  }

  preserveRecommendationsState() {
    const desktopWrapper = this.querySelector(".you-may-also-like-wrapper");
    const mobileWrapper = this.querySelector(
      ".you-may-also-like-wrapper-mobile"
    );

    return {
      desktopActive: desktopWrapper?.classList.contains("active") || false,
      mobileActive: mobileWrapper?.classList.contains("active") || false,
      mobileVisible: mobileWrapper?.style.display !== "none",
    };
  }

  restoreRecommendationsState(state) {
    if (!state) return;

    const desktopWrapper = this.querySelector(".you-may-also-like-wrapper");
    const mobileWrapper = this.querySelector(
      ".you-may-also-like-wrapper-mobile"
    );

    if (desktopWrapper && state.desktopActive) {
      setTimeout(() => {
        desktopWrapper.classList.add("active");
      }, 100);
    }

    if (mobileWrapper) {
      if (state.mobileVisible) {
        mobileWrapper.style.display = "block";
      }
      if (state.mobileActive) {
        setTimeout(() => {
          mobileWrapper.classList.add("active");
        }, 100);
      }
    }
  }

  getSectionInnerHTML(html, selector = ".shopify-section") {
    return (
      new DOMParser().parseFromString(html, "text/html").querySelector(selector)
        ?.innerHTML || ""
    );
  }

  getSectionsToRender() {
    return [
      {
        id: "cart-drawer",
        selector: "#CartDrawer",
      },
      {
        id: "cart-icon-bubble",
      },
    ];
  }

  getSectionDOM(html, selector = ".shopify-section") {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define("cart-drawer", CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: "CartDrawer",
        section: "cart-drawer",
        selector: ".drawer__inner",
      },
      {
        id: "cart-icon-bubble",
        section: "cart-icon-bubble",
        selector: ".shopify-section",
      },
    ];
  }

  // Override the updateLiveRegions method to handle cross-selling updates
  updateLiveRegions(line, itemCount) {
    const result = super.updateLiveRegions(line, itemCount);

    // Update cross-selling after any cart change - REMOVED SMOOTH TRANSITION
    setTimeout(() => {
      this.updateCrossSellingSmooth();
    }, 100);

    return result;
  }

  // Updated method to update cross-selling without flickering transitions
  updateCrossSellingSmooth() {
    const cartDrawer = document.querySelector("cart-drawer");
    if (!cartDrawer) return;

    // Get current cart data
    fetch("/cart.js")
      .then((response) => response.json())
      .then((cart) => {
        this.updateRecommendations(cart, cartDrawer);
      })
      .catch((error) => console.error("Error updating cross-selling:", error));
  }

  // FIXED: Removed smooth transitions that caused flickering
  updateRecommendations(cart, cartDrawer) {
    const desktopWrapper = cartDrawer.querySelector(
      ".you-may-also-like-wrapper"
    );
    const mobileWrapper = cartDrawer.querySelector(
      ".you-may-also-like-wrapper-mobile"
    );

    if (cart.item_count === 0) {
      // Instant hide for empty cart - NO SMOOTH TRANSITIONS
      if (desktopWrapper) {
        desktopWrapper.classList.remove("active");
        desktopWrapper.style.display = "none";
      }
      if (mobileWrapper) {
        mobileWrapper.classList.remove("active");
        mobileWrapper.style.display = "none";
      }
      return;
    }

    // If cart has items, fetch fresh recommendations to maintain 6 products
    this.fetchAndUpdateRecommendations(cart, cartDrawer);
  }

  // FIXED: Removed opacity transitions that caused flickering
  fetchAndUpdateRecommendations(cart, cartDrawer) {
    // Fetch the latest section to ensure we have all 6 products
    fetch("/?section_id=cart-drawer")
      .then((response) => response.text())
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Update desktop recommendations - NO OPACITY TRANSITIONS
        const newDesktopSection = doc.querySelector(
          ".you-may-also-like-wrapper"
        );
        const currentDesktopSection = cartDrawer.querySelector(
          ".you-may-also-like-wrapper"
        );

        if (newDesktopSection && currentDesktopSection) {
          // Preserve active state during update
          const wasActive = currentDesktopSection.classList.contains("active");

          // Direct update without opacity transitions
          currentDesktopSection.innerHTML = newDesktopSection.innerHTML;
          currentDesktopSection.style.display = "block";

          // Restore active state immediately
          if (wasActive) {
            currentDesktopSection.classList.add("active");
          }

          // Filter and show appropriate products (maintain 6 products)
          this.filterRecommendations(cart, currentDesktopSection, 6);
        }

        // Update mobile recommendations - NO OPACITY TRANSITIONS
        const newMobileSection = doc.querySelector(
          ".you-may-also-like-wrapper-mobile"
        );
        const currentMobileSection = cartDrawer.querySelector(
          ".you-may-also-like-wrapper-mobile"
        );

        if (newMobileSection && currentMobileSection) {
          // Preserve active state during update
          const wasActive = currentMobileSection.classList.contains("active");
          const wasVisible = currentMobileSection.style.display !== "none";

          // Direct update without opacity transitions
          currentMobileSection.innerHTML = newMobileSection.innerHTML;

          if (wasVisible) {
            currentMobileSection.style.display = "block";
          }

          // Restore active state immediately
          if (wasActive) {
            currentMobileSection.classList.add("active");
          }

          // Filter and show appropriate products (maintain 6 products)
          this.filterRecommendations(cart, currentMobileSection, 6);
        }

        // Re-attach event listeners
        setTimeout(() => {
          this.attachRecommendationListeners();
        }, 50);
      })
      .catch((error) =>
        console.error("Error fetching recommendations:", error)
      );
  }

  filterRecommendations(cart, wrapper, maxProducts = 6) {
    if (!wrapper) return;

    // Get current cart product handles/IDs
    const cartProductHandles = cart.items.map((item) => item.handle);
    const cartProductIds = cart.items.map((item) => item.product_id);

    // Get all recommendation items
    const recommendationItems = wrapper.querySelectorAll(
      ".you-may-also-like-item"
    );
    let visibleCount = 0;

    recommendationItems.forEach((item) => {
      const link = item.querySelector("a");
      if (link && visibleCount < maxProducts) {
        const href = link.getAttribute("href");
        if (href) {
          // Extract product handle from URL
          const urlParts = href.split("/");
          const productHandle = urlParts[urlParts.length - 1];

          // Check if this product is already in cart
          const isInCart = cartProductHandles.includes(productHandle);

          if (!isInCart) {
            item.style.display = "block";
            // REMOVED: item.style.opacity = "1"; - this was causing flickering
            visibleCount++;
          } else {
            item.style.display = "none";
          }
        }
      } else if (visibleCount >= maxProducts) {
        // Hide extra items beyond the limit
        item.style.display = "none";
      }
    });

    // Show wrapper if we have visible products - NO SMOOTH TRANSITIONS
    if (visibleCount > 0) {
      wrapper.style.display = "block";
      wrapper.classList.add("active"); // Immediate activation
    } else {
      wrapper.classList.remove("active");
      wrapper.style.display = "none"; // Immediate hide
    }
  }

  attachRecommendationListeners() {
    // Use event delegation instead of direct attachment to prevent duplicates
    // This is handled by the global event listener below
  }

  // Method to fetch and update the entire cart drawer
  fetchAndUpdateCartDrawer() {
    fetch("/cart?section_id=cart-drawer")
      .then((response) => response.text())
      .then((html) => {
        const cartDrawer = document.querySelector("cart-drawer");
        if (cartDrawer) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const newContent = doc.querySelector("cart-drawer");

          if (newContent) {
            // Store current state
            const currentState = cartDrawer.preserveRecommendationsState();

            // Replace the content while preserving the outer element
            cartDrawer.innerHTML = newContent.innerHTML;

            // Restore state immediately - NO SMOOTH TRANSITIONS
            cartDrawer.restoreRecommendationsState(currentState);
          }
        }
      })
      .catch((error) => console.error("Error fetching cart drawer:", error));
  }
}

customElements.define("cart-drawer-items", CartDrawerItems);

// Enhanced global event handling - REMOVED SMOOTH ANIMATIONS THAT CAUSED FLICKERING
(function () {
  "use strict";

  let isRefreshing = false;
  let refreshTimeout = null;

  // Enhanced event delegation for recommendation buttons
  document.addEventListener("click", function (event) {
    const target = event.target;
    const button = target.closest(
      ".you-may-also-like-add-button, .you-may-also-like-add-button-mobile"
    );

    if (button) {
      event.preventDefault();
      event.stopPropagation();
      handleRecommendationAddToCart(button);
    }
  });

  function handleRecommendationAddToCart(button) {
    const variantId = button.dataset.variantId;
    if (!variantId) {
      console.error("No variant ID found");
      return;
    }

    // Get the product item container to remove it after adding
    const productItem = button.closest(".you-may-also-like-item");

    // Button state transitions - KEEP THESE AS THEY DON'T AFFECT BACKGROUND
    button.disabled = true;
    const originalText = button.textContent;

    // Add loading animation class if available
    button.classList.add("loading");
    button.textContent = "Adding...";

    fetch("/cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        id: variantId,
        quantity: 1,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Product added to cart:", data);

        // Show success state
        button.classList.remove("loading");
        button.classList.add("success");
        button.textContent = "Added!";

        // FIXED: Remove product immediately without smooth transitions
        setTimeout(() => {
          removeAndRefillRecommendation(productItem, data);
        }, 500); // Reduced delay

        // Update cart drawer content
        debouncedRefreshCartDrawer();
      })
      .catch((error) => {
        console.error("Error adding to cart:", error);
        button.classList.remove("loading");
        button.classList.add("error");
        button.textContent = "Error";

        setTimeout(() => {
          if (button && button.parentNode) {
            button.classList.remove("error");
            button.textContent = originalText;
            button.disabled = false;
          }
        }, 2000);
      });
  }

  // FIXED: Removed smooth debouncing that caused multiple updates
  function debouncedRefreshCartDrawer() {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }

    refreshTimeout = setTimeout(() => {
      if (!isRefreshing) {
        refreshCartDrawer(); // Direct call without smooth transitions
      }
    }, 100); // Reduced delay
  }

  // FIXED: Remove product immediately without fade transitions
  function removeAndRefillRecommendation(productItem, addedProductData) {
    if (!productItem) return;

    // Get the wrapper (desktop or mobile)
    const wrapper = productItem.closest(
      ".you-may-also-like-wrapper, .you-may-also-like-wrapper-mobile"
    );
    if (!wrapper) return;

    // FIXED: Remove immediately without transitions
    productItem.remove();

    // Fetch fresh recommendations to refill
    fetchAndRefillRecommendations(wrapper);
  }

  function fetchAndRefillRecommendations(wrapper) {
    // Determine if this is mobile or desktop wrapper
    const isMobile = wrapper.classList.contains(
      "you-may-also-like-wrapper-mobile"
    );

    // Force refresh the entire cart drawer section to get updated recommendations
    fetch("/cart?section_id=cart-drawer")
      .then((response) => response.text())
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Get the fresh recommendations section from the full cart drawer response
        const sectionClass = isMobile
          ? ".you-may-also-like-wrapper-mobile"
          : ".you-may-also-like-wrapper";
        const freshSection = doc.querySelector(sectionClass);

        if (freshSection) {
          // Get current cart to filter out products already in cart
          return fetch("/cart.js")
            .then((response) => response.json())
            .then((cart) => {
              refillRecommendationSlot(wrapper, freshSection, cart, isMobile);
            });
        } else {
          console.log("No fresh section found, trying alternative approach");
          // Alternative: try to get recommendations from a different endpoint
          tryAlternativeRefill(wrapper, isMobile);
        }
      })
      .catch((error) => {
        console.error("Error fetching fresh recommendations:", error);
        // Fallback: try alternative refill method
        tryAlternativeRefill(wrapper, isMobile);
      });
  }

  // FIXED: Remove smooth animations from refill process
  function refillRecommendationSlot(wrapper, freshSection, cart, isMobile) {
    const cartHandles = cart.items.map((item) => item.handle);
    const cartProductIds = cart.items.map((item) => item.product_id);

    // Get all fresh items from the new section
    const freshItems = Array.from(
      freshSection.querySelectorAll(
        isMobile ? ".you-may-also-like-item-mobile" : ".you-may-also-like-item"
      )
    );

    // Get current visible items in the wrapper
    const currentItems = Array.from(
      wrapper.querySelectorAll(
        isMobile ? ".you-may-also-like-item-mobile" : ".you-may-also-like-item"
      )
    );

    // Find current product IDs to avoid duplicates
    const currentProductIds = currentItems
      .map((item) => {
        return item.dataset.productId ? parseInt(item.dataset.productId) : null;
      })
      .filter(Boolean);

    // Prioritize matching products first
    const matchingProducts = freshItems.filter((item) => {
      return item.closest(".matching-you-may-also-like-wrapper") !== null;
    });

    // Then regular recommendations
    const regularProducts = freshItems.filter((item) => {
      return item.closest(".matching-you-may-also-like-wrapper") === null;
    });

    // Combine with matching products first
    const prioritizedFreshItems = [...matchingProducts, ...regularProducts];

    // Find a fresh item that's not in cart and not already displayed
    const availableFreshItem = prioritizedFreshItems.find((item) => {
      const productId = item.dataset.productId
        ? parseInt(item.dataset.productId)
        : null;
      if (!productId) return false;

      // Check if product is in cart
      const inCart = cartProductIds.includes(productId);

      // Check if product is already displayed
      const alreadyDisplayed = currentProductIds.includes(productId);

      return !inCart && !alreadyDisplayed;
    });

    if (availableFreshItem && currentItems.length < 6) {
      // Clone the fresh item and add it immediately - NO ANIMATIONS
      const newItem = availableFreshItem.cloneNode(true);

      // Add to the container immediately
      const container = wrapper.querySelector(
        isMobile
          ? ".you-may-also-like-container-mobile"
          : ".you-may-also-like-container"
      );
      if (container) {
        // If this is a matching product, ensure it goes to the matching section
        const isMatchingProduct =
          availableFreshItem.closest(".matching-you-may-also-like-wrapper") !==
          null;
        let targetContainer = container;

        if (isMatchingProduct) {
          const matchingWrapper = container.querySelector(
            ".matching-you-may-also-like-wrapper"
          );
          if (matchingWrapper) {
            targetContainer = matchingWrapper;
          }
        }

        targetContainer.appendChild(newItem);

        // Reattach event listener to the new button immediately
        const button = newItem.querySelector(
          isMobile
            ? ".you-may-also-like-add-button-mobile"
            : ".you-may-also-like-add-button"
        );
        if (button) {
          button.addEventListener("click", function (e) {
            e.preventDefault();
            handleRecommendationAddToCart(button);
          });
        }
      }
    } else {
      console.log("No suitable fresh items found or limit reached");
      tryAlternativeRefill(wrapper, isMobile);
    }
  }

  // FIXED: Remove smooth animations from alternative refill
  function tryAlternativeRefill(wrapper, isMobile) {
    // Get all hidden items in the current wrapper, prioritizing matching products
    const allHiddenItems = Array.from(
      wrapper.querySelectorAll(
        isMobile
          ? '.you-may-also-like-item-mobile[style*="display: none"], .you-may-also-like-item-mobile[style*="display:none"]'
          : '.you-may-also-like-item[style*="display: none"], .you-may-also-like-item[style*="display:none"]'
      )
    );

    // Separate matching products from regular ones
    const matchingHiddenItems = allHiddenItems.filter(
      (item) => item.closest(".matching-you-may-also-like-wrapper") !== null
    );
    const regularHiddenItems = allHiddenItems.filter(
      (item) => item.closest(".matching-you-may-also-like-wrapper") === null
    );

    // Combine with matching products first
    const prioritizedHiddenItems = [
      ...matchingHiddenItems,
      ...regularHiddenItems,
    ];

    if (prioritizedHiddenItems.length > 0) {
      // Get current cart to check which products to avoid
      fetch("/cart.js")
        .then((response) => response.json())
        .then((cart) => {
          const cartProductIds = cart.items.map((item) => item.product_id);

          // Find a hidden item that's not in cart, checking matching products first
          const availableHiddenItem = prioritizedHiddenItems.find((item) => {
            const productId = item.dataset.productId
              ? parseInt(item.dataset.productId)
              : null;
            return productId && !cartProductIds.includes(productId);
          });

          if (availableHiddenItem) {
            // Show the hidden item immediately - NO ANIMATIONS
            availableHiddenItem.style.display = "block";
          } else {
            console.log("No suitable hidden items found for refill");
          }
        })
        .catch((error) => console.error("Error in alternative refill:", error));
    } else {
      console.log("No hidden items available for refill");
    }
  }

  // FIXED: Direct cart drawer refresh without smooth transitions
  function refreshCartDrawer() {
    if (isRefreshing) return;

    isRefreshing = true;

    const currentCartDrawer = document.querySelector("cart-drawer");
    if (!currentCartDrawer) {
      isRefreshing = false;
      return;
    }

    // Store current state before refresh
    const currentState = {
      isOpen: currentCartDrawer.classList.contains("active"),
      recommendationsState:
        currentCartDrawer.preserveRecommendationsState?.() || {},
    };

    fetch("/?section_id=cart-drawer")
      .then((response) => response.text())
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const newCartDrawer = doc.querySelector("cart-drawer");

        if (newCartDrawer && currentCartDrawer) {
          // Direct content update - NO OPACITY TRANSITIONS
          const cartContent = currentCartDrawer.querySelector("#CartDrawer");
          const newCartContent = newCartDrawer.querySelector("#CartDrawer");

          if (cartContent && newCartContent) {
            // Direct update without fade
            cartContent.innerHTML = newCartContent.innerHTML;

            // Restore drawer state immediately
            if (currentState.isOpen) {
              currentCartDrawer.classList.add("active");
              document.body.classList.add("overflow-hidden");

              // Restore recommendations immediately
              const desktopWrapper = currentCartDrawer.querySelector(
                ".you-may-also-like-wrapper"
              );
              const mobileWrapper = currentCartDrawer.querySelector(
                ".you-may-also-like-wrapper-mobile"
              );

              if (
                desktopWrapper &&
                currentState.recommendationsState.desktopActive
              ) {
                desktopWrapper.style.display = "block";
                desktopWrapper.classList.add("active");
              }

              if (
                mobileWrapper &&
                currentState.recommendationsState.mobileVisible
              ) {
                mobileWrapper.style.display = "block";
                if (currentState.recommendationsState.mobileActive) {
                  mobileWrapper.classList.add("active");
                }
              }
            }
          }
        }
        
        isRefreshing = false;
      })
      .catch((error) => {
        console.error("Error refreshing cart drawer:", error);
        isRefreshing = false;
      });
  }

  // Enhanced cart event listeners
  let lastCartUpdate = 0;

  document.addEventListener("cart:updated", function (event) {
    const now = Date.now();
    if (now - lastCartUpdate > 500) { // Reduced delay
      lastCartUpdate = now;
      debouncedRefreshCartDrawer();
    }
  });

  document.addEventListener("cart:changed", function (event) {
    const now = Date.now();
    if (now - lastCartUpdate > 500) { // Reduced delay
      lastCartUpdate = now;
      debouncedRefreshCartDrawer();
    }
  });

  // Show recommendations when cart drawer opens
  document.addEventListener("click", function (event) {
    if (
      event.target.matches('[href="#cart-drawer"], .cart-icon, .cart-link') ||
      event.target.closest('[href="#cart-drawer"], .cart-icon, .cart-link')
    ) {
      setTimeout(() => {
        const cartDrawer = document.querySelector("cart-drawer");
        if (cartDrawer) {
          cartDrawer.activateCrossSelling();
        }
      }, 400);
    }
  });
})();



// Helper functions
function trapFocus(element, focusElement = null) {
  // Implementation of focus trapping
}

function removeTrapFocus(elementToFocus = null) {
  // Implementation of focus release
}

function onKeyUpEscape(event) {
  // Implementation of escape key handler
}