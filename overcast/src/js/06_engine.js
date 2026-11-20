/* =====================================================================
   OVERCAST — engine core: input, settings, timing, weather & particles,
   speech + subtitles, environment blending, frame loop.
   ===================================================================== */
const IN = {
  keys: {}, hits: {}, mdx: 0, mdy: 0, mb: [0, 0, 0], mbHit: [0, 0, 0], wheel: 0, locked: false,
  init(cv) {
    this.cv = cv;
    addEventListener('keydown', e => { if (e.repeat) { if (G.state === 'play') e.preventDefault(); return; } this.keys[e.code] = 1; this.hits[e.code] = 1; if (G.state === 'play' && !['F5', 'F11', 'F12'].includes(e.code)) e.preventDefault(); G.onKey && G.onKey(e); });
    addEventListener('keyup', e => { this.keys[e.code] = 0; });
    addEventListener('mousemove', e => { if (this.locked) { this.mdx += e.movementX; this.mdy += e.movementY; } });
    addEventListener('mousedown', e => { this.mb[e.button] = 1; this.mbHit[e.button] = 1; });
    addEventListener('mouseup', e => { this.mb[e.button] = 0; });
    addEventListener('wheel', e => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === cv; if (!this.locked && G.state === 'play' && !G.noPauseOnUnlock) G.pause(); });
    addEventListener('blur', () => { this.keys = {}; this.mb = [0, 0, 0]; });
  },
  lock() { try { const p = this.cv.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } },
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); },
  k(c) { return !!this.keys[c]; }, hit(c) { return !!this.hits[c]; },
  end() { this.hits = {}; this.mdx = 0; this.mdy = 0; this.mbHit = [0, 0, 0]; this.wheel = 0; },
};

/* ---------------- environment presets (blended over time) ---------------- */
const ENV = {
  overcast: { sunDir: V.norm([.25, .9, .3]), sunCol: [.42, .43, .45], sky: [.62, .66, .7], gnd: [.25, .26, .25], fog: [.6, .63, .66], fogD: .0036, fogH: 0, zen: [.56, .6, .64], hor: [.72, .74, .76], cloud: 1, skyFog: .9, expo: 1.08, wet: 1, rain: 1, wind: 1.6 },
  container: { sunDir: V.norm([.25, .9, .3]), sunCol: [.04, .04, .045], sky: [.05, .055, .06], gnd: [.035, .035, .035], fog: [.6, .63, .66], fogD: .0065, fogH: 0, zen: [.56, .6, .64], hor: [.72, .74, .76], cloud: 1, skyFog: .9, expo: 1.0, wet: 0, rain: 0, wind: 1.6 },
  cabin: { sunDir: V.norm([.25, .9, .3]), sunCol: [.12, .12, .13], sky: [.2, .21, .22], gnd: [.1, .1, .1], fog: [.6, .63, .66], fogD: .0065, fogH: 0, zen: [.56, .6, .64], hor: [.72, .74, .76], cloud: 1, skyFog: .9, expo: 1.25, wet: 0, rain: 0, wind: 1.6 },
  inCloud: { sunDir: V.norm([.5, .5, -.4]), sunCol: [.8, .78, .75], sky: [.85, .87, .9], gnd: [.6, .62, .64], fog: [.86, .88, .9], fogD: .09, fogH: 0, zen: [.86, .88, .9], hor: [.86, .88, .9], cloud: 0, skyFog: 1, expo: 1.0, wet: 0, rain: 0, wind: 1 },
  above: { sunDir: V.norm([-.55, .32, -.45]), sunCol: [2.3, 2.05, 1.7], sky: [.42, .55, .78], gnd: [.45, .47, .5], fog: [.62, .7, .82], fogD: .00032, fogH: 0, zen: [.1, .24, .58], hor: [.58, .7, .86], cloud: .15, skyFog: .2, expo: 1.0, wet: 0, rain: 0, wind: 1 },
  aboveCabin: { sunDir: V.norm([-.55, .32, -.45]), sunCol: [.5, .45, .38], sky: [.16, .17, .2], gnd: [.1, .1, .1], fog: [.72, .78, .86], fogD: .00045, fogH: 0, zen: [.16, .32, .66], hor: [.66, .76, .88], cloud: .15, skyFog: .35, expo: 1.2, wet: 0, rain: 0, wind: 1 },
  below: { sunDir: V.norm([.2, .9, .3]), sunCol: [.35, .37, .36], sky: [.5, .56, .58], gnd: [.2, .24, .2], fog: [.52, .58, .58], fogD: .0012, fogH: 0, zen: [.5, .55, .58], hor: [.6, .65, .66], cloud: 1, skyFog: .9, expo: 1.1, wet: .6, rain: .6, wind: 1.6 },
};
function envLerp(out, a, b, t) {
  for (const k in a) { const va = a[k], vb = b[k]; if (Array.isArray(va)) { out[k] = out[k] || [0, 0, 0]; for (let i = 0; i < 3; i++) out[k][i] = lerp(va[i], vb[i], t); } else out[k] = lerp(va, vb, t); }
  out.sunDir = V.norm(out.sunDir); return out;
}

const G = {
  state: 'menu', time: 0, rtime: 0, timers: [], particles: [], actors: [], extraDyn: [], glass: [], updaters: [],
  settings: { sens: 45, master: 80, music: 60, voice: 100, sfx: 90, quality: 'high', subs: true, speech: true, fov: 74, invert: false, lens: true },
  env: Object.assign({}, ENV.overcast), envTarget: 'overcast', envFrom: null, envT: 1, envDur: 1,
  cam: { pos: [0, 2, 0], fwd: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0], view: M4.create(), fov: 74 * DEG, near: .04, far: 4200, vmFov: 54 },
  init() {
    try { const s = JSON.parse(localStorage.getItem('overcast_settings') || 'null'); if (s) Object.assign(this.settings, s); } catch (e) { }
    this.canvas = document.getElementById('gl'); R.init(this.canvas); IN.init(this.canvas);
    this.applySettings();
    this.S = { env: this.env, time: 0, chunks: [], dyn: [], lights: [], particles: [], glass: [], mirror: null, water: null, maxDraw: 4200 };
    let last = performance.now();
    const loop = now => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      try { this.frame(dt); } catch (e) { if (!this._errShown) { this._errShown = true; console.error(e); } }
      IN.end(); requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    addEventListener('resize', () => R.resize());
    if ('speechSynthesis' in window) { const pv = () => { this.voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); }; pv(); speechSynthesis.onvoiceschanged = pv; }
  },
  saveSettings() { try { localStorage.setItem('overcast_settings', JSON.stringify(this.settings)); } catch (e) { } this.applySettings(); },
  applySettings() {
    const S = this.settings; const q = S.quality;
    R.scale = q === 'low' ? .6 : q === 'medium' ? .8 : 1; R.samples = q === 'low' ? 0 : Math.min(4, R.gl ? R.gl.getParameter(R.gl.MAX_SAMPLES) : 4);
    R.shadowsOn = q !== 'low'; if (R.gl && R.shadowRes !== (q === 'high' ? 2048 : 1024)) R.makeShadow(q === 'high' ? 2048 : 1024);
    R.post.bloom = q === 'low' ? 0 : .6; R.resize();
    AUD.vol.master = S.master / 100; AUD.vol.music = S.music / 100 * .8; AUD.vol.voice = S.voice / 100; AUD.vol.sfx = S.sfx / 100; AUD.vol.amb = S.sfx / 100 * .9; AUD.applyVol();
    this.cam.fov = S.fov * DEG;
  },
  /* ---------------- time ---------------- */
  after(sec, fn) { const t = { at: this.time + sec, fn }; this.timers.push(t); return t; },
  runTimers() { if (!this.timers.length) return; const now = this.time; const due = this.timers.filter(t => t.at <= now); if (!due.length) return; this.timers = this.timers.filter(t => t.at > now); for (const t of due) try { t.fn(); } catch (e) { console.error(e); } },
  setEnv(name, dur = 2) { this.envFrom = Object.assign({}, this.env, { sunDir: V.copy(this.env.sunDir) }); for (const k in this.envFrom) if (Array.isArray(this.envFrom[k])) this.envFrom[k] = this.envFrom[k].slice(); this.envTarget = name; this.envT = 0; this.envDur = dur; },
  /* ---------------- frame ---------------- */
  frame(rdt) {
    this.rtime += rdt; R.post.fade = UI.fadeV || 0;
    if (this.state === 'menu') { UI.menuFrame(rdt); return; }
    if (this.state === 'pause' || this.state === 'loading') { this.render(); return; }
    const dt = rdt; this.time += dt; this.dt = dt; this.runTimers();
    // environment blend
    if (this.envT < 1) { this.envT = Math.min(1, this.envT + dt / this.envDur); envLerp(this.env, this.envFrom, ENV[this.envTarget], smooth(this.envT)); }
    Story.update(dt);
    P.update(dt);
    for (const a of this.actors) a.update(dt);
    for (const u of this.updaters) u(dt);
    this.updateWeather(dt); this.updateParticles(dt);
    P.updateCamera(dt);
    AUD.setListener(this.cam.pos, this.cam.fwd, this.cam.up); AUD.update(dt);
    UI.hudFrame(dt);
    if (!this.skipRender) this.render();
  },
  render() {
    const S = this.S; S.time = this.time; S.env = this.env; S.particles = this.particles;
    if (this.rainN && this.state === 'play') { const ex = []; for (let i = 0; i < this.rainN; i++) { const r = this.rain[i]; if (!r.hide) ex.push(r); } S.particles = this.particles.concat(ex); }
    S.dyn = this.collectDyn(); S.glass = this.glass;
    S.lights = this.pickLights();
    // god rays from the sun's screen position
    const sd = this.env.sunDir; const sp = [this.cam.pos[0] + sd[0] * 1000, this.cam.pos[1] + sd[1] * 1000, this.cam.pos[2] + sd[2] * 1000];
    const vp = M4.mul(M4.create(), M4.persp(M4.create(), this.cam.fov, R.w / R.h, .1, 5000), this.cam.view); const c = [0, 0, 0, 0];
    c[0] = vp[0] * sp[0] + vp[4] * sp[1] + vp[8] * sp[2] + vp[12]; c[1] = vp[1] * sp[0] + vp[5] * sp[1] + vp[9] * sp[2] + vp[13]; c[3] = vp[3] * sp[0] + vp[7] * sp[1] + vp[11] * sp[2] + vp[15];
    const facing = V.dot(this.cam.fwd, sd); R.post.sun = c[3] > 0 ? [c[0] / c[3] * .5 + .5, c[1] / c[3] * .5 + .5] : [.5, 2]; R.post.rays = (this.raysOn || 0) * clamp(facing * 2, 0, 1);
    R.post.lens = this.settings.lens ? (this.lensK || 0) : 0;
    R.render(S, this.cam);
  },
  collectDyn() { const out = []; for (const a of this.actors) if (!a.hidden) for (const d of a.dyn) out.push(d); if (P.dyn) for (const d of P.dyn) out.push(d); for (const d of this.extraDyn) out.push(d); return out; },
  pickLights() {
    const L = this.W ? this.W.lights : []; const cp = this.cam.pos; const all = L.concat(this.dynLights || []);
    return all.filter(l => l.on !== false && l.i > 0).map(l => ({ l, d: V.dist(l.pos, cp) - l.range })).sort((a, b) => a.d - b.d).slice(0, 12).map(o => o.l);
  },
  /* ---------------- weather: rain streaks, splashes, interiors stay dry ---------------- */
  rain: null, dry: [],
  isDry(p) { for (const b of this.dry) { if (b.m) { const q = M4.pt(b.inv, p[0], p[1], p[2]); if (q[0] > b.mn[0] && q[0] < b.mx[0] && q[1] > b.mn[1] && q[1] < b.mx[1] && q[2] > b.mn[2] && q[2] < b.mx[2]) return true; } else if (p[0] > b.mn[0] && p[0] < b.mx[0] && p[1] > b.mn[1] && p[1] < b.mx[1] && p[2] > b.mn[2] && p[2] < b.mx[2]) return true; } return false; },
  updateWeather(dt) {
    const k = this.env.rain || 0; const cp = this.cam.pos;
    if (!this.rain) { this.rain = []; for (let i = 0; i < 1400; i++) this.rain.push({ p: [0, -999, 0], v: [0, 0, 0], dir: [0, -1, 0], s: .32, w: .0065, c: [.75, .78, .8], a: .32, streak: true }); }
    const n = Math.floor(this.rain.length * clamp(k, 0, 1)); const wind = [1.4, -11.5, .7]; const wl = V.len(wind); const wd = V.sc(wind, 1 / wl);
    const gy = this.W ? (x, z) => this.W.ground(x, z, cp[1] + 2, 0, .1) : () => -1e9;
    let splashN = 0;
    for (let i = 0; i < n; i++) {
      const r = this.rain[i];
      if (r.p[1] < -998 || Math.abs(r.p[0] - cp[0]) > 20 || Math.abs(r.p[2] - cp[2]) > 20 || r.p[1] > cp[1] + 16) { r.p = [cp[0] + rnd(-20, 20), cp[1] + rnd(-4, 15), cp[2] + rnd(-20, 20)]; r.gy = gy(r.p[0], r.p[2]); }
      r.p[0] += wind[0] * dt; r.p[1] += wind[1] * dt; r.p[2] += wind[2] * dt; r.dir = wd;
      if (r.p[1] < r.gy || r.p[1] < cp[1] - 8) {
        if (splashN < 10 && V.dist(r.p, cp) < 14 && r.p[1] > r.gy - .3) { splashN++; const sp = [r.p[0], r.gy + .02, r.p[2]]; if (!this.isDry(sp)) this.particles.push({ p: sp, v: [0, 0, 0], life: 0, max: .25, s: .04, grow: .5, c: [.8, .82, .85], a: .5, flat: [[1, 0, 0], [0, 0, 1]], drag: 0 }); }
        r.p = [cp[0] + rnd(-20, 20), cp[1] + rnd(8, 15), cp[2] + rnd(-20, 20)]; r.gy = gy(r.p[0], r.p[2]);
      }
      r.hide = this.isDry(r.p);
    }
    this.rainN = n;
    // lens droplets when outdoors in the rain and looking up
    const outdoor = k > .3 && !this.isDry(cp); this.lensK = damp(this.lensK || 0, outdoor ? .55 + clamp(this.cam.fwd[1], 0, 1) * .5 : 0, outdoor ? .8 : .35, dt);
  },
  updateParticles(dt) {
    const ps = this.particles; let w = 0;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i]; p.life += dt; if (p.life >= p.max) continue;
      if (p.g) p.v[1] -= p.g * dt; if (p.drag) { const k = Math.exp(-p.drag * dt); p.v[0] *= k; p.v[1] *= k; p.v[2] *= k; }
      p.p[0] += p.v[0] * dt; p.p[1] += p.v[1] * dt; p.p[2] += p.v[2] * dt;
      if (p.grow) p.s += p.grow * dt; if (p.a0 === undefined) p.a0 = p.a; const lf = p.life / p.max; p.a = p.a0 * (lf < .15 && p.fadeIn ? lf / .15 : 1) * (1 - Math.pow(lf, p.fadePow || 2));
      if (p.spin) p.rot = (p.rot || 0) + p.spin * dt;
      ps[w++] = p;
    }
    ps.length = w;
    if (ps.length > 5600) ps.splice(0, ps.length - 5600);
  },
  puff(p, o = {}) { // soft volumetric puff: dust, steam, exhaust, gas
    this.particles.push({ p: V.copy(p), v: o.v ? V.copy(o.v) : [rnd(-.3, .3), rnd(.2, .6), rnd(-.3, .3)], life: 0, max: o.max || rnd(3, 6), s: o.s || rnd(.6, 1.2), grow: o.grow ?? .6, c: o.c || [.62, .63, .64], a: o.a ?? .35, drag: o.drag ?? .4, g: o.g ?? -.05, rot: rnd(0, TAU), spin: rnd(-.3, .3), fadeIn: true, add: !!o.add });
  },
  /* ---------------- speech + subtitles ---------------- */
  speak(who, text, o = {}) {
    UI.subtitle(who ? who.name || who : '', text, o.radio);
    const len = Math.max(1.6, text.split(/\s+/).length * .36 + .5);
    let used = false;
    if (this.settings.speech && 'speechSynthesis' in window && this.voices && this.voices.length) {
      try {
        const u = new SpeechSynthesisUtterance(text.replace(/[—…]/g, ', '));
        const vs = this.voices; const pref = vs.filter(v => /male|daniel|alex|fred|george|guy|david|mark|james|ryan|aaron|arthur/i.test(v.name));
        const pool = pref.length ? pref : vs; u.voice = pool[(who && who.voiceIdx || 0) % pool.length];
        u.pitch = who && who.vpitch || 1; u.rate = (who && who.vrate) || 1.02; u.volume = clamp(this.settings.voice / 100 * (o.radio ? .7 : 1), 0, 1);
        speechSynthesis.speak(u); used = true;
      } catch (e) { }
    }
    if (o.radio) { AUD.radioCrackle && AUD.radioCrackle(len); }
    if (!used) AUD.voice(text, (who && who.pitch) || 110, o.radio ? null : (who && who.headPos ? who.headPos() : null), !!o.radio);
    return len;
  },
  pause() { if (this.state !== 'play') return; this.state = 'pause'; UI.showPause(true); if (window.speechSynthesis) speechSynthesis.pause(); if (AUD.ctx) AUD.ctx.suspend(); },
  resume() { this.state = 'play'; UI.showPause(false); IN.lock(); if (window.speechSynthesis) speechSynthesis.resume(); if (AUD.ctx) AUD.ctx.resume(); },
  onKey(e) { },
};
