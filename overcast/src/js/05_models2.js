/* =====================================================================
   OVERCAST — models: headless walker mech, strike jet, heavy transport
   with a real cabin and windows, jump gear, props, 3D block lettering.
   ===================================================================== */

/* ---------------- shared helpers ---------------- */
const dk = (h, k = .7) => lin(h).map(v => v * k);
// hazard stripes along a box face (x-y plane at z), alternating yellow / black
function hazard(B, x, y, z, w, h, n = 8) {
  for (let i = 0; i < n; i++) B.col(i % 2 ? 0x141414 : 0xc8a018, MAT.PAINT).push().t(x - w / 2 + (i + .5) * w / n, y, z).rz(.6).box(0, 0, 0, w / n * .82, h * 1.4, .01).pop();
}
// stencil text from the block font, flat on a surface (x right, y up)
function stencil(B, txt, x, y, z, px, col = 0xd8d4c8) {
  B.col(col, MAT.PAINT); let cx = x;
  for (const ch of txt) { const g = FONT[ch] || FONT[' ']; for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '#') B.box(cx + c * px, y - r * px, z, px * .92, px * .92, .006); cx += px * 6; }
}

/* ======================= HEADLESS WALKER MECH ======================= */
const MKB = { PELV: 0, BODY: 1, HATCH: 2, THL: 3, SHL: 4, FTL: 5, THR: 6, SHR: 7, FTR: 8, ARML: 9, ARMR: 10, LIGHTS: 11, N: 12 };
const MECH = { hipY: 4.35, hipX: 1.25, thigh: 2.05, shin: 2.15, ankleH: .45 };
function buildMech(paint = 0x5c6352, num = '07') {
  const B = new MB(60000); const p2 = dk(paint, .78), p3 = dk(paint, .6), gm = 0x2a2c2a, blk = 0x151617;
  // ---- pelvis ----
  B.b(MKB.PELV).col(gm, MAT.METAL).box(0, 0, 0, 2.1, .7, 1.3).cylX(0, 0, 0, .42, 2.9, 16);
  B.col(paint, MAT.PAINT).tbox(0, -.45, 0, 1.6, .4, 1.1, 1.9, 1.25);
  for (const s of [-1, 1]) { B.col(blk, MAT.METAL).cylX(s * 1.5, 0, 0, .55, .25, 18); B.col(0x3a3c3a, MAT.METAL).cylX(s * 1.66, 0, 0, .3, .08, 12); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; B.col(0x8a8a84, MAT.METAL).cylX(s * 1.64, Math.cos(a) * .42, Math.sin(a) * .42, .045, .06, 6); } }
  // ---- torso / cockpit hull (no head: the crew sits inside the armoured body) ----
  B.b(MKB.BODY);
  B.col(paint, MAT.PAINT).tbox(0, 1.25, .1, 3.3, 2.1, 2.9, 2.7, 2.3);
  B.col(p2, MAT.PAINT).push().t(0, 1.55, -1.32).rx(-.42).box(0, 0, 0, 2.5, 1.7, .22).pop();               // sloped glacis
  B.col(paint, MAT.PAINT).push().t(0, 2.2, -.95).rx(-.95).box(0, 0, 0, 2.3, .9, .2).pop();
  B.col(0x0d1114, MAT.GLASS).push().t(0, 1.95, -1.25).rx(-.5).box(0, 0, 0, 1.5, .16, .06).pop();         // vision slit
  B.col(0x404040, MAT.METAL).push().t(0, 1.95, -1.29).rx(-.5).box(0, .1, 0, 1.6, .03, .04).box(0, -.1, 0, 1.6, .03, .04).pop();
  B.col(p3, MAT.PAINT).box(0, .25, .15, 2.8, .3, 2.5);                                                  // belly
  for (const s of [-1, 1]) {
    B.col(p2, MAT.PAINT).push().t(s * 1.6, 1.3, 0).rz(s * .12).box(0, 0, 0, .25, 1.7, 2.4).pop();     // side skirts
    B.col(blk, MAT.METAL); for (let i = 0; i < 6; i++) B.box(s * 1.75, .85 + i * .16, .55, .04, .08, .9);  // louvres
    B.col(gm, MAT.METAL).cylX(s * 1.75, 1.85, -.1, .5, .4, 16);                                         // shoulder hub
  }
  // back: engine block, exhausts, antenna, ladder hand-holds to the hatch
  B.col(gm, MAT.METAL).box(0, 1.2, 1.45, 2.4, 1.5, .6); B.col(blk, MAT.METAL); for (let i = 0; i < 7; i++) B.box(0, .6 + i * .2, 1.76, 2.2, .06, .04);
  for (const s of [-1, 1]) { B.col(0x2a2622, MAT.RUST).cyl(s * .85, 1.6, 1.6, .16, .14, 1.6, 12); B.col(0x0a0a0a, MAT.METAL).cyl(s * .85, 3.18, 1.6, .12, .12, .04, 10); }
  B.col(0x222222, MAT.METAL).cyl(-1.1, 2.3, .9, .025, .01, 2.2, 5).cyl(1.15, 2.3, .95, .02, .01, 1.4, 5);
  B.col(0x777777, MAT.METAL); for (let i = 0; i < 5; i++) B.box(-1.55, .55 + i * .38, .95, .06, .05, .45);   // side rungs to the roof
  // roof + hatch ring
  B.col(p2, MAT.PAINT).box(0, 2.32, .25, 2.6, .12, 2.1); B.col(gm, MAT.METAL).cyl(0, 2.36, .55, .62, .62, .1, 20);
  B.col(0x0a0a0a, MAT.METAL).cyl(0, 2.37, .55, .5, .5, .1, 20);
  // stencils and hazard markings
  B.push().t(1.74, 1.95, -.05).rz(-.12).ry(Math.PI / 2); stencil(B, num, 0, 0, 0, .075); B.pop(); B.push().t(-1.74, 1.95, .55).rz(.12).ry(-Math.PI / 2); stencil(B, num, 0, 0, 0, .075); B.pop();
  hazard(B, 0, .48, -1.31, 2.6, .12, 14);
  B.col(0x9a2020, MAT.PAINT).box(1.2, 2.39, -.4, .5, .01, .5);
  // grime streaks
  B.col(dk(paint, .5), MAT.PAINT); for (let i = 0; i < 9; i++) B.box(-1.2 + i * .3, 1 + (i % 3) * .2, -1.47 + (i % 2) * .02, .05, .6 + (i % 4) * .2, .01);
  // ---- hatch (hinged at its rear edge) ----
  B.b(MKB.HATCH).col(paint, MAT.PAINT).cyl(0, 0, -.6, .6, .56, .14, 20); B.col(gm, MAT.METAL).box(0, .16, -.6, .5, .06, .1).cyl(0, .14, -.6, .2, .2, .05, 12); B.col(0x333333, MAT.METAL).box(0, -.02, 0, .5, .12, .14);
  // ---- legs ----
  const leg = (th, sh, ft, s) => {
    // thigh: from hip (0,0,0) down to knee (0,-L,0)
    const L = MECH.thigh;
    B.b(th).col(gm, MAT.METAL).box(0, -L / 2, 0, .7, L, .75);
    B.col(paint, MAT.PAINT).push().t(0, -L * .45, -.42).rx(.06).box(0, 0, 0, .9, L * .85, .16).pop().box(s * .44, -L * .5, 0, .14, L * .7, .9);
    B.col(0x8a8c88, MAT.METAL).tube([0, -.3, .45], [0, -L + .3, .5], .07, .07, 10); B.col(blk, MAT.METAL).tube([0, -.3, .45], [0, -L * .55, .48], .1, .1, 10);
    B.col(0x111111, MAT.RUBBER).tube([s * .3, -.2, .4], [s * .35, -L + .2, .3], .03, .03, 6);
    B.col(0x777777, MAT.METAL); for (let i = 0; i < 4; i++) B.box(s * .55, -.5 - i * .38, -.15, .06, .05, .4);   // rungs (outer side)
    // knee
    B.col(gm, MAT.METAL).cylX(0, -L, 0, .45, .95, 16); B.col(paint, MAT.PAINT).push().t(0, -L, -.4).sph(0, 0, 0, .45, .4, .25, 12, 6).pop();
    // shin: from knee down to ankle
    const S = MECH.shin;
    B.b(sh).col(gm, MAT.METAL).box(0, -S / 2, 0, .62, S, .66);
    B.col(paint, MAT.PAINT).push().t(0, -S * .45, -.38).rx(-.05).box(0, 0, 0, .82, S * .9, .18).pop();
    B.col(p2, MAT.PAINT).box(s * .4, -S * .45, .05, .12, S * .75, .8);
    B.col(0x8a8c88, MAT.METAL).tube([0, -.25, .4], [0, -S + .25, .36], .06, .06, 10);
    B.col(0x777777, MAT.METAL); for (let i = 0; i < 5; i++) B.box(s * .5, -.35 - i * .36, -.12, .06, .05, .4);
    hazard(B, 0, -S + .3, -.48, .78, .1, 6);
    B.col(gm, MAT.METAL).cylX(0, -S, 0, .32, .8, 14);
    // foot: three splayed toes + heel spur
    B.b(ft).col(gm, MAT.METAL).box(0, -.25, -.1, .8, .32, 1.2);
    B.col(paint, MAT.PAINT).tbox(0, -.05, -.2, .7, .2, .9, .5, .7);
    for (const a of [-.35, 0, .35]) B.push().t(0, -.32, -.6).ry(a).box(0, 0, -.45, .32, .2, .95).col(blk, MAT.METAL).box(0, -.06, -.95, .3, .1, .14).col(gm, MAT.METAL).pop();
    B.push().t(0, -.32, .5).box(0, 0, .3, .3, .2, .7).pop();
    B.col(0x1a1a1a, MAT.RUBBER).box(0, -.42, -.1, .82, .04, 1.25);
  };
  leg(MKB.THL, MKB.SHL, MKB.FTL, -1); leg(MKB.THR, MKB.SHR, MKB.FTR, 1);
  // ---- arms ----
  // right: autocannon
  B.b(MKB.ARMR).col(gm, MAT.METAL).box(0, -.55, 0, .6, 1.2, .7); B.col(paint, MAT.PAINT).box(.1, -.3, -.1, .7, .8, .9);
  B.col(gm, MAT.METAL).box(0, -1.35, -.4, .55, .55, 1.6); B.col(blk, MAT.METAL).cylZ(0, -1.35, -1.9, .13, 1.9, 12).cylZ(0, -1.35, -2.9, .18, .4, 12);
  B.col(0x0a0a0a, MAT.METAL).cylZ(0, -1.35, -3.11, .09, .02, 10); B.col(0x6a5a2a, MAT.METAL).box(.32, -1.25, -.2, .12, .4, .7); for (let i = 0; i < 8; i++) B.col(0xb08a40, MAT.METAL).box(.4, -1.4 + i * .04, -.1, .04, .03, .03);
  // left: missile box
  B.b(MKB.ARML).col(gm, MAT.METAL).box(0, -.55, 0, .6, 1.2, .7); B.col(paint, MAT.PAINT).box(-.1, -.3, -.1, .7, .8, .9);
  B.col(paint, MAT.PAINT).box(-.05, -1.35, -.3, .95, .95, 1.4); B.col(0x0a0a0a, MAT.METAL);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) B.cylZ(-.33 + c * .28, -1.07 - r * .28, -1.0, .1, .04, 10);
  B.col(0xc02020, MAT.PAINT); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) B.cylZ(-.33 + c * .28, -1.07 - r * .28, -.99, .055, .02, 8);
  // ---- lights (shown when the reactor is up) ----
  B.b(MKB.LIGHTS).col(0xfff2d0, MAT.EMIT).box(.95, 1.0, -1.42, .22, .12, .05).box(-.95, 1.0, -1.42, .22, .12, .05);
  B.col(0xff2a10, MAT.EMIT).box(0, 2.45, .9, .1, .1, .1); B.col(0x30ff60, MAT.EMIT).box(1.42, 2.1, .3, .04, .06, .06);
  B.col(0xff8a20, MAT.EMIT).push().t(0, 1.95, -1.27).rx(-.5).box(0, 0, 0, 1.3, .05, .02).pop();
  return B.mesh();
}
/* walker pose → bone matrices. pose: {pos, yaw, crouch, step:{phase,amp}, hatch(0..1), twist, armR, armL, lights} */
function poseMech(bones, pose) {
  const M = MKB, out = []; for (let i = 0; i < M.N; i++) out.push(M4.create());
  const root = M4.create(); M4.translate(root, root, pose.pos[0], pose.pos[1], pose.pos[2]); M4.rotY(root, root, pose.yaw);
  const ph = pose.phase || 0, amp = pose.amp || 0, cr = pose.crouch || 0;
  const bob = Math.abs(Math.sin(ph)) * .18 * amp;
  const hipY = MECH.hipY - cr * .9 - bob + (pose.sway ? Math.sin(pose.time * 1.3) * .02 : 0);
  M4.translate(out[M.PELV], root, 0, hipY, 0); M4.rotZ(out[M.PELV], out[M.PELV], Math.sin(ph) * .05 * amp);
  M4.translate(out[M.BODY], out[M.PELV], 0, .35, 0); M4.rotY(out[M.BODY], out[M.BODY], pose.twist || 0); M4.rotX(out[M.BODY], out[M.BODY], (pose.lean || 0) + Math.sin(pose.time * .9) * .006);
  // legs: analytic 2-bone IK to foot targets (in pelvis space)
  for (const side of [-1, 1]) {
    const th = side < 0 ? M.THL : M.THR, sh = side < 0 ? M.SHL : M.SHR, ft = side < 0 ? M.FTL : M.FTR;
    const sp = ph + (side < 0 ? 0 : Math.PI); const swing = Math.sin(sp) * amp, lift = Math.max(0, Math.cos(sp)) * amp;
    const fz = -swing * 1.3, fy = -hipY + MECH.ankleH + lift * .7, fx = side * (MECH.hipX + .05);
    const hipW = M4.pt(out[M.PELV], side * MECH.hipX, 0, 0); const footW = M4.pt(out[M.PELV], fx, fy, fz);
    const fwd = M4.dir(root, 0, 0, -1); const r = ik2(hipW, footW, MECH.thigh, MECH.shin, V.add(hipW, V.sc(fwd, 3)));
    const sideAx = M4.dir(root, 1, 0, 0);
    segMatX(out[th], hipW, r.E, sideAx); segMatX(out[sh], r.E, r.T, sideAx);
    M4.translate(out[ft], root, 0, 0, 0); const fm = M4.create(); M4.translate(fm, M4.create(), r.T[0], r.T[1], r.T[2]); M4.rotY(fm, fm, pose.yaw); M4.rotX(fm, fm, -Math.cos(sp) * .25 * amp); M4.copy(out[ft], fm);
  }
  for (const side of [-1, 1]) {
    const a = side < 0 ? M.ARML : M.ARMR; M4.translate(out[a], out[M.BODY], side * 1.95, 1.85, -.1);
    M4.rotX(out[a], out[a], (side < 0 ? pose.armL : pose.armR) || 0); M4.rotX(out[a], out[a], -Math.sin(ph + (side < 0 ? Math.PI : 0)) * .08 * amp);
  }
  M4.translate(out[M.HATCH], out[M.BODY], 0, 2.38, 1.15); M4.rotX(out[M.HATCH], out[M.HATCH], (pose.hatch || 0) * 1.9);
  if (pose.lights) M4.copy(out[M.LIGHTS], out[M.BODY]); else M4.copy(out[M.LIGHTS], ZERO_M);
  for (let i = 0; i < M.N; i++) bones.set(out[i], i * 16);
  return out;
}

/* ======================= STRIKE JET ======================= */
const JTB = { BODY: 0, CANOPY: 1, FLAME: 2, GEAR: 3 };
function buildJet(paint = 0x6a6f72) {
  const B = new MB(30000); B.b(JTB.BODY); const p2 = dk(paint, .8);
  // lofted fuselage (nose at -z)
  const S = [[-8.6, .02, .02, 1.2], [-8.0, .28, .26, 1.25], [-7, .5, .48, 1.32], [-5.6, .66, .66, 1.42], [-4, .78, .8, 1.5], [-2, 1.15, .78, 1.45], [0, 1.45, .74, 1.4], [2.5, 1.5, .7, 1.38], [4.5, 1.35, .66, 1.38], [6.3, 1.15, .6, 1.38], [7.2, 1.1, .58, 1.38]];
  const ring = (w, h, y, a) => [Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), .7) * w, y + Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), .85) * h];
  B.col(paint, MAT.PAINT);
  for (let i = 0; i < S.length - 1; i++) { const A = S[i], C = S[i + 1]; const n = 18; B.begin(); for (let k = 0; k < n; k++) { const a0 = k / n * TAU, a1 = (k + 1) / n * TAU; const p = (s, a) => { const r = ring(s[1], s[2], s[3], a); return [r[0], r[1], s[0]]; }; B.quad(p(A, a0), p(A, a1), p(C, a1), p(C, a0)); } }
  B.col(0x2a2c2e, MAT.PAINT).sph(0, 1.2, -8.55, .05, .05, .1, 6, 4);
  // intakes
  for (const s of [-1, 1]) { B.col(p2, MAT.PAINT).box(s * 1.35, 1.2, -2.2, .55, .9, 3.4); B.col(0x070707, MAT.METAL).box(s * 1.35, 1.2, -3.92, .45, .78, .04); B.col(paint, MAT.PAINT).push().t(s * 1.05, 1.62, -2.5).rz(s * -.3).box(0, 0, 0, .7, .08, 3).pop(); }
  // wings (thin wedges)
  const wing = s => { B.col(paint, MAT.PAINT); B.begin(); const r0 = [s * 1.3, 1.25, -2.8], r1 = [s * 1.3, 1.25, 3.6], t0 = [s * 6.4, 1.15, 2.2], t1 = [s * 6.4, 1.15, 3.3]; const u = [0, .09, 0];
    B.quad(V.add(r0, u), V.add(r1, u), V.add(t1, u), V.add(t0, u)); B.quad(V.sub(r0, u), V.sub(t0, u), V.sub(t1, u), V.sub(r1, u)); B.quad(V.add(r0, u), V.add(t0, u), V.sub(t0, u), V.sub(r0, u)); B.quad(V.add(t1, u), V.add(r1, u), V.sub(r1, u), V.sub(t1, u));
    B.col(0x3a3e40, MAT.PAINT).beam([s * 6.4, 1.1, 2.2], [s * 6.4, 1.1, 3.4], .12, .12); B.col(0xff2020, MAT.EMIT).box(s * 6.47, 1.15, 2.4, .02, .06, .1); };
  wing(-1); wing(1);
  // twin canted tails + stabilators
  for (const s of [-1, 1]) { B.col(paint, MAT.PAINT).push().t(s * .95, 1.85, 5.2).rz(s * -.42); B.begin(); B.quad([0, 0, -1.2], [0, 0, 1.9], [0, 2.6, 2.4], [0, 2.6, 1.3]); B.quad([.06, 0, -1.2], [.06, 2.6, 1.3], [.06, 2.6, 2.4], [.06, 0, 1.9]); B.pop();
    B.push().t(s * 1.5, 1.15, 6.3); B.begin(); B.quad([0, 0, -.8], [s * 2.6, 0, .9], [s * 2.6, 0, 1.6], [0, 0, 1.1]); B.quad([0, .05, -.8], [0, .05, 1.1], [s * 2.6, .05, 1.6], [s * 2.6, .05, .9]); B.pop(); }
  // nozzles
  for (const s of [-1, 1]) { B.col(0x3a3632, MAT.METAL).cylZ(s * .55, 1.1, 7.55, .5, .9, 16); B.col(0x1a1612, MAT.RUST).cylZ(s * .55, 1.1, 8.05, .46, .2, 16); B.col(0x050505, MAT.METAL).cylZ(s * .55, 1.1, 8.1, .36, .06, 14); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; B.col(0x2a2622, MAT.METAL).box(s * .55 + Math.cos(a) * .47, 1.1 + Math.sin(a) * .47, 7.95, .1, .1, .5); } }
  // cockpit frame + seat
  B.col(0x151515, MAT.PLASTIC).box(0, 1.55, -5.1, .7, .3, 2.2); B.col(0x2a2a2a, MAT.LEATHER).box(0, 1.85, -4.4, .5, .7, .2);
  B.col(0x30ff60, MAT.EMIT).box(0, 1.78, -5.9, .4, .1, .02);
  // markings
  B.col(0x2a2e30, MAT.PAINT).box(0, 1.97, -1, .02, .02, 6); stencil(B, 'AF', -1.0, 1.5, -6.05, .045, 0x3a3e40);
  for (const s of [-1, 1]) { B.push().t(s * 4.2, 1.26, 2.6).rx(-Math.PI / 2); B.col(0x3a3e40, MAT.PAINT).cyl(0, 0, 0, .35, .35, .01, 14); B.col(paint, MAT.PAINT).cyl(0, .005, 0, .25, .25, .01, 14); B.pop(); }
  // pylons + stores
  for (const s of [-1, 1]) for (const x of [2.8, 4.6]) { B.col(0x3a3e40, MAT.PAINT).box(s * x, .95, 2.5, .08, .3, 1.2); B.col(0x8a8c80, MAT.PAINT).cylZ(s * x, .7, 2.3, .13, 3.0, 10); B.col(0x8a2020, MAT.PAINT).cylZ(s * x, .7, .9, .135, .2, 10); }
  // canopy (glass, separately hinged)
  B.b(JTB.CANOPY).col(0x1a2a30, MAT.GLASS).sph(0, .1, .9, .55, .5, 1.6, 14, 7); B.col(0x222222, MAT.METAL).torus(0, .1, .9, .55, .03, 14, 3);
  // afterburner flames (scaled with throttle)
  B.b(JTB.FLAME); for (const s of [-1, 1]) { B.col(0xffb050, MAT.EMIT).push().t(s * .55, 0, 0).rx(Math.PI / 2).cyl(0, 0, 0, .34, .05, 2.8, 12, 0).pop(); B.col(0x6080ff, MAT.EMIT).push().t(s * .55, 0, 0).rx(Math.PI / 2).cyl(0, 0, 0, .22, .02, 1.2, 10, 0).pop(); for (let i = 0; i < 4; i++) B.col(0xffe0a0, MAT.EMIT).torus(s * .55, 0, .35 + i * .5, .26 - i * .04, .03, 12, 3); }
  // landing gear
  B.b(JTB.GEAR).col(0x9a9a94, MAT.METAL).cyl(0, 0, -6, .07, .07, 1.0, 8).cyl(-1.6, 0, 1.5, .09, .09, 1.0, 8).cyl(1.6, 0, 1.5, .09, .09, 1.0, 8);
  B.col(0x111111, MAT.RUBBER).cylX(0, .02, -6, .3, .2, 14).cylX(-1.7, .05, 1.5, .4, .28, 14).cylX(1.7, .05, 1.5, .4, .28, 14);
  return B.mesh();
}

/* ======================= HEAVY TRANSPORT (cabin, windows, seats) ======================= */
const TPB = { BODY: 0, RAMP: 1, DOOR: 2, BTN: 3, F0: 4, F1: 5, F2: 6, F3: 7, RED: 8, GREEN: 9, N: 10 };
const TP = { cy: 3.85, a: 3.15, b: 2.95, floor: 1.45, z0: -19, z1: 13.2, rampL: 6.4, winY: 3.05, winH: .34, winW: .34 };
TP.seats = (() => { // cabin side-wall seats in plane space
  const s = []; for (const side of [-1, 1]) for (let z = -11.4; z <= 9.6; z += .72) s.push({ pos: [side * 2.32, TP.floor, z], yaw: side < 0 ? -Math.PI / 2 : Math.PI / 2, side });
  return s;
})();
TP.windows = (() => { const w = []; for (const side of [-1, 1]) for (let z = -10.8; z <= 9; z += 2.16) w.push({ side, z }); return w; })();
function buildTransport() {
  const B = new MB(1 << 17), G2 = new MB(4000); const paint = 0x6c726c, inner = 0x58604f, quilt = 0x6a705c;
  const n = 3; const se = (a, sa, sb) => [Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 2 / n) * sa, TP.cy + Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), 2 / n) * sb];
  const NA = 40; const angs = []; for (let i = 0; i < NA; i++) angs.push(i / NA * TAU);
  // one angular cell per side carries the windows (the cell whose middle sits closest to seated eye height)
  const winCell = {}; for (const side of [-1, 1]) { let best = -1, bd = 1e9; for (let i = 0; i < NA; i++) { const p = se((i + .5) / NA * TAU, TP.a, TP.b); if (Math.sign(p[0]) !== side) continue; const d = Math.abs(p[1] - 3.1); if (d < bd) { bd = d; best = i; } } winCell[side] = best; }
  { const p = se((winCell[1] + .5) / NA * TAU, TP.a, TP.b); TP.winY = p[1]; TP.winX = Math.abs(p[0]); }
  const zs = []; for (let z = TP.z0; z <= TP.z1 + .01; z += 1.08) zs.push(+z.toFixed(3)); for (const w of TP.windows) zs.push(w.z - TP.winW / 2, w.z + TP.winW / 2); zs.sort((a, b) => a - b);
  const winAt = (ai, z0, z1) => TP.windows.find(w => winCell[w.side] === ai && z0 >= w.z - TP.winW / 2 - 1e-3 && z1 <= w.z + TP.winW / 2 + 1e-3);
  const P3 = (a, z, inset) => { const p = se(a, TP.a - inset, TP.b - inset); return [p[0], p[1], z]; };
  for (let zi = 0; zi < zs.length - 1; zi++) {
    const z0 = zs[zi], z1 = zs[zi + 1]; if (z1 - z0 < .001) continue;
    for (let ai = 0; ai < NA; ai++) {
      const a0 = angs[ai], a1 = ai + 1 < NA ? angs[ai + 1] : TAU; const am = (a0 + a1) / 2; const yMid = se(am, TP.a, TP.b)[1];
      if (yMid < TP.floor - .25) { B.col(paint, MAT.PAINT); B.begin(); B.quad(P3(a0, z0, 0), P3(a1, z0, 0), P3(a1, z1, 0), P3(a0, z1, 0)); continue; }
      if (winAt(ai, z0, z1)) { // window: reveal between the skins, glass pane, rubber frame inside
        B.col(0x2a2c28, MAT.METAL); B.begin(); B.quad(P3(a0, z0, 0), P3(a0, z0, .16), P3(a1, z0, .16), P3(a1, z0, 0)); B.quad(P3(a1, z1, 0), P3(a1, z1, .16), P3(a0, z1, .16), P3(a0, z1, 0));
        B.quad(P3(a0, z0, 0), P3(a0, z1, 0), P3(a0, z1, .16), P3(a0, z0, .16)); B.quad(P3(a1, z1, 0), P3(a1, z0, 0), P3(a1, z0, .16), P3(a1, z1, .16));
        G2.col(0xa8c0c8, MAT.GLASS); G2.begin(); G2.quad(P3(a0, z0, .05), P3(a1, z0, .05), P3(a1, z1, .05), P3(a0, z1, .05));
        B.col(0x1e201c, MAT.RUBBER); const c = [P3(a0, z0, .17), P3(a1, z0, .17), P3(a1, z1, .17), P3(a0, z1, .17)]; for (let k = 0; k < 4; k++) B.beam(c[k], c[(k + 1) % 4], .05, .03);
        continue;
      }
      B.col(paint, MAT.PAINT); B.begin(); B.quad(P3(a0, z0, 0), P3(a1, z0, 0), P3(a1, z1, 0), P3(a0, z1, 0));
      B.col((zi + ai) % 2 ? quilt : dk(quilt, .9), MAT.CANVAS); B.begin(); B.quad(P3(a0, z0, .16), P3(a0, z1, .16), P3(a1, z1, .16), P3(a1, z0, .16));
    }
  }
  // ribs + stringers inside
  B.col(0x4e5446, MAT.METAL); for (let z = TP.z0 + .5; z < TP.z1; z += 1.08) for (let i = 0; i < NA; i++) { const a0 = i / NA * TAU, a1 = (i + 1) / NA * TAU; if (se((a0 + a1) / 2, TP.a, TP.b)[1] < TP.floor) continue; B.beam(P3(a0, z, .17), P3(a1, z, .17), .08, .06); }
  // cabin floor with roller tracks and tie-down rings
  B.col(0x3c403a, MAT.METAL).box(0, TP.floor - .08, (TP.z0 + TP.z1) / 2, 5.0, .16, TP.z1 - TP.z0);
  B.col(0x2a2c28, MAT.METAL); for (const x of [-.9, .9]) { B.box(x, TP.floor + .01, (TP.z0 + TP.z1) / 2, .22, .04, TP.z1 - TP.z0); for (let z = TP.z0 + .4; z < TP.z1; z += .4) B.col(0x777770, MAT.METAL).cylX(x, TP.floor + .04, z, .035, .16, 8); }
  B.col(0x888880, MAT.METAL); for (let z = TP.z0 + 1; z < TP.z1; z += 1.5) for (const x of [-1.8, 0, 1.8]) B.torus(x, TP.floor + .01, z, .05, .012, 8, 3);
  B.col(0xc8a020, MAT.PAINT).box(-1.55, TP.floor + .005, -3, .06, .01, 30).box(1.55, TP.floor + .005, -3, .06, .01, 30);
  // side-wall troop seats: aluminium frame, red webbing seat + backrest
  for (const s of TP.seats) {
    const x = s.pos[0], z = s.pos[2], sd = s.side;
    B.col(0x8a8c88, MAT.METAL).tube([x + sd * .12, TP.floor, z - .28], [x + sd * .12, TP.floor + .45, z - .28], .015, .015, 6).tube([x + sd * .12, TP.floor, z + .28], [x + sd * .12, TP.floor + .45, z + .28], .015, .015, 6);
    B.tube([x - sd * .2, TP.floor + .45, z - .33], [x - sd * .2, TP.floor + .45, z + .33], .016, .016, 6).tube([x + sd * .28, TP.floor + .45, z - .33], [x + sd * .28, TP.floor + .45, z + .33], .016, .016, 6);
    B.col(0x7a1a14, MAT.CANVAS).box(x + sd * .04, TP.floor + .46, z, .48, .03, .62);
    B.col(0x6a1410, MAT.CANVAS); for (let k = 0; k < 5; k++) B.box(x + sd * .04, TP.floor + .48, z - .24 + k * .12, .46, .01, .02);
    B.col(0x7a1a14, MAT.CANVAS).box(x + sd * .3, TP.floor + .95, z, .03, .75, .62); B.col(0x8a8c88, MAT.METAL).tube([x + sd * .3, TP.floor + 1.34, z - .33], [x + sd * .3, TP.floor + 1.34, z + .33], .016, .016, 6);
    B.col(0x1a1a1a, MAT.CANVAS).box(x + sd * .26, TP.floor + .85, z - .18, .02, .6, .04).box(x + sd * .26, TP.floor + .85, z + .18, .02, .6, .04); // harness straps
  }
  // overhead: static-line cables, pipes, cable trays, lights
  B.col(0xa0a098, MAT.METAL).tube([-1.0, TP.floor + 2.2, TP.z0 + 1], [-1.0, TP.floor + 2.2, TP.z1], .018, .018, 6).tube([1.0, TP.floor + 2.2, TP.z0 + 1], [1.0, TP.floor + 2.2, TP.z1], .018, .018, 6);
  B.col(0x777770, MAT.METAL); for (let z = TP.z0 + 2; z < TP.z1; z += 3) for (const x of [-1, 1]) B.tube([x, 6.3, z], [x, TP.floor + 2.2, z], .012, .012, 4);
  B.col(0x30342c, MAT.METAL).box(0, 6.5, -3, .6, .12, 30); B.col(0x8a6a2a, MAT.METAL).tube([-2.0, 5.9, TP.z0 + 1], [-2.0, 5.9, TP.z1], .05, .05, 8); B.col(0x3a5a6a, MAT.METAL).tube([2.05, 5.85, TP.z0 + 1], [2.05, 5.85, TP.z1], .04, .04, 8);
  B.col(0x1a1a1a, MAT.RUBBER); for (let z = TP.z0 + 1; z < TP.z1; z += .9) B.tube([-2.0, 5.95, z], [-1.98, 5.75, z + .45], .02, .02, 5);
  B.col(0xff3220, MAT.EMIT); for (let z = -11; z <= 10; z += 3) { B.box(-1.6, 6.32, z, .5, .04, .14).box(1.6, 6.32, z, .5, .04, .14); }
  B.col(0x2a2c28, MAT.METAL); for (let z = -11; z <= 10; z += 3) { B.box(-1.6, 6.36, z, .6, .05, .2).box(1.6, 6.36, z, .6, .05, .2); }
  // loudspeakers
  for (const z of [-8, 2]) B.col(0x1a1a1a, MAT.PLASTIC).box(0, 6.35, z, .35, .25, .35).col(0x0a0a0a, MAT.METAL).cyl(0, 6.2, z, .12, .12, .02, 12);
  // forward bulkhead with cockpit ladder + door, cargo pallet
  B.col(0x4e5446, MAT.METAL).box(0, 3.9, TP.z0 + .05, 5.8, 5, .14); B.col(0x30342c, MAT.METAL).box(0, 2.6, TP.z0 + .14, 1.1, 2.3, .06); B.col(0x8a8c88, MAT.METAL).box(.4, 2.6, TP.z0 + .2, .05, .2, .06);
  B.col(0xc8c8c0, MAT.PAINT).box(0, 4.3, TP.z0 + .14, 1.4, .3, .02); stencil(B, 'NO STEP', -.55, 4.38, TP.z0 + .16, .022, 0x8a1010);
  B.col(0x5a4a32, MAT.WOOD).box(0, TP.floor + .1, -15.5, 2.4, .2, 3); B.col(0x4a5038, MAT.CANVAS).box(-.55, TP.floor + .75, -15.5, 1.0, 1.1, 2.6).box(.6, TP.floor + .6, -15.8, 1.0, .8, 2.0);
  B.col(0x1a1a1a, MAT.CANVAS); for (const z of [-16.6, -15.5, -14.4]) B.box(0, TP.floor + .8, z, 2.3, 1.4, .05);
  // ramp control panel (left of the ramp) + jump lights (right)
  const pz = TP.z1 - .55;
  B.col(0x2a2c28, MAT.METAL).box(-2.45, 2.75, pz, .3, .8, .55); B.col(0xc8a020, MAT.PAINT).box(-2.3, 2.75, pz, .01, .76, .51); B.col(0x111111, MAT.PAINT).box(-2.29, 2.75, pz, .01, .64, .41);
  B.col(0x777777, MAT.METAL).cylX(-2.27, 2.68, pz, .1, .04, 16); stencil(B, 'RAMP', -2.28, 3.1, pz + .2, .012, 0xd8d4c8);
  B.col(0x222222, MAT.METAL).box(2.42, 3.4, pz, .12, .7, .4); B.col(0x401010, MAT.PAINT).box(2.35, 3.55, pz, .02, .2, .2); B.col(0x104010, MAT.PAINT).box(2.35, 3.25, pz, .02, .2, .2);
  B.b(TPB.RED).col(0xff2010, MAT.EMIT).box(2.345, 3.55, pz, .02, .18, .18); B.b(TPB.GREEN).col(0x20ff30, MAT.EMIT).box(2.345, 3.25, pz, .02, .18, .18);
  B.b(TPB.BTN).col(0xd01010, MAT.PLASTIC).push().rz(-Math.PI / 2).cyl(0, 0, 0, .075, .07, .06, 16).pop();
  B.b(TPB.BODY);
  // tail section (above the ramp opening): upper half of the hull sweeping up
  B.col(paint, MAT.PAINT); const tz = [TP.z1, 16, 19, 22, 24.5]; const ty = [0, .9, 2.1, 3.0, 3.8], ts = [1, .92, .78, .6, .4];
  for (let i = 0; i < tz.length - 1; i++) for (let k = 0; k < NA; k++) {
    const a0 = k / NA * TAU, a1 = (k + 1) / NA * TAU; const yA = se((a0 + a1) / 2, 1, 1)[1] - TP.cy; if (yA < -.15) continue;
    const q = (a, j) => { const p = se(a, TP.a * ts[j], TP.b * ts[j]); return [p[0], p[1] + ty[j] * (1 - (p[1] - TP.cy + TP.b) / (2 * TP.b)) * .9, tz[j]]; };
    B.begin(); B.quad(q(a0, i), q(a1, i), q(a1, i + 1), q(a0, i + 1)); B.col(inner, MAT.CANVAS); B.begin(); B.quad(q(a0, i), q(a0, i + 1), q(a1, i + 1), q(a1, i)); B.col(paint, MAT.PAINT);
  }
  // nose + cockpit
  B.col(paint, MAT.PAINT); for (let k = 0; k < NA; k++) { const a0 = k / NA * TAU, a1 = (k + 1) / NA * TAU; const nz = [TP.z0, -21.5, -23.5, -25]; const nsc = [1, .9, .66, .25]; const ny = [0, .25, .55, .6];
    for (let j = 0; j < 3; j++) { const q = (a, jj) => { const p = se(a, TP.a * nsc[jj], TP.b * nsc[jj]); return [p[0], TP.cy + (p[1] - TP.cy) + ny[jj], nz[jj]]; }; B.begin(); B.quad(q(a0, j), q(a1, j), q(a1, j + 1), q(a0, j + 1)); } }
  B.col(0x30342e, MAT.PAINT).sph(0, TP.cy + .6, -25, .8, .7, .5, 12, 6);
  for (const s of [-1, 1]) { G2.col(0x1a2a30, MAT.GLASS).push().t(s * .9, TP.cy + 1.7, -22.6).ry(s * .35).rx(-.45).box(0, 0, 0, 1.2, .55, .04).pop(); }
  G2.push().t(0, TP.cy + 1.95, -22.9).rx(-.6).box(0, 0, 0, .9, .5, .04).pop();
  // high wing, engines, T-tail, gear sponsons
  B.col(paint, MAT.PAINT).box(0, TP.cy + TP.b + .25, -4, 6, .6, 7);
  for (const s of [-1, 1]) {
    B.push().t(s * 3, TP.cy + TP.b + .3, -4).ry(s * -.32); B.begin();
    const r0 = [0, 0, -3.2], r1 = [0, 0, 3.4], t0 = [s * 25, -.9, 1.5], t1 = [s * 25, -.9, 3.6]; const u = [0, .28, 0], ut = [0, .1, 0];
    B.quad(V.add(r0, u), V.add(t0, ut), V.add(t1, ut), V.add(r1, u)); B.quad(V.sub(r0, u), V.sub(r1, u), V.sub(t1, ut), V.sub(t0, ut)); B.quad(V.add(r0, u), V.sub(r0, u), V.sub(t0, ut), V.add(t0, ut)); B.quad(V.add(t1, ut), V.sub(t1, ut), V.sub(r1, u), V.add(r1, u));
    B.col(0x3a3e3a, MAT.PAINT).beam([s * 4, -.05, 3.2], [s * 24, -.85, 3.7], .5, .06); B.col(s < 0 ? 0xff2020 : 0x20ff30, MAT.EMIT).box(s * 25.05, -.88, 2.4, .06, .08, .2); B.col(paint, MAT.PAINT);
    B.pop();
    B.col(dk(paint, .85), MAT.PAINT).box(s * 2.95, 1.25, -1, 1.2, 1.6, 9);           // gear sponson
    B.col(0x111111, MAT.RUBBER); for (const z of [-3, 1]) for (const dx of [-.25, .25]) B.cylX(s * 2.7 + dx, .55, z, .55, .35, 16);
  }
  B.col(0x111111, MAT.RUBBER).cylX(0, .5, -21, .45, .3, 14).cylX(0, .5, -21, .45, .3, 14); B.col(0x9a9a94, MAT.METAL).cyl(0, .5, -21, .1, .1, 1.3, 8);
  B.col(paint, MAT.PAINT).push().t(0, TP.cy + 3.2, 21.5).box(0, 2.6, 0, .5, 6.5, 4).pop().box(0, TP.cy + 9.2, 23, 16, .4, 3.4);
  // engine nacelles (fans are separate bones)
  const engX = [-8.5, -15, 8.5, 15];
  for (let i = 0; i < 4; i++) { const x = engX[i]; const wy = TP.cy + TP.b + .3 - Math.abs(x) / 25 * .9 - 1.3; const wz = -4 + Math.abs(x) * .33 - 4.2;
    B.col(paint, MAT.PAINT).cylZ(x, wy, wz, 1.05, 5.2, 18); B.col(0x1a1a1a, MAT.METAL).cylZ(x, wy, wz - 2.55, .95, .1, 18); B.col(0x3a3632, MAT.METAL).cylZ(x, wy, wz + 2.9, .7, .8, 16); B.col(0x0a0a0a, MAT.METAL).cylZ(x, wy, wz + 3.3, .5, .05, 14);
    B.col(paint, MAT.PAINT).box(x, wy + 1.15, wz + .8, .3, .9, 3); TP['eng' + i] = [x, wy, wz - 2.45];
  }
  // fans
  for (let i = 0; i < 4; i++) { B.b(TPB.F0 + i).col(0x2a2a2a, MAT.METAL); for (let k = 0; k < 14; k++) B.push().rz(k / 14 * TAU).rx(.35).box(0, .5, 0, .16, .82, .03).pop(); B.col(0x888888, MAT.METAL).sph(0, 0, -.05, .28, .28, .4, 10, 6); B.col(0xeeeeee, MAT.PAINT).box(0, .05, -.42, .12, .02, .01); }
  // markings
  B.b(TPB.BODY); for (const s of [-1, 1]) { B.push().t(s * (TP.a + .02), TP.cy + 1.2, -14).ry(s * Math.PI / 2); stencil(B, 'RAVEN 21', 0, 0, 0, .09, 0x2a2e2a); B.pop(); }
  // ---- ramp (hinged at floor rear edge; local +z runs aft) ----
  B.b(TPB.RAMP).col(0x3c403a, MAT.METAL).box(0, -.1, TP.rampL / 2, 4.9, .2, TP.rampL); B.col(0x2a2c28, MAT.METAL); for (let z = .3; z < TP.rampL; z += .35) B.box(0, .01, z, 4.4, .03, .07);
  B.col(paint, MAT.PAINT).box(0, -.32, TP.rampL / 2, 5.6, .18, TP.rampL + .1); B.col(0xc8a020, MAT.PAINT).box(-2.1, .02, TP.rampL / 2, .14, .02, TP.rampL - .2).box(2.1, .02, TP.rampL / 2, .14, .02, TP.rampL - .2);
  B.col(0x4e5446, MAT.METAL).box(-2.45, .5, TP.rampL / 2, .1, 1, TP.rampL).box(2.45, .5, TP.rampL / 2, .1, 1, TP.rampL);
  // ---- upper door (hinged at the top of the opening; rotates up into the tail) ----
  B.b(TPB.DOOR).col(paint, MAT.PAINT).box(0, 0, 2.7, 4.8, .16, 5.4); B.col(inner, MAT.CANVAS).box(0, -.1, 2.7, 4.6, .04, 5.2);
  return { mesh: B.mesh(), glass: G2.mesh() };
}
/* bone matrices for the transport: o = {m (plane world matrix), ramp 0..1 (1=down), door 0..1 (1=open), fan, btn, red, green} */
function poseTransport(bones, o) {
  const m = o.m; const t = M4.create();
  bones.set(m, TPB.BODY * 16);
  M4.translate(t, m, 0, TP.floor, TP.z1); M4.rotX(t, t, lerp(1.25, -.2, o.ramp)); bones.set(t, TPB.RAMP * 16);
  M4.translate(t, m, 0, 6.35, TP.z1 + .2); M4.rotX(t, t, lerp(-.42, .55, o.door)); bones.set(t, TPB.DOOR * 16);
  M4.translate(t, m, -2.21 - (o.btn || 0) * .03, 2.68, TP.z1 - .55); bones.set(t, TPB.BTN * 16);
  for (let i = 0; i < 4; i++) { const e = TP['eng' + i]; M4.translate(t, m, e[0], e[1], e[2]); M4.rotZ(t, t, o.fan * (i % 2 ? 1.03 : 1)); bones.set(t, (TPB.F0 + i) * 16); }
  bones.set(o.red ? m : ZERO_M, TPB.RED * 16); bones.set(o.green ? m : ZERO_M, TPB.GREEN * 16);
}

/* ======================= SOLDIER JUMP GEAR (bound to the rig) ======================= */
function buildJumpGear(o = {}) {
  const B = new MB(6000);
  B.b(SK.CH);
  // main canopy container + reserve on the belly
  B.col(0x3a3f30, MAT.CANVAS).box(0, .2, .2, .38, .52, .2).col(0x2c3026, MAT.CANVAS).box(0, .44, .2, .36, .06, .18).box(0, .2, .31, .32, .44, .03);
  B.col(0x8a1010, MAT.CANVAS).box(.12, .46, .3, .04, .03, .02);
  B.col(0x1a1c18, MAT.CANVAS); for (const s of [-1, 1]) { B.tube([s * .12, .5, .12], [s * .14, .5, -.1], .02, .02, 5).tube([s * .14, .5, -.1], [s * .12, -.05, -.14], .022, .022, 5); }
  B.box(0, .05, -.13, .3, .04, .03); B.col(0x888880, MAT.METAL).box(0, .05, -.15, .06, .05, .02);
  if (o.reserve !== false) { B.b(SK.PEL).col(0x3a3f30, MAT.CANVAS).box(0, .02, -.2, .3, .18, .12); B.col(0xc0c0b8, MAT.METAL).box(.1, .05, -.27, .04, .02, .02); }
  B.b(SK.PEL).col(0x1a1c18, MAT.CANVAS); for (const s of [-1, 1]) B.tube([s * .13, .02, -.12], [s * .16, -.12, .05], .022, .022, 5);
  // goggles on the helmet
  if (o.goggles) { B.b(SK.HD).col(0x111111, MAT.RUBBER).box(0, .2, -.1, .2, .05, .04); B.col(0x6a8a9a, MAT.GLASS).box(-.05, .2, -.122, .08, .04, .01).box(.05, .2, -.122, .08, .04, .01); }
  // altimeter on the left wrist
  B.b(SK.FAL).col(0x111111, MAT.PLASTIC).cyl(0, -.2, -.045, .03, .03, .02, 12);
  return B.mesh();
}

/* ======================= HAND PROPS ======================= */
// kid's juice box (attach at the hand): body + printed panels + bent straw
function buildJuiceBox() {
  const B = new MB(1500); B.b(0);
  B.col(0xf2c018, MAT.PAINT).box(0, .035, 0, .044, .07, .028);
  B.col(0xe8401a, MAT.PAINT).box(0, .06, -.0145, .044, .018, .001).box(0, .06, .0145, .044, .018, .001);
  B.col(0xd02020, MAT.PAINT).cyl(.0, .03, -.0148, .011, .011, .001, 12); B.col(0x30a030, MAT.PAINT).box(.002, .044, -.0149, .004, .006, .001);
  B.col(0x2a7ae0, MAT.PAINT).box(0, .012, -.0146, .04, .006, .001); B.col(0xffffff, MAT.PAINT); for (let i = 0; i < 4; i++) B.box(-.012 + i * .008, .02, -.0149, .004, .004, .0008);
  B.col(0xd8d0b0, MAT.PAINT).box(0, .0705, 0, .046, .002, .03);
  B.col(0xf0a0c0, MAT.PLASTIC).tube([.012, .07, .004], [.012, .1, .004], .0022, .0022, 6).tube([.012, .1, .004], [.004, .112, .004], .0022, .0022, 6);
  return B.mesh();
}
// revolver: frame (bone 0) + cylinder (bone 1, spins / swings out)
function buildRevolver() {
  const B = new MB(3000); B.b(0);
  B.col(0x2a2a2c, MAT.METAL).box(0, .03, -.05, .03, .05, .09).cylZ(0, .045, -.17, .011, .18, 10).box(0, .057, -.17, .008, .006, .18).box(0, .062, -.255, .004, .01, .01);
  B.col(0x4a2e1a, MAT.WOOD).push().t(0, -.01, .01).rx(-.35).box(0, -.04, 0, .028, .09, .04).pop();
  B.col(0x1a1a1a, MAT.METAL).box(0, .0, -.03, .006, .03, .03).box(0, .072, .0, .008, .015, .02);
  B.b(1).col(0x3a3a3c, MAT.METAL).cylZ(0, 0, 0, .021, .045, 14); B.col(0x0a0a0a, MAT.METAL); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; B.cylZ(Math.cos(a) * .012, Math.sin(a) * .012, -.023, .004, .002, 6); }
  B.col(0xb08a40, MAT.METAL); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; B.cylZ(Math.cos(a) * .012, Math.sin(a) * .012, .023, .0045, .002, 6); }
  return B.mesh();
}
// bolt-action sniper rifle (held / resting across the lap)
function buildSniper() {
  const B = new MB(5000); B.b(0); const od = 0x4a4e3c;
  B.col(od, MAT.PAINT).box(0, 0, 0, .05, .07, .55).box(0, -.02, .4, .045, .12, .3); B.col(0x111111, MAT.RUBBER).box(0, -.02, .56, .047, .13, .02);
  B.col(0x1a1a1a, MAT.METAL).cylZ(0, .03, -.6, .011, .75, 10).cylZ(0, .03, -1.0, .018, .08, 10); B.col(0x222222, MAT.METAL).box(0, .03, -.05, .03, .03, .25);
  B.col(0x151515, MAT.METAL).cylZ(0, .085, -.05, .019, .34, 12).cylZ(0, .085, -.24, .026, .07, 12).cylZ(0, .085, .12, .022, .06, 12).box(0, .06, -.05, .02, .03, .18);
  B.col(0x284858, MAT.GLASS).cylZ(0, .085, -.276, .024, .002, 12);
  B.col(0x1a1a1a, MAT.METAL).tube([.006, .0, -.42], [.03, -.17, -.5], .006, .006, 5).tube([-.006, .0, -.42], [-.03, -.17, -.5], .006, .006, 5);
  B.col(0x333333, MAT.METAL).push().t(.03, .035, .03).rz(-.6).box(.03, 0, 0, .05, .01, .01).pop();
  return B.mesh();
}
function buildMirrorQuad(w, h) { const B = new MB(64); B.col(0xffffff, MAT.MIRROR); B.vplane(0, 0, 0, w, h); return B.mesh(); }

/* ======================= 3D BLOCK LETTERING ======================= */
const FONT = {
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'], B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'], D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'], F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.####'], H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'], J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'], L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'], N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'], R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'], T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'], X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'], Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'], 1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'], 3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'], 5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'], 7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'], 9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'], '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'], "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
};
/* text laid out in the x/y plane (reading +x, up +y), centred; px = cube size, depth = extrusion. Each "pixel" is a bevelled cube. */
function buildText(B, txt, px, depth, col, mat = MAT.EMIT, o = {}) {
  const w = txt.length * 6 * px - px; let cx = -w / 2; const rng = mulberry(txt.length * 77 + 3);
  const cy = 3.5 * px;
  for (const ch of txt) {
    const g = FONT[ch] || FONT[' '];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
      if (g[r][c] !== '#') continue;
      const x = cx + c * px, y = cy - r * px; const j = o.jitter ? (rng() - .5) * o.jitter * px : 0;
      B.col(col, mat).box(x, y, j, px * .9, px * .9, depth);
      if (o.edge) B.col(o.edge, MAT.EMIT).box(x, y, j - depth / 2 - px * .02, px * .94, px * .94, px * .03);
    }
    cx += px * 6;
  }
  return w;
}
