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
    + '})();</script></body></html>');
  return out.join('');
}
