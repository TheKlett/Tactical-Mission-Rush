/* =====================================================================
   OVERCAST — FOB KESTREL: rain-soaked airfield ringed by jungle,
   the washroom container, plus the drop-zone world far below the clouds.
   ===================================================================== */
const FOB = {
  fence: [-330, -265, 830, 175],           // x0, z0, x1, z1
  runway: { z: -120, x0: -260, x1: 780, w: 46 }, runway2: { z: -205, x0: -200, x1: 760, w: 30 },
  cont: { x: -130, z: -20, fy: .38 },        // washroom container (centre, floor height)
  plane: { x: -58, z: -120 },               // parked transport (nose +x)
  mech: { x: -102, z: -58 }, pad: { x: -178, z: -84 }, tent: { x: -150, z: -66 },
};
// long/flat boxes are split into tiles: huge triangles cause clipping/precision artefacts
function tiledBox(B, cx, y, cz, w, h, d, tile = 14) {
  const nx = Math.max(1, Math.ceil(w / tile)), nz = Math.max(1, Math.ceil(d / tile)); const tw = w / nx, td = d / nz;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) B.box(cx - w / 2 + (i + .5) * tw, y, cz - d / 2 + (j + .5) * td, tw, h, td, 1);
  return B;
}
function jungleTree(W, x, z, s = 1, R) {
  const B = W.B; const y = W.th(x, z) - .4; const h = (14 + R() * 14) * s;
  const lean = [(R() - .5) * .08, (R() - .5) * .08];
  B.col([0x5a4a3a, 0x4a3e30, 0x6a5a48][R() * 3 | 0], MAT.BARK).cyl(x, y, z, .5 * s, .28 * s, h * .78, 8);
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + R(); B.beam([x, y + 1.6 * s, z], [x + Math.cos(a) * 1.4 * s, y - .2, z + Math.sin(a) * 1.4 * s], .14 * s, .6 * s); }
  const tx = x + lean[0] * h, tz = z + lean[1] * h; const cols = [0x1f3a1c, 0x2a4a22, 0x334f26, 0x23401f, 0x3a5a2a];
  const n = 2 + (R() * 3 | 0);
  for (let i = 0; i < n; i++) { const a = R() * TAU, d = R() * 3 * s; B.col(cols[R() * cols.length | 0], MAT.LEAF).blob(tx + Math.cos(a) * d, y + h * (.78 + R() * .2), tz + Math.sin(a) * d, (3.2 + R() * 2.4) * s, (1.6 + R()) * s, x * 7 + z + i, .38, 8, 5); }
  if (R() < .5) { B.col(0x2a3a1a, MAT.LEAF); for (let k = 0; k < 3; k++) { const a = R() * TAU; const px = tx + Math.cos(a) * 2 * s, pz = tz + Math.sin(a) * 2 * s; B.tube([px, y + h * .75, pz], [px + (R() - .5), y + h * .75 - 4 - R() * 6, pz + (R() - .5)], .04, .03, 4); } }
  W.colBox(x, y + 3, z, .9 * s, 6, .9 * s, { surf: 'wood' });
}
function fernClump(W, x, z, R) { const B = W.D, y = W.th(x, z); B.col([0x2e4a22, 0x3a5a28, 0x24401c][R() * 3 | 0], MAT.LEAF); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + R(); B.beam([x, y + .1, z], [x + Math.cos(a) * 1.3, y + .6 + R() * .5, z + Math.sin(a) * 1.3], .22, .02); } }
function tent(W, x, z, yaw, w, d, col, o = {}) {
  const B = W.B; const y = W.th(x, z); B.push().t(x, y, z).ry(yaw);
  B.col(col, MAT.CANVAS).box(0, 1.1, d / 2, w, 2.2, .04).box(-w / 2, 1.1, 0, .04, 2.2, d).box(w / 2, 1.1, 0, .04, 2.2, d);
  if (!o.open) B.box(0, 1.1, -d / 2, w, 2.2, .04); else { B.box(-w / 2 + .5, 1.1, -d / 2, 1, 2.2, .04).box(w / 2 - .5, 1.1, -d / 2, 1, 2.2, .04); B.col(dk(col, .85), MAT.CANVAS).push().t(0, 2.2, -d / 2 - .8).rx(.35).box(0, 0, 0, w * .9, .03, 1.7).pop(); }
  B.col(dk(col, .9), MAT.CANVAS).prism(0, 2.2, 0, w + .2, 1.1, d + .1);
  B.col(0x555555, MAT.METAL); for (const s of [-1, 1]) for (const e of [-1, 1]) B.cyl(s * w / 2, 0, e * d / 2, .03, .03, 2.25, 5); B.cyl(0, 0, d / 2, .03, .03, 3.3, 5);
  if (o.cross) { B.col(0xb01818, MAT.PAINT).push().t(0, 2.85, 0).rz(Math.atan2(1.1, w / 2)).box(0, 0, 0, .12, .7, .7).box(0, 0, 0, .12, .2, .7).pop(); B.col(0xf0f0f0, MAT.PAINT).box(0, 1.6, d / 2 + .03, 1, 1, .01); B.col(0xb01818, MAT.PAINT).box(0, 1.6, d / 2 + .04, .7, .2, .01).box(0, 1.6, d / 2 + .04, .2, .7, .01); }
  B.pop(); const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
  W.colBox(x + (c * 0), y + 1.1, z, (w * c + d * s) * .92, 2.2, (w * s + d * c) * .92, { surf: 'cloth' });
}
function buildFOB(W) {
  const R = () => W.R(); const F = FOB.fence;
  // ---------- terrain: flat inside the wire, rising jungle hills outside ----------
  W.initTerrain((x, z) => {
    const ox = Math.max(F[0] - x, 0, x - F[2]), oz = Math.max(F[1] - z, 0, z - F[3]); const d = Math.hypot(ox, oz);
    const inside = d <= 0; const n = fbm(x * .004, z * .004, 4) * 1 + fbm(x * .02, z * .02, 3) * .25;
    if (inside) return -.05 + vnoise(x * .05, z * .05) * .08;
    return smooth(d / 60) * (d * .07 + n * 26) + vnoise(x * .1, z * .1) * .6 * Math.min(1, d / 8);
  }, 8);
  W.buildTerrainMesh((x, z, y, n) => {
    const ox = Math.max(F[0] - x, 0, x - F[2]), oz = Math.max(F[1] - z, 0, z - F[3]); const d = Math.hypot(ox, oz);
    const v = vnoise(x * .08, z * .08);
    if (d > 6) return { c: lin(v > .5 ? 0x1c3418 : 0x22401c).map(q => q * (.75 + v * .4)), m: MAT.LEAF };
    return { c: lin(v > .55 ? 0x3a3e26 : 0x34382a), m: MAT.MUD };
  });
  const B = W.B, D = W.D;
  // ---------- runways, apron, taxiways ----------
  const slab = (x0, z0, x1, z1, col, mat = MAT.ASPH) => { B.col(col, mat); tiledBox(B, (x0 + x1) / 2, .02, (z0 + z1) / 2, x1 - x0, .06, z1 - z0, 16); };
  for (const rw of [FOB.runway, FOB.runway2]) {
    slab(rw.x0, rw.z - rw.w / 2, rw.x1, rw.z + rw.w / 2, 0x2c2e30);
    D.col(0xd8d8d0, MAT.PAINT); for (let x = rw.x0 + 60; x < rw.x1 - 60; x += 30) D.box(x, .055, rw.z, 15, .01, .7);
    tiledBox(D, (rw.x0 + rw.x1) / 2, .055, rw.z - rw.w / 2 + 1, rw.x1 - rw.x0 - 10, .01, .4, 16); tiledBox(D, (rw.x0 + rw.x1) / 2, .055, rw.z + rw.w / 2 - 1, rw.x1 - rw.x0 - 10, .01, .4, 16);
    for (const xe of [rw.x0 + 8, rw.x1 - 8]) for (let k = -5; k <= 5; k++) if (k) D.box(xe, .055, rw.z + k * rw.w / 12, 22, .01, rw.w / 18);
    D.col(0x1a1a1a, MAT.ASPH); for (let x = rw.x0 + 40; x < rw.x1; x += 9) D.box(x + R() * 4, .056, rw.z + (R() - .5) * 8, 8 + R() * 6, .005, .5 + R() * .8);   // tyre marks
    D.col(0xfff0c0, MAT.EMIT); for (let x = rw.x0; x <= rw.x1; x += 30) for (const s of [-1, 1]) D.box(x, .1, rw.z + s * (rw.w / 2 + .6), .25, .12, .25);
  }
  stencilFlat(D, '09', FOB.runway.x0 + 45, FOB.runway.z, 3.2);
  slab(-265, -96, 330, 128, 0x3a3c3c, MAT.CONC);
  D.col(0x262828, MAT.ASPH); for (let x = -260; x < 330; x += 7.5) tiledBox(D, x, .053, 16, .08, .005, 224, 15); for (let z = -95; z < 128; z += 7.5) tiledBox(D, 32, .053, z, 594, .005, .08, 15);
  D.col(0xc8a020, MAT.PAINT); tiledBox(D, 30, .056, -60, 520, .01, .35, 15); for (let x = -240; x < 300; x += 20) D.box(x, .056, -97, .35, .01, 6);
  slab(-80, -143, 120, -96, 0x2e3032); slab(-150, -192, -120, -96, 0x2e3032);
  // puddles: flat, darker, glossy (the wet shader turns them into mirrors of the sky)
  for (let i = 0; i < 140; i++) { const x = rnd(-250, 320), z = rnd(-150, 125); D.col(R() < .5 ? 0x1c1e20 : 0x232527, MAT.TILE).box(x, .058, z, 1 + R() * 4, .004, .8 + R() * 3); }
  // ---------- perimeter: chain-link + razor wire + jungle ----------
  const fz = [[F[0], F[1], F[2], F[1]], [F[2], F[1], F[2], F[3]], [F[2], F[3], F[0], F[3]], [F[0], F[3], F[0], F[1]]];
  for (const [x0, z0, x1, z1] of fz) {
    W.fence(x0, z0, x1, z1, 'chain', 3.2); const L = Math.hypot(x1 - x0, z1 - z0); const n = Math.floor(L / .55);
    D.col(0x8a8c88, MAT.METAL); for (let i = 0; i < n; i++) { const t = i / n; const x = lerp(x0, x1, t), z = lerp(z0, z1, t); D.push().t(x, 3.65, z).ry(Math.atan2(x1 - x0, z1 - z0)).torus(0, 0, 0, .32, .01, 8, 3).pop(); }
  }
  const treeAt = (x, z) => { if (x > F[0] - 6 && x < F[2] + 6 && z > F[1] - 6 && z < F[3] + 6) return; jungleTree(W, x, z, .8 + R() * .7, R); };
  for (let i = 0; i < 1100; i++) {
    const side = R() * 4 | 0; const depth = 7 + Math.pow(R(), 1.6) * 95; let x, z;
    if (side === 0) { x = rnd(F[0] - 100, F[2] + 100); z = F[1] - depth; } else if (side === 1) { x = F[2] + depth; z = rnd(F[1] - 100, F[3] + 100); } else if (side === 2) { x = rnd(F[0] - 100, F[2] + 100); z = F[3] + depth; } else { x = F[0] - depth; z = rnd(F[1] - 100, F[3] + 100); }
    treeAt(x, z); if (R() < .6) { const bx = x + rnd(-4, 4), bz = z + rnd(-4, 4); if (!(bx > F[0] - 4 && bx < F[2] + 4 && bz > F[1] - 4 && bz < F[3] + 4)) W.bush(bx, bz, 1.2 + R() * 1.4, [0x2a4a22, 0x335a26, 0x1f3a1a][R() * 3 | 0]); }
    if (depth < 30 && R() < .5) fernClump(W, x + rnd(-3, 3), z + rnd(-3, 3), R);
  }
  for (let i = 0; i < 70; i++) { const s = R() * 4 | 0; let x, z; const dd = 3 + R() * 3; if (s === 0) { x = rnd(F[0], F[2]); z = F[1] - dd; } else if (s === 1) { x = F[2] + dd; z = rnd(F[1], F[3]); } else if (s === 2) { x = rnd(F[0], F[2]); z = F[3] + dd; } else { x = F[0] - dd; z = rnd(F[1], F[3]); } W.tree(x, z, 'palm', .9 + R() * .4); }
  // grass strips along the inside of the fence
  for (let i = 0; i < 260; i++) { const x = rnd(F[0] + 2, F[2] - 2), z = R() < .5 ? rnd(F[1] + 2, F[1] + 25) : rnd(F[3] - 40, F[3] - 2); W.grass(x, z, 8, R() < .5 ? 0x4a5a2a : 0x56602e); }
  // ---------- watchtowers, floodlight masts ----------
  for (const [x, z] of [[F[0] + 6, F[1] + 6], [F[2] - 6, F[1] + 6], [F[2] - 6, F[3] - 6], [F[0] + 6, F[3] - 6], [250, F[3] - 6], [250, F[1] + 6]]) W.watchtower(x, z, 7, 0);
  for (const [x, z, yaw] of [[-240, 110, 2.4], [-240, -90, .7], [-20, 120, 3.1], [150, 120, 3.1], [300, -90, -.7], [80, -90, 0], [-90, 40, 2]]) { const L = W.floodlight(x, z, yaw, 13); L.i = 2.4; L.range = 40; }
  // ---------- container yard (west) ----------
  const ccols = [0x4a5a3a, 0x7a3020, 0x2a4a6a, 0x6a6a62, 0x8a6a3a, 0x3a3e36, 0x5a2a20];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) {
    const x = -245 + c * 7.2, z = 35 + r * 14; if (R() < .12) continue; const hgt = 1 + (R() * 3 | 0);
    for (let k = 0; k < hgt; k++) W.container(x, z + (R() - .5) * .3, 0, ccols[R() * ccols.length | 0], k * 2.59);
  }
  for (let c = 0; c < 6; c++) { const x = -100 + c * 3, z = 70; W.container(x, z, 1, ccols[c % ccols.length], 0); if (c % 2) W.container(x, z, 1, ccols[(c + 3) % ccols.length], 2.59); }
  for (let c = 0; c < 5; c++) W.container(-205 + c * 8, -35, 1, ccols[(c * 2) % ccols.length], 0);
  // ---------- washroom container (the start) ----------
  buildWashroom(W);
  // ---------- hangar (Quonset) ----------
  { const hx = 70, hz = 150, Lh = 50, Rh = 16; B.col(0x5a5e58, MAT.CORR); for (let i = 0; i < 18; i++) { const a0 = i / 18 * Math.PI, a1 = (i + 1) / 18 * Math.PI; B.begin(); B.quad([hx + Math.cos(a0) * Rh, Math.sin(a0) * Rh, hz - Lh / 2], [hx + Math.cos(a1) * Rh, Math.sin(a1) * Rh, hz - Lh / 2], [hx + Math.cos(a1) * Rh, Math.sin(a1) * Rh, hz + Lh / 2], [hx + Math.cos(a0) * Rh, Math.sin(a0) * Rh, hz + Lh / 2]); }
    B.col(0x3a3c3a, MAT.METAL); for (let z = hz - Lh / 2; z <= hz + Lh / 2; z += 5) for (let i = 0; i < 18; i++) { const a0 = i / 18 * Math.PI, a1 = (i + 1) / 18 * Math.PI; B.beam([hx + Math.cos(a0) * (Rh - .2), Math.sin(a0) * (Rh - .2), z], [hx + Math.cos(a1) * (Rh - .2), Math.sin(a1) * (Rh - .2), z], .3, .3); }
    B.col(0x4a4e48, MAT.CORR); B.begin(); for (let i = 0; i < 18; i++) { const a0 = i / 18 * Math.PI, a1 = (i + 1) / 18 * Math.PI; B.tri([hx, 0, hz + Lh / 2], [hx + Math.cos(a0) * Rh, Math.sin(a0) * Rh, hz + Lh / 2], [hx + Math.cos(a1) * Rh, Math.sin(a1) * Rh, hz + Lh / 2]); }
    B.col(0x34363a, MAT.CONC); tiledBox(B, hx, .03, hz, Rh * 2, .06, Lh, 16);
    for (let z = hz - 20; z < hz + 25; z += 10) W.light([hx, 12, z], 0xffe8c8, 2.2, 22);
    B.col(0xfff4d8, MAT.EMIT); for (let z = hz - 20; z < hz + 25; z += 10) B.box(hx, 12.6, z, 3, .1, .4);
    W.colBox(hx - Rh + .5, 6, hz, 1, 12, Lh, {}); W.colBox(hx + Rh - .5, 6, hz, 1, 12, Lh, {}); W.colBox(hx, 6, hz + Lh / 2, Rh * 2, 12, 1, {});
    B.push().t(hx + 5.7, 13.5, hz - Lh / 2 - .1).ry(Math.PI); stencil(B, 'HANGAR 2', 0, 0, 0, .24, 0xd8d4c8); B.pop();
  }
  // ---------- tents: medical, command, mess ----------
  tent(W, FOB.tent.x, FOB.tent.z, .4, 6, 8, 0x6a6e58, { open: true, cross: true });
  tent(W, -60, 40, -.2, 7, 10, 0x5a5e48, { open: true }); tent(W, -40, 55, -.2, 5, 6, 0x5a5e48);
  tent(W, -160, 10, 1.57, 6, 9, 0x5e624c, { open: true });
  // command tent props
  B.col(0x3a3a30, MAT.WOOD).box(-60, .8, 40, 2.4, .08, 1.2); B.col(0xd8d0b0, MAT.PAINT).box(-60, .85, 40, 1.6, .01, .9); B.col(0x111111, MAT.PLASTIC).box(-59.5, 1.05, 39.8, .5, .35, .04); B.col(0x30d050, MAT.EMIT).box(-59.5, 1.05, 39.78, .44, .28, .01);
  B.col(0x777777, MAT.METAL).cyl(-56, 0, 46, .05, .02, 14, 5); B.col(0xff2020, MAT.EMIT).box(-56, 14.1, 46, .12, .12, .12);
  // ---------- helipad ----------
  { const p = FOB.pad; B.col(0x4a4c4c, MAT.CONC).cyl(p.x, -.02, p.z, 15, 15, .1, 28); D.col(0xd8d8d0, MAT.PAINT).torus(p.x, .09, p.z, 11, .25, 32, 3); D.box(p.x - 2, .09, p.z, .7, .01, 6).box(p.x + 2, .09, p.z, .7, .01, 6).box(p.x, .09, p.z, 4, .01, .7);
    D.col(0xffd060, MAT.EMIT); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; D.box(p.x + Math.cos(a) * 14, .12, p.z + Math.sin(a) * 14, .2, .1, .2); } }
  // ---------- jet shelters ----------
  for (let i = 0; i < 4; i++) { const x = 60 + i * 30, z = -40; B.col(0x4a4e46, MAT.METAL); for (const s of [-1, 1]) for (const e of [-1, 1]) B.cyl(x + s * 10, 0, z + e * 9, .2, .2, 7, 6); B.col(0x5a6050, MAT.CANVAS).box(x, 7.1, z, 21, .1, 19); for (const s of [-1, 1]) for (const e of [-1, 1]) W.colBox(x + s * 10, 3.5, z + e * 9, .4, 7, .4, {}); }
  // ---------- clutter: sandbags, barriers, crates, fuel bladders, generators, pallets ----------
  for (const [x, z, L, q] of [[-120, -2, 6, 0], [-90, -98, 8, 0], [-30, -98, 8, 0], [-200, -60, 5, 1], [-180, -120, 6, 1], [10, 30, 6, 0]]) W.sandbags(x, z, L, q, 3);
  for (let i = 0; i < 10; i++) { const x = -60 + i * 3.2, z = -100; B.col(0x8a8680, MAT.CONC).tbox(x, .45, z, 2.8, .9, .7, 2.8, .25); W.colBox(x, .45, z, 2.8, .9, .7, {}); }
  for (let i = 0; i < 14; i++) W.crateStack(-75 + (i % 7) * 1.2, 22 + (i / 7 | 0) * 1.3, 0);
  for (const [x, z] of [[-170, 30], [-175, 30], [-170, 36]]) { B.col(0x2a2c26, MAT.RUBBER).sph(x, .45, z, 2.2, .5, 1.6, 12, 5); W.colBox(x, .45, z, 4.2, .9, 3.1, {}); }
  W.genPos = [W.generator(-142, -5, 1), W.generator(-60, 32, 0), W.generator(-158, -58, 0)];
  for (let i = 0; i < 12; i++) W.pallet(-215 + (i % 4) * 1.4, 0 - (i / 4 | 0) * 1.6, .06);
  W.fireBarrel = [-120, 0, -45]; B.col(0x3a2a1a, MAT.RUST).cyl(-120, 0, -45, .3, .3, .9, 12); B.col(0x0a0a0a, MAT.METAL).cyl(-120, .86, -45, .27, .27, .02, 12); W.colBox(-120, .45, -45, .6, .9, .6, {});
  B.col(0x4a4a40, MAT.CORR).box(-120, 2.6, -45, 3, .06, 3); for (const s of [-1, 1]) for (const e of [-1, 1]) B.cyl(-120 + s * 1.4, 0, -45 + e * 1.4, .04, .04, 2.6, 5);
  // fuel truck + jeeps near the transport
  const truck = buildCar('truck', 0x4a5038); const jeep = buildCar('pickup', 0x4e5440);
  W.vehicles.push({ car: truck, pos: [-40, 0, -100], yaw: .3 }, { car: jeep, pos: [-110, 0, -98], yaw: 1.2 }, { car: jeep, pos: [-14, 0, 48], yaw: -.4 }, { car: truck, pos: [-180, 0, 0], yaw: 1.57 });
  for (const v of W.vehicles) W.colBox(v.pos[0], 1, v.pos[2], 3.2, 2, 3.2, {});
  // the parked transport's solid footprint (open at the ramp)
  { const px = FOB.plane.x, pz = FOB.plane.z; W.planeCol = W.col(px - 13.0, 0, pz - 3.4, px + 26, 8, pz + 3.4, { surf: 'metal' }); W.col(px - 6, 0, pz - 4.2, px + 4, 2.2, pz + 4.2, {}); }
}
// flat runway numbers
function stencilFlat(D, txt, x, z, px) { let cx = 0; for (const ch of txt) { const g = FONT[ch]; for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '#') D.col(0xd8d8d0, MAT.PAINT).box(x + (6 - r) * px, .056, z + (cx + c * px) - 3 * px * txt.length, px * .9, .01, px * .9); cx += px * 6; } }

/* ---------------- the washroom container: start of the game ---------------- */
function buildWashroom(W) {
  const C = FOB.cont, B = W.B, D = W.D; const fy = C.fy; const x0 = C.x - 3.03, x1 = C.x + 3.03, z0 = C.z - 1.22, z1 = C.z + 1.22;
  const H = 2.45, t = .08; const corr = 0x56604a;
  // shell: corrugated outside, white painted panels inside
  B.col(0x2a2a2a, MAT.METAL).box(C.x, fy - .1, C.z, 6.06, .2, 2.44); // floor frame
  B.col(0x3a3a38, MAT.CONC); for (const x of [x0 + .3, x1 - .3]) for (const z of [z0 + .3, z1 - .3]) B.box(x, (fy - .2) / 2, z, .45, fy - .2 + .02, .45);
  B.col(corr, MAT.CORR).box(C.x, fy + H / 2, z0 - t / 2, 6.06, H, t).box(C.x, fy + H / 2, z1 + t / 2, 6.06, H, t).box(x0 - t / 2, fy + H / 2, C.z, t, H, 2.6).box(C.x, fy + H + .05, C.z, 6.2, .1, 2.6);
  // door end (x1): wall with a 0.95 x 2.05 opening at z = C.z + .55
  const dz = C.z + .55, dw = .95, dh = 2.05;
  B.box(x1 + t / 2, fy + H / 2, (z0 + (dz - dw / 2)) / 2, t, H, (dz - dw / 2) - z0).box(x1 + t / 2, fy + H / 2, ((dz + dw / 2) + z1) / 2, t, H, z1 - (dz + dw / 2)).box(x1 + t / 2, fy + dh + (H - dh) / 2, dz, t, H - dh, dw);
  B.col(0x2a2c28, MAT.METAL); for (const s of [-1, 1]) for (const e of [-1, 1]) B.box(C.x + s * 3.03, fy + H / 2, C.z + e * 1.22, .14, H + .1, .14);
  B.push().t(x1 + .1, fy + 2.32, z1 - .15).ry(Math.PI / 2); stencil(B, 'LATRINE 4', 0, 0, 0, .035, 0xd8d4c8); B.pop();
  // interior lining
  const pan = 0xd8d6cc; B.col(pan, MAT.PAINT).box(C.x, fy + H / 2, z0 + .02, 6, H, .02).box(C.x, fy + H / 2, z1 - .02, 6, H, .02).box(x0 + .02, fy + H / 2, C.z, .02, H, 2.4).box(C.x, fy + H - .02, C.z, 6, .02, 2.4);
  B.col(0xc8c6bc, MAT.PAINT); for (let x = x0 + 1.2; x < x1; x += 1.2) { B.box(x, fy + H / 2, z0 + .035, .03, H, .01).box(x, fy + H / 2, z1 - .035, .03, H, .01); }
  D.col(0x9a9480, MAT.PAINT); for (let i = 0; i < 26; i++) D.box(x0 + .3 + R0() * 5.4, fy + .02 + R0() * .4, z0 + .04, .04 + R0() * .2, .05 + R0() * .4, .004);   // grime near the floor
  // floor: anti-slip rubber, drain, puddle
  B.col(0x2a2c2c, MAT.RUBBER).box(C.x, fy + .005, C.z, 6, .01, 2.4); D.col(0x1a1c1c, MAT.TILE).box(C.x - .4, fy + .016, C.z + .2, 1.3, .002, .8); D.col(0x777777, MAT.METAL).cyl(C.x - .2, fy + .012, C.z + .3, .08, .08, .006, 12);
  // fluorescent tube + cage
  B.col(0xf4f8ff, MAT.EMIT).cylX(C.x - .2, fy + H - .12, C.z, .025, 1.3, 8); B.col(0xcccccc, MAT.METAL).box(C.x - .2, fy + H - .05, C.z, 1.45, .05, .14);
  W.tube = W.light([C.x - .2, fy + H - .3, C.z], 0xe8f0ff, .95, 7);
  B.col(0x808078, MAT.METAL).box(x0 + .3, fy + H - .25, C.z + .6, .02, .25, .25); B.col(0x2a2a2a, MAT.METAL).cylX(x0 + .28, fy + H - .25, C.z + .6, .1, .02, 10); // vent fan
  // ---- the sink wall (north, z0): sink, tap, mirror, shelf, soap, paper towels ----
  const sx = C.x - .6; W.sinkPos = [sx, fy, z0 + .3];
  B.col(0xe8e8e2, MAT.PLASTIC).box(sx, fy + .82, z0 + .27, .62, .12, .46); B.col(0xd8d8d0, MAT.PLASTIC).box(sx, fy + .845, z0 + .27, .46, .06, .32); B.col(0x111111, MAT.METAL).cyl(sx, fy + .87, z0 + .3, .025, .025, .01, 10);
  B.col(0xd8d8d0, MAT.PLASTIC).box(sx, fy + .4, z0 + .12, .12, .8, .12);
  B.col(0xb8bcc0, MAT.METAL).cyl(sx, fy + .88, z0 + .08, .02, .018, .16, 10).tube([sx, fy + 1.03, z0 + .08], [sx, fy + 1.05, z0 + .2], .014, .012, 8); B.col(0x2050c0, MAT.PAINT).cyl(sx - .06, fy + .88, z0 + .07, .018, .018, .03, 8);
  // mirror frame (the reflective quad itself is a dynamic object)
  B.col(0x8a8c88, MAT.METAL).box(sx, fy + 1.55, z0 + .015, .74, .94, .02); B.col(0x2a2a2a, MAT.METAL).box(sx, fy + 2.06, z0 + .06, .5, .06, .1); B.col(0xfff6e8, MAT.EMIT).box(sx, fy + 2.03, z0 + .1, .44, .015, .02); W.light([sx, fy + 2.0, z0 + .35], 0xfff0dc, .7, 2.6); W.mirror = { p: [sx, fy + 1.55, z0 + .03], n: [0, 0, 1], w: .68, h: .88 };
  D.col(0x7a5a3a, MAT.RUST).box(sx + .3, fy + 1.12, z0 + .028, .02, .06, .002);
  B.col(0x9a9c98, MAT.METAL).box(sx, fy + 1.06, z0 + .1, .6, .02, .14);                          // shelf
  B.col(0x2a5a8a, MAT.PLASTIC).cyl(sx - .18, fy + 1.07, z0 + .1, .03, .03, .14, 8); B.col(0xd8d8d0, MAT.PLASTIC).cyl(sx + .15, fy + 1.07, z0 + .1, .022, .02, .1, 8); B.col(0x3a3a3a, MAT.PLASTIC).box(sx + .05, fy + 1.09, z0 + .1, .13, .04, .05);
  B.col(0x777777, MAT.METAL).box(sx + .62, fy + 1.3, z0 + .07, .3, .38, .12); B.col(0xeeeeea, MAT.PAINT).box(sx + .62, fy + 1.1, z0 + .1, .2, .04, .06);  // paper towels
  B.col(0xe0e0e0, MAT.PLASTIC).box(sx - .55, fy + 1.25, z0 + .06, .1, .18, .08);   // soap
  // poster
  B.col(0xe0dcc8, MAT.PAINT).box(C.x + 1.4, fy + 1.55, z0 + .035, .5, .7, .005); stencil(B, 'OPSEC', C.x + 1.24, fy + 1.78, z0 + .04, .016, 0x8a1010); B.col(0x3a3a30, MAT.PAINT).box(C.x + 1.4, fy + 1.45, z0 + .039, .38, .3, .002);
  stencil(B, 'LOOSE', C.x + 1.25, fy + 1.32, z0 + .04, .012, 0x2a2a2a); stencil(B, 'LIPS', C.x + 1.25, fy + 1.25, z0 + .04, .012, 0x2a2a2a);
  // towel hook + towel
  B.col(0x777777, MAT.METAL).box(C.x + .5, fy + 1.6, z0 + .05, .03, .03, .06); B.col(0x5a6a4a, MAT.CLOTH).box(C.x + .5, fy + 1.3, z0 + .07, .3, .55, .03);
  // ---- toilet stall (west end) ----
  W.toilet(x0 + .55, C.z - .1, fy); B.col(0xc8c6bc, MAT.PAINT).box(x0 + 1.25, fy + 1.05, C.z - .55, .04, 1.9, 1.3); B.col(0xc8c6bc, MAT.PAINT).push().t(x0 + 1.25, fy + 1.05, C.z + .1).ry(-.9).box(0, 0, .35, .03, 1.85, .7).pop();
  B.col(0xeeeeea, MAT.PAINT).cylX(x0 + .1, fy + .75, C.z + .45, .06, .1, 10); W.colBox(x0 + 1.25, fy + 1, C.z - .55, .06, 2, 1.3, {});
  // trash bin + mop bucket near the door
  B.col(0x3a4a3a, MAT.PLASTIC).cyl(x1 - .4, fy, z0 + .3, .2, .22, .55, 12); B.col(0xeeeeea, MAT.PAINT).box(x1 - .38, fy + .58, z0 + .3, .12, .06, .1);
  B.col(0xc8a020, MAT.PLASTIC).cyl(x1 - .45, fy, z1 - .4, .18, .2, .3, 12); B.col(0x8a6a3a, MAT.WOOD).tube([x1 - .45, fy + .2, z1 - .4], [x1 - .3, fy + 1.4, z1 - .2], .015, .015, 6);
  // colliders: walls (with a gap for the door)
  W.col(x0 - .2, fy, z0 - .2, x1 + .2, fy + H, z0 + .03, {}); W.col(x0 - .2, fy, z1 - .03, x1 + .2, fy + H, z1 + .2, {}); W.col(x0 - .2, fy, z0, x0 + .03, fy + H, z1, {});
  W.col(x1 - .03, fy, z0, x1 + .12, fy + H, dz - dw / 2, {}); W.col(x1 - .03, fy, dz + dw / 2, x1 + .12, fy + H, z1, {});
  W.col(x0, fy - .4, z0, x1, fy, z1, { walk: true }); W.colBox(sx, fy + .45, z0 + .27, .62, .9, .46, {});
  // outside: steel step + mud
  B.col(0x4a4a46, MAT.METAL).box(x1 + .55, fy * .5, dz, .9, fy, 1.2); W.col(x1 + .1, 0, dz - .6, x1 + 1, fy * .55, dz + .6, { walk: true });
  W.door = { hinge: [x1 + .06, fy, dz - dw / 2], w: dw, h: dh, ang: 0, vel: 0, target: 0, col: W.col(x1 - .02, fy, dz - dw / 2, x1 + .1, fy + dh, dz + dw / 2, {}) };
  W.dryBoxes = [{ mn: [x0, fy - .3, z0], mx: [x1, fy + H, z1] }];
  W.contBounds = { x0, x1, z0, z1, fy, H };
}
const R0 = mulberry(77);
function buildDoorMesh(w, h) {
  const B = new MB(2000); B.b(0); const t = .05;
  B.col(0x56604a, MAT.CORR).box(0, h / 2, w / 2, t, h, w); B.col(0xd8d6cc, MAT.PAINT).box(-.03, h / 2, w / 2, .01, h - .1, w - .1);
  B.col(0x2a2a2a, MAT.METAL).box(-.06, 1.0, w - .14, .06, .05, .5).box(-.04, 1.0, w - .14 - .22, .04, .08, .04).box(-.04, 1.0, w - .14 + .22, .04, .08, .04);   // push bar (inside)
  B.col(0x777777, MAT.METAL).box(.04, 1.05, w - .1, .04, .12, .03);                                                                                                    // handle outside
  B.col(0x333333, MAT.METAL); for (const y of [.25, h - .25]) B.box(0, y, .02, .08, .18, .05);
  B.col(0xb8b8b0, MAT.PAINT).box(.03, 1.6, w / 2, .01, .25, .45); B.col(0x2a2a2a, MAT.PAINT).box(.035, 1.62, w / 2, .005, .03, .3);
  return B.mesh();
}

/* ---------------- cloud sheets: stacked translucent layers ---------------- */
function buildCloudLayer(size, threshold, bright, alpha) {
  const n = 32, c = size / n; const B = new MB(n * n * 6 + 6); B.col([threshold, bright, alpha], MAT.CLOUD); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) B.plane(-size / 2 + (i + .5) * c, 0, -size / 2 + (j + .5) * c, c, c); return B.mesh();
}
function makeCloudDeck(base, top, n, o = {}) {
  const layers = [];
  for (let i = 0; i < n; i++) { const k = i / (n - 1); const y = lerp(base, top, k); const th = lerp(.52, .6, Math.abs(k - .5) * 2) + (o.thin || 0); const mesh = buildCloudLayer(o.size || 9000, th, lerp(.55, 1, k), o.alpha || .55); layers.push({ mesh, m: M4.create(), y, pos: [0, y, 0], alpha: 1, r: 0, tint: [1, 1, 1, 0] }); }
  return layers;
}

/* ---------------- the drop zone: endless jungle below the deck ---------------- */
function buildDropZone(W) {
  W.initTerrain((x, z) => fbm(x * .0012, z * .0012, 5) * 260 + fbm(x * .006, z * .006, 3) * 40 - Math.max(0, 40 - Math.abs(z - Math.sin(x * .002) * 300 - 200) * .3) * 2, 40);
  W.buildTerrainMesh((x, z, y, n) => {
    const v = vnoise(x * .02, z * .02), r = Math.abs(z - Math.sin(x * .002) * 300 - 200) < 20;
    if (r) return { c: lin(0x3a4a40), m: MAT.MUD };
    return { c: lin(v > .5 ? 0x1a3418 : 0x24421e).map(q => q * (.7 + vnoise(x * .1, z * .1) * .5)), m: MAT.LEAF };
  });
  const R = () => W.R();
  // canopy lumps near the fall path for parallax in the last seconds
  for (let i = 0; i < 260; i++) { const x = rnd(-700, 700), z = rnd(-700, 700); const y = W.th(x, z); W.B.col([0x1f3a1c, 0x2a4a22, 0x335026][R() * 3 | 0], MAT.LEAF).blob(x, y + 18, z, 9 + R() * 8, 6 + R() * 4, i, .4, 8, 5); }
}
