/* =====================================================================
   OVERCAST — additional synthesized sound: rain (outdoor + roof drum),
   thunder, jets, turbofan cabin drone, mech servos, freefall wind, PA,
   slurps, hydraulic ramp + buzzer, menu & title music.
   ===================================================================== */
Object.assign(AUD, {
  // rain: outdoor hiss + droplets; 'indoor' param morphs it into a metal-roof drumming
  rainLoop() {
    return this.loop(C => {
      const hiss = this.mkNoiseLoop('pink', 'highpass', 900, .4, .0, this.amb);
      const body = this.mkNoiseLoop('brown', 'lowpass', 500, .6, .0, this.amb);
      const roof = this.mkNoiseLoop('white', 'bandpass', 2400, .8, .0, this.amb);
      let dropT = 0;
      const h = {
        k: 1, indoor: 0, set(k, indoor) { this.k = k; this.indoor = indoor; },
        update(dt) {
          const t = AUD.t, k = this.k, ind = this.indoor;
          hiss.g.gain.setTargetAtTime(k * (.22 * (1 - ind) + .04 * ind), t, .3); hiss.f.frequency.setTargetAtTime(ind ? 600 : 1100, t, .4);
          body.g.gain.setTargetAtTime(k * (.18 + ind * .25), t, .3);
          roof.g.gain.setTargetAtTime(k * ind * .09, t, .3);
          dropT -= dt; if (dropT <= 0 && k > .05) { dropT = ind ? .012 + Math.random() * .03 : .03 + Math.random() * .06; AUD.click(ind ? 900 + Math.random() * 1800 : 2500 + Math.random() * 4000, (ind ? .07 : .025) * k * (.4 + Math.random()), null, ind ? .02 : .008); }
        },
        stop() { for (const p of [hiss, body, roof]) try { p.s.stop(); } catch (e) { } },
      }; return h;
    });
  },
  thunder(dist = 1) {
    if (!this.ready) return; const C = this.ctx, t = this.t + dist * .8; const g = C.createGain(); const lp = this.filt('lowpass', 260 - dist * 60); lp.connect(g); g.connect(this.amb);
    const s = g; this.env(g.gain, t, .4 + dist * .4, .9 / (1 + dist), 5 + dist * 2); this.noise(lp, t, 8, 'brown');
    for (let i = 0; i < 4; i++) { const g2 = C.createGain(); const l2 = this.filt('lowpass', 500); l2.connect(g2); g2.connect(this.amb); this.env(g2.gain, t + .3 + i * (.4 + Math.random() * .6), .05, .35 / (1 + dist), 1.2); this.noise(l2, t + .3 + i * .5, 2, 'brown'); }
  },
  // generic positional loop built from oscillators + filtered noise; returns handle with set(level, pos)
  synthLoop(spec, pos) {
    return this.loop(C => {
      const g = C.createGain(); g.gain.value = 0; let pan = null;
      if (pos !== null) { pan = C.createPanner(); pan.panningModel = 'equalpower'; pan.distanceModel = 'inverse'; pan.refDistance = spec.ref || 10; pan.rolloffFactor = spec.roll || 1; g.connect(pan); pan.connect(spec.bus || this.sfx); } else g.connect(spec.bus || this.sfx);
      const send = C.createGain(); send.gain.value = spec.verb ?? .15; g.connect(send); send.connect(this.verbSend);
      const nodes = [], oscs = [], nzs = [];
      for (const o of spec.osc || []) { const os = this.osc(o.type || 'sawtooth', o.f); const og = C.createGain(); og.gain.value = o.v; let n = os; if (o.lp) { const f = this.filt('lowpass', o.lp, o.q || .7); os.connect(f); n = f; oscs.push([os, o, f]); } else oscs.push([os, o, null]); n.connect(og); og.connect(g); os.start(); nodes.push(os); }
      for (const n of spec.noise || []) { const s = C.createBufferSource(); s.buffer = this[n.type || 'pink']; s.loop = true; const f = this.filt(n.ft || 'bandpass', n.f, n.q || .7); const ng = C.createGain(); ng.gain.value = n.v; s.connect(f); f.connect(ng); ng.connect(g); s.start(this.t, Math.random()); nodes.push(s); nzs.push([s, n, f, ng]); }
      return {
        g, pan, lvl: 0,
        set(level, p, pitch = 1) {
          const t = AUD.t; if (!isFinite(level)) return; this.lvl = level; g.gain.setTargetAtTime(level, t, .12);
          for (const [os, o, f] of oscs) { os.frequency.setTargetAtTime(o.f * pitch * (o.track ? lerp(.6, 1.4, clamp(level, 0, 1)) : 1), t, .15); if (f && o.lpTrack) f.frequency.setTargetAtTime(o.lp * lerp(.6, 2.2, clamp(level, 0, 1)), t, .15); }
          for (const [s, n, f] of nzs) if (n.track) f.frequency.setTargetAtTime(n.f * lerp(.7, 1.8, clamp(level, 0, 1)) * pitch, t, .2);
          if (p && pan) { if (pan.positionX) { pan.positionX.setTargetAtTime(p[0], t, .03); pan.positionY.setTargetAtTime(p[1], t, .03); pan.positionZ.setTargetAtTime(p[2], t, .03); } else pan.setPosition(p[0], p[1], p[2]); }
        },
        stop() { const t = AUD.t; g.gain.setTargetAtTime(0, t, .3); setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch (e) { } }), 1500); },
      };
    });
  },
  jetLoop(pos) { return this.synthLoop({ ref: 25, roll: .8, osc: [{ type: 'sawtooth', f: 3400, v: .03, track: true, lp: 6000 }, { type: 'triangle', f: 6100, v: .015, track: true }], noise: [{ type: 'pink', f: 700, v: 1.1, track: true, q: .4 }, { type: 'brown', ft: 'lowpass', f: 160, v: 1.6 }], verb: .3 }, pos); },
  cabinLoop() { return this.synthLoop({ bus: this.amb, osc: [{ type: 'sawtooth', f: 58, v: .12, lp: 180, lpTrack: true }, { type: 'sine', f: 117, v: .07 }, { type: 'triangle', f: 2900, v: .006, track: true }], noise: [{ type: 'brown', ft: 'lowpass', f: 220, v: 1.2, track: true }, { type: 'pink', f: 1100, v: .12, q: .5 }], verb: .05 }, null); },
  windLoop() { return this.synthLoop({ bus: this.amb, noise: [{ type: 'pink', f: 900, v: 1.1, track: true, q: .35 }, { type: 'brown', ft: 'lowpass', f: 300, v: 1.4, track: true }, { type: 'white', ft: 'highpass', f: 4000, v: .08 }], verb: 0 }, null); },
  mechHum(pos) { return this.synthLoop({ ref: 8, osc: [{ type: 'sawtooth', f: 46, v: .2, lp: 140 }, { type: 'square', f: 92, v: .04, lp: 300 }, { type: 'sine', f: 1450, v: .008 }], noise: [{ type: 'brown', ft: 'lowpass', f: 180, v: .6 }] }, pos); },
  fireLoop(pos) { return this.synthLoop({ ref: 3, noise: [{ type: 'brown', ft: 'lowpass', f: 420, v: .9 }, { type: 'pink', f: 2400, v: .08 }] }, pos); },
  genLoop(pos) { return this.synthLoop({ ref: 5, osc: [{ type: 'sawtooth', f: 50, v: .08, lp: 220 }, { type: 'square', f: 100, v: .02, lp: 300 }], noise: [{ type: 'brown', ft: 'lowpass', f: 250, v: .5 }] }, pos); },
  stomp(pos, k = 1) {
    if (!this.ready) return; const C = this.ctx, t = this.t; const o = this.out(pos, 1.6 * k, { ref: 14, verb: .5 }); if (!o) return;
    const os = this.osc('sine', 62); os.frequency.exponentialRampToValueAtTime(28, t + .5); const g = C.createGain(); os.connect(g); g.connect(o); this.env(g.gain, t, .005, 1, .7); os.start(t); os.stop(t + .8);
    const lp = this.filt('lowpass', 900); const g2 = C.createGain(); lp.connect(g2); g2.connect(o); this.env(g2.gain, t, .004, .7, .35); this.noise(lp, t, .4, 'brown');
    setTimeout(() => this.hydraulic(pos, .6), 120); for (let i = 0; i < 3; i++) setTimeout(() => this.click(1800 + Math.random() * 1500, .15 * k, pos, .02), 60 + i * 50);
  },
  servo(pos, dur = .6, f = 380) {
    if (!this.ready) return; const C = this.ctx, t = this.t; const o = this.out(pos, .45, { ref: 6 }); if (!o) return;
    const os = this.osc('sawtooth', f); os.frequency.linearRampToValueAtTime(f * 1.5, t + dur * .6); os.frequency.linearRampToValueAtTime(f * 1.1, t + dur);
    const bp = this.filt('bandpass', f * 3, 3); const g = C.createGain(); os.connect(bp); bp.connect(g); g.connect(o); this.env(g.gain, t, .05, .5, dur, .0001); os.start(t); os.stop(t + dur + .1);
  },
  slurp() {
    if (!this.ready) return; const C = this.ctx; let t = this.t;
    for (let i = 0; i < 5; i++) { const bp = this.filt('bandpass', 600 + Math.random() * 900, 4); const g = C.createGain(); bp.connect(g); g.connect(this.sfx); this.env(g.gain, t, .02, .22, .12); this.noise(bp, t, .16, 'white'); t += .14 + Math.random() * .08; }
    const bp = this.filt('bandpass', 1800, 6); const g = C.createGain(); bp.connect(g); g.connect(this.sfx); this.env(g.gain, t, .01, .35, .3); this.noise(bp, t, .3, 'white');
  },
  squish() { if (!this.ready) return; const C = this.ctx, t = this.t; const bp = this.filt('bandpass', 400, 2); const g = C.createGain(); bp.connect(g); g.connect(this.sfx); this.env(g.gain, t, .01, .3, .15); this.noise(bp, t, .2, 'brown'); },
  buzzer(dur = 1.2) { if (!this.ready) return; const C = this.ctx, t = this.t; const o = this.osc('square', 180); const lp = this.filt('lowpass', 1200); const g = C.createGain(); o.connect(lp); lp.connect(g); g.connect(this.sfx); this.env(g.gain, t, .01, .12, dur, .0001); o.start(t); o.stop(t + dur + .1); },
  chime() { if (!this.ready) return; for (const [d, f] of [[0, 880], [.28, 660]]) { const C = this.ctx, t = this.t + d; const o = this.osc('sine', f); const g = C.createGain(); o.connect(g); g.connect(this.vox); this.env(g.gain, t, .01, .2, 1.1); o.start(t); o.stop(t + 1.3); } },
  radioCrackle(len) { if (!this.ready) return; const C = this.ctx, t = this.t; const bp = this.filt('bandpass', 2400, 1.2); const g = C.createGain(); g.gain.value = .045; bp.connect(g); g.connect(this.vox); this.noise(bp, t, len + .3, 'white'); this.beep(1600, .05, .08); },
  doorBang(pos, k = 1) { if (!this.ready) return; this.impact('metal', pos); const C = this.ctx, t = this.t; const o = this.out(pos, .8 * k, { ref: 3, verb: .6 }); if (!o) return; for (const f of [180, 251, 420]) { const os = this.osc('sine', f); const g = C.createGain(); os.connect(g); g.connect(o); this.env(g.gain, t, .003, .35, 1.2); os.start(t); os.stop(t + 1.3); } },
  creak(pos) { if (!this.ready) return; const C = this.ctx, t = this.t; const o = this.out(pos, .5, { ref: 3 }); if (!o) return; const os = this.osc('sawtooth', 90); os.frequency.linearRampToValueAtTime(140, t + .5); os.frequency.linearRampToValueAtTime(110, t + .9); const bp = this.filt('bandpass', 700, 6); const g = C.createGain(); os.connect(bp); bp.connect(g); g.connect(o); this.env(g.gain, t, .1, .4, .8, .0001); os.start(t); os.stop(t + 1); },
  whoosh(vol = .5) { this.swoosh(vol, null, 500, 1.2); },
  /* ---------- music: ambient pad + arpeggio (menu / title) ---------- */
  pad(kind = 'menu') {
    return this.loop(C => {
      const out = C.createGain(); out.gain.value = 0; out.connect(this.mus); const t0 = this.t; out.gain.linearRampToValueAtTime(kind === 'title' ? .5 : .32, t0 + 3);
      const verb = C.createGain(); verb.gain.value = .6; out.connect(verb); verb.connect(this.verbSend);
      const roots = kind === 'title' ? [41.2, 36.7, 49, 43.65] : [55, 51.9, 46.25, 49]; const nodes = []; let step = 0, nextT = t0, chord = 0;
      const voices = []; for (let i = 0; i < 4; i++) { const o = this.osc(i % 2 ? 'sawtooth' : 'triangle', 110); const lp = this.filt('lowpass', 600, .8); const g = C.createGain(); g.gain.value = .07; o.connect(lp); lp.connect(g); g.connect(out); o.start(); nodes.push(o); voices.push([o, lp]); }
      const sub = this.osc('sine', 55); const sg = C.createGain(); sg.gain.value = .25; sub.connect(sg); sg.connect(out); sub.start(); nodes.push(sub);
      const self = this;
      return {
        update() {
          const t = AUD.t; if (t < nextT - .05) return;
          if (step % 16 === 0) { chord = (chord + 1) % roots.length; const r = roots[chord]; const iv = [2, 3, 4.5, 6]; voices.forEach(([o, lp], i) => { o.frequency.setTargetAtTime(r * iv[i], t, .8); lp.frequency.setTargetAtTime(500 + Math.random() * 600, t, 2); }); sub.frequency.setTargetAtTime(r, t, .5); }
          // arpeggio pluck
          const r = roots[chord]; const notes = [4, 6, 8, 9, 12, 9, 8, 6]; const f = r * notes[step % 8] * (kind === 'title' ? 1 : 2);
          if (kind !== 'title' || step % 2 === 0) { const o = self.osc('square', f); const lp = self.filt('lowpass', 2200, 2); const g = C.createGain(); o.connect(lp); lp.connect(g); g.connect(out); self.env(g.gain, nextT, .005, .05, .35); o.start(nextT); o.stop(nextT + .45); }
          step++; nextT += kind === 'title' ? .32 : .2;
        },
        stop() { const t = AUD.t; out.gain.setTargetAtTime(0, t, .8); setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch (e) { } }), 4000); },
      };
    });
  },
  hackKey() { if (!this.ready) return; this.click(1800 + Math.random() * 2400, .06, null, .008); },
  granted() { if (!this.ready) return; for (const [d, f] of [[0, 660], [.12, 880], [.24, 1320]]) { const C = this.ctx, t = this.t + d; const o = this.osc('square', f); const lp = this.filt('lowpass', 3000); const g = C.createGain(); o.connect(lp); lp.connect(g); g.connect(this.sfx); this.env(g.gain, t, .005, .12, .25); o.start(t); o.stop(t + .3); } },
  denied() { this.beep(220, .12, .15); },
});
