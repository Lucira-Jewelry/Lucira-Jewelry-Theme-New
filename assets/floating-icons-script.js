
  document.addEventListener('DOMContentLoaded', function () {

    // ── SalesIQ Badge Sync ─────────────────────────
    const fabMainBadge  = document.getElementById('fabMainBadge');
    const fabChatBadge  = document.getElementById('fabChatBadge');

    function syncBadge(count) {
      const show = count && parseInt(count) > 0;
      [fabMainBadge, fabChatBadge].forEach(function (el) {
        if (!el) return;
        el.textContent   = show ? count : '';
        el.style.display = show ? 'flex' : 'none';
      });
    }

    function watchZsiqIndicator() {
      const zsiqEl = document.getElementById('zsiq-indicator');
      if (!zsiqEl) {
        setTimeout(watchZsiqIndicator, 800);
        return;
      }

      syncBadge(zsiqEl.textContent.trim());

      const observer = new MutationObserver(function () {
        syncBadge(zsiqEl.textContent.trim());
      });

      observer.observe(zsiqEl, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }

    watchZsiqIndicator();


    // ── WhatsApp dataLayer ─────────────────────────
    const fabWhatsapp = document.getElementById('fabWhatsapp');

    if (fabWhatsapp) {
      fabWhatsapp.addEventListener('click', function () {

        const chatData = {
          promo_id: '{{ product.selected_or_first_available_variant.sku | default: "N/A" }}',
          promo_name: '{{ product.title | default: "General Inquiry" }}',
          creative_name: 'fabWhatsapp',
          location_id: '{{ request.path }}'
        };

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'promoClick',
          promoClick: chatData
        });

        console.log('FAB WhatsApp dataLayer pushed:', chatData);

      });
    }


    // ── Tooltip ─────────────────────────
    const fabTooltip = document.getElementById('fabTooltip');
    const fabMainBtn = document.getElementById('fabMain');

    let tooltipShown = false;

    setTimeout(function () {
      if (!tooltipShown && fabTooltip) {
        fabTooltip.classList.add('show');
      }
    }, 5000);

    if (fabMainBtn) {
      fabMainBtn.addEventListener('click', function () {
        tooltipShown = true;
        if (fabTooltip) fabTooltip.classList.remove('show');
      });
    }


    // ── FAB Toggle ─────────────────────────
    const fabMain    = document.getElementById('fabMain');
    const fabActions = document.getElementById('fabActions');

    if (fabMain && fabActions) {
      fabMain.addEventListener('click', function () {

        const isOpen = fabActions.classList.toggle('is-open');
        fabMain.classList.toggle('is-open', isOpen);

      });
    }

  });
