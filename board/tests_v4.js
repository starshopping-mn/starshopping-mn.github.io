/* Тест хуудас v4 хэсэг (блок JJ/JL, 2026-11-16) — «тестийн үйлдвэр»: 4 хаалга + нотолгооны карт + микро-тест.
   tests.js-ээс дуудагдана: testsV4Block(d.v4). Өгөгдөл: board_read view 'v4cards' → v4_cards(). Нийлмэл оноо БАЙХГҮЙ.
   Бүтэц (starshopping-board-page-design): дүгнэлт → KPI → карт (≤6) → идэвхтэй тест → бусад нь <details>.
   «Тестэд сонгох» = хуучин урсгал (.sel-b → action=select). Загвар: main/board-push/2026-11-16-JJ-tests-v4-mockup/. */
function testsV4Block(D) {
  D = D || {};
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var n = function (x) { return x == null ? '—' : Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var mnt = function (x) { return x == null ? '—' : n(x) + '₮'; };
  var R = D.rule || {}, W = D.week || {}, C = (D.cards || []).slice(), T = D.tests || [];
  var failN = function (c) { var g = c.gates || {}; return ['price', 'cost', 'demo', 'temu'].filter(function (k) { return g[k] === 'fail'; }).length; };
  C.sort(function (a, b) { return (b.ready ? 1 : 0) - (a.ready ? 1 : 0) || b.pass_n - a.pass_n || failN(a) - failN(b) || b.profit - a.profit; });
  var shown = C.filter(function (c) { return failN(c) <= 1; }).slice(0, 6);
  var out = C.filter(function (c) { return shown.indexOf(c) < 0; });
  var ready = C.filter(function (c) { return c.ready; }).length;
  var needs = shown.length - ready;
  var GL = { price: 'Үнэ · ашиг', cost: 'Өртөг · жин', demo: 'Бичлэг', temu: 'Temu' };
  var GI = { pass: '✓', fail: '✕', check: '?' };
  var MN = { absent: ['МН-д алга', 'good'], emerging: ['МН-д 1–5 зарагч', 'good'], saturated: ['МН-д түгээмэл', 'warn'] };
  var CSS = ''
    + '.v4{display:flex;flex-direction:column;gap:14px}'
    + 'details.v4old{background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:0 16px;margin:14px 0 18px}details.v4old>summary{cursor:pointer;padding:12px 0;font-size:12.5px;font-weight:650;color:var(--ink2)}details.v4old[open]{padding-bottom:14px}'
    + '.v4 .out:empty{display:none}'
    + '.v4 .hero{display:flex;gap:14px;align-items:center;flex-wrap:wrap;background:var(--s1);border:1px solid var(--ln);border-left:4px solid var(--hc);border-radius:14px;padding:16px 18px}'
    + '.v4 .hero .tx{flex:1 1 320px;min-width:0}.v4 .hero .t1{font-size:17px;font-weight:700;line-height:1.35}.v4 .hero .t2{font-size:12.5px;color:var(--ink2);margin-top:3px;line-height:1.5}'
    + '.v4 .hero .rl{font-size:11px;color:var(--mut);line-height:1.6;flex:0 1 300px}'
    + '.v4 .krow{margin:0}.v4 .k .kv{font-size:24px;line-height:1.1}'
    + '.v4 .sh2{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-top:4px}.v4 .sh2 b{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);font-weight:700}.v4 .sh2 span{font-size:11.5px;color:var(--mut)}'
    + '.v4 .cg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}@media(max-width:980px){.v4 .cg{grid-template-columns:minmax(0,1fr)}}'
    + '.v4 .cd{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:14px 16px 13px;min-width:0;display:flex;flex-direction:column;gap:10px}'
    + '.v4 .cd.rdy{border-color:var(--good)}'
    + '.v4 .ct{display:flex;gap:10px;align-items:flex-start;justify-content:space-between}.v4 .ct .nm4{font-size:15px;font-weight:700;line-height:1.3;min-width:0}.v4 .ct .cat{font-size:11px;color:var(--mut);margin-top:2px}'
    + '.v4 .bdg{flex:none;font-size:10.5px;font-weight:800;letter-spacing:.04em;padding:4px 10px;border-radius:999px;white-space:nowrap;background:var(--s2);color:var(--ink2)}.v4 .bdg.rdy{background:var(--good-a);color:var(--good)}'
    + '.v4 .gt{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}'
    + '.v4 .g{border-radius:9px;padding:7px 8px;font-size:11px;line-height:1.25;background:var(--s2);color:var(--ink2);min-width:0}.v4 .g i{font-style:normal;font-weight:800;display:block;font-size:13px;margin-bottom:1px}'
    + '.v4 .g.pass{background:var(--good-a);color:var(--good)}.v4 .g.fail{background:var(--crit-a);color:var(--crit)}.v4 .g.check{background:var(--warn-a);color:var(--warn)}'
    + '.v4 .nums{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.v4 .nums div{font-size:10.5px;color:var(--mut);min-width:0}.v4 .nums b{display:block;font-size:15px;color:var(--ink);font-weight:700;font-variant-numeric:tabular-nums;line-height:1.2}.v4 .nums b.pos{color:var(--good)}.v4 .nums b.neg{color:var(--crit)}'
    + '.v4 .ln4{font-size:12px;color:var(--ink2);line-height:1.5}.v4 .ln4 em{font-style:normal;font-weight:700;font-size:10.5px;padding:2px 8px;border-radius:999px;margin-right:6px;white-space:nowrap}.v4 .ln4 em.good{background:var(--good-a);color:var(--good)}.v4 .ln4 em.warn{background:var(--warn-a);color:var(--warn)}'
    + '.v4 .ms{font-size:12px;color:var(--warn);line-height:1.5}.v4 .ms b{font-weight:700}'
    + '.v4 .ft{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:auto;padding-top:2px}.v4 .ft a{font-size:11.5px;font-weight:650;color:var(--gold);border:1px solid var(--ln2);border-radius:7px;padding:5px 10px;white-space:nowrap}.v4 .ft .no{font-size:11.5px;color:var(--mut)}'
    + '.v4 .ft .pk{margin-left:auto;font:inherit;font-size:12px;font-weight:700;padding:6px 14px;border-radius:8px;border:1px solid var(--good);background:var(--good-a);color:var(--good);cursor:pointer;white-space:nowrap}.v4 .ft .pk.off{border-color:var(--ln2);background:transparent;color:var(--mut);cursor:default}'
    + '.v4 .mt{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:14px 16px}'
    + '.v4 .mt .mr{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,2fr) auto;gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid var(--ln3);font-size:12.5px}.v4 .mt .mr:last-child{border-bottom:0}@media(max-width:700px){.v4 .mt .mr{grid-template-columns:minmax(0,1fr)}}'
    + '.v4 .bar{position:relative;height:10px;background:var(--s2);border-radius:999px}.v4 .bar i{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:var(--f3)}.v4 .bar u{position:absolute;top:-4px;width:2px;height:18px;background:var(--crit);border-radius:1px}'
    + '.v4 .bl{display:flex;justify-content:space-between;font-size:10.5px;color:var(--mut);margin-top:5px}'
    + '.v4 .emp{font-size:12.5px;color:var(--mut);line-height:1.55}'
    + '.v4 details.dd{background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:0 16px}.v4 details.dd>summary{cursor:pointer;padding:12px 0;font-size:12.5px;font-weight:650;color:var(--ink2)}.v4 details.dd .in{padding:0 0 14px;font-size:12.5px;color:var(--ink2);line-height:1.6}'
    + '.v4 .or{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid var(--ln3);font-size:12.5px}.v4 .or span{color:var(--mut);text-align:right}';
  var h = [], o = function (s) { h.push(s); };
  o('<style>' + CSS + '</style>');
  o('<div class="v4">');
  // 1 · дүгнэлт
  var lvl = ready >= 3 ? 'good' : ready >= 1 ? 'warn' : 'crit';
  var t1 = ready ? 'Тестэд бэлэн ' + ready + ' бараа · ' + needs + ' нь нотолгоо дутуу' : 'Тестэд бэлэн бараа алга · ' + needs + ' нь нотолгоо дутуу';
  var lt = D.last_test || {};
  o('<div class="hero" style="--hc:var(--' + lvl + ')"><div class="tx"><div class="t1">' + esc(t1) + '</div><div class="t2">' + (lt.days != null ? 'Сүүлийн тестээс хойш <b>' + esc(lt.days) + ' хоног</b> (' + esc(String(lt.on || '').slice(5).replace('-', '/')) + '). ' : '') + '3 бараа сонгоход долоо хоногийн ' + mnt(W.cap_mnt) + '-ийн дугтуйнаас тест эхэлнэ.</div></div>'
    + '<div class="rl">Тест бүрийн дүрэм: ' + mnt(R.kill_mnt) + ' зарцуулаад хаягтай захиалга 0 бол зогс · таг ' + mnt(R.cap_mnt) + ' · ≥' + R.win_orders + ' захиалга ба CPA ≤' + mnt(R.win_cpa_mnt) + ' бол ялагч нэр дэвшигч</div></div>');
  // 2 · KPI
  o('<div class="krow krow4">'
    + '<div class="k ' + lvl + '"><div class="kl">Бэлэн карт</div><div class="kv">' + ready + ' / ' + shown.length + '</div><div class="ks">4 хаалга бүгд давсан</div></div>'
    + '<div class="k"><div class="kl">7 хоногийн дугтуй</div><div class="kv">' + mnt(W.left_mnt) + '</div><div class="ks">зарцуулсан ' + mnt(W.spend_mnt) + ' · таг ' + mnt(W.cap_mnt) + '</div></div>'
    + '<div class="k"><div class="kl">Идэвхтэй тест</div><div class="kv">' + T.length + ' / 3</div><div class="ks">долоо хоногт 3 хүртэл</div></div>'
    + '<div class="k ' + (lt.days > 14 ? 'crit' : '') + '"><div class="kl">Сүүлийн тест</div><div class="kv">' + (lt.days != null ? esc(lt.days) + ' хоног' : '—') + '</div><div class="ks">зорилт: 7 хоног бүр 3 тест</div></div>'
    + '</div>');
  // 3 · картууд
  var card = function (c) {
    var g = c.gates || {}, m = c.mn || {}, ml = MN[m.gate] || ['МН шалгаагүй', 'warn'];
    var st = (m.status && m.status !== m.gate) ? String(m.status) : '';
    if (st.length > 120) st = st.slice(0, 117) + '…';
    var miss = (c.missing || []).filter(function (x) { return !/хаалга/.test(x); });
    var why = [];
    if (g.price === 'fail') why.push(c.bundle2 ? 'нэг ширхэг ' + mnt(c.sell) + ' — 2ш багцаар ' + mnt(R.price_min) + '+ болгоно' : 'үнэ ' + mnt(c.sell) + ' < ' + mnt(R.price_min));
    if (g.cost === 'fail') why.push(c.flags && c.flags.liquid ? 'шингэнтэй хувилбар — усгүй USB хувилбар олох' : 'буух өртөг ' + mnt(c.landed) + ' > ' + mnt(R.landed_max));
    if (g.temu === 'fail') why.push('Temu хямд зардаг');
    return '<div class="cd' + (c.ready ? ' rdy' : '') + '">'
      + '<div class="ct"><div><div class="nm4">' + esc(c.name) + '</div><div class="cat">' + esc(c.category) + ' · №' + c.find_id + '</div></div><span class="bdg' + (c.ready ? ' rdy' : '') + '">' + (c.ready ? 'ТЕСТЭД БЭЛЭН' : c.pass_n + ' / 4 хаалга') + '</span></div>'
      + '<div class="gt">' + ['price', 'cost', 'demo', 'temu'].map(function (k) { return '<div class="g ' + (g[k] || 'check') + '"><i>' + GI[g[k] || 'check'] + '</i>' + GL[k] + '</div>'; }).join('') + '</div>'
      + '<div class="nums"><div><b>' + mnt(c.sell) + '</b>зарах үнэ</div><div><b>' + mnt(c.landed) + '</b>буух өртөг</div><div><b class="' + (c.profit >= R.profit_min ? 'pos' : 'neg') + '">' + mnt(c.profit) + '</b>ашиг / ш</div><div><b>' + (c.weight_g ? n(c.weight_g) + ' г' : '—') + '</b>жин</div></div>'
      + '<div class="ln4"><em class="' + ml[1] + '">' + ml[0] + '</em>' + esc(st) + '</div>'
      + (c.temu_note ? '<div class="ln4">' + esc(c.temu_note) + '</div>' : '')
      + (why.length || miss.length ? '<div class="ms">' + (why.length ? '<b>Унасан:</b> ' + esc(why.join(' · ')) + (miss.length ? '<br>' : '') : '') + (miss.length ? '<b>Дутуу:</b> ' + esc(miss.join(' · ')) : '') + '</div>' : '')
      + '<div class="ft">' + (c.cn ? '<a href="' + esc(c.cn) + '" target="_blank" rel="noopener">1688</a>' : '') + (c.tt ? '<a href="' + esc(c.tt) + '" target="_blank" rel="noopener">▶ Бичлэг</a>' : '<span class="no">бичлэг алга</span>')
      + (c.ready ? '<button class="pk sel-b" data-f="' + c.find_id + '" data-n="' + esc(c.name) + '">Тестэд сонгох</button>' : '<button class="pk off" disabled>Нотолгоо хүлээж байна</button>') + '</div>'
      + (c.ready ? '<div class="out" id="out-sel' + c.find_id + '"></div>' : '')
      + '</div>';
  };
  o('<div class="sh2"><b>Нэр дэвшигч</b><span>долоо хоногт ≤6 карт · эзэн 3-ыг сонгоно · оноо байхгүй, хаалга бүр тусдаа</span></div>');
  o('<div class="cg">' + shown.map(card).join('') + '</div>');
  // 4 · идэвхтэй микро-тест
  o('<div class="sh2"><b>Идэвхтэй тест</b><span>зарцуулалт ба хаягтай захиалга — дүрэм өөрөө дохио өгнө (Telegram)</span></div>');
  o('<div class="mt">');
  if (!T.length) {
    o('<div class="emp">Идэвхтэй тест алга. Бараа сонгосны дараа мөр бүр ингэж харагдана:</div>'
      + '<div class="mr"><div><b>Жишээ бараа</b><br><span style="color:var(--mut)">0 захиалга · 18,400₮ зарцуулсан</span></div><div><div class="bar"><i style="width:30.7%"></i><u style="left:50%"></u></div><div class="bl"><span>0</span><span>' + mnt(R.kill_mnt) + ' — 0 захиалга бол зогс</span><span>' + mnt(R.cap_mnt) + ' таг</span></div></div><span class="bdg">ҮРГЭЛЖИЛЖ БАЙНА</span></div>');
  } else {
    T.forEach(function (t) {
      var pct = Math.min(100, 100 * (t.spend_mnt || 0) / R.cap_mnt);
      var vl = { win_candidate: 'ЯЛАГЧ НЭР ДЭВШИГЧ', stop_cap: 'ТАГТ ХҮРСЭН', kill: 'ЗОГС', 'continue': 'ҮРГЭЛЖИЛЖ БАЙНА' }[t.verdict] || t.verdict;
      o('<div class="mr"><div><b>' + esc(t.name) + '</b><br><span style="color:var(--mut)">' + n(t.orders) + ' захиалга · ' + mnt(t.spend_mnt) + (t.cpa_mnt ? ' · CPA ' + mnt(t.cpa_mnt) : '') + '</span></div><div><div class="bar"><i style="width:' + pct.toFixed(1) + '%"></i><u style="left:50%"></u></div><div class="bl"><span>0</span><span>' + mnt(R.kill_mnt) + '</span><span>' + mnt(R.cap_mnt) + '</span></div></div><span class="bdg' + (t.verdict === 'win_candidate' ? ' rdy' : '') + '">' + esc(vl) + '</span></div>');
    });
  }
  o('</div>');
  // 5 · бусад нь хаалттай
  if (out.length) {
    o('<details class="dd"><summary>Хаалга давахгүй ' + out.length + ' бараа</summary><div class="in">' + out.map(function (c) {
      var g = c.gates || {}; var f = ['price', 'cost', 'demo', 'temu'].filter(function (k) { return g[k] === 'fail'; }).map(function (k) { return GL[k]; });
      return '<div class="or"><div><b>' + esc(c.name) + '</b> · №' + c.find_id + '</div><span>' + esc(f.join(', ')) + ' · ашиг ' + mnt(c.profit) + '</span></div>';
    }).join('') + '</div></details>');
  }
  o('<details class="dd"><summary>Дүрэм ба арга</summary><div class="in">'
    + '<b>4 хаалга.</b> Үнэ ≥' + mnt(R.price_min) + ' ба хүргэлтийн дараах ашиг ≥' + mnt(R.profit_min) + ' · буух өртөг ≤' + mnt(R.landed_max) + ', ≤' + (R.weight_max_g / 1000) + ' кг, шингэнгүй, 1688 зургаар баталсан · 3 секундэд ойлгогдох бичлэгтэй · Temu манай үнийн ' + R.temu_floor_pct + '%-иас доош зардаггүй.<br>'
    + '<b>Микро-тест.</b> Тусдаа кампанит ажил, урьдчилсан захиалга, нийлүүлэгчийн бичлэг. ' + mnt(R.kill_mnt) + '-д хаягтай захиалга 0 бол зогс; таг ' + mnt(R.cap_mnt) + '; 1–4 захиалгатай бол хоёр дахь бичлэг +30,000₮; ≥' + R.win_orders + ' захиалга ба CPA ≤' + mnt(R.win_cpa_mnt) + ' бол ялагч нэр дэвшигч.<br>'
    + '<b>Яагаад оноо байхгүй вэ.</b> Хуучин эрэмбийн 7 хүчин зүйлийн аль нь ч монгол хүн худалдаж авахыг хэмждэггүй байсан; 4 тестийн үр дүнд тааруулсан оноо 7 хоногт 3 удаа №1-ээ сольсон.</div></details>');
  o('</div>');
  return h.join('');
}
