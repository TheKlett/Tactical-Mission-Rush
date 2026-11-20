/* =====================================================================
   OVERCAST — actors: skinned soldiers with layered procedural animation,
   IK hands/feet, head look-at, props, plane-space parenting, scripts.
   ===================================================================== */
// limb matrix whose local -Y runs p0 → p1 and whose local X stays close to xHint (keeps FK-modelled details facing the right way)
function segMatX(o, p0, p1, xHint) {
  const y = V.norm(V.sub(p0, p1)); let x = V.sub(xHint, V.sc(y, V.dot(xHint, y))); const l = V.len(x); x = l > 1e-5 ? V.sc(x, 1 / l) : [1, 0, 0]; const z = V.cross(x, y);
  return M4.basis(o, x, y, z, p0);
}
function rigCommit(rig) {
  const M = rig.mats;
  for (let i = 0; i < SK.N; i++) { rig.bones.set((rig.hide & (1 << i)) ? ZERO_M : M[i], i * 16); if (rig.fullBones) rig.fullBones.set(M[i], i * 16); }
}
// 2-bone IK for an arm; T = wrist target (world), pole = elbow hint direction (world), fingers = optional finger direction, palm = optional palm-side axis
function ikArm(rig, left, T, pole, fingers, palm) {
  const M = rig.mats, sc = rig.sc || 1; const ua = left ? SK.UAL : SK.UAR, fa = left ? SK.FAL : SK.FAR, h = left ? SK.HL : SK.HR;
  const S = M4.pt(M[ua], 0, 0, 0); const r = ik2(S, T, .29 * sc, .265 * sc, V.add(S, pole));
  const side = palm || M4.dir(M[SK.CH], 1, 0, 0);
  segMatX(M[ua], S, r.E, side); segMatX(M[fa], r.E, r.T, side);
  if (fingers) segMatX(M[h], r.T, V.add(r.T, fingers), side);
  else { M4.copy(M[h], M[fa]); M[h][12] = r.T[0]; M[h][13] = r.T[1]; M[h][14] = r.T[2]; }
  return r;
}
function ikLeg(rig, left, T, pole, yawM) {
  const M = rig.mats, sc = rig.sc || 1; const th = left ? SK.THL : SK.THR, sh = left ? SK.SHL : SK.SHR, ft = left ? SK.FTL : SK.FTR;
  const S = M4.pt(M[th], 0, 0, 0); const r = ik2(S, T, .45 * sc, .42 * sc, V.add(S, pole));
  const side = M4.dir(yawM, 1, 0, 0); segMatX(M[th], S, r.E, side); segMatX(M[sh], r.E, r.T, side);
  M4.basis(M[ft], M4.dir(yawM, 1, 0, 0), [0, 1, 0], M4.dir(yawM, 0, 0, 1), r.T);
  return r;
}

/* ---------------- extra poses ---------------- */
function poseThumbsUp(j, t, k, amt) {
  poseIdle(j, t, 'idle', k);
  pj(j, SK.UAR, .55 + .7 * amt, -.2, .35 * amt); pj(j, SK.FAR, 1.6 * amt + .2, 0, 0); pj(j, SK.HR, 0, 0, -1.4 * amt);
  pj(j, SK.HD, -.05, -.2, .1 * amt); pj(j, SK.CH, .03, -.15 * amt, 0);
}
function poseWave(j, t, k, amt) { poseIdle(j, t, 'idle', k); const w = Math.sin(t * 9); pj(j, SK.UAR, .6 + 1.6 * amt, -.1, .5 * amt + w * .15 * amt); pj(j, SK.FAR, 1.4 * amt, 0, 0); }
function poseFreefall(j, t, k) { // stable belly-to-earth arch
  const f = Math.sin(t * 7 + k) * .04, f2 = Math.sin(t * 5.3 + k * 2) * .05;
  pj(j, SK.CH, .35, 0, f * .5); pj(j, SK.HD, .6, 0, 0); pj(j, SK.PEL, .1, 0, 0);
  pj(j, SK.UAL, 1.15 + f, .2, -1.35); pj(j, SK.FAL, 1.25 + f2, 0, 0); pj(j, SK.UAR, 1.15 - f, -.2, 1.35); pj(j, SK.FAR, 1.25 - f2, 0, 0);
  pj(j, SK.THL, -.45, .1, -.22); pj(j, SK.THR, -.45, -.1, .22); pj(j, SK.SHL, -1.35 + f2, 0, 0); pj(j, SK.SHR, -1.35 - f2, 0, 0); pj(j, SK.FTL, .3, 0, 0); pj(j, SK.FTR, .3, 0, 0);
}
function poseDive(j, t) { pj(j, SK.CH, .2, 0, 0); pj(j, SK.HD, .4, 0, 0); pj(j, SK.UAL, 2.6, 0, -.4); pj(j, SK.UAR, 2.6, 0, .4); pj(j, SK.FAL, .3, 0, 0); pj(j, SK.FAR, .3, 0, 0); pj(j, SK.THL, -.3, 0, 0); pj(j, SK.THR, .2, 0, 0); pj(j, SK.SHL, -.9, 0, 0); pj(j, SK.SHR, -.3, 0, 0); }
// seated variations (base: poseSit). returns pelvis offset
function poseSeat(j, t, k, v) {
  poseSit(j, t, k, false);
  pj(j, SK.CH, .08 + Math.sin(t * 1.5 + k) * .015, Math.sin(t * .2 + k) * .08, 0);
  if (v === 'legout') { pj(j, SK.THL, .75, .12, -.12); pj(j, SK.SHL, -.08, 0, 0); pj(j, SK.FTL, -.35, 0, 0); pj(j, SK.CH, -.12, .1, 0); pj(j, SK.HD, -.2, -.25, 0); pj(j, SK.UAL, .5, .1, -.2); pj(j, SK.FAL, 1.0, 0, 0); pj(j, SK.UAR, .45, -.2, .3); pj(j, SK.FAR, .9, 0, 0); }
  else if (v === 'sleep') { pj(j, SK.HD, .5, .25, .3); pj(j, SK.CH, -.2, 0, .05); pj(j, SK.UAL, .2, 0, -.05); pj(j, SK.FAL, .9, 0, 0); pj(j, SK.UAR, .2, 0, .05); pj(j, SK.FAR, .9, 0, 0); pj(j, SK.THL, 1.45, .25, -.2); pj(j, SK.THR, 1.45, -.25, .2); }
  else if (v === 'knee') { const b = Math.max(0, Math.sin(t * 11 + k)) * .09; pj(j, SK.THR, 1.55 - b, -.08, .06); pj(j, SK.SHR, -1.55 + b * .6, 0, 0); pj(j, SK.FTR, -.25 + b * 2, 0, 0); pj(j, SK.HD, -.1, Math.sin(t * .4 + k) * .4, 0); }
  else if (v === 'watch') { const look = bump((t * .07 + k) % 1, .1, .4); pj(j, SK.UAL, .5 + look * .5, .2 + look * .5, -.18 - look * .3); pj(j, SK.FAL, .95 + look * 1.1, 0, -look * .4); pj(j, SK.HD, -look * .5, look * .5, 0); }
  else if (v === 'pray') { pj(j, SK.HD, -.55, 0, 0); pj(j, SK.CH, -.25, 0, 0); }
  else if (v === 'lean') { pj(j, SK.CH, -.25, 0, 0); pj(j, SK.UAL, .7, .2, -.1); pj(j, SK.FAL, 1.3, 0, 0); pj(j, SK.UAR, .7, -.2, .1); pj(j, SK.FAR, 1.3, 0, 0); pj(j, SK.HD, -.25, Math.sin(t * .3 + k) * .3, 0); }
  else if (v === 'talk') { const g = Math.sin(t * 2.3 + k); pj(j, SK.UAR, .55 + g * .12, -.2, .2); pj(j, SK.FAR, 1.1 + g * .2, 0, 0); pj(j, SK.HD, Math.sin(t * 3.1) * .04, -.25, 0); }
  return -.5;
}

/* ======================= ACTOR ======================= */
let ACTOR_ID = 0;
class Actor {
  constructor(app, o = {}) {
    this.id = ++ACTOR_ID; this.app = app; this.name = o.name || 'Soldier'; this.pitch = o.pitch || 105 + Math.random() * 30;
    this.vpitch = o.vpitch || .9 + Math.random() * .2; this.vrate = o.vrate || 1; this.voiceIdx = o.voiceIdx ?? (this.id % 5);
    this.rig = new Rig(buildCharacter(app)); this.rig.sc = app.height || 1;
    this.pos = o.pos ? V.copy(o.pos) : [0, 0, 0]; this.yaw = o.yaw || 0; this.frame = o.frame || null; // frame: object with .m (parent matrix)
    this.anim = o.anim || 'idle'; this.idleKind = o.idleKind || 'idle'; this.seat = o.seat || 'plain'; this.k = Math.random() * 10; this.t = 0; this.ph = 0; this.speed = 0;
    this.path = null; this.walkSpeed = o.walkSpeed || 1.45; this.run = false; this.look = null; this.lookAmt = 0; this.headYaw = 0; this.headPitch = 0;
    this.weaponKind = o.weapon || null; this.weaponMode = o.weaponMode || 'low'; this.ik = []; this.props = []; this.amt = 0; this.blendK = 8; this.extraYaw = 0;
    this.dyn = [{ mesh: this.rig.mesh, bones: this.rig.bones, pos: [0, 0, 0], r: 2.2 }];
    if (o.gear !== false) { this.gearMesh = buildJumpGear(o.gearOpts || {}); this.dyn.push({ mesh: this.gearMesh, bones: this.rig.bones, pos: this.dyn[0].pos, r: 2.2 }); }
    if (this.weaponKind) { const wk = this.weaponKind; this.wmesh = Actor.wcache[wk] || (Actor.wcache[wk] = (() => { const B = new MB(4000); B.b(0); buildNpcWeapon(B, wk); return B.mesh(); })()); this.wdyn = { mesh: this.wmesh, m: M4.create(), pos: this.dyn[0].pos, r: 1.5 }; this.dyn.push(this.wdyn); }
    this.wl = { m: M4.create(), gr: [0, -.07, .03], gl: [0, .01, -.36] };
    this.script = o.script || null; this.state = {}; this.root = M4.create(); this.local = M4.create();
    this.rig.j.set(P_()); this.anims = Object.assign({}, ACTOR_ANIMS, o.anims || {});
  }
  headPos() { return this.rig.bonePos(SK.HD); }
  worldPos() { return this.frame ? M4.pt(this.frame.m, this.pos[0], this.pos[1], this.pos[2]) : this.pos; }
  goTo(pts, run = false, onArrive = null) { this.path = pts.map(p => V.copy(p)); this.run = run; this.onArrive = onArrive; }
  say(text, o) { return G.speak(this, text, o); }
  addProp(mesh, bone, off, nb = 1) { const p = { mesh, bone, off: off || M4.create(), m: M4.create(), pos: this.dyn[0].pos, r: 1 }; if (nb > 1) { p.bones = new Float32Array(nb * 16); p.sub = []; for (let i = 1; i < nb; i++) p.sub.push(M4.create()); } this.props.push(p); this.dyn.push(p); return p; }
  removeProp(p) { this.props = this.props.filter(q => q !== p); this.dyn = this.dyn.filter(q => q !== p); }
  update(dt) {
    this.t += dt; this.ik.length = 0;
    if (this.script) this.script(this, dt);
    // locomotion along a path (in parent space)
    if (this.path && this.path.length) {
      const tg = this.path[0]; const dx = tg[0] - this.pos[0], dz = tg[2] - this.pos[2]; const d = Math.hypot(dx, dz);
      const sp = this.run ? 3.7 : this.walkSpeed;
      if (d < (this.path.length > 1 ? .5 : .12)) { this.path.shift(); if (!this.path.length) { this.path = null; this.speed = 0; const cb = this.onArrive; this.onArrive = null; if (cb) cb(this); } }
      else {
        const want = Math.atan2(-dx, -dz); this.yaw = dampAng(this.yaw, want, 7, dt);
        const facing = Math.cos(angDiff(this.yaw, want)); this.speed = damp(this.speed, sp * clamp(facing, .2, 1) * clamp(d / .6, .35, 1), 5, dt);
        this.pos[0] += -Math.sin(this.yaw) * this.speed * dt; this.pos[2] += -Math.cos(this.yaw) * this.speed * dt;
        if (tg[1] !== undefined && this.followY !== false) this.pos[1] = damp(this.pos[1], tg[1], 10, dt);
        if (this.groundFn) this.pos[1] = this.groundFn(this.pos[0], this.pos[2]);
      }
    } else this.speed = damp(this.speed, 0, 6, dt);
    // pose
    const j = P_(); let py = 0; const moving = this.speed > .15;
    if (moving && !this.noLoco) { this.ph += dt * Math.max(this.speed, .8) / (this.run ? 1.9 : 1.4) * Math.PI; py = -poseWalk(j, this.ph, clamp(this.speed / (this.run ? 3.5 : 1.45), .4, 1.15), this.run, !!this.weaponKind && this.weaponMode === 'low'); }
    else { const fn = this.anims[this.anim] || this.anims.idle; py = fn(j, this, dt) || 0; }
    // head look-at
    if (this.look) {
      const hp = this.worldPos(); const tp = typeof this.look === 'function' ? this.look() : this.look; const wy = this.frame ? Math.atan2(-this.frame.m[8], -this.frame.m[10]) * 0 : 0;
      let worldYaw = this.yaw; if (this.frame) { const f = M4.dir(this.frame.m, -Math.sin(this.yaw), 0, -Math.cos(this.yaw)); worldYaw = Math.atan2(-f[0], -f[2]); }
      const want = angDiff(worldYaw, Math.atan2(-(tp[0] - hp[0]), -(tp[2] - hp[2]))); const dist = Math.hypot(tp[0] - hp[0], tp[2] - hp[2]);
      const pit = Math.atan2(tp[1] - (hp[1] + 1.6), dist);
      this.lookAmt = damp(this.lookAmt, Math.abs(want) < 1.9 ? 1 : 0, 3, dt);
      this.headYaw = damp(this.headYaw, clamp(-want, -1.1, 1.1), 4, dt); this.headPitch = damp(this.headPitch, clamp(-pit, -.6, .5), 4, dt);
    } else { this.lookAmt = damp(this.lookAmt, 0, 2, dt); }
    j[SK.HD * 3 + 1] += this.headYaw * this.lookAmt * .75; j[SK.CH * 3 + 1] += this.headYaw * this.lookAmt * .25; j[SK.HD * 3] += this.headPitch * this.lookAmt;
    this.rig.tj.set(j); this.rig.tpy = py; this.rig.blend(moving ? 14 : this.blendK, dt);
    // root
    const r = this.rig.root; M4.ident(r); if (this.frame) M4.copy(r, this.frame.m);
    M4.translate(r, r, this.pos[0], this.pos[1], this.pos[2]); M4.rotY(r, r, this.yaw + this.extraYaw);
    if (this.rootFn) this.rootFn(r, this);
    M4.copy(this.root, r);
    // weapon carry
    let wl = null;
    if (this.weaponKind) {
      const m = this.wl.m; M4.ident(m);
      if (this.weaponMode === 'low') { M4.translate(m, m, .08, .1, -.26); M4.rotY(m, m, .55); M4.rotX(m, m, -.6); wl = this.wl; wl.gr = [0, -.07, .03]; wl.gl = [0, .01, -.36]; }
      else if (this.weaponMode === 'chest') { M4.translate(m, m, .02, .2, -.25); M4.rotY(m, m, .9); M4.rotX(m, m, -.15); M4.rotZ(m, m, 1.2); wl = this.wl; wl.gr = [0, -.07, .03]; wl.gl = [0, .01, -.36]; }
      else if (this.weaponMode === 'knees') { M4.translate(m, m, 0, -.12, -.36); M4.rotX(m, m, 1.3); wl = this.wl; wl.gr = [0, -.07, .03]; wl.gl = [0, .01, -.36]; }
      else if (this.weaponMode === 'lap' || this.weaponMode === 'hidden') { wl = null; }
      else { M4.translate(m, m, .02, .26, .2); M4.rotZ(m, m, 2.3); wl = { m, gr: null, gl: null }; }
    }
    this.rig.solve(wl, false);
    if (this.weaponKind) { if (this.weaponMode === 'hidden') M4.copy(this.wdyn.m, ZERO_M); else if (this.weaponMode === 'lap' && this.lapM) M4.copy(this.wdyn.m, this.lapM(this)); else M4.copy(this.wdyn.m, this.rig.mats[SK.WPN]); }
    if (this.post) this.post(this, dt);
    for (const q of this.ik) { if (q.leg) ikLeg(this.rig, q.left, q.T, q.pole || M4.dir(r, 0, 0, -1), r); else ikArm(this.rig, q.left, q.T, q.pole || M4.dir(r, q.left ? -.5 : .5, -1, .3), q.fingers, q.palm); }
    rigCommit(this.rig);
    const wp = M4.pos(this.rig.mats[SK.PEL]); const dp = this.dyn[0].pos; dp[0] = wp[0]; dp[1] = wp[1]; dp[2] = wp[2];
    for (const p of this.props) {
      M4.mul(p.m, this.rig.mats[p.bone], p.off);
      if (p.bones) { p.bones.set(p.m, 0); for (let i = 0; i < p.sub.length; i++) p.bones.set(M4.mul(M4.create(), p.m, p.sub[i]), (i + 1) * 16); }
    }
  }
}
Actor.wcache = {};
// drawable form of props with multiple bones
const ACTOR_ANIMS = {
  idle: (j, a) => { poseIdle(j, a.t, a.idleKind, a.k); return 0; },
  sit: (j, a) => poseSeat(j, a.t, a.k, a.seat),
  thumbs: (j, a) => { a.amt = damp(a.amt, a.state.thumbs ? 1 : 0, 6, G.dt || .016); poseThumbsUp(j, a.t, a.k, a.amt); return 0; },
  wave: (j, a) => { a.amt = damp(a.amt, a.state.wave ? 1 : 0, 6, G.dt || .016); poseWave(j, a.t, a.k, a.amt); return 0; },
  freefall: (j, a) => { poseFreefall(j, a.t, a.k); return 0; },
  dive: (j, a) => { poseDive(j, a.t); return 0; },
  crouch: (j, a) => { poseCrouch(j, 0, false); return -.38; },
  kneel: (j, a) => { poseIdle(j, a.t, 'kneel', a.k); return -.44; },
  run: (j, a) => { a.ph += (G.dt || .016) * 3.7 / 1.9 * Math.PI; return -poseWalk(j, a.ph, 1.1, true, false); },
  custom: (j, a) => (a.customPose ? a.customPose(j, a) : (poseIdle(j, a.t, 'idle', a.k), 0)),
};
