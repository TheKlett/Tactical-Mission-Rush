/* =====================================================================
   UI — menus, briefing tactical map, armory, settings, statistics, HUD.
   ===================================================================== */
const $ = id => document.getElementById(id);
const ICONS = {
  pistol: '<svg viewBox="0 0 64 32"><path d="M6 8h40l2-2h6v6h-4v3H28l-3 3 2 10h-9l-3-11-9-1z" fill="currentColor"/><rect x="46" y="9" width="16" height="5" fill="currentColor" opacity=".7"/></svg>',
  ar7: '<svg viewBox="0 0 96 32"><path d="M4 12l14-2 4-3h44v4h20v4H66v2H50l-4 2-6 10h-7l3-10h-6l-2 6h-6l1-6-9-1-12 3z" fill="currentColor"/><rect x="40" y="18" width="7" height="11" fill="currentColor" transform="rotate(10 43 23)"/><rect x="36" y="4" width="14" height="3" fill="currentColor"/></svg>',
  mk17: '<svg viewBox="0 0 96 32"><path d="M4 11l16-2 4-3h44v5h22v4H68v3H52l-4 2-6 10h-7l3-10h-6l-2 6h-6l1-6-9-1-12 3z" fill="currentColor"/><rect x="40" y="18" width="8" height="10" fill="currentColor"/><rect x="34" y="3" width="16" height="3" fill="currentColor"/></svg>',
  knife: '<svg viewBox="0 0 64 32"><path d="M4 14h20v4H4z" fill="currentColor"/><path d="M24 11h3v10h-3z" fill="currentColor"/><path d="M27 13h26l8 3-8 3H27z" fill="currentColor" opacity=".85"/></svg>',
  ledger: '<svg viewBox="0 0 64 32"><rect x="18" y="4" width="28" height="24" rx="2" fill="currentColor"/><rect x="22" y="9" width="20" height="2" fill="#000" opacity=".5"/><rect x="22" y="14" width="16" height="2" fill="#000" opacity=".5"/></svg>',
  dossier: '<svg viewBox="0 0 64 32"><path d="M16 6h12l3 3h17v19H16z" fill="currentColor"/></svg>',
  drive: '<svg viewBox="0 0 64 32"><rect x="16" y="7" width="32" height="18" rx="2" fill="currentColor"/><circle cx="42" cy="21" r="2" fill="#2a7fff"/></svg>',
  keycard: '<svg viewBox="0 0 64 32"><rect x="18" y="5" width="28" height="22" rx="3" fill="currentColor"/><rect x="22" y="9" width="8" height="6" fill="#b01818"/></svg>',
  charge: '<svg viewBox="0 0 64 32"><rect x="14" y="9" width="36" height="16" fill="currentColor"/><rect x="26" y="5" width="12" height="5" fill="currentColor"/><circle cx="34" cy="7" r="1.6" fill="#f22"/></svg>',
  codes: '<svg viewBox="0 0 64 32"><rect x="16" y="8" width="32" height="18" fill="currentColor"/><rect x="20" y="12" width="24" height="3" fill="#b01818"/></svg>',
  noisemaker: '<svg viewBox="0 0 64 32"><rect x="24" y="8" width="16" height="20" rx="3" fill="currentColor"/><circle cx="32" cy="6" r="3" fill="#ff8a00"/><path d="M44 10q5 6 0 12M48 7q8 9 0 18" stroke="currentColor" fill="none" stroke-width="2"/></svg>',
  smoke: '<svg viewBox="0 0 64 32"><rect x="24" y="8" width="16" height="20" rx="2" fill="currentColor"/><rect x="28" y="4" width="8" height="4" fill="currentColor"/></svg>',
};
const UI = {
  screen: null, dirtySubs: false, dirtyNotif: false, eyeO: 0, hitT: 0,
  init() {
    this.bg = $('bg'); this.bgc = this.bg.getContext('2d'); this.eyeC = $('eye').getContext('2d'); this.miniC = $('mini').getContext('2d');
    document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { AUD.init(); AUD.uiClick(); this.go(b.dataset.go); }));
    document.querySelectorAll('button, .card').forEach(b => b.addEventListener('mouseenter', () => AUD.ready && AUD.uiHover()));
    $('btnDeploy').onclick = () => { AUD.init(); AUD.uiClick(); const next = MISSIONS.find(m => !G.career.completed[m.id]) || MISSIONS[0]; this.openBriefing(next.id); };
    $('bDeploy').onclick = () => { AUD.uiClick(); this.show(null); G.begin(); IN.lock(); };
    $('bBack').onclick = () => { AUD.uiClick(); G.disposeWorld(); G.state = 'menu'; this.go('missions'); };
    $('pResume').onclick = () => G.resume(); $('pRestart').onclick = () => { this.pause(false); G.retry(); }; $('pAbort').onclick = () => this.abort(); $('pSettings').onclick = () => { this.settingsFrom = 'pause'; this.go('settings'); };
    $('fRetry').onclick = () => { this.show(null); G.retry(); }; $('fAbort').onclick = () => this.abort();
    $('rNext').onclick = () => { G.disposeWorld(); G.state = 'menu'; this.showHUD(false); const i = MISSIONS.findIndex(m => m.id === G.M.id); this.go('missions'); this.selMission = MISSIONS[Math.min(2, i + 1)].id; this.renderMissions(); };
    $('rReplay').onclick = () => { this.show(null); G.retry(); };
    this.buildMissions(); this.buildArmory(); this.buildSettings();
    // tactical map interaction
    const mc = $('tmap'); this.tm = { zoom: 1, tz: 1, rot: 0, tr: 0, px: 0, py: 0, tpx: 0, tpy: 0, drag: null };
    mc.addEventListener('wheel', e => { e.preventDefault(); this.tm.tz = clamp(this.tm.tz * (e.deltaY > 0 ? .85 : 1.18), .6, 6); }, { passive: false });
    mc.addEventListener('mousedown', e => { this.tm.drag = { b: e.button, x: e.clientX, y: e.clientY }; });
    addEventListener('mouseup', () => { this.tm.drag = null; });
    addEventListener('mousemove', e => { const d = this.tm.drag; if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY; if (d.b === 2 || e.shiftKey) this.tm.tr += dx * .008; else { const c = Math.cos(-this.tm.rot), s = Math.sin(-this.tm.rot); this.tm.tpx -= (dx * c - dy * s) / this.tm.zoom; this.tm.tpy -= (dx * s + dy * c) / this.tm.zoom; } });
    $('tmRotL').onclick = () => this.tm.tr -= Math.PI / 4; $('tmRotR').onclick = () => this.tm.tr += Math.PI / 4; $('tmZin').onclick = () => this.tm.tz = Math.min(6, this.tm.tz * 1.4); $('tmZout').onclick = () => this.tm.tz = Math.max(.6, this.tm.tz / 1.4); $('tmReset').onclick = () => { this.tm.tz = 1; this.tm.tr = 0; this.tm.tpx = 0; this.tm.tpy = 0; };
    this.go('main');
    G.onKey = e => { if (e.code === 'Escape') { if (G.state === 'paused' && this.screen === 'pause') G.resume(); else if (this.screen === 'settings' && this.settingsFrom === 'pause') this.go('pause'); else if (G.state === 'menu' && this.screen !== 'main') this.go('main'); } };
  },
  show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); this.screen = id; $('bg').style.opacity = (id && G.state === 'menu') || id === 'loading' ? 1 : 0; },
  go(id) {
    if (id === 'missions') this.renderMissions(); if (id === 'stats') this.renderStats(); if (id === 'armory') this.renderArmory(); if (id === 'settings') this.syncSettings();
    if (id === 'back') { if (this.settingsFrom === 'pause') { this.settingsFrom = null; return this.go('pause'); } return this.go('main'); }
    this.show(id);
  },
  abort() { this.pause(false); G.disposeWorld(); G.state = 'menu'; this.showHUD(false); this.letterbox(false); this.fade(0, .1); IN.unlock(); this.go('main'); },
  loading(text, fn) { this.show('loading'); $('ldText').textContent = text; G.state = 'loading'; setTimeout(() => { try { fn(); } catch (e) { console.error(e); $('ldText').textContent = 'ERROR: ' + e.message; } }, 60); },
  openBriefing(id) {
    this.loading('GENERATING AREA OF OPERATIONS', () => {
      G.buildMission(id); G.state = 'briefing'; const M = G.M;
      $('bNum').textContent = 'MISSION ' + M.num; $('bName').textContent = M.name; $('bCode').textContent = M.code; $('bLoc').textContent = M.location; $('bTime').textContent = M.time; $('bWeather').textContent = M.weather;
      $('bDiff').innerHTML = [1, 2, 3, 4, 5].map(i => '<i class="' + (i <= M.difficulty ? 'on' : '') + '"></i>').join('');
      $('bText').textContent = M.briefing;
      $('bObj').innerHTML = M.objectives.filter(o => o.type !== 'hidden').map(o => '<li class="' + o.type + '"><span>' + (o.type === 'primary' ? 'PRIMARY' : 'OPTIONAL') + '</span>' + o.text + '</li>').join('');
      $('bIntel').innerHTML = M.intel.map(t => '<li>' + t + '</li>').join('');
      this.openBriefingRefresh(); $('bPay').textContent = '₵ ' + (M.reward || ({ m1: 5000, m2: 7000, m3: 8500 })[M.id]).toLocaleString('en-US') + (M.civPayout ? ' · REDUCED BY CIVILIAN CASUALTIES' : '');
      this.makeTacMap(); this.tm.zoom = .5; this.tm.tz = 1; this.tm.rot = -.6; this.tm.tr = 0; this.tm.px = this.tm.tpx = 0; this.tm.py = this.tm.tpy = 0;
      this.show('brief');
    });
  },
  /* ---------------- missions list ---------------- */
  buildMissions() {
    $('mList').innerHTML = MISSIONS.map(m => `<div class="card mcard" data-id="${m.id}"><div class="mnum">${m.num}</div><div class="minfo"><div class="mname">${m.name}</div><div class="mcode">${m.code}</div><div class="mloc">${m.location}</div><div class="mmeta"><span>${m.time}</span><span>${m.weather}</span></div></div><div class="mstat"></div></div>`).join('');
    document.querySelectorAll('.mcard').forEach(c => { c.onclick = () => { AUD.init(); AUD.uiClick(); this.openBriefing(c.dataset.id); }; });
  },
  renderMissions() {
    document.querySelectorAll('.mcard').forEach(c => { const id = c.dataset.id; const C = G.career; const st = c.querySelector('.mstat'); st.innerHTML = C.completed[id] ? `<b>${C.ratings[id] || '-'}</b><span>BEST ${fmtTime(C.best[id])}</span>` : '<span>NOT COMPLETED</span>'; c.classList.toggle('sel', id === this.selMission); });
  },
  /* ---------------- armory ---------------- */
  buildArmory() {
    const opt = (grp, items) => items.map(([k, n, d]) => `<div class="card opt" data-grp="${grp}" data-k="${k}"><div class="on">${n}</div><div class="od">${d}</div></div>`).join('');
    $('arRifle').innerHTML = opt('rifle', [['ar7', 'AR-7 CARBINE', '5.56 · 30 rds · 760 RPM · light, controllable'], ['mk17', 'MK-17 BATTLE RIFLE', '7.62 · 20 rds · 560 RPM · heavy hitting']]);
    $('arOptic').innerHTML = opt('optic', [['iron', 'IRON SIGHTS', 'Flip-up irons · widest view'], ['reddot', 'RED DOT', '1× reflex · fast acquisition'], ['holo', 'HOLOGRAPHIC', '1.25× ring reticle · tighter view']]);
    $('arGadget').innerHTML = opt('gadget', [['noisemaker', 'NOISE MAKER ×2', 'Thrown beacon — lures guards to investigate'], ['smoke', 'SMOKE GRENADE ×2', 'Blocks line of sight for ~15 s']]);
    $('arMags').innerHTML = opt('extraMags', [['false', 'STANDARD LOAD', 'Lighter kit'], ['true', '+2 MAGAZINES', 'More ammunition for loud approaches']]);
    document.querySelectorAll('.opt').forEach(c => c.onclick = () => { AUD.uiClick(); const g = c.dataset.grp; let v = c.dataset.k; if (g === 'extraMags') v = v === 'true'; G.loadout[g] = v; G.saveSettings(); this.renderArmory(); });
  },
  renderArmory() {
    document.querySelectorAll('.opt').forEach(c => { const v = G.loadout[c.dataset.grp]; c.classList.toggle('sel', String(v) === c.dataset.k); });
    const w = WEAPONS[G.loadout.rifle]; const bar = (n, v) => `<div class="stat"><span>${n}</span><i style="--v:${v}"></i></div>`;
    $('arStats').innerHTML = `<div class="wtitle">${w.name}</div>` + bar('DAMAGE', w.dmg / 60) + bar('FIRE RATE', w.rpm / 900) + bar('CAPACITY', w.mag / 30) + bar('CONTROL', 1 - w.recoil / .045) + bar('NOISE', w.noise / 170) + `<div class="wtitle s">P-9 SD SUPPRESSED PISTOL</div>` + bar('DAMAGE', WEAPONS.pistol.dmg / 60) + bar('NOISE', WEAPONS.pistol.noise / 170);
    this.previewKey = null;
  },
  armoryPreview(dt) {
    if (!R.gl) return; const key = G.loadout.rifle + G.loadout.optic;
    if (this.previewKey !== key) { this.previewKey = key; if (this.prevMesh) this.prevMesh.dispose(); const B = new MB(8000); buildRifleVM(B, G.loadout.rifle, G.loadout.optic); this.prevMesh = B.mesh(); }
    if (!this.prevP) { const B = new MB(4000); buildPistolVM(B); this.prevP = B.mesh(); const K = new MB(2000); buildKnifeVM(K, VB.KNIFE); this.prevK = K.mesh(); this.pb = new Float32Array(VB.N * 16); this.pp = new Float32Array(VB.N * 16); this.pk = new Float32Array(VB.N * 16); }
    const t = performance.now() / 1000; const m = M4.create(); M4.translate(m, m, .18, .04, -1.15); M4.rotY(m, m, t * .5); M4.rotX(m, m, .12);
    const sb = (arr, mm) => { for (let i = 0; i < VB.N; i++) arr.set(mm, i * 16); };
    sb(this.pb, m); const mp = M4.create(); M4.translate(mp, mp, -.32, .12, -1.1); M4.rotY(mp, mp, -t * .4 + 1); sb(this.pp, mp);
    const mk = M4.create(); M4.translate(mk, mk, -.36, -.18, -1.05); M4.rotY(mk, mk, t * .3); M4.rotZ(mk, mk, Math.PI / 2); sb(this.pk, mk);
    const env = { sunDir: V.norm([.4, .8, .5]), sunCol: [2.2, 2.0, 1.8], sky: [.25, .26, .28], gnd: [.05, .04, .04], fog: [0, 0, 0], fogD: 0, expo: 1.2, zen: [.01, .01, .012], hor: [.04, .03, .03], night: 0, cloud: 0, skyFog: 0 };
    const S = { chunks: [], dyn: [{ mesh: this.prevMesh, bones: this.pb }, { mesh: this.prevP, bones: this.pp }, { mesh: this.prevK, bones: this.pk }], env, lights: [{ pos: [-1, .5, 0], col: [1, .1, .08], i: 3, range: 4 }, { pos: [1, 1, .5], col: [.8, .85, 1], i: 1.5, range: 5 }], particles: [], time: t };
    const view = M4.create(); R.render(S, { pos: [0, 0, 0], view, fov: 40 * DEG, fwd: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0], near: .05, far: 20 });
  },
  /* ---------------- settings ---------------- */
  buildSettings() {
    const S = [['sens', 'MOUSE SENSITIVITY', 'range', .2, 3, .05], ['fov', 'FIELD OF VIEW', 'range', 60, 100, 1], ['invert', 'INVERT Y AXIS', 'bool'], ['master', 'MASTER VOLUME', 'range', 0, 1, .01], ['amb', 'AMBIENCE VOLUME', 'range', 0, 1, .01], ['music', 'MUSIC VOLUME', 'range', 0, 1, .01], ['quality', 'GRAPHICS QUALITY', 'sel', ['low', 'medium', 'high', 'ultra']], ['shadows', 'DYNAMIC SHADOWS', 'bool'], ['scale', 'RENDER SCALE', 'range', .5, 1, .05], ['difficulty', 'DIFFICULTY', 'sel', ['easy', 'normal', 'hard']], ['markers', 'OBJECTIVE MARKERS', 'bool'], ['subtitles', 'SUBTITLES', 'bool']];
    $('setList').innerHTML = S.map(([k, n, t, a, b, s]) => `<div class="setrow"><label>${n}</label>${t === 'range' ? `<input type="range" id="s_${k}" min="${a}" max="${b}" step="${s}"><output id="o_${k}"></output>` : t === 'bool' ? `<button class="tog" id="s_${k}"></button>` : `<div class="seg" id="s_${k}">${a.map(v => `<button data-v="${v}">${v.toUpperCase()}</button>`).join('')}</div>`}</div>`).join('');
    for (const [k, n, t] of S) {
      const el = $('s_' + k);
      if (t === 'range') el.oninput = () => { G.settings[k] = parseFloat(el.value); $('o_' + k).textContent = k === 'fov' ? el.value + '°' : Math.round(el.value * 100) / 100; G.applySettings(); G.saveSettings(); };
      else if (t === 'bool') el.onclick = () => { G.settings[k] = !G.settings[k]; this.syncSettings(); G.applySettings(); G.saveSettings(); AUD.uiClick(); };
      else el.querySelectorAll('button').forEach(b => b.onclick = () => { G.settings[k] = b.dataset.v; this.syncSettings(); G.applySettings(); G.saveSettings(); AUD.uiClick(); });
    }
    this.setDefs = S;
  },
  syncSettings() { for (const [k, n, t] of this.setDefs) { const el = $('s_' + k); const v = G.settings[k]; if (t === 'range') { el.value = v; $('o_' + k).textContent = k === 'fov' ? v + '°' : Math.round(v * 100) / 100; } else if (t === 'bool') { el.textContent = v ? 'ON' : 'OFF'; el.classList.toggle('on', !!v); } else el.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); } },
  /* ---------------- statistics ---------------- */
  renderStats() {
    const C = G.career; const acc = C.shots ? Math.round(C.hits / C.shots * 100) : 0;
    const cell = (n, v) => `<div class="sc"><b>${v}</b><span>${n}</span></div>`;
    $('stGrid').innerHTML = cell('MISSIONS COMPLETED', C.missions) + cell('TOTAL ELIMINATIONS', C.kills) + cell('HEADSHOTS', C.headshots) + cell('SILENT TAKEDOWNS', C.takedowns) + cell('SHOTS FIRED', C.shots) + cell('ACCURACY', acc + '%') + cell('TIMES DETECTED', C.detected) + cell('GHOST RUNS', C.ghosts) + cell('KIA', C.deaths) + cell('TIME IN FIELD', fmtTime(C.playtime));
    $('stMissions').innerHTML = MISSIONS.map(m => `<div class="srow"><span>${m.num} · ${m.name}</span><span>${C.completed[m.id] ? '×' + C.completed[m.id] : '—'}</span><span>${C.best[m.id] ? fmtTime(C.best[m.id]) : '--:--'}</span><b>${C.ratings[m.id] || '-'}</b></div>`).join('');
  },
  /* ---------------- pause / results / fail ---------------- */
  pause(on) { this.show(on ? 'pause' : null); if (on) { $('pObj').innerHTML = G.objectives.filter(o => o.type !== 'hidden').map(o => `<li class="${o.done ? 'done' : ''} ${o.type}">${o.text}</li>`).join(''); $('pTime').textContent = fmtTime(G.missionTime); } },
  results(r) {
    this.showHUD(false); IN.unlock(); this.fade(0, .6);
    $('rName').textContent = r.M.name; $('rStatus').textContent = r.status; $('rStatus').className = r.ghost ? 'ghost' : ''; $('rRating').textContent = r.rating; $('rTime').textContent = fmtTime(r.time);
    $('rObj').innerHTML = r.objectives.filter(o => o.type !== 'hidden').map(o => `<li class="${o.done ? 'done' : 'fail'} ${o.type}"><i>${o.done ? '✔' : '✖'}</i>${o.text}</li>`).join('');
    const s = r.s; const cell = (n, v) => `<div class="sc"><b>${v}</b><span>${n}</span></div>`;
    $('rStats').innerHTML = cell('ELIMINATIONS', s.kills) + cell('HEADSHOTS', s.headshots) + cell('TAKEDOWNS', s.takedowns) + cell('ACCURACY', Math.round(r.acc * 100) + '%') + cell('BODIES FOUND', s.bodies) + cell('ALARMS', s.alarms) + cell('DAMAGE TAKEN', Math.round(s.damage)) + cell('DETECTED', s.detected ? 'YES' : 'NO');
    this.show('results');
  },
  fail(reason) { this.showHUD(false); IN.unlock(); $('fReason').textContent = reason; this.show('fail'); },
  /* ---------------- overlays ---------------- */
  showHUD(on) { $('hud').classList.toggle('on', on); },
  letterbox(on) { $('lb').classList.toggle('on', on); if (!on) $('title').classList.remove('on'); },
  title(a, b, c) { $('tA').textContent = a; $('tB').textContent = b; $('tC').textContent = c; const t = $('title'); t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); },
  fade(v, s) { const f = $('fade'); f.style.transition = 'opacity ' + s + 's'; f.style.opacity = v; },
  hint(t) { const h = $('hint'); h.textContent = t; h.classList.remove('on'); void h.offsetWidth; h.classList.add('on'); clearTimeout(this._ht); this._ht = setTimeout(() => h.classList.remove('on'), 9000); },
  hitmarker(kill) { const h = $('hitm'); h.className = kill ? 'k' : 'h'; void h.offsetWidth; h.classList.add('on'); },
  objectives(list) { $('objs').innerHTML = list.filter(o => o.type !== 'hidden' && (o.type === 'primary' || !o.done || true)).map(o => `<li class="${o.done ? 'done' : ''} ${o.type}">${o.text}</li>`).join(''); },
  /* ---------------- per-frame: menu background ---------------- */
  menuFrame(dt) {
    if (this.screen === 'armory') { this.armoryPreview(dt); }
    const c = this.bgc, cv = this.bg; if (cv.width !== innerWidth || cv.height !== innerHeight) { cv.width = innerWidth; cv.height = innerHeight; }
    const w = cv.width, h = cv.height, t = performance.now() / 1000;
    c.fillStyle = '#0c0d0e'; c.fillRect(0, 0, w, h);
    if (this.screen === 'armory') { c.clearRect(0, 0, w, h); return; }
    // topographic contour field
    c.lineWidth = 1; const cs = 26;
    for (let lvl = 0; lvl < 9; lvl++) {
      c.strokeStyle = lvl % 4 === 0 ? 'rgba(150,150,150,.16)' : 'rgba(110,110,110,.07)'; c.beginPath(); const th = .2 + lvl * .07;
      for (let y = 0; y < h + cs; y += cs) for (let x = 0; x < w + cs; x += cs) {
        const f = (px, py) => fbm(px * .003 + t * .01, py * .003 + lvl * 0, 3);
        const a = f(x, y), b = f(x + cs, y), d = f(x, y + cs);
        if ((a - th) * (b - th) < 0) { const k = (th - a) / (b - a); c.moveTo(x + k * cs, y); c.lineTo(x + k * cs + 2, y + 2); }
        if ((a - th) * (d - th) < 0) { const k = (th - a) / (d - a); c.moveTo(x, y + k * cs); c.lineTo(x + 2, y + k * cs + 2); }
      }
      c.stroke();
    }
    // grid & scan
    c.strokeStyle = 'rgba(255,255,255,.025)'; c.beginPath(); for (let x = 0; x < w; x += 80) { c.moveTo(x, 0); c.lineTo(x, h); } for (let y = 0; y < h; y += 80) { c.moveTo(0, y); c.lineTo(w, y); } c.stroke();
    const sy = (t * 90) % (h + 200) - 100; const g = c.createLinearGradient(0, sy - 80, 0, sy); g.addColorStop(0, 'rgba(179,18,27,0)'); g.addColorStop(1, 'rgba(179,18,27,.07)'); c.fillStyle = g; c.fillRect(0, sy - 80, w, 80);
    // red target blip
    const bx = w * .72 + Math.sin(t * .3) * 40, by = h * .45 + Math.cos(t * .23) * 30; const pr = (t * 40) % 60;
    c.strokeStyle = 'rgba(200,30,40,' + (.5 - pr / 120) + ')'; c.beginPath(); c.arc(bx, by, pr, 0, TAU); c.stroke(); c.fillStyle = '#b3121b'; c.fillRect(bx - 2, by - 2, 4, 4);
    c.fillStyle = 'rgba(200,200,200,.35)'; c.font = '11px Consolas, monospace'; c.fillText('TGT ' + (bx | 0) + '.' + (by | 0) + ' · ' + (t | 0), bx + 10, by - 8);
    const vg = c.createRadialGradient(w / 2, h / 2, h * .3, w / 2, h / 2, h * .9); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.75)'); c.fillStyle = vg; c.fillRect(0, 0, w, h);
  },
  /* ---------------- tactical map ---------------- */
  makeTacMap() {
    const W = G.W; const res = 1; const n = Math.floor(W.size / res); const cv = document.createElement('canvas'); cv.width = cv.height = n; const c = cv.getContext('2d'); const img = c.createImageData(n, n);
    const H = new Float32Array(n * n); let mn = 1e9, mx = -1e9; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const h = W.th(i * res - W.half, j * res - W.half); H[j * n + i] = h; mn = Math.min(mn, h); mx = Math.max(mx, h); }
    const step = Math.max(.5, (mx - mn) / 22);
    for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
      const h = H[j * n + i]; const hx = H[j * n + i + 1] - H[j * n + i - 1], hz = H[(j + 1) * n + i] - H[(j - 1) * n + i];
      const shade = clamp(.6 - hx * .35 - hz * .35, 0, 1); let v = 34 + shade * 70 + (h - mn) / (mx - mn + .01) * 50;
      const a = Math.floor((h - mn) / step), b2 = Math.floor((H[j * n + i + 1] - mn) / step), c2 = Math.floor((H[(j + 1) * n + i] - mn) / step); if (a !== b2 || a !== c2) v += 38;
      if (W.waterY > -50 && h < W.waterY) { v = 20 + clamp(W.waterY - h, 0, 3) * 4; if (h > W.waterY - .35) v += 18; }
      const o = (j * n + i) * 4; img.data[o] = v; img.data[o + 1] = v; img.data[o + 2] = v + 4; img.data[o + 3] = 255;
    }
    c.putImageData(img, 0, 0); this.tacImg = cv; this.tacRes = res;
  },
  briefFrame(dt) {
    const cv = $('tmap'); const r = cv.getBoundingClientRect(); if (cv.width !== (r.width | 0) || cv.height !== (r.height | 0)) { cv.width = r.width | 0; cv.height = r.height | 0; }
    const c = cv.getContext('2d'), w = cv.width, h = cv.height, T = this.tm, W = G.W; if (!W || !this.tacImg) return; const t = performance.now() / 1000;
    T.zoom = damp(T.zoom, T.tz, 6, dt); T.rot = damp(T.rot, T.tr, 6, dt); T.px = damp(T.px, T.tpx, 8, dt); T.py = damp(T.py, T.tpy, 8, dt);
    c.fillStyle = '#0e0f10'; c.fillRect(0, 0, w, h);
    const base = Math.min(w, h) / W.size * 1.05; const s = base * T.zoom;
    c.save(); c.translate(w / 2, h / 2);
    // perspective tilt for a holographic table look
    c.transform(1, 0, 0, .82, 0, 0); c.rotate(T.rot); c.scale(s, s); c.translate(-T.px / base, -T.py / base);
    c.globalAlpha = .92; c.imageSmoothingEnabled = true; c.drawImage(this.tacImg, -W.half, -W.half, W.size, W.size); c.globalAlpha = 1;
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const r of W.roads) { c.strokeStyle = 'rgba(200,200,200,.35)'; c.lineWidth = r.w; c.beginPath(); r.pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.2 / s; c.setLineDash([6 / s, 6 / s]); c.stroke(); c.setLineDash([]); }
    c.fillStyle = 'rgba(150,150,150,.38)'; for (const t of W.trees) { c.beginPath(); c.arc(t[0], t[1], t[2] * .8, 0, TAU); c.fill(); }
    c.fillStyle = 'rgba(225,225,225,.28)'; for (const r of W.mapRects) if (r) c.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
    c.shadowColor = 'rgba(255,255,255,.7)'; c.shadowBlur = 6; c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = Math.max(.25, 1.3 / s); c.beginPath(); for (const l of W.mapLines) { c.moveTo(l[0], l[1]); c.lineTo(l[2], l[3]); } c.stroke(); c.shadowBlur = 0;
    for (const n of G.npcs) { if (n.def.static || n.post) { c.strokeStyle = 'rgba(220,40,50,.55)'; c.lineWidth = 1 / s; c.beginPath(); c.arc(n.pos[0], n.pos[2], 3.5, 0, TAU); c.stroke(); } }
    c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 1 / s; c.beginPath(); for (let g = -W.half; g <= W.half; g += 20) { c.moveTo(g, -W.half); c.lineTo(g, W.half); c.moveTo(-W.half, g); c.lineTo(W.half, g); } c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2 / s; c.strokeRect(-W.half, -W.half, W.size, W.size);
    // POIs
    for (const p of W.pois) {
      const red = /EXFIL|LZ|INSERT/.test(p.t); const pulse = (t * 1.2 + p.p[0] * .01) % 1;
      c.strokeStyle = red ? 'rgba(220,40,50,.9)' : 'rgba(255,255,255,.85)'; c.lineWidth = 1.5 / s; c.beginPath(); c.arc(p.p[0], p.p[1], (6 + pulse * 10) / s * 2, 0, TAU); c.globalAlpha = 1 - pulse; c.stroke(); c.globalAlpha = 1;
      c.save(); c.translate(p.p[0], p.p[1]); c.rotate(-T.rot); c.scale(1 / s, 1 / .82 / s);
      c.fillStyle = red ? '#d8283a' : '#fff'; c.fillRect(-3, -3, 6, 6); c.strokeStyle = red ? 'rgba(216,40,58,.8)' : 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(3, -3); c.lineTo(16, -16); c.lineTo(16 + p.t.length * 7.5, -16); c.stroke();
      c.font = '600 11px Consolas, monospace'; c.fillText(p.t, 18, -20); c.restore();
    }
    c.restore();
    // hologram effects
    c.fillStyle = 'rgba(255,255,255,.025)'; for (let y = (t * 30) % 4; y < h; y += 4) c.fillRect(0, y, w, 1);
    const sy = (t * 120) % (h + 100) - 50; const g = c.createLinearGradient(0, sy - 40, 0, sy); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.06)'); c.fillStyle = g; c.fillRect(0, sy - 40, w, 40);
    c.fillStyle = 'rgba(220,220,220,.75)'; c.font = '11px Consolas, monospace'; c.fillText('ZOOM ' + T.zoom.toFixed(2) + 'x   HDG ' + (((T.rot * 180 / Math.PI) % 360 + 360) % 360).toFixed(0).padStart(3, '0') + '°   GRID 20 M', 14, h - 14);
    // compass rose
    c.save(); c.translate(w - 48, 48); c.rotate(T.rot); c.strokeStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(0, 0, 22, 0, TAU); c.stroke(); c.fillStyle = '#d8283a'; c.beginPath(); c.moveTo(0, -20); c.lineTo(5, 0); c.lineTo(-5, 0); c.fill(); c.fillStyle = '#ddd'; c.beginPath(); c.moveTo(0, 20); c.lineTo(5, 0); c.lineTo(-5, 0); c.fill(); c.font = '10px Consolas'; c.fillText('N', -3, -26); c.restore();
  },
  /* ---------------- HUD per-frame ---------------- */
  hudFrame(dt) {
    $('engage').classList.toggle('on', (G.state === 'play' || G.state === 'intro') && !IN.locked && !this.noEngage);
    if (!$('hud').classList.contains('on')) return;
    const L = G.detectLevel(); const tgt = L.state === 'red' ? 1 : L.state === 'yellow' ? .5 : 0; this.eyeO = damp(this.eyeO, tgt, 5, dt);
    this.drawEye(L, dt);
    const lbl = $('detLbl'); const txt = L.state === 'red' ? 'DETECTED' : L.state === 'yellow' ? 'SEARCHING' : 'UNDETECTED'; if (lbl.textContent !== txt) { lbl.textContent = txt; lbl.className = L.state; }
    $('visBar').firstChild.style.width = (P.visibility * 100).toFixed(0) + '%';
    this.drawMini();
    // weapon & ammo
    const w = P.wdef; const am = $('ammo');
    let wn = '', a1 = '', a2 = '';
    if (P.state === 'vehicle') { wn = P.vehicle.name; a1 = Math.abs(P.vehicle.speed * 3.6) | 0; a2 = 'KM/H'; }
    else if (w && P.isGun()) { const a = P.ammo[P.weapon]; wn = w.name; a1 = a.mag; a2 = '/ ' + a.res; }
    else if (P.weapon === 'knife') { wn = P.weps.knife.name; a1 = '—'; a2 = ''; }
    else { const k = P.curItemKind(); if (k) { wn = ITEMDEF[k].name; const s = P.inv[P.cur]; a1 = s && s.count ? s.count : P.cur === 3 ? P.mission.filter(x => x === k).length : ''; a2 = ''; } }
    const key = wn + a1 + a2; if (key !== this._ak) { this._ak = key; am.querySelector('.wn').textContent = wn; am.querySelector('b').textContent = a1; am.querySelector('.am span').textContent = a2; am.classList.toggle('low', w && P.isGun() && P.ammo[P.weapon].mag <= Math.ceil(w.mag * .2)); }
    // slots
    const sk = P.inv.map(s => s ? s.k + (s.count || '') : '-').join() + P.cur + P.mission.join() + P.missionSel + P.anim.k;
    if (sk !== this._sk) {
      this._sk = sk; const el = $('slots');
      el.innerHTML = [0, 1, 2, 3, 4].map(i => { let k = null, cnt = ''; if (i === 3) { k = P.mission[P.missionSel] || null; cnt = P.mission.length > 1 ? '×' + P.mission.length : ''; } else if (P.inv[i]) { k = P.inv[i].k; cnt = P.inv[i].count ? '×' + P.inv[i].count : ''; } const nm = k ? (P.weps[k] ? P.weps[k].name : ITEMDEF[k].name) : (i === 2 && P.thrownKnife ? 'KNIFE — RETRIEVE' : ''); return `<div class="slot ${i === P.cur ? 'sel' : ''} ${k ? '' : 'empty'}"><em>${i + 1}</em>${k ? ICONS[P.weps[k] ? P.weps[k].id : k] || ICONS[P.weps[k] ? P.weps[k].type === 'rifle' ? 'ar7' : P.weps[k].type : k] || '' : ''}<span>${nm}</span><u>${cnt}</u></div>`; }).join('');
    }
    // prompt
    const pr = $('prompt'); const ptxt = P.prompt || ''; if (pr._t !== ptxt) { pr._t = ptxt; pr.querySelector('span').textContent = ptxt; pr.classList.toggle('on', !!ptxt); }
    const hold = P.anim.k === 'hold' && P.interactTarget && P.interactTarget.hold ? P.holdT / P.interactTarget.hold : 0; pr.querySelector('circle.p').style.strokeDashoffset = (1 - hold) * 100; pr.classList.toggle('hold', hold > 0);
    // crosshair
    const xh = $('xh'); const hideX = (P.ads > .6 && P.isGun()) || P.state !== 'ground' && P.state !== 'plane'; xh.style.opacity = hideX ? 0 : 1; xh.classList.toggle('int', !!P.prompt);
    // altitude
    const alt = $('alt'); if (P.state === 'fall' || P.state === 'chute') { alt.classList.add('on'); alt.innerHTML = `<b>${Math.max(0, P.altitude) | 0}</b><span>M ALT</span><i>${(-P.vel[1]).toFixed(0)} M/S</i>` + (P.state === 'fall' ? `<em class="${P.altitude < 160 ? 'warn' : ''}">[SPACE] DEPLOY PARACHUTE</em>` : '<em>A/D STEER · W DIVE · S FLARE</em>'); } else alt.classList.remove('on');
    // damage
    const hv = clamp((100 - P.health) / 80, 0, 1); $('hurt').style.opacity = hv * .9; R.post.hurt = hv;
    const sl = G.slow, sm = $('slowmo'); const sv = sl.on ? 1 - sl.t / G.SLOW_DUR : sl.charge; sm.querySelector('circle.p').style.strokeDashoffset = (1 - sv) * 100;
    const sst = sl.on ? 'active' : sl.charge >= 1 ? 'ready' : ''; if (sm._s !== sst + (sl.on ? (sl.t | 0) : (sl.charge * 100 | 0))) { sm._s = sst + (sl.on ? (sl.t | 0) : (sl.charge * 100 | 0)); sm.className = sst; sm.querySelector('i').textContent = sl.on ? Math.ceil(G.SLOW_DUR - sl.t) + 's' : sl.charge >= 1 ? 'READY' : Math.round(sl.charge * 100) + '%'; }
    const dd = $('dmgdir'); if (P.hurtDir !== null && G.time - P.lastHurt < 1.2) { const rel = P.hurtDir - P.yaw + Math.PI; dd.style.opacity = 1 - (G.time - P.lastHurt) / 1.2; dd.style.transform = `translate(-50%,-50%) rotate(${-rel}rad)`; } else dd.style.opacity = 0;
    // subtitles / notifications
    this.updateList('subs', G.subs, dt, s => `<div class="${s.radio ? 'radio' : ''}"><b>${s.radio ? '◉ RADIO · ' : ''}${s.who}:</b> ${s.text}</div>`);
    this.updateList('notifs', G.notifs, dt, n => `<div class="${n.kind}">${n.text}</div>`, 3.5);
    // objective marker
    const mk = $('marker'); if (G.marker && G.settings.markers && G.state === 'play' && P.state === 'ground' || (G.marker && G.settings.markers && P.state === 'chute')) {
      const p = G.marker; const v = R.vp; const x = v[0] * p[0] + v[4] * p[1] + v[8] * p[2] + v[12], y = v[1] * p[0] + v[5] * p[1] + v[9] * p[2] + v[13], wv = v[3] * p[0] + v[7] * p[1] + v[11] * p[2] + v[15];
      let sx = x / wv, sy = y / wv; if (wv < 0) { sx = -sx * 10; sy = -1; } sx = clamp(sx, -.92, .92); sy = clamp(sy, -.85, .85);
      mk.style.opacity = 1; mk.style.left = ((sx * .5 + .5) * 100) + '%'; mk.style.top = ((-sy * .5 + .5) * 100) + '%'; mk.querySelector('span').textContent = (V.dist(P.pos, p) | 0) + 'm';
    } else mk.style.opacity = 0;
  },
  updateList(id, arr, dt, fmt, life) {
    let changed = false; for (const s of arr) { s.t += dt; if (s.t > (s.life || life)) changed = true; }
    if (changed) { for (let i = arr.length - 1; i >= 0; i--) if (arr[i].t > (arr[i].life || life)) arr.splice(i, 1); }
    const k = arr.length + ':' + (arr.length ? arr[arr.length - 1].text : ''); const el = $(id); if (el._k !== k) { el._k = k; el.innerHTML = arr.map(fmt).join(''); }
  },
  drawEye(L, dt) {
    const c = this.eyeC, w = 120, h = 64; c.clearRect(0, 0, w, h); const o = this.eyeO; const col = L.state === 'red' ? [214, 32, 44] : L.state === 'yellow' ? [228, 178, 40] : [70, 190, 90];
    const t = performance.now() / 1000; const pulse = L.state === 'red' ? .6 + Math.sin(t * 9) * .4 : 1;
    const cx = w / 2, cy = h / 2, rw = 46; const top = cy - 22 * o, bot = cy + 18 * o;
    c.lineWidth = 2.4; c.strokeStyle = `rgba(${col},${.95})`; c.shadowColor = `rgba(${col},${.8 * pulse})`; c.shadowBlur = 10 * pulse;
    c.beginPath(); c.moveTo(cx - rw, cy); c.quadraticCurveTo(cx, top - 6 * o, cx + rw, cy); c.quadraticCurveTo(cx, bot + 4 * o, cx - rw, cy); c.closePath();
    if (o > .03) { c.save(); c.clip(); c.fillStyle = 'rgba(10,10,10,.8)'; c.fillRect(0, 0, w, h); const ir = 14 + o * 2; const g = c.createRadialGradient(cx, cy, 2, cx, cy, ir); g.addColorStop(0, '#000'); g.addColorStop(.35, `rgba(${col},1)`); g.addColorStop(1, `rgba(${col.map(v => v * .4)},1)`); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, ir, 0, TAU); c.fill(); c.fillStyle = '#050505'; c.beginPath(); c.ellipse(cx, cy, 4 + o * 2, 6 + o * 3, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(cx - 5, cy - 5, 2.2, 0, TAU); c.fill(); c.restore(); }
    c.beginPath(); c.moveTo(cx - rw, cy); c.quadraticCurveTo(cx, top - 6 * o, cx + rw, cy); c.stroke();
    c.beginPath(); c.moveTo(cx - rw, cy); c.quadraticCurveTo(cx, bot + 4 * o, cx + rw, cy); c.stroke();
    if (o < .25) { c.lineWidth = 1.6; for (let i = -3; i <= 3; i++) { const x = cx + i * 11; const y = cy + 9 * (1 - (i * i) / 12) * (1 - o * 3) * .9 + 1; c.beginPath(); c.moveTo(x, y - 1); c.lineTo(x + i * 1.2, y + 6); c.stroke(); } }
    c.shadowBlur = 0;
    // suspicion meter arc
    if (L.meter > .02 && L.state !== 'red') { c.strokeStyle = `rgba(${col},.8)`; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, 30, Math.PI * 1.15, Math.PI * 1.15 + Math.PI * .7 * L.meter); c.stroke(); }
  },
  drawMini() {
    const c = this.miniC, W = G.W, sz = 220; if (!G.minimap) return; c.clearRect(0, 0, sz, sz);
    c.fillStyle = 'rgba(12,13,14,.72)'; c.fillRect(0, 0, sz, sz);
    const sc = G.minimapScale, zoom = G.settings.mmZoom || 2.2; const pp = P.state === 'vehicle' && P.vehicle ? P.vehicle.pos : P.pos; const yaw = P.state === 'vehicle' && P.vehicle ? P.vehicle.yaw + P.yaw : P.state === 'plane' && G.plane ? P.yaw + G.plane.yaw : P.state === 'chute' ? P.chuteYaw : P.yaw;
    const wp = P.state === 'plane' && G.plane ? M4.pos(G.plane.m) : pp;
    const rot = G.settings.mmRotate !== false; c.save(); c.translate(sz / 2, sz / 2 + (rot ? 30 : 0)); if (rot) c.rotate(yaw); c.scale(zoom / sc, zoom / sc);
    c.drawImage(G.minimap, -(wp[0] + W.half) * sc, -(wp[2] + W.half) * sc);
    c.fillStyle = '#fff'; for (const n of G.npcs) { if (n.dead) continue; const dx = (n.pos[0] - wp[0]) * sc, dz = (n.pos[2] - wp[2]) * sc; if (Math.abs(dx) > 160 * sc / zoom || Math.abs(dz) > 160 * sc / zoom) continue; c.beginPath(); c.arc(dx, dz, 2.6 * sc / zoom, 0, TAU); c.fill(); }
    c.restore();
    c.save(); c.translate(sz / 2, sz / 2 + (rot ? 30 : 0)); if (!rot) c.rotate(-yaw); const cg = c.createRadialGradient(0, 0, 0, 0, 0, 60); cg.addColorStop(0, 'rgba(70,200,90,.28)'); cg.addColorStop(1, 'rgba(70,200,90,0)'); c.fillStyle = cg; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 60, -Math.PI / 2 - .55, -Math.PI / 2 + .55); c.closePath(); c.fill();
    c.fillStyle = '#46c85a'; c.shadowColor = '#46c85a'; c.shadowBlur = 8; c.beginPath(); c.arc(0, 0, 4.2, 0, TAU); c.fill(); c.restore();
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1; c.strokeRect(.5, .5, sz - 1, sz - 1);
  },
};
