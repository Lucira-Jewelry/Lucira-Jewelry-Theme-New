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
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
      <div style="display: flex; align-items: center; justify-content: center;">
        <span class="luxury-dots" style="display: flex; gap: 6px; align-items: center;">
          <span class="dot" style="width: 8px; height: 8px; background: linear-gradient(135deg, #d4af37 0%, #ffe6ae 50%, #d4af37 100%); border-radius: 50%; animation: luxuryPulse 1.4s infinite ease-in-out; opacity: 1;"></span>
          <span class="dot" style="width: 8px; height: 8px; background: linear-gradient(135deg, #d4af37 0%, #ffe6ae 50%, #d4af37 100%); border-radius: 50%; animation: luxuryPulse 1.4s infinite ease-in-out; opacity: 1; animation-delay: 0.2s;"></span>
          <span class="dot" style="width: 8px; height: 8px; background: linear-gradient(135deg, #d4af37 0%, #ffe6ae 50%, #d4af37 100%); border-radius: 50%; animation: luxuryPulse 1.4s infinite ease-in-out; opacity: 1; animation-delay: 0.4s;"></span>
        </span>
      </div>
      <div style="font-family: inherit; text-align: center; margin-top: 10px; display: block;">Discovering more exquisite pieces</div>
    </div>
    `;

    // Add keyframes if not already added
    if (!document.getElementById('luxury-dots-style')) {
      const style = document.createElement('style');
      style.id = 'luxury-dots-style';
      style.textContent = `
        @keyframes luxuryPulse {
          0%, 80%, 100% { opacity: 0.4; transform: scale(1); }
          40% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .infinite-scroll-end {
          display: none;
          text-align: center;
          padding: 60px 0 100px;
          color: #6f5b3e;
          font-family: 'Futura', sans-serif;
        }
        .infinite-scroll-end .end-decoration {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        .infinite-scroll-end .luxury-line {
          height: 1px;
          width: 80px;
          background: linear-gradient(90deg, transparent, #d4af37, transparent);
        }
        .infinite-scroll-end .end-diamond {
          color: #d4af37;
          font-size: 16px;
          margin: 0 10px;
        }
        .infinite-scroll-end .end-text {
          font-size: 18px;
          letter-spacing: 0.04em;
          margin-bottom: 6px;
          animation: fadeInUp 0.6s ease forwards;
        }
        .infinite-scroll-end .end-subtitle {
          font-size: 14px;
          color: #a8905b;
          letter-spacing: 0.03em;
          animation: fadeInUp 0.8s ease forwards;
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
            // No more pages - show end message
            this.remove();
            this.showEndMessage();
        }
    } catch (err) {
      console.error("InfiniteScroll error:", err);
    }

    this.anchor.style.display = "none";
    this.anchor.innerHTML = "";
  }
  
  // Show elegant end message
  showEndMessage() {
    const endElement = document.getElementById('infinite-scroll-end');
    if (endElement) {
      endElement.style.display = 'block';
      endElement.style.opacity = '0';
      endElement.style.transition = 'opacity 0.8s ease-in-out';
      setTimeout(() => { endElement.style.opacity = '1'; }, 100);
    }
  }
  
  // Wishlist initialization
  initWishlist() {
    try {
      if (typeof iWish !== 'undefined' && typeof iWish.init === 'function') {
        iWish.init();
      }
      document.dispatchEvent(new CustomEvent('iwish:reload'));
      document.dispatchEvent(new CustomEvent('wishlist:init'));
      if (typeof iWishCounter === 'function') iWishCounter();
    } catch (error) {
      console.error('Wishlist init error:', error);
    }
  }
}

customElements.define("infinite-scroll", InfiniteScroll);