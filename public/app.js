const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let lang = localStorage.getItem("raees-language") === "ar" ? "ar" : "en";
const tr = (en, ar) => (lang === "ar" ? ar : en);
const icons = {
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  bag: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  heart:
    '<path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/>',
  search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  menu: '<path d="M4 8h16M4 16h16"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  spark:
    '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
  shield:
    '<path d="m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5l8-3Z"/><path d="m8 11 3 3 5-6"/>',
  leaf: '<path d="M20 3C8 2 2 9 6 16s16 2 14-13Z"/><path d="M3 22 15 9"/>',
};
const icon = (name) =>
  `<svg class="${name === "arrow" ? "arrow" : ""}" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.spark}</svg>`;
const arrow = () => icon("arrow");
const name = (p) => (lang === "ar" ? p.nameAr : p.name);
const money = (n) =>
  new Intl.NumberFormat(lang === "ar" ? "ar-AE" : "en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: n % 100 ? 2 : 0,
  }).format(n / 100);
const categories = {
  all: ["All fragrances", "جميع العطور"],
  perfume: ["Perfumes", "العطور"],
  oud: ["Oud wood", "خشب العود"],
  oil: ["Dehnal Oud", "دهن العود"],
  muttar: ["Oud Muttar", "العود المعطر"],
  spray: ["All Over Spray", "بخاخات الجسم"],
};
const families = {
  fresh: ["Fresh", "منعش", "Citrus & bright notes", "حمضيات ونفحات مشرقة"],
  floral: ["Floral", "زهري", "Rose & white flowers", "ورد وزهور بيضاء"],
  woody: ["Woody", "خشبي", "Oud & deep woods", "عود وأخشاب عميقة"],
  spiced: ["Spiced", "متبل", "Saffron & warm spices", "زعفران وتوابل دافئة"],
  sweet: ["Sweet", "حلو", "Amber & soft sweetness", "عنبر وحلاوة ناعمة"],
  oud: ["Oud", "عود", "Explore wood & oils", "اكتشف الأخشاب والأدهان"],
};
const cat = (id) => tr(...(categories[id] || categories.all));
const family = (id) => tr(...(families[id] || families.oud));
const variantLabel = (v) =>
  lang === "en"
    ? v.label
    : v.label
        .replace("Standard", "الحجم المتوفر")
        .replace(/1 Tola \(12 grams\)/, "١ تولة (١٢ غرام)")
        .replace(/5 Tola \(60 grams\)/, "٥ تولة (٦٠ غرام)")
        .replace(/10 Tola \(120 grams\)/, "١٠ تولة (١٢٠ غرام)")
        .replace(/grams|Grams/g, "غرام")
        .replace(/ML/g, " مل");
let confirmedOrder = null,
  dialogOpener = null;
let products = [],
  state = {
    cart: { items: [], subtotal: 0, shipping: 0, total: 0, vat: 0 },
    wishlist: [],
    profile: {},
    revision: 0,
  },
  ready = false,
  serverError = false,
  busy = false,
  selectedVariant = "",
  quantity = 1,
  atelierTab = "saved",
  finderStep = 0,
  answers = {},
  checkoutKey = null,
  toastTimer,
  searchTimer;
const errorText = (code) =>
  ({
    conflict: tr(
      "Your collection changed in another tab. Please try again.",
      "تغيرت مجموعتك في نافذة أخرى. حاول مجدداً.",
    ),
    unavailable: tr(
      "This selection is unavailable. Please choose another.",
      "هذا الخيار غير متوفر. اختر خياراً آخر.",
    ),
    invalid_quantity: tr(
      "Choose a quantity between 1 and 10.",
      "اختر كمية بين ١ و١٠.",
    ),
    rate_limited: tr(
      "Please wait a moment before trying again.",
      "يرجى الانتظار قليلاً قبل المحاولة مجدداً.",
    ),
    session_expired: tr(
      "Your demo session expired. Refresh to start a new one.",
      "انتهت جلستك التجريبية. حدّث الصفحة لبدء جلسة جديدة.",
    ),
    empty_cart: tr(
      "Add a fragrance to your bag first.",
      "أضف عطراً إلى حقيبتك أولاً.",
    ),
  })[code] ||
  tr(
    "We could not save that. Your selection is still here. Please try again.",
    "تعذر الحفظ. اختياراتك ما زالت هنا. حاول مجدداً.",
  );
async function api(path, method = "GET", data) {
  const res = await fetch("/api/" + path, {
    method,
    signal: AbortSignal.timeout(15000),
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "raees-concept",
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || "service_unavailable");
  return payload;
}
function toast(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 4200);
}
function brand() {
  return `<span class="brand-ar" lang="ar" dir="rtl">رئيس العود</span><span class="brand-en" dir="ltr">RAEES AL OUD</span>`;
}
function focusKey() {
  const el = document.activeElement;
  if (!el || el === document.body || el.id === "main") return null;
  return {
    id: el.id,
    action: el.dataset?.action,
    item: el.dataset?.id,
    label: el.getAttribute("aria-label"),
    href: el.getAttribute("href"),
  };
}
function restoreFocus(key) {
  if (!key) return;
  let el;
  if (key.id) el = document.getElementById(key.id);
  else if (key.action)
    el = document.querySelector(
      '[data-action="' +
        CSS.escape(key.action) +
        '"]' +
        (key.item ? '[data-id="' + CSS.escape(key.item) + '"]' : ""),
    );
  else if (key.label)
    el = document.querySelector('[aria-label="' + CSS.escape(key.label) + '"]');
  else if (key.href)
    el = document.querySelector('a[href="' + CSS.escape(key.href) + '"]');
  if (el && !el.disabled) el.focus({ preventScroll: true });
}
async function verifyConfirmation() {
  const id = new URLSearchParams(location.search).get("order");
  if (!id) {
    $("#confirmation-status").innerHTML = empty(
      tr("Your demo orders", "طلباتك التجريبية"),
      tr(
        "Visit your collection to view saved orders.",
        "زر مجموعتك لعرض الطلبات المحفوظة.",
      ),
      "/atelier?tab=orders",
      tr("View order history", "عرض سجل الطلبات"),
    );
    return;
  }
  try {
    const { order } = await api("orders/" + encodeURIComponent(id));
    if (location.pathname === "/confirmation") {
      confirmedOrder = order.id;
      render();
    }
  } catch {
    if ($("#confirmation-status"))
      $("#confirmation-status").innerHTML = empty(
        tr("Order not available.", "الطلب غير متاح."),
        tr(
          "This order is not available in this browser session.",
          "هذا الطلب غير متاح في جلسة هذا المتصفح.",
        ),
        "/atelier?tab=orders",
        tr("View order history", "عرض سجل الطلبات"),
      );
  }
}
function header() {
  const path = location.pathname;
  $("#header").innerHTML =
    `<div class="notice">${tr("Independent concept study · No real purchases", "دراسة تصميم مستقلة · لا توجد مشتريات حقيقية")}<a href="/about" data-link>${tr("About this project", "عن المشروع")}</a></div><div class="nav wrap"><nav class="nav-links" aria-label="${tr("Main navigation", "التنقل الرئيسي")}"><a class="nav-link ${path === "/collection" ? "active" : ""}" href="/collection" data-link>${tr("The collection", "المجموعة")}</a><a class="nav-link" href="/finder" data-link>${tr("Find your scent", "اكتشف عطرك")}</a><a class="nav-link" href="/journal" data-link>${tr("The ritual", "الطقوس")}</a></nav><button class="icon-btn menu-trigger" data-action="menu" aria-label="${tr("Open menu", "افتح القائمة")}">${icon("menu")}</button><a href="/" data-link class="brand" aria-label="Raees Al Oud — ${tr("Home", "الرئيسية")}">${brand()}</a><div class="nav-tools"><button class="locale" data-action="language" aria-label="${tr("Switch to Arabic", "التبديل إلى الإنجليزية")}">${tr("العربية", "EN")}</button><button class="icon-btn" data-action="search" aria-label="${tr("Search fragrances", "ابحث عن العطور")}">${icon("search")}</button><a class="icon-btn desktop-tool" href="/atelier" data-link aria-label="${tr("My collection", "مجموعتي")}">${icon("heart")}</a><button class="icon-btn cart-trigger" data-action="cart" aria-label="${tr("Shopping bag", "حقيبة التسوق")}">${icon("bag")}${state.cart.items.length ? `<span class="count">${state.cart.items.reduce((s, i) => s + i.quantity, 0)}</span>` : ""}</button></div></div>`;
}
function footer() {
  $("#footer").innerHTML =
    `<div class="wrap"><div class="footer-top"><div class="footer-brand"><a href="/" data-link class="brand">${brand()}</a><p>${tr("A personal exploration of oud, fragrance, and the rituals that make them yours.", "رحلة شخصية مع العود والعطور والطقوس التي تمنحها طابعك الخاص.")}</p></div><div class="footer-links"><h3>${tr("Explore", "اكتشف")}</h3><a href="/collection" data-link>${tr("The collection", "المجموعة")}</a><a href="/finder" data-link>${tr("Find your scent", "اكتشف عطرك")}</a><a href="/atelier" data-link>${tr("My collection & demo orders", "مجموعتي وطلباتي التجريبية")}</a><a href="/journal" data-link>${tr("The ritual", "الطقوس")}</a></div><div class="footer-links"><h3>${tr("Good to know", "معلومات مفيدة")}</h3><a href="/about" data-link>${tr("About this concept", "عن هذا التصور")}</a><a href="/privacy" data-link>${tr("Privacy & your data", "الخصوصية وبياناتك")}</a><a href="/delivery" data-link>${tr("Delivery & returns", "التوصيل والإرجاع")}</a><a href="https://raeesaloud.com" target="_blank" rel="noopener">${tr("Visit the official store ↗", "زيارة المتجر الرسمي ↗")}</a></div></div><div class="footer-bottom"><span>${tr("Independent portfolio study. Not affiliated with Raees Al Oud.", "دراسة مستقلة لملف الأعمال. غير تابعة لرئيس العود.")}</span><span>${tr("UAE / AED · Catalogue reference: September 2026", "الإمارات / درهم · مرجع الكتالوج: سبتمبر ٢٠٢٦")}</span></div></div>`;
}
function card(p) {
  const saved = state.wishlist.includes(p.id),
    v = p.variants[0];
  return `<article class="product-card"><div class="product-image"><a href="/product/${p.id}" data-link tabindex="-1" aria-hidden="true"><img src="${p.images[0]}" alt="" width="500" height="580" loading="lazy" decoding="async"></a><button class="icon-btn save-btn ${saved ? "saved" : ""}" data-action="save" data-id="${p.id}" aria-label="${esc(tr(saved ? "Remove " + p.name + " from saved" : "Save " + p.name, saved ? "إزالة " + p.nameAr + " من المحفوظات" : "حفظ " + p.nameAr))}" aria-pressed="${saved}">${icon("heart")}</button>${!v.available ? `<span class="product-badge">${tr("UNAVAILABLE", "غير متوفر")}</span>` : ""}</div><div class="product-info"><p class="meta">${cat(p.category)}</p><div class="product-title"><h3><a href="/product/${p.id}" data-link>${esc(name(p))}</a></h3></div><p class="product-notes">${esc((lang === "ar" ? p.notesAr : p.notes).join(" · ") || tr("Explore the collection", "اكتشف المجموعة"))}</p><div class="product-price"><span>${p.variants.length > 1 ? tr("From ", "من ") : ""}<bdi>${money(v.price)}</bdi></span><a href="/product/${p.id}" data-link aria-label="${esc(tr("Explore " + p.name, "اكتشف " + p.nameAr))}">${tr("Discover", "اكتشف")}</a></div></div></article>`;
}
const grid = (items) =>
  `<div class="product-grid">${items.map(card).join("")}</div>`;
function home() {
  return `<section class="hero"><picture><source media="(max-width:600px)" srcset="/assets/oud-hero-small.webp"><img class="hero-img" src="/assets/oud-hero.webp" alt="${tr("Oud wood and an amber oil bottle in warm light", "خشب عود وزجاجة زيت كهرمانية في ضوء دافئ")}" width="1536" height="1024" fetchpriority="high"></picture><div class="wrap hero-inner"><span class="eyebrow">${tr("THE WORLD OF RAEES AL OUD", "عالم رئيس العود")}</span><h1>${tr("Some scents<br>become <em>you.</em>", "عطور تصبح<br><em>جزءاً منك.</em>")}</h1><p>${tr("Discover oud and fragrance for the everyday, the unforgettable, and everything in between.", "اكتشف العود والعطور للحظاتك اليومية، ولتلك التي لا تُنسى.")}</p><a href="/collection" data-link class="btn light">${tr("Explore the collection", "اكتشف المجموعة")}${arrow()}</a></div><div class="hero-foot"><span>${tr("OUD · PERFUME · PERSONAL RITUALS", "عود · عطور · طقوس شخصية")}</span><span>01 <i></i> ${tr("A SCENT OF YOUR OWN", "عطر يشبهك")}</span></div></section><div class="category-strip"><nav class="wrap category-inner" aria-label="${tr("Fragrance categories", "فئات العطور")}"><span class="eyebrow">${tr("Discover your ritual", "اكتشف طقوسك")}</span>${Object.keys(
    categories,
  )
    .filter((k) => k !== "all")
    .map((k) => `<a href="/collection?category=${k}" data-link>${cat(k)}</a>`)
    .join(
      "",
    )}</nav></div><section class="section wrap"><div class="section-head"><div><span class="eyebrow">${tr("AN INTRODUCTION TO THE COLLECTION", "بداية رحلتك مع المجموعة")}</span><h2>${tr("Find your signature.", "اكتشف بصمتك.")}</h2></div><a href="/collection" data-link class="text-link">${tr("View collection", "عرض المجموعة")}${arrow()}</a></div>${grid(products.slice(0, 4))}</section><section class="finder-banner wrap"><div class="finder-copy"><span class="eyebrow">${tr("THE SCENT FINDER", "دليلك إلى العطر")}</span><h2>${tr("Your scent.<br>Your own way.", "عطرك.<br>على طريقتك.")}</h2><p>${tr("A few simple preferences. A considered place to begin. Let’s find the notes you’re drawn to.", "تفضيلات بسيطة تفتح لك باب الاكتشاف. لنعثر على النفحات التي تميل إليها.")}</p><a href="/finder" data-link class="btn light">${tr("Find my fragrance", "اكتشف عطري")}${arrow()}</a></div><div class="finder-visual" aria-hidden="true">${["woody", "fresh", "spiced", "floral"].map((k) => `<div class="scent-cell"><span class="serif">${family(k)}</span><small>${tr(families[k][2], families[k][3])}</small></div>`).join("")}</div></section><section class="section wrap editorial"><img class="editorial-image" src="/assets/zura-yaumi-0.webp" loading="lazy" width="650" height="650" alt="${tr("Zura Yaumi oud wood", "خشب عود زورا يومي")}"><div class="editorial-copy"><span class="eyebrow">${tr("A MOMENT, MADE MEANINGFUL", "لحظة تحمل معنى")}</span><h2>${tr("More than a scent.<br>A ritual to return to.", "أكثر من عطر.<br>طقوس تعود إليها.")}</h2><p>${tr("The wood you choose. The fragrance you reach for. The familiar notes that make a space feel like yours. Discover the different forms of oud, and find your own way to enjoy them.", "الخشب الذي تختاره. العطر الذي تفضله. والنفحات المألوفة التي تمنح المكان طابعك. اكتشف أشكال العود المختلفة، واختر طريقتك للاستمتاع بها.")}</p><a href="/journal" data-link class="text-link">${tr("Explore the ritual", "اكتشف الطقوس")}${arrow()}</a></div></section><div class="wrap values">${[
    [
      "leaf",
      tr("Considered discovery", "اكتشاف مدروس"),
      tr("Explore by notes and fragrance form", "استكشف النفحات وأشكال العطور"),
    ],
    [
      "heart",
      tr("A collection that’s yours", "مجموعة تشبهك"),
      tr(
        "Save your favourites for another visit",
        "احفظ مفضلاتك لزيارتك القادمة",
      ),
    ],
    [
      "shield",
      tr("Clarity at every step", "وضوح في كل خطوة"),
      tr(
        "Transparent prices. No real payments.",
        "أسعار واضحة. دون مدفوعات حقيقية.",
      ),
    ],
  ]
    .map(
      ([i, h, p]) =>
        `<div class="value">${icon(i)}<div><p>${h}</p><small>${p}</small></div></div>`,
    )
    .join("")}</div>`;
}
function collection() {
  const params = new URLSearchParams(location.search),
    category = params.get("category") || "all",
    sort = params.get("sort") || "curated";
  let items = products.filter(
    (p) => category === "all" || p.category === category,
  );
  if (sort === "low")
    items.sort((a, b) => a.variants[0].price - b.variants[0].price);
  if (sort === "high")
    items.sort((a, b) => b.variants[0].price - a.variants[0].price);
  return `<section class="wrap catalog-section"><div class="page-intro"><span class="eyebrow">${tr("A WORLD OF SCENT", "عالم من العطور")}</span><h1>${category === "all" ? tr("The collection.", "المجموعة.") : cat(category)}</h1><p>${tr("From the richness of oud to the brightness of citrus. Find the notes that feel like you.", "من عمق العود إلى إشراقة الحمضيات. اكتشف النفحات التي تشبهك.")}</p></div><div class="filters"><div class="filter-tabs" aria-label="${tr("Category", "الفئة")}">${Object.keys(
    categories,
  )
    .map(
      (k) =>
        `<a class="chip ${category === k ? "active" : ""}" href="/collection?category=${k}&sort=${sort}" data-link ${category === k ? 'aria-current="true"' : ""}>${cat(k)}</a>`,
    )
    .join(
      "",
    )}</div><label class="select-wrap">${tr("Sort", "الترتيب")}<select id="sort"><option value="curated" ${sort === "curated" ? "selected" : ""}>${tr("Our selection", "اختياراتنا")}</option><option value="low" ${sort === "low" ? "selected" : ""}>${tr("Price: low to high", "السعر: تصاعدياً")}</option><option value="high" ${sort === "high" ? "selected" : ""}>${tr("Price: high to low", "السعر: تنازلياً")}</option></select></label></div><p class="result-count">${items.length} ${tr("fragrances · Reference prices, not live offers", "عطراً · أسعار مرجعية وليست عروضاً حية")}</p>${grid(items)}</section>`;
}
function productPage(id) {
  const p = products.find((p) => p.id === id);
  if (!p) return notFound();
  if (!p.variants.some((v) => v.id === selectedVariant))
    selectedVariant = p.variants[0].id;
  const v = p.variants.find((v) => v.id === selectedVariant);
  return `<div class="wrap"><nav class="breadcrumb"><a href="/collection" data-link>${tr("The collection", "المجموعة")}</a><span>/</span><a href="/collection?category=${p.category}" data-link>${cat(p.category)}</a><span>/</span><span>${esc(name(p))}</span></nav><section class="pdp"><div class="pdp-gallery"><img id="pdp-image" class="pdp-main-image" src="${p.images[0]}" alt="${esc(name(p))}" width="1000" height="1000">${p.images.length > 1 ? `<div class="thumbs">${p.images.map((src, i) => `<button data-action="image" data-src="${src}" aria-label="${tr("View image ", "عرض الصورة ")}${i + 1}"><img src="${src}" alt="" width="70" height="70"></button>`).join("")}</div>` : ""}</div><div class="pdp-copy"><span class="eyebrow">${cat(p.category)}</span><h1>${esc(name(p))}</h1><p class="description">${esc(lang === "ar" ? p.descriptionAr : p.description)}</p><div class="note-tags">${(lang === "ar" ? p.notesAr : p.notes).map((n) => `<span>${esc(n)}</span>`).join("")}</div><p class="pdp-price"><bdi>${money(v.price)}</bdi></p><p class="small muted">${tr("Reference price · VAT included in demo totals", "سعر مرجعي · الضريبة مشمولة في الإجمالي التجريبي")}</p><div class="variant-options"><span class="label full-label">${tr("Choose your size", "اختر الحجم")}</span>${p.variants.map((x) => `<button class="chip ${x.id === v.id ? "active" : ""}" data-action="variant" data-id="${x.id}" aria-pressed="${x.id === v.id}">${variantLabel(x)}</button>`).join("")}</div>${v.label === "Standard" ? `<p class="small muted">${tr("Bottle volume is not specified in the source catalogue.", "حجم الزجاجة غير محدد في الكتالوج المرجعي.")}</p>` : ""}<div class="buy-row"><div class="quantity"><button data-action="pdp-minus" aria-label="${tr("Decrease quantity", "تقليل الكمية")}" ${quantity <= 1 ? "disabled" : ""}>−</button><span aria-live="polite">${quantity}</span><button data-action="pdp-plus" aria-label="${tr("Increase quantity", "زيادة الكمية")}" ${quantity >= 10 ? "disabled" : ""}>+</button></div><button class="btn" data-action="add" data-id="${p.id}" ${!v.available ? "disabled" : ""}>${v.available ? tr("Add to bag", "أضف إلى الحقيبة") : tr("Currently unavailable", "غير متوفر حالياً")}${v.available ? icon("bag") : ""}</button></div><button class="text-link" data-action="save" data-id="${p.id}">${icon("heart")}${state.wishlist.includes(p.id) ? tr("Saved to my collection", "محفوظ في مجموعتي") : tr("Save to my collection", "احفظ في مجموعتي")}</button><p class="pdp-assurance">${tr("Demo delivery: AED 25, complimentary from AED 1,000.", "توصيل تجريبي: ٢٥ درهماً، ومجاني للطلبات من ١٬٠٠٠ درهم.")}</p><div class="accordion"><details><summary>${tr("About this selection", "عن هذا المنتج")}</summary><p>${tr("Product names, images and reference prices are drawn from the public catalogue. Scent groupings are editorial guides, not guarantees of personal preference.", "الأسماء والصور والأسعار المرجعية من الكتالوج العام. تصنيفات الروائح دليل تحريري وليست ضماناً لملاءمة العطر لتفضيلاتك.")} <a href="${p.source}" target="_blank" rel="noopener">${tr("View source ↗", "عرض المصدر ↗")}</a></p></details><details><summary>${tr("Delivery & returns", "التوصيل والإرجاع")}</summary><p>${tr("This is a demonstration. No products are shipped. The official site lists conflicting return periods; confirm its current policy directly before a real purchase.", "هذه تجربة توضيحية ولا يتم شحن منتجات. يذكر الموقع الرسمي فترات إرجاع متعارضة؛ تحقق من السياسة الحالية قبل الشراء الحقيقي.")} <a href="/delivery" data-link>${tr("Read more", "اقرأ المزيد")}</a></p></details></div></div></section><section class="section"><div class="section-head"><div><span class="eyebrow">${tr("CONTINUE EXPLORING", "واصل الاكتشاف")}</span><h2>${tr("Another perspective.", "نفحات أخرى.")}</h2></div></div>${grid(products.filter((x) => x.id !== id && x.category === p.category).slice(0, 4))}</section></div>`;
}
function empty(
  title,
  description,
  link = "/collection",
  label = tr("Explore the collection", "اكتشف المجموعة"),
) {
  return `<div class="empty"><h2>${title}</h2><p>${description}</p><a href="${link}" data-link class="btn">${label}${arrow()}</a></div>`;
}
function dialogOpen(html, drawer = false) {
  const d = $("#dialog");
  const wasOpen = d.open;
  const focus = focusKey();
  if (!wasOpen) dialogOpener = focus;
  if (wasOpen) d.close();
  d.className = drawer ? "drawer" : "";
  d.innerHTML = html;
  d.setAttribute("aria-labelledby", "dialog-title");
  d.showModal();
  document.body.classList.add("modal-open");
  if (wasOpen) restoreFocus(focus);
}
function dialogClose() {
  clearTimeout(searchTimer);
  $("#dialog").close();
  document.body.classList.remove("modal-open");
  restoreFocus(dialogOpener);
}
const dialogHead = (title) =>
  `<div class="dialog-head"><h2 id="dialog-title">${title}</h2><button class="icon-btn" data-action="close" aria-label="${tr("Close", "إغلاق")}">${icon("close")}</button></div>`;
function cartHTML() {
  const c = state.cart;
  return `<div class="drawer-inner">${dialogHead(tr("Your bag", "حقيبتك"))}<div class="dialog-content">${serverError ? `<p class="error-banner">${errorText("service_unavailable")}</p>` : ""}${c.items.length ? `<div class="free-progress">${c.subtotal < 100000 ? tr(`${money(100000 - c.subtotal)} away from complimentary demo delivery.`, `يتبقى ${money(100000 - c.subtotal)} للتوصيل التجريبي المجاني.`) : tr("Complimentary demo delivery is included.", "التوصيل التجريبي المجاني مشمول.")}<progress max="100000" value="${Math.min(c.subtotal, 100000)}" aria-label="${tr("Progress to complimentary demo delivery", "التقدم نحو التوصيل التجريبي المجاني")}"></progress></div>${c.items.map((i) => `<div class="cart-line"><a href="/product/${i.productId}" data-link><img src="${i.image}" alt="${esc(lang === "ar" ? i.nameAr : i.name)}"></a><div><h3>${esc(lang === "ar" ? i.nameAr : i.name)}</h3><p>${variantLabel(i)}</p><div class="quantity"><button data-action="cart-minus" data-id="${i.variantId}" aria-label="${esc(tr("Decrease " + i.name, "تقليل " + i.nameAr))}" ${i.quantity <= 1 ? "disabled" : ""}>−</button><span>${i.quantity}</span><button data-action="cart-plus" data-id="${i.variantId}" aria-label="${esc(tr("Increase " + i.name, "زيادة " + i.nameAr))}" ${i.quantity >= 10 ? "disabled" : ""}>+</button></div></div><div class="line-end"><bdi>${money(i.price * i.quantity)}</bdi><button class="remove" data-action="remove" data-id="${i.variantId}">${tr("Remove", "إزالة")}</button></div></div>`).join("")}` : empty(tr("A little room for discovery.", "مساحة للاكتشاف."), tr("Find a fragrance that feels like you.", "اكتشف عطراً يشبهك."))}</div>${c.items.length ? `<div class="cart-summary">${totals(c)}<a class="btn full" href="/checkout" data-link>${tr("Review demo order", "مراجعة الطلب التجريبي")}${arrow()}</a><small>${tr("No payment. No shipment. A working concept.", "دون دفع أو شحن. تجربة توضيحية تعمل بالكامل.")}</small></div>` : ""}</div>`;
}
function totals(c) {
  return `<div class="sum-row"><span>${tr("Subtotal", "المجموع الفرعي")}</span><bdi>${money(c.subtotal)}</bdi></div><div class="sum-row"><span>${tr("Demo delivery", "التوصيل التجريبي")}</span><bdi>${c.shipping ? money(c.shipping) : tr("Complimentary", "مجاني")}</bdi></div><div class="sum-row small muted"><span>${tr("VAT included (demo 5%)", "الضريبة المشمولة (٥٪ تجريبية)")}</span><bdi>${money(c.vat ?? Math.round(c.subtotal / 21))}</bdi></div><div class="sum-row total"><span>${tr("Total", "الإجمالي")}</span><bdi>${money(c.total)}</bdi></div>`;
}
function finder() {
  const titles = [
    tr("What draws you in?", "ما الذي يجذبك؟"),
    tr("How do you enjoy fragrance?", "كيف تستمتع بالعطر؟"),
    tr("What feels right for you?", "ما الميزانية المناسبة لك؟"),
  ];
  const subtitles = [
    tr(
      "Start with the notes you naturally gravitate towards.",
      "ابدأ بالنفحات التي تميل إليها بطبيعتك.",
    ),
    tr(
      "Choose a form, or leave room for discovery.",
      "اختر الشكل الذي تفضله، أو اترك المجال للاكتشاف.",
    ),
    tr(
      "Choose a comfortable price range for one selection.",
      "اختر نطاقاً مريحاً لسعر المنتج الواحد.",
    ),
  ];
  let options = [];
  if (finderStep === 0)
    options = Object.entries(families).map(([id, a]) => ({
      id,
      label: tr(a[0], a[1]),
      desc: tr(a[2], a[3]),
    }));
  if (finderStep === 1)
    options = [
      {
        id: "perfume",
        label: cat("perfume"),
        desc: tr("A fragrance to wear", "عطر ترتديه"),
      },
      {
        id: "oud",
        label: cat("oud"),
        desc: tr("For your incense ritual", "لطقوس التبخير"),
      },
      {
        id: "oil",
        label: cat("oil"),
        desc: tr("Discover concentrated oils", "اكتشف الأدهان المركزة"),
      },
      {
        id: "any",
        label: tr("Surprise me", "دعني أكتشف"),
        desc: tr("Explore every form", "استكشف جميع الأشكال"),
      },
    ];
  if (finderStep === 2)
    options = [
      {
        id: "15000",
        label: tr("Up to AED 150", "حتى ١٥٠ درهماً"),
        desc: tr("An everyday discovery", "اكتشاف يومي"),
      },
      {
        id: "35000",
        label: tr("Up to AED 350", "حتى ٣٥٠ درهماً"),
        desc: tr("Something considered", "اختيار مميز"),
      },
      {
        id: "1000000",
        label: tr("Open to discovery", "منفتح على الاكتشاف"),
        desc: tr("No set budget", "دون ميزانية محددة"),
      },
    ];
  const key = ["family", "format", "budget"][finderStep];
  return `<section class="finder-page"><span class="eyebrow">${tr("THE SCENT FINDER", "دليلك إلى العطر")} · ${finderStep + 1}/3</span><h1>${titles[finderStep]}</h1><p>${subtitles[finderStep]}</p><div class="steps" aria-hidden="true">${[0, 1, 2].map((i) => `<span class="${i <= finderStep ? "active" : ""}"></span>`).join("")}</div><div class="choice-grid">${options.map((o) => `<button class="choice ${String(answers[key]) === o.id ? "selected" : ""}" data-action="choice" data-id="${o.id}" aria-pressed="${String(answers[key]) === o.id}"><span class="serif">${o.label}</span><small>${o.desc}</small></button>`).join("")}</div><div class="finder-actions">${finderStep ? `<button class="btn outline" data-action="finder-back">${tr("Back", "رجوع")}</button>` : ""}<button class="btn" data-action="finder-next" ${answers[key] === undefined ? "disabled" : ""}>${finderStep === 2 ? tr("Discover my matches", "اكتشف اختياراتي") : tr("Continue", "متابعة")}${arrow()}</button></div><p class="small muted finder-note">${tr("A guide to discovery, based on published notes and your preferences. Saved in this browser’s private demo collection.", "دليل للاكتشاف يعتمد على النفحات المنشورة وتفضيلاتك. يُحفظ في مجموعتك التجريبية الخاصة بهذا المتصفح.")}</p></section>`;
}
function matches() {
  const p = state.profile;
  let items = products.filter(
    (x) =>
      x.variants[0].available &&
      x.variants[0].price <= (p.budget || 1000000) &&
      (p.format === "any" || !p.format || x.category === p.format),
  );
  items.sort(
    (a, b) => Number(b.family === p.family) - Number(a.family === p.family),
  );
  const exact = items.filter((x) => x.family === p.family);
  return `<section class="wrap section"><div class="page-intro"><span class="eyebrow">${tr("YOUR SCENT EDIT", "اختياراتك العطرية")}</span><h1>${tr("A place to begin.", "بداية رحلتك.")}</h1><p>${exact.length ? tr(`Drawn to ${family(p.family).toLowerCase()} notes? These selections are a starting point, chosen from published fragrance descriptions.`, `تميل إلى الطابع ${family(p.family)}؟ هذه الاختيارات نقطة بداية تستند إلى أوصاف العطور المنشورة.`) : tr("There isn’t an exact note match in this format and budget. Here are alternatives within your selections.", "لا يوجد تطابق دقيق ضمن الشكل والميزانية المحددين. إليك بدائل ضمن اختياراتك.")}</p><a href="/finder" data-link class="text-link">${tr("Refine my preferences", "تعديل تفضيلاتي")}${arrow()}</a></div>${items.length ? grid((exact.length ? exact : items).slice(0, 4)) : empty(tr("A little more room to explore.", "مجال أوسع للاكتشاف."), tr("Try another format or a wider budget.", "جرّب شكلاً آخر أو ميزانية أوسع."), "/finder", tr("Adjust preferences", "تعديل التفضيلات"))}</section>`;
}
function atelier() {
  return `<section class="wrap section"><div class="page-intro"><span class="eyebrow">${tr("YOUR PERSONAL ATELIER", "مساحتك الشخصية")}</span><h1>${tr("Worth coming back to.", "اختيارات تستحق العودة.")}</h1><p>${tr("The fragrances you love, the notes you’re drawn to. All in one place, ready for your next visit.", "العطور التي تحبها والنفحات التي تفضلها. في مكان واحد، بانتظار زيارتك القادمة.")}</p></div>${state.profile.family ? `<div class="profile-banner"><div><span class="eyebrow">${tr("YOUR SCENT PREFERENCE", "تفضيلك العطري")}</span><h2>${family(state.profile.family)}</h2><p class="small muted">${state.profile.format === "any" ? tr("All forms", "جميع الأشكال") : cat(state.profile.format)} · ${state.profile.budget === 1000000 ? tr("Open budget", "ميزانية مفتوحة") : money(state.profile.budget)}</p></div><a href="/matches" data-link class="text-link">${tr("Revisit my scent edit", "عد إلى اختياراتي")}${arrow()}</a></div>` : ""}<div class="atelier-tabs"><button class="${atelierTab === "saved" ? "active" : ""}" data-action="atelier-tab" data-id="saved">${tr("Saved fragrances", "العطور المحفوظة")} (${state.wishlist.length})</button><button class="${atelierTab === "orders" ? "active" : ""}" data-action="atelier-tab" data-id="orders">${tr("Demo order history", "سجل الطلبات التجريبية")}</button></div><div id="atelier-content">${atelierTab === "saved" ? (state.wishlist.length ? grid(products.filter((p) => state.wishlist.includes(p.id))) : empty(tr("Keep what speaks to you.", "احتفظ بما يشبهك."), tr("Tap the heart on a fragrance to start your collection.", "اضغط على القلب بجانب العطر لتبدأ مجموعتك."))) : `<p role="status">${tr("Loading demo orders…", "جارٍ تحميل الطلبات التجريبية…")}</p>`}</div><p class="small muted atelier-note">${tr("Saved for this browser for 30 days. No account or cross-device sync.", "محفوظة لهذا المتصفح لمدة ٣٠ يوماً. دون حساب أو مزامنة بين الأجهزة.")} <a href="/privacy" data-link class="text-link">${tr("Manage my data", "إدارة بياناتي")}</a></p></section>`;
}
async function loadOrders() {
  try {
    const { orders } = await api("orders");
    if (location.pathname !== "/atelier" || atelierTab !== "orders") return;
    $("#atelier-content").innerHTML = orders.length
      ? orders
          .map(
            (o) =>
              `<article class="order"><div class="order-top"><div><span class="eyebrow">${tr("SIMULATED ORDER", "طلب محاكى")} · ${esc(o.id.slice(0, 8).toUpperCase())}</span><p class="small muted">${new Date(o.created).toLocaleDateString(lang === "ar" ? "ar-AE" : "en-GB", { dateStyle: "long" })}</p></div><bdi>${money(o.total)}</bdi></div><div class="order-products">${o.items.map((i) => `<a href="/product/${i.productId}" data-link aria-label="${esc(lang === "ar" ? i.nameAr : i.name)}"><img src="${i.image}" alt="${esc(lang === "ar" ? i.nameAr : i.name)}" width="70" height="80" loading="lazy"></a>`).join("")}</div><p class="small muted">${o.items.map((i) => `${esc(lang === "ar" ? i.nameAr : i.name)} × ${i.quantity}`).join(" · ")}</p><button class="text-link" data-action="reorder" data-id="${o.id}">${tr("Add these to my bag again", "أضفها إلى حقيبتي مجدداً")}${arrow()}</button></article>`,
          )
          .join("")
      : empty(
          tr("Your rituals start here.", "هنا تبدأ طقوسك."),
          tr(
            "Create a demo order to explore returning and reordering. No payment or delivery takes place.",
            "أنشئ طلباً تجريبياً لاستكشاف العودة وإعادة الطلب. لا يتم دفع أو توصيل.",
          ),
        );
  } catch {
    $("#atelier-content").innerHTML =
      `<p class="error-banner">${errorText("service_unavailable")}</p><button class="btn outline" data-action="retry-orders">${tr("Try again", "حاول مجدداً")}</button>`;
  }
}
function checkout() {
  if (!state.cart.items.length)
    return empty(
      tr("Your bag is waiting.", "حقيبتك بانتظارك."),
      tr(
        "Add a fragrance before creating a demo order.",
        "أضف عطراً قبل إنشاء طلب تجريبي.",
      ),
    );
  return `<section class="wrap"><div class="page-intro"><span class="eyebrow">${tr("A DEMONSTRATION CHECKOUT", "تجربة إتمام طلب توضيحية")}</span><h1>${tr("One last look.", "نظرة أخيرة.")}</h1><p>${tr("A real working journey, with no real purchase. No payment or personal details required.", "رحلة تعمل بالكامل دون شراء حقيقي. لا نحتاج إلى بيانات شخصية أو معلومات دفع.")}</p></div><div class="checkout-layout"><div><div class="checkout-card"><h2>${tr("Delivery, for demonstration.", "توصيل للتوضيح فقط.")}</h2><p>${tr("Demo customer · Sample Dubai address, UAE.", "عميل تجريبي · عنوان نموذجي في دبي، الإمارات.")}</p><p>${tr("No parcel will be sent. AED 25 demo delivery, complimentary on a subtotal of AED 1,000 or more.", "لن يتم إرسال طرد. توصيل تجريبي بقيمة ٢٥ درهماً، ومجاني للمجموع الفرعي من ١٬٠٠٠ درهم.")}</p></div><div class="checkout-card"><h2>${tr("No payment needed.", "لا حاجة للدفع.")}</h2><p>${tr("Creating this demo order saves its contents to your private browser session. You can revisit it and add the same selection to your bag again.", "إنشاء هذا الطلب التجريبي يحفظ محتوياته في جلسة متصفحك الخاصة. يمكنك العودة إليه وإضافة الاختيارات ذاتها إلى الحقيبة.")}</p></div><a class="text-link" href="/privacy" data-link>${tr("How your demo data is handled", "كيفية التعامل مع بياناتك التجريبية")}${arrow()}</a></div><div class="checkout-card"><h2>${tr("Your selection", "اختياراتك")}</h2>${state.cart.items.map((i) => `<div class="mini-product"><img src="${i.image}" alt="" width="75" height="90"><div><h3>${esc(lang === "ar" ? i.nameAr : i.name)}</h3><p>${variantLabel(i)} · ${tr("Qty", "الكمية")} ${i.quantity}</p><bdi class="small">${money(i.price * i.quantity)}</bdi></div></div>`).join("")}${totals(state.cart)}<div id="checkout-error" role="alert"></div><button class="btn full" data-action="checkout">${tr("Create demo order", "إنشاء طلب تجريبي")}${arrow()}</button><button class="text-link" data-action="cart">${tr("Edit my bag", "تعديل الحقيبة")}</button></div></div></section>`;
}
function confirmation() {
  if (!confirmedOrder)
    return `<div class="empty" id="confirmation-status" role="status">${tr("Checking your demo order…", "جارٍ التحقق من طلبك التجريبي…")}</div>`;
  return `<section class="confirmation">${icon("check")}<p class="eyebrow">${tr("DEMO ORDER SAVED", "تم حفظ الطلب التجريبي")}</p><h1>${tr("Until your next ritual.", "إلى طقوسك القادمة.")}</h1><p>${tr("Your simulated order is saved. No payment was taken and nothing will be shipped. Your collection is ready whenever you return.", "تم حفظ طلبك المحاكى. لم يتم تحصيل أي مبلغ ولن يتم شحن منتجات. مجموعتك بانتظار عودتك.")}</p><a href="/atelier?tab=orders" data-link class="btn">${tr("View my demo orders", "عرض طلباتي التجريبية")}${arrow()}</a></section>`;
}
function article(kind) {
  if (kind === "journal")
    return `<article class="article"><span class="eyebrow">${tr("THE RITUAL", "الطقوس")}</span><h1>${tr("Find your own rhythm.", "اكتشف إيقاعك الخاص.")}</h1><p>${tr("Fragrance can be a small, intentional part of the day. Begin with the form you enjoy, then explore what makes each selection different.", "يمكن للعطر أن يكون تفصيلاً صغيراً ومدروساً في يومك. ابدأ بالشكل الذي تستمتع به، ثم اكتشف ما يميز كل اختيار.")}</p><h2>${cat("oud")}</h2><p>${tr("Oud wood is a different experience from a bottled perfume. The catalogue offers weights in grams and tola; compare the gram weights when choosing. For heating or burning, follow the instructions for your incense burner and ensure appropriate ventilation.", "خشب العود تجربة تختلف عن العطر المعبأ. يعرض الكتالوج أوزاناً بالغرام والتولة؛ قارن الوزن بالغرام عند الاختيار. عند التسخين أو التبخير، اتبع تعليمات المبخرة واحرص على تهوية مناسبة.")}</p><h2>${cat("oil")}</h2><p>${tr("Dehnal Oud is the oil format in this collection. Sizes are listed in millilitres. Read the product instructions before use; the public catalogue does not provide a complete ingredient list for every oil.", "دهن العود هو الشكل الزيتي في هذه المجموعة. الأحجام مذكورة بالملليلتر. اقرأ تعليمات المنتج قبل الاستخدام؛ الكتالوج العام لا يقدم قائمة مكونات كاملة لكل دهن.")}</p><h2>${tr("A fragrance to wear", "عطر ترتديه")}</h2><p>${tr("Citrus, rose, spice, wood: notes are a starting point, not a promise of how a fragrance will feel to you. Save a few that interest you, compare their descriptions, and sample in person where possible.", "حمضيات وورد وتوابل وأخشاب: النفحات نقطة بداية وليست وعداً بتجربتك الشخصية. احفظ ما يلفت انتباهك، وقارن الأوصاف، وجرّب العطر بنفسك متى أمكن.")}</p><a href="/finder" data-link class="btn">${tr("Find my starting point", "اكتشف نقطة البداية")}${arrow()}</a></article>`;
  if (kind === "privacy")
    return `<article class="article"><span class="eyebrow">${tr("YOUR DATA, YOUR CHOICE", "بياناتك، قرارك")}</span><h1>${tr("A little clarity.", "بعض الوضوح.")}</h1><p>${tr("This independent demonstration stores your saved products, scent preferences, bag and simulated orders in a database. A necessary, HTTP-only session cookie connects this browser to those records for 30 days. Your language preference is stored on this device.", "تخزن هذه التجربة المستقلة منتجاتك المحفوظة وتفضيلاتك وحقيبتك وطلباتك المحاكاة في قاعدة بيانات. يربط ملف تعريف ارتباط ضروري وآمن من نوع HTTP-only هذا المتصفح بتلك السجلات لمدة ٣٠ يوماً. يُحفظ تفضيل اللغة على جهازك.")}</p><p>${tr("There is no account, no cross-device synchronization, no advertising tracker, and no marketing signup. We do not ask for your name, address, email, phone number or payment details. Hosting providers may process operational connection logs.", "لا يوجد حساب أو مزامنة بين الأجهزة أو تتبع إعلاني أو تسجيل تسويقي. لا نطلب اسمك أو عنوانك أو بريدك أو هاتفك أو بيانات دفعك. قد يعالج مزود الاستضافة سجلات الاتصال التشغيلية.")}</p><p>${tr("Expired sessions cannot be accessed and are removed during subsequent session creation. You can delete your demo records now. This also clears your saved preferences, bag and order history.", "لا يمكن الوصول إلى الجلسات المنتهية وتُحذف عند إنشاء جلسات لاحقة. يمكنك حذف بياناتك التجريبية الآن، بما فيها التفضيلات والحقيبة وسجل الطلبات.")}</p><button class="btn outline" data-action="reset-prompt">${tr("Delete my demo data", "حذف بياناتي التجريبية")}</button><h2>${tr("Before a real launch", "قبل الإطلاق الفعلي")}</h2><p>${tr("Production use requires an approved privacy notice, defined retention and processing arrangements, appropriate customer rights processes, and review of applicable UAE laws. This portfolio concept is not a legal compliance certification.", "يتطلب الاستخدام الفعلي إشعار خصوصية معتمداً وترتيبات واضحة للاحتفاظ والمعالجة وآليات مناسبة لحقوق العملاء ومراجعة القوانين الإماراتية المنطبقة. هذا التصور ليس شهادة امتثال قانوني.")}</p></article>`;
  if (kind === "delivery")
    return `<article class="article"><span class="eyebrow">${tr("BEFORE YOU CHOOSE", "قبل أن تختار")}</span><h1>${tr("Clear from the start.", "وضوح منذ البداية.")}</h1><h2>${tr("This concept", "هذا التصور")}</h2><p>${tr("All orders are simulated. No money is collected and no products are delivered. The demo uses AED 25 delivery, free from AED 1,000, and treats listed prices as inclusive of 5% VAT for the example calculation. These are demonstration assumptions, not business promises.", "جميع الطلبات محاكاة. لا يتم تحصيل أموال أو توصيل منتجات. تعتمد التجربة توصيلاً بقيمة ٢٥ درهماً ومجانياً من ١٬٠٠٠ درهم، وتعتبر الأسعار شاملة لضريبة ٥٪ للحساب التوضيحي. هذه افتراضات تجريبية وليست وعوداً تجارية.")}</p><h2>${tr("The official store", "المتجر الرسمي")}</h2><p>${tr("At the time of review, the official shipping policy listed 1–3 business days for processing and 1–3 business days for UAE delivery. These are separate timeframes. Its announcement said four-day returns while the refund policy said two days for unopened items. Confirm the current terms directly before purchasing.", "وقت المراجعة، ذكرت سياسة الشحن الرسمية ١–٣ أيام عمل للمعالجة و١–٣ أيام عمل للتوصيل داخل الإمارات، وهما فترتان منفصلتان. ذكر الإعلان إرجاعاً خلال أربعة أيام، بينما ذكرت السياسة يومين للمنتجات غير المفتوحة. تحقق من الشروط الحالية قبل الشراء.")}</p><p><a href="https://raeesaloud.com/policies/shipping-policy" target="_blank" rel="noopener">${tr("Official shipping policy ↗", "سياسة الشحن الرسمية ↗")}</a> · <a href="https://raeesaloud.com/policies/refund-policy" target="_blank" rel="noopener">${tr("Official returns policy ↗", "سياسة الإرجاع الرسمية ↗")}</a></p></article>`;
  return `<article class="article"><span class="eyebrow">${tr("AN INDEPENDENT CONCEPT STUDY", "دراسة تصميم مستقلة")}</span><h1>${tr("A considered next chapter.", "فصل جديد مدروس.")}</h1><p>${tr("An independent portfolio exploration of the Raees Al Oud shopping experience. This project is not affiliated with, commissioned by, or endorsed by the business. Its purpose is to demonstrate an approach to fragrance discovery, purchase clarity and thoughtful return visits.", "استكشاف مستقل لتجربة التسوق لدى رئيس العود ضمن ملف أعمال. المشروع غير تابع للشركة ولم يُنفذ بتكليف منها ولا يمثل تأييداً منها. هدفه عرض نهج لاكتشاف العطور ووضوح الشراء وتشجيع العودة.")}</p><h2>${tr("The idea", "الفكرة")}</h2><p>${tr("Help customers find a useful starting point, keep the fragrances they love, and return to a familiar collection. These are design hypotheses; no conversion or retention uplift is claimed.", "مساعدة العملاء على العثور على بداية مناسبة وحفظ العطور التي يحبونها والعودة إلى مجموعة مألوفة. هذه فرضيات تصميمية، دون ادعاء تحسن مثبت في التحويل أو الاحتفاظ.")}</p><h2>${tr("What you can try", "ما يمكنك تجربته")}</h2><p>${tr("Browse 29 catalogue references, discover by scent, save favourites, choose variants, edit your bag, create a simulated order and reorder from its history. The journey works in English and Arabic. Arabic copy remains subject to native editorial review.", "تصفح ٢٩ منتجاً مرجعياً، واكتشف حسب النفحات واحفظ المفضلات واختر الأحجام وعدل الحقيبة وأنشئ طلباً محاكى وأعد الطلب من السجل. الرحلة متاحة بالعربية والإنجليزية. النص العربي يحتاج إلى مراجعة تحريرية من متحدث أصلي.")}</p><h2>${tr("Sources & imagery", "المصادر والصور")}</h2><p>${tr("Product names, prices and photographs reference the public Raees Al Oud catalogue reviewed on 16 September 2026. They are not live stock or pricing. Rights remain with their respective owners; broader commercial reuse requires permission. The editorial still life is illustrative and does not depict a catalogue product.", "الأسماء والأسعار والصور مرجعها كتالوج رئيس العود العام، الذي روجع في ١٦ سبتمبر ٢٠٢٦. لا تمثل مخزوناً أو أسعاراً حية. الحقوق لأصحابها ويتطلب الاستخدام التجاري الأوسع إذناً. الصورة الرئيسية توضيحية ولا تمثل منتجاً من الكتالوج.")}</p><a href="/collection" data-link class="btn">${tr("Explore the concept", "استكشف التصور")}${arrow()}</a></article>`;
}
function notFound() {
  return empty(
    tr("A different path.", "مسار مختلف."),
    tr(
      "We couldn’t find that page. Return to the collection to keep exploring.",
      "لم نعثر على هذه الصفحة. عد إلى المجموعة لمواصلة الاكتشاف.",
    ),
  );
}
function render() {
  const priorFocus = focusKey();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  $(".skip").textContent = tr("Skip to content", "انتقل إلى المحتوى");
  header();
  footer();
  const path = location.pathname;
  let html;
  if (path === "/") html = home();
  else if (path === "/collection") html = collection();
  else if (path.startsWith("/product/")) html = productPage(path.split("/")[2]);
  else if (path === "/finder") html = finder();
  else if (path === "/matches")
    html = state.profile.family
      ? matches()
      : empty(
          tr("Let’s find your starting point.", "لنجد نقطة البداية."),
          tr(
            "Choose your preferences to discover a scent edit.",
            "اختر تفضيلاتك لاكتشاف مجموعة تناسبك.",
          ),
          "/finder",
          tr("Find my fragrance", "اكتشف عطري"),
        );
  else if (path === "/atelier") html = atelier();
  else if (path === "/checkout") html = checkout();
  else if (path === "/confirmation") html = confirmation();
  else if (["/journal", "/privacy", "/delivery", "/about"].includes(path))
    html = article(path.slice(1));
  else html = notFound();
  $("#main").innerHTML =
    (serverError
      ? `<div class="wrap error-banner" role="alert">${tr("Your saved collection is temporarily unavailable. Browsing still works.", "مجموعتك المحفوظة غير متاحة مؤقتاً. يمكنك مواصلة التصفح.")} <button data-action="retry" class="text-link">${tr("Reconnect", "إعادة الاتصال")}</button></div>`
      : "") + html;
  document.title = `${path.startsWith("/product/") ? name(products.find((p) => p.id === path.split("/")[2]) || { name: "Collection", nameAr: "المجموعة" }) : tr("A scent of your own", "عطر يشبهك")} — Raees Al Oud`;
  if (path === "/atelier" && atelierTab === "orders") loadOrders();
  if (path === "/confirmation" && !confirmedOrder) verifyConfirmation();
  restoreFocus(priorFocus);
}
function navigate(url) {
  dialogClose();
  const next = new URL(url, location.origin);
  history.pushState({}, "", next.pathname + next.search);
  selectedVariant = "";
  quantity = 1;
  if (next.pathname !== "/confirmation") confirmedOrder = null;
  if (next.pathname === "/finder") {
    finderStep = 0;
    answers = { ...state.profile };
  }
  if (next.pathname === "/atelier" && next.searchParams.get("tab"))
    atelierTab = next.searchParams.get("tab");
  const update = () => {
    render();
    window.scrollTo(0, 0);
    $("#main").focus({ preventScroll: true });
  };
  if (
    document.startViewTransition &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    document.startViewTransition(update);
  else update();
}
async function mutate(path, method, data) {
  if (busy) return false;
  if (serverError) {
    toast(errorText("service_unavailable"));
    return false;
  }
  busy = true;
  try {
    state = await api(path, method, { ...data, revision: state.revision });
    header();
    return true;
  } catch (e) {
    if (e.message === "conflict") {
      state = await api("state").catch(() => state);
      const cartWasOpen = $("#dialog").open && $("#dialog").classList.contains("drawer");
      render();
      if (cartWasOpen) showCart();
    }
    toast(errorText(e.message));
    return false;
  } finally {
    busy = false;
  }
}
async function saveProduct(id) {
  const saved = state.wishlist.includes(id);
  if (
    await mutate("wishlist", "PUT", {
      ids: saved
        ? state.wishlist.filter((x) => x !== id)
        : [...state.wishlist, id],
    })
  ) {
    const y = scrollY;
    render();
    scrollTo(0, y);
    toast(
      saved
        ? tr("Removed from your collection.", "تمت الإزالة من مجموعتك.")
        : tr("Saved for your next visit.", "تم الحفظ لزيارتك القادمة."),
    );
  }
}
async function changeCart(items, open = true) {
  if (await mutate("cart", "PUT", { items })) {
    if (location.pathname === "/checkout") render();
    if (open) showCart();
    return true;
  }
  return false;
}
function showCart() {
  dialogOpen(cartHTML(), true);
  $("#dialog").setAttribute("aria-labelledby", "dialog-title");
}
function showSearch() {
  dialogOpen(
    `${dialogHead(tr("Find a fragrance", "ابحث عن عطر"))}<div class="dialog-content"><label class="search-field">${icon("search")}<input id="search" type="search" placeholder="${tr("Oud, rose, a favourite…", "عود، ورد، عطر مفضل…")}" aria-label="${tr("Search products or notes", "ابحث عن منتج أو نفحات")}" maxlength="100"></label><div class="search-results" id="search-results"><p class="muted small">${tr("Search by name, fragrance form or note.", "ابحث بالاسم أو شكل العطر أو النفحات.")}</p></div></div>`,
  );
  $("#dialog").setAttribute("aria-labelledby", "dialog-title");
  $("#search").focus();
}
function searchResults(query) {
  if (!$("#search-results")) return;
  const q = query.trim().toLocaleLowerCase();
  const found = q
    ? products
        .filter((p) =>
          [p.name, p.nameAr, cat(p.category), ...p.notes, ...p.notesAr]
            .join(" ")
            .toLocaleLowerCase()
            .includes(q),
        )
        .slice(0, 8)
    : [];
  $("#search-results").innerHTML = found.length
    ? found
        .map(
          (p) =>
            `<a class="mini-product" href="/product/${p.id}" data-link><img src="${p.images[0]}" alt="" width="75" height="90"><div><h3>${esc(name(p))}</h3><p>${cat(p.category)} · <bdi>${money(p.variants[0].price)}</bdi></p></div>${arrow()}</a>`,
        )
        .join("")
    : `<p class="muted small" role="status">${q ? tr("No matches yet. Try “oud”, “rose” or another name.", "لا توجد نتائج. جرب «عود» أو «ورد» أو اسماً آخر.") : tr("Search by name, fragrance form or note.", "ابحث بالاسم أو شكل العطر أو النفحات.")}</p>`;
}
document.addEventListener("click", async (e) => {
  const link = e.target.closest("a[data-link]");
  if (link && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
    e.preventDefault();
    navigate(link.href);
    return;
  }
  const button = e.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action,
    id = button.dataset.id;
  if (action === "close") dialogClose();
  else if (action === "language") {
    lang = lang === "en" ? "ar" : "en";
    localStorage.setItem("raees-language", lang);
    dialogClose();
    render();
  } else if (action === "menu") {
    dialogOpen(
      `${dialogHead(tr("Explore", "اكتشف"))}<nav class="dialog-content mobile-nav"><a href="/collection" data-link>${tr("The collection", "المجموعة")}</a><a href="/finder" data-link>${tr("Find your scent", "اكتشف عطرك")}</a><a href="/atelier" data-link>${tr("My collection", "مجموعتي")}</a><a href="/journal" data-link>${tr("The ritual", "الطقوس")}</a></nav>`,
    );
  } else if (action === "search") showSearch();
  else if (action === "cart") showCart();
  else if (action === "save") await saveProduct(id);
  else if (action === "variant") {
    selectedVariant = id;
    const y = scrollY;
    render();
    scrollTo(0, y);
  } else if (action === "pdp-plus" || action === "pdp-minus") {
    quantity = Math.min(
      10,
      Math.max(1, quantity + (action === "pdp-plus" ? 1 : -1)),
    );
    const y = scrollY;
    render();
    scrollTo(0, y);
  } else if (action === "image") $("#pdp-image").src = button.dataset.src;
  else if (action === "add") {
    const items = state.cart.items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
    }));
    const existing = items.find((i) => i.variantId === selectedVariant);
    if (existing && existing.quantity + quantity > 10) {
      toast(errorText("invalid_quantity"));
      return;
    }
    if (existing) existing.quantity += quantity;
    else items.push({ productId: id, variantId: selectedVariant, quantity });
    await changeCart(items);
  } else if (["cart-plus", "cart-minus", "remove"].includes(action)) {
    const items = state.cart.items
      .filter((i) => action !== "remove" || i.variantId !== id)
      .map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity:
          i.quantity +
          (i.variantId === id
            ? action === "cart-plus"
              ? 1
              : action === "cart-minus"
                ? -1
                : 0
            : 0),
      }));
    await changeCart(items);
  } else if (action === "choice") {
    answers[["family", "format", "budget"][finderStep]] =
      finderStep === 2 ? Number(id) : id;
    render();
  } else if (action === "finder-back") {
    finderStep--;
    render();
    $("#main").focus({ preventScroll: true });
  } else if (action === "finder-next") {
    if (finderStep < 2) {
      finderStep++;
      render();
      $("#main").focus({ preventScroll: true });
    } else if (await mutate("profile", "PUT", answers)) navigate("/matches");
  } else if (action === "atelier-tab") {
    atelierTab = id;
    render();
  } else if (action === "retry-orders") loadOrders();
  else if (action === "reorder") {
    if (await mutate("reorder", "POST", { orderId: id })) showCart();
  } else if (action === "checkout") {
    if (busy) return;
    busy = true;
    button.disabled = true;
    button.textContent = tr(
      "Saving your demo order…",
      "جارٍ حفظ الطلب التجريبي…",
    );
    checkoutKey ??= crypto.randomUUID();
    try {
      const result = await api("orders", "POST", {
        key: checkoutKey,
        revision: state.revision,
      });
      state = result.state;
      confirmedOrder = result.orderId;
      checkoutKey = null;
      navigate("/confirmation?order=" + result.orderId);
    } catch (err) {
      if (err.message === "conflict") {
        state = await api("state").catch(() => state);
        checkoutKey = null;
        render();
      }
      const box = $("#checkout-error");
      if (box) {
        box.className = "error-banner";
        box.textContent = errorText(err.message);
      }
      const retryButton = document.querySelector('[data-action="checkout"]');
      if (retryButton) {
        retryButton.disabled = false;
        retryButton.textContent = tr("Try creating demo order again", "حاول إنشاء الطلب التجريبي مجدداً");
      }
    } finally {
      busy = false;
    }
  } else if (action === "reset-prompt")
    dialogOpen(
      `${dialogHead(tr("Delete your demo data?", "حذف بياناتك التجريبية؟"))}<div class="dialog-content"><p>${tr("This removes your saved fragrances, preferences, bag and demo order history from the server. This cannot be undone.", "سيؤدي ذلك إلى حذف العطور المحفوظة والتفضيلات والحقيبة وسجل الطلبات التجريبية من الخادم. لا يمكن التراجع عن ذلك.")}</p><button class="btn" data-action="reset">${tr("Delete my demo data", "حذف بياناتي التجريبية")}</button> <button class="btn outline" data-action="close">${tr("Keep my collection", "الاحتفاظ بمجموعتي")}</button></div>`,
    );
  else if (action === "reset") {
    try {
      await api("reset", "POST", {});
      localStorage.removeItem("raees-language");
      checkoutKey = null;
      state = await api("session", "POST", {});
      dialogClose();
      render();
      toast(
        tr("Your demo data has been deleted.", "تم حذف بياناتك التجريبية."),
      );
    } catch (e) {
      toast(errorText(e.message));
    }
  } else if (action === "retry") {
    try {
      state = await api("session", "POST", {});
      serverError = false;
      render();
    } catch (e) {
      toast(errorText(e.message));
    }
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "sort") {
    const params = new URLSearchParams(location.search);
    params.set("sort", e.target.value);
    navigate("/collection?" + params);
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "search") {
    clearTimeout(searchTimer);
    const value = e.target.value;
    searchTimer = setTimeout(() => searchResults(value), 100);
  }
});
$("#dialog").addEventListener("click", (e) => {
  if (e.target === $("#dialog")) {
    const r = e.target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialogClose();
  }
});
$("#dialog").addEventListener("close", () => {
  if (!$("#dialog").open) document.body.classList.remove("modal-open");
});
window.addEventListener("popstate", () => {
  dialogClose();
  confirmedOrder = null;
  render();
});
async function init() {
  try {
    const results = await Promise.allSettled([
      api("catalog"),
      api("session", "POST", {}),
    ]);
    if (results[0].status !== "fulfilled") throw new Error("catalog");
    products = results[0].value.products;
    if (results[1].status === "fulfilled") state = results[1].value;
    else serverError = true;
    ready = true;
    answers = { ...state.profile };
    if (new URLSearchParams(location.search).get("tab") === "orders")
      atelierTab = "orders";
    render();
  } catch {
    $("#main").innerHTML =
      `<div class="empty"><h1>${tr("We’ll be right back.", "سنعود قريباً.")}</h1><p>${tr("The collection could not load. Please refresh to try again.", "تعذر تحميل المجموعة. يرجى تحديث الصفحة والمحاولة مجدداً.")}</p><a class="btn" href="/">${tr("Try again", "حاول مجدداً")}</a></div>`;
  }
}
init();
