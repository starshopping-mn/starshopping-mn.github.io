/* Самбар · ЗАХИАЛГА (блок C1, 2026-10-03)
   Өгөгдөл: ?view=orders2 → orders_page(p) (шүүлт = URL query бүхэлдээ), extra districts → district_list().
   Үнэн = order_stage(): захиалга = ХАЯГТАЙ (order|confirmed|delivered|paid); утас/нэр л үлдээсэн = СОНИРХОЛ (lead).
   Эзний шийдвэр (10-03): LOSS → сонирхогчид юу ч явахгүй; WIN → бараа ирэхэд эзэн ӨӨРӨӨ залгаж
   «хаяг оруулах → батлах» эсвэл «цуцлах». Товч бүр = POST action=order → order_action v2 (SQL дотроо B1 функцүүд). */
function renderOrders(DATA, QUERY) {
  const d = DATA || {};
  const Q = QUERY || {};
  const themeQ = Q.theme === 'dark' || Q.theme === 'light' ? Q.theme : '';
  const tq = themeQ ? '&theme=' + themeQ : '';
  const A = (v) => (Array.isArray(v) ? v : []);
  const n = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v));
  const has = (v) => v !== null && v !== undefined && v !== '';
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const mnt = (v) => (has(v) ? Math.round(n(v)).toLocaleString('en-US') + '₮' : '—');
  const big = (v) => { if (!has(v)) return '—'; const x = n(v); return x >= 1e6 ? (x / 1e6).toFixed(2).replace(/\.?0+$/, '') + ' сая' : Math.round(x).toLocaleString('en-US'); };
  const dt = (s) => { if (!s) return '—'; const t = new Date(s); if (isNaN(t)) return String(s).slice(0, 10); return t.toLocaleString('en-GB', { timeZone: 'Asia/Ulaanbaatar', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ''); };
  const day = (s) => { if (!s) return '—'; const t = new Date(s); if (isNaN(t)) return String(s).slice(5, 10); return t.toLocaleString('en-GB', { timeZone: 'Asia/Ulaanbaatar', month: '2-digit', day: '2-digit' }); };
  const ago = (s) => { if (!s) return ''; const h = (Date.now() - new Date(s).getTime()) / 36e5; return h < 1 ? Math.round(h * 60) + ' мин' : h < 48 ? Math.round(h) + ' цаг' : Math.round(h / 24) + ' хоног'; };

  const C = d.counts || {}, F = d.facets || {}, FL = d.filters || {};
  const O = A(d.orders), CALL = A(d.call_list);
  const DIST = A(Array.isArray(d.districts) ? d.districts : d.districts && (d.districts.districts || d.districts.body) || []); // C1b: district_list() → {districts:[…]}
  const addressed = O.filter((r) => ['order', 'confirmed', 'delivered', 'paid'].indexOf(r.stage) >= 0);
  const leads = O.filter((r) => r.stage === 'lead');
  const others = O.filter((r) => ['cancelled', 'test', 'duplicate'].indexOf(r.stage) >= 0);
  // S8 ОРОН НУТАГ: 100% урьдчилж төлнө. Идэвхтэй = хаягтай, ачаагүй. Эдгээр нь дээд талын тусдаа блокт гарна.
  const ubDate = (ms) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Asia/Ulaanbaatar' });
  const TODAY = ubDate(Date.now()), TOMORROW = ubDate(Date.now() + 864e5);
  const WD = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
  const dLabel = (iso) => { const t = new Date(iso + 'T12:00:00+08:00'); return iso.slice(5).replace('-', '/') + ' ' + WD[t.getUTCDay()] + (iso === TODAY ? ' · ӨНӨӨДӨР (10:00-аас өмнө)' : iso === TOMORROW ? ' · маргааш' : iso === ubDate(Date.now() + 2 * 864e5) ? ' · нөгөөдөр' : ''); };
  const isAct = (r) => r.is_rural && ['order', 'confirmed'].indexOf(r.stage) >= 0 && !r.shipped_at;
  const ruralAct = O.filter(isAct);
  const rWait = ruralAct.filter((r) => !r.prepaid_at && !r.stock_ok);
  const rPay = ruralAct.filter((r) => !r.prepaid_at && r.stock_ok)
    .sort((a, b) => (b.placed_mode === 'live' ? 1 : 0) - (a.placed_mode === 'live' ? 1 : 0) || new Date(a.placed_at) - new Date(b.placed_at));
  const rShip = ruralAct.filter((r) => r.prepaid_at).sort((a, b) => new Date(a.prepaid_at) - new Date(b.prepaid_at));
  const callBtn = (r) => (has(r.phone) ? '<button class="btn go cb" data-tel="' + esc(r.phone) + '" title="Дугаарыг хуулаад залгана">📞 Залгах</button> ' : '');
  const SRC = { ad: 'зар', web: 'вэб', chat: 'чат', ig: 'IG чат', comment: 'сэтгэгдэл', fb: 'FB', bio: 'bio холбоос', organic: 'органик' };
  const STG = { lead: 'сонирхол', order: 'хаягтай', confirmed: 'баталгаажсан', delivered: 'хүргэгдсэн', paid: 'төлсөн', cancelled: 'цуцлагдсан', test: 'тест', duplicate: 'давхардал' };
  const anyFilter = ['slug', 'product_id', 'page_id', 'creative_id', 'source', 'test_id', 'stage', 'q', 'from', 'to', 'include_test'].some((k) => has(Q[k]));

  const out = [];
  // v3 (2026-10-22): хэсгүүдийг таб болгоно — буферт зурж, төгсгөлд нэг л таб харагдана. Хэсэг бүрийн агуулга хэвээр.
  const T = { main: [], dsp: [], rural: [], wait: [], lead: [], other: [] };
  let cur = out;
  const o = (s) => cur.push(s);
  o('<!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Starshopping · Захиалга</title>');
  o('<style>'
    + '.w{max-width:1240px;margin:0 auto;padding:14px 16px 60px}'
    + '.nav{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 6px}.nav a{padding:8px 14px;border-radius:999px;border:1px solid var(--ln);background:var(--s1);color:var(--ink2);text-decoration:none;font-size:13px;font-weight:600}.nav a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
    + '.kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:12px 0 10px}.kp div{background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:10px 12px}.kp b{display:block;font-size:22px;line-height:1.1}.kp span{font-size:11.5px;color:var(--mut)}.kp .warn b{color:var(--warn,#b45309)}.kp .crit b{color:var(--crit,#b91c1c)}.kp .ok b{color:#2f7d4f}.kp .info b{color:var(--blue,#1f5fb0)}'
    + '.flt{display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:10px 12px;margin:8px 0 14px}.flt select,.flt input{box-sizing:border-box;padding:6px 8px;border:1px solid var(--ln2);border-radius:8px;background:var(--bg);color:var(--ink);font:12.5px system-ui,sans-serif;max-width:100%}.flt label{font-size:12px;color:var(--mut);display:flex;gap:4px;align-items:center}.flt .sep{flex-basis:100%;height:0}'
    + 'table.ot{width:100%;table-layout:fixed;border-collapse:collapse;font-size:12.5px;background:var(--s1);border:1px solid var(--ln);border-radius:12px;overflow:hidden}table.ot th{background:var(--s2);text-align:left;padding:8px 8px;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--mut)}table.ot td{padding:8px;border-top:1px solid var(--ln3);vertical-align:top;overflow-wrap:anywhere;white-space:normal;border-bottom:0}table.ot tr.done td{color:var(--mut)}table.ot tr.call td{background:rgba(31,95,176,.07)}table.ot tr.urg td{background:rgba(220,38,38,.11)}table.ot tr.urg td:first-child{box-shadow:inset 4px 0 0 #dc2626}.rural{border:1px solid rgba(180,83,9,.35);border-radius:14px;padding:6px 12px 12px;margin:14px 0 18px;background:rgba(180,83,9,.04)}.rural h3{font-size:13.5px;margin:12px 0 6px}'
    + '.pill{display:inline-block;max-width:100%;white-space:normal;padding:2px 7px;border-radius:999px;font-size:11px;font-weight:600;background:var(--s2);color:var(--ink2);margin:1px 2px 1px 0}.pill.ok{background:rgba(34,197,94,.16);color:#2e9a5a}.pill.warn{background:rgba(245,158,11,.18);color:#c27a06}.pill.crit{background:rgba(239,68,68,.16);color:#d64b4b}.pill.info{background:rgba(59,130,246,.16);color:#4f8ddc}.pill.gold{background:var(--gold-a);color:var(--gold)}'
    + '.btn{padding:5px 9px;border:1px solid var(--ln2);border-radius:8px;background:var(--s1);color:var(--ink);font:600 12px system-ui,sans-serif;cursor:pointer;margin:1px 2px 1px 0}.btn.go{background:var(--ink);color:var(--bg);border-color:var(--ink)}.btn.stop{color:#d64b4b;border-color:rgba(239,68,68,.45)}.btn:disabled{opacity:.5;cursor:default}'
    + '.tw{overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:12px}td.acts{white-space:normal}@media(max-width:820px){table.ot{table-layout:auto;min-width:900px}}'
    + '.frm{display:none;margin-top:6px;padding:8px;background:var(--s2);border-radius:8px}.frm.on{display:block}.frm input,.frm select{box-sizing:border-box;padding:6px 8px;border:1px solid var(--ln2);border-radius:6px;background:var(--bg);color:var(--ink);font:13px system-ui,sans-serif;margin:2px 4px 2px 0;max-width:100%}.frm .sug{margin-top:4px}.frm .sug button{margin:2px}'
    + '.dlv{display:block;margin-top:5px;font-size:11.5px;color:var(--mut)}.dlv input{box-sizing:border-box;padding:3px 5px;border:1px solid var(--ln2);border-radius:6px;background:var(--bg);color:var(--ink);font:12px system-ui,sans-serif;max-width:100%}.dlv.set{color:#2e9a5a;font-weight:600}.gxbar{margin:6px 0 14px;padding:8px 12px;border:1px dashed var(--ln2);border-radius:10px;font-size:12.5px}.gxbar table{margin-top:8px;font-size:12px;border-collapse:collapse;width:100%}.gxbar td,.gxbar th{border-top:1px solid var(--ln3);padding:4px 6px;text-align:left}.dsp{border:1px solid rgba(34,197,94,.35);border-radius:14px;padding:6px 12px 12px;margin:14px 0 18px;background:rgba(34,197,94,.04)}.dsp h3{font-size:13.5px;margin:12px 0 6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}tr.tch td{background:rgba(34,197,94,.10)!important}tr.tch td:first-child{box-shadow:inset 5px 0 0 #22c55e}tr.tlast td{background:rgba(34,197,94,.24)!important}tr.tlast td:first-child{box-shadow:inset 8px 0 0 #16a34a}.tchb{font-size:11px;padding:2px 7px;margin-top:4px}tr.tch .tchb{background:#16a34a;color:#fff;border-color:#16a34a}.tlastb{display:inline-block;margin-top:3px;padding:1px 6px;border-radius:999px;background:#16a34a;color:#fff;font-size:10.5px;font-weight:700}.tchbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12px;color:var(--mut);margin:4px 0 8px}td.stk{font-size:11.5px;line-height:1.45}td.stk .ok{color:#2e9a5a;font-weight:700}td.stk .no{color:#d64b4b;font-weight:700}td.stk .sg{display:block;margin-top:3px;color:var(--mut)}td.stk .sg b{color:var(--ink2);font-weight:600}.frm.sku select{min-width:180px}'
    + '.out{display:none;margin:6px 0;font-size:12.5px}.out.on{display:block}.mut{color:var(--mut)}.sm{font-size:11.5px}'
    + 'h2{font-size:15px;margin:22px 0 8px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}h2 .cnt{font-size:12px;color:var(--mut);font-weight:500}'
    + 'details.more{margin-top:4px}details.more summary{cursor:pointer;font-size:11.5px;color:var(--mut)}details.more div{font-size:11.5px;color:var(--ink2);margin-top:3px}'
    + '.callbox{background:rgba(31,95,176,.08);border:1px solid rgba(31,95,176,.35);border-radius:12px;padding:10px 12px;margin:8px 0 12px;font-size:13px}.callbox b{display:block;margin-bottom:4px}'
    + 'footer{margin:26px 0 10px;font-size:12px;color:var(--mut)}'
    /* v3 (2026-10-22): тоо = холбоос, шүүлт хураангуй, табууд, нэг гол товч + ⋯ цэс, хаяг 2 мөр */
    + '.kp a{display:block;color:inherit;text-decoration:none;transition:border-color .15s}.kp a:hover{border-color:var(--ln2)}.kp a.on{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}'
    + '.fbox{margin:8px 0 12px}.fbox>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.fbox>summary::-webkit-details-marker{display:none}.fbox .chips{display:inline-flex;gap:4px;flex-wrap:wrap;align-items:center}.fbox[open] .flt{margin-top:8px}'
    + '.otabs{display:flex;gap:4px;flex-wrap:wrap;margin:12px 0 10px;padding:4px;background:var(--s2);border-radius:12px}.otb{flex:1 1 auto;min-width:120px;padding:9px 12px;border:0;border-radius:9px;background:transparent;color:var(--ink2);font:600 13px system-ui,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px}.otb b{font-size:14px;color:var(--ink)}.otb .sm{font-weight:500;color:var(--mut)}.otb.on{background:var(--s1);color:var(--ink);box-shadow:0 1px 4px rgba(0,0,0,.08)}.otb[data-urg] b{color:#d64b4b}'
    + '.pane{display:none}.pane.on{display:block}'
    + '.menu{display:inline-block;vertical-align:top}.menu>summary{list-style:none;display:inline-block;padding:5px 9px}.menu>summary::-webkit-details-marker{display:none}.menu .mi{display:flex;flex-wrap:wrap;gap:2px;margin-top:4px;padding:5px;background:var(--s2);border-radius:8px}'
    + '.adr{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;cursor:pointer}.adr.open{display:block;-webkit-line-clamp:unset}'
    + '@media(max-width:620px){.otb{min-width:46%}}'
    + '</style></head><body><div class="w">');

  // ── толгой + навигаци (C0: Нүүр·Тест / Захиалга / Мөнгө / Нөөц·PO / Судалгаа)
  o('<header><div class="hd"><div class="bm">S</div><div><div class="bt">Starshopping</div>');
  o('<div class="bs">захиалга · ' + esc(String(d.generated_at || '').replace('T', ' ').slice(0, 16)) + ' UTC</div></div>');
  o('<div class="sp"></div><a class="rf" href="">Шинэчлэх</a></div></header>');
  o(ssNav('orders', themeQ));

  // ── тоонууд (шүүсэн олонлог)
  // v3: тоо бүр шүүлтүүр — дарвал тэр захиалгууд (URL дээр үлдэнэ). Идэвхтэй нь тодорно.
  const kpLink = (stage, tab) => { const ps = new URLSearchParams(); Object.keys(Q).forEach((k) => { if (k !== 'stage' && k !== 'tab' && k !== 'view' && Q[k] !== '') ps.set(k, Q[k]); }); ps.set('view', 'orders'); if (stage) ps.set('stage', stage); if (tab) ps.set('tab', tab); return '/board/?' + ps.toString().replace(/&/g, '&amp;'); };
  const kpTile = (cls, v, label, stage, tab) => '<a class="' + cls + (Q.stage === stage && stage ? ' on' : '') + '" href="' + kpLink(stage, tab) + '"><b>' + v + '</b><span>' + label + '</span></a>';
  o('<div class="kp">'
    + kpTile('ok', n(C.addressed), 'хаягтай захиалга · ' + big(C.amount_addressed) + '₮', 'addressed', 'main')
    + kpTile(n(C.lead) ? 'warn' : '', n(C.lead), 'сонирхол (утас/нэр л)', 'lead', 'lead')
    + kpTile('', n(C.confirmed), 'баталгаажсан', 'confirmed', 'main')
    + kpTile('info', n(C.paid), 'төлсөн · ' + big(C.amount_paid) + '₮', 'paid', 'main')
    + kpTile(n(C.cancelled) ? 'crit' : '', n(C.cancelled), 'цуцлагдсан', 'cancelled', 'other')
    + (n(C.call_ready) ? kpTile('info', n(C.call_ready), 'залгах (WIN/амьд бараа)', 'lead', 'lead') : '')
    + '</div>');

  // ── шүүлт (GET маягт — URL дээр үлдэнэ, хуваалцаж болно)
  const sel = (name, label, items, val, lab) => {
    let h = '<label>' + label + ' <select name="' + name + '"><option value="">бүгд</option>';
    items.forEach((it) => { const v = it.v, t = it.t; h += '<option value="' + esc(v) + '"' + (String(val || '') === String(v) ? ' selected' : '') + '>' + esc(t) + '</option>'; });
    return h + '</select></label>';
  };
  // v3: шүүлт хураангуй хэлбэрт — идэвхтэй шүүлт байвал нээлттэй, нэрс нь гарчигт.
  const FLBL = { slug: 'бараа', page_id: 'page', creative_id: 'AD', source: 'эх үүсвэр', test_id: 'тест', stage: 'шат', q: 'хайлт', from: 'эхлэх', to: 'дуусах', include_test: 'тест харуулах' };
  const actF = Object.keys(FLBL).filter((k) => has(Q[k])).map((k) => FLBL[k] + ': ' + (k === 'stage' ? (STG[Q[k]] || Q[k]) : Q[k]));
  o('<details class="fbox" data-keep="flt"' + (anyFilter ? ' open' : '') + '><summary><span class="btn">⚙ Шүүлт' + (actF.length ? ' <b>' + actF.length + '</b>' : '') + '</span>' + (actF.length ? '<span class="chips">' + actF.map((x) => '<span class="pill gold">' + esc(x) + '</span>').join('') + '<a class="btn" href="/board/?view=orders' + tq + '" style="text-decoration:none">Цэвэрлэх</a></span>' : '<span class="sm mut">бараа · page · AD · эх үүсвэр · тест · шат · огноо · хайлт</span>') + '</summary>');
  o('<form class="flt" method="get" action="/board/"><input type="hidden" name="view" value="orders">' + (themeQ ? '<input type="hidden" name="theme" value="' + themeQ + '">' : ''));
  o(sel('slug', 'Бараа', A(F.products).map((p) => ({ v: p.slug, t: String(p.name || p.slug).split(' · ')[0] + ' (' + n(p.n) + ')' })), Q.slug));
  o(sel('page_id', 'Page', A(F.pages).map((p) => ({ v: p.page_id, t: p.name + ' (' + n(p.n) + ')' })), Q.page_id));
  o(sel('creative_id', 'AD', A(F.ads).map((a) => ({ v: a.creative_id, t: a.creative_id + ' (' + n(a.n) + ')' })), Q.creative_id));
  o(sel('source', 'Эх үүсвэр', A(F.sources).map((s) => ({ v: s.source, t: (SRC[s.source] || s.source) + ' (' + n(s.n) + ')' })), Q.source));
  o(sel('test_id', 'Тест', A(F.tests).map((t) => ({ v: t.test_id, t: '#' + t.test_id + ' ' + String(t.name || '').slice(0, 24) + (t.result ? ' · ' + t.result.toUpperCase() : '') + ' (' + n(t.n) + ')' })), Q.test_id));
  o(sel('stage', 'Шат', [{ v: 'addressed', t: 'хаягтай (бүгд)' }].concat(['lead', 'order', 'confirmed', 'delivered', 'paid', 'cancelled'].map((s) => ({ v: s, t: STG[s] + (F.stages && has(F.stages[s]) ? ' (' + n(F.stages[s]) + ')' : '') }))), Q.stage));
  o('<label>Огноо <input type="date" name="from" value="' + esc(Q.from || '') + '"> – <input type="date" name="to" value="' + esc(Q.to || '') + '"></label>');
  o('<label>Хайх <input name="q" value="' + esc(Q.q || '') + '" placeholder="утас / нэр / хаяг" size="16"></label>');
  o('<label><input type="checkbox" name="include_test" value="true"' + (Q.include_test === 'true' ? ' checked' : '') + '> тест харуулах</label>');
  o('<button class="btn go">Шүүх</button>' + (anyFilter ? ' <a class="btn" href="/board/?view=orders' + tq + '" style="text-decoration:none">Цэвэрлэх</a>' : '') + '<span class="sm mut" style="margin-left:auto">сүүлийн ' + n(FL.days || 60) + ' хоног' + (Q.from || Q.to ? ' (огноогоор)' : '') + '</span></form></details>');
  o('<div class="out" id="out-o"></div>');

  // ── мөрийн туслахууд
  const srcCell = (r) => {
    const bits = [];
    bits.push('<span class="pill ' + (r.source === 'ad' ? 'gold' : '') + '">' + esc(SRC[r.source] || r.source || '—') + '</span>');
    if (r.creative_id) bits.push('<span class="sm mut">' + esc(r.creative_id) + '</span>');
    else if (r.page_name) bits.push('<span class="sm mut">' + esc(r.page_name) + '</span>');
    return bits.join('<br>');
  };
  const more = (r) => '<details class="more" data-keep="m-' + esc(r.order_id) + '"><summary>дэлгэрэнгүй</summary><div>'
    + 'page: ' + esc(r.page_name || r.page_id || '—') + ' · суваг: ' + esc(r.channel || '—') + (r.test_id ? ' · тест #' + esc(r.test_id) + (r.test_result ? ' (' + esc(r.test_result) + ')' : '') : '') + (r.conv_ref ? ' · ref: ' + esc(r.conv_ref) : '')
    + (r.confirm_note ? '<br>тэмдэглэл: ' + esc(r.confirm_note) : '') + (r.review_reason ? '<br>⚑ ' + esc(r.review_reason) : '') + (r.cancel_reason ? '<br>цуцалсан: ' + esc(r.cancel_reason) : '')
    + '<br><span class="mut">' + esc(r.order_id) + '</span></div></details>';
  const addrForm = (r) => {
    let h = '<div class="frm" id="f-' + esc(r.order_id) + '">';
    if (DIST.length) {
      h += '<select id="d-' + esc(r.order_id) + '"><option value="">— дүүрэг / хороо —</option>';
      DIST.forEach((x) => { h += '<option value="' + esc(x) + '"' + (x === r.district ? ' selected' : '') + '>' + esc(x) + '</option>'; });
      h += '</select> ';
    } else h += '<input list="dl-d" id="d-' + esc(r.order_id) + '" placeholder="Дүүрэг N-р хороо" value="' + esc(r.district || '') + '" size="22"> ';
    h += '<input id="a-' + esc(r.order_id) + '" placeholder="Байр, орц, тоот" value="' + esc(r.has_address ? (r.address || '') : '') + '" size="24"> '
      + '<input id="n-' + esc(r.order_id) + '" placeholder="тэмдэглэл (сонголттой)" size="16"> '
      + '<button class="btn go osave" data-id="' + esc(r.order_id) + '">Хадгалах → батлах</button><div class="sug" id="s-' + esc(r.order_id) + '"></div></div>';
    return h;
  };
  const row = (r, kind) => {
    const st = [];
    if (r.stage === 'paid') st.push('<span class="pill ok">төлсөн ' + mnt(r.paid_mnt) + ' · ' + day(r.paid_at) + '</span>');
    else if (r.stage === 'delivered') st.push('<span class="pill ok">хүргэгдсэн ' + day(r.delivered_at) + '</span><span class="pill warn">төлбөр бүртгээгүй</span>');
    else if (r.stage === 'cancelled') st.push('<span class="pill crit">цуцлагдсан' + (r.cancelled_at ? ' ' + day(r.cancelled_at) : '') + '</span>');
    else if (r.stage === 'test') st.push('<span class="pill">тест</span>');
    else if (r.stage === 'lead') {
      st.push(r.call_ready ? '<span class="pill info">📞 залгах</span>' : '<span class="pill">хүлээж байна</span>');
      if (r.test_result === 'loss') st.push('<span class="pill crit">LOSS бараа</span>');
    } else {
      st.push(r.stage === 'confirmed' ? '<span class="pill ok">баталгаажсан</span>' : '<span class="pill warn">батлаагүй</span>');
      if (r.shipped_at) st.push('<span class="pill info">ачсан ' + day(r.shipped_at) + '</span>');
      else if (r.stock_ready_at) st.push('<span class="pill info">бараа бэлэн</span>');
      else st.push('<span class="pill">' + (r.mode === 'live' ? 'нөөцөөс' : 'бараа ирээгүй') + '</span>');
      if (r.gyals_listed_at) st.push('<span class="pill">Gyals ' + day(r.gyals_listed_at) + '</span>');
      if (r.prepaid_at) st.push('<span class="pill ok">урьдчилж төлсөн ' + day(r.prepaid_at) + '</span>');
      if (r.deliver_sms_at) st.push('<span class="pill info">💬 SMS ' + dt(r.deliver_sms_at) + '</span>');
    }
    // M6: хүргэх өдөр (хоосон = маргааш). Зөвхөн УБ, хаягтай, ачаагүй.
    if (['order', 'confirmed'].indexOf(r.stage) >= 0 && !r.shipped_at && !r.is_rural) {
      st.push('<label class="dlv' + (r.deliver_on ? ' set' : '') + '">📅 хүргэх: <input type="date" class="dlvi" data-id="' + esc(r.order_id) + '" value="' + esc(r.deliver_on || '') + '" min="' + TODAY + '" title="Хоосон = маргааш. Өөр өдөр авна гэвэл сонго."></label>' + (r.deliver_on ? '' : '<span class="sm mut">хоосон = маргааш</span>'));
    }
    if (r.needs_review && r.review_reason) st.push('<span class="pill warn" title="' + esc(r.review_reason) + '">⚑ ' + esc(String(r.review_reason).slice(0, 26)) + '</span>');
    const addr = r.has_address
      ? esc(r.district || '') + (r.address ? '<br><span class="sm mut">' + esc(r.address) + '</span>' : '')
      : '<span class="pill crit">хаяггүй</span>' + (r.address ? '<br><span class="sm mut">' + esc(r.address) + '</span>' : '');
    const cls = (kind === 'other' ? 'done' : '') + (r.stage === 'lead' && r.call_ready ? ' call' : '');
    let h = '<tr class="' + cls + '" data-keep="o-' + esc(r.order_id) + '"><td>' + dt(r.placed_at) + '<br><span class="sm mut">' + esc(ago(r.placed_at)) + '</span></td>'
      + '<td>' + srcCell(r) + '</td>'
      + '<td><b>' + esc(r.customer || '—') + '</b><br><a href="tel:' + esc(r.phone) + '">' + esc(r.phone || '') + '</a>' + (kind === 'other' ? '' : '<br><button class="btn tchb" title="Залгасан/ярьсан гэж тэмдэглэх (зөвхөн энэ төхөөрөмжид)">☐ залгасан</button>') + '</td>'
      + '<td>' + esc(String(r.product || '').split(' · ')[0]) + (r.variant ? ' <b>' + esc(r.variant) + '</b>' : '') + (n(r.qty) > 1 ? ' ×' + n(r.qty) : '') + '<br><span class="sm mut">' + mnt(r.amount_mnt) + '</span></td>'
      + stkCell(r)
      + '<td><div class="adr" title="Дарвал бүтнээр">' + addr + '</div></td><td>' + st.join('') + more(r) + '</td><td class="acts">';
    const id = esc(r.order_id);
    // v3 (2026-10-22): мөр бүрт НЭГ гол товч (дараагийн алхам) + «⋯» цэсэнд бусад нь. Товчнууд, үйлдлүүд хэвээр — зөвхөн байрлал.
    const menu = (items) => (items.length ? '<details class="menu" data-keep="mn-' + id + '"><summary class="btn mb" title="Бусад үйлдэл">⋯</summary><div class="mi">' + items.join('') + '</div></details>' : '');
    if (kind === 'lead') {
      h += callBtn(r) + '<button class="btn go oa" data-id="' + id + '" data-do="addr">Хаяг оруулах</button>'
        + menu(['<button class="btn stop oa" data-id="' + id + '" data-do="cancel" title="Авахгүй гэвэл">Цуцлах</button>', skuBtn(r)]) + addrForm(r);
    } else if (kind === 'addressed') {
      const live = ['order', 'confirmed'].indexOf(r.stage) >= 0;
      const bShip = '<button class="btn oa" data-id="' + id + '" data-do="shipped" title="Гялс/хүргэгчид өгсөн">Ачсан</button>';
      const bSms = '<button class="btn oa" data-id="' + id + '" data-do="deliver_sms" title="Утас холбогдоогүй бол: хаяг + «маргааш хүргэнэ, авах бол Тийм гэж хариу бич» SMS (M5)">💬 ' + (r.deliver_sms_at ? 'SMS дахин' : 'Хүргэлтийн SMS') + '</button>';
      const bPaid = '<button class="btn oa" data-id="' + id + '" data-do="paid" title="Хүргэгдэж төлбөр авсан (COD)">' + (r.prepaid_at ? 'Хүлээн авсан' : 'Төлсөн') + '</button>';
      const rest = [];
      if (r.stage === 'order') {
        h += '<button class="btn go oa" data-id="' + id + '" data-do="confirm" title="Утсаар ярьж баталгаажуулсан">Батлах</button>';
        if (!r.shipped_at && !r.is_rural) rest.push(bSms);
        if (!r.shipped_at) rest.push(bShip);
        rest.push(bPaid);
      } else if (r.stage === 'confirmed') {
        if (!r.shipped_at) { h += bShip.replace('class="btn oa"', 'class="btn go oa"'); if (!r.is_rural) rest.push(bSms); rest.push(bPaid); }
        else h += bPaid.replace('class="btn oa"', 'class="btn go oa"');
      } else if (r.stage === 'delivered') {
        h += '<button class="btn go oa" data-id="' + id + '" data-do="paid">Төлбөр бүртгэх</button>';
      }
      if (['order', 'confirmed', 'delivered'].indexOf(r.stage) >= 0) rest.push('<button class="btn oa" data-id="' + id + '" data-do="addr">Хаяг засах</button>', skuBtn(r), '<button class="btn stop oa" data-id="' + id + '" data-do="cancel">Цуцлах</button>');
      h += menu(rest.filter(Boolean)) + addrForm(r);
    }
    return h + '</td></tr>';
  };
  // M4 (2026-10-19): «Нөөц» багана — тухайн хувилбарын сул үлдэгдэл + өөр сонголт (stock_public-аас хуудсан дээр бөглөнө)
  const canSwap = (r) => has(r.slug) && (r.stage === 'lead' || (['order', 'confirmed'].indexOf(r.stage) >= 0 && !r.shipped_at));
  const stkCell = (r) => canSwap(r)
    ? '<td class="stk" data-slug="' + esc(r.slug) + '" data-var="' + esc(r.variant || '') + '" data-al="' + ((r.stock_ready_at || r.stock_ok) ? 1 : 0) + '" data-qty="' + (n(r.qty) || 1) + '" data-lead="' + (r.stage === 'lead' ? 1 : 0) + '"><span class="mut">…</span></td>'
    : '<td class="stk"><span class="mut">—</span></td>';
  const skuBtn = (r) => (canSwap(r) ? '<button class="btn osku" data-id="' + esc(r.order_id) + '" data-slug="' + esc(r.slug) + '" data-var="' + esc(r.variant || '') + '" title="Өнгө/размерыг солих (мэдэгдэл явахгүй)">🔁 Бараа солих</button><div class="frm sku" id="k-' + esc(r.order_id) + '"></div>' : '');
  const table = (rows, kind, empty) => {
    o('<div class="tw"><table class="ot"><colgroup><col style="width:7%"><col style="width:9%"><col style="width:12%"><col style="width:14%"><col style="width:12%"><col style="width:15%"><col style="width:13%"><col style="width:18%"></colgroup><thead><tr><th>Огноо</th><th>Эх үүсвэр</th><th>Хэн</th><th>Бараа</th><th>Нөөц</th><th>Хаяг</th><th>Төлөв</th><th>Үйлдэл</th></tr></thead><tbody>');
    rows.forEach((r) => o(row(r, kind)));
    if (!rows.length) o('<tr><td colspan="8" class="mut">' + empty + '</td></tr>');
    o('</tbody></table></div>');
  };

  // ── 0 · ОРОН НУТАГ (S8, 2026-10-08): утсаар хаяг → «шилжүүлээрэй» → SMS → мөнгө орсон → Gyals-д өгөх
  const rRow = (r, mode) => {
    const id = esc(r.order_id);
    const urgent = mode === 'pay' && r.placed_mode === 'live';
    const prod = esc(String(r.product || '').split(' · ')[0]) + (r.variant ? ' <b>' + esc(r.variant) + '</b>' : '') + (n(r.qty) > 1 ? ' ×' + n(r.qty) : '') + '<br><span class="sm mut">' + mnt(r.amount_mnt) + '</span>';
    const where = '<b>' + esc(String(r.district || '').replace(/^Орон нутаг\s*/, '')) + '</b>' + (r.address ? '<br><span class="sm mut">' + esc(r.address) + '</span>' : '<br><span class="pill crit">хаяг дутуу</span>');
    const who = '<b>' + esc(r.customer || '—') + '</b><br><a href="tel:' + esc(r.phone) + '">' + esc(r.phone || '') + '</a><br><button class="btn tchb" title="Залгасан/ярьсан гэж тэмдэглэх">☐ залгасан</button>';
    let st = '', acts = '';
    if (mode === 'pay') {
      st = (urgent ? '<span class="pill crit">🔴 яаралтай залга</span>' : '<span class="pill info">📞 залгах</span>')
        + (r.pay_requested_at ? '<span class="pill ok">SMS явсан ' + dt(r.pay_requested_at) + '</span>' : '<span class="pill">SMS явуулаагүй</span>');
      acts = callBtn(r)
        + '<button class="btn go oa" data-id="' + id + '" data-do="prepay_sms" title="Энэ хүнд зориулсан төлбөрийн SMS (данс, дүн, утга)">💬 ' + (r.pay_requested_at ? 'SMS дахин' : 'Төлбөрийн SMS') + '</button> '
        + '<button class="btn go oa" data-id="' + id + '" data-do="prepaid" title="Мөнгө данс руу орсон">✓ Мөнгө орсон</button> '
        + '<button class="btn oa" data-id="' + id + '" data-do="addr">Хаяг засах</button> <button class="btn stop oa" data-id="' + id + '" data-do="cancel">Цуцлах</button>' + addrForm(r);
    } else if (mode === 'ship') {
      st = '<span class="pill ok">төлсөн ' + mnt(r.prepaid_mnt) + ' · ' + dt(r.prepaid_at) + '</span>';
      acts = '<button class="btn go oa" data-id="' + id + '" data-do="shipped" title="Gyals/унаанд өгсөн">Gyals-д өглөө</button> '
        + '<button class="btn oa" data-id="' + id + '" data-do="prepaid_undo" title="Андуурч дарсан бол">↩ мөнгө орсонгүй</button> '
        + '<button class="btn oa" data-id="' + id + '" data-do="addr">Хаяг засах</button>' + addrForm(r);
    } else {
      st = '<span class="pill">бараа ирээгүй</span>';
      acts = '<span class="sm mut">Бараа ирмэгц «залгах» жагсаалтад орно</span>';
    }
    return '<tr class="' + (urgent ? 'urg' : '') + '" data-keep="r-' + id + '"><td>' + dt(mode === 'ship' ? r.prepaid_at : r.placed_at) + '<br><span class="sm mut">' + esc(ago(mode === 'ship' ? r.prepaid_at : r.placed_at)) + '</span></td>'
      + '<td>' + who + '</td><td>' + prod + '</td><td>' + where + '</td><td>' + st + '</td><td class="acts">' + acts + '</td></tr>';
  };
  const rTable = (rows, mode) => {
    o('<div class="tw"><table class="ot"><colgroup><col style="width:8%"><col style="width:14%"><col style="width:18%"><col style="width:20%"><col style="width:16%"><col style="width:24%"></colgroup><thead><tr><th>' + (mode === 'ship' ? 'Төлсөн' : 'Огноо') + '</th><th>Хэн</th><th>Бараа · дүн</th><th>Аймаг · хаяг</th><th>Төлөв</th><th>Үйлдэл</th></tr></thead><tbody>');
    rows.forEach((r) => o(rRow(r, mode)));
    o('</tbody></table></div>');
  };
  cur = T.rural;
  if (ruralAct.length) {
    o('<div class="rural"><h2 style="margin-top:10px">🚚 Орон нутаг — 100% урьдчилж төлнө <span class="cnt">' + ruralAct.length + '</span></h2>');
    o('<p class="sm mut">Бараа ирмэгц залгаж хаяг авна → «шилжүүлээрэй» гэж ярина → <b>💬 Төлбөрийн SMS</b> → мөнгө орвол <b>✓ Мөнгө орсон</b> → доорх «Gyals-д өгөх» жагсаалтад орно. Төлөөгүйг унаанд тавихгүй.</p>');
    if (rPay.length) {
      const nu = rPay.filter((r) => r.placed_mode === 'live').length;
      o('<h3>📞 Залгаж, төлбөр авах <span class="cnt">' + rPay.length + '</span>' + (nu ? ' <span class="pill crit">🔴 ' + nu + ' яаралтай — бэлэн бараатай захиалсан</span>' : '') + '</h3>');
      rTable(rPay, 'pay');
    }
    if (rShip.length) {
      const tsv = rShip.map((r) => [r.phone, r.customer, String(r.district || '').replace(/^Орон нутаг\s*/, ''), r.address, String(r.product || '').split(' · ')[0] + (r.variant ? ' ' + r.variant : '') + (n(r.qty) > 1 ? ' x' + n(r.qty) : '')].map((x) => String(x == null ? '' : x).replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\n');
      o('<h3>📦 Мөнгө орсон — Gyals-д өгөх <span class="sm mut">(Түгээлт табд ч харагдана)</span> <span class="cnt">' + rShip.length + ' · ' + big(rShip.reduce((s, r) => s + n(r.prepaid_mnt), 0)) + '₮</span> <button class="btn go cp" data-n="' + rShip.length + '" data-tsv="' + esc(tsv).replace(/\n/g, '&#10;').replace(/\t/g, '&#9;') + '">📋 Жагсаалт хуулах</button></h3>');
      rTable(rShip, 'ship');
    }
    if (rWait.length) {
      o('<h3>⏳ Бараа ирэхийг хүлээж буй <span class="cnt">' + rWait.length + '</span></h3>');
      rTable(rWait, 'wait');
    }
    o('</div>');
  }

  // ── 1 · Хаягтай захиалга
  // M5b (2026-10-19): «Хүргэлтийн SMS» явуулсан, батлаагүй → «Хүлээлэг» хэсэгт. «Батлах» дарвал эндээс гарна.
  const isWait = (r) => !!r.deliver_sms_at && r.stage === 'order' && !r.shipped_at;
  const addrMain = addressed.filter((r) => !isAct(r) && !isWait(r));
  const addrWait = addressed.filter((r) => !isAct(r) && isWait(r)).sort((a, b) => new Date(a.deliver_sms_at) - new Date(b.deliver_sms_at));
  // M11 (2026-10-20): 📦 НӨӨЦ ЗАХИАЛГА — чатаар дууссан хувилбарыг ~10–14 хоногт захиалсан. Хувилбараар бүлэглэнэ (1688-д захиалах тоо).
  // Бараа ирж хүлээн авмагц stock_reallocate оноож (stock_ok) — тэгэхэд л түгээлтэд орно.
  const isBO = (r) => /нөөц захиалга/i.test(String(r.review_reason || '')) && ['lead', 'order', 'confirmed'].indexOf(r.stage) >= 0 && !r.shipped_at && !(r.stock_ready_at || r.stock_ok);
  const bo = O.filter(isBO);
  cur = T.dsp;
  if (bo.length) {
    const BG = {};
    bo.forEach((r) => { const k = String(r.product || '').split(' · ')[0] + (r.variant ? ' · ' + r.variant : ''); (BG[k] = BG[k] || []).push(r); });
    o('<div class="dsp"><h2 style="margin-top:10px">📦 Нөөц захиалга — бараа авчрах <span class="cnt">' + bo.length + ' захиалга · ' + bo.reduce((s, r) => s + (n(r.qty) || 1), 0) + 'ш</span></h2>');
    o('<p class="sm mut">Чатаар дууссан хувилбарыг «ойролцоогоор 10–14 хоногт» гэж захиалсан. 1688-д захиалах тоо = «Ширхэг». Бараа ирж хүлээн авмагц систем автоматаар оноож, түгээлтэд оруулна.</p>');
    o('<div class="tw"><table class="ot"><thead><tr><th>Хувилбар</th><th>Ширхэг</th><th>Хэн · хэзээ</th></tr></thead><tbody>');
    Object.keys(BG).sort().forEach((k) => {
      const rows = BG[k].slice().sort((a, b) => new Date(a.placed_at) - new Date(b.placed_at));
      o('<tr data-keep="bo-' + esc(k) + '"><td><b>' + esc(k) + '</b></td><td>' + rows.reduce((s, r) => s + (n(r.qty) || 1), 0) + '</td><td>'
        + rows.map((r) => esc(r.customer || '—') + ' <a href="tel:' + esc(r.phone) + '">' + esc(r.phone || '') + '</a> <span class="sm mut">' + esc(ago(r.placed_at)) + '</span>').join('<br>') + '</td></tr>');
    });
    o('</tbody></table></div></div>');
  }
  // M6 · 📦 ТҮГЭЭЛТ: баталгаажсан, УБ, ачаагүй → хүргэх өдрөөр (хоосон/өнгөрсөн = маргааш). Gyals-д хуулах.
  // M7: эзэн баталсан ЭСВЭЛ нөөцтэй (live) бараа хаягтай захиалсан → дуудлагагүйгээр түгээлтэд. deliver_on-г DB тавина (өгсөн өдөр + 1).
  // M12 (2026-10-22, эзэн): орон нутгийн ТӨЛСӨН захиалга (rShip) мөн түгээлтэд — маргааш Gyals-д өгөх жагсаалт нэг газар. Төлөөгүй орон нутаг орохгүй.
  const dspUb = addressed.filter((r) => !isAct(r) && !r.is_rural && !r.shipped_at && (r.stage === 'confirmed' || (r.stage === 'order' && r.placed_mode === 'live')) && !isBO(r));
  const dsp = dspUb.concat(rShip);
  const dspOk = (r) => !!(r.stock_ready_at || r.stock_ok || (r.is_rural && r.prepaid_at));
  // M9 (2026-10-20): Gyals Excel (татах) + Gyals тайлан (оруулах) — өгөгдлийг клиент скрипт рүү дамжуулна
  const gxRow = (r) => ({ id: r.order_id, customer: r.customer || '', phone: r.phone || '', district: String(r.district || '').replace(/^Орон нутаг\s*/, ''), address: r.address || '',
    product: String(r.product || '').split(' · ')[0], variant: r.variant || '', qty: n(r.qty) || 1, amount: Math.round(n(r.amount_mnt)), note: r.confirm_note || '',
    rural: !!r.is_rural, prepaid: Math.round(n(r.prepaid_mnt)), paid: !!(r.is_rural && r.prepaid_at) });
  const GX = { groups: {}, codes: {} };
  O.forEach((r) => { if (r.order_id) GX.codes[String(r.order_id).slice(0, 8)] = { id: r.order_id, name: r.customer || '', phone: r.phone || '', stage: r.stage }; });
  // M13 (2026-10-24, эзэн): ТҮГЭЭЛТ = 3 алхам. ① Өдрийн жагсаалт → «Хуулах + Gyals-д өгсөн» (do=shipped) → мөр жагсаалтаас гарна, дахин явахгүй.
  // ② 🚚 Gyals дээр (shipped, төлбөргүй) → «Хүргэгдсэн / Хойшилсон / Буцсан» (do=gyals). ③ Хүргэх өдөр өнгөрсөн, өгсөн гэж тэмдэглээгүй мөрийг
  // өнөөдрийнх рүү чимээгүй чихэхгүй — «Өгсөн үү?» гэж тусад нь асууна (10/23-нд өгсөн 5 захиалга 10/24-ний жагсаалтад дахин орсон алдааны засвар).
  const onGyals = O.filter((r) => r.shipped_at && ['order', 'confirmed', 'delivered'].indexOf(r.stage) >= 0)
    .sort((a, b) => new Date(a.shipped_at) - new Date(b.shipped_at));
  const rowsTsv = (rows) => rows.map((r) => [r.phone, r.customer, r.district, r.address, String(r.product || '').split(' · ')[0] + (r.variant ? ' ' + r.variant : '') + (n(r.qty) > 1 ? ' x' + n(r.qty) : ''), r.is_rural && r.prepaid_at ? '0 (ТӨЛСӨН)' : Math.round(n(r.amount_mnt))].map((x) => String(x == null ? '' : x).replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\n');
  const attr = (s) => esc(s).replace(/\n/g, '&#10;').replace(/\t/g, '&#9;');
  // 10/24 (эзэн): хуулах текст = Gyals-д шууд paste хийх уншигдахуйц жагсаалт (УБ бэлнээр · УБ төлсөн · орон нутаг төлсөн, дугаарласан, нийт дүнтэй).
  const gyalsText = (k, rows) => {
    const paidR = (r) => !!r.prepaid_at;
    const secs = [
      ['— УЛААНБААТАР (бараагаа авахдаа төлнө) —', rows.filter((r) => !r.is_rural && !paidR(r))],
      ['— УЛААНБААТАР (ТӨЛБӨР ТӨЛСӨН · авах дүн 0₮) —', rows.filter((r) => !r.is_rural && paidR(r))],
      ['— ОРОН НУТАГ (ТӨЛБӨР ТӨЛСӨН · авах дүн 0₮) —', rows.filter((r) => r.is_rural && paidR(r))],
      ['— ОРОН НУТАГ (ТӨЛӨӨГҮЙ) —', rows.filter((r) => r.is_rural && !paidR(r))]
    ].filter((x) => x[1].length);
    const clean = (x) => String(x == null ? '' : x).replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    let i = 0, due = 0;
    const lines = [k.slice(5).replace('-', '/') + ' · Starshopping · Gyals хүргэлт'];
    secs.forEach((x) => {
      lines.push('', x[0]);
      x[1].forEach((r) => {
        const paid = paidR(r), amt = Math.round(n(r.amount_mnt));
        if (!paid) due += amt;
        lines.push((++i) + '. ' + clean(r.phone) + ' · ' + [clean(String(r.district || '').replace(/^Орон нутаг\s*/, '')), clean(r.address)].filter(Boolean).join(', ')
          + (r.customer ? ' (' + clean(r.customer) + ')' : '') + ' · ' + clean(String(r.product || '').split(' · ')[0]) + (r.variant ? ' ' + clean(r.variant) : '') + (n(r.qty) > 1 ? ' ×' + n(r.qty) : '')
          + ' · ' + (paid ? '0₮ (ТӨЛСӨН)' : amt.toLocaleString('en-US') + '₮'));
      });
    });
    lines.push('', 'Нийт ' + i + ' захиалга · авах дүн ' + due.toLocaleString('en-US') + '₮');
    return lines.join('\n');
  };
  const dShort = (iso) => dLabel(iso).replace(/ · .*$/, '');
  const whoTd = (r) => '<td><b>' + esc(r.customer || '—') + '</b><br><a href="tel:' + esc(r.phone) + '">' + esc(r.phone || '') + '</a></td>';
  const addrTd = (r) => '<td>' + esc(r.district || '') + (r.address ? '<br><span class="sm mut">' + esc(r.address) + '</span>' : '') + '</td>';
  const goodsTd = (r) => '<td>' + esc(String(r.product || '').split(' · ')[0]) + (r.variant ? ' <b>' + esc(r.variant) + '</b>' : '') + (n(r.qty) > 1 ? ' ×' + n(r.qty) : '') + '</td>';
  const amtTd = (r) => '<td>' + (r.is_rural && r.prepaid_at ? '<span class="pill ok">төлсөн ' + mnt(r.prepaid_mnt) + '</span><br><span class="sm mut">авах дүн 0</span>' : mnt(r.amount_mnt)) + '</td>';
  const COLS = '<colgroup><col style="width:16%"><col style="width:30%"><col style="width:24%"><col style="width:12%"><col style="width:18%"></colgroup>';
  const late = [], G = {};
  dsp.forEach((r) => {
    if (r.deliver_on && r.deliver_on < TODAY) { late.push(r); return; }
    const k = r.deliver_on || (r.is_rural && r.prepaid_at ? TODAY : TOMORROW);
    (G[k] = G[k] || []).push(r);
  });
  o('<div class="dsp"><h2 style="margin-top:10px">📦 Түгээлт</h2>');
  o('<div class="callbox" style="margin-bottom:10px"><b>Урсгал — 3 алхам</b>'
    + '① <b>Өдрийн жагсаалт</b>: өнөөдрийн хаягтай захиалга маргаашийн жагсаалтад автоматаар орно. Gyals-д өгөхдөө «📋 … хуулах + Gyals-д өгсөн» дар → тэр мөрүүд жагсаалтаас гарна, <b>дахин явахгүй</b>.<br>'
    + '② <b>🚚 Gyals дээр</b>: өгсөн захиалга хүргэгдтэл энд байна. Дүн ирэхээр «✓ Хүргэгдсэн» (мөнгө авсан) / «Хойшилсон» / «↩ Буцсан» дар, эсвэл доорх «📤 Gyals тайлан оруулах».<br>'
    + '③ Хүргэх өдөр нь өнгөрсөн ч «өгсөн» гэж тэмдэглээгүй мөр байвал дээр нь «⚠ Gyals-д өгсөн үү?» гэж асууна. Gyals өглөө <b>10:00</b>-д захиалга авч дуусгадаг.</div>');
  if (late.length) {
    o('<h3>⚠ Өмнөх өдрийн жагсаалт — Gyals-д өгсөн үү? <span class="cnt">' + late.length + '</span></h3>');
    o('<p class="sm mut">Хүргэх өдөр нь өнгөрсөн ч «Gyals-д өгсөн» гэж тэмдэглэгдээгүй. Өгсөн бол «Өгсөн» → 🚚 Gyals дээр хэсэгт шилжинэ. Өгөөгүй бол «Өнөөдөр өгнө» → өнөөдрийн жагсаалтад орно.</p>');
    o('<div class="tw"><table class="ot">' + COLS + '<thead><tr><th>Хэн</th><th>Хаяг</th><th>Бараа</th><th>Дүн</th><th>Шийдэх</th></tr></thead><tbody>');
    late.forEach((r) => o('<tr data-keep="dl-' + esc(r.order_id) + '">' + whoTd(r) + addrTd(r) + goodsTd(r) + amtTd(r)
      + '<td><span class="pill crit">📅 ' + esc(r.deliver_on.slice(5).replace('-', '/')) + '</span><br><button class="btn go oa" data-id="' + esc(r.order_id) + '" data-do="shipped">Өгсөн</button> <button class="btn dtoday" data-id="' + esc(r.order_id) + '" data-d="' + TODAY + '">Өнөөдөр өгнө</button></td></tr>'));
    o('</tbody></table></div>');
  }
  const gkeys = Object.keys(G).sort();
  if (!gkeys.length && !late.length) o('<p class="sm mut">Gyals-д өгөх захиалга алга.</p>');
  gkeys.forEach((k) => {
    const rows = G[k].slice().sort((a, b) => (a.is_rural ? 1 : 0) - (b.is_rural ? 1 : 0) || String(a.district || '').localeCompare(String(b.district || '')));
    const ok = rows.filter(dspOk);
    GX.groups[k] = ok.map(gxRow);
    const kk = esc(k.slice(5).replace('-', '/'));
    const head = k === TODAY ? '📋 Өнөөдөр Gyals-д өгөх' : k === TOMORROW ? '🕓 Маргааш өгөх — бүрдэж байна' : '📅 Дараа өгөх';
    o('<h3>' + head + ' · ' + esc(dShort(k)) + ' <span class="cnt">' + ok.length + ' захиалга · авах ' + big(ok.reduce((s, r) => s + (r.is_rural && r.prepaid_at ? 0 : n(r.amount_mnt)), 0)) + '₮</span>'
      + (rows.length > ok.length ? ' <span class="pill crit">⚠ ' + (rows.length - ok.length) + ' бараа оноогдоогүй</span>' : '') + '</h3>');
    if (k === TOMORROW) o('<p class="sm mut">Өнөөдөр орж ирж буй захиалгууд энд нэмэгдсээр байна. Орой хаяггүй хүмүүс рүү залгаж шийдээд маргааш өглөө (10:00-аас өмнө) Gyals-д өгнө.</p>');
    if (ok.length) o('<div style="margin:4px 0 8px"><button class="btn go cpm" data-k="' + kk + '" data-ids="' + esc(ok.map((r) => r.order_id).join(',')) + '" data-tsv="' + attr(gyalsText(k, ok)) + '">📋 ' + kk + ' жагсаалт хуулах + Gyals-д өгсөн гэж тэмдэглэх</button> <button class="btn gx-dl" data-k="' + esc(k) + '" title="Gyals-д илгээх Excel (төлөвийн баганатай)">📥 Excel (Gyals)</button> <button class="btn cp" data-n="' + ok.length + '" data-tsv="' + attr(gyalsText(k, ok)) + '" title="Тэмдэглэхгүй, зөвхөн хуулна">зөвхөн хуулах</button></div>');
    o('<div class="tw"><table class="ot">' + COLS + '<thead><tr><th>Хэн</th><th>Хаяг</th><th>Бараа</th><th>Дүн</th><th>Төлөв</th></tr></thead><tbody>');
    rows.forEach((r) => {
      const good = dspOk(r), rp = !!(r.is_rural && r.prepaid_at);
      o('<tr data-keep="d-' + esc(r.order_id) + '"' + (rp ? ' style="background:rgba(22,101,52,.07)"' : '') + '>' + whoTd(r) + addrTd(r) + goodsTd(r) + amtTd(r)
        + '<td>' + (rp ? '<span class="pill ok">🚚 орон нутаг · төлсөн ' + day(r.prepaid_at) + '</span>' : (good ? '<span class="pill ok">бэлэн</span>' : '<span class="pill crit">⚠ бараа оноогдоогүй</span>'))
        + (r.stage === 'order' && !rp ? '<span class="pill">дуудлагагүй</span>' : '') + '<br><button class="btn oa" data-id="' + esc(r.order_id) + '" data-do="shipped" title="Зөвхөн энэ захиалгыг Gyals-д өгсөн гэж тэмдэглэх">Gyals-д өгсөн</button></td></tr>');
    });
    o('</tbody></table></div>');
  });
  o('<h3 style="margin-top:18px">🚚 Gyals дээр — хүргэлтэнд яваа <span class="cnt">' + onGyals.length + ' захиалга · авах ' + big(onGyals.reduce((s, r) => s + (r.is_rural && r.prepaid_at ? 0 : n(r.amount_mnt)), 0)) + '₮</span>'
    + (onGyals.length > 1 ? ' <button class="btn go gyall" data-ids="' + esc(onGyals.map((r) => r.order_id).join(',')) + '">✓ Бүгд хүргэгдсэн</button>' : '') + '</h3>');
  if (!onGyals.length) o('<p class="sm mut">Одоогоор Gyals дээр хүргэлт хүлээж буй захиалга алга.</p>');
  else {
    o('<div class="tw"><table class="ot">' + COLS + '<thead><tr><th>Хэн</th><th>Хаяг</th><th>Бараа</th><th>Авах дүн</th><th>Дүн ирэхэд</th></tr></thead><tbody>');
    onGyals.forEach((r) => {
      const id = esc(r.order_id), held = /хойшилсон/i.test(String(r.confirm_note || ''));
      o('<tr data-keep="g-' + id + '">' + whoTd(r) + addrTd(r) + goodsTd(r) + amtTd(r)
        + '<td><span class="pill info">өгсөн ' + day(r.shipped_at) + '</span>' + (held ? '<span class="pill warn">хойшилсон</span>' : '') + '<br>'
        + '<button class="btn go gyr" data-id="' + id + '" data-st="Хүргэсэн">✓ Хүргэгдсэн</button> <button class="btn gyr" data-id="' + id + '" data-st="Хойшилсон">Хойшилсон</button> <button class="btn stop gyr" data-id="' + id + '" data-st="Цуцалсан">↩ Буцсан</button></td></tr>');
    });
    o('</tbody></table></div>');
  }
  o('</div>');
  o('<div class="gxbar"><b>Gyals:</b> '
    + '<button class="btn gx-up">📤 Gyals тайлан оруулах</button><input type="file" id="gx-file" accept=".xlsx" hidden>'
    + ' <span class="sm mut">Gyals буцааж явуулсан Excel-ийн «Хүргэлтийн төлөв» баганаар захиалгууд автоматаар Төлсөн / Хойшилсон / Цуцалсан болно (нөөц зөв тоологдоно, мэдэгдэл явахгүй).</span><div id="gx-prev"></div></div>');
  cur = T.main;
  o('<h2>Хаягтай захиалга' + (ruralAct.length ? ' <span class="sm mut">(орон нутгийнхаас бусад)</span>' : '') + ' <span class="cnt">' + addrMain.length + ' · ' + big(addrMain.reduce((s, r) => s + n(r.amount_mnt), 0)) + '₮</span></h2>');
  o('<div class="tchbar"><span>🟩 ногоон = залгасан/товч дарсан · <b>СҮҮЛД</b> = хамгийн сүүлд ажилласан мөр</span><button class="btn" id="tch-go">↓ Сүүлд залгасан руу очих</button><button class="btn" id="tch-clr" title="Өнөөдрийн тэмдэглэгээг арилгах">Тэмдэглэгээ арилгах</button></div>');
  table(addrMain, 'addressed', 'Шүүлтэд таарах хаягтай захиалга алга');
  cur = T.wait;
  if (addrWait.length) {
    o('<h2>⏳ Хүлээлэг — SMS явуулсан, хариу хүлээж буй <span class="cnt">' + addrWait.length + ' · ' + big(addrWait.reduce((s, r) => s + n(r.amount_mnt), 0)) + '₮</span></h2>');
    o('<p class="sm mut">Утсаа аваагүй хүмүүс. Утсандаа ирсэн хариуг шалгаад: «Тийм» гэсэн бол <b>Батлах</b>, авахгүй гэсэн бол <b>Цуцлах</b>. Хариу ирээгүй бол дахин залга эсвэл <b>SMS дахин</b>.</p>');
    table(addrWait, 'addressed', '');
  }

  // ── 2 · Сонирхол (хаяггүй). WIN/амьд бараа руу залгах жагсаалт дээр нь
  cur = T.lead;
  o('<h2>Сонирхол — утас/нэр үлдээсэн, хаяггүй <span class="cnt">' + leads.length + '</span></h2>');
  if (CALL.length) o('<div class="callbox"><b>📞 Залгах жагсаалт · ' + CALL.length + ' хүн (WIN эсвэл амьд бараа)</b>Залгаад хаягаа өгвөл «Хаяг оруулах» → захиалга болж баталгаажна. Авахгүй гэвэл «Цуцлах». Мөр бүрийн «📞 Залгах» товч дугаарыг хуулж, залгана. SMS автоматаар явахгүй — эзэн өөрөө залгана.</div>');
  else o('<p class="sm mut">Залгах жагсаалт хоосон: эдгээр бараа WIN болоогүй / бараа ирээгүй. LOSS барааны сонирхогчид юу ч илгээхгүй.</p>');
  table(leads.slice().sort((a, b) => (b.call_ready ? 1 : 0) - (a.call_ready ? 1 : 0) || new Date(b.placed_at) - new Date(a.placed_at)), 'lead', 'Хаяггүй сонирхол алга');

  // ── 3 · Цуцлагдсан / тест (нуусан)
  cur = T.other;
  if (others.length) {
    o('<details data-keep="others"><summary style="cursor:pointer;font-size:13.5px;font-weight:600;margin:18px 0 8px">Цуцлагдсан · тест · давхардал (' + others.length + ')</summary>');
    table(others, 'other', '');
    o('</details>');
  }
  // ── Табууд: Хаягтай · Түгээлт · Орон нутаг · Хүлээлэг · Сонирхол · Бусад. Яаралтай орон нутаг байвал тэр нь эхэнд нээгдэнэ.
  cur = out;
  const nUrg = rPay.filter((r) => r.placed_mode === 'live').length;
  const TABS = [
    ['main', 'Хаягтай', addrMain.length, '', true],
    ['dsp', 'Түгээлт', dsp.length, [onGyals.length ? onGyals.length + ' Gyals дээр' : '', rShip.length ? rShip.length + ' орон нутаг' : '', bo.length ? bo.length + ' нөөц' : ''].filter(Boolean).join(' · '), true],
    ['rural', 'Орон нутаг', ruralAct.length, nUrg ? nUrg + ' яаралтай' : '', ruralAct.length > 0],
    ['wait', 'Хүлээлэг SMS', addrWait.length, '', addrWait.length > 0],
    ['lead', 'Сонирхол', leads.length, CALL.length ? CALL.length + ' залгах' : '', leads.length > 0],
    ['other', 'Бусад', others.length, 'цуцлагдсан · тест', others.length > 0]
  ].filter((t) => t[4]);
  const defTab = Q.tab && TABS.some((t) => t[0] === Q.tab) ? Q.tab : (nUrg ? 'rural' : (anyFilter ? 'main' : ''));
  o('<div class="otabs" id="otabs" role="tablist" data-def="' + esc(defTab) + '">');
  TABS.forEach((t) => o('<button type="button" class="otb" role="tab" data-tab="' + t[0] + '"' + (t[0] === 'rural' && nUrg ? ' data-urg="1"' : '') + '>' + esc(t[1]) + ' <b>' + t[2] + '</b>' + (t[3] ? '<span class="sm">· ' + esc(t[3]) + '</span>' : '') + '</button>'));
  o('</div>');
  TABS.forEach((t) => { o('<section class="pane" data-pane="' + t[0] + '">'); out.push(...T[t[0]]); o('</section>'); });
  o('<datalist id="dl-d"></datalist>');
  o('<footer>Блок C1 · захиалга = дүүрэг/хороо + хаяг (B1). Хаяг оруулах = захиалга + баталгаажсан. Төлсөн = хүргэгдэж мөнгөө авсан (COD); орон нутаг = 100% урьдчилж төлнө (S8). Цуцлах → нөөц дэвтэрт буцна. Шүүлт URL дээр хадгалагдана — хуваалцаж болно.</footer></div>');

  // ── үйлдлүүд
  o('<script>(function(){var U="https://starshopping.app.n8n.cloud/webhook/board-data",k="";try{k=localStorage.getItem("ss_board_key")||""}catch(x){}'
    + 'function e(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]})}'
    + 'function say(id,msg,bad){var o=document.getElementById(id);if(!o)return;o.className="out on";o.innerHTML=(bad?"⚠️ ":"✅ ")+e(msg);o.scrollIntoView({block:"nearest"})}'
    + 'function post(b,btn,out){if(btn){btn.disabled=true;btn.dataset.tx=btn.textContent;btn.textContent="…"}'
    + 'return fetch(U+"?k="+encodeURIComponent(k),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)})'
    + '.then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}).then(function(j){if(!j||j.ok===false){var x=new Error((j&&(j.error||j.message))||"алдаа");x.j=j;throw x}return j})'
    + '.catch(function(x){if(btn){btn.disabled=false;btn.textContent=btn.dataset.tx}if(out)say(out,x.message,true);throw x})}'
    + 'function reload(ms){setTimeout(function(){if(window.ssRefresh)window.ssRefresh();else location.reload()},ms||500)}'
    /* v3: табууд (localStorage ss_orders_tab; ?tab= / яаралтай орон нутаг давуу) + хаяг дарвал бүтнээр */
    + '(function(){var bar=document.getElementById("otabs");if(!bar)return;var KT="ss_orders_tab",bs=bar.querySelectorAll(".otb"),has={};bs.forEach(function(b){has[b.dataset.tab]=1});'
    + 'var t=bar.dataset.def;if(!t){try{t=localStorage.getItem(KT)||""}catch(x){}}if(!has[t])t="main";'
    + 'function set(v,save){bs.forEach(function(b){b.classList.toggle("on",b.dataset.tab===v)});document.querySelectorAll(".pane").forEach(function(p){p.classList.toggle("on",p.dataset.pane===v)});if(save){try{localStorage.setItem(KT,v)}catch(x){}}}'
    + 'set(t,false);bar.addEventListener("click",function(ev){var b=ev.target.closest(".otb");if(b)set(b.dataset.tab,true)})})();'
    + 'document.addEventListener("click",function(ev){var a=ev.target.closest&&ev.target.closest(".adr");if(a&&!ev.target.closest("a,button"))a.classList.toggle("open")});'
    + 'document.querySelectorAll(".oa").forEach(function(b){b.addEventListener("click",function(){var id=b.dataset.id,d=b.dataset.do;'
    + 'if(d==="addr"){var f=document.getElementById("f-"+id);f.classList.toggle("on");if(f.classList.contains("on")){var s=document.getElementById("d-"+id);if(s&&!s.value)s.focus()}return}'
    + 'var note;if(d==="cancel"){note=prompt("Цуцлах шалтгаан (сонголттой):","");if(note===null)return}'
    + 'if(d==="paid"&&!confirm("Хүргэгдсэн (төлбөр бүрэн) гэж бүртгэх үү?"))return;'
    + 'if(d==="prepaid"&&!confirm("Мөнгө данс руу орсныг шалгасан уу?"))return;'
    + 'if(d==="deliver_sms"&&!confirm("Энэ хүнд хаяг + «маргааш хүргэнэ, авах бол Тийм гэж хариу бич» SMS явуулах уу?"))return;'
    + 'post({action:"order",order_id:id,do:d,note:note||undefined,by:"самбар"},b,"out-o").then(function(j){say("out-o",{confirm:"Баталгаажлаа",cancel:"Цуцлагдлаа",shipped:"Ачсан гэж тэмдэглэв",prepay_sms:(j.already?"SMS саяхан дараалалд орсон — дахин явуулсангүй":"Төлбөрийн SMS дараалалд орлоо — Mac-ээс 1–2 минутад явна"),prepaid:"Мөнгө орсон гэж бүртгэгдлээ ✓",deliver_sms:(j.already?"SMS саяхан дараалалд орсон — дахин явуулсангүй":"Хүргэлтийн SMS дараалалд орлоо — Mac-ээс 1–2 минутад явна"),prepaid_undo:"Буцаалаа",paid:"Төлбөр бүртгэгдлээ ✓ "+(j.paid_mnt?Number(j.paid_mnt).toLocaleString("en-US")+"₮":"")}[d]||"OK");reload()}).catch(function(){})})});'
    + 'document.querySelectorAll(".osave").forEach(function(b){b.addEventListener("click",function(){var id=b.dataset.id,dv=(document.getElementById("d-"+id).value||"").trim(),av=(document.getElementById("a-"+id).value||"").trim(),nv=(document.getElementById("n-"+id).value||"").trim();'
    + 'if(!dv||!av){say("out-o","Дүүрэг/хороо ба байр-тоот хоёулаа хэрэгтэй",true);return}'
    + 'post({action:"order",order_id:id,do:"address",district_full:dv,address_detail:av,note:nv||undefined,by:"самбар"},b,"out-o").then(function(){say("out-o","Хаяг хадгалагдлаа — захиалга баталгаажлаа ✓");reload()})'
    + '.catch(function(x){var sg=x.j&&x.j.suggest;if(sg&&sg.length){var box=document.getElementById("s-"+id);box.innerHTML="Ойролцоо: "+sg.slice(0,12).map(function(s){return "<button class=\\"btn\\" data-v=\\""+e(s)+"\\">"+e(s)+"</button>"}).join("");box.querySelectorAll("button").forEach(function(sb){sb.addEventListener("click",function(){var s=document.getElementById("d-"+id);s.value=sb.dataset.v;box.innerHTML=""})})}})})});'
    + 'function cp(t){try{if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t)}catch(x){}return new Promise(function(res){var a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();try{document.execCommand("copy")}catch(x){}a.remove();res()})}'
    + 'document.querySelectorAll(".cb").forEach(function(b){b.addEventListener("click",function(){var t=b.dataset.tel;cp(t).then(function(){say("out-o","Дугаар хуулагдлаа: "+t+" — залгаж байна…")});setTimeout(function(){location.href="tel:"+t.replace(/[^0-9+]/g,"")},150)})});'
    + 'document.querySelectorAll(".cp").forEach(function(b){b.addEventListener("click",function(){cp(b.dataset.tsv).then(function(){say("out-o","Жагсаалт хуулагдлаа ("+b.dataset.n+" мөр) — Gyals руу paste хий")})})});'
    + 'document.querySelectorAll(".cpm").forEach(function(b){b.addEventListener("click",function(){var ids=(b.dataset.ids||"").split(",").filter(Boolean),k=b.dataset.k;cp(b.dataset.tsv).then(function(){if(!confirm(k+" жагсаалт ("+ids.length+" захиалга) хуулагдлаа — Gyals руу paste хий.\\n\\nЭдгээрийг Gyals-д ӨГСӨН гэж тэмдэглэх үү? Тэмдэглэсэн мөр жагсаалтаас гарч «Gyals дээр» хэсэгт шилжинэ, дахин явахгүй.")){say("out-o","Жагсаалт хуулагдлаа (тэмдэглээгүй)");return}b.disabled=true;var ok=0,fail=0;ids.reduce(function(p,id){return p.then(function(){return post({action:"order",order_id:id,do:"shipped",by:"самбар · түгээлт"},null,null).then(function(){ok++}).catch(function(){fail++})})},Promise.resolve()).then(function(){say("out-o",ok+" захиалга Gyals-д өгсөн гэж тэмдэглэгдлээ ✓"+(fail?" · "+fail+" алдаа":""),fail>0);reload(900)})})})});'
    + 'document.querySelectorAll(".gyr").forEach(function(b){b.addEventListener("click",function(){var st=b.dataset.st,note;if(st==="Цуцалсан"){note=prompt("Буцсан шалтгаан (сонголттой):","");if(note===null)return}else if(st==="Хүргэсэн"&&!confirm("Хүргэгдэж мөнгө авсан гэж бүртгэх үү?"))return;post({action:"order",order_id:b.dataset.id,do:"gyals",status:st,note:note||undefined,by:"самбар · Gyals дээр"},b,"out-o").then(function(){say("out-o",st==="Хүргэсэн"?"Хүргэгдсэн ✓":st==="Хойшилсон"?"Хойшилсон гэж тэмдэглэв":"Буцсан — захиалга цуцлагдаж бараа нөөцөд буцлаа");reload(900)}).catch(function(){})})});'
    + 'document.querySelectorAll(".gyall").forEach(function(b){b.addEventListener("click",function(){var ids=(b.dataset.ids||"").split(",").filter(Boolean);if(!confirm(ids.length+" захиалгыг бүгдийг нь хүргэгдсэн (мөнгө авсан) гэж бүртгэх үү?"))return;b.disabled=true;var ok=0,fail=0;ids.reduce(function(p,id){return p.then(function(){return post({action:"order",order_id:id,do:"gyals",status:"Хүргэсэн",by:"самбар · Gyals дээр"},null,null).then(function(){ok++}).catch(function(){fail++})})},Promise.resolve()).then(function(){say("out-o",ok+" захиалга хүргэгдсэн ✓"+(fail?" · "+fail+" алдаа":""),fail>0);reload(900)})})});'
    + 'document.querySelectorAll(".dtoday").forEach(function(b){b.addEventListener("click",function(){post({action:"order",order_id:b.dataset.id,do:"deliver_on",date:b.dataset.d,by:"самбар"},b,"out-o").then(function(){say("out-o","Өнөөдрийн жагсаалтад орлоо");reload(900)}).catch(function(){})})});'
    + '(' + ssStockUI.toString() + ')(post,say,reload,e);'
    + '(' + ssTouchUI.toString() + ')();'
    + '(' + ssDeliverUI.toString() + ')(post,say,reload);'
    + '(' + ssGyalsUI.toString() + ')(post,say,reload,e,' + JSON.stringify(GX).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, ' ') + ');'
    + '})();</script></body></html>');
  return out.join('');
}

/* M4 (2026-10-19) · «Нөөц» багана + «Бараа солих». Хуудсан дээр stock_public (anon, нийтийн RPC) уншина.
   available = агуулах(+зам) − хаягтай захиалгууд → сонирхогч (хаяггүй) мөрөнд «сул N» = түүнд өгч болох тоо.
   10/24 засвар: онооллыг stock_ready_at-аас гадна stock_ok (sale move бий)-оор таньдаг болгов — live бараанд захиалга орох мөчид
   нөөц оноогдож хасагддаг тул сонирхогчийн өөрийн ширхэг аль хэдийн түүнийх; өмнө нь XL 0 болмогц 5 XL сонирхогч «дууссан» гэж буруу харагдаж байсан.
   Солих = POST action=order do=sku {color,size} → order_action M4: хуучин оноолтыг чөлөөлж, шинэд нөөц байвал онооно. Мэдэгдэл явахгүй (notify_silent). */
function ssStockUI(post, say, reload, e) {
  var URL = 'https://tdnjnqftxschbliumwwm.supabase.co/rest/v1/rpc/stock_public?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbmpucWZ0eHNjaGJsaXVtd3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNzExNTgsImV4cCI6MjEwNDk0NzE1OH0.lND_YBbjyCNT-yIa27OZ3V-1_fn76i9JUYrOfrXbC1w';
  var lab = function (k) { return [k.color, k.size].filter(function (x) { return x; }).join(' '); };
  var num = function (v) { var x = Number(v); return isNaN(x) ? 0 : x; };
  fetch(URL).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }).then(function (SP) {
    SP = SP && typeof SP === 'object' ? SP : {};
    document.querySelectorAll('td.stk[data-slug]').forEach(function (td) {
      var P = SP[td.dataset.slug], K = (P && P.skus) || [];
      if (!K.length) { td.innerHTML = '<span class="mut">нөөц бүртгэлгүй</span>'; return; }
      var v = (td.dataset.var || '').trim(), q = num(td.dataset.qty) || 1, al = td.dataset.al === '1';
      var need = td.dataset.lead === '1' ? q : 0; // хаягтай захиалгын өөрийн тоо available-аас аль хэдийн хасагдсан
      var own = null; K.forEach(function (k) { if (lab(k) === v) own = k; });
      var tr = P.mode === 'preorder' ? ' <span class="mut">(замд)</span>' : '';
      var h = '';
      if (!own) h = '<span class="no">хувилбар сонгоогүй</span>';
      else if (al) h = '<span class="ok">✓ оноогдсон</span><br><span class="mut">илүү ' + Math.max(0, num(own.available)) + '</span>';
      else if (num(own.available) >= need) h = '<span class="ok">✓ хүрнэ' + (num(own.available) > 0 ? ' · илүү ' + num(own.available) : '') + '</span>' + tr;
      else h = '<span class="no">дууссан</span>' + (num(own.available) < 0 ? ' <span class="mut">(' + (-num(own.available)) + ' дутуу)</span>' : '');
      var short = !own || num(own.available) < need;
      if (!al && short) {
        var alt = K.filter(function (k) { return k !== own && num(k.available) >= q; });
        if (own) alt.sort(function (a, b) { return ((b.size === own.size) - (a.size === own.size)) || ((b.color === own.color) - (a.color === own.color)) || (num(b.available) - num(a.available)); });
        else alt.sort(function (a, b) { return num(b.available) - num(a.available); });
        if (alt.length) h += '<span class="sg">санал: ' + alt.slice(0, 4).map(function (k) { return '<b>' + e(lab(k)) + '</b> ' + num(k.available); }).join(' · ') + '</span>';
        else h += '<span class="sg">өөр сул хувилбар алга</span>';
      }
      td.innerHTML = h;
    });
    document.querySelectorAll('.osku').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.dataset.id, f = document.getElementById('k-' + id);
        if (!f) return;
        if (f.classList.contains('on')) { f.classList.remove('on'); return; }
        var P = SP[b.dataset.slug], K = ((P && P.skus) || []).slice(), cur = (b.dataset.var || '').trim();
        if (!K.length) { say('out-o', 'Энэ бараанд нөөцийн хувилбар бүртгэгдээгүй', true); return; }
        var ck = null; K.forEach(function (k) { if (lab(k) === cur) ck = k; });
        K.sort(function (a, b2) { return (ck ? ((b2.size === ck.size) - (a.size === ck.size)) || ((b2.color === ck.color) - (a.color === ck.color)) : 0) || ((num(b2.available) > 0) - (num(a.available) > 0)) || (num(b2.available) - num(a.available)); });
        f.innerHTML = '<div class="sm mut">Одоо: <b>' + e(cur || '—') + '</b></div><select>' + K.map(function (k, i) {
          var L = lab(k); return '<option value="' + i + '"' + (L === cur ? ' disabled' : '') + '>' + e(L) + ' · ' + (num(k.available) > 0 ? 'сул ' + num(k.available) : 'дууссан') + (L === cur ? ' (одоогийн)' : '') + '</option>';
        }).join('') + '</select><button class="btn go">Солих</button><div class="sm mut">Мэдэгдэл явахгүй. Хуучин хувилбар оноогдсон байсан бол чөлөөлөгдөж хүлээж буй өөр захиалгад шилжинэ.</div>';
        var sel = f.querySelector('select'), go = f.querySelector('button');
        for (var i = 0; i < sel.options.length; i++) if (!sel.options[i].disabled) { sel.selectedIndex = i; break; }
        f.classList.add('on');
        go.addEventListener('click', function () {
          var k = K[Number(sel.value)]; if (!k || lab(k) === cur) return;
          post({ action: 'order', order_id: id, do: 'sku', color: k.color || '', size: k.size || '', by: 'самбар' }, go, 'out-o').then(function (j) {
            say('out-o', 'Солигдлоо → ' + lab(k) + (j.allocated ? ' · бараа оноогдлоо ✓' : ' · энэ хувилбарт нөөц алга — хүлээлгэнд'));
            reload(900);
          }).catch(function () {});
        });
      });
    });
  });
}

/* M5c (2026-10-19) · «Залгасан» тэмдэглэгээ: мөрийн аль нэг товч / утас / «☐ залгасан» дарвал мөр ногоон болно,
   хамгийн сүүлийнх нь тод ногоон + «СҮҮЛД». Зөвхөн энэ хөтөчид (localStorage ss_touched), 36 цаг хадгална. */
function ssTouchUI() {
  var KEY = 'ss_touched', TTL = 36 * 3600e3, T = {}, last = null;
  try { var j = JSON.parse(localStorage.getItem(KEY) || '{}'); T = j.t || {}; last = j.last || null; } catch (x) {}
  var now = Date.now();
  Object.keys(T).forEach(function (k) { if (now - T[k] > TTL) delete T[k]; });
  if (last && !T[last]) last = null;
  var save = function () { try { localStorage.setItem(KEY, JSON.stringify({ t: T, last: last })); } catch (x) {} };
  var idOf = function (tr) { var k = tr && tr.getAttribute('data-keep') || ''; var m = k.match(/^[ord]-(.+)$/); return m ? m[1] : null; };
  var paint = function () {
    document.querySelectorAll('tr[data-keep]').forEach(function (tr) {
      var id = idOf(tr); if (!id) return;
      var on = !!T[id], isLast = on && id === last;
      tr.classList.toggle('tch', on); tr.classList.toggle('tlast', isLast);
      var b = tr.querySelector('.tchb'); if (b) b.textContent = on ? '✓ залгасан' : '☐ залгасан';
      var bd = tr.querySelector('.tlastb');
      if (isLast && !bd) { var td = tr.querySelector('td'); if (td) { bd = document.createElement('span'); bd.className = 'tlastb'; bd.textContent = 'СҮҮЛД'; td.appendChild(document.createElement('br')); td.appendChild(bd); } }
      if (!isLast && bd) { if (bd.previousSibling && bd.previousSibling.nodeName === 'BR') bd.previousSibling.remove(); bd.remove(); }
    });
  };
  var mark = function (id) { if (!id) return; T[id] = Date.now(); last = id; save(); paint(); };
  document.addEventListener('click', function (ev) {
    var t = ev.target; if (!t || !t.closest) return;
    var tr = t.closest('tr[data-keep]'); var id = idOf(tr); if (!id) return;
    if (t.closest('.tchb')) {
      if (T[id] && id !== last) { delete T[id]; } else if (T[id] && id === last) { delete T[id]; last = null; } else { T[id] = Date.now(); last = id; }
      save(); paint(); return;
    }
    if (t.closest('td.acts button') || t.closest('a[href^="tel:"]') || t.closest('.frm button')) mark(id);
  }, true);
  var go = document.getElementById('tch-go');
  if (go) go.addEventListener('click', function () {
    var tr = last && document.querySelector('tr[data-keep="o-' + last + '"], tr[data-keep="r-' + last + '"]');
    if (tr) tr.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
  var clr = document.getElementById('tch-clr');
  if (clr) clr.addEventListener('click', function () { if (!confirm('Бүх «залгасан» тэмдэглэгээг арилгах уу?')) return; T = {}; last = null; save(); paint(); });
  paint();
}

/* M6 (2026-10-19) · «📅 хүргэх» огноо солиход шууд хадгална (order_action do=deliver_on). Хоосон = маргааш. */
function ssDeliverUI(post, say, reload) {
  document.querySelectorAll('.dlvi').forEach(function (inp) {
    inp.dataset.last = inp.value || '';
    inp.addEventListener('change', function () {
      var v = inp.value || '';
      if (v === inp.dataset.last) return; // давхар change (гараар бичихэд) — нэг л удаа хадгална
      inp.dataset.last = v;
      post({ action: 'order', order_id: inp.dataset.id, do: 'deliver_on', date: v, by: 'самбар' }, null, 'out-o').then(function () {
        say('out-o', v ? 'Хүргэх өдөр: ' + v.slice(5).replace('-', '/') + ' — тэр өдрийн түгээлтэд орлоо' : 'Хүргэх өдөр арилгав — маргаашийн түгээлтэд');
        reload(700);
      }).catch(function () {});
    });
  });
}

/* M9 (2026-10-20) · Gyals Excel: «📥 … Excel (Gyals)» — №, Код, огноо, нэр, утас, хаяг, тайлбар, бараа, дүн + «Хүргэлтийн төлөв» (Gyals бөглөнө).
   «📤 Gyals тайлан оруулах» — буцаж ирсэн файлын Код + төлөвөөр order_action do=gyals (Хүргэсэн/Хойшилсон/Цуцалсан). ExcelJS-ийг cdnjs-ээс дарахад л ачаална. */
function ssGyalsUI(post, say, reload, e, GX) {
  var CDN = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
  function lib() {
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = CDN; s.onload = function () { res(window.ExcelJS); }; s.onerror = function () { rej(new Error('Excel сан ачаалсангүй — интернэтээ шалга')); }; document.head.appendChild(s); });
  }
  function parseAddr(a) {
    a = String(a || ''); var kind = /Шуурхай/.test(a) ? 'Шуурхай' : 'Энгийн';
    a = a.replace(/\s*\[[^\]]*\]/g, '').trim(); var note = '', extra = '';
    var m = a.match(/\s*·\s*Тайлбар:\s*(.*)$/); if (m) { note = m[1].trim(); a = a.slice(0, m.index).trim(); }
    if (/^\d{8}$/.test(note)) { extra = note; note = ''; } else if (/^[\d#*]+$/.test(note)) note = 'Орц/хаалганы код: ' + note; else note = note.replace(/^Код:\s*/, 'Орц/хаалганы код: ');
    return { addr: a, note: note, extra: extra, kind: kind };
  }
  function ownerNote(t) { return String(t || '').split(' · ').filter(function (x) { return x && !/эзэн залгаж|урьдчилж төлсөн|Gyals хойшилсон|самбар/.test(x); }).join('; '); }
  function cellv(c) { var v = c && c.value; if (v && typeof v === 'object') { if (v.richText) return v.richText.map(function (t) { return t.text; }).join(''); if ('result' in v) return v.result; if (v.text) return v.text; } return v == null ? '' : String(v); }
  function download(k) {
    var all = (GX.groups[k] || []), ub = all.filter(function (x) { return !x.paid; }), paid = all.filter(function (x) { return x.paid; });
    if (!ub.length && !paid.length) { say('out-o', 'Энэ өдөрт Gyals-д өгөх захиалга алга', true); return; }
    lib().then(function (ExcelJS) {
      var wb = new ExcelJS.Workbook(), ws = wb.addWorksheet(k.slice(5) + ' хүргэлт', { views: [{ state: 'frozen', xSplit: 2, ySplit: 4 }] });
      var H = ['№', 'Код', 'Хүргэх огноо', 'Хүлээн авагч', 'Утас', 'Нэмэлт утас', 'Дүүрэг/хороо · аймаг', 'Дэлгэрэнгүй хаяг', 'Тайлбар (код, байршил)', 'Бараа', 'Өнгө/размер', 'Тоо', 'Авах дүн (₮)', 'Төлбөр', 'Хүргэлтийн төрөл', 'Хүргэлтийн төлөв (Gyals бөглөнө)', 'Gyals тайлбар'];
      var W = [5, 10, 11, 18, 11, 11, 20, 36, 28, 22, 12, 6, 12, 15, 11, 18, 24], NC = H.length;
      W.forEach(function (w, i) { ws.getColumn(i + 1).width = w; });
      var F = { name: 'Arial', size: 10 }, thin = { style: 'thin', color: { argb: 'FFBFBFBF' } }, B = { top: thin, left: thin, bottom: thin, right: thin };
      var wd = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'][new Date(k + 'T12:00:00+08:00').getUTCDay()];
      ws.mergeCells(1, 1, 1, NC); ws.getCell(1, 1).value = 'Starshopping → Gyals хүргэлт · Хүргэх огноо: ' + k + ' (' + wd + ')'; ws.getCell(1, 1).font = { name: 'Arial', size: 13, bold: true };
      ws.mergeCells(2, 1, 2, NC); ws.getCell(2, 1).value = 'Илгээгч: Starshopping · 9550-5717 · ' + (paid.length ? '1-р хэсэг ТӨЛСӨН (мөнгө авахгүй) · 2-р хэсэг ТӨЛӨӨГҮЙ («Авах дүн»-г авна)' : 'Бүх захиалга хүргэлтээр төлнө — «Авах дүн»-г авна') + ' · Хүргэсний дараа «Хүргэлтийн төлөв»-ийг бөглөж буцааж явуулна уу: Хүргэсэн / Хойшилсон / Цуцалсан.'; ws.getCell(2, 1).font = { name: 'Arial', size: 10, italic: true };
      var hr = ws.getRow(4); H.forEach(function (h, i) { var c = hr.getCell(i + 1); c.value = h; c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i >= 15 ? 'FF7F6000' : 'FF1F4E78' } }; c.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }; c.border = B; });
      hr.height = 30;
      var r = 4, num = 0, sums = [];
      function section(t, color) { r++; ws.mergeCells(r, 1, r, NC); var c = ws.getCell(r, 1); c.value = t; c.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }; }
      function put(vals, fill) {
        r++; var row = ws.getRow(r);
        vals.forEach(function (v, i) { var c = row.getCell(i + 1); c.value = v; c.font = Object.assign({}, F, { bold: i === 0 || i === 4 || i === 12 }); c.alignment = { wrapText: true, vertical: 'top', horizontal: (i === 0 || i === 2 || i === 11 || i === 14) ? 'center' : 'left' }; c.border = B; if (fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }; });
        row.getCell(13).numFmt = '#,##0'; row.getCell(2).font = { name: 'Arial', size: 8, color: { argb: 'FF808080' } };
        row.getCell(16).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Хүргэсэн,Хойшилсон,Цуцалсан"'] }; row.getCell(16).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9E6' } };
      }
      function total(first, label) {
        r++; ws.mergeCells(r, 1, r, 11); ws.getCell(r, 1).value = label; ws.getCell(r, 12).value = { formula: 'SUM(L' + first + ':L' + (r - 1) + ')' }; ws.getCell(r, 13).value = { formula: 'SUM(M' + first + ':M' + (r - 1) + ')' }; ws.getCell(r, 13).numFmt = '#,##0'; ws.getCell(r, 14).value = (r - first) + ' захиалга';
        for (var i = 1; i <= NC; i++) { var c = ws.getCell(r, i); c.font = { name: 'Arial', size: 10, bold: true }; c.border = B; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }; }
        sums.push(r);
      }
      var first;
      if (paid.length) {
        section('1. ТӨЛБӨР ТӨЛСӨН — орон нутаг (мөнгө АВАХГҮЙ, унаанд тавина)', 'FF2E7D32'); first = r + 1;
        paid.forEach(function (x) { var a = parseAddr(x.address); num++; put([num, x.id.slice(0, 8), k, x.customer || '—', x.phone, a.extra, x.district, a.addr || x.district, ['Урьдчилж төлсөн — мөнгө авахгүй', a.note, ownerNote(x.note)].filter(Boolean).join('; '), x.product, x.variant, x.qty, 0, 'ТӨЛСӨН ' + Number(x.prepaid || x.amount).toLocaleString('en-US') + '₮', 'Орон нутаг', '', ''], 'FFE2EFDA'); });
        total(first, 'Төлсөн — дүн');
      }
      if (ub.length) {
        section((paid.length ? '2. ' : '') + 'ТӨЛБӨР ТӨЛӨӨГҮЙ — Улаанбаатар (хүргэхдээ «Авах дүн»-г авна)', 'FFC55A11'); first = r + 1;
        ub.forEach(function (x) { var a = parseAddr(x.address); num++; put([num, x.id.slice(0, 8), k, x.customer || '—', x.phone, a.extra, x.district, a.addr, [a.note, ownerNote(x.note)].filter(Boolean).join('; '), x.product, x.variant, x.qty, x.amount, 'Хүргэлтээр төлнө', a.kind, '', ''], a.kind === 'Шуурхай' ? 'FFFFF2CC' : null); });
        total(first, 'Төлөөгүй — авах дүн');
      }
      r++; ws.mergeCells(r, 1, r, 11); ws.getCell(r, 1).value = 'НИЙТ';
      ws.getCell(r, 12).value = { formula: sums.map(function (x) { return 'L' + x; }).join('+') }; ws.getCell(r, 13).value = { formula: sums.map(function (x) { return 'M' + x; }).join('+') }; ws.getCell(r, 13).numFmt = '#,##0'; ws.getCell(r, 14).value = num + ' захиалга';
      for (var i = 1; i <= NC; i++) { var c = ws.getCell(r, i); c.font = { name: 'Arial', size: 11, bold: true }; c.border = B; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } }; }
      ws.getCell(r + 2, 1).value = '«Код» баганыг бүү өөрчил — тайланг буцааж оруулахад хэрэгтэй. Шар мөр = Шуурхай хүргэлт, ногоон = урьдчилж төлсөн.'; ws.getCell(r + 2, 1).font = { name: 'Arial', size: 9, italic: true };
      ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '4:4' };
      return wb.xlsx.writeBuffer();
    }).then(function (buf) {
      if (!buf) return;
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      a.download = 'Starshopping-Gyals-' + k + '.xlsx'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      say('out-o', 'Excel татагдлаа: Starshopping-Gyals-' + k + '.xlsx — Gyals руу илгээ');
    }).catch(function (x) { say('out-o', x.message || String(x), true); });
  }
  document.querySelectorAll('.gx-dl').forEach(function (b) { b.addEventListener('click', function () { download(b.dataset.k); }); });
  var up = document.querySelector('.gx-up'), inp = document.getElementById('gx-file'), prev = document.getElementById('gx-prev');
  if (!up || !inp || !prev) return;
  up.addEventListener('click', function () { inp.value = ''; inp.click(); });
  inp.addEventListener('change', function () {
    var f = inp.files && inp.files[0]; if (!f) return;
    prev.innerHTML = '<span class="sm mut">Уншиж байна…</span>';
    Promise.all([lib(), f.arrayBuffer()]).then(function (z) { var wb = new z[0].Workbook(); return wb.xlsx.load(z[1]).then(function () { return wb; }); }).then(function (wb) {
      var items = [], bad = [];
      wb.worksheets.forEach(function (ws) {
        var hdr = 0, col = {};
        for (var i = 1; i <= Math.min(12, ws.rowCount) && !hdr; i++) {
          var row = ws.getRow(i), c = {};
          row.eachCell(function (cell, n) { var t = String(cellv(cell)).trim(); if (t === 'Код') c.code = n; if (/Хүргэлтийн төлөв/.test(t)) c.status = n; if (/Gyals тайлбар/.test(t)) c.note = n; if (t === 'Утас') c.phone = n; if (t === 'Хүлээн авагч') c.name = n; });
          if (c.status && (c.code || c.phone)) { hdr = i; col = c; }
        }
        if (!hdr) return;
        for (var j = hdr + 1; j <= ws.rowCount; j++) {
          var rw = ws.getRow(j), st = String(cellv(rw.getCell(col.status)) || '').trim(); if (!st) continue;
          var code = col.code ? String(cellv(rw.getCell(col.code)) || '').trim().toLowerCase() : '', ph = col.phone ? String(cellv(rw.getCell(col.phone)) || '').replace(/\D/g, '') : '';
          if (!/^[0-9a-f]{8}$/.test(code) && ph.length !== 8) continue; // гарчиг/нийлбэр мөр
          var hit = code && GX.codes[code];
          if (!hit && ph) { var ks = Object.keys(GX.codes).filter(function (kk) { return String(GX.codes[kk].phone).replace(/\D/g, '') === ph && ['order', 'confirmed'].indexOf(GX.codes[kk].stage) >= 0; }); if (ks.length === 1) hit = GX.codes[ks[0]]; }
          var note = col.note ? String(cellv(rw.getCell(col.note)) || '').trim() : '';
          if (hit) items.push({ id: hit.id, name: hit.name, phone: hit.phone, status: st, note: note }); else bad.push((code || ph || ('мөр ' + j)) + ' · ' + st);
        }
      });
      if (!items.length) { prev.innerHTML = '<span class="sm" style="color:#d64b4b">⚠️ Файлд «Хүргэлтийн төлөв» бөглөгдсөн мөр олдсонгүй' + (bad.length ? ' (танигдаагүй: ' + e(bad.join(', ')) + ')' : '') + '</span>'; return; }
      var cnt = { d: 0, p: 0, c: 0, x: 0 }; items.forEach(function (it) { var s = it.status.toLowerCase(); if (/хүрг/.test(s)) cnt.d++; else if (/хойш/.test(s)) cnt.p++; else if (/цуц|татгал|буц/.test(s)) cnt.c++; else cnt.x++; });
      prev.innerHTML = '<table><tr><th>Хэн</th><th>Утас</th><th>Gyals төлөв</th><th>Тайлбар</th></tr>' + items.map(function (it) { return '<tr><td>' + e(it.name || '—') + '</td><td>' + e(it.phone) + '</td><td><b>' + e(it.status) + '</b></td><td>' + e(it.note) + '</td></tr>'; }).join('') + '</table>'
        + (bad.length ? '<div class="sm" style="color:#d64b4b">Танигдаагүй мөр: ' + e(bad.join(', ')) + '</div>' : '')
        + '<div style="margin-top:6px"><button class="btn go" id="gx-apply">✓ ' + items.length + ' мөрийг оруулах</button> <span class="sm mut">Хүргэсэн ' + cnt.d + ' · Хойшилсон ' + cnt.p + ' · Цуцалсан ' + cnt.c + (cnt.x ? ' · танигдаагүй ' + cnt.x : '') + '</span></div>';
      document.getElementById('gx-apply').addEventListener('click', function () {
        var btn = this; btn.disabled = true; var ok = 0, fail = [];
        items.reduce(function (pr, it) { return pr.then(function () { return post({ action: 'order', order_id: it.id, do: 'gyals', status: it.status, note: it.note || undefined, by: 'gyals тайлан' }, null, null).then(function () { ok++; }).catch(function (x) { fail.push((it.name || it.phone) + ': ' + (x.message || 'алдаа')); }); }); }, Promise.resolve())
          .then(function () { say('out-o', 'Gyals тайлан: ' + ok + ' мөр орлоо' + (fail.length ? ' · алдаа ' + fail.length + ': ' + fail.join('; ') : ''), fail.length > 0); reload(1500); });
      });
    }).catch(function (x) { prev.innerHTML = '<span class="sm" style="color:#d64b4b">⚠️ ' + e(x.message || String(x)) + '</span>'; });
  });
}
