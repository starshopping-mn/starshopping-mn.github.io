/* Самбар · МӨНГӨ (блок C2, 2026-10-03)
   Өгөгдөл: ?view=money → money_page(p{from,to}) = pnl() + маягтын сонголтууд.
   Нэг цонх: зардал (хэрэгсэл · зар · бараа · хүргэлт · бусад) vs орлого (төлсөн · хүлээгдэж буй) → цэвэр +/−.
   Эзний шийдвэр (10-03): хэрэгслийн зардлыг эзэн өөрөө бүртгэнэ (Claude, Anthropic API, n8n, Higgsfield, ElevenLabs,
   SendPulse, төхөөрөмж…), зар автомат (ad_spend), бараа/карго PO бүрээр. Товч: POST action=ledger (ledger_add) · ledgerdel. */
function renderMoney(DATA, QUERY) {
  const d = DATA || {};
  const Q = QUERY || {};
  const themeQ = Q.theme === 'dark' || Q.theme === 'light' ? Q.theme : '';
  const tq = themeQ ? '&theme=' + themeQ : '';
  const A = (v) => (Array.isArray(v) ? v : []);
  const n = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v));
  const has = (v) => v !== null && v !== undefined && v !== '';
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const mnt = (v) => (has(v) ? Math.round(n(v)).toLocaleString('en-US') + '₮' : '—');
  const big = (v) => { if (!has(v)) return '—'; const x = Math.abs(n(v)); const s = x >= 1e6 ? (x / 1e6).toFixed(2).replace(/\.?0+$/, '') + ' сая' : Math.round(x).toLocaleString('en-US'); return (n(v) < 0 ? '−' : '') + s; };
  const sign = (v) => (n(v) > 0 ? '+' : n(v) < 0 ? '−' : '') + big(Math.abs(n(v)));
  const day = (s) => (s ? String(s).slice(5, 10).replace('-', '/') : '—');
  const iso = (t) => t.toISOString().slice(0, 10);

  const C = d.costs || {}, R = d.revenue || {}, N = d.net || {};
  const T = C.tools || {}, AD = C.ads || {}, G = C.goods || {};
  const BP = A(d.by_product), L = A(d.ledger), PR = A(d.products), VEN = A(d.vendors), FX = d.fx || {};
  const pname = (id) => { const b = BP.find((x) => x.product_id === id) || PR.find((x) => x.product_id === id); return b ? String(b.name || b.slug).split(' · ')[0] : (id ? '?' : '—'); };
  const KIND = { subscription: 'хэрэгсэл', purchase: 'бараа', cargo: 'карго', delivery: 'хүргэлт', other: 'бусад', revenue: 'орлого' };
  const ratioPct = Math.round(n(d.ratio) * 100);
  const costTotal = n(C.total), revReal = n(R.paid), revDelivUnpaid = n(R.delivered_unpaid), revExp = n(R.pipeline_expected);

  // хугацааны товчлолууд (УБ цагаар ойролцоо)
  const now = new Date(); const ub = new Date(now.getTime() + 8 * 3600e3);
  const today = iso(ub), m1 = today.slice(0, 8) + '01';
  const dAgo = (k) => iso(new Date(ub.getTime() - k * 864e5));
  const presets = [['Энэ сар', m1, today], ['30 хоног', dAgo(29), today], ['90 хоног', dAgo(89), today], ['Бүгд', '2026-09-01', today]];
  const cur = (d.from || '') + '→' + (d.to || '');

  const out = [];
  const o = (s) => out.push(s);
  o('<!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Starshopping · Мөнгө</title>');
  o('<style>'
    + '.w{max-width:1180px;margin:0 auto;padding:14px 16px 60px}'
    + '.nav{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 6px}.nav a{padding:8px 14px;border-radius:999px;border:1px solid var(--ln);background:var(--s1);color:var(--ink2);text-decoration:none;font-size:13px;font-weight:600}.nav a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
    + '.per{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:10px 0 12px;font-size:12.5px}.per a{padding:6px 11px;border:1px solid var(--ln2);border-radius:999px;text-decoration:none;color:var(--ink2);background:var(--s1);font-weight:600;font-size:12px}.per a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}.per input{padding:5px 7px;border:1px solid var(--ln2);border-radius:8px;background:var(--bg);color:var(--ink);font:12.5px system-ui,sans-serif}'
    + '.hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:8px 0 16px}.hero div{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:14px 16px}.hero b{display:block;font-size:26px;line-height:1.1;letter-spacing:-.01em}.hero span{display:block;font-size:12px;color:var(--mut);margin-top:4px}.hero .neg b{color:var(--crit,#b02a2a)}.hero .pos b{color:var(--good,#0f7a1f)}.hero .cost b{color:var(--ink)}'
    + '.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin:8px 0 18px}details.cd{background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:10px 12px}details.cd summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:baseline;gap:8px}details.cd summary::-webkit-details-marker{display:none}details.cd summary b{font-size:18px}details.cd summary span{font-size:12px;color:var(--mut)}details.cd[open]{grid-column:1/-1}details.cd .in{margin-top:8px;font-size:12.5px}'
    + 'table.ot{width:100%;border-collapse:collapse;font-size:12.5px;background:var(--s1);border:1px solid var(--ln);border-radius:12px;overflow:hidden}table.ot th{background:var(--s2);text-align:left;padding:8px;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--mut);white-space:nowrap}table.ot td{padding:7px 8px;border-top:1px solid var(--ln3);border-bottom:0;vertical-align:top;white-space:normal;overflow-wrap:anywhere}table.ot td.r,table.ot th.r{text-align:right;white-space:nowrap}table.ot tr.tot td{font-weight:700;background:var(--s2)}'
    + '.pill{display:inline-block;padding:2px 7px;border-radius:999px;font-size:11px;font-weight:600;background:var(--s2);color:var(--ink2)}.pill.ok{background:rgba(34,197,94,.16);color:#2e9a5a}.pill.warn{background:rgba(245,158,11,.18);color:#c27a06}.pill.gold{background:var(--gold-a);color:var(--gold)}'
    + '.pos{color:var(--good,#0f7a1f)}.neg{color:var(--crit,#b02a2a)}'
    + '.eng{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:8px 0 6px}.eng div.t{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:14px 16px}.eng b{display:block;font-size:24px;line-height:1.1;letter-spacing:-.02em}.eng span{display:block;font-size:11.5px;color:var(--mut);margin-top:5px;line-height:1.4}.bar{height:7px;background:var(--s2);border-radius:99px;overflow:hidden;margin-top:8px}.bar i{display:block;height:100%;background:var(--good,#2e9a5a)}.bar i.w{background:#c27a06}.bar i.c{background:var(--crit,#b02a2a)}.st{display:inline-block;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;margin-top:6px}.st.ready{background:rgba(34,197,94,.18);color:#2e9a5a}.st.building{background:rgba(245,158,11,.18);color:#c27a06}.st.locked{background:rgba(176,42,42,.14);color:#b02a2a}.st.no_snapshot{background:var(--s2);color:var(--ink2)}.pol{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:8px}.pol div.r{background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:10px 12px;font-size:12.5px}.pol label{display:block;font-weight:600;margin-bottom:4px}.pol input[type=number]{width:120px;padding:5px 7px;border:1px solid var(--ln2);border-radius:7px;background:var(--bg);color:var(--ink);font:inherit}.pol input.nt{width:100%;box-sizing:border-box;margin-top:5px;padding:5px 7px;border:1px solid var(--ln2);border-radius:7px;background:var(--bg);color:var(--ink);font:inherit;font-size:12px}.pol .hint{color:var(--mut);font-size:11.5px;margin-top:3px}.acc{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin:6px 0 10px}.acc div.a{background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:10px 12px}.acc b{display:block;font-size:19px;letter-spacing:-.02em}.acc span{display:block;font-size:11px;color:var(--mut);margin-top:3px}.acc input{width:110px;box-sizing:border-box;padding:3px 6px;border:1px solid var(--ln2);border-radius:6px;background:var(--bg);color:var(--ink);font:inherit;font-size:12px}.txq td{vertical-align:top}.txq .btn{font-size:11.5px;padding:4px 7px}'
    + '.gl{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin:6px 0 10px}.gl div.g{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:12px 14px}.gl .gh{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.gl .gh b{font-size:15px}.gl .gv{font-size:22px;font-weight:700;letter-spacing:-.02em;margin-top:4px}.gl .gs{font-size:11.5px;color:var(--mut);line-height:1.45;margin-top:4px}.gl .veh{margin-top:8px;padding:7px 9px;border-radius:9px;background:var(--s2);font-size:11.5px;line-height:1.4}.gl .veh b{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink2)}.gl input{box-sizing:border-box;padding:4px 6px;border:1px solid var(--ln2);border-radius:6px;background:var(--bg);color:var(--ink);font:inherit;font-size:12px}'
    + '.edu{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px}.edu div{background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:10px 12px;font-size:12.5px;line-height:1.45}.edu b{display:block;margin-bottom:3px}'
    + '.btn{padding:5px 9px;border:1px solid var(--ln2);border-radius:8px;background:var(--s1);color:var(--ink);font:600 12px system-ui,sans-serif;cursor:pointer;margin:1px 2px 1px 0}.btn.go{background:var(--ink);color:var(--bg);border-color:var(--ink)}.btn.stop{color:#d64b4b;border-color:rgba(239,68,68,.45)}.btn:disabled{opacity:.5}'
    + '.frm{background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:12px;margin:8px 0 14px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}.frm input,.frm select{box-sizing:border-box;padding:6px 8px;border:1px solid var(--ln2);border-radius:8px;background:var(--bg);color:var(--ink);font:12.5px system-ui,sans-serif;max-width:100%}.frm label{font-size:12px;color:var(--mut);display:flex;gap:4px;align-items:center}.frm .hint{flex-basis:100%;font-size:11.5px;color:var(--mut)}'
    + '.out{display:none;margin:6px 0;font-size:12.5px}.out.on{display:block}.mut{color:var(--mut)}.sm{font-size:11.5px}.tw{overflow-x:auto;border-radius:12px}'
    + 'h2{font-size:15px;margin:22px 0 8px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}h2 .cnt{font-size:12px;color:var(--mut);font-weight:500}'
    + 'footer{margin:26px 0 10px;font-size:12px;color:var(--mut)}'
    + '</style></head><body><div class="w">');

  // ── толгой + навигаци
  o('<header><div class="hd"><div class="bm">S</div><div><div class="bt">Starshopping</div>');
  o('<div class="bs">мөнгө · ' + esc(String(d.generated_at || '').replace('T', ' ').slice(0, 16)) + ' UTC</div></div>');
  o('<div class="sp"></div><a class="rf" href="">Шинэчлэх</a></div></header>');
  o(ssNav('money', themeQ));
  // ── M12 (2026-10-20): МӨНГӨНИЙ ХӨДӨЛГҮҮР — ашиг → нөөц сан → татан авалт → чөлөөт мөнгө → хөрөнгө оруулалт
  const E = d.engine || null;
  if (E) {
    const EC = E.cash || {}, EP = E.profit_month || {}, ER = E.reserve || {}, EF = E.free || {}, POL = E.policy || {}, INV = E.invest || {};
    const STN = { ready: '🟢 Хөрөнгө оруулалтад бэлэн', building: '🟡 Нөөц сан бүрдэж байна', locked: '🔴 Нөөц сан дутуу', no_snapshot: 'Баланс оруулаагүй' };
    const pv = (k) => (POL[k] && has(POL[k].value) ? n(POL[k].value) : '');
    const pn = (k) => (POL[k] && POL[k].note ? String(POL[k].note) : '');
    o('<h2 style="margin-top:14px">💰 Мөнгөний хөдөлгүүр <span class="cnt">бэлэн → нөөц сан → татан авалт → чөлөөт → хөрөнгө оруулалт · өдөр бүр 09:30 шалгаж Telegram-д мэдэгдэнэ</span></h2>');
    o('<div class="eng">'
      + '<div class="t"><b>' + (has(EC.now) ? big(EC.now) : '—') + '</b><span>БЭЛЭН МӨНГӨ ₮' + (EC.src === 'bank' ? ' · дансуудын SMS-ийн үлдэгдэл (банк, карт, бэлэн)' : EC.snapshot_d ? ' · баланс ' + esc(day(EC.snapshot_d)) + ' ' + big(EC.snapshot_mnt) + ' → орсон +' + big(EC.in_paid) + ' (' + n(EC.in_n) + ' зах.) · гарсан −' + big(n(EC.out_ledger) + n(EC.out_ads) + n(EC.out_po)) : ' · доор балансаа оруул') + '</span></div>'
      + '<div class="t ' + (n(EP.net_real) < 0 ? 'neg' : n(EP.net_real) > 0 ? 'pos' : '') + '"><b>' + sign(EP.net_real) + '</b><span>ЭНЭ САРЫН АШИГ (бодит) · төлөгдсөн ' + big(EP.paid) + ' · зардал ' + big(EP.costs) + ' · хүлээгдэж буйтай ' + sign(EP.net_expected) + '</span></div>'
      + '<div class="t"><b>' + big(ER.now) + ' <span style="display:inline;font-size:13px;color:var(--mut)">/ ' + big(ER.target) + '</span></b><span>НӨӨЦ САН · ' + n(ER.months) + ' сарын систем (' + big(ER.fixed_monthly) + '/сар) + татан авалтын нөөц ' + big(ER.restock) + (n(ER.upcoming_subs_30d) ? ' · 30 хоногт сунгагдах багц ' + big(ER.upcoming_subs_30d) : '') + '</span><div class="bar"><i class="' + (n(ER.pct) >= 100 ? '' : n(ER.pct) >= 50 ? 'w' : 'c') + '" style="width:' + Math.max(0, Math.min(100, n(ER.pct))) + '%"></i></div></div>'
      + '<div class="t ' + (n(EF.mnt) < 0 ? 'neg' : 'pos') + '"><b>' + (has(EF.mnt) ? sign(EF.mnt) : '—') + '</b><span>ЧӨЛӨӨТ МӨНГӨ = бэлэн − нөөц сан − төлөвлөсөн татан авалт (' + big(EF.planned_restock) + ') · босго ' + big(EF.min) + (n(EF.gap) > 0 ? ' · дутуу ' + big(EF.gap) : '') + '</span><span class="st ' + esc(EF.state || '') + '">' + esc(STN[EF.state] || EF.state || '') + '</span></div>'
      + '</div>');
    // тааз
    const caps = A(E.caps);
    o('<div class="eng" style="margin-top:4px">' + caps.map((c) => { const cap = has(c.cap) ? n(c.cap) : 0; const pct = cap > 0 ? Math.round(100 * n(c.spent) / cap) : null;
      return '<div class="t"><b style="font-size:18px">' + big(c.spent) + (cap ? ' <span style="display:inline;font-size:12px;color:var(--mut)">/ ' + big(cap) + ' · ' + pct + '%</span>' : '') + '</b><span>' + esc(c.label) + ' — энэ сарын зардал' + (cap ? '' : ' · тааз тавиагүй') + '</span>' + (cap ? '<div class="bar"><i class="' + (pct >= 100 ? 'c' : pct >= 80 ? 'w' : '') + '" style="width:' + Math.min(100, pct) + '%"></i></div>' : '') + '</div>'; }).join('') + '</div>');
    // баланс + зарчим
    o('<details class="cd" data-keep="m-pol" style="margin:10px 0"><summary><span>⚙️ Зарчим ба баланс — та бөглөнө, яагаад гэдгээ тайлбарт бичнэ</span><b class="sm mut">сар бүр өөрчилж болно · түүх үлдэнэ</b></summary><div class="in">');
    o('<div class="frm"><label>Банк + бэлэн мөнгөний үлдэгдэл ₮ <input id="s-amt" type="number" step="1000" placeholder="жишээ 6200000" style="width:140px"></label><label>Өдөр <input id="s-d" type="date" value="' + today + '"></label><label>Тайлбар <input id="s-note" placeholder="цалин орсон / карго төлсөн…" size="22"></label><button class="btn go" id="s-save">Баланс шинэчлэх</button>'
      + '<span class="hint">Тухайн өдрийн ЭЦСИЙН байдлаар. Систем түүнээс хойших төлөгдсөн захиалга (+), дэвтэр/зар/PO (−)-ийг өөрөө нэмж хасна. Мөнгө орох бүрт (цалин, хөрөнгө оруулалтаас буцсан) шинэчил.</span><div class="out" id="out-s" style="flex-basis:100%"></div></div>');
    const PK = [['reserve_months', 'Нөөц сан — хэдэн сарын системийн зардал', 'сар', 'Дэлхийн дүрэм: 3–6 сар. Орлого тогтворгүй үед 6.'],
      ['reserve_restock_mnt', 'Нөөц сан — татан авалтын нөөц ₮', '₮', 'WIN барааны дараагийн нэг бүтэн захиалгын мөнгө — зах зээл ханахгүй байхад татан авалт зогсохгүй.'],
      ['planned_restock_mnt', 'Энэ сард төлөвлөсөн татан авалт ₮', '₮', 'Хараахан төлөөгүй. Чөлөөт мөнгөнөөс хасагдана; төлмөгц 0 болго (PO дэвтэрт орно).'],
      ['cap_system_mnt', 'Сарын ТААЗ — систем ₮', '₮', 'Claude, n8n, SendPulse, Higgsfield, домэйн… 80%-д 🟡, 100%-д 🔴 Telegram.'],
      ['cap_ads_mnt', 'Сарын ТААЗ — зар ₮', '₮', 'Хоосон = тааз байхгүй. Зар ашигтай байхад тааз нь орлогын хувиар явбал зөв; тоо тавих бол энд.'],
      ['cap_goods_mnt', 'Сарын ТААЗ — бараа + карго ₮', '₮', 'Хоосон = тааз байхгүй. Ханалтын дохио гарвал систем татан авалтыг өөрөө багасгана (дараагийн блок).'],
      ['split_reinvest_pct', 'Ашгийн хуваарилалт — эргэлтэд %', '%', 'Одоо 100: бараа бүр сард ×2 эргэдэг тул ашиг эргэлтэд байхдаа хамгийн их өгөөжтэй.'],
      ['split_reserve_pct', 'Ашгийн хуваарилалт — нөөц санд %', '%', 'Нөөц сан дүүртэл эндээс. Дүүрсэн сард 0.'],
      ['split_invest_pct', 'Ашгийн хуваарилалт — хөрөнгө оруулалтад %', '%', 'Нөөц сан дүүрсний дараа л утгатай. 3 тоо нийлээд 100 байх ёстой.'],
      ['invest_min_free_mnt', 'Хөрөнгө оруулалтын босго — чөлөөт мөнгө ₮', '₮', 'Чөлөөт мөнгө үүнийг давахад судалгаа автоматаар эхэлж Telegram-д мэдэгдэнэ.']];
    o('<div class="pol">' + PK.map((k) => '<div class="r"><label>' + esc(k[1]) + '</label><input type="number" class="pv" data-k="' + k[0] + '" value="' + esc(pv(k[0])) + '" placeholder="—"> <span class="sm mut">' + esc(k[2]) + '</span> <button class="btn ps" data-k="' + k[0] + '">Хадгалах</button><input class="nt" data-k="' + k[0] + '" value="' + esc(pn(k[0])) + '" placeholder="Яагаад ийм тоо вэ — тайлбар"><div class="hint">' + esc(k[3]) + '</div></div>').join('') + '</div>');
    o('<div class="out" id="out-p"></div>');
    if (A(E.snapshots).length) o('<p class="sm mut">Балансын түүх: ' + A(E.snapshots).slice(0, 6).map((x) => esc(day(x.d)) + ' ' + big(x.amount_mnt) + (x.note ? ' (' + esc(x.note) + ')' : '')).join(' · ') + '</p>');
    o('</div></details>');
    // M14 (2026-10-21): ДАНС БА ГҮЙЛГЭЭ — банкны SMS → бизнес / хувийн / шилжүүлэг
    const BK = E.bank || null;
    if (BK) {
      const ACC = A(EC.accounts), RV = A(BK.review), BM = BK.month || {}, RC = A(BK.recent);
      const SCN = { business: '💼 бизнес', personal: '👤 хувийн', transfer: '🔁 шилжүүлэг', unknown: '❔' };
      const csg = (t) => (t.currency === 'USD' ? (n(t.amount) > 0 ? '+$' : '−$') + Math.abs(n(t.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : sign(t.amount));
      o('<h2>🏦 Данс ба гүйлгээ <span class="cnt">банкны SMS автоматаар орно' + (BK.last_sms_at ? ' · сүүлийн SMS ' + esc(String(BK.last_sms_at).replace('T', ' ').slice(5, 16)) : ' · SMS хараахан ирээгүй (iPhone Shortcut тохируулаагүй?)') + '</span></h2>');
      o('<div class="acc">' + ACC.map((a) => '<div class="a"><b>' + (has(a.balance) ? (a.currency === 'USD' ? '$' + n(a.balance).toLocaleString('en-US') : big(a.balance)) : has(a.manual) ? (a.currency === 'USD' ? '$' + n(a.manual).toLocaleString('en-US') : big(a.manual)) : '—') + '</b><span>' + esc(a.name) + (a.in_cash === false ? ' · <b style="display:inline;font-size:11px">бэлэнд тооцохгүй</b>' : '') + (a.balance_at ? ' · ' + esc(String(a.balance_at).replace('T', ' ').slice(5, 16)) : '') + '</span>'
        + (a.kind !== 'bank' ? '<span>гараар: <input class="am" data-id="' + n(a.id) + '" type="number" step="0.01" value="' + (has(a.manual) ? n(a.manual) : '') + '" placeholder="' + esc(a.currency) + '"> <button class="btn amsave" data-id="' + n(a.id) + '">✓</button></span>' : '') + '</div>').join('') + '</div>');
      o('<p class="sm mut">Энэ сар: бизнес орлого <b class="pos">+' + big(BM.business_in) + '</b> · бизнес зарлага <b class="neg">−' + big(BM.business_out) + '</b> · хувийн зарлага <b>−' + big(BM.personal_out) + '</b> · шилжүүлэг ' + big(BM.transfer) + (n(BM.unknown) ? ' · <span class="pill warn">ангилаагүй ' + big(BM.unknown) + '</span>' : '') + '</p>');
      if (RV.length) {
        o('<h3 style="font-size:13.5px;margin:12px 0 6px">Ангилах хүлээгдэж буй <span class="cnt">' + RV.length + ' · нэг товч. «Дүрэм» = ижил утгатайг цаашид автоматаар</span></h3>');
        o('<div class="tw"><table class="ot txq"><thead><tr><th>Огноо</th><th>Данс</th><th class="r">Дүн</th><th>Утга</th><th>Ангилах</th></tr></thead><tbody>');
        RV.forEach((t) => o('<tr data-keep="tx-' + n(t.id) + '"><td>' + esc(String(t.at || '').replace('T', ' ').slice(5, 16)) + '</td><td class="sm">' + esc(t.account || '—') + '</td><td class="r ' + (n(t.amount) > 0 ? 'pos' : 'neg') + '"><b>' + csg(t) + '</b></td><td class="sm">' + esc(t.utga || '') + (t.note ? '<br><span class="mut">' + esc(t.note) + '</span>' : '') + (t.raw ? '<br><span class="mut">' + esc(t.raw) + '</span>' : '') + '</td><td>'
          + (t.status === 'unparsed' ? '<span class="sm mut">Загвар танигдсангүй — Claude задлагч нэмнэ</span>' : ['business', 'personal', 'transfer'].map((sc) => '<button class="btn txt" data-id="' + n(t.id) + '" data-s="' + sc + '">' + SCN[sc] + '</button>').join('') + ' <label class="sm"><input type="checkbox" class="txr" data-id="' + n(t.id) + '"' + (t.utga && t.utga.length >= 3 ? ' checked' : '') + '> дүрэм</label>'
          + (t.order_id ? '<br><a class="sm" href="/board/?view=orders">захиалга ' + esc(String(t.order_id).slice(0, 8)) + '</a>' : '')) + '</td></tr>'));
        o('</tbody></table></div><div class="out" id="out-tx"></div>');
      }
      if (RC.length) o('<details class="cd" data-keep="tx-recent" style="margin:8px 0"><summary><span>Сүүлийн гүйлгээ (' + RC.length + ')</span><b class="sm mut">ангилсан</b></summary><div class="in"><table class="ot"><tr><th>Огноо</th><th>Данс</th><th class="r">Дүн</th><th>Утга</th><th>Ангилал</th></tr>'
        + RC.map((t) => '<tr><td>' + esc(String(t.at || '').replace('T', ' ').slice(5, 16)) + '</td><td class="sm">' + esc(t.account || '') + '</td><td class="r ' + (n(t.amount) > 0 ? 'pos' : 'neg') + '">' + csg(t) + '</td><td class="sm">' + esc(t.utga || '') + '</td><td class="sm">' + esc(SCN[t.scope] || t.scope) + (t.category ? ' · ' + esc(t.category) : '') + (t.status === 'auto' ? ' <span class="mut">авто</span>' : '') + '</td></tr>').join('') + '</table></div></details>');
    }
    // M13 (2026-10-21): ЗОРИЛГЫН САНГУУД — ашиг → хэрэглээ → эргэлт/нөөц/зорилго → байр 60 · машин 15 · амралт 5 · урт хугацаа 20
    const GV = E.goals || null;
    if (GV) {
      const GS = A(GV.goals), SP = GV.split || {}, PV = GV.prev || {};
      const splitSum = n(SP.reinvest) + n(SP.reserve) + n(SP.invest);
      o('<h2>🎯 Зорилгын сангууд <span class="cnt">ашиг → хэрэглээ → эргэлт ' + n(SP.reinvest) + '% · нөөц ' + n(SP.reserve) + '% · зорилго ' + n(SP.invest) + '%' + (splitSum !== 100 ? ' <span class="pill warn">нийлбэр ' + splitSum + ' — 100 болго</span>' : '') + (GV.share_ok ? '' : ' <span class="pill warn">зорилгын хувь нийлбэр ' + n(GV.share_sum) + ' — 100 болго</span>') + '</span></h2>');
      // сар хаах
      const pm = String(PV.month || '').slice(0, 7);
      if (PV.closed) { const R = PV.row || {}; o('<p class="sm mut">' + esc(pm) + ' сар хаагдсан: ашиг ' + big(R.profit_mnt) + ' − хэрэглээ ' + big(R.consumption_mnt) + ' → эргэлт ' + big(R.reinvest_mnt) + ' · нөөц ' + big(R.reserve_mnt) + ' · зорилго ' + big(R.goals_mnt) + ' <button class="btn mreopen" data-m="' + esc(PV.month) + '">↩ дахин нээх</button></p>'); }
      else o('<div class="frm"><b>📅 ' + esc(pm) + ' сар хаах</b><span class="sm mut">ашиг (бодит цэвэр) ' + big(PV.profit) + '</span><label>Энэ сард өөртөө зарцуулсан ₮ <input id="mc-cons" type="number" step="1000" placeholder="0" value="' + (n(EC.personal_prev) ? Math.round(n(EC.personal_prev)) : '') + '" style="width:120px">' + (n(EC.personal_prev) ? ' <span class="sm mut">(банкны хувийн зарлага)</span>' : '') + '</label><label>Тайлбар <input id="mc-note" size="18"></label><button class="btn go" id="mc-go" data-m="' + esc(PV.month) + '">Сар хаах → хуваарилах</button><span class="hint">Ашгаас хэрэглээг хасаад үлдсэнийг дээрх хувиар эргэлт/нөөц/зорилгод хуваана, зорилго бүрт бичнэ. Ашиг ≤ 0 бол юу ч хуваарилахгүй, сар л хаагдана. Мөнгө дансандаа хэвээр — энэ бол данс дотроо «шошго».</span><div class="out" id="out-mc" style="flex-basis:100%"></div></div>');
      o('<div class="gl">' + GS.map((g) => {
        const V = g.vehicle || {}; const pct = has(g.pct) ? Math.max(0, Math.min(100, n(g.pct))) : null;
        return '<div class="g" data-keep="g-' + n(g.id) + '"><div class="gh"><b>' + esc(g.emoji || '') + ' ' + esc(g.name) + '</b><span class="sm mut">#' + n(g.priority) + ' · ' + n(g.share_pct) + '%</span></div>'
          + '<div class="gv">' + big(g.saved_mnt) + (has(g.target_mnt) ? ' <span style="font-size:13px;color:var(--mut);font-weight:500">/ ' + big(g.target_mnt) + '</span>' : '') + '</div>'
          + (pct !== null ? '<div class="bar"><i class="' + (pct >= 100 ? '' : pct >= 50 ? 'w' : 'c') + '" style="width:' + pct + '%"></i></div>' : '')
          + '<div class="gs">' + (pct !== null ? pct + '% · ' : '') + 'энэ сард ~' + big(g.plan_this_month) + (has(g.months_left) ? ' · одоогийн хурдаар ' + n(g.months_left) + ' сар' : '') + (has(g.horizon_months) ? ' · хугацаа ' + n(g.horizon_months) + ' сар' : '') + (g.note ? '<br>' + esc(g.note) : '') + '</div>'
          + '<div class="veh"><b>Хаана байлгах · ' + esc(V.tier || '') + '</b>' + esc(V.where || '') + '<br><span class="mut">' + esc(V.why || '') + '</span></div>'
          + '<details style="margin-top:8px"><summary class="sm" style="cursor:pointer">Засах · гараар нэмэх/хасах</summary><div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;align-items:center">'
          + '<input class="gt" data-id="' + n(g.id) + '" type="number" step="100000" value="' + (has(g.target_mnt) ? n(g.target_mnt) : '') + '" placeholder="зорилтот ₮" style="width:120px"> <input class="gp" data-id="' + n(g.id) + '" type="number" value="' + n(g.share_pct) + '" style="width:52px">% <input class="gh2" data-id="' + n(g.id) + '" type="number" value="' + (has(g.horizon_months) ? n(g.horizon_months) : '') + '" placeholder="сар" style="width:56px"> сар <button class="btn gsave" data-id="' + n(g.id) + '">Хадгалах</button>'
          + '<span style="flex-basis:100%"></span><input class="gm" data-id="' + n(g.id) + '" type="number" step="10000" placeholder="+ нэмэх / − авах ₮" style="width:150px"> <input class="gmn" data-id="' + n(g.id) + '" placeholder="тайлбар" style="width:140px"> <button class="btn gmove" data-id="' + n(g.id) + '">Бичих</button> <button class="btn goff" data-id="' + n(g.id) + '" title="зорилгыг хаах">✕</button></div>'
          + (A(g.recent).length ? '<div class="sm mut" style="margin-top:5px">' + A(g.recent).map((r) => esc(day(r.d)) + ' ' + sign(r.amount_mnt) + (r.note ? ' ' + esc(r.note) : '')).join(' · ') + '</div>' : '') + '</details></div>';
      }).join('') + '</div>');
      o('<div class="frm"><label>Шинэ зорилго <input id="g-name" placeholder="нэр" size="16"></label><label><input id="g-emoji" placeholder="🎯" size="2"></label><label>Зорилтот ₮ <input id="g-target" type="number" step="100000" style="width:120px"></label><label>Хувь <input id="g-share" type="number" value="0" style="width:52px">%</label><label>Хугацаа <input id="g-h" type="number" placeholder="сар" style="width:56px"></label><button class="btn" id="g-add">Нэмэх</button><div class="out" id="out-g" style="flex-basis:100%"></div></div>');
    }
    // хөрөнгө оруулалт
    o('<h2>📈 Хөрөнгө оруулалт <span class="cnt">чөлөөт мөнгө л энд очно · систем судалж санал болгоно, шийдвэр таных</span></h2>');
    o('<div class="edu">'
      + '<div><b>1 · Дараалал хатуу</b>Эргэлт (бараа, зар) → нөөц сан (3–6 сарын зардал) → дараа нь хөрөнгө оруулалт. Дэлхийн бүх амжилттай хөрөнгө оруулагч эхлээд <i>нөөц сан</i>-гаа бүрдүүлдэг — хямралд хүчээр зарахгүйн тулд.</div>'
      + '<div><b>2 · Бизнесийн өгөөжтэй харьцуул</b>Таны бараа сард ×2 эргэдэг = жилд хэдэн зуун %. Хувьцаа урт хугацаанд жилд ~7–10%, бонд/хадгаламж ~10–18% (Монгол, инфляцтай). Тиймээс мөнгө бизнест хүрэлцэж байвал тэнд, ИЛҮҮ гарсан нь л зах зээлд.</div>'
      + '<div><b>3 · Хямд, тархсан, уйтгартай</b>Buffett, Bogle: ихэнх хүнд ганц компанийн хувьцаа биш, <i>бага шимтгэлтэй индекс сан</i> (S&P 500 г.м.) + найдвартай бонд. Цаг таамаглахгүй, сар бүр тогтмол дүнгээр авна (DCA).</div>'
      + '<div><b>4 · Эрсдэлийг хугацаагаар тааруул</b>1 жилийн дотор хэрэг болох мөнгө → хадгаламж/богино бонд. 5+ жил хэрэггүй мөнгө → хувьцааны индекс. Богино хугацаанд хувьцаанд мөнгө тавих нь тоглоом.</div>'
      + '<div><b>5 · Шимтгэл = өгөөжийн дайсан</b>Жилийн 2% шимтгэл 20 жилд өгөөжийн ⅓-ийг иддэг. Сонголт бүрт шимтгэл, валютын ханшийн эрсдэл (₮↔$), татварыг заавал харна.</div>'
      + '<div><b>6 · Монголоос гарц</b>Apex Capital ҮЦК (лицензтэй, 2018-): дотоод + гадаад хувьцаа, бонд, автомат арилжаа. Банкны хадгаламж, ЗГ-ын бонд — хамгийн бага эрсдэл. Доорх судалгаа эдгээрийг тоогоор харьцуулна.</div>'
      + '</div>');
    const RS = A(INV.research), HO = A(INV.holdings);
    const RISK = ['', '🟢 бага', '🟢 бага-дунд', '🟡 дунд', '🟠 дунд-өндөр', '🔴 өндөр'];
    o('<h3 style="font-size:13.5px;margin:14px 0 6px">Судалгаа <span class="cnt">' + (RS.length ? RS.length + ' сонголт · оноогоор эрэмбэлсэн' : 'чөлөөт мөнгө босго давахад автомат эхэлнэ') + '</span></h3>');
    if (RS.length) { o('<div class="tw"><table class="ot"><thead><tr><th>Сонголт</th><th>Хаана</th><th class="r">Өгөөж/жил</th><th>Эрсдэл</th><th>Хугацаа</th><th class="r">Мин. дүн</th><th>Шимтгэл · гарах</th><th>Дүгнэлт</th><th class="r">Оноо</th><th></th></tr></thead><tbody>');
      RS.forEach((r) => o('<tr data-keep="rs-' + n(r.id) + '"><td><b>' + esc(r.title) + '</b><br><span class="sm mut">' + esc(r.kind) + (r.source_url ? ' · <a href="' + esc(r.source_url) + '" target="_blank" rel="noopener">эх сурвалж</a>' : '') + ' · ' + esc(day(String(r.created_at || '').slice(0, 10))) + '</span></td><td>' + esc(r.venue || '—') + '</td><td class="r">' + (has(r.exp_return_pct) ? n(r.exp_return_pct) + '%' : '—') + '</td><td>' + esc(RISK[n(r.risk)] || '—') + '</td><td>' + (has(r.horizon_months) ? n(r.horizon_months) + ' сар' : '—') + '</td><td class="r">' + (has(r.min_amount_mnt) ? big(r.min_amount_mnt) : '—') + '</td><td class="sm">' + esc(r.fees || '—') + (r.liquidity ? '<br><span class="mut">' + esc(r.liquidity) + '</span>' : '') + '</td><td class="sm">' + esc(r.verdict || '') + (r.note ? '<br><span class="mut">' + esc(r.note) + '</span>' : '') + '</td><td class="r"><b>' + (has(r.score) ? n(r.score) : '—') + '</b></td><td><button class="btn rsoff" data-id="' + n(r.id) + '" title="жагсаалтаас хасах">✕</button></td></tr>'));
      o('</tbody></table></div>'); }
    else o('<p class="sm mut">Судалгааны мөр алга. Төлөв «бэлэн» болмогц систем Telegram-д мэдэгдэж, Claude дараагийн блокт сонголтуудыг тоогоор (өгөөж, эрсдэл, шимтгэл, эх сурвалж) бөглөнө. Эзэн хүсвэл эрт эхлүүлж болно.</p>');
    o('<h3 style="font-size:13.5px;margin:14px 0 6px">Миний хөрөнгө оруулалт <span class="cnt">' + (HO.length ? 'нийт ' + big(INV.total) + ' → одоо ' + big(INV.value) + ' (' + sign(n(INV.value) - n(INV.total)) + ')' : 'хараахан алга') + '</span></h3>');
    if (HO.length) { o('<div class="tw"><table class="ot"><thead><tr><th>Огноо</th><th>Юу</th><th>Хаана</th><th class="r">Дүн ₮</th><th class="r">Одоогийн үнэ</th><th>Өгөөж</th><th>Хугацаа</th><th>Тэмдэглэл</th><th></th></tr></thead><tbody>');
      HO.forEach((h) => { const cv = has(h.current_value_mnt) ? n(h.current_value_mnt) : null; const g = cv === null ? null : cv - n(h.amount_mnt);
        o('<tr data-keep="ho-' + n(h.id) + '"><td>' + esc(h.d) + '</td><td><b>' + esc(h.name) + '</b><br><span class="sm mut">' + esc(h.kind) + (h.status === 'closed' ? ' · хаасан' : '') + '</span></td><td>' + esc(h.venue || '—') + '</td><td class="r">' + mnt(h.amount_mnt) + '</td><td class="r">' + (cv === null ? '—' : mnt(cv) + (h.valued_at ? '<br><span class="sm mut">' + esc(day(h.valued_at)) + '</span>' : '')) + '</td><td class="' + (g > 0 ? 'pos' : g < 0 ? 'neg' : '') + '">' + (g === null ? (has(h.expected_pct) ? '~' + n(h.expected_pct) + '%/жил' : '—') : sign(g)) + '</td><td>' + esc(h.maturity || '—') + '</td><td class="sm">' + esc(h.note || '') + '</td><td>' + (h.status === 'open' ? '<button class="btn hval" data-id="' + n(h.id) + '">Үнэ шинэчлэх</button> <button class="btn hcls" data-id="' + n(h.id) + '">Хаах</button>' : '') + '</td></tr>'); });
      o('</tbody></table></div>'); }
    o('<div class="frm"><label>Төрөл <select id="i-kind"><option value="deposit">хадгаламж</option><option value="bond_gov">ЗГ бонд</option><option value="bond_corp">компанийн бонд</option><option value="etf">индекс сан / ETF</option><option value="stock">хувьцаа</option><option value="fund">сан</option><option value="other">бусад</option></select></label>'
      + '<label>Нэр <input id="i-name" placeholder="жишээ: S&P 500 ETF (VOO)" size="22"></label><label>Хаана <input id="i-venue" placeholder="Apex / Хаан банк…" size="14"></label>'
      + '<label>Дүн ₮ <input id="i-amt" type="number" step="1000" style="width:120px"></label><label>Хүлээгдэх %/жил <input id="i-pct" type="number" step="0.1" style="width:70px"></label><label>Огноо <input id="i-d" type="date" value="' + today + '"></label><label>Дуусах <input id="i-mat" type="date"></label>'
      + '<label>Тайлбар <input id="i-note" placeholder="яагаад авсан" size="20"></label><button class="btn go" id="i-save">Бүртгэх</button>'
      + '<span class="hint">Худалдан авалтыг та өөрөө (Apex, банк) хийнэ — энд зөвхөн бүртгэнэ. Бүртгэмэгц бэлэн мөнгөнөөс хасагдахгүй: дараагийн балансаа шинэчлэхэд өөрөө тусна.</span><div class="out" id="out-i" style="flex-basis:100%"></div></div>');
  } else {
    o('<p class="sm mut" style="margin:10px 0">💰 Мөнгөний хөдөлгүүр: SQL M12 суугаагүй (engine алга).</p>');
  }

  // ── хугацаа
  o('<form class="per" method="get" action="/board/"><input type="hidden" name="view" value="money">' + (themeQ ? '<input type="hidden" name="theme" value="' + themeQ + '">' : ''));
  presets.forEach((p) => o('<a class="' + (p[1] + '→' + p[2] === cur ? 'on' : '') + '" href="/board/?view=money&amp;from=' + p[1] + '&amp;to=' + p[2] + tq + '">' + p[0] + '</a>'));
  o('<span class="mut">·</span> <input type="date" name="from" value="' + esc(d.from || '') + '"> – <input type="date" name="to" value="' + esc(d.to || '') + '"> <button class="btn">Харах</button>'
    + '<span class="sm mut" style="margin-left:auto">' + esc(day(d.from)) + ' – ' + esc(day(d.to)) + ' · ханш $' + n(FX.usd).toLocaleString('en-US') + ' · ¥' + n(FX.cny) + '</span></form>');

  // ── цонх: зардал vs орлого → цэвэр
  o('<div class="hero">'
    + '<div class="cost"><b>−' + big(costTotal) + '</b><span>нийт зардал ₮ · хэрэгсэл ' + big(T.total) + ' · зар ' + big(AD.total) + ' · бараа ' + big(G.total) + '</span></div>'
    + '<div class="' + (revReal > 0 ? 'pos' : '') + '"><b>+' + big(revReal) + '</b><span>орлого бодит (төлсөн ' + n(R.paid_n) + ' захиалга)' + (revDelivUnpaid ? ' · хүргэсэн төлөгдөөгүй ' + big(revDelivUnpaid) : '') + '</span></div>'
    + '<div class="' + (n(N.real) < 0 ? 'neg' : 'pos') + '"><b>' + sign(N.real) + '</b><span>ЦЭВЭР БОДИТ = төлсөн − зардал</span></div>'
    + '<div class="' + (n(N.expected) < 0 ? 'neg' : 'pos') + '"><b>' + sign(N.expected) + '</b><span>цэвэр хүлээгдэж буй · хаягтай ' + n(R.pipeline_n) + ' зах. ' + big(R.pipeline_gross) + ' × ' + ratioPct + '% = ' + big(revExp) + (n(R.leads_n) ? ' · сонирхол ' + n(R.leads_n) + ' (тооцоонд ороогүй)' : '') + '</span></div>'
    + '</div>');

  // ── зардлын задаргаа (дарахад дэлгэрнэ)
  o('<h2>Зардал — хаана, хэд <span class="cnt">дарж задал</span></h2><div class="cards">');
  // хэрэгсэл
  const subs = L.filter((l) => l.kind === 'subscription');
  o('<details class="cd" data-keep="c-tools"><summary><span>Хэрэгсэл · багц</span><b>' + big(T.total) + '</b></summary><div class="in">');
  if (A(T.items).length) { o('<table class="ot"><tr><th>Хэрэгсэл</th><th class="r">Энэ хугацаанд ₮</th></tr>'); A(T.items).forEach((it) => o('<tr><td>' + esc(it.vendor) + '</td><td class="r">' + mnt(it.mnt) + '</td></tr>')); o('</table>'); }
  else o('<p class="mut">Бүртгэл алга. Доорх маягтаар Claude, Anthropic API, n8n, Higgsfield, ElevenLabs, SendPulse, төхөөрөмжийн төлбөрөө оруул — хугацаатай бол (сарын багц) өдрөөр тархаж тооцогдоно.</p>');
  if (subs.length) o('<p class="sm mut">Дэвтэрт ' + subs.length + ' бичилт (сүүлийн жил): ' + subs.slice(0, 8).map((l) => esc(l.vendor || '?') + ' ' + day(l.d) + (l.period_start ? ' (' + day(l.period_start) + '–' + day(l.period_end) + ')' : '') + ' ' + mnt(l.amount_mnt)).join(' · ') + '</p>');
  o('</div></details>');
  // зар
  o('<details class="cd" data-keep="c-ads"><summary><span>Зар (Meta, автомат)</span><b>' + big(AD.total) + '</b></summary><div class="in">');
  if (A(AD.by_creative).length) { o('<table class="ot"><tr><th>AD</th><th>Бараа</th><th class="r">₮</th></tr>'); A(AD.by_creative).forEach((a) => o('<tr><td><a href="/board/?view=orders&amp;creative_id=' + esc(a.creative_id) + tq + '">' + esc(a.creative_id || '—') + '</a></td><td>' + esc(pname(a.product_id)) + '</td><td class="r">' + mnt(a.mnt) + '</td></tr>')); o('</table><p class="sm mut">AD дээр дарвал тэр зарын захиалгууд.</p>'); }
  else o('<p class="mut">Энэ хугацаанд зарын зардал алга (ad_spend).</p>');
  o('</div></details>');
  // бараа
  o('<details class="cd" data-keep="c-goods"><summary><span>Бараа · карго (1688 PO)</span><b>' + big(G.total) + '</b></summary><div class="in">');
  if (A(G.po).length) { o('<table class="ot"><tr><th>PO</th><th>Бараа</th><th>Нийлүүлэгч</th><th>Төлөв</th><th class="r">₮</th></tr>'); A(G.po).forEach((p) => o('<tr><td>#' + n(p.po_id) + ' <span class="sm mut">' + day(p.placed_on) + '</span></td><td>' + esc(pname(p.product_id)) + '</td><td>' + esc(p.supplier || '') + ' <span class="sm mut">' + esc(p.ext_order_no || '') + '</span></td><td><span class="pill">' + esc(p.status) + '</span> ' + (p.in_ledger ? '<span class="pill ok">төлсөн $ дэвтэрт</span>' : '<span class="pill warn">¥-ээс тооцсон</span>') + '</td><td class="r">' + mnt(p.mnt) + '</td></tr>')); o('</table><p class="sm mut">Дэвтэрт төлсөн доллар байвал түүнийг, үгүй бол PO-гийн ¥ × ханшийг авна (давхар тоолохгүй). PO-г Нөөц · PO хуудаснаас бүртгэнэ.</p>'); }
  else o('<p class="mut">Энэ хугацаанд PO алга.</p>');
  o('</div></details>');
  // хүргэлт + бусад
  o('<details class="cd" data-keep="c-dlv"><summary><span>Хүргэлт · буцаалт</span><b>' + big(C.delivery) + '</b></summary><div class="in"><p class="sm mut">deliveries-ийн хүргэлт/буцаалт/буцаан олголт + дэвтрийн «хүргэлт» бичилт.</p></div></details>');
  o('<details class="cd" data-keep="c-oth"><summary><span>Бусад</span><b>' + big(C.other) + '</b></summary><div class="in">' + (L.filter((l) => l.kind === 'other').length ? '<p class="sm">' + L.filter((l) => l.kind === 'other').slice(0, 10).map((l) => day(l.d) + ' ' + esc(l.note || l.vendor || '') + ' ' + mnt(l.amount_mnt)).join(' · ') + '</p>' : '<p class="mut">—</p>') + '</div></details>');
  o('</div>');

  // ── бараа бүрээр
  o('<h2>Бараа бүрээр <span class="cnt">зардал · орлого · цэвэр</span></h2>');
  o('<div class="tw"><table class="ot"><thead><tr><th>Бараа</th><th class="r">Зар</th><th class="r">Бараа/карго</th><th class="r">Хүргэлт</th><th class="r">Төлсөн</th><th class="r">Хүлээгдэж буй ×' + ratioPct + '%</th><th class="r">Сонирхол</th><th class="r">Цэвэр бодит</th><th class="r">Цэвэр хүлээгдэж буй</th></tr></thead><tbody>');
  BP.forEach((b) => o('<tr><td><a href="/board/?view=orders&amp;slug=' + esc(b.slug) + tq + '">' + esc(String(b.name || b.slug).split(' · ')[0]) + '</a> <span class="pill ' + (b.mode === 'live' ? 'ok' : '') + '">' + esc(b.mode || '') + '</span></td>'
    + '<td class="r">' + mnt(b.ads) + '</td><td class="r">' + mnt(b.goods) + '</td><td class="r">' + mnt(b.delivery) + '</td>'
    + '<td class="r">' + mnt(b.paid) + (n(b.paid_n) ? ' <span class="sm mut">(' + n(b.paid_n) + ')</span>' : '') + '</td>'
    + '<td class="r">' + mnt(b.pipeline_expected) + (n(b.pipeline_n) ? ' <span class="sm mut">(' + n(b.pipeline_n) + ' зах.)</span>' : '') + '</td>'
    + '<td class="r">' + n(b.leads_n) + '</td>'
    + '<td class="r ' + (n(b.net_real) < 0 ? 'neg' : n(b.net_real) > 0 ? 'pos' : '') + '"><b>' + sign(b.net_real) + '</b></td>'
    + '<td class="r ' + (n(b.net_expected) < 0 ? 'neg' : n(b.net_expected) > 0 ? 'pos' : '') + '"><b>' + sign(b.net_expected) + '</b></td></tr>'));
  if (!BP.length) o('<tr><td colspan="9" class="mut">Энэ хугацаанд бараатай холбоотой зардал/орлого алга</td></tr>');
  o('<tr class="tot"><td>Нийт' + (n(T.total) || n(C.other) ? ' <span class="sm mut">(+ хэрэгсэл ' + big(T.total) + ' · бусад ' + big(C.other) + ' — бараанд хуваарилаагүй)</span>' : '') + '</td><td class="r">' + mnt(AD.total) + '</td><td class="r">' + mnt(G.total) + '</td><td class="r">' + mnt(C.delivery) + '</td><td class="r">' + mnt(R.paid) + '</td><td class="r">' + mnt(R.pipeline_expected) + '</td><td class="r">' + n(R.leads_n) + '</td><td class="r ' + (n(N.real) < 0 ? 'neg' : 'pos') + '"><b>' + sign(N.real) + '</b></td><td class="r ' + (n(N.expected) < 0 ? 'neg' : 'pos') + '"><b>' + sign(N.expected) + '</b></td></tr>');
  o('</tbody></table></div>');

  // ── зардал бүртгэх маягт
  o('<h2>Зардал бүртгэх <span class="cnt">хэрэгсэл, төхөөрөмж, бусад — зар автомат, PO-г Нөөц хуудаснаас</span></h2>');
  o('<div class="frm"><label>Төрөл <select id="l-kind"><option value="subscription">хэрэгсэл / сарын багц</option><option value="other">бусад</option><option value="delivery">хүргэлт</option><option value="cargo">карго</option><option value="purchase">бараа (PO-гүй)</option></select></label>'
    + '<label>Хэн/юу <input id="l-vendor" list="dl-v" placeholder="Claude, n8n, SendPulse…" size="16"></label><datalist id="dl-v">' + VEN.map((v) => '<option value="' + esc(v) + '">').join('') + '</datalist>'
    + '<label>Дүн <input id="l-amt" type="number" step="0.01" placeholder="0" style="width:100px"> <select id="l-cur"><option>USD</option><option>MNT</option><option>CNY</option></select></label>'
    + '<label>Төлсөн <input id="l-d" type="date" value="' + today + '"></label>'
    + '<label id="l-perw">Хугацаа <input id="l-ps" type="date" value="' + today + '"> – <input id="l-pe" type="date" value="' + iso(new Date(ub.getTime() + 29 * 864e5)) + '"></label>'
    + '<label>Бараа <select id="l-prod"><option value="">— ерөнхий —</option>' + PR.map((p) => '<option value="' + esc(p.product_id) + '">' + esc(String(p.name || p.slug).split(' · ')[0]) + '</option>').join('') + '</select></label>'
    + '<label>Тайлбар <input id="l-note" placeholder="жишээ: Claude Max 10-р сар" size="22"></label>'
    + '<button class="btn go" id="l-save">Бүртгэх</button>'
    + '<span class="hint">Сарын багц бол «хугацаа»-г заа — тэр хугацааны өдрүүдэд хуваагдаж ашгийн цонхонд зөв орно. Нэг удаагийн (төхөөрөмж, бичиг хэрэг) бол хугацааг хоослоод төлсөн өдөрт нь бүтэн орно.</span>'
    + '<div class="out" id="out-l" style="flex-basis:100%"></div></div>');

  // ── дэвтэр
  o('<h2>Дэвтэр <span class="cnt">сүүлийн ' + L.length + ' бичилт</span></h2>');
  o('<div class="tw"><table class="ot"><thead><tr><th>Огноо</th><th>Төрөл</th><th>Хэн/юу · тайлбар</th><th>Бараа</th><th>Хугацаа</th><th class="r">Дүн</th><th class="r">₮</th><th></th></tr></thead><tbody>');
  L.forEach((l) => o('<tr data-keep="l-' + n(l.id) + '"><td>' + esc(l.d) + '</td><td><span class="pill ' + (l.kind === 'subscription' ? 'gold' : '') + '">' + esc(KIND[l.kind] || l.kind) + '</span></td><td>' + esc(l.vendor || '') + (l.note ? (l.vendor ? ' · ' : '') + '<span class="mut">' + esc(l.note) + '</span>' : '') + (l.creative_id ? ' <span class="sm mut">' + esc(l.creative_id) + '</span>' : '') + '</td><td>' + esc(l.product_id ? pname(l.product_id) : '—') + '</td><td>' + (l.period_start ? day(l.period_start) + '–' + day(l.period_end) : '—') + '</td><td class="r">' + n(l.amount).toLocaleString('en-US') + ' ' + esc(l.currency) + '</td><td class="r">' + mnt(l.amount_mnt) + '</td><td><button class="btn stop ldel" data-id="' + n(l.id) + '" title="Устгах">✕</button></td></tr>'));
  if (!L.length) o('<tr><td colspan="8" class="mut">Бичилт алга</td></tr>');
  o('</tbody></table></div>');

  o('<footer>Блок C2 · Цэвэр бодит = төлсөн − (хэрэгсэл + зар + бараа/карго + хүргэлт + бусад). Хүлээгдэж буй = хаягтай захиалга × ' + ratioPct + '% (таамаг — эхний 20 хүргэлтээс хойш бодитоор солино; cost_settings.order_to_sale_ratio). Сонирхол (хаяггүй) тооцоонд ороогүй. Зар = ad_spend автомат, бараа = PO (Нөөц · PO), хэрэгсэл = эзний бүртгэл.</footer></div>');

  // ── үйлдлүүд
  o('<script>(function(){var U="https://starshopping.app.n8n.cloud/webhook/board-data",k="";try{k=localStorage.getItem("ss_board_key")||""}catch(x){}'
    + 'function e(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]})}'
    + 'function say(id,msg,bad){var o=document.getElementById(id);if(!o)return;o.className="out on";o.innerHTML=(bad?"⚠️ ":"✅ ")+e(msg)}'
    + 'function post(b,btn,out){if(btn){btn.disabled=true;btn.dataset.tx=btn.textContent;btn.textContent="…"}'
    + 'return fetch(U+"?k="+encodeURIComponent(k),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)})'
    + '.then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}).then(function(j){if(!j||j.ok===false)throw new Error((j&&(j.error||j.message))||"алдаа");return j})'
    + '.catch(function(x){if(btn){btn.disabled=false;btn.textContent=btn.dataset.tx}if(out)say(out,x.message,true);throw x})}'
    + 'function reload(ms){setTimeout(function(){if(window.ssRefresh)window.ssRefresh();else location.reload()},ms||500)}'
    + 'var kd=document.getElementById("l-kind"),pw=document.getElementById("l-perw");function tog(){pw.style.display=kd.value==="subscription"?"":"none"}kd.addEventListener("change",tog);tog();'
    + 'document.getElementById("l-save").addEventListener("click",function(){var b=this,amt=Number(document.getElementById("l-amt").value);if(!amt){say("out-l","Дүн оруулна уу",true);return}'
    + 'var sub=kd.value==="subscription",body={action:"ledger",kind:kd.value,vendor:document.getElementById("l-vendor").value.trim()||undefined,amount:amt,currency:document.getElementById("l-cur").value,d:document.getElementById("l-d").value||undefined,product_id:document.getElementById("l-prod").value||undefined,note:document.getElementById("l-note").value.trim()||undefined,by:"самбар"};'
    + 'if(sub){body.period_start=document.getElementById("l-ps").value||undefined;body.period_end=document.getElementById("l-pe").value||undefined;if(!body.vendor){say("out-l","Хэрэгслийн нэрээ бич (Claude, n8n…)",true);return}}'
    + 'post(body,b,"out-l").then(function(j){say("out-l","Бүртгэгдлээ · "+Number(j.amount_mnt).toLocaleString("en-US")+"₮");reload()}).catch(function(){})});'
    + 'document.querySelectorAll(".ldel").forEach(function(b){b.addEventListener("click",function(){if(!confirm("Энэ бичилтийг устгах уу?"))return;post({action:"ledgerdel",id:Number(b.dataset.id)},b,"out-l").then(function(){say("out-l","Устгагдлаа");reload()}).catch(function(){})})});'
    + 'var sS=document.getElementById("s-save");if(sS)sS.addEventListener("click",function(){var b=this,a=Number(document.getElementById("s-amt").value);if(!a&&a!==0){say("out-s","Дүн оруулна уу",true);return}post({action:"money",do:"snapshot",amount_mnt:a,d:document.getElementById("s-d").value||undefined,note:document.getElementById("s-note").value.trim()||undefined},b,"out-s").then(function(){say("out-s","Баланс шинэчлэгдлээ");reload()}).catch(function(){})});'
    + 'document.querySelectorAll(".ps").forEach(function(b){b.addEventListener("click",function(){var k=b.dataset.k,v=document.querySelector(".pv[data-k="+k+"]").value,nt=document.querySelector(".nt[data-k="+k+"]").value.trim();post({action:"money",do:"policy",key:k,value:v===""?null:Number(v),note:nt||undefined},b,"out-p").then(function(){say("out-p","Хадгалагдлаа: "+k);reload()}).catch(function(){})})});'
    + 'var iS=document.getElementById("i-save");if(iS)iS.addEventListener("click",function(){var b=this,nm=document.getElementById("i-name").value.trim(),a=Number(document.getElementById("i-amt").value);if(!nm||!a){say("out-i","Нэр, дүн хэрэгтэй",true);return}post({action:"money",do:"invest_add",kind:document.getElementById("i-kind").value,name:nm,venue:document.getElementById("i-venue").value.trim()||undefined,amount_mnt:a,expected_pct:document.getElementById("i-pct").value||undefined,d:document.getElementById("i-d").value||undefined,maturity:document.getElementById("i-mat").value||undefined,note:document.getElementById("i-note").value.trim()||undefined},b,"out-i").then(function(){say("out-i","Бүртгэгдлээ");reload()}).catch(function(){})});'
    + 'document.querySelectorAll(".hval").forEach(function(b){b.addEventListener("click",function(){var v=prompt("Одоогийн үнэ ₮ (нийт)");if(v===null||v==="")return;post({action:"money",do:"invest_update",id:Number(b.dataset.id),current_value_mnt:Number(v)},b,"out-i").then(function(){say("out-i","Шинэчлэгдлээ");reload()}).catch(function(){})})});'
    + 'document.querySelectorAll(".hcls").forEach(function(b){b.addEventListener("click",function(){var v=prompt("Хаахад буцаж орсон мөнгө ₮");if(v===null)return;post({action:"money",do:"invest_update",id:Number(b.dataset.id),status:"closed",closed_mnt:Number(v)||undefined,current_value_mnt:Number(v)||undefined},b,"out-i").then(function(){say("out-i","Хаагдлаа — балансаа шинэчлэхээ мартуузай");reload()}).catch(function(){})})});'
    + 'document.querySelectorAll(".txt").forEach(function(b){b.addEventListener("click",function(){var id=b.dataset.id,r=Array.prototype.find.call(document.querySelectorAll(".txr"),function(x){return x.dataset.id===id});post({action:"money",do:"tx_tag",id:Number(id),scope:b.dataset.s,rule:!!(r&&r.checked)},b,"out-tx").then(function(j){say("out-tx","Ангиллаа"+(j.rule_id?" · дүрэм нэмэгдэв":""));reload()}).catch(function(){})})});'
    + 'document.querySelectorAll(".amsave").forEach(function(b){b.addEventListener("click",function(){var id=b.dataset.id,v=Array.prototype.find.call(document.querySelectorAll(".am"),function(x){return x.dataset.id===id}).value;post({action:"money",do:"account",id:Number(id),manual_balance:v===""?null:Number(v)},b,null).then(function(){reload()}).catch(function(){})})});'
    + 'var mg=document.getElementById("mc-go");if(mg)mg.addEventListener("click",function(){var b=this;post({action:"money",do:"month_close",month:b.dataset.m,consumption_mnt:Number(document.getElementById("mc-cons").value)||0,note:document.getElementById("mc-note").value.trim()||undefined},b,"out-mc").then(function(j){say("out-mc","Сар хаагдлаа · зорилгод "+Number(j.goals||0).toLocaleString("en-US")+"₮");reload()}).catch(function(){})});'
    + 'document.querySelectorAll(".mreopen").forEach(function(b){b.addEventListener("click",function(){if(!confirm("Сарыг дахин нээж хуваарилалтыг устгах уу?"))return;post({action:"money",do:"month_reopen",month:b.dataset.m},b,"out-g").then(function(){reload()}).catch(function(){})})});'
    + 'document.querySelectorAll(".gsave").forEach(function(b){b.addEventListener("click",function(){var id=b.dataset.id,q=function(c){return Array.prototype.find.call(document.querySelectorAll("."+c),function(x){return x.dataset.id===id}).value};post({action:"money",do:"goal",id:Number(id),target_mnt:q("gt")===""?null:Number(q("gt")),share_pct:Number(q("gp")),horizon_months:q("gh2")===""?null:Number(q("gh2"))},b,"out-g").then(function(){say("out-g","Хадгалагдлаа");reload()}).catch(function(){})})});'
    + 'document.querySelectorAll(".gmove").forEach(function(b){b.addEventListener("click",function(){var id=b.dataset.id,fx=function(c){return Array.prototype.find.call(document.querySelectorAll("."+c),function(x){return x.dataset.id===id})},v=Number(fx("gm").value);if(!v){say("out-g","Дүн оруулна уу (− бол авсан)",true);return}post({action:"money",do:"goal_move",goal_id:Number(id),amount_mnt:v,kind:v<0?"spend":"manual",note:fx("gmn").value.trim()||undefined},b,"out-g").then(function(){say("out-g","Бичигдлээ");reload()}).catch(function(){})})});'
    + 'document.querySelectorAll(".goff").forEach(function(b){b.addEventListener("click",function(){if(!confirm("Энэ зорилгыг хаах уу? (түүх үлдэнэ)"))return;post({action:"money",do:"goal_off",id:Number(b.dataset.id)},b,"out-g").then(function(){reload()}).catch(function(){})})});'
    + 'var ga=document.getElementById("g-add");if(ga)ga.addEventListener("click",function(){var b=this,nm=document.getElementById("g-name").value.trim();if(!nm){say("out-g","Нэр хэрэгтэй",true);return}post({action:"money",do:"goal",name:nm,emoji:document.getElementById("g-emoji").value.trim()||undefined,target_mnt:document.getElementById("g-target").value||undefined,share_pct:Number(document.getElementById("g-share").value)||0,horizon_months:document.getElementById("g-h").value||undefined},b,"out-g").then(function(){say("out-g","Нэмэгдлээ");reload()}).catch(function(){})});'
    + 'document.querySelectorAll(".rsoff").forEach(function(b){b.addEventListener("click",function(){if(!confirm("Энэ сонголтыг жагсаалтаас хасах уу?"))return;post({action:"money",do:"research_off",id:Number(b.dataset.id)},b,"out-i").then(function(){reload()}).catch(function(){})})});'
    + '})();</script></body></html>');
  return out.join('');
}
