/* =====================================================================
   OVERCAST — story director: coroutines, phases, the washroom, the door,
   the walk, boarding, takeoff, cruise, the jump and the fall.
   ===================================================================== */
const wait = s => s;
function soldierApp(rng, o = {}) {
  const a = appearanceFor('pmc', rng, Object.assign({ top: 'combat', camo: true, topCol: [0x4b5139, 0x545a40, 0x474c36, 0x5a5e44][rng() * 4 | 0], bottom: 'cargo', botCol: [0x3c4030, 0x44483a, 0x383c2e][rng() * 3 | 0], head: 'helmet', vest: 'plate', vestCol: [0x3a3e2c, 0x44463a, 0x34382a][rng() * 3 | 0], gloves: rng() < .7, feet: 'combat' }, o));
  a.female = false; return a;
}
const Story = {
  phase: 'none', t: 0, cos: [], interacts: [], objective: '', plane: null, dyn: [], flags: {},
  /* ---------------- coroutines ---------------- */
  run(gen) { const co = { it: gen(), wait: 0, until: null, done: false }; this.cos.push(co); this.step(co); return co; },
  step(co) { const r = co.it.next(); if (r.done) { co.done = true; return; } const v = r.value; if (typeof v === 'number') { co.wait = v; co.until = null; } else if (typeof v === 'function') { co.until = v; co.wait = 0; } else { co.wait = 0; co.until = null; } },
  updateCos(dt) { for (const co of this.cos) { if (co.done) continue; if (co.wait > 0) { co.wait -= dt; if (co.wait > 0) continue; } if (co.until && !co.until()) continue; this.step(co); } this.cos = this.cos.filter(c => !c.done); },
  say(actor, text, o) { const d = G.speak(actor, text, o); return d + (o && o.gap !== undefined ? o.gap : .35); },
  /* ---------------- build ---------------- */
  start() {
    G.state = 'loading'; UI.loading(true);
    setTimeout(() => { try { this.build(); UI.loading(false); G.state = 'play'; IN.lock(); this.begin(); } catch (e) { console.error(e); UI.fatal(e); } }, 60);
  },
  build() {
    this.cos = []; this.interacts = []; this.flags = {}; this.phase = 'none'; this.t = 0; this.rainOpen = 1; this.titles = []; this.planeDry = null; Cabin.drank = false; Crash.reset(); P.lookLock = false; P.combat = false; Cabin.juice = null;
    Object.assign(Flight, { phase: 'parked', t: 0, lifted: false, cloudIn: false, swapped: false, above: false, inDeck: false, below: false, ended: false, rampTarget: undefined, fallT: undefined, engine: null, extEngine: null, wind: null }); G.raysOn = 0; R.post.grade = [1, 1, 1]; G.actors = []; G.extraDyn = []; G.glass = []; G.updaters = []; G.particles = []; G.timers = []; G.time = 0; G.dynLights = [];
    const W = new World(4400, 11); buildFOB(W); W.chunks = buildChunks(W.B, W.D, 60); W.B = null; W.D = null; this.FW = W;
    const Z = new World(16000, 23); buildDropZone(Z); Z.chunks = buildChunks(Z.B, Z.D, 800); Z.B = null; Z.D = null; this.ZW = Z;
    this.useWorld(W);
    G.dry = W.dryBoxes.slice();
    // mirror + door
    const mi = W.mirror; this.mirrorDyn = { mesh: buildMirrorQuad(mi.w, mi.h), m: M4.trs(M4.create(), M4.create(), mi.p[0], mi.p[1], mi.p[2], 0, 0, 0), pos: mi.p, r: 1, mirrorSurf: true };
    G.extraDyn.push(this.mirrorDyn); G.S.mirror = { on: true, p: mi.p, n: mi.n, range: 5 };
    const dr = W.door; dr.mesh = buildDoorMesh(dr.w, dr.h); dr.dyn = { mesh: dr.mesh, m: M4.create(), pos: dr.hinge, r: 2.5 }; G.extraDyn.push(dr.dyn); this.door = dr;
    // parked vehicles
    for (const v of W.vehicles) { const b = new Float32Array(7 * 16); const m = M4.create(); M4.translate(m, m, v.pos[0], 0, v.pos[2]); M4.rotY(m, m, v.yaw); const t = M4.create(); b.set(m, 0); for (let i = 0; i < 4; i++) { const wp = v.car.wheelPos[i]; M4.translate(t, m, wp[0], wp[1], wp[2]); b.set(t, (1 + i) * 16); } b.set(m, 80); b.set(m, 96); G.extraDyn.push({ mesh: v.car.mesh, bones: b, pos: v.pos, r: 5 }); }
    // the transport
    const tp = buildTransport(); const pl = this.plane = { mesh: tp.mesh, glassMesh: tp.glass, bones: new Float32Array(TPB.N * 16), m: M4.create(), pos: [FOB.plane.x, 0, FOB.plane.z], yaw: -Math.PI / 2, pitch: 0, roll: 0, vel: [0, 0, 0], speed: 0, ramp: 1, door: 1, fan: 0, fanSpd: .4, btn: 0, red: true, green: false, rampAng: -.2, shake: 0 };
    pl.dyn = { mesh: pl.mesh, bones: pl.bones, pos: pl.pos, r: 40 }; pl.gdyn = { mesh: pl.glassMesh, m: pl.m, pos: pl.pos, r: 40, alpha: .18 }; G.extraDyn.push(pl.dyn); G.glass.push(pl.gdyn);
    this.updatePlaneM();
    // clouds over the base (seen from below, flown through on the climb)
    this.clouds = makeCloudDeck(380, 470, 7, { alpha: .5 }); for (const c of this.clouds) G.glass.push(c);
    // airfield life
    Vignettes.build(W, this);
    // cabin crew
    Cabin.build(this);
    // player
    if (!P.rig) P.init(); P.reset();
    // lights that live with moving things
    this.cabinLights = []; for (let z = -11; z <= 10; z += 3) for (const x of [-1.6, 1.6]) this.cabinLights.push({ lp: [x, 6.0, z], pos: [0, 0, 0], col: [1, .2, .12], i: 0, range: 5.5 });
    for (const L of this.cabinLights) G.dynLights.push(L);
    this.sunShafts = [];
  },
  startChapter(n) {
    G.state = 'loading'; UI.loading(true);
    setTimeout(() => { try { this.cos = []; this.interacts = []; G.actors = []; G.extraDyn = []; G.glass = []; G.updaters = []; G.particles = []; G.timers = []; G.dynLights = []; G.dry = []; G.time = 0; G.raysOn = 0;
      Crash.reset(); if (!P.rig) P.init(); P.reset(); if (!Cabin.mox) Cabin.mox = { app: soldierApp(mulberry(1234), { skin: 0xd8a888, hairStyle: 'short', beard: 'full', hair: 0x6a4a2a, head: 'helmet', bulk: 1.05 }) };
      G.state = 'play'; IN.lock(); UI.loading(false); Part2.start(); } catch (e) { console.error(e); UI.fatal(e); } }, 60);
  },
  useWorld(W) { G.W = W; G.S.chunks = W.chunks; },
  updatePlaneM() {
    const p = this.plane; const m = p.m; M4.ident(m); M4.translate(m, m, p.pos[0], p.pos[1], p.pos[2]); M4.rotY(m, m, p.yaw); M4.rotX(m, m, p.pitch); M4.rotZ(m, m, p.roll);
    if (p.shake > .001) { M4.rotX(m, m, Math.sin(G.time * 23) * .0025 * p.shake); M4.rotZ(m, m, Math.sin(G.time * 17.3) * .003 * p.shake); M4.translate(m, m, 0, Math.sin(G.time * 13.1) * .015 * p.shake, 0); }
    poseTransport(p.bones, { m, ramp: p.ramp, door: p.door, fan: p.fan, btn: p.btn, red: p.red, green: p.green });
    p.rampAng = lerp(-1.32, .23, p.ramp); p.inv = M4.invert(p.inv || M4.create(), m); G.S.planeInv = P.inPlane ? p.inv : null;
    if (!this.planeDry) { this.planeDry = { m: true, inv: p.inv, mn: [-3, 0, -25], mx: [3, 7, TP.z1 + .3] }; G.dry.push(this.planeDry); } this.planeDry.inv = p.inv;
    if (this.cabinLights) for (const L of this.cabinLights) { const w = M4.pt(m, L.lp[0], L.lp[1], L.lp[2]); L.pos[0] = w[0]; L.pos[1] = w[1]; L.pos[2] = w[2]; }
  },
  cabinBlockers() { const out = []; for (const a of Cabin.crew) if (a.frame && !a.seated && a.pos) out.push(a.pos); return out; },
  /* ---------------- the opening ---------------- */
  begin() {
    const W = this.FW; const C = FOB.cont;
    G.env = Object.assign({}, ENV.container, { sunDir: V.copy(ENV.container.sunDir) }); G.envT = 1; G.setEnv('container', .01);
    P.state = 'locked'; const sp = W.sinkPos; P.pos = [sp[0], C.fy, sp[2] + .66]; P.yaw = 0; P.pitch = -.05; P.lookLimit = { yaw: 0, yawR: 2.3, pMin: -1.2, pMax: 1.0 }; P.backOff = null;
    P.poseFn = (j, p) => { poseIdle(j, G.time, 'idle', 1.3); pj(j, SK.CH, -.28, 0, 0); return -.02; };
    P.hands = 'sink';
    this.rain = AUD.rainLoop(); this.ambPad = null; AUD.stopMenu && AUD.stopMenu();
    this.phase = 'mirror'; Progress.reach(1); G.after(4, () => Progress.snap(1)); UI.objective(''); UI.card(['FOB KESTREL', 'SOUTH-EAST ASIA  ·  06:14 LOCAL', 'DAY 41']);
    this.tubeFlicker();
    this.run(function* () {
      yield 2.5; UI.hint('MOVE THE MOUSE TO LOOK AROUND');
      yield () => G.time > 5 || Story.flags.lookedAround;
      yield .3;
      Story.knock(); yield 1.2;
      yield Story.say(Cabin.mox, "Rook! You fall in or what? Wheels up in ten!", { gap: .4 });
      yield 1.0; Story.knock(.6);
      yield Story.say(Cabin.mox, "Move your ass, man. Hale's already yelling.");
      P.state = 'walk'; P.poseFn = null; P.lookLimit = null; P.backOff = null; P.hands = null; UI.hint('WASD  MOVE   ·   SHIFT  JOG   ·   E  INTERACT');
      UI.objective('Leave the washroom');
    });
    // track looking around (in the mirror the player sees himself)
    this.lookAcc = 0;
    // door interaction
    const D = this.door;
    this.interacts.push({ pos: () => [D.hinge[0] - .05, D.hinge[1] + 1.05, D.hinge[2] + D.w - .14], r: 1.6, cone: .9, label: '[E]  OPEN DOOR', enabled: () => this.phase === 'mirror' && P.state === 'walk' && D.ang < .1, act: () => this.doorCut() });
  },
  knock(k = 1) { const D = this.door; const p = [D.hinge[0] + .1, D.hinge[1] + 1.3, D.hinge[2] + .5]; for (let i = 0; i < 3; i++) G.after(i * .22, () => AUD.doorBang(p, .55 * k)); },
  tubeFlicker() { const L = this.FW.tube; let t = 0; G.updaters.push(dt => { t += dt; const f = (Math.sin(t * 61) > .97 && Math.random() < .5) ? .3 : 1; L.i = .95 * f * (Math.random() < .004 ? .1 : 1); }); },
  /* ---------------- the door: one continuous move ---------------- */
  doorCut() {
    const D = this.door; const C = FOB.cont; const W = this.FW;
    P.state = 'cut'; P.cutT = 0; const startPos = V.copy(P.pos), startYaw = P.yaw, startPitch = P.pitch;
    const inside = [D.hinge[0] - .55, C.fy, D.hinge[2] + D.w / 2]; const outside = [D.hinge[0] + 2.4, 0, D.hinge[2] + D.w / 2 + .5];
    const yawDoor = -Math.PI / 2; // facing +x
    this.phase = 'door'; UI.objective(''); UI.hint('');
    let pushed = false;
    P.cut = (p, dt, t) => {
      // approach + square up to the door
      const a = smooth(t / .55);
      if (t < .55) { p.pos = V.lerp(startPos, inside, a); p.yaw = lerpAng(startYaw, yawDoor, a); p.pitch = lerp(startPitch, -.12, a); }
      // right hand on the push bar, shoulder in
      const bar = [D.hinge[0] - .08, C.fy + 1.0, D.hinge[2] + D.w - .2]; const doorBar = () => { const ang = D.ang; return [D.hinge[0] - .08 * Math.cos(ang) + Math.sin(ang) * (D.w - .2), C.fy + 1.0, D.hinge[2] + Math.cos(ang) * (D.w - .2) + .08 * Math.sin(ang)]; };
      const reach = smooth((t - .25) / .35) * (1 - smooth((t - 1.25) / .3));
      if (reach > .01) { const tgt = t < .62 ? bar : doorBar(); const rest = M4.pt(P.rig.root, .25, .95, -.1); p.ik.push({ left: false, T: V.lerp(rest, tgt, reach), pole: [0, -1, .3], fingers: [0, -.2, 1] }); }
      if (t > .62 && !pushed) { pushed = true; D.vel = 4.6; AUD.creak(D.hinge); AUD.swoosh(.35, D.hinge, 600, .5); G.setEnv('overcast', 2.6); R.post.grade = [1.55, 1.55, 1.6]; Story.rainOpen = 0; W.door.col.mn[1] = -100; W.door.col.mx[1] = -99; }
      if (t > .62) Story.rainOpen = Math.min(1, (Story.rainOpen || 0) + dt / 1.4);
      // step through, down the steel step, into the rain
      if (t > .75) {
        const k = clamp((t - .75) / 2.0, 0, 1); const e = k * k * (3 - 2 * k);
        p.pos = V.lerp(inside, outside, e); const gy = lerp(C.fy, 0, smooth((k - .45) / .35)); p.pos[1] = gy;
        p.speed = 1.6 * Math.sin(k * Math.PI) + .4; p.ph = (p.ph || 0) + dt * 2.2 * Math.PI;
        p.pitch = lerp(-.12, -.02, smooth(k)) - bump(k, .4, .75) * .22; p.yaw = lerpAng(yawDoor, yawDoor + .5, smooth((k - .5) / .5));
      }
      if (t > 3.0) { p.state = 'walk'; p.cut = null; p.speed = 0; Story.afterDoor(); }
    };
  },
  afterDoor() {
    this.phase = 'walk'; P.state = 'walk';
    const mox = Cabin.mox; mox.look = () => G.cam.pos;
    this.run(function* () {
      yield .4; yield Story.say(mox, "Morning, sunshine. Come on — Raven's already spooling up.");
      UI.objective('Board RAVEN 21 — the transport on the runway'); UI.marker(() => Story.plane ? M4.pt(Story.plane.m, 0, 2.5, TP.z1 + 4) : null);
      mox.state.follow = true;
      yield 2; UI.hint('');
    });
    G.after(2.5, () => AUD.thunder(1.5));
    Vignettes.go();
  },
  /* ---------------- per frame ---------------- */
  update(dt) {
    this.t += dt; this.updateCos(dt);
    if (this.phase !== 'p2') { const alt = P.inPlane && this.plane ? this.plane.pos[1] : P.pos[1]; const hi = alt > 150; R.drawDist = hi ? 14000 : 900; R.detailDist = hi ? 0 : 70; G.cam.far = hi ? 16000 : 4200; G.S.maxDraw = hi ? 16000 : 4200; }
    // door physics: swing, slam against the container wall, settle
    const D = this.door; if (D) {
      if (D.vel) { D.ang += D.vel * dt; D.vel *= Math.exp(-.9 * dt); if (D.ang > 3.02) { D.ang = 3.02; if (Math.abs(D.vel) > .5) { AUD.doorBang([D.hinge[0] + .1, D.hinge[1] + 1, D.hinge[2] - .5], Math.min(1, Math.abs(D.vel) / 3)); P.shake = Math.max(P.shake, .2); } D.vel = -D.vel * .28; } if (D.ang < 2.4 && D.vel < 0) D.vel += 3 * dt; if (Math.abs(D.vel) < .02 && D.ang > 2.5) D.vel = 0; }
      const m = D.dyn.m; M4.ident(m); M4.translate(m, m, D.hinge[0], D.hinge[1], D.hinge[2]); M4.rotY(m, m, D.ang);
    }
    // exposure "eye adaptation" after stepping outside
    R.post.grade = R.post.grade.map(v => damp(v, 1, .9, dt));
    // rain loop: indoor drumming vs outdoor hiss
    if (this.rain) { const inCont = G.isDry(P.inPlane ? P.worldPos() : P.pos); const k = G.env.rain; this.rain.set(this.phase === 'fall' || this.phase === 'end' ? 0 : Math.max(k, inCont ? 1 : 0), inCont && this.phase !== 'door' ? 1 : lerp(1, 0, this.rainOpen ?? 1)); }
    if (this.phase === 'mirror') { this.lookAcc += Math.abs(IN.mdx) + Math.abs(IN.mdy); if (this.lookAcc > 1400 && G.time > 4) this.flags.lookedAround = true; }
    // plane + flight
    Flight.update(dt);
    // clouds follow the camera (their pattern is in world space)
    if (this.clouds) for (const c of this.clouds) { M4.ident(c.m); M4.translate(c.m, c.m, G.cam.pos[0], c.y, G.cam.pos[2]); c.pos = [G.cam.pos[0], c.y, G.cam.pos[2]]; }
    // boarding: step onto the ramp → cabin space
    if (this.phase === 'walk' && P.state === 'walk') {
      const L = M4.pt(this.plane.inv, P.pos[0], P.pos[1], P.pos[2]);
      if (L[2] < TP.z1 + TP.rampL * Math.cos(.23) - .7 && L[2] > TP.z1 - .5 && Math.abs(L[0]) < 2.3) { P.inPlane = true; P.local = [L[0], L[1], L[2]]; P.yaw = angWrap(P.yaw - this.plane.yaw); P.state = 'cabin'; this.phase = 'board'; Cabin.onBoard(); }
    }
    // mirror only matters near the washroom
    if (G.S.mirror) G.S.mirror.on = !P.inPlane && V.dist(P.pos, this.FW.mirror.p) < 5;
  },
  playerJumped() {
    if (this.phase === 'board' || this.phase === 'walk') { // walked back down the ramp while parked
      const w = P.worldPos(); P.inPlane = false; P.pos = [w[0], 0, w[2]]; P.yaw = P.worldYaw(); P.state = 'walk'; this.phase = 'walk'; return;
    }
    if (this.phase !== 'jump') return;
    Flight.playerOut();
  },
};
function lerpAng(a, b, t) { return a + angDiff(a, b) * t; }

/* =====================================================================
   FLIGHT: taxi-free takeoff roll, climbing turn, cloud punch, cruise,
   the drop, and the freefall with the title in the sky.
   ===================================================================== */
const Flight = {
  phase: 'parked', t: 0,
  update(dt) {
    const S = Story, pl = S.plane; if (!pl) return; this.t += dt;
    const fwd = () => M4.dir(pl.m, 0, 0, -1);
    if (this.phase === 'parked') { pl.fan += dt * pl.fanSpd * 3; }
    else if (this.phase === 'roll') {
      pl.fanSpd = damp(pl.fanSpd, 9, .6, dt); pl.fan += dt * pl.fanSpd * 3;
      pl.speed += (this.t > 4 ? 3.1 : .3) * dt; pl.shake = .4 + pl.speed / 62 * .8;
      if (pl.speed > 62) { pl.pitch = damp(pl.pitch, .2, .9, dt); }
      if (pl.speed > 66 && !this.lifted) { this.lifted = true; AUD.doorBang(P.worldPos(), .5); this.climbT = 0; this.phase = 'climb'; }
    } else if (this.phase === 'climb') {
      this.climbT += dt; pl.fan += dt * pl.fanSpd * 3; pl.speed = Math.min(82, pl.speed + 1.2 * dt);
      pl.pitch = damp(pl.pitch, .24, .6, dt); if (this.climbT > 6) { pl.yaw -= .055 * dt * smooth((this.climbT - 6) / 4); pl.roll = damp(pl.roll, -.32, .7, dt); }
      pl.shake = .5 + (pl.pos[1] > 360 && pl.pos[1] < 480 ? 1.6 : 0);
      if (pl.pos[1] > 300 && !this.cloudIn) { this.cloudIn = true; G.setEnv(P.inPlane ? 'inCloudCabin' : 'inCloud', 6); }
      if (pl.pos[1] > 430 && !this.swapped) this.swapWorld();
    } else if (this.phase === 'climb2') {
      pl.fan += dt * pl.fanSpd * 3; pl.speed = damp(pl.speed, 62, .3, dt); pl.pitch = damp(pl.pitch, pl.pos[1] < 1500 ? .32 : 0, .5, dt); pl.speed = Math.max(pl.speed, 70); pl.yaw -= pl.speed / 1800 * dt; pl.roll = damp(pl.roll, -.17, .5, dt);
      pl.shake = pl.pos[1] < 920 ? 1.5 : .35;
      if (pl.pos[1] > 920 && !this.above) { this.above = true; G.setEnv('aboveCabin', 3); G.raysOn = 1; AUD.whoosh(.2); Cabin.sunShafts(true); }
      if (pl.pos[1] >= 1500) { this.phase = 'cruise'; }
    } else if (this.phase === 'cruise' || this.phase === 'drop') {
      if (!this.above && pl.pos[1] > 920) { this.above = true; G.setEnv('aboveCabin', 3); G.raysOn = 1; Cabin.sunShafts(true); }
      pl.fan += dt * pl.fanSpd * 3; pl.speed = damp(pl.speed, this.phase === 'drop' ? 48 : 58, .3, dt); pl.pitch = damp(pl.pitch, 0, .5, dt); const orbit = Story.phase === 'fall'; pl.yaw -= pl.speed / (orbit ? 380 : 1800) * dt; pl.roll = damp(pl.roll, orbit ? -.32 : this.phase === 'drop' ? -.05 : -.15, .4, dt); if (orbit) pl.pos[1] = damp(pl.pos[1], 1180, .12, dt); if (Story.phase !== 'fall') pl.pos[1] = pl.pos[1] < 1500 ? pl.pos[1] + 14 * dt : damp(pl.pos[1], 1550, .2, dt); pl.shake = .3 + Math.max(0, Math.sin(G.time * .31) - .7) * 2;
    }
    if (this.phase !== 'parked') { const f = fwd(); pl.vel = V.sc(f, pl.speed); pl.pos[0] += pl.vel[0] * dt; pl.pos[1] = Math.max(0, pl.pos[1] + pl.vel[1] * dt); pl.pos[2] += pl.vel[2] * dt; }
    if (this.engine) this.engine.set(clamp(pl.fanSpd / 9, .15, 1) * (P.inPlane ? 1 : .6), null, .8 + pl.fanSpd / 30);
    if (this.extEngine) this.extEngine.set(clamp(pl.fanSpd / 9, .1, 1) * 1.2, M4.pt(pl.m, 0, 4, -4), 1);
    // ramp animation
    if (this.rampTarget !== undefined) { pl.ramp = damp(pl.ramp, this.rampTarget, this.rampTarget > pl.ramp ? .7 : .55, dt); pl.door = damp(pl.door, this.rampTarget, .8, dt); }
    Story.updatePlaneM();
    // wind through the open ramp
    if (this.wind) { const open = pl.ramp; this.wind.set(P.state === 'fall' ? clamp(P.speed / 50, .3, 1.2) : open * (this.phase === 'drop' ? .9 : 0), null, 1); }
    // freefall extras
    if (this.fallT !== undefined) this.updateFall(dt);
  },
  startEngines() { this.engine = AUD.cabinLoop(); this.extEngine = AUD.jetLoop([0, 0, 0]); },
  takeoff() { this.phase = 'roll'; this.t = 0; },
  swapWorld() { // inside the cloud: hand over from the base to the drop-zone world
    this.swapped = true; const pl = Story.plane; const S = Story;
    pl.pos[0] = -1000; pl.pos[1] = 840; pl.pos[2] = -1800; pl.yaw = -Math.PI / 2; pl.roll = 0; this.phase = 'climb2';
    S.useWorld(S.ZW); G.dry = [S.planeDry];
    for (const c of S.clouds) c.hidden = true;
    PUFFS.blobs = []; PUFFS.items = []; S.puffs = buildCumulus(77, 0, 0, 150, { maxR: 6500, base: 620, spread: 520 }); for (const it of S.puffs) G.glass.push(it);
    Vignettes.stop(); for (const a of G.actors.slice()) if (!a.frame && !a.keep) G.actors.splice(G.actors.indexOf(a), 1);
    G.extraDyn = G.extraDyn.filter(d => d === pl.dyn); G.S.mirror = null; G.dynLights = S.cabinLights.slice();
  },
  /* ---------- the jump ---------- */
  playerOut() {
    const pl = Story.plane; Story.phase = 'fall';
    const w = P.worldPos(); P.inPlane = false; P.pos = V.copy(w); P.yaw = P.worldYaw(); P.pitch = -.5; P.state = 'fall';
    P.fallVel = V.add(V.sc(pl.vel, .35), V.sc(M4.dir(pl.m, 0, 0, 1), 4)); P.fallVel[1] = -2; P.drift = [P.fallVel[0] * .2, 0, P.fallVel[2] * .2];
    P.lookLimit = null; UI.objective(''); UI.hint(''); UI.marker(null);
    G.setEnv('above', 1.2); G.raysOn = 1; AUD.whoosh(.8); P.shake = 1;
    if (this.engine) this.engine.stop(); this.engine = null;
    this.fallT = 0; this.titleBuilt = false; Story.titles = []; Story.clearFallPath();
    if (!this.wind) this.wind = AUD.windLoop();
    Story.titleMusic = AUD.pad('title');
  },
  updateFall(dt) {
    this.fallT += dt; const alt = P.pos[1];
    for (const c of Story.clouds) { /* layers stay */ }
    // inside a cumulus: white-out and buffeting; out again: clear air
    const inC = puffAt(G.cam.pos);
    if (inC !== !!this.inDeck) { this.inDeck = inC; if (inC) { G.setEnv('inCloud', .35); G.raysOn = 0; P.shake = 1.2; AUD.whoosh(.4); } else { G.setEnv(alt > 700 ? 'above' : 'below', .6); G.raysOn = alt > 700 ? 1 : .4; } }
    if (!inC && alt < 700 && !this.below) { this.below = true; G.setEnv('below', 2.5); }
    const inDeck = inC; if (inDeck) P.shake = Math.max(P.shake, .7);
    // vapor streaks past the face for a sense of speed
    if (Math.random() < .6) { const cp = G.cam.pos; G.particles.push({ p: [cp[0] + rnd(-6, 6), cp[1] - rnd(8, 20), cp[2] + rnd(-6, 6)], v: [0, 52, 0], life: 0, max: .6, s: .5, dir: [0, 1, 0], w: .015, streak: true, c: [.9, .92, .95], a: inDeck ? .35 : .12 }); }
    if (inDeck && Math.random() < .5) G.puff([G.cam.pos[0] + rnd(-12, 12), G.cam.pos[1] - rnd(6, 30), G.cam.pos[2] + rnd(-12, 12)], { s: rnd(6, 12), v: [0, 40, 0], max: 1.5, c: [.92, .93, .95], a: .5, grow: 2, g: 0, drag: 0 });
    Crash.update(dt, alt);
  },
};
