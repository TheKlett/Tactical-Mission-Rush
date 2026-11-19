/* =====================================================================
   VEHICLES + CINEMATICS — drivable cars with hotwiring, physical
   driving model; aircraft/boat/heli insertion & extraction sequences.
   ===================================================================== */
Object.assign(G, {
  addVehicle(kind, x, z, yaw, o = {}) {
    const W = this.W; const colors = [0x6a1a14, 0x23384a, 0x5a5a52, 0x2a3a24, 0x8a8478, 0x1a1a1a, 0x7a6a3a];
    const def = buildCar(kind, o.color ?? colors[(this.rng() * colors.length) | 0]);
    const v = { kind, def, pos: [x, W.th(x, z), z], yaw, speed: 0, steer: 0, engine: false, locked: !!o.hotwire, bones: new Float32Array(7 * 16), wheelRot: 0, pitch: 0, roll: 0, rpm: 0, accelP: 0, lookYaw: 0, chase: false, noiseT: 0, m: M4.create(), name: o.name || (kind === 'pickup' ? 'PICKUP TRUCK' : kind === 'truck' ? 'CARGO TRUCK' : kind === 'suv' ? 'SUV' : 'SEDAN'), drivable: o.drivable !== false };
    v.pos[1] = this.groundUnder(v);
    v.col = W.col(0, 0, 0, 1, 1, 1, { surf: 'metal', ref: { kind: 'vehicle', v }, nav: true }); this.updateVehicleCol(v);
    if (v.drivable) W.interact.push({
      r: 2.4, wide: true, pos: () => v.locked ? M4.pt(v.m, def.steer[0] + .05, def.steer[1] - .32, def.steer[2] + .05) : M4.pt(v.m, -def.W / 2 - .15, 1.2, -def.L * .05),
      label: () => P.state !== 'ground' ? '' : v.locked ? '[E] HOTWIRE ' + v.name + ' (HOLD)' : '[E] ENTER ' + v.name,
      get hold() { return v.locked ? 4.5 : 0; }, get anim() { return v.locked ? 'hotwire' : 'door'; }, dur: .7, at: .45,
      onHold: dt => { v.hwT = (v.hwT || 0) + dt; if (Math.random() < dt * 4) AUD.sparks(v.pos); if (Math.random() < dt * 1.5) { AUD.click(2000 + Math.random() * 3000, .3, v.pos); } },
      act: () => { if (v.locked) { v.locked = false; this.notify('VEHICLE HOTWIRED'); } this.enterVehicle(v); },
    });
    this.vehicles.push(v); this.vehicleBones(v); return v;
  },
  groundUnder(v) { const W = this.W; let g = -1e9; for (const [a, b] of [[0, 0], [.8, 1.5], [-.8, 1.5], [.8, -1.5], [-.8, -1.5]]) { const p = M4.pt(M4.trs(M4.create(), M4.create(), v.pos[0], 0, v.pos[2], 0, v.yaw, 0), a, 0, b); g = Math.max(g, W.th(p[0], p[2])); } return g; },
  updateVehicleCol(v) {
    const c = Math.abs(Math.cos(v.yaw)), s = Math.abs(Math.sin(v.yaw)); const hw = (v.def.W * c + v.def.L * s) / 2 * .92, hd = (v.def.W * s + v.def.L * c) / 2 * .92;
    this.W.moveCol(v.col, [v.pos[0] - hw, v.pos[1] + .3, v.pos[2] - hd], [v.pos[0] + hw, v.pos[1] + v.def.h, v.pos[2] + hd]);
  },
  vehicleBones(v) {
    const d = v.def; const b = v.bones; const m = v.m; M4.ident(m); M4.translate(m, m, v.pos[0], v.pos[1], v.pos[2]); M4.rotY(m, m, v.yaw); M4.rotX(m, m, v.pitch); M4.rotZ(m, m, v.roll);
    b.set(m, 0); const t = M4.create();
    for (let i = 0; i < 4; i++) { const wp = d.wheelPos[i]; M4.translate(t, m, wp[0], wp[1] + (v.wheelSusp ? v.wheelSusp[i] : 0), wp[2]); if (i < 2) M4.rotY(t, t, v.steer); M4.rotX(t, t, -v.wheelRot); b.set(t, (1 + i) * 16); }
    M4.translate(t, m, d.steer[0], d.steer[1], d.steer[2]); M4.rotX(t, t, Math.PI / 2 - .45); M4.rotY(t, t, -v.steer * 2.6); b.set(t, 5 * 16); v.wheelM = M4.copy(v.wheelM || M4.create(), t);
    b.set(ZERO_M, 6 * 16);
  },
  enterVehicle(v) {
    P.state = 'vehicle'; P.vehicle = v; v.driver = true; v.col.on = false; P.yaw = 0; P.pitch = -.08; P.ads = 0; this.stats.vehicles++;
    if (!v.engine) { v.engine = true; AUD.click(400, .6, v.pos); setTimeout(() => AUD.click(300, .5, v.pos), 150); v.sound = AUD.engineLoop(v.kind === 'truck' ? 'car' : 'car', v.pos); this.noise(v.pos, 35, 'vehicle'); }
    UI.hint('W/S — THROTTLE / BRAKE · A/D — STEER · SPACE — HANDBRAKE · C — CAMERA · E — EXIT');
  },
  exitVehicle() {
    const v = P.vehicle; if (!v) return; const side = M4.pt(v.m, -v.def.W / 2 - .7, 0, -v.def.L * .05);
    const p = [side[0], 0, side[2]]; p[1] = this.W.ground(p[0], p[2], v.pos[1] + 2, 3); this.W.collide(p, PR, 1.8, .45);
    P.pos = p; P.vel = [0, 0, 0]; P.state = 'ground'; P.yaw = v.yaw + P.yaw; P.pitch = 0; P.vehicle = null; v.driver = false; v.speed = 0;
    this.updateVehicleCol(v); v.col.on = true;
    if (v.sound) { v.sound.stop(); v.sound = null; } v.engine = false; AUD.click(500, .5, v.pos, .05);
    P.anim = { k: 'draw', t: 0, d: .45 };
  },
  updateDriving(dt) {
    const v = P.vehicle; if (!v) return;
    P.yaw = clamp(P.yaw, -1.7, 1.7); P.pitch = clamp(P.pitch, -.7, .5);
    if (IN.hit('KeyC')) v.chase = !v.chase;
    if (IN.hit('KeyE') && Math.abs(v.speed) < 2.5) { this.exitVehicle(); return; }
    v.throttle = (IN.k('KeyW') ? 1 : 0) - (IN.k('KeyS') ? 1 : 0); v.steerIn = (IN.k('KeyA') ? 1 : 0) - (IN.k('KeyD') ? 1 : 0); v.hand = IN.k('Space');
    P.speed = 0; P.bobAmt = 0;
  },
  updateVehicle(v, dt) {
    const W = this.W; const d = v.def;
    if (v.driver) {
      const max = v.kind === 'truck' ? 22 : 30; let acc = 0; const th = v.throttle || 0;
      if (th > 0) acc = v.speed < -.5 ? 16 : 9 * (1 - v.speed / max); else if (th < 0) acc = v.speed > .5 ? -16 : -5 * (1 + v.speed / 8);
      v.speed += acc * dt; v.speed -= (v.speed * .22 + Math.sign(v.speed) * .5) * dt; if (Math.abs(v.speed) < .05 && !th) v.speed = 0;
      if (v.hand) v.speed *= Math.exp(-2.5 * dt);
      const water = W.waterY > -50 ? W.waterY - W.th(v.pos[0], v.pos[2]) : -1; if (water > .9) { v.speed *= Math.exp(-3 * dt); }
      const tgt = v.steerIn * .6 * (1 - Math.min(Math.abs(v.speed) / 45, .55)); v.steer = damp(v.steer, tgt, 5, dt);
      const wb = d.L * .62; v.yaw += v.speed / wb * Math.tan(v.steer) * dt * (v.hand ? 1.3 : 1);
      v.accelP = damp(v.accelP, acc, 4, dt);
      const f = [-Math.sin(v.yaw), 0, -Math.cos(v.yaw)];
      const np = [v.pos[0] + f[0] * v.speed * dt, v.pos[1], v.pos[2] + f[2] * v.speed * dt];
      // body collision: perimeter samples
      let push = [0, 0], hits = 0; const yaw = v.yaw; const cy = Math.cos(yaw), sy = Math.sin(yaw);
      for (const [lx, lz] of [[0, -.5], [-.45, -.45], [.45, -.45], [-.5, 0], [.5, 0], [-.45, .45], [.45, .45], [0, .5]]) {
        const wx = np[0] + (lx * d.W) * cy + (lz * d.L) * sy, wz = np[2] - (lx * d.W) * sy + (lz * d.L) * cy;
        const q = [wx, np[1] + .3, wz]; const ox = q[0], oz = q[2]; if (W.collide(q, .35, 1.2, .55)) { push[0] += q[0] - ox; push[1] += q[2] - oz; hits++; }
      }
      if (hits) { np[0] += push[0] / hits * 1.2; np[2] += push[1] / hits * 1.2; if (Math.abs(v.speed) > 3) { AUD.impact('metal', v.pos); AUD.impact('metal', v.pos); P.shake = Math.min(1.2, Math.abs(v.speed) * .06); this.noise(v.pos, 30, 'impact'); } v.speed *= -.25; }
      // run over NPCs
      if (Math.abs(v.speed) > 4) for (const n of this.npcs) { if (n.dead) continue; const lx = (n.pos[0] - np[0]) * cy - (n.pos[2] - np[2]) * sy, lz = (n.pos[0] - np[0]) * sy + (n.pos[2] - np[2]) * cy; if (Math.abs(lx) < d.W / 2 + .3 && Math.abs(lz) < d.L / 2 + .3) { n.damage(Math.abs(v.speed) * 12, v.pos, 'chest', 'vehicle'); AUD.impact('flesh', n.pos); this.blood(V.add(n.pos, [0, 1, 0]), f); v.speed *= .85; } }
      v.pos[0] = np[0]; v.pos[2] = np[2];
      // terrain following
      const sample = (lx, lz) => { const wx = v.pos[0] + lx * cy + lz * sy, wz = v.pos[2] - lx * sy + lz * cy; return W.ground(wx, wz, v.pos[1] + 1.2, 1.4, .3); };
      const hf = (sample(-d.W * .4, -d.L * .32) + sample(d.W * .4, -d.L * .32)) / 2, hb = (sample(-d.W * .4, d.L * .3) + sample(d.W * .4, d.L * .3)) / 2;
      const hl = (sample(-d.W * .4, -d.L * .32) + sample(-d.W * .4, d.L * .3)) / 2, hr = (sample(d.W * .4, -d.L * .32) + sample(d.W * .4, d.L * .3)) / 2;
      v.pos[1] = damp(v.pos[1], (hf + hb) / 2, 12, dt);
      v.pitch = damp(v.pitch, Math.atan2(hf - hb, d.L * .62) - v.accelP * .006, 8, dt); v.roll = damp(v.roll, Math.atan2(hr - hl, d.W * .8) * -1 + v.steer * v.speed * .006, 6, dt);
      v.wheelRot += v.speed / d.wr * dt;
      v.rpm = damp(v.rpm, clamp(Math.abs(v.speed) / max * .9 + Math.abs(th) * .25, .08, 1.2), 4, dt);
      if (v.sound) v.sound.set(v.rpm, .35 + v.rpm * .3, V.add(v.pos, [0, 1, 0]));
      v.noiseT -= dt; if (v.noiseT <= 0) { v.noiseT = 1.2; this.noise(v.pos, 20 + Math.abs(v.speed) * 1.5, 'vehicle'); }
      if (Math.abs(v.speed) > 6 && W.waterY > -50 && W.th(v.pos[0], v.pos[2]) < W.waterY && Math.random() < .5) this.splash([v.pos[0], W.waterY, v.pos[2]], 4);
      P.pos = V.copy(v.pos);
    }
    this.vehicleBones(v);
  },
  vehicleCam(m) {
    const v = P.vehicle; const d = v.def;
    if (v.chase) { M4.mul(m, m, M4.trs(M4.create(), M4.create(), v.pos[0], v.pos[1], v.pos[2], 0, v.yaw + P.yaw, 0)); M4.translate(m, m, 0, 3.2, d.L * .5 + 5.5); M4.rotX(m, m, -.22 + P.pitch * .5); return; }
    M4.mul(m, m, v.m); M4.translate(m, m, d.seat[0], d.seat[1] + .05, d.seat[2]);
    const sh = Math.sin(this.time * 30) * .002 * v.rpm; M4.translate(m, m, sh, sh * .5, 0);
    M4.rotY(m, m, P.yaw + v.steer * .15); M4.rotX(m, m, P.pitch);
  },
  vehicleSeat(r) { const v = P.vehicle; M4.mul(r, r, v.m); M4.translate(r, r, v.def.seat[0], v.def.seat[1] - .55, v.def.seat[2] + .25); },
  vehicleHands(toCam) {
    const v = P.vehicle; const wm = v.wheelM; const R0 = .19;
    const lw = M4.pt(wm, -.87 * R0, 0, -.5 * R0), rw = M4.pt(wm, .87 * R0, 0, -.5 * R0);
    const L = toCam(lw), Rr = toCam(rw);
    const lb = VM.reachBasis(VM.shL, L, true), rb = VM.reachBasis(VM.shR, Rr, false);
    return [VM.wrist(L, lb, true), VM.wrist(Rr, rb, false), lb, rb];
  },
  collideVehicle(v, p, r) {
    if (v.driver && P.vehicle === v) return; const d = v.def; const cy = Math.cos(v.yaw), sy = Math.sin(v.yaw);
    const dx = p[0] - v.pos[0], dz = p[2] - v.pos[2]; const lx = dx * cy - dz * sy, lz = dx * sy + dz * cy;
    const hw = d.W / 2 + r, hl = d.L / 2 + r; if (Math.abs(lx) > hw || Math.abs(lz) > hl || p[1] > v.pos[1] + d.h) return;
    let nx = lx, nz = lz; if (hw - Math.abs(lx) < hl - Math.abs(lz)) nx = Math.sign(lx) * hw; else nz = Math.sign(lz) * hl;
    p[0] = v.pos[0] + nx * cy + nz * sy; p[2] = v.pos[2] - nx * sy + nz * cy;
  },
  /* ======================= CINEMATICS ======================= */
  camLook(eye, tgt) { const m = M4.create(); M4.lookAt(m, eye, tgt, [0, 1, 0]); return M4.invert(M4.create(), m); },
  // ---------------- cargo-plane HALO insertion ----------------
  introPlane(o) {
    const pl = this.plane = { center: o.center, R: o.R, alt: o.alt, w: o.speed / o.R, ang: o.startAng, mesh: buildCargoPlane(), bones: new Float32Array(8 * 16), m: M4.create(), ramp: 0, rampAng: -.55, door: 0, vel: [0, 0, 0], yaw: 0, opening: false, btn: 0, inside: false };
    this.extras.push({ mesh: pl.mesh, bones: pl.bones, r: 30, plane: true, get pos() { return G.plane ? M4.pos(G.plane.m) : [0, -999, 0]; }, get hidden() { return !G.plane; } });
    pl.sound = AUD.engineLoop('plane', null);
    this.updatePlaneObj(0);
    this.W.interact.push({ r: 1.7, pos: () => M4.pt(pl.m, -1.66, 1.55, 7.6), label: () => P.state === 'plane' && !pl.opening ? '[E] OPEN CARGO RAMP' : '', anim: 'press', dur: .8, at: .45, act: () => this.openRamp() });
    let t = 0; this.cineLock = true; this.state = 'intro'; UI.letterbox(true); UI.title(o.title, o.sub, o.meta);
    this.cine = {
      hideVM: true, hideBody: true,
      update: dt => {
        t += dt; const p = M4.pos(pl.m); const f = M4.dir(pl.m, 0, 0, -1), r = M4.dir(pl.m, 1, 0, 0);
        let eye, tgt;
        if (t < 4.2) { const k = t / 4.2; eye = V.add(p, V.add(V.add(V.sc(r, lerp(-38, -24, k)), [0, lerp(-6, 4, k), 0]), V.sc(f, lerp(30, -10, k)))); tgt = V.add(p, V.sc(f, 6)); }
        else { const k = (t - 4.2) / 4; eye = V.add(p, V.add(V.add(V.sc(f, lerp(-40, -55, k)), V.sc(r, 10)), [0, lerp(14, 22, k), 0])); tgt = V.add(p, V.sc(f, -4)); }
        P.camOverride = this.camLook(eye, tgt);
        if (pl.sound) pl.sound.set(.85, 1.2, p);
        if (t > 7.6 && !this.cine._f) { this.cine._f = 1; UI.fade(1, .5); }
        if (t > 8.3) {
          this.cine = null; P.camOverride = null; this.cineLock = false; UI.letterbox(false); UI.fade(0, .8);
          P.state = 'plane'; P.local = [0, .4, -9.6]; P.yaw = Math.PI; P.pitch = -.05; pl.inside = true; this.state = 'play';
          UI.showHUD(true); UI.hint('Walk to the rear ramp. Press [E] at the red button to open it, then jump.'); IN.lock();
        }
      },
    };
  },
  openRamp() { const pl = this.plane; pl.opening = true; pl.btn = 1; AUD.mech('button'); setTimeout(() => { AUD.hydraulic(M4.pos(pl.m), 4.5); for (let i = 0; i < 3; i++) setTimeout(() => AUD.beep(700, .25, .25), i * 600); }, 250); this.complete('jump0'); UI.hint('Ramp opening. Jump out, then press [SPACE] to deploy your parachute.'); },
  updatePlaneObj(dt) {
    const pl = this.plane; pl.ang += pl.w * dt; const c = pl.center;
    const pos = [c[0] + Math.cos(pl.ang) * pl.R, pl.alt, c[1] + Math.sin(pl.ang) * pl.R];
    const vx = -Math.sin(pl.ang) * pl.R * pl.w, vz = Math.cos(pl.ang) * pl.R * pl.w; pl.vel = [vx, 0, vz]; pl.yaw = Math.atan2(-vx, -vz);
    const m = pl.m; M4.ident(m); M4.translate(m, m, pos[0], pos[1] + Math.sin(this.time * .7) * .4, pos[2]); M4.rotY(m, m, pl.yaw); M4.rotZ(m, m, .1 + Math.sin(this.time * .5) * .015); M4.rotX(m, m, Math.sin(this.time * .9) * .006);
    if (pl.opening) { pl.ramp = Math.min(1, pl.ramp + dt / 4.5); }
    pl.rampAng = lerp(-.55, .12, smooth(pl.ramp));
    const b = pl.bones, t = M4.create(); b.set(m, 0);
    M4.translate(t, m, 0, .3, 9); M4.rotX(t, t, pl.rampAng); b.set(t, PLB.RAMP * 16);
    M4.translate(t, m, 0, 3.95 + smooth(pl.ramp) * .7, 9.4 + smooth(pl.ramp) * 1.8); M4.rotX(t, t, -.35 - smooth(pl.ramp) * .2); b.set(t, PLB.DOOR * 16);
    const xs = [-13, -7, 7, 13]; for (let i = 0; i < 4; i++) { M4.translate(t, m, xs[i], 4.35, -6.25); M4.rotZ(t, t, this.time * 28 + i); b.set(t, (PLB.P0 + i) * 16); }
    pl.btn = Math.max(0, pl.btn - dt * 3); M4.translate(t, m, -1.66 + pl.btn * .03, 1.55, 7.6); b.set(t, PLB.BTN * 16);
    const inside = P.state === 'plane';
    if (pl.sound) pl.sound.set(.85, inside ? .9 + pl.ramp * .4 : 1.2, inside ? P.camPos : M4.pos(m));
    if (inside) {
      this.dlights.push({ pos: M4.pt(m, 0, 3.4, -4), col: [1, .12, .08], i: 2.2, range: 11, life: dt * 1.5 + .001 }, { pos: M4.pt(m, 0, 3.4, 4), col: [1, .12, .08], i: 2.2, range: 11, life: dt * 1.5 + .001 });
      if (pl.ramp > .95) this.dlights.push({ pos: M4.pt(m, 1.7, 2.5, 7.4), col: [.2, 1, .3], i: 1.5, range: 5, life: dt * 1.5 + .001 });
      if (this.windLoop) this.windLoop.set(.6, pl.ramp * .5);
    }
    if (!inside && P.state !== 'plane' && this.time > 40 && V.dist(P.pos, M4.pos(m)) > 1500) { pl.sound && pl.sound.stop(); this.plane = null; }
  },
  // ---------------- boat insertion ----------------
  introBoat(o) {
    const bm = buildBoat('rib'); const boat = this.boat = { mesh: bm.mesh, bones: new Float32Array(2 * 16), m: M4.create(), path: o.path, t: 0, speed: o.speed || 9, pos: [o.path[0][0], this.W.waterY, o.path[0][1]], yaw: 0, done: false };
    const op = new Rig(buildCharacter(appearanceFor('pmc', this.rng, { head: 'helmet', shirt: 0x2a3024, pants: 0x2a3024, vestCol: 0x2f3328, helmetCol: 0x2f3328, camo: true })));
    this.extras.push({ mesh: bm.mesh, bones: boat.bones, pos: boat.pos, r: 6 }, { mesh: op.mesh, bones: op.bones, pos: boat.pos, r: 3 });
    boat.op = op; boat.sound = AUD.engineLoop('boat', boat.pos);
    // arc length param
    const segs = []; let tot = 0; for (let i = 0; i < o.path.length - 1; i++) { const a = o.path[i], b = o.path[i + 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push([a, b, L, tot]); tot += L; } boat.segs = segs; boat.len = tot;
    const at = s => { s = clamp(s, 0, tot - .01); for (const sg of segs) if (s <= sg[3] + sg[2]) { const k = (s - sg[3]) / sg[2]; return [lerp(sg[0][0], sg[1][0], k), lerp(sg[0][1], sg[1][1], k), Math.atan2(-(sg[1][0] - sg[0][0]), -(sg[1][1] - sg[0][1]))]; } return [0, 0, 0]; };
    boat.at = at;
    this.W.interact.push({ r: 3, wide: true, pos: o.ladder, label: () => P.state === 'boatride' && boat.done ? '[E] CLIMB ONTO THE PIER' : '', anim: 'reach', dur: .9, at: .5, act: () => { UI.fade(1, .25); setTimeout(() => { P.state = 'ground'; P.pos = V.copy(o.top); P.vel = [0, 0, 0]; P.yaw = o.topYaw; P.pitch = 0; P.camOverride = null; UI.fade(0, .5); boat.leaving = true; AUD.step('metal', null, .5); UI.hint('Infiltrate the harbor. Your radio intercept is live — enemy chatter will be transcribed.'); this.complete('insert'); }, 300); } });
    let t = 0; this.state = 'intro'; this.cineLock = true; UI.letterbox(true); UI.title(o.title, o.sub, o.meta);
    this.cine = {
      hideVM: true, hideBody: true,
      update: dt => {
        t += dt; this.updateBoatObj(dt);
        const p = boat.pos, f = [-Math.sin(boat.yaw), 0, -Math.cos(boat.yaw)], r = [Math.cos(boat.yaw), 0, -Math.sin(boat.yaw)];
        if (t < 7) { const k = t / 7; const eye = V.add(p, V.add(V.add(V.sc(f, lerp(-14, -6, k)), V.sc(r, lerp(-8, 6, k))), [0, lerp(1.2, 3.5, k), 0])); P.camOverride = this.camLook(eye, V.add(p, [0, .8, 0])); }
        if (t > 6.6 && !this.cine._f) { this.cine._f = 1; UI.fade(1, .4); }
        if (t > 7.1) { this.cine = { update: dt2 => this.updateBoatObj(dt2) }; this.cineLock = false; UI.letterbox(false); UI.fade(0, .6); P.state = 'boatride'; P.yaw = 0; P.pitch = 0; this.state = 'play'; P.camOverride = null; IN.lock(); UI.showHUD(true); UI.hint('Approaching the harbor. Look around. Press [E] at the ladder when the boat stops.'); }
      },
    };
  },
  updateBoatObj(dt) {
    const b = this.boat; if (!b) return; const W = this.W;
    if (b.leaving) { b.t -= b.speed * 1.4 * dt; b.away = (b.away || 0) + dt; if (b.away > 20) { b.sound && b.sound.stop(); this.boat = null; this.extras = this.extras.filter(e => e.pos !== b.pos); return; } }
    else if (!b.done) { b.t += b.speed * dt * smooth(clamp((b.len - b.t) / 12, .08, 1) + .0); if (b.t >= b.len - .3) { b.done = true; } }
    const [x, z, yaw] = b.at(b.t); b.pos[0] = x; b.pos[2] = z; b.pos[1] = W.waterY + Math.sin(this.time * 1.8) * .06; b.yaw = b.leaving ? yaw + Math.PI : yaw;
    const m = b.m; M4.ident(m); M4.translate(m, m, b.pos[0], b.pos[1], b.pos[2]); M4.rotY(m, m, b.yaw); M4.rotX(m, m, Math.sin(this.time * 1.3) * .03 - (b.done ? 0 : .05)); M4.rotZ(m, m, Math.sin(this.time * 1.1) * .03);
    b.bones.set(m, 0); const pm = M4.create(); M4.translate(pm, m, 0, .1, 2.7); M4.rotZ(pm, pm, this.time * 40); b.bones.set(pm, 16);
    if (!b.done || b.leaving) { if (Math.random() < .6) this.particles.push({ p: M4.pt(m, rnd(-.8, .8), .1, 2.5), v: [rnd(-1, 1), rnd(.5, 1.5), rnd(-1, 1)], life: 0, max: 1, s: .15, grow: .8, c: [.8, .85, .85], a: .5, g: 4 }); }
    if (b.sound) b.sound.set(b.done && !b.leaving ? .15 : .7, .9, b.pos);
    // operator seated at the tiller
    const op = b.op; const j = P_(); poseSit(j, this.time, 1, false); pj(j, SK.UAR, .6, 0, .2); pj(j, SK.FAR, .9, 0, 0); op.tj.set(j); op.tpy = -.55; op.blend(10, dt);
    M4.copy(op.root, m); M4.translate(op.root, op.root, 0, .35, 2.1); op.solve(null, false);
    if (P.state === 'boatride') { const cm = M4.create(); M4.mul(cm, cm, m); M4.translate(cm, cm, -.3, 1.15, .6); M4.rotY(cm, cm, clamp(P.yaw, -2.2, 2.2)); M4.rotX(cm, cm, P.pitch); P.camOverride = cm; P.pos = M4.pos(m); }
  },
  // ---------------- helicopter insertion ----------------
  introHeli(o) {
    const h = this.heli = { mesh: buildHeli(o.color), bones: new Float32Array(4 * 16), m: M4.create(), pos: V.copy(o.from), yaw: 0, t: 0, phase: 'fly', rotor: 1, door: 1 };
    this.extras.push({ mesh: h.mesh, bones: h.bones, pos: h.pos, r: 10 }); h.sound = AUD.engineLoop('heli', h.pos);
    h.to = o.to; h.toY = o.toY;
    this.W.interact.push({ r: 4, wide: true, pos: () => M4.pt(h.m, 1.1, 1.2, .4), label: () => P.state === 'heliride' && h.phase === 'hover' ? '[E] JUMP OUT' : '', anim: 'reach', dur: .6, at: .4, act: () => { const p = M4.pt(h.m, 2.2, .5, .4); P.state = 'ground'; P.pos = p; P.vel = [Math.cos(h.yaw) * 2, 0, -Math.sin(h.yaw) * 2]; P.onGround = false; P.camOverride = null; P.yaw = h.yaw - Math.PI / 2; h.phase = 'leave'; this.complete('insert'); UI.hint('Move out. Watch your exposure in the open snow.'); } });
    let t = 0; this.state = 'intro'; this.cineLock = true; UI.letterbox(true); UI.title(o.title, o.sub, o.meta);
    this.cine = {
      hideVM: true, hideBody: true,
      update: dt => {
        t += dt; this.updateHeliObj(dt); const p = h.pos; const f = [-Math.sin(h.yaw), 0, -Math.cos(h.yaw)], r = [Math.cos(h.yaw), 0, -Math.sin(h.yaw)];
        const k = t / 7; const eye = V.add(p, V.add(V.add(V.sc(f, lerp(25, -5, k)), V.sc(r, lerp(-18, -22, k))), [0, lerp(-4, 6, k), 0])); P.camOverride = this.camLook(eye, V.add(p, [0, 1.5, 0]));
        if (t > 6.6 && !this.cine._f) { this.cine._f = 1; UI.fade(1, .4); }
        if (t > 7.1) { this.cine = { update: dt2 => this.updateHeliObj(dt2) }; this.cineLock = false; UI.letterbox(false); UI.fade(0, .6); P.state = 'heliride'; P.yaw = -Math.PI / 2; P.pitch = -.1; this.state = 'play'; IN.lock(); UI.showHUD(true); UI.hint('Inbound to the drop zone. Press [E] to jump out when the helicopter hovers.'); }
      },
    };
  },
  updateHeliObj(dt) {
    const h = this.heli; if (!h) return; h.t += dt;
    if (h.phase === 'fly') { const to = [h.to[0], h.toY, h.to[1]]; const d = V.sub(to, h.pos); const L = V.len(d); const sp = Math.min(32, L * .5 + 2); if (L < 1.2) h.phase = 'hover'; else { h.pos[0] += d[0] / L * sp * dt; h.pos[1] += d[1] / L * sp * dt; h.pos[2] += d[2] / L * sp * dt; h.yaw = dampAng(h.yaw, Math.atan2(-d[0], -d[2]), 1.5, dt); h.tilt = damp(h.tilt || 0, -sp * .007, 2, dt); } }
    else if (h.phase === 'hover') { h.tilt = damp(h.tilt || 0, 0, 2, dt); h.pos[1] += Math.sin(this.time * 1.3) * .004; }
    else if (h.phase === 'leave') { h.lt = (h.lt || 0) + dt; h.pos[1] += dt * Math.min(12, h.lt * 4); const f = [-Math.sin(h.yaw), 0, -Math.cos(h.yaw)]; h.pos[0] += f[0] * Math.min(40, h.lt * 6) * dt; h.pos[2] += f[2] * Math.min(40, h.lt * 6) * dt; h.tilt = damp(h.tilt || 0, -.2, 1, dt); if (h.lt > 25) { h.sound && h.sound.stop(); this.heli = null; this.extras = this.extras.filter(e => e.pos !== h.pos); return; } }
    this.heliBones(h);
    if (h.sound) h.sound.set(h.rotor, P.state === 'heliride' ? 1 : 1.4, h.pos);
    // rotor downwash snow/dust when low
    const gy = this.W.th(h.pos[0], h.pos[2]); if (h.pos[1] - gy < 14 && Math.random() < .8) { const a = Math.random() * TAU; const p = [h.pos[0] + Math.cos(a) * 6, gy + .2, h.pos[2] + Math.sin(a) * 6]; this.particles.push({ p, v: [Math.cos(a) * 6, rnd(.5, 2), Math.sin(a) * 6], life: 0, max: 1.6, s: .6, grow: 1.5, c: this.env.snow ? [.85, .88, .92] : [.4, .38, .3], a: .35, drag: 1.2 }); }
    if (P.state === 'heliride') { const cm = M4.create(); M4.mul(cm, cm, h.m); M4.translate(cm, cm, .45, 1.65, .6); M4.rotY(cm, cm, clamp(P.yaw, -2.6, .4)); M4.rotX(cm, cm, P.pitch); P.camOverride = cm; P.pos = M4.pos(cm); P.pos[1] -= 1.6; }
  },
  heliBones(h) {
    const m = h.m; M4.ident(m); M4.translate(m, m, h.pos[0], h.pos[1], h.pos[2]); M4.rotY(m, m, h.yaw); M4.rotX(m, m, h.tilt || 0);
    const b = h.bones, t = M4.create(); b.set(m, 0); M4.translate(t, m, 0, 3.3, .1); M4.rotY(t, t, this.time * 18 * h.rotor); b.set(t, 16);
    M4.translate(t, m, .25, 3, 8.2); M4.rotX(t, t, this.time * 40 * h.rotor); b.set(t, 32); M4.translate(t, m, 1.05, 1.4, -.3 + h.door * 1.3); b.set(t, 48);
  },
  /* ---------------- extraction ---------------- */
  spawnExtractHeli(pos, yaw) {
    const h = { mesh: buildHeli(0x2b3328), bones: new Float32Array(4 * 16), m: M4.create(), pos: [pos[0], this.W.ground(pos[0], pos[1], 50, 100) + .05, pos[1]], yaw, rotor: .25, door: 1, t: 0 };
    this.heliBones(h); this.extras.push({ mesh: h.mesh, bones: h.bones, pos: h.pos, r: 10 }); this.exHeli = h;
    const pilot = new Rig(buildCharacter(appearanceFor('pmc', this.rng, { head: 'helmet', shirt: 0x3a4030, camo: false, helmetCol: 0x3a4030 }))); h.pilot = pilot; this.extras.push({ mesh: pilot.mesh, bones: pilot.bones, pos: h.pos, r: 3 });
    this.W.colBox(h.pos[0], h.pos[1] + 1.6, h.pos[2], 2.4, 3, 2.4, { surf: 'metal' });
    this.W.interact.push({ r: 3.5, wide: true, pos: () => M4.pt(h.m, 1.1, 1.3, .3), label: () => P.state !== 'ground' ? '' : this.M.canExtract(this) ? '[E] BOARD EXTRACTION HELICOPTER' : 'EXTRACTION — COMPLETE PRIMARY OBJECTIVE FIRST', anim: 'reach', dur: .7, at: .45, act: () => { if (this.M.canExtract(this)) this.extractHeli(h); } });
    this.heliIdle = dt => { h.t += dt; this.heliBones(h); const j = P_(); poseSit(j, this.time, 3, false); pj(j, SK.UAL, .7, 0, -.1); pj(j, SK.FAL, .9, 0, 0); pj(j, SK.UAR, .7, 0, .1); pj(j, SK.FAR, .9, 0, 0); pilot.tj.set(j); pilot.tpy = -.45; pilot.blend(10, dt); M4.copy(pilot.root, h.m); M4.translate(pilot.root, pilot.root, .45, .75, -2.2); pilot.solve(null, false); if (!h.sound && AUD.ready && this.state !== 'briefing') h.sound = AUD.engineLoop('heli', h.pos); h.sound && h.sound.set(h.rotor, .35 + h.rotor * .8, h.pos); };
    this.extraUpdaters.push(dt => this.heliIdle(dt));
    return h;
  },
  beginOutro(build) { this.state = 'cine'; this.cineLock = true; UI.letterbox(true); UI.showHUD(false); IN.unlock(); this.noPauseOnUnlock = true; if (this.siren) { this.siren.stop(); this.siren = null; } this.cine = build(); },
  extractHeli(h) {
    let t = 0; P.ads = 0; this.complete('extract');
    this.beginOutro(() => ({
      hideVM: true, hideBody: true,
      update: dt => {
        t += dt; h.rotor = Math.min(1.1, .25 + t * .35);
        if (t > 3) { const k = t - 3; h.pos[1] += dt * Math.min(9, k * 2.5); if (k > 2.5) { const f = [-Math.sin(h.yaw), 0, -Math.cos(h.yaw)]; const sp = Math.min(45, (k - 2.5) * 9); h.pos[0] += f[0] * sp * dt; h.pos[2] += f[2] * sp * dt; } }
        if (t < 3) { const cm = M4.create(); M4.mul(cm, cm, h.m); M4.translate(cm, cm, .5, 1.7, .9); M4.rotY(cm, cm, -1.3 + Math.sin(t * .5) * .2); M4.rotX(cm, cm, -.1); P.camOverride = cm; }
        else { const c = [h.pos[0] + 28, this.W.th(h.pos[0], h.pos[2]) + 6, h.pos[2] + 24]; P.camOverride = this.camLook(c, V.add(h.pos, [0, 2, 0])); }
        if (t > 3 && Math.random() < .9) { const a = Math.random() * TAU; const gy = this.W.th(h.pos[0], h.pos[2]); if (h.pos[1] - gy < 20) this.particles.push({ p: [h.pos[0] + Math.cos(a) * 5, Math.max(gy, this.W.waterY) + .2, h.pos[2] + Math.sin(a) * 5], v: [Math.cos(a) * 7, 1, Math.sin(a) * 7], life: 0, max: 1.5, s: .7, grow: 1.4, c: [.45, .45, .38], a: .3, drag: 1 }); }
        if (t > 11.5 && !this._outF) { this._outF = 1; UI.fade(1, .8); }
        if (t > 12.5) this.missionComplete();
      },
    }));
  },
  extractBoat(b, o) {
    this.complete('extract'); let t = 0; const start = V.copy(b.pos);
    this.beginOutro(() => ({
      hideVM: true, hideBody: true,
      update: dt => {
        t += dt; const sp = Math.min(26, Math.max(0, t - 1.2) * 6); const f = [-Math.sin(b.yaw), 0, -Math.cos(b.yaw)];
        b.pos[0] += f[0] * sp * dt; b.pos[2] += f[2] * sp * dt; b.yaw += Math.sin(t * .4) * .1 * dt; b.update(dt, sp);
        if (sp > 3) for (let i = 0; i < 3; i++) this.particles.push({ p: M4.pt(b.m, rnd(-1, 1), .2, 3.4), v: [rnd(-2, 2), rnd(.5, 2.5), rnd(-2, 2)], life: 0, max: 1.4, s: .25, grow: 1.2, c: [.85, .88, .9], a: .5, g: 4 });
        if (t < 3) { const cm = M4.create(); M4.mul(cm, cm, b.m); M4.translate(cm, cm, .4, 1.9, 2.2); M4.rotY(cm, cm, .3 * Math.sin(t)); P.camOverride = cm; }
        else { const c = V.add(start, [o.camOff[0], 4, o.camOff[1]]); P.camOverride = this.camLook(c, V.add(b.pos, [0, 1, 0])); }
        if (t > 10 && !this._outF) { this._outF = 1; UI.fade(1, .8); }
        if (t > 11) this.missionComplete();
      },
    }));
  },
  extractTruck(v, path) {
    this.complete('extract'); let t = 0, s = 0; const pts = path; v.engine = true; if (!v.sound) v.sound = AUD.engineLoop('car', v.pos);
    this.beginOutro(() => ({
      hideVM: true, hideBody: true,
      update: dt => {
        t += dt; const sp = Math.min(14, Math.max(0, t - 1.5) * 4); s += sp * dt;
        let acc = 0, i = 0; while (i < pts.length - 2 && acc + Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) < s) { acc += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); i++; }
        const a = pts[i], b = pts[i + 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const k = clamp((s - acc) / L, 0, 1);
        v.pos[0] = lerp(a[0], b[0], k); v.pos[2] = lerp(a[1], b[1], k); v.pos[1] = damp(v.pos[1], this.groundUnder(v), 8, dt); v.yaw = dampAng(v.yaw, Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])), 3, dt); v.wheelRot += sp / v.def.wr * dt; v.speed = sp;
        v.col.on = false; this.vehicleBones(v); v.sound.set(.2 + sp / 20, .9, v.pos);
        if (t < 3.2) { const cm = M4.create(); M4.mul(cm, cm, v.m); M4.translate(cm, cm, 0, 2.1, v.def.L * .45); M4.rotY(cm, cm, Math.PI + Math.sin(t * .6) * .3); M4.rotX(cm, cm, -.12); P.camOverride = cm; }
        else { const c = [pts[0][0] + 12, this.W.th(pts[0][0], pts[0][1]) + 7, pts[0][1] + 10]; P.camOverride = this.camLook(c, V.add(v.pos, [0, 1.5, 0])); }
        if (t > 11 && !this._outF) { this._outF = 1; UI.fade(1, .8); }
        if (t > 12) this.missionComplete();
      },
    }));
  },
  missionComplete() {
    if (this.state === 'result') return; this.state = 'result'; this.cine = null; UI.letterbox(false);
    const s = this.stats; const M = this.M; const time = this.missionTime;
    const opt = this.objectives.filter(o => o.type === 'optional'); const optDone = opt.filter(o => o.done || (o.check && o.check(this))).length;
    for (const o of opt) if (o.check && o.check(this)) o.done = true;
    const acc = s.shots ? s.hits / s.shots : 0;
    let pts = 1000; if (s.detected) pts -= 280; if (s.alarms) pts -= 180; pts -= s.bodies * 40; pts += optDone * 120; pts -= Math.max(0, time - M.parTime) * .6; pts -= s.damage * .8; pts += s.takedowns * 15; if (acc > .5) pts += 60;
    const rating = pts >= 1100 ? 'S' : pts >= 900 ? 'A' : pts >= 700 ? 'B' : pts >= 450 ? 'C' : 'D';
    const ghost = !s.detected && !s.alarms && s.bodies === 0;
    const status = ghost ? 'GHOST — UNDETECTED' : !s.detected ? 'SHADOW — NEVER SPOTTED' : s.alarms ? 'COMPROMISED — ALARM RAISED' : 'DETECTED';
    const C = this.career; C.missions++; C.kills += s.kills; C.headshots += s.headshots; C.takedowns += s.takedowns; C.shots += s.shots; C.hits += s.hits; if (s.detected) C.detected++; if (ghost) C.ghosts++;
    C.playtime += time; C.completed[M.id] = (C.completed[M.id] || 0) + 1; if (!C.best[M.id] || time < C.best[M.id]) C.best[M.id] = time;
    const ord = 'SABCD'; if (!C.ratings[M.id] || ord.indexOf(rating) < ord.indexOf(C.ratings[M.id])) C.ratings[M.id] = rating; this.saveCareer();
    AUD.stopAllLoops(); this.noPauseOnUnlock = false;
    UI.results({ M, s, time, rating, status, acc, objectives: this.objectives, ghost });
  },
});
