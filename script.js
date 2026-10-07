/* No motion library. The dive into the lens is driven by a small script in
   index.html, beside the door itself (window.ssDoor), with nothing to download
   first — a first visit used to scroll an ordinary long page while GSAP was
   still on its way, and the page then rebuilt itself under the visitor's
   thumb. This file only asks the driver to measure again when the front door
   is shown, and listens to it to know when the categories are in. */
const refreshMotion = () => {
  if (window.ssDoor) ssDoor.refresh();
};

/* A reload normally restores the previous scroll position. The front door
   would then open half-way into the dive — the camera blown up and the type
   gone — before the visitor has touched anything. Opting out of scroll
   restoration makes every load begin from a known state. */
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

/* An ad link ends in ?ref=<creative id>, and that id is the only thing tying an
   order back to the advert that earned it. It is read once, on arrival, and
   kept: someone who looks today and orders next week still belongs to the same
   advert, and so does their second order, so nothing here ever clears it. A
   later visit through a different advert overwrites it. Storage can be refused
   outright in a private window, which must not stop the shop from loading. */
try {
  const ref = new URLSearchParams(location.search).get("ref");
  if (ref) localStorage.setItem("ss_ref", ref.trim().slice(0, 80));
} catch (e) { /* unattributed is better than broken */ }
const creativeId = () => {
  try { return localStorage.getItem("ss_ref") || ""; } catch (e) { return ""; }
};

/* ========================================================================
   DATA
   The products — name, price, photos, stock — come from the owner's Supabase,
   the very database the order intake prices from, so what a customer is shown
   and what they are charged can no longer drift apart. A product is registered
   once, in the n8n form "13 · Бараа бүртгэх", and is on the shelf here on the
   next load; nothing is copied into the sheet any more.

   `web_products` is a read-only function opened to the anon key. That key is
   public by design — it sits in every visitor's browser — and can read nothing
   but this. The service_role key never comes near this file, and orders,
   customers, costs and ad spend are not readable from here at all.

   The sheet (Apps Script feed) keeps what it still owns: bank details, delivery
   options, categories, bundles, reviews. Until Supabase carries colours, sizes
   and lead times, those ride along from the sheet row of the same slug
   (`fromSupabase`). The bundled JSON stays as the offline copy of both: if
   either backend is slow or mid-update, the shop still renders.
   ===================================================================== */
const SUPABASE_URL = "https://tdnjnqftxschbliumwwm.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbmpucWZ0eHNjaGJsaXVtd3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNzExNTgsImV4cCI6MjEwNDk0NzE1OH0.lND_YBbjyCNT-yIa27OZ3V-1_fn76i9JUYrOfrXbC1w";
const CATALOG_SOURCE = `${SUPABASE_URL}/rest/v1/rpc/web_products`;
const DATA_SOURCE =
  "https://script.google.com/macros/s/AKfycbzZK-I4L3Cow5KAlLbW0pud0766XduXHzuTys9FIEwXWDTQL36VPywm7bNsk3E6NMqORQ/exec";
const DATA_FALLBACK = "data/catalog.json";
/* Block BE (2026-10-01). The advert that brings people here is a video; the page
   met them with three still photos, and of 189 who arrived from it only 7 pressed
   «Захиалах». The same video now leads the gallery, muted, looping, sound on a
   tap. One file per slug, compressed to ~1.4MB (720×1280, h264), so it costs
   less than one of the old Drive photos. Keyed by slug, not by catalogue field,
   so nothing in the database has to change to add or drop one. */
const PRODUCT_VIDEOS = {
  "Gar-halaagch": { src: "/assets/video/gar-halaagch-r2-720.mp4", poster: "/assets/video/gar-halaagch-r2-poster.jpg" },
};
/* Districts and khoroos for the address picker, spelled exactly as the courier
   (Гялс хүргэлт) spells them. Their system files a parcel by these very
   strings — "Хан уул 4-р хороо", not "Хан-Уул, 4" — so they are never typed or
   assembled here: they are picked from the list the database hands out
   (`web_districts`) and sent on untouched as `district_full`. A value the list
   does not hold does not lose the order; the intake marks it for review.

   The database is asked first and given two seconds; a copy on our own domain
   (`data/districts.json`) covers a slow answer, so the form does not fall back
   to a typed address merely because a request was late. Fetched once a product
   page is open — someone there may order — and never on the front door. */
const DISTRICT_SOURCE = `${SUPABASE_URL}/rest/v1/rpc/web_districts`;
const DISTRICT_FALLBACK = "data/districts.json";
const COUNTRYSIDE = "Орон нутаг"; // the courier's own name for everything outside the city
let addressData = null;
let addressLoad = null;
const shapeDistricts = (groups) => {
  if (!Array.isArray(groups)) return null;
  const clean = groups
    .map((g) => ({
      district: String((g && g.district) || "").trim(),
      khoroos: ((g && g.khoroos) || []).filter((k) => k && k.full && k.khoroo),
    }))
    .filter((g) => g.district && g.khoroos.length);
  const ub = clean.filter((g) => g.district !== COUNTRYSIDE);
  const mn = (clean.find((g) => g.district === COUNTRYSIDE) || {}).khoroos || [];
  return ub.length ? { ub, mn } : null;
};
/* Read-only functions are asked with a plain GET and the public key in the
   address (`?apikey=`), which Supabase accepts. A POST with the key in a
   header is a "non-simple" request, and the browser first sends an OPTIONS
   preflight and waits for its answer before the real one may go — one full
   round trip, measured at 150–300ms per call from here and more from a phone
   in Mongolia, on every cold visit. A GET with no custom headers needs none.
   The writing calls (orders, checkout log) keep their POST. */
const rpcGet = (fn) => `${SUPABASE_URL}/rest/v1/rpc/${fn}?apikey=${encodeURIComponent(SUPABASE_ANON)}`;
/* Requests index.html started from its <head>, before this file arrived. */
const early = (name) => (window.__ss && window.__ss[name]) || null;
const loadAddressData = () => {
  if (!addressLoad) {
    const live = fetch(rpcGet("web_districts"))
      .then((r) => (r.ok ? r.json() : null))
      .then(shapeDistricts)
      .catch(() => null);
    const copy = (early("districts") || fetch(DISTRICT_FALLBACK))
      .then((r) => (r.ok ? r.json() : null))
      .then(shapeDistricts)
      .catch(() => null);
    const patience = new Promise((r) => setTimeout(() => r(null), 2000));
    addressLoad = Promise.race([live, patience])
      .then((d) => d || copy)
      .then((d) => d || live)
      .then((d) => (addressData = d));
  }
  return addressLoad;
};
/* Orders no longer go to the sheet. They are handed to the owner's intake,
   which prices them, checks stock and catches duplicates on its side; the shop
   sends who and what, shows the answer, and works nothing out itself. */
const ORDER_INTAKE = "https://starshopping.app.n8n.cloud/webhook/order-intake";

/* Checkout telemetry (2026-09-24). In three days 231 visitors pressed
   «Захиалах» and none sent a phone number — and nothing said where they
   stopped. Each step of the order form now leaves one anonymous line
   (a random id per page load, never the number itself), so the board can name
   the step that leaks. Fire-and-forget: a failed log never touches the order.
   Complements tell(): that one reports refusals to the pixel, this one the
   whole funnel to Supabase (checkout_events → checkout_funnel on the board). */
const CHECKOUT_LOG = `${SUPABASE_URL}/rest/v1/rpc/log_checkout`;
const CK_SID = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const CK_UA = navigator.userAgent || "";
const CK_APP = /Messenger|Orca-Android/i.test(CK_UA) ? "msgr" : /FBAN|FBAV|FB_IAB|FBIOS|FB4A/i.test(CK_UA) ? "fb" : /Instagram/i.test(CK_UA) ? "ig" : "none";
const CK_DEV = /iPhone|iPad|iPod/i.test(CK_UA) ? "ios" : /Android/i.test(CK_UA) ? "android" : "desktop";
/* Where the visitor came from (block BC, 2026-10-01). On 2026-10-01 half the
   week's orders carried no advert code and nothing said why: the chatbot's
   product link had no mark on it, so everyone who talked first and ordered on
   the web looked like a stranger. Now every arrival is classed once, kept the
   same way the ad code is (a person who looks today and orders next week keeps
   the source), and sent with each form step and with the order itself:
     ad     — the address carried ?ref=<creative>
     chat   — the bot's link (?src=chat; the creative rides along as ref if the
              conversation knew it)
     msgr   — Messenger's own browser, no mark (an old bot link, a shared link)
     fb/ig  — came from facebook/instagram without a mark (page button, post)
     web    — some other site sent them · direct — nothing known at all
   `entry` keeps the referrer host and the NAMES of the address parameters (never
   their values) for diagnosis. The /p/<slug>/ hop forwards its own referrer as
   ?from=, because a same-origin redirect would otherwise erase it. */
try {
  const q = new URLSearchParams(location.search);
  const explicit = (q.get("src") || "").trim().toLowerCase().replace(/[^a-z]/g, "").slice(0, 12);
  let host = "";
  try { host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : ""; } catch (e) { /* opaque referrer */ }
  if (host === location.hostname) host = "";
  const origin = host || (q.get("from") || "").replace(/[^a-z0-9.-]/gi, "").slice(0, 60);
  const src = explicit ? explicit
    : q.get("ref") ? "ad"
    : CK_APP === "msgr" ? "msgr"
    : /facebook|fb\.com|fbcdn|messenger/i.test(origin) ? "fb"
    : /instagram/i.test(origin) ? "ig"
    : origin ? "web" : "";
  if (src) localStorage.setItem("ss_src", src);
  const keys = Array.from(new Set(Array.from(q.keys()).filter((k) => k !== "from"))).join(",");
  const entry = [origin, keys ? "?" + keys : ""].filter(Boolean).join(" ").slice(0, 120);
  if (entry) localStorage.setItem("ss_entry", entry);
} catch (e) { /* unattributed is better than broken */ }
const entrySrc = () => { try { return localStorage.getItem("ss_src") || "direct"; } catch (e) { return "direct"; } };
const entryRaw = () => { try { return localStorage.getItem("ss_entry") || ""; } catch (e) { return ""; } };
const ckSeen = new Set();
let ckSlug = null;
let ckDone = false;
function ck(step, detail) {
  if (step !== "invalid" && step !== "error" && ckSeen.has(step)) return;
  ckSeen.add(step);
  let cr = null;
  try { cr = creativeId(); } catch (e) { /* no ad in the address */ }
  try {
    fetch(CHECKOUT_LOG, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
      body: JSON.stringify({ p: { sid: CK_SID, slug: ckSlug, step, detail: detail ? String(detail).slice(0, 200) : null,
                                  in_app: CK_APP, device: CK_DEV, creative: cr,
                                  src: entrySrc(), entry: entryRaw() } }),
    }).catch(() => {});
  } catch (e) { /* telemetry must never break the shop */ }
}
const ckLeave = () => { if (ckSeen.has("open") && !ckDone && !ckSeen.has("leave")) ck("leave", location.hash); };
window.addEventListener("pagehide", ckLeave);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") ckLeave(); });

/* Who to ring about what. The courier changed in September 2026: deliveries are
   carried by Гялс хүргэлт, and "where is my parcel" is theirs to answer. What
   was ordered, changing or cancelling it, is the shop's own order line. The
   header pop-up in index.html names the same two numbers — change both. */
const COURIER = { name: "Гялс хүргэлт", tel: "94944855", text: "9494-4855" };
const ORDER_LINE = { tel: "95505717", text: "9550-5717" };
/* Numbers whose orders are the owner testing the shop, never a customer. */
const OWNER_TEST_PHONES = ["95505717"];

/* The second half of the two-step order (W8, 2026-09-23). The first step goes
   to the intake with a phone and nothing else; the address, if the visitor
   gives it, is attached to that order afterwards by the database's own
   `set_order_address` — callable with the public key, and it only ever touches
   an order that has not been handed to the courier yet. */
const SET_ADDRESS = `${SUPABASE_URL}/rest/v1/rpc/set_order_address`;

/* Ordering by chat. In Mongolia people order by talking far more than by
   filling in forms: 159 opened the form in 62 hours and none sent it. The ref
   rides along so the bot knows which advert brought them — the same value the
   web order carries as creative_id. */
const MESSENGER_PAGE = "1300692469783051";
/* On a phone `m.me` hands straight to the Messenger app, where the visitor is
   already signed in. On a desktop it redirects to messenger.com, which keeps a
   session of its own: measured on 2026-09-23, someone signed in to facebook.com
   was still shown messenger.com/login.php and asked to sign in again — a login
   wall on the one button that costs nothing to press. facebook.com/messages/t/
   opens the same conversation inside the session the desktop visitor already
   has. It carries no `ref`, so a desktop chat arrives unattributed; a chat that
   opens beats a chat that is refused. */
const onPhone = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
/* The chat opens with a first message already typed: the product's name, so
   the bot answers about the right thing, and the advert code in brackets.
   An m.me `ref` alone arrives from Meta as a separate referral event with no
   text, which bridge 29 skips (it only forwards messages that carry text), so
   the code also rides in the text, where 29 reads it back out as the referral. */
const messengerLink = (productName) => {
  const ref = creativeId();
  const intro = productName ? `Сайн байна уу! «${productName}» сонирхож байна.` : "Сайн байна уу!";
  const text = intro + (ref ? ` [${ref}]` : "");
  if (!onPhone()) return `https://www.facebook.com/messages/t/${MESSENGER_PAGE}`;
  const qs = [ref ? `ref=${encodeURIComponent(ref)}` : "", `text=${encodeURIComponent(text)}`].filter(Boolean).join("&");
  return `https://m.me/${MESSENGER_PAGE}?${qs}`;
};
const chatButton = (productName) =>
  `<a class="chatbuy" href="${esc(messengerLink(productName))}" target="_blank" rel="noopener" data-chat>💬 Чатаар захиалах</a>`;
/* One listener for every chat button, wherever it is drawn. `Contact` is the
   standard event for it, so the ad report can count chat starts next to orders. */
document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("a[data-chat]");
  if (a && window.fbq) fbq("track", "Contact", { content_name: "messenger" });
});

/* Meta's Pixel does not accept MNT: measured on 2026-09-23 against the live
   fbevents.js, a Purchase with currency "MNT" logs "Parameter 'currency' is
   invalid" and one with "USD" logs nothing. So every value is sent in dollars
   at a fixed rate (Mongolbank ~3,599₮ on 2026-09-23), and the tugrik figure
   rides beside it as value_mnt. Change the rate here only; all three events
   read it. */
const MNT_PER_USD = 3600;
const pixelValue = (mnt) => ({
  value: Math.round(((Number(mnt) || 0) / MNT_PER_USD) * 100) / 100,
  currency: "USD",
  value_mnt: Number(mnt) || 0,
});

let DB = { shop: {}, categories: [], products: [], bundles: [], reviews: [], stock: {} };

/* Units left for a SKU, or null when no limit is configured. A product with
   no stock row stays orderable on purpose: losing sales because inventory was
   never filled in is worse than the sheet simply not knowing. The backend
   re-checks every order anyway, so nothing here can oversell. */
/* The most of one product a single order may carry: what is left on the shelf,
   and what the intake accepts per order (`max_per_order`, from the database).
   The intake enforces both; stopping the stepper here only spares the visitor
   a refusal after they have typed their address. */
function orderCeiling(slug, fallback) {
  const left = availableOf(slug);
  const p = productBy(slug);
  const cap = p && Number(p.maxPerOrder) > 0 ? Number(p.maxPerOrder) : Infinity;
  const most = Math.min(left === null ? Infinity : Math.max(1, left), cap);
  return Number.isFinite(most) ? most : fallback;
}

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
/* A product that is not in the warehouse yet is sold as what it is: an order
   placed ahead, delivered in about `ships_in_days`. The shop once showed
   "26 left" for goods that had not been bought — a number nobody could keep.
   For these the database's own figure replaces whatever the sheet said about
   timing, and no count is shown at all. "test" is handled the same way. */
const isPreorder = (p) => !!p && (p.fulfillment === "preorder" || p.fulfillment === "test");
/* A product on TRIAL (W9, 2026-09-25) is not bought yet. Before the order no
   delivery time is promised at all — not a fast one that would be untrue, and
   not the long wait that kept people from leaving a number. The wait is told
   plainly the moment the phone number is in, and nothing is ever paid for it.
   Only goods counted into the warehouse ("live" with stock) promise 24 hours. */
const isTest = (p) => !!p && p.fulfillment === "test";
/* Блок BJ: хүлээлтийг барааны хуудсан дээр хэлэхгүй (эзэн 10/01) — хуудас зөвхөн нэр, утас асууна.
   Хугацааг 2-р алхамд (хаяг) тухайн барааны үнэнээр хэлнэ. */
const showsWait = () => false;
const FAST_LINE = "Улаанбаатар дотор 24 цагт хүргэнэ";
/* Блок BJ (2026-10-01, эзэн). Зочинд хэлэх зүйл нь тухайн бараа БОДИТ юу вэ, мөн хэр хол явсан бэ гэдгээс хамаарна:
   · 1-р алхам (нэр, утас): хугацааны тухай юу ч үгүй — зөвхөн «Хүргэлт үнэгүй»;
   · 2-р алхам (хаяг): ТЭР барааны үнэн —
       test      бараа худалдан аваагүй: хугацаа, мөнгө амлахгүй; захиалагдсан/цуцлагдсан үед SMS;
       preorder  бараа авсан, замд яваа: «7–14 хоногт», ирэхэд SMS;
       live      хуучнаараа;
   · Захиалгыг албан ёсны болгодог нь хаяг: хаяггүй бол зөвхөн бүртгэгдсэн утас. */
const NEXT_STEP_WHEN = "Дараагийн алхамд";
const NEXT_STEP_NOTE = "Одоо юу ч төлөхгүй. Дараагийн алхамд хаягаа оруулж захиалгаа баталгаажуулна.";
const WAITLIST_TITLE = "Эхний ээлжийн жагсаалтад бүртгэгдлээ";
/* A test product has no stock and no promised date: the owner's rule is that
   a test never names a delivery time (consumer law 12.8), so the wait is never
   given in days here, whatever ships_in_days holds. */
const TEST_BANNER = "Бараа одоогоор нөөцөд ирээгүй — эхний ээлжийн жагсаалт хүлээн авч байна. Одоо юу ч төлөхгүй.";
const TEST_WHEN_TITLE = "Бараа захиалагдсаны дараа";
const TEST_WHEN_NOTE =
  "Хангалттай захиалга цугларвал бид бараагаа захиална — тэр үед танд SMS-ээр мэдэгдэнэ. Захиалагдахгүй бол мөн SMS-ээр мэдэгдэж, уучлалт гуйна. Хаягаа оруулснаар таны бүртгэл албан ёсны болно.";
const waitlistText = () =>
  "Бараа одоогоор нөөцөд ирээгүй. Хангалттай захиалга цугларвал бид бараагаа захиална — тэр үед танд SMS-ээр мэдэгдэнэ; захиалагдахгүй бол мөн SMS-ээр уучлалт гуйж мэдэгдэнэ. Одоо юу ч төлөхгүй.";
/* preorder: бараа худалдан авсан, замд яваа. Хугацаа = «7–14 хоног» (ships_in_days = дээд хязгаар, анхдагч 14).
   Агуулахын үлдэгдэл (stock_public) дуусаж, амлагдсан нь давсан бол тоо биш «дараагийн ачаанд» гэж хэлнэ. */
const PRE_NOTE =
  `Та одоо захиалгаа өгвөл бараа ирэхэд бид танд SMS-ээр мэдэгдэнэ. Төлбөрөө бараагаа авахдаа төлнө. Хүлээхгүй бол ${ORDER_LINE.text} руу бичвэл цуцална — урьдчилгаа байхгүй.`;
const waitWindow = (p) => {
  const n = Number(p && p.shipsInDays) || 14;
  return `${Math.max(7, n - 7)}–${n} хоногт`;
};
const waitLate = (p) => {
  const st = STOCK_PUBLIC[p && p.slug];
  return !!(st && st.mode === "preorder" && Number(st.available) <= 0);
};
/* S1 (2026-10-05): the stock is counted per colour + size, so a size that is
   already spoken for says so before the order, not after. A free count of 0 or
   less means every piece on the way is taken; the order is still accepted and
   joins the list for the next shipment, with no date promised. */
const skuAvail = (slug, color, size) => {
  const st = STOCK_PUBLIC[slug];
  if (!st || (st.mode !== "preorder" && st.mode !== "live") || !Array.isArray(st.skus)) return null; /* S4 (10/07): live горимд ч размер тус бүр */
  const eq = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
  const hit = st.skus.find((k) => (!k.color || eq(k.color, color)) && (!k.size || eq(k.size, size)));
  return hit && Number.isFinite(Number(hit.available)) ? Number(hit.available) : null;
};
const skuWaitSentence = (slug, color, size) => {
  const a = skuAvail(slug, color, size);
  if (a === null || a > 0) return "";
  const label = [color, size].filter(Boolean).join(" · ");
  return `${label ? `«${label}» ` : ""}одоогийн ачаанд дууссан. Захиалбал дараагийн ачааны жагсаалтад орно — бараа ирэх хугацааг бид залгаж мэдэгдэнэ. Хүлээхгүй бол өөр хувилбар сонгоорой.`;
};
const waitSentence = (p) =>
  (p && skuWaitSentence(p.slug, p.color, p.size)) ||
  (waitLate(p)
    ? `Нөөц дууссан тул таны захиалга дараагийн ачаанд багтана${STOCK_PUBLIC[p.slug].eta ? ` (~${mmdd(STOCK_PUBLIC[p.slug].eta)})` : ""}.`
    : `Нөөц захиалга ${waitWindow(p)} ирнэ.`);
const step2Banner = (d) =>
  d.test
    ? TEST_BANNER
    : d.preorder
    ? waitSentence(d)
    : skuWaitSentence(d.slug, d.color, d.size) || d.leadTime || DEFAULT_LEAD_TIME;
const step2WhenTitle = (d) =>
  d.test
    ? TEST_WHEN_TITLE
    : d.preorder
    ? skuWaitSentence(d.slug, d.color, d.size)
      ? "Дараагийн ачааны жагсаалт"
      : waitLate(d)
      ? "Дараагийн ачаанд"
      : waitWindow(d)
    : skuWaitSentence(d.slug, d.color, d.size)
    ? "Дараагийн ачааны жагсаалт"
    : d.leadTime || DEFAULT_LEAD_TIME;
const step2WhenNote = (d) =>
  d.test ? TEST_WHEN_NOTE : d.preorder || skuWaitSentence(d.slug, d.color, d.size) ? PRE_NOTE : d.leadNote || DEFAULT_LEAD_NOTE;
/* Block BF (2026-10-01): the wait is read from the stock position, not from a
   fixed number of days. stock_public() gives, per slug, the pieces still free
   (warehouse + in transit − complete orders) and the next arrival date. */
let STOCK_PUBLIC = {};
const mmdd = (iso) => (iso ? String(iso).slice(5, 10).replace("-", "/") : "");
const preorderLabel = (p) => {
  const st = p && STOCK_PUBLIC[p.slug];
  if (st && st.mode === "preorder") {
    // the free count is per product, sizes differ — so a date is only named when the whole lot is late
    if (Number(st.available) <= 0) return `Урьдчилсан захиалга · дараагийн ачаанд багтана${st.eta ? ` (~${mmdd(st.eta)})` : ""}`;
  }
  return `Урьдчилсан захиалга${p && p.shipsInDays ? ` · ~${p.shipsInDays} хоногт хүргэнэ` : ""}`;
};
function applyStockLine() {
  const el = document.querySelector(".preline");
  const m = location.hash.match(/^#\/p\/([^/?#]+)/);
  const p = m ? productBy(decodeURIComponent(m[1])) : null;
  paintSkuWait();
  if (!el || !p) return;
  el.textContent = preorderLabel(p);
}
/* The size picker's own warning, under the chips (S1). */
function paintSkuWait() {
  const el = document.getElementById("skuWait");
  if (!el) return;
  const m = location.hash.match(/^#\/p\/([^/?#]+)/);
  const p = m ? productBy(decodeURIComponent(m[1])) : null;
  const act = (k) => {
    const c = document.querySelector(`.opt__row[data-opt="${k}"] .chip.is-active`);
    return c ? c.textContent.trim() : "";
  };
  const msg = p && !isTest(p) ? skuWaitSentence(p.slug, act("color"), act("size")) : "";
  el.textContent = msg;
  el.hidden = !msg;
}
const PREORDER_NOTE =
  "Бараа Хятадаас ирмэгц бид залгаж баталгаажуулаад хүргэнэ. Төлбөрийг хүлээн авахдаа төлнө.";
/* Said right under the wait, where the wait is read (W8.4): the wait is the
   reason someone hesitates, and knowing they can still back out by phone, with
   nothing paid, is what lets them leave a number anyway. */
const PREORDER_CANCEL =
  "Хүлээх хугацаа таалагдахгүй бол дуудлагаар цуцалж болно — урьдчилгаа байхгүй.";
const leadTimeOf = (p) =>
  isPreorder(p) ? NEXT_STEP_WHEN : String((p && p.leadTime) || "").trim() || DEFAULT_LEAD_TIME;
const leadNoteOf = (p) =>
  isPreorder(p) ? NEXT_STEP_NOTE : String((p && p.leadNote) || "").trim() || DEFAULT_LEAD_NOTE;

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

/* Who pays the courier, per product (`delivery_paid_by` from the database).
   "customer" — the only case today, and the default when the database says
   nothing: the fee comes on top of the price, and the visitor is told so beside
   the price, on the form and on the confirmation — before they order, not at
   the door. "included": the price already covers the cheapest delivery, and a
   dearer option costs only the difference. */
const deliveryIncluded = (p) => !!p && p.deliveryPaidBy === "included";
const deliveryLine = (p) =>
  deliveryIncluded(p)
    ? "Хүргэлт үнэгүй · Монгол даяар"
    : `+ Хүргэлтийн төлбөр ${deliverySummary()} · хүргэлтээр төлнө`;

/* Every page of the shop reported itself as plain "Starshopping". Six tabs
   open and none of them says which product; a link pasted into a chat that
   the crawler cards do not cover carries the same blank name; the back button
   offers an undifferentiated list. The card pages under /p/ hold the markup a
   crawler reads — this is what a person sees. */
const SITE_NAME = "Starshopping";
const SITE_ORIGIN = "https://starshopping.mn";
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
  const item = productBy(slug);
  if (isTest(item)) return "";
  if (isPreorder(item)) return `<span class="tag tag--soft">Урьдчилсан захиалга</span>`;
  const left = availableOf(slug);
  if (left === null) return "";
  if (left === 0) return `<span class="tag tag--out">Дууссан</span>`;
  if (left <= 5) return `<span class="tag tag--soft">Үлдсэн ${left}ш</span>`;
  return `<span class="tag tag--soft">24 цагт хүргэнэ</span>`;
}

/* Assets shipped with the site that also exist as WebP. The sheet stores the
   .png path, so swapping here keeps those cells untouched while cutting the
   download by ~90%. Only files that genuinely have a .webp are listed — a
   blind rewrite would break any image that does not. */
const WEBP_ASSETS = {
  "assets/product-clock.png": "assets/product-clock.webp",
  "assets/product-turntable.png": "assets/product-turntable.webp",
  "assets/cat-huuhdiin-heregsel.png": "assets/cat-huuhdiin-heregsel.webp",
  "assets/cat-huwtsas.png": "assets/cat-huwtsas.webp",
};

/* A category's picture is its product cut out of its backdrop, so it can sit
   on the shop's own ground with a shadow of its own. The owner pastes a plain
   photo into the sheet; the cutout made from it ships with the site and is
   named here by the category's slug, so the sheet cell can stay as it is.
   A category not listed falls back to whatever the sheet gives. */
const CATEGORY_ART = {
  huwtsas: "assets/cat-huwtsas.png",
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
  /* A Supabase product carries the sale price itself and, when it is on offer,
     the price it was — no percentage to round, the two figures are the truth. */
  const cmp = Number(p.compareAt);
  if (p.compareAt && cmp > list) {
    return { on: true, pct: Math.round((1 - list / cmp) * 100), was: cmp, now: list };
  }
  const d = Number(p.discount);
  const on = p.discount !== null && p.discount !== "" && !Number.isNaN(d) && d > 0;
  return {
    on,
    pct: d,
    was: list,
    now: on ? Math.round((list * (1 - d / 100)) / 100) * 100 : list,
  };
}

/* Block AV: the database's SKU for a colour + size pick. Matching is by the
   visible label, case-insensitive; a product without variants gives "". The
   intake resolves a missing id itself (one-SKU products) or flags the order. */
function skuFor(p, color, size) {
  const list = p && Array.isArray(p.variants) ? p.variants : [];
  if (!list.length) return "";
  const eq = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
  const hit = list.find((v) => (!v.color || eq(v.color, color)) && (!v.size || eq(v.size, size)));
  return hit ? hit.sku_id : "";
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
  "huuhdiin-oroo": "Huuhdiin-hashiwch", // the creatives carry this name; the product does not
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
  const imgs = track.children; // slides in order — a video first when there is one, then the photos
  [idx, idx + 1, idx - 1].forEach((n) => {
    const img = imgs[n];
    if (img && img.dataset.src) {
      img.src = img.dataset.src;
      delete img.dataset.src;
    }
  });
}

function buildFrame(images, className = "frame", size = 1200, alt = "", video = null) {
  const urls = images.map((u) => photoSrc(u, size)).filter((u) => u.src);
  const el = document.createElement("div");
  el.className = className;
  const track = document.createElement("div");
  track.className = "frame__track";
  if (video && video.src) {
    /* Muted and inline so phones start it on their own; the poster is the
       first frame, so nothing flashes while it loads. People who asked their
       system for less motion get the poster and a play control instead. */
    const still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const v = document.createElement("video");
    v.src = video.src;
    if (video.poster) v.poster = video.poster;
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("muted", "");
    v.preload = still ? "none" : "auto";
    if (still) v.controls = true;
    else v.autoplay = true;
    v.setAttribute("aria-label", alt ? alt + " — видео" : "видео");
    track.appendChild(v);
    el.dataset.video = "1";
  }
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
  el.dataset.count = String((urls.length || 1) + (el.dataset.video === "1" ? 1 : 0));
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
  const vid = frame.dataset.video === "1" ? track.querySelector("video") : null;
  if (vid) {
    if (n === 0) vid.play().catch(() => {});
    else vid.pause();
  }
  frame.dispatchEvent(new CustomEvent("frame:index", { detail: n }));
}

function startFrames(root) {
  stopFrames();
  root.querySelectorAll(".frame, .pdp__gallery").forEach((frame, i) => {
    if (frame.dataset.manual === "1") return; // handed over to the visitor
    if (frame.dataset.video === "1") return; // a video leads: it plays, the visitor swipes
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

/* The category artwork is drawn into the home view whenever the catalogue
   lands, home or not — and a hidden <img> with a `src` is fetched all the
   same: measured at 115KB of category pictures downloaded on a product link
   that never shows them. While the home view is hidden the address waits in
   `data-src`; entering home wakes them (`wakeHome`). */
function wakeHome() {
  catsStage.querySelectorAll("img[data-src]").forEach((img) => {
    img.src = img.dataset.src;
    delete img.dataset.src;
  });
}

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
      <div class="cat__img"><img ${views.home.hidden ? "data-src" : "src"}="${photoSrc(c.image).src}" data-fallback="${esc(photoSrc(c.image).fallback)}" alt="${esc(c.name)}"></div>`;
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
/* The camera photograph lives in a <template> until the front door needs it
   (index.html explains why), so on a product link there is no image here yet.
   `ensureHero` stamps it out the first time home is shown; until then this is
   null and nothing below may touch it. */
let camImg = document.querySelector(".hero__cam img");
function ensureHero() {
  if (camImg) return;
  const tpl = document.getElementById("heroPic");
  if (tpl) tpl.parentNode.insertBefore(tpl.content.cloneNode(true), tpl);
  camImg = document.querySelector(".hero__cam img");
}
let doorHooked = false; // the driver's "categories are in" signal is wired once

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
    if (!camImg) return; // the front door has not been built yet
    const vh = window.visualViewport ? window.visualViewport.height : innerHeight;
    const h = heroEl.getBoundingClientRect();
    const c = camImg.getBoundingClientRect();
    const pin = window.ssDoor ? { progress: ssDoor.progress } : null;
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

/* The front door is shown: make sure the camera is in the page, let the
   driver measure it, and follow its word on whether the categories are in
   (the side rail and the category rotation hang on that). Without the driver
   — no sticky, reduced motion — the sections simply stack and there is
   nothing to drive. */
function buildHomeMotion() {
  ensureHero();
  if (!window.ssDoor) return;
  if (!doorHooked) {
    doorHooked = true;
    ssDoor.onInside((inside) => {
      setRail(inside ? "cats" : "hero");
      if (inside) startCycle();
      else stopCycle();
    });
  }
  ssDoor.refresh();
  setRail(ssDoor.inside ? "cats" : "hero");
  if (ssDoor.inside) startCycle();
}

/* Leaving the front door. The driver notices the hidden stage by itself and
   draws nothing until the door is shown again; only the rotation is ours. */
function destroyHomeMotion() {
  stopCycle();
}

const railEl = document.getElementById("rail");
const edgeEl = document.getElementById("edge");
const railLines = Array.from(document.querySelectorAll(".rail__line"));

function setRail(id) {
  railLines.forEach((l) => l.classList.toggle("is-active", l.dataset.goto === id));
  edgeEl.classList.add("is-shown");
}

railLines.forEach((line) =>
  line.addEventListener("click", () => {
    const door = document.getElementById("door");
    /* on the door the two sections share one place on screen; "cats" means
       the end of the track, where the categories have fully come out */
    if (door && door.classList.contains("door--motion")) {
      const top = door.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: line.dataset.goto === "cats" ? top + door.offsetHeight - innerHeight : top, behavior: "smooth" });
      return;
    }
    document.getElementById(line.dataset.goto)?.scrollIntoView({ behavior: "smooth" });
  })
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
      <p class="missing__help">Тодруулах бол: <a href="tel:95505717">9550-5717</a></p>
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

let stickyWatch = null; // the observer behind the product page's bottom bar
let viewReported = ""; // the product whose ViewContent has gone out for this visit

function renderProduct(slug) {
  loadAddressData();
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
  /* Once the real catalogue has spoken, a product it gave no id for cannot be
     ordered here — the intake would refuse it. Before that, a missing id only
     means the database has not answered yet, and nothing is closed. */
  const noId = cannotOrder(p);
  // remembered on the page so a later paint can tell the button has to change
  views.product.dataset.noid = noId ? "1" : "";
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
  const gallery = buildFrame(p.images, "pdp__gallery", 1200, p.name, PRODUCT_VIDEOS[p.slug] || null);
  /* Slide 0 is the video when there is one, so every index into the photos
     below is shifted by this much. */
  const vOff = gallery.dataset.video === "1" ? 1 : 0;
  if (vOff) {
    gallery.classList.add("pdp__gallery--video");
    const vid = gallery.querySelector("video");
    const snd = document.createElement("button");
    snd.type = "button";
    snd.className = "gsound";
    snd.setAttribute("aria-label", "Дуу асаах");
    snd.textContent = "🔇";
    snd.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      vid.muted = !vid.muted;
      snd.textContent = vid.muted ? "🔇" : "🔊";
      snd.setAttribute("aria-label", vid.muted ? "Дуу асаах" : "Дуу хаах");
      if (!vid.muted) vid.play().catch(() => {});
    });
    gallery.appendChild(snd);
    /* iOS inside the Facebook app sometimes ignores autoplay until a layout
       pass has happened; one nudge after paint covers it. */
    requestAnimationFrame(() => vid.play().catch(() => {}));
  }
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
      gallery.dataset.count = String(idx + 1 + vOff);
      if (dots) {
        const d = document.createElement("span");
        d.className = "pdot";
        dots.appendChild(d);
      }
    }
    gallery.dataset.manual = "1"; // stop the auto-rotation fighting the pick
    stopFrames();
    showFrame(gallery, idx + vOff);
  };

  wrap.appendChild(left);

  /* ---- info + options ---- */
  const right = document.createElement("div");
  right.innerHTML = `
    <h1 class="pdp__name">${esc(p.name)}</h1>
    ${descBlock(p.desc)}
    <div class="pdp__prices" id="pdpPrices"></div>
    <p class="shipline${deliveryIncluded(p) ? " shipline--in" : ""}">${esc(deliveryLine(p))}</p>
    ${showsWait(p) ? `<p class="preline">${esc(preorderLabel(p))}</p><p class="precancel">${esc(PREORDER_CANCEL)}</p>` : ""}
    ${!isPreorder(p) && stockLeft !== null && stockLeft > 0 ? `<p class="fastline">${esc(FAST_LINE)}</p>` : ""}
    ${!isPreorder(p) && stockLeft !== null && stockLeft > 0 && stockLeft <= 5 ? `<p class="stockline">Үлдсэн ${stockLeft} ширхэг</p>` : ""}

    ${colors.length ? `<div class="opt"><span class="opt__label">ӨНГӨ</span>
      <div class="opt__row" data-opt="color">
        ${colors.map((c, i) => `<button class="chip${i === 0 ? " is-active" : ""}" data-i="${i}">${esc(c)}</button>`).join("")}
      </div></div>` : ""}

    ${sizes.length ? `<div class="opt"><span class="opt__label">ХЭМЖЭЭ</span>
      <div class="opt__row" data-opt="size">
        ${sizes.map((s, i) => `<button class="chip${i === 0 ? " is-active" : ""}" data-i="${i}">${esc(s)}</button>`).join("")}
      </div></div>` : ""}
    <p class="skuwait" id="skuWait" hidden></p>

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
        : noId
        ? `<div class="buy buy--out" aria-disabled="true">
             <span class="buy__label">УТСААР ЗАХИАЛНА</span>
           </div>
           <a class="callbuy" href="tel:95505717">Залгаж захиалах · 9550-5717</a>
           ${chatButton(p.name)}
           <p class="note">Энэ барааг одоогоор онлайнаар захиалах боломжгүй.<br>9550-5717 руу залгавал шууд бүртгэнэ.</p>`
        : `<!-- STEP ONE ON THE PRODUCT PAGE (2026-09-29, owner's design). Measured
                the day before: ~90 visitors reached this page from the advert and
                6 pressed «Захиалах»; of those who went on, several left after the
                phone step believing the order was done. The number and name are now
                asked here, beside the price, and the button says there is a second
                step, so neither the extra page nor a false «done» stands between
                the advert and the address. -->
           <div class="qform" id="qform">
             <div class="qform__step">ЗАХИАЛГА · АЛХАМ 1/2</div>
             <label class="field__label" for="qPhone">УТАСНЫ ДУГААР</label>
             <input class="input input--big" id="qPhone" type="tel" inputmode="numeric" maxlength="14" placeholder="8 оронтой" autocomplete="tel">
             <label class="field__label qform__gap" for="qName">НЭР <span class="field__opt">(заавал биш)</span></label>
             <input class="input" id="qName" type="text" placeholder="Таныг юу гэж дуудах вэ" autocomplete="name">
             <p class="qform__ship">${esc(deliveryIncluded(p) ? "🚚 Хүргэлт үнэгүй · Монгол даяар" : "🚚 Хүргэлт " + deliverySummary())}</p>
             <p class="err" id="qErr"></p>
           </div>
           <a class="buy" href="#" id="buyBtn">
             <span class="buy__total" id="buyTotal"></span>
             <span class="buy__label">ЗАХИАЛАХ →</span>
           </a>
           <p class="qform__next">Дараагийн алхамд хүргэлтийн хаягаа оруулна</p>
           <!-- The people this shop sells to are used to ordering by talking to
                someone. The number is the one already in the header; here it
                is a way to order, not a complaint line. -->
           <a class="callbuy" href="tel:95505717">Залгаж захиалах · 9550-5717</a>
           ${chatButton(p.name)}
           <p class="assure">Хүргэлтээр төлнө · урьдчилгаа шаардахгүй · 9550-5717</p>`
    }

    <div class="trust">
      <div><b>Хүргэлт</b>${deliveryIncluded(p) ? "Үнэгүй · Монгол даяар" : deliverySummary() + " · тусдаа төлнө"}</div>
      <div><b>${isPreorder(p) ? "Хаяг" : "Хугацаа"}</b>${esc(leadTime)}</div>
      <div><b>Төлбөр</b>${isPreorder(p) ? "Бараа ирэхэд, хүргэлтээр" : "Хүргэлтээр эсвэл шилжүүлгээр"}</div>
      <div><b>Захиалгын код</b>Бүртгэл, хяналттай</div>
    </div>
    <!-- full width rather than inside the grid above: the explanation runs long
         and would leave one cell towering over the other three -->
    <p class="leadnote">${esc(leadNote)}</p>
    <button class="share" type="button" data-slug="${esc(p.slug)}">Холбоос хуулах</button>`;
  wrap.appendChild(right);
  pdp.appendChild(wrap);

  views.product.addEventListener("pointerdown", () => (pdpTouched = true), { once: true });
  // typing in the order fields (keyboard, autofill) counts as touching the page too
  views.product.addEventListener("focusin", () => (pdpTouched = true), { once: true });

  /* The button sat 1.8 screens down a phone, under the gallery, the description
     and the options, and the price went out of sight with it. This bar keeps
     both under the thumb for as long as the real button is off screen, and
     steps aside the moment it is not — two of the same button in view at once
     reads as a mistake. It belongs to the view, so it goes when the view does,
     and it is rebuilt with the page so it never outlives the product it names. */
  views.product.querySelectorAll(".stickybuy").forEach((n) => n.remove());
  if (stickyWatch) stickyWatch.disconnect();
  stickyWatch = null;
  const realBuy = right.querySelector("#buyBtn");
  let stickyPrice = null;
  if (realBuy) {
    const bar = document.createElement("div");
    bar.className = "stickybuy";
    bar.hidden = true;
    bar.innerHTML = `
      <span class="stickybuy__sum">
        <span class="stickybuy__price"></span>
        ${showsWait(p) ? `<span class="stickybuy__ship stickybuy__ship--pre">${esc(
          "Урьдчилсан" + (p.shipsInDays ? ` · ~${p.shipsInDays} хоногт` : "")
        )}</span>` : ""}
        <span class="stickybuy__ship">${esc(
          deliveryIncluded(p) ? "хүргэлт үнэгүй" : "+ хүргэлт " + deliverySummary()
        )}</span>
      </span>
      <a class="stickybuy__go" href="#">ЗАХИАЛАХ</a>`;
    stickyPrice = bar.querySelector(".stickybuy__price");
    bar.querySelector(".stickybuy__go").addEventListener("click", (e) => {
      e.preventDefault();
      const qp = right.querySelector("#qPhone");
      if (qp && qp.value.replace(/\D/g, "").length < 8) {
        qp.scrollIntoView({ block: "center", behavior: "smooth" });
        qp.focus({ preventScroll: true });
        return;
      }
      realBuy.click(); // one path to the order form, whichever button was pressed
    });
    views.product.appendChild(bar);
    if ("IntersectionObserver" in window) {
      stickyWatch = new IntersectionObserver(([entry]) => {
        bar.hidden = entry.isIntersecting;
      });
      stickyWatch.observe(realBuy);
    }
    /* without the observer the bar would cover the button it stands in for,
       so it simply stays away */
  }

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
    if (stickyPrice) stickyPrice.textContent = money(orderTotal());
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
  paintSkuWait();

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
      paintSkuWait();
    })
  );

  right.querySelectorAll(".qty__btn").forEach((b) =>
    b.addEventListener("click", () => {
      const ceiling = orderCeiling(p.slug, Infinity);
      qty = Math.min(ceiling, Math.max(1, qty + Number(b.dataset.step)));
      if (qtyVal) qtyVal.textContent = String(qty);
      refreshTotalLine();
    })
  );

  /* The number field on the product page takes digits only, as the one on the
     order page does, and its first touch is the funnel's phone_focus. */
  const qPhone = right.querySelector("#qPhone");
  const qErr = right.querySelector("#qErr");
  if (qPhone) {
    qPhone.addEventListener("focus", () => { ckSlug = p.slug; ck("phone_focus"); });
    qPhone.addEventListener("input", () => {
      /* room for a country code or a leading 0 while it is being typed;
         readQuickPhone() sets both aside before the number is checked */
      const raw = qPhone.value.replace(/[^0-9]/g, "");
      const room = raw.startsWith("976") ? 11 : raw.startsWith("0") ? 9 : 8;
      const digits = raw.slice(0, room);
      if (qPhone.value !== digits) qPhone.value = digits;
      qPhone.classList.remove("is-invalid");
      if (qErr) qErr.textContent = "";
      if (readQuickPhone().length === 8) { ckSlug = p.slug; ck("phone_typed"); }
    });
    qPhone.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); right.querySelector("#buyBtn")?.click(); } });
  }
  const readQuickPhone = () => {
    let ph = qPhone ? qPhone.value.replace(/\D/g, "") : "";
    if (ph.length === 11 && ph.startsWith("976")) ph = ph.slice(3);
    if (ph.length === 9 && ph.startsWith("0")) ph = ph.slice(1);
    return ph;
  };

  right.querySelector("#buyBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    /* «open» = pressed «Захиалах», counted before the number is checked, so the
       funnel still shows how many wanted to order and how many then gave a number */
    ckSlug = p.slug;
    ck("open");
    const quickPhone = readQuickPhone();
    if (qPhone && !/^\d{8}$/.test(quickPhone)) {
      ckSlug = p.slug;
      ck("invalid", "inline:" + quickPhone.length);
      qPhone.classList.add("is-invalid");
      if (qErr) qErr.textContent = quickPhone.length ? "Утасны дугаар 8 оронтой тоо байх ёстой." : "Утасны дугаараа оруулна уу — захиалгын мэдээллийг SMS-ээр илгээнэ.";
      qPhone.scrollIntoView({ block: "center", behavior: "smooth" });
      qPhone.focus({ preventScroll: true });
      return;
    }
    setDraft({
      /* typed on the product page: the order page sends step one by itself */
      phone: quickPhone || "",
      custName: right.querySelector("#qName") ? right.querySelector("#qName").value.trim().replace(/\s+/g, " ").slice(0, 80) : "",
      auto: !!quickPhone,
      slug: p.slug,
      /* what the order intake knows the product by: the Supabase UUID. Every
         source the shop paints from carries it now — the database itself and
         the offline copy built from it. The slug is never sent in its place:
         the intake dropped its slug bridge on 2026-09-18 and would refuse it. */
      productId: p.product_id || "",
      name: p.name,
      /* Whatever is on screen — the colour they picked, the angle they
         stopped on. It used to be the sheet's first photo no matter what,
         which on this shop is often the supplier's advert. */
      image: rawImages[Number(gallery.dataset.index || 0) - vOff] || p.images[0] || "",
      unit: pack ? Math.round(pack.price / pack.qty) : pr.now,
      qty,
      goods: orderTotal(),
      pack: pack ? pack.label || `${pack.qty} ширхэгийн багц` : "",
      color,
      size,
      /* the SKU those two picks add up to — the intake books stock by it */
      skuId: skuFor(p, color, size),
      leadTime,
      leadNote,
      preorder: isPreorder(p),
      test: isTest(p),
      shipsInDays: p.shipsInDays || null,
    });
    if (window.fbq)
      fbq("track", "InitiateCheckout", {
        content_ids: [p.slug],
        content_type: "product",
        content_name: p.name,
        num_items: qty,
        ...pixelValue(orderTotal()),
      });
    ckSlug = p.slug;
    ck("open");
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

  /* Once per visit to the product, not once per drawing of it. The page is
     drawn again when the catalogue lands a second later, and each drawing used
     to report another view — measured in Meta's Test Events on 2026-09-21: two
     ViewContent two seconds apart for one visitor. That inflates the top of
     the funnel and makes every step below it look worse than it is. `route()`
     clears the mark, so coming back to the product counts again. */
  if (window.fbq && viewReported !== p.slug) {
    viewReported = p.slug;
    fbq("track", "ViewContent", {
      content_ids: [p.slug],
      content_name: p.name,
      content_type: "product",
      ...pixelValue(pr.now),
    });
  }
}

/* ========================================================================
   ORDER
   The pick made on the product page has to survive the hop to the form (and
   a refresh), so it is parked in sessionStorage rather than a bare variable.
   ===================================================================== */
const DRAFT_KEY = "ss_draft";
/* the order made in step one, so a refresh returns to the address step */
const STEP2_KEY = "ss_step2";
const setDraft = (d) => sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
const getDraft = () => {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
  } catch {
    return null;
  }
};

async function renderOrder() {
  const d = getDraft();
  if (!d) return goHome();
  setHead("Захиалга", "/");
  /* The picker needs its lists. They are usually here already; if not, the
     form waits a moment for them and otherwise falls back to a written
     address — this page must never hang on a request. */
  if (!addressData) {
    await Promise.race([loadAddressData(), new Promise((r) => setTimeout(r, 2500))]);
    if (!/^#\/order(\/|$)/.test(location.hash)) return; // they left meanwhile
  }
  const A = addressData;
  /* The address they gave last time, on this phone. Someone ordering again
     next month finds it filled in and only checks it — the part of the form
     that costs the most taps is the part that changes the least. */
  let savedAddr = {};
  try { savedAddr = JSON.parse(localStorage.getItem("ss_addr") || "{}") || {}; } catch (e) { /* private window */ }

  const shipRaw = (DB.shop.delivery || []).length
    ? DB.shop.delivery
    : [
        { name: "Энгийн хүргэлт", price: 6000, note: "Улаанбаатар хот" },
        { name: "Шуурхай хүргэлт", price: 12000, note: "Улаанбаатар хот" },
        { name: "Орон нутаг", price: 6000, note: "Унаагаар илгээнэ · урьдчилж төлнө", prepaid: true },
      ];
  const shipIncluded = deliveryIncluded(productBy(d.slug));
  const shipBase = shipIncluded ? Math.min(...shipRaw.map((x) => Number(x.price) || 0)) : 0;
  const ship = shipRaw.map((x) => ({
    ...x,
    price: Math.max(0, (Number(x.price) || 0) - shipBase),
    priceMax: x.priceMax ? Math.max(0, Number(x.priceMax) - shipBase) : x.priceMax,
  }));

  const page = document.getElementById("orderPage");
  /* How many may be asked for: a pack is a fixed count, and a stocked product
     stops at what is on the shelf. */
  const qtyCeiling = orderCeiling(d.slug, 99);
  /* An order already taken in step one, for this product, in this tab: a
     refresh lands back on the address step instead of offering to order again. */
  let placed = null;
  try {
    const s = JSON.parse(sessionStorage.getItem(STEP2_KEY) || "null");
    if (s && s.slug === d.slug && s.orderId) placed = s;
  } catch (e) { /* no memory of it — step one again, and the intake catches a repeat */ }

  /* TWO STEPS (W8, 2026-09-23). Measured over 62 hours: 159 people opened
     this form, none sent it — six boxes at once, an address first of all, asked
     of someone who had only half decided. Now step one asks for a phone number
     and nothing else, and that alone is an order: the operator rings every
     order anyway and can take the address by voice. Step two, the address,
     comes after the order exists and can be skipped. */
  page.innerHTML = `
    <a class="back" href="#/p/${esc(encodeURIComponent(d.slug))}">← Бараа руу буцах</a>

    <!-- Step one: a real form, so Enter sends it and the phone keyboard offers
         "next". novalidate — the browser's own warnings come in the wrong
         language and say less than ours. -->
    <form id="orderForm" class="step1" novalidate${placed ? " hidden" : ""}>
      <div class="qform__step" style="margin-top:.4rem">АЛХАМ 1/2</div>
      <h1 class="page__title" style="font-size:clamp(1.8rem,9vw,3rem)">Захиалга</h1>
      <div class="sum" style="margin-top:1.4rem">
        <div class="sum__img"><img src="${photoSrc(d.image, 400).src}" data-fallback="${esc(photoSrc(d.image, 400).fallback)}" alt="${esc(d.name)}" decoding="async"></div>
        <div>
          <div class="sum__name">${esc(d.name)}</div>
          <div class="sum__meta">
            ${d.color ? esc(d.color) + " · " : ""}${d.size ? esc(d.size) + " · " : ""}<span id="sumQty">${d.qty}</span> ширхэг
            ${d.pack ? `<span class="sum__pack">${esc(d.pack)}</span>` : ""}
          </div>
        </div>
      </div>

      <div class="field">
        <label class="field__label" for="fPhone">УТАСНЫ ДУГААР</label>
        <input class="input input--big" id="fPhone" name="tel" type="tel" inputmode="numeric" maxlength="8" pattern="[0-9]{8}" placeholder="8 оронтой" autocomplete="tel" required>
      </div>
      <div class="field">
        <label class="field__label" for="fName">НЭР <span class="field__opt">(заавал биш)</span></label>
        <input class="input" id="fName" name="name" type="text" placeholder="Таныг юу гэж дуудах вэ" autocomplete="name">
      </div>
      ${
        d.pack
          ? ""
          : `<div class="field">
               <span class="field__label">ТОО ШИРХЭГ</span>
               <div class="qty">
                 <button class="qty__btn" type="button" data-step="-1" aria-label="Хасах">−</button>
                 <span class="qty__val" id="oQty">${d.qty}</span>
                 <button class="qty__btn" type="button" data-step="1" aria-label="Нэмэх">+</button>
               </div>
             </div>`
      }
      <div class="totals">
        <div class="totals__row totals__row--big"><span>Бараа (<span id="tQty">${d.qty}</span>ш)</span><span id="tGoods"></span></div>
        <div class="totals__row"><span>Хүргэлт</span><span>${shipIncluded ? "үнэгүй" : esc(deliverySummary()) + " · тусдаа"}</span></div>
      </div>

      <p class="err" id="formErr"></p>

      <button class="buy" type="submit" id="submitBtn">
        <span class="buy__total">Дараа нь хаягаа оруулна</span>
        <span class="buy__label">ҮРГЭЛЖЛҮҮЛЭХ →</span>
      </button>
      <p class="note">${esc(NEXT_STEP_NOTE)}</p>
      ${chatButton(d.name)}
    </form>

    <!-- Step two: the order exists by now. The address makes delivery faster,
         and that is all it is asked for — skipping it costs nothing. -->
    <form id="addrForm" novalidate${placed ? "" : " hidden"}>
      <!-- Step two used to open under a large ✓ and «Захиалга бүртгэгдлээ»,
           and people left there, believing they had finished (owner, 2026-09-29).
           It now reads as the second of two steps; the ✓ comes on the done page. -->
      <div class="step2__head">
        <div class="qform__step">АЛХАМ 2/2 · ХҮРГЭЛТИЙН ХАЯГ</div>
        <h1 class="step2__title">Хаягаа оруулаад захиалгаа батална уу</h1>
        <p class="step2__lead">Утасны дугаар тань бүртгэгдсэн. Хаягаа оруулснаар захиалга албан ёсоор бүртгэгдэнэ.</p>
        <p class="step2__when"><b>${esc(shipIncluded ? "🚚 Хүргэлт үнэгүй" : "🚚 Хүргэлт")}</b> · ${esc(step2Banner(d))}</p>
      </div>
    <div class="order-grid" style="margin-top:1.2rem">
      <div>
        <!-- Chosen, not typed. A typed address went from the customer to the
             operator to the courier, and a misspelt district or a khoroo
             remembered wrong came back as a phone call to sort out. District
             and khoroo, or aimag and sum, are picked from lists; only the part
             a list cannot hold — building, entrance, door — is written. -->
        <div class="field" id="addrField">
          <span class="field__label">ХҮРГҮҮЛЭХ ХАЯГ</span>
          ${
            A
              ? `<div class="seg" id="addrKind" role="radiogroup" aria-label="Хаягийн төрөл">
                   <button type="button" class="seg__btn" data-kind="ub" role="radio">Улаанбаатар</button>
                   <button type="button" class="seg__btn" data-kind="mn" role="radio"${A.mn.length ? "" : " hidden"}>Орон нутаг</button>
                 </div>
                 <div class="grid2" id="addrUb">
                   <div class="field"><label class="sr-only" for="aDist">Дүүрэг</label>
                     <select class="input" id="aDist" autocomplete="address-level2">
                       <option value="">Дүүрэг</option>
                       ${A.ub.map((x) => `<option value="${esc(x.district)}">${esc(x.district)}</option>`).join("")}
                     </select></div>
                   <div class="field"><label class="sr-only" for="aKhoroo">Хороо</label>
                     <select class="input" id="aKhoroo" disabled><option value="">Хороо</option></select></div>
                 </div>
                 ${(() => {
                   /* The courier files the outlying districts with the countryside.
                      Someone in Nalaikh looks for it under the city first, so say
                      where it is rather than let them think they cannot order. */
                   const far = A.mn.map((x) => x.khoroo).filter((n) => /^(Налайх|Багануур|Багахангай)$/.test(n));
                   return far.length
                     ? `<p class="field__hint" id="addrUbHint">${esc(far.join(", "))} — «Орон нутаг» дотор бий.</p>`
                     : "";
                 })()}
                 <div id="addrMn" hidden>
                   <div class="field"><label class="sr-only" for="aAimag">Аймаг, хот</label>
                     <select class="input" id="aAimag" autocomplete="address-level1">
                       <option value="">Аймаг, хот</option>
                       ${A.mn.map((x) => `<option value="${esc(x.full)}">${esc(x.khoroo)}</option>`).join("")}
                     </select></div>
                 </div>
                 <!-- Three written lines, the way a courier reads a city address:
                      the building or street, then the way in — entrance,
                      floor, door, or the gate number in a ger district — then
                      anything that saves a phone call. -->
                 <div class="field"><label class="field__label field__label--sub" for="aLine1">ХОРООЛОЛ, БАЙР / ГУДАМЖ</label>
                   <input class="input" id="aLine1" autocomplete="address-line1"></div>
                 <div class="field"><label class="field__label field__label--sub" for="aLine2">ОРЦ, ДАВХАР, ТООТ / ХАШААНЫ ДУГААР</label>
                   <input class="input" id="aLine2" autocomplete="address-line2"></div>
                 <div class="field" style="margin-bottom:0"><label class="field__label field__label--sub" for="aNote">ТАЙЛБАР <span class="field__opt">(заавал биш)</span></label>
                   <input class="input" id="aNote" placeholder="Хаалганы код, ойролцоох газар, хэзээ гэртээ байх" autocomplete="off"></div>`
              : `<textarea class="input" id="fAddr" name="address" rows="2" placeholder="Дүүрэг, хороо, байр, тоот — эсвэл аймаг, сум" autocomplete="street-address" required></textarea>`
          }
        </div>
      </div>

      <div>
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
            <b>${esc(step2WhenTitle(d))}</b>
            <span>${esc(step2WhenNote(d))}</span>
          </div>
        </div>

        <div class="field"${d.test || d.preorder ? " hidden" : ""}>
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
          <div class="totals__row"><span>Бараа (<span id="t2Qty">${d.qty}</span>ш)</span><span id="t2Goods"></span></div>
          <div class="totals__row"><span>Хүргэлт <small>(${shipIncluded ? "үнэд багтсан" : "тусдаа төлнө"})</small></span><span id="tShip"></span></div>
          <div class="totals__row totals__row--big"><span>Нийт</span><span id="tAll"></span></div>
        </div>

        <p class="err" id="addrErr"></p>

        <button class="buy" type="submit" id="addrBtn">
          <span class="buy__total" id="submitTotal"></span>
          <span class="buy__label">ЗАХИАЛГА БАТЛАХ</span>
        </button>
        <a class="skip" href="#/done" id="addrSkip">Хаягаа дараа оруулна (хаяггүй бол захиалга баталгаажихгүй)</a>
      </div>
    </div>
    </form>`;

  /* ---- live totals ---- */
  let shipPrice = Number(ship[0].price) || 0;
  let shipName = ship[0].name;
  let payment = "Хүргэлтээр төлөх";

  /* What the screen shows is the shop's own arithmetic and only ever a
     preview: the backend prices the order itself. */
  let qty = Math.max(1, Number(d.qty) || 1);
  if (placed && placed.qty) qty = Number(placed.qty) || qty;
  // a bundle carries its own fixed total, so trust it over unit × qty
  const goodsNow = () => (placed && placed.goods ? Number(placed.goods) : d.pack ? Number(d.goods) || d.unit * qty : d.unit * qty);
  const $ = (id) => page.querySelector("#" + id);

  const refresh = () => {
    const goods = goodsNow();
    $("tGoods").textContent = money(goods);
    $("t2Goods").textContent = money(goods);
    $("t2Qty").textContent = String(qty);
    $("tShip").textContent = money(shipPrice);
    $("tAll").textContent = money(goods + shipPrice);
    $("submitTotal").textContent = `Нийт ${money(goods + shipPrice)}`;
  };
  refresh();

  page.querySelectorAll(".qty__btn").forEach((b) =>
    b.addEventListener("click", () => {
      qty = Math.min(qtyCeiling, Math.max(1, qty + Number(b.dataset.step)));
      $("oQty").textContent = String(qty);
      $("sumQty").textContent = String(qty);
      $("tQty").textContent = String(qty);
      setDraft(Object.assign({}, getDraft() || d, { qty, goods: d.unit * qty })); // survives a refresh
      refresh();
    })
  );

  const payItems = Array.from(page.querySelectorAll("#payPick .pick__item"));
  const payLock = $("payLock");
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
    // a product on trial is never paid for ahead — there is nothing to send yet
    if (d.test || d.preorder) prepaid = false;
    cashItem.classList.toggle("is-locked", prepaid);
    payLock.hidden = !prepaid;
    if (prepaid) selectPayment(transferItem);
  };

  const shipItems = Array.from(page.querySelectorAll("#shipPick .pick__item"));
  const pickShip = (item) => {
    shipItems.forEach((n) => n.classList.toggle("is-active", n === item));
    shipPrice = Number(item.dataset.price) || 0;
    shipName = item.dataset.name;
    applyPrepaid(item.dataset.prepaid === "1");
    refresh();
  };
  $("shipPick").addEventListener("click", (e) => {
    const item = e.target.closest(".pick__item");
    if (!item || item.classList.contains("is-locked")) return;
    pickShip(item);
  });

  $("payPick").addEventListener("click", (e) => {
    const item = e.target.closest(".pick__item");
    if (!item || item.classList.contains("is-locked")) return;
    selectPayment(item);
  });

  applyPrepaid(Boolean(ship[0] && ship[0].prepaid));

  /* ---- address picker ---- */
  /* A countryside parcel goes by intercity vehicle and a city one by courier,
     so the address kind decides the delivery options: the ones that cannot
     apply are locked rather than left for the customer to pick wrongly. */
  const isLocalShip = (n) => n.dataset.prepaid === "1" || /орон нутаг/i.test(n.dataset.name || "");
  const syncShip = (kind) => {
    shipItems.forEach((n) => n.classList.toggle("is-locked", kind === "mn" ? !isLocalShip(n) : isLocalShip(n)));
    const active = shipItems.find((n) => n.classList.contains("is-active"));
    if (active && active.classList.contains("is-locked")) {
      const next = shipItems.find((n) => !n.classList.contains("is-locked"));
      if (next) pickShip(next);
    }
  };
  let addrKind = "ub";
  if (A && $("addrKind")) {
    const kindBtns = Array.from(page.querySelectorAll("#addrKind .seg__btn"));
    const ubBox = $("addrUb");
    const mnBox = $("addrMn");
    const aDist = $("aDist");
    const aKhoroo = $("aKhoroo");
    const aAimag = $("aAimag");
    const aLine1 = $("aLine1");
    const aLine2 = $("aLine2");
    const aNote = $("aNote");

    /* the option's value is the courier's full string; what is shown is the short one */
    const fillKhoroo = (keep) => {
      const g = A.ub.find((x) => x.district === aDist.value);
      const list = g ? g.khoroos : [];
      aKhoroo.innerHTML =
        '<option value="">Хороо</option>' +
        list.map((k) => `<option value="${esc(k.full)}">${esc(k.khoroo)}</option>`).join("");
      aKhoroo.disabled = !list.length;
      if (keep && list.some((k) => k.full === keep)) aKhoroo.value = keep;
    };
    /* An address remembered from before the courier changed names the district
       our old way ("Хан-Уул", khoroo "4"). Read it across where it plainly
       matches; otherwise the visitor simply picks again. */
    const squash = (t) => String(t || "").toLowerCase().replace(/[\s-]+/g, "");
    const oldDistrict = (name) => (A.ub.find((x) => squash(x.district) === squash(name)) || {}).district || "";
    const setKind = (k) => {
      addrKind = k === "mn" ? "mn" : "ub";
      kindBtns.forEach((b) => {
        const on = b.dataset.kind === addrKind;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-checked", on ? "true" : "false");
      });
      ubBox.hidden = addrKind !== "ub";
      const ubHint = $("addrUbHint");
      if (ubHint) ubHint.hidden = addrKind !== "ub";
      mnBox.hidden = addrKind !== "mn";
      /* the examples change with the place: a khoroolol and a block in the
         city, a bag and a street in the countryside */
      if (addrKind === "ub") {
        aLine1.placeholder = "Жишээ: 3-р хороолол, 45 байр · эсвэл Дэнжийн 1000, 12-р гудамж";
        aLine2.placeholder = "Жишээ: 2 орц, 5 давхар, 501 тоот · хашаа бол 12-34";
      } else {
        aLine1.placeholder = "Жишээ: Баянхонгор сум, 7-р баг, Нарны гудамж";
        aLine2.placeholder = "Жишээ: хашааны дугаар 12-34 · эсвэл 2 орц, 15 тоот";
      }
      syncShip(addrKind);
    };
    /* kept on the device: survives a refresh now and is waiting next time */
    const saveAddr = () => {
      const addr = {
        kind: addrKind, dist: aDist.value, full: aKhoroo.value, mnFull: aAimag.value,
        line1: aLine1.value.slice(0, 120), line2: aLine2.value.slice(0, 120), note: aNote.value.slice(0, 200),
      };
      try { localStorage.setItem("ss_addr", JSON.stringify(addr)); } catch (e) { /* storage refused — nothing lost but convenience */ }
    };

    kindBtns.forEach((b) => b.addEventListener("click", () => { setKind(b.dataset.kind); saveAddr(); }));
    aDist.addEventListener("change", () => { fillKhoroo(); saveAddr(); });
    [aAimag, aKhoroo, aLine1, aLine2, aNote].forEach((el) => el.addEventListener("change", saveAddr));

    if (savedAddr.dist) {
      const dist = oldDistrict(savedAddr.dist);
      if (dist) {
        aDist.value = dist;
        // new format keeps the full string; the old one kept the khoroo's number
        fillKhoroo(savedAddr.full || (savedAddr.khoroo ? `${dist} ${savedAddr.khoroo}-р хороо` : ""));
      }
    }
    if (savedAddr.mnFull && A.mn.some((x) => x.full === savedAddr.mnFull)) aAimag.value = savedAddr.mnFull;
    if (savedAddr.line1) aLine1.value = savedAddr.line1;
    else if (savedAddr.line) aLine1.value = savedAddr.line; // the one-line format this replaced
    if (savedAddr.line2) aLine2.value = savedAddr.line2;
    if (savedAddr.note) aNote.value = savedAddr.note;
    setKind(savedAddr.kind === "mn" && A.mn.length ? "mn" : "ub");
  }

  /* ---- errors: next to the field they are about ---- */
  /* The complaint used to be shown in one line at the foot of a form longer
     than a phone screen; someone with an empty box near the top pressed send,
     nothing appeared to happen, and they left. The message travels to the
     field, and so do the cursor and the screen. Each step has its own line. */
  const errBox = (id) => {
    const el = $(id);
    return { el, home: el.parentNode, anchor: el.nextElementSibling };
  };
  const E1 = errBox("formErr");
  const E2 = errBox("addrErr");
  let E = placed ? E2 : E1;
  const homeErr = () => {
    if (E.el.parentNode !== E.home || E.el.nextElementSibling !== E.anchor) E.home.insertBefore(E.el, E.anchor);
  };

  /* Getting there is not optional, so it does not ride on an animation: a
     smooth scroll is skipped under reduced motion and can be throttled to
     nothing in an in-app browser (measured: zero pixels). */
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
    const el = id ? $(id) : null;
    E.el.textContent = msg;
    if (!el) {
      homeErr();
      bring(E.el);
      return;
    }
    el.classList.add("is-invalid");
    (el.closest(".field") || E.home).appendChild(E.el);
    el.focus({ preventScroll: true });
    bring(el);
  };

  const clearFail = () => {
    E.el.textContent = "";
    page.querySelectorAll(".input.is-invalid").forEach((n) => n.classList.remove("is-invalid"));
    homeErr();
  };

  /* A number field that lets letters in only to reject them at the end wastes
     the visitor's time twice. Nothing but digits ever lands in it. */
  {
    const el = $("fPhone");
    ckSlug = ckSlug || d.slug || null;
    ck("form_view");
    el.addEventListener("focus", () => ck("phone_focus"));
    el.addEventListener("input", () => {
      const digits = el.value.replace(/[^0-9]/g, "").slice(0, 8);
      if (el.value !== digits) el.value = digits;
      el.classList.remove("is-invalid");
      if (digits.length === 8) ck("phone_typed");
    });
  }
  page.querySelectorAll(".input").forEach((el) =>
    el.addEventListener("input", () => el.classList.remove("is-invalid"))
  );

  /* A request is given thirty seconds and no more. Unbounded, a signal that
     died mid-send left the button on "ИЛГЭЭЖ БАЙНА…" for good and no second
     attempt was possible. */
  const timed = async (url, init, ms) => {
    const bail = typeof AbortController === "function" ? new AbortController() : null;
    const t = setTimeout(() => bail && bail.abort(), ms);
    try {
      return await fetch(url, Object.assign({}, init, { signal: bail ? bail.signal : undefined }));
    } finally {
      clearTimeout(t);
    }
  };
  const busy = (button, label) => {
    button.disabled = !!label;
    if (label) {
      button.dataset.idle = button.dataset.idle || button.querySelector(".buy__label").textContent;
      button.querySelector(".buy__label").textContent = label;
    } else if (button.dataset.idle) {
      button.querySelector(".buy__label").textContent = button.dataset.idle;
    }
  };

  /* What the visitor picked on the product page. The intake has no field for
     it, so it rides in the address detail in brackets, where the operator who
     rings them reads it — dropping it would mean asking again. */
  const pickedOnProduct = () =>
    [d.color && `Өнгө: ${d.color}`, d.size && `Хэмжээ: ${d.size}`, d.pack && `Багц: ${d.pack}`].filter(Boolean);

  /* Attach an address (or just the picks) to an order that already exists. */
  const setAddress = async (orderId, districtFull, detail) => {
    const res = await timed(
      SET_ADDRESS,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify({ p: { order_id: orderId, district_full: districtFull || null, address_detail: detail || null } }),
      },
      20000
    );
    const out = await res.json().catch(() => null);
    return out || { ok: false, error: "http_" + res.status };
  };

  const saveDone = (extra) => {
    let prev = {};
    try { prev = JSON.parse(sessionStorage.getItem("ss_done") || "{}") || {}; } catch (e) { /* none */ }
    sessionStorage.setItem("ss_done", JSON.stringify(Object.assign(prev, extra)));
  };

  const openStep2 = () => {
    $("orderForm").hidden = true;
    $("addrForm").hidden = false;
    E = E2;
    const root = document.documentElement;
    const had = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.style.scrollBehavior = had;
  };

  /* Why an order did not go out, told to the pixel as a custom event. There
     is no other channel: the site keeps no server of its own, and a diag
     address does not belong in a public file. Events Manager then shows
     "OrderIssue" with the reason, which is how a form that quietly fails for
     phones we never tested on gets noticed. No personal data travels. */
  const tell = (issue, extra) => {
    try {
      if (window.fbq) fbq("trackCustom", "OrderIssue", Object.assign({ issue, product: d.slug || "" }, extra || {}));
    } catch (e) { /* the pixel is a bystander here */ }
  };

  /* ---- step one: the phone number is the order ---- */
  const btn = $("submitBtn");
  let sending = false;
  $("orderForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sending) return;
    ck("submit_try");

    /* "8811 2233", "8811-2233", "+976 88112233", "976-8811-2233": the number
       is the number however it was typed. Only the digits are compared, and a
       country code in front is set aside. Anything else is refused with a
       plain sentence — and counted, so a form that keeps refusing people is
       seen in Events Manager rather than guessed at. */
    const typed = $("fPhone").value;
    let phone = typed.replace(/\D/g, "");
    if (phone.length === 11 && phone.startsWith("976")) phone = phone.slice(3);
    if (phone.length === 9 && phone.startsWith("0")) phone = phone.slice(1);
    const name = $("fName").value.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!/^\d{8}$/.test(phone)) {
      ck("invalid", "phone:" + phone.length);
      tell("phone", { digits: phone.length });
      return fail("fPhone", "Утасны дугаар 8 оронтой тоо байх ёстой.");
    }
    clearFail();

    /* The intake knows a product only by its database id. On 2026-09-17 two
       real orders went out carrying the slug instead; the database refused
       them and the visitors believed they had ordered. So nothing leaves
       without an id. */
    const productId = d.productId || (productBy(d.slug) || {}).product_id || "";
    if (!productId) {
      ck("error", "no_product_id");
      tell("no_product_id", { live: liveLoaded ? 1 : 0 });
      return fail("", "Энэ барааг одоогоор онлайнаар захиалах боломжгүй. 9550-5717 руу залгана уу.");
    }

    sending = true;
    busy(btn, "ИЛГЭЭЖ БАЙНА…");
    try {
      /* No price and no address go out. The backend prices, checks stock and
         spots duplicates; an order without an address is kept and marked for
         review, and the operator rings for it. */
      const res = await timed(
        ORDER_INTAKE,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: productId,
            name: name || null,
            phone,
            address: null,
            district_full: null,
            quantity: qty,
            channel: "web",
            creative_id: creativeId(),
            src: entrySrc(),
            entry: entryRaw(),
            sku_id: d.skuId || skuFor(productBy(d.slug), d.color, d.size) || null,
            color: d.color || null,
            size: d.size || null,
            status: "draft",
          }),
        },
        30000
      );
      /* A refusal arrives as JSON too, under a 4xx, so the body decides. */
      const out = await res.json();
      if (!out || out.ok !== true) {
        const x = new Error("refused");
        x.reply = out || {};
        throw x;
      }

      const total = Number(out.total_mnt) || 0;
      /* Purchase: once per real order, for the goods only (the delivery fee
         goes to the courier), never for a duplicate. Sent in dollars — Meta
         refuses MNT (pixelValue). The order id as eventID lets a server-side
         event for the same order be recognised as the same one later. */
      /* The owner's own test orders must not reach Meta as a Purchase: in
         test #1 three of them taught the optimiser the wrong buyer. The
         owner's number, or ?test=1 in the link, keeps the pixel quiet. */
      const ownerTest = OWNER_TEST_PHONES.includes(phone) || /[?&]test=1(\b|$)/.test(location.search + location.hash);
      /* BR: Lead at step one. A phone without an address is interest, not an
         order (B1, 2026-10-03): Purchase moved to the address step below, so
         Meta optimises for people who finish, not for people who type a number. */
      if (window.fbq && !out.is_duplicate && !ownerTest)
        fbq(
          "track",
          "Lead",
          {
            content_ids: [d.slug],
            content_type: "product",
            content_name: d.name,
            num_items: Number(out.quantity) || qty,
            ...pixelValue(total),
          },
          { eventID: "lead:" + String(out.order_id || "") }
        );

      ckDone = true;
      ck("ok", out.is_duplicate ? "duplicate" : null);

      /* A repeat inside a day comes back as a duplicate row pointing at the
         first; the address belongs on the first, the one the operator works. */
      const target = String((out.is_duplicate && out.duplicate_of) || out.order_id || "");
      placed = { slug: d.slug, orderId: target, qty: Number(out.quantity) || qty, goods: total, ownerTest, dup: !!out.is_duplicate };
      try { sessionStorage.setItem(STEP2_KEY, JSON.stringify(placed)); } catch (e2) { /* refresh returns to step one */ }
      saveDone({
        code: String(out.order_id || ""),
        product: out.product || d.name,
        qty: placed.qty,
        goods: total,
        ship: shipPrice,
        shipName,
        shipIncluded,
        total: total + shipPrice,
        payment: "Хүргэлтээр төлөх",
        name, phone,
        noAddress: true,
        leadTime: d.leadTime || "",
        preorder: !!d.preorder,
        test: !!d.test,
        shipsInDays: d.shipsInDays || null,
        slug: d.slug || "",
        color: d.color || "",
        size: d.size || "",
      });
      /* The picks go on the order straight away, so they are not lost if the
         address step is skipped. Its failure costs nothing the phone call
         cannot recover, so it is not waited on. */
      const picks = pickedOnProduct();
      if (picks.length && target) setAddress(target, null, `[${picks.join(" · ")}]`).catch(() => {});

      sending = false;
      busy(btn, "");
      refresh();
      openStep2();
    } catch (ex) {
      console.error(ex);
      sending = false;
      busy(btn, "");
      tell(
        ex && ex.reply ? "refused" : ex && ex.name === "AbortError" ? "timeout" : "network",
        ex && ex.reply ? { code: String(ex.reply.error || ex.reply.reason || ex.reply.refusal || "") } : {}
      );
      const said = ex && ex.reply ? orderRefusal(ex.reply) : null;
      ck("error", said ? said.text : ex && ex.name === "AbortError" ? "timeout" : String((ex && ex.message) || ex));
      if (said && said.field) return fail(said.field, said.text);
      /* A request we gave up on may still have reached the backend, so the
         wording stops short of telling them to fire a second one blind. */
      fail(
        "",
        said
          ? said.text
          : ex && ex.name === "AbortError"
            ? "Сүлжээ хариу өгсөнгүй. 9550-5717 руу залгавал бид захиалгыг тань шууд бүртгэнэ."
            : "Илгээхэд алдаа гарлаа. Дахин оролдоно уу, эсвэл 9550-5717 руу залгана уу."
      );
    }
  });

  /* Typed on the product page (2026-09-29): the number came with the draft, so
     step one sends itself and the visitor lands on the address. The flag is
     cleared first, so a refresh never sends it twice (the intake would mark a
     second one as a duplicate anyway). A refusal leaves step one on screen,
     filled in, with the reason under the field. */
  if (d.auto && d.phone && !placed) {
    $("fPhone").value = String(d.phone).replace(/\D/g, "").slice(0, 8);
    if (d.custName && $("fName")) $("fName").value = d.custName;
    try { const dd = getDraft(); if (dd) { delete dd.auto; setDraft(dd); } } catch (e) { /* storage refused — the intake catches a repeat */ }
    const f1 = $("orderForm");
    setTimeout(() => (typeof f1.requestSubmit === "function" ? f1.requestSubmit() : btn.click()), 0);
  }

  /* ---- step two: the address, if they will give it ---- */
  const finish = () => {
    try { sessionStorage.removeItem(STEP2_KEY); } catch (e) { /* nothing to forget */ }
  };
  $("addrSkip").addEventListener("click", finish);

  const addrBtn = $("addrBtn");
  let sendingAddr = false;
  $("addrForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sendingAddr || !placed) return;
    const val = (id) => $(id).value.trim();

    /* The district and khoroo travel on their own, in the courier's exact
       words; the written line carries only what no list can hold. */
    let where;
    let districtFull = "";
    if ($("addrKind")) {
      const tidy = (id) => val(id).replace(/\s+/g, " ");
      const line1 = tidy("aLine1");
      const line2 = tidy("aLine2");
      const note = tidy("aNote");
      if (addrKind === "ub") {
        if (!val("aDist")) return fail("aDist", "Дүүргээ сонгоно уу.");
        districtFull = val("aKhoroo");
        if (!districtFull) return fail("aKhoroo", "Хороогоо сонгоно уу.");
      } else {
        districtFull = val("aAimag");
        if (!districtFull) return fail("aAimag", "Аймаг, хотоо сонгоно уу.");
      }
      if (!line1) return fail("aLine1", "Хороолол, байр эсвэл гудамжаа бичнэ үү.");
      if (!line2) return fail("aLine2", "Орц, давхар, тоот эсвэл хашааны дугаараа бичнэ үү.");
      where = `${line1}, ${line2}` + (note ? ` · Тайлбар: ${note}` : "");
    } else {
      where = val("fAddr").replace(/\s*\n+\s*/g, ", ");
      if (!where) return fail("fAddr", "Хүргүүлэх хаягаа бичнэ үү.");
    }
    clearFail();

    const picked = [...pickedOnProduct(), shipName, payment].filter(Boolean);
    const detail = `${where} [${picked.join(" · ")}]`;

    sendingAddr = true;
    busy(addrBtn, "ИЛГЭЭЖ БАЙНА…");
    let out;
    try {
      out = await setAddress(placed.orderId, districtFull, detail);
    } catch (ex) {
      out = { ok: false, error: ex && ex.name === "AbortError" ? "timeout" : "network" };
    }
    sendingAddr = false;
    busy(addrBtn, "");

    if (out.ok !== true) {
      if (out.error === "bad_district") {
        return fail(addrKind === "mn" ? "aAimag" : "aKhoroo", out.message || "Дүүрэг/хороо жагсаалтаас сонгоно уу.");
      }
      /* Already handed to the courier, or the line failed: the order itself
         stands either way, so say that plainly and let them go on. */
      return fail(
        "",
        "Хаягийг хадгалж чадсангүй — утасны дугаар тань бүртгэгдсэн. Дахин оролдоно уу, эсвэл хаягаа " + ORDER_LINE.text + " руу бичиж илгээнэ үү."
      );
    }

    /* BR: Purchase only now — an address makes it an order (B1). Same eventID
       as the order id, so a server-side event for the same order dedups. */
    if (window.fbq && !placed.ownerTest && !placed.dup && !placed.purchased) {
      placed.purchased = true;
      fbq(
        "track",
        "Purchase",
        {
          content_ids: [placed.slug],
          content_type: "product",
          content_name: d.name,
          num_items: Number(placed.qty) || 1,
          ...pixelValue(Number(placed.goods) || goodsNow()),
        },
        { eventID: String(placed.orderId || "") }
      );
    }
    saveDone({ ship: shipPrice, shipName, payment, total: (Number(placed.goods) || goodsNow()) + shipPrice, noAddress: false });
    finish();
    location.hash = "#/done";
  });
}

/* What to tell someone whose order the backend turned down. Its own `message`
   wins whenever there is one — it is written in Mongolian and knows the product
   by name. The codes are the fallback. The reply has been seen carrying a
   single `error` and also a list under `errors`, so both are read. */
function orderRefusal(reply) {
  const codes = [].concat(reply.error || [], reply.errors || []).map(String);
  const code = codes[0] || "";
  const phoneTrouble = /^phone_/.test(code);
  /* Only the backend's own refusal is quoted, and only when it is written in
     Mongolian: n8n's generic failure page also carries a `message`, and it
     said "Error in workflow" to a customer once. */
  const said = reply.ok === false ? String(reply.message || "").trim() : "";
  const text =
    (/[\u0400-\u04FF]/.test(said) ? said : "") ||
    {
      out_of_stock: "Энэ бараа түр дууссан байна.",
      product_not_found: "Энэ бараа одоогоор байхгүй байна.",
      // a product painted from a copy that predates the move has no UUID to send
      product_id_missing: "Хуудсаа дахин ачаалаад захиалгаа илгээнэ үү.",
      product_inactive: "Энэ бараа одоогоор байхгүй байна.",
      phone_required: "Утасны дугаараа оруулна уу.",
      phone_invalid: "Утасны дугаар 8 оронтой тоо байх ёстой.",
      price_not_set: "Түр алдаа гарлаа, дараа оролдоно уу.",
    }[code] ||
    "Захиалгыг бүртгэж чадсангүй. 9550-5717 руу залгана уу.";
  return { text, field: phoneTrouble ? "fPhone" : "" };
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
  const transfer = info.payment === "Шилжүүлгээр төлөх" && !info.test && !info.preorder;

  const acct = String(s.account || "");
  const iban = "MN" + acct;
  /* The intake names an order with a long identifier. Nobody can read that
     down a phone or type it into a transfer, so the first eight characters
     stand for it on screen; the whole of it stays on the copy of record. */
  const code = String(info.code || "").replace(/-/g, "").slice(0, 8).toUpperCase();
  const amountRows = `
      <div class="totals" style="margin-top:1rem">
        <div class="totals__row"><span>${esc(info.product || "Бараа")} (${Number(info.qty) || 1}ш)</span><span>${money(info.goods || 0)}</span></div>
        ${
          info.noAddress
            ? `<div class="totals__row"><span>Хүргэлт <small>(${info.shipIncluded ? "үнэгүй" : "хаягаас хамаарна"})</small></span><span>${info.shipIncluded ? money(0) : esc(deliverySummary())}</span></div>`
            : `<div class="totals__row"><span>${esc(info.shipName || "Хүргэлт")} <small>(${info.shipIncluded ? "үнэд багтсан" : "тусдаа төлнө"})</small></span><span>${money(info.ship || 0)}</span></div>`
        }
        ${info.noAddress ? "" : `<div class="totals__row totals__row--big"><span>Нийт</span><span>${money(info.total || 0)}</span></div>`}
      </div>`;
  /* A name is optional since the two-step form (W8), so the greeting must not
     start with a stray comma when there is none. */
  const thanks = info.name ? `${esc(info.name)}, баярлалаа.` : "Баярлалаа.";
  /* Ordered by phone number alone: what happens next is a call, and the
     address can be given in it. Said first, because it is the whole plan. */
  const waits = !!(info.test || info.preorder);
  const callNote = info.noAddress
    ? `<br><b>Бид ${ORDER_LINE.text}-оос залгана.</b> Хаягаа утсаар хэлж болно.`
    : "";

  document.getElementById("donePage").innerHTML = `
    <div class="done">
      <div class="done__mark">${waits && info.noAddress ? "!" : "✓"}</div>
      <h1 class="done__title">${
        waits && info.noAddress
          ? "Утасны дугаар бүртгэгдлээ"
          : info.test
          ? esc(WAITLIST_TITLE)
          : info.preorder
          ? "Захиалга баталгаажлаа"
          : "Захиалга хүлээн авлаа"
      }</h1>
      <p class="done__lead">
        ${
          waits && info.noAddress
            ? `${thanks} Хаягаа оруулаагүй тул захиалга албан ёсоор баталгаажаагүй байна. Хаягаа (дүүрэг, хороо, байр/тоот) ${ORDER_LINE.text} руу бичиж илгээвэл баталгаажна.`
            : info.test
            ? `${thanks} ${esc(waitlistText())}`
            : info.preorder
            ? `${thanks} ${esc(waitSentence(info))} Бараа ирэхэд бид танд SMS-ээр мэдэгдэнэ. Төлбөрөө бараагаа авахдаа төлнө. Хүлээхгүй бол ${ORDER_LINE.text} руу бичвэл цуцална.`
            : `${thanks} Бид удахгүй тантай холбогдоно.
        ${info.leadTime ? `<br>Хүргэлт: <b>${esc(info.leadTime)}</b>` : ""}${callNote}`
        }
      </p>

      <div class="code" data-order-id="${esc(info.code)}">
        <div class="code__label">ТАНЫ ЗАХИАЛГЫН КОД</div>
        <div class="code__value" id="codeVal">${esc(code)}</div>
        <button class="copy" data-copy="${esc(code)}">Кодыг хуулах</button>
        <div class="code__phone">
          <span>Бүртгэсэн утас</span>
          <b>${esc(info.phone)}</b>
        </div>
      </div>
      ${amountRows}

      ${
        transfer
          ? `<div class="warn">
              <b>Гүйлгээний утга дээр <u>${esc(code)}</u> код болон утасны дугаараа бичнэ үү.</b><br>
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
                  <b>${money(info.noAddress && !info.shipIncluded ? info.goods : info.total)}${info.noAddress && !info.shipIncluded ? " + хүргэлт" : ""}</b>
                </div>
              </div>
            </div>`
      }

      <div class="helpline">
        <span class="helpline__k">Хүргэлтийн лавлах · ${esc(COURIER.name)}</span>
        <span class="helpline__v">
          <a href="tel:${COURIER.tel}">${COURIER.text}</a>
        </span>
        <span class="helpline__note">Хүргэлтийн явц, хугацааг эндээс лавлана.</span>
        <span class="helpline__k" style="margin-top:.7rem">Захиалгын талаар</span>
        <span class="helpline__v">
          <a href="tel:${ORDER_LINE.tel}">${ORDER_LINE.text}</a>
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
      <p><b>Бүх бараанд хүргэлт үнэгүй</b> — Улаанбаатар ч, орон нутаг ч. Хүргэлтийн
      зардал барааны үнэд багтсан тул хүргэлтийн ажилтанд нэмэлт төлбөр төлөхгүй.</p>
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
      <p>Бараа бүрийн ирэх хугацаа өөр өөр тул <b>захиалгын 2-р алхамд (хаяг оруулах үед)</b>
      тухайн барааны хугацаа бичигдэнэ — агуулахад байгаа бараа шууд, гадаадаас ирж буй
      бараа заасан хоногийн дараа хүргэгдэнэ. Бараа ирэхэд бид SMS-ээр мэдэгдэнэ.</p>
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
      боломжтой. Ийм тохиолдолд дахин хүргэлтэд 6,000₮ нэмэгдэж болно.</p>
      <h2>Лавлах</h2>
      <p>Хүргэлтийн явц, хугацаа — ${COURIER.name}: <a href="tel:${COURIER.tel}">${COURIER.text}</a><br>
      Захиалгын талаар — <a href="tel:${ORDER_LINE.tel}">${ORDER_LINE.text}</a></p>`,
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
      <p><a href="tel:${ORDER_LINE.tel}">${ORDER_LINE.text}</a></p>
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

/* The route, as `kind/slug` pieces. Anything after a `?` in the hash is
   dropped first: Meta (and other trackers) append `?fbclid=…` to whatever
   link they are given, and when that link is `#/p/slug` the marker lands
   inside the hash — "slug?fbclid=…" names no product, and the visitor who
   just clicked an ad would be told the product does not exist. */
const hashParts = () => location.hash.replace(/^#\/?/, "").split("?")[0].split("/");

/* Does the address currently point at something the loaded catalogue cannot
   resolve? Answering yes is what makes the shop reach for a fresher copy. */
const routeUnresolved = () => {
  const [kind, raw] = hashParts();
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

let routedOnce = false;

function route() {
  const [kind, rawSlug] = hashParts();
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
    viewReported = ""; // a navigation is a new visit to the product; a repaint is not
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
    wakeHome();
    setHead("", "/");
    buildHomeMotion();
    setRail("hero");
  }

  window.scrollTo(0, 0);
  refreshMotion();
  /* index.html has already reported the page the visitor landed on; saying it
     again for the first route counted every arrival twice. Later routes are
     pages of their own and are reported here. */
  if (window.fbq && routedOnce) fbq("track", "PageView");
  routedOnce = true;
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
const settle = refreshMotion;
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
    /* A toolbar sliding away moves this by a few dozen pixels, which the door's
       driver re-measures on its own. A jump this large means the window itself
       changed and the whole layout was measured against the wrong one. */
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
    categories: (data.categories || []).map((c) => (CATEGORY_ART[c.slug] ? { ...c, image: CATEGORY_ART[c.slug] } : c)),
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
/* True once Supabase has answered or given up. The sheet can land first, and
   its products carry no database id; until the database has had its say, a
   missing id means "not here yet", never "cannot be ordered". */
let supaSettled = false;

/* Everything the product page is drawn from, as one comparable string. The
   live catalogue lands seconds after the offline copy has already drawn the
   page, and redrawing it threw the gallery back to the first photo under the
   eyes of someone part-way through the set — for data that, nearly always, had
   not changed at all. A page with no product behind it yet has no signature,
   so it never matches and is always drawn. */
/* A product the settled catalogue gave no database id cannot be ordered here. */
const cannotOrder = (p) => liveLoaded && supaSettled && !!p && !p.product_id;

function productSignature(slug) {
  const p = productBy(slug);
  if (!p) return "";
  const cat = categoryBy(p.category);
  return JSON.stringify([
    p,
    availableOf(p.slug),
    bundlesFor(p.slug),
    reviewsFor(p.slug),
    cat ? cat.name : "",
    DB.shop.delivery || [],
  ]);
}
const hashTarget = () => {
  const [kind, slug] = hashParts();
  let want = slug;
  try {
    want = decodeURIComponent(slug || "");
  } catch (ex) {
    /* malformed escape — compare the raw text instead */
  }
  return [kind, want];
};

/* Everything the front door draws from the catalogue: which categories, under
   what name and picture, in what order, and how many products each holds. */
const homeSignature = () =>
  JSON.stringify(
    DB.categories
      .filter((c) => c.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((c) => [c.slug, c.name, c.image, productsIn(c.slug).length])
  );

function paint(data, { first }) {
  const [kindWas, slugWas] = hashTarget();
  const sigWas = !first && kindWas === "p" && slugWas ? productSignature(slugWas) : "";
  /* The catalogue lands in pieces — the stored copy, the offline copy, the
     database, then the sheet four or five seconds in — and each arrival used
     to rebuild the front door whole: measured at four rebuilds in the first
     five seconds, the last one well after the visitor had begun to look. Each
     put the category ring back on its first name, swapped the very pictures
     on screen and re-measured the pinned hero mid-scroll, which is the hitch
     a returning visitor saw. The front door is now rebuilt only when what it
     shows has actually changed, and then it stays on the category in view. */
  const homeWas = first ? "" : homeSignature();
  setDB(data);
  const homeChanged = first || homeSignature() !== homeWas;
  if (homeChanged) {
    const slugInView = first ? "" : (catsStage.querySelector(".cat.is-active .cat__cta") || { hash: "" }).hash;
    renderCategories();
    const cards = [...catsStage.querySelectorAll(".cat .cat__cta")];
    const at = slugInView ? cards.findIndex((a) => a.hash === slugInView) : 0;
    showCat(at > 0 ? at : 0);
  }
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
    const [kind, want] = hashTarget();
    /* Restarting the rotation is not a detail. The redraw replaces the very
       elements the running timers were moving, so without this the photos on
       every product reached by a link simply stopped — measured at twenty
       seconds on screen without a single change of picture. */
    if (want && kind === "c" && !views.category.hidden) {
      renderCategory(want);
      startFrames(views.category);
    } else if (want && kind === "p" && !views.product.hidden && !pdpTouched) {
      // same product, same data: leave the page, and the photo they are on, alone
      // …unless the order button itself has to open or close
      const buttonStale = (views.product.dataset.noid === "1") !== cannotOrder(productBy(want));
      if (!sigWas || want !== slugWas || sigWas !== productSignature(want) || buttonStale) {
        renderProduct(want);
        startFrames(views.product);
      }
    }
  }
  // fonts and images landing late can shift a pin's measurements — but only
  // a front door that was rebuilt has anything new to measure
  if (homeChanged) requestAnimationFrame(refreshMotion);
}

/* ---- Supabase rows → the shape every render function already reads ----
   The page code did not change for the move, so a product from the database
   must look exactly like one that came from the sheet. `base` is the
   sheet-side catalogue (feed, offline copy or the stored one) whose shop,
   categories, bundles and reviews are kept as they are. `tools/catalog.py`
   applies the same rules for the preview cards and the health check. */
const urlList = (v) =>
  Array.isArray(v)
    ? v.map((x) => String(x).trim()).filter(Boolean)
    : String(v || "")
        .split(/[\s,]+/)
        .map((x) => x.trim())
        .filter(Boolean);

/* Which photo leads is the owner's call, and the sheet is where the owner
   reaches for it: on 2026-09-28 the first and fourth photos of a product were
   swapped in its sheet row and the shop went on showing the old order, because
   the photos themselves come from the database. So when the sheet row of the
   same slug lists exactly the photos the database does — the same set, only
   arranged differently — the sheet's arrangement is used. A row that names a
   different photo, or a different number of them, changes nothing: what is
   shown is still only what the database holds. `tools/catalog.py` does the
   same, so the preview card leads with the same picture. */
const photoKey = (u) => {
  const s = String(u || "").trim();
  const drive = /\/d\/([\w-]{20,})|[?&]id=([\w-]{20,})/.exec(s);
  return drive ? "drive:" + (drive[1] || drive[2]) : s.split("?")[0];
};
function inSheetOrder(fromDb, fromSheet) {
  if (fromDb.length < 2 || fromSheet.length !== fromDb.length) return fromDb;
  const byKey = new Map(fromDb.map((u) => [photoKey(u), u]));
  if (byKey.size !== fromDb.length) return fromDb;
  const out = fromSheet.map((u) => byKey.get(photoKey(u)));
  return out.every(Boolean) && new Set(out).size === out.length ? out : fromDb;
}

function fromSupabase(rows, base) {
  const src = base || {};
  /* matched loosely: the sheet row lends colours, sizes and lead time, and a
     slug whose capitals differ between the two must not silently lose them */
  const old = new Map((src.products || []).map((p) => [loosen(p.slug), p]));
  const stock = { ...(src.stock || {}) };
  const products = [];
  for (const r of rows || []) {
    const slug = String(r.slug || "").trim();
    const price = Number(r.price_mnt);
    // no address or no price: the shop could neither show nor sell it
    if (!slug || !(price > 0)) continue;
    const was = old.get(loosen(slug)) || {};
    const cmp = Number(r.compare_at_mnt);
    const images = inSheetOrder(
      urlList(r.images != null && r.images !== "" ? r.images : r.image_urls),
      listOf(was.images)
    );
    products.push({
      ...was, // colours, sizes and lead time still live in the sheet row of the same slug
      slug,
      product_id: r.product_id || r.id || "",
      category: String(r.category || was.category || "").trim(),
      name: r.name || was.name || slug,
      desc: r.description != null && r.description !== "" ? r.description : was.desc || "",
      price,
      discount: null,
      compareAt: cmp > price ? cmp : null,
      images: images.length ? images : listOf(was.images),
      featured: !!r.featured,
      maxPerOrder: Number(r.max_per_order) > 0 ? Number(r.max_per_order) : null,
      deliveryPaidBy: r.delivery_paid_by === "included" ? "included" : "customer",
      fulfillment: ["preorder", "test"].includes(r.fulfillment_mode) ? r.fulfillment_mode : "live",
      shipsInDays: Number(r.ships_in_days) > 0 ? Number(r.ships_in_days) : null,
      active: r.status ? r.status === "active" : r.active !== false,
      /* Block AV (2026-09-28): colours, sizes and the photo per colour now
         come from the database's SKUs (`variants`). A product that has none
         yet keeps whatever the sheet row said, so nothing goes blank. */
      ...(Array.isArray(r.variants) && r.variants.length
        ? {
            variants: r.variants,
            colors: Array.isArray(r.colors) && r.colors.length ? r.colors : listOf(was.colors),
            sizes: Array.isArray(r.sizes) && r.sizes.length ? r.sizes : listOf(was.sizes),
            colorImages:
              Array.isArray(r.color_images) && r.color_images.some(Boolean)
                ? r.color_images.map((u, i) => u || listOf(was.colorImages)[i] || "")
                : listOf(was.colorImages),
          }
        : {}),
    });
    /* Stock is the intake's to enforce; here it only decides the badge and the
       button. A count wins, a plain in_stock:false closes the product, and no
       word at all leaves it orderable — the sheet's old figure for the same
       slug is dropped rather than left to contradict the database. */
    if (["preorder", "test"].includes(r.fulfillment_mode)) {
      delete stock[slug]; // nothing on a shelf to count, so nothing to run out of
    } else if (r.stock_qty !== undefined && r.stock_qty !== null && r.stock_qty !== "") {
      stock[slug] = Number(r.stock_qty);
    } else if (r.in_stock === false) {
      stock[slug] = 0;
    } else {
      delete stock[slug];
    }
  }
  // the sheet still carried counts for products retired long ago
  const listed = new Set(products.map((x) => x.slug));
  for (const slug of Object.keys(stock)) if (!listed.has(slug)) delete stock[slug];
  return { ...src, products, stock };
}

/* 1 — something on screen straight away */
const cached = readCache();
if (cached) paint(cached, { first: true });

/* Three sources, all asked at once, none waiting on another — the deep link
   from a reel is measured on 3G and must not get slower for this move:
     · Supabase        — the products, and their stock
     · the sheet feed  — shop details, categories, bundles, reviews
     · catalog.json    — the offline copy of both, on our own domain
   `supaRows` holds the products once they have landed; `extras` the best
   sheet-side answer so far. Whatever lands is merged with whatever is here. */
let supaRows = null;
let extras = null;
const merged = (base) => (supaRows ? fromSupabase(supaRows, base) : base);

/* A phone on a weak signal can hold a request open for a minute, and until it
   settles the shop cannot tell a slug that is missing from one that is merely
   late — so every backend is given a deadline. */
const feedDeadline = () => {
  if (typeof AbortController !== "function") return undefined;
  const c = new AbortController();
  setTimeout(() => c.abort(), 15000);
  return c.signal;
};

/* 1b — the offline copy, always. It used to be skipped whenever the browser
   held a stored one, which is exactly the visitor this shop lives on: someone
   who looked a few days ago, saw a reel today and tapped the product. Their
   stored copy predates the item, so the shop knew nothing about it and had
   only the sheet to wait for — measured at four to five seconds, and that is
   on a wired line. This file is rebuilt every twenty minutes, sits on our own
   domain and answers in half a second, so it is asked every time and used
   whenever the address points at something the stored copy cannot resolve.
   index.html has usually asked for it already, from its <head>, before this
   file was even downloaded (`__ss.copy`) — so it tends to be here by now. */
(early("copy") || fetch(DATA_FALLBACK, { cache: "no-cache" }))
  .then((r) => r.json())
  .then((data) => {
    if (!extras) extras = data;
    if (supaRows) {
      // the products are already here; this only fills in the shelf around them
      const out = fromSupabase(supaRows, data);
      if (!booted) {
        writeCache(out);
        liveLoaded = true;
        return paint(out, { first: true });
      }
      if (routeUnresolved()) paint(out, { first: false });
      return;
    }
    if (liveLoaded) return; // the sheet itself already answered
    if (!booted) return paint(data, { first: true });
    if (routeUnresolved()) paint(data, { first: false });
  })
  .catch(() => {});

/* 2 — the products, from the database the intake prices from. An empty answer
   is not an error: nothing has been registered yet, and the sheet carries the
   shelf exactly as it did before. A GET, so no preflight (see `rpcGet`). */
fetch(rpcGet("web_products"), { signal: feedDeadline() })
  .then((r) => {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  })
  .then((rows) => {
    supaSettled = true;
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) {
      // nothing registered: what the sheet lists can be shown but not ordered here
      if (booted) paint(extras || DB, { first: false });
      return;
    }
    supaRows = list;
    // no shelf to put them on yet: the offline copy or the feed merges them on arrival
    const base = extras || (DB.categories.length ? DB : null);
    if (!base) return;
    const data = fromSupabase(list, base);
    writeCache(data);
    liveLoaded = true;
    paint(data, { first: !booted });
  })
  .catch((err) => {
    console.warn("Supabase каталог ирсэнгүй, Sheet-ийн feed-ээр үргэлжилж байна:", err);
    supaSettled = true;
    // the intake lives in the same database: show the shelf, take orders by phone
    if (booted) paint(extras || DB, { first: false });
  });

/* 2b — stock position for the preorder line (block BF); a GET, no preflight,
   and a miss only leaves the fixed-days wording in place. */
fetch(rpcGet("stock_public"), { signal: feedDeadline() })
  .then((r) => (r.ok ? r.json() : {}))
  .then((j) => {
    STOCK_PUBLIC = j && typeof j === "object" && !Array.isArray(j) ? j : {};
    applyStockLine();
  })
  .catch(() => {});

/* 3 — the sheet: shop details, categories, bundles, reviews — and, until a
   product is registered in Supabase, the products too. */
fetch(DATA_SOURCE, { signal: feedDeadline() })
  .then((r) => {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  })
  .then((data) => {
    if (!data || !(data.products || []).length) return;
    extras = data;
    const out = merged(data);
    writeCache(out);
    liveLoaded = true;
    paint(out, { first: !booted });
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
        /* booted may have come true while this was on its way (the database
           painted first); a second "first" paint re-ran the route and sent a
           second ViewContent for one visit — found in the W8 test. */
        .then((data) => paint(merged(data), { first: !booted }))
        .catch(() => {
          catsStage.innerHTML =
            '<p style="opacity:.6;font-size:.85rem">Каталог ачаалж чадсангүй.</p>';
        });
    }
  });
