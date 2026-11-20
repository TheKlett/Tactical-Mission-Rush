/* =====================================================================
   INPUT + PLAYER — movement, stances, freefall/parachute, weapons,
   inventory, interactions, takedowns, health.
   ===================================================================== */
const SNIPER_ZOOM = [4, 6, 8, 12];
const ACTIONS = [['forward', 'MOVE FORWARD', 'KeyW'], ['back', 'MOVE BACK', 'KeyS'], ['left', 'STRAFE LEFT', 'KeyA'], ['right', 'STRAFE RIGHT', 'KeyD'], ['jump', 'JUMP / PARACHUTE', 'Space'], ['sprint', 'SPRINT', 'ShiftLeft'], ['crouch', 'CROUCH', 'ControlLeft'],
  ['interact', 'INTERACT', 'KeyE'], ['takedown', 'TAKEDOWN / HOSTAGE', 'KeyF'], ['melee', 'MELEE', 'KeyQ'], ['reload', 'RELOAD', 'KeyR'], ['slow', 'SLOW MOTION', 'KeyG'], ['s1', 'SLOT 1 — PISTOL', 'Digit1'], ['s2', 'SLOT 2 — RIFLE', 'Digit2'], ['s3', 'SLOT 3 — KNIFE', 'Digit3'], ['s4', 'SLOT 4 — MISSION', 'Digit4'], ['s5', 'SLOT 5 — EQUIPMENT', 'Digit5'], ['vcam', 'VEHICLE CAMERA', 'KeyC'], ['disguise', 'TAKE DISGUISE (HOLD)', 'KeyT']];
const IN = {
  binds: {}, remap: null,
  buildRemap() { const r = {}; const blocked = new Set(); for (const [id, , def] of ACTIONS) { const b = this.binds[id] || def; r[b] = def; if (b !== def) blocked.add(def); } for (const k of blocked) if (!(k in r)) r[k] = null; this.remap = r; },
  canon(code) { if (!this.remap) this.buildRemap(); return code in this.remap ? this.remap[code] : code; },
  keys: {}, hits: {}, mdx: 0, mdy: 0, mb: [0, 0, 0], mbHit: [0, 0, 0], mbUp: [0, 0, 0], wheel: 0, locked: false,
  init(cv) {
    addEventListener('keydown', e => { if (UI.capture) { e.preventDefault(); UI.capture(e.code); return; } if (e.repeat) { if (G.state === 'play') e.preventDefault(); return; } const c = this.canon(e.code); if (c) { this.keys[c] = 1; this.hits[c] = 1; } if (G.state === 'play' && !['F5', 'F11', 'F12'].includes(e.code)) e.preventDefault(); G.onKey && G.onKey(e); });
    addEventListener('keyup', e => { const c = this.canon(e.code); if (c) this.keys[c] = 0; });
    addEventListener('mousemove', e => { if (this.locked) { this.mdx += e.movementX; this.mdy += e.movementY; } });
    cv.addEventListener('mousedown', e => { this.mb[e.button] = 1; this.mbHit[e.button] = 1; if (!this.locked && G.wantsLock()) this.lock(); });
    addEventListener('mouseup', e => { this.mb[e.button] = 0; this.mbUp[e.button] = 1; });
    addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('wheel', e => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === cv; if (!this.locked && G.state === 'play' && !G.noPauseOnUnlock) G.pause(); });
    addEventListener('blur', () => { this.keys = {}; this.mb = [0, 0, 0]; });
    this.cv = cv;
  },
  lock() { try { const p = this.cv.requestPointerLock({ unadjustedMovement: false }); if (p && p.catch) p.catch(() => { }); } catch (e) { } },
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); },
  k(c) { return !!this.keys[c]; }, hit(c) { return !!this.hits[c]; },
  end() { this.hits = {}; this.mdx = 0; this.mdy = 0; this.mbHit = [0, 0, 0]; this.mbUp = [0, 0, 0]; this.wheel = 0; },
};

const EYE = 1.62, CEYE = 1.08, PR = .32;
const GADGETS = GEAR;
const ITEMDEF = {
  ledger: { name: 'CARTEL LEDGER', desc: 'Financial records — intel' }, drive: { name: 'MANIFEST DRIVE', desc: 'Encrypted arms manifest' },
  keycard: { name: 'VAULT KEYCARD', desc: 'Opens the station vault' }, charge: { name: 'DEMO CHARGE', desc: 'Plant at target' },
  codes: { name: 'LAUNCH CODES', desc: 'Uplink authentication codes' }, dossier: { name: 'BUYER DOSSIER', desc: 'Intelligence on the buyer network' }, noisemaker: { name: 'NOISE MAKER' }, smoke: { name: 'SMOKE GRENADE' }, emp: { name: 'EMP CHARGE' }, medkit: { name: 'FIELD MEDKIT' }, knife: { name: 'COMBAT KNIFE' },
};

const P = {
  init() {
    this.app = { skin: 0xc89670, shirt: 0x4a5038, pants: 0x3f4430, boots: 0x231c15, head: 'helmet', hair: 0x1a1410, vest: true, vestCol: 0x3a3e2c, camo: true, gloves: true, bulk: 1.02, helmetCol: 0x3a3f2e };
    this.rig = new Rig(buildCharacter(this.app)); this.rig.hide = (1 << SK.HD) | (1 << SK.UAL) | (1 << SK.FAL) | (1 << SK.HL) | (1 << SK.UAR) | (1 << SK.FAR) | (1 << SK.HR) | (1 << SK.WPN) | (1 << SK.PROP);
    this.vmArms = buildArms({ sleeve: 0x4a5038, glove: 0x1c1c1a });
    this.vmMeshes = {};
    this.vmBones = new Float32Array(VB.N * 16); this.vmL = []; for (let i = 0; i < VB.N; i++) this.vmL.push(M4.create());
    this.camM = M4.create(); this.view = M4.create();
    this.chuteMesh = buildParachute(); this.chuteM = M4.create();
  },
  buildWeaponMeshes(cfg) {
    const mk = f => { const B = new MB(6000); f(B); return B.mesh(); };
    for (const k of ['pistol', 'rifle', 'knife']) if (this.vmMeshes[k]) this.vmMeshes[k].dispose();
    this.vmMeshes.pistol = mk(B => buildPistolVM(B, cfg.pistol || 'pistol'));
    this.vmMeshes.rifle = mk(B => buildRifleVM(B, cfg.rifle, cfg.optic, cfg.muzzle));
    this.vmMeshes.knife = mk(B => buildKnifeVM(B, VB.KNIFE, cfg.knife || 'knife'));
    this.vmMeshes.items = {};
    for (const k of ['ledger', 'drive', 'keycard', 'charge', 'noisemaker', 'smoke', 'codes', 'ammo', 'knife', 'dossier', 'emp', 'medkit', 'evidence', 'usb']) this.vmMeshes.items[k] = buildItemMesh(k);
  },
  reset(cfg) {
    this.buildWeaponMeshes(cfg);
    this.pos = [0, 0, 0]; this.vel = [0, 0, 0]; this.yaw = 0; this.pitch = 0; this.roll = 0; this.onGround = false; this.state = 'ground';
    const pk = operatorPerks(); this.maxHealth = pk.hp || 100; this.regenMul = pk.regen || 1;
    this.crouch = 0; this.crouchHeld = false; this.sprinting = false; this.health = this.maxHealth; this.regenT = 0; this.dead = false;
    this.rifleKey = 'rifle'; this.cfg = cfg;
    this.weps = { pistol: effWeapon(cfg.pistol || 'pistol', cfg), rifle: effWeapon(cfg.rifle || 'ar7', cfg), knife: effWeapon(cfg.knife || 'knife', cfg) };
    this.inv = [{ k: 'pistol' }, { k: 'rifle' }, { k: 'knife' }, null, null];
    this.mission = []; this.missionSel = 0; // mission bag in slot 4
    if (cfg.gadget) this.inv[4] = { k: cfg.gadget, item: true, count: GADGETS[cfg.gadget].count };
    this.ammo = {}; for (const k of ['pistol', 'rifle']) { const w = this.weps[k]; this.ammo[k] = { mag: w.mag, res: w.reserve + (cfg.extraMags ? w.mag * 2 : 0) }; }
    this.cur = 0; this.next = -1; this.anim = { k: 'draw', t: 0, d: .5 }; this.fireCd = 0; this.ads = 0; this.adsHeld = false;
    this.bob = 0; this.bobAmt = 0; this.swayX = 0; this.swayY = 0; this.kickP = 0; this.kickZ = 0; this.kickR = 0; this.land = 0; this.shake = 0;
    this.stepAcc = 0; this.lastSurf = 'mud'; this.inWater = 0; this.noiseLevel = 0; this.visibility = 1; this.speed = 0;
    this.interactTarget = null; this.holdT = 0; this.prompt = ''; this.chute = null; this.chuteOpen = 0; this.freefallT = 0; this.vehicle = null;
    this.takedown = null; this.local = null; this.hostage = null; this.holstered = false; this.carry = null; this.disguise = null; this.zoomI = 0; this.scoped = false; this.stun = 0; this.fov = 72; this.camRollT = 0; this.altitude = 0; this.thrownKnife = false; this.recoilYaw = 0;
    this.slideBack = 0; this.burstShots = 0; this.lastShot = -10; this.hurtDir = null; this.lastHurt = -10; this.camOverride = null;
  },
  applyLook(M) {
    const op = (typeof OPERATORS !== 'undefined' && OPERATORS[G.loadout.operator]) || null;
    const D = this.disguise;
    const app = Object.assign({}, this.baseApp || (this.baseApp = Object.assign({}, this.app)), op ? op.app : {}, M && M.playerApp ? M.playerApp : {}, D ? D.clothes : {});
    const key = JSON.stringify(app) + (M && M.armSleeve) + (D ? D.sleeve : '');
    if (key !== this._lookKey) { this._lookKey = key; this.rig.mesh.dispose(); this.rig.mesh = buildCharacter(app); this.vmArms.dispose(); this.vmArms = buildArms(D ? { sleeve: D.sleeve, glove: D.glove, plain: D.plain } : { sleeve: (M && M.armSleeve) || (op && op.sleeve) || 0x4a5038, glove: (M && M.armGlove) || (op && op.glove) || 0x1c1c1a, plain: !!(M && M.armSleeve) }); }
  },
  get weapon() { const s = this.inv[this.cur]; return s ? s.k : null; },
  get wdef() { return (this.weps && this.weps[this.weapon]) || null; },
  isGun() { const w = this.wdef; return !this.holstered && w && (w.type === 'pistol' || w.type === 'rifle'); },
  eye() { return [this.pos[0], this.pos[1] + lerp(EYE, CEYE, this.crouch) - this.land * .12, this.pos[2]]; },
  fwd() { const cp = Math.cos(this.pitch); return [-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp]; },
  busy() { const k = this.anim && this.anim.k; return k === 'reload' || k === 'holster' || k === 'draw' || k === 'melee' || k === 'interact' || k === 'takedown' || k === 'throw' || k === 'hold' || k === 'gadget' || k === 'stab'; },
  /* ======================= UPDATE ======================= */
  update(dt) {
    const W = G.W; const S = G.settings;
    // look
    this.stun = Math.max(0, (this.stun || 0) - dt);
    if (this.carry && (this.state !== 'ground' || this.hostage || !this.carry.dead)) G.dropBody();
    if (this.state !== 'dead' && !this.camOverride && !this.takedown && !(this.stun > 0) && !(this.hostage && this.hostage.phase === 'grab')) {
      const sens = S.sens * .0022 * (this.ads > .5 ? .65 : 1) * (this.scoped ? 3 / SNIPER_ZOOM[this.zoomI | 0] : 1);
      let ax = IN.mdx, ay = IN.mdy; if (S.accel) { const m = 1 + Math.min(1, Math.hypot(ax, ay) / 40) * .9; ax *= m; ay *= m; }
      this.yaw -= ax * sens; this.pitch -= ay * sens * (S.invert ? -1 : 1);
      if (this.scoped) { const br = IN.k('ShiftLeft') ? .15 : 1, t = G.time; this.yaw += (Math.sin(t * .9) * .5 + Math.sin(t * 2.3) * .2) * .021 * br * dt; this.pitch += Math.cos(t * 1.15) * .017 * br * dt; }
      this.pitch = clamp(this.pitch, -1.5, 1.5);
      this.swayX = damp(this.swayX, clamp(-IN.mdx * .0006, -.03, .03), 8, dt); this.swayY = damp(this.swayY, clamp(IN.mdy * .0006, -.03, .03), 8, dt);
    }
    if (this.state === 'plane') this.updatePlane(dt);
    else if (this.state === 'fall' || this.state === 'chute') this.updateAir(dt);
    else if (this.state === 'ground') this.updateGround(dt);
    else if (this.state === 'vehicle') G.updateDriving(dt);
    else if (this.state === 'boatride' || this.state === 'heliride' || this.state === 'truckride') this.updateRide(dt);
    if (this.state !== 'dead' && this.state !== 'vehicle') this.updateWeapons(dt);
    if (this.state !== 'dead') this.updateInteract(dt);
    // health regen
    this.regenT -= dt; if (this.regenT < 0 && this.health < this.maxHealth && this.health > 0) this.health = Math.min(this.maxHealth, this.health + 9 * this.regenMul * dt);
    this.land = damp(this.land, 0, 6, dt); this.shake = damp(this.shake, 0, 5, dt);
    this.kickP = damp(this.kickP, 0, 12, dt); this.kickZ = damp(this.kickZ, 0, 14, dt); this.kickR = damp(this.kickR, 0, 10, dt);
    this.slideBack = damp(this.slideBack, 0, 22, dt);
    this.updateCamera(dt);
  },
  moveInput() {
    let f = 0, s = 0; if (IN.k('KeyW')) f += 1; if (IN.k('KeyS')) f -= 1; if (IN.k('KeyD')) s += 1; if (IN.k('KeyA')) s -= 1;
    const l = Math.hypot(f, s) || 1; return [f / l * (f || s ? 1 : 0), s / l * (f || s ? 1 : 0)];
  },
  updateGround(dt) {
    const W = G.W; if (this.mantle) return this.updateMantle(dt); const [f, s] = this.moveInput();
    this.crouchHeld = IN.k('ControlLeft') || IN.k('ControlRight') || IN.k('KeyC');
    // can stand up?
    if (!this.crouchHeld && this.crouch > .5) { const c = W.ceiling(this.pos[0], this.pos[2], this.pos[1] + 1.1); if (c < this.pos[1] + 1.85) this.crouchHeld = true; }
    this.crouch = damp(this.crouch, this.crouchHeld ? 1 : 0, 10, dt);
    this.sprinting = IN.k('ShiftLeft') && f > .3 && this.crouch < .3 && this.ads < .3 && !(this.anim.k === 'reload' && this.wdef && this.wdef.type === 'rifle' && false);
    const water = W.waterY > -50 ? clamp((W.waterY - this.pos[1]) / .9, 0, 1) : 0; this.inWater = water;
    if (this.hostage || this.stun > 0) { this.sprinting = false; this.crouchHeld = false; }
    if (this.carry) this.sprinting = false;
    let spd = this.sprinting ? 6.4 : this.crouch > .5 ? 1.9 : 3.7; if (this.hostage) spd = 1.7; if (this.carry) spd *= .55; if (this.stun > 0) spd = 0; if (this.ads > .5) spd *= .6; spd *= 1 - water * .45;
    if (this.wdef && this.wdef.type === 'rifle') spd *= .96;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const tx = (-sy * f + cy * s) * spd, tz = (-cy * f - sy * s) * spd;
    const acc = this.onGround ? 12 : 2;
    this.vel[0] = damp(this.vel[0], tx, acc, dt); this.vel[2] = damp(this.vel[2], tz, acc, dt);
    if (IN.hit('Space') && !this.hostage && !this.carry && this.tryMantle()) return;
    if (this.onGround && IN.hit('Space') && this.crouch < .5 && water < .6 && !this.carry) { this.vel[1] = 5.2; this.onGround = false; AUD.step(this.lastSurf, null, .25); }
    this.vel[1] -= 18 * dt;
    const np = [this.pos[0] + this.vel[0] * dt, this.pos[1], this.pos[2] + this.vel[2] * dt];
    const h = lerp(1.8, 1.2, this.crouch);
    W.collide(np, PR, h, this.onGround ? .45 : .2);
    // vehicles as dynamic obstacles
    for (const v of G.vehicles) G.collideVehicle(v, np, PR);
    np[1] = this.pos[1] + this.vel[1] * dt;
    const gy = W.ground(np[0], np[2], Math.max(this.pos[1], np[1]), this.onGround ? .45 : .25, PR * .6);
    const wasGround = this.onGround;
    if (np[1] <= gy) {
      if (!wasGround && this.vel[1] < -7) { this.land = clamp(-this.vel[1] / 14, .2, 1); AUD.step(W.surfAt(np[0], np[2], gy), null, .6); if (this.vel[1] < -14) this.hurt((-this.vel[1] - 14) * 8, null); G.noise(np, 7, 'land'); }
      np[1] = this.onGround && gy - this.pos[1] > .05 ? damp(this.pos[1], gy, 25, dt) : gy; this.vel[1] = 0; this.onGround = true;
      if (np[1] < gy - .01) np[1] = gy - .0;
    } else if (this.onGround && np[1] - gy < .35 && this.vel[1] <= 0) { np[1] = gy; this.vel[1] = 0; } // stick to slopes / steps down
    else this.onGround = false;
    const c = W.ceiling(np[0], np[2], np[1] + .3); if (np[1] + h > c) { np[1] = Math.min(np[1], c - h); if (this.vel[1] > 0) this.vel[1] = 0; }
    this.pos = np;
    this.speed = Math.hypot(this.vel[0], this.vel[2]);
    // footsteps
    if (this.onGround) {
      this.stepAcc += this.speed * dt; const stride = this.sprinting ? 1.9 : this.crouch > .5 ? .85 : 1.45;
      if (this.stepAcc > stride) {
        this.stepAcc = 0; const surf = water > .05 ? 'water' : W.surfAt(this.pos[0], this.pos[2], this.pos[1]); this.lastSurf = surf;
        const v = this.sprinting ? .5 : this.crouch > .5 ? .1 : .26; AUD.step(surf, null, v);
        const nr = (this.cfg.boots ? .6 : 1) * (operatorPerks().quiet || 1) * (this.sprinting ? 11 : this.crouch > .5 ? 1.6 : 4.5) * (surf === 'water' ? 1.5 : surf === 'metal' || surf === 'wood' ? 1.3 : surf === 'grass' || surf === 'snow' ? .8 : 1);
        G.noise(this.pos, nr, 'step');
        if (surf === 'water') G.splash([this.pos[0], W.waterY, this.pos[2]], 6);
      }
    }
    this.bobAmt = damp(this.bobAmt, this.onGround ? clamp(this.speed / 4, 0, 1.4) : 0, 8, dt); this.bob += this.speed * dt * (this.sprinting ? 1.55 : 1.9);
    this.noiseLevel = this.speed < .2 ? 0 : this.sprinting ? 1 : this.crouch > .5 ? .15 : .45;
  },
  /* ---- ledge climb: Space at a wall / ledge (also mid-jump) pulls the operator up onto it ---- */
  tryMantle() {
    const W = G.W; const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw); const reach = this.onGround ? 2.15 : 2.35; const p = this.pos;
    // is there something solid directly in front of the chest/legs?
    const o = [p[0], p[1] + .6, p[2]]; const h1 = W.ray(o, [fx, 0, fz], .9, { bullet: true }), h2 = W.ray([p[0], p[1] + 1.4, p[2]], [fx, 0, fz], .9, { bullet: true });
    const hit = h1 || h2; if (!hit || (hit.c && hit.c.ref && hit.c.ref.kind === 'door')) return false;
    const d = hit.t + .38; const tx = p[0] + fx * d, tz = p[2] + fz * d;
    // top of the obstacle right behind its front face (works for thin walls / railings too)
    const ex0 = p[0] + fx * (hit.t + .08), ez0 = p[2] + fz * (hit.t + .08);
    const top = Math.max(W.ground(ex0, ez0, p[1] + reach, 0, .04), W.ground(tx, tz, p[1] + reach, 0, .12)); const rise = top - p[1];
    if (rise < .45 || rise > reach) return false;
    const room = W.ceiling(ex0, ez0, top + .05, .1) - top; if (room < 1.05) return false;
    let to = [tx, top, tz];
    const q = [tx, top, tz]; W.collide(q, PR * .8, room < 1.7 ? 1 : 1.7, .3);
    const standY = W.ground(tx, tz, top + .1, 0, .12);
    if (Math.hypot(q[0] - tx, q[2] - tz) > .25 || standY < top - .2) {
      // too narrow to stand on (railing, low wall, fence): vault over it if there is free floor behind
      if (rise > 1.35) return false;
      let ok = false;
      for (const ex of [.75, 1.05, 1.4]) {
        const vx = p[0] + fx * (hit.t + ex), vz = p[2] + fz * (hit.t + ex); const vy = W.ground(vx, vz, top + .1, 0, .12);
        if (vy > top + .05 || top - vy > 1.6) continue;
        const r = [vx, vy, vz]; W.collide(r, PR * .8, 1.7, .3); if (Math.hypot(r[0] - vx, r[2] - vz) > .15) continue;
        if (W.ray([p[0], top + .45, p[2]], [fx, 0, fz], hit.t + ex, { bullet: true })) continue;
        to = [vx, vy, vz]; ok = true; break;
      }
      if (!ok) return false;
    }
    this.mantle = { from: V.copy(p), to, ledge: [p[0] + fx * (hit.t + .05), top, p[2] + fz * (hit.t + .05)], t: 0, d: .45 + rise * .2 + (to[1] < top - .05 ? .25 : 0), rise, peak: top + .08, low: room < 1.7 };
    this.vel = [0, 0, 0]; this.ads = 0; AUD.swoosh(.3, null, 500, .4); AUD.step('wood', null, .25); G.noise(p, 3, 'step'); return true;
  },
  updateMantle(dt) {
    const M = this.mantle; M.t += dt; const k = clamp(M.t / M.d, 0, 1);
    const up = smooth(k / .65), fw = smooth((k - .45) / .55);
    this.pos = [lerp(M.from[0], M.to[0], fw), (k < .65 ? lerp(M.from[1], M.peak, up) : lerp(M.peak, M.to[1], smooth((k - .65) / .35))) + Math.sin(Math.min(1, k / .65) * Math.PI) * .12, lerp(M.from[2], M.to[2], fw)];
    this.crouch = damp(this.crouch, M.low || k < .8 ? .55 : 0, 8, dt); this.land = Math.max(this.land, bump(k, .55, 1) * .35); this.shake = Math.max(this.shake, .05);
    this.bobAmt = 0; this.speed = 0;
    if (k >= 1) { this.pos = V.copy(M.to); this.mantle = null; this.onGround = true; this.vel = [0, 0, 0]; this.crouchHeld = M.low; AUD.step(G.W.surfAt(this.pos[0], this.pos[2], this.pos[1]), null, .35); }
  },
  updatePlane(dt) {
    const pl = G.plane; const [f, s] = this.moveInput();
    this.crouchHeld = IN.k('ControlLeft'); this.crouch = damp(this.crouch, this.crouchHeld ? 1 : 0, 10, dt);
    const spd = IN.k('ShiftLeft') ? 4.5 : 2.6; const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const L = this.local; // local position in plane frame
    L[0] += (-sy * f + cy * s) * spd * dt; L[2] += (-cy * f - sy * s) * spd * dt;
    // interior bounds
    const rampOpen = pl.ramp > .9;
    L[0] = clamp(L[0], -1.3, 1.3);
    for (const z of [-8, -4.5]) if (L[2] > z - 1.25 && L[2] < z + 1.25 && Math.abs(L[0]) < 1.25) { if (L[2] < z) L[2] = z - 1.25; else L[2] = z + 1.25; }
    L[2] = clamp(L[2], -11.3, rampOpen ? 16 : 8.6);
    let fy = .4; if (L[2] > 9) fy = .4 - (L[2] - 9) * Math.sin(pl.rampAng);
    this.vel[1] = (this.vel[1] || 0); L[1] = fy;
    this.bobAmt = damp(this.bobAmt, Math.hypot(f, s) * .8, 8, dt); this.bob += spd * Math.hypot(f, s) * dt * 1.9; this.speed = Math.hypot(f, s) * spd;
    this.stepAcc += this.speed * dt; if (this.stepAcc > 1.4) { this.stepAcc = 0; AUD.step('metal', null, .2); }
    if (L[2] > 14.2) { // jumped out
      const wp = M4.pt(pl.m, L[0], L[1] + .1, L[2]);
      this.pos = wp; this.state = 'fall'; this.vel = V.add(V.sc(pl.vel, .25), M4.dir(pl.m, 0, -1, 3)); this.yaw += pl.yaw; this.freefallT = 0; this.local = null;
      G.onJump && G.onJump();
    }
  },
  updateAir(dt) {
    const W = G.W; const [f, s] = this.moveInput(); const g = W.th(this.pos[0], this.pos[2]); const wy = Math.max(g, W.waterY > -50 ? W.waterY - .6 : -99);
    // ground objects (roofs)
    const gy = Math.max(wy, W.ground(this.pos[0], this.pos[2], this.pos[1], .1, .3));
    this.altitude = this.pos[1] - gy;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    if (this.state === 'fall') {
      this.freefallT += dt;
      this.vel[1] -= 9.8 * dt; this.vel[1] = Math.max(this.vel[1], -54);
      const hx = (-sy * f + cy * s) * 14, hz = (-cy * f - sy * s) * 14;
      this.vel[0] = damp(this.vel[0], hx, .9, dt); this.vel[2] = damp(this.vel[2], hz, .9, dt);
      this.shake = Math.max(this.shake, .25 + clamp(-this.vel[1] / 54, 0, 1) * .35);
      if (IN.hit('Space') && this.altitude > 3) this.deployChute();
      if (this.altitude < 25 && !this.warnedLow) { this.warnedLow = true; }
    } else {
      this.chuteOpen = Math.min(1, this.chuteOpen + dt / 1.3);
      const dive = IN.k('KeyW'), flare = IN.k('KeyS'); const turn = (IN.k('KeyD') ? 1 : 0) - (IN.k('KeyA') ? 1 : 0);
      this.chuteYaw = (this.chuteYaw ?? this.yaw) - turn * .7 * dt; this.roll = damp(this.roll, -turn * .22, 3, dt);
      const fwdS = dive ? 11 : flare ? 3.5 : 7.5, vy = dive ? -7.5 : flare ? -3.2 : -5;
      const open = smooth(this.chuteOpen);
      const tvx = -Math.sin(this.chuteYaw) * fwdS, tvz = -Math.cos(this.chuteYaw) * fwdS;
      this.vel[0] = damp(this.vel[0], tvx, 1.6 * open + .2, dt); this.vel[2] = damp(this.vel[2], tvz, 1.6 * open + .2, dt);
      this.vel[1] = damp(this.vel[1], lerp(-40, vy, open), 2.5 + open * 2, dt);
      // keep camera yaw roughly following the canopy heading but allow free look
      const rel = angDiff(this.chuteYaw, this.yaw); if (Math.abs(rel) > 1.4) this.yaw = this.chuteYaw + Math.sign(rel) * 1.4;
      this.yaw += -turn * .7 * dt * .8;
      this.shake = Math.max(this.shake, .05);
      if (this.chute) { this.chute.sound && this.chute.sound.set(.4 + Math.hypot(this.vel[0], this.vel[2]) * .02, .12, null); }
    }
    const np = V.add(this.pos, V.sc(this.vel, dt));
    W.collide(np, PR, 1.8, .2);
    if (np[1] <= gy + .02) { // touchdown
      np[1] = gy; this.pos = np;
      if (this.state === 'fall' && this.vel[1] < -16) { G.playerDie('PARACHUTE NOT DEPLOYED — IMPACT AT ' + Math.round(-this.vel[1]) + ' M/S'); return; }
      const hard = -this.vel[1];
      this.land = clamp(hard / 7, .5, 1); this.state = 'ground'; this.onGround = true; this.roll = 0;
      if (gy < W.waterY) this.pos[1] = gy;
      AUD.step(W.surfAt(np[0], np[2], np[1]), null, .8); AUD.swoosh(.3, null, 400, .6); G.noise(np, 9, 'land');
      if (this.chute) G.dropChute(this.chute, np, this.chuteYaw);
      this.chute = null; this.vel = [this.vel[0] * .3, 0, this.vel[2] * .3];
      G.onLanded && G.onLanded();
      return;
    }
    this.pos = np;
    if (G.windLoop) G.windLoop.set(.3 + clamp(V.len(this.vel) / 50, 0, 1), this.state === 'fall' ? .35 + clamp(-this.vel[1] / 54, 0, 1) * .5 : .08, null);
  },
  deployChute() {
    this.state = 'chute'; this.chuteOpen = 0; this.chuteYaw = this.yaw; this.chute = { m: M4.create() };
    AUD.swoosh(.9, null, 300, 1.2); G.after(() => { AUD.impact('wood', null); this.shake = 1; this.land = .6; }, 900);
    this.anim = { k: 'chutepull', t: 0, d: .9 };
  },
  updateRide(dt) { /* position driven by cinematic (boat / heli insertion) */ this.speed = 0; this.bobAmt = damp(this.bobAmt, 0, 5, dt); },
  /* ======================= WEAPONS ======================= */
  updateWeapons(dt) {
    const A = this.anim; A.t += dt;
    const W = this.wdef; const S = G.settings;
    const canAct = this.state === 'ground' && !this.takedown;
    if (this.carry) { if (A.t >= A.d) this.animDone(A); this.adsHeld = false; this.ads = damp(this.ads, 0, 14, dt); this.fireCd -= dt; if (canAct && IN.hit('KeyF') && !this.busy()) G.dropBody(); return; }
    // slot switching
    if (canAct && !this.hostage) for (let i = 0; i < 5; i++) if (IN.hit('Digit' + (i + 1))) this.selectSlot(i);
    if (canAct && this.holstered && (IN.mbHit[0] || IN.mbHit[2])) { this.holstered = false; this.anim = { k: 'draw', t: 0, d: .45 }; AUD.mech('draw'); }
    if (canAct && IN.wheel && this.scoped) { const z0 = this.zoomI | 0; this.zoomI = clamp(z0 + (IN.wheel < 0 ? 1 : -1), 0, SNIPER_ZOOM.length - 1); if (this.zoomI !== z0) AUD.click(2400, .25, null, .015); }
    else if (canAct && IN.wheel) { let n = this.cur; for (let k = 0; k < 5; k++) { n = (n + (IN.wheel > 0 ? 1 : 4)) % 5; if (this.inv[n] || (n === 3 && this.mission.length)) break; } if (n !== this.cur) this.selectSlot(n); }
    // anim completion
    if (A.t >= A.d) this.animDone(A);
    const firing = IN.mb[0]; const firingHit = IN.mbHit[0];
    this.adsHeld = !!IN.mb[2] && canAct;
    const allowAds = this.isGun() && !this.busy() && this.adsHeld && !this.sprinting;
    this.ads = damp(this.ads, allowAds ? 1 : 0, 14, dt);
    this.fireCd -= dt;
    if (!canAct) return;
    if (this.isGun()) {
      const am = this.ammo[this.weapon];
      if (IN.hit('KeyR') && !this.busy() && am.mag < W.mag && am.res > 0) this.startReload();
      if (!this.busy() && this.fireCd <= 0 && ((W.auto && firing) || firingHit) && !this.sprinting) {
        if (am.mag > 0) this.fire(); else { AUD.mech('dry'); this.fireCd = .25; if (am.res > 0) this.startReload(); }
      }
      if (!firing) this.burstShots = 0;
    } else if (this.weapon === 'knife') {
      if (!this.busy() && firingHit) { if (this.adsHeld) this.throwKnife(); else this.knifeAttack(); }
    } else if (this.inv[this.cur] && this.inv[this.cur].item && ['noisemaker', 'smoke', 'emp', 'medkit'].includes(this.inv[this.cur].k)) {
      if (!this.busy() && firingHit) this.anim = { k: 'gadget', t: 0, d: .75, fired: false };
    }
    if (IN.hit('KeyQ') && !this.busy() && !this.hostage && !this.holstered) { this.anim = { k: 'melee', t: 0, d: .6, hit: false }; AUD.swoosh(.3, null, 900, .3); }
  },
  selectSlot(i) {
    if (i === 3 && this.mission.length) { if (this.cur === 3) this.missionSel = (this.missionSel + 1) % this.mission.length; }
    else if (!this.inv[i]) return;
    if (i === this.cur && i !== 3 && i < 3) { if (this.busy()) return; this.holstered = !this.holstered; this.anim = { k: this.holstered ? 'holster' : 'draw', t: 0, d: this.holstered ? .3 : .45, keep: true }; AUD.mech('draw'); return; }
    if (i === this.cur && i !== 3) return;
    this.holstered = false;
    if (this.busy() && this.anim.k !== 'draw') return;
    this.next = i; this.anim = { k: 'holster', t: 0, d: .28 }; AUD.mech('draw');
  },
  curItemKind() { if (this.cur === 3) return this.mission[this.missionSel] || null; const s = this.inv[this.cur]; return s && s.item ? s.k : null; },
  animDone(A) {
    const k = A.k;
    if (k === 'holster') { if (A.keep) { this.anim = { k: 'idle', t: 0, d: 1e9 }; return; } if (this.next >= 0) { this.cur = this.next; this.next = -1; } this.anim = { k: 'draw', t: 0, d: .45 }; return; }
    if (k === 'reload') { const am = this.ammo[this.weapon]; const W = this.wdef; const need = W.mag - am.mag; const take = Math.min(need, am.res); am.mag += take; am.res -= take; }
    if (k === 'throw') { // knife left the hand
      this.inv[2] = null; this.thrownKnife = true; this.next = this.inv[0] ? 0 : 1; this.anim = { k: 'holster', t: .27, d: .28 }; return;
    }
    if (k === 'gadget') { const s = this.inv[this.cur]; if (s && s.count <= 0) { this.inv[this.cur] = null; this.next = 0; this.anim = { k: 'holster', t: .27, d: .28 }; return; } }
    if (k === 'interact' && A.done) A.done();
    if (k === 'takedown') { this.takedown = null; }
    if (k === 'hold') return; // managed by interaction
    this.anim = { k: 'idle', t: 0, d: 1e9 };
  },
  startReload() {
    const W = this.wdef; this.anim = { k: 'reload', t: 0, d: W.reload, s: 0, type: W.type }; this.ads = 0;
  },
  spread() {
    const W = this.wdef; const mv = clamp(this.speed / 4, 0, 1.6); let s = lerp(W.spread, W.adsSpread, this.ads) * (1 + mv * (this.ads > .5 ? 1.2 : .9));
    if (this.crouch > .5) s *= .7; if (!this.onGround) s *= 2.2; s *= 1 + Math.min(this.burstShots, 8) * .08; return s;
  },
  fire() {
    const W = this.wdef; const am = this.ammo[this.weapon]; am.mag--; this.fireCd = 60 / W.rpm; this.burstShots++; this.lastShot = G.time;
    const eye = this.eye(); const f = this.fwd(); const sp = this.spread();
    const r = [Math.cos(this.yaw), 0, -Math.sin(this.yaw)], u = V.cross(r, f);
    const a = Math.random() * TAU, m = Math.sqrt(Math.random()) * sp;
    const dir = V.norm(V.add(f, V.add(V.sc(r, Math.cos(a) * m), V.sc(u, Math.sin(a) * m))));
    G.stats.shots++;
    G.fireRay(eye, dir, W.dmg, 'player', this.weapon);
    AUD.shot(W.sound === 'riflS' ? 'pistolS' : W.sound, null);
    G.noise(eye, W.noise, W.suppressed ? 'shot_s' : 'shot');
    const kick = W.recoil * (this.ads > .5 ? .55 : 1) * (this.crouch > .5 ? .8 : 1);
    this.pitch += kick * .55; this.yaw += (Math.random() - .5) * kick * .5; this.kickP += kick * 3.2; this.kickZ += W.type === 'pistol' ? .035 : .028; this.kickR += (Math.random() - .5) * kick * 4;
    this.slideBack = 1; this.shake = Math.max(this.shake, W.type === 'rifle' ? .1 : .04);
    G.muzzleFlash(W);
    if (am.mag === 0) AUD.mech('dry');
    else if (W.sniper) G.after(() => AUD.mech('rack'), 380);
  },
  knifeAttack() {
    const K = this.weps.knife; this.anim = { k: 'stab', t: 0, d: K.swing, hit: false, side: Math.random() < .5 ? 1 : -1 }; AUD.swoosh(.35, null, 1300, .25);
  },
  throwKnife() { this.anim = { k: 'throw', t: 0, d: .5, fired: false }; },
  /* ======================= INTERACTION ======================= */
  updateInteract(dt) {
    const A = this.anim;
    // anim event triggers
    if (A.k === 'melee' && !A.hit && A.t > .22) { A.hit = true; G.meleeHit(this.isGun() ? 45 : 150, 2.0, this.weapon === 'knife'); }
    if (A.k === 'stab' && !A.hit && A.t > .18) { A.hit = true; G.meleeHit(110, 2.0, true); }
    if (A.k === 'throw' && !A.fired && A.t > .3) { A.fired = true; G.spawnThrownKnife(); AUD.swoosh(.4, null, 1500, .3); }
    if (A.k === 'gadget' && !A.fired && A.t > .42) { A.fired = true; const s = this.inv[this.cur]; s.count--; if (s.k === 'medkit') { this.health = Math.min(this.maxHealth, this.health + 70); AUD.mech('pickup'); AUD.swoosh(.3, null, 2000, .4); G.notify('MEDKIT APPLIED +70'); } else { G.throwGadget(s.k); AUD.swoosh(.3, null, 700, .35); } }
    if (A.k === 'interact' && !A.fired && A.t > A.d * A.at) { A.fired = true; A.act && A.act(); }
    if (this.state !== 'ground' && this.state !== 'plane' && this.state !== 'boatride' && this.state !== 'heliride' && this.state !== 'truckride') { this.prompt = ''; this.interactTarget = null; return; }
    if (this.hostage) { this.prompt = this.hostage.phase === 'hold' ? '[F] ELIMINATE   ·   [E] RELEASE' : ''; this.interactTarget = null; return; }
    const eye = this.state === 'plane' ? M4.pt(G.plane.m, this.local[0], this.local[1] + lerp(EYE, CEYE, this.crouch), this.local[2]) : this.camPos || this.eye();
    const fwd = this.camFwd || this.fwd();
    let best = null, bs = 1e9;
    if (!this.busy() || A.k === 'hold') {
      for (const it of G.interactables()) {
        if (it.enabled && !it.enabled()) continue;
        const p = typeof it.pos === 'function' ? it.pos() : it.pos; const d = V.dist(p, eye); if (d > (it.r || 1.8)) continue;
        const to = V.sc(V.sub(p, eye), 1 / (d || 1)); const ang = Math.acos(clamp(V.dot(to, fwd), -1, 1));
        const lim = it.wide ? 1.2 : d < .9 ? .9 : .45; if (ang > lim) continue;
        const score = ang + d * .05 - (it.prio || 0); if (score < bs) { bs = score; best = it; }
      }
    }
    this.interactTarget = best;
    this.prompt = best ? (typeof best.label === 'function' ? best.label() : best.label) : '';
    if (!best || !this.prompt) { this.interactTarget = null; if (A.k === 'hold') this.cancelHold(); return; }
    const opts = []; if (!(best.mainOff && best.mainOff())) opts.push(best); if (best.extra) for (const o of best.extra) if (!o.enabled || o.enabled()) opts.push(o);
    let held = false;
    for (const o of opts) {
      const key = o.key || 'KeyE';
      if (o.hold) {
        if (!IN.k(key)) continue;
        if (A.k === 'hold' && A.it !== o) continue;
        if (A.k !== 'hold') { if (this.busy()) continue; this.holdT = 0; this.anim = { k: 'hold', t: 0, d: 1e9, it: o, kind: o.anim || 'hotwire' }; o.onStart && o.onStart(); }
        held = true; this.holdT += dt; if (o.onHold) o.onHold(dt);
        if (this.holdT >= o.hold) { this.holdT = 0; this.anim = { k: 'idle', t: 0, d: 1e9 }; o.act(); }
        break;
      } else if (IN.hit(key) && !this.busy()) {
        if (o.instant) { o.act(); return; }
        const p = typeof o.pos === 'function' ? o.pos() : (o.pos || (typeof best.pos === 'function' ? best.pos() : best.pos));
        this.anim = { k: 'interact', t: 0, d: o.dur || .75, at: o.at || .5, target: V.copy(p), kind: o.anim || 'reach', act: () => o.act(), fired: false, item: o.item || null };
        if (o.onStart) o.onStart(); return;
      }
    }
    if (!held && A.k === 'hold') this.cancelHold();
  },
  cancelHold() { this.holdT = 0; if (this.anim.k === 'hold') { const it = this.anim.it; it && it.onCancel && it.onCancel(); this.anim = { k: 'idle', t: 0, d: 1e9 }; } },
  hurt(dmg, from) {
    if (this.state === 'dead' || G.state !== 'play' || G.god) return;
    if (this.cfg && this.cfg.armor) dmg *= .7; this.health -= dmg; this.regenT = 5.5; this.shake = Math.max(this.shake, .3); AUD.hurt(); this.lastHurt = G.time;
    if (from) this.hurtDir = Math.atan2(from[0] - this.pos[0], from[2] - this.pos[2]);
    G.stats.damage += dmg;
    if (this.health <= 0) { this.health = 0; G.playerDie('KILLED IN ACTION'); }
  },
  /* ======================= CAMERA ======================= */
  updateCamera(dt) {
    const m = this.camM;
    if (this.camOverride) { M4.copy(m, this.camOverride); }
    else {
      M4.ident(m);
      if (this.state === 'plane') { M4.mul(m, m, G.plane.m); M4.translate(m, m, this.local[0], this.local[1] + lerp(EYE, CEYE, this.crouch), this.local[2]); }
      else if (this.state === 'vehicle') { G.vehicleCam(m); }
      else { const e = this.eye(); M4.translate(m, m, e[0], e[1], e[2]); }
      // head bob
      const b = this.bob, a = this.bobAmt * (this.state === 'ground' ? 1 : 0);
      const bx = Math.sin(b) * .03 * a, by = -Math.abs(Math.cos(b)) * .035 * a;
      if (this.state !== 'vehicle') { M4.rotY(m, m, this.yaw); M4.rotX(m, m, this.pitch + this.kickP * .05); M4.rotZ(m, m, this.roll + Math.sin(b) * .006 * a + this.kickR * .02); M4.translate(m, m, bx, by, 0); }
      if (this.shake > .01) { const s = this.shake * .012, t = G.time * 40; M4.rotX(m, m, Math.sin(t) * s); M4.rotY(m, m, Math.cos(t * 1.3) * s); }
    }
    M4.invert(this.view, m);
    this.camPos = M4.pos(m); this.camFwd = V.norm(M4.dir(m, 0, 0, -1)); this.camRight = V.norm(M4.dir(m, 1, 0, 0)); this.camUp = V.norm(M4.dir(m, 0, 1, 0));
    // fov
    const W = this.wdef; let fov = G.settings.fov;
    if (this.isGun()) fov = lerp(fov, W.sniper ? G.settings.fov / SNIPER_ZOOM[this.zoomI | 0] : W.adsFov * (G.loadout.optic === 'holo' && W.type === 'rifle' ? .82 : 1), this.ads);
    this.scoped = !!(this.isGun() && W.sniper && this.ads > .86);
    if (this.sprinting) fov += 4; if (this.state === 'fall') fov += 8;
    this.fov = damp(this.fov, fov, this.scoped ? 18 : 10, dt);
  },
  /* body pose for the world-space player model */
  updateBody(dt) {
    const rig = this.rig; const j = P_(); let py = 0;
    if (this.state === 'ground') {
      if (this.crouch > .5) { poseCrouch(j, this.bob * .5, this.speed > .3); py = -.36 * this.crouch; }
      else if (this.speed > .3) py = -poseWalk(j, this.bob * .5, clamp(this.speed / 3.5, .3, 1.2), this.sprinting, true);
      else poseIdle(j, G.time, 'idle', 0);
      if (!this.onGround) { pj(j, SK.THL, .6, 0, 0); pj(j, SK.THR, .2, 0, 0); pj(j, SK.SHL, -.9, 0, 0); pj(j, SK.SHR, -.5, 0, 0); }
      py -= this.land * .25;
      pj(j, SK.CH, j[SK.CH * 3] + this.pitch * .25, 0, 0);
    } else if (this.state === 'fall') { pj(j, SK.THL, .3, 0, -.25); pj(j, SK.THR, .3, 0, .25); pj(j, SK.SHL, -1.1, 0, 0); pj(j, SK.SHR, -1.1, 0, 0); }
    else if (this.state === 'chute' || this.state === 'heliride') { const sw = Math.sin(G.time * 1.3) * .1; pj(j, SK.THL, .25 + sw, 0, -.08); pj(j, SK.THR, .2 - sw, 0, .08); pj(j, SK.SHL, -.3, 0, 0); pj(j, SK.SHR, -.35, 0, 0); pj(j, SK.FTL, .5, 0, 0); pj(j, SK.FTR, .5, 0, 0); if (this.state === 'heliride') { pj(j, SK.THL, 1.5, 0, -.1); pj(j, SK.THR, 1.5, 0, .1); pj(j, SK.SHL, -1.2, 0, 0); pj(j, SK.SHR, -1.3, 0, 0); py = -.5; } }
    else if (this.state === 'vehicle' || this.state === 'boatride') { poseSit(j, G.time, 0, false); py = -.48; pj(j, SK.THL, 1.4, .1, -.05); pj(j, SK.THR, 1.4, -.1, .05); pj(j, SK.SHL, -1.1, 0, 0); pj(j, SK.SHR, -1.2, 0, 0); }
    else if (this.state === 'plane') { if (this.speed > .3) py = -poseWalk(j, this.bob * .5, .8, false, true); else poseIdle(j, G.time, 'idle', 0); if (this.crouch > .5) { poseCrouch(j, 0, false); py = -.36; } }
    rig.tj.set(j); rig.tpy = py; rig.blend(14, dt);
    // root transform: feet, pushed back so the camera doesn't sit inside the chest when looking down
    const r = rig.root; M4.ident(r);
    const back = .16 + Math.max(0, -this.pitch) * .12;
    if (this.state === 'plane') { M4.mul(r, r, G.plane.m); M4.translate(r, r, this.local[0], this.local[1], this.local[2]); }
    else if (this.state === 'vehicle') { G.vehicleSeat(r); }
    else M4.translate(r, r, this.pos[0], this.pos[1], this.pos[2]);
    const by = this.state === 'chute' ? this.chuteYaw : this.state === 'vehicle' ? 0 : this.yaw;
    M4.rotY(r, r, by); M4.translate(r, r, 0, 0, back + this.crouch * .34);
    rig.hide = (rig.hide & ~(1 << SK.CH)) | (this.crouch > .3 && this.pitch > -.75 ? (1 << SK.CH) : 0);
    rig.solve(null, false);
  },
};
