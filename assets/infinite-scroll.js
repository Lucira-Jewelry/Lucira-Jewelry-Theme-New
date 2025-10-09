class InfiniteScroll extends HTMLElement {
  constructor() {
    super();
    this.anchor = this.querySelector("a");
    
    // If there's no anchor, we're on the last page - show end message immediately
    if (!this.anchor) {
      this.showEndMessage();
      this.remove();
      return;
    }

    // IntersectionObserver to load next page
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

    // Show loader
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
          <span class="luxury-dots" style="display: flex; gap: 8px; align-items: center;">
            <span class="dot" style="width: 8px; height: 8px; background: linear-gradient(135deg, #d4af37 0%, #ffe6ae 50%, #d4af37 100%); border-radius: 50%; animation: luxuryPulse 1.4s infinite ease-in-out;"></span>
            <span class="dot" style="width: 8px; height: 8px; background: linear-gradient(135deg, #d4af37 0%, #ffe6ae 50%, #d4af37 100%); border-radius: 50%; animation: luxuryPulse 1.4s infinite ease-in-out 0.2s;"></span>
            <span class="dot" style="width: 8px; height: 8px; background: linear-gradient(135deg, #d4af37 0%, #ffe6ae 50%, #d4af37 100%); border-radius: 50%; animation: luxuryPulse 1.4s infinite ease-in-out 0.4s;"></span>
          </span>
        </div>
        <div style="font-family: inherit; text-align: center; margin-top: 10px;">Discovering more exquisite pieces</div>
      </div>
    `;

    // Add keyframes and end-message CSS if not already added
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
        this.initWishlist();
      }

      // Handle next infinite scroll
      const newInfinite = html.querySelector("infinite-scroll");
      if (newInfinite) {
        this.replaceWith(newInfinite);
      } else {
        // Show end message BEFORE removing the component
        this.showEndMessage();
        this.remove();
      }
    } catch (err) {
      console.error("InfiniteScroll error:", err);
    }

    this.anchor.style.display = "none";
    this.anchor.innerHTML = "";
  }

  // Show elegant end message (with fallback creation)
  showEndMessage() {
    console.log("✅ Reached end of collection");

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      let endElement = document.getElementById('infinite-scroll-end');

      if (!endElement) {
        console.warn("⚠️ #infinite-scroll-end not found — creating fallback.");
        endElement = document.createElement('div');
        endElement.id = 'infinite-scroll-end';
        endElement.className = 'infinite-scroll-end';
        endElement.innerHTML = `
          <div id="infinite-scroll-end" class="infinite-scroll-end" style="display: none;">
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
        const grid = document.querySelector('[data-product-grid]');
        if (grid) {
          grid.after(endElement);
        } else {
          document.body.appendChild(endElement);
        }
      }

      // Force reveal with proper display setting
      endElement.style.display = 'block';
      endElement.style.opacity = '0';
      endElement.style.transition = 'opacity 0.8s ease-in-out';
      
      // Small delay to ensure display:block is applied before opacity transition
      setTimeout(() => {
        endElement.style.opacity = '1';
        console.log("✨ End message now visible.");
      }, 50);
    });
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