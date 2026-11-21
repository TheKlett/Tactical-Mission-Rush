/* =====================================================================
   OVERCAST — combat: your sidearm (Q draw/holster, RMB aim, LMB fire),
   crouching, silent takedowns, cartel guards with sight, hearing and
   a rough idea of where a shot came from, blood and death.
   ===================================================================== */
function buildPistol() {
  const B = new MB(3000); B.b(0); const blk = 0x1c1d1f;
  B.col(blk, MAT.METAL).box(0, .022, -.08, .03, .032, .19); B.col(0x111111, MAT.METAL); for (let i = 0; i < 7; i++) B.box(.0152, .026, -.01 + i * .008, .001, .018, .003).box(-.0152, .026, -.01 + i * .008, .001, .018, .003);
  B.col(0x0a0a0a, MAT.METAL).cylZ(0, .022, -.176, .006, .004, 8); B.col(0x111111, MAT.METAL).box(0, .041, -.165, .005, .006, .006).box(0, .041, -.005, .014, .007, .006);
  B.col(0x2a2b2d, MAT.PLASTIC).box(0, -.002, -.09, .028, .022, .15); B.push().t(0, -.01, -.01).rx(-.28).box(0, -.05, 0, .03, .1, .042).pop();
  B.col(0x151515, MAT.RUBBER); for (let i = 0; i < 4; i++) B.push().t(0, -.02 - i * .02, -.004 + i * .006).rx(-.28).box(0, 0, -.021, .031, .004, .003).pop();
  B.col(0x111111, MAT.METAL).box(0, -.016, -.05, .005, .004, .045).push().t(0, -.012, -.055).rx(.3).box(0, -.008, 0, .005, .016, .005).pop();
  B.col(0xd8d8d0, MAT.PAINT).box(-.004, .042, -.005, .002, .002, .001).box(.004, .042, -.005, .002, .002, .001).box(0, .0445, -.165, .002, .002, .001);
  return B.mesh();
}
const PISTOL = { name: 'PISTOL', mag: 12, dmg: 55, rpm: 320, spread: .03, adsSpread: .004, recoil: .045, noise: 85, snd: 'pistol', auto: false, reload: 1.4 };
const RIFLE = { name: 'RIFLE', mag: 30, dmg: 36, rpm: 640, spread: .05, adsSpread: .006, recoil: .022, noise: 140, snd: 'rifle', auto: true, reload: 2.2, rifle: true };
function buildRifleWorld() { const B = new MB(4000); B.b(0); buildNpcWeapon(B, 'rifle'); return B.mesh(); }
const Combat = {
  enemies: [], built: false,
  build(W, cfg) {
    if (this.built && this.W === W) return; this.built = true; this.W = W; this.cfg = cfg || {}; this.cleared = false; this.allies = this.cfg.allies || []; this.enemies = []; this.td = null; this.reloadT = 0;
    this.weps = { pistol: { st: PISTOL, mesh: buildPistol(), ammo: { mag: 12, res: 48 } } }; this.cur = 'pistol';
    if (this.cfg.rifle) this.giveRifle(true);
    this.gun = { mesh: this.weps.pistol.mesh, m: M4.create(), pos: [0, 0, 0], r: 1, hidden: true }; G.extraDyn.push(this.gun);
    P.handFn = (p, dt) => Combat.preBody(dt);
    this.ammo = this.weps.pistol.ammo; P.drawn = 0; P.drawT = 0; P.aim = 0; P.kick = 0; P.health = 100; P.lastHurt = -10; this.fireCd = 0; this.dead = 0; this.spawn();
  },
  get st() { return this.weps[this.cur].st; },
  giveRifle(silent) { if (this.weps.rifle) return; this.weps.rifle = { st: RIFLE, mesh: buildRifleWorld(), ammo: { mag: 30, res: 150 } }; if (!silent) { this.switchTo('rifle'); P.drawWant = true; } },
  switchTo(k) { if (!this.weps[k] || this.cur === k || this.reloadT) return; this.cur = k; this.ammo = this.weps[k].ammo; this.gun.mesh = this.weps[k].mesh; P.drawn = Math.min(P.drawn, .2); AUD.mech('draw'); },
  removeEnemy(e) { const i = G.actors.indexOf(e); if (i >= 0) G.actors.splice(i, 1); if (e.pool) { const k = G.extraDyn.indexOf(e.pool); if (k >= 0) G.extraDyn.splice(k, 1); } const j = this.enemies.indexOf(e); if (j >= 0) this.enemies.splice(j, 1); },
  addEnemy(o) { // { x, z, yaw, beh, wk, name, mode, hold, path, seed }
    const W = this.W, rng = mulberry(o.seed || (Math.random() * 1e6 | 0)); const app = appearanceFor('cartel', rng, {}); app.female = false;
    const a = new Actor(app, { name: o.name || 'Sicario', pos: [o.x, W.th(o.x, o.z), o.z], yaw: o.yaw || 0, weapon: o.wk || 'ak', weaponMode: o.mode === 'combat' ? 'aim' : 'low', gear: false, pitch: 95 + rng() * 30, voiceIdx: (rng() * 9) | 0 });
    a.groundFn = (gx, gz) => W.th(gx, gz); a.hp = 100; a.alert = o.mode === 'combat' ? 1 : 0; a.state = { mode: o.mode || 'calm', last: o.last ? V.copy(o.last) : null, engT: G.time }; a.beh = o.beh || 'guard'; a.home = [o.x, o.z, o.yaw || 0]; a.enemy = true; a.wk = o.wk || 'ak'; a.hold = !!o.hold; a.wave = o.wave;
    if (o.path) a.goTo(o.path.map(p => [p[0], 0, p[1]]), true); a.fireCd = rnd(1.5, 3);
    a.script = (b, dt) => Combat.think(b, dt); G.actors.push(a); this.enemies.push(a); return a;
  },
  spawn() {
    for (const e of this.enemies.slice()) this.removeEnemy(e);
    this.enemies = []; if (this.cfg.spawn) { this.cfg.spawn(this); this.chatT = 4; return; } const W = this.W, c = W.campCenter, rng = mulberry(555);
    const plan = [
      // [x, z, yaw, behaviour, weapon]
      [c[0] + 2.2, c[2] + 1.0, -2, 'sitfire', 'ak'], [c[0] - 2.1, c[2] + 1.2, 2.1, 'sitfire', 'pistol'], [c[0] + .3, c[2] - 2.3, 0, 'sitfire', 'smg'],
      [c[0] + 5.2, c[2] + 5.4, Math.PI, 'table', 'pistol'], [c[0] + 6.8, c[2] + 6.8, Math.PI * .8, 'table', 'ak'],
      [c[0] - 8, c[2] + 9, 2.6, 'smoke', 'ak'], [c[0] - 6.6, c[2] + 9.7, -2.2, 'talk', 'shotgun'],
      [c[0] + 14, c[2] + 6, .4, 'guard', 'ak'], [c[0] - 12, c[2] - 6, -1.2, 'guard', 'ak'],
      [c[0] + 3, c[2] + 26, 0, 'post', 'ak'],                                     // trail sentry facing you
      [c[0] - 18, c[2] + 18, 0, 'patrol', 'ak'], [c[0] + 18, c[2] - 14, 0, 'patrol', 'smg'],
      [c[0] - 4, c[2] - 12.6, 0, 'work', 'pistol'], [c[0] + 9, c[2] - 6, -.5, 'sleep', 'pistol'], [c[0] + 15, c[2] + 9, 2, 'truck', 'shotgun'],
    ];
    const pts = { 0: [[c[0] - 22, c[2] + 20], [c[0] - 26, c[2] - 10], [c[0] - 10, c[2] + 28], [c[0] + 4, c[2] + 30]], 1: [[c[0] + 22, c[2] - 16], [c[0] + 26, c[2] + 12], [c[0] + 8, c[2] - 26]] };
    let pi = 0; const names = ['Chucho', 'El Flaco', 'Ramón', 'Beto', 'Güero', 'Nacho', 'Toño', 'Pelón', 'Chato', 'Memo', 'Lalo', 'Pancho', 'Rafa', 'Tito', 'Gordo'];
    plan.forEach(([x, z, yaw, beh, wk], n) => {
      const app = appearanceFor('cartel', rng, {}); app.female = false;
      const a = new Actor(app, { name: names[n], pos: [x, W.th(x, z), z], yaw, weapon: wk, weaponMode: beh === 'guard' || beh === 'post' || beh === 'patrol' ? 'low' : 'sling', gear: false, pitch: 95 + rng() * 30, voiceIdx: n });
      a.groundFn = (gx, gz) => W.th(gx, gz); a.hp = 100; a.alert = 0; a.state = { mode: 'calm' }; a.beh = beh; a.home = [x, z, yaw]; a.enemy = true; a.wk = wk;
      if (beh === 'sitfire' || beh === 'table') { a.anim = 'sit'; a.seat = beh === 'table' ? 'lean' : n % 2 ? 'talk' : 'plain'; a.sitY = -.5; }
      else if (beh === 'smoke') a.idleKind = 'smoke'; else if (beh === 'talk') a.idleKind = 'talk'; else if (beh === 'work') a.idleKind = 'work'; else if (beh === 'sleep') { a.anim = 'sit'; a.seat = 'sleep'; }
      else if (beh === 'guard' || beh === 'post') a.idleKind = 'guard';
      if (beh === 'patrol') { a.route = pts[pi++]; a.ri = 0; }
      a.script = (b, dt) => Combat.think(b, dt);
      G.actors.push(a); this.enemies.push(a);
    });
    // chatter at the fire
    this.chatT = 4;
  },
  tutorial() {
    const steps = [['[Q]  DRAW / HOLSTER YOUR SIDEARM', () => P.drawn > .5], ['[RMB]  AIM   ·   [LMB]  FIRE', () => P.aim > .5], ['[CTRL]  CROUCH — HARDER TO SPOT. GUNFIRE GIVES YOUR POSITION AWAY.', () => P.crouch > .5], ['APPROACH A GUARD FROM BEHIND  ·  [F]  SILENT TAKEDOWN', () => this.dead > 0]];
    Story.run(function* () { for (const [t, done] of steps) { UI.hint(t); yield () => done() || Combat.anyAlert(); yield .8; if (Combat.anyAlert()) break; } UI.hint(''); });
  },
  anyAlert() { return this.enemies.some(e => !e.dead && e.state.mode === 'combat'); },
  /* ---------------- per frame ---------------- */
  update(dt) {
    if (!this.built) return; this.fireCd -= dt;
    // draw / holster
    if (IN.hit('KeyQ') && P.state === 'walk' && !this.td) { P.drawWant = !P.drawWant; AUD.mech('draw'); }
    P.drawn = damp(P.drawn, P.drawWant ? 1 : 0, 9, dt);
    P.aim = damp(P.aim, P.drawWant && IN.mb[2] && P.state === 'walk' && !this.td ? 1 : 0, 12, dt); P.aimSens = 1 - P.aim * .45;
    P.fovOverride = P.aim > .05 ? G.settings.fov - P.aim * 12 : null;
    if (IN.hit('Digit1')) { this.switchTo('pistol'); P.drawWant = true; } if (IN.hit('Digit2') && this.weps.rifle) { this.switchTo('rifle'); P.drawWant = true; }
    if (P.drawWant && P.drawn > .8 && (this.st.auto ? IN.mb[0] : IN.mbHit[0]) && this.fireCd <= 0 && P.state === 'walk' && !this.td) this.fire();
    if (IN.hit('KeyR') && P.drawWant && this.ammo.mag < this.st.mag && this.ammo.res > 0 && !this.reloadT) { this.reloadT = this.st.reload; AUD.mech('magOut'); G.after(.8, () => AUD.mech('magIn')); G.after(1.2, () => AUD.mech('slide')); }
    if (this.reloadT) { this.reloadT -= dt; if (this.reloadT <= 0) { this.reloadT = 0; const n = Math.min(this.st.mag - this.ammo.mag, this.ammo.res); this.ammo.mag += n; this.ammo.res -= n; } }
    // takedown prompt
    if (!this.td && P.state === 'walk') { const t = this.takedownTarget(); if (t) { P.prompt = '[F]  SILENT TAKEDOWN'; if (IN.hit('KeyF')) this.startTakedown(t); } }
    // health
    if (G.time - P.lastHurt > 5) P.health = Math.min(100, P.health + 12 * dt);
    R.post.hurt = damp(R.post.hurt || 0, clamp((70 - P.health) / 70, 0, 1) + (G.time - P.lastHurt < .3 ? .6 : 0), 5, dt);
    // detection readout
    let det = 0, combat = false; for (const e of this.enemies) { if (e.dead) continue; det = Math.max(det, e.alert); if (e.state.mode === 'combat') combat = true; }
    UI.detect(combat ? 2 : det, this.ammo, P.drawWant);
    // fire-side chatter
    this.chatT -= dt; if (this.chatT <= 0 && !combat) { this.chatT = 7 + Math.random() * 6; const sp = this.enemies.filter(e => !e.dead && (e.beh === 'sitfire' || e.beh === 'talk' || e.beh === 'table') && e.state.mode === 'calm'); if (sp.length && V.dist(sp[0].pos, P.pos) < 45) G.speak(sp[(Math.random() * sp.length) | 0], ['Oye, pásame la botella.', 'Did you hear the plane go down? Boom. Like fireworks.', 'El jefe wants the survivors alive. Or not. Whatever.', 'This rain never stops, man.', 'Ha! You owe me fifty pesos.'][(Math.random() * 5) | 0]); }
    // all down: the camp is clear
    for (const a of this.allies) this.allyThink(a, dt);
    if (this.cfg.waves) { if (this.cfg.tick) this.cfg.tick(this, dt); }
    else if (!this.cleared && this.enemies.every(e => e.dead)) { this.cleared = true; this.cfg.onClear ? this.cfg.onClear() : this.campCleared(); }
  },
  preBody(dt) { if (!P.combat) return; this.poseGun(dt); if (this.td) this.updateTakedown(dt); },
  // the view basis for this frame (the camera itself is updated after the body)
  view() { const cp = Math.cos(P.pitch), f = [-Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp]; const r = [Math.cos(P.yaw), 0, -Math.sin(P.yaw)]; const u = V.cross(r, f); const d = P._pp ? V.sub(P.pos, P._pp) : [0, 0, 0]; P._pp = V.copy(P.pos); return { pos: V.add(G.cam.pos, d), fwd: f, right: r, up: u }; },
  /* ---------------- the weapon in your hands ---------------- */
  poseGun(dt) {
    const g = this.gun; const d = P.drawn; g.hidden = d < .05 || P.state === 'off';
    if (g.hidden) return;
    const c = this.view(); const a = P.aim; P.kick = damp(P.kick, 0, 14, dt); const bob = Math.sin(P.ph || 0) * .006 * clamp(P.speed, 0, 3) * (1 - a);
    const R_ = this.st.rifle;
    const hip = R_ ? V.add(V.add(V.add(c.pos, V.sc(c.fwd, .3)), V.sc(c.right, .16)), V.sc(c.up, -.24 + bob)) : V.add(V.add(V.add(c.pos, V.sc(c.fwd, .5)), V.sc(c.right, .17)), V.sc(c.up, -.22 + bob));
    const ads = R_ ? V.add(V.add(c.pos, V.sc(c.fwd, .16 - P.kick * .04)), V.sc(c.up, -.1)) : V.add(V.add(c.pos, V.sc(c.fwd, .52 - P.kick * .05)), V.sc(c.up, -.047));
    const holster = M4.pt(P.rig.mats[SK.PEL], .22, -.05, .02);
    let p = V.lerp(hip, ads, smooth(a)); p = V.lerp(holster, p, smooth(d)); this.reloadT && (p = V.add(p, V.sc(c.up, -.08 * Math.sin(clamp(this.reloadT / 1.4, 0, 1) * Math.PI))));
    // orientation: barrel along the view, a touch canted at the hip, kicked up by recoil
    const fwd = V.norm(V.add(c.fwd, V.add(V.sc(c.up, P.kick * .35), V.sc(c.right, -.06 * (1 - a))))); const right = V.norm(V.cross(fwd, c.up)); const up = V.cross(right, fwd);
    M4.basis(g.m, right, up, V.sc(fwd, -1), p); g.pos = p;
    // both hands on it: right on the grip, left cupping underneath
    const grip = R_ ? M4.pt(g.m, 0, -.07, .03) : M4.pt(g.m, 0, -.045, .005), sup = R_ ? M4.pt(g.m, -.01, .0, -.36) : M4.pt(g.m, -.012, -.05, -.015);
    P.ik.push({ left: false, T: grip, pole: V.add(V.add(V.sc(c.right, .35), V.sc(c.up, -2)), V.sc(c.fwd, -.3)), fingers: M4.dir(g.m, 0, -.3, -1) });
    if (d > .7) P.ik.push({ left: true, T: V.lerp(M4.pt(P.rig.mats[SK.CH], -.25, -.1, -.1), sup, smooth((d - .7) / .3)), pole: V.add(V.add(V.sc(c.right, -.35), V.sc(c.up, -2)), V.sc(c.fwd, -.3)), fingers: M4.dir(g.m, .3, -.2, -1) });
  },
  fire() {
    if (this.reloadT) return; if (this.ammo.mag <= 0) { AUD.mech('dry'); this.fireCd = .25; return; }
    const S_ = this.st; this.ammo.mag--; this.fireCd = 60 / S_.rpm; const c = G.cam; const sp = lerp(S_.spread, S_.adsSpread, P.aim) * (P.speed > .5 ? 1.6 : 1);
    const a = Math.random() * TAU, m = Math.sqrt(Math.random()) * sp; const dir = V.norm(V.add(c.fwd, V.add(V.sc(c.right, Math.cos(a) * m), V.sc(c.up, Math.sin(a) * m))));
    AUD.shot(S_.snd, null); P.kick = 1; P.pitch += S_.recoil * (P.aim > .5 ? .6 : 1); P.yaw += (Math.random() - .5) * .02; P.shake = Math.max(P.shake, .15);
    const mz = S_.rifle ? M4.pt(this.gun.m, 0, .045, -.74) : M4.pt(this.gun.m, 0, .022, -.19); for (let i = 0; i < 6; i++) G.particles.push({ p: V.copy(mz), v: V.add(V.sc(dir, rnd(2, 6)), [rnd(-.5, .5), rnd(-.5, .5), rnd(-.5, .5)]), life: 0, max: .06, s: rnd(.03, .07), c: [1, .8, .4], a: 1, add: true });
    G.puff(mz, { s: .08, grow: .5, c: [.6, .6, .6], a: .25, max: 1.5, v: V.sc(dir, .6), g: -.1 }); G.dynLights.push(this.mf = { pos: mz, col: [1, .7, .35], i: 4, range: 8 }); G.after(.05, () => { const k = G.dynLights.indexOf(this.mf); if (k >= 0) G.dynLights.splice(k, 1); });
    G.particles.push({ p: M4.pt(this.gun.m, .02, .03, -.06), v: V.add(V.sc(c.right, rnd(1.5, 2.5)), [0, rnd(1.5, 2.5), 0]), life: 0, max: 1, s: .008, c: [.8, .6, .25], a: 1, g: 9.8, drag: .2 });
    // what did we hit?
    const wh = this.W.ray(c.pos, dir, 200, { bullet: true }); let wt = wh ? wh.t : 200; let best = null, bt = wt;
    for (const e of this.enemies) { if (e.dead) continue; for (const [bone, r, part] of [[SK.HD, .13, 'head'], [SK.CH, .24, 'chest'], [SK.PEL, .2, 'body']]) { const cp = bone === SK.HD ? M4.pt(e.rig.mats[SK.HD], 0, .1, 0) : bone === SK.CH ? M4.pt(e.rig.mats[SK.CH], 0, .2, 0) : e.rig.bonePos(SK.PEL); const oc = V.sub(cp, c.pos); const tt = V.dot(oc, dir); if (tt < 0 || tt > bt) continue; const dd = V.len(V.sub(oc, V.sc(dir, tt))); if (dd < r) { bt = tt; best = { e, part, p: V.add(c.pos, V.sc(dir, tt)) }; } } }
    if (best) this.hitEnemy(best.e, best.part, best.p, dir);
    else if (wh) { for (let i = 0; i < 6; i++) G.particles.push({ p: V.add(wh.p, V.sc(wh.n, .03)), v: V.add(V.sc(wh.n, rnd(1, 3)), [rnd(-1, 1), rnd(0, 2), rnd(-1, 1)]), life: 0, max: rnd(.3, .7), s: rnd(.02, .05), c: [.3, .26, .18], a: .9, g: 9.8, drag: 1 }); G.puff(wh.p, { s: .2, grow: .6, c: [.45, .42, .35], a: .4, max: 1.5 }); AUD.impact(wh.surf === 'wood' ? 'wood' : 'mud', wh.p); }
    // everyone in earshot now knows roughly where you are
    for (const e of this.enemies) { if (e.dead) continue; const d = V.dist(e.pos, P.pos); if (d > S_.noise) continue; const err = 4 + d * .12; this.alarm(e, [P.pos[0] + rnd(-err, err), P.pos[1], P.pos[2] + rnd(-err, err)], d < 25); }
  },
  hitEnemy(e, part, p, dir, byAlly) {
    const dmg = byAlly ? (part === 'head' ? 300 : 40) : part === 'head' ? 300 : part === 'chest' ? this.st.dmg : this.st.dmg * .8; e.hp -= dmg; AUD.impact('flesh', p);
    // blood: exit spray, mist, drops; a hit to the head is final
    for (let i = 0; i < (part === 'head' ? 34 : 18); i++) G.particles.push({ p: V.copy(p), v: V.add(V.sc(dir, rnd(1, part === 'head' ? 7 : 4)), [rnd(-1.2, 1.2), rnd(-.3, 1.6), rnd(-1.2, 1.2)]), life: 0, max: rnd(.4, 1.1), s: rnd(.015, .05), c: [.42, .02, .02], a: 1, g: 9.8, drag: .6 });
    for (let i = 0; i < 3; i++) G.particles.push({ p: V.copy(p), v: V.sc(dir, rnd(.5, 1.5)), life: 0, max: .6, s: rnd(.12, .25), grow: .9, c: [.38, .03, .03], a: .5, drag: 2 });
    this.splatter(V.add(p, V.sc(dir, .8)), dir);
    e.flinch = 1;
    if (e.hp <= 0) this.kill(e, dir, part === 'head');
    else if (!byAlly) this.alarm(e, V.copy(P.pos), true);
  },
  splatter(p, dir) { // blood on whatever is behind the target
    const h = this.W.ray(p, dir, 2.5, { bullet: true }); const q = h ? h.p : [p[0] + dir[0], this.W.th(p[0] + dir[0], p[2] + dir[2]) + .02, p[2] + dir[2]]; const n = h ? h.n : [0, 1, 0];
    const B = new MB(600); B.col(0x5a0606, MAT.BLOOD); const t1 = V.norm(V.cross(n, Math.abs(n[1]) > .9 ? [1, 0, 0] : [0, 1, 0])), t2 = V.cross(n, t1);
    for (let i = 0; i < 6; i++) { const o = V.add(V.sc(t1, rnd(-.25, .25)), V.sc(t2, rnd(-.25, .25))); const s = rnd(.03, .12); const c0 = V.add(V.add(q, o), V.sc(n, .006)); B.begin(); B.quad(V.add(c0, V.add(V.sc(t1, -s), V.sc(t2, -s))), V.add(c0, V.add(V.sc(t1, s), V.sc(t2, -s))), V.add(c0, V.add(V.sc(t1, s), V.sc(t2, s))), V.add(c0, V.add(V.sc(t1, -s), V.sc(t2, s)))); }
    G.extraDyn.push({ mesh: B.mesh(), m: M4.create(), pos: q, r: 1, noShadow: true });
  },
  kill(e, dir, head, silent) {
    e.dead = true; e.path = null; e.script = null; e.post = null; e.look = null; e.weaponMode = 'hidden'; e.state.mode = 'dead'; this.dead++;
    if (!silent) G.speak(e, head ? '' : ['¡Ahh—!', 'Ngh—', '¡Me dieron!'][(Math.random() * 3) | 0]);
    const fall = Math.random() < .5 ? 1 : -1; let t = 0; const k0 = e.k; e.anim = 'custom'; e.blendK = 9; e.extraYaw = 0;
    e.customPose = (j) => { poseDead(j, k0 % 1); return 0; };
    e.rootFn = (r, b) => { t = Math.min(t + G.dt, 1); const ee = ease(t / .85); M4.translate(r, r, 0, .13 * ee, 0); M4.rotX(r, r, fall * Math.PI / 2 * ee); };
    // the dropped weapon and a slowly spreading pool
    const w = new MB(2000); w.b(0); buildNpcWeapon(w, e.wk); const wm = M4.create(); const wp = [e.pos[0] + rnd(-.6, .6), this.W.th(e.pos[0], e.pos[2]) + .04, e.pos[2] + rnd(-.6, .6)]; M4.translate(wm, wm, wp[0], wp[1], wp[2]); M4.rotY(wm, wm, rnd(0, TAU)); M4.rotZ(wm, wm, Math.PI / 2);
    G.extraDyn.push({ mesh: w.mesh(), m: wm, pos: wp, r: 1 });
    const pb = new MB(300); pb.col(0x4a0404, MAT.BLOOD).blob(0, 0, 0, 1, .02, e.id, .35, 12, 3); const pool = { mesh: pb.mesh(), m: M4.create(), pos: V.copy(e.pos), r: 2, noShadow: true, s: .05 }; e.pool = pool; G.extraDyn.push(pool);
    const at = V.add(e.pos, [-Math.sin(e.yaw) * fall * -.8, 0, -Math.cos(e.yaw) * fall * -.8]);
    G.updaters.push(dt => { if (pool.s < 1) { pool.s = Math.min(1, pool.s + dt * .08); M4.ident(pool.m); M4.translate(pool.m, pool.m, at[0], this.W.th(at[0], at[2]) + .015, at[2]); M4.scale(pool.m, pool.m, pool.s * .9, 1, pool.s * .7); } });
    // witnesses
    for (const o of this.enemies) { if (o.dead || o === e) continue; if (this.sees(o, V.add(e.pos, [0, .8, 0]), 22)) this.alarm(o, V.copy(e.pos), !silent); }
  },
  /* ---------------- perception & behaviour ---------------- */
  sees(e, target, range) {
    const eye = e.rig.bonePos(SK.HD); const d = V.dist(eye, target); if (d > range) return false;
    const f = [-Math.sin(e.yaw + e.headYaw * e.lookAmt), 0, -Math.cos(e.yaw + e.headYaw * e.lookAmt)]; const to = V.norm(V.sub(target, eye)); const cosA = (to[0] * f[0] + to[2] * f[2]) / (Math.hypot(to[0], to[2]) || 1);
    if (cosA < (e.state.mode === 'combat' ? -.2 : .35) && d > 2.5) return false;
    if (!this.W.los(eye, target)) return false;
    return this.W.foliage(eye, target) < .85;
  },
  alarm(e, where, sure) {
    if (e.dead) return; e.state.last = where; e.state.lastT = G.time;
    if (sure || e.state.mode === 'combat') { if (e.state.mode !== 'combat') { e.state.mode = 'combat'; e.state.engT = G.time; e.fireCd = rnd(1, 2.2); G.speak(e, ['¡Allá! ¡Disparen!', "There! Someone's out there!", '¡Nos atacan!', 'Contact! In the trees!'][(Math.random() * 4) | 0]); } }
    else if (e.state.mode === 'calm') { e.state.mode = 'search'; G.speak(e, ['¿Qué fue eso?', 'You hear that?', 'Hey... over there.'][(Math.random() * 3) | 0]); }
    if (e.anim === 'sit') { e.anim = 'idle'; e.blendK = 4; } e.weaponMode = 'aim';
  },
  think(e, dt) {
    if (e.dead || e === (this.td && this.td.e)) return;
    const st = e.state; const pe = V.add(P.pos, [0, P.crouch > .5 ? 1.0 : 1.6, 0]);
    // vision → suspicion
    const seeR = (st.mode === 'combat' ? 55 : 30) * (P.crouch > .5 ? .55 : 1) * (P.speed > 2.5 ? 1.25 : 1) * (e.anim === 'sit' ? .8 : 1) * (e.seat === 'sleep' ? 0 : 1);
    const can = P.state === 'walk' && this.sees(e, pe, seeR);
    if (can) { const d = V.dist(e.pos, P.pos); e.alert = Math.min(1.2, e.alert + dt * (1.6 - d / seeR) * (P.crouch > .5 ? .45 : 1) * (P.drawWant ? 1.2 : 1) * (st.mode !== 'calm' ? 2 : 1)); if (e.alert > .35) { e.look = () => pe; } if (e.alert >= 1) this.alarm(e, V.copy(P.pos), true); if (st.mode === 'combat') { st.last = V.copy(P.pos); st.lastT = G.time; } }
    else e.alert = Math.max(0, e.alert - dt * .15);
    e.canSee = can;
    if (st.mode === 'calm') {
      if (e.beh === 'patrol' && !e.path) { const p = e.route[e.ri++ % e.route.length]; G.after(rnd(1, 4), () => { if (!e.dead && e.state.mode === 'calm') e.goTo([[p[0], 0, p[1]]]); }); e.path = []; }
      if (e.alert > .45 && e.alert < 1) { e.state.mode = 'search'; e.state.last = V.copy(P.pos); }
      return;
    }
    if (st.mode === 'search') {
      if (e.anim === 'sit') { e.anim = 'idle'; e.blendK = 4; } e.weaponMode = 'low';
      if (!e.path || !e.path.length) { const l = st.last; if (V.dist(e.pos, l) > 2) e.goTo([[l[0], 0, l[2]]]); else if (!st.lookT) { st.lookT = G.time; e.look = () => V.add(e.pos, [Math.sin(G.time) * 5, 1.5, Math.cos(G.time) * 5]); } else if (G.time - st.lookT > 8) { st.mode = 'calm'; st.lookT = 0; e.look = null; if (e.home) { e.goTo([[e.home[0], 0, e.home[1]]], false, b => { b.yaw = b.home[2]; }); } } }
      return;
    }
    // combat: face the threat, close in when you can't see them, fire bursts when you can
    e.weaponMode = 'aim'; e.run = false; const d = V.dist(e.pos, P.pos);
    const tgt = can ? P.pos : (st.last || P.pos); const want = Math.atan2(-(tgt[0] - e.pos[0]), -(tgt[2] - e.pos[2]));
    if (e.hold && e.path && e.path.length) { /* still running to the firing line */ }
    else if (can) { e.path = null; e.yaw = dampAng(e.yaw, want, 6, dt); e.look = () => pe; if (d > 22 && !e.hold) e.goTo([[e.pos[0] + (tgt[0] - e.pos[0]) * .2, 0, e.pos[2] + (tgt[2] - e.pos[2]) * .2]]); }
    else if (e.hold) { e.yaw = dampAng(e.yaw, want + Math.sin(G.time * .7 + e.id) * .3, 2, dt); }
    else if (!e.path || !e.path.length) { if (st.last && V.dist(e.pos, st.last) > 3) e.goTo([[st.last[0] + rnd(-3, 3), 0, st.last[2] + rnd(-3, 3)]], d > 15); else e.yaw = dampAng(e.yaw, want + Math.sin(G.time + e.id) * .8, 2, dt); }
    e.fireCd = (e.fireCd ?? rnd(.6, 1.5)) - dt;
    if (can && e.fireCd <= 0 && P.state === 'walk') {
      const burst = e.wk === 'ak' || e.wk === 'smg' ? 3 : 1; e.fireCd = burst > 1 ? rnd(1.1, 2) : rnd(.7, 1.3);
      for (let i = 0; i < burst; i++) G.after(i * .1, () => {
        if (e.dead) return; const mz = M4.pt(e.rig.mats[SK.WPN], 0, .05, -.5); AUD.shot(e.wk === 'shotgun' ? 'shotgun' : e.wk === 'pistol' ? 'npcPistol' : 'npcRifle', mz);
        G.particles.push({ p: mz, v: [0, 0, 0], life: 0, max: .05, s: .18, c: [1, .75, .35], a: 1, add: true });
        { const tg = V.add(P.pos, [rnd(-1.5, 1.5), rnd(.5, 2), rnd(-1.5, 1.5)]); const td = V.norm(V.sub(tg, mz)); G.particles.push({ p: V.add(mz, V.sc(td, 4)), v: V.sc(td, 260), dir: td, w: .02, life: 0, max: Math.min(.35, V.dist(mz, tg) / 260), s: 2.5, c: [1, .85, .5], a: .9, add: true, streak: true }); }
        const acc = clamp(.36 - d / 80 - (P.crouch > .5 ? .1 : 0) - (P.speed > 2 ? .12 : 0) + Math.min(.15, (G.time - (e.state.engT || G.time)) * .02), .05, .45);
        if (Math.random() < acc) this.hurtPlayer(e.wk === 'shotgun' ? (d < 10 ? 30 : 8) : e.wk === 'ak' ? 9 : 7, mz);
        else { AUD.click(4000 + Math.random() * 2000, .1, V.add(P.pos, [rnd(-2, 2), 1.6, rnd(-2, 2)]), .01); AUD.swoosh(.15, V.add(P.pos, [rnd(-1, 1), 1.7, rnd(-1, 1)]), 2400, .06); }
      });
    }
  },
  /* ---------------- squad mates: pick a target they can see and put rounds on it ---------------- */
  allyThink(a, dt) {
    if (a.down) return; a.fireCd = (a.fireCd ?? rnd(.5, 2)) - dt; let best = null, bd = 70;
    if (!a._scan || G.time - a._scan > .7) { a._scan = G.time; a._tgt = null; for (const e of this.enemies) { if (e.dead || e.state.mode !== 'combat') continue; const d = V.dist(e.pos, a.pos); if (d < bd && this.W.los(V.add(a.pos, [0, a.anim === 'crouch' ? 1 : 1.5, 0]), V.add(e.pos, [0, 1.3, 0]))) { bd = d; best = e; } } a._tgt = best; }
    const t = a._tgt; if (!t || t.dead) { a.weaponMode = a.combatReady ? 'low' : a.weaponMode; return; }
    a.weaponMode = 'aim'; const want = Math.atan2(-(t.pos[0] - a.pos[0]), -(t.pos[2] - a.pos[2])); if (!a.path) a.yaw = dampAng(a.yaw, want, 5, dt); a.look = () => V.add(t.pos, [0, 1.4, 0]);
    if (a.fireCd <= 0) { a.fireCd = rnd(.9, 2.2); const n = 2 + (Math.random() * 3 | 0);
      for (let i = 0; i < n; i++) G.after(i * .09, () => { if (a.down || t.dead) return; const mz = M4.pt(a.rig.mats[SK.WPN], 0, .05, -.6); AUD.shot('npcRifle', mz); G.particles.push({ p: mz, v: [0, 0, 0], life: 0, max: .05, s: .16, c: [1, .75, .35], a: 1, add: true });
        const tp = V.add(t.pos, [rnd(-.8, .8), rnd(.6, 1.8), rnd(-.8, .8)]); const td = V.norm(V.sub(tp, mz)); G.particles.push({ p: V.add(mz, V.sc(td, 3)), v: V.sc(td, 260), dir: td, w: .02, life: 0, max: Math.min(.4, V.dist(mz, tp) / 260), s: 2.5, c: [1, .85, .5], a: .8, add: true, streak: true });
        if (Math.random() < (a.acc || .14)) this.hitEnemy(t, Math.random() < .15 ? 'head' : 'chest', V.add(t.rig.bonePos(SK.CH), [0, .15, 0]), td, true); }); }
  },
  hurtPlayer(dmg, from) {
    P.health -= dmg; P.lastHurt = G.time; P.shake = Math.max(P.shake, .6); AUD.hurt && AUD.hurt();
    for (let i = 0; i < 6; i++) G.particles.push({ p: V.add(G.cam.pos, V.add(V.sc(G.cam.fwd, .5), [rnd(-.2, .2), rnd(-.3, 0), rnd(-.2, .2)])), v: [rnd(-1, 1), rnd(-1, .5), rnd(-1, 1)], life: 0, max: .4, s: .02, c: [.42, .02, .02], a: 1, g: 9.8 });
    if (P.health <= 0) this.playerDown();
  },
  playerDown() {
    P.state = 'off'; P.drawWant = false; UI.fadeTo(1, 1.2); UI.died(true);
    if (this.cfg.respawn) { G.after(3.2, () => { UI.died(false); this.td = null; P.health = 100; this.cfg.respawn(this); P.state = 'walk'; UI.fadeTo(0, 1.5); }); return; }
    G.after(3.2, () => { UI.died(false); this.td = null; P.health = 100; this.ammo = { mag: 12, res: 48 }; this.dead = 0; this.cleared = false; this.spawn(); const c = this.W.campCenter; const tp = TRAIL[TRAIL.length - 3]; P.pos = [tp[0], this.W.th(tp[0], tp[1]), tp[1]]; P.yaw = Math.atan2(-(c[0] - tp[0]), -(c[2] - tp[1])); P.pitch = 0; P.state = 'walk'; P.crouchWant = true; UI.fadeTo(0, 1.5); });
  },
  /* ---------------- silent takedown ---------------- */
  takedownTarget() {
    for (const e of this.enemies) { if (e.dead || e.state.mode === 'combat') continue; const d = Math.hypot(e.pos[0] - P.pos[0], e.pos[2] - P.pos[2]); if (d > 1.6) continue;
      const toP = Math.atan2(-(P.pos[0] - e.pos[0]), -(P.pos[2] - e.pos[2])); if (Math.abs(angDiff(e.yaw, toP)) < 1.9 && !(e.anim === 'sit' && Math.abs(angDiff(e.yaw, toP)) > 1.3)) continue;
      const lk = Math.atan2(-(e.pos[0] - P.pos[0]), -(e.pos[2] - P.pos[2])); if (Math.abs(angDiff(P.yaw, lk)) > 1.1) continue; return e; }
    return null;
  },
  startTakedown(e) {
    this.td = { e, t: 0, from: V.copy(P.pos) }; P.state = 'cut'; P.cut = null; e.path = null; e.look = null; P.drawWantBefore = P.drawWant; P.drawWant = false;
    const back = [e.pos[0] + Math.sin(e.yaw) * .55, e.pos[1], e.pos[2] + Math.cos(e.yaw) * .55]; this.td.to = back; this.td.yaw = e.yaw;
    if (e.anim === 'sit') { e.anim = 'idle'; } AUD.swoosh(.3, null, 700, .3);
  },
  updateTakedown(dt) {
    const T = this.td, e = T.e; T.t += dt; const k = smooth(T.t / .35);
    P.pos = V.lerp(T.from, T.to, k); P.yaw = dampAng(P.yaw, T.yaw, 12, dt); P.pitch = damp(P.pitch, -.25, 6, dt);
    // arm around the throat, other hand on the head, pull back; he struggles, then goes limp
    const neck = M4.pt(e.rig.mats[SK.CH], 0, .44, -.02), head = M4.pt(e.rig.mats[SK.HD], .02, .12, .05);
    P.ik.push({ left: false, T: V.add(neck, M4.dir(e.root, .12, 0, -.05)), pole: M4.dir(e.root, 1, -.5, 0) }); P.ik.push({ left: true, T: head, pole: M4.dir(e.root, -1, 0, .5) });
    const str = T.t > .35 && T.t < 1.6 ? Math.sin(T.t * 22) * (1.6 - T.t) * .25 : 0; P.shake = Math.max(P.shake, Math.abs(str));
    e.anim = 'custom'; e.customPose = (j, b) => { poseIdle(j, b.t, 'idle', b.k); const s = Math.sin(T.t * 19); pj(j, SK.UAL, 1.2 + s * .3, .3, -.4); pj(j, SK.FAL, 1.9, 0, 0); pj(j, SK.UAR, 1.1 - s * .3, -.3, .4); pj(j, SK.FAR, 2, 0, 0); pj(j, SK.HD, -.5, s * .2, 0); pj(j, SK.CH, -.25, 0, 0); if (T.t > 1.2) { const l = smooth((T.t - 1.2) / .5); pj(j, SK.THL, l * .8, 0, 0); pj(j, SK.THR, l * .7, 0, 0); pj(j, SK.SHL, -l * 1.4, 0, 0); pj(j, SK.SHR, -l * 1.3, 0, 0); } return T.t > 1.2 ? -.35 * smooth((T.t - 1.2) / .5) : 0; };
    if (Math.random() < .3 && T.t < 1.4) AUD.squish();
    if (T.t > 1.9) { this.td = null; P.state = 'walk'; this.kill(e, [0, 0, 0], false, true); e.pool && (e.pool.s = .9); P.drawWant = P.drawWantBefore; P.shake = .2; }
  },
  campCleared() {
    const me = Cabin.me(); UI.objective(''); UI.hint('');
    Story.run(function* () {
      yield 1.5; yield Story.say(me, "...clear.");
      yield .8; AUD.radioCrackle(1.4); yield 1.5;
      yield Story.say({ name: 'Mox (radio)', vpitch: 1.05, vrate: 1.05, voiceIdx: 1 }, "—ook... Rook, you copy? I'm at the river... they're everywhere. Get here.", { radio: true });
      yield 1; yield Story.say(me, "Copy, Mox. On my way.");
      yield 2; UI.fadeTo(1, 2.5); yield 2.8; AUD.stopAllLoops(); Part3.start();
    });
  },
};
