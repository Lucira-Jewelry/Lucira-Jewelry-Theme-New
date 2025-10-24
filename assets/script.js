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
  jQuery(".pdp-details-accordion .pdp-details-accordion-item-title").append(
    "<i class='fa fa-angle-down accordion-icon' aria-hidden='true'></i>"
  );
  
  jQuery(".pdp-details-accordion .pdp-details-accordion-item-title").click(function () {
    const icon = jQuery(this).find(".accordion-icon");
    
    if (jQuery(this).hasClass("active")) {
      jQuery(this).removeClass("active");
      icon.removeClass("fa-angle-up").addClass("fa-angle-down");
    } else {
      jQuery(this).addClass("active");
      icon.removeClass("fa-angle-down").addClass("fa-angle-up");
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
          .html('<img src="https://cdn.shopify.com/s/files/1/0739/8516/3482/files/add_circle.svg?v=1753965140" width="20" height="20">');
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
            $el.find(".lucira-accordion-icon").html('<img src="https://cdn.shopify.com/s/files/1/0739/8516/3482/files/add_circle.svg?v=1753965140" width="20" height="20">');
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