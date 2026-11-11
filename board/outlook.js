/* Самбар · 7 ХОНОГИЙН БОРЛУУЛАЛТЫН ТААМАГ (блок GQ, 2026-11-11 — эзэн: «унал босолтыг 7 хоногийн хэмжээнд урдчилж хардаг алгоритм»,
   «Хүрээ хуудсанд нэмэлтээр, нүүрт бараа тус бүрийн товч хувилбар»).
   Өгөгдөл: board_read view 'outlook' → sales_outlook7(p). Хоёр хэлбэр: ssOutlook(OUT, 'full') — Хүрээ хуудас, ssOutlook(OUT, 'compact') — нүүр.
   Зөвхөн УНШИНА. Таамаг бүр sales_forecast_log-д өдөр бүр 09:05 бичигдэж, 7 хоногийн дараа бодиттой тулгагдана (нарийвчлал доор харагдана). */
function ssOutlook(OUT, mode, themeQ) {
  const D = OUT || {};
  const P = Array.isArray(D.products) ? D.products : [];
  const n = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? 0 : Number(v));
  const has = (v) => v !== null && v !== undefined && v !== '' && !isNaN(Number(v));
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const DIR = { up: ['ok', '↑ өсөх'], down: ['cr', '↓ буурах'], flat: ['nt', '→ тогтвортой'], na: ['nt', '—'] };
  const RF = (p) => (p.refresh_in === 0 ? ['cr', 'Бичлэг солих: ОДОО'] : has(p.refresh_in) && n(p.refresh_in) <= 14 ? ['wr', 'Бичлэг солих: ' + n(p.refresh_in) + ' хоногийн дараа'] : ['ok', 'Бичлэг солих шаардлагагүй']);
  const AC = D.accuracy || {};
  const accTxt = n(AC.n) > 0 ? 'Нарийвчлал: ' + n(AC.n) + ' таамаг шалгагдсан · дундаж алдаа ' + n(AC.mae_pct) + '% · хүрээнд орсон ' + n(AC.in_band_pct) + '%'
                             : 'Нарийвчлал: таамаг өдөр бүр бүртгэгдэж, 7 хоногийн дараа бодиттой тулгагдана (эхний шалгалт 11/18)';
  const CSS = '<style>.so7{display:flex;flex-direction:column;gap:12px}'
    + '.so7 .o7c{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:12px;min-width:0}'
    + '.so7 .o7h{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}'
    + '.so7 .o7n{font-size:16px;font-weight:700;color:var(--ink)}.so7 .o7l{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}'
    + '.so7 .o7ps{display:flex;gap:6px;flex-wrap:wrap}.so7 .o7p{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:650;white-space:nowrap}'
    + '.so7 .o7p.ok{background:var(--good-a);color:var(--good)}.so7 .o7p.wr{background:var(--warn-a);color:var(--warn)}.so7 .o7p.cr{background:var(--crit-a);color:var(--crit)}.so7 .o7p.nt{background:var(--s2);color:var(--ink2)}'
    + '.so7 .o7b{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.so7 .o7b b{font-size:30px;font-weight:700;line-height:1;color:var(--ink);font-variant-numeric:tabular-nums}'
    + '.so7 .o7b span{font-size:13px;color:var(--ink2)}.so7 .o7w{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:3px;font-size:13px;color:var(--ink2)}'
    + '.so7 .o7ch{width:100%;max-width:640px;height:auto;display:block}.so7 .o7lg{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--ink2)}.so7 .o7lg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}'
    + '.so7 .o7m{font-size:12px;color:var(--mut)}.so7 details{font-size:12.5px;color:var(--ink2)}.so7 summary{cursor:pointer;font-weight:650;color:var(--ink)}'
    + '.so7 .o7r{display:grid;grid-template-columns:minmax(0,1.4fr) auto auto;gap:10px;align-items:center;padding:10px 14px;border-top:1px solid var(--ln3)}.so7 .o7r:first-child{border-top:0}'
    + '.so7 .o7r .o7t{font-size:14px;font-weight:650;color:var(--ink);min-width:0}.so7 .o7r .o7t small{display:block;font-weight:400;font-size:12px;color:var(--ink2)}'
    + '.so7 .o7rs{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:4px 0}'
    + '@media(max-width:640px){.so7 .o7r{grid-template-columns:auto auto;gap:6px}.so7 .o7r .o7t{grid-column:1/-1}.so7 .o7b b{font-size:26px}}</style>';

  function chart(p) {
    const S = Array.isArray(p.series) ? p.series : [];
    if (!S.length) return '';
    const lvl = n(p.level_day), g = Math.log(1 + n(p.g_day_pct) / 100);
    const F = []; for (let k = 1; k <= 7; k++) F.push(lvl * Math.exp(g * k));
    const all = S.map((s) => n(s.o)).concat(F);
    const max = Math.max(1, ...all) * 1.15;
    const W = 460, H = 150, L = 26, B = 22, T = 8, N = S.length + 7, bw = (W - L - 6) / N;
    const y = (v) => T + (H - T - B) * (1 - v / max);
    let s = '<svg class="o7ch" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Сүүлийн 14 өдрийн захиалга ба ирэх 7 хоногийн таамаг">';
    [0, Math.round(max / 2), Math.floor(max)].forEach((v) => { s += '<line x1="' + L + '" x2="' + (W - 4) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--ln3)" stroke-width="1"/><text x="' + (L - 5) + '" y="' + (y(v) + 4) + '" font-size="13" text-anchor="end" fill="var(--mut)">' + v + '</text>'; });
    S.forEach((d, i) => { const v = n(d.o); s += '<rect x="' + (L + i * bw + 2) + '" y="' + y(v) + '" width="' + (bw - 4) + '" height="' + Math.max(0, y(0) - y(v)) + '" rx="2" fill="' + (n(d.sp) > 0 ? 'var(--ink2)' : 'var(--ln2)') + '"><title>' + esc(String(d.d).slice(5)) + ': ' + v + ' захиалга</title></rect>'; });
    F.forEach((v, k) => { const i = S.length + k; s += '<rect x="' + (L + i * bw + 2) + '" y="' + y(v) + '" width="' + (bw - 4) + '" height="' + Math.max(0, y(0) - y(v)) + '" rx="2" fill="var(--f3)" opacity=".45"><title>таамаг ' + v.toFixed(1) + '</title></rect>'; });
    const xT = L + S.length * bw;
    s += '<line x1="' + xT + '" x2="' + xT + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--f3)" stroke-dasharray="3 3"/>';
    s += '<text x="' + (L + 2) + '" y="' + (H - 6) + '" font-size="13" fill="var(--mut)">' + esc(String(S[0].d).slice(5).replace('-', '/')) + '</text>';
    s += '<text x="' + (xT + 3) + '" y="' + (H - 6) + '" font-size="13" fill="var(--f3)">өнөөдөр →</text></svg>';
    return s + '<div class="o7lg"><span><i style="background:var(--ink2)"></i>бодит захиалга</span><span><i style="background:var(--f3);opacity:.45"></i>таамаг</span><span><i style="background:var(--ln2)"></i>зар унтраалттай өдөр</span></div>';
  }

  const out = [CSS, '<div class="so7">'];
  // Таамгийн өгөгдөл мөн эсэх (GQ SQL суугаагүй бол board_read өөр өгөгдөл буцаадаг)
  if (!(D.ok && D.as_of && Array.isArray(D.products) && (!D.products.length || 'status' in D.products[0]))) {
    out.push('<div class="o7c"><div class="o7m">Таамгийн өгөгдөл ирсэнгүй — Supabase-д <b>2026-11-11-GQ-sales-outlook-PASTE.sql</b>-ийг ажиллуулсны дараа энд график гарна.</div></div></div>');
    return out.join('');
  }
  if (!P.length) { out.push('<div class="o7m">Таамаглах бараа алга (зар явсан бараа байхгүй).</div></div>'); return out.join(''); }
  if (mode === 'compact') {
    out.push('<div class="o7rs">');
    P.forEach((p) => {
      const dr = DIR[p.dir] || DIR.na, rf = RF(p);
      out.push('<div class="o7r"><div class="o7t">' + esc(p.name)
        + (p.status === 'ok' ? '<small>ирэх 7 хоногт ≈' + Math.round(n(p.forecast7)) + ' захиалга (' + n(p.lo) + '–' + n(p.hi) + ') · өмнөх 7 хоногт ' + n(p.last7) + '</small>'
                              : '<small>' + esc(String(p.line || '').split(': ').slice(1).join(': ')) + '</small>')
        + '</div>' + (p.status === 'ok' ? '<span class="o7p ' + dr[0] + '">' + dr[1] + '</span><span class="o7p ' + rf[0] + '">' + rf[1] + '</span>' : '<span></span><span></span>') + '</div>');
    });
    out.push('</div><div class="o7m"><a href="/board/?view=reach' + (themeQ ? '&theme=' + themeQ : '') + '">Дэлгэрэнгүй, шалтгаан, график → Хүрээ</a> · ' + esc(accTxt) + '</div></div>');
    return out.join('');
  }
  P.forEach((p) => {
    const dr = DIR[p.dir] || DIR.na, rf = RF(p);
    out.push('<article class="o7c"><div class="o7h"><div><div class="o7l">Ирэх 7 хоног</div><div class="o7n">' + esc(p.name) + '</div></div>');
    if (p.status !== 'ok') { out.push('</div><div class="o7m">' + esc(String(p.line || '').split(': ').slice(1).join(': ')) + '</div></article>'); return; }
    out.push('<div class="o7ps"><span class="o7p ' + dr[0] + '">' + dr[1] + '</span><span class="o7p ' + rf[0] + '">' + rf[1] + '</span></div></div>');
    out.push('<div class="o7b"><b>≈' + Math.round(n(p.forecast7)) + '</b><span>захиалга ирэх 7 хоногт · хүрээ ' + n(p.lo) + '–' + n(p.hi) + ' · өмнөх 7 хоногт ' + n(p.last7) + '</span></div>');
    out.push(chart(p));
    const W = Array.isArray(p.why) ? p.why : [];
    if (W.length) out.push('<ul class="o7w">' + W.map((w) => '<li>' + esc(w) + '</li>').join('') + '</ul>');
    out.push('<details><summary>Хэрхэн тооцдог вэ</summary><p>Одоогийн зарын үе (' + esc(String(p.run_start || '').slice(5).replace('-', '/')) + '-аас, ' + n(p.active_days) + ' өдөр). '
      + 'Өдрийн түвшин ≈' + n(p.level_day) + ' захиалга (сүүлийн өдрүүдэд илүү жин). Чиг өдөрт ' + n(p.g_day_pct) + '% = захиалгын чиг (' + n(p.trend_orders_day_pct) + '%/өдөр) ба '
      + 'Meta-гийн 1$-д ногдох шинэ хүний чиг (' + (has(p.trend_newpeople_per_usd_day_pct) ? n(p.trend_newpeople_per_usd_day_pct) + '%/өдөр' : '—') + ')-ийн дундаж, тус бүрийг хагасаар багасгасан. '
      + 'Хүрээ = ±(1.64√таамаг + 25%). «Бичлэг солих ОДОО» = 1$-д ногдох шинэ хүн үеийн эхнээс 40%-иас их буурсан.</p></details>');
    out.push('</article>');
  });
  out.push('<div class="o7m">' + esc(accTxt) + '</div></div>');
  return out.join('');
}
