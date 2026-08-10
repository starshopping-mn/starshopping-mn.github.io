/**
 * Starshopping — backend
 *
 * Энэ файл Google Sheet дээрх Apps Script рүү бүтнээр нь хуулагдана.
 *
 *   setup()   → Бүх хуудас, багана, тайлбар, цагийн бүс, trigger-ийг бэлдэнэ
 *   doGet()   → Каталогийг JSON болгож сайт руу өгнө
 *   doPost()  → Захиалга хүлээж авч, SS-0001 код үүсгэн Orders-д бичнэ
 *
 * Тохиргоог доорх CONFIG дотроос л засна.
 */

const CONFIG = {
  timeZone: 'Asia/Ulaanbaatar',          // захиалгын огноо энэ бүсээр бичигдэнэ
  orderPrefix: 'SS-',
  notifyEvery: 10,                       // хэдэн захиалга тутамд имэйл илгээх
  notifyEmail: 'Ariunbold.agency@gmail.com',
  archiveAfterHours: 48,
  shop: {
    bank: 'Худалдаа Хөгжлийн банк',
    account: '740004000460072440',
    holder: 'Аюурзана Ариунболд',
    phones: ['88104640', '94114495'],
    email: 'Ariunbold.agency@gmail.com',
    // prepaid: тухайн сонголтоор хүргэлтийн ажилтан бэлэн мөнгө авах
    // боломжгүй тул зөвхөн урьдчилсан шилжүүлэг зөвшөөрөгдөнө
    delivery: [
      { name: 'Энгийн хүргэлт', price: 6000, note: 'Улаанбаатар хот' },
      { name: 'Шуурхай хүргэлт', price: 12000, note: 'Улаанбаатар хот' },
      { name: 'Орон нутаг', price: 6000, note: 'Унаагаар илгээнэ · урьдчилж төлнө', prepaid: true }
    ]
  }
};

const SHEETS = {
  products: 'Products',
  categories: 'Categories',
  bundles: 'Bundles',
  reviews: 'Reviews',
  stock: 'Нөөц',
  orders: 'Orders',
  archive: 'Archive',
  guide: 'Заавар'
};

const STOCK_COLS = ['slug', 'Бараа', 'Агуулахад буй', 'Захиалагдсан', 'Боломжит'];
const STOCK_NOTES = {
  slug: 'Products хуудасны slug. Энэ мөр аль барааны нөөц болохыг заана.',
  'Бараа': 'Барааны нэр — автоматаар татагдана. Гараар засах шаардлагагүй.',
  'Агуулахад буй': 'ГАРААР БИЧНЭ. Танд агуулахад хэдэн ширхэг байгаа вэ.\nБараа ирэх бүрд энэ тоог нэмнэ.',
  'Захиалагдсан': 'Автомат тооцоолол. Orders болон Archive дээрх\nцуцлагдаагүй захиалгын тоо ширхгийн нийлбэр.\nГараар засаж болохгүй.',
  'Боломжит': 'Автомат: Агуулахад буй − Захиалагдсан.\n0 болмогц сайт дээр "Дууссан" болж, захиалга хаагдана.'
};

/* Products хуудасны багана — холбоотой талбарууд зэрэгцэж байхаар эрэмбэлсэн.
   setup() ажиллах бүрд хуудсыг энэ дараалалд оруулна. */
const PRODUCT_COLS = [
  'slug', 'category', 'name', 'desc',
  'price', 'discount',
  'sizes', 'sizePrices',
  'colors', 'colorImages', 'sizeImages',
  'image1', 'image2', 'image3', 'image4', 'image5',
  'stock', 'active', 'Хүргэлтийн хугацаа', 'Хүргэлтийн тайлбар'
];

/* Хугацааг бараа тус бүрээр эзэн өөрөө бичнэ: агуулахад байгаа бараа
   өдөртөө, гадаадаас захиалах бараа хэдэн долоо хоног.

   Хоёр хэсэг: "Хүргэлтийн хугацаа" нь товч, том цагаанаар онцолж
   харагдана; "Хүргэлтийн тайлбар" нь доор нь жижгээр, урт бичвэр багтана.
   Нүд хоосон бол доорх анхны утгууд харагдана. */
const DEFAULT_LEAD_TIME = 'Өглөөний 08:00–12:00';
const DEFAULT_LEAD_NOTE = 'Захиалга баталгаажсаны дараа хүргэнэ.';

const PRODUCT_NOTES = {
  slug: 'Барааны богино нэр. Латинаар, зайгүй, зурааснаас өөр тэмдэггүй.\nЖишээ: chako-thermos\nДавхардаж болохгүй.',
  category: 'Аль категорид харьяалагдах. Categories хуудасны slug-тай яг таарна.\nЖишээ: undaanii-sav',
  name: 'Сайт дээр харагдах нэр.\nЖишээ: Chako Lab термос аяга',
  desc: 'Богино тайлбар. 1-2 өгүүлбэр.',
  price: 'Үндсэн үнэ, зөвхөн тоо (₮ бичихгүй).\nЖишээ: 45900\nХэмжээ бүр өөр үнэтэй бол sizePrices-ыг ашиглана.',
  discount: 'Хямдралын ХУВЬ, зөвхөн тоо.\nЖишээ: 20  →  20% хямдарна.\nХоосон бол хямдрал огт харагдахгүй.',
  sizes: 'Хэмжээнүүд, таслалаар тусгаарлана.\nЖишээ: 350мл, 500мл\nХоосон бол хэмжээ сонгох хэсэг гарахгүй.',
  sizePrices: 'Хэмжээ бүрийн үнэ, sizes-тэй ЯГ ИЖИЛ дараалалтай.\nЖишээ: sizes = 350мл, 500мл\n        sizePrices = 45900, 62900\nХоосон бол бүх хэмжээнд price баганын үнэ хэрэглэгдэнэ.',
  colors: 'Өнгөнүүд, таслалаар тусгаарлана.\nЖишээ: Шар, Ягаан, Цэнхэр\nХоосон бол өнгө сонгох хэсэг гарахгүй.',
  colorImages: 'Өнгө бүрийн зураг, colors-тэй ЯГ ИЖИЛ дараалалтай.\nӨнгө дархад галерей тэр зураг руу үсэрнэ.\nХоосон бол зураг солигдохгүй.',
  sizeImages: 'Хэмжээ бүрийн зураг, sizes-тэй ижил дараалалтай.\nИхэвчлэн хэрэггүй, хоосон орхиж болно.',
  image1: 'Үндсэн зураг. Drive-ийн share линк тавьж болно.',
  image2: 'Нэмэлт зураг (заавал биш).',
  image3: 'Нэмэлт зураг (заавал биш).',
  image4: 'Нэмэлт зураг (заавал биш).',
  image5: 'Нэмэлт зураг (заавал биш).',
  stock: 'Үлдэгдэл тоо. 5 ба түүнээс бага бол сайт дээр "Үлдсэн Nш" гэж харагдана.',
  active: 'TRUE = сайт дээр харагдана.\nFALSE = түр нуугдана (устгах шаардлагагүй).',
  'Хүргэлтийн хугацаа': 'ТОМ ЦАГААН мөр. Богино байх тусмаа сайн — нүд түүн дээр л буудаг.\n\nЖишээ:\n  · Өдөртөө хүргэнэ\n  · 3–9 хоног\n  · Маргааш 08:00–12:00\n\nУрт тайлбараа энд БИЧИХГҮЙ — дараагийн баганад бич.\n\nХоосон бол "' + DEFAULT_LEAD_TIME + '" гэж харагдана.',
  'Хүргэлтийн тайлбар': 'Доор нь ЖИЖИГ БҮДЭГ үсгээр гарах тайлбар. Урт байж болно.\n\nЖишээ:\n  Захиалга баталгаажсанаас хойш Улаанбаатарт 3–9 хоногт ирнэ.\n  Одоогоор бараа хил дээр байгаа. Ирээд 24 цагийн дотор хүргэнэ.\n\nХоосон бол "' + DEFAULT_LEAD_NOTE + '" гэж харагдана.'
};

const CATEGORY_NOTES = {
  slug: 'Категорийн богино нэр. Латинаар, зайгүй.\nProducts хуудасны category баганад энэ нэрийг бичнэ.',
  name: 'Сайт дээр харагдах нэр. Хоёр үгтэй бол хоёр мөр болж харагдана.\nЖишээ: УНДААНЫ САВ',
  image: 'Категорийн зураг. Шинэ категори нэмвэл зургийг боловсруулах хэрэгтэй.',
  order: 'Харагдах дараалал. 1, 2, 3 ...',
  active: 'TRUE = харагдана, FALSE = нуугдана.'
};

const BUNDLE_COLS = ['product', 'qty', 'price', 'label', 'active'];
const BUNDLE_NOTES = {
  product: 'Аль барааны багц вэ. Products хуудасны slug-ийг бичнэ.\nЖишээ: chako-thermos',
  qty: 'Багцад хэдэн ширхэг орох.\nЖишээ: 3',
  price: 'Багцын НИЙТ үнэ, зөвхөн тоо.\nЖишээ: 99000  (3 ширхэгийн нийт үнэ)',
  label: 'Сайт дээр гарах тайлбар.\nЖишээ: 2 авбал 1 үнэгүй\nХоосон байж болно.',
  active: 'TRUE = харагдана, FALSE = нуугдана.'
};

const REVIEW_NOTES = {
  product: 'Аль барааны сэтгэгдэл вэ (slug).\nХООСОН орхивол БҮХ бараан дээр харагдана.',
  name: 'Сэтгэгдэл бичсэн хүний нэр.\nЖишээ: Б.Хулан',
  text: 'Сэтгэгдлийн текст.',
  rating: '1-5 хүртэлх од. Хоосон бол од харагдахгүй.',
  image: 'Screenshot-ын зураг (Drive линк). Хоосон байж болно.',
  active: 'TRUE = харагдана, FALSE = нуугдана.'
};

const ORDER_HEADERS = [
  'Огноо', 'Захиалгын код', 'Нэр', 'Утас', 'Хаяг',
  'Бараа', 'Өнгө', 'Хэмжээ', 'Тоо',
  'Нэгж үнэ', 'Хүргэлт', 'Нийт дүн', 'Төлбөрийн сонголт', 'Төлөв',
  'Нэмэлт утас', 'SKU'
];

// захиалга цуцлагдсаныг ийм төлвөөр таниулна — нөөцөд тооцогдохгүй
const CANCELLED = 'Цуцлагдсан';

/** 1 -> A, 27 -> AA ... томьёо бичихэд баганын үсэг хэрэгтэй */
function colLetter_(n) {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/* ====================================================================
   SETUP — дахин ажиллуулахад аюулгүй
   ==================================================================== */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Sheet олдсонгүй. Sheet дотроос Extensions → Apps Script гэж нээгээрэй.');
  }

  // Огноо Улаанбаатарын цагаар бичигдэхийн тулд. Үүнгүй бол Google-ийн
  // үндсэн бүс (Америк) хэрэглэгдэж, захиалгын цаг 15 цагаар хоцордог.
  ss.setSpreadsheetTimeZone(CONFIG.timeZone);

  const first = ss.getSheets()[0];
  if (!ss.getSheetByName(SHEETS.products)) first.setName(SHEETS.products);

  ensureSheet_(ss, SHEETS.categories, ['slug', 'name', 'image', 'order', 'active'], [
    ['undaanii-sav', 'УНДААНЫ САВ', 'assets/p/bottle-a.jpg', 1, true],
    ['ger-ahui', 'ГЭР АХУЙ', 'assets/product-clock.png', 2, true],
    ['duu-hugjim', 'ДУУ ХӨГЖИМ', 'assets/product-turntable.png', 3, true]
  ]);
  ensureSheet_(ss, SHEETS.bundles, BUNDLE_COLS, []);
  ensureSheet_(ss, SHEETS.reviews, ['product', 'name', 'text', 'rating', 'image', 'active'], []);
  ensureSheet_(ss, SHEETS.orders, ORDER_HEADERS, []);
  ensureSheet_(ss, SHEETS.archive, ORDER_HEADERS, []);

  orderProductColumns_(ss);
  [SHEETS.orders, SHEETS.archive].forEach(function (n) { syncHeaders_(ss, n, ORDER_HEADERS); });

  ensureSheet_(ss, SHEETS.stock, STOCK_COLS, []);
  syncStock_(ss);

  // Тайлбарууд — гарчиг дээр хулгана авчрахад тусламж гарч ирнэ
  annotate_(ss, SHEETS.products, PRODUCT_NOTES);
  annotate_(ss, SHEETS.categories, CATEGORY_NOTES);
  annotate_(ss, SHEETS.bundles, BUNDLE_NOTES);
  annotate_(ss, SHEETS.reviews, REVIEW_NOTES);
  annotate_(ss, SHEETS.stock, STOCK_NOTES);

  buildGuide_(ss);

  const has = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'archiveOld';
  });
  if (!has) ScriptApp.newTrigger('archiveOld').timeBased().everyHours(12).create();

  Logger.log('Бэлэн. Хуудсууд: ' + ss.getSheets().map(function (s) { return s.getName(); }).join(', '));
  Logger.log('Цагийн бүс: ' + ss.getSpreadsheetTimeZone());
}

function upgrade() { setup(); }

/**
 * Нөөц хуудсыг Products-той тааруулна: шинэ бараанд мөр нэмж, нэр болон
 * тооцооллын томьёог сэргээнэ. "Агуулахад буй" баганад гараар бичсэн тоог
 * хэзээ ч дарж бичихгүй.
 */
function syncStock_(ss) {
  const sheet = ss.getSheetByName(SHEETS.stock);
  const slugs = rowsOf(SHEETS.products)
    .filter(function (r) { return String(r.slug || '').trim(); })
    .map(function (r) { return String(r.slug).trim(); });

  const last = sheet.getLastRow();
  const existing = last > 1
    ? sheet.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]).trim(); })
    : [];

  slugs.forEach(function (slug) {
    if (existing.indexOf(slug) === -1) {
      // "Агуулахад буй" нь ХООСОН байж эхэлнэ — 0 гэдэг нь "дууссан" гэсэн
      // утгатай тул шинэ бараа автоматаар хаагдах ёсгүй. Эзэн нь бодит
      // тоогоо бичих хүртэл тухайн бараа хязгааргүй зарагдана.
      sheet.appendRow([slug, '', '', '', '']);
      existing.push(slug);
    }
  });

  const rows = sheet.getLastRow() - 1;
  if (rows < 1) return;

  // Баганын байрлалыг гарчгаас нь олж томьёог барина — цаашид багана
  // нэмэгдэхэд томьёо эвдрэхгүй.
  const qty = colLetter_(ORDER_HEADERS.indexOf('Тоо') + 1);
  const status = colLetter_(ORDER_HEADERS.indexOf('Төлөв') + 1);
  const sku = colLetter_(ORDER_HEADERS.indexOf('SKU') + 1);

  const name = [], ordered = [], avail = [];
  for (let i = 0; i < rows; i++) {
    const r = i + 2;
    name.push(['=IFERROR(VLOOKUP($A' + r + ',' + SHEETS.products + '!$A:$C,3,FALSE),"")']);
    // Archive-ийг хамт тоолно: 48 цагийн дараа зөөгдсөн захиалга ч нөөцийг
    // аль хэдийн зарцуулсан байдаг тул хасагдах ёсгүй.
    ordered.push([
      '=SUMIFS(' + SHEETS.orders + '!' + qty + ':' + qty +
        ',' + SHEETS.orders + '!' + sku + ':' + sku + ',$A' + r +
        ',' + SHEETS.orders + '!' + status + ':' + status + ',"<>' + CANCELLED + '")' +
      '+SUMIFS(' + SHEETS.archive + '!' + qty + ':' + qty +
        ',' + SHEETS.archive + '!' + sku + ':' + sku + ',$A' + r +
        ',' + SHEETS.archive + '!' + status + ':' + status + ',"<>' + CANCELLED + '")'
    ]);
    avail.push(['=MAX(0,N($C' + r + ')-N($D' + r + '))']);
  }
  sheet.getRange(2, 2, rows, 1).setFormulas(name);
  sheet.getRange(2, 4, rows, 1).setFormulas(ordered);
  sheet.getRange(2, 5, rows, 1).setFormulas(avail);
  sheet.getRange(2, 4, rows, 2).setBackground('#f1f3f4'); // тооцоолол — гар хүрэхгүй
}

/** Sheet дээрх цэснээс нэг товшилтоор нөөцөө шинэчлэх боломж. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Starshopping')
    .addItem('Нөөцийг шинэчлэх', 'refreshStock')
    .addToUi();
}

function refreshStock() {
  syncStock_(SpreadsheetApp.getActiveSpreadsheet());
}

function ensureSheet_(ss, name, headers, rows) {
  let s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.getRange(1, 1, 1, headers.length).setValues([headers]);
    if (rows.length) s.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  s.setFrozenRows(1);
  s.getRange(1, 1, 1, Math.max(headers.length, s.getLastColumn()))
    .setFontWeight('bold')
    .setBackground('#1c1c1c')
    .setFontColor('#ffffff');
  return s;
}

/** Гарчиг дээр тайлбар (hover note) тавина. */
function annotate_(ss, sheetName, notes) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastColumn() < 1) return;
  const width = sheet.getLastColumn();
  const head = sheet.getRange(1, 1, 1, width).getValues()[0];
  head.forEach(function (h, i) {
    const key = String(h).trim();
    if (notes[key]) sheet.getRange(1, i + 1).setNote(notes[key]);
  });
}

/**
 * Products хуудсыг PRODUCT_COLS дараалалд оруулна. Танихгүй багана байвал
 * төгсгөлд нь хэвээр үлдээнэ — гараар нэмсэн зүйл алдагдахгүй.
 */
function orderProductColumns_(ss) {
  const sheet = ss.getSheetByName(SHEETS.products);
  const lastCol = sheet.getLastColumn();
  const lastRow = Math.max(1, sheet.getLastRow());
  if (lastCol < 1) return;

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const head = values[0].map(function (h) { return String(h).trim(); });

  const extras = head.filter(function (h) {
    return h && PRODUCT_COLS.indexOf(h) === -1;
  });
  const target = PRODUCT_COLS.concat(extras);

  // Аль хэдийн зөв дараалалтай бол хөндөхгүй
  if (head.length === target.length && head.every(function (h, i) { return h === target[i]; })) return;

  const rebuilt = values.map(function (row, r) {
    return target.map(function (col) {
      if (r === 0) return col;
      const idx = head.indexOf(col);
      return idx === -1 ? '' : row[idx];
    });
  });

  sheet.clear();
  sheet.getRange(1, 1, rebuilt.length, target.length).setValues(rebuilt);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, target.length)
    .setFontWeight('bold').setBackground('#1c1c1c').setFontColor('#ffffff');
}

function syncHeaders_(ss, name, headers) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return;
  const width = Math.max(1, sheet.getLastColumn());
  const head = sheet.getRange(1, 1, 1, width).getValues()[0].map(function (h) {
    return String(h).trim();
  });
  headers.forEach(function (h) {
    if (head.indexOf(h) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h).setFontWeight('bold');
    }
  });
}

/** Заавар хуудас — багана бүрийг юу гэж бөглөхийг бичсэн лавлах. */
function buildGuide_(ss) {
  let s = ss.getSheetByName(SHEETS.guide);
  if (!s) s = ss.insertSheet(SHEETS.guide);
  s.clear();

  const rows = [['ХУУДАС', 'БАГАНА', 'ЮУ БИЧИХ', 'ЖИШЭЭ']];
  const push = function (sheetName, notes, cols) {
    cols.forEach(function (c) {
      if (!notes[c]) return;
      const lines = notes[c].split('\n');
      rows.push([sheetName, c, lines[0], lines.slice(1).join(' ')]);
    });
  };
  push('Products', PRODUCT_NOTES, PRODUCT_COLS);
  push('Categories', CATEGORY_NOTES, ['slug', 'name', 'image', 'order', 'active']);
  push('Bundles', BUNDLE_NOTES, BUNDLE_COLS);
  push('Reviews', REVIEW_NOTES, ['product', 'name', 'text', 'rating', 'image', 'active']);

  s.getRange(1, 1, rows.length, 4).setValues(rows);
  s.setFrozenRows(1);
  s.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#1c1c1c').setFontColor('#ffffff');
  s.setColumnWidth(1, 110);
  s.setColumnWidth(2, 120);
  s.setColumnWidth(3, 420);
  s.setColumnWidth(4, 300);
  s.getRange(2, 1, rows.length - 1, 4).setVerticalAlignment('top').setWrap(true);
}

/* ====================================================================
   READ
   ==================================================================== */
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      shop: CONFIG.shop,
      categories: readCategories(),
      products: readProducts(),
      bundles: readBundles(),
      reviews: readReviews(),
      stock: readStock()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function rowsOf(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const head = values[0].map(function (h) { return String(h).trim(); });
  return values.slice(1).map(function (row) {
    const obj = {};
    head.forEach(function (h, i) { if (h) obj[h] = row[i]; });
    return obj;
  });
}

function truthy(v) {
  const s = String(v).trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1' || s === 'тийм' || s === '';
}

function splitList(v) {
  return String(v || '')
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s !== ''; });
}

function readCategories() {
  return rowsOf(SHEETS.categories)
    .filter(function (r) { return r.slug && truthy(r.active); })
    .map(function (r) {
      return {
        slug: String(r.slug).trim(),
        name: String(r.name || '').trim(),
        image: String(r.image || '').trim(),
        order: Number(r.order) || 0,
        active: true
      };
    })
    .sort(function (a, b) { return a.order - b.order; });
}

function readProducts() {
  return rowsOf(SHEETS.products)
    .filter(function (r) { return r.slug && truthy(r.active); })
    .map(function (r) {
      const images = [];
      for (let i = 1; i <= 5; i++) {
        const v = String(r['image' + i] || '').trim();
        if (v) images.push(v);
      }
      const d = String(r.discount === undefined ? '' : r.discount).trim();
      return {
        slug: String(r.slug).trim(),
        category: String(r.category || '').trim(),
        name: String(r.name || '').trim(),
        desc: String(r.desc || '').trim(),
        price: Number(r.price) || 0,
        discount: d === '' ? null : Number(d),
        images: images,
        sizes: splitList(r.sizes),
        sizePrices: splitList(r.sizePrices).map(Number),
        colors: splitList(r.colors),
        colorImages: splitList(r.colorImages),
        sizeImages: splitList(r.sizeImages),
        stock: Number(r.stock) || 0,
        leadTime: String(r['Хүргэлтийн хугацаа'] || '').trim(),
        leadNote: String(r['Хүргэлтийн тайлбар'] || '').trim(),
        active: true
      };
    });
}

function readBundles() {
  return rowsOf(SHEETS.bundles)
    .filter(function (r) { return r.product && Number(r.qty) > 1 && truthy(r.active); })
    .map(function (r) {
      return {
        product: String(r.product).trim(),
        qty: Number(r.qty),
        price: Number(r.price) || 0,
        label: String(r.label || '').trim()
      };
    });
}

/**
 * slug -> боломжит тоо. Нөөц хуудсанд мөргүй бараа нь энд орохгүй бөгөөд
 * сайт талдаа "хязгааргүй" гэж үзнэ — нөөц тохируулаагүйн улмаас борлуулалт
 * зогсох нь тохируулсны улмаас хэт зарахаас дор.
 */
function readStock() {
  const out = {};
  const needsCalc = [];

  rowsOf(SHEETS.stock).forEach(function (r) {
    const slug = String(r.slug || '').trim();
    if (!slug) return;
    const have = String(r['Агуулахад буй']).trim();
    if (have === '') return;               // тоо бичээгүй бол хязгаарлахгүй

    const shown = String(r['Боломжит']).trim();
    if (shown !== '' && !isNaN(Number(shown))) {
      out[slug] = Math.max(0, Number(shown));
    } else {
      // Мөрийг гараар нэмэхэд томьёо байхгүй байж болно. Хоосныг 0 гэж
      // уншвал бараа шалтгаангүйгээр хаагдана — тиймээс кодоор боддог.
      needsCalc.push({ slug: slug, have: Number(have) || 0 });
    }
  });

  if (needsCalc.length) {
    const taken = orderedBySku_();
    needsCalc.forEach(function (x) {
      out[x.slug] = Math.max(0, x.have - (taken[x.slug] || 0));
    });
  }
  return out;
}

/** slug -> цуцлагдаагүй захиалгын нийт тоо ширхэг (Orders + Archive, нэг уншилтаар). */
function orderedBySku_() {
  const qtyIdx = ORDER_HEADERS.indexOf('Тоо');
  const statusIdx = ORDER_HEADERS.indexOf('Төлөв');
  const skuIdx = ORDER_HEADERS.indexOf('SKU');
  const out = {};

  [SHEETS.orders, SHEETS.archive].forEach(function (name) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    if (!sheet || sheet.getLastRow() < 2) return;
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, ORDER_HEADERS.length).getValues();
    values.forEach(function (row) {
      const sku = String(row[skuIdx]).trim();
      if (!sku) return;
      if (String(row[statusIdx]).trim() === CANCELLED) return;
      out[sku] = (out[sku] || 0) + (Number(row[qtyIdx]) || 0);
    });
  });
  return out;
}

/**
 * Боломжит тоог Sheet-ийн томьёонд биш, кодоор дахин боддог. Томьёо нь
 * appendRow-ийн дараа шууд дахин тооцоологдох баталгаагүй тул хоёр захиалга
 * зэрэг ирэхэд хэт зарах эрсдэлтэй. Энэ нь doPost-ийн lock дотор ажиллана.
 */
function availableFor_(slug) {
  const stockRow = rowsOf(SHEETS.stock).filter(function (r) {
    return String(r.slug || '').trim() === slug;
  })[0];
  if (!stockRow) return null;                       // хязгаар тавиагүй
  const have = String(stockRow['Агуулахад буй']).trim();
  if (have === '') return null;

  return Math.max(0, (Number(have) || 0) - (orderedBySku_()[slug] || 0));
}

function readReviews() {
  return rowsOf(SHEETS.reviews)
    .filter(function (r) { return (r.text || r.image) && truthy(r.active); })
    .map(function (r) {
      return {
        product: String(r.product || '').trim(),
        name: String(r.name || '').trim(),
        text: String(r.text || '').trim(),
        rating: Number(r.rating) || 0,
        image: String(r.image || '').trim()
      };
    });
}

/* ====================================================================
   WRITE
   ==================================================================== */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000); // дугаар давхцахаас сэргийлнэ
  try {
    const body = JSON.parse(e.postData.contents);

    /* Үнийг браузераас ирсэн тоогоор биш, Sheet дээрх бодит өгөгдлөөр
       дахин бодно. Үгүй бол хэн ч 1₮-ийн захиалга илгээх боломжтой. */
    const priced = computeOrder_(body);
    if (!priced.ok) return json({ ok: false, error: priced.error });

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.orders);
    const code = nextOrderCode(sheet);
    const qty = priced.qty;
    const unit = priced.unit;
    const ship = priced.ship;
    const total = priced.total;

    sheet.appendRow([
      new Date(),
      code,
      String(body.name || ''),
      String(body.phone || ''),
      String(body.address || ''),
      String(body.product || ''),
      String(body.color || ''),
      String(body.size || ''),
      qty,
      unit,
      ship,
      total,
      priced.payment,
      'Шинэ',
      String(body.phone2 || ''),
      String(body.slug || '')      // нөөцийн SUMIF энэ баганаар тоолно
    ]);

    const count = sheet.getLastRow() - 1;
    if (count > 0 && count % CONFIG.notifyEvery === 0) notifyBatch(sheet, count);

    return json({ ok: true, code: code });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Захиалгыг Sheet дээрх бодит үнээр бодож, шалгана.
 * Браузерын явуулсан үнэ, нийт дүнг огт хүлээж авахгүй.
 */
function computeOrder_(body) {
  const slug = String(body.slug || '').trim();
  const product = readProducts().filter(function (p) { return p.slug === slug; })[0];
  if (!product) return { ok: false, error: 'Бараа олдсонгүй.' };

  if (!/^\d{8}$/.test(String(body.phone || '').trim())) {
    return { ok: false, error: 'Утасны дугаар буруу.' };
  }

  let qty = Math.floor(Number(body.qty) || 1);
  if (!(qty >= 1 && qty <= 50)) return { ok: false, error: 'Тоо ширхэг буруу.' };

  // хэмжээний үнэ
  const size = String(body.size || '').trim();
  let list = product.price;
  if (size) {
    const i = product.sizes.indexOf(size);
    if (i === -1) return { ok: false, error: 'Хэмжээ буруу.' };
    if (product.sizePrices[i] > 0) list = product.sizePrices[i];
  }

  const d = Number(product.discount);
  const unit = d > 0 ? Math.round((list * (1 - d / 100)) / 100) * 100 : list;

  // багц сонгосон бол багцын нийт үнэ давамгайлна
  let goods = unit * qty;
  const bundle = readBundles().filter(function (b) {
    return b.product === slug && b.qty === qty;
  })[0];
  if (bundle) goods = bundle.price;

  // хүргэлт — нэрээр нь тохиргооноос олно
  const opt = CONFIG.shop.delivery.filter(function (o) {
    return o.name === String(body.deliveryName || '').trim();
  })[0];
  if (!opt) return { ok: false, error: 'Хүргэлтийн сонголт буруу.' };

  const payment = String(body.payment || '').trim();
  if (opt.prepaid && payment !== 'Шилжүүлгээр төлөх') {
    return { ok: false, error: 'Энэ хүргэлтэд урьдчилсан төлбөр шаардлагатай.' };
  }

  /* Нөөцийн эцсийн хаалт. Хөтөч дээр товч идэвхгүй болсон ч энд дахин
     шалгана — хэт зарах нь кодын хувьд боломжгүй байх ёстой.
     Агуулахад байхгүй, гадаадаас захиалах бараанд `Нөөц` хуудасны
     `Агуулахад буй` нүдийг ХООСОН орхи: тэгвэл availableFor_ нь null
     буцааж, хязгаар тавихгүй. 0 бичвэл бараа хаагдана. */
  const left = availableFor_(slug);
  if (left !== null) {
    if (left <= 0) return { ok: false, error: 'Энэ бараа дууссан байна.' };
    if (qty > left) return { ok: false, error: 'Үлдэгдэл хүрэлцэхгүй байна. Боломжит: ' + left };
  }

  return {
    ok: true,
    qty: qty,
    unit: bundle ? Math.round(bundle.price / qty) : unit,
    ship: opt.price,
    total: goods + opt.price,
    payment: payment
  };
}

function nextOrderCode(sheet) {
  const last = sheet.getLastRow();
  let n = 0;
  if (last > 1) {
    const prev = String(sheet.getRange(last, 2).getValue());
    const m = prev.match(/(\d+)\s*$/);
    if (m) n = parseInt(m[1], 10);
  }
  return CONFIG.orderPrefix + String(n + 1).padStart(4, '0');
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ====================================================================
   NOTIFY
   ==================================================================== */
function notifyBatch(sheet, count) {
  const n = CONFIG.notifyEvery;
  const rows = sheet.getRange(sheet.getLastRow() - n + 1, 1, n, ORDER_HEADERS.length).getValues();

  let html = '<h3>Сүүлийн ' + n + ' захиалга (нийт ' + count + ')</h3>'
    + '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:13px">'
    + '<tr style="background:#f0f0f0">'
    + ['Код', 'Нэр', 'Утас', 'Бараа', 'Тоо', 'Нийт'].map(function (h) { return '<th>' + h + '</th>'; }).join('')
    + '</tr>';

  rows.forEach(function (r) {
    html += '<tr><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + r[3] + '</td>'
      + '<td>' + r[5] + '</td><td>' + r[8] + '</td><td>' + r[11] + '₮</td></tr>';
  });
  html += '</table>';

  MailApp.sendEmail({
    to: CONFIG.notifyEmail,
    subject: 'Starshopping — ' + count + ' дэх захиалга',
    htmlBody: html
  });
}

/* ====================================================================
   ARCHIVE — 48 цагаас хуучирсан мөрийг зөөнө (устгахгүй)
   ==================================================================== */
function archiveOld() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const orders = ss.getSheetByName(SHEETS.orders);
  const archive = ss.getSheetByName(SHEETS.archive);
  if (!orders || !archive) return;

  const last = orders.getLastRow();
  if (last < 2) return;

  const values = orders.getRange(2, 1, last - 1, ORDER_HEADERS.length).getValues();
  const cutoff = Date.now() - CONFIG.archiveAfterHours * 3600 * 1000;
  const move = [];
  const keep = [];

  values.forEach(function (row) {
    const t = row[0] instanceof Date ? row[0].getTime() : 0;
    (t && t < cutoff ? move : keep).push(row);
  });

  if (!move.length) return;

  archive.getRange(archive.getLastRow() + 1, 1, move.length, ORDER_HEADERS.length).setValues(move);
  orders.getRange(2, 1, values.length, ORDER_HEADERS.length).clearContent();
  if (keep.length) orders.getRange(2, 1, keep.length, ORDER_HEADERS.length).setValues(keep);
}
