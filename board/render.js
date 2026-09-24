/* Starshopping самбар — n8n «Хуудас бүтээх» ба «Судалгааны хуудас» node-оос шилжүүлсэн (2026-09-24).
   Өгөгдөл: /webhook/board-data (түлхүүртэй). Зураг: icons.js, өнгө: board.css. */
function renderBoard(DATA, QUERY) {
  const d = DATA || {};
  const E30 = d.economics_30d || {};
  const E7 = d.economics_7d || {};
  const CH = d.chain || {};
  const CF = d.confirm || {};
  const FN = d.funnel || {};
  const PU = d.pulse || {};
  const C = d.counts || {};
  const R = (d.report && d.report.total) || {};
  const NEXT = Array.isArray(d.next) ? d.next : [];
  const tests = Array.isArray(d.tests) ? d.tests : [];
  const creatives = Array.isArray(d.creatives) ? d.creatives : [];
  const products = Array.isArray(d.products) ? d.products : [];
  const lowStock = Array.isArray(d.low_stock) ? d.low_stock : [];
  const stalled = Array.isArray(d.stalled) ? d.stalled : [];
  const events = Array.isArray(d.events) ? d.events : [];
  const pages = Array.isArray(d.pages) ? d.pages : [];
  const DR = d.delivery_real || {};
  const toCall = Array.isArray(d.to_call) ? d.to_call : [];
  const SEA = d.seasons || {};
  const seaList = Array.isArray(SEA.list) ? SEA.list : [];
  const seaNear = SEA.nearest || null;
  const duties = Array.isArray(d.duties) ? d.duties : [];
  const CAT = d.category || {};
  const ICO = window.ICONS || {};

  const BASE = 'https://starshopping.app.n8n.cloud';
  const n = (v) => (v === null || v === undefined ? 0 : Number(v));
  const has = (v) => v !== null && v !== undefined;
  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const mnt = (v) => (has(v) ? n(v).toLocaleString('en-US') + '₮' : '—');
  const short = (v) => {
    const x = n(v);
    if (x >= 1000000) return (x / 1000000).toFixed(1).replace('.0', '') + 'сая';
    if (x >= 1000) return Math.round(x / 1000) + 'м';
    return String(x);
  };
  const num = (v) => (has(v) ? String(v) : '—');
  const ago = (iso) => {
    if (!iso) return '—';
    const h = (Date.now() - new Date(iso).getTime()) / 3600000;
    if (h < 1) return Math.max(1, Math.round(h * 60)) + 'м';
    if (h < 48) return Math.round(h) + 'ц';
    return Math.round(h / 24) + 'х';
  };

  const H = [];
  const P = (s) => H.push(s);

  const testAction = tests.length ? String(tests[0].ACTION || '') : '';
  const chainPct = has(CH.chain_pct) ? n(CH.chain_pct) : null;
  const chainBroken = chainPct !== null && chainPct < 70;

  // Every colour on the stage is a CSS token from «Загвар», so the drawing follows
  // the light/dark theme like the rest of the page. Order: top face, right face,
  // left face, accent (text / card marker).
  const ST = {
    idle:  ['var(--st-idle-1)',  'var(--st-idle-2)',  'var(--st-idle-3)',  'var(--st-idle-4)'],
    flow:  ['var(--st-flow-1)',  'var(--st-flow-2)',  'var(--st-flow-3)',  'var(--st-flow-4)'],
    wait:  ['var(--st-wait-1)',  'var(--st-wait-2)',  'var(--st-wait-3)',  'var(--st-wait-4)'],
    block: ['var(--st-block-1)', 'var(--st-block-2)', 'var(--st-block-3)', 'var(--st-block-4)']
  };
  const STN = { idle: 'зогсонги', flow: 'урсаж байна', wait: 'чамайг хүлээж байна', block: 'гацсан' };

  const stProducts = n(C.products) === 0 ? 'wait' : 'flow';
  const stCreative = n(C.creatives) === 0 ? (n(C.products) > 0 ? 'wait' : 'idle') : (n(PU.spend_mnt) > 0 ? 'flow' : 'idle');
  const stChat     = n(PU.msg_in) > 0 ? 'flow' : 'idle';
  const stOrder    = n(C.needs_review) > 0 ? 'wait' : (n(PU.orders) > 0 ? 'flow' : 'idle');
  const stConfirm  = n(C.awaiting_confirm) > 0 ? 'wait' : (n(PU.confirm_sent) > 0 ? 'flow' : 'idle');
  const stDeliver  = stalled.length > 0 ? 'block' : (n(PU.delivered) > 0 ? 'flow' : 'idle');

  const steps = Array.isArray(FN.steps) ? FN.steps : [];
  const fStep = (k) => steps.find((s) => s.key === k) || {};
  const fConv = fStep('conversations'), fPlaced = fStep('placed');
  const fConf = fStep('confirmed'), fDeliv = fStep('delivered');

  const PODS = [
    { id: 'prod', t: 'БАРАА · ШҮҮР', v: n(C.products), u: 'идэвхтэй бараа', st: stProducts, vol: n(C.products),
      href: '/form/product', act: 'Бараа бүртгэх',
      rows: [['нөөц бага', lowStock.length], ['төлөв', STN[stProducts]]] },
    { id: 'crea', t: 'КРЕАТИВ · ЗАР', v: n(C.creatives), u: 'бүртгэлтэй креатив', st: stCreative, vol: n(C.creatives),
      href: '/form/creative', act: 'Креатив бүртгэх',
      rows: [['зар 24ц', mnt(PU.spend_mnt)], ['төлөв', STN[stCreative]]] },
    { id: 'chat', t: 'ЧАТ · СЭТГЭГДЭЛ', v: n(PU.msg_in), u: 'мессеж 24ц', st: stChat, vol: n(fConv.n),
      href: '', act: '',
      rows: [['бот хариу', n(PU.msg_out)], ['яриа 30х', n(fConv.n)]] },
    { id: 'ordr', t: 'ЗАХИАЛГА', v: n(PU.orders), u: 'захиалга 24ц', st: stOrder, vol: n(fPlaced.n),
      href: '/form/order', act: 'Гар захиалга',
      rows: [['шалгах', n(C.needs_review)], ['нийт', n(C.orders)]] },
    { id: 'conf', t: 'БАТАЛГААЖУУЛАЛТ', v: n(C.awaiting_confirm), u: 'хүлээгдэж буй', st: stConfirm, vol: n(fConf.n),
      href: '/form/confirm', act: 'Утсаар баталгаажуулах',
      rows: [['утсаар залгах', toCall.length], ['баталгаажсан', has(CF.confirm_pct) ? CF.confirm_pct + '%' : '—']] },
    { id: 'delv', t: 'ХҮРГЭЛТ', v: n(PU.delivered), u: 'хүргэсэн 24ц', st: stDeliver, vol: n(fDeliv.n),
      href: '/form/delivery', act: 'Статус оруулах',
      rows: [['гацсан', stalled.length], ['бодит хүргэлт', has(DR.pct) ? DR.pct + '%' : '—']] }
  ];

  // n8n serves webhook pages under a CSP sandbox without allow-same-origin, so
  // the browser has no localStorage here. The chosen theme therefore travels in
  // the address (?theme=dark|light) and is stamped on <html> before any CSS is
  // parsed; no query means "auto" — prefers-color-scheme decides.
  const Q = QUERY || {};
  const themeQ = Q.theme === 'dark' || Q.theme === 'light' ? Q.theme : '';
  P('<!doctype html><html lang="mn"' + (themeQ ? ' data-theme="' + themeQ + '"' : '') + '><head><meta charset="utf-8">');
  P('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">');
  P('<meta name="color-scheme" content="light dark">');
  P('<title>Starshopping · Систем зураглал</title>');
  // Where storage does exist (a browser without the sandbox), it still restores
  // the last choice before first paint; the try/catch swallows the sandbox error.
  if (!themeQ) P('<script>(function(){try{var t=localStorage.getItem("ss_board_theme");'
    + 'if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();</script>');
  P('<style>');
  P('');
  P('</style></head><body><div class="w">');

  const gen = String(d.generated_at || '').replace('T', ' ').slice(0, 16);
  P('<header><div class="hd"><div class="bm">S</div><div>');
  P('<div class="bt">Starshopping</div><div class="bs">Систем зураглал · ' + esc(gen) + ' UTC</div></div>');
  P('<div class="sp"></div>');
  P('<a class="chip gold" href="/board/' + (themeQ ? '?theme=' + themeQ : '') + '">▶ Даалгавар</a>');
  const alive = n(PU.msg_in) > 0 || n(PU.orders) > 0;
  P('<span class="chip"><span class="dot' + (alive ? '' : ' off') + '"></span>' + (alive ? 'LIVE' : 'ЧИМЭЭГҮЙ') + '</span>');
  const SCN = d.scan || {};
  if (CAT.chosen) {
    P('<span class="chip gold">КАТЕГОРИ · ' + esc(CAT.name)
      + (has(CAT.days_left) ? ' <em>' + n(CAT.days_left) + ' хоног</em>' : '') + '</span>');
  } else if (CAT.mode === 'search') {
    P('<span class="chip gold">ЗАХ ЗЭЭЛ СУДАЛЖ БАЙНА' + (CAT.top ? ' <em>топ: ' + esc(CAT.top) + '</em>' : '') + '</span>');
  } else {
    P('<span class="chip crit">■ КАТЕГОРИ СОНГООГҮЙ</span>');
  }
  P('<span class="chip">Meta · Supabase · Claude · Telegram</span>');
  P('<a class="rf" href="">Шинэчлэх</a>');
  P('<button class="tb" id="tb" type="button" aria-label="Горим">◐ Авто</button>');
  P('</div></header>');

  function kpi(l, v, s, cls) {
    P('<div class="k ' + (cls || '') + '"><div class="kl">' + esc(l) + '</div><div class="kv">' + esc(v) + '</div>');
    if (s) P('<div class="ks">' + esc(s) + '</div>');
    P('</div>');
  }
  const net = n(E30.net_profit_mnt);
  const cpaOk = has(E30.cpa_mnt) && has(E30.breakeven_cpa_mnt) && n(E30.cpa_mnt) <= n(E30.breakeven_cpa_mnt);
  P('<div class="kpi">');
  kpi('Цэвэр ашиг 30х', mnt(net), E30.verdict || 'дата алга', net > 0 ? 'good' : (net < 0 ? 'crit' : ''));
  kpi('Зарын зардал', mnt(E30.ad_spend_mnt), 'хувь нэмэр ' + mnt(E30.gross_contribution_mnt));
  kpi('CPA', mnt(E30.cpa_mnt), 'босго ' + mnt(E30.breakeven_cpa_mnt), has(E30.cpa_mnt) ? (cpaOk ? 'good' : 'crit') : '');
  kpi('ROAS', num(E30.roas), '7х ' + num(E7.roas));
  kpi('Хүргэлт', has(E30.delivered_pct) ? E30.delivered_pct + '%' : '—', n(E30.delivered) + ' / ' + n(E30.placed));
  kpi('Хэмжилтийн гинж', chainPct !== null ? chainPct + '%' : '—', CH.verdict || '',
    chainPct === null ? '' : (chainBroken ? 'crit' : 'good'));

  const BAND = { far: '', act: 'good', late: 'warn', toolate: 'crit' };
  const seaCls = seaNear ? (BAND[seaNear.band] || '') : '';
  P('<details class="k sea ' + seaCls + '"><summary>');
  P('<div class="kl">Ойрын сизон</div>');
  P('<div class="kv">' + (seaNear ? n(seaNear.days_left) + ' хоног' : '—') + '</div>');
  P('<div class="ks">' + (seaNear ? esc(seaNear.name) + ' · ' + esc(seaNear.band_label)
      : 'хуанли хоосон') + '</div>');
  P('</summary><div class="sl">');
  if (!seaList.length) {
    P('<div class="sr"><span>Арга хэмжээ бүртгэгдээгүй</span></div>');
  } else {
    seaList.forEach((e) => {
      P('<div class="sr ' + (BAND[e.band] || '') + '"><span>' + esc(e.name) + '</span>');
      P('<b>' + esc(e.event_date) + ' · ' + n(e.days_left) + 'х</b></div>');
      if (e.idea) P('<div class="si">' + esc(e.idea) + '</div>');
    });
  }
  P('<div class="si sn">' + esc(SEA.rule || '') + '</div>');
  P('</div></details>');

  // Зах зээлийн скан — Ad Library-гаас долоо хоног бүр (Даваа 09:00) уншсан дохио.
  // Категори одоо «хайлтын горим»-д: энэ тайлбар л аль зах зээл рүү орохыг хэлнэ.
  const sig = Array.isArray(SCN.signal) ? SCN.signal : [];
  const ENT = SCN.entry || null;   // хаалга (≥ ашигтай үнэ, 2+ хуудас) давсан топ категори
  const scanCls = !SCN.has_data ? 'crit' : (SCN.stale ? 'warn' : (ENT ? 'good' : ''));
  P('<details class="k sea ' + scanCls + '"><summary>');
  P('<div class="kl">Зах зээл · скан</div>');
  P('<div class="kv">' + (ENT ? esc(ENT.category) + ' ✓' : (sig.length ? esc(sig[0].category) + ' ✗' : '—')) + '</div>');
  P('<div class="ks">' + (SCN.has_data
      ? n(SCN.ads_180) + ' зар 180+ · ' + n(SCN.pages_live) + ' хуудас · ' + n(SCN.days_since) + 'х өмнө'
      : 'скан ажиллаагүй') + '</div>');
  P('</summary><div class="sl">');
  if (!sig.length) {
    P('<div class="sr"><span>' + esc(SCN.verdict || 'Дохио алга') + '</span></div>');
  } else {
    sig.forEach((s, i) => {
      P('<div class="sr ' + (i === 0 ? 'good' : '') + '"><span>' + (i + 1) + '. ' + esc(s.category) + '</span>');
      P('<b>' + n(s.pages_180) + ' хуудас · ' + (has(s.median_price) ? mnt(s.median_price) : '—')
        + ' · хаалга ' + (s.gate_ok ? '✓' : '✗') + '</b></div>');
      P('<div class="si">' + esc(s.why || '') + '</div>');
    });
  }
  if (n(SCN.rising_n) > 0) P('<div class="sr warn"><span>Өсөж байна (30 хоногоос залуу, клонтой)</span><b>' + n(SCN.rising_n) + '</b></div>');
  P('<div class="si sn">Дараагийн скан: Даваа 09:00 · Chrome нээлттэй, Facebook нэвтэрсэн байх · '
    + 'хаалга: ≥' + mnt(SCN.rules && SCN.rules.viable_price_mnt) + ' үнэтэй 180+ хуудас 2+ (' + mnt(SCN.rules && SCN.rules.min_contribution_mnt)
    + ' үлдэнэ) · жин ЗЭЭЛСЭН · <a href="' + '/board/?view=research' + (themeQ ? '&theme=' + themeQ : '') + '">дэлгэрэнгүй →</a></div>');
  P('</div></details>');

  // Захиалгын маягт — сайт алхам бүрийг checkout_events-д бичнэ (Блок Z.9).
  // «Захиалах» дарсан хүн утсаа илгээх хүртэл хаана унаж байгааг нэрлэнэ.
  const CO = d.checkout || {};
  const coSteps = Array.isArray(CO.steps) ? CO.steps : [];
  const coOpen = coSteps.length ? n(coSteps[0].n) : 0;
  const coOk = coSteps.length ? n(coSteps[coSteps.length - 1].n) : 0;
  const coCls = /ГООЖИЖ/.test(CO.verdict || '') ? 'crit' : (/доош/.test(CO.verdict || '') ? 'warn' : (coOpen ? 'good' : ''));
  P('<details class="k sea ' + coCls + '"><summary>');
  P('<div class="kl">Захиалгын маягт · 7х</div>');
  P('<div class="kv">' + (coOpen ? (has(CO.submit_pct) ? CO.submit_pct : 0) + '%' : '—') + '</div>');
  P('<div class="ks">' + (coOpen ? coOpen + ' нээж · ' + coOk + ' захиалга' : 'дата алга') + '</div>');
  P('</summary><div class="sl">');
  coSteps.forEach((st, i) => P('<div class="sr ' + (i && n(st.n) === 0 && coOpen ? 'crit' : '') + '"><span>' + esc(st.label) + '</span><b>' + n(st.n) + '</b></div>'));
  if (CO.leak) P('<div class="si"><b>Хамгийн их алдагдал:</b> ' + esc(CO.leak) + '</div>');
  (Array.isArray(CO.by_app) ? CO.by_app : []).slice(0, 4).forEach((a) => P('<div class="si">' + esc(a.in_app === 'fb' ? 'FB апп' : a.in_app === 'ig' ? 'IG апп' : 'хөтөч')
    + ' · ' + esc(a.device) + ': ' + n(a.opened) + ' нээж, ' + n(a.ok) + ' захиалга</div>'));
  (Array.isArray(CO.errors) ? CO.errors : []).slice(0, 3).forEach((e) => P('<div class="si">алдаа: ' + esc(e.detail) + ' ×' + n(e.n) + '</div>'));
  P('<div class="si sn">' + esc(CO.verdict || '') + ' · зар асаахаас өмнө энэ хувь 0 биш байх ёстой</div>');
  P('</div></details>');
  P('</div>');

  const S = 30, OX = 500, OY = 310, VW = 1000, VH = 600;
  const ip = (gx, gy) => [(gx - gy) * 0.866 * S + OX, (gx + gy) * 0.5 * S + OY];
  const f1 = (v) => Math.round(v * 10) / 10;
  const RING = 5.3, PR = 1.2, BR = 1.5;
  const ANG = [210, 270, 330, 30, 90, 150];
  const maxVol = Math.max(1, ...PODS.map((p) => n(p.vol)));

  // One platform. The light sits upper-left-front: the top face is lifted by a
  // sheen, the left (+y) face carries a light shade, the right (+x) face a deep
  // one, and both side faces darken towards the ground (ambient occlusion). A
  // blurred contact shadow falls back-right; the top edge catches a highlight
  // and an inset plate gives the surface a machined look.
  function quad(gx, gy, r, h) {
    const a = ip(gx - r, gy - r), b = ip(gx + r, gy - r), c = ip(gx + r, gy + r), e = ip(gx - r, gy + r);
    return { a: a, b: b, c: c, e: e,
      top: pts4([a, b, c, e], h), left: pts4([e, c], h) + ' ' + pts4([c, e], 0), right: pts4([c, b], h) + ' ' + pts4([b, c], 0) };
  }
  function pts4(arr, h) { return arr.map((p) => f1(p[0]) + ',' + f1(p[1] - h)).join(' '); }
  function pg(points, fill, extra) { return '<polygon points="' + points + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function slab(gx, gy, r, h, cols, dim) {
    const q = quad(gx, gy, r, h), c = ip(gx, gy);
    const rx = f1(r * 2 * 0.866 * S * 0.62), ry = f1(r * 2 * 0.5 * S * 0.62);
    let s = '<g' + (dim ? ' opacity=".6"' : '') + '>';
    s += '<ellipse cx="' + f1(c[0] + 6) + '" cy="' + f1(c[1] + 4) + '" rx="' + rx + '" ry="' + ry
      + '" fill="var(--shd)" style="opacity:var(--shd-o)" filter="url(#blur)"/>';
    s += pg(q.left, cols[1]) + pg(q.left, '#000', ' opacity=".08"') + pg(q.left, 'url(#ao)');
    s += pg(q.right, cols[2]) + pg(q.right, '#000', ' opacity=".22"') + pg(q.right, 'url(#ao)');
    s += pg(q.top, cols[0]) + pg(q.top, 'url(#sheen)');
    s += pg(quad(gx, gy, r * 0.8, h).top, '#fff', ' opacity=".07"')
      + pg(quad(gx, gy, r * 0.8, h).top, 'none', ' stroke="#000" stroke-opacity=".14" stroke-width=".8"');
    s += pg(q.top, 'none', ' stroke="var(--edge)" stroke-width="1" stroke-linejoin="round"');
    s += '</g>';
    return s;
  }

  function face(gx, gy, r, h) { return quad(gx, gy, r, h).top; }

  const pos = [];
  PODS.forEach((p, i) => {
    const a = ANG[i] * Math.PI / 180;
    const gx = RING * Math.cos(a), gy = RING * Math.sin(a);
    const h = 10 + Math.round(20 * (n(p.vol) / maxVol));
    const xy = ip(gx, gy);
    pos.push({ i: i, gx: gx, gy: gy, x: xy[0], y: xy[1], h: h, p: p, dep: gx + gy });
  });

  const CARD = [
    { l: 4,  t: 4,  w: 20, ax: 240, ay: 76 },
    { l: 74, t: 3,  w: 20, ax: 740, ay: 70 },
    { l: 77, t: 41, w: 20, ax: 770, ay: 298 },
    { l: 65, b: 1,  w: 20, ax: 650, ay: 524 },
    { l: 8,  b: 1,  w: 20, ax: 280, ay: 527 },
    { l: 2,  t: 40, w: 20, ax: 220, ay: 292 }
  ];

  P('<div class="main"><div>');
  P('<div class="stage"><div class="scene">');
  P('<svg viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="Системийн зураглал">');
  // Shared shading resources. Colour-free on purpose: they multiply whatever token
  // sits underneath, so the same defs serve both themes and every object.
  P('<defs>'
    + '<filter id="blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4"/></filter>'
    + '<filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.5"/></filter>'
    + '<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/>'
    + '<stop offset=".55" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".07"/></linearGradient>'
    + '<linearGradient id="ao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/>'
    + '<stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>'
    + '<linearGradient id="cyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".3"/>'
    + '<stop offset=".3" stop-color="#fff" stop-opacity=".16"/><stop offset=".55" stop-color="#000" stop-opacity="0"/>'
    + '<stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>'
    + '</defs>');

  P('<g stroke="var(--iso-grid)" stroke-width="1">');
  for (let i = -8; i <= 8; i++) {
    const a1 = ip(i, -8), b1 = ip(i, 8);
    P('<line x1="' + f1(a1[0]) + '" y1="' + f1(a1[1]) + '" x2="' + f1(b1[0]) + '" y2="' + f1(b1[1]) + '"/>');
    const a2 = ip(-8, i), b2 = ip(8, i);
    P('<line x1="' + f1(a2[0]) + '" y1="' + f1(a2[1]) + '" x2="' + f1(b2[0]) + '" y2="' + f1(b2[1]) + '"/>');
  }
  P('</g>');

  const rt = (base, st) => (n(base.n) >= 10 && has(st.rate) ? n(st.rate) : null);
  const RATES = [null, null, null, rt(fConv, fPlaced), rt(fPlaced, fConf), rt(fConf, fDeliv)];
  const badges = [];
  P('<g fill="none" stroke-linecap="round">');
  for (let i = 0; i < 5; i++) {
    const a = pos[i], b = pos[i + 1], r = RATES[i + 1];
    const wdt = r === null ? 1.5 : Math.max(1.8, 1.8 + (r / 100) * 6);
    const col = r === null ? 'var(--rate-none)' : (r >= 50 ? 'var(--rate-hi)' : (r >= 20 ? 'var(--rate-mid)' : 'var(--rate-lo)'));
    const dash = r === null ? ' stroke-dasharray="4 5"' : '';
    P('<line x1="' + f1(a.x) + '" y1="' + f1(a.y - a.h - 2) + '" x2="' + f1(b.x) + '" y2="' + f1(b.y - b.h - 2)
      + '" stroke="' + col + '" stroke-width="' + f1(wdt) + '"' + dash + '/>');
    if (r !== null) badges.push([a.x + (b.x - a.x) * 0.42, (a.y - a.h - 2) + ((b.y - b.h - 2) - (a.y - a.h - 2)) * 0.42, col, Math.round(r)]);
  }
  P('<line x1="' + f1(pos[5].x) + '" y1="' + f1(pos[5].y - pos[5].h - 2) + '" x2="' + OX + '" y2="' + (OY - 26)
    + '" stroke="var(--hub)" stroke-width="1.3" stroke-dasharray="3 5"/>');
  P('<line x1="' + f1(pos[0].x) + '" y1="' + f1(pos[0].y - pos[0].h - 2) + '" x2="' + OX + '" y2="' + (OY - 26)
    + '" stroke="var(--hub)" stroke-width="1.3" stroke-dasharray="3 5"/>');
  P('</g>');

  P('<g fill="none" stroke-linecap="round">');
  pos.forEach((o, i) => {
    const cd = CARD[i], cols = ST[o.p.st];
    P('<line class="lnk' + (o.p.st === 'idle' ? '' : ' fast') + '" x1="' + f1(o.x) + '" y1="' + f1(o.y - o.h - 6)
      + '" x2="' + cd.ax + '" y2="' + cd.ay + '" stroke="' + cols[0] + '" stroke-width="1.3" stroke-dasharray="5 6" opacity=".62"/>');
    P('<circle cx="' + cd.ax + '" cy="' + cd.ay + '" r="2.6" fill="' + cols[0] + '"/>');
  });
  P('</g>');

  const brainCols = ['var(--brain1)', 'var(--brain2)', 'var(--brain3)'];
  const decCol = testAction === 'ЗОГСОО' ? 'var(--dec-stop)' : testAction === 'ӨРГӨТГӨ' ? 'var(--dec-go)'
    : testAction ? 'var(--dec-fix)' : 'var(--dec-none)';
  const solids = pos.map((o) => ({ dep: o.dep, kind: 'pod', o: o }));
  solids.push({ dep: 0, kind: 'brain' });
  solids.sort((a, b) => a.dep - b.dep);
  solids.forEach((s) => {
    if (s.kind === 'brain') {
      // the hub: a taller plinth with a second, smaller tier and the decision ring glowing on top
      P(slab(0, 0, BR, 16, brainCols, false));
      P(slab(0, 0, BR * 0.72, 24, brainCols, false));
      const ring = face(0, 0, BR * 0.72, 24.6);
      if (testAction) P('<polygon points="' + ring + '" fill="none" stroke="' + decCol + '" stroke-width="5" opacity=".55" filter="url(#glow)"/>');
      P('<polygon points="' + ring + '" fill="none" stroke="' + decCol + '" stroke-width="1.8" opacity="' + (testAction ? '.95' : '.55') + '"/>');
      return;
    }
    const o = s.o, p = o.p, cols = ST[p.st];
    if (p.st !== 'idle') {
      // an active platform sits in a pool of its own colour
      P('<ellipse cx="' + f1(o.x) + '" cy="' + f1(o.y) + '" rx="' + f1(PR * 1.5 * 2 * 0.866 * S)
        + '" ry="' + f1(PR * 1.5 * 2 * 0.5 * S) + '" fill="' + cols[0] + '" style="opacity:var(--glow-o)" filter="url(#blur)"/>');
      P('<ellipse cx="' + f1(o.x) + '" cy="' + f1(o.y) + '" rx="' + f1(PR * 1.32 * 2 * 0.866 * S)
        + '" ry="' + f1(PR * 1.32 * 2 * 0.5 * S) + '" fill="none" stroke="' + cols[0] + '" stroke-width="1" opacity=".3"/>');
    }
    P(slab(o.gx, o.gy, PR, o.h, cols, p.st === 'idle'));
    P('<g class="ico ' + (p.st === 'idle' ? 'dim' : 'fast') + '" transform="translate(' + f1(o.x) + ','
      + f1(o.y - o.h) + ') scale(1.15)">' + (ICO[p.id] || '') + '</g>');
  });

  badges.forEach((bd) => {
    P('<circle cx="' + f1(bd[0]) + '" cy="' + f1(bd[1]) + '" r="11.5" fill="var(--badge-bg)" stroke="' + bd[2] + '" stroke-width="1"/>');
    P('<text x="' + f1(bd[0]) + '" y="' + f1(bd[1] + 3.4) + '" text-anchor="middle" fill="var(--badge-ink)" font-size="9" font-weight="700">' + bd[3] + '%</text>');
  });

  P('<g text-anchor="middle">');
  P('<text x="' + OX + '" y="' + (OY - 68) + '" fill="var(--ink2)" font-size="9" letter-spacing="2.6" font-weight="700">ТАРХИ</text>');
  P('<text x="' + OX + '" y="' + (OY - 20) + '" fill="' + decCol + '" font-size="'
    + (testAction ? 16 : 13) + '" font-weight="' + (testAction ? 800 : 600) + '" letter-spacing="'
    + (testAction ? '.5' : '0') + '">' + esc(testAction || 'тест алга') + '</text>');
  P('</g></svg>');

  pos.forEach((o, i) => {
    const p = o.p, cd = CARD[i], cols = ST[p.st];
    const stl = 'left:' + cd.l + '%;' + (cd.b === undefined ? 'top:' + cd.t : 'bottom:' + cd.b)
      + '%;width:' + cd.w + '%;--st:' + cols[3];
    P(p.href ? '<a class="pc" target="_blank" rel="noopener" href="' + BASE + p.href + '" style="' + stl + '">'
             : '<div class="pc" style="' + stl + '">');
    P('<div class="pct"><span class="pcd"></span>' + esc(p.t) + '</div>');
    P('<div class="pcv">' + esc(short(p.v)) + '<em>' + esc(p.u) + '</em></div>');
    p.rows.forEach((r) => P('<div class="pcr"><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'));
    if (p.act) P('<div class="pca">' + esc(p.act) + ' →</div>');
    P(p.href ? '</a>' : '</div>');
  });
  P('</div>');

  P('<div class="legend">');
  [['idle', STN.idle], ['flow', STN.flow], ['wait', STN.wait], ['block', STN.block]].forEach((L2) => {
    P('<span class="lg"><span class="sw" style="background:' + ST[L2[0]][0] + '"></span>' + esc(L2[1]) + '</span>');
  });
  P('<span class="lg">Өндөр = эзлэхүүн · шугамын зузаан = хөрвөлт · хөдөлгөөний хурд = идэвх</span>');
  P('</div></div>');

  P('<div class="stack">');
  pos.forEach((o) => {
    const p = o.p, cols = ST[p.st];
    if (p.href) P('<a class="sp2" target="_blank" rel="noopener" href="' + BASE + p.href + '">');
    else P('<div class="sp2">');
    P('<span class="d" style="background:' + cols[0] + '"></span><div class="tt">');
    P('<div class="n1">' + esc(p.t) + '</div><div class="n2">' + esc(p.u) + ' · '
      + esc(p.rows[0][0]) + ' ' + esc(p.rows[0][1]) + '</div></div>');
    P('<div class="vv">' + esc(short(p.v)) + '</div>');
    P(p.href ? '</a>' : '</div>');
  });
  P('</div>');

  const ACTS = [
    ['📦', 'Бараа бүртгэх', 'тестлэх бараа', '/form/product'],
    ['🎬', 'Креатив бүртгэх', 'зарын ӨМӨНӨ', '/form/creative'],
    ['💸', 'Зарын зардал', 'өдөр бүр', '/form/spend'],
    ['🚚', 'Хүргэлтийн статус', 'утсаар', '/form/delivery'],
    ['📝', 'Гар захиалга', 'утсаар ирсэн', '/form/order'],
    ['⚙️', 'Зардлын тохиргоо', 'хүргэлт, сав', '/form/costs']
  ];
  P('<h2>Үйлдэл</h2><div class="rail r3">');
  ACTS.forEach((a) => {
    P('<a class="act" target="_blank" rel="noopener" href="' + BASE + a[3] + '">');
    P('<div class="ic">' + a[0] + '</div><div class="nm">' + esc(a[1]) + '</div>');
    P('<div class="sb">' + esc(a[2]) + '</div></a>');
  });
  P('</div>');

  // Судалгаа: Монголын зар/reel нэг маягтад, гадаадын бараа тусдаа маягтад —
  // гадаадынх Монголын hook-ийн статистикийг бохирдуулахгүй. Ad Library-г MN-ээр
  // нээх холбоос нь зар хайх газраа шууд очих товч.
  const RES = [
    ['📊', 'Судалгааны самбар', 'категори · hook · зохиомж', '/board/?view=research' + (themeQ ? '&theme=' + themeQ : '')],
    ['🎞', 'Reel / зар бүртгэх', 'Монголд явж буй', BASE + '/form/reel'],
    ['🌍', 'Гадаад viral', 'Монголд хараахан байхгүй', BASE + '/form/global']
  ];
  P('<h2>Судалгаа</h2><div class="rail r3">');
  RES.forEach((a) => {
    P('<a class="act"' + (a[3].indexOf('/board/') === 0 ? '' : ' target="_blank" rel="noopener"') + ' href="' + a[3] + '">');
    P('<div class="ic">' + a[0] + '</div><div class="nm">' + esc(a[1]) + '</div>');
    P('<div class="sb">' + esc(a[2]) + '</div></a>');
  });
  P('</div>');

  P('<h2>Өнөөдөр юу хийх вэ</h2>');
  if (!NEXT.length) {
    P('<div class="em">Хийх яаралтай зүйл алга.</div>');
  } else {
    P('<div class="todo">');
    NEXT.forEach((t) => {
      const act = t.action && t.action !== 'board' ? t.action : null;
      P('<div class="td"><span class="pri p' + n(t.p) + '"></span><div class="tx">' + esc(t.text) + '</div>');
      if (act && t.label) P('<a class="go" target="_blank" rel="noopener" href="' + BASE + '/form/' + esc(act) + '">' + esc(t.label) + '</a>');
      P('</div>');
    });
    P('</div>');
  }

  if (duties.length) {
    const DS = { ok: ['ok', '✓ хийгдсэн'], warn: ['warn', '⚠ анхаар'],
                 crit: ['crit', '■ ЗААВАЛ'], auto: ['auto', '⚙ автомат'] };
    P('<h2>Гараар хийх ажил</h2><div class="sc"><table class="dut">');
    P('<tr><th>Ажил</th><th>Хэзээ</th><th>Одоо</th><th>Төлөв</th><th></th></tr>');
    duties.forEach((x) => {
      const st = DS[x.status] || DS.ok;
      P('<tr class="r-' + esc(x.status) + '"><td><b>' + esc(x.label) + '</b>');
      if (x.hint && (x.status === 'crit' || x.status === 'warn')) P('<div class="dh">' + esc(x.hint) + '</div>');
      P('</td><td class="wh">' + esc(x.when) + '</td>');
      P('<td class="nm">' + esc(x.value) + '</td>');
      P('<td><span class="ds ' + st[0] + '">' + st[1] + '</span></td>');
      P('<td>' + (x.action ? '<a class="go" target="_blank" rel="noopener" href="' + BASE + '/form/'
        + esc(x.action) + '">' + esc(x.btn || 'Нээх') + '</a>' : '') + '</td></tr>');
    });
    P('</table></div>');
  }
  P('</div>');

  P('<div class="side">');
  P('<div class="sh"><b>Эцсийн тайлан</b></div>');
  const Pl = R.placed || {}, Dl = R.delivered || {}, Ec = R.economics || {};
  P('<div class="row hd2"><span>Өчигдөр · ' + esc(R.date || '') + '</span></div>');
  [['Өгөгдсөн захиалга', n(Pl.total)],
   ['чат / вэб', n(Pl.chat) + ' / ' + n(Pl.web)],
   ['давтан', n(Pl.repeat)],
   ['Өгөгдсөн орлого', mnt(Pl.revenue_mnt)],
   ['Хүргэгдсэн', n(Dl.total)],
   ['хүргэсэн орлого', mnt(Dl.revenue_mnt)],
   ['барааны өртөг', mnt(Dl.cogs_mnt)],
   ['хүргэлтийн зардал', mnt(Dl.delivery_mnt)],
   ['Цуцлагдсан', n(R.cancelled)],
   ['Буцаалт', mnt(R.refund_mnt)]
  ].forEach((r) => P('<div class="row"><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'));
  P('<div class="row hd2"><span>Жинхэнэ ашиг</span></div>');
  P('<div class="row"><span>хувь нэмэр</span><b>' + mnt(Dl.contribution_mnt) + '</b></div>');
  P('<div class="row"><span>зарын зардал</span><b>' + mnt(Ec.ad_spend_mnt) + '</b></div>');
  P('<div class="row"><span>Цэвэр</span><b class="' + (n(Ec.net_mnt) > 0 ? 'good' : (n(Ec.net_mnt) < 0 ? 'crit' : '')) + '">' + mnt(Ec.net_mnt) + '</b></div>');
  P('<div class="row"><span>системийн зардал</span><b>' + mnt(R.system_cost_mnt) + '</b></div>');
  P('<div class="row hd2"><span>Анхаарал</span></div>');
  P('<div class="row"><span>баталгаажуулалт хүлээж буй</span><b class="' + (n(C.awaiting_confirm) ? 'warn' : '') + '">' + n(C.awaiting_confirm) + '</b></div>');
  P('<div class="row"><span>операторын дараалал</span><b class="' + (n(C.operator_queue) ? 'crit' : '') + '">' + n(C.operator_queue) + '</b></div>');
  P('<div class="row"><span>утсаар залгах (вэб/гар)</span><b class="' + (toCall.length ? 'crit' : '') + '">' + toCall.length + '</b></div>');
  P('<div class="row"><span>гацсан захиалга</span><b class="' + (stalled.length ? 'crit' : '') + '">' + stalled.length + '</b></div>');
  P('<div class="row"><span>шалгах захиалга</span><b class="' + (n(C.needs_review) ? 'warn' : '') + '">' + n(C.needs_review) + '</b></div>');
  const wns = Array.isArray(E30.warnings) ? E30.warnings : [];
  if (wns.length) P('<div class="note">⚠️ ' + wns.map(esc).join('<br>⚠️ ') + '</div>');
  P('<div class="note">Тоонууд нь хүргэгдсэн захиалга дээр тооцогдоно. Сүүлийн мессеж '
    + esc(ago(PU.last_inbound)) + ' · захиалга ' + esc(ago(PU.last_order)) + ' өмнө.</div>');
  P('</div></div>');

  const tone = (a) => (a === 'ЗОГСОО' ? 'stop' : a === 'ӨРГӨТГӨ' ? 'go' : a === 'ХЭМЖИЛТ ЗАС' ? 'fix' : 'wait');
  const ico = (a) => (a === 'ЗОГСОО' ? '■' : a === 'ӨРГӨТГӨ' ? '▲' : a === 'ХЭМЖИЛТ ЗАС' ? '⚠' : '●');
  if (tests.length) {
    P('<h2>Шийдвэр</h2>');
    tests.forEach((t) => {
      const tn = tone(t.ACTION);
      const pc = has(t.spend_pct_of_cap) ? Math.min(100, n(t.spend_pct_of_cap)) : 0;
      const k90 = n(t.cap_mnt) ? Math.min(100, 100 * n(t.kill_90_mnt) / n(t.cap_mnt)) : 0;
      const k95 = n(t.cap_mnt) ? Math.min(100, 100 * n(t.kill_95_mnt) / n(t.cap_mnt)) : 0;
      P('<div class="t ' + tn + '"><div class="th"><div class="tn">' + esc(t.product || '—') + '</div>');
      P('<span class="b ' + tn + '">' + ico(t.ACTION) + ' ' + esc(t.ACTION) + '</span></div>');
      if (t.hypothesis) P('<div class="hy">«' + esc(t.hypothesis) + '»</div>');
      P('<div class="rs">' + esc(t.reason || '') + '</div>');
      P('<div class="track"><i style="width:' + pc + '%"></i><u style="left:' + k90 + '%"></u><u style="left:' + k95 + '%"></u></div>');
      P('<div class="tl"><span>' + mnt(t.spend_mnt) + '</span><span>зогсоох ' + mnt(t.kill_90_mnt) + ' · ' + mnt(t.kill_95_mnt) + '</span><span>таг ' + mnt(t.cap_mnt) + '</span></div>');
      P('<div class="mini">');
      [[n(t.days), 'хоног'], [n(t.conversations), 'яриа'], [n(t.placed), 'захиалга'],
       [n(t.delivered), 'хүргэсэн'], [mnt(t.cpa_delivered_mnt), 'CPA'],
       [mnt(t.breakeven_cpa_mnt), 'босго'], [mnt(t.net_mnt), 'цэвэр']]
        .forEach((m) => P('<div><b>' + esc(m[0]) + '</b>' + esc(m[1]) + '</div>'));
      P('</div></div>');
    });
  }

  const alerts = [];
  toCall.forEach((o) => alerts.push(['залгах', (o.customer || 'нэргүй') + ' · ' + (o.phone || 'утас алга') + ' · '
    + (o.product || '') + ' · ' + n(o.total_mnt).toLocaleString('en-US') + '₮ · ' + n(o.hours_since) + ' цаг', 'crit']));
  stalled.forEach((s) => alerts.push(['гацсан', (s.product || 'бараа?') + ' · ' + (s.status || '') + ' · ' + n(s.idle_days) + ' хоног · ' + (s.phone || ''), 'crit']));
  lowStock.forEach((s) => alerts.push(['нөөц', s.name + ' — үлдэгдэл ' + n(s.stock_qty), '']));
  events.forEach((e) => alerts.push(['хуанли', e.name + ' — ' + n(e.days_left) + ' хоног (' + e.event_date + ')', '']));
  if (alerts.length) {
    P('<h2>Анхаарах</h2>');
    alerts.forEach((a) => P('<div class="al ' + a[2] + '"><span class="tag">' + esc(a[0]) + '</span><span>' + esc(a[1]) + '</span></div>'));
  }

  if (creatives.length) {
    P('<h2>Креатив · 30 хоног</h2><div class="sc"><table><tr>');
    ['Креатив', 'Бараа', 'Зар', 'Захиалга', 'Хүргэсэн', 'CPA', 'Цэвэр', 'Дүгнэлт'].forEach((h) => P('<th>' + h + '</th>'));
    P('</tr>');
    creatives.forEach((c) => P('<tr><td>' + esc(c.creative_id) + '</td><td>' + esc(c.product || '—') + '</td><td class="nm">' + mnt(c.spend_mnt)
      + '</td><td class="nm">' + n(c.placed) + '</td><td class="nm">' + n(c.delivered) + '</td><td class="nm">' + mnt(c.cpa_mnt)
      + '</td><td class="nm">' + mnt(c.net_mnt) + '</td><td>' + esc(c.verdict || '') + '</td></tr>'));
    P('</table></div>');
  }
  if (products.length) {
    P('<h2>Бараа</h2><div class="sc"><table><tr>');
    ['Нэр', 'Үнэ', 'Нөөц', 'Категори'].forEach((h) => P('<th>' + h + '</th>'));
    P('</tr>');
    products.forEach((p) => P('<tr><td>' + esc(p.name) + '</td><td class="nm">' + mnt(p.price_mnt) + '</td><td>'
      + (p.in_stock ? 'байна' : 'ДУУССАН') + '</td><td>' + esc(p.category || '—') + '</td></tr>'));
    P('</table></div>');
  }

  P('<footer>');
  [['Бараа', n(C.products)], ['Креатив', n(C.creatives)],
   ['Яриа', n(C.conversations)], ['Захиалга', n(C.orders)],
   ['Page', pages.length]].forEach((x) => P('<span>' + esc(x[0]) + ' ' + esc(x[1]) + '</span>'));
  P('<span>Хүргэлт бодит ' + (has(DR.pct) ? DR.pct + '%' : 'дата алга') + '</span>');
  P('</footer></div>');

  // The theme button: auto → dark → light → auto. The page switches at once, and
  // then reloads itself at ?theme=… so the choice survives «Шинэчлэх» (its empty
  // href keeps the query) and can be bookmarked. Storage is written too where it
  // exists.
  P('<script>(function(){var b=document.getElementById("tb");if(!b)return;'
    + 'var L={auto:"◐ Авто",dark:"☾ Харанхуй",light:"☀ Цайвар"},K="ss_board_theme";'
    + 'function get(){var t=document.documentElement.getAttribute("data-theme");return L[t]?t:"auto"}'
    + 'function apply(t){var r=document.documentElement;if(t==="auto")r.removeAttribute("data-theme");else r.setAttribute("data-theme",t);'
    + 'b.textContent=L[t];b.setAttribute("aria-label","Горим: "+L[t])}'
    + 'apply(get());b.addEventListener("click",function(){var o=["auto","dark","light"],t=o[(o.indexOf(get())+1)%3];'
    + 'try{localStorage.setItem(K,t)}catch(e){}apply(t);'
    + 'var u=location.pathname+"?view=board"+(t==="auto"?"":"&theme="+t);'
    + 'try{history.replaceState(null,"",u)}catch(e){location.replace(u)}})})();</script>');
  P('</body></html>');

  return H.join('');


}

function renderResearch(DATA, QUERY) {
  // «Судалгааны хуудас» — /board/?view=research&tab=rank|pack(&c=)|cat|mn|global|lag
  // Самбартай нэг Загвар (өнгө, гэрэл/харанхуй) хэрэглэнэ. Табууд нь энгийн холбоос:
  // JS шаардахгүй, ?theme= хадгалагдана.
  const d = DATA || {};
  const Q = QUERY || {};
  const themeQ = Q.theme === 'dark' || Q.theme === 'light' ? Q.theme : '';
  const TAB = ['rank', 'pack', 'cat', 'mn', 'global', 'lag'].includes(Q.tab) ? Q.tab : 'rank';
  const BASE = 'https://starshopping.app.n8n.cloud';
  const HOME = '/board/' + (themeQ ? '?theme=' + themeQ : '');
  const link = (tab) => '/board/?view=research&tab=' + tab + (themeQ ? '&theme=' + themeQ : '');

  const A = (v) => (Array.isArray(v) ? v : []);
  const n = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v));
  const has = (v) => v !== null && v !== undefined && v !== '';
  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const mnt = (v) => (has(v) ? n(v).toLocaleString('en-US') + '₮' : '—');
  const big = (v) => { if (!has(v)) return '—'; const x = n(v);
    return x >= 1e6 ? (x / 1e6).toFixed(1).replace('.0', '') + 'сая' : x >= 1e3 ? Math.round(x / 1e3) + 'м' : String(x); };
  const url = (u) => (/^https?:\/\//i.test(String(u || '')) ? esc(u) : '');

  const H = d.health || {};
  const R = d.rules || {};
  const ENTRY = d.entry || null;
  const cats = A(d.categories);
  const reels = A(d.reels);
  const glob = A(d.global);
  const LAG = d.lag || {};
  const RANK = d.rank || {};
  const rankCats = A(RANK.categories);
  const PACK = d.pack || null;
  const VER = d.verify || {};

  const P = []; const o = (s) => P.push(s);
  o('<!doctype html><html lang="mn"' + (themeQ ? ' data-theme="' + themeQ + '"' : '') + '><head><meta charset="utf-8">');
  o('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark">');
  o('<title>Starshopping · Судалгаа</title><style>');
  o('');
  // Энэ хуудсанд л хэрэгтэй нэмэлт — бүгд Загварын токен
  o('.tabs{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0 4px}'
   + '.tabs a{padding:8px 14px;border-radius:999px;border:1px solid var(--ln);background:var(--s1);color:var(--ink2);text-decoration:none;font-size:13px;font-weight:600}'
   + '.tabs a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
   + '.tabs a em{font-style:normal;opacity:.6;margin-left:5px}'
   + '.cc{background:var(--s1);border:1px solid var(--ln);border-radius:var(--r);margin:10px 0;overflow:hidden}'
   + '.cc>summary{list-style:none;cursor:pointer;padding:14px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}'
   + '.cc>summary::-webkit-details-marker{display:none}'
   + '.cc .cn{font-size:16px;font-weight:700;flex:1;min-width:140px}'
   + '.cc .cm{font-size:12px;color:var(--mut)}'
   + '.cc .cb{padding:4px 16px 16px;border-top:1px solid var(--ln3)}'
   + '.gt{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap}'
   + '.gt.ok{background:var(--good-a);color:var(--good)}.gt.no{background:var(--s2);color:var(--mut)}.gt.wr{background:var(--warn-a);color:var(--warn)}.gt.bl{background:var(--blue-a);color:var(--blue)}'
   + '.h3{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);font-weight:700;margin:16px 0 8px}'
   + '.bar{display:grid;grid-template-columns:150px 1fr 34px;gap:10px;align-items:center;font-size:13px;margin:5px 0}'
   + '.bar i{display:block;height:8px;border-radius:4px;background:var(--f3)}.bar b{text-align:right;font-variant-numeric:tabular-nums}'
   + '.hk{display:grid;grid-template-columns:52px 1fr;gap:10px;padding:9px 0;border-bottom:1px solid var(--ln3);font-size:13px}'
   + '.hk:last-child{border-bottom:0}.hk .dd{font-weight:700;font-variant-numeric:tabular-nums}.hk .dd small{display:block;font-weight:400;color:var(--mut);font-size:10px}'
   + '.hk .tx{color:var(--ink)}.hk .mt{color:var(--mut);font-size:11px;margin-top:3px}'
   + '.card{background:var(--s1);border:1px solid var(--ln);border-radius:var(--r);padding:14px 16px;margin:10px 0}'
   + '.card .t1{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.card .pn{font-weight:700;font-size:15px;flex:1;min-width:160px}'
   + '.card .ln{font-size:13px;margin-top:8px;color:var(--ink)}.card .ln span{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin-right:6px}'
   + '.card .nt{font-size:12px;color:var(--ink2);background:var(--s2);border-radius:var(--r-s);padding:8px 10px;margin-top:10px}'
   + '.card .ft{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--mut);margin-top:10px}.card .ft a{color:var(--blue)}'
   + '.bands{display:flex;gap:4px;flex-wrap:wrap}.bands span{font-size:11px;padding:4px 8px;border-radius:6px;background:var(--s2);color:var(--ink2)}.bands span.v{background:var(--good-a);color:var(--good)}'
   + '.lead{font-size:13px;color:var(--ink2);margin:6px 0 2px;max-width:760px;line-height:1.5}'
   + '.rk{font-size:18px;font-weight:800;min-width:38px;font-variant-numeric:tabular-nums}'
   + '.ax{display:grid;grid-template-columns:70px 1fr 34px;gap:4px 10px;align-items:center;font-size:13px;margin:8px 0}'
   + '.ax i{display:block;height:8px;border-radius:4px;background:var(--s2);overflow:hidden}.ax u{display:block;height:100%;background:var(--f3)}'
   + '.ax b{text-align:right;font-variant-numeric:tabular-nums}.ax small{grid-column:2/4;color:var(--mut);font-size:11px}'
   + '.ft a+a{margin-left:0}'
   + '@media(max-width:640px){.bar{grid-template-columns:110px 1fr 28px}}');
  o('</style></head><body><div class="w">');

  // ── толгой
  o('<header><div class="hd"><div class="bm">S</div><div><div class="bt">Судалгаа</div>');
  o('<div class="bs">зах зээл · hook · зохиомж · ' + esc(String(d.generated_at || '').replace('T', ' ').slice(0, 16)) + ' UTC</div></div>');
  o('<div class="sp"></div><a class="chip" target="_blank" rel="noopener" href="https://www.facebook.com/ads/library/?active_status=active&amp;ad_type=all&amp;country=MN&amp;media_type=all">Ad Library · MN ↗</a>');
  o('<a class="rf" href="' + HOME + '">← Даалгавар</a> <a class="rf" href="/board/?view=board' + (themeQ ? '&theme=' + themeQ : '') + '">Систем</a></div></header>');

  // ── KPI
  const VP = n(R.viable_price_mnt);
  o('<div class="kpi">');
  const kpi = (l, v, s, c) => o('<div class="k ' + (c || '') + '"><div class="kl">' + esc(l) + '</div><div class="kv">' + esc(v) + '</div>'
    + (s ? '<div class="ks">' + esc(s) + '</div>' : '') + '</div>');
  const COV0 = ((d.rank || {}).coverage || {});
  const SURE = n(COV0.pct) >= 80;
  kpi('Орох зах зээл', ENTRY ? ENTRY.category : '—', ENTRY ? (SURE ? 'хаалга давсан · ' : 'ТААМАГ · шалгалт ' + n(COV0.pct) + '% · ') + n(ENTRY.viable_pages_180) + ' хуудас' : 'хаалга давсан категори алга', ENTRY ? (SURE ? 'good' : 'warn') : '');
  kpi('Хаалга', VP ? mnt(VP) : '—', 'бараа+карго ' + Math.round(n(R.cost_ratio_assumed) * 100) + '% · ' + mnt(R.min_contribution_mnt) + ' үлдэнэ');
  kpi('Монгол reel', n(H.reels_usable) + ' / 15', 'ашиглагдах · нийт ' + n(H.reels), n(H.reels_usable) >= 15 ? 'good' : 'warn');
  kpi('Гадаад олдвор', String(glob.length), glob.filter((g) => g.screened).length + ' шүүгдсэн');
  const COV = (RANK.coverage || {});
  kpi('Шалгалт', n(COV.pct) + '%', n(COV.verified_180) + '/' + n(COV.ads_180) + ' зар (180+) · ' + n(VER.pending) + ' хүлээгдэж', n(COV.pct) >= 80 ? 'good' : 'warn');
  // Видео үйлдвэрийн бэлэн байдал (эзэнтэй тохирсон, 2026-09-24): 15 ашиглагдах reel + hook-ийн эрэмбэ,
  // эзэнтэй хамт хийсэн 3 креатив зар болж явсан, тэдний hook/hold медианаас доош биш. Гурвуулаа биелэхэд сануулна.
  const vReel = n(H.reels_usable) >= 15;
  kpi('Видео үйлдвэр', vReel ? '1/3 ✓' : '0/3', 'reel ' + n(H.reels_usable) + '/15 · 3 хамтын креатив · hook/hold ≥ медиан', vReel ? 'warn' : '');
  o('</div>');

  // ── табууд
  const TABS = [['rank', 'Ранк', rankCats.length], ['pack', 'Орох багц', PACK ? A(PACK.niches).length : 0], ['cat', 'Категори · hook', cats.length], ['mn', 'Монгол reel', reels.length],
                ['global', 'Гадаад viral', glob.length], ['lag', 'Хоцрогдол', n(LAG.products)]];
  o('<nav class="tabs">' + TABS.map((t) => '<a class="' + (t[0] === TAB ? 'on' : '') + '" href="' + link(t[0]) + '">'
    + esc(t[1]) + '<em>' + t[2] + '</em></a>').join('') + '</nav>');

  // ══ 0. РАНК — аль зах зээлд орох вэ (зөвхөн шалгасан зар тоологдоно)
  if (TAB === 'rank') {
    const cov = RANK.coverage || {};
    const W = (RANK.rules || {}).weights || {};
    o('<p class="lead">Категориудыг 5 тэнхлэгээр эрэмбэлнэ: Эрэлт ' + Math.round(n(W.demand) * 100) + '% · Ашиг ' + Math.round(n(W.profit) * 100)
      + '% · Цонх ' + Math.round(n(W.window) * 100) + '% · Хурд ' + Math.round(n(W.momentum) * 100) + '% · Чадвар ' + Math.round(n(W.fit) * 100)
      + '%. Зөвхөн Ad Library дээр шалгасан дропшип зар тоологдоно; оноо нь категориудын хоорондох харьцангуй (0–100).</p>');
    if (n(cov.pct) < 80) {
      o('<div class="card"><div class="t1"><span class="pn">Шалгалт дутуу · ' + n(cov.pct) + '%</span><span class="gt wr">'
        + n(VER.pending) + ' зар хүлээгдэж байна</span></div><div class="ln">180+ хоногийн ' + n(cov.ads_180) + ' зарын '
        + n(cov.verified_180) + ' нь шалгагдсан. 80% хүрэхээс өмнө ранк «таамаг» — Telegram «ОР» дохио өгөхгүй.</div></div>');
    }
    if (!rankCats.length) o('<div class="em">Ранк алга — блок AC ажиллаагүй эсвэл скан хоосон.</div>');
    const AX = [['demand', 'Эрэлт'], ['profit', 'Ашиг'], ['window', 'Цонх'], ['momentum', 'Хурд'], ['fit', 'Чадвар']];
    rankCats.forEach((c, i) => {
      const ax = c.axes || {};
      o('<details class="cc"' + (i === 0 ? ' open' : '') + '><summary>');
      o('<span class="rk">№' + n(c.rank) + '</span><span class="cn">' + esc(c.category) + '</span>');
      o('<span class="gt bl">' + n(c.total).toFixed(1) + '</span>');
      o(c.gate_ok ? '<span class="gt ok">хаалга ✓</span>' : '<span class="gt no">хаалга ' + n(c.viable_pages_180) + '/2</span>');
      if (n(c.pending)) o('<span class="gt wr">шалгаагүй ' + n(c.pending) + '</span>');
      o(c.our_page ? '<span class="gt ok">page бий</span>' : '<span class="gt no">page алга</span>');
      o('<span class="cm">' + n(c.pages_180) + ' хуудас 180+ · медиан ' + mnt(c.median_price) + '</span></summary><div class="cb">');
      AX.forEach((a) => {
        const x = ax[a[0]] || {};
        o('<div class="ax"><span>' + a[1] + '</span><i><u style="width:' + Math.max(0, Math.min(100, n(x.score))) + '%"></u></i><b>'
          + n(x.score) + '</b><small>' + esc(x.facts || '') + '</small></div>');
      });
      const ev = A(c.evidence);
      o('<div class="h3">Нотолгоо · шалгасан 180+ зар (нэг хуудас нэг мөр)</div>');
      if (!ev.length) o('<div class="cm">Шалгасан зар алга.</div>');
      ev.slice(0, 12).forEach((e) => o('<div class="hk"><div class="dd">' + n(e.days) + '<small>хоног</small></div><div><div class="tx">'
        + esc(e.product || '—') + (e.bundle ? ' <span class="gt ok">багц</span>' : '') + '</div><div class="mt">' + esc(e.niche || '') + ' · ' + esc(e.page)
        + (has(e.price) ? ' · ' + mnt(e.price) : '') + (e.library_id ? ' · <a href="https://www.facebook.com/ads/library/?id=' + esc(e.library_id)
        + '" target="_blank" rel="noopener">Ad Library</a>' : '') + '</div></div></div>'));
      o('<div class="ft"><a class="go" href="' + link('pack') + '&amp;c=' + encodeURIComponent(c.category) + '">Орох багц →</a></div>');
      o('</div></details>');
    });
  }

  // ══ 0b. ОРОХ БАГЦ — сонгосон категорийн дэд бүлэг, бараа, hook, page/сайт
  if (TAB === 'pack') {
    if (!PACK || !PACK.category) o('<div class="em">Багц алга.</div>');
    else {
      const rk = PACK.rank || {};
      o('<div class="card"><div class="t1"><span class="pn">' + esc(PACK.category) + '</span>'
        + (has(rk.rank) ? '<span class="gt bl">№' + n(rk.rank) + ' · ' + n(rk.total).toFixed(1) + '</span>' : '')
        + (rk.gate_ok ? '<span class="gt ok">хаалга ✓</span>' : '<span class="gt no">хаалга ' + n(rk.viable_pages_180) + '/2</span>') + '</div>');
      o('<div class="ln"><span>page</span>' + (PACK.our_page ? esc(PACK.our_page.name) + ' (' + esc(PACK.our_page.status) + ')' : 'алга — шинэ page хэрэгтэй') + '</div>');
      const st = PACK.site || {};
      o('<div class="ln"><span>сайт</span>' + (st.slug ? esc(st.label || st.slug) + ' · ' + n(st.products) + ' идэвхтэй бараа' : 'категори алга') + '</div>');
      const ns = A(PACK.next_steps);
      if (ns.length) o('<div class="nt">' + ns.map((s, j) => (j + 1) + '. ' + esc(s)).join('<br>') + '</div>');
      o('<div class="ft">' + rankCats.map((c) => '<a href="' + link('pack') + '&amp;c=' + encodeURIComponent(c.category) + '">'
        + esc(c.category) + '</a>').join('') + '</div></div>');

      const nc = A(PACK.niches);
      o('<div class="h3">Дэд бүлэг · эрэмбээр</div>');
      if (!nc.length) o('<div class="cm">Энэ категорид шалгасан зар алга — дэд бүлэг гарахгүй.</div>');
      const WC = { 'нээлттэй — батлагдсан': 'ok', 'хаагдаж байна': 'wr', 'ганц хуудас': 'no' };
      nc.forEach((x, i) => {
        o('<details class="cc"' + (i === 0 ? ' open' : '') + '><summary><span class="rk">' + (i + 1) + '</span><span class="cn">' + esc(x.niche) + '</span>');
        o('<span class="cm">' + n(x.pages_180) + ' хуудас 180+ · ' + n(x.pages_250) + ' нь 250+ · ≥' + mnt(VP) + ': ' + n(x.viable_pages_180)
          + ' · медиан ' + mnt(x.median_price) + (n(x.rising_products) ? ' · rising ' + n(x.rising_products) : '') + '</span></summary><div class="cb">');
        const pr = A(x.products);
        if (pr.length) {
          o('<div class="sc"><table><tr><th>Бараа</th><th>Хуудас</th><th>Хоног</th><th>Үнэ</th><th>Цонх</th></tr>');
          pr.forEach((p) => o('<tr><td>' + esc(p.product) + (p.bundle ? ' <span class="gt ok">багц</span>' : '') + '</td><td class="nm">' + n(p.pages)
            + '</td><td class="nm">' + n(p.max_days) + '</td><td class="nm">' + (has(p.min_price) ? (n(p.min_price) === n(p.max_price) ? mnt(p.min_price)
            : mnt(p.min_price) + '–' + mnt(p.max_price)) : '—') + '</td><td><span class="gt ' + (WC[p.window] || 'no') + '">' + esc(p.window) + '</span></td></tr>'));
          o('</table></div>');
        }
        const hk = A(x.hooks);
        if (hk.length) {
          o('<div class="h3">Hook · хамгийн удаан амьд</div>');
          hk.slice(0, 6).forEach((h) => o('<div class="hk"><div class="dd">' + n(h.days) + '<small>хоног</small></div><div><div class="tx">'
            + esc(h.hook) + '</div><div class="mt">' + esc(h.template || '') + ' · ' + esc(h.page) + '</div></div></div>'));
        }
        o('</div></details>');
      });

      const tm = A(PACK.templates);
      if (tm.length) {
        const mx = Math.max(1, ...tm.map((t) => n(t.pages)));
        o('<div class="h3">Hook загвар · шалгасан 180+ хуудсаар</div>');
        tm.slice(0, 8).forEach((t) => o('<div class="bar"><span>' + esc(t.template) + '</span><i style="width:'
          + Math.round(100 * n(t.pages) / mx) + '%"></i><b>' + n(t.pages) + '</b></div>'));
      }
      const rl = A(PACK.reels);
      o('<div class="h3">Бүртгэсэн reel · ' + rl.length + '</div>');
      if (!rl.length) o('<div class="cm">Энэ категорид reel алга — зохиомж судлахын тулд /form/reel-ээр 3–5 нэмнэ.</div>');
      rl.slice(0, 8).forEach((r) => o('<div class="hk"><div class="dd">' + (has(r.days) ? n(r.days) : '—') + '<small>хоног</small></div><div><div class="tx">'
        + esc(r.hook || '—') + '</div><div class="mt">' + esc(r.fmt || '') + (r.angle ? ' · ' + esc(r.angle) : '')
        + (url(r.url) ? ' · <a href="' + url(r.url) + '" target="_blank" rel="noopener">үзэх</a>' : '') + '</div></div></div>'));
      const gl = A(PACK.global);
      if (gl.length) {
        o('<div class="h3">Гадаадын олдвор · энэ категори</div>');
        gl.forEach((g) => o('<div class="hk"><div class="dd">' + (has(g.lag) ? n(g.lag) : '—') + '<small>хоцр.</small></div><div><div class="tx">'
          + esc(g.product) + '</div><div class="mt">' + (g.mn_first_ad_on ? 'Монголд ' + esc(g.mn_first_ad_on) : 'Монголд хараахан алга')
          + (url(g.url) ? ' · <a href="' + url(g.url) + '" target="_blank" rel="noopener">үзэх</a>' : '') + '</div></div></div>'));
      }
    }
  }

  // ══ 1. КАТЕГОРИ → HOOK + ЗОХИОМЖ
  if (TAB === 'cat') {
    o('<p class="lead">Категори бүрт: 180+ хоног амьд зарын hook-ийн загвар, хамгийн удаан амьд hook-ууд (хоногоор эрэмбэлсэн, '
      + 'нэг хуудас нэг мөр), үнийн бүс, бүртгэсэн reel-ийн зохиомж. '
      + esc(R.gate_note || '') + '</p>');
    if (!cats.length) o('<div class="em">Скан өгөгдөл алга.</div>');
    cats.forEach((c, i) => {
      const gate = c.gate_ok ? '<span class="gt ok">хаалга ✓</span>' : '<span class="gt no">хаалга ✗</span>';
      const isEntry = ENTRY && ENTRY.category === c.category;
      o('<details class="cc"' + (i === 0 || isEntry ? ' open' : '') + '><summary>');
      o('<span class="cn">' + esc(c.category) + '</span>' + gate + (isEntry ? '<span class="gt bl">ОРОХ</span>' : ''));
      o('<span class="cm">' + n(c.pages_180) + ' хуудас 180+ · медиан ' + mnt(c.median_price) + ' · ' + n(c.viable_pages_180)
        + ' хуудас ≥' + mnt(VP) + ' · клон ' + n(c.clone_groups) + '</span></summary><div class="cb">');

      const tm = A(c.templates);
      if (tm.length) {
        const mx = Math.max(1, ...tm.map((t) => n(t.pages)));
        o('<div class="h3">Hook загвар · 180+ хоног амьд хуудсаар</div>');
        tm.slice(0, 8).forEach((t) => o('<div class="bar"><span>' + esc(t.template) + '</span><i style="width:'
          + Math.round(100 * n(t.pages) / mx) + '%"></i><b>' + n(t.pages) + '</b></div>'));
      }
      const hk = A(c.hooks_top).slice(0, 10);
      if (hk.length) {
        o('<div class="h3">Хамгийн удаан амьд hook · хоногоор</div>');
        hk.forEach((h) => o('<div class="hk"><div class="dd">' + n(h.days) + '<small>хоног</small></div><div><div class="tx">'
          + esc(h.hook) + '</div><div class="mt">' + esc(h.template || '') + ' · ' + esc(h.page) + (has(h.price) ? ' · ' + mnt(h.price) : '')
          + (h.video ? ' · видео' : '') + '</div></div></div>'));
      }
      const b = c.price_bands || null;
      if (b) {
        const L = [['lt30k', '<30м', 0], ['30_60k', '30–60м', 30000], ['60_120k', '60–120м', 60000],
                   ['120_200k', '120–200м', 120000], ['200_300k', '200–300м', 200000]];
        o('<div class="h3">Үнийн бүс · 180+ хоног, үнэ бичсэн зар</div><div class="bands">');
        L.forEach((x) => o('<span class="' + (x[2] >= VP - 1000 && VP ? 'v' : '') + '">' + x[1] + ' · ' + n(b[x[0]]) + '</span>'));
        o('</div>');
      }
      const rl = A(c.reels);
      o('<div class="h3">Зохиомж · бүртгэсэн reel</div>');
      if (!rl.length) o('<div class="cm">Энэ категорид reel бүртгээгүй — зохиомж харагдахгүй. /form/reel-ээр нэмнэ.</div>');
      rl.forEach((r) => o('<div class="hk"><div class="dd">' + (has(r.days) ? n(r.days) : '—') + '<small>хоног</small></div><div><div class="tx">'
        + esc(r.hook || '—') + '</div><div class="mt">' + esc(r.fmt || '') + (r.angle ? ' · ' + esc(r.angle) : '')
        + (r.offer ? ' · санал: ' + esc(r.offer) : '') + (url(r.url) ? ' · <a href="' + url(r.url) + '" target="_blank" rel="noopener">үзэх</a>' : '')
        + '</div></div></div>'));
      o('</div></details>');
    });
  }

  // ══ 2. МОНГОЛ REEL
  if (TAB === 'mn') {
    o('<p class="lead">Монголд явж буй зар/органик. Дохио = амьд хоног (180+ ажиллаж байна, 250+ хүчтэй). '
      + esc(H.verdict || '') + '</p>');
    if (!reels.length) o('<div class="em">Reel бүртгээгүй. <a class="go" href="' + BASE + '/form/reel" target="_blank">Бүртгэх</a></div>');
    const VC = { 'хүчтэй ялагч': 'ok', 'ажиллаж байна': 'ok', 'ахиж байна': 'wr', 'залуу — батлагдаагүй': 'no', 'хоног алга': 'no' };
    reels.forEach((r) => {
      o('<div class="card"><div class="t1"><span class="pn">' + esc(r.product || '—') + '</span>');
      o('<span class="gt ' + (VC[r.verdict] || 'no') + '">' + (has(r.days_alive) ? n(r.days_alive) + ' хоног · ' : '') + esc(r.verdict) + '</span>');
      o('<span class="gt no">' + esc(r.kind === 'ad' ? 'зар' : 'органик') + ' · ' + esc(r.platform || '?') + '</span>');
      if (!r.usable) o('<span class="gt wr">ашиглагдахгүй</span>');
      o('</div>');
      if (r.hook) o('<div class="ln"><span>hook</span>' + esc(r.hook) + (r.template ? ' <span>· ' + esc(r.template) + '</span>' : '') + '</div>');
      if (r.angle) o('<div class="ln"><span>зохиомж</span>' + esc(r.angle) + (r.fmt ? ' <span>· ' + esc(r.fmt) + '</span>' : '') + '</div>');
      if (r.offer) o('<div class="ln"><span>санал</span>' + esc(r.offer) + '</div>');
      if (r.note) o('<div class="nt">' + esc(r.note) + '</div>');
      o('<div class="ft"><span>' + esc(r.category || '') + '</span><span>' + esc(r.page_ref || '') + '</span>'
        + (has(r.price_mnt) && n(r.price_mnt) > 0 ? '<span>' + mnt(r.price_mnt) + '</span>' : '')
        + '<span>♥ ' + big(r.likes) + ' · 💬 ' + big(r.comments) + (has(r.views) ? ' · ▶ ' + big(r.views) : '') + '</span>'
        + (r.library_id ? '<a href="https://www.facebook.com/ads/library/?id=' + esc(r.library_id) + '" target="_blank" rel="noopener">Ad Library</a>' : '')
        + (url(r.url) ? '<a href="' + url(r.url) + '" target="_blank" rel="noopener">үзэх</a>' : '') + '</div></div>');
    });
  }

  // ══ 3. ГАДААД VIRAL
  if (TAB === 'global') {
    o('<p class="lead">Гадаадад viral, Монголд хараахан байхгүй. «бараанаас» viral болсон нь Монголд дамжих магадлал өндөр; '
      + '«бүтээгчээс» болсон нь бага. Шүүгээгүй бол /form/sku дээр өртөг, жинг шалгана.</p>');
    if (!glob.length) o('<div class="em">Гадаад олдвор алга.</div>');
    glob.forEach((g) => {
      o('<div class="card"><div class="t1"><span class="pn">' + esc(g.product || '—') + '</span>');
      o('<span class="gt ' + (g.viral_driver === 'product' ? 'ok' : g.viral_driver === 'creator' ? 'wr' : 'no') + '">'
        + esc(g.viral_driver === 'product' ? 'бараанаас' : g.viral_driver === 'creator' ? 'бүтээгчээс' : 'тодорхойгүй') + '</span>');
      o('<span class="gt no">' + esc(g.country || '?') + ' · ' + esc(g.platform || '?') + '</span>');
      o(g.screened ? '<span class="gt ok">шүүгдсэн</span>' : '<span class="gt wr">шүүгээгүй</span>');
      o('</div>');
      if (g.hook) o('<div class="ln"><span>hook</span>' + esc(g.hook) + '</div>');
      if (g.angle) o('<div class="ln"><span>зохиомж</span>' + esc(g.angle) + '</div>');
      if (g.price_note) o('<div class="ln"><span>үнэ</span>' + esc(g.price_note) + '</div>');
      if (g.note) o('<div class="nt">' + esc(g.note) + '</div>');
      o('<div class="ft"><span>' + esc(g.category || '') + '</span><span>▶ ' + big(g.views) + ' · ♥ ' + big(g.likes) + ' · 💬 ' + big(g.comments)
        + (has(g.engagement_pct) ? ' · ' + g.engagement_pct + '%' : '') + '</span>'
        + (url(g.url) ? '<a href="' + url(g.url) + '" target="_blank" rel="noopener">үзэх</a>' : '')
        + (!g.screened ? '<a href="' + BASE + '/form/sku" target="_blank" rel="noopener">шүүх →</a>' : '') + '</div></div>');
    });
  }

  // ══ 4. ХОЦРОГДОЛ
  if (TAB === 'lag') {
    o('<p class="lead">' + esc(LAG.lead || '') + ' ' + esc(LAG.note || '') + '</p>');
    const SE = A(LAG.seasons);
    if (SE.length) {
      o('<div class="h3">Баярын сэрүүлэг · 60 / 45 / 30 хоног</div><div class="sc"><table><tr><th>Баяр</th><th>Үлдсэн</th><th>Одоогийн алхам</th><th>Бараа · Монгол дахь нотолгоо</th></tr>');
      SE.forEach((s) => o('<tr><td><b>' + esc(s.name) + '</b><div class="cm">' + esc(s.event_date) + '</div></td><td class="nm">' + n(s.days_left) + ' хоног</td><td>'
        + esc(s.step) + '<div class="cm">T−60 ' + esc(s.t60) + ' · T−45 ' + esc(s.t45) + ' · T−30 ' + esc(s.t30) + '</div></td><td>'
        + (A(s.products).length ? A(s.products).map((p) => esc(p.product) + '<div class="cm">' + esc((p.evidence && p.evidence.fact) || '') + '</div>').join('')
                                : '<span class="cm">бараа бүртгээгүй</span>') + '</td></tr>'));
      o('</table></div>');
    }
    const bm = A(LAG.by_market);
    const MK = { TT: 'TikTok', US: 'АНУ', KR: 'Солонгос', CN: 'Хятад', '?': 'тодорхойгүй' };
    if (!bm.length) o('<div class="em">Хэмжилт хараахан эхлээгүй.</div>');
    else {
      o('<div class="sc"><table><tr><th>Гадаад зах зээл</th><th>Хянаж буй</th><th>Монголд гарсан</th><th>Медиан хоцрогдол</th><th>25–75%</th></tr>');
      bm.forEach((m) => o('<tr><td><b>' + esc(MK[m.market] || m.market) + '</b></td><td class="nm">' + n(m.n) + '</td><td class="nm">' + n(m.found)
        + '</td><td class="nm">' + (has(m.median_lag) ? Math.round(m.median_lag) + ' хоног' : '—') + '</td><td class="nm">'
        + (has(m.p25) ? Math.round(m.p25) + '…' + Math.round(m.p75) : '—') + '</td></tr>'));
      o('</table></div>');
      o('<div class="h3">Бараа бүрээр</div><div class="sc"><table><tr><th>Бараа · хайх үг</th><th>Зах зээл</th><th>Гадаадад анх</th><th>Монголд анхны зар</th><th>Хоцрогдол</th><th></th></tr>');
      A(LAG.rows).forEach((r) => o('<tr><td>' + esc(r.product) + '<div class="cm">' + esc(A(r.terms).join(', ')) + '</div></td><td>' + esc(MK[r.market] || r.market) + '</td><td class="nm">' + esc(r.first_seen_on || '—')
        + '</td><td class="nm">' + esc(r.mn_started_on || 'хүлээгдэж буй') + '</td><td class="nm">' + (has(r.lag_days) ? n(r.lag_days) + 'х' : '—')
        + '</td><td>' + (url(r.found_url) ? '<a class="go" href="' + url(r.found_url) + '" target="_blank" rel="noopener">үзэх</a>' : '') + '</td></tr>'));
      o('</table></div>');
    }
  }

  o('<footer><span>Hook-ийг сайхан уншигдсанаар биш, амьд явсан хоногоор эрэмбэлнэ.</span></footer></div></body></html>');
  return P.join('');

}
