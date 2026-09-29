/* Даалгавар · ТЕСТИЙН УРСГАЛ (блок AR). Нүүр хуудас.
   Өгөгдөл: /webhook/board-data?view=tests → test_board() — нэг дуудлага, бүх төлөв.
   Товч бүр = SQL-ийн нэг шилжилт: POST action=select | step | launch | result | drop | mode.
   Зарчим: ойлгомжтой байх — нэг харцаар «одоо юу хийх вэ» харагдана; чимэглэл биш, төлөв. */
function renderTests(DATA, QUERY) {
  const d = DATA || {};
  const Q = QUERY || {};
  const themeQ = Q.theme === 'dark' || Q.theme === 'light' ? Q.theme : '';
  const tq = themeQ ? '&theme=' + themeQ : '';
  const BASE = 'https://starshopping.app.n8n.cloud';

  const A = (v) => (Array.isArray(v) ? v : []);
  const n = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v));
  const has = (v) => v !== null && v !== undefined && v !== '';
  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const mnt = (v) => (has(v) ? Math.round(n(v)).toLocaleString('en-US') + '₮' : '—');
  const big = (v) => { if (!has(v)) return '—'; const x = n(v);
    return x >= 1e6 ? (x / 1e6).toFixed(1).replace('.0', '') + 'сая' : x >= 1e3 ? Math.round(x / 1e3) + 'м' : String(x); };
  const url = (u) => (/^https?:\/\//i.test(String(u || '')) ? esc(u) : '');
  // AR6: вирал reel ба 1688 товч (Amazon самбарт хэрэггүй — эзэн 2026-09-27)
  const bigN = (v) => { v = n(v); return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'K' : String(v); };
  const reelBtn = (c) => url(c.reel_url)
    ? '<a class="lb tt" href="' + url(c.reel_url) + '" target="_blank" rel="noopener">▶ ' + (/instagram/i.test(c.reel_url) ? 'Instagram' : 'TikTok') + ' reel<small>' + esc(String(c.reel_posted_at || '').slice(0, 10) || 'огноо?') + ' · ' + (has(c.reel_views) ? bigN(c.reel_views) + ' үзэлт' : '—') + '</small></a>'
    : '<span class="lb no">▶ reel холбоогүй<small>огноо, үзэлт шалгаагүй</small></span>';
  const cnBtn = (c) => /1688\.com\/offer\//.test(String(c.cn_offer_url || ''))
    ? '<a class="lb cn" href="' + url(c.cn_offer_url) + '" target="_blank" rel="noopener">🛒 1688 — авах бараа<small>¥' + esc(c.cn_price == null ? '?' : c.cn_price) + (has(c.cn_sold) ? ' · ' + n(c.cn_sold).toLocaleString('en-US') + 'ш зарагдсан' : '') + (c.weight_g ? ' · ' + n(c.weight_g) + 'г' : '') + '</small></a>'
    : '<span class="lb no">🛒 1688 offer алга<small>зургаар сонгох хэрэгтэй</small></span>';
  const day = (s) => (s ? String(s).slice(0, 10) : '—');
  // AZ: 1688 өртөг = Эрээнд ирэх нийт (бараа + Хятад доторх хүргэлт)
  const cny = (c) => '¥' + esc(c.cn_price) + (has(c.cn_item_cny) ? ' (бараа ¥' + esc(c.cn_item_cny) + ' + Хятад дотор ¥' + esc(c.cn_ship_cny) + (c.cn_ship_checked ? '' : ' таамаг') + ')' : '');
  // AY: тестийн барааны карт — яг ямар бараа тестлэгдэж байгааг 100% харуулна
  const MODE = { test: 'ТЕСТ горим', preorder: 'Урьдчилсан', live: 'Борлуулалт', stop: 'Зогссон' };
  const rankTag = (r) => (has(r) ? '<span class="gt rk2" title="Судалгааны нэг ранк — тестэд орсон ч дугаараа хадгална">Ранк #' + n(r) + '</span>' : '<span class="gt mu">ранкаас гарсан</span>');
  const pcard = (k) => {
    if (!k || !k.name) return '<div class="tpc tpe">Бараа бүртгэгдээгүй — маягт 13-аар ТЕСТ горимд бүртгэмэгц энд зураг, үнэ, SKU, зарын нэр гарна.'
      + (k && /1688\.com\/offer\//.test(String(k.cn_offer_url || '')) ? '<div class="lk"><a class="lb cn" href="' + url(k.cn_offer_url) + '" target="_blank" rel="noopener">🛒 1688 — авах бараа<small>¥' + esc(k.cn_price == null ? '?' : k.cn_price) + '</small></a></div>' : '') + '</div>';
    const sk = A(k.skus), cr = A(k.creatives);
    return '<div class="tpc">' + (url(k.image) ? '<img src="' + url(k.image) + '" alt="" loading="lazy">' : '<div class="tpi">зураг алга</div>')
      + '<div class="tpb"><div class="tpn">' + esc(k.name) + '</div>'
      + '<div class="tpm">' + mnt(k.price_mnt) + ' · <span class="gt ' + (k.mode === 'test' ? 'wr' : k.mode === 'live' ? 'ok' : 'mu') + '">' + esc(MODE[k.mode] || k.mode || '—') + '</span>'
      + (has(k.cn_price) ? ' · өртөг ' + cny(k) + (k.weight_g ? ' · ' + n(k.weight_g) + 'г' : '') : '') + '</div>'
      + '<div class="tpm">SKU: ' + (sk.length ? sk.map((x) => esc([x.color, x.size].filter(Boolean).join(' ') || x.sku_id)).join(' · ') : '<b style="color:var(--warn)">алга</b>') + '</div>'
      + '<div class="tpm">Креатив: ' + (cr.length ? cr.map((x) => '<code>' + esc(x.id) + '</code>' + (x.angle ? ' ' + esc(String(x.angle).slice(0, 24)) : '')).join(' · ') : '<b style="color:var(--warn)">алга</b>') + '</div>'
      + '<div class="tpm">Дараагийн зарын нэр: <code>' + esc(k.ad_name_example || '—') + '</code> <span style="color:var(--mut)">— Meta-д ингэж нэрлэвэл автоматаар бүртгэгдэнэ</span></div>'
      + '<div class="lk">' + (url(k.site_url) ? '<a class="lb tt" href="' + url(k.site_url) + '" target="_blank" rel="noopener">🌐 Сайт дээрх хуудас<small>' + esc(k.slug || '') + '</small></a>' : '')
      + (/1688\.com\/offer\//.test(String(k.cn_offer_url || '')) ? '<a class="lb cn" href="' + url(k.cn_offer_url) + '" target="_blank" rel="noopener">🛒 1688 — авах бараа<small>¥' + esc(k.cn_price == null ? '?' : k.cn_price) + '</small></a>' : '<span class="lb no">🛒 1688 offer алга<small>зургаар сонгох хэрэгтэй</small></span>')
      + '</div></div></div>';
  };
  const ntf = (x) => { x = x || {}; const q = n(x.queued), se = n(x.sent), fl = n(x.failed);
    return q + se + fl ? '<span class="gt ' + (fl ? 'no' : q ? 'wr' : 'ok') + '">мессеж: илгээсэн ' + se + (q ? ' · хүлээгдэж ' + q : '') + (fl ? ' · алдаа ' + fl : '') + '</span>' : ''; };
  const ago = (s) => { if (!s) return ''; const h = Math.round((Date.now() - new Date(s).getTime()) / 36e5);
    return h < 1 ? 'саяхан' : h < 48 ? h + ' цагийн өмнө' : Math.round(h / 24) + ' хоногийн өмнө'; };

  const C = A(d.candidates), ACT = A(d.active), EV = A(d.evaluating), HIS = A(d.history), LEARN = A(d.learn);
  const S = d.slots || {}, ST = d.settings || {};
  const free = Math.max(0, n(S.max) - n(S.used));

  const P = []; const o = (s) => P.push(s);
  o('<!doctype html><html lang="mn"' + (themeQ ? ' data-theme="' + themeQ + '"' : '') + '><head><meta charset="utf-8">');
  o('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark">');
  o('<title>Starshopping · Даалгавар</title><style>');
  o('');
  o('.nav{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 6px}.nav a{padding:8px 14px;border-radius:999px;border:1px solid var(--ln);background:var(--s1);color:var(--ink2);text-decoration:none;font-size:13px;font-weight:600}.nav a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
   + '.hero{background:var(--s1);border:1px solid var(--ln);border-radius:var(--r);padding:18px 20px;margin:10px 0 16px}'
   + '.hero .tag{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);font-weight:700}.hero h1{font-size:22px;margin:4px 0 6px;line-height:1.25}.hero .sub{font-size:13px;color:var(--ink2);line-height:1.5;max-width:820px}'
   + '.flow{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.flow span{font-size:11px;font-weight:700;padding:5px 10px;border-radius:999px;background:var(--s2);color:var(--mut)}.flow span.on{background:var(--blue-a);color:var(--blue)}.flow span.ok{background:var(--good-a);color:var(--good)}'
   + '.sec{display:flex;align-items:baseline;gap:10px;margin:22px 0 8px}.sec b{font-size:16px}.sec .st{font-size:12px;color:var(--mut)}'
   + '.cands{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}'
   + '.cd{background:var(--s1);border:1px solid var(--ln);border-radius:var(--r);padding:14px;cursor:pointer;transition:border-color .15s,transform .15s;position:relative}.cd:hover{border-color:var(--ln2)}.cd.open{border-color:var(--blue);box-shadow:var(--sh)}.cd.busy{opacity:.55}'
   + '.cd .rk{position:absolute;top:10px;right:12px;font-size:22px;font-weight:800;color:var(--mut);font-variant-numeric:tabular-nums}.cd.r1 .rk{color:var(--gold)}'
   + '.cd .nm{font-size:15px;font-weight:700;padding-right:36px;line-height:1.3}.cd .mt{font-size:12px;color:var(--mut);margin-top:4px}'
   + '.cd .sc{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px}.cd .sc b{font-size:18px;font-variant-numeric:tabular-nums}.cd .sc i{flex:1;height:6px;border-radius:3px;background:var(--s2);overflow:hidden;font-style:normal}.cd .sc i u{display:block;height:100%;background:var(--f3)}'
   + '.vf{display:flex;gap:3px;margin-top:10px}.vf span{flex:1;height:7px;border-radius:2px;background:var(--s2)}.vf span.ok{background:var(--good)}.vf span.no{background:var(--crit-a)}'
   + '.cd .src{font-size:12px;color:var(--ink2);margin-top:8px}.cd .src a{color:var(--blue);text-decoration:none}'
   + '.lk{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.lb{flex:1;min-width:130px;display:block;padding:8px 10px;border-radius:10px;font-size:12px;font-weight:700;text-decoration:none;line-height:1.35;border:1px solid var(--line)}.lb small{display:block;font-weight:500;color:var(--mut);font-size:11px}.lb.tt{background:var(--s2);color:var(--ink)}.lb.cn{background:var(--warn-a);color:var(--ink)}.lb.no{background:var(--crit-a);color:var(--crit);border-color:transparent}.lb:hover{border-color:var(--blue)}'
   + '.gt{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap;display:inline-block}.gt.ok{background:var(--good-a);color:var(--good)}.gt.wr{background:var(--warn-a);color:var(--warn)}.gt.no{background:var(--crit-a);color:var(--crit)}.gt.bl{background:var(--blue-a);color:var(--blue)}.gt.mu{background:var(--s2);color:var(--mut)}'
   + '.btn{font:inherit;font-size:13px;font-weight:700;padding:8px 14px;border-radius:9px;border:1px solid var(--ln);background:var(--s1);color:var(--ink);cursor:pointer}.btn.p{background:var(--ink);color:var(--bg);border-color:var(--ink)}.btn.g{background:var(--good);color:#fff;border-color:var(--good)}.btn.r{background:var(--crit);color:#fff;border-color:var(--crit)}.btn:disabled{opacity:.45;cursor:not-allowed}.btn.s{font-size:12px;padding:6px 10px}'
   + '.det{grid-column:1/-1;background:var(--s1);border:1px solid var(--blue);border-radius:var(--r);padding:16px;display:none}.det.on{display:block}'
   + '.det h3{margin:0 0 8px;font-size:16px}.chk{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin:10px 0}.chk div{border:1px solid var(--ln3);border-radius:var(--r-s);padding:8px 10px;font-size:12px}.chk div b{display:block;font-size:12px}.chk div.ok{border-color:var(--good-a);background:var(--good-a)}.chk div.no{border-color:var(--crit-a)}'
   + '.kv{font-size:13px;line-height:1.6}.kv span{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-right:6px}'
   + '.tc{background:var(--s1);border:1px solid var(--ln);border-radius:var(--r);padding:16px;margin:10px 0}.tc .hd2{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.tc .hd2 h3{margin:0;font-size:17px;flex:1;min-width:180px}'
   + '.prog{height:8px;background:var(--s2);border-radius:4px;overflow:hidden;margin:12px 0 4px}.prog i{display:block;height:100%;background:var(--good);transition:width .5s ease}'
   + '.steps{display:grid;gap:6px;margin-top:10px}.stp{display:grid;grid-template-columns:30px 1fr auto;gap:10px;align-items:start;padding:10px 12px;border:1px solid var(--ln3);border-radius:var(--r-s);background:var(--bg)}'
   + '.stp .no{width:26px;height:26px;border-radius:50%;background:var(--s2);color:var(--mut);font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center}.stp.done .no{background:var(--good);color:#fff}.stp.now .no{background:var(--blue);color:#fff}.stp.now{border-color:var(--blue)}'
   + '.stp .tt{font-weight:700;font-size:14px}.stp.done .tt{text-decoration:line-through;color:var(--mut)}.stp .dt{font-size:12px;color:var(--ink2);margin-top:2px;line-height:1.45}.stp .ow{font-size:11px;margin-top:4px;color:var(--mut)}.stp .ow.me{color:var(--gold);font-weight:700}'
   + '.launch{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid var(--ln3)}.launch .why{font-size:12px;color:var(--mut);flex:1;min-width:200px}'
   + '.mx{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin:12px 0}.mx>div{background:var(--bg);border:1px solid var(--ln3);border-radius:var(--r-s);padding:10px}.mx .l{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.05em}.mx .v{font-size:18px;font-weight:800;margin-top:2px;font-variant-numeric:tabular-nums}.mx .v small{font-size:11px;color:var(--mut);font-weight:400}'
   + '.sug{border-radius:var(--r-s);padding:12px 14px;font-size:13px;line-height:1.5;margin:8px 0}.sug.win{background:var(--good-a);color:var(--good)}.sug.lose{background:var(--crit-a);color:var(--crit)}.sug.wait{background:var(--s2);color:var(--ink2)}'
   + 'table{width:100%;border-collapse:collapse;font-size:13px}td,th{padding:9px 10px;border-bottom:1px solid var(--ln3);text-align:left;vertical-align:top}th{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.06em}.sc2{overflow:auto;background:var(--s1);border:1px solid var(--ln);border-radius:var(--r)}'
   + '.out{border:1px solid var(--ln);border-radius:var(--r-s);padding:12px;margin:10px 0;background:var(--s1);font-size:13px;line-height:1.5;display:none}.out.on{display:block}.out textarea{width:100%;min-height:70px;font:inherit;font-size:13px;margin-top:6px}'
   + '.ads{display:grid;gap:6px;margin:8px 0}.ad{border:1px solid var(--ln3);border-radius:var(--r-s);padding:9px 11px;background:var(--bg)}.adh{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.adh b{flex:1;min-width:110px;font-size:13px}.adm{font-size:12px;color:var(--ink2);margin-top:4px;line-height:1.45}.adl{font-size:12px;color:var(--warn);margin-top:3px}'
   + '.tpc{display:flex;gap:14px;margin:12px 0 4px;padding:12px;border:1px solid var(--ln3);border-radius:var(--r-s);background:var(--bg)}.tpc img,.tpc .tpi{width:96px;height:96px;object-fit:cover;border-radius:10px;flex:none;background:var(--s2);font-size:11px;color:var(--mut);display:flex;align-items:center;justify-content:center}.tpb{flex:1;min-width:0}.tpn{font-weight:800;font-size:15px}.tpm{font-size:12px;color:var(--ink2);margin-top:4px;line-height:1.45;overflow-wrap:anywhere}.tpc code{font-size:11px;background:var(--s2);padding:1px 5px;border-radius:5px}.tpc.tpe{display:block;font-size:13px;color:var(--ink2)}'
   + '.gt.rk2{background:var(--ink);color:var(--bg);font-size:12px}.ew{border-radius:var(--r-s);padding:12px 14px;margin:10px 0;background:var(--good-a);color:var(--good);font-size:13px;font-weight:600;line-height:1.5}'
   + '@media(max-width:520px){.tpc{flex-direction:column}.tpc img,.tpc .tpi{width:100%;height:180px}}'
   + '.cd .mt .gt{white-space:normal;line-height:1.35}'
   + '.em{background:var(--s1);border:1px dashed var(--ln2);border-radius:var(--r);padding:16px;font-size:13px;color:var(--ink2)}'
   + 'footer{margin:26px 0 10px;font-size:12px;color:var(--mut)}'
   + '@media(max-width:640px){.hero h1{font-size:19px}.stp{grid-template-columns:26px 1fr}.stp .ac{grid-column:2}}');
  o('</style></head><body><div class="w">');

  // ── толгой + навигаци
  o('<header><div class="hd"><div class="bm">S</div><div><div class="bt">Starshopping</div>');
  o('<div class="bs">даалгавар · ' + esc(String(d.generated_at || '').replace('T', ' ').slice(0, 16)) + ' UTC</div></div>');
  o('<div class="sp"></div><a class="rf" href="">Шинэчлэх</a></div></header>');
  o('<nav class="nav"><a class="on" href="/board/' + (themeQ ? '?theme=' + themeQ : '') + '">Даалгавар</a>'
    + '<a href="/board/?view=research&amp;tab=rank' + tq + '">Судалгаа</a>'
    + '<a href="/board/?view=category' + tq + '">Категори</a>'
    + '<a href="/board/?view=board' + tq + '">Систем</a></nav>');

  // ── ОДООГИЙН БАЙДАЛ — нэг өгүүлбэр: юу хийх вэ
  let head, sub;
  if (EV.length) { const e = EV[0]; const k = (e.signal || {}).kind; const rd = e.read || null;
    head = 'ҮНЭЛГЭЭ · ' + e.name + ' · ' + n(e.hours) + ' цаг' + (rd && rd.early_win ? ' · ЭРТ WIN' : '');
    sub = rd ? rd.why + (rd.diag && rd.diag.leak ? ' Хамгийн сул шат: ' + rd.diag.leak + '.' : '')
        : k === 'win' ? 'Систем WIN санал болгож байна — доор баталгаажуул.' : k === 'lose' ? 'Систем LOSS санал болгож байна — доор баталгаажуул.'
        : n(e.hours) < 24 ? 'Эхний 24 цаг — дүгнэлт хийхгүй, зар өгөгдөл цуглуулж байна.' : 'Дүгнэлт гараагүй — зар/захиалгын өгөгдөл хүлээж байна.';
  } else if (ACT.length) { const t = ACT[0]; const nx = A(t.steps).find((s) => s.status === 'todo');
    head = 'ТЕСТ БЭЛТГЭЛ · ' + t.name + ' · ' + n(t.done) + '/6';
    sub = nx ? 'Дараагийн алхам: ' + nx.step + '. ' + nx.title + ' — ' + nx.owner + '.' : 'Бүх алхам бэлэн — «AD явуулсан» дар.';
  } else {
    head = 'ТЕСТ СОНГОХ · top-' + C.length + ' бэлэн';
    sub = C.length ? 'Rank 1-ээс эхэл. Нягтлалт бүрэн биш бол сонгоод 1-р алхамд Claude баримт нөхнө.' : 'Нэр дэвшигч алга — өдөр бүрийн шүүлт ажилласны дараа энд гарна.';
  }
  o('<section class="hero"><div class="tag">Одоо юу хийх вэ</div><h1>' + esc(head) + '</h1><div class="sub">' + esc(sub) + '</div>');
  const F = [['Судалгаа', true], ['Top-5', C.length > 0], ['Тест бэлтгэл', ACT.length > 0], ['AD үнэлгээ', EV.length > 0], ['WIN / LOSS', HIS.some((h) => h.result)]];
  o('<div class="flow">' + F.map((f, i) => '<span class="' + (f[1] ? (i === 0 ? 'ok' : 'on') : '') + '">' + f[0] + '</span>').join('<span style="background:none;color:var(--mut)">→</span>') + '</div>');
  const K = d.kpi || {}; const TH = K.threshold || {};
  o('<div class="sub" style="margin-top:10px;font-size:12px">Зэрэг тест ' + n(S.used) + '/' + n(S.max) + ' · ханш ¥1=' + n(ST.fx_cny) + '₮ · карго ' + mnt(ST.cargo_min) + ' (301г–1кг)</div>');
  o('<div class="flow" style="margin-top:8px"><span class="' + (has(K.win_rate) && n(K.win_rate) >= n(K.target || 0.8) ? 'ok' : 'on') + '">WIN ' + (has(K.win_rate) ? Math.round(n(K.win_rate) * 100) + '%' : '—') + ' · ' + n(K.wins) + '/' + n(K.closed) + ' тест · зорилт ' + Math.round(n(K.target || 0.8) * 100) + '%</span>'
    + '<span>Тестийн босго ' + n(TH.min_score) + ' оноо</span><span>' + esc(TH.why || '') + '</span></div></section>');

  // ── 1. TOP-5
  const TR = ACT.concat(EV).filter((t) => has(t.rank_now)).sort((a, b) => n(a.rank_now) - n(b.rank_now));
  o('<div class="sec"><b>1 · Дараагийн нэр дэвшигч</b><span class="st">ранкийн дугаар нэг: ' + (TR.length ? TR.map((t) => '#' + n(t.rank_now) + ' ' + esc(t.name)).join(', ') + ' тестэд байгаа тул энд ' + (C.length ? '#' + n(C[0].rank) + '-аас' : '') + ' үргэлжилнэ' : 'тестэд бараа алга') + ' · нягтлалт 9 баримт · картыг дарж дэлгэрэнгүй</span></div>');
  const RS = d.research || {};
  if (has(RS.last_check_at)) o('<div style="font-size:12px;color:var(--mut);margin:-2px 0 10px">Сүүлийн судалгаа <b>' + esc(ago(RS.last_check_at)) + '</b> · 24 цагт ' + n(RS.checked_24h) + ' олдвор шалгасан · шинэ ТЕСТ ' + n(RS.new_test_24h) + (n(RS.queue) ? ' · шалгах дараалалд ' + n(RS.queue) : '') + ' · тестэд орсон бараа энд биш, 2-р хэсэгт</div>');
  if (!C.length) o('<div class="em">Нэр дэвшигч алга.</div>');
  o('<div class="cands">');
  C.forEach((c, i) => {
    const cf = c.confidence || {}; const chk = A(cf.checks); const busy = has(c.open_test);
    o('<div class="cd' + (n(c.rank) === 1 ? ' r1' : '') + (busy ? ' busy' : '') + '" data-i="' + i + '" data-keep="f' + n(c.find_id) + '"><div class="rk">#' + n(c.rank) + '</div>');
    o('<div class="nm">' + esc(c.product) + '</div><div class="mt">' + esc(c.category || '—') + (c.ready ? ' · <span class="gt ok">БЭЛЭН</span>' : c.verdict === 'test' ? ' · <span class="gt wr">ТЕСТ · нягтлах</span>' : c.verdict === 'reject' ? ' · <span class="gt no">ТАТГАЛЗСАН</span>' : ' · <span class="gt wr">ХҮЛЭЭХ</span>') + (c.resurfaced ? ' · <span class="gt bl" title="' + esc(c.resurface_why || '') + '">↻ эргэн ирсэн</span>' : '') + (busy ? ' · <span class="gt bl">тестэд байна</span>' : '') + '</div>');
    o('<div class="sc"><b>' + n(c.score_adj) + '</b><i><u style="width:' + Math.min(100, n(c.score_adj)) + '%"></u></i>' + (n(c.adj) ? '<span class="gt mu">' + (n(c.adj) > 0 ? '+' : '') + n(c.adj) + ' сурсан</span>' : '') + '</div>');
    o('<div class="vf">' + chk.map((k) => '<span class="' + (k.ok ? 'ok' : 'no') + '" title="' + esc(k.label) + '"></span>').join('') + '</div>');
    o('<div class="mt">' + (cf.ok ? '<span class="gt ok">нягтлагдсан ' + n(cf.of) + '/' + n(cf.of) + '</span>' : '<span class="gt wr">нягтлалт ' + n(cf.passed) + '/' + n(cf.of) + '</span> ' + esc(A(cf.missing).join(', '))) + '</div>');
    o('<div class="lk">' + reelBtn(c) + cnBtn(c) + '</div>');
    if (has(c.cn_price)) o('<div class="mt">' + (c.cn_price_by ? '<span class="gt ok">✓ өртөг ' + esc(c.cn_price_by) + ' шалгасан · ' + cny(c) + '</span>' : '<span class="gt wr">өртөг Claude олсон · ' + cny(c) + ' — шалгаж засаарай</span>') + '</div>');
    o('<div class="src">' + esc(c.found_by || '?') + ' · ' + esc(c.found_where || '?') + ' · ' + day(c.found_at) + (n(c.mn_common) > 0 ? ' · <span class="gt no">МН-д түгээмэл</span>' : '') + '</div>');
    o('</div>');
  });
  // дэлгэрэнгүй самбар (нэг л, сонгосон картынх)
  o('<div class="det" id="det"></div></div>');

  // ── 2. ТЕСТ БЭЛТГЭЛ
  o('<div class="sec"><b>2 · Тест бэлтгэл</b><span class="st">1–6 алхам · систем 1, 3, 5-ыг өөрөө таньж хаана · бүгд бэлэн бол «AD явуулсан»</span></div>');
  if (!ACT.length) o('<div class="em">Идэвхтэй тест алга. Дээрээс нэг бараа сонго' + (free ? '' : ' (зэрэг тестийн хязгаар дүүрсэн)') + '.</div>');
  ACT.forEach((t) => {
    const steps = A(t.steps); const done = n(t.done); const cf = t.confidence || {};
    const nowStep = (steps.find((s) => s.status === 'todo') || {}).step;
    o('<div class="tc"><div class="hd2"><h3>' + esc(t.name) + '</h3>' + rankTag(t.rank_now) + '<span class="gt bl">' + esc(t.category || '—') + '</span>'
      + (cf.ok ? '<span class="gt ok">нягтлагдсан ' + n(cf.of) + '/' + n(cf.of) + '</span>' : '<span class="gt wr">нягтлалт ' + n(cf.passed) + '/' + n(cf.of) + '</span>')
      + (t.slug ? '<span class="gt ok">ТЕСТ горимд · ' + esc(t.slug) + '</span>' : '<span class="gt mu">бүртгээгүй</span>')
      + '<span class="gt mu">креатив ' + n(t.creatives) + '</span><span class="gt mu">' + esc(ago(t.selected_at)) + '</span></div>');
    o(pcard(t.card));
    o('<div class="prog"><i style="width:' + Math.round(100 * done / 6) + '%"></i></div><div class="st" style="font-size:12px;color:var(--mut)">' + done + '/6 алхам</div>');
    o('<div class="steps">');
    steps.forEach((s) => {
      const isDone = s.status !== 'todo';
      o('<div class="stp' + (isDone ? ' done' : '') + (s.step === nowStep ? ' now' : '') + '"><div class="no">' + (isDone ? '✓' : s.step) + '</div>');
      o('<div><div class="tt">' + esc(s.title) + '</div><div class="dt">' + esc(s.detail || '') + '</div>');
      o('<div class="ow' + (s.owner === 'Ариунболд' ? ' me' : '') + '">' + esc(s.owner) + (isDone ? ' · ' + (s.done_by === 'систем' ? 'систем баталсан' : 'хийсэн') + ' ' + esc(ago(s.done_at)) : '') + (s.note ? ' · ' + esc(s.note) : '') + '</div>');
      if (s.step === 1 && !cf.ok) o('<div class="dt" style="color:var(--warn)">Дутуу: ' + esc(A(cf.missing).join(', ')) + '</div>');
      o('</div><div class="ac">' + (s.done_by === 'систем' && isDone ? '' : '<button class="btn s stp-b" data-t="' + n(t.test_id) + '" data-s="' + s.step + '" data-st="' + (isDone ? 'todo' : 'done') + '">' + (isDone ? '↺ буцаах' : 'Хийсэн') + '</button>') + '</div></div>');
    });
    o('</div>');
    o('<div class="launch"><button class="btn p lau-b" data-t="' + n(t.test_id) + '" data-n="' + esc(t.name) + '"' + (t.can_launch ? '' : ' disabled') + '>🚀 AD явуулсан</button>'
      + '<div class="why">' + (t.can_launch ? 'Бэлэн. Дарахад бараа Тестээс хасагдаж Үнэлгээ (AD) хэсэгт шилжинэ, систем WIN/LOSS хүлээнэ.'
        : 'Идэвхжих нөхцөл: 6/6 алхам · нягтлалт ' + n(cf.of) + '/' + n(cf.of) + ' · ТЕСТ горимд бүртгэлтэй.' + (done < 6 ? ' Дутуу алхам ' + (6 - done) + '.' : '') + (!cf.ok ? ' Нягтлалт ' + n(cf.passed) + '/' + n(cf.of) + '.' : '') + (!t.slug ? ' Бүртгэлгүй.' : '')) + '</div>'
      + '<button class="btn s drop-b" data-t="' + n(t.test_id) + '" data-n="' + esc(t.name) + '">Тестээс гаргах</button></div>');
    o('<div class="out" id="out-t' + n(t.test_id) + '"></div></div>');
  });

  // ── 3. ҮНЭЛГЭЭ · AD
  o('<div class="sec"><b>3 · Үнэлгээ · AD</b><span class="st">зар явж байна · 24 цагаас хойш систем санал өгнө (23 Ad Guard) · та баталгаажуулна</span></div>');
  if (!EV.length) o('<div class="em">Үнэлгээнд бараа алга.</div>');
  EV.forEach((e) => {
    const sg = e.signal || {}; const k = sg.kind; const cls = k === 'win' ? 'win' : k === 'lose' ? 'lose' : 'wait';
    o('<div class="tc"><div class="hd2"><h3>' + esc(e.name) + '</h3>' + rankTag(e.rank_now) + '<span class="gt bl">' + esc(e.category || '—') + '</span><span class="gt mu">AD ' + day(e.launched_at) + ' · ' + n(e.hours) + ' цаг</span>' + ntf(e.notify) + '</div>');
    o(pcard(e.card));
    if (e.read && e.read.early_win) o('<div class="ew">🚀 ЭРТ WIN — ' + esc(e.read.early_rule || '') + '. Эхний багц ~' + n(e.read.suggest_first_qty) + ' ш-ийг 1688-аас яаралтай захиал (карго ~14 хоног). WIN-ийг доор 1 товчоор батал.</div>');
    if (!e.read) o('<div class="mx"><div><div class="l">Зар</div><div class="v">' + mnt(has(sg.spend_mnt) ? sg.spend_mnt : e.spend_mnt) + '</div></div>'
      + '<div><div class="l">Утсаа үлдээсэн</div><div class="v">' + n(has(sg.signups) ? sg.signups : e.orders) + '</div></div>'
      + '<div><div class="l">1 хүний өртөг</div><div class="v">' + (has(sg.cpa_mnt) ? mnt(sg.cpa_mnt) : '—') + '<small> босго ' + (has(sg.max_cpa_mnt) ? mnt(sg.max_cpa_mnt) : '—') + '</small></div></div>'
      + '<div><div class="l">Хүлээж буй</div><div class="v">' + n(sg.waiting) + '<small> ш ' + n(sg.pending_qty) + '</small></div></div></div>');
    const RD = e.read;
    if (RD) {
      const pct = (v) => (has(v) ? Math.round(n(v) * 100) + '%' : '—');
      const VL = { win: '🟢 WIN', loss: '🔴 LOSS', wait: '⏳ хүлээ', early: '⏳ эхний 24ц', starved: '⚪ Meta мөнгө өгөөгүй' };
      /* Зар тус бүрийн дүгнэлт зөвхөн мэдээлэл: Meta төсвийг зар хооронд өөрөө хуваарилдаг
         (breakdown effect) тул нэг зарыг дундаж өртгөөр нь унтрааж болохгүй — БАРААГ нийтээр нь дүгнэнэ. */
      const VA = { win: '🟢 хүчтэй', loss: '🟠 сул', wait: '⏳ хүлээ', early: '⏳ эхний 24ц', starved: '⚪ Meta мөнгө өгөөгүй' };
      const vc = RD.verdict === 'win' ? 'win' : RD.verdict === 'loss' ? 'lose' : 'wait';
      const DG = RD.diag || {};
      o('<div class="sec" style="margin:14px 0 4px"><b style="font-size:14px">Зарын уншилт</b><span class="st">' + n(RD.hours) + ' цаг · Meta өгөгдөл ' + esc(RD.data_through || '—') + ' хүртэл · breakeven ' + mnt(RD.breakeven_mnt) + '/бүртгэл</span></div>');
      o('<div class="mx"><div><div class="l">Зардал</div><div class="v">' + mnt(RD.spend_mnt) + '</div></div>'
        + '<div><div class="l">Impression</div><div class="v">' + n(RD.impressions).toLocaleString('en-US') + '</div></div>'
        + '<div><div class="l">Бүртгэл</div><div class="v">' + n(RD.signups) + '<small> DB ' + n(RD.signups_db) + ' · Meta ' + n(RD.purchases_meta) + '</small></div></div>'
        + '<div><div class="l">1 бүртгэл</div><div class="v">' + (has(RD.cps_mnt) ? mnt(RD.cps_mnt) : '—') + '<small> ≤ ' + mnt(RD.breakeven_mnt) + '</small></div></div>'
        + '<div><div class="l">P(win)</div><div class="v">' + pct(RD.p_win) + '<small> ' + esc(VL[RD.verdict] || RD.verdict) + '</small></div></div></div>');
      o('<div class="sug ' + vc + '">' + esc(RD.why) + (DG.leak ? '<br><b>Хамгийн сул шат:</b> ' + esc(DG.leak) : '')
        + '<br><span style="font-size:12px">Hook ' + (has(DG.hook_pct) ? DG.hook_pct + '%' : '—') + ' · CTR ' + (has(DG.ctr_pct) ? DG.ctr_pct + '%' : '—') + ' · хуудас ачаалсан ' + (has(DG.lpv_pct) ? DG.lpv_pct + '%' : '—') + ' · «Захиалах» дарсан ' + (has(DG.open_pct) ? DG.open_pct + '%' : '—') + ' (' + n(RD.open) + ' хүн)' + (n(RD.unattributed) ? ' · ' + n(RD.unattributed) + ' захиалга аль зараас ирсэн нь тодорхойгүй' : '') + '</span></div>');
      const AD = A(RD.ads);
      if (AD.length) {
        o('<div class="ads">');
        AD.forEach((a) => { const g = a.diag || {}; const vk = a.verdict === 'win' ? 'ok' : a.verdict === 'starved' ? 'mu' : 'wr';
          o('<div class="ad"><div class="adh"><b>' + esc(a.creative_id || '—') + '</b><span class="gt ' + vk + '">' + esc(VA[a.verdict] || a.verdict) + '</span><span class="gt mu">P(win) ' + pct(a.p_win) + '</span></div>'
            + '<div class="adm">' + mnt(a.spend_mnt) + ' (' + n(a.share_pct) + '%) · ' + n(a.impressions).toLocaleString('en-US') + ' impr · hook ' + (has(g.hook_pct) ? g.hook_pct + '%' : '—') + ' · CTR ' + (has(g.ctr_pct) ? g.ctr_pct + '%' : '—') + ' · бүртгэл ' + n(a.signups) + (has(a.cps_mnt) ? ' · ' + mnt(a.cps_mnt) + '/бүртгэл' : '') + '</div>'
            + (g.leak ? '<div class="adl">' + esc(g.leak) + '</div>' : '') + '</div>');
        });
        o('</div>');
        o('<p style="font-size:12px;color:var(--ink2);margin:4px 0 0">Зар тус бүрийн тэмдэг зөвхөн мэдээлэл — зарыг дангаар нь бүү унтраа (Meta төсвийг өөрөө хуваарилдаг). WIN/LOSS-ийг <b>бараагаар нийтэд нь</b> дээрх P(win)-ээр шийднэ.</p>');
      }
      o('<p style="font-size:11px;color:var(--mut);margin:6px 0 0">' + esc(RD.rule || '') + '</p>');
    }
    o('<div class="sug ' + cls + '" style="font-size:12px">23 Ad Guard: ' + (k === 'win' ? '🟢 WIN — ' : k === 'lose' ? '🔴 LOSS — ' : '⏳ хүлээ — ')
      + esc(sg.reason || (n(e.hours) < 24 ? 'эхний 24 цагт дүгнэхгүй.' : sg.slug ? 'дүрэм биелээгүй (хангалттай зар/захиалга алга).' : 'зарын зардал (ad_spend) хараахан ороогүй.'))
      + (k === 'win' && has(sg.suggest_qty) ? ' Хятадаас захиалах: ' + n(sg.suggest_qty) + ' ш.' : '') + '</div>');
    o('<div class="launch"><button class="btn g res-b" data-t="' + n(e.test_id) + '" data-r="win" data-n="' + esc(e.name) + '">✓ WIN</button>'
      + '<button class="btn r res-b" data-t="' + n(e.test_id) + '" data-r="loss" data-n="' + esc(e.name) + '">✕ LOSS</button>'
      + '<div class="why"><b>LOSS автомат</b> (≥1000 impr · ≥48 цаг · P(win) ≤20%) — систем өөрөө хааж, Telegram-аар «Meta дээр зарыг унтраа» гэж хэлнэ. <b>WIN = 1 товч</b> — Telegram-д WIN дохио ирмэгц энд дар. Хаагдмагц бүртгүүлсэн хүмүүст SMS (эсвэл 24ц дотор бичсэн бол чат) автоматаар очно — залгахгүй. Хоёулаа ранк руу суралцаж буцна.</div></div>');
    o('<div class="out" id="out-t' + n(e.test_id) + '"></div></div>');
  });

  // ── 4. ТҮҮХ + СУРАЛЦСАН
  o('<div class="sec"><b>4 · Үр дүн</b><span class="st">ранк суралцана: категори WIN +5 · LOSS −8 · ижил бараа LOSS −30</span></div>');
  if (!HIS.length) o('<div class="em">Дууссан тест алга.</div>');
  else {
    o('<div class="sc2"><table><tr><th>Бараа</th><th>Үр дүн</th><th>Зар</th><th>Захиалга</th><th>1 хүн</th><th>Хаасан</th><th>Мессеж</th><th></th></tr>');
    HIS.forEach((h) => { const oc = h.outcome || {};
      const rs = h.result === 'win' ? '<span class="gt ok">WIN</span>' : h.result === 'loss' ? '<span class="gt no">LOSS</span>' : '<span class="gt mu">гаргасан</span>';
      const act = h.result === 'win' && h.slug && h.mode !== 'live' ? '<button class="btn s pm-b" data-slug="' + esc(h.slug) + '" data-name="' + esc(h.name) + '">▶ Борлуулалт</button>' : (h.mode === 'live' ? '<span class="gt ok">борлуулалтад · ' + n(h.stock_qty) + ' ш</span>' : '');
      o('<tr><td><b>' + esc(h.name) + '</b><div style="font-size:11px;color:var(--mut)">' + esc(h.category || '') + (h.note ? ' · ' + esc(h.note) : '') + '</div></td><td>' + rs + '</td><td>' + mnt(oc.spend_mnt) + '</td><td>' + n(oc.orders) + '</td><td>' + (has(oc.cpa_mnt) ? mnt(oc.cpa_mnt) : '—') + '</td><td>' + day(h.closed_at) + '</td><td>' + (ntf(h.notify) || '—') + '</td><td>' + act + '</td></tr>');
    });
    o('</table></div>');
  }
  const LF = LEARN.filter((l) => n(l.adj) !== 0);
  if (LF.length) o('<p style="font-size:12px;color:var(--ink2);margin:8px 0"><b>Ad-аас суралцсан:</b> ' + LF.map((l) => esc(l.val) + ' ' + (n(l.adj) > 0 ? '+' : '') + n(l.adj) + ' (' + n(l.wins) + '/' + n(l.n) + ' WIN)').join(' · ') + '</p>');
  const CL = (d.creative_learn || {}).by_template || [];
  if (A(CL).length) o('<p style="font-size:12px;color:var(--ink2);margin:8px 0"><b>Hook загвар (3с үзэлт · CTR):</b> ' + A(CL).map((c) => esc(c.template) + ' ' + (has(c.hook_pct) ? c.hook_pct + '%' : '—') + ' · ' + (has(c.ctr_pct) ? c.ctr_pct + '%' : '—')).join(' | ') + '</p>');
  const DM = A(d.demand);
  if (DM.length) o('<p style="font-size:12px;color:var(--ink2);margin:8px 0"><b>Хүмүүс асуусан (манайд алга):</b> ' + DM.map((x) => esc(x.guess || x.text)).join(' · ') + '</p>');
  o('<div class="out" id="out-pm"></div>');
  o('<footer>' + esc(d.rule || '') + '</footer></div>');

  // ── өгөгдөл + үйлдэл (нэг POST функц, товч бүр = SQL-ийн нэг шилжилт)
  o('<script type="application/json" id="TB">' + JSON.stringify({ c: C }).replace(/</g, '\\u003c') + '</script>');
  o('<script>(function(){var U="https://starshopping.app.n8n.cloud/webhook/board-data",D=JSON.parse(document.getElementById("TB").textContent),k="";try{k=localStorage.getItem("ss_board_key")||""}catch(x){}'
    + 'function e(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]})}'
    + 'function m(v){return v==null||v===""?"—":Math.round(Number(v)).toLocaleString("en-US")+"₮"}'
    + 'function post(b,btn,out){if(btn){btn.disabled=true;btn.dataset.tx=btn.textContent;btn.textContent="…"}'
    + 'return fetch(U+"?k="+encodeURIComponent(k),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)})'
    + '.then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}).then(function(j){if(!j.ok)throw new Error(j.error||"алдаа");return j})'
    + '.catch(function(x){if(btn){btn.disabled=false;btn.textContent=btn.dataset.tx}if(out){out.className="out on";out.innerHTML="⚠️ "+e(x.message)}throw x})}'
    + 'function reload(ms){setTimeout(function(){if(window.ssRefresh)window.ssRefresh();else location.reload()},ms||400)}'
    // картын дэлгэрэнгүй
    + 'var det=document.getElementById("det"),cards=document.querySelectorAll(".cd");'
    + 'cards.forEach(function(cd){cd.addEventListener("click",function(ev){if(ev.target.closest("a,button"))return;var i=+cd.dataset.i,c=D.c[i],cf=c.confidence||{},W=c.why||{},E=W.econ||{};var open=cd.classList.contains("open");cards.forEach(function(x){x.classList.remove("open")});if(open){det.className="det";return}cd.classList.add("open");'
    + 'var h="<h3>#"+c.rank+" "+e(c.product)+(c.product_en?" <small style=\\"color:var(--mut);font-weight:400\\">"+e(c.product_en)+"</small>":"")+"</h3>";'
    + 'h+="<div class=kv><span>Олсон</span>"+e(c.found_by||"?")+" · "+e(c.found_where||"?")+" · "+String(c.found_at||"").slice(0,10)+"</div>";'
    + 'var VV=W.viral||{};h+="<div class=kv><span>Вирал reel</span>"+(/^https?:/.test(c.reel_url||"")?"<a target=_blank rel=noopener href=\\""+e(c.reel_url)+"\\">▶ "+(/instagram/i.test(c.reel_url)?"Instagram":"TikTok")+" нээх ↗</a> · upload "+e(String(c.reel_posted_at||"?").slice(0,10))+" · "+(c.reel_views?Number(c.reel_views).toLocaleString("en-US")+" үзэлт":"")+(c.reel_likes?" · "+Number(c.reel_likes).toLocaleString("en-US")+" like":""):"<b style=color:var(--crit)>reel холбоогүй</b>")+(VV.last_strong_date&&!(VV.fresh>=16)?" · <b style=color:var(--crit)>хуучирсан (сүүлийн хүчтэй "+e(VV.last_strong_date)+")</b>":"")+"</div>";'
    + 'h+="<div class=kv><span>Оноо</span>"+(c.score||0)+" (вирал "+((W.parts||{}).viral||0)+" · МН зай "+((W.parts||{}).gap||0)+" · ашиг "+((W.parts||{}).econ||0)+" · тохирол "+((W.parts||{}).fit||0)+")"+(Number(c.adj)?" · сурсан "+(Number(c.adj)>0?"+":"")+c.adj:"")+"</div>";'
    + 'if(E.price_mnt)h+="<div class=kv><span>Эдийн засаг</span>үнэ "+m(E.price_mnt)+" · нэг захиалгын ашиг "+m(E.contribution_mnt)+" · буусан өртөг "+m(E.landed_mnt)+" · ¥"+(c.cn_price||"?")+(c.weight_g?" · "+c.weight_g+"г":" · жин таамаг")+((W.trust||{}).owner?" · <b>эзний үнэ</b>":" · системийн санал")+" <button class=\\"btn s prc-b\\" data-f="+c.find_id+" data-p="+(E.price_mnt||"")+">Үнэ тогтоох</button></div><div class=\\"out\\" id=out-prc></div>";'
    + 'h+="<div class=kv><span>1688</span>"+(/1688\\.com\\/offer\\//.test(c.cn_offer_url||"")?"<a target=_blank rel=noopener href=\\""+e(c.cn_offer_url)+"\\">🛒 авах бараа ↗</a> · ¥"+e(c.cn_price)+(c.cn_sold?" · "+Number(c.cn_sold).toLocaleString("en-US")+"ш зарагдсан":""):(c.cn_url?"<a target=_blank rel=noopener href=\\""+e(c.cn_url)+"\\">зөвхөн хайлт ↗</a> — offer сонгох хэрэгтэй":"алга"))+(c.supplier_note?" · "+e(c.supplier_note):"")+"</div>";'
    + 'h+="<div class=kv><span>Өртөг (Эрээнд)</span>"+(c.cn_price!=null?"¥"+e(c.cn_price)+(c.cn_item_cny!=null?" = бараа ¥"+e(c.cn_item_cny)+" + Хятад дотор ¥"+e(c.cn_ship_cny)+(c.cn_ship_checked?"":" (таамаг — checkout-оор шалга)"):"")+(c.weight_g?" · "+e(c.weight_g)+"г":" · жин ?"):"алга")+(c.cn_price_by?" · <b>"+e(c.cn_price_by)+" шалгасан</b>"+(c.cn_price_prev&&c.cn_price_prev.length?" (өмнө ¥"+e(c.cn_price_prev[c.cn_price_prev.length-1].cn)+")":""):" · <b style=color:var(--warn)>Claude олсон — 1688 дээр яг зарах хувилбарын үнийг шалгана уу</b>")+" <button class=\\"btn s cost-b\\" data-f="+c.find_id+">Өртөг засах</button></div><div class=\\"out\\" id=out-cost></div>";'
    + 'h+="<div class=chk>"+(cf.checks||[]).map(function(x){return"<div class="+(x.ok?"ok":"no")+"><b>"+(x.ok?"✓ ":"✗ ")+e(x.label)+"</b>"+e(x.fact)+"</div>"}).join("")+"</div>";'
    + 'var g=(W.good||[]).map(function(t){return"✅ "+e(t)}).concat((W.warn||[]).map(function(t){return"⚠️ "+e(t)}));if(g.length)h+="<div class=kv style=font-size:12px>"+g.join("<br>")+"</div>";'
    + 'var busy=c.open_test!=null,free=' + free + ';h+="<div class=launch><button class=\\"btn p sel-b\\" data-f="+c.find_id+" data-n=\\""+e(c.product)+"\\""+(busy||!free?" disabled":"")+">Тестэд сонгох</button><div class=why>"+(busy?"Аль хэдийн тестэд байна (#"+c.open_test+").":!free?"Зэрэг тестийн хязгаар дүүрсэн — эхлээд нэгийг WIN/LOSS болго.":cf.ok?"Нягтлагдсан — сонгомогц 1-р алхам систем өөрөө хаана.":"Нягтлалт "+(cf.passed||0)+"/"+(cf.of||9)+" — сонгож болно; 1-р алхамд Claude дутууг нөхнө: "+e((cf.missing||[]).join(", ")))+"</div></div><div class=\\"out\\" id=out-sel></div>";'
    + 'h+="<div class=kv><span>МН зах зээл</span>"+(Number(c.mn_common)>0?"<b style=color:var(--crit)>түгээмэл: "+Number(c.mn_common)+"+ дэлгүүр</b> · ":"FB зараар л шалгасан · ")+"<button class=\\"btn s mnc-b\\" data-f="+c.find_id+">МН-д түгээмэл эсэхийг тэмдэглэх</button></div><div class=\\"out\\" id=out-mnc></div>";'
    + 'det.innerHTML=h;det.className="det on";if(ev.isTrusted)det.scrollIntoView({behavior:"smooth",block:"nearest"});'
    + 'var pb=det.querySelector(".prc-b");if(pb)pb.addEventListener("click",function(){var b=this,v=prompt("Зарах үнэ (₮). Хоосон = системийн санал руу буцаах:",b.dataset.p);if(v===null)return;v=String(v).replace(/[^0-9]/g,"");var nt=v?(prompt("Шалтгаан (заавал биш):","")||""):"";post({action:"price",find_id:+b.dataset.f,price_mnt:v?+v:null,note:nt},b,document.getElementById("out-prc")).then(function(){b.textContent="✓ хадгаллаа";reload()})});'
    + 'var cb=det.querySelector(".cost-b");if(cb)cb.addEventListener("click",function(){var b=this,v=prompt("1688 дээрх ЗӨВ SKU-ийн БАРААНЫ үнэ (¥, хүргэлтгүй):",c.cn_item_cny==null?(c.cn_price==null?"":c.cn_price):c.cn_item_cny);if(v===null)return;v=String(v).replace(",",".").replace(/[^0-9.]/g,"");if(!v||!(+v>0)){alert("Тоо оруулна уу");return}var sh=prompt("Хятад доторх хүргэлт (¥) — 1688 «Order» дараад гарсан Shipping fee − хямдрал:",c.cn_ship_checked?c.cn_ship_cny:"");if(sh===null)return;sh=String(sh).replace(",",".").replace(/[^0-9.]/g,"");var w=prompt("Жин (грамм) — мэдэхгүй бол хоосон орхи:",c.weight_g||"");if(w===null)return;w=String(w).replace(/[^0-9]/g,"");var u=prompt("1688 offer холбоос (өөрчлөхгүй бол хэвээр):",c.cn_offer_url||"");if(u===null)return;u=String(u).trim();var nt=prompt("Тэмдэглэл (заавал биш):","")||"";var o=document.getElementById("out-cost");post({action:"cost",find_id:+b.dataset.f,cn_price:+v,cn_ship_cny:sh===""?null:+sh,weight_g:w?+w:null,cn_offer_url:(u&&u!==c.cn_offer_url)?u:null,note:nt,by:"эзэн"},b,o).then(function(j){o.className="out on";o.innerHTML="✓ Хадгаллаа · нийт ¥"+e(j.prev_cn)+" → ¥"+e(j.cn_total)+" (бараа ¥"+e(j.cn_item)+" + хүргэлт ¥"+e(j.cn_ship)+") · шинэ оноо <b>"+e(j.score)+"</b> · "+e(j.verdict||"")+"<br><button class=\\"btn s\\" onclick=\\"window.ssRefresh?ssRefresh():location.reload()\\">Rank шинэчлэх</button>";b.textContent="✓"})});'
    + 'det.querySelector(".mnc-b").addEventListener("click",function(){var b=this,v=prompt("Монголд энэ барааг хэдэн дэлгүүр/зарын сайт зарж байна вэ? (0 = байхгүй, 3+ = түгээмэл)","3");if(v===null)return;var ex=prompt("Жишээ (дэлгүүрийн нэр/холбоос, заавал биш):","")||"";post({action:"mncommon",find_id:+b.dataset.f,mn_common:+v||0,examples:ex?[ex]:[],by:"эзэн"},b,document.getElementById("out-mnc")).then(function(){b.textContent="✓ хадгаллаа";reload()})});'
    + 'det.querySelector(".sel-b").addEventListener("click",function(){var b=this;if(!confirm("«"+b.dataset.n+"»-ийг тестэд сонгох уу?"))return;post({action:"select",find_id:+b.dataset.f,by:"owner"},b,document.getElementById("out-sel")).then(function(){b.textContent="✓ сонгогдлоо";reload()})})})});'
    // алхам
    + 'document.querySelectorAll(".stp-b").forEach(function(b){b.addEventListener("click",function(){post({action:"step",test_id:+b.dataset.t,step:+b.dataset.s,status:b.dataset.st,by:"owner"},b,document.getElementById("out-t"+b.dataset.t)).then(function(){b.textContent="✓";reload(250)})})});'
    // AD явуулсан
    + 'document.querySelectorAll(".lau-b").forEach(function(b){b.addEventListener("click",function(){if(!confirm("«"+b.dataset.n+"» — зар явуулсан уу? Бараа Тестээс Үнэлгээ рүү шилжинэ."))return;var out=document.getElementById("out-t"+b.dataset.t);post({action:"launch",test_id:+b.dataset.t,by:"owner"},b,out).then(function(j){out.className="out on";out.innerHTML="🚀 "+e(j.next||"")+"<br><button class=\\"btn s\\" onclick=location.reload()>Шинэчлэх</button>";b.textContent="✓ Үнэлгээнд"})})});'
    // тестээс гаргах
    + 'document.querySelectorAll(".drop-b").forEach(function(b){b.addEventListener("click",function(){var nt=prompt("«"+b.dataset.n+"»-ийг тестээс гаргах шалтгаан?");if(nt===null)return;post({action:"drop",test_id:+b.dataset.t,note:nt,by:"owner"},b,document.getElementById("out-t"+b.dataset.t)).then(function(){reload()})})});'
    // WIN / LOSS
    + 'document.querySelectorAll(".res-b").forEach(function(b){b.addEventListener("click",function(){var r=b.dataset.r,nt=prompt("«"+b.dataset.n+"» → "+(r==="win"?"WIN":"LOSS")+". Тэмдэглэл (заавал биш):");if(nt===null)return;var out=document.getElementById("out-t"+b.dataset.t);'
    + 'post({action:"result",test_id:+b.dataset.t,result:r,note:nt,by:"owner"},b,out).then(function(j){var h="<b>"+e(j.product)+" → "+(j.result==="win"?"WIN 🟢":"LOSS 🔴")+"</b> · зар "+m(j.spend_mnt)+" · захиалга "+(j.orders||0)+"<br>"+e(j.next||"");'
    + 'var M=j.mode||{},L=M.call_list||M.sorry_list||[];h+="<br>📩 Бүртгүүлсэн хүмүүст "+(j.result==="win"?"«~14 хоногт хүргэнэ»":"уучлалтын")+" мессеж автоматаар дараалалд орлоо (SMS — Mac, чат — 24ц дотор). Залгах шаардлагагүй.";if(L.length){h+="<br><br><b>Мессеж очих хүмүүс ("+L.length+")</b><br>"+L.map(function(x){return e(x.phone)+(x.name?" · "+e(x.name):"")+" · "+e(x.qty)+"ш"}).join("<br>")}'
    + 'h+="<br><button class=\\"btn s\\" onclick=location.reload()>Шинэчлэх</button>";out.className="out on";out.innerHTML=h;b.textContent="✓"})})});'
    // ▶ Борлуулалт (WIN бараа ирмэгц)
    + 'document.querySelectorAll(".pm-b").forEach(function(b){b.addEventListener("click",function(){var q=prompt("«"+b.dataset.name+"» агуулахад хэдэн ширхэг тоолж авсан бэ?");if(q===null)return;q=parseInt(q,10);if(!(q>=0)){alert("Тоо оруулна уу");return}var out=document.getElementById("out-pm");'
    + 'post({action:"mode",slug:b.dataset.slug,mode:"live",stock_qty:q,by:"owner"},b,out).then(function(j){var L=j.call_list||[];var h="<b>"+e(j.product)+" → борлуулалт</b><br>"+e(j.next||"");if(j.short>0)h+="<br>⚠️ "+j.short+" ш ДУТУУ — нэмж захиал!";if(L.length)h+="<br><br><b>Залгах ("+L.length+")</b><br>"+L.map(function(x){return e(x.phone)+(x.name?" · "+e(x.name):"")+" · "+e(x.qty)+"ш"}).join("<br>");if(j.script)h+="<br><b>Хэлэх үг:</b><textarea readonly>"+e(j.script)+"</textarea>";h+="<br><button class=\\"btn s\\" onclick=location.reload()>Шинэчлэх</button>";out.className="out on";out.innerHTML=h;b.textContent="✓"})})});'
    + '})();</script></body></html>');
  return P.join('');
}
