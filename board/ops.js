/* Самбар · НӨӨЦ · PO v2 (блок DR, 2026-11-02 · өмнө BF, 2026-10-01 → C3 2026-10-03: зөвхөн нөөц; захиалга → orders.js, мөнгө → money.js)
   Өгөгдөл: ?view=ops → stock_position().
   Товч = нэг RPC: POST action=receive (goods_receive) | po (po_upsert).
   Бараа ирэхэд «Хүлээн авах» нэг маягт: SKU бүрийн тоо → дэвтэр → хуваарилалт → SMS автоматаар. */
function renderOps(DATA, QUERY) {
  const d = DATA || {};
  const Q = QUERY || {};
  const tab = 'stock';   // C3: захиалга/мөнгө таб тусдаа хуудас болсон
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

  const ST = d.stock || d;   // C3: үндсэн өгөгдөл = stock_position()
  const SP = A(ST.products), POS = A(ST.pos);
  const alerts = SP.filter((p) => p.alert && (n(p.committed) > 0 || n(p.rate7) > 0)); // эрэлтгүй хуучин бараа дуугарахгүй (BF.1)

  const out = [];
  const o = (s) => out.push(s);
  o('<!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Starshopping · Нөөц</title>');
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
    + 'table.ot tr.tot td{font-weight:700;background:var(--s2)}'
    + 'table.ot tr.urg td{background:rgba(220,38,38,.09)}table.ot tr.urg td:first-child{box-shadow:inset 4px 0 0 #dc2626}'
    + '.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:820px){.grid2{grid-template-columns:1fr}table.ot{font-size:12px}.kp b{font-size:18px}}'
    + '.po{background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:10px 12px;margin:8px 0}.po .hdp{display:flex;gap:10px;flex-wrap:wrap;align-items:baseline}.po .hdp b{font-size:13.5px}.po table{width:100%;font-size:12.5px;border-collapse:collapse;margin-top:6px}.po td,.po th{padding:4px 6px;border-top:1px solid var(--ln3);text-align:left}.po input.q{width:64px}'
    + '.cash{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.cash div{background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:10px 12px}.cash b{display:block;font-size:18px}.cash span{font-size:11.5px;color:var(--mut)}'
    + 'footer{margin:26px 0 10px;font-size:12px;color:var(--mut)}'
    + '.s2{display:flex;flex-direction:column;gap:26px;margin-top:12px}.s2 .nm{font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}'
    + '.s2cd{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:16px 18px;min-width:0}'
    + '.s2lb,.s2cap{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--mut)}'
    + '.s2sec{display:flex;flex-direction:column;gap:12px}.s2sh{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}'
    + '.s2 h2.s2h{margin:0;font-size:18px;font-weight:700;color:var(--ink);letter-spacing:0;text-transform:none;display:block}.s2 h2.s2h:after{display:none}'
    + '.s2why{font-size:12.5px;color:var(--mut);max-width:62ch;line-height:1.5;margin:0}'
    + '.s2pl{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;font-size:11.5px;font-weight:650;white-space:nowrap}'
    + '.s2pl.ok{background:var(--good-a);color:var(--good)}.s2pl.wr{background:var(--warn-a);color:var(--warn)}.s2pl.cr{background:var(--crit-a);color:var(--crit)}.s2pl.bl{background:var(--blue-a);color:var(--f3)}.s2pl.nt{background:var(--s2);color:var(--ink2)}'
    + '.s2ban{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:12px}@media(max-width:860px){.s2ban{grid-template-columns:1fr}}'
    + '.s2verdict{font-size:16.5px;font-weight:600;line-height:1.55;margin:8px 0 0;color:var(--ink)}.s2verdict em{font-style:normal;color:var(--crit)}'
    + '.s2attn{display:flex;flex-direction:column;gap:8px}.s2attn>div{display:flex;gap:10px;align-items:baseline;font-size:13px;line-height:1.45}'
    + '.s2i{width:8px;height:8px;border-radius:2px;flex:none;transform:translateY(-1px) rotate(45deg);background:var(--f3)}.s2i.cr{background:var(--crit)}.s2i.wr{background:var(--warn)}.s2i.ok{background:var(--good)}'
    + '.s2flow,.s2tw{overflow-x:auto;border:1px solid var(--ln);border-radius:14px;background:var(--s1)}'
    + '.s2flow table{width:100%;min-width:820px;border-collapse:collapse;font-size:13px}.s2tw table{width:100%;min-width:640px;border-collapse:collapse;font-size:13px}'
    + '.s2flow th,.s2tw th{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);font-weight:700;text-align:left;padding:11px 12px 8px;background:var(--s2);vertical-align:bottom;white-space:normal}'
    + '.s2flow th small{display:block;text-transform:none;letter-spacing:0;font-weight:500;font-size:11px;margin-top:2px}'
    + '.s2flow td,.s2tw td{padding:12px;border-top:1px solid var(--ln3);border-bottom:0;vertical-align:top;white-space:normal}.s2flow td.pn{font-weight:650;font-size:13.5px;width:20%}'
    + '.s2tw tr.bad td{background:var(--crit-a)}'
    + '.s2cell{display:flex;flex-direction:column;gap:3px}.s2cell .v{font-size:20px;font-weight:650;line-height:1.1}.s2cell .s{font-size:11.5px;color:var(--mut)}'
    + '.s2cell.zero .v{color:var(--ln2)}.s2cell.here{background:var(--good-a);margin:-6px;padding:6px;border-radius:8px}.s2cell.move .v{color:var(--f3)}.s2cell.est .v{color:var(--warn)}.s2cell.miss .v{color:var(--crit)}'
    + '.s2prod,.s2pos{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(460px,100%),1fr));gap:12px}'
    + '.s2ph{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline;margin-bottom:12px}.s2ph h3{margin:0;font-size:16px;font-weight:700}'
    + '.s2kv{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}@media(max-width:520px){.s2kv{grid-template-columns:repeat(2,minmax(0,1fr))}}'
    + '.s2kv div{display:flex;flex-direction:column;gap:2px}.s2kv b{font-size:22px;font-weight:650;line-height:1.1}.s2kv span{font-size:11.5px;color:var(--mut);line-height:1.35}.s2kv .wr b{color:var(--warn)}'
    + '.s2var{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px}.s2var div{border:1px solid var(--ln);border-radius:10px;padding:10px 12px;background:var(--bg)}.s2var div.c0{background:var(--crit-a)}.s2var b{display:block;font-size:22px;font-weight:650}.s2var span{font-size:12px;color:var(--ink2)}'
    + '.s2sz{overflow-x:auto}.s2sz table{width:100%;border-collapse:separate;border-spacing:4px;font-size:12px;min-width:380px;background:none;border:0}'
    + '.s2sz th{font-size:10.5px;color:var(--mut);font-weight:700;text-align:center;padding:2px;background:none;border:0}.s2sz th.rl{text-align:left}'
    + '.s2sz td{text-align:center;border-radius:8px;padding:7px 2px;background:var(--s2);border:0}.s2sz td.rl{background:none;text-align:left;font-weight:650;color:var(--ink2);padding-left:0}'
    + '.s2sz td b{display:block;font-size:16px;font-weight:650}.s2sz td small{display:block;font-size:10.5px;color:var(--f3);font-weight:650}'
    + '.s2sz td.c0{background:var(--crit-a)}.s2sz td.c0 b{color:var(--crit)}.s2sz td.c1{background:var(--warn-a)}.s2sz td.c1 b{color:var(--warn)}.s2sz td.c2{background:var(--good-a)}.s2sz td.c2 b{color:var(--good)}.s2sz td.na{background:none;color:var(--ln2)}'
    + '.s2leg{display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;color:var(--mut);margin-top:8px}.s2leg span{display:inline-flex;gap:5px;align-items:center}.s2leg i{width:10px;height:10px;border-radius:3px}.s2inc{color:var(--f3)!important;font-weight:650}'
    + '.s2bar{position:relative;height:10px;border-radius:5px;background:var(--s2);margin:16px 0 6px}.s2bar i{position:absolute;left:0;top:0;bottom:0;border-radius:5px;background:var(--f3)}.s2bar u{position:absolute;top:-5px;width:2px;height:20px;background:var(--crit);border-radius:1px}'
    + '.s2bl{display:flex;justify-content:space-between;font-size:11.5px;color:var(--mut);gap:8px;flex-wrap:wrap}'
    + '.s2note{font-size:12.5px;color:var(--ink2);line-height:1.6;border-top:1px solid var(--ln3);padding-top:10px;margin-top:12px}.s2note a{color:var(--gold);font-weight:650}'
    + '.s2steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin:4px 0 10px}.s2st{display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:var(--mut);min-width:0}.s2st i{height:6px;border-radius:3px;background:var(--s2)}.s2st.done i{background:var(--good)}.s2st.now i{background:var(--f3)}.s2st b{font-weight:650;font-size:12px;overflow-wrap:anywhere}.s2st.done b,.s2st.now b{color:var(--ink)}'
    + '.s2meta{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;color:var(--ink2)}.s2det{margin-top:8px;font-size:12px;color:var(--mut)}.s2det p{margin:6px 0 0;line-height:1.5}'
    + '.s2chk{display:flex;flex-direction:column;padding-block:6px}.s2chk>div{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:baseline;padding:11px 0;border-bottom:1px solid var(--ln3);font-size:13px;line-height:1.45}.s2chk>div:last-child{border-bottom:0}.s2chk em{font-style:normal;font-size:12px;color:var(--mut)}'
    + '.s2sys{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr);gap:14px;align-items:center}@media(max-width:860px){.s2sys{grid-template-columns:1fr}}'
    + '.s2col{display:flex;flex-direction:column;gap:8px}.s2nd{border:1px solid var(--ln);border-radius:10px;padding:9px 12px;background:var(--bg);font-size:12.5px;line-height:1.4}.s2nd b{display:block;font-size:13px}'
    + '.s2core{border:2px solid var(--gold-ln);border-radius:14px;padding:16px;background:var(--gold-a);text-align:center}.s2core b{font-size:16px;display:block}.s2core p{margin:6px 0 0;font-size:12.5px;color:var(--ink2)}.s2core .eq{font-size:12.5px;margin-top:10px;color:var(--ink);font-family:"JetBrains Mono",ui-monospace,monospace}'
    + '.btn{white-space:normal;max-width:100%;text-align:left}'
    + '.det2{background:var(--s1);border:1px solid var(--ln);border-radius:12px;padding:10px 14px;margin:8px 0}.det2>summary{cursor:pointer;font-weight:650}'
    + '</style></head><body><div class="w">');

  // ── толгой + навигаци
  o('<header><div class="hd"><div class="bm">S</div><div><div class="bt">Starshopping</div>');
  o('<div class="bs">нөөц · PO · ' + esc(String(d.generated_at || '').replace('T', ' ').slice(0, 16)) + ' UTC</div></div>');
  o('<div class="sp"></div><a class="rf" href="">Шинэчлэх</a></div></header>');
  o(ssNav('ops', themeQ));
  /* ── v2 (блок DR, 2026-11-02, эзэн «таалагдлаа, зөвшөөрлөө»): дүгнэлт → бараа хаана → бараа бүр → Nexpress тулгалт → татан авалт → өгөгдлийн шалгалт → систем → дэлгэрэнгүй/үйлдэл.
     Өгөгдөл = stock_position() (DR): хувилбар бүрт now/incoming/eta, pipeline, accessories, health. Хуучин хүснэгт, маягт, үйлдлүүд доод «Дэлгэрэнгүй»-д хэвээр. */
  const CU = d.custody || (ST && ST.custody) || null;
  const CS = d.courier_stock || (ST && ST.courier_stock) || null;
  const ACC = A(ST.accessories), HL = A(ST.health);
  const nm = (v) => Math.round(n(v)).toLocaleString('en-US');
  const short = (s) => String(s || '').split(' · ')[0];
  const lvlCls = (l) => (l === 'crit' ? 'cr' : l === 'warn' ? 'wr' : l === 'ok' ? 'ok' : 'bl');
  const lvlTxt = (l) => (l === 'crit' ? 'яаралтай' : l === 'warn' ? 'засах' : l === 'ok' ? 'хэвийн' : 'мэдээлэл');
  const skuIds = (p) => A(p.skus).map((s) => s.sku_id);
  const cuProd = (p) => (CU ? A(CU.products).find((x) => x.product_id === p.product_id) : null);
  const csRowsOf = (p) => { const ids = skuIds(p); return CS ? A(CS.rows).filter((r) => A(r.skus).some((k) => ids.indexOf(k.sku_id) >= 0)) : []; };
  const toRop = (p) => { const r = n(p.rate7), now = n(p.now) + n(p.in_transit), rop = n(p.reorder_point); return r > 0 && now > rop ? Math.round((now - rop) / r) : r > 0 ? 0 : null; };
  // DR SQL суугаагүй үед ч эвдрэхгүй: now/incoming-ийг энд бөглөнө
  SP.forEach((p) => { A(p.skus).forEach((s) => { if (!has(s.now)) s.now = Math.max(0, n(s.on_hand) - n(s.committed)); if (!has(s.incoming)) s.incoming = n(s.in_transit); });
    if (!has(p.now)) p.now = A(p.skus).reduce((t, s) => t + n(s.now), 0); if (!p.pipeline) p.pipeline = {}; });
  const live = SP.filter((p) => p.mode === 'live');

  // ── 0 · Дүгнэлт
  const sent = [];
  live.forEach((p) => {
    const outs = A(p.skus).filter((s) => n(s.now) <= 0);
    const low = A(p.skus).filter((s) => n(s.now) > 0 && n(s.now) <= 3);
    const tr = toRop(p);
    let t = '<b class="nm">' + short(p.name) + '</b>: одоо <span class="nm">' + nm(p.now) + '</span> ш';
    if (n(p.in_transit)) t += ', замд <span class="nm">' + nm(p.in_transit) + '</span>' + (p.next_eta ? ' (~' + day(p.next_eta) + ')' : '');
    const multiC = new Set(A(p.skus).map((s) => s.color)).size > 1;
    if (low.length && A(p.skus).some((s) => s.size)) t += '. Цөөн: ' + low.slice(0, 5).map((s) => esc((multiC && s.size ? s.color + ' ' : '') + (s.size || s.color)) + ' ' + n(s.now)).join(', ');
    if (tr !== null && n(p.reorder_point) > 0) t += tr > 0 ? '. Дахин захиалах цэгт ~' + tr + ' хоногт хүрнэ' : '. <em>Дахин захиалах цэгт хүрсэн</em>';
    if (outs.length) t += '. Дууссан ' + outs.length + ' хувилбар';
    sent.push(t + '.');
  });
  const attn = HL.filter((h) => h.level !== 'ok');
  o('<div class="s2"><div class="s2ban"><div class="s2cd"><div class="s2lb">Өнөөдрийн дүгнэлт</div><p class="s2verdict">' + (sent.join(' ') || 'Нөөцтэй бараа алга.') + '</p></div>'
    + '<div class="s2cd s2attn"><div class="s2lb">Анхаарах ' + attn.filter((h) => h.level !== 'info').length + '</div>'
    + (attn.length ? attn.slice(0, 5).map((h) => '<div><i class="s2i ' + lvlCls(h.level) + '"></i><span>' + esc(h.text) + '</span></div>').join('') : '<div><i class="s2i ok"></i><span>Бүх тоо тэнцэж байна</span></div>')
    + '</div></div>');

  // ── 1 · Бараа хаана байна
  const cell = (v, sub, cls) => '<td><div class="s2cell ' + (cls || (n(v) ? '' : 'zero')) + '"><span class="v nm">' + (v === null ? '—' : nm(v)) + '</span>' + (sub ? '<span class="s">' + sub + '</span>' : '') + '</div></td>';
  o('<section class="s2sec"><div class="s2sh"><h2 class="s2h">Бараа хаана байна</h2><p class="s2why">Хятадаас үйлчлүүлэгчийн гар хүртэлх зам. Ногоон = өнөөдөр зарж болно. Цэнхэр = замд.</p></div>');
  o('<div class="s2flow"><table><thead><tr><th>Бараа</th><th>Хятадад<small>захиалсан</small></th><th>Хятад → Эрээн<small>ачигдсан</small></th><th>Эрээн → УБ<small>Odod карго</small></th><th>Агуулахад<small>зарж болно</small></th><th>Хүргэлтэнд<small>курьерт</small></th><th>Хүргэгдсэн<small>нийт</small></th></tr></thead><tbody>');
  SP.forEach((p) => {
    const PL = p.pipeline || {}, cp = cuProd(p), rows = csRowsOf(p);
    const deliv = rows.reduce((s, r) => s + n(r.delivered), 0);
    const varTxt = A(p.skus).filter((s) => n(s.now) > 0).slice(0, 4).map((s) => esc(s.size || short(s.color)) + ' ' + n(s.now)).join(' · ');
    o('<tr><td class="pn">' + esc(short(p.name)) + (p.mode !== 'live' ? ' <span class="s2pl nt">' + esc(p.mode) + '</span>' : '') + '</td>'
      + cell(PL.ordered || 0, '', n(PL.ordered) ? 'move' : '') + cell(PL.shipped || 0, n(PL.shipped) && p.next_eta ? '~' + day(p.next_eta) : '', n(PL.shipped) ? 'move' : '')
      + cell(PL.ereen || 0, '', n(PL.ereen) ? 'move' : '') + cell(n(p.now), varTxt, n(p.now) ? 'here' : 'zero')
      + cell(cp ? n(cp.on_road) : null, cp ? 'хүргэгдээгүй' : '', cp && n(cp.on_road) ? 'move' : '')
      + cell(rows.length ? deliv : null, rows.length ? 'Nexpress-ээр' : '', rows.length ? '' : 'zero') + '</tr>');
  });
  ACC.forEach((a) => {
    const st = String(a.transit_status || ''), tq = n(a.in_transit);
    o('<tr><td class="pn">' + esc(short(a.name)) + ' <span class="s2pl nt">бэлэг</span></td>'
      + cell(st.indexOf('ordered') >= 0 ? tq : 0, '', st.indexOf('ordered') >= 0 ? 'move' : '') + cell(st.indexOf('shipped') >= 0 ? tq : 0, '', st.indexOf('shipped') >= 0 ? 'move' : '')
      + cell(st.indexOf('ereen') >= 0 ? tq : 0, st.indexOf('ereen') >= 0 && a.eta ? '~' + day(a.eta) : '', st.indexOf('ereen') >= 0 ? 'move' : '')
      + cell(n(a.est), a.estimated ? 'тооцоо · тоолоогүй' : 'тоолсон ' + day(a.counted_at), n(a.est) > 0 ? (a.estimated ? 'est' : 'here') : 'miss')
      + cell(null, '', 'zero') + cell(null, '', 'zero') + '</tr>');
  });
  o('</tbody></table></div></section>');

  // ── 2 · Бараа бүр
  o('<section class="s2sec"><div class="s2sh"><h2 class="s2h">Бараа бүр</h2><p class="s2why">«Одоо зарж болох» = агуулахад − амлагдсан. Замд байгаа барааг сайт «бэлэн» гэж тоолохгүй. Дахин захиалах цэг = хоногийн борлуулалт × ' + n(ST.lead_days) + ' хоногийн тээвэр.</p></div><div class="s2prod">');
  SP.forEach((p) => {
    const sizes = [], colors = [];
    A(p.skus).forEach((s) => { if (s.size && sizes.indexOf(s.size) < 0) sizes.push(s.size); if (colors.indexOf(s.color) < 0) colors.push(s.color); });
    const tr = toRop(p), rop = n(p.reorder_point), outs = A(p.skus).filter((s) => n(s.now) <= 0).length;
    const st = p.mode !== 'live' ? ['nt', p.mode] : outs && n(p.in_transit) ? ['wr', 'хувилбар дутуу · ' + n(p.in_transit) + ' замд'] : tr === 0 ? ['wr', 'дахин захиалах цэгт хүрсэн'] : ['ok', 'зарж байна'];
    o('<div class="s2cd"><div class="s2ph"><h3>' + esc(short(p.name)) + '</h3><span class="s2pl ' + st[0] + '">' + esc(st[1]) + '</span></div>');
    o('<div class="s2kv"><div><b class="nm">' + nm(p.now) + '</b><span>одоо зарж болно</span></div>'
      + '<div><b class="nm">' + (n(p.in_transit) ? '+' + nm(p.in_transit) : '0') + '</b><span>замд' + (p.next_eta ? ' · ~' + day(p.next_eta) : '') + '</span></div>'
      + '<div><b class="nm">' + (has(p.rate7) ? n(p.rate7).toFixed(1) : '—') + '</b><span>захиалга / хоног (7 хоног)</span></div>'
      + '<div class="' + (tr !== null && tr <= 7 ? 'wr' : '') + '"><b class="nm">' + (tr === null ? '—' : tr === 0 ? '0' : '~' + tr) + '</b><span>хоногийн дараа дахин захиалах цэг (' + rop + ')</span></div></div>');
    if (sizes.length) {
      o('<div class="s2sz"><table><thead><tr><th class="rl"></th>' + sizes.map((z) => '<th>' + esc(z) + '</th>').join('') + '</tr></thead><tbody>');
      colors.forEach((c) => {
        o('<tr><td class="rl">' + esc(c) + '</td>' + sizes.map((z) => {
          const k = A(p.skus).find((s) => s.color === c && s.size === z);
          if (!k) return '<td class="na">—</td>';
          const v = n(k.now), cls = v <= 0 ? 'c0' : v <= 3 ? 'c1' : 'c2';
          return '<td class="' + cls + '" title="' + esc(k.sku_id) + '"><b class="nm">' + v + '</b>' + (n(k.incoming) ? '<small>+' + n(k.incoming) + '</small>' : '') + '</td>';
        }).join('') + '</tr>');
      });
      o('</tbody></table></div><div class="s2leg"><span><i style="background:var(--good-a)"></i>хангалттай</span><span><i style="background:var(--warn-a)"></i>3 ба бага</span><span><i style="background:var(--crit-a)"></i>дууссан</span><span class="s2inc">+N = замд</span></div>');
    } else {
      o('<div class="s2var">' + A(p.skus).map((k) => '<div class="' + (n(k.now) <= 0 ? 'c0' : '') + '"><b class="nm">' + n(k.now) + '</b><span>' + esc(short(k.color)) + (n(k.incoming) ? ' · +' + n(k.incoming) : '') + '</span></div>').join('') + '</div>');
    }
    if (rop > 0) {
      const mx = Math.max(n(p.now), rop) * 1.5 || 1;
      o('<div class="s2bar"><i style="width:' + Math.min(100, (n(p.now) / mx) * 100).toFixed(1) + '%"></i><u style="left:' + Math.min(100, (rop / mx) * 100).toFixed(1) + '%"></u></div>'
        + '<div class="s2bl"><span>0</span><span>дахин захиалах цэг ' + rop + '</span><span>одоо ' + nm(p.now) + '</span><span>' + nm(mx) + '</span></div>');
    }
    const acc = ACC.filter((a) => a.product_id === p.product_id);
    const notes = [];
    if (has(p.cost_mnt)) notes.push('Өртөг <span class="nm">' + mnt(p.cost_mnt) + '</span>/ш · агуулахад байгаагийн өртөг <span class="nm">' + mnt(n(p.cost_mnt) * n(p.on_hand)) + '</span>');
    acc.forEach((a) => notes.push(esc(short(a.name)) + ': ' + (a.estimated ? 'тооцоогоор ' : '') + '<b class="nm">' + n(a.est) + '</b> ш' + (n(a.in_transit) ? ' · +' + n(a.in_transit) + ' замд' : '') + (n(a.est) < n(p.on_hand) ? ' <span class="s2pl wr">' + (n(p.on_hand) - n(a.est)) + ' бараа бэлэггүй</span>' : '')));
    if (notes.length) o('<div class="s2note">' + notes.join('<br>') + ' · <a href="/board/?view=money' + tq + '">Мөнгө →</a></div>');
    o('</div>');
  });
  o('</div></section>');

  // ── 3 · Nexpress-тэй тулгалт
  if (CS && A(CS.rows).length) {
    const seen = A(CS.rows).map((r) => r.seen_at).filter(Boolean).sort().pop();
    const ageH = seen ? Math.floor((Date.now() - new Date(seen).getTime()) / 3600000) : null;
    const bad = A(CS.rows).filter((r) => r.status !== 'ok'), okR = A(CS.rows).filter((r) => r.status === 'ok');
    o('<section class="s2sec"><div class="s2sh"><h2 class="s2h">Nexpress-тэй тулгалт</h2><p class="s2why">Nexpress-ийн агуулахын тоо = манай тооцоо байх ёстой. Үйлчлүүлэгч Nexpress дээр очиж авбал энд зөрүү гарна. Өдөр бүр 21:25-д уншина.</p></div>');
    o('<div class="s2tw"><table><thead><tr><th>Nexpress бараа</th><th>Nexpress</th><th>Манай тооцоо</th><th>Өгсөн</th><th>Замд</th><th>Хүргэгдсэн</th><th>Төлөв</th></tr></thead><tbody>');
    bad.concat(okR).forEach((r) => {
      o('<tr' + (r.status !== 'ok' ? ' class="bad"' : '') + '><td>' + esc(r.ext_name) + '</td><td class="nm">' + (has(r.reported) ? n(r.reported) : '—') + '</td><td class="nm">' + n(r.expected) + '</td><td class="nm">' + n(r.handed) + '</td><td class="nm">' + n(r.open) + '</td><td class="nm">' + n(r.delivered) + '</td>'
        + '<td>' + (r.status === 'ok' ? '<span class="s2pl ok">тэнцсэн</span>' : '<span class="s2pl cr">' + (has(r.diff_nx) ? (n(r.diff_nx) > 0 ? '+' : '') + n(r.diff_nx) : '⚠') + ' · асуух</span>') + '</td></tr>');
    });
    o('</tbody></table></div><p class="s2why">Сүүлд уншсан: ' + (seen ? esc(dt(seen)) : '—') + (ageH !== null && ageH > 26 ? ' <span class="s2pl wr">' + ageH + ' цаг хуучирсан</span>' : ageH !== null ? ' <span class="s2pl ok">шинэ</span>' : '') + '</p></section>');
  }

  // ── 4 · Татан авалт (1688)
  const STEPS = ['ordered', 'shipped', 'ereen', 'ub', 'received'];
  const STL = { ordered: 'Захиалсан', shipped: 'Ачигдсан', ereen: 'Эрээнд', ub: 'УБ-д', received: 'Хүлээн авсан' };
  const openPO = POS.filter((po) => po.status !== 'received' && po.status !== 'cancelled');
  o('<section class="s2sec"><div class="s2sh"><h2 class="s2h">Татан авалт (1688)</h2><p class="s2why">Өдөр бүр 15:10-д 1688 болон Odod-оос автоматаар шалгаж шинэчилнэ. Бараа ирэхэд доорх «Хүлээн авах» маягтаар оруулна.</p></div>');
  if (!openPO.length) o('<p class="s2why">Замд яваа татан авалт алга.</p>');
  o('<div class="s2pos">');
  openPO.forEach((po) => {
    const at = Math.max(0, STEPS.indexOf(po.status));
    const items = A(po.items).map((it) => esc(String(it.label || it.sku_id).replace(/^Хар /, '')) + ' ' + n(it.qty)).join(' · ');
    o('<div class="s2cd"><div class="s2ph"><h3>PO' + n(po.po_id) + ' · ' + esc(po.product || '') + '</h3><span class="s2pl bl">' + esc(STL[po.status] || po.status) + '</span></div>'
      + '<div class="s2steps">' + STEPS.map((s, i) => '<div class="s2st ' + (i <= at ? 'done' : i === at + 1 ? 'now' : '') + '"><i></i><b>' + STL[s] + '</b>'
        + (s === 'ordered' ? day(po.placed_on) : s === 'ub' && po.eta ? '~' + day(po.eta) : i <= at ? '✓' : '') + '</div>').join('') + '</div>'
      + '<div class="s2meta"><span>' + items + '</span>' + (po.tracking ? '<span class="nm">' + esc(po.tracking) + '</span>' : '') + (has(po.paid_usd) ? '<span>$' + n(po.paid_usd) + '</span>' : '') + '</div>'
      + (po.note ? '<details class="s2det"><summary>Тэмдэглэл</summary><p>' + esc(po.note) + '</p></details>' : '') + '</div>');
  });
  o('</div></section>');

  // ── 5 · Өгөгдлийн шалгалт
  o('<section class="s2sec"><div class="s2sh"><h2 class="s2h">Өгөгдлийн шалгалт</h2><p class="s2why">Систем өөрийгөө шалгана. Шар, улаан мөр засагдах хүртэл энд харагдана; шинэ анхааруулга өдөр бүр 10:25-д Telegram-д очно.</p></div><div class="s2cd s2chk">');
  (HL.length ? HL : [{ level: 'ok', text: 'Шалгалтын өгөгдөл ирээгүй (DR SQL суугаагүй байж магадгүй)' }]).forEach((h) => {
    o('<div><span class="s2pl ' + lvlCls(h.level) + '">' + lvlTxt(h.level) + '</span><span>' + esc(h.text) + (h.fix ? '<br><em>' + esc(h.fix) + '</em>' : '') + '</span><em>' + esc(h.area || '') + '</em></div>');
  });
  o('</div></section>');

  // ── 6 · Систем
  o('<section class="s2sec"><div class="s2sh"><h2 class="s2h">Нөөц системд хэрхэн холбогддог вэ</h2><p class="s2why">Нэг тооцоо бүх хуудсыг тэжээнэ. Эндээс зөрсөн тоо хаана ч гарахгүй.</p></div>'
    + '<div class="s2cd s2sys"><div class="s2col"><div class="s2cap">Орж ирдэг</div><div class="s2nd"><b>1688 татан авалт</b>захиалсан → ачигдсан → Эрээн → УБ</div><div class="s2nd"><b>Хүлээн авалт</b>«Хүлээн авах» → агуулахад нэмнэ</div><div class="s2nd"><b>Nexpress</b>өдөр бүр агуулахын тоо уншина</div></div>'
    + '<div class="s2core"><b>Нөөцийн нэг тооцоо</b><p>хувилбар бүрээр: агуулахад, замд, амлагдсан, бэлэг</p><div class="eq">одоо зарж болох = агуулахад − амлагдсан</div><div class="eq">ирэх = замд (огноотой)</div></div>'
    + '<div class="s2col"><div class="s2cap">Гарч очдог</div><div class="s2nd"><b>Сайт ба бот</b>байгаа хувилбар · дууссаныг «дууссан»</div><div class="s2nd"><b>Захиалга</b>нөөцөөс оноох, хүлээлгийн жагсаалт</div><div class="s2nd"><b>Мөнгө</b>нөөцийн өртөг, татан авалтад хэрэгтэй мөнгө</div><div class="s2nd"><b>Зар</b>хувилбар дуусвал зарыг зогсоох санал</div></div></div></section>');

  o('<section class="s2sec"><div class="s2sh"><h2 class="s2h">Дэлгэрэнгүй ба үйлдэл</h2><p class="s2why">Бараа хүлээн авах, Nexpress-д өгөх, шинэ татан авалт бүртгэх, хүлээлгийн жагсаалт, дахин захиалгын дохио.</p></div></section></div>');
  // ── Дэлгэрэнгүй ба үйлдэл (хуучин блокууд хэвээр)
  {
    o('<details class="det2"' + (POS.some((po) => po.status !== 'received' && po.status !== 'cancelled') ? ' open' : '') + '><summary>Бараа хүлээн авах · PO засах · шинэ PO</summary>');
    o('<h2>1688 захиалгууд (PO)</h2><div class="out" id="out-po"></div>');
    POS.forEach((po) => {
      const open = po.status !== 'received' && po.status !== 'cancelled';
      o('<div class="po" data-keep="po-' + n(po.po_id) + '"><div class="hdp"><b>#' + n(po.po_id) + ' · ' + esc(po.product || '') + '</b><span class="pill ' + (po.status === 'received' ? 'ok' : po.status === 'shipped' || po.status === 'ereen' ? 'info' : '') + '">' + esc(po.status) + '</span>'
        + '<span class="sm mut">' + esc(po.supplier || '') + ' · ' + esc(po.ext_order_no || '') + ' · захиалсан ' + day(po.placed_on) + (po.eta ? ' · УБ-д ~' + day(po.eta) : '') + (po.tracking ? ' · ' + esc(po.tracking) : '') + (has(po.paid_usd) ? ' · $' + n(po.paid_usd) : '') + '</span></div>'
        + (po.note ? '<div class="sm mut">' + esc(po.note) + '</div>' : ''));
      const PC = po.cost || null;
      if (PC) {
        const per = n(PC.sku_units) > 0 ? Math.round((n(PC.goods_mnt) + n(PC.cargo_mnt)) / n(PC.sku_units)) : null;
        o('<div class="sm" style="margin:4px 0 6px;display:flex;flex-wrap:wrap;gap:6px 14px">'
          + '<span>💳 бараа <b>' + mnt(PC.goods_mnt) + '</b> <span class="mut">(' + esc(PC.goods_src || '') + ')</span>' + (PC.goods_estimated ? ' <span class="pill warn">таамаг</span>' : '') + '</span>'
          + '<span>🏦 ' + esc(PC.pay_state || '—') + '</span>'
          + '<span>🚛 карго ' + (PC.cargo_known ? '<b>' + mnt(PC.cargo_mnt) + '</b>' : '<span class="pill warn">ороогүй</span>') + '</span>'
          + (per !== null ? '<span>= <b>' + mnt(per) + '/ш</b>' + (n(PC.acc_units) ? ' <span class="mut">(+' + n(PC.acc_units) + ' дагалдах эд)</span>' : '') + (PC.cargo_known ? '' : ' <span class="mut">карго ороогүй</span>') + '</span>' : '')
          + '</div>');
      }
      o('<div class="tw"><table><tr><th>Зүйл</th><th>Захиалсан</th><th>Ирсэн</th>' + (open ? '<th>Одоо ирсэн тоо</th>' : '') + '</tr>');
      A(po.items).forEach((it) => o('<tr><td>' + esc(it.label || it.sku_id) + (it.sku_id ? '' : ' <span class="sm mut">дагалдах</span>') + '</td><td>' + n(it.qty) + '</td><td>' + n(it.received_qty) + '</td>'
        + (open ? '<td><input class="q" type="number" min="0" max="' + n(it.qty) + '" data-po="' + n(po.po_id) + '" data-item="' + n(it.id) + '" placeholder="' + (n(it.qty) - n(it.received_qty)) + '"></td>' : '') + '</tr>'));
      o('</table></div>');
      if (open) o('<div style="margin-top:8px"><button class="btn go recv" data-po="' + n(po.po_id) + '">Бараа хүлээн авах → нөөцөд + захиалгад оноох + SMS зөвхөн хаяггүйд</button> '
        + '<button class="btn pst" data-po="' + n(po.po_id) + '" data-st="shipped">ачигдсан</button><button class="btn pst" data-po="' + n(po.po_id) + '" data-st="ereen">Эрээнд</button>'
        + '<input id="eta-' + n(po.po_id) + '" type="date" value="' + esc(po.eta || '') + '" title="УБ-д ирэх"><button class="btn pst" data-po="' + n(po.po_id) + '" data-st="eta">ETA хадгалах</button></div>');
      o('</div>');
    });
    o('<details class="po"><summary><b>+ Шинэ 1688 захиалга бүртгэх</b></summary><div class="frm on" id="po-new">'
      + '<input id="pn-no" placeholder="1688 захиалгын №" size="22"> <input id="pn-sup" placeholder="Нийлүүлэгч" size="18"> <input id="pn-slug" placeholder="product slug (Halaaguurtai-hantaaz)" size="26"> <input id="pn-eta" type="date" title="УБ-д ирэх"> <input id="pn-usd" type="number" step="0.01" placeholder="Төлсөн $"><br>'
      + '<textarea id="pn-items" rows="3" cols="60" placeholder="мөр бүрт: sku_id (эсвэл нэр) , тоо , нэгж ¥&#10;halaaguurtai-hantaaz-har-2xl, 26, 40&#10;Power bank 10000mAh хар, 61, 16"></textarea><br>'
      + '<button class="btn go" id="pn-save">Бүртгэх</button></div></details>');
    o('</details>');
    if (CS && A(CS.rows).length) {
      const skuOpts = [];
      SP.forEach((p) => A(p.skus).forEach((k) => skuOpts.push('<option value="' + esc(k.sku_id) + '">' + esc(p.name) + ' · ' + esc([k.color, k.size].filter(Boolean).join(' ') || k.sku_id) + ' (чөлөөт ' + n(k.available) + ')</option>')));
      o('<details class="po" style="margin:8px 0 4px"><summary><b>📦 Nexpress-д өгсөн / буцааж авсан — бичих</b></summary><div class="frm on">'
        + '<p class="sm mut" style="margin:0 0 6px">Бараа Nexpress агуулахад биечлэн өгөх бүрт энд бичнэ — тэгж байж дээрх тэнцэл үнэн байна. Nexpress-ийн бүтээгдэхүүнд SKU холбогдоогүй бол (жишээ хантааз) эхлээд Nexpress-д бүтээгдэхүүн үүсгээд надад хэл.</p>'
        + '<select id="cs-sku">' + skuOpts.join('') + '</select> '
        + '<select id="cs-reason"><option value="handover">Nexpress-д өгсөн (+)</option><option value="take_back">Nexpress-ээс буцааж авсан (−)</option><option value="adjust">Засвар (± тоо)</option></select> '
        + '<input id="cs-qty" type="number" inputmode="numeric" placeholder="тоо" style="width:80px"> '
        + '<input id="cs-note" type="text" placeholder="тайлбар (сонголттой)" style="width:220px"> '
        + '<button class="btn go" id="cs-go">Бичих</button></div></details>');
    }
    o('<details class="det2"><summary>Хүлээлгийн жагсаалт ба дахин захиалгын дохио</summary>');
    // S3 (2026-10-05): дараагийн ачааны жагсаалт — өнөөдрийн ачаанд багтаагүй, хаягтай захиалгууд (FIFO). Залгах жагсаалт.
    const WL = d.waitlist;
    if (Array.isArray(WL)) {
      o('<h2>Дараагийн ачааны жагсаалт <span class="sm mut">(одоогийн ачаанд багтаагүй, хаягтай захиалга · эхэлж захиалсан нь түрүүлж)</span></h2>');
      if (!WL.length) o('<p class="sm mut">Жагсаалт хоосон — бүх хаягтай захиалга одоогийн ачаанд багтаж байна.</p>');
      WL.forEach((g) => {
        o('<h3>' + esc([g.color, g.size].filter(Boolean).join(' ')) + ' <span class="pill crit">' + n(g.waiting_qty) + ' ш хүлээлтэд</span> <span class="sm mut">одоогийн ачаанд ' + n(g.supply) + ' ш</span></h3>');
        o('<div class="tw"><table class="ot"><colgroup><col style="width:8%"><col style="width:14%"><col style="width:8%"><col style="width:26%"><col style="width:26%"><col></colgroup><thead><tr><th>№</th><th>Захиалга</th><th>Тоо</th><th>Утас</th><th>Нэр</th><th>Захиалсан</th></tr></thead><tbody>');
        A(g.queue).forEach((w, i) => o('<tr><td>' + (i + 1) + '</td><td>#' + esc(String(w.order_id || '').slice(0, 6)) + '</td><td>' + n(w.qty) + '</td><td>' + (w.phone ? '<a href="tel:' + esc(w.phone) + '">' + esc(w.phone) + '</a>' : '—') + '</td><td>' + esc(w.name || '—') + '</td><td>' + dt(w.placed_at) + '</td></tr>'));
        o('</tbody></table></div>');
      });
      o('<p class="sm mut">Цуцлалт гарвал чөлөөлөгдсөн ширхэг автоматаар эхний хүлээгчид шилжинэ (захиалгын төлөв «cancelled»/«returned» болгоход). Хаяггүй (зөвхөн утас) захиалга энд ордоггүй — тэднийг хаяг өгөхөд л жагсаалтад оруулна.</p>');
    }
    // S7 (2026-10-07): дахин захиалгын дохио — размер бүрээр, зөвхөн утсаар баталгаажсан эрэлтээс. ЗӨВХӨН ДОХИО — PO тавих шийдвэр эзнийх.
    const RS = d.reorder;
    if (RS && Array.isArray(RS.products) && RS.products.length) {
      o('<h2>Дахин захиалгын дохио <span class="sm mut">(размер бүрээр · зөвхөн утсаар баталгаажсан эрэлтээс · шийдвэр эзнийх)</span></h2>');
      const SL = { 'ЗАХИАЛ': ['crit', 'Захиалах'], 'ХҮЛЭЭ': ['warn', 'Хүлээ'], 'ИЛҮҮ': ['info', 'Илүү'], 'ТЭНЦҮҮ': ['ok', 'Тэнцүү'], 'АШИГГҮЙ': ['crit', 'Ашиггүй'] };
      RS.products.forEach((p) => {
        const L = p.lamps || {};
        const early = !(L.calls_ok && L.deliveries_ok);
        const CD = p.cost_detail || null;
        o('<h3>' + esc(p.name || p.slug) + ' <span class="sm mut">ашиг ' + mnt(p.contribution_mnt) + '/ш · өртөг ' + mnt(p.cost_mnt)
          + (CD && CD.src === 'auto' ? ' <span class="pill ok" title="PO + карго → жигнэсэн дундаж">авто</span>' : CD && CD.src === 'manual' ? ' <span class="pill warn" title="эзэн гараар тогтоосон — PO-оос бодохгүй">🔒 гараар</span>' : '')
          + (CD && has(CD.goods_per_unit) ? ' · бараа ' + mnt(CD.goods_per_unit) + ' + карго ' + mnt(CD.cargo_per_unit) + ' · ' + n(CD.units) + 'ш дундаж' : '')
          + '</span></h3>');
        if (CD && A(CD.warn).length) o('<p class="sm" style="color:#c27a06;margin:-4px 0 6px">⚠️ ' + A(CD.warn).map(esc).join(' · ') + '</p>');
        o('<div class="sm" style="margin:4px 0 8px">'
          + '<span class="pill ' + (L.calls_ok ? 'ok' : 'warn') + '">дуудлага ' + (has(L.calls_pct) ? n(L.calls_pct) + '%' : '—') + ' (босго ' + n(RS.min_calls_pct) + '%)</span> '
          + '<span class="pill ' + (L.deliveries_ok ? 'ok' : 'warn') + '">хүргэгдсэн ' + n(L.delivered) + '/' + n(RS.min_delivered) + '</span> '
          + '<span class="pill info">авах хувь ' + Math.round(n(L.ratio_used) * 100) + '% (' + (L.ratio_src === 'бодит' ? 'бодит' : 'таамаг') + ')</span></div>');
        if (early) o('<p class="sm mut">⚠️ Дохио урьдчилсан: хүргэлт/дуудлагын гэрэл ногоон болоогүй тул захиалах тоог шууд ЗӨВШӨӨРӨХГҮЙ. (10/05 шийдвэр: бараа хүргэгдэж, борлуулалт амжилттай болтол дахин захиалахгүй.)</p>');
        o('<div class="tw"><table class="ot"><thead><tr><th>Хувилбар</th><th>Нөөц+замд+хуваарилсан</th><th>Баталсан</th><th>Хаягтай, баталгаагүй</th><th>Хаяггүй</th><th>Дутагдал (баталсан)</th><th>Дохио</th><th>Захиалах</th><th>Мөнгө</th></tr></thead><tbody>');
        A(p.skus).forEach((s) => {
          const st = SL[s.state] || ['', esc(s.state)];
          o('<tr><td><b>' + esc([s.color, s.size].filter(Boolean).join(' ')) + '</b></td><td>' + n(s.pool) + ' <span class="sm mut">(' + n(s.on_hand) + '+' + n(s.in_transit) + '+' + n(s.alloc) + ')</span></td>'
            + '<td>' + n(s.firm) + '</td><td>' + n(s.pending) + '</td><td>' + n(s.noaddr) + (n(s.new7) ? ' <span class="sm mut">(+' + n(s.new7) + ' 7х)</span>' : '') + '</td>'
            + '<td>' + (n(s.short_firm) ? '<b>' + n(s.short_firm) + '</b>' : '0') + (n(s.short_pend) > n(s.short_firm) ? ' <span class="sm mut">(боломжит ' + n(s.short_pend) + ')</span>' : '') + '</td>'
            + '<td><span class="pill ' + st[0] + '">' + st[1] + '</span></td>'
            + '<td>' + (n(s.rec_qty) ? '<b>' + n(s.rec_qty) + ' ш</b>' + (s.fits_budget === false ? ' <span class="pill warn">төсөвт багтахгүй</span>' : '') : '—') + '</td>'
            + '<td>' + (has(s.cash_need) && n(s.rec_qty) ? mnt(s.cash_need) : '—') + '</td></tr>');
        });
        o('</tbody></table></div>');
        if (n(p.total_cash_need)) o('<p class="sm mut">Нийт хэрэгтэй мөнгө (хэрэв бүгдийг захиалбал): <b>' + mnt(p.total_cash_need) + '</b></p>');
      });
      o('<p class="sm mut">Дутагдал = баталсан захиалга − (агуулах + замд + хуваарилсан). Захиалах = дутагдал × авах хувь — нэг ч захиалга татгалзвал мөнгө түгжигдэхээс сэргийлнэ. «Хүлээ» = баталгаагүй/хаяггүй эрэлтээр л дутаж байна — залгаж баталгаажуулмагц дохио өөрчлөгдөнө. «Илүү» = бүгд авсан ч үлдэх — захиалахгүй.</p>');
    }
    o('<p class="sm mut">Чөлөөтэй = агуулах + замд − амлагдсан. Дахин захиалах цэг = хоногийн хурд × тээврийн хоног. Эрэлт хэмжээ бүрээр өөр тул захиалгыг энэ хүснэгтээр хийнэ.</p>');
    o('</details>');
  }

  o('<footer>Блок DR · Нөөц v2 · нэг тооцоо: stock_position() → сайт, бот, захиалга, мөнгө. Бараа ирэхэд «Хүлээн авах» дармагц: SKU дэвтэр → бүрэн захиалгуудад FIFO → SMS.</footer></div>');

  // ── үйлдлүүд
  o('<script>(function(){var U="https://starshopping.app.n8n.cloud/webhook/board-data",k="";try{k=localStorage.getItem("ss_board_key")||""}catch(x){}'
    + 'function e(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]})}'
    + 'function say(id,msg,bad){var o=document.getElementById(id);if(!o)return;o.className="out on";o.innerHTML=(bad?"⚠️ ":"✅ ")+e(msg)}'
    + 'function post(b,btn,out){if(btn){btn.disabled=true;btn.dataset.tx=btn.textContent;btn.textContent="…"}'
    + 'return fetch(U+"?k="+encodeURIComponent(k),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)})'
    + '.then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}).then(function(j){if(!j||j.ok===false)throw new Error((j&&(j.error||j.message))||"алдаа");return j})'
    + '.catch(function(x){if(btn){btn.disabled=false;btn.textContent=btn.dataset.tx}if(out)say(out,x.message,true);throw x})}'
    + 'function reload(ms){setTimeout(function(){if(window.ssRefresh)window.ssRefresh();else location.reload()},ms||500)}'
    // хүлээн авалт
    + 'document.querySelectorAll(".recv").forEach(function(b){b.addEventListener("click",function(){var po=b.dataset.po,items=[];'
    + 'document.querySelectorAll("input.q[data-po=\\""+po+"\\"]").forEach(function(i){var v=parseInt(i.value,10);if(v>0)items.push({id:Number(i.dataset.item),qty:v})});'
    + 'if(!items.length){say("out-po","Ирсэн тоог мөр бүрт бичнэ үү (хоосон = ирээгүй)",true);return}'
    + 'if(!confirm("Хүлээн авах: "+items.reduce(function(s,x){return s+x.qty},0)+" ш. Дэвтэрт бичиж, бүрэн захиалгуудад хуваарилж, SMS дараалалд оруулна. Үргэлжлүүлэх үү?"))return;'
    + 'post({action:"receive",po_id:Number(po),items:items,by:"самбар"},b,"out-po").then(function(j){say("out-po","Ирсэн "+j.received+" ш · хуваарилагдсан захиалга "+j.allocated_orders+" · SMS дараалалд "+j.queued_sms);reload(1200)})})});'
    + 'var csg=document.getElementById("cs-go");if(csg)csg.addEventListener("click",function(){var sku=document.getElementById("cs-sku").value,rs=document.getElementById("cs-reason").value,q=parseInt(document.getElementById("cs-qty").value,10),nt=document.getElementById("cs-note").value.trim();'
    + 'if(!sku||!q){say("out-cs","SKU ба тоог оруулна уу",true);return}if(!confirm((rs==="handover"?"Nexpress-д өгсөн: ":rs==="take_back"?"Nexpress-ээс буцааж авсан: ":"Засвар: ")+q+" ш · "+sku+"\n\nНөөцийн дэвтэрт (in/sale) НӨЛӨӨЛӨХГҮЙ — зөвхөн хаана байгааг тэмдэглэнэ. Зөв үү?"))return;'
    + 'post({action:"courier_stock",sku_id:sku,reason:rs,qty:q,note:nt||undefined,by:"самбар"},csg,"out-cs").then(function(j){say("out-cs","Бичлээ · Nexpress-д нийт "+j.handed_total+" ш ("+sku+")");reload(1000)})});'
    + 'document.querySelectorAll(".pst").forEach(function(b){b.addEventListener("click",function(){var po=Number(b.dataset.po),st=b.dataset.st,body={action:"po",po_id:po};'
    + 'if(st==="eta"){var v=(document.getElementById("eta-"+po)||{}).value;if(!v){say("out-po","ETA огноо сонгоно уу",true);return}body.eta=v}else body.status=st;'
    + 'post(body,b,"out-po").then(function(){say("out-po","PO шинэчлэгдлээ");reload()})})});'
    + 'var pn=document.getElementById("pn-save");if(pn)pn.addEventListener("click",function(){var items=[];String(document.getElementById("pn-items").value||"").split(/\\n/).forEach(function(l){var p=l.split(",").map(function(s){return s.trim()});if(p.length<2||!parseInt(p[1],10))return;var it={qty:parseInt(p[1],10)};if(/^[a-z0-9][a-z0-9-]{2,60}$/.test(p[0]))it.sku_id=p[0];else it.label=p[0];if(p[2])it.unit_cny=Number(p[2]);items.push(it)});'
    + 'if(!items.length){say("out-po","Зүйлийн мөр оруулна уу",true);return}'
    + 'post({action:"po",ext_order_no:document.getElementById("pn-no").value.trim(),supplier:document.getElementById("pn-sup").value.trim(),product_slug:document.getElementById("pn-slug").value.trim(),eta:document.getElementById("pn-eta").value||undefined,paid_usd:document.getElementById("pn-usd").value||undefined,status:"ordered",items:items},pn,"out-po").then(function(j){say("out-po","PO #"+j.po_id+" бүртгэгдлээ");reload()})});'
    + '})();</script></body></html>');
  return out.join('');
}
