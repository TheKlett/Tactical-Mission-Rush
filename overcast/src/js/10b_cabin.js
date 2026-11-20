/* =====================================================================
   OVERCAST — the cabin: Mox, Sergeant Hale, the stick of jumpers,
   seating, the juice box, small talk, stand up, ramp, green light, GO.
   ===================================================================== */
const Cabin = {
  crew: [], mox: null, hale: null, seatIdx: { player: 16, mox: 17, juice: 18 },
  seatW(i, side) { return TP.seats[(side > 0 ? 30 : 0) + i]; },
  build(S) {
    const rng = mulberry(1234); this.crew = []; const pl = S.plane;
    const frame = pl;
    const mk = (app, o) => { const a = new Actor(app, o); G.actors.push(a); this.crew.push(a); return a; };
    // ---- Mox: waits outside the washroom first ----
    const C = FOB.cont, D = S.door;
    this.mox = mk(soldierApp(rng, { skin: 0xd8a888, hairStyle: 'short', beard: 'full', hair: 0x6a4a2a, eyewear: 'none', head: 'helmet', bulk: 1.05, height: 1.0 }), { name: 'Mox', pos: [D.hinge[0] + 2.6, 0, D.hinge[2] + 2.2], yaw: Math.PI / 2 + .5, weapon: 'rifle', weaponMode: 'sling', pitch: 128, vpitch: 1.05, vrate: 1.05, voiceIdx: 1, gearOpts: { goggles: true } });
    this.mox.keep = true; this.mox.idleKind = 'idle'; this.mox.script = Cabin.moxScript;
    // ---- Hale: jumpmaster, waits at the ramp ----
    this.hale = mk(soldierApp(rng, { skin: 0xb07a5a, hairStyle: 'buzz', beard: 'mustache', hair: 0x4a4a46, head: 'cap', bulk: 1.12, height: 1.02 }), { name: 'Sgt. Hale', frame, pos: [1.1, TP.floor, TP.z1 + 1.2], yaw: Math.PI, pitch: 92, vpitch: .78, vrate: .95, voiceIdx: 3, gearOpts: { goggles: false } });
    this.hale.look = () => P.worldPos ? V.add(P.worldPos(), [0, 1.6, 0]) : G.cam.pos; this.hale.idleKind = 'idle';
    // ---- the stick: seated jumpers with their own habits ----
    const L = -1, Rt = 1; const plan = [
      [L, 3, 'sleep'], [L, 6, 'knee'], [L, 9, 'talk'], [L, 10, 'lean'], [L, 12, 'watch'], [L, 20, 'pray'], [L, 22, 'plain'], [L, 25, 'talk'], [L, 26, 'plain'],
      [Rt, 5, 'plain'], [Rt, 8, 'sleep'], [Rt, 11, 'watch'], [Rt, 13, 'legout', 'sniper'], [Rt, 19, 'revolver'], [Rt, 21, 'knee'], [Rt, 23, 'talk'], [Rt, 24, 'lean'], [Rt, 27, 'plain'],
    ];
    const names = ['Diaz', 'Okafor', 'Brandt', 'Kowalski', 'Reyes', 'Lindqvist', 'Tanaka', 'Moreau', 'Hollis', 'Ash', 'Petrov', 'Nguyen', 'Volk', 'Carter', 'Sato', 'Ibarra', 'Quinn', 'Doyle'];
    plan.forEach(([side, i, v, extra], n) => {
      const s = this.seatW(i, side); const a = mk(soldierApp(rng), { name: names[n], frame, pos: V.copy(s.pos), yaw: s.yaw, anim: 'sit', weapon: v === 'revolver' || v === 'legout' || v === 'pray' ? null : 'rifle', weaponMode: v === 'sleep' || v === 'lean' ? 'sling' : 'knees', voiceIdx: n });
      a.seat = v === 'revolver' || v === 'plain' ? 'plain' : v; a.seated = true; a.seatI = i; a.side = side;
      if (extra === 'sniper') { const p = a.addProp(buildSniper(), SK.PEL, M4.trs(M4.create(), M4.create(), .02, .16, -.3, .08, Math.PI / 2 + .1, 0)); a.post = (b) => { const m = p.m; b.ik.push({ left: true, T: M4.pt(b.rig.mats[SK.PEL], .32, .2, -.32), pole: M4.dir(b.root, -1, -.5, 0) }); b.ik.push({ left: false, T: M4.pt(b.rig.mats[SK.PEL], -.18, .22, -.3), pole: M4.dir(b.root, 1, -.5, 0) }); M4.mul(m, b.rig.mats[SK.PEL], p.off); }; }
      if (v === 'revolver') Cabin.revolverGuy(a);
      if (v === 'pray') a.post = (b) => { const c = b.rig.mats[SK.CH]; const T = M4.pt(c, 0, .28, -.3); b.ik.push({ left: true, T: V.add(T, M4.dir(c, -.03, 0, 0)), pole: M4.dir(b.root, -1, -1, 0), fingers: M4.dir(c, .2, 1, -.2) }); b.ik.push({ left: false, T: V.add(T, M4.dir(c, .03, 0, 0)), pole: M4.dir(b.root, 1, -1, 0), fingers: M4.dir(c, -.2, 1, -.2) }); };
    });
    this.seatedPlayer = false;
  },
  revolverGuy(a) {
    const rev = buildRevolver(); const p = a.addProp(rev, SK.HR, M4.trs(M4.create(), M4.create(), 0, -.07, -.02, -1.35, 0, 0), 2);
    a.post = (b) => {
      const c = b.rig.mats[SK.CH]; const t = b.t; const phase = (t * .12) % 1; const open = bump(phase, .15, .75);
      const T = M4.pt(c, .05, .2, -.36); b.ik.push({ left: false, T, pole: M4.dir(b.root, 1, -1, .2), fingers: M4.dir(c, -.2, .3, -1), palm: M4.dir(c, 0, 1, 0) });
      b.ik.push({ left: true, T: V.add(T, M4.dir(c, -.05 - open * .04, .03, -.04)), pole: M4.dir(b.root, -1, -1, .2), fingers: M4.dir(c, .6, .2, -.6) });
      b.headPitch = -.45; b.lookAmt = 1; b.headYaw = 0;
      const sub = p.sub[0]; M4.ident(sub); M4.translate(sub, sub, -open * .035, .04, -.04); M4.rotZ(sub, sub, (phase > .3 && phase < .6) ? t * 18 : Math.floor(t * 3) * 1.047 * open);
      if (phase > .78 && phase < .8 && !b._clk) { b._clk = true; AUD.click(2600, .12, b.headPos(), .01); } if (phase < .5) b._clk = false;
    };
  },
  moxScript(a, dt) { // follows the player around the base, keeps a sensible distance
    if (a.frame || !a.state.follow) return;
    const pp = P.inPlane ? P.worldPos() : P.pos; const f = [-Math.sin(P.yaw), 0, -Math.cos(P.yaw)], r = [Math.cos(P.yaw), 0, -Math.sin(P.yaw)];
    const tgt = [pp[0] - f[0] * 2.2 + r[0] * 1.3, 0, pp[2] - f[2] * 2.2 + r[2] * 1.3]; const d = Math.hypot(tgt[0] - a.pos[0], tgt[2] - a.pos[2]);
    if (d > 1.4 && !a.path) a.goTo([tgt], d > 7); if (a.path) { a.path[0] = tgt; a.run = d > 6; if (d < .9) { a.path = null; } }
    // simple obstacle avoidance against the world
    const q = [a.pos[0], 0, a.pos[2]]; G.W.collide(q, .35, 1.8); a.pos[0] = q[0]; a.pos[2] = q[2]; a.pos[1] = G.W.ground(a.pos[0], a.pos[2], 1.5, .5, .2);
    if (!a.path) { const want = Math.atan2(-(pp[0] - a.pos[0]), -(pp[2] - a.pos[2])); a.yaw = dampAng(a.yaw, want, 2.5, dt); }
    a.look = () => G.cam.pos;
  },
  /* ---------------- boarding ---------------- */
  onBoard() {
    const S = Story, pl = S.plane, mox = this.mox; UI.objective('Take a seat next to Mox'); UI.marker(() => M4.pt(pl.m, this.seatW(this.seatIdx.player, -1).pos[0] + .3, TP.floor + 1.0, this.seatW(this.seatIdx.player, -1).pos[2]));
    // Mox walks in after you and takes his seat
    mox.state.follow = false; const lp = M4.pt(pl.inv, mox.pos[0], mox.pos[1], mox.pos[2]); mox.frame = pl; mox.pos = lp; mox.yaw = angWrap(mox.yaw - pl.yaw); mox.groundFn = null;
    const ms = this.seatW(this.seatIdx.mox, -1);
    mox.goTo([[clamp(lp[0], -1.5, 1.5), TP.floor, Math.min(lp[2], TP.z1 + 2)], [0, TP.floor, TP.z1 - 1], [0, TP.floor, ms.pos[2] + .5], [ms.pos[0] + .7, TP.floor, ms.pos[2]]], false, (a) => { a.yaw = ms.yaw; a.pos = V.copy(ms.pos); a.anim = 'sit'; a.seat = 'talk'; a.seated = true; a.weaponMode = 'sling'; });
    Story.run(function* () {
      yield .6; yield Story.say(Cabin.hale, "Rook. Nice of you to join us. Find a seat.");
      yield () => Cabin.mox.seated; yield .5; yield Story.say(Cabin.mox, "Over here. Saved you the window. Sort of.");
    });
    const seat = this.seatW(this.seatIdx.player, -1);
    S.interacts.push({ pos: () => M4.pt(pl.m, seat.pos[0], TP.floor + .55, seat.pos[2]), r: 2.2, cone: .8, label: '[E]  SIT DOWN', enabled: () => P.state === 'cabin' && !this.seatedPlayer && S.phase === 'board', act: () => this.sitPlayer() });
  },
  sitPlayer() {
    const seat = this.seatW(this.seatIdx.player, -1); this.seatedPlayer = true; UI.marker(null); UI.objective('');
    const from = V.copy(P.local), fy = P.yaw; P.state = 'cut'; P.cutT = 0;
    const to = [seat.pos[0], TP.floor, seat.pos[2]];
    P.cut = (p, dt, t) => {
      const k = smooth(t / 1.6); p.local = V.lerp(from, to, smooth(t / 1.1)); p.yaw = lerpAng(fy, seat.yaw, smooth(t / .9)); p.pitch = damp(p.pitch, -.1, 3, dt);
      p.lockBodyYaw = lerpAng(fy, seat.yaw, smooth(t / .9));
      p.poseFn = (j, pp) => { if (t < .9) { poseIdle(j, G.time, 'idle', 1.3); return 0; } return poseSeat(j, G.time, 1.3, 'plain'); }; p.blendK = 4;
      if (t > 1.0 && !p._satSnd) { p._satSnd = true; AUD.step('cloth', null, .3); AUD.click(500, .2, null, .03); }
      if (t > 1.8) { p._satSnd = false; p.state = 'seated'; p.cut = null; p.lockBodyYaw = seat.yaw; p.poseFn = (j) => poseSeat(j, G.time, 1.3, 'plain'); p.lookLimit = { yaw: seat.yaw, yawR: 1.75, pMin: -1.0, pMax: .9 }; p.backOff = .02; Story.phase = 'seated'; Cabin.departure(); }
    };
  },
  /* ---------------- ramp up, engines, takeoff ---------------- */
  departure() {
    const S = Story, H = this.hale, pl = S.plane;
    S.run(function* () {
      yield 1.2; yield Story.say(H, "That's everybody. Closing up!");
      yield* Cabin.haleToButton();
      Flight.rampTarget = 0; AUD.buzzer(1.4); AUD.hydraulic(M4.pt(pl.m, 0, 2, TP.z1), 6);
      yield 2.5; Story.cabinLightsOn(true);
      yield* Cabin.haleWalk([[1.1, TP.floor, TP.z1 - 1.2]]); H.yaw = Math.PI;
      yield 3; Story.say({ name: 'Raven 2-1 (PA)', vpitch: .9, voiceIdx: 4 }, "Crew, Raven Two-One. We are rolling. Sit back and enjoy the weather.", { radio: true });
      Flight.startEngines(); yield 4; G.setEnv('cabin', 3);
      Flight.takeoff(); UI.hint('LOOK THROUGH THE WINDOW');
      yield 9; UI.hint('');
      yield () => Flight.phase === 'cruise';
    });
  },
  *haleWalk(pts) { const H = this.hale; let done = false; H.goTo(pts, false, () => { done = true; }); yield () => done; },
  *haleToButton() {
    const H = this.hale; yield* this.haleWalk([[-1.55, TP.floor, TP.z1 - .55]]); H.yaw = Math.PI / 2; yield .5;
    // the slap: right hand strikes the red button
    let t = 0; const pl = Story.plane;
    H.post = (b, dt) => { t += dt; const btn = M4.pt(pl.m, -2.2, 2.68, TP.z1 - .55); const k = bump(t, .0, .65); const rest = M4.pt(b.rig.mats[SK.CH], .25, -.1, -.1); const over = V.add(btn, M4.dir(pl.m, .04, 0, 0)); b.ik.push({ left: false, T: V.lerp(rest, t > .42 && t < .5 ? over : btn, smooth(k)), pole: M4.dir(b.root, 1, -1, 0) }); };
    yield .45; pl.btn = 1; AUD.click(900, .5, null, .03); AUD.doorBang(M4.pt(pl.m, -2.2, 2.7, TP.z1), .25); G.after(.25, () => pl.btn = 0); yield .5; H.post = null;
  },
  /* ---------------- cruise: sunlight, small talk, the juice box ---------------- */
  sunShafts(on) {
    const S = Story; if (!on) { for (const d of S.sunShafts) G.glass.splice(G.glass.indexOf(d), 1); S.sunShafts = []; return; }
    // shafts of light through the windows on the sunny side, with dust in them
    const B = new MB(4000);
    for (const w of TP.windows) { if (w.side < 0) continue; B.push().t(w.side * (TP.winX - .1), TP.winY, w.z).rz(-1.05).ry(.25); for (let k = 0; k < 3; k++) { const s = .22 + k * .12; B.col([1, .9, .72], MAT.EMIT).box(0, -1.5, 0, s, 3, s * 1.4); } B.pop(); }
    const d = { mesh: B.mesh(), m: S.plane.m, pos: S.plane.pos, r: 30, alpha: .05, tint: [1, .9, .7, 0] }; S.sunShafts.push(d); G.glass.push(d);
    G.updaters.push(dt => { if (Story.phase === 'fall' || Story.phase === 'end') return; if (Math.random() < .5) { const w = TP.windows[(Math.random() * TP.windows.length) | 0]; if (w.side < 0) return; const lp = [w.side * 2.4 - Math.random() * 1.8, TP.winY - Math.random() * 1.2, w.z + rnd(-.4, .4)]; const p = M4.pt(Story.plane.m, lp[0], lp[1], lp[2]); G.particles.push({ p, v: V.add(Story.plane.vel, [rnd(-.02, .02), rnd(-.02, .02), rnd(-.02, .02)]), life: 0, max: 5, s: .006, c: [1, .9, .7], a: .8, add: true, fadeIn: true }); } });
  },
  cruise() {
    const S = Story, mox = this.mox, pl = S.plane; S.phase = 'cruise';
    S.run(function* () {
      yield 4; mox.seat = 'plain'; mox.look = () => G.cam.pos;
      yield Story.say(mox, "Hey. First real jump, huh?");
      let c = yield* Cabin.choose(["Second. I don't remember much of the first.", "Yeah. Trying not to think about it.", "(say nothing)"]);
      if (c === 0) { yield Story.say(Cabin.me(), "Second. I don't remember much of the first."); yield Story.say(mox, "Ha. That's the right way to do it. Remember the landing, forget the rest."); }
      else if (c === 1) { yield Story.say(Cabin.me(), "Yeah. Trying not to think about it."); yield Story.say(mox, "Good. Thinking's what gets people hurt. Your body knows the drill."); }
      else { yield 1.2; yield Story.say(mox, "Strong silent type. Alright. I'll talk for both of us."); }
      yield .8; yield Story.say(mox, "You know what helps, though?");
      yield* Cabin.moxPullJuice();
      yield Story.say(mox, "Apple. My daughter packs 'em in my ruck. Says they're for emergencies.");
      yield Story.say(mox, "Want one?");
      c = yield* Cabin.choose(["Yeah, why not.", "No thanks. I'm good."]);
      if (c === 0) { yield Story.say(Cabin.me(), "Yeah, why not."); yield* Cabin.playerDrinks(); }
      else { yield Story.say(Cabin.me(), "No thanks. I'm good."); yield Story.say(mox, "More for me, then."); yield* Cabin.moxDrinks(); }
      yield 2;
      yield Story.say(mox, "When we hit the ground, stay on my six. Rally point is the river bend.");
      c = yield* Cabin.choose(["Copy. Your six.", "And if the chute doesn't open?"]);
      if (c === 0) { yield Story.say(Cabin.me(), "Copy. Your six."); yield Story.say(mox, "Good man."); }
      else { yield Story.say(Cabin.me(), "And if the chute doesn't open?"); yield Story.say(mox, "Then you get to the ground first and save us a spot."); yield 1; yield Story.say(mox, "Kidding. Pull the reserve. You'll be fine."); }
      yield 5; Cabin.dropSequence();
    });
  },
  me() { return { name: 'Rook', vpitch: .95, vrate: 1, voiceIdx: 0, pitch: 112 }; },
  *choose(opts) { let res = -1; UI.dialog(opts, i => { res = i; }); yield () => res >= 0; return res; },
  juice: null,
  *moxPullJuice() {
    const mox = this.mox; let t = 0;
    mox.post = (b, dt) => { t += dt; const c = b.rig.mats[SK.CH]; const k = smooth(t / .6); const vest = M4.pt(c, -.08, .25, -.15); const hold = M4.pt(c, .1, .25, -.38); b.ik.push({ left: false, T: t < .8 ? V.lerp(M4.pt(c, .2, -.05, -.15), vest, k) : V.lerp(vest, hold, smooth((t - .8) / .5)), pole: M4.dir(b.root, 1, -1, 0), fingers: M4.dir(c, -.3, .6, -.7) }); };
    yield .8; this.juice = mox.addProp(buildJuiceBox(), SK.HR, M4.trs(M4.create(), M4.create(), 0, -.09, -.03, -1.4, 0, .2)); AUD.click(1200, .15, mox.headPos(), .02); yield .8;
  },
  *playerDrinks() {
    Cabin.drank = true; const mox = this.mox; let t = 0; const jb = this.juice;
    // Mox holds it out
    mox.post = (b, dt) => { t += dt; const c = b.rig.mats[SK.CH]; const out = M4.pt(c, -.32, .18, -.42); b.ik.push({ left: false, T: V.lerp(M4.pt(c, .1, .25, -.38), out, smooth(t / .7)), pole: M4.dir(b.root, 1, -1, 0), fingers: M4.dir(c, -.5, .4, -.6) }); };
    yield .8;
    // your hand takes it
    let u = 0; const handTo = () => mox.rig.bonePos(SK.HR);
    P.handFn = (p, dt) => { u += dt; const rest = M4.pt(p.rig.mats[SK.CH], .22, .05, -.2); p.ik.push({ left: false, T: V.lerp(rest, handTo(), smooth(u / .6)), pole: M4.dir(p.rig.root, 1, -1, 0) }); };
    yield .65; mox.removeProp(jb); const mine = P.addProp(jb.mesh, SK.HR, M4.trs(M4.create(), M4.create(), 0, -.09, -.03, -1.4, 0, .2)); AUD.squish();
    mox.post = (b, dt) => { const c = b.rig.mats[SK.CH]; b.ik.push({ left: false, T: M4.pt(c, .22, .0, -.18), pole: M4.dir(b.root, 1, -1, 0) }); };
    // to the mouth, drink
    let v = 0; P.handFn = (p, dt) => { v += dt; const mouth = V.add(V.add(G.cam.pos, V.sc(G.cam.fwd, .13)), V.sc(G.cam.up, -.08)); const from = handTo(); p.ik.push({ left: false, T: V.lerp(from, mouth, smooth(v / .8)), pole: M4.dir(p.rig.root, 1, -1, 0), fingers: V.add(V.sc(G.cam.up, 1), V.sc(G.cam.fwd, -.3)) }); p.pitchOff = -smooth(v / .8) * .12; };
    yield 1.0; AUD.slurp(); yield 1.4; AUD.slurp(); AUD.squish(); yield 1.0;
    yield Story.say(Cabin.me(), "Huh. That's... actually really good.");
    yield Story.say(mox, "Right? Emergency juice. Don't tell Hale.");
    // hand it back
    let w = 0; const mouthHold = () => V.add(V.add(G.cam.pos, V.sc(G.cam.fwd, .13)), V.sc(G.cam.up, -.08));
    mox.post = (b, dt) => { const c = b.rig.mats[SK.CH]; b.ik.push({ left: false, T: M4.pt(c, -.32, .18, -.42), pole: M4.dir(b.root, 1, -1, 0), fingers: M4.dir(c, -.5, .4, -.6) }); };
    P.handFn = (p, dt) => { w += dt; p.pitchOff = -.12 * (1 - smooth(w / .6)); p.ik.push({ left: false, T: V.lerp(mouthHold(), handTo(), smooth(w / .8)), pole: M4.dir(p.rig.root, 1, -1, 0) }); };
    yield .85; P.removeProp(mine); this.juice = mox.addProp(jb.mesh, SK.HR, jb.off); AUD.squish();
    let z = 0; P.handFn = (p, dt) => { z += dt; const rest = M4.pt(p.rig.mats[SK.CH], .22, .05, -.2); p.ik.push({ left: false, T: V.lerp(handTo(), rest, smooth(z / .6)), pole: M4.dir(p.rig.root, 1, -1, 0) }); if (z > .7) p.handFn = null; };
    yield* this.moxStash();
  },
  *moxDrinks() {
    const mox = this.mox; let t = 0;
    mox.post = (b, dt) => { t += dt; const hp = b.rig.mats[SK.HD]; const mouth = M4.pt(hp, .02, .02, -.16); const c = b.rig.mats[SK.CH]; b.ik.push({ left: false, T: V.lerp(M4.pt(c, .1, .25, -.38), mouth, smooth(t / .7)), pole: M4.dir(b.root, 1, -1, 0), fingers: M4.dir(hp, 0, 1, .3) }); b.headPitch = .25; };
    yield 1.0; AUD.slurp(); yield 1.6; AUD.squish(); yield .6;
    yield* this.moxStash();
  },
  *moxStash() { // he puts it down on the seat on his other side; it vanishes once nobody looks
    const mox = this.mox; let t = 0; const pl = Story.plane; const s = this.seatW(this.seatIdx.juice, -1); const spot = () => M4.pt(pl.m, s.pos[0] + .05, TP.floor + .48, s.pos[2]);
    mox.post = (b, dt) => { t += dt; const c = b.rig.mats[SK.CH]; b.ik.push({ left: false, T: V.lerp(M4.pt(c, .1, .25, -.38), V.add(spot(), [0, .08, 0]), smooth(t / .9)), pole: M4.dir(b.root, 1, -.6, 0) }); b.extraYaw = Math.sin(smooth(t / .9) * Math.PI) * -.25; };
    yield 1.0; const jb = this.juice; mox.removeProp(jb); AUD.click(700, .15, spot(), .02);
    const d = { mesh: jb.mesh, m: M4.create(), pos: spot(), r: .3 }; G.extraDyn.push(d);
    G.updaters.push(dt => { if (d.gone) return; M4.trs(d.m, pl.m, s.pos[0] + .05, TP.floor + .48, s.pos[2], 0, .4, 0); d.pos = spot(); const to = V.norm(V.sub(d.pos, G.cam.pos)); if (V.dot(to, G.cam.fwd) < Math.cos(G.cam.fov * .75) && Story.t > 0) { d.gone = true; G.extraDyn.splice(G.extraDyn.indexOf(d), 1); } });
    let z = 0; mox.post = (b, dt) => { z += dt; b.extraYaw = 0; if (z > .6) b.post = null; };
    yield .8;
  },
  /* ---------------- stand up, hook up, green light ---------------- */
  dropSequence() {
    const S = Story, H = this.hale, pl = S.plane;
    S.run(function* () {
      AUD.chime(); yield .8;
      yield Story.say({ name: 'Raven 2-1 (PA)', vpitch: .9, voiceIdx: 4 }, "Jumpmaster, Raven Two-One. Two minutes out. Two minutes. Your aircraft.", { radio: true });
      Flight.phase = 'drop'; Story.cabinLightsOn(true, true);
      H.look = () => G.cam.pos; yield Story.say(H, "TWO MINUTES! STAND UP!");
      for (const a of Cabin.crew) if (a.seated && a !== Cabin.mox) G.after(rnd(.1, 1.4), () => Cabin.standUp(a));
      yield 1.0; Cabin.standUp(Cabin.mox);
      UI.hint('[F]  STAND UP'); Story.phase = 'stand';
      yield () => IN.hit('KeyF'); UI.hint(''); Cabin.playerStand();
      yield 1.6; yield Story.say(H, "HOOK UP!");
      for (const a of Cabin.crew) if (a !== H) a.hook = true;
      yield 1.5; yield Story.say(H, "Check your equipment! Sound off when ready!");
      yield 1.2; yield Story.say(Cabin.crew[8] || Cabin.mox, "Ready!", { gap: .1 }); yield Story.say(Cabin.mox, "Ready!", { gap: .1 });
      yield* Cabin.haleToButton();
      Flight.rampTarget = 1; AUD.buzzer(2); AUD.hydraulic(M4.pt(pl.m, 0, 2, TP.z1), 6); Story.phase = 'ramp';
      yield 1.5; G.setEnv('aboveCabin', 2); Flight.wind = Flight.wind || AUD.windLoop(); P.shake = .6;
      yield* Cabin.haleWalk([[1.6, TP.floor, TP.z1 - .3]]); H.yaw = Math.PI; H.look = () => G.cam.pos;
      yield 3.5; pl.red = false; pl.green = true; AUD.buzzer(.6);
      yield Story.say(H, "GREEN LIGHT! GO! GO! GO!", { gap: .1 });
      Story.phase = 'jump';
      const order = Cabin.crew.filter(a => a !== H && a !== Cabin.mox);
      for (const a of order) { Cabin.runOut(a); yield .9 + Math.random() * .4; }
      yield 1; yield Story.say(Cabin.mox, "See you on the ground, Rook!", { gap: .1 });
      Cabin.runOut(Cabin.mox); yield 1.5;
      UI.objective('Jump'); yield Story.say(H, "ROOK! GO!");
      UI.marker(() => M4.pt(pl.m, 0, 1.5, TP.z1 + TP.rampL));
    });
  },
  standUp(a) {
    a.seated = false; a.seat = 'plain'; a.anim = 'idle'; a.blendK = 3.5; a.weaponMode = a.weaponKind ? 'sling' : a.weaponMode; a.post = null; a.props.forEach(p => a.removeProp(p));
    const off = a.side ? -a.side * .55 : .5; a.pos = [a.pos[0] + (a.side ? -a.side : 1) * .1, a.pos[1], a.pos[2]];
    a.goTo([[a.pos[0] + (a.side ? -a.side * .5 : .4), TP.floor, a.pos[2]]], false, () => { a.yaw = Math.PI; a.blendK = 8; });
    a.script = (b) => { if (b.hook && !b.jumping) { const hx = b.pos[0] < 0 ? -1.0 : 1.0; b.post = (c) => { c.ik.push({ left: true, T: M4.pt(Story.plane.m, hx, TP.floor + 2.15, c.pos[2] - .1), pole: M4.dir(c.root, -1, .2, .5) }); }; } };
  },
  playerStand() {
    const seat = this.seatW(this.seatIdx.player, -1); P.state = 'cut'; P.cutT = 0; P.lookLimit = null;
    P.cut = (p, dt, t) => { p.poseFn = (j) => t < .8 ? poseSeat(j, G.time, 1.3, 'plain') * (1 - smooth(t / .8)) : (poseIdle(j, G.time, 'idle', 1.3), 0); p.blendK = 3; p.local[0] = lerp(seat.pos[0], seat.pos[0] + .55, smooth(t / 1.2)); if (t > 1.3) { p.poseFn = null; p.blendK = 9; p.backOff = null; p.lockBodyYaw = null; p.state = 'cabin'; p.cut = null; } };
  },
  runOut(a) {
    const pl = Story.plane; a.post = null; a.hook = false; a.jumping = true; a.look = null; a.script = null;
    const rampEnd = TP.z1 + TP.rampL * Math.cos(.2) + .3;
    a.goTo([[clamp(a.pos[0], -.8, .8), TP.floor, Math.min(a.pos[2] + .5, TP.z1 - .5)], [0, TP.floor, TP.z1 + .4], [0, TP.floor - TP.rampL * Math.sin(.2), rampEnd]], true, (b) => Cabin.leap(b));
    a.followY = true;
  },
  leap(a) { // off the ramp: convert to world space and fall with everyone else
    const pl = Story.plane; const w = a.worldPos(); const fwd = M4.dir(pl.m, 0, 0, 1);
    a.frame = null; a.pos = V.copy(w); a.yaw = Math.atan2(-fwd[0], -fwd[2]); a.path = null; a.anim = 'dive'; a.weaponMode = 'sling';
    a.vel = V.add(V.sc(pl.vel, .35), V.sc(fwd, 3)); a.vel[1] = -1; AUD.whoosh(.25);
    a.side0 = rnd(-1, 1);
    a.rootFn = (r, b) => { const k = smooth(clamp((b.t - b.leapT) / 1.2, 0, 1)); M4.translate(r, r, 0, 1, 0); M4.rotX(r, r, -1.35 * k); M4.translate(r, r, 0, -1, 0); };
    a.leapT = a.t; G.after(1, () => { a.anim = 'freefall'; });
    a.script = (b, dt) => {
      const v = b.vel; v[1] -= 9.8 * dt; const sp = Math.hypot(v[0], v[1], v[2]); const drag = .0039 * sp * sp; v[0] -= v[0] / sp * drag * dt; v[1] -= v[1] / sp * drag * dt; v[2] -= v[2] / sp * drag * dt;
      if (b === Cabin.mox && P.state === 'fall') { // Mox drifts over to fly next to you
        const tgt = V.add(P.pos, [Math.cos(P.yaw) * 7, -3, -Math.sin(P.yaw) * 7]); v[0] = damp(v[0], (tgt[0] - b.pos[0]) * .6 + P.fallVel[0], 1.2, dt); v[2] = damp(v[2], (tgt[2] - b.pos[2]) * .6 + P.fallVel[2], 1.2, dt); v[1] = damp(v[1], P.fallVel[1] + (tgt[1] - b.pos[1]) * .5, .8, dt); b.yaw = dampAng(b.yaw, P.yaw, 1, dt);
        if (!b._waved && V.dist(b.pos, P.pos) < 14 && Flight.fallT > 4) { b._waved = true; b.anim = 'freefall'; }
      } else { v[0] = damp(v[0], b.side0 * 3, .4, dt); }
      b.pos[0] += v[0] * dt; b.pos[1] += v[1] * dt; b.pos[2] += v[2] * dt;
      if (b.pos[1] < 200) b.hidden = true;
    };
  },
};
Story.cabinLightsOn = function (on, red) { for (const L of this.cabinLights) { L.i = on ? (red ? 2.2 : 1.6) : 0; L.col = red ? [1, .18, .1] : [1, .55, .35]; } };
