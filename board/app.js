/* Нэгдсэн навигаци (C3, 2026-10-03). Хуудас бүр ssNav('<key>', themeQ) дуудна — цэс нэг газар.
   Нүүр (систем зураглал — бүх мэдээлэл нэг дор, 3D) / Тест / Захиалга / Мөнгө / Нөөц · PO / Судалгаа. Эзний шийдвэр 10-03: хуучин системийн нүүр = Нүүр. */
function ssNav(on, themeQ) {
  var tq = themeQ ? '&theme=' + themeQ : '';
  var items = [
    ['home', '/board/' + (themeQ ? '?theme=' + themeQ : ''), 'Нүүр'],
    ['tests', '/board/?view=tests' + tq, 'Тест'],
    ['orders', '/board/?view=orders' + tq, 'Захиалга'],
    ['money', '/board/?view=money' + tq, 'Мөнгө'],
    ['ops', '/board/?view=ops' + tq, 'Нөөц · PO'],
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
    home:     { data: 'board',    extra: { funnel_ads: 'funnel', meta: 'meta', money_m: { view: 'money', range: 'month' }, money_a: { view: 'money', range: 'all' }, rep_m: { view: 'report', range: 'month' } }, render: 'renderBoard' },  // НҮҮР: системийн зураглал (3D, бүх мэдээлэл нэг дор) — эзний шийдвэр 10-03
    tests:    { data: 'tests',    extra: {}, render: 'renderTests' },                           // тестийн урсгал (блок AR)
    research: { data: 'research', extra: {}, render: 'renderResearch' },
    board:    { data: 'board',    extra: { funnel_ads: 'funnel', meta: 'meta', money_m: { view: 'money', range: 'month' }, money_a: { view: 'money', range: 'all' }, rep_m: { view: 'report', range: 'month' } }, render: 'renderBoard' },  // блок BC: бараа × зар маягт
    ops:      { data: 'stock',    extra: { waitlist: 'waitlist', reorder: 'reorder' }, render: 'renderOps' }, // блок BF→C3: зөвхөн нөөц · PO (захиалга→orders, мөнгө→money)
    orders:   { data: 'orders2',  extra: { districts: 'districts' }, render: 'renderOrders', passQuery: true }, // блок C1: захиалга (хаягтай / сонирхол), шүүлт = URL query
    money:    { data: 'money',    extra: {}, render: 'renderMoney', passQuery: true } // блок C2: мөнгө — зардал vs орлого, дэвтэр
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
  if (V.passQuery) { var ps = new URLSearchParams(); Object.keys(q).forEach(function (k) { if (k !== 'view' && k !== 'theme' && k !== 'k' && q[k] !== '') ps.append(k, q[k]); }); PQ = ps.toString() ? '&' + ps.toString() : ''; }

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
  // «Орох багц» өөр категорит: судалгааны өгөгдөл + тухайн категорийн багц
  var extras = Object.keys(V.extra).map(function (name) { return { name: name, p: xget(V.extra[name]).catch(function () { return null; }) }; });
  if (view === 'research' && q.tab === 'pack' && q.c) extras.push({ name: 'pack', p: get('pack', '&c=' + encodeURIComponent(q.c)) });

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
      var d = res[0] || {};
      ex.forEach(function (x, i) { if (res[i + 1]) d[x.name] = res[i + 1]; });
      var html = window[V.render](d, q);
      return stamp(html.replace('<style>', '<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="board.css?t=' + (Date.now() / 60000 | 0) + '"><style>'));
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
    window.ssRefresh = function () { refresh(true); };
    tick(); health();
    setInterval(tick, T); setInterval(health, 600000);
  }

  Promise.all([get(V.data, PQ)].concat(extras.map(function (x) { return x.p; })))
    .then(function (res) {
      var d = res[0] || {};
      extras.forEach(function (x, i) { if (res[i + 1]) d[x.name] = res[i + 1]; });
      var html = window[V.render](d, q);
      html = stamp(html.replace('<style>', '<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="board.css?t=' + (Date.now() / 60000 | 0) + '"><style>'));
      document.open(); document.write(html); document.close();
      live(); themeBtn();
    })
    .catch(function (e) {
      if (e.message === 'key') return ask('Түлхүүр буруу байна.');
      gate.innerHTML = '<h1>Starshopping · Самбар</h1><p>Өгөгдөл ачаалж чадсангүй (' + e.message + '). Дахин ачаална уу.</p>';
    });
})();
