/* Самбар · ЗАХИАЛГА · НӨӨЦ · МӨНГӨ (блок BF, 2026-10-01)
   Өгөгдөл: ?view=ops → orders_board() + extra stock → stock_position(), cash → cash_view().
   Товч бүр = нэг RPC: POST action=order (order_action) | receive (goods_receive) | po (po_upsert) | cash (cash_add).
   Зарчим: захиалга = дүүрэг/хороо + хаягтай нь л захиалга; утас/нэр үлдээсэн нь «хаяггүй» тусдаа тоологдоно.
   Бараа ирэхэд «Хүлээн авах» нэг маягт: SKU бүрийн тоо → дэвтэр → хуваарилалт → SMS автоматаар. */
function renderOps(DATA, QUERY) {
  const d = DATA || {};
  const Q = QUERY || {};
  const tab = ['orders', 'stock', 'cash'].indexOf(Q.tab) >= 0 ? Q.tab : 'orders';
  const themeQ = Q.theme === 'dark' || Q.theme === 'light' ? Q.theme : '';
  const tq = themeQ ? '&theme=' + themeQ : '';
  const A = (v) => (Array.isArray(v) ? v : []);
  const n = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v));
  const has = (v) => v !== null && v !== undefined && v !== '';
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const mnt = (v) => (has(v) ? Math.round(n(v)).toLocaleString('en-US') + '₮' : '—');
  const big = (v) => { if (!has(v)) return '—'; const x = n(v); return x >= 1e6 ? (x / 1e6).toFixed(2).replace(/\.?0+$/, '') + ' сая' : Math.round(x).toLocaleString('en-US'); };
  const dt = (s) => { if (!s) return '—'; const t = new Date(s); if (isNaN(t)) return String(s).slice(0, 10); return t.toLocaleString('en-GB', { timeZone: 'Asia/Ulaanbaatar', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ''); };
  const day = (s) => (s ? String(s).slice(5, 10).replace('-', '/') : '—');

  const C = d.counts || {}, ST = d.stock || {}, CA = d.cash || {};
  const SP = A(ST.products), POS = A(ST.pos), O = A(d.orders);
  const alerts = SP.filter((p) => p.alert && (n(p.committed) > 0 || n(p.rate7) > 0)); // эрэлтгүй хуучин бараа дуугарахгүй (BF.1)

  const out = [];
  const o = (s) => out.push(s);
  o('<!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Starshopping · Захиалга</title>');
  o('<style>'
    + '.w{max-width:1180px;margin:0 auto;padding:14px 16px 60px}'
    + '.nav{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 6px}.nav a{padding:8px 14px;border-radius:999px;border:1px solid var(--ln);background:var(--s1);color:var(--ink2);text-decoration:none;font-size:13px;font-weight:600}.nav a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
    + '.tabs{display:flex;gap:6px;margin:10px 0 16px;flex-wrap:wrap}.tabs a{padding:8px 14px;border:1px solid var(--ln2);border-radius:999px;text-decoration:none;color:var(--ink2);font-size:13px;font-weight:600;background:var(--s1)}.tabs a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
    + '.kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:10px 0 14px}.kp div{background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:10px 12px}.kp b{display:block;font-size:22px;line-height:1.1}.kp span{font-size:11.5px;color:var(--mut)}.kp .warn b{color:var(--warn,#b45309)}.kp .crit b{color:var(--crit,#b91c1c)}.kp .ok b{color:#2f7d4f}'
    + '.al{background:rgba(245,158,11,.13);border:1px solid rgba(245,158,11,.4);border-radius:10px;padding:10px 12px;margin:8px 0;font-size:13px;color:var(--ink)}.al b{display:block}'
    + 'table.ot{width:100%;table-layout:fixed;border-collapse:collapse;font-size:12.5px;background:var(--s1);border:1px solid var(--ln);border-radius:12px;overflow:hidden}table.ot th{background:var(--s2);text-align:left;padding:8px 8px;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--mut)}table.ot td{padding:8px;border-top:1px solid var(--ln3);vertical-align:top;overflow-wrap:anywhere}table.ot tr.done td{color:var(--mut)}table.ot tr.inc td{background:rgba(245,158,11,.07)}'
    + '.pill{display:inline-block;max-width:100%;white-space:normal;padding:2px 7px;border-radius:999px;font-size:11px;font-weight:600;background:var(--s2);color:var(--ink2);margin:1px 2px 1px 0}.pill.ok{background:rgba(34,197,94,.16);color:#2e9a5a}.pill.warn{background:rgba(245,158,11,.18);color:#c27a06}.pill.crit{background:rgba(239,68,68,.16);color:#d64b4b}.pill.info{background:rgba(59,130,246,.16);color:#4f8ddc}'
    + '.btn{padding:5px 9px;border:1px solid var(--ln2);border-radius:8px;background:var(--s1);color:var(--ink);font:600 12px system-ui,sans-serif;cursor:pointer;margin:1px 2px 1px 0}.btn.go{background:var(--ink);color:var(--bg);border-color:var(--ink)}.btn.stop{color:#d64b4b;border-color:rgba(239,68,68,.45)}.btn:disabled{opacity:.5;cursor:default}'
    + '.tw{overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:12px}.act{white-space:normal}@media(max-width:820px){table.ot{table-layout:auto;min-width:860px}}.frm{display:none;margin-top:6px;padding:8px;background:var(--s2);border-radius:8px}.frm.on{display:block}.frm input,.frm select,.frm textarea{box-sizing:border-box;padding:6px 8px;border:1px solid var(--ln2);border-radius:6px;background:var(--bg);color:var(--ink);font:13px system-ui,sans-serif;margin:2px 4px 2px 0;max-width:100%}'
    + '.out{display:none;margin:6px 0;font-size:12.5px}.out.on{display:block}.mut{color:var(--mut)}.sm{font-size:11.5px}'
    + 'h2{font-size:15px;margin:22px 0 8px}h3{font-size:13.5px;margin:14px 0 6px}'
    + '.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:820px){.grid2{grid-template-columns:1fr}table.ot{font-size:12px}.kp b{font-size:18px}}'
    + '.po{background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:10px 12px;margin:8px 0}.po .hdp{display:flex;gap:10px;flex-wrap:wrap;align-items:baseline}.po .hdp b{font-size:13.5px}.po table{width:100%;font-size:12.5px;border-collapse:collapse;margin-top:6px}.po td,.po th{padding:4px 6px;border-top:1px solid var(--ln3);text-align:left}.po input.q{width:64px}'
    + '.cash{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.cash div{background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:10px 12px}.cash b{display:block;font-size:18px}.cash span{font-size:11.5px;color:var(--mut)}'
    + 'footer{margin:26px 0 10px;font-size:12px;color:var(--mut)}'
    + '</style></head><body><div class="w">');

  // ── толгой + навигаци
  o('<header><div class="hd"><div class="bm">S</div><div><div class="bt">Starshopping</div>');
  o('<div class="bs">захиалга · нөөц · мөнгө · ' + esc(String(d.generated_at || '').replace('T', ' ').slice(0, 16)) + ' UTC</div></div>');
  o('<div class="sp"></div><a class="rf" href="">Шинэчлэх</a></div></header>');
  o('<nav class="nav"><a href="/board/' + (themeQ ? '?theme=' + themeQ : '') + '">Даалгавар</a>'
    + '<a href="/board/?view=research&amp;tab=rank' + tq + '">Судалгаа</a>'
    + '<a href="/board/?view=category' + tq + '">Категори</a>'
    + '<a class="on" href="/board/?view=ops' + tq + '">Захиалга</a>'
    + '<a href="/board/?view=board' + tq + '">Систем</a></nav>');
  o('<div class="tabs">'
    + '<a class="' + (tab === 'orders' ? 'on' : '') + '" href="/board/?view=ops&amp;tab=orders' + tq + '">Захиалга (' + n(C.active) + ')</a>'
    + '<a class="' + (tab === 'stock' ? 'on' : '') + '" href="/board/?view=ops&amp;tab=stock' + tq + '">Нөөц' + (alerts.length ? ' ⚠️' : '') + '</a>'
    + '<a class="' + (tab === 'cash' ? 'on' : '') + '" href="/board/?view=ops&amp;tab=cash' + tq + '">Мөнгө</a></div>');

  // ── сэрэмжлүүлэг (бүх таб дээр)
  alerts.forEach((p) => o('<div class="al"><b>' + esc(p.name) + '</b>' + esc(p.alert) + ' · чөлөөтэй ' + n(p.available) + ' · амлагдсан ' + n(p.committed) + ' · замд ' + n(p.in_transit) + (has(p.cover_days) ? ' · хүрэлцэх ' + n(p.cover_days) + ' хоног' : '') + '</div>'));

  if (tab === 'orders') {
    o('<div class="kp">'
      + '<div><b>' + n(C.active) + '</b><span>идэвхтэй захиалга (45 хоног)</span></div>'
      + '<div class="ok"><b>' + n(C.complete) + '</b><span>бүрэн (дүүрэг/хороо + хаяг)</span></div>'
      + '<div class="' + (n(C.phone_only) ? 'warn' : '') + '"><b>' + n(C.phone_only) + '</b><span>зөвхөн утас/нэр — хаяггүй</span></div>'
      + '<div><b>' + n(C.confirmed) + '</b><span>утсаар баталгаажсан</span></div>'
      + '<div class="info"><b>' + n(C.ready) + '</b><span>бараа хуваарилагдсан</span></div>'
      + '<div><b>' + n(C.shipped) + ' / ' + n(C.delivered) + '</b><span>ачсан / хүргэгдсэн</span></div>'
      + '<div class="' + (n(C.cancelled) ? 'crit' : '') + '"><b>' + n(C.cancelled) + '</b><span>цуцлагдсан</span></div></div>');
    const BP = A(d.by_product);
    if (BP.length) o('<p class="sm mut">' + BP.map((b) => esc(b.product.split(' · ')[0]) + ': ' + n(b.active) + ' идэвхтэй (бүрэн ' + n(b.complete) + ' · хаяггүй ' + n(b.phone_only) + ') · хүргэгдсэн ' + n(b.delivered)).join(' &nbsp;|&nbsp; ') + '</p>');

    o('<div class="out" id="out-o"></div>');
    o('<div class="tw"><table class="ot"><colgroup><col style="width:9%"><col style="width:13%"><col style="width:19%"><col style="width:24%"><col style="width:17%"><col style="width:18%"></colgroup><thead><tr><th>Огноо</th><th>Хэн</th><th>Бараа</th><th>Хаяг</th><th>Төлөв</th><th>Үйлдэл</th></tr></thead><tbody>');
    O.forEach((r, i) => {
      const active = ['draft', 'confirmed', 'packed'].indexOf(r.status) >= 0;
      const cls = !active ? 'done' : (!r.complete ? 'inc' : '');
      const st = [];
      if (r.status === 'delivered') st.push('<span class="pill ok">хүргэгдсэн ' + day(r.delivered_at) + '</span>');
      else if (r.status === 'shipped') st.push('<span class="pill info">ачсан ' + day(r.shipped_at) + '</span>');
      else if (['cancelled', 'returned', 'refunded'].indexOf(r.status) >= 0) st.push('<span class="pill crit">' + esc(r.status) + '</span>');
      else {
        st.push(r.confirm_state === 'confirmed' ? '<span class="pill ok">баталгаажсан</span>' : r.confirm_state === 'declined' ? '<span class="pill crit">татгалзсан</span>' : '<span class="pill">батлаагүй</span>');
        if (r.allocated || r.stock_ready_at) st.push('<span class="pill info">бараа бэлэн</span>');
        else st.push('<span class="pill warn">' + (r.mode === 'live' ? 'нөөц дутуу' : 'бараа ирээгүй') + '</span>');
        if (r.gyals_listed_at) st.push('<span class="pill">Gyals ' + day(r.gyals_listed_at) + '</span>');
      }
      if (r.needs_review && r.review_reason) st.push('<span class="pill warn" title="' + esc(r.review_reason) + '">⚑ ' + esc(String(r.review_reason).slice(0, 28)) + '</span>');
      const addr = r.complete
        ? esc(r.district) + (r.address ? '<br><span class="sm mut">' + esc(r.address) + '</span>' : '')
        : '<span class="pill crit">хаяггүй</span>' + (r.address ? '<br><span class="sm mut">' + esc(r.address) + '</span>' : '') + '<br><span class="sm mut">зөвхөн утас/нэр — захиалга биш</span>';
      o('<tr class="' + cls + '" data-keep="o-' + esc(r.order_id) + '"><td>' + dt(r.placed_at) + '<br><span class="sm mut">' + esc(r.channel) + (r.src ? ' · ' + esc(r.src) : '') + (r.creative_id ? '<br>' + esc(r.creative_id) : '') + '</span></td>'
        + '<td><b>' + esc(r.customer || '—') + '</b><br><a href="tel:' + esc(r.phone) + '">' + esc(r.phone || '') + '</a></td>'
        + '<td>' + esc((r.product || '').split(' · ')[0]) + (r.variant ? ' <b>' + esc(r.variant) + '</b>' : '') + (n(r.qty) > 1 ? ' ×' + n(r.qty) : '') + '<br><span class="sm mut">' + mnt(r.total_mnt) + '</span></td>'
        + '<td>' + addr + '</td><td>' + st.join('') + '</td><td class="act">');
      if (active) {
        if (r.confirm_state !== 'confirmed') o('<button class="btn go oa" data-id="' + esc(r.order_id) + '" data-do="confirm" title="Утсаар ярьж баталгаажуулсан">Батлах</button>');
        o('<button class="btn oa" data-id="' + esc(r.order_id) + '" data-do="addr">Хаяг</button>');
        if (r.confirm_state === 'confirmed' || r.complete) o('<button class="btn oa" data-id="' + esc(r.order_id) + '" data-do="shipped" title="Gyals/хүргэгчид өгсөн">Ачсан</button>');
        o('<button class="btn oa" data-id="' + esc(r.order_id) + '" data-do="delivered" title="Хүргэгдэж төлбөр авсан">Хүргэсэн</button>');
        o('<button class="btn stop oa" data-id="' + esc(r.order_id) + '" data-do="decline" title="Татгалзсан / цуцалсан">Цуцлах</button>');
        o('<div class="frm" id="f-' + esc(r.order_id) + '"><input list="dl-d" id="d-' + esc(r.order_id) + '" placeholder="Дүүрэг N-р хороо" value="' + esc(r.district || '') + '" size="22"> '
          + '<input id="a-' + esc(r.order_id) + '" placeholder="Байр, орц, тоот / тайлбар" value="' + esc(r.address || '') + '" size="26"> '
          + '<button class="btn go osave" data-id="' + esc(r.order_id) + '">Хадгалах</button></div>');
      } else if (r.status === 'shipped') {
        o('<button class="btn go oa" data-id="' + esc(r.order_id) + '" data-do="delivered">Хүргэсэн</button><button class="btn stop oa" data-id="' + esc(r.order_id) + '" data-do="cancel">Буцсан</button>');
      }
      o('</td></tr>');
    });
    if (!O.length) o('<tr><td colspan="6" class="mut">Захиалга алга</td></tr>');
    o('</tbody></table></div><datalist id="dl-d"></datalist>');
    o('<p class="sm mut">Батлах = утсаар ярьж баталгаажуулсан (Gyals-ийн өглөөний жагсаалтад орно). Хаяггүй захиалга хүргэлтэд орохгүй — хаягаа SMS-ээр асууж, ирмэгц «Хаяг» дээр бичнэ. Цуцлах = дэвтэрт нөөц буцна.</p>');
  }

  if (tab === 'stock') {
    SP.forEach((p) => {
      o('<h2>' + esc(p.name) + ' <span class="pill ' + (p.mode === 'live' ? 'ok' : p.mode === 'preorder' ? 'info' : '') + '">' + esc(p.mode) + '</span></h2>');
      o('<div class="kp">'
        + '<div><b>' + n(p.on_hand) + '</b><span>агуулахад</span></div>'
        + '<div><b>' + n(p.in_transit) + '</b><span>замд' + (p.next_eta ? ' · ~' + day(p.next_eta) : '') + '</span></div>'
        + '<div><b>' + n(p.committed) + '</b><span>амлагдсан (бүрэн захиалга)</span></div>'
        + '<div class="' + (n(p.available) <= 0 ? 'crit' : n(p.committed_pct) >= n(ST.cap_pct) ? 'warn' : 'ok') + '"><b>' + n(p.available) + '</b><span>чөлөөтэй' + (has(p.committed_pct) ? ' · амлагдсан ' + n(p.committed_pct) + '%' : '') + '</span></div>'
        + '<div><b>' + (has(p.rate7) ? n(p.rate7).toFixed(1) : '—') + '</b><span>захиалга/хоног (7 хоног)</span></div>'
        + '<div class="' + (has(p.cover_days) && n(p.cover_days) < n(ST.lead_days) ? 'warn' : '') + '"><b>' + (has(p.cover_days) ? n(p.cover_days) : '—') + '</b><span>хүрэлцэх хоног · тээвэр ' + n(ST.lead_days) + '</span></div>'
        + '<div><b>' + n(p.reorder_point) + '</b><span>дахин захиалах цэг (ш)</span></div>'
        + (n(p.committed_incomplete) ? '<div class="warn"><b>' + n(p.committed_incomplete) + '</b><span>хаяггүй захиалга (тооцоонд ороогүй)</span></div>' : '')
        + '</div>');
      o('<div class="tw"><table class="ot"><colgroup><col style="width:34%"><col><col><col><col><col></colgroup><thead><tr><th>Хувилбар</th><th>Агуулах</th><th>Замд</th><th>Амлагдсан</th><th>Чөлөөтэй</th><th>Хурд/хоног</th></tr></thead><tbody>');
      A(p.skus).forEach((s) => {
        const av = n(s.available);
        o('<tr><td><b>' + esc([s.color, s.size].filter(Boolean).join(' ')) + '</b> <span class="sm mut">' + esc(s.sku_id) + '</span></td><td>' + n(s.on_hand) + '</td><td>' + n(s.in_transit) + '</td><td>' + n(s.committed) + (n(s.incomplete) ? ' <span class="sm mut">(+' + n(s.incomplete) + ' хаяггүй)</span>' : '') + '</td>'
          + '<td>' + (av < 0 ? '<span class="pill crit">' + av + ' дутуу</span>' : av === 0 ? '<span class="pill warn">0</span>' : av) + '</td><td>' + (has(s.rate7) ? n(s.rate7).toFixed(1) : '—') + '</td></tr>');
      });
      o('</tbody></table></div>');
    });
    o('<p class="sm mut">Чөлөөтэй = агуулах + замд − амлагдсан. Дахин захиалах цэг = хоногийн хурд × тээврийн хоног. Эрэлт хэмжээ бүрээр өөр тул захиалгыг энэ хүснэгтээр хийнэ.</p>');

    o('<h2>1688 захиалгууд (PO)</h2><div class="out" id="out-po"></div>');
    POS.forEach((po) => {
      const open = po.status !== 'received' && po.status !== 'cancelled';
      o('<div class="po" data-keep="po-' + n(po.po_id) + '"><div class="hdp"><b>#' + n(po.po_id) + ' · ' + esc(po.product || '') + '</b><span class="pill ' + (po.status === 'received' ? 'ok' : po.status === 'shipped' || po.status === 'ereen' ? 'info' : '') + '">' + esc(po.status) + '</span>'
        + '<span class="sm mut">' + esc(po.supplier || '') + ' · ' + esc(po.ext_order_no || '') + ' · захиалсан ' + day(po.placed_on) + (po.eta ? ' · УБ-д ~' + day(po.eta) : '') + (po.tracking ? ' · ' + esc(po.tracking) : '') + (has(po.paid_usd) ? ' · $' + n(po.paid_usd) : '') + '</span></div>'
        + (po.note ? '<div class="sm mut">' + esc(po.note) + '</div>' : ''));
      o('<div class="tw"><table><tr><th>Зүйл</th><th>Захиалсан</th><th>Ирсэн</th>' + (open ? '<th>Одоо ирсэн тоо</th>' : '') + '</tr>');
      A(po.items).forEach((it) => o('<tr><td>' + esc(it.label || it.sku_id) + (it.sku_id ? '' : ' <span class="sm mut">дагалдах</span>') + '</td><td>' + n(it.qty) + '</td><td>' + n(it.received_qty) + '</td>'
        + (open ? '<td><input class="q" type="number" min="0" max="' + n(it.qty) + '" data-po="' + n(po.po_id) + '" data-item="' + n(it.id) + '" placeholder="' + (n(it.qty) - n(it.received_qty)) + '"></td>' : '') + '</tr>'));
      o('</table></div>');
      if (open) o('<div style="margin-top:8px"><button class="btn go recv" data-po="' + n(po.po_id) + '">Бараа хүлээн авах → дэвтэр + хуваарилалт + SMS</button> '
        + '<button class="btn pst" data-po="' + n(po.po_id) + '" data-st="shipped">ачигдсан</button><button class="btn pst" data-po="' + n(po.po_id) + '" data-st="ereen">Эрээнд</button>'
        + '<input id="eta-' + n(po.po_id) + '" type="date" value="' + esc(po.eta || '') + '" title="УБ-д ирэх"><button class="btn pst" data-po="' + n(po.po_id) + '" data-st="eta">ETA хадгалах</button></div>');
      o('</div>');
    });
    o('<details class="po"><summary><b>+ Шинэ 1688 захиалга бүртгэх</b></summary><div class="frm on" id="po-new">'
      + '<input id="pn-no" placeholder="1688 захиалгын №" size="22"> <input id="pn-sup" placeholder="Нийлүүлэгч" size="18"> <input id="pn-slug" placeholder="product slug (Halaaguurtai-hantaaz)" size="26"> <input id="pn-eta" type="date" title="УБ-д ирэх"> <input id="pn-usd" type="number" step="0.01" placeholder="Төлсөн $"><br>'
      + '<textarea id="pn-items" rows="3" cols="60" placeholder="мөр бүрт: sku_id (эсвэл нэр) , тоо , нэгж ¥&#10;halaaguurtai-hantaaz-har-2xl, 26, 40&#10;Power bank 10000mAh хар, 61, 16"></textarea><br>'
      + '<button class="btn go" id="pn-save">Бүртгэх</button></div></details>');
  }

  if (tab === 'cash') {
    const S = CA.spend || {}, R = CA.revenue || {};
    o('<p class="sm mut">Сүүлийн ' + n(CA.days) + ' хоног. Хүлээгдэж буй орлого = бүрэн захиалга × үнэ × ' + n(CA.assumed_delivery_pct) + '% (таамаг — 20 хүргэлтээс хойш бодитоор солино). Зар = ad_spend (автомат), багц = system_costs.</p>');
    o('<div class="cash">'
      + '<div class="crit"><b>' + big(CA.spend_total) + '</b><span>нийт зарлага ₮</span></div>'
      + '<div><b>' + big(S.purchase) + '</b><span>бараа (1688)</span></div>'
      + '<div><b>' + big(S.ads) + '</b><span>зар</span></div>'
      + '<div><b>' + big(n(S.cargo) + n(S.delivery)) + '</b><span>карго + хүргэлт</span></div>'
      + '<div><b>' + big(n(S.subscription) + n(S.system) + n(S.other)) + '</b><span>багц + систем + бусад</span></div>'
      + '<div class="ok"><b>' + big(R.delivered) + '</b><span>хүргэгдсэн орлого · ' + n(R.delivered_n) + ' зах.</span></div>'
      + '<div><b>' + big(R.pipeline_expected) + '</b><span>хүлээгдэж буй · ' + n(R.pipeline_n) + ' бүрэн зах. (нийт ' + big(R.pipeline_gross) + ')</span></div>'
      + '<div class="' + (n(CA.net_expected) < 0 ? 'warn' : 'ok') + '"><b>' + big(CA.net_expected) + '</b><span>цэвэр (хүлээгдэж буй − зарлага)</span></div></div>');
    o('<h3>Зарлага нэмэх</h3><div class="frm on"><select id="c-kind"><option value="purchase">бараа (1688)</option><option value="cargo">карго Эрээн→УБ</option><option value="subscription">сарын багц (n8n, Higgsfield, домэйн…)</option><option value="delivery">хүргэлт</option><option value="other">бусад</option></select> '
      + '<input id="c-amt" type="number" step="0.01" placeholder="дүн"> <select id="c-cur"><option>MNT</option><option>USD</option><option>CNY</option></select> <input id="c-d" type="date"> <input id="c-ref" placeholder="лавлах (захиалгын №, сар)" size="18"> <input id="c-note" placeholder="тайлбар" size="22"> <button class="btn go" id="c-save">Нэмэх</button><div class="out" id="out-c"></div></div>');
    o('<div class="tw"><table class="ot"><thead><tr><th>Огноо</th><th>Төрөл</th><th>Дүн</th><th>₮</th><th>Лавлах · тайлбар</th></tr></thead><tbody>');
    A(CA.entries).forEach((e) => o('<tr><td>' + esc(e.d) + '</td><td>' + esc(e.kind) + '</td><td>' + n(e.amount).toLocaleString('en-US') + ' ' + esc(e.currency) + '</td><td>' + mnt(e.amount_mnt) + '</td><td>' + esc(e.ref || '') + (e.note ? ' · ' + esc(e.note) : '') + '</td></tr>'));
    if (!A(CA.entries).length) o('<tr><td colspan="5" class="mut">Бичилт алга</td></tr>');
    o('</tbody></table></div>');
  }

  o('<footer>Блок BF · захиалга = дүүрэг/хороо + хаяг. Бараа ирэхэд «Хүлээн авах» дармагц: SKU дэвтэр → бүрэн захиалгуудад FIFO → SMS (ирлээ / дараагийн ачаа / хаягаа илгээнэ үү).</footer></div>');

  // ── үйлдлүүд
  o('<script>(function(){var U="https://starshopping.app.n8n.cloud/webhook/board-data",k="";try{k=localStorage.getItem("ss_board_key")||""}catch(x){}'
    + 'var SB="https://tdnjnqftxschbliumwwm.supabase.co/rest/v1/rpc/web_districts?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbmpucWZ0eHNjaGJsaXVtd3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNzExNTgsImV4cCI6MjEwNDk0NzE1OH0.lND_YBbjyCNT-yIa27OZ3V-1_fn76i9JUYrOfrXbC1w";'
    + 'function e(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]})}'
    + 'function say(id,msg,bad){var o=document.getElementById(id);if(!o)return;o.className="out on";o.innerHTML=(bad?"⚠️ ":"✅ ")+e(msg)}'
    + 'function post(b,btn,out){if(btn){btn.disabled=true;btn.dataset.tx=btn.textContent;btn.textContent="…"}'
    + 'return fetch(U+"?k="+encodeURIComponent(k),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)})'
    + '.then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}).then(function(j){if(!j||j.ok===false)throw new Error((j&&(j.error||j.message))||"алдаа");return j})'
    + '.catch(function(x){if(btn){btn.disabled=false;btn.textContent=btn.dataset.tx}if(out)say(out,x.message,true);throw x})}'
    + 'function reload(ms){setTimeout(function(){if(window.ssRefresh)window.ssRefresh();else location.reload()},ms||500)}'
    // дүүрэг/хорооны жагсаалт (anon RPC) — datalist
    + 'var dl=document.getElementById("dl-d");if(dl){fetch(SB).then(function(r){return r.json()}).then(function(ds){var h="";(ds||[]).forEach(function(d){(d.khoroos||[]).forEach(function(kh){h+="<option value=\\""+e(kh.full)+"\\">"})});dl.innerHTML=h}).catch(function(){})}'
    // захиалгын үйлдэл
    + 'document.querySelectorAll(".oa").forEach(function(b){b.addEventListener("click",function(){var id=b.dataset.id,d=b.dataset.do;'
    + 'if(d==="addr"){var f=document.getElementById("f-"+id);f.classList.toggle("on");return}'
    + 'var note=null;if(d==="decline"||d==="cancel"){note=prompt(d==="decline"?"Татгалзсан шалтгаан (сонголттой):":"Буцаасан шалтгаан:","");if(note===null)return}'
    + 'if(d==="delivered"&&!confirm("Хүргэгдэж, төлбөр авсан уу?"))return;'
    + 'post({action:"order",order_id:id,do:d,note:note||undefined},b,"out-o").then(function(j){say("out-o",{confirm:"Баталгаажлаа",decline:"Цуцлагдлаа — нөөц буцлаа",shipped:"Ачсан гэж тэмдэглэв",delivered:"Хүргэгдсэн ✓",cancel:"Буцаалт тэмдэглэв"}[d]||"OK");reload()})})});'
    + 'document.querySelectorAll(".osave").forEach(function(b){b.addEventListener("click",function(){var id=b.dataset.id,dv=document.getElementById("d-"+id).value.trim(),av=document.getElementById("a-"+id).value.trim();'
    + 'if(!dv){say("out-o","Дүүрэг/хороог жагсаалтаас сонгоно уу",true);return}'
    + 'post({action:"order",order_id:id,do:"address",district_full:dv,address_detail:av},b,"out-o").then(function(){say("out-o","Хаяг хадгалагдлаа");reload()})})});'
    // хүлээн авалт
    + 'document.querySelectorAll(".recv").forEach(function(b){b.addEventListener("click",function(){var po=b.dataset.po,items=[];'
    + 'document.querySelectorAll("input.q[data-po=\\""+po+"\\"]").forEach(function(i){var v=parseInt(i.value,10);if(v>0)items.push({id:Number(i.dataset.item),qty:v})});'
    + 'if(!items.length){say("out-po","Ирсэн тоог мөр бүрт бичнэ үү (хоосон = ирээгүй)",true);return}'
    + 'if(!confirm("Хүлээн авах: "+items.reduce(function(s,x){return s+x.qty},0)+" ш. Дэвтэрт бичиж, бүрэн захиалгуудад хуваарилж, SMS дараалалд оруулна. Үргэлжлүүлэх үү?"))return;'
    + 'post({action:"receive",po_id:Number(po),items:items,by:"самбар"},b,"out-po").then(function(j){say("out-po","Ирсэн "+j.received+" ш · хуваарилагдсан захиалга "+j.allocated_orders+" · SMS дараалалд "+j.queued_sms);reload(1200)})})});'
    + 'document.querySelectorAll(".pst").forEach(function(b){b.addEventListener("click",function(){var po=Number(b.dataset.po),st=b.dataset.st,body={action:"po",po_id:po};'
    + 'if(st==="eta"){var v=(document.getElementById("eta-"+po)||{}).value;if(!v){say("out-po","ETA огноо сонгоно уу",true);return}body.eta=v}else body.status=st;'
    + 'post(body,b,"out-po").then(function(){say("out-po","PO шинэчлэгдлээ");reload()})})});'
    + 'var pn=document.getElementById("pn-save");if(pn)pn.addEventListener("click",function(){var items=[];String(document.getElementById("pn-items").value||"").split(/\\n/).forEach(function(l){var p=l.split(",").map(function(s){return s.trim()});if(p.length<2||!parseInt(p[1],10))return;var it={qty:parseInt(p[1],10)};if(/^[a-z0-9][a-z0-9-]{2,60}$/.test(p[0]))it.sku_id=p[0];else it.label=p[0];if(p[2])it.unit_cny=Number(p[2]);items.push(it)});'
    + 'if(!items.length){say("out-po","Зүйлийн мөр оруулна уу",true);return}'
    + 'post({action:"po",ext_order_no:document.getElementById("pn-no").value.trim(),supplier:document.getElementById("pn-sup").value.trim(),product_slug:document.getElementById("pn-slug").value.trim(),eta:document.getElementById("pn-eta").value||undefined,paid_usd:document.getElementById("pn-usd").value||undefined,status:"ordered",items:items},pn,"out-po").then(function(j){say("out-po","PO #"+j.po_id+" бүртгэгдлээ");reload()})});'
    // мөнгө
    + 'var cs=document.getElementById("c-save");if(cs)cs.addEventListener("click",function(){var amt=Number(document.getElementById("c-amt").value);if(!amt){say("out-c","Дүн оруулна уу",true);return}'
    + 'post({action:"cash",kind:document.getElementById("c-kind").value,amount:amt,currency:document.getElementById("c-cur").value,d:document.getElementById("c-d").value||undefined,ref:document.getElementById("c-ref").value||undefined,note:document.getElementById("c-note").value||undefined,by:"самбар"},cs,"out-c").then(function(j){say("out-c","Бүртгэгдлээ · "+Number(j.amount_mnt).toLocaleString("en-US")+"₮");reload()})});'
    + '})();</script></body></html>');
  return out.join('');
}
