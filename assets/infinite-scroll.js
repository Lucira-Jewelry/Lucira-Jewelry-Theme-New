class InfiniteScroll extends HTMLElement {
  constructor() {
    super();
    this.anchor = this.querySelector("a");
    if (!this.anchor) {
      this.showEndMessage();
      this.remove();
      return;
    }
    
    // Cache the target grid
    this.targetGrid = document.querySelector("[data-product-grid]");
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) this.loadNextPage();
      });
    });
    this.observer.observe(this);
  }

  async loadNextPage() {
    this.observer.disconnect();
    this.anchor.classList.add("infinite-scroll-anchor");
    
    // UI Loading state
    this.anchor.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <div style="display: flex; align-items: center; justify-content: center;">
          <span class="luxury-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>
        </div>
        <div style="font-family: inherit; text-align: center; margin-top: 10px;">
          Discovering more exquisite pieces
        </div>
      </div>
    `;

    const url = this.anchor.getAttribute("href");
    if (!url) return;

    try {
      // Reverted to your original full-page fetch to ensure it doesn't break
      const response = await fetch(url);
      const text = await response.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");
      const fetchedGrid = doc.querySelector("[data-product-grid]");

      if (fetchedGrid && this.targetGrid) {
        // PERFORMANCE FIX: Document Fragment (Prevents DOM Thrashing)
        const fragment = document.createDocumentFragment();
        Array.from(fetchedGrid.children).forEach(el => fragment.appendChild(el));
        this.targetGrid.appendChild(fragment);
        
        this.initWishlist();
      }

      // Handle the next pagination link
      const nextInfiniteScroll = doc.querySelector("infinite-scroll");
      if (nextInfiniteScroll) {
        this.replaceWith(nextInfiniteScroll);
      } else {
        this.showEndMessage();
        this.remove();
      }
      
    } catch (error) {
      console.error("Infinite Scroll Error:", error);
    } finally {
      this.anchor.style.display = "none";
      this.anchor.innerHTML = "";
    }
  }

  showEndMessage() {
    requestAnimationFrame(() => {
      let endEl = document.getElementById("infinite-scroll-end");
      if (!endEl) {
        endEl = document.createElement("div");
        endEl.id = "infinite-scroll-end";
        endEl.className = "infinite-scroll-end";
        endEl.innerHTML = `
          <div class="end-content">
            <div class="end-decoration">
              <div class="luxury-line"><span style="display: none">.</span></div>
              <div class="end-diamond"><span style="display: none">.</span>◆</div>
              <div class="luxury-line"><span style="display: none">.</span></div>
            </div>
            <p class="end-text">You've explored our complete collection</p>
            <p class="end-subtitle">Every piece tells a story of elegance</p>
          </div>
        `;
        if (this.targetGrid) {
          this.targetGrid.after(endEl);
        } else {
          document.body.appendChild(endEl);
        }
      }
      endEl.style.display = "block";
      endEl.style.opacity = "0";
      endEl.style.transition = "opacity 0.8s ease-in-out";
      
      requestAnimationFrame(() => {
        endEl.style.opacity = "1";
      });
    });
  }

  initWishlist() {
    try {
      if (typeof iWish !== "undefined" && typeof iWish.init === "function") iWish.init();
      document.dispatchEvent(new CustomEvent("iwish:reload"));
      document.dispatchEvent(new CustomEvent("wishlist:init"));
      if (typeof iWishCounter === "function") iWishCounter();
    } catch (e) {
      console.error("Wishlist Error:", e);
    }
  }
}

customElements.define("infinite-scroll", InfiniteScroll);