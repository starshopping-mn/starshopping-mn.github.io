gsap.registerPlugin(ScrollTrigger);

/* A phone browser hides and shows its toolbar as you scroll, which changes the
   viewport height and would otherwise count as a resize. Both home sections are
   pinned, so a refresh part-way down re-measures them under the scroll position
   and throws the reader back to the top — worst in the Instagram and Facebook
   in-app browsers, where the chrome moves constantly. This limits refreshes to a
   real orientation change. */
ScrollTrigger.config({ ignoreMobileResize: true });

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
function imageUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (WEBP_ASSETS[s]) return WEBP_ASSETS[s];
  const drive = s.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/);
  if (drive) return `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w1200`;
  return s;
}

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

function buildFrame(images, className = "frame") {
  const urls = images.map(imageUrl).filter(Boolean);
  const el = document.createElement("div");
  el.className = className;
  const track = document.createElement("div");
  track.className = "frame__track";
  (urls.length ? urls : [""]).forEach((u) => {
    const img = document.createElement("img");
    img.src = u;
    img.alt = "";
    img.loading = "lazy";
    track.appendChild(img);
  });
  el.appendChild(track);
  el.dataset.count = String(urls.length || 1);
  return el;
}

function startFrames(root) {
  stopFrames();
  root.querySelectorAll(".frame, .pdp__gallery").forEach((frame, i) => {
    if (frame.dataset.manual === "1") return; // gallery driven by option picks
    const count = Number(frame.dataset.count || 1);
    if (count < 2) return;
    const track = frame.querySelector(".frame__track");
    let idx = 0;
    frameTimers.push(
      setInterval(() => {
        idx = (idx + 1) % count;
        track.style.transform = `translateX(-${idx * 100}%)`;
        frame.dispatchEvent(new CustomEvent("frame:index", { detail: idx }));
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
      <div class="cat__img"><img src="${imageUrl(c.image)}" alt="${esc(c.name)}"></div>`;
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
    // black only at the very end — any earlier and the tail of the pin is
    // spent staring at an empty screen
    .to(".hero__veil", { opacity: 1, duration: 0.14 }, 0.86);

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
  document.getElementById("catMeta").textContent = `${items.length} БАРАА`;

  const plist = document.getElementById("plist");
  plist.innerHTML = "";
  items.forEach((p) => {
    const sizePrices = listOf(p.sizePrices).map(Number).filter((n) => n > 0);
    const pr = priceOf(p, lowestPrice(p));
    const row = document.createElement("a");
    row.className = "prow";
    row.href = `#/p/${encodeURIComponent(p.slug)}`;
    row.appendChild(buildFrame(p.images));

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

  if (window.fbq) fbq("trackCustom", "ViewCategory", { category: cat ? cat.name : slug });
}

/* ========================================================================
   PRODUCT VIEW
   ===================================================================== */
/* Set the moment the visitor picks anything on a product page. Until then the
   page is only what the shop guessed from its offline copy and is safe to draw
   again; afterwards it holds their choices and must be left alone. */
let pdpTouched = false;

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

function renderProduct(slug) {
  const p = productBy(slug);
  /* Before the sheet's own catalogue lands the shop only knows its offline
     copy, so a product missing from it may simply not have arrived yet — go
     home and let `missedRoute` finish the trip. Once the real catalogue is in,
     a slug that still resolves to nothing genuinely resolves to nothing. */
  if (!p) {
    if (liveLoaded) {
      show("product");
      return renderMissing();
    }
    return goHome();
  }
  pdpTouched = false;
  const colors = listOf(p.colors);
  const sizes = listOf(p.sizes);
  const colorImgs = listOf(p.colorImages).map(imageUrl);
  const sizeImgs = listOf(p.sizeImages).map(imageUrl);
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
  const gallery = buildFrame(p.images, "pdp__gallery");
  left.appendChild(gallery);

  const track = gallery.querySelector(".frame__track");
  const galleryCount = Number(gallery.dataset.count || 1);
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
  }

  /* Picking a colour or size jumps the gallery to that variant's photo, so
     the picture always matches what is actually being ordered. The sheet
     supplies those photos in colorImages / sizeImages, in the same order as
     the options themselves. */
  const showVariantImage = (url) => {
    if (!url) return;
    const imgs = Array.from(track.querySelectorAll("img"));
    let idx = imgs.findIndex((im) => im.src === url || im.getAttribute("src") === url);
    if (idx === -1) {
      const extra = document.createElement("img");
      extra.src = url;
      extra.alt = "";
      track.appendChild(extra);
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
    track.style.transform = `translateX(-${idx * 100}%)`;
    if (dots) dots.querySelectorAll(".pdot").forEach((d, n) => d.classList.toggle("is-active", n === idx));
  };

  wrap.appendChild(left);

  /* ---- info + options ---- */
  const right = document.createElement("div");
  right.innerHTML = `
    <h1 class="pdp__name">${esc(p.name)}</h1>
    ${p.desc ? `<p class="pdp__desc">${esc(p.desc)}</p>` : ""}
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
      <div><b>Хүргэлт</b>УБ 6,000₮ · Орон нутаг 6,000₮</div>
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
      image: p.images[0] || "",
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
          <div class="sum__img"><img src="${imageUrl(d.image)}" alt=""></div>
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
        <div class="field">
          <span class="field__label">НЭР</span>
          <input class="input" id="fName" type="text" placeholder="Таны нэр" autocomplete="name">
        </div>
        <div class="grid2">
          <div class="field">
            <span class="field__label">УТАС</span>
            <input class="input" id="fPhone" type="tel" inputmode="numeric" maxlength="8" placeholder="8 оронтой" autocomplete="tel">
          </div>
          <div class="field">
            <span class="field__label">НЭМЭЛТ УТАС</span>
            <input class="input" id="fPhone2" type="tel" inputmode="numeric" maxlength="8" placeholder="8 оронтой">
          </div>
        </div>

        <span class="field__label">ХҮРГҮҮЛЭХ ХАЯГ</span>
        <div class="grid2">
          <div class="field"><input class="input" id="aCity" type="text" placeholder="Хот / Аймаг"></div>
          <div class="field"><input class="input" id="aDist" type="text" placeholder="Дүүрэг / Сум"></div>
          <div class="field"><input class="input" id="aKhoroo" type="text" placeholder="Хороо / Баг"></div>
          <div class="field"><input class="input" id="aBuilding" type="text" placeholder="Байр / Гудамж"></div>
          <div class="field"><input class="input" id="aEntrance" type="text" placeholder="Орц"></div>
          <div class="field"><input class="input" id="aDoor" type="text" placeholder="Тоот"></div>
        </div>
        <div class="field">
          <input class="input" id="aExtra" type="text" placeholder="Нэмэлт заавар (заавал биш)">
        </div>

        <p class="err" id="formErr"></p>

        <a class="buy" href="#" id="submitBtn">
          <span class="buy__total" id="submitTotal"></span>
          <span class="buy__label">ЗАХИАЛГА БАТАЛГААЖУУЛАХ</span>
        </a>
        <p class="note">Илгээснээр таны захиалгын код үүсэж, бид тантай утсаар холбогдоно.</p>
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
  const btn = page.querySelector("#submitBtn");
  const err = page.querySelector("#formErr");
  let sending = false;

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (sending) return;

    const val = (id) => page.querySelector("#" + id).value.trim();
    const name = val("fName");
    const phone = val("fPhone");
    const phone2 = val("fPhone2");

    const parts = [
      ["Хот/Аймаг", val("aCity")],
      ["Дүүрэг/Сум", val("aDist")],
      ["Хороо/Баг", val("aKhoroo")],
      ["Байр/Гудамж", val("aBuilding")],
      ["Орц", val("aEntrance")],
      ["Тоот", val("aDoor")],
    ];

    if (!name) return (err.textContent = "Нэрээ бичнэ үү.");
    if (!/^\d{8}$/.test(phone)) return (err.textContent = "Утасны дугаар 8 оронтой тоо байх ёстой.");
    if (!/^\d{8}$/.test(phone2)) return (err.textContent = "Нэмэлт утасны дугаар 8 оронтой тоо байх ёстой.");
    if (phone === phone2) return (err.textContent = "Нэмэлт утас нь өөр хүний дугаар байх ёстой.");

    const missing = parts.find(([, v]) => !v);
    if (missing) return (err.textContent = `Хаягийн "${missing[0]}" талбарыг бөглөнө үү.`);
    err.textContent = "";

    // The sheet keeps one row per order, so the address pieces are folded into
    // a single readable line for the delivery driver.
    const extra = val("aExtra");
    const addr = parts.map(([k, v]) => `${k}: ${v}`).join(", ") + (extra ? ` (${extra})` : "");

    sending = true;
    btn.querySelector(".buy__label").textContent = "ИЛГЭЭЖ БАЙНА…";

    try {
      // text/plain keeps the browser from firing a CORS preflight that Apps
      // Script cannot answer; doPost reads the raw body either way.
      const res = await fetch(DATA_SOURCE, {
        method: "POST",
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

      if (window.fbq)
        fbq("track", "Purchase", { value: goods + shipPrice, currency: "MNT", content_name: d.name });

      sessionStorage.setItem(
        "ss_done",
        JSON.stringify({ code: out.code, total: goods + shipPrice, payment, name, phone, phone2, leadTime: d.leadTime || "" })
      );
      location.hash = "#/done";
    } catch (ex) {
      console.error(ex);
      err.textContent = "Илгээхэд алдаа гарлаа. Дахин оролдоно уу, эсвэл 8810-4640 руу залгана уу.";
      btn.querySelector(".buy__label").textContent = "ЗАХИАЛГА БАТАЛГААЖУУЛАХ";
      sending = false;
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
    body: `
      <h2>Хүргэлтийн төрөл, төлбөр</h2>
      <ul>
        <li><b>Энгийн хүргэлт</b> — 6,000₮ (Улаанбаатар хот)</li>
        <li><b>Шуурхай хүргэлт</b> — 12,000₮ (Улаанбаатар хот)</li>
        <li><b>Орон нутаг</b> — 6,000₮ (унаагаар илгээнэ)</li>
      </ul>
      <h2>Хугацаа</h2>
      <p>Захиалга баталгаажсаны дараа өглөөний 08:00–12:00 цагийн хооронд хүргэнэ.
      Хүргэлтийн ажилтан очихоосоо өмнө таны утсанд заавал холбогдоно.</p>
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
  document.getElementById("policyPage").innerHTML = `
    <a class="back" href="#/">← Нүүр</a>
    <h1 class="page__title" style="font-size:clamp(1.8rem,9vw,3rem)">${esc(p.title)}</h1>
    <div class="prose">${p.body}</div>`;
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

/* A link shared from a reel points straight at one product, but the catalogue
   the shop opens with is the offline copy, which holds no products at all. The
   slug matched nothing, the visitor was thrown to the home page, and the real
   catalogue arriving a second later never sent them back — so the item they
   tapped through for was simply unreachable. Remember where they were headed
   and finish the trip once the goods are actually in hand. */
let missedRoute = null;

const goHome = () => {
  const [kind, slug] = location.hash.replace(/^#\/?/, "").split("/");
  if ((kind === "p" || kind === "c") && slug) {
    missedRoute = location.hash;
    /* The rescue normally rides in with the sheet's catalogue, but that answer
       has been measured at five seconds and can fail outright. Nobody who
       tapped a product link should sit on the hero that long with no idea what
       happened, so give the sheet a few seconds and then act on what is already
       known — which lands them on the product or on a page that explains. */
    clearTimeout(rescueTimer);
    rescueTimer = setTimeout(() => {
      if (!missedRoute || location.hash !== "#/") return;
      liveLoaded = true;
      const wanted = missedRoute;
      missedRoute = null;
      location.hash = wanted;
    }, 4000);
  }
  location.hash = "#/";
};
let rescueTimer = null;

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
    buildHomeMotion();
    setRail("hero");
  }

  window.scrollTo(0, 0);
  ScrollTrigger.refresh();
  if (window.fbq) fbq("track", "PageView");
}

window.addEventListener("hashchange", route);

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
  } else if (!views.category.hidden || (!views.product.hidden && !pdpTouched)) {
    /* A page opened against the offline copy shows whatever that copy knew,
       which can be a shelf listing nothing or a delivery promise the owner
       changed this morning. The real catalogue is here now, so draw it again.

       The product page is only redrawn while the visitor has not touched it
       yet: past that point a redraw would throw away the colour, size or
       quantity they had already picked. The scroll is left where it is. */
    const [, slug] = location.hash.replace(/^#\/?/, "").split("/");
    let want = slug;
    try {
      want = decodeURIComponent(slug || "");
    } catch (ex) {
      /* malformed escape — compare the raw text instead */
    }
    if (want) {
      if (!views.category.hidden) renderCategory(want);
      else if (productBy(want)) renderProduct(want);
    }
  } else if (missedRoute && location.hash === "#/") {
    /* Only when they are still sitting on the home page we put them on: once
       they have gone anywhere themselves, moving them would be a hijack. */
    const wanted = missedRoute;
    missedRoute = null;
    const [, slug] = wanted.replace(/^#\/?/, "").split("/");
    let want = slug;
    try {
      want = decodeURIComponent(slug || "");
    } catch (ex) {
      /* malformed escape — compare the raw text instead */
    }
    /* Sent back to where they were headed either way. If it resolves they get
       the product; if it does not they get told so and handed the catalogue,
       which beats being left on the hero wondering what they tapped. */
    if (want) location.hash = wanted;
  }
  // fonts and images landing late can shift a pin's measurements
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

/* 1 — something on screen straight away */
const cached = readCache();
if (cached) {
  paint(cached, { first: true });
} else {
  fetch(DATA_FALLBACK)
    .then((r) => r.json())
    .then((data) => {
      if (!booted) paint(data, { first: true });
    })
    .catch(() => {});
}

/* 2 — the real catalogue, however long it takes */
fetch(DATA_SOURCE)
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
