/* =====================================================================
   GAME CORE — mission lifecycle, combat resolution, alerts, comms,
   doors, items, vehicles, takedowns, particles, cinematics, main loop.
   ===================================================================== */
const G = {
  state: 'menu', time: 0, W: null, M: null, npcs: [], vehicles: [], cams: [], particles: [], vmParticles: [], dlights: [], groups: {}, projectiles: [], smokes: [], decals: [],
  alarm: 0, searchT: 0, powerOn: true, diffMul: 1, dmgMul: 1, cineLock: false, god: false, missionTime: 0, stats: null, objectives: [], subs: [],
  settings: { sens: 1, fov: 72, invert: false, master: .8, music: .5, amb: .8, quality: 'high', shadows: true, markers: true, subtitles: true, scale: 1, difficulty: 'normal' },
  loadout: { pistol: 'pistol', rifle: 'ar7', knife: 'knife', optic: 'iron', muzzle: 'none', mag: 'std', laser: 'off', gadget: 'noisemaker', extraMags: false, armor: false, boots: false, operator: 'viper' },
  init() {
    try { Object.assign(this.settings, JSON.parse(localStorage.getItem('redline_settings') || '{}')); } catch (e) { }
    try { Object.assign(this.loadout, JSON.parse(localStorage.getItem('redline_loadout') || '{}')); } catch (e) { }
    try { this.career = JSON.parse(localStorage.getItem('redline_career') || 'null'); } catch (e) { }
    this.career = this.career || { completed: {}, best: {}, kills: 0, headshots: 0, takedowns: 0, shots: 0, hits: 0, detected: 0, missions: 0, deaths: 0, playtime: 0, ghosts: 0, ratings: {} };
    const cv = document.getElementById('gl'); R.init(cv); IN.init(cv); P.init();
    this.applySettings();
    let last = performance.now();
    const loop = now => { const dt = Math.min(.05, (now - last) / 1000); last = now; this.frame(dt); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  },
  saveSettings() { try { localStorage.setItem('redline_settings', JSON.stringify(this.settings)); localStorage.setItem('redline_loadout', JSON.stringify(this.loadout)); } catch (e) { } },
  saveCareer() { try { localStorage.setItem('redline_career', JSON.stringify(this.career)); } catch (e) { } },
  applySettings() {
    const s = this.settings; R.shadowsOn = s.shadows; R.scale = s.scale;
    const q = { low: [1024, 220, 40], medium: [2048, 300, 60], high: [2048, 380, 75], ultra: [4096, 480, 100] }[s.quality] || [2048, 380, 75];
    if (R.gl && R.shadowRes !== q[0]) R.makeShadow(q[0]); R.drawDist = q[1]; R.detailDist = q[2];
    AUD.vol.master = s.master; AUD.vol.music = s.music; AUD.vol.amb = s.amb; AUD.applyVol();
    const d = { easy: [.65, .55], normal: [1, 1], hard: [1.35, 1.5] }[s.difficulty] || [1, 1]; this.diffMul = d[0]; this.dmgMul = d[1];
  },
  wantsLock() { return this.state === 'play' || this.state === 'intro'; },
  /* ---------------- mission lifecycle ---------------- */
  disposeWorld() {
    const W = this.W; if (!W) return;
    for (const c of W.chunks || []) { c.mesh && c.mesh.dispose(); c.detail && c.detail.dispose(); }
    W.water && W.water.mesh.dispose(); for (const n of this.npcs) n.rig.mesh.dispose();
    AUD.stopAllLoops(); this.W = null;
  },
  buildMission(id) {
    this.disposeWorld();
    const M = MISSIONS.find(m => m.id === id); this.M = M;
    const W = new World(M.size, M.seed); this.W = W;
    this.timers = []; this.wtime = 0; this.slow = { on: false, t: 0, charge: 1, k: 0 }; this.timeScale = 1; R.post.slow = 0;
    this.npcs = []; this.vehicles = []; this.cams = []; this.groups = {}; this.particles = []; this.projectiles = []; this.smokes = []; this.decals = []; this.extras = []; this.hums = [];
    this.plane = null; this.heli = null; this.boat = null; this.chuteDrops = []; this.drops = []; this.extraUpdaters = []; this.exHeli = null; this.fires = []; this.marker = null; this._outF = 0; this.siren = null;
    this.rng = mulberry(M.seed * 7 + 3);
    M.build(W, this);
    W.chunks = buildChunks(W.B, W.D, 40); W.B = null; W.D = null;
    W.buildNav(1);
    this.makeMinimap();
    return W;
  },
  begin() {
    const M = this.M; this.state = 'intro'; this.time = 0; this.missionTime = 0; this.alarm = 0; this.searchT = 0; this.powerOn = true; this.cineLock = false;
    this.stats = { kills: 0, headshots: 0, takedowns: 0, shots: 0, hits: 0, detected: false, bodies: 0, alarms: 0, damage: 0, knifeKills: 0, stealthKills: 0, vehicles: 0, startT: performance.now() };
    this.objectives = M.objectives.map(o => Object.assign({ done: false, failed: false }, o));
    this.radioT = 70 + Math.random() * 30; this.lastEye = 0; this.subs = []; this.notifs = [];
    P.reset(this.loadout); P.applyLook(M); this.env = M.env; this.computeEnv(); this.civTotal = this.npcs.filter(n => n.civ).length; this.camFeedOff = false; this._civReported = false;
    for (const it of M.startItems || []) P.mission.push(it);
    AUD.init(); AUD.stopAllLoops(); this.ambLoop = AUD.ambience(M.ambience); this.musicLoop = AUD.music();
    for (const h of this.W.sounds) if (h.kind === 'hum' && Math.random() < .3) this.hums.push(AUD.humAt(h.pos, h.f, h.vol));
    for (const g of this.W.gens || []) { g.hum = AUD.humAt(g.pos, 48, .35); this.hums.push(g.hum); }
    if (M.musicPos) AUD.partyMusic(M.musicPos);
    this.windLoop = AUD.loop(C => { const n = AUD.mkNoiseLoop('pink', 'bandpass', 700, .6, 0, AUD.amb); return { set(f, v) { n.f.frequency.setTargetAtTime(300 + f * 900, AUD.t, .2); n.g.gain.setTargetAtTime(v, AUD.t, .2); }, stop() { try { n.s.stop(); } catch (e) { } } }; });
    UI.showHUD(false); M.start(this); this.updateObjectivesHUD();
  },
  retry() { const id = this.M.id; AUD.stopAllLoops(); UI.loading('REBUILDING AREA OF OPERATIONS', () => { this.buildMission(id); UI.show(null); this.begin(); }); },
  /* ---------------- frame ---------------- */
  frame(dt) {
    if (this.state === 'menu' || this.state === 'briefing' || this.state === 'loading') { UI.menuFrame(dt); if (this.state === 'briefing') UI.briefFrame(dt); IN.end(); return; }
    if (!this.W) { IN.end(); return; }
    const run = this.state === 'play' || this.state === 'intro' || this.state === 'cine' || this.state === 'dead' || this.state === 'result';
    if (this.state === 'paused') { this.render(); IN.end(); return; }
    if (run) {
      // unified time: rdt = real (player), wdt = world (scaled by slow motion)
      this.updateSlow(dt); const wdt = dt * this.timeScale; this.rdt = dt;
      this.time += wdt; this.wtime = (this.wtime || 0) + wdt; if (this.state === 'play') this.missionTime += dt;
      if (IN.hit('Escape') && (this.state === 'play')) this.pause();
      if (this.cine) this.cine.update(dt);
      if (this.plane) this.updatePlaneObj(wdt);
      if (this.state !== 'result') P.update(dt);
      this.runTimers();
      this.updateWorld(wdt);
      if (this.M && this.state === 'play') this.M.update && this.M.update(this, wdt);
    }
    this.render(); UI.hudFrame(dt); IN.end();
  },
  /* ---------------- game-time scheduler (respects slow motion & pause) ---------------- */
  after(fn, ms) { (this.timers || (this.timers = [])).push({ t: (this.wtime || 0) + ms / 1000, fn }); },
  runTimers() { const T = this.timers; if (!T || !T.length) return; const now = this.wtime; const due = T.filter(x => x.t <= now); this.timers = T.filter(x => x.t > now); for (const x of due) { try { x.fn(); } catch (e) { console.error(e); } } },
  /* ---------------- slow-motion ability ---------------- */
  timeScale: 1, slow: { on: false, t: 0, charge: 1, k: 0 },
  SLOW_DUR: 15, SLOW_RECHARGE: 40,
  triggerSlow() {
    const s = this.slow; if (this.state !== 'play') return;
    if (s.on) { s.t = this.SLOW_DUR; return; }
    if (s.charge < 1) { this.notify('SLOW MOTION RECHARGING — ' + Math.round(s.charge * 100) + '%'); AUD.beep(300, .08, .2); return; }
    s.on = true; s.t = 0; s.charge = 0; AUD.slowFx(true); this.stats && this.stats.slowmo++;
  },
  updateSlow(dt) {
    const s = this.slow; if (IN.hit('KeyG')) this.triggerSlow();
    if (s.on) { s.t += dt; if (s.t >= this.SLOW_DUR || this.state !== 'play' && this.state !== 'intro') { s.on = false; AUD.slowFx(false); } }
    else s.charge = Math.min(1, s.charge + dt / this.SLOW_RECHARGE);
    s.k = damp(s.k, s.on ? 1 : 0, s.on ? 5 : 3.5, dt);
    this.timeScale = lerp(1, .25, s.k); R.post.slow = s.k; AUD.setRate(this.timeScale);
  },
  updateWorld(dt) {
    const W = this.W;
    for (const n of this.npcs) n.update(dt);
    this.updateGroups(dt); this.updateRadio(dt);
    for (const v of this.vehicles) this.updateVehicle(v, v.driver ? this.rdt : dt);
    for (const f of this.extraUpdaters) f(dt);
    this.updateFires(dt);
    for (const c of this.cams) c.update(dt);
    for (const d of W.doors) this.updateDoor(d, dt);
    this.updateProjectiles(dt); this.updateParticles(dt); this.updateTakedown(dt); this.updateDrops(dt); this.updateHostage(dt);
    if (this.searchT > 0) { this.searchT -= dt; if (this.searchT <= 0 && !this.npcs.some(n => n.state === 'combat')) { this.alarm = 0; if (this.siren) { this.siren.stop(); this.siren = null; } } }
    if (this.alarm >= 2 && !this.npcs.some(n => !n.dead && n.state === 'combat') && this.searchT <= 0) this.searchT = 50;
    // visibility (light level)
    this.visT = (this.visT || 0) - dt; if (this.visT <= 0) { this.visT = .15; P.visibility = this.computeVisibility(); }
    // animation (LOD: only nearby / visible characters are re-solved every frame)
    for (const n of this.npcs) { const d = n.distP ?? 0; n.animSkip = (n.animSkip || 0) - 1; if (d > 70 && n.animSkip > 0) continue; n.animSkip = d > 120 ? 6 : d > 70 ? 3 : 0; n.animate(dt * (n.animSkip + 1)); }
    VM.update(dt); P.updateBody(dt);
    for (const h of this.chuteDrops) h.t = Math.min(1, h.t + dt * .8);
    // audio
    if (AUD.ready) { const c = P.camPos || [0, 0, 0]; AUD.indoor = W.inside(c[0], c[2], c[1]) ? 1 : 0; AUD.setListener(c, P.camFwd || [0, 0, -1], P.camUp || [0, 1, 0]); AUD.update(dt); }
    const lvl = this.detectLevel(); if (this.musicLoop) this.musicLoop.setLevel(lvl.state === 'red' ? 2 : lvl.state === 'yellow' ? 1 : 0);
    // dynamic lights decay
    this.dlights = this.dlights.filter(l => (l.life -= dt) > 0);
  },
  /* ---------------- environment ---------------- */
  computeEnv() {
    const e = this.env; const sd = V.norm(e.sunDir);
    this.envU = {
      sunDir: sd, sunCol: V.sc(lin(e.sunCol), e.sunI), sky: V.sc(lin(e.sky), e.skyI), gnd: V.sc(lin(e.gnd), e.gndI), fog: V.sc(lin(e.fog), e.fogI || 1), fogD: e.fogD, fogH: e.fogH || 0,
      expo: e.expo, zen: V.sc(lin(e.zen), e.zenI || 1), hor: V.sc(lin(e.hor), e.horI || 1), night: e.night || 0, cloud: e.cloud ?? .5, wet: e.wet || 0, snow: e.snow || 0, wind: e.wind || 1, rain: e.rain || 0, skyFog: e.skyFog ?? .5,
    };
  },
  computeVisibility() {
    const e = this.env; const W = this.W; const pe = P.eye(); const pc = [pe[0], pe[1] - .5, pe[2]];
    let base = e.vis ?? 1; const sd = this.envU.sunDir;
    if (!e.night) { const h = W.ray(pc, sd, 120, { sight: true, noTerrain: false }); if (h) base *= .45; }
    if (W.inside(pc[0], pc[2], pc[1])) base *= .55;
    let L = 0;
    for (const l of W.lights) {
      if (!l.on || (l.group === 'power' && !this.powerOn)) continue; const d = V.dist(l.pos, pc); if (d > l.range) continue;
      let k = Math.pow(1 - d / l.range, 2) * l.i / 5;
      if (l.dir) { const to = V.sc(V.sub(pc, l.pos), 1 / d); const c = V.dot(to, l.dir); k *= smooth((c - l.cone) / .15); }
      if (k > .02 && !W.los(l.pos, pc)) k *= .1; L += k;
    }
    for (const l of this.dlights) { const d = V.dist(l.pos, pc); if (d < l.range) L += (1 - d / l.range) * .5; }
    return clamp(base + L, .05, 1);
  },
  /* ---------------- detection status ---------------- */
  detectLevel() {
    let st = 'green', meter = 0;
    for (const n of this.npcs) {
      if (n.dead) continue; meter = Math.max(meter, Math.min(1, n.susp));
      if (n.state === 'combat') { st = 'red'; break; }
      if (n.state === 'suspicious' || n.state === 'investigate' || n.state === 'search') st = 'yellow';
    }
    for (const c of this.cams) if (c.alive && c.susp > .1) { meter = Math.max(meter, c.susp); if (st === 'green') st = 'yellow'; }
    if (st === 'green' && this.alarm > 0) st = 'yellow';
    return { state: st, meter };
  },
  /* ---------------- comms ---------------- */
  speak(npc, text, radio) {
    if (!text) return; const d = V.dist(npc.pos, P.pos);
    let dur = text.length * .055;
    if (radio) { dur = AUD.voice(text, npc.voice * 1.05, null, true); this.subtitle(npc.name, text, true); }
    else if (d < 32) { dur = AUD.voice(text, npc.voice, V.add(npc.pos, [0, 1.6, 0])); if (d < 20) this.subtitle(npc.name, text, false); }
    return dur;
  },
  subtitle(who, text, radio) { if (!this.settings.subtitles) return; this.subs.push({ who, text, radio, t: 0, life: Math.max(2.6, text.length * .07) }); if (this.subs.length > 4) this.subs.shift(); UI.dirtySubs = true; },
  notify(text, kind = 'info') { this.notifs.push({ text, kind, t: 0 }); UI.dirtyNotif = true; },
  addGroup(name, lines) { this.groups[name] = { name, lines, idx: Math.floor(Math.random() * lines.length), t: 2 + Math.random() * 4, speaker: null }; },
  updateGroups(dt) {
    for (const k in this.groups) {
      const g = this.groups[k]; const mem = this.npcs.filter(n => n.group === k && !n.dead && n.state === 'calm' && n.task().t === 'talk' && n.taskPhase === 'do');
      if (mem.length < 2) { g.speaker = null; continue; }
      g.t -= dt; if (g.t > 0) continue;
      const line = g.lines[g.idx % g.lines.length]; g.idx++;
      const sp = mem[line[0] % mem.length]; g.speaker = sp;
      const dur = this.speak(sp, line[1], false) || 2; g.t = dur + .7 + Math.random() * .6;
      if (g.idx % g.lines.length === 0) g.t += 6 + Math.random() * 8;
    }
  },
  updateRadio(dt) {
    if (this.state !== 'play' || this.alarm >= 2) return;
    this.radioT -= dt; if (this.radioT > 0) return; this.radioT = 95 + Math.random() * 40;
    const op = this.npcs.find(n => !n.dead && (n.role === 'commander' || n.def.radioOp)); if (!op) return;
    const posts = this.npcs.filter(n => n.post).sort((a, b) => a.post.localeCompare(b.post));
    this.speak(op, 'All posts, status report.', true);
    let t = 3.2;
    for (const n of posts) {
      G.after(() => {
        if (this.state !== 'play') return;
        if (!n.dead && n.state !== 'combat') { this.speak(n, n.post + ', all clear.', true); }
        else if (n.dead) {
          this.speak(op, n.post + ', respond. ' + n.post + '?', true);
          G.after(() => {
            if (this.state !== 'play') return;
            const alive = this.npcs.filter(o => !o.dead && o !== op && o.state === 'calm' && o.role !== 'commander');
            alive.sort((a, b) => V.dist(a.pos, n.pos) - V.dist(b.pos, n.pos)); const s = alive[0];
            if (s) { this.speak(s, "I'll go check on " + n.name + '.', true); s.setSuspicious(V.copy(n.pos), false); s.setState('investigate'); s.suspPt = V.copy(n.pos); s.goTo(n.pos, false); s.susp = .5; }
          }, 2600);
        }
      }, t * 1000); t += 2.4;
    }
  },
  onSpotted(npc) { this.stats.detected = true; },
  alertNearby(npc, r) {
    if (this._alerting) return; this._alerting = true;
    for (const o of this.npcs) {
      if (o === npc || o.dead || o.state === 'combat' || o.tdT >= 0) continue; const d = V.dist(o.pos, npc.pos); if (d > r) continue;
      if (d < 16 || this.W.los(o.eye, npc.eye)) { o.lastKnown = V.copy(npc.lastKnown || P.pos); o.lastSeen = this.time - 1.5; o.setState('combat'); o.alerted = true; o.susp = .9; }
    }
    this._alerting = false;
    if (this.alarm < 2 && !this.alarmPending) {
      this.alarmPending = true;
      G.after(() => {
        this.alarmPending = false; if (this.state !== 'play') return;
        if (npc.dead) { const other = this.npcs.find(n => !n.dead && n.state === 'combat'); if (!other) return; npc = other; }
        this.speak(npc, pick(LINES.alarmRadio), true); this.setAlarm(npc.lastKnown || P.pos);
      }, 2600);
    }
  },
  setAlarm(pos) {
    if (this.alarm >= 2) return; this.alarm = 2; this.stats.alarms++; this.notify('GENERAL ALARM RAISED', 'alarm');
    if (this.M.siren && !this.siren) this.siren = AUD.siren();
    for (const o of this.npcs) { if (o.dead || o.state === 'combat' || o.tdT >= 0) continue; o.alerted = true; if (o.role === 'commander' && this.M.fleeSpot) { o.setState('flee'); o.goTo([this.M.fleeSpot[0], 0, this.M.fleeSpot[1]], true); continue; } o.setState('search'); o.lastKnown = V.add(V.copy(pos), [rnd(-6, 6), 0, rnd(-6, 6)]); o.searchPts = null; o.goTo(o.lastKnown, true); }
    this.searchT = 70;
  },
  raiseSearch(pos) { if (this.alarm < 1) { this.alarm = 1; this.searchT = 40; } },
  globalSearch(pos, by, reason) {
    this.alarm = Math.max(this.alarm, 1); this.searchT = 60;
    if (by && reason === 'body') this.speak(by, 'All units, we have a body. Intruder on site, search the area!', true);
    for (const o of this.npcs) { if (o.dead || o.state === 'combat' || o.tdT >= 0) continue; o.alerted = true; const d = V.dist(o.pos, pos); if (d < 70 || Math.random() < .35) { if (o.role === 'commander') continue; o.setState('search'); o.lastKnown = V.add(V.copy(pos), [rnd(-8, 8), 0, rnd(-8, 8)]); o.searchPts = null; o.goTo(o.lastKnown, Math.random() < .5); } }
  },
  noise(pos, radius, kind) {
    for (const n of this.npcs) {
      if (n.dead) continue; const d = V.dist(n.pos, pos); if (d > radius) continue;
      let eff = radius; if (d > 4 && !this.W.los([pos[0], pos[1] + .8, pos[2]], n.eye)) eff *= .55; if (d > eff) continue;
      n.hear(pos, kind, Math.max(.35, 1 - d / eff));
    }
  },
  smokeBlock(a, b) { let k = 0; for (const s of this.smokes) { const d = V.sub(b, a); const L2 = V.dot(d, d) || 1; const t = clamp(V.dot(V.sub(s.p, a), d) / L2, 0, 1); const q = V.add(a, V.sc(d, t)); const dd = V.dist(q, s.p); if (dd < s.r) k += (1 - dd / s.r) * 2 * s.k; } return k; },
  anchor(name, npc) { const list = this.W.anchors[name]; if (!list || !list.length) return null; if (!npc._anc || npc._ancName !== name) { const free = list.filter(a => !a.taken || a.taken === npc); const a = free[(npc.k * 7 | 0) % Math.max(1, free.length)] || list[0]; if (npc._anc) npc._anc.taken = null; a.taken = npc; npc._anc = a; npc._ancName = name; } return npc._anc; },
  /* ---------------- spawning ---------------- */
  addNPC(def) { const n = new NPC(def, this.rng); const W = this.W; n.pos[1] = def.elevated ? W.ground(n.pos[0], n.pos[2], 200, 300, .3) : W.ground(n.pos[0], n.pos[2], W.th(n.pos[0], n.pos[2]) + 2.3, .2); if (def.y !== undefined) n.pos[1] = def.y; this.npcs.push(n); return n; },
  addCam(pos, yaw, sweep, power) { const c = new SecCam(pos, yaw, sweep); c.needsPower = !!power; this.cams.push(c); if (!this.camMesh) this.camMesh = buildSecurityCam(); const cl = this.W.colBox(pos[0], pos[1], pos[2], .25, .2, .25, { surf: 'metal', ref: { kind: 'cam', cam: c } }); c.col = cl; return c; },
  /* ---------------- combat ---------------- */
  fireRay(o, d, dmg, shooter, weapon) {
    const W = this.W; const range = 420;
    const wh = W.ray(o, d, range, { bullet: true });
    let bestN = null, bt = wh ? wh.t : range, bpart = null;
    for (const n of this.npcs) {
      if (n.dead && n.deathT > 1.5) continue; const c = V.add(n.pos, [0, 1, 0]); const oc = V.sub(c, o); const t = V.dot(oc, d); if (t < 0 || t > bt) continue;
      const perp = V.len(V.sub(oc, V.sc(d, t))); if (perp > 1.4) continue; const h = n.hitTest(o, d); if (h && h.t < bt) { bt = h.t; bestN = n; bpart = h.part; }
    }
    const end = V.add(o, V.sc(d, bt));
    if (!(P.weps[weapon] && P.weps[weapon].suppressed)) this.tracer(VM.gun ? VM.muzzleWorld() : o, end);
    if (bestN) {
      const wasAlive = !bestN.dead; bestN.damage(dmg, o, bpart, weapon); if (wasAlive) { this.stats.hits++; UI.hitmarker(bestN.dead); if (bestN.dead && bpart === 'head') this.stats.headshots++; }
      this.blood(end, d); AUD.impact('flesh', end); return;
    }
    if (wh) this.impact(wh, d, dmg);
  },
  impact(h, d, dmg) {
    const s = h.surf; const p = h.p, n = h.n;
    AUD.impact(s === 'glass' ? 'glass' : s, p);
    if (h.c && h.c.ref) { const r = h.c.ref; if (r.kind === 'glass') return this.breakGlass(r); if (r.kind === 'crate' || r.kind === 'barrel') { r.hp -= dmg; if (r.hp <= 0) this.destroy(r); } if (r.kind === 'cam') { r.cam.alive = false; h.c.on = false; this.sparks(p); this.notify('CAMERA DISABLED'); return; } if (r.kind === 'light') { r.light.on = false; r.light.broken = true; AUD.glass(p); h.c.on = false; } }
    const col = { wood: [.45, .35, .22], metal: [1, .8, .4], water: [.7, .75, .7], mud: [.25, .2, .14], snow: [.9, .92, .95], grass: [.3, .32, .18] }[s] || [.6, .58, .55];
    if (s === 'metal') this.sparks(p, n); else if (s === 'water') this.splash(p, 10);
    else for (let i = 0; i < 8; i++) this.particles.push({ p: V.add(p, V.sc(n, .03)), v: V.add(V.sc(n, rnd(1, 3)), [rnd(-1, 1), rnd(0, 2), rnd(-1, 1)]), life: 0, max: rnd(.4, .9), s: rnd(.03, .07), c: col, a: .9, g: 9, drag: 2 });
    this.particles.push({ p: V.add(p, V.sc(n, .05)), v: V.sc(n, .4), life: 0, max: 1.4, s: .12, grow: .6, c: V.sc(col, 1.1), a: .45, g: -.2, drag: 1.5 });
    if (s !== 'water' && h.c && !h.c.ref) this.decal(p, n);
    this.noise(p, 9, 'impact');
  },
  decal(p, n) {
    const t = Math.abs(n[1]) > .9 ? [1, 0, 0] : V.norm(V.cross(n, [0, 1, 0])); const b = V.cross(n, t);
    this.decals.push({ p: V.add(p, V.sc(n, .012)), flat: [t, b], s: .05, c: [.03, .03, .03], a: .9, life: 0, max: 1e9, decal: true });
    if (this.decals.length > 120) this.decals.shift();
  },
  blood(p, d) { for (let i = 0; i < 10; i++) this.particles.push({ p: V.copy(p), v: V.add(V.sc(d, rnd(1, 3)), [rnd(-1, 1), rnd(-.5, 1.5), rnd(-1, 1)]), life: 0, max: rnd(.3, .7), s: rnd(.03, .08), c: [.35, .02, .02], a: .95, g: 9, drag: 1 }); this.particles.push({ p: V.copy(p), v: [0, .1, 0], life: 0, max: .5, s: .25, grow: 1, c: [.3, .03, .03], a: .5, drag: 1 }); },
  sparks(p, n = [0, 1, 0]) { AUD.sparks(p); for (let i = 0; i < 10; i++) { const v = V.add(V.sc(n, rnd(1, 4)), [rnd(-2, 2), rnd(0, 3), rnd(-2, 2)]); this.particles.push({ p: V.copy(p), v, life: 0, max: rnd(.15, .45), s: .3, w: .012, c: [1, .7, .3], a: 1, add: true, g: 9, streak: true, dir: V.norm(v) }); } this.dlights.push({ pos: V.copy(p), col: [1, .7, .3], i: 2, range: 4, life: .05 }); },
  splash(p, n = 8) { for (let i = 0; i < n; i++) this.particles.push({ p: V.add(p, [rnd(-.2, .2), .05, rnd(-.2, .2)]), v: [rnd(-.8, .8), rnd(1.5, 3.5), rnd(-.8, .8)], life: 0, max: rnd(.4, .8), s: rnd(.03, .07), c: [.6, .66, .62], a: .7, g: 9.8, drag: .5 }); this.particles.push({ p: [p[0], p[1] + .02, p[2]], v: [0, 0, 0], life: 0, max: 1, s: .2, grow: 1.2, c: [.7, .75, .7], a: .4, flat: [[1, 0, 0], [0, 0, 1]] }); },
  tracer(a, b) { const d = V.sub(b, a); const L = V.len(d); if (L < 2) return; const dir = V.sc(d, 1 / L); const sp = 380; this.particles.push({ p: V.add(a, V.sc(dir, 2)), v: V.sc(dir, sp), life: 0, max: Math.min(.6, (L - 2) / sp), s: 1.2, w: .012, c: [1, .85, .55], a: .9, add: true, streak: true, dir }); },
  muzzleFlash(W) {
    const mp = VM.muzzleWorld(); const f = P.camFwd; const big = W.type === 'rifle';
    this.vmParticles.push({ p: V.add(mp, V.sc(f, big ? .03 : .01)), v: [0, 0, 0], life: 0, max: .05, s: big ? .09 : .03, c: big ? [1, .75, .4] : [.7, .6, .5], a: 1, add: true, rot: Math.random() * 3 });
    if (big) this.vmParticles.push({ p: V.add(mp, V.sc(f, .09)), v: [0, 0, 0], life: 0, max: .04, s: .05, c: [1, .9, .6], a: 1, add: true, rot: Math.random() * 3 });
    this.particles.push({ p: V.add(mp, V.sc(f, .1)), v: V.add(V.sc(f, .6), [0, .3, 0]), life: 0, max: 1, s: .06, grow: .6, c: [.55, .55, .55], a: .25, drag: 2, g: -.3 });
    if (!W.suppressed || big) this.dlights.push({ pos: V.add(mp, V.sc(f, .3)), col: [1, .7, .35], i: big ? 4 : 1, range: big ? 9 : 4, life: .045 });
    // shell casing
    const ej = VM.ejectWorld(); const r = P.camRight;
    this.particles.push({ p: ej, v: V.add(V.add(V.sc(r, rnd(2, 3)), [0, rnd(1.5, 2.5), 0]), V.sc(f, -.3)), life: 0, max: 1.2, s: .012, c: [.75, .58, .2], a: 1, g: 9.8, drag: .2, bounce: true, shell: true });
    AUD.shell(ej);
  },
  npcShoot(n, d) {
    const W = n.W; const mp = V.add(n.rig.bonePos(SK.WPN), V.sc([-Math.sin(n.yaw), Math.sin(n.aimPitch), -Math.cos(n.yaw)], .6));
    AUD.shot(W.snd, mp); this.dlights.push({ pos: mp, col: [1, .7, .35], i: 3, range: 7, life: .05 });
    this.particles.push({ p: mp, v: [0, 0, 0], life: 0, max: .05, s: .15, c: [1, .75, .4], a: 1, add: true });
    this.noise(mp, 110, 'shot');
    const target = P.state === 'vehicle' && P.vehicle ? V.add(P.vehicle.pos, [0, 1.3, 0]) : V.sub(P.eye(), [0, .35, 0]);
    let acc = W.acc * clamp(1.15 - d / W.range, .12, 1.15); if (P.speed > 3) acc *= .65; if (P.crouch > .5) acc *= .8; acc *= .55 + .45 * P.visibility; if (n.crouch > .5) acc *= .85;
    if (P.state === 'vehicle') acc *= .7; acc *= .85 + this.diffMul * .15;
    const pellets = n.wt === 'shotgun' ? 5 : 1;
    for (let i = 0; i < pellets; i++) {
      const hit = Math.random() < acc / (pellets > 1 ? 2.2 : 1) && this.W.los(mp, target);
      if (hit) { P.hurt(W.dmg * this.dmgMul / (pellets > 1 ? 2 : 1) * rnd(.8, 1.2), n.pos); if (P.state === 'vehicle' && P.vehicle) AUD.impact('metal', target); }
      else {
        const miss = V.add(target, [rnd(-1.6, 1.6), rnd(-1, 1.2), rnd(-1.6, 1.6)]); const dir = V.norm(V.sub(miss, mp));
        const h = this.W.ray(mp, dir, d + 30, { bullet: true }); if (h) this.impact(h, dir, 5);
        if (V.dist(miss, target) < 2.2 && Math.random() < .6) AUD.swoosh(.25, miss, 3000, .1);
        if (i === 0) this.tracer(mp, h ? h.p : V.add(mp, V.sc(dir, 80)));
      }
    }
  },
  meleeHit(dmg, range, knife) {
    const e = P.eye(), f = P.fwd(); let best = null, bd = range;
    for (const n of this.npcs) { if (n.dead) continue; const c = V.add(n.pos, [0, 1.2, 0]); const d = V.dist(c, e); if (d > bd + .4) continue; const to = V.norm(V.sub(c, e)); if (V.dot(to, f) < .6) continue; best = n; bd = d; }
    if (best) {
      const toP = Math.atan2(-(P.pos[0] - best.pos[0]), -(P.pos[2] - best.pos[2])); const behind = Math.abs(angDiff(best.yaw, toP)) > 1.9;
      const unaware = best.state !== 'combat';
      AUD.melee(true); this.blood(V.add(best.pos, [0, 1.3, 0]), f);
      if (knife && (unaware || behind)) { this.stats.knifeKills++; best.damage(999, e, 'chest', 'knife'); }
      else best.damage(dmg, e, 'chest', knife ? 'knife' : 'melee');
      this.noise(best.pos, 5, 'melee'); return;
    }
    const h = this.W.ray(e, f, range, { bullet: true });
    if (h) { AUD.impact(h.surf, h.p); if (h.c && h.c.ref && (h.c.ref.kind === 'glass')) this.breakGlass(h.c.ref); else if (h.c && h.c.ref && h.c.ref.kind === 'crate') { h.c.ref.hp -= 30; if (h.c.ref.hp <= 0) this.destroy(h.c.ref); } this.noise(h.p, 5, 'impact'); P.shake = .2; }
    else AUD.melee(false);
  },
  killNPC(n, from, part, kind) {
    if (P.hostage && P.hostage.n === n && P.hostage.phase !== 'kill') P.hostage = null;
    if (n.civ) { this.stats.civKilled = (this.stats.civKilled || 0) + 1; this.notify('CIVILIAN CASUALTY — PAYOUT REDUCED', 'alarm'); }
    const wasState = n.state; n.dead = true; n.deathAt = this.time; n.deathT = 0; n.hp = 0; n.state = 'dead';
    const toS = Math.atan2(-(from[0] - n.pos[0]), -(from[2] - n.pos[2])); n.fallDir = Math.abs(angDiff(n.yaw, toS)) < Math.PI / 2 ? 1 : -1;
    this.stats.kills++; if (wasState !== 'combat' && wasState !== 'search') this.stats.stealthKills++;
    if (n._anc) { n._anc.taken = null; n._anc = null; }
    this.noise(n.pos, 6, 'body'); AUD.impact('wood', n.pos);
    if (n.W) { // weapon physically drops from the hands and stays in the world
      const wm = M4.copy(M4.create(), n.rig.mats[SK.WPN]); const wp = M4.pos(wm); if (wm[15] === 0) { wp[0] = n.pos[0]; wp[1] = n.pos[1] + 1; wp[2] = n.pos[2]; }
      const mesh = this.W.getMesh('npcw_' + n.wt, B => { B.b(0); buildNpcWeapon(B, n.wt); });
      const it = { kind: 'item', item: 'ammo', ammo: true, mesh, m: M4.create(), pos: V.copy(wp), r: .8, alive: true };
      it.drop = { v: [rnd(-1, 1), 1, rnd(-1, 1)], yaw: n.yaw + rnd(-1, 1), roll: 0, t: 0 };
      this.W.items.push(it); this.W.dyn.push(it); this.drops = this.drops || []; this.drops.push(it);
    }
    // witnesses
    for (const o of this.npcs) {
      if (o === n || o.dead || o.state === 'combat') continue; const d = V.dist(o.pos, n.pos); if (d > 26) continue;
      const to = V.norm(V.sub(n.pos, o.pos)); const f = o.fwd; if (to[0] * f[0] + to[2] * f[2] < .3 && d > 4) continue; if (!this.W.los(o.eye, V.add(n.pos, [0, 1.2, 0]))) continue;
      n.discovered = true; if (o.civ) { o.panic(n.pos, true); continue; } o.say('body');
      if (o.canSee || V.dist(o.pos, P.pos) < 12) { o.lastKnown = V.copy(P.pos); o.enterCombat(true); }
      else G.after(() => { if (!o.dead) this.globalSearch(n.pos, o, 'body'); }, 1500);
    }
    if (kind === 'knifeThrow' || kind === 'knife') { }
    this.M.onKill && this.M.onKill(this, n);
  },
  breakGlass(g) {
    if (!g.alive) return; g.alive = false; this.W.removeDyn(g); g.col.on = false; AUD.glass(g.pos); this.noise(g.pos, 20, 'glass');
    for (let i = 0; i < 30; i++) this.particles.push({ p: V.add(g.pos, [rnd(-.5, .5) * g.size[0], rnd(-.5, .5) * g.size[1], rnd(-.5, .5) * g.size[2]]), v: [rnd(-1.5, 1.5), rnd(-.5, 1.5), rnd(-1.5, 1.5)], life: 0, max: rnd(.8, 1.5), s: rnd(.02, .05), c: [.7, .8, .85], a: .8, g: 9.8, drag: .3, bounce: true });
  },
  destroy(o) {
    if (!o.alive) return; o.alive = false; this.W.removeDyn(o); o.col.on = false;
    if (o.kind === 'crate') { AUD.impact('wood', o.pos); AUD.impact('wood', o.pos); this.noise(o.pos, 14, 'crate'); for (let i = 0; i < 26; i++) this.particles.push({ p: V.add(o.pos, [rnd(-.4, .4), rnd(-.4, .4), rnd(-.4, .4)]), v: [rnd(-2.5, 2.5), rnd(1, 4), rnd(-2.5, 2.5)], life: 0, max: rnd(2, 4), s: rnd(.05, .14), c: V.sc(linA(hexCol(o.c)).map(Math.sqrt), 1), a: 1, g: 9.8, drag: .4, bounce: true }); }
    if (o.explosive) this.explode(o.pos, 7, 160);
  },
  explode(p, r, dmg) {
    AUD.explosion(p); this.noise(p, 180, 'explosion'); this.dlights.push({ pos: V.add(p, [0, 1, 0]), col: [1, .6, .25], i: 14, range: 26, life: .35 });
    for (let i = 0; i < 40; i++) this.particles.push({ p: V.add(p, [rnd(-.5, .5), rnd(0, 1), rnd(-.5, .5)]), v: [rnd(-6, 6), rnd(2, 10), rnd(-6, 6)], life: 0, max: rnd(.3, .8), s: rnd(.4, 1), grow: 1.5, c: [1, rnd(.4, .7), .15], a: 1, add: true, drag: 3 });
    for (let i = 0; i < 25; i++) this.particles.push({ p: V.add(p, [rnd(-1, 1), rnd(0, 2), rnd(-1, 1)]), v: [rnd(-2, 2), rnd(1, 4), rnd(-2, 2)], life: 0, max: rnd(3, 6), s: rnd(.8, 1.6), grow: 1.2, c: [.12, .11, .1], a: .7, drag: 1.2, g: -.3 });
    for (let i = 0; i < 16; i++) { const v = [rnd(-12, 12), rnd(4, 14), rnd(-12, 12)]; this.particles.push({ p: V.copy(p), v, life: 0, max: rnd(.5, 1.2), s: .6, w: .03, c: [1, .7, .3], a: 1, add: true, g: 9.8, streak: true, dir: V.norm(v) }); }
    for (const n of this.npcs) { if (n.dead) continue; const d = V.dist(V.add(n.pos, [0, 1, 0]), p); if (d < r) { n.damage(dmg * (1 - d / r) + 20, p, 'chest', 'explosion'); n.flinch = 1; } }
    const pd = V.dist(P.eye(), p); if (pd < r * 1.4) P.hurt(dmg * .7 * (1 - pd / (r * 1.4)), p); P.shake = Math.max(P.shake, clamp(1.5 - pd / 30, 0, 1.5));
    for (const o of this.W.destr) { if (!o.alive) continue; const d = V.dist(o.pos, p); if (d < r) { if (o.kind === 'glass') this.breakGlass(o); else if (o.kind === 'crate' || (o.kind === 'barrel' && d > .5)) G.after(() => this.destroy(o), 120 + d * 30); } }
    this.decalBig(p);
  },
  decalBig(p) { const gy = this.W.ground(p[0], p[2], p[1] + .5, 1); this.decals.push({ p: [p[0], gy + .02, p[2]], flat: [[1, 0, 0], [0, 0, 1]], s: 2.2, c: [.02, .02, .02], a: .85, life: 0, max: 1e9, decal: true }); },
  /* ---------------- projectiles: thrown knife & gadgets ---------------- */
  emp(p) {
    AUD.explosion(p); AUD.beep(3000, .3, .4, p); this.dlights.push({ pos: V.add(p, [0, 1, 0]), col: [.3, .6, 1], i: 8, range: 18, life: .3 });
    for (let i = 0; i < 30; i++) { const v = [rnd(-8, 8), rnd(0, 6), rnd(-8, 8)]; this.particles.push({ p: V.add(p, [0, .3, 0]), v, life: 0, max: rnd(.2, .5), s: .4, w: .015, c: [.4, .7, 1], a: 1, add: true, streak: true, dir: V.norm(v) }); }
    let n = 0; for (const c of this.cams) if (c.alive && V.dist(c.pos, p) < 18) { c.empT = 25; n++; }
    for (const l of this.W.lights) if (l.on && V.dist(l.pos, p) < 18) { l.on = false; l.empOff = true; this.after(() => { if (!l.broken) l.on = true; }, 25000); }
    this.noise(p, 20, 'impact'); this.notify('EMP — ' + n + ' CAMERA(S) AND NEARBY LIGHTS DISABLED', 'good');
  },
  spawnThrownKnife() {
    const e = P.eye(), f = P.fwd(); this.projectiles.push({ kind: 'knife', dmg: P.weps.knife.throwDmg, p: V.add(e, V.sc(f, .5)), v: V.add(V.sc(f, P.weps.knife.throwSpeed), [0, 1.2, 0]), spin: 0, t: 0, m: M4.create(), mesh: this.W.getMesh('item_knife', B => { B.b(0); buildItemGeo(B, 'knife'); }) });
  },
  throwGadget(kind) {
    const e = P.eye(), f = P.fwd(); this.projectiles.push({ kind, p: V.add(e, V.sc(f, .5)), v: V.add(V.sc(f, 13), [0, 3, 0]), spin: 0, t: 0, m: M4.create(), mesh: this.W.getMesh('item_' + kind, B => { B.b(0); buildItemGeo(B, kind); }) });
  },
  updateProjectiles(dt) {
    const W = this.W;
    for (const pr of this.projectiles) {
      if (pr.landed) { pr.t += dt; if (pr.kind === 'emp' && !pr.fired) { pr.fired = true; this.emp(pr.p); } if (pr.kind === 'noisemaker' && pr.t < 9) { pr.beep = (pr.beep || 0) - dt; if (pr.beep <= 0) { pr.beep = 1.1; AUD.beep(1900, .07, .5, pr.p); AUD.beep(1400, .07, .4, pr.p); this.noise(pr.p, 24, 'gadget'); } } if (pr.kind === 'smoke' && pr.t < 16) { pr.em = (pr.em || 0) - dt; if (pr.em <= 0) { pr.em = .08; this.particles.push({ p: V.add(pr.p, [rnd(-.3, .3), .2, rnd(-.3, .3)]), v: [rnd(-.8, .8), rnd(.3, 1.2), rnd(-.8, .8)], life: 0, max: 6, s: .8, grow: .5, c: [.62, .64, .62], a: .55, drag: .6 }); } if (!pr.smoke) { pr.smoke = { p: V.add(pr.p, [0, 1.2, 0]), r: 0, k: 1 }; this.smokes.push(pr.smoke); AUD.swoosh(.5, pr.p, 500, 3); } pr.smoke.r = Math.min(5.5, pr.t * 1.4); } if (pr.kind === 'smoke' && pr.t > 18 && pr.smoke) { this.smokes.splice(this.smokes.indexOf(pr.smoke), 1); pr.smoke = null; } continue; }
      pr.t += dt; pr.v[1] -= 9.8 * dt; const np = V.add(pr.p, V.sc(pr.v, dt)); pr.spin += dt * (pr.kind === 'knife' ? 22 : 9);
      const d = V.sub(np, pr.p); const L = V.len(d); const dir = V.sc(d, 1 / (L || 1));
      if (pr.kind === 'knife') { // hit NPCs
        let hitN = null; for (const n of this.npcs) { if (n.dead) continue; const h = n.hitTest(pr.p, dir); if (h && h.t < L) { hitN = [n, h]; break; } }
        if (hitN) { const [n, h] = hitN; const was = n.state; n.damage(n.state === 'combat' ? (h.part === 'head' ? 200 : (pr.dmg || 90)) : 999, pr.p, h.part, 'knife'); this.blood(V.add(pr.p, V.sc(dir, h.t)), dir); AUD.impact('flesh', pr.p); if (n.dead) this.stats.knifeKills++; UI.hitmarker(n.dead); const gp = [n.pos[0] + rnd(-.4, .4), 0, n.pos[2] + rnd(-.4, .4)]; gp[1] = W.ground(gp[0], gp[2], n.pos[1] + .5, 1) + .02; W.addItem('knife', gp, Math.random() * 6, { pitch: Math.PI / 2, roll: 0 }); pr.dead = true; continue; }
      }
      const h = W.ray(pr.p, dir, L + .05, { bullet: true });
      if (h) {
        AUD.impact(h.surf, h.p); this.noise(h.p, pr.kind === 'knife' ? 7 : 6, pr.kind === 'knife' ? 'knife' : 'impact');
        if (h.c && h.c.ref && h.c.ref.kind === 'glass') { this.breakGlass(h.c.ref); pr.p = np; continue; }
        if (pr.kind === 'knife') {
          if (Math.abs(h.n[1]) < .5 && h.surf === 'wood' && Math.random() < .8) { // stick into wood
            const p = V.sub(h.p, V.sc(dir, .03)); const yaw = Math.atan2(-dir[0], -dir[2]); W.addItem('knife', p, yaw, { pitch: -Math.PI / 2 + Math.asin(clamp(dir[1], -1, 1)), stuck: true });
          } else { const gp = [h.p[0] - dir[0] * .2, 0, h.p[2] - dir[2] * .2]; gp[1] = W.ground(gp[0], gp[2], h.p[1] + .3, .6) + .015; W.addItem('knife', gp, Math.random() * 6, { pitch: Math.PI / 2 }); }
          pr.dead = true; continue;
        }
        // gadget bounces then lands
        if (h.n[1] > .6 || V.len(pr.v) < 3) { pr.p = V.add(h.p, [0, .04, 0]); pr.landed = true; pr.t = 0; pr.v = [0, 0, 0]; }
        else { const vn = V.dot(pr.v, h.n); pr.v = V.sc(V.sub(pr.v, V.sc(h.n, 2 * vn)), .4); pr.p = V.add(h.p, V.sc(h.n, .05)); }
        continue;
      }
      pr.p = np;
      if (pr.t > 8) pr.dead = true;
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);
    for (const pr of this.projectiles) { if (pr.kind === 'knife') M4.trs(pr.m, M4.create(), pr.p[0], pr.p[1], pr.p[2], -pr.spin, Math.atan2(-pr.v[0], -pr.v[2]), 0); else M4.trs(pr.m, M4.create(), pr.p[0], pr.p[1], pr.p[2], pr.landed ? 0 : pr.spin, pr.landed ? 0 : pr.spin * .7, 0); }
  },
  updateDrops(dt) {
    if (!this.drops) return; const W = this.W;
    for (const it of this.drops) { const d = it.drop; if (!d) continue; d.t += dt; d.v[1] -= 9.8 * dt; it.pos[0] += d.v[0] * dt; it.pos[1] += d.v[1] * dt; it.pos[2] += d.v[2] * dt; d.roll = Math.min(Math.PI / 2, d.roll + dt * 5);
      const gy = W.ground(it.pos[0], it.pos[2], it.pos[1] + .3, .5, .05) + .04; if (it.pos[1] <= gy) { it.pos[1] = gy; if (d.v[1] < -2) { d.v[1] *= -.25; d.v[0] *= .4; d.v[2] *= .4; AUD.impact('metal', it.pos); } else { it.drop = null; d.roll = Math.PI / 2; } }
      M4.trs(it.m, M4.create(), it.pos[0], it.pos[1], it.pos[2], 0, d.yaw, d.roll); }
    this.drops = this.drops.filter(i => i.drop);
  },
  updateParticles(dt) {
    const W = this.W; const upd = list => {
      for (const p of list) {
        p.life += dt; if (p.decal) continue; if (p.g) p.v[1] -= p.g * dt; if (p.drag) { const k = Math.exp(-p.drag * dt); p.v[0] *= k; p.v[1] *= k; p.v[2] *= k; }
        p.p[0] += p.v[0] * dt; p.p[1] += p.v[1] * dt; p.p[2] += p.v[2] * dt; if (p.grow) p.s += p.grow * dt;
        if (p.streak && p.g) p.dir = V.norm(p.v);
        if (p.bounce) { const gy = W.ground(p.p[0], p.p[2], p.p[1] + .3, .3, .02); if (p.p[1] < gy) { p.p[1] = gy + .005; if (p.v[1] < -1) { p.v[1] *= -.3; p.v[0] *= .5; p.v[2] *= .5; } else { p.v = [0, 0, 0]; p.g = 0; p.max = Math.max(p.max, p.life + (p.shell ? 6 : 3)); } } }
      }
    };
    upd(this.particles); upd(this.vmParticles);
    this.particles = this.particles.filter(p => p.life < p.max); this.vmParticles = this.vmParticles.filter(p => p.life < p.max);
    if (this.particles.length > 2500) this.particles.splice(0, this.particles.length - 2500);
    // weather particles near camera
    const e = this.env, c = P.camPos || [0, 0, 0];
    if (e.rain) for (let i = 0; i < 40 * e.rain; i++) { const p = [c[0] + rnd(-18, 18), c[1] + rnd(4, 14), c[2] + rnd(-18, 18)]; this.particles.push({ p, v: [1.5, -16, .5], life: 0, max: .9, s: .32, w: .006, c: [.65, .7, .75], a: .35, streak: true, dir: V.norm([1.5, -16, .5]), rain: true }); }
    if (e.snowfall) for (let i = 0; i < 14 * e.snowfall; i++) { const p = [c[0] + rnd(-20, 20), c[1] + rnd(-2, 12), c[2] + rnd(-20, 20)]; this.particles.push({ p, v: [rnd(2, 5), rnd(-1.5, -.6), rnd(-1, 1)], life: 0, max: 4, s: rnd(.02, .045), c: [.95, .96, 1], a: .85, drag: 0 }); }
    if (e.fireflies && Math.random() < .5) { const p = [c[0] + rnd(-25, 25), 0, c[2] + rnd(-25, 25)]; p[1] = W.th(p[0], p[2]) + rnd(.5, 2.5); if (p[1] > W.waterY) this.particles.push({ p, v: [rnd(-.3, .3), rnd(-.1, .2), rnd(-.3, .3)], life: 0, max: rnd(2, 4), s: .05, c: [.7, 1, .3], a: 1, add: true, firefly: true }); }
    if (e.rain) { // rain hits on water / ground: remove when below ground
      for (const p of this.particles) if (p.rain && p.p[1] < W.th(p.p[0], p.p[2]) + .05) p.life = p.max;
    }
  },
  /* ---------------- doors ---------------- */
  openDoor(d, from, npc) {
    if (d.locked) {
      if (!npc && d.key && P.mission.includes(d.key)) { d.locked = false; this.notify('UNLOCKED: ' + d.label); AUD.beep(1200, .1, .3, d.pos); }
      else { if (!npc) { AUD.click(600, .5, d.pos, .05); AUD.click(900, .4, d.pos, .04); this.notify(d.key ? 'LOCKED — REQUIRES ' + ITEMDEF[d.key].name : 'LOCKED'); } return; }
    }
    const want = d.target > .5 ? 0 : 1;
    if (want === 1) {
      const a = d.yaw0 + .7; const tip = [d.hinge[0] + Math.cos(a) * d.w * .5, d.hinge[2] - Math.sin(a) * d.w * .5]; const c = [d.center[0], d.center[2]];
      const sw = [tip[0] - c[0], tip[1] - c[1]], tf = [from[0] - c[0], from[2] - c[1]]; d.openDir = (sw[0] * tf[0] + sw[1] * tf[1]) > 0 ? -1 : 1;
    }
    d.target = want; d.moving = true; d.col.on = false; AUD.door(d.pos, want === 1); this.noise(d.center, 6, 'door');
    if (npc) d.npcOpened = this.time;
  },
  updateDoor(d, dt) {
    if (!d.moving) return; const tgt = d.target * Math.PI / 2 * .94; d.ang = damp(d.ang, tgt, 5, dt);
    if (Math.abs(d.ang - tgt) < .01) { d.ang = tgt; d.moving = false; this.W.updateDoorCol(d); d.col.on = true; }
    this.W.doorMat(d);
    // never close a door onto the player
  },
  /* ---------------- interactables ---------------- */
  interactables() {
    const out = []; const pp = P.state === 'plane' ? null : P.pos; const W = this.W;
    for (const it of W.interact) { if (pp && it.pos && typeof it.pos !== 'function' && V.dist2(it.pos, pp) > 5) continue; out.push(it); }
    if (!pp) return out;
    for (const d of W.doors) {
      if (Math.abs(d.center[0] - pp[0]) > 3 || Math.abs(d.center[2] - pp[2]) > 3) continue;
      if (!d._it) { d._it = { door: d, r: 2, pos: () => { const a = d.yaw0 + d.ang * d.openDir; return [d.hinge[0] + Math.cos(a) * (d.w - .1), d.y0 + 1, d.hinge[2] - Math.sin(a) * (d.w - .1)]; }, wide: true, label: () => d.moving ? '' : d.locked && !(d.key && P.mission.includes(d.key)) ? (d.key ? 'LOCKED — ' + ITEMDEF[d.key].name + ' REQUIRED' : 'LOCKED') : (d.target > .5 ? '[E] CLOSE ' : '[E] OPEN ') + d.label, anim: 'door', dur: .7, at: .4, act: () => this.openDoor(d, P.pos, false) }; }
      out.push(d._it);
    }
    for (const it of W.items) {
      if (!it.alive) continue; if (V.dist2(it.pos, pp) > 3) continue;
      if (!it._it) it._it = { r: 2, pos: it.pos, wide: true, label: () => '[E] PICK UP ' + (it.ammo ? 'AMMUNITION' : ITEMDEF[it.item].name), anim: 'pickup', item: it.item === 'ammo' ? 'ammo' : it.item, dur: 1, at: .42, act: () => this.pickup(it) };
      out.push(it._it);
    }
    for (const n of this.npcs) {
      const d = V.dist2(n.pos, pp); if (d > 3) continue;
      if (n.dead && !n.searched && n.deathT > 1) { if (!n._sit) n._sit = { r: 2.2, wide: true, pos: () => n.rig.bonePos(SK.CH), label: '[E] SEARCH BODY (HOLD)', hold: 1.4, anim: 'search', act: () => this.searchBody(n) }; out.push(n._sit); }
      if (!n.dead && n.tdT < 0 && n.state !== 'combat' && n.state !== 'hostage' && !P.hostage && P.state === 'ground' && d < 1.8) {
        const toP = Math.atan2(-(P.pos[0] - n.pos[0]), -(P.pos[2] - n.pos[2])); const behind = Math.abs(angDiff(n.yaw, toP)) > 1.75 || (n.anim === 'sit' && Math.abs(angDiff(n.yaw, toP)) > 1.4);
        if (behind) { if (!n._tdit) n._tdit = { key: 'KeyF', r: 2.2, wide: true, pos: () => V.add(n.pos, [0, 1.4, 0]), label: () => this.canGrab(n) ? '[F] GRAB AS HOSTAGE' : P.thrownKnife ? '[F] SILENT TAKEDOWN (CHOKE)' : '[F] SILENT TAKEDOWN', instant: true, act: () => this.canGrab(n) ? this.startHostage(n) : this.startTakedown(n) }; out.push(n._tdit); }
      }
    }
    return out;
  },
  pickup(it) {
    it.alive = false; this.W.removeDyn(it); const i = this.W.items.indexOf(it); if (i >= 0) this.W.items.splice(i, 1);
    AUD.mech('pickup');
    if (it.item === 'knife') { P.inv[2] = { k: 'knife' }; P.thrownKnife = false; this.notify(P.weps.knife.name + ' RECOVERED'); return; }
    if (it.ammo) { for (const k in P.ammo) P.ammo[k].res += Math.round(P.weps[k].mag * 1.5); this.notify('AMMUNITION +'); return; }
    if (it.item === 'noisemaker' || it.item === 'smoke') { if (!P.inv[4]) P.inv[4] = { k: it.item, item: true, count: 1 }; else if (P.inv[4].k === it.item) P.inv[4].count++; this.notify(ITEMDEF[it.item].name + ' +1'); return; }
    P.mission.push(it.item); P.missionSel = P.mission.length - 1; this.notify('ACQUIRED: ' + ITEMDEF[it.item].name);
    this.M.onPickup && this.M.onPickup(this, it.item);
  },
  searchBody(n) {
    n.searched = true; AUD.mech('pickup');
    const k = P.rifleKey; P.ammo.pistol.res += 8; P.ammo[k].res += n.wt === 'shotgun' || n.wt === 'pistol' ? 6 : 15;
    let msg = 'AMMUNITION SALVAGED'; if (n.loot) { for (const l of [].concat(n.loot)) { P.mission.push(l); msg = 'ACQUIRED: ' + ITEMDEF[l].name; this.M.onPickup && this.M.onPickup(this, l); } P.missionSel = P.mission.length - 1; n.loot = null; }
    this.notify(msg);
  },
  /* ---------------- takedowns ---------------- */
  startTakedown(n) {
    P.takedown = { n, t: 0, start: V.copy(P.pos), yaw0: P.yaw }; P.anim = { k: 'takedown', t: 0, d: P.weps.knife.td }; n.tdT = 0; n.state = 'takedown'; n.path = null; P.ads = 0;
    AUD.swoosh(.4, null, 600, .3); this.stats.takedowns++;
    // witness check
    for (const o of this.npcs) { if (o === n || o.dead) continue; const d = V.dist(o.pos, n.pos); if (d > 24) continue; const to = V.norm(V.sub(n.pos, o.pos)); const f = o.fwd; if (to[0] * f[0] + to[2] * f[2] < .35 && d > 3.5) continue; if (!this.W.los(o.eye, V.add(n.pos, [0, 1.3, 0]))) continue; o.lastKnown = V.copy(P.pos); G.after(() => !o.dead && o.state !== 'combat' && o.enterCombat(true), 500); }
  },
  updateTakedown(dt) {
    const T = P.takedown; if (!T) return; T.t += dt; const n = T.n;
    const behind = [n.pos[0] + Math.sin(n.yaw) * .55, P.pos[1], n.pos[2] + Math.cos(n.yaw) * .55];
    const k = smooth(T.t / .25); P.pos[0] = lerp(T.start[0], behind[0], k); P.pos[2] = lerp(T.start[2], behind[2], k); P.yaw = dampAng(P.yaw, n.yaw, 10, dt); P.pitch = damp(P.pitch, -.25, 6, dt);
    if (T.t > .45 && !T.s1) { T.s1 = 1; if (!P.thrownKnife) { AUD.impact('flesh', null); this.blood(V.add(n.pos, [0, 1.3, 0]), P.fwd()); } AUD.voice('hgk', n.voice * .8, V.add(n.pos, [0, 1.5, 0])); }
    if (T.t > P.weps.knife.td * .74 && !n.dead) { n.tdDeath = true; n.tdT = -1; this.killNPC(n, P.pos, 'chest', 'takedown'); n.fallDir = -1; n.deathT = .15; this.noise(n.pos, 4, 'body'); }
    if (T.t > P.weps.knife.td) P.takedown = null;
  },
  /* ---------------- player death ---------------- */
  playerDie(reason) {
    if (this.state === 'dead' || this.state === 'result') return; P.state = 'dead'; this.state = 'dead'; this.career.deaths++; this.saveCareer();
    const e = P.eye(); P.deathCam = { t: 0, pos: e, yaw: P.yaw, pitch: P.pitch };
    this.cine = { update: dt => { const d = P.deathCam; d.t += dt; const m = M4.create(); const k = smooth(d.t / 1.2); const gy = this.W.ground(d.pos[0], d.pos[2], d.pos[1], 2) + .25; M4.translate(m, m, d.pos[0], lerp(d.pos[1], gy, k), d.pos[2]); M4.rotY(m, m, d.yaw); M4.rotX(m, m, lerp(d.pitch, .2, k)); M4.rotZ(m, m, 1.3 * k); P.camOverride = m; } };
    G.after(() => UI.fail(reason), 2200); AUD.hurt();
  },
  failMission(reason) { if (this.state !== 'play' && this.state !== 'intro') return; this.state = 'result'; this.cine = null; IN.unlock(); AUD.stopAllLoops(); UI.fail(reason); },
  pause() { if (this.state !== 'play') return; this.state = 'paused'; IN.unlock(); UI.pause(true); },
  resume() { this.state = 'play'; UI.pause(false); IN.lock(); },
  /* ---------------- objectives ---------------- */
  obj(id) { return this.objectives.find(o => o.id === id); },
  complete(id) { const o = this.obj(id); if (!o || o.done) return; o.done = true; if (o.type === 'hidden') return; this.notify((o.type === 'primary' ? 'OBJECTIVE COMPLETE: ' : 'OPTIONAL COMPLETE: ') + o.text, 'good'); AUD.beep(880, .08, .2); G.after(() => AUD.beep(1320, .1, .2), 120); this.updateObjectivesHUD(); },
  updateObjectivesHUD() { UI.objectives(this.objectives); },
  setPower(on) {
    this.powerOn = on; for (const g of this.W.gens || []) g.hum && g.hum.setOn(on);
    AUD.click(200, .8, P.pos, .2); if (!on) { this.notify('POWER CUT — FLOODLIGHTS OFFLINE', 'good'); this.noise(P.pos, 40, 'impact'); }
  },
  /* ---------------- rendering ---------------- */
  render() {
    const W = this.W; if (!W) return;
    const cam = { pos: P.camPos, view: P.view, fov: P.fov * DEG, fwd: P.camFwd, right: P.camRight, up: P.camUp, near: .05, far: 1400, vmFov: 54 };
    if (!cam.pos) return;
    const dyn = [];
    for (const o of W.dyn) { if (o.alive === false) continue; dyn.push(o); }
    for (const n of this.npcs) dyn.push({ mesh: n.rig.mesh, bones: n.rig.bones, pos: n.pos, r: 2, tint: n.hitFlash > 0 ? [1, 1, 1, n.hitFlash * .6] : null, lod: 260 });
    if (P.state !== 'dead' && !(this.cine && this.cine.hideBody)) dyn.push({ mesh: P.rig.mesh, bones: P.rig.bones, pos: P.camPos, r: 2 });
    for (const v of this.vehicles) dyn.push({ mesh: v.def.mesh, bones: v.bones, pos: v.pos, r: v.def.L });
    for (const c of this.cams) if (c.alive) dyn.push({ mesh: this.camMesh, m: c.m, pos: c.pos, r: .5, lod: 80 });
    for (const p of this.projectiles) dyn.push({ mesh: p.mesh, m: p.m, pos: p.p, r: .5 });
    for (const x of this.extras) if (!x.hidden) dyn.push(x);
    if (P.chute && P.state === 'chute') { this.chuteMatrix(); dyn.push({ mesh: P.chuteMesh, m: P.chuteM, pos: P.pos, r: 10 }); }
    for (const h of this.chuteDrops) { const m = M4.create(); M4.translate(m, m, h.pos[0], h.pos[1], h.pos[2]); M4.rotY(m, m, h.yaw); M4.translate(m, m, 0, 0, 3.5 * h.t); M4.rotX(m, m, -1.45 * h.t); M4.scale(m, m, 1, lerp(1, .25, h.t), 1); dyn.push({ mesh: P.chuteMesh, m, pos: h.pos, r: 10 }); }
    // lights
    const lights = []; const cp = cam.pos; const parts = this.particles.slice(); for (const d of this.decals) parts.push(d);
    for (const l of W.lights) {
      if (!l.on || (l.group === 'power' && !this.powerOn)) continue; const d = V.dist(l.pos, cp);
      if (l.flicker) l.i = (l.baseI || (l.baseI = l.i)) * (.7 + Math.random() * .5);
      if (d < l.range + 60) lights.push({ l, d: d - l.range * .5 });
      if (l.glow && d < 160) parts.push({ p: l.pos, s: l.glow * (l.flood ? 1.4 : 1), c: V.sc(l.col, .55), a: .9, add: true });
    }
    for (const l of this.dlights) lights.push({ l, d: V.dist(l.pos, cp) - 30 });
    for (const n of this.npcs) if (n.flashlight && !n.dead && (n.state !== 'calm' || this.env.night)) { const hp = n.rig.bonePos(SK.WPN); const f = [-Math.sin(n.yaw), Math.sin(n.aimPitch) - .15, -Math.cos(n.yaw)]; lights.push({ l: { pos: V.add(hp, V.sc(f, .5)), col: [1, .95, .85], i: 3, range: 22, dir: V.norm(f), cone: .88 }, d: V.dist(hp, cp) - 15 }); parts.push({ p: V.add(hp, V.sc(f, .55)), s: .18, c: [1, .95, .8], a: .9, add: true }); }
    for (const v of this.vehicles) if (v.engine && v.lightsOn !== false) { const f = [-Math.sin(v.yaw), -.12, -Math.cos(v.yaw)]; const p = V.add(v.pos, V.add(V.sc(f, v.def.L * .5), [0, .9, 0])); lights.push({ l: { pos: p, col: [1, .95, .8], i: 5, range: 35, dir: V.norm(f), cone: .8 }, d: V.dist(p, cp) - 20 }); }
    lights.sort((a, b) => a.d - b.d);
    const S = { chunks: W.chunks, dyn, water: W.water, env: this.envU, lights: lights.slice(0, 12).map(x => x.l), particles: parts, vm: P.state === 'dead' || this.cine && this.cine.hideVM ? [] : VM.drawList(), vmParticles: this.vmParticles, time: this.time, shadowExt: 60 };
    R.render(S, cam);
  },
  chuteMatrix() { const m = P.chuteM; M4.ident(m); M4.translate(m, m, P.pos[0], P.pos[1] + .9, P.pos[2]); M4.rotY(m, m, P.chuteYaw); M4.rotZ(m, m, P.roll * -1.5); const o = smooth(P.chuteOpen); M4.scale(m, m, lerp(.08, 1, o), lerp(.3, 1, o), lerp(.15, 1, smooth(P.chuteOpen * 1.3))); },
  dropChute(c, pos, yaw) { this.chuteDrops.push({ pos: V.copy(pos), yaw, t: 0 }); },
  makeMinimap() {
    const W = this.W; const sc = 3; const s = W.size * sc; const cv = document.createElement('canvas'); cv.width = cv.height = s; const c = cv.getContext('2d');
    const X = x => (x + W.half) * sc; c.clearRect(0, 0, s, s);
    c.fillStyle = 'rgba(120,120,120,.55)'; for (const r of W.mapRects) if (r) c.fillRect(X(r[0]), X(r[1]), (r[2] - r[0]) * sc, (r[3] - r[1]) * sc);
    c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineWidth = 1.6; c.beginPath(); for (const l of W.mapLines) { c.moveTo(X(l[0]), X(l[1])); c.lineTo(X(l[2]), X(l[3])); } c.stroke();
    this.minimap = cv; this.minimapScale = sc;
  },
};
