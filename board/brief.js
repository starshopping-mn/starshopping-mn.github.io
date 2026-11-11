/* Самбар · ӨГЛӨӨНИЙ ТАЙЛАН (блок GM, 2026-11-11 — эзэн: «нэг товч дарахад бүх системийн тайланг богино, цэгцтэй хэлдэг, уншиж өгдөг»)
   Өгөгдөл: ?view=brief → board_read 'brief' → morning_brief(p). Зөвхөн УНШИНА. Дуу: хөтчийн монгол хоолой байвал «Сонсох» ажиллана. */
function renderBrief(DATA, QUERY) {
  const d = DATA || {}, Q = QUERY || {};
  const themeQ = Q.theme === 'dark' || Q.theme === 'light' ? Q.theme : '';
  const A = (v) => (Array.isArray(v) ? v : []);
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const ub = (iso) => (iso ? new Date(new Date(iso).getTime() + 8 * 3600000).toISOString() : '');
  const when = d.generated_at ? ub(d.generated_at).slice(5, 10).replace('-', '/') + ' ' + ub(d.generated_at).slice(11, 16) : '—';
  const LC = { r: 'var(--crit)', y: 'var(--warn)', ok: 'var(--good)' };
  const out = []; const o = (s) => out.push(s);
  const CSS = '.nav{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px}.nav a{padding:7px 13px;border-radius:999px;border:1px solid var(--ln);background:var(--s1);color:var(--ink2);font-size:12.5px;font-weight:600}.nav a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
    + '.bf{display:flex;flex-direction:column;gap:14px;max-width:980px}'
    + '.bf .hero{background:var(--s1);border:1px solid var(--ln);border-left:4px solid var(--crit);border-radius:14px;padding:18px 20px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}'
    + '.bf .hero .tx{flex:1 1 300px;min-width:0}.bf .hero .t0{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);font-weight:700}.bf .hero .t1{font-size:19px;font-weight:700;line-height:1.35;margin-top:4px}'
    + '.bf .say{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:12px 20px;background:var(--ink);color:var(--bg);font:700 14px system-ui,sans-serif;cursor:pointer}.bf .say[disabled]{opacity:.45;cursor:default}'
    + '.bf .sayn{font-size:11px;color:var(--mut);margin-top:6px;max-width:220px;line-height:1.4}'
    + '.bf .acts{background:var(--s1);border:1px solid var(--ln);border-radius:14px;padding:6px 0}.bf .ac{display:flex;gap:12px;align-items:flex-start;padding:11px 18px;border-bottom:1px solid var(--ln3)}.bf .ac:last-child{border-bottom:0}'
    + '.bf .ac i{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:12px;background:var(--crit-a);color:var(--crit)}.bf .ac.p2 i{background:var(--warn-a);color:var(--warn)}.bf .ac span{font-size:14.5px;line-height:1.45}'
    + '.bf .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}@media(max-width:820px){.bf .grid{grid-template-columns:minmax(0,1fr)}}'
    + '.bf .cd{background:var(--s1);border:1px solid var(--ln);border-top:3px solid var(--lc);border-radius:14px;padding:14px 16px;min-width:0}.bf .cd b.h{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin-bottom:8px}'
    + '.bf .cd p{margin:0 0 6px;font-size:13.5px;line-height:1.5;overflow-wrap:anywhere}.bf .cd p:last-child{margin:0}.bf .lb{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);font-weight:700;margin:4px 2px -6px}';
  o('<!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Starshopping · Тайлан</title><style>' + CSS + '</style></head><body><div class="w">');
  o('<header><div class="hd"><div class="bm">S</div><div><div class="bt">Өглөөний тайлан</div><div class="bs">бүх системийн дүгнэлт · ' + esc(when) + ' УБ</div></div><div class="sp"></div><a class="rf" href="">Шинэчлэх</a></div></header>');
  o(typeof ssNav === 'function' ? ssNav('brief', themeQ) : '');
  if (!d.ok) { o('<div class="al crit"><span class="tag">алдаа</span><span>Тайлангийн өгөгдөл ирсэнгүй (morning_brief).</span></div></div></body></html>'); return out.join(''); }
  const AC = A(d.actions), SEC = A(d.sections);
  o('<div class="bf">');
  o('<section class="hero" style="border-left-color:' + (AC.length ? (AC[0].pri === 1 ? 'var(--crit)' : 'var(--warn)') : 'var(--good)') + '"><div class="tx"><div class="t0">Хамгийн чухал</div><div class="t1">' + esc(d.headline) + '</div></div>'
    + '<div><button class="say" id="say" type="button">▶ Сонсох</button><div class="sayn" id="sayn"></div></div></section>');
  if (AC.length) { o('<div class="lb">Өнөөдөр хийх зүйл</div><section class="acts">'); AC.forEach((a, i) => o('<div class="ac p' + (a.pri === 1 ? 1 : 2) + '"><i>' + (i + 1) + '</i><span>' + esc(a.text) + '</span></div>')); o('</section>'); }
  o('<div class="lb">Тойм</div><div class="grid">');
  SEC.forEach((s) => o('<section class="cd" style="--lc:' + (LC[s.lvl] || 'var(--ln2)') + '"><b class="h">' + esc(s.title) + '</b>' + A(s.lines).map((l) => '<p>' + esc(l) + '</p>').join('') + '</section>'));
  o('</div></div><footer><span>morning_brief</span><span>' + esc(d.date || '') + '</span><span>зөвхөн уншина</span></footer></div>');
  o('<script type="application/json" id="bfsp">' + JSON.stringify({ t: d.speech || '' }).replace(/</g, '\\u003c') + '</script>');
  o('<script>(function(){var b=document.getElementById("say"),n=document.getElementById("sayn"),t="";try{t=JSON.parse(document.getElementById("bfsp").textContent).t}catch(e){}'
    + 'var S=window.speechSynthesis;function mn(){return S?S.getVoices().filter(function(v){return /^mn/i.test(v.lang)})[0]:null}'
    + 'function chk(){if(!S){b.disabled=true;n.textContent="Энэ хөтөч дуу уншихыг дэмжихгүй.";return}if(!mn()){n.textContent="Монгол хоолой энэ хөтөчид алга — Microsoft Edge-д «Bataa / Yesui» хоолойгоор уншина."}else{n.textContent=""}}'
    + 'chk();if(S)S.onvoiceschanged=chk;'
    + 'b.addEventListener("click",function(){if(!S)return;if(S.speaking){S.cancel();b.textContent="▶ Сонсох";return}var v=mn();if(!v){chk();return}'
    + 't.split(/(?<=[.!?])\\s+/).forEach(function(p){if(!p.trim())return;var u=new SpeechSynthesisUtterance(p);u.voice=v;u.lang=v.lang;u.rate=1.05;u.onend=function(){if(!S.pending&&!S.speaking)b.textContent="▶ Сонсох"};S.speak(u)});b.textContent="■ Зогсоох"});})();</script>');
  o('</body></html>');
  return out.join('');
}
