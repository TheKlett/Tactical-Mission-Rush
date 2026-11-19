/* =====================================================================
   WORLD — terrain, collision, raycasts, navigation, doors, lights,
   destructibles, building generator with furnished interiors, props.
   ===================================================================== */
class World {
  constructor(size, seed) {
    this.size = size; this.half = size / 2; this.rng = mulberry(seed || 1);
    this.B = new MB(1 << 18); this.D = new MB(1 << 16); // main + detail builders
    this.cols = []; this.hashCell = 4; this.hashN = Math.ceil(size / 4) + 2; this.hash = new Map(); this.stamp = 1;
    this.doors = []; this.interact = []; this.lights = []; this.dyn = []; this.destr = []; this.items = [];
    this.veg = []; this.interiors = []; this.mapLines = []; this.mapRects = []; this.roads = []; this.trees = []; this.anchors = {}; this.pois = [];
    this.water = null; this.waterY = -100; this.sounds = []; this.cams = []; this.vehicles = []; this.windows = [];
    this.meshCache = {}; this.doorZones = [];
    // furniture placement is transactional: anything whose collider would block a doorway is rolled back
    for (const name of ['chair', 'table', 'desk', 'officeChair', 'shelf', 'cabinet', 'bed', 'bunk', 'footlocker', 'locker', 'counter', 'fridge', 'sofa', 'armchair', 'tableLow', 'tv', 'wardrobe', 'nightstand', 'plant', 'safe', 'rack', 'crate', 'crateStack', 'barrel', 'sacks', 'workbench', 'tires', 'oil', 'toolchest', 'serverRack', 'monitors', 'toilet', 'radioDesk', 'bench', 'bigPlant', 'roundTable', 'piano', 'barCounter', 'barShelves', 'depositBoxes']) {
      const orig = this[name]; if (!orig) continue;
      this[name] = (...args) => {
        if (this._tx) return orig.apply(this, args);
        const bn = this.B ? this.B.n : 0, dn = this.D ? this.D.n : 0, cn = this.cols.length, ln = this.lights.length, yn = this.dyn.length, sn = this.destr.length, an = {}; for (const k in this.anchors) an[k] = this.anchors[k].length;
        this._tx = true; let r; try { r = orig.apply(this, args); } finally { this._tx = false; }
        const added = this.cols.slice(cn); const blocks = added.some(c => c.on && this.doorZones.some(z => c.mn[0] < z[2] && c.mx[0] > z[0] && c.mn[2] < z[3] && c.mx[2] > z[1] && c.mx[1] > z[4] + .25 && c.mn[1] < z[4] + 2));
        if (blocks) { this.B.n = bn; this.D.n = dn; for (const c of added) this.hashRem(c); this.cols.length = cn; this.lights.length = ln; this.dyn.length = yn; this.destr.length = sn; for (const k in this.anchors) this.anchors[k].length = an[k] || 0; for (const k in this.anchors) if (!(k in an)) delete this.anchors[k]; }
        return r;
      };
    }
  }
  R() { return this.rng(); }
  /* ---------------- terrain ---------------- */
  initTerrain(fn, res = 2) {
    this.tres = res; this.tn = Math.floor(this.size / res) + 1; this.hgrid = new Float32Array(this.tn * this.tn); this.hfn = fn;
    for (let j = 0; j < this.tn; j++) for (let i = 0; i < this.tn; i++) this.hgrid[j * this.tn + i] = fn(i * res - this.half, j * res - this.half);
  }
  th(x, z) { // terrain height (bilinear)
    const fx = (x + this.half) / this.tres, fz = (z + this.half) / this.tres; const n = this.tn;
    let i = Math.floor(fx), j = Math.floor(fz); if (i < 0) i = 0; if (j < 0) j = 0; if (i > n - 2) i = n - 2; if (j > n - 2) j = n - 2;
    const u = clamp(fx - i, 0, 1), v = clamp(fz - j, 0, 1); const g = this.hgrid;
    return lerp(lerp(g[j * n + i], g[j * n + i + 1], u), lerp(g[(j + 1) * n + i], g[(j + 1) * n + i + 1], u), v);
  }
  flatten(x0, z0, x1, z1, h, blend = 4) {
    const n = this.tn, r = this.tres;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = i * r - this.half, z = j * r - this.half;
      const dx = Math.max(x0 - x, 0, x - x1), dz = Math.max(z0 - z, 0, z - z1); const d = Math.hypot(dx, dz);
      if (d > blend) continue; const k = d <= 0 ? 1 : 1 - smooth(d / blend); const idx = j * n + i; this.hgrid[idx] = lerp(this.hgrid[idx], h, k);
    }
  }
  flattenPath(pts, w, blend = 4, minH = -99) {
    const n = this.tn, r = this.tres;
    const segs = []; for (let k = 0; k < pts.length - 1; k++) segs.push([pts[k], pts[k + 1]]);
    const hs = pts.map(p => Math.max(minH, this.th(p[0], p[1])));
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = i * r - this.half, z = j * r - this.half; let best = 1e9, bh = 0;
      for (let k = 0; k < segs.length; k++) {
        const [a, b] = segs[k]; const dx = b[0] - a[0], dz = b[1] - a[1]; const L2 = dx * dx + dz * dz || 1; const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / L2, 0, 1);
        const d = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); if (d < best) { best = d; bh = lerp(hs[k], hs[k + 1], t); }
      }
      if (best > w / 2 + blend) continue; const k2 = best <= w / 2 ? 1 : 1 - smooth((best - w / 2) / blend); const idx = j * n + i; this.hgrid[idx] = lerp(this.hgrid[idx], bh, k2 * .85);
    }
  }
  buildTerrainMesh(colorFn) {
    const B = this.B, n = this.tn, r = this.tres, g = this.hgrid;
    const P = (i, j) => [i * r - this.half, g[j * n + i], j * r - this.half];
    const Nrm = (i, j) => { const i0 = Math.max(i - 1, 0), i1 = Math.min(i + 1, n - 1), j0 = Math.max(j - 1, 0), j1 = Math.min(j + 1, n - 1); const dx = g[j * n + i1] - g[j * n + i0], dz = g[j1 * n + i] - g[j0 * n + i]; return V.norm([-dx / ((i1 - i0) * r), 1, -dz / ((j1 - j0) * r)]); };
    const save = B.mat; B.grow((n - 1) * (n - 1) * 6);
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const q = [[i, j], [i + 1, j + 1], [i + 1, j], [i, j], [i, j + 1], [i + 1, j + 1]];
      for (const [a, b] of q) { const p = P(a, b); const nn = Nrm(a, b); const cm = colorFn(p[0], p[2], p[1], nn); B._cc = cm.c; B.mat = cm.m; B.bone = 0; B.vtx(p[0], p[1], p[2], nn[0], nn[1], nn[2]); }
    }
    B.mat = save;
  }
  setWater(y, col, deep, alpha = .82, rough = 1) {
    this.waterY = y; const B = new MB(200000); const s = this.size, step = 8;
    for (let z = -s / 2; z < s / 2; z += step) for (let x = -s / 2; x < s / 2; x += step) {
      // only emit where terrain might be below water
      let low = false; for (const [a, b] of [[0, 0], [step, 0], [0, step], [step, step], [step / 2, step / 2]]) if (this.th(x + a, z + b) < y + .3) low = true;
      if (!low) continue; B.begin(); B.quad([x, y, z + step], [x + step, y, z + step], [x + step, y, z], [x, y, z]);
    }
    // outer ocean skirt
    const E = 1200; B.quad([-E, y, E], [E, y, E], [E, y, s / 2], [-E, y, s / 2]); B.quad([-E, y, -s / 2], [E, y, -s / 2], [E, y, -E], [-E, y, -E]);
    B.quad([-E, y, s / 2], [-s / 2, y, s / 2], [-s / 2, y, -s / 2], [-E, y, -s / 2]); B.quad([s / 2, y, s / 2], [E, y, s / 2], [E, y, -s / 2], [s / 2, y, -s / 2]);
    this.water = { mesh: B.mesh(), col: col, deep: deep, alpha, rough, level: y };
  }
  /* ---------------- colliders ---------------- */
  col(mnx, mny, mnz, mxx, mxy, mxz, o = {}) {
    const c = { mn: [Math.min(mnx, mxx), Math.min(mny, mxy), Math.min(mnz, mxz)], mx: [Math.max(mnx, mxx), Math.max(mny, mxy), Math.max(mnz, mxz)], surf: o.surf || 'concrete', walk: !!o.walk, sight: o.sight !== false, bullet: o.bullet !== false, on: true, id: o.id, glass: !!o.glass, ref: o.ref || null, nav: o.nav !== false, s: 0 };
    this.cols.push(c); this.hashIns(c); return c;
  }
  colBox(x, y, z, w, h, d, o) { return this.col(x - w / 2, y - h / 2, z - d / 2, x + w / 2, y + h / 2, z + d / 2, o); }
  colRot(x, y, z, q, lx, lz, w, h, d, o, ly = 0) { // footprint rotated by quarter turns q
    const c = [lx, lz]; let rx = c[0], rz = c[1], ww = w, dd = d;
    for (let i = 0; i < (q & 3); i++) { const t = rx; rx = rz; rz = -t; const tw = ww; ww = dd; dd = tw; }
    return this.colBox(x + rx, y + ly + h / 2, z + rz, ww, h, dd, o);
  }
  hashKeys(c) {
    const s = this.hashCell, keys = []; const x0 = Math.floor(c.mn[0] / s), x1 = Math.floor(c.mx[0] / s), z0 = Math.floor(c.mn[2] / s), z1 = Math.floor(c.mx[2] / s);
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) keys.push(i * 100003 + j);
    return keys;
  }
  hashIns(c) { c._k = this.hashKeys(c); for (const k of c._k) { let a = this.hash.get(k); if (!a) { a = []; this.hash.set(k, a); } a.push(c); } }
  hashRem(c) { if (!c._k) return; for (const k of c._k) { const a = this.hash.get(k); if (a) { const i = a.indexOf(c); if (i >= 0) a.splice(i, 1); } } c._k = null; }
  moveCol(c, mn, mx) { this.hashRem(c); c.mn = mn; c.mx = mx; this.hashIns(c); }
  query(x0, z0, x1, z1, out) {
    out.length = 0; const s = this.hashCell; const st = ++this.stamp;
    for (let i = Math.floor(x0 / s); i <= Math.floor(x1 / s); i++) for (let j = Math.floor(z0 / s); j <= Math.floor(z1 / s); j++) {
      const a = this.hash.get(i * 100003 + j); if (!a) continue;
      for (const c of a) { if (c.s === st || !c.on) continue; c.s = st; out.push(c); }
    }
    return out;
  }
  // highest walkable surface at (x,z) not above y+step
  ground(x, z, y, step = .5, r = .2) {
    let g = this.th(x, z); const q = this.query(x - r, z - r, x + r, z + r, this._q || (this._q = []));
    for (const c of q) {
      if (x < c.mn[0] - r || x > c.mx[0] + r || z < c.mn[2] - r || z > c.mx[2] + r) continue;
      if (c.mx[1] <= y + step && c.mx[1] > g) g = c.mx[1];
    }
    return g;
  }
  // resolve cylinder against colliders, returns corrected [x,z] and hit flag
  collide(p, r, h, stepH = .45) {
    const q = this.query(p[0] - r - .1, p[2] - r - .1, p[0] + r + .1, p[2] + r + .1, this._q2 || (this._q2 = [])); let hit = false;
    for (let it = 0; it < 2; it++) for (const c of q) {
      if (c.mx[1] <= p[1] + stepH || c.mn[1] >= p[1] + h) continue; // can step onto / pass under
      const cx = clamp(p[0], c.mn[0], c.mx[0]), cz = clamp(p[2], c.mn[2], c.mx[2]);
      let dx = p[0] - cx, dz = p[2] - cz; const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 < 1e-8) { // inside: push out along smallest axis
        const ox = Math.min(p[0] - c.mn[0], c.mx[0] - p[0]), oz = Math.min(p[2] - c.mn[2], c.mx[2] - p[2]);
        if (ox < oz) p[0] = (p[0] - c.mn[0] < c.mx[0] - p[0]) ? c.mn[0] - r : c.mx[0] + r; else p[2] = (p[2] - c.mn[2] < c.mx[2] - p[2]) ? c.mn[2] - r : c.mx[2] + r;
      } else { const d = Math.sqrt(d2); p[0] = cx + dx / d * r; p[2] = cz + dz / d * r; }
      hit = true;
    }
    const lim = this.half - 2; p[0] = clamp(p[0], -lim, lim); p[2] = clamp(p[2], -lim, lim);
    return hit;
  }
  ceiling(x, z, y, r = .25) { let c = 1e9; const q = this.query(x - r, z - r, x + r, z + r, this._q3 || (this._q3 = [])); for (const k of q) { if (x < k.mn[0] - r || x > k.mx[0] + r || z < k.mn[2] - r || z > k.mx[2] + r) continue; if (k.mn[1] >= y && k.mn[1] < c) c = k.mn[1]; } return c; }
  /* ray vs world. opts: sight (ignore sight-transparent), bullet. returns {t,p,n,c} */
  ray(o, d, maxT, opts = {}) {
    let best = maxT, bc = null, bn = null; const s = this.hashCell; const st = ++this.stamp;
    const ex = o[0] + d[0] * maxT, ez = o[2] + d[2] * maxT;
    // DDA over hash cells
    let ix = Math.floor(o[0] / s), iz = Math.floor(o[2] / s); const tx = Math.floor(ex / s), tz = Math.floor(ez / s);
    const sx = d[0] > 0 ? 1 : -1, sz = d[2] > 0 ? 1 : -1;
    const tdx = Math.abs(s / (d[0] || 1e-9)), tdz = Math.abs(s / (d[2] || 1e-9));
    let tmx = d[0] !== 0 ? ((sx > 0 ? (ix + 1) * s - o[0] : o[0] - ix * s) / Math.abs(d[0])) : 1e9;
    let tmz = d[2] !== 0 ? ((sz > 0 ? (iz + 1) * s - o[2] : o[2] - iz * s) / Math.abs(d[2])) : 1e9;
    let tCell = 0; let guard = 0;
    while (guard++ < 400) {
      const a = this.hash.get(ix * 100003 + iz);
      if (a) for (const c of a) {
        if (c.s === st || !c.on) continue; c.s = st;
        if (opts.sight && !c.sight) continue; if (opts.bullet && !c.bullet) continue; if (opts.ignore && c === opts.ignore) continue;
        // slab test
        let t0 = 0, t1 = best, nAx = -1, nS = 0, ok = true;
        for (let k = 0; k < 3; k++) {
          if (Math.abs(d[k]) < 1e-9) { if (o[k] < c.mn[k] || o[k] > c.mx[k]) { ok = false; break; } continue; }
          let ta = (c.mn[k] - o[k]) / d[k], tb = (c.mx[k] - o[k]) / d[k]; let sgn = -1; if (ta > tb) { const tt = ta; ta = tb; tb = tt; sgn = 1; }
          if (ta > t0) { t0 = ta; nAx = k; nS = sgn * (d[k] > 0 ? 1 : -1) * (d[k] > 0 ? 1 : -1); nS = d[k] > 0 ? -1 : 1; }
          if (tb < t1) t1 = tb; if (t0 > t1) { ok = false; break; }
        }
        if (ok && t0 < best && t0 >= 0) { best = t0; bc = c; bn = [0, 0, 0]; if (nAx >= 0) bn[nAx] = nS; else bn = [-d[0], -d[1], -d[2]]; }
      }
      if (best < tCell || (ix === tx && iz === tz)) break;
      if (tmx < tmz) { tCell = tmx; tmx += tdx; ix += sx; } else { tCell = tmz; tmz += tdz; iz += sz; }
      if (tCell > best) break;
    }
    // terrain march
    if (!opts.noTerrain) {
      const step = .6; let prevT = 0, prevD = o[1] - this.th(o[0], o[2]);
      if (prevD > 0) for (let t = step; t < best; t += step) {
        const x = o[0] + d[0] * t, y = o[1] + d[1] * t, z = o[2] + d[2] * t; const dd = y - this.th(x, z);
        if (dd < 0) { const tt = prevT + (t - prevT) * (prevD / (prevD - dd)); if (tt < best) { best = tt; bc = null; const px = o[0] + d[0] * tt, pz = o[2] + d[2] * tt; const e = .5; bn = V.norm([this.th(px - e, pz) - this.th(px + e, pz), 2 * e, this.th(px, pz - e) - this.th(px, pz + e)]); } break; }
        prevT = t; prevD = dd;
      }
    }
    if (best >= maxT) return null;
    const p = [o[0] + d[0] * best, o[1] + d[1] * best, o[2] + d[2] * best];
    return { t: best, p, n: bn || [0, 1, 0], c: bc, surf: bc ? bc.surf : this.surfAt(p[0], p[2], p[1]) };
  }
  los(a, b, sight = true) { const d = V.sub(b, a); const L = V.len(d); if (L < .01) return true; const h = this.ray(a, V.sc(d, 1 / L), L - .05, { sight }); return !h; }
  // concealment by foliage along a segment (0..1)
  foliage(a, b) {
    let k = 0; const d = V.sub(b, a); const L = V.len(d);
    for (const v of this.vegNear(a, b)) {
      // distance from v.p to segment
      const t = clamp(V.dot(V.sub(v.p, a), d) / (L * L), 0, 1); const q = V.add(a, V.sc(d, t)); const dd = V.dist(q, v.p);
      if (dd < v.r) k += v.k * (1 - dd / v.r) * (t > .03 ? 1 : 0);
    }
    return clamp(k, 0, 1);
  }
  vegNear(a, b) { const x0 = Math.min(a[0], b[0]) - 4, x1 = Math.max(a[0], b[0]) + 4, z0 = Math.min(a[2], b[2]) - 4, z1 = Math.max(a[2], b[2]) + 4; return this.veg.filter(v => v.p[0] > x0 && v.p[0] < x1 && v.p[2] > z0 && v.p[2] < z1); }
  surfAt(x, z, y) {
    if (this.waterY > -50 && y !== undefined && y < this.waterY + .05 && this.th(x, z) < this.waterY) return 'water';
    if (this.surfFn) return this.surfFn(x, z);
    return 'mud';
  }
  inside(x, z, y) { for (const r of this.interiors) if (x > r[0] && x < r[2] && z > r[1] && z < r[3] && (y === undefined || (y > r[4] - 1 && y < r[5]))) return true; return false; }
  /* ---------------- navigation ---------------- */
  buildNav(cell = 1) {
    this.navCell = cell; const n = this.navN = Math.floor(this.size / cell); const g = this.nav = new Uint8Array(n * n);
    const inf = .38;
    for (const c of this.cols) {
      if (c.walk || !c.nav) continue;
      const i0 = Math.floor((c.mn[0] - inf + this.half) / cell), i1 = Math.floor((c.mx[0] + inf + this.half) / cell), j0 = Math.floor((c.mn[2] - inf + this.half) / cell), j1 = Math.floor((c.mx[2] + inf + this.half) / cell);
      for (let j = Math.max(0, j0); j <= Math.min(n - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(n - 1, i1); i++) {
        const x = (i + .5) * cell - this.half, z = (j + .5) * cell - this.half; const gy = this.groundNav(x, z);
        if (c.mx[1] > gy + .5 && c.mn[1] < gy + 1.7) g[j * n + i] = 1;
      }
    }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = (i + .5) * cell - this.half, z = (j + .5) * cell - this.half; if (this.waterY > -50 && this.th(x, z) < this.waterY - 1.1) g[j * n + i] = 1; if (this.navBlockFn && this.navBlockFn(x, z)) g[j * n + i] = 1; }
    for (const d of this.doors) { const i = Math.floor((d.center[0] + this.half) / cell), j = Math.floor((d.center[2] + this.half) / cell); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const ii = i + a, jj = j + b; if (ii >= 0 && jj >= 0 && ii < n && jj < n && g[jj * n + ii] === 2) g[jj * n + ii] = 0; } }
    this.heap = new Int32Array(n * n); this.gs = new Float32Array(n * n); this.from = new Int32Array(n * n); this.vis = new Uint32Array(n * n); this.visId = 1;
  }
  groundNav(x, z) { let g = this.th(x, z); const q = this.query(x - .3, z - .3, x + .3, z + .3, this._q4 || (this._q4 = [])); for (const c of q) { if (!c.walk) continue; if (x < c.mn[0] || x > c.mx[0] || z < c.mn[2] || z > c.mx[2]) continue; if (c.mx[1] > g && c.mx[1] < g + 2.5) g = c.mx[1]; } return g; }
  navIdx(x, z) { const n = this.navN, c = this.navCell; const i = clamp(Math.floor((x + this.half) / c), 0, n - 1), j = clamp(Math.floor((z + this.half) / c), 0, n - 1); return j * n + i; }
  navFree(x, z) { return this.nav[this.navIdx(x, z)] === 0; }
  nearestFree(x, z, maxR = 6) {
    if (this.navFree(x, z)) return [x, z]; const c = this.navCell;
    for (let r = 1; r <= maxR; r++) for (let a = 0; a < 8 * r; a++) { const ang = a / (8 * r) * TAU; const px = x + Math.cos(ang) * r * c, pz = z + Math.sin(ang) * r * c; if (this.navFree(px, pz)) return [px, pz]; }
    return [x, z];
  }
  findPath(sx, sz, tx, tz, maxIter = 6000) {
    const n = this.navN, c = this.navCell, g = this.nav; const [fx, fz] = this.nearestFree(sx, sz, 3), [ex, ez] = this.nearestFree(tx, tz, 8);
    const s = this.navIdx(fx, fz), t = this.navIdx(ex, ez); if (s === t) return [[tx, tz]];
    const vid = ++this.visId; const H = this.heap, G = this.gs, F = this.from, VI = this.vis; const FS = this.fsc || (this.fsc = new Float32Array(n * n)); const fsc = { set: (k, v) => { FS[k] = v; }, get: k => FS[k] }; let hn = 0;
    const tix = t % n, tjz = (t / n) | 0;
    const hfun = k => { const dx = Math.abs(k % n - tix), dz = Math.abs(((k / n) | 0) - tjz); return (dx + dz) + (1.414 - 2) * Math.min(dx, dz); };
    const push = (k, f) => { fsc.set(k, f); let i = hn++; H[i] = k; while (i > 0) { const p = (i - 1) >> 1; if (fsc.get(H[p]) <= f) break; H[i] = H[p]; i = p; } H[i] = k; };
    const pop = () => { const top = H[0]; const last = H[--hn]; const lf = fsc.get(last); let i = 0; while (true) { let l = i * 2 + 1; if (l >= hn) break; const r = l + 1; if (r < hn && fsc.get(H[r]) < fsc.get(H[l])) l = r; if (fsc.get(H[l]) >= lf) break; H[i] = H[l]; i = l; } H[i] = last; return top; };
    G[s] = 0; VI[s] = vid; F[s] = -1; push(s, hfun(s)); let it = 0; let found = false; let bestK = s, bestH = 1e9;
    const DX = [1, -1, 0, 0, 1, 1, -1, -1], DZ = [0, 0, 1, -1, 1, -1, 1, -1], DC = [1, 1, 1, 1, 1.414, 1.414, 1.414, 1.414];
    while (hn > 0 && it++ < maxIter) {
      const k = pop(); if (k === t) { found = true; break; }
      const kx = k % n, kz = (k / n) | 0; const hh = hfun(k); if (hh < bestH) { bestH = hh; bestK = k; }
      for (let d = 0; d < 8; d++) {
        const nx = kx + DX[d], nz = kz + DZ[d]; if (nx < 0 || nz < 0 || nx >= n || nz >= n) continue; const nk = nz * n + nx; if (g[nk]) continue;
        if (d >= 4 && (g[kz * n + nx] || g[nz * n + kx])) continue;
        const ng = G[k] + DC[d] * (this.navCost ? this.navCost(nk) : 1);
        if (VI[nk] === vid && G[nk] <= ng) continue; VI[nk] = vid; G[nk] = ng; F[nk] = k; push(nk, ng + hfun(nk));
      }
    }
    let k = found ? t : bestK; const pts = [];
    while (k !== -1 && k !== undefined) { pts.push([(k % n + .5) * c - this.half, (((k / n) | 0) + .5) * c - this.half]); if (k === s) break; k = F[k]; }
    pts.reverse(); if (found) pts[pts.length - 1] = [tx, tz];
    // string pulling
    const out = [pts[0]]; let i = 0;
    while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !this.navLine(pts[i], pts[j])) j--; out.push(pts[j]); i = j; }
    return out;
  }
  navLine(a, b) { const d = Math.hypot(b[0] - a[0], b[1] - a[1]); const st = Math.ceil(d / (this.navCell * .5)); for (let i = 1; i < st; i++) { const t = i / st; if (!this.navFree(lerp(a[0], b[0], t), lerp(a[1], b[1], t))) return false; } return true; }
  /* ---------------- geometry helpers ---------------- */
  box(x, y, z, w, h, d, col, mat, o = {}) { // centered box + optional collider
    const B = o.detail ? this.D : this.B; B.col(col, mat); B.jit = o.jit ?? .04; B.box(x, y, z, w, h, d, o.skip || 0); B.jit = 0;
    if (o.c !== false && !o.detail) return this.colBox(x, y, z, w, h, d, o); return null;
  }
  boxB(x, y, z, w, h, d, col, mat, o) { return this.box(x, y + h / 2, z, w, h, d, col, mat, o); }
  mline(x0, z0, x1, z1) { this.mapLines.push([x0, z0, x1, z1]); }
  /* wall segment, axis aligned. openings: [{at, w, y0, h, kind:'door'|'window'|'gap', door:{...}}] */
  wall(x0, z0, x1, z1, y0, h, t, col, mat, openings = [], o = {}) {
    const alongX = Math.abs(z1 - z0) < 1e-3; const L = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0); const sx = alongX ? Math.sign(x1 - x0) : 0, sz = alongX ? 0 : Math.sign(z1 - z0);
    const P = (s) => [x0 + sx * s, z0 + sz * s];
    const piece = (s0, s1, py0, py1) => {
      if (s1 - s0 < .01 || py1 - py0 < .01) return; const a = P(s0), b = P(s1); const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
      const w = alongX ? s1 - s0 : t, d = alongX ? t : s1 - s0;
      this.box(cx, (py0 + py1) / 2, cz, w, py1 - py0, d, col, mat, { surf: o.surf || 'concrete', jit: .02 });
      if (o.skin !== undefined) { const e = t / 2 + .015; this.D.col(o.skin, MAT.PAINT); this.D.box(cx + (alongX ? 0 : o.skinDir * e), (py0 + py1) / 2, cz + (alongX ? o.skinDir * e : 0), alongX ? s1 - s0 : .01, py1 - py0 - .01, alongX ? .01 : s1 - s0); }
    };
    const ops = openings.slice().sort((a, b) => a.at - b.at); let cur = 0;
    for (const op of ops) {
      const s0 = op.at - op.w / 2, s1 = op.at + op.w / 2; piece(cur, s0, y0, y0 + h);
      const oy0 = y0 + (op.y0 || 0), oy1 = oy0 + op.h;
      if (op.y0) piece(s0, s1, y0, oy0); piece(s0, s1, oy1, y0 + h);
      const a = P(s0), b = P(s1); const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
      const fc = o.frame || 0x2a2622;
      if (op.kind !== 'window') { const dz = 1.25; this.doorZones.push(alongX ? [Math.min(a[0], b[0]) - .1, cz - dz, Math.max(a[0], b[0]) + .1, cz + dz, oy0] : [cx - dz, Math.min(a[1], b[1]) - .1, cx + dz, Math.max(a[1], b[1]) + .1, oy0]); }
      if (op.kind === 'window') {
        // frame + mullions + glass (destructible)
        const fw = alongX ? op.w : t + .02, fd = alongX ? t + .02 : op.w;
        this.B.col(fc, MAT.WOOD); this.B.box(cx, oy0 + .03, cz, alongX ? op.w + .1 : t + .08, .06, alongX ? t + .08 : op.w + .1);
        this.B.box(cx, oy1 - .03, cz, alongX ? op.w : t + .04, .06, alongX ? t + .04 : op.w);
        this.B.box(cx, (oy0 + oy1) / 2, cz, alongX ? .04 : t + .03, op.h, alongX ? t + .03 : .04);
        this.B.col(o.trim ?? 0x8a8478, MAT.CONC); this.B.box(cx, oy0 - .025, cz, alongX ? op.w + .2 : t + .14, .05, alongX ? t + .14 : op.w + .2); this.B.box(cx, oy1 + .06, cz, alongX ? op.w + .24 : t + .06, .12, alongX ? t + .06 : op.w + .24);
        if (!o.noGlass) this.addGlass(cx, (oy0 + oy1) / 2, cz, alongX ? op.w - .02 : .02, op.h - .1, alongX ? .02 : op.w - .02);
        else this.colBox(cx, (oy0 + oy1) / 2, cz, fw, op.h, fd, { sight: false, bullet: false, surf: 'wood' });
        this.mline(a[0], a[1], b[0], b[1]);
      } else if (op.kind === 'door') {
        this.B.col(fc, MAT.WOOD); const ft = t + .04;
        if (alongX) { this.B.box(s0 * sx + x0 - .03 * sx, oy0 + op.h / 2, cz, .06, op.h, ft); this.B.box(s1 * sx + x0 + .03 * sx, oy0 + op.h / 2, cz, .06, op.h, ft); this.B.box(cx, oy1 + .03, cz, op.w + .12, .06, ft); }
        else { this.B.box(cx, oy0 + op.h / 2, s0 * sz + z0 - .03 * sz, ft, op.h, .06); this.B.box(cx, oy0 + op.h / 2, s1 * sz + z0 + .03 * sz, ft, op.h, .06); this.B.box(cx, oy1 + .03, cz, ft, .06, op.w + .12); }
        if (op.door !== false) this.addDoor(a, b, oy0, op.h, alongX, op.door || {}, t);
      }
      cur = s1;
    }
    piece(cur, L, y0, y0 + h);
    if (!o.noMap) { const segs = []; let c0 = 0; for (const op of ops) { if (op.kind === 'window') continue; segs.push([c0, op.at - op.w / 2]); c0 = op.at + op.w / 2; } segs.push([c0, L]); for (const [s0, s1] of segs) { if (s1 - s0 < .05) continue; const a = P(s0), b = P(s1); this.mline(a[0], a[1], b[0], b[1]); } }
  }
  addGlass(x, y, z, w, h, d) {
    const B = new MB(64); B.col(0x8aa4b0, MAT.GLASS).box(0, 0, 0, w, h, d);
    const g = { kind: 'glass', mesh: B.mesh(), m: M4.trs(M4.create(), M4.create(), x, y, z, 0, 0, 0), pos: [x, y, z], r: Math.max(w, h, d), hp: 1, alive: true, size: [w, h, d] };
    g.col = this.colBox(x, y, z, Math.max(w, .05), h, Math.max(d, .05), { sight: false, bullet: true, glass: true, surf: 'glass', ref: g });
    this.destr.push(g); this.dyn.push(g); this.windows.push(g); return g;
  }
  addDoor(a, b, y0, h, alongX, o, t) {
    const w = Math.hypot(b[0] - a[0], b[1] - a[1]); const hinge = [a[0], y0, a[1]];
    const B = new MB(800); const dc = o.col ?? 0x5a3e26; const metal = o.metal;
    B.col(dc, metal ? MAT.METAL : MAT.WOOD).box(w / 2, h / 2 - .01, 0, w - .04, h - .03, .05);
    if (!metal) { B.col(lin(dc).map(v => v * .8)).box(w / 2, h * .72, -.028, w * .7, h * .32, .01).box(w / 2, h * .28, -.028, w * .7, h * .38, .01).box(w / 2, h * .72, .028, w * .7, h * .32, .01).box(w / 2, h * .28, .028, w * .7, h * .38, .01); }
    else { B.col(0x3a3a3a, MAT.METAL).box(w / 2, h * .8, -.03, w * .6, .2, .01).box(w / 2, h * .8, .03, w * .6, .2, .01); }
    B.col(0xb0a070, MAT.METAL).box(w - .1, 1.0, -.05, .1, .025, .03).box(w - .1, 1.0, .05, .1, .025, .03).box(w - .07, 1.0, 0, .025, .025, .12);
    B.col(0x333333, MAT.METAL).box(.02, h * .2, 0, .02, .12, .06).box(.02, h * .8, 0, .02, .12, .06);
    // hinge direction: yaw0 orients local +x from a to b
    const yaw0 = alongX ? (b[0] > a[0] ? 0 : Math.PI) : (b[1] > a[1] ? -Math.PI / 2 : Math.PI / 2);
    const door = { kind: 'door', mesh: B.mesh(), m: M4.create(), hinge, w, h, yaw0, ang: 0, target: 0, openDir: o.dir || 1, locked: !!o.locked, key: o.key || null, pos: [(a[0] + b[0]) / 2, y0 + h / 2, (a[1] + b[1]) / 2], r: w, center: [(a[0] + b[0]) / 2, y0, (a[1] + b[1]) / 2], alongX, a, b, y0, t, label: o.label || 'DOOR', moving: false, autoClose: 0 };
    door.col = this.col(0, 0, 0, 1, 1, 1, { surf: metal ? 'metal' : 'wood', ref: door, nav: false });
    this.updateDoorCol(door); this.doorMat(door);
    this.doors.push(door); this.dyn.push(door);
    return door;
  }
  doorMat(d) { M4.trs(d.m, M4.create(), d.hinge[0], d.hinge[1], d.hinge[2], 0, d.yaw0 + d.ang * d.openDir, 0); }
  updateDoorCol(d) {
    const ya = d.yaw0 + d.ang * d.openDir; const ex = Math.cos(ya) * d.w, ez = -Math.sin(ya) * d.w; const hx = d.hinge[0], hz = d.hinge[2];
    const th = .06;
    const mn = [Math.min(hx, hx + ex) - th, d.y0, Math.min(hz, hz + ez) - th], mx = [Math.max(hx, hx + ex) + th, d.y0 + d.h, Math.max(hz, hz + ez) + th];
    this.moveCol(d.col, mn, mx);
  }
  stairs(x, z, dir, w, rise, run, col = 0x5a4a38, mat = MAT.WOOD, surf = 'wood', y0) {
    const n = Math.max(2, Math.ceil(rise / .2)); const sh = rise / n, sd = run / n; const base = y0 ?? this.th(x, z);
    const D = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[dir];
    for (let i = 0; i < n; i++) {
      const cx = x + D[0] * (i + .5) * sd, cz = z + D[1] * (i + .5) * sd, top = base + (i + 1) * sh;
      const ww = D[0] ? sd : w, dd = D[0] ? w : sd;
      this.B.col(col, mat); this.B.box(cx, (top + base - .1) / 2 + (i * sh) / 2 - (i * sh) / 2, cz, ww, top - base + .1, dd);
      this.col(cx - ww / 2, base - .1, cz - dd / 2, cx + ww / 2, top, cz + dd / 2, { walk: true, surf });
    }
    // railings
    const ex = x + D[0] * run, ez = z + D[1] * run;
    for (const s of [-1, 1]) { const ox = D[1] ? s * w / 2 : 0, oz = D[0] ? s * w / 2 : 0; this.D.col(0x3a3026, MAT.WOOD); this.D.beam([x + ox, base + 1, z + oz], [ex + ox, base + rise + 1, ez + oz], .05); this.D.beam([ex + ox, base + rise, ez + oz], [ex + ox, base + rise + 1, ez + oz], .06); }
  }
  slab(x0, z0, x1, z1, y, t, col, mat, surf = 'concrete', holes = []) {
    const rects = [[x0, z0, x1, z1]];
    for (const h of holes) { const nr = []; for (const r of rects) { if (h[0] >= r[2] || h[2] <= r[0] || h[1] >= r[3] || h[3] <= r[1]) { nr.push(r); continue; } if (h[1] > r[1]) nr.push([r[0], r[1], r[2], h[1]]); if (h[3] < r[3]) nr.push([r[0], h[3], r[2], r[3]]); const zz0 = Math.max(r[1], h[1]), zz1 = Math.min(r[3], h[3]); if (h[0] > r[0]) nr.push([r[0], zz0, h[0], zz1]); if (h[2] < r[2]) nr.push([h[2], zz0, r[2], zz1]); } rects.splice(0, rects.length, ...nr); }
    for (const r of rects) { this.B.col(col, mat); this.B.box((r[0] + r[2]) / 2, y - t / 2, (r[1] + r[3]) / 2, r[2] - r[0], t, r[3] - r[1]); this.col(r[0], y - t, r[1], r[2], y, r[3], { walk: true, surf }); }
  }
  /* ---------------- lights ---------------- */
  light(pos, col, i, range, o = {}) { const L = Object.assign({ pos, col: typeof col === 'number' ? lin(col) : col, i, range, on: true, glow: o.glow ?? .35 }, o); this.lights.push(L); return L; }
  /* ---------------- building generator ---------------- */
  building(o) {
    const { x, z, w, d } = o; const h = o.h || 3.1; const t = o.t || .2;
    const fy = o.y ?? (this.th(x, z) + (o.stilts || .15));
    const wc = o.wallCol ?? 0x9a9488, wm = o.wallMat ?? MAT.CONC, surf = o.surf || (wm === MAT.WOOD ? 'wood' : wm === MAT.CORR ? 'metal' : 'concrete');
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    // foundation / stilts
    if (o.noFound) { }
    else if (o.stilts) {
      this.B.col(0x4a3a2a, MAT.WOOD); for (let px = x0 + .2; px <= x1 - .1; px += Math.max(1.5, (w - .4) / Math.round((w - .4) / 2.2))) for (let pz = z0 + .2; pz <= z1 - .1; pz += Math.max(1.5, (d - .4) / Math.round((d - .4) / 2.2))) { const gy = this.th(px, pz) - .6; this.B.box(px, (gy + fy) / 2, pz, .2, fy - gy, .2); this.colBox(px, (gy + fy) / 2, pz, .2, fy - gy, .2, { surf: 'wood' }); }
    } else { this.B.col(0x6a665e, MAT.CONC); this.B.box(x, fy - .43, z, w + .3, .8, d + .3); }
    this.slab(x0, z0, x1, z1, fy, .2, o.floorCol ?? 0x6e5a44, o.floorMat ?? MAT.WOOD, o.floorSurf || (o.floorMat === MAT.CONC || o.floorMat === MAT.TILE ? 'concrete' : 'wood'), o.holes || []);
    const ops = { n: [], s: [], e: [], w: [] };
    for (const dr of o.doors || []) ops[dr.side].push({ at: (dr.side === 'n' || dr.side === 's' ? w : d) / 2 + (dr.at || 0), w: dr.w || 1, h: dr.h || 2.1, kind: dr.open ? 'gap' : 'door', door: dr.none ? false : dr });
    for (const wi of o.windows || []) ops[wi.side].push({ at: (wi.side === 'n' || wi.side === 's' ? w : d) / 2 + (wi.at || 0), w: wi.w || 1.2, h: wi.h || 1.1, y0: wi.y0 || 1, kind: 'window' });
    const wo = { surf, frame: o.frame, noGlass: o.noGlass, trim: o.trim }; const sk = o.inCol !== undefined && !o.noSkin ? o.inCol : undefined;
    this.wall(x0, z0, x1, z0, fy, h, t, wc, wm, ops.n, Object.assign({ skin: sk, skinDir: 1 }, wo)); this.wall(x0, z1, x1, z1, fy, h, t, wc, wm, ops.s, Object.assign({ skin: sk, skinDir: -1 }, wo));
    this.wall(x0, z0 + t / 2, x0, z1 - t / 2, fy, h, t, wc, wm, ops.w, Object.assign({ skin: sk, skinDir: 1 }, wo)); this.wall(x1, z0 + t / 2, x1, z1 - t / 2, fy, h, t, wc, wm, ops.e, Object.assign({ skin: sk, skinDir: -1 }, wo));
    // interior partitions [{x0,z0,x1,z1, door:{at}|null}] local coords
    for (const p of o.parts || []) {
      const L = Math.hypot(p[2] - p[0], p[3] - p[1]); const op = p[4] !== undefined && p[4] !== null ? [{ at: L / 2 + p[4], w: p[5] || .95, h: 2.1, kind: p[6] ? 'gap' : 'door', door: p[7] || {} }] : [];
      this.wall(x + p[0], z + p[1], x + p[2], z + p[3], fy, h, .12, o.inCol ?? 0xb8b0a0, MAT.PAINT, op, { surf });
    }
    // interior wall finish (paint) on inside faces – thin inner skin for color variety

    // trims: baseboards, cornice, exterior door steps and wall lamps
    this.D.col(o.baseCol ?? 0x3a3028, MAT.WOOD); const bi = t / 2 + .012;
    this.D.box(x, fy + .05, z0 + bi, w - t * 2, .1, .02).box(x, fy + .05, z1 - bi, w - t * 2, .1, .02).box(x0 + bi, fy + .05, z, .02, .1, d - t * 2).box(x1 - bi, fy + .05, z, .02, .1, d - t * 2);
    if (!o.stilts && !o.noFound) { this.B.col(o.trim ?? lin(wc).map(v => v * .8), wm === MAT.CORR ? MAT.METAL : MAT.CONC); this.B.box(x, fy + h - .06, z0 - .07, w + .14, .12, .06).box(x, fy + h - .06, z1 + .07, w + .14, .12, .06).box(x0 - .07, fy + h - .06, z, .06, .12, d + .14).box(x1 + .07, fy + h - .06, z, .06, .12, d + .14); this.B.box(x, fy + .02, z0 - .06, w + .1, .3, .08).box(x, fy + .02, z1 + .06, w + .1, .3, .08).box(x0 - .06, fy + .02, z, .08, .3, d + .1).box(x1 + .06, fy + .02, z, .08, .3, d + .1); }
    for (const dr of o.doors || []) { if (dr.w > 3) continue; const sd = dr.side; const along = (sd === 'n' || sd === 's'); const off = dr.at || 0; const ex = along ? x + off : (sd === 'e' ? x1 + .5 : x0 - .5), ez = along ? (sd === 's' ? z1 + .5 : z0 - .5) : z + off;
      if (!o.stilts) { this.B.col(0x7a766c, MAT.CONC).box(ex, fy - .08, ez, along ? (dr.w || 1) + .6 : .9, .16, along ? .9 : (dr.w || 1) + .6); this.col(ex - (along ? .8 : .45), fy - .16, ez - (along ? .45 : .8), ex + (along ? .8 : .45), fy - .02, ez + (along ? .45 : .8), { walk: true, surf: 'concrete' }); }
      if (o.lamps !== false) { const lx = along ? ex + (dr.w || 1) / 2 + .35 : (sd === 'e' ? x1 + .1 : x0 - .1), lz = along ? (sd === 's' ? z1 + .1 : z0 - .1) : ez + (dr.w || 1) / 2 + .35; this.D.col(0x1a1a1a, MAT.METAL).box(lx, fy + 2.3, lz, .14, .22, .14); this.D.col(0xffe0a0, MAT.EMIT).box(lx, fy + 2.26, lz, .1, .14, .15); this.light([lx, fy + 2.2, lz], 0xffc880, 1.2, 6, { group: o.power || 'power', glow: .25 }); } }
    // ceiling + roof
    const rc = o.roofCol ?? 0x4a4440, rt = o.roof || 'flat';
    if (!o.noCeil) { this.B.col(o.ceilCol ?? 0xa8a096, MAT.PAINT).box(x, fy + h + .04, z, w, .08, d); this.col(x0, fy + h, z0, x1, fy + h + .3, z1, { walk: true, surf: 'metal' }); }
    if (rt === 'arch') {
      const n = 14, rh = o.rh || 4; this.B.col(rc, MAT.CORR);
      const A = i => { const a = Math.PI - i / n * Math.PI; return [x + Math.cos(a) * (w / 2 + .1), fy + h + Math.sin(a) * rh]; };
      for (let i = 0; i < n; i++) { const p = A(i), q = A(i + 1); this.B.begin(); this.B.quad([p[0], p[1], z0 - .2], [q[0], q[1], z0 - .2], [q[0], q[1], z1 + .2], [p[0], p[1], z1 + .2]); }
      this.B.col(wc, wm); for (const zz of [z0, z1]) for (let i = 0; i < n; i++) { const p = A(i), q = A(i + 1); this.B.begin(); this.B.tri([x, fy + h, zz], [p[0], p[1], zz], [q[0], q[1], zz]); }
      this.B.col(0x3a3c3a, MAT.METAL); for (let zz = z0 + 3; zz < z1; zz += 5) for (let i = 0; i < n; i++) { const p = A(i), q = A(i + 1); this.B.beam([p[0], p[1] - .15, zz], [q[0], q[1] - .15, zz], .25, .12); }
    }
    if (rt === 'flat') { this.B.col(rc, MAT.CONC).box(x, fy + h + .18, z, w + .2, .22, d + .2); this.B.col(wc, wm).box(x, fy + h + .4, z0 - .05, w + .2, .3, .12).box(x, fy + h + .4, z1 + .05, w + .2, .3, .12).box(x0 - .05, fy + h + .4, z, .12, .3, d + .2).box(x1 + .05, fy + h + .4, z, .12, .3, d + .2); }
    else if (rt === 'gable') { this.B.col(rc, o.roofMat ?? MAT.CORR); if (w >= d) this.B.prism(x, fy + h + .08, z, w + .6, o.rh || 1.4, d + .8); else this.B.push().t(x, fy + h + .08, z).ry(Math.PI / 2).prism(0, 0, 0, d + .6, o.rh || 1.4, w + .8).pop(); }
    else if (rt === 'shed') { this.B.col(rc, o.roofMat ?? MAT.CORR).push().t(x, fy + h + .35, z).rx(.12).box(0, 0, 0, w + .6, .08, d + .8).pop(); }
    // interior rect for minimap / reverb / roof shade
    this.interiors.push([x0, z0, x1, z1, fy, fy + h]); this.mapRects.push([x0, z0, x1, z1]);
    // furnish rooms
    for (const r of o.rooms || []) this.furnish(x + r[0], z + r[1], x + r[2], z + r[3], fy, h, r[4], r[5]);
    // ceiling lights
    if (o.lights !== false) for (const r of (o.rooms && o.rooms.length ? o.rooms : [[-w / 2, -d / 2, w / 2, d / 2]])) { const cx = x + (r[0] + r[2]) / 2, cz = z + (r[1] + r[3]) / 2; this.D.col(0x222222, MAT.METAL).cyl(cx, fy + h - .12, cz, .2, .12, .1, 10); this.D.col(0xfff0c8, MAT.EMIT).cyl(cx, fy + h - .14, cz, .14, .14, .03, 10); this.light([cx, fy + h - .3, cz], o.lightCol ?? 0xffd8a0, o.lightI ?? 1.6, o.lightR ?? Math.max(6, Math.hypot(r[2] - r[0], r[3] - r[1]) * .9), { group: o.power || 'power', glow: .2 }); }
    // exterior details: AC unit, pipes, sign
    if (o.ac) { this.box(x1 + .35, fy + 1.6, z + d * .2, .5, .6, .9, 0xb8b8b0, MAT.METAL, { surf: 'metal' }); this.D.col(0x333333, MAT.METAL).cylX(x1 + .62, fy + 1.6, z + d * .2, .25, .02, 12); }
    if (o.stairsTo) { const sd = o.stairsTo; this.stairs(sd[0], sd[1], sd[2], 1.2, fy - this.th(sd[0], sd[1]), Math.max(1, (fy - this.th(sd[0], sd[1])) * 1.4)); }
    const b = { x, z, w, d, fy, h, x0, z0, x1, z1 }; return b;
  }
  /* ---------------- furniture ---------------- */
  anchor(group, a) { (this.anchors[group] || (this.anchors[group] = [])).push(a); }
  furnish(x0, z0, x1, z1, fy, h, kind, id) {
    const B = this.B, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const R = () => this.R(); const m = .45;
    const tag = id || kind;
    switch (kind) {
      case 'office': {
        const yaw = w > d ? 0 : 1; this.desk(cx, cz - d * .1, fy, 0, true, tag); this.cabinet(x0 + m, z0 + m + .2, fy, 1); this.cabinet(x0 + m, z0 + m + .8, fy, 1);
        this.shelf(x1 - .25, cz, fy, 3, 'books'); this.plant(x1 - .4, z0 + .4, fy); this.poster(cx, fy + 1.7, z0 + .12, 0, 'map'); this.chair(x0 + .8, z1 - .8, fy, 2, tag + '_guest'); this.rug(cx, cz, fy, w * .5, d * .4, 0x5a2020); this.lamp(cx + .6, cz - d * .1 - .2, fy + .78);
        break;
      }
      case 'commander': {
        this.desk(cx, cz - d * .15, fy, 0, true, tag, true); this.shelf(x0 + .25, cz, fy, 3, 'books'); this.shelf(x1 - .25, cz, fy, 3, 'bottles');
        this.sofa(cx, z1 - .6, fy, 2); this.rug(cx, cz, fy, w * .6, d * .5, 0x6a1a1a); this.plant(x0 + .45, z0 + .45, fy); this.plant(x1 - .45, z0 + .45, fy);
        this.poster(cx, fy + 1.8, z0 + .12, 0, 'flag'); this.safe(x1 - .5, z0 + .5, fy); this.lamp(cx - .7, cz - d * .15 - .2, fy + .78); this.tableLow(cx, z1 - 1.5, fy);
        break;
      }
      case 'bedroom': {
        const n = w > 4 || d > 4 ? 2 : 1; for (let i = 0; i < n; i++) this.bed(x0 + .6 + i * 1.6, z0 + 1.15, fy, 0, tag);
        this.nightstand(x0 + .6 + n * 1.6 - .2, z0 + .35, fy); this.wardrobe(x1 - .35, z1 - .7, fy, 3); this.rug(cx, cz + .5, fy, 1.6, 1.1, 0x3a4a5a); this.chair(x1 - .7, z0 + .7, fy, 3, tag);
        this.clutter(cx, z1 - .4, fy, 'clothes'); break;
      }
      case 'barracks': {
        const n = Math.max(1, Math.floor((w - .6) / 1.3)); for (let i = 0; i < n; i++) { this.bunk(x0 + .7 + i * 1.3, z0 + 1.1, fy); this.footlocker(x0 + .7 + i * 1.3, z0 + 2.3, fy); }
        for (let i = 0; i < Math.floor((w - .6) / .6); i++) this.locker(x0 + .5 + i * .6, z1 - .3, fy); this.table(cx, cz + .3, fy, 1.4, .8, tag, 2); break;
      }
      case 'kitchen': {
        this.counter(x0 + .1, z0 + .1, x1 - .1, fy, true); this.fridge(x1 - .45, z1 - .45, fy); this.table(cx, cz + .4, fy, 1.6, .9, tag, 4); this.clutter(cx, cz + .4, fy + .78, 'meal'); break;
      }
      case 'lounge': {
        this.sofa(cx, z1 - .55, fy, 2, tag); this.tv(cx, z0 + .3, fy); this.tableLow(cx, cz + .3, fy); this.armchair(x0 + .6, cz, fy, 1, tag); this.armchair(x1 - .6, cz, fy, 3, tag); this.rug(cx, cz + .2, fy, w * .55, d * .45, 0x4a3a2a); this.clutter(cx, cz + .3, fy + .45, 'beer'); this.plant(x1 - .4, z0 + .4, fy); break;
      }
      case 'storage': {
        const rows = Math.max(1, Math.floor((d - 1.4) / 1.8)); for (let r = 0; r < rows; r++) this.rack(cx, z0 + 1.1 + r * 1.8, fy, w - 1.6);
        this.crateStack(x0 + .7, z1 - .7, fy); this.barrel(x1 - .5, z1 - .5, fy, 0x2a4a7a); this.barrel(x1 - 1.1, z1 - .5, fy, 0x2a4a7a); this.sacks(x0 + .7, z0 + .7, fy); this.anchor(tag + '_work', { pos: [cx, fy, z1 - 1.2], yaw: 0, kind: 'work' }); break;
      }
      case 'workshop': case 'garage': {
        this.workbench(cx, z0 + .45, fy, 0, tag); this.toolwall(cx, fy, z0 + .11); this.tires(x1 - .6, z0 + .6, fy); this.oil(x1 - .6, z1 - .6, fy); this.toolchest(x0 + .5, z0 + .5, fy); this.decal(cx, fy, cz + .6, 1.6, 1.2, 0x15120e); break;
      }
      case 'server': {
        const n = Math.max(2, Math.floor((w - 1) / .8)); for (let i = 0; i < n; i++) { this.serverRack(x0 + .7 + i * .8, z0 + .5, fy); if (d > 3.4) this.serverRack(x0 + .7 + i * .8, z1 - .5, fy, 2); }
        this.desk(x1 - .7, cz, fy, 3, true, tag); this.D.col(0x333333, MAT.METAL).box(cx, fy + h - .15, cz, w - .4, .05, .3); break;
      }
      case 'security': {
        this.monitors(cx, z0 + .5, fy, tag); this.locker(x1 - .35, z1 - .35, fy); this.locker(x1 - .95, z1 - .35, fy); this.gunrack(x0 + .15, cz, fy, 1); this.chair(cx + .8, cz + .5, fy, 2, tag + '_x'); break;
      }
      case 'lab': {
        this.table(cx, cz, fy, Math.min(2.6, w - 1.2), 1.1, null, 0); this.clutter(cx, cz, fy + .78, 'drugs'); this.anchor(tag + '_work', { pos: [cx, fy, cz + .95], yaw: 0, kind: 'work' }); this.anchor(tag + '_work', { pos: [cx, fy, cz - .95], yaw: Math.PI, kind: 'work' });
        this.barrel(x0 + .5, z0 + .5, fy, 0x2a5a2a); this.barrel(x0 + .5, z0 + 1.1, fy, 0x2a5a2a); this.rack(cx, z1 - .45, fy, w - 1.4); this.crateStack(x1 - .7, z0 + .7, fy); break;
      }
      case 'armory': { this.gunrack(x0 + .15, cz, fy, 1); this.gunrack(x1 - .15, cz, fy, 3); this.crate(cx, cz, fy, .9, .5, .6, 0x3f4a2a); this.crate(cx, cz, fy + .5, .9, .4, .6, 0x3f4a2a); this.ammoPickup(cx, fy + .9, cz); break; }
      case 'bath': { this.toilet(x0 + .4, z0 + .4, fy); this.sink(x1 - .35, z0 + .3, fy); this.B.col(0xd8d8d0, MAT.TILE).box(x1 - .5, fy + .03, z1 - .5, .9, .06, .9); break; }
      case 'comms': { this.desk(cx, z0 + .45, fy, 0, true, tag); this.radioDesk(x1 - .5, cz, fy); this.poster(cx, fy + 1.7, z0 + .12, 0, 'map'); this.cabinet(x0 + .4, z1 - .4, fy, 0); break; }
      case 'lobby': { this.desk(cx, cz, fy, 0, false, tag); this.plant(x0 + .4, z0 + .4, fy); this.plant(x1 - .4, z0 + .4, fy); this.bench(x0 + .4, cz, fy, 1); this.poster(cx, fy + 1.7, z0 + .12, 0, 'logo'); break; }
      case 'empty': break;
    }
  }
  chairGeo(B) { B.col(0x3a2a1e, MAT.WOOD).box(0, .44, 0, .44, .05, .44); for (const [a, b] of [[-.19, -.19], [.19, -.19], [-.19, .19], [.19, .19]]) B.tbox(a, .21, b, .03, .42, .03, .042, .042); B.box(0, .15, -.19, .36, .025, .025).box(0, .15, .19, .36, .025, .025); B.tube([-.19, .45, .2], [-.19, 1, .2], .022).tube([.19, .45, .2], [.19, 1, .2], .022); for (let i = 0; i < 3; i++) B.box(0, .62 + i * .13, .2, .38, .05, .025); B.col(0x6a2a20, MAT.CLOTH).box(0, .48, 0, .4, .04, .4); }
  chair(x, z, fy, q, tag) { const B = this.B; B.push().t(x, fy, z).ry(q * Math.PI / 2); this.chairGeo(B); B.pop(); this.colRot(x, fy, z, q, 0, 0, .46, .5, .46, { surf: 'wood', sight: false }); const fwd = q * Math.PI / 2; if (tag) this.anchor(tag + '_seat', { pos: [x - Math.sin(fwd) * .05, fy, z - Math.cos(fwd) * .05], yaw: fwd, kind: 'sit' }); }
  table(x, z, fy, w, d, tag, chairs = 0) {
    const B = this.B; B.col(0x6a4a30, MAT.WOOD).box(x, fy + .76, z, w, .05, d); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(x + a * (w / 2 - .06), fy + .37, z + b * (d / 2 - .06), .06, .74, .06);
    this.colBox(x, fy + .4, z, w, .8, d, { surf: 'wood', sight: false });
    const spots = [[0, d / 2 + .38, 2], [0, -d / 2 - .38, 0], [w / 2 + .38, 0, 3], [-w / 2 - .38, 0, 1]];
    for (let i = 0; i < chairs; i++) { const s = spots[i % 4]; const off = chairs > 4 ? ((i / 4 | 0) - .5) * .6 : 0; this.chair(x + s[0] + (s[2] % 2 ? 0 : off), z + s[1] + (s[2] % 2 ? off : 0), fy, s[2], tag); }
  }
  desk(x, z, fy, q, pc, tag, fancy) {
    const B = this.B; B.push().t(x, fy, z).ry(q * Math.PI / 2);
    B.col(fancy ? 0x3a1e10 : 0x5a4a3a, MAT.WOOD).box(0, .75, 0, 1.5, .05, .75).box(-.6, .37, 0, .3, .74, .7).box(.6, .37, 0, .3, .74, .7).box(0, .45, .33, .9, .5, .03);
    B.col(0x222222, MAT.METAL).box(-.6, .55, -.36, .1, .02, .02).box(-.6, .3, -.36, .1, .02, .02);
    if (pc) { B.col(0x181818, MAT.PLASTIC).box(.1, 1.0, .18, .55, .36, .04).box(.1, .8, .2, .08, .06, .08).box(.1, .78, .15, .25, .02, .18); B.col(0x3a7ab0, MAT.EMIT).box(.1, 1.0, .155, .5, .3, .005); B.col(0x111111, MAT.PLASTIC).box(.05, .785, -.1, .45, .02, .15).box(.45, .785, -.1, .07, .02, .1); }
    B.col(0xeeeee0, MAT.PAINT).box(-.4, .785, -.05, .21, .01, .3).box(-.38, .795, -.02, .21, .01, .3);
    if (fancy) { B.col(0xc9a23a, MAT.METAL).box(-.55, .79, .1, .1, .03, .05); B.col(0x7a5a2a, MAT.PLASTIC).cyl(.55, .775, -.1, .04, .04, .12, 8); }
    B.pop(); this.colRot(x, fy, z, q, 0, 0, 1.5, .8, .75, { surf: 'wood', sight: false });
    // chair behind desk (faces desk)
    const qc = (q + 2) & 3; const off = [[0, .75], [.75, 0], [0, -.75], [-.75, 0]][q & 3];
    // rotate local offset (0, +.75) by q
    let lx = 0, lz = .75; for (let i = 0; i < (q & 3); i++) { const t = lx; lx = lz; lz = -t; }
    this.officeChair(x + lx, z + lz, fy, q, tag);
  }
  officeChair(x, z, fy, q, tag) { const B = this.B; B.push().t(x, fy, z).ry(q * Math.PI / 2); B.col(0x1a1a1a, MAT.LEATHER).box(0, .46, 0, .5, .08, .48).box(0, .82, .22, .48, .6, .07); B.col(0x333333, MAT.METAL).cyl(0, .1, 0, .03, .03, .35, 6); for (let i = 0; i < 5; i++) B.push().ry(i * TAU / 5).box(0, .06, -.15, .04, .03, .3).pop(); B.box(-.25, .62, 0, .04, .03, .3).box(.25, .62, 0, .04, .03, .3); B.pop(); this.colRot(x, fy, z, q, 0, 0, .5, .5, .5, { surf: 'wood', sight: false }); if (tag) this.anchor(tag + '_seat', { pos: [x, fy, z], yaw: q * Math.PI / 2, kind: 'sit', desk: true }); }
  shelf(x, z, fy, q, kind) {
    const B = this.B; B.push().t(x, fy, z).ry(q * Math.PI / 2); B.col(0x4a3828, MAT.WOOD).box(0, 1, 0, 1.2, 2, .04).box(-.58, 1, -.15, .04, 2, .32).box(.58, 1, -.15, .04, 2, .32);
    for (let i = 0; i < 5; i++) { B.col(0x4a3828, MAT.WOOD).box(0, .05 + i * .46, -.15, 1.16, .03, .32); if (i < 4) for (let k = 0; k < 7; k++) { if (this.R() < .25) continue; const c = kind === 'bottles' ? [0x2a5a2a, 0x6a4a1a, 0x8a8a8a][k % 3] : [0x5a1a1a, 0x1a2a4a, 0x2a3a1a, 0x6a5a3a, 0x222222][(k + i) % 5]; B.col(c, kind === 'bottles' ? MAT.GLASS : MAT.PAINT); if (kind === 'bottles') B.cyl(-.48 + k * .15, .07 + i * .46, -.15, .03, .03, .25, 6); else B.box(-.48 + k * .15, .2 + i * .46, -.15, .05 + this.R() * .05, .26 + this.R() * .06, .22); } }
    B.pop(); this.colRot(x, fy, z, q, -.15, 0, 1.2, 2, .34, { surf: 'wood' }, 0);
  }
  cabinet(x, z, fy, q) { const B = this.B; B.push().t(x, fy, z).ry(q * Math.PI / 2); B.col(0x7a7e78, MAT.METAL).box(0, .66, 0, .48, 1.32, .58); B.col(0x555855, MAT.METAL); for (let i = 0; i < 4; i++) { B.box(0, .18 + i * .32, -.295, .44, .28, .01); B.col(0xbbbbbb, MAT.METAL).box(0, .26 + i * .32, -.305, .12, .02, .02); B.col(0x555855, MAT.METAL); } B.pop(); this.colBox(x, fy + .66, z, .55, 1.32, .55, { surf: 'metal' }); }
  bed(x, z, fy, q, tag) { const B = this.B; B.push().t(x, fy, z).ry(q * Math.PI / 2); B.col(0x3a2a1e, MAT.WOOD).box(0, .22, 0, 1, .3, 2.05).box(0, .55, -1.02, 1, .9, .06); B.col(0xd8d4c8, MAT.CLOTH).box(0, .42, 0, .96, .14, 1.96); B.col([0x6a2a2a, 0x2a3a5a, 0x4a5a3a][(this.R() * 3) | 0], MAT.CLOTH).box(0, .5, .25, .98, .06, 1.3); B.col(0xeeeeee, MAT.CLOTH).box(0, .55, -.8, .7, .1, .3); B.pop(); this.colRot(x, fy, z, q, 0, 0, 1, .55, 2.05, { surf: 'wood', sight: false }); if (tag) this.anchor(tag + '_bed', { pos: [x, fy, z], yaw: q * Math.PI / 2 }); }
  bunk(x, z, fy) { const B = this.B; B.col(0x4a4e48, MAT.METAL); for (const [a, b] of [[-.45, -1], [.45, -1], [-.45, 1], [.45, 1]]) B.box(x + a, fy + .9, z + b, .05, 1.8, .05); for (const y of [.4, 1.4]) { B.col(0x4a4e48, MAT.METAL).box(x, fy + y, z, .95, .06, 2); B.col(0x55604a, MAT.CLOTH).box(x, fy + y + .09, z, .9, .12, 1.95); B.col(0xdddddd, MAT.CLOTH).box(x, fy + y + .17, z - .78, .6, .08, .3); } this.colBox(x, fy + .9, z, .95, 1.8, 2.05, { surf: 'metal', sight: false }); }
  footlocker(x, z, fy) { this.B.col(0x3a4230, MAT.METAL).box(x, fy + .2, z, .8, .4, .45); this.B.col(0x999999, MAT.METAL).box(x, fy + .32, z + .23, .1, .06, .02); this.colBox(x, fy + .2, z, .8, .4, .45, { surf: 'metal', sight: false }); }
  locker(x, z, fy) { const B = this.B; B.col(0x5a6058, MAT.METAL).box(x, fy + .95, z, .55, 1.9, .5); B.col(0x3a3e38, MAT.METAL); for (let i = 0; i < 5; i++) B.box(x, fy + 1.6 + i * .04, z - .255, .3, .015, .01); B.col(0xaaaaaa, MAT.METAL).box(x + .2, fy + 1, z - .26, .02, .1, .02); this.colBox(x, fy + .95, z, .55, 1.9, .5, { surf: 'metal' }); }
  counter(x0, z0, x1, fy, sink) { const B = this.B; const w = x1 - x0; B.col(0xd8d0c0, MAT.PAINT).box((x0 + x1) / 2, fy + .43, z0 + .3, w, .86, .6); B.col(0x3a3a3a, MAT.CONC).box((x0 + x1) / 2, fy + .89, z0 + .3, w + .02, .05, .62); B.col(0xaaaaaa, MAT.METAL); for (let x = x0 + .3; x < x1 - .2; x += .6) B.box(x, fy + .7, z0 + .61, .15, .02, .02); if (sink) { B.col(0x999999, MAT.METAL).box(x0 + w * .3, fy + .9, z0 + .3, .5, .04, .4).cyl(x0 + w * .3, fy + .9, z0 + .12, .015, .015, .25, 6); } B.col(0x222222, MAT.METAL).box(x0 + w * .7, fy + .92, z0 + .3, .55, .02, .5); for (const a of [-.12, .12]) for (const b of [-.1, .1]) B.col(0x111111, MAT.METAL).cyl(x0 + w * .7 + a, fy + .93, z0 + .3 + b, .07, .07, .01, 10); this.colBox((x0 + x1) / 2, fy + .45, z0 + .3, w, .92, .6, { surf: 'wood' }); this.clutter(x0 + w * .5, z0 + .3, fy + .92, 'kitchen'); }
  fridge(x, z, fy) { this.B.col(0xe0e0d8, MAT.PLASTIC).box(x, fy + .9, z, .7, 1.8, .7); this.B.col(0x888888, MAT.METAL).box(x - .3, fy + 1.2, z - .36, .03, .4, .03); this.colBox(x, fy + .9, z, .7, 1.8, .7, { surf: 'metal' }); }
  sofa(x, z, fy, q, tag) { const B = this.B; B.push().t(x, fy, z).ry(q * Math.PI / 2); const c = [0x5a2a22, 0x3a3a3a, 0x4a3a28][(this.R() * 3) | 0]; B.col(c, MAT.LEATHER).box(0, .25, 0, 2, .3, .85).box(0, .65, .35, 2, .55, .2).box(-.95, .45, 0, .2, .4, .85).box(.95, .45, 0, .2, .4, .85); B.col(lin(c).map(v => v * 1.15), MAT.LEATHER).box(-.45, .45, -.05, .85, .12, .7).box(.45, .45, -.05, .85, .12, .7); B.pop(); this.colRot(x, fy, z, q, 0, 0, 2, .6, .85, { surf: 'wood', sight: false }); if (tag) { const f = q * Math.PI / 2; for (const s of [-.5, .5]) { let lx = s, lz = 0; for (let i = 0; i < (q & 3); i++) { const t = lx; lx = lz; lz = -t; } this.anchor(tag + '_seat', { pos: [x + lx, fy - .03, z + lz], yaw: f, kind: 'sit' }); } } }
  armchair(x, z, fy, q, tag) { const B = this.B; B.push().t(x, fy, z).ry(q * Math.PI / 2); B.col(0x4a3a2a, MAT.LEATHER).box(0, .25, 0, .85, .3, .8).box(0, .65, .32, .85, .55, .16).box(-.38, .45, 0, .14, .35, .8).box(.38, .45, 0, .14, .35, .8); B.pop(); this.colRot(x, fy, z, q, 0, 0, .85, .6, .8, { surf: 'wood', sight: false }); if (tag) this.anchor(tag + '_seat', { pos: [x, fy - .03, z], yaw: q * Math.PI / 2, kind: 'sit' }); }
  tableLow(x, z, fy) { this.B.col(0x3a2a1a, MAT.WOOD).box(x, fy + .4, z, 1.1, .05, .6); this.B.box(x, fy + .2, z, .9, .04, .4); this.B.col(0x2a1a10, MAT.WOOD).box(x - .5, fy + .2, z - .25, .04, .4, .04).box(x + .5, fy + .2, z - .25, .04, .4, .04).box(x - .5, fy + .2, z + .25, .04, .4, .04).box(x + .5, fy + .2, z + .25, .04, .4, .04); this.colBox(x, fy + .22, z, 1.1, .44, .6, { surf: 'wood', sight: false }); }
  tv(x, z, fy) { const B = this.B; B.col(0x2a2a2a, MAT.WOOD).box(x, fy + .3, z, 1.4, .6, .4); B.col(0x0a0a0a, MAT.PLASTIC).box(x, fy + .95, z, 1.1, .65, .06); const tvc = [0x30509a, 0x4a7a5a, 0x8a5a3a][(this.R() * 3) | 0]; B.col(tvc, MAT.EMIT).box(x, fy + .95, z + .032, 1.02, .57, .005); this.colBox(x, fy + .6, z, 1.4, 1.2, .4, { surf: 'wood' }); this.light([x, fy + 1, z + .6], tvc, .6, 4, { group: 'power', flicker: 1, glow: 0 }); }
  wardrobe(x, z, fy, q) { const B = this.B; B.push().t(x, fy, z).ry(q * Math.PI / 2); B.col(0x4a3220, MAT.WOOD).box(0, 1, 0, 1.2, 2, .6); B.col(0x3a2416, MAT.WOOD).box(0, 1, -.305, .01, 1.9, .01); B.col(0xbbaa77, MAT.METAL).box(-.06, 1.1, -.31, .02, .15, .02).box(.06, 1.1, -.31, .02, .15, .02); B.pop(); this.colRot(x, fy, z, q, 0, 0, 1.2, 2, .6, { surf: 'wood' }); }
  nightstand(x, z, fy) { this.B.col(0x4a3220, MAT.WOOD).box(x, fy + .28, z, .45, .56, .4); this.lamp(x, z, fy + .56); this.colBox(x, fy + .28, z, .45, .56, .4, { surf: 'wood', sight: false }); }
  lamp(x, z, y) { this.D.col(0x222222, MAT.METAL).cyl(x, y, z, .07, .07, .03, 8).cyl(x, y + .03, z, .012, .012, .3, 5); this.D.col(0xf0e0b0, MAT.EMIT).cyl(x, y + .28, z, .12, .07, .16, 10, 0); }
  rug(x, z, fy, w, d, c) { this.D.col(c, MAT.CLOTH).box(x, fy + .012, z, w, .012, d); this.D.col(lin(c).map(v => v * .6), MAT.CLOTH).box(x, fy + .022, z, w * .85, .006, d * .8); }
  plant(x, z, fy) { const B = this.D; B.col(0x6a3a22, MAT.PAINT).cyl(x, fy, z, .16, .2, .35, 10); B.col(0x2a1a10, MAT.MUD).cyl(x, fy + .3, z, .18, .18, .04, 10); B.col(0x2e5a26, MAT.LEAF); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; B.beam([x, fy + .32, z], [x + Math.cos(a) * .35, fy + .8 + this.R() * .4, z + Math.sin(a) * .35], .06, .01); } this.colBox(x, fy + .3, z, .35, .6, .35, { surf: 'wood', sight: false }); }
  poster(x, y, z, q, kind) { const B = this.D; B.push().t(x, y, z).ry(q * Math.PI / 2); if (kind === 'map') { B.col(0xc8c0a0, MAT.PAINT).box(0, 0, 0, 1.2, .8, .01); B.col(0x6a8a5a, MAT.PAINT).box(-.2, .1, .006, .5, .3, .002); B.col(0x4a6a8a, MAT.PAINT).box(.3, -.15, .006, .4, .25, .002); B.col(0xc02020, MAT.PAINT).box(.1, .05, .008, .04, .04, .002).box(-.3, -.2, .008, .04, .04, .002); } else if (kind === 'flag') { B.col(0x1a1a1a, MAT.CLOTH).box(0, 0, 0, 1.4, .9, .01); B.col(0xc9a23a, MAT.PAINT).box(0, 0, .006, .3, .3, .002); B.col(0x8a1010, MAT.CLOTH).box(0, -.35, .006, 1.4, .15, .002); } else { B.col(0x2a2a2a, MAT.PAINT).box(0, 0, 0, 1, .5, .02); B.col(0xc02020, MAT.PAINT).box(0, 0, .011, .8, .08, .002); } B.pop(); }
  safe(x, z, fy) { const B = this.B; B.col(0x2a2c2e, MAT.METAL).box(x, fy + .45, z, .7, .9, .6); B.col(0x888888, MAT.METAL).cylZ(x, fy + .55, z + .31, .07, .03, 14); B.box(x + .2, fy + .45, z + .31, .03, .2, .03); this.colBox(x, fy + .45, z, .7, .9, .6, { surf: 'metal' }); }
  rack(x, z, fy, w) { const B = this.B; B.col(0x2a4a7a, MAT.METAL); for (const a of [-w / 2, w / 2]) for (const b of [-.35, .35]) B.box(x + a, fy + 1.2, z + b, .07, 2.4, .07); for (let i = 0; i < 4; i++) { B.col(0xc06a20, MAT.METAL).box(x, fy + .15 + i * .7, z, w, .05, .8); for (let k = 0; k < w / .55 - .5; k++) { if (this.R() < .3) continue; const c = [0x8a6a42, 0x6a5a3a, 0x9a8a6a, 0x2a2a2a][(this.R() * 4) | 0]; const bh = .2 + this.R() * .35; B.col(c, c === 0x2a2a2a ? MAT.PLASTIC : MAT.CANVAS).box(x - w / 2 + .35 + k * .55, fy + .18 + i * .7 + bh / 2, z + (this.R() - .5) * .2, .45, bh, .5); } } this.colBox(x, fy + 1.2, z, w + .1, 2.4, .8, { surf: 'metal' }); }
  crate(x, z, y, w = .9, h = .9, d = .9, c = 0x7a6040, breakable = false) {
    if (breakable) return this.addCrate(x, y, z, w, h, d, c);
    const B = this.B; B.col(c, MAT.WOOD); B.jit = .08; B.box(x, y + h / 2, z, w, h, d); B.jit = 0; B.col(lin(c).map(v => v * .7), MAT.WOOD);
    for (const s of [-1, 1]) { B.box(x, y + h / 2, z + s * d / 2, w + .02, .08, .02); B.box(x + s * w / 2, y + h / 2, z, .02, .08, d + .02); }
    B.box(x, y + h, z, w + .02, .02, .1); this.colBox(x, y + h / 2, z, w, h, d, { surf: 'wood' });
  }
  crateStack(x, z, fy) { this.crate(x, z, fy, .9, .9, .9); if (this.R() < .7) this.crate(x + (this.R() - .5) * .2, z, fy + .9, .8, .7, .8, 0x8a7050); }
  barrel(x, z, fy, c = 0x7a1a12, expl = false) {
    if (expl) return this.addBarrel(x, fy, z);
    const B = this.B; B.col(c, MAT.RUST).cyl(x, fy, z, .3, .3, .9, 12); B.col(lin(c).map(v => v * .7), MAT.RUST).cyl(x, fy + .3, z, .305, .305, .03, 12).cyl(x, fy + .6, z, .305, .305, .03, 12); this.colBox(x, fy + .45, z, .6, .9, .6, { surf: 'metal' });
  }
  sacks(x, z, fy) { const B = this.D; B.col(0x9a8a6a, MAT.CANVAS); for (let i = 0; i < 6; i++) B.blob(x + (i % 3) * .45 - .45, fy + .15 + (i / 3 | 0) * .25, z + (this.R() - .5) * .1, .25, .14, i + 3, .15); this.colBox(x, fy + .3, z, 1.4, .6, .5, { surf: 'wood', sight: false }); }
  workbench(x, z, fy, q, tag) {
    const B = this.B; B.push().t(x, fy, z).ry(q * Math.PI / 2); B.col(0x5a4a32, MAT.WOOD).box(0, .9, 0, 2, .08, .8); B.col(0x3a3a3a, MAT.METAL); for (const [a, b] of [[-.95, -.35], [.95, -.35], [-.95, .35], [.95, .35]]) B.box(a, .45, b, .06, .9, .06); B.box(0, .3, 0, 1.9, .04, .7);
    B.col(0x2a5a9a, MAT.METAL).box(-.7, .98, 0, .2, .1, .15); B.col(0x8a1a1a, MAT.METAL).box(.5, 1, -.1, .4, .14, .22); B.col(0x777777, MAT.METAL).box(.1, .95, .1, .3, .02, .04).box(-.2, .95, -.15, .04, .02, .25); B.col(0x222222, MAT.METAL).cyl(.8, .94, .25, .05, .05, .08, 8);
    B.pop(); this.colRot(x, fy, z, q, 0, 0, 2, 1, .8, { surf: 'wood', sight: false }); let lx = 0, lz = .85; for (let i = 0; i < (q & 3); i++) { const t = lx; lx = lz; lz = -t; } if (tag) this.anchor(tag + '_work', { pos: [x + lx, fy, z + lz], yaw: q * Math.PI / 2, kind: 'work' });
  }
  toolwall(x, fy, z) { const B = this.D; B.col(0x8a7a5a, MAT.WOOD).box(x, fy + 1.6, z, 1.8, .9, .03); B.col(0x444444, MAT.METAL); for (let i = 0; i < 9; i++) { B.box(x - .8 + i * .2, fy + 1.6 + (this.R() - .5) * .3, z + .03, .03, .25 + this.R() * .2, .02); } B.col(0xa01a1a, MAT.METAL).box(x + .6, fy + 1.4, z + .04, .1, .1, .03); }
  tires(x, z, fy) { const B = this.B; B.col(0x151515, MAT.RUBBER); for (let i = 0; i < 4; i++) B.torus(x, fy + .12 + i * .22, z, .28, .11, 14, 6); this.colBox(x, fy + .45, z, .8, .9, .8, { surf: 'wood' }); }
  oil(x, z, fy) { this.barrel(x, z, fy, 0x1a3a1a); this.D.col(0x7a1a10, MAT.PLASTIC).box(x - .55, fy + .2, z, .25, .4, .15); this.decal(x - .3, fy, z + .3, 1, .8, 0x0d0b08); }
  toolchest(x, z, fy) { const B = this.B; B.col(0x9a1a1a, MAT.METAL).box(x, fy + .5, z, .7, 1, .45); B.col(0x444444, MAT.METAL); for (let i = 0; i < 6; i++) B.box(x, fy + .15 + i * .15, z - .23, .6, .015, .01); this.colBox(x, fy + .5, z, .7, 1, .45, { surf: 'metal' }); }
  serverRack(x, z, fy, q = 0) {
    const B = this.B; B.col(0x18191b, MAT.METAL).box(x, fy + 1, z, .6, 2, .8); const f = q === 2 ? .41 : -.41;
    for (let i = 0; i < 14; i++) { B.col(0x26282b, MAT.METAL).box(x, fy + .2 + i * .125, z + f, .55, .1, .01); for (let k = 0; k < 4; k++) if (this.R() < .7) { this.D.col([0x20ff40, 0x40a0ff, 0xffa020, 0xff2020][(this.R() * 4) | 0], MAT.EMIT).box(x - .22 + k * .04, fy + .2 + i * .125, z + f * 1.02, .01, .01, .005); } }
    this.colBox(x, fy + 1, z, .6, 2, .8, { surf: 'metal' });
    this.sounds.push({ kind: 'hum', pos: [x, fy + 1, z], f: 120, vol: .05 });
  }
  monitors(x, z, fy, tag) { const B = this.B; B.col(0x3a3a3a, MAT.METAL).box(x, fy + .75, z, 2, .05, .8).box(x, fy + .37, z + .3, 2, .74, .05); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { B.col(0x111111, MAT.PLASTIC).box(x - .65 + i * .65, fy + 1.05 + j * .42, z - .2, .6, .4, .05); B.col([0x3a5a4a, 0x4a4a5a, 0x5a5a4a][(i + j) % 3], MAT.EMIT).box(x - .65 + i * .65, fy + 1.05 + j * .42, z - .17, .55, .35, .005); } this.colBox(x, fy + .8, z, 2, 1.6, .8, { surf: 'metal' }); this.officeChair(x, z + .85, fy, 0, tag); this.light([x, fy + 1.2, z + .5], 0x8ab0a0, .5, 3, { group: 'power', glow: 0 }); }
  gunrack(x, z, fy, q) { const B = this.B; B.push().t(x, fy, z).ry(q * Math.PI / 2); B.col(0x3a2a1a, MAT.WOOD).box(0, 1.2, 0, 1.4, 1.4, .06).box(0, .4, -.12, 1.4, .06, .25); for (let i = 0; i < 4; i++) { B.push().t(-.5 + i * .33, .9, -.1).rx(-Math.PI / 2 + .12).rz(Math.PI / 2); buildNpcWeapon(B, i % 2 ? 'ak' : 'shotgun'); B.pop(); } B.pop(); }
  toilet(x, z, fy) { this.B.col(0xe8e8e0, MAT.PLASTIC).cyl(x, fy, z, .18, .22, .4, 10).box(x, fy + .55, z - .2, .4, .4, .15); this.colBox(x, fy + .3, z, .45, .6, .55, { surf: 'concrete', sight: false }); }
  sink(x, z, fy) { this.B.col(0xe8e8e0, MAT.PLASTIC).box(x, fy + .8, z, .5, .15, .4).box(x, fy + .4, z, .15, .8, .15); this.D.col(0x8aa0b0, MAT.GLASS).box(x, fy + 1.5, z - .17, .5, .6, .02); }
  radioDesk(x, z, fy) { const B = this.B; B.col(0x4a4a42, MAT.METAL).box(x, fy + .4, z, .7, .8, 1.2); B.col(0x222222, MAT.METAL).box(x, fy + 1, z, .5, .4, .9); B.col(0x30ff60, MAT.EMIT).box(x - .26, fy + 1.05, z - .2, .01, .08, .2); B.col(0xffaa20, MAT.EMIT).box(x - .26, fy + 1.05, z + .2, .01, .06, .1); B.col(0x111111, MAT.PLASTIC).cyl(x, fy + 1.2, z + .3, .005, .005, .5, 4); this.colBox(x, fy + .6, z, .7, 1.2, 1.2, { surf: 'metal' }); }
  bench(x, z, fy, q) { const B = this.B; B.push().t(x, fy, z).ry(q * Math.PI / 2); B.col(0x5a4a30, MAT.WOOD).box(0, .45, 0, 1.6, .06, .4).box(-.7, .22, 0, .06, .44, .35).box(.7, .22, 0, .06, .44, .35); B.pop(); this.colRot(x, fy, z, q, 0, 0, 1.6, .5, .4, { surf: 'wood', sight: false }); }
  decal(x, y, z, w, d, c) { this.D.col(c, MAT.MUD).box(x, y + .012, z, w, .005, d); }
  clutter(x, z, y, kind) {
    const D = this.D, R = () => this.R();
    if (kind === 'meal') { for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; D.col(0xeeeeee, MAT.PLASTIC).cyl(x + Math.cos(a) * .45, y, z + Math.sin(a) * .25, .11, .1, .015, 10); D.col(0x8a5a2a, MAT.PAINT).cyl(x + Math.cos(a) * .45, y + .015, z + Math.sin(a) * .25, .07, .06, .015, 8); } D.col(0x2a5a2a, MAT.GLASS).cyl(x, y, z, .035, .035, .28, 8); }
    if (kind === 'beer') { for (let i = 0; i < 5; i++) D.col(i % 2 ? 0x6a4a1a : 0x2a5a2a, MAT.GLASS).cyl(x + (R() - .5) * .8, y, z + (R() - .5) * .4, .03, .025, .22, 6); D.col(0xeeeeee, MAT.PAINT); for (let i = 0; i < 8; i++) D.box(x + (R() - .5) * .5, y + .005, z + (R() - .5) * .3, .06, .003, .09); }
    if (kind === 'kitchen') { D.col(0x888888, MAT.METAL).cyl(x - .5, y, z, .12, .12, .15, 10); D.col(0xddddcc, MAT.PLASTIC).cyl(x + .3, y, z, .05, .04, .1, 8).cyl(x + .45, y, z + .05, .05, .04, .1, 8); D.col(0x7a5a3a, MAT.WOOD).box(x - .1, y + .01, z, .35, .02, .25); }
    if (kind === 'drugs') { for (let i = 0; i < 18; i++) { D.col(i % 3 ? 0xd8d4c8 : 0xc8c0a8, MAT.PLASTIC).box(x + (i % 6 - 2.5) * .3, y + .05 + (i / 6 | 0) * .02, z + ((i / 6 | 0) - 1) * .25, .22, .08, .15); } D.col(0x222222, MAT.METAL).box(x + 1, y + .04, z, .25, .06, .2); D.col(0x40ff60, MAT.EMIT).box(x + 1, y + .075, z - .05, .1, .002, .04); }
    if (kind === 'clothes') { D.col(0x4a4a3a, MAT.CLOTH).blob(x, y + .05, z, .3, .07, 7, .3); D.col(0x2a2a4a, MAT.CLOTH).blob(x + .3, y + .05, z + .1, .25, .06, 8, .3); }
    if (kind === 'cards') { D.col(0xeeeeee, MAT.PAINT); for (let i = 0; i < 10; i++) D.box(x + (R() - .5) * .6, y + .005, z + (R() - .5) * .4, .06, .002, .09); D.col(0x2a7a2a, MAT.PAINT).box(x, y + .01, z, .15, .02, .08); }
  }
  /* ---------------- destructibles / items ---------------- */
  getMesh(key, fn) { if (!this.meshCache[key]) { const B = new MB(2000); fn(B); this.meshCache[key] = B.mesh(); } return this.meshCache[key]; }
  addCrate(x, y, z, w, h, d, c) {
    const mesh = this.getMesh('crate' + w + h + d + c, B => { B.col(c, MAT.WOOD); B.box(0, h / 2, 0, w, h, d); B.col(lin(c).map(v => v * .7), MAT.WOOD); for (const s of [-1, 1]) { B.box(0, h / 2, s * d / 2, w + .02, .08, .02); B.box(s * w / 2, h / 2, 0, .02, .08, d + .02); B.box(0, h * .15, s * d / 2, w + .02, .06, .02); B.box(0, h * .85, s * d / 2, w + .02, .06, .02); } });
    const o = { kind: 'crate', mesh, m: M4.trs(M4.create(), M4.create(), x, y, z, 0, this.R() * .1, 0), pos: [x, y + h / 2, z], r: Math.max(w, h), hp: 60, alive: true, c };
    o.col = this.colBox(x, y + h / 2, z, w, h, d, { surf: 'wood', ref: o }); this.destr.push(o); this.dyn.push(o); return o;
  }
  addBarrel(x, y, z) {
    const mesh = this.getMesh('xbarrel', B => { B.col(0xb01a10, MAT.PAINT).cyl(0, 0, 0, .3, .3, .9, 14); B.col(0x8a1208, MAT.PAINT).cyl(0, .3, 0, .305, .305, .03, 14).cyl(0, .6, 0, .305, .305, .03, 14); B.col(0xe0c020, MAT.PAINT).box(0, .45, -.302, .25, .2, .005); B.col(0x111111, MAT.PAINT).box(0, .45, -.305, .08, .08, .003); });
    const o = { kind: 'barrel', mesh, m: M4.trs(M4.create(), M4.create(), x, y, z, 0, 0, 0), pos: [x, y + .45, z], r: 1, hp: 25, alive: true, explosive: true };
    o.col = this.colBox(x, y + .45, z, .6, .9, .6, { surf: 'metal', ref: o }); this.destr.push(o); this.dyn.push(o); return o;
  }
  addItem(kind, pos, yaw, o = {}) {
    const mesh = this.getMesh('item_' + kind, B => { B.b(0); buildItemGeo(B, kind); });
    const it = Object.assign({ kind: 'item', item: kind, mesh, m: M4.create(), pos: V.copy(pos), r: .5, yaw: yaw || 0, alive: true, noShadow: false }, o);
    if (kind === 'knife') { M4.trs(it.m, M4.create(), pos[0], pos[1], pos[2], o.pitch ?? Math.PI / 2, yaw || 0, o.roll || 0); }
    else M4.trs(it.m, M4.create(), pos[0], pos[1], pos[2], 0, yaw || 0, 0);
    this.items.push(it); this.dyn.push(it); return it;
  }
  ammoPickup(x, y, z) { const it = this.addItem('ammo', [x, y, z], this.R() * 3); it.ammo = true; return it; }
  removeDyn(o) { const i = this.dyn.indexOf(o); if (i >= 0) this.dyn.splice(i, 1); }
  /* ---------------- outdoor props ---------------- */
  tree(x, z, kind, s = 1) {
    const B = this.B, D = this.D, R = () => this.R(); const y = this.th(x, z) - .3;
    if (kind === 'cypress') {
      const h = (9 + R() * 7) * s;
      B.col(0x4a3a2c, MAT.BARK); B.cyl(x, y - .2, z, .9 * s, .35 * s, 2 * s, 9); B.cyl(x, y + 1.8 * s, z, .35 * s, .18 * s, h - 1.8 * s, 7);
      for (let i = 0; i < 4; i++) { const a = R() * TAU; D.col(0x3a2e22, MAT.BARK).cyl(x + Math.cos(a) * 1.2 * s, y - .3, z + Math.sin(a) * 1.2 * s, .12, .02, .6 + R() * .5, 5); } // knees
      for (let i = 0; i < 6; i++) { const yy = y + h * (.45 + i * .1); const a = R() * TAU; const L = (2.6 - i * .3) * s; const ex = x + Math.cos(a) * L, ez = z + Math.sin(a) * L;
        B.col(0x3a2e22, MAT.BARK).tube([x, yy, z], [ex, yy + .8, ez], .1 * s, .04 * s, 5);
        B.col([0x3d5a2a, 0x4a6230, 0x354f26][i % 3], MAT.LEAF).blob(ex, yy + 1, ez, 1.8 * s, .9 * s, i * 13 + x, .35);
        if (R() < .7) { D.col(0x6f7a5a, MAT.LEAF); for (let k = 0; k < 3; k++) { const mx = ex + (R() - .5) * 2, mz = ez + (R() - .5) * 2; D.beam([mx, yy + .7, mz], [mx + (R() - .5) * .2, yy - 1 - R() * 2, mz + (R() - .5) * .2], .18, .02); } } }
      B.col(0x3d5a2a, MAT.LEAF).blob(x, y + h, z, 2.2 * s, 1.4 * s, x * 3 + z, .35);
      this.colBox(x, y + 2, z, .7 * s, 5, .7 * s, { surf: 'wood' }); this.trees.push([x, z, 2.4 * s]);
    } else if (kind === 'pine') {
      const h = (8 + R() * 8) * s; B.col(0x4a3426, MAT.BARK).cyl(x, y, z, .28 * s, .12 * s, h, 7);
      const layers = 6; for (let i = 0; i < layers; i++) { const t = i / layers; const r = (2.6 - t * 2.1) * s; B.col([0x24402a, 0x2a4a30, 0x1f3a24][i % 3], MAT.LEAF); B.cyl(x, y + h * (.25 + t * .7), z, r, 0, h * .28, 8, 1); }
      this.colBox(x, y + 2, z, .5 * s, 4, .5 * s, { surf: 'wood' }); this.trees.push([x, z, 2.2 * s]);
    } else if (kind === 'palm') {
      const h = (7 + R() * 5) * s; const lean = (R() - .5) * 1.5; let px = x, pz = z, py = y;
      B.col(0x6a5a44, MAT.BARK); for (let i = 0; i < 6; i++) { const nx = px + lean * .15, ny = py + h / 6, nz = pz + lean * .08; B.tube([px, py, pz], [nx, ny, nz], .22 - i * .02, .2 - i * .02, 7); px = nx; py = ny; pz = nz; }
      B.col(0x3a6a2a, MAT.LEAF); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; B.beam([px, py, pz], [px + Math.cos(a) * 3.5, py - .8 - R(), pz + Math.sin(a) * 3.5], .5, .03); }
      this.colBox(x, y + 2, z, .4, 4, .4, { surf: 'wood' });
    } else { // broadleaf
      const h = (5 + R() * 4) * s; B.col(0x4a3a2a, MAT.BARK).cyl(x, y, z, .3 * s, .2 * s, h * .6, 7);
      for (let i = 0; i < 4; i++) B.col([0x3a5a28, 0x45662c, 0x2f4f22][i % 3], MAT.LEAF).blob(x + (R() - .5) * 2.5 * s, y + h * .6 + R() * 2 * s, z + (R() - .5) * 2.5 * s, 2 * s, 1.5 * s, i + x * 7, .35);
      this.colBox(x, y + 2, z, .5 * s, 4, .5 * s, { surf: 'wood' }); this.trees.push([x, z, 2.5 * s]);
    }
  }
  bush(x, z, s = 1, col = 0x3a5a2a) { const y = this.th(x, z); const B = this.B; B.col(col, MAT.LEAF); for (let i = 0; i < 3; i++) B.blob(x + (this.R() - .5) * s, y + .4 * s + this.R() * .3, z + (this.R() - .5) * s, .9 * s, .7 * s, x + z * 3 + i, .4); this.veg.push({ p: [x, y + .7 * s, z], r: 1.3 * s, k: .85 }); }
  reeds(x, z, n = 12, col = 0x6a7a3a) { const D = this.D; const y = this.th(x, z); D.col(col, MAT.LEAF); for (let i = 0; i < n; i++) { const px = x + (this.R() - .5) * 2.4, pz = z + (this.R() - .5) * 2.4; const gy = this.th(px, pz); D.beam([px, gy - .2, pz], [px + (this.R() - .5) * .4, Math.max(gy, this.waterY) + .8 + this.R() * 1.1, pz + (this.R() - .5) * .4], .025, .01); if (this.R() < .25) { D.col(0x5a3a1a, MAT.CLOTH).cyl(px, Math.max(gy, this.waterY) + 1.1, pz, .03, .03, .15, 5); D.col(col, MAT.LEAF); } } this.veg.push({ p: [x, Math.max(y, this.waterY) + .7, z], r: 1.5, k: .6 }); }
  grass(x, z, n = 10, col = 0x5a6a30) { const D = this.D; D.col(col, MAT.GRASS); for (let i = 0; i < n; i++) { const px = x + (this.R() - .5) * 2, pz = z + (this.R() - .5) * 2; const gy = this.th(px, pz); if (gy < this.waterY) continue; D.beam([px, gy, pz], [px + (this.R() - .5) * .3, gy + .3 + this.R() * .4, pz + (this.R() - .5) * .3], .05, .01); } }
  rock(x, z, s = 1, col = 0x6a6660) { const y = this.th(x, z); this.B.col(col, MAT.ROCK).blob(x, y + .2 * s, z, s, s * .6, x * 13 + z, .3, 8, 5); this.colBox(x, y + .3 * s, z, s * 1.4, s * .9, s * 1.4, { surf: 'concrete' }); }
  log(x, z, L, yaw) { const y = this.th(x, z); this.B.push().t(x, y + .2, z).ry(yaw); this.B.col(0x4a3a2a, MAT.BARK).cylZ(0, 0, 0, .25, L, 8); this.B.pop(); const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw)); this.colBox(x, y + .2, z, .5 + s * L, .45, .5 + c * L, { surf: 'wood', sight: false }); }
  lilypads(x, z, n = 6) { const D = this.D; for (let i = 0; i < n; i++) { const px = x + (this.R() - .5) * 4, pz = z + (this.R() - .5) * 4; if (this.th(px, pz) > this.waterY - .1) continue; D.col(this.R() < .5 ? 0x3a6a2a : 0x4a7a30, MAT.LEAF).cyl(px, this.waterY + .02, pz, .25 + this.R() * .2, .25, .01, 9, 2); if (this.R() < .2) D.col(0xf0d0e0, MAT.PAINT).sph(px, this.waterY + .06, pz, .06, .04, .06, 6, 3); } }
  fence(x0, z0, x1, z1, kind = 'chain', h = 2.2) {
    const L = Math.hypot(x1 - x0, z1 - z0); const n = Math.max(1, Math.round(L / 2.5)); const B = this.B;
    for (let i = 0; i <= n; i++) { const t = i / n; const x = lerp(x0, x1, t), z = lerp(z0, z1, t); const y = this.th(x, z); B.col(kind === 'wood' ? 0x5a4a38 : 0x707470, kind === 'wood' ? MAT.WOOD : MAT.METAL); if (kind === 'wood') B.box(x, y + h / 2, z, .12, h, .12); else B.cyl(x, y - .2, z, .04, .04, h + .2, 6); }
    for (let i = 0; i < n; i++) {
      const xa = lerp(x0, x1, i / n), za = lerp(z0, z1, i / n), xb = lerp(x0, x1, (i + 1) / n), zb = lerp(z0, z1, (i + 1) / n); const ya = this.th(xa, za), yb = this.th(xb, zb);
      if (kind === 'chain') { B.col(0x8a8e88, 25); B.begin(); B.quad([xa, ya + .05, za], [xb, yb + .05, zb], [xb, yb + h, zb], [xa, ya + h, za]); B.col(0x707470, MAT.METAL).beam([xa, ya + h, za], [xb, yb + h, zb], .03); B.col(0x6a6a6a, MAT.METAL); for (let k = 0; k < 3; k++) this.D.beam([xa, ya + h + .12 + k * .1, za], [xb, yb + h + .12 + k * .1, zb], .008); }
      else if (kind === 'wood') { B.col(0x6a5a44, MAT.WOOD); B.jit = .1; for (let k = 0; k < 3; k++) B.beam([xa, ya + .4 + k * .6, za], [xb, yb + .4 + k * .6, zb], .04, .14); B.jit = 0; }
      else if (kind === 'corr') { B.col(0x6a6e6a, MAT.CORR); B.begin(); B.quad([xa, ya - .1, za], [xb, yb - .1, zb], [xb, yb + h, zb], [xa, ya + h, za]); }
      else if (kind === 'concrete') { B.col(0x8a8680, MAT.CONC); B.beam([xa, ya - .3, za], [xb, yb - .3, zb], .3, .3); B.beam([xa, ya + h / 2 - .2, za], [xb, yb + h / 2 - .2, zb], .3, h); }
      const cx = (xa + xb) / 2, cz = (za + zb) / 2, cy = Math.min(ya, yb);
      this.col(Math.min(xa, xb) - .08, cy - .2, Math.min(za, zb) - .08, Math.max(xa, xb) + .08, cy + h + (kind === 'chain' ? .4 : 0), Math.max(za, zb) + .08, { surf: 'metal', sight: kind !== 'chain', bullet: kind !== 'chain' });
      this.mline(xa, za, xb, zb);
    }
  }
  floodlight(x, z, yaw, h = 6, group = 'power', col = 0xfff2d0) {
    const y = this.th(x, z); const B = this.B; B.col(0x555a55, MAT.METAL).cyl(x, y - .2, z, .1, .07, h + .2, 7); B.col(0x3a3a3a, MAT.CONC).cyl(x, y - .3, z, .35, .3, .4, 8);
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    B.push().t(x, y + h, z).ry(yaw).rx(-.5); B.col(0x2a2a2a, MAT.METAL).box(0, 0, -.2, .6, .4, .3); B.col(0xfff8e0, MAT.EMIT).box(0, -.0, -.36, .52, .32, .02); B.pop();
    this.D.col(0x111111, MAT.RUBBER).tube([x, y + h - .1, z], [x, y + .3, z], .015);
    const dir = V.norm([fx, -.55, fz]);
    return this.light([x + fx * .3, y + h - .1, z + fz * .3], col, 6, 32, { dir, cone: .62, group, glow: .9, flood: true });
  }
  lampPost(x, z, h = 5, col = 0xffc070, group = 'power') { const y = this.th(x, z); const B = this.B; B.col(0x3a3a3a, MAT.METAL).cyl(x, y, z, .08, .06, h, 7).box(x + .5, y + h, z, 1.1, .08, .08); B.col(0x222222, MAT.METAL).box(x + 1, y + h - .05, z, .4, .12, .25); B.col(0xffe0a0, MAT.EMIT).box(x + 1, y + h - .12, z, .35, .02, .2); this.colBox(x, y + h / 2, z, .2, h, .2, { surf: 'metal' }); return this.light([x + 1, y + h - .3, z], col, 3.5, 18, { group, glow: .8, dir: [0, -1, 0], cone: .2 }); }
  generator(x, z, q = 0) {
    const y = this.th(x, z) + .05; const B = this.B; B.push().t(x, y, z).ry(q * Math.PI / 2);
    B.col(0x3a5a2a, MAT.PAINT).box(0, .1, 0, 2.2, .2, 1.1).box(0, .7, 0, 2, 1, 1); B.col(0x2a3a20, MAT.PAINT); for (let i = 0; i < 8; i++) B.box(-.7 + i * .2, .8, -.51, .08, .6, .02);
    B.col(0x222222, MAT.METAL).cyl(.6, 1.2, .2, .08, .08, .6, 8); B.col(0xd0c020, MAT.PAINT).box(.95, .9, -.3, .1, .3, .3); B.col(0x111111, MAT.RUBBER).tube([-1, .5, 0], [-1.6, 0, .5], .04);
    B.pop(); this.colRot(x, y, z, q, 0, 0, 2.2, 1.3, 1.1, { surf: 'metal' });
    return [x, y + .8, z];
  }
  sandbags(x, z, L, q = 0, rows = 3) { const y = this.th(x, z); const B = this.B; B.push().t(x, y, z).ry(q * Math.PI / 2); B.col(0x8a7a5a, MAT.CANVAS); for (let r = 0; r < rows; r++) for (let i = 0; i < L / .6; i++) { B.blob(-L / 2 + .3 + i * .6 + (r % 2) * .3, .12 + r * .22, 0, .32, .12, i * 7 + r + x, .12, 6, 4); } B.pop(); this.colRot(x, y, z, q, 0, 0, L + .3, rows * .22 + .05, .55, { surf: 'wood' }); }
  pallet(x, z, y) { const B = this.D; B.col(0x8a7050, MAT.WOOD); for (let i = 0; i < 5; i++) B.box(x - .48 + i * .24, y + .12, z, .1, .02, 1.2); for (const s of [-.5, 0, .5]) B.box(x, y + .05, z + s, 1.2, .1, .1); }
  container(x, z, q, col, y, open = false) {
    const B = this.B; const L = 6.06, W = 2.44, H = 2.59; B.push().t(x, y, z).ry(q * Math.PI / 2); B.col(col, MAT.CORR);
    B.box(0, H / 2, 0, W, H, L, open ? 0 : 0); B.col(lin(col).map(v => v * .7), MAT.METAL); for (const s of [-1, 1]) for (const e of [-1, 1]) B.box(s * W / 2, H / 2, e * L / 2, .12, H, .12);
    B.box(0, H, 0, W + .02, .1, L + .02).box(0, 0.05, 0, W + .02, .1, L + .02); B.col(0x333333, MAT.METAL).box(-.4, H / 2, L / 2 + .02, .04, H * .9, .04).box(.4, H / 2, L / 2 + .02, .04, H * .9, .04);
    B.pop(); this.colRot(x, y, z, q, 0, 0, W, H, L, { surf: 'metal' }); this.mapRects.push(null);
    const c = (q & 1) ? [x - L / 2, z - W / 2, x + L / 2, z + W / 2] : [x - W / 2, z - L / 2, x + W / 2, z + L / 2]; this.mline(c[0], c[1], c[2], c[1]); this.mline(c[2], c[1], c[2], c[3]); this.mline(c[2], c[3], c[0], c[3]); this.mline(c[0], c[3], c[0], c[1]);
  }
  road(pts, w, col, mat = MAT.MUD) {
    this.roads.push({ pts, w }); const D = this.B; D.col(col, mat);
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.ceil(L / 2); const nx = -(b[1] - a[1]) / L * w / 2, nz = (b[0] - a[0]) / L * w / 2;
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n; const p0 = [lerp(a[0], b[0], t0), lerp(a[1], b[1], t0)], p1 = [lerp(a[0], b[0], t1), lerp(a[1], b[1], t1)];
        const Y = (x, z) => this.th(x, z) + .04;
        D.begin(); D.quad([p0[0] - nx, Y(p0[0] - nx, p0[1] - nz), p0[1] - nz], [p1[0] - nx, Y(p1[0] - nx, p1[1] - nz), p1[1] - nz], [p1[0] + nx, Y(p1[0] + nx, p1[1] + nz), p1[1] + nz], [p0[0] + nx, Y(p0[0] + nx, p0[1] + nz), p0[1] + nz]);
        if (mat === MAT.MUD) { this.D.col(lin(col).map(v => v * .7), MAT.MUD); for (const s of [-.3, .3]) { const ox = nx * s * 2 / 1, oz = nz * s * 2 / 1; this.D.begin(); const k2 = .12 / (w / 2); this.D.quad([p0[0] + ox - nx * k2, Y(p0[0] + ox, p0[1] + oz) + .01, p0[1] + oz - nz * k2], [p1[0] + ox - nx * k2, Y(p1[0] + ox, p1[1] + oz) + .01, p1[1] + oz - nz * k2], [p1[0] + ox + nx * k2, Y(p1[0] + ox, p1[1] + oz) + .01, p1[1] + oz + nz * k2], [p0[0] + ox + nx * k2, Y(p0[0] + ox, p0[1] + oz) + .01, p0[1] + oz + nz * k2]); } D.col(col, mat); }
      }
    }
  }
  bridge(x0, z0, x1, z1, w, y, rails = true) {
    const L = Math.hypot(x1 - x0, z1 - z0); const dx = (x1 - x0) / L, dz = (z1 - z0) / L; const nx = -dz, nz = dx; const B = this.B;
    const n = Math.ceil(L / .3); B.col(0x6a5640, MAT.WOOD); B.jit = .12;
    for (let i = 0; i < n; i++) { const t = (i + .5) / n * L; const cx = x0 + dx * t, cz = z0 + dz * t; B.push().t(cx, y, cz).ry(Math.atan2(-dx, -dz)); B.box(0, -.04, 0, w, .06, .27); B.pop(); }
    B.jit = 0; B.col(0x4a3a2a, MAT.WOOD);
    for (let t = 0; t <= L; t += 2.5) for (const s of [-1, 1]) { const px = x0 + dx * t + nx * s * w / 2, pz = z0 + dz * t + nz * s * w / 2; const gy = this.th(px, pz) - 1; B.box(px, (gy + y) / 2, pz, .2, y - gy, .2); if (rails) B.box(px, y + .5, pz, .1, 1, .1); }
    if (rails) for (const s of [-1, 1]) { B.beam([x0 + nx * s * w / 2, y + .95, z0 + nz * s * w / 2], [x1 + nx * s * w / 2, y + .95, z1 + nz * s * w / 2], .08); this.D.beam([x0 + nx * s * w / 2, y + .5, z0 + nz * s * w / 2], [x1 + nx * s * w / 2, y + .5, z1 + nz * s * w / 2], .05); }
    // walk collider(s) along the bridge as AABB chunks
    const segs = Math.ceil(L / 2);
    for (let i = 0; i < segs; i++) { const t0 = i / segs * L, t1 = (i + 1) / segs * L; const ax = x0 + dx * t0, az = z0 + dz * t0, bx = x0 + dx * t1, bz = z0 + dz * t1; const hw = w / 2; this.col(Math.min(ax, bx) - Math.abs(nx) * hw, y - .3, Math.min(az, bz) - Math.abs(nz) * hw, Math.max(ax, bx) + Math.abs(nx) * hw, y, Math.max(az, bz) + Math.abs(nz) * hw, { walk: true, surf: 'wood' }); }
    this.mline(x0 + nx * w / 2, z0 + nz * w / 2, x1 + nx * w / 2, z1 + nz * w / 2); this.mline(x0 - nx * w / 2, z0 - nz * w / 2, x1 - nx * w / 2, z1 - nz * w / 2);
  }
  watchtower(x, z, h = 5, q = 0) {
    const y = this.th(x, z); const B = this.B;
    B.col(0x5a4a36, MAT.WOOD); for (const [a, b] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) { B.box(x + a, y + h / 2, z + b, .2, h + .6, .2); this.colBox(x + a, y + h / 2, z + b, .2, h, .2, { surf: 'wood' }); }
    for (let k = 0; k < 2; k++) { B.beam([x - 1.3, y + k * 2 + .5, z - 1.3], [x + 1.3, y + k * 2 + 2.3, z - 1.3], .08); B.beam([x - 1.3, y + k * 2 + .5, z + 1.3], [x + 1.3, y + k * 2 + 2.3, z + 1.3], .08); }
    this.slab(x - 1.5, z - 1.5, x + 1.5, z + 1.5, y + h, .15, 0x6a5640, MAT.WOOD, 'wood', [[x + .6, z + .3, x + 1.4, z + 1.4]]);
    B.col(0x5a4a36, MAT.WOOD); for (const [a, b, w, d] of [[0, -1.45, 3, .1], [-1.45, 0, .1, 3], [1.45, -.5, .1, 2]]) { B.box(x + a, y + h + .55, z + b, w, 1, d); this.colBox(x + a, y + h + .55, z + b, w, 1, d, { surf: 'wood' }); }
    for (const [a, b] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) B.box(x + a, y + h + 1.6, z + b, .1, 1.2, .1);
    B.col(0x3a3a34, MAT.CORR).push().t(x, y + h + 2.3, z).rx(.06).box(0, 0, 0, 3.6, .06, 3.6).pop();
    // ladder-like steep stairs on +x/+z corner
    this.stairs(x + 1, z + 4.6, 'n', .8, h, 3.6, 0x5a4a36, MAT.WOOD, 'wood');
    return [x, y + h, z];
  }
  generatorPanel(x, y, z, q) { // fuse box on wall
    const B = this.B; B.push().t(x, y, z).ry(q * Math.PI / 2); B.col(0x6a6e68, MAT.METAL).box(0, 0, 0, .5, .7, .18); B.col(0xd0b020, MAT.PAINT).box(0, .2, -.092, .2, .12, .005); B.col(0x111111, MAT.PAINT).box(0, .2, -.094, .06, .06, .002); B.pop();
  }
}
