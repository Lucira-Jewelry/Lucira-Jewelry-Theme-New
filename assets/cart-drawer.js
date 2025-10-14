class CartDrawer extends HTMLElement {
  constructor() {
    super(),
      this.addEventListener(
        "keyup",
        (e) => "Escape" === e.code && this.close()
      ),
      this.querySelector("#CartDrawer-Overlay")?.addEventListener(
        "click",
        this.close.bind(this)
      ),
      this.setHeaderCartIconAccessibility();
  }
  setHeaderCartIconAccessibility() {
    const e = document.querySelector("#cart-icon-bubble");
    e &&
      (e.setAttribute("role", "button"),
      e.setAttribute("aria-haspopup", "dialog"),
      e.addEventListener("click", (t) => {
        t.preventDefault();
        const r = document.getElementById("cart-information");
        if (r)
          try {
            const e = JSON.parse(r.textContent);
            (window.dataLayer = window.dataLayer || []),
              window.dataLayer.push({ ...e });
          } catch (e) {}
        this.open(e);
      }),
      e.addEventListener("keydown", (t) => {
        "SPACE" === t.code.toUpperCase() && (t.preventDefault(), this.open(e));
      }));
  }
  open(e) {
    e && this.setActiveElement(e);
    const t = this.querySelector('[id^="Details-"] summary');
    t && !t.hasAttribute("role") && this.setSummaryAccessibility(t);
    const r = this.querySelector("#CartDrawer-Overlay");
    r && r.classList.add("active"),
      setTimeout(() => {
        this.classList.add("animate", "active");
      }, 10),
      this.addEventListener(
        "transitionend",
        () => {
          trapFocus(
            this.classList.contains("is-empty")
              ? this.querySelector(".drawer__inner-empty")
              : document.getElementById("CartDrawer"),
            this.querySelector(".drawer__inner") ||
              this.querySelector(".drawer__close")
          );
        },
        { once: !0 }
      ),
      document.body.classList.add("overflow-hidden"),
      setTimeout(() => {
        this.activateCrossSelling();
      }, 200);
  }
  close() {
    this.classList.remove("active");
    const e = this.querySelector("#CartDrawer-Overlay");
    e && e.classList.remove("active"),
      this.deactivateCrossSelling(),
      removeTrapFocus(this.activeElement),
      document.body.classList.remove("overflow-hidden");
  }
  activateCrossSelling() {
    const e = this.querySelector(".you-may-also-like-wrapper"),
      t = this.querySelector(".you-may-also-like-wrapper-mobile");
    e &&
      ((e.style.display = "block"),
      setTimeout(() => {
        e.classList.add("active"), this.attachDesktopRecommendationListeners();
      }, 300)),
      t &&
        setTimeout(() => {
          (t.style.display = "block"), t.classList.add("active");
        }, 300);
  }
  attachDesktopRecommendationListeners() {
    const e = this.querySelector(".you-may-also-like-wrapper");
    e &&
      e.querySelectorAll(".you-may-also-like-add-button").forEach((e) => {
        e.addEventListener("click", (t) => {
          t.preventDefault(), handleRecommendationAddToCart(e);
        });
      });
  }
  deactivateCrossSelling() {
    const e = this.querySelector(".you-may-also-like-wrapper"),
      t = this.querySelector(".you-may-also-like-wrapper-mobile");
    e && e.classList.remove("active"), t && t.classList.remove("active");
  }
  setSummaryAccessibility(e) {
    e.setAttribute("role", "button"),
      e.setAttribute("aria-expanded", "false"),
      e.nextElementSibling?.getAttribute("id") &&
        e.setAttribute("aria-controls", e.nextElementSibling.id),
      e.addEventListener("click", (e) => {
        e.currentTarget.setAttribute(
          "aria-expanded",
          !e.currentTarget.closest("details").hasAttribute("open")
        );
      }),
      e.parentElement.addEventListener("keyup", onKeyUpEscape);
  }
  renderContents(e) {
    const t = this.querySelector(".drawer__inner");
    t?.classList.contains("is-empty") && t.classList.remove("is-empty"),
      (this.productId = e.id);
    const r = this.preserveRecommendationsState();
    this.getSectionsToRender().forEach((t) => {
      const r = t.selector
        ? document.querySelector(t.selector)
        : document.getElementById(t.id);
      if (!r) return;
      const s = this.getSectionInnerHTML(e.sections[t.id], t.selector);
      r.innerHTML = s;
    }),
      setTimeout(() => {
        this.querySelector("#CartDrawer-Overlay")?.addEventListener(
          "click",
          this.close.bind(this)
        ),
          this.restoreRecommendationsState(r);
      }, 50);
  }
  preserveRecommendationsState() {
    const e = this.querySelector(".you-may-also-like-wrapper"),
      t = this.querySelector(".you-may-also-like-wrapper-mobile");
    return {
      desktopActive: e?.classList.contains("active") || !1,
      mobileActive: t?.classList.contains("active") || !1,
      mobileVisible: "none" !== t?.style.display,
    };
  }
  restoreRecommendationsState(e) {
    if (!e) return;
    const t = this.querySelector(".you-may-also-like-wrapper"),
      r = this.querySelector(".you-may-also-like-wrapper-mobile");
    t &&
      e.desktopActive &&
      setTimeout(() => {
        t.classList.add("active");
      }, 100),
      r &&
        (e.mobileVisible && (r.style.display = "block"),
        e.mobileActive &&
          setTimeout(() => {
            r.classList.add("active");
          }, 100));
  }
  getSectionInnerHTML(e, t = ".shopify-section") {
    return (
      new DOMParser().parseFromString(e, "text/html").querySelector(t)
        ?.innerHTML || ""
    );
  }
  getSectionsToRender() {
    return [
      { id: "cart-drawer", selector: "#CartDrawer" },
      { id: "cart-icon-bubble" },
    ];
  }
  getSectionDOM(e, t = ".shopify-section") {
    return new DOMParser().parseFromString(e, "text/html").querySelector(t);
  }
  setActiveElement(e) {
    this.activeElement = e;
  }
}
customElements.define("cart-drawer", CartDrawer);
class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      { id: "CartDrawer", section: "cart-drawer", selector: ".drawer__inner" },
      {
        id: "cart-icon-bubble",
        section: "cart-icon-bubble",
        selector: ".shopify-section",
      },
    ];
  }
  updateLiveRegions(e, t) {
    const r = super.updateLiveRegions(e, t);
    return (
      setTimeout(() => {
        this.updateCrossSellingSmooth();
      }, 100),
      r
    );
  }
  updateCrossSellingSmooth() {
    const e = document.querySelector("cart-drawer");
    e &&
      fetch("/cart.js")
        .then((e) => e.json())
        .then((t) => {
          this.updateRecommendations(t, e);
        })
        .catch((e) => {});
  }
  updateRecommendations(e, t) {
    const r = t.querySelector(".you-may-also-like-wrapper"),
      s = t.querySelector(".you-may-also-like-wrapper-mobile");
    if (0 === e.item_count)
      return (
        r && (r.classList.remove("active"), (r.style.display = "none")),
        void (s && (s.classList.remove("active"), (s.style.display = "none")))
      );
    this.fetchAndUpdateRecommendations(e, t);
  }
  fetchAndUpdateRecommendations(e, t) {
    fetch("/?section_id=cart-drawer")
      .then((e) => e.text())
      .then((r) => {
        const s = new DOMParser().parseFromString(r, "text/html"),
          a = s.querySelector(".you-may-also-like-wrapper"),
          o = t.querySelector(".you-may-also-like-wrapper");
        if (a && o) {
          const t = o.classList.contains("active");
          (o.innerHTML = a.innerHTML),
            (o.style.display = "block"),
            t && o.classList.add("active"),
            this.filterRecommendations(e, o, 6);
        }
        const i = s.querySelector(".you-may-also-like-wrapper-mobile"),
          n = t.querySelector(".you-may-also-like-wrapper-mobile");
        if (i && n) {
          const t = n.classList.contains("active"),
            r = "none" !== n.style.display;
          (n.innerHTML = i.innerHTML),
            r && (n.style.display = "block"),
            t && n.classList.add("active"),
            this.filterRecommendations(e, n, 6);
        }
        setTimeout(() => {
          this.attachRecommendationListeners();
        }, 50);
      })
      .catch((e) => {});
  }
  filterRecommendations(e, t, r = 6) {
    if (!t) return;
    const s = e.items.map((e) => e.handle),
      a =
        (e.items.map((e) => e.product_id),
        t.querySelectorAll(".you-may-also-like-item"));
    let o = 0;
    a.forEach((e) => {
      const t = e.querySelector("a");
      if (t && o < r) {
        const r = t.getAttribute("href");
        if (r) {
          const t = r.split("/"),
            a = t[t.length - 1];
          s.includes(a)
            ? (e.style.display = "none")
            : ((e.style.display = "block"), o++);
        }
      } else o >= r && (e.style.display = "none");
    }),
      o > 0
        ? ((t.style.display = "block"), t.classList.add("active"))
        : (t.classList.remove("active"), (t.style.display = "none"));
  }
  attachRecommendationListeners() {}
  fetchAndUpdateCartDrawer() {
    fetch("/cart?section_id=cart-drawer")
      .then((e) => e.text())
      .then((e) => {
        const t = document.querySelector("cart-drawer");
        if (t) {
          const r = new DOMParser()
            .parseFromString(e, "text/html")
            .querySelector("cart-drawer");
          if (r) {
            const e = t.preserveRecommendationsState();
            (t.innerHTML = r.innerHTML), t.restoreRecommendationsState(e);
          }
        }
      })
      .catch((e) => {});
  }
}
function trapFocus(e, t = null) {}
function removeTrapFocus(e = null) {}
function onKeyUpEscape(e) {}
customElements.define("cart-drawer-items", CartDrawerItems);

// Prevent double cart additions
window.cartAddInProgress = false;

(function () {
  "use strict";
  let e = !1,
    t = null;
  function r(e) {
    const t = e.dataset.variantId;
    if (!t) return;
    if (window.cartAddInProgress) {
      console.log(
        "Cart add already in progress, skipping recommendation add..."
      );
      return;
    }
    window.cartAddInProgress = true;
    const o = e.closest(".you-may-also-like-item");
    e.disabled = !0;
    const i = e.textContent;
    e.classList.add("loading"),
      (e.textContent = "Adding..."),
      fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ id: t, quantity: 1 }),
      })
        .then((e) => {
          if (!e.ok) throw new Error(`HTTP error! status: ${e.status}`);
          return e.json();
        })
        .then((t) => {
          e.classList.remove("loading"),
            e.classList.add("success"),
            (e.textContent = "Added!"),
            setTimeout(() => {
              !(function (e, t) {
                if (!e) return;
                const s = e.closest(
                  ".you-may-also-like-wrapper, .you-may-also-like-wrapper-mobile"
                );
                if (!s) return;
                e.remove(),
                  (function (e) {
                    const t = e.classList.contains(
                      "you-may-also-like-wrapper-mobile"
                    );
                    fetch("/cart?section_id=cart-drawer")
                      .then((e) => e.text())
                      .then((s) => {
                        const o = new DOMParser().parseFromString(
                            s,
                            "text/html"
                          ),
                          i = t
                            ? ".you-may-also-like-wrapper-mobile"
                            : ".you-may-also-like-wrapper",
                          n = o.querySelector(i);
                        if (n)
                          return fetch("/cart.js")
                            .then((e) => e.json())
                            .then((s) => {
                              !(function (e, t, s, o) {
                                s.items.map((e) => e.handle);
                                const i = s.items.map((e) => e.product_id),
                                  n = Array.from(
                                    t.querySelectorAll(
                                      o
                                        ? ".you-may-also-like-item-mobile"
                                        : ".you-may-also-like-item"
                                    )
                                  ),
                                  c = Array.from(
                                    e.querySelectorAll(
                                      o
                                        ? ".you-may-also-like-item-mobile"
                                        : ".you-may-also-like-item"
                                    )
                                  ),
                                  l = c
                                    .map((e) =>
                                      e.dataset.productId
                                        ? parseInt(e.dataset.productId)
                                        : null
                                    )
                                    .filter(Boolean),
                                  d = n.filter(
                                    (e) =>
                                      null !==
                                      e.closest(
                                        ".matching-you-may-also-like-wrapper"
                                      )
                                  ),
                                  u = n.filter(
                                    (e) =>
                                      null ===
                                      e.closest(
                                        ".matching-you-may-also-like-wrapper"
                                      )
                                  ),
                                  m = [...d, ...u].find((e) => {
                                    const t = e.dataset.productId
                                      ? parseInt(e.dataset.productId)
                                      : null;
                                    if (!t) return !1;
                                    const r = i.includes(t),
                                      s = l.includes(t);
                                    return !r && !s;
                                  });
                                if (m && c.length < 6) {
                                  const t = m.cloneNode(!0),
                                    s = e.querySelector(
                                      o
                                        ? ".you-may-also-like-container-mobile"
                                        : ".you-may-also-like-container"
                                    );
                                  if (s) {
                                    let e = s;
                                    if (
                                      null !==
                                      m.closest(
                                        ".matching-you-may-also-like-wrapper"
                                      )
                                    ) {
                                      const t = s.querySelector(
                                        ".matching-you-may-also-like-wrapper"
                                      );
                                      t && (e = t);
                                    }
                                    e.appendChild(t);
                                    const a = t.querySelector(
                                      o
                                        ? ".you-may-also-like-add-button-mobile"
                                        : ".you-may-also-like-add-button"
                                    );
                                    a &&
                                      a.addEventListener("click", function (e) {
                                        e.preventDefault(), r(a);
                                      });
                                  }
                                } else a(e, o);
                              })(e, n, s, t);
                            });
                        a(e, t);
                      })
                      .catch((r) => {
                        a(e, t);
                      });
                  })(s);
              })(o);
            }, 500),
            s();
        })
        .catch((t) => {
          e.classList.remove("loading"),
            e.classList.add("error"),
            (e.textContent = "Error"),
            setTimeout(() => {
              e &&
                e.parentNode &&
                (e.classList.remove("error"),
                (e.textContent = i),
                (e.disabled = !1));
            }, 2e3);
        })
        .finally(() => {
          setTimeout(() => {
            window.cartAddInProgress = false;
          }, 500);
        });
  }
  function s() {
    t && clearTimeout(t),
      (t = setTimeout(() => {
        e ||
          (function () {
            if (e) return;
            e = !0;
            const t = document.querySelector("cart-drawer");
            if (!t) return void (e = !1);
            const r = {
              isOpen: t.classList.contains("active"),
              recommendationsState: t.preserveRecommendationsState?.() || {},
            };
            fetch("/?section_id=cart-drawer")
              .then((e) => e.text())
              .then((s) => {
                const a = new DOMParser()
                  .parseFromString(s, "text/html")
                  .querySelector("cart-drawer");
                if (a && t) {
                  const e = t.querySelector("#CartDrawer"),
                    s = a.querySelector("#CartDrawer");
                  if (e && s && ((e.innerHTML = s.innerHTML), r.isOpen)) {
                    t.classList.add("active"),
                      document.body.classList.add("overflow-hidden");
                    const e = t.querySelector(".you-may-also-like-wrapper"),
                      s = t.querySelector(".you-may-also-like-wrapper-mobile");
                    e &&
                      r.recommendationsState.desktopActive &&
                      ((e.style.display = "block"), e.classList.add("active")),
                      s &&
                        r.recommendationsState.mobileVisible &&
                        ((s.style.display = "block"),
                        r.recommendationsState.mobileActive &&
                          s.classList.add("active"));
                  }
                }
                e = !1;
              })
              .catch((t) => {
                e = !1;
              });
          })();
      }, 100));
  }
  function a(e, t) {
    const r = Array.from(
        e.querySelectorAll(
          t
            ? '.you-may-also-like-item-mobile[style*="display: none"], .you-may-also-like-item-mobile[style*="display:none"]'
            : '.you-may-also-like-item[style*="display: none"], .you-may-also-like-item[style*="display:none"]'
        )
      ),
      s = [
        ...r.filter(
          (e) => null !== e.closest(".matching-you-may-also-like-wrapper")
        ),
        ...r.filter(
          (e) => null === e.closest(".matching-you-may-also-like-wrapper")
        ),
      ];
    s.length > 0 &&
      fetch("/cart.js")
        .then((e) => e.json())
        .then((e) => {
          const t = e.items.map((e) => e.product_id),
            r = s.find((e) => {
              const r = e.dataset.productId
                ? parseInt(e.dataset.productId)
                : null;
              return r && !t.includes(r);
            });
          r && (r.style.display = "block");
        })
        .catch((e) => {});
  }
  document.addEventListener("click", function (e) {
    const t = e.target.closest(
      ".you-may-also-like-add-button, .you-may-also-like-add-button-mobile"
    );
    if (t) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      r(t);
    }
  });
  let o = 0;
  document.addEventListener("cart:updated", function (e) {
    const t = Date.now();
    t - o > 500 && ((o = t), s());
  }),
    document.addEventListener("cart:changed", function (e) {
      const t = Date.now();
      t - o > 500 && ((o = t), s());
    }),
    document.addEventListener("click", function (e) {
      (e.target.matches('[href="#cart-drawer"], .cart-icon, .cart-link') ||
        e.target.closest('[href="#cart-drawer"], .cart-icon, .cart-link')) &&
        setTimeout(() => {
          const e = document.querySelector("cart-drawer");
          e && e.activateCrossSelling();
        }, 400);
    });
})();

document.addEventListener("DOMContentLoaded", () => {
  const e = document.querySelector("cart-drawer");
  if (!e) return;
  document.body.addEventListener("submit", async (t) => {
    const r = t.target;
    if (!r.matches('form[action^="/cart/add"]')) return;
    t.preventDefault();
    if (window.cartAddInProgress) {
      console.log("Cart add already in progress, skipping...");
      return;
    }
    window.cartAddInProgress = true;
    const s = new FormData(r);
    try {
      await fetch("/cart/add.js", {
        method: "POST",
        body: s,
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      const t = await fetch("/cart?section_id=cart-drawer"),
        r = await t.text(),
        a = new DOMParser(),
        o = a.parseFromString(r, "text/html").querySelector("cart-drawer");
      if (o) {
        (e.innerHTML = o.innerHTML), e.open();
        const t = e.querySelector(".you-may-also-like-wrapper"),
          r = e.querySelector(".you-may-also-like-wrapper-mobile");
        t && ((t.style.display = "block"), e.activateCrossSelling()),
          r && (r.style.display = "block");
      }
    } catch (error) {
      console.error("Cart add error:", error);
    } finally {
      setTimeout(() => {
        window.cartAddInProgress = false;
      }, 500);
    }
  });
});
