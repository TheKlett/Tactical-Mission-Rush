/* =====================================================================
   OVERCAST — the player: true first-person body (visible in mirrors),
   walking, scripted cut moves, seated look, plane-cabin walking, freefall.
   ===================================================================== */
const PLAYER_APP = { female: false, skin: 0xc49272, hairStyle: 'short', hair: 0x2a1e14, top: 'combat', topCol: 0x4b5139, camo: true, bottom: 'cargo', botCol: 0x3c4030, feet: 'combat', head: 'none', beard: 'stubble', eyewear: 'none', vest: 'plate', vestCol: 0x3a3e2c, gloves: true, holster: true, bulk: 1.02, height: 1, rolled: false, backpack: false, kneepads: true, eyeCol: 0x3a4a3a, radio: false, watch: true, faction: 'pmc' };
const P = {
  state: 'off', pos: [0, 0, 0], yaw: 0, pitch: 0, vel: [0, 0, 0], speed: 0, bob: 0, onGround: true, inPlane: false, local: [0, 0, 0], camOv: null,
  lookLimit: null, prompt: '', interactT: null, holdT: 0, crouch: 0, cutT: 0, cut: null, seatYaw: 0, ik: [], hands: {}, shake: 0, fallVel: [0, 0, 0],
  init() {
    this.rig = new Rig(buildCharacter(PLAYER_APP)); this.rig.fullBones = new Float32Array(SK.N * 16); this.rig.hide = 1 << SK.HD;
    this.gear = buildJumpGear({ reserve: true });
    this.dyn = [{ mesh: this.rig.mesh, bones: this.rig.bones, fullBones: this.rig.fullBones, pos: [0, 0, 0], r: 2 }, { mesh: this.gear, bones: this.rig.bones, fullBones: this.rig.fullBones, pos: [0, 0, 0], r: 2 }];
    this.dyn[1].pos = this.dyn[0].pos; this.k = 1.3; this.t = 0; this.ph = 0; this.props = [];
  },
  reset() { this.state = 'off'; this.vel = [0, 0, 0]; this.pitch = 0; this.camOv = null; this.inPlane = false; this.prompt = ''; this.cut = null; this.props.length = 0; this.dyn.length = 2; this.ik = []; this.speed = 0; this.shake = 0; this.headExtra = null; },
  fwdFlat() { return [-Math.sin(this.yaw), 0, -Math.cos(this.yaw)]; },
  frameM() { return this.inPlane && Story.plane ? Story.plane.m : null; },
  worldPos() { const m = this.frameM(); return m ? M4.pt(m, this.local[0], this.local[1], this.local[2]) : this.pos; },
  worldYaw() { const m = this.frameM(); if (!m) return this.yaw; const f = M4.dir(m, -Math.sin(this.yaw), 0, -Math.cos(this.yaw)); return Math.atan2(-f[0], -f[2]); },
  addProp(mesh, bone, off) { const p = { mesh, bone, off: off || M4.create(), m: M4.create(), pos: this.dyn[0].pos, r: 1 }; this.props.push(p); this.dyn.push(p); return p; },
  removeProp(p) { this.props = this.props.filter(q => q !== p); const i = this.dyn.indexOf(p); if (i >= 0) this.dyn.splice(i, 1); },
  /* ---------------- per-frame ---------------- */
  update(dt) {
    this.t += dt; this.ik.length = 0; this.prompt = '';
    // mouse look
    if (!this.camOv && this.state !== 'off') {
      const sens = .0006 + this.sensK() * .0042;
      this.yaw -= IN.mdx * sens; this.pitch -= IN.mdy * sens * (G.settings.invert ? -1 : 1); this.pitch = clamp(this.pitch, -1.45, 1.45);
      if (this.lookLimit) { const L = this.lookLimit; this.yaw = L.yaw + clamp(angDiff(L.yaw, this.yaw), -L.yawR, L.yawR); this.pitch = clamp(this.pitch, L.pMin, L.pMax); }
    }
    if (this.state === 'walk') this.updateWalk(dt);
    else if (this.state === 'cabin') this.updateCabin(dt);
    else if (this.state === 'fall') this.updateFall(dt);
    else if (this.state === 'cut' && this.cut) { this.cutT += dt; this.cut(this, dt, this.cutT); }
    this.updateInteract(dt);
    if (this.handFn) this.handFn(this, dt);
    this.updateBody(dt);
  },
  sensK() { return clamp(G.settings.sens / 100, 0, 1); },
  moveInput() { let f = 0, s = 0; if (IN.k('KeyW')) f += 1; if (IN.k('KeyS')) f -= 1; if (IN.k('KeyD')) s += 1; if (IN.k('KeyA')) s -= 1; const l = Math.hypot(f, s) || 1; return [f / l * (f || s ? 1 : 0), s / l * (f || s ? 1 : 0)]; },
  updateWalk(dt) {
    const W = G.W; const [f, s] = this.moveInput(); const jog = IN.k('ShiftLeft') && f > .3;
    const spd = jog ? 3.9 : 1.75; const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const tx = (-sy * f + cy * s) * spd, tz = (-cy * f - sy * s) * spd;
    this.vel[0] = damp(this.vel[0], tx, 9, dt); this.vel[2] = damp(this.vel[2], tz, 9, dt);
    const np = [this.pos[0] + this.vel[0] * dt, this.pos[1], this.pos[2] + this.vel[2] * dt];
    W.collide(np, .32, 1.8, .45);
    const gy = W.ground(np[0], np[2], this.pos[1] + .5, .45, .2);
    np[1] = gy > this.pos[1] ? damp(this.pos[1], gy, 18, dt) : Math.max(gy, this.pos[1] - 6 * dt);
    this.pos = np; this.speed = Math.hypot(this.vel[0], this.vel[2]); this.jog = jog;
    this.stepAcc = (this.stepAcc || 0) + this.speed * dt; if (this.stepAcc > (jog ? 1.7 : 1.3)) { this.stepAcc = 0; AUD.step(G.env.wet > .5 && !G.isDry(this.pos) ? 'water' : 'metal', null, jog ? .32 : .2); if (G.env.wet > .5 && !G.isDry(this.pos)) for (let i = 0; i < 3; i++) G.particles.push({ p: [this.pos[0] + rnd(-.2, .2), this.pos[1] + .03, this.pos[2] + rnd(-.2, .2)], v: [rnd(-.6, .6), rnd(.8, 1.6), rnd(-.6, .6)], life: 0, max: .4, s: .02, c: [.7, .72, .74], a: .6, g: 9.8, drag: .4 }); }
  },
  updateCabin(dt) { // walking inside the transport, in plane space
    const [f, s] = this.moveInput(); const spd = IN.k('ShiftLeft') ? 3.6 : 1.7; const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const L = this.local; this.vel[0] = damp(this.vel[0], (-sy * f + cy * s) * spd, 9, dt); this.vel[2] = damp(this.vel[2], (-cy * f - sy * s) * spd, 9, dt);
    L[0] += this.vel[0] * dt; L[2] += this.vel[2] * dt;
    const pl = Story.plane; const rampLen = TP.rampL * Math.cos(-pl.rampAng);
    const onRamp = L[2] > TP.z1; const hw = onRamp ? 2.1 : 1.85; L[0] = clamp(L[0], -hw, hw);
    L[2] = clamp(L[2], -12, pl.ramp > .9 ? TP.z1 + rampLen + 3 : TP.z1 - .4);
    for (const a of Story.cabinBlockers()) { const dx = L[0] - a[0], dz = L[2] - a[2]; const d = Math.hypot(dx, dz); if (d < .55 && d > 1e-4) { L[0] = a[0] + dx / d * .55; L[2] = a[2] + dz / d * .55; } }
    L[1] = onRamp ? TP.floor - (L[2] - TP.z1) * Math.tan(-pl.rampAng) : TP.floor;
    this.speed = Math.hypot(this.vel[0], this.vel[2]);
    this.stepAcc = (this.stepAcc || 0) + this.speed * dt; if (this.stepAcc > 1.3) { this.stepAcc = 0; AUD.step('metal', null, .22); }
    if (L[2] > TP.z1 + rampLen - .2 && pl.ramp > .9) Story.playerJumped();
  },
  updateFall(dt) {
    const v = this.fallVel; const [f, s] = this.moveInput();
    v[1] -= 9.8 * dt; const sp = Math.hypot(v[0], v[1], v[2]); const drag = .0039 * sp * sp; if (sp > .1) { v[0] -= v[0] / sp * drag * dt; v[1] -= v[1] / sp * drag * dt; v[2] -= v[2] / sp * drag * dt; }
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw); const tx = (-sy * f + cy * s) * 9, tz = (-cy * f - sy * s) * 9;
    v[0] = damp(v[0], tx + (this.drift ? this.drift[0] : 0), .7, dt); v[2] = damp(v[2], tz + (this.drift ? this.drift[2] : 0), .7, dt);
    this.pos[0] += v[0] * dt; this.pos[1] += v[1] * dt; this.pos[2] += v[2] * dt; this.speed = sp;
    this.shake = Math.max(this.shake, clamp(sp / 55, 0, 1) * .5);
  },
  /* ---------------- interaction ---------------- */
  updateInteract(dt) {
    const list = Story.interacts || []; const eye = G.cam.pos, fwd = G.cam.fwd; let best = null, bs = 1e9;
    if (this.state === 'walk' || this.state === 'cabin' || this.state === 'seated' || this.state === 'locked')
      for (const it of list) {
        if (it.enabled && !it.enabled()) continue; const p = typeof it.pos === 'function' ? it.pos() : it.pos; const d = V.dist(p, eye); if (d > (it.r || 1.8)) continue;
        if (!it.any) { const to = V.sc(V.sub(p, eye), 1 / (d || 1)); const ang = Math.acos(clamp(V.dot(to, fwd), -1, 1)); if (ang > (it.cone || .55)) continue; const sc = ang + d * .05; if (sc < bs) { bs = sc; best = it; } }
        else if (d < bs) { bs = d; best = it; }
      }
    this.interactT = best; this.prompt = best ? (typeof best.label === 'function' ? best.label() : best.label) : '';
    if (best && IN.hit(best.key || 'KeyE')) { best.act(); AUD.uiClick(); }
  },
  /* ---------------- body + camera ---------------- */
  updateBody(dt) {
    const rig = this.rig; const j = P_(); let py = 0;
    const st = this.state; const mv = this.speed > .2 && (st === 'walk' || st === 'cabin');
    if (this.poseFn) py = this.poseFn(j, this, dt) || 0;
    else if (st === 'fall') poseFreefall(j, this.t, this.k);
    else if (mv) { this.ph += dt * Math.max(this.speed, .8) / (this.jog ? 1.9 : 1.4) * Math.PI; py = -poseWalk(j, this.ph, clamp(this.speed / (this.jog ? 3.6 : 1.6), .4, 1.1), !!this.jog, false); }
    else poseIdle(j, this.t, 'idle', this.k);
    // look pitch carried by chest/head (visible in mirrors and in the body's arms)
    if (st !== 'fall') { const hy = clamp(angDiff(this.bodyYaw ?? this.yaw, this.yaw), -1.2, 1.2); j[SK.HD * 3] += -this.pitch * .65; j[SK.CH * 3] += -this.pitch * .2; j[SK.HD * 3 + 1] += hy * .7; j[SK.CH * 3 + 1] += hy * .3; }
    rig.tj.set(j); rig.tpy = py; rig.blend(mv ? 14 : this.blendK || 9, dt);
    // body yaw: follows the view, lags when standing still
    if (this.bodyYaw === undefined || mv || st === 'fall' || st === 'cut') this.bodyYaw = this.yaw;
    else if (Math.abs(angDiff(this.bodyYaw, this.yaw)) > .9) this.bodyYaw = dampAng(this.bodyYaw, this.yaw, 5, dt);
    if (this.lockBodyYaw !== undefined && this.lockBodyYaw !== null) this.bodyYaw = this.lockBodyYaw;
    const r = rig.root; M4.ident(r); const fm = this.frameM(); if (fm) M4.copy(r, fm);
    const base = this.inPlane ? this.local : this.pos;
    const back = st === 'fall' ? 0 : (this.backOff ?? (.1 + Math.max(0, -this.pitch) * .16));
    const bf = [-Math.sin(this.bodyYaw), 0, -Math.cos(this.bodyYaw)];
    M4.translate(r, r, base[0] - bf[0] * back, base[1], base[2] - bf[2] * back); M4.rotY(r, r, this.bodyYaw);
    if (st === 'fall') { M4.translate(r, r, 0, 1, 0); M4.rotX(r, r, -1.35); M4.translate(r, r, 0, -1, 0); }
    if (this.rootFn) this.rootFn(r, this);
    rig.solve(null, false);
    for (const q of this.ik) { if (q.leg) ikLeg(rig, q.left, q.T, q.pole, r); else ikArm(rig, q.left, q.T, q.pole || M4.dir(r, q.left ? -.6 : .6, -1, .2), q.fingers, q.palm); }
    rig.hide = st === 'fall' ? ((1 << SK.HD) | (1 << SK.CH) | (1 << SK.UAL) | (1 << SK.UAR) | (1 << SK.PEL)) : (1 << SK.HD);
    rigCommit(rig);
    const wp = M4.pos(rig.mats[SK.PEL]); this.dyn[0].pos[0] = wp[0]; this.dyn[0].pos[1] = wp[1]; this.dyn[0].pos[2] = wp[2];
    for (const p of this.props) M4.mul(p.m, rig.mats[p.bone], p.off);
  },
  updateCamera(dt) {
    const cam = G.cam; const m = M4.create();
    if (this.camOv) M4.copy(m, this.camOv);
    else {
      const hm = this.rig.mats[SK.HD]; let eye = M4.pt(hm, 0, .1, -.02);
      const fm = this.frameM();
      // keep the eye where the head is, but correct for the body's look-down offset
      const bf = [-Math.sin(this.bodyYaw), 0, -Math.cos(this.bodyYaw)]; const back = this.state === 'fall' ? 0 : (this.backOff ?? (.1 + Math.max(0, -this.pitch) * .16));
      const bfw = fm ? M4.dir(fm, bf[0], 0, bf[2]) : bf; eye = V.add(eye, V.sc(bfw, back + .05));
      if (this.state === 'fall') { eye = M4.pt(hm, 0, .12, -.22); }
      if (fm) M4.copy(m, fm);
      if (fm) { const inv = M4.invert(M4.create(), fm); const le = M4.pt(inv, eye[0], eye[1], eye[2]); M4.translate(m, m, le[0], le[1], le[2]); }
      else M4.translate(m, M4.create(), eye[0], eye[1], eye[2]);
      M4.rotY(m, m, this.yaw); M4.rotX(m, m, this.pitch + (this.pitchOff || 0)); M4.rotZ(m, m, (this.rollOff || 0) + Math.sin(this.ph * .5) * .004 * clamp(this.speed, 0, 3));
      if (this.shake > .002) { const s = this.shake * .02, t = G.time * 31; M4.rotX(m, m, Math.sin(t) * s); M4.rotY(m, m, Math.cos(t * 1.37) * s); this.shake = damp(this.shake, 0, 3, dt); }
    }
    M4.invert(cam.view, m); cam.pos = M4.pos(m); cam.fwd = V.norm(M4.dir(m, 0, 0, -1)); cam.right = V.norm(M4.dir(m, 1, 0, 0)); cam.up = V.norm(M4.dir(m, 0, 1, 0));
    const fovT = (G.settings.fov + (this.state === 'fall' ? 10 : 0) + (this.jog && this.speed > 2.5 ? 3 : 0)) * DEG;
    cam.fov = damp(cam.fov, this.fovOverride ? this.fovOverride * DEG : fovT, 4, dt);
    cam.near = this.state === 'fall' ? .1 : .035;
  },
};
