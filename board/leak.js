/* Самбар · АЛДАГДАЛ v2 (блок GK, 2026-11-11 — эзэн: «хэтэрхий сунжирсан, анхаарал татахгүй → графикаар, цэвэрхэн»)
   Өгөгдөл өөрчлөгдөөгүй: ?view=leak → leak_map(p) + extra crm → car_owner_book(p). Зөвхөн УНШИНА, n8n нэмэхгүй.
   Бүтэц: 1 мөр дүгнэлт → 4 KPI → 3 график (юүлүүр · 14 хоног · бичлэг) → 2 карт (тест · машины сан) → дэлгэрэнгүй (нээгддэг). */
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
  const f1 = (v) => Math.round(v * 10) / 10;
  const LVC = { ok: 'var(--good)', y: 'var(--warn)', r: 'var(--crit)', na: 'var(--ln2)' };
  const LVK = { ok: 'good', y: 'warn', r: 'crit', na: '' };

  const out = [];
  const o = (s) => out.push(s);

  const CSS = '.nav{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px}.nav a{padding:7px 13px;border-radius:999px;border:1px solid var(--ln);background:var(--s1);color:var(--ink2);font-size:12.5px;font-weight:600}.nav a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
    + '.lk{display:flex;flex-direction:column;gap:14px}'
    + '.lk .hero{display:flex;gap:14px;align-items:center;flex-wrap:wrap;background:var(--s1);border:1px solid var(--ln);border-left:4px solid var(--hc);border-radius:14px;padding:16px 18px}'
    + '.lk .hero .ic{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:var(--ha);color:var(--hc);font-size:19px;font-weight:800;flex:none}'
    + '.lk .hero .tx{flex:1 1 320px;min-width:0}.lk .hero .t1{font-size:17px;font-weight:700;line-height:1.35}.lk .hero .t2{font-size:12.5px;color:var(--ink2);margin-top:3px;line-height:1.5}'
    + '.lk .hero .win{font-size:11px;color:var(--mut);text-align:right;line-height:1.5}'
    + '.lk .krow{margin:0}.lk .k .ks b{font-weight:700}.lk .dn{color:var(--crit)}.lk .up{color:var(--good)}'
    + '.lk .g2{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:14px}@media(max-width:980px){.lk .g2{grid-template-columns:minmax(0,1fr)}}'
    + '.lk .cd{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:15px 16px 12px;min-width:0;display:flex;flex-direction:column;gap:8px}'
    + '.lk .ch{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}.lk .ch b{font-size:13.5px;font-weight:700}.lk .ch span{font-size:11.5px;color:var(--mut)}'
    + '.lk svg.c{width:100%;height:auto;display:block;overflow:visible}.lk svg.c text{font-family:inherit}'
    + '.lk .lgd{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:11px;color:var(--mut)}.lk .lgd i{display:inline-block;width:10px;height:10px;border-radius:3px;vertical-align:-1px;margin-right:5px}.lk .lgd i.ln{height:2px;width:14px;border-radius:1px;vertical-align:3px}'
    + '.lk .mm{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 14px}.lk .mm div{font-size:11px;color:var(--mut)}.lk .mm b{display:block;font-size:20px;color:var(--ink);font-weight:700;line-height:1.15;font-variant-numeric:tabular-nums}'
    + '.lk .bars{display:flex;flex-direction:column;gap:6px;margin-top:4px}.lk .br{display:grid;grid-template-columns:minmax(0,130px) minmax(0,1fr) 54px;gap:8px;align-items:center;font-size:12px}.lk .br span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink2)}'
    + '.lk .tr{height:8px;background:var(--s2);border-radius:999px;overflow:hidden;display:flex}.lk .tr i{display:block;height:100%}.lk .br em{font-style:normal;text-align:right;font-variant-numeric:tabular-nums;color:var(--ink)}'
    + '.lk details.more{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:12px 16px}.lk details.more>summary{cursor:pointer;font-weight:650;font-size:13px;color:var(--ink2)}.lk details.more[open]>summary{margin-bottom:10px}'
    + '.lk .sc{border-radius:10px;margin-top:8px}.lk .sc td.r,.lk .sc th.r{text-align:right}.lk .note{font-size:11.5px;color:var(--mut);line-height:1.5;margin:6px 0 0}'
    + '.lk .fn{display:flex;flex-direction:column;gap:4px}.lk .fr{display:grid;grid-template-columns:minmax(0,150px) minmax(0,1fr) 58px;gap:10px;align-items:center;padding:7px 8px;border-radius:10px}.lk .fr.hl{background:var(--crit-a)}'
    + '.lk .fl b{display:block;font-size:13px;font-weight:650;line-height:1.25}.lk .fl span{font-size:10.5px;color:var(--mut)}'
    + '.lk .fb{display:flex;flex-direction:column;gap:4px}.lk .fb .t0{display:flex;align-items:center;gap:6px}.lk .fb .t0 i{display:block;height:7px;border-radius:99px;background:var(--ln2)}.lk .fb .t0 em{font-style:normal;font-size:10.5px;color:var(--mut);white-space:nowrap}.lk .fb .t1 i{display:block;height:12px;border-radius:99px}'
    + '.lk .fv{text-align:right;display:flex;flex-direction:column;line-height:1.2}.lk .fv span{font-size:10.5px;font-weight:650}.lk .fv b{font-size:15px;font-weight:700;font-variant-numeric:tabular-nums}'
    + '@media(max-width:560px){.lk .fr{grid-template-columns:minmax(0,108px) minmax(0,1fr) 50px;gap:8px}.lk .br{grid-template-columns:minmax(0,104px) minmax(0,1fr) 40px}}'
    + '.lk .slot{display:flex;gap:6px;margin:2px 0 4px}.lk .slot i{flex:1;height:10px;border-radius:4px;background:var(--s2);border:1px dashed var(--ln2)}.lk .slot i.on{background:var(--f3);border:0}';

  o('<!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Starshopping · Алдагдал</title><style>' + CSS + '</style></head><body><div class="w">');
  o('<header><div class="hd"><div class="bm">S</div><div><div class="bt">Алдагдал</div><div class="bs">захиалга хаана алдагдаж байна · ' + esc(mdhm(d.generated_at)) + ' УБ</div></div><div class="sp"></div><a class="rf" href="">Шинэчлэх</a></div></header>');
  o(typeof ssNav === 'function' ? ssNav('leak', themeQ) : '');

  if (!d.ok) {
    o('<div class="al crit"><span class="tag">алдаа</span><span>Алдагдлын өгөгдөл ирсэнгүй (leak_map).</span></div></div></body></html>');
    return out.join('');
  }

  const W = d.windows || {};
  const ST = A(d.stages);
  const S = {}; ST.forEach((s) => { S[s.k] = s; });
  const worst = d.worst || null;
  const HJ = A(d.hijack);
  const P = d.pipeline || {};
  const rng = (a) => (A(a).length === 2 ? md(a[0]) + '–' + md(a[1]) : '—');
  const pctD = (s) => (s && has(s.delta) ? Math.round(n(s.delta) * 100) : null);
  const dTxt = (s) => { const v = pctD(s); return v === null ? '' : (v > 0 ? '+' : '') + v + '%'; };
  const badDir = (s) => { const v = pctD(s); if (v === null || !s) return ''; const bad = s.kind === 'inv' ? v > 0 : v < 0; return bad ? 'dn' : 'up'; };

  o('<div class="lk">');

  // ── 1 · ДҮГНЭЛТ (нэг мөр)
  const lvl = worst ? worst.lvl : HJ.length ? 'y' : 'ok';
  const hc = LVC[lvl] || LVC.ok, ha = lvl === 'r' ? 'var(--crit-a)' : lvl === 'y' ? 'var(--warn-a)' : 'var(--good-a)';
  o('<section class="hero" style="--hc:' + hc + ';--ha:' + ha + '"><div class="ic">' + (worst ? '!' : HJ.length ? '?' : '✓') + '</div><div class="tx">');
  if (worst) o('<div class="t1">' + esc(worst.label) + ' ' + esc(fmt(worst.base, worst.fmt)) + ' → <span style="color:var(--crit)">' + esc(fmt(worst.cur, worst.fmt)) + '</span></div>'
    + '<div class="t2">Энэ шатнаас өдөрт ≈<b>' + esc(num(worst.lost, 1)) + ' захиалга</b> алдаж байна' + (HJ.length ? ' · <b>' + esc(HJ[0].code) + '</b> бичлэг зардлын ' + Math.round(n(HJ[0].share) * 100) + '%-ийг авч сонирхол бага авчирч байна' : '') + '.</div>');
  else o('<div class="t1">Том уналт алга</div><div class="t2">Өдөрт 1-ээс олон захиалга алдаж буй шат байхгүй' + (HJ.length ? ' · <b>' + esc(HJ[0].code) + '</b> бичлэгийг шалгах' : '') + '.</div>');
  o('</div><div class="win">одоо ' + esc(rng(W.cur)) + '<br>өмнө ' + esc(rng(W.base)) + '</div></section>');

  // ── 2 · KPI (4)
  const kp = (lab, s, extra) => {
    if (!s) return '';
    const cls = s.lvl === 'r' ? 'crit' : s.lvl === 'y' ? 'warn' : s.lvl === 'ok' && s.kind !== 'info' ? '' : '';
    return '<div class="k ' + cls + '"><div class="kl">' + esc(lab) + '</div><div class="kv">' + esc(fmt(s.cur, s.fmt)) + '</div>'
      + '<div class="ks">өмнө ' + esc(fmt(s.base, s.fmt)) + ' · <b class="' + badDir(s) + '">' + esc(dTxt(s)) + '</b>' + (extra || '') + '</div></div>';
  };
  o('<div class="krow krow4">' + kp('Захиалга / өдөр', S.orders) + kp('«Таарна» → утас', S.close) + kp('Сайт → захиалга', S.site) + kp('1,000 үзэлтийн үнэ', S.cpm) + '</div>');

  // ── 3 · ГРАФИК: юүлүүр (өмнө vs одоо) ба 14 хоног
  o('<div class="g2">');
  {
    const rows = ['offer', 'close', 'site', 'addr', 'deliv'].map((k) => S[k]).filter(Boolean);
    const SHORT = { offer: 'Машин таарсан', close: '«Таарна» → утас', site: 'Сайт → захиалга', addr: 'Хаягаа өгсөн', deliv: 'Хүргэгдсэн' };
    let s = '<div class="fn">';
    rows.forEach((r) => {
      const mx = Math.max(n(r.base), n(r.cur)) * 1.05 || 1, col = LVC[r.lvl] || 'var(--f3)', isW = worst && worst.k === r.k;
      s += '<div class="fr' + (isW ? ' hl' : '') + '"><div class="fl"><b>' + esc(SHORT[r.k] || r.label) + '</b><span>' + (has(r.lost) && n(r.lost) > 0 ? '≈' + esc(num(r.lost, 1)) + ' захиалга/өдөр алдагдал' : 'n=' + esc(num(r.n_cur))) + '</span></div>'
        + '<div class="fb"><div class="t0"><i style="width:' + Math.round(100 * n(r.base) / mx) + '%"></i><em>' + esc(fmt(r.base, r.fmt)) + '</em></div><div class="t1"><i style="width:' + Math.round(100 * n(r.cur) / mx) + '%;background:' + col + '"></i></div></div>'
        + '<div class="fv"><span class="' + badDir(r) + '">' + esc(dTxt(r)) + '</span><b style="' + (r.lvl === 'r' ? 'color:var(--crit)' : '') + '">' + esc(fmt(r.cur, r.fmt)) + '</b></div></div>';
    });
    s += '</div>';
    o('<section class="cd" aria-label="Юүлүүр"><div class="ch"><b>Юүлүүр — шат бүр</b><span>саарал = өмнө · өнгөт = одоо</span></div>' + s
      + '<div class="lgd"><span><i style="background:var(--crit)"></i>30%+ унасан</span><span><i style="background:var(--warn)"></i>15%+ унасан</span><span><i style="background:var(--good)"></i>хэвийн</span></div></section>');
  }
  {
    const DY = A(d.days);
    const Wd = 460, H = 220, L0 = 26, R0 = 36, T0 = 12, B0 = 28, iw = Wd - L0 - R0, ih = H - T0 - B0;
    const mxO = Math.max(4, ...DY.map((x) => n(x.chat) + n(x.web)));
    const mxS = Math.max(1, ...DY.map((x) => n(x.spend)));
    const step = DY.length ? iw / DY.length : iw, bwid = Math.min(22, step * 0.62);
    const xc = (i) => L0 + step * i + step / 2;
    const yO = (v) => T0 + ih - ih * v / (mxO * 1.1);
    const yS = (v) => T0 + ih - ih * v / (mxS * 1.1);
    let s = '<svg class="c" viewBox="0 0 ' + Wd + ' ' + H + '" role="img" aria-label="14 хоног: өдөр бүрийн захиалга ба зарын зардал">';
    [0, 0.5, 1].forEach((g) => { const yy = T0 + ih - ih * g; s += '<line x1="' + L0 + '" x2="' + (Wd - R0) + '" y1="' + f1(yy) + '" y2="' + f1(yy) + '" stroke="var(--ln3)"/>'; s += '<text x="' + (L0 - 6) + '" y="' + f1(yy + 3.5) + '" text-anchor="end" font-size="11" fill="var(--mut)">' + Math.round(mxO * 1.1 * g) + '</text>'; s += '<text x="' + (Wd - R0 + 6) + '" y="' + f1(yy + 3.5) + '" font-size="11" fill="var(--mut)">' + Math.round(mxS * 1.1 * g / 1000) + 'k</text>'; });
    const cw = A(W.cur);
    DY.forEach((x, i) => {
      const inCur = cw.length === 2 && x.d >= cw[0] && x.d <= cw[1];
      if (inCur) s += '<rect x="' + f1(xc(i) - step / 2) + '" y="' + T0 + '" width="' + f1(step) + '" height="' + ih + '" fill="var(--crit-a)" opacity=".55"/>';
      const hc = ih * n(x.chat) / (mxO * 1.1), hw = ih * n(x.web) / (mxO * 1.1);
      s += '<rect x="' + f1(xc(i) - bwid / 2) + '" y="' + f1(T0 + ih - hc) + '" width="' + f1(bwid) + '" height="' + f1(hc) + '" rx="2" fill="var(--f3)"/>';
      s += '<rect x="' + f1(xc(i) - bwid / 2) + '" y="' + f1(T0 + ih - hc - hw) + '" width="' + f1(bwid) + '" height="' + f1(hw) + '" rx="2" fill="var(--gold)"/>';
      if (i % 2 === DY.length % 2 || i === DY.length - 1) s += '<text x="' + f1(xc(i)) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="11" fill="var(--mut)">' + esc(md(x.d)) + '</text>';
    });
    if (DY.length > 1) s += '<polyline fill="none" stroke="var(--ink2)" stroke-width="1.8" stroke-linejoin="round" points="' + DY.map((x, i) => f1(xc(i)) + ',' + f1(yS(n(x.spend)))).join(' ') + '"/>';
    DY.forEach((x, i) => { s += '<circle cx="' + f1(xc(i)) + '" cy="' + f1(yS(n(x.spend))) + '" r="2.4" fill="var(--ink2)"/>'; });
    s += '</svg>';
    o('<section class="cd" aria-label="14 хоног"><div class="ch"><b>14 хоног — захиалга ба зардал</b><span>улаан дэвсгэр = харьцуулж буй 3 өдөр</span></div>' + s
      + '<div class="lgd"><span><i style="background:var(--f3)"></i>чатаар захиалга</span><span><i style="background:var(--gold)"></i>сайтаар захиалга</span><span><i class="ln" style="background:var(--ink2)"></i>зарын зардал (баруун тэнхлэг)</span></div></section>');
  }
  o('</div>');

  // ── 4 · ГРАФИК: бичлэг бүр + 2 карт
  o('<div class="g2">');
  {
    const CR = A(d.creatives);
    o('<section class="cd" aria-label="Бичлэг бүр"><div class="ch"><b>Бичлэг бүр — зардал хаашаа явж байна</b><span>' + esc(rng(W.creatives)) + '</span></div>');
    if (!CR.length) o('<div class="note">Энэ хугацаанд зарын зардал бүртгэгдээгүй.</div>');
    else {
      o('<div class="bars"><div class="br" style="font-size:10.5px;color:var(--mut)"><span>бичлэг · зардал</span><span>зардлын хувь</span><em style="color:var(--mut)">сонирхол</em></div>');
      CR.forEach((c) => {
        const sh = Math.round(n(c.share) * 100), col = c.hijack ? 'var(--crit)' : 'var(--f3)';
        o('<div class="br"><span><b style="color:var(--ink)">' + esc(c.code) + '</b> · ' + esc(num(c.spend)) + '₮</span>'
          + '<div class="tr"><i style="width:' + Math.min(100, sh) + '%;background:' + col + '"></i></div>'
          + '<em style="' + (c.hijack ? 'color:var(--crit);font-weight:700' : '') + '">' + esc(num(c.intent_10k, 1)) + '</em></div>');
      });
      o('</div><div class="note">Зураас = нийт зардлаас авсан хувь. Сонирхол = 10,000₮ тутамд сайтад машин сонгосон + чат эхлүүлсэн хүн. <b style="color:var(--crit)">Улаан</b> = мөнгийг их авч, сонирхол бага авчирч байна.</div>');
    }
    o('</section>');
  }
  {
    const C = d.crm || {}, T = C.totals || {}, used = n(P.used), mx = n(P.max);
    o('<div style="display:flex;flex-direction:column;gap:14px;min-width:0">');
    o('<section class="cd" aria-label="Барааны дамжуурга"><div class="ch"><b>Шинэ бараа — тестийн слот</b><span>' + used + ' / ' + mx + '</span></div>'
      + '<div class="slot">' + Array.from({ length: Math.max(1, mx) }, (_, i) => '<i class="' + (i < used ? 'on' : '') + '"></i>').join('') + '</div>'
      + '<div class="note" style="margin:0">' + (used === 0 ? 'Хоосон — сүүлийн тест эхэлснээс <b style="color:var(--crit)">' + esc(num(P.idle_days)) + ' хоног</b>. Нэг бараа унахад дараагийнх бэлэн байх ёстой.' : 'Явж буй тест ' + used + ', нөөцтэй бараа ' + esc(num(P.live)) + '.') + '</div></section>');
    if (C.ok) {
      const M = A(C.models).slice(0, 5), mp = Math.max(1, ...M.map((m) => n(m.people)));
      o('<section class="cd" aria-label="Машин эзэмшигчдийн сан"><div class="ch"><b>Машин эзэмшигчдийн сан</b><span>зөвхөн тоо</span></div>'
        + '<div class="mm"><div><b>' + esc(num(T.people)) + '</b>машин нь мэдэгдсэн</div><div><b>' + esc(num(T.with_phone)) + '</b>утастай</div><div><b>' + esc(num(T.buyers)) + '</b>худалдан авсан</div><div><b>' + esc(num(T.unfit_people)) + '</b>таарах гэрэлгүй асуусан</div></div>'
        + '<div class="bars">' + M.map((m) => '<div class="br"><span>' + esc(m.label) + '</span><div class="tr"><i style="width:' + Math.round(100 * n(m.buyers) / mp) + '%;background:var(--good)"></i><i style="width:' + Math.round(100 * (n(m.people) - n(m.buyers)) / mp) + '%;background:var(--ln2)"></i></div><em>' + esc(num(m.buyers)) + '/' + esc(num(m.people)) + '</em></div>').join('') + '</div>'
        + '<div class="lgd"><span><i style="background:var(--good)"></i>авсан</span><span><i style="background:var(--ln2)"></i>асуусан, аваагүй</span></div></section>');
    }
    o('</div>');
  }
  o('</div>');

  // ── 5 · ДЭЛГЭРЭНГҮЙ (хаалттай)
  o('<details class="more"><summary>Дэлгэрэнгүй — бүх шат, өдөр бүр, машины загварууд</summary>');
  o('<div class="sc"><table><thead><tr><th>Шат</th><th class="r">Өмнө</th><th class="r">Одоо</th><th class="r">Өөрчлөлт</th><th class="r">Алдагдал/өдөр</th></tr></thead><tbody>');
  ST.forEach((s) => o('<tr><td>' + esc(s.label) + '</td><td class="r nm">' + esc(fmt(s.base, s.fmt)) + '</td><td class="r nm"><b>' + esc(fmt(s.cur, s.fmt)) + '</b></td><td class="r nm ' + (s.kind === 'info' ? '' : badDir(s)) + '">' + esc(dTxt(s) || '—') + '</td><td class="r nm">' + (has(s.lost) ? '≈' + esc(num(s.lost, 1)) : '—') + '</td></tr>'));
  o('</tbody></table></div>');
  const DY = A(d.days);
  if (DY.length) {
    o('<div class="sc"><table><thead><tr><th>Өдөр</th><th class="r">Зардал</th><th class="r">Сайтад орсон</th><th class="r">Шинэ чат</th><th class="r">«Таарна»</th><th class="r">Утас</th><th class="r">Чат зах.</th><th class="r">Сайт зах.</th></tr></thead><tbody>');
    DY.slice().reverse().forEach((x) => o('<tr><td class="nm">' + esc(md(x.d)) + '</td><td class="r nm">' + esc(num(x.spend)) + '₮</td><td class="r nm">' + esc(num(x.lpv)) + '</td><td class="r nm">' + esc(num(x.new)) + '</td><td class="r nm">' + esc(num(x.offer)) + '</td><td class="r nm">' + esc(num(x.phone)) + '</td><td class="r nm"><b>' + esc(num(x.chat)) + '</b></td><td class="r nm"><b>' + esc(num(x.web)) + '</b></td></tr>'));
    o('</tbody></table></div>');
  }
  const C2 = d.crm || {};
  if (C2.ok && A(C2.models).length) {
    o('<div class="sc"><table><thead><tr><th>Загвар</th><th>Марк</th><th class="r">Хүн</th><th class="r">Утастай</th><th class="r">Авсан</th></tr></thead><tbody>');
    A(C2.models).slice(0, 20).forEach((m) => o('<tr><td>' + esc(m.label) + '</td><td>' + esc(m.make || '') + '</td><td class="r nm">' + esc(num(m.people)) + '</td><td class="r nm">' + esc(num(m.phones)) + '</td><td class="r nm">' + esc(num(m.buyers)) + '</td></tr>'));
    o('</tbody></table></div>');
  }
  o('<p class="note">Сүүлийн 3 бүтэн өдрийг өмнөх 7 өдөртэй харьцуулна; хувь хэмжээнд ≥15–20 тохиолдол байж л төлөв тавина. «Алдагдал/өдөр» = тухайн шат өмнөх түвшиндээ байсан бол нэмж орох байсан захиалга (сувгийн бодит уналтаас хэтрүүлэхгүй). Өглөөний Telegram тайланд «🕳 Алдагдал» мөрөөр гарна.</p>');
  o('</details>');

  o('</div><footer><span>leak_map ' + (has(d.ms) ? (n(d.ms) / 1000).toFixed(1) + 'с' : '') + '</span><span>' + esc(d.as_of || '') + '</span><span>зөвхөн уншина</span></footer></div></body></html>');
  return out.join('');
}
