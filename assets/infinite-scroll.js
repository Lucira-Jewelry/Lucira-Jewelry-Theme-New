class InfiniteScroll extends HTMLElement {
  constructor() {
    super();
    this.anchor = this.querySelector("a");
    if (!this.anchor) {
      this.showEndMessage();
      this.remove();
      return;
    }
    
    // Cache the target grid so we don't query it repeatedly
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

    let url = this.anchor.getAttribute("href");
    if (!url) return;

    try {
      // PERFORMANCE FIX 1: Shopify Section Rendering API
      // Appending this parameter tells Shopify to ONLY send the grid, not the header/footer.
      // IMPORTANT: Update this ID to match your actual Shopify section ID.
      const sectionId = 'template--your_actual_section_id__main'; 
      const fetchUrl = url.includes('?') ? `${url}&section_id=${sectionId}` : `${url}?section_id=${sectionId}`;

      const response = await fetch(fetchUrl);
      const text = await response.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");
      const fetchedGrid = doc.querySelector("[data-product-grid]");

      if (fetchedGrid && this.targetGrid) {
        // PERFORMANCE FIX 2: Batch DOM Append
        // Instead of looping appendChild, we use a DocumentFragment to update the DOM exactly once.
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
      
      // Allow DOM to register the block display before fading in
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
      console.error("Wishlist Init Error:", e);
    }
  }
}

customElements.define("infinite-scroll", InfiniteScroll);