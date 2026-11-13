/* Нэгдсэн навигаци (C3, 2026-10-03). Хуудас бүр ssNav('<key>', themeQ) дуудна — цэс нэг газар.
   Нүүр (систем зураглал — бүх мэдээлэл нэг дор, 3D) / Тест / Захиалга / Мөнгө / Нөөц · PO / Судалгаа. Эзний шийдвэр 10-03: хуучин системийн нүүр = Нүүр. */
function ssNav(on, themeQ) {
  var tq = themeQ ? '&theme=' + themeQ : '';
  var items = [
    ['home', '/board/' + (themeQ ? '?theme=' + themeQ : ''), 'Нүүр'],
    ['brief', '/board/?view=brief' + tq, '☀ Тайлан'],
    ['tests', '/board/?view=tests' + tq, 'Тест'],
    ['orders', '/board/?view=orders' + tq, 'Захиалга'],
    ['money', '/board/?view=money' + tq, 'Мөнгө'],
    ['ops', '/board/?view=ops' + tq, 'Нөөц · PO'],
    ['growth', '/board/?view=growth' + tq, 'Өсөлт'],
    ['reach', '/board/?view=reach' + tq, 'Хүрээ'],
    ['leak', '/board/?view=leak' + tq, 'Алдагдал'],
    ['research', '/board/?view=research&tab=rank' + tq, 'Судалгаа']
  ];
  return '<nav class="nav">' + items.map(function (it) {
    return '<a' + (it[0] === on ? ' class="on"' : '') + ' href="' + it[1].replace(/&/g, '&amp;') + '">' + it[2] + '</a>';
  }).join('') + '</nav>';
}
/* Самбарын ачаалагч (чиглүүлэгч). Хуудсыг энд зурна, n8n зөвхөн өгөгдөл өгнө.
   Түлхүүр: анх удаа /board/#k=... холбоосоор орход энэ төхөөрөмжид хадгалагдана
   (hash сервер рүү явдаггүй). Дараа нь /board/ гэж л орно.

   Архитектур: нэг хуудас = нэг мөр (VIEWS). Шинэ хуудас нэмэх = мөр нэмэх, render функц бичих.
     data  — n8n board-data view-ийн нэр (нэг үндсэн дуудлага)
     extra — нэмэлт view-үүд (унасан ч хуудас ачаална), үр дүн d[нэр] дээр очно
     render — window дээрх зурагч функцийн нэр */
(function () {
  var DATA_URL = 'https://starshopping.app.n8n.cloud/webhook/board-data';
  var KEY_NAME = 'ss_board_key';
  var q = {};
  new URLSearchParams(location.search).forEach(function (v, k) { q[k] = v; });

  var VIEWS = {
    home:     { data: 'board',    extra: { funnel_ads: 'funnel', meta: 'meta', adsctl: 'adsctl', budget: 'budget', money_m: { view: 'money', range: 'month' }, money_a: { view: 'money', range: 'all' }, rep_m: { view: 'report', range: 'month' }, sat: 'sat', output: 'output', outlook: 'outlook', nx: 'nxsettle' }, render: 'renderBoard' },  // НҮҮР: системийн зураглал (3D, бүх мэдээлэл нэг дор) — эзний шийдвэр 10-03
    tests:    { data: 'tests',    extra: { gaps: 'linkgaps' }, render: 'renderTests' },                           // тестийн урсгал (блок AR)
    research: { data: 'research', extra: {}, render: 'renderResearch' },
    board:    { data: 'board',    extra: { funnel_ads: 'funnel', meta: 'meta', adsctl: 'adsctl', budget: 'budget', money_m: { view: 'money', range: 'month' }, money_a: { view: 'money', range: 'all' }, rep_m: { view: 'report', range: 'month' }, sat: 'sat', output: 'output', outlook: 'outlook', nx: 'nxsettle' }, render: 'renderBoard' },  // блок BC: бараа × зар маягт
    ops:      { data: 'stock',    extra: { waitlist: 'waitlist', reorder: 'reorder' }, render: 'renderOps' }, // блок BF→C3: зөвхөн нөөц · PO (захиалга→orders, мөнгө→money)
    orders:   { data: 'orders2',  extra: { districts: 'districts' }, render: 'renderOrders', passQuery: true }, // блок C1: захиалга (хаягтай / сонирхол), шүүлт = URL query
    money:    { data: 'money2',   extra: {}, render: 'renderMoney2', passQuery: true, keep: true }, // блок DB (10-31): мөнгө v2 — money_summary нэг дуудлага
    growth:   { data: 'growth',   extra: {}, render: 'renderGrowth', keep: true },   // блок EK (11-03): өсөлтийн шат — growth_plan, дохио
    reach:    { data: 'reach',    extra: { outlook: 'outlook' }, render: 'renderReach' },    // блок FL (11-07): хүрээний хамгаалалт — reach_board, засварын бүртгэл
    leak:     { data: 'leak',     extra: { crm: 'crm' }, render: 'renderLeak' },  // блок GG (11-11): алдагдлын газрын зураг — leak_map; машин эзэмшигчдийн сан — car_owner_book
    brief:    { data: 'brief',    extra: {}, render: 'renderBrief', keep: true },   // блок GM (11-11): өглөөний тайлан — morning_brief, «Сонсох»
    money_old: { data: 'money',   extra: {}, render: 'renderMoney', passQuery: true }  // блок C2: хуучин мөнгө — ангилал, дэвтэр, сан (v2-ийн «Дэлгэрэнгүй»)
  };
  // C3: хуучин хаягууд → шинэ хуудас (хуучин холбоос, Telegram мессеж ажилласаар)
  var tqq = q.theme ? '&theme=' + q.theme : '';
  if (q.view === 'mission' || q.view === 'category') { location.replace('/board/' + (q.theme ? '?theme=' + q.theme : '')); return; }
  if (q.view === 'ops' && q.tab === 'orders') { location.replace('/board/?view=orders' + tqq); return; }
  if (q.view === 'ops' && q.tab === 'cash') { location.replace('/board/?view=money' + tqq); return; }
  var view = VIEWS[q.view] ? q.view : 'home';
  var V = VIEWS[view];
  // passQuery: хуудасны шүүлт (URL query) өгөгдлийн дуудлагад бүхэлдээ дамжина (view/theme/k-гүй)
  var PQ = '';
  if (V.passQuery) { var ps = new URLSearchParams(); Object.keys(q).forEach(function (k) { if (k !== 'view' && k !== 'theme' && k !== 'k' && k !== 'tab' && q[k] !== '') ps.append(k, q[k]); }); PQ = ps.toString() ? '&' + ps.toString() : ''; }

  function store(k) { try { if (k) localStorage.setItem(KEY_NAME, k); else localStorage.removeItem(KEY_NAME); } catch (e) { /* private window */ } }
  function load() { try { return localStorage.getItem(KEY_NAME) || ''; } catch (e) { return ''; } }

  var m = location.hash.match(/(?:^#|&)k=([^&]+)/);
  if (m) { store(decodeURIComponent(m[1])); history.replaceState(null, '', location.pathname + location.search); }
  var key = load();

  /* THEME (2026-10-05): нэг газар — бүх хуудас. Сонголт localStorage ss_board_theme (dark|light);
     байхгүй бол хуучин ?theme= холбоос, тэгэхгүй бол төхөөрөмжийн горим. */
  var TKEY = 'ss_board_theme';
  function themePref() {
    try { var t = localStorage.getItem(TKEY); if (t === 'dark' || t === 'light') return t; } catch (e) { /* private window */ }
    return q.theme === 'dark' || q.theme === 'light' ? q.theme : '';
  }
  function themeNow() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function stamp(html) {
    var t = themePref();
    html = html.replace(/(<html[^>]*?) data-theme="[^"]*"/, '$1');
    return t ? html.replace('<html lang="mn"', '<html lang="mn" data-theme="' + t + '"') : html;
  }
  function themeBtn() {
    var hd = document.querySelector('header .hd');
    if (!hd) return;
    var b = document.getElementById('tb');
    if (!b) {
      b = document.createElement('button'); b.id = 'tb'; b.type = 'button'; b.className = 'tb';
      var rf = hd.querySelector('a.rf'); if (rf) hd.insertBefore(b, rf); else hd.appendChild(b);
    }
    var t = themeNow();
    b.textContent = t === 'dark' ? '☾ Харанхуй' : '☀ Цайвар';
    b.setAttribute('aria-label', 'Горим: ' + (t === 'dark' ? 'харанхуй' : 'цайвар') + ' — солих');
  }
  if (themePref()) document.documentElement.setAttribute('data-theme', themePref());

  var gate = document.getElementById('gate');
  function ask(msg) {
    gate.innerHTML = '<h1>Starshopping · Самбар</h1><p>Түлхүүрээ оруулна уу. Нэг удаа оруулахад энэ төхөөрөмж санана.</p>'
      + '<form id="kf"><input id="ki" type="password" autocomplete="current-password" placeholder="түлхүүр"><button>Нээх</button></form>'
      + (msg ? '<div class="err">' + msg + '</div>' : '');
    document.getElementById('kf').addEventListener('submit', function (e) {
      e.preventDefault(); store(document.getElementById('ki').value.trim()); location.reload();
    });
  }
  if (!key) return ask('');

  /* S2 (2026-10-04): УНШИХ дуудлага n8n-ээр БИШ, Supabase RPC board_read-ээр (n8n ажиллагаа зарцуулахгүй).
     Түлхүүр DB талд sha256 hash-аар шалгагдана. Сүлжээ/сервер унавал л n8n руу буцна (нөөц зам). */
  var SB_RPC = 'https://tdnjnqftxschbliumwwm.supabase.co/rest/v1/rpc/board_read';
  var SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbmpucWZ0eHNjaGJsaXVtd3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNzExNTgsImV4cCI6MjEwNDk0NzE1OH0.lND_YBbjyCNT-yIa27OZ3V-1_fn76i9JUYrOfrXbC1w';
  function viaN8n(v, extra) {
    return fetch(DATA_URL + '?view=' + v + '&k=' + encodeURIComponent(key) + (extra || ''), { cache: 'no-store' })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) { store(''); throw new Error('key'); }
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      });
  }
  function get(v, extra) {
    var p = { view: v, k: key };
    new URLSearchParams((extra || '').replace(/^&/, '')).forEach(function (val, name) { if (name !== 'k' && name !== 'view') p[name] = val; });
    return fetch(SB_RPC, { method: 'POST', cache: 'no-store',
      headers: { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p: p }) })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) { store(''); throw new Error('key'); }
        if (!r.ok) return viaN8n(v, extra);
        return r.json();
      }, function () { return viaN8n(v, extra); });
  }
  // extra: 'view' эсвэл { view, range:'month'|'all' } (мөнгөний хугацаа УБ цагаар)
  function ubToday() { var t = new Date(Date.now() + 8 * 3600000); return t.toISOString().slice(0, 10); }
  function xget(spec) {
    if (typeof spec === 'string') return get(spec);
    var to = ubToday(), from = spec.range === 'month' ? to.slice(0, 8) + '01' : '2026-01-01';
    return get(spec.view, '&from=' + from + '&to=' + to);
  }
  window.ssGet = get; window.ssToday = ubToday;   // самбарын жижиг хэсгүүд (Эцсийн тайлан) өөрсдөө өгөгдөл татна
  /* ---- Унахгүй ачаалалт (блок GZ, 2026-11-13) ----
     Эзэн: «?view=money — Cannot read properties of null (reading 'out_business')». Нэг жагсаалтад ганц хоосон
     мөр ирэхэд зурагч унаж, хуудас бүхэлдээ алдааны дэлгэц болдог байв. Гурван давхар хамгаалалт:
       1) scrub — өгөгдөл зурагчид очихоос өмнө мөрүүдийн жагсаалтаас null-ыг авна (бүх хуудас);
       2) boot — сүлжээний түр алдаанд 2 удаа өөрөө дахин оролдоно;
       3) keep — амжилттай зурсан сүүлийн хуудсыг энэ төхөөрөмжид хадгалж, ачаалж чадахгүй бол түүнийг
          «хадгалсан хуулбар» гэсэн туузтай харуулаад цаанаа дахин оролдоно. Харилцагчийн утас/хаяг
          гардаг хуудсыг (захиалга, алдагдал, тест, нөөц, нүүр) ХАДГАЛАХГҮЙ — зөвхөн keep:true. */
  function scrub(v) {
    if (Array.isArray(v)) {
      var rows = v.some(function (x) { return x && typeof x === 'object'; });
      var empty = v.length > 0 && v.every(function (x) { return x === null || x === undefined; });
      var out = rows || empty ? v.filter(function (x) { return x !== null && x !== undefined; }) : v;   // тоон цуваан дахь null (хоосон өдөр) хэвээр
      for (var i = 0; i < out.length; i++) out[i] = scrub(out[i]);
      return out;
    }
    if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { v[k] = scrub(v[k]); });
    return v;
  }
  var KEEP = 'ss_board_last:' + view;
  function remember(html) {
    if (!V.keep) return;
    try { if (html.length < 1500000) localStorage.setItem(KEEP, JSON.stringify({ t: Date.now(), pq: PQ, html: html })); } catch (e) { /* зай дүүрсэн / private window */ }
  }
  function recall() {
    if (!V.keep) return null;
    try { var c = JSON.parse(localStorage.getItem(KEEP) || 'null'); return c && c.html && c.pq === PQ ? c : null; } catch (e) { return null; }
  }
  /* ---- Дахин ачаалахад хүлээлгэхгүй (блок HC, 2026-11-13) ----
     Эзэн: «refresh хийхэд удаад байдаг болсон». Хэмжсэн: нүүрний dashboard() 8.6–13.9 сек (category_report нэг ачаалалд
     2 удаа ≈5.8 сек, next_actions 1.3 сек), money_page 5 сек × 2, money_summary 3.1 сек. Сервер талыг хурдлуулах нь тусдаа ажил;
     энд: амжилттай зурсан хуудсыг ЭНЭ ТАБ-ын sessionStorage-д үлдээж (таб хаагдахад арилна, төхөөрөмжид үлдэхгүй), дахин
     ачаалахад түүнийг шууд зураад цаанаа шинэ өгөгдлөөр солино. Хуучин өгөгдөл дээр үйлдэл хийлгэхгүй: шинэчлэгдтэл
     товчнууд түгжээтэй (хугацаа/горим солих, цэс, дэлгэх нь чөлөөтэй), зүүн доод буланд «Шинэчилж байна…» гэж харуулна. */
  var WARM = 'ss_board_view:' + view + ':' + PQ, stale = false;
  function stash(html) { try { if (html.length < 2500000) sessionStorage.setItem(WARM, JSON.stringify({ t: Date.now(), html: html })); } catch (e) { /* зай дүүрсэн */ } }
  function unstash() { try { var c = JSON.parse(sessionStorage.getItem(WARM) || 'null'); return c && c.html ? c : null; } catch (e) { return null; } }
  function hhmm(t) { return new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
  function warmChip(text, bad) {
    var el = document.getElementById('ssWarm');
    if (!el) { el = document.createElement('div'); el.id = 'ssWarm'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.style.cssText = 'position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:9999;max-width:calc(100vw - 24px);padding:8px 12px;border-radius:999px;color:#fff;font:600 12px/1.3 system-ui,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.25);background:' + (bad ? '#b45309' : '#1f1a14');
    el.textContent = text;
  }
  function warmGuard() {   // document.write-ийн ДАРАА бүртгэнэ (өмнөх listener-үүд арилдаг)
    var block = function (e) {
      if (!stale) return;
      var b = e.type === 'submit' ? e.target : (e.target.closest && e.target.closest('button, input[type="submit"], input[type="button"]'));
      if (!b || (b.closest && b.closest('.perseg')) || b.id === 'tb' || (b.hasAttribute && b.hasAttribute('data-say'))) return;
      e.preventDefault(); e.stopPropagation();
      var el = document.getElementById('ssWarm'); if (el) { el.style.outline = '2px solid #fff'; setTimeout(function () { el.style.outline = ''; }, 500); }
    };
    document.addEventListener('click', block, true);
    document.addEventListener('submit', block, true);
  }
  function warmRefresh(at, attempt) {
    fetchAll().then(function (html) { stale = false; paint(html); }, function (e) {
      if (e && e.message === 'key') { stale = false; try { sessionStorage.removeItem(WARM); } catch (er) { /* private */ } return location.reload(); }
      warmChip('Шинэ өгөгдөл ирсэнгүй — ' + hhmm(at) + '-ийн хуулбар. Дахин оролдож байна…', true);
      setTimeout(function () { warmRefresh(at, attempt + 1); }, attempt < 2 ? 2500 : 20000);
    });
  }

  /* ---- Амьд шинэчлэл (2026-09-29, v2) ----
     v1 хуудсыг бүхэлд нь location.reload() хийдэг байсан: сайтын үзэгч бүр
     checkout_events-д мөр нэмж 20 сек тутам самбарыг дахин ачаалж, эзний нээсэн
     карт «анивчаад алга» болдог байв. Одоо:
       · өгөгдөл өөрчлөгдвөл зөвхөн өгөгдлийг татаж, <body>-г байранд нь солино
         (хуудас цагаан болохгүй, гүйлгэсэн байрлал + нээсэн карт хадгалагдана);
       · хүн хөдөлж байх үед (сүүлийн 15 сек дарсан/бичсэн, талбар фокустай,
         хариуны самбар нээлттэй) хүлээж, чөлөөтэй болмогц шинэчилнэ;
       · version өөрчлөгдөөгүй ч 10 минут тутам нэг удаа шинэчилнэ (судалгааны
         хүснэгтүүд version-д ороогүй). */
  var lastAct = Date.now(), pending = false, painting = false;
  function busy() {
    var a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
    if (Date.now() - lastAct < 15000) return true;
    if (document.querySelector('.out.on')) return true;           // үйлдлийн хариу уншиж байна
    return false;
  }
  function fetchAll() {
    var ex = Object.keys(V.extra).map(function (name) { return { name: name, p: xget(V.extra[name]).catch(function () { return null; }) }; });
    if (view === 'research' && q.tab === 'pack' && q.c) ex.push({ name: 'pack', p: get('pack', '&c=' + encodeURIComponent(q.c)) });
    return Promise.all([get(V.data, PQ)].concat(ex.map(function (x) { return x.p; }))).then(function (res) {
      var d = scrub(res[0] || {});
      ex.forEach(function (x, i) { if (res[i + 1]) d[x.name] = scrub(res[i + 1]); });
      var html;
      try { html = window[V.render](d, q); if (typeof html !== 'string' || !html) throw new Error('хоосон хуудас'); }
      catch (er) { er.render = true; throw er; }   // өгөгдөл ирсэн ч зурж чадаагүй — дахин татаад нэмэргүй
      html = stamp(html.replace('<style>', '<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="board.css?t=' + (Date.now() / 60000 | 0) + '"><style>'));
      remember(html); stash(html);
      return html;
    });
  }
  // Дараагийн зурагт нээлттэй байсныг сэргээх түлхүүрүүд (data-keep="..." бүхий элементүүд)
  function snapshot() {
    return {
      y: window.scrollY,
      open: Array.prototype.map.call(document.querySelectorAll('[data-keep].open, details[data-keep][open]'), function (el) { return el.getAttribute('data-keep'); })
    };
  }
  function restore(st) {
    (st.open || []).forEach(function (k) {
      var el = document.querySelector('[data-keep="' + (window.CSS && CSS.escape ? CSS.escape(k) : k) + '"]');
      if (!el) return;
      if (el.tagName === 'DETAILS') el.open = true;
      else el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    window.scrollTo(0, st.y);
  }
  function paint(html) {
    var st = snapshot();
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var old = document.getElementById('ssHealth');
    document.body.replaceWith(document.adoptNode(doc.body));
    // DOMParser-ийн <script> идэвхгүй — шинээр үүсгэж ажиллуулна
    document.body.querySelectorAll('script').forEach(function (sc) {
      var n = document.createElement('script');
      for (var i = 0; i < sc.attributes.length; i++) n.setAttribute(sc.attributes[i].name, sc.attributes[i].value);
      n.textContent = sc.textContent;
      sc.replaceWith(n);
    });
    if (old) document.body.appendChild(old);
    var hs = doc.head.querySelectorAll('style'), cur = document.head.querySelectorAll('style');
    if (hs.length && cur.length && hs[hs.length - 1].textContent !== cur[cur.length - 1].textContent) cur[cur.length - 1].textContent = hs[hs.length - 1].textContent;
    restore(st);
    themeBtn();
  }
  function refresh(force) {
    if (painting) return;
    if (!force && busy()) { pending = true; return; }
    painting = true; pending = false;
    fetchAll().then(paint).catch(function () { /* дараагийн удаа */ }).then(function () { painting = false; });
  }
  function live() {
    var ver = null, T = 120000, IDLE = 600000, lastPaint = Date.now();   // n8n квот: 20с→120с, 10 мин идэвхгүй бол зогсоно
    // document.open() нь window-ийн listener-үүдийг арилгадаг тул зурсны ДАРАА бүртгэнэ
    ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(function (ev) {
      window.addEventListener(ev, function () {
        var wasIdle = Date.now() - lastAct > IDLE; lastAct = Date.now();
        if (wasIdle) tick();   // удаан зогссоны дараа буцаж ирвэл шууд шалгана
      }, { passive: true, capture: true });
    });
    function tick() {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastAct > IDLE) return;   // 10 мин хөдлөөгүй бол n8n дуудахгүй
      if (pending && !busy()) { refresh(); lastPaint = Date.now(); return; }
      get('version').then(function (r) {
        var v = r && r.v; if (!v) return;
        if (ver === null) { ver = v; return; }
        if (v !== ver) { ver = v; refresh(); lastPaint = Date.now(); }
        else if (Date.now() - lastPaint > 600000) { refresh(); lastPaint = Date.now(); }
      }).catch(function () { /* сүлжээ түр тасарвал дараагийн удаа */ });
    }
    function health() {
      if (document.visibilityState !== 'visible' || Date.now() - lastAct > IDLE) return;
      get('health').then(function (h) {
        if (!h || !h.overall || h.overall === 'none') return;
        var el = document.getElementById('ssHealth');
        if (!el) {
          el = document.createElement('a'); el.id = 'ssHealth'; el.href = '/board/';
          el.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9999;font:12px/1 system-ui,sans-serif;padding:8px 12px;border-radius:999px;color:#fff;text-decoration:none;box-shadow:0 2px 10px rgba(0,0,0,.25)';
          document.body.appendChild(el);
        }
        var n = (h.checks || []).filter(function (c) { return c.status !== 'ok'; }).length;
        el.style.background = h.overall === 'fail' ? '#c62828' : h.overall === 'warn' ? '#ef6c00' : '#2e7d32';
        el.textContent = '🩺 ' + (h.overall === 'ok' ? 'бүгд хэвийн' : n + ' асуудал') + ' · ' + new Date(h.checked_at).toLocaleTimeString('mn', { hour: '2-digit', minute: '2-digit' });
        el.title = (h.checks || []).filter(function (c) { return c.status !== 'ok'; }).map(function (c) { return c.status + ' ' + c.key; }).join('\n') || 'Бүх шалгалт OK';
      }).catch(function () {});
    }
    // «Шинэчлэх» товч: хуудас дахин ачаалахгүйгээр
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a.rf[href=""]');   // зөвхөн «Шинэчлэх»; бусад .rf холбоос навигац хэвээр
      if (!a) return;
      e.preventDefault(); pending = false; refresh(true);
    });
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('#tb');
      if (!b) return;
      var next = themeNow() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(TKEY, next); } catch (er) { /* private window */ }
      document.documentElement.setAttribute('data-theme', next);
      themeBtn();
    });
    /* блок GN (11-11): 🎤 «Тайлан» — өглөөний тайланг монгол хоолойгоор уншина (Edge function brief-voice → Чимэгэ TTS, өдөрт 1 удаа үүсгэнэ).
       Аль ч хуудсын [data-say] товч; хуудас солихгүй. Дахин дарвал зогсоно. */
    var SAY = { a: null, busy: false };
    function sayLabel(t) { document.querySelectorAll('[data-say]').forEach(function (b) { b.textContent = t; }); }
    function sayNote(t) {
      var el = document.getElementById('ssSay');
      if (!t) { if (el) el.remove(); return; }
      if (!el) { el = document.createElement('div'); el.id = 'ssSay';
        el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:9998;max-width:min(560px,calc(100vw - 32px));padding:12px 16px;border-radius:14px;background:#1f1a14;color:#fff;font:600 14px/1.45 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.3)';
        document.body.appendChild(el); }
      el.textContent = t;
    }
    function sayStop() { if (SAY.a) { SAY.a.pause(); SAY.a = null; } sayLabel('🎤 Тайлан'); sayNote(''); }
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-say]');
      if (!b) return;
      e.preventDefault();
      if (SAY.a) return sayStop();
      if (SAY.busy) return;
      SAY.busy = true; sayLabel('⏳ Бэлдэж байна…');
      // iPhone/Safari: дууг ДАРСАН агшинд нээж өгөхгүй бол дараа нь play() хориглогдоно → чимээгүй богино дуугаар «түгжээ тайлна»
      var au = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=');
      au.play().catch(function () { /* зүгээр */ });
      var voice = ''; try { voice = localStorage.getItem('ss_voice') || ''; } catch (er) { /* private */ }
      fetch(SB_RPC.replace('/rest/v1/rpc/board_read', '/functions/v1/brief-voice'), { method: 'POST',
        headers: { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ k: key, voice: voice }) })
        .then(function (r) {
          if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.err || ('http ' + r.status)); });
          var h = ''; try { h = decodeURIComponent(r.headers.get('X-Headline') || ''); } catch (er) { h = ''; }
          return r.blob().then(function (bl) {
            var a = au; a.src = URL.createObjectURL(bl); SAY.a = a;
            a.onended = sayStop; a.onerror = sayStop;
            sayLabel('■ Зогсоох'); sayNote(h);
            return a.play();
          });
        })
        .catch(function (er) {
          SAY.a = null; sayLabel('🎤 Тайлан');
          var m = { no_voice_key: 'Дуу хоолойн токен тохируулаагүй байна.', month_cap: 'Энэ сарын дуудалтын хязгаарт хүрсэн — дараа сар хүртэл уншихгүй.', key: 'Самбарын түлхүүр буруу.' }[er.message] || ('Дуу гарсангүй (' + er.message + ').');
          sayNote(m); setTimeout(function () { if (!SAY.a) sayNote(''); }, 6000);
        })
        .then(function () { SAY.busy = false; });
    });
    window.ssRefresh = function () { refresh(true); };
    tick(); health();
    setInterval(tick, T); setInterval(health, 600000);
  }

  function show(html) { document.open(); document.write(html); document.close(); live(); themeBtn(); }
  function boot(attempt) {
    var warm = attempt === 0 ? unstash() : null;
    if (warm) {   // энэ табд өмнө нь зурсан хуудас: шууд харуулаад цаанаа шинэчилнэ
      stale = true;
      show(warm.html);
      warmGuard();
      warmChip('⟳ Шинэчилж байна… · ' + hhmm(warm.t) + '-ийн өгөгдөл', false);
      return warmRefresh(warm.t, 0);
    }
    fetchAll().then(show, function (e) {
      var why = e && e.message ? String(e.message) : 'тодорхойгүй';
      if (why === 'key') return ask('Түлхүүр буруу байна.');
      // сүлжээ/серверийн түр алдаа: 2 удаа өөрөө дахин оролдоно (зурагчийн алдаанд дахин татахгүй)
      if (!(e && e.render) && attempt < 2) {
        gate.innerHTML = '<h1>Starshopping · Самбар</h1><p>Ачааллаж байна… (дахин оролдож байна ' + (attempt + 1) + '/2)</p>';
        return setTimeout(function () { boot(attempt + 1); }, 1500 * (attempt + 1));
      }
      var c = recall();
      if (c) {
        // сүүлд амжилттай зурсан хуудас + тууз; цаанаа 20 сек тутам дахин оролдож, амжмагц тууз өөрөө алга болно
        var at = new Date(c.t).toLocaleString('mn', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        var bar = '<div id="ssStale" role="status" style="position:fixed;left:0;right:0;top:0;z-index:9999;padding:8px 12px;background:#b45309;color:#fff;font:600 13px/1.4 system-ui,sans-serif;text-align:center">Шинэ өгөгдөл ачаалж чадсангүй — ' + at + '-д хадгалсан хуулбар. Өөрөө дахин оролдож байна…</div>';
        show(c.html.replace(/<\/body>(?![\s\S]*<\/body>)/, bar + '</body>'));
        var again = setInterval(function () {
          if (!document.getElementById('ssStale')) return clearInterval(again);
          if (window.ssRefresh) window.ssRefresh();
        }, 20000);
        return;
      }
      gate.innerHTML = '<h1>Starshopping · Самбар</h1><p>Өгөгдөл ачаалж чадсангүй. 20 секундын дараа өөрөө дахин оролдоно.</p>'
        + '<form id="rf"><button>Одоо дахин оролдох</button></form><div class="err" style="font-size:12px">' + why.replace(/</g, '&lt;') + '</div>';
      var t = setTimeout(function () { boot(0); }, 20000);
      document.getElementById('rf').addEventListener('submit', function (ev) {
        ev.preventDefault(); clearTimeout(t);
        gate.innerHTML = '<h1>Starshopping · Самбар</h1><p>Ачааллаж байна…</p>'; boot(0);
      });
    });
  }
  boot(0);
})();
