/* =====================================================================
   OVERCAST — interface: matrix terminal menu with a hack-to-start breach,
   settings, pause, and a minimal HUD (no crosshair): prompts, subtitles,
   dialogue choices, objective, waypoint, altimeter, cards, fades.
   ===================================================================== */
const $ = id => document.getElementById(id);
const UI = {
  fadeV: 0, dlg: null, markFn: null,
  init() {
    // matrix rain
    this.mx = $('mx'); this.mctx = this.mx.getContext('2d'); this.cols = []; this.resizeMx(); addEventListener('resize', () => this.resizeMx());
    // menu buttons
    for (const b of document.querySelectorAll('[data-act]')) { b.addEventListener('mouseenter', () => { AUD.ready && AUD.uiHover(); }); b.addEventListener('click', () => { AUD.init(); AUD.uiClick && AUD.uiClick(); this.act(b.dataset.act); }); }
    this.buildSettings();
    this.showMenu();
    addEventListener('keydown', e => this.onKey(e));
    addEventListener('mousedown', e => { if (this.hacking && e.button === 0) this.hackStep(2); });
    $('gl').addEventListener('click', () => { if (G.state === 'play' && !IN.locked) IN.lock(); });
    this.typeLines($('termLog'), ['> establishing uplink ............ OK', '> node: KESTREL-FOB/relay-07', '> cipher: AES-512/rotating', '> operator credentials required', '> awaiting command_'], 18);
  },
  act(a) {
    if (a === 'start') this.startHack();
    else if (a === 'settings') { this.panel('set'); }
    else if (a === 'chapters') { this.buildChapters(); this.panel('chap'); }
    else if (a === 'credits') { this.panel('cred'); }
    else if (a === 'back') { this.panel(null); }
    else if (a === 'resume') { G.resume(); }
    else if (a === 'psettings') { $('pause').classList.remove('on'); this.panel('set'); this._fromPause = true; }
    else if (a === 'quit') { this.quitToMenu(); }
  },
  panel(id) {
    for (const p of ['set', 'cred', 'chap']) $(p).classList.toggle('on', p === id);
    $('term').classList.toggle('dim', !!id);
    if (!id && this._fromPause) { this._fromPause = false; $('pause').classList.add('on'); }
  },
  showMenu() { G.state = 'menu'; $('menu').classList.add('on'); $('hud').classList.remove('on'); $('pause').classList.remove('on'); $('endc').classList.remove('on'); this.fadeV = 0; $('fadeEl').style.opacity = 0; if (AUD.ready && !this.menuMusic) this.menuMusic = AUD.pad('menu'); },
  quitToMenu() { AUD.stopAllLoops(); this.menuMusic = null; if (window.speechSynthesis) speechSynthesis.cancel(); IN.unlock(); this.showMenu(); this.menuMusic = AUD.pad('menu'); },
  /* ---------------- hack to start ---------------- */
  startHack() {
    AUD.init(); if (!this.menuMusic) this.menuMusic = AUD.pad('menu');
    this.hacking = true; this.hackP = 0; $('hack').classList.add('on'); $('term').classList.add('dim'); $('hackCode').textContent = ''; $('hackBar').style.width = '0%'; $('hackPct').textContent = '0%'; $('hackMsg').textContent = 'HAMMER THE KEYBOARD TO BREACH THE FIREWALL'; $('hack').classList.remove('granted');
    this.codeSrc = HACK_CODE; this.codeI = 0;
  },
  hackStep(k = 1) {
    if (!this.hacking || this.hackP >= 100) return;
    AUD.hackKey(); const chunk = this.codeSrc.slice(this.codeI, this.codeI + 9 + (Math.random() * 7 | 0)); this.codeI = (this.codeI + chunk.length) % this.codeSrc.length;
    const el = $('hackCode'); el.textContent += chunk; if (el.textContent.length > 2400) el.textContent = el.textContent.slice(-1800); el.scrollTop = el.scrollHeight;
    this.hackP = Math.min(100, this.hackP + 2.6 * k + Math.random() * 1.6); $('hackBar').style.width = this.hackP.toFixed(0) + '%'; $('hackPct').textContent = this.hackP.toFixed(0) + '%';
    if (Math.random() < .08) { $('hackMsg').textContent = ['BYPASSING ICE LAYER 2', 'SPOOFING CREDENTIALS', 'INJECTING PAYLOAD', 'DECRYPTING DEPLOYMENT ORDERS', 'TRACE DETECTED — REROUTING'][Math.random() * 5 | 0]; }
    if (this.hackP >= 100) {
      $('hack').classList.add('granted'); $('hackMsg').textContent = 'ACCESS GRANTED'; AUD.granted();
      setTimeout(() => { this.hacking = false; this.fadeTo(1, .8); setTimeout(() => { $('hack').classList.remove('on'); $('menu').classList.remove('on'); $('term').classList.remove('dim'); if (this.menuMusic) { this.menuMusic.stop(); this.menuMusic = null; } $('hud').classList.add('on'); Story.start(); this.fadeTo(0, 2.5); }, 900); }, 1300);
    }
  },
  onKey(e) {
    if (this.hacking) { if (e.code === 'Escape') { this.hacking = false; $('hack').classList.remove('on'); $('term').classList.remove('dim'); return; } this.hackStep(1); e.preventDefault(); return; }
    if (G.state === 'menu' && e.code === 'Escape') this.panel(null);
    if (this.dlg && G.state === 'play') {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.dlgMove(-1); else if (e.code === 'KeyS' || e.code === 'ArrowDown') this.dlgMove(1);
      else if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') this.dlgPick();
      else if (/^Digit[1-9]$/.test(e.code)) { const i = +e.code.slice(5) - 1; if (i < this.dlg.opts.length) { this.dlg.sel = i; this.dlgPick(); } }
    }
  },
  /* ---------------- matrix rain ---------------- */
  resizeMx() { const c = this.mx; c.width = innerWidth; c.height = innerHeight; const n = Math.ceil(c.width / 16); this.cols = []; for (let i = 0; i < n; i++) this.cols.push({ y: Math.random() * -c.height, s: 6 + Math.random() * 14 }); this.mctx.fillStyle = '#000'; this.mctx.fillRect(0, 0, c.width, c.height); },
  menuFrame(dt) {
    this.fadeV = this._fadeAnim(dt);
    const c = this.mx, x = this.mctx; if (!$('menu').classList.contains('on')) return;
    x.fillStyle = 'rgba(0,0,0,0.075)'; x.fillRect(0, 0, c.width, c.height); x.font = '15px "Share Tech Mono", monospace';
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEFXZ#$%&@<>/\\|=+*';
    for (let i = 0; i < this.cols.length; i++) {
      const col = this.cols[i]; col.y += col.s * dt * 18 * (this.hacking ? 2.2 : 1);
      const ch = chars[(Math.random() * chars.length) | 0]; const px = i * 16;
      x.fillStyle = '#d8ffd8'; x.fillText(ch, px, col.y);
      x.fillStyle = 'rgba(0,255,90,.7)'; x.fillText(chars[(Math.random() * chars.length) | 0], px, col.y - 16);
      if (col.y > c.height + Math.random() * 400) { col.y = Math.random() * -200; col.s = 6 + Math.random() * 14; }
    }
    if (AUD.ready) AUD.update(dt);
    $('clock').textContent = new Date().toISOString().slice(11, 19) + 'Z';
  },
  typeLines(el, lines, cps) { el.textContent = ''; let li = 0, ci = 0; const tick = () => { if (li >= lines.length) return; const l = lines[li]; el.textContent += l[ci++] || ''; if (ci > l.length) { el.textContent += '\n'; li++; ci = 0; } setTimeout(tick, 1000 / cps * (ci === 0 ? 8 : 1)); }; tick(); },
  buildChapters() {
    const box = $('chapList'); box.innerHTML = ''; const prog = Progress.get();
    for (const ch of Progress.CH) {
      const st = prog[ch.n]; const d = document.createElement('div'); d.className = 'chap' + (st ? '' : ' locked');
      const img = st && st.img ? `<img src="${st.img}" alt="">` : st ? `<div class="noimg">NO PREVIEW YET</div>` : `<div class="lock"><svg viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3h1.5A1.5 1.5 0 0 1 20 11.5v9A1.5 1.5 0 0 1 18.5 22h-13A1.5 1.5 0 0 1 4 20.5v-9A1.5 1.5 0 0 1 5.5 10H7zm2 0h6V7a3 3 0 0 0-6 0v3z"/></svg></div>`;
      d.innerHTML = `<div class="pv">${img}</div><div class="ct"><small>CHAPTER ${String(ch.n).padStart(2, '0')}</small><b>${st ? ch.title : 'LOCKED'}</b><span>${st ? ch.sub : 'Play the story to unlock'}</span></div>`;
      if (st) d.onclick = () => { AUD.init(); AUD.uiClick && AUD.uiClick(); this.panel(null); this.launch(ch.n); }; else d.onclick = () => AUD.ready && AUD.denied();
      box.appendChild(d);
    }
  },
  launch(n) { // chapter start from the menu (no hack needed: it's your own save)
    this.fadeTo(1, .6); setTimeout(() => { $('menu').classList.remove('on'); if (this.menuMusic) { this.menuMusic.stop(); this.menuMusic = null; } $('hud').classList.add('on'); if (n === 1) Story.start(); else Story.startChapter(n); this.fadeTo(0, 2); }, 650);
  },
  /* ---------------- settings ---------------- */
  buildSettings() {
    const S = G.settings; const box = $('setBody'); box.innerHTML = '';
    const row = (label, html) => { const d = document.createElement('div'); d.className = 'srow'; d.innerHTML = '<label>' + label + '</label>' + html; box.appendChild(d); return d; };
    const slider = (k, label, min, max, unit = '') => { const r = row(label, `<input type="range" min="${min}" max="${max}" value="${S[k]}"><b>${S[k]}${unit}</b>`); const i = r.querySelector('input'), b = r.querySelector('b'); i.oninput = () => { S[k] = +i.value; b.textContent = i.value + unit; G.saveSettings(); }; };
    const toggle = (k, label) => { const r = row(label, `<button class="tg">${S[k] ? 'ON' : 'OFF'}</button>`); const b = r.querySelector('button'); b.onclick = () => { S[k] = !S[k]; b.textContent = S[k] ? 'ON' : 'OFF'; G.saveSettings(); }; };
    const sel = (k, label, opts) => { const r = row(label, `<select>${opts.map(o => `<option value="${o}" ${S[k] === o ? 'selected' : ''}>${o.toUpperCase()}</option>`).join('')}</select>`); const s = r.querySelector('select'); s.onchange = () => { S[k] = s.value; G.saveSettings(); }; };
    slider('sens', 'MOUSE SENSITIVITY', 1, 100, '%'); toggle('invert', 'INVERT MOUSE Y'); slider('fov', 'FIELD OF VIEW', 60, 100, '°');
    sel('quality', 'GRAPHICS QUALITY', ['low', 'medium', 'high']); toggle('lens', 'RAIN ON LENS');
    slider('master', 'MASTER VOLUME', 0, 100, '%'); slider('music', 'MUSIC', 0, 100, '%'); slider('voice', 'VOICES', 0, 100, '%'); slider('sfx', 'EFFECTS', 0, 100, '%');
    toggle('speech', 'SPOKEN DIALOGUE (TTS)'); toggle('subs', 'SUBTITLES');
  },
  /* ---------------- pause ---------------- */
  showPause(on) { $('pause').classList.toggle('on', on); },
  /* ---------------- HUD ---------------- */
  loading(on) { $('loading').classList.toggle('on', on); },
  fatal(e) { $('loading').classList.add('on'); $('loading').textContent = 'ERROR: ' + (e && e.message || e); },
  objective(t) { const o = $('obj'); if (o._t === t) return; o._t = t; o.classList.remove('on'); if (t) setTimeout(() => { o.querySelector('span').textContent = t; o.classList.add('on'); }, 300); },
  hint(t) { const h = $('hint'); h.textContent = t; h.classList.toggle('on', !!t); },
  card(lines) { const c = $('card'); c.classList.add('on'); this.typeLines(c.querySelector('pre'), lines, 26); setTimeout(() => c.classList.remove('on'), 9000); },
  marker(fn) { this.markFn = fn; if (!fn) $('marker').classList.remove('on'); },
  subtitle(name, text, radio) {
    if (!G.settings.subs) return; const s = $('subs'); s.innerHTML = (name ? `<b class="${radio ? 'radio' : ''}">${name}</b>` : '') + `<span>${text}</span>`; s.classList.add('on');
    clearTimeout(this._st); this._st = setTimeout(() => s.classList.remove('on'), Math.max(2200, text.length * 70 + 900));
  },
  dialog(opts, cb) { this.dlg = { opts, cb, sel: 0 }; const d = $('dialog'); d.innerHTML = opts.map((o, i) => `<div class="opt" data-i="${i}"><i>${i + 1}</i>${o}</div>`).join('') + '<div class="dh">W / S or SCROLL to choose · E to answer</div>'; d.classList.add('on'); for (const el of d.querySelectorAll('.opt')) { el.onmouseenter = () => { this.dlg.sel = +el.dataset.i; this.dlgDraw(); }; el.onclick = () => this.dlgPick(); } this.dlgDraw(); },
  dlgMove(k) { if (!this.dlg) return; this.dlg.sel = (this.dlg.sel + k + this.dlg.opts.length) % this.dlg.opts.length; this.dlgDraw(); AUD.uiHover && AUD.uiHover(); },
  dlgDraw() { const d = $('dialog'); d.querySelectorAll('.opt').forEach((el, i) => el.classList.toggle('sel', i === this.dlg.sel)); },
  dlgPick() { if (!this.dlg) return; const { cb, sel } = this.dlg; this.dlg = null; $('dialog').classList.remove('on'); AUD.uiClick && AUD.uiClick(); cb(sel); },
  fadeTo(v, dur) { this._fade = { from: this.fadeV, to: v, t: 0, dur }; },
  _fadeAnim(dt) { const f = this._fade; if (!f) return this.fadeV; f.t += dt; const k = clamp(f.t / f.dur, 0, 1); const v = lerp(f.from, f.to, smooth(k)); if (k >= 1) this._fade = null; $('fadeEl').style.opacity = v; return v; },
  endCard(part) { const T = { 1: ['END OF PART ONE', 'THE DROP', 'The story continues on the ground.'], 2: ['END OF PART TWO', 'THE GREEN', 'Mox is waiting at the river.'], 3: ['END OF PART THREE', 'THE RIVER', 'South, along the water. On foot.'] }[part || 1]; $('endc').querySelector('.e1').textContent = T[0]; $('endc').querySelector('.e3').textContent = T[1]; $('endc').querySelector('.e4').textContent = T[2]; $('detect').classList.remove('on'); $('ammoBox').classList.remove('on'); $('endc').classList.add('on'); $('hud').classList.remove('on'); IN.unlock(); setTimeout(() => { $('endc').onclick = () => { $('endc').classList.remove('on'); this.quitToMenu(); }; }, 1500); },
  signal(w) { const el = $('signal'); if (el._w === (w > 0)) { if (w > 0) el.style.opacity = w; return; } el._w = w > 0; el.classList.toggle('on', w > 0); el.style.opacity = w; },
  lost(on) { $('lostScr').classList.toggle('on', on); },
  died(on) { $('diedScr').classList.toggle('on', on); },
  detect(v, ammo, drawn) {
    const el = $('detect'); const t = v >= 2 ? 'ENGAGED' : v >= 1 ? 'SPOTTED' : v > .35 ? 'SUSPICIOUS' : v > .05 ? 'NOTICED' : 'HIDDEN'; if (el._t !== t) { el._t = t; el.querySelector('span').textContent = t; el.className = 'on ' + t.toLowerCase(); }
    el.querySelector('i').style.width = (Math.min(v, 1) * 100).toFixed(0) + '%';
    const am = $('ammoBox'); const at = drawn ? ammo.mag + ' / ' + ammo.res : ''; if (am._t !== at) { am._t = at; am.textContent = at; am.classList.toggle('on', !!at); }
  },
  zoomInd(z) { const el = $('zoom'); if (!el) return; const t = z ? z.toFixed(1).replace('.0', '') + '×' : ''; if (el._t !== t) { el._t = t; el.textContent = t; el.classList.toggle('on', !!z); } },
  hudFrame(dt) {
    this.fadeV = this._fadeAnim(dt);
    // prompt
    const pr = $('prompt'); const t = P.prompt || ''; if (pr._t !== t) { pr._t = t; const m = t.match(/^\[(.+?)\]\s*(.*)$/); pr.innerHTML = m ? `<kbd>${m[1]}</kbd><span>${m[2]}</span>` : `<span>${t}</span>`; pr.classList.toggle('on', !!t); }
    // dialogue: mouse wheel moves the selection
    if (this.dlg && IN.wheel) this.dlgMove(IN.wheel > 0 ? 1 : -1);
    if (this.dlg && IN.mbHit[0]) this.dlgPick();
    // waypoint marker
    const mk = $('marker'); const p = this.markFn ? this.markFn() : null;
    if (p) { const c = G.cam; const d = V.sub(p, c.pos); const dist = V.len(d); const z = V.dot(d, c.fwd); if (z > .5 && dist > 3) { const x = V.dot(d, c.right) / z, y = V.dot(d, c.up) / z; const f = 1 / Math.tan(c.fov / 2); const sx = (x * f / (R.w / R.h) * .5 + .5) * innerWidth, sy = (-y * f * .5 + .5) * innerHeight; mk.style.transform = `translate(${clamp(sx, 40, innerWidth - 40)}px,${clamp(sy, 40, innerHeight - 40)}px)`; mk.querySelector('span').textContent = dist.toFixed(0) + ' m'; mk.classList.add('on'); } else mk.classList.remove('on'); } else mk.classList.remove('on');
    // altimeter while falling
    const al = $('alt'); if (P.state === 'fall') { al.classList.add('on'); al.querySelector('b').textContent = Math.max(0, P.pos[1]).toFixed(0); al.querySelector('i').textContent = (P.speed * 3.6).toFixed(0) + ' KM/H'; } else al.classList.remove('on');
  },
};
const HACK_CODE = `#include <uplink.h>
int breach(node_t *n){ for(int i=0;i<n->ice;i++){ if(!spoof(n,i)) return trace(n); } return 0; }
ssh -p 2222 op@kestrel.relay-07 --key=/dev/shm/.k
[ok] tunnel up 10.41.7.2 -> 10.41.0.1
$ cat /ops/raven21/manifest.enc | decrypt --rot 512
0x7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00 03 00 3e 00
STICK: 20  AIRCRAFT: RAVEN 21  DZ: GRID 48Q-TT-0912
WX: OVC008 +RA  WIND 140/18G28  VIS 3000
while(firewall.alive){ payload.inject(rand()); firewall.hp -= 7; }
>> handshake 3/5 ... spoofing MAC 00:1B:44:11:3A:B7
>> ICE layer 2 collapsing ...
function overcast(){ return rain.map(drop => drop.fall()).filter(Boolean) }
SELECT * FROM jumpers WHERE stick = 'B' ORDER BY seat;
| ROOK  | B-17 | static | GO |  | MOX | B-18 | static | GO |
`;
