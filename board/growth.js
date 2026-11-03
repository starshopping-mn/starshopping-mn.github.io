/* Самбар · ӨСӨЛТИЙН ШАТ (блок EK, 2026-11-03 — эзэн «сүүлийн дүгнэлтийг системд шинэ хуудас болгож, аль шат эхлэх цаг болсныг signal-аар»)
   Өгөгдөл: ?view=growth → board_read view 'growth' → growth_plan(p) (30 мин кэштэй, n8n зарцуулахгүй).
   3 шат = Starshopping-ийн өөрийн өсөлт (бусдад систем/үйлчилгээ зарахгүй — эзэн 11/03):
     1 Өөрийн брэнд → 2 Бөөний нийлүүлэлт → 3 Нийлүүлэлтийн гинжээ эзэмших.
   Шат бүр = шалгуурууд (бодит утга / зорилт → %). Бүгд 100% → Telegram «эхлэх цаг боллоо» (growth_tick, өдөр бүр 10:15).
   Зорилтууд cost_settings-д (g1_* g2_* g3_*); шат эхэлсэн тэмдэг growth_started_N — эзэн хэлэхэд Claude тавина. */
function renderGrowth(DATA, QUERY) {
  const d = DATA || {};
  const Q = QUERY || {};
  const themeQ = Q.theme === 'dark' || Q.theme === 'light' ? Q.theme : '';
  const A = (v) => (Array.isArray(v) ? v : []);
  const n = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? 0 : Number(v));
  const has = (v) => v !== null && v !== undefined && v !== '' && !isNaN(Number(v));
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const bn = (v) => { if (!has(v)) return '—'; const x = Math.abs(n(v)); const s = x >= 1e6 ? (x / 1e6).toFixed(2).replace(/\.?0+$/, '') + ' сая' : x >= 1e3 ? Math.round(x / 1e3) + ' мянга' : String(Math.round(x)); return (n(v) < 0 ? '−' : '') + s; };
  const val = (v, u) => {
    if (!has(v)) return '—';
    if (u === '₮') return bn(v) + '₮';
    if (u === '%') return Math.round(n(v)) + '%';
    if (u === 'ш/өдөр') return (Math.round(n(v) * 10) / 10) + ' ш/өдөр';
    return Math.round(n(v)).toLocaleString('en-US') + ' ' + u;
  };
  const day = (s) => (s ? String(s).slice(5, 10).replace('-', '/') : '—');

  const out = [];
  const o = (s) => out.push(s);

  const CSS = '.w{max-width:1200px;margin:0 auto;padding:14px 16px 60px}'
    + '.nav{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 6px}.nav a{padding:8px 14px;border-radius:999px;border:1px solid var(--ln);background:var(--s1);color:var(--ink2);text-decoration:none;font-size:13px;font-weight:600}.nav a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
    + '.gw{display:flex;flex-direction:column;gap:22px;margin-top:10px}'
    + '.gw .nm{font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}'
    + '.gw .cd{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:18px 20px;min-width:0;display:flex;flex-direction:column;gap:12px}'
    + '.gw .cd.lk{opacity:.72}'
    + '.gw .cd.cur{border-color:var(--ink2);box-shadow:0 0 0 1px var(--ink2) inset}'
    + '.gw .cd.go{border-color:var(--good);box-shadow:0 0 0 1px var(--good) inset}'
    + '.gw .lb{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}'
    + '.gw .sb{font-size:12.5px;color:var(--ink2);line-height:1.45}'
    + '.gw .mu{color:var(--mut)}'
    + '.gw .h{margin:0;font-size:18px;font-weight:700;color:var(--ink);letter-spacing:0;text-transform:none}.gw .h:after{display:none}'
    + '.gw .hr{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px}'
    + '.gw .g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}'
    + '.gw .big{font-size:40px;font-weight:650;line-height:1;margin:2px 0}'
    + '.gw .pl{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap;align-self:flex-start}'
    + '.gw .pl.ok{background:var(--good-a);color:var(--good)}.gw .pl.wr{background:var(--warn-a);color:var(--warn)}.gw .pl.bl{background:var(--blue-a);color:var(--f3)}.gw .pl.nt{background:var(--s2);color:var(--ink2)}'
    + '.gw .bar{height:10px;background:var(--s2);border-radius:999px;overflow:hidden}.gw .bar i{display:block;height:100%;border-radius:999px;background:var(--ink2)}.gw .bar i.ok{background:var(--good)}.gw .bar i.wr{background:var(--warn)}'
    + '.gw .cr{display:flex;flex-direction:column;gap:5px;padding:10px 0;border-top:1px solid var(--ln3)}'
    + '.gw .cr .crt{display:flex;justify-content:space-between;gap:10px;font-size:13.5px;align-items:baseline}.gw .cr .crt b{font-weight:600;white-space:nowrap}'
    + '.gw .cr .bar{height:6px}'
    + '.gw .ban{display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:14px 18px;border-radius:14px;background:var(--s2);border:1px solid var(--ln2)}.gw .ban.ok{background:var(--good-a)}.gw .ban.cr2{background:var(--crit-a)}'
    + '.gw .ban .tx{flex:1 1 380px;font-size:14.5px;line-height:1.5;color:var(--ink)}'
    + '.gw .arw{display:flex;align-items:center;justify-content:center;color:var(--mut);font-size:18px}'
    + '.gw svg.sp{width:100%;height:46px;display:block}'
    + '.gw .rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:10px}'
    + '.gw .rules .cd{gap:6px;padding:14px 16px}'
    + '@media(max-width:860px){.gw .g3{grid-template-columns:minmax(0,1fr)}.gw .big{font-size:34px}.gw .cd{padding:15px 14px}}'
    + 'footer{margin:26px 0 10px;font-size:12px;color:var(--mut)}';

  o('<!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Starshopping · Өсөлтийн шат</title><style>' + CSS + '</style></head><body><div class="w">');
  o('<header><div class="hd"><div class="bm">S</div><div><div class="bt">Starshopping</div>');
  o('<div class="bs">өсөлтийн шат · ' + esc(String(d.generated_at || '').replace('T', ' ').slice(0, 16)) + ' UTC' + (d.cached ? ' · кэш' : '') + '</div></div>');
  o('<div class="sp"></div><a class="rf" href="">Шинэчлэх</a></div></header>');
  o(typeof ssNav === 'function' ? ssNav('growth', themeQ) : '');

  const ST = A(d.stages);
  if (!d.ok || !ST.length) {
    o('<div class="gw"><div class="ban cr2"><div class="tx"><b>Өсөлтийн шатны өгөгдөл ирсэнгүй.</b> Supabase-д <code>2026-11-03-EK-growth-stages-PASTE.sql</code>-ийг ажиллуулаагүй байж магадгүй.</div></div></div></div></body></html>');
    return out.join('');
  }

  const cur = ST.find((s) => s.n === d.current) || ST[0];
  const status = (s) => s.started ? ['bl', 'Эхэлсэн'] : s.ready ? ['ok', '🚀 Эхлэх цаг боллоо'] : s.locked ? ['nt', 'Өмнөх шат эхлэхийг хүлээж байна'] : ['wr', 'Бэлтгэж байна'];
  const tone = (p) => (n(p) >= 100 ? 'ok' : n(p) >= 50 ? '' : 'wr');
  const missing = (s) => A(s.crit).filter((c) => n(c.pct) < 100);

  // ── дүгнэлт
  const miss = missing(cur);
  o('<div class="gw">');
  o('<section class="ban ' + (cur.ready ? 'ok' : '') + '" aria-label="Дүгнэлт"><span class="pl ' + status(cur)[0] + '">Шат ' + cur.n + ' · ' + Math.round(n(cur.pct)) + '%</span><div class="tx">'
    + (cur.ready
      ? '<b>' + esc(cur.name) + '</b> — бүх шалгуур биелсэн, <b>эхлэх цаг боллоо</b>. Эхлүүлэх бол Claude-д хэлээрэй; дараагийн шат нээгдэнэ.'
      : 'Одоогийн шат: <b>' + esc(cur.name) + '</b> — ' + Math.round(n(cur.pct)) + '% бэлэн. Дутуу: ' + miss.map((c) => esc(c.label.split(' (')[0]) + ' ' + Math.round(n(c.pct)) + '%').join(' · ') + '.')
    + '<br><span class="sb">Яаралтай биш. Шат бүрийн бүх шалгуур 100% болмогц Telegram-аар нэг удаа мэдэгдэнэ; сар бүрийн 1-нд явцын товч ирнэ. ' + esc(d.note || '') + '</span></div></section>');

  // ── 3 шат
  const spark = (h) => {
    const H = A(h); if (H.length < 2) return '<div class="sb mu">Явцын түүх ' + day(H.length ? H[0].d : d.ub_date) + '-аас өдөр бүр хуримтлагдана.</div>';
    const W = 300, Ht = 46, x = (i) => 4 + (i / (H.length - 1)) * (W - 8), y = (p) => Ht - 4 - (Math.min(100, n(p)) / 100) * (Ht - 8);
    const pts = H.map((r, i) => x(i).toFixed(1) + ',' + y(r.pct).toFixed(1)).join(' ');
    return '<svg class="sp" viewBox="0 0 ' + W + ' ' + Ht + '" preserveAspectRatio="none" role="img" aria-label="Явц ' + day(H[0].d) + '–' + day(H[H.length - 1].d) + '"><line x1="0" x2="' + W + '" y1="' + y(100) + '" y2="' + y(100) + '" stroke="var(--ln2)" stroke-dasharray="3 3"/><polyline points="' + pts + '" fill="none" stroke="var(--ink2)" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>'
      + '<div class="sb mu">' + day(H[0].d) + ' ' + Math.round(n(H[0].pct)) + '% → ' + day(H[H.length - 1].d) + ' ' + Math.round(n(H[H.length - 1].pct)) + '%</div>';
  };
  const trendTxt = (s) => {
    const t = s.trend || {};
    const parts = [];
    if (has(t.prev_pct)) parts.push('Сарын өмнө ' + Math.round(n(t.prev_pct)) + '% → одоо ' + Math.round(n(s.pct)) + '%');
    if (has(t.eta_days)) parts.push('энэ хурдаар ~' + n(t.eta_days) + ' хоногт 100%');
    else if (n(t.n) < 7 && n(s.pct) < 100) parts.push('хүрэх хугацааг 7+ хоногийн өгөгдлөөр тооцно');
    else if (has(t.slope_day) && n(t.slope_day) <= 0 && n(s.pct) < 100) parts.push('сүүлийн 30 хоногт ахиагүй');
    return parts.join(' · ');
  };

  o('<section class="col" aria-label="Шатууд" style="display:flex;flex-direction:column;gap:12px"><div class="hr"><h2 class="h">Гурван шат — нэг нь дараагийнхаа мөнгийг төлнө</h2><span class="sb">Өмнөх шат эхэлсний дараа л дараагийнх нээгдэнэ</span></div><div class="g3">');
  ST.forEach((s) => {
    const stt = status(s);
    const cls = 'cd' + (s.locked ? ' lk' : '') + (s.ready ? ' go' : s.n === cur.n ? ' cur' : '');
    o('<article class="' + cls + '" aria-label="Шат ' + s.n + '">');
    o('<div class="hr"><span class="lb">Шат ' + s.n + '</span><span class="pl ' + stt[0] + '">' + stt[1] + '</span></div>');
    o('<div><div class="h">' + esc(s.name) + '</div><div class="sb" style="margin-top:4px">' + esc(s.what) + '</div></div>');
    o('<div class="big nm">' + Math.round(n(s.pct)) + '%</div><div class="bar"><i class="' + tone(s.pct) + '" style="width:' + Math.min(100, n(s.pct)) + '%"></i></div>');
    const tt = trendTxt(s); if (tt) o('<div class="sb">' + esc(tt) + '</div>');
    o(spark(s.hist));
    o('<div>');
    A(s.crit).forEach((c) => {
      o('<div class="cr"><div class="crt"><span>' + esc(c.label) + '</span><b class="nm">' + val(c.value, c.unit) + ' <span class="mu">/ ' + (c.dir === 'down' ? '≤ ' : '') + val(c.target, c.unit) + '</span></b></div>'
        + '<div class="bar"><i class="' + tone(c.pct) + '" style="width:' + Math.min(100, n(c.pct)) + '%"></i></div>'
        + (c.note ? '<div class="sb mu">' + esc(c.note) + '</div>' : '') + '</div>');
    });
    o('</div></article>');
  });
  o('</div></section>');

  // ── дүрэм
  o('<section aria-label="Хэрхэн ажилладаг" style="display:flex;flex-direction:column;gap:12px"><h2 class="h">Хэрхэн ажилладаг</h2><div class="rules">');
  o('<div class="cd"><div class="lb">Тооцоо</div><div class="sb">Шалгуур бүр = бодит тоо ÷ зорилт (100%-иар хязгаарлана; «≤» шалгуурт бага байх тусам сайн). Шатны хувь = шалгууруудын дундаж. Мөнгө, захиалга, хүргэлт, татан авалтын тоо системээс шууд.</div></div>');
  o('<div class="cd"><div class="lb">Дохио</div><div class="sb">Өдөр бүр 10:15-д явцыг хадгална. Шатны БҮХ шалгуур 100% болмогц Telegram «эхлэх цаг боллоо» — нэг удаа. Сар бүрийн 1-нд «сарын өмнө X% → одоо Y%».</div></div>');
  o('<div class="cd"><div class="lb">Шат эхлүүлэх</div><div class="sb">Шийдвэр таных. «Шат N-ийг эхлүүлсэн» гэж Claude-д хэлэхэд тэмдэглэж, дараагийн шат нээгдэнэ. Зорилтыг өөрчлөх бол мөн хэлээрэй.</div></div>');
  o('</div></section>');

  o('</div><footer>growth_plan · ' + (has(d.ms) ? (n(d.ms) / 1000).toFixed(1) + 'с' : '') + ' · ' + esc(d.ub_date || '') + '</footer></div></body></html>');
  return out.join('');
}
