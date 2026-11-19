/* =====================================================================
   AI — NPC perception, routines, communication, investigation, search,
   combat with cover, bodies, takedowns, conversations, security cameras.
   ===================================================================== */
const NPCW = {
  ak: { dmg: 11, rpm: 560, mag: 30, acc: .42, range: 70, snd: 'npcRifle', gr: [0, -.07, .04], gl: [0, .0, -.36], burst: [3, 6] },
  rifle: { dmg: 12, rpm: 620, mag: 30, acc: .5, range: 80, snd: 'npcRifle', gr: [0, -.07, .03], gl: [0, .01, -.36], burst: [3, 5] },
  rifleL: { dmg: 12, rpm: 620, mag: 30, acc: .55, range: 85, snd: 'npcRifle', gr: [0, -.07, .03], gl: [0, .01, -.36], burst: [2, 5] },
  shotgun: { dmg: 30, rpm: 75, mag: 6, acc: .62, range: 20, snd: 'shotgun', gr: [0, -.07, .06], gl: [0, .0, -.42], burst: [1, 1] },
  smg: { dmg: 8, rpm: 800, mag: 25, acc: .4, range: 35, snd: 'npcRifle', gr: [0, -.06, .03], gl: [0, -.06, -.1], burst: [4, 8] },
  pistol: { dmg: 13, rpm: 220, mag: 12, acc: .45, range: 30, snd: 'npcPistol', gr: [0, -.04, 0], gl: [-.02, -.05, .01], burst: [2, 3] },
};
const NAMES = {
  female: ['Elena', 'Sofia', 'Clara', 'Isabel', 'Margot', 'Vera', 'Anna', 'Lucia', 'Natalie', 'Camille', 'Irina', 'Maya', 'Helena', 'Julia', 'Rosa', 'Nadia'],
  security: ['Mason', 'Grant', 'Doyle', 'Reyes', 'Fischer', 'Klein', 'Hart', 'Moreau', 'Stone', 'Vance', 'Byrne', 'Quinn'],
  civ: ['Lord Ashby', 'Mr. Delacroix', 'Mr. Hale', 'Sir Whitmore', 'Mr. Okafor', 'Mr. Lindqvist', 'Mr. Bellini', 'Mr. Tanaka', 'Mr. Rousseau', 'Mr. Kessling', 'Mr. Varga', 'Mr. Albright'],
  staff: ['Pierre', 'Tomas', 'Henri', 'Luca', 'Ben', 'Marcel', 'Oskar', 'Jules'],
  bank: ['Mr. Patel', 'Mr. Cole', 'Mr. Novak', 'Mr. Brooks', 'Mr. Ruiz', 'Mr. Weber', 'Mr. Chen', 'Mr. Adams'],
  robber: ['Fox', 'Wolf', 'Crow', 'Dog', 'Snake', 'Bear', 'Hawk', 'Rat', 'Moth', 'Jackal'],
  cartel: ['Marco', 'Diego', 'Luis', 'Raúl', 'Chuy', 'Beto', 'Tito', 'Nacho', 'Pablo', 'Rico', 'Hector', 'Memo', 'Javi', 'Toño', 'Cruz', 'Lalo', 'Rafa', 'Pepe', 'Gordo', 'Flaco', 'Mateo', 'Santos'],
  pmc: ['Kessler', 'Brandt', 'Novak', 'Hayes', 'Riggs', 'Volkov', 'Mercer', 'Dawson', 'Kovac', 'Sloane', 'Pryce', 'Crane', 'Holt', 'Wade', 'Becker', 'Lund', 'Fisk', 'Ortega'],
  militia: ['Dmitri', 'Arkady', 'Yuri', 'Pavel', 'Oleg', 'Grisha', 'Lev', 'Bogdan', 'Ivan', 'Kostya', 'Misha', 'Roman', 'Sasha', 'Timur', 'Vadim', 'Egor', 'Fyodor', 'Stas'],
};
const LINES = {
  susp: ["Huh? Who's there?", "Did you hear that?", "Something moved over there...", "Hello? Anybody?", "What was that?", "Hm. Thought I saw something."],
  inv: ["I'll check it out.", "Going to take a look.", "Stay here, I'll go see.", "Probably nothing, but I'll look."],
  giveup: ["Must've been an animal.", "Nothing here.", "Damn wind. Nothing.", "I'm getting jumpy.", "All clear... I think."],
  spot: ["Contact! Intruder!", "There! Open fire!", "I see him! Over there!", "Hostile! Light him up!", "We've got company!"],
  alarmRadio: ["All units, intruder in the compound! Weapons free!", "Base, we have a hostile! Everyone move!", "Alarm! Alarm! Shooter on site!"],
  body: ["Man down! We've got a body!", "Someone killed him! Raise the alarm!", "Body here! There's a killer loose!"],
  search: ["Spread out, find him!", "Check every corner.", "He can't have gone far.", "Eyes open. He's still here.", "Search the buildings!"],
  lost: ["Where did he go?", "Lost him!", "I can't see him!", "He's hiding somewhere."],
  reload: ["Reloading!", "Cover me, reloading!", "Changing mag!"],
  hurt: ["Agh!", "I'm hit!", "Damn it!", "Argh, medic!"],
  missing: ["Hey... where did {n} go?", "{n}? You there?", "Has anyone seen {n}?"],
  shot: ["Gunshots! Where's that coming from?", "Was that a shot?!", "Shots fired!"],
  calmdown: ["Stand down... but stay sharp.", "Back to your posts. Keep your eyes open.", "Alright. Nobody sleeps tonight."],
  vehicle: ["Who's driving that?!", "Hey! Who started the truck?"],
  smoke: ["Smoke! Can't see a thing!"],
  gadget: ["What is that beeping?", "There's something over there..."],
  camera: ["Camera picked up movement!"],
};
const vpick = (k, n) => pick(LINES[k]).replace('{n}', n || '');

class NPC {
  constructor(def, rng) {
    this.def = def; this.id = def.id || ('npc' + Math.random().toString(36).slice(2, 7)); this.faction = def.faction || 'cartel';
    this.role = def.role || 'guard'; this.civ = def.civ !== undefined ? def.civ : !!(FACTIONS[this.faction] && FACTIONS[this.faction].civ);
    const DW = { cartel: ['ak', 'ak', 'shotgun', 'smg', 'pistol'], pmc: ['rifle', 'rifle', 'rifleL', 'smg'], militia: ['ak', 'rifle', 'ak', 'shotgun'], security: ['pistol', 'smg', 'pistol'], robber: ['ak', 'shotgun', 'smg', 'rifle', 'pistol'] };
    const wt = def.weapon || (this.civ ? 'none' : pick(DW[this.faction] || DW.cartel));
    this.wt = wt; this.W = NPCW[wt];
    const app = appearanceFor(this.faction, rng, def.app || {}); app.weapon = wt === 'none' ? null : wt; app.prop = def.prop || null;
    const nl = NAMES[this.faction] || NAMES.cartel; this.name = def.name || (app.female && NAMES.female ? pick(NAMES.female) : pick(nl));
    this.app = app; this.rig = new Rig(buildCharacter(app)); this.rig.sc = app.height || 1; this.hasProp = !!app.prop;
    this.pos = [def.pos[0], 0, def.pos[1]]; this.yaw = def.yaw || 0; this.vel = [0, 0, 0];
    this.hp = def.hp || 100; this.armor = app.vest ? .3 : 0; if (app.head === 'helmet') this.helmet = true;
    this.state = 'calm'; this.susp = 0; this.suspPt = null; this.stT = 0; this.lastKnown = null; this.lastSeen = -99; this.canSee = false;
    this.routine = def.routine || [{ t: 'guard', pos: def.pos, yaw: def.yaw || 0 }]; this.ri = 0; this.rt = 0; this.taskPhase = 'go';
    this.path = null; this.pi = 0; this.repath = 0; this.speed = 0; this.moveTarget = null;
    this.anim = 'idle'; this.ph = Math.random() * 10; this.k = Math.random() * 10; this.aimPitch = 0; this.headYaw = 0; this.crouch = 0;
    this.mag = this.W ? this.W.mag : 0; this.fireCd = 0; this.burst = 0; this.burstPause = 0; this.reloadT = 0;
    this.percT = Math.random() * .2; this.voice = (this.faction === 'pmc' ? 85 : 95) + rng() * 45; this.sayCd = 0; this.dead = false; this.deathT = 0; this.fallDir = 1;
    this.alerted = false; this.group = def.group || null; this.post = def.post || null; this.searched = false; this.discovered = false; this.loot = def.loot || null;
    this.weaponMode = this.role === 'worker' || this.role === 'commander' ? 'sling' : 'low'; this.wmLocal = M4.create(); this.cover = null; this.coverT = 0; this.peek = 0;
    this.hitFlash = 0; this.flinch = 0; this.visible = true; this.tdT = -1; this.flashlight = def.flashlight || false; this.seat = null;
    this.searchPts = null; this.searchI = 0; this.r = 1.2;
  }
  get eye() { return [this.pos[0], this.pos[1] + (this.crouch > .5 ? 1.1 : 1.65) - (this.anim === 'sit' ? .45 : 0), this.pos[2]]; }
  get fwd() { return [-Math.sin(this.yaw), 0, -Math.cos(this.yaw)]; }
  say(key, n, radio) { if (this.sayCd > 0 || this.dead) return; const line = typeof key === 'string' && LINES[key] ? vpick(key, n) : key; this.sayCd = 2.5; G.speak(this, line, radio); }
  task() { return this.routine[this.ri % this.routine.length]; }
  /* ---------------- perception ---------------- */
  perceive(dt) {
    if (P.state === 'dead' || G.cineLock) return;
    const pe = P.state === 'vehicle' && P.vehicle ? V.add(P.vehicle.pos, [0, 1.3, 0]) : P.eye(); const pc = [pe[0], pe[1] - .45, pe[2]];
    const e = this.eye; const d = V.dist(e, pc);
    const alertLvl = this.state === 'combat' || this.state === 'search' || G.alarm > 0;
    const night = G.env.night || 0;
    let maxD = lerp(46, 28, night) * (alertLvl ? 1.35 : 1); if (P.state === 'vehicle') maxD *= 1.4; if (P.crouch > .5 && P.state === 'ground') maxD *= .72;
    this.canSee = false; let rate = 0;
    if (d < maxD && P.state !== 'plane' && P.state !== 'fall' && P.state !== 'chute' && P.state !== 'truckride' && P.state !== 'boatride' && P.state !== 'heliride' || (P.state === 'chute' && d < maxD * 1.4)) {
      const to = V.sc(V.sub(pc, e), 1 / d); const look = this.yaw + this.headYaw; const f = [-Math.sin(look), 0, -Math.cos(look)];
      const flat = Math.hypot(to[0], to[2]) || 1; const cosA = (to[0] * f[0] + to[2] * f[2]) / flat; const ang = Math.acos(clamp(cosA, -1, 1));
      const half = alertLvl ? 1.25 : this.anim === 'sit' || this.anim === 'work' ? .8 : 1.05;
      if (ang < half || d < 2.2) {
        if (G.W.los(e, pc) || G.W.los(e, pe)) {
          const fol = G.W.foliage(e, pc) + G.smokeBlock(e, pc);
          if (fol < .95) {
            this.canSee = true;
            let vis = P.visibility; if (this.flashlight && ang < .35 && d < 22) vis = Math.max(vis, .85);
            const distF = Math.pow(clamp(1 - d / maxD, 0, 1), 1.1);
            const cr = P.crouch > .5; const stance = cr ? .3 : 1; const motion = P.speed < .3 ? (cr ? .35 : .55) : P.sprinting ? 1.5 : cr ? .7 : 1;
            const periph = ang > .6 ? .45 : 1;
            const shade = cr ? Math.pow(vis, 1.6) : vis; const folK = cr ? Math.min(1, fol * 1.6) : fol;
            rate = 2.4 * distF * (.1 + .9 * shade) * stance * motion * periph * (1 - folK) * (alertLvl ? 2.2 : 1) * G.diffMul;
            if (cr && d > maxD * .6 && !alertLvl) rate *= .5;
            if (P.state === 'vehicle') rate *= 1.6; if (d < 3.5) rate += 3; if (P.lastShot > G.time - .5) rate += 1.5;
            rate *= G.socialFactor(this, d); if (P.hostage && P.hostage.n !== this) rate += 4;
          }
        }
      }
    }
    if (this.canSee) {
      this.susp += rate * dt;
      if (this.susp > .32 || this.state === 'combat') { this.suspPt = V.copy(P.pos); }
      if (this.state === 'combat' || this.susp >= 1) { this.lastKnown = V.copy(P.pos); this.lastSeen = G.time; }
    } else if (this.state === 'calm' || this.state === 'suspicious') this.susp = Math.max(0, this.susp - dt * .12);
    if (this.susp >= 1 && this.state !== 'combat') { if (this.civ) { if (this.state !== 'panic' && this.state !== 'cower') this.panic(P.pos, true); } else if (G.socialWarn(this)) { } else this.enterCombat(true); }
    else if (this.susp > .32 && this.state === 'calm' && !this.civ) this.setSuspicious(V.copy(P.pos), true);
    // bodies
    if (this.state !== 'combat') for (const o of G.npcs) {
      if (!o.dead || o.discovered || o === this || o.deathT < 1) continue; const bp = [o.pos[0], o.pos[1] + .3, o.pos[2]]; const dd = V.dist(bp, e); if (dd > 24) continue;
      const to = V.norm(V.sub(bp, e)); const f = this.fwd; if (to[0] * f[0] + to[2] * f[2] < .25 && dd > 3) continue;
      if (!G.W.los(e, bp)) continue;
      o.discovered = true; G.stats.bodies++; G.notify('BODY DISCOVERED', 'warn'); if (this.civ) { this.scream(); this.panic(o.pos, true); break; } this.say('body');
      G.after(() => { if (!this.dead) G.globalSearch(o.pos, this, 'body'); }, 1800);
      this.setState('investigate'); this.suspPt = V.copy(o.pos); this.goTo(o.pos, true); break;
    }
    // missing partner
    if (this.group && this.state === 'calm' && !this.missingChecked) {
      const mates = G.npcs.filter(n => n !== this && n.group === this.group);
      const gone = mates.find(n => n.dead && G.time - n.deathAt > 18 && !n.discovered);
      if (gone && this.task().t === 'talk') { this.missingChecked = true; this.say('missing', gone.name); G.after(() => { if (!this.dead && this.state === 'calm') { this.setSuspicious(V.copy(gone.pos), false); this.suspPt = V.copy(gone.pos); this.setState('investigate'); this.goTo(gone.pos, false); } }, 2500); }
    }
  }
  hear(pos, kind, strength) {
    if (this.dead || this.tdT >= 0 || this.state === 'hostage') return;
    if (this.civ) { if (kind === 'shot' || kind === 'explosion' || (kind === 'glass' && strength > .5)) this.panic(pos, false); return; }
    if (this.state === 'combat') { if (kind === 'shot' || kind === 'shot_s') { if (!this.canSee && G.time - this.lastSeen > 2) this.lastKnown = V.copy(pos); } return; }
    if (kind === 'shot' || kind === 'explosion') {
      if (this.state !== 'search') this.say('shot');
      this.alerted = true; this.weaponMode = 'low';
      if (this.state === 'calm' || this.state === 'suspicious' || this.state === 'investigate') { this.setState('search'); this.lastKnown = V.copy(pos); this.searchPts = null; this.goTo(pos, true); }
      G.raiseSearch(pos);
      return;
    }
    let add = { shot_s: .55, step: .22, land: .3, impact: .4, door: .25, glass: .7, gadget: .75, vehicle: .5, body: .6, knife: .45, melee: .5, crate: .6 }[kind] || .3;
    add *= strength * G.diffMul;
    this.susp = Math.min(.95, this.susp + add);
    if (this.susp > .3 && (this.state === 'calm' || this.state === 'suspicious' || this.state === 'investigate')) {
      if (kind === 'vehicle') this.say('vehicle'); else if (kind === 'gadget') this.say('gadget');
      this.setSuspicious(V.copy(pos), this.state === 'calm');
      if (this.susp > .55 && this.state !== 'investigate') { this.setState('investigate'); this.suspPt = V.copy(pos); this.say('inv'); this.goTo(pos, false); }
      else if (this.state === 'investigate' && (!this.suspPt || V.dist2(this.suspPt, pos) > 3)) { this.suspPt = V.copy(pos); this.goTo(pos, false); }
    }
  }
  setState(s) { if (this.state === 'hostage' && !this._freeing) return; this.state = s; this.stT = 0; if (s === 'combat' || s === 'search') this.weaponMode = s === 'combat' ? 'aim' : 'low'; if (s !== 'calm') { this.seat = null; } }
  setSuspicious(pt, voice) { if (this.state === 'calm') { this.setState('suspicious'); if (voice) this.say('susp'); } this.suspPt = pt; this.path = null; }
  enterCombat(spotted) {
    if (this.civ) { this.panic(P.pos, true); return; }
    const was = this.state; this.setState('combat'); this.susp = 1; this.lastKnown = V.copy(P.pos); this.lastSeen = G.time; this.alerted = true;
    if (spotted) { this.say('spot'); G.stats.detected = true; G.onSpotted(this); }
    G.alertNearby(this, 32);
  }
  goTo(p, run) { if (this.def.static) { this.path = null; return; } if (this.def.direct || (this.curDirect && this.state === 'calm')) { this.moveTarget = [p[0], p[2] ?? p[1]]; this.run = run; this.path = [[this.moveTarget[0], this.moveTarget[1]]]; this.pi = 0; this.repath = 2; return; } G.pathBudget = (G.pathBudget || 0) + 1; this.moveTarget = [p[0], p[2] ?? p[1]]; this.run = run; this.path = G.W.findPath(this.pos[0], this.pos[2], this.moveTarget[0], this.moveTarget[1]); this.pi = 0; this.repath = 2 + Math.random(); }
  arrived(r = .5) { return !this.path || this.pi >= this.path.length; }
  /* ---------------- update ---------------- */
  update(dt) {
    this.sayCd -= dt; this.hitFlash = Math.max(0, this.hitFlash - dt * 4); this.flinch = Math.max(0, this.flinch - dt * 3); this.stT += dt;
    if (this.dead) { this.deathT += dt; return; }
    if (this.tdT >= 0) { this.tdT += dt; return; }
    if (this.state === 'hostage') { this.anim = this.hostAnim || 'held'; return; }
    const distP = V.dist(this.pos, P.pos); this.distP = distP;
    this.percT -= dt; if (this.percT <= 0) { const iv = distP < 40 ? .1 : distP < 90 ? .25 : .6; this.perceive(iv); this.percT = iv; }
    let moveSpeed = 0; let wantYaw = null; let anim = 'idle';
    const S = this.state;
    if (S === 'calm') { const r = this.runRoutine(dt); moveSpeed = r.speed; wantYaw = r.yaw; anim = r.anim; }
    else if (S === 'suspicious') {
      if (this.suspPt) wantYaw = Math.atan2(-(this.suspPt[0] - this.pos[0]), -(this.suspPt[2] - this.pos[2]));
      anim = 'look'; this.weaponMode = this.role === 'worker' ? 'sling' : 'low';
      if (this.stT > 3.5) { if (this.susp > .3) { this.setState('investigate'); this.say('inv'); this.goTo(this.suspPt || this.pos, false); } else this.backToRoutine(); }
    } else if (S === 'investigate') {
      if (!this.arrived()) { moveSpeed = this.run ? 3.4 : 1.6; anim = 'walk'; }
      else { anim = 'look'; if (!this.lookT) this.lookT = 0; this.lookT += dt; if (this.lookT > 6) { this.lookT = 0; this.say('giveup'); this.susp = 0; this.backToRoutine(); } }
      this.weaponMode = 'low';
    } else if (S === 'search') {
      this.weaponMode = 'low';
      if (!this.searchPts) { this.searchPts = []; const c = this.lastKnown || this.pos; for (let i = 0; i < 5; i++) { const a = Math.random() * TAU, r = 4 + Math.random() * 14; this.searchPts.push(G.W.nearestFree(c[0] + Math.cos(a) * r, c[2] + Math.sin(a) * r, 5)); } this.searchI = 0; if (Math.random() < .5) this.say('search'); }
      if (this.arrived()) {
        this.lookT = (this.lookT || 0) + dt; anim = 'look';
        if (this.lookT > 2.5) { this.lookT = 0; const p = this.searchPts[this.searchI++ % this.searchPts.length]; this.goTo([p[0], 0, p[1]], false); }
      } else { moveSpeed = 2.2; anim = 'walk'; }
      if (this.stT > 45 && G.alarm < 2) { this.say('calmdown'); this.susp = 0; this.alerted = true; this.backToRoutine(); }
    } else if (S === 'combat') { const r = this.combat(dt); moveSpeed = r.speed; wantYaw = r.yaw; anim = r.anim; }
    else if (S === 'panic' || S === 'cower' || S === 'warn' || S === 'released') { const r = this.updateSpecial(dt); moveSpeed = r.speed; wantYaw = r.yaw; anim = r.anim; }
    else if (S === 'flee') {
      if (!this.arrived()) { moveSpeed = 4; anim = 'run'; } else { anim = 'crouch'; if (this.canSee) { this.setState('combat'); } }
    }
    // movement along path
    if (moveSpeed > 0 && this.path && this.pi < this.path.length) {
      const tg = this.path[this.pi]; const dx = tg[0] - this.pos[0], dz = tg[1] - this.pos[2]; const dd = Math.hypot(dx, dz);
      if (dd < .45) this.pi++;
      else {
        const ty = Math.atan2(-dx, -dz); if (wantYaw === null || this.state !== 'combat') wantYaw = ty;
        const mv = Math.min(dd, moveSpeed * dt); const nx = this.pos[0] + dx / dd * mv, nz = this.pos[2] + dz / dd * mv;
        const np = [nx, this.pos[1], nz]; G.W.collide(np, .3, 1.7, .5);
        this.checkDoor(dx / dd, dz / dd);
        // separation
        for (const o of G.npcs) { if (o === this || o.dead) continue; const sx = np[0] - o.pos[0], sz = np[2] - o.pos[2]; const sd = Math.hypot(sx, sz); if (sd < .6 && sd > .001) { np[0] += sx / sd * (.6 - sd) * .5; np[2] += sz / sd * (.6 - sd) * .5; } }
        const moved = Math.hypot(np[0] - this.pos[0], np[2] - this.pos[2]); this.speed = moved / dt;
        this.pos[0] = np[0]; this.pos[2] = np[2];
        if (moved < mv * .2) { this.stuck = (this.stuck || 0) + dt; if (this.stuck > 1.2) { this.stuck = 0; this.pi++; if (this.moveTarget) this.goTo([this.moveTarget[0], 0, this.moveTarget[1]], this.run); } } else this.stuck = 0;
        if (anim === 'idle' || anim === 'look') anim = moveSpeed > 3 ? 'run' : 'walk';
      }
    } else this.speed = damp(this.speed, 0, 10, dt);
    if (moveSpeed > 3 && anim === 'walk') anim = 'run';
    this.pos[1] = damp(this.pos[1], G.W.ground(this.pos[0], this.pos[2], this.pos[1] + .05, .27, .12), 14, dt);
    if (wantYaw !== null) this.yaw = dampAng(this.yaw, wantYaw, this.state === 'combat' ? 9 : 5, dt);
    this.anim = anim;
    // footsteps (audio only when close)
    if (this.speed > .5 && this.distP < 25) { this.stepA = (this.stepA || 0) + this.speed * dt; if (this.stepA > 1.4) { this.stepA = 0; AUD.step(G.W.surfAt(this.pos[0], this.pos[2], this.pos[1]), this.pos, this.speed > 3 ? .5 : .3); } }
  }
  checkDoor(dx, dz) {
    for (const d of G.W.doors) {
      if (d.target > .5 || d.locked) continue; const ddx = d.center[0] - this.pos[0], ddz = d.center[2] - this.pos[2]; const dist = Math.hypot(ddx, ddz);
      if (dist < 1.4 && (ddx * dx + ddz * dz) > 0) G.openDoor(d, this.pos, true);
    }
  }
  backToRoutine() { this.setState('calm'); this.weaponMode = this.role === 'worker' || this.role === 'commander' ? 'sling' : 'low'; this.taskPhase = 'go'; this.path = null; this.lookT = 0; this.suspPt = null; this.searchPts = null; }
  runRoutine(dt) {
    const T = this.task(); const res = { speed: 0, yaw: null, anim: 'idle' };
    if (!T) return res;
    if (T.t === 'patrol') {
      if (this.taskPhase === 'go') { this.pIdx = this.pIdx || 0; const p = T.pts[this.pIdx % T.pts.length]; this.curDirect = !!T.direct; this.goTo([p[0], 0, p[1]], false); this.taskPhase = 'walk'; }
      if (this.taskPhase === 'walk') { if (this.arrived()) { this.taskPhase = 'wait'; this.rt = 0; } else { res.speed = T.speed || 1.45; res.anim = 'walk'; } }
      if (this.taskPhase === 'wait') { this.rt += dt; res.anim = T.look ? 'look' : 'idle'; if (this.rt > (T.wait ?? 2)) { this.pIdx++; this.taskPhase = 'go'; if (this.pIdx % T.pts.length === 0 && this.routine.length > 1) { this.ri++; this.pIdx = 0; } } }
      return res;
    }
    // stationary tasks: go to spot first
    let spot = T.pos, yaw = T.yaw ?? 0;
    if (T.anchor) { const a = G.anchor(T.anchor, this); if (a) { spot = [a.pos[0], a.pos[2]]; yaw = a.yaw; } }
    if (this.taskPhase === 'go') { this.curDirect = !!T.direct; this.goTo([spot[0], 0, spot[1]], false); this.taskPhase = 'walk'; }
    if (this.taskPhase === 'walk') {
      const d = Math.hypot(spot[0] - this.pos[0], spot[1] - this.pos[2]);
      if (this.arrived() || d < .35) { this.taskPhase = 'do'; this.rt = 0; } else { res.speed = 1.45; res.anim = 'walk'; return res; }
    }
    if (this.taskPhase === 'do') {
      this.rt += dt; const d = Math.hypot(spot[0] - this.pos[0], spot[1] - this.pos[2]); if (d > .05) { this.pos[0] = damp(this.pos[0], spot[0], 6, dt); this.pos[2] = damp(this.pos[2], spot[1], 6, dt); }
      res.yaw = yaw;
      res.anim = { guard: 'guard', sit: T.anim === 'drink' ? 'sitdrink' : 'sit', work: T.sit ? 'sitwork' : 'work', talk: 'talk', smoke: 'smoke', idle: T.anim || 'idle', dance: T.anim || 'dance', drink: 'drink', kneel: 'kneel', cower: 'cower', lean: 'lean', phone: 'phone' }[T.t] || 'idle';
      if (T.t === 'talk') { const g = G.groups[T.group]; res.anim = g && g.speaker === this ? 'talk' : 'listen'; if (g && g.speaker && g.speaker !== this) res.yaw = Math.atan2(-(g.speaker.pos[0] - this.pos[0]), -(g.speaker.pos[2] - this.pos[2])); }
      if (T.t === 'smoke' && !this.hasProp) res.anim = 'idle';
      if (T.dur && this.rt > T.dur && this.routine.length > 1) { this.ri++; this.taskPhase = 'go'; }
    }
    return res;
  }
  combat(dt) {
    const res = { speed: 0, yaw: null, anim: 'aim' };
    const pp = P.state === 'vehicle' && P.vehicle ? P.vehicle.pos : P.pos;
    const toP = Math.atan2(-(pp[0] - this.pos[0]), -(pp[2] - this.pos[2]));
    const d = V.dist(this.pos, pp);
    if (this.reloadT > 0) { this.reloadT -= dt; res.anim = this.crouch > .5 ? 'crouch' : 'aim'; if (this.reloadT <= 0) this.mag = this.W.mag; }
    if (this.canSee) {
      res.yaw = toP; this.coverT -= dt;
      const ey = this.eye, pe = P.eye(); this.aimPitch = Math.atan2(pe[1] - .4 - ey[1], Math.hypot(pe[0] - ey[0], pe[2] - ey[2]));
      if (!this.def.static && (!this.cover && this.coverT <= 0) || (this.cover && this.coverT <= 0 && Math.random() < .3)) { this.cover = this.findCover(pp); this.coverT = 6 + Math.random() * 6; if (this.cover) this.goTo([this.cover[0], 0, this.cover[1]], true); }
      this.repath -= dt; if (this.wt === 'shotgun' && d > 8 && !this.def.static) { if (this.repath <= 0) { this.goTo(pp, true); this.repath = 1.5; } res.speed = 3.8; }
      if (!this.arrived()) { res.speed = Math.max(res.speed, 3.6); res.anim = 'run'; }
      else if (this.cover) { this.peek -= dt; if (this.peek < -1.5 - Math.random()) this.peek = 1.2 + Math.random() * 1.5; this.crouch = this.peek > 0 ? 0 : 1; res.anim = this.peek > 0 ? 'aim' : 'crouch'; }
      if (this.reloadT <= 0 && (this.arrived() || Math.random() < .3) && (this.crouch < .5 || this.peek > 0 || !this.cover)) this.shoot(dt, d);
    } else {
      this.crouch = 0;
      const since = G.time - this.lastSeen;
      if (since > 9) { this.setState('search'); this.searchPts = null; if (Math.random() < .5) this.say('lost'); return res; }
      if (this.lastKnown && this.repath <= 0 && (this.arrived() || !this.moveTarget || V.dist2([this.moveTarget[0], 0, this.moveTarget[1]], this.lastKnown) > 3)) { this.goTo(this.lastKnown, true); this.repath = 2.5 + Math.random(); }
      this.repath -= dt; res.speed = 3.2; res.anim = 'run';
      if (this.arrived() && this.lastKnown && V.dist2(this.pos, this.lastKnown) < 2) { res.anim = 'aim'; res.speed = 0; res.yaw = toP; }
    }
    return res;
  }
  findCover(pp) {
    let best = null, bs = 1e9; const W = G.W;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * TAU, r = 2 + Math.random() * 9; let p = [this.pos[0] + Math.cos(a) * r, this.pos[2] + Math.sin(a) * r];
      if (!W.navFree(p[0], p[1])) continue; const gy = W.ground(p[0], p[1], this.pos[1] + 1, .6);
      const low = [p[0], gy + .9, p[1]], high = [p[0], gy + 1.6, p[1]]; const tgt = [pp[0], pp[1] + 1.2, pp[2]];
      const dl = V.sub(tgt, low); const L = V.len(dl); if (L < 5) continue;
      const h = W.ray(low, V.sc(dl, 1 / L), Math.min(L, 4), { sight: true });
      const covered = h && h.t < 3; const peekOk = W.los(high, tgt);
      const sc = r + (covered ? 0 : 50) + (peekOk ? 0 : 8) + Math.abs(L - 18) * .2;
      if (sc < bs) { bs = sc; best = p; }
    }
    return bs < 40 ? best : null;
  }
  shoot(dt, d) {
    const W = this.W; if (!W) return;
    if (P.hostage && P.hostage.phase === 'hold' && G.time - P.lastShot > 4) { this.fireCd = .5; if (Math.random() < dt * .5) this.say(pick(['Let him go!', 'Drop the gun and let him go!', 'Hold your fire, he has a hostage!', 'You have nowhere to run!'])); return; } this.fireCd -= dt; if (this.burstPause > 0) { this.burstPause -= dt; return; }
    if (this.fireCd > 0) return; if (d > W.range * 1.5) return;
    if (this.mag <= 0) { this.reloadT = 2.2; this.say('reload'); AUD.mech('magOut', this.pos); return; }
    this.fireCd = 60 / W.rpm; this.mag--; this.burst++;
    G.npcShoot(this, d);
    if (this.burst >= W.burst[0] + Math.floor(Math.random() * (W.burst[1] - W.burst[0] + 1))) { this.burst = 0; this.burstPause = .5 + Math.random() * 1.1; }
  }
  damage(dmg, from, part, kind) {
    if (this.dead) return;
    let m = part === 'head' ? (this.helmet && kind !== 'knife' ? 2.2 : 4) : part === 'chest' ? 1 - this.armor : part === 'limb' ? .6 : 1;
    this.hp -= dmg * m; this.hitFlash = 1; this.flinch = 1;
    if (this.hp <= 0) { G.killNPC(this, from, part, kind); return; }
    if (Math.random() < .5) this.say('hurt');
    if (this.state !== 'combat') { this.lastKnown = V.copy(P.pos); this.lastSeen = G.time - 3; this.enterCombat(false); G.stats.detected = true; }
  }
  /* ---------------- animation / rig ---------------- */
  animate(dt) {
    const rig = this.rig; const j = P_(); let py = 0, pz = 0;
    if (this.dead || this.tdT >= 0) return this.animateDeath(dt);
    const a = this.anim; this.ph += dt * (a === 'run' ? this.speed / 1.9 * TAU * .5 : a === 'walk' ? Math.max(this.speed, .8) / 1.4 * TAU * .5 : 0);
    const carry = this.weaponMode !== 'sling';
    if (a === 'walk' || a === 'run') py = -poseWalk(j, this.ph, a === 'run' ? 1.1 : clamp(this.speed / 1.5, .5, 1.1), a === 'run', carry);
    else if (a === 'sit' || a === 'sitwork') { poseSit(j, G.time, this.k, a === 'sitwork'); py = -.5; }
    else if (a === 'crouch') { poseCrouch(j, 0, false); py = -.38; }
    else if (a === 'sitdrink') { poseSit(j, G.time, this.k, false); py = -.5; const up = bump((G.time * .15 + this.k) % 1, .1, .35); pj(j, SK.UAL, .5 + up * .4, .2, -.15 + up * .3); pj(j, SK.FAL, 1.3 + up, 0, 0); }
    else { poseIdle(j, G.time, a === 'aim' ? 'guard' : a, this.k); if (a === 'cower') py = -.62; if (a === 'kneel') py = -.44; }
    if (a === 'aim') { pj(j, SK.THL, -.1, .25, -.1); pj(j, SK.THR, .15, -.25, .1); pj(j, SK.CH, 0, .35, 0); pj(j, SK.HD, 0, -.3, 0); }
    if (this.crouch > .5 && a !== 'run' && a !== 'walk') { poseCrouch(j, 0, false); py = -.38; pj(j, SK.CH, -.15, .3, 0); }
    if (this.state === 'suspicious' || this.state === 'investigate') pj(j, SK.HD, 0, Math.sin(G.time * 1.2 + this.k) * .5, 0);
    if (this.flinch > 0) { j[SK.CH * 3] += this.flinch * .3; j[SK.HD * 3] += this.flinch * .3; }
    rig.tj.set(j); rig.tpy = py; rig.blend(a === 'walk' || a === 'run' ? 16 : 8, dt);
    const r = rig.root; M4.ident(r); M4.translate(r, r, this.pos[0], this.pos[1], this.pos[2]); M4.rotY(r, r, this.yaw);
    // weapon placement
    let wl = null;
    if (this.W && this.state !== 'hostage') {
      const m = this.wmLocal; M4.ident(m); const isP = this.wt === 'pistol';
      if (this.weaponMode === 'aim' && a !== 'run') { M4.translate(m, m, isP ? .02 : .11, .33, isP ? -.42 : -.22); M4.rotY(m, m, -.35); M4.rotX(m, m, clamp(this.aimPitch, -.8, .8)); if (this.crouch > .5) M4.rotY(m, m, -.1); wl = { m, gr: this.W.gr, gl: this.W.gl }; }
      else if (this.weaponMode === 'low' || (this.weaponMode === 'aim' && a === 'run')) { M4.translate(m, m, isP ? .2 : .08, isP ? .02 : .1, isP ? -.15 : -.26); M4.rotY(m, m, .55); M4.rotX(m, m, -.6); wl = { m, gr: this.W.gr, gl: isP ? null : this.W.gl }; }
      else { if (isP) { M4.translate(m, m, .2, -.08, .02); M4.rotX(m, m, -1.5); } else { M4.translate(m, m, .02, .26, .17); M4.rotZ(m, m, 2.3); M4.rotY(m, m, Math.PI / 2 * 0); } wl = { m, gr: null, gl: null }; }
    }
    rig.solve(wl, this.hasProp);
  }
  animateDeath(dt) {
    const rig = this.rig; const j = P_(); let e;
    if (this.tdT >= 0 && !this.dead) {
      const t = this.tdT; const s = smooth(t / .5); const k2 = smooth((t - .6) / .9);
      poseIdle(j, 0, 'idle', 0); pj(j, SK.UAL, 1.2 * s, .4, -.4 * s); pj(j, SK.FAL, 2 * s, 0, 0); pj(j, SK.UAR, 1.1 * s, -.4, .4 * s); pj(j, SK.FAR, 2 * s, 0, 0); pj(j, SK.HD, .5 * s, 0, 0); pj(j, SK.CH, .2 * s, 0, 0);
      if (k2 > 0) { pj(j, SK.THL, 1.2 * k2, 0, 0); pj(j, SK.THR, 1 * k2, 0, 0); pj(j, SK.SHL, -1.8 * k2, 0, 0); pj(j, SK.SHR, -1.6 * k2, 0, 0); }
      rig.tj.set(j); rig.tpy = -.4 * k2; rig.blend(12, dt);
      const r = rig.root; M4.ident(r); M4.translate(r, r, this.pos[0], this.pos[1], this.pos[2]); M4.rotY(r, r, this.yaw);
      rig.solve(null, false); return;
    }
    e = ease(this.deathT / .85); const k = this.k % 1;
    poseDead(j, k); const crumple = 1 - smooth(this.deathT / .35);
    if (crumple > 0) { pj(j, SK.THL, j[SK.THL * 3] + crumple * .8, 0, 0); pj(j, SK.SHL, -1.2 * crumple, 0, 0); pj(j, SK.SHR, -1.1 * crumple, 0, 0); }
    rig.tj.set(j); rig.tpy = 0; rig.blend(9, dt);
    const r = rig.root; M4.ident(r); M4.translate(r, r, this.pos[0], this.pos[1] + .13 * e, this.pos[2]); M4.rotY(r, r, this.yaw); M4.rotX(r, r, this.fallDir * Math.PI / 2 * e);
    if (this.tdDeath) M4.translate(r, r, 0, -.3 * e, 0);
    rig.solve(null, false);
  }
  hitTest(o, d) { // ray vs simplified body volumes; returns {t, part}
    const M = this.rig.mats; let best = null;
    const sph = (c, r, part) => { const oc = V.sub(o, c); const b = V.dot(oc, d), cc = V.dot(oc, oc) - r * r; const h = b * b - cc; if (h < 0) return; const t = -b - Math.sqrt(h); if (t > 0 && (!best || t < best.t)) best = { t, part }; };
    const cap = (a, b2, r, part) => { for (let i = 0; i <= 3; i++) sph(V.lerp(a, b2, i / 3), r, part); };
    sph(M4.pt(M[SK.HD], 0, .13, 0), .13, 'head');
    cap(M4.pt(M[SK.PEL], 0, 0, 0), M4.pt(M[SK.CH], 0, .35, 0), .2, 'chest');
    for (const [a, b] of [[SK.UAL, SK.HL], [SK.UAR, SK.HR], [SK.THL, SK.FTL], [SK.THR, SK.FTR]]) cap(M4.pos(M[a]), M4.pos(M[b]), .085, 'limb');
    return best;
  }
}

/* ---------------- security cameras & surveillance network ---------------- */
class SecCam {
  constructor(pos, yaw, sweep = .9, label) { this.pos = pos; this.base = yaw; this.yaw = yaw; this.sweep = sweep; this.t = Math.random() * 6; this.susp = 0; this.alive = true; this.m = M4.create(); this.cool = 0; this.empT = 0; this.label = label || 'CAMERA'; this.downT = 0; this.reported = false; }
  get online() { return this.alive && this.empT <= 0 && !G.camFeedOff && !(this.needsPower && !G.powerOn); }
  update(dt) {
    this.empT = Math.max(0, this.empT - dt);
    if (!this.online) { this.susp = 0; this.seeing = false; this.downT += dt; G.camDown(this); return; }
    this.downT = 0; this.reported = false;
    this.t += dt; this.yaw = this.base + Math.sin(this.t * .35) * this.sweep; this.cool -= dt;
    M4.trs(this.m, M4.create(), this.pos[0], this.pos[1], this.pos[2], -.35, this.yaw, 0);
    if (P.state !== 'ground' && P.state !== 'vehicle') return;
    const pe = P.eye(); const d = V.dist(pe, this.pos); if (d > 24) { this.susp = Math.max(0, this.susp - dt * .3); this.seeing = false; return; }
    const to = V.sc(V.sub(pe, this.pos), 1 / d); const f = [-Math.sin(this.yaw), 0, -Math.cos(this.yaw)]; const fl = Math.hypot(to[0], to[2]) || 1;
    const ca = (to[0] * f[0] + to[2] * f[2]) / fl; const seen = ca > .78 && G.W.los(this.pos, pe) && G.smokeBlock(this.pos, pe) < .9;
    const social = G.socialFactor(null, d);
    if (seen) this.susp += dt * (.8 + P.visibility) * (P.crouch > .5 ? .5 : 1) * (1 - d / 27) * 1.3 * G.diffMul * Math.max(social, P.holstered ? 0 : .5); else this.susp = Math.max(0, this.susp - dt * .25);
    this.seeing = seen && this.susp > .05;
    if (this.susp > 1 && this.cool <= 0) { this.cool = 20; this.susp = 0; G.camAlert(this, V.copy(P.pos)); }
  }
}
