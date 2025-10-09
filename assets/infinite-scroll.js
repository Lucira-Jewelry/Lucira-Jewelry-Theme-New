class InfiniteScroll extends HTMLElement {
  constructor() {
    super();
    this.anchor = this.querySelector("a");
    if (!this.anchor) return;

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

    this.anchor.style.display = "flex";
    this.anchor.style.alignItems = "center";
    this.anchor.style.justifyContent = "center";
    this.anchor.style.gap = "12px";
    this.anchor.style.color = "#8b7355";
    this.anchor.style.fontSize = "14px";
    this.anchor.style.letterSpacing = "0.05em";
    this.anchor.style.fontWeight = "400";
    
    this.anchor.innerHTML = `
      <span style="font-family: inherit;">Discovering more exquisite pieces</span>
      <span class="luxury-dots" style="display: flex; gap: 6px; align-items: center;">
        <span class="dot" style="width: 4px; height: 4px; background: currentColor; border-radius: 50%; animation: luxuryPulse 1.4s infinite ease-in-out; opacity: 0.4;"></span>
        <span class="dot" style="width: 4px; height: 4px; background: currentColor; border-radius: 50%; animation: luxuryPulse 1.4s infinite ease-in-out 0.2s; opacity: 0.4;"></span>
        <span class="dot" style="width: 4px; height: 4px; background: currentColor; border-radius: 50%; animation: luxuryPulse 1.4s infinite ease-in-out 0.4s; opacity: 0.4;"></span>
      </span>
    `;
    
    // Add keyframes if not already added
    if (!document.getElementById('luxury-dots-style')) {
      const style = document.createElement('style');
      style.id = 'luxury-dots-style';
      style.textContent = `
        @keyframes luxuryPulse {
          0%, 80%, 100% { 
            opacity: 0.4;
            transform: scale(1);
          }
          40% { 
            opacity: 1;
            transform: scale(1.3);
          }
        }
      `;
      document.head.appendChild(style);
    }

    const url = this.anchor.getAttribute("href");
    if (!url) return;

    try {
      const response = await fetch(url);
      const text = await response.text();
      const html = new DOMParser().parseFromString(text, "text/html");

      // Grab the product grid from the next page
      const newGrid = html.querySelector("[data-product-grid]");
      const grid = document.querySelector("[data-product-grid]");

      if (newGrid && grid) {
        Array.from(newGrid.children).forEach((child) => {
          grid.appendChild(child);
        });
        
        // Re-initialize wishlist for newly loaded products
        this.initWishlist();
      }

      // Handle next infinite scroll
      const newInfinite = html.querySelector("infinite-scroll");
      if (newInfinite) {
        this.replaceWith(newInfinite);
      } else {
        // No more pages - replace with end message
        const endMessage = `
          <div id="infinite-scroll-end" class="infinite-scroll-end" style="display: block; opacity: 0; transition: opacity 0.8s ease-in-out;">
            <div class="end-content">
              <div class="end-decoration">
                <div class="luxury-line"><span style="display: none">.</span></div>
                <div class="end-diamond"><span style="display: none">.</span>◆</div>
                <div class="luxury-line"><span style="display: none">.</span></div>
              </div>
              <p class="end-text">You've explored our complete collection</p>
              <p class="end-subtitle">Every piece tells a story of elegance</p>
            </div>
          </div>
        `;
        
        this.insertAdjacentHTML('afterend', endMessage);
        this.remove();
        
        // Trigger fade-in animation
        setTimeout(() => {
          const endElement = document.getElementById('infinite-scroll-end');
          if (endElement) {
            endElement.style.opacity = '1';
          }
        }, 100);
      }
    } catch (err) {
      console.error("InfiniteScroll error:", err);
    }

    this.anchor.style.display = "none";
    this.anchor.innerHTML = "";
  }
  
  // Wishlist initialization
  initWishlist() {
    try {
      if (typeof iWish !== 'undefined' && typeof iWish.init === 'function') {
        iWish.init();
      }
      
      document.dispatchEvent(new CustomEvent('iwish:reload'));
      document.dispatchEvent(new CustomEvent('wishlist:init'));
      
      if (typeof iWishCounter === 'function') {
        iWishCounter();
      }
      
    } catch (error) {
      console.error('Wishlist init error:', error);
    }
  }
}

customElements.define("infinite-scroll", InfiniteScroll);