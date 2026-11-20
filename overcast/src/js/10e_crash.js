/* =====================================================================
   OVERCAST — the crash: at 800 m you look up, a missile streaks in and
   guts Raven 2-1; the blast throws its energy forward along the flight
   path, wreckage rains down, and ten seconds later a piece finds you.
   ===================================================================== */
function buildDebris(kind) {
  const B = new MB(3000); B.b(0); const paint = 0x6c726c, burnt = 0x1e1c1a;
  if (kind === 'wing') { B.col(paint, MAT.PAINT).box(0, 0, 0, 9, .35, 3.2); B.col(burnt, MAT.RUST).box(-4.3, 0, 0, .6, .4, 3.3); B.col(0x3a3e3a, MAT.PAINT).box(1, -.2, 1.4, 6, .1, .4); }
  else if (kind === 'tail') { B.col(paint, MAT.PAINT).box(0, 2.5, 0, .5, 5.5, 3.4).box(0, 5.3, .6, 9, .35, 2.8); B.col(burnt, MAT.RUST).box(0, 0, 0, 1.6, 1.2, 3.6); }
  else if (kind === 'engine') { B.col(paint, MAT.PAINT).cylZ(0, 0, 0, 1.05, 4.2, 14); B.col(burnt, MAT.RUST).cylZ(0, 0, 2.1, .9, .4, 12); B.col(0x111111, MAT.METAL).cylZ(0, 0, -2.15, .95, .1, 14); }
  else if (kind === 'hull') { for (let i = 0; i < 9; i++) { const a = i / 14 * TAU + .3; B.col(i % 3 ? paint : burnt, i % 3 ? MAT.PAINT : MAT.RUST).push().rz(a).box(0, 3, 0, 2.2, .2, 5 + Math.sin(i) * 1.5).pop(); } B.col(0x5a604f, MAT.CANVAS).box(0, 2.2, 0, 3, .1, 4.5); }
  else { // panel: a jagged chunk of skin with a rib — the piece that finds you
    B.col(paint, MAT.PAINT).box(0, 0, 0, 1.6, .06, 1.1).box(.5, 0, .7, .7, .06, .5); B.col(0x4e5446, MAT.METAL).box(0, -.08, 0, .12, .14, 1.4); B.col(burnt, MAT.RUST).box(-.75, 0, -.1, .25, .08, .9); B.col(0x7a1a14, MAT.CANVAS).box(.2, -.05, -.3, .6, .03, .5); }
  return B.mesh();
}
const Crash = {
  stage: 0, t: 0, debris: [],
  reset() { this.stage = 0; this.t = 0; this.debris = []; this.missile = null; this.knockT = 0; },
  update(dt, alt) {
    const pl = Story.plane; this.t += dt;
    // 1) launch: the missile comes up from the jungle ahead of the aircraft
    if (this.stage === 0 && alt < 920) {
      this.stage = 1; const f = M4.dir(pl.m, 0, 0, -1); const st = V.add(pl.pos, V.sc([f[0], 0, f[2]], 2600)); st[1] = G.W.th(st[0], st[2]) + 30;
      const B = new MB(400); B.b(0); B.col(0xd8d8d0, MAT.PAINT).cylZ(0, 0, 0, .12, 2.6, 8); B.col(0xffe0a0, MAT.EMIT).cylZ(0, 0, 1.4, .1, .3, 8);
      this.missile = { p: st, from: V.copy(st), t: 0, dur: 5, mesh: B.mesh(), m: M4.create(), snd: AUD.missile(st) }; this.missile.dyn = { mesh: this.missile.mesh, m: this.missile.m, pos: this.missile.p, r: 3 }; G.extraDyn.push(this.missile.dyn);
    }
    const M = this.missile;
    if (this.stage === 1) {
      M.t += dt; const k = clamp(M.t / M.dur, 0, 1); const tgt = M4.pt(pl.m, 0, 4, -4); const mid = V.add(V.lerp(M.from, tgt, .5), [0, 300, 0]);
      const a = V.lerp(M.from, mid, k), b = V.lerp(mid, tgt, k); const np = V.lerp(a, b, k); const dir = V.norm(V.sub(np, M.p)); M.p[0] = np[0]; M.p[1] = np[1]; M.p[2] = np[2];
      M4.basis(M.m, V.norm(V.cross([0, 1, 0], dir)), V.cross(dir, V.norm(V.cross([0, 1, 0], dir))), V.sc(dir, -1), M.p);
      for (let i = 0; i < 3; i++) G.puff(V.sub(M.p, V.sc(dir, i * 3)), { s: rnd(2, 3.5), grow: 3, c: [.8, .8, .78], a: .55, max: 9, v: [rnd(-.5, .5), rnd(0, 1), rnd(-.5, .5)], drag: .1, g: 0 });
      G.particles.push({ p: V.copy(M.p), v: [0, 0, 0], life: 0, max: .12, s: 4, c: [1, .85, .5], a: 1, add: true });
      if (M.snd) M.snd.set(1.4, M.p);
      if (k >= 1) this.explode();
    }
    // 2) at 800 m: the head turns up, smoothly, to the aircraft — then follows the wreckage
    if (alt < 800 && !this.look) this.look = { t: 0 };
    if (this.look && this.stage < 4) {
      this.look.t += dt; const tgtP = this.stage >= 2 && this.hunter && this.hunter.rem < 2.2 ? this.hunter.p : (this.stage >= 2 ? this.blastPos : pl.pos);
      const d = V.sub(tgtP, G.cam.pos); const wy = Math.atan2(-d[0], -d[2]), wp = Math.atan2(d[1], Math.hypot(d[0], d[2]));
      const k = smooth(clamp(this.look.t / 2.5, 0, 1)) * 2.2 + .3; P.yaw = dampAng(P.yaw, wy, k, dt); P.pitch = damp(P.pitch, clamp(wp, -1.4, 1.4), k, dt);
      P.lookLock = true;
    }
    if (this.stage >= 2 && this.stage < 4) this.updateDebris(dt);
  },
  explode() {
    const pl = Story.plane; const M = this.missile; this.stage = 2; this.boomT = 0;
    if (M.snd) M.snd.stop(); G.extraDyn.splice(G.extraDyn.indexOf(M.dyn), 1);
    const pos = M4.pt(pl.m, 0, 4, -4); this.blastPos = V.copy(pos); const fwd = V.norm(pl.vel); const v0 = V.sc(pl.vel, .85);
    pl.dyn.hidden = true; pl.gdyn.hidden = true; Flight.phase = 'dead'; if (Flight.extEngine) Flight.extEngine.stop(); if (Flight.engine) Flight.engine.stop();
    AUD.farBoom(V.dist(pos, P.pos)); R.post.grade = [1.5, 1.35, 1.2]; G.raysOn = 1;
    // fireball: most of the energy carried forward along the flight path, a lighter spray in every other direction
    const cone = (spread) => V.norm(V.add(fwd, [rnd(-spread, spread), rnd(-spread * .7, spread * .7), rnd(-spread, spread)]));
    for (let i = 0; i < 160; i++) { const fw = Math.random() < .78; const d = fw ? cone(.55) : V.norm([rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)]); const sp = fw ? rnd(25, 90) : rnd(6, 25);
      G.particles.push({ p: V.add(pos, [rnd(-3, 3), rnd(-2, 2), rnd(-3, 3)]), v: V.add(v0, V.sc(d, sp)), life: 0, max: rnd(1.5, 3.5), s: rnd(10, 26), grow: rnd(8, 16), c: [1, rnd(.35, .7), rnd(.08, .2)], a: 1, add: true, drag: rnd(.6, 1.2) }); }
    for (let i = 0; i < 90; i++) { const fw = Math.random() < .75; const d = fw ? cone(.6) : V.norm([rnd(-1, 1), rnd(-.3, 1), rnd(-1, 1)]);
      G.particles.push({ p: V.add(pos, [rnd(-4, 4), rnd(-2, 2), rnd(-4, 4)]), v: V.add(v0, V.sc(d, fw ? rnd(15, 55) : rnd(4, 14))), life: 0, max: rnd(12, 20), s: rnd(14, 30), grow: rnd(5, 9), c: [.12, .11, .1], a: .75, drag: rnd(.25, .5), g: -.4, fadeIn: true }); }
    for (let i = 0; i < 80; i++) { const d = cone(.9); G.particles.push({ p: V.copy(pos), v: V.add(v0, V.sc(d, rnd(40, 140))), dir: d, w: .25, life: 0, max: rnd(1, 3), s: rnd(3, 8), c: [1, .8, .4], a: 1, add: true, streak: true, g: 9.8, drag: .3 }); }
    G.dynLights.push(this.flash = { pos: V.copy(pos), col: [1, .6, .3], i: 40, range: 400 });
    // the aircraft breaks apart: big pieces keep the momentum, thrown forward and tumbling, burning
    const kinds = ['wing', 'wing', 'tail', 'engine', 'engine', 'hull', 'hull', 'hull', 'panel', 'panel', 'panel'];
    for (const k of kinds) { const d = Math.random() < .8 ? cone(.45) : V.norm([rnd(-1, 1), rnd(-.5, .5), rnd(-1, 1)]);
      const it = { kind: k, mesh: buildDebris(k), m: M4.create(), p: V.add(pos, [rnd(-6, 6), rnd(-3, 3), rnd(-6, 6)]), v: V.add(v0, V.sc(d, rnd(8, 30))), rot: [rnd(0, TAU), rnd(0, TAU), rnd(0, TAU)], w: [rnd(-1.5, 1.5), rnd(-1.5, 1.5), rnd(-1.5, 1.5)], fire: k !== 'panel' || Math.random() < .5 };
      it.dyn = { mesh: it.mesh, m: it.m, pos: it.p, r: 12 }; G.extraDyn.push(it.dyn); this.debris.push(it); }
    // the piece that finds you, ten seconds from now
    const h = { kind: 'panel', mesh: buildDebris('panel'), m: M4.create(), p: V.copy(pos), v: [0, 0, 0], rot: [0, 0, 0], w: [3.2, 4.1, 2.3], fire: true, hunter: true, rem: 10 };
    h.dyn = { mesh: h.mesh, m: h.m, pos: h.p, r: 4 }; G.extraDyn.push(h.dyn); this.debris.push(h); this.hunter = h;
    G.after(.8, () => { if (Cabin.mox) G.speak(Cabin.mox, "RAVEN! NO — RAVEN'S HIT!", { radio: true }); });
    G.after(4.5, () => { if (Cabin.mox) G.speak(Cabin.mox, "Rook! Debris! Track left — TRACK LEFT!", { radio: true }); });
  },
  updateDebris(dt) {
    this.boomT += dt; if (this.flash) { this.flash.i = Math.max(0, 40 * (1 - this.boomT / 2.5)); }
    for (const it of this.debris) {
      if (it.hunter) {
        it.rem -= dt; const tgt = V.add(G.cam.pos, V.sc(G.cam.fwd, .4)); const side = V.sc(G.cam.right, Math.sin(it.rem * 1.3) * Math.min(40, it.rem * 6));
        const want = V.add(tgt, side); const r = Math.max(it.rem, .03); it.p[0] += (want[0] - it.p[0]) / r * dt; it.p[1] += (want[1] - it.p[1]) / r * dt; it.p[2] += (want[2] - it.p[2]) / r * dt;
        if (it.rem < 1.5 && !this.warned) { this.warned = true; AUD.whoosh(1); }
        if (it.rem <= 0) { this.knockout(); return; }
      } else { it.v[1] -= 9.8 * dt; const k = Math.exp(-.08 * dt); it.v[0] *= k; it.v[2] *= k; it.p[0] += it.v[0] * dt; it.p[1] += it.v[1] * dt; it.p[2] += it.v[2] * dt; }
      for (let a = 0; a < 3; a++) it.rot[a] += it.w[a] * dt;
      M4.ident(it.m); M4.translate(it.m, it.m, it.p[0], it.p[1], it.p[2]); M4.rotX(it.m, it.m, it.rot[0]); M4.rotY(it.m, it.m, it.rot[1]); M4.rotZ(it.m, it.m, it.rot[2]);
      if (it.fire && Math.random() < (it.hunter ? .9 : .7)) { G.particles.push({ p: V.add(it.p, [rnd(-.5, .5), rnd(-.5, .5), rnd(-.5, .5)]), v: [rnd(-1, 1), rnd(0, 2), rnd(-1, 1)], life: 0, max: rnd(.4, .9), s: it.hunter ? rnd(.6, 1.2) : rnd(2, 4), grow: 1.5, c: [1, rnd(.4, .6), .15], a: 1, add: true });
        G.puff(it.p, { s: it.hunter ? .8 : rnd(2.5, 4), grow: 2.5, c: [.14, .13, .12], a: .6, max: it.hunter ? 3 : 9, v: [0, 1, 0], g: -.2, drag: .2 }); }
    }
  },
  knockout() {
    this.stage = 4; P.lookLock = false; AUD.knock(); P.shake = 3; R.post.grade = [3, 3, 3]; UI.fadeTo(1, .08);
    try { if (Flight.wind) Flight.wind.stop(); } catch (e) { } Flight.wind = null; if (window.speechSynthesis) speechSynthesis.cancel();
    Story.phase = 'out'; P.state = 'off';
    setTimeout(() => { AUD.stopAllLoops(); Part2.start(); }, 3500);
  },
};
