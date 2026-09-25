/* Starshopping · ДААЛГАВАР — самбарын нүүр (2026-09-24, блок AD).
   Нэг урсгал: шийдвэр → юу байгаа/дутуу → бараа бүрийн тоглолт → 7 хоногийн ажил → KPI → гинж.
   Өгөгдөл: /webhook/board-data?view=mission (mission_view()). Ажлыг «хийсэн» гэж тэмдэглэх нь POST action=task. */
function renderMission(DATA, QUERY) {
  const d = DATA || {};
  const Q = QUERY || {};
  const themeQ = Q.theme === 'dark' || Q.theme === 'light' ? Q.theme : '';
  const tq = themeQ ? '&theme=' + themeQ : '';
  const A = (v) => (Array.isArray(v) ? v : []);
  const n = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v));
  const has = (v) => v !== null && v !== undefined && v !== '';
  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const mnt = (v) => (has(v) ? n(v).toLocaleString('en-US') + '₮' : '—');
  const active = d.state === 'active';
  const conf = d.confirmation || {};
  const checks = A(conf.checks);
  const M = d.mission || {};
  const day = n(M.day) || 1;

  const P = []; const o = (s) => P.push(s);
  o('<!doctype html><html lang="mn"' + (themeQ ? ' data-theme="' + themeQ + '"' : '') + '><head><meta charset="utf-8">');
  o('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark">');
  o('<title>Starshopping · Даалгавар</title><style>');
  o(''
   + '.nav{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 0}.nav a{padding:7px 13px;border-radius:999px;border:1px solid var(--ln);background:var(--s1);color:var(--ink2);text-decoration:none;font-size:13px;font-weight:600}'
   + '.nav a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
   + '.hero{border-radius:var(--r);padding:22px 22px 18px;margin:16px 0 8px;border:1px solid var(--ln);background:var(--s1);position:relative;overflow:hidden}'
   + '.hero.gg{border-color:var(--good);background:linear-gradient(135deg,var(--good-a),var(--s1) 60%)}'
   + '.hero.wait{border-color:var(--warn);background:linear-gradient(135deg,var(--warn-a),var(--s1) 60%)}'
   + '.hero .tag{font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:var(--mut)}'
   + '.hero h1{font-size:26px;line-height:1.2;margin:6px 0 6px;color:var(--ink)}'
   + '.hero .sub{font-size:14px;color:var(--ink2);max-width:760px;line-height:1.5}'
   + '.prog{height:10px;border-radius:5px;background:var(--s2);overflow:hidden;margin-top:14px;max-width:520px}.prog i{display:block;height:100%;background:var(--good)}'
   + '.hero.wait .prog i{background:var(--warn)}'
   + '.sec{margin:26px 0 8px;display:flex;align-items:baseline;gap:10px}.sec b{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut)}'
   + '.sec .no{width:24px;height:24px;border-radius:50%;background:var(--ink);color:var(--bg);display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800}'
   + '.sec span.st{font-size:17px;font-weight:700;color:var(--ink)}'
   + '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px}'
   + '.tile{border:1px solid var(--ln);border-radius:var(--r-s);padding:12px;background:var(--s1)}'
   + '.tile .l{font-size:12px;color:var(--mut)}.tile .v{font-size:15px;font-weight:700;margin-top:4px;color:var(--ink)}'
   + '.tile.ok{border-color:var(--good)}.tile.ok .v::before{content:"✓ ";color:var(--good)}'
   + '.tile.no{border-color:var(--crit);background:var(--crit-a)}.tile.no .v::before{content:"✗ ";color:var(--crit)}'
   + '.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}'
   + '.mpc{border:1px solid var(--ln);border-radius:var(--r);padding:16px;background:var(--s1);display:flex;flex-direction:column;gap:8px}'
   + '.mpc .nm1{font-size:16px;font-weight:700;color:var(--ink)}.mpc .mt{font-size:12px;color:var(--mut)}'
   + '.play{display:inline-block;font-size:12px;font-weight:800;padding:4px 10px;border-radius:999px;letter-spacing:.04em}'
   + '.play.copy{background:var(--good-a);color:var(--good)}.play.diff{background:var(--blue-a);color:var(--blue)}.play.alt{background:var(--warn-a);color:var(--warn)}'
   + '.price{font-size:20px;font-weight:800;color:var(--ink)}.price small{font-size:12px;font-weight:600;color:var(--mut);margin-left:6px}'
   + '.why{font-size:13px;color:var(--ink2);line-height:1.5}'
   + '.hook{font-size:13px;background:var(--s2);border-radius:var(--r-s);padding:8px 10px;color:var(--ink)}.hook span{display:block;font-size:11px;color:var(--mut);margin-bottom:3px}'
   + '.days{display:grid;grid-template-columns:repeat(7,minmax(150px,1fr));gap:8px;overflow-x:auto;padding-bottom:6px}'
   + '.dcol{border:1px solid var(--ln);border-radius:var(--r);padding:10px;background:var(--s1);min-height:120px}'
   + '.dcol.today{border-color:var(--ink);box-shadow:0 0 0 2px var(--ink) inset}'
   + '.dcol h4{margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}.dcol.today h4{color:var(--ink)}'
   + '.task{border:1px solid var(--ln2);border-radius:var(--r-s);padding:8px;margin-bottom:6px;background:var(--bg)}'
   + '.task.done{opacity:.55}.task.done .tt{text-decoration:line-through}.task.late{border-color:var(--crit)}'
   + '.task .tt{font-size:13px;font-weight:600;color:var(--ink)}.task .mdt{font-size:11px;color:var(--mut);margin-top:3px;line-height:1.4}'
   + '.task .row2{display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap}'
   + '.own{font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:var(--s2);color:var(--ink2)}.own.me{background:var(--gold-a);color:var(--gold)}'
   + '.auto{font-size:10px;color:var(--good);font-weight:700}'
   + '.cb{margin-left:auto;font:600 12px system-ui,sans-serif;padding:4px 9px;border-radius:6px;border:1px solid var(--ln2);background:var(--s1);color:var(--ink);cursor:pointer}'
   + '.task.done .cb{background:var(--good-a);color:var(--good);border-color:var(--good)}'
   + 'table.kp{width:100%;min-width:0!important;border-collapse:collapse;font-size:14px}table.kp td{word-break:break-word}table.kp td,table.kp th{padding:9px 10px;border-bottom:1px solid var(--ln3);text-align:left}table.kp th{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.06em}'
   + '.mdot{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--ln2);margin-right:6px}.mdot.g{background:var(--good)}.mdot.r{background:var(--crit)}'
   + '.chain{display:flex;gap:0;overflow-x:auto;padding:6px 0}'
   + '.lk{flex:1;min-width:110px;text-align:center;position:relative}'
   + '.lk .c{width:34px;height:34px;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;font-weight:800;border:2px solid var(--ln2);background:var(--s1);color:var(--mut);position:relative;z-index:1}'
   + '.lk.ok .c{border-color:var(--good);background:var(--good-a);color:var(--good)}'
   + '.lk::before{content:"";position:absolute;top:17px;left:-50%;width:100%;height:2px;background:var(--ln2)}.lk:first-child::before{display:none}.lk.ok::before{background:var(--good)}'
   + '.lk .s{font-size:12px;font-weight:700;margin-top:6px;color:var(--ink)}.lk .f{font-size:11px;color:var(--mut);margin-top:2px}'
   + '.leak{margin-top:10px;border:1px solid var(--crit);background:var(--crit-a);color:var(--crit);border-radius:var(--r-s);padding:10px 12px;font-weight:700;font-size:14px}'
   + '.steps{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;margin-top:14px}'
   + '.mstp{border:1px solid var(--ln);border-radius:var(--r-s);padding:10px 12px;background:var(--s1)}.mstp.ok{border-color:var(--good)}'
   + '.mstp .l{font-size:13px;font-weight:700;color:var(--ink)}.mstp .l::before{content:"⬜ "}.mstp.ok .l::before{content:"✅ "}.mstp .f{font-size:12px;color:var(--mut);margin-top:3px}'
   + '.ax{font-size:13px;color:var(--ink2);line-height:1.7}.ax b{color:var(--ink)}'
   + '@media(max-width:640px){.hero h1{font-size:21px}table.kp{font-size:12px}table.kp td,table.kp th{padding:7px 5px}.days{grid-template-columns:1fr}.dcol{min-height:0}}');
  o('</style></head><body><div class="w">');

  // ── толгой + навигаци
  o('<header><div class="hd"><div class="bm">S</div><div><div class="bt">Starshopping</div>');
  o('<div class="bs">даалгавар · ' + esc(String(d.generated_at || '').replace('T', ' ').slice(0, 16)) + ' UTC</div></div>');
  o('<div class="sp"></div><a class="rf" href="">Шинэчлэх</a></div></header>');
  o('<nav class="nav"><a class="on" href="/board/' + (themeQ ? '?theme=' + themeQ : '') + '">Даалгавар</a>'
    + '<a href="/board/?view=research&amp;tab=rank' + tq + '">Судалгаа · ранк</a>'
    + '<a href="/board/?view=board' + tq + '">Систем</a></nav>');

  const PLAY = { 'ХУУЛЖ ОР': 'copy', 'ЯЛГАРЧ ОР': 'diff', 'ХУВИЛБАР ОЛ': 'alt' };
  const prodCard = (p) => {
    o('<div class="mpc"><div><span class="play ' + (PLAY[p.play] || '') + '">' + esc(p.play) + '</span></div>');
    o('<div class="nm1">' + esc(p.product) + '</div>');
    o('<div class="mt">' + esc(p.niche || '') + ' · ' + n(p.pages) + ' хуудас 180+ · хамгийн удаан ' + n(p.max_days) + ' хоног · өрсөлдөгч ' + mnt(p.ref_price) + '</div>');
    o('<div class="price">' + (has(p.target_price) ? mnt(p.target_price) : '1688-аас') + '<small>' + esc(p.price_plan || '') + '</small></div>');
    o('<div class="why">' + esc(p.rationale || p.why || '') + '</div>');
    if (p.hook_template || p.hook_example) {
      o('<div class="hook"><span>HOOK · удаан амьдарсан загвар: ' + esc(p.hook_template || '—')
        + (p.hook_alt ? ' · ялгарах: ' + esc(p.hook_alt) : '') + '</span>' + esc(p.hook_example || '') + '</div>');
    }
    o('</div>');
  };

  if (!active) {
    // ══ ХҮЛЭЭЛТ — нотолгоо x/4
    const passed = n(conf.passed);
    o('<section class="hero wait"><div class="tag">Одоогийн байдал</div>');
    o('<h1>' + esc(d.headline || 'СУДАЛГАА ҮРГЭЛЖИЛЖ БАЙНА') + '</h1>');
    o('<div class="sub">' + esc(d.sub || '') + '</div>');
    o('<div class="prog"><i style="width:' + Math.round(100 * passed / 4) + '%"></i></div>');
    o('<div class="steps">' + checks.map((c) => '<div class="mstp' + (c.ok ? ' ok' : '') + '"><div class="l">' + esc(c.label)
      + '</div><div class="f">' + esc(c.fact) + '</div></div>').join('') + '</div></section>');

    // Одоо юу хийх вэ — дутуу нотолгоо бүр ажил болно
    const todo = [];
    checks.forEach((c) => {
      if (c.ok) return;
      if (c.key === 'coverage') todo.push(['Claude', 'Шалгагдаагүй зарыг Ad Library дээр шалгах', c.fact]);
      if (c.key === 'stable') todo.push(['Claude', 'Нэмэлт скан — маягтаас орсон шинэ үгсээр', 'Шинэ өгөгдөлд №1 хэвээр байвал баталгаажна']);
      if (c.key === 'gate') todo.push(['Систем', 'Хаалга давах хуудас хүлээгдэж байна', c.fact]);
      if (c.key === 'lead') todo.push(['Систем', '№1 ба №2-ын зай бага — илүү өгөгдөл хэрэгтэй', c.fact]);
    });
    todo.push(['Ариунболд', 'Хадгалсан reel, viral-аа маягтаар оруулах', 'Бараа бүр хайлтын үгийн санд орж скан илүү олон хуудас олно']);
    o('<div class="sec"><span class="no">1</span><span class="st">Одоо юу хийх вэ</span></div><div class="grid">');
    todo.forEach((t) => o('<div class="tile"><div class="l">' + esc(t[0]) + '</div><div class="v" style="font-size:14px">' + esc(t[1])
      + '</div><div class="l" style="margin-top:4px">' + esc(t[2]) + '</div></div>'));
    o('</div>');

    const pv = A(d.preview_products).slice(0, 6);
    o('<div class="sec"><span class="no">2</span><span class="st">Нээгдвэл ийм даалгавар гарна · ' + esc(d.candidate || '') + '</span></div>');
    if (!pv.length) o('<div class="tile">Шалгасан бараа хараахан алга.</div>');
    else { o('<div class="cards">'); pv.forEach(prodCard); o('</div>'); }

    const W = d.why || {};
    if (W.demand) {
      o('<div class="sec"><span class="no">3</span><span class="st">Яагаад ' + esc(d.candidate || '') + '</span></div><div class="tile ax">'
        + [['Эрэлт', 'demand'], ['Ашиг', 'profit'], ['Цонх', 'window'], ['Хурд', 'momentum'], ['Чадвар', 'fit']]
          .map((a) => '<b>' + a[0] + ' ' + n((W[a[1]] || {}).score) + '</b> — ' + esc((W[a[1]] || {}).facts || '')).join('<br>') + '</div>');
    }
  } else {
    // ══ ИДЭВХТЭЙ ДААЛГАВАР
    const tasks = A(d.tasks);
    const done = tasks.filter((t) => t.status === 'done').length;
    o('<section class="hero gg"><div class="tag">Даалгавар #' + n(M.mission_id) + ' · өдөр ' + day + '/7</div>');
    o('<h1>' + esc(d.headline) + '</h1><div class="sub">' + esc(d.sub || '') + '</div>');
    o('<div class="prog"><i style="width:' + (tasks.length ? Math.round(100 * done / tasks.length) : 0) + '%"></i></div>');
    if (d.leak) o('<div class="leak">⚠ Цоорхой: ' + esc(d.leak) + '</div>');
    o('</section>');

    o('<div class="sec"><span class="no">1</span><span class="st">Юу байгаа · юу дутуу</span></div><div class="grid">');
    A(d.gaps).forEach((g) => o('<div class="tile ' + (g.ok ? 'ok' : 'no') + '"><div class="l">' + esc(g.label) + '</div><div class="v">' + esc(g.fact) + '</div></div>'));
    o('</div>');

    o('<div class="sec"><span class="no">2</span><span class="st">Бараа · юу хийх вэ</span></div><div class="cards">');
    A(d.products).forEach(prodCard);
    o('</div>');

    o('<div class="sec"><span class="no">3</span><span class="st">7 хоногийн ажил</span><b>дарж «хийсэн» болго</b></div><div class="days">');
    for (let i = 1; i <= 7; i++) {
      o('<div class="dcol' + (i === day ? ' today' : '') + '"><h4>Өдөр ' + i + (i === day ? ' · өнөөдөр' : '') + '</h4>');
      tasks.filter((t) => n(t.day) === i).forEach((t) => {
        const isDone = t.status === 'done';
        o('<div class="task' + (isDone ? ' done' : '') + (t.overdue ? ' late' : '') + '"><div class="tt">' + esc(t.title) + '</div>');
        if (t.detail) o('<div class="mdt">' + esc(t.detail) + '</div>');
        o('<div class="row2"><span class="own' + (t.owner === 'Ариунболд' ? ' me' : '') + '">' + esc(t.owner) + '</span>'
          + (t.auto ? '<span class="auto">систем баталсан</span>' : '')
          + (t.auto ? '' : '<button class="cb" data-id="' + n(t.task_id) + '" data-st="' + (isDone ? 'todo' : 'done') + '">' + (isDone ? '✓ хийсэн' : 'Хийсэн') + '</button>')
          + '</div></div>');
      });
      o('</div>');
    }
    o('</div>');

    o('<div class="sec"><span class="no">4</span><span class="st">KPI · зорилт ба бодит</span></div><div class="tile" style="padding:4px 8px"><table class="kp"><tr><th>Хэмжүүр</th><th>Зорилт</th><th>Бодит</th></tr>');
    A(d.kpi).forEach((k) => o('<tr><td><span class="mdot' + (k.ok === true ? ' g' : k.ok === false ? ' r' : '') + '"></span>' + esc(k.label)
      + '</td><td>' + esc(k.target) + '</td><td><b>' + esc(k.actual) + '</b></td></tr>'));
    o('</table></div>');

    o('<div class="sec"><span class="no">5</span><span class="st">Гинж · хаана тасарч байна</span></div><div class="tile"><div class="chain">');
    A(d.chain).forEach((c, i) => o('<div class="lk' + (c.ok ? ' ok' : '') + '"><div class="c">' + (c.ok ? '✓' : (i + 1)) + '</div><div class="s">'
      + esc(c.stage) + '</div><div class="f">' + esc(c.fact) + '</div></div>'));
    o('</div></div>');

    const W = d.why || {};
    if (W.demand) {
      o('<div class="sec"><span class="no">6</span><span class="st">Яагаад энэ категори</span></div><div class="tile ax">'
        + [['Эрэлт', 'demand'], ['Ашиг', 'profit'], ['Цонх', 'window'], ['Хурд', 'momentum'], ['Чадвар', 'fit']]
          .map((a) => '<b>' + a[0] + ' ' + n((W[a[1]] || {}).score) + '</b> — ' + esc((W[a[1]] || {}).facts || '')).join('<br>')
        + '<br><a href="/board/?view=research&amp;tab=pack&amp;c=' + encodeURIComponent(M.category || '') + tq + '">Орох багц бүтнээр →</a></div>');
    }
  }

  // ══ ШҮҮЛТ 2.0 · ТЕСТЛЭХ ДАРААЛАЛ (блок AN, test_queue) — самбар нээх бүрд амьд тооцоолно
  const TQ = d.queue || null;
  if (TQ) {
    const F = TQ.funnel || {};
    const VL = { test: ['ТЕСТ', 'ok'], watch: ['ХҮЛЭЭХ', 'wr'] };
    o('<div class="sec"><b>Тестлэх дараалал</b><span class="st">' + n(F.total) + ' олдвор · ' + n(F.unchecked) + ' шалгаагүй · '
      + n(F.test) + ' ТЕСТ · ' + n(F.watch) + ' хүлээх · ' + n(F.reject) + ' татгалзсан · үгсийн сан ' + n(F.seeds) + '</span></div>');
    o('<p style="font-size:13px;color:var(--ink2);margin:0 0 8px;max-width:760px">' + esc(TQ.rule || '') + '</p>');
    const QQ = A(TQ.queue);
    if (!QQ.length) {
      o('<p class="cm">Шалгасан олдвор алга — өдөр бүрийн шүүлт ажилласны дараа энд гарна.</p>');
    } else {
      o('<div class="sc"><table><tr><th>#</th><th>Бараа</th><th>Шийдвэр</th><th>Оноо</th><th>МН-д</th><th>Үнэ / ашиг</th><th>Яагаад</th></tr>');
      QQ.forEach((x, i) => {
        const L = VL[x.verdict] || [x.verdict || '—', 'no'];
        const W = x.why || {}; const E = W.econ || {}; const pt = W.parts || {};
        const why = A(W.good).map((t) => '✅ ' + esc(t)).concat(A(W.warn).map((t) => '⚠️ ' + esc(t))).join('<br>');
        o('<tr><td class="nm">' + (i + 1) + '</td><td><b>' + esc(x.product) + '</b><div class="cm">' + esc(x.category || '—') + ' · ' + esc(x.source)
          + (x.page_ready ? '' : ' · page алга') + (x.in_products ? ' · бүртгэсэн' : '') + '</div></td>'
          + '<td><span class="gt ' + L[1] + '">' + L[0] + '</span>' + (x.level === 'quick' ? '<div class="cm">хурдан шалгалт</div>' : '') + '</td>'
          + '<td class="nm">' + n(x.score) + '<div class="cm">в' + n(pt.viral) + ' з' + n(pt.gap) + ' а' + n(pt.econ) + ' т' + n(pt.fit) + '</div></td>'
          + '<td class="nm">' + (has(x.same_pages) ? n(x.same_pages) + ' хуудас' : '—') + '</td>'
          + '<td class="nm">' + (has(E.price_mnt) ? mnt(E.price_mnt) + '<div class="cm">ашиг ' + mnt(E.contribution_mnt) + (has(x.cn_price) ? ' · ¥' + esc(x.cn_price) : '') + '</div>' : '—') + '</td>'
          + '<td style="font-size:12px;line-height:1.45">' + why + (x.url && /^https?:/.test(x.url) ? '<br><a href="' + esc(x.url) + '" target="_blank" rel="noopener">эх сурвалж →</a>' : '') + '</td></tr>');
      });
      o('</table></div>');
    }
    const RJ = A(TQ.rejected_recent);
    if (RJ.length) o('<details style="margin:6px 0 14px"><summary class="cm">Сүүлд татгалзсан ' + RJ.length + '</summary><div class="cm" style="margin-top:6px">'
      + RJ.map((r) => '❌ <b>' + esc(r.product) + '</b> — ' + A(r.why).map(esc).join('; ')).join('<br>') + '</div></details>');
  }

  // ══ W9 · ТЕСТ ↔ БОРЛУУЛАЛТ — нэг товч (блок AK, set_product_mode)
  const PM = A((d.modes || {}).products);
  if (PM.length) {
    const ML = { test: ['ТЕСТ', 'wr'], live: ['БОРЛУУЛАЛТ', 'ok'], preorder: ['УРЬДЧИЛСАН', 'wr'], stop: ['ЗОГССОН', 'no'] };
    o('<div class="sec"><b>Бараа</b><span class="st">Тест ↔ Борлуулалт</span></div>');
    o('<p style="font-size:13px;color:var(--ink2);margin:0 0 8px;max-width:760px">' + esc((d.modes || {}).rule || '') + '</p>');
    o('<div class="sc"><table><tr><th>Бараа</th><th>Горим</th><th>Утсаа үлдээсэн</th><th>Хүлээж буй</th><th>Зар</th><th>1 хүний өртөг</th><th></th></tr>');
    PM.forEach((x) => {
      const L = ML[x.mode] || [x.mode, 'no'];
      const btn = (mode, label) => '<button class="pm" data-slug="' + esc(x.slug) + '" data-mode="' + mode + '" data-name="' + esc(x.name) + '">' + label + '</button>';
      const acts = x.mode === 'live' ? btn('test', '↺ Тест')
        : x.mode === 'stop' ? btn('test', '↺ Дахин тест')
        : btn('live', '▶ Борлуулалт') + ' ' + btn('stop', '■ Зогсоох');
      o('<tr><td><b>' + esc(x.name) + '</b><div class="cm">' + mnt(x.price_mnt) + (x.mode === 'live' && has(x.stock_qty) ? ' · үлдэгдэл ' + n(x.stock_qty) : '') + '</div></td>'
        + '<td><span class="gt ' + L[1] + '">' + L[0] + '</span></td><td class="nm">' + n(x.signups) + '</td><td class="nm">' + n(x.waiting)
        + '</td><td class="nm">' + mnt(x.spend_mnt) + '</td><td class="nm">' + (has(x.cpa_mnt) ? mnt(x.cpa_mnt) : '—') + '</td><td style="white-space:nowrap">' + acts + '</td></tr>');
    });
    o('</table></div><div id="pmOut"></div>');
    o('<style>.pm{font:inherit;font-size:12px;font-weight:700;padding:6px 10px;border-radius:8px;border:1px solid var(--ln);background:var(--s1);color:var(--ink);cursor:pointer}'
      + '#pmOut .box{border:1px solid var(--ln);border-radius:var(--r-s);padding:12px;margin:10px 0;background:var(--s1);font-size:13px;line-height:1.5}'
      + '#pmOut textarea{width:100%;min-height:70px;font:inherit;font-size:13px;margin-top:6px}</style>');
    o('<script>(function(){var U="https://starshopping.app.n8n.cloud/webhook/board-data";'
      + 'function e(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]})}'
      + 'document.querySelectorAll(".pm").forEach(function(b){b.addEventListener("click",function(){'
      + 'var m=b.dataset.mode,nm=b.dataset.name,q=null;'
      + 'if(m==="live"){q=prompt("«"+nm+"» агуулахад хэдэн ширхэг тоолж авсан бэ?");if(q===null)return;q=parseInt(q,10);if(!(q>=0)){alert("Тоо оруулна уу");return}}'
      + 'else if(m==="stop"){if(!confirm("«"+nm+"»-ийн тестийг зогсоох уу? Хүлээж буй захиалгууд цуцлагдаж, бараа сайтаас нуугдана."))return}'
      + 'else if(!confirm("«"+nm+"»-ийг ТЕСТ горимд шилжүүлэх үү?"))return;'
      + 'var k="";try{k=localStorage.getItem("ss_board_key")||""}catch(x){}'
      + 'b.disabled=true;b.textContent="…";'
      + 'fetch(U+"?k="+encodeURIComponent(k),{method:"POST",headers:{"Content-Type":"application/json"},'
      + 'body:JSON.stringify({action:"mode",slug:b.dataset.slug,mode:m,stock_qty:q,by:"owner"})})'
      + '.then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})'
      + '.then(function(j){if(!j.ok)throw new Error(j.error||"алдаа");'
      + 'var L=j.call_list||j.sorry_list||[];var h="<div class=box><b>"+e(j.product)+" → "+e(j.mode)+"</b><br>"+e(j.next||"");'
      + 'if(j.short>0)h+="<br>⚠️ "+j.short+" ш ДУТУУ — нэмж захиал!";'
      + 'if(L.length){h+="<br><br><b>"+(j.call_list?"Залгах":"Уучлалт хүсэх")+" ("+L.length+")</b><br>"+L.map(function(x){return e(x.phone)+(x.name?" · "+e(x.name):"")+" · "+x.qty+"ш"}).join("<br>")}'
      + 'if(j.script)h+="<br><br><b>Хэлэх үг:</b><textarea readonly>"+e(j.script)+"</textarea>";'
      + 'h+="<br><button class=pm onclick=location.reload()>Шинэчлэх</button></div>";'
      + 'document.getElementById("pmOut").innerHTML=h;b.textContent="✓"})'
      + '.catch(function(x){b.disabled=false;b.textContent="алдаа: "+x.message})})})})();</script>');
  }

  o('<footer><span>Систем нотолгоогоор шийднэ: шалгасан зар → ранк → даалгавар → тест → үр дүн ранк руу буцна.</span></footer></div>');
  // «Хийсэн» товч — түлхүүр энэ төхөөрөмжийн localStorage-д
  o('<script>(function(){var U="https://starshopping.app.n8n.cloud/webhook/board-data";'
    + 'document.querySelectorAll(".cb").forEach(function(b){b.addEventListener("click",function(){'
    + 'var k="";try{k=localStorage.getItem("ss_board_key")||""}catch(e){}'
    + 'b.disabled=true;b.textContent="…";'
    + 'fetch(U+"?k="+encodeURIComponent(k),{method:"POST",headers:{"Content-Type":"application/json"},'
    + 'body:JSON.stringify({action:"task",task_id:+b.dataset.id,status:b.dataset.st,by:"owner"})})'
    + '.then(function(r){if(!r.ok)throw new Error(r.status);location.reload()})'
    + '.catch(function(e){b.disabled=false;b.textContent="алдаа "+e.message})})})})();</script>');
  o('</body></html>');
  return P.join('');
}
