class CartDrawer extends HTMLElement {
  constructor() {
    super();

    // Initialize event listeners
    this.addEventListener("keyup", (evt) => evt.code === "Escape" && this.close());
    this.querySelector("#CartDrawer-Overlay")?.addEventListener("click", this.close.bind(this));
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
          window.dataLayer.push({ ...cartData });
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

    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute("role")) {
      this.setSummaryAccessibility(cartDrawerNote);
    }

    const overlay = this.querySelector("#CartDrawer-Overlay");
    if (overlay) overlay.classList.add("active");

    setTimeout(() => {
      this.classList.add("animate", "active");
    }, 10);

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

    document.body.classList.add("overflow-hidden");
  }

  close() {
    this.classList.remove("active");
    const overlay = this.querySelector("#CartDrawer-Overlay");
    if (overlay) overlay.classList.remove("active");
    removeTrapFocus(this.activeElement);
    document.body.classList.remove("overflow-hidden");
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
    const drawerInner = this.querySelector(".drawer__inner");
    if (drawerInner?.classList.contains("is-empty")) {
      drawerInner.classList.remove("is-empty");
    }

    this.productId = parsedState.id;

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

    setTimeout(() => {
      this.querySelector("#CartDrawer-Overlay")?.addEventListener(
        "click",
        this.close.bind(this)
      );
    }, 50);
  }

  getSectionInnerHTML(html, selector = ".shopify-section") {
    return (
      new DOMParser().parseFromString(html, "text/html").querySelector(selector)
        ?.innerHTML || ""
    );
  }

  getSectionsToRender() {
    return [
      { id: "cart-drawer", selector: "#CartDrawer" },
      { id: "cart-icon-bubble" },
    ];
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
}

customElements.define("cart-drawer-items", CartDrawerItems);

document.addEventListener("DOMContentLoaded", () => {
  const cartDrawerEl = document.querySelector("cart-drawer");
  if (!cartDrawerEl) return;

  document.body.addEventListener("submit", async (e) => {
    const form = e.target;
    if (!form.matches('form[action^="/cart/add"]')) return;

    e.preventDefault();
    const formData = new FormData(form);

    try {
      await fetch("/cart/add.js", {
        method: "POST",
        body: formData,
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      const res = await fetch("/cart?section_id=cart-drawer");
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const newDrawer = doc.querySelector("cart-drawer");

      if (newDrawer) {
        cartDrawerEl.innerHTML = newDrawer.innerHTML;
        cartDrawerEl.open();
      }
    } catch (error) {
      console.error("Add to cart failed:", error);
    }
  });
});

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
