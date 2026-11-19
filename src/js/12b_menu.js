/* =====================================================================
   MENU v2 — 3D operator showcase main menu, armory shop & loadout,
   operators, tabbed settings with key rebinding, payouts.
   ===================================================================== */
(function () {
  const baseInit = UI.init, baseShow = UI.show, baseHud = UI.hudFrame, baseGo = UI.go;
  const fmt = n => (Math.round(n) + '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const TICK = ['INTERPOL: MERIDIAN CREW LINKED TO PORT VASKO ARMS PIPELINE', 'CASH TRANSFER FLAGGED — VALMONT HOLDINGS, LUXEMBOURG', 'STATION 9 UPLINK OFFLINE — CAUSE UNKNOWN', 'CARTEL AIR BRIDGE GROUNDED AFTER LEADERSHIP LOSS', 'VANGUARD RISK SOLUTIONS DENIES INVOLVEMENT IN HARBOR INCIDENT', 'TASK FORCE ODIN — CLEARANCE BLACK — EYES ONLY'];
  Object.assign(UI, {
    init() {
      baseInit.call(this); this.buildOperators();
      document.querySelectorAll('.nbtn').forEach(b => b.addEventListener('mouseenter', () => AUD.ready && AUD.uiHover()));
      $('bArm').onclick = () => { AUD.uiClick(); this.armoryFrom = 'brief'; this.go('armory'); };
      $('mmTicker').textContent = TICK.join('   ///   ');
      this.go('main');
    },
    show(id) { baseShow.call(this, id); const three = id === 'main' || id === 'armory' || id === 'operators'; $('bg').style.opacity = three ? 0 : $('bg').style.opacity; $('vign').style.opacity = three ? .6 : 1; if (id === 'main') this.renderMain(); },
    go(id) {
      if (id === 'back2') { const f = this.armoryFrom; this.armoryFrom = null; if (f === 'brief') { if (G.W) { G.state = 'briefing'; this.openBriefingRefresh(); return; } } return this.go('main'); }
      if (id === 'operators') this.renderOperators();
      if (id === 'armory' && G.state === 'briefing') { this.armoryFrom = 'brief'; G.state = 'menu'; this._briefKeep = true; }
      baseGo.call(this, id);
    },
    openBriefingRefresh() { const L = G.loadout; $('bLoad').textContent = [WEAPONS[L.pistol].name, WEAPONS[L.rifle].name + ' (' + ATTACH.optics[L.optic].name + (L.muzzle === 'sup' ? ', SUPPRESSED' : '') + ')', WEAPONS[L.knife].name, GEAR[L.gadget].name, OPERATORS[L.operator].name].join(' · '); this.show('brief'); },
    /* ---------------- main menu ---------------- */
    renderMain() {
      const C = G.career, L = G.loadout; $('mmCredits').textContent = fmt(C.credits); $('mmEarned').textContent = 'LIFETIME EARNINGS ₵ ' + fmt(C.earned || 0);
      const next = MISSIONS.find(m => !C.completed[m.id]) || MISSIONS[MISSIONS.length - 1]; this.nextMission = next;
      $('deploySub').textContent = 'NEXT: ' + next.num + ' — ' + next.name;
      $('mmMission').innerHTML = `<div class="mmm-name">${next.num} · ${next.name}</div><div class="mmm-sub">${next.code}<br>${next.location}<br>${next.time} · THREAT ${'■'.repeat(next.difficulty)}${'□'.repeat(5 - next.difficulty)}<br>PAYMENT ₵ ${fmt(next.reward || ({ m1: 5000, m2: 7000, m3: 8500 })[next.id])}${C.ratings[next.id] ? ' · BEST ' + C.ratings[next.id] : ''}</div>`;
      const eq = (k, v) => `<div class="eqrow"><span>${k}</span>${v}</div>`;
      $('mmEquip').innerHTML = eq('PRIMARY', WEAPONS[L.rifle].name) + eq('OPTIC', ATTACH.optics[L.optic].name + (L.muzzle === 'sup' ? ' · SUP' : '')) + eq('SIDEARM', WEAPONS[L.pistol].name) + eq('KNIFE', WEAPONS[L.knife].name) + eq('EQUIPMENT', GEAR[L.gadget].name) + eq('UPGRADES', [L.armor && 'ARMOUR', L.boots && 'BOOTS', L.extraMags && 'MAGS'].filter(Boolean).join(' · ') || '—');
      $('mmProgress').innerHTML = `<div class="prog">${MISSIONS.map(m => `<i class="${C.completed[m.id] ? 'done' : ''}">${m.num}${C.ratings[m.id] ? ' ' + C.ratings[m.id] : ''}</i>`).join('')}</div><div class="tag" style="margin-top:8px">${MISSIONS.filter(m => C.completed[m.id]).length} / ${MISSIONS.length} OPERATIONS COMPLETE</div>`;
      const op = OPERATORS[L.operator]; $('mmOpName').textContent = op.name; $('mmOpRole').textContent = op.role + ' · ' + op.perk.toUpperCase();
    },
    menuChar(opId) {
      this.mchars = this.mchars || {};
      if (!this.mchars[opId]) { const op = OPERATORS[opId]; const app = Object.assign({ holster: true, radio: true, kneepads: true }, op.app); this.mchars[opId] = new Rig(buildCharacter(app)); }
      return this.mchars[opId];
    },
    menuScene() {
      if (this.ms) return this.ms;
      const B = new MB(60000); B.col(0x1c1d1e, MAT.CONC).box(0, -.1, 0, 30, .2, 30); B.col(0x0d0d0e, MAT.CONC).cyl(0, 0, 0, 2.2, 2.2, .04, 40); B.col(0x8a1010, MAT.EMIT).torus(0, .045, 0, 2.2, .012, 48, 3);
      B.col(0x2a1010, MAT.EMIT); for (let i = -6; i <= 6; i++) { B.box(i * 1.5, .002, 0, .01, .004, 18); B.box(0, .002, i * 1.5, 18, .004, .01); }
      B.col(0x3a3e40, MAT.CORR).box(0, 4, -6, 18, 8, .2); for (let x = -8; x <= 8; x += 2) B.col(0x26282a, MAT.METAL).box(x, 4, -5.85, .2, 8, .2);
      B.col(0x2a2c2e, MAT.METAL).box(0, 6.5, -5.8, 18, .3, .4); B.col(0x8a1010, MAT.EMIT).box(0, 5.2, -5.84, 6, .05, .02);
      for (const [x, z, s] of [[-3.2, -3.2, 1.1], [-4.4, -2.4, .9], [-3.4, -1.9, .8], [3.6, -3, 1.2], [4.6, -1.6, .9]]) { B.col(0x3a3e30, MAT.CANVAS).box(x, s / 2, z, s, s, s); B.col(0x22251c, MAT.CANVAS).box(x, s / 2, z + s / 2, s * 1.01, .1, .02); }
      B.col(0x1a1a1a, MAT.METAL).box(3.2, 1.1, -5.3, 2.4, 2.2, .3); for (let i = 0; i < 4; i++) { B.push().t(2.4 + i * .5, 1.2, -5.1).rx(-Math.PI / 2 + .1).rz(Math.PI / 2); buildNpcWeapon(B, i % 2 ? 'rifle' : 'ak'); B.pop(); }
      B.col(0x111111, MAT.METAL).cyl(-1.5, 5.5, -1, .02, .02, 3, 4).cyl(-1.5, 5.4, -1, .3, .1, .2, 10); B.col(0xfff2d0, MAT.EMIT).cyl(-1.5, 5.39, -1, .26, .26, .01, 10);
      const mesh = B.mesh(); const rb = new MB(8000); buildRifleVM(rb, G.loadout.rifle, G.loadout.optic, G.loadout.muzzle);
      this.ms = { mesh, m: M4.create(), rifle: rb.mesh(), rkey: G.loadout.rifle + G.loadout.optic + G.loadout.muzzle, wb: new Float32Array(VB.N * 16), t: 0, aim: 0, pose: 0 };
      return this.ms;
    },
    renderMenu3D(dt) {
      const S = this.menuScene(); S.t += dt; const L = G.loadout; const t = S.t;
      const key = L.rifle + L.optic + L.muzzle; if (S.rkey !== key) { S.rkey = key; S.rifle.dispose(); const rb = new MB(8000); buildRifleVM(rb, L.rifle, L.optic, L.muzzle); S.rifle = rb.mesh(); }
      const rig = this.menuChar(L.operator); const j = P_();
      const cyc = (t % 14); S.aim = damp(S.aim, cyc > 9 && cyc < 11.5 ? 1 : 0, 4, dt);
      poseIdle(j, t, cyc > 5 && cyc < 8 ? 'look' : 'idle', 1); pj(j, SK.THL, 0, .12, -.08); pj(j, SK.THR, 0, -.12, .08);
      rig.tj.set(j); rig.tpy = 0; rig.blend(6, dt); M4.ident(rig.root); M4.rotY(rig.root, rig.root, Math.PI - .35 + Math.sin(t * .2) * .05);
      const wm = M4.create(); const a = S.aim;
      M4.translate(wm, wm, lerp(.07, .1, a), lerp(.1, .32, a), lerp(-.24, -.2, a)); M4.rotY(wm, wm, lerp(.5, -.3, a)); M4.rotX(wm, wm, lerp(-.62, 0, a));
      rig.solve({ m: wm, gr: [0, -.045, .03], gl: [0, .012, -.31] }, false);
      for (let i = 0; i < VB.N; i++) S.wb.set(rig.mats[SK.WPN], i * 16);
      const camT = [0, .98, 0], cyaw = Math.sin(t * .11) * .22 + (this.screen === 'operators' ? .25 : 0), cd = this.screen === 'operators' ? 4.2 : 3.9;
      const eye = [Math.sin(cyaw) * cd + .2, 1.35 + Math.sin(t * .17) * .06, Math.cos(cyaw) * cd];
      const view = M4.lookAt(M4.create(), eye, camT, [0, 1, 0]);
      const env = { sunDir: V.norm([-.5, .7, .6]), sunCol: [1.6, 1.45, 1.25], sky: [.05, .055, .065], gnd: [.02, .015, .015], fog: [.012, .012, .014], fogD: .06, fogH: 0, expo: 1.25, zen: [.01, .01, .012], hor: [.02, .015, .015], night: 0, cloud: 0, skyFog: 1 };
      const parts = []; for (let i = 0; i < 40; i++) { const k = (i * 7.31 + t * .05) % 1; parts.push({ p: [Math.sin(i * 3.1) * 3, k * 5, -1.5 + Math.cos(i * 1.7) * 2], s: .015, c: [1, .9, .8], a: .35 * Math.sin(k * Math.PI), add: true }); }
      const Sc = { chunks: [], dyn: [{ mesh: S.mesh, m: S.m }, { mesh: rig.mesh, bones: rig.bones }, { mesh: S.rifle, bones: S.wb }], env, lights: [{ pos: [-2.5, 3.5, 2.5], col: [1, .95, .85], i: 3.5, range: 9, dir: V.norm([.5, -.7, -.5]), cone: .8 }, { pos: [1.5, 2.2, -2.5], col: [1, .12, .1], i: 4, range: 7 }, { pos: [2.5, 1.5, 2], col: [.35, .45, .7], i: 1.4, range: 7 }, { pos: [-1.5, 5.2, -1], col: [1, .9, .7], i: 1.5, range: 6, dir: [0, -1, 0], cone: .5 }], particles: parts, time: t, shadowExt: 6 };
      R.post.slow = 0; R.post.hurt = 0; R.render(Sc, { pos: eye, view, fov: 36 * DEG, fwd: V.norm(V.sub(camT, eye)), right: [1, 0, 0], up: [0, 1, 0], near: .05, far: 60 });
    },
    menuFrame(dt) {
      if (this.screen === 'main' || this.screen === 'operators') return this.renderMenu3D(dt);
      if (this.screen === 'armory') { const it = this.arSel; if (it && (it.cat === 'upgrades')) return this.renderMenu3D(dt); return this.armoryPreview(dt); }
      const c = this.bgc, cv = this.bg; if (cv.width !== innerWidth || cv.height !== innerHeight) { cv.width = innerWidth; cv.height = innerHeight; }
      const w = cv.width, h = cv.height, t = performance.now() / 1000;
      c.fillStyle = '#0c0d0e'; c.fillRect(0, 0, w, h); c.lineWidth = 1; const cs = 30;
      for (let lvl = 0; lvl < 7; lvl++) { c.strokeStyle = lvl % 3 === 0 ? 'rgba(150,150,150,.14)' : 'rgba(110,110,110,.06)'; c.beginPath(); const th = .25 + lvl * .07;
        for (let y = 0; y < h + cs; y += cs) for (let x = 0; x < w + cs; x += cs) { const f = (px, py) => fbm(px * .003 + t * .01, py * .003, 3); const a = f(x, y), b = f(x + cs, y), d = f(x, y + cs); if ((a - th) * (b - th) < 0) { const k = (th - a) / (b - a); c.moveTo(x + k * cs, y); c.lineTo(x + k * cs + 2, y + 2); } if ((a - th) * (d - th) < 0) { const k = (th - a) / (d - a); c.moveTo(x, y + k * cs); c.lineTo(x + 2, y + k * cs + 2); } }
        c.stroke(); }
      const sy = (t * 90) % (h + 200) - 100; const g = c.createLinearGradient(0, sy - 80, 0, sy); g.addColorStop(0, 'rgba(179,18,27,0)'); g.addColorStop(1, 'rgba(179,18,27,.07)'); c.fillStyle = g; c.fillRect(0, sy - 80, w, 80);
      const vg = c.createRadialGradient(w / 2, h / 2, h * .3, w / 2, h / 2, h * .9); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.75)'); c.fillStyle = vg; c.fillRect(0, 0, w, h);
    },
    /* ---------------- armory shop ---------------- */
    buildArmory() {
      this.arTab = 'rifles';
      const tabs = [['pistols', 'PISTOLS'], ['rifles', 'RIFLES'], ['optics', 'OPTICS'], ['attach', 'ATTACHMENTS'], ['knives', 'KNIVES'], ['gear', 'EQUIPMENT'], ['upgrades', 'UPGRADES']];
      $('arTabs').innerHTML = tabs.map(([k, n]) => `<button data-t="${k}">${n}</button>`).join('');
      $('arTabs').querySelectorAll('button').forEach(b => b.onclick = () => { AUD.uiClick(); this.arTab = b.dataset.t; this.arSel = null; this.renderArmory(); });
    },
    arItems() {
      const L = G.loadout; const T = this.arTab; const out = [];
      const W = type => Object.entries(WEAPONS).filter(([, w]) => w.type === type);
      if (T === 'pistols') for (const [id, w] of W('pistol')) out.push({ id, own: id, name: w.name, desc: w.desc, price: w.price, eq: L.pistol === id, equip: () => L.pistol = id, w });
      if (T === 'rifles') for (const [id, w] of W('rifle')) out.push({ id, own: id, name: w.name, desc: w.desc, price: w.price, eq: L.rifle === id, equip: () => L.rifle = id, w });
      if (T === 'knives') for (const [id, w] of W('knife')) out.push({ id, own: id, name: w.name, desc: w.desc, price: w.price, eq: L.knife === id, equip: () => L.knife = id, w });
      if (T === 'optics') for (const [id, o] of Object.entries(ATTACH.optics)) out.push({ id, own: id, name: o.name, desc: o.desc, price: o.price, eq: L.optic === id, equip: () => L.optic = id });
      if (T === 'attach') { for (const [k, grp, own] of [['muzzle', ATTACH.muzzle, 'sup'], ['mag', ATTACH.mag, 'ext'], ['laser', ATTACH.laser, 'on']]) for (const [id, o] of Object.entries(grp)) out.push({ id: k + '_' + id, own: id === own ? k + '_' + id : id, name: o.name, desc: o.desc || '—', price: o.price, eq: L[k] === id, equip: () => L[k] = id }); }
      if (T === 'gear') for (const [id, o] of Object.entries(GEAR)) out.push({ id, own: id, name: o.name, desc: o.desc, price: o.price, eq: L.gadget === id, equip: () => L.gadget = id, item: id });
      if (T === 'upgrades') for (const [id, o] of Object.entries(UPGRADES)) out.push({ id, own: id, name: o.name, desc: o.desc, price: o.price, eq: !!L[id], equip: () => L[id] = !L[id], toggle: true });
      for (const it of out) it.cat = T === 'attach' ? 'attach' : T;
      return out;
    },
    renderArmory() {
      $('arTabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === this.arTab));
      $('arCredits').textContent = fmt(G.career.credits);
      const items = this.arItems(); if (!this.arSel || !items.find(i => i.id === this.arSel.id)) this.arSel = items.find(i => i.eq) || items[0];
      $('arList').innerHTML = items.map((it, k) => { const owned = owns(it.own); const st = it.eq ? (it.toggle ? 'ACTIVE' : 'EQUIPPED') : owned ? (it.toggle ? 'OWNED · OFF' : 'OWNED') : '₵ ' + fmt(it.price); const cls = it.eq ? 'eq' : owned ? 'own' : G.career.credits >= it.price ? 'buy' : 'no';
        return `<div class="item ${this.arSel && this.arSel.id === it.id ? 'sel' : ''}" data-k="${k}" style="animation-delay:${k * .04}s"><div class="in">${it.name}</div><div class="id">${it.desc}</div><div class="st ${cls}">${st}</div></div>`; }).join('');
      $('arList').querySelectorAll('.item').forEach(el => { el.onclick = () => this.armoryClick(items[+el.dataset.k]); el.onmouseenter = () => { AUD.ready && AUD.uiHover(); this.arSel = items[+el.dataset.k]; this.renderArmoryDetail(); }; });
      this.renderArmoryDetail(); this.renderLoadout();
    },
    armoryClick(it) {
      AUD.init(); const C = G.career;
      if (!owns(it.own)) { if (C.credits < it.price) { AUD.beep(220, .15, .25); this.flash($('arCredits')); return; } C.credits -= it.price; C.owned.push(it.own); G.saveCareer(); AUD.beep(1200, .06, .2); AUD.beep(1800, .08, .15); }
      else AUD.uiClick();
      it.equip(); G.saveSettings(); this.arSel = it; this.renderArmory();
    },
    flash(el) { el.parentElement.animate([{ color: '#ff3040' }, { color: '' }], { duration: 600 }); },
    renderArmoryDetail() {
      const it = this.arSel; if (!it) return; const w = it.w;
      const bar = (n, v) => `<div class="stat"><span>${n}</span><i style="--v:${clamp(v, 0, 1)}"></i></div>`;
      let st = ''; if (w && w.type !== 'knife') st = bar('DAMAGE', w.dmg / 90) + bar('FIRE RATE', w.rpm / 950) + bar('CAPACITY', w.mag / 30) + bar('CONTROL', 1 - w.recoil / .065) + bar('STEALTH', 1 - w.noise / 170);
      else if (w) st = bar('SLASH', w.dmg / 180) + bar('THROW', w.throwDmg / 160) + bar('SPEED', 1 - (w.swing - .3) / .3) + bar('TAKEDOWN', 1 - (w.td - 1.2) / .7);
      $('arDetail').innerHTML = `<div class="dn">${it.name}</div><div class="dd">${it.desc}${it.price ? ' · ₵ ' + fmt(it.price) : ' · STANDARD ISSUE'}</div><div style="position:absolute;right:30px;top:30px;width:260px">${st}</div>`;
      this.previewKey = null;
    },
    renderLoadout() {
      const L = G.loadout; const P2 = effWeapon(L.pistol, L), R2 = effWeapon(L.rifle, L); const r = (k, v) => `<div class="lrow"><span>${k}</span>${v}</div>`;
      $('arLoad').innerHTML = '<h4>CURRENT LOADOUT</h4>' + r('OPERATOR', OPERATORS[L.operator].name) + r('PRIMARY', R2.name) + r('OPTIC', ATTACH.optics[L.optic].name) + r('MUZZLE', ATTACH.muzzle[L.muzzle].name) + r('MAGAZINES', ATTACH.mag[L.mag].name) + r('LASER', ATTACH.laser[L.laser].name) + r('SIDEARM', P2.name) + r('KNIFE', WEAPONS[L.knife].name) + r('EQUIPMENT', GEAR[L.gadget].name) + r('UPGRADES', [L.armor && 'ARMOUR', L.boots && 'SILENT BOOTS', L.extraMags && '+2 MAGS'].filter(Boolean).join(', ') || '—')
        + '<h4 style="margin-top:20px">PRIMARY — EFFECTIVE</h4>' + r('DAMAGE', Math.round(R2.dmg)) + r('MAGAZINE', R2.mag + ' / ' + R2.reserve) + r('NOISE RADIUS', R2.noise + ' M') + r('SUPPRESSED', R2.suppressed ? 'YES' : 'NO')
        + '<h4 style="margin-top:20px">SIDEARM — EFFECTIVE</h4>' + r('DAMAGE', Math.round(P2.dmg)) + r('MAGAZINE', P2.mag) + r('MODE', P2.auto ? 'FULL AUTO' : 'SEMI');
    },
    armoryPreview(dt) {
      if (!R.gl) return; const it = this.arSel; const L = G.loadout; const t = performance.now() / 1000;
      const key = it ? it.id + L.optic + L.muzzle + L.rifle + L.pistol + L.knife + L.laser : 'x';
      if (this.previewKey !== key) {
        this.previewKey = key; if (this.prevMesh) this.prevMesh.dispose(); const B = new MB(9000); let kind = 'rifle';
        if (it && it.cat === 'pistols') { buildPistolVM(B, it.id); kind = 'pistol'; }
        else if (it && it.cat === 'knives') { buildKnifeVM(B, VB.WPN, it.id); kind = 'knife'; }
        else if (it && it.cat === 'gear') { B.b(VB.WPN); buildItemGeo(B, it.id); kind = 'item'; }
        else { const rid = it && it.cat === 'rifles' ? it.id : L.rifle; const opt = it && it.cat === 'optics' ? it.id : L.optic; const muz = it && it.id === 'muzzle_sup' ? 'sup' : it && it.id === 'muzzle_none' ? 'none' : L.muzzle; buildRifleVM(B, rid, opt, muz); }
        this.prevMesh = B.mesh(); this.prevKind = kind; this.pb = new Float32Array(VB.N * 16);
      }
      const sc = { rifle: 1, pistol: 2.2, knife: 2.4, item: 5 }[this.prevKind]; const m = M4.create(); M4.translate(m, m, 0, .02, -1.6); M4.rotY(m, m, t * .45); M4.rotX(m, m, .1); M4.scale(m, m, sc, sc, sc); M4.translate(m, m, 0, 0, this.prevKind === 'rifle' ? .25 : this.prevKind === 'pistol' ? .08 : 0);
      for (let i = 0; i < VB.N; i++) this.pb.set(m, i * 16);
      const env = { sunDir: V.norm([.4, .8, .5]), sunCol: [2.2, 2.0, 1.8], sky: [.25, .26, .28], gnd: [.05, .04, .04], fog: [0, 0, 0], fogD: 0, expo: 1.2, zen: [.01, .01, .012], hor: [.04, .03, .03], night: 0, cloud: 0, skyFog: 0 };
      R.post.slow = 0; R.post.hurt = 0;
      R.render({ chunks: [], dyn: [{ mesh: this.prevMesh, bones: this.pb }], env, lights: [{ pos: [-1, .5, 0], col: [1, .1, .08], i: 3, range: 4 }, { pos: [1, 1, .5], col: [.8, .85, 1], i: 1.5, range: 5 }], particles: [], time: t }, { pos: [0, 0, 0], view: M4.create(), fov: 40 * DEG, fwd: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0], near: .05, far: 20 });
    },
    /* ---------------- operators ---------------- */
    buildOperators() { this.renderOperators(); },
    renderOperators() {
      $('opCredits').textContent = fmt(G.career.credits); const L = G.loadout;
      $('opList').innerHTML = Object.entries(OPERATORS).map(([id, o], k) => { const owned = owns(id); const st = L.operator === id ? '<span class="st eq">SELECTED</span>' : owned ? '<span class="st own">SELECT</span>' : `<span class="st ${G.career.credits >= o.price ? 'buy' : 'no'}">UNLOCK ₵ ${fmt(o.price)}</span>`;
        return `<div class="opc ${L.operator === id ? 'sel' : ''}" data-id="${id}" style="animation-delay:${k * .06}s"><div class="on">${o.name}</div><div class="or">${o.role}</div><div class="op">${o.perk}</div><div class="item" style="display:block;border:none;background:none;padding:0;animation:none">${st}</div></div>`; }).join('');
      $('opList').querySelectorAll('.opc').forEach(el => { el.onclick = () => { AUD.init(); const id = el.dataset.id, o = OPERATORS[id]; if (!owns(id)) { if (G.career.credits < o.price) { AUD.beep(220, .15, .25); return; } G.career.credits -= o.price; G.career.owned.push(id); G.saveCareer(); AUD.beep(1500, .08, .2); } L.operator = id; G.saveSettings(); AUD.uiClick(); this.renderOperators(); }; el.onmouseenter = () => AUD.ready && AUD.uiHover(); });
    },
    /* ---------------- settings ---------------- */
    buildSettings() {
      this.setTab = 'gameplay';
      this.setDefsAll = {
        gameplay: [['difficulty', 'DIFFICULTY', 'sel', ['easy', 'normal', 'hard']], ['hud', 'HUD VISIBILITY', 'sel', ['full', 'minimal', 'off']], ['detection', 'DETECTION INDICATOR', 'bool'], ['minimap', 'MINIMAP', 'bool'], ['mmRotate', 'MINIMAP ROTATES WITH VIEW', 'bool'], ['mmZoom', 'MINIMAP ZOOM', 'range', 1, 4, .1], ['prompts', 'INTERACTION PROMPTS', 'bool'], ['markers', 'OBJECTIVE MARKERS', 'bool'], ['subtitles', 'SUBTITLES', 'bool'], ['fov', 'FIELD OF VIEW', 'range', 60, 100, 1]],
        controls: [['sensPct', 'MOUSE SENSITIVITY', 'range', 0, 100, 1], ['invert', 'INVERT MOUSE Y', 'bool'], ['accel', 'MOUSE ACCELERATION', 'bool'], ['__binds', 'KEY BINDINGS', 'binds']],
        graphics: [['scale', 'RESOLUTION SCALE', 'range', .5, 1, .05], ['quality', 'QUALITY PRESET', 'sel', ['low', 'medium', 'high', 'ultra']], ['shadows', 'DYNAMIC SHADOWS', 'bool'], ['effects', 'POST-PROCESS EFFECTS', 'bool'], ['drawDist', 'VIEW DISTANCE', 'range', 150, 600, 10], ['aa', 'ANTI-ALIASING (MSAA)', 'sel', ['off', '2x', '4x']]],
        audio: [['master', 'MASTER VOLUME', 'range', 0, 1, .01], ['music', 'MUSIC VOLUME', 'range', 0, 1, .01], ['sfx', 'EFFECTS VOLUME', 'range', 0, 1, .01], ['amb', 'AMBIENT VOLUME', 'range', 0, 1, .01], ['voice', 'DIALOGUE VOLUME', 'range', 0, 1, .01]],
      };
      $('setTabs').innerHTML = Object.keys(this.setDefsAll).map(k => `<button data-t="${k}">${k.toUpperCase()}</button>`).join('');
      $('setTabs').querySelectorAll('button').forEach(b => b.onclick = () => { AUD.uiClick(); this.setTab = b.dataset.t; this.renderSettings(); });
      this.setDefs = []; this.renderSettings();
    },
    renderSettings() {
      $('setTabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === this.setTab));
      const S = this.setDefsAll[this.setTab]; this.setDefs = S.filter(d => d[2] !== 'binds');
      let h = '';
      for (const [k, n, t, a, b, s] of S) {
        if (t === 'binds') { h += `<div class="setrow"><label>${n}</label><button class="tog" id="kbReset">RESET TO DEFAULTS</button><span class="hint">CLICK A KEY, THEN PRESS THE NEW KEY · ESC CANCELS</span></div>`; for (const [id, nm, def] of ACTIONS) h += `<div class="setrow" style="padding:6px 0"><label style="color:#aaa;font-size:12px">${nm}</label><button class="kb" data-a="${id}">${this.keyName((G.settings.binds || {})[id] || def)}</button></div>`; continue; }
        h += `<div class="setrow"><label>${n}</label>${t === 'range' ? `<input type="range" id="s_${k}" min="${a}" max="${b}" step="${s}"><output id="o_${k}"></output>` : t === 'bool' ? `<button class="tog" id="s_${k}"></button>` : `<div class="seg" id="s_${k}">${a.map(v => `<button data-v="${v}">${v.toUpperCase()}</button>`).join('')}</div>`}</div>`;
      }
      $('setList').innerHTML = h;
      for (const [k, n, t] of this.setDefs) {
        const el = $('s_' + k);
        if (t === 'range') el.oninput = () => { G.settings[k] = parseFloat(el.value); this.syncSettings(); G.applySettings(); G.saveSettings(); };
        else if (t === 'bool') el.onclick = () => { G.settings[k] = !G.settings[k]; this.syncSettings(); G.applySettings(); G.saveSettings(); AUD.uiClick(); };
        else el.querySelectorAll('button').forEach(b => b.onclick = () => { G.settings[k] = b.dataset.v; this.syncSettings(); G.applySettings(); G.saveSettings(); AUD.uiClick(); });
      }
      document.querySelectorAll('.kb').forEach(b => b.onclick = () => { document.querySelectorAll('.kb').forEach(x => x.classList.remove('wait')); b.classList.add('wait'); b.textContent = 'PRESS A KEY…';
        this.capture = code => { this.capture = null; if (code !== 'Escape') { const binds = G.settings.binds = G.settings.binds || {}; for (const [id] of ACTIONS) if (binds[id] === code) delete binds[id]; binds[b.dataset.a] = code; G.applySettings(); G.saveSettings(); AUD.uiClick(); } this.renderSettings(); }; });
      const kr = $('kbReset'); if (kr) kr.onclick = () => { G.settings.binds = {}; G.applySettings(); G.saveSettings(); this.renderSettings(); };
      this.syncSettings();
    },
    keyName(c) { return c.replace('Key', '').replace('Digit', '').replace('Left', ' L').replace('Right', ' R').replace('Control', 'CTRL').replace('Space', 'SPACE').toUpperCase(); },
    syncSettings() {
      for (const [k, n, t] of this.setDefs || []) { const el = $('s_' + k); if (!el) continue; const v = G.settings[k];
        if (t === 'range') { el.value = v; $('o_' + k).textContent = k === 'fov' ? v + '°' : k === 'sensPct' ? Math.round(v) + '%' : k === 'scale' ? Math.round(v * 100) + '%' : k === 'drawDist' ? v + ' M' : k === 'mmZoom' ? (+v).toFixed(1) + '×' : Math.round(v * 100) + '%'; }
        else if (t === 'bool') { el.textContent = v ? 'ON' : 'OFF'; el.classList.toggle('on', !!v); }
        else el.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); }
    },
    /* ---------------- statistics ---------------- */
    renderStats() {
      const C = G.career; const acc = C.shots ? Math.round(C.hits / C.shots * 100) : 0; const cell = (n, v) => `<div class="sc"><b>${v}</b><span>${n}</span></div>`;
      $('stOp').textContent = 'OPERATOR ' + OPERATORS[G.loadout.operator].name + ' · FUNDS ₵ ' + fmt(C.credits);
      $('stGrid').innerHTML = cell('MISSIONS COMPLETED', C.missions) + cell('TOTAL ELIMINATIONS', C.kills) + cell('HEADSHOTS', C.headshots) + cell('SILENT TAKEDOWNS', C.takedowns) + cell('ACCURACY', acc + '%') + cell('CREDITS EARNED', '₵ ' + fmt(C.earned || 0)) + cell('CIVILIANS SAVED', C.civSaved || 0) + cell('CIVILIANS LOST', C.civLost || 0) + cell('GHOST RUNS', C.ghosts) + cell('TIME IN FIELD', fmtTime(C.playtime));
      $('stMissions').innerHTML = MISSIONS.map(m => `<div class="srow"><span>${m.num} · ${m.name}</span><span>${C.completed[m.id] ? '×' + C.completed[m.id] : '—'}</span><span>${C.best[m.id] ? fmtTime(C.best[m.id]) : '--:--'}</span><b>${C.ratings[m.id] || '-'}</b></div>`).join('');
    },
    /* ---------------- results with payout ---------------- */
    results(r) {
      this.showHUD(false); IN.unlock(); this.fade(0, .6);
      $('rName').textContent = r.M.name; $('rStatus').textContent = r.status; $('rStatus').className = r.ghost ? 'ghost' : ''; $('rRating').textContent = r.rating; $('rTime').textContent = fmtTime(r.time);
      $('rObj').innerHTML = r.objectives.filter(o => o.type !== 'hidden').map(o => `<li class="${o.done ? 'done' : 'fail'} ${o.type}"><i>${o.done ? '✔' : '✖'}</i>${o.text}</li>`).join('');
      const s = r.s; const cell = (n, v) => `<div class="sc"><b>${v}</b><span>${n}</span></div>`;
      $('rStats').innerHTML = cell('ELIMINATIONS', s.kills) + cell('TAKEDOWNS', s.takedowns) + cell('ACCURACY', Math.round(r.acc * 100) + '%') + cell('DETECTED', s.detected ? 'YES' : 'NO') + (r.civT ? cell('CIVILIANS ALIVE', (r.civT - r.civK) + ' / ' + r.civT) : cell('BODIES FOUND', s.bodies)) + cell('ALARMS', s.alarms) + cell('HOSTAGES TAKEN', s.hostages || 0) + cell('SLOW-MO USES', s.slowmo || 0);
      $('rPay').innerHTML = r.lines.map((l, i) => `<div class="prow" style="animation-delay:${.2 + i * .12}s"><span>${l[0]}</span><b>${typeof l[1] === 'number' ? '₵ ' + fmt(l[1]) : l[1]}</b></div>`).join('') + `<div class="prow tot" style="animation-delay:${.3 + r.lines.length * .12}s"><span>TOTAL PAID</span><b>₵ ${fmt(r.pay)}</b></div><div class="prow" style="animation-delay:${.4 + r.lines.length * .12}s"><span>BALANCE</span><b>₵ ${fmt(r.credits)}</b></div>`;
      this.show('results');
    },
    hudFrame(dt) {
      baseHud.call(this, dt); if (!$('hud').classList.contains('on')) return;
      const so = $('social'); let txt = '', cls = '';
      if (G.M && G.M.social) { const z = G.zoneAt(P.pos); if (!G.socialCover()) { txt = P.holstered ? 'COVER BLOWN' : 'WEAPON DRAWN — VISIBLE'; cls = 'arm'; } else if (z === 'restricted') { txt = 'RESTRICTED AREA'; cls = 'res'; } else { txt = 'BLENDING IN'; cls = 'pub'; } }
      else if (P.holstered) { txt = 'WEAPON HOLSTERED'; }
      if (so._t !== txt + cls) { so._t = txt + cls; so.textContent = txt; so.className = cls; }
      $('hpbar').firstChild.style.width = (P.health / (P.maxHealth || 100) * 100).toFixed(0) + '%';
      if (P.holstered && P.state !== 'vehicle') { const am = $('ammo'); if (am.querySelector('.wn').textContent !== 'HOLSTERED') { am.querySelector('.wn').textContent = 'HOLSTERED'; am.querySelector('b').textContent = ''; am.querySelector('.am span').textContent = ''; this._ak = 'hol'; } }
    },
  });
})();
