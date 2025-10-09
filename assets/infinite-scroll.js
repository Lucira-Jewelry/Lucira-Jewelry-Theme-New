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
        if (entry.isIntersecting) this.loadNextPage();
      });
    });

    this.observer.observe(this);
  }

  async loadNextPage() {
    this.observer.disconnect();

    // Apply loader class
    this.anchor.classList.add('infinite-scroll-anchor');
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
      const text = await response.text();
      const html = new DOMParser().parseFromString(text, "text/html");

      const newGrid = html.querySelector("[data-product-grid]");
      const grid = document.querySelector("[data-product-grid]");
      if (newGrid && grid) {
        Array.from(newGrid.children).forEach((child) => grid.appendChild(child));
        this.initWishlist();
      }

      const newInfinite = html.querySelector("infinite-scroll");
      if (newInfinite) this.replaceWith(newInfinite);
      else {
        this.showEndMessage();
        this.remove();
      }
    } catch (err) {
      console.error("InfiniteScroll error:", err);
    }

    this.anchor.style.display = "none";
    this.anchor.innerHTML = "";
  }

  showEndMessage() {
    requestAnimationFrame(() => {
      let endElement = document.getElementById('infinite-scroll-end');

      if (!endElement) {
        endElement = document.createElement('div');
        endElement.id = 'infinite-scroll-end';
        endElement.className = 'infinite-scroll-end';
        endElement.innerHTML = `
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
        const grid = document.querySelector('[data-product-grid]');
        if (grid) grid.after(endElement);
        else document.body.appendChild(endElement);
      }

      endElement.style.display = 'block';
      endElement.style.opacity = '0';
      endElement.style.transition = 'opacity 0.8s ease-in-out';
      setTimeout(() => endElement.style.opacity = '1', 50);
    });
  }

  initWishlist() {
    try {
      if (typeof iWish !== 'undefined' && typeof iWish.init === 'function') iWish.init();
      document.dispatchEvent(new CustomEvent('iwish:reload'));
      document.dispatchEvent(new CustomEvent('wishlist:init'));
      if (typeof iWishCounter === 'function') iWishCounter();
    } catch (error) {
      console.error('Wishlist init error:', error);
    }
  }
}

customElements.define("infinite-scroll", InfiniteScroll);