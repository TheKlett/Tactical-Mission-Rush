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
function buildHand(B, bone, left, glove, skin, open = false) {
  const sx = left ? -1 : 1; B.b(bone);
  B.col(glove, glove === skin ? MAT.SKIN : MAT.LEATHER);
  B.box(0, -.05, 0, .034, .095, .085);                // palm
  B.box(-sx * .004, -.01, 0, .04, .03, .075);         // wrist cuff
  if (glove !== skin) { B.col(0x1a1a1a, MAT.RUBBER); B.box(sx * .019, -.075, 0, .006, .028, .07); } // knuckle guard
  B.col(glove, glove === skin ? MAT.SKIN : MAT.LEATHER);
  // fingers (curled toward palm side)
  const curl = open ? .35 : 1.25;
  for (let i = 0; i < 4; i++) {
    const z = -.03 + i * .02; const ln = [.04, .045, .042, .034][i];
    B.push().t(0, -.098, z).rz(-sx * curl * .55);
    B.box(0, -ln / 2, 0, .019, ln, .017);
    B.push().t(0, -ln, 0).rz(-sx * curl * .9); B.box(0, -.016, 0, .017, .034, .016); B.pop();
    B.pop();
  }
  // thumb
  B.push().t(-sx * .012, -.03, -.045).rx(-.5).rz(-sx * (open ? .3 : .9));
  B.box(0, -.022, 0, .02, .045, .02); B.t(0, -.045, 0).rz(-sx * .4).box(0, -.015, 0, .018, .03, .018);
  B.pop();
}
const FACTIONS = {
  cartel: { shirts: [0x6b5b45, 0x3b4a3a, 0x7a2e2a, 0x2f3b4c, 0x8c8478, 0x4a4a42, 0x5e6b52], pants: [0x2c2a26, 0x3d3a30, 0x24303a, 0x4a4235], heads: ['cap', 'bald', 'hair', 'bandana', 'hair', 'cap', 'beanie'], vest: .45, camo: .2 },
  pmc: { shirts: [0x1d2024, 0x23272b, 0x2b2e30], pants: [0x1b1e21, 0x25282a], heads: ['helmet', 'helmet', 'cap', 'helmet'], vest: 1, camo: 0, vestCol: 0x2a2d2f },
  militia: { shirts: [0xb8bcc0, 0x9ea4a8, 0x6d7378], pants: [0x8f969b, 0x5b6166, 0xa9aeb2], heads: ['beanie', 'hood', 'beanie', 'helmet', 'balaclava'], vest: .7, camo: .8, vestCol: 0x6f7468 },
};
function appearanceFor(faction, rng, overrides = {}) {
  const F = FACTIONS[faction];
  const skins = [0xe0b896, 0xc89670, 0xa87452, 0x8a5a3c, 0x6b4430, 0xf0c8a8];
  const a = {
    skin: skins[(rng() * skins.length) | 0], shirt: F.shirts[(rng() * F.shirts.length) | 0], pants: F.pants[(rng() * F.pants.length) | 0],
    boots: rng() < .5 ? 0x2a2018 : 0x1c1c1c, head: F.heads[(rng() * F.heads.length) | 0], hair: [0x1a1410, 0x3a2a1c, 0x5a4530, 0x111111][(rng() * 4) | 0],
    vest: rng() < F.vest, vestCol: F.vestCol || [0x3f3c30, 0x2a2e22, 0x4d4636][(rng() * 3) | 0], beard: rng() < .35, glasses: rng() < .15, camo: rng() < F.camo,
    gloves: rng() < .5, bulk: .92 + rng() * .2, rolled: rng() < .3, backpack: rng() < .15, faction,
  };
  return Object.assign(a, overrides);
}
function buildCharacter(app) {
  const B = new MB(16000); const bk = app.bulk || 1;
  const shirtMat = app.camo ? MAT.CAMO : MAT.CLOTH;
  const skin = app.skin, shirt = app.shirt, pants = app.pants;
  // ---- pelvis ----
  B.b(SK.PEL).col(pants, app.camo ? MAT.CAMO : MAT.CLOTH);
  B.tbox(0, -.02, 0, .33 * bk, .2, .21 * bk, .31 * bk, .2 * bk);
  B.col(0x1c1a17, MAT.LEATHER).box(0, .07, 0, .35 * bk, .045, .225 * bk);
  B.col(0x777066, MAT.METAL).box(0, .07, -.115 * bk, .045, .03, .01);
  if (!app.suit) { B.col(0x2a2a26, MAT.CLOTH).box(.16 * bk, .03, .02, .05, .07, .09); B.box(-.16 * bk, .03, .03, .05, .06, .07); } // belt pouches
  // ---- chest ----
  B.b(SK.CH).col(app.suit ? app.suit : shirt, app.suit ? MAT.CLOTH : shirtMat);
  B.tbox(0, .2, 0, .31 * bk, .4, .2 * bk, .41 * bk, .23 * bk);
  B.sph(-.18 * bk, .37, 0, .075 * bk, .07, .085 * bk, 8, 5); B.sph(.18 * bk, .37, 0, .075 * bk, .07, .085 * bk, 8, 5);
  B.col(skin, MAT.SKIN).cyl(0, .38, 0, .055, .05, .12, 8);
  if (app.suit) { // commander: suit jacket, shirt, tie, gold chain
    B.col(0xe8e4dc, MAT.CLOTH).tbox(0, .33, -.105 * bk, .1, .16, .02, .05, .02);
    B.col(0x5a0f12, MAT.CLOTH).tbox(0, .31, -.118 * bk, .035, .15, .01, .02, .01);
    B.col(app.suit, MAT.CLOTH).push().t(-.07, .3, -.12 * bk).rz(-.35).box(0, 0, 0, .04, .2, .02).pop().push().t(.07, .3, -.12 * bk).rz(.35).box(0, 0, 0, .04, .2, .02).pop();
    B.col(0xd4af37, MAT.METAL).torus(0, .38, -.02, .075, .006, 16, 4);
  }
  if (app.vest) {
    const vc = app.vestCol; B.col(vc, MAT.CANVAS);
    B.tbox(0, .23, 0, .35 * bk, .32, .26 * bk, .39 * bk, .27 * bk);
    B.col(vc, MAT.CANVAS); for (let i = -1; i <= 1; i++) { B.box(i * .085, .14, -.145 * bk, .07, .1, .04); B.col(0x111111, MAT.PLASTIC).box(i * .085, .19, -.165 * bk, .06, .012, .012); B.col(vc, MAT.CANVAS); }
    B.box(-.14 * bk, .3, -.14 * bk, .05, .08, .03); B.col(0x161616, MAT.PLASTIC).box(-.14 * bk, .33, -.16 * bk, .035, .07, .02); // radio
    B.col(0x0d0d0d, MAT.RUBBER).cyl(-.14 * bk, .37, -.16 * bk, .004, .004, .07, 4);
    B.col(vc, MAT.CANVAS).box(-.13 * bk, .38, 0, .06, .05, .27 * bk); B.box(.13 * bk, .38, 0, .06, .05, .27 * bk); // shoulder straps
  } else if (!app.suit) {
    B.col(shirt, shirtMat).box(0, .38, -.05, .2, .03, .14); // collar
    B.col(lin(shirt).map(v => v * .7), MAT.CLOTH).box(-.09, .3, -.112 * bk, .07, .06, .01); // breast pocket
  }
  if (app.backpack) { B.col(0x3a3b30, MAT.CANVAS).box(0, .22, .17 * bk, .28, .34, .14); B.col(0x2a2a24, MAT.CANVAS).box(0, .12, .25 * bk, .22, .12, .05); }
  // ---- head ----
  B.b(SK.HD).col(skin, MAT.SKIN);
  B.cyl(0, -.02, .005, .052, .05, .08, 8);
  B.sph(0, .135, 0, .093, .118, .105, 12, 8);
  B.tbox(0, .055, -.035, .12, .07, .11, .1, .1); // jaw
  B.tbox(0, .12, -.103, .022, .045, .03, .014, .02); // nose
  B.box(0, .095, -.096, .02, .012, .02);
  B.box(-.094, .13, .005, .014, .045, .03); B.box(.094, .13, .005, .014, .045, .03); // ears
  B.col(0xf2eee6, MAT.GLASS).box(-.036, .155, -.092, .024, .012, .01); B.box(.036, .155, -.092, .024, .012, .01);
  B.col(0x15110d, MAT.GLASS).box(-.036, .155, -.097, .011, .011, .006); B.box(.036, .155, -.097, .011, .011, .006);
  B.col(app.hair, MAT.HAIR).box(-.036, .175, -.096, .034, .009, .012); B.box(.036, .175, -.096, .034, .009, .012);
  B.col(lin(skin).map(v => v * .6), MAT.SKIN).box(0, .075, -.097, .04, .008, .01); // mouth
  if (app.beard) { B.col(app.hair, MAT.HAIR); B.tbox(0, .07, -.05, .135, .08, .11, .12, .11); B.box(0, .09, -.1, .06, .02, .02); }
  if (app.glasses) { B.col(0x0a0a0a, MAT.GLASS).box(0, .155, -.103, .15, .03, .01); B.col(0x111111, MAT.PLASTIC).box(-.08, .16, -.05, .01, .01, .1); B.box(.08, .16, -.05, .01, .01, .1); }
  const hd = app.head;
  if (hd === 'hair' || hd === 'cap' || hd === 'bandana') { B.col(app.hair, MAT.HAIR).sph(0, .165, .01, .098, .095, .108, 10, 6); }
  if (hd === 'cap') { B.col(app.capCol || [0x2b2b2b, 0x4a3b28, 0x1f2a3a, 0x6a1d1d][(app.skin >> 3) % 4], MAT.CLOTH).sph(0, .19, .005, .102, .07, .11, 10, 5); B.box(0, .19, -.135, .17, .012, .09); }
  if (hd === 'beanie' || hd === 'hood') { B.col(hd === 'hood' ? app.shirt : [0x2b2b2b, 0x5a5f63, 0x3b2f2a][(app.skin >> 4) % 3], MAT.CLOTH).sph(0, .18, .005, .104, .09, .112, 10, 6); B.cyl(0, .13, .005, .107, .105, .05, 10); if (hd === 'hood') B.tbox(0, .07, .06, .21, .2, .12, .2, .12); }
  if (hd === 'helmet') {
    B.col(app.helmetCol || 0x2e3229, MAT.PAINT).sph(0, .17, .01, .118, .1, .128, 12, 6); B.cyl(0, .135, .01, .12, .12, .03, 12);
    B.col(0x151515, MAT.RUBBER).box(0, .2, -.12, .05, .04, .02); // NVG mount
    B.col(0x222222, MAT.CLOTH).box(-.1, .09, 0, .012, .08, .02); B.box(.1, .09, 0, .012, .08, .02);
  }
  if (hd === 'bandana') { B.col(0x7a1515, MAT.CLOTH).sph(0, .175, .01, .1, .085, .11, 10, 5); }
  if (hd === 'balaclava') { B.col(0x1c1c1c, MAT.CLOTH).sph(0, .135, 0, .098, .124, .11, 12, 8); B.col(skin, MAT.SKIN).box(0, .155, -.1, .1, .03, .01); }
  if (hd === 'bald' || hd === 'hair') { /* nothing extra */ }
  // ---- arms ----
  const sleeveCol = app.suit ? app.suit : shirt, sleeveMat = app.suit ? MAT.CLOTH : shirtMat;
  for (const L of [1, 0]) {
    const ua = L ? SK.UAL : SK.UAR, fa = L ? SK.FAL : SK.FAR, h = L ? SK.HL : SK.HR;
    B.b(ua).col(sleeveCol, sleeveMat).cyl(0, -.29, 0, .046 * bk, .058 * bk, .3, 8).sph(0, 0, 0, .06 * bk, .06, .06 * bk, 8, 5);
    B.b(fa);
    if (app.rolled && !app.suit) { B.col(skin, MAT.SKIN).cyl(0, -.25, 0, .033, .044, .2, 8); B.col(sleeveCol, sleeveMat).cyl(0, -.07, 0, .05, .05, .07, 8); }
    else { B.col(sleeveCol, sleeveMat).cyl(0, -.24, 0, .037, .047 * bk, .25, 8); B.col(skin, MAT.SKIN).cyl(0, -.27, 0, .03, .034, .04, 6); }
    if (L && app.suit) { B.col(0xd4af37, MAT.METAL).cyl(0, -.25, 0, .036, .036, .015, 8); }
    buildHand(B, h, !!L, app.gloves ? 0x1c1c1c : skin, skin);
  }
  // ---- legs ----
  for (const L of [1, 0]) {
    const th = L ? SK.THL : SK.THR, sh = L ? SK.SHL : SK.SHR, ft = L ? SK.FTL : SK.FTR; const sx = L ? -1 : 1;
    B.b(th).col(pants, app.camo ? MAT.CAMO : MAT.CLOTH).cyl(0, -.46, 0, .058, .088 * bk, .47, 9);
    if (!app.suit) { B.box(sx * .075 * bk, -.25, 0, .03, .12, .1); B.col(0x1d1d1d, MAT.PLASTIC).box(sx * .09 * bk, -.2, 0, .005, .01, .09); }
    B.b(sh).col(pants, app.camo ? MAT.CAMO : MAT.CLOTH).cyl(0, -.3, 0, .047, .058, .32, 8);
    if (app.vest) { B.col(0x202020, MAT.RUBBER).box(0, -.02, -.055, .09, .1, .03); }
    B.col(app.boots, MAT.LEATHER).cyl(0, -.42, 0, .05, .053, .14, 8);
    B.b(ft).col(app.boots, MAT.LEATHER).tbox(0, -.025, -.055, .1, .08, .25, .09, .2);
    B.col(0x111111, MAT.RUBBER).box(0, -.06, -.06, .105, .025, .27);
    B.col(0x0f0f0f, MAT.CLOTH).box(0, .005, -.1, .04, .01, .08);
  }
  // ---- held prop (bone 16) ----
  B.b(SK.PROP);
  if (app.prop === 'cig') { B.col(0xeeeeee, MAT.PAINT).cylZ(0, 0, 0, .004, .07, 5); B.col(0xff5a1a, MAT.EMIT).cylZ(0, 0, -.036, .0045, .006, 5); }
  if (app.prop === 'cup') { B.col(0x8a2a1a, MAT.PLASTIC).cyl(0, -.04, 0, .03, .035, .09, 10); }
  if (app.prop === 'phone') { B.col(0x111111, MAT.PLASTIC).box(0, 0, 0, .07, .14, .01); B.col(0x6fa0d0, MAT.EMIT).box(0, 0, -.006, .06, .12, .002); }
  if (app.prop === 'clipboard') { B.col(0x7a5a3a, MAT.WOOD).box(0, 0, 0, .22, .3, .01); B.col(0xeeeeee, MAT.PAINT).box(0, -.01, -.006, .2, .25, .002); }
  // ---- weapon (bone 15) ----
  B.b(SK.WPN); if (app.weapon) buildNpcWeapon(B, app.weapon);
  return B.mesh();
}
function buildNpcWeapon(B, w) {
  if (w === 'ak') {
    B.col(0x1d1d1d, MAT.METAL).box(0, .03, -.12, .045, .07, .32); // receiver
    B.col(0x6a3a1c, MAT.WOOD).box(0, .025, -.36, .055, .06, .2); // handguard
    B.col(0x222222, MAT.METAL).cylZ(0, .04, -.6, .011, .34, 6).box(0, .085, -.62, .01, .04, .012);
    B.col(0x6a3a1c, MAT.WOOD).tbox(0, .0, .25, .045, .09, .26, .04, .2); B.box(0, -.06, .04, .04, .1, .04);
    B.col(0x2a1a10, MAT.METAL).push().t(0, -.06, -.17).rx(.35).box(0, -.06, 0, .035, .16, .07).pop();
  } else if (w === 'shotgun') {
    B.col(0x1a1a1a, MAT.METAL).box(0, .03, -.1, .05, .07, .26).cylZ(0, .05, -.5, .014, .55, 8).cylZ(0, .02, -.45, .012, .45, 8);
    B.col(0x4a2e18, MAT.WOOD).box(0, .02, -.42, .06, .06, .16).tbox(0, -.01, .25, .045, .1, .28, .04, .22);
  } else if (w === 'smg') {
    B.col(0x1b1b1b, MAT.METAL).box(0, .03, -.08, .045, .08, .28).cylZ(0, .05, -.3, .016, .14, 8).box(0, -.08, -.1, .03, .16, .04).box(0, .0, .14, .03, .05, .2).box(0, -.05, .04, .035, .09, .04);
  } else if (w === 'pistol') {
    B.col(0x1b1b1b, MAT.METAL).box(0, .03, -.06, .03, .035, .19).box(0, -.03, .0, .028, .1, .04);
  } else { // modern rifle (pmc / militia)
    B.col(0x1e1f20, MAT.METAL).box(0, .035, -.08, .05, .07, .3).box(0, .03, -.36, .055, .06, .26);
    B.cylZ(0, .045, -.6, .012, .25, 6).box(0, .085, -.1, .04, .03, .1);
    B.col(0x2a2c2d, MAT.PLASTIC).box(0, .02, .22, .045, .08, .22).box(0, -.06, .03, .035, .1, .045);
    B.push().t(0, -.05, -.17).rx(.15).box(0, -.07, 0, .032, .15, .07).pop();
    if (w === 'rifleL') { B.col(0x111111, MAT.PLASTIC).box(.035, .04, -.4, .02, .03, .06); }
  }
}

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
    const M = this.mats;
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
        segMat(M[ua], S, r.E, sideAx); segMat(M[fa], r.E, r.T, sideAx);
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
// pose helpers: write joint angles into array
function P_() { return new Float32Array(45); }
function pj(a, b, x, y, z) { a[b * 3] = x; a[b * 3 + 1] = y; a[b * 3 + 2] = z; }
function poseWalk(a, ph, amp, run, carry) {
  const s = Math.sin(ph), c = Math.cos(ph);
  const legA = amp * (run ? .75 : .45);
  pj(a, SK.THL, s * legA - (run ? .15 : 0), 0, -.02); pj(a, SK.THR, -s * legA - (run ? .15 : 0), 0, .02);
  pj(a, SK.SHL, -Math.max(0, -c) * (run ? 1.4 : .7) * amp - .05, 0, 0); pj(a, SK.SHR, -Math.max(0, c) * (run ? 1.4 : .7) * amp - .05, 0, 0);
  pj(a, SK.FTL, Math.max(0, s) * .3 * amp, 0, 0); pj(a, SK.FTR, Math.max(0, -s) * .3 * amp, 0, 0);
  pj(a, SK.PEL, 0, s * .08 * amp, 0); pj(a, SK.CH, run ? -.22 : -.04, -s * .1 * amp, 0);
  if (!carry) {
    pj(a, SK.UAL, -s * (run ? .7 : .35) * amp, 0, -.1); pj(a, SK.UAR, s * (run ? .7 : .35) * amp, 0, .1);
    pj(a, SK.FAL, (run ? 1.3 : .3) + Math.max(0, -s) * .3 * amp, 0, 0); pj(a, SK.FAR, (run ? 1.3 : .3) + Math.max(0, s) * .3 * amp, 0, 0);
  }
  pj(a, SK.HD, run ? .12 : .02, s * .05, 0);
  return Math.abs(Math.cos(ph * 2)) * (run ? .06 : .03) * amp; // pelvis bob
}
function poseIdle(a, t, kind, k) {
  const br = Math.sin(t * 1.6) * .02;
  pj(a, SK.THL, 0, .05, -.04); pj(a, SK.THR, 0, -.05, .04); pj(a, SK.SHL, -.02, 0, 0); pj(a, SK.SHR, -.02, 0, 0);
  pj(a, SK.CH, br, 0, 0); pj(a, SK.HD, -br, Math.sin(t * .3 + k) * .25, 0);
  pj(a, SK.UAL, .05, 0, -.12); pj(a, SK.UAR, .05, 0, .12); pj(a, SK.FAL, .25, 0, 0); pj(a, SK.FAR, .25, 0, 0);
  if (kind === 'talk') {
    const g = Math.sin(t * 2.3 + k) * .5 + .5, g2 = Math.sin(t * 1.7 + k * 2) * .5 + .5;
    pj(a, SK.UAR, .5 + g * .4, -.3, .25); pj(a, SK.FAR, 1.2 + g2 * .6, 0, 0);
    pj(a, SK.UAL, .2 + g2 * .3, .2, -.2); pj(a, SK.FAL, .9 + g * .5, 0, 0);
    pj(a, SK.HD, Math.sin(t * 3.1 + k) * .08, Math.sin(t * .8 + k) * .15, Math.sin(t * 1.3) * .05); pj(a, SK.CH, br, Math.sin(t * .9 + k) * .1, 0);
  } else if (kind === 'listen') {
    pj(a, SK.UAL, .35, .5, -.35); pj(a, SK.FAL, 1.9, 0, 0); pj(a, SK.UAR, .35, -.5, .35); pj(a, SK.FAR, 1.9, 0, 0);
    pj(a, SK.HD, Math.sin(t * 2.1 + k) > .7 ? -.12 : 0, 0, .05);
  } else if (kind === 'smoke') {
    const cyc = (t * .18 + k) % 1; const up = bump(cyc, .05, .35);
    pj(a, SK.UAL, .25 + up * .35, .1, -.1 + up * .35); pj(a, SK.FAL, .8 + up * 1.55, 0, 0);
    pj(a, SK.UAR, .1, 0, .1); pj(a, SK.FAR, .2, 0, 0); pj(a, SK.HD, -.05 + up * .1, 0, 0);
  } else if (kind === 'radio') {
    pj(a, SK.UAL, .35, -.2, -.95); pj(a, SK.FAL, 2.3, 0, 0); pj(a, SK.HD, .05, .2, -.08);
  } else if (kind === 'work') {
    pj(a, SK.CH, -.3, 0, 0); pj(a, SK.HD, -.35, 0, 0);
    const w1 = Math.sin(t * 2.2 + k), w2 = Math.sin(t * 1.7 + k + 1);
    pj(a, SK.UAL, .7 + w1 * .08, 0, -.05); pj(a, SK.FAL, .6 + w2 * .15, 0, 0); pj(a, SK.UAR, .75 + w2 * .1, 0, .05); pj(a, SK.FAR, .55 + w1 * .2, 0, 0);
  } else if (kind === 'look') {
    pj(a, SK.HD, .05, Math.sin(t * .9 + k) * .9, 0); pj(a, SK.CH, 0, Math.sin(t * .9 + k) * .3, 0);
  } else if (kind === 'guard') {
    pj(a, SK.THL, 0, .15, -.1); pj(a, SK.THR, 0, -.15, .1); pj(a, SK.HD, 0, Math.sin(t * .4 + k) * .6, 0);
  } else if (kind === 'surrender') {
    pj(a, SK.UAL, 2.8, 0, -.4); pj(a, SK.FAL, .5, 0, 0); pj(a, SK.UAR, 2.8, 0, .4); pj(a, SK.FAR, .5, 0, 0);
  }
}
function poseSit(a, t, k, table) {
  pj(a, SK.THL, 1.55, .06, -.05); pj(a, SK.THR, 1.55, -.06, .05); pj(a, SK.SHL, -1.5, 0, 0); pj(a, SK.SHR, -1.5, 0, 0);
  pj(a, SK.CH, table ? -.15 : .12, 0, 0); pj(a, SK.HD, table ? -.25 : Math.sin(t * .5 + k) * .1, Math.sin(t * .35 + k) * .3, 0);
  if (table) { const w = Math.sin(t * 1.9 + k); pj(a, SK.UAL, .9, 0, -.1); pj(a, SK.FAL, .6 + w * .1, 0, 0); pj(a, SK.UAR, .9, 0, .1); pj(a, SK.FAR, .55 - w * .15, 0, 0); }
  else { pj(a, SK.UAL, .5, 0, -.15); pj(a, SK.FAL, .9, 0, 0); pj(a, SK.UAR, .5, 0, .15); pj(a, SK.FAR, .9, 0, 0); }
}
function poseCrouch(a, ph, moving) {
  const s = moving ? Math.sin(ph) : 0;
  pj(a, SK.THL, 1.1 + s * .3, 0, -.08); pj(a, SK.THR, 1.1 - s * .3, 0, .08); pj(a, SK.SHL, -1.9 + Math.max(0, s) * .3, 0, 0); pj(a, SK.SHR, -1.9 + Math.max(0, -s) * .3, 0, 0);
  pj(a, SK.FTL, .7, 0, 0); pj(a, SK.FTR, .7, 0, 0); pj(a, SK.CH, -.35, 0, 0); pj(a, SK.HD, .3, 0, 0);
}
function poseDead(a, k) {
  pj(a, SK.THL, .2 + k * .3, 0, -.15); pj(a, SK.THR, -.1, 0, .2); pj(a, SK.SHL, -.4, 0, 0); pj(a, SK.SHR, -.1, 0, 0);
  pj(a, SK.UAL, .4, 0, -1.1); pj(a, SK.UAR, -.2, 0, .9 + k * .6); pj(a, SK.FAL, .6, 0, 0); pj(a, SK.FAR, .3, 0, 0); pj(a, SK.HD, -.2, .6 * (k - .5), 0); pj(a, SK.CH, 0, 0, 0);
}

/* ======================= VIEWMODEL (first person) ======================= */
const VB = { UAR: 0, FAR: 1, HR: 2, UAL: 3, FAL: 4, HL: 5, WPN: 6, MAG: 7, SLD: 8, ITEM: 9, KNIFE: 10, N: 11 };
const VM_UA = .36, VM_FA = .34;
function buildArms(app) {
  const B = new MB(8000); const sleeve = app.sleeve, glove = app.glove;
  for (const L of [0, 1]) {
    const ua = L ? VB.UAL : VB.UAR, fa = L ? VB.FAL : VB.FAR, h = L ? VB.HL : VB.HR;
    B.b(ua).col(sleeve, MAT.CAMO).cyl(0, -VM_UA - .02, 0, .047, .06, VM_UA + .04, 10);
    B.col(0x2a2c22, MAT.CANVAS).cyl(0, -.12, 0, .062, .062, .05, 10); // arm band
    if (!L) { B.col(0x8a1010, MAT.CLOTH).box(.0, -.13, -.06, .05, .035, .01); }
    B.b(fa).col(sleeve, MAT.CAMO).cyl(0, -.25, 0, .04, .05, .27, 10);
    B.col(lin(sleeve).map(v => v * .75), MAT.CAMO).cyl(0, -.26, 0, .046, .046, .035, 10);
    B.col(0x1a1a1a, MAT.LEATHER).cyl(0, -VM_FA, 0, .036, .041, .09, 10);
    if (L) { B.col(0x141414, MAT.RUBBER).cyl(0, -.29, 0, .043, .043, .026, 12); B.col(0x0a0a0a, MAT.GLASS).box(0, -.277, -.044, .028, .03, .006); B.col(0xc02020, MAT.EMIT).box(.006, -.277, -.048, .008, .004, .001); }
    buildHand(B, h, !!L, glove, glove);
  }
  return B.mesh();
}
// weapon definitions (gameplay + model)
const WEAPONS = {
  pistol: { name: 'P-9 SD', type: 'pistol', mag: 15, reserve: 60, dmg: 48, rpm: 380, auto: false, spread: .012, adsSpread: .0025, recoil: .035, suppressed: true, reload: 1.6, adsFov: 58, noise: 10, sound: 'pistolS' },
  ar7: { name: 'AR-7 CARBINE', type: 'rifle', mag: 30, reserve: 150, dmg: 34, rpm: 760, auto: true, spread: .03, adsSpread: .004, recoil: .022, suppressed: false, reload: 2.3, adsFov: 50, noise: 140, sound: 'rifle' },
  mk17: { name: 'MK-17 BATTLE RIFLE', type: 'rifle', mag: 20, reserve: 100, dmg: 52, rpm: 560, auto: true, spread: .034, adsSpread: .003, recoil: .036, suppressed: false, reload: 2.6, adsFov: 46, noise: 160, sound: 'rifle2' },
  knife: { name: 'CK-1 COMBAT KNIFE', type: 'knife', dmg: 150, noise: 0 },
};
function buildPistolVM(B) {
  // origin = top of grip (hand web). barrel -Z
  B.b(VB.WPN).col(0x202224, MAT.PLASTIC);
  B.push().t(0, -.005, .01).rx(-.22).box(0, -.05, 0, .029, .105, .045).pop(); // grip
  B.col(0x16181a, MAT.RUBBER); for (let i = 0; i < 5; i++) B.push().t(0, -.02 - i * .017, .01).rx(-.22).box(0, 0, -.024, .03, .004, .004).pop();
  B.col(0x202224, MAT.PLASTIC).box(0, .012, -.06, .027, .028, .16); // frame
  B.col(0x26282a, MAT.PLASTIC).box(0, -.012, -.11, .022, .01, .06); // rail
  B.torus(0, -.008, -.04, .018, .003, 10, 4); // trigger guard (approx)
  B.col(0x111111, MAT.METAL).push().t(0, -.002, -.035).rx(.3).box(0, -.008, 0, .006, .02, .006).pop();
  B.col(0x0e0e0e, MAT.METAL).cylZ(0, .042, -.235, .014, .17, 14).cylZ(0, .042, -.155, .016, .012, 14).cylZ(0, .042, -.315, .015, .01, 14); // suppressor
  B.col(0x222222, MAT.METAL); for (let i = 0; i < 6; i++) B.cylZ(0, .042, -.17 - i * .024, .0145, .003, 12);
  // slide (bone)
  B.b(VB.SLD).col(0x2b2d2f, MAT.METAL).box(0, .042, -.065, .028, .03, .19);
  B.col(0x1a1a1a, MAT.METAL); for (let i = 0; i < 6; i++) B.box(0, .042, .005 - i * .007, .0285, .022, .002);
  B.col(0x111111, MAT.METAL).box(0, .06, .02, .02, .008, .01).box(0, .06, -.15, .006, .008, .008);
  B.col(0xd0f040, MAT.EMIT).box(0, .064, -.15, .002, .002, .002).box(-.006, .064, .02, .002, .002, .002).box(.006, .064, .02, .002, .002, .002);
  B.col(0x3a3a3a, MAT.METAL).box(.0145, .045, -.07, .002, .012, .03); // ejection port
  // mag (bone)
  B.b(VB.MAG).col(0x151515, MAT.METAL).push().rx(-.22).box(0, -.06, .012, .022, .11, .035).col(0x2a2a2a, MAT.PLASTIC).box(0, -.118, .012, .026, .012, .042).pop();
}
function buildRifleVM(B, variant, optic) {
  const big = variant === 'mk17';
  B.b(VB.WPN);
  const rc = big ? 0x5d5444 : 0x232425; // receiver color (mk17 = FDE)
  B.col(0x1d1e1f, MAT.PLASTIC).push().t(0, -.004, .012).rx(-.35).box(0, -.045, 0, .03, .1, .045).pop(); // pistol grip
  B.col(rc, MAT.METAL).box(0, .012, -.09, .044, .045, .22); // lower
  B.box(0, .05, -.14, .046, .04, big ? .34 : .3); // upper
  B.col(0x141414, MAT.METAL).box(0, .077, -.17, .024, .012, big ? .4 : .36); // top rail
  for (let i = 0; i < 16; i++) B.box(0, .084, -.0 - i * .022, .026, .004, .008);
  B.col(rc, MAT.METAL).box(0, .042, -.4, .052, .05, big ? .26 : .24); // handguard
  B.col(0x121212, MAT.METAL); for (let i = 0; i < 7; i++) { B.box(.027, .042, -.31 - i * .03, .004, .03, .012); B.box(-.027, .042, -.31 - i * .03, .004, .03, .012); }
  B.box(0, .012, -.42, .02, .008, .18); // bottom rail
  B.col(0x101010, MAT.METAL).cylZ(0, .045, -.62, .01, .22, 10);
  B.cylZ(0, .045, -.73, .016, .05, 8); B.col(0x1a1a1a, MAT.METAL); for (let i = 0; i < 3; i++) B.box(0, .045 + (i - 1) * .009, -.74, .034, .003, .03);
  // front sight post
  B.col(0x121212, MAT.METAL).box(0, .09, -.5, .012, .03, .012);
  // stock
  B.col(0x1d1e1f, MAT.PLASTIC).cylZ(0, .035, .07, .014, .14, 10).tbox(0, .02, .19, .04, .1, .12, .042, .1).box(0, -.035, .25, .045, .02, .02);
  B.col(0x0e0e0e, MAT.RUBBER).box(0, .015, .255, .046, .12, .015);
  // trigger guard + trigger
  B.col(0x111111, MAT.METAL).box(0, -.017, -.045, .006, .005, .055).push().t(0, -.0, -.035).rx(.3).box(0, -.008, 0, .005, .018, .005).pop();
  // vertical grip + laser
  B.col(0x1a1a1a, MAT.PLASTIC).cyl(0, -.075, -.42, .014, .016, .07, 10);
  B.col(0x222222, MAT.PLASTIC).box(.032, .03, -.48, .018, .028, .06); B.col(0x30ff50, MAT.EMIT).box(.032, .03, -.511, .006, .006, .002);
  // sling mount
  B.col(0x111111, MAT.METAL).torus(-.03, .03, .1, .012, .002, 8, 3);
  // optic
  if (optic === 'reddot') {
    B.col(0x151515, MAT.METAL).box(0, .1, -.15, .04, .015, .07).cylZ(0, .122, -.15, .022, .065, 14, 0);
    B.col(0x0b0b0b, MAT.METAL); for (const z of [-.118, -.182]) B.torus(0, .122, z, .022, .004, 14, 4);
    B.col(0x406060, MAT.GLASS).push().t(0, .122, -.16).rx(Math.PI / 2).cyl(0, 0, 0, .019, .019, .002, 14).pop();
    B.col(0xff2020, MAT.EMIT).box(0, .122, -.13, .0012, .0012, .0005);
  } else if (optic === 'holo') {
    B.col(0x151515, MAT.METAL).box(0, .1, -.14, .05, .015, .09).box(-.022, .13, -.14, .006, .05, .09).box(.022, .13, -.14, .006, .05, .09).box(0, .158, -.14, .05, .006, .09);
    B.col(0x406060, MAT.GLASS).vplane(0, .13, -.11, .036, .042);
    B.col(0xff2a2a, MAT.EMIT).box(0, .13, -.112, .0015, .0015, .0005);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; B.box(Math.cos(a) * .006, .13 + Math.sin(a) * .006, -.112, .0012, .0012, .0005); }
  } else {
    B.col(0x121212, MAT.METAL).box(0, .1, .03, .02, .024, .02).box(0, .115, .03, .008, .008, .012);
  }
  // magazine (bone)
  B.b(VB.MAG).col(big ? 0x1b1b1b : 0x252525, MAT.METAL);
  if (big) B.push().t(0, -.01, -.13).rx(.08).box(0, -.08, 0, .03, .16, .07).box(0, -.165, 0, .034, .012, .075).pop();
  else { B.push().t(0, -.01, -.13).rx(.12).box(0, -.06, 0, .026, .12, .065).rx(.2).box(0, -.15, .01, .026, .08, .062).box(0, -.19, .012, .03, .012, .066).pop(); }
  // charging handle (bone)
  B.b(VB.SLD).col(0x111111, MAT.METAL).box(0, .066, .03, .02, .01, .03).box(0, .066, .045, .05, .01, .01);
}
function buildKnifeVM(B, bone) {
  B.b(bone);
  B.col(0x1b1b1b, MAT.RUBBER).cyl(0, -.06, 0, .014, .016, .11, 10); for (let i = 0; i < 5; i++) B.cyl(0, -.05 + i * .018, 0, .0165, .0165, .004, 10);
  B.col(0x222222, MAT.METAL).box(0, .055, 0, .05, .01, .022).cyl(0, -.07, 0, .015, .015, .012, 10);
  B.col(0xb8bcc0, MAT.METAL).push().t(0, .06, 0);
  B.begin(); const L = .17;
  B.quad([-.003, 0, -.016], [.003, 0, -.016], [.003, L * .8, -.012], [-.003, L * .8, -.012]);
  B.tri([-.003, L * .8, -.012], [.003, L * .8, -.012], [0, L, .004]);
  B.col(0x8a8e92, MAT.METAL).quad([.003, 0, -.016], [.0005, 0, .016], [.0005, L * .85, .006], [.003, L * .8, -.012]);
  B.quad([-.0005, 0, .016], [-.003, 0, -.016], [-.003, L * .8, -.012], [-.0005, L * .85, .006]);
  B.tri([.0005, L * .85, .006], [0, L, .004], [.003, L * .8, -.012]); B.tri([-.003, L * .8, -.012], [0, L, .004], [-.0005, L * .85, .006]);
  B.col(0x2a2a2a, MAT.METAL).box(0, .05, -.016, .007, .1, .004);
  B.pop();
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
  else if (kind === 'knife') { buildKnifeVM(B, B.bone); }
}
// small hip-fire/ADS rest positions per weapon, grip points for IK (weapon space)
const VM_CFG = {
  pistol: { hip: [.135, -.15, -.5], ads: [0, -.0565, -.33], gripR: [0, -.035, .055], gripL: [-.01, -.07, .035], sight: .059 },
  rifle: { hip: [.13, -.165, -.36], ads: [0, -.119, -.2], gripR: [0, -.04, .06], gripL: [0, -.03, -.31], sight: .119 },
  rifleRD: { ads: [0, -.122, -.17] }, rifleHolo: { ads: [0, -.13, -.16] },
  knife: { hip: [.17, -.2, -.45] },
};

/* ======================= VEHICLES ======================= */
const VEHB = { BODY: 0, W0: 1, W1: 2, W2: 3, W3: 4, STEER: 5, DOOR: 6 };
function buildWheel(B, bone, r, w) {
  B.b(bone).col(0x141414, MAT.RUBBER).push().rz(Math.PI / 2).cyl(0, -w / 2, 0, r, r, w, 16).pop();
  B.col(0x111111, MAT.RUBBER); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; B.push().rx(a).box(0, r, 0, w * 1.02, .025, .05).pop(); }
  B.col(0x7a7a7a, MAT.METAL).push().rz(Math.PI / 2).cyl(0, -w / 2 - .005, 0, r * .55, r * .55, w + .01, 12).pop();
  B.col(0x333333, MAT.METAL); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; B.push().rx(a).box(0, r * .3, 0, w + .02, r * .35, .04).pop(); }
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
  B.col(0xff2020, MAT.EMIT).box(0, .3, 6.8, .1, .1, .1);
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
