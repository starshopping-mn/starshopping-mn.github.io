/* Starshopping · хөдөлдөг өнгөний дэвсгэр (2026-10-22, эзний баталсан).
   designely.studio-ийн «dither band» WebGL shader-ийг мөр мөрөөр нь буулгасан: fbm шуурга, хулганын
   долгион, 2px cell-ийн цэг, cA/cB/cC/cW палитр. Энд нэг л canvas байна — position:fixed, бүх хуудасны ард,
   дэлгэцийн дээд ба доод ирмэгт өтгөн, дунд сийрэг (uniform `full`). Canvas z-index:-1 (html дэвсгэртэй, body тунгалаг) — контент өөрөө дээр нь.
   Хамгаалалт: WebGL байхгүй / prefers-reduced-motion / таб нуугдсан / ?nodither / localStorage ss_nodither → зурахгүй,
   зогсонги нэг кадр л үлдээнэ. dpr ≤ 1 утсанд, ≤ 1.25 том дэлгэцэнд; 30fps; low-power контекст.
   Hero-гийн zoom-той холбоогүй: canvas-д filter/backdrop-filter байхгүй, hero-гийн давхаргад оролцохгүй. */
(function () {
  "use strict";
  try {
    if (/[?&]nodither\b/.test(location.search) || localStorage.getItem("ss_nodither") === "1") return;
  } catch (e) { /* private window */ }

  /* Палитр: хуудас бүрт өөр (designely-ийнх шиг). Бараа бүрт тохируулах бол data-dither-palette="..." тавина. */
  var PALETTES = {
    landing:    { a: [0.62, 0.46, 0.98], b: [0.98, 0.42, 0.72], c: [0.38, 0.74, 0.98], warm: [1, 0.64, 0.38] },
    components: { a: [0.5, 0.45, 0.98],  b: [0.3, 0.55, 0.98],  c: [0.36, 0.82, 0.96], warm: [0.78, 0.66, 1] },
    pricing:    { a: [1, 0.58, 0.32],    b: [0.98, 0.42, 0.6],  c: [1, 0.8, 0.36],     warm: [1, 0.46, 0.4] },
    editor:     { a: [0.2, 0.74, 0.6],   b: [0.34, 0.62, 0.96], c: [0.62, 0.84, 0.4],  warm: [0.5, 0.92, 0.86] },
    credits:    { a: [0.76, 0.5, 0.86],  b: [0.94, 0.5, 0.58],  c: [0.96, 0.76, 0.5],  warm: [0.9, 0.62, 0.9] }
  };
  /* Маршрут → палитр. Нүүр = landing, категори = components, бараа = landing, захиалга/бусад = credits. */
  function paletteFor() {
    var h = location.hash || "";
    var forced = document.documentElement.getAttribute("data-dither-palette");
    if (forced && PALETTES[forced]) return PALETTES[forced];
    if (/^#\/c\//.test(h)) return PALETTES.components;
    if (/^#\/(order|done|policy)/.test(h)) return PALETTES.credits;
    return PALETTES.landing;
  }

  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n"
    + "uniform vec2 res,mouse;uniform float time,ratio,flip,cell,full;uniform vec3 cA,cB,cC,cW;"
    + "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}"
    + "float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}"
    + "float fbm(vec2 p){return noise(p)*.55+noise(p*2.1)*.3+noise(p*4.2)*.15;}"
    + "void main(){vec2 uv=gl_FragCoord.xy/res;float y=flip>.5?1.-uv.y:uv.y;"
    + "vec2 p=vec2(uv.x*ratio*4.,y*3.-time*.20);"
    + "float distanceToMouse=length(vec2((uv.x-mouse.x)*ratio,y-mouse.y));"
    + "float influence=exp(-distanceToMouse*distanceToMouse*1.5);"
    + "p+=vec2(sin(time*.5+y*5.),cos(time*.4+p.x))*influence*.65;"
    + "float drift=fbm(p);"
    + "float tendril=fbm(vec2(p.x+(drift-.5)*2.3,p.y-time*.15));"
    + "float fall=full>.5?(.10+.90*pow(abs(1.-2.*y),1.6)):pow(1.-y,2.1);"
    + "float density=smoothstep(.23,.69,tendril)*fall*.90;"
    + "vec2 cellAt=gl_FragCoord.xy/cell;vec2 id=floor(cellAt);vec2 local=fract(cellAt)-.5;"
    + "float r=hash(id);local-=(vec2(r,hash(id+71.))-.5)*.36;"
    + "float radius=sqrt(density)*(.48+.08*r);"
    + "float coverage=1.-smoothstep(radius-.09,radius+.09,length(local));"
    + "vec3 color=mix(cA,cB,smoothstep(.25,.75,drift));"
    + "color=mix(color,cC,smoothstep(.40,.68,fbm(p+vec2(8.,3.))));"
    + "color=mix(color,cW,influence*.28);"
    + "float edge=full>.5?1.:(1.-smoothstep(.55,1.,y));"
    + "float a=coverage*.82*edge;"
    + "gl_FragColor=vec4(color*a,a);}";

  var cv = document.createElement("canvas");
  cv.id = "ssDither";
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:block";
  var gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
  if (!gl) return;
  function sh(t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
  var v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS);
  if (!v || !f) return;
  var pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  var ap = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
  var U = {};
  ["res", "mouse", "time", "ratio", "flip", "cell", "full", "cA", "cB", "cC", "cW"].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
  gl.disable(gl.BLEND); gl.clearColor(0, 0, 0, 0);
  gl.uniform1f(U.flip, 0); gl.uniform1f(U.full, 1);

  var palKey = null;
  function applyPalette() {
    var P = paletteFor();
    if (P === palKey) return;
    palKey = P;
    gl.uniform3fv(U.cA, P.a); gl.uniform3fv(U.cB, P.b); gl.uniform3fv(U.cC, P.c); gl.uniform3fv(U.cW, P.warm);
  }

  var W = 1, H = 1;
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    var dpr = Math.max(0.5, Math.min(window.devicePixelRatio || 1, w < 720 ? 1 : 1.25));
    W = w; H = h;
    cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
    gl.viewport(0, 0, cv.width, cv.height);
    gl.uniform2f(U.res, cv.width, cv.height);
    gl.uniform1f(U.ratio, w / Math.max(1, h));
    gl.uniform1f(U.cell, 2 * dpr);
  }

  /* Хулгана: designely-ийн Ce()/we() — x −0.2…1.2, y 0…1.6, exp(−dt·3.4) зөөлрүүлэлт. Хүрэлцэх дэлгэцэнд хөдлөхгүй. */
  var tx = 0.5, ty = 0.8, mx = 0.5, my = 0.8, target = null;
  window.addEventListener("pointermove", function (e) { if (e.pointerType === "touch") return; target = { x: e.clientX, y: e.clientY }; }, { passive: true });

  var reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var t = 6.5, last = 0, raf = 0, lost = false;
  cv.addEventListener("webglcontextlost", function (e) { e.preventDefault(); lost = true; cancelAnimationFrame(raf); raf = 0; }, false);

  function draw(dt) {
    if (target) {
      var x = target.x / Math.max(1, W), y = target.y / Math.max(1, H);
      tx = Math.min(1.2, Math.max(-0.2, x)); ty = Math.min(1.6, Math.max(0, y));
    }
    var k = 1 - Math.exp(-dt * 3.4);
    mx += (tx - mx) * k; my += (ty - my) * k;
    applyPalette();
    gl.uniform1f(U.time, t); gl.uniform2f(U.mouse, mx, my);
    gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (last && now - last < 1000 / 30 - 2) return;
    var dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now; t += dt;
    draw(dt);
  }
  function start() { if (lost || reduce) { draw(0); return; } if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  document.body.insertBefore(cv, document.body.firstChild);
  document.documentElement.classList.add("has-dither");
  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("hashchange", function () { palKey = null; if (reduce) draw(0); });
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  start();
})();
