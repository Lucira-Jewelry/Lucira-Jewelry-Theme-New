
document.addEventListener("DOMContentLoaded", function () {

  function s(n){ return isFinite(Number(n)) ? Number(n) : 0; }

  function fmt(v){ 
  try {
    return Number(v).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  } catch (e) {
    return String(v);
  }
}


  function getLS(k){ 
    try {
      var r = localStorage.getItem(k); 
      return r ? JSON.parse(r) : null;
    } catch(e){
      return null;
    }
  }

  function readCharm(){ 
    var c = getLS('charm_cart_v1') || getLS('charm_cart') || {};
    if (c.totals) return { metal: s(c.totals.metal), diamond: s(c.totals.diamond), price:0 };

    var m=0, d=0, p=0;
    var it=c.items || {};

    for (var id in it){
      if (!it.hasOwnProperty(id)) continue;
      var o=it[id];
      var q=parseInt(o.qty||0,10)||0;

      m += s(o.metalPerUnit)*q;
      d += s(o.diamondPerUnit)*q;
      p += (o.price ? s(o.price) : (o.price_cents ? s(o.price_cents)/100 : 0)) * q;
    }
    return { metal:m, diamond:d, price:p };
  }

  function readBase(){
    var keys=[
      'SelectedVariantCombinedTotals',
      'SelectedVariantCombined',
      'SelectedVariant',
      'SelectedVariantLabel'
    ];

    for (var i=0; i<keys.length; i++){
      var o=getLS(keys[i]);
      if (!o) continue;

      if (o.base){
        return {
          metal: s(o.base.metal_weight_num || o.base.metal_num || o.base.metal || o.base.metal_weight),
          diamond: s(o.base.diamond_1_weight_num || o.base.diamond_num || o.base.diamond || o.base.diamond_1_weight),
          variantId: o.variant_id || o.id || null,
          image: o.base.image || o.image || null,
          title: o.title || o.product_name || null
        };
      }

      if (o.metal_weight_num || o.diamond_1_weight_num || o.metal_weight || o.diamond_1_weight){
        return {
          metal: s(o.metal_weight_num || o.metal_weight),
          diamond: s(o.diamond_1_weight_num || o.diamond_1_weight),
          variantId: o.variant_id || o.id || null,
          image: o.image || null,
          title: o.title || null
        };
      }
    }

    return { metal:0, diamond:0, variantId:null, image:null, title:null };
  }

  function readBreakdown(){ 
    var b = getLS('lucira_price_breakdown'); 
    if (!b) return null;

    if (b.baseCents !== undefined || b.charmsCents !== undefined)
      return { base:s(b.baseCents)/100, charms:s(b.charmsCents)/100, total:s(b.totalCents)/100 };

    if (b.base !== undefined || b.charms !== undefined)
      return { base:s(b.base), charms:s(b.charms), total:s(b.total || b.base + b.charms) };

    if (b.base_price !== undefined || b.charms_price !== undefined)
      return { base:s(b.base_price), charms:s(b.charms_price), total:s(b.total_price || b.base_price + b.charms_price) };

    return null;
  }

  function readVariantImageFromPage(id){
    try {
      if (!id) return null;

      var n=document.getElementById('variant-meta-' + id);
      if (!n) return null;

      var p = JSON.parse(n.textContent || n.innerText || '{}');
      if (p.image){
        var im=p.image;
        if (im.indexOf('//') === 0) im = window.location.protocol + im;
        return im;
      }

    } catch(e){}
    return null;
  }

  // DOM refs
  var backdrop=document.getElementById('lucira-drawer-backdrop');
  var drawer=document.getElementById('lucira-drawer');
  var closeBtn=document.getElementById('lucira-drawer-close');

  var imgEl=document.getElementById('lucira-variant-img');
  var titleEl=document.getElementById('lucira-variant-title');
  var subEl=document.getElementById('lucira-variant-sub');

  var metalEl=document.getElementById('lucira-metal-value');
  var diamondEl=document.getElementById('lucira-diamond-value');

  var basePriceEl=document.getElementById('lucira-base-price');
  var charmsPriceEl=document.getElementById('lucira-charms-price');
  var totalPriceEl=document.getElementById('lucira-total-price');

  function populate(){
    var charm = readCharm();
    var base = readBase();

    var totalMetal = s(base.metal) + s(charm.metal);
    var totalDiamond = s(base.diamond) + s(charm.diamond);

    if (metalEl) metalEl.textContent = totalMetal.toFixed(3);
    if (diamondEl) diamondEl.textContent = totalDiamond.toFixed(3);

    var breakdown = readBreakdown();
    var basePrice = 0;
    var charmsPrice = 0;

    if (breakdown){
      basePrice = breakdown.base;
      charmsPrice = breakdown.charms;
    } else {
      basePrice = getLS('SelectedVariantCombinedTotals')?.base?.price || 
                  getLS('SelectedVariant')?.basePrice || 0;
      charmsPrice = charm.price || 0;
    }

    if (imgEl) imgEl.src = base.image || readVariantImageFromPage(base.variantId) || imgEl.src;
    if (titleEl) titleEl.textContent = base.title || 'Selected product';
    if (subEl) subEl.textContent = base.variantId ? ('Variant: ' + base.variantId) : '';

    if (basePriceEl) basePriceEl.textContent = basePrice ? fmt(basePrice) : '-';
    if (charmsPriceEl) charmsPriceEl.textContent = charmsPrice ? fmt(charmsPrice) : '-';
    if (totalPriceEl) totalPriceEl.textContent = (s(basePrice)+s(charmsPrice)) ? fmt(s(basePrice)+s(charmsPrice)) : '-';
  }

  if (!backdrop || !drawer) return;

  function openDrawer(){
    backdrop.style.display = 'flex';
    setTimeout(() => drawer.classList.add('open'), 20);
    setTimeout(populate, 30);
  }

  function closeDrawer(){
    drawer.classList.remove('open');
    setTimeout(() => backdrop.style.display='none', 280);
  }

  document.body.addEventListener('click', function(e){
    if (e.target.closest('.cta-footer, #lf-total-cta')){
      e.preventDefault();
      openDrawer();
    }
  }, {passive:true});

  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

  backdrop.addEventListener('click', function(e){
    if (e.target === backdrop) closeDrawer();
  });

  window.luciraDrawerRefresh = populate;
  window.luciraOpenDrawer = openDrawer;
  window.luciraCloseDrawer = closeDrawer;

  document.addEventListener('charmCartUpdated', populate);
  document.addEventListener('SelectedVariantChanged', populate);

});

function sendToCart() {
  const groupId = `grp_${Date.now()}`;

  console.log("clicked");
 function getFinalItemsArray() {
  const items = [];
  const charm = JSON.parse(localStorage.getItem("charm_cart_v1") || "{}");
  const baseObj = JSON.parse(localStorage.getItem("SelectedVariant") || "null");

  // ================= CHILD ITEMS (CHARMS) =================
  if (charm.items) {
    Object.keys(charm.items).forEach((id) => {
      const qty = parseInt(charm.items[id].qty || 0, 10);

      if (qty > 0) {
        items.push({
          id: Number(id),
          quantity: qty,
          properties: {
            _group_id: groupId,
            _item_role: "child",
          },
        });
      }
    });
  }

  // ================= PARENT ITEM (CHAIN) =================
  if (baseObj) {
    items.push({
      id: Number(baseObj),
      quantity: 1,
      properties: {
        _group_id: groupId,
        _item_role: "parent",
      },
    });
  }

  return items;
}


  const items = getFinalItemsArray();
//   console.log("Final items:", items);

  fetch("/cart/add.js", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }), 
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Products added:", data);
      fetch("/cart?section_id=cart-drawer")
        .then((response) => response.text())
        .then((html) => {
          const parser = new DOMParser();
          const newDoc = parser.parseFromString(html, "text/html");

          const newDrawer = newDoc.querySelector("#CartDrawer");
          const currentDrawer = document.querySelector("#CartDrawer");
        //   console.log('306', currentDrawer, newDrawer)

          if (currentDrawer && newDrawer) {
            currentDrawer.innerHTML = newDrawer.innerHTML;
          }

          document.querySelector("cart-drawer")?.classList.add("is-open");
          document.querySelector("cart-drawer")?.classList.remove("is-empty");
          document.querySelector("cart-drawer")?.classList.add("active");
          document.querySelector('.drawer__inner').style.transform = 'translateX(0)';
          document.body.classList.add("overflow-hidden");
        })
        .catch((err) => console.error("Error updating cart drawer:", err));
    })
    .catch((err) => console.error("Add to cart error:", err));
}
