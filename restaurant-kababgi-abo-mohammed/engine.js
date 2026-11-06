/*! MenuEngine v1.1.0 — محرك المنيو الإلكتروني (متوافق مع PROJECT-SPEC 1.1)
 *
 * ثابت لكل المطاعم: لا تعدّله أبدًا داخل مجلد مطعم.
 * - لا يرسم أي HTML ولا يغيّر الصفحة (إلا فتح رابط واتساب عند الإرسال).
 * - Vanilla JavaScript بدون أي مكتبات خارجية.
 * - كل النصوص التي يرجعها نصوص عادية: اعرضها بـ textContent فقط.
 */
(function (root) {
  'use strict';

  var VERSION = '1.1.0';
  var SCHEMA_VERSION = 1;
  var CART_TTL_MS = 6 * 60 * 60 * 1000; // السلة تنتهي بعد 6 ساعات
  var NOTE_MAX = 200;
  var FETCH_TIMEOUT_MS = 12000;
  var WEEK = 7 * 1440;

  var DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']; // ترتيب getDay()
  var DAY_NAMES = { sun: 'الأحد', mon: 'الاثنين', tue: 'الثلاثاء', wed: 'الأربعاء', thu: 'الخميس', fri: 'الجمعة', sat: 'السبت' };
  var EN_DAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  var BADGES = { 'new': 'جديد', best: 'الأكثر طلبًا', offer: 'عرض', spicy: 'حار', veg: 'نباتي' };
  var TYPE_KEYS = ['dineIn', 'takeaway', 'delivery'];
  var TYPE_LABELS = { dineIn: 'في المطعم', takeaway: 'تيك أواي', delivery: 'توصيل' };
  var FIELD_NAMES = ['table', 'name', 'phone', 'address', 'notes'];
  var EVENTS = ['change', 'menu', 'cart-adjusted', 'error'];
  var ID_RE = /^[a-z0-9-]+$/;
  var SOCIAL = {
    instagram: { label: 'إنستجرام', base: 'https://instagram.com/' },
    facebook: { label: 'فيسبوك', base: 'https://facebook.com/' },
    tiktok: { label: 'تيك توك', base: 'https://www.tiktok.com/@' },
    website: { label: 'الموقع', base: '' }
  };

  var MSG = {
    badData: 'تعذر قراءة بيانات المنيو. افتح ملف menu-data.js وراجع الفواصل والأقواس وعلامات التنصيص.',
    badConfig: 'ملف config.js غير صحيح. لازم يحتوي على source (إما "file" أو "api") وrestaurantId.',
    network: 'تعذر تحميل المنيو. تأكد من اتصال الإنترنت ثم حاول مرة أخرى.',
    refresh: 'تعذر تحديث المنيو الآن. نعرض لك آخر نسخة محفوظة.',
    badWhatsapp: 'رقم واتساب المطعم غير مضبوط. لا يمكن إرسال الطلب الآن.'
  };

  /* ====================== أدوات عامة ====================== */

  function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function warnLog(m) { if (root.console && root.console.warn) root.console.warn('[المنيو] ' + m); }
  function userError(msg, code) { var e = new Error(msg); e.code = code || 'engine'; return e; }

  function str(v) {
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'number' && isFinite(v)) return String(v);
    return '';
  }

  function normDigits(s) {
    return String(s)
      .replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); });
  }

  // رقم صالح (أو نص رقمي بسيط). غير ذلك NaN
  function toNum(v) {
    if (typeof v === 'number') return isFinite(v) && v >= 0 ? v : NaN;
    if (typeof v === 'string') {
      var s = normDigits(v).trim();
      if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    }
    return NaN;
  }

  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function fmt(n) {
    n = Number(n);
    if (!isFinite(n)) return '0';
    var r = round2(n);
    if (r === 0) r = 0; // يتخلص من -0
    return String(r);
  }

  // تطبيع عربي للبحث: التشكيل والتطويل، أ إ آ ← ا، ة ← ه، ى ← ي
  function normAr(s) {
    return normDigits(String(s == null ? '' : s))
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627')
      .replace(/\u0629/g, '\u0647')
      .replace(/\u0649/g, '\u064A')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanPhone(s) {
    return normDigits(String(s == null ? '' : s)).replace(/[\s\-().]/g, '').replace(/^\+/, '');
  }
  function validPhone(s) { return /^\d{10,15}$/.test(cleanPhone(s)); }

  function deepFreeze(o) {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      Object.freeze(o);
      Object.keys(o).forEach(function (k) { deepFreeze(o[k]); });
    }
    return o;
  }

  function parseTime(s) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(normDigits(String(s)).trim());
    if (!m) return -1;
    var h = +m[1], mi = +m[2];
    if (mi > 59) return -1;
    if (h === 24 && mi === 0) return 1440;
    if (h > 23) return -1;
    return h * 60 + mi;
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function timeStr(mins) { mins = ((mins % 1440) + 1440) % 1440; return pad2(Math.floor(mins / 60)) + ':' + pad2(mins % 60); }
  function timeLabel(mins) {
    mins = ((mins % 1440) + 1440) % 1440;
    var h = Math.floor(mins / 60), m = mins % 60;
    return ((h % 12) || 12) + ':' + pad2(m) + ' ' + (h < 12 ? 'ص' : 'م');
  }

  var tzCache = {};
  function tzFormatter(tz) {
    if (!tzCache[tz]) {
      tzCache[tz] = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
      });
    }
    return tzCache[tz];
  }
  function validTimezone(tz) { try { tzFormatter(tz); return true; } catch (e) { return false; } }
  function nowInfo(tz) {
    var parts = tzFormatter(tz).formatToParts(new Date(Date.now()));
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    return {
      dow: EN_DAY_INDEX[o.weekday],
      minutes: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10),
      date: o.year + '-' + o.month + '-' + o.day
    };
  }

  /* ====================== التحقق وتطبيع المنيو ====================== */

  function normalizeMenu(raw) {
    var warnings = [];
    function warn(m) { warnings.push(m); }

    if (!isObj(raw)) throw userError(MSG.badData, 'bad-data');
    if (raw.schemaVersion !== undefined && raw.schemaVersion !== SCHEMA_VERSION) {
      throw userError('ملف المنيو مكتوب بنسخة بيانات غير مدعومة. حدّث ملف engine.js لآخر إصدار.', 'bad-schema');
    }
    var rr = raw.restaurant;
    if (!isObj(rr)) throw userError('بيانات المطعم (restaurant) ناقصة في ملف المنيو.', 'bad-data');
    var rname = str(rr.name);
    if (!rname) throw userError('اسم المطعم (name) ناقص في ملف المنيو.', 'bad-data');
    var rid = str(rr.id);
    if (!rid) throw userError('كود المطعم (id) ناقص في ملف المنيو.', 'bad-data');
    if (!ID_RE.test(rid)) warn('كود المطعم "' + rid + '" لازم يكون حروف إنجليزية صغيرة وأرقام وشرطة فقط.');
    if (!Array.isArray(raw.categories)) throw userError('الأقسام (categories) ناقصة أو مكتوبة بشكل غير صحيح في ملف المنيو.', 'bad-data');

    var r = {
      id: rid, name: rname,
      tagline: str(rr.tagline), about: str(rr.about), logo: str(rr.logo), cover: str(rr.cover),
      whatsapp: str(rr.whatsapp),
      countryCode: normDigits(str(rr.countryCode)).replace(/\D/g, '') || '20',
      currency: str(rr.currency) || 'جنيه',
      timezone: 'Africa/Cairo',
      announcement: null, hours: null,
      allowOrderWhenClosed: rr.allowOrderWhenClosed === true,
      serviceCharge: null, orderTypes: null, info: null, settings: null
    };

    // المنطقة الزمنية
    if (rr.timezone !== undefined && rr.timezone !== null && rr.timezone !== '') {
      if (typeof rr.timezone === 'string' && validTimezone(rr.timezone)) r.timezone = rr.timezone;
      else warn('المنطقة الزمنية "' + rr.timezone + '" غير صحيحة، تم استخدام Africa/Cairo.');
    }

    // الإعلان
    if (rr.announcement !== undefined && rr.announcement !== null) {
      var at = typeof rr.announcement === 'string' ? str(rr.announcement) : (isObj(rr.announcement) ? str(rr.announcement.text) : '');
      if (at) {
        var until = isObj(rr.announcement) ? str(rr.announcement.until) : '';
        if (until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) {
          warn('تاريخ انتهاء الإعلان "' + until + '" غير صحيح (المطلوب YYYY-MM-DD)، تم تجاهل التاريخ.');
          until = '';
        }
        r.announcement = { text: at, until: until };
      }
    }

    // ساعات العمل
    if (rr.hours !== undefined && rr.hours !== null) {
      if (!isObj(rr.hours)) {
        warn('ساعات العمل (hours) مكتوبة بشكل غير صحيح، تم تجاهلها.');
      } else {
        var hrs = {};
        DAY_KEYS.forEach(function (dk) {
          hrs[dk] = [];
          var list = rr.hours[dk];
          if (list === undefined || list === null) return;
          if (!Array.isArray(list)) { warn('ساعات يوم ' + DAY_NAMES[dk] + ' غير صحيحة، تم اعتباره مغلقًا.'); return; }
          list.forEach(function (p) {
            var s = Array.isArray(p) ? parseTime(p[0]) : -1;
            var e = Array.isArray(p) ? parseTime(p[1]) : -1;
            if (s < 0 || e < 0 || s === 1440 || s === e) {
              warn('فترة عمل غير صالحة يوم ' + DAY_NAMES[dk] + ' وتم تجاهلها.');
              return;
            }
            hrs[dk].push([timeStr(s), e === 1440 ? '24:00' : timeStr(e)]);
          });
        });
        Object.keys(rr.hours).forEach(function (k) {
          if (DAY_KEYS.indexOf(k) < 0) warn('اسم يوم غير معروف في ساعات العمل: "' + k + '" (المسموح: sat, sun, mon, tue, wed, thu, fri).');
        });
        r.hours = hrs;
      }
    }

    // رسوم الخدمة
    if (rr.serviceCharge !== undefined && rr.serviceCharge !== null) {
      var pc = isObj(rr.serviceCharge) ? toNum(rr.serviceCharge.percent) : NaN;
      if (isNaN(pc)) {
        warn('رسوم الخدمة (serviceCharge) غير صحيحة وتم تجاهلها. المطلوب percent رقم.');
      } else if (pc > 0 && pc <= 100) {
        var ap = Array.isArray(rr.serviceCharge.appliesTo) ? rr.serviceCharge.appliesTo.filter(function (k) {
          if (TYPE_KEYS.indexOf(k) < 0) { warn('نوع طلب غير معروف في رسوم الخدمة: "' + k + '".'); return false; }
          return true;
        }) : ['dineIn'];
        r.serviceCharge = { percent: pc, appliesTo: ap, label: str(rr.serviceCharge.label) || 'خدمة' };
      } else if (pc > 100) {
        warn('نسبة رسوم الخدمة أكبر من 100، تم تجاهلها.');
      }
    }

    // أنواع الطلب
    var ot = isObj(rr.orderTypes) ? rr.orderTypes : null;
    r.orderTypes = {
      dineIn: { enabled: ot ? (isObj(ot.dineIn) && ot.dineIn.enabled === true) : true },
      takeaway: { enabled: !!(ot && isObj(ot.takeaway) && ot.takeaway.enabled === true) },
      delivery: { enabled: false, fee: null, minOrder: null, feeNote: '' }
    };
    if (ot && isObj(ot.delivery) && ot.delivery.enabled === true) {
      var d = ot.delivery;
      var fee = d.fee === undefined || d.fee === null ? NaN : toNum(d.fee);
      if (d.fee !== undefined && d.fee !== null && isNaN(fee)) warn('رسوم التوصيل (fee) غير صالحة، تم اعتبارها غير محددة.');
      var mo = d.minOrder === undefined || d.minOrder === null ? NaN : toNum(d.minOrder);
      if (d.minOrder !== undefined && d.minOrder !== null && isNaN(mo)) warn('الحد الأدنى للتوصيل (minOrder) غير صالح، تم تجاهله.');
      r.orderTypes.delivery = {
        enabled: true,
        fee: isNaN(fee) ? null : fee,
        minOrder: isNaN(mo) || mo <= 0 ? null : mo,
        feeNote: str(d.feeNote)
      };
    }
    if (ot) {
      Object.keys(ot).forEach(function (k) { if (TYPE_KEYS.indexOf(k) < 0) warn('نوع طلب غير معروف: "' + k + '".'); });
    }
    if (!TYPE_KEYS.some(function (k) { return r.orderTypes[k].enabled; })) {
      warn('لا يوجد نوع طلب مفعّل، تم تفعيل "في المطعم" تلقائيًا.');
      r.orderTypes.dineIn.enabled = true;
    }

    // معلومات المطعم
    if (isObj(rr.info)) {
      var inf = rr.info, social = {}, links = [], mapUrl = str(inf.mapUrl);
      if (mapUrl && !/^https?:\/\//i.test(mapUrl)) { warn('رابط الخريطة لازم يبدأ بـ https://، تم تجاهله.'); mapUrl = ''; }
      if (isObj(inf.social)) {
        Object.keys(SOCIAL).forEach(function (k) {
          var v = str(inf.social[k]);
          if (!v) return;
          var url = '';
          if (/^https?:\/\//i.test(v)) url = v;
          else if (k === 'website') { if (/^[^\s\/]+\.[^\s\/]+/.test(v)) url = 'https://' + v; }
          else if (/^[A-Za-z0-9._@-]+$/.test(v)) url = SOCIAL[k].base + v.replace(/^@/, '');
          if (url) { social[k] = v; links.push({ key: k, label: SOCIAL[k].label, url: url }); }
          else warn('رابط ' + SOCIAL[k].label + ' غير صالح وتم تجاهله.');
        });
      }
      var phone = str(inf.phone), phoneDigits = phone ? cleanPhone(phone) : '';
      var info = {
        address: str(inf.address), phone: phone,
        phoneUrl: /^\d{6,15}$/.test(phoneDigits) ? 'tel:' + phoneDigits : '',
        mapUrl: mapUrl, social: social, links: links
      };
      r.info = (info.address || info.phone || info.mapUrl || links.length) ? info : null;
    }

    // الإعدادات
    var st = isObj(rr.settings) ? rr.settings : {};
    var mp = toNum(st.maxPerItem), sm = toNum(st.searchMinItems);
    r.settings = {
      maxPerItem: !isNaN(mp) && mp >= 1 ? Math.floor(mp) : 20,
      searchMinItems: !isNaN(sm) ? Math.floor(sm) : 10
    };

    // الأقسام والأصناف
    var seenCat = {}, seenItem = {}, categories = [], flat = [];
    raw.categories.forEach(function (c, ci) {
      if (!isObj(c)) { warn('قسم رقم ' + (ci + 1) + ' غير صالح وتم تجاهله.'); return; }
      var cid = str(c.id), cname = str(c.name);
      if (!cid || !cname) { warn('قسم رقم ' + (ci + 1) + ' ينقصه id أو name وتم تجاهله.'); return; }
      if (seenCat[cid]) { warn('قسم "' + cname + '": الكود "' + cid + '" مكرر وتم تجاهله.'); return; }
      seenCat[cid] = true;
      if (!ID_RE.test(cid)) warn('قسم "' + cname + '": الكود لازم يكون حروف إنجليزية صغيرة وأرقام وشرطة.');
      var cat = { id: cid, name: cname, note: str(c.note), image: str(c.image), items: [] };
      var list = Array.isArray(c.items) ? c.items : [];
      list.forEach(function (it) {
        var item = normItem(it, cat, seenItem, warn);
        if (item) { cat.items.push(item); flat.push(item); }
      });
      if (!cat.items.length) { warn('قسم "' + cname + '" ليس فيه أصناف صالحة وتم إخفاؤه.'); return; }
      categories.push(cat);
    });

    var menu = { schemaVersion: SCHEMA_VERSION, restaurant: r, categories: categories, items: flat, itemCount: flat.length };
    return { menu: deepFreeze(menu), warnings: warnings };
  }

  function normItem(it, cat, seenItem, warn) {
    var shown = isObj(it) && str(it.name) ? '"' + str(it.name) + '"' : '(بدون اسم)';
    var label = 'صنف ' + shown + ' في قسم "' + cat.name + '"';
    if (!isObj(it)) { warn(label + ': تم تجاهله لأنه مكتوب بشكل غير صحيح.'); return null; }
    var id = str(it.id), name = str(it.name);
    if (!id) { warn(label + ': ينقصه id وتم تجاهله.'); return null; }
    if (!name) { warn('صنف بكود "' + id + '" في قسم "' + cat.name + '": ينقصه الاسم وتم تجاهله.'); return null; }
    if (seenItem[id]) { warn(label + ': الكود "' + id + '" مكرر وتم تجاهله.'); return null; }
    if (!ID_RE.test(id)) warn(label + ': الكود "' + id + '" لازم يكون حروف إنجليزية صغيرة وأرقام وشرطة.');

    // الأحجام
    var variants = null;
    if (it.variants !== undefined && it.variants !== null) {
      if (isObj(it.variants) && Array.isArray(it.variants.options)) {
        var seenOpt = {}, opts = [], defIdx = -1;
        it.variants.options.forEach(function (o) {
          var oid = isObj(o) ? str(o.id) : '', on = isObj(o) ? str(o.name) : '', op = isObj(o) ? toNum(o.price) : NaN;
          if (!oid || !on || isNaN(op)) { warn(label + ': حجم غير صالح (يلزم id وname وprice) وتم تجاهله.'); return; }
          if (seenOpt[oid]) { warn(label + ': كود الحجم "' + oid + '" مكرر وتم تجاهله.'); return; }
          seenOpt[oid] = true;
          var oo = toNum(o.oldPrice);
          opts.push({ id: oid, name: on, price: op, oldPrice: (!isNaN(oo) && oo > op) ? oo : null, 'default': false });
          if (o['default'] === true && defIdx < 0) defIdx = opts.length - 1;
        });
        if (defIdx >= 0) opts[defIdx]['default'] = true;
        if (opts.length) variants = { label: str(it.variants.label) || 'الحجم', options: opts };
        else warn(label + ': الأحجام (variants) بدون خيارات صالحة، تم تجاهلها.');
      } else {
        warn(label + ': الأحجام (variants) مكتوبة بشكل غير صحيح، تم تجاهلها.');
      }
    }

    // الإضافات (كود الخيار لازم يكون فريدًا في الصنف كله لأن extraIds قائمة مسطحة)
    var extras = [];
    if (it.extras !== undefined && it.extras !== null) {
      if (!Array.isArray(it.extras)) {
        warn(label + ': الإضافات (extras) لازم تكون قائمة، تم تجاهلها.');
      } else {
        var seenGroup = {}, seenExtraOpt = {};
        it.extras.forEach(function (g) {
          var gid = isObj(g) ? str(g.id) : '';
          if (!gid || !Array.isArray(g.options)) { warn(label + ': مجموعة إضافات غير صالحة (يلزم id وoptions) وتم تجاهلها.'); return; }
          if (seenGroup[gid]) { warn(label + ': كود مجموعة الإضافات "' + gid + '" مكرر وتم تجاهلها.'); return; }
          seenGroup[gid] = true;
          var type = g.type === 'single' ? 'single' : 'multi';
          if (g.type !== undefined && g.type !== 'single' && g.type !== 'multi') warn(label + ': نوع مجموعة "' + gid + '" غير معروف، تم اعتباره multi.');
          var gl = str(g.label) || 'إضافات';
          var mx = g.max === undefined || g.max === null ? NaN : toNum(g.max);
          var max = type === 'single' ? 1 : (!isNaN(mx) && mx >= 1 ? Math.floor(mx) : null);
          var eopts = [];
          g.options.forEach(function (o) {
            var oid = isObj(o) ? str(o.id) : '', on = isObj(o) ? str(o.name) : '';
            var op = isObj(o) && (o.price === undefined || o.price === null) ? 0 : (isObj(o) ? toNum(o.price) : NaN);
            if (!oid || !on || isNaN(op)) { warn(label + ': إضافة غير صالحة في "' + gl + '" (يلزم id وname وprice) وتم تجاهلها.'); return; }
            if (seenExtraOpt[oid]) { warn(label + ': كود الإضافة "' + oid + '" مكرر داخل الصنف وتم تجاهله.'); return; }
            seenExtraOpt[oid] = true;
            eopts.push({ id: oid, name: on, price: op });
          });
          if (!eopts.length) { warn(label + ': مجموعة "' + gl + '" بدون إضافات صالحة وتم تجاهلها.'); return; }
          extras.push({ id: gid, label: gl, type: type, required: g.required === true, max: max, options: eopts });
        });
      }
    }

    // السعر
    var rawPrice = it.price === undefined || it.price === null ? NaN : toNum(it.price);
    if (it.price !== undefined && it.price !== null && isNaN(rawPrice)) warn(label + ': السعر غير صالح (لازم رقم 0 أو أكبر).');
    var priceNote = str(it.priceNote), mode, price = null, oldPrice = null;
    if (variants) {
      mode = 'variants';
      priceNote = '';
      if (!isNaN(rawPrice)) warn(label + ': له أحجام، فتم تجاهل السعر العام (price).');
    } else if (!isNaN(rawPrice)) {
      mode = 'fixed';
      price = rawPrice;
      priceNote = '';
      var oo2 = toNum(it.oldPrice);
      oldPrice = (!isNaN(oo2) && oo2 > price) ? oo2 : null;
    } else if (priceNote) {
      mode = 'note';
    } else {
      warn(label + ': ليس له سعر (price) ولا أحجام ولا priceNote، وتم تجاهله.');
      return null;
    }

    // الشارات
    var badges = [];
    if (it.badges !== undefined && it.badges !== null) {
      (Array.isArray(it.badges) ? it.badges : []).forEach(function (b) {
        if (!Object.prototype.hasOwnProperty.call(BADGES, b)) { warn(label + ': شارة غير معروفة "' + b + '" وتم تجاهلها.'); return; }
        if (badges.indexOf(b) < 0) badges.push(b);
      });
    }

    seenItem[id] = true;
    var needsChoice = (variants ? !variants.options.some(function (o) { return o['default']; }) : false) ||
      extras.some(function (g) { return g.required; });
    return {
      id: id, name: name, desc: str(it.desc), image: str(it.image),
      price: price, priceNote: priceNote, oldPrice: oldPrice,
      badges: badges, available: it.available !== false,
      variants: variants, extras: extras,
      categoryId: cat.id, categoryName: cat.name,
      pricingMode: mode, hasOptions: !!variants || extras.length > 0, needsChoice: needsChoice
    };
  }

  /* ====================== منطق التطبيق ====================== */

  function makeApp(config, normalized, source, rawJson) {
    var state = {
      menu: normalized.menu, rawJson: rawJson, index: null, intervals: null,
      cart: [], savedAt: 0, type: null, fields: { table: '', name: '', phone: '', address: '', notes: '' },
      tableLocked: false
    };
    var listeners = {};
    var storageId = str(config.restaurantId) || state.menu.restaurant.id;

    function on(ev, fn) {
      if (EVENTS.indexOf(ev) < 0) throw userError('حدث غير معروف: "' + ev + '". المتاح: ' + EVENTS.join(', ') + '.');
      if (typeof fn !== 'function') throw userError('لازم تمرر دالة للحدث.');
      (listeners[ev] = listeners[ev] || []).push(fn);
      return function () {
        var a = listeners[ev] || [], i = a.indexOf(fn);
        if (i > -1) a.splice(i, 1);
      };
    }
    function emit(ev, payload) {
      (listeners[ev] || []).slice().forEach(function (fn) {
        try { fn(payload); } catch (e) { if (root.console && root.console.error) root.console.error(e); }
      });
    }

    function R() { return state.menu.restaurant; }

    /* ---- فهرس المنيو ---- */
    function buildIndex() {
      var byId = {}, search = [];
      state.menu.items.forEach(function (it) {
        byId[it.id] = it;
        search.push({ item: it, name: normAr(it.name), desc: normAr(it.desc) });
      });
      state.index = { byId: byId, search: search };
      state.intervals = buildIntervals();
    }

    /* ---- ساعات العمل ---- */
    function buildIntervals() {
      var h = R().hours;
      if (!h) return null;
      var raw = [];
      DAY_KEYS.forEach(function (dk, d) {
        h[dk].forEach(function (p) {
          var s = parseTime(p[0]), e = parseTime(p[1]);
          var S = d * 1440 + s, E = d * 1440 + (e <= s ? e + 1440 : e);
          [-WEEK, 0, WEEK].forEach(function (off) { raw.push([S + off, E + off]); });
        });
      });
      raw.sort(function (a, b) { return a[0] - b[0]; });
      var merged = [];
      raw.forEach(function (iv) {
        var last = merged[merged.length - 1];
        if (last && iv[0] <= last[1]) { if (iv[1] > last[1]) last[1] = iv[1]; }
        else merged.push([iv[0], iv[1]]);
      });
      return merged;
    }

    function changeInfo(t, nowAbs) {
      var dayDiff = Math.floor(t / 1440) - Math.floor(nowAbs / 1440);
      var dow = (((Math.floor(t / 1440)) % 7) + 7) % 7;
      var mins = ((t % 1440) + 1440) % 1440;
      var dayLabel = dayDiff === 0 ? 'اليوم' : (dayDiff === 1 ? 'غدًا' : 'يوم ' + DAY_NAMES[DAY_KEYS[dow]]);
      return { time: timeStr(mins), label: timeLabel(mins), day: DAY_KEYS[dow], dayLabel: dayLabel, minutesFromNow: t - nowAbs };
    }

    function status() {
      var r = R();
      if (!r.hours) return { open: null, message: '', nextChange: null };
      var iv = state.intervals || [];
      var ni = nowInfo(r.timezone);
      var nowAbs = ni.dow * 1440 + ni.minutes;
      for (var i = 0; i < iv.length; i++) {
        if (iv[i][0] <= nowAbs && nowAbs < iv[i][1]) {
          if (iv[i][1] - iv[i][0] >= WEEK) return { open: true, message: 'مفتوح', nextChange: null };
          var c = changeInfo(iv[i][1], nowAbs);
          return { open: true, message: 'مفتوح حتى ' + c.label, nextChange: c };
        }
      }
      for (var j = 0; j < iv.length; j++) {
        if (iv[j][0] > nowAbs) {
          var n = changeInfo(iv[j][0], nowAbs);
          return { open: false, message: 'مغلق الآن — يفتح ' + n.dayLabel + ' ' + n.label, nextChange: n };
        }
      }
      return { open: false, message: 'مغلق حاليًا', nextChange: null };
    }

    function announcement() {
      var a = R().announcement;
      if (!a) return null;
      if (a.until && nowInfo(R().timezone).date > a.until) return null;
      return a.text;
    }

    /* ---- الأسعار ---- */
    function itemOf(x) { return typeof x === 'string' ? state.index.byId[x] : x; }

    function priceInfo(x) {
      var it = itemOf(x);
      if (!it) return { price: null, oldPrice: null, from: false, note: '' };
      if (it.pricingMode === 'variants') {
        var best = it.variants.options.reduce(function (a, b) { return b.price < a.price ? b : a; });
        return { price: best.price, oldPrice: best.oldPrice, from: true, note: '' };
      }
      if (it.pricingMode === 'note') return { price: null, oldPrice: null, from: false, note: it.priceNote };
      return { price: it.price, oldPrice: it.oldPrice, from: false, note: '' };
    }

    function fmtPrice(n) { return fmt(n) + ' ' + R().currency; }

    /* ---- اختيارات الصنف ---- */
    function resolveSelection(item, sel) {
      sel = sel || {};
      var errors = [], variant = null, chosen = [];
      if (!item) return { ok: false, errors: ['الصنف غير موجود.'], variant: null, chosen: [], unitPrice: null };
      if (!item.available) errors.push('هذا الصنف غير متاح حاليًا.');

      var vid = sel.variantId, hasV = !(vid === undefined || vid === null || vid === '');
      if (item.variants) {
        if (!hasV) {
          item.variants.options.forEach(function (o) { if (!variant && o['default']) variant = o; });
          if (!variant) errors.push('اختر ' + item.variants.label + '.');
        } else {
          item.variants.options.forEach(function (o) { if (o.id === String(vid)) variant = o; });
          if (!variant) errors.push('الاختيار المحدد في "' + item.variants.label + '" غير موجود.');
        }
      } else if (hasV) {
        errors.push('هذا الصنف ليس له أحجام.');
      }

      var ids = [];
      (Array.isArray(sel.extraIds) ? sel.extraIds : []).forEach(function (e) {
        e = String(e);
        if (ids.indexOf(e) < 0) ids.push(e);
      });
      var counts = {};
      ids.forEach(function (eid) {
        var found = null;
        item.extras.forEach(function (g) {
          g.options.forEach(function (o) { if (o.id === eid) found = { group: g, opt: o }; });
        });
        if (!found) { errors.push('إضافة غير موجودة لهذا الصنف.'); return; }
        chosen.push(found);
        counts[found.group.id] = (counts[found.group.id] || 0) + 1;
      });
      item.extras.forEach(function (g) {
        var c = counts[g.id] || 0;
        if (g.type === 'single' && c > 1) errors.push('في "' + g.label + '" اختر خيارًا واحدًا فقط.');
        else if (g.type === 'multi' && g.max && c > g.max) errors.push('في "' + g.label + '" يمكنك اختيار ' + g.max + ' كحد أقصى.');
        if (g.required && c < 1) errors.push('اختر من "' + g.label + '".');
      });
      // ترتيب ثابت للإضافات: حسب ترتيبها في المنيو
      chosen.sort(function (a, b) {
        var ga = item.extras.indexOf(a.group), gb = item.extras.indexOf(b.group);
        return ga !== gb ? ga - gb : a.group.options.indexOf(a.opt) - b.group.options.indexOf(b.opt);
      });

      var unitPrice = null;
      if (item.pricingMode !== 'note' && (variant || !item.variants)) {
        var base = variant ? variant.price : item.price;
        chosen.forEach(function (c) { base += c.opt.price; });
        unitPrice = round2(base);
      }
      return { ok: errors.length === 0, errors: errors, variant: variant, chosen: chosen, unitPrice: unitPrice };
    }

    function validateSelection(itemId, sel) {
      var r = resolveSelection(state.index.byId[itemId], sel);
      return { ok: r.ok, errors: r.errors, unitPrice: r.unitPrice };
    }

    /* ---- السلة ---- */
    function cleanNote(n) { return String(n == null ? '' : n).replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX); }
    function makeLineId(itemId, variantId, extraIds, note) {
      return JSON.stringify([itemId, variantId || '', extraIds.slice().sort(), note]);
    }
    function itemQty(itemId, exceptLineId) {
      var t = 0;
      state.cart.forEach(function (l) { if (l.itemId === itemId && l.lineId !== exceptLineId) t += l.qty; });
      return t;
    }
    function findLine(lineId) {
      for (var i = 0; i < state.cart.length; i++) if (state.cart[i].lineId === lineId) return state.cart[i];
      return null;
    }
    function selOfLine(l) { return resolveSelection(state.index.byId[l.itemId], { variantId: l.variantId, extraIds: l.extraIds }); }

    function lineView(l) {
      var item = state.index.byId[l.itemId], s = selOfLine(l);
      var up = s.unitPrice;
      return {
        lineId: l.lineId, itemId: l.itemId, name: item ? item.name : l.nameSnap,
        variantName: s.variant ? s.variant.name : '',
        extraNames: s.chosen.map(function (c) { return c.opt.name; }),
        note: l.note, qty: l.qty,
        unitPrice: up, lineTotal: up === null ? null : round2(up * l.qty)
      };
    }

    function storeKey() { return 'menu-cart:' + storageId; }
    // keepTime=true: لا نجدد مهلة الـ 6 ساعات (مثل مطابقة السلة بعد فتح الصفحة)
    function persist(keepTime) {
      try {
        var st = root.localStorage;
        if (!st) return;
        if (!state.cart.length) { st.removeItem(storeKey()); return; }
        state.savedAt = keepTime && state.savedAt ? state.savedAt : Date.now();
        st.setItem(storeKey(), JSON.stringify({
          v: 1, savedAt: state.savedAt,
          lines: state.cart.map(function (l) {
            return { itemId: l.itemId, variantId: l.variantId, extraIds: l.extraIds, note: l.note, qty: l.qty, name: l.nameSnap, unitPrice: l.priceSnap };
          })
        }));
      } catch (e) { /* التخزين غير متاح: السلة تعمل بدون حفظ */ }
    }
    function restoreCart() {
      try {
        var st = root.localStorage;
        if (!st) return;
        var txt = st.getItem(storeKey());
        if (!txt) return;
        var d = JSON.parse(txt);
        if (!isObj(d) || !Array.isArray(d.lines) || typeof d.savedAt !== 'number' || Date.now() - d.savedAt > CART_TTL_MS) {
          st.removeItem(storeKey());
          return;
        }
        state.savedAt = d.savedAt;
        d.lines.forEach(function (l) {
          if (!isObj(l) || typeof l.itemId !== 'string') return;
          var q = Math.floor(Number(l.qty));
          if (!(q >= 1)) return;
          var extraIds = Array.isArray(l.extraIds) ? l.extraIds.map(String).sort() : [];
          var note = cleanNote(l.note), vid = l.variantId ? String(l.variantId) : '';
          var lineId = makeLineId(l.itemId, vid, extraIds, note);
          var ex = findLine(lineId);
          if (ex) { ex.qty += q; return; }
          state.cart.push({
            lineId: lineId, itemId: l.itemId, variantId: vid, extraIds: extraIds, note: note, qty: q,
            nameSnap: str(l.name) || l.itemId,
            priceSnap: typeof l.unitPrice === 'number' ? l.unitPrice : null
          });
        });
      } catch (e) { /* نسخة تالفة: تُتجاهل */ }
    }

    // مطابقة السلة مع المنيو الحالي. ترجع تفاصيل التغيير أو null
    function reconcileCart() {
      var removed = [], priceChanged = [], qtyChanged = [], keep = [];
      state.cart.forEach(function (l) {
        var item = state.index.byId[l.itemId], name = l.nameSnap, reason = '', msg = '';
        if (!item) { reason = 'missing'; msg = 'تم حذف "' + name + '" من سلتك لأنه لم يعد موجودًا في المنيو.'; }
        else if (!item.available) { reason = 'unavailable'; msg = 'تم حذف "' + item.name + '" من سلتك لأنه غير متاح حاليًا.'; }
        else {
          var s = selOfLine(l);
          if (!s.ok) { reason = 'changed'; msg = 'تم حذف "' + item.name + '" من سلتك لأن خياراته تغيّرت. أضفه من جديد.'; }
        }
        if (reason) { removed.push({ lineId: l.lineId, itemId: l.itemId, name: item ? item.name : name, reason: reason, message: msg }); return; }
        l.nameSnap = item.name;
        var up = selOfLine(l).unitPrice;
        if (up !== l.priceSnap) {
          if (l.priceSnap !== null || up !== null) {
            priceChanged.push({
              lineId: l.lineId, itemId: l.itemId, name: item.name, oldPrice: l.priceSnap, newPrice: up,
              message: 'تغيّر سعر "' + item.name + '"' + (l.priceSnap !== null && up !== null ? ' من ' + fmtPrice(l.priceSnap) + ' إلى ' + fmtPrice(up) : '') + '.'
            });
          }
          l.priceSnap = up;
        }
        keep.push(l);
      });
      state.cart = keep;
      // الحد الأقصى لكل صنف قد يتغير مع تحديث المنيو
      var max = R().settings.maxPerItem, totals = {};
      state.cart.forEach(function (l) {
        var left = max - (totals[l.itemId] || 0);
        if (l.qty > left) {
          qtyChanged.push({ lineId: l.lineId, itemId: l.itemId, name: l.nameSnap, oldQty: l.qty, newQty: Math.max(0, left),
            message: 'تم تقليل كمية "' + l.nameSnap + '" لأن الحد الأقصى ' + max + '.' });
          l.qty = Math.max(0, left);
        }
        totals[l.itemId] = (totals[l.itemId] || 0) + l.qty;
      });
      state.cart = state.cart.filter(function (l) { return l.qty > 0; });
      if (!removed.length && !priceChanged.length && !qtyChanged.length) return null;
      return { removed: removed, priceChanged: priceChanged, qtyChanged: qtyChanged };
    }

    function touch(reason) { persist(); emit('change', { reason: reason }); }

    var cart = {
      get lines() { return state.cart.map(lineView); },
      add: function (itemId, opts) {
        opts = opts || {};
        var item = state.index.byId[itemId];
        if (!item) throw selError(['الصنف غير موجود.']);
        var s = resolveSelection(item, opts);
        if (!s.ok) throw selError(s.errors);
        var qty = opts.qty === undefined || opts.qty === null ? 1 : Number(opts.qty);
        if (!(qty >= 1) || Math.floor(qty) !== qty) throw selError(['الكمية لازم تكون رقمًا صحيحًا من 1 فأكثر.']);
        var max = R().settings.maxPerItem;
        if (itemQty(itemId) + qty > max) throw selError(['وصلت للحد الأقصى (' + max + ') لهذا الصنف.']);
        var extraIds = s.chosen.map(function (c) { return c.opt.id; }).sort();
        var vid = s.variant ? s.variant.id : '';
        var note = cleanNote(opts.note);
        var lineId = makeLineId(itemId, vid, extraIds, note);
        var ex = findLine(lineId);
        if (ex) ex.qty += qty;
        else state.cart.push({ lineId: lineId, itemId: itemId, variantId: vid, extraIds: extraIds, note: note, qty: qty, nameSnap: item.name, priceSnap: s.unitPrice });
        touch('cart');
        return lineId;
      },
      setQty: function (lineId, qty) {
        var l = findLine(lineId);
        if (!l) return null;
        qty = Math.floor(Number(qty));
        if (!(qty >= 1)) { cart.remove(lineId); return 0; }
        var allowed = R().settings.maxPerItem - itemQty(l.itemId, lineId);
        l.qty = Math.max(1, Math.min(qty, allowed));
        touch('cart');
        return l.qty;
      },
      setNote: function (lineId, text) {
        var l = findLine(lineId);
        if (!l) return null;
        var note = cleanNote(text);
        if (note === l.note) return lineId;
        var newId = makeLineId(l.itemId, l.variantId, l.extraIds, note);
        var other = findLine(newId);
        if (other) { // نفس الاختيارات والملاحظة: تندمج في سطر واحد
          var combined = other.qty + l.qty;
          var cap = R().settings.maxPerItem - (itemQty(l.itemId) - combined);
          other.qty = Math.max(1, Math.min(combined, cap));
          state.cart = state.cart.filter(function (x) { return x !== l; });
        } else {
          l.note = note;
          l.lineId = newId;
        }
        touch('cart');
        return newId;
      },
      remove: function (lineId) {
        var n = state.cart.length;
        state.cart = state.cart.filter(function (l) { return l.lineId !== lineId; });
        if (state.cart.length !== n) touch('cart');
      },
      clear: function () {
        if (!state.cart.length) return;
        state.cart = [];
        touch('cart');
      }
    };

    function selError(errors) {
      var e = new Error(errors.join(' '));
      e.code = 'selection';
      e.errors = errors;
      return e;
    }

    /* ---- المجاميع ---- */
    function totals() {
      var r = R(), lines = state.cart.map(lineView);
      var count = 0, subtotal = 0, unpriced = 0;
      lines.forEach(function (l) {
        count += l.qty;
        if (l.lineTotal === null) unpriced++; else subtotal += l.lineTotal;
      });
      subtotal = round2(subtotal);
      var type = state.type, sc = r.serviceCharge, dl = r.orderTypes.delivery;
      var servicePercent = sc && sc.appliesTo.indexOf(type) >= 0 ? sc.percent : 0;
      var serviceAmount = servicePercent ? round2(subtotal * servicePercent / 100) : 0;
      var isDel = type === 'delivery';
      var deliveryFee = isDel && count > 0 && dl.fee !== null ? dl.fee : 0;
      var deliveryFeeNote = isDel && dl.fee === null ? (dl.feeNote || 'تُحدد عند التأكيد') : null;
      var minOrder = isDel && dl.minOrder ? dl.minOrder : null;
      var met = minOrder === null || subtotal >= minOrder;
      return {
        count: count, subtotal: subtotal,
        serviceAmount: serviceAmount, servicePercent: servicePercent, serviceLabel: sc ? sc.label : '',
        deliveryFee: deliveryFee, deliveryFeeNote: deliveryFeeNote,
        total: round2(subtotal + serviceAmount + deliveryFee),
        unpricedCount: unpriced,
        minOrder: minOrder, minOrderMet: met, minOrderRemaining: met ? 0 : round2(minOrder - subtotal)
      };
    }

    /* ---- الطلب ---- */
    function enabledTypes() {
      var ot = R().orderTypes;
      return TYPE_KEYS.filter(function (k) { return ot[k].enabled; }).map(function (k) { return { key: k, label: TYPE_LABELS[k] }; });
    }

    function requiredFields() {
      return state.type === 'dineIn' ? ['table'] : (state.type === 'takeaway' ? ['name'] : ['name', 'phone', 'address']);
    }

    function waNumber() {
      var r = R(), n = normDigits(r.whatsapp).replace(/\D/g, ''), cc = r.countryCode;
      if (n.indexOf('00') === 0) n = n.slice(2);
      else if (n.charAt(0) === '0') n = cc + n.slice(1);
      else if (n && cc && n.indexOf(cc) !== 0) n = cc + n;
      return n;
    }

    function validate() {
      var errors = {}, t = totals(), f = state.fields, st = status();
      if (!state.cart.length) errors.cart = 'السلة فاضية. أضف صنفًا واحدًا على الأقل.';
      if (st.open === false && !R().allowOrderWhenClosed) {
        errors.closed = 'المطعم مغلق حاليًا ولا يستقبل طلبات.' + (st.nextChange ? ' يفتح ' + st.nextChange.dayLabel + ' ' + st.nextChange.label + '.' : '');
      }
      if (state.type === 'delivery' && !t.minOrderMet) {
        errors.minOrder = 'الحد الأدنى لطلب التوصيل ' + fmtPrice(t.minOrder) + '. ناقص ' + fmtPrice(t.minOrderRemaining) + '.';
      }
      requiredFields().forEach(function (k) {
        var v = String(f[k] || '').trim();
        if (!v) {
          errors[k] = { table: 'اكتب رقم الترابيزة.', name: 'اكتب اسمك.', phone: 'اكتب رقم الموبايل.', address: 'اكتب العنوان بالتفصيل.' }[k];
        } else if (k === 'phone' && !validPhone(v)) {
          errors.phone = 'رقم الموبايل غير صحيح. اكتب أرقامًا فقط (من 10 إلى 15 رقمًا).';
        }
      });
      if (waNumber().length < 10) errors.whatsapp = MSG.badWhatsapp;
      return { ok: Object.keys(errors).length === 0, errors: errors };
    }

    function message() {
      var r = R(), t = totals(), f = state.fields, cur = r.currency, out = [];
      out.push('*طلب جديد - ' + r.name + '*');
      out.push('*نوع الطلب:* ' + TYPE_LABELS[state.type]);
      var tv = function (k) { return String(f[k] || '').trim(); };
      if (state.type === 'dineIn') out.push('رقم الترابيزة: ' + normDigits(tv('table')));
      else if (state.type === 'takeaway') out.push('الاسم: ' + tv('name'));
      else {
        out.push('الاسم: ' + tv('name'));
        out.push('الموبايل: ' + cleanPhone(tv('phone')));
        out.push('العنوان: ' + tv('address'));
      }
      out.push('');
      out.push('*الأصناف:*');
      state.cart.map(lineView).forEach(function (l) {
        var txt = '• ' + l.qty + ' × ' + l.name;
        if (l.variantName) txt += ' (' + l.variantName + ')';
        if (l.extraNames.length) txt += ' + ' + l.extraNames.join(' + ');
        var item = state.index.byId[l.itemId];
        if (l.lineTotal === null) txt += ' = (' + (item ? item.priceNote : '') + ' - السعر يتحدد عند التأكيد)';
        else txt += ' = ' + fmt(l.lineTotal) + ' ' + cur;
        out.push(txt);
        if (l.note) out.push('   ملاحظة: ' + l.note);
      });
      out.push('');
      out.push('*المجموع:* ' + fmt(t.subtotal) + ' ' + cur);
      if (t.servicePercent) out.push('*' + t.serviceLabel + ' ' + fmt(t.servicePercent) + '%:* ' + fmt(t.serviceAmount) + ' ' + cur);
      if (state.type === 'delivery') {
        if (t.deliveryFeeNote === null) out.push('رسوم التوصيل: ' + fmt(t.deliveryFee) + ' ' + cur);
        else {
          out.push('رسوم التوصيل: تُحدد عند التأكيد');
          if (r.orderTypes.delivery.feeNote) out.push('   ' + r.orderTypes.delivery.feeNote);
        }
      }
      out.push('*الإجمالي: ' + fmt(t.total) + ' ' + cur + '*');
      if (t.unpricedCount) out.push('الإجمالي لا يشمل الأصناف التي يتحدد سعرها عند التأكيد');
      var notes = tv('notes');
      if (notes) { out.push(''); out.push('*ملاحظات للمطبخ:*'); out.push(notes); }
      return out.join('\n');
    }

    function send() {
      var v = validate();
      if (!v.ok) return v;
      var url = 'https://wa.me/' + waNumber() + '?text=' + encodeURIComponent(message());
      var doc = root.document;
      if (!doc || typeof doc.createElement !== 'function') return { ok: false, errors: { send: 'تعذر فتح واتساب من هذا المتصفح.' } };
      var a = doc.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      if (doc.body) doc.body.appendChild(a);
      a.click();
      if (doc.body && typeof a.remove === 'function') a.remove();
      return { ok: true, errors: {} };
    }

    var order = {
      types: enabledTypes,
      get type() { return state.type; },
      setType: function (key) {
        if (!enabledTypes().some(function (t) { return t.key === key; })) throw userError('نوع الطلب "' + key + '" غير متاح في هذا المطعم.');
        if (state.type === key) return;
        state.type = key;
        touch('order');
      },
      get fields() { return { table: state.fields.table, name: state.fields.name, phone: state.fields.phone, address: state.fields.address, notes: state.fields.notes }; },
      setField: function (name, value) {
        if (FIELD_NAMES.indexOf(name) < 0) throw userError('حقل غير معروف: "' + name + '". المتاح: ' + FIELD_NAMES.join(', ') + '.');
        if (name === 'table' && state.tableLocked) return;
        state.fields[name] = value == null ? '' : String(value);
        emit('change', { reason: 'order' });
      },
      requiredFields: requiredFields,
      get tableLocked() { return state.tableLocked; },
      validate: validate,
      message: message,
      send: send
    };

    /* ---- تهيئة الحالة ---- */
    function readTableParam() {
      try {
        var s = root.location && root.location.search ? String(root.location.search) : '';
        var m = /[?&]t=([^&#]*)/.exec(s);
        if (!m) return '';
        var v = normDigits(decodeURIComponent(m[1].replace(/\+/g, ' '))).trim().slice(0, 20);
        return /^[\w\u0600-\u06FF -]+$/.test(v) ? v : '';
      } catch (e) { return ''; }
    }

    function initOrder() {
      var types = enabledTypes();
      state.type = types[0].key;
      var t = readTableParam();
      if (t && R().orderTypes.dineIn.enabled) {
        state.type = 'dineIn';
        state.fields.table = t;
        state.tableLocked = true;
      }
    }

    // استبدال المنيو بنسخة جديدة (مصدر api)
    function applyMenu(newNorm, newRawJson) {
      state.menu = newNorm.menu;
      state.rawJson = newRawJson;
      buildIndex();
      // لو اختفى نوع الطلب الحالي نرجع لأول نوع مفعّل
      if (!enabledTypes().some(function (t) { return t.key === state.type; })) state.type = enabledTypes()[0].key;
      if (state.tableLocked && !R().orderTypes.dineIn.enabled) { state.tableLocked = false; state.fields.table = ''; }
      var adj = reconcileCart();
      persist(true);
      emit('menu', state.menu);
      if (adj) emit('cart-adjusted', adj);
      emit('change', { reason: 'menu' });
    }

    buildIndex();
    initOrder();
    restoreCart();
    var initialAdjust = reconcileCart();
    if (initialAdjust) persist(true);
    // نؤجل الحدث حتى يشترك التصميم بعد await init
    if (initialAdjust) {
      setTimeout(function () { emit('cart-adjusted', initialAdjust); emit('change', { reason: 'cart' }); }, 0);
    }

    var app = {
      version: VERSION,
      get menu() { return state.menu; },
      get restaurant() { return state.menu.restaurant; },
      badgeLabel: function (key) { return Object.prototype.hasOwnProperty.call(BADGES, key) ? BADGES[key] : null; },
      search: function (q) {
        var nq = normAr(q);
        if (!nq) return [];
        var tokens = nq.split(' '), hits = [];
        state.index.search.forEach(function (e, idx) {
          var all = tokens.every(function (t) { return e.name.indexOf(t) > -1 || e.desc.indexOf(t) > -1; });
          if (!all) return;
          var inName = tokens.every(function (t) { return e.name.indexOf(t) > -1; });
          hits.push({ score: inName ? (e.name.indexOf(nq) === 0 ? 0 : 1) : 2, idx: idx, item: e.item });
        });
        hits.sort(function (a, b) { return a.score - b.score || a.idx - b.idx; });
        return hits.map(function (h) { return h.item; });
      },
      searchEnabled: function () { return state.menu.itemCount >= R().settings.searchMinItems; },
      status: status,
      announcement: announcement,
      priceInfo: priceInfo,
      fmt: fmt,
      fmtPrice: fmtPrice,
      cart: cart,
      validateSelection: validateSelection,
      totals: totals,
      order: order,
      on: on
    };

    // التحديث من الشبكة (مصدر api فقط)
    app._startRefresh = function () {
      setTimeout(function () {
        fetchMenu(config).then(function (res) {
          if (JSON.stringify(res.raw) === state.rawJson) return;
          var n;
          try { n = normalizeMenu(res.raw); }
          catch (e) { emit('error', { message: MSG.refresh, fatal: false, detail: e.message }); return; }
          n.warnings.forEach(warnLog);
          writeMenuCache(config, res.raw);
          applyMenu(n, JSON.stringify(res.raw));
        }).catch(function (e) {
          emit('error', { message: MSG.refresh, fatal: false, detail: e && e.message });
        });
      }, 0);
    };
    return app;
  }

  /* ====================== مصدر api ====================== */

  function cacheKey(config) { return 'menu-cache:' + config.restaurantId; }
  function readMenuCache(config) {
    try {
      var t = root.localStorage && root.localStorage.getItem(cacheKey(config));
      if (!t) return null;
      var d = JSON.parse(t);
      return isObj(d) && d.data ? d.data : null;
    } catch (e) { return null; }
  }
  function writeMenuCache(config, raw) {
    try { if (root.localStorage) root.localStorage.setItem(cacheKey(config), JSON.stringify({ savedAt: Date.now(), data: raw })); }
    catch (e) { /* ممتلئ أو غير متاح */ }
  }

  function fetchMenu(config) {
    var f = root.fetch;
    if (typeof f !== 'function') return Promise.reject(userError(MSG.network, 'network'));
    var base = String(config.apiBase || '').replace(/\/+$/, '');
    var url = base + '/api/menu/' + encodeURIComponent(config.restaurantId);
    var ctl = typeof root.AbortController === 'function' ? new root.AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, FETCH_TIMEOUT_MS) : null;
    var opts = { headers: { Accept: 'application/json' }, cache: 'no-store' };
    if (ctl) opts.signal = ctl.signal;
    return Promise.resolve().then(function () { return f(url, opts); }).then(function (res) {
      if (!res || !res.ok) {
        if (res && res.status === 404) throw userError('هذا المطعم غير موجود على السيرفر. تأكد من restaurantId في config.js.', 'not-found');
        throw userError(MSG.network, 'network');
      }
      return res.json();
    }).then(function (raw) {
      return { raw: raw };
    }, function (e) {
      if (e && e.code) throw e;
      throw userError(MSG.network, 'network');
    }).then(function (v) { if (timer) clearTimeout(timer); return v; }, function (e) { if (timer) clearTimeout(timer); throw e; });
  }

  /* ====================== نقطة الدخول ====================== */

  function init(config) {
    return Promise.resolve().then(function () {
      if (!isObj(config) || (config.source !== 'file' && config.source !== 'api')) throw userError(MSG.badConfig, 'bad-config');
      if (config.source === 'api' && !str(config.restaurantId)) throw userError('كود المطعم (restaurantId) ناقص في config.js.', 'bad-config');

      if (config.source === 'file') {
        var n = normalizeMenu(root.MENU_DATA);
        n.warnings.forEach(warnLog);
        if (str(config.restaurantId) && str(config.restaurantId) !== n.menu.restaurant.id) {
          warnLog('restaurantId في config.js ("' + config.restaurantId + '") يختلف عن id في menu-data.js ("' + n.menu.restaurant.id + '").');
        }
        return makeApp(config, n, 'file', null);
      }

      // api: النسخة المحفوظة أولًا ثم التحديث
      var cached = readMenuCache(config), norm = null;
      if (cached) {
        try { norm = normalizeMenu(cached); } catch (e) { norm = null; }
      }
      if (norm) {
        norm.warnings.forEach(warnLog);
        var app = makeApp(config, norm, 'api', JSON.stringify(cached));
        app._startRefresh();
        delete app._startRefresh;
        return app;
      }
      return fetchMenu(config).then(function (res) {
        var n2 = normalizeMenu(res.raw);
        n2.warnings.forEach(warnLog);
        writeMenuCache(config, res.raw);
        return makeApp(config, n2, 'api', JSON.stringify(res.raw));
      });
    });
  }

  var MenuEngine = { version: VERSION, schemaVersion: SCHEMA_VERSION, init: init };
  root.MenuEngine = MenuEngine;
  if (typeof module !== 'undefined' && module.exports) module.exports = MenuEngine;
})(typeof window !== 'undefined' ? window : globalThis);
