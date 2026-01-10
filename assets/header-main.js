document.addEventListener("DOMContentLoaded", function () {
  const menus = document.querySelectorAll(".mega-menu");
  const backdrop = document.getElementById("menu-backdrop");

  menus.forEach(menu => {
    const summary = menu.querySelector("summary");
    const content = menu.querySelector(".mega-menu__content");
    if (!summary || !content) return;

    let openTimeoutId;
    let closeTimeoutId;

    function openMenu() {
      clearTimeout(closeTimeoutId);
      menu.setAttribute("open", "true");

      const fullHeight = content.scrollHeight + "px";
      content.style.maxHeight = fullHeight;
      content.classList.add("active");

      if (backdrop) backdrop.classList.add("active");
    }

    function closeMenu() {
      clearTimeout(openTimeoutId);

      content.style.maxHeight = content.scrollHeight + "px"; // lock current height
      requestAnimationFrame(() => {
        content.style.maxHeight = "0"; // animate closed
      });
      content.classList.remove("active");

      closeTimeoutId = setTimeout(() => {
        menu.removeAttribute("open");
        const anyOpen = Array.from(document.querySelectorAll(".mega-menu"))
          .some(e => e.hasAttribute("open"));
        if (backdrop && !anyOpen) backdrop.classList.remove("active");
      }, 400); // match CSS transition
    }

    // --- EVENT LISTENERS ---
    summary.addEventListener("mouseenter", () => {
      clearTimeout(closeTimeoutId);
      openTimeoutId = setTimeout(openMenu, 200); // 👈 delay before open
    });

    summary.addEventListener("mouseleave", () => {
      clearTimeout(openTimeoutId); // cancel if user moves away too fast
    });

    content.addEventListener("mouseenter", () => {
      clearTimeout(closeTimeoutId);
    });

    menu.addEventListener("mouseleave", () => {
      closeTimeoutId = setTimeout(closeMenu, 200); // delay close for smoother UX
    });

    // prevent initial animation on load
    content.style.maxHeight = "0";
  });

  // ✅ close all menus when clicking on backdrop
  if (backdrop) {
    backdrop.addEventListener("click", function () {
      menus.forEach(menu => {
        const content = menu.querySelector(".mega-menu__content");
        if (content && menu.hasAttribute("open")) {
          content.style.maxHeight = content.scrollHeight + "px";
          requestAnimationFrame(() => {
            content.style.maxHeight = "0";
          });
          content.classList.remove("active");

          setTimeout(() => {
            menu.removeAttribute("open");
            backdrop.classList.remove("active");
          }, 400);
        }
      });
    });
  }
});


function switchMenu(newMenu) {
  const openMenu = document.querySelector(".mega-menu__content.active");
  if (openMenu && openMenu !== newMenu) {
    openMenu.classList.remove("active");
    openMenu.classList.add("leaving");

    setTimeout(() => {
      openMenu.classList.remove("leaving");
    }, 300); // match opacity transition
  }
  newMenu.classList.add("active");
}


let popupTimer;
let progressTimer;

let hasShownPopup = sessionStorage.getItem('popupShown') === 'true';
let hasBeenManuallyOpened = sessionStorage.getItem('popupManuallyOpened') === 'true';
let hasShownAutoPopupInSession = sessionStorage.getItem('autoPopupShownInSession') === 'true';

function isHomePage() {
  const path = window.location.pathname;
  return path === '/' || path === '/index.html' || path === '/home' || path === '';
}

function showPopup(withTimer = true, isHeaderClick = false, forceHeaderPosition = false) {
  const overlay = document.getElementById('popupOverlay');
  const progressBar = document.getElementById('progressBar');
  const progressContainer = document.querySelector('.progress-container');
  const iconButton = document.getElementById('popupIconButton');
  const popup = overlay.querySelector('.popup-container');

  const isMobile = window.innerWidth < 768;
  const useTopRight = forceHeaderPosition && !isMobile;

  if (forceHeaderPosition) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'promoClick',
      promoClick: {
        creative_name: 'Annocement Clicked'
      }
    });
  }

  if (useTopRight && popup) {
    popup.style.position = 'fixed';
    popup.style.top = '115px';
    popup.style.right = '80px';
    popup.style.left = 'auto';
    popup.style.transform = 'none';
    popup.style.margin = '0';
    popup.style.zIndex = '9999';
  } else if (popup) {
    popup.style.position = '';
    popup.style.top = '';
    popup.style.left = '';
    popup.style.right = '';
    popup.style.transform = '';
    popup.style.margin = '';
    popup.style.zIndex = '';
  }

  overlay.classList.add('active');
  document.body.classList.add('no-scroll'); // Disable background scroll

  if (iconButton) {
    iconButton.classList.add('active');
    iconButton.classList.add('opened'); // Add opened class
  }

  if (withTimer) {
    if (progressContainer) progressContainer.style.display = 'flex';
    progressBar.style.width = '0%';

    let progress = 0;
    const duration = 5000;
    const interval = 50;
    const increment = 100 / (duration / interval);

    progressTimer = setInterval(() => {
      progress += increment;
      progressBar.style.width = progress + '%';
      if (progress >= 100) {
        clearInterval(progressTimer);
        setTimeout(() => closePopup(), 200);
      }
    }, interval);
  } else {
    if (progressContainer) progressContainer.style.display = 'none';
    progressBar.style.width = '0%';
  }
}

function closePopup() {
  const overlay = document.getElementById('popupOverlay');
  const iconButton = document.getElementById('popupIconButton');
  overlay.classList.remove('active');
  document.body.classList.remove('no-scroll'); // Re-enable scroll

  if (iconButton) {
    iconButton.classList.remove('active');
    iconButton.classList.remove('opened'); // Remove opened class
  }

  clearTimeout(popupTimer);
  clearInterval(progressTimer);
}

function togglePopup() {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "promoClick",
    promoClick: {
      creative_name: "Announcement Popup Clicked",
      promo_position: "Header Announcement"
    }
  });

  const overlay = document.getElementById('popupOverlay');
  const isActive = overlay.classList.contains('active');

  if (isActive) {
    closePopup();
  } else {
    hasBeenManuallyOpened = true;
    sessionStorage.setItem('popupManuallyOpened', 'true');
    hasShownPopup = true;
    sessionStorage.setItem('popupShown', 'true');

    showPopup(false);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const iconButton = document.getElementById('popupIconButton');

  if (iconButton) {
    iconButton.style.display = 'none';
    iconButton.style.visibility = 'hidden';
    iconButton.style.opacity = '0';
  }

  const popupOverlay = document.getElementById('popupOverlay');
  if (popupOverlay) {
    popupOverlay.addEventListener('click', function (e) {
      if (e.target === this) closePopup();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePopup();
  });

  window.addEventListener('scroll', function () {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const isPopupActive = document.getElementById('popupOverlay')?.classList.contains('active');

    if (scrollY >= 2000) {
      if (iconButton) {
        iconButton.style.display = 'flex';
        iconButton.style.visibility = 'visible';
        iconButton.style.opacity = '1';
      }

      // autopopup on scroll removed per request:
      // no automatic showPopup here anymore
    } else {
      if (iconButton) {
        iconButton.style.display = 'none';
        iconButton.style.visibility = 'hidden';
        iconButton.style.opacity = '0';
      }

      // nothing related to lottie or auto-popup
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const stickyHeader = document.querySelector("sticky-header");

  if (stickyHeader) {
    window.addEventListener("scroll", function () {
      if (window.scrollY > 50) { 
        stickyHeader.classList.add("sticky-header");
      } else {
        stickyHeader.classList.remove("sticky-header");
      }
    });
  }
});

