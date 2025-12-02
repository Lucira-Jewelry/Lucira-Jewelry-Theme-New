

document.addEventListener('DOMContentLoaded', function () {
  document.body.addEventListener('click', function (e) {
    if (!e.target.closest('.select-class')) return;
    const step2 = document.querySelector('.progress-steps.svg-steps .step[data-step="2"]');
    const tpl   = document.getElementById('svg-check');
    if (step2 && tpl) {
      step2.innerHTML = '';
      step2.append(tpl.content.cloneNode(true));
      step2.dataset.svg = 'check';
      step2.classList.add('is-complete');
    }
  }, { passive: true });
});
document.body.addEventListener('click', function (evt) {
  if (evt.target.closest('.select-class')) {
    window.progressSteps.complete(2);
    document.querySelector('.progress-steps.svg-steps')
      ?.classList.add('step-2-done');
  }
});
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('carat-section-{{ section.id }}');
  if (!root) return;

  const caratBtns = Array.from(root.querySelectorAll('.carat-filter-btn'));
  const panels = Array.from(root.querySelectorAll('.carat-panel'));

  function ensureActivePanel() {
    let active = root.querySelector('.carat-panel.active');
    if (!active && panels.length) {
      panels.forEach(p => p.classList.remove('active'));
      panels[0].classList.add('active');
      active = panels[0];
    }
    return active;
  }

  function getActivePanel() {
    return root.querySelector('.carat-panel.active') || ensureActivePanel();
  }

  function applyCaratFilter(carat){
    if (carat == null) return;
    caratBtns.forEach(b => b.classList.toggle('active', b.dataset.carat == carat));
    const panel = getActivePanel();
    if (!panel) return;
    const cards = Array.from(panel.querySelectorAll('.carat-item'));
    cards.forEach(card => {
      const groups = Array.from(card.querySelectorAll('.color-group'));
      let anyShown = false;
      groups.forEach(g => {
        const match = (g.dataset.carat == carat);
        g.style.display = match ? '' : 'none';
        if (match) anyShown = true;
      });
      if (!anyShown && groups.length) {
        groups.forEach((g, i) => g.style.display = i === 0 ? '' : 'none');
      }
      const shownGroup = card.querySelector(`.color-group[data-carat="${carat}"]`);
      const firstSwatch = shownGroup ? shownGroup.querySelector('.color-option') : null;
      const imgEl = card.querySelector('.product-img');
      const priceEl = card.querySelector('.price-text');
      if (firstSwatch) {
        const newSrc = firstSwatch.dataset.imageSrc;
        const newAlt = firstSwatch.dataset.imageAlt;
        const newPrice = firstSwatch.dataset.price;
        if (imgEl && newSrc) {
          imgEl.setAttribute('src', newSrc);
          if (newAlt) imgEl.setAttribute('alt', newAlt);
        }
        if (priceEl && newPrice) priceEl.textContent = newPrice;
      }
      const selectBtn = card.querySelector('.select-class');
      if (selectBtn) selectBtn.dataset.carat = carat;
    });
  }

  function switchToHandle(handle){
    if (!handle) return false;
    let matched = null;
    panels.forEach(p => { if (p.dataset.handle === handle) matched = p; });
    if (!matched) return false;
    panels.forEach(p => p.classList.remove('active'));
    matched.classList.add('active');
    const activeCarat = root.querySelector('.carat-filter-btn.active')?.dataset.carat || caratBtns[0]?.dataset.carat || '9KT';
    applyCaratFilter(activeCarat);
    return true;
  }

  caratBtns.forEach(btn => btn.addEventListener('click', () => {
    applyCaratFilter(btn.dataset.carat);
  }));

  const qs = new URLSearchParams(location.search);
  const urlHandle = (qs.get('collection') || '').trim();
  let lsHandle = null; try{ lsHandle = localStorage.getItem('selected_chain_type'); }catch(_){}
  const initialHandle = urlHandle || lsHandle || null;

  if (initialHandle) {
    const ok = switchToHandle(initialHandle);
    if (!ok) {
      ensureActivePanel();
      applyCaratFilter(root.querySelector('.carat-filter-btn.active')?.dataset.carat || caratBtns[0]?.dataset.carat || '9KT');
    }
  } else {
    ensureActivePanel();
    applyCaratFilter(root.querySelector('.carat-filter-btn.active')?.dataset.carat || caratBtns[0]?.dataset.carat || '9KT');
  }

  root.addEventListener('click', e => {
    const sw = e.target.closest('.color-option');
    if (!sw) return;
    const card = sw.closest('.carat-item'); if (!card) return;
    sw.closest('.color-group')?.querySelectorAll('.color-option').forEach(b=>b.classList.remove('active'));
    sw.classList.add('active');
    const imgEl = card.querySelector('.product-img');
    const priceEl = card.querySelector('.price-text');
    if (imgEl && sw.dataset.imageSrc) imgEl.src = sw.dataset.imageSrc;
    if (priceEl && sw.dataset.price)  priceEl.textContent = sw.dataset.price;
  }, { passive: true });
});

document.addEventListener('DOMContentLoaded', function(){
  var root = document.getElementById('carat-section-{{ section.id }}');
  if (!root) return;

  function safeParse(id){
    try { var n = document.getElementById(id); return n? JSON.parse(n.textContent||n.innerText||'{}') : {}; } catch(e){ return {}; }
  }

  function findVariantId(card){
    if (!card) return null;
    var sw = card.querySelector('.color-group .color-option.active') || card.querySelector('.color-group .color-option');
    if (sw){
      var d = sw.getAttribute('data-variant-id') || sw.dataset.variantId;
      if (d) return String(d);
    }
    // fallback: match carat+color in product-data-<pid>
    var pid = card.getAttribute('data-product-id');
    var selectBtn = card.querySelector('.select-class');
    var carat = selectBtn && selectBtn.dataset.carat ? selectBtn.dataset.carat : (sw && (sw.getAttribute('data-carat')||sw.dataset.carat));
    var color = sw && (sw.getAttribute('data-color')||sw.dataset.color);
    if (!pid || !carat || !color) return null;
    try {
      var prod = safeParse('product-data-' + pid);
      if (!prod || !Array.isArray(prod.variants)) return null;
      carat = String(carat).toUpperCase(); color = String(color).toUpperCase();
      for (var i=0;i<prod.variants.length;i++){
        var v = prod.variants[i]; if (!v || !v.title) continue;
        var t = String(v.title).toUpperCase();
        if (t.indexOf(carat)!==-1 && t.indexOf(color)!==-1) return String(v.id);
      }
    } catch(e){ return null; }
    return null;
  }

  function findVariantData(variantId, productId){
    var out = { image: null, title: null };
    if (variantId){
      var v = safeParse('variant-meta-' + variantId) || safeParse('product-json-' + variantId);
      if (v && (v.image || v.featured_image || v.title)) {
        out.image = v.image || v.featured_image || null;
        out.title = v.title || v.name || null;
        if (out.image && out.image.indexOf('//')===0) out.image = window.location.protocol + out.image;
        return out;
      }
    }
    if (productId){
      var p = safeParse('product-data-' + productId);
      if (p && Array.isArray(p.variants)){
        for (var i=0;i<p.variants.length;i++){
          var vv = p.variants[i];
          if (!vv) continue;
          if (String(vv.id) === String(variantId)){
            out.image = (vv.featured_image && (vv.featured_image.src||vv.featured_image)) || vv.image || null;
            out.title = vv.title || vv.name || null;
            if (out.image && out.image.indexOf('//')===0) out.image = window.location.protocol + out.image;
            return out;
          }
        }
      }
    }
    return out;
  }

  function parseMf(productId){
    var m = safeParse('product-mf-' + productId);
    return m.variant_metafields || {};
  }

  function updateUI(img, title, sub){
    try {
      var i = document.getElementById('lucira-variant-img');
      var t = document.getElementById('lucira-variant-title');
      var s = document.getElementById('lucira-variant-sub');
      if (i && img) i.src = img;
      if (t && title) t.textContent = title;
      if (s && sub) s.textContent = sub;
    } catch(e){}
  }

  root.addEventListener('click', function(e){
    var btn = e.target.closest && e.target.closest('.select-class');
    if (!btn) return;
    var card = btn.closest && btn.closest('.carat-item');
    if (!card) return;

    var pid = card.getAttribute('data-product-id') || '';
    var vid = findVariantId(card);
    let cardTitle = card.querySelector('.carat-title').innerText.replace(/\s+/g, '');
    {% comment %} console.log('380------------------------', vid, card.querySelector('.carat-title').innerText.replace(/\s+/g, '')); {% endcomment %}
    if (!vid){
      try { localStorage.setItem('SelectedProductFallback', JSON.stringify({ product_id: pid, selected_carat: btn.dataset.carat||null })); } catch(e){}
      return;
    }

    var mfMap = parseMf(pid);
    var mf = mfMap[String(vid)] || {};

    var vd = findVariantData(vid, pid);
    var payload = {
      id: String(vid),
      product_id: String(pid||''),
      diamond_1_weight: (mf.diamond_1_weight && (mf.diamond_1_weight.value || mf.diamond_1_weight)) || null,
      metal_weight: (mf.metal_weight && (mf.metal_weight.value || mf.metal_weight)) || null,
      image: vd.image || null,
      title: vd.title || null
    };

    try { localStorage.setItem('SelectedVariant', JSON.stringify(payload)); } catch(e){ console.error(e); }
    try { localStorage.setItem('SelectedVariantTitle', cardTitle); } catch(e){ console.error(e); }

    var label = {
      product_id: pid,
      variant_id: String(vid),
      carat: btn.dataset.carat || null,
      diamond_1_weight: payload.diamond_1_weight,
      metal_weight: payload.metal_weight,
      image: payload.image,
      title: payload.title
    };
    try { localStorage.setItem('SelectedVariantLabel', JSON.stringify(label)); } catch(e){}

    updateUI(payload.image, payload.title, label.variant_id ? ('Variant: '+label.variant_id) : ('Product: '+(label.product_id||'')));
  }, { passive: true });

});