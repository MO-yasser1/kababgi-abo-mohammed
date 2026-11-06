/* =====================================================================
   render.js — كل كود العرض لتصميم "القوس الذهبي" (كبابجي أبو محمد)
   - يستخدم MenuEngine فقط: لا أسعار ولا سلة ولا رسائل هنا.
   - كل نص من البيانات يُعرض بـ textContent (عبر h())، ولا يوجد بناء من نص HTML.
   - لا توجد قيم ألوان هنا: الألوان كلها في متغيرات style.css.
   وسائل معاينة (ليست جزءًا من المحرك): ?theme=light|dark  و ?nointro (بدون المقدمة) و ?t=7 (ترابيزة)
   ===================================================================== */
(function () {
  'use strict';

  /* نصوص زينة إنجليزية خاصة بهذا التصميم (من المنيو المطبوع) */
  var DECOR = { name: 'KABABGI ABO MOHAMMED', line: 'ORIENTAL DISHES AND GRILLED', slogan: 'KINGS OF ORIENTAL FOOD' };

  var params = new URLSearchParams(location.search);
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var app = null, ready = false, minDone = true, adjustMsg = '', suppressSync = false;
  var prevCount = 0;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- أدوات DOM (نصوص آمنة) ---------- */
  function h(tag, props) {
    var el = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v);
      else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'readOnly') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x) el.appendChild(typeof x === 'object' ? x : document.createTextNode(String(x))); });
      else el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  function clear(el) { while (el && el.firstChild) el.removeChild(el.firstChild); return el; }
  function tabLabel(name) { return name.replace(/^ركن\s+/, ''); }

  /* ---------- الشكل (فاتح/داكن) ---------- */
  var th = params.get('theme');
  if (th === 'light' || th === 'dark') document.documentElement.setAttribute('data-theme', th);
  function syncThemeColor() {
    var m = document.querySelector('meta[name=theme-color]');
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    m.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  }
  syncThemeColor();

  /* ---------- شاشة التحميل والمقدمة ---------- */
  var screenEl = $('screen');
  var introSeen = false;
  try { introSeen = sessionStorage.getItem('abm-intro') === '1'; } catch (e) { /* بدون تخزين */ }
  var splash = !reduce && !introSeen && !params.has('nointro');
  if (splash) {
    screenEl.classList.remove('loading'); screenEl.classList.add('splash');
    $('screen-text').textContent = 'ملوك الأكل الشرقي';
    minDone = false;
    setTimeout(function () { minDone = true; reveal(); }, 2100);
    screenEl.addEventListener('click', function () { minDone = true; reveal(); });
    try { sessionStorage.setItem('abm-intro', '1'); } catch (e) { /* بدون تخزين */ }
  }
  function reveal() {
    if (!ready || !minDone) return;
    screenEl.classList.add('out');
    screenEl.setAttribute('data-state', 'done');
    setTimeout(function () { screenEl.classList.add('hidden'); }, 520);
  }
  function showFatal(message) {
    screenEl.classList.remove('splash', 'loading', 'out', 'hidden');
    screenEl.setAttribute('data-state', 'error');
    clear(screenEl);
    screenEl.appendChild(h('div', { class: 'screen-error' },
      h('h1', { class: 'sec-title' }, 'تعذر فتح المنيو'),
      h('p', { id: 'fatal-msg' }, message),
      h('p', {}, h('button', { type: 'button', class: 'btn btn-gold', onclick: function () { location.reload(); } }, 'جرّب مرة أخرى'))));
  }

  MenuEngine.init(window.MENU_CONFIG).then(function (a) {
    app = a;
    // الاشتراك فورًا بعد init حتى لا يفوتنا تنبيه تعارض السلة المحفوظة
    app.on('cart-adjusted', onAdjusted);
    app.on('menu', onMenu);
    app.on('change', onChange);
    app.on('error', function () { /* فشل تحديث صامت: النسخة المحفوظة معروضة */ });
    build();
    ready = true;
    $('app').setAttribute('aria-busy', 'false');
    $('app').setAttribute('data-state', 'ready');
    reveal();
    setInterval(renderStatus, 30000);
  }, function (e) { showFatal(e && e.message ? e.message : 'حصلت مشكلة غير متوقعة.'); });

  /* ====================== بناء الصفحة ====================== */
  var refs = {};

  function priceNode(item) {
    var p = app.priceInfo(item), cur = app.restaurant.currency;
    if (p.price === null) return h('span', { class: 'price-note' }, p.note);
    return h('span', { class: 'price' },
      p.from ? h('small', {}, 'من ') : null,
      p.oldPrice ? h('s', {}, app.fmt(p.oldPrice)) : null,
      app.fmt(p.price), h('small', {}, cur));
  }

  function build() {
    var r = app.restaurant;
    document.title = r.name + ' — المنيو';
    if (r.logo) document.documentElement.style.setProperty('--seal-mask', 'url("' + r.logo + '")');
    var root = clear($('app'));
    refs = { cartRefs: refs.cartRefs || null };   // نحتفظ بمراجع شاشة السلة لو كانت مفتوحة

    var ann = app.announcement();
    if (ann) root.appendChild(h('div', { class: 'announce', id: 'announce' }, ann));

    root.appendChild(buildHero(r));
    refs.closed = h('div', { id: 'closed-slot' });
    root.appendChild(refs.closed);

    if (app.menu.itemCount === 0) {
      root.appendChild(h('div', { class: 'wrap' }, h('div', { class: 'empty-menu', id: 'empty-menu' },
        h('h2', { class: 'sec-title' }, 'المنيو قيد التحديث'), h('p', {}, 'لا توجد أصناف متاحة الآن. جرّب بعد قليل.'))));
    } else {
      if (app.searchEnabled()) root.appendChild(buildSearch());
      root.appendChild(buildTabs());
      refs.menu = h('main', { id: 'menu', class: 'wrap' });
      app.menu.categories.forEach(function (c) { refs.menu.appendChild(buildSection(c)); });
      root.appendChild(refs.menu);
      if (refs.results) root.appendChild(refs.results);   // نتائج البحث (مخفية حتى يكتب العميل)
    }
    root.appendChild(buildFooter(r));
    root.appendChild(buildCartBar());
    renderStatus();
    updateBar(true);
    setupScrollSpy();
  }

  function buildHero(r) {
    var hero = h('header', { class: 'hero' });
    var hasArt = r.cover || r.logo;
    var nameEl = h('h1', { class: r.logo ? 'sr-only' : 'sec-title', id: 'rest-name' }, r.name);
    if (hasArt) {
      var arch = h('div', { class: 'arch' });
      var imgBox = h('div', { class: 'arch-img' });
      if (r.cover) imgBox.appendChild(h('img', { src: r.cover, alt: '', width: '1000', height: '750', fetchpriority: 'high', onerror: function (e) { e.target.remove(); } }));
      arch.appendChild(imgBox);
      arch.appendChild($('tpl-arch-frame').content.cloneNode(true));
      if (r.logo) {
        arch.appendChild(h('div', { class: 'seal-wrap' },
          h('img', { src: r.logo, alt: r.name, width: '560', height: '560', onerror: function (e) { e.target.remove(); nameEl.className = 'sec-title'; } })));
      }
      hero.appendChild(arch);
    }
    hero.appendChild(nameEl);
    if (r.tagline) hero.appendChild(h('p', { class: 'hero-tagline', id: 'rest-tagline' }, r.tagline));
    hero.appendChild(h('p', { class: 'hero-en', 'aria-hidden': 'true' }, DECOR.line));
    refs.status = h('div', { class: 'hero-status', id: 'status-slot' });
    hero.appendChild(refs.status);
    return hero;
  }

  /* ---------- حالة المطعم ---------- */
  function closedState() {
    var s = app.status();
    return { s: s, blocked: s.open === false && !app.restaurant.allowOrderWhenClosed };
  }
  function reopenText(s) { return s.nextChange ? ' يفتح ' + s.nextChange.dayLabel + ' ' + s.nextChange.label + '.' : ''; }
  function renderStatus() {
    if (!app) return;
    var cs = closedState(), s = cs.s;
    if (refs.status) clear(refs.status).appendChild(s.open === null ? document.createTextNode('') :
      h('span', { class: 'status-chip', id: 'status-text', 'data-open': String(s.open) }, s.message));
    if (refs.closed) {
      clear(refs.closed);
      if (s.open === false) {
        refs.closed.appendChild(h('div', { class: 'closed-banner', id: 'closed-banner', role: 'status' },
          cs.blocked ? 'المطعم مغلق الآن ولا يستقبل طلبات.' + reopenText(s) : 'المطعم مغلق الآن، لكن يمكنك إرسال طلب مسبق.' + reopenText(s)));
      }
    }
    updateSendState();
  }

  /* ---------- البحث ---------- */
  function buildSearch() {
    var results = h('main', { id: 'results', class: 'wrap hidden', 'aria-live': 'polite' });
    refs.results = results;
    var input = h('input', {
      type: 'search', id: 'search-input', placeholder: 'ابحث في المنيو… (مثال: كفتة، مندي)', 'aria-label': 'بحث في المنيو', autocomplete: 'off',
      oninput: function () { runSearch(input.value); }
    });
    return h('div', { class: 'wrap search' }, h('div', { class: 'search-field' }, input));
  }
  function runSearch(q) {
    var active = q.trim() !== '';
    refs.results.classList.toggle('hidden', !active);
    if (refs.tabsEl) refs.tabsEl.classList.toggle('hidden', active);
    refs.menu.classList.toggle('hidden', active);
    clear(refs.results);
    if (!active) return;
    var res = app.search(q);
    if (!res.length) { refs.results.appendChild(h('p', { class: 'empty', id: 'no-results' }, 'لا توجد نتائج لـ "' + q.trim() + '". جرّب كلمة أخرى.')); return; }
    refs.results.appendChild(h('p', { class: 'hint', style: 'padding-top:12px' }, res.length + ' نتيجة'));
    var ul = h('ul', { class: 'items' });
    res.forEach(function (it) { ul.appendChild(itemRow(it, true)); });
    refs.results.appendChild(ul);
  }

  /* ---------- شريط الأقسام ---------- */
  function buildTabs() {
    var track = h('div', { class: 'tabs-track' });
    refs.tabBtns = {};
    app.menu.categories.forEach(function (c) {
      var b = h('button', {
        type: 'button', class: 'tab', 'data-tab': c.id, onclick: function () {
          var sec = $('sec-' + c.id);
          if (sec) sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        }
      }, tabLabel(c.name));
      refs.tabBtns[c.id] = b; track.appendChild(b);
    });
    refs.ind = h('span', { class: 'tab-ind' });
    track.appendChild(refs.ind);
    refs.tabScroll = h('div', { class: 'tabs-scroll' }, track);
    refs.tabsEl = h('nav', { class: 'tabs', 'aria-label': 'أقسام المنيو' }, refs.tabScroll);
    return refs.tabsEl;
  }
  var activeCat = '';
  function setActive(id) {
    if (!id || id === activeCat || !refs.tabBtns) return;
    activeCat = id;
    Object.keys(refs.tabBtns).forEach(function (k) {
      if (k === id) refs.tabBtns[k].setAttribute('aria-current', 'true'); else refs.tabBtns[k].removeAttribute('aria-current');
    });
    var b = refs.tabBtns[id];
    refs.ind.style.width = b.offsetWidth + 'px';
    refs.ind.style.transform = 'translateX(' + b.offsetLeft + 'px)';
    if (b.scrollIntoView) b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }
  var spyBound = false, ticking = false;
  function setupScrollSpy() {
    activeCat = '';
    if (!refs.tabBtns) return;
    var cats = app.menu.categories;
    function update() {
      ticking = false;
      if (refs.menu.classList.contains('hidden')) return;
      var limit = 56 + 24, cur = cats[0].id;
      for (var i = 0; i < cats.length; i++) {
        var el = $('sec-' + cats[i].id);
        if (el && el.getBoundingClientRect().top <= limit) cur = cats[i].id;
      }
      setActive(cur);
    }
    if (!spyBound) {
      spyBound = true;
      window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
      window.addEventListener('resize', function () { var c = activeCat; activeCat = ''; setActive(c); });
    }
    refs.spy = update;
    update();
  }

  function buildSection(c) {
    var head = h('div', { class: 'sec-head' }, h('h2', { class: 'sec-title' }, c.name));
    if (c.note) head.appendChild(h('p', { class: 'sec-note', 'data-note': c.id }, c.note));
    head.appendChild(h('div', { class: 'orn', 'aria-hidden': 'true' }, h('i')));
    var ul = h('ul', { class: 'items' });
    c.items.forEach(function (it) { ul.appendChild(itemRow(it, false)); });
    return h('section', { class: 'menu-section', id: 'sec-' + c.id, 'aria-labelledby': 'h-' + c.id }, head, ul);
  }

  /* ---------- صف الصنف ---------- */
  function itemRow(item, showCat) {
    var li = h('li', { class: 'item' + (item.available ? '' : ' off'), 'data-item': item.id });
    var row = h('div', { class: 'item-row' });
    if (item.image) {
      row.appendChild(h('div', { class: 'thumb' }, h('img', { src: item.image, alt: '', loading: 'lazy', width: '64', height: '76', onerror: function (e) { e.target.parentNode.remove(); } })));
    }
    var body = h('div', { class: 'item-body' });
    var line = h('div', { class: 'item-line' });
    var nameEl = item.available
      ? h('button', { type: 'button', class: 'item-name', 'aria-haspopup': 'dialog', onclick: function (e) { openDetail(item, '', e.currentTarget); } }, item.name)
      : h('span', { class: 'item-name' }, item.name);
    line.appendChild(nameEl);
    if (item.badges.length) {
      line.appendChild(h('span', { class: 'badges' }, item.badges.map(function (b) { return h('span', { class: 'badge', 'data-badge': b }, app.badgeLabel(b)); })));
    }
    if (item.pricingMode !== 'variants' || !item.available) line.appendChild(h('span', { class: 'leader', 'aria-hidden': 'true' }));
    if (!item.available) line.appendChild(h('span', { class: 'off-label' }, 'غير متاح'));
    else if (item.pricingMode !== 'variants') {
      line.appendChild(priceNode(item));
      line.appendChild(h('button', {
        type: 'button', class: 'icon-btn', 'aria-label': 'أضف ' + item.name + ' للسلة',
        onclick: function (e) {
          if (item.needsChoice) openDetail(item, '', e.currentTarget);
          else quickAdd(item, '', e.currentTarget);
        }
      }, '+'));
    }
    body.appendChild(line);
    if (showCat) body.appendChild(h('p', { class: 'hint' }, item.categoryName));
    if (item.desc) {
      var d = h('p', { class: 'item-desc' }, item.desc);
      body.appendChild(d);
      if (item.desc.length > 70) {
        var more = h('button', { type: 'button', class: 'more', 'aria-expanded': 'false', onclick: function () {
          var open = d.classList.toggle('open'); more.textContent = open ? 'أقل' : 'المزيد'; more.setAttribute('aria-expanded', String(open));
        } }, 'المزيد');
        body.appendChild(more);
      }
    }
    if (item.available && item.extras.length) body.appendChild(h('p', { class: 'hint' }, 'إضافات متاحة (اضغط على الاسم)'));
    row.appendChild(body);
    li.appendChild(row);
    if (item.available && item.pricingMode === 'variants') {
      var sizes = h('div', { class: 'sizes', role: 'group', 'aria-label': item.variants.label + ' — اضغط لإضافة مباشرة' });
      item.variants.options.forEach(function (o) {
        sizes.appendChild(h('button', {
          type: 'button', class: 'size', 'aria-label': 'أضف ' + item.name + ' ' + o.name + ' بسعر ' + app.fmtPrice(o.price),
          onclick: function (e) {
            if (item.extras.some(function (g) { return g.required; })) openDetail(item, o.id, e.currentTarget);
            else quickAdd(item, o.id, e.currentTarget);
          }
        }, h('span', {}, o.name), h('b', {}, app.fmt(o.price))));
      });
      li.appendChild(sizes);
    }
    return li;
  }

  function pulse(btn) {
    if (!btn) return;
    btn.classList.add('pulse');
    setTimeout(function () { btn.classList.remove('pulse'); }, 380);
  }
  function quickAdd(item, variantId, btn) {
    try {
      app.cart.add(item.id, { variantId: variantId || undefined });
      var vn = '';
      if (variantId) item.variants.options.forEach(function (o) { if (o.id === variantId) vn = ' (' + o.name + ')'; });
      pulse(btn);
      toast('أضفنا ' + item.name + vn + ' للسلة');
    } catch (e) { toast(e.message); }
  }

  /* ---------- شريط السلة ---------- */
  function buildCartBar() {
    refs.bar = h('div', { class: 'cartbar empty', id: 'cartbar' },
      h('button', { type: 'button', id: 'open-cart', onclick: function (e) { openCart(e.currentTarget); } },
        h('span', { class: 'count' }, h('b', { id: 'bar-count' }, '0'), 'عرض السلة'),
        h('span', { id: 'bar-total' }, '')));
    return refs.bar;
  }
  function updateBar(first) {
    if (!refs.bar) return;
    var t = app.totals();
    refs.bar.classList.toggle('empty', t.count === 0);
    $('bar-count').textContent = String(t.count);
    $('bar-total').textContent = app.fmtPrice(t.total) + (t.unpricedCount ? ' +' : '');
    if (!first && t.count > prevCount && !reduce) {
      refs.bar.classList.remove('bump'); void refs.bar.offsetWidth; refs.bar.classList.add('bump');
    }
    prevCount = t.count;
  }

  /* ---------- التذييل ---------- */
  function buildFooter(r) {
    var f = h('footer', { class: 'wrap footer', id: 'footer' });
    if (r.logo) f.appendChild(h('div', { class: 'seal-wrap' }, h('img', { src: r.logo, alt: '', width: '96', height: '96', loading: 'lazy', onerror: function (e) { e.target.remove(); } })));
    if (r.about) f.appendChild(h('p', { class: 'footer-about', id: 'about' }, r.about));
    var info = r.info;
    if (info) {
      if (info.address) f.appendChild(h('p', { class: 'footer-addr', id: 'info-address' }, info.address));
      var list = h('div', { class: 'footer-list' });
      if (info.phoneUrl) list.appendChild(h('a', { class: 'btn btn-gold', id: 'info-phone', href: info.phoneUrl }, 'اتصل بنا'));
      if (info.mapUrl) list.appendChild(h('a', { class: 'btn btn-ghost', id: 'info-map', href: info.mapUrl, target: '_blank', rel: 'noopener' }, 'الموقع على الخريطة'));
      info.links.forEach(function (l) { list.appendChild(h('a', { class: 'btn btn-ghost', href: l.url, target: '_blank', rel: 'noopener', 'data-social': l.key }, l.label)); });
      if (list.childNodes.length) f.appendChild(list);
    }
    f.appendChild(h('p', { class: 'footer-en', 'aria-hidden': 'true' }, DECOR.name + ' · ' + DECOR.slogan));
    return f;
  }

  /* ====================== تنبيه سريع ====================== */
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg; t.classList.toggle('top', !!sheet); t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  /* ====================== الأوراق السفلية ====================== */
  var sheet = null, backdrop = null, sheetKind = '', opener = null, pushed = false;
  function openSheet(kind, titleText, openerEl, fill) {
    var hadSheet = !!sheet;
    if (hadSheet) { sheet.remove(); backdrop.remove(); }
    sheetKind = kind; opener = openerEl || opener;
    backdrop = h('div', { class: 'backdrop', onclick: closeUI });
    sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-title', id: 'sheet-' + kind });
    var head = h('div', { class: 'sheet-head' },
      h('h2', { class: 'sheet-title', id: 'sheet-title', tabindex: '-1' }, titleText),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'إغلاق', id: 'sheet-close', onclick: closeUI }, '×'));
    sheet.appendChild(head);
    fill(sheet);
    var rootEl = $('sheet-root');
    rootEl.appendChild(backdrop); rootEl.appendChild(sheet);
    document.documentElement.classList.add('lock');
    $('toast').classList.add('top');   // أي تنبيه معلّق ينتقل لأعلى الشاشة بعيدًا عن أزرار الورقة
    $('app').setAttribute('aria-hidden', 'true');
    requestAnimationFrame(function () {
      backdrop.classList.add('show'); sheet.classList.add('show');
      var first = sheet.querySelector('input:not([type=hidden]), textarea, .sheet-title');
      (sheet.querySelector('#sheet-title') || first).focus({ preventScroll: true });
    });
    if (!hadSheet) { try { history.pushState({ sheet: 1 }, ''); pushed = true; } catch (e) { pushed = false; } }
  }
  function closeSheet() {
    if (!sheet) return;
    var s = sheet, b = backdrop;
    sheet = null; backdrop = null; sheetKind = '';
    s.classList.remove('show'); b.classList.remove('show');
    setTimeout(function () { s.remove(); b.remove(); }, reduce ? 0 : 300);
    document.documentElement.classList.remove('lock');
    $('toast').classList.remove('top');
    $('app').removeAttribute('aria-hidden');
    refs.cartRefs = null; refs.detail = null;
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
  }
  function closeUI() {
    if (!sheet) return;
    if (pushed && history.state && history.state.sheet) { pushed = false; history.back(); } else closeSheet();
  }
  window.addEventListener('popstate', function () { pushed = false; closeSheet(); });
  document.addEventListener('keydown', function (e) {
    if (!sheet) return;
    if (e.key === 'Escape') { e.preventDefault(); closeUI(); return; }
    if (e.key === 'Tab') {
      var f = sheet.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea, a[href], summary, [tabindex="-1"]#sheet-title');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ====================== تفاصيل الصنف ====================== */
  function openDetail(item, preVariant, openerEl) {
    openSheet('detail', item.name, openerEl, function (sh) { fillDetail(sh, item, preVariant); });
  }
  function fillDetail(sh, item, preVariant) {
    var st = { variantId: preVariant || '', extra: {}, note: '', qty: 1 };
    if (item.variants && !st.variantId) item.variants.options.forEach(function (o) { if (o['default']) st.variantId = o.id; });
    var maxQty = app.restaurant.settings.maxPerItem;
    var preview = h('p', { class: 'preview', id: 'detail-preview' });
    var errBox = h('p', { class: 'err', id: 'detail-errors', role: 'alert' });
    var addBtn = h('button', { type: 'button', class: 'btn btn-gold', id: 'detail-add' }, 'أضف للسلة');

    if (item.image) {
      sh.appendChild(h('div', { class: 'sheet-img' }, h('img', { src: item.image, alt: item.name, onerror: function (e) { e.target.parentNode.remove(); } })));
    }
    if (item.badges.length) sh.appendChild(h('p', {}, h('span', { class: 'badges' }, item.badges.map(function (b) { return h('span', { class: 'badge' }, app.badgeLabel(b)); }))));
    if (item.desc) sh.appendChild(h('p', { class: 'sec-note', id: 'detail-desc' }, item.desc));
    sh.appendChild(h('p', { class: 'preview' }, 'السعر: ', priceNode(item)));

    function selection() {
      return { variantId: st.variantId || undefined, extraIds: Object.keys(st.extra).filter(function (k) { return st.extra[k]; }) };
    }
    function update() {
      var v = app.validateSelection(item.id, selection());
      preview.textContent = v.unitPrice === null
        ? (item.pricingMode === 'note' ? 'السعر يتحدد عند التأكيد (' + item.priceNote + ')' : 'اختر ' + (item.variants ? item.variants.label : '') + ' لعرض السعر')
        : 'سعر الوحدة: ' + app.fmtPrice(v.unitPrice);
      errBox.textContent = v.ok ? '' : v.errors.join(' ');
      addBtn.disabled = !v.ok;
    }

    if (item.variants) {
      var vf = h('fieldset', { class: 'group', id: 'variants' }, h('legend', {}, item.variants.label));
      var opts = h('div', { class: 'opts' });
      item.variants.options.forEach(function (o) {
        opts.appendChild(h('label', { class: 'opt' },
          h('input', { type: 'radio', name: 'variant', value: o.id, checked: o.id === st.variantId, onchange: function () { st.variantId = o.id; update(); } }),
          h('span', {}, o.name), h('span', { class: 'p' }, app.fmt(o.price))));
      });
      vf.appendChild(opts); sh.appendChild(vf);
    }
    item.extras.forEach(function (g) {
      var hintTxt = (g.required ? 'إجباري' : 'اختياري') + (g.type === 'single' ? ' — اختيار واحد' : (g.max ? ' — حتى ' + g.max : ''));
      var gf = h('fieldset', { class: 'group', 'data-group': g.id }, h('legend', {}, g.label + ' (' + hintTxt + ')'));
      var opts2 = h('div', { class: 'opts' });
      var single = g.type === 'single';
      if (single && !g.required) {
        opts2.appendChild(h('label', { class: 'opt' },
          h('input', { type: 'radio', name: 'x-' + g.id, checked: true, onchange: function () { g.options.forEach(function (x) { st.extra[x.id] = false; }); update(); } }),
          h('span', {}, 'بدون')));
      }
      g.options.forEach(function (o) {
        opts2.appendChild(h('label', { class: 'opt' },
          h('input', {
            type: single ? 'radio' : 'checkbox', name: 'x-' + g.id, value: o.id,
            onchange: function (e) {
              if (single) g.options.forEach(function (x) { st.extra[x.id] = false; });
              st.extra[o.id] = e.target.checked; update();
            }
          }),
          h('span', {}, o.name), o.price ? h('span', { class: 'p' }, '+' + app.fmt(o.price)) : null));
      });
      gf.appendChild(opts2); sh.appendChild(gf);
    });

    sh.appendChild(h('div', { class: 'field' },
      h('label', { for: 'detail-note' }, 'ملاحظة على الصنف (اختياري)'),
      h('input', { type: 'text', id: 'detail-note', maxlength: '200', placeholder: 'مثال: بدون بصل', oninput: function (e) { st.note = e.target.value; } })));

    var qtyOut = h('output', { id: 'detail-qty', 'aria-live': 'polite' }, '1');
    var minus = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'تقليل الكمية', onclick: function () { st.qty = Math.max(1, st.qty - 1); qtyOut.textContent = String(st.qty); } }, '−');
    var plus = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'زيادة الكمية', onclick: function () { st.qty = Math.min(maxQty, st.qty + 1); qtyOut.textContent = String(st.qty); } }, '+');
    sh.appendChild(h('div', { class: 'field' }, h('label', {}, 'الكمية'), h('div', { class: 'stepper' }, minus, qtyOut, plus)));
    sh.appendChild(preview);
    sh.appendChild(errBox);
    addBtn.addEventListener('click', function () {
      try {
        var s = selection();
        app.cart.add(item.id, { variantId: s.variantId, extraIds: s.extraIds, note: st.note, qty: st.qty });
        toast('أضفنا ' + item.name + ' للسلة');
        closeUI();
      } catch (e) { errBox.textContent = e.message; }
    });
    sh.appendChild(h('div', { class: 'actions' }, addBtn, h('button', { type: 'button', class: 'btn btn-ghost', onclick: closeUI }, 'إلغاء')));
    update();
  }

  /* ====================== السلة والطلب ====================== */
  var TYPE_HINT = { dineIn: 'اكتب رقم ترابيزتك', takeaway: 'اكتب اسمك للاستلام', delivery: 'اكتب بياناتك وعنوانك' };
  var FIELD_LABEL = { table: 'رقم الترابيزة', name: 'الاسم', phone: 'رقم الموبايل', address: 'العنوان بالتفصيل' };

  function openCart(openerEl) {
    openSheet('cart', 'سلتك', openerEl, function (sh) {
      var c = refs.cartRefs = {
        notice: h('div', { id: 'c-notice' }), lines: h('ul', { class: 'lines', id: 'c-lines' }), empty: h('p', { class: 'empty', id: 'cart-empty' }, 'السلة فاضية. اختر أصنافك من المنيو.'),
        totals: h('div', { class: 'totals', id: 'c-totals' }), order: h('div', { id: 'c-order' }), errors: h('p', { class: 'err', id: 'c-errors', role: 'alert' }),
        msg: h('pre', { id: 'c-message' }), rows: []
      };
      c.send = h('button', { type: 'button', class: 'btn btn-gold full', id: 'send', onclick: doSend }, 'إرسال الطلب على واتساب');
      c.blocked = h('p', { class: 'err', id: 'c-blocked', role: 'status' });
      c.sendBox = h('div', {}, c.errors, c.blocked, h('div', { class: 'actions' }, c.send, h('button', { type: 'button', class: 'btn btn-ghost', onclick: closeUI }, 'متابعة التسوق')),
        h('details', { class: 'msg' }, h('summary', {}, 'معاينة رسالة واتساب'), c.msg),
        h('p', { class: 'sheet-foot-note' }, 'سيفتح واتساب برسالة جاهزة، وتضغط إرسال هناك.'));
      sh.appendChild(c.notice); sh.appendChild(c.empty); sh.appendChild(c.lines); sh.appendChild(c.totals); sh.appendChild(c.order); sh.appendChild(c.sendBox);
      renderNotice(); rebuildLines(); renderTotals(); renderOrderForm(); renderPreview(); toggleCartParts(); updateSendState();
    });
  }

  function renderNotice() {
    var c = refs.cartRefs; if (!c) return;
    clear(c.notice);
    if (adjustMsg) c.notice.appendChild(h('div', { class: 'notice', id: 'adjust-notice', role: 'alert' }, h('b', {}, 'تنبيه: تغيّر المنيو. '), adjustMsg));
  }
  function toggleCartParts() {
    var c = refs.cartRefs; if (!c) return;
    var has = app.cart.lines.length > 0;
    c.empty.classList.toggle('hidden', has);
    c.lines.classList.toggle('hidden', !has);
    c.totals.classList.toggle('hidden', !has);
    c.order.classList.toggle('hidden', !has);
    c.send.classList.toggle('hidden', !has);
  }

  function lineName(l) { return l.name + (l.variantName ? ' (' + l.variantName + ')' : '') + (l.extraNames.length ? ' + ' + l.extraNames.join(' + ') : ''); }

  function makeRow(l) {
    var row = { id: l.lineId };
    row.name = h('span', { class: 'line-name' }, lineName(l));
    row.total = h('span', { class: 'line-total' }, '');
    row.qty = h('output', { 'aria-live': 'polite' }, String(l.qty));
    row.note = h('input', {
      type: 'text', value: l.note, placeholder: 'ملاحظة على الصنف (اختياري)', maxlength: '200', 'aria-label': 'ملاحظة على ' + l.name,
      onchange: function () {
        var before = app.cart.lines.length;
        suppressSync = true;
        var nid = app.cart.setNote(row.id, row.note.value);
        suppressSync = false;
        if (nid === null) return;
        if (app.cart.lines.length !== before) { rebuildLines(); } else { row.id = nid; }
        renderTotals(); renderPreview(); updateBar(); toggleCartParts();
      }
    });
    row.el = h('li', { class: 'line', 'data-line': l.itemId },
      h('div', { class: 'line-top' }, row.name, row.total),
      h('div', { class: 'line-ctl' },
        h('div', { class: 'stepper' },
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'تقليل كمية ' + l.name, 'data-act': 'dec', onclick: function () { app.cart.setQty(row.id, Number(row.qty.textContent) - 1); } }, '−'),
          row.qty,
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'زيادة كمية ' + l.name, 'data-act': 'inc', onclick: function () { app.cart.setQty(row.id, Number(row.qty.textContent) + 1); } }, '+')),
        row.note,
        h('button', { type: 'button', class: 'link-btn', 'data-act': 'remove', 'aria-label': 'حذف ' + l.name, onclick: function () { app.cart.remove(row.id); } }, 'حذف')));
    fillRow(row, l);
    return row;
  }
  function fillRow(row, l) {
    row.name.textContent = lineName(l);
    row.qty.textContent = String(l.qty);
    row.total.textContent = l.lineTotal === null ? 'السعر عند التأكيد' : app.fmtPrice(l.lineTotal);
  }
  function rebuildLines() {
    var c = refs.cartRefs; if (!c) return;
    clear(c.lines); c.rows = [];
    app.cart.lines.forEach(function (l) { var r = makeRow(l); c.rows.push(r); c.lines.appendChild(r.el); });
  }
  function syncLines() {
    var c = refs.cartRefs; if (!c) return;
    var lines = app.cart.lines;
    var same = lines.length === c.rows.length && lines.every(function (l, i) { return c.rows[i].id === l.lineId; });
    if (!same) {
      var hadFocus = c.lines.contains(document.activeElement);
      rebuildLines();
      if (hadFocus) { var t = $('sheet-title'); if (t) t.focus({ preventScroll: true }); }
      return;
    }
    lines.forEach(function (l, i) { fillRow(c.rows[i], l); });
  }

  function renderTotals() {
    var c = refs.cartRefs; if (!c) return;
    var t = app.totals(), cur = app.restaurant.currency, type = app.order.type;
    clear(c.totals);
    function row(cls, label, val) { c.totals.appendChild(h('div', { class: cls }, h('span', {}, label), h('span', {}, val))); }
    row('', 'عدد القطع', String(t.count));
    row('', 'المجموع', app.fmtPrice(t.subtotal));
    if (t.servicePercent) row('', t.serviceLabel + ' ' + app.fmt(t.servicePercent) + '%', app.fmtPrice(t.serviceAmount));
    if (type === 'delivery') {
      if (t.deliveryFeeNote === null) row('', 'رسوم التوصيل', app.fmtPrice(t.deliveryFee));
      else c.totals.appendChild(h('div', { id: 't-delivery-note' }, h('span', { class: 'small' }, t.deliveryFeeNote)));
    }
    row('grand', 'الإجمالي', app.fmtPrice(t.total));
    if (t.unpricedCount) c.totals.appendChild(h('div', {}, h('span', { class: 'small', id: 't-unpriced' }, 'الإجمالي لا يشمل الأصناف التي يتحدد سعرها عند التأكيد.')));
    if (t.minOrder !== null && !t.minOrderMet) {
      c.totals.appendChild(h('div', {}, h('span', { class: 'err', id: 't-minorder' }, 'الحد الأدنى لطلب التوصيل ' + app.fmtPrice(t.minOrder) + '، ناقص ' + app.fmtPrice(t.minOrderRemaining) + '.')));
    }
    void cur;
  }
  function renderPreview() {
    var c = refs.cartRefs; if (!c) return;
    c.msg.textContent = app.cart.lines.length ? app.order.message() : '';
  }

  function renderOrderForm() {
    var c = refs.cartRefs; if (!c) return;
    clear(c.order);
    var types = app.order.types();
    if (types.length > 1 && !app.order.tableLocked) {
      var seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'نوع الطلب', id: 'order-types' });
      types.forEach(function (t) {
        seg.appendChild(h('label', {},
          h('input', { type: 'radio', name: 'otype', value: t.key, checked: t.key === app.order.type, onchange: function () { app.order.setType(t.key); renderOrderForm(); renderTotals(); renderPreview(); } }),
          t.label));
      });
      c.order.appendChild(seg);
    } else if (types.length > 1) {
      // الترابيزة جاءت من الرابط: نسمح بتغيير النوع لكن نعرض الترابيزة
      var seg2 = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'نوع الطلب', id: 'order-types' });
      types.forEach(function (t) {
        seg2.appendChild(h('label', {},
          h('input', { type: 'radio', name: 'otype', value: t.key, checked: t.key === app.order.type, onchange: function () { app.order.setType(t.key); renderOrderForm(); renderTotals(); renderPreview(); } }),
          t.label));
      });
      c.order.appendChild(seg2);
    }
    c.order.appendChild(h('p', { class: 'hint', style: 'margin-top:12px' }, TYPE_HINT[app.order.type]));
    var f = app.order.fields;
    app.order.requiredFields().forEach(function (k) {
      if (k === 'table' && app.order.tableLocked) {
        c.order.appendChild(h('div', { class: 'table-chip', id: 'table-chip' }, 'ترابيزة رقم ' + f.table));
        return;
      }
      var errEl = h('span', { class: 'err', 'data-error': k, id: 'err-' + k, role: 'alert' });
      var attrs = { id: 'f-' + k, 'data-field': k, value: f[k], 'aria-describedby': 'err-' + k, oninput: function (e) { app.order.setField(k, e.target.value); errEl.textContent = ''; } };
      var input = k === 'address' ? h('textarea', attrs)
        : h('input', Object.assign(attrs, { type: k === 'phone' ? 'tel' : 'text', inputmode: k === 'phone' || k === 'table' ? 'numeric' : 'text', autocomplete: k === 'name' ? 'name' : (k === 'phone' ? 'tel' : 'off') }));
      c.order.appendChild(h('div', { class: 'field' }, h('label', { for: 'f-' + k }, FIELD_LABEL[k]), input, errEl));
    });
    c.order.appendChild(h('div', { class: 'field' },
      h('label', { for: 'f-notes' }, 'ملاحظات للمطبخ (اختياري)'),
      h('textarea', { id: 'f-notes', 'data-field': 'notes', value: f.notes, oninput: function (e) { app.order.setField('notes', e.target.value); } })));
  }

  function updateSendState() {
    var c = refs.cartRefs; if (!c || !c.send) return;
    var cs = closedState();
    c.send.disabled = cs.blocked;
    c.blocked.textContent = cs.blocked ? 'المطعم مغلق الآن ولا يستقبل طلبات.' + reopenText(cs.s) : '';
  }

  function doSend() {
    var c = refs.cartRefs; if (!c) return;
    var res = app.order.send();
    Array.prototype.forEach.call(c.order.querySelectorAll('[data-error]'), function (s) { s.textContent = ''; });
    var general = [];
    Object.keys(res.errors).forEach(function (k) {
      var slot = c.order.querySelector('[data-error="' + k + '"]');
      if (slot) slot.textContent = res.errors[k]; else general.push(res.errors[k]);
    });
    c.errors.textContent = general.join(' ');
    c.errors.setAttribute('data-ok', String(res.ok));
    if (res.ok) toast('تم فتح واتساب. اضغط إرسال هناك لإتمام الطلب.');
    else {
      var firstBad = c.order.querySelector('[data-error]:not(:empty)');
      if (firstBad) { var inp = c.order.querySelector('#f-' + firstBad.getAttribute('data-error')); if (inp) inp.focus(); }
    }
  }

  /* ====================== أحداث المحرك ====================== */
  function onChange(p) {
    updateBar();
    var c = refs.cartRefs;
    if (!c) return;
    if (p && p.reason === 'order') { renderTotals(); renderPreview(); return; }
    if (suppressSync) return;
    syncLines(); renderTotals(); renderPreview(); toggleCartParts();
  }
  function onAdjusted(d) {
    adjustMsg = d.removed.concat(d.priceChanged, d.qtyChanged).map(function (x) { return x.message; }).join(' ');
    toast('تم تحديث السلة بسبب تغيّر المنيو.');
    renderNotice();
  }
  function onMenu() {
    var hadCart = sheetKind === 'cart';
    if (sheetKind === 'detail') closeUI();
    var y = window.scrollY;
    build();
    window.scrollTo(0, y);
    if (hadCart) { renderNotice(); rebuildLines(); renderTotals(); renderOrderForm(); renderPreview(); toggleCartParts(); }
  }
})();
