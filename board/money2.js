/* Самбар · МӨНГӨ v2 (блок DB, 2026-10-31 — эзэн «За ок хий», canvas «Мөнгө хуудас v2»)
   Өгөгдөл: ?view=money → board_read view 'money2' → money_summary(p{from,to,days}) — НЭГ дуудлага.
   Дараалал: дүгнэлт → 1 мөнгө хаана → 2 ашиг (зарагдсан бараагаар) + нэгж эдийн засаг → 3 ирэх 8 долоо хоног
             → 4 бараа бүрээр → 5 зарлага хэнд (бизнес / хувийн / бусад ажил) + данс хоорондын урсгал → 6 энэ долоо хоногт.
   Ангилал, дэвтэр, сан, бодлого = хуучин хуудас (?view=money_old) — «Дэлгэрэнгүй» холбоосоор. */
function renderMoney2(DATA, QUERY) {
  const d = DATA || {};
  const Q = QUERY || {};
  const themeQ = Q.theme === 'dark' || Q.theme === 'light' ? Q.theme : '';
  const tq = themeQ ? '&theme=' + themeQ : '';
  const A = (v) => (Array.isArray(v) ? v : []);
  const n = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? 0 : Number(v));
  const has = (v) => v !== null && v !== undefined && v !== '' && !isNaN(Number(v));
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const num = (v) => Math.round(n(v)).toLocaleString('en-US');
  const mnt = (v) => (has(v) ? (n(v) < 0 ? '−' : '') + Math.abs(Math.round(n(v))).toLocaleString('en-US') + '₮' : '—');
  const sg = (v) => (n(v) > 0 ? '+' : n(v) < 0 ? '−' : '') + Math.abs(Math.round(n(v))).toLocaleString('en-US');
  // богино: 1.69 сая · 503 мянга
  const bn = (v) => { if (!has(v)) return '—'; const x = Math.abs(n(v)); const s = x >= 1e6 ? (x / 1e6).toFixed(2).replace(/\.?0+$/, '') + ' сая' : x >= 1e3 ? Math.round(x / 1e3) + ' мянга' : String(Math.round(x)); return (n(v) < 0 ? '−' : '') + s; };
  const bs = (v) => { const x = Math.abs(n(v)); const s = x >= 1e6 ? (x / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'с' : x >= 1e3 ? Math.round(x / 1e3) + 'м' : String(Math.round(x)); return (n(v) < 0 ? '−' : '') + s; };
  const day = (s) => (s ? String(s).slice(5, 10).replace('-', '/') : '—');
  const pct = (a, b) => (n(b) ? Math.round((n(a) / n(b)) * 100) : 0);
  const short = (s) => String(s || '').split(' · ')[0];

  const out = [];
  const o = (s) => out.push(s);

  const CSS = '.w{max-width:1200px;margin:0 auto;padding:14px 16px 60px}'
    + '.nav{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 6px}.nav a{padding:8px 14px;border-radius:999px;border:1px solid var(--ln);background:var(--s1);color:var(--ink2);text-decoration:none;font-size:13px;font-weight:600}.nav a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
    + '.m2{display:flex;flex-direction:column;gap:22px;margin-top:10px}'
    + '.m2 .nm{font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}'
    + '.m2 .cd{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:18px 20px;min-width:0}'
    + '.m2 .lb{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}'
    + '.m2 .sb{font-size:12.5px;color:var(--ink2);line-height:1.45}'
    + '.m2 .mu{color:var(--mut)}'
    + '.m2 .h{margin:0;font-size:18px;font-weight:700;color:var(--ink);letter-spacing:0;text-transform:none}.m2 .h:after{display:none}'
    + '.m2 .hr{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px}'
    + '.m2 .g4{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:12px}'
    + '.m2 .g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:12px}'
    + '.m2 .big{font-size:28px;font-weight:650;line-height:1.15;margin:6px 0 4px}'
    + '.m2 .col{display:flex;flex-direction:column;gap:8px}'
    + '.m2 .ln{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:9px 0;border-bottom:1px solid var(--ln3);font-size:14px}.m2 .ln:last-child{border-bottom:0}'
    + '.m2 .ln.hl{background:var(--good-a);margin:0 -10px;padding:9px 10px;border-radius:8px;border-bottom:0}'
    + '.m2 .ln.tot{font-size:16px;border-bottom:0}'
    + '.m2 .pl{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}'
    + '.m2 .pl.ok{background:var(--good-a);color:var(--good)}.m2 .pl.wr{background:var(--warn-a);color:var(--warn)}.m2 .pl.cr{background:var(--crit-a);color:var(--crit)}.m2 .pl.bl{background:var(--blue-a);color:var(--f3)}.m2 .pl.nt{background:var(--s2);color:var(--ink2)}'
    + '.m2 .pos{color:var(--good)}.m2 .neg{color:var(--crit)}'
    + '.m2 .ban{display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:14px 18px;border-radius:14px;background:var(--warn-a);border:1px solid var(--ln2)}.m2 .ban.ok{background:var(--good-a)}.m2 .ban.cr{background:var(--crit-a)}'
    + '.m2 .ban .tx{flex:1 1 380px;font-size:14.5px;line-height:1.5;color:var(--ink)}'
    + '.m2 .per{display:flex;gap:6px;flex-wrap:wrap}.m2 .per a{padding:8px 13px;border-radius:999px;border:1px solid var(--ln);background:var(--s1);color:var(--ink2);font-size:13px;font-weight:600;text-decoration:none}.m2 .per a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
    + '.m2 .hb{display:flex;align-items:center;gap:10px;font-size:13px}.m2 .hb .hk{width:150px;flex:none}.m2 .hb .ht{flex:1;height:22px;background:var(--s2);border-radius:6px;overflow:hidden}.m2 .hb .ht i{display:block;height:100%;border-radius:0 4px 4px 0}.m2 .hb .hv{width:76px;text-align:right;flex:none}'
    + '.m2 .vb{display:grid;gap:10px;align-items:end;height:170px;padding:0 2px;border-bottom:1px solid var(--ln)}.m2 .vb>div{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:5px;height:100%;min-width:0}.m2 .vb>div>i{display:block;width:100%;border-radius:4px 4px 0 0;min-height:2px}'
    + '.m2 .vx{display:grid;gap:10px;font-size:11.5px;color:var(--mut);text-align:center}'
    + '.m2 .stk{display:flex;flex-direction:column-reverse;justify-content:flex-start;height:100%;width:100%}.m2 .stk i{display:block;width:100%;border-top:2px solid var(--s1)}.m2 .stk i:last-child{border-radius:4px 4px 0 0}'
    + '.m2 .share{display:flex;height:34px;border-radius:8px;overflow:hidden;gap:2px;background:var(--s1)}.m2 .share i{display:block;height:100%}'
    + '.m2 .swc{width:10px;height:10px;border-radius:3px;display:inline-block;flex:none}'
    + '.m2 .tr{padding:12px 14px;border-radius:10px;border:1px solid var(--ln);display:flex;flex-direction:column;gap:3px;min-width:0}'
    + '.m2 .tbl{overflow-x:auto}.m2 table{width:100%;border-collapse:collapse;font-size:13.5px;min-width:640px}.m2 th{padding:8px 6px;font-weight:600;font-size:12px;color:var(--mut);text-transform:none;letter-spacing:0;text-align:left;border-bottom:1px solid var(--ln)}.m2 td{padding:10px 6px;border-bottom:1px solid var(--ln3);white-space:nowrap}.m2 tr:last-child td{border-bottom:0}.m2 .r{text-align:right}'
    + '.m2 .lk{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:10px}.m2 .lk a{text-decoration:none;color:var(--ink);display:flex;flex-direction:column;gap:4px}.m2 .lk a:hover{border-color:var(--gold)}'
    + '.m2 a.go2{font-size:13px;font-weight:600;color:var(--f3);white-space:nowrap}'
    + '.m2 .c-biz{background:var(--f3)}.m2 .c-per{background:#d9822b}.m2 .c-oth{background:#8a5cc7}.m2 .c-unk{background:var(--ln2)}.m2 .c-stk{background:var(--mut)}'
    + ':root[data-theme="dark"] .m2 .c-per{background:#e0a060}:root[data-theme="dark"] .m2 .c-oth{background:#b39ae6}'
    + '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .m2 .c-per{background:#e0a060}:root:not([data-theme="light"]) .m2 .c-oth{background:#b39ae6}}'
    + '@media(max-width:620px){.m2 .big{font-size:24px}.m2 .hb .hk{width:110px}.m2 .vb{gap:5px}.m2 .vx{gap:5px;font-size:10.5px}.m2 .cd{padding:15px 14px}}'
    + 'footer{margin:26px 0 10px;font-size:12px;color:var(--mut)}';

  o('<!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Starshopping · Мөнгө</title><style>' + CSS + '</style></head><body><div class="w">');
  o('<header><div class="hd"><div class="bm">S</div><div><div class="bt">Starshopping</div>');
  o('<div class="bs">мөнгө · ' + esc(String(d.generated_at || '').replace('T', ' ').slice(0, 16)) + ' UTC' + (has(d.ms) ? ' · ' + (n(d.ms) / 1000).toFixed(1) + 'с' : '') + '</div></div>');
  o('<div class="sp"></div><a class="rf" href="">Шинэчлэх</a></div></header>');
  o(typeof ssNav === 'function' ? ssNav('money', themeQ) : '');

  // DB SQL ажиллаагүй үед board_read 'money2'-ыг dashboard руу унагадаг → хуучин хуудас руу
  if (!d.position || !d.pnl) {
    o('<div class="m2"><div class="ban cr"><div class="tx"><b>Шинэ мөнгөний хуудасны өгөгдөл ирсэнгүй.</b> Supabase-д <code>2026-10-31-DB-money-summary-PASTE.sql</code>-ийг ажиллуулаагүй байж магадгүй. Тэр хүртэл хуучин хуудсыг ашиглана уу.</div><a class="go2" href="/board/?view=money_old' + tq + '">Хуучин мөнгө хуудас →</a></div></div>');
    o('<script>setTimeout(function(){location.replace("/board/?view=money_old' + tq + '")},1500)</script>');
    o('</div></body></html>');
    return out.join('');
  }

  const P = d.position || {}, PL = d.pnl || {}, RS = d.reserve || {}, FL = d.flow || {}, SP = d.spend || {}, TR = d.transfers || {};
  const ACC = A(P.accounts), PR = A(d.products), TODO = A(d.todo), ST = SP.totals || {};

  // ── хугацаа
  const ub = new Date(Date.now() + 8 * 3600e3), iso = (t) => t.toISOString().slice(0, 10);
  const today = iso(ub), m1 = today.slice(0, 8) + '01', dAgo = (k) => iso(new Date(ub.getTime() - k * 864e5));
  const dom = Number(today.slice(8, 10));
  const presets = [['Энэ сар', m1, today, Math.max(dom, 7)], ['30 хоног', dAgo(29), today, 30], ['90 хоног', dAgo(89), today, 90], ['Бүгд', '2026-09-01', today, 370]];
  const pf = d.period && d.period.from ? String(d.period.from) : '', pt = d.period && d.period.to ? String(d.period.to) : '';
  const perHtml = '<nav class="per" aria-label="Хугацаа">' + presets.map((x) => '<a' + (pf === x[1] && pt === x[2] ? ' class="on"' : '') + ' href="/board/?view=money&amp;from=' + x[1] + '&amp;to=' + x[2] + '&amp;days=' + x[3] + tq.replace(/&/g, '&amp;') + '">' + x[0] + '</a>').join('') + '</nav>';

  o('<div class="m2">');
  o('<div class="hr"><div class="sb">Тайлант үе ' + day(pf) + '–' + day(pt) + ' · зарлага сүүлийн ' + n(SP.days) + ' хоног · ханш ' + num(d.fx) + '₮/$</div>' + perHtml + '</div>');

  // ── Дүгнэлт
  const rTarget = n(RS.target), rPct = n(RS.pct), cash = n(P.cash), recv = n(P.receivable), goods = n(P.goods);
  const after = rTarget ? Math.round(((cash + recv) / rTarget) * 100) : 0;
  const bcls = rPct >= 100 ? 'ok' : rPct < 25 ? 'cr' : '';
  const verdict = d.verdict ? String(d.verdict) : '';
  o('<section class="ban ' + bcls + '" aria-label="Дүгнэлт"><span class="pl ' + (bcls === 'ok' ? 'ok' : bcls === 'cr' ? 'cr' : 'wr') + '">Нөөц сан ' + rPct + '%</span>'
    + '<div class="tx">Бэлэн мөнгө <b>' + bn(cash) + '</b>, нөөц сангийн зорилт ' + bn(rTarget) + '. '
    + (goods > cash ? 'Мөнгө <b>бараанд</b> (' + bn(goods) + ') суусан. ' : '')
    + (recv > 0 ? 'Хүргэгдсэн захиалгын ' + bn(recv) + ' ирвэл нөөц ' + after + '% болно.' : '')
    + (verdict ? '<br><span class="sb">' + esc(verdict) + '</span>' : '') + '</div></section>');

  // ── 1 · Мөнгө хаана байна
  const inCash = ACC.filter((a) => a.in_cash);
  const lastBal = inCash.map((a) => (a.balance_at ? new Date(a.balance_at).getTime() : 0)).reduce((m, x) => (x > m ? x : m), 0);
  const staleDays = lastBal ? Math.floor((Date.now() - lastBal) / 864e5) : null;
  const accTxt = inCash.map((a) => esc(short(a.name).replace(/ банк| данс/g, '')) + ' ' + (a.balance === null || a.balance === undefined ? '<span class="mu">[оруулаагүй]</span>' : a.currency === 'USD' ? '$' + n(a.balance).toFixed(0) : num(a.mnt))).join(' · ');
  const other = ACC.filter((a) => !a.in_cash && has(a.balance));
  const G = P.gyals || {};
  o('<section class="col" aria-label="Санхүүгийн байдал" style="gap:12px"><div class="hr"><h2 class="h">1 · Мөнгө хаана байна</h2><span class="sb">Нийт хөрөнгө <b class="nm" style="color:var(--ink)">' + mnt(P.total) + '</b> · төлөх зүйлсийг хассанаар <b class="nm" style="color:var(--ink)">' + mnt(P.net) + '</b></span></div><div class="g4">');
  o('<div class="cd col"><div class="lb">Бэлэн мөнгө</div><div class="big nm">' + mnt(cash) + '</div><div class="sb">' + accTxt + '</div>'
    + (other.length ? '<div class="sb mu">Бэлэнд тооцоогүй: ' + other.map((a) => esc(short(a.name)) + ' ' + bn(a.mnt)).join(' · ') + '</div>' : '')
    + (staleDays !== null && staleDays >= 2 ? '<span class="pl cr" style="align-self:flex-start">Баланс ' + staleDays + ' хоногийн өмнөх</span>' : '') + '</div>');
  o('<div class="cd col"><div class="lb">Авлага</div><div class="big nm">' + mnt(recv) + '</div><div class="sb">Хүргэгдсэн, мөнгө нь ирээгүй (хүргэлтийн хөлс хассан)</div>'
    + (n(P.on_road) ? '<div class="sb mu">+ замд яваа захиалга ' + bn(P.on_road) + ' (хүлээгдэж буй — нийтэд ороогүй)</div>' : '') + '</div>');
  o('<div class="cd col"><div class="lb">Бараа</div><div class="big nm">' + mnt(goods) + '</div><div class="sb">Агуулахад ' + mnt(P.stock) + '</div><div class="sb">Хятадаас замд ' + mnt(P.transit) + '</div></div>');
  o('<div class="cd col"><div class="lb">30 хоногт төлөх</div><div class="big nm neg">' + (n(P.payables_30d) ? '−' : '') + mnt(P.payables_30d) + '</div><div class="sb">Хэрэгслийн захиалга (Claude, n8n, Higgsfield…)</div><div class="sb">Өр ' + mnt(P.debts) + '</div></div>');
  o('</div></section>');

  // ── 2 · Ашиг
  const contrib = n(PL.contrib), fixed = n(PL.fixed), result = n(PL.result), sold = n(PL.sold_n);
  const perOrder = sold ? contrib / sold : 0;
  const need = perOrder > 0 && result < 0 ? Math.ceil(-result / perOrder) : 0;
  const tools = A(PL.tools), toolsSum = tools.reduce((s, t) => s + n(t.mnt), 0), otherFixed = Math.max(fixed - toolsSum, 0);
  o('<section class="g2" aria-label="Ашиг"><div class="cd col" style="gap:2px"><div class="hr" style="margin-bottom:6px"><h2 class="h">2 · Бизнес ашигтай юу</h2><span class="sb">зарагдсан бараагаар тооцсон</span></div>');
  o('<div class="ln"><span>Борлуулалт (мөнгө орсон · ' + sold + ' захиалга)</span><b class="nm">' + num(PL.revenue) + '</b></div>');
  o('<div class="ln"><span class="mu">− Зарагдсан барааны өртөг</span><span class="nm">' + num(PL.cogs) + '</span></div>');
  o('<div class="ln"><span class="mu">− Хүргэлтийн хөлс</span><span class="nm">' + num(PL.fees) + '</span></div>');
  o('<div class="ln"><span class="mu">− Зар</span><span class="nm">' + num(PL.ads) + '</span></div>');
  o('<div class="ln hl"><span><b>Бохир ашиг</b> · захиалга бүрээс</span><b class="nm ' + (contrib >= 0 ? 'pos' : 'neg') + '">' + sg(contrib) + '</b></div>');
  o('<div class="ln"><span class="mu">− Тогтмол зардал (хэрэгсэл ' + num(toolsSum) + (otherFixed ? ' · бусад ' + num(otherFixed) : '') + ')</span><span class="nm">' + num(fixed) + '</span></div>');
  o('<div class="ln tot"><span><b>Үйл ажиллагааны ашиг</b></span><b class="nm ' + (result >= 0 ? 'pos' : 'neg') + '">' + sg(result) + '</b></div>');
  o('<div class="sb" style="margin-top:6px">' + (need ? 'Тогтмол зардлыг нөхөхөд дахиад ≈' + need + ' захиалга хэрэгтэй (нэг захиалгын бохир ашиг ≈' + num(perOrder) + '₮).' : result >= 0 ? 'Тогтмол зардлаа нөхөж байна.' : 'Захиалга бүр алдагдалтай — нэгж эдийн засгийг харна уу.')
    + (n(PL.on_road_contrib) ? ' Замд яваа захиалгаас ≈' + bn(PL.on_road_contrib) + ' бохир ашиг хүлээгдэж байна.' : '') + '</div></div>');

  // нэгж эдийн засаг — хамгийн их зарагдсан бараа, БОДИТ дундаж үнээр
  const top = PR.filter((p) => n(p.sold_n) > 0).sort((a, b) => n(b.sold_n) - n(a.sold_n))[0];
  if (top) {
    const s = n(top.sold_n), price = n(top.revenue) / s, cu = n(top.cogs) / s, fe = n(top.fees) / s, ad = n(top.ads) / s, pr = price - cu - fe - ad;
    const w = (v) => Math.max(0, Math.min(100, (v / price) * 100)).toFixed(1);
    const bar = (k, v, c, b) => '<div class="hb"><span class="hk"' + (b ? ' style="font-weight:600"' : '') + '>' + k + '</span><div class="ht" title="' + esc(k) + ': ' + num(v) + '₮ (' + pct(v, price) + '%)"><i style="width:' + w(Math.abs(v)) + '%;background:' + c + '"></i></div><span class="v nm"' + (b ? ' style="font-weight:600"' : '') + '>' + sg(v).replace('+', '') + '</span></div>';
    o('<div class="cd col" style="gap:12px"><div class="hr"><h2 class="h">Нэг ' + esc(short(top.name).toLowerCase()) + 'ны эдийн засаг</h2><span class="sb">бодит дундаж ' + num(price) + '₮' + (n(top.price) && Math.abs(n(top.price) - price) > 500 ? ' · жагсаалт ' + num(top.price) + '₮' : '') + '</span></div><div class="col">');
    o(bar('Бараа + карго', cu, 'var(--mut)') + bar('Хүргэлтийн хөлс', fe, 'var(--mut)') + bar('Зар (захиалга бүрд)', ad, 'var(--warn)') + bar('Үлдэх ашиг', pr, pr >= 0 ? 'var(--good)' : 'var(--crit)', true));
    const adTarget = 15000;
    o('</div><div class="sb">' + (ad > adTarget ? 'Зарын зардал захиалга бүрд ' + num(ad) + '₮ — ' + num(adTarget) + '₮ болговол ашиг ' + ((pr + ad - adTarget) / Math.max(pr, 1)).toFixed(1) + ' дахин өснө. Энэ бол хамгийн том хөшүүрэг.' : 'Зарын зардал захиалга бүрд ' + num(ad) + '₮ — зорилтод багтаж байна.')
      + (has(top.cancel_pct) ? ' Цуцлалт ' + n(top.cancel_pct) + '%.' : '') + ' ' + s + ' захиалгаар тооцов.</div></div>');
  } else {
    o('<div class="cd col"><h2 class="h">Нэгж эдийн засаг</h2><div class="sb">Энэ хугацаанд мөнгө нь орсон захиалга алга.</div></div>');
  }
  o('</section>');

  // ── 3 · Ирэх 8 долоо хоног
  const W = A(FL.weeks), floor = n(FL.floor);
  if (W.length) {
    const mx = Math.max(1, ...W.map((x) => Math.abs(n(x.balance))), floor);
    const cols = 'grid-template-columns:repeat(' + W.length + ',minmax(0,1fr))';
    o('<section class="cd col" aria-label="Мөнгөний урсгал" style="gap:14px"><div class="hr"><h2 class="h">3 · Ирэх ' + W.length + ' долоо хоног</h2><span class="sb">долоо хоногийн эцсийн бэлэн мөнгө (таамаг) · доод хязгаар ' + bn(floor) + '</span></div>');
    o('<div class="vb" style="' + cols + '">' + W.map((x) => {
      const b = n(x.balance), low = b < floor, inn = n(x.in_gyals), outt = n(x.out_po) + n(x.out_ads) + n(x.out_subs) + n(x.out_debt);
      const tip = day(x.from) + '–' + day(x.to) + ': орох ' + num(inn) + ' · гарах ' + num(outt) + ' (PO ' + num(x.out_po) + ', зар ' + num(x.out_ads) + ', хэрэгсэл ' + num(x.out_subs) + (n(x.out_debt) ? ', өр ' + num(x.out_debt) : '') + ') · үлдэгдэл ' + num(b);
      return '<div title="' + esc(tip) + '"><span class="nm" style="font-size:11px' + (low ? ';color:var(--crit);font-weight:700' : '') + '">' + bs(b) + '</span><i style="height:' + Math.max(2, Math.round((Math.abs(b) / mx) * 130)) + 'px;background:' + (low ? 'var(--crit)' : 'var(--good)') + '"></i></div>';
    }).join('') + '</div>');
    o('<div class="vx" style="' + cols + '">' + W.map((x) => '<span>' + day(x.from) + '</span>').join('') + '</div>');
    const tIn = W.reduce((s, x) => s + n(x.in_gyals), 0), tPo = W.reduce((s, x) => s + n(x.out_po), 0), tAd = W.reduce((s, x) => s + n(x.out_ads), 0), tSub = W.reduce((s, x) => s + n(x.out_subs), 0);
    const lowW = W.filter((x) => n(x.balance) < floor);
    o('<div class="g4" style="gap:10px"><div class="sb"><b class="pos">Орох:</b> хүргэлтийн тооцоо ≈' + bn(tIn) + ' (' + W.length + ' долоо хоногт)</div>'
      + '<div class="sb"><b class="neg">Гарах:</b> бараа ' + bn(tPo) + ' · зар ' + bn(tAd) + ' · хэрэгсэл ' + bn(tSub) + '</div>'
      + '<div class="sb"><b>Дүрэм:</b> үлдэгдэл ' + bn(floor) + '-аас доош орох долоо хоног улаанаар — тэр долоо хоногт PO, зар нэмэхгүй.' + (lowW.length ? ' <b class="neg">' + lowW.map((x) => day(x.from)).join(', ') + '</b>' : '') + '</div></div>');
    o('</section>');
  }

  // ── 4 · Бараа бүрээр
  const MODE = { live: ['Зарж байна', 'ok'], test: ['Тест', 'bl'], preorder: ['Урьдчилсан', 'nt'], paused: ['Зогссон', 'nt'], off: ['Зогссон', 'nt'] };
  const PRV = PR.filter((p) => n(p.revenue) || n(p.spent) || n(p.stock_units) || n(p.on_road_n) || n(p.incoming_units));
  if (PRV.length) {
    o('<section class="cd col" aria-label="Бараа бүрээр" style="gap:10px"><div class="hr"><h2 class="h">4 · Бараа бүрээр</h2><span class="sb">бохир ашиг = борлуулалт − өртөг − хөлс − зар</span></div><div class="tbl"><table><thead><tr><th>Бараа</th><th class="r">Мөнгө орсон</th><th class="r">Авлага · замд</th><th class="r">Нөөц</th><th class="r">Бохир ашиг</th><th class="r">Нэг захиалгад</th><th>Төлөв</th></tr></thead><tbody>');
    PRV.forEach((p) => {
      const s = n(p.sold_n), m = MODE[p.mode] || [p.mode || '—', 'nt'];
      const stk = n(p.stock_units) ? num(p.stock_units) + ' ш' + (has(p.stock_free) && n(p.stock_free) !== n(p.stock_units) ? ' (чөлөөт ' + num(p.stock_free) + ')' : '') : '0';
      o('<tr><td style="font-weight:600;white-space:normal;min-width:160px">' + esc(short(p.name)) + '</td>'
        + '<td class="r nm">' + num(p.revenue) + (s ? '<div class="sb mu">' + s + ' захиалга</div>' : '') + '</td>'
        + '<td class="r nm">' + (n(p.unpaid_gross) ? num(p.unpaid_gross) : '0') + '<div class="sb mu">' + (n(p.unpaid_n) ? n(p.unpaid_n) + ' хүргэгдсэн' : '') + (n(p.on_road_n) ? (n(p.unpaid_n) ? ' · ' : '') + n(p.on_road_n) + ' замд' : '') + '</div></td>'
        + '<td class="r nm">' + stk + (n(p.incoming_units) ? '<div class="sb mu">+ ' + num(p.incoming_units) + ' ш ирж яваа</div>' : '') + '</td>'
        + '<td class="r nm ' + (n(p.contrib) >= 0 ? 'pos' : 'neg') + '">' + sg(p.contrib) + '</td>'
        + '<td class="r nm">' + (s ? sg(n(p.contrib) / s) : '—') + '</td>'
        + '<td><span class="pl ' + m[1] + '">' + esc(m[0]) + '</span>' + (has(p.recovery_pct) && n(p.spent) ? '<div class="sb mu">зарцуулснаа ' + n(p.recovery_pct) + '% буцаасан</div>' : '') + '</td></tr>');
    });
    o('</tbody></table></div></section>');
  }

  // ── 5 · Зарлага хэнд + данс хоорондын урсгал
  const KS = [['business', 'Starshopping', 'c-biz'], ['personal', 'Хувийн', 'c-per'], ['other_work', 'Бусад ажил', 'c-oth'], ['unknown', 'Ангилаагүй', 'c-unk']];
  const tsum = KS.reduce((s, k) => s + n(ST[k[0]]), 0);
  const TOP = A(SP.top), SWK = A(SP.weeks);
  const topTxt = (kind) => TOP.filter((t) => t.kind === kind).slice(0, 3).map((t) => esc(String(t.label || t.category || '—').split(' (')[0]) + ' ' + bs(t.mnt)).join(' · ');
  const accTop = (kind) => A(SP.accounts).filter((a) => n(a['out_' + kind])).sort((a, b) => n(b['out_' + kind]) - n(a['out_' + kind])).map((a) => esc(short(a.acc).replace(/ банк| данс/g, '').replace(/ \(.*\)/, '')) + ' ' + bs(a['out_' + kind])).join(' · ');
  o('<section class="g2" aria-label="Зарлага хэнд"><div class="cd col" style="gap:14px"><div class="hr"><h2 class="h">5 · Зарлага хэнд явж байна</h2><span class="sb">сүүлийн ' + n(SP.days) + ' хоног · банкны SMS</span></div>');
  if (tsum > 0) {
    o('<div class="share" role="img" aria-label="' + esc(KS.filter((k) => n(ST[k[0]])).map((k) => k[1] + ' ' + pct(ST[k[0]], tsum) + ' хувь').join(', ')) + '">' + KS.filter((k) => n(ST[k[0]])).map((k) => '<i class="' + k[2] + '" style="width:' + (n(ST[k[0]]) / tsum * 100).toFixed(2) + '%" title="' + esc(k[1]) + ': ' + num(ST[k[0]]) + '₮ (' + pct(ST[k[0]], tsum) + '%)"></i>').join('') + '</div>');
  }
  o('<div class="g4" style="grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr));gap:10px">' + KS.filter((k) => k[0] !== 'unknown' || n(ST.unknown)).map((k) => '<div class="col" style="gap:4px"><span style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600"><span class="swc ' + k[2] + '"></span>' + k[1] + (tsum ? ' <span class="mu" style="font-weight:500">' + pct(ST[k[0]], tsum) + '%</span>' : '') + '</span><span class="nm" style="font-size:20px;font-weight:650">' + mnt(ST[k[0]]) + '</span><span class="sb">' + (k[0] === 'other_work' && !n(ST.other_work) ? 'шинэ ангилал — гүйлгээн дээр «Бусад ажил» сонгоно' : k[0] === 'unknown' ? 'хуучин хуудсанд ангилна' : (topTxt(k[0]) || '—') + (accTop(k[0]) ? '<br><span class="mu">' + accTop(k[0]) + '</span>' : '')) + '</span></div>').join('') + '</div>');
  if (SWK.length) {
    const wmax = Math.max(1, ...SWK.map((w) => KS.reduce((s, k) => s + n(w[k[0]]), 0)));
    const cols = 'grid-template-columns:repeat(' + SWK.length + ',minmax(0,1fr))';
    o('<div class="col" style="gap:6px"><div class="lb">Долоо хоногоор</div><div class="vb" style="' + cols + ';height:130px;gap:12px">' + SWK.map((w) => {
      const tot = KS.reduce((s, k) => s + n(w[k[0]]), 0);
      return '<div title="' + esc(day(w.w) + ' долоо хоног: ' + KS.filter((k) => n(w[k[0]])).map((k) => k[1] + ' ' + num(w[k[0]])).join(', ') + (n(w.stock) ? ' · бараа (хөрөнгө) ' + num(w.stock) : '')) + '"><span class="nm" style="font-size:10.5px;color:var(--mut)">' + (tot ? bs(tot) : '') + '</span><div class="stk" style="height:' + Math.max(2, Math.round((tot / wmax) * 100)) + 'px">' + KS.filter((k) => n(w[k[0]])).map((k) => '<i class="' + k[2] + '" style="height:' + (n(w[k[0]]) / Math.max(tot, 1) * 100).toFixed(2) + '%"></i>').join('') + '</div></div>';
    }).join('') + '</div><div class="vx" style="' + cols + ';gap:12px">' + SWK.map((w) => '<span>' + day(w.w) + '</span>').join('') + '</div></div>');
  }
  o('<div class="sb">Бараа, карго худалдан авалт (' + bn(ST.stock) + ') энд орохгүй — энэ зардал биш, хөрөнгө; 1-р хэсгийн «Бараа»-д харагдана. Данс хоорондын шилжүүлэг, ₮→USD цэнэглэлт мөн орохгүй.</div></div>');

  // данс хоорондын урсгал
  const RT = A(TR.routes), OI = A(TR.owner_in);
  const byFrom = {};
  RT.forEach((r) => { const k = r.from_name || '?'; (byFrom[k] = byFrom[k] || []).push(r); });
  const accIn = (name) => A(SP.accounts).find((a) => a.acc === name) || {};
  o('<div class="cd col" style="gap:12px"><div class="hr"><h2 class="h">Данс хоорондын урсгал</h2><span class="sb">зардал биш — шилжүүлэг · ' + n(SP.days) + ' хоног</span></div>');
  if (!RT.length && !OI.length) o('<div class="sb mu">Энэ хугацаанд шилжүүлэг алга.</div>');
  Object.keys(byFrom).sort((a, b) => byFrom[b].reduce((s, r) => s + n(r.mnt), 0) - byFrom[a].reduce((s, r) => s + n(r.mnt), 0)).forEach((from) => {
    const rs = byFrom[from], ai = accIn(from), oi = OI.filter((x) => x.to_name === from);
    const ins = [];
    if (n(ai.in_other)) ins.push('орлого ' + bs(ai.in_other));
    oi.forEach((x) => ins.push('таны оруулсан ' + bs(x.mnt)));
    RT.filter((r) => r.to_name === from).forEach((r) => ins.push(esc(short(r.from_name).replace(/ \(.*\)/, '')) + '-аас ' + bs(r.mnt)));
    o('<div class="tr" style="background:var(--s2)"><b style="font-size:14px">' + esc(from) + '</b>' + (ins.length ? '<span class="sb">Орсон: ' + ins.join(' · ') + '</span>' : '') + '</div>');
    o('<div class="g4" style="grid-template-columns:repeat(auto-fit,minmax(min(170px,100%),1fr));gap:8px">' + rs.map((r) => '<div class="tr" title="' + esc(A(r.cats).join(', ')) + '"><span class="nm" style="font-weight:650">→ ' + bs(r.mnt) + '</span><b style="font-size:13px">' + esc(r.to_name) + '</b><span class="sb">' + n(r.n) + ' гүйлгээ</span></div>').join('') + '</div>');
  });
  o('<div class="sb">Шилжүүлгийг 2 талаас нь хос болгож тулгадаг (гарсан ≈ орсон, 3 хоногийн дотор). Хосгүй үлдвэл «Тодорхойгүй» гэж гарна.</div></div></section>');

  // ── 6 · Энэ долоо хоногт
  if (TODO.length) {
    o('<section class="cd col" aria-label="Хийх зүйлс" style="gap:4px"><h2 class="h" style="margin-bottom:6px">6 · Энэ долоо хоногт</h2>');
    TODO.forEach((t) => {
      const href = t.link === 'money_old' ? '/board/?view=money_old' + tq : t.slug ? '/board/?view=ops' + tq : '/board/?view=money_old' + tq;
      o('<div class="ln"><span>' + esc(t.text) + (has(t.mnt) && n(t.mnt) ? ' <span class="mu nm">· ' + bn(t.mnt) + '</span>' : '') + '</span><a class="go2" href="' + href.replace(/&/g, '&amp;') + '">' + (t.k === 'tag' ? 'Ангилах' : 'Харах') + '</a></div>');
    });
    o('</section>');
  }

  // ── дэлгэрэнгүй (хуучин хуудас)
  const old = '/board/?view=money_old' + tq.replace(/&/g, '&amp;');
  o('<section class="lk" aria-label="Дэлгэрэнгүй">'
    + '<a class="cd" href="' + old + '"><b>Данс ба гүйлгээ</b><span class="sb">банкны SMS · ангилах (Бизнес / Хувийн / Бусад ажил)</span></a>'
    + '<a class="cd" href="' + old + '"><b>Зардал бүртгэх · дэвтэр</b><span class="sb">хэрэгсэл, бараа, карго</span></a>'
    + '<a class="cd" href="' + old + '"><b>Сангууд ба хөрөнгө оруулалт</b><span class="sb">нөөц сан · зорилго · хуваарилалт ' + esc(d.split ? n(d.split.reinvest) + '/' + n(d.split.reserve) + '/' + n(d.split.invest) : '') + '</span></a>'
    + '<a class="cd" href="' + old + '"><b>Дүрэм ба тохиргоо</b><span class="sb">нөөц сан ' + n(RS.months || 3) + ' сар · доод бэлэн ' + bn(floor) + '</span></a></section>');

  o('</div><footer>Блок DB · Нийт хөрөнгө = бэлэн + авлага + бараа (агуулах + замд); замд яваа захиалга ороогүй. Ашиг = зарагдсан бараагаар (pnl.econ); 8 долоо хоног = cash_plan таамаг; зарлага = банкны SMS (bank_tx, «үл тоох»-оос бусад), USD × ' + num(d.fx) + '.</footer></div></body></html>');
  return out.join('');
}
