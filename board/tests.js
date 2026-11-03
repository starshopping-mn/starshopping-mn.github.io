/* Тест хуудас v2 (блок EB, 2026-11-02; өмнө нь AR). Ранк → нотолгоо → шийдвэр → тест бэлтгэл → үнэлгээ → үр дүн.
   Өгөгдөл: /webhook/board-data?view=tests → test_board() — нэг дуудлага; нэр дэвшигч бүрт rv = find_rv() (шат бүрийн нотолгоо, хугацаа, зөрчил, эзний шалгалт).
   Товч бүр = SQL-ийн нэг шилжилт: POST action=select | step | launch | result | drop | mode | price | cost | mncommon | findact (verify / rerun / reject).
   Зарчим: нэг харцаар «одоо юу хийх вэ», шат бүрийн нотолгоо хэр шинэ, ямар эх сурвалжаас; чимэглэл биш, төлөв. */
function renderTests(DATA, QUERY) {
  const d = DATA || {};
  const Q = QUERY || {};
  const themeQ = Q.theme === 'dark' || Q.theme === 'light' ? Q.theme : '';
  const tq = themeQ ? '&theme=' + themeQ : '';
  const BASE = 'https://starshopping.app.n8n.cloud';

  const A = (v) => (Array.isArray(v) ? v : []);
  const n = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v));
  const has = (v) => v !== null && v !== undefined && v !== '';
  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const mnt = (v) => (has(v) ? Math.round(n(v)).toLocaleString('en-US') + '₮' : '—');
  const big = (v) => { if (!has(v)) return '—'; const x = n(v);
    return x >= 1e6 ? (x / 1e6).toFixed(1).replace('.0', '') + 'сая' : x >= 1e3 ? Math.round(x / 1e3) + 'м' : String(x); };
  const url = (u) => (/^https?:\/\//i.test(String(u || '')) ? esc(u) : '');
  // AR6: вирал reel ба 1688 товч (Amazon самбарт хэрэггүй — эзэн 2026-09-27)
  const bigN = (v) => { v = n(v); return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'K' : String(v); };
  const reelBtn = (c) => url(c.reel_url)
    ? '<a class="lb tt" href="' + url(c.reel_url) + '" target="_blank" rel="noopener">▶ ' + (/instagram/i.test(c.reel_url) ? 'Instagram' : 'TikTok') + ' reel<small>' + esc(String(c.reel_posted_at || '').slice(0, 10) || 'огноо?') + ' · ' + (has(c.reel_views) ? bigN(c.reel_views) + ' үзэлт' : '—') + '</small></a>'
    : '<span class="lb no">▶ reel холбоогүй<small>огноо, үзэлт шалгаагүй</small></span>';
  const cnBtn = (c) => /1688\.com\/offer\//.test(String(c.cn_offer_url || ''))
    ? '<a class="lb cn" href="' + url(c.cn_offer_url) + '" target="_blank" rel="noopener">🛒 1688 — авах бараа<small>¥' + esc(c.cn_price == null ? '?' : c.cn_price) + (has(c.cn_sold) ? ' · ' + n(c.cn_sold).toLocaleString('en-US') + 'ш зарагдсан' : '') + (c.weight_g ? ' · ' + n(c.weight_g) + 'г' : '') + '</small></a>'
    : '<span class="lb no">🛒 1688 offer алга<small>зургаар сонгох хэрэгтэй</small></span>';
  const day = (s) => (s ? String(s).slice(0, 10) : '—');
  // AZ: 1688 өртөг = Эрээнд ирэх нийт (бараа + Хятад доторх хүргэлт)
  const cny = (c) => '¥' + esc(c.cn_price) + (has(c.cn_item_cny) ? ' (бараа ¥' + esc(c.cn_item_cny) + ' + Хятад дотор ¥' + esc(c.cn_ship_cny) + (c.cn_ship_checked ? '' : ' таамаг') + ')' : '');
  // AY: тестийн барааны карт — яг ямар бараа тестлэгдэж байгааг 100% харуулна
  const MODE = { test: 'ТЕСТ горим', preorder: 'Урьдчилсан', live: 'Борлуулалт', stop: 'Зогссон' };
  const rankTag = (r) => (has(r) ? '<span class="gt rk2" title="Судалгааны нэг ранк — тестэд орсон ч дугаараа хадгална">Ранк #' + n(r) + '</span>' : '<span class="gt mu">ранкаас гарсан</span>');
  const pcard = (k) => {
    if (!k || !k.name) return '<div class="tpc tpe">Бараа бүртгэгдээгүй — маягт 13-аар ТЕСТ горимд бүртгэмэгц энд зураг, үнэ, SKU, зарын нэр гарна.'
      + (k && /1688\.com\/offer\//.test(String(k.cn_offer_url || '')) ? '<div class="lk"><a class="lb cn" href="' + url(k.cn_offer_url) + '" target="_blank" rel="noopener">🛒 1688 — авах бараа<small>¥' + esc(k.cn_price == null ? '?' : k.cn_price) + '</small></a></div>' : '') + '</div>';
    const sk = A(k.skus), cr = A(k.creatives);
    return '<div class="tpc">' + (url(k.image) ? '<img src="' + url(k.image) + '" alt="" loading="lazy">' : '<div class="tpi">зураг алга</div>')
      + '<div class="tpb"><div class="tpn">' + esc(k.name) + '</div>'
      + '<div class="tpm">' + mnt(k.price_mnt) + ' · <span class="gt ' + (k.mode === 'test' ? 'wr' : k.mode === 'live' ? 'ok' : 'mu') + '">' + esc(MODE[k.mode] || k.mode || '—') + '</span>'
      + (has(k.cn_price) ? ' · өртөг ' + cny(k) + (k.weight_g ? ' · ' + n(k.weight_g) + 'г' : '') : '') + '</div>'
      + '<div class="tpm">SKU: ' + (sk.length ? sk.map((x) => esc([x.color, x.size].filter(Boolean).join(' ') || x.sku_id)).join(' · ') : '<b style="color:var(--warn)">алга</b>') + '</div>'
      + '<div class="tpm">Креатив: ' + (cr.length ? cr.map((x) => '<code>' + esc(x.id) + '</code>' + (x.angle ? ' ' + esc(String(x.angle).slice(0, 24)) : '')).join(' · ') : '<b style="color:var(--warn)">алга</b>') + '</div>'
      + '<div class="tpm">Дараагийн зарын нэр: <code>' + esc(k.ad_name_example || '—') + '</code> <span style="color:var(--mut)">— Meta-д ингэж нэрлэвэл автоматаар бүртгэгдэнэ</span></div>'
      + '<div class="lk">' + (url(k.site_url) ? '<a class="lb tt" href="' + url(k.site_url) + '" target="_blank" rel="noopener">🌐 Сайт дээрх хуудас<small>' + esc(k.slug || '') + '</small></a>' : '')
      + (/1688\.com\/offer\//.test(String(k.cn_offer_url || '')) ? '<a class="lb cn" href="' + url(k.cn_offer_url) + '" target="_blank" rel="noopener">🛒 1688 — авах бараа<small>¥' + esc(k.cn_price == null ? '?' : k.cn_price) + '</small></a>' : '<span class="lb no">🛒 1688 offer алга<small>зургаар сонгох хэрэгтэй</small></span>')
      + '</div></div></div>';
  };
  const ntf = (x) => { x = x || {}; const q = n(x.queued), se = n(x.sent), fl = n(x.failed);
    return q + se + fl ? '<span class="gt ' + (fl ? 'no' : q ? 'wr' : 'ok') + '">мессеж: илгээсэн ' + se + (q ? ' · хүлээгдэж ' + q : '') + (fl ? ' · алдаа ' + fl : '') + '</span>' : ''; };
  const ago = (s) => { if (!s) return ''; const h = Math.round((Date.now() - new Date(s).getTime()) / 36e5);
    return h < 1 ? 'саяхан' : h < 48 ? h + ' цагийн өмнө' : Math.round(h / 24) + ' хоногийн өмнө'; };

  const C = A(d.candidates), ACT = A(d.active), EV = A(d.evaluating), HIS = A(d.history), LEARN = A(d.learn);
  const S = d.slots || {}, ST = d.settings || {};
  const free = Math.max(0, n(S.max) - n(S.used));


  // ── EB (2026-11-02): нотолгооны шат бүрийн төлөв — find_rv() (c.rv) + find_confidence() (c.confidence)
  const RS = d.research || {};
  const CH = (c, key) => A((c.confidence || {}).checks).find((k) => k.key === key) || null;
  const pl = (cls, t) => '<span class="t2-pl ' + cls + '">' + t + '</span>';
  const sgn = (v) => (n(v) > 0 ? '+' : '') + n(v);
  const MNSRC = { owner: 'таны шалгалт', research: 'судлаач', fb_ads: 'зөвхөн FB зар', none: 'шалгаагүй' };
  const MNST = { absent: 'МН-д алга', early: 'эрт · цөөн худалдагч', crowded: 'олон худалдагчтай' };
  const GN = { tt: 'TikTok', cn: '1688', mn: 'Монгол', econ: 'Ашиг' };
  const isOffer = (c) => /1688\.com\/offer\//.test(String(c.cn_offer_url || ''));
  const ownerPill = (c, g) => { const x = ((c.rv || {}).owner || {})[g]; if (!x) return '';
    return x.ok ? pl('ok', '✓ ' + esc(x.by || 'эзэн') + ' ' + esc(day(x.at).slice(5))) : pl('cr', '✗ ' + esc(x.by || 'эзэн') + ' буруу гэсэн'); };
  // нэг барааны 4 шатны товч төлөв: {cls, label, sub}
  const gs = (c) => {
    const rv = c.rv || {}, M = rv.mn || {}, E = rv.econ || {}, ck = CH(c, 'fresh'), ow = rv.owner || {};
    const fact = String((ck && ck.fact) || '');
    const tt = ck && ck.ok ? { cls: 'ok', label: esc(day(c.reel_posted_at)), sub: has(c.reel_views) ? bigN(c.reel_views) + ' үзэлт' : '' }
      : { cls: url(c.reel_url) ? (/^сул/.test(fact) ? 'wr' : 'cr') : 'cr',
          label: !url(c.reel_url) ? 'холбоогүй' : /^хуучирсан/.test(fact) ? 'хуучирсан' : /^сул/.test(fact) ? 'сул' : 'шинэ биш',
          sub: /^хуучирсан/.test(fact) ? esc(fact.replace(/^хуучирсан:\s*/, '')) : url(c.reel_url) ? esc(day(c.reel_posted_at)) + (has(c.reel_views) ? ' · ' + bigN(c.reel_views) : '') : '' };
    if (ow.tt) tt.sub += (tt.sub ? ' · ' : '') + (ow.tt.ok ? '✓ та шалгасан' : '✗ та буруу гэсэн');
    const cn = !isOffer(c) ? { cls: 'cr', label: 'offer алга', sub: 'зургаар сонгох' }
      : { cls: c.cn_ship_checked || (ow.cn && ow.cn.ok) ? 'ok' : 'wr',
          label: has(c.cn_item_cny) ? '¥' + esc(c.cn_item_cny) + ' + ¥' + esc(c.cn_ship_cny) + (c.cn_ship_checked ? '' : ' таамаг') : '¥' + esc(c.cn_price),
          sub: [has(c.cn_sold) ? n(c.cn_sold).toLocaleString('en-US') + ' ш' : '', c.weight_g ? n(c.weight_g) + ' г' : 'жин ?', c.cn_price_by || (ow.cn && ow.cn.ok) ? '✓ ' + esc(c.cn_price_by || 'эзэн') : ''].filter(Boolean).join(' · ') };
    const mnx = [has(M.same_pages) ? 'FB зар ' + n(M.same_pages) : '', n(M.mn_common) ? n(M.mn_common) + '+ дэлгүүр' : '', A(M.sellers).length ? A(M.sellers).length + ' худалдагч' : ''].filter(Boolean).join(' · ');
    const mn = rv.conflict ? { cls: 'cr', label: 'зөрчилтэй', sub: 'FB зар ' + n(M.same_pages) + ' ↔ ' + n(M.mn_common) + '+ дэлгүүр' }
      : M.fresh ? { cls: 'ok', label: esc(MNST[M.status] || (n(M.age_days) + ' хоног')), sub: esc(MNSRC[M.src] || '') + (mnx ? ' · ' + mnx : '') }
      : { cls: 'cr', label: has(M.age_days) ? n(M.age_days) + ' хоног' : 'шалгаагүй', sub: esc(MNSRC[M.src] || '') + (mnx ? ' · ' + mnx : '') };
    const pr = n(E.profit), mn0 = n(E.min) || 20000;
    const ec = !has(E.profit) ? { cls: 'nt', label: '—', sub: '' }
      : { cls: pr >= mn0 ? 'ok' : pr >= mn0 * 0.95 ? 'wr' : 'cr', label: mnt(pr), sub: (E.owner_price ? 'таны үнэ ' : 'үнэ ') + mnt(E.price) };
    return { tt, cn, mn, econ: ec };
  };
  const stat = (c) => {
    const cf = c.confidence || {}, rv = c.rv || {};
    if (has(c.open_test)) return pl('bl', 'тестэд байна');
    if (rv.rerun) return pl('bl', '↻ дахин судлуулах');
    if (c.ready) return pl('ok', 'БЭЛЭН');
    return c.verdict === 'test' ? pl('wr', 'нягтлах ' + n(cf.passed) + '/' + n(cf.of)) : pl('nt', 'хүлээх ' + n(cf.passed) + '/' + n(cf.of));
  };
  // оноо: суурь хэсгүүд (вирал · МН зай · ашиг · тохирол) + МН засвар (тасархай)
  const bar = (c) => {
    const P = (c.why || {}).parts || {}, cut = Math.max(0, -n(c.mn_adj));
    const w = (v) => Math.max(0, Math.min(100, n(v)));
    return '<div class="t2-stk"><i class="t2-cv" style="width:' + w(P.viral) + '%"></i><i class="t2-cg" style="width:' + w(n(P.gap) - cut) + '%"></i>'
      + (cut ? '<i class="t2-cx" style="width:' + w(cut) + '%" title="МН шалгалт нягтлаагүй — хассан"></i>' : '')
      + '<i class="t2-ce" style="width:' + w(P.econ) + '%"></i><i class="t2-cf" style="width:' + w(P.fit) + '%"></i></div>';
  };

  // EL (11-03): алгоритм v2 — 8 шалгуурын оноо (татах хүч 30 · МН тохирол 10 · үнэ цэнэ 20 · эрэлт 15 · ялах+Temu+ажиллагаа 25)
  const v2bar = (c) => {
    const V = c.v2_parts || {}, w = (v) => Math.max(0, Math.min(100, n(v)));
    return '<div class="t2-stk"><i class="t2-cv" style="width:' + w(n(V.wow) + n(V.need)) + '%" title="татах хүч (wow + надад хэрэгтэй)"></i>'
      + '<i class="t2-cf" style="width:' + w(V.mn_fit) + '%" title="Монголд тохирох"></i>'
      + '<i class="t2-ce" style="width:' + w(V.value) + '%" title="үнэ цэнэ (зарах ÷ өртөг)"></i>'
      + '<i class="t2-cg" style="width:' + w(V.demand) + '%" title="эрэлтийн нотолгоо"></i>'
      + '<i class="t2-cw" style="width:' + w(n(V.win) + n(V.temu) + n(V.ops)) + '%" title="ялах боломж · Temu · ажиллагаа"></i></div>';
  };
  const v2miss = (c) => A((c.v2_parts || {}).missing);

  // ── өгөгдлийн шалгалт (хуудас бүрт дахин бодно) → дүгнэлт, анхаарах зүйлс
  const rk = (L) => L.map((c) => '#' + n(c.rank)).join(', ');
  const mnOld = C.filter((c) => !((c.rv || {}).mn || {}).fresh);
  const conf = C.filter((c) => (c.rv || {}).conflict);
  const ttOld = C.filter((c) => !(CH(c, 'fresh') || {}).ok);
  const shipG = C.filter((c) => isOffer(c) && !c.cn_ship_checked);
  const noLink = C.filter((c) => !url(c.reel_url) || !isOffer(c));
  const cutSum = C.reduce((s, c) => s + Math.max(0, -n(c.mn_adj)), 0);
  const taskAge = RS.task_last_at ? (Date.now() - new Date(RS.task_last_at).getTime()) / 36e5 : null;
  const DQ = [];
  if (mnOld.length) DQ.push(['cr', mnOld.length + '/' + C.length + ' барааны Монголын шалгалт 7 хоногоос хуучин (' + rk(mnOld) + ')',
    'Хуучин эсвэл зөвхөн FB зарын шалгалттай бол «МН зай» оноог хагасаар тооцно' + (cutSum ? ' — нийт −' + cutSum + ' оноо хассан' : '') + '. Судлаач шинэчлэх эсвэл та «Би шалгасан» дарахад буцна.', 'ранк']);
  if (conf.length) DQ.push(['cr', 'Зөрчилтэй баримт: FB зар 0 ↔ олон дэлгүүрт зарагддаг (' + rk(conf) + ')',
    'Таны тэмдэглэл → судлаач → FB зар дарааллаар итгэнэ. Нотолгооны Монгол хэсгээс шалгаад «Би шалгасан» эсвэл «Дахин судлуулах».', 'ранк · карт']);
  if (ttOld.length) DQ.push(['wr', ttOld.length + '/' + C.length + ' бараанд ≤90 хоногийн хүчтэй TikTok reel алга (' + rk(ttOld) + ')',
    'Судлаач өдөр бүр ≤6 барааны шинэ reel хайна. Олдохгүй бол вирал хуучирсан гэж үзнэ.', 'вирал']);
  if (shipG.length) DQ.push(['wr', shipG.length + '/' + C.length + ' барааны Хятад доторх хүргэлт ¥' + n(ST.cn_ship_default || 6) + ' таамаг',
    '1688 «Order» хуудасны Shipping fee-г судлаач эсвэл та «Өртөг засах»-аар оруулна.', 'өртөг']);
  if (noLink.length) DQ.push(['cr', 'TikTok эсвэл 1688 холбоосгүй: ' + rk(noLink), 'Холбоосгүй барааг тестэд сонгохгүй.', 'холбоос']);
  else if (C.length) DQ.push(['ok', C.length + ' бараа бүгд TikTok болон 1688 холбоостой', '', 'холбоос']);
  if (!RS.task_last_at) DQ.push(['wr', 'Өдөр бүрийн судлаач хараахан ажиллаагүй', 'Анхны ажил ' + esc(RS.task_next || '10:07') + '-д. Үр дүн нь энэ хуудасны нотолгоонд шууд гарна.', 'судалгаа']);
  else if (taskAge > 30) DQ.push(['cr', 'Судлаач ' + esc(ago(RS.task_last_at)) + ' ажилласан — хоцорсон', 'Хуваарьт ажил (Mac + Chrome) асаалттай эсэхийг шалгана уу.', 'судалгаа']);
  else DQ.push(['ok', 'Судлаач ' + esc(ago(RS.task_last_at)) + ' ажилласан · 24 цагт ' + n(RS.task_24h) + ' бараа', '', 'судалгаа']);
  const ATT = DQ.filter((x) => x[0] !== 'ok').slice(0, 4);
  const readyN = C.filter((c) => c.ready).length;
  const P = []; const o = (s) => P.push(s);
  o('<!doctype html><html lang="mn"' + (themeQ ? ' data-theme="' + themeQ + '"' : '') + '><head><meta charset="utf-8">');
  o('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark">');
  o('<title>Starshopping · Тест</title><style>');
  o('');
  o('.nav{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 6px}.nav a{padding:8px 14px;border-radius:999px;border:1px solid var(--ln);background:var(--s1);color:var(--ink2);text-decoration:none;font-size:13px;font-weight:600}.nav a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
   + '.hero{background:var(--s1);border:1px solid var(--ln);border-radius:var(--r);padding:18px 20px;margin:10px 0 16px}'
   + '.hero .tag{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);font-weight:700}.hero h1{font-size:22px;margin:4px 0 6px;line-height:1.25}.hero .sub{font-size:13px;color:var(--ink2);line-height:1.5;max-width:820px}'
   + '.flow{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.flow span{font-size:11px;font-weight:700;padding:5px 10px;border-radius:999px;background:var(--s2);color:var(--mut)}.flow span.on{background:var(--blue-a);color:var(--blue)}.flow span.ok{background:var(--good-a);color:var(--good)}'
   + '.sec{display:flex;align-items:baseline;gap:10px;margin:22px 0 8px}.sec b{font-size:16px}.sec .st{font-size:12px;color:var(--mut)}'
   + '.cands{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}'
   + '.cd{background:var(--s1);border:1px solid var(--ln);border-radius:var(--r);padding:14px;cursor:pointer;transition:border-color .15s,transform .15s;position:relative}.cd:hover{border-color:var(--ln2)}.cd.open{border-color:var(--blue);box-shadow:var(--sh)}.cd.busy{opacity:.55}'
   + '.cd .rk{position:absolute;top:10px;right:12px;font-size:22px;font-weight:800;color:var(--mut);font-variant-numeric:tabular-nums}.cd.r1 .rk{color:var(--gold)}'
   + '.cd .nm{font-size:15px;font-weight:700;padding-right:36px;line-height:1.3}.cd .mt{font-size:12px;color:var(--mut);margin-top:4px}'
   + '.cd .sc{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px}.cd .sc b{font-size:18px;font-variant-numeric:tabular-nums}.cd .sc i{flex:1;height:6px;border-radius:3px;background:var(--s2);overflow:hidden;font-style:normal}.cd .sc i u{display:block;height:100%;background:var(--f3)}'
   + '.vf{display:flex;gap:3px;margin-top:10px}.vf span{flex:1;height:7px;border-radius:2px;background:var(--s2)}.vf span.ok{background:var(--good)}.vf span.no{background:var(--crit-a)}'
   + '.cd .src{font-size:12px;color:var(--ink2);margin-top:8px}.cd .src a{color:var(--blue);text-decoration:none}'
   + '.lk{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.lb{flex:1;min-width:130px;display:block;padding:8px 10px;border-radius:10px;font-size:12px;font-weight:700;text-decoration:none;line-height:1.35;border:1px solid var(--line)}.lb small{display:block;font-weight:500;color:var(--mut);font-size:11px}.lb.tt{background:var(--s2);color:var(--ink)}.lb.cn{background:var(--warn-a);color:var(--ink)}.lb.no{background:var(--crit-a);color:var(--crit);border-color:transparent}.lb:hover{border-color:var(--blue)}'
   + '.gt{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap;display:inline-block}.gt.ok{background:var(--good-a);color:var(--good)}.gt.wr{background:var(--warn-a);color:var(--warn)}.gt.no{background:var(--crit-a);color:var(--crit)}.gt.bl{background:var(--blue-a);color:var(--blue)}.gt.mu{background:var(--s2);color:var(--mut)}'
   + '.btn{font:inherit;font-size:13px;font-weight:700;padding:8px 14px;border-radius:9px;border:1px solid var(--ln);background:var(--s1);color:var(--ink);cursor:pointer}.btn.p{background:var(--ink);color:var(--bg);border-color:var(--ink)}.btn.g{background:var(--good);color:#fff;border-color:var(--good)}.btn.r{background:var(--crit);color:#fff;border-color:var(--crit)}.btn:disabled{opacity:.45;cursor:not-allowed}.btn.s{font-size:12px;padding:6px 10px}'
   + '.det{grid-column:1/-1;background:var(--s1);border:1px solid var(--blue);border-radius:var(--r);padding:16px;display:none}.det.on{display:block}'
   + '.det h3{margin:0 0 8px;font-size:16px}.chk{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin:10px 0}.chk div{border:1px solid var(--ln3);border-radius:var(--r-s);padding:8px 10px;font-size:12px}.chk div b{display:block;font-size:12px}.chk div.ok{border-color:var(--good-a);background:var(--good-a)}.chk div.no{border-color:var(--crit-a)}'
   + '.kv{font-size:13px;line-height:1.6}.kv span{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-right:6px}'
   + '.tc{background:var(--s1);border:1px solid var(--ln);border-radius:var(--r);padding:16px;margin:10px 0}.tc .hd2{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.tc .hd2 h3{margin:0;font-size:17px;flex:1;min-width:180px}'
   + '.prog{height:8px;background:var(--s2);border-radius:4px;overflow:hidden;margin:12px 0 4px}.prog i{display:block;height:100%;background:var(--good);transition:width .5s ease}'
   + '.steps{display:grid;gap:6px;margin-top:10px}.stp{display:grid;grid-template-columns:30px 1fr auto;gap:10px;align-items:start;padding:10px 12px;border:1px solid var(--ln3);border-radius:var(--r-s);background:var(--bg)}'
   + '.stp .no{width:26px;height:26px;border-radius:50%;background:var(--s2);color:var(--mut);font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center}.stp.done .no{background:var(--good);color:#fff}.stp.now .no{background:var(--blue);color:#fff}.stp.now{border-color:var(--blue)}'
   + '.stp .tt{font-weight:700;font-size:14px}.stp.done .tt{text-decoration:line-through;color:var(--mut)}.stp .dt{font-size:12px;color:var(--ink2);margin-top:2px;line-height:1.45}.stp .ow{font-size:11px;margin-top:4px;color:var(--mut)}.stp .ow.me{color:var(--gold);font-weight:700}'
   + '.ckp{margin-top:14px;border:1px solid var(--ln3);border-radius:var(--r-s);padding:10px 12px;background:var(--bg)}.ckh{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;font-size:14px}.ckr{display:grid;grid-template-columns:24px 1fr auto;gap:10px;align-items:start;padding:8px 0;border-top:1px solid var(--ln3)}.ckr .cki{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;background:var(--s2);color:var(--mut)}.ckr.ok .cki{background:var(--good);color:#fff}.ckr.fail .cki{background:var(--crit);color:#fff}.ckr .tt{font-weight:700;font-size:13px;white-space:normal}.ckr .dt{font-size:12px;color:var(--ink2);margin-top:2px;line-height:1.45;white-space:normal}.ckr .hw{color:var(--warn)}.h24{margin:10px 0;border:1px solid var(--ln3);border-radius:var(--r-s);padding:10px 12px;background:var(--bg);font-size:13px;line-height:1.5}.h24.bad{border-color:var(--crit)}.h24 .ckr{border-top:1px solid var(--ln3)}'
   + '.launch{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid var(--ln3)}.launch .why{font-size:12px;color:var(--mut);flex:1;min-width:200px}'
   + '.mx{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin:12px 0}.mx>div{background:var(--bg);border:1px solid var(--ln3);border-radius:var(--r-s);padding:10px}.mx .l{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.05em}.mx .v{font-size:18px;font-weight:800;margin-top:2px;font-variant-numeric:tabular-nums}.mx .v small{font-size:11px;color:var(--mut);font-weight:400}'
   + '.sug{border-radius:var(--r-s);padding:12px 14px;font-size:13px;line-height:1.5;margin:8px 0}.sug.win{background:var(--good-a);color:var(--good)}.sug.lose{background:var(--crit-a);color:var(--crit)}.sug.wait{background:var(--s2);color:var(--ink2)}'
   + 'table{width:100%;border-collapse:collapse;font-size:13px}td,th{padding:9px 10px;border-bottom:1px solid var(--ln3);text-align:left;vertical-align:top}th{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.06em}.sc2{overflow:auto;background:var(--s1);border:1px solid var(--ln);border-radius:var(--r)}'
   + '.out{border:1px solid var(--ln);border-radius:var(--r-s);padding:12px;margin:10px 0;background:var(--s1);font-size:13px;line-height:1.5;display:none}.out.on{display:block}.out textarea{width:100%;min-height:70px;font:inherit;font-size:13px;margin-top:6px}'
   + '.ads{display:grid;gap:6px;margin:8px 0}.ad{border:1px solid var(--ln3);border-radius:var(--r-s);padding:9px 11px;background:var(--bg)}.adh{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.adh b{flex:1;min-width:110px;font-size:13px}.adm{font-size:12px;color:var(--ink2);margin-top:4px;line-height:1.45}.adl{font-size:12px;color:var(--warn);margin-top:3px}'
   + '.tpc{display:flex;gap:14px;margin:12px 0 4px;padding:12px;border:1px solid var(--ln3);border-radius:var(--r-s);background:var(--bg)}.tpc img,.tpc .tpi{width:96px;height:96px;object-fit:cover;border-radius:10px;flex:none;background:var(--s2);font-size:11px;color:var(--mut);display:flex;align-items:center;justify-content:center}.tpb{flex:1;min-width:0}.tpn{font-weight:800;font-size:15px}.tpm{font-size:12px;color:var(--ink2);margin-top:4px;line-height:1.45;overflow-wrap:anywhere}.tpc code{font-size:11px;background:var(--s2);padding:1px 5px;border-radius:5px}.tpc.tpe{display:block;font-size:13px;color:var(--ink2)}'
   + '.gt.rk2{background:var(--ink);color:var(--bg);font-size:12px}.ew{border-radius:var(--r-s);padding:12px 14px;margin:10px 0;background:var(--good-a);color:var(--good);font-size:13px;font-weight:600;line-height:1.5}'
   + '@media(max-width:520px){.tpc{flex-direction:column}.tpc img,.tpc .tpi{width:100%;height:180px}}'
   + '.cd .mt .gt{white-space:normal;line-height:1.35}'
   + '.em{background:var(--s1);border:1px dashed var(--ln2);border-radius:var(--r);padding:16px;font-size:13px;color:var(--ink2)}'
   + 'footer{margin:26px 0 10px;font-size:12px;color:var(--mut)}'
   + '@media(max-width:640px){.hero h1{font-size:19px}.stp{grid-template-columns:26px 1fr}.stp .ac{grid-column:2}}');
  // EB: шинэ хэсгүүдийн загвар — бүх анги «t2-» угтвартай (board.css-ийн .sc .sec .sub .sel .ph .lb-тэй мөргөлдөхгүй)
  o(':root{--t2m:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace}'
   + '.t2-nm{font-family:var(--t2m);font-variant-numeric:tabular-nums}'
   + '.t2-s{display:flex;flex-direction:column;gap:12px;margin:26px 0 0}.t2-sh{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}.t2-sh h2{font-size:18px;font-weight:700;margin:0;text-wrap:balance;text-transform:none;letter-spacing:0}'
   + '.t2-why{font-size:12.5px;color:var(--mut);max-width:70ch;line-height:1.5;margin:0}'
   + '.t2-cd{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:16px 18px;min-width:0}'
   + '.t2-lb{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--mut)}'
   + '.t2-pl{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;font-size:11.5px;font-weight:650;white-space:nowrap}'
   + '.t2-pl.ok{background:var(--good-a);color:var(--good)}.t2-pl.wr{background:var(--warn-a);color:var(--warn)}.t2-pl.cr{background:var(--crit-a);color:var(--crit)}.t2-pl.bl{background:var(--blue-a);color:var(--f3)}.t2-pl.nt{background:var(--s2);color:var(--ink2)}'
   + '.t2-ban{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:12px;margin-top:12px}@media(max-width:860px){.t2-ban{grid-template-columns:1fr}}'
   + '.t2-ban h1{font-size:20px;margin:4px 0 0;line-height:1.3;text-wrap:balance}.t2-vd{font-size:15px;line-height:1.55;margin:8px 0 0;color:var(--ink)}.t2-vd b{color:var(--crit)}.t2-vd .ok{color:var(--good)}'
   + '.t2-kp{display:flex;gap:18px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid var(--ln3)}.t2-kp div{display:flex;flex-direction:column;gap:1px}.t2-kp b{font:600 20px var(--t2m)}.t2-kp span{font-size:11.5px;color:var(--mut)}.t2-kp .cr b{color:var(--crit)}.t2-kp .wr b{color:var(--warn)}.t2-kp .ok b{color:var(--good)}'
   + '.t2-at{display:flex;flex-direction:column;gap:8px}.t2-at div{display:flex;gap:10px;align-items:baseline;font-size:13px;line-height:1.45}.t2-at i{width:8px;height:8px;border-radius:2px;flex:none;transform:translateY(-1px) rotate(45deg)}.t2-at i.cr{background:var(--crit)}.t2-at i.wr{background:var(--warn)}.t2-at i.ok{background:var(--good)}'
   + '.t2-rs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}@media(max-width:760px){.t2-rs{grid-template-columns:repeat(2,minmax(0,1fr))}}'
   + '.t2-rs .t2-cd{padding:12px 14px;display:flex;flex-direction:column;gap:4px}.t2-rs b{font:600 18px var(--t2m)}.t2-rs span{font-size:12px;color:var(--ink2);line-height:1.4}'
   + '.t2-fr{display:flex;gap:4px;margin-top:4px}.t2-fr i{flex:1;height:6px;border-radius:3px;background:var(--s2)}.t2-fr i.ok{background:var(--good)}.t2-fr i.wr{background:var(--warn)}.t2-fr i.cr{background:var(--crit)}'
   + '.t2-leg{display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;color:var(--mut)}.t2-leg span{display:inline-flex;gap:5px;align-items:center}.t2-leg i{width:10px;height:10px;border-radius:3px}'
   + '.t2-rk{overflow-x:auto;border:1px solid var(--ln);border-radius:14px;background:var(--s1)}.t2-rk table{width:100%;min-width:980px;border-collapse:collapse;font-size:13px}'
   + '.t2-rk th{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);font-weight:700;text-align:left;padding:12px 12px 8px;background:var(--s2);vertical-align:bottom;border:0}.t2-rk th small{display:block;text-transform:none;letter-spacing:0;font-weight:500;font-size:11px;margin-top:2px}'
   + '.t2-rk td{white-space:normal;padding:11px 12px;border-top:1px solid var(--ln3);border-bottom:0;vertical-align:top}.t2-rk tr.t2-r{cursor:pointer}.t2-rk tr.t2-r:hover td{background:var(--s2)}.t2-rk tr.open td{background:var(--gold-a)}.t2-rk tr.open td:first-child{box-shadow:inset 3px 0 0 var(--gold)}'
   + '.t2-no{font:800 20px var(--t2m);color:var(--mut)}tr.open .t2-no{color:var(--gold)}.t2-pn{min-width:210px}.t2-pn b{display:block;font-size:13.5px;line-height:1.3}.t2-pn span{font-size:11.5px;color:var(--mut)}'
   + '.t2-sc{display:flex;flex-direction:column;gap:4px;min-width:118px}.t2-sc b{font:600 18px var(--t2m);line-height:1}.t2-sc b small{font-size:11px;color:var(--mut);font-weight:500;font-family:inherit}'
   + '.t2-stk{display:flex;height:7px;border-radius:4px;overflow:hidden;background:var(--s2);width:110px}.t2-stk i{display:block;height:100%}'
   + '.t2-cv{background:#d9772b}.t2-cg{background:var(--f3)}.t2-ce{background:var(--good)}.t2-cf{background:var(--gold)}.t2-cw{background:var(--mut)}.t2-cx{background:repeating-linear-gradient(135deg,var(--f3) 0 2px,transparent 2px 5px);opacity:.6}'
   + '.t2-ev{display:flex;flex-direction:column;gap:2px;font-size:12px;line-height:1.35;min-width:110px;max-width:210px}.t2-ev .t2-pl{align-self:flex-start}.t2-ev small{color:var(--mut);font-size:11px}'
   + '.t2-dp[hidden]{display:none}.t2-ph{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline}.t2-ph h3{font-size:17px;font-weight:700;margin:0}.t2-sub{font-size:12.5px;color:var(--ink2);margin-top:4px}'
   + '.t2-e4{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:10px;margin-top:14px}'
   + '.t2-eg{border:1px solid var(--ln);border-radius:12px;padding:12px 14px;background:var(--bg);display:flex;flex-direction:column;gap:8px;min-width:0}.t2-eg.cr{box-shadow:inset 0 3px 0 var(--crit)}.t2-eg.wr{box-shadow:inset 0 3px 0 var(--warn)}.t2-eg.ok{box-shadow:inset 0 3px 0 var(--good)}'
   + '.t2-eh{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.t2-eh b{font-size:13.5px}'
   + '.t2-row{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;border-bottom:1px dashed var(--ln3);padding-bottom:5px}.t2-row span{color:var(--mut);flex:none}.t2-row em{font-style:normal;font-variant-numeric:tabular-nums;font-size:12.5px;text-align:right;overflow-wrap:anywhere;min-width:0}'
   + '.t2-ln{display:inline-flex;gap:6px;align-items:center;padding:7px 10px;border:1px solid var(--ln2);border-radius:9px;font-size:12.5px;font-weight:650;color:var(--ink);text-decoration:none;background:var(--s1);align-self:flex-start}.t2-ln:hover{border-color:var(--f3)}'
   + '.t2-it{display:flex;flex-direction:column;gap:4px;font-size:12px}.t2-it a,.t2-it div{color:var(--ink2);text-decoration:none;border-left:2px solid var(--ln2);padding-left:8px;overflow-wrap:anywhere}.t2-it a:hover{border-color:var(--f3)}'
   + '.t2-em{font-size:12.5px;color:var(--mut);border:1px dashed var(--ln2);border-radius:9px;padding:9px 11px;line-height:1.45}'
   + '.t2-vf{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:auto;padding-top:6px}'
   + '.t2-cf2{margin-top:12px;border-radius:12px;padding:12px 14px;background:var(--crit-a);color:var(--ink);font-size:13px;line-height:1.5}.t2-cf2 b{color:var(--crit)}'
   + '.t2-dc{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}@media(max-width:760px){.t2-dc{grid-template-columns:1fr}}'
   + '.t2-db{border:1px solid var(--ln);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;min-width:0}.t2-db p{margin:0;font-size:12.5px;color:var(--ink2);line-height:1.45}'
   + '.t2-db label{font-size:12.5px;display:inline-flex;gap:5px;align-items:center;margin-right:10px}.t2-db select,.t2-db input[type=text]{font:inherit;font-size:13px;padding:6px 8px;border:1px solid var(--ln2);border-radius:8px;background:var(--bg);color:var(--ink);width:100%}'
   + '.btn.rd{color:var(--crit);border-color:var(--crit-a)}.btn.dash{border-style:dashed;background:transparent;color:var(--ink2)}'
   + '.t2-dq{display:flex;flex-direction:column}.t2-dq>div{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:baseline;padding:11px 0;border-bottom:1px solid var(--ln3);font-size:13px;line-height:1.45}.t2-dq>div:last-child{border-bottom:0}.t2-dq em{font-style:normal;font-size:12px;color:var(--mut)}'
   + '.t2-sys{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr);gap:14px;align-items:center}@media(max-width:860px){.t2-sys{grid-template-columns:1fr}}'
   + '.t2-col{display:flex;flex-direction:column;gap:8px}.t2-nd{border:1px solid var(--ln);border-radius:10px;padding:9px 12px;background:var(--bg);font-size:12.5px;line-height:1.4}.t2-nd b{display:block;font-size:13px}'
   + '.t2-core{border:2px solid var(--gold-ln);border-radius:14px;padding:16px;background:var(--gold-a);text-align:center}.t2-core b{font-size:16px;display:block}.t2-core p{margin:6px 0 0;font-size:12.5px;color:var(--ink2)}.t2-core .eq{font:600 12px var(--t2m);margin-top:10px;line-height:1.5}');
  o('</style></head><body><div class="w" id="t2root">');

  // ── толгой + навигаци
  o('<header><div class="hd"><div class="bm">S</div><div><div class="bt">Starshopping</div>');
  o('<div class="bs">тест · бараа сонголт · ' + esc(String(d.generated_at || '').replace('T', ' ').slice(0, 16)) + ' UTC</div></div>');
  o('<div class="sp"></div><a class="rf" href="">Шинэчлэх</a></div></header>');
  o(ssNav('tests', themeQ));

  // ── 0 · ДҮГНЭЛТ — одоо юу хийх вэ + анхаарах зүйлс
  let head;
  if (EV.length) { const e = EV[0]; const rd = e.read || null; head = 'Үнэлгээ · ' + e.name + ' · ' + n(e.hours) + ' цаг' + (rd && rd.early_win ? ' · ЭРТ WIN' : ''); }
  else if (ACT.length) { const t = ACT[0]; head = 'Тест бэлтгэл · ' + t.name + ' · ' + n(t.done) + '/6'; }
  else head = readyN ? 'Тестэд бэлэн ' + readyN + ' бараа — сонгоход бэлэн' : 'Тестэд бэлэн бараа алга — нотолгоог шинэчлэх хэрэгтэй';
  const K = d.kpi || {}; const TH = K.threshold || {};
  const vd = [];
  vd.push('Ранкийн ' + C.length + ' бараанаас <b' + (readyN ? ' class="ok"' : '') + '>тестэд бэлэн нь ' + readyN + '</b>.');
  if (mnOld.length) vd.push('Монголын шалгалт хуучин эсвэл зөвхөн FB зараар: ' + mnOld.length + ' бараа.');
  if (ttOld.length) vd.push('≤90 хоногийн хүчтэй TikTok reel алга: ' + ttOld.length + ' бараа.');
  if (n(RS.owner_rerun)) vd.push('Таны «дахин судлуулах» хүсэлт ' + n(RS.owner_rerun) + ' бараанд хүлээгдэж байна.');
  vd.push('Дараагийн судалгаа ' + esc(RS.task_next || '10:07') + '-д (≤6 бараа).');
  if (EV.length) { const e = EV[0]; const rd = e.read; vd.push(esc(rd ? rd.why : 'Үнэлгээнд байгаа тестийг доороос хар.')); }
  else if (ACT.length) { const nx = A(ACT[0].steps).find((s) => s.status === 'todo'); vd.push(nx ? 'Дараагийн алхам: ' + esc(nx.step + '. ' + nx.title) + ' — ' + esc(nx.owner) + '.' : 'Бүх алхам бэлэн — «AD явуулсан» дар.'); }
  o('<div class="t2-ban"><div class="t2-cd"><div class="t2-lb">Одоо юу хийх вэ</div><h1>' + esc(head) + '</h1><p class="t2-vd">' + vd.join(' ') + '</p>');
  const wr = has(K.win_rate) ? Math.round(n(K.win_rate) * 100) : null, tg = Math.round(n(K.target || 0.8) * 100);
  o('<div class="t2-kp"><div class="' + (readyN ? 'ok' : 'cr') + '"><b>' + readyN + '/' + C.length + '</b><span>тестэд бэлэн</span></div>'
    + '<div class="' + (wr === null ? '' : wr >= tg ? 'ok' : 'wr') + '"><b>' + n(K.wins) + '/' + n(K.closed) + '</b><span>WIN ' + (wr === null ? '—' : wr + '%') + ' · зорилт ' + tg + '%</span></div>'
    + '<div><b>' + n(S.used) + '/' + n(S.max) + '</b><span>зэрэг тест</span></div>'
    + '<div><b>' + n((C[0] || {}).v2_min || 55) + '</b><span>тестийн босго · v2 оноо</span></div>'
    + '<div><b>¥1=' + n(ST.fx_cny) + '₮</b><span>ханш · карго ' + mnt(ST.cargo_min) + '</span></div></div></div>');
  o('<div class="t2-cd t2-at"><div class="t2-lb">Анхаарах ' + ATT.length + '</div>'
    + (ATT.length ? ATT.map((x) => '<div><i class="' + x[0] + '"></i><span>' + x[1] + '</span></div>').join('') : '<div><i class="ok"></i><span>Өгөгдөлд анхаарах зүйл алга.</span></div>')
    + (TH.why ? '<div style="color:var(--mut);font-size:12px">' + esc(TH.why) + '</div>' : '') + '</div></div>');

  // ── 1 · СУДАЛГАА ХЭР ШИНЭ ВЭ
  const fr = (L, f) => '<div class="t2-fr">' + L.map((c) => '<i class="' + f(c) + '"></i>').join('') + '</div>';
  const ages = C.map((c) => ((c.rv || {}).mn || {}).age_days).filter(has).map(Number);
  o('<section class="t2-s"><div class="t2-sh"><h2>1 · Судалгаа хэр шинэ вэ</h2><p class="t2-why">Ранк зөвхөн шинэ нотолгоогоор найдвартай. Шат бүрийн хугацаа: TikTok reel ≤90 хоног, Монголын зах зээл ≤7 хоног. 1688 өртөг зураг болон checkout-оор.</p></div><div class="t2-rs">');
  o('<div class="t2-cd"><span class="t2-lb">Судлаач · өдөр бүр</span><b>' + esc(RS.task_next || '10:07') + '</b><span>дараагийн ажил · ≤6 бараа<br>Сүүлд: <b style="font-size:12px;font-family:inherit">'
    + (RS.task_last_at ? esc(day(RS.task_last_at)) + ' (' + esc(ago(RS.task_last_at)) + ')' : 'хараахан ажиллаагүй') + '</b>'
    + (RS.task_last_at ? ' · 24ц: ' + n(RS.task_24h) + ' бараа' : '') + (n(RS.owner_rerun) ? '<br>Таны хүсэлт: ' + n(RS.owner_rerun) + ' бараа' : '') + '</span></div>');
  o('<div class="t2-cd"><span class="t2-lb">TikTok · ≤90 хоног</span><b>' + (C.length - ttOld.length) + '/' + C.length + '</b><span>шинэ хүчтэй reel-тэй' + (C.length - ttOld.length ? ' (' + rk(C.filter((c) => (CH(c, 'fresh') || {}).ok)) + ')' : '') + '</span>'
    + fr(C, (c) => ((CH(c, 'fresh') || {}).ok ? 'ok' : /^сул/.test(String((CH(c, 'fresh') || {}).fact || '')) ? 'wr' : 'cr')) + '</div>');
  o('<div class="t2-cd"><span class="t2-lb">1688 · зургаар</span><b>' + C.filter(isOffer).length + '/' + C.length + '</b><span>offer холбоостой · хүргэлт ' + C.filter((c) => c.cn_ship_checked).length + '/' + C.length + ' шалгасан</span>'
    + fr(C, (c) => (!isOffer(c) ? 'cr' : c.cn_ship_checked ? 'ok' : 'wr')) + '</div>');
  o('<div class="t2-cd"><span class="t2-lb">Монгол · ≤7 хоног</span><b>' + (C.length - mnOld.length) + '/' + C.length + '</b><span>'
    + (ages.length ? Math.min.apply(null, ages) + (Math.max.apply(null, ages) !== Math.min.apply(null, ages) ? '–' + Math.max.apply(null, ages) : '') + ' хоногийн өмнө' : 'огноо алга')
    + ' · ' + C.filter((c) => ((c.rv || {}).mn || {}).src === 'fb_ads').length + ' нь зөвхөн FB зар</span>'
    + fr(C, (c) => (((c.rv || {}).mn || {}).fresh ? 'ok' : (c.rv || {}).conflict ? 'cr' : 'cr')) + '</div>');
  o('</div></section>');

  // ── 2 · РАНК + НОТОЛГОО
  const TR = ACT.concat(EV).filter((t) => has(t.rank_now)).sort((a, b) => n(a.rank_now) - n(b.rank_now));
  o('<section class="t2-s"><div class="t2-sh"><h2>2 · Ранк · нэр дэвшигчид</h2><p class="t2-why">Мөр дээр дарахад доор нотолгоо нь нээгдэнэ. Эрэмбэ = алгоритм v2 (11/03): 8 шалгуурын оноо — татах хүч, надад хэрэгтэй, МН тохирол, үнэ цэнэ (≤30k өртөг → ~95k), эрэлт, ялах боломж, Temu, ажиллагаа. Хатуу хаалгад тэнцээгүй бараа жагсаалтаас гарна. 1688 холбоосгүй бараа холбоостойн доор.'
    + (TR.length ? ' Тестэд байгаа: ' + TR.map((t) => '#' + n(t.rank_now) + ' ' + esc(t.name)).join(', ') + '.' : '') + '</p></div>');
  if (!C.length) o('<div class="em">Нэр дэвшигч алга — өдөр бүрийн шүүлт ажилласны дараа энд гарна.</div>');
  else {
    o('<div class="t2-leg"><span><i class="t2-cv"></i>татах хүч</span><span><i class="t2-cf"></i>МН тохирол</span><span><i class="t2-ce"></i>үнэ цэнэ</span><span><i class="t2-cg"></i>эрэлт</span><span><i class="t2-cw"></i>ялах · Temu · ажиллагаа</span></div>');
    o('<div class="t2-rk"><table><thead><tr><th>#</th><th>Бараа</th><th>Оноо v2<small>8 шалгуур · хуучин оноо</small></th><th>TikTok<small>≤90 хоног</small></th><th>1688<small>зөв SKU · Эрээнд</small></th><th>Монгол<small>≤7 хоног</small></th><th>Ашиг<small>≥' + mnt(((C[0].rv || {}).econ || {}).min || 20000) + ' / захиалга</small></th><th>Төлөв</th></tr></thead><tbody>');
    C.forEach((c, i) => {
      const G = gs(c), rv = c.rv || {};
      const ev = (x) => '<div class="t2-ev">' + pl(x.cls, x.label) + (x.sub ? '<small>' + x.sub + '</small>' : '') + '</div>';
      o('<tr class="t2-r' + (i === 0 ? ' open' : '') + '" data-i="' + i + '" data-keep="f' + n(c.find_id) + '"><td><span class="t2-no">' + n(c.rank) + '</span></td>'
        + '<td class="t2-pn"><b>' + esc(c.product) + '</b><span>' + esc(c.category || '—') + (rv.season ? ' · ' + esc(rv.season) : '') + (c.resurfaced ? ' · ↻ эргэн ирсэн' : '') + '</span></td>'
        + '<td><div class="t2-sc"><b class="t2-nm">' + (has(c.score_v2) ? n(c.score_v2) : '—') + ' <small>хуучин ' + n(c.score_adj) + (v2miss(c).length ? ' · дутуу: ' + esc(v2miss(c).join(', ')) : '') + '</small></b>' + (has(c.score_v2) ? v2bar(c) : bar(c)) + '</div></td>'
        + '<td>' + ev(G.tt) + '</td><td>' + ev(G.cn) + '</td><td>' + ev(G.mn) + '</td><td>' + ev(G.econ) + '</td><td>' + stat(c) + '</td></tr>');
    });
    o('</tbody></table></div>');
  }
  o('</section>');

  // нотолгооны самбар — бараа бүрт нэг (серверт биш, энд зурж нуусан; мөр дарахад нээгдэнэ)
  C.forEach((c, i) => {
    const rv = c.rv || {}, T = rv.tt || {}, CN = rv.cn || {}, M = rv.mn || {}, E = rv.econ || {}, W = c.why || {}, VV = W.viral || {}, P = W.parts || {};
    const cf = c.confidence || {}, G = gs(c), id = n(c.find_id), busy = has(c.open_test);
    const row = (k, v) => (has(v) && v !== '' ? '<div class="t2-row"><span>' + k + '</span><em>' + v + '</em></div>' : '');
    const vbtn = (g, extra) => '<div class="t2-vf"><button class="btn s dash vf-b" data-f="' + id + '" data-g="' + g + '" data-ok="1">✓ Би шалгасан</button>'
      + (g !== 'econ' ? '<button class="btn s dash vf-b" data-f="' + id + '" data-g="' + g + '" data-ok="0">✗ Буруу</button>' : '') + (extra || '') + '</div>';
    o('<section class="t2-s t2-dp" id="dp' + i + '"' + (i === 0 ? '' : ' hidden') + '><div class="t2-sh"><h2>#' + n(c.rank) + ' · Нотолгоо ба шийдвэр</h2><p class="t2-why">Шат бүрийг өөрөө нээж шалгаад «Би шалгасан» эсвэл «Буруу» гэж тэмдэглэнэ. Буруу гэвэл тэр шат маргаашийн судалгааны эхэнд орно. Таны тэмдэглэл судлаачийн дүгнэлтээс илүү жинтэй.</p></div><div class="t2-cd">');
    o('<div class="t2-ph"><h3>' + esc(c.product) + '</h3><span>' + (busy || rv.rerun || c.ready ? stat(c) + ' ' : '')
      + (cf.ok ? pl('ok', 'нягтлагдсан ' + n(cf.of) + '/' + n(cf.of)) : pl('wr', 'нягтлалт ' + n(cf.passed) + '/' + n(cf.of) + (A(cf.missing).length ? ' · дутуу: ' + esc(A(cf.missing).join(', ')) : ''))) + '</span></div>');
    o('<div class="t2-sub">' + (c.product_en ? esc(c.product_en) + ' · ' : '') + 'олсон: ' + esc(c.found_by || '?') + ' · ' + esc(c.found_where || '?') + ' · ' + esc(day(c.found_at))
      + (rv.rerun ? ' · ' + pl('bl', '↻ дахин судлуулах: ' + esc(A(rv.rerun.gates).map((g) => GN[g] || g).join(', ')) + ' · ' + esc(ago(rv.rerun.at))) : '') + '</div>');
    o('<div class="t2-e4">');
    // TikTok
    const IT = A(T.items);
    o('<div class="t2-eg ' + G.tt.cls + '"><div class="t2-eh"><b>TikTok · шинэ вирал</b><span>' + pl(G.tt.cls, G.tt.label) + ' ' + ownerPill(c, 'tt') + '</span></div>'
      + row('Холбогдсон reel', url(c.reel_url) ? esc(day(c.reel_posted_at)) + (has(c.reel_views) ? ' · ' + bigN(c.reel_views) : '') + (has(c.reel_likes) ? ' · ' + bigN(c.reel_likes) + ' like' : '') : 'алга')
      + row('Шинэ эсэх', esc((CH(c, 'fresh') || {}).fact || ''))
      + row('Сүүлийн хүчтэй reel', esc(VV.last_strong_date || ''))
      + row('Судлаач шалгасан', T.checked_at ? esc(day(T.checked_at)) + ' · ' + esc(ago(T.checked_at)) : 'хараахан')
      + (url(c.reel_url) ? '<a class="t2-ln" href="' + url(c.reel_url) + '" target="_blank" rel="noopener">▶ ' + (/instagram/i.test(c.reel_url) ? 'Instagram' : 'TikTok') + ' reel нээх ↗</a>' : '')
      + (IT.length ? '<div class="t2-it">' + IT.slice(0, 4).map((x) => (url(x.url) ? '<a href="' + url(x.url) + '" target="_blank" rel="noopener">' : '<div>') + '▶ ' + esc(day(x.posted_at)) + (has(x.views) ? ' · ' + bigN(x.views) + ' үзэлт' : '') + (x.note ? ' · ' + esc(String(x.note).slice(0, 80)) : '') + (url(x.url) ? '</a>' : '</div>')).join('') + '</div>'
        : '<div class="t2-em">Судлаач ≤90 хоногийн reel хайгаад энд огноо, үзэлттэй нь 3 хүртэл reel гаргана (дараагийн ажил ' + esc(RS.task_next || '10:07') + ').</div>')
      + vbtn('tt') + '</div>');
    // 1688
    let alt = CN.alt; try { const j = JSON.parse(alt); if (Array.isArray(j)) alt = j.map((x) => (typeof x === 'object' ? (x.url || x.id || '') + (x.cny ? ' ¥' + x.cny : '') : x)).join(' · '); } catch (er) { /* текст хэвээр */ }
    o('<div class="t2-eg ' + G.cn.cls + '"><div class="t2-eh"><b>1688 · авах бараа</b><span>' + pl(G.cn.cls, c.cn_ship_checked ? 'хүргэлт шалгасан' : isOffer(c) ? 'хүргэлт таамаг' : 'offer алга') + ' ' + ownerPill(c, 'cn') + '</span></div>'
      + row('Зөв SKU-ийн үнэ', has(c.cn_item_cny) ? '¥' + esc(c.cn_item_cny) : '')
      + row('Хятад доторх хүргэлт', has(c.cn_ship_cny) ? '¥' + esc(c.cn_ship_cny) + (c.cn_ship_checked ? '' : ' · таамаг') : '')
      + row('Нийт (Эрээнд)', has(c.cn_price) ? '¥' + esc(c.cn_price) : 'алга')
      + row('Зарагдсан · жин', (has(c.cn_sold) ? n(c.cn_sold).toLocaleString('en-US') + ' ш' : '? ш') + ' · ' + (c.weight_g ? n(c.weight_g) + ' г' : 'жин ?'))
      + row('SKU тэмдэглэл', esc(CN.sku_note || ''))
      + row('Нөөц offer', esc(alt || ''))
      + row('Өртөг шалгасан', c.cn_price_by ? esc(c.cn_price_by) + (c.cn_price_at ? ' · ' + esc(day(c.cn_price_at)) : '') : 'Claude олсон — шалгаагүй')
      + row('Тэмдэглэл', esc(String(c.supplier_note || '').slice(0, 180)))
      + (isOffer(c) ? '<a class="t2-ln" href="' + url(c.cn_offer_url) + '" target="_blank" rel="noopener">🛒 1688 offer нээх ↗</a>' : c.cn_url ? '<a class="t2-ln" href="' + url(c.cn_url) + '" target="_blank" rel="noopener">1688 хайлт ↗</a>' : '')
      + vbtn('cn', '<button class="btn s cost-b" data-f="' + id + '">Өртөг засах</button>') + '<div class="out" id="out-cost' + id + '"></div></div>');
    // Монгол
    const SL = A(M.sellers);
    o('<div class="t2-eg ' + G.mn.cls + '"><div class="t2-eh"><b>Монголын зах зээл</b><span>' + pl(G.mn.cls, M.fresh ? 'шинэ' : has(M.age_days) ? n(M.age_days) + ' хоног хуучирсан' : 'шалгаагүй') + ' ' + ownerPill(c, 'mn') + '</span></div>'
      + row('Эх сурвалж', esc(MNSRC[M.src] || '—') + (M.at ? ' · ' + esc(day(M.at)) : ''))
      + row('Төлөв', esc(MNST[M.status] || 'тодорхойгүй'))
      + row('FB зар (Ad Library)', has(M.same_pages) ? n(M.same_pages) + ' page' : '')
      + row('Дэлгүүр (тэмдэглэсэн)', n(M.mn_common) ? n(M.mn_common) + '+' + (A(M.examples).length ? ' · ' + esc(A(M.examples).slice(0, 3).join(', ')) : '') : '')
      + row('Үнийн муж', has(M.price_min) || has(M.price_max) ? mnt(M.price_min) + ' – ' + mnt(M.price_max) : '')
      + row('Сайн борлуулсан', esc(M.did_well || ''))
      + row('Бид яаж ялгарах', esc(M.tactic || ''))
      + row('Хайсан үг', esc(A(M.terms).join(', ')))
      + (rv.conflict ? '<div class="t2-em" style="border-color:var(--crit);color:var(--crit)">Зөрчил: ' + esc(rv.conflict) + '</div>' : '')
      + (SL.length ? '<div class="t2-it">' + SL.slice(0, 8).map((s) => (url(s.url) ? '<a href="' + url(s.url) + '" target="_blank" rel="noopener">' : '<div>') + esc(s.name || s.url || '?') + (has(s.price_mnt) ? ' · ' + mnt(s.price_mnt) : '') + (has(s.ad_days) ? ' · зар ' + n(s.ad_days) + ' хоног' : '') + (s.src ? ' · ' + esc(s.src) : '') + (s.active === false ? ' · зогссон' : '') + (url(s.url) ? '</a>' : '</div>')).join('') + '</div>'
        : '<div class="t2-em">Судлаач 4 эх сурвалжаас (Ad Library, FB пост/group/Marketplace, unegui, zary) хайгаад энд гаргана: худалдагч бүр (нэр, холбоос, үнэ, зар хэдэн хоног явсан), үнийн муж, сайн борлуулсан эсэх, бид яаж ялгарах.</div>')
      + vbtn('mn', '<button class="btn s mnc-b" data-f="' + id + '">Дэлгүүрийн тоо</button>') + '<div class="out" id="out-mnc' + id + '"></div></div>');
    // Эдийн засаг
    o('<div class="t2-eg ' + G.econ.cls + '"><div class="t2-eh"><b>Эдийн засаг</b><span>' + pl(G.econ.cls, has(E.profit) ? (n(E.profit) >= n(E.min || 20000) ? 'босго давсан' : 'босгоос ' + mnt(n(E.min || 20000) - n(E.profit)) + ' доош') : 'тооцоогүй') + ' ' + ownerPill(c, 'econ') + '</span></div>'
      + row('Зарах үнэ', mnt(E.price) + (E.owner_price ? ' · таны үнэ' : ' · системийн санал'))
      + row('Эрээнд буусан өртөг', has(E.landed) ? mnt(E.landed) : '')
      + row('1 захиалгын ашиг', has(E.profit) ? mnt(E.profit) + ' · босго ' + mnt(E.min || 20000) : '')
      + row('Жишиг (гадаад)', has(E.retail) ? (url(E.retail_url) ? '<a href="' + url(E.retail_url) + '" target="_blank" rel="noopener">' + mnt(E.retail) + ' ↗</a>' : mnt(E.retail)) : '')
      + row('Оноонд', 'ашиг ' + n(P.econ) + ' · тохирол ' + n(P.fit))
      + vbtn('econ', '<button class="btn s prc-b" data-f="' + id + '" data-p="' + (has(E.price) ? n(E.price) : '') + '">Үнэ тогтоох</button>') + '<div class="out" id="out-prc' + id + '"></div></div>');
    o('</div>');
    // яагаад анхааралтай байх вэ
    const cw = [];
    if (n(c.mn_adj) < 0) cw.push('Оноо ' + n(c.score_base) + '-ийн «МН зай» ' + n(P.gap) + ' нь ' + esc(MNSRC[M.src] || '?') + (has(M.age_days) ? ' (' + n(M.age_days) + ' хоногийн өмнө)' : '') + '-д тулгуурласан тул <b>' + n(c.mn_adj) + '</b> хассан → ' + n(c.score_adj) + '. Монголын хэсгийг шалгаад «Би шалгасан» дарах эсвэл судлаач шинэчлэхэд буцна.');
    if (rv.conflict) cw.push('<b>Зөрчил:</b> ' + esc(rv.conflict) + '. Аль нь зөвийг Монголын хэсгээс шалгана уу.');
    if (cw.length) o('<div class="t2-cf2"><b>Яагаад анхааралтай байх вэ:</b> ' + cw.join(' ') + '</div>');
    const gw = A(W.good).map((t) => '✅ ' + esc(t)).concat(A(W.warn).map((t) => '⚠️ ' + esc(t)));
    if (gw.length) o('<div class="kv" style="font-size:12px;margin-top:12px">' + gw.join('<br>') + '</div>');
    if (A(cf.checks).length) o('<div class="chk">' + A(cf.checks).map((x) => '<div class="' + (x.ok ? 'ok' : 'no') + '"><b>' + (x.ok ? '✓ ' : '✗ ') + esc(x.label) + '</b>' + esc(x.fact) + '</div>').join('') + '</div>');
    // 3 шийдвэр
    const bad = ['tt', 'cn', 'mn'].filter((g) => G[g].cls !== 'ok');
    o('<div class="t2-dc"><div class="t2-db"><button class="btn p sel-b" data-f="' + id + '" data-n="' + esc(c.product) + '"' + (busy || !free ? ' disabled' : '') + '>Тестэд сонгох</button><p>'
      + (busy ? 'Аль хэдийн тестэд байна (#' + n(c.open_test) + ').' : !free ? 'Зэрэг тестийн хязгаар дүүрсэн — эхлээд нэгийг WIN/LOSS болго.' : cf.ok ? 'Нягтлагдсан — сонгомогц 1-р алхам систем өөрөө хаана.' : 'Нягтлалт ' + n(cf.passed) + '/' + n(cf.of) + ' — сонгож болно; 1-р алхамд Claude дутууг нөхнө.')
      + '</p><div class="out" id="out-sel' + id + '"></div></div>');
    o('<div class="t2-db"><button class="btn rr-b" data-f="' + id + '">Дахин судлуулах</button><p>Маргаашийн судалгааны дарааллын эхэнд орно. Аль шатыг:</p><div>'
      + ['tt', 'cn', 'mn'].map((g) => '<label><input type="checkbox" class="rr-g" value="' + g + '"' + (bad.indexOf(g) >= 0 || !bad.length ? ' checked' : '') + '>' + GN[g] + '</label>').join('')
      + '</div><input type="text" class="rr-n" placeholder="Тэмдэглэл (заавал биш)"><div class="out" id="out-rr' + id + '"></div></div>');
    o('<div class="t2-db"><button class="btn rd rj-b" data-f="' + id + '" data-n="' + esc(c.product) + '">Татгалзах</button><p>Ранкаас хасагдана. Шалтгааныг систем хадгалж суралцана.</p>'
      + '<select class="rj-s"><option value="mn_common">МН-д түгээмэл</option><option value="econ">Ашиг бага</option><option value="wrong">Буруу бараа</option><option value="season">Улирал өнгөрсөн</option><option value="other">Бусад</option></select>'
      + '<input type="text" class="rj-n" placeholder="Тэмдэглэл (заавал биш)"><div class="out" id="out-rj' + id + '"></div></div></div>');
    o('</div></section>');
  });
  // ── 2. ТЕСТ БЭЛТГЭЛ
  o('<div class="sec"><b>3 · Тест бэлтгэл</b><span class="st">1–6 алхам · систем 1, 3, 5-ыг өөрөө таньж хаана · бүгд бэлэн бол «AD явуулсан»</span></div>');
  if (!ACT.length) o('<div class="em">Идэвхтэй тест алга. Дээрээс нэг бараа сонго' + (free ? '' : ' (зэрэг тестийн хязгаар дүүрсэн)') + '.</div>');
  ACT.forEach((t) => {
    const steps = A(t.steps); const done = n(t.done); const cf = t.confidence || {};
    const nowStep = (steps.find((s) => s.status === 'todo') || {}).step;
    o('<div class="tc"><div class="hd2"><h3>' + esc(t.name) + '</h3>' + rankTag(t.rank_now) + '<span class="gt bl">' + esc(t.category || '—') + '</span>'
      + (cf.ok ? '<span class="gt ok">нягтлагдсан ' + n(cf.of) + '/' + n(cf.of) + '</span>' : '<span class="gt wr">нягтлалт ' + n(cf.passed) + '/' + n(cf.of) + '</span>')
      + (t.slug ? '<span class="gt ok">ТЕСТ горимд · ' + esc(t.slug) + '</span>' : '<span class="gt mu">бүртгээгүй</span>')
      + '<span class="gt mu">креатив ' + n(t.creatives) + '</span><span class="gt mu">' + esc(ago(t.selected_at)) + '</span></div>');
    o(pcard(t.card));
    o('<div class="prog"><i style="width:' + Math.round(100 * done / 6) + '%"></i></div><div class="st" style="font-size:12px;color:var(--mut)">' + done + '/6 алхам</div>');
    o('<div class="steps">');
    steps.forEach((s) => {
      const isDone = s.status !== 'todo';
      o('<div class="stp' + (isDone ? ' done' : '') + (s.step === nowStep ? ' now' : '') + '"><div class="no">' + (isDone ? '✓' : s.step) + '</div>');
      o('<div><div class="tt">' + esc(s.title) + '</div><div class="dt">' + esc(s.detail || '') + '</div>');
      o('<div class="ow' + (s.owner === 'Ариунболд' ? ' me' : '') + '">' + esc(s.owner) + (isDone ? ' · ' + (s.done_by === 'систем' ? 'систем баталсан' : 'хийсэн') + ' ' + esc(ago(s.done_at)) : '') + (s.note ? ' · ' + esc(s.note) : '') + '</div>');
      if (s.step === 1 && !cf.ok) o('<div class="dt" style="color:var(--warn)">Дутуу: ' + esc(A(cf.missing).join(', ')) + '</div>');
      o('</div><div class="ac">' + (s.done_by === 'систем' && isDone ? '' : '<button class="btn s stp-b" data-t="' + n(t.test_id) + '" data-s="' + s.step + '" data-st="' + (isDone ? 'todo' : 'done') + '">' + (isDone ? '↺ буцаах' : 'Хийсэн') + '</button>') + '</div></div>');
    });
    o('</div>');
    const pt = t.pretest || {};
    if (A(pt.checks).length) {
      o('<div class="ckp"><div class="ckh"><b>Бэлтгэлийн шалгалт</b><span class="gt ' + (pt.ready ? 'ok' : 'wr') + '">' + n(pt.ok_count) + '/' + n(pt.total) + '</span>'
        + (pt.breakeven_mnt ? '<span class="gt mu">breakeven ' + mnt(pt.breakeven_mnt) + ' / хаягтай захиалга</span>' : '') + '</div>');
      A(pt.checks).forEach((c) => {
        const ic = c.status === 'ok' ? '✓' : c.status === 'fail' ? '✗' : '○';
        o('<div class="ckr ' + esc(c.status) + '"><div class="cki">' + ic + '</div><div><div class="tt">' + esc(c.label) + (c.kind === 'manual' ? ' <span class="gt mu">гараар</span>' : '') + '</div>'
          + '<div class="dt">' + esc(c.detail || '') + '</div>' + (c.status !== 'ok' && c.how ? '<div class="dt hw">Яаж: ' + esc(c.how) + '</div>' : '') + '</div>'
          + '<div class="ckb">' + (c.kind === 'manual' ? '<button class="btn s pt-b" data-t="' + n(t.test_id) + '" data-k="' + esc(c.key) + '" data-d="' + (c.status === 'ok' ? 'todo' : 'done') + '">' + (c.status === 'ok' ? '↺ буцаах' : 'Шалгасан') + '</button>' : '') + '</div></div>');
      });
      o('</div>');
    }
    o('<div class="launch"><button class="btn p lau-b" data-t="' + n(t.test_id) + '" data-n="' + esc(t.name) + '"' + (t.can_launch ? '' : ' disabled') + '>🚀 AD явуулсан</button>'
      + '<div class="why">' + (t.can_launch ? 'Бэлэн. Дарахад бараа Тестээс хасагдаж Үнэлгээ (AD) хэсэгт шилжинэ, систем WIN/LOSS хүлээнэ.'
        : 'Идэвхжих нөхцөл: 6/6 алхам · нягтлалт ' + n(cf.of) + '/' + n(cf.of) + ' · ТЕСТ горимд бүртгэлтэй.' + (done < 6 ? ' Дутуу алхам ' + (6 - done) + '.' : '') + (!cf.ok ? ' Нягтлалт ' + n(cf.passed) + '/' + n(cf.of) + '.' : '') + (!t.slug ? ' Бүртгэлгүй.' : '') + (pt.checks && !pt.ready ? ' Бэлтгэл ' + n(pt.ok_count) + '/' + n(pt.total) + '.' : '')) + '</div>'
      + '<button class="btn s drop-b" data-t="' + n(t.test_id) + '" data-n="' + esc(t.name) + '">Тестээс гаргах</button></div>');
    o('<div class="out" id="out-t' + n(t.test_id) + '"></div></div>');
  });

  // ── 3. ҮНЭЛГЭЭ · AD
  o('<div class="sec"><b>4 · Үнэлгээ · AD</b><span class="st">зар явж байна · 24 цагаас хойш систем санал өгнө (23 Ad Guard) · та баталгаажуулна</span></div>');
  if (!EV.length) o('<div class="em">Үнэлгээнд бараа алга.</div>');
  EV.forEach((e) => {
    const sg = e.signal || {}; const k = sg.kind; const cls = k === 'win' ? 'win' : k === 'lose' ? 'lose' : 'wait';
    o('<div class="tc"><div class="hd2"><h3>' + esc(e.name) + '</h3>' + rankTag(e.rank_now) + '<span class="gt bl">' + esc(e.category || '—') + '</span><span class="gt mu">AD ' + day(e.launched_at) + ' · ' + n(e.hours) + ' цаг</span>' + ntf(e.notify) + '</div>');
    o(pcard(e.card));
    if (e.read && e.read.early_win) o('<div class="ew">🚀 ЭРТ WIN — ' + esc(e.read.early_rule || '') + '. Эхний багц ~' + n(e.read.suggest_first_qty) + ' ш-ийг 1688-аас яаралтай захиал (карго ~14 хоног). WIN-ийг доор 1 товчоор батал.</div>');
    if (!e.read) o('<div class="mx"><div><div class="l">Зар</div><div class="v">' + mnt(has(sg.spend_mnt) ? sg.spend_mnt : e.spend_mnt) + '</div></div>'
      + '<div><div class="l">Утсаа үлдээсэн</div><div class="v">' + n(has(sg.signups) ? sg.signups : e.orders) + '</div></div>'
      + '<div><div class="l">1 хүний өртөг</div><div class="v">' + (has(sg.cpa_mnt) ? mnt(sg.cpa_mnt) : '—') + '<small> босго ' + (has(sg.max_cpa_mnt) ? mnt(sg.max_cpa_mnt) : '—') + '</small></div></div>'
      + '<div><div class="l">Хүлээж буй</div><div class="v">' + n(sg.waiting) + '<small> ш ' + n(sg.pending_qty) + '</small></div></div></div>');
    const RD = e.read;
    if (RD) {
      const pct = (v) => (has(v) ? Math.round(n(v) * 100) + '%' : '—');
      const VL = { win: '🟢 WIN', loss: '🔴 LOSS', wait: '⏳ хүлээ', early: '⏳ эхний 24ц', starved: '⚪ Meta мөнгө өгөөгүй', inconclusive: '🟡 ДҮГНЭХГҮЙ' };
      /* Зар тус бүрийн дүгнэлт зөвхөн мэдээлэл: Meta төсвийг зар хооронд өөрөө хуваарилдаг
         (breakdown effect) тул нэг зарыг дундаж өртгөөр нь унтрааж болохгүй — БАРААГ нийтээр нь дүгнэнэ. */
      const VA = { win: '🟢 хүчтэй', loss: '🟠 сул', wait: '⏳ хүлээ', early: '⏳ эхний 24ц', starved: '⚪ Meta мөнгө өгөөгүй', junk: '🟡 хог трафик', underfunded_winner: '💰 ялагч — төсөв нэм' };
      const GT = RD.gates || {}, GL = GT.limits || {}, IN = RD.interest || {}, PX = RD.pixel || {};
      const gk = (ok) => (ok === null ? '—' : ok ? '✓' : '✗');
      const vc = RD.verdict === 'win' ? 'win' : RD.verdict === 'loss' ? 'lose' : 'wait';
      const DG = RD.diag || {};
      const H = e.health24;
      if (H && A(H.checks).length) {
        o('<div class="h24' + (H.ok ? '' : ' bad') + '"><b>' + (H.ok ? '✅ 24 цагийн шалгалт — цэвэр' : '⚠️ 24 цагийн шалгалт — анхаарах зүйл байна') + '</b> <span class="st" style="color:var(--mut);font-size:12px">' + esc(ago(H.at)) + '</span>');
        A(H.checks).forEach((c) => o('<div class="ckr ' + (c.status === 'ok' ? 'ok' : c.status === 'fail' ? 'fail' : '') + '"><div class="cki">' + (c.status === 'ok' ? '✓' : c.status === 'fail' ? '✗' : '!') + '</div><div><div class="tt">' + esc(c.label) + '</div><div class="dt">' + esc(c.detail || '') + '</div></div><div></div></div>'));
        if (A(H.actions).length) o('<div class="dt hw" style="margin-top:6px">👉 ' + A(H.actions).map(esc).join('<br>👉 ') + '</div>');
        o('</div>');
      } else if (n(e.hours) < 24) o('<div class="h24"><span class="st">24 цагийн автомат шалгалт ' + (24 - n(e.hours)) + ' цагийн дараа (байршил + хаалт → Telegram)</span></div>');
      else o('<div class="h24"><span class="st">24 цагийн шалгалт хийгдэж байна (3 цаг тутам шалгана)…</span></div>');
      o('<div class="sec" style="margin:14px 0 4px"><b style="font-size:14px">Зарын уншилт v4</b><span class="st">' + n(RD.hours) + ' цаг · Meta өгөгдөл ' + esc(RD.data_through || '—') + ' хүртэл · breakeven ' + mnt(RD.breakeven_mnt) + '/хаягтай (' + esc(RD.breakeven_src || '') + ')</span></div>');
      o('<div class="mx"><div><div class="l">Зардал</div><div class="v">' + mnt(RD.spend_mnt) + '</div></div>'
        + '<div><div class="l">Impression</div><div class="v">' + n(RD.impressions).toLocaleString('en-US') + '</div></div>'
        + '<div><div class="l">Хаягтай захиалга</div><div class="v">' + n(RD.signups) + '<small> сонирхол ' + n(RD.leads) + ' · pixel ' + n(RD.purchases_meta) + '</small></div></div>'
        + '<div><div class="l">1 хаягтай</div><div class="v">' + (has(RD.cps_mnt) ? mnt(RD.cps_mnt) : '—') + '<small> ≤ ' + mnt(RD.breakeven_mnt) + (has(RD.cpl_mnt) ? ' · 1 бүртгэл ' + mnt(RD.cpl_mnt) : '') + '</small></div></div>'
        + '<div><div class="l">P(win)</div><div class="v">' + pct(RD.p_win) + '<small> ' + esc(VL[RD.verdict] || RD.verdict) + '</small></div></div></div>');
      if (RD.gate) o('<div class="mx" style="font-size:12px">'
        + '<div><div class="l">Хаалт</div><div class="v">' + esc(RD.gate === 'ok' ? '✓ цэвэр' : RD.gate) + '</div></div>'
        + '<div><div class="l">Link CTR ≤' + n(GL.junk_ctr_pct) + '%</div><div class="v">' + (has(GT.link_ctr_pct) ? GT.link_ctr_pct + '% ' + gk(n(GT.link_ctr_pct) <= n(GL.junk_ctr_pct)) : '—') + '</div></div>'
        + '<div><div class="l">LPV/клик ≥' + n(GL.junk_lpv_pct) + '%</div><div class="v">' + (has(GT.lpv_per_click_pct) ? GT.lpv_per_click_pct + '% ' + gk(n(GT.lpv_per_click_pct) >= n(GL.junk_lpv_pct)) : '—') + '</div></div>'
        + '<div><div class="l">«Захиалах»/LPV</div><div class="v">' + (has(GT.open_per_lpv_pct) ? GT.open_per_lpv_pct + '%' : '—') + '<small> WIN 4.5 · LOSS 2.6 (өөрийн)</small></div></div>'
        + '<div><div class="l">Маягт ok ≥' + n(GL.form_ok_min_pct) + '%</div><div class="v">' + (has(GT.ok_per_open_pct) ? GT.ok_per_open_pct + '% ' + gk(n(GT.ok_per_open_pct) >= n(GL.form_ok_min_pct)) : '—') + '</div></div>'
        + '<div><div class="l">Хаягтай хувь</div><div class="v">' + (has(IN.addr_share_pct) ? IN.addr_share_pct + '%' : '—') + '<small> ' + n(IN.addressed) + '/' + (n(IN.addressed) + n(IN.leads)) + '</small></div></div></div>');
      o('<div class="sug ' + vc + '">' + esc(RD.why) + (DG.leak ? '<br><b>Хамгийн сул шат:</b> ' + esc(DG.leak) : '')
        + '<br><span style="font-size:12px">Hook ' + (has(DG.hook_pct) ? DG.hook_pct + '%' : '—') + ' · CTR ' + (has(DG.ctr_pct) ? DG.ctr_pct + '%' : '—') + ' · хуудас ачаалсан ' + (has(DG.lpv_pct) ? DG.lpv_pct + '%' : '—') + ' · «Захиалах» дарсан ' + (has(DG.open_pct) ? DG.open_pct + '%' : '—') + ' (' + n(RD.open) + ' хүн)' + (n(RD.unattributed) ? ' · ' + n(RD.unattributed) + ' захиалга аль зараас ирсэн нь тодорхойгүй' : '') + '</span></div>');
      const AD = A(RD.ads);
      if (AD.length) {
        o('<div class="ads">');
        AD.forEach((a) => { const g = a.diag || {}; const vk = a.verdict === 'win' || a.verdict === 'underfunded_winner' ? 'ok' : a.verdict === 'starved' || a.verdict === 'wait' ? 'mu' : 'wr';
          o('<div class="ad"><div class="adh"><b>' + esc(a.creative_id || '—') + '</b><span class="gt ' + vk + '">' + esc(VA[a.verdict] || a.verdict) + '</span><span class="gt mu">P(win) ' + pct(a.p_win) + '</span></div>'
            + '<div class="adm">' + mnt(a.spend_mnt) + ' (' + n(a.share_pct) + '%) · ' + n(a.impressions).toLocaleString('en-US') + ' impr · hook ' + (has(g.hook_pct) ? g.hook_pct + '%' : '—') + ' · CTR ' + (has(g.ctr_pct) ? g.ctr_pct + '%' : '—') + ' · LPV ' + n(a.lpv) + ' · «Захиалах» ' + n(a.open) + ' · ok ' + n(a.ok) + ' · <b>хаягтай ' + n(a.signups) + '</b> · сонирхол ' + n(a.leads) + (has(a.cps_mnt) ? ' · ' + mnt(a.cps_mnt) + '/хаягтай' : '') + (has(a.addr_share_pct) ? ' · хаягтай ' + n(a.addr_share_pct) + '%' : '') + '</div>'
            + (g.leak ? '<div class="adl">' + esc(g.leak) + '</div>' : '') + '</div>');
        });
        o('</div>');
        o('<p style="font-size:12px;color:var(--ink2);margin:4px 0 0">Зар тус бүрийн тэмдэг зөвхөн мэдээлэл — зарыг дангаар нь бүү унтраа (Meta төсвийг өөрөө хуваарилдаг). WIN/LOSS-ийг <b>бараагаар нийтэд нь</b> дээрх P(win)-ээр шийднэ.</p>');
      }
      o('<p style="font-size:11px;color:var(--mut);margin:6px 0 0">' + esc(RD.rule || '') + '</p>');
    }
    o('<div class="sug ' + cls + '" style="font-size:12px">23 Ad Guard: ' + (k === 'win' ? '🟢 WIN — ' : k === 'lose' ? '🔴 LOSS — ' : '⏳ хүлээ — ')
      + esc(sg.reason || (n(e.hours) < 24 ? 'эхний 24 цагт дүгнэхгүй.' : sg.slug ? 'дүрэм биелээгүй (хангалттай зар/захиалга алга).' : 'зарын зардал (ad_spend) хараахан ороогүй.'))
      + (k === 'win' && has(sg.suggest_qty) ? ' Хятадаас захиалах: ' + n(sg.suggest_qty) + ' ш.' : '') + '</div>');
    o('<div class="launch"><button class="btn g res-b" data-t="' + n(e.test_id) + '" data-r="win" data-n="' + esc(e.name) + '">✓ WIN</button>'
      + '<button class="btn r res-b" data-t="' + n(e.test_id) + '" data-r="loss" data-n="' + esc(e.name) + '">✕ LOSS</button>'
      + '<div class="why"><b>LOSS автомат</b> (хаалт цэвэр · ≥1000 impr · ≥48 цаг · P(win) ≤20%; хог трафик/эвдэрсэн маягт = ДҮГНЭХГҮЙ, LOSS биш) — систем өөрөө хааж, Telegram-аар «Meta дээр зарыг унтраа» гэж хэлнэ. <b>WIN = 1 товч</b> — Telegram-д WIN дохио ирмэгц энд дар. Хаагдмагц бүртгүүлсэн хүмүүст SMS (эсвэл 24ц дотор бичсэн бол чат) автоматаар очно — залгахгүй. Хоёулаа ранк руу суралцаж буцна.</div></div>');
    o('<div class="out" id="out-t' + n(e.test_id) + '"></div></div>');
  });

  // ── 4. ТҮҮХ + СУРАЛЦСАН
  o('<div class="sec"><b>5 · Үр дүн</b><span class="st">ранк суралцана: категори WIN +5 · LOSS −8 · ижил бараа LOSS −30</span></div>');
  if (!HIS.length) o('<div class="em">Дууссан тест алга.</div>');
  else {
    o('<div class="sc2"><table><tr><th>Бараа</th><th>Үр дүн</th><th>Зар</th><th>Захиалга</th><th>1 хүн</th><th>Хаасан</th><th>Мессеж</th><th></th></tr>');
    HIS.forEach((h) => { const oc = h.outcome || {};
      const rs = h.result === 'win' ? '<span class="gt ok">WIN</span>' : h.result === 'loss' ? '<span class="gt no">LOSS</span>' : '<span class="gt mu">гаргасан</span>';
      const act = h.result === 'win' && h.slug && h.mode !== 'live' ? '<button class="btn s pm-b" data-slug="' + esc(h.slug) + '" data-name="' + esc(h.name) + '">▶ Борлуулалт</button>' : (h.mode === 'live' ? '<span class="gt ok">борлуулалтад · ' + n(h.stock_qty) + ' ш</span>' : '');
      o('<tr><td><b>' + esc(h.name) + '</b><div style="font-size:11px;color:var(--mut)">' + esc(h.category || '') + (h.note ? ' · ' + esc(h.note) : '') + '</div></td><td>' + rs + '</td><td>' + mnt(oc.spend_mnt) + '</td><td>' + n(oc.orders) + '</td><td>' + (has(oc.cpa_mnt) ? mnt(oc.cpa_mnt) : '—') + '</td><td>' + day(h.closed_at) + '</td><td>' + (ntf(h.notify) || '—') + '</td><td>' + act + '</td></tr>');
    });
    o('</table></div>');
  }
  const LF = LEARN.filter((l) => n(l.adj) !== 0);
  if (LF.length) o('<p style="font-size:12px;color:var(--ink2);margin:8px 0"><b>Ad-аас суралцсан:</b> ' + LF.map((l) => esc(l.val) + ' ' + (n(l.adj) > 0 ? '+' : '') + n(l.adj) + ' (' + n(l.wins) + '/' + n(l.n) + ' WIN)').join(' · ') + '</p>');
  const CL = (d.creative_learn || {}).by_template || [];
  if (A(CL).length) o('<p style="font-size:12px;color:var(--ink2);margin:8px 0"><b>Hook загвар (3с үзэлт · CTR):</b> ' + A(CL).map((c) => esc(c.template) + ' ' + (has(c.hook_pct) ? c.hook_pct + '%' : '—') + ' · ' + (has(c.ctr_pct) ? c.ctr_pct + '%' : '—')).join(' | ') + '</p>');
  const DM = A(d.demand);
  if (DM.length) o('<p style="font-size:12px;color:var(--ink2);margin:8px 0"><b>Хүмүүс асуусан (манайд алга):</b> ' + DM.map((x) => esc(x.guess || x.text)).join(' · ') + '</p>');
  o('<div class="out" id="out-pm"></div>');

  // ── 6 · ӨГӨГДЛИЙН ШАЛГАЛТ (хуудас өөрөө бодно)
  o('<section class="t2-s"><div class="t2-sh"><h2>6 · Өгөгдлийн шалгалт</h2><p class="t2-why">Ранкийн нотолгоог хуудас бүрт дахин шалгана. Засагдах хүртэл энд харагдана.</p></div><div class="t2-cd t2-dq">'
    + DQ.map((x) => '<div>' + pl(x[0], x[0] === 'ok' ? 'хэвийн' : 'засах') + '<span>' + x[1] + (x[2] ? '<br><em>' + x[2] + '</em>' : '') + '</span><em>' + esc(x[3]) + '</em></div>').join('') + '</div></section>');

  // ── 7 · СИСТЕМ
  o('<section class="t2-s"><div class="t2-sh"><h2>7 · Ранк системд хэрхэн холбогддог вэ</h2><p class="t2-why">Нотолгоо → оноо → таны шийдвэр → тест → үр дүн → оноо дахин суралцана.</p></div><div class="t2-cd t2-sys">'
    + '<div class="t2-col"><div class="t2-lb">Нотолгоо</div><div class="t2-nd"><b>Судлаач · өдөр бүр ' + esc(RS.task_next || '10:07') + '</b>TikTok ≤90 хоног · 1688 зургаар · Монгол 4 эх сурвалж</div>'
    + '<div class="t2-nd"><b>Зарын сан (Ad Library)</b>7 хоног бүр Монголын идэвхтэй зар</div><div class="t2-nd"><b>Таны шалгалт</b>«Би шалгасан / Буруу» · өртөг, үнэ, дэлгүүрийн тоо</div></div>'
    + '<div class="t2-core"><b>Ранк</b><p>Шат бүрт хугацаа, эх сурвалж, итгэлийн түвшин</p><div class="eq">оноо v2 = татах хүч 30 + МН 10 + үнэ цэнэ 20 + эрэлт 15 + ялах 25</div><div class="eq">хатуу хаалга: ≥2.5х өртөг · ≥20k ашиг · ≤30k өртөг</div><div class="eq">бэлэн = 9 нягтлалт · v2 ≥ ' + n((C[0] || {}).v2_min || 55) + '</div></div>'
    + '<div class="t2-col"><div class="t2-lb">Гарц</div><div class="t2-nd"><b>Таны шийдвэр</b>сонгох · дахин судлуулах · татгалзах</div><div class="t2-nd"><b>Тест</b>сайтад ТЕСТ горим, зар, 24 цагийн шалгалт</div>'
    + '<div class="t2-nd"><b>WIN / LOSS</b>ангилал, эх сурвалж, ижил барааны жин өөрчлөгдөнө</div></div></div></section>');
  o('<footer>' + esc(d.rule || '') + '</footer></div>');

  // ── өгөгдөл + үйлдэл: товч бүр = SQL-ийн нэг шилжилт (10b POST action=…)
  o('<script type="application/json" id="TB">' + JSON.stringify({ c: C, free: free }).replace(/</g, '\\u003c') + '</script>');
  o('<script>(' + String(testsClient) + ')();</script></body></html>');
  return P.join('');
}

/* Хуудасны клиент код. String(testsClient)-ээр <script> болж ордог — хуудас шинэчлэгдэх бүрт
   body солигдож энэ дахин ажилладаг тул бүх listener-ийг body доторх элементэд холбоно. */
function testsClient() {
  var U = 'https://starshopping.app.n8n.cloud/webhook/board-data', D = JSON.parse(document.getElementById('TB').textContent), k = '';
  try { k = localStorage.getItem('ss_board_key') || ''; } catch (x) { /* хувийн цонх */ }
  var root = document.getElementById('t2root');
  function e(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function m(v) { return v == null || v === '' ? '—' : Math.round(Number(v)).toLocaleString('en-US') + '₮'; }
  function show(out, html) { if (out) { out.className = 'out on'; out.innerHTML = html; } }
  function post(b, btn, out) {
    if (btn) { btn.disabled = true; btn.dataset.tx = btn.textContent; btn.textContent = '…'; }
    return fetch(U + '?k=' + encodeURIComponent(k), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || 'алдаа'); return j; })
      .catch(function (x) { if (btn) { btn.disabled = false; btn.textContent = btn.dataset.tx; } show(out, '⚠️ ' + e(x.message)); throw x; });
  }
  function reload(ms) { setTimeout(function () { if (window.ssRefresh) window.ssRefresh(); else location.reload(); }, ms || 400); }
  function cand(id) { for (var i = 0; i < D.c.length; i++) if (+D.c[i].find_id === +id) return D.c[i]; return {}; }
  function q(s) { return root.querySelectorAll(s); }

  // ранкийн мөр → нотолгооны самбар
  var rows = q('tr.t2-r');
  rows.forEach(function (tr) {
    tr.addEventListener('click', function (ev) {
      if (ev.target.closest('a,button,input,select')) return;
      rows.forEach(function (x) { x.classList.remove('open'); });
      tr.classList.add('open');
      q('.t2-dp').forEach(function (p) { p.hidden = true; });
      var dp = document.getElementById('dp' + tr.dataset.i);
      if (dp) { dp.hidden = false; if (ev.isTrusted) dp.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  // «Би шалгасан ✓ / Буруу ✗» — шат бүрт (find_owner_action do=verify)
  q('.vf-b').forEach(function (b) {
    b.addEventListener('click', function () {
      var ok = b.dataset.ok === '1', g = b.dataset.g, nt = '';
      if (!ok) { nt = prompt('Юу буруу вэ? (энэ шат маргаашийн судалгааны эхэнд орно)', ''); if (nt === null) return; }
      var out = b.closest('.t2-eg').querySelector('.out') || null;
      post({ action: 'findact', do: 'verify', find_id: +b.dataset.f, gate: g, ok: ok, note: nt, by: 'эзэн' }, b, out)
        .then(function () { b.textContent = ok ? '✓ тэмдэглэлээ' : '✓ дахин судлуулна'; reload(); });
    });
  });
  // Дахин судлуулах (do=rerun, сонгосон шатууд)
  q('.rr-b').forEach(function (b) {
    b.addEventListener('click', function () {
      var box = b.closest('.t2-db'), gs = [];
      box.querySelectorAll('.rr-g').forEach(function (x) { if (x.checked) gs.push(x.value); });
      var out = box.querySelector('.out');
      if (!gs.length) { show(out, 'Дор хаяж нэг шат сонгоно уу.'); return; }
      post({ action: 'findact', do: 'rerun', find_id: +b.dataset.f, gates: gs, note: box.querySelector('.rr-n').value || '', by: 'эзэн' }, b, out)
        .then(function () { show(out, '✓ Маргаашийн судалгааны эхэнд орлоо.'); b.textContent = '✓'; reload(1500); });
    });
  });
  // Татгалзах (do=reject — ранкаас хасна)
  q('.rj-b').forEach(function (b) {
    b.addEventListener('click', function () {
      var box = b.closest('.t2-db'), s = box.querySelector('.rj-s'), out = box.querySelector('.out');
      if (!confirm('«' + b.dataset.n + '»-ийг татгалзаж ранкаас хасах уу? (' + s.options[s.selectedIndex].text + ')')) return;
      post({ action: 'findact', do: 'reject', find_id: +b.dataset.f, reason: s.value, note: box.querySelector('.rj-n').value || '', by: 'эзэн' }, b, out)
        .then(function () { show(out, '✓ Татгалзлаа — ранкаас хасагдана.'); b.textContent = '✓'; reload(1500); });
    });
  });
  // Тестэд сонгох
  q('.sel-b').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!confirm('«' + b.dataset.n + '»-ийг тестэд сонгох уу?')) return;
      post({ action: 'select', find_id: +b.dataset.f, by: 'owner' }, b, document.getElementById('out-sel' + b.dataset.f))
        .then(function () { b.textContent = '✓ сонгогдлоо'; reload(); });
    });
  });
  // Үнэ тогтоох
  q('.prc-b').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = prompt('Зарах үнэ (₮). Хоосон = системийн санал руу буцаах:', b.dataset.p); if (v === null) return;
      v = String(v).replace(/[^0-9]/g, ''); var nt = v ? (prompt('Шалтгаан (заавал биш):', '') || '') : '';
      post({ action: 'price', find_id: +b.dataset.f, price_mnt: v ? +v : null, note: nt }, b, document.getElementById('out-prc' + b.dataset.f))
        .then(function () { b.textContent = '✓ хадгаллаа'; reload(); });
    });
  });
  // Өртөг засах (1688 барааны ¥ + Хятад доторх хүргэлт + жин + offer)
  q('.cost-b').forEach(function (b) {
    b.addEventListener('click', function () {
      var c = cand(b.dataset.f);
      var v = prompt('1688 дээрх ЗӨВ SKU-ийн БАРААНЫ үнэ (¥, хүргэлтгүй):', c.cn_item_cny == null ? (c.cn_price == null ? '' : c.cn_price) : c.cn_item_cny); if (v === null) return;
      v = String(v).replace(',', '.').replace(/[^0-9.]/g, ''); if (!v || !(+v > 0)) { alert('Тоо оруулна уу'); return; }
      var sh = prompt('Хятад доторх хүргэлт (¥) — 1688 «Order» дараад гарсан Shipping fee − хямдрал:', c.cn_ship_checked ? c.cn_ship_cny : ''); if (sh === null) return;
      sh = String(sh).replace(',', '.').replace(/[^0-9.]/g, '');
      var w = prompt('Жин (грамм) — мэдэхгүй бол хоосон орхи:', c.weight_g || ''); if (w === null) return; w = String(w).replace(/[^0-9]/g, '');
      var u = prompt('1688 offer холбоос (өөрчлөхгүй бол хэвээр):', c.cn_offer_url || ''); if (u === null) return; u = String(u).trim();
      var nt = prompt('Тэмдэглэл (заавал биш):', '') || '', o = document.getElementById('out-cost' + b.dataset.f);
      post({ action: 'cost', find_id: +b.dataset.f, cn_price: +v, cn_ship_cny: sh === '' ? null : +sh, weight_g: w ? +w : null, cn_offer_url: (u && u !== c.cn_offer_url) ? u : null, note: nt, by: 'эзэн' }, b, o)
        .then(function (j) {
          show(o, '✓ Хадгаллаа · нийт ¥' + e(j.prev_cn) + ' → ¥' + e(j.cn_total) + ' (бараа ¥' + e(j.cn_item) + ' + хүргэлт ¥' + e(j.cn_ship) + ') · шинэ оноо <b>' + e(j.score) + '</b> · ' + e(j.verdict || '')
            + '<br><button class="btn s" onclick="window.ssRefresh?ssRefresh():location.reload()">Rank шинэчлэх</button>');
          b.textContent = '✓';
        });
    });
  });
  // МН-д хэдэн дэлгүүр зарж байна (mn_market_set)
  q('.mnc-b').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = prompt('Монголд энэ барааг хэдэн дэлгүүр/зарын сайт зарж байна вэ? (0 = байхгүй, 3+ = түгээмэл)', '3'); if (v === null) return;
      var ex = prompt('Жишээ (дэлгүүрийн нэр/холбоос, заавал биш):', '') || '';
      post({ action: 'mncommon', find_id: +b.dataset.f, mn_common: +v || 0, examples: ex ? [ex] : [], by: 'эзэн' }, b, document.getElementById('out-mnc' + b.dataset.f))
        .then(function () { b.textContent = '✓ хадгаллаа'; reload(); });
    });
  });

  // ── тест бэлтгэл · үнэлгээ · түүх (өмнөх логик хэвээр)
  q('.stp-b').forEach(function (b) { b.addEventListener('click', function () { post({ action: 'step', test_id: +b.dataset.t, step: +b.dataset.s, status: b.dataset.st, by: 'owner' }, b, document.getElementById('out-t' + b.dataset.t)).then(function () { b.textContent = '✓'; reload(250); }); }); });
  q('.pt-b').forEach(function (b) { b.addEventListener('click', function () { post({ action: 'step', test_id: +b.dataset.t, key: b.dataset.k, status: b.dataset.d, by: 'owner' }, b, document.getElementById('out-t' + b.dataset.t)).then(function () { b.textContent = '✓'; reload(250); }); }); });
  q('.lau-b').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!confirm('«' + b.dataset.n + '» — зар явуулсан уу? Бараа Тестээс Үнэлгээ рүү шилжинэ.')) return;
      var out = document.getElementById('out-t' + b.dataset.t);
      post({ action: 'launch', test_id: +b.dataset.t, by: 'owner' }, b, out).then(function (j) { show(out, '🚀 ' + e(j.next || '') + '<br><button class="btn s" onclick="location.reload()">Шинэчлэх</button>'); b.textContent = '✓ Үнэлгээнд'; });
    });
  });
  q('.drop-b').forEach(function (b) {
    b.addEventListener('click', function () {
      var nt = prompt('«' + b.dataset.n + '»-ийг тестээс гаргах шалтгаан?'); if (nt === null) return;
      post({ action: 'drop', test_id: +b.dataset.t, note: nt, by: 'owner' }, b, document.getElementById('out-t' + b.dataset.t)).then(function () { reload(); });
    });
  });
  q('.res-b').forEach(function (b) {
    b.addEventListener('click', function () {
      var r = b.dataset.r, nt = prompt('«' + b.dataset.n + '» → ' + (r === 'win' ? 'WIN' : 'LOSS') + '. Тэмдэглэл (заавал биш):'); if (nt === null) return;
      var out = document.getElementById('out-t' + b.dataset.t);
      post({ action: 'result', test_id: +b.dataset.t, result: r, note: nt, by: 'owner' }, b, out).then(function (j) {
        var h = '<b>' + e(j.product) + ' → ' + (j.result === 'win' ? 'WIN 🟢' : 'LOSS 🔴') + '</b> · зар ' + m(j.spend_mnt) + ' · захиалга ' + (j.orders || 0) + '<br>' + e(j.next || '');
        var M = j.mode || {}, L = M.call_list || M.sorry_list || [];
        h += '<br>📩 Бүртгүүлсэн хүмүүст ' + (j.result === 'win' ? '«~14 хоногт хүргэнэ»' : 'уучлалтын') + ' мессеж автоматаар дараалалд орлоо (SMS — Mac, чат — 24ц дотор). Залгах шаардлагагүй.';
        if (L.length) h += '<br><br><b>Мессеж очих хүмүүс (' + L.length + ')</b><br>' + L.map(function (x) { return e(x.phone) + (x.name ? ' · ' + e(x.name) : '') + ' · ' + e(x.qty) + 'ш'; }).join('<br>');
        h += '<br><button class="btn s" onclick="location.reload()">Шинэчлэх</button>';
        show(out, h); b.textContent = '✓';
      });
    });
  });
  q('.pm-b').forEach(function (b) {
    b.addEventListener('click', function () {
      var qn = prompt('«' + b.dataset.name + '» агуулахад хэдэн ширхэг тоолж авсан бэ?'); if (qn === null) return;
      qn = parseInt(qn, 10); if (!(qn >= 0)) { alert('Тоо оруулна уу'); return; }
      var out = document.getElementById('out-pm');
      post({ action: 'mode', slug: b.dataset.slug, mode: 'live', stock_qty: qn, by: 'owner' }, b, out).then(function (j) {
        var L = j.call_list || [], h = '<b>' + e(j.product) + ' → борлуулалт</b><br>' + e(j.next || '');
        if (j.short > 0) h += '<br>⚠️ ' + j.short + ' ш ДУТУУ — нэмж захиал!';
        if (L.length) h += '<br><br><b>Залгах (' + L.length + ')</b><br>' + L.map(function (x) { return e(x.phone) + (x.name ? ' · ' + e(x.name) : '') + ' · ' + e(x.qty) + 'ш'; }).join('<br>');
        if (j.script) h += '<br><b>Хэлэх үг:</b><textarea readonly>' + e(j.script) + '</textarea>';
        h += '<br><button class="btn s" onclick="location.reload()">Шинэчлэх</button>';
        show(out, h); b.textContent = '✓';
      });
    });
  });
}
