/**
 * Bulletproof Nested Tabs Controller
 * Handles all edge cases and provides debugging info
 */

class NestedTabsController {
  constructor() {
    this.data = null;
    this.activeTab = null;
    this.currentCategoryHandle = null;
    this.isInitialized = false;
    this.debugMode = true; // Set to false in production
    
    this.init();
  }
  
  /**
   * Debug logger
   */
  log(message, data = null) {
    if (this.debugMode) {
      console.log(`[TabsController] ${message}`, data || '');
    }
  }
  
  error(message, error = null) {
    console.error(`[TabsController ERROR] ${message}`, error || '');
  }
  
  /**
   * Initialize controller
   */
  init() {
    this.log('Initializing...');
    
    // Check if we're on the right page
    const dataElement = document.getElementById('tabs-data');
    if (!dataElement) {
      this.error('tabs-data element not found - wrong template?');
      return;
    }
    
    // Parse JSON data
    try {
      this.data = JSON.parse(dataElement.textContent);
      this.log('Data loaded successfully', this.data);
    } catch (error) {
      this.error('Failed to parse JSON data', error);
      this.showError('Invalid data format. Check browser console.');
      return;
    }
    
    // Validate data
    if (!this.data.category) {
      this.error('No category data found');
      this.showError('Category data missing');
      return;
    }
    
    if (!this.data.tabs || !Array.isArray(this.data.tabs)) {
      this.error('No tabs array found');
      this.showError('Tabs data missing');
      return;
    }
    
    if (this.data.tabs.length === 0) {
      this.log('No tabs found - showing message');
      this.showNoTabsMessage();
      return;
    }
    
    this.currentCategoryHandle = this.data.category.handle;
    this.activeTab = this.data.activeTabSlug;
    
    this.log(`Category: ${this.currentCategoryHandle}`);
    this.log(`Active tab: ${this.activeTab}`);
    this.log(`Total tabs: ${this.data.tabs.length}`);
    
    // Debug info
    if (this.data.debug) {
      this.log('Filtering method:', this.data.debug.filteringMethod);
    }
    
    // Validate active tab exists
    const activeTabData = this.getActiveTabData();
    if (!activeTabData) {
      this.log(`Active tab "${this.activeTab}" not found, using first tab`);
      this.activeTab = this.data.tabs[0].slug;
    }
    
    // Initialize UI
    try {
      this.renderBanner();
      this.renderTabs();
      this.renderContent();
      this.setupEventListeners();
      
      this.isInitialized = true;
      this.log('✅ Initialization complete!');
      
      // Dispatch event
      document.dispatchEvent(new CustomEvent('tabs:initialized', {
        detail: { category: this.currentCategoryHandle }
      }));
    } catch (error) {
      this.error('Initialization failed', error);
      this.showError('Failed to initialize tabs. Check console.');
    }
  }
  
  /**
   * Show error message to user
   */
  showError(message) {
    const contentContainer = document.getElementById('dynamic-content');
    if (contentContainer) {
      contentContainer.innerHTML = `
        <div class="nested-tabs-container">
          <div style="text-align: center; padding: 4rem 2rem; background: #fee; border: 2px solid #c00; border-radius: 8px;">
            <h2 style="color: #c00;">⚠️ Error</h2>
            <p>${message}</p>
            <p style="font-size: 0.9em; color: #666;">Press F12 to open browser console for details.</p>
          </div>
        </div>
      `;
    }
  }
  
  /**
   * Show "no tabs" message
   */
  showNoTabsMessage() {
    const contentContainer = document.getElementById('dynamic-content');
    if (contentContainer) {
      contentContainer.innerHTML = `
        <div class="nested-tabs-container">
          <div style="text-align: center; padding: 4rem 2rem;">
            <h2>No content available</h2>
            <p>Please add tab_content entries for this category.</p>
            <p style="font-size: 0.9em; color: #666;">See debug panels above for details.</p>
          </div>
        </div>
      `;
    }
  }
  
  /**
   * Render banner
   */
  renderBanner() {
    this.log('Rendering banner...');
    
    const activeTabData = this.getActiveTabData();
    if (!activeTabData) {
      this.error('No active tab data for banner');
      return;
    }
    
    const template = document.getElementById('tab-banner-template');
    if (!template) {
      this.error('Banner template not found');
      return;
    }
    
    const clone = template.content.cloneNode(true);
    
    // Set image
    const img = clone.querySelector('[data-banner-img]');
    if (img) {
      if (activeTabData.banner_image) {
        img.src = activeTabData.banner_image;
        img.alt = activeTabData.banner_title || activeTabData.title;
        this.log('Banner image set');
      } else {
        img.parentElement.style.display = 'none';
        this.log('No banner image, hiding background');
      }
    }
    
    // Set title
    const title = clone.querySelector('[data-banner-title]');
    if (title) {
      title.textContent = activeTabData.banner_title || activeTabData.header || activeTabData.title;
    }
    
    // Set subtitle
    const subtitle = clone.querySelector('[data-banner-subtitle]');
    if (subtitle) {
      if (activeTabData.banner_subtitle) {
        subtitle.textContent = activeTabData.banner_subtitle;
      } else {
        subtitle.style.display = 'none';
      }
    }
    
    // Insert into DOM
    const container = document.getElementById('dynamic-banner');
    if (container) {
      container.innerHTML = '';
      container.appendChild(clone);
      this.log('✅ Banner rendered');
    }
  }
  
  /**
   * Render tabs navigation
   */
  renderTabs() {
    this.log('Rendering tabs navigation...');
    
    const template = document.getElementById('tab-content-template');
    if (!template) {
      this.error('Tab content template not found');
      return;
    }
    
    const clone = template.content.cloneNode(true);
    const nav = clone.querySelector('[data-tabs-nav]');
    
    if (!nav) {
      this.error('Tabs nav container not found in template');
      return;
    }
    
    // Create tab links
    this.data.tabs.forEach((tab, index) => {
      const link = document.createElement('a');
      link.href = `?tab=${encodeURIComponent(tab.slug)}`;
      link.className = 'tab-link';
      link.dataset.tabSlug = tab.slug;
      link.dataset.tabIndex = index;
      link.textContent = tab.title;
      link.setAttribute('role', 'tab');
      
      const isActive = tab.slug.toLowerCase() === this.activeTab.toLowerCase();
      if (isActive) {
        link.classList.add('active');
        link.setAttribute('aria-selected', 'true');
      } else {
        link.setAttribute('aria-selected', 'false');
      }
      
      nav.appendChild(link);
    });
    
    const container = document.getElementById('dynamic-content');
    if (container) {
      container.innerHTML = '';
      container.appendChild(clone);
      this.log(`✅ Rendered ${this.data.tabs.length} tabs`);
    }
  }
  
  /**
   * Render content
   */
  renderContent() {
    this.log('Rendering content...');
    
    const activeTabData = this.getActiveTabData();
    if (!activeTabData) {
      this.error('No active tab data for content');
      return;
    }
    
    this.log('Active tab data:', activeTabData);
    
    const contentContainer = document.querySelector('[data-tab-content]');
    if (!contentContainer) {
      this.error('Content container not found');
      return;
    }
    
    const template = document.getElementById('single-tab-template');
    if (!template) {
      this.error('Single tab template not found');
      return;
    }
    
    const clone = template.content.cloneNode(true);
    
    // Set header
    const header = clone.querySelector('[data-header]');
    if (header) {
      header.textContent = activeTabData.header || activeTabData.title;
    }
    
    // Set description
    const description = clone.querySelector('[data-description]');
    if (description) {
      description.innerHTML = this.formatDescription(activeTabData.description);
    }
    
    // Set CTA
    const ctaContainer = clone.querySelector('[data-cta-container]');
    if (ctaContainer && activeTabData.cta_text && activeTabData.cta_link) {
      const ctaTemplate = document.getElementById('cta-button-template');
      if (ctaTemplate) {
        const ctaClone = ctaTemplate.content.cloneNode(true);
        const ctaLink = ctaClone.querySelector('[data-cta-link]');
        if (ctaLink) {
          ctaLink.href = activeTabData.cta_link;
          ctaLink.textContent = activeTabData.cta_text;
          ctaContainer.appendChild(ctaClone);
          this.log('CTA added');
        }
      }
    }
    
    // Set image
    const imageContainer = clone.querySelector('[data-image-container]');
    if (imageContainer && activeTabData.content_image) {
      const imageTemplate = document.getElementById('content-image-template');
      if (imageTemplate) {
        const imageClone = imageTemplate.content.cloneNode(true);
        const img = imageClone.querySelector('[data-content-img]');
        if (img) {
          img.src = activeTabData.content_image;
          img.alt = activeTabData.header || activeTabData.title;
          imageContainer.appendChild(imageClone);
          clone.querySelector('.tab-content-area').classList.add('with-image');
          this.log('Content image added');
        }
      }
    }
    
    // Set related topics
    const topicsContainer = clone.querySelector('[data-topics-container]');
    if (topicsContainer && activeTabData.related_blogs && activeTabData.related_blogs.length > 0) {
      const topicsTemplate = document.getElementById('related-topics-template');
      if (topicsTemplate) {
        const topicsClone = topicsTemplate.content.cloneNode(true);
        const blogLinksContainer = topicsClone.querySelector('[data-blog-links]');
        
        if (blogLinksContainer) {
          const blogTemplate = document.getElementById('blog-link-template');
          
          activeTabData.related_blogs.forEach(blog => {
            if (blogTemplate && blog.title && blog.url) {
              const blogClone = blogTemplate.content.cloneNode(true);
              const blogLink = blogClone.querySelector('[data-blog-link]');
              if (blogLink) {
                blogLink.href = blog.url;
                blogLink.textContent = blog.title;
                blogLinksContainer.appendChild(blogClone);
              }
            }
          });
          
          topicsContainer.appendChild(topicsClone);
          this.log(`Added ${activeTabData.related_blogs.length} related blogs`);
        }
      }
    }
    
    // Insert content
    contentContainer.innerHTML = '';
    contentContainer.appendChild(clone);
    this.log('✅ Content rendered');
    
    // Smooth scroll
    this.smoothScrollToContent();
  }
  
  /**
   * Format description text
   */
  formatDescription(description) {
    if (!description) return '';
    
    return description
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p>${line}</p>`)
      .join('');
  }
  
  /**
   * Get active tab data
   */
  getActiveTabData() {
    const tab = this.data.tabs.find(t => 
      t.slug.toLowerCase() === this.activeTab.toLowerCase()
    );
    
    if (!tab && this.data.tabs.length > 0) {
      return this.data.tabs[0];
    }
    
    return tab;
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.log('Setting up event listeners...');
    
    // Tab click handler
    document.addEventListener('click', (e) => {
      const tabLink = e.target.closest('.tab-link');
      if (tabLink && !tabLink.classList.contains('active')) {
        e.preventDefault();
        const slug = tabLink.dataset.tabSlug;
        this.log(`Tab clicked: ${slug}`);
        this.switchTab(slug);
      }
    });
    
    // Browser back/forward
    window.addEventListener('popstate', () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabFromUrl = urlParams.get('tab');
      if (tabFromUrl && tabFromUrl !== this.activeTab) {
        this.log(`Browser navigation: ${tabFromUrl}`);
        this.switchTab(tabFromUrl, false);
      }
    });
    
    this.log('✅ Event listeners ready');
  }
  
  /**
   * Switch tab
   */
  switchTab(tabSlug, updateHistory = true) {
    this.log(`Switching to tab: ${tabSlug}`);
    
    // Validate tab exists
    const tabExists = this.data.tabs.some(tab =>
      tab.slug.toLowerCase() === tabSlug.toLowerCase()
    );
    
    if (!tabExists) {
      this.error(`Tab not found: ${tabSlug}`);
      return;
    }
    
    this.activeTab = tabSlug;
    
    // Update nav
    document.querySelectorAll('.tab-link').forEach(link => {
      const isActive = link.dataset.tabSlug.toLowerCase() === tabSlug.toLowerCase();
      link.classList.toggle('active', isActive);
      link.setAttribute('aria-selected', isActive);
    });
    
    // Update content
    try {
      this.renderBanner();
      this.renderContent();
      
      if (updateHistory) {
        this.updateURL();
      }
      
      // Dispatch event
      document.dispatchEvent(new CustomEvent('tabs:changed', {
        detail: { tab: tabSlug, category: this.currentCategoryHandle }
      }));
      
      this.log('✅ Tab switched successfully');
    } catch (error) {
      this.error('Failed to switch tab', error);
    }
  }
  
  /**
   * Update URL
   */
  updateURL() {
    const url = new URL(window.location);
    url.searchParams.set('tab', this.activeTab);
    window.history.pushState({}, '', url);
    this.log(`URL updated: ${url}`);
  }
  
  /**
   * Smooth scroll to content
   */
  smoothScrollToContent() {
    const mainNav = document.querySelector('.main-tabs-navigation');
    if (mainNav) {
      const offset = mainNav.offsetHeight + 20;
      window.scrollTo({
        top: offset,
        behavior: 'smooth'
      });
    }
  }
}

// Auto-initialize
function initializeTabs() {
  if (document.getElementById('tabs-data')) {
    console.log('[Tabs] Initializing Nested Tabs Controller...');
    window.nestedTabsController = new NestedTabsController();
  } else {
    console.log('[Tabs] Not a nested tabs page, skipping initialization');
  }
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTabs);
} else {
  initializeTabs();
}

// Export for debugging
window.NestedTabsController = NestedTabsController;
