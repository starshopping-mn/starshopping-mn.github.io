/* Самбар · БАРАА ХАЙЛТ (блок LK, 2026-11-22 — эзэн загварыг 09:38-д баталсан)
   Өгөгдөл: ?view=mine → board_read → mine_page() = mine_health() + mine_owner_list() + МН шалгалтын дараалал + сүүлийн ажиллагаанууд.
   Бичих ганц үйлдэл: «Хадгалах» → ssRpc mine_eye_save (түлхүүрийг DB шалгана, n8n ажиллагаа зарцуулахгүй) → owner_eye_set.
     70+ → Досье (1688-ийн өртөг, 8 шүүлтүүр), 70-аас доош → хаагдана.
   «Шийдвэр хүлээж буй» бараа (оролтын хаалга татгалзсан, note-д ЭЗНИЙ ШИЙДВЭР): LN-ээс хойш мөн хувь өгнө — 70+ = эзний шийдвэрээр санд орно (mine_promote хаалгыг давуулна), доош = хаагдана.
   Бүтэц (самбарын стандарт): 1 мөр дүгнэлт → 4 KPI → чиний нүд хэрэгтэй бараа + юүлүүр → системийн өөрийн шалгалт → дэлгэрэнгүй (нээгддэг).
   Классууд .mi дотор (board.css-ийн нийтийн класстай мөргөлдөхгүй). */
function renderMine(DATA, QUERY) {
  const d = DATA || {};
  const Q = QUERY || {};
  const themeQ = Q.theme === 'dark' || Q.theme === 'light' ? Q.theme : '';
  const A = (v) => (Array.isArray(v) ? v : []);
  const n = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? 0 : Number(v));
  const has = (v) => v !== null && v !== undefined && v !== '';
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const num = (v) => n(v).toLocaleString('en-US');
  const ub = (iso) => (iso ? new Date(new Date(iso).getTime() + 8 * 3600000).toISOString() : '');
  const mdhm = (iso) => (iso ? ub(iso).slice(5, 10).replace('-', '/') + ' ' + ub(iso).slice(11, 16) : '—');
  const http = (u) => (/^https?:\/\//i.test(String(u || '')) ? String(u) : '');
  const out = [];
  const o = (s) => out.push(s);

  const CSS = '.nav{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px}.nav a{padding:7px 13px;border-radius:999px;border:1px solid var(--ln);background:var(--s1);color:var(--ink2);font-size:12.5px;font-weight:600}.nav a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
    + '.mi{display:flex;flex-direction:column;gap:14px}'
    + '.mi .hero{display:flex;gap:14px;align-items:center;flex-wrap:wrap;background:var(--s1);border:1px solid var(--ln);border-left:4px solid var(--hc);border-radius:14px;padding:16px 18px}'
    + '.mi .hero .ic{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:var(--ha);color:var(--hc);font-size:19px;font-weight:800;flex:none}'
    + '.mi .hero .tx{flex:1 1 320px;min-width:0}.mi .hero .t1{font-size:17px;font-weight:700;line-height:1.35}.mi .hero .t2{font-size:12.5px;color:var(--ink2);margin-top:3px;line-height:1.5}'
    + '.mi .hero .win{font-size:11px;color:var(--mut);text-align:right;line-height:1.5}'
    + '.mi .krow{margin:0}'
    + '.mi .g2{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:14px}@media(max-width:980px){.mi .g2{grid-template-columns:minmax(0,1fr)}}'
    + '.mi .cd{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:15px 16px 14px;min-width:0;display:flex;flex-direction:column;gap:10px}'
    + '.mi .ch{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}.mi .ch b{font-size:13.5px;font-weight:700}.mi .ch span{font-size:11.5px;color:var(--mut)}'
    + '.mi .it{border:1px solid var(--ln);border-radius:12px;padding:12px 13px;display:flex;flex-direction:column;gap:8px;background:var(--bg);min-width:0}'
    + '.mi .it .nm{font-size:14px;font-weight:700;line-height:1.35;overflow-wrap:anywhere}'
    + '.mi .tg{display:flex;flex-wrap:wrap;gap:6px}.mi .tg i{font-style:normal;font-size:11px;font-weight:650;padding:3px 9px;border-radius:999px;background:var(--s2);color:var(--ink2);white-space:nowrap}'
    + '.mi .tg i.g{background:var(--good-a);color:var(--good)}.mi .tg i.y{background:var(--warn-a);color:var(--warn)}'
    + '.mi .wn{font-size:11.5px;color:var(--mut);line-height:1.45;overflow-wrap:anywhere}'
    + '.mi .ac{display:flex;gap:8px;align-items:center;flex-wrap:wrap}'
    + '.mi .ac a.vd{padding:8px 13px;border-radius:9px;background:var(--ink);color:var(--bg);font-size:12.5px;font-weight:650;text-decoration:none;white-space:nowrap}'
    + '.mi .ac input{box-sizing:border-box;padding:7px 8px;border:1px solid var(--ln2);border-radius:9px;background:var(--s1);color:var(--ink);font:600 13px system-ui,sans-serif;min-width:0}'
    + '.mi .ac input.mwy{flex:1 1 150px;font-weight:500}.mi .ac input.mpc{width:62px;flex:none;text-align:right}'
    + '.mi .ac button{padding:8px 13px;border-radius:9px;border:1px solid var(--ln2);background:var(--s1);color:var(--ink);font:650 12.5px system-ui,sans-serif;cursor:pointer;flex:none}.mi .ac button:disabled{opacity:.55;cursor:default}'
    + '.mi .ac .hl{font-size:11.5px;color:var(--ink2);line-height:1.45;flex:1 1 200px;min-width:0}'
    + '.mi .ot{display:none;font-size:12px;line-height:1.45;padding:7px 10px;border-radius:9px;background:var(--good-a);color:var(--ink)}.mi .ot.on{display:block}.mi .ot.bad{background:var(--warn-a)}'
    + '.mi details.dn{font-size:11.5px;color:var(--ink2);line-height:1.55}.mi details.dn>summary{cursor:pointer;color:var(--mut);font-weight:600}.mi details.dn p{margin:6px 0 0;overflow-wrap:anywhere}'
    + '.mi a.lk{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;padding:12px 16px;border-radius:14px;border:1px solid var(--ln);background:var(--s1);color:var(--ink);font-size:12.5px;text-decoration:none;line-height:1.45}.mi a.lk span:last-child{font-weight:700;color:var(--gold);white-space:nowrap}'
    + '.mi .wn b{color:var(--ink2)}'
    + '.mi .emp{font-size:12.5px;color:var(--mut);padding:10px 2px;line-height:1.5}'
    + '.mi .fn{display:flex;flex-direction:column;gap:7px}.mi .fr{display:grid;grid-template-columns:minmax(0,132px) minmax(0,1fr) 52px;gap:9px;align-items:center;font-size:12px}'
    + '.mi .fr span{color:var(--ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mi .fr .tr{height:10px;background:var(--s2);border-radius:999px;overflow:hidden}.mi .fr .tr i{display:block;height:100%;border-radius:999px;background:var(--f3,var(--gold))}'
    + '.mi .fr em{font-style:normal;text-align:right;font-weight:700;font-variant-numeric:tabular-nums}.mi .fr.z em{color:var(--crit)}'
    + '.mi .ql{display:flex;flex-direction:column;gap:5px;margin-top:2px}.mi .ql div{display:grid;grid-template-columns:minmax(0,1fr) 40px;gap:8px;font-size:12px;color:var(--ink2)}.mi .ql div span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mi .ql div b{text-align:right;font-variant-numeric:tabular-nums}'
    + '.mi .hc{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}@media(max-width:980px){.mi .hc{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.mi .hc{grid-template-columns:minmax(0,1fr)}}'
    + '.mi .hk{display:flex;gap:9px;align-items:flex-start;padding:9px 11px;border-radius:10px;font-size:12px;line-height:1.4;background:var(--good-a);color:var(--ink)}.mi .hk.bad{background:var(--crit-a)}'
    + '.mi .hk u{text-decoration:none;font-weight:800;flex:none;color:var(--good)}.mi .hk.bad u{color:var(--crit)}'
    + '.mi details.more{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:12px 16px}.mi details.more>summary{cursor:pointer;font-weight:650;font-size:13px;color:var(--ink2)}.mi details.more[open]>summary{margin-bottom:10px}'
    + '.mi .sc td.r,.mi .sc th.r{text-align:right}.mi .note{font-size:11.5px;color:var(--mut);line-height:1.5;margin:8px 0 0}'
    + '@media(max-width:560px){.mi .fr{grid-template-columns:minmax(0,104px) minmax(0,1fr) 46px}}';

  o('<!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Starshopping · Бараа хайлт</title><style>' + CSS + '</style></head><body><div class="w">');
  o('<header><div class="hd"><div class="bm">S</div><div><div class="bt">Бараа хайлт</div><div class="bs">ялагч бараа шалгаруулах систем · ' + esc(mdhm(d.generated_at)) + ' УБ</div></div><div class="sp"></div><a class="rf" href="">Шинэчлэх</a></div></header>');
  o(typeof ssNav === 'function' ? ssNav('mine', themeQ) : '');
  if (!d.ok) { o('<div class="al crit"><span class="tag">алдаа</span><span>Өгөгдөл ирсэнгүй (mine_page).</span></div></div></body></html>'); return out.join(''); }

  const F = d.funnel || {};
  const OW = A(d.owner).filter((r) => r && typeof r === 'object');
  const RATE = OW.filter((r) => !r.hold);
  const HOLD = OW.filter((r) => r.hold);
  const CK = A(d.checks);
  const bad = CK.filter((c) => !c.ok).length;
  const left = n(F.backlog_new) + n(F.mn_queue);
  const lv = n(F.cands) > 0 ? 'good' : OW.length > 0 ? 'warn' : bad > 0 ? 'crit' : 'warn';
  const HC = { good: 'var(--good)', warn: 'var(--warn)', crit: 'var(--crit)' }[lv];
  const HA = { good: 'var(--good-a)', warn: 'var(--warn-a)', crit: 'var(--crit-a)' }[lv];
  const t1 = n(F.cands) > 0 ? 'Бүх шүүлтийг давсан ' + n(F.cands) + ' бараа «Тест» хуудсанд байна'
    : RATE.length > 0 ? 'Чиний нүд хэрэгтэй ' + RATE.length + ' бараа байна'
      : HOLD.length > 0 ? 'Чиний шийдвэр хүлээж буй ' + HOLD.length + ' бараа байна' : 'Одоогоор чамаас хүлээх зүйл алга';
  const t2 = 'Бүх шүүлтийг давсан ' + n(F.cands) + ' · Монголын шалгалт хүлээж буй ' + n(F.mn_queue) + ' · үнэлгээ хүлээж буй ' + n(F.backlog_new)
    + (bad ? ' · системийн шалгалт ' + bad + ' улаан' : ' · системийн шалгалт бүгд ногоон');

  o('<div class="mi">');
  o('<div class="hero" style="--hc:' + HC + ';--ha:' + HA + '"><div class="ic">' + (lv === 'good' ? '★' : OW.length > 0 ? '👁' : '!') + '</div><div class="tx"><div class="t1">' + esc(t1) + '</div><div class="t2">' + esc(t2) + '</div></div><div class="win">сүүлийн 24 цаг</div></div>');

  o('<div class="krow krow4">');
  const K = (l, v, s, c) => o('<div class="k"><div class="kl">' + esc(l) + '</div><div class="kv"' + (c ? ' style="color:var(--' + c + ')"' : '') + '>' + v + '</div><div class="ks">' + s + '</div></div>');
  K('Үзсэн бараа', num(F.scanned), 'санд орсон <b>' + num(F.added) + '</b>');
  K('Бичлэгээр үнэлсэн', num(F.rated), '70+ оноо <b>' + num(F.ge70) + '</b> · нөөц (60–69) <b>' + num(F.band_60_69) + '</b>');
  K('Монголд элбэг гэж хаагдсан', num(F.ge70_saturated), '70+ авсан ' + num(F.ge70) + '-аас', n(F.ge70) && n(F.ge70_saturated) / n(F.ge70) > 0.5 ? 'warn' : '');
  K('Бүх шүүлтийг давсан', num(F.cands), 'эзний харах <b>' + num(F.owner_look) + '</b> · онцолсон <b>' + num(F.featured_now) + '</b>', n(F.cands) > 0 ? 'good' : 'crit');
  o('</div>');

  /* LN: «Тест» хуудастай холбоос — хоёр хуудас нэг шугам: Хайлт (олох, чиний нүд) → Тест (8 шүүлтүүр давсан бараа, эзэн шалгах, тест эхлүүлэх) */
  o('<a class="lk" href="/board/?view=tests' + (themeQ ? '&amp;theme=' + themeQ : '') + '"><span><b>Дараагийн алхам — «Тест» хуудас</b> · бүх шүүлтийг давсан <b>' + num(F.cands) + '</b> · эзэн шалгах (1–2 шүүлтүүрт унасан) <b>' + num(F.review) + '</b></span><span>нээх →</span></a>');
  o('<div class="g2">');
  // ── Чиний нүд хэрэгтэй
  const tags = (r) => '<div class="tg">'
    + (r.hold ? '<i class="y">шийдвэр хүлээж буй</i>' : '<i class="y">нөөц</i>')
    + (has(r.model_pct) ? '<i>загвар ' + n(r.model_pct) + '%</i>' : '')
    + (has(r.owner_pct) ? '<i>чи ' + n(r.owner_pct) + '%</i>' : '')
    + (has(r.sellers) ? '<i class="' + (n(r.sellers) <= 1 ? 'g' : '') + '">Монголд ' + n(r.sellers) + ' зарагч</i>' : '')
    + (has(r.mn_min) || has(r.mn_max) ? '<i>Монголд ' + (has(r.mn_min) && has(r.mn_max) && n(r.mn_min) !== n(r.mn_max) ? num(r.mn_min) + '–' + num(r.mn_max) : num(has(r.mn_max) ? r.mn_max : r.mn_min)) + '₮</i>' : '')
    + (has(r.usd) ? '<i>АНУ-д $' + esc(r.usd) + '</i>' : '') + (has(r.units_day) ? '<i>өдөрт ' + num(r.units_day) + ' ш</i>' : '') + '</div>';
  const vbtn = (r) => (http(r.video) ? '<a class="vd" href="' + esc(http(r.video)) + '" target="_blank" rel="noopener">▶ Бичлэг үзэх</a>' : '');
  o('<div class="cd"><div class="ch"><b>Чиний нүд хэрэгтэй</b><span>бичлэгийг үзээд хувиа өг · 70+ бол Досьед орно</span></div>');
  if (!OW.length) o('<div class="emp">Одоогоор хоосон. Нөөц бараа (60–69 оноо, бичлэг хүчтэй) Монголын шалгалтыг давмагц энд гарна — хүлээж буй ' + num(F.mn_queue) + '.</div>');
  RATE.forEach((r) => {
    o('<div class="it"><div class="nm">' + esc(r.name) + '</div>' + tags(r)
      + (A(r.soft).length ? '<div class="wn">' + esc(A(r.soft).join(' · ')) + '</div>' : '')
      + '<div class="ac">' + vbtn(r)
      + '<input class="mwy" type="text" maxlength="300" placeholder="яагаад (заавал биш)" aria-label="Шалтгаан">'
      + '<input class="mpc" type="number" min="0" max="100" inputmode="numeric" placeholder="%" aria-label="Миний хувь">'
      + '<button type="button" data-save="' + esc(r.id) + '">Хадгалах</button></div><div class="ot" role="status"></div></div>');
  });
  HOLD.forEach((r) => {
    /* LN (11-22): «шийдвэр хүлээж буй» бараанд ч хувь өгнө — 70+ = эзний шийдвэрээр оролтын хаалгыг давуулж санд оруулна (Тест хуудасны «Эзэн шалгах»), доош = хаагдана */
    o('<div class="it"><div class="nm">' + esc(r.name) + '</div>' + tags(r)
      + (A(r.soft).length ? '<div class="wn">' + esc(A(r.soft).join(' · ')) + '</div>' : '')
      + '<div class="wn">Оролтын хаалга татгалзсан бараа. Бичлэг ба доорх тэмдэглэлээс өртөг, шаардлагатай үнийг хараад шийд: <b>70+</b> өгвөл чиний шийдвэрээр санд орж, «Тест» хуудасны «Эзэн шалгах» хэсэгт унасан шүүлтүүртэйгээ гарна · <b>70-аас доош</b> бол хаагдана.</div>'
      + (r.note ? '<details class="dn" data-keep="mi-note-' + esc(r.id) + '"><summary>Досьегийн тэмдэглэл (өртөг, шаардлагатай үнэ)</summary><p>' + esc(r.note) + '</p></details>' : '')
      + '<div class="ac">' + vbtn(r)
      + '<input class="mwy" type="text" maxlength="300" placeholder="яагаад (заавал биш)" aria-label="Шалтгаан">'
      + '<input class="mpc" type="number" min="0" max="100" inputmode="numeric" placeholder="%" aria-label="Миний хувь">'
      + '<button type="button" data-save="' + esc(r.id) + '">Хадгалах</button></div><div class="ot" role="status"></div></div>');
  });
  o('</div>');

  // ── Юүлүүр + дараалал
  const mx = Math.max(1, n(F.scanned));
  const pass60 = n(F.ge70) + n(F.band_60_69);
  const FR = [['Үзсэн', F.scanned], ['Санд орсон', F.added], ['Үнэлсэн', F.rated], ['60+ оноо', pass60], ['Чиний нүд / онцлох', n(F.owner_look) + n(F.featured_now)], ['Бүх шүүлт давсан', F.cands]];
  o('<div class="cd"><div class="ch"><b>Юүлүүр</b><span>сүүлийн 24 цаг</span></div><div class="fn">');
  FR.forEach((x, i) => { o('<div class="fr' + (i === FR.length - 1 && !n(x[1]) ? ' z' : '') + '"><span>' + esc(x[0]) + '</span><div class="tr"><i style="width:' + Math.min(100, Math.max(n(x[1]) ? 2 : 0, Math.round(n(x[1]) / mx * 100))) + '%"></i></div><em>' + num(x[1]) + '</em></div>'); });
  o('</div><div class="ch" style="margin-top:6px"><b>Монголын шалгалт хүлээж буй</b><span>' + num(F.mn_queue) + ' бараа · загварын оноо</span></div><div class="ql">');
  A(d.mn_queue).slice(0, 6).forEach((x) => { o('<div><span>' + esc(x.name) + '</span><b>' + n(x.pct) + '%</b></div>'); });
  if (!A(d.mn_queue).length) o('<div><span>Дараалал хоосон</span><b></b></div>');
  o('</div></div>');
  o('</div>');

  // ── Системийн өөрийн шалгалт
  const LB = { winners_gate: 'Манай 2 ялагч бараа шүүлтэд унахгүй байна', eye_recall: 'Чиний 70+ өгсөн барааг загвар хаахгүй байна', runs_24h: 'Ажиллагаа бүр зогссон шалтгаанаа бичсэн',
    eye_video: 'Үнэлгээ бүр бичлэгтэй (таамгаар үнэлээгүй)', overlap: 'Хоёр ажиллагаа зэрэг яваагүй', stuck: 'Бараа 24 цагаас удаан гацаагүй' };
  o('<div class="cd"><div class="ch"><b>Системийн өөрийн шалгалт</b><span>' + (bad ? bad + ' улаан — засах ёстой' : 'бүгд ногоон') + '</span></div><div class="hc">');
  CK.forEach((c) => { o('<div class="hk' + (c.ok ? '' : ' bad') + '"><u>' + (c.ok ? '✓' : '✕') + '</u><span>' + esc(LB[c.key] || c.what || c.key) + '</span></div>'); });
  o('</div></div>');

  // ── Дэлгэрэнгүй
  const TN = { mine: 'Уурхайчин', dossier: 'Досье' };
  const SR = { time: 'цаг дууссан', tool_cap: 'дуудлагын хязгаар', queue_empty: 'дараалал дууссан', backlog_empty: 'ажил дууссан', '1688_cap': '1688-ийн хязгаар', wall: 'хана' };
  o('<details class="more" data-keep="mi-more"><summary>Сүүлийн ажиллагаанууд ба дүрэм</summary><div class="sc"><table><thead><tr><th>Цаг</th><th>Ажил</th><th class="r">Минут</th><th class="r">Үзсэн</th><th class="r">Үнэлсэн</th><th>Зогссон шалтгаан</th></tr></thead><tbody>');
  A(d.runs).forEach((r) => { o('<tr><td>' + esc(r.at) + '</td><td>' + esc(TN[r.task] || r.task || '—') + '</td><td class="r">' + (has(r.min) ? n(r.min) : '—') + '</td><td class="r">' + (has(r.scanned) ? num(r.scanned) : '—') + '</td><td class="r">' + (has(r.rated) ? num(r.rated) : '—') + '</td><td>' + esc(SR[r.stop] || r.stop || '—') + '</td></tr>'); });
  o('</tbody></table></div><p class="note">Зам: 70+ оноо → Монголын шалгалт → Досье (1688-ийн өртөг, 8 шүүлтүүр) → «Тест» хуудас. Нөөц зам: 60–69 оноо, бичлэг хүчтэй → Монголын шалгалт (5 хүртэл зарагч) → чиний нүд → 70+ өгвөл Досье. Монголд 6+ зарагчтай бараа аль ч замд хаагдана. Ашгийн босго 35,000₮/захиалга.</p></details>');

  o('</div>');
  // ── үйлдэл: эзний хувь хадгалах (шууд Supabase RPC, түлхүүрийг DB шалгана)
  o('<script>(function(){var root=document.querySelector(".mi");if(!root)return;'
    + 'function say(el,msg,bad){if(!el)return;el.className="ot out on"+(bad?" bad":"");el.textContent=(bad?"⚠️ ":"✅ ")+msg}'
    + 'root.querySelectorAll("button[data-save]").forEach(function(b){b.addEventListener("click",function(){'
    + 'var card=b.closest(".it"),inp=card.querySelector("input.mpc"),wy=card.querySelector("input.mwy"),out=card.querySelector(".ot"),v=(inp.value||"").trim();'
    + 'if(!/^[0-9]{1,3}$/.test(v)||+v>100){say(out,"0–100 хооронд бүхэл тоо оруул",true);inp.focus();return}'
    + 'if(!window.ssRpc){say(out,"Хуудсаа дахин ачаална уу",true);return}'
    + 'b.disabled=true;var tx=b.textContent;b.textContent="…";'
    + 'window.ssRpc("mine_eye_save",{id:b.getAttribute("data-save"),pct:v,why:wy?wy.value:""}).then(function(j){if(!j||j.ok===false)throw new Error((j&&j.error)||"алдаа");'
    + 'b.textContent="✓";inp.disabled=true;if(wy)wy.disabled=true;say(out,j.msg||"Хадгаллаа");'
    + 'setTimeout(function(){out.className="ot";if(window.ssRefresh)window.ssRefresh();else location.reload()},1800)})'
    + '.catch(function(x){b.disabled=false;b.textContent=tx;say(out,x.message,true)})})})})();</scr' + 'ipt>');
  o('</div></body></html>');
  return out.join('');
}
