/* =====================================================================
   MISSIONS — three unique areas of operation.
   ===================================================================== */
const TALK = {
  cartel: [
    [[0, "The boss is in a mood again. Third shipment late this month."], [1, "Not our problem. We just guard the swamp."], [0, "It's our problem when he starts looking for someone to blame."], [1, "Then keep your head down and your boots dry."], [2, "Speaking of dry... anyone else's socks still wet from yesterday?"], [0, "Everything in this place is wet. Even the cigarettes."]],
    [[0, "Did you hear the plane earlier? Real low."], [1, "Smugglers. Or the DEA flying blind again."], [0, "If it was DEA we'd already be in cuffs."], [1, "Or dead. Either way, not tonight."]],
    [[0, "Gators took another dog last night."], [1, "Better a dog than Chuy."], [0, "Ha! Chuy's too ugly, the gators would spit him out."], [1, "Don't let him hear you say that."]],
    [[0, "El Caimán wants the plane fueled by midnight."], [1, "Where's he going?"], [0, "Nobody asks him that. Ever."], [1, "Fair enough. I'll tell the mechanics."]],
  ],
  pmc: [
    [[0, "Contract says six more weeks on this rock."], [1, "Hazard pay's good. Rain's free."], [0, "Kessler says the buyer shows on Thursday."], [1, "Then we load the K-7 container and we're done. Easy money."]],
    [[0, "Comms are spotty tonight. Storm's messing with the repeater."], [1, "Keep your radio on anyway. Brandt's twitchy about the manifest."], [0, "It's a hard drive. Who steals a hard drive in a hurricane?"], [1, "The kind of people we get paid to shoot."]],
    [[0, "Dock workers went home early. Smart guys."], [1, "Wish I could. My boots are filled with water."], [0, "Stop complaining. At least we're not on the ship."]],
  ],
  militia: [
    [[0, "Minus twenty and they want us patrolling the relays."], [1, "The uplink has to stay online. Orders from the colonel."], [0, "The colonel sits by a heater all day."], [1, "And that is why he is the colonel."]],
    [[0, "Did the supply truck make it up the pass?"], [1, "Barely. Driver says the road is ice down to the river."], [0, "Then we're stuck here until spring."], [1, "We were always stuck here."]],
    [[0, "Vault codes changed again this morning."], [1, "The chief keeps the card on him. Paranoid old wolf."], [0, "Paranoid is how you stay alive up here."]],
  ],
};
function scatter(W, n, fn, ok, rng) { let k = 0, tries = 0; while (k < n && tries++ < n * 30) { const x = (rng() - .5) * W.size * .96, z = (rng() - .5) * W.size * .96; if (ok(x, z)) { fn(x, z); k++; } } }
function colorTable(defs) { const o = {}; for (const k in defs) o[k] = lin(defs[k]); return o; }
function plantSpot(W, G, pos, label, onDone) {
  const it = {
    r: 2, wide: true, pos, hold: 3.2, anim: 'plant', planted: false,
    label: () => it.planted ? '' : P.mission.includes('charge') ? '[E] PLANT DEMO CHARGE — ' + label + ' (HOLD)' : label + ' — DEMO CHARGE REQUIRED',
    enabled: () => !it.planted && P.state === 'ground',
    onHold: () => { if (!P.mission.includes('charge')) P.cancelHold(); },
    act: () => {
      if (!P.mission.includes('charge')) return; it.planted = true; P.mission.splice(P.mission.indexOf('charge'), 1); P.missionSel = 0;
      const c = W.addItem('charge', V.add(pos, [0, -.05, 0]), 0); c.alive = true; c.planted = true; W.items.splice(W.items.indexOf(c), 1); W.dyn.push(c); G.dlights.push({ pos, col: [1, .1, .1], i: .6, range: 2, life: 1e9 });
      AUD.beep(1600, .08, .3, pos); setTimeout(() => AUD.beep(2000, .08, .3, pos), 200); G.notify('CHARGE ARMED — ' + label, 'good'); onDone && onDone();
    },
  };
  W.interact.push(it); return it;
}
Object.assign(G, {
  updateFires(dt) {
    for (const f of this.fires) {
      f.l.i = 3 + Math.sin(this.time * 13 + f.k) * .5 + Math.random() * .7;
      if (Math.random() < .7) this.particles.push({ p: V.add(f.p, [rnd(-.25, .25), .1, rnd(-.25, .25)]), v: [rnd(-.2, .2), rnd(1, 2), rnd(-.2, .2)], life: 0, max: rnd(.4, .8), s: rnd(.15, .3), grow: -.2, c: [1, rnd(.35, .6), .1], a: .9, add: true });
      if (Math.random() < .25) this.particles.push({ p: V.add(f.p, [0, .8, 0]), v: [rnd(-.3, .3), rnd(.8, 1.4), rnd(-.3, .3)], life: 0, max: 4, s: .3, grow: .5, c: [.2, .2, .2], a: .25, drag: .3 });
      if (V.dist(f.p, P.pos) < 18 && Math.random() < dt * 4) AUD.click(1500 + Math.random() * 2500, .08, f.p, .01);
    }
  },
});
function campfire(W, G, x, z) {
  const y = W.th(x, z); const B = W.B; B.col(0x5a5a54, MAT.ROCK); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; B.blob(x + Math.cos(a) * .7, y + .08, z + Math.sin(a) * .7, .17, .12, i + x, .3, 6, 4); }
  B.col(0x2a1a10, MAT.BARK); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .4; B.beam([x + Math.cos(a) * .5, y + .05, z + Math.sin(a) * .5], [x, y + .45, z], .09); }
  B.col(0x111111, MAT.MUD).cyl(x, y + .01, z, .6, .6, .02, 10);
  const l = W.light([x, y + .8, z], 0xff8030, 3, 12, { glow: .5 }); G.fires.push({ p: [x, y + .1, z], l, k: Math.random() * 9 }); W.colBox(x, y + .2, z, 1.4, .4, 1.4, { surf: 'concrete', sight: false });
}
function staticBoat(W, x, z, yaw, col) { const y = W.waterY; const B = W.B; B.push().t(x, y - .1, z).ry(yaw); B.col(col, MAT.PAINT).tbox(0, .25, 0, 1.5, .55, 4.2, 1.7, 4.6); B.col(0x3a2a1a, MAT.WOOD).box(0, .45, 0, 1.3, .06, 4); B.box(0, .6, .5, 1.3, .08, .3).box(0, .6, -1, 1.3, .08, .3); B.col(0x222222, MAT.METAL).box(0, .8, 2.2, .3, .6, .3); B.pop(); }
function m1Plane(W, x, z, fy) { // twin-engine aircraft in hangar
  const B = W.B; B.push().t(x, fy, z);
  B.col(0xd8d4cc, MAT.PAINT).cylZ(0, 2, 0, .9, 10, 14).sph(0, 2, -5, .9, .9, 1.6, 14, 8).push().t(0, 2.3, 5).rx(-.18).cyl(0, 0, 0, .9, .25, 4.5, 12).pop().pop();
  B.push().t(x, fy, z);
  B.col(0x8a1a14, MAT.PAINT).box(0, 1.65, 0, 1.82, .18, 10.01);
  B.col(0x1a2228, MAT.GLASS).sph(0, 2.55, -4.2, .7, .45, 1.1, 12, 6);
  B.col(0xd8d4cc, MAT.PAINT).box(0, 2.1, -.5, 14, .18, 2).box(0, 3.5, 9.2, .15, 2.2, 1.6).box(0, 2.6, 9.4, 5, .12, 1.2);
  for (const s of [-1, 1]) { B.col(0xc8c4bc, MAT.PAINT).cylZ(s * 3, 1.9, -1.2, .45, 2.8, 12); B.col(0x222222, MAT.METAL).cylZ(s * 3, 1.9, -2.7, .2, .3, 8); B.col(0x111111, MAT.METAL).box(s * 3, 1.9, -2.85, .1, 2.2, .06); B.col(0x111111, MAT.RUBBER).cylX(s * 3, .35, -1, .35, .25, 12); B.col(0x777777, MAT.METAL).box(s * 3, 1, -1, .1, 1.3, .1); }
  B.col(0x111111, MAT.RUBBER).cylX(0, .3, -4, .3, .2, 12); B.col(0x777777, MAT.METAL).box(0, .9, -4, .08, 1.2, .08);
  for (let i = 0; i < 4; i++) B.col(0x2a3440, MAT.GLASS).box(.91, 2.25, -2.5 + i * 1.3, .02, .35, .6).box(-.91, 2.25, -2.5 + i * 1.3, .02, .35, .6);
  B.col(0x1a1a1a, MAT.PAINT).box(.92, 1.8, 1.8, .02, 1.3, .8);
  B.pop();
  W.colBox(x, fy + 2, z, 1.8, 2, 11, { surf: 'metal' }); W.colBox(x, fy + 2.1, z - .5, 14, .3, 2, { surf: 'metal' }); for (const s of [-1, 1]) W.colBox(x + s * 3, fy + 1, z - 1, .5, 2, .6, { surf: 'metal' });
  W.mline(x - .9, z - 6, x + .9, z - 6); W.mline(x - .9, z + 5, x + .9, z + 5); W.mline(x - .9, z - 6, x - .9, z + 5); W.mline(x + .9, z - 6, x + .9, z + 5);
}
function forklift(W, x, z, yaw) { const y = W.th(x, z) + .15; const B = W.B; B.push().t(x, y, z).ry(yaw); B.col(0xd0a020, MAT.PAINT).box(0, .7, .3, 1.2, .9, 2).box(0, 1.6, .7, 1.1, .1, 1.1); B.col(0x222222, MAT.METAL).box(-.5, 1.3, .2, .06, 1.2, .06).box(.5, 1.3, .2, .06, 1.2, .06).box(-.5, 1.3, 1.2, .06, 1.2, .06).box(.5, 1.3, 1.2, .06, 1.2, .06); B.box(-.35, 1.4, -.75, .1, 2.6, .1).box(.35, 1.4, -.75, .1, 2.6, .1); B.col(0x444444, MAT.METAL).box(-.25, .1, -1.3, .12, .06, 1).box(.25, .1, -1.3, .12, .06, 1); B.col(0x111111, MAT.RUBBER).cylX(-.6, .3, -.3, .3, .2, 10).cylX(.6, .3, -.3, .3, .2, 10).cylX(-.6, .25, 1, .25, .2, 10).cylX(.6, .25, 1, .25, .2, 10); B.col(0x1a1a1a, MAT.LEATHER).box(0, 1.25, .7, .6, .15, .5); B.pop(); W.colRot(x, y, z, 0, 0, 0, 1.4, 2, 2.6, { surf: 'metal' }); }

/* ============================ MISSION 01 ============================ */
const M1 = {
  id: 'm1', code: 'OPERATION BLACKWATER', name: 'SWAMP INFILTRATION', num: '01', location: 'Atchafalaya Delta — cartel compound "La Ciénaga"', time: '19:42 LOCAL — DUSK', weather: 'Humid · light ground fog', difficulty: 2, size: 440, seed: 11, parTime: 900, ambience: 'swamp', siren: true, fleeSpot: [62, 48],
  briefing: 'Rafael "El Caimán" Ortega runs the Gulf\'s largest narcotics air bridge out of a fortified compound hidden deep in the delta swamp. Local law enforcement is compromised; a conventional raid would leak hours in advance. You will perform a HALO insertion from a C-130 at dusk, eliminate Ortega and exfiltrate by helicopter from a clearing east of the compound.',
  intel: ['Ortega keeps an office on the north side of the main HQ building. He rarely leaves it after sunset.', 'A diesel generator south-east of the HQ powers floodlights and security cameras. Cutting it will blind the compound.', 'Expect 25+ armed cartel members: gate guards, three watchtowers, patrols and mechanics in the aircraft hangar.', 'The cartel uses unencrypted radios. Our intercept will transcribe their chatter to you.', 'A financial ledger is believed to be stored in the storage depot office. Recover it if possible.'],
  objectives: [
    { id: 'jump0', text: 'Open the cargo ramp and jump', type: 'hidden' },
    { id: 'kill', text: 'Eliminate cartel commander Rafael "El Caimán" Ortega', type: 'primary' },
    { id: 'extract', text: 'Reach the extraction helicopter east of the compound', type: 'primary' },
    { id: 'ghost', text: 'Remain undetected', type: 'optional', check: g => !g.stats.detected },
    { id: 'power', text: 'Cut the compound generator power', type: 'optional' },
    { id: 'ledger', text: 'Recover the cartel ledger', type: 'optional' },
  ],
  env: { sunDir: [-.62, .2, -.55], sunCol: 0xffa25a, sunI: 2.1, sky: 0x8090a8, skyI: .75, gnd: 0x4a4230, gndI: .55, fog: 0x8a8a74, fogI: .9, fogD: .0052, fogH: 2, expo: 1.15, zen: 0x2e4468, hor: 0xe09a5a, cloud: .55, fireflies: true, vis: .72, wind: 1, skyFog: .45 },
  build(W, G) {
    const R = W.rng;
    const H = (x, z) => {
      let h = -.85 + fbm(x * .017 + 3, z * .017 + 7, 4) * 1.5 - .1; h += Math.max(0, fbm(x * .05 + 9, z * .05) - .58) * 3.2;
      const d = Math.hypot(x / 104, z / 88) + (fbm(x * .04, z * .04) - .5) * .15; if (d < 1.14) h = lerp(h, 1.35 + fbm(x * .08, z * .08) * .3, smooth((1.14 - d) / .15));
      const dl = Math.hypot(x - 165, z + 125) / 30; if (dl < 1.25) h = lerp(h, 1.2, smooth((1.25 - dl) / .3));
      const e = Math.max(Math.abs(x), Math.abs(z)); if (e > 188) h = lerp(h, 1.6, smooth((e - 188) / 25)); return h;
    };
    W.initTerrain(H, 2);
    const road1 = [[-215, 12], [-150, 10], [-96, 8], [-60, 6], [-20, 2], [20, -2], [60, -10], [93, -24]], road2 = [[93, -24], [118, -52], [142, -88], [160, -114]], road3 = [[-20, 2], [-25, -30], [-42, -48]], road4 = [[20, -2], [35, 20], [55, 22]];
    for (const r of [road1, road2]) W.flattenPath(r, 7, 5, 1.0); W.flattenPath(road3, 6, 3, 1.1); W.flattenPath(road4, 7, 3, 1.1);
    W.flatten(-1, -38, 21, -22, 1.45, 4); W.flatten(35, 25, 75, 55, 1.4, 5); W.flatten(-55, -60, -29, -50, 1.4, 4);
    W.flatten(150, -140, 180, -110, 1.25, 8);
    const C = colorTable({ deep: 0x24261a, wet: 0x3a3624, dirt: 0x5a4a34, grass: 0x485a28, moss: 0x3e4a22, dry: 0x6a5c40 });
    W.buildTerrainMesh((x, z, h, n) => {
      if (h < -.1) return { c: C.deep, m: MAT.MUD }; if (h < .3) return { c: C.wet, m: MAT.MUD };
      const comp = Math.hypot(x / 104, z / 88) < 1; const k = vnoise(x * .15, z * .15);
      if (comp) return k > .55 ? { c: C.grass, m: MAT.GRASS } : { c: k > .3 ? C.dirt : C.dry, m: MAT.MUD };
      return k > .4 ? { c: C.grass, m: MAT.GRASS } : { c: C.moss, m: MAT.GRASS };
    });
    W.setWater(0, lin(0x2e3a22), lin(0x1a2414), .86, .8);
    W.surfFn = (x, z) => { for (const r of W.roads) for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1]; const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz), 0, 1); if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < r.w / 2) return 'gravel'; } return vnoise(x * .15, z * .15) > .5 ? 'grass' : 'mud'; };
    W.road(road1, 6, 0x5a4a34); W.road(road2, 5, 0x5a4a34); W.road(road3, 5, 0x5a4a34); W.road(road4, 6, 0x5a4a34);
    W.pois.push({ p: [10, -30], t: 'HQ' }, { p: [55, 40], t: 'HANGAR' }, { p: [-42, -55], t: 'GARAGES' }, { p: [35, -55], t: 'STORAGE' }, { p: [25, -72], t: 'GENERATOR' }, { p: [165, -125], t: 'EXFIL LZ' }, { p: [-88, 2], t: 'WEST GATE' }, { p: [8, 100], t: 'BOATHOUSE' });
    /* ---- HQ (main building) ---- */
    const hq = W.building({ x: 10, z: -30, w: 22, d: 16, h: 3.4, wallCol: 0xa39a88, inCol: 0xc8bca4, floorMat: MAT.TILE, floorCol: 0x8a7a64, ac: true,
      doors: [{ side: 's', at: 0, w: 1.2, label: 'HQ DOOR' }, { side: 'w', at: 4, label: 'KITCHEN DOOR' }],
      windows: [{ side: 'n', at: -6, w: 1.6 }, { side: 'n', at: 5, w: 1.8 }, { side: 'e', at: -4.5, w: 1.4 }, { side: 'w', at: -4.5, w: 1.4 }, { side: 's', at: -8, w: 1.4 }, { side: 's', at: 7.5, w: .8, h: .6, y0: 1.6 }, { side: 'w', at: 1.5, w: 1.2 }],
      parts: [[-11, -1, -1, -1, 0], [-1, -1, 11, -1, 0, .95, false, { label: "OFFICE DOOR" }], [-1, -8, -1, -1], [-4, -1, -4, 8, 0], [4, -1, 4, 8, -2.5], [4, 3.5, 11, 3.5, 0]],
      rooms: [[-11, -8, -1, -1, 'office', 'moff'], [-1, -8, 11, -1, 'commander', 'cmd'], [-11, -1, -4, 8, 'kitchen', 'kit'], [-4, -1, 4, 8, 'lobby', 'lob'], [4, -1, 11, 3.5, 'security', 'sec'], [4, 3.5, 11, 8, 'bath']] });
    W.stairs(21.8, -22.4, 'n', 1.2, hq.fy + hq.h + .3 - W.th(21.8, -22.4), 5.2, 0x4a4a46, MAT.METAL, 'metal');
    W.sandbags(15, -36.5, 3, 0, 2); W.box(4, hq.fy + hq.h + .9, -34, 1.2, .9, .9, 0x6a6a60, MAT.METAL, { surf: 'metal' });
    W.D.col(0x333333, MAT.METAL).cyl(19, hq.fy + hq.h + .3, -24, .03, .02, 6, 4);
    /* ---- Hangar ---- */
    const hg = W.building({ x: 55, z: 40, w: 40, d: 30, h: 8.5, wallCol: 0x6e7470, wallMat: MAT.CORR, inCol: undefined, floorMat: MAT.CONC, floorCol: 0x6a6862, roof: 'arch', rh: 4.5, roofCol: 0x5e625e, noCeil: true, lights: false,
      doors: [{ side: 'n', at: -4, w: 18, h: 7.6, open: true, none: true }, { side: 'w', at: 8, label: 'SIDE DOOR', metal: true, col: 0x5a5e5a }],
      windows: [{ side: 'e', at: -8, w: 3, h: 1, y0: 5 }, { side: 'e', at: 4, w: 3, h: 1, y0: 5 }, { side: 'w', at: -6, w: 3, h: 1, y0: 5 }],
      parts: [[12, 7, 20, 7, 0, .95, false, { label: 'OFFICE DOOR' }], [12, 7, 12, 15]], rooms: [[12, 7, 20, 15, 'office', 'hgo']] });
    for (let i = 0; i < 4; i++) { const lx = 45 + (i % 2) * 20, lz = 32 + Math.floor(i / 2) * 14; W.D.col(0x333333, MAT.METAL).cyl(lx, hg.fy + 8.6, lz, .02, .02, 3, 4).cyl(lx, hg.fy + 8.1, lz, .5, .2, .5, 10, 2); W.D.col(0xfff6e0, MAT.EMIT).cyl(lx, hg.fy + 8.08, lz, .45, .45, .02, 10); W.light([lx, hg.fy + 7.8, lz], 0xfff0d8, 3.2, 20, { group: 'power', glow: .7, dir: [0, -1, 0], cone: .25 }); }
    m1Plane(W, 50, 44, hg.fy);
    W.workbench(40, 52.5, hg.fy, 2, 'hgw'); W.workbench(70, 30, hg.fy, 3, 'hgw2'); W.toolchest(38, 55, hg.fy); W.toolchest(73, 27, hg.fy); W.tires(73, 52, hg.fy);
    for (let i = 0; i < 4; i++) W.crate(37 + i * 1.1, 28, hg.fy, 1, 1, 1, 0x6a5a3a, i % 2 === 0); W.crate(37.5, 28, hg.fy + 1, 1, .9, 1, 0x7a6040); W.crate(38.6, 29.3, hg.fy, 1, 1, 1, 0x6a5a3a, true);
    for (let i = 0; i < 5; i++) W.barrel(72 + (i % 2) * .7, 44 + i * .7, hg.fy, 0x2a4a2a); W.barrel(72, 48, hg.fy, 0, true); W.barrel(72.7, 48.5, hg.fy, 0, true);
    forklift(W, 62, 52, .5); W.pallet(66, 52, hg.fy); W.crate(66, 52, hg.fy + .12, 1.1, .8, 1.1, 0x8a7a5a); W.decal(52, hg.fy, 38, 4, 3, 0x111008);
    W.generatorPanel(35.15, hg.fy + 1.5, 44, 1);
    /* ---- Garages ---- */
    for (let i = 0; i < 3; i++) { const gx = -50 + i * 8; W.building({ x: gx, z: -55, w: 7, d: 8, h: 3.2, wallCol: 0x8a8478, inCol: 0x9a9284, floorMat: MAT.CONC, floorCol: 0x5a5852, doors: [{ side: 's', at: 0, w: 4.8, h: 2.7, open: true, none: true }], rooms: [[-3.5, -4, 3.5, 4, i === 2 ? 'workshop' : 'garage', 'gar' + i]], roof: 'shed', roofCol: 0x5a5a56 }); W.B.col(0x7a7e78, MAT.CORR).box(gx, W.th(gx, -51) + 2.9, -51, 4.8, .6, .1); }
    /* ---- Storage depot + lab ---- */
    const s1 = W.building({ x: 35, z: -55, w: 14, d: 9, h: 3.2, wallCol: 0x7a7a70, wallMat: MAT.CORR, inCol: 0xa09888, floorMat: MAT.CONC, floorCol: 0x5a5852, doors: [{ side: 'w', at: 0, label: 'DEPOT DOOR', metal: true, col: 0x5a5e5a }, { side: 's', at: 4.5, label: 'OFFICE DOOR' }], windows: [{ side: 'n', at: -3, w: 1.4 }, { side: 'e', at: 0, w: 1.2 }], parts: [[2, -4.5, 2, 4.5, 0]], rooms: [[-7, -4.5, 2, 4.5, 'lab', 'lab'], [2, -4.5, 7, 4.5, 'office', 's1o']] });
    const led = W.addItem('ledger', [39.1, s1.fy + .81, -56.1], .3);
    const s2 = W.building({ x: -18, z: 42, w: 10, d: 8, h: 3.2, wallCol: 0x7a6a54, wallMat: MAT.WOOD, inCol: 0x8a7a64, doors: [{ side: 'e', at: 1 }], windows: [{ side: 's', at: 0, w: 1.2 }], rooms: [[-5, -4, 5, 4, 'storage', 's2']], roof: 'gable', roofCol: 0x4a4a46 });
    W.ammoPickup(-14, s2.fy + .05, 39);
    /* ---- Bungalows ---- */
    const b1 = W.building({ x: -62, z: 40, w: 9, d: 6, h: 2.9, stilts: 1.2, wallCol: 0x6a5640, wallMat: MAT.WOOD, inCol: 0x9a8668, frame: 0x3a2a1a, doors: [{ side: 's', at: -2 }], windows: [{ side: 's', at: 2, w: 1.2 }, { side: 'n', at: -2, w: 1.2 }, { side: 'w', at: 0, w: 1 }], parts: [[0, -3, 0, 3, 1.2]], rooms: [[-4.5, -3, 0, 3, 'bedroom', 'b1'], [0, -3, 4.5, 3, 'lounge', 'b1l']], roof: 'gable', roofCol: 0x3a3a34, rh: 1.2 });
    W.stairs(-64, 43 + 2.2, 'n', 1.1, b1.fy - W.th(-64, 45.2), 2.2);
    const b2 = W.building({ x: -40, z: 62, w: 10, d: 7, h: 2.9, stilts: 1, wallCol: 0x5e5040, wallMat: MAT.WOOD, inCol: 0x8a7a60, frame: 0x3a2a1a, doors: [{ side: 'w', at: 1 }], windows: [{ side: 's', at: -2, w: 1.2 }, { side: 's', at: 2.5, w: 1.2 }, { side: 'n', at: 0, w: 1.2 }], rooms: [[-5, -3.5, 5, 3.5, 'barracks', 'b2']], roof: 'gable', roofCol: 0x3e3e38, rh: 1.2 });
    W.stairs(-45 - 2, 63, 'e', 1.1, b2.fy - W.th(-47, 63), 2);
    W.bridge(8, 77, 8, 96.8, 1.6, 1.45);
    const b3 = W.building({ x: 8, z: 100, w: 8, d: 6, h: 2.8, y: 1.45, stilts: 1, wallCol: 0x6a5a44, wallMat: MAT.WOOD, inCol: 0x9a8a6c, frame: 0x3a2a1a, doors: [{ side: 'n', at: 0, label: 'BOATHOUSE DOOR' }], windows: [{ side: 's', at: 0, w: 1.6 }, { side: 'e', at: 0, w: 1.2 }, { side: 'w', at: 0, w: 1.2 }], rooms: [[-4, -3, 4, 3, 'lounge', 'b3']], roof: 'gable', roofCol: 0x3a3a34, rh: 1.1 });
    const b4 = W.building({ x: -72, z: -12, w: 9, d: 8, h: 3, wallCol: 0xb0a890, inCol: 0xc8c0a8, floorMat: MAT.TILE, floorCol: 0x7a6a5a, doors: [{ side: 'e', at: 2 }], windows: [{ side: 'n', at: 0, w: 1.4 }, { side: 'w', at: -2, w: 1.2 }, { side: 's', at: 0, w: 1.2 }], parts: [[-4.5, 0, 4.5, 0, 1.5]], rooms: [[-4.5, -4, 4.5, 0, 'kitchen', 'b4k'], [-4.5, 0, 4.5, 4, 'bedroom', 'b4']], roof: 'flat' });
    /* ---- gate & guard posts ---- */
    W.building({ x: -86, z: -2, w: 3, d: 3, h: 2.6, wallCol: 0x8a8678, inCol: 0xa09a8a, floorMat: MAT.CONC, doors: [{ side: 'e', at: 0, w: .9, none: true, open: true }], windows: [{ side: 'w', at: 0, w: 1.6, h: .9, y0: 1 }, { side: 'n', at: 0, w: 1.6, h: .9, y0: 1 }, { side: 's', at: 0, w: 1.6, h: .9, y0: 1 }], rooms: [[-1.5, -1.5, 1.5, 1.5, 'empty']], lightR: 4 });
    W.chair(-86.5, -2.5, W.th(-86, -2) + .15, 1, 'gate'); W.box(-90, W.th(-90, 8) + 1, 4.5, .3, 2, .3, 0x9a2a1a, MAT.PAINT, { surf: 'metal' }); W.B.col(0xd0c0a0, MAT.PAINT).box(-90, W.th(-90, 8) + 1.6, 8, .12, .12, 7);
    const t1 = W.watchtower(-78, -62, 5), t2 = W.watchtower(78, -58, 5), t3 = W.watchtower(48, 82, 5);
    /* ---- generator & power ---- */
    const gp = W.generator(25, -72, 0); W.gens = [{ pos: gp }];
    W.box(25, W.th(25, -72) + 1.5, -69.5, 4, .15, 4.5, 0x5a5a52, MAT.CORR, { surf: 'metal' }); for (const [a, b] of [[-1.9, -2.1], [1.9, -2.1], [-1.9, 2.1], [1.9, 2.1]]) W.box(25 + a, W.th(25, -72) + .75, -69.5 + b, .1, 1.5, .1, 0x555555, MAT.METAL);
    W.generatorPanel(27.6, W.th(27.6, -70) + 1.2, -70.4, 3);
    W.interact.push({ r: 1.8, pos: [27.4, W.th(27.6, -70) + 1.2, -70.4], hold: 2.6, anim: 'hotwire', label: () => G.powerOn ? '[E] CUT GENERATOR POWER (HOLD)' : '', enabled: () => G.powerOn, act: () => { G.setPower(false); G.complete('power'); setTimeout(() => { const n = G.npcs.find(x => !x.dead && x.state === 'calm' && x.role !== 'commander'); if (n) { G.speak(n, "Power's down! Someone check the generator!", true); n.setSuspicious([25, 0, -72], false); n.setState('investigate'); n.suspPt = [25, 0, -72]; n.goTo([25, 0, -73], true); } }, 3000); } });
    const fl = [[-82, -8], [-60, -50], [-12, -48], [70, -40], [90, 10], [30, 62], [-30, 70], [-70, 25], [0, 0], [40, -10]];
    for (const [x, z] of fl) W.floodlight(x, z, Math.atan2(x, z), 6.5);
    /* ---- perimeter fence (with gaps) ---- */
    const fp = []; for (let i = 0; i <= 36; i++) { const a = i / 36 * TAU; fp.push([Math.cos(a) * 98, Math.sin(a) * 82]); }
    for (let i = 0; i < 36; i++) { if ([0, 1, 9, 18, 19, 27, 28, 13, 31].includes(i)) continue; const a = fp[i], b = fp[i + 1]; if (Math.hypot(a[0] - -96, a[1] - 8) < 9 || Math.hypot(a[0] - 93, a[1] + 24) < 9) continue; W.fence(a[0], a[1], b[0], b[1], 'chain', 2.4); }
    /* ---- props & clutter ---- */
    campfire(W, G, -48, 18); W.log(-50.3, 17.5, 2.2, .3); W.log(-46, 19.8, 2, 1.7); W.bench(-48, 15.6, W.th(-48, 15.6), 0);
    W.table(-30, -5, W.th(-30, -5), 1.4, .8, null, 0); W.clutter(-30, -5, W.th(-30, -5) + .79, 'beer');
    W.table(-8, -14, W.th(-8, -14), 1.4, .8, 'yard', 3); W.clutter(-8, -14, W.th(-8, -14) + .79, 'cards');
    const parked = [['sedan', -15, -14, .2], ['suv', -9, -20, -.1]];
    W.dock = 1; W.bridge(-35, 76, -35, 95, 3, .8, false); staticBoat(W, -32.6, 90, .05, 0x3a5a6a); staticBoat(W, -37.6, 92, -.1, 0x6a4a2a);
    for (let i = 0; i < 6; i++) W.crate(-30 + R() * 4, 72 + R() * 3, W.th(-30, 72), .8, .7, .8, 0x6a5a3a, true);
    for (const [x, z] of [[-20, -30], [-25, 30], [20, 30], [-60, 0], [70, -20], [5, 55], [-5, -60], [45, -40]]) { const y = W.th(x, z); W.crateStack(x, z, y); W.pallet(x + 1.4, z, y); if (R() < .6) W.barrel(x - 1.2, z + .5, y, [0x7a1a12, 0x2a4a7a, 0x3a5a2a][(R() * 3) | 0]); if (R() < .5) W.barrel(x - 1.3, z - .4, y, 0, true); }
    W.tires(-30, -48, W.th(-30, -48)); W.sandbags(-82, 3, 4, 1); W.sandbags(90, -15, 4, 1);
    for (let i = 0; i < 4; i++) W.barrel(-38 + i * .7, -45, W.th(-38, -45), 0x7a1a12); W.box(-25, W.th(-25, 60) + .5, 60, 2, 1, 1.4, 0x3a5a3a, MAT.RUST, { surf: 'metal' });
    // abandoned equipment / junk
    W.box(-95, W.th(-95, 40) + .6, 40, 3.5, 1.2, 1.8, 0x5a3a20, MAT.RUST, { surf: 'metal' }); W.B.col(0x111111, MAT.RUBBER).cylX(-96, W.th(-96, 41) + .4, 41.1, .4, .3, 10);
    W.box(110, W.th(110, -60) + .4, -60, 2.5, .8, 1.5, 0x4a3a2a, MAT.RUST, { surf: 'metal' });
    for (const [x, z] of [[-25, 8], [15, 12], [45, 10], [-55, -30]]) W.lampPost(x, z, 5);
    /* ---- vegetation ---- */
    const inComp = (x, z) => Math.hypot(x / 100, z / 84) < 1;
    const nearRoad = (x, z, w) => { for (const r of W.roads) for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1]; const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz), 0, 1); if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < w) return true; } return false; };
    const lz = (x, z) => Math.hypot(x - 165, z + 125) < 22;
    scatter(W, 250, (x, z) => W.tree(x, z, 'cypress', .8 + R() * .6), (x, z) => !inComp(x, z) && !nearRoad(x, z, 8) && !lz(x, z), R);
    scatter(W, 30, (x, z) => W.tree(x, z, 'broadleaf', .9 + R() * .4), (x, z) => !inComp(x, z) && W.th(x, z) > .4 && !nearRoad(x, z, 7) && !lz(x, z), R);
    scatter(W, 14, (x, z) => W.tree(x, z, 'cypress', .7 + R() * .3), (x, z) => Math.hypot(x / 100, z / 84) > .78 && inComp(x, z) && !nearRoad(x, z, 8) && W.th(x, z) > .9 && !W.inside(x, z) && W.query(x - 3, z - 3, x + 3, z + 3, []).length === 0, R);
    scatter(W, 170, (x, z) => W.bush(x, z, .8 + R() * .7, [0x3a5a2a, 0x445e2c, 0x35502a][(R() * 3) | 0]), (x, z) => W.th(x, z) > .25 && !nearRoad(x, z, 5) && !W.inside(x, z) && W.query(x - 2, z - 2, x + 2, z + 2, []).length === 0, R);
    scatter(W, 260, (x, z) => W.reeds(x, z, 10), (x, z) => Math.abs(W.th(x, z) - 0) < .45, R);
    scatter(W, 90, (x, z) => W.lilypads(x, z, 7), (x, z) => W.th(x, z) < -.3, R);
    scatter(W, 260, (x, z) => W.grass(x, z, 8), (x, z) => W.th(x, z) > .3 && !nearRoad(x, z, 4) && !W.inside(x, z), R);
    scatter(W, 22, (x, z) => W.log(x, z, 3 + R() * 3, R() * 3), (x, z) => !inComp(x, z) && !nearRoad(x, z, 6) && !lz(x, z), R);
    /* ---- vehicles ---- */
    G.addVehicle('pickup', -50, -55, 0, { hotwire: true, color: 0x6a1a14 }); G.addVehicle('suv', -42, -55.3, 0, { color: 0x1a1a1a, name: 'JEEP' });
    for (const [k, x, z, y] of parked) G.addVehicle(k, x, z, y, { hotwire: true }); G.addVehicle('truck', 30, 18, -2.4, { hotwire: true, color: 0x3a4430 });
    /* ---- security cameras ---- */
    G.addCam([10, hq.fy + 3.1, -21.6], Math.PI, .8, true); G.addCam([46, hg.fy + 6, 24.7], 0, .9, true); G.addCam([-42, W.th(-42, -51) + 3.1, -50.9], Math.PI, .7, true); G.addCam([28.2, s1.fy + 3, -59.6], Math.PI / 2, .6, true);
    /* ---- extraction ---- */
    G.spawnExtractHeli([166, -126], -2.3);
    /* ---- NPCs ---- */
    const N = d => G.addNPC(Object.assign({ faction: 'cartel' }, d));
    N({ id: 'commander', name: 'Ortega', role: 'commander', weapon: 'pistol', hp: 120, app: { suit: 0x1c1c22, head: 'hair', glasses: true, beard: true, bulk: 1.12, skin: 0xc89670, vest: false, gloves: false }, pos: [15, -34], radioOp: true, routine: [{ t: 'sit', anchor: 'cmd_seat', dur: 55 }, { t: 'idle', pos: [15, -36.6], yaw: 0, anim: 'look', dur: 14 }, { t: 'idle', pos: [18.5, -33], yaw: -Math.PI / 2, anim: 'radio', dur: 9 }, { t: 'sit', anchor: 'cmd_seat', dur: 40 }, { t: 'idle', pos: [12, -32.5], yaw: Math.PI, anim: 'smoke', dur: 16 }], prop: 'cig' });
    N({ name: 'Gordo', weapon: 'shotgun', pos: [15, -28.5], app: { bulk: 1.2, head: 'bald', vest: true }, routine: [{ t: 'guard', pos: [15.5, -28.8], yaw: Math.PI / 2 + .3 }] });
    N({ weapon: 'smg', pos: [6, -27], routine: [{ t: 'patrol', pts: [[6, -27], [12, -25], [6, -27.5], [2.5, -28]], wait: 5 }, { t: 'sit', anchor: 'kit_seat', dur: 30 }] });
    N({ name: 'Memo', weapon: 'pistol', role: 'worker', camOp: true, pos: [18, -28], routine: [{ t: 'sit', anchor: 'sec_seat' }] });
    N({ name: 'Rosa', weapon: 'pistol', role: 'worker', pos: [2, -34], app: { head: 'hair', vest: false }, routine: [{ t: 'sit', anchor: 'moff_seat', dur: 60 }, { t: 'idle', pos: [0, -35], yaw: Math.PI / 2, anim: 'look', dur: 12 }] });
    N({ post: 'Roof', elevated: true, static: true, weapon: 'ak', pos: [15, -34], routine: [{ t: 'guard', pos: [16, -33], yaw: 0, look: true }] });
    // west gate
    N({ post: 'West gate', group: 'gate', weapon: 'ak', pos: [-90, 1], routine: [{ t: 'talk', pos: [-91, 1.5], yaw: Math.PI / 2, group: 'gate', dur: 70 }, { t: 'guard', pos: [-91, 4], yaw: Math.PI / 2, dur: 40 }] });
    N({ group: 'gate', weapon: 'shotgun', pos: [-89, 3], prop: 'cig', routine: [{ t: 'talk', pos: [-89.3, 3.2], yaw: -Math.PI / 2, group: 'gate', dur: 60 }, { t: 'smoke', pos: [-87.5, 6], yaw: Math.PI / 2, dur: 30 }] });
    N({ weapon: 'ak', pos: [-86.5, -2.5], routine: [{ t: 'sit', anchor: 'gate_seat', dur: 50 }, { t: 'patrol', pts: [[-84, -10], [-80, 14], [-86, 0]], wait: 3 }] });
    // towers
    N({ post: 'Tower one', elevated: true, static: true, weapon: 'ak', pos: [t1[0], t1[2]], routine: [{ t: 'guard', pos: [t1[0] - .5, t1[2] - .5], yaw: Math.PI * .75 - Math.PI, look: true }] });
    N({ post: 'Tower two', elevated: true, static: true, weapon: 'ak', pos: [t2[0], t2[2]], routine: [{ t: 'guard', pos: [t2[0] - .5, t2[2] - .5], yaw: -Math.PI * .25, look: true }] });
    N({ post: 'Tower three', elevated: true, static: true, weapon: 'ak', pos: [t3[0], t3[2]], routine: [{ t: 'guard', pos: [t3[0] - .5, t3[2] - .5], yaw: Math.PI * .9, look: true }] });
    // patrols
    N({ weapon: 'ak', pos: [-80, -40], routine: [{ t: 'patrol', pts: [[-80, -40], [-86, 15], [-70, 52], [-45, 72], [-18, 62], [-45, 72], [-70, 52], [-86, 15]], wait: 3, look: true }] });
    N({ weapon: 'ak', pos: [30, -70], routine: [{ t: 'patrol', pts: [[30, -68], [68, -46], [86, 0], [80, 38], [62, 62], [80, 38], [86, 0], [68, -46]], wait: 3, look: true }] });
    N({ weapon: 'smg', pos: [-20, -15], flashlight: true, routine: [{ t: 'patrol', pts: [[-20, -15], [0, -10], [30, 0], [40, 18], [0, 14], [-30, 8], [-40, -20]], wait: 4 }] });
    N({ post: 'Dock', weapon: 'ak', pos: [-35, 80], routine: [{ t: 'patrol', pts: [[-35, 80], [-35, 93], [-20, 76], [8, 79], [8, 95], [8, 79], [-20, 76]], wait: 4, look: true }] });
    // hangar crew
    N({ post: 'Hangar', weapon: 'ak', pos: [52, 22], routine: [{ t: 'guard', pos: [50, 23], yaw: 0, dur: 60 }, { t: 'patrol', pts: [[38, 22], [72, 22], [76, 40], [72, 22]], wait: 2 }] });
    N({ name: 'Nacho', role: 'worker', weapon: 'pistol', group: 'hangar', pos: [40, 51], app: { head: 'cap', vest: false, rolled: true }, routine: [{ t: 'work', anchor: 'hgw_work', dur: 45 }, { t: 'talk', pos: [56, 32], yaw: Math.PI / 2, group: 'hangar', dur: 40 }] });
    N({ name: 'Pablo', role: 'worker', weapon: 'pistol', pos: [69, 30], app: { head: 'cap', vest: false }, routine: [{ t: 'work', anchor: 'hgw2_work', dur: 50 }, { t: 'idle', pos: [52, 36], yaw: 1, anim: 'look', dur: 10 }] });
    N({ name: 'Capitán Ruiz', role: 'worker', weapon: 'pistol', group: 'hangar', pos: [54, 33], app: { head: 'hair', vest: false, glasses: true }, routine: [{ t: 'talk', pos: [54.5, 32], yaw: -Math.PI / 2, group: 'hangar', dur: 50 }, { t: 'sit', anchor: 'hgo_seat', dur: 40 }] });
    // garages & storage
    N({ role: 'worker', weapon: 'pistol', pos: [-34, -57], app: { rolled: true, vest: false, head: 'cap' }, routine: [{ t: 'work', anchor: 'gar2_work' }] });
    N({ weapon: 'ak', pos: [-38, -48], prop: 'cig', routine: [{ t: 'smoke', pos: [-38, -48.5], yaw: Math.PI, dur: 40 }, { t: 'patrol', pts: [[-55, -48], [-28, -48], [-25, -30]], wait: 4 }] });
    N({ role: 'worker', weapon: 'none', pos: [33, -55], app: { vest: false, head: 'bandana' }, routine: [{ t: 'work', anchor: 'lab_work' }] });
    N({ role: 'worker', weapon: 'none', pos: [31, -53], app: { vest: false, head: 'hair' }, routine: [{ t: 'work', anchor: 'lab_work' }] });
    N({ weapon: 'smg', pos: [26, -52], routine: [{ t: 'guard', pos: [26.5, -55], yaw: -Math.PI / 2, dur: 50 }, { t: 'patrol', pts: [[26, -62], [25, -72], [40, -64], [26, -52]], wait: 3 }] });
    // campfire & bungalows
    N({ group: 'fire', weapon: 'ak', pos: [-50, 19.5], routine: [{ t: 'talk', pos: [-49.8, 20.1], yaw: Math.PI * .8, group: 'fire' }] });
    N({ group: 'fire', weapon: 'shotgun', pos: [-46, 18.5], prop: 'cup', routine: [{ t: 'talk', pos: [-46.3, 18.8], yaw: -Math.PI / 2 - .3, group: 'fire' }] });
    N({ group: 'fire', weapon: 'pistol', pos: [-48, 15.9], prop: 'cig', routine: [{ t: 'talk', pos: [-48, 16.1], yaw: 0, group: 'fire' }] });
    N({ weapon: 'ak', pos: [-61, 40], routine: [{ t: 'sit', anchor: 'b1l_seat', dur: 80 }, { t: 'smoke', pos: [-64, 46], yaw: Math.PI, dur: 30 }], prop: 'cig' });
    N({ weapon: 'ak', pos: [-40, 62], routine: [{ t: 'sit', anchor: 'b2_seat' }] });
    N({ weapon: 'smg', pos: [8, 100], routine: [{ t: 'sit', anchor: 'b3_seat', dur: 70 }, { t: 'idle', pos: [8, 98.5], yaw: 0, anim: 'look', dur: 15 }] });
    for (const g of ['gate', 'fire', 'hangar']) G.addGroup(g, pick(TALK.cartel).concat(pick(TALK.cartel)));
    this._led = led;
  },
  start(G) {
    G.introPlane({ center: [0, 0], R: 175, alt: 430, speed: 62, startAng: Math.PI * .9, title: 'SWAMP INFILTRATION', sub: 'OPERATION BLACKWATER', meta: 'ATCHAFALAYA DELTA · 19:42 LOCAL · HALO INSERTION' });
  },
  update(G, dt) {
    const cmd = G.npcs.find(n => n.id === 'commander');
    G.marker = !G.obj('kill').done ? [10, 2, -30] : [166, 2, -126];
    if (G.exHeli && V.dist2(P.pos, G.exHeli.pos) < 14 && G.obj('kill').done) { }
  },
  onKill(G, n) { if (n.id === 'commander') { G.complete('kill'); setTimeout(() => G.notify('TARGET DOWN — MOVE TO EXFIL LZ (EAST)', 'good'), 1500); G.exHeli && (G.exHeli.rotor = .45); } },
  onPickup(G, item) { if (item === 'ledger') G.complete('ledger'); },
  canExtract(G) { return G.obj('kill').done; },
};
