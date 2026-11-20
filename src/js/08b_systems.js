/* =====================================================================
   SYSTEMS — civilians & panic, social stealth (holstered / zones),
   surveillance network (operator, dispatch, dead-feed checks),
   hostage grab (hold / kill / release / escape).
   ===================================================================== */
Object.assign(NPC.prototype, {
  scream() { if (this.sayCd > 0) return; this.sayCd = 3; const t = this.app.female ? pick(['Aaah!', 'Oh my God!', 'Help! Somebody help!', 'No no no!']) : pick(['Hey! HEY!', 'Oh God!', 'Help! Security!', 'Run!']); G.speak(this, t, false); AUD.voice('aaaaah', this.voice * (this.app.female ? 2.1 : 1.5), V.add(this.pos, [0, 1.6, 0])); },
  panic(from, witnessed) {
    if (this.dead || this.state === 'hostage') return;
    if (this.def.kneel) { if (this.state !== 'cower') { this.setState('cower'); this.scream(); } return; }
    const first = this.state !== 'panic' && this.state !== 'cower';
    this.setState('panic'); this.panicFrom = V.copy(from); this.weaponMode = 'sling'; this.seat = null; if (this._anc) { this._anc.taken = null; this._anc = null; }
    if (first) { this.scream(); G.stats.panics = (G.stats.panics || 0) + 1; }
    // run away from the threat, to the mission's safe exits if any
    const ex = G.M.exits || null; let tgt;
    if (ex && ex.length) { tgt = ex.slice().sort((a, b) => Math.hypot(a[0] - this.pos[0], a[1] - this.pos[2]) - Math.hypot(b[0] - this.pos[0], b[1] - this.pos[2]))[0]; }
    else { const d = V.norm([this.pos[0] - from[0], 0, this.pos[2] - from[2]]); tgt = [this.pos[0] + d[0] * 25, this.pos[2] + d[2] * 25]; }
    this.goTo([tgt[0] + rnd(-3, 3), 0, tgt[1] + rnd(-3, 3)], true); this.panicT = 0;
    // witnesses report to security
    if (witnessed && !G._civReported) { G._civReported = true; G.after(() => { G._civReported = false; if (!this.dead) { const sec = G.npcs.find(n => !n.dead && !n.civ && n.state !== 'combat'); if (sec) G.speak(sec, pick(['Guests are screaming — something happened! Lock it down!', 'We have panic in the crowd. Find the cause!', 'Civilian reports an armed man!']), true); G.globalSearch(V.copy(from), null, 'civ'); } }, 2000); }
  },
  updateSpecial(dt) {
    const res = { speed: 0, yaw: null, anim: 'idle' }; const S = this.state;
    if (S === 'panic') {
      this.panicT += dt;
      if (!this.arrived()) { res.speed = 4.2; res.anim = 'run'; }
      else { this.setState('cower'); }
      if (this.panicT > 25) this.setState('cower');
    } else if (S === 'cower') { res.anim = this.def.kneel ? 'kneel' : 'cower'; if (this.stT > 40 && G.alarm === 0) { this.backToRoutine(); } }
    else if (S === 'warn') {
      // social stealth: guard walks up and tells the player to leave a restricted area
      const zone = G.zoneAt(P.pos); res.yaw = Math.atan2(-(P.pos[0] - this.pos[0]), -(P.pos[2] - this.pos[2]));
      if (V.dist2(this.pos, P.pos) > 2.5 && this.repath <= 0) { this.goTo(P.pos, false); this.repath = 1.5; } this.repath -= dt;
      if (!this.arrived() && V.dist2(this.pos, P.pos) > 2.2) { res.speed = 1.7; res.anim = 'walk'; } else res.anim = 'guard';
      this.warnT -= dt;
      if (zone !== 'restricted') { this.say(pick(['Thank you. Enjoy the evening.', 'Good. Stay where you belong.', 'Move along.'])); this.susp = .2; this.backToRoutine(); }
      else if (this.warnT <= 0 || !P.holstered) { this.say(pick(['That is it — you are coming with me! Hands up!', 'Stop right there!'])); this.susp = 1; this.enterCombat(true); }
    } else if (S === 'released') {
      if (!this.arrived()) { res.speed = 4.4; res.anim = 'run'; } else { res.anim = this.civ ? 'cower' : 'look'; }
      if (this.stT > 2.5 && !this.relAlerted) { this.relAlerted = true; if (this.civ) this.panic(P.pos, true); else { this.say(pick(['He grabbed me! Intruder!', 'All units — armed intruder, he had me!'])); G.globalSearch(V.copy(P.pos), this, 'hostage'); if (this.canSee) { this.lastKnown = V.copy(P.pos); this.enterCombat(true); } else { this.setState('search'); this.lastKnown = V.copy(P.pos); this.searchPts = null; } } }
    }
    return res;
  },
});
Object.assign(G, {
  /* ---------------- social stealth ---------------- */
  zoneAt(p) { const Z = this.W && this.W.zones; if (!Z) return null; for (const z of Z) if (p[0] > z[0] && p[0] < z[2] && p[2] > z[1] && p[2] < z[3] && (z[5] === undefined || (p[1] > z[5] - .5 && p[1] < z[6]))) return z[4]; return this.M.defaultZone || null; },
  socialCover() { return !!(this.M && this.M.social) && P.holstered && !P.hostage && P.state === 'ground' && P.crouch < .5 && !P.sprinting && this.alarm === 0 && !this.stats.detected && !(P.lastShot > this.time - 8); },
  socialFactor(npc, d) {
    if (!this.M || !this.M.social) return 1;
    const zone = this.zoneAt(P.pos);
    if (!this.socialCover()) return npc && npc.civ ? (P.holstered ? .1 : .9) : 1;
    if (zone === 'public') return npc && npc.civ ? .01 : .03;
    if (zone === 'restricted') return .55;
    return .25;
  },
  socialWarn(npc) {
    if (!this.socialCover() || this.zoneAt(P.pos) !== 'restricted' || npc.warned) return false;
    npc.warned = true; npc.setState('warn'); npc.warnT = 8; npc.susp = .7; npc.weaponMode = 'low';
    npc.say(pick(['Excuse me, sir — staff only beyond this point. Turn around.', 'Hey! You are not allowed in here.', 'This area is restricted. Back to the party, now.']));
    return true;
  },
  /* ---------------- surveillance network ---------------- */
  camOperator() { return this.npcs.find(n => n.def.camOp && !n.dead && n.state !== 'hostage' && n.tdT < 0 && n.state !== 'panic' && (n.anim === 'sit' || n.anim === 'sitwork') && n.taskPhase === 'do'); },
  camAlert(cam, pos) {
    const op = this.camOperator(); cam.lastSeenAt = pos;
    if (!op) { this.notify(cam.label + ' RECORDED YOU — NO ONE IS WATCHING THE MONITORS', 'info'); return; }
    this.notify('SPOTTED BY ' + cam.label, 'warn'); this.stats.camSpotted = (this.stats.camSpotted || 0) + 1;
    this.speak(op, pick([cam.label + ' — I have movement. Someone check it out!', 'Security, ' + cam.label + ' shows an intruder. Respond now!', 'Movement on ' + cam.label + '. Send a team.']), true);
    this.alarm = Math.max(this.alarm, 1); this.searchT = Math.max(this.searchT, 40);
    const guards = this.npcs.filter(n => !n.dead && !n.civ && !n.def.camOp && !n.def.static && (n.state === 'calm' || n.state === 'suspicious')).sort((a, b) => V.dist(a.pos, pos) - V.dist(b.pos, pos)).slice(0, 2);
    for (const g of guards) { g.setSuspicious(V.copy(pos), false); g.setState('investigate'); g.suspPt = V.copy(pos); g.goTo(pos, true); g.susp = .6; g.alerted = true; }
  },
  camDown(cam) {
    if (cam.reported || cam.downT < 18) return; cam.reported = true;
    const op = this.camOperator(); if (!op) return;
    const what = this.camFeedOff ? 'All camera feeds just went down' : cam.label + ' just went dark';
    this.speak(op, what + '. Someone check it out.', true);
    const where = this.camFeedOff && this.secRoom ? this.secRoom : cam.pos;
    const g = this.npcs.filter(n => !n.dead && !n.civ && !n.def.camOp && !n.def.static && n.state === 'calm').sort((a, b) => V.dist(a.pos, where) - V.dist(b.pos, where))[0];
    if (g) { g.setSuspicious(V.copy(where), false); g.setState('investigate'); g.suspPt = V.copy(where); g.goTo(where, false); g.susp = .5; }
  },
  addSecurityConsole(pos, label = 'SECURITY CONSOLE') {
    this.secRoom = V.copy(pos);
    this.W.interact.push({ r: 1.8, pos, hold: 3, anim: 'hotwire', label: () => this.camFeedOff ? '' : '[E] DISABLE CAMERA NETWORK (HOLD)', enabled: () => !this.camFeedOff,
      act: () => { this.camFeedOff = true; AUD.beep(400, .3, .3, pos); this.notify('CAMERA NETWORK DISABLED', 'good'); this.stats.camsDisabled = 1; this.M.onCamsOff && this.M.onCamsOff(this); } });
  },
  /* ---------------- hostage system ---------------- */
  canGrab(n) { return P.weapon === 'pistol' && !P.holstered && !P.hostage && P.state === 'ground'; },
  startHostage(n) {
    P.hostage = { n, t: 0, phase: 'grab', start: V.copy(P.pos) }; n.state = 'hostage'; n.hostAnim = 'held'; n.path = null; n.susp = 0; P.ads = 0;
    if (n._anc) { n._anc.taken = null; n._anc = null; }
    AUD.swoosh(.45, null, 500, .35); AUD.voice(n.app.female ? 'ah' : 'hngh', n.voice * 1.2, V.add(n.pos, [0, 1.6, 0])); this.stats.hostages = (this.stats.hostages || 0) + 1;
    this.G_hostageSay = 2.5;
    // anyone who sees this happen reacts
    for (const o of this.npcs) { if (o === n || o.dead) continue; const d = V.dist(o.pos, n.pos); if (d > 26 || !this.W.los(o.eye, V.add(n.pos, [0, 1.4, 0]))) continue; const to = V.norm(V.sub(n.pos, o.pos)); const f = o.fwd; if (to[0] * f[0] + to[2] * f[2] < .3 && d > 4) continue; if (o.civ) o.panic(P.pos, true); else this.after(() => { if (!o.dead && o.state !== 'combat') { o.lastKnown = V.copy(P.pos); o.enterCombat(true); } }, 600); }
  },
  updateHostage(dt) {
    const H = P.hostage; if (!H) return; const n = H.n; H.t += dt;
    if (n.dead && H.phase !== 'kill') { P.hostage = null; return; }
    const f = [-Math.sin(P.yaw), 0, -Math.cos(P.yaw)], r = [Math.cos(P.yaw), 0, -Math.sin(P.yaw)];
    if (H.phase === 'grab') {
      const behind = [n.pos[0] + Math.sin(n.yaw) * .55, P.pos[1], n.pos[2] + Math.cos(n.yaw) * .55]; const k = smooth(H.t / .45);
      P.pos[0] = lerp(H.start[0], behind[0], k); P.pos[2] = lerp(H.start[2], behind[2], k); P.yaw = dampAng(P.yaw, n.yaw, 12, dt);
      if (H.t > .5) { H.phase = 'hold'; H.t = 0; UI.hint('HOSTAGE: [F] ELIMINATE · [E] RELEASE · LMB FIRE PISTOL — they will break free in ~60 s'); }
      return;
    }
    // hostage is held in front of the player, slightly to the left so the pistol has a clear line
    const tp = [P.pos[0] + f[0] * .5 - r[0] * .2, 0, P.pos[2] + f[2] * .5 - r[2] * .2]; tp[1] = this.W.ground(tp[0], tp[2], P.pos[1] + .4, .5, .1);
    n.pos[0] = damp(n.pos[0], tp[0], 18, dt); n.pos[2] = damp(n.pos[2], tp[2], 18, dt); n.pos[1] = damp(n.pos[1], tp[1], 18, dt); n.yaw = dampAng(n.yaw, P.yaw, 14, dt);
    n.speed = P.speed;
    if (H.phase === 'hold') {
      n.hostAnim = P.speed > .3 ? 'held' : 'held';
      this.G_hostageSay -= dt; if (this.G_hostageSay <= 0) { this.G_hostageSay = 7 + Math.random() * 6; this.speak(n, pick(n.civ ? ['Please, please don\'t hurt me!', 'I have a family!', 'I\'ll do anything, please!'] : ['You won\'t get out of here alive.', 'Let me go and maybe they\'ll go easy on you.', 'Agh — you\'re choking me!', 'They\'ll find you.']), false); }
      if (IN.hit('KeyF')) { H.phase = 'kill'; H.t = 0; AUD.swoosh(.4, null, 400, .3); return; }
      if (IN.hit('KeyE')) { this.releaseHostage(false); return; }
      if (H.t > 60 - (n.civ ? 0 : 5)) { H.phase = 'escape'; H.t = 0; this.notify('THE HOSTAGE IS BREAKING FREE', 'warn'); }
    } else if (H.phase === 'kill') {
      n.hostAnim = 'struggle';
      if (H.t > .55 && !n.dead) { AUD.impact('flesh', n.pos); n.tdDeath = true; this.killNPC(n, P.pos, 'chest', 'hostage'); n.fallDir = -1; n.deathT = .1; P.shake = .3; }
      if (H.t > 1.1) { P.hostage = null; UI.hint(''); }
    } else if (H.phase === 'escape') {
      n.hostAnim = H.t < 1.05 ? 'struggle' : 'elbow'; P.shake = Math.max(P.shake, H.t < 1.05 ? .25 : 0);
      if (H.t > 1.1 && !H.hit) { H.hit = true; AUD.impact('flesh', null); AUD.hurt(); P.hurt(12, n.pos); P.stun = 1.6; P.shake = 1.3; P.pitch += .25; P.yaw += .35; }
      if (H.t > 1.4) this.releaseHostage(true);
    }
  },
  releaseHostage(escaped) {
    const H = P.hostage; if (!H) return; const n = H.n; P.hostage = null; UI.hint('');
    n._freeing = true; n.state = 'calm'; n.setState('released'); n._freeing = false; n.relAlerted = false; n.warned = true;
    const away = [n.pos[0] - Math.sin(P.yaw) * 18 + rnd(-4, 4), 0, n.pos[2] - Math.cos(P.yaw) * 18 + rnd(-4, 4)]; const fp = this.W.nearestFree(away[0], away[2], 8); n.goTo([fp[0], 0, fp[1]], true);
    if (escaped) { n.say(n.civ ? 'Get away from me!' : 'Ha! Now you\'re finished!'); if (!n.civ) { n.relAlerted = true; n.lastKnown = V.copy(P.pos); this.after(() => { if (!n.dead) { n.setState('combat'); n.enterCombat(true); } }, 1200); } else n.panic(P.pos, true); }
    else { n.say(n.civ ? 'Thank you, thank you…' : 'You\'re making a mistake.'); this.notify('HOSTAGE RELEASED'); }
  },
});
/* =====================================================================
   BODIES + DISGUISES — carry corpses out of sight ([F]), take a victim's
   clothes ([T] hold) to move among his own side. Anyone who gets a good
   look up close sees through it.
   ===================================================================== */
const DISGUISE_LABEL = { cartel: 'CARTEL SOLDIER', pmc: 'PMC CONTRACTOR', militia: 'MILITIA FIGHTER', security: 'SECURITY GUARD', civ: 'PARTY GUEST', staff: 'CATERING STAFF', bank: 'BANK EMPLOYEE', robber: 'BANK ROBBER' };
Object.assign(G, {
  pickupBody(n) {
    if (P.carry || !n.dead || n.carried) return;
    P.carry = n; n.carried = true; P.carryHol = P.holstered; P.holstered = true; P.ads = 0;
    AUD.swoosh(.35, null, 600, .45); AUD.step('mud', null, .3); this.noise(P.pos, 3, 'step');
    if (P.vmL) P.anim = { k: 'holster', t: 0, d: .3, keep: true };
    this.notify('CARRYING ' + (n.name ? n.name.toUpperCase() : 'BODY') + ' — [F] DROP', 'info');
  },
  dropBody() {
    const n = P.carry; if (!n) return; P.carry = null; n.carried = false;
    const f = [-Math.sin(P.yaw), 0, -Math.cos(P.yaw)]; const W = this.W;
    let p = V.add(P.pos, V.sc(f, .85)); const blk = W.ray([P.pos[0], P.pos[1] + .5, P.pos[2]], f, 1.1, { bullet: true }); if (blk) p = V.copy(P.pos);
    p[1] = W.ground(p[0], p[2], P.pos[1] + .4, .5, .2); if (W.waterY > -50 && p[1] < W.waterY - .5) p[1] = Math.max(p[1], W.waterY - .45);
    n.pos = p; n.yaw = P.yaw + Math.PI / 2 * (Math.random() < .5 ? 1 : -1); n.fallDir = Math.random() < .5 ? 1 : -1; n.deathT = Math.max(n.deathT, 2); n.k = Math.random() * 10;
    AUD.impact('wood', p); this.noise(p, 4, 'body');
    P.holstered = !!P.carryHol; if (!P.holstered) P.anim = { k: 'draw', t: 0, d: .45 };
  },
  takeDisguise(n) {
    if (n.stripped || !n.dead) return;
    const a = n.app; const label = DISGUISE_LABEL[n.faction] || 'GUARD';
    const clothes = { top: a.top, topCol: a.topCol, suit: a.suit, bottom: a.bottom === 'dress' ? 'slacks' : a.bottom, botCol: a.botCol, feet: a.feet, head: a.head === 'helmet' || a.head === 'cap' || a.head === 'beanie' || a.head === 'balaclava' || a.head === 'skimask' || a.head === 'hood' || a.head === 'earpiece' || a.head === 'headset' ? a.head : 'none', vest: a.vest || 'none', vestCol: a.vestCol, camo: !!a.camo, gloves: !!a.gloves, accent: a.accent, tie: a.tie, holster: a.holster };
    if (clothes.top === 'dress' || clothes.top === 'blouse') clothes.top = 'shirt';
    const plain = !!n.civ || n.faction === 'security';
    P.disguise = { faction: n.faction, civ: !!n.civ, armed: !!n.W && !n.civ, label, name: n.name, clothes, sleeve: a.suit ?? a.topCol ?? 0x4a5038, glove: a.gloves ? 0x1c1c1a : 0xc89670, plain, guest: n.faction === 'civ', blown: false };
    // the body is left in a plain undershirt
    const s = Object.assign({}, a, { top: 'tshirt', topCol: 0xcfcac0, suit: undefined, vest: 'none', head: a.head === 'helmet' ? 'none' : a.head === 'earpiece' ? 'none' : a.head, camo: false, holster: false, bottom: a.bottom === 'dress' ? 'slacks' : a.bottom });
    n.stripped = true; n.rig.mesh.dispose && n.rig.mesh.dispose(); n.rig.mesh = buildCharacter(s);
    P.applyLook(this.M); AUD.swoosh(.5, null, 800, .4); AUD.mech('pickup');
    this.notify('DISGUISED AS ' + label + ' — KEEP YOUR DISTANCE FROM OTHERS', 'good');
    UI.hint('Disguised as ' + label.toLowerCase() + '. People ignore you from a distance, but anyone who gets close will recognise you. ' + (P.disguise.armed ? 'Weapons are part of the outfit — just don\'t aim at anyone.' : 'Keep your weapon holstered.'));
  },
  blowDisguise(by) {
    const D = P.disguise; if (!D || D.blown) return; D.blown = true;
    this.notify('DISGUISE BLOWN', 'alarm'); if (by && !by.civ) by.say(pick(['Wait — you\'re not one of us!', 'Hey! That\'s not ' + (D.name || 'him') + '!', 'Impostor! Take him down!']));
  },
  disguiseFactor(npc, d) {
    const D = P.disguise; if (!D || D.blown || P.carry || P.hostage || P.state !== 'ground') return 1;
    if (P.lastShot > this.time - 4) return 1;
    if (npc.civ) return D.civ ? .02 : .06;
    let k = .05;
    if (!D.armed && !P.holstered) k = .9;           // drawn weapon in an unarmed outfit
    if (P.ads > .5) k = Math.max(k, .8);            // aiming at people
    if (P.crouch > .5) k *= 4; if (P.sprinting) k *= 3;
    if (npc.state === 'search' || npc.state === 'combat' || this.alarm > 0) k *= 2.5;
    if (D.guest && this.zoneAt && this.zoneAt(P.pos) === 'restricted') k = Math.max(k, .5);
    const close = npc.state === 'calm' ? 4.5 : 7; // up close they recognise the face
    if (d < close) k = Math.max(k, lerp(.75, .25, d / close));
    return Math.min(1, k);
  },
});
{
  const baseWarn = G.socialWarn;
  G.socialWarn = function (npc) { if (P.disguise && !P.disguise.blown && !P.disguise.guest) return false; return baseWarn.call(this, npc); };
}
