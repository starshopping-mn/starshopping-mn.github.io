/* Тест хуудас v6 (блок LY, 2026-11-23; эзэн 18:43 баталсан загвар board-push/2026-11-23-LY-tests-v6-mockup).
   Дээд хэсэг: дүгнэлт → 4 KPI → тестийн ажлын талбар (тест бүрт нэг карт) → таны шийдвэр хүлээж буй бараа.
   Өгөгдөл: d.ws = test_ws() (board_read "testws"), V5 = v4_cards().v5 (cands 8/8, review 1–2 унасан).
   Бичих: ssRpc('test_ws_act') — price · step · ask · select (n8n 0); launch · drop · бараа үнэ · татгалзах = хуучин 10b POST.
   Анги бүр .tx6 доор tx- угтвартай (board.css-ийн ерөнхий ангитай мөргөлдөхгүй). */
function testsV6Top(d, V5) {
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var num = function (x) { return x == null || x === '' || isNaN(+x) ? null : +x; };
  var n = function (x) { x = num(x); return x == null ? '—' : Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var mnt = function (x) { return num(x) == null ? '—' : n(x) + '₮'; };
  var big = function (x) { x = num(x); if (x == null) return ''; return x >= 1e6 ? (x / 1e6).toFixed(1).replace('.0', '') + ' сая' : x >= 1e3 ? Math.round(x / 1e3) + ' мянга' : String(x); };
  var url = function (u) { return /^https?:\/\//i.test(String(u || '')) ? esc(u) : ''; };
  var ago = function (s) { if (!s) return ''; var h = Math.round((Date.now() - new Date(s).getTime()) / 36e5); return h < 1 ? 'саяхан' : h < 48 ? h + ' цагийн өмнө' : Math.round(h / 24) + ' хоногийн өмнө'; };
  var short = function (s) { s = String(s || ''); var i = s.indexOf(' ('); return i > 12 ? s.slice(0, i) : s; };
  var WS = (d.ws && d.ws.tests) || [], IMG = (d.ws && d.ws.images) || {}, KP = (d.ws && d.ws.kpi) || d.kpi || {}, SL = (d.ws && d.ws.slots) || d.slots || {};
  var C = (V5 && V5.cands) || [], R = (V5 && V5.review) || [];
  var GN = { F0: 'Саад', F1: 'Сонирхол', F2: 'Борлуулалт', F3: 'Сэдэл', F4: 'Зах зээл', F5: 'Үнэ, ашиг', F6: 'МН өрсөлдөгч', F7: '1688' };
  var GW = { F0: 'Хийж болохгүй шалтгаан бий (суулгалт, идэж уудаг г.м.)', F1: 'Бичлэгийн сэтгэгдэлд «хаанаас авах вэ» гэх худалдан авах санаа бага',
    F2: 'Зарагдаж байгаагийн баталгаа хангалтгүй', F3: 'Авах гол шалтгаан сул — «хэрэгтэй» гэхээс илүү «гоё юм»', F4: 'Зах зээл хэт жижиг',
    F5: 'Үнэ, ашиг босгонд хүрэхгүй', F6: 'Монголд зарагч олон (5-аас дээш)', F7: '1688-аас тохирох нийлүүлэгч, өртөг баталгаажаагүй' };
  var h = [], o = function (s) { h.push(s); };

  o('<style>'
    + '.tx6{display:flex;flex-direction:column;gap:0;margin:0 0 6px}.tx6 *{box-sizing:border-box}'
    + '.tx6 .tx-vd{background:var(--s1);border:1px solid var(--ln);border-left:4px solid var(--warn);border-radius:12px;padding:14px 18px;margin-bottom:12px}.tx6 .tx-vd.g{border-left-color:var(--good)}'
    + '.tx6 .tx-vd h1{margin:0 0 4px;font-size:19px;line-height:1.3}.tx6 .tx-vd p{margin:0;color:var(--ink2);font-size:13px}'
    + '.tx6 .tx-kr{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:22px}'
    + '.tx6 .tx-kt{background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:12px 14px;min-width:0}.tx6 .tx-kt b{display:block;font-size:24px;font-variant-numeric:tabular-nums;line-height:1.15}.tx6 .tx-kt span{font-size:12px;color:var(--mut)}.tx6 .tx-kt.on{border-color:var(--gold-ln);background:var(--gold-a)}'
    + '.tx6 .tx-h2{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin:6px 0 10px}.tx6 .tx-h2 b{font-size:16px}.tx6 .tx-h2 span{font-size:12px;color:var(--mut)}'
    + '.tx6 .tx-ws{background:var(--s1);border:1px solid var(--ln);border-radius:16px;box-shadow:var(--sh);display:grid;grid-template-columns:260px minmax(0,1fr);gap:22px;padding:20px;margin-bottom:18px}'
    + '.tx6 .tx-img{width:100%;aspect-ratio:1/1;border-radius:12px;object-fit:cover;background:var(--s2);border:1px solid var(--ln3);display:block}'
    + '.tx6 .tx-noimg{width:100%;aspect-ratio:1/1;border-radius:12px;background:var(--s2);border:1px dashed var(--ln2);display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--mut);text-align:center;padding:10px}'
    + '.tx6 .tx-lk{display:grid;gap:6px;margin-top:10px}.tx6 .tx-lk a,.tx6 .tx-lk span{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 12px;border:1px solid var(--ln);border-radius:10px;text-decoration:none;color:var(--ink);font-size:13px;font-weight:600;background:var(--bg)}'
    + '.tx6 .tx-lk small{color:var(--mut);font-weight:500;text-align:right}.tx6 .tx-lk span{opacity:.55}'
    + '.tx6 .tx-ttl{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px}.tx6 .tx-ttl h3{margin:0 0 2px;font-size:20px;line-height:1.3;flex:1 1 100%}'
    + '.tx6 .tx-ch{font-size:11.5px;padding:3px 9px;border-radius:999px;background:var(--s2);color:var(--ink2);font-weight:600;white-space:nowrap}'
    + '.tx6 .tx-ch.g{background:var(--good-a);color:var(--good)}.tx6 .tx-ch.w{background:var(--warn-a);color:var(--warn)}.tx6 .tx-ch.c{background:var(--crit-a);color:var(--crit)}.tx6 .tx-ch.b{background:var(--blue-a);color:var(--blue)}'
    + '.tx6 .tx-mn{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0}'
    + '.tx6 .tx-mt{border:1px solid var(--ln3);border-radius:10px;padding:10px 12px;background:var(--bg);min-width:0}.tx6 .tx-mt>span{display:block;font-size:11.5px;color:var(--mut)}'
    + '.tx6 .tx-mt b{font-size:19px;font-variant-numeric:tabular-nums}.tx6 .tx-mt b.g{color:var(--good)}.tx6 .tx-mt b.c{color:var(--crit)}.tx6 .tx-mt small{display:block;font-size:11px;color:var(--mut);margin-top:2px;line-height:1.35}'
    + '.tx6 .tx-in{display:flex;align-items:center;gap:6px}.tx6 .tx-in input{width:100%;min-width:0;font:inherit;font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;padding:3px 8px;border:1px solid var(--gold-ln);border-radius:8px;background:var(--s1);color:var(--ink)}'
    + '.tx6 .tx-sv{font:inherit;font-size:11.5px;font-weight:700;padding:4px 9px;border-radius:7px;border:1px solid var(--gold-ln);background:var(--gold-a);color:var(--gold);cursor:pointer;margin-top:5px}'
    + '.tx6 .tx-bd{border:1px solid var(--ln3);border-radius:10px;padding:10px 12px;background:var(--bg);margin-bottom:14px}'
    + '.tx6 .tx-bdh{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:12.5px;color:var(--ink2);margin-bottom:6px}'
    + '.tx6 .tx-bar{position:relative;height:10px;border-radius:5px;background:var(--s2)}.tx6 .tx-bar i{position:absolute;left:0;top:0;bottom:0;background:var(--blue);border-radius:5px}.tx6 .tx-bar em{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--crit)}'
    + '.tx6 .tx-bdf{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:var(--mut);margin-top:6px}'
    + '.tx6 .tx-sp{display:flex;align-items:center;margin:4px 0 12px}.tx6 .tx-sp>div{flex:1;display:flex;align-items:center}.tx6 .tx-sp>div:last-child{flex:0}'
    + '.tx6 .tx-sp b{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;background:var(--s2);color:var(--mut);flex:none}'
    + '.tx6 .tx-sp b.d{background:var(--good);color:#fff}.tx6 .tx-sp b.n{background:var(--blue);color:#fff;box-shadow:0 0 0 4px var(--blue-a)}.tx6 .tx-sp i{flex:1;height:2px;background:var(--ln2);margin:0 4px}.tx6 .tx-sp i.d{background:var(--good)}'
    + '.tx6 .tx-now{border:1.5px solid var(--blue);border-radius:12px;padding:14px;background:var(--blue-a)}.tx6 .tx-now .l{font-size:11px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.04em}'
    + '.tx6 .tx-now h4{margin:4px 0;font-size:16px}.tx6 .tx-now p{margin:0 0 10px;font-size:13px;color:var(--ink2);line-height:1.5}'
    + '.tx6 .tx-btns{display:flex;gap:8px;flex-wrap:wrap;align-items:center}'
    + '.tx6 .tx-bt{font:inherit;font-size:13px;font-weight:700;padding:9px 14px;border-radius:10px;border:1px solid var(--ln2);background:var(--s1);color:var(--ink);cursor:pointer;text-decoration:none;display:inline-block}'
    + '.tx6 .tx-bt.p{background:var(--ink);color:var(--bg);border-color:var(--ink)}.tx6 .tx-bt.r{color:var(--crit);border-color:var(--crit-a)}.tx6 .tx-bt:disabled{opacity:.45;cursor:default}'
    + '.tx6 .tx-nx{display:grid;gap:6px;margin-top:10px}'
    + '.tx6 .tx-nr{display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 10px;border:1px solid var(--ln3);border-radius:10px;font-size:13px}'
    + '.tx6 .tx-nr>b{width:22px;height:22px;border-radius:50%;background:var(--s2);color:var(--mut);display:flex;align-items:center;justify-content:center;font-size:11px}.tx6 .tx-nr>b.d{background:var(--good);color:#fff}'
    + '.tx6 .tx-nr.d .tt{color:var(--mut);text-decoration:line-through}.tx6 .tx-nr small{color:var(--mut);display:block;font-size:11.5px;line-height:1.4;overflow-wrap:anywhere}.tx6 .tx-nr .tx-bt{padding:6px 10px;font-size:12px}'
    + '.tx6 .tx-ft{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:14px;padding-top:12px;border-top:1px dashed var(--ln2);font-size:12px;color:var(--mut)}'
    + '.tx6 .tx-out{display:none;font-size:12.5px;margin-top:8px;padding:8px 12px;border-radius:9px;background:var(--s2)}.tx6 .tx-out.on{display:block}'
    + '.tx6 .tx-cd{background:var(--s1);border:1px solid var(--ln);border-radius:16px;display:grid;grid-template-columns:150px minmax(0,1fr);gap:18px;padding:16px;margin-bottom:12px}'
    + '.tx6 .tx-gs{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:4px;margin:10px 0}'
    + '.tx6 .tx-g{border-radius:8px;padding:6px 3px;text-align:center;font-size:10.5px;font-weight:700;line-height:1.25;background:var(--s2);color:var(--mut)}.tx6 .tx-g.ok{background:var(--good-a);color:var(--good)}.tx6 .tx-g.no{background:var(--crit);color:#fff}'
    + '.tx6 .tx-why{border-left:3px solid var(--crit);background:var(--crit-a);border-radius:0 8px 8px 0;padding:8px 12px;font-size:13px;margin-bottom:10px;line-height:1.5}.tx6 .tx-why b{display:block;font-size:12px;margin-bottom:2px}.tx6 .tx-why small{color:var(--ink2)}'
    + '.tx6 .tx-row{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;margin-bottom:12px;color:var(--ink2)}.tx6 .tx-row b{color:var(--ink);font-variant-numeric:tabular-nums}'
    + '.tx6 .tx-fm{display:none;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px;padding:10px 12px;border:1px solid var(--ln2);border-radius:10px}.tx6 .tx-fm.on{display:flex}'
    + '.tx6 .tx-fm input,.tx6 .tx-fm select{font:inherit;font-size:13px;padding:6px 8px;border:1px solid var(--ln2);border-radius:8px;background:var(--s1);color:var(--ink)}'
    + '.tx6 .tx-note{font-size:12px;color:var(--mut);margin:-4px 0 10px}.tx6 .tx-em{background:var(--s1);border:1px dashed var(--ln2);border-radius:12px;padding:14px 16px;font-size:13px;color:var(--ink2);margin-bottom:14px}'
    + '@media(max-width:860px){.tx6 .tx-ws{grid-template-columns:minmax(0,1fr)}.tx6 .tx-ws .tx-img,.tx6 .tx-ws .tx-noimg{max-width:240px}.tx6 .tx-kr,.tx6 .tx-mn{grid-template-columns:repeat(2,minmax(0,1fr))}.tx6 .tx-cd{grid-template-columns:88px minmax(0,1fr)}.tx6 .tx-gs{grid-template-columns:repeat(4,minmax(0,1fr))}}'
    + '</style>');
  o('<div class="tx6" id="tx6">');

  /* 1 — дүгнэлт */
  var t0 = WS[0], ev = WS.filter(function (t) { return t.status === 'evaluating'; });
  var nowSt = function (t) { var s = (t.steps || []).filter(function (x) { return x.step === t.now_step; })[0]; return s || null; };
  var head, sub, gcls = '';
  if (ev.length) { head = 'Зар явж байна · ' + short(ev[0].name) + ' — ' + mnt(ev[0].spend) + ' зарцуулж, ' + n(ev[0].orders) + ' захиалга'; sub = 'Шийдвэрийн дүрэм: 30,000₮-д хаягтай захиалга 0 бол зогсоно · 60,000₮ дотор ≥5 захиалга бол WIN'; gcls = ' g'; }
  else if (t0) { var ns = nowSt(t0); head = 'Тест бэлтгэл · ' + short(t0.name) + (ns ? ' — дараагийн алхам: ' + ns.title : ' — бүх алхам бэлэн, зар асаахад бэлэн'); sub = n(t0.done) + '/6 алхам дууссан · зар хараахан асаагүй' + (C.length + R.length ? ' · таны шийдвэр хүлээж буй ' + (C.length + R.length) + ' бараа доор' : ''); }
  else { head = C.length ? 'Тестэд бэлэн ' + C.length + ' бараа — сонгоход бэлэн' : 'Идэвхтэй тест алга'; sub = R.length ? 'Таны шийдвэр хүлээж буй ' + R.length + ' бараа доор байна' : 'Уурхайчин, досье бэлтгэгч өдөр бүр шинэ бараа хайж байна'; if (C.length) gcls = ' g'; }
  o('<div class="tx-vd' + gcls + '"><h1>' + esc(head) + '</h1><p>' + esc(sub) + '</p></div>');

  /* 2 — KPI */
  o('<div class="tx-kr"><div class="tx-kt' + (WS.length ? ' on' : '') + '"><b>' + n(SL.used != null ? SL.used : WS.length) + ' / ' + n(SL.max || 3) + '</b><span>тест явж байна</span></div>'
    + '<div class="tx-kt' + (C.length ? ' on' : '') + '"><b>' + C.length + '</b><span>8/8 давсан бараа</span></div>'
    + '<div class="tx-kt' + (R.length ? ' on' : '') + '"><b>' + R.length + '</b><span>таны шийдвэр хүлээж буй</span></div>'
    + '<div class="tx-kt"><b>' + n(KP.wins) + ' / ' + n(KP.closed) + '</b><span>өмнөх тестүүд · WIN</span></div></div>');

  /* 3 — ажлын талбар */
  o('<div class="tx-h2"><b>Тест · ажлын талбар</b><span>бараа бүрт нэг карт — мэдээлэл, холбоос, товч энд</span></div>');
  if (!WS.length) o('<div class="tx-em">Идэвхтэй тест алга. Доорх бараанаас «Тестэд авах» дарвал энд ажлын карт нээгдэнэ.</div>');
  WS.forEach(function (t) {
    var id = t.test_id, img = url(t.image), steps = t.steps || [], ns = nowSt(t), isEv = t.status === 'evaluating';
    var spentPct = Math.max(t.spend > 0 ? 2 : 0, Math.min(100, Math.round(100 * (num(t.spend) || 0) / (num(t.budget) || 60000))));
    var stopPct = Math.round(100 * (num(t.stop_at) || 30000) / (num(t.budget) || 60000));
    o('<div class="tx-ws" data-t="' + id + '"><div>');
    o(img ? '<img class="tx-img" src="' + img + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<div class="tx-noimg">зураг алга — 1688-ын хуудаснаас харна уу</div>');
    o('<div class="tx-lk">'
      + (url(t.tt_url) ? '<a href="' + url(t.tt_url) + '" target="_blank" rel="noopener">▶ TikTok бичлэг <small>' + (t.tt_views ? big(t.tt_views) + ' үзэлт' : 'үзэх') + '</small></a>' : '<span>▶ Бичлэг алга <small>холбоогүй</small></span>')
      + (url(t.cn_url) ? '<a href="' + url(t.cn_url) + '" target="_blank" rel="noopener">🛒 1688 · авах бараа <small>¥' + esc(t.cn_item) + (num(t.cn_ship) != null ? ' + ¥' + esc(t.cn_ship) : '') + (t.weight_g ? ' · ' + n(t.weight_g) + 'г' : '') + '</small></a>' : '<span>🛒 1688 холбоос алга</span>')
      + (url(t.site_url) ? '<a href="' + url(t.site_url) + '" target="_blank" rel="noopener">🌐 Сайтын хуудас <small>' + esc(t.slug || '') + '</small></a>' : '<span>🌐 Сайтын хуудас <small>бүртгэсний дараа</small></span>')
      + '</div></div><div style="min-width:0">');
    o('<div class="tx-ttl"><h3>' + esc(t.name) + '</h3>' + (t.category ? '<span class="tx-ch">' + esc(t.category) + '</span>' : '') + '<span class="tx-ch">' + esc(t.page || '') + '</span>'
      + (t.override ? '<span class="tx-ch w">эзний шийдвэр · ' + n(t.pass_n) + '/8 шүүлтүүр</span>' : '<span class="tx-ch g">8/8 шүүлтүүр</span>')
      + (isEv ? '<span class="tx-ch g">зар явж байна' + (t.launched ? ' · ' + esc(t.launched) : '') + '</span>' : t.registered ? '<span class="tx-ch b">сайтад бүртгэгдсэн</span>' : '<span class="tx-ch b">урьдчилсан захиалга</span>')
      + '<span class="tx-ch">' + esc(ago(t.selected_at)) + ' сонгосон</span></div>');
    o('<div class="tx-mn"><div class="tx-mt"><span>Зарах үнэ</span>'
      + (t.registered ? '<b>' + mnt(t.sell) + '</b><small>сайтад бүртгэгдсэн үнэ</small>'
        : '<div class="tx-in"><input class="tx-pr" inputmode="numeric" value="' + esc(n(t.sell)) + '"><b>₮</b></div><button class="tx-sv tx-prs" data-t="' + id + '">Үнэ хадгалах</button>')
      + '</div><div class="tx-mt"><span>Буух өртөг</span><b>' + mnt(t.landed) + '</b><small>1688 + Хятад дотор + карго</small></div>'
      + '<div class="tx-mt"><span>Ашиг / ширхэг</span><b class="' + (num(t.profit) != null && t.profit >= t.floor ? 'g' : 'c') + '">' + mnt(t.profit) + '</b><small>хүргэлт 7,000 хассан · зар ороогүй</small></div>'
      + '<div class="tx-mt"><span>Зарын дээд зардал</span><b>' + mnt(t.max_cpa) + '</b><small>1 захиалгад · үүнээс дээш бол ашиг ' + mnt(t.floor) + '-аас бага</small></div></div>');
    o('<div class="tx-bd"><div class="tx-bdh"><span><b>Тестийн төсөв</b> · ' + mnt(t.budget) + ' (≈3 хоног)</span><span>зарцуулсан ' + mnt(t.spend) + ' · захиалга ' + n(t.orders) + (t.cpa != null ? ' · 1 захиалга ' + mnt(t.cpa) : '') + '</span></div>'
      + '<div class="tx-bar"><i style="width:' + spentPct + '%"></i><em style="left:' + stopPct + '%"></em></div>'
      + '<div class="tx-bdf"><span>0</span><span>' + mnt(t.stop_at) + ' — хаягтай захиалга 0 бол зогсоно</span><span>' + mnt(t.budget) + ' — ≥5 захиалга бол WIN</span></div></div>');
    o('<div class="tx-sp">' + steps.map(function (s, i) { var dn = s.status !== 'todo'; return '<div><b class="' + (dn ? 'd' : s.step === t.now_step ? 'n' : '') + '">' + (dn ? '✓' : s.step) + '</b>' + (i < steps.length - 1 ? '<i class="' + (dn ? 'd' : '') + '"></i>' : '') + '</div>'; }).join('') + '</div>');
    if (ns) {
      var byClaude = ns.owner !== 'Ариунболд';
      o('<div class="tx-now"><div class="l">Одоо · алхам ' + ns.step + ' · ' + esc(ns.owner) + '</div><h4>' + esc(ns.title) + '</h4><p>' + esc(ns.detail || '') + (ns.asked_at ? '<br><b>Claude-д даалгасан: ' + esc(ns.asked_at) + '</b>' : '') + '</p><div class="tx-btns">'
        + (byClaude ? '<button class="tx-bt p tx-ask" data-t="' + id + '" data-s="' + ns.step + '"' + (ns.asked_at ? ' disabled' : '') + '>' + (ns.asked_at ? 'Даалгасан' : 'Claude-д даалгах') + '</button>' : '')
        + '<button class="tx-bt' + (byClaude ? '' : ' p') + ' tx-stp" data-t="' + id + '" data-s="' + ns.step + '" data-st="done">Хийсэн</button></div></div>');
    } else if (!isEv) {
      o('<div class="tx-now"><div class="l">Бүх алхам бэлэн</div><h4>Зар асаахад бэлэн</h4><p>Доорх «🚀 Зар асаасан» товчийг Meta-д зар асаасны дараа дарна.</p></div>');
    }
    o('<div class="tx-nx">' + steps.filter(function (s) { return s.step !== t.now_step; }).map(function (s) {
      var dn = s.status !== 'todo';
      var meta = esc(s.owner) + (dn ? ' · ' + esc(s.done_at || '') + (s.note ? ' · ' + esc(String(s.note).slice(0, 140)) : '') : s.asked_at ? ' · Claude-д даалгасан ' + esc(s.asked_at) : ' · ' + esc(String(s.detail || '').slice(0, 90)));
      return '<div class="tx-nr' + (dn ? ' d' : '') + '"><b class="' + (dn ? 'd' : '') + '">' + (dn ? '✓' : s.step) + '</b><span><span class="tt">' + esc(s.title) + '</span><small>' + meta + '</small></span>'
        + (dn ? '<button class="tx-bt tx-stp" title="буцаах" data-t="' + id + '" data-s="' + s.step + '" data-st="todo">↺</button>' : '<button class="tx-bt tx-stp" data-t="' + id + '" data-s="' + s.step + '" data-st="done">Хийсэн</button>') + '</div>';
    }).join('') + '</div>');
    o('<div class="tx-out" id="txo' + id + '"></div>');
    o('<div class="tx-ft"><span>' + (isEv ? 'Зар явж байна — WIN/LOSS-ийг доорх «Үнэлгээ» хэсэгт баталгаажуулна' : t.can_launch ? 'Бэлэн — Meta-д зар асаасны дараа дар' : 'Зар асаахад 6/6 алхам ба сайтын бүртгэл хэрэгтэй') + '</span><div class="tx-btns">'
      + '<button class="tx-bt r tx-drop" data-t="' + id + '">Тестээс гаргах</button>'
      + (isEv ? '' : '<button class="tx-bt p tx-lau" data-t="' + id + '"' + (t.can_launch ? '' : ' disabled') + '>🚀 Зар асаасан</button>') + '</div></div>');
    o('<div class="tx-fm tx-dropf" id="txd' + id + '"><span style="font-size:12.5px">Тестээс гаргах шалтгаан:</span><input class="tx-dn" placeholder="яагаад (заавал биш)"><button class="tx-bt r tx-dropok" data-t="' + id + '">Тийм, гаргах</button></div>');
    o('</div></div>');
  });

  /* 4 — шийдвэр хүлээж буй */
  var cards = C.map(function (c) { var g = c.gate || {}; return { f: c.find_id, name: c.name, cat: c.category, gates: g.gates || {}, fail_n: 0, pass_n: 8, sell: g.sell, landed: g.landed, profit: g.profit, src: ((c.video || [])[0] || {}).url, views: ((c.video || [])[0] || {}).views, cn_url: c.cn_url, cn: c.cny, w: c.weight_g, mn: null, ok8: true }; })
    .concat(R.map(function (r) { return { f: r.find_id, name: r.name, cat: r.category, gates: r.gates || {}, fail_n: r.fail_n, pass_n: r.pass_n, miss: r.missing_n, sell: r.sell, landed: r.landed, profit: r.profit, src: r.src, cn_url: r.cn_url, cn: r.cn_total, w: r.weight_g, mn: r.mn, ok8: false }; }));
  o('<div class="tx-h2" style="margin-top:6px"><b>Таны шийдвэр хүлээж буй бараа</b><span>8/8 давсан · эсвэл 1–2 шүүлтүүрт унасан — та өөрийн шийдвэрээр тестэд авч болно</span></div>');
  o('<p class="tx-note">3 ба түүнээс олон шүүлтүүрт унасан бараа автоматаар хаагдана. Тестэд орсон бараа энэ жагсаалтаас ажлын талбар руу шилжинэ.</p>');
  if (!cards.length) o('<div class="tx-em">Одоогоор алга. Досье бэлтгэгч шинэ бараа нэмэхэд энд гарна.</div>');
  cards.forEach(function (c) {
    var G = c.gates, fails = Object.keys(GN).filter(function (k) { return (G[k] || {}).st === 'fail'; }), im = url(IMG[String(c.f)]);
    o('<div class="tx-cd" data-f="' + c.f + '">' + (im ? '<img class="tx-img" src="' + im + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<div class="tx-noimg">зураг алга</div>') + '<div style="min-width:0">');
    o('<div class="tx-ttl"><h3 style="font-size:17px">' + esc(c.name) + '</h3><span class="tx-ch">№' + c.f + (c.cat ? ' · ' + esc(c.cat) : '') + '</span>'
      + (c.ok8 ? '<span class="tx-ch g">8/8 давсан</span>' : '<span class="tx-ch c">' + n(c.fail_n) + ' унасан</span><span class="tx-ch g">' + n(c.pass_n) + ' давсан</span>') + (+c.miss ? '<span class="tx-ch w">' + n(c.miss) + ' бөглөөгүй</span>' : '') + '</div>');
    o('<div class="tx-gs">' + Object.keys(GN).map(function (k) { var st = (G[k] || {}).st; return '<div class="tx-g ' + (st === 'pass' ? 'ok' : st === 'fail' ? 'no' : '') + '" title="' + esc((G[k] || {}).why || '') + '">' + GN[k] + '<br>' + (st === 'pass' ? '✓' : st === 'fail' ? '✗' : '?') + '</div>'; }).join('') + '</div>');
    if (fails.length) o('<div class="tx-why"><b>Яагаад унасан</b>' + fails.map(function (k) { return GW[k] + ' <small>(' + esc((G[k] || {}).why || '') + ')</small>'; }).join('<br>') + '</div>');
    o('<div class="tx-row"><span>Зарах <b>' + mnt(c.sell) + '</b></span><span>Ашиг <b style="color:var(--good)">' + mnt(c.profit) + '</b></span><span>Буух <b>' + mnt(c.landed) + '</b></span>'
      + (c.mn ? '<span>Монголд <b>' + n(c.mn.sellers) + ' зарагч' + (c.mn.pmin ? ' · ' + big(c.mn.pmin).replace(' мянга', 'k') + (c.mn.pmax && c.mn.pmax !== c.mn.pmin ? '–' + big(c.mn.pmax).replace(' мянга', 'k') : '') + '₮' : '') + '</b></span>' : '')
      + ((G.F2 || {}).why ? '<span>' + esc(String(G.F2.why).replace(/(\d{5,})/g, function (x) { return n(x); })) + '</span>' : '') + '</div>');
    o('<div class="tx-btns">' + (url(c.src) ? '<a class="tx-bt" href="' + url(c.src) + '" target="_blank" rel="noopener">▶ Бичлэг</a>' : '')
      + (url(c.cn_url) ? '<a class="tx-bt" href="' + url(c.cn_url) + '" target="_blank" rel="noopener">🛒 1688' + (c.cn ? ' · ¥' + esc(c.cn) : '') + '</a>' : '')
      + '<button class="tx-bt p tx-sel" data-f="' + c.f + '"' + (num(SL.used) >= num(SL.max || 3) ? ' disabled title="зэрэг тестийн хязгаар дүүрсэн"' : '') + '>Тестэд авах</button>'
      + '<button class="tx-bt tx-pc" data-f="' + c.f + '">Үнэ өөрчлөх</button><button class="tx-bt r tx-rj" data-f="' + c.f + '">Татгалзах</button></div>');
    o('<div class="tx-fm tx-pcf"><span style="font-size:12.5px">Шинэ үнэ ₮</span><input class="tx-pcv" inputmode="numeric" value="' + esc(c.sell || '') + '" style="width:120px"><input class="tx-pcn" placeholder="яагаад (заавал биш)"><button class="tx-bt p tx-pcok" data-f="' + c.f + '">Хадгалах</button><span style="font-size:11.5px;color:var(--mut)">шүүлтүүрүүд шинэ үнээр дахин бодогдоно</span></div>');
    o('<div class="tx-fm tx-rjf"><select class="tx-rjr"><option value="narrow">Хэрэглээ нарийн</option><option value="mn_common">МН-д түгээмэл</option><option value="demo">Бичлэг сул</option><option value="quality">Чанар муу</option><option value="other">Бусад</option></select><input class="tx-rjn" placeholder="тайлбар (заавал биш)"><button class="tx-bt r tx-rjok" data-f="' + c.f + '">Татгалзах</button></div>');
    o('<div class="tx-out" id="txf' + c.f + '"></div></div></div>');
  });
  o('</div>');
  return h.join('');
}

/* Товчнууд. testsClient дотроос дуудагдана (post = 10b POST, show, reload нь tests.js-ийнх). */
function testsV6Client(root, post, show, reload) {
  var box = root.querySelector('#tx6'); if (!box) return;
  var rpc = function (body, btn, out) {
    if (typeof window.ssRpc !== 'function') { show(out, '⚠️ Хуудсаа дахин ачаална уу'); return Promise.reject(new Error('rpc')); }
    if (btn) { btn.disabled = true; btn.dataset.tx = btn.textContent; btn.textContent = '…'; }
    return window.ssRpc('test_ws_act', body).then(function (j) { if (!j || j.ok === false) throw new Error((j && j.error) || 'алдаа'); return j; })
      .catch(function (x) { if (btn) { btn.disabled = false; btn.textContent = btn.dataset.tx; } show(out, '⚠️ ' + String(x.message || x).replace(/[<>&]/g, '')); throw x; });
  };
  var q = function (s) { return box.querySelectorAll(s); };
  var outT = function (t) { return box.querySelector('#txo' + t); }, outF = function (f) { return box.querySelector('#txf' + f); };
  q('.tx-prs').forEach(function (b) { b.addEventListener('click', function () {
    var v = (b.parentNode.querySelector('.tx-pr').value || '').replace(/[^0-9]/g, '');
    rpc({ do: 'price', test_id: +b.dataset.t, price: v }, b, outT(b.dataset.t)).then(function (j) { show(outT(b.dataset.t), '✓ Үнэ ' + Number(j.price).toLocaleString('en-US') + '₮ хадгалагдлаа'); reload(600); }).catch(function () {}); }); });
  q('.tx-stp').forEach(function (b) { b.addEventListener('click', function () {
    rpc({ do: 'step', test_id: +b.dataset.t, step: +b.dataset.s, status: b.dataset.st }, b, outT(b.dataset.t)).then(function () { reload(300); }).catch(function () {}); }); });
  q('.tx-ask').forEach(function (b) { b.addEventListener('click', function () {
    rpc({ do: 'ask', test_id: +b.dataset.t, step: +b.dataset.s }, b, outT(b.dataset.t)).then(function () { show(outT(b.dataset.t), '✓ Claude-д Telegram-аар даалгалаа — чатад «тестийн алхмаа хий» гэвэл шууд эхэлнэ'); reload(900); }).catch(function () {}); }); });
  q('.tx-sel').forEach(function (b) { b.addEventListener('click', function () {
    rpc({ do: 'select', find_id: +b.dataset.f }, b, outF(b.dataset.f)).then(function () { show(outF(b.dataset.f), '✓ Тестэд авлаа — ажлын талбарт нээгдэнэ'); reload(700); }).catch(function () {}); }); });
  q('.tx-pc').forEach(function (b) { b.addEventListener('click', function () { var f = b.closest('.tx-cd').querySelector('.tx-pcf'); f.classList.toggle('on'); }); });
  q('.tx-pcok').forEach(function (b) { b.addEventListener('click', function () {
    var c = b.closest('.tx-cd'), v = (c.querySelector('.tx-pcv').value || '').replace(/[^0-9]/g, '');
    post({ action: 'price', find_id: +b.dataset.f, price_mnt: v ? +v : null, note: c.querySelector('.tx-pcn').value || '' }, b, outF(b.dataset.f))
      .then(function () { show(outF(b.dataset.f), '✓ Үнэ хадгалагдлаа — шүүлтүүрийг дахин тооцож байна'); reload(900); }).catch(function () {}); }); });
  q('.tx-rj').forEach(function (b) { b.addEventListener('click', function () { b.closest('.tx-cd').querySelector('.tx-rjf').classList.toggle('on'); }); });
  q('.tx-rjok').forEach(function (b) { b.addEventListener('click', function () {
    var c = b.closest('.tx-cd');
    post({ action: 'findact', do: 'reject', find_id: +b.dataset.f, reason: c.querySelector('.tx-rjr').value, note: c.querySelector('.tx-rjn').value || '', by: 'эзэн' }, b, outF(b.dataset.f))
      .then(function () { show(outF(b.dataset.f), '✓ Татгалзлаа — судалгаа үүнээс суралцана'); reload(900); }).catch(function () {}); }); });
  q('.tx-drop').forEach(function (b) { b.addEventListener('click', function () { var f = box.querySelector('#txd' + b.dataset.t); if (f) f.classList.toggle('on'); }); });
  q('.tx-dropok').forEach(function (b) { b.addEventListener('click', function () {
    var f = box.querySelector('#txd' + b.dataset.t);
    post({ action: 'drop', test_id: +b.dataset.t, note: (f && f.querySelector('.tx-dn').value) || '', by: 'owner' }, b, outT(b.dataset.t)).then(function () { reload(500); }).catch(function () {}); }); });
  q('.tx-lau').forEach(function (b) { b.addEventListener('click', function () {
    post({ action: 'launch', test_id: +b.dataset.t, by: 'owner' }, b, outT(b.dataset.t)).then(function () { reload(500); }).catch(function () {}); }); });
}
