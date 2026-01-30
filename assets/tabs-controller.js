// // class TabsController {
// //   constructor() {
// //     this.data = null;
// //     this.activeTab = null;
// //     this.init();
// //   }
  
// //   init() {
// //     // Get data from Liquid
// //     const dataElement = document.getElementById('tabs-data');
// //     if (!dataElement) {
// //       console.error('Tabs data not found');
// //       return;
// //     }
    
// //     this.data = JSON.parse(dataElement.textContent);
// //     this.activeTab = this.data.activeTabSlug;
    
// //     // Initialize UI
// //     this.renderBanner();
// //     this.renderTabs();
// //     this.renderContent();
// //     this.setupEventListeners();
// //     this.updateURL();
// //   }

//   class TabsController {
//     constructor() {
//       this.data = null;
//       this.activeTab = null;
//       this.currentCategoryHandle = null;
//       this.filteredTabs = [];
//       this.init();
//     }
    
//     init() {
//       // Get data from Liquid
//       const dataElement = document.getElementById('tabs-data');
//       if (!dataElement) {
//         console.error('Tabs data not found');
//         return;
//       }
      
//       this.data = JSON.parse(dataElement.textContent);
//       this.currentCategoryHandle = this.data.category.handle;
//       this.activeTab = this.data.activeTabSlug;
      
//       // Filter tabs by current category
//       this.filterTabsByCategory();
      
//       // Initialize UI
//       this.renderBanner();
//       this.renderTabs();
//       this.renderContent();
//       this.setupEventListeners();
//       this.updateURL();
//     }
    
//     filterTabsByCategory() {
//       // In the Liquid template, we should pass filtered tabs only
//       // But for safety, filter here too
//       this.filteredTabs = this.data.tabs.filter(tab => {
//         // If tabs data includes parent info, use it
//         if (tab.parentCategoryHandle) {
//           return tab.parentCategoryHandle === this.currentCategoryHandle;
//         }
//         // Otherwise, assume tabs are pre-filtered by Liquid
//         return true;
//       });
      
//       // If no filtered tabs, use all tabs as fallback
//       if (this.filteredTabs.length === 0) {
//         this.filteredTabs = this.data.tabs;
//       }
//     }
  
//   renderBanner() {
//     const activeTabData = this.getActiveTabData();
//     if (!activeTabData) return;
    
//     const template = document.getElementById('tab-banner-template');
//     const clone = template.content.cloneNode(true);
    
//     // Set banner image
//     const bannerImg = clone.querySelector('#banner-image');
//     if (activeTabData.banner_image) {
//       bannerImg.src = activeTabData.banner_image;
//       bannerImg.alt = activeTabData.banner_title;
//     } else {
//       // Use default banner if no tab-specific banner
//       bannerImg.style.display = 'none';
//     }
    
//     // Set banner title
//     const bannerTitle = clone.querySelector('#banner-title');
//     bannerTitle.textContent = activeTabData.banner_title || activeTabData.header || activeTabData.title;
    
//     // Set banner subtitle if available
//     const bannerSubtitle = clone.querySelector('#banner-subtitle');
//     if (activeTabData.banner_subtitle) {
//       bannerSubtitle.textContent = activeTabData.banner_subtitle;
//     } else {
//       bannerSubtitle.style.display = 'none';
//     }
    
//     // Insert into DOM
//     const bannerContainer = document.getElementById('dynamic-banner');
//     bannerContainer.innerHTML = '';
//     bannerContainer.appendChild(clone);
//   }
  
//   renderTabs() {
//     const template = document.getElementById('tab-content-template');
//     const clone = template.content.cloneNode(true);
    
//     const tabsNav = clone.querySelector('#tabs-navigation');
    
//     this.data.tabs.forEach((tab, index) => {
//       const tabLink = document.createElement('a');
//       tabLink.href = `?tab=${tab.slug}`;
//       tabLink.className = 'tab-link';
//       tabLink.dataset.tabSlug = tab.slug;
//       tabLink.dataset.tabIndex = index;
//       tabLink.textContent = tab.title;
      
//       if (tab.slug.toLowerCase() === this.activeTab.toLowerCase()) {
//         tabLink.classList.add('active');
//       }
      
//       tabsNav.appendChild(tabLink);
//     });
    
//     const contentContainer = document.getElementById('dynamic-content');
//     contentContainer.innerHTML = '';
//     contentContainer.appendChild(clone);
//   }
  
//   renderContent() {
//     const activeTabData = this.getActiveTabData();
//     if (!activeTabData) return;
    
//     const contentContainer = document.getElementById('tab-content-area');
//     contentContainer.innerHTML = '';
    
//     // Create tab content
//     const tabTemplate = document.getElementById('single-tab-template').innerHTML;
    
//     let content = tabTemplate
//       .replace(/{slug}/g, activeTabData.slug)
//       .replace(/{header}/g, activeTabData.header)
//       .replace(/{description}/g, activeTabData.description);
    
//     // Add CTA button if exists
//     if (activeTabData.cta_text && activeTabData.cta_link) {
//       const ctaTemplate = document.getElementById('cta-button-template').innerHTML;
//       const ctaButton = ctaTemplate
//         .replace(/{text}/g, activeTabData.cta_text)
//         .replace(/{link}/g, activeTabData.cta_link);
//       content = content.replace(/{cta_button}/g, ctaButton);
//     } else {
//       content = content.replace(/{cta_button}/g, '');
//     }
    
//     // Add content image if exists
//     if (activeTabData.content_image) {
//       const imageTemplate = document.getElementById('content-image-template').innerHTML;
//       const contentImage = imageTemplate
//         .replace(/{src}/g, activeTabData.content_image)
//         .replace(/{alt}/g, activeTabData.header);
//       content = content.replace(/{content_image}/g, contentImage);
      
//       // Add with-image class
//       content = content.replace('tab-content-area', 'tab-content-area with-image');
//     } else {
//       content = content.replace(/{content_image}/g, '');
//     }
    
//     // Add related topics if exists
//     if (activeTabData.related_blogs && activeTabData.related_blogs.length > 0) {
//       const blogLinkTemplate = document.getElementById('blog-link-template').innerHTML;
//       let blogLinks = '';
      
//       activeTabData.related_blogs.forEach(blog => {
//         blogLinks += blogLinkTemplate
//           .replace(/{title}/g, blog.title)
//           .replace(/{url}/g, blog.url);
//       });
      
//       const topicsTemplate = document.getElementById('related-topics-template').innerHTML;
//       const relatedTopics = topicsTemplate.replace(/{blog_links}/g, blogLinks);
//       content = content.replace(/{related_topics}/g, relatedTopics);
//     } else {
//       content = content.replace(/{related_topics}/g, '');
//     }
    
//     contentContainer.innerHTML = content;
//   }
  
//   getActiveTabData() {
//     return this.data.tabs.find(tab => 
//       tab.slug.toLowerCase() === this.activeTab.toLowerCase()
//     ) || this.data.tabs[0];
//   }
  
//   setupEventListeners() {
//     document.addEventListener('click', (e) => {
//       const tabLink = e.target.closest('.tab-link');
//       if (tabLink && !tabLink.classList.contains('active')) {
//         e.preventDefault();
//         this.switchTab(tabLink.dataset.tabSlug);
//       }
//     });
    
//     // Handle browser back/forward buttons
//     window.addEventListener('popstate', () => {
//       const urlParams = new URLSearchParams(window.location.search);
//       const tabFromUrl = urlParams.get('tab');
//       if (tabFromUrl && tabFromUrl !== this.activeTab) {
//         this.switchTab(tabFromUrl, false); // Don't push state again
//       }
//     });
//   }
  
//   switchTab(tabSlug, updateHistory = true) {
//     this.activeTab = tabSlug;
    
//     // Update active tab in navigation
//     document.querySelectorAll('.tab-link').forEach(link => {
//       link.classList.toggle('active', 
//         link.dataset.tabSlug.toLowerCase() === tabSlug.toLowerCase()
//       );
//     });
    
//     // Update content
//     this.renderBanner();
//     this.renderContent();
    
//     // Update URL
//     if (updateHistory) {
//       this.updateURL();
//     }
//   }
  
//   updateURL() {
//     const url = new URL(window.location);
    
//     if (this.activeTab) {
//       url.searchParams.set('tab', this.activeTab);
//     } else {
//       url.searchParams.delete('tab');
//     }
    
//     window.history.pushState({}, '', url);
//   }
// }

// // Initialize when DOM is ready
// document.addEventListener('DOMContentLoaded', () => {
//   new TabsController();
// });

/**
 * Tabs Controller
 * Manages nested tab navigation with dynamic content loading
 */
class NestedTabsController {
  constructor() {
    this.data = null;
    this.activeTab = null;
    this.currentCategoryHandle = null;
    this.isInitialized = false;
    
    this.init();
  }
  
  /**
   * Initialize the controller
   */
  init() {
    const dataElement = document.getElementById('tabs-data');
    if (!dataElement) {
      console.error('Tabs data not found');
      return;
    }
    
    try {
      this.data = JSON.parse(dataElement.textContent);
      this.currentCategoryHandle = this.data.category.handle;
      this.activeTab = this.data.activeTabSlug;
      
      // Validate data
      if (!this.data.tabs || this.data.tabs.length === 0) {
        console.warn('No tabs found for this category');
        this.showNoTabsMessage();
        return;
      }
      
      // Initialize UI
      this.renderBanner();
      this.renderTabs();
      this.renderContent();
      this.setupEventListeners();
      
      this.isInitialized = true;
      
      // Dispatch custom event
      document.dispatchEvent(new CustomEvent('tabs:initialized', { 
        detail: { category: this.currentCategoryHandle } 
      }));
      
    } catch (error) {
      console.error('Failed to initialize tabs:', error);
    }
  }
  
  /**
   * Show message when no tabs are available
   */
  showNoTabsMessage() {
    const contentContainer = document.getElementById('dynamic-content');
    if (contentContainer) {
      contentContainer.innerHTML = `
        <div class="nested-tabs-container">
          <div style="text-align: center; padding: 4rem 2rem;">
            <h2>No content available</h2>
            <p>Please add tab_content entries for this category.</p>
          </div>
        </div>
      `;
    }
  }
  
  /**
   * Render the banner section
   */
  renderBanner() {
    const activeTabData = this.getActiveTabData();
    if (!activeTabData) return;
    
    const template = document.getElementById('tab-banner-template');
    if (!template) return;
    
    const clone = template.content.cloneNode(true);
    
    // Set banner image
    const bannerImg = clone.querySelector('[data-banner-img]');
    if (activeTabData.banner_image) {
      bannerImg.src = activeTabData.banner_image;
      bannerImg.alt = activeTabData.banner_title || activeTabData.title;
    } else {
      // Use fallback or hide
      bannerImg.parentElement.style.display = 'none';
    }
    
    // Set banner title
    const bannerTitle = clone.querySelector('[data-banner-title]');
    bannerTitle.textContent = activeTabData.banner_title || activeTabData.header || activeTabData.title;
    
    // Set banner subtitle
    const bannerSubtitle = clone.querySelector('[data-banner-subtitle]');
    if (activeTabData.banner_subtitle) {
      bannerSubtitle.textContent = activeTabData.banner_subtitle;
    } else {
      bannerSubtitle.style.display = 'none';
    }
    
    // Insert into DOM with fade effect
    const bannerContainer = document.getElementById('dynamic-banner');
    bannerContainer.style.opacity = '0';
    bannerContainer.innerHTML = '';
    bannerContainer.appendChild(clone);
    
    // Fade in
    requestAnimationFrame(() => {
      bannerContainer.style.transition = 'opacity 0.3s ease';
      bannerContainer.style.opacity = '1';
    });
  }
  
  /**
   * Render the tabs navigation
   */
  renderTabs() {
    const template = document.getElementById('tab-content-template');
    if (!template) return;
    
    const clone = template.content.cloneNode(true);
    const tabsNav = clone.querySelector('[data-tabs-nav]');
    
    this.data.tabs.forEach((tab, index) => {
      const tabLink = document.createElement('a');
      tabLink.href = `?tab=${encodeURIComponent(tab.slug)}`;
      tabLink.className = 'tab-link';
      tabLink.dataset.tabSlug = tab.slug;
      tabLink.dataset.tabIndex = index;
      tabLink.textContent = tab.title;
      tabLink.setAttribute('role', 'tab');
      tabLink.setAttribute('aria-selected', tab.slug.toLowerCase() === this.activeTab.toLowerCase());
      
      if (tab.slug.toLowerCase() === this.activeTab.toLowerCase()) {
        tabLink.classList.add('active');
      }
      
      tabsNav.appendChild(tabLink);
    });
    
    const contentContainer = document.getElementById('dynamic-content');
    contentContainer.innerHTML = '';
    contentContainer.appendChild(clone);
  }
  
  /**
   * Render the content for active tab
   */
  renderContent() {
    const activeTabData = this.getActiveTabData();
    if (!activeTabData) return;
    
    const contentContainer = document.querySelector('[data-tab-content]');
    if (!contentContainer) return;
    
    const template = document.getElementById('single-tab-template');
    if (!template) return;
    
    const clone = template.content.cloneNode(true);
    const tabArea = clone.querySelector('.tab-content-area');
    tabArea.dataset.tabSlug = activeTabData.slug;
    
    // Set header
    const header = clone.querySelector('[data-header]');
    header.textContent = activeTabData.header || activeTabData.title;
    
    // Set description
    const description = clone.querySelector('[data-description]');
    description.innerHTML = this.formatDescription(activeTabData.description);
    
    // Add CTA button if exists
    const ctaContainer = clone.querySelector('[data-cta-container]');
    if (activeTabData.cta_text && activeTabData.cta_link) {
      const ctaTemplate = document.getElementById('cta-button-template');
      const ctaClone = ctaTemplate.content.cloneNode(true);
      const ctaLink = ctaClone.querySelector('[data-cta-link]');
      ctaLink.href = activeTabData.cta_link;
      ctaLink.textContent = activeTabData.cta_text;
      ctaContainer.appendChild(ctaClone);
    }
    
    // Add content image if exists
    const imageContainer = clone.querySelector('[data-image-container]');
    if (activeTabData.content_image) {
      const imageTemplate = document.getElementById('content-image-template');
      const imageClone = imageTemplate.content.cloneNode(true);
      const img = imageClone.querySelector('[data-content-img]');
      img.src = activeTabData.content_image;
      img.alt = activeTabData.header || activeTabData.title;
      imageContainer.appendChild(imageClone);
      tabArea.classList.add('with-image');
    }
    
    // Add related topics if exists
    const topicsContainer = clone.querySelector('[data-topics-container]');
    if (activeTabData.related_blogs && activeTabData.related_blogs.length > 0) {
      const topicsTemplate = document.getElementById('related-topics-template');
      const topicsClone = topicsTemplate.content.cloneNode(true);
      const blogLinksContainer = topicsClone.querySelector('[data-blog-links]');
      
      activeTabData.related_blogs.forEach(blog => {
        const blogTemplate = document.getElementById('blog-link-template');
        const blogClone = blogTemplate.content.cloneNode(true);
        const blogLink = blogClone.querySelector('[data-blog-link]');
        blogLink.href = blog.url;
        blogLink.textContent = blog.title;
        blogLinksContainer.appendChild(blogClone);
      });
      
      topicsContainer.appendChild(topicsClone);
    }
    
    // Insert with fade effect
    contentContainer.style.opacity = '0';
    contentContainer.innerHTML = '';
    contentContainer.appendChild(clone);
    
    requestAnimationFrame(() => {
      contentContainer.style.transition = 'opacity 0.3s ease';
      contentContainer.style.opacity = '1';
    });
    
    // Scroll to content (smooth)
    const mainTabs = document.querySelector('.main-tabs-navigation');
    if (mainTabs) {
      const offset = mainTabs.offsetHeight;
      window.scrollTo({
        top: offset,
        behavior: 'smooth'
      });
    }
  }
  
  /**
   * Format description text
   */
  formatDescription(description) {
    if (!description) return '';
    
    // Replace newlines with <br> tags
    return description
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('<br><br>');
  }
  
  /**
   * Get active tab data
   */
  getActiveTabData() {
    return this.data.tabs.find(tab => 
      tab.slug.toLowerCase() === this.activeTab.toLowerCase()
    ) || this.data.tabs[0];
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Tab click handler
    document.addEventListener('click', (e) => {
      const tabLink = e.target.closest('.tab-link');
      if (tabLink && !tabLink.classList.contains('active')) {
        e.preventDefault();
        this.switchTab(tabLink.dataset.tabSlug);
      }
    });
    
    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabFromUrl = urlParams.get('tab');
      if (tabFromUrl && tabFromUrl !== this.activeTab) {
        this.switchTab(tabFromUrl, false);
      }
    });
  }
  
  /**
   * Switch to a different tab
   */
  switchTab(tabSlug, updateHistory = true) {
    // Validate tab exists
    const tabExists = this.data.tabs.some(tab => 
      tab.slug.toLowerCase() === tabSlug.toLowerCase()
    );
    
    if (!tabExists) {
      console.warn(`Tab not found: ${tabSlug}`);
      return;
    }
    
    this.activeTab = tabSlug;
    
    // Update active state in navigation
    document.querySelectorAll('.tab-link').forEach(link => {
      const isActive = link.dataset.tabSlug.toLowerCase() === tabSlug.toLowerCase();
      link.classList.toggle('active', isActive);
      link.setAttribute('aria-selected', isActive);
    });
    
    // Update content
    this.renderBanner();
    this.renderContent();
    
    // Update URL
    if (updateHistory) {
      this.updateURL();
    }
    
    // Dispatch event
    document.dispatchEvent(new CustomEvent('tabs:changed', { 
      detail: { 
        tab: tabSlug,
        category: this.currentCategoryHandle 
      } 
    }));
  }
  
  /**
   * Update browser URL
   */
  updateURL() {
    const url = new URL(window.location);
    
    if (this.activeTab) {
      url.searchParams.set('tab', this.activeTab);
    } else {
      url.searchParams.delete('tab');
    }
    
    window.history.pushState({}, '', url);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTabs);
} else {
  initializeTabs();
}

function initializeTabs() {
  if (document.getElementById('tabs-data')) {
    window.nestedTabsController = new NestedTabsController();
  }
}
