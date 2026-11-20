/* =====================================================================
   MODELS — articulated characters (17-bone rig), weapons, vehicles,
   aircraft, parachute. All geometry is procedurally modelled.
   ===================================================================== */
const SK = { PEL: 0, CH: 1, HD: 2, UAL: 3, FAL: 4, HL: 5, UAR: 6, FAR: 7, HR: 8, THL: 9, SHL: 10, FTL: 11, THR: 12, SHR: 13, FTR: 14, WPN: 15, PROP: 16, N: 17 };
const J_OFS = [[0, .98, 0], [0, .11, 0], [0, .46, 0], [-.195, .41, 0], [0, -.29, 0], [0, -.265, 0], [.195, .41, 0], [0, -.29, 0], [0, -.265, 0], [-.095, -.05, 0], [0, -.45, 0], [0, -.42, 0], [.095, -.05, 0], [0, -.45, 0], [0, -.42, 0]];
const J_PAR = [-1, 0, 1, 1, 3, 4, 1, 6, 7, 0, 9, 10, 0, 12, 13];

/* -------- 2-bone IK -------- */
function ik2(S, T, a, b, pole) {
  let d = V.sub(T, S); let L = V.len(d); const maxL = (a + b) * .999; if (L > maxL) { d = V.sc(d, maxL / L); L = maxL; } if (L < .02) L = .02;
  const dir = V.sc(d, 1 / L);
  const cosA = clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1); const A = Math.acos(cosA);
  let pp = V.sub(pole, V.sc(dir, V.dot(pole, dir))); pp = V.norm(pp);
  const E = V.add(S, V.add(V.sc(dir, Math.cos(A) * a), V.sc(pp, Math.sin(A) * a)));
  const Tc = V.add(S, d);
  return { E, T: Tc, pp };
}
// matrix for limb segment whose local -Y runs from p0 to p1
function segMat(o, p0, p1, side) {
  const y = V.norm(V.sub(p0, p1)); let x = V.norm(V.cross(y, side)); if (!isFinite(x[0])) x = [1, 0, 0]; const z = V.cross(x, y);
  return M4.basis(o, x, y, z, p0);
}

/* ======================= CHARACTER GEOMETRY ======================= */
/* ======================= CHARACTER RIG & POSES ======================= */
class Rig {
  constructor(mesh) {
    this.mesh = mesh; this.bones = new Float32Array(SK.N * 16); this.mats = []; for (let i = 0; i < SK.N; i++) this.mats.push(M4.create());
    this.j = new Float32Array(45); this.tj = new Float32Array(45); this.py = 0; this.pz = 0; this.tpy = 0; this.tpz = 0;
    this.root = M4.create(); this.hide = 0; // bitmask of hidden bones
    this.wpn = null; // {m: matrix world} or null
    this.armIK = null; // {L:[target, side], R:[...]}
    this.prop = false;
  }
  setTarget(j, py = 0, pz = 0) { this.tj.set(j); this.tpy = py; this.tpz = pz; }
  blend(k, dt) { const f = 1 - Math.exp(-k * dt); for (let i = 0; i < 45; i++) this.j[i] += (this.tj[i] - this.j[i]) * f; this.py += (this.tpy - this.py) * f; this.pz += (this.tpz - this.pz) * f; }
  solve(weaponLocal, propOn) {
    const M = this.mats; if (this.sc && this.sc !== 1) M4.scale(this.root, this.root, this.sc, this.sc, this.sc);
    for (let i = 0; i < 15; i++) {
      const o = J_OFS[i], p = J_PAR[i]; const src = p < 0 ? this.root : M[p];
      const x = o[0], y = o[1] + (i === 0 ? this.py : 0), z = o[2] + (i === 0 ? this.pz : 0);
      M4.trs(M[i], src, x, y, z, this.j[i * 3], this.j[i * 3 + 1], this.j[i * 3 + 2]);
    }
    if (weaponLocal) { // weapon in chest space + arm IK to grips
      M4.mul(M[SK.WPN], M[SK.CH], weaponLocal.m);
      const W = M[SK.WPN];
      for (const side of [0, 1]) {
        const g = side ? weaponLocal.gl : weaponLocal.gr; if (!g) continue;
        const ua = side ? SK.UAL : SK.UAR, fa = side ? SK.FAL : SK.FAR, hb = side ? SK.HL : SK.HR;
        const S = M4.pt(M[ua], 0, 0, 0); const T = M4.pt(W, g[0], g[1], g[2]);
        const poleW = M4.dir(M[SK.CH], side ? -.6 : .6, -1, .25);
        const r = ik2(S, T, .29, .265, V.add(S, poleW));
        const sideAx = M4.dir(M[SK.CH], 1, 0, 0);
        limbFrames(M[ua], M[fa], S, r.E, r.T, sideAx, false);
        // hand orientation: fingers along weapon forward-down
        const hy = V.norm(M4.dir(W, 0, .5, .9)); const hx = V.norm(M4.dir(W, side ? -1 : 1, 0, 0)); const hz = V.norm(V.cross(hx, hy)); const hx2 = V.cross(hy, hz);
        M4.basis(M[hb], hx2, hy, hz, r.T);
      }
    } else M4.copy(M[SK.WPN], ZERO_M);
    if (propOn) M4.trs(M[SK.PROP], M[SK.HL], 0, -.11, -.02, 0, 0, 0); else M4.copy(M[SK.PROP], ZERO_M);
    for (let i = 0; i < SK.N; i++) { if (this.hide & (1 << i)) this.bones.set(ZERO_M, i * 16); else this.bones.set(M[i], i * 16); }
  }
  bonePos(i) { return M4.pos(this.mats[i]); }
}
/* ======================= VIEWMODEL (first person) ======================= */
const VB = { UAR: 0, FAR: 1, HR: 2, UAL: 3, FAL: 4, HL: 5, WPN: 6, MAG: 7, SLD: 8, ITEM: 9, KNIFE: 10, N: 11 };
const VM_UA = .36, VM_FA = .34;
function buildArms(app) {
  const B = new MB(12000); const sleeve = app.sleeve, glove = app.glove, mat = app.plain ? MAT.CLOTH : MAT.CAMO;
  const dk = lin(sleeve).map(v => v * .72);
  for (const L of [0, 1]) {
    const ua = L ? VB.UAL : VB.UAR, fa = L ? VB.FAL : VB.FAR, h = L ? VB.HL : VB.HR; const sx = L ? -1 : 1;
    B.b(ua).col(sleeve, mat).cyl(0, -VM_UA - .02, 0, .046, .06, VM_UA + .04, 12).sph(0, -.02, 0, .062, .06, .062, 10, 6);
    B.col(dk, mat); for (let i = 0; i < 3; i++) B.torus(0, -.1 - i * .085, 0, .053 - i * .003, .006, 12, 3);
    if (!app.plain) { B.col(0x2a2c22, MAT.CANVAS).cyl(0, -.13, 0, .061, .061, .05, 12); B.col(sleeve, mat).box(sx * .056, -.06, 0, .012, .08, .07); B.col(0x8a1010, MAT.CLOTH).box(sx * .063, -.06, 0, .002, .04, .05); B.col(0x1a1a1a, MAT.CLOTH).box(sx * .063, -.085, 0, .002, .01, .05); }
    B.b(fa).col(sleeve, mat).cyl(0, -.26, 0, .04, .051, .28, 12).sph(0, 0, 0, .052, .05, .052, 9, 5);
    B.col(dk, mat); B.torus(0, -.08, 0, .049, .006, 12, 3).torus(0, -.17, 0, .045, .005, 12, 3);
    if (app.plain) { B.col(0xf4f2ee, MAT.CLOTH).cyl(0, -.3, 0, .042, .044, .05, 12); B.col(0xc9a23a, MAT.METAL).sph(sx * .035, -.28, -.02, .008, .008, .006, 5, 3); }
    else B.col(dk, mat).cyl(0, -.28, 0, .047, .047, .035, 12);
    B.col(glove, glove === 0xd8b090 ? MAT.SKIN : MAT.LEATHER).cyl(0, -VM_FA, 0, .034, .04, .09, 10);
    if (L) { B.col(0x141414, MAT.RUBBER).cyl(0, -.297, 0, .043, .043, .026, 14); B.col(0x0a0a0a, MAT.GLASS).box(0, -.284, -.044, .03, .032, .007); B.col(0x7a7e82, MAT.METAL).box(.018, -.284, -.044, .006, .008, .006); B.col(0xc02020, MAT.EMIT).box(.006, -.284, -.0485, .01, .005, .001); B.col(0x30d050, MAT.EMIT).box(-.006, -.29, -.0485, .006, .004, .001); }
    buildHand(B, h, !!L, glove, glove === 0xd8b090 ? glove : 0xc89670);
  }
  return B.mesh();
}
function buildItemMesh(kind) {
  const B = new MB(2000); B.b(VB.ITEM); buildItemGeo(B, kind); return B.mesh();
}
function buildItemGeo(B, kind) {
  if (kind === 'ledger') { B.col(0x4a1a12, MAT.LEATHER).box(0, 0, 0, .16, .03, .22); B.col(0xe8e0cc, MAT.PAINT).box(.003, 0, 0, .15, .024, .21); B.col(0xc9a23a, MAT.METAL).box(0, .016, 0, .05, .002, .05); }
  else if (kind === 'dossier') { B.col(0xc8a86a, MAT.PAINT).box(0, 0, 0, .2, .02, .26); B.col(0xb01818, MAT.PAINT).box(-.05, .011, -.08, .06, .002, .03); B.col(0xeeeeee, MAT.PAINT).box(.004, .003, .004, .19, .016, .25); }
  else if (kind === 'drive') { B.col(0x1a1a1a, MAT.METAL).box(0, 0, 0, .1, .025, .14); B.col(0x2a7fff, MAT.EMIT).box(.03, .013, -.06, .01, .002, .005); B.col(0x888888, MAT.METAL).box(0, 0, .072, .05, .012, .006); }
  else if (kind === 'keycard') { B.col(0xdddddd, MAT.PLASTIC).box(0, 0, 0, .055, .002, .085); B.col(0xb01818, MAT.PAINT).box(0, .0015, -.02, .05, .001, .03); B.col(0xc9a23a, MAT.METAL).box(-.012, .0015, .02, .012, .001, .01); }
  else if (kind === 'charge') { B.col(0xc8b88a, MAT.PLASTIC).box(0, 0, 0, .12, .05, .07); B.col(0x111111, MAT.PLASTIC).box(0, .035, 0, .05, .02, .04); B.col(0xff2020, MAT.EMIT).box(.015, .046, 0, .006, .003, .006); B.col(0xaa1111, MAT.RUBBER).tube([-.06, .0, .02], [-.02, .03, .01], .003); B.col(0x1144aa, MAT.RUBBER).tube([-.06, .0, -.02], [-.02, .03, -.01], .003); B.col(0x1a1a1a, MAT.CANVAS).box(0, 0, 0, .125, .052, .02); }
  else if (kind === 'noisemaker') { B.col(0x2a2a2a, MAT.PLASTIC).cyl(0, -.03, 0, .025, .025, .06, 12); B.col(0xff8a00, MAT.EMIT).cyl(0, .03, 0, .01, .01, .006, 8); }
  else if (kind === 'smoke') { B.col(0x3c4a3a, MAT.METAL).cyl(0, -.05, 0, .028, .028, .1, 12); B.col(0xbbbbbb, MAT.METAL).cyl(0, .05, 0, .015, .012, .02, 8); B.col(0x999999, MAT.METAL).torus(.03, .065, 0, .012, .002, 8, 3); }
  else if (kind === 'codes') { B.col(0x2a2a2a, MAT.METAL).box(0, 0, 0, .14, .04, .1); B.col(0xbb1111, MAT.PAINT).box(0, .021, 0, .1, .002, .06); B.col(0xeeeeee, MAT.PAINT).box(0, .022, 0, .08, .001, .02); }
  else if (kind === 'ammo') { B.col(0x3a4a2a, MAT.METAL).box(0, 0, 0, .14, .1, .06); B.col(0xc9a23a, MAT.METAL).box(0, .055, 0, .12, .01, .04); }
  else if (kind === 'knife') { buildKnifeVM(B, B.bone, (typeof G !== 'undefined' && G.loadout && G.loadout.knife) || 'knife'); }
  else if (kind === 'emp') { B.col(0x2a3038, MAT.METAL).cyl(0, -.04, 0, .03, .03, .08, 12); B.col(0x40a0ff, MAT.EMIT).torus(0, .0, 0, .031, .004, 12, 3).box(0, .045, 0, .012, .01, .012); B.col(0x111111, MAT.PLASTIC).cyl(0, .04, 0, .02, .015, .01, 8); }
  else if (kind === 'medkit') { B.col(0x8a1414, MAT.CANVAS).box(0, 0, 0, .14, .07, .1); B.col(0xeeeeee, MAT.PAINT).box(0, .036, 0, .06, .002, .016).box(0, .036, 0, .016, .002, .06); B.col(0x111111, MAT.PLASTIC).box(0, 0, -.051, .1, .02, .004); }
}
/* ======================= VEHICLES ======================= */
const VEHB = { BODY: 0, W0: 1, W1: 2, W2: 3, W3: 4, STEER: 5, DOOR: 6 };
function buildWheel(B, bone, r, w) {
  B.b(bone).col(0x141414, MAT.RUBBER).push().rz(Math.PI / 2).cyl(0, -w / 2, 0, r, r, w, 16).pop();
  B.col(0x111111, MAT.RUBBER); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; B.push().rx(a).box(0, r, 0, w * 1.02, .025, .05).pop(); }
  B.col(0x7a7a7a, MAT.METAL).push().rz(Math.PI / 2).cyl(0, -w / 2 - .005, 0, r * .55, r * .55, w + .01, 12).pop();
  B.col(0x333333, MAT.METAL); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; B.push().rx(a).box(0, r * .3, 0, w + .02, r * .35, .04).pop(); }
}
function carTrim(B, kind, L, W, pc, wr, tall) {
  B.b(VEHB.BODY); const dk = lin(pc).map(v => v * .55), y0 = tall ? .55 : .5;
  // wheel arches
  B.col(0x141414, MAT.RUBBER); for (const z of [-L * .32, L * (tall ? .3 : .32)]) for (const s of [-1, 1]) { B.push().t(s * (W / 2 + .005), wr, z).rz(Math.PI / 2); B.torus(0, 0, 0, wr + .07, .045, 12, 4); B.pop(); }
  // door seams, handles, sills
  B.col(dk, MAT.PAINT); for (const s of [-1, 1]) { const x = s * (W / 2 + .004); B.box(x, (tall ? 1.35 : 1.0), -L * .03, .006, (tall ? 1.1 : .75), .012).box(x, (tall ? 1.35 : 1.0), tall ? -L * .2 : L * .2, .006, (tall ? 1.1 : .75), .012); }
  B.col(0x9a9a9a, MAT.METAL); for (const s of [-1, 1]) B.box(s * (W / 2 + .01), tall ? 1.55 : 1.08, -L * .08, .012, .03, .14).box(s * (W / 2 + .01), tall ? 1.55 : 1.08, tall ? L * .02 : L * .12, .012, .03, .14);
  B.col(0x111111, MAT.RUBBER); for (const s of [-1, 1]) B.box(s * (W / 2 + .01), y0 + .05, 0, .03, .08, L * .45);
  // plates, exhaust, wipers, antenna, fog lights
  B.col(0xe8e8e0, MAT.PAINT).box(0, y0 + .15, -L / 2 - .07, .5, .12, .01).box(0, y0 + .3, L / 2 + .07, .5, .12, .01); B.col(0x1a2a6a, MAT.PAINT).box(-.2, y0 + .15, -L / 2 - .076, .07, .11, .004).box(-.2, y0 + .3, L / 2 + .076, .07, .11, .004);
  B.col(0x222222, MAT.PAINT); for (let i = 0; i < 5; i++) B.box(.02 + i * .04, y0 + .15, -L / 2 - .077, .025, .06, .003).box(.02 + i * .04, y0 + .3, L / 2 + .077, .025, .06, .003);
  B.col(0x777777, MAT.METAL).cylZ(W * .3, y0 - .05, L / 2 + .05, .035, .2, 8); B.col(0x111111, MAT.METAL).cylZ(W * .3, y0 - .05, L / 2 + .151, .028, .005, 8);
  B.col(0x0a0a0a, MAT.RUBBER).push().t(-.25, tall ? 1.88 : 1.36, tall ? -L * .2 : -L * .13).rz(.3).box(0, 0, 0, .55, .015, .02).pop().push().t(.35, tall ? 1.88 : 1.36, tall ? -L * .2 : -L * .13).rz(.3).box(0, 0, 0, .5, .015, .02).pop();
  B.col(0x111111, MAT.METAL).cyl(W * .4, tall ? 2.1 : 1.55, L * .05, .006, .002, .8, 4);
  B.col(0xfff4d0, MAT.EMIT).cylZ(W * .38, y0 + .02, -L / 2 - .06, .05, .03, 10).cylZ(-W * .38, y0 + .02, -L / 2 - .06, .05, .03, 10);
  if (kind === 'suv') { B.col(0x1a1a1a, MAT.METAL).box(W * .38, 1.88, .25, .04, .05, L * .5).box(-W * .38, 1.88, .25, .04, .05, L * .5); for (let i = 0; i < 3; i++) B.box(0, 1.92, -.3 + i * .5, W * .8, .03, .04); }
  if (kind === 'sedan' || kind === 'suv') { B.col(0x111111, MAT.METAL); for (let i = 0; i < 6; i++) B.box(0, .62 + i * .05, -L / 2 - .02, W * .45, .02, .03); B.col(0xc0c0c0, MAT.METAL).box(0, .78, -L / 2 - .035, .08, .06, .01); }
  // interior: dashboard gauges, mirror, door cards
  B.col(0x0a0a0a, MAT.GLASS).box(tall ? -.42 : -.4, tall ? 1.48 : 1.16, tall ? -L * .18 + .16 : -L * .17 + .16, .3, .1, .01); B.col(0xff8a20, MAT.EMIT).box(tall ? -.47 : -.45, tall ? 1.48 : 1.16, tall ? -L * .18 + .166 : -L * .17 + .166, .06, .06, .002).box(tall ? -.37 : -.35, tall ? 1.48 : 1.16, tall ? -L * .18 + .166 : -L * .17 + .166, .06, .06, .002);
  B.col(0x111111, MAT.PLASTIC).box(0, tall ? 1.95 : 1.5, tall ? -L * .18 : -L * .12, .2, .05, .02);
}
function buildCar(kind, color) {
  const B = new MB(12000); B.b(VEHB.BODY); B.jit = 0;
  const pc = color;
  if (kind === 'pickup' || kind === 'truck') {
    const L = kind === 'truck' ? 7 : 5.3, W = kind === 'truck' ? 2.5 : 2, H = kind === 'truck' ? 1.1 : .8;
    B.col(0x1a1a1a, MAT.METAL).box(0, .55, 0, W * .8, .25, L * .9); // chassis
    B.col(pc, MAT.PAINT).box(0, .55 + H / 2 + .1, -L * .35, W, H, L * .3); // hood/engine
    B.col(pc, MAT.PAINT).box(0, .55 + H + .45, -L * .08, W, .9 + (kind === 'truck' ? .3 : 0), L * .25); // cab
    B.col(0x2a3a40, MAT.GLASS).box(0, .55 + H + .5, -L * .205, W * .9, .6, .02); B.box(W / 2 + .001, .55 + H + .5, -L * .08, .02, .5, L * .2); B.box(-W / 2 - .001, .55 + H + .5, -L * .08, .02, .5, L * .2); B.box(0, .55 + H + .5, L * .045, W * .85, .5, .02);
    if (kind === 'truck') { // canvas covered cargo
      B.col(0x4a4f3a, MAT.CANVAS).box(0, 2.1, L * .25, W, 1.6, L * .5); B.col(0x3a3f2c, MAT.CANVAS); for (let i = 0; i < 5; i++) B.box(0, 2.92, L * .02 + i * L * .12, W + .04, .06, .05);
      B.col(0x2a2a2a, MAT.METAL).box(0, 1.1, L * .25, W, .2, L * .5);
    } else {
      B.col(pc, MAT.PAINT).box(W / 2 - .05, 1.15, L * .27, .1, .6, L * .42).box(-W / 2 + .05, 1.15, L * .27, .1, .6, L * .42).box(0, 1.15, L * .48, W, .6, .1).box(0, .9, L * .27, W, .1, L * .42);
      B.col(0x6a5a40, MAT.WOOD).box(0, 1.05, L * .3, .5, .35, .7); B.col(0x3a3a3a, MAT.RUBBER).cyl(.5, .95, L * .25, .3, .3, .25, 12);
    }
    B.col(0xaaaaaa, MAT.METAL).box(0, .62, -L * .5, W * 1.02, .2, .12).box(0, .62, L * .5, W * 1.02, .2, .12);
    B.col(0x111111, MAT.METAL); for (let i = 0; i < 5; i++) B.box(0, .85 + i * .07, -L * .5 + .02, W * .6, .03, .02);
    B.col(0xfff4d0, MAT.EMIT).box(W * .36, .95, -L * .5, .25, .14, .03).box(-W * .36, .95, -L * .5, .25, .14, .03);
    B.col(0xaa1010, MAT.EMIT).box(W * .43, .9, L * .5 + .01, .12, .16, .02).box(-W * .43, .9, L * .5 + .01, .12, .16, .02);
    B.col(0x111111, MAT.PLASTIC).box(W / 2 + .1, 1.65, -L * .2, .08, .14, .2).box(-W / 2 - .1, 1.65, -L * .2, .08, .14, .2);
    // interior: dashboard, seats
    B.col(0x1c1c1c, MAT.PLASTIC).box(0, 1.35, -L * .18, W * .92, .25, .3); B.col(0x30ff60, MAT.EMIT).box(-.4, 1.46, -L * .17 + .12, .2, .06, .01);
    B.col(0x3a3026, MAT.LEATHER).box(-.42, 1.05, -L * .03, .55, .3, .55).box(-.42, 1.4, L * .02, .55, .6, .12).box(.42, 1.05, -L * .03, .55, .3, .55).box(.42, 1.4, L * .02, .55, .6, .12);
    B.col(0x222222, MAT.PLASTIC).box(-.42, 1.25, -L * .18 + .25, .08, .08, .3); // steering column
    const wr = kind === 'truck' ? .55 : .42, wy = wr;
    buildWheel(B, VEHB.W0, wr, .3); buildWheel(B, VEHB.W1, wr, .3); buildWheel(B, VEHB.W2, wr, .3); buildWheel(B, VEHB.W3, wr, .3);
    B.b(VEHB.STEER).col(0x151515, MAT.RUBBER).torus(0, 0, 0, .19, .018, 18, 6); B.box(0, 0, 0, .36, .03, .03); B.box(0, -.08, 0, .03, .16, .03);
    carTrim(B, kind, L, W, pc, wr, true);
    return { mesh: B.mesh(), L, W, wr, wheelPos: [[W / 2 - .05, wy, -L * .32], [-W / 2 + .05, wy, -L * .32], [W / 2 - .05, wy, L * .3], [-W / 2 + .05, wy, L * .3]], seat: [-.42, 1.6, -L * .03], steer: [-.42, 1.4, -L * .18 + .4], h: 2.2 };
  }
  // sedan / suv
  const suv = kind === 'suv'; const L = suv ? 4.8 : 4.5, W = 1.85;
  B.col(pc, MAT.PAINT).box(0, .75, 0, W, .55, L).tbox(0, 1.3 + (suv ? .1 : 0), suv ? .2 : .15, W * .95, suv ? .7 : .55, suv ? L * .62 : L * .5, W * .85, suv ? L * .55 : L * .38);
  B.col(0x283338, MAT.GLASS).tbox(0, 1.31 + (suv ? .1 : 0), suv ? .2 : .15, W * .96, (suv ? .7 : .55) * .8, (suv ? L * .62 : L * .5) - .05, W * .86, (suv ? L * .55 : L * .38) - .1, 3);
  B.col(0xb0b0b0, MAT.METAL).box(0, .6, -L / 2, W, .18, .1).box(0, .6, L / 2, W, .18, .1);
  B.col(0xfff4d0, MAT.EMIT).box(W * .34, .85, -L / 2 - .01, .3, .1, .02).box(-W * .34, .85, -L / 2 - .01, .3, .1, .02);
  B.col(0xaa1010, MAT.EMIT).box(W * .38, .88, L / 2 + .01, .25, .1, .02).box(-W * .38, .88, L / 2 + .01, .25, .1, .02);
  B.col(0x1c1c1c, MAT.PLASTIC).box(0, 1.05, -L * .17, W * .9, .2, .3);
  B.col(0x3a3a3a, MAT.LEATHER).box(-.4, .8, 0, .5, .25, .5).box(-.4, 1.15, .25, .5, .55, .1).box(.4, .8, 0, .5, .25, .5).box(.4, 1.15, .25, .5, .55, .1);
  B.col(0x0d0d0d, MAT.PLASTIC).box(W / 2 + .06, 1.15, -L * .15, .07, .1, .15).box(-W / 2 - .06, 1.15, -L * .15, .07, .1, .15);
  const wr = suv ? .4 : .34;
  buildWheel(B, VEHB.W0, wr, .25); buildWheel(B, VEHB.W1, wr, .25); buildWheel(B, VEHB.W2, wr, .25); buildWheel(B, VEHB.W3, wr, .25);
  B.b(VEHB.STEER).col(0x151515, MAT.RUBBER).torus(0, 0, 0, .18, .016, 18, 6); B.box(0, 0, 0, .34, .025, .025); B.box(0, -.07, 0, .025, .14, .025);
  carTrim(B, kind, L, W, pc, wr, false);
  return { mesh: B.mesh(), L, W, wr, wheelPos: [[W / 2 - .1, wr, -L * .32], [-W / 2 + .1, wr, -L * .32], [W / 2 - .1, wr, L * .32], [-W / 2 + .1, wr, L * .32]], seat: [-.4, 1.3, .02], steer: [-.4, 1.12, -L * .17 + .38], h: 1.6 };
}
function buildBoat(kind) {
  const B = new MB(6000); B.b(0); const L = kind === 'rib' ? 5 : 7;
  if (kind === 'rib') {
    B.col(0x1f2326, MAT.RUBBER).push().t(.85, .35, 0).rx(Math.PI / 2).cyl(0, -L / 2, 0, .3, .3, L, 12).pop().push().t(-.85, .35, 0).rx(Math.PI / 2).cyl(0, -L / 2, 0, .3, .3, L, 12).pop();
    B.sph(0, .35, -L / 2, .85, .3, .3, 10, 5);
    B.col(0x2a2e30, MAT.PLASTIC).box(0, .12, 0, 1.6, .15, L);
    B.col(0x111111, MAT.METAL).box(0, .6, L / 2 + .1, .4, .7, .4); B.col(0x222222, MAT.METAL).box(0, .1, L / 2 + .2, .12, .6, .12);
    B.col(0x333333, MAT.PLASTIC).box(0, .4, .5, .6, .3, .5);
  } else {
    B.col(0xdedede, MAT.PAINT).tbox(0, .45, .3, 2.3, .9, L * .85, 2.4, L * .9); B.prism(0, 0, -L * .45, 2.3, .9, 1.2);
    B.col(0x1b3a6a, MAT.PAINT).box(0, .2, .3, 2.32, .2, L * .86);
    B.col(0x2a2a2a, MAT.PLASTIC).box(0, .95, .6, 2.1, .1, L * .7);
    B.col(0x2a3a40, MAT.GLASS).tbox(0, 1.35, -.3, 1.8, .6, .1, 1.7, .1);
    B.col(0xdedede, MAT.PAINT).box(0, 1.1, .3, .8, .5, .6); B.col(0x111111, MAT.RUBBER).torus(-.3, 1.4, .2, .15, .015, 14, 4);
    B.col(0x7a5a3a, MAT.LEATHER).box(0, 1.2, 1.6, 2, .4, .7);
    B.col(0x111111, MAT.METAL).box(0, .5, L / 2 + .05, .5, .8, .4);
  }
  B.b(1).col(0x888888, MAT.METAL).box(0, 0, 0, .5, .05, .08).box(0, 0, 0, .08, .05, .5);
  return { mesh: B.mesh(), L };
}
const PLB = { BODY: 0, RAMP: 1, DOOR: 2, P0: 3, P1: 4, P2: 5, P3: 6, BTN: 7 };
function buildCargoPlane() {
  const B = new MB(30000); B.b(PLB.BODY);
  const ext = 0x5a6150, R0 = 3.1, CY = 2.3, L = 26;
  B.col(ext, MAT.PAINT);
  const seg = 14;
  const p = (a, z, r, cy = CY) => [Math.cos(a) * r, Math.sin(a) * r * .85 + cy, z];
  for (let i = 0; i < seg; i++) {
    const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU;
    B.begin(); B.quad(p(a0, -L / 2, R0), p(a1, -L / 2, R0), p(a1, 9, R0), p(a0, 9, R0));
    B.quad(p(a0, -L / 2 - 4.5, R0 * .4, CY + .6), p(a1, -L / 2 - 4.5, R0 * .4, CY + .6), p(a1, -L / 2, R0), p(a0, -L / 2, R0));
    if (Math.sin(a0) > -.15 && Math.sin(a1) > -.15) B.quad(p(a0, 9, R0), p(a1, 9, R0), p(a1, 20, R0 * .3, CY + 2.4), p(a0, 20, R0 * .3, CY + 2.4));
  }
  // nose cap & cockpit glass
  B.col(ext, MAT.PAINT).sph(0, CY + .6, -L / 2 - 4.5, R0 * .4, R0 * .34, .8, 12, 6);
  B.col(0x1a2228, MAT.GLASS).box(0, CY + 1.7, -L / 2 - 3, 2.2, .6, 1.8);
  // wings, engines, tail
  B.col(ext, MAT.PAINT).box(0, 5.05, -2, 42, .35, 4.4);
  for (const x of [-13, -7, 7, 13]) { B.col(0x4a5040, MAT.PAINT).cylZ(x, 4.35, -3.6, .8, 4.6, 12); B.col(0x222222, MAT.METAL).cylZ(x, 4.35, -6, .5, .4, 10); }
  B.col(ext, MAT.PAINT).box(0, 8.6, 18.2, .4, 6, 3.6).box(0, 5.4, 18.6, 15, .3, 3.2);
  B.col(0x2a2e26, MAT.PAINT).box(3, .6, -3, 1.2, 1.3, 6).box(-3, .6, -3, 1.2, 1.3, 6);
  B.col(0x1a2228, MAT.GLASS); for (const s of [-1, 1]) for (let z = -10; z < 6; z += 2.4) B.box(s * 3.02, 3.0, z, .02, .32, .32);
  B.col(0x3a3e34, MAT.PAINT); for (let z = -12; z < 9; z += 1.5) B.torus(0, CY, z, R0 + .005, .015, 14, 3);
  B.col(0x111111, MAT.METAL).cyl(0, CY + R0 * .85, -6, .02, .01, 1.2, 4).cyl(.5, CY + R0 * .85, 2, .02, .01, .8, 4).box(0, CY + R0 * .85 + .1, -2, .1, .2, 1);
  B.col(0xffffff, MAT.PAINT).box(3.12, 3.6, -9, .01, .3, 1.5).box(-3.12, 3.6, -9, .01, .3, 1.5);
  for (const x of [-13, -7, 7, 13]) { B.col(0x1a1a1a, MAT.METAL).sph(x, 4.35, -6.45, .3, .3, .45, 10, 6); B.col(0x2a2a2a, MAT.METAL).cylZ(x, 4.05, -1.4, .12, .8, 8); }
  B.col(0x101010, MAT.PAINT).box(3.05, 3.3, -6, .02, .5, 3).box(-3.05, 3.3, -6, .02, .5, 3);
  // ---------------- interior (cargo bay) ----------------
  B.col(0x3e423a, MAT.METAL).box(0, .2, -1.5, 3.9, .4, 21);
  B.col(0x2a2c28, MAT.METAL); for (let z = -11.5; z < 9; z += .6) B.box(0, .41, z, 3.6, .02, .06);
  B.col(0x5a5e52, MAT.PAINT).box(-2.0, 2.2, -1.5, .08, 3.6, 21).box(2.0, 2.2, -1.5, .08, 3.6, 21).box(0, 4.0, -1.5, 4.0, .08, 21);
  B.col(0x4a4e44, MAT.METAL); for (let z = -11.5; z < 9; z += 1.5) { B.box(-1.93, 2.2, z, .1, 3.6, .1); B.box(1.93, 2.2, z, .1, 3.6, .1); B.box(0, 3.92, z, 3.9, .1, .1); }
  for (const s of [-1, 1]) {
    B.col(0x7a1515, MAT.CANVAS).box(s * 1.62, 1, -2, .5, .08, 17).box(s * 1.86, 1.6, -2, .04, 1.1, 17);
    B.col(0x5a0f0f, MAT.CANVAS); for (let z = -10.5; z < 6.5; z += .25) B.box(s * 1.84, 1.6, z, .05, 1.1, .015);
    for (let y = 1.1; y < 2.2; y += .2) B.box(s * 1.84, y, -2, .05, .015, 17);
    B.col(0x333333, MAT.METAL); for (let z = -10.5; z < 6.5; z += 1.2) B.box(s * 1.45, .7, z, .04, .6, .04);
  }
  for (const z of [-8, -4.5]) {
    B.col(0x5a4a32, MAT.WOOD).box(0, .5, z, 2.0, .15, 2.0); B.col(0x6a5a3a, MAT.WOOD).box(0, 1.2, z, 1.8, 1.3, 1.8);
    B.col(0x1a1a1a, MAT.CANVAS).box(0, 1.2, z, 1.84, 1.32, .06).box(0, 1.86, z, 1.84, .03, 1.84); B.col(0xc8a020, MAT.PAINT).box(0, 1.2, z - .91, .8, .3, .01);
  }
  B.col(0xff2a1a, MAT.EMIT); for (let z = -10; z <= 7; z += 3) B.box(0, 3.95, z, .4, .05, .2);
  B.col(0x222222, MAT.RUBBER); for (let z = -11.5; z < 7.5; z += 1.5) B.tube([-1.4, 3.85, z], [-1.4, 3.85, z + 1.5], .02);
  B.col(0x999999, MAT.METAL).tube([.9, 3.8, -11], [.9, 3.8, 8.5], .012).tube([-.9, 3.8, -11], [-.9, 3.8, 8.5], .012);
  B.col(0x4a4e44, MAT.METAL).box(0, 2.2, -12, 4, 3.6, .15); B.col(0x2a2c28, MAT.METAL).box(0, 1.5, -11.9, 1, 2, .05);
  // jump light panel
  B.col(0x222222, MAT.METAL).box(1.92, 2.4, 7.6, .1, .5, .35); B.col(0x30ff40, MAT.EMIT).box(1.86, 2.5, 7.52, .02, .1, .1); B.col(0x601010, MAT.PAINT).box(1.86, 2.32, 7.52, .02, .1, .1);
  // control panel with the RED BUTTON
  B.col(0x2a2c28, MAT.METAL).box(-1.85, 1.6, 7.6, .25, .7, .55); B.col(0xc8a020, MAT.PAINT).box(-1.72, 1.6, 7.6, .01, .66, .51); B.col(0x111111, MAT.PAINT).box(-1.71, 1.6, 7.6, .01, .56, .41);
  B.col(0x777777, MAT.METAL).cylX(-1.69, 1.55, 7.6, .09, .04, 16);
  B.b(PLB.BTN).col(0xd01010, MAT.PLASTIC).push().rz(-Math.PI / 2).cyl(0, 0, 0, .07, .065, .06, 16).pop();
  // ramp (bone) hinge at z=9
  B.b(PLB.RAMP).col(0x3e423a, MAT.METAL).box(0, -.1, 2.6, 3.9, .2, 5.2); B.col(0x2a2c28, MAT.METAL); for (let z = .3; z < 5; z += .4) B.box(0, .01, z, 3.6, .03, .06);
  B.col(ext, MAT.PAINT).box(0, -.3, 2.6, 4.6, .14, 5.4);
  B.col(0xc8a020, MAT.PAINT).box(-1.7, .02, 2.6, .12, .02, 5).box(1.7, .02, 2.6, .12, .02, 5);
  // upper tail door (bone)
  B.b(PLB.DOOR).col(ext, MAT.PAINT).box(0, 0, 2.4, 3.6, .15, 4.6);
  for (let i = 0; i < 4; i++) { B.b(PLB.P0 + i).col(0x161616, MAT.METAL); for (let k = 0; k < 4; k++) B.push().rz(k * Math.PI / 2).box(0, 1.2, 0, .22, 2.4, .05).pop(); B.cylZ(0, 0, 0, .28, .3, 10); }
  return B.mesh();
}
const HLB = { BODY: 0, ROTOR: 1, TAIL: 2, DOOR: 3 };
function buildHeli(color = 0x30362c) {
  const B = new MB(16000); B.b(HLB.BODY);
  B.col(color, MAT.PAINT).tbox(0, 1.6, 0, 2.2, 1.9, 6, 1.8, 5).sph(0, 1.5, -3.1, 1.1, .95, 1.3, 12, 7);
  B.col(0x1f2a30, MAT.GLASS).sph(0, 1.75, -3.35, .95, .7, 1.1, 12, 6);
  B.col(color, MAT.PAINT).tbox(0, 2.0, 5.5, .7, .7, 5, .3, 5).box(0, 3, 8, .15, 2, 1.1).box(0, 2.2, 7.4, 2.2, .1, .7);
  B.col(color, MAT.PAINT).box(0, 2.8, .2, 1.4, .5, 2.4); B.col(0x222222, MAT.METAL).cyl(0, 3, .0, .15, .15, .5, 8);
  B.col(0x222222, MAT.METAL).box(.9, .1, 0, .1, .1, 4.6).box(-.9, .1, 0, .1, .1, 4.6).beam([.9, .1, -1.3], [.7, .7, -1.3], .08).beam([-.9, .1, -1.3], [-.7, .7, -1.3], .08).beam([.9, .1, 1.3], [.7, .7, 1.3], .08).beam([-.9, .1, 1.3], [-.7, .7, 1.3], .08);
  // cabin interior
  B.col(0x2a2c28, MAT.METAL).box(0, .72, .3, 1.9, .06, 4); B.col(0x4a3a2a, MAT.CANVAS).box(0, 1.1, 1.7, 1.8, .35, .5).box(0, 1.5, 1.95, 1.8, .6, .08);
  B.col(0x151515, MAT.PLASTIC).box(0, 1.25, -2.3, 1.6, .4, .4); B.col(0x30ff60, MAT.EMIT).box(-.3, 1.35, -2.52, .3, .15, .01); B.col(0xffa020, MAT.EMIT).box(.3, 1.35, -2.52, .3, .15, .01);
  B.col(0xff2020, MAT.EMIT).box(0, .3, 6.8, .1, .1, .1).box(-1.12, 1.6, -1.5, .04, .08, .08); B.col(0x20ff40, MAT.EMIT).box(1.12, 1.6, -1.5, .04, .08, .08); B.col(0xffffff, MAT.EMIT).box(0, 3.3, 8.2, .06, .06, .06);
  B.col(0x1f2a30, MAT.GLASS); for (const s of [-1, 1]) for (let i = 0; i < 2; i++) B.box(s * 1.02, 1.95, .6 + i * 1.1, .03, .5, .7);
  B.col(0x222222, MAT.METAL).box(1.05, 2.4, .5, .05, .05, 3).box(1.05, .85, .5, .05, .05, 3).cylZ(.55, 2.95, 1.5, .18, .6, 10).cylZ(-.55, 2.95, 1.5, .18, .6, 10); B.col(0x111111, MAT.METAL).cylZ(.55, 2.95, 1.82, .14, .05, 10).cylZ(-.55, 2.95, 1.82, .14, .05, 10);
  B.col(0x111111, MAT.METAL).cyl(0, .5, -1.5, .01, .005, .4, 4).cyl(.3, 3.05, 2.3, .01, .005, .5, 4); B.col(lin(color).map(v => v * .6), MAT.PAINT).box(0, 1.15, 4.2, .72, .12, .4).box(0, 1.5, -1, 2.22, .06, 3);
  B.b(HLB.ROTOR).col(0x161616, MAT.METAL); for (let k = 0; k < 4; k++) B.push().ry(k * Math.PI / 2).box(0, 0, -3.9, .35, .06, 7.6).pop(); B.cyl(0, -.1, 0, .25, .2, .25, 10);
  B.b(HLB.TAIL).col(0x161616, MAT.METAL); for (let k = 0; k < 3; k++) B.push().rx(k * TAU / 3).box(0, .55, 0, .05, 1.1, .15).pop();
  B.b(HLB.DOOR).col(color, MAT.PAINT).box(0, 0, 0, .05, 1.3, 1.4);
  return B.mesh();
}
function buildParachute() {
  const B = new MB(8000); B.b(0);
  const cells = 9, span = 8.5, chord = 3;
  for (let i = 0; i < cells; i++) {
    const u0 = i / cells - .5, u1 = (i + 1) / cells - .5; const a0 = u0 * 1.6, a1 = u1 * 1.6;
    const p = (a, z, t) => [Math.sin(a) * span * .62, 6.3 + Math.cos(a) * 1.6 - 1.6 + t, z];
    const col = i % 2 ? 0x2a2e24 : 0x3a3f30; B.col(col, MAT.CANVAS);
    B.begin();
    B.quad(p(a0, -chord / 2, .25), p(a1, -chord / 2, .25), p(a1, chord / 2, .05), p(a0, chord / 2, .05));
    B.quad(p(a0, chord / 2, -.12), p(a1, chord / 2, -.12), p(a1, -chord / 2, -.12), p(a0, -chord / 2, -.12));
    B.quad(p(a0, -chord / 2, -.12), p(a1, -chord / 2, -.12), p(a1, -chord / 2, .25), p(a0, -chord / 2, .25));
    B.col(0x8a1010, MAT.CANVAS).quad(p(a0, chord / 2, .05), p(a1, chord / 2, .05), p(a1, chord / 2, -.12), p(a0, chord / 2, -.12));
  }
  B.col(0xbbbbbb, MAT.PAINT);
  for (let i = 0; i <= cells; i++) { const a = (i / cells - .5) * 1.6; for (const z of [-1.2, 0, 1.2]) B.beam([Math.sin(a) * span * .62, 4.6 + Math.cos(a) * 1.6 - 1.6, z], [Math.sign(Math.sin(a)) * .2, .9, z * .05], .008); }
  B.col(0x1a1a1a, MAT.CANVAS).box(.2, .9, 0, .06, .12, .06).box(-.2, .9, 0, .06, .12, .06);
  return B.mesh();
}
function buildSecurityCam() {
  const B = new MB(1000); B.b(0); B.col(0xd0d0cc, MAT.PLASTIC).box(0, 0, -.15, .14, .12, .32); B.col(0x111111, MAT.GLASS).cylZ(0, 0, -.32, .04, .03, 10); B.col(0xff1010, MAT.EMIT).box(.05, .045, -.3, .012, .012, .012);
  B.col(0xd0d0cc, MAT.PLASTIC).box(0, .06, -.15, .18, .02, .36); return B.mesh();
}
