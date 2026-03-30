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

