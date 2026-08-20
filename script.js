gsap.registerPlugin(ScrollTrigger);

/* ScrollTrigger is deliberately left to refresh when a phone's viewport height
   changes. `ignoreMobileResize: true` was tried here and caused the opposite of
   what it promised: the hero is sized in svh — the height with the toolbar
   showing — and measured at load, so when the toolbar slides away and the
   viewport grows, the pin has to be measured again or the section no longer
   reaches the bottom of the screen. Suppressing that left a band of bare
   background under the camera part-way through the zoom, on a real phone, where
   no amount of desktop emulation reproduced it. */

/* A reload normally restores the previous scroll position. The hero is a
   pinned, scrubbed section, so being measured from a half-scrolled start
   leaves it stuck mid-zoom — the camera blown up and the type gone. Opting
   out of scroll restoration makes every load begin from a known state. */
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

/* ========================================================================
   DATA
   Live catalogue comes from the Apps Script web app bound to the shop's
   sheet, so products, prices, discounts and photos are edited there rather
   than in code. The bundled JSON stays as a fallback: if Google is slow,
   over quota, or the deployment is mid-update, the shop still renders
   instead of showing an empty page.
   ===================================================================== */
const DATA_SOURCE =
  "https://script.google.com/macros/s/AKfycbzZK-I4L3Cow5KAlLbW0pud0766XduXHzuTys9FIEwXWDTQL36VPywm7bNsk3E6NMqORQ/exec";
const DATA_FALLBACK = "data/catalog.json";

let DB = { shop: {}, categories: [], products: [], bundles: [], reviews: [], stock: {} };

/* Units left for a SKU, or null when no limit is configured. A product with
   no stock row stays orderable on purpose: losing sales because inventory was
   never filled in is worse than the sheet simply not knowing. The backend
   re-checks every order anyway, so nothing here can oversell. */
function availableOf(slug) {
  const v = DB.stock ? DB.stock[slug] : undefined;
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : null;
}
/* How soon this one arrives, in the owner's own words: same day for something
   sitting in the warehouse, weeks for something still being brought in. A
   product being trialled before it is stocked simply says so here and leaves
   its stock row empty, which is what keeps it orderable. */
const DEFAULT_LEAD_TIME = "Өглөөний 08:00–12:00";
const DEFAULT_LEAD_NOTE = "Захиалга баталгаажсаны дараа хүргэнэ.";
/* Two parts because a wait needs both: the figure someone scans for, and the
   sentence explaining it. Kept apart so a long explanation cannot swallow the
   line the eye actually lands on. */
const leadTimeOf = (p) => String((p && p.leadTime) || "").trim() || DEFAULT_LEAD_TIME;
const leadNoteOf = (p) => String((p && p.leadNote) || "").trim() || DEFAULT_LEAD_NOTE;

/* Delivery prices were written out in the markup of the product badge and
   again in the delivery policy, so a change in the sheet left two pages
   quoting the old figure — and the badge never mentioned the express option
   at all. Both now read the sheet, and only the sheet. */
const deliveryOptions = () => (DB.shop.delivery || []).filter((d) => d && d.name);
const deliverySummary = () => {
  const prices = deliveryOptions().map((d) => Number(d.price) || 0);
  if (!prices.length) return "Захиалга өгөхөд харагдана";
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  return lo === hi ? money(lo) : `${money(lo)}–${money(hi)}`;
};

/* Every page of the shop reported itself as plain "Starshopping". Six tabs
   open and none of them says which product; a link pasted into a chat that
   the crawler cards do not cover carries the same blank name; the back button
   offers an undifferentiated list. The card pages under /p/ hold the markup a
   crawler reads — this is what a person sees. */
const SITE_NAME = "Starshopping";
const SITE_ORIGIN = "https://starshopping-mn.github.io";
/* Only a latin slug gets a card page built for it (see tools/build-og.py), so
   only those have a real address to point at; the rest name the shop. */
const CARD_SLUG = /^[A-Za-z0-9-]+$/;

function setHead(title, path) {
  document.title = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — гэр ахуйн бараа`;
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = SITE_ORIGIN + (path || "/");
}

const isSoldOut = (slug) => availableOf(slug) === 0;

/* Sold out is stated plainly; a low count is only worth showing when it is
   genuinely low, otherwise it reads as a sales tactic rather than a fact. */
function stockBadge(slug) {
  const left = availableOf(slug);
  if (left === null) return "";
  if (left === 0) return `<span class="tag tag--out">Дууссан</span>`;
  if (left <= 5) return `<span class="tag tag--soft">Үлдсэн ${left}ш</span>`;
  return "";
}

/* Assets shipped with the site that also exist as WebP. The sheet stores the
   .png path, so swapping here keeps those cells untouched while cutting the
   download by ~90%. Only files that genuinely have a .webp are listed — a
   blind rewrite would break any image that does not. */
const WEBP_ASSETS = {
  "assets/product-clock.png": "assets/product-clock.webp",
  "assets/product-turntable.png": "assets/product-turntable.webp",
  "assets/cat-huuhdiin-heregsel.png": "assets/cat-huuhdiin-heregsel.webp",
};

/* Sheets get pasted full of Google Drive share links rather than direct
   image URLs, so normalise those into something an <img> can actually load. */
/* `size` is the width asked of Drive. A shelf thumbnail is drawn about 150
   points wide and was being handed the same half-megabyte file as the full
   product photo — measured at 505KB against 207KB for the small one. */
function imageUrl(raw, size = 1200) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (WEBP_ASSETS[s]) return WEBP_ASSETS[s];
  const drive = s.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/);
  if (drive) return `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w${size}`;
  return s;
}

/* Every product photo used to be fetched from Drive as a PNG: 505KB for one
   picture, and a product page draws several. `tools/build-og.py` now re-encodes
   each of them to WebP on our own domain — measured at 30-45KB, a tenth of the
   weight, from the host already serving the page rather than a third party the
   shop does not control.

   The mirror is rebuilt every twenty minutes, so a photo added to the sheet
   minutes ago may not have one yet. Rather than making the shop wait to find
   out, the picture is asked for by its mirrored name and carries the Drive
   address as `data-fallback`; if the mirror is not there yet the listener below
   quietly puts the original in its place. Nobody sees a broken image and no
   product has to wait for the builder to catch up. */
const PHOTO_MIRROR = "img/";
const DRIVE_FILE = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/;

function photoSrc(raw, size = 1200) {
  const s = String(raw || "").trim();
  const drive = s.match(DRIVE_FILE);
  if (!drive) return { src: imageUrl(raw, size), fallback: "" };
  const width = size <= 400 ? 400 : 1200;
  return {
    src: `${PHOTO_MIRROR}${drive[1]}-${width}.webp`,
    fallback: `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w${width}`,
  };
}

/* One listener for the whole document, and in the capture phase because an
   image's `error` does not bubble. Registered once so no redraw can stack it. */
document.addEventListener(
  "error",
  (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    const spare = img.dataset.fallback;
    if (!spare) return;
    delete img.dataset.fallback; // one attempt only, never a loop
    img.src = spare;
  },
  true
);

/* A cell can arrive as a real array (json) or as "Улаан, Хөх" (sheet). */
function listOf(v) {
  if (Array.isArray(v)) return v.filter((x) => String(x).trim() !== "");
  return String(v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const money = (n) => Number(n).toLocaleString("en-US") + "₮";
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* Discount column holds a percentage. Empty means the product simply has no
   sale — nothing renders, rather than a 0% badge.
   `base` lets a size override the product price: a 500ml bottle is not the
   same product as a 350ml one, so sizePrices in the sheet can set a price per
   size and the discount still applies on top of whichever one is picked. */
function priceOf(p, base) {
  const list = Number(base !== undefined && base !== null && base !== "" ? base : p.price);
  const d = Number(p.discount);
  const on = p.discount !== null && p.discount !== "" && !Number.isNaN(d) && d > 0;
  return {
    on,
    pct: d,
    was: list,
    now: on ? Math.round((list * (1 - d / 100)) / 100) * 100 : list,
  };
}

/* Cheapest variant, so a list row shows "from" pricing that matches reality. */
function lowestPrice(p) {
  const sp = listOf(p.sizePrices).map(Number).filter((n) => n > 0);
  return sp.length ? Math.min(...sp) : Number(p.price);
}

const productsIn = (slug) => DB.products.filter((p) => p.active !== false && p.category === slug);

/* Addresses that have already gone out under a reel or through the reply
   automation cannot be recalled, so a slug tidied up in the sheet strands every
   customer holding the old one. `Huwtsas hadgalah shiid` became
   `Huwtsas-hadgalah-sags` and every link sent before that stopped resolving.

   Two rescues, in order of confidence. Loosening the comparison catches the
   ordinary kind of tidying — case, spaces for hyphens, a stray underscore —
   which is most renames. The list below catches the rest: a word that actually
   changed, where nothing can infer the connection. Add a line when a slug is
   renamed after its address has been shared. */
const ALIASES = {
  "huwtsas-hadgalah-shiid": "Huwtsas-hadgalah-sags",
};

const loosen = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const categoryBy = (slug) => {
  const exact = DB.categories.find((c) => c.slug === slug);
  if (exact) return exact;
  const want = loosen(slug);
  return DB.categories.find((c) => loosen(c.slug) === want);
};

const productBy = (slug) => {
  const exact = DB.products.find((p) => p.slug === slug);
  if (exact) return exact;
  const want = loosen(slug);
  const loose = DB.products.find((p) => loosen(p.slug) === want);
  if (loose) return loose;
  const alias = ALIASES[want];
  return alias ? DB.products.find((p) => p.slug === alias) : undefined;
};
const reviewsFor = (slug) => DB.reviews.filter((r) => !r.product || r.product === slug);
const bundlesFor = (slug) =>
  DB.bundles.filter((b) => b.product === slug && b.qty > 1 && b.price > 0).sort((a, b) => a.qty - b.qty);

/* ========================================================================
   IMAGE FRAMES
   ===================================================================== */
let frameTimers = [];

/* Every photo of a product used to come down at once: five half-megabyte
   files from Drive, in parallel, ahead of everything else the page still
   needed. `loading="lazy"` did nothing about it — the slides sit side by side
   inside the frame, near enough to the viewport that the browser fetches the
   lot. Measured on a wired line that was 2.5MB and several seconds; on a
   phone it is the whole wait. So only the picture on screen and the one after
   it carry a `src`, and the rest wait in `data-src` until they are reached. */
function hydrateFrame(track, idx) {
  const imgs = track.querySelectorAll("img");
  [idx, idx + 1, idx - 1].forEach((n) => {
    const img = imgs[n];
    if (img && img.dataset.src) {
      img.src = img.dataset.src;
      delete img.dataset.src;
    }
  });
}

function buildFrame(images, className = "frame", size = 1200, alt = "") {
  const urls = images.map((u) => photoSrc(u, size)).filter((u) => u.src);
  const el = document.createElement("div");
  el.className = className;
  const track = document.createElement("div");
  track.className = "frame__track";
  (urls.length ? urls : [{ src: "", fallback: "" }]).forEach((u, i) => {
    const img = document.createElement("img");
    if (u.fallback) img.dataset.fallback = u.fallback;
    if (i === 0) {
      img.src = u.src;
      img.setAttribute("fetchpriority", "high");
    } else {
      img.dataset.src = u.src;
    }
    /* A product photo is the content, not decoration: with an empty alt a
       reader hears nothing where the goods should be, and the picture carries
       no name into image search. The logos stay empty on purpose — the shop's
       name is written beside them. */
    img.alt = alt ? (i === 0 ? alt : `${alt} — зураг ${i + 1}`) : "";
    img.loading = i === 0 ? "eager" : "lazy";
    img.decoding = "async";
    track.appendChild(img);
  });
  el.appendChild(track);
  el.dataset.count = String(urls.length || 1);
  el.dataset.index = "0";
  return el;
}

/* One way to move a frame, whether the clock moved it, an arrow did, or a
   colour was picked — so the position, the dots and the loading all stay in
   step no matter who asked. */
function showFrame(frame, idx) {
  const track = frame.querySelector(".frame__track");
  if (!track) return;
  const count = Number(frame.dataset.count || 1);
  const n = ((idx % count) + count) % count;
  hydrateFrame(track, n);
  track.style.transform = `translateX(-${n * 100}%)`;
  frame.dataset.index = String(n);
  frame.dispatchEvent(new CustomEvent("frame:index", { detail: n }));
}

function startFrames(root) {
  stopFrames();
  root.querySelectorAll(".frame, .pdp__gallery").forEach((frame, i) => {
    if (frame.dataset.manual === "1") return; // handed over to the visitor
    if (Number(frame.dataset.count || 1) < 2) return;
    frameTimers.push(
      setInterval(() => {
        showFrame(frame, Number(frame.dataset.index || 0) + 1);
      }, 2600 + (i % 4) * 320)
    );
  });
}

function stopFrames() {
  frameTimers.forEach(clearInterval);
  frameTimers = [];
}

/* ========================================================================
   HOME · category browser
   ===================================================================== */
const catsStage = document.getElementById("catsStage");
const catRail = document.getElementById("catRail");
const catIndexEl = document.getElementById("catIndex");
const catTotalEl = document.getElementById("catTotal");
let current = 0;
let cycle = null;

function renderCategories() {
  const cats = DB.categories.filter((c) => c.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  catsStage.innerHTML = "";
  catTotalEl.textContent = String(cats.length).padStart(2, "0");

  cats.forEach((c, i) => {
    // "УНДААНЫ САВ" stacks as two lines; the longest one sets the type size
    const words = String(c.name).trim().split(/\s+/);
    const lines = words.length > 1 ? [words[0], words.slice(1).join(" ")] : [words[0]];
    const chars = Math.max(...lines.map((l) => l.length));
    const count = productsIn(c.slug).length;

    const art = document.createElement("article");
    art.className = "cat" + (i === 0 ? " is-active" : "");
    art.innerHTML = `
      <div class="cat__side">
        <h2 class="cat__name" style="--chars:${chars}">
          ${lines.map((l) => `<span>${esc(l)}</span>`).join("")}
        </h2>
        <a class="cat__cta" href="#/c/${esc(encodeURIComponent(c.slug))}">
          <span class="cat__count">${count} бараа</span>
          <span class="cat__go">Үзэх →</span>
        </a>
      </div>
      <div class="cat__img"><img src="${photoSrc(c.image).src}" data-fallback="${esc(photoSrc(c.image).fallback)}" alt="${esc(c.name)}"></div>`;
    catsStage.appendChild(art);
  });

  catRail.innerHTML = "";
  cats.forEach((c, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "catrail__item";
    b.textContent = c.name;
    b.addEventListener("click", () => {
      showCat(i);
      startCycle();
    });
    catRail.appendChild(b);
  });
  // a single name is not something you can scroll between
  catRail.classList.toggle("is-solo", cats.length < 2);
  fitRail();
  paintRail();
}

/* Category names are written by hand in the sheet and some are long —
   "ХҮҮХДИЙН ХЭРЭГСЭЛ" runs wider than the column it stands in, and the
   overflow that keeps the list tidy would slice its first letters clean off.
   Rather than cap the name or widen the column into the giant type's space,
   each name is measured and set smaller only if it needs to be.

   Down the side of a wide screen the limit is the column. Across the foot of a
   phone it is the spacing between names, or neighbours would run together. */
function fitRail() {
  const items = [...catRail.children];
  if (!items.length) return;
  const wide = window.matchMedia("(min-width: 860px)").matches;
  /* Down the side of a wide screen the column is the limit. Across the foot of
     a phone the strip is the full width, and the names either side of the
     chosen one are faded almost to nothing and dissolving into the mask — so
     sizing the whole list down to keep them apart would shrink the one name
     anybody reads. The strip is what constrains it there. */
  const room = catRail.clientWidth - (wide ? 26 : 16);
  /* The column has no width yet on the first pass through — the list is built
     before the section has been laid out. Come back once it has. */
  if (room <= 0) {
    requestAnimationFrame(fitRail);
    return;
  }
  items.forEach((el) => el.style.setProperty("--fit", 1));
  const widest = Math.max(...items.map((el) => el.offsetWidth));
  /* One factor for the whole list, taken from the longest name. Sizing each
     name to its own length would leave them all slightly different, which
     reads as a mistake rather than as a set. */
  const fit = widest > room ? Math.max(0.8, room / widest) : 1;
  items.forEach((el) => el.style.setProperty("--fit", fit));
}

/* the column's width follows the viewport, so a name that fitted at one size
   may not at another */
addEventListener("resize", () => {
  clearTimeout(fitRail._t);
  fitRail._t = setTimeout(fitRail, 150);
});

/* Every name keeps its slot in the ring; the chosen one sits at full size in
   the middle and the rest fall away from it in both directions. Offsets wrap
   through the halfway point so the list turns endlessly instead of hitting an
   end and snapping back across the whole column. */
function paintRail() {
  const items = catRail.children;
  const n = items.length;
  for (let i = 0; i < n; i++) {
    let off = i - current;
    if (off > n / 2) off -= n;
    if (off < -n / 2) off += n;
    const away = Math.abs(off);
    const el = items[i];
    el.style.setProperty("--off", off);
    // only ever scaled down — text scaled above 1 rasterises soft
    el.style.setProperty("--s", off === 0 ? 1 : Math.max(0.55, 1 - away * 0.24));
    el.style.setProperty("--o", off === 0 ? 1 : Math.max(0, 0.44 - away * 0.13));
    el.classList.toggle("is-on", off === 0);
    el.setAttribute("aria-current", off === 0 ? "true" : "false");
  }
}

function showCat(i) {
  const cards = catsStage.querySelectorAll(".cat");
  if (!cards.length) return;
  current = (i + cards.length) % cards.length;
  cards.forEach((c, n) => c.classList.toggle("is-active", n === current));
  catIndexEl.textContent = String(current + 1).padStart(2, "0");
  paintRail();
}

/* Sideways gestures only — over the artwork as well as the list, since the
   picture is what the visitor is looking at when they reach to change it.
   Nothing here ever swallows a vertical scroll: whatever the visitor does, the
   page keeps moving down the moment they push down, so this section cannot
   trap anyone. */
const catsMain = document.querySelector(".cats__main");
const turnable = () => catRail.children.length > 1;

let turnAt = 0;
const turn = (dir) => {
  const now = Date.now();
  if (now - turnAt < 260) return;
  turnAt = now;
  showCat(current + dir);
  startCycle();
};

/* A trackpad or a tilt wheel reports sideways travel as deltaX. Claiming it
   also stops the browser treating the same gesture as "go back". */
catsMain.addEventListener(
  "wheel",
  (e) => {
    if (!turnable()) return;
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    turn(e.deltaX > 0 ? 1 : -1);
  },
  { passive: false }
);

/* Passive touch: a sideways swipe turns, a downward one is left alone. */
let touchX = 0;
let touchY = 0;
let swiping = false;

catsMain.addEventListener(
  "touchstart",
  (e) => {
    if (!turnable()) return;
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
    swiping = true;
  },
  { passive: true }
);
catsMain.addEventListener(
  "touchmove",
  (e) => {
    if (!swiping) return;
    const dx = e.touches[0].clientX - touchX;
    const dy = e.touches[0].clientY - touchY;
    if (Math.abs(dx) < 34 || Math.abs(dx) < Math.abs(dy)) return;
    swiping = false;
    turn(dx < 0 ? 1 : -1);
  },
  { passive: true }
);
catsMain.addEventListener("touchend", () => (swiping = false), { passive: true });

/* An ordinary mouse has no sideways wheel, so dragging stands in for it. */
let dragX = 0;
let dragY = 0;
let dragging = false;

catsMain.addEventListener("pointerdown", (e) => {
  if (!turnable() || e.pointerType !== "mouse" || e.button !== 0) return;
  dragX = e.clientX;
  dragY = e.clientY;
  dragging = true;
});
catsMain.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - dragX;
  const dy = e.clientY - dragY;
  if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy)) return;
  dragging = false;
  turn(dx < 0 ? 1 : -1);
});
["pointerup", "pointercancel", "pointerleave"].forEach((ev) =>
  catsMain.addEventListener(ev, () => (dragging = false))
);

const startCycle = () => {
  stopCycle();
  cycle = setInterval(() => showCat(current + 1), 5000);
};
const stopCycle = () => {
  if (cycle) clearInterval(cycle);
  cycle = null;
};

document.querySelectorAll(".arrow").forEach((arrow) =>
  arrow.addEventListener("click", () => {
    showCat(current + Number(arrow.dataset.dir));
    startCycle();
  })
);

/* ========================================================================
   HOME · motion
   ===================================================================== */
const heroEl = document.getElementById("hero");
const camImg = document.querySelector(".hero__cam img");
let homeTriggers = [];
let heroTl = null;

/* Reached only with ?diag on the address, and never by a customer. A band of
   bare background appears under the camera part-way through the zoom on a real
   phone and on no desktop, and two fixes reasoned from a desk have already
   missed. This reports the real geometry from the real device as it scrolls:
   how tall the pinned hero actually is, where the photograph's bottom edge sits,
   and how much of the screen is left bare beneath it. */
if (/(^|[?&])diag/.test(location.search)) {
  const box = document.createElement("div");
  box.style.cssText =
    "position:fixed;left:6px;right:6px;top:6px;z-index:9999;pointer-events:none;" +
    "background:rgba(251,247,240,.94);border:1px solid rgba(69,36,26,.3);border-radius:10px;" +
    "padding:8px 10px;font:12px/1.45 -apple-system,BlinkMacSystemFont,sans-serif;color:#45241a;" +
    "font-variant-numeric:tabular-nums;white-space:pre";
  addEventListener("DOMContentLoaded", () => document.body.appendChild(box));
  let worst = 0;
  const report = () => {
    const vh = window.visualViewport ? window.visualViewport.height : innerHeight;
    const h = heroEl.getBoundingClientRect();
    const c = camImg.getBoundingClientRect();
    const pin = ScrollTrigger.getAll().find((t) => t.vars.pin && t.trigger?.id === "hero");
    const bare = Math.round(vh - c.bottom);
    if (bare > worst) worst = bare;
    box.textContent =
      "дэлгэц       " + Math.round(vh) + "\n" +
      "hero өндөр   " + Math.round(h.height) + "  дээд " + Math.round(h.top) + "\n" +
      "камер доод   " + Math.round(c.bottom) + "  өндөр " + Math.round(c.height) + "\n" +
      "НҮЦГЭН ЗАЙ   " + bare + "   хамгийн их " + worst + "\n" +
      "zoom явц     " + (pin ? pin.progress.toFixed(2) : "-") +
      "  scale " + (getComputedStyle(camImg).transform.match(/[\d.]+/) || ["-"])[0];
  };
  addEventListener("scroll", report, { passive: true });
  addEventListener("resize", report);
  setInterval(report, 120);
}

const lensOffset = (axis) => () => {
  const hero = heroEl.getBoundingClientRect();
  const img = camImg.getBoundingClientRect();
  const lensX = img.left - hero.left + img.width * 0.521;
  const lensY = img.top - hero.top + img.height * 0.875;
  return axis === "x" ? hero.width / 2 - lensX : hero.height / 2 - lensY;
};

function buildHomeMotion() {
  if (heroTl) return;

  /* Scrolling flies the viewer into the lens: the image scales about the
     lens while the lens itself travels to the middle of the screen, so it
     reads as entering rather than drifting by. */
  heroTl = gsap
    .timeline({
      scrollTrigger: {
        trigger: "#hero",
        start: "top top",
        end: "+=190%",
        scrub: 0.5,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // the pin inserts a spacer that moves everything below it, so this has
        // to be measured before the category trigger reads its own position
        refreshPriority: 1,
      },
    })
    .to(".hero__cue", { opacity: 0, duration: 0.12 }, 0)
    .to(".hero__word", { opacity: 0, duration: 0.34, ease: "power1.in" }, 0.04)
    .to(camImg, { scale: 11, x: lensOffset("x"), y: lensOffset("y"), duration: 1, ease: "power2.in" }, 0)
    /* The veil closes over the second half rather than the last sliver, and
       that timing is not taste — it is the point past which the photograph
       cannot be drawn.

       Scaling an image is free while the browser can hand the GPU the texture
       it already holds. Past a certain size it cannot: on an iPhone 11 Pro,
       measured through ?diag, the picture came through whole at scale 2.35 and
       was sliced across the middle at 4.35 — geometry reporting a bottom edge
       well past the foot of the screen while only a band of it was painted.
       Three device pixels to the CSS pixel and a scale of eleven asks for a
       surface no phone will allocate.

       So the screen is covered before it gets there. The dive still reads as a
       dive; it simply resolves into the page rather than into a torn frame. */
    .to(".hero__veil", { opacity: 1, duration: 0.18 }, 0.42);

  /* Pinned for its own short beat so the categories grow out of the black in
     place. Without the pin they would scale up while sliding past, which
     reads as sliding in from below rather than emerging from the dark. */
  homeTriggers.push(
    gsap.fromTo(
      ".cats__emerge",
      { scale: 0.3, opacity: 0 },
      {
        scale: 1, opacity: 1, ease: "power2.out",
        scrollTrigger: {
          trigger: "#cats",
          start: "top top",
          end: "+=70%",
          scrub: 0.5,
          pin: true,
          anticipatePin: 1,
          refreshPriority: -1,
        },
      }
    ).scrollTrigger,
    ScrollTrigger.create({
      trigger: "#cats",
      start: "top 80%",
      end: "bottom 20%",
      refreshPriority: -1,
      onToggle: (self) => (self.isActive ? startCycle() : stopCycle()),
    })
  );

  ["hero", "cats"].forEach((id) =>
    homeTriggers.push(
      ScrollTrigger.create({
        trigger: `#${id}`,
        start: "top 55%",
        end: "bottom 45%",
        refreshPriority: -1,
        onEnter: () => setRail(id),
        onEnterBack: () => setRail(id),
      })
    )
  );
}

function destroyHomeMotion() {
  stopCycle();
  if (heroTl) {
    heroTl.scrollTrigger && heroTl.scrollTrigger.kill();
    heroTl.kill();
    heroTl = null;
  }
  homeTriggers.forEach((t) => t && t.kill());
  homeTriggers = [];
  gsap.set([camImg, ".hero__veil", ".hero__cue", ".cats__emerge"], { clearProps: "all" });
  // The words carry --chars inline, and that is what their font-size calc is
  // built on. clearProps:"all" would wipe it along with the tween, leaving an
  // invalid calc and type that collapses to the browser default — so only the
  // property actually animated gets cleared here.
  gsap.set(".hero__word", { clearProps: "opacity" });
}

const railEl = document.getElementById("rail");
const edgeEl = document.getElementById("edge");
const railLines = Array.from(document.querySelectorAll(".rail__line"));

function setRail(id) {
  railLines.forEach((l) => l.classList.toggle("is-active", l.dataset.goto === id));
  edgeEl.classList.add("is-shown");
}

railLines.forEach((line) =>
  line.addEventListener("click", () =>
    document.getElementById(line.dataset.goto)?.scrollIntoView({ behavior: "smooth" })
  )
);

/* The delivery helpline lives behind a button rather than sitting on every
   page, so the numbers stay findable without shouting from every screen. */
const helpBtn = document.getElementById("helpBtn");
const helpPop = document.getElementById("helpPop");

const toggleHelp = (open) => {
  helpPop.hidden = !open;
  helpBtn.setAttribute("aria-expanded", String(open));
};

helpBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleHelp(helpPop.hidden);
});
document.addEventListener("click", (e) => {
  if (!helpPop.hidden && !helpPop.contains(e.target)) toggleHelp(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") toggleHelp(false);
});

/* ========================================================================
   CATEGORY VIEW
   ===================================================================== */
function renderCategory(slug) {
  const cat = categoryBy(slug);
  const items = productsIn(slug);
  document.getElementById("catTitle").textContent = cat ? cat.name : "Категори";
  setHead(cat ? cat.name : "Категори", "/");
  document.getElementById("catMeta").textContent = `${items.length} БАРАА`;

  const plist = document.getElementById("plist");
  plist.innerHTML = "";
  items.forEach((p) => {
    const sizePrices = listOf(p.sizePrices).map(Number).filter((n) => n > 0);
    const pr = priceOf(p, lowestPrice(p));
    const row = document.createElement("a");
    row.className = "prow";
    row.href = `#/p/${encodeURIComponent(p.slug)}`;
    // drawn ~150 points wide, so the full-size file is pure waiting
    row.appendChild(buildFrame(p.images, "frame", 400, p.name));

    const info = document.createElement("div");
    info.className = "prow__info";
    info.innerHTML = `
      <span class="prow__name">${esc(p.name)}</span>
      <span class="prow__prices">
        <span class="price-now">${sizePrices.length > 1 ? money(pr.now) + "-с" : money(pr.now)}</span>
        ${pr.on ? `<span class="price-was">${money(pr.was)}</span>` : ""}
      </span>
      ${pr.on ? `<span class="tag">-${pr.pct}%</span>` : ""}
      ${stockBadge(p.slug)}`;
    if (isSoldOut(p.slug)) row.classList.add("is-soldout");
    row.appendChild(info);
    plist.appendChild(row);
  });

  /* An empty shelf reads as "there is nothing here" and sends the visitor
     away, but before the catalogue lands it only means the shop has not been
     told yet. Say which one it is. */
  if (!items.length) {
    plist.innerHTML = liveLoaded
      ? '<p class="plist__note">Энэ ангилалд одоогоор бараа алга.</p>'
      : '<p class="plist__note">Ачаалж байна…</p>';
    // "0 БАРАА" over a shelf that is still loading says the opposite thing
    if (!liveLoaded) document.getElementById("catMeta").textContent = "";
  }

  if (window.fbq) fbq("trackCustom", "ViewCategory", { category: cat ? cat.name : slug });
}

/* ========================================================================
   PRODUCT VIEW
   ===================================================================== */
/* Set the moment the visitor picks anything on a product page. Until then the
   page is only what the shop guessed from its offline copy and is safe to draw
   again; afterwards it holds their choices and must be left alone. */
let pdpTouched = false;

/* The current product gallery's stepper, so the keyboard can reach it without
   a listener being added per render and never taken away. */
let pdpNav = null;

/* Someone who tapped a product link and landed on the hero with no explanation
   has no idea what happened and no way onward — they leave. This says what went
   wrong and puts the catalogue in front of them instead. */
function renderMissing() {
  const cat = DB.categories.filter((c) => c.active !== false)[0];
  document.getElementById("pdp").innerHTML = `
    <div class="missing">
      <h1 class="missing__title">Энэ бараа олдсонгүй</h1>
      <p class="missing__lead">
        Холбоос хуучирсан эсвэл бараа түр хугацаанд хаагдсан байж болно.
        Доорхоос бусад барааг үзнэ үү.
      </p>
      <div class="missing__acts">
        ${cat ? `<a class="missing__go" href="#/c/${esc(cat.slug)}">${esc(cat.name)} үзэх</a>` : ""}
        <a class="missing__alt" href="#/">Нүүр хуудас</a>
      </div>
      <p class="missing__help">Тодруулах бол: <a href="tel:88104640">8810-4640</a></p>
    </div>`;
}

/* Shown while the catalogue is still on its way. It replaces being thrown to
   the home page: someone who tapped a product link was put on the hero, made
   to sit through its animation, and only carried back four seconds later —
   measured on a wired line, and longer on a phone. They had every reason to
   think the link was broken and leave. Now they stay on the page they asked
   for and watch it fill in. */
/* The sheet holds a description as separate lines — a heading, then one
   selling point per line. Escaped into a single paragraph they ran together
   into an eight-sentence wall, which is the one thing nobody reads on a page
   they are deciding to spend money on. Each line gets its own block, a short
   opening line with no full stop is the heading it plainly is, and the part
   before an em dash is the point being made, so it is set in bold. */
/* A supplier's copy arrives pasted into one cell as a single run, its points
   separated by nothing but an emoji — four hundred characters with no break in
   them. The sheet's own newlines are the tidy way to write this and are used
   when they are there; failing that, a leading emoji is treated as the bullet
   the writer plainly meant it to be. Guarded so it can only ever fire on a
   genuinely long run that splits into substantial pieces: an emoji inside an
   ordinary sentence leaves the text exactly as it was. */
function emojiBullets(line) {
  if (line.length < 150) return null;
  const parts = line
    .split(/(?=[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])/u)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  if (parts.some((s) => s.length < 25)) return null;
  return parts;
}

function descBlock(desc) {
  let lines = String(desc || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 1) lines = emojiBullets(lines[0]) || lines;
  if (!lines.length) return "";
  if (lines.length === 1) return `<p class="pdp__desc">${esc(lines[0])}</p>`;

  let head = "";
  if (lines[0].length <= 30 && !/[.!?…]$/.test(lines[0])) head = lines.shift();

  const items = lines
    .map((l) => {
      const dash = l.split(/\s+—\s+/);
      if (dash.length > 1) {
        return `<li><b>${esc(dash[0])}</b> — ${esc(dash.slice(1).join(" — "))}</li>`;
      }
      // "🛠️ Хадаас шаардлагагүй: тусгай наалтаар…" — the same shape, punctuated
      // the other way. Only a short opener counts, so a colon inside a sentence
      // does not turn half of it bold.
      const colon = l.match(/^(.{4,48}?):\s+(.+)$/);
      if (colon) return `<li><b>${esc(colon[1])}</b> — ${esc(colon[2])}</li>`;
      return `<li>${esc(l)}</li>`;
    })
    .join("");

  return `${head ? `<h2 class="pdp__desc-head">${esc(head)}</h2>` : ""}
      <ul class="pdp__desc-list">${items}</ul>`;
}

function renderPending() {
  document.getElementById("pdp").innerHTML = `
    <div class="pending">
      <div class="pending__frame"></div>
      <div class="pending__bar pending__bar--wide"></div>
      <div class="pending__bar"></div>
      <p class="pending__note">Бараа ачаалж байна…</p>
    </div>`;
}

function renderProduct(slug) {
  const p = productBy(slug);
  /* Before the sheet's own catalogue lands the shop only knows its offline
     copy, so a product missing from it may simply not have arrived yet —
     hold the page and redraw when it does. Once the real catalogue is in, a
     slug that still resolves to nothing genuinely resolves to nothing. */
  if (!p) {
    show("product");
    if (liveLoaded) {
      setHead("Бараа олдсонгүй", "/");
      return renderMissing();
    }
    setHead("Ачаалж байна", "/");
    return renderPending();
  }
  setHead(p.name, CARD_SLUG.test(p.slug) ? `/p/${p.slug}/` : "/");
  pdpTouched = false;
  pdpNav = null; // reassigned below only when there is a set to step through
  const colors = listOf(p.colors);
  const sizes = listOf(p.sizes);
  /* Called through a lambda, not handed to `map` directly: `map` passes the
     index as the second argument, which `imageUrl` now reads as the width —
     the first variant photo would be asked for at zero pixels wide. */
  /* The sheet's own address is carried along with the mirrored one: the order
     summary asks for a small copy of whichever photo was on screen, and it can
     only do that from the original. */
  const variantPhoto = (u) => Object.assign(photoSrc(u, 1200), { raw: u });
  const colorImgs = listOf(p.colorImages).map(variantPhoto);
  const sizeImgs = listOf(p.sizeImages).map(variantPhoto);
  const sizePrices = listOf(p.sizePrices).map(Number);
  // price follows the selected size when the sheet gives one per size
  const priceForSize = (i) => (sizePrices[i] > 0 ? sizePrices[i] : Number(p.price));
  let pr = priceOf(p, sizes.length ? priceForSize(0) : p.price);
  const leadTime = leadTimeOf(p);
  const leadNote = leadNoteOf(p);
  // named for stock specifically: `left` is already the gallery column below
  const stockLeft = availableOf(p.slug);
  const soldOut = stockLeft === 0;
  // a pack you cannot actually fulfil should not be on offer
  const bundles = bundlesFor(p.slug).filter((b) => stockLeft === null || b.qty <= stockLeft);
  const cat = categoryBy(p.category);
  const revs = reviewsFor(p.slug);

  const pdp = document.getElementById("pdp");
  pdp.innerHTML = "";

  const back = document.createElement("a");
  back.className = "back";
  back.href = `#/c/${encodeURIComponent(p.category)}`;
  back.textContent = `← ${cat ? cat.name : "Буцах"}`;
  pdp.appendChild(back);

  const wrap = document.createElement("div");
  wrap.className = "pdp";

  /* ---- gallery ---- */
  const left = document.createElement("div");
  left.className = "pdp__left";
  const gallery = buildFrame(p.images, "pdp__gallery", 1200, p.name);
  left.appendChild(gallery);

  const track = gallery.querySelector(".frame__track");
  const galleryCount = Number(gallery.dataset.count || 1);
  /* The sheet's own addresses for what the gallery is showing, kept in step
     with it, so the order summary can carry the picture the visitor was
     actually looking at instead of always the first one in the sheet. */
  const rawImages = [...p.images];
  let dots = null;
  if (galleryCount > 1) {
    dots = document.createElement("div");
    dots.className = "pdp__dots";
    for (let i = 0; i < galleryCount; i++) {
      const d = document.createElement("span");
      d.className = "pdot" + (i === 0 ? " is-active" : "");
      dots.appendChild(d);
    }
    left.appendChild(dots);
    gallery.addEventListener("frame:index", (e) => {
      dots.querySelectorAll(".pdot").forEach((d, n) => d.classList.toggle("is-active", n === e.detail));
    });

    /* The set moved on its own and there was no way back to the photo someone
       wanted a second look at — they either caught it or waited for the loop.
       These put it in their hands. The rotation runs until they touch it and
       then stays out of the way, because a gallery that moves under a finger
       is worse than one that never moved at all. */
    const nav = (dir) => {
      gallery.dataset.manual = "1";
      stopFrames();
      showFrame(gallery, Number(gallery.dataset.index || 0) + dir);
    };
    pdpNav = nav;

    [
      ["prev", "‹", "Өмнөх зураг"],
      ["next", "›", "Дараагийн зураг"],
    ].forEach(([which, glyph, label]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `gnav gnav--${which}`;
      b.setAttribute("aria-label", label);
      b.textContent = glyph;
      b.addEventListener("click", (e) => {
        e.preventDefault();
        nav(which === "prev" ? -1 : 1);
      });
      gallery.appendChild(b);
    });

    dots.addEventListener("click", (e) => {
      const dot = e.target.closest(".pdot");
      if (!dot) return;
      const n = Array.from(dots.children).indexOf(dot);
      gallery.dataset.manual = "1";
      stopFrames();
      showFrame(gallery, n);
    });

    /* On a phone the arrows are a courtesy; the swipe is what people try. */
    let swipeX = null;
    gallery.addEventListener("touchstart", (e) => { swipeX = e.touches[0].clientX; }, { passive: true });
    gallery.addEventListener("touchend", (e) => {
      if (swipeX === null) return;
      const dx = e.changedTouches[0].clientX - swipeX;
      swipeX = null;
      if (Math.abs(dx) > 40) nav(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* Picking a colour or size jumps the gallery to that variant's photo, so
     the picture always matches what is actually being ordered. The sheet
     supplies those photos in colorImages / sizeImages, in the same order as
     the options themselves. */
  const showVariantImage = (photo) => {
    if (!photo || !photo.src) return;
    const url = photo.src;
    const imgs = Array.from(track.querySelectorAll("img"));
    /* `data-src` counts too: a slide the visitor has not reached yet holds its
       address there and not in `src`, and missing it would append a second copy
       of a photo the gallery already has. */
    let idx = imgs.findIndex(
      (im) => im.getAttribute("src") === url || im.dataset.src === url || im.src === url
    );
    if (idx === -1) {
      const extra = document.createElement("img");
      extra.src = url;
      if (photo.fallback) extra.dataset.fallback = photo.fallback;
      extra.alt = p.name;
      extra.decoding = "async";
      track.appendChild(extra);
      rawImages.push(photo.raw || url);
      idx = imgs.length;
      gallery.dataset.count = String(idx + 1);
      if (dots) {
        const d = document.createElement("span");
        d.className = "pdot";
        dots.appendChild(d);
      }
    }
    gallery.dataset.manual = "1"; // stop the auto-rotation fighting the pick
    stopFrames();
    showFrame(gallery, idx);
  };

  wrap.appendChild(left);

  /* ---- info + options ---- */
  const right = document.createElement("div");
  right.innerHTML = `
    <h1 class="pdp__name">${esc(p.name)}</h1>
    ${descBlock(p.desc)}
    <div class="pdp__prices" id="pdpPrices"></div>
    ${stockLeft !== null && stockLeft > 0 && stockLeft <= 5 ? `<p class="stockline">Үлдсэн ${stockLeft} ширхэг</p>` : ""}

    ${colors.length ? `<div class="opt"><span class="opt__label">ӨНГӨ</span>
      <div class="opt__row" data-opt="color">
        ${colors.map((c, i) => `<button class="chip${i === 0 ? " is-active" : ""}" data-i="${i}">${esc(c)}</button>`).join("")}
      </div></div>` : ""}

    ${sizes.length ? `<div class="opt"><span class="opt__label">ХЭМЖЭЭ</span>
      <div class="opt__row" data-opt="size">
        ${sizes.map((s, i) => `<button class="chip${i === 0 ? " is-active" : ""}" data-i="${i}">${esc(s)}</button>`).join("")}
      </div></div>` : ""}

    ${
      bundles.length
        ? `<div class="opt"><span class="opt__label">БАГЦ СОНГОХ</span>
             <div class="packs" id="packs"></div>
           </div>`
        : `<div class="opt"><span class="opt__label">ТОО ШИРХЭГ</span>
             <div class="qty">
               <button class="qty__btn" data-step="-1">−</button>
               <span class="qty__val" id="qtyVal">1</span>
               <button class="qty__btn" data-step="1">+</button>
             </div>
           </div>`
    }

    ${
      soldOut
        ? `<div class="buy buy--out" aria-disabled="true">
             <span class="buy__label">ДУУССАН</span>
           </div>
           <p class="note">Энэ бараа түр дууссан байна. Дахин нөөцлөгдөх үед<br>захиалах боломжтой болно.</p>`
        : `<a class="buy" href="#" id="buyBtn">
             <span class="buy__total" id="buyTotal"></span>
             <span class="buy__label">ЗАХИАЛАХ</span>
           </a>`
    }

    <div class="trust">
      <div><b>Хүргэлт</b>${deliverySummary()}</div>
      <div><b>Хугацаа</b>${esc(leadTime)}</div>
      <div><b>Төлбөр</b>Хүргэлтээр эсвэл шилжүүлгээр</div>
      <div><b>Захиалгын код</b>Бүртгэл, хяналттай</div>
    </div>
    <!-- full width rather than inside the grid above: the explanation runs long
         and would leave one cell towering over the other three -->
    <p class="leadnote">${esc(leadNote)}</p>
    <button class="share" type="button" data-slug="${esc(p.slug)}">Холбоос хуулах</button>`;
  wrap.appendChild(right);
  pdp.appendChild(wrap);

  views.product.addEventListener("pointerdown", () => (pdpTouched = true), { once: true });

  /* The address bar shows the in-shop address, the one with the `#`, and that
     is the one that gets pasted under a reel — where the crawlers cannot read
     past the `#` and the post ends up captioned with nothing. Hand over the
     address of the product's own page instead, so the right link is the easy
     one to send. */
  const shareBtn = right.querySelector(".share");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const link = `${location.origin}/p/${encodeURIComponent(p.slug)}/`;
      const said = (msg) => {
        shareBtn.textContent = msg;
        setTimeout(() => (shareBtn.textContent = "Холбоос хуулах"), 2200);
      };
      try {
        // the in-app browsers this shop is opened from are the likeliest to
        // withhold the clipboard, so the older route stays as a fallback
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(link);
        } else {
          const box = document.createElement("textarea");
          box.value = link;
          box.setAttribute("readonly", "");
          box.style.cssText = "position:fixed;top:-1000px";
          document.body.appendChild(box);
          box.select();
          document.execCommand("copy");
          box.remove();
        }
        said("Хуулагдлаа ✓");
      } catch (ex) {
        said(link);
      }
    });
  }

  /* ---- selection state ---- */
  let qty = 1;
  let color = colors[0] || "";
  let sizeIdx = sizes.length ? 0 : -1;
  let size = sizes[0] || "";
  const qtyVal = right.querySelector("#qtyVal");
  const buyTotal = right.querySelector("#buyTotal");
  const priceBox = right.querySelector("#pdpPrices");

  /* A bundle is a fixed total for a fixed count, so once one is chosen it
     overrides the per-unit maths entirely. `pack === null` means the plain
     single-unit path with the quantity stepper. */
  let pack = null;
  const packsBox = right.querySelector("#packs");

  const orderTotal = () => (pack ? pack.price : pr.now * qty);

  const renderPacks = () => {
    if (!packsBox) return;
    const single = { qty: 1, price: pr.now, label: "" };
    packsBox.innerHTML = [single, ...bundles]
      .map((b, i) => {
        const per = Math.round(b.price / b.qty);
        const saved = pr.now * b.qty - b.price;
        const pct = Math.round((saved / (pr.now * b.qty)) * 100);
        const active = (pack === null && i === 0) || (pack && pack.qty === b.qty);
        return `<button class="pack${active ? " is-active" : ""}" data-i="${i}">
            <span class="pack__dot"></span>
            <span class="pack__body">
              <span class="pack__qty">${b.qty} ширхэг</span>
              ${b.label ? `<span class="pack__label">${esc(b.label)}</span>` : ""}
              ${b.qty > 1 ? `<span class="pack__per">${money(per)} / ширхэг</span>` : ""}
            </span>
            <span class="pack__right">
              <span class="pack__price">${money(b.price)}</span>
              ${saved > 0 && pct > 0 ? `<span class="pack__save">${pct}% хэмнэнэ</span>` : ""}
            </span>
          </button>`;
      })
      .join("");

    packsBox.querySelectorAll(".pack").forEach((btn) =>
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.i);
        pack = i === 0 ? null : bundles[i - 1];
        qty = pack ? pack.qty : 1;
        renderPacks();
        refreshTotalLine();
      })
    );
  };

  const refreshTotalLine = () => {
    // absent when the product is sold out — the button is replaced, not hidden
    if (!buyTotal) return;
    buyTotal.textContent = `${qty} ширхэг · ${money(orderTotal())}`;
  };

  const refreshPrice = () => {
    pr = priceOf(p, sizeIdx >= 0 ? priceForSize(sizeIdx) : p.price);
    priceBox.innerHTML = `
      <span class="price-now">${money(pr.now)}</span>
      ${pr.on ? `<span class="price-was">${money(pr.was)}</span>` : ""}
      ${pr.on ? `<span class="tag">-${pr.pct}%</span>` : ""}`;
    renderPacks();
    refreshTotalLine();
  };
  refreshPrice();

  right.querySelectorAll(".opt__row").forEach((row) =>
    row.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      const i = Number(chip.dataset.i);
      row.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c === chip));
      if (row.dataset.opt === "color") {
        color = colors[i];
        showVariantImage(colorImgs[i]);
      } else {
        size = sizes[i];
        sizeIdx = i;
        showVariantImage(sizeImgs[i]);
        refreshPrice(); // a bigger size is a different price
      }
    })
  );

  right.querySelectorAll(".qty__btn").forEach((b) =>
    b.addEventListener("click", () => {
      const ceiling = stockLeft === null ? Infinity : stockLeft;
      qty = Math.min(ceiling, Math.max(1, qty + Number(b.dataset.step)));
      if (qtyVal) qtyVal.textContent = String(qty);
      refreshTotalLine();
    })
  );

  right.querySelector("#buyBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    setDraft({
      slug: p.slug,
      name: p.name,
      /* Whatever is on screen — the colour they picked, the angle they
         stopped on. It used to be the sheet's first photo no matter what,
         which on this shop is often the supplier's advert. */
      image: rawImages[Number(gallery.dataset.index || 0)] || p.images[0] || "",
      unit: pack ? Math.round(pack.price / pack.qty) : pr.now,
      qty,
      goods: orderTotal(),
      pack: pack ? pack.label || `${pack.qty} ширхэгийн багц` : "",
      color,
      size,
      leadTime,
      leadNote,
    });
    if (window.fbq)
      fbq("track", "InitiateCheckout", { content_name: p.name, value: orderTotal(), currency: "MNT" });
    location.hash = "#/order";
  });

  /* ---- reviews ---- */
  if (revs.length) {
    const box = document.createElement("section");
    box.className = "reviews";
    box.innerHTML =
      `<h2 class="reviews__head">Хэрэглэгчдийн сэтгэгдэл</h2>` +
      revs
        .map(
          (r) => `<article class="rev">
            ${r.rating ? `<div class="rev__stars">${"★".repeat(Math.min(5, r.rating))}${"☆".repeat(Math.max(0, 5 - r.rating))}</div>` : ""}
            ${r.text ? `<p class="rev__text">${esc(r.text)}</p>` : ""}
            ${r.name ? `<span class="rev__name">— ${esc(r.name)}</span>` : ""}
            ${r.image ? `<div class="rev__shot"><img src="${imageUrl(r.image)}" alt="" loading="lazy"></div>` : ""}
          </article>`
        )
        .join("");
    pdp.appendChild(box);
  }

  if (window.fbq)
    fbq("track", "ViewContent", {
      content_ids: [p.slug],
      content_name: p.name,
      content_type: "product",
      value: pr.now,
      currency: "MNT",
    });
}

/* ========================================================================
   ORDER
   The pick made on the product page has to survive the hop to the form (and
   a refresh), so it is parked in sessionStorage rather than a bare variable.
   ===================================================================== */
const DRAFT_KEY = "ss_draft";
const setDraft = (d) => sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
const getDraft = () => {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
  } catch {
    return null;
  }
};

function renderOrder() {
  const d = getDraft();
  if (!d) return goHome();
  setHead("Захиалга", "/");

  const ship = (DB.shop.delivery || []).length
    ? DB.shop.delivery
    : [
        { name: "Энгийн хүргэлт", price: 6000, note: "Улаанбаатар хот" },
        { name: "Шуурхай хүргэлт", price: 12000, note: "Улаанбаатар хот" },
        { name: "Орон нутаг", price: 6000, note: "Унаагаар илгээнэ · урьдчилж төлнө", prepaid: true },
      ];

  const page = document.getElementById("orderPage");
  page.innerHTML = `
    <a class="back" href="#/p/${esc(encodeURIComponent(d.slug))}">← Бараа руу буцах</a>
    <h1 class="page__title" style="font-size:clamp(1.8rem,9vw,3rem)">Захиалга</h1>

    <div class="order-grid" style="margin-top:1.6rem">
      <div>
        <div class="sum">
          <div class="sum__img"><img src="${photoSrc(d.image, 400).src}" data-fallback="${esc(photoSrc(d.image, 400).fallback)}" alt="${esc(d.name)}" decoding="async"></div>
          <div>
            <div class="sum__name">${esc(d.name)}</div>
            <div class="sum__meta">
              ${d.color ? esc(d.color) + " · " : ""}${d.size ? esc(d.size) + " · " : ""}${d.qty} ширхэг
              ${d.pack ? `<span class="sum__pack">${esc(d.pack)}</span>` : ""}
            </div>
          </div>
        </div>

        <div class="field">
          <span class="field__label">ХҮРГЭЛТИЙН СОНГОЛТ</span>
          <div class="pick" id="shipPick">
            ${ship
              .map(
                (s, i) => `<div class="pick__item${i === 0 ? " is-active" : ""}" data-price="${s.price}" data-name="${esc(s.name)}" data-prepaid="${s.prepaid ? "1" : ""}">
                  <span class="pick__dot"></span>
                  <span class="pick__body">
                    <span class="pick__title">${esc(s.name)}</span>
                    ${s.note ? `<span class="pick__sub">${esc(s.note)}</span>` : ""}
                  </span>
                  <span class="pick__price">${s.priceMax ? money(s.price) + "–" + money(s.priceMax) : money(s.price)}</span>
                </div>`
              )
              .join("")}
          </div>
        </div>

        <div class="field">
          <span class="field__label">ХҮРГЭЛТИЙН ХУГАЦАА</span>
          <div class="leadtime">
            <b>${esc(d.leadTime || DEFAULT_LEAD_TIME)}</b>
            <span>${esc(d.leadNote || DEFAULT_LEAD_NOTE)}</span>
          </div>
        </div>

        <div class="field">
          <span class="field__label">ТӨЛБӨРИЙН СОНГОЛТ</span>
          <div class="pick" id="payPick">
            <div class="pick__item is-active" data-pay="Хүргэлтээр төлөх">
              <span class="pick__dot"></span>
              <span class="pick__body">
                <span class="pick__title">Хүргэлтээр төлөх</span>
                <span class="pick__sub">Бараагаа хүлээж авахдаа төлнө</span>
              </span>
            </div>
            <div class="pick__item" data-pay="Шилжүүлгээр төлөх">
              <span class="pick__dot"></span>
              <span class="pick__body">
                <span class="pick__title">Шилжүүлгээр төлөх</span>
                <span class="pick__sub">Дансны мэдээлэл дараагийн алхамд</span>
              </span>
            </div>
          </div>
          <p class="pick__lock" id="payLock" hidden>
            Орон нутгийн захиалгыг унаанд тавьж илгээдэг тул хүргэлтийн ажилтан
            төлбөр авах боломжгүй. Тиймээс урьдчилж шилжүүлнэ.
          </p>
        </div>

        <div class="totals">
          <div class="totals__row"><span>Бараа (${d.qty}ш)</span><span id="tGoods"></span></div>
          <div class="totals__row"><span>Хүргэлт</span><span id="tShip"></span></div>
          <div class="totals__row totals__row--big"><span>Нийт</span><span id="tAll"></span></div>
        </div>
      </div>

      <div>
        <!-- A real form, not a heap of inputs: Enter sends it, the phone
             keyboard offers "next" down the fields, and the browser is willing
             to fill an address it can see belongs together. Validation is left
             to us — the novalidate flag — because the browser's own warnings arrive in
             the wrong language and say less than ours do. -->
        <form id="orderForm" novalidate>
        <div class="field">
          <label class="field__label" for="fName">НЭР</label>
          <input class="input" id="fName" name="name" type="text" placeholder="Таны нэр" autocomplete="name" required>
        </div>
        <div class="grid2">
          <div class="field">
            <label class="field__label" for="fPhone">УТАС</label>
            <input class="input" id="fPhone" name="tel" type="tel" inputmode="numeric" maxlength="8" pattern="[0-9]{8}" placeholder="8 оронтой" autocomplete="tel" required>
          </div>
          <div class="field">
            <!-- Marked optional because it is. It used to be demanded, and had
                 to differ from the first, while being labelled "additional" and
                 carrying no required mark — the form asked for the opposite of
                 what it enforced, and the order stopped there. -->
            <label class="field__label" for="fPhone2">НЭМЭЛТ УТАС <span class="field__opt">(заавал биш)</span></label>
            <input class="input" id="fPhone2" name="tel2" type="tel" inputmode="numeric" maxlength="8" pattern="[0-9]{8}" placeholder="8 оронтой" autocomplete="off">
          </div>
        </div>

        <span class="field__label">ХҮРГҮҮЛЭХ ХАЯГ</span>
        <div class="grid2">
          <div class="field"><label class="sr-only" for="aCity">Хот / Аймаг</label><input class="input" id="aCity" name="city" type="text" placeholder="Хот / Аймаг" autocomplete="address-level1" required></div>
          <div class="field"><label class="sr-only" for="aDist">Дүүрэг / Сум</label><input class="input" id="aDist" name="district" type="text" placeholder="Дүүрэг / Сум" autocomplete="address-level2" required></div>
          <div class="field"><label class="sr-only" for="aKhoroo">Хороо / Баг</label><input class="input" id="aKhoroo" name="khoroo" type="text" placeholder="Хороо / Баг" autocomplete="address-level3" required></div>
          <div class="field"><label class="sr-only" for="aBuilding">Байр / Гудамж</label><input class="input" id="aBuilding" name="building" type="text" placeholder="Байр / Гудамж" autocomplete="address-line1" required></div>
          <div class="field"><label class="sr-only" for="aEntrance">Орц</label><input class="input" id="aEntrance" name="entrance" type="text" placeholder="Орц" autocomplete="address-line2" required></div>
          <div class="field"><label class="sr-only" for="aDoor">Тоот</label><input class="input" id="aDoor" name="door" type="text" placeholder="Тоот" autocomplete="address-line3" required></div>
        </div>
        <div class="field">
          <label class="sr-only" for="aExtra">Нэмэлт заавар</label>
          <input class="input" id="aExtra" name="note" type="text" placeholder="Нэмэлт заавар (заавал биш)" autocomplete="off">
        </div>

        <p class="err" id="formErr"></p>

        <button class="buy" type="submit" id="submitBtn">
          <span class="buy__total" id="submitTotal"></span>
          <span class="buy__label">ЗАХИАЛГА БАТАЛГААЖУУЛАХ</span>
        </button>
        <p class="note">Илгээснээр таны захиалгын код үүсэж, бид тантай утсаар холбогдоно.</p>
        </form>
      </div>
    </div>`;

  /* ---- live totals ---- */
  let shipPrice = Number(ship[0].price) || 0;
  let shipName = ship[0].name;
  let payment = "Хүргэлтээр төлөх";

  // a bundle carries its own fixed total, so trust it over unit × qty
  const goods = Number(d.goods) || d.unit * d.qty;
  const tGoods = page.querySelector("#tGoods");
  const tShip = page.querySelector("#tShip");
  const tAll = page.querySelector("#tAll");
  const submitTotal = page.querySelector("#submitTotal");

  const refresh = () => {
    tGoods.textContent = money(goods);
    tShip.textContent = money(shipPrice);
    tAll.textContent = money(goods + shipPrice);
    submitTotal.textContent = `Нийт ${money(goods + shipPrice)}`;
  };
  refresh();

  const payItems = Array.from(page.querySelectorAll("#payPick .pick__item"));
  const payLock = page.querySelector("#payLock");
  const cashItem = payItems.find((n) => n.dataset.pay === "Хүргэлтээр төлөх");
  const transferItem = payItems.find((n) => n.dataset.pay === "Шилжүүлгээр төлөх");

  const selectPayment = (item) => {
    payItems.forEach((n) => n.classList.toggle("is-active", n === item));
    payment = item.dataset.pay;
  };

  /* Some routes hand the parcel to a third-party vehicle, so nobody is there
     to take cash — those force prepayment rather than letting the customer
     pick an option that cannot actually be honoured. */
  const applyPrepaid = (prepaid) => {
    cashItem.classList.toggle("is-locked", prepaid);
    payLock.hidden = !prepaid;
    if (prepaid) selectPayment(transferItem);
  };

  page.querySelector("#shipPick").addEventListener("click", (e) => {
    const item = e.target.closest(".pick__item");
    if (!item) return;
    page.querySelectorAll("#shipPick .pick__item").forEach((n) => n.classList.toggle("is-active", n === item));
    shipPrice = Number(item.dataset.price) || 0;
    shipName = item.dataset.name;
    applyPrepaid(item.dataset.prepaid === "1");
    refresh();
  });

  page.querySelector("#payPick").addEventListener("click", (e) => {
    const item = e.target.closest(".pick__item");
    if (!item || item.classList.contains("is-locked")) return;
    selectPayment(item);
  });

  applyPrepaid(Boolean(ship[0] && ship[0].prepaid));

  /* ---- submit ---- */
  const form = page.querySelector("#orderForm");
  const btn = page.querySelector("#submitBtn");
  const err = page.querySelector("#formErr");
  const errHome = err.parentNode;
  // where it belongs when it is not pinned to a field: just above the button,
  // never appended to the end of the form under the small print
  const errAnchor = err.nextElementSibling;
  const homeErr = () => {
    if (err.parentNode !== errHome || err.nextElementSibling !== errAnchor) {
      errHome.insertBefore(err, errAnchor);
    }
  };
  let sending = false;

  /* A number field that lets letters in only to reject them at the end wastes
     the visitor's time twice. Nothing but digits ever lands in these. */
  ["fPhone", "fPhone2"].forEach((id) => {
    const el = page.querySelector("#" + id);
    el.addEventListener("input", () => {
      const digits = el.value.replace(/[^0-9]/g, "").slice(0, 8);
      if (el.value !== digits) el.value = digits;
      el.classList.remove("is-invalid");
    });
  });
  page.querySelectorAll(".input").forEach((el) =>
    el.addEventListener("input", () => el.classList.remove("is-invalid"))
  );

  /* The complaint used to be shown in one line above the button, at the foot
     of a form longer than a phone screen. Someone with an empty box near the
     top pressed send, nothing appeared to happen, and they left. The message
     now travels to the field it is about, which is also where the cursor and
     the screen go. */
  /* Getting there is not optional, so it does not ride on an animation. The
     document is set to scroll smoothly, and a smooth scroll is skipped when
     the visitor has asked for less motion and can be throttled to nothing in
     an in-app browser — measured here scrolling zero pixels. The cursor would
     then move to a field below the fold and the page would look like it had
     ignored the button, which is the dead end this exists to prevent. */
  const bring = (el) => {
    const box = el.getBoundingClientRect();
    if (box.top >= 8 && box.bottom <= innerHeight - 8) return; // already in sight
    const root = document.documentElement;
    const had = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    el.scrollIntoView({ block: "center" });
    root.style.scrollBehavior = had;
  };

  const fail = (id, msg) => {
    page.querySelectorAll(".input.is-invalid").forEach((n) => n.classList.remove("is-invalid"));
    const el = page.querySelector("#" + id);
    err.textContent = msg;
    if (!el) {
      homeErr();
      return;
    }
    el.classList.add("is-invalid");
    (el.closest(".field") || errHome).appendChild(err);
    el.focus({ preventScroll: true });
    bring(el);
  };

  const clearFail = () => {
    err.textContent = "";
    page.querySelectorAll(".input.is-invalid").forEach((n) => n.classList.remove("is-invalid"));
    homeErr();
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sending) return;

    const val = (id) => page.querySelector("#" + id).value.trim();
    const name = val("fName");
    const phone = val("fPhone");
    const phone2 = val("fPhone2");

    // the field id travels with each piece so a complaint can point at it
    const parts = [
      ["Хот/Аймаг", val("aCity"), "aCity"],
      ["Дүүрэг/Сум", val("aDist"), "aDist"],
      ["Хороо/Баг", val("aKhoroo"), "aKhoroo"],
      ["Байр/Гудамж", val("aBuilding"), "aBuilding"],
      ["Орц", val("aEntrance"), "aEntrance"],
      ["Тоот", val("aDoor"), "aDoor"],
    ];

    if (!name) return fail("fName", "Нэрээ бичнэ үү.");
    if (!/^\d{8}$/.test(phone)) return fail("fPhone", "Утасны дугаар 8 оронтой тоо байх ёстой.");
    /* Only checked when they chose to give one — it is a second contact, not
       a second hurdle. */
    if (phone2 && !/^\d{8}$/.test(phone2))
      return fail("fPhone2", "Нэмэлт утасны дугаар 8 оронтой тоо байх ёстой.");
    if (phone2 && phone === phone2)
      return fail("fPhone2", "Нэмэлт утас нь өөр дугаар байх ёстой. Эсвэл хоосон орхино уу.");

    const missing = parts.find(([, v]) => !v);
    if (missing) return fail(missing[2], `Хаягийн "${missing[0]}" талбарыг бөглөнө үү.`);
    clearFail();

    // The sheet keeps one row per order, so the address pieces are folded into
    // a single readable line for the delivery driver.
    const extra = val("aExtra");
    const addr = parts.map(([k, v]) => `${k}: ${v}`).join(", ") + (extra ? ` (${extra})` : "");

    sending = true;
    btn.disabled = true;
    btn.querySelector(".buy__label").textContent = "ИЛГЭЭЖ БАЙНА…";

    /* Nothing bounded this request. On a signal that dies mid-send the button
       read "ИЛГЭЭЖ БАЙНА…" for as long as the visitor was willing to look at
       it, and no second attempt was possible because `sending` never came
       back down — the one screen where a freeze costs an actual sale. The
       sheet answers in about three seconds when it is well, so thirty is a
       dead line rather than a slow one. */
    const bail = typeof AbortController === "function" ? new AbortController() : null;
    const deadline = setTimeout(() => bail && bail.abort(), 30000);
    const release = (label) => {
      clearTimeout(deadline);
      btn.disabled = false;
      btn.querySelector(".buy__label").textContent = label;
      sending = false;
    };

    try {
      // text/plain keeps the browser from firing a CORS preflight that Apps
      // Script cannot answer; doPost reads the raw body either way.
      const res = await fetch(DATA_SOURCE, {
        method: "POST",
        signal: bail ? bail.signal : undefined,
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          name, phone, phone2, address: addr,
          slug: d.slug,
          product: d.name + (d.pack ? ` (${d.pack})` : ""),
          color: d.color, size: d.size,
          qty: d.qty,
          deliveryName: shipName,
          payment,
        }),
      });
      const out = await res.json();
      if (!out.ok) throw new Error(out.error || "Тодорхойгүй алдаа");
      clearTimeout(deadline);

      if (window.fbq)
        fbq("track", "Purchase", { value: goods + shipPrice, currency: "MNT", content_name: d.name });

      sessionStorage.setItem(
        "ss_done",
        JSON.stringify({ code: out.code, total: goods + shipPrice, payment, name, phone, phone2, leadTime: d.leadTime || "" })
      );
      location.hash = "#/done";
    } catch (ex) {
      console.error(ex);
      /* A request we gave up on may still have reached the sheet, so the
         wording stops short of telling them to fire a second one blind — a
         duplicate order is worse for them than a phone call. */
      err.textContent =
        ex && ex.name === "AbortError"
          ? "Сүлжээ хариу өгсөнгүй. 8810-4640 руу залгавал бид захиалгыг тань шууд бүртгэнэ."
          : "Илгээхэд алдаа гарлаа. Дахин оролдоно уу, эсвэл 8810-4640 руу залгана уу.";
      homeErr();
      release("ЗАХИАЛГА БАТАЛГААЖУУЛАХ");
    }
  });
}

/* ========================================================================
   CONFIRMATION
   ===================================================================== */
function renderDone() {
  let info = null;
  try {
    info = JSON.parse(sessionStorage.getItem("ss_done") || "null");
  } catch {}
  if (!info) return goHome();

  setHead("Захиалга хүлээн авлаа", "/");

  const s = DB.shop || {};
  const transfer = info.payment === "Шилжүүлгээр төлөх";

  const acct = String(s.account || "");
  const iban = "MN" + acct;

  document.getElementById("donePage").innerHTML = `
    <div class="done">
      <div class="done__mark">✓</div>
      <h1 class="done__title">Захиалга хүлээн авлаа</h1>
      <p class="done__lead">
        ${esc(info.name)}, баярлалаа. Бид удахгүй тантай холбогдоно.
        ${info.leadTime ? `<br>Хүргэлт: <b>${esc(info.leadTime)}</b>` : ""}
      </p>

      <div class="code">
        <div class="code__label">ТАНЫ ЗАХИАЛГЫН КОД</div>
        <div class="code__value" id="codeVal">${esc(info.code)}</div>
        <button class="copy" data-copy="${esc(info.code)}">Кодыг хуулах</button>
        <div class="code__phone">
          <span>Бүртгэсэн утас</span>
          <b>${esc(info.phone)}${info.phone2 ? " · " + esc(info.phone2) : ""}</b>
        </div>
      </div>

      ${
        transfer
          ? `<div class="warn">
              <b>Гүйлгээний утга дээр яг <u>${esc(info.code)}</u> гэж бичнэ үү.</b><br>
              Утга буруу бичигдвэл шилжүүлгийг захиалгатай тааруулахад хүндрэлтэй.
              Дээрх товчоор хуулбал алдахгүй.
            </div>

            <div class="pay">
              <div class="pay__head">
                <img class="pay__logo" src="assets/bank-tdb.png" alt="">
                <div>
                  <div class="pay__bank">${esc(s.bank || "")}</div>
                  <div class="pay__holder">${esc(s.holder || "")}</div>
                </div>
                <div class="pay__amount">
                  <span>Шилжүүлэх дүн</span>
                  <b>${money(info.total)}</b>
                </div>
              </div>

              <div class="acct">
                <div class="acct__label">Дансны дугаар</div>
                <div class="acct__row">
                  <span class="acct__no">${esc(acct)}</span>
                  <button class="copy copy--sm" data-copy="${esc(acct)}">Хуулах</button>
                </div>
              </div>

              <div class="acct">
                <div class="acct__label">IBAN дугаар <em>(гадаад/зарим банкнаас шилжүүлэхэд)</em></div>
                <div class="acct__row">
                  <span class="acct__no">${esc(iban)}</span>
                  <button class="copy copy--sm" data-copy="${esc(iban)}">Хуулах</button>
                </div>
              </div>
            </div>`
          : `<div class="pay">
              <div class="pay__head">
                <div>
                  <div class="pay__bank">Хүргэлтээр төлнө</div>
                  <div class="pay__holder">Бараагаа хүлээж авахдаа төлнө</div>
                </div>
                <div class="pay__amount">
                  <span>Төлөх дүн</span>
                  <b>${money(info.total)}</b>
                </div>
              </div>
            </div>`
      }

      <div class="helpline">
        <span class="helpline__k">Хүргэлтийн лавлах</span>
        <span class="helpline__v">
          <a href="tel:88104640">8810-4640</a> · <a href="tel:94114495">9411-4495</a>
        </span>
        <span class="helpline__note">Захиалгын кодоо хэлэхэд бид шууд олно.</span>
      </div>

      <a class="buy" href="#/" style="margin-top:1.4rem">
        <span class="buy__label">НҮҮР ХУУДАС РУУ</span>
      </a>
    </div>`;

  bindCopyButtons(document.getElementById("donePage"));
}

/* Copy-to-clipboard with a fallback for browsers that refuse the async API
   outside a secure context. */
function bindCopyButtons(root) {
  root.querySelectorAll("[data-copy]").forEach((btn) => {
    const original = btn.textContent;
    btn.addEventListener("click", async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      btn.textContent = "Хуулагдлаа ✓";
      btn.classList.add("is-done");
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove("is-done");
      }, 2000);
    });
  });
}

/* ========================================================================
   POLICIES
   Meta requires these to be reachable before ads can run. The wording below
   is a working draft — the shop owner should read it through and adjust the
   terms it commits to.
   ===================================================================== */
const POLICIES = {
  delivery: {
    title: "Хүргэлтийн нөхцөл",
    /* Built when the page is drawn, not written into the markup. The prices
       used to be typed here as well as in the sheet, so raising one left this
       page quoting the old figure to the very customer who came to check it. */
    body: () => `
      <h2>Хүргэлтийн төрөл, төлбөр</h2>
      <ul>
        ${
          deliveryOptions().length
            ? deliveryOptions()
                .map(
                  (d) =>
                    `<li><b>${esc(d.name)}</b> — ${money(d.price)}${d.note ? ` (${esc(d.note)})` : ""}</li>`
                )
                .join("")
            : "<li>Захиалгын хуудсан дээр харагдана.</li>"
        }
      </ul>
      <h2>Хугацаа</h2>
      <!-- This used to promise one morning window flatly, while a product
           brought in from abroad said "5-7 хоногт" on its own page. Both were
           true about different things and read as a contradiction. The wait
           belongs to the product; the window belongs to the drive. -->
      <p>Бараа бүрийн ирэх хугацаа өөр өөр тул <b>тухайн барааны хуудсан дээр</b>
      бичсэн хугацааг үзнэ үү — агуулахад байгаа бараа шууд, гадаадаас ирж буй
      бараа заасан хоногийн дараа хүргэгдэнэ.</p>
      <p>Бараа агуулахад ирсний дараа хүргэлт <b>өглөөний 08:00–12:00</b> цагийн
      хооронд явагдана. Хүргэлтийн ажилтан очихоосоо өмнө таны утсанд заавал
      холбогдоно.</p>
      <h2>Орон нутгийн захиалга</h2>
      <p>Орон нутгийн захиалгыг тухайн чиглэлийн унаанд тавьж илгээдэг. Унаанд
      хүлээлгэж өгсний дараа хүргэлтийн ажилтан төлбөр авах боломжгүй тул
      <b>орон нутгийн захиалгын төлбөрийг урьдчилан шилжүүлнэ</b>. Унаа хөдөлсний
      дараа дугаар, цагийг нь утсаар мэдэгдэнэ.</p>
      <h2>Анхаарах</h2>
      <p>Хаяг буруу, эсвэл заасан хугацаанд утсаа авахгүй тохиолдолд хүргэлт хойшлох
      боломжтой. Ийм тохиолдолд дахин хүргэлтийн төлбөр нэмж гарч болно.</p>
      <h2>Лавлах</h2>
      <p>8810-4640 · 9411-4495</p>`,
  },
  refund: {
    title: "Буцаалтын бодлого",
    body: `
      <h2>Буцаах боломжтой тохиолдол</h2>
      <ul>
        <li>Захиалсанаас өөр бараа ирсэн</li>
        <li>Бараа гэмтэлтэй, эвдэрсэн байдалтай ирсэн</li>
        <li>Үйлдвэрийн доголдолтой болох нь тогтоогдсон</li>
      </ul>
      <h2>Хугацаа</h2>
      <p>Бараагаа хүлээн авснаас хойш <b>48 цагийн дотор</b> бидэнтэй холбогдож мэдэгдэнэ үү.
      Энэ хугацаанаас хойш ирсэн хүсэлтийг шийдвэрлэх боломж хязгаарлагдмал.</p>
      <h2>Нөхцөл</h2>
      <ul>
        <li>Бараа хэрэглээгүй, анхны сав баглаа боодолтойгоо байх</li>
        <li>Захиалгын код эсвэл утасны дугаараар баталгаажуулах</li>
      </ul>
      <h2>Буцаан олголт</h2>
      <p>Хүсэлт зөвшөөрөгдсөн тохиолдолд барааг солих, эсвэл төлсөн дүнг таны дансанд
      1–3 ажлын өдрийн дотор буцаана.</p>
      <h2>Буцаалт хийгдэхгүй</h2>
      <p>Хэрэглэсэн, эвдэрсэн, эсвэл хэрэглэгчийн буруугаас гэмтсэн бараанд буцаалт
      хийгдэхгүй.</p>`,
  },
  terms: {
    title: "Үйлчилгээний нөхцөл",
    body: `
      <h2>Ерөнхий</h2>
      <p>Энэхүү сайтаар захиалга өгснөөр та доорх нөхцөлийг хүлээн зөвшөөрч байна.</p>
      <h2>Захиалга</h2>
      <ul>
        <li>Захиалга өгөхөд үнэн зөв нэр, утас, хаяг оруулах шаардлагатай</li>
        <li>Захиалга бүрт давтагдашгүй код олгогдоно</li>
        <li>Бид тантай утсаар холбогдож захиалгыг баталгаажуулна</li>
      </ul>
      <h2>Үнэ</h2>
      <p>Сайт дээрх үнэ Монгол төгрөгөөр илэрхийлэгдэнэ. Үнэ, хямдрал урьдчилан
      мэдэгдэлгүй өөрчлөгдөж болно. Захиалга баталгаажсан үеийн үнэ хүчинтэй.</p>
      <h2>Хариуцлага</h2>
      <p>Бид барааг зөв, бүрэн бүтэн хүргэх үүрэгтэй. Хүргэлтийн дараа хэрэглэгчийн
      буруутай үйлдлээс үүдсэн гэмтэлд хариуцлага хүлээхгүй.</p>`,
  },
  privacy: {
    title: "Нууцлалын бодлого",
    body: `
      <h2>Цуглуулдаг мэдээлэл</h2>
      <p>Захиалга биелүүлэхэд шаардлагатай доорх мэдээллийг л цуглуулна:</p>
      <ul>
        <li>Нэр</li>
        <li>Утасны дугаар</li>
        <li>Хүргүүлэх хаяг</li>
      </ul>
      <h2>Хэрхэн ашигладаг</h2>
      <p>Зөвхөн захиалгыг боловсруулах, хүргэх, тантай холбогдоход ашиглана.
      Бид таны мэдээллийг гуравдагч этгээдэд зардаггүй.</p>
      <h2>Хадгалалт</h2>
      <p>Мэдээлэл Google Sheets дээр хамгаалалттай хадгалагдана. Идэвхтэй захиалгын
      бүртгэл 48 цагийн дараа архивын хэсэгт шилжинэ.</p>
      <h2>Күүки ба хэмжилт</h2>
      <p>Сайт Meta Pixel ашиглан зочилсон хуудас, худалдан авалтын үйлдлийг хэмждэг.
      Энэ нь сурталчилгааны үр дүнг тооцоход зориулагдана.</p>
      <h2>Таны эрх</h2>
      <p>Өөрийн мэдээллийг устгуулах хүсэлтэй бол Ariunbold.agency@gmail.com хаягаар
      хандана уу.</p>`,
  },
  contact: {
    title: "Холбоо барих",
    body: `
      <h2>Утас</h2>
      <p>8810-4640 · 9411-4495</p>
      <h2>Имэйл</h2>
      <p>Ariunbold.agency@gmail.com</p>
      <h2>Ажиллах цаг</h2>
      <p>Даваа–Ням, 09:00–20:00</p>
      <h2>Захиалгын талаар асуух</h2>
      <p>Захиалгын кодоо (жишээ: SS-0001) хэлэхэд бид таны захиалгыг шууд олох
      боломжтой.</p>`,
  },
};

function renderPolicy(key) {
  const p = POLICIES[key] || POLICIES.contact;
  // a page whose figures come from the sheet supplies a function, not a string
  const body = typeof p.body === "function" ? p.body() : p.body;
  document.getElementById("policyPage").innerHTML = `
    <a class="back" href="#/">← Нүүр</a>
    <h1 class="page__title" style="font-size:clamp(1.8rem,9vw,3rem)">${esc(p.title)}</h1>
    <div class="prose">${body}</div>`;
  setHead(p.title, "/");
}

/* ========================================================================
   ROUTER
   ===================================================================== */
const views = {
  home: document.getElementById("viewHome"),
  category: document.getElementById("viewCategory"),
  product: document.getElementById("viewProduct"),
  order: document.getElementById("viewOrder"),
  done: document.getElementById("viewDone"),
  policy: document.getElementById("viewPolicy"),
};

/* A link shared from a reel points straight at one product. When the copy of
   the catalogue the shop opens with does not know that slug yet, the visitor
   used to be thrown to the home page and carried back four seconds later —
   the hero animation, then a wait, then the product. Measured on a wired line;
   a phone in Mongolia waits longer still, and by then they are gone.

   Nobody is moved anywhere now. The product page stays put and says it is
   loading, and `paint` draws it properly the moment the goods are in hand.
   This is only for a view that cannot exist at all — an order with no draft. */
const goHome = () => {
  location.hash = "#/";
};

/* Does the address currently point at something the loaded catalogue cannot
   resolve? Answering yes is what makes the shop reach for a fresher copy. */
const routeUnresolved = () => {
  const [kind, raw] = location.hash.replace(/^#\/?/, "").split("/");
  if (kind !== "p" && kind !== "c") return false;
  let slug = raw;
  try {
    slug = decodeURIComponent(raw || "");
  } catch (ex) {
    /* malformed escape — compare the raw text instead */
  }
  if (!slug) return false;
  return kind === "p" ? !productBy(slug) : !productsIn(slug).length;
};

function show(name) {
  Object.entries(views).forEach(([k, el]) => (el.hidden = k !== name));
  railEl.hidden = name !== "home";
  if (name !== "home") edgeEl.classList.remove("is-shown");
}

function route() {
  const [kind, rawSlug] = location.hash.replace(/^#\/?/, "").split("/");
  /* Slugs are typed into the sheet by hand, so one arrives with spaces or
     Cyrillic sooner or later. The browser stores those percent-encoded, and
     comparing the encoded form against the sheet value matches nothing — the
     visitor gets bounced back to the home page and the product is
     unreachable. Decode before looking anything up. */
  let slug = rawSlug;
  try {
    slug = decodeURIComponent(rawSlug || "");
  } catch (ex) {
    /* a malformed % sequence — fall back to the raw text */
  }
  stopFrames();

  if (kind === "c" && slug) {
    destroyHomeMotion();
    show("category");
    renderCategory(slug);
    startFrames(views.category);
  } else if (kind === "p" && slug) {
    destroyHomeMotion();
    show("product");
    renderProduct(slug);
    startFrames(views.product);
  } else if (kind === "order") {
    destroyHomeMotion();
    show("order");
    renderOrder();
  } else if (kind === "done") {
    destroyHomeMotion();
    show("done");
    renderDone();
  } else if (kind === "policy") {
    destroyHomeMotion();
    show("policy");
    renderPolicy(slug);
  } else {
    show("home");
    setHead("", "/");
    buildHomeMotion();
    setRail("hero");
  }

  window.scrollTo(0, 0);
  ScrollTrigger.refresh();
  if (window.fbq) fbq("track", "PageView");
}

window.addEventListener("hashchange", route);

/* Registered once, not per render: a listener added with every redraw of a
   product page stacks up and keeps the old gallery alive with it. */
document.addEventListener("keydown", (e) => {
  if (!pdpNav || views.product.hidden) return;
  if (e.key === "ArrowLeft") pdpNav(-1);
  else if (e.key === "ArrowRight") pdpNav(1);
});

/* Opened from a chat app, the shop is measured while Safari is still sliding
   its window into place. On an iPhone reached from Viber the page laid itself
   out against a 355px-tall screen and then sat in a 710px one, so the hero
   finished half way down and bare background filled the rest — the measurement
   was never wrong, it was just taken too early and never taken again.

   So it is taken again, after the window has stopped moving and whenever the
   viewport genuinely changes. Refreshing keeps the scroll position, so nobody
   is thrown anywhere; it only re-measures. */
const settle = () => ScrollTrigger.refresh();
addEventListener("load", () => {
  setTimeout(settle, 250);
  setTimeout(settle, 1200);
});
addEventListener("pageshow", (e) => {
  if (e.persisted) setTimeout(settle, 250);
});
addEventListener("orientationchange", () => setTimeout(settle, 300));
if (window.visualViewport) {
  let seen = Math.round(visualViewport.height);
  visualViewport.addEventListener("resize", () => {
    const now = Math.round(visualViewport.height);
    /* A toolbar sliding away moves this by a few dozen pixels and is handled by
       ScrollTrigger already. A jump this large means the window itself changed
       and the whole layout was measured against the wrong one. */
    if (Math.abs(now - seen) > 120) {
      seen = now;
      setTimeout(settle, 120);
    }
  });
}

/* ========================================================================
   BOOT
   ===================================================================== */
document.getElementById("year").textContent = new Date().getFullYear();

/* The Apps Script feed is the slow link in the chain — measured anywhere from
   4 to 24 seconds depending on how cold Google's runtime is. Waiting on it
   would leave the categories blank for that whole time, so the shop paints
   from whatever is already on hand (last visit's copy, or the bundled file)
   and quietly corrects itself once the live feed answers.

   Showing a moment-old price is safe here: the backend recomputes every order
   from the sheet and rejects anything that disagrees, so a stale figure on
   screen can never turn into a wrong charge. */
/* Bumped when a stored copy would paint something the sheet no longer says: a
   browser holding the old key keeps showing the retired picture on every visit
   until the slow feed lands. Raising the key abandons those copies outright. */
const CACHE_KEY = "ss_catalog_v3";
// the abandoned copy would otherwise sit in the browser for good, and another
// dead one would join it every time the key is raised again
try {
  localStorage.removeItem("ss_catalog_v2");
} catch {
  /* private mode — nothing to clear anyway */
}

const readCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
  } catch {
    return null;
  }
};
const writeCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* private mode or quota — the feed still works, just without the head start */
  }
};

function setDB(data) {
  DB = {
    shop: data.shop || {},
    categories: data.categories || [],
    products: (data.products || []).map((p) => ({ ...p, images: listOf(p.images) })),
    bundles: data.bundles || [],
    reviews: data.reviews || [],
    stock: data.stock || {},
  };
}

let booted = false;
/* True once the sheet's own catalogue has landed. Until then "no such product"
   only means the offline copy has not heard of it yet. */
let liveLoaded = false;

function paint(data, { first }) {
  setDB(data);
  renderCategories();
  showCat(0);
  if (first) {
    window.scrollTo(0, 0);
    route();
    booted = true;
  } else {
    /* A page opened against the offline copy shows whatever that copy knew,
       which can be a shelf listing nothing, a page still saying it is loading,
       or a delivery promise the owner changed this morning. The real catalogue
       is here now, so draw it again.

       The product page is only redrawn while the visitor has not touched it
       yet: past that point a redraw would throw away the colour, size or
       quantity they had already picked. The scroll is left where it is. */
    const [kind, slug] = location.hash.replace(/^#\/?/, "").split("/");
    let want = slug;
    try {
      want = decodeURIComponent(slug || "");
    } catch (ex) {
      /* malformed escape — compare the raw text instead */
    }
    /* Restarting the rotation is not a detail. The redraw replaces the very
       elements the running timers were moving, so without this the photos on
       every product reached by a link simply stopped — measured at twenty
       seconds on screen without a single change of picture. */
    if (want && kind === "c" && !views.category.hidden) {
      renderCategory(want);
      startFrames(views.category);
    } else if (want && kind === "p" && !views.product.hidden && !pdpTouched) {
      renderProduct(want);
      startFrames(views.product);
    }
  }
  // fonts and images landing late can shift a pin's measurements
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

/* 1 — something on screen straight away */
const cached = readCache();
if (cached) paint(cached, { first: true });

/* 1b — the offline copy, always. It used to be skipped whenever the browser
   held a stored one, which is exactly the visitor this shop lives on: someone
   who looked a few days ago, saw a reel today and tapped the product. Their
   stored copy predates the item, so the shop knew nothing about it and had
   only the sheet to wait for — measured at four to five seconds, and that is
   on a wired line. This file is rebuilt every twenty minutes, sits on our own
   domain and answers in half a second, so it is asked every time and used
   whenever the address points at something the stored copy cannot resolve. */
fetch(DATA_FALLBACK, { cache: "no-cache" })
  .then((r) => r.json())
  .then((data) => {
    if (liveLoaded) return; // the sheet itself already answered
    if (!booted) return paint(data, { first: true });
    if (routeUnresolved()) paint(data, { first: false });
  })
  .catch(() => {});

/* 2 — the real catalogue. A phone on a weak signal can hold a request open for
   a minute, and until it settles the shop cannot tell a slug that is missing
   from one that is merely late — so it is given a deadline. */
const feedDeadline = () => {
  if (typeof AbortController !== "function") return undefined;
  const c = new AbortController();
  setTimeout(() => c.abort(), 15000);
  return c.signal;
};

fetch(DATA_SOURCE, { signal: feedDeadline() })
  .then((r) => {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  })
  .then((data) => {
    if (!data || !(data.products || []).length) return;
    writeCache(data);
    liveLoaded = true;
    paint(data, { first: !booted });
  })
  .catch((err) => {
    console.warn("Sheet-ийн feed ирсэнгүй, одоо байгаа хувилбараар үргэлжилж байна:", err);
    /* No further catalogue is coming, so what is already loaded is as good as
       it gets: a slug that does not resolve now will never resolve, and saying
       so beats waiting for an answer that will not arrive. */
    liveLoaded = true;
    if (!booted) {
      fetch(DATA_FALLBACK)
        .then((r) => r.json())
        .then((data) => paint(data, { first: true }))
        .catch(() => {
          catsStage.innerHTML =
            '<p style="opacity:.6;font-size:.85rem">Каталог ачаалж чадсангүй.</p>';
        });
    }
  });
