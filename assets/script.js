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
  // Append Font Awesome icon to each accordion title
  jQuery(".accordion .accordion-title").append('<i class="accordion-icon fa fa-plus"></i>');

  jQuery(".accordion .accordion-title").click(function () {
    const icon = jQuery(this).find(".accordion-icon");

    // Toggle active class
    jQuery(this).toggleClass("active");

    // Toggle content
    jQuery(this).next(".accordion-content").slideToggle();

    // Toggle icon class
    if (jQuery(this).hasClass("active")) {
      icon.removeClass("fa-plus").addClass("fa-times");
    } else {
      icon.removeClass("fa-times").addClass("fa-plus");
    }
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

jQuery(document).ready(function () {
  
  const plusIcon = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <mask id="mask0_10852_4780" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
    <rect width="24" height="24" fill="#D9D9D9"/>
    </mask>
    <g mask="url(#mask0_10852_4780)">
    <path d="M11.25 12.75H6.25C6.0375 12.75 5.85942 12.6781 5.71575 12.5342C5.57192 12.3904 5.5 12.2122 5.5 11.9997C5.5 11.7871 5.57192 11.609 5.71575 11.4655C5.85942 11.3218 6.0375 11.25 6.25 11.25H11.25V6.25C11.25 6.0375 11.3219 5.85942 11.4658 5.71575C11.6096 5.57192 11.7878 5.5 12.0003 5.5C12.2129 5.5 12.391 5.57192 12.5345 5.71575C12.6782 5.85942 12.75 6.0375 12.75 6.25V11.25H17.75C17.9625 11.25 18.1406 11.3219 18.2843 11.4658C18.4281 11.6096 18.5 11.7878 18.5 12.0003C18.5 12.2129 18.4281 12.391 18.2843 12.5345C18.1406 12.6782 17.9625 12.75 17.75 12.75H12.75V17.75C12.75 17.9625 12.6781 18.1406 12.5342 18.2843C12.3904 18.4281 12.2122 18.5 11.9997 18.5C11.7871 18.5 11.609 18.4281 11.4655 18.2843C11.3218 18.1406 11.25 17.9625 11.25 17.75V12.75Z" fill="#666"/>
    </g>
    </svg>
  `;

  const closeIcon = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <mask id="mask0_10852_4798" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
    <rect width="24" height="24" fill="#D9D9D9"/>
    </mask>
    <g mask="url(#mask0_10852_4798)">
    <path d="M12 13.0635L8.75377 16.3095C8.60893 16.4545 8.43335 16.5253 8.22702 16.522C8.02052 16.5188 7.84485 16.4448 7.70002 16.3C7.55518 16.1552 7.48277 15.9779 7.48277 15.7682C7.48277 15.5586 7.55518 15.3813 7.70002 15.2365L10.9365 12L7.69052 8.77874C7.54552 8.6339 7.47468 8.45665 7.47802 8.24699C7.48118 8.03749 7.55518 7.86032 7.70002 7.71549C7.84485 7.57049 8.0221 7.49799 8.23177 7.49799C8.44143 7.49799 8.61868 7.57049 8.76352 7.71549L12 10.9615L15.2213 7.71549C15.3661 7.57049 15.5417 7.49799 15.748 7.49799C15.9545 7.49799 16.1302 7.57049 16.275 7.71549C16.4302 7.87049 16.5078 8.05024 16.5078 8.25474C16.5078 8.45924 16.4302 8.6339 16.275 8.77874L13.0385 12L16.2845 15.2462C16.4295 15.3911 16.502 15.5667 16.502 15.773C16.502 15.9795 16.4295 16.1552 16.2845 16.3C16.1295 16.4552 15.9498 16.5327 15.7453 16.5327C15.5408 16.5327 15.3661 16.4552 15.2213 16.3L12 13.0635Z" fill="#666"/>
    </g>
    </svg>
  `;


  jQuery(".pdp-details-accordion .pdp-details-accordion-item-title").append(
    `<span class="accordion-icon">${plusIcon}</span>`
  );

  jQuery(".pdp-details-accordion .pdp-details-accordion-item-title").click(function () {
    const icon = jQuery(this).find(".accordion-icon");

    if (jQuery(this).hasClass("active")) {
      jQuery(this).removeClass("active");
      icon.html(plusIcon);
    } else {
      jQuery(this).addClass("active");
      icon.html(closeIcon);
    }

    jQuery(this).next(".pdp-details-accordion-item-content").slideToggle();
  });
});


$(document).ready(function () {
  let initialized = false;

  function setupBradAccordion() {
    const isMobile = $(window).width() <= 768;

    if (!isMobile) {
      if (initialized) {
        $(".lucira-accordion-content").removeAttr("style").removeClass("open");
        $(".lucira-accordion-toggle").removeClass("active")
          .off("click")
          .find(".lucira-accordion-icon")
          .html('<svg width="20" height="21"><use xlink:href="#icon-plus"></use></svg>');
        initialized = false;
      }
      return;
    }

    if (initialized) return;

    const $toggles = $(".lucira-accordion-toggle");

    $toggles.each(function () {
      $(this).replaceWith($(this).clone(true));
    });

    const $newToggles = $(".lucira-accordion-toggle");

    $newToggles.each(function () {
      const $toggle = $(this);
      const $content = $toggle.next();
      const $icon = $toggle.find(".lucira-accordion-icon");

      if ($content.length) {
        // Initial collapsed state
        $toggle.removeClass("active");
        $content.removeClass("open").css({
          display: "block",
          height: "0px",
          overflow: "hidden",
          opacity: 0,
          paddingTop: "0",
          paddingBottom: "0"
        });
        $icon.html('<svg width="20" height="21"><use xlink:href="#icon-plus"></use></svg>');
      }

      $toggle.on("click", function () {
        $newToggles.each(function () {
          const $el = $(this);
          if ($el[0] !== $toggle[0]) {
            const $otherContent = $el.next();
            $el.removeClass("active");
            $otherContent.stop().removeClass("open").animate({
              height: 0,
              opacity: 0,
              paddingTop: 0,
              paddingBottom: 0
            }, 300, function () {
              $otherContent.css("overflow", "hidden");
            });
            $el.find(".lucira-accordion-icon").html('<svg width="20" height="21"><use xlink:href="#icon-plus"></use></svg>');
          }
        });

        const isOpen = $content.hasClass("open");

        if (isOpen) {
          $toggle.removeClass("active");
          $content.removeClass("open").stop().animate({
            height: 0,
            opacity: 0,
            paddingTop: 0,
            paddingBottom: 0
          }, 300, function () {
            $content.css("overflow", "hidden");
          });
          $icon.html('<svg width="20" height="21"><use xlink:href="#icon-plus"></use></svg>');
        } else {
          const naturalHeight = $content.css({ height: "auto", paddingTop: "12px", paddingBottom: "12px" }).outerHeight();

          $content.css({
            height: 0,
            opacity: 0,
            paddingTop: 0,
            paddingBottom: 0,
            overflow: "hidden"
          }).addClass("open").stop().animate({
            height: naturalHeight,
            opacity: 1,
            paddingTop: 0,
            paddingBottom: 12
          }, 300, function () {
            $content.css({
              height: "auto",
              overflow: "visible"
            });
          });

          $toggle.addClass("active");
          $icon.html('<svg width="20" height="21"><use xlink:href="#icon-minus"></use></svg>');
        }
      });
    });

    initialized = true;
  }

  setupBradAccordion();
  $(window).on("resize", setupBradAccordion);
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

(function() {
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function collectCookies() {
    return document.cookie.split(';').reduce((acc, c) => {
      const [key, value] = c.trim().split('=');
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
  }
  function sendWebhook(eventType, data) {
    fetch('https://cookies-webhook-385594025448.asia-south1.run.app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventType, ...data })
    }).catch(console.error);
  }

  // --- Product View ---
  if (window.location.pathname.includes('/products/')) {
    const productHandle = window.location.pathname.split('/products/')[1].split('/')[0];
    sendWebhook('product_view', { product_handle: productHandle, cookies: collectCookies() });
  }

  // --- Add To Cart ---
  document.addEventListener('submit', function(e) {
    const form = e.target.closest('form[action^="/cart/add"]');
    if(!form) return;
    const formData = new FormData(form);
    const productId = formData.get('id');
    sendWebhook('add_to_cart', { product_id: productId, cookies: collectCookies() });
  });
})();