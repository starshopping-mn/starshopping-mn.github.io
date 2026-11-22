/* Тест хуудас v5 (блок JX, 2026-11-17; JY үнэ цэн; JZ анчны гарц) — зөвхөн 8 шүүлтүүрийг давсан нэр дэвшигч (досье бүрэн).
   Өгөгдөл: board_read 'v4cards' → v4_cards().v5 = v5_board() (нэмэлт дуудлагагүй). tests.js: testsV5Block(V5, V4) ба testsClient дотор testsV5Client(root, post, show, reload).
   Үйлдэл: price (price_override_set) · cost (cost_override_set) · select (test_select) · findact reject / unreject. Классууд v5- угтвартай (board.css-тэй мөргөлдөхгүй). */
var V5G = { F0: 'Хийж болох', F1: 'Бичлэг', F2: 'Борлуулалт', F3: 'Хүсэл', F4: 'Зах зээл', F5: 'Үнэ цэн', F6: 'Монгол', F7: '1688' };
var V5Q = { M1: 'Гол сэдэл', M2: 'Орлуулагчаас илүү', M3: 'Шууд харагдах', M4: 'Нийгмийн хөшүүрэг', M5: 'Монголд нийцэх', A2: 'Сонголтын түвэг', A3: 'Эрсдэл бууруулагч', A4: 'Ойлгомжтой', P1: 'Бичлэг бэлэн', P2: 'Цаг үе' };
var V5R = { narrow: 'цөөн хүнд хэрэгтэй', mn_common: 'Монголд элбэг', mn_fit: 'Монголд тохирохгүй', demo: 'бичлэг итгүүлэхгүй', quality: 'чанар эргэлзээтэй', other: 'бусад' };
function testsV5Block(D, V4) {
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var n = function (x) { return x == null || x === '' ? '—' : Math.round(Number(x)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var mnt = function (x) { return x == null || x === '' ? '—' : n(x) + '₮'; };
  var big = function (x) { x = Number(x); return x >= 1e6 ? (x / 1e6).toFixed(1).replace('.0', '') + ' сая' : x >= 1e3 ? Math.round(x / 1e3) + ' мянга' : String(Math.round(x)); };
  var lnk = function (u, t) { return /^https?:\/\//.test(u || '') ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t) + '</a>' : ''; };
  var CSS = ''
    + '.v5w{display:flex;flex-direction:column;gap:14px;margin-bottom:18px}'
    + '.v5-hero{background:var(--s1);border:1px solid var(--ln);border-left:4px solid var(--good);border-radius:14px;padding:16px 18px}.v5-hero.none{border-left-color:var(--warn)}.v5-hero .t1{font-size:17px;font-weight:700;line-height:1.35}.v5-hero .t2{font-size:12.5px;color:var(--ink2);margin-top:3px;line-height:1.5}'
    + '.v5-pipe{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}@media(max-width:560px){.v5-pipe{grid-template-columns:repeat(2,minmax(0,1fr))}}'
    + '.v5-ps{background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:10px 12px;min-width:0}.v5-ps b{display:block;font-size:22px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}.v5-ps span{font-size:11px;color:var(--mut);line-height:1.35;display:block;margin-top:3px}.v5-ps.on{border-color:var(--good)}.v5-ps.on b{color:var(--good)}'
    + '.v5-sec{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-top:4px}.v5-sec b{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);font-weight:700}.v5-sec span{font-size:11.5px;color:var(--mut)}'
    + '.v5-cand{background:var(--s1);border:1px solid var(--ln);border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:13px;min-width:0}'
    + '.v5-ch{display:flex;gap:10px;justify-content:space-between;align-items:flex-start}.v5-ch .n1{font-size:17px;font-weight:700;line-height:1.3}.v5-ch .n2{font-size:11.5px;color:var(--mut);margin-top:2px}'
    + '.v5-bd{flex:none;font-size:10.5px;font-weight:800;letter-spacing:.04em;padding:4px 10px;border-radius:999px;white-space:nowrap;background:var(--good-a);color:var(--good)}.v5-bd.v5-bdw{background:var(--warn-a);color:var(--warn)}'
    + '.v5-big{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}@media(max-width:560px){.v5-big{grid-template-columns:minmax(0,1fr)}}'
    + '.v5-bt{background:var(--s2);border-radius:12px;padding:10px 12px;min-width:0}.v5-bt .l{font-size:10.5px;color:var(--mut);letter-spacing:.04em;text-transform:uppercase;font-weight:650}.v5-bt .v{font-size:21px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.2;margin-top:2px}.v5-bt .v.pos{color:var(--good)}'
    + '.v5-bt .s{font-size:11px;color:var(--mut);margin-top:2px;line-height:1.35}.v5-ed{font:inherit;font-size:11px;font-weight:700;color:var(--gold);background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;margin-top:3px}'
    + '.v5-fm{display:none;margin-top:8px;gap:6px;flex-direction:column}.v5-fm.on{display:flex}.v5-fm label{font-size:10.5px;color:var(--mut);display:flex;flex-direction:column;gap:2px}.v5-fm input{font:inherit;font-size:13px;padding:6px 8px;border:1px solid var(--ln2);border-radius:8px;background:var(--s1);color:var(--ink);min-width:0;width:100%}'
    + '.v5-fm .r2{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.v5-sv{font:inherit;font-size:12px;font-weight:700;padding:7px 12px;border-radius:8px;border:1px solid var(--gold-ln);background:var(--gold-a);color:var(--gold);cursor:pointer;align-self:flex-start}'
    + '.v5-evs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}@media(max-width:900px){.v5-evs{grid-template-columns:minmax(0,1fr)}}'
    + '.v5-ev{border:1px solid var(--ln3);border-radius:11px;padding:9px 11px;min-width:0;font-size:12.5px;line-height:1.5;color:var(--ink2);overflow-wrap:anywhere}.v5-ev .el{display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:2px}.v5-ev .el b{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);font-weight:700}'
    + '.v5-ev a{font-size:11.5px;font-weight:650;color:var(--gold);white-space:nowrap}.v5-ev strong{color:var(--ink);font-weight:700}.v5-ev.warn{border-color:var(--warn);background:var(--warn-a)}.v5-ev .sm{font-size:11.5px;color:var(--mut);margin-top:3px}'
    + '.v5-sk{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.v5-sk button{font:inherit;font-size:11.5px;font-weight:600;padding:4px 9px;border-radius:999px;border:1px solid var(--ln2);background:var(--s1);color:var(--ink2);cursor:pointer}.v5-sk button.on{border-color:var(--good);color:var(--good);box-shadow:inset 0 0 0 1px var(--good)}'
    + '.v5-map{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:6px}.v5-map div{font-size:10.5px;color:var(--mut)}.v5-map i{display:block;height:5px;border-radius:3px;background:var(--ln);margin-top:3px;overflow:hidden}.v5-map i u{display:block;height:100%;background:var(--good)}'
    + '.v5-qa{margin-top:6px}.v5-qa summary{cursor:pointer;font-size:11.5px;font-weight:650;color:var(--gold)}.v5-qa .q{display:flex;gap:8px;padding:5px 0;border-top:1px solid var(--ln3);font-size:11.5px}.v5-qa .q em{font-style:normal;font-weight:800;flex:none;width:16px;color:var(--good)}.v5-qa .q em.z{color:var(--crit)}.v5-qa .q em.h{color:var(--warn)}.v5-qa .q span{min-width:0}.v5-qa .q span b{color:var(--ink);font-weight:650}'
    + '.v5-ft{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.v5-take{font:inherit;font-size:13.5px;font-weight:700;padding:10px 20px;border-radius:10px;border:1px solid var(--good);background:var(--good);color:#fff;cursor:pointer;white-space:nowrap}'
    + '.v5-no{font:inherit;font-size:12.5px;font-weight:650;padding:9px 14px;border-radius:10px;border:1px solid var(--ln2);background:transparent;color:var(--crit);cursor:pointer;white-space:nowrap}.v5-ft .h{font-size:11.5px;color:var(--mut);line-height:1.45;flex:1 1 220px;min-width:0}'
    + '.v5-rj{display:none;border:1px solid var(--ln2);border-radius:11px;padding:10px 12px;flex-direction:column;gap:8px}.v5-rj.on{display:flex}.v5-rj .rs{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px}.v5-rj input[type=text]{font:inherit;font-size:13px;padding:6px 8px;border:1px solid var(--ln2);border-radius:8px;background:var(--s1);color:var(--ink)}'
    + '.v5-out{font-size:12.5px;line-height:1.5;display:none}.v5-out.on,.v5w .out.on{display:block;background:var(--s2);border-radius:10px;padding:9px 12px}'
    + '.v5-dd{background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:0 16px}.v5-dd>summary{cursor:pointer;padding:12px 0;font-size:12.5px;font-weight:650;color:var(--ink2)}.v5-dd .in{padding:0 0 12px;font-size:12.5px;color:var(--ink2);line-height:1.55}'
    + '.v5-br{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 0;border-top:1px solid var(--ln3)}.v5-br .bn{flex:1 1 200px;min-width:0;font-size:12.5px;font-weight:600;color:var(--ink)}.v5-br .bn small{display:block;font-weight:400;color:var(--mut);font-size:11px}'
    + '.v5-gs{display:flex;flex-wrap:wrap;gap:4px}.v5-g{font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:var(--s2);color:var(--mut);white-space:nowrap}.v5-g.p{background:var(--good-a);color:var(--good)}.v5-g.f{background:var(--crit-a);color:var(--crit)}'
    + '.v5-ur{font:inherit;font-size:11px;font-weight:650;color:var(--gold);background:none;border:0;cursor:pointer;text-decoration:underline;padding:0}';
  var h = [], o = function (s) { h.push(s); };
  var C = D.cands || [], B = D.building || [], P = D.pipe || {}, cfg = D.cfg || {}, RJ = (V4 && V4.rejected) || [];
  o('<style>' + CSS + '</style><div class="v5w">');
  o('<div class="v5-hero' + (C.length ? '' : ' none') + '"><div class="t1">' + (C.length ? 'Танд үзүүлэх ' + C.length + ' бараа — 8 шүүлтүүрийг бүгдийг давсан' : 'Одоогоор 8 шүүлтүүрийг бүрэн давсан бараа алга') + '</div><div class="t2">'
    + (C.length ? 'Таны ажил: үнэ, өртгийг нягтлаад «Тестэд авъя» эсвэл «Татгалзах». Нотолгоо бүр линктэй.' : 'Судлаач өдөр бүр 10:07-д 2–3 барааны досьег бүрдүүлнэ. Бүрдүүлж буй ' + n(B.length) + ' барааг доороос харна уу.') + '</div></div>');
  o('<div class="v5-pipe"><div class="v5-ps"><b>' + n(P.found7) + '</b><span>7 хоногт олдсон (линктэй)</span></div><div class="v5-ps"><b>' + n(B.length) + '</b><span>досье бүрдүүлж буй</span></div><div class="v5-ps on"><b>' + n(C.length) + '</b><span>8 шүүлтүүр давсан — таны шийдвэр</span></div><div class="v5-ps"><b>' + n(P.tests) + ' / ' + n(P.tests_max) + '</b><span>тест явж байна</span></div></div>');
  if (C.length) o('<div class="v5-sec"><b>Нэр дэвшигч</b><span>нотолгоо бүр линктэй · үнэ, өртгийг та засна</span></div>');
  C.forEach(function (c) {
    var f = c.find_id, g = c.gate || {}, G = g.gates || {}, ds = g.desire || {}, A = c.answers || {}, why = function (k) { return esc((G[k] || {}).why || '').replace(/\d{5,}/g, function (x) { return n(x); }); }, edge = function (k) { return /⚠/.test((G[k] || {}).why || ''); }, ne = Object.keys(V5G).filter(edge).length;
    o('<div class="v5-cand" data-f="' + f + '"><div class="v5-ch"><div><div class="n1">' + esc(c.name) + '</div><div class="n2">' + esc(c.category || '') + ' · №' + f + ' · досье ' + esc(c.updated || '') + '</div></div><span class="v5-bd' + (ne ? ' v5-bdw' : '') + '">8 / 8 ДАВСАН · ХҮСЭЛ ' + n(ds.score) + (ne ? ' · ' + ne + ' ЗАХ ДЭЭР' : '') + '</span></div>');
    o('<div class="v5-big"><div class="v5-bt"><div class="l">Зарах үнэ</div><div class="v">' + mnt(g.sell) + '</div><div class="s">' + (c.price_owner ? 'таны тогтоосон үнэ' : 'системийн санал') + (ds.price_pct != null ? ' · өрхийн сарын орлогын ' + esc(ds.price_pct) + '%' : '') + '</div><button class="v5-ed" data-fm="p">үнэ засах</button>'
      + '<div class="v5-fm" data-k="p"><label>Шинэ үнэ ₮<input type="number" class="v5-ip" inputmode="numeric" value="' + esc(g.sell || '') + '"></label><label>Тайлбар<input type="text" class="v5-in" placeholder="яагаад"></label><button class="v5-sv" data-act="price">Үнэ хадгалах</button></div></div>'
      + '<div class="v5-bt"><div class="l">Буух өртөг</div><div class="v">' + mnt(g.landed) + '</div><div class="s">¥' + esc(c.cny == null ? '—' : c.cny) + (c.ship != null ? ' + тээвэр ¥' + esc(c.ship) : '') + ' · ' + n(c.weight_g) + ' г' + (c.cost_by ? ' · ' + esc(c.cost_by) : '') + '</div><button class="v5-ed" data-fm="c">өртөг засах</button>'
      + '<div class="v5-fm" data-k="c"><div class="r2"><label>Бараа ¥<input type="number" step="0.01" class="v5-cy" value="' + esc(c.cny == null ? '' : c.cny) + '"></label><label>Хятад дотор ¥<input type="number" step="0.01" class="v5-cs" value="' + esc(c.ship == null ? '' : c.ship) + '"></label><label>Жин г<input type="number" class="v5-cw" value="' + esc(c.weight_g == null ? '' : c.weight_g) + '"></label></div><label>Тайлбар (хувилбар)<input type="text" class="v5-cn" placeholder="аль хувилбар"></label><button class="v5-sv" data-act="cost">Өртөг хадгалах</button></div></div>'
      + '<div class="v5-bt"><div class="l">Ашиг / ш</div><div class="v pos">' + mnt(g.profit) + '</div><div class="s">хүргэлтийн хөлс хассан · зарын зардал ороогүй · доод ' + mnt(cfg.profit_min) + '</div></div></div>');
    o('<div class="v5-out" id="v5o' + f + '"></div><div class="v5-evs">');
    var V = c.video || [], v0 = V[0] || {}, rd = 0, it = 0; V.forEach(function (v) { rd += +v.read || 0; it += +v.intent || 0; });
    o('<div class="v5-ev"><div class="el"><b>🎬 Бичлэг</b>' + lnk(v0.url, '▶ үзэх') + '</div>' + (v0.views != null ? '<strong>' + big(v0.views) + ' үзэлт</strong> · ' + esc(v0.posted || '') + (v0.creator ? ' · ' + esc(v0.creator) : '') : 'бичлэг') + (rd ? '<div class="sm">' + n(rd) + ' сэтгэгдлээс <strong>' + n(it) + '</strong> нь авах санаатай (' + Math.round(100 * it / rd) + '%)</div>' : '')
      + (V.length > 1 ? '<div class="sm">' + V.slice(1).map(function (v, i) { return lnk(v.url, 'бичлэг ' + (i + 2) + (v.views != null ? ' · ' + big(v.views) : '')); }).join(' · ') + '</div>' : '') + '<div class="sm">' + why('F1') + '</div></div>');
    o('<div class="v5-ev"><div class="el"><b>📈 Борлуулалтын нотолгоо</b>' + ((c.sales || [])[0] ? lnk(c.sales[0].url, 'баримт') : '') + '</div><strong>' + why('F2') + '</strong>'
      + ((c.sales || []).length ? '<div class="sm">' + c.sales.map(function (s) { return esc({ ad_days: 'зар амьд хоног', ad_variants: 'зарын хувилбар', advertisers: 'сурталчлагч', tiktok_shop_sold: 'TikTok Shop зарагдсан', amazon_month: 'Amazon сард', cn_month: '1688 зарагдсан' }[s.kind] || s.kind) + ' ' + n(s.value); }).join(' · ') + '</div>' : '') + '</div>');
    var bar = function (l, x) { return '<div>' + l + ' ' + esc(x == null ? '—' : x) + '<i><u style="width:' + Math.round(100 * (+x || 0)) + '%"></u></i></div>'; };
    o('<div class="v5-ev' + (edge('F3') ? ' warn' : '') + '"><div class="el"><b>❤ Худалдан авах хүсэл</b></div><strong>' + n(ds.score) + ' / 100</strong> · доод ' + n(cfg.desire_min) + ' · сэдэл ≥ ' + esc(cfg.m_min) + '<div class="v5-map">' + bar('Сэдэл', ds.M) + bar('Хялбар', ds.A) + bar('Өдөөлт', ds.P) + '</div>'
      + '<details class="v5-qa"><summary>10 асуултын хариу, нотолгоо</summary>' + Object.keys(V5Q).map(function (k) { var a = A[k] || {}; return '<div class="q"><em class="' + (a.s == 0 ? 'z' : a.s == 1 ? 'h' : '') + '">' + esc(a.s == null ? '?' : a.s) + '</em><span><b>' + V5Q[k] + '</b> — ' + esc(a.ev || '') + '</span></div>'; }).join('')
      + '<div class="q"><em class="' + (ds.a1 == 0 ? 'z' : ds.a1 == 1 ? 'h' : '') + '">' + esc(ds.a1) + '</em><span><b>Үнэ ÷ орлого</b> — ' + esc(ds.price_pct) + '% (програм тооцсон)</span></div></details></div>');
    var mk = c.market || {};
    o('<div class="v5-ev' + (edge('F4') ? ' warn' : '') + '"><div class="el"><b>👥 Хэн авах вэ</b></div><strong>' + why('F4') + '</strong><div class="sm">' + esc(mk.ev || '') + '</div></div>');
    var pr = c.price || {};
    o('<div class="v5-ev' + (edge('F5') ? ' warn' : '') + '"><div class="el"><b>💎 Үнэ цэн</b></div><strong>' + why('F5') + '</strong>'
      + (pr.anchor ? '<div class="sm">Монголд оронд нь: <strong>' + esc(pr.anchor) + '</strong> ' + mnt(pr.anchor_min) + (pr.anchor_max != null && +pr.anchor_max !== +pr.anchor_min ? '–' + mnt(pr.anchor_max) : '') + ' — ' + esc(pr.anchor_ev || '') + '</div>' : '')
      + (pr.special != null ? '<div class="sm">Онцгой байдал <strong>' + esc(pr.special) + ' / 2</strong> — ' + esc(pr.special_ev || '') + '</div>' : '')
      + (pr.cat_sellers != null ? '<div class="sm">Энэ төрлийг Монголд зардаг дэлгүүр: ~' + n(pr.cat_sellers) + '</div>' : '')
      + (pr.temu_max != null ? '<div class="sm">Temu (зөвхөн мэдээлэл): ' + mnt(pr.temu_min) + '–' + mnt(pr.temu_max) + '</div>' : '') + '</div>');
    var mn = c.mn || {};
    o('<div class="v5-ev"><div class="el"><b>🇲🇳 Монголын зах зээл</b><span class="sm">' + esc(mn.at || '') + '</span></div><strong>' + why('F6') + '</strong>' + (mn.status ? '<div class="sm">' + esc(String(mn.status).slice(0, 260)) + '</div>' : '') + (mn.tactic ? '<div class="sm">Ялгарах: ' + esc(String(mn.tactic).slice(0, 200)) + '</div>' : '') + '</div>');
    var sp = c.supply || {}, vs = sp.variants || [];
    o('<div class="v5-ev"><div class="el"><b>🏭 1688 · зургаар таарсан</b>' + lnk(c.cn_url, 'дэлгүүр нээх') + '</div>' + (vs.length ? 'Авах хувилбараа дарж сонгоно уу — өртгийн талбарт орно:' : esc(c.sku_note || why('F7')))
      + (vs.length ? '<div class="v5-sk">' + vs.map(function (v) { return '<button class="v5-vr" data-n="' + esc(v.name) + '" data-c="' + esc(v.cny == null ? '' : v.cny) + '" data-w="' + esc(v.weight_g == null ? '' : v.weight_g) + '">' + esc(v.name) + (v.cny != null ? ' · ¥' + esc(v.cny) : '') + (v.weight_g != null ? ' · ' + n(v.weight_g) + ' г' : '') + '</button>'; }).join('') + '</div>' : '')
      + (sp.shop_repeat_pct != null ? '<div class="sm">дэлгүүрийн давтан худалдан авалт ' + esc(sp.shop_repeat_pct) + '%</div>' : '') + '</div>');
    o('<div class="v5-ev"><div class="el"><b>⚠ Эрсдэл</b></div>' + why('F0') + (c.note ? '<div class="sm">' + esc(c.note) + '</div>' : '') + '</div>');
    o('</div><div class="v5-ft"><button class="v5-take">Тестэд авъя</button><button class="v5-no">Татгалзах</button><div class="h">«Тестэд авъя» дармагц бараа тестийн жагсаалтад орж, шүүлтүүрийн дүн ба хүслийн оноо түгжигдэнэ. Дараа нь чатад «№' + f + ' тестэд авлаа» гэж хэлээрэй.</div></div>');
    o('<div class="v5-rj"><div class="rs">' + Object.keys(V5R).map(function (k, i) { return '<label><input type="radio" name="v5r' + f + '" value="' + k + '"' + (i ? '' : ' checked') + '> ' + V5R[k] + '</label>'; }).join('') + '</div><input type="text" class="v5-rn" placeholder="тайлбар (заавал биш)"><button class="v5-sv" data-act="reject">Татгалзаж хадгалах</button></div></div>');
  });
  if (D.review || D.closed3 || D.mine) o(knBlocks(D)); /* KN: эзэн шалгах · уурхай · хаагдсан */
  o('<details class="v5-dd"' + (C.length ? '' : ' open') + '><summary>Досье бүрдүүлж буй ' + n(B.length) + ' бараа — аль шүүлтүүр дутуу</summary><div class="in">' + (B.length ? B.map(function (b) {
    var G = b.gates || {};
    return '<div class="v5-br"><div class="bn">' + esc(b.name) + '<small>№' + b.find_id + ' · ' + n(b.pass_n) + ' / 8 давсан' + (+b.fail_n ? ' · ' + n(b.fail_n) + ' унасан' : '') + '</small></div><div class="v5-gs">' + Object.keys(V5G).map(function (k) { var s = (G[k] || {}).st; return '<span class="v5-g ' + (s === 'pass' ? 'p' : s === 'fail' ? 'f' : '') + '" title="' + esc((G[k] || {}).why || '') + '">' + (s === 'pass' ? '✓ ' : s === 'fail' ? '✕ ' : '… ') + V5G[k] + '</span>'; }).join('') + '</div></div>';
  }).join('') : 'Одоогоор досье эхлээгүй. Дараагийн судалгааны ажиллагаа эхний 2–3 барааг авна.') + '</div></details>');
  if (D.hunt) { /* JZ: анчны гарц */
    var H = D.hunt, HL = H.lanes || {}, HS = H.stuck || {}, HR = H.runs || [], HF = H.refused || [], hl = function (k) { return HL[k] || {}; };
    var hsum = (+hl('A').added || 0) + (+hl('B').added || 0), hrdy = (+hl('A').ready || 0) + (+hl('B').ready || 0);
    o('<details class="v5-dd"><summary>🏹 Анчин — ' + (HR.length ? 'сүүлд ' + esc(HR[0].at) + ' · нийт ' + n(hsum) + ' бараа оруулсан, ' + n(hrdy) + ' нь 8 / 8' : 'анхны ажиллагаагаа хүлээж байна') + '</summary><div class="in">Шөнө 02:23-т хайна: Даваа, Баасан — <b>А</b> Монголын хэрэгцээнээс (хүмүүс аль хэдийн мөнгө төлдөг зүйлийн илт илүү хувилбар) · Лхагва — <b>Б</b> гадаадад сайн зарагддаг, Монголд байхгүй бараа. Оролтын хаалга: онцгой биш, гол сэдэл сул, үнэ цэнэд хүрэхгүй, 1688-д зургаар таараагүй бараа санд орохгүй.'
      + ['A', 'B'].map(function (k) { var x = hl(k); return '<div class="v5-br"><div class="bn">Эгнээ ' + (k === 'A' ? 'А · Монголоос' : 'Б · гадаадаас') + '<small>санд орсон ' + n(x.added || 0) + ' → 8 / 8 давсан ' + n(x.ready || 0) + ' → тестэд ' + n(x.tested || 0) + ' → ялсан ' + n(x.won || 0) + (+x.rejected ? ' · та татгалзсан ' + n(x.rejected) : '') + (+x.failed ? ' · шүүлтүүрт унасан ' + n(x.failed) : '') + '</small></div></div>'; }).join('')
      + (Object.keys(HS).length ? '<div class="v5-br"><div class="bn">Хаана гацаж байна<small>анчны бараа аль шүүлтүүрийг хараахан даваагүй</small></div><div class="v5-gs">' + Object.keys(V5G).filter(function (k) { return HS[k]; }).map(function (k) { return '<span class="v5-g">' + V5G[k] + ' ' + n(HS[k]) + '</span>'; }).join('') + '</div></div>' : '')
      + HR.map(function (r) { return '<div class="v5-br"><div class="bn">' + esc(r.at) + ' · эгнээ ' + (r.lane === 'B' ? 'Б' : 'А') + (r.domain ? ' · ' + esc(r.domain) : '') + '<small>шүүсэн ' + n(r.scanned) + ' → шилдэг ' + n(r.shortlisted) + ' → санд ' + n(r.added) + (r.note ? ' — ' + esc(r.note) : '') + ((r.near || []).length ? '<br>ойрхон: ' + r.near.map(esc).join(' · ') : '') + ((r.new_motives || []).length ? '<br>шинэ сэдэл: ' + r.new_motives.map(esc).join(' · ') : '') + '</small></div></div>'; }).join('')
      + (HF.length ? '<div class="v5-br"><div class="bn">Хаалганд унасан<small>' + HF.map(function (f) { return esc(f.at) + ' · ' + esc(f.product) + ' — ' + esc(f.why); }).join('<br>') + '</small></div></div>' : '')
      + '</div></details>');
  }
  if (D.mnmap && !D.mnmap.err) o(mnmapBlock(D.mnmap)); /* KJ: зах зээлийн зураг */
  o('<details class="v5-dd"><summary>Татгалзсан ' + n(RJ.length) + ' бараа — шалтгаантай</summary><div class="in">' + (RJ.length ? RJ.map(function (r) { return '<div class="v5-br"><div class="bn">' + esc(r.name) + '<small>№' + r.find_id + ' · ' + esc(V5R[r.reason] || r.reason || '') + (r.note ? ' — ' + esc(r.note) : '') + ' · ' + esc(r.at || '') + '</small></div><button class="v5-ur" data-f="' + r.find_id + '">буцаах</button></div>'; }).join('') : 'алга') + '<div class="v5-out" id="v5our"></div></div></details>');
  o('<details class="v5-dd"><summary>Дүрэм ба арга</summary><div class="in">Бараа энд гарахын тулд 8 шүүлтүүрийг бүгдийг давна: хийж болох · демо бичлэг + авах сонирхлын дохио · борлуулалтын нотолгоо · худалдан авах хүсэл · зах зээлийн хэмжээ · үнэ цэн (Монгол дахь орлуулагчийн үнэ × манай бараа хэр онцгой; ашиг ≥ ' + mnt(cfg.profit_min) + ') · Монголын өрсөлдөөн · 1688 нийлүүлэлт. Нотолгоогүй хариултыг систем хүлээж авахгүй.<br><br><b>Хүсэл = 100 × Сэдэл × Хялбар × Өдөөлт</b>; гол сэдэл хүчтэй (2 оноо) байх ёстой. Шар өнгө = босгын зах дээр давсан. Манай 3 тестийн сургамж: хамгийн вирал бараа унасан, ялгасан нь сэдэл ба нэгжийн ашиг. Ширээний шүүлтүүр «заавал ялна» гэж амлахгүй — эцсийн шалгалт нь бичил тест (30,000₮-д 0 захиалга бол зогсоно).</div></details></div>');
  return h.join('');
}
function testsV5Client(root, post, show, reload) {
  if (typeof knWhatIf === 'function') knWhatIf(root); /* KN: үнийн тооцоолуур */
  var qa = function (s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); };
  qa('.v5-cand').forEach(function (card) {
    var f = +card.dataset.f, out = card.querySelector('#v5o' + f), fm = function (k) { return card.querySelector('.v5-fm[data-k="' + k + '"]'); };
    qa('.v5-ed', card).forEach(function (b) { b.addEventListener('click', function () { fm(b.dataset.fm).classList.toggle('on'); }); });
    qa('.v5-vr', card).forEach(function (b) {
      b.addEventListener('click', function () {
        qa('.v5-vr', card).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
        var c = fm('c'); c.classList.add('on');
        if (b.dataset.c) c.querySelector('.v5-cy').value = b.dataset.c;
        if (b.dataset.w) c.querySelector('.v5-cw').value = b.dataset.w;
        c.querySelector('.v5-cn').value = 'хувилбар: ' + b.dataset.n;
        c.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
    qa('.v5-sv', card).forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.dataset.act;
        if (a === 'price') {
          var v = card.querySelector('.v5-ip').value;
          post({ action: 'price', find_id: f, price_mnt: v ? +v : null, note: card.querySelector('.v5-in').value || '' }, b, out).then(function () { show(out, '✓ Үнэ хадгалагдлаа — шүүлтүүрийг дахин тооцож байна'); reload(700); });
        } else if (a === 'cost') {
          var cy = card.querySelector('.v5-cy').value, cs = card.querySelector('.v5-cs').value, cw = card.querySelector('.v5-cw').value;
          if (!cy) { show(out, '⚠️ Барааны ¥ үнийг оруулна уу'); return; }
          post({ action: 'cost', find_id: f, cn_price: +cy, cn_ship_cny: cs === '' ? null : +cs, weight_g: cw ? +cw : null, cn_offer_url: null, note: card.querySelector('.v5-cn').value || '', by: 'эзэн' }, b, out).then(function () { show(out, '✓ Өртөг хадгалагдлаа — ашгийг дахин тооцож байна'); reload(700); });
        } else if (a === 'reject') {
          var r = card.querySelector('.v5-rj input[type=radio]:checked');
          post({ action: 'findact', do: 'reject', find_id: f, reason: r ? r.value : 'other', note: card.querySelector('.v5-rn').value || '', by: 'эзэн' }, b, out).then(function () { show(out, '✓ Татгалзлаа — судалгаа үүнээс суралцана'); reload(700); });
        }
      });
    });
    card.querySelector('.v5-no').addEventListener('click', function () { card.querySelector('.v5-rj').classList.toggle('on'); });
    card.querySelector('.v5-take').addEventListener('click', function () {
      var b = this;
      post({ action: 'select', find_id: f, by: 'owner' }, b, out).then(function () {
        show(out, '✅ <b>Тестэд орлоо.</b> Одоо чатад «№' + f + ' тестэд авлаа» гэж бичээрэй — тестийн бэлтгэл эхэлнэ. <button class="v5-sv" onclick="location.reload()">Шинэчлэх</button>');
      });
    });
  });
  qa('.v5-ur').forEach(function (b) { b.addEventListener('click', function () { post({ action: 'findact', do: 'unreject', find_id: +b.dataset.f, by: 'эзэн' }, b, root.querySelector('#v5our')).then(function () { reload(500); }); }); });
}

/* KJ — «Тест» хуудасны «🗺 Зах зээлийн зураг» хэсэг. Өгөгдөл: v5_board().mnmap (mnmap_board()).
   Дүрэм: starshopping-board-page-design — дүгнэлт 1 мөр → KPI → ≤3 график → 2 жижиг карт → бусад нь <details>. Орон нутгийн анги .mm-* */
function mnmapBlock(M) {
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var n = function (x) { return x == null || x === '' ? '—' : Math.round(Number(x)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var mnt = function (x) { return x == null || x === '' ? 'үнэ бичээгүй' : n(x) + '₮'; };
  var pct = function (a, b) { return b ? Math.round(100 * a / b) : 0; };
  var CSS = '.mm .mm-v{border-left:4px solid var(--warn);background:var(--s2);border-radius:10px;padding:11px 14px;font-size:13.5px;line-height:1.5;color:var(--ink);margin:2px 0 12px;display:flex;gap:6px 16px;flex-wrap:wrap;align-items:baseline}.mm .mm-v b{font-weight:700}.mm .mm-v .mm-r{margin-left:auto;font-size:11px;color:var(--mut);white-space:nowrap}'
    + '.mm .mm-g{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:var(--gap);margin-bottom:var(--gap)}@media(max-width:980px){.mm .mm-g{grid-template-columns:minmax(0,1fr)}}'
    + '.mm .mm-c{background:var(--s1);border:1px solid var(--ln);border-radius:var(--r);padding:13px 14px;min-width:0}.mm .mm-h{font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:700;color:var(--mut);margin-bottom:9px}.mm .mm-h em{font-style:normal;text-transform:none;letter-spacing:0;font-weight:400;font-size:11px;margin-left:6px}'
    + '.mm .mm-b{display:grid;grid-template-columns:104px minmax(0,1fr) auto;gap:8px;align-items:center;padding:3px 0;font-size:12px}.mm .mm-b .mm-l{color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mm .mm-b .mm-t{height:12px;background:var(--ln3);border-radius:6px;overflow:hidden;display:flex}.mm .mm-b .mm-t i{display:block;height:100%;background:var(--f3)}.mm .mm-b .mm-t i.c{background:var(--crit)}.mm .mm-b .mm-t i.g{background:var(--good)}.mm .mm-b .mm-t i.m{background:var(--ln2)}.mm .mm-b .mm-x{font-variant-numeric:tabular-nums;font-size:11.5px;color:var(--ink);white-space:nowrap;min-width:64px;text-align:right}.mm .mm-b .mm-x small{color:var(--mut);font-size:10.5px}'
    + '.mm .mm-k{display:flex;gap:12px;font-size:10.5px;color:var(--mut);margin-top:7px;flex-wrap:wrap}.mm .mm-k span:before{content:"";display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px;background:var(--f3)}.mm .mm-k span.c:before{background:var(--crit)}.mm .mm-k span.g:before{background:var(--good)}.mm .mm-k span.x:before{display:none}'
    + '.mm .mm-s{margin-top:12px;padding-top:10px;border-top:1px solid var(--ln3)}'
    + '.mm .mm-i{display:flex;gap:10px;justify-content:space-between;align-items:baseline;padding:6px 0;border-top:1px solid var(--ln3);font-size:12.5px}.mm .mm-i:first-of-type{border-top:0}.mm .mm-i .mm-n{min-width:0;color:var(--ink);font-weight:600;overflow-wrap:anywhere}.mm .mm-i .mm-n small{display:block;font-weight:400;font-size:11px;color:var(--mut)}.mm .mm-i .mm-p{white-space:nowrap;font-variant-numeric:tabular-nums;text-align:right;color:var(--ink)}.mm .mm-i .mm-p small{display:block;font-size:11px;color:var(--mut)}'
    + '.mm details.mm-d{margin-top:2px}.mm details.mm-d>summary{cursor:pointer;font-size:12px;color:var(--ink2);padding:8px 0}.mm .mm-d .sc{margin:6px 0 12px}.mm .mm-d td.r,.mm .mm-d th.r{text-align:right;font-variant-numeric:tabular-nums}.mm .mm-d td.wr{white-space:normal;min-width:160px}.mm .mm-m{font-size:11.5px;color:var(--mut);line-height:1.55}';
  var K = M.kpi || {}, C = M.cats || [], B = M.bands || [], A = M.age || [], AN = M.anchors || [], BD = M.body || [], CL = M.clones || [];
  var cmax = Math.max.apply(null, C.map(function (c) { return c.pages; }).concat([1]));
  var bsum = B.reduce(function (s, b) { return s + b.n; }, 0), bmax = Math.max.apply(null, B.map(function (b) { return b.n; }).concat([1]));
  var asum = A.reduce(function (s, a) { return s + a.n; }, 0), amax = Math.max.apply(null, A.map(function (a) { return a.n; }).concat([1]));
  var item = function (x) { return '<div class="mm-i"><div class="mm-n">' + esc(x.product) + '<small>' + esc(x.page || '') + (x.pages > 1 ? ' · ' + n(x.pages) + ' хуудас' : '') + (x.claims ? ' · зар нь амлалттай' : '') + '</small></div><div class="mm-p">' + mnt(x.price) + '<small>' + n(x.days) + ' хоног</small></div></div>'; };
  var top = C[0] || null, share = top && top.ads ? Math.round(100 * top.claims / top.ads) : 0;
  var verdict = top ? esc(top.cat) + ' хамгийн олон худалдагчтай (' + n(top.pages) + ' хуудас)' + (share >= 50 ? ', гэхдээ зарын ' + share + '% нь «эмчилнэ» гэсэн амлалттай.' : '.') : 'Өгөгдөл алга.';
  var bp = BD.map(function (x) { return +x.price; }).filter(function (v) { return v >= 30000 && v <= 150000; });
  var verdict2 = bp.length ? 'Төхөөрөмж, зүүдэг эдлэлийн үнэ ' + Math.round(Math.min.apply(null, bp) / 1000) + '–' + Math.round(Math.max.apply(null, bp) / 1000) + ' мянга.' : '';
  var stale = +M.stale_days > 8 ? ' (⚠ ' + n(M.stale_days) + ' хоногийн өмнө)' : '';
  var h = [];
  h.push('<style>' + CSS + '</style><details class="v5-dd mm"' + (M.open ? ' open' : '') + '><summary>🗺 Зах зээлийн зураг — ' + esc(M.read_at) + ' уншсан' + stale + ' · 90+ хоног зартай онлайн худалдагч ' + n(K.sellers90) + ' хуудас · анчны тулгуур ' + n(AN.length) + ' бараа</summary><div class="in">');
  h.push('<div class="mm-v"><span><b>' + verdict + '</b> ' + verdict2 + '</span><span class="mm-r">' + n(M.ads) + ' зар · ' + n(M.pages) + ' хуудас · ' + n(M.terms) + ' үгээр уншсан</span></div>');
  h.push('<div class="krow krow4">'
    + '<div class="k"><div class="kl">Онлайн худалдагч</div><div class="kv">' + n(K.sellers90) + '</div><div class="ks">90+ хоног зартай хуудас · 180+ нь ' + n(K.sellers180) + '</div></div>'
    + '<div class="k warn"><div class="kl">30 мянгаас доош</div><div class="kv">' + pct(K.p_lt30, K.priced) + '%</div><div class="ks">үнэ бичсэн ' + n(K.priced) + ' зарын ' + n(K.p_lt30) + ' нь</div></div>'
    + '<div class="k good"><div class="kl">50 мянга ба дээш</div><div class="kv">' + pct(K.p_ge50, K.priced) + '%</div><div class="ks">' + n(K.p_ge50) + ' зар · 80 мянга+ нь ' + n(K.p_ge80) + '</div></div>'
    + '<div class="k"><div class="kl">Анчны тулгуур</div><div class="kv">' + n(AN.length) + '</div><div class="ks">50 мянга+, 180+ хоног · «Монголоос» эгнээнд</div></div></div>');
  h.push('<div class="mm-g"><div class="mm-c"><div class="mm-h">Ангилал<em>90+ хоног зартай онлайн худалдагчийн хуудас</em></div>'
    + C.map(function (c) { var cs = c.ads ? c.claims / c.ads : 0, w = 100 * c.pages / cmax; return '<div class="mm-b"><div class="mm-l">' + esc(c.cat) + '</div><div class="mm-t"><i class="c" style="width:' + (w * cs).toFixed(1) + '%"></i><i style="width:' + (w * (1 - cs)).toFixed(1) + '%"></i></div><div class="mm-x">' + n(c.pages) + ' <small>· ' + n(c.med) + '₮</small></div></div>'; }).join('')
    + '<div class="mm-k"><span class="c">зар нь «эмчилнэ» амлалттай</span><span>амлалтгүй</span><span style="margin-left:auto" class="x">тоо = хуудас · голч үнэ</span></div></div>'
    + '<div class="mm-c"><div class="mm-h">Үнэ<em>үнэ бичсэн ' + n(bsum) + ' зар</em></div>'
    + B.map(function (b) { return '<div class="mm-b"><div class="mm-l">' + esc(b.label) + '</div><div class="mm-t"><i class="' + (b.hi ? 'g' : 'm') + '" style="width:' + (100 * b.n / bmax).toFixed(1) + '%"></i></div><div class="mm-x">' + n(b.n) + ' <small>· ' + pct(b.n, bsum) + '%</small></div></div>'; }).join('')
    + '<div class="mm-s"><div class="mm-h">Зарын нас<em>' + pct((A[A.length - 1] || {}).n || 0, asum) + '% нь л 180 хоног давсан</em></div>'
    + A.map(function (a, i) { return '<div class="mm-b"><div class="mm-l">' + esc(a.label) + '</div><div class="mm-t"><i class="' + (i === A.length - 1 ? 'g' : 'm') + '" style="width:' + (100 * a.n / amax).toFixed(1) + '%"></i></div><div class="mm-x">' + n(a.n) + ' <small>· ' + pct(a.n, asum) + '%</small></div></div>'; }).join('') + '</div></div></div>');
  h.push('<div class="mm-g"><div class="mm-c"><div class="mm-h">Анчны тулгуур<em>хамгийн удаан зарагдаж буй 6</em></div>' + AN.slice(0, 6).map(item).join('') + '</div>'
    + '<div class="mm-c"><div class="mm-h">Биеийн тав тух, галбир<em>төхөөрөмж, зүүдэг эдлэл</em></div>' + BD.slice(0, 6).map(item).join('') + '</div></div>');
  h.push('<details class="mm-d"><summary>Бүх тулгуур ' + n(AN.length) + ' бараа · олон хуудас зардаг ' + n(CL.length) + ' бараа · арга</summary>'
    + '<div class="sc"><table><tr><th>Тулгуур бараа</th><th class="r">Үнэ</th><th class="r">Хоног</th><th>Хуудас</th></tr>' + AN.map(function (x) { return '<tr><td class="wr">' + esc(x.product) + (x.claims ? ' <small style="color:var(--crit)">амлалттай</small>' : '') + '</td><td class="r">' + mnt(x.price) + '</td><td class="r">' + n(x.days) + '</td><td>' + esc(x.page) + '</td></tr>'; }).join('') + '</table></div>'
    + '<div class="sc"><table><tr><th>Олон хуудас зардаг бараа</th><th class="r">Хуудас</th><th class="r">Хоног</th><th class="r">Үнэ</th></tr>' + CL.map(function (x) { return '<tr><td class="wr">' + esc(x.product) + '</td><td class="r">' + n(x.pages) + '</td><td class="r">' + n(x.dmin) + '–' + n(x.dmax) + '</td><td class="r">' + mnt(x.price) + '</td></tr>'; }).join('') + '</table></div>'
    + '<div class="mm-m">Эх: Meta Ad Library (Монгол, идэвхтэй зар) → <code>ad_signals</code>; хуудас, зар бүрийг гараар ангилсан (<code>page_verdicts</code>, <code>ad_verdicts</code>). Удаан явж буй зар = худалдагч мөнгө зарцуулсаар байгаагийн нотолгоо, борлуулалтын тоо биш. Тулгуур = онлайн худалдагчийн 50,000₮-өөс дээш үнэтэй, 180+ хоног явсан зартай бараа (уудаг, эмчилгээний бараа орохгүй) — анч «Монголоос» эгнээндээ эндээс эхэлнэ. Сүүлийн ' + n(M.fresh_days) + ' хоногт харагдсан зарыг тоолно; хайлтын бүх үг уншигдаагүй бол тоо бодитоос бага.</div></details>');
  h.push('</div></details>');
  return h.join('');
}

/* KN (2026-11-21): «Эзэн шалгах» (1–2 шүүлтүүрт унасан) + үнийн тооцоолуур · «Хаагдсан» (3+ унасан) · «Уурхай» (7 хоногийн юүлүүр).
   Өгөгдөл: v5_board() → review[], closed3[], mine{}. Хуудасны дотоод класс: .kn-* (board.css-тэй мөргөлдөхгүй). */
function knBlocks(D) {
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var n = function (x) { return x == null || x === '' ? '—' : Math.round(Number(x)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var GN = { F0: 'Хийж болох', F1: 'Бичлэг, сонирхол', F2: 'Борлуулалт', F3: 'Авах хүсэл', F4: 'Зах зээл', F5: 'Үнэ цэн', F6: 'МН өрсөлдөөн', F7: '1688' };
  var R = D.review || [], C = D.closed3 || [], M = D.mine || {}, h = [];
  var o = function (s) { h.push(s); };
  o('<style>'
    + '.kn-h{display:flex;align-items:baseline;gap:10px;margin:22px 0 10px}.kn-h b{font-size:15px}.kn-h span{font-size:12px;color:var(--ink2)}'
    + '.kn-c{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:14px 16px;margin:0 0 12px}'
    + '.kn-t{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 8px}.kn-t b{font-size:14.5px}.kn-t small{font-size:11.5px;color:var(--ink2)}'
    + '.kn-p{font-size:11px;font-weight:650;border-radius:99px;padding:2px 9px;border:1px solid var(--ln)}.kn-p.f{color:var(--crit);border-color:var(--crit)}.kn-p.g{color:var(--good);border-color:var(--good)}.kn-p.m{color:var(--ink2)}'
    + '.kn-f{font-size:12.5px;line-height:1.5;margin:2px 0;padding-left:10px;border-left:3px solid var(--crit)}.kn-f i{font-style:normal;font-weight:650}'
    + '.kn-m{font-size:12px;color:var(--ink2);margin:6px 0 0}'
    + '.kn-ft{margin:12px 0 4px;display:grid;gap:8px;font-size:13px}.kn-fi{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid var(--ln);border-radius:10px;padding:8px 11px;background:var(--s2)}.kn-fi .kn-nm{font-weight:650}.kn-fi .kn-pc{font-size:12px;color:var(--good);font-variant-numeric:tabular-nums}.kn-fi small{display:block;font-size:12px;color:var(--ink2);margin-top:2px}.kn-fi a{font-size:12.5px;font-weight:650;text-decoration:none;color:inherit;border:1px solid var(--ln);border-radius:9px;padding:6px 11px;background:var(--s1);white-space:nowrap}.kn-fi .kn-nv{font-size:12px;color:var(--ink2)}'
    + '.kn-l{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0}.kn-l a,.kn-l span{font-size:12.5px;border-radius:9px;padding:6px 11px;border:1px solid var(--ln);text-decoration:none;color:inherit;background:var(--s2)}.kn-l a{font-weight:650}.kn-l .no{color:var(--warn);border-style:dashed;background:none}'
    + '.kn-w{display:grid;grid-template-columns:minmax(0,230px) minmax(0,1fr);gap:14px;margin:12px 0 0;padding:12px 0 0;border-top:1px dashed var(--ln)}'
    + '.kn-w label{font-size:11.5px;color:var(--ink2);display:block;margin:0 0 4px}.kn-w input[type=number]{width:100%;box-sizing:border-box;font:inherit;font-size:16px;font-weight:650;font-variant-numeric:tabular-nums;padding:7px 9px;border-radius:9px;border:1px solid var(--ln);background:var(--s2);color:inherit}'
    + '.kn-w input[type=range]{width:100%;margin:8px 0 0}.kn-r{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}'
    + '.kn-k{border:1px solid var(--ln);border-radius:10px;padding:8px 10px;min-width:0}.kn-k .l{font-size:11px;color:var(--ink2)}.kn-k .v{font-size:15px;font-weight:650;font-variant-numeric:tabular-nums;margin:2px 0}.kn-k .s{font-size:11px;line-height:1.35;color:var(--ink2)}'
    + '.kn-k.ok .v{color:var(--good)}.kn-k.no .v{color:var(--crit)}'
    + '.kn-fn{display:grid;gap:6px;margin:10px 0 0}.kn-fr{display:grid;grid-template-columns:150px minmax(0,1fr) 54px;gap:10px;align-items:center;font-size:12.5px}.kn-fr .b{display:block;height:10px;border-radius:99px;background:var(--s2);overflow:hidden}.kn-fr .b i{display:block;height:100%;border-radius:99px;background:var(--f3,var(--good))}.kn-fr .x{text-align:right;font-variant-numeric:tabular-nums;font-weight:650}'
    + '.kn-ch{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}.kn-ch span{font-size:11.5px;border:1px solid var(--ln);border-radius:99px;padding:2px 9px;color:var(--ink2)}'
    + '@media(max-width:640px){.kn-w{grid-template-columns:minmax(0,1fr)}.kn-r{grid-template-columns:minmax(0,1fr)}.kn-fr{grid-template-columns:110px minmax(0,1fr) 40px}}'
    + '</style>');

  /* LN (11-22): «Хайлт» хуудастай холбоос — хоёр хуудас нэг шугам: Хайлт (олох, чиний нүд) → Тест */
  o('<div class="kn-h" style="margin-bottom:0"><span>Бараа хайлт: чиний нүд хэрэгтэй <b>' + n((M.owner_look || {}).n) + '</b> · Монголын шалгалт хүлээж буй <b>' + n((M.owner_look || {}).mn_queue) + '</b> — <a href="/board/?view=mine" style="color:var(--gold);font-weight:700">«Хайлт» хуудас →</a></span></div>');
  /* 1 — Эзэн шалгах */
  o('<div class="kn-h"><b>Эзэн шалгах — 1–2 шүүлтүүрт унасан ' + n(R.length) + ' бараа</b><span>3 унавал автоматаар хаагдана · үнээ өөрчилж үзэж болно</span></div>');
  if (!R.length) o('<div class="kn-c"><div class="kn-m">Одоогоор алга.</div></div>');
  R.forEach(function (r) {
    var G = r.gates || {}, W = r.wi || {}, fails = [], miss = [];
    Object.keys(GN).forEach(function (k) { var g = G[k] || {}; if (g.st === 'fail') fails.push('<div class="kn-f"><i>' + GN[k] + ':</i> ' + esc(g.why) + '</div>'); else if (g.st !== 'pass') miss.push(GN[k]); });
    o('<div class="kn-c" data-kn=\'' + esc(JSON.stringify({ landed: r.landed, sell: r.sell, wi: W })) + '\'>');
    o('<div class="kn-t"><b>' + esc(r.name) + '</b><small>№' + r.find_id + ' · ' + esc(r.category || '') + '</small><span class="kn-p f">' + n(r.fail_n) + ' унасан</span><span class="kn-p g">' + n(r.pass_n) + ' давсан</span>' + (+r.missing_n ? '<span class="kn-p m">' + n(r.missing_n) + ' бөглөөгүй</span>' : '') + '</div>');
    o(fails.join(''));
    if (miss.length) o('<div class="kn-m">Бөглөөгүй: ' + miss.join(' · ') + '</div>');
    o('<div class="kn-l">' + (r.src ? '<a href="' + esc(r.src) + '" target="_blank" rel="noopener">▶ Олсон эх сурвалж</a>' : '<span class="no">Эх сурвалжийн линк алга</span>')
      + (r.cn_url ? '<a href="' + esc(r.cn_url) + '" target="_blank" rel="noopener">1688 дэлгүүр · ¥' + esc(r.cn_total) + (r.weight_g ? ' · ' + n(r.weight_g) + ' г' : '') + '</a>' : '<span class="no">1688 линк алга — өөрөө хайж үзнэ</span>')
      + (r.mn ? '<span>Facebook: ' + n(r.mn.sellers) + ' зарагч' + (r.mn.pmin ? ' · ' + n(r.mn.pmin) + (r.mn.pmax && r.mn.pmax !== r.mn.pmin ? '–' + n(r.mn.pmax) : '') + '₮' : '') + ' · ' + esc(r.mn.at) + '</span>' : '<span class="no">Монголд Facebook-ээр шалгаагүй</span>') + '</div>');
    o('<div class="kn-w"><div><label>Зарах үнэ, ₮ (системийн үнэ ' + n(r.sell) + ')</label><input type="number" class="kn-sell" step="1000" min="0" value="' + (r.sell || 0) + '"><input type="range" class="kn-rng" min="' + Math.max(0, Math.round((r.landed || 0) / 1000) * 1000) + '" max="' + Math.round(((r.sell || 100000) * 2) / 1000) * 1000 + '" step="1000" value="' + (r.sell || 0) + '"></div><div class="kn-r"></div></div></div>');
  });

  /* 2 — Уурхай */
  var st = M.by_status || {}, tot = +M.intake || 0, mx = Math.max(tot, 1);
  var rows = [['Үзсэн бараа', tot], ['Шүүлтээр хассан', +st.screened_out || 0], ['Хүсэл / үнээр хаасан', +st.closed || 0], ['Монголд ханасан', +st.mn_saturated || 0], ['Онцолсон', +st.featured || 0], ['Досьед орсон', +st.dossier || 0]];
  var EY = M.eye || {}, FT = M.featured || [];
  o('<details class="v5-dd"><summary>⛏ Уурхай — сүүлийн ' + n(M.days || 7) + ' хоногт ' + n(tot) + ' бараа үзсэн · ' + n(M.mn_checks) + ' шалгалт · ' + n(M.mn_names) + ' монгол нэршил</summary><div class="in"><div class="kn-fn">'
    + rows.map(function (x) { return '<div class="kn-fr"><span>' + x[0] + '</span><span class="b"><i style="width:' + Math.max(2, Math.round(100 * x[1] / mx)) + '%"></i></span><span class="x">' + n(x[1]) + '</span></div>'; }).join('')
    + '</div><div class="kn-ch">' + Object.keys(M.by_cat || {}).map(function (k) { return '<span>' + esc(k) + ' ' + n(M.by_cat[k]) + '</span>'; }).join('') + '</div>'
    + (FT.length ? '<div class="kn-ft"><b>Онцолсон ' + n(FT.length) + ' бараа</b>' + FT.map(function (f) { var pc = f.owner_pct != null ? 'эзэн ' + n(f.owner_pct) + '%' : (f.model_pct != null ? 'загвар ' + n(f.model_pct) + '%' : ''); return '<div class="kn-fi"><div><span class="kn-nm">' + esc(f.name) + '</span>' + (pc ? ' <span class="kn-pc">' + pc + '</span>' : '') + '<small>' + esc(f.why || '') + '</small></div>' + (f.video ? '<a href="' + esc(f.video) + '" target="_blank" rel="noopener">▶ Бичлэг</a>' : '<span class="kn-nv">бичлэг алга</span>') + '</div>'; }).join('') + '</div>' : '')
    + (EY.n ? '<div class="kn-m">Эзний нүдний загвар ' + esc(EY.ver || '') + ': таны ' + n(EY.n) + ' үнэлгээнээс бодсон · дундаж зөрүү ' + esc(EY.mae) + ' оноо · таны өндөр үнэлсэн ' + n(EY.owner_top) + ' барааны ' + n(EY.both_top) + '-г зөв таньсан · загвараар үнэлсэн ' + n(EY.auto_n) + ' бараа</div>' : '')
    + '<div class="kn-m">Эх үүсвэр: TikTok Shop-ын өдрийн шилдэг ба сүүлийн 30 хоногийн шинэ бараа (ангиллаар) + TikTok бичлэг. Монголд байгаа эсэхийг Facebook-ийн хайлтаар, жинхэнэ монгол нэршлээр нь шалгана. Эзний үнэлгээ: ' + n(M.owner_rated) + '.</div></div></details>');

  /* 3 — Хаагдсан */
  o('<details class="v5-dd"><summary>Хаагдсан ' + n(C.length) + ' бараа — 3 ба түүнээс олон шүүлтүүрт унасан</summary><div class="in">' + (C.length ? C.map(function (c) {
    return '<div style="margin:0 0 10px"><b>' + esc(c.name) + '</b> <small>№' + c.find_id + ' · ' + esc(c.updated || '') + '</small>' + (c.fails || []).map(function (f) { return '<div class="kn-f" style="font-size:12px">' + esc(f) + '</div>'; }).join('') + '</div>';
  }).join('') : 'алга') + '</div></details>');
  return h.join('');
}

/* Үнэ өөрчилж үзэх тооцоолуур — серверт хүсэлт явуулахгүй, v5_gate-ийн F3 / F5 томьёог хуулбарлана. */
function knWhatIf(root) {
  var n = function (x) { return Math.round(Number(x)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  [].forEach.call(root.querySelectorAll('.kn-c[data-kn]'), function (card) {
    var d = JSON.parse(card.getAttribute('data-kn')), W = d.wi || {}, inp = card.querySelector('.kn-sell'), rng = card.querySelector('.kn-rng'), out = card.querySelector('.kn-r');
    var calc = function (sell) {
      var k = [], profit = d.landed == null ? null : sell - d.landed - (W.deliv || 7000);
      k.push(profit == null ? ['', 'Ашиг', '—', 'өртөг тодорхойгүй'] : [profit >= W.profit_min ? 'ok' : 'no', 'Ашиг', n(profit) + '₮', 'босго ' + n(W.profit_min) + '₮ · буусан өртөг ' + n(d.landed) + '₮']);
      k.push(W.cap == null ? ['', 'Үнэ цэн', '—', 'Монгол дахь орлуулагч, түүний үнэ бичээгүй'] : [sell <= W.cap ? 'ok' : 'no', 'Үнэ цэн', sell <= W.cap ? 'багтана' : 'хэтэрнэ', 'дээд ' + n(W.cap) + '₮ («' + (W.anchor || '') + '», онцгой ' + W.special + '/2)']);
      if (!W.ok) k.push(['', 'Авах хүсэл', '—', 'асуултууд бөглөөгүй']);
      else {
        var pct = 100 * sell / W.income, a1 = pct <= W.easy ? 2 : pct <= W.hard ? 1 : 0, A = (a1 + (+W.a_rest || 0)) / 8, sc = Math.round(100 * W.M * A * W.P);
        if (W.zero) k.push(['no', 'Авах хүсэл', sc, 'гол асуулт 0 оноотой — үнээс хамаарахгүй унана']);
        else if (String(W.m1) !== '2') k.push(['no', 'Авах хүсэл', sc, 'гол сэдэл хүчтэй биш — үнээс хамаарахгүй унана']);
        else { var ok = sc >= W.desire_min && W.M >= W.m_min && A >= W.a_min && W.P >= W.p_min; k.push([ok ? 'ok' : 'no', 'Авах хүсэл', sc, 'босго ' + W.desire_min + ' · үнэ орлогын ' + pct.toFixed(1) + '%']); }
      }
      out.innerHTML = k.map(function (x) { return '<div class="kn-k ' + x[0] + '"><div class="l">' + x[1] + '</div><div class="v">' + x[2] + '</div><div class="s">' + x[3] + '</div></div>'; }).join('');
    };
    var on = function (e) { var v = +e.target.value || 0; inp.value = v; rng.value = v; calc(v); };
    inp.addEventListener('input', on); rng.addEventListener('input', on); calc(+inp.value || 0);
  });
}
