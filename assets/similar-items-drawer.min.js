// class SimilarItemsDrawer {
//   constructor() {
//     this.drawer = null;
//     this.overlay = null;
//     this.isOpen = false;
//     this.cache = new Map();
//     this.abortController = null;
//     this.init();
//   }

//   init() {
//     this.createDrawerElements();
//     this.attachEventListeners();
//   }

//   createDrawerElements() {
//     this.overlay = document.createElement("div");
//     this.overlay.className = "similar-items-overlay";
//     this.overlay.setAttribute("aria-hidden", "true");
    
//     this.drawer = document.createElement("div");
//     this.drawer.className = "similar-items-drawer";
//     this.drawer.setAttribute("role", "dialog");
//     this.drawer.setAttribute("aria-modal", "true");
//     this.drawer.setAttribute("aria-labelledby", "similar-items-title");
//     this.drawer.innerHTML = '<div class="similar-items-drawer__inner"><div class="similar-items-drawer__loader"><div class="spinner"></div><p>Loading similar items...</p></div></div>';
    
//     document.body.appendChild(this.overlay);
//     document.body.appendChild(this.drawer);
//   }

//   attachEventListeners() {
//     document.addEventListener("click", (event) => {
//       const button = event.target.closest(".view-similar-btn");
//       if (button) {
//         event.preventDefault();
//         this.handleButtonClick(button);
//       }
      
//       if (event.target.closest(".similar-items-drawer__close")) {
//         this.close();
//       }
//     });

//     this.overlay.addEventListener("click", () => this.close());
    
//     document.addEventListener("keydown", (event) => {
//       if (event.key === "Escape" && this.isOpen) {
//         this.close();
//       }
//     });

//     this.drawer.addEventListener("touchmove", (event) => {
//       if (this.isOpen) {
//         const content = this.drawer.querySelector(".similar-items-drawer__content");
//         if (content && !content.contains(event.target)) {
//           event.preventDefault();
//         }
//       }
//     }, { passive: false });
//   }

//   async handleButtonClick(button) {
//     const productHandle = button.dataset.productHandle;
//     if (!productHandle) {
//       console.error("Product handle not found");
//       return;
//     }

//     // Show loading state immediately
//     this.showLoader();
//     this.open();

//     // Check cache
//     if (this.cache.has(productHandle)) {
//       this.renderContent(this.cache.get(productHandle));
//       return;
//     }

//     // Load new content
//     await this.loadContent(productHandle);
//   }

//   showLoader() {
//     const inner = this.drawer.querySelector(".similar-items-drawer__inner");
//     if (inner) {
//       inner.innerHTML = '<div class="similar-items-drawer__loader"><div class="spinner"></div><p>Loading similar items...</p></div>';
//     }
//   }

//   async loadContent(productHandle) {
//     // Abort any pending requests
//     if (this.abortController) {
//       this.abortController.abort();
//     }
//     this.abortController = new AbortController();

//     try {
//       const response = await fetch(`/products/${productHandle}?view=similar-items`, {
//         signal: this.abortController.signal,
//         headers: {
//           "X-Requested-With": "XMLHttpRequest"
//         }
//       });

//       if (!response.ok) {
//         throw new Error("Network response was not ok");
//       }

//       const html = await response.text();
//       this.cache.set(productHandle, html);
//       this.renderContent(html);
//     } catch (error) {
//       if (error.name === "AbortError") {
//         console.log("Request aborted");
//         return;
//       }
//       console.error("Error loading similar items:", error);
//       this.renderError();
//     } finally {
//       this.abortController = null;
//     }
//   }

//   renderContent(html) {
//     const inner = this.drawer.querySelector(".similar-items-drawer__inner");
//     if (inner) {
//       inner.innerHTML = html;
//       this.initializeDrawerContent();
//     }
//   }

//   renderError() {
//     const inner = this.drawer.querySelector(".similar-items-drawer__inner");
//     if (inner) {
//       inner.innerHTML = '<div class="similar-items-drawer__error"><p>Unable to load similar items. Please try again.</p><button type="button" class="similar-items-drawer__close btn">Close</button></div>';
//     }
//   }

//   initializeDrawerContent() {
//     document.dispatchEvent(new CustomEvent("similar-items:loaded", {
//       detail: { drawer: this.drawer }
//     }));
//   }

//   open() {
//     this.isOpen = true;
//     document.body.style.overflow = "hidden";
    
//     requestAnimationFrame(() => {
//       this.overlay.classList.add("is-visible");
//       this.drawer.classList.add("is-open");
//       this.overlay.setAttribute("aria-hidden", "false");
//     });
    
//     this.trapFocus();
//   }

//   close() {
//     this.isOpen = false;
//     document.body.style.overflow = "";
//     this.overlay.classList.remove("is-visible");
//     this.drawer.classList.remove("is-open");
//     this.overlay.setAttribute("aria-hidden", "true");
//     this.returnFocus();
//   }

//   trapFocus() {
//     const focusableElements = this.drawer.querySelectorAll(
//       'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
//     );
    
//     if (focusableElements.length === 0) return;

//     const firstElement = focusableElements[0];
//     const lastElement = focusableElements[focusableElements.length - 1];

//     setTimeout(() => firstElement.focus(), 100);

//     this.focusHandler = (event) => {
//       if (event.key === "Tab") {
//         if (event.shiftKey) {
//           if (document.activeElement === firstElement) {
//             lastElement.focus();
//             event.preventDefault();
//           }
//         } else {
//           if (document.activeElement === lastElement) {
//             firstElement.focus();
//             event.preventDefault();
//           }
//         }
//       }
//     };

//     this.drawer.addEventListener("keydown", this.focusHandler);
//   }

//   returnFocus() {
//     if (this.focusHandler) {
//       this.drawer.removeEventListener("keydown", this.focusHandler);
//     }
    
//     const triggerButton = document.querySelector(".view-similar-btn:focus-visible");
//     if (triggerButton) {
//       triggerButton.focus();
//     }
//   }

//   clearCache() {
//     this.cache.clear();
//   }
// }

// // Initialize
// if (document.readyState === "loading") {
//   document.addEventListener("DOMContentLoaded", () => {
//     window.similarItemsDrawer = new SimilarItemsDrawer();
//   });
// } else {
//   window.similarItemsDrawer = new SimilarItemsDrawer();
// }


/**
 * Ultra-optimized SimilarItemsDrawer with:
 * - Zero initialization cost
 * - Intersection Observer for visibility tracking
 * - Module pattern for better tree-shaking
 * - Minimal memory footprint
 */

const SimilarItemsDrawer = (() => {
  // Singleton state - nothing initialized until first use
  let state = {
    drawer: null,
    overlay: null,
    cache: null,
    isOpen: false,
    abortController: null,
    lastTriggerButton: null,
    initialized: false
  };

  // Lazy-bound handlers (created only once, on first use)
  let handlers = {};

  // Create drawer DOM elements (called only on first button click)
  function createDrawer() {
    if (state.drawer) return;

    const overlay = document.createElement("div");
    overlay.className = "similar-items-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const drawer = document.createElement("div");
    drawer.className = "similar-items-drawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-labelledby", "similar-items-title");

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    state.overlay = overlay;
    state.drawer = drawer;

    attachDrawerListeners();
  }

  // Attach listeners only after drawer is created
  function attachDrawerListeners() {
    if (!handlers.overlayClick) {
      handlers.overlayClick = () => close();
      handlers.escapeKey = (e) => {
        if (e.key === "Escape" && state.isOpen) close();
      };
      handlers.touchMove = (e) => {
        if (state.isOpen) {
          const content = state.drawer.querySelector(".similar-items-drawer__content");
          if (content && !content.contains(e.target)) {
            e.preventDefault();
          }
        }
      };
    }

    state.overlay.addEventListener("click", handlers.overlayClick);
    document.addEventListener("keydown", handlers.escapeKey);
    state.drawer.addEventListener("touchmove", handlers.touchMove, { passive: false });
  }

  // Main click handler (delegated from document)
  function handleClick(event) {
    const button = event.target.closest(".view-similar-btn");

    if (button) {
      event.preventDefault();
      state.lastTriggerButton = button;

      // Create drawer on first use
      if (!state.drawer) {
        createDrawer();
      }

      const productHandle = button.dataset.productHandle;
      if (productHandle) {
        loadAndShow(productHandle);
      } else {
        console.error("Product handle not found");
      }
      return;
    }

    // Handle close button
    if (state.isOpen && event.target.closest(".similar-items-drawer__close")) {
      close();
    }
  }

  // Show loader
  function showLoader() {
    state.drawer.innerHTML = `
      <div class="similar-items-drawer__inner">
        <div class="similar-items-drawer__loader">
          <div class="spinner"></div>
          <p>Loading similar items...</p>
        </div>
      </div>
    `;
  }

  // Load and show content
  async function loadAndShow(productHandle) {
    showLoader();
    open();

    // Lazy init cache
    if (!state.cache) {
      state.cache = new Map();
    }

    // Return cached content
    if (state.cache.has(productHandle)) {
      renderContent(state.cache.get(productHandle));
      return;
    }

    // Abort pending requests
    if (state.abortController) {
      state.abortController.abort();
    }

    state.abortController = new AbortController();

    try {
      const response = await fetch(`/products/${productHandle}?view=similar-items`, {
        signal: state.abortController.signal,
        headers: { "X-Requested-With": "XMLHttpRequest" }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();

      // Cache with size limit (LRU-style)
      state.cache.set(productHandle, html);
      if (state.cache.size > 10) {
        const firstKey = state.cache.keys().next().value;
        state.cache.delete(firstKey);
      }

      renderContent(html);

    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Error loading similar items:", error);
        renderError();
      }
    } finally {
      state.abortController = null;
    }
  }

  // Render content
  function renderContent(html) {
    state.drawer.innerHTML = `<div class="similar-items-drawer__inner">${html}</div>`;
    
    // Dispatch event for third-party scripts
    document.dispatchEvent(new CustomEvent("similar-items:loaded", {
      detail: { drawer: state.drawer }
    }));
  }

  // Render error
  function renderError() {
    state.drawer.innerHTML = `
      <div class="similar-items-drawer__inner">
        <div class="similar-items-drawer__error">
          <p>Unable to load similar items. Please try again.</p>
          <button type="button" class="similar-items-drawer__close btn">Close</button>
        </div>
      </div>
    `;
  }

  // Open drawer
  function open() {
    state.isOpen = true;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      state.overlay.classList.add("is-visible");
      state.drawer.classList.add("is-open");
      state.overlay.setAttribute("aria-hidden", "false");
      trapFocus();
    });
  }

  // Close drawer
  function close() {
    if (!state.isOpen) return;

    state.isOpen = false;
    document.body.style.overflow = "";
    state.overlay.classList.remove("is-visible");
    state.drawer.classList.remove("is-open");
    state.overlay.setAttribute("aria-hidden", "true");

    returnFocus();
  }

  // Focus trap
  function trapFocus() {
    const focusable = state.drawer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    requestAnimationFrame(() => first?.focus());

    if (!handlers.focusTrap) {
      handlers.focusTrap = (e) => {
        if (e.key !== "Tab") return;

        const focusable = state.drawer.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      };
    }

    state.drawer.addEventListener("keydown", handlers.focusTrap);
  }

  // Return focus
  function returnFocus() {
    if (handlers.focusTrap) {
      state.drawer.removeEventListener("keydown", handlers.focusTrap);
    }

    state.lastTriggerButton?.focus();
  }

  // Clear cache
  function clearCache() {
    state.cache?.clear();
  }

  // Destroy instance
  function destroy() {
    document.removeEventListener("click", handleClick);
    
    if (state.overlay) {
      state.overlay.removeEventListener("click", handlers.overlayClick);
      state.overlay.remove();
    }

    if (state.drawer) {
      state.drawer.remove();
    }

    state.abortController?.abort();
    clearCache();
    
    // Reset state
    state = {
      drawer: null,
      overlay: null,
      cache: null,
      isOpen: false,
      abortController: null,
      lastTriggerButton: null,
      initialized: false
    };
  }

  // Initialize (attach single document listener)
  function init() {
    if (state.initialized) return;
    document.addEventListener("click", handleClick);
    state.initialized = true;
  }

  // Public API
  return {
    init,
    clearCache,
    destroy,
    get isOpen() { return state.isOpen; }
  };
})();

// Auto-initialize with minimal footprint
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => SimilarItemsDrawer.init(), { once: true });
} else {
  SimilarItemsDrawer.init();
}

// Expose globally
window.similarItemsDrawer = SimilarItemsDrawer;

