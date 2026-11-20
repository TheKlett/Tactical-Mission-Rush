/* =====================================================================
   OVERCAST — life on the base: the mech pilot's climb, walkers, crews,
   drills, joggers, guards, the aid tent, the fire barrel, helicopters,
   jets, marshallers, smoke and steam.
   ===================================================================== */
const Vignettes = {
  list: [], running: false,
  stop() { this.running = false; for (const s of this.sounds || []) try { s.stop(); } catch (e) { } this.sounds = []; },
  add(o) { this.list.push(o); return o; },
  near(p, r) { return V.dist(p, P.inPlane ? P.worldPos() : P.pos) < r; },
  build(W, S) {
    this.list = []; this.sounds = []; const rng = mulberry(99); const mk = (app, o) => { const a = new Actor(app, Object.assign({ gear: false }, o)); a.groundFn = (x, z) => W.ground(x, z, 2, .5, .2); G.actors.push(a); return a; };
    const crewApp = (o = {}) => appearanceFor('pmc', rng, Object.assign({ top: 'combat', camo: false, topCol: [0x5a5a4a, 0x4a4e44, 0x6a6a5a][rng() * 3 | 0], bottom: 'cargo', head: rng() < .5 ? 'cap' : 'headset', vest: 'none', feet: 'combat', female: false }, o));
    const vfx = []; this.vfx = vfx;
    // ---------------- mechs ----------------
    const mechs = this.mechs = [];
    const mkMech = (x, z, yaw, o = {}) => { const m = { mesh: buildMech(o.paint || 0x5c6352, o.num || '07'), bones: new Float32Array(MKB.N * 16), pose: Object.assign({ pos: [x, 0, z], yaw, phase: 0, amp: 0, hatch: o.hatch || 0, lights: !!o.lights, twist: 0, armL: 0, armR: 0, crouch: o.crouch || 0, time: 0, sway: true }, o.pose || {}) }; m.dyn = { mesh: m.mesh, bones: m.bones, pos: m.pose.pos, r: 9 }; G.extraDyn.push(m.dyn); m.mats = poseMech(m.bones, m.pose); W.colBox(x, 2.2, z, 3.6, 4.4, 3.6, {}); mechs.push(m); return m; };
    const M1 = mkMech(FOB.mech.x, FOB.mech.z, Math.PI / 2, { num: '07' });
    const M2 = mkMech(-30, -42, Math.PI, { num: '12', crouch: .35, hatch: 1, paint: 0x60645a, pose: { armL: -.6 } });
    const M3 = mkMech(-12, -42, Math.PI, { num: '03', lights: true, paint: 0x585e50 });
    const MW = mkMech(40, 10, -Math.PI / 2, { num: '21', lights: true, paint: 0x52584a });
    // the pilot and the crew chief
    const pilot = mk(crewApp({ topCol: 0x3a3c3e, head: 'headset', skin: 0x8a5a3c, hairStyle: 'buzz' }), { name: 'Ivers', pos: [FOB.mech.x - 1.2, 0, FOB.mech.z + 3.4], yaw: Math.PI * .9, idleKind: 'talk' });
    const chief = mk(crewApp({ topCol: 0x6a5a2a, head: 'cap' }), { name: 'Crew chief', pos: [FOB.mech.x + 1.6, 0, FOB.mech.z + 4.6], yaw: Math.PI * .75 + .3, idleKind: 'listen', anim: 'thumbs' });
    this.mechClimb = { pilot, chief, mech: M1, t: -1 };
    // welder on the parked mech
    const welder = mk(crewApp({ head: 'none', hairStyle: 'short' }), { pos: [-28.5, 0, -39.6], yaw: Math.PI * 1.15, anim: 'kneel' });
    welder.post = b => { const T = M4.pt(M2.mats[MKB.SHL], .35, -1.2, -.2); b.ik.push({ left: false, T, pole: M4.dir(b.root, 1, -1, 0) }); b.ik.push({ left: true, T: V.add(T, [.1, -.1, .05]), pole: M4.dir(b.root, -1, -1, 0) }); };
    this.add({ upd: (dt) => { if (Math.random() < .5 && this.near(welder.pos, 45)) { const T = welder.rig.bonePos(SK.HR); for (let i = 0; i < 3; i++) G.particles.push({ p: V.copy(T), v: [rnd(-2, 2), rnd(.5, 3), rnd(-2, 2)], life: 0, max: rnd(.3, .8), s: .015, c: [1, .8, .4], a: 1, add: true, g: 9.8, drag: .4 }); this.weldL.i = Math.random() < .5 ? 3 : 0; this.weldL.pos = V.add(T, [0, .1, 0]); } } });
    this.weldL = { pos: [0, 0, 0], col: [.6, .75, 1], i: 0, range: 7 }; G.dynLights.push(this.weldL);
    // patrol walker: back and forth along the north apron, heavy steps
    let wph = 0, wdir = 1, wx = 40; this.add({ upd: (dt) => { const p = MW.pose; const spd = 1.6; wph += dt * 1.25; p.amp = damp(p.amp, 1, 1, dt); p.phase = wph; wx += wdir * spd * dt; if (wx > 160) wdir = -1; if (wx < 20) wdir = 1; p.yaw = dampAng(p.yaw, wdir > 0 ? -Math.PI / 2 : Math.PI / 2, .6, dt); p.pos[0] = wx; p.time = G.time; MW.mats = poseMech(MW.bones, p); const s = Math.sin(wph); if (Math.sign(s) !== Math.sign(this._ws || 0)) { AUD.stomp(V.add(p.pos, [0, .5, 0]), 1); const d = V.dist(p.pos, P.pos); if (d < 60) P.shake = Math.max(P.shake, .5 * (1 - d / 60)); G.puff(V.add(p.pos, [0, .2, 0]), { s: 1.5, c: [.45, .45, .42], a: .25, max: 2 }); } this._ws = s; } });
    // ---------------- mech line: three more walkers parked in a row with their crews ----------------
    const line = [[-60, -52, '14', 0x5e6454], [-48, -52, '15', 0x585e50], [-36, -52, '16', 0x60665a]];
    for (const [x, z, num, col] of line) {
      const mm = mkMech(x, z, Math.PI, { num, paint: col, lights: num !== '15', crouch: num === '15' ? .3 : 0, hatch: num === '16' ? 1 : 0 });
      const c1 = mk(crewApp({ topCol: 0x6a5a2a, head: 'cap' }), { pos: [x + 2.2, 0, z + 3], yaw: Math.PI * .8, idleKind: rng() < .5 ? 'talk' : 'listen' });
      const c2 = mk(crewApp({ head: 'headset' }), { pos: [x + 3.1, 0, z + 2.2], yaw: -Math.PI * .7, idleKind: 'listen' }); c1.look = () => c2.headPos(); c2.look = () => c1.headPos();
      if (num === '16') { const tech = mk(crewApp({ head: 'none', hairStyle: 'short' }), { pos: [x - 1.6, 0, z + 1.5], yaw: Math.PI / 2, idleKind: 'work' }); }
    }
    // ---------------- formation: two platoons standing in ranks, an officer in front ----------------
    { const ox = -150, oz = 52; const off = mk(soldierApp(rng, { head: 'cap', beard: 'none', vest: 'none' }), { name: 'Captain', pos: [ox, 0, oz - 7], yaw: Math.PI, idleKind: 'talk', gear: false, pitch: 100 });
      const ranks = []; for (let p = 0; p < 2; p++) for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) { const a = mk(soldierApp(rng), { pos: [ox - 7 + p * 8 + c * 1.1, 0, oz - 2 + r * 1.3], yaw: 0, idleKind: 'guard', weapon: 'rifle', weaponMode: 'sling', gear: rng() < .5 }); a.k = rng() * .4; ranks.push(a); }
      const speech = ["Listen up! Wheels up for Raven Two-One in ten.", "Second platoon, you're on the ground at oh-seven-hundred.", "Keep your heads down and your radios on."]; let st = 3, si = 0;
      this.add({ upd: (dt) => { st -= dt; if (st <= 0) { st = 9; if (this.near([ox, 0, oz], 28)) G.speak(off, speech[si++ % speech.length]); } } }); }
    // ---------------- a squad marching in column past the washroom ----------------
    { const col = []; for (let i = 0; i < 12; i++) { const a = mk(soldierApp(rng), { pos: [-210 - (i >> 1) * 1.4, 0, -28 + (i & 1) * 1.1], yaw: -Math.PI / 2, weapon: 'rifle', weaponMode: 'sling', gear: true }); a.walkSpeed = 1.6; col.push(a); }
      let dir = 1; const march = () => { for (const [i, a] of col.entries()) { const x = dir > 0 ? 5 - (i >> 1) * 1.4 : -210 + (i >> 1) * 1.4; a.goTo([[x, 0, -28 + (i & 1) * 1.1]], false, i === 0 ? () => { dir = -dir; G.after(6, march); } : null); } }; G.after(1, march);
      let ct = 0, cs = 0; this.add({ upd: (dt) => { ct += dt; if (col[0].speed > .5 && ct > .55) { ct = 0; if (this.near(col[0].pos, 25)) { AUD.step('water', col[(cs++) % col.length].pos, .35); } } } }); }
    // ---------------- groups of soldiers around the base: talking, smoking, waiting by the trucks ----------------
    { const kinds = ['talk', 'listen', 'smoke', 'listen', 'idle', 'radio', 'drink'];
      for (let g = 0, n = 0; g < 400 && n < 9; g++) { const x = rnd(-215, 20), z = rnd(-95, 70); if (!W.clutterFree(x, z, 3)) continue; n++; const k = 2 + (rng() * 3 | 0); const ms = [];
        for (let i = 0; i < k; i++) { const a = (i / k) * TAU; const s = mk(soldierApp(rng, { head: rng() < .6 ? 'helmet' : 'cap', vest: rng() < .7 ? 'plate' : 'none' }), { pos: [x + Math.cos(a) * 1.1, 0, z + Math.sin(a) * 1.1], yaw: Math.atan2(Math.cos(a), Math.sin(a)), idleKind: kinds[(rng() * kinds.length) | 0], weapon: rng() < .7 ? 'rifle' : null, weaponMode: 'sling', gear: rng() < .4 }); ms.push(s); }
        for (const s of ms) s.look = () => ms[(G.time / 5 + ms.indexOf(s)) % ms.length | 0].headPos(); } }
    // ---------------- runners between buildings ----------------
    for (let i = 0; i < 6; i++) { const a = mk(soldierApp(rng), { pos: [rnd(-200, 0), 0, rnd(-80, 60)], yaw: 0, weapon: 'rifle', weaponMode: 'sling' }); const go = () => { let x, z, k = 0; do { x = rnd(-210, 10); z = rnd(-90, 70); } while (!W.clutterFree(x, z, 0) && k++ < 30); a.goTo([[x, 0, z]], rng() < .3, () => G.after(rnd(2, 8), go)); }; G.after(rnd(.5, 4), go); }
    // ---------------- drill squad ----------------
    const sgt = mk(soldierApp(rng, { head: 'cap', beard: 'mustache' }), { name: 'Drill sergeant', pos: [-150, 0, -40], yaw: Math.PI / 2, idleKind: 'talk', gear: false, weapon: null, pitch: 95 });
    const squad = []; for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) squad.push(mk(soldierApp(rng), { pos: [-157 - r * 1.6, 0, -44 + c * 1.6], yaw: -Math.PI / 2, idleKind: 'guard', weapon: 'rifle', weaponMode: 'low', gear: false }));
    sgt.look = () => V.add(squad[(G.time / 4 | 0) % squad.length].pos, [0, 1.6, 0]);
    const barks = ["You call that a formation? Again!", "Eyes front! Rain never killed anybody!", "When I say move, you move!", "Check your buddy! Straps, buckles, everything!"]; let bt = 2;
    this.add({ upd: (dt) => { bt -= dt; if (bt <= 0) { bt = 7 + Math.random() * 4; if (this.near(sgt.pos, 26)) G.speak(sgt, barks[(Math.random() * barks.length) | 0]); } } });
    // ---------------- joggers ----------------
    const loop = [[-200, 0, -10], [-60, 0, -10], [-60, 0, 90], [-200, 0, 90]];
    for (let i = 0; i < 6; i++) { const a = mk(soldierApp(rng, { head: 'none', hairStyle: 'buzz', vest: 'none' }), { pos: [-200 + i * 1.8, 0, -10], yaw: -Math.PI / 2, weapon: 'rifle', weaponMode: 'chest', gear: false }); let li = 1; const go = () => a.goTo([loop[li]], true, () => { li = (li + 1) % 4; go(); }); a.walkSpeed = 3; go(); a.path = [V.add(loop[1], [-i * 1.8, 0, 0])]; }
    // ---------------- guards ----------------
    for (const [x, z, yaw] of [[-118, -14, Math.PI / 2], [-64, -104, 0], [-84, -134, Math.PI], [200, 160, Math.PI], [-300, 100, -Math.PI / 2]]) { const g = mk(soldierApp(rng), { pos: [x, 0, z], yaw, idleKind: 'guard', weapon: 'rifle', weaponMode: 'low' }); g.script = (b) => { b.look = Vignettes.near(b.pos, 12) ? () => G.cam.pos : null; }; }
    { const pat = mk(soldierApp(rng), { pos: [-100, 0, 10], yaw: 0, weapon: 'rifle', weaponMode: 'low' }); let k = 0; const pts = [[-100, 0, 10], [-100, 0, -80], [-70, 0, -80], [-70, 0, 10]]; const go = () => pat.goTo([pts[k]], false, () => { k = (k + 1) % 4; G.after(2, go); }); go(); }
    // ---------------- aid tent: the wounded ----------------
    { const tx = FOB.tent.x, tz = FOB.tent.z; const B = new MB(6000);
      B.col(0x4a4e3a, MAT.CANVAS).box(0, .55, 0, .65, .06, 2); B.col(0x777777, MAT.METAL); for (const s of [-1, 1]) for (const e of [-1, 1]) B.cyl(s * .3, 0, e * .9, .02, .02, .55, 5);
      // blood: soaked canvas, pooled on the ground, washing away in the rain
      B.col(0x4a0806, MAT.BLOOD).box(.05, .59, .35, .4, .01, .6); B.col(0x3a0604, MAT.BLOOD).blob(.4, .01, .5, .5, .008, 3, .5, 9, 3).blob(.9, .01, 1.2, .35, .006, 7, .6, 8, 3);
      B.col(0x6a2a26, MAT.BLOOD); for (let i = 0; i < 9; i++) B.blob(.9 + i * .45, .008, 1.6 + i * .5 + Math.sin(i) * .3, .2 - i * .012, .004, i + 11, .6, 7, 2);
      B.col(0xd8d4c8, MAT.CLOTH).box(-.6, .02, 1.1, .25, .04, .2).col(0x6a0a08, MAT.BLOOD).box(-.6, .045, 1.1, .15, .01, .12).col(0xd8d4c8, MAT.CLOTH).box(-.85, .02, .8, .2, .03, .15).col(0x5a0806, MAT.BLOOD).box(-.85, .04, .8, .12, .01, .1);
      B.col(0xe0e0d8, MAT.PLASTIC).box(-.5, .18, -.2, .35, .35, .25); B.col(0xb01818, MAT.PAINT).box(-.5, .36, -.2, .2, .005, .05).box(-.5, .36, -.2, .05, .005, .2);
      B.col(0x777777, MAT.METAL).cyl(.45, 0, -.6, .015, .015, 1.9, 5).box(.45, 1.9, -.6, .3, .02, .02); B.col(0xc8d8e0, MAT.GLASS).box(.55, 1.75, -.6, .1, .2, .04); B.col(0xd8e0e0, MAT.PLASTIC).tube([.55, 1.65, -.6], [.15, .7, -.2], .004, .004, 4);
      const m = M4.create(); M4.translate(m, m, tx, W.th(tx, tz), tz); M4.rotY(m, m, .4); G.extraDyn.push({ mesh: B.mesh(), m, pos: [tx, 0, tz], r: 4 });
      // the patient: lying on the stretcher, leg dressed, breathing hard
      const pat = mk(soldierApp(rng, { head: 'none', hairStyle: 'short', vest: 'none', skin: 0xc49a7a }), { pos: [0, 0, 0], yaw: 0 });
      pat.groundFn = null; const sm = m;
      pat.rootFn = (r, b) => { M4.copy(r, sm); M4.translate(r, r, 0, .62, -.1); M4.rotX(r, r, Math.PI / 2); M4.translate(r, r, 0, -.98, 0); };
      pat.customPose = (j, b) => { const br = Math.sin(b.t * 2.6) * .05; pj(j, SK.CH, br, 0, 0); pj(j, SK.HD, -.3 + Math.sin(b.t * .3) * .2, Math.sin(b.t * .5) * .4, 0); pj(j, SK.UAL, .15, 0, -.25); pj(j, SK.FAL, .3, 0, 0); pj(j, SK.UAR, .4 + Math.max(0, Math.sin(b.t * .4)) * .5, 0, .2); pj(j, SK.FAR, 1.6, 0, 0); pj(j, SK.THR, .25, 0, .05); pj(j, SK.SHR, -.35, 0, 0); return 0; };
      pat.anim = 'custom';
      const band = new MB(800); band.b(0); band.col(0xe8e4d8, MAT.CLOTH).cyl(0, -.32, 0, .075, .07, .2, 10); band.col(0x7a0a08, MAT.BLOOD).cyl(0, -.27, -.002, .077, .074, .09, 10).box(.02, -.18, -.06, .05, .08, .02); band.col(0x5a0806, MAT.BLOOD).cyl(0, -.42, 0, .066, .06, .04, 10);
      pat.addProp(band.mesh(), SK.SHR, M4.create());
      const doc = mk(crewApp({ topCol: 0x4a5a4a, head: 'none', hairStyle: 'short', gloves: true }), { name: 'Doc', pos: [tx + .9, 0, tz + .3], yaw: -1.2, anim: 'kneel' });
      doc.post = b => { const T = pat.rig.bonePos(SK.SHR); const k = Math.sin(b.t * 1.7); b.ik.push({ left: false, T: V.add(T, [.05 * k, .05, .06]), pole: M4.dir(b.root, 1, -1, 0) }); b.ik.push({ left: true, T: V.add(T, [-.05, .07, -.1 + k * .03]), pole: M4.dir(b.root, -1, -1, 0) }); b.look = () => T; };
      const sit = mk(soldierApp(rng, { head: 'none', hairStyle: 'short', vest: 'none' }), { pos: [tx - 2.4, 0, tz + 1.8], yaw: -2.4, anim: 'sit', seat: 'lean' });
      const hb = new MB(400); hb.b(0); hb.col(0xe8e4d8, MAT.CLOTH).cyl(0, .08, 0, .115, .112, .07, 12); hb.col(0x7a0a08, MAT.BLOOD).box(.07, .12, -.07, .05, .04, .03); sit.addProp(hb.mesh(), SK.HD, M4.create());
      B.col(0x5a4a32, MAT.WOOD);
      this.add({ upd: () => { if (Math.random() < .2 && this.near(sit.pos, 30)) G.puff(V.add(sit.rig.bonePos(SK.HD), [0, .12, -.15]), { s: .08, grow: .3, c: [.7, .7, .7], a: .3, max: 2.5, v: [rnd(-.1, .1), .25, rnd(-.1, .1)] }); } });
      this.aid = { pat, doc, sit, pos: [tx, 0, tz] };
    }
    // ---------------- fire barrel: hands to the warmth ----------------
    { const fb = W.fireBarrel; const L = { pos: [fb[0], 1.3, fb[2]], col: [1, .55, .2], i: 2.5, range: 9 }; G.dynLights.push(L);
      for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + .4; const s = mk(soldierApp(rng, { head: i === 1 ? 'beanie' : 'helmet', vest: i === 2 ? 'none' : 'plate' }), { pos: [fb[0] + Math.cos(a) * 1.0, 0, fb[2] + Math.sin(a) * 1.0], yaw: Math.atan2(Math.cos(a), Math.sin(a)), idleKind: i === 2 ? 'smoke' : 'listen', weapon: 'rifle', weaponMode: 'sling' }); s.post = b => { if (b.idleKind !== 'smoke') { const T = [fb[0], 1.15, fb[2]]; b.ik.push({ left: false, T: V.lerp(b.rig.bonePos(SK.UAR), T, .62), pole: M4.dir(b.root, 1, -1, 0) }); b.ik.push({ left: true, T: V.lerp(b.rig.bonePos(SK.UAL), T, .62), pole: M4.dir(b.root, -1, -1, 0) }); } }; }
      this.add({ upd: () => { L.i = 2.2 + Math.random() * .8; if (!this.near(L.pos, 70)) return; G.particles.push({ p: [fb[0] + rnd(-.18, .18), .95, fb[2] + rnd(-.18, .18)], v: [rnd(-.2, .2), rnd(1, 2), rnd(-.2, .2)], life: 0, max: rnd(.3, .6), s: rnd(.12, .22), grow: -.2, c: [1, rnd(.4, .6), .15], a: .9, add: true }); if (Math.random() < .3) G.puff([fb[0], 1.6, fb[2]], { s: .3, c: [.25, .25, .25], a: .3, max: 4, v: [.3, .9, .1] }); } });
    }
    // ---------------- helicopters ----------------
    const mkHeli = (pos, yaw, col) => { const h = { mesh: buildHeli(col), bones: new Float32Array(4 * 16), m: M4.create(), pos: V.copy(pos), yaw, rotor: 0, door: 1 }; h.dyn = { mesh: h.mesh, bones: h.bones, pos: h.pos, r: 10 }; G.extraDyn.push(h.dyn); return h; };
    const pose = h => { const m = h.m; M4.ident(m); M4.translate(m, m, h.pos[0], h.pos[1], h.pos[2]); M4.rotY(m, m, h.yaw); M4.rotX(m, m, h.pitch || 0); M4.rotZ(m, m, h.roll || 0); const b = h.bones, t = M4.create(); b.set(m, 0); h.ra = (h.ra || 0) + G.dt * 18 * h.rotor; M4.translate(t, m, 0, 3.3, .1); M4.rotY(t, t, h.ra); b.set(t, 16); M4.translate(t, m, .25, 3, 8.2); M4.rotX(t, t, h.ra * 2.2); b.set(t, 32); M4.translate(t, m, 1.05, 1.4, -.3 + h.door * 1.3); b.set(t, 48); };
    const H1 = mkHeli([FOB.pad.x - 12, 0, FOB.pad.z - 20], .6, 0x3a4034); H1.rotor = .25; // parked, idling
    const H2 = mkHeli([FOB.pad.x + 80, 70, FOB.pad.z - 140], -.6, 0x30362c); H2.rotor = 1; let hp = 0, ht = 0;
    this.add({ upd: (dt) => { pose(H1); if (!this.running) return; ht += dt; const pad = [FOB.pad.x, 0, FOB.pad.z];
      if (hp === 0) { const tgt = V.add(pad, [0, 25, 0]); H2.pos = V.lerp(H2.pos, tgt, 1 - Math.exp(-.35 * dt)); H2.pitch = .12; H2.roll = Math.sin(ht * .7) * .05; if (V.dist(H2.pos, tgt) < 4) hp = 1; }
      else if (hp === 1) { H2.pos[1] = damp(H2.pos[1], 0, .35, dt); H2.pitch = damp(H2.pitch, 0, 1, dt); if (H2.pos[1] < .05) { hp = 2; ht = 0; } }
      else if (hp === 2) { H2.rotor = damp(H2.rotor, .45, .5, dt); if (ht > 40) { hp = 3; ht = 0; } }
      else if (hp === 3) { H2.rotor = damp(H2.rotor, 1, 1, dt); H2.pos[1] += dt * Math.min(8, ht * 3); H2.pitch = -.15; H2.pos[0] -= dt * ht * 1.2; if (H2.pos[1] > 500) hp = 4; }
      pose(H2);
      const alt = H2.pos[1]; if (alt < 30 && Math.random() < .9) for (let i = 0; i < 2; i++) { const a = Math.random() * TAU, r = 3 + Math.random() * 6; G.particles.push({ p: [H2.pos[0] + Math.cos(a) * r, .3, H2.pos[2] + Math.sin(a) * r], v: [Math.cos(a) * 9, rnd(.5, 2), Math.sin(a) * 9], life: 0, max: 1.4, s: .7, grow: 1.5, c: [.72, .74, .76], a: .3 * (1 - alt / 30), drag: 1.2 }); }
      if (this.hsnd) this.hsnd.set(H2.rotor, H2.pos); if (this.hsnd1) this.hsnd1.set(H1.rotor * .5, H1.pos);
    } });
    this.helis = [H1, H2];
    // purple smoke marker on the pad
    this.add({ upd: () => { if (!this.near([FOB.pad.x, 0, FOB.pad.z], 160)) return; if (Math.random() < .5) G.puff([FOB.pad.x + 9, .3, FOB.pad.z + 4], { s: rnd(.4, .8), grow: 1.1, c: [.42, .2, .5], a: .45, max: 7, v: [rnd(.6, 1.4), rnd(.4, 1), rnd(-.3, .3)], drag: .2 }); } });
    // generator exhaust + steam vents
    this.add({ upd: () => { for (const g of W.genPos) if (Math.random() < .12 && this.near(g, 60)) G.puff([g[0] + .6, g[1] + 1, g[2] + .2], { s: .25, grow: .6, c: [.55, .56, .57], a: .25, max: 4, v: [.4, .8, .1] }); } });
    // ---------------- jets ----------------
    const jets = []; for (let i = 0; i < 4; i++) { const j = { mesh: buildJet(i === 2 ? 0x5e6468 : 0x6a6f72), bones: new Float32Array(4 * 16), m: M4.create(), pos: [60 + i * 30, 0, -40], yaw: 0, burner: 0, canopy: i === 1 ? 1 : 0 }; j.dyn = { mesh: j.mesh, bones: j.bones, pos: j.pos, r: 12 }; G.extraDyn.push(j.dyn); jets.push(j); }
    const poseJet = j => { const m = j.m; M4.ident(m); M4.translate(m, m, j.pos[0], j.pos[1], j.pos[2]); M4.rotY(m, m, j.yaw); M4.rotX(m, m, j.pitch || 0); const b = j.bones, t = M4.create(); b.set(m, 0); M4.translate(t, m, 0, 1.5, -5.4); M4.rotX(t, t, j.canopy * .9); b.set(t, 16); if (j.burner > .02) { M4.translate(t, m, 0, 1.1, 8.1); M4.scale(t, t, 1, 1, j.burner * (.8 + Math.random() * .3)); b.set(t, 32); } else b.set(ZERO_M, 32); M4.copy(t, m); if (j.pos[1] > 6) M4.scale(t, t, .001, .001, .001); b.set(t, 48); };
    const J = jets[3]; let jp = 0, jt = 0; const taxi = [[150, 0, -75], [150, 0, -205], [-150, 0, -205]];
    this.add({ upd: (dt) => { for (const j of jets) poseJet(j); if (!this.running) return; jt += dt;
      if (jp === 0 && jt > 12) { jp = 1; this.jsnd = AUD.jetLoop(J.pos); this.sounds.push(this.jsnd); }
      if (jp === 1 || jp === 2) { const tg = taxi[jp - 1]; const d = Math.hypot(tg[0] - J.pos[0], tg[2] - J.pos[2]); const want = Math.atan2(-(tg[0] - J.pos[0]), -(tg[2] - J.pos[2])); J.yaw = dampAng(J.yaw, want, 1.2, dt); J.spd = damp(J.spd || 0, 7, .5, dt); J.pos[0] -= Math.sin(J.yaw) * J.spd * dt; J.pos[2] -= Math.cos(J.yaw) * J.spd * dt; if (d < 6) jp++; if (this.jsnd) this.jsnd.set(.35, J.pos); }
      if (jp === 3) { J.yaw = dampAng(J.yaw, -Math.PI / 2, 2, dt); J.spd = damp(J.spd, 0, 2, dt); J.pos[0] -= Math.sin(J.yaw) * J.spd * dt; J.pos[2] -= Math.cos(J.yaw) * J.spd * dt; if (J.spd < .3) { jp = 4; jt = 0; } }
      if (jp === 4) { if (this.jsnd) this.jsnd.set(.5 + Math.min(1, jt / 3) * .4, J.pos); if (jt > 4) { jp = 5; jt = 0; } }
      if (jp === 5) { J.burner = damp(J.burner, 1, 3, dt); J.spd += 22 * dt; J.pos[0] -= Math.sin(J.yaw) * J.spd * dt; J.pos[2] -= Math.cos(J.yaw) * J.spd * dt; if (J.spd > 75) { J.pitch = damp(J.pitch || 0, .35, 1.2, dt); J.pos[1] += J.spd * Math.sin(J.pitch) * dt; } if (this.jsnd) this.jsnd.set(1.8, J.pos, 1.15); if (J.pos[1] > 6 && !this._jetHeat) { this._jetHeat = true; } if (Math.random() < .8 && J.pos[1] < 10) G.puff(V.add(J.pos, [Math.sin(J.yaw) * 9, 1, Math.cos(J.yaw) * 9]), { s: 1.2, grow: 2.5, c: [.6, .62, .64], a: .25, max: 2, v: [0, .5, 0] }); if (J.pos[1] > 600) { jp = 6; if (this.jsnd) this.jsnd.stop(); } }
    } });
    // marshaller with light wands near the transport's nose
    { const mar = mk(crewApp({ topCol: 0xc8a020, head: 'headset' }), { pos: [FOB.plane.x + 34, 0, FOB.plane.z - 2], yaw: Math.PI / 2 * -1 + Math.PI, anim: 'custom' });
      const wand = new MB(200); wand.b(0); wand.col(0xff6a10, MAT.EMIT).cyl(0, -.42, 0, .02, .02, .38, 8); const wm = wand.mesh(); mar.addProp(wm, SK.HL, M4.create()); mar.addProp(wm, SK.HR, M4.create());
      mar.customPose = (j, b) => { poseIdle(j, b.t, 'idle', b.k); const w = Math.sin(b.t * 2.2); pj(j, SK.UAL, 1.2 + w * .9, 0, -.4); pj(j, SK.UAR, 1.2 + w * .9, 0, .4); pj(j, SK.FAL, .5, 0, 0); pj(j, SK.FAR, .5, 0, 0); return 0; }; }
    // a couple of late jumpers jogging to the ramp ahead of you
    this.late = []; for (let i = 0; i < 2; i++) { const a = mk(soldierApp(rng), { pos: [-110 + i * 2, 0, -64 - i * 2], yaw: Math.PI, weapon: 'rifle', weaponMode: 'sling', gear: true, gearOpts: { goggles: true } }); a.idleKind = 'idle'; this.late.push(a); }
    // ambient thunder rolls
    this.add({ upd: (dt) => { this._th = (this._th ?? 20) - dt; if (this._th < 0) { this._th = 25 + Math.random() * 30; AUD.thunder(1 + Math.random() * 2); } } });
    G.updaters.push(dt => { for (const v of this.list) v.upd(dt); this.updateMechClimb(dt); });
  },
  go() {
    this.running = true;
    this.hsnd = AUD.engineLoop('heli', this.helis[1].pos); this.hsnd1 = AUD.engineLoop('heli', this.helis[0].pos); this.sounds.push(this.hsnd, this.hsnd1);
    this.mechClimb.t = 0;
    // the late jumpers head for the plane
    const pl = Story.plane; for (const [i, a] of this.late.entries()) G.after(6 + i * 1.5, () => a.goTo([[-92, 0, -112 + i], [FOB.plane.x - 22, 0, FOB.plane.z + i * 1.2], [FOB.plane.x - 16, 0, FOB.plane.z]], true, b => { b.hidden = true; }));
  },
  /* ---------------- the mech pilot climbs in ---------------- */
  updateMechClimb(dt) {
    const C = this.mechClimb; if (!C || C.t < 0) return; C.t += dt; const M = C.mech, pil = C.pilot, chief = C.chief; const p = M.pose; p.time = G.time;
    // rungs in world space, bottom to top (shin → thigh → hull side), on the mech's left
    if (!C.rungs) { const R = []; const mats = M.mats; for (let i = 4; i >= 0; i--) R.push(M4.pt(mats[MKB.SHL], -.55, -.35 - i * .36, -.12)); for (let i = 3; i >= 0; i--) R.push(M4.pt(mats[MKB.THL], -.6, -.5 - i * .38, -.15)); for (let i = 0; i < 5; i++) R.push(M4.pt(mats[MKB.BODY], -1.62, .55 + i * .38, .95)); C.rungs = R; C.out = M4.dir(mats[MKB.BODY], -1, 0, 0); C.c = 0; C.stage = 'talk'; }
    const R = C.rungs, out = C.out;
    if (C.stage === 'talk') { if (C.t > 3) { C.stage = 'walk'; pil.idleKind = 'idle'; pil.goTo([V.add(R[0], V.add(V.sc(out, .45), [0, -R[0][1], 0]))], false, () => { C.stage = 'climb'; C.c = 0; pil.groundFn = null; pil.noLoco = true; }); if (this.near(pil.pos, 30)) G.speak(pil, "She's warm already. See you on the other side, chief."); } }
    else if (C.stage === 'climb') {
      C.c += dt * .55; const n = R.length - 3; const c = Math.min(C.c, n); const i = Math.floor(c), f = c - i;
      const foot = V.lerp(R[i], R[Math.min(i + 1, R.length - 1)], smooth(f));
      pil.pos = V.add(V.add(foot, V.sc(out, .42)), [0, -.05, 0]); pil.yaw = Math.atan2(out[0], out[2]);
      pil.anim = 'custom'; pil.customPose = (j) => { pj(j, SK.CH, .15, 0, 0); pj(j, SK.HD, -.35, 0, 0); return 0; };
      pil.post = (b) => { const lh = R[Math.min(i + 3, R.length - 1)], rh = R[Math.min(i + 2 + (f > .5 ? 1 : 0), R.length - 1)]; const lf = R[Math.min(i + (f > .5 ? 1 : 0), R.length - 1)], rf = R[Math.min(i, R.length - 1)];
        b.ik.push({ left: true, T: V.add(lh, V.sc(out, .06)), pole: V.add(V.sc(out, 1), [0, -1, 0]) }); b.ik.push({ left: false, T: V.add(rh, V.sc(out, .06)), pole: V.add(V.sc(out, 1), [0, -1, 0]) });
        b.ik.push({ leg: true, left: true, T: V.add(lf, V.add(V.sc(out, .12), [0, .05, 0])), pole: V.add(V.sc(out, 1), [0, .5, 0]) }); b.ik.push({ leg: true, left: false, T: V.add(rf, V.add(V.sc(out, .12), [0, .05, 0])), pole: V.add(V.sc(out, 1), [0, .5, 0]) }); };
      if (Math.floor(C.c * 2) !== C._lastRung) { C._lastRung = Math.floor(C.c * 2); AUD.click(800 + Math.random() * 300, .12, pil.pos, .02); }
      if (C.c >= n) { C.stage = 'top'; C.tt = 0; pil.post = null; }
    } else if (C.stage === 'top') {
      C.tt += dt; const roof = M4.pt(M.mats[MKB.BODY], -.4, 2.38, .55); const hatchP = M4.pt(M.mats[MKB.BODY], 0, 2.38, .55);
      p.hatch = damp(p.hatch, 1, 2, dt); if (C.tt < .1) AUD.servo(hatchP, .8, 300);
      pil.pos = V.lerp(pil.pos, C.tt < 1.2 ? roof : hatchP, 1 - Math.exp(-3 * dt)); pil.anim = 'idle'; pil.noLoco = true;
      if (C.tt > 1.6) { pil.anim = 'crouch'; pil.pos[1] -= dt * .9 * smooth((C.tt - 1.6) / .5); }
      if (C.tt > 3.2) { pil.hidden = true; C.stage = 'power'; C.tt = 0; AUD.servo(hatchP, 1, 260); }
    } else if (C.stage === 'power') {
      C.tt += dt; p.hatch = damp(p.hatch, 0, 2.5, dt);
      if (C.tt > 1.4 && !p.lights) { p.lights = true; AUD.buzzer(.4); this.mhum = AUD.mechHum(p.pos); this.sounds.push(this.mhum); for (let i = 0; i < 18; i++) G.puff(M4.pt(M.mats[MKB.BODY], rnd(-1, 1) * .85, 3.2, 1.6), { s: .4, c: [.75, .76, .77], a: .4, max: 3, v: [rnd(-.4, .4), rnd(1.5, 3), rnd(-.4, .4)] }); }
      if (C.tt > 2.5) { p.twist = Math.sin((C.tt - 2.5) * .6) * .5; p.armR = Math.sin((C.tt - 2.5) * .9) * .35; if (Math.random() < .03) AUD.servo(p.pos, .5, 420); }
      if (C.tt > 3 && !chief.state.thumbs) { chief.state.thumbs = true; chief.look = () => M4.pt(M.mats[MKB.BODY], 0, 1.8, 0); if (this.near(chief.pos, 30)) G.speak(chief, "Looking good, Ivers! You're green across the board!"); }
      if (C.tt > 6.5) { chief.state.thumbs = false; }
      if (C.tt > 8 && C.tt < 14) { p.amp = damp(p.amp, .6, 1, dt); const ph0 = p.phase; p.phase += dt * 1.1; if (Math.floor(ph0 / Math.PI) !== Math.floor(p.phase / Math.PI)) { AUD.stomp(V.add(p.pos, [0, .5, 0]), 1.2); const d = V.dist(p.pos, P.pos); if (d < 50) P.shake = Math.max(P.shake, .7 * (1 - d / 50)); } p.pos[0] += -Math.sin(p.yaw) * dt * .9; p.pos[2] += -Math.cos(p.yaw) * dt * .9; }
      else p.amp = damp(p.amp, 0, 1.5, dt);
      if (this.mhum) this.mhum.set(.8, p.pos);
    }
    M.mats = poseMech(M.bones, p); if (C.stage !== 'climb' && C.stage !== 'power') M.dyn.pos = p.pos;
  },
};
