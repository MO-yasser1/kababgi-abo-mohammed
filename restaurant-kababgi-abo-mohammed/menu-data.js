/* ===========================================================================
   كبابجي أبو محمد — ملف بيانات المنيو (الشكل الجديد: Schema v1 / عقد 1.1)
   ---------------------------------------------------------------------------
   ده المكان الوحيد اللي بتعدّل فيه. أي تغيير هنا يظهر في الموقع بعد ما ترفع
   المجلد على Cloudflare Pages (انظر HOSTING.md).

   ▌ تعديل سعر:        غيّر الرقم بعد  price:  أو بعد اسم الحجم داخل variants
   ▌ تعديل اسم:        غيّر الكلام اللي بين علامتي "" بعد  name:
   ▌ إضافة صنف:        انسخ سطر صنف كامل (من { لحد }) والصقه تحت صنف في نفس
                        القسم. غيّر الاسم والسعر، و**غيّر id لكود جديد مش مكرر**
                        (مثل muqabalat-10). الـ id ما بيتغيرش بعد النشر.
   ▌ حذف صنف:         امسح السطر كله (وانتبه للفاصلة , قبل أو بعد).
   ▌ إخفاء صنف مؤقتًا: اكتب  available: false  جوّا الصنف، فيظهر "غير متاح"
                        ولا يمكن طلبه. (الكلمة القديمة hidden: true لم تعد تعمل.)
   ▌ إضافة صورة لصنف:  حط الصورة في مجلد assets، واكتب جوّا الصنف
                        image: "assets/اسم-الصورة.webp"

   ⚠ الفاصلة (,) في آخر كل صنف مهمة، وعلامات "" لازم تتقفل.
   ⚠ بعد أي تعديل شغّل:  node validate-menu.js   وتأكد إن مفيش أخطاء.

   أنواع الأسعار:
   1) سعر واحد:          { id: "x-01", name: "ارز ابيض ساده", price: 40 },
   2) أحجام:             { id: "x-02", name: "...", variants: { label: "الحجم", options: [
                            { id: "small", name: "صغير", price: 75 }, { id: "large", name: "كبير", price: 150 } ] } },
   3) السعر عند التأكيد:  { id: "x-03", name: "...", priceNote: "بالوزن" },

   ملاحظات النقل من الملف القديم (للتوثيق):
   - nameEn = "KABABGI ABO MOHAMMED" و taglineEn = "KINGS OF ORIENTAL FOOD":
     نصوص زينة إنجليزية يكتبها المصمم داخل التصميم (مش جزء من بيانات المحرك).
   - theme "dark" / "light": إعداد شكل خاص بالتصميم (مش بيانات)، يُضبط في ملف التصميم.
   - email = "kababgiabomohammedegy@gmail.com": الشكل الجديد مفيهوش خانة للبريد.
   - tab (اسم التبويب المختصر) محفوظ في تعليق كل قسم لحد ما نقرر مكانه في العقد.
   =========================================================================== */

/* إضافة السندوتشات: "إضافة سلطه أو طحينه ( 5 جنيه )" — بتتطبق على كل أصناف قسم السندوتشات */
var SANDWICH_EXTRAS = [
  { id: "sides", label: "إضافات", type: "multi", options: [
    { id: "salad", name: "سلطه", price: 5 },
    { id: "tahina", name: "طحينه", price: 5 }
  ] }
];

window.MENU_DATA = {
  schemaVersion: 1,

  /* ===================== بيانات المطعم ===================== */
  restaurant: {
    id: "kababgi-abo-mohammed",
    name: "كبابجي أبو محمد",
    tagline: "ملوك الأكل الشرقي",
    about: "كبابجي أبو محمد هو أول مطعم شرقي بمستوى سياحي ببسيون، هدفنا هو تقديم تجربة مميزة وفريدة وشهية.",

    /* الصور (محفوظة في مجلد assets) */
    logo: "assets/logo.webp",
    cover: "assets/cover.webp",

    /* ⚠️ رقم مؤقت (رقم محمد). كل الطلبات هتوصله هو! غيّره لرقم واتساب المطعم قبل النشر.
       (الأرقام المطبوعة: 01201111005 و 01090000193 و 01010692222 — حدد منهم اللي عليه واتساب) */
    whatsapp: "01142576116",
    countryCode: "20",
    currency: "جنيه",
    timezone: "Africa/Cairo",

    /* مواعيد العمل: غير محددة لسه → مش هتظهر حالة مفتوح/مغلق. لما تتأكد اكتب مثلًا:
       hours: { sat: [["12:00","01:00"]], sun: [["12:00","01:00"]], mon: [["12:00","01:00"]],
                tue: [["12:00","01:00"]], wed: [["12:00","01:00"]], thu: [["12:00","01:00"]], fri: [["12:00","01:00"]] },
       (الإغلاق 01:00 بعد منتصف الليل مسموح وبيتحسب على يوم البداية) */

    orderTypes: {
      dineIn:   { enabled: true },
      takeaway: { enabled: true },
      /* رسوم التوصيل تختلف حسب المنطقة ومش بتتضاف للإجمالي (فيه feeNote بدل fee).
         الحد الأدنى للطلب: لا يوجد. لو في اكتب minOrder: 200 مثلًا. */
      delivery: { enabled: true, feeNote: "رسوم التوصيل تُحدد حسب منطقتك وتتأكد معاك عند تأكيد الطلب" }
    },

    /* رسوم الخدمة 10% داخل الصالة فقط */
    serviceCharge: { percent: 10, appliesTo: ["dineIn"], label: "خدمة" },

    info: {
      address: "بسيون - ش 23 يوليو - مول الأندلس بجوار قاعة كيلوباترا وتاون تيم",
      /* ⚠️ رقم الاتصال مؤقت (رقم محمد). غيّره (الخط الساخن المطبوع 01201111005 على الأرجح). */
      phone: "01142576116",
      mapUrl: "https://maps.app.goo.gl/gHsWsNt6rbiJL879A",
      social: { facebook: "https://www.facebook.com/share/1EGrb3VZqY/" }
    }
  },

  /* ===================== الأقسام والأصناف ===================== */
  categories: [

    /* ---------- ركن المقبلات (اسم التبويب المقترح: المقبلات) ---------- */
    {
      id: "muqabalat", name: "ركن المقبلات",
      items: [
        { id: "muqabalat-01", name: "جلاش تركى", variants: { label: "الحجم", options: [ { id: "small", name: "صغير", price: 75 }, { id: "large", name: "كبير", price: 150 }, { id: "family", name: "عائلي", price: 225 } ] } },
        { id: "muqabalat-02", name: "محشى مشكل", variants: { label: "الحجم", options: [ { id: "small", name: "صغير", price: 75 }, { id: "large", name: "كبير", price: 150 }, { id: "family", name: "عائلي", price: 225 } ] } },
        { id: "muqabalat-03", name: "ممبار بقرى", variants: { label: "الحجم", options: [ { id: "small", name: "صغير", price: 80 }, { id: "large", name: "كبير", price: 160 }, { id: "family", name: "عائلي", price: 310 } ] } },
        { id: "muqabalat-04", name: "محشى ورق عنب", variants: { label: "الحجم", options: [ { id: "small", name: "صغير", price: 80 }, { id: "large", name: "كبير", price: 150 } ] } },
        { id: "muqabalat-05", name: "سمبوسه جبنه", variants: { label: "الحجم", options: [ { id: "small", name: "صغير", price: 80 }, { id: "large", name: "كبير", price: 150 } ] } },
        { id: "muqabalat-06", name: "سمبوسه لحمه", variants: { label: "الحجم", options: [ { id: "small", name: "صغير", price: 85 }, { id: "large", name: "كبير", price: 160 } ] } },
        { id: "muqabalat-07", name: "سمبوسه ميكس", variants: { label: "الحجم", options: [ { id: "small", name: "صغير", price: 85 }, { id: "large", name: "كبير", price: 160 } ] } },
        { id: "muqabalat-08", name: "بطاطس فارم", price: 30 },
        { id: "muqabalat-09", name: "صنية رقاق باللحمة", price: 160 }
      ]
    },

    /* ---------- الشوربة (اسم التبويب المقترح: الشوربة) ---------- */
    {
      id: "shorba", name: "الشوربة",
      items: [
        { id: "shorba-01", name: "شوربة لسان عصفور", price: 20 },
        { id: "shorba-02", name: "شوربه عدس ( شتاء )", price: 40 },
        { id: "shorba-03", name: "طاجن بطاطس ساده", price: 45 },
        { id: "shorba-04", name: "طاجن تورلى مشكل", price: 50 },
        { id: "shorba-05", name: "طاجن ملوخية", price: 50 },
        { id: "shorba-06", name: "شوربه فراخ كريمه", price: 70 },
        { id: "shorba-07", name: "شوربه كوارع", price: 80 }
      ]
    },








    
    /* ---------- ركن السلطات (اسم التبويب المقترح: السلطات) ---------- */
    {
      id: "salat", name: "ركن السلطات",
      items: [
        { id: "salat-01", name: "سلطه خضار", price: 5 },
        { id: "salat-02", name: "سلطه طحينه", price: 5 },
        { id: "salat-03", name: "مخلل", price: 5 },
        { id: "salat-04", name: "سلطه ثوميه", price: 30 },
        { id: "salat-05", name: "سلطه بابا غنوج", price: 30 },
        { id: "salat-06", name: "سلطه كلوسلو", price: 30 }
      ]
    },

    /* ---------- ركن الطاسات (اسم التبويب المقترح: الطاسات) ---------- */
    {
      id: "tasat", name: "ركن الطاسات",
      items: [
        { id: "tasat-01", name: "كبده اسكندرانى", variants: { label: "الكمية", options: [ { id: "quarter", name: "ربع", price: 150 }, { id: "third", name: "تلت", price: 200 }, { id: "half", name: "نصف", price: 300 } ] } },
        { id: "tasat-02", name: "طاسه كبده بالليه", variants: { label: "الكمية", options: [ { id: "quarter", name: "ربع", price: 160 }, { id: "third", name: "تلت", price: 210 }, { id: "half", name: "نصف", price: 320 } ] } },
        { id: "tasat-03", name: "طاسه مشكل بالليه", variants: { label: "الكمية", options: [ { id: "third", name: "تلت", price: 250 }, { id: "half", name: "نصف", price: 340 } ] } },
        { id: "tasat-04", name: "طاسه سجق (ربع)", price: 190 },
        { id: "tasat-05", name: "طاسه لحمه بالليه (ربع)", price: 250 }
      ]
    },

    /* ---------- الاطباق الجانبيه (اسم التبويب المقترح: الأطباق الجانبية) ---------- */
    {
      id: "atbaq", name: "الاطباق الجانبيه",
      items: [
        { id: "atbaq-01", name: "ارز ابيض ساده", price: 40 },
        { id: "atbaq-02", name: "ارز ابيض بالشعريه", price: 50 },
        { id: "atbaq-03", name: "ارز ابيض بالكبده", price: 70 },
        { id: "atbaq-04", name: "ارز خلطه ساده", price: 40 },
        { id: "atbaq-05", name: "ارز كبسه ساده", price: 40 },
        { id: "atbaq-06", name: "طبق فته ساده", price: 75 },
        { id: "atbaq-07", name: "ارز خلطه مكسرات", price: 45 },
        { id: "atbaq-08", name: "ارز كبسه مكسرات", price: 45 },
        { id: "atbaq-09", name: "طاجن ارز معمر بالسمن البلدى", price: 60 },
        { id: "atbaq-10", name: "برام ارز معمر باللحمه", price: 250 },
        { id: "atbaq-11", name: "ارز خلطه بالكبده والمكسرات", price: 70 },
        { id: "atbaq-12", name: "ارز خلطه سبيشيال ابو محمد", price: 80 }
      ]
    },

    /* ---------- ركن الفراخ (اسم التبويب المقترح: الفراخ) ---------- */
    {
      id: "farakh", name: "ركن الفراخ",
      items: [
        { id: "farakh-01", name: "فرخه مشوية بالعضم", price: 360 },
        { id: "farakh-02", name: "فرخه شيش ( 12 قطعه )", price: 360 },
        { id: "farakh-03", name: "فرخه مسحب", price: 380 }
      ]
    },

    /* ---------- ركن الفتة (اسم التبويب المقترح: الفتة) ---------- */
    {
      id: "fatta", name: "ركن الفتة",
      items: [
        { id: "fatta-01", name: "فتـه باللحمه البتلو", price: 290 },
        { id: "fatta-02", name: "فتـه باللحمه ضانى", price: 320 },
        { id: "fatta-03", name: "فته لحمه محمرة", price: 290 },
        { id: "fatta-04", name: "فتـه كوارع خل وثوم", price: 300 }
      ]
    },

    /* ---------- ركن الوجبات (اسم التبويب المقترح: الوجبات) ---------- */
    {
      id: "wagabat", name: "ركن الوجبات",
      note: "تقدم جميع الوجبات مع رز ومحشي وسلطات",
      items: [
        { id: "wagabat-01", name: "وجبه ربع فراخ ورك + ارز + محشى", price: 120 },
        { id: "wagabat-02", name: "وجبه ربع فراخ صدر + ارز + محشى", price: 140 },
        { id: "wagabat-03", name: "وجبه قطعتين كفته مع ارز خلطه بالكبده", price: 165 },
        { id: "wagabat-04", name: "ربع فراخ ورك مع قطعه كفته + ارز + محشى", price: 160 },
        { id: "wagabat-05", name: "مكرونه وايت + ربع شيش طاووق + بطاطس", price: 245 },
        { id: "wagabat-06", name: "وجبه ربع لحمه + كفته + ارز و محشى", price: 200 },
        { id: "wagabat-07", name: "ربع فراخ ورك + قطعتين كفته + ارز + محشى", price: 210 },
        { id: "wagabat-08", name: "ربع فراخ ورك + لحمه فرن + ارز + محشى", price: 210 },
        { id: "wagabat-09", name: "تريبل ميكس ابو محمد", price: 300 },
        { id: "wagabat-10", name: "فرد حمام مع ربع كفته + ارز + محاشى", price: 410 },
        { id: "wagabat-11", name: "نص فراخ مع ربع كفته + ارز + محاشى", price: 350 },
        { id: "wagabat-12", name: "ثلث مشكل + ربع فراخ ورك + ارز + محاشى", price: 400 },
        { id: "wagabat-13", name: "وجبة مندى مع ربع كفته + ارز + محاشى", price: 450 },
        { id: "wagabat-14", name: "موزه ضانى مع ربع كفته + ارز + محاشى", price: 600 },
        { id: "wagabat-15", name: "ثلث مشكل + لحمة روستو + ارز + محاشى", price: 400 },
        { id: "wagabat-16", name: "نصف مشكل + ارز + محاشي + ملوخية", price: 450 },
        { id: "wagabat-17", name: "نصف فراخ + ثلث مشكل + ارز + محاشى + ملوخيه", price: 490 },
        { id: "wagabat-18", name: "موزه ضانى + فرد حمام + رز + محشى", price: 625 }
      ]
    },

    /* ---------- ركن الصوانى (اسم التبويب المقترح: الصواني) ---------- */
    {
      id: "sawani", name: "ركن الصوانى",
      items: [
        { id: "sawani-01", name: "صينيه الدويتو", price: 700, desc: "ربع كفته + ربع مندى + عدد 6 قطع فراخ شيش + رز ومحاشى" },
        { id: "sawani-02", name: "صينيه الأكيل", price: 850, desc: "موزة ضانى + فرد حمام + ربع مشكل + طبق أرز + محاشى" },
        { id: "sawani-03", name: "صينيه السلطان", price: 1000, desc: "تلت كفته + ربع مندى + ربع سجق + عدد 6 قطع فراخ شيش + رز ومحاشى" },
        { id: "sawani-04", name: "صينيه السعاده", price: 1350, desc: "ثلث شيش طاووق + نص مشكل + ثلث مندى + ربع سجق + جلاش + رز ومحاشى" },
        { id: "sawani-05", name: "صينيه الصحاب", price: 1900, desc: "ربع مندى + ثلث كفته وطرب + ربع كباب + نص فراخ شيش + ثلث سجق + مشكل جلاش ومحاشى عائلى + رز سبيشيال" },
        { id: "sawani-06", name: "صينيه الشله", price: 2500, desc: "ثلث مندى + نص كفته + ثلث كباب + ثلث سجق + نص فراخ شيش + ثلث كبده + محشى عائلى + رز سبيشيال" },
        { id: "sawani-07", name: "صينيه الكينج", price: 2600, desc: "نص كفته + نص شيش طاووق + نص مندى + ثلث سجق + عدد 3 فرد حمام + محشى مشكل عائلى + ارز سبيشيال" },
        { id: "sawani-08", name: "صينيه العائله", price: 3150, desc: "كيلو مشكل + نص مندى + ثلث طرب + فرخه شيش + ثلث سجق + ثلث كبده + محشى عائلى + رز سبيشيال" },
        { id: "sawani-09", name: "صينيه مزاجنجى", price: 3750, desc: "كيلو كفته + نص كباب + نص طرب + نص ستيك + نص ريش + نص مندى + محشى عائلى + رز سبيشيال" },
        { id: "sawani-10", name: "صينيه أبو محمد", price: 4350, desc: "كيلو شيش طاووق + كيلو كفته + نص كباب + نص مندى + فردين حمام + ثلث ستيك + ثلث سجق + ثلث طرب + محشى عائلى + رز سبيشيال" }
      ]
    },

    /* ---------- ركن المشويات (اسم التبويب المقترح: المشويات) ---------- */
    {
      id: "mashawiyat", name: "ركن المشويات",
      items: [
        { id: "mashawiyat-01", name: "ريش ضانى", variants: { label: "الكمية", options: [ { id: "third", name: "تلت", price: 325 }, { id: "half", name: "نص", price: 475 }, { id: "kilo", name: "كيلو", price: 950 } ] } },
        { id: "mashawiyat-02", name: "ستيك مشوى ع الفحم", variants: { label: "الكمية", options: [ { id: "third", name: "تلت", price: 290 }, { id: "half", name: "نص", price: 425 }, { id: "kilo", name: "كيلو", price: 850 } ] } },
        { id: "mashawiyat-03", name: "كباب ضانى", variants: { label: "الكمية", options: [ { id: "quarter", name: "ربع", price: 230 }, { id: "third", name: "تلت", price: 360 }, { id: "half", name: "نص", price: 450 }, { id: "kilo", name: "كيلو", price: 900 } ] } },
        { id: "mashawiyat-04", name: "ميكس ابو محمد", variants: { label: "الكمية", options: [ { id: "third", name: "تلت", price: 290 }, { id: "half", name: "نص", price: 390 }, { id: "kilo", name: "كيلو", price: 780 } ] } },
        { id: "mashawiyat-05", name: "طرب ابو محمد", variants: { label: "الكمية", options: [ { id: "quarter", name: "ربع", price: 230 }, { id: "third", name: "تلت", price: 360 }, { id: "half", name: "نص", price: 450 }, { id: "kilo", name: "كيلو", price: 900 } ] } },
        { id: "mashawiyat-06", name: "مشكل ابو محمد", variants: { label: "الكمية", options: [ { id: "quarter", name: "ربع", price: 220 }, { id: "third", name: "تلت", price: 320 }, { id: "half", name: "نص", price: 450 }, { id: "kilo", name: "كيلو", price: 850 } ] } },
        { id: "mashawiyat-07", name: "كفتـه وطرب", variants: { label: "الكمية", options: [ { id: "quarter", name: "ربع", price: 220 }, { id: "third", name: "تلت", price: 320 }, { id: "half", name: "نص", price: 450 }, { id: "kilo", name: "كيلو", price: 850 } ] } },
        { id: "mashawiyat-08", name: "كفتـه ابو محمد", variants: { label: "الكمية", options: [ { id: "quarter", name: "ربع", price: 200 }, { id: "third", name: "تلت", price: 300 }, { id: "half", name: "نص", price: 400 }, { id: "kilo", name: "كيلو", price: 800 } ] } },
        { id: "mashawiyat-09", name: "كبده ضانى", variants: { label: "الكمية", options: [ { id: "quarter", name: "ربع", price: 190 }, { id: "third", name: "تلت", price: 285 }, { id: "half", name: "نص", price: 375 }, { id: "kilo", name: "كيلو", price: 750 } ] } },
        { id: "mashawiyat-10", name: "سجـق ضانى", variants: { label: "الكمية", options: [ { id: "quarter", name: "ربع", price: 170 }, { id: "third", name: "تلت", price: 250 }, { id: "half", name: "نص", price: 325 }, { id: "kilo", name: "كيلو", price: 650 } ] } },
        { id: "mashawiyat-11", name: "شيش طاووق", variants: { label: "الكمية", options: [ { id: "quarter", name: "ربع", price: 150 }, { id: "third", name: "تلت", price: 225 }, { id: "half", name: "نص", price: 300 }, { id: "kilo", name: "كيلو", price: 600 } ] } },
        { id: "mashawiyat-12", name: "نيفا ضانى", variants: { label: "الكمية", options: [ { id: "third", name: "تلت", price: 270 }, { id: "half", name: "نص", price: 400 }, { id: "kilo", name: "كيلو", price: 800 } ] } }
      ]
    },

    /* ---------- ركن المطبخ (اسم التبويب المقترح: المطبخ) ---------- */
    {
      id: "matbakh", name: "ركن المطبخ",
      items: [
        { id: "matbakh-01", name: "موزه ضانى مشويه", price: 400 },
        { id: "matbakh-02", name: "موزه ضانى مع محشى مشكل", price: 475 },
        { id: "matbakh-03", name: "موزه ضانى مع بطاطس فارم", price: 430 },
        { id: "matbakh-04", name: "موزه ضانى مع طبق أرز", price: 450 },
        { id: "matbakh-05", name: "موزه ضانى مع طبق فته", price: 460 },
        { id: "matbakh-06", name: "فرد حمام محشى أرز", price: 200 },
        { id: "matbakh-07", name: "فرد حمام محشى مع خضار", price: 235 },
        { id: "matbakh-08", name: "فرد حمام مع ربع مشكل", price: 410 },
        { id: "matbakh-09", name: "طلب لحمه فرن", price: 240 },
        { id: "matbakh-10", name: "طلب لحمه بارده", price: 250 },
        { id: "matbakh-11", name: "ورقه لحمه", price: 240 }
      ]
    },

    /* ---------- ركن المندى (اسم التبويب المقترح: المندي) ---------- */
    {
      id: "mandi", name: "ركن المندى",
      items: [
        { id: "mandi-01", name: "مندى", variants: { label: "الكمية", options: [ { id: "quarter", name: "ربع", price: 210 }, { id: "third", name: "ثلث", price: 280 }, { id: "half", name: "نص", price: 400 }, { id: "kilo", name: "كيلو", price: 800 } ] } },
        { id: "mandi-02", name: "فخذه ضانى كامله", priceNote: "بالوزن" },
        { id: "mandi-03", name: "خروف برقى محشى حمام وارز ومحشى", priceNote: "بالوزن" },
        { id: "mandi-04", name: "زند ضانى مندى بالكبسه", priceNote: "بالطلب" },
        { id: "mandi-05", name: "ديك رومى محشى ارز خلطه ومحشى", priceNote: "بالوزن" }
      ]
    },

    /* ---------- ركن السندوتشات (اسم التبويب المقترح: السندوتشات) ---------- */
    {
      id: "sandwiches", name: "ركن السندوتشات",
      note: "إضافة سلطه أو طحينه ( 5 جنيه )",
      items: [
        { id: "sandwiches-01", name: "سندوتش كفته بلدى", price: 40, extras: SANDWICH_EXTRAS },
        { id: "sandwiches-02", name: "سندوتش كفته بلدى كبير", price: 80, extras: SANDWICH_EXTRAS },
        { id: "sandwiches-03", name: "سندوتش كفته عيش فرنساوى", price: 100, extras: SANDWICH_EXTRAS },
        { id: "sandwiches-04", name: "سندوتش كبده اسكندرانى", price: 40, extras: SANDWICH_EXTRAS },
        { id: "sandwiches-05", name: "سندوتش كبده عيش فرنساوى", price: 45, extras: SANDWICH_EXTRAS },
        { id: "sandwiches-06", name: "حواوشى ابو محمد", price: 60, extras: SANDWICH_EXTRAS },
        { id: "sandwiches-07", name: "رغيف حواوشى لحم وموتزاريلا", price: 70, extras: SANDWICH_EXTRAS },
        { id: "sandwiches-08", name: "سندوتش شيش طاووق بلدى", price: 70, extras: SANDWICH_EXTRAS },
        { id: "sandwiches-09", name: "سندوتش شيش طاووق فرنساوى", price: 85, extras: SANDWICH_EXTRAS },
        { id: "sandwiches-10", name: "سندوتش سجق بلدى", price: 60, extras: SANDWICH_EXTRAS },
        { id: "sandwiches-11", name: "سندوتش سجق فرنساوى", price: 70, extras: SANDWICH_EXTRAS },
        { id: "sandwiches-12", name: "سندوتش لحمه بارده فرنساوى", price: 100, extras: SANDWICH_EXTRAS },
        { id: "sandwiches-13", name: "سندوتش برجر جامبو بلدى", price: 100, extras: SANDWICH_EXTRAS },
        { id: "sandwiches-14", name: "سندوتش كباب مشوى", price: 110, extras: SANDWICH_EXTRAS }
      ]
    },

    /* ---------- ركن الطواجن (اسم التبويب المقترح: الطواجن) ---------- */
    {
      id: "tawajen", name: "ركن الطواجن",
      items: [
        { id: "tawajen-01", name: "طاجن ممبار عكاوى", price: 340 },
        { id: "tawajen-02", name: "طاجن عكاوى ورق عنب", price: 340 },
        { id: "tawajen-03", name: "طاجن عكاوى ساده", price: 295 },
        { id: "tawajen-04", name: "طاجن كوارع ورق عنب", price: 300 },
        { id: "tawajen-05", name: "طاجن ممبار كوارع", price: 290 },
        { id: "tawajen-06", name: "طاجن كوارع بالبصل والطماطم", price: 260 },
        { id: "tawajen-07", name: "طاجن كوارع ساده", price: 260 },
        { id: "tawajen-08", name: "طاجن بطاطس باللحمه", price: 260 },
        { id: "tawajen-09", name: "طاجن لحمه بالبصل والطماطم", price: 260 },
        { id: "tawajen-10", name: "طاجن تورلى مشكل باللحمه", price: 260 },
        { id: "tawajen-11", name: "طاجن كباب حله", price: 260 }
      ]
    },

    /* ---------- ركن المكرونات (اسم التبويب المقترح: المكرونات) ---------- */
    {
      id: "makaronat", name: "ركن المكرونات",
      items: [
        { id: "makaronat-01", name: "مكرونه بشاميل", price: 100 },
        { id: "makaronat-02", name: "مكرونه نجرسكو", price: 100 },
        { id: "makaronat-03", name: "سباجتى بولونيزا", price: 100 },
        { id: "makaronat-04", name: "مكرونه فراخ وايت صوص", price: 100 }
      ]
    }

  ]
};
