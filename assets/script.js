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
  jQuery(".accordion .accordion-title").append(
    "<i class='fa fa-plus accordion-icon' aria-hidden='true'></i>"
  );
  
  jQuery(".accordion .accordion-title").click(function () {
    const icon = jQuery(this).find(".accordion-icon");
    
    if (jQuery(this).hasClass("active")) {
      jQuery(this).removeClass("active");
    } else {
      jQuery(this).addClass("active");
    }
    
    jQuery(this).next(".accordion .accordion-content").slideToggle();
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
          .html('<img src="https://cdn.shopify.com/s/files/1/0739/8516/3482/files/add_circle.svg?v=1753965140" width="auto" height="auto">');
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
        $icon.html('<img src="https://cdn.shopify.com/s/files/1/0739/8516/3482/files/add_circle.svg?v=1753965140" width="auto" height="auto">');
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
            $el.find(".lucira-accordion-icon").html('<img src="https://cdn.shopify.com/s/files/1/0739/8516/3482/files/add_circle.svg?v=1753965140" width="auto" height="auto">');
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
          $icon.html('<img src="https://cdn.shopify.com/s/files/1/0739/8516/3482/files/add_circle.svg?v=1753965140" width="auto" height="auto">');
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
          $icon.html('<img src="https://cdn.shopify.com/s/files/1/0739/8516/3482/files/minus.svg?v=1753965750" width="auto" height="auto">');
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
    prevArrow: '<img class="pdp-match-shine-slider-btn" src="{{ 'plp-banner-left-arrow.svg' | asset_url }}" height="auto" width="auto" alt="prev">',
    nextArrow: '<img class="pdp-match-shine-slider-btn" src="{{ 'plp-banner-right-arrow.svg' | asset_url }}" height="auto" width="auto" alt="next">',
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