/* =====================================================================
   OVERCAST — dense dressing: base clutter, packed cargo cabin,
   cumulus cloud field and the huge world below.
   ===================================================================== */
/* ---------------- the base: a lot more stuff everywhere ---------------- */
function clutterFOB(W) {
  const R = () => W.R(); const B = W.B, D = W.D;
  // keep-out: the walking route container → ramp, and the vignette stages
  const route = [[-126, -19], [-110, -60], [-90, -100], [-78, -120]];
  const keep = [[FOB.mech.x, FOB.mech.z, 9], [FOB.tent.x, FOB.tent.z, 7], [FOB.pad.x, FOB.pad.z, 17], [-120, -45, 4], [-155, -40, 7], [FOB.cont.x, FOB.cont.z, 6], [-190, -104, 9], [-30, -42, 7], [-12, -42, 6], [-48, -52, 14], [-150, 52, 15], [-178, -30, 8], [-20, 30, 8], [-58, -120, 30], [-92, -126, 6]];
  const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1]; const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz), 0, 1); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
  const taken = [];
  const free = (x, z, r) => {
    for (let i = 0; i < route.length - 1; i++) if (segD(x, z, route[i], route[i + 1]) < 4.5 + r) return false;
    for (const [kx, kz, kr] of keep) if (Math.hypot(x - kx, z - kz) < kr + r) return false;
    if (Math.abs(z + 10) < 2.5 + r && x > -205 && x < -55) return false; if (Math.abs(z - 90) < 2.5 + r && x > -205 && x < -55) return false; // jogging loop
    if (Math.abs(x + 200) < 2.5 + r && z > -12 && z < 92) return false; if (Math.abs(x + 60) < 2.5 + r && z > -12 && z < 92) return false;
    if (Math.abs(x + 100) < 2.5 + r && z > -82 && z < 12) return false; if (Math.abs(x + 70) < 2.5 + r && z > -82 && z < 12) return false; if (Math.abs(z + 80) < 2.5 + r && x > -102 && x < -68) return false;
    if (Math.abs(z + 28) < 3 + r && x > -215 && x < 10) return false; // marching column
    if (Math.abs(z - FOB.runway.z) < FOB.runway.w / 2 + 2 && x > -230) return false;
    for (const t of taken) if (Math.hypot(x - t[0], z - t[1]) < t[2] + r) return false;
    taken.push([x, z, r]); return true;
  };
  const drum = (x, z, c) => { W.barrel(x, z, 0, c); };
  const kinds = {
    crates(x, z) { for (let i = 0; i < 4; i++) W.crateStack(x + (i % 2) * 1.0, z + (i / 2 | 0) * 1.0, 0); B.col(0x2a2c22, MAT.CANVAS); for (const dx of [.5]) B.box(x + dx, 1.85, z + .5, 2.1, .03, 2.1); },
    drums(x, z) { const c = [0x3a4a2a, 0x7a1a12, 0x2a3a5a, 0x6a6a5a][R() * 4 | 0]; for (let i = 0; i < 6; i++) drum(x + (i % 3) * .66, z + (i / 3 | 0) * .66, c); if (R() < .5) for (let i = 0; i < 2; i++) drum(x + .33 + i * .66, z + .33, c); },
    pallets(x, z) { for (let i = 0; i < 3; i++) { W.pallet(x + i * 1.4, z, .05); W.sacks(x + i * 1.4, z, .2); } B.col(0x4a5038, MAT.CANVAS).box(x + 1.4, .95, z, 4.2, .05, 1.5); },
    ammo(x, z) { B.col(0x4a5432, MAT.METAL); for (let i = 0; i < 12; i++) B.box(x + (i % 4) * .34, .14 + (i / 8 | 0) * .28, z + ((i / 4 | 0) % 2) * .22, .3, .25, .18); W.colBox(x + .5, .3, z + .1, 1.4, .6, .5, {}); },
    tires(x, z) { W.tires(x, z, 0); W.tires(x + .8, z + .3, 0); },
    gen(x, z) { const g = W.generator(x, z, R() * 4 | 0); W.genPos.push(g); D.col(0x111111, MAT.RUBBER); let px = x, pz = z; for (let i = 0; i < 6; i++) { const nx = px + rnd(-3, 3), nz = pz + rnd(-3, 3); D.tube([px, .04, pz], [nx, .04, nz], .025, .025, 5); px = nx; pz = nz; } },
    cones(x, z) { for (let i = 0; i < 5; i++) { B.col(0xe05010, MAT.PLASTIC).cyl(x + i * 1.6, 0, z, .18, .03, .55, 8); B.col(0xeeeeee, MAT.PAINT).cyl(x + i * 1.6, .25, z, .11, .08, .08, 8); } },
    jersey(x, z) { for (let i = 0; i < 4; i++) { B.col(0x8a8680, MAT.CONC).tbox(x + i * 3, .45, z, 2.9, .9, .7, 2.9, .25); W.colBox(x + i * 3, .45, z, 2.9, .9, .7, {}); } },
    toilets(x, z) { for (let i = 0; i < 3; i++) { const px = x + i * 1.3; B.col(0x2a5a8a, MAT.PLASTIC).box(px, 1.15, z, 1.15, 2.3, 1.15).box(px, 2.35, z, 1.2, .1, 1.2); B.col(0x1a3a5a, MAT.PLASTIC).box(px, 1.1, z - .58, .9, 2, .02); W.colBox(px, 1.15, z, 1.15, 2.3, 1.15, {}); } },
    canopy(x, z) { // tarp shelter with folding tables, boxes, radios
      B.col(0x4e5440, MAT.CANVAS).box(x, 2.6, z, 6, .05, 4); for (const s of [-1, 1]) for (const e of [-1, 1]) B.col(0x555555, MAT.METAL).cyl(x + s * 2.9, 0, z + e * 1.9, .04, .04, 2.6, 6);
      B.col(0x6a6a5a, MAT.METAL).box(x, .75, z, 2.4, .05, .8); for (const s of [-1, 1]) B.box(x + s * 1.1, .37, z, .04, .74, .7);
      B.col(0x2a2c26, MAT.PLASTIC).box(x - .6, .95, z, .4, .35, .3).box(x + .3, .9, z + .1, .5, .25, .35); B.col(0x30d050, MAT.EMIT).box(x - .6, 1.0, z - .16, .25, .12, .01);
      B.col(0xd8d0b0, MAT.PAINT).box(x + .7, .78, z - .1, .4, .01, .3); W.colBox(x, .4, z, 2.4, .8, .8, {});
      for (let i = 0; i < 4; i++) { W.crate(x - 2.4 + i * .5, z + 1.5, 0, .45, .45, .45, 0x5a5a3a); }
    },
    conex(x, z) { W.container(x, z, R() < .5 ? 0 : 1, [0x4a5a3a, 0x7a3020, 0x6a6a62, 0x3a3e36][R() * 4 | 0], 0); },
    bladder(x, z) { B.col(0x2a2c26, MAT.RUBBER).sph(x, .4, z, 2.6, .45, 1.6, 12, 5); W.colBox(x, .4, z, 5, .8, 3, {}); D.col(0x111111, MAT.RUBBER).tube([x + 2.5, .1, z], [x + 6, .05, z + 2], .05, .05, 6); },
    lights(x, z) { B.col(0xc8a020, MAT.PAINT).box(x, .6, z, 1.6, 1.2, 1.0); B.col(0x555555, MAT.METAL).cyl(x, 1.2, z, .06, .05, 6, 6); B.col(0x2a2a2a, MAT.METAL).box(x, 7.2, z, 1.6, .5, .2); B.col(0xfff6e0, MAT.EMIT); for (let i = 0; i < 4; i++) B.box(x - .6 + i * .4, 7.2, z - .11, .3, .3, .02); W.colBox(x, .6, z, 1.6, 1.2, 1, {}); W.light([x, 7, z - .5], 0xfff0d8, 1.6, 22); },
    bikes(x, z) { for (let i = 0; i < 3; i++) { const px = x + i * .9; B.col(0x111111, MAT.RUBBER).cylX(px, .33, z - .65, .33, .1, 12).cylX(px, .33, z + .65, .33, .1, 12); B.col(0x3a4030, MAT.PAINT).box(px, .65, z, .2, .3, 1.0); B.col(0x111111, MAT.LEATHER).box(px, .85, z + .15, .22, .1, .55); B.col(0x222222, MAT.METAL).box(px, 1.0, z - .55, .7, .04, .04); } W.colBox(x + .9, .5, z, 2.6, 1, 1.6, {}); },
    truck(x, z) { const car = W._cars || (W._cars = [buildCar('truck', 0x4a5038), buildCar('pickup', 0x4e5440), buildCar('truck', 0x5a5a48)]); const c = car[R() * 3 | 0]; const yaw = R() * TAU; W.vehicles.push({ car: c, pos: [x, 0, z], yaw }); W.colBox(x, 1.1, z, 3.4, 2.2, 3.4, {}); },
    stack2(x, z) { W.container(x, z, R() < .5 ? 0 : 1, [0x4a5a3a, 0x7a3020, 0x2a4a6a, 0x6a6a62][R() * 4 | 0], 0); W.container(x, z, R() < .5 ? 0 : 1, [0x3a3e36, 0x5a2a20, 0x8a6a3a][R() * 3 | 0], 2.59); },
    mesh(x, z) { // camo net over a stack
      W.crateStack(x, z, 0); W.crateStack(x + 1, z, 0); B.col(0x3a4428, MAT.CAMO); B.begin(); B.quad([x - 1.6, 0, z - 1.5], [x + 2.6, 0, z - 1.5], [x + 1.8, 2.2, z], [x - .8, 2.2, z]); B.quad([x - .8, 2.2, z], [x + 1.8, 2.2, z], [x + 2.6, 0, z + 1.5], [x - 1.6, 0, z + 1.5]); },
  };
  const names = Object.keys(kinds); const size = { truck: 4.5, stack2: 4.2, crates: 2.5, drums: 2.2, pallets: 3.5, ammo: 1.5, tires: 1.4, gen: 2.5, cones: 4.5, jersey: 6.5, toilets: 2.6, canopy: 4.2, conex: 4, bladder: 4, lights: 1.5, bikes: 2.2, mesh: 2.8 };
  let placed = 0;
  const weighted = ['truck', 'truck', 'truck', 'stack2', 'stack2', 'conex', 'canopy', 'canopy', 'crates', 'mesh', 'mesh', 'jersey', 'gen', 'lights', 'bladder', 'ammo', 'pallets', 'drums'];
  for (let n = 0; n < 12000 && placed < 260; n++) {
    // denser near the walking route, the plane and the tents
    const near = R() < .7; const x = near ? rnd(-215, -20) : rnd(-310, 300), z = near ? rnd(-100, 60) : rnd(-90, 120);
    const k = weighted[R() * weighted.length | 0]; if (!free(x, z, size[k])) continue; kinds[k](x, z); placed++;
  }
  // scattered small junk right along the route edges (crates, cases, drums) so the walk feels busy
  for (let i = 0; i < route.length - 1; i++) { const a = route[i], b = route[i + 1]; for (let t = .03; t < 1; t += .1) { const x = lerp(a[0], b[0], t), z = lerp(a[1], b[1], t); const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); const nx = -dz / L, nz = dx / L; const sd = R() < .5 ? -1 : 1; const px = x + nx * sd * rnd(5.5, 8), pz = z + nz * sd * rnd(5.5, 8); if (!free(px, pz, 1)) continue; if (R() < .5) W.crateStack(px, pz, 0); else drum(px, pz, 0x3a4a2a); } }
  W.clutterTaken = taken; W.clutterFree = free;
}

/* ---------------- the cargo cabin, packed ---------------- */
function cabinCargo(B) {
  const f = TP.floor, rng = mulberry(4242), R = () => rng();
  const bag = (x, y, z, c) => { B.col(c, MAT.CANVAS).sph(x, y + .14, z, .2, .15, .32, 9, 5); B.col(dk(c, .7), MAT.CANVAS).box(x, y + .29, z, .04, .02, .5); B.col(0x111111, MAT.CANVAS).torus(x, y + .3, z - .2, .05, .01, 6, 3); };
  const ruck = (x, y, z, c) => { B.col(c, MAT.CANVAS).box(x, y + .25, z, .32, .5, .25); B.col(dk(c, .8), MAT.CANVAS).box(x, y + .15, z + (x > 0 ? -.13 : .13) * 0, .26, .18, .27).box(x, y + .52, z, .3, .06, .26); };
  const can = (x, y, z) => { B.col(0x4a5432, MAT.METAL).box(x, y + .11, z, .14, .22, .28); B.col(0x2a2e1e, MAT.METAL).box(x, y + .23, z, .05, .02, .2); B.col(0xc8a020, MAT.PAINT).box(x + .071, y + .12, z, .002, .05, .15); };
  const case_ = (x, y, z, c, w = .55, h = .22, d = .4) => { B.col(c, MAT.PLASTIC).box(x, y + h / 2, z, w, h, d); B.col(dk(c, .6), MAT.PLASTIC).box(x, y + h / 2, z, w + .01, .03, d + .01); B.col(0x888888, MAT.METAL).box(x, y + h + .015, z, .14, .03, .03); };
  // under every seat: rucksacks, duffels, ammo cans, cases
  for (const s of TP.seats) {
    const x = s.pos[0] + s.side * .05, z = s.pos[2]; const k = R();
    if (k < .3) ruck(x, f, z, [0x4a5038, 0x5a5e44, 0x3e4430][R() * 3 | 0]); else if (k < .55) bag(x, f, z, [0x4a5038, 0x2a2e26, 0x5a5440][R() * 3 | 0]); else if (k < .8) { can(x - .08, f, z - .1); can(x + .08, f, z + .12); } else case_(x, f, z, [0x1a1a1a, 0x3a4030][R() * 2 | 0], .4, .2, .5);
    // helmet bags / canteens hanging off the seat frame
    if (R() < .4) { B.col(0x3a3f30, MAT.CANVAS).box(s.pos[0] + s.side * .3, f + .3, z + .2, .04, .25, .15); }
  }
  // forward cargo bay: palletised load under nets, strapped drums, cases, duffel pile
  const pal = (x, z) => { B.col(0x6a5640, MAT.WOOD).box(x, f + .07, z, 1.6, .14, 1.2); };
  pal(-1.2, -17.8); pal(1.2, -17.8); pal(-1.2, -16.3); pal(1.2, -16.3);
  for (const [x, z] of [[-1.5, -18.1], [-.9, -18.1], [-1.5, -17.5], [-.9, -17.5]]) { B.col(0x3a4a2a, MAT.METAL).cyl(x, f + .14, z, .29, .29, .88, 14); B.col(0x2a3a1a, MAT.METAL).torus(x, f + .45, z, .29, .015, 14, 3).torus(x, f + .8, z, .29, .015, 14, 3); B.col(0x1a1a1a, MAT.METAL).cyl(x + .12, f + 1.02, z, .04, .04, .02, 8); }
  for (let i = 0; i < 6; i++) case_(.75 + (i % 2) * .7, f + .14 + (i / 2 | 0) * .3, -17.8, [0x2a2e26, 0x4a5038, 0x1a1a1a][i % 3], .62, .28, 1.0);
  B.col(0x5a5040, MAT.WOOD); for (let i = 0; i < 4; i++) B.box(-1.2 + (i % 2) * .7, f + .5 + (i / 2 | 0) * .7, -16.3, .62, .66, 1.0);
  for (let i = 0; i < 9; i++) bag(.8 + (i % 3) * .3, f + .14 + (i / 3 | 0) * .22, -16.4 + rnd(-.3, .3), [0x4a5038, 0x2a2e26, 0x5a5440, 0x2a3a5a][i % 4]);
  // suitcases (yes — somebody brought a suitcase)
  case_(-1.8, f, -14.2, 0x3a2a20, .5, .7, .25); case_(-1.75, f, -13.6, 0x1a2a4a, .45, .62, .24); B.col(0x888888, MAT.METAL).box(-1.8, f + .78, -14.2, .2, .04, .03);
  // nets + ratchet straps over the load
  B.col(0x1a1c16, MAT.CANVAS); for (let i = 0; i < 9; i++) { const z = -18.6 + i * .33; B.beam([-2.1, f + .15, z], [-2.0, f + 1.5, z], .02, .02).beam([-2.0, f + 1.5, z], [2.0, f + 1.5, z], .02, .02).beam([2.0, f + 1.5, z], [2.1, f + .15, z], .02, .02); }
  for (let i = 0; i < 9; i++) { const x = -2 + i * .5; B.beam([x, f + 1.52, -18.7], [x, f + 1.52, -15.6], .02, .02); }
  B.col(0xc8a020, MAT.CANVAS); for (const z of [-17.8, -16.3]) B.beam([-2.2, f + .02, z], [-2.0, f + 1.56, z], .05, .01).beam([-2.0, f + 1.56, z], [2.0, f + 1.56, z], .05, .01).beam([2.0, f + 1.56, z], [2.2, f + .02, z], .05, .01);
  // rear corners behind the last seats: more crates and a stretcher
  for (const s of [-1, 1]) { for (let i = 0; i < 3; i++) { B.col(0x5a5040, MAT.WOOD).box(s * 2.1, f + .3 + i * .58, 10.5, .7, .56, .9); B.col(0x2a2a20, MAT.PAINT).box(s * 1.74, f + .3 + i * .58, 10.5, .01, .2, .5); } }
  B.col(0x4a5038, MAT.CANVAS).box(-2.35, f + 2.1, 11.6, .1, 2, .6); B.col(0x777777, MAT.METAL).box(-2.32, f + 2.1, 11.32, .05, 2.1, .04).box(-2.32, f + 2.1, 11.88, .05, 2.1, .04);
  // walls above the seats: cable looms, hoses, extinguishers, O2 bottles, first-aid bags, hanging straps
  for (const s of [-1, 1]) {
    const wx = s * 2.62;
    for (let k = 0; k < 4; k++) { B.col([0x111111, 0x1a1a1a, 0x3a3a3a, 0x8a2a1a][k], MAT.RUBBER).tube([wx - s * k * .03, 4.55 + k * .05, TP.z0 + 1], [wx - s * k * .03, 4.55 + k * .05, TP.z1 - .3], .018, .018, 5); }
    B.col(0x666660, MAT.METAL); for (let z = TP.z0 + 1.5; z < TP.z1; z += .9) B.box(wx - s * .04, 4.6, z, .03, .16, .05);
    for (let z = -10.6; z < 9.6; z += 1.44) { for (let k = 0; k < 3; k++) { const zz = z + k * .06; B.col(0x111111, MAT.RUBBER).tube([wx, 4.5, zz], [wx - s * .05, 4.0 - R() * .4, zz + .25 * (R() - .5)], .007, .007, 4); } }
    for (const z of [-9.5, -2.3, 4.9]) { B.col(0xa01010, MAT.PAINT).cyl(wx - s * .05, 3.6, z, .07, .07, .45, 10); B.col(0x111111, MAT.METAL).cyl(wx - s * .05, 4.05, z, .03, .03, .08, 6); }
    for (const z of [-6, 1.2, 8.4]) { B.col(0x3a6a3a, MAT.METAL).cyl(wx - s * .07, 3.5, z, .09, .09, .7, 10); B.col(0xc8c8c0, MAT.METAL).cyl(wx - s * .07, 4.2, z, .04, .04, .06, 8); B.col(0x111111, MAT.RUBBER).tube([wx - s * .07, 4.26, z], [wx - s * .2, 4.0, z + .3], .01, .01, 4); }
    for (const z of [-4.2, 6.6]) { B.col(0x3a4a2a, MAT.CANVAS).box(wx - s * .1, 3.7, z, .16, .32, .42); B.col(0xeeeeee, MAT.PAINT).box(wx - s * .19, 3.7, z, .005, .16, .16); B.col(0xb01818, MAT.PAINT).box(wx - s * .195, 3.7, z, .004, .1, .03).box(wx - s * .195, 3.7, z, .004, .03, .1); }
    // cargo net strung along the upper wall with gear stuffed in it
    B.col(0x1a1c16, MAT.CANVAS); for (let z = -11; z < 10; z += .3) B.beam([wx, 5.1, z], [wx - s * .06, 5.7, z], .012, .012); for (const y of [5.1, 5.4, 5.7]) B.beam([wx - s * .03, y, -11], [wx - s * .03, y, 10], .012, .012);
    for (let z = -10.5; z < 9.5; z += 1.2 + R()) { if (R() < .6) bag(wx - s * .2, 5.05, z, [0x4a5038, 0x2a2e26, 0x5a5440][R() * 3 | 0]); else B.col(0x3a3e2c, MAT.PAINT).sph(wx - s * .2, 5.3, z, .15, .11, .15, 8, 4); }
  }
  // ceiling: extra cable trays, hydraulic lines, hanging straps
  B.col(0x2a2c28, MAT.METAL).box(-1.2, 6.42, -3, .3, .06, 30).box(1.2, 6.42, -3, .3, .06, 30);
  for (const x of [-1.2, 1.2]) for (let k = 0; k < 5; k++) B.col([0x111111, 0x8a2a1a, 0x1a3a6a, 0x111111, 0x3a3a3a][k], MAT.RUBBER).tube([x - .1 + k * .05, 6.37, TP.z0 + 1], [x - .1 + k * .05, 6.37, TP.z1 - .2], .015, .015, 5);
  B.col(0x6a5a2a, MAT.METAL).tube([.4, 6.1, TP.z0 + 1], [.4, 6.1, TP.z1], .03, .03, 8);
  B.col(0x1a1a1a, MAT.CANVAS); for (let z = -11; z < 11; z += .8) { const x = (R() - .5) * 1.6; B.beam([x, 6.3, z], [x + (R() - .5) * .1, 5.6 - R() * .4, z + (R() - .5) * .2], .03, .006); }
  // floor: tie-down straps snaking across, spare static lines
  B.col(0xc8a020, MAT.CANVAS); for (let z = -11; z < 10; z += 2.7) B.beam([-1.7, f + .015, z], [1.7, f + .015, z + .4], .05, .006);
}

/* ---------------- cumulus field (soft, puffy, sunlit) ---------------- */
const PUFFS = { blobs: [], items: [] };
function buildCumulus(seed, cx, cz, n, opt = {}) {
  const rng = mulberry(seed), R = () => rng(); const items = [];
  for (let c = 0; c < n; c++) {
    let x, z; const a = R() * TAU, d = (opt.minR || 0) + Math.pow(R(), .7) * (opt.maxR || 4500); x = cx + Math.cos(a) * d; z = cz + Math.sin(a) * d;
    const base = (opt.base || 700) + R() * (opt.spread || 350); const size = 50 + Math.pow(R(), 1.5) * 220;
    const B = new MB(12000); const blobs = [];
    const k = 6 + (size / 18 | 0);
    for (let i = 0; i < k; i++) {
      const ang = R() * TAU, rr = Math.pow(R(), .6) * size * .6; const bx = Math.cos(ang) * rr, bz = Math.sin(ang) * rr;
      const r = size * (.28 + R() * .3) * (1 - rr / size * .5); const by = r * .45 + R() * size * .25 * (1 - rr / size);
      const shade = .85 + R() * .15; B.col([shade, shade, shade], MAT.PUFF).sph(bx, by, bz, r, r * (.75 + R() * .25), r, 12, 7);
      blobs.push([x + bx, base + by, z + bz, r * .85]);
    }
    // flat-ish base
    B.col([.78, .8, .84], MAT.PUFF).sph(0, size * .12, 0, size * .75, size * .14, size * .7, 14, 5);
    const it = { mesh: B.mesh(), m: M4.trs(M4.create(), M4.create(), x, base, z, 0, 0, 0), pos: [x, base + size * .3, z], r: size * 1.4, alpha: .93, noShadow: true, puff: true, blobs, cx: x, cz: z, base, size };
    items.push(it); PUFFS.blobs.push(...blobs);
  }
  PUFFS.items.push(...items); return items;
}
function puffAt(p) { for (const b of PUFFS.blobs) { const dx = p[0] - b[0], dy = p[1] - b[1], dz = p[2] - b[2]; if (dx * dx + dy * dy + dz * dz < b[3] * b[3]) return true; } return false; }

/* ---------------- the huge world below ---------------- */
function buildDropZone(W) {
  const river = (x, z) => Math.abs(z - Math.sin(x * .0011) * 900 - Math.sin(x * .0037) * 160 - 200);
  W.initTerrain((x, z) => {
    const r = Math.hypot(x, z); let h = fbm(x * .0009, z * .0009, 5) * 150 + fbm(x * .005, z * .005, 3) * 40;
    h += smooth((r - 2600) / 4200) * (fbm(x * .0005 + 7, z * .0005, 5) * 1900 + 300);           // mountain ranges ringing the valley
    h -= Math.max(0, 70 - river(x, z) * .25) * 2.2;                                             // the river valley
    return h;
  }, 80);
  W.buildTerrainMesh((x, z, y, n) => {
    const v = vnoise(x * .01, z * .01), rv = river(x, z);
    if (rv < 28) return { c: lin(0x3a5054), m: MAT.TILE };
    if (rv < 45) return { c: lin(0x6a5e44), m: MAT.MUD };
    if (y > 1500) return { c: lin(0x8a8a86).map(q => q * (.85 + v * .3)), m: MAT.ROCK };
    if (n[1] < .72) return { c: lin(0x4a4a3a).map(q => q * (.8 + v * .4)), m: MAT.ROCK };
    return { c: lin(v > .5 ? 0x1a3418 : 0x24421e).map(q => q * (.7 + vnoise(x * .05, z * .05) * .5)), m: MAT.LEAF };
  });
  const R = () => W.R();
  for (let i = 0; i < 420; i++) { const a = R() * TAU, d = Math.pow(R(), .7) * 1500; const x = Math.cos(a) * d, z = Math.sin(a) * d; if (river(x, z) < 40) continue; const y = W.th(x, z); W.B.col([0x1f3a1c, 0x2a4a22, 0x335026, 0x3a5a2a][R() * 4 | 0], MAT.LEAF).blob(x, y + 14, z, 10 + R() * 9, 7 + R() * 5, i, .4, 8, 5); }
  // a clearing with a smoke flare at the rally point by the river bend
  W.rally = [Math.sin(0) * 0 + 300, 0, Math.sin(300 * .0011) * 900 + 200];
}
