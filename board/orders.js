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
  const SRC = { ad: 'зар', web: 'вэб', chat: 'чат', ig: 'IG чат', comment: 'сэтгэгдэл', fb: 'FB', bio: 'bio холбоос', organic: 'органик' };
  const STG = { lead: 'сонирхол', order: 'хаягтай', confirmed: 'баталгаажсан', delivered: 'хүргэгдсэн', paid: 'төлсөн', cancelled: 'цуцлагдсан', test: 'тест', duplicate: 'давхардал' };
  const anyFilter = ['slug', 'product_id', 'page_id', 'creative_id', 'source', 'test_id', 'stage', 'q', 'from', 'to', 'include_test'].some((k) => has(Q[k]));

  const out = [];
  const o = (s) => out.push(s);
  o('<!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Starshopping · Захиалга</title>');
  o('<style>'
    + '.w{max-width:1240px;margin:0 auto;padding:14px 16px 60px}'
    + '.nav{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 6px}.nav a{padding:8px 14px;border-radius:999px;border:1px solid var(--ln);background:var(--s1);color:var(--ink2);text-decoration:none;font-size:13px;font-weight:600}.nav a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
    + '.kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:12px 0 10px}.kp div{background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:10px 12px}.kp b{display:block;font-size:22px;line-height:1.1}.kp span{font-size:11.5px;color:var(--mut)}.kp .warn b{color:var(--warn,#b45309)}.kp .crit b{color:var(--crit,#b91c1c)}.kp .ok b{color:#2f7d4f}.kp .info b{color:var(--blue,#1f5fb0)}'
    + '.flt{display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:10px 12px;margin:8px 0 14px}.flt select,.flt input{box-sizing:border-box;padding:6px 8px;border:1px solid var(--ln2);border-radius:8px;background:var(--bg);color:var(--ink);font:12.5px system-ui,sans-serif;max-width:100%}.flt label{font-size:12px;color:var(--mut);display:flex;gap:4px;align-items:center}.flt .sep{flex-basis:100%;height:0}'
    + 'table.ot{width:100%;table-layout:fixed;border-collapse:collapse;font-size:12.5px;background:var(--s1);border:1px solid var(--ln);border-radius:12px;overflow:hidden}table.ot th{background:var(--s2);text-align:left;padding:8px 8px;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--mut)}table.ot td{padding:8px;border-top:1px solid var(--ln3);vertical-align:top;overflow-wrap:anywhere;white-space:normal;border-bottom:0}table.ot tr.done td{color:var(--mut)}table.ot tr.call td{background:rgba(31,95,176,.07)}'
    + '.pill{display:inline-block;max-width:100%;white-space:normal;padding:2px 7px;border-radius:999px;font-size:11px;font-weight:600;background:var(--s2);color:var(--ink2);margin:1px 2px 1px 0}.pill.ok{background:rgba(34,197,94,.16);color:#2e9a5a}.pill.warn{background:rgba(245,158,11,.18);color:#c27a06}.pill.crit{background:rgba(239,68,68,.16);color:#d64b4b}.pill.info{background:rgba(59,130,246,.16);color:#4f8ddc}.pill.gold{background:var(--gold-a);color:var(--gold)}'
    + '.btn{padding:5px 9px;border:1px solid var(--ln2);border-radius:8px;background:var(--s1);color:var(--ink);font:600 12px system-ui,sans-serif;cursor:pointer;margin:1px 2px 1px 0}.btn.go{background:var(--ink);color:var(--bg);border-color:var(--ink)}.btn.stop{color:#d64b4b;border-color:rgba(239,68,68,.45)}.btn:disabled{opacity:.5;cursor:default}'
    + '.tw{overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:12px}td.acts{white-space:normal}@media(max-width:820px){table.ot{table-layout:auto;min-width:900px}}'
    + '.frm{display:none;margin-top:6px;padding:8px;background:var(--s2);border-radius:8px}.frm.on{display:block}.frm input,.frm select{box-sizing:border-box;padding:6px 8px;border:1px solid var(--ln2);border-radius:6px;background:var(--bg);color:var(--ink);font:13px system-ui,sans-serif;margin:2px 4px 2px 0;max-width:100%}.frm .sug{margin-top:4px}.frm .sug button{margin:2px}'
    + '.out{display:none;margin:6px 0;font-size:12.5px}.out.on{display:block}.mut{color:var(--mut)}.sm{font-size:11.5px}'
    + 'h2{font-size:15px;margin:22px 0 8px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}h2 .cnt{font-size:12px;color:var(--mut);font-weight:500}'
    + 'details.more{margin-top:4px}details.more summary{cursor:pointer;font-size:11.5px;color:var(--mut)}details.more div{font-size:11.5px;color:var(--ink2);margin-top:3px}'
    + '.callbox{background:rgba(31,95,176,.08);border:1px solid rgba(31,95,176,.35);border-radius:12px;padding:10px 12px;margin:8px 0 12px;font-size:13px}.callbox b{display:block;margin-bottom:4px}'
    + 'footer{margin:26px 0 10px;font-size:12px;color:var(--mut)}'
    + '</style></head><body><div class="w">');

  // ── толгой + навигаци (C0: Нүүр·Тест / Захиалга / Мөнгө / Нөөц·PO / Судалгаа)
  o('<header><div class="hd"><div class="bm">S</div><div><div class="bt">Starshopping</div>');
  o('<div class="bs">захиалга · ' + esc(String(d.generated_at || '').replace('T', ' ').slice(0, 16)) + ' UTC</div></div>');
  o('<div class="sp"></div><a class="rf" href="">Шинэчлэх</a></div></header>');
  o('<nav class="nav"><a href="/board/' + (themeQ ? '?theme=' + themeQ : '') + '">Нүүр · Тест</a>'
    + '<a class="on" href="/board/?view=orders' + tq + '">Захиалга</a>'
    + '<a href="/board/?view=ops&amp;tab=cash' + tq + '">Мөнгө</a>'
    + '<a href="/board/?view=ops&amp;tab=stock' + tq + '">Нөөц · PO</a>'
    + '<a href="/board/?view=research&amp;tab=rank' + tq + '">Судалгаа</a></nav>');

  // ── тоонууд (шүүсэн олонлог)
  o('<div class="kp">'
    + '<div class="ok"><b>' + n(C.addressed) + '</b><span>хаягтай захиалга · ' + big(C.amount_addressed) + '₮</span></div>'
    + '<div class="' + (n(C.lead) ? 'warn' : '') + '"><b>' + n(C.lead) + '</b><span>сонирхол (утас/нэр л)</span></div>'
    + '<div><b>' + n(C.confirmed) + '</b><span>баталгаажсан</span></div>'
    + '<div class="info"><b>' + n(C.paid) + '</b><span>төлсөн · ' + big(C.amount_paid) + '₮</span></div>'
    + '<div class="' + (n(C.cancelled) ? 'crit' : '') + '"><b>' + n(C.cancelled) + '</b><span>цуцлагдсан</span></div>'
    + (n(C.call_ready) ? '<div class="info"><b>' + n(C.call_ready) + '</b><span>залгах (WIN/амьд бараа)</span></div>' : '')
    + '</div>');

  // ── шүүлт (GET маягт — URL дээр үлдэнэ, хуваалцаж болно)
  const sel = (name, label, items, val, lab) => {
    let h = '<label>' + label + ' <select name="' + name + '"><option value="">бүгд</option>';
    items.forEach((it) => { const v = it.v, t = it.t; h += '<option value="' + esc(v) + '"' + (String(val || '') === String(v) ? ' selected' : '') + '>' + esc(t) + '</option>'; });
    return h + '</select></label>';
  };
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
  o('<button class="btn go">Шүүх</button>' + (anyFilter ? ' <a class="btn" href="/board/?view=orders' + tq + '" style="text-decoration:none">Цэвэрлэх</a>' : '') + '<span class="sm mut" style="margin-left:auto">сүүлийн ' + n(FL.days || 60) + ' хоног' + (Q.from || Q.to ? ' (огноогоор)' : '') + '</span></form>');
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
    }
    if (r.needs_review && r.review_reason) st.push('<span class="pill warn" title="' + esc(r.review_reason) + '">⚑ ' + esc(String(r.review_reason).slice(0, 26)) + '</span>');
    const addr = r.has_address
      ? esc(r.district || '') + (r.address ? '<br><span class="sm mut">' + esc(r.address) + '</span>' : '')
      : '<span class="pill crit">хаяггүй</span>' + (r.address ? '<br><span class="sm mut">' + esc(r.address) + '</span>' : '');
    const cls = (kind === 'other' ? 'done' : '') + (r.stage === 'lead' && r.call_ready ? ' call' : '');
    let h = '<tr class="' + cls + '" data-keep="o-' + esc(r.order_id) + '"><td>' + dt(r.placed_at) + '<br><span class="sm mut">' + esc(ago(r.placed_at)) + '</span></td>'
      + '<td>' + srcCell(r) + '</td>'
      + '<td><b>' + esc(r.customer || '—') + '</b><br><a href="tel:' + esc(r.phone) + '">' + esc(r.phone || '') + '</a></td>'
      + '<td>' + esc(String(r.product || '').split(' · ')[0]) + (r.variant ? ' <b>' + esc(r.variant) + '</b>' : '') + (n(r.qty) > 1 ? ' ×' + n(r.qty) : '') + '<br><span class="sm mut">' + mnt(r.amount_mnt) + '</span></td>'
      + '<td>' + addr + '</td><td>' + st.join('') + more(r) + '</td><td class="acts">';
    const id = esc(r.order_id);
    if (kind === 'lead') {
      h += '<button class="btn go oa" data-id="' + id + '" data-do="addr">Хаяг оруулах</button>'
        + '<button class="btn stop oa" data-id="' + id + '" data-do="cancel" title="Авахгүй гэвэл">Цуцлах</button>' + addrForm(r);
    } else if (kind === 'addressed') {
      if (r.stage === 'order') h += '<button class="btn go oa" data-id="' + id + '" data-do="confirm" title="Утсаар ярьж баталгаажуулсан">Батлах</button>';
      if (['order', 'confirmed'].indexOf(r.stage) >= 0) {
        if (!r.shipped_at) h += '<button class="btn oa" data-id="' + id + '" data-do="shipped" title="Гялс/хүргэгчид өгсөн">Ачсан</button>';
        h += '<button class="btn oa" data-id="' + id + '" data-do="paid" title="Хүргэгдэж төлбөр авсан (COD)">Төлсөн</button>';
      }
      if (r.stage === 'delivered') h += '<button class="btn go oa" data-id="' + id + '" data-do="paid">Төлбөр бүртгэх</button>';
      if (['order', 'confirmed', 'delivered'].indexOf(r.stage) >= 0) h += '<button class="btn oa" data-id="' + id + '" data-do="addr">Хаяг засах</button><button class="btn stop oa" data-id="' + id + '" data-do="cancel">Цуцлах</button>';
      h += addrForm(r);
    }
    return h + '</td></tr>';
  };
  const table = (rows, kind, empty) => {
    o('<div class="tw"><table class="ot"><colgroup><col style="width:8%"><col style="width:11%"><col style="width:13%"><col style="width:17%"><col style="width:18%"><col style="width:15%"><col style="width:18%"></colgroup><thead><tr><th>Огноо</th><th>Эх үүсвэр</th><th>Хэн</th><th>Бараа</th><th>Хаяг</th><th>Төлөв</th><th>Үйлдэл</th></tr></thead><tbody>');
    rows.forEach((r) => o(row(r, kind)));
    if (!rows.length) o('<tr><td colspan="7" class="mut">' + empty + '</td></tr>');
    o('</tbody></table></div>');
  };

  // ── 1 · Хаягтай захиалга
  o('<h2>Хаягтай захиалга <span class="cnt">' + addressed.length + ' · ' + big(addressed.reduce((s, r) => s + n(r.amount_mnt), 0)) + '₮</span></h2>');
  table(addressed, 'addressed', 'Шүүлтэд таарах хаягтай захиалга алга');

  // ── 2 · Сонирхол (хаяггүй). WIN/амьд бараа руу залгах жагсаалт дээр нь
  o('<h2>Сонирхол — утас/нэр үлдээсэн, хаяггүй <span class="cnt">' + leads.length + '</span></h2>');
  if (CALL.length) o('<div class="callbox"><b>📞 Залгах жагсаалт · ' + CALL.length + ' хүн (WIN эсвэл амьд бараа)</b>Залгаад хаягаа өгвөл «Хаяг оруулах» → захиалга болж баталгаажна. Авахгүй гэвэл «Цуцлах». SMS явахгүй — эзэн өөрөө залгана.</div>');
  else o('<p class="sm mut">Залгах жагсаалт хоосон: эдгээр бараа WIN болоогүй / бараа ирээгүй. LOSS барааны сонирхогчид юу ч илгээхгүй.</p>');
  table(leads.slice().sort((a, b) => (b.call_ready ? 1 : 0) - (a.call_ready ? 1 : 0) || new Date(b.placed_at) - new Date(a.placed_at)), 'lead', 'Хаяггүй сонирхол алга');

  // ── 3 · Цуцлагдсан / тест (нуусан)
  if (others.length) {
    o('<details data-keep="others"><summary style="cursor:pointer;font-size:13.5px;font-weight:600;margin:18px 0 8px">Цуцлагдсан · тест · давхардал (' + others.length + ')</summary>');
    table(others, 'other', '');
    o('</details>');
  }
  o('<datalist id="dl-d"></datalist>');
  o('<footer>Блок C1 · захиалга = дүүрэг/хороо + хаяг (B1). Хаяг оруулах = захиалга + баталгаажсан. Төлсөн = хүргэгдэж мөнгөө авсан (COD). Цуцлах → нөөц дэвтэрт буцна. Шүүлт URL дээр хадгалагдана — хуваалцаж болно.</footer></div>');

  // ── үйлдлүүд
  o('<script>(function(){var U="https://starshopping.app.n8n.cloud/webhook/board-data",k="";try{k=localStorage.getItem("ss_board_key")||""}catch(x){}'
    + 'function e(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]})}'
    + 'function say(id,msg,bad){var o=document.getElementById(id);if(!o)return;o.className="out on";o.innerHTML=(bad?"⚠️ ":"✅ ")+e(msg);o.scrollIntoView({block:"nearest"})}'
    + 'function post(b,btn,out){if(btn){btn.disabled=true;btn.dataset.tx=btn.textContent;btn.textContent="…"}'
    + 'return fetch(U+"?k="+encodeURIComponent(k),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)})'
    + '.then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}).then(function(j){if(!j||j.ok===false){var x=new Error((j&&(j.error||j.message))||"алдаа");x.j=j;throw x}return j})'
    + '.catch(function(x){if(btn){btn.disabled=false;btn.textContent=btn.dataset.tx}if(out)say(out,x.message,true);throw x})}'
    + 'function reload(ms){setTimeout(function(){if(window.ssRefresh)window.ssRefresh();else location.reload()},ms||500)}'
    + 'document.querySelectorAll(".oa").forEach(function(b){b.addEventListener("click",function(){var id=b.dataset.id,d=b.dataset.do;'
    + 'if(d==="addr"){var f=document.getElementById("f-"+id);f.classList.toggle("on");if(f.classList.contains("on")){var s=document.getElementById("d-"+id);if(s&&!s.value)s.focus()}return}'
    + 'var note;if(d==="cancel"){note=prompt("Цуцлах шалтгаан (сонголттой):","");if(note===null)return}'
    + 'if(d==="paid"&&!confirm("Хүргэгдэж, төлбөрөө бүрэн авсан уу?"))return;'
    + 'post({action:"order",order_id:id,do:d,note:note||undefined,by:"самбар"},b,"out-o").then(function(j){say("out-o",{confirm:"Баталгаажлаа",cancel:"Цуцлагдлаа",shipped:"Ачсан гэж тэмдэглэв",paid:"Төлбөр бүртгэгдлээ ✓ "+(j.paid_mnt?Number(j.paid_mnt).toLocaleString("en-US")+"₮":"")}[d]||"OK");reload()}).catch(function(){})})});'
    + 'document.querySelectorAll(".osave").forEach(function(b){b.addEventListener("click",function(){var id=b.dataset.id,dv=(document.getElementById("d-"+id).value||"").trim(),av=(document.getElementById("a-"+id).value||"").trim(),nv=(document.getElementById("n-"+id).value||"").trim();'
    + 'if(!dv||!av){say("out-o","Дүүрэг/хороо ба байр-тоот хоёулаа хэрэгтэй",true);return}'
    + 'post({action:"order",order_id:id,do:"address",district_full:dv,address_detail:av,note:nv||undefined,by:"самбар"},b,"out-o").then(function(){say("out-o","Хаяг хадгалагдлаа — захиалга баталгаажлаа ✓");reload()})'
    + '.catch(function(x){var sg=x.j&&x.j.suggest;if(sg&&sg.length){var box=document.getElementById("s-"+id);box.innerHTML="Ойролцоо: "+sg.slice(0,12).map(function(s){return "<button class=\\"btn\\" data-v=\\""+e(s)+"\\">"+e(s)+"</button>"}).join("");box.querySelectorAll("button").forEach(function(sb){sb.addEventListener("click",function(){var s=document.getElementById("d-"+id);s.value=sb.dataset.v;box.innerHTML=""})})}})})});'
    + '})();</script></body></html>');
  return out.join('');
}
