/* Самбар · АЛДАГДЛЫН ГАЗРЫН ЗУРАГ (блок GG, 2026-11-11 — эзэн «Зөвшөөрлөө, нэг удаагийн хийлтээр бүгдийг хий»)
   Өгөгдөл: ?view=leak → board_read view 'leak' → leak_map(p); нэмэлт 'crm' → car_owner_book(p). n8n зарцуулахгүй.
   Юу харуулна: (1) зар → чат/сайт → «таарна» → утас → захиалга → хаяг → хүргэгдсэн шат бүрийг сүүлийн 3 өдөр / өмнөх 7 өдрөөр харьцуулж,
                    хамгийн их захиалга алдаж буй шатыг нэрлэнэ; (2) бичлэг бүрийн зардал ба сонирхол; (3) тестийн слот; (4) машин эзэмшигчдийн сан (зөвхөн тоо).
   Өглөөний тайлан (daily_decision_brief) ижил leak_map-аас «🕳 Алдагдал» мөрийг авна. Энэ хуудас зөвхөн УНШИНА. */
function renderLeak(DATA, QUERY) {
  const d = DATA || {};
  const Q = QUERY || {};
  const themeQ = Q.theme === 'dark' || Q.theme === 'light' ? Q.theme : '';
  const A = (v) => (Array.isArray(v) ? v : []);
  const n = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? 0 : Number(v));
  const has = (v) => v !== null && v !== undefined && v !== '' && !isNaN(Number(v));
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const ub = (iso) => (iso ? new Date(new Date(iso).getTime() + 8 * 3600000).toISOString() : '');
  const md = (s) => (s ? String(s).slice(5, 10).replace('-', '/') : '—');
  const mdhm = (iso) => (iso ? md(ub(iso)) + ' ' + ub(iso).slice(11, 16) : '—');
  const num = (v, dg) => (has(v) ? (Math.round(n(v) * Math.pow(10, dg || 0)) / Math.pow(10, dg || 0)).toLocaleString('en-US') : '—');
  const fmt = (v, f) => (!has(v) ? '—' : f === 'pct' ? Math.round(n(v) * 100) + '%' : f === 'pct1' ? (n(v) * 100).toFixed(1) + '%' : f === 'mnt' ? num(v) + '₮' : n(v).toFixed(1));
  const LV = { ok: ['ok', 'Хэвийн', '🟢'], y: ['wr', 'Анхаар', '🟡'], r: ['cr', 'Унасан', '🔴'], na: ['nt', '—', '⚪'] };
  const lv = (k) => LV[k] || LV.na;

  const out = [];
  const o = (s) => out.push(s);

  const CSS = '.w{max-width:1200px;margin:0 auto;padding:14px 16px 60px}'
    + '.nav{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 6px}.nav a{padding:8px 14px;border-radius:999px;border:1px solid var(--ln);background:var(--s1);color:var(--ink2);text-decoration:none;font-size:13px;font-weight:600}.nav a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
    + '.rg{display:flex;flex-direction:column;gap:22px;margin-top:10px}'
    + '.rg .nm{font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}'
    + '.rg .cd{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:18px 20px;min-width:0;display:flex;flex-direction:column;gap:12px}'
    + '.rg .lb{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}'
    + '.rg .sb{font-size:12.5px;color:var(--ink2);line-height:1.45}.rg .mu{color:var(--mut)}'
    + '.rg .h{margin:0;font-size:18px;font-weight:700;color:var(--ink);letter-spacing:0;text-transform:none}.rg .h:after{display:none}'
    + '.rg .hr{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px}'
    + '.rg .pl{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap;align-self:flex-start}'
    + '.rg .pl.ok{background:var(--good-a);color:var(--good)}.rg .pl.wr{background:var(--warn-a);color:var(--warn)}.rg .pl.cr{background:var(--crit-a);color:var(--crit)}.rg .pl.bl{background:var(--blue-a);color:var(--f3)}.rg .pl.nt{background:var(--s2);color:var(--ink2)}'
    + '.rg .ban{display:flex;flex-wrap:wrap;align-items:flex-start;gap:14px;padding:16px 18px;border-radius:14px;background:var(--s2);border:1px solid var(--ln2)}.rg .ban.ok{background:var(--good-a)}.rg .ban.wr{background:var(--warn-a)}.rg .ban.cr{background:var(--crit-a)}'
    + '.rg .ban .tx{flex:1 1 380px;font-size:14.5px;line-height:1.55;color:var(--ink)}'
    + '.rg .meta{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:12.5px;color:var(--ink2)}.rg .meta b{color:var(--ink);font-weight:600}'
    + '.rg .todo{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:10px}'
    + '.rg .todo .cd{gap:6px;padding:14px 16px;border-left:4px solid var(--warn)}.rg .todo .cd.cr{border-left-color:var(--crit)}'
    + '.rg .todo .tt{font-size:14.5px;font-weight:650;color:var(--ink)}'
    + '.rg .sig{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}@media(max-width:980px){.rg .sig{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.rg .sig{grid-template-columns:minmax(0,1fr)}}'
    + '.rg .tile .sh{display:flex;justify-content:space-between;align-items:center;gap:8px}.rg .tile{border:1px solid var(--ln);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;background:var(--bg);min-width:0;position:relative}'
    + '.rg .tile:before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;background:var(--ln2)}'
    + '.rg .tile.ok:before{background:var(--good)}.rg .tile.wr:before{background:var(--warn)}.rg .tile.cr:before{background:var(--crit)}'
    + '.rg .tile .sv{font-size:26px;font-weight:650;line-height:1.05;color:var(--ink)}'
    + '.rg .tile .st{font-size:12.5px;font-weight:650;color:var(--ink2)}'
    + '.rg .ctrs{display:flex;flex-direction:column;gap:7px;margin-top:2px}'
    + '.rg .ctr{display:grid;grid-template-columns:34px minmax(0,1fr) 92px;gap:8px;align-items:center;font-size:12.5px}'
    + '.rg .bar{height:8px;background:var(--s2);border-radius:999px;overflow:hidden;position:relative}.rg .bar i{display:block;height:100%;border-radius:999px;background:var(--ink2)}.rg .bar i.ok{background:var(--good)}.rg .bar i.wr{background:var(--warn)}.rg .bar i.cr{background:var(--crit)}'
    + '.rg .kvg{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(170px,100%),1fr));gap:10px}'
    + '.rg .kvg>div{border-top:1px solid var(--ln3);padding-top:8px;display:flex;flex-direction:column;gap:2px}.rg .kvg .kk{font-size:12px;color:var(--mut)}.rg .kvg .kx{font-size:18px;font-weight:650;color:var(--ink)}'
    + '.rg .chart{width:100%;height:auto;display:block}'
    + '.rg .lg{display:flex;flex-wrap:wrap;gap:14px;font-size:12.5px;color:var(--ink2)}.rg .lg i{display:inline-block;width:14px;height:3px;border-radius:2px;vertical-align:middle;margin-right:6px}.rg .lg i.bx{height:10px;width:10px;border-radius:2px}'
    + '.rg .tln{display:flex;flex-direction:column}'
    + '.rg .ev{display:grid;grid-template-columns:96px minmax(0,1fr);gap:12px;padding:12px 0;border-top:1px solid var(--ln3)}.rg .ev:first-child{border-top:0}'
    + '.rg .ev .when{font-size:12.5px;color:var(--mut);line-height:1.4}.rg .ev .what{display:flex;flex-direction:column;gap:5px;min-width:0}'
    + '.rg .ev .evr{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.rg .ev .tt{font-size:14px;font-weight:650;color:var(--ink)}'
    + '.rg .cmp{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;color:var(--ink2)}.rg .cmp b{color:var(--ink);font-weight:600}'
    + '.rg .tbl{width:100%;border-collapse:collapse;font-size:13px}.rg .tbl th{text-align:left;font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--mut);padding:8px 10px;border-bottom:1px solid var(--ln)}.rg .tbl td{padding:9px 10px;border-bottom:1px solid var(--ln3);vertical-align:top;color:var(--ink)}.rg .tbl td.r{text-align:right}'
    + '.rg .scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}'
    + '.rg .rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:10px}.rg .rules .cd{gap:6px;padding:14px 16px}'
    + '.rg details{border:1px solid var(--ln);border-radius:12px;background:var(--s1);padding:12px 16px}.rg summary{cursor:pointer;font-weight:650;font-size:14px;color:var(--ink)}'
    + '.rg .days{display:flex;gap:6px;flex-wrap:wrap}.rg .days span{display:inline-flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;color:var(--mut);min-width:36px}'
    + '@media(max-width:860px){.rg .cd{padding:15px 14px}.rg .ev{grid-template-columns:minmax(0,1fr)}.rg .tile .sv{font-size:23px}}'
    + 'footer{margin:26px 0 10px;font-size:12px;color:var(--mut)}'
    + '.rg .fn td.lbl{font-weight:600;white-space:normal;min-width:140px;max-width:340px}.rg .fn tr.w td{background:var(--crit-a)}.rg .fn tr.w.y td{background:var(--warn-a)}'
    + '.rg .dl{font-variant-numeric:tabular-nums;font-weight:650}.rg .dl.dn{color:var(--crit)}.rg .dl.up{color:var(--good)}'
    + '.rg .shb{display:grid;grid-template-columns:44px minmax(60px,1fr);gap:8px;align-items:center}'
    + '.rg .big{font-size:19px;font-weight:700;line-height:1.35;color:var(--ink)}'
    + '.rg ul.rc{margin:8px 0 0;padding:0 0 0 18px;font-size:12.5px;color:var(--ink2);line-height:1.6}';

  o('<!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Starshopping · Алдагдал</title><style>' + CSS + '</style></head><body><div class="w">');
  o('<header><div class="hd"><div class="bm">S</div><div><div class="bt">Starshopping</div>');
  o('<div class="bs">алдагдлын газрын зураг · ' + esc(mdhm(d.generated_at)) + ' УБ</div></div>');
  o('<div class="sp"></div><a class="rf" href="">Шинэчлэх</a></div></header>');
  o(typeof ssNav === 'function' ? ssNav('leak', themeQ) : '');

  if (!d.ok) {
    o('<div class="rg"><div class="ban cr"><div class="tx"><b>Алдагдлын өгөгдөл ирсэнгүй.</b> Supabase-д <code>2026-11-11-GG-leak-map-PASTE.sql</code>-ийг ажиллуулаагүй байж магадгүй.</div></div></div></div></body></html>');
    return out.join('');
  }

  const W = d.windows || {};
  const ST = A(d.stages);
  const worst = d.worst || null;
  const HJ = A(d.hijack);
  const P = d.pipeline || {};
  const rng = (a) => (A(a).length === 2 ? md(a[0]) + '–' + md(a[1]) : '—');
  const lvlAll = worst ? worst.lvl : (HJ.length ? 'y' : 'ok');
  const L = lv(lvlAll);

  o('<div class="rg">');

  // ── 1. Дүгнэлт
  o('<section class="ban ' + L[0] + '" aria-label="Дүгнэлт"><span class="pl ' + L[0] + '">' + L[2] + ' ' + (worst ? 'Алдаж байна' : HJ.length ? 'Анхаар' : 'Хэвийн') + '</span><div class="tx">');
  if (worst) {
    o('<div class="big">' + esc(worst.label) + ': ' + esc(fmt(worst.base, worst.fmt)) + ' → ' + esc(fmt(worst.cur, worst.fmt)) + '</div>'
      + '<div style="margin-top:4px">Энэ шатнаас болж өдөрт ойролцоогоор <b>' + esc(num(worst.lost, 1)) + ' захиалга</b> алдаж байна. Доорх хүснэгтэд бусад шатыг харна уу.</div>');
  } else {
    o('<div class="big">Том уналт алга</div><div style="margin-top:4px">Сүүлийн ' + esc(W.cur_days) + ' өдөр өмнөх ' + esc(W.base_days) + ' өдөртэй харьцуулахад өдөрт 1 захиалгаас илүү алдаж буй шат байхгүй.</div>');
  }
  HJ.forEach((c) => o('<div style="margin-top:6px">⚠️ <b>' + esc(c.code) + '</b> бичлэг зардлын <b>' + Math.round(n(c.share) * 100) + '%</b>-ийг авсан ч сонирхол бусдынхаас бага (10,000₮ тутамд ' + esc(num(c.intent_10k, 2)) + ', бусад ' + esc(num(c.others_10k, 2)) + ').</div>'));
  o('<div class="meta" style="margin-top:8px"><span>Одоо: <b>' + esc(rng(W.cur)) + '</b> (' + esc(W.cur_days) + ' өдөр)</span><span>Өмнө: <b>' + esc(rng(W.base)) + '</b> (' + esc(W.base_days) + ' өдөр)</span>'
    + '<span>Өнөөдрийн дутуу өдөр ороогүй</span><span>Өглөөний Telegram тайланд «🕳 Алдагдал» мөрөөр гарна</span></div></div></section>');

  // ── 2. Юүлүүр
  o('<section aria-label="Юүлүүр" style="display:flex;flex-direction:column;gap:12px"><div class="hr"><h2 class="h">Юүлүүр — шат бүрээр</h2><span class="sb">Улаан = 30%-иас их унасан · шар = 15%-иас их</span></div>');
  o('<div class="cd" style="padding:6px 8px"><div class="scroll"><table class="tbl fn"><thead><tr><th>Шат</th><th class="r">Өмнө</th><th class="r">Одоо</th><th class="r">Өөрчлөлт</th><th class="r">Алдаж буй захиалга / өдөр</th><th>Төлөв</th></tr></thead><tbody>');
  ST.forEach((s) => {
    const l = lv(s.lvl);
    const isW = worst && worst.k === s.k;
    const dl = has(s.delta) ? Math.round(n(s.delta) * 100) : null;
    const bad = s.kind === 'inv' ? dl > 0 : dl < 0;
    o('<tr' + (isW ? ' class="w' + (s.lvl === 'y' ? ' y' : '') + '"' : '') + '><td class="lbl">' + esc(s.label) + (isW ? ' <span class="pl cr" style="margin-left:6px">хамгийн их алдагдал</span>' : '') + '</td>'
      + '<td class="r nm">' + esc(fmt(s.base, s.fmt)) + '</td><td class="r nm"><b>' + esc(fmt(s.cur, s.fmt)) + '</b></td>'
      + '<td class="r"><span class="dl ' + (dl === null || s.kind === 'info' ? '' : bad ? 'dn' : 'up') + '">' + (dl === null ? '—' : (dl > 0 ? '+' : '') + dl + '%') + '</span></td>'
      + '<td class="r nm">' + (has(s.lost) ? '≈' + esc(num(s.lost, 1)) : '—') + '</td>'
      + '<td>' + (s.lvl === 'na' ? '<span class="sb mu">' + (s.kind === 'info' ? 'мэдээлэл' : 'өгөгдөл цөөн') + '</span>' : '<span class="pl ' + l[0] + '">' + l[2] + ' ' + (s.kind === 'inv' && s.lvl !== 'ok' ? 'Өссөн' : l[1]) + '</span>') + '</td></tr>');
  });
  o('</tbody></table></div></div>');
  o('<div class="sb mu">«Алдаж буй захиалга» = тухайн шат өмнөх түвшиндээ байсан бол өдөрт хэдэн захиалга нэмж орох байсан тооцоо (тухайн сувгийн бодит уналтаас хэтрүүлэхгүй). Чатын шатууд яриа эхэлсэн өдрөөр тоологдоно.</div></section>');

  // ── 3. Бичлэг бүр
  const CR = A(d.creatives);
  o('<section aria-label="Бичлэг бүр" style="display:flex;flex-direction:column;gap:12px"><div class="hr"><h2 class="h">Бичлэг бүр</h2><span class="sb">' + esc(rng(W.creatives)) + ' · зардал хаашаа явж, юу авчирсан</span></div>');
  if (!CR.length) o('<div class="cd"><div class="sb">Энэ хугацаанд зарын зардал бүртгэгдээгүй.</div></div>');
  else {
    o('<div class="cd" style="padding:6px 8px"><div class="scroll"><table class="tbl"><thead><tr><th>Бичлэг</th><th class="r">Зардал</th><th>Зардлын хувь</th><th class="r">Клик</th><th class="r">Сайтад машин сонгосон</th><th class="r">Чат</th><th class="r">Захиалга</th><th class="r">Сонирхол / 10,000₮</th><th>Төлөв</th></tr></thead><tbody>');
    CR.forEach((c) => {
      const sh = Math.round(n(c.share) * 100);
      o('<tr><td><b>' + esc(c.code) + '</b></td><td class="r nm">' + esc(num(c.spend)) + '₮</td>'
        + '<td><div class="shb"><span class="nm">' + sh + '%</span><span class="bar"><i class="' + (c.hijack ? 'cr' : '') + '" style="width:' + Math.min(100, sh) + '%"></i></span></div></td>'
        + '<td class="r nm">' + esc(num(c.clicks)) + '</td><td class="r nm">' + esc(num(c.site_intent)) + '</td><td class="r nm">' + esc(num(c.chats)) + '</td><td class="r nm">' + esc(num(c.orders)) + '</td>'
        + '<td class="r nm"><b>' + esc(num(c.intent_10k, 2)) + '</b></td>'
        + '<td>' + (c.hijack ? '<span class="pl cr">🔴 Шалгах</span>' : '<span class="sb mu">—</span>') + '</td></tr>');
    });
    o('</tbody></table></div></div>');
    o('<div class="sb mu">Сонирхол = сайтад машинаа сонгосон эсвэл маягт нээсэн хүн + чат эхлүүлсэн хүн. Зардлын 40%-иас ихийг авсан бичлэгийн сонирхол бусдын хагаст хүрэхгүй, захиалга + чатын үр дүн нь бусдын 75%-иас бага бол «Шалгах» гэж тэмдэглэнэ. Захиалга баганад зөвхөн тухайн бичлэгтэй холбогдсон захиалга орно.</div>');
  }
  o('</section>');

  // ── 4. Өдөр бүр
  const DY = A(d.days);
  if (DY.length) {
    o('<section aria-label="Өдөр бүр" style="display:flex;flex-direction:column;gap:12px"><div class="hr"><h2 class="h">Өдөр бүр</h2><span class="sb">Сүүлийн 14 хоног</span></div>');
    o('<div class="cd" style="padding:6px 8px"><div class="scroll"><table class="tbl"><thead><tr><th>Өдөр</th><th class="r">Зардал</th><th class="r">Сайтад орсон</th><th class="r">Шинэ чат</th><th class="r">«Таарна» санал</th><th class="r">Утсаа өгсөн</th><th class="r">Чатаар захиалга</th><th class="r">Сайтаар захиалга</th></tr></thead><tbody>');
    DY.slice().reverse().forEach((x) => {
      const cl = n(x.offer) > 0 ? Math.round(100 * n(x.phone) / n(x.offer)) + '%' : '—';
      o('<tr><td class="nm">' + esc(md(x.d)) + '</td><td class="r nm">' + esc(num(x.spend)) + '₮</td><td class="r nm">' + esc(num(x.lpv)) + '</td><td class="r nm">' + esc(num(x.new)) + '</td>'
        + '<td class="r nm">' + esc(num(x.offer)) + '</td><td class="r nm">' + esc(num(x.phone)) + ' <span class="mu">(' + cl + ')</span></td><td class="r nm"><b>' + esc(num(x.chat)) + '</b></td><td class="r nm"><b>' + esc(num(x.web)) + '</b></td></tr>');
    });
    o('</tbody></table></div></div></section>');
  }

  // ── 5. Барааны дамжуурга
  const used = n(P.used), mx = n(P.max);
  o('<section aria-label="Барааны дамжуурга" style="display:flex;flex-direction:column;gap:12px"><div class="hr"><h2 class="h">Барааны дамжуурга</h2><span class="sb">Нэг бараа унахад дараагийнх нь бэлэн байх ёстой</span></div>');
  o('<div class="cd"' + (used === 0 ? ' style="border-left:4px solid var(--warn)"' : '') + '><div class="kvg">'
    + '<div><span class="kk">Явж буй тест</span><span class="kx nm">' + used + ' / ' + mx + '</span></div>'
    + '<div><span class="kk">Сүүлийн тест эхэлснээс</span><span class="kx nm">' + (has(P.idle_days) ? esc(P.idle_days) + ' хоног' : '—') + '</span></div>'
    + '<div><span class="kk">Нөөцтэй зарагдаж буй бараа</span><span class="kx nm">' + esc(num(P.live)) + '</span></div></div>'
    + (used === 0 ? '<div class="sb">Тестийн слот хоосон байна. Шинэ барааг «Тест» хуудаснаас эхлүүлнэ. Хоосон хэвээр байвал Даваа гараг бүрийн өглөөний тайланд сануулна.</div>' : '') + '</div></section>');

  // ── 6. Машин эзэмшигчдийн сан
  const C = d.crm || {};
  o('<section aria-label="Машин эзэмшигчдийн сан" style="display:flex;flex-direction:column;gap:12px"><div class="hr"><h2 class="h">Машин эзэмшигчдийн сан</h2><span class="sb">Зөвхөн тоо — утас, нэр энд гарахгүй</span></div>');
  if (!C.ok) o('<div class="cd"><div class="sb">Сангийн өгөгдөл ирсэнгүй (car_owner_book).</div></div>');
  else {
    const T = C.totals || {};
    o('<div class="cd"><div class="kvg">'
      + '<div><span class="kk">Машин нь мэдэгдэж буй хүн</span><span class="kx nm">' + esc(num(T.people)) + '</span></div>'
      + '<div><span class="kk">Үүнээс утастай</span><span class="kx nm">' + esc(num(T.with_phone)) + '</span></div>'
      + '<div><span class="kk">Худалдан авсан</span><span class="kx nm">' + esc(num(T.buyers)) + '</span></div>'
      + '<div><span class="kk">Манайд таарах гэрэлгүй машин асуусан</span><span class="kx nm">' + esc(num(T.unfit_people)) + ' <span class="sb mu">(' + esc(num(T.unfit_phones)) + ' утастай)</span></span></div></div>'
      + '<div class="sb">Дараагийн авто барааг аль машинд тааруулахаа эндээс харна. Шинэ бараа гарахад тэр машинтай хүмүүсийн жагсаалтыг Claude гаргана.</div></div>');
    const M = A(C.models);
    if (M.length) {
      o('<div class="cd" style="padding:6px 8px"><div class="scroll"><table class="tbl"><thead><tr><th>Загвар</th><th>Марк</th><th class="r">Хүн</th><th class="r">Утастай</th><th class="r">Худалдан авсан</th></tr></thead><tbody>');
      M.slice(0, 20).forEach((m) => o('<tr><td><b>' + esc(m.label) + '</b></td><td class="sb">' + esc(m.make || '') + '</td><td class="r nm">' + esc(num(m.people)) + '</td><td class="r nm">' + esc(num(m.phones)) + '</td><td class="r nm">' + esc(num(m.buyers)) + '</td></tr>'));
      o('</tbody></table></div></div>');
    }
    const RSN = { other_make: 'Өөр марк', unknown_car: 'Машин тодорхойгүй', unsupported_model: 'Манайд байхгүй загвар', lit_no: 'Хаалганы гэрэлгүй машин' };
    const DM = A(C.demand), DR = A(C.demand_recent);
    if (DM.length || DR.length) {
      o('<details><summary>Таарах гэрэлгүй машин асуусан хүмүүс (' + esc(num(T.unfit_people)) + ')</summary>');
      if (DM.length) o('<div class="meta" style="margin-top:10px">' + DM.map((x) => '<span>' + esc(RSN[x.reason] || x.reason) + ' <b>' + esc(num(x.people)) + '</b></span>').join('') + '</div>');
      if (DR.length) o('<ul class="rc">' + DR.map((x) => '<li>' + esc(x.car) + ' <span class="mu">· ' + esc(RSN[x.reason] || x.reason || '') + ' · ' + esc(md(ub(x.seen))) + '</span></li>').join('') + '</ul>');
      o('</details>');
    }
  }
  o('</section>');

  // ── 7. Хэрхэн ажилладаг
  o('<section aria-label="Хэрхэн ажилладаг" style="display:flex;flex-direction:column;gap:12px"><h2 class="h">Хэрхэн ажилладаг</h2><div class="rules">');
  o('<div class="cd"><div class="lb">Харьцуулалт</div><div class="sb">Сүүлийн 3 бүтэн өдрийг түүний өмнөх 7 өдөртэй шат бүрээр харьцуулна. Хувь хэмжээний шатанд дор хаяж 15–20 тохиолдол байж л төлөв тавина.</div></div>');
  o('<div class="cd"><div class="lb">Сэрэмжлүүлэг</div><div class="sb">Шинэ мессеж нэмэхгүй. Өглөөний шийдвэрийн тайланд «🕳 Алдагдал» нэг мөр гарна; өдөрт 1-ээс олон захиалга алдаж буй улаан шат, «Шалгах» бичлэг байвал ГАЖИГ хэсэгт орно.</div></div>');
  o('<div class="cd"><div class="lb">Хязгаар</div><div class="sb">Чатын захиалгын зөвхөн нэг хэсэг нь бичлэгтэй холбогддог. Retargeting жагсаалтын хэмжээг Meta-гаас уншдаггүй — түүнийг Claude долоо хоног бүр шалгана.</div></div>');
  o('</div></section>');

  o('</div><footer>leak_map · ' + (has(d.ms) ? (n(d.ms) / 1000).toFixed(1) + 'с' : '') + ' · ' + esc(d.as_of || '') + ' · зөвхөн уншина</footer></div></body></html>');
  return out.join('');
}
