document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const targetId = this.getAttribute("href").substring(1);
    if (targetId === "") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      const y =
        targetElement.getBoundingClientRect().top + window.pageYOffset + -100;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  });
});


// Lazy load videos when they enter viewport
document.addEventListener("DOMContentLoaded", function() {
  const lazyVideos = [].slice.call(document.querySelectorAll("video.lazy-video"));
  
  if ("IntersectionObserver" in window) {
    const lazyVideoObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(video) {
        if (video.isIntersecting) {
          for (var source in video.target.children) {
            var videoSource = video.target.children[source];
            if (typeof videoSource.tagName === "string" && videoSource.tagName === "SOURCE") {
              videoSource.src = videoSource.dataset.src;
            }
          }
          video.target.load();
          video.target.classList.remove("lazy-video");
          lazyVideoObserver.unobserve(video.target);
        }
      });
    });
    
    lazyVideos.forEach(function(lazyVideo) {
      lazyVideoObserver.observe(lazyVideo);
    });
  }
});

jQuery(document).ready(function () {
  
  const plusIcon = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" fill="currentColor"/>
    </svg>`;

  const closeIcon = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`;

  // Add icon to each accordion title
  jQuery(".accordion .accordion-title").append(`<span class="accordion-icon">${plusIcon}</span>`);

  jQuery(".accordion .accordion-title").click(function () {
    const icon = jQuery(this).find(".accordion-icon");

    // toggle accordion
    jQuery(this).toggleClass("active");
    jQuery(this).next(".accordion-content").slideToggle();

    // swap svg
    icon.html(jQuery(this).hasClass("active") ? closeIcon : plusIcon);
  });
});


document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        observer.unobserve(img);
      }
    });
  });
  document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
});

$(document).ready(function(){
  $('.pdp-match-shine-slider').slick({
    slidesToShow: 3,
    slidesToScroll: 1,
    infinite: true,
    centerMode: false,
    centerPadding: '15%',
    prevArrow: '<button type="button" class="slick-prev pdp-match-shine-slider-btn"><i class="fas fa-angle-left"></i></button>',
    nextArrow: '<button type="button" class="slick-next pdp-match-shine-slider-btn"><i class="fas fa-angle-right"></i></button>',
    responsive: [
      {
        breakpoint: 750,
        settings: {
          arrows: false,
          slidesToShow: 1,
          centerMode: true,
        }
      },
    ]
  });
});

(function() {
  function getParam(param) {
    return new URLSearchParams(window.location.search).get(param);
  }
  function setCookie(name, value, days = 90) {
    const date = new Date();
    date.setTime(date.getTime() + (days*24*60*60*1000));
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/`;
  }
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }
  const utm_source = getParam('utm_source');
  const utm_medium = getParam('utm_medium');
  const utm_campaign = getParam('utm_campaign');
  const utm_term = getParam('utm_term');
  const utm_content = getParam('utm_content');
  const gclid = getParam('gclid');
  const fbclid = getParam('fbclid');
  const referrer = document.referrer;
  const hasUTM = utm_source && utm_medium && utm_campaign;
  const isDirect = (!referrer || referrer.includes(window.location.hostname)) && !hasUTM;
  const isReferral = referrer && !hasUTM && !referrer.includes(window.location.hostname);
  const existingSource = getCookie('utm_source');
  const existingMedium = getCookie('utm_medium');
  if (hasUTM) {
    setCookie('utm_source', utm_source);
    setCookie('utm_medium', utm_medium);
    setCookie('utm_campaign', utm_campaign);
    if (utm_term) setCookie('utm_term', utm_term);
    if (utm_content) setCookie('utm_content', utm_content);
    if (gclid) setCookie('gclid', gclid);
    if (fbclid) setCookie('fbclid', fbclid);
  } else if (isReferral) {
    if (!existingSource || !existingMedium) {
      const link = document.createElement('a');
      link.href = referrer;
      setCookie('utm_source', link.hostname);
      setCookie('utm_medium', 'referral');
    }
  } else if (isDirect) {
    if (!existingSource) {
      console.log('Direct traffic, first-time visitor, no cookies stored.');
    }
  }
})();

// (function() {
//   function getCookie(name) {
//     const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
//     return match ? decodeURIComponent(match[2]) : null;
//   }

//   function collectCookies() {
//     return document.cookie.split(';').reduce((acc, c) => {
//       const [key, value] = c.trim().split('=');
//       acc[key] = decodeURIComponent(value);
//       return acc;
//     }, {});
//   }
//   function sendWebhook(eventType, data) {
//     fetch('https://cookies-webhook-385594025448.asia-south1.run.app', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ event: eventType, ...data })
//     }).catch(console.error);
//   }

//   // --- Product View ---
//   if (window.location.pathname.includes('/products/')) {
//     const productHandle = window.location.pathname.split('/products/')[1].split('/')[0];
//     sendWebhook('product_view', { product_handle: productHandle, cookies: collectCookies() });
//   }

//   // --- Add To Cart ---
//   document.addEventListener('submit', function(e) {
//     const form = e.target.closest('form[action^="/cart/add"]');
//     if(!form) return;
//     const formData = new FormData(form);
//     const productId = formData.get('id');
//     sendWebhook('add_to_cart', { product_id: productId, cookies: collectCookies() });
//   });
// })();