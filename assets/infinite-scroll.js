class InfiniteScroll extends HTMLElement {
  constructor() {
    super();

    this.anchor = this.querySelector("a");

    if (!this.anchor) {
      this.showEndMessage();
      this.remove();
      return;
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.loadNextPage();
        }
      });
    });

    this.observer.observe(this);
  }

  async loadNextPage() {
    this.observer.disconnect();

    this.anchor.classList.add("infinite-scroll-anchor");
    this.anchor.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <div style="display: flex; align-items: center; justify-content: center;">
          <span class="luxury-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </span>
        </div>
        <div style="font-family: inherit; text-align: center; margin-top: 10px;">
          Discovering more exquisite pieces
        </div>
      </div>
    `;

    const url = this.anchor.getAttribute("href");
    if (!url) return;

    try {
      const response = await fetch(url);
      const html = await response.text();
      const parsed = new DOMParser().parseFromString(html, "text/html");

      const incomingGrid = parsed.querySelector("[data-product-grid]");
      const currentGrid = this.closest("section")?.querySelector("[data-product-grid]");

      if (incomingGrid && currentGrid) {
        Array.from(incomingGrid.children).forEach((card) => {
          const handle = card.getAttribute("data-product-handle");

          // Prevent duplicates (important for search pages)
          if (
            !handle ||
            !currentGrid.querySelector(`[data-product-handle="${handle}"]`)
          ) {
            currentGrid.appendChild(card);
          }
        });

        this.initWishlist();
      }

      const nextInfiniteScroll = parsed.querySelector("infinite-scroll");
      if (nextInfiniteScroll) {
        this.replaceWith(nextInfiniteScroll);
      } else {
        this.showEndMessage();
        this.remove();
      }
    } catch (err) {
      console.error("Infinite scroll error:", err);
    }

    this.anchor.style.display = "none";
    this.anchor.innerHTML = "";
  }

  showEndMessage() {
    requestAnimationFrame(() => {
      let end = document.getElementById("infinite-scroll-end");

      if (!end) {
        end = document.createElement("div");
        end.id = "infinite-scroll-end";
        end.className = "infinite-scroll-end";
        end.innerHTML = `
          <div class="end-content">
            <div class="end-decoration">
              <div class="luxury-line"><span style="display:none">.</span></div>
              <div class="end-diamond"><span style="display:none">.</span>◆</div>
              <div class="luxury-line"><span style="display:none">.</span></div>
            </div>
            <p class="end-text">You've explored our complete collection</p>
            <p class="end-subtitle">Every piece tells a story of elegance</p>
          </div>
        `;

        const grid = document.querySelector("[data-product-grid]");
        grid ? grid.after(end) : document.body.appendChild(end);
      }

      end.style.display = "block";
      end.style.opacity = "0";
      end.style.transition = "opacity 0.8s ease-in-out";

      setTimeout(() => {
        end.style.opacity = "1";
      }, 50);
    });
  }

  initWishlist() {
    try {
      if (typeof iWish !== "undefined" && typeof iWish.init === "function") {
        iWish.init();
      }

      document.dispatchEvent(new CustomEvent("iwish:reload"));
      document.dispatchEvent(new CustomEvent("wishlist:init"));

      if (typeof iWishCounter === "function") {
        iWishCounter();
      }
    } catch (e) {
      console.warn("Wishlist init failed", e);
    }
  }
}

customElements.define("infinite-scroll", InfiniteScroll);
