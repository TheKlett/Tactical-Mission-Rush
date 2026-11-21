/* =====================================================================
   OVERCAST — PART THREE: THE RIVER. Down the trail to the rally point,
   Mox and the survivors, a rifle, and the cartel comes across the water
   in three waves: the far bank, the ford, and the trail behind you.
   ===================================================================== */
const RIVER = { y: -.9, z: -150, w: 34 };           // river runs along x; centre line wiggles a bit
const TRAIL3 = [[-40, 140], [-28, 100], [-34, 60], [-20, 25], [-6, -10], [4, -45], [8, -80], [10, -112]];
const RALLY = { x: 12, z: -122, x0: -30, x1: 70, z0: -136, z1: -100 };
const FORD = { x: 58 };
ENV.river = { sunDir: V.norm([-.5, .55, -.35]), sunCol: [1.25, 1.0, .72], sky: [.4, .46, .42], gnd: [.16, .18, .12], fog: [.55, .58, .5], fogD: .009, fogH: 0, zen: [.4, .5, .62], hor: [.75, .72, .62], cloud: .6, skyFog: .7, expo: 1.1, wet: .3, rain: 0, wind: .8 };
const riverZ = x => RIVER.z + Math.sin(x * .018) * 6;
function trail3Dist(x, z) { let best = 1e9, bi = 0, bt = 0; for (let k = 0; k < TRAIL3.length - 1; k++) { const a = TRAIL3[k], b = TRAIL3[k + 1]; const dx = b[0] - a[0], dz = b[1] - a[1]; const L2 = dx * dx + dz * dz; const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / L2, 0, 1); const d = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); if (d < best) { best = d; bi = k; bt = t; } } return { d: best, i: bi, p: [lerp(TRAIL3[bi][0], TRAIL3[bi + 1][0], bt), lerp(TRAIL3[bi][1], TRAIL3[bi + 1][1], bt)] }; }
function buildRiver(W) {
  const R = () => W.R();
  W.initTerrain((x, z) => {
    const rz = riverZ(x), dz = z - rz; const ad = Math.abs(dz);
    let h = fbm(x * .015, z * .015, 4) * 6 + 1.2;
    const bed = ad < RIVER.w / 2 ? -2.6 + smooth(ad / (RIVER.w / 2)) * 1.6 : -1 + smooth((ad - RIVER.w / 2) / 14) * (h + 1);
    const ford = Math.abs(x - FORD.x) < 9 ? (1 - smooth(Math.abs(x - FORD.x) / 9)) : 0;   // shallow gravel ford
    let y = ad < RIVER.w / 2 + 14 ? bed : h; y = lerp(y, Math.max(y, -1.15), ford);
    if (dz > 0 && dz < 34 && x > RALLY.x0 - 10 && x < RALLY.x1 + 10) y = lerp(y, .1 + dz * .05, .85);  // the gravel beach + bank on our side
    return y;
  }, 2);
  W.flattenPath(TRAIL3, 2.2, 3);
  W.buildTerrainMesh((x, z, y, n) => {
    const v = vnoise(x * .3, z * .3), td = trail3Dist(x, z).d, dz = z - riverZ(x);
    if (y < RIVER.y + .2) return { c: lin(v > .5 ? 0x5a5a48 : 0x4a4a3a), m: MAT.ROCK };
    if (td < 1.3) return { c: lin(0x4a3a28), m: MAT.MUD };
    if (dz > 0 && dz < 22 && x > RALLY.x0 - 6 && x < RALLY.x1 + 6) return { c: lin(v > .5 ? 0x7a7260 : 0x6a6452).map(q => q * (.85 + v * .3)), m: MAT.ROCK };
    if (y < RIVER.y + 1.4) return { c: lin(0x4a4430), m: MAT.MUD };
    return { c: lin(v > .5 ? 0x1e3416 : 0x253c1a).map(q => q * (.75 + v * .4)), m: MAT.GRASS };
  });
  W.setWater(RIVER.y, lin(0x2e3a2a), lin(0x14201a), .82, 1.2); W.surfFn = () => 'mud';
  const inRally = (x, z, m = 0) => x > RALLY.x0 - m && x < RALLY.x1 + m && z > RALLY.z0 - m && z < RALLY.z1 + m;
  const freeVeg = (x, z, m) => trail3Dist(x, z).d > m && !inRally(x, z, m) && Math.abs(z - riverZ(x)) > RIVER.w / 2 + 3;
  // jungle both banks, a wall of green across the water
  for (let i = 0; i < 2600; i++) { const x = rnd(-170, 200), z = rnd(-260, 170); if (!freeVeg(x, z, 4)) continue; const far = z < riverZ(x); if (!far && trail3Dist(x, z).d > 70 && R() < .6) continue; jungleTree(W, x, z, .7 + R() * .7, R); }
  for (let i = 0; i < 5000; i++) { const x = rnd(-150, 180), z = rnd(-240, 160); if (!freeVeg(x, z, 1.8)) continue; const k = R(); if (k < .4) fernClump(W, x, z, R); else if (k < .75) W.bush(x, z, .8 + R() * 1.3, [0x2a4a22, 0x335a26, 0x1f3a1a][R() * 3 | 0]); else W.grass(x, z, 10, 0x3a5226); }
  for (let i = 0; i < 80; i++) { const x = rnd(-100, 150), z = riverZ(x) + (R() < .5 ? -1 : 1) * (RIVER.w / 2 + rnd(1, 5)); if (!inRally(x, z, 2)) W.reeds(x, z, 14, 0x6a7a3a); }
  for (let i = 0; i < 40; i++) { const x = rnd(-120, 160), z = riverZ(x) + (R() < .5 ? -1 : 1) * (RIVER.w / 2 + rnd(3, 12)); if (freeVeg(x, z, 2)) W.tree(x, z, 'palm', .8 + R() * .4); }
  // the rally point: gravel beach, boulders and logs for cover, a piece of Raven's wing, kit, a smoking flare
  const B = W.B; const gy = (x, z) => W.th(x, z);
  for (const [x, z, s] of [[-4, -128, 1.3], [8, -131, 1.6], [24, -129, 1.2], [36, -130, 1.5], [48, -127, 1.1], [-14, -124, 1], [60, -126, 1.3], [16, -114, .8], [30, -110, 1]]) W.rock(x, z, s, 0x6a6a5e);
  W.log(0, -120, 6, .2); W.log(40, -121, 7, -.15); W.log(22, -104, 5, 1.2);
  { const m = M4.create(); M4.translate(m, m, 54, gy(54, -116) + .6, -116); M4.rotY(m, m, .7); M4.rotZ(m, m, .25); M4.rotX(m, m, -.08); W.wing = m; W.colBox(54, gy(54, -116) + .8, -116, 7, 1.8, 3, { surf: 'metal' }); }
  W.crate(4, -112, gy(4, -112), .9, .6, .9, 0x4a5432); W.crate(5.2, -112.3, gy(5.2, -112.3), .7, .5, .7, 0x4a5432);
  B.col(0x4a5038, MAT.CANVAS).box(-2, gy(-2, -111) + .15, -111, 1.8, .2, .9); B.col(0x2a2e26, MAT.CANVAS).sph(-3.2, gy(-3.2, -110) + .2, -110, .3, .2, .45, 8, 4);
  W.ammoBox = [4.6, gy(4, -112) + .7, -112]; W.flare = [14, gy(14, -116) + .1, -116];
  // the far bank: a dirt track down to the water where their trucks come in
  W.farTrack = [[-60, -205], [-20, -190], [20, -186], [60, -190], [100, -205]];
  for (const [x, z] of W.farTrack) W.grass(x, z, 0);
  return W;
}

const Part3 = {
  start() {
    const S = Story; S.cos = []; G.timers = []; P.handFn = null; S.interacts = []; G.actors = []; G.extraDyn = []; G.glass = []; G.updaters = []; G.particles = []; G.dynLights = []; G.dry = []; G.S.mirror = null; G.S.planeInv = null;
    Story.phase = 'p3'; Story.plane = null; R.drawDist = 300; R.detailDist = 60; G.cam.far = 900; G.S.maxDraw = 900; G.raysOn = .8; R.post.grade = [1, 1, 1];
    Combat.built = false; P.combat = false; UI.loading(true);
    setTimeout(() => {
      try {
        if (!this.W) { const W = new World(520, 47); buildRiver(W); W.chunks = buildChunks(W.B, W.D, 40); W.B = null; W.D = null; W.buildNav(1); this.W = W; }
        Story.useWorld(this.W); G.S.water = this.W.water; G.env = Object.assign({}, ENV.river, { sunDir: V.copy(ENV.river.sunDir) }); G.envT = 1;
        const wing = buildDebris('wing'); G.extraDyn.push({ mesh: wing, m: this.W.wing, pos: [54, 0, -116], r: 8 });
        UI.loading(false); UI.fadeTo(0, 2); this.begin();
      } catch (e) { console.error(e); UI.fatal(e); }
    }, 60);
  },
  ally(name, app, o) { const a = new Actor(app, Object.assign({ name, weapon: 'rifle', weaponMode: 'low', gear: true, gearOpts: { goggles: false } }, o)); a.groundFn = (x, z) => this.W.th(x, z); a.pos[1] = a.groundFn(a.pos[0], a.pos[2]); G.actors.push(a); return a; },
  begin() {
    const W = this.W; Progress.reach(3); UI.card(['PART THREE', 'THE RIVER', '']); P.reset(); P.lookLock = false; P.inPlane = false; P.health = 100; P.limp = 1;
    const band = new MB(500); band.b(0); band.col(0xe8e4d8, MAT.CLOTH).cyl(0, -.34, 0, .074, .07, .2, 12); band.col(0x7a0a08, MAT.BLOOD).cyl(0, -.27, -.002, .075, .072, .07, 12); P.addProp(band.mesh(), SK.SHR, M4.create());
    const t0 = TRAIL3[0]; P.pos = [t0[0], W.th(t0[0], t0[1]), t0[1]]; P.yaw = Math.atan2(-(TRAIL3[1][0] - t0[0]), -(TRAIL3[1][1] - t0[1])); P.pitch = -.05; P.state = 'walk';
    this.ambience = AUD.ambience('swamp'); this.river = AUD.synthLoop({ ref: 14, noise: [{ type: 'pink', ft: 'bandpass', f: 1400, v: .9, q: .5 }, { type: 'brown', ft: 'lowpass', f: 300, v: .7 }] }, [RALLY.x, RIVER.y, riverZ(RALLY.x)]);
    G.updaters.push(dt => this.update(dt));
    // squad at the rally point
    const rng = mulberry(311); const me = Cabin.me();
    const moxApp = Object.assign({}, (Cabin.mox && Cabin.mox.app) || soldierApp(rng)); this.mox = this.ally('Mox', moxApp, { pos: [10, 0, -118], yaw: 0, pitch: 128, vpitch: 1.05, vrate: 1.05, voiceIdx: 1, gearOpts: { goggles: true } }); this.mox.acc = .2;
    this.diaz = this.ally('Diaz', soldierApp(rng, { skin: 0xa87452, hairStyle: 'buzz' }), { pos: [26, 0, -126.5], yaw: 0, anim: 'crouch', voiceIdx: 2 }); this.diaz.acc = .16;
    this.reyes = this.ally('Reyes', soldierApp(rng, { skin: 0xe0b896, beard: 'stubble' }), { pos: [-6, 0, -125.5], yaw: .2, anim: 'crouch', voiceIdx: 3 }); this.reyes.acc = .14;
    this.okafor = this.ally('Okafor', soldierApp(rng, { skin: 0x6b4430, head: 'none', hairStyle: 'buzz' }), { pos: [-2.2, 0, -110], yaw: 2.6, anim: 'sit', seat: 'lean', weapon: 'pistol', weaponMode: 'sling', voiceIdx: 4 });
    { const hb = new MB(400); hb.b(0); hb.col(0xe8e4d8, MAT.CLOTH).cyl(0, -.2, 0, .1, .09, .14, 10); hb.col(0x7a0a08, MAT.BLOOD).box(.05, -.16, -.06, .06, .08, .02); this.okafor.addProp(hb.mesh(), SK.UAL, M4.create()); }
    for (const a of [this.mox, this.diaz, this.reyes]) a.combatReady = true;
    // flare smoke at the rally point (you can see it from the trail)
    G.updaters.push(() => { if (Math.random() < .5) G.puff(V.add(W.flare, [rnd(-.1, .1), .2, rnd(-.1, .1)]), { s: rnd(.3, .6), grow: 1.4, c: [.75, .2, .15], a: .45, max: 9, v: [rnd(.4, 1.1), rnd(.8, 1.6), rnd(-.3, .3)], drag: .15 }); });
    Story.run(function* () {
      yield 2; UI.objective('Reach the rally point at the river bend'); UI.marker(() => [RALLY.x, W.th(RALLY.x, RALLY.z) + 2, RALLY.z]);
      yield Story.say(me, "Red smoke. That's ours.");
      yield () => V.dist(P.pos, [10, P.pos[1], -112]) < 14; UI.marker(null); UI.objective('');
      const mox = Part3.mox; mox.look = () => G.cam.pos;
      yield Story.say(mox, "Rook! Over here — stay low.");
      { const tp = V.add(P.pos, V.sc(V.norm(V.sub(mox.pos, P.pos)), 1.8)); if (V.dist(P.pos, mox.pos) > 4) mox.goTo([[tp[0], 0, tp[2]]]); }
      yield () => V.dist(P.pos, mox.pos) < 4.5 || !mox.path; mox.path = null; mox.yaw = Math.atan2(-(P.pos[0] - mox.pos[0]), -(P.pos[2] - mox.pos[2]));
      yield Story.say(mox, "This is all of us. Diaz, Reyes. Okafor took one in the arm, he's still in it.");
      yield Story.say(Part3.okafor, "Barely. Good to see you walking, rookie.");
      yield Story.say(mox, "No sign of the others. Radio's jammed — someone out here doesn't want us talking.");
      yield .3; yield Story.say(mox, "You can't hold a line with a pistol. Take Brandt's rifle. He won't need it.");
      // Mox holds the rifle out
      const rifle = Part3.giftRifle = { mesh: buildRifleWorld(), m: M4.create(), pos: V.copy(mox.pos), r: 1 }; G.extraDyn.push(rifle); let h = 0;
      mox.post = (a, dt) => { h += dt; const c = a.rig.mats[SK.CH]; const k = smooth(h / .8); const hp = V.lerp(M4.pt(c, .25, -.1, -.15), M4.pt(c, .05, .05, -.55), k); a.ik.push({ left: false, T: hp, pole: M4.dir(a.root, 1, -1, 0) }); a.ik.push({ left: true, T: V.add(hp, M4.dir(a.root, -.3, .03, -.05)), pole: M4.dir(a.root, -1, -1, 0) });
        M4.basis(rifle.m, M4.dir(a.root, 0, 0, -1), [0, 1, 0], M4.dir(a.root, -1, 0, 0), V.add(hp, [0, .04, 0])); rifle.pos = hp; };
      Story.interacts.push({ pos: () => rifle.pos, r: 2.4, cone: 1, label: '[E]  TAKE THE RIFLE', enabled: () => !Part3.gotRifle, act: () => { Part3.gotRifle = true; } });
      yield () => Part3.gotRifle; AUD.mech('pickup'); G.extraDyn.splice(G.extraDyn.indexOf(rifle), 1); mox.post = null;
      Combat.build(W, Part3.combatCfg()); P.combat = true; Combat.giveRifle(false);
      UI.hint('[1]  PISTOL   ·   [2]  RIFLE   ·   [R]  RELOAD   ·   HOLD [LMB]  AUTOMATIC FIRE'); G.after(8, () => UI.hint(''));
      yield Story.say(mox, "Grab ammo from the green crate if you need it. Then we wait for the boats and get—");
      // engines across the water
      yield .5; AUD.carPass && AUD.carPass(); yield 1.4;
      yield Story.say(Part3.diaz, "Trucks! Far bank — two, three of 'em!");
      yield Story.say(mox, "Contact front! Everybody down behind the rocks!");
      UI.objective('Hold the rally point'); Part3.wave(1);
    });
    Story.interacts.push({ pos: W.ammoBox, r: 2.2, cone: .9, label: '[E]  REFILL AMMUNITION', enabled: () => P.combat, act: () => { for (const k in Combat.weps) { const w = Combat.weps[k]; w.ammo.res = w.st.rifle ? 150 : 48; } AUD.mech('pickup'); UI.subtitle('', 'Ammunition refilled.'); } });
  },
  combatCfg() {
    return {
      waves: true, allies: [this.mox, this.diaz, this.reyes],
      spawn: () => { },
      tick: (C, dt) => this.waveTick(dt),
      respawn: (C) => { // back behind the rocks, current wave starts over
        for (const e of C.enemies.slice()) if (!e.dead && e.wave === this.cur) C.removeEnemy(e);
        P.pos = [12, this.W.th(12, -116), -116]; P.yaw = 0; P.pitch = 0; P.crouchWant = true;
        for (const k in C.weps) { const w = C.weps[k]; w.ammo.mag = w.st.mag; w.ammo.res = w.st.rifle ? 150 : 48; }
        G.after(2, () => this.wave(this.cur));
      },
    };
  },
  /* ---------------- waves ---------------- */
  wave(n) {
    this.cur = n; this.waveT = 0; const W = this.W; const C = Combat; const last = [12, 0, -120];
    const fz = x => riverZ(x) - RIVER.w / 2 - rnd(3, 8);
    if (n === 1) { // the far bank: they pile out of the trucks and shoot across the water
      this.trucks = [];
      for (const [i, x] of [-10, 25, 62].entries()) { const car = buildCar('pickup', [0x7a2a20, 0x2a3a5a, 0x5a5a48][i]); const t = { car, pos: [x - 60, W.th(x - 60, -196), -196], yaw: -Math.PI / 2, tx: x, b: new Float32Array(7 * 16) }; t.dyn = { mesh: car.mesh, bones: t.b, pos: t.pos, r: 5 }; G.extraDyn.push(t.dyn); this.trucks.push(t); t.snd = AUD.engineLoop && AUD.engineLoop('car', t.pos); }
      G.after(4.5, () => { for (let i = 0; i < 7; i++) { const x = rnd(-25, 75); C.addEnemy({ x, z: -196, yaw: 0, wk: i % 3 === 2 ? 'smg' : 'ak', mode: 'combat', hold: true, wave: 1, last, path: [[x + rnd(-3, 3), fz(x)]], name: ['Chucho', 'Lalo', 'Memo', 'Tito', 'Rafa', 'Beto', 'Nacho'][i] }); } G.speak(C.enemies[C.enemies.length - 1], '¡Ahí están! ¡En la playa!'); });
    } else if (n === 2) { // the ford: a squad wades across downstream under covering fire
      for (let i = 0; i < 6; i++) { const x = FORD.x + rnd(-4, 4); C.addEnemy({ x: x + 10, z: -200 - i * 2, yaw: 0, wk: i === 0 ? 'shotgun' : 'ak', mode: 'combat', wave: 2, last: [40, 0, -118], path: [[x, riverZ(x) - RIVER.w / 2 - 2], [x - 2, riverZ(x)], [x - 6, riverZ(x) + RIVER.w / 2 + 3]], name: 'Sicario' }); }
      for (let i = 0; i < 2; i++) { const x = rnd(0, 50); C.addEnemy({ x, z: -198, yaw: 0, wk: 'ak', mode: 'combat', hold: true, wave: 2, last, path: [[x, fz(x)]] }); }
    } else if (n === 3) { // the flank: down the trail you came by
      const t = TRAIL3[TRAIL3.length - 3]; for (let i = 0; i < 6; i++) C.addEnemy({ x: t[0] + rnd(-4, 4), z: t[1] + 10 + i * 2.5, yaw: Math.PI, wk: ['ak', 'smg', 'ak', 'shotgun', 'ak', 'ak'][i], mode: 'combat', wave: 3, last: [6, 0, -108], path: [[TRAIL3[TRAIL3.length - 2][0] + rnd(-3, 3), TRAIL3[TRAIL3.length - 2][1]], [rnd(-10, 25), rnd(-110, -102)]], name: 'Sicario' });
      G.after(.5, () => G.speak(this.okafor, 'BEHIND US! On the trail!'));
    }
  },
  waveTick(dt) {
    this.waveT += dt; const C = Combat; const alive = C.enemies.filter(e => !e.dead && e.wave === this.cur).length;
    // trucks drive in along the far track and stop
    if (this.trucks) for (const t of this.trucks) { const dx = t.tx - t.pos[0]; const sp = Math.min(9, Math.max(0, dx) * .8); t.pos[0] += sp * dt; t.pos[1] = this.W.th(t.pos[0], t.pos[2]); t.wr = (t.wr || 0) + sp * dt / .42;
      const m = M4.create(); M4.translate(m, m, t.pos[0], t.pos[1], t.pos[2]); M4.rotY(m, m, t.yaw); const tm = M4.create(); t.b.set(m, 0); for (let i = 0; i < 4; i++) { const wp = t.car.wheelPos[i]; M4.translate(tm, m, wp[0], wp[1], wp[2]); M4.rotX(tm, tm, -t.wr); t.b.set(tm, (1 + i) * 16); } t.b.set(m, 80); t.b.set(m, 96); if (t.snd) t.snd.set(sp / 9, .9, t.pos); }
    if (this.waveT < 6 || alive > (this.cur === 1 ? 1 : 0)) return;
    if (this.cur === 1 && !this._w2) { this._w2 = true; for (const e of C.enemies) if (!e.dead && e.wave === 1) { e.hold = false; } Story.run(function* () { yield Story.say(Part3.mox, 'Reloading! Watch the ford — downstream!'); yield 2; Part3.wave(2); }); }
    else if (this.cur === 2 && !this._w3) { this._w3 = true; Story.run(function* () { yield Story.say(Part3.diaz, "That's the last of them at the ford!"); yield 3; Part3.wave(3); }); }
    else if (this.cur === 3 && !this._end) { this._end = true; this.ending(); }
  },
  ending() {
    const me = Cabin.me(), mox = this.mox; UI.objective(''); for (const a of [this.mox, this.diaz, this.reyes]) { a.weaponMode = 'low'; a.look = () => G.cam.pos; }
    Story.run(function* () {
      yield 2; yield Story.say(mox, "...that's it. That's all of them.");
      yield Story.say(Part3.reyes, "They'll send more. Those trucks didn't come from nowhere.");
      yield Story.say(mox, "Then we don't wait. The boats aren't coming — we follow the river south, on foot.");
      yield Story.say(me, "With Okafor's arm? My leg?");
      yield Story.say(mox, "Slowly, then. Rook, you did good. Up, everybody. Move.");
      yield 1.5; UI.fadeTo(1, 2.5); yield 2.8; AUD.stopAllLoops(); UI.endCard(3);
    });
  },
  update(dt) {
    if (Math.random() < .3) G.particles.push({ p: V.add(G.cam.pos, [rnd(-6, 6), rnd(-1, 4), rnd(-6, 6)]), v: [rnd(-.05, .05), rnd(-.03, .02), rnd(-.05, .05)], life: 0, max: 6, s: .01, c: [1, .95, .7], a: .7, add: true, fadeIn: true });
    if (P.combat) Combat.update(dt);
    // stay on the trail / at the rally point, out of the deep water
    if (P.state === 'walk' && !this.lost) {
      const td = trail3Dist(P.pos[0], P.pos[2]).d; const inR = P.pos[0] > RALLY.x0 && P.pos[0] < RALLY.x1 && P.pos[2] > RALLY.z0 && P.pos[2] < RALLY.z1;
      const dR = inR ? 0 : Math.hypot(Math.max(RALLY.x0 - P.pos[0], 0, P.pos[0] - RALLY.x1), Math.max(RALLY.z0 - P.pos[2], 0, P.pos[2] - RALLY.z1));
      const d = Math.min(td, dR); const warn = clamp((d - 8) / 7, 0, 1); R.post.slow = warn * .8; UI.signal(warn);
      if (d < 5) this.lastSafe = V.copy(P.pos);
      if (d > 15) { this.lost = true; UI.lost(true); AUD.denied(); P.state = 'off'; G.after(2.6, () => { const s = this.lastSafe || [12, 0, -116]; P.pos = V.copy(s); P.state = 'walk'; R.post.slow = 0; UI.lost(false); this.lost = false; }); }
    }
  },
};
