/* ============================ MISSION 05 — BANK RAID ============================ */
const TALK_ROB = [
  [[0, "How long on that drill?"], [1, "Twenty minutes, maybe thirty. The door's thicker than Jackal said."], [0, "Cops are stacking up outside."], [1, "Let them. We have forty reasons they won't come in."]],
  [[0, "Keep the hostages quiet. Nobody plays hero."], [1, "The old guy keeps staring at me."], [0, "Then stop looking at him."]],
  [[0, "Jackal says the tunnel van is ready."], [1, "Good. Once the vault pops, we're gone underground."], [0, "And the hostages?"], [1, "Not my problem."]],
];
const TALK_HOST = [[[0, "Please... my daughter is waiting for me."], [1, "Shh. Don't look at them. Just breathe."]], [[0, "The police are right outside, why aren't they coming?"], [1, "Because of us. We're the reason."]]];
const MIS5 = {
  id: 'm5', code: 'OPERATION VAULT LINE', name: 'BANK RAID', num: '05', location: 'Meridian Federal Bank — Harbour District, downtown', time: '16:40 LOCAL — OVERCAST', weather: 'Overcast · drizzle', difficulty: 5, size: 260, seed: 53, parTime: 1300, ambience: 'city', siren: false, civPayout: true, reward: 11000,
  exits: [[0, -30], [-40, -30], [40, -30]],
  briefing: 'A crew of armed robbers led by a mercenary known as "Jackal" has seized the Meridian Federal Bank with forty employees and customers inside. Police negotiators are stalling. Jackal\'s crew is drilling the basement vault, which holds the evidence ledgers of the network you have been dismantling. Enter from the rear service lot, free the hostages, stop the drill, neutralise Jackal and leave through the maintenance tunnel to the underground car park. Every hostage killed reduces your payment.',
  intel: ['Hostages are held kneeling in the main hall under armed guard. Take down every robber in the hall and they will run for the front doors.', 'Jackal is on the executive floor upstairs with the bank manager. Use the west staircase or the service elevator.', 'The vault drill is running in the basement, reached by the rear stairwell or the elevator.', 'A maintenance tunnel leads east from the basement to the underground car park, where an unmarked SUV is waiting for you.', 'Robbers are jumpy: they will execute hostages if a firefight drags on near them. Work fast and quiet.'],
  objectives: [
    { id: 'insert', text: 'Exit the police van', type: 'hidden' },
    { id: 'hostages', text: 'Free the hostages in the main hall', type: 'primary' },
    { id: 'drill', text: 'Stop the vault drill in the basement', type: 'primary' },
    { id: 'leader', text: 'Neutralise the crew leader "Jackal"', type: 'primary' },
    { id: 'extract', text: 'Escape through the tunnel to the underground car park', type: 'primary' },
    { id: 'nociv', text: 'No hostage casualties', type: 'optional', check: g => !g.stats.civKilled },
    { id: 'ghost', text: 'Remain undetected', type: 'optional', check: g => !g.stats.detected },
    { id: 'usb', text: 'Recover the crew\'s contact drive', type: 'optional' },
  ],
  env: { sunDir: [.25, .8, .35], sunCol: 0xc8ccd4, sunI: .85, sky: 0x9aa4b0, skyI: .85, gnd: 0x5a5a58, gndI: .6, fog: 0x8a929c, fogI: 1, fogD: .007, fogH: 10, expo: 1.05, zen: 0x6a7684, hor: 0xb8bec6, cloud: .95, wet: .6, rain: .25, vis: .8, wind: 1.2, skyFog: .7 },
  build(W, G) {
    const R = W.rng; const FY = 4.15, FY2 = 8.68, BY = .15;
    const H = (x, z) => {
      if (x > -30.5 && x < 30.5 && z > 20.3 && z < 52.5) return 0;   // basement
      if (x > 22.4 && x < 25.6 && z > 20 && z < 22.6) return 0;       // elevator pit
      if (x >= 30 && x < 72.5 && z > 38 && z < 44.5) return 0;        // tunnel
      if (x >= 72 && x < 104.5 && z > 19.5 && z < 60.5) return 0;     // underground car park
      if (x >= 104 && x < 126 && z > 51.5 && z < 60.5) return (x - 104) / 22 * 4; // ramp
      const e = Math.max(Math.abs(x), Math.abs(z)); return 4 + (e > 118 ? (e - 118) * .4 : 0);
    };
    W.initTerrain(H, 1);
    const C = colorTable({ asph: 0x2e2f31, walk: 0x8a8884, conc: 0x5e5c58 });
    W.buildTerrainMesh((x, z, h) => { if (h < 3.9) return { c: C.conc, m: MAT.CONC }; const street = Math.abs(z + 45) < 8 || Math.abs(x + 52) < 8 || Math.abs(x - 55) < 7 || Math.abs(z - 75) < 7; return street ? { c: C.asph, m: MAT.ASPH } : { c: C.walk, m: MAT.CONC }; });
    W.surfFn = () => 'concrete';
    W.pois.push({ p: [0, -2], t: 'MAIN HALL' }, { p: [0, -13], t: 'EXEC FLOOR (UP)' }, { p: [2, 44], t: 'VAULT (BASEMENT)' }, { p: [52, 41], t: 'TUNNEL' }, { p: [88, 40], t: 'CAR PARK / EXFIL' }, { p: [-8, 32], t: 'INSERTION LOT' });
    // streets
    W.road([[-130, -45], [130, -45]], 14, 0x2a2b2d, MAT.ASPH); W.road([[-52, -130], [-52, 130]], 14, 0x2a2b2d, MAT.ASPH); W.road([[-130, 75], [130, 75]], 12, 0x2a2b2d, MAT.ASPH); W.road([[55, -45], [55, 75]], 12, 0x2a2b2d, MAT.ASPH);
    W.D.col(0xe8e4d0, MAT.PAINT); for (let x = -125; x < 125; x += 6) W.D.box(x, 4.05, -45, 3, .01, .15); for (let z = -125; z < 125; z += 6) W.D.box(-52, 4.05, z, .15, .01, 3);
    for (const z of [-50, -40]) for (let x = -12; x < 12; x += 1.2) W.D.col(0xe8e4d0, MAT.PAINT).box(x, 4.05, z === -50 ? -51.5 : -38.5, .6, .01, 2.5);
    // city blocks
    const blocks = [[-90, -90, 50, 50, 38], [-10, -90, 60, 50, 52], [80, -90, 60, 50, 30], [-90, -5, 50, 55, 22], [100, 0, 40, 30, 44], [-90, 100, 50, 40, 26], [10, 102, 60, 36, 34], [100, 100, 40, 40, 60], [-90, 40, 40, 30, 18]];
    blocks.forEach((b, i) => W.facade(b[0], b[1], b[2], b[3], b[4], [0x6a6660, 0x8a8478, 0x4a5058, 0x7a6a5a, 0x5a5e62][i % 5], i + 1));
    for (const [x, z, y] of [[-40, -36, 0], [40, -36, 0], [-62, -20, 1], [-42, 20, 1], [64, -20, 1], [64, 20, 1], [-20, 66, 2], [20, 66, 2]]) W.streetLight(x, z, y * Math.PI / 2 + (x > 0 && y === 1 ? Math.PI : 0), 'street');
    /* ---------- the bank: ground floor ---------- */
    const WALL = 0xc8c4bc, TR = 0x8a8680;
    W.building({ x: 0, z: 0, w: 60, d: 40, h: 4.2, y: FY, wallCol: WALL, wallMat: MAT.CONC, inCol: 0xe4e0d8, trim: TR, floorMat: MAT.TILE, floorCol: 0xb8b4ac, roof: 'none', noCeil: true, lightCol: 0xf0f4ff, lightI: 1.8, lightR: 11, frame: 0x6a6a6a, baseCol: 0x3a3a3a,
      doors: [{ side: 'n', at: 0, w: 3, h: 3, label: 'BANK ENTRANCE', col: 0x9ab0b8, metal: true }, { side: 's', at: -26, label: 'REAR STAIRWELL', metal: true, col: 0x5a5e62 }, { side: 's', at: 24, w: 3, h: 3, open: true, none: true }],
      windows: [-24, -16, -8, 8, 16, 24].map(a => ({ side: 'n', at: a, w: 5, h: 3.2, y0: .3 })).concat([-12, 0, 12].map(a => ({ side: 'w', at: a, w: 2, h: 2, y0: 1 })), [-12, 0].map(a => ({ side: 'e', at: a, w: 2, h: 2, y0: 1 }))),
      parts: [[-30, 8, 30, 8, -14, 1.2, false, { label: 'STAFF CORRIDOR', metal: true, col: 0x6a6e72 }], [-30, 12, 30, 12, -20, 1, false, { label: 'BREAK ROOM' }], [-10, 12, -10, 20, 0, 1, false, { label: 'IT ROOM' }], [6, 12, 6, 20, 0, 1, false, { label: 'RECORDS' }], [20, 12, 20, 20, 0, 1.4, true]],
      rooms: [[-18, -20, 18, 2, 'empty', 'hall'], [-30, 12, -10, 20, 'lounge', 'brk'], [-10, 12, 6, 20, 'server', 'it'], [6, 12, 20, 20, 'storage', 'rec'], [20, 12, 30, 20, 'empty'], [-30, 8, 30, 12, 'empty']] });
    W.glassWall(-18, -20, -18, -6, FY, 4.2, 0); W.glassWall(-30, -6, -18, -6, FY, 4.2, 2); W.glassWall(18, -20, 18, -6, FY, 4.2, 0); W.glassWall(18, -6, 30, -6, FY, 4.2, -2);
    W.slab(-30, -20, 30, 20, FY + 4.35, .15, 0xece8e0, MAT.PAINT, 'concrete', [[-27.4, -.6, -24.6, 6.1]]);
    W.tellerCounter(-14, 14, 3, FY, 'teller');
    for (const [x, z] of [[-26, -15], [-26, -10], [26, -15], [26, -10]]) { W.desk(x, z, FY, 0, true, 'cs'); }
    for (const [x, z] of [[-9, -12], [9, -12]]) { for (let i = 0; i < 3; i++) { W.B.col(0x2a3a4a, MAT.LEATHER).box(x - 1.6 + i * 1.6, FY + .45, z, 1.4, .1, .6).box(x - 1.6 + i * 1.6, FY + .8, z + .28, 1.4, .6, .1); } W.colBox(x, FY + .5, z, 5, 1, .8, { surf: 'wood', sight: false }); }
    W.B.col(0xe8e4dc, MAT.CONC).box(0, FY + .55, -8, 3, 1.1, 1.2); W.colBox(0, FY + .55, -8, 3, 1.1, 1.2, { surf: 'concrete', sight: false }); W.B.col(0xc9a23a, MAT.METAL).box(0, FY + 1.12, -8, 3.05, .04, 1.25);
    W.D.col(0x1a3a6a, MAT.PAINT).box(0, FY + 3.2, 7.88, 6, 1, .04); W.D.col(0xe8e8e0, MAT.EMIT).box(0, FY + 3.2, 7.85, 5, .3, .01);
    for (const [x, z] of [[-17, -19], [17, -19], [-17, 1], [17, 1]]) W.bigPlant(x, z, FY);
    for (const x of [-12, -4, 4, 12]) W.D.col(0xf0f4ff, MAT.EMIT).box(x, FY + 4.15, -8, 1.4, .04, 6);
    W.addItem('ammo', [27, FY + .8, 16], .3).ammo = true;
    // rear lot / parking deck roof over the basement
    W.slab(-30.5, 20.3, 30.5, 52.5, 4.0, .2, 0x5e5c58, MAT.CONC, 'concrete', [[-27.6, 20.3, -24.4, 27.8]]);
    W.D.col(0xe8e4d0, MAT.PAINT); for (let x = -26; x < 30; x += 3) W.D.box(x, 4.01, 46, .1, .01, 5);
    for (const s of [-1, 1]) W.box(-26 + s * 1.7, 4.5, 24, .08, 1, 7.5, 0x3a3a3a, MAT.METAL, { surf: 'metal' }); W.box(-26, 4.5, 27.8, 3.4, 1, .08, 0x3a3a3a, MAT.METAL, { surf: 'metal' });
    W.stairs(-26, 27.6, 'n', 2.6, FY - BY, 7, 0x6a6a66, MAT.CONC, 'concrete', BY);
    /* ---------- executive floor ---------- */
    W.building({ x: 0, z: 0, w: 60, d: 40, h: 3.8, y: FY2, noFound: true, stilts: .0001, wallCol: WALL, inCol: 0xd8d4cc, trim: TR, floorMat: MAT.WOOD, floorCol: 0x4a3a2a, roof: 'flat', roofCol: 0x3a3a3a, lightCol: 0xf0f4ff, lamps: false,
      holes: [[-27.4, -.6, -24.6, 6.1]],
      doors: [{ side: 's', at: 24, w: 3, h: 3, open: true, none: true }],
      windows: [-24, -16, -8, 0, 8, 16, 24].map(a => ({ side: 'n', at: a, w: 4, h: 2.4, y0: .6 })).concat([-16, -6, 6].map(a => ({ side: 's', at: a, w: 3, h: 2, y0: .8 }))),
      parts: [[-30, -6, -10, -6, 0, 1, false, { label: 'EXECUTIVE OFFICE' }], [-10, -6, 10, -6, 0, 1.6, false, { label: 'BOARDROOM', col: 0x2a1a10 }], [10, -6, 30, -6, 0, 1, false, { label: 'DIRECTOR' }], [-10, -20, -10, -6], [10, -20, 10, -6], [-30, 2, 20, 2, 10, 2, true]],
      rooms: [[-30, -20, -10, -6, 'office', 'ex1'], [-10, -20, 10, -6, 'empty', 'board'], [10, -20, 30, -6, 'commander', 'dir'], [-30, 2, 30, 20, 'empty', 'open']] });
    W.table(0, -13, FY2, 7, 2.4, 'board', 8); W.painting(0, FY2 + 2, -19.85, 0, 3, 1.4, 99); W.tv(-9.5, -13, FY2);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const x = -22 + i * 12, z = 8 + j * 7; W.desk(x, z, FY2, 0, true, 'open'); W.B.col(0x6a7078, MAT.CLOTH).box(x, FY2 + .7, z - .55, 3, 1.4, .06); }
    W.addItem('usb', [20.3, FY2 + .81, -15.3], .3);
    /* ---------- basement ---------- */
    W.building({ x: 0, z: 36.4, w: 61, d: 32.2, h: 3.7, y: BY, wallCol: 0x8a8a86, inCol: 0x9a9a96, floorMat: MAT.CONC, floorCol: 0x5a5a58, roof: 'none', noCeil: true, lightCol: 0xe0f0ff, lightI: 1.6, lightR: 9, lamps: false,
      doors: [{ side: 'n', at: 24, w: 3, h: 3, open: true, none: true }, { side: 'e', at: 4.6, label: 'MAINTENANCE TUNNEL', metal: true, col: 0x5a5e62 }],
      parts: [[-10, -16.1, -10, 16.1, -4, 1.1, false, { label: 'MAINTENANCE', metal: true, col: 0x5a5e62 }], [14, -16.1, 14, 16.1, -10, 1, false, { label: 'SECURITY OFFICE', metal: true, col: 0x5a5e62 }], [-10, 3.6, 14, 3.6, 0, 3.6, true], [14, -6.4, 30.5, -6.4, 0, 1, false, { label: 'SERVER ROOM' }], [14, 3.6, 30.5, 3.6, 0, 2, true]],
      rooms: [[-30.5, -16.1, -10, 16.1, 'workshop', 'mnt'], [-10, -16.1, 14, 3.6, 'empty', 'ante'], [-10, 3.6, 14, 16.1, 'empty', 'vault'], [14, -16.1, 30.5, -6.4, 'security', 'bsec'], [14, -6.4, 30.5, 3.6, 'server', 'bsrv'], [14, 3.6, 30.5, 16.1, 'storage', 'bsto']] });
    W.vaultDoor(2, BY, 40, 0, .85);
    for (const x of [-7, 11]) W.depositBoxes(x, 46, BY, 5, 1 + (x > 0 ? 2 : 0) * 0); W.depositBoxes(2, 51.9, BY, 14, 2);
    for (let i = 0; i < 6; i++) { W.pallet(-4 + (i % 3) * 3, 46 + Math.floor(i / 3) * 3, BY); W.B.col(0x3a6a3a, MAT.PAPER || MAT.PAINT).box(-4 + (i % 3) * 3, BY + .45, 46 + Math.floor(i / 3) * 3, 1, .5, .7); }
    for (let i = 0; i < 8; i++) W.B.col(0xd4af37, MAT.METAL).box(4 + (i % 4) * .3, BY + .85, 44.6 + (i / 4 | 0) * .15, .26, .08, .12);
    // drill rig (objective)
    const dr = { x: 2.4, y: BY + 1.2, z: 38.6 }; W.B.col(0x2a2c2e, MAT.METAL).box(dr.x, BY + .6, dr.z, .6, 1.2, .6).box(dr.x, BY + 1.2, dr.z + .4, .3, .3, 1.2); W.B.col(0xd0a020, MAT.PAINT).box(dr.x, BY + 1.2, dr.z + .4, .32, .32, .5); W.colBox(dr.x, BY + .7, dr.z, .7, 1.4, .8, { surf: 'metal' });
    this._drill = dr; this._drillOn = true;
    W.interact.push({ r: 2, wide: true, pos: [dr.x, dr.y, dr.z], hold: 3, anim: 'hotwire', label: () => this._drillOn ? '[E] SABOTAGE THE VAULT DRILL (HOLD)' : '', enabled: () => this._drillOn, act: () => { this._drillOn = false; G.complete('drill'); AUD.explosion([dr.x, dr.y, dr.z]); G.sparks([dr.x, dr.y, dr.z]); if (this._drillSnd) this._drillSnd.setOn(false); const n = G.npcs.find(x => !x.dead && x.def.drillOp); if (n && n.state === 'calm') { n.say('The drill just died! Check it!'); n.setSuspicious([dr.x, 0, dr.z], false); } } });
    W.pipes(-30, 22, -10, 22, 3.3, 4); W.pipes(-28, 21, -28, 51, 3.1, 3); W.pipes(14.5, 21, 30, 21, 3.3, 2);
    W.box(-20, BY + 1.2, 48, 3, 2.4, 2, 0x8a3a1a, MAT.RUST, { surf: 'metal' }); W.B.col(0x2a2a2a, MAT.METAL).cyl(-20, BY + 2.4, 48, .3, .3, 1.2, 10); W.sounds.push({ kind: 'hum', pos: [-20, 1.5, 48], f: 60, vol: .25 });
    for (let i = 0; i < 4; i++) W.box(-29.5, BY + 1.2, 30 + i * 4, .6, 2.4, 1.4, 0x5a5e58, MAT.METAL, { surf: 'metal' });
    /* ---------- tunnel & underground car park ---------- */
    W.building({ x: 51.25, z: 41, w: 41.5, d: 5, h: 3.4, y: BY, wallCol: 0x6a6a66, inCol: 0x7a7a76, floorMat: MAT.CONC, floorCol: 0x4a4a48, roof: 'none', lightCol: 0xd0ffd0, lightI: 1.2, lightR: 8, lamps: false,
      doors: [{ side: 'w', at: 0, w: 2, h: 2.6, open: true, none: true }, { side: 'e', at: 0, w: 2.4, h: 2.8, open: true, none: true }], rooms: [[-20.75, -2.5, -7, 2.5, 'empty'], [-7, -2.5, 7, 2.5, 'empty'], [7, -2.5, 20.75, 2.5, 'empty']] });
    W.slab(30.5, 38, 72.5, 44.5, 4.0, .4, 0x8a8884, MAT.CONC, 'concrete'); W.pipes(31, 39, 72, 39, 3.2, 3);
    W.building({ x: 88.25, z: 40, w: 32.5, d: 41, h: 3.6, y: BY, wallCol: 0x7a7a76, inCol: 0x8a8a86, floorMat: MAT.CONC, floorCol: 0x4a4a48, roof: 'none', lightCol: 0xe8f0ff, lightI: 1.6, lightR: 12, lamps: false,
      doors: [{ side: 'w', at: 1, w: 2.4, h: 2.8, open: true, none: true }, { side: 'e', at: 16, w: 7, h: 3.2, open: true, none: true }], rooms: [[-16.25, -20.5, 16.25, 20.5, 'empty']] });
    W.slab(72, 19.5, 104.5, 60.5, 4.0, .2, 0x5e5c58, MAT.CONC, 'concrete', [[103.5, 51.5, 105, 60.5]]);
    for (let x = 78; x < 104; x += 6) for (const z of [28, 40, 52]) W.box(x, 2.1, z, .6, 3.8, .6, 0x8a8a86, MAT.CONC, { surf: 'concrete' });
    G.addVehicle('sedan', 80, 24, 0, { hotwire: true, color: 0x8a1a1a }); G.addVehicle('sedan', 86, 24, 0, { hotwire: true, color: 0x2a3a5a }); G.addVehicle('suv', 98, 24, 0, { color: 0x1a1a1a, name: 'SUV' });
    const esc = G.addVehicle('suv', 90, 44, -Math.PI / 2, { color: 0x111114, name: 'EXFIL SUV', drivable: false }); this._esc = esc;
    W.interact.push({ r: 3, wide: true, pos: () => M4.pt(esc.m, -1.1, 1.2, 0), label: () => P.state !== 'ground' ? '' : this.canExtract(G) ? '[E] GET IN THE EXFIL SUV' : 'EXFIL SUV — COMPLETE PRIMARY OBJECTIVES FIRST', anim: 'door', dur: .7, at: .45, act: () => { if (this.canExtract(G)) this.extract(G); } });
    /* ---------- police perimeter outside ---------- */
    for (const [x, z, y] of [[-10, -40, .2], [6, -42, -.3], [22, -40, .1], [-60, -12, 1.4]]) { const v = G.addVehicle('sedan', x, z, y, { color: 0xe8e8e8, hotwire: true, name: 'POLICE CRUISER' }); W.B.col(0x111111, MAT.PLASTIC); G.policeLights = (G.policeLights || []).concat([{ v, t: Math.random() * 3 }]); }
    for (let i = 0; i < 6; i++) W.barrier(-15 + i * 6, -33, 0);
    W.B.col(0x1a2a5a, MAT.PAINT).box(-30, 5.3, -36, 2.4, 2.6, 5.5); W.colBox(-30, 5.3, -36, 2.4, 2.6, 5.5, { surf: 'metal' }); W.B.col(0xe8e8e8, MAT.PAINT).box(-30, 5.6, -36, 2.42, .3, 5.52);
    G.extraUpdaters.push(dt => { for (const pl of G.policeLights) { pl.t += dt; const v = pl.v; if (!v.lbar) { v.lbar = [W.light([0, 0, 0], [1, .1, .1], 3, 14, { glow: .4 }), W.light([0, 0, 0], [.1, .2, 1], 3, 14, { glow: .4 })]; } const ph = Math.floor(pl.t * 6) % 2; const p = M4.pt(v.m, 0, 1.6, .2); v.lbar[0].pos = V.add(p, [0, .05, 0]); v.lbar[1].pos = V.add(p, [0, .05, 0]); v.lbar[0].on = ph === 0; v.lbar[1].on = ph === 1; } });
    /* ---------- elevator ---------- */
    G.addElevator({ x: 24, z: 21.3, floors: [BY, FY, FY2], dirs: ['s', 'n', 'n'], names: ['BASEMENT', 'GROUND FLOOR', 'EXECUTIVE FLOOR'], start: 1, label: 'SERVICE ELEVATOR' });
    /* ---------- cameras (robbers watch the feeds) ---------- */
    G.addCam([-17.7, FY + 3.8, -19.6], -Math.PI * .75, .6, true).label = 'CAM 1 — MAIN HALL'; G.addCam([29.6, BY + 3.3, 20.8], Math.PI * .8, .6, true).label = 'CAM 2 — BASEMENT';
    G.addSecurityConsole([22, BY + 1.1, 22.1]);
    /* ---------- people ---------- */
    const N = d => G.addNPC(d); const rob = d => N(Object.assign({ faction: 'robber' }, d)); const host = d => N(Object.assign({ faction: 'bank', role: 'worker', weapon: 'none', kneel: true }, d));
    // main hall hostages + guards
    for (let i = 0; i < 12; i++) { const x = -7 + (i % 6) * 2.6, z = -4 + Math.floor(i / 6) * 2.4; host({ group: i < 6 ? 'h1' : 'h2', zone: 'hall', pos: [x, z], routine: [{ t: 'kneel', pos: [x, z], yaw: Math.PI + rnd(-.4, .4) }] }); }
    rob({ zone: 'hall', group: 'r1', pos: [-11, -6], weapon: 'ak', routine: [{ t: 'patrol', pts: [[-11, -6], [11, -6], [11, 0], [-11, 0]], wait: 4, look: true }] });
    rob({ zone: 'hall', pos: [0, -10], weapon: 'shotgun', routine: [{ t: 'guard', pos: [0, -10.5], yaw: 0 }] });
    rob({ zone: 'hall', group: 'r2', pos: [-3, -17], weapon: 'rifle', routine: [{ t: 'talk', pos: [-3, -17], yaw: -Math.PI / 2, group: 'r2', dur: 50 }, { t: 'guard', pos: [-2, -18], yaw: Math.PI }] });
    rob({ zone: 'hall', group: 'r2', pos: [-1, -17], weapon: 'smg', routine: [{ t: 'talk', pos: [-1.2, -17], yaw: Math.PI / 2, group: 'r2' }] });
    rob({ zone: 'hall', pos: [8, 5], weapon: 'pistol', prop: 'phone', routine: [{ t: 'idle', pos: [8, 5.5], yaw: Math.PI, anim: 'phone', dur: 40 }, { t: 'patrol', pts: [[-12, 5.5], [12, 5.5]], wait: 3 }] });
    rob({ pos: [-24, -12], weapon: 'smg', routine: [{ t: 'patrol', pts: [[-24, -12], [-24, 3], [-14, 10], [14, 10], [26, 3], [26, -12]], wait: 4 }] });
    rob({ post: 'Rear', pos: [-26, 18], weapon: 'ak', prop: 'cig', routine: [{ t: 'smoke', pos: [-24, 16], yaw: -Math.PI / 2, dur: 60 }, { t: 'patrol', pts: [[-24, 16], [22, 16], [22, 10], [-24, 10]], wait: 3 }] });
    rob({ pos: [-20, 15], weapon: 'rifle', routine: [{ t: 'sit', anchor: 'brk_seat' }] });
    // executive floor
    rob({ id: 'leader', name: 'Jackal', role: 'commander', radioOp: true, y: FY2, direct: true, weapon: 'rifleL', hp: 160, app: { head: 'none', hairStyle: 'buzz', beard: 'full', vest: 'plate', top: 'combat', topCol: 0x222428, eyewear: 'sunglasses' }, pos: [3, -11],
      routine: [{ t: 'idle', direct: true, pos: [3, -10.5], yaw: Math.PI, anim: 'phone', dur: 30 }, { t: 'patrol', direct: true, pts: [[4, -9], [-6, -9], [-6, -16], [4, -16]], wait: 5 }, { t: 'idle', direct: true, pos: [0, -17], yaw: 0, anim: 'look', dur: 20 }] });
    host({ y: FY2, pos: [-4, -12], routine: [{ t: 'kneel', pos: [-4, -12.2], yaw: Math.PI }], app: { top: 'suit', topCol: 0x2a2a30 } }); host({ y: FY2, pos: [-5.5, -12], routine: [{ t: 'kneel', pos: [-5.6, -12.4], yaw: Math.PI }] });
    rob({ y: FY2, direct: true, pos: [0, -3], weapon: 'smg', routine: [{ t: 'patrol', direct: true, pts: [[-22, -3], [22, -3]], wait: 6, look: true }] });
    rob({ y: FY2, direct: true, pos: [-20, 10], weapon: 'ak', routine: [{ t: 'patrol', direct: true, pts: [[-20, 10], [18, 10], [18, 16], [-20, 16]], wait: 5 }] });
    rob({ y: FY2, direct: true, static: true, pos: [6, -5], weapon: 'shotgun', routine: [{ t: 'guard', direct: true, pos: [6.5, -5], yaw: Math.PI }] });
    // basement
    rob({ drillOp: true, pos: [3, 37], weapon: 'pistol', app: { gloves: true }, routine: [{ t: 'work', pos: [3.4, 37.3], yaw: Math.PI }] });
    rob({ group: 'r3', pos: [-4, 33], weapon: 'ak', routine: [{ t: 'talk', pos: [-4, 33], yaw: -Math.PI / 2, group: 'r3' }] }); rob({ group: 'r3', pos: [-2, 33], weapon: 'rifle', routine: [{ t: 'talk', pos: [-2.2, 33], yaw: Math.PI / 2, group: 'r3', dur: 60 }, { t: 'patrol', pts: [[-2, 33], [-20, 28], [-20, 46], [-2, 33]], wait: 4 }] });
    rob({ pos: [22, 25], weapon: 'smg', role: 'worker', camOp: true, routine: [{ t: 'sit', anchor: 'bsec_seat' }] });
    rob({ post: 'Tunnel', pos: [50, 41], weapon: 'ak', routine: [{ t: 'patrol', pts: [[34, 41], [70, 41]], wait: 5, look: true }] });
    rob({ pos: [90, 36], weapon: 'shotgun', prop: 'cig', routine: [{ t: 'smoke', pos: [92, 38], yaw: 0, dur: 60 }, { t: 'patrol', pts: [[78, 34], [100, 34], [100, 48], [78, 48]], wait: 4 }] });
    for (let i = 0; i < 3; i++) host({ pos: [-6 + i * 1.6, 30], routine: [{ t: 'kneel', pos: [-6 + i * 1.6, 30.2], yaw: Math.PI }] });
    for (const g of ['r1', 'r2', 'r3']) G.addGroup(g, pick(TALK_ROB).concat(pick(TALK_ROB))); for (const g of ['h1', 'h2']) G.addGroup(g, pick(TALK_HOST));
    G.civTotal = G.npcs.filter(n => n.civ).length;
  },
  start(G) {
    const v = G.introRoad({ path: [[-52, -120], [-52, -60], [-50, 20], [-36, 34], [-14, 34]], yFn: () => 4, kind: 'truck', color: 0x1a2236, name: 'POLICE TACTICAL VAN', driverFaction: 'pmc', title: 'BANK RAID', sub: 'OPERATION VAULT LINE', meta: 'MERIDIAN FEDERAL BANK · 16:40 LOCAL · HOSTAGE RESCUE', cineLen: 9, exitLabel: 'STEP OUT OF THE VAN',
      hint: 'Hostage situation. Enter through the rear stairwell or the service elevator. Avoid getting hostages killed.',
      shots: (t, v) => t < 3.2 ? [[-60 + t * 8, 40, -80], [0, 6, 0]] : t < 6.2 ? [V.add(v.pos, [12, 3, -6]), V.add(v.pos, [0, 1.5, 0])] : [[-6, 6, 26], V.add(v.pos, [0, 1.5, 0])] });
    if (AUD.ready && !this._drillSnd) this._drillSnd = AUD.humAt([this._drill.x, 1.2, this._drill.z], 160, .4);
  },
  update(G, dt) {
    if (this._drillOn && !this._drillSnd && AUD.ready) this._drillSnd = AUD.humAt([this._drill.x, 1.2, this._drill.z], 160, .4);
    if (this._drillOn && Math.random() < dt * 8) G.sparks([this._drill.x, this._drill.y, this._drill.z + 1]);
    // hall freed when every robber assigned to the hall is down
    if (!G.obj('hostages').done && !G.npcs.some(n => !n.dead && !n.civ && n.def.zone === 'hall')) {
      G.complete('hostages'); for (const n of G.npcs) if (n.civ && !n.dead && n.def.zone === 'hall') { n.def.kneel = false; n.panic([0, 0, 8], false); G.after(() => { if (!n.dead) n.say(pick(['Thank you! Thank you!', 'Go, go, go!', 'Run!'])); }, 500 + Math.random() * 2000); }
    }
    // robbers threaten hostages in a prolonged firefight nearby
    if (G.alarm >= 2 && !G.obj('hostages').done) { this._exec = (this._exec || 0) + dt; if (this._exec > 25) { this._exec = 0; const r = G.npcs.find(n => !n.dead && !n.civ && n.def.zone === 'hall' && n.state === 'combat'); const h = G.npcs.find(n => !n.dead && n.civ && n.def.zone === 'hall'); if (r && h) { r.say('You want to play? Then somebody dies!'); AUD.shot('npcPistol', r.pos); G.killNPC(h, r.pos, 'head', 'execution'); } } }
    G.marker = !G.obj('hostages').done ? [0, 6, -2] : !G.obj('drill').done ? [this._drill.x, 2, this._drill.z] : !G.obj('leader').done ? [3, 10, -11] : [90, 2, 44];
  },
  onKill(G, n) { if (n.id === 'leader') { G.complete('leader'); G.notify('JACKAL NEUTRALISED', 'good'); } },
  onPickup(G, item) { if (item === 'usb') G.complete('usb'); },
  canExtract(G) { return G.obj('leader').done && G.obj('drill').done && G.obj('hostages').done; },
  extract(G) { G.extractTruck(this._esc, [[90, 44], [100, 44], [100, 56], [104, 56], [126, 56], [128, 30], [128, -40]]); },
};
MISSIONS.push(MIS5);
