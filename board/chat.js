/* Самбар · ЧАТ (блок ID, 2026-11-16; ID3: нэр + утас + Захиалга хуудасны холбоос; ID4: эх үүсвэрээр салгасан, z-шалгуур) — чатботын менежерийн нүүр: хэн хүлээж байна, хариу хэр хурдан, юүлүүр хаана нарийсч байна.
   Өгөгдөл: ?view=chat → cm_board(p) (cm_finding + cm_funnel + turn_health). Зөвхөн УНШИНА, n8n нэмэхгүй, LLM дуудахгүй.
   Бүтэц: 1 мөр дүгнэлт → 4 KPI → «Одоо шийдэх» + 14 хоногийн хариу → 2 барааны юүлүүр → дэлгэрэнгүй (нээгддэг). */
function renderChat(DATA, QUERY) {
  const d = DATA || {};
  const Q = QUERY || {};
  const themeQ = Q.theme === 'dark' || Q.theme === 'light' ? Q.theme : '';
  const A = (v) => (Array.isArray(v) ? v : []);
  const n = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? 0 : Number(v));
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const ub = (iso) => (iso ? new Date(new Date(iso).getTime() + 8 * 3600000).toISOString() : '');
  const md = (s) => (s ? String(s).slice(5, 10).replace('-', '/') : '—');
  const mdhm = (iso) => (iso ? md(ub(iso)) + ' ' + ub(iso).slice(11, 16) : '—');
  const pct = (a, b) => (n(b) > 0 ? n(a) / n(b) : null);
  const pc = (v) => (v === null ? '—' : (v * 100 >= 10 || v === 0 ? Math.round(v * 100) : (v * 100).toFixed(1)) + '%');
  const KIND = {
    unanswered: ['Хариугүй үлдсэн', 'Чатад хариулах'], open_turn: ['Ээлж хаагдаагүй', 'Чатыг шалгах'],
    order_guard: ['Захиалга ≠ чат', 'Захиалгыг шалгах'], reg_fail: ['Бүртгэл / хаяг хадгалагдаагүй', 'Гараар оруулах'],
    phone_no_lead: ['Утас өгсөн — захиалгагүй', 'Залгаж захиалга авах'], send_fail: ['Илгээлт унасан', ''],
    repeat: ['Ижил асуулт давтсан', ''], deliv_cancel: ['Хүргэлт дээр цуцлагдсан', ''],
    guard_swap: ['Хамгаалалт хариуг сольсон', ''], handoff: ['AI унаж, бэлэн хариу явсан', '']
  };
  const kl = (k) => (KIND[k] ? KIND[k][0] : k);
  // ID3 (11-16, эзэн: «ямар нэртэй чатаас ирснийг мэдэх боломжгүй, захиалга хуудастай холбогдоогүй»): нэр + утас, захиалгатай бол Захиалга хуудасны хайлт руу холбоно
  const who = (x) => (x.who ? '<b>' + esc(x.who) + '</b>' : '<span>нэр бүртгэгдээгүй</span>') + (x.phone ? ' · <a href="tel:' + esc(x.phone) + '">' + esc(x.phone) + '</a>' : '');
  const ordersUrl = (ph) => '/board/?view=orders&q=' + encodeURIComponent(ph) + (themeQ ? '&theme=' + themeQ : '');
  const act = (x) => (x.has_order && x.phone ? '<a class="ta go" href="' + esc(ordersUrl(x.phone)) + '">Захиалга хуудас →</a>'
    : KIND[x.k] && KIND[x.k][1] ? '<div class="ta">' + esc(x.who ? 'Чатаас «' + String(x.who).split(' ')[0] + '» гэж хайх' : KIND[x.k][1]) + '</div>' : '<div></div>');

  const out = [];
  const o = (s) => out.push(s);
  const CSS = '.nav{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px}.nav a{padding:7px 13px;border-radius:999px;border:1px solid var(--ln);background:var(--s1);color:var(--ink2);font-size:12.5px;font-weight:600}.nav a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
    + '.cm{display:flex;flex-direction:column;gap:14px}'
    + '.cm .hero{display:flex;gap:14px;align-items:center;flex-wrap:wrap;background:var(--s1);border:1px solid var(--ln);border-left:4px solid var(--hc);border-radius:14px;padding:16px 18px}'
    + '.cm .hero .ic{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:var(--ha);color:var(--hc);font-size:19px;font-weight:800;flex:none}'
    + '.cm .hero .tx{flex:1 1 320px;min-width:0}.cm .hero .t1{font-size:17px;font-weight:700;line-height:1.35}.cm .hero .t2{font-size:12.5px;color:var(--ink2);margin-top:3px;line-height:1.5}'
    + '.cm .hero .win{font-size:11px;color:var(--mut);text-align:right;line-height:1.5}'
    + '.cm .krow{margin:0}.cm .dn{color:var(--crit)}.cm .up{color:var(--good)}'
    + '.cm .g2{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:14px}.cm .g2.eq{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}@media(max-width:980px){.cm .g2,.cm .g2.eq{grid-template-columns:minmax(0,1fr)}}'
    + '.cm .cd{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:15px 16px 12px;min-width:0;display:flex;flex-direction:column;gap:8px}'
    + '.cm .ch{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}.cm .ch b{font-size:13.5px;font-weight:700}.cm .ch span{font-size:11.5px;color:var(--mut)}'
    + '.cm svg.c{width:100%;height:auto;display:block;overflow:visible}.cm svg.c text{font-family:inherit}'
    + '.cm .lgd{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:11px;color:var(--mut)}.cm .lgd i{display:inline-block;width:10px;height:10px;border-radius:3px;vertical-align:-1px;margin-right:5px}'
    + '.cm .tdl{display:flex;flex-direction:column}.cm .ti{display:grid;grid-template-columns:4px minmax(0,1fr) auto;gap:11px;align-items:start;padding:9px 0;border-top:1px solid var(--ln3)}.cm .ti:first-child{border-top:0;padding-top:2px}'
    + '.cm .ti>i{display:block;align-self:stretch;border-radius:2px;background:var(--crit)}.cm .ti>i.s2{background:var(--warn)}'
    + '.cm .tb1{font-size:13px;font-weight:650;line-height:1.3}.cm .tb1 span{font-weight:400;color:var(--mut);font-size:11.5px;margin-left:6px;white-space:nowrap}'
    + '.cm .tb2{font-size:12px;color:var(--ink2);line-height:1.45;margin-top:2px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}'
    + '.cm .ta{font-size:11px;font-weight:650;color:var(--ink2);border:1px solid var(--ln2);border-radius:7px;padding:4px 8px;white-space:nowrap;margin-top:1px}.cm a.ta.go{color:var(--gold);border-color:var(--gold-ln)}.cm a.ta.go:hover{background:var(--gold-a)}'
    + '.cm .tw{font-size:12.5px;margin-top:2px;line-height:1.4}.cm .tw b{font-weight:650}.cm .tw span{color:var(--mut)}.cm .tw a{color:var(--f3);font-variant-numeric:tabular-nums}'
    + '.cm .emp{font-size:12.5px;color:var(--mut);padding:10px 0}'
    + '.cm .bars{display:flex;flex-direction:column;gap:6px}.cm .br{display:grid;grid-template-columns:minmax(0,190px) minmax(0,1fr) 28px;gap:8px;align-items:center;font-size:12px}.cm .br span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink2)}'
    + '.cm .tr{height:8px;background:var(--s2);border-radius:999px;overflow:hidden;display:flex}.cm .tr i{display:block;height:100%;border-radius:999px}.cm .br em{font-style:normal;text-align:right;font-variant-numeric:tabular-nums;color:var(--ink)}@media(max-width:560px){.cm .br{grid-template-columns:minmax(0,140px) minmax(0,1fr) 24px}}'
    + '.cm .fn{display:flex;flex-direction:column;gap:4px}.cm .fr{display:grid;grid-template-columns:minmax(0,128px) minmax(0,1fr) 58px;gap:10px;align-items:center;padding:7px 8px;border-radius:10px}.cm .fr.hl{background:var(--crit-a)}'
    + '.cm .fl2 b{display:block;font-size:13px;font-weight:650;line-height:1.25}.cm .fl2 span{font-size:10.5px;color:var(--mut)}'
    + '.cm .fb{display:flex;flex-direction:column;gap:4px}.cm .fb .t0{display:flex;align-items:center;gap:6px}.cm .fb .t0 i{display:block;height:7px;border-radius:99px;background:var(--ln2)}.cm .fb .t0 em{font-style:normal;font-size:10.5px;color:var(--mut);white-space:nowrap}.cm .fb .t1 i{display:block;height:12px;border-radius:99px;min-width:3px}'
    + '.cm .fv{text-align:right;display:flex;flex-direction:column;line-height:1.2}.cm .fv span{font-size:10.5px;font-weight:650}.cm .fv b{font-size:15px;font-weight:700;font-variant-numeric:tabular-nums}'
    + '@media(max-width:560px){.cm .fr{grid-template-columns:minmax(0,100px) minmax(0,1fr) 50px;gap:8px}.cm .ti{grid-template-columns:4px minmax(0,1fr)}.cm .ta{grid-column:2;justify-self:start;margin:0 0 2px}}'
    + '.cm details.more{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:12px 16px}.cm details.more>summary{cursor:pointer;font-weight:650;font-size:13px;color:var(--ink2)}.cm details.more[open]>summary{margin-bottom:10px}'
    + '.cm .sc{border-radius:10px;margin-top:8px}.cm .sc td.r,.cm .sc th.r{text-align:right}.cm .note{font-size:11.5px;color:var(--mut);line-height:1.5;margin:6px 0 0}.cm h4{font-size:12px;margin:14px 0 4px;color:var(--ink2)}';

  o('<!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Starshopping · Чат</title><style>' + CSS + '</style></head><body><div class="w">');
  o('<header><div class="hd"><div class="bm">S</div><div><div class="bt">Чат</div><div class="bs">чатбот юу алдаж байна · ' + esc(mdhm(d.generated_at)) + ' УБ</div></div><div class="sp"></div><a class="rf" href="">Шинэчлэх</a></div></header>');
  o(typeof ssNav === 'function' ? ssNav('chat', themeQ) : '');
  if (!d.ok) {
    o('<div class="al crit"><span class="tag">алдаа</span><span>Чатын өгөгдөл ирсэнгүй (cm_board).</span></div></div></body></html>');
    return out.join('');
  }

  const OP = d.open || {}, TODO = A(d.todo), SP = d.speed || {}, FU = (d.funnel || {}).pages || [], TU = d.turns || {};
  const hot = TODO.filter((x) => n(x.sev) >= 3);
  const hotBy = {}; hot.forEach((x) => { hotBy[x.k] = (hotBy[x.k] || 0) + 1; });
  const sum = (k, w) => A(FU).reduce((a, p) => a + n(((p || {})[w] || {})[k]), 0);
  const hasSeg = A(FU).some((p) => p && (p.now_d || p.now_f));   // ID4: cm_funnel эх үүсвэрээр салгасан эсэх (хуучин өгөгдөлтэй нийцтэй)
  const sN = hasSeg ? 'now_d' : 'now', sP = hasSeg ? 'prev_d' : 'prev';
  // харьцуулалтыг зөвхөн өмнөх 7 хоногт 20+ яриатай бараагаар хийнэ (шинэ бараа нэмэгдэхэд дундаж хуурамчаар хөдөлдөг)
  const CMP = A(FU).filter((p) => p && p[sN] && p[sP] && n(p[sP].conv) >= 20);
  const sumC = (k, w) => (CMP.length ? CMP : A(FU)).reduce((a, p) => a + n(((p || {})[w] || {})[k]), 0);
  const phX = sumC('phone_given', sN), phC = sumC('conv', sN), phXp = CMP.length ? sumC('phone_given', sP) : 0, phCp = CMP.length ? sumC('conv', sP) : 0;
  const phNow = pct(phX, phC), phPrev = pct(phXp, phCp);
  const flNow = pct(sumC('phone_given', 'now_f'), sumC('conv', 'now_f')), flPrev = pct(sumC('phone_given', 'prev_f'), sumC('conv', 'prev_f'));
  const adNow = sum('order_addr', 'now'), adPrev = sum('order_addr', 'prev');
  const f24 = pct((SP.h24 || {}).fast, (SP.h24 || {}).n), f7 = pct((SP.d7 || {}).fast, (SP.d7 || {}).n);
  const rel = (a, b) => (a === null || b === null || !b ? null : (a - b) / b);
  // ID4 (11-16): уналтыг зөвхөн тоо нь хангалттай үед улаанаар тэмдэглэнэ (2 хувийн z-шалгуур) — нэг өдрийн урсгалын хольц хуурамч дохио өгдөг байсан
  const zt = (x1, n1, x2, n2) => { if (!(n1 > 0) || !(n2 > 0)) return null; const pp = (x1 + x2) / (n1 + n2), se = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2)); return se > 0 ? (x1 / n1 - x2 / n2) / se : null; };
  const lev = (r, z) => (r === null || z === null ? '' : z <= -1.96 && r <= -0.3 ? 'crit' : z <= -1.64 && r <= -0.15 ? 'warn' : z >= 1.64 ? 'good' : '');
  const dl = (v) => (v === null ? '' : (v > 0 ? '+' : '') + Math.round(v * 100) + '%');

  o('<div class="cm">');

  // ── 1 · ДҮГНЭЛТ
  const nHot = n(OP.sev3);
  const lvl = nHot > 0 ? 'r' : n(OP.total) > 0 ? 'y' : 'ok';
  const hc = lvl === 'r' ? 'var(--crit)' : lvl === 'y' ? 'var(--warn)' : 'var(--good)', ha = lvl === 'r' ? 'var(--crit-a)' : lvl === 'y' ? 'var(--warn-a)' : 'var(--good-a)';
  o('<section class="hero" style="--hc:' + hc + ';--ha:' + ha + '"><div class="ic">' + (nHot > 0 ? '!' : lvl === 'y' ? '?' : '✓') + '</div><div class="tx">');
  if (nHot > 0) o('<div class="t1"><span style="color:var(--crit)">' + nHot + ' яриа</span> таны гарыг хүлээж байна</div><div class="t2">'
    + Object.keys(hotBy).map((k) => esc(kl(k)) + ' <b>' + hotBy[k] + '</b>').join(' · ') + '</div>');
  else o('<div class="t1">Хүн оролцох яриа алга</div><div class="t2">Нээлттэй олдвор ' + n(OP.total) + ' — бүгд мэдээллийн шинжтэй.</div>');
  o('</div><div class="win">олдвор: сүүлийн 24 цаг<br>юүлүүр: 7 хоног · өмнөх 7</div></section>');

  // ── 2 · KPI
  const k = (lab, val, sub, cls) => '<div class="k ' + (cls || '') + '"><div class="kl">' + esc(lab) + '</div><div class="kv">' + val + '</div><div class="ks">' + sub + '</div></div>';
  const rPh = rel(phNow, phPrev), rAd = adPrev ? (adNow - adPrev) / adPrev : null;
  o('<div class="krow krow4">'
    + k('2 минутад хариулсан', pc(f24), 'өмнөх 7 хоног ' + pc(f7) + ' · ' + n((SP.h24 || {}).n) + ' мессеж', f24 !== null && f24 < 0.9 ? 'crit' : f24 !== null && f24 < 0.95 ? 'warn' : '')
    + k('Хүн хэрэгтэй яриа', String(nHot), 'нийт нээлттэй олдвор ' + n(OP.total), nHot > 0 ? 'crit' : '')
    + k(hasSeg ? 'Утсаа өгсөн · өөрөө бичсэн' : 'Утсаа өгсөн яриа', pc(phNow), (phPrev === null ? phC + ' яриа' : 'өмнө ' + pc(phPrev) + ' · <b style="' + (lev(rPh, zt(phX, phC, phXp, phCp)) ? '' : 'color:var(--mut)') + '" class="' + (rPh !== null && rPh < 0 ? 'dn' : 'up') + '">' + dl(rPh) + '</b>')
        + (hasSeg && flNow !== null ? '<br>комментоос ' + pc(flNow) + (flPrev !== null ? ' (өмнө ' + pc(flPrev) + ')' : '') : ''), (function (l) { return l === 'good' ? '' : l; })(lev(rPh, zt(phX, phC, phXp, phCp))))
    + k('Хаягтай захиалга · 7 хоног', String(adNow), 'өмнө ' + adPrev + ' · <b class="' + (rAd !== null && rAd < 0 ? 'dn' : 'up') + '">' + dl(rAd) + '</b>', rAd !== null && rAd <= -0.3 ? 'crit' : '')
    + '</div>');

  // ── 3 · ОДОО ШИЙДЭХ + 14 хоногийн хариу
  o('<div class="g2">');
  {
    const rows = hot.slice(0, 6);
    let s = '<div class="tdl">';
    rows.forEach((x) => {
      s += '<div class="ti"><i></i><div><div class="tb1">' + esc(kl(x.k)) + '<span>' + esc(mdhm(x.at)) + '</span></div>'
        + '<div class="tw">' + who(x) + '</div><div class="tb2">' + esc(x.ev) + '</div></div>' + act(x) + '</div>';
    });
    s += '</div>';
    o('<section class="cd" aria-label="Одоо шийдэх"><div class="ch"><b>Одоо шийдэх</b><span>' + (hot.length > 6 ? 'эхний 6 · нийт ' + hot.length : 'захиалга алдагдаж болзошгүй') + '</span></div>'
      + (rows.length ? s : '<div class="emp">Одоогоор хүн оролцох шаардлагатай яриа алга.</div>') + '</section>');
  }
  {
    const DY = A(SP.days);
    const Wd = 460, H = 220, L0 = 28, R0 = 8, T0 = 22, B0 = 26, iw = Wd - L0 - R0, ih = H - T0 - B0;
    const mx = Math.max(10, ...DY.map((x) => n(x.n)));
    const step = DY.length ? iw / DY.length : iw, bw = Math.min(22, step * 0.62);
    const y = (v) => T0 + ih - (ih * v) / mx;
    let s = '<svg class="c" viewBox="0 0 ' + Wd + ' ' + H + '" role="img" aria-label="14 хоногийн мессеж ба удсан хариу">';
    [0, 0.5, 1].forEach((t) => { const yy = T0 + ih - ih * t; s += '<line x1="' + L0 + '" x2="' + (Wd - R0) + '" y1="' + yy + '" y2="' + yy + '" stroke="var(--ln)" stroke-width="1"/><text x="' + (L0 - 5) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="11" fill="var(--mut)">' + Math.round(mx * t) + '</text>'; });
    DY.forEach((x, i) => {
      const xc = L0 + step * i + step / 2, late = n(x.slow), mid = n(x.mid), bad = late + mid;
      const hN = Math.max(2, (ih * n(x.n)) / mx), hB = bad ? Math.max(5, (ih * bad) / mx) : 0;
      s += '<rect x="' + (xc - bw / 2) + '" y="' + (T0 + ih - hN) + '" width="' + bw + '" height="' + hN + '" rx="3" fill="var(--f3)" opacity=".55"/>';
      if (bad) s += '<rect x="' + (xc - bw / 2) + '" y="' + (T0 + ih - hN) + '" width="' + bw + '" height="' + Math.min(hB, hN) + '" rx="3" fill="' + (late ? 'var(--crit)' : 'var(--warn)') + '"/>'
        + '<text x="' + xc + '" y="' + (T0 + ih - hN - 5) + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="' + (late ? 'var(--crit)' : 'var(--warn)') + '">' + bad + '</text>';
      if (i % 2 === (DY.length - 1) % 2) s += '<text x="' + xc + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="var(--mut)">' + esc(md(x.d)) + '</text>';
    });
    s += '</svg>';
    const tot = DY.reduce((a, x) => a + n(x.n), 0), bad = DY.reduce((a, x) => a + n(x.slow) + n(x.mid), 0);
    const BK = A(OP.by_kind).slice(0, 6), mxK = Math.max(1, ...BK.map((x) => n(x.n)));
    o('<section class="cd" aria-label="Хариуны хурд"><div class="ch"><b>Ирсэн мессеж ба удсан хариу</b><span>14 хоног · ' + tot.toLocaleString('en-US') + ' мессежээс ' + bad + ' удсан</span></div>' + s
      + '<div class="lgd"><span><i style="background:var(--f3);opacity:.55"></i>ирсэн мессеж</span><span><i style="background:var(--crit)"></i>30+ мин хариугүй</span><span><i style="background:var(--warn)"></i>2–30 мин</span></div>'
      + (BK.length ? '<div class="ch" style="margin-top:8px"><b>Нээлттэй олдвор төрлөөр</b><span>нийт ' + n(OP.total) + '</span></div><div class="bars">' + BK.map((x) => '<div class="br"><span>' + esc(kl(x.k)) + '</span><div class="tr"><i style="width:' + Math.round((100 * n(x.n)) / mxK) + '%;background:' + (n(x.sev) >= 3 ? 'var(--crit)' : 'var(--warn)') + '"></i></div><em>' + n(x.n) + '</em></div>').join('') + '</div>' : '') + '</section>');
  }
  o('</div>');

  // ── 4 · ЮҮЛҮҮР — хамгийн их яриатай 2 бараа
  const srcLine = (p) => { const d = p.now_d, f = p.now_f; if (!d || !f || !n(f.conv)) return '';
    const one = (lab, a, b) => lab + ' <b>' + n(a.conv) + '</b> яриа → утас ' + n(a.phone_given) + ' (' + pc(pct(a.phone_given, a.conv)) + ')' + (b && n(b.conv) >= 20 ? ', өмнө ' + pc(pct(b.phone_given, b.conv)) : '');
    return '<p class="note" style="margin:2px 0 0">' + one('Автомат DM-ээр эхэлсэн (коммент) тусдаа:', f, p.prev_f) + ' · бүгд нийлээд ' + n(p.now.conv) + ' яриа → утас ' + n(p.now.phone_given) + '</p>'; };
  const STEPS = [['engaged', 'Асуулт бичсэн'], ['phone_asked', 'Утас асуусан'], ['phone_given', 'Утсаа өгсөн'], ['order_any', 'Захиалга'], ['order_addr', 'Хаягтай захиалга']];
  const top = A(FU).filter((p) => p && p.now && n(p.now.conv) >= 5).slice(0, 2);
  if (top.length) {
    o('<div class="g2 eq">');
    top.forEach((p) => {
      const useD = !!(p.now_d && p.now_f && n(p.now_d.conv) >= 20);   // ID4: автомат DM-ээр эхэлсэн яриа ихтэй бол юүлүүрийг өөрөө бичсэн яриагаар зурна
      const PN = useD ? p.now_d : p.now, PP = (useD ? p.prev_d : p.prev) || {};
      const cN = n(PN.conv), cP = n(PP.conv), cmp = cP >= 20;
      let s = '<div class="fn">', worstK = null, worstR = 0;
      const rs = STEPS.map((st) => { const a = pct(PN[st[0]], cN), b = cmp ? pct(PP[st[0]], cP) : null, r = rel(a, b), lv = cmp ? lev(r, zt(n(PN[st[0]]), cN, n(PP[st[0]]), cP)) : ''; if (lv === 'crit' && r < worstR) { worstR = r; worstK = st[0]; } return { k: st[0], lab: st[1], a: a, b: b, r: r, lv: lv, cnt: n(PN[st[0]]) }; });
      const mxv = Math.max(0.01, ...rs.map((r) => Math.max(r.a || 0, r.b || 0))) * 1.05;
      rs.forEach((r) => {
        const col = r.lv === 'crit' ? 'var(--crit)' : r.lv === 'warn' ? 'var(--warn)' : r.lv === 'good' ? 'var(--good)' : 'var(--f3)';
        s += '<div class="fr' + (r.k === worstK ? ' hl' : '') + '"><div class="fl2"><b>' + esc(r.lab) + '</b><span>' + r.cnt + ' яриа</span></div>'
          + '<div class="fb">' + (r.b !== null ? '<div class="t0"><i style="width:' + Math.round((100 * r.b) / mxv) + '%"></i><em>' + pc(r.b) + '</em></div>' : '')
          + '<div class="t1"><i style="width:' + Math.round((100 * (r.a || 0)) / mxv) + '%;background:' + col + '"></i></div></div>'
          + '<div class="fv"><span class="' + (r.lv === 'crit' || r.lv === 'warn' ? 'dn' : r.lv === 'good' ? 'up' : '') + '" style="' + (r.lv ? '' : 'color:var(--mut)') + '">' + dl(r.r) + '</span><b style="' + (r.lv === 'crit' ? 'color:var(--crit)' : '') + '">' + pc(r.a) + '</b></div></div>';
      });
      s += '</div>';
      o('<section class="cd" aria-label="Юүлүүр"><div class="ch"><b>' + esc(String(p.product || p.page_id).split(' · ')[0]) + '</b><span>' + (useD ? 'өөрөө бичсэн ' : '') + cN + ' яриа' + (cmp ? ' · өмнө ' + cP : ' · өмнөх 7 хоногт өгөгдөл бага') + '</span></div>' + s
        + '<div class="lgd"><span>яриа бүрийн хэдэн хувь тэр шатанд хүрсэн</span>' + (cmp ? '<span><i style="background:var(--ln2)"></i>өмнө</span><span><i style="background:var(--crit)"></i>30%+ унасан (тоо хангалттай)</span><span><i style="background:var(--f3)"></i>ялгаа батлагдаагүй</span>' : '') + '</div>'
        + srcLine(p) + '</section>');
    });
    o('</div>');
  }

  // ── 5 · ДЭЛГЭРЭНГҮЙ
  o('<details class="more"><summary>Дэлгэрэнгүй — бүх олдвор, ээлжийн дэвтэр, засварын санал, арга</summary>');
  o('<h4>Нээлттэй олдвор төрлөөр</h4><div class="sc"><table><thead><tr><th>Төрөл</th><th class="r">Тоо</th><th>Зэрэг</th></tr></thead><tbody>'
    + A(OP.by_kind).map((b) => '<tr><td>' + esc(kl(b.k)) + '</td><td class="r">' + n(b.n) + '</td><td>' + (n(b.sev) >= 3 ? '<span class="ds crit">захиалга алдаж болзошгүй</span>' : '<span class="ds warn">анхаарах</span>') + '</td></tr>').join('') + '</tbody></table></div>');
  const rest = TODO.filter((x) => hot.slice(0, 6).indexOf(x) < 0);
  if (rest.length) o('<h4>Бусад олдвор</h4><div class="sc"><table><thead><tr><th>Цаг</th><th>Төрөл</th><th>Хэн</th><th>Баримт</th></tr></thead><tbody>'
    + rest.map((x) => '<tr><td style="white-space:nowrap">' + esc(mdhm(x.at)) + '</td><td style="white-space:nowrap">' + esc(kl(x.k)) + '</td><td style="white-space:nowrap">' + (x.has_order && x.phone ? '<a href="' + esc(ordersUrl(x.phone)) + '" style="color:var(--gold)">' + esc(x.who || x.phone) + ' →</a>' : esc(x.who || '—')) + '</td><td style="white-space:normal;overflow-wrap:anywhere">' + esc(x.ev) + '</td></tr>').join('') + '</tbody></table></div>');
  const bt = TU.by_terminal_24h || {};
  o('<h4>Ээлжийн дэвтэр · 24 цаг</h4><p class="note">' + (n(TU.rows_24h) ? 'Ээлж ' + n(TU.rows_24h) + ' · нээлттэй ' + n(TU.open_now) + ' · ' + Object.keys(bt).map((t) => esc(t) + ' ' + n(bt[t])).join(' · ')
    : 'Дэвтэрт мөр алга — ботын шинэ хувилбар (IC) ажиллаж эхлээгүй, эсвэл түүнээс хойш мессеж ирээгүй.') + '</p>');
  const FX = A(d.fixes), CS = d.cases || {};
  o('<h4>Засварын санал</h4><p class="note">' + (FX.length ? FX.map((f) => '[' + esc(f.tier) + '] ' + esc(f.title)).join(' · ') : 'Хүлээгдэж буй санал алга.') + ' Регрессийн кейс ' + n(CS.n) + (n(CS.n) ? ' (давсан ' + n(CS.ok) + ', унасан ' + n(CS.fail) + ')' : '') + '.</p>');
  o('<p class="note">Арга: олдворыг 5 минут тутам SQL илрүүлэгч (cm_detect_tick) бичнэ — AI дуудахгүй. «Хариугүй» = сүүлийн мессежид 10+ минут жинхэнэ хариу яваагүй (ok, баярлалаа зэргийг тооцохгүй). «Удсан хариу» = мессеж бүрийн дараагийн жинхэнэ хариу хүртэлх хугацаа. Юүлүүрт хүргэлтийг оруулаагүй (сүүлийн 7 хоногийн захиалга хүргэгдэж дуусаагүй). Уналтыг улаан/шараар зөвхөн тоо нь хангалттай (z-шалгуур) үед тэмдэглэнэ; «Утсаа өгсөн» үзүүлэлт нь өөрөө бичиж эхэлсэн яриагаар тооцно — комментоос автомат DM-ээр эхэлсэн яриа тусдаа (нэг тархсан бичлэг хувийг хуурамчаар унагадаг).</p>');
  o('</details>');

  o('</div></div></body></html>');
  return out.join('');
}
