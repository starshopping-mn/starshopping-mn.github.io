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
    tests:    { data: 'tests',    extra: {}, render: 'renderTests' },                           // нүүр: тестийн урсгал (блок AR)
    category: { data: 'mission',  extra: { modes: 'modes', queue: 'queue' }, render: 'renderMission' }, // категорийн 7 хоногийн даалгавар (блок AD)
    research: { data: 'research', extra: {}, render: 'renderResearch' },
    board:    { data: 'board',    extra: {}, render: 'renderBoard' }
  };
  if (q.view === 'mission') q.view = 'category';           // хуучин холбоос
  var view = VIEWS[q.view] ? q.view : 'tests';
  var V = VIEWS[view];

  function store(k) { try { if (k) localStorage.setItem(KEY_NAME, k); else localStorage.removeItem(KEY_NAME); } catch (e) { /* private window */ } }
  function load() { try { return localStorage.getItem(KEY_NAME) || ''; } catch (e) { return ''; } }

  var m = location.hash.match(/(?:^#|&)k=([^&]+)/);
  if (m) { store(decodeURIComponent(m[1])); history.replaceState(null, '', location.pathname + location.search); }
  var key = load();

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

  function get(v, extra) {
    return fetch(DATA_URL + '?view=' + v + '&k=' + encodeURIComponent(key) + (extra || ''), { cache: 'no-store' })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) { store(''); throw new Error('key'); }
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      });
  }
  // «Орох багц» өөр категорит: судалгааны өгөгдөл + тухайн категорийн багц
  var extras = Object.keys(V.extra).map(function (name) { return { name: name, p: get(V.extra[name]).catch(function () { return null; }) }; });
  if (view === 'research' && q.tab === 'pack' && q.c) extras.push({ name: 'pack', p: get('pack', '&c=' + encodeURIComponent(q.c)) });

  /* ---- Амьд шинэчлэл (2026-09-28) ----
     Хуудас нэг л удаа зурагддаг байсан. Одоо 20 сек тутамд board_version-ийг асууна:
     Supabase-д юу ч өөрчлөгдвөл (захиалга, мессеж, эрүүл мэнд, тест) md5 өөрчлөгдөж,
     хуудас өөрөө дахин ачаална. Хүн бичиж байх үед (input фокустай) хүлээнэ,
     таб харагдахгүй үед асуухгүй. Эрүүл мэндийн тайл дээд буланд амьд байна. */
  function live() {
    var ver = null, T = 20000;
    function busy() { var a = document.activeElement; return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName); }
    function tick() {
      if (document.visibilityState !== 'visible') return;
      get('version').then(function (r) {
        var v = r && r.v; if (!v) return;
        if (ver === null) { ver = v; return; }
        if (v !== ver && !busy()) location.reload();
      }).catch(function () { /* сүлжээ түр тасарвал дараагийн удаа */ });
    }
    function health() {
      get('health').then(function (h) {
        if (!h || !h.overall || h.overall === 'none') return;
        var el = document.getElementById('ssHealth');
        if (!el) {
          el = document.createElement('a'); el.id = 'ssHealth'; el.href = '?view=tests#health';
          el.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9999;font:12px/1 system-ui,sans-serif;padding:8px 12px;border-radius:999px;color:#fff;text-decoration:none;box-shadow:0 2px 10px rgba(0,0,0,.25)';
          document.body.appendChild(el);
        }
        var n = (h.checks || []).filter(function (c) { return c.status !== 'ok'; }).length;
        el.style.background = h.overall === 'fail' ? '#c62828' : h.overall === 'warn' ? '#ef6c00' : '#2e7d32';
        el.textContent = '🩺 ' + (h.overall === 'ok' ? 'бүгд хэвийн' : n + ' асуудал') + ' · ' + new Date(h.checked_at).toLocaleTimeString('mn', { hour: '2-digit', minute: '2-digit' });
        el.title = (h.checks || []).filter(function (c) { return c.status !== 'ok'; }).map(function (c) { return c.status + ' ' + c.key; }).join('\n') || 'Бүх шалгалт OK';
      }).catch(function () {});
    }
    tick(); health();
    setInterval(tick, T); setInterval(health, 60000);
  }

  Promise.all([get(V.data)].concat(extras.map(function (x) { return x.p; })))
    .then(function (res) {
      var d = res[0] || {};
      extras.forEach(function (x, i) { if (res[i + 1]) d[x.name] = res[i + 1]; });
      var html = window[V.render](d, q);
      html = html.replace('<style>', '<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="board.css"><style>');
      document.open(); document.write(html); document.close();
      live();
    })
    .catch(function (e) {
      if (e.message === 'key') return ask('Түлхүүр буруу байна.');
      gate.innerHTML = '<h1>Starshopping · Самбар</h1><p>Өгөгдөл ачаалж чадсангүй (' + e.message + '). Дахин ачаална уу.</p>';
    });
})();
