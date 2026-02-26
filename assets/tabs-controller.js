class TabsController {
  constructor() {
    this.data = null;
    this.activeTab = null;
    this.init();
  }
  
  init() {
    // Get data from Liquid
    const dataElement = document.getElementById('tabs-data');
    if (!dataElement) {
      console.error('Tabs data not found');
      return;
    }
    
    this.data = JSON.parse(dataElement.textContent);
    this.activeTab = this.data.activeTabSlug;
    
    // Initialize UI
    this.renderBanner();
    this.renderTabs();
    this.renderContent();
    this.setupEventListeners();
    this.updateURL();
  }
  
  renderBanner() {
    const activeTabData = this.getActiveTabData();
    if (!activeTabData) return;
    
    const template = document.getElementById('tab-banner-template');
    const clone = template.content.cloneNode(true);
    
    // Set banner image
    const bannerImg = clone.querySelector('#banner-image');
    if (activeTabData.banner_image) {
      bannerImg.src = activeTabData.banner_image;
      bannerImg.alt = activeTabData.banner_title;
    } else {
      // Use default banner if no tab-specific banner
      bannerImg.style.display = 'none';
    }
    
    // Set banner title
    const bannerTitle = clone.querySelector('#banner-title');
    bannerTitle.textContent = activeTabData.banner_title || activeTabData.header || activeTabData.title;
    
    // Set banner subtitle if available
    const bannerSubtitle = clone.querySelector('#banner-subtitle');
    if (activeTabData.banner_subtitle) {
      bannerSubtitle.textContent = activeTabData.banner_subtitle;
    } else {
      bannerSubtitle.style.display = 'none';
    }
    
    // Insert into DOM
    const bannerContainer = document.getElementById('dynamic-banner');
    bannerContainer.innerHTML = '';
    bannerContainer.appendChild(clone);
  }
  
  renderTabs() {
    const template = document.getElementById('tab-content-template');
    const clone = template.content.cloneNode(true);
    
    const tabsNav = clone.querySelector('#tabs-navigation');
    
    this.data.tabs.forEach((tab, index) => {
      const tabLink = document.createElement('a');
      tabLink.href = `?tab=${tab.slug}`;
      tabLink.className = 'tab-link';
      tabLink.dataset.tabSlug = tab.slug;
      tabLink.dataset.tabIndex = index;
      tabLink.textContent = tab.title;
      
      if (tab.slug.toLowerCase() === this.activeTab.toLowerCase()) {
        tabLink.classList.add('active');
      }
      
      tabsNav.appendChild(tabLink);
    });
    
    const contentContainer = document.getElementById('dynamic-content');
    contentContainer.innerHTML = '';
    contentContainer.appendChild(clone);
  }
  
  renderContent() {
    const activeTabData = this.getActiveTabData();
    if (!activeTabData) return;
    
    const contentContainer = document.getElementById('tab-content-area');
    contentContainer.innerHTML = '';
    
    // Create tab content
    const tabTemplate = document.getElementById('single-tab-template').innerHTML;
    
    let content = tabTemplate
      .replace(/{slug}/g, activeTabData.slug)
      .replace(/{header}/g, activeTabData.header)
      .replace(/{description}/g, activeTabData.description);
    
    // Add CTA button if exists
    if (activeTabData.cta_text && activeTabData.cta_link) {
      const ctaTemplate = document.getElementById('cta-button-template').innerHTML;
      const ctaButton = ctaTemplate
        .replace(/{text}/g, activeTabData.cta_text)
        .replace(/{link}/g, activeTabData.cta_link);
      content = content.replace(/{cta_button}/g, ctaButton);
    } else {
      content = content.replace(/{cta_button}/g, '');
    }
    
    // Add content image if exists
    if (activeTabData.content_image) {
      const imageTemplate = document.getElementById('content-image-template').innerHTML;
      const contentImage = imageTemplate
        .replace(/{src}/g, activeTabData.content_image)
        .replace(/{alt}/g, activeTabData.header);
      content = content.replace(/{content_image}/g, contentImage);
      
      // Add with-image class
      content = content.replace('tab-content-area', 'tab-content-area with-image');
    } else {
      content = content.replace(/{content_image}/g, '');
    }
    
    // Add related topics if exists
    if (activeTabData.related_blogs && activeTabData.related_blogs.length > 0) {
      const blogLinkTemplate = document.getElementById('blog-link-template').innerHTML;
      let blogLinks = '';
      
      activeTabData.related_blogs.forEach(blog => {
        blogLinks += blogLinkTemplate
          .replace(/{title}/g, blog.title)
          .replace(/{url}/g, blog.url);
      });
      
      const topicsTemplate = document.getElementById('related-topics-template').innerHTML;
      const relatedTopics = topicsTemplate.replace(/{blog_links}/g, blogLinks);
      content = content.replace(/{related_topics}/g, relatedTopics);
    } else {
      content = content.replace(/{related_topics}/g, '');
    }
    
    contentContainer.innerHTML = content;
  }
  
  getActiveTabData() {
    return this.data.tabs.find(tab => 
      tab.slug.toLowerCase() === this.activeTab.toLowerCase()
    ) || this.data.tabs[0];
  }
  
  setupEventListeners() {
    document.addEventListener('click', (e) => {
      const tabLink = e.target.closest('.tab-link');
      if (tabLink && !tabLink.classList.contains('active')) {
        e.preventDefault();
        this.switchTab(tabLink.dataset.tabSlug);
      }
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabFromUrl = urlParams.get('tab');
      if (tabFromUrl && tabFromUrl !== this.activeTab) {
        this.switchTab(tabFromUrl, false); // Don't push state again
      }
    });
  }
  
  switchTab(tabSlug, updateHistory = true) {
    this.activeTab = tabSlug;
    
    // Update active tab in navigation
    document.querySelectorAll('.tab-link').forEach(link => {
      link.classList.toggle('active', 
        link.dataset.tabSlug.toLowerCase() === tabSlug.toLowerCase()
      );
    });
    
    // Update content
    this.renderBanner();
    this.renderContent();
    
    // Update URL
    if (updateHistory) {
      this.updateURL();
    }
  }
  
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
document.addEventListener('DOMContentLoaded', () => {
  new TabsController();
});