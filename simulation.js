/* ==========================================================================
   Full Moon Declination Demonstrator  --  Accessible HTML5 port
   Ported from fullMoonDec001 (Adobe Flash / AS1).

   GROUND TRUTH for behaviour is the decompiled ActionScript. Every constant,
   formula and colour below is copied verbatim from that source:
     - "Moon Dec Demo.as"  : builds the celestial sphere scene, places Sun/Moon,
                             computes their positions from the day of year.
     - "Moon Dec Plot.as"  : the declination-range curve + shaded band.
     - "frame_1/DoAction.as": reset()  -> setThetaAndPhi(200,20), setDayOfYear(45)
     - "CelestialSphere.as" + "2..11 CS *.as": the generic 3-D sphere engine.

   The generic engine's projection maths is kept exactly:
     theta = viewer azimuth rotation (rad)   phi = viewer altitude/tilt (rad)
     lat   = observer latitude (fixed 41)    sTime = sidereal time (rad)
   Matrices: a* world->screen, m* celestial->world, b* celestial->screen.
   Rendering is reproduced on <canvas>; controls are native + keyboard-operable;
   math symbols are typeset by MathJax.
   ========================================================================== */
'use strict';
(function () {

  /* ---- angle / unit constants (verbatim radians-per-unit from the AS) ------ */
  var D2R = 0.017453292519943295;      // deg -> rad
  var R2D = 57.29577951308232;         // rad -> deg
  var H2R = 0.2617993877991494;        // hours -> rad (15 deg)
  var R2H = 3.819718634205488;         // rad -> hours
  var TWO_PI = 6.283185307179586;
  var HALF_PI = 1.5707963267948966;
  var PI = 3.141592653589793;

  function mod(n, m) { return ((n % m) + m) % m; }

  // AS colour int (decimal RGB) + alpha(0-100) -> css rgba
  function css(intColor, alpha) {
    var r = (intColor >> 16) & 255, g = (intColor >> 8) & 255, b = intColor & 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + ((alpha == null ? 100 : alpha) / 100) + ')';
  }

  // Integer -> "0-1 padded" fixed string (used only for whole-number readouts).
  function asFixed(x, d) {
    if (isNaN(x)) return 'NaN';
    var s = ''; if (x < 0) { s = '-'; x = -x; }
    var n = Math.round(x * Math.pow(10, d)), str = (n === 0) ? '0' : String(n);
    if (d > 0) {
      var k = str.length;
      if (k <= d) { var z = ''; for (var i = 0; i < d + 1 - k; i++) z += '0'; str = z + str; k = d + 1; }
      str = str.substr(0, k - d) + '.' + str.substr(k - d);
    }
    return s + str;
  }
  // Spoken number: a leading "-" glyph is routinely dropped by screen readers.
  function spokenNum(x, d) { var t = asFixed(x, d); return (t.charAt(0) === '-') ? 'minus ' + t.slice(1) : t; }

  /* ========================================================================
     CelestialSphere engine -- faithful port of the AS prototype methods.
     ======================================================================== */
  function Sphere(r) {
    this._c = {}; this._c.r = r; this._c.r2 = r * r;
    this._theta = 0; this._phi = HALF_PI / 3;
    this._lat = 41 * D2R; this._sTime = 0; this._showUnder = true;
    this._minPhi = -90; this._maxPhi = 90;
    this.circles = []; this.lines = []; this.objects = []; this.bands = [];
    this.setLatitude(41); this.setSiderealTime(0);
  }
  var S = Sphere.prototype;
  S.setThetaAndPhi = function (newTheta, newPhi) {
    this._theta = D2R * mod(newTheta, 360);
    if (newPhi > this._maxPhi) newPhi = this._maxPhi; else if (newPhi < this._minPhi) newPhi = this._minPhi;
    this._phi = newPhi * D2R;
    this.doA(); this.doB();
  };
  S.getTheta = function () { return R2D * this._theta; };
  S.getPhi = function () { return R2D * this._phi; };
  S.setLatitude = function (lat) { if (lat > 90) lat = 90; else if (lat < -90) lat = -90; this._lat = lat * D2R; this.doM(); this.doB(); };
  S.setSiderealTime = function (t) { this._sTime = mod(t, 24) * H2R; this.doM(); this.doB(); };

  // matrices (doA / doM / doB)
  S.doA = function () {
    var c = this._c, ct = Math.cos(this._theta), st = Math.sin(this._theta),
        cp = Math.cos(this._phi), sp = Math.sin(this._phi), r = c.r;
    c.a0 = -r * st; c.a1 = r * ct;
    c.a3 = r * ct * sp; c.a4 = r * st * sp; c.a5 = -r * cp;
    c.a6 = r * ct * cp; c.a7 = r * st * cp; c.a8 = r * sp;
  };
  S.doM = function () {
    var c = this._c;
    c.m2 = Math.cos(this._lat); c.m3 = Math.sin(this._sTime); c.m4 = -Math.cos(this._sTime); c.m8 = Math.sin(this._lat);
    c.m0 = c.m4 * c.m8; c.m1 = -c.m3 * c.m8; c.m6 = -c.m2 * c.m4; c.m7 = c.m2 * c.m3;
  };
  S.doB = function () {
    var c = this._c;
    c.b0 = c.a0 * c.m0 + c.a1 * c.m3; c.b1 = c.a0 * c.m1 + c.a1 * c.m4; c.b2 = c.a0 * c.m2;
    c.b3 = c.a3 * c.m0 + c.a4 * c.m3 + c.a5 * c.m6; c.b4 = c.a3 * c.m1 + c.a4 * c.m4 + c.a5 * c.m7; c.b5 = c.a3 * c.m2 + c.a5 * c.m8;
    c.b6 = c.a6 * c.m0 + c.a7 * c.m3 + c.a8 * c.m6; c.b7 = c.a6 * c.m1 + c.a7 * c.m4 + c.a8 * c.m7; c.b8 = c.a6 * c.m2 + c.a8 * c.m8;
  };
  // projections
  S.WtoSz = function (p, s) { var c = this._c; s.x = p.x * c.a0 + p.y * c.a1; s.y = p.x * c.a3 + p.y * c.a4 + p.z * c.a5; s.z = p.x * c.a6 + p.y * c.a7 + p.z * c.a8; };
  S.CtoSz = function (p, s) { var c = this._c; s.x = p.x * c.b0 + p.y * c.b1 + p.z * c.b2; s.y = p.x * c.b3 + p.y * c.b4 + p.z * c.b5; s.z = p.x * c.b6 + p.y * c.b7 + p.z * c.b8; };
  S.CtoW = function (p, w) { var c = this._c; w.x = p.x * c.m0 + p.y * c.m1 + p.z * c.m2; w.y = p.x * c.m3 + p.y * c.m4; w.z = p.x * c.m6 + p.y * c.m7 + p.z * c.m8; };
  S.CtoMH = function (cp, hp) {
    var sd = Math.sin(cp.dec), cd = Math.cos(cp.dec), sl = Math.sin(this._lat), cl = Math.cos(this._lat),
        h = this._sTime - cp.ra, ch = Math.cos(h), caz = sd * cl - cd * ch * sl, saz = cd * Math.sin(h);
    hp.az = (caz === 0) ? 0 : mod(Math.atan2(saz, caz), TWO_PI);
    hp.alt = Math.asin(sd * sl + cd * ch * cl);
  };
  S.MHtoC = function (hp, cp) {
    var salt = Math.sin(hp.alt), calt = Math.cos(hp.alt), saz = Math.sin(hp.az), caz = Math.cos(hp.az),
        sl = Math.sin(this._lat), cl = Math.cos(this._lat), sh = calt * saz, ch = salt * cl - calt * sl * caz;
    cp.ra = (ch === 0) ? 0 : mod(this._sTime - Math.atan2(sh, ch), TWO_PI);
    cp.dec = Math.asin(salt * sl + calt * caz * cl);
  };
  S.StoMH = function (sp, hp) {
    var M = Math, d = M.sqrt(sp.x * sp.x + sp.y * sp.y) / this._c.r; if (d > 1) d = 1;
    var b = M.asin(d), A = M.atan2(sp.x, -sp.y);
    if (this._phi === HALF_PI) { hp.alt = HALF_PI - b; hp.az = this._theta + PI - A; }
    else if (this._phi === -HALF_PI) { hp.alt = -HALF_PI + b; hp.az = this._theta + A; }
    else {
      var c = HALF_PI - this._phi, cc = M.cos(c), sc = M.sin(c), cb = M.cos(b), sb = M.sin(b), ca = cb * cc + sb * sc * M.cos(A);
      hp.alt = HALF_PI - M.acos(ca); hp.az = this._theta + M.atan2(sb * M.sin(A), (cb - ca * cc) / sc);
    }
    hp.az = mod(hp.az, TWO_PI);
  };
  S.screenToRaDec = function (x, y) {
    var d = Math.sqrt(x * x + y * y); if (d > this._c.r) return null;
    var hp = {}, cp = {}; this.StoMH({ x: x, y: y }, hp); this.MHtoC(hp, cp);
    return { ra: cp.ra * R2H, dec: cp.dec * R2D };
  };
  S.parse = function (a) {
    var o = {}, r;
    if (a.az != null && a.alt != null) {
      o.sys = 0; r = (a.r != null) ? a.r : 1; var d = r * Math.cos(a.alt * D2R);
      o.x = d * Math.cos(a.az * D2R); o.y = d * Math.sin(-a.az * D2R); o.z = r * Math.sin(a.alt * D2R); o.r = Math.abs(r);
    } else if (a.ra != null && a.dec != null) {
      o.sys = 1; r = (a.r != null) ? a.r : 1; var d2 = r * Math.cos(a.dec * D2R);
      o.x = d2 * Math.cos(a.ra * H2R); o.y = d2 * Math.sin(a.ra * H2R); o.z = r * Math.sin(a.dec * D2R); o.r = Math.abs(r);
    } else {
      o.sys = (a.system === 'horizon') ? 0 : (a.system === 'celestial') ? 1 : -1;
      o.x = a.x; o.y = a.y; o.z = a.z; o.r = Math.sqrt(o.x * o.x + o.y * o.y + o.z * o.z);
      if (o.r < 1.000001 && o.r > 0.999999) o.r = 1;
    }
    return o;
  };

  /* ---- Circles (port of "8 CS Circles.as") -------------------------------- */
  function Circle(sphere, style, def) {
    this.s = sphere; this._sys = 0; this._tilt = 0; this._lambda = 0; this._beta = 0; this._gS = 0; this._gE = 0; this._c = {};
    this._thick = (style && style.thickness != null) ? style.thickness : 1;
    this._color = (style && style.color != null) ? style.color : 16711680;
    this._alpha = (style && style.alpha != null) ? style.alpha : 80;
    this._visible = true; if (def) this.setParameters(def);
  }
  Circle.prototype.setParameters = function (a) {
    if (a.az != null && a.alt != null && a.tilt != null) {
      this._sys = 0;
      if (isFinite(a.tilt)) this._tilt = (a.tilt < 0 ? 0 : a.tilt > 180 ? PI : a.tilt * D2R);
      if (isFinite(a.alt)) this._lambda = (a.alt < -90 ? -PI : a.alt > 90 ? PI : a.alt * D2R);
      if (isFinite(a.az)) this._beta = D2R * mod(-a.az, 360);
      if (isFinite(a.gammaStart)) this._gS = D2R * mod(a.gammaStart, 360);
      if (isFinite(a.gammaEnd)) this._gE = D2R * mod(a.gammaEnd, 360);
    } else if (a.ra != null && a.dec != null && a.tilt != null) {
      this._sys = 1;
      if (isFinite(a.tilt)) this._tilt = (a.tilt < 0 ? 0 : a.tilt > 180 ? PI : a.tilt * D2R);
      if (isFinite(a.dec)) this._lambda = (a.dec < -90 ? -PI : a.dec > 90 ? PI : a.dec * D2R);
      if (isFinite(a.ra)) this._beta = H2R * mod(a.ra, 24);
      if (isFinite(a.gammaStart)) this._gS = D2R * mod(a.gammaStart, 360);
      if (isFinite(a.gammaEnd)) this._gE = D2R * mod(a.gammaEnd, 360);
    }
    this.doW();
  };
  Circle.prototype.doW = function () {
    var st = Math.sin(this._tilt), ct = Math.cos(this._tilt), sb = Math.sin(this._beta), cb = Math.cos(this._beta),
        cl = Math.cos(this._lambda), sl = Math.sin(this._lambda), c = this._c;
    c.w0 = cl * cb; c.w1 = -cl * sb * ct; c.w2 = sl * sb * st;
    c.w3 = cl * sb; c.w4 = cl * cb * ct; c.w5 = -sl * cb * st;
    c.w7 = cl * st; c.w8 = sl * ct;
  };
  Circle.prototype.computeArcs = function () {
    var tc = this._c, pc = this.s._c, v0, v1, v2, v3, v4, v5, v6, v7, v8;
    if (this._sys === 0) {
      v0 = pc.a0 * tc.w0 + pc.a1 * tc.w3; v1 = pc.a0 * tc.w1 + pc.a1 * tc.w4; v2 = pc.a0 * tc.w2 + pc.a1 * tc.w5;
      v3 = pc.a3 * tc.w0 + pc.a4 * tc.w3; v4 = pc.a3 * tc.w1 + pc.a4 * tc.w4 + pc.a5 * tc.w7; v5 = pc.a3 * tc.w2 + pc.a4 * tc.w5 + pc.a5 * tc.w8;
      v6 = pc.a6 * tc.w0 + pc.a7 * tc.w3; v7 = pc.a6 * tc.w1 + pc.a7 * tc.w4 + pc.a8 * tc.w7; v8 = pc.a6 * tc.w2 + pc.a7 * tc.w5 + pc.a8 * tc.w8;
    } else {
      v0 = pc.b0 * tc.w0 + pc.b1 * tc.w3; v1 = pc.b0 * tc.w1 + pc.b1 * tc.w4 + pc.b2 * tc.w7; v2 = pc.b0 * tc.w2 + pc.b1 * tc.w5 + pc.b2 * tc.w8;
      v3 = pc.b3 * tc.w0 + pc.b4 * tc.w3; v4 = pc.b3 * tc.w1 + pc.b4 * tc.w4 + pc.b5 * tc.w7; v5 = pc.b3 * tc.w2 + pc.b4 * tc.w5 + pc.b5 * tc.w8;
      v6 = pc.b6 * tc.w0 + pc.b7 * tc.w3; v7 = pc.b6 * tc.w1 + pc.b7 * tc.w4 + pc.b8 * tc.w7; v8 = pc.b6 * tc.w2 + pc.b7 * tc.w5 + pc.b8 * tc.w8;
    }
    var v = [v0, v1, v2, v3, v4, v5, v6, v7, v8], front = [], back = [], A = Math.sqrt(v6 * v6 + v7 * v7), gS = this._gS, gE = this._gE;
    if (A === 0) { (v8 < 0 ? back : front).push([gS, gE]); return { v: v, front: front, back: back }; }
    var sj = -v8 / A;
    if (sj <= -1) { front.push([gS, gE]); return { v: v, front: front, back: back }; }
    if (sj >= 1) { back.push([gS, gE]); return { v: v, front: front, back: back }; }
    var j = Math.asin(sj), t = Math.atan2(v6, v7), gDesc, gAsc;
    if (Math.cos(j) < 0) { gDesc = mod(j - t, TWO_PI); gAsc = mod(PI - j - t, TWO_PI); }
    else { gDesc = mod(PI - j - t, TWO_PI); gAsc = mod(j - t, TWO_PI); }
    if (gS === gE) { front.push([gAsc, gDesc]); back.push([gDesc, gAsc]); return { v: v, front: front, back: back }; }
    var arr = [[gAsc, 0], [gDesc, 1], [gS, 2], [gE, 3]]; arr.sort(function (a, b) { return a[0] - b[0]; });
    var draw = false, isFront = true, k;
    for (k = 0; k < 4; k++) { if (arr[k][1] === 0) isFront = true; else if (arr[k][1] === 1) isFront = false; else if (arr[k][1] === 2) draw = true; else draw = false; }
    var prev = arr[3];
    for (k = 0; k < 4; k++) {
      var g1 = prev; prev = arr[k];
      if (draw && g1[0] !== prev[0]) (isFront ? front : back).push([g1[0], prev[0]]);
      if (prev[1] === 0) isFront = true; else if (prev[1] === 1) isFront = false; else if (prev[1] === 2) draw = true; else draw = false;
    }
    return { v: v, front: front, back: back };
  };
  // Emit an arc to a 2-D path using the AS curveTo tessellation (identical shape).
  function drawArc(path, v, g1, g2, minStep) {
    if (g2 < g1) g2 += TWO_PI;
    var arc = g2 - g1; if (arc === 0) arc = TWO_PI;
    var n = Math.ceil(arc / minStep), step = arc / n, half = step / 2, cRad = 1 / Math.cos(half), ax = Math.cos(g1), ay = Math.sin(g1);
    path.moveTo(v[0] * ax + v[1] * ay + v[2], v[3] * ax + v[4] * ay + v[5]);
    var aA = g1 + step, cA = aA - half;
    for (var i = 0; i < n; i++) {
      ax = Math.cos(aA); ay = Math.sin(aA);
      var cx = cRad * Math.cos(cA), cy = cRad * Math.sin(cA);
      path.quadraticCurveTo(v[0] * cx + v[1] * cy + v[2], v[3] * cx + v[4] * cy + v[5], v[0] * ax + v[1] * ay + v[2], v[3] * ax + v[4] * ay + v[5]);
      aA += step; cA += step;
    }
  }

  /* ---- Lines (port of "9 CS Lines.as") ------------------------------------ */
  function Line(sphere, style, head, tail) {
    this.s = sphere;
    this._thick = (style && style.thickness != null) ? style.thickness : 1;
    this._color = (style && style.color != null) ? style.color : 255;
    this._alpha = (style && style.alpha != null) ? style.alpha : 100;
    this._visible = true;
    this._head = sphere.parse(head); if (this._head.sys === -1) this._head.sys = 0;
    this._tail = sphere.parse(tail); if (this._tail.sys === -1) this._tail.sys = 0;
  }
  Line.prototype.computeSegments = function () {
    if (!this._visible) return [];
    var s = this.s, head = {}, tail = {};
    if (this._head.sys === 0) s.WtoSz(this._head, head); else s.CtoSz(this._head, head);
    if (this._tail.sys === 0) s.WtoSz(this._tail, tail); else s.CtoSz(this._tail, tail);
    var mx = head.x - tail.x, my = head.y - tail.y, mz = head.z - tail.z,
        A = mx * mx + my * my + mz * mz, B = 2 * (mx * tail.x + my * tail.y + mz * tail.z),
        C = tail.x * tail.x + tail.y * tail.y + tail.z * tail.z, rad = s._c.r, rad2 = rad * rad, phi = s._phi, tp,
        stmp = [], D = B * B - 4 * A * (C - rad2);
    if (D > 0) { var sD = Math.sqrt(D); stmp.push((-B + sD) / (2 * A)); stmp.push((-B - sD) / (2 * A)); }
    if (phi > -HALF_PI && phi < HALF_PI) {
      tp = Math.tan(phi);
      if (my !== tp * mz) stmp.push((tp * tail.z - tail.y) / (my - tp * mz));
      if (mz !== 0) { var tmp = -tail.z / mz; if (tmp * (tmp * A + B) + C >= rad2) stmp.push(tmp); }
    } else if (mz !== 0) { stmp.push(-tail.z / mz); }
    var sArr = [0, 1], i, k;
    for (i = 0; i < stmp.length; i++) { if (stmp[i] > 0 && stmp[i] < 1) { k = 1; while (stmp[i] > sArr[k]) k++; if (stmp[i] !== sArr[k]) sArr.splice(k, 0, stmp[i]); } }
    var out = [];
    for (i = 0; i < sArr.length - 1; i++) {
      var s1 = sArr[i], s2 = sArr[i + 1], mid = s1 + (s2 - s1) / 2, r2 = mid * (mid * A + B) + C, layer;
      if (r2 < rad2) {
        if (phi === -HALF_PI) layer = (mid * mz + tail.z > 0) ? 'bI' : 'aI';
        else if (phi === HALF_PI) layer = (mid * mz + tail.z > 0) ? 'aI' : 'bI';
        else layer = (mid * my + tail.y - (mid * mz + tail.z) * tp > 1e-9) ? 'bI' : 'aI';
      } else { layer = (mid * mz + tail.z < 0) ? 'bE' : 'fE'; }
      out.push({ x1: s1 * mx + tail.x, y1: s1 * my + tail.y, x2: s2 * mx + tail.x, y2: s2 * my + tail.y, layer: layer });
    }
    return out;
  };

  /* ---- Objects (Sun/Moon discs): screen position only. A disc is rotationally
     symmetric, so the AS "absolute" orientation has no visible effect -- we just
     project the centre and its screen depth. --------------------------------- */
  function Disc(sphere, position) { this.s = sphere; this._sp = { x: 0, y: 0, z: 0 }; this.setPosition(position); }
  Disc.prototype.setPosition = function (a) { var p = this.s.parse(a); this._sys = (p.sys === 1) ? 1 : 0; this._p = p; this._r = p.r; };
  Disc.prototype.update = function () { if (this._sys === 0) this.s.WtoSz(this._p, this._sp); else this.s.CtoSz(this._p, this._sp); };

  /* ---- Shaded band (faithful port of "11 CS Shaded Bands.as" update()) -----
     The band is the zone between two small circles (ecliptic-latitude lambda1,
     lambda2) about a tilted pole. We build the FRONT and BACK fill regions as
     Path2Ds using the same drawSphericalArc / drawPerimeterArcs tessellation as
     the AS, working in the AS "100 = sphere radius" space (scaled to pixels at
     fill time). Colours reproduce the pink "Symbol 204" disc + red border. ---- */
  function ShadedBand(sphere, params) {
    this.s = sphere; this._c = {}; this._visible = true;
    this._bThick = 1; this._bColor = 16711680; this._bAlpha = 40;   // setBorderStyle(1,16711680,40)
    this.setParameters(params);
  }
  ShadedBand.prototype.setParameters = function (a) {
    this._sys = 1;
    this._beta = (a.ra != null) ? H2R * mod(a.ra, 24) : 0;
    this._tilt = (a.tilt != null) ? (a.tilt < 0 ? 0 : a.tilt > 180 ? PI : a.tilt * D2R) : 0;
    if (a.dec1 <= -90) { this._lambda1 = -HALF_PI; this._type1 = 1; } else if (a.dec1 >= 90) { this._lambda1 = HALF_PI; this._type1 = 1; } else { this._lambda1 = a.dec1 * D2R; this._type1 = 0; }
    if (a.dec2 <= -90) { this._lambda2 = -HALF_PI; this._type2 = 1; } else if (a.dec2 >= 90) { this._lambda2 = HALF_PI; this._type2 = 1; } else { this._lambda2 = a.dec2 * D2R; this._type2 = 0; }
    if (this._lambda1 > this._lambda2) { var t = this._lambda2; this._lambda2 = this._lambda1; this._lambda1 = t; t = this._type2; this._type2 = this._type1; this._type1 = t; }
    this.doK();
  };
  ShadedBand.prototype.doK = function () {
    var st = Math.sin(this._tilt), ct = Math.cos(this._tilt), sb = Math.sin(this._beta), cb = Math.cos(this._beta), c = this._c;
    c.k0 = cb; c.k1 = -sb * ct; c.k2 = sb * st; c.k3 = sb; c.k4 = cb * ct; c.k5 = -cb * st; c.k7 = st; c.k8 = ct;
  };
  // Returns { front: Path2D, back: Path2D } in AS "100" space (fill with scale r/100).
  ShadedBand.prototype.buildPaths = function () {
    var tc = this._c, pc = this.s._c, s = 100 / this.s._c.r, v0, v1, v2, v3, v4, v5, v6, v7, v8;
    // v = s * (b* . k)   (celestial system)
    v0 = s * (pc.b0 * tc.k0 + pc.b1 * tc.k3); v1 = s * (pc.b0 * tc.k1 + pc.b1 * tc.k4 + pc.b2 * tc.k7); v2 = s * (pc.b0 * tc.k2 + pc.b1 * tc.k5 + pc.b2 * tc.k8);
    v3 = s * (pc.b3 * tc.k0 + pc.b4 * tc.k3); v4 = s * (pc.b3 * tc.k1 + pc.b4 * tc.k4 + pc.b5 * tc.k7); v5 = s * (pc.b3 * tc.k2 + pc.b4 * tc.k5 + pc.b5 * tc.k8);
    v6 = s * (pc.b6 * tc.k0 + pc.b7 * tc.k3); v7 = s * (pc.b6 * tc.k1 + pc.b7 * tc.k4 + pc.b8 * tc.k7); v8 = s * (pc.b6 * tc.k2 + pc.b7 * tc.k5 + pc.b8 * tc.k8);

    var front = new Path2D(), back = new Path2D(), minStep = 0.5235987755982988;
    var cl1 = Math.cos(this._lambda1), sl1 = Math.sin(this._lambda1), cl2 = Math.cos(this._lambda2), sl2 = Math.sin(this._lambda2);
    var cos = Math.cos, sin = Math.sin, asin = Math.asin, atan2 = Math.atan2, sqrt = Math.sqrt;

    // Tessellate the limb (radius-100 circle) from angle t1 to t2. Appends to both.
    function perim(t1, t2, dir) {
      var arc, step, doMove;
      if (dir === 1) { arc = mod(t2 - t1, TWO_PI); } else { arc = mod(t1 - t2, TWO_PI); }
      if (arc === 0) { arc = TWO_PI; doMove = true; } else { doMove = false; }
      var n = Math.ceil(arc / minStep); step = (dir === 1 ? arc : -arc) / n;
      var half = step / 2, cr = 100 / cos(half);
      if (doMove) { front.moveTo(100 * cos(t1), 100 * sin(t1)); back.moveTo(100 * cos(t1), 100 * sin(t1)); }
      var aA = t1 + step, cA = aA - half;
      for (var i = 0; i < n; i++) {
        var ax = 100 * cos(aA), ay = 100 * sin(aA), cx = cr * cos(cA), cy = cr * sin(cA);
        front.quadraticCurveTo(cx, cy, ax, ay); back.quadraticCurveTo(cx, cy, ax, ay);
        aA += step; cA += step;
      }
    }
    // Tessellate a bounding small circle arc (latitude cl/sl) from g1..g2 onto one path.
    function sph(path, g1, g2, cl, sl, dir) {
      var arc, step, doMove;
      if (dir === 1) { arc = mod(g2 - g1, TWO_PI); } else { arc = mod(g1 - g2, TWO_PI); }
      if (arc === 0) { arc = TWO_PI; doMove = true; } else { doMove = false; }
      var n = Math.ceil(arc / minStep); step = (dir === 1 ? arc : -arc) / n;
      var half = step / 2, cRad = 1 / cos(half);
      var iax = cos(g1), iay = sin(g1), ax = cl * (v0 * iax + v1 * iay) + sl * v2, ay = cl * (v3 * iax + v4 * iay) + sl * v5;
      if (doMove) path.moveTo(ax, ay);
      var aA = g1 + step, cA = aA - half;
      for (var i = 0; i < n; i++) {
        iax = cos(aA); iay = sin(aA);
        var icx = cRad * cos(cA), icy = cRad * sin(cA);
        ax = cl * (v0 * iax + v1 * iay) + sl * v2; ay = cl * (v3 * iax + v4 * iay) + sl * v5;
        var cx = cl * (v0 * icx + v1 * icy) + sl * v2, cy = cl * (v3 * icx + v4 * icy) + sl * v5;
        path.quadraticCurveTo(cx, cy, ax, ay);
        aA += step; cA += step;
      }
    }

    // --- classify each bounding circle: loc 0 crosses limb, 1 all-front, 2 all-back ---
    var startX = null, startY = null, gD1, gA1, tD1, tA1, gD2, gA2, tD2, tA2, loc1, loc2, x, y, j, t;
    var A1 = cl1 * sqrt(v6 * v6 + v7 * v7);
    if (A1 === 0) { loc1 = (sl1 * v8 < 0) ? 2 : 1; }
    else {
      var sj1 = -sl1 * v8 / A1;
      if (sj1 <= -1) loc1 = 1; else if (sj1 >= 1) loc1 = 2;
      else {
        loc1 = 0; j = asin(sj1); t = atan2(v6, v7);
        if (cos(j) < 0) { gD1 = j - t; gA1 = PI - j - t; } else { gD1 = PI - j - t; gA1 = j - t; }
        x = cos(gD1); y = sin(gD1); tD1 = atan2(cl1 * (v3 * x + v4 * y) + sl1 * v5, cl1 * (v0 * x + v1 * y) + sl1 * v2);
        x = cos(gA1); y = sin(gA1); startX = cl1 * (v0 * x + v1 * y) + sl1 * v2; startY = cl1 * (v3 * x + v4 * y) + sl1 * v5; tA1 = atan2(startY, startX);
      }
    }
    var A2 = cl2 * sqrt(v6 * v6 + v7 * v7);
    if (A2 === 0) { loc2 = (sl2 * v8 < 0) ? 2 : 1; }
    else {
      var sj2 = -sl2 * v8 / A2;
      if (sj2 <= -1) loc2 = 1; else if (sj2 >= 1) loc2 = 2;
      else {
        loc2 = 0; j = asin(sj2); t = atan2(v6, v7);
        if (cos(j) < 0) { gD2 = j - t; gA2 = PI - j - t; } else { gD2 = PI - j - t; gA2 = j - t; }
        x = cos(gD2); y = sin(gD2); tD2 = atan2(cl2 * (v3 * x + v4 * y) + sl2 * v5, cl2 * (v0 * x + v1 * y) + sl2 * v2);
        x = cos(gA2); y = sin(gA2);
        if (startX == null) { startX = cl2 * (v0 * x + v1 * y) + sl2 * v2; startY = cl2 * (v3 * x + v4 * y) + sl2 * v5; tA2 = atan2(startY, startX); }
        else tA2 = atan2(cl2 * (v3 * x + v4 * y) + sl2 * v5, cl2 * (v0 * x + v1 * y) + sl2 * v2);
      }
    }
    function moveStart() { front.moveTo(startX, startY); back.moveTo(startX, startY); }

    if (loc1 === 0 && loc2 === 0) {
      moveStart(); perim(tA1, tA2, 1);
      sph(front, gA2, gD2, cl2, sl2, 1); sph(back, gA2, gD2, cl2, sl2, -1);
      perim(tD2, tD1, 1);
      sph(front, gD1, gA1, cl1, sl1, -1); sph(back, gD1, gA1, cl1, sl1, 1);
    } else if (loc1 === 0 && loc2 === 1) {
      moveStart(); sph(front, gA1, gD1, cl1, sl1, 1); sph(back, gA1, gD1, cl1, sl1, -1);
      perim(tD1, tA1, -1); if (this._type2 === 0) sph(front, 0, 0, cl2, sl2, -1);
    } else if (loc1 === 0 && loc2 === 2) {
      moveStart(); sph(front, gA1, gD1, cl1, sl1, 1); sph(back, gA1, gD1, cl1, sl1, -1);
      perim(tD1, tA1, -1); if (this._type2 === 0) sph(back, 0, 0, cl2, sl2, 1);
    } else if (loc1 === 1 && loc2 === 0) {
      moveStart(); sph(front, gA2, gD2, cl2, sl2, 1); sph(back, gA2, gD2, cl2, sl2, -1);
      perim(tD2, tA2, 1); if (this._type1 === 0) sph(front, 0, 0, cl1, sl1, -1);
    } else if (loc1 === 1 && loc2 === 1) {
      if (this._type1 === 0) sph(front, 0, 0, cl1, sl1, 1); if (this._type2 === 0) sph(front, 0, 0, cl2, sl2, -1);
    } else if (loc1 === 1 && loc2 === 2) {
      if (this._type1 === 0) sph(front, 0, 0, cl1, sl1, 1); if (this._type2 === 0) sph(back, 0, 0, cl2, sl2, 1); perim(0, 0, -1);
    } else if (loc1 === 2 && loc2 === 0) {
      moveStart(); sph(front, gA2, gD2, cl2, sl2, 1); sph(back, gA2, gD2, cl2, sl2, -1);
      perim(tD2, tA2, 1); if (this._type1 === 0) sph(back, 0, 0, cl1, sl1, 1);
    } else if (loc1 === 2 && loc2 === 1) {
      if (this._type1 === 0) sph(back, 0, 0, cl1, sl1, 1); if (this._type2 === 0) sph(front, 0, 0, cl2, sl2, 1); perim(0, 0, 1);
    } else if (loc1 === 2 && loc2 === 2) {
      if (this._type1 === 0) sph(back, 0, 0, cl1, sl1, 1); if (this._type2 === 0) sph(back, 0, 0, cl2, sl2, -1);
    }
    return { front: front, back: back };
  };

  /* ======================= SCENE (port of "Moon Dec Demo.as" init) ========= */
  var sphere = new Sphere(150);      // sphereMC.size = 300 -> r 150
  sphere._minPhi = 7;                // minViewerAltitude = 7

  // Shaded band: the full moon's declination range (dec -5.1..5.1, tilt 23.4).
  var moonBand = new ShadedBand(sphere, { dec1: -5.1, dec2: 5.1, tilt: 23.4 });
  sphere.bands.push(moonBand);

  // Circles (colours/alphas verbatim from the AS)
  var C = {};
  function addCircle(name, style, def) { var c = new Circle(sphere, style, def); sphere.circles.push(c); C[name] = c; return c; }
  addCircle('ecliptic', { thickness: 1, color: 10502208, alpha: 50 }, { ra: 0, dec: 0, tilt: 23.4 });
  addCircle('meridian', { thickness: 1, color: 16769909, alpha: 70 }, { az: 0, alt: 0, tilt: 90 });
  addCircle('celestialEquator', { thickness: 1, color: 16769909, alpha: 70 }, { ra: 0, dec: 0, tilt: 0 });

  // Lines: the celestial pole axis, sticking out top & bottom (light blue)
  var L = {};
  function addLine(name, style, head, tail) { var l = new Line(sphere, style, head, tail); sphere.lines.push(l); L[name] = l; return l; }
  addLine('ncpAxis', { thickness: 2, color: 7711231, alpha: 100 }, { x: 0, y: 0, z: 1, system: 'celestial' }, { x: 0, y: 0, z: 1.2, system: 'celestial' });
  addLine('scpAxis', { thickness: 2, color: 7711231, alpha: 100 }, { x: 0, y: 0, z: -1, system: 'celestial' }, { x: 0, y: 0, z: -1.2, system: 'celestial' });

  // Sun + Moon discs
  var sun = new Disc(sphere, { ra: 0, dec: 0 }); sphere.objects.push(sun);
  var moon = new Disc(sphere, { ra: 12, dec: 0 }); sphere.objects.push(moon);

  /* ---- demo state ---- */
  var state = { dayOfYear: 45, moonDec: 0 };

  // port of "Moon Dec Demo.as" update(): place Sun & Moon from the day of year.
  function setDayOfYear(arg) {
    var doy = mod(arg, 365);
    state.dayOfYear = doy;
    var sunLongitude = (doy - 78) / 365 * TWO_PI;                       // verbatim
    var sunDeclination = Math.asin(0.39714789063478056 * Math.sin(sunLongitude));
    var sunDec = R2D * sunDeclination;
    var sunRA = mod(R2H * Math.atan2(Math.sin(sunLongitude) * 0.9177546256839811, Math.cos(sunLongitude)), 24);
    sun.setPosition({ ra: sunRA, dec: sunDec });
    moon.setPosition({ ra: sunRA + 12, dec: -sunDec });
    sphere.setSiderealTime(sunRA + 12);                                 // this.sphereMC.siderealTime = sunRA + 12
    // Plot curve value uses the (doy-78.5) form (verbatim from "Moon Dec Plot.as").
    var sunLon2 = (doy - 78.5) / 365 * TWO_PI;
    state.moonDec = -R2D * Math.asin(0.39714789063478056 * Math.sin(sunLon2));
    syncReadouts();
  }

  function reset() {
    sphere.setThetaAndPhi(200, 20);        // demoMC.setThetaAndPhi(200,20)
    setDayOfYear(45);                      // setDayOfYear(45)
    doyRange.value = 45; doyField.value = '45';
    requestRenderSky(); requestRenderPlot();
    announce('View reset. Day of year 45. Full moon declination ' + spokenNum(state.moonDec, 1) + ' degrees.');
  }

  /* =========================== SKY RENDERING =============================== */
  var skyCanvas = document.getElementById('sky-canvas');
  var sky = skyCanvas.getContext('2d');
  var SKY_STAGE = 380, SKY_CX = SKY_STAGE / 2, SKY_CY = SKY_STAGE / 2;

  function fitSky() {
    var dpr = window.devicePixelRatio || 1;
    skyCanvas.width = SKY_STAGE * dpr; skyCanvas.height = SKY_STAGE * dpr;
    sky.setTransform(dpr, 0, 0, dpr, 0, 0);
    requestRenderSky();
  }

  function strokeArcs(arcs, v, color, thick, alpha) {
    sky.strokeStyle = css(color, alpha); sky.lineWidth = Math.max(thick, 0.6);
    for (var i = 0; i < arcs.length; i++) { sky.beginPath(); drawArc(sky, v, arcs[i][0], arcs[i][1], 0.7853981633974483); sky.stroke(); }
  }
  function drawLineSegs(segs, which, color, thick, alpha) {
    sky.strokeStyle = css(color, alpha); sky.lineWidth = Math.max(thick, 0.6);
    for (var i = 0; i < segs.length; i++) {
      if (segs[i].layer !== which) continue;
      sky.beginPath(); sky.moveTo(segs[i].x1, segs[i].y1); sky.lineTo(segs[i].x2, segs[i].y2); sky.stroke();
    }
  }
  // Bowl shading (celestialBowl: innerColor white a0 -> outerColor black a20).
  function drawBowl() {
    var r = sphere._c.r, g = sky.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.75, 'rgba(0,0,0,0.03)'); g.addColorStop(1, 'rgba(0,0,0,0.20)');
    sky.fillStyle = g; sky.beginPath(); sky.arc(0, 0, r, 0, TWO_PI); sky.fill();
  }
  // Fill a shaded-band face (front/back) with the pink "Symbol 204" gradient.
  function fillBand(path, alpha) {
    var r = sphere._c.r;
    sky.save();
    sky.scale(r / 100, r / 100);           // paths are built in AS "100 = radius" space
    var g = sky.createRadialGradient(0, 0, 0, 0, 0, 100);
    g.addColorStop(0, 'rgba(241,141,141,' + alpha + ')');   // #f18d8d (Symbol 204 inner)
    g.addColorStop(1, 'rgba(108,30,30,' + alpha + ')');     // #6c1e1e (outer)
    sky.fillStyle = g; sky.fill(path);
    // thin red border (setBorderStyle 1, #FF0000, alpha 40)
    sky.lineWidth = 100 / r; sky.strokeStyle = css(16711680, 40); sky.stroke(path);
    sky.restore();
  }
  // Green horizon plane: project the alt=0 circle to its ellipse and fill.
  function drawHorizonPlane() {
    sky.beginPath();
    var N = 96, i, sp = {};
    for (i = 0; i <= N; i++) { sphere.WtoSz(sphere.parse({ az: i / N * 360, alt: 0, r: 1 }), sp); if (i === 0) sky.moveTo(sp.x, sp.y); else sky.lineTo(sp.x, sp.y); }
    sky.closePath();
    var g = sky.createRadialGradient(0, 0, 0, 0, 0, sphere._c.r);
    g.addColorStop(0, '#51c451'); g.addColorStop(1, '#3aa53a');   // shape 43 gradient stops
    sky.fillStyle = g; sky.globalAlpha = 0.92; sky.fill(); sky.globalAlpha = 1;
    sky.strokeStyle = 'rgba(255,255,255,0.45)'; sky.lineWidth = 1; sky.stroke();
  }
  // Cardinal direction labels (N/E/S/W) on the horizon plane (texts 33-36).
  var DIRS = [{ az: 0, t: 'N' }, { az: 90, t: 'E' }, { az: 180, t: 'S' }, { az: 270, t: 'W' }];
  function drawDirLabels() {
    sky.font = '600 14px SimVerdana, Verdana, Arial, sans-serif'; sky.textAlign = 'center'; sky.textBaseline = 'middle';
    for (var i = 0; i < DIRS.length; i++) {
      var sp = {}; sphere.WtoSz(sphere.parse({ az: DIRS[i].az, alt: 0, r: 0.82 }), sp);
      sky.lineWidth = 3; sky.strokeStyle = 'rgba(255,255,255,0.85)'; sky.lineJoin = 'round';
      sky.strokeText(DIRS[i].t, sp.x, sp.y); sky.fillStyle = '#000000'; sky.fillText(DIRS[i].t, sp.x, sp.y);
    }
  }
  function drawSun(x, y, front) {
    var rad = sunHover ? 10 : 8;
    sky.globalAlpha = front ? 1 : 0.5;
    var g = sky.createRadialGradient(x - rad * 0.3, y - rad * 0.3, 1, x, y, rad);
    g.addColorStop(0, '#ffcc00'); g.addColorStop(1, '#edb101');   // shape 31 (Sun Disc)
    sky.beginPath(); sky.arc(x, y, rad, 0, TWO_PI); sky.fillStyle = g; sky.fill();
    sky.lineWidth = 1; sky.strokeStyle = '#c98f00'; sky.stroke(); sky.globalAlpha = 1;
  }
  function drawMoon(x, y, front) {
    var rad = 7;
    sky.globalAlpha = front ? 1 : 0.5;
    sky.beginPath(); sky.arc(x, y, rad, 0, TWO_PI); sky.fillStyle = '#cccccc';   // shape 29 (Moon Disc)
    sky.fill(); sky.lineWidth = 1; sky.strokeStyle = '#999999'; sky.stroke(); sky.globalAlpha = 1;
  }

  var sunHover = false, skyQueued = false;
  function requestRenderSky() { if (!skyQueued) { skyQueued = true; requestAnimationFrame(renderSky); } }
  function renderSky() {
    skyQueued = false;
    sphere.doA(); sphere.doB();
    for (var i = 0; i < sphere.objects.length; i++) sphere.objects[i].update();

    sky.clearRect(0, 0, SKY_STAGE, SKY_STAGE);
    sky.save(); sky.translate(SKY_CX, SKY_CY);

    // sphere disc backdrop (very faint) + back bowl
    sky.beginPath(); sky.arc(0, 0, sphere._c.r, 0, TWO_PI);
    sky.fillStyle = 'rgba(250,250,252,0.9)'; sky.fill();

    var bandPaths = moonBand._visible ? moonBand.buildPaths() : null;
    var circleData = [];
    for (i = 0; i < sphere.circles.length; i++) { var c = sphere.circles[i]; circleData.push(c._visible ? c.computeArcs() : null); }
    var lineSegs = []; for (i = 0; i < sphere.lines.length; i++) lineSegs.push(sphere.lines[i].computeSegments());

    // ---- back hemisphere ----
    if (bandPaths) fillBand(bandPaths.back, 0.22);
    for (i = 0; i < sphere.circles.length; i++) { var cd = circleData[i], cc = sphere.circles[i]; if (cd) strokeArcs(cd.back, cd.v, cc._color, cc._thick, cc._alpha * 0.5); }
    for (i = 0; i < sphere.lines.length; i++) { drawLineSegs(lineSegs[i], 'bE', sphere.lines[i]._color, sphere.lines[i]._thick, sphere.lines[i]._alpha); drawLineSegs(lineSegs[i], 'bI', sphere.lines[i]._color, sphere.lines[i]._thick, sphere.lines[i]._alpha); }
    if (sun._sp.z < 0) drawSun(sun._sp.x, sun._sp.y, false);
    if (moon._sp.z < 0) drawMoon(moon._sp.x, moon._sp.y, false);

    // ---- middle: horizon plane + direction labels ----
    drawHorizonPlane(); drawDirLabels();

    // ---- front hemisphere ----
    if (bandPaths) fillBand(bandPaths.front, 0.5);
    for (i = 0; i < sphere.circles.length; i++) { var cd2 = circleData[i], cc2 = sphere.circles[i]; if (cd2) strokeArcs(cd2.front, cd2.v, cc2._color, cc2._thick, cc2._alpha); }
    for (i = 0; i < sphere.lines.length; i++) { drawLineSegs(lineSegs[i], 'aI', sphere.lines[i]._color, sphere.lines[i]._thick, sphere.lines[i]._alpha); drawLineSegs(lineSegs[i], 'fE', sphere.lines[i]._color, sphere.lines[i]._thick, sphere.lines[i]._alpha); }
    drawBowl();
    sky.strokeStyle = 'rgba(120,120,120,0.55)'; sky.lineWidth = 1; sky.beginPath(); sky.arc(0, 0, sphere._c.r, 0, TWO_PI); sky.stroke();
    if (sun._sp.z >= 0) drawSun(sun._sp.x, sun._sp.y, true);
    if (moon._sp.z >= 0) drawMoon(moon._sp.x, moon._sp.y, true);

    sky.restore();
  }

  /* =========================== PLOT RENDERING =============================
     Port of "Moon Dec Plot.as": the declination curve + ±7 deg shaded band.
     Plot area is 400 x 275 with maxDec = 40, exactly as the AS. ------------- */
  var plotCanvas = document.getElementById('plot-canvas');
  var plot = plotCanvas.getContext('2d');
  var PLOT_STAGE_W = 470, PLOT_STAGE_H = 320;
  var PLOT_W = 400, PLOT_H = 275, MAX_DEC = 40;
  var PLOT_LEFT = 54, PLOT_TOP = 24;                 // margins for axis labels / cursor
  var PLOT_VC = PLOT_TOP + PLOT_H / 2;               // dec = 0 line (screen y)
  var yScale = (-PLOT_H / 2) / MAX_DEC;              // verbatim: (-h/2)/maxDec
  var xScale = PLOT_W / 365;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DEC_TICKS = [40, 30, 20, 10, 0, -10, -20, -30, -40];

  function fitPlot() {
    var dpr = window.devicePixelRatio || 1;
    plotCanvas.width = PLOT_STAGE_W * dpr; plotCanvas.height = PLOT_STAGE_H * dpr;
    plot.setTransform(dpr, 0, 0, dpr, 0, 0);
    requestRenderPlot();
  }
  function moonDecAt(doy) { var lon = (doy - 78.5) / 365 * TWO_PI; return -R2D * Math.asin(0.39714789063478056 * Math.sin(lon)); }

  var plotQueued = false;
  function requestRenderPlot() { if (!plotQueued) { plotQueued = true; requestAnimationFrame(renderPlot); } }
  function renderPlot() {
    plotQueued = false;
    plot.clearRect(0, 0, PLOT_STAGE_W, PLOT_STAGE_H);

    // gridlines + axis frame
    plot.strokeStyle = 'rgba(0,0,0,0.12)'; plot.lineWidth = 1;
    plot.strokeRect(PLOT_LEFT, PLOT_TOP, PLOT_W, PLOT_H);

    // y-axis dec ticks + labels
    plot.font = '12px SimVerdana, Verdana, Arial, sans-serif'; plot.fillStyle = '#333';
    plot.textAlign = 'right'; plot.textBaseline = 'middle';
    for (var i = 0; i < DEC_TICKS.length; i++) {
      var yv = PLOT_VC + DEC_TICKS[i] * yScale;
      if (DEC_TICKS[i] === 0) { plot.strokeStyle = 'rgba(80,80,80,0.5)'; plot.setLineDash([4, 3]); plot.beginPath(); plot.moveTo(PLOT_LEFT, yv); plot.lineTo(PLOT_LEFT + PLOT_W, yv); plot.stroke(); plot.setLineDash([]); }
      plot.fillText(DEC_TICKS[i] + '°', PLOT_LEFT - 8, yv);
    }
    // x-axis month labels
    plot.textAlign = 'center'; plot.textBaseline = 'top';
    for (i = 0; i < 12; i++) { var xm = PLOT_LEFT + ((i + 0.5) / 12) * PLOT_W; plot.fillText(MONTHS[i], xm, PLOT_TOP + PLOT_H + 6); }

    // shaded band (±7 deg) + curve  (verbatim: dy = 7 * yScale)
    var n = PLOT_W, dy = 7 * yScale, doyStep = 365 / n, doy = 0, k;
    var top = [], bot = [], cur = [];
    for (k = 0; k <= n; k++) {
      var md = moonDecAt(doy);
      var xx = PLOT_LEFT + doy * xScale, yy = PLOT_VC + md * yScale;
      cur.push([xx, yy]); top.push([xx, yy + dy]); bot.push([xx, yy - dy]);
      doy += doyStep;
    }
    // band fill (13664384 = #D08080, alpha 30)
    plot.beginPath(); plot.moveTo(top[0][0], top[0][1]);
    for (k = 1; k < top.length; k++) plot.lineTo(top[k][0], top[k][1]);
    for (k = bot.length - 1; k >= 0; k--) plot.lineTo(bot[k][0], bot[k][1]);
    plot.closePath(); plot.fillStyle = css(13664384, 30); plot.fill();
    // curve (10502208 = #A04040)
    plot.beginPath(); plot.moveTo(cur[0][0], cur[0][1]);
    for (k = 1; k < cur.length; k++) plot.lineTo(cur[k][0], cur[k][1]);
    plot.strokeStyle = css(10502208, 100); plot.lineWidth = 1.5; plot.stroke();

    // day-of-year cursor (blue #9a9bfe line + downward triangle) -- shape 86
    var cx = PLOT_LEFT + state.dayOfYear * xScale;
    plot.strokeStyle = '#9a9bfe'; plot.lineWidth = 2;
    plot.beginPath(); plot.moveTo(cx, PLOT_TOP - 2); plot.lineTo(cx, PLOT_TOP + PLOT_H); plot.stroke();
    plot.fillStyle = '#9a9bfe'; plot.beginPath();
    plot.moveTo(cx - 7, PLOT_TOP - 16); plot.lineTo(cx + 7, PLOT_TOP - 16); plot.lineTo(cx, PLOT_TOP - 4); plot.closePath(); plot.fill();
  }

  /* =========================== INTERACTION ================================ */
  // --- plot: drag cursor / arrow keys ---
  function plotToDoy(ev) {
    var rect = plotCanvas.getBoundingClientRect(), sx = rect.width ? PLOT_STAGE_W / rect.width : 1;
    var x = (ev.clientX - rect.left) * sx;
    return 365 * (x - PLOT_LEFT) / PLOT_W;    // verbatim mapping from setDayOfYear drag
  }
  function commitDoy(d, announceIt) {
    d = Math.round(d); if (d < 1) d = 1; else if (d > 365) d = 365;
    setDayOfYear(d); doyRange.value = d; doyField.value = String(d);
    requestRenderPlot(); requestRenderSky();
    if (announceIt) announce(plotDescription());
  }
  var plotDragging = false;
  plotCanvas.addEventListener('pointerdown', function (ev) {
    plotCanvas.setPointerCapture(ev.pointerId); plotCanvas.focus();
    plotDragging = true; commitDoy(plotToDoy(ev), false); ev.preventDefault();
  });
  plotCanvas.addEventListener('pointermove', function (ev) { if (plotDragging) { commitDoy(plotToDoy(ev), false); ev.preventDefault(); } });
  function endPlotDrag() { if (plotDragging) { plotDragging = false; announce(plotDescription()); } }
  plotCanvas.addEventListener('pointerup', endPlotDrag);
  plotCanvas.addEventListener('pointercancel', endPlotDrag);
  plotCanvas.addEventListener('keydown', function (ev) {
    var d = state.dayOfYear, used = true, step = ev.shiftKey ? 10 : 1;
    switch (ev.key) {
      case 'ArrowLeft': case 'ArrowDown': d -= step; break;
      case 'ArrowRight': case 'ArrowUp': d += step; break;
      case 'Home': d = 1; break;
      case 'End': d = 365; break;
      case 'PageUp': d += 30; break;
      case 'PageDown': d -= 30; break;
      default: used = false;
    }
    if (used) { commitDoy(d, true); ev.preventDefault(); }
  });

  // --- sphere: drag to rotate view / arrow keys (port of "simple drag") ---
  function skyToStage(ev) {
    var rect = skyCanvas.getBoundingClientRect(), sx = rect.width ? SKY_STAGE / rect.width : 1, sy = rect.height ? SKY_STAGE / rect.height : 1;
    return { x: (ev.clientX - rect.left) * sx - SKY_CX, y: (ev.clientY - rect.top) * sy - SKY_CY };
  }
  var skyDrag = null;
  skyCanvas.addEventListener('pointerdown', function (ev) {
    skyCanvas.setPointerCapture(ev.pointerId); skyCanvas.focus();
    var m = skyToStage(ev);
    skyDrag = { x: m.x, y: m.y, theta: sphere._theta, phi: sphere._phi }; ev.preventDefault();
  });
  skyCanvas.addEventListener('pointermove', function (ev) {
    var m = skyToStage(ev);
    if (!skyDrag) {
      var d = Math.sqrt((m.x - sun._sp.x) * (m.x - sun._sp.x) + (m.y - sun._sp.y) * (m.y - sun._sp.y));
      var h = (sun._sp.z >= 0 && d <= 12); if (h !== sunHover) { sunHover = h; requestRenderSky(); }
      return;
    }
    // updateSimpleDragging: theta -= dx/r ; phi += dy/r
    sphere.setThetaAndPhi(R2D * (skyDrag.theta - (m.x - skyDrag.x) / sphere._c.r), R2D * (skyDrag.phi + (m.y - skyDrag.y) / sphere._c.r));
    requestRenderSky(); ev.preventDefault();
  });
  function endSkyDrag() { if (skyDrag) { skyDrag = null; announce(viewDescription()); } }
  skyCanvas.addEventListener('pointerup', endSkyDrag);
  skyCanvas.addEventListener('pointercancel', endSkyDrag);
  skyCanvas.addEventListener('keydown', function (ev) {
    var step = ev.shiftKey ? 15 : 5, t = sphere.getTheta(), p = sphere.getPhi(), used = true;
    switch (ev.key) {
      case 'ArrowLeft': sphere.setThetaAndPhi(t - step, p); break;
      case 'ArrowRight': sphere.setThetaAndPhi(t + step, p); break;
      case 'ArrowUp': sphere.setThetaAndPhi(t, p + step); break;
      case 'ArrowDown': sphere.setThetaAndPhi(t, p - step); break;
      default: used = false;
    }
    if (used) { requestRenderSky(); announce(viewDescription()); ev.preventDefault(); }
  });

  /* =========================== CONTROLS =================================== */
  var doyRange = document.getElementById('doy-range'), doyField = document.getElementById('doy-field');
  doyRange.addEventListener('input', function () { commitDoy(parseFloat(doyRange.value), false); });
  doyRange.addEventListener('change', function () { announce(plotDescription()); });
  doyField.addEventListener('change', function () { var v = parseInt(doyField.value, 10); if (!isNaN(v)) commitDoy(v, true); else doyField.value = String(state.dayOfYear); });

  // reset comes from the shared masthead component
  document.addEventListener('sim-reset', reset);

  /* ===================== MathJax readouts + a11y text ==================== */
  function syncReadouts() {
    var sign = state.moonDec >= 0 ? '+' : '';
    if (window.klunlShowEquation) {
      klunlShowEquation(
        ['dec-eqn', '\\(\\delta_{\\text{moon}} = ' + sign + asFixed(state.moonDec, 1) + '^{\\circ}\\)'],
        ['dec-eqn-sr', 'Full moon declination ' + spokenNum(state.moonDec, 1) + ' degrees on day ' + asFixed(state.dayOfYear, 0) + ' of the year.']);
    }
    doyRange.setAttribute('aria-valuetext', 'Day ' + asFixed(state.dayOfYear, 0) + ' of 365, ' + monthName(state.dayOfYear) + '. Full moon declination ' + spokenNum(state.moonDec, 1) + ' degrees.');
  }
  function monthName(doy) { var m = Math.floor(mod(doy, 365) / 365 * 12); if (m > 11) m = 11; return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m]; }
  function plotDescription() {
    return 'Day of year ' + asFixed(state.dayOfYear, 0) + ' (' + monthName(state.dayOfYear) + '). Full moon declination ' + spokenNum(state.moonDec, 1) + ' degrees, with a range of about plus or minus 7 degrees.';
  }
  function viewDescription() {
    return 'Horizon diagram rotated to azimuth ' + spokenNum(mod(sphere.getTheta(), 360), 0) + ' degrees, viewer altitude ' + spokenNum(sphere.getPhi(), 0) + ' degrees.';
  }
  function describeScene() {
    return 'Declination range plot: a sinusoidal curve of the full moon’s declination across the year, ' +
      'peaking near plus 23 degrees in winter and minus 23 degrees in summer, inside a shaded band about 7 degrees wide. ' +
      'A blue cursor marks day ' + asFixed(state.dayOfYear, 0) + ' (' + monthName(state.dayOfYear) + '), where the full moon declination is ' + spokenNum(state.moonDec, 1) + ' degrees.';
  }
  function describeSky() {
    return 'Horizon diagram for a northern-hemisphere observer at latitude 41 degrees. A celestial sphere with a green horizon plane marked North, East, South and West; ' +
      'the gold Sun and the grey full Moon on opposite sides; the ecliptic and celestial equator circles; and a pink band showing the moon’s declination range. ' +
      'Viewed at azimuth ' + spokenNum(mod(sphere.getTheta(), 360), 0) + ' degrees, viewer altitude ' + spokenNum(sphere.getPhi(), 0) + ' degrees.';
  }
  var live = document.getElementById('sr-status'), plotDesc = document.getElementById('plot-desc'), skyDesc = document.getElementById('sky-desc');
  function announce(msg) { if (live) live.textContent = msg; if (plotDesc) plotDesc.textContent = describeScene(); if (skyDesc) skyDesc.textContent = describeSky(); }

  // klunlInitEqn is called by the foundation on load; redefine to set up our math.
  window.klunlInitEqn = function () {
    syncReadouts();
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise().catch(function (e) { console.error(e); });
  };

  /* =========================== STARTUP =================================== */
  window.addEventListener('resize', function () { fitSky(); fitPlot(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { renderSky(); renderPlot(); });
  // Re-paint when the tab becomes visible again (requestAnimationFrame does not
  // run in a hidden/background tab, so a deferred render could otherwise be lost).
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { renderSky(); renderPlot(); } });
  fitSky(); fitPlot();
  reset();
  // Guarantee a first paint even if the tab starts hidden (rAF would not fire).
  renderSky(); renderPlot();
  announce('Ready. ' + plotDescription());
  if (window.MathJax && MathJax.startup && MathJax.startup.promise) MathJax.startup.promise.then(function () { window.klunlInitEqn(); });
  else syncReadouts();

})();
