/* =====================================================================
   OVERCAST — PART TWO: THE GREEN. Waking up under the canopy, the dirt
   trail (stray too far and the uplink drops), and the mafia camp.
   ===================================================================== */
const TRAIL = [[0, 330], [14, 290], [-6, 245], [-22, 200], [-8, 160], [18, 120], [26, 80], [8, 40], [-14, 5], [-20, -30], [-4, -65], [10, -95], [6, -122]];
const CAMP = { x: 4, z: -160, r: 34 };
ENV.jungle = { sunDir: V.norm([.35, .85, .25]), sunCol: [.75, .72, .55], sky: [.32, .42, .3], gnd: [.1, .14, .08], fog: [.36, .44, .34], fogD: .024, fogH: 0, zen: [.45, .55, .5], hor: [.5, .58, .5], cloud: .8, skyFog: .95, expo: 1.15, wet: .45, rain: 0, wind: .6 };
function trailDist(x, z) { let best = 1e9, bi = 0, bt = 0; for (let k = 0; k < TRAIL.length - 1; k++) { const a = TRAIL[k], b = TRAIL[k + 1]; const dx = b[0] - a[0], dz = b[1] - a[1]; const L2 = dx * dx + dz * dz; const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / L2, 0, 1); const d = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); if (d < best) { best = d; bi = k; bt = t; } } return { d: best, i: bi, t: bt, p: [lerp(TRAIL[bi][0], TRAIL[bi + 1][0], bt), lerp(TRAIL[bi][1], TRAIL[bi + 1][1], bt)] }; }
function buildJungle(W) {
  const R = () => W.R();
  W.initTerrain((x, z) => fbm(x * .012, z * .012, 4) * 9 + fbm(x * .05, z * .05, 3) * 1.6 - 2, 2);
  W.flattenPath(TRAIL.map(p => [p[0], p[1]]), 2.2, 3);
  W.flatten(CAMP.x - CAMP.r, CAMP.z - CAMP.r, CAMP.x + CAMP.r, CAMP.z + CAMP.r, W.th(CAMP.x, CAMP.z), 8);
  W.buildTerrainMesh((x, z, y, n) => {
    const td = trailDist(x, z).d, cd = Math.hypot(x - CAMP.x, z - CAMP.z) - CAMP.r; const v = vnoise(x * .3, z * .3);
    if (td < 1.3 || cd < -4) return { c: lin(v > .5 ? 0x4a3a28 : 0x3e3020).map(q => q * (.8 + v * .3)), m: MAT.MUD };
    if (td < 2.4 || cd < 0) return { c: lin(0x3a3a22), m: MAT.MUD };
    return { c: lin(v > .5 ? 0x1e3416 : 0x253c1a).map(q => q * (.75 + v * .4)), m: MAT.GRASS };
  });
  W.surfFn = (x, z) => 'mud';
  // vegetation: dense along the band the player can reach, thick walls beyond
  const ok = (x, z, m) => trailDist(x, z).d > m && Math.hypot(x - CAMP.x, z - CAMP.z) > CAMP.r + m * .5;
  for (let i = 0; i < 1500; i++) { const k = (R() * (TRAIL.length - 1)) | 0, t = R(); const a = TRAIL[k], b = TRAIL[k + 1]; const off = (R() < .5 ? -1 : 1) * (5 + Math.pow(R(), .8) * 60); const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const x = lerp(a[0], b[0], t) - (b[1] - a[1]) / L * off, z = lerp(a[1], b[1], t) + (b[0] - a[0]) / L * off; if (!ok(x, z, 4.5)) continue; jungleTree(W, x, z, .7 + R() * .7, R); }
  for (let i = 0; i < 260; i++) { const a = R() * TAU, d = CAMP.r + 4 + R() * 40; const x = CAMP.x + Math.cos(a) * d, z = CAMP.z + Math.sin(a) * d; if (!ok(x, z, 4)) continue; jungleTree(W, x, z, .8 + R() * .6, R); }
  for (let i = 0; i < 3200; i++) { const k = (R() * (TRAIL.length - 1)) | 0, t = R(); const a = TRAIL[k], b = TRAIL[k + 1]; const off = (R() < .5 ? -1 : 1) * (1.9 + Math.pow(R(), 1.4) * 30); const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const x = lerp(a[0], b[0], t) - (b[1] - a[1]) / L * off, z = lerp(a[1], b[1], t) + (b[0] - a[0]) / L * off; if (!ok(x, z, 1.8)) continue; const r = R(); if (r < .45) fernClump(W, x, z, R); else if (r < .8) W.bush(x, z, .8 + R() * 1.4, [0x2a4a22, 0x335a26, 0x1f3a1a, 0x3a5a2a][R() * 4 | 0]); else W.grass(x, z, 10, R() < .5 ? 0x3a5226 : 0x4a5a2a); }
  for (let i = 0; i < 70; i++) { const k = (R() * (TRAIL.length - 1)) | 0; const a = TRAIL[k]; const x = a[0] + rnd(-25, 25), z = a[1] + rnd(-25, 25); if (ok(x, z, 4)) W.tree(x, z, 'palm', .8 + R() * .4); }
  for (let i = 0; i < 60; i++) { const k = (R() * (TRAIL.length - 1)) | 0; const a = TRAIL[k]; const x = a[0] + rnd(-12, 12), z = a[1] + rnd(-12, 12); if (ok(x, z, 2.5)) W.log(x, z, 2 + R() * 4, R() * TAU); }
  for (let i = 0; i < 50; i++) { const k = (R() * (TRAIL.length - 1)) | 0; const a = TRAIL[k]; const x = a[0] + rnd(-14, 14), z = a[1] + rnd(-14, 14); if (ok(x, z, 2.5)) W.rock(x, z, .4 + R() * .8, 0x4a4a40); }
  // hanging vines across the trail
  const D = W.D; D.col(0x2a3a1a, MAT.LEAF); for (let i = 0; i < 160; i++) { const k = (R() * (TRAIL.length - 1)) | 0, t = R(); const a = TRAIL[k], b = TRAIL[k + 1]; const x = lerp(a[0], b[0], t) + rnd(-4, 4), z = lerp(a[1], b[1], t) + rnd(-4, 4); const y = W.th(x, z); D.tube([x, y + 9 + R() * 5, z], [x + rnd(-.4, .4), y + 2.6 + R() * 2, z + rnd(-.4, .4)], .025, .02, 4); }
  // the wake-up spot: tangled reserve canopy in the branches, a broken branch, scattered kit
  const wk = TRAIL[0], wy = W.th(wk[0], wk[1]); const B = W.B;
  B.col(0x3a3f30, MAT.CANVAS); for (let i = 0; i < 6; i++) B.push().t(wk[0] + 2 + i * .9, wy + 7 + Math.sin(i) * .8, wk[1] - 3 + Math.cos(i * 1.3)).rz(Math.sin(i) * .5).rx(.4 + i * .1).box(0, 0, 0, 1.4, .02, 2.2).pop();
  B.col(0xbbbbb0, MAT.PAINT); for (let i = 0; i < 8; i++) B.tube([wk[0] + 3 + i * .5, wy + 6.6, wk[1] - 3], [wk[0] + .3, wy + .4, wk[1] + .3], .006, .006, 3);
  B.col(0x4a3a2a, MAT.BARK).tube([wk[0] - 1.5, wy + .1, wk[1] + 1.2], [wk[0] + 1.8, wy + .3, wk[1] + 2.3], .09, .05, 6);
  B.col(0x3a3f30, MAT.CANVAS).box(wk[0] - 1.1, wy + .12, wk[1] - .8, .38, .2, .5); B.col(0x111111, MAT.RUBBER).box(wk[0] + 1.2, wy + .05, wk[1] - .2, .2, .06, .1);
  // ---------- the camp ----------
  const cx = CAMP.x, cz = CAMP.z, cy = W.th(cx, cz);
  tent(W, cx - 10, cz + 4, .3, 5, 7, 0x4a5a6a, { open: true }); tent(W, cx + 9, cz - 6, -.5, 6, 6, 0x6a5a3a, { open: true });
  // campfire, logs as seats, cooking pot
  B.col(0x2a2622, MAT.ROCK); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; B.blob(cx + Math.cos(a) * .7, cy + .1, cz + Math.sin(a) * .7, .2, .13, i, .3, 6, 4); }
  B.col(0x1a1410, MAT.BARK); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; B.tube([cx + Math.cos(a) * .5, cy + .05, cz + Math.sin(a) * .5], [cx, cy + .45, cz], .05, .03, 5); }
  for (const a of [0, 2.1, 4.2]) W.log(cx + Math.cos(a) * 2.4, cz + Math.sin(a) * 2.4, 2.2, a + Math.PI / 2);
  B.col(0x333333, MAT.METAL).tube([cx - .7, cy, cz - .7], [cx, cy + 1.3, cz], .02, .02, 4).tube([cx + .7, cy, cz - .7], [cx, cy + 1.3, cz], .02, .02, 4).tube([cx, cy, cz + .8], [cx, cy + 1.3, cz], .02, .02, 4); B.col(0x1a1a1a, MAT.METAL).cyl(cx, cy + .7, cz, .22, .2, .3, 12);
  W.fire = [cx, cy + .3, cz];
  // tables, crates of contraband, a truck, generator + string lights, hammock, drug-cook drums
  B.col(0x5a4a32, MAT.WOOD).box(cx + 6, cy + .78, cz + 6, 2.2, .08, 1); for (const s of [-1, 1]) for (const e of [-1, 1]) B.box(cx + 6 + s * 1, cy + .38, cz + 6 + e * .4, .08, .76, .08);
  W.colBox(cx + 6, cy + .4, cz + 6, 2.2, .8, 1, {}); B.col(0xd8d0b0, MAT.PAINT).box(cx + 5.6, cy + .83, cz + 6, .5, .02, .35); B.col(0xe8e8e0, MAT.PLASTIC); for (let i = 0; i < 6; i++) B.box(cx + 6.2 + (i % 3) * .2, cy + .86, cz + 5.9 + (i / 3 | 0) * .2, .16, .06, .12);
  B.col(0x2a2a2a, MAT.METAL).box(cx + 6.7, cy + .92, cz + 6.1, .18, .2, .12); B.col(0xc8a020, MAT.PAINT).box(cx + 5.3, cy + .86, cz + 6.2, .3, .04, .2);
  for (let i = 0; i < 8; i++) W.crate(cx - 14 + (i % 4) * 1, cz - 8 + (i / 4 | 0) * 1, cy, .9, .8, .9, 0x6a5a3a);
  for (let i = 0; i < 5; i++) W.barrel(cx - 3 + i * .7, cz - 13, cy, i % 2 ? 0x2a4a6a : 0x6a6a5a);
  W.tires(cx + 13, cz + 2, cy);
  const truck = buildCar('pickup', 0x7a2a20); W.campTruck = { car: truck, pos: [cx + 15, cy, cz + 9], yaw: 2.2 }; W.colBox(cx + 15, cy + 1, cz + 9, 3.4, 2, 3.4, {});
  W.campGen = W.generator(cx - 16, cz + 9, 1);
  const bulbs = []; B.col(0x111111, MAT.RUBBER); let prev = [cx - 15, cy + 3, cz + 8]; for (let i = 1; i <= 10; i++) { const p = [lerp(cx - 15, cx + 12, i / 10), cy + 3 - Math.sin(i / 10 * Math.PI) * .6, lerp(cz + 8, cz - 4, i / 10)]; B.tube(prev, p, .01, .01, 3); B.col(0xffe0a0, MAT.EMIT).sph(p[0], p[1] - .08, p[2], .05, .07, .05, 6, 4); B.col(0x111111, MAT.RUBBER); bulbs.push(p); prev = p; }
  for (const p of [[cx - 15, cz + 8], [cx + 12, cz - 4]]) B.col(0x5a4a32, MAT.WOOD).cyl(p[0], cy, p[1], .07, .06, 3.1, 6);
  W.light([cx - 2, cy + 2.6, cz + 2], 0xffd8a0, 1.2, 14); W.light([cx + 8, cy + 2.6, cz - 1], 0xffd8a0, 1.0, 12);
  B.col(0x8a4a2a, MAT.CANVAS); B.begin(); B.quad([cx - 6, cy + 1.1, cz - 12], [cx - 2, cy + 1.1, cz - 12], [cx - 2.3, cy + .8, cz - 11.4], [cx - 5.7, cy + .8, cz - 11.4]);
  B.col(0x2a2826, MAT.METAL).cyl(cx - 7, cy, cz + 12, .45, .45, 1.0, 12).cyl(cx - 5.8, cy, cz + 12, .45, .45, 1.0, 12); B.col(0x1a1a1a, MAT.METAL).box(cx - 6.4, cy + 1.05, cz + 12, 2.2, .08, .9);
  // the trail continues beyond the camp (where Mox is — next time)
  W.campCenter = [cx, cy, cz];
}

/* ======================= PART TWO DIRECTOR ======================= */
const Part2 = {
  start() {
    const S = Story; S.cos = []; G.timers = []; P.handFn = null; S.interacts = []; G.actors = []; G.extraDyn = []; G.glass = []; G.updaters = []; G.particles = []; G.dynLights = []; G.dry = []; G.S.mirror = null; G.S.planeInv = null;
    Story.phase = 'p2'; Story.plane = null; R.drawDist = 260; R.detailDist = 60; G.cam.far = 900; G.S.maxDraw = 900; G.raysOn = .55; R.post.grade = [1, 1, 1];
    UI.loading(true);
    setTimeout(() => {
      try {
        if (!this.W) { const W = new World(900, 31); buildJungle(W); W.chunks = buildChunks(W.B, W.D, 40); W.B = null; W.D = null; W.buildNav(1); this.W = W; }
        Story.useWorld(this.W); G.env = Object.assign({}, ENV.jungle, { sunDir: V.copy(ENV.jungle.sunDir) }); G.envT = 1;
        const v = this.W.campTruck; const b = new Float32Array(7 * 16); const m = M4.create(); M4.translate(m, m, v.pos[0], v.pos[1], v.pos[2]); M4.rotY(m, m, v.yaw); const t = M4.create(); b.set(m, 0); for (let i = 0; i < 4; i++) { const wp = v.car.wheelPos[i]; M4.translate(t, m, wp[0], wp[1], wp[2]); b.set(t, (1 + i) * 16); } b.set(m, 80); b.set(m, 96); G.extraDyn.push({ mesh: v.car.mesh, bones: b, pos: v.pos, r: 5 });
        UI.loading(false); this.begin();
      } catch (e) { console.error(e); UI.fatal(e); }
    }, 60);
  },
  begin() {
    const W = this.W; UI.card(['PART TWO', 'THE GREEN', '']); P.reset(); P.combat = false; P.lookLock = false; P.inPlane = false; P.health = 100;
    // lying on your back in the leaves
    const wk = TRAIL[0]; P.pos = [wk[0] + .3, W.th(wk[0] + .3, wk[1] + .2), wk[1] + .2]; P.yaw = Math.PI * .1; P.pitch = .9; P.state = 'locked'; P.backOff = 0;
    P.lookLimit = { yaw: P.yaw, yawR: .9, pMin: .2, pMax: 1.35 };
    const lie = { k: 1 }; this.lie = lie;
    P.poseFn = (j) => { pj(j, SK.UAL, .2, 0, -.5); pj(j, SK.UAR, .3, 0, .6); pj(j, SK.FAL, .4, 0, 0); pj(j, SK.FAR, .2, 0, 0); pj(j, SK.THL, .2, .1, -.1); pj(j, SK.SHL, -.4, 0, 0); pj(j, SK.HD, .2 * lie.k, .3 * lie.k, 0); return 0; };
    P.rootFn = (r) => { const k = lie.k; M4.translate(r, r, 0, .18 * k, .0); M4.rotX(r, r, 1.5 * k); if (lie.sit) { M4.translate(r, r, 0, -.0, 0); } };
    this.ambience = AUD.ambience('swamp'); this.birdT = 2;
    G.updaters.push(dt => this.update(dt));
    UI.fadeV = 1; R.post.fade = 1; this.blur = 1;
    const me = Cabin.me();
    Story.run(function* () {
      yield 2; UI.hint('[E]  WAKE UP'); yield () => IN.hit('KeyE'); UI.hint('');
      // eyes open: three heavy blinks
      for (const [to, d] of [[.35, .5], [.9, .35], [.15, .6], [.7, .3], [0, 1.2]]) { UI.fadeTo(to, d); yield d; }
      AUD.hurt && AUD.hurt(); P.shake = .4;
      yield Story.say(me, "...ngh. Where—");
      yield .6; UI.hint('[E]  SIT UP'); yield () => IN.hit('KeyE'); UI.hint('');
      let t = 0; P.lookLimit = null; G.updaters.push(dt => { if (t > 1.6) return; t += dt; lie.k = 1 - smooth(t / 1.4); P.pitch = lerp(.9, -.25, smooth(t / 1.4)); });
      P.poseFn = (j) => { if (lie.k > .2) { pj(j, SK.HD, .2, .3, 0); return 0; } pj(j, SK.THL, 1.45, .2, -.15); pj(j, SK.THR, 1.25, -.3, .2); pj(j, SK.SHL, -.5, 0, 0); pj(j, SK.SHR, -1.2, 0, 0); pj(j, SK.CH, .25, 0, 0); pj(j, SK.UAL, -.3, 0, -.3); pj(j, SK.FAL, .3, 0, 0); pj(j, SK.UAR, .5, 0, .2); pj(j, SK.FAR, 1.2, 0, 0); return -.82; };
      P.blendK = 3; yield 1.8;
      P.lookLimit = { yaw: P.yaw, yawR: 1.6, pMin: -.8, pMax: .9 };
      yield Story.say(me, "Raven... the missile. They hit Raven.");
      yield .5; AUD.click(1600, .2, null, .03); yield Story.say(me, "Mox? Mox, come in. Anyone on this net?");
      yield .4; AUD.radioCrackle(1.6); yield 1.8;
      yield Story.say(me, "Nothing. Radio's half dead.");
      yield .4; yield Story.say(me, "Rally point was the river bend. There's a trail... has to lead somewhere.");
      yield .4; UI.hint('[E]  STAND UP'); yield () => IN.hit('KeyE'); UI.hint('');
      let u = 0; P.poseFn = (j) => { u += G.dt; const k = smooth(u / 1.2); poseIdle(j, G.time, 'idle', 1.3); pj(j, SK.THL, 1.45 * (1 - k), .2, -.15); pj(j, SK.THR, 1.25 * (1 - k), -.3, .2); pj(j, SK.SHL, -.5 - k * 0, 0, 0); pj(j, SK.CH, .25 * (1 - k), 0, 0); return -.82 * (1 - k); };
      yield 1.4; P.poseFn = null; P.rootFn = null; P.lookLimit = null; P.backOff = null; P.blendK = 9; P.state = 'walk'; P.shake = .3;
      UI.objective('Follow the trail'); UI.hint('WASD  MOVE   ·   SHIFT  JOG   ·   CTRL  CROUCH   ·   RMB  ZOOM'); G.after(6, () => UI.hint(''));
      Part2.lastSafe = V.copy(P.pos);
    });
  },
  update(dt) {
    // ambience: birds, insects, distant howler monkeys
    this.birdT -= dt; if (this.birdT <= 0) { this.birdT = 1.5 + Math.random() * 4; const a = Math.random() * TAU; const p = V.add(P.pos, [Math.cos(a) * 25, 8 + Math.random() * 10, Math.sin(a) * 25]); if (AUD.ready) { if (Math.random() < .7) AUD.bird(p); else AUD.cricket(p); } }
    // sun shafts and drifting pollen in the canopy
    if (Math.random() < .4) G.particles.push({ p: V.add(G.cam.pos, [rnd(-6, 6), rnd(-1, 4), rnd(-6, 6)]), v: [rnd(-.05, .05), rnd(-.03, .02), rnd(-.05, .05)], life: 0, max: 6, s: .01, c: [1, .95, .7], a: .7, add: true, fadeIn: true });
    if (Math.random() < .08) G.puff(V.add(P.pos, [rnd(-15, 15), rnd(0, .6), rnd(-15, 15)]), { s: rnd(1.5, 3), grow: .4, c: [.5, .58, .48], a: .12, max: 9, v: [rnd(-.1, .1), .03, rnd(-.1, .1)], g: 0, drag: 0 });
    // the uplink: wander off the trail and the signal (and you) are lost
    if (P.state === 'walk' && !this.lost) {
      const td = trailDist(P.pos[0], P.pos[2]); const cd = Math.hypot(P.pos[0] - CAMP.x, P.pos[2] - CAMP.z) - CAMP.r; const d = Math.min(td.d, Math.max(0, cd));
      const warn = clamp((d - 8) / 7, 0, 1); R.post.slow = warn * .8; UI.signal(warn);
      if (d < 6) this.lastSafe = [td.p[0], this.W.th(td.p[0], td.p[1]), td.p[1]];
      if (d > 15) this.connectionLost();
    }
    if (P.combat) Combat.update(dt);
    if (!P.combat && !this.campSeen && Math.hypot(P.pos[0] - CAMP.x, P.pos[2] - CAMP.z) < 95) this.approachCamp();
  },
  connectionLost() {
    this.lost = true; UI.lost(true); AUD.denied(); P.state = 'off'; R.post.slow = 1;
    setTimeout(() => { const s = this.lastSafe || [TRAIL[0][0], 0, TRAIL[0][1]]; P.pos = V.copy(s); P.vel = [0, 0, 0]; const nx = TRAIL[Math.min(trailDist(s[0], s[2]).i + 1, TRAIL.length - 1)]; P.yaw = Math.atan2(-(nx[0] - s[0]), -(nx[1] - s[2])); P.state = 'walk'; R.post.slow = 0; UI.lost(false); this.lost = false; }, 2600);
  },
  approachCamp() {
    this.campSeen = true; const me = Cabin.me(); Combat.build(this.W);
    Story.run(function* () {
      yield .3; UI.hint(''); yield Story.say(me, "Voices. Up ahead.");
      yield Story.say(me, "...those aren't our guys. Cartel. Better stay low.");
      UI.objective('Deal with the camp'); P.combat = true; Combat.tutorial();
    });
  },
};
