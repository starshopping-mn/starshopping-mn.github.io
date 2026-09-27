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

  Promise.all([get(V.data)].concat(extras.map(function (x) { return x.p; })))
    .then(function (res) {
      var d = res[0] || {};
      extras.forEach(function (x, i) { if (res[i + 1]) d[x.name] = res[i + 1]; });
      var html = window[V.render](d, q);
      html = html.replace('<style>', '<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="board.css"><style>');
      document.open(); document.write(html); document.close();
    })
    .catch(function (e) {
      if (e.message === 'key') return ask('Түлхүүр буруу байна.');
      gate.innerHTML = '<h1>Starshopping · Самбар</h1><p>Өгөгдөл ачаалж чадсангүй (' + e.message + '). Дахин ачаална уу.</p>';
    });
})();
