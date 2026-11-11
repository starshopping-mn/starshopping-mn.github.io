/* Самбар · ХҮРЭЭНИЙ ХАМГААЛАЛТ (блок FL, 2026-11-07 — эзэн «хийснээ мартахгүйн тулд самбар дээр нүдэнд харагдахаар, Claude ч уншихад амар»)
   Өгөгдөл: ?view=reach → board_read view 'reach' → reach_board(p) (≈0.7с, n8n зарцуулахгүй).
   Систем: WF18 (3 цаг тутам) Meta-гаас ad set бүрийн нийт/өчигдрийн reach → adset_reach_day;
           reach_guard() — 9 дохио; reach_guard_tick() 10:30 УБ → reach_guard_log + Telegram;
           WF43 10:40 УБ → автомат засвар (жагсаалт шинэчлэх; 11/10-аас хасалт нэмэх); засвар бүр 72ц дараа дүгнэгдэнэ.
   Энэ хуудас зөвхөн УНШИНА — юу ч өөрчлөхгүй. */
function renderReach(DATA, QUERY) {
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
  const pct = (v, dg) => (has(v) ? (Math.round(n(v) * 100 * Math.pow(10, dg || 0)) / Math.pow(10, dg || 0)) + '%' : '—');
  const num = (v, dg) => (has(v) ? (Math.round(n(v) * Math.pow(10, dg || 0)) / Math.pow(10, dg || 0)).toLocaleString('en-US') : '—');
  const cfg = (k) => (d.cfg && d.cfg[k] ? n(d.cfg[k].v) : null);

  const LV = { ok: ['ok', 'Хэвийн', '🟢'], y: ['wr', 'Анхаар', '🟡'], r: ['cr', 'Яаралтай', '🔴'], na: ['nt', 'Өгөгдөл хүрэлцээгүй', '⚪'] };
  const lv = (k) => LV[k] || LV.na;

  // Дохио бүрийг эзэнд ойлгомжтой хэлбэрээр: утга, суурь, босго, юу гэсэн үг вэ
  const SIG = {
    new_share: { t: 'Шинэ хүний хувь', u: (s) => pct(s.v), base: () => 'Босго: ' + pct(cfg('new_share_y')) + ' / ' + pct(cfg('new_share_r')), what: 'Зар харсан хүмүүсийн хэд нь анх удаа харсан бэ. Буурах нь Meta ижил хүмүүст давтан үзүүлж байна гэсэн үг.' },
    cost_new: { t: '1000 шинэ хүний өртөг', u: (s) => (has(s.v) ? '$' + num(s.v, 2) : '—'), base: (s) => 'Эхний 7 өдөрт $' + num(s.base, 2), what: 'Шинэ хүн олох үнэ. Өсөх нь хүрээгүй хүн цөөрч байна гэсэн үг.' },
    freq7: { t: '7 хоногийн давтамж', u: (s) => num(s.v, 2), base: () => 'Босго: ' + num(cfg('freq7_y'), 1) + ' / ' + num(cfg('freq7_r'), 1), what: 'Нэг хүн 7 хоногт хэдэн удаа харсан бэ (Meta).' },
    pace: { t: 'Төсөв зарцуулалт', u: (s) => pct(s.v), base: () => 'Босго: ' + pct(cfg('pace_y')) + ' / ' + pct(cfg('pace_r')), what: 'Өдрийн төсвийн хэдэн хувийг Meta зарцуулж чадсан бэ. Бага бол хүргэх хүнээ олохгүй байна.' },
    ctr_decay: { t: 'Бичлэгийн CTR уналт', u: (s) => (has(s.v) ? '−' + pct(s.v) : '—'), base: () => 'Босго: −' + pct(cfg('ctr_drop_y')) + ' / −' + pct(cfg('ctr_drop_r')), what: 'Бичлэг бүрийн линк дарах хувь эхний 3 өдөртэйгээ харьцуулахад. Их унах нь бичлэг хуучирсан гэсэн үг.' },
    hygiene: { t: 'Хасалт ба жагсаалт', u: (s) => (s.lvl === 'ok' ? 'Бүрэн' : s.lvl === 'na' ? '—' : 'Дутуу'), base: () => 'Худалдан авагч · татгалзагч · pixel', what: 'Худалдан авсан болон хаалган дээр татгалзсан хүмүүс рүү зар явахгүй байх ёстой.' }
  };
  const FIX = {
    fresh_audience: ['Шинэ хүн цөөрч байна', 'Шинэ reel тавих; бараа ирэхэд бүх Монгол руу тэлэх'],
    new_creative: ['Бичлэг хуучирсан', 'Шинэ reel тавина уу — Claude тухайн ad set-д зар болгон нэмнэ (төсөв хэвээр)'],
    audience_quality: ['Хүрч буй хүмүүс авахгүй байна', 'Аудитор, сайтын маягт, чатыг шалгах'],
    leak_calls: ['Захиалга хүргэгдэхгүй байна', 'Хаяггүй / утсаа аваагүй захиалгууд руу залгах'],
    pace: ['Төсөв зарцуулагдахгүй байна', 'Аудитор хэт явцуу — тэлэх'],
    list_refresh: ['Жагсаалт шинэчлэх', 'Шинэ утсыг Meta жагсаалтад нэмэх'],
    add_exclusions: ['Хасалт нэмэх', 'Ad set-д дутуу хасалт нэмэх'],
    manual: ['Таны зөвшөөрлөөр хийсэн өөрчлөлт', '']
  };
  const MODE = { auto: ['bl', 'Автомат'], report: ['wr', 'Санал'], owner: ['nt', 'Таны шийдвэр'] };
  const STATUS = { planned: 'Хүлээгдэж буй', done: 'Хийгдсэн', failed: 'Бүтэлгүйтсэн', skipped: 'Алгассан', reverted: 'Буцаасан', reported: 'Танд мэдэгдсэн' };
  const VERD = { better: ['ok', '✅ Сайжирсан'], same: ['nt', '➖ Өөрчлөлтгүй'], worse: ['cr', '❌ Муудсан → буцаах санал'], 'n/a': ['nt', '⚪ Дүгнэх боломжгүй'] };
  const AUDK = { pixel_excl: 'Pixel худалдан авагч', b_refusers: 'Хаалган дээр татгалзсан', buyers_all: 'Бүх худалдан авагч', product_buyers: 'Барааны худалдан авагч', lal: 'Ижил төстэй (LAL)', rt_vc: 'Сайт үзсэн (RT)', rt_page: 'Хуудас (RT)', video_viewers: 'Бичлэг үзсэн 3с+' };

  const out = [];
  const o = (s) => out.push(s);

  const CSS = '.w{max-width:1200px;margin:0 auto;padding:14px 16px 60px}'
    + '.nav{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 6px}.nav a{padding:8px 14px;border-radius:999px;border:1px solid var(--ln);background:var(--s1);color:var(--ink2);text-decoration:none;font-size:13px;font-weight:600}.nav a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
    + '.rg{display:flex;flex-direction:column;gap:22px;margin-top:10px}'
    + '.rg .nm{font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}'
    + '.rg .cd{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:18px 20px;min-width:0;display:flex;flex-direction:column;gap:12px}'
    + '.rg .lb{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}'
    + '.rg .sb{font-size:12.5px;color:var(--ink2);line-height:1.45}.rg .mu{color:var(--mut)}'
    + '.rg .h{margin:0;font-size:18px;font-weight:700;color:var(--ink);letter-spacing:0;text-transform:none}.rg .h:after{display:none}'
    + '.rg .hr{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px}'
    + '.rg .pl{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap;align-self:flex-start}'
    + '.rg .pl.ok{background:var(--good-a);color:var(--good)}.rg .pl.wr{background:var(--warn-a);color:var(--warn)}.rg .pl.cr{background:var(--crit-a);color:var(--crit)}.rg .pl.bl{background:var(--blue-a);color:var(--f3)}.rg .pl.nt{background:var(--s2);color:var(--ink2)}'
    + '.rg .ban{display:flex;flex-wrap:wrap;align-items:flex-start;gap:14px;padding:16px 18px;border-radius:14px;background:var(--s2);border:1px solid var(--ln2)}.rg .ban.ok{background:var(--good-a)}.rg .ban.wr{background:var(--warn-a)}.rg .ban.cr{background:var(--crit-a)}'
    + '.rg .ban .tx{flex:1 1 380px;font-size:14.5px;line-height:1.55;color:var(--ink)}'
    + '.rg .meta{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:12.5px;color:var(--ink2)}.rg .meta b{color:var(--ink);font-weight:600}'
    + '.rg .todo{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:10px}'
    + '.rg .todo .cd{gap:6px;padding:14px 16px;border-left:4px solid var(--warn)}.rg .todo .cd.cr{border-left-color:var(--crit)}'
    + '.rg .todo .tt{font-size:14.5px;font-weight:650;color:var(--ink)}'
    + '.rg .sig{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}@media(max-width:980px){.rg .sig{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.rg .sig{grid-template-columns:minmax(0,1fr)}}'
    + '.rg .tile .sh{display:flex;justify-content:space-between;align-items:center;gap:8px}.rg .tile{border:1px solid var(--ln);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;background:var(--bg);min-width:0;position:relative}'
    + '.rg .tile:before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;background:var(--ln2)}'
    + '.rg .tile.ok:before{background:var(--good)}.rg .tile.wr:before{background:var(--warn)}.rg .tile.cr:before{background:var(--crit)}'
    + '.rg .tile .sv{font-size:26px;font-weight:650;line-height:1.05;color:var(--ink)}'
    + '.rg .tile .st{font-size:12.5px;font-weight:650;color:var(--ink2)}'
    + '.rg .ctrs{display:flex;flex-direction:column;gap:7px;margin-top:2px}'
    + '.rg .ctr{display:grid;grid-template-columns:34px minmax(0,1fr) 92px;gap:8px;align-items:center;font-size:12.5px}'
    + '.rg .bar{height:8px;background:var(--s2);border-radius:999px;overflow:hidden;position:relative}.rg .bar i{display:block;height:100%;border-radius:999px;background:var(--ink2)}.rg .bar i.ok{background:var(--good)}.rg .bar i.wr{background:var(--warn)}.rg .bar i.cr{background:var(--crit)}'
    + '.rg .kvg{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(170px,100%),1fr));gap:10px}'
    + '.rg .kvg>div{border-top:1px solid var(--ln3);padding-top:8px;display:flex;flex-direction:column;gap:2px}.rg .kvg .kk{font-size:12px;color:var(--mut)}.rg .kvg .kx{font-size:18px;font-weight:650;color:var(--ink)}'
    + '.rg .chart{width:100%;height:auto;display:block}'
    + '.rg .lg{display:flex;flex-wrap:wrap;gap:14px;font-size:12.5px;color:var(--ink2)}.rg .lg i{display:inline-block;width:14px;height:3px;border-radius:2px;vertical-align:middle;margin-right:6px}.rg .lg i.bx{height:10px;width:10px;border-radius:2px}'
    + '.rg .tln{display:flex;flex-direction:column}'
    + '.rg .ev{display:grid;grid-template-columns:96px minmax(0,1fr);gap:12px;padding:12px 0;border-top:1px solid var(--ln3)}.rg .ev:first-child{border-top:0}'
    + '.rg .ev .when{font-size:12.5px;color:var(--mut);line-height:1.4}.rg .ev .what{display:flex;flex-direction:column;gap:5px;min-width:0}'
    + '.rg .ev .evr{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.rg .ev .tt{font-size:14px;font-weight:650;color:var(--ink)}'
    + '.rg .cmp{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;color:var(--ink2)}.rg .cmp b{color:var(--ink);font-weight:600}'
    + '.rg .tbl{width:100%;border-collapse:collapse;font-size:13px}.rg .tbl th{text-align:left;font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--mut);padding:8px 10px;border-bottom:1px solid var(--ln)}.rg .tbl td{padding:9px 10px;border-bottom:1px solid var(--ln3);vertical-align:top;color:var(--ink)}.rg .tbl td.r{text-align:right}'
    + '.rg .scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}'
    + '.rg .pl{animation:none;transform:none}'   // GQ: board.css-ийн .pl (icon анимейшн) пиллийг анивчуулдаг байсан
    + '.rg .rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:10px}.rg .rules .cd{gap:6px;padding:14px 16px}'
    + '.rg details{border:1px solid var(--ln);border-radius:12px;background:var(--s1);padding:12px 16px}.rg summary{cursor:pointer;font-weight:650;font-size:14px;color:var(--ink)}'
    + '.rg .days{display:flex;gap:6px;flex-wrap:wrap}.rg .days span{display:inline-flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;color:var(--mut);min-width:36px}'
    + '@media(max-width:860px){.rg .cd{padding:15px 14px}.rg .ev{grid-template-columns:minmax(0,1fr)}.rg .tile .sv{font-size:23px}}'
    + 'footer{margin:26px 0 10px;font-size:12px;color:var(--mut)}';

  o('<!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Starshopping · Хүрээ</title><style>' + CSS + '</style></head><body><div class="w">');
  o('<header><div class="hd"><div class="bm">S</div><div><div class="bt">Starshopping</div>');
  o('<div class="bs">хүрээний хамгаалалт · ' + esc(mdhm(d.generated_at)) + ' УБ</div></div>');
  o('<div class="sp"></div><a class="rf" href="">Шинэчлэх</a></div></header>');
  o(typeof ssNav === 'function' ? ssNav('reach', themeQ) : '');

  const G = d.guard || {};
  const P = A(G.products);
  if (!d.ok) {
    o('<div class="rg"><div class="ban cr"><div class="tx"><b>Хүрээний өгөгдөл ирсэнгүй.</b> Supabase-д <code>2026-11-07-FL-reach-board-PASTE.sql</code>-ийг ажиллуулаагүй байж магадгүй.</div></div></div></div></body></html>');
    return out.join('');
  }

  const T = d.last_tick || {};
  const S = d.schedule || {};
  const acts = A(d.actions);
  const todayActs = acts.filter((a) => a.as_of === d.ub_date);
  const proposals = todayActs.filter((a) => a.mode === 'report');
  const evals = acts.filter((a) => a.eval_at && !a.verdict && a.status === 'done');
  const L = lv(G.lvl);
  const pname = (id) => { const pp = P.find((x) => x.product_id === id); return pp ? String(pp.name).split(' · ')[0] : 'Бүх бараа'; };

  o('<div class="rg">');

  // ── 1. Дүгнэлт
  const badSig = [];
  P.forEach((p) => {
    A(p.adsets).forEach((a) => A(a.signals).forEach((s) => { if (s.lvl === 'y' || s.lvl === 'r') badSig.push(s); }));
    ['demand', 'conv', 'leak'].forEach((k) => { if (p[k] && (p[k].lvl === 'y' || p[k].lvl === 'r')) badSig.push(p[k]); });
  });
  const reds = badSig.filter((s) => s.lvl === 'r').length;
  const yels = badSig.filter((s) => s.lvl === 'y').length;
  o('<section class="ban ' + L[0] + '" aria-label="Өнөөдрийн дүгнэлт"><span class="pl ' + L[0] + '">' + L[2] + ' ' + L[1] + '</span><div class="tx">'
    + (G.lvl === 'ok' ? '<b>Бүх зар хэвийн.</b> Meta шинэ хүмүүст хүрч, бичлэгүүд ажиллаж байна.'
      : '<b>' + (reds ? reds + ' улаан' : '') + (reds && yels ? ', ' : '') + (yels ? yels + ' шар' : '') + ' дохио.</b> '
        + (proposals.length ? 'Доорх «Таны шийдэх зүйл»-ийг харна уу — үлдсэнийг систем өөрөө хийнэ.' : 'Систем өөрөө засварлаж байна.'))
    + '<div class="meta" style="margin-top:8px"><span>Сүүлийн шалгалт <b>' + esc(mdhm(T.created_at)) + '</b>' + (T.sent_at ? ' · Telegram илгээсэн' : '') + '</span>'
    + '<span>Дараагийн шалгалт <b>' + esc(mdhm(S.tick)) + '</b></span><span>Автомат засвар <b>' + esc(mdhm(S.fix)) + '</b></span>'
    + '<span>Meta өгөгдөл ' + (T.fresh === false ? '<b style="color:var(--crit)">хуучирсан</b>' : '<b>шинэ</b> (3 цаг тутам)') + '</span></div></div></section>');

  // ── 1б. Ирэх 7 хоногийн таамаг (блок GQ, 2026-11-11) — outlook.js
  if (typeof ssOutlook === 'function' && d.outlook) o('<section aria-label="Ирэх 7 хоногийн таамаг">' + ssOutlook(d.outlook, 'full', themeQ) + '</section>');

  // ── 2. Таны шийдэх зүйл
  if (proposals.length || evals.length) {
    o('<section aria-label="Таны шийдэх зүйл" style="display:flex;flex-direction:column;gap:12px"><div class="hr"><h2 class="h">Таны шийдэх зүйл</h2><span class="sb">Систем эдгээрийг өөрөө хийхгүй — таны шийдвэр хэрэгтэй</span></div><div class="todo">');
    proposals.forEach((a) => {
      const f = FIX[a.kind] || [a.kind, ''];
      const sigLvl = a.kind === 'new_creative' ? 'cr' : '';
      o('<article class="cd ' + sigLvl + '"><div class="hr"><span class="lb">' + esc(pname(a.product_id)) + '</span><span class="pl ' + MODE.report[0] + '">' + MODE.report[1] + '</span></div>'
        + '<div class="tt">' + esc(f[1] || f[0]) + '</div><div class="sb">' + esc(f[0]) + ' — ' + esc(a.reason || '') + '</div></article>');
    });
    evals.forEach((a) => {
      o('<article class="cd" style="border-left-color:var(--f3)"><div class="hr"><span class="lb">72 цагийн дүгнэлт</span><span class="pl bl">' + esc(mdhm(a.eval_at)) + '</span></div>'
        + '<div class="tt">' + esc(a.note || (FIX[a.kind] || [a.kind])[0]) + '</div><div class="sb">Үр дүнг систем өөрөө хэмжиж, муудсан бол буцаах санал гаргана. Танаас одоо юу ч шаардлагагүй.</div></article>');
    });
    o('</div></section>');
  }

  // ── 3. Бараа бүрээр: дохионууд
  P.forEach((p) => {
    const PL = lv(p.lvl);
    o('<section class="cd" aria-label="' + esc(p.name) + '">');
    o('<div class="hr"><div><div class="lb">Бараа</div><h2 class="h">' + esc(p.name) + '</h2></div><span class="pl ' + PL[0] + '">' + PL[2] + ' ' + PL[1] + '</span></div>');

    // бараа түвшний 3 тоо
    const dm = p.demand || {}, cv = p.conv || {}, lk = p.leak || {};
    o('<div class="kvg">');
    o('<div><span class="kk">Бодит шинэ захиалга / өдөр</span><span class="kx nm">' + num(dm.v, 1) + ' <span class="sb mu">өмнө ' + num(dm.base, 1) + '</span></span><span class="pl ' + lv(dm.lvl)[0] + '">' + lv(dm.lvl)[2] + ' ' + (has(dm.drop) ? (n(dm.drop) > 0 ? '−' : '+') + pct(Math.abs(n(dm.drop))) : lv(dm.lvl)[1]) + '</span></div>');
    o('<div><span class="kk">1000 шинэ хүнд ногдох захиалга</span><span class="kx nm">' + num(cv.v, 2) + ' <span class="sb mu">өмнө ' + num(cv.base, 2) + '</span></span><span class="pl ' + lv(cv.lvl)[0] + '">' + lv(cv.lvl)[2] + ' ' + (has(cv.drop) ? (n(cv.drop) > 0 ? '−' : '+') + pct(Math.abs(n(cv.drop))) : lv(cv.lvl)[1]) + '</span></div>');
    o('<div><span class="kk">Хүргэгдсэн (4–10 хоногийн өмнөх ' + num(lk.n) + ' захиалга)</span><span class="kx nm">' + pct(lk.a_share) + ' <span class="sb mu">C ' + pct(lk.c_share) + ' · B ' + num(lk.b) + '</span></span><span class="pl ' + lv(lk.lvl)[0] + '">' + lv(lk.lvl)[2] + ' ' + lv(lk.lvl)[1] + '</span></div>');
    o('</div>');

    A(p.adsets).forEach((a) => {
      const AL = lv(a.lvl);
      o('<div class="hr" style="margin-top:6px"><div class="sb"><b style="color:var(--ink)">' + esc(a.name) + '</b> · ' + (a.role === 'rt' ? 'дахин чиглүүлэх' : 'шинэ хүн хайх') + ' · $' + num(a.budget_usd, 0) + '/өдөр</div><span class="pl ' + AL[0] + '">' + AL[2] + ' ' + AL[1] + '</span></div>');
      o('<div class="sig">');
      A(a.signals).forEach((s) => {
        const m = SIG[s.k] || { t: s.label || s.k, u: (x) => num(x.v, 2), base: () => '', what: '' };
        const SL = lv(s.lvl);
        o('<div class="tile ' + SL[0] + '"><div class="sh"><span class="st">' + esc(m.t) + '</span><span title="' + esc(SL[1]) + '">' + SL[2] + '</span></div>'
          + '<div class="sv nm">' + esc(m.u(s)) + '</div><div class="sb mu">' + esc(m.base(s)) + '</div>');
        if (s.k === 'ctr_decay' && A(s.ads).length) {
          o('<div class="ctrs">');
          A(s.ads).forEach((x) => {
            const code = String(x.creative || '').replace(/^.*-(r\d+)$/, '$1');
            const w = Math.max(4, Math.min(100, (n(x.ctr) / Math.max(n(x.ctr_base), 0.01)) * 100));
            o('<div class="ctr"><b>' + esc(code) + '</b><div class="bar" title="' + num(x.ctr, 2) + '% ← ' + num(x.ctr_base, 2) + '%"><i class="' + lv(x.lvl)[0] + '" style="width:' + w.toFixed(0) + '%"></i></div><span class="nm sb">' + num(x.ctr, 1) + '% ← ' + num(x.ctr_base, 1) + '%</span></div>');
          });
          o('</div>');
        }
        if (s.k === 'hygiene') {
          A(s.missing).forEach((x) => o('<div class="sb" style="color:var(--crit)">Дутуу: ' + esc(x.name || x.kind) + '</div>'));
          A(s.stale).forEach((x) => o('<div class="sb" style="color:var(--warn)">' + num(x.pending) + ' утас жагсаалтад ороогүй</div>'));
        }
        o('<div class="sb">' + esc(m.what) + '</div></div>');
      });
      o('</div>');
    });

    // ── чиг хандлага (21 хоног)
    const TR = A((d.trend || {})[p.product_id]);
    if (TR.length >= 2) {
      const W = 720, H = 220, L0 = 40, R0 = 40, T0 = 14, B0 = 30;
      const iw = W - L0 - R0, ih = H - T0 - B0;
      const x = (i) => L0 + (TR.length === 1 ? iw / 2 : (i / (TR.length - 1)) * iw);
      const maxO = Math.max(4, ...TR.map((r) => n(r.orders)));
      const maxP = Math.max(5, ...TR.map((r) => n(r.ctr)));          // CTR % (зүүн тэнхлэг 0..maxP)
      const yP = (v) => T0 + ih - (Math.min(100, n(v)) / 100) * ih;  // шинэ хүн 0..100%
      const yC = (v) => T0 + ih - (n(v) / maxP) * ih;
      const bw = Math.max(6, Math.min(22, iw / TR.length * 0.55));
      let svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="21 хоногийн чиг хандлага: шинэ хүний хувь, CTR, шинэ захиалга">';
      [0, 25, 50, 75, 100].forEach((g) => { svg += '<line x1="' + L0 + '" x2="' + (W - R0) + '" y1="' + yP(g) + '" y2="' + yP(g) + '" stroke="var(--ln3)"/><text x="' + (L0 - 6) + '" y="' + (yP(g) + 4) + '" text-anchor="end" font-size="10" fill="var(--mut)">' + g + '%</text>'; });
      // босго (шинэ хүн, шар)
      if (has(cfg('new_share_y'))) svg += '<line x1="' + L0 + '" x2="' + (W - R0) + '" y1="' + yP(cfg('new_share_y') * 100) + '" y2="' + yP(cfg('new_share_y') * 100) + '" stroke="var(--warn)" stroke-dasharray="4 4" opacity=".8"/><text x="' + (L0 + 4) + '" y="' + (yP(cfg('new_share_y') * 100) + 13) + '" text-anchor="start" font-size="10" fill="var(--warn)">босго ' + pct(cfg('new_share_y')) + '</text>';
      // захиалга — багана (баруун тэнхлэг)
      TR.forEach((r, i) => { const hh = (n(r.orders) / maxO) * ih * 0.9; svg += '<rect x="' + (x(i) - bw / 2).toFixed(1) + '" y="' + (T0 + ih - hh).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="2" fill="var(--ln2)"><title>' + md(r.d) + ': ' + n(r.orders) + ' шинэ захиалга</title></rect>'; });
      svg += '<text x="' + (W - R0 + 6) + '" y="' + (T0 + 8) + '" font-size="10" fill="var(--mut)">' + maxO + '</text><text x="' + (W - R0 + 6) + '" y="' + (T0 + ih + 4) + '" font-size="10" fill="var(--mut)">0</text>';
      const line = (key, yf, col) => { const pts = TR.map((r, i) => (has(r[key]) ? x(i).toFixed(1) + ',' + yf(key === 'new_share' ? n(r[key]) * 100 : r[key]).toFixed(1) : null)); let dd = '', pen = false; pts.forEach((p2) => { if (p2) { dd += (pen ? ' L' : ' M') + p2; pen = true; } else pen = false; }); return '<path d="' + dd + '" fill="none" stroke="' + col + '" stroke-width="2.2" stroke-linejoin="round"/>' + TR.map((r, i) => (has(r[key]) ? '<circle cx="' + x(i).toFixed(1) + '" cy="' + yf(key === 'new_share' ? n(r[key]) * 100 : r[key]).toFixed(1) + '" r="3" fill="' + col + '"><title>' + md(r.d) + ': ' + (key === 'new_share' ? pct(r[key]) + ' шинэ хүн' : num(r[key], 2) + '% CTR') + '</title></circle>' : '')).join(''); };
      svg += line('new_share', yP, 'var(--f3)');
      svg += line('ctr', yC, 'var(--gold)');
      // өөрчлөлтийн тэмдэг (эзний/автомат засвар)
      acts.filter((a) => a.product_id === p.product_id && (a.kind === 'manual' || a.kind === 'add_exclusions') && a.status === 'done').forEach((a) => {
        const dd2 = String(ub(a.done_at)).slice(0, 10); let idx = TR.findIndex((r) => r.d >= dd2); const xx = idx < 0 ? W - R0 : x(idx);
        svg += '<line x1="' + xx.toFixed(1) + '" x2="' + xx.toFixed(1) + '" y1="' + T0 + '" y2="' + (T0 + ih) + '" stroke="var(--crit)" stroke-dasharray="2 3"/><text x="' + (xx - 4).toFixed(1) + '" y="' + (T0 + 10) + '" text-anchor="end" font-size="10" fill="var(--crit)">' + md(dd2) + ' өөрчлөлт</text>';
      });
      TR.forEach((r, i) => { if (TR.length <= 12 || i % 2 === 0 || i === TR.length - 1) svg += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="10" fill="var(--mut)">' + md(r.d) + '</text>'; });
      svg += '</svg>';
      o('<div style="display:flex;flex-direction:column;gap:8px;margin-top:4px"><div class="hr"><span class="lb">Сүүлийн 21 хоног (зартай өдрүүд)</span><span class="lg"><span><i style="background:var(--f3)"></i>Шинэ хүний хувь</span><span><i style="background:var(--gold)"></i>CTR (0–' + num(maxP, 0) + '%)</span><span><i class="bx" style="background:var(--ln2)"></i>Шинэ захиалга</span></span></div>'
        + '<div class="scroll">' + svg + '</div><div class="sb mu">Шинэ хүний хувь ба CTR хамт буурвал Meta ижил хүмүүст давтан үзүүлж байна гэсэн үг (10/30–11/06-нд хамаарал 0.61). Улаан тасархай зураас — зар дээр хийсэн өөрчлөлт.</div></div>');
    }
    o('</section>');
  });

  // ── 4. Засварын бүртгэл
  o('<section class="cd" aria-label="Засварын бүртгэл"><div class="hr"><h2 class="h">Засварын бүртгэл</h2><span class="sb">30 хоног · засвар бүр 72 цагийн дараа дүгнэгдэнэ</span></div>');
  if (!acts.length) o('<div class="sb mu">Одоохондоо засвар алга.</div>');
  else {
    o('<div class="tln">');
    acts.forEach((a) => {
      const f = FIX[a.kind] || [a.kind, ''];
      const M = MODE[a.mode] || ['nt', a.mode];
      const st = a.status === 'failed' ? ['cr', STATUS.failed] : a.status === 'done' ? ['ok', STATUS.done] : a.status === 'planned' ? ['wr', STATUS.planned] : ['nt', STATUS[a.status] || a.status];
      const title = a.kind === 'manual' ? (a.note || f[0]) : a.kind === 'list_refresh' ? '«' + (a.audience || '') + '» жагсаалтад ' + String(a.reason || '').replace(' шинэ утас', '') + ' утас нэмэх' : f[0];
      o('<div class="ev"><div class="when nm">' + esc(mdhm(a.done_at || a.at)) + '</div><div class="what">');
      o('<div class="evr"><span class="pl ' + M[0] + '">' + M[1] + '</span><span class="pl ' + st[0] + '">' + st[1] + '</span>' + (a.verdict ? '<span class="pl ' + VERD[a.verdict][0] + '">' + VERD[a.verdict][1] + '</span>' : a.eval_at ? '<span class="pl bl">Дүгнэлт ' + esc(mdhm(a.eval_at)) + '</span>' : '') + '</div>');
      o('<div class="tt">' + esc(title) + '</div>');
      if (a.kind !== 'manual' && a.kind !== 'list_refresh' && f[1]) o('<div class="sb">' + esc(f[1]) + '</div>');
      if (a.reason && a.kind !== 'list_refresh') o('<div class="sb mu">' + esc(a.reason) + '</div>');
      if (a.kind === 'list_refresh' && a.note) o('<div class="sb mu">Meta: ' + esc(a.note) + '</div>');
      if (a.before && a.before.signals) {
        const b = a.before, af = a.after || null;
        const cell = (lbl, bv, av, f2) => '<span>' + lbl + ' <b class="nm">' + f2(bv) + '</b>' + (af ? ' → <b class="nm">' + f2(av) + '</b>' : '') + '</span>';
        o('<div class="cmp">' + cell('Захиалга/өдөр', b.demand, af && af.demand, (v) => num(v, 1))
          + cell('Шинэ хүн', b.signals.new_share, af && af.signals && af.signals.new_share, (v) => pct(v))
          + cell('CTR уналт', b.signals.ctr_decay, af && af.signals && af.signals.ctr_decay, (v) => (has(v) ? '−' + pct(v) : '—'))
          + cell('Давтамж', b.signals.freq7, af && af.signals && af.signals.freq7, (v) => num(v, 2)) + (af ? '' : '<span class="mu">(өмнөх тоо — дараах нь дүгнэлтийн өдөр гарна)</span>') + '</div>');
      }
      o('</div></div>');
    });
    o('</div>');
  }
  o('</section>');

  // ── 5. Meta жагсаалтууд
  const AU = A(d.audiences);
  if (AU.length) {
    o('<section class="cd" aria-label="Meta жагсаалтууд"><div class="hr"><h2 class="h">Meta жагсаалтууд</h2><span class="sb">Худалдан авагч, татгалзагчийг өдөр бүр 10:40-д автоматаар нэмнэ</span></div><div class="scroll"><table class="tbl"><thead><tr><th>Жагсаалт</th><th>Төрөл</th><th>Сүүлд шинэчилсэн</th><th class="r">Хүлээгдэж буй</th></tr></thead><tbody>');
    AU.forEach((m) => {
      const auto = ['buyers_all', 'product_buyers', 'b_refusers'].indexOf(m.kind) >= 0;
      o('<tr><td>' + esc(m.name) + '</td><td class="sb">' + esc(AUDK[m.kind] || m.kind) + '</td><td class="sb nm">' + (auto ? esc(mdhm(m.synced_at)) : '<span class="mu">Meta өөрөө</span>') + '</td><td class="r nm">' + (auto ? (n(m.pending) > 0 ? '<span class="pl wr">' + n(m.pending) + ' утас</span>' : '<span class="pl ok">0</span>') : '—') + '</td></tr>');
    });
    o('</tbody></table></div></section>');
  }

  // ── 6. Хэрхэн ажилладаг
  o('<section aria-label="Хэрхэн ажилладаг" style="display:flex;flex-direction:column;gap:12px"><h2 class="h">Хэрхэн ажилладаг</h2><div class="rules">');
  o('<div class="cd"><div class="lb">Хэмжилт · 3 цаг тутам</div><div class="sb">Meta-гаас ad set бүрийн «өчигдөр хүртэл давхардалгүй хүрсэн хүн»-ийг авч, өдөр бүр хэдэн хүн <b>анх удаа</b> зар харсныг тоолно. Нэмэлт зардал 0.</div></div>');
  o('<div class="cd"><div class="lb">Шалгалт · 10:30</div><div class="sb">9 дохиог босготой харьцуулж ногоон/шар/улааныг тогтооно. Шар/улаан, автомат засвар эсвэл дүгнэлт байвал Telegram-аар нэг мессеж.</div></div>');
  o('<div class="cd"><div class="lb">Автомат засвар · 10:40</div><div class="sb">Зөвхөн эрсдэлгүй засвар: шинэ худалдан авагч/татгалзагчийг жагсаалтад нэмэх. ' + (S.auto_targeting_from ? esc(String(S.auto_targeting_from).replace(/^(\d{4})(\d\d)(\d\d)$/, '$2/$3')) + '-аас' : 'Удахгүй') + ' дутуу хасалтыг ad set-д нэмнэ. Төсөв, байршил, зар унтраах — <b>хэзээ ч автомат биш</b>.</div></div>');
  o('<div class="cd"><div class="lb">Хамгаалалт</div><div class="sb">Өгөгдөл 6 цагаас хуучин бол засвар хийхгүй. Нэг ad set-д 72 цагт 1 засвар. Засвар бүрийн өмнөх тоог хадгалж, 72 цагийн дараа харьцуулна — муудсан бол буцаах санал.</div></div>');
  o('</div>');
  // босгууд (Claude/эзэн тохируулна)
  const keys = ['new_share_y', 'new_share_r', 'cost_new_y', 'cost_new_r', 'freq7_y', 'freq7_r', 'pace_y', 'pace_r', 'ctr_drop_y', 'ctr_drop_r', 'demand_drop_y', 'demand_drop_r', 'conv_drop_y', 'conv_drop_r', 'a_share_y', 'a_share_r', 'c_share_y', 'c_share_r'];
  o('<details><summary>Босгууд (' + keys.length + ')</summary><div class="scroll" style="margin-top:10px"><table class="tbl"><tbody>');
  keys.filter((k) => d.cfg && d.cfg[k]).forEach((k) => o('<tr><td class="nm" style="white-space:nowrap">' + esc(k) + '</td><td class="nm r">' + esc(d.cfg[k].v) + '</td><td class="sb">' + esc(d.cfg[k].note || '') + '</td></tr>'));
  o('</tbody></table></div><div class="sb mu" style="margin-top:8px">Өөрчлөх бол Claude-д хэлээрэй (reach_guard_cfg).</div></details>');
  // шалгалтын түүх
  const TK = A(d.ticks);
  if (TK.length) {
    o('<div class="cd" style="padding:12px 16px;gap:8px"><div class="lb">Өдөр бүрийн шалгалт</div><div class="days">' + TK.slice().reverse().map((t) => '<span>' + lv(t.lvl)[2] + '<b class="nm">' + md(t.as_of) + '</b></span>').join('') + '</div></div>');
  }
  o('</section>');

  o('</div><footer>reach_board · ' + (has(d.ms) ? (n(d.ms) / 1000).toFixed(1) + 'с' : '') + ' · ' + esc(d.ub_date || '') + ' · зөвхөн уншина</footer></div></body></html>');
  return out.join('');
}
