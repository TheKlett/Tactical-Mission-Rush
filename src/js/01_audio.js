/* =====================================================================
   AUDIO — fully synthesized WebAudio sound engine (no external files)
   ===================================================================== */
const AUD = {
  ctx: null, ready: false, vol: { master: .8, sfx: 1, amb: .8, music: .5, voice: 1 },
  occlude: null, loops: [], listenerPos: [0, 0, 0], indoor: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = C.createGain(); this.master.connect(C.destination);
    this.comp = C.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 4;
    this.comp.connect(this.master);
    this.sfx = C.createGain(); this.sfx.connect(this.comp);
    this.amb = C.createGain(); this.amb.connect(this.comp);
    this.mus = C.createGain(); this.mus.connect(this.comp);
    this.vox = C.createGain(); this.vox.connect(this.comp);
    // reverb
    this.verb = C.createConvolver(); this.verb.buffer = this.makeIR(2.4, 2.6);
    this.verbSend = C.createGain(); this.verbSend.gain.value = .18; this.verbSend.connect(this.verb); this.verb.connect(this.comp);
    // noise buffers
    const len = C.sampleRate * 2;
    this.white = C.createBuffer(1, len, C.sampleRate); const w = this.white.getChannelData(0);
    for (let i = 0; i < len; i++) w[i] = Math.random() * 2 - 1;
    this.brown = C.createBuffer(1, len, C.sampleRate); const b = this.brown.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
    this.pink = C.createBuffer(1, len, C.sampleRate); const p = this.pink.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const wn = Math.random() * 2 - 1; b0 = .99886 * b0 + wn * .0555179; b1 = .99332 * b1 + wn * .0750759; b2 = .969 * b2 + wn * .153852;
      b3 = .8665 * b3 + wn * .3104856; b4 = .55 * b4 + wn * .5329522; b5 = -.7616 * b5 - wn * .016898; p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + wn * .5362) * .11; b6 = wn * .115926;
    }
    this.dist = C.createWaveShaper(); const cur = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cur[i] = Math.tanh(x * 3); } this.distCurve = cur;
    this.applyVol(); this.ready = true;
  },
  applyVol() {
    if (!this.ctx) return;
    this.master.gain.value = this.vol.master; this.sfx.gain.value = this.vol.sfx; this.amb.gain.value = this.vol.amb;
    this.mus.gain.value = this.vol.music; this.vox.gain.value = this.vol.voice;
  },
  makeIR(sec, decay) {
    const C = this.ctx, n = C.sampleRate * sec | 0, buf = C.createBuffer(2, n, C.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return buf;
  },
  get t() { return this.ctx.currentTime; },
  setListener(pos, fwd, up) {
    if (!this.ready) return; const L = this.ctx.listener; this.listenerPos = pos;
    if (L.positionX) {
      const t = this.t; L.positionX.setTargetAtTime(pos[0], t, .02); L.positionY.setTargetAtTime(pos[1], t, .02); L.positionZ.setTargetAtTime(pos[2], t, .02);
      L.forwardX.setTargetAtTime(fwd[0], t, .02); L.forwardY.setTargetAtTime(fwd[1], t, .02); L.forwardZ.setTargetAtTime(fwd[2], t, .02);
      L.upX.value = up[0]; L.upY.value = up[1]; L.upZ.value = up[2];
    } else { L.setPosition(pos[0], pos[1], pos[2]); L.setOrientation(fwd[0], fwd[1], fwd[2], up[0], up[1], up[2]); }
    this.verbSend.gain.setTargetAtTime(.12 + this.indoor * .3, this.t, .3);
  },
  // output chain: gain -> [occlusion lowpass] -> panner -> bus ; returns gain input
  out(pos, vol = 1, opt = {}) {
    const C = this.ctx, g = C.createGain(); g.gain.value = vol;
    let node = g;
    if (pos) {
      const d = V.dist(pos, this.listenerPos);
      if (d > (opt.max || 250)) return null;
      const occ = this.occlude && opt.occl !== false ? this.occlude(pos) : 0;
      if (occ > 0) { const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lerp(20000, 650, occ); node.connect(lp); node = lp; g.gain.value *= 1 - occ * .45; }
      const pn = C.createPanner(); pn.panningModel = opt.hrtf ? 'HRTF' : 'equalpower'; pn.distanceModel = 'inverse';
      pn.refDistance = opt.ref || 2.5; pn.rolloffFactor = opt.roll || 1.1; pn.maxDistance = 1000;
      if (pn.positionX) { pn.positionX.value = pos[0]; pn.positionY.value = pos[1]; pn.positionZ.value = pos[2]; } else pn.setPosition(pos[0], pos[1], pos[2]);
      node.connect(pn); node = pn; g._pan = pn;
    }
    node.connect(opt.bus || this.sfx);
    if (opt.verb !== 0) { const s = C.createGain(); s.gain.value = opt.verb || .5; node.connect(s); s.connect(this.verbSend); }
    return g;
  },
  rate: 1,
  setRate(r) { this.rate = r; },
  slowFx(on) {
    if (!this.ready) return; const t = this.t;
    if (!this.slowF) { this.slowF = this.filt('lowpass', 20000, .7); this.comp.disconnect(); this.comp.connect(this.slowF); this.slowF.connect(this.master); }
    this.slowF.frequency.setTargetAtTime(on ? 1500 : 20000, t, on ? .25 : .5); this.verbSend.gain.setTargetAtTime(on ? .55 : .15, t, .4);
    const o = this.osc('sine', on ? 220 : 55); o.frequency.exponentialRampToValueAtTime(on ? 45 : 240, t + .9); const g = this.ctx.createGain(); o.connect(g); g.connect(this.master); this.env(g.gain, t, .05, .5, 1.1); o.start(t); o.stop(t + 1.3);
    this.swoosh(.6, null, on ? 300 : 900, 1); if (on) { this.heartT = 0; }
  },
  noise(dest, t0, dur, type = 'white', rate = 1) {
    const s = this.ctx.createBufferSource(); s.buffer = this[type]; s.playbackRate.value = rate * (this.rate < 1 ? .55 + this.rate * .45 : 1); s.loop = true;
    s.connect(dest); s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + .05); return s;
  },
  env(param, t0, a, peak, d, sus = 0) {
    param.cancelScheduledValues(t0); param.setValueAtTime(0.0001, t0); param.linearRampToValueAtTime(peak, t0 + a);
    param.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t0 + a + d);
  },
  filt(type, f, q = 1) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; },
  osc(type, f) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; },

  /* ---------------- weapon sounds ---------------- */
  shot(kind, pos) {
    if (!this.ready) return; const C = this.ctx, t = this.t;
    const near = !pos || V.dist(pos, this.listenerPos) < 1;
    if (kind === 'pistolS') {
      const o = this.out(pos, near ? .55 : .9, { ref: 1.5, verb: .2 }); if (!o) return;
      const g = C.createGain(); const bp = this.filt('bandpass', 1800, .8); bp.connect(g); g.connect(o);
      this.env(g.gain, t, .002, 1, .07); this.noise(bp, t, .1);
      const g2 = C.createGain(); const hp = this.filt('highpass', 3000); hp.connect(g2); g2.connect(o); this.env(g2.gain, t + .004, .001, .6, .03); this.noise(hp, t, .05);
      const os = this.osc('square', 2400); const g3 = C.createGain(); os.connect(g3); g3.connect(o); this.env(g3.gain, t + .02, .001, .12, .02); os.start(t); os.stop(t + .06);
      const th = this.osc('sine', 180); th.frequency.exponentialRampToValueAtTime(60, t + .08); const g4 = C.createGain(); th.connect(g4); g4.connect(o); this.env(g4.gain, t, .002, .5, .08); th.start(t); th.stop(t + .12);
      return;
    }
    const big = kind === 'rifle2' || kind === 'shotgun';
    const vol = kind.startsWith('npc') ? 1.3 : 1;
    const o = this.out(pos, vol * (near ? .9 : 1.5), { ref: 6, roll: .7, verb: 1, max: 600 }); if (!o) return;
    // crack
    const g1 = C.createGain(); const hp = this.filt('highpass', 2000); hp.connect(g1); g1.connect(o); this.env(g1.gain, t, .001, 1.2, .045); this.noise(hp, t, .08);
    // body
    const g2 = C.createGain(); const lp = this.filt('lowpass', big ? 2200 : 3200); lp.connect(g2); g2.connect(o); this.env(g2.gain, t, .002, 1.4, big ? .22 : .14); this.noise(lp, t, .3);
    // thump
    const th = this.osc('sine', big ? 120 : 150); th.frequency.exponentialRampToValueAtTime(38, t + .15); const g3 = C.createGain(); th.connect(g3); g3.connect(o);
    this.env(g3.gain, t, .002, big ? 1.6 : 1.1, .2); th.start(t); th.stop(t + .3);
    // tail / environmental echo
    const g4 = C.createGain(); const lp2 = this.filt('lowpass', 700); lp2.connect(g4); g4.connect(o); this.env(g4.gain, t + .03, .03, .35, 1.1); this.noise(lp2, t, 1.3, 'brown');
    if (kind === 'shotgun') { const g5 = C.createGain(); g5.connect(o); this.env(g5.gain, t, .002, .5, .3); this.noise(g5, t, .35, 'pink'); }
  },
  click(f = 3000, vol = .3, pos = null, dur = .015) {
    if (!this.ready) return; const C = this.ctx, t = this.t; const o = this.out(pos, vol, { ref: 1, verb: .1 }); if (!o) return;
    const g = C.createGain(); const bp = this.filt('bandpass', f, 4); bp.connect(g); g.connect(o); this.env(g.gain, t, .001, 1, dur); this.noise(bp, t, dur + .02);
  },
  mech(kind, pos = null) {
    if (!this.ready) return; const t = this.t;
    const seq = {
      magOut: [[0, 1800, .35], [.04, 900, .3], [.09, 600, .2]],
      magIn: [[0, 700, .45], [.03, 2600, .35], [.06, 1400, .25]],
      rack: [[0, 2200, .3], [.08, 1200, .35], [.12, 3200, .3]],
      slide: [[0, 2600, .3], [.07, 3400, .35]],
      draw: [[0, 1500, .15], [.05, 4200, .12]],
      dry: [[0, 4500, .25]],
      pickup: [[0, 900, .2], [.05, 1600, .12]],
      button: [[0, 600, .5], [.02, 2200, .3]],
      switch: [[0, 400, .6], [.03, 1500, .4], [.05, 300, .3]],
    }[kind] || [];
    for (const [dt, f, v] of seq) setTimeout(() => this.click(f, v, pos, .02), dt * 1000);
    if (kind === 'magOut' || kind === 'magIn' || kind === 'rack' || kind === 'slide') this.swoosh(.08, pos, 3000, .15);
    if (kind === 'pickup') this.swoosh(.14, pos, 1200, .2);
  },
  swoosh(vol = .3, pos = null, f = 900, dur = .25) {
    if (!this.ready) return; const C = this.ctx, t = this.t; const o = this.out(pos, vol, { ref: 1, verb: .2 }); if (!o) return;
    const g = C.createGain(); const bp = this.filt('bandpass', f * .5, 1.5); bp.frequency.exponentialRampToValueAtTime(f * 2, t + dur * .6);
    bp.frequency.exponentialRampToValueAtTime(f * .6, t + dur); bp.connect(g); g.connect(o);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(1, t + dur * .5); g.gain.exponentialRampToValueAtTime(.0001, t + dur); this.noise(bp, t, dur);
  },
  shell(pos) { // casing tinkle
    if (!this.ready) return; const C = this.ctx;
    for (let i = 0; i < 3; i++) {
      const t = this.t + .3 + i * .07 + Math.random() * .05; const o = this.out(pos, .12 / (i + 1), { ref: 1, verb: .1 }); if (!o) return;
      const os = this.osc('sine', 3800 + Math.random() * 2500); const g = C.createGain(); os.connect(g); g.connect(o); this.env(g.gain, t, .001, 1, .06); os.start(t); os.stop(t + .08);
    }
  },
  /* ---------------- footsteps & impacts ---------------- */
  step(surf, pos, vol = .3) {
    if (!this.ready) return; const C = this.ctx, t = this.t; const o = this.out(pos, vol, { ref: 1.5, verb: .3 }); if (!o) return;
    const S = {
      mud: ['lowpass', 500, 1, .13, 'brown', .9], water: ['bandpass', 900, .7, .22, 'white', 1], wood: ['bandpass', 260, 2, .09, 'pink', 1],
      metal: ['bandpass', 1900, 6, .12, 'white', 1], concrete: ['bandpass', 1300, 1.2, .05, 'white', 1], grass: ['highpass', 2200, .7, .1, 'white', .7],
      snow: ['bandpass', 2600, .5, .14, 'white', .8], asphalt: ['bandpass', 1100, 1, .05, 'pink', 1], gravel: ['bandpass', 3000, .6, .09, 'white', 1],
    }[surf] || ['bandpass', 1000, 1, .06, 'white', 1];
    const g = C.createGain(); const f = this.filt(S[0], S[1] * (.85 + Math.random() * .3), S[2]); f.connect(g); g.connect(o);
    this.env(g.gain, t, .005, S[5], S[3]); this.noise(f, t, S[3] + .05, S[4]);
    if (surf === 'wood') { const os = this.osc('sine', 110 + Math.random() * 30); const g2 = C.createGain(); os.connect(g2); g2.connect(o); this.env(g2.gain, t, .003, .5, .08); os.start(t); os.stop(t + .1); }
    if (surf === 'metal') { const os = this.osc('triangle', 520 + Math.random() * 80); const g2 = C.createGain(); os.connect(g2); g2.connect(o); this.env(g2.gain, t, .002, .15, .25); os.start(t); os.stop(t + .3); }
    if (surf === 'water' || surf === 'mud') { const g2 = C.createGain(); const bp = this.filt('bandpass', 400, 3); bp.frequency.exponentialRampToValueAtTime(1400, t + .15); bp.connect(g2); g2.connect(o); this.env(g2.gain, t + .03, .02, surf === 'water' ? .8 : .35, .15); this.noise(bp, t, .25); }
    if (surf === 'snow' || surf === 'gravel') for (let i = 0; i < 3; i++) { const tt = t + i * .025; const g3 = C.createGain(); const h = this.filt('bandpass', 3500 + Math.random() * 2000, 3); h.connect(g3); g3.connect(o); this.env(g3.gain, tt, .002, .5, .02); this.noise(h, tt, .04); }
  },
  impact(surf, pos) {
    if (!this.ready) return; const C = this.ctx, t = this.t; const o = this.out(pos, .55, { ref: 2, verb: .4 }); if (!o) return;
    if (surf === 'metal') { for (let i = 0; i < 2; i++) { const os = this.osc('sine', 1800 + Math.random() * 2400); const g = C.createGain(); os.connect(g); g.connect(o); this.env(g.gain, t, .001, .35, .35); os.start(t); os.stop(t + .4); } }
    if (surf === 'flesh') { const g = C.createGain(); const lp = this.filt('lowpass', 500); lp.connect(g); g.connect(o); this.env(g.gain, t, .002, 1.4, .1); this.noise(lp, t, .12, 'brown'); return; }
    if (surf === 'water' || surf === 'mud') { const g = C.createGain(); const bp = this.filt('bandpass', 1200, 2); bp.frequency.exponentialRampToValueAtTime(3000, t + .1); bp.connect(g); g.connect(o); this.env(g.gain, t, .003, .8, .12); this.noise(bp, t, .15); return; }
    if (surf === 'glass') { this.glass(pos); return; }
    const f = surf === 'wood' ? 600 : surf === 'snow' ? 1500 : 2200;
    const g = C.createGain(); const bp = this.filt('bandpass', f, 1.2); bp.connect(g); g.connect(o); this.env(g.gain, t, .001, 1, .06); this.noise(bp, t, .08);
    if (surf === 'wood') { const os = this.osc('sine', 180); const g2 = C.createGain(); os.connect(g2); g2.connect(o); this.env(g2.gain, t, .002, .4, .06); os.start(t); os.stop(t + .08); }
  },
  glass(pos) {
    if (!this.ready) return; const C = this.ctx; const o = this.out(pos, .7, { ref: 3, verb: .6 }); if (!o) return;
    for (let i = 0; i < 14; i++) { const t = this.t + Math.random() * .35; const os = this.osc('sine', 2500 + Math.random() * 5000); const g = C.createGain(); os.connect(g); g.connect(o); this.env(g.gain, t, .001, .15, .12); os.start(t); os.stop(t + .15); }
    const g = C.createGain(); const hp = this.filt('highpass', 3000); hp.connect(g); g.connect(o); this.env(g.gain, this.t, .001, 1, .3); this.noise(hp, this.t, .35);
  },
  explosion(pos) {
    if (!this.ready) return; const C = this.ctx, t = this.t; const o = this.out(pos, 2.5, { ref: 10, roll: .5, verb: 1.2, max: 1200 }); if (!o) return;
    const g = C.createGain(); const lp = this.filt('lowpass', 1800); lp.frequency.exponentialRampToValueAtTime(200, t + 1.5); lp.connect(g); g.connect(o); this.env(g.gain, t, .005, 1.5, 2.2); this.noise(lp, t, 2.5, 'brown');
    const os = this.osc('sine', 80); os.frequency.exponentialRampToValueAtTime(25, t + .8); const g2 = C.createGain(); os.connect(g2); g2.connect(o); this.env(g2.gain, t, .005, 2, 1); os.start(t); os.stop(t + 1.2);
    const g3 = C.createGain(); g3.connect(o); this.env(g3.gain, t, .001, 1.5, .25); this.noise(g3, t, .3);
  },
  melee(hit) { this.swoosh(.35, null, 1100, .22); if (hit) setTimeout(() => this.impact('flesh', null), 120); },
  door(pos, open) {
    if (!this.ready) return; const C = this.ctx, t = this.t; const o = this.out(pos, .45, { ref: 2, verb: .5 }); if (!o) return;
    this.click(open ? 1500 : 900, .4, pos, .03);
    const os = this.osc('sawtooth', 180 + Math.random() * 80); const bp = this.filt('bandpass', 900, 8); const g = C.createGain(); os.connect(bp); bp.connect(g); g.connect(o);
    os.frequency.setValueAtTime(200, t + .05); os.frequency.linearRampToValueAtTime(320 + Math.random() * 200, t + .35); os.frequency.linearRampToValueAtTime(240, t + .6);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(open ? .18 : .1, t + .1); g.gain.exponentialRampToValueAtTime(.0001, t + .65); os.start(t); os.stop(t + .7);
    if (!open) setTimeout(() => this.click(500, .7, pos, .05), 550);
  },
  hydraulic(pos, dur = 4) {
    if (!this.ready) return; const C = this.ctx, t = this.t; const o = this.out(pos, .6, { ref: 4, verb: .4 }); if (!o) return;
    const os = this.osc('sawtooth', 55); const lp = this.filt('lowpass', 380); const g = C.createGain(); os.connect(lp); lp.connect(g); g.connect(o);
    os.frequency.linearRampToValueAtTime(75, t + dur); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.5, t + .3); g.gain.setValueAtTime(.5, t + dur - .3); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    os.start(t); os.stop(t + dur + .1);
    const g2 = C.createGain(); const bp = this.filt('bandpass', 2400, 2); bp.connect(g2); g2.connect(o); g2.gain.setValueAtTime(.0001, t); g2.gain.linearRampToValueAtTime(.08, t + .5); g2.gain.exponentialRampToValueAtTime(.0001, t + dur); this.noise(bp, t, dur);
    setTimeout(() => this.click(300, .8, pos, .08), dur * 1000);
  },
  sparks(pos) { for (let i = 0; i < 5; i++) setTimeout(() => this.click(4000 + Math.random() * 3000, .25, pos, .01), i * 40 + Math.random() * 60); },
  beep(f = 880, dur = .08, vol = .2, pos = null) {
    if (!this.ready) return; const C = this.ctx, t = this.t; const o = this.out(pos, vol, { ref: 2, verb: .2 }); if (!o) return;
    const os = this.osc('square', f); const lp = this.filt('lowpass', 3000); const g = C.createGain(); os.connect(lp); lp.connect(g); g.connect(o);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(1, t + .005); g.gain.setValueAtTime(1, t + dur); g.gain.exponentialRampToValueAtTime(.0001, t + dur + .03); os.start(t); os.stop(t + dur + .05);
  },
  uiClick() { this.beep(1400, .02, .08); }, uiHover() { this.beep(2400, .01, .03); },
  heartbeat() { if (!this.ready) return; const C = this.ctx, t = this.t; for (const d of [0, .18]) { const os = this.osc('sine', 60); const g = C.createGain(); os.connect(g); g.connect(this.sfx); this.env(g.gain, t + d, .01, .5, .15); os.start(t + d); os.stop(t + d + .2); } },
  hurt() { if (!this.ready) return; const C = this.ctx, t = this.t; const g = C.createGain(); const lp = this.filt('lowpass', 400); lp.connect(g); g.connect(this.sfx); this.env(g.gain, t, .003, .8, .15); this.noise(lp, t, .2, 'brown'); },
  /* ---------------- voices (formant babble) ---------------- */
  voice(text, pitch, pos, radio = false) {
    if (!this.ready) return 0; const C = this.ctx; let t = this.t + .02;
    const dur = clamp(text.length * .055, .5, 4);
    const o = this.out(radio ? null : pos, radio ? .35 : 1.1, { ref: 3, verb: .3, bus: this.vox }); if (!o) return dur;
    let dest = o;
    if (radio) {
      const bp = this.filt('bandpass', 1500, .9); const ws = C.createWaveShaper(); ws.curve = this.distCurve; bp.connect(ws); ws.connect(o); dest = bp;
      const sg = C.createGain(); sg.gain.value = .06; sg.connect(o); this.noise(sg, t, dur + .2, 'white');
      this.beep(1700, .05, .12); setTimeout(() => this.beep(1200, .06, .1), (dur + .15) * 1000);
    }
    pitch *= this.rate < 1 ? .6 + this.rate * .4 : 1; const src = this.osc('sawtooth', pitch); const vib = this.osc('sine', 5.5); const vg = C.createGain(); vg.gain.value = pitch * .02; vib.connect(vg); vg.connect(src.frequency);
    const amp = C.createGain(); amp.gain.value = 0; src.connect(amp);
    const fA = this.filt('bandpass', 700, 6), fB = this.filt('bandpass', 1200, 8), fC = this.filt('bandpass', 2600, 10);
    const mix = C.createGain(); mix.gain.value = 2.2; amp.connect(fA); amp.connect(fB); amp.connect(fC); fA.connect(mix); fB.connect(mix); fC.connect(mix); mix.connect(dest);
    const VW = [[730, 1090], [270, 2290], [530, 1840], [570, 840], [300, 870], [660, 1720], [490, 1350]];
    const end = t + dur; let words = 0;
    while (t < end) {
      const sd = .07 + Math.random() * .11; const vw = VW[(Math.random() * VW.length) | 0];
      fA.frequency.setTargetAtTime(vw[0], t, .02); fB.frequency.setTargetAtTime(vw[1], t, .02);
      src.frequency.setTargetAtTime(pitch * (.85 + Math.random() * .35) * (t > end - .3 ? .85 : 1), t, .04);
      amp.gain.setTargetAtTime(.5 + Math.random() * .4, t, .015); amp.gain.setTargetAtTime(.05, t + sd * .75, .02);
      if (Math.random() < .45) { const ng = C.createGain(); const hp = this.filt('highpass', 3000 + Math.random() * 3000); hp.connect(ng); ng.connect(dest); this.env(ng.gain, t, .005, .2, .04); this.noise(hp, t, .06); }
      t += sd; words++; if (words % 4 === 0) t += .06 + Math.random() * .08;
    }
    amp.gain.setTargetAtTime(0, end, .03);
    src.start(this.t); vib.start(this.t); src.stop(end + .3); vib.stop(end + .3);
    return dur;
  },
  /* ---------------- looping sources ---------------- */
  loop(build) { if (!this.ready) return null; const h = build(this.ctx); h.stop = h.stop || (() => { }); this.loops.push(h); return h; },
  stopAllLoops() { for (const h of this.loops) try { h.stop(); } catch (e) { } this.loops = []; },
  mkNoiseLoop(type, filterType, f, q, vol, bus, pos) {
    const C = this.ctx; const s = C.createBufferSource(); s.buffer = this[type]; s.loop = true;
    const fl = this.filt(filterType, f, q); const g = C.createGain(); g.gain.value = vol; s.connect(fl); fl.connect(g);
    let pan = null;
    if (pos) { pan = C.createPanner(); pan.panningModel = 'equalpower'; pan.distanceModel = 'inverse'; pan.refDistance = 4; pan.rolloffFactor = 1.2; if (pan.positionX) { pan.positionX.value = pos[0]; pan.positionY.value = pos[1]; pan.positionZ.value = pos[2]; } g.connect(pan); pan.connect(bus); }
    else g.connect(bus);
    s.start(this.t, Math.random()); return { s, f: fl, g, pan };
  },
  engineLoop(kind, pos) {
    return this.loop(C => {
      const t = this.t; const nodes = [];
      const g = C.createGain(); g.gain.value = 0; const pan = C.createPanner(); pan.panningModel = 'equalpower'; pan.distanceModel = 'inverse'; pan.refDistance = kind === 'plane' ? 30 : 5; pan.rolloffFactor = 1;
      g.connect(pan); pan.connect(this.sfx);
      const send = C.createGain(); send.gain.value = .2; g.connect(send); send.connect(this.verbSend);
      const lp = this.filt('lowpass', kind === 'car' ? 900 : 600); lp.connect(g);
      const base = kind === 'car' ? 38 : kind === 'boat' ? 45 : kind === 'heli' ? 26 : 62;
      const oscs = [];
      for (const m of kind === 'heli' ? [1, 1.01] : [1, 1.5, 2.01]) { const o = this.osc('sawtooth', base * m); const og = C.createGain(); og.gain.value = .25 / m; o.connect(og); og.connect(lp); o.start(t); oscs.push([o, m]); nodes.push(o); }
      const nz = C.createBufferSource(); nz.buffer = this.pink; nz.loop = true; const nf = this.filt('bandpass', kind === 'heli' ? 300 : 800, .7); const ng = C.createGain(); ng.gain.value = kind === 'heli' ? .9 : .35;
      nz.connect(nf); nf.connect(ng); nz.start(t); nodes.push(nz);
      let chop = null;
      if (kind === 'heli' || kind === 'plane') { // rotor / prop amplitude modulation
        const am = C.createGain(); am.gain.value = .6; ng.connect(am); am.connect(g);
        chop = this.osc(kind === 'heli' ? 'square' : 'sine', kind === 'heli' ? 4 : 28); const cg = C.createGain(); cg.gain.value = .45; chop.connect(cg); cg.connect(am.gain); chop.start(t); nodes.push(chop);
        if (kind === 'heli') { const wh = this.osc('sine', 1900); const wg = C.createGain(); wg.gain.value = .015; wh.connect(wg); wg.connect(g); wh.start(t); nodes.push(wh); }
      } else ng.connect(g);
      const h = {
        kind, g, pan, rpm: 0, vol: 0,
        set(rpm, vol, p) {
          const tt = AUD.t; if (!isFinite(rpm) || !isFinite(vol) || (p && !isFinite(p[0] + p[1] + p[2]))) return; this.rpm = rpm; for (const [o, m] of oscs) o.frequency.setTargetAtTime(base * m * (.5 + rpm), tt, .08);
          lp.frequency.setTargetAtTime((kind === 'car' ? 500 : 400) + rpm * 1400, tt, .1);
          if (chop) chop.frequency.setTargetAtTime((kind === 'heli' ? 19 : 28) * clamp(rpm, .05, 1.2), tt, .2);
          g.gain.setTargetAtTime(vol, tt, .1);
          if (p) { if (pan.positionX) { pan.positionX.setTargetAtTime(p[0], tt, .03); pan.positionY.setTargetAtTime(p[1], tt, .03); pan.positionZ.setTargetAtTime(p[2], tt, .03); } else pan.setPosition(p[0], p[1], p[2]); }
        },
        stop() { const tt = AUD.t; g.gain.setTargetAtTime(0, tt, .2); setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch (e) { } }), 900); },
      };
      if (pos) h.set(.2, 0, pos);
      return h;
    });
  },
  // environment ambience for a mission
  ambience(kind) {
    const self = this;
    return this.loop(C => {
      const parts = [];
      const bus = this.amb;
      if (kind === 'swamp') {
        parts.push(this.mkNoiseLoop('brown', 'lowpass', 380, .5, .25, bus)); // wind/low bed
        parts.push(this.mkNoiseLoop('pink', 'bandpass', 5200, 9, .05, bus)); // insect hiss
        const cic = this.osc('sine', 4700); const am = C.createGain(); am.gain.value = 0; const lfo = this.osc('sine', 33); const lg = C.createGain(); lg.gain.value = .012; lfo.connect(lg); lg.connect(am.gain); cic.connect(am); am.connect(bus); cic.start(); lfo.start(); parts.push({ s: cic }, { s: lfo });
      } else if (kind === 'harbor') {
        parts.push(this.mkNoiseLoop('pink', 'highpass', 900, .5, .22, bus)); // rain
        parts.push(this.mkNoiseLoop('white', 'bandpass', 6000, .6, .06, bus)); // rain hiss
        parts.push(this.mkNoiseLoop('brown', 'lowpass', 250, .7, .45, bus)); // waves/sea
      } else if (kind === 'snow') {
        const w = this.mkNoiseLoop('pink', 'bandpass', 600, 2.5, .3, bus); parts.push(w);
        const lfo = this.osc('sine', .13); const lg = C.createGain(); lg.gain.value = 380; lfo.connect(lg); lg.connect(w.f.frequency); lfo.start(); parts.push({ s: lfo });
        parts.push(this.mkNoiseLoop('brown', 'lowpass', 300, .5, .35, bus));
      } else if (kind === 'party') {
        parts.push(this.mkNoiseLoop('brown', 'lowpass', 300, .5, .12, bus));
        const crowd = this.mkNoiseLoop('pink', 'bandpass', 650, .9, .1, bus); parts.push(crowd);
        const lfo = this.osc('sine', .3); const lg = C.createGain(); lg.gain.value = .04; lfo.connect(lg); lg.connect(crowd.g.gain); lfo.start(); parts.push({ s: lfo });
      } else if (kind === 'city') {
        parts.push(this.mkNoiseLoop('brown', 'lowpass', 220, .6, .45, bus)); parts.push(this.mkNoiseLoop('pink', 'bandpass', 900, .5, .05, bus)); parts.push(this.mkNoiseLoop('white', 'highpass', 4000, .5, .03, bus));
      } else if (kind === 'plane') {
        parts.push(this.mkNoiseLoop('brown', 'lowpass', 500, .6, .9, bus));
      }
      let nextEv = 0;
      return {
        parts, kind,
        update(dt, ctx) {
          nextEv -= dt; if (nextEv > 0) return; nextEv = .4 + Math.random() * 2.2;
          const L = self.listenerPos; const p = [L[0] + rnd(-40, 40), L[1], L[2] + rnd(-40, 40)];
          if (kind === 'swamp') {
            const r = Math.random();
            if (r < .45) self.frog(p); else if (r < .8) self.cricket(p); else self.bird(p);
          } else if (kind === 'harbor') { if (Math.random() < .1) self.foghorn(); else self.click(300 + Math.random() * 500, .25, p, .05); }
          else if (kind === 'snow') { if (Math.random() < .3) self.swoosh(.15, null, 400, 2); }
          else if (kind === 'party') { if (Math.random() < .3) self.voice('ha ha ha', 140 + Math.random() * 120, [L[0] + rnd(-12, 12), L[1], L[2] + rnd(-12, 12)]); else if (Math.random() < .25) self.click(5000 + Math.random() * 2000, .05, p, .01); }
          else if (kind === 'city') { const r = Math.random(); if (r < .12) self.sirenWail(); else if (r < .3) self.carPass(); else if (r < .38) self.beep(440, .25, .05); }
        },
        stop() { for (const p of parts) { try { p.s.stop(); } catch (e) { } } },
      };
    });
  },
  sirenWail() { const C = this.ctx, t = this.t; const o = this.osc('sawtooth', 700); const lp = this.filt('lowpass', 1500); const g = C.createGain(); o.connect(lp); lp.connect(g); g.connect(this.amb);
    for (let i = 0; i < 6; i++) { o.frequency.setValueAtTime(i % 2 ? 960 : 720, t + i * .45); } g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.025, t + .5); g.gain.setValueAtTime(.025, t + 2.4); g.gain.exponentialRampToValueAtTime(.0001, t + 2.9); o.start(t); o.stop(t + 3); },
  carPass() { const C = this.ctx, t = this.t; const g = C.createGain(); const bp = this.filt('bandpass', 300, .7); bp.frequency.linearRampToValueAtTime(600, t + 1.2); bp.frequency.linearRampToValueAtTime(250, t + 2.6); bp.connect(g); g.connect(this.amb); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.18, t + 1.2); g.gain.exponentialRampToValueAtTime(.0001, t + 2.8); this.noise(bp, t, 2.9, 'pink'); },
  partyMusic(pos) {
    const self = this;
    return this.loop(C => {
      const g = C.createGain(); g.gain.value = .5; const pan = C.createPanner(); pan.panningModel = 'equalpower'; pan.distanceModel = 'inverse'; pan.refDistance = 6; pan.rolloffFactor = 1.2;
      if (pan.positionX) { pan.positionX.value = pos[0]; pan.positionY.value = pos[1]; pan.positionZ.value = pos[2]; } g.connect(pan); pan.connect(this.amb); const sv = C.createGain(); sv.gain.value = .6; g.connect(sv); sv.connect(this.verbSend);
      const chords = [[220, 261.6, 329.6, 392], [174.6, 220, 261.6, 329.6], [196, 246.9, 293.7, 349.2], [164.8, 207.7, 246.9, 329.6]]; let beat = 0, next = 0;
      return { update() { const t = AUD.t; if (next < t) next = t + .05; while (next < t + .25) { const ch = chords[Math.floor(beat / 8) % 4]; const b = beat % 8;
        if (b === 0 || b === 3 || b === 6) for (const f of ch) { const o = self.osc('triangle', f); const og = C.createGain(); const lp = self.filt('lowpass', 1800); o.connect(lp); lp.connect(og); og.connect(g); self.env(og.gain, next, .02, .05, 1.1); o.start(next); o.stop(next + 1.2); }
        const bo = self.osc('sine', ch[0] / 2); const bg = C.createGain(); bo.connect(bg); bg.connect(g); self.env(bg.gain, next, .01, b % 2 ? .08 : .16, .28); bo.start(next); bo.stop(next + .32);
        if (b % 2 === 1) { const hg = C.createGain(); const hp = self.filt('highpass', 6000); hp.connect(hg); hg.connect(g); self.env(hg.gain, next, .001, .05, .05); self.noise(hp, next, .06); }
        if (b === 4) { const kg = C.createGain(); const lp2 = self.filt('bandpass', 1800, 1); lp2.connect(kg); kg.connect(g); self.env(kg.gain, next, .002, .08, .08); self.noise(lp2, next, .1); }
        beat++; next += .3; } }, stop() { g.gain.setTargetAtTime(0, AUD.t, .2); } };
    });
  },
  frog(p) {
    const C = this.ctx; const o = this.out(p, .35, { ref: 6, verb: .6, occl: false, bus: this.amb }); if (!o) return;
    const n = 2 + (Math.random() * 3 | 0); const base = 90 + Math.random() * 120;
    for (let i = 0; i < n; i++) {
      const t = this.t + i * .22; const os = this.osc('square', base); os.frequency.exponentialRampToValueAtTime(base * .7, t + .15);
      const lp = this.filt('lowpass', 600); const g = C.createGain(); os.connect(lp); lp.connect(g); g.connect(o); this.env(g.gain, t, .02, .4, .15); os.start(t); os.stop(t + .2);
    }
  },
  cricket(p) {
    const C = this.ctx; const o = this.out(p, .12, { ref: 4, verb: .3, occl: false, bus: this.amb }); if (!o) return;
    const f = 3800 + Math.random() * 1500;
    for (let i = 0; i < 6; i++) { const t = this.t + i * .05; const os = this.osc('sine', f); const g = C.createGain(); os.connect(g); g.connect(o); this.env(g.gain, t, .004, .6, .03); os.start(t); os.stop(t + .04); }
  },
  bird(p) {
    const C = this.ctx; const o = this.out(p, .1, { ref: 8, verb: .7, occl: false, bus: this.amb }); if (!o) return;
    const t = this.t; const os = this.osc('sine', 1800); os.frequency.exponentialRampToValueAtTime(900, t + .4); const g = C.createGain(); os.connect(g); g.connect(o); this.env(g.gain, t, .05, .5, .4); os.start(t); os.stop(t + .5);
  },
  foghorn() {
    const C = this.ctx, t = this.t; const g = C.createGain(); g.connect(this.amb); const lp = this.filt('lowpass', 300); lp.connect(g);
    for (const f of [82, 123]) { const os = this.osc('sawtooth', f); os.connect(lp); os.start(t); os.stop(t + 3.2); }
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.12, t + .5); g.gain.setValueAtTime(.12, t + 2.5); g.gain.exponentialRampToValueAtTime(.0001, t + 3.2);
  },
  humAt(pos, f = 50, vol = .25) {
    return this.loop(C => {
      const g = C.createGain(); g.gain.value = vol; const pan = C.createPanner(); pan.panningModel = 'equalpower'; pan.distanceModel = 'inverse'; pan.refDistance = 2.5; pan.rolloffFactor = 1.4;
      if (pan.positionX) { pan.positionX.value = pos[0]; pan.positionY.value = pos[1]; pan.positionZ.value = pos[2]; } else pan.setPosition(...pos);
      const lp = this.filt('lowpass', 420); lp.connect(g); g.connect(pan); pan.connect(this.sfx);
      const o1 = this.osc('sawtooth', f), o2 = this.osc('square', f * 2.003); const g2 = C.createGain(); g2.gain.value = .3; o1.connect(lp); o2.connect(g2); g2.connect(lp); o1.start(); o2.start();
      const nz = C.createBufferSource(); nz.buffer = this.pink; nz.loop = true; const nf = this.filt('bandpass', 1400, 1); const ng = C.createGain(); ng.gain.value = .15; nz.connect(nf); nf.connect(ng); ng.connect(g); nz.start();
      return { g, setOn(on) { g.gain.setTargetAtTime(on ? vol : 0, AUD.t, .5); }, stop() { try { o1.stop(); o2.stop(); nz.stop(); } catch (e) { } } };
    });
  },
  siren() {
    return this.loop(C => {
      const o = this.osc('sawtooth', 600); const lfo = this.osc('sine', .45); const lg = C.createGain(); lg.gain.value = 250; lfo.connect(lg); lg.connect(o.frequency);
      const lp = this.filt('lowpass', 1800); const g = C.createGain(); g.gain.value = 0; o.connect(lp); lp.connect(g); g.connect(this.amb);
      const s = C.createGain(); s.gain.value = .8; g.connect(s); s.connect(this.verbSend);
      o.start(); lfo.start(); g.gain.setTargetAtTime(.06, AUD.t, .5);
      return { stop() { g.gain.setTargetAtTime(0, AUD.t, .3); setTimeout(() => { try { o.stop(); lfo.stop(); } catch (e) { } }, 1500); } };
    });
  },
  // adaptive tension music
  music() {
    const self = this;
    return this.loop(C => {
      const drone = C.createGain(); drone.gain.value = .0; drone.connect(this.mus);
      const lp = this.filt('lowpass', 220, 2); lp.connect(drone);
      const o1 = this.osc('sawtooth', 41.2), o2 = this.osc('sawtooth', 41.6), o3 = this.osc('triangle', 61.7);
      [o1, o2, o3].forEach(o => { o.connect(lp); o.start(); });
      const lfo = this.osc('sine', .07); const lg = C.createGain(); lg.gain.value = 90; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
      drone.gain.setTargetAtTime(.16, AUD.t, 3);
      let beat = 0, level = 0, next = 0;
      return {
        setLevel(l) { level = l; },
        update(dt) {
          const t = AUD.t; if (next < t) next = t + .05;
          while (next < t + .2) {
            const b = beat % 16;
            if (level >= 1 && (b % 4 === 0 || (level >= 2 && b % 8 === 6))) { const k = self.osc('sine', 110); k.frequency.exponentialRampToValueAtTime(38, next + .15); const g = C.createGain(); k.connect(g); g.connect(self.mus); self.env(g.gain, next, .003, level >= 2 ? .55 : .3, .25); k.start(next); k.stop(next + .3); }
            if (level >= 2 && b % 2 === 1) { const g = C.createGain(); const hp = self.filt('highpass', 7000); hp.connect(g); g.connect(self.mus); self.env(g.gain, next, .001, .06, .04); self.noise(hp, next, .05); }
            if (level >= 1 && b === 8) { const p = self.osc('triangle', level >= 2 ? 164.8 : 123.5); const g = C.createGain(); const f = self.filt('lowpass', 900); p.connect(f); f.connect(g); g.connect(self.mus); self.env(g.gain, next, .02, .08, 1.2); p.start(next); p.stop(next + 1.3); }
            beat++; next += level >= 2 ? .14 : .2;
          }
        },
        stop() { drone.gain.setTargetAtTime(0, AUD.t, .5); setTimeout(() => { try { o1.stop(); o2.stop(); o3.stop(); lfo.stop(); } catch (e) { } }, 2000); },
      };
    });
  },
  update(dt) { for (const h of this.loops) if (h.update) h.update(dt); if (this.rate < .9) { this.heartT = (this.heartT || 0) - dt; if (this.heartT <= 0) { this.heartT = 1.1; this.heartbeat(); } } },
};
