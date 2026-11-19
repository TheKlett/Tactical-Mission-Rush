/* ============================ MISSION 04 — THE MANSION ============================ */
const TALK_PARTY = [
  [[0, "The Count has outdone himself. Is that a real Vermeer?"], [1, "Real, stolen, does it matter at this altitude?"], [0, "Ha! Careful. His security has ears everywhere."], [1, "Then let them hear how dreadful the canapés are."]],
  [[0, "Did you see the Countess? She hasn't spoken to him all night."], [1, "Rumour says the money isn't his anymore."], [0, "Then whose is it?"], [1, "People you do not ask questions about, darling."]],
  [[0, "Another glass? The '96 is exquisite."], [1, "One more and I'll be dancing with the bodyguards."], [0, "I'd pay to see that."], [1, "Everyone here pays for something."]],
  [[0, "Valmont keeps disappearing upstairs."], [1, "Business. He takes calls in his study at midnight."], [0, "Business at a party. How vulgar."], [1, "How profitable."]],
];
const TALK_SEC = [[[0, "Quiet night so far. Too many drunk ambassadors."], [1, "Keep an eye on the catering staff. New faces tonight."], [0, "The delivery van came in through the garage at nine."], [1, "Check their manifest. The Count is paranoid."]], [[0, "Monitors are clean?"], [1, "Garden camera keeps fogging up. Otherwise clear."], [0, "Nobody goes upstairs without his say-so."]]];
const MIS4 = {
  id: 'm4', code: 'OPERATION GILDED CAGE', name: 'THE MANSION', num: '04', location: 'Villa Valmont — Lake Como hills, private estate', time: '23:10 LOCAL — NIGHT', weather: 'Clear · warm · still', difficulty: 4, size: 300, seed: 41, parTime: 1200, ambience: 'party', siren: false, social: true, defaultZone: 'public', civPayout: true, reward: 9000,
  briefing: 'Count Aurelio Valmont launders the money behind every operation you have disrupted so far. Tonight he hosts a private gala for two hundred guests at his lakeside villa. You will ride in with the catering delivery through the underground garage, disguised as staff. Blend in, locate Valmont and eliminate him, then leave the way you came. The guests are innocent — every civilian death reduces your payment.',
  intel: ['You are wearing a catering uniform. With your weapon holstered (press your weapon\'s slot key again) you can walk among guests and staff without raising suspicion.', 'Drawing a weapon, crouching or sprinting in public, or entering restricted areas (upstairs, security room) will draw attention. Guards will first warn you to leave.', 'Valmont alternates between the ballroom, the bar and his private study upstairs. If an alarm sounds downstairs he will run for his limousine in the forecourt — if he reaches it, he escapes.', 'A security operator watches the camera network from the east wing. Disable the network at his console, or keep him busy.', 'Valmont keeps blackmail files in his study.'],
  objectives: [
    { id: 'insert', text: 'Exit the delivery truck', type: 'hidden' },
    { id: 'count', text: 'Eliminate Count Aurelio Valmont', type: 'primary' },
    { id: 'extract', text: 'Escape in the delivery truck in the garage', type: 'primary' },
    { id: 'nociv', text: 'No civilian casualties', type: 'optional', check: g => !g.stats.civKilled },
    { id: 'ghost', text: 'Remain undetected', type: 'optional', check: g => !g.stats.detected },
    { id: 'cams', text: 'Disable the security camera network', type: 'optional' },
    { id: 'evidence', text: 'Recover Valmont\'s blackmail files', type: 'optional' },
  ],
  playerApp: { top: 'waiter', bottom: 'slacks', feet: 'shoes', head: 'none', hairStyle: 'slick', gloves: false, vest: 'none', camo: false, topCol: 0xeeeeea, botCol: 0x111114 }, armSleeve: 0xeeeeea, armGlove: 0xd8b090,
  exits: [[-2, -40], [60, 0], [0, 70]], musicPos: [-37, 6.5, -2],
  env: { sunDir: [-.3, .7, .4], sunCol: 0x8090c0, sunI: .28, sky: 0x1a2236, skyI: .4, gnd: 0x141210, gndI: .35, fog: 0x141a26, fogI: 1, fogD: .006, fogH: 6, expo: 1.3, zen: 0x05070e, hor: 0x1a2030, cloud: .3, night: 1, vis: .4, wind: .5, skyFog: .5 },
  build(W, G) {
    const R = W.rng; const FY = 4.65, FY2 = 9.05;
    const H = (x, z) => {
      if (x > 49.5 && x < 79.5 && z > -12 && z < 18) return 0;            // garage
      if (x >= 79.5 && x < 140 && z > -70 && z < 70) return 0;            // service yard
      if (x > -86 && x < 79.5 && z > -82 && z < 86) return 4.5;           // estate
      if (Math.abs(x) < 6 && z <= -82) return 4.5;                        // driveway
      const e = Math.max(0, Math.hypot(Math.max(0, Math.abs(x) - 80), Math.max(0, Math.abs(z - 2) - 84)));
      return (x > 79 ? 0 : 4.5) + e * .12 + fbm(x * .03, z * .03) * 6 * Math.min(1, e / 20);
    };
    W.initTerrain(H, 2);
    const C = colorTable({ lawn: 0x2e4a24, lawn2: 0x355428, stone: 0x8a847a, asph: 0x2a2a2c, hill: 0x2a3a22 });
    W.buildTerrainMesh((x, z, h, n) => { if (h < .5 && x > 70) return { c: C.asph, m: MAT.ASPH }; if (Math.abs(x) < 7 && z < -12) return { c: C.stone, m: MAT.CONC }; if (z > -40 && z < -12 && Math.abs(x) < 40) return { c: C.stone, m: MAT.CONC }; if (z > 28 && z < 35 && Math.abs(x) < 42) return { c: C.stone, m: MAT.TILE }; if (n[1] < .8) return { c: C.hill, m: MAT.ROCK }; return { c: vnoise(x * .2, z * .2) > .5 ? C.lawn : C.lawn2, m: MAT.GRASS }; });
    W.surfFn = (x, z) => x > 70 ? 'asphalt' : (Math.abs(x) < 7 && z < -12) || (z > -40 && z < -12 && Math.abs(x) < 40) || (z > 28 && z < 35) ? 'concrete' : 'grass';
    W.pois.push({ p: [0, 8], t: 'VILLA' }, { p: [-24, 0], t: 'BALLROOM' }, { p: [32, -4], t: 'STUDY (UPSTAIRS)' }, { p: [35, -6], t: 'SECURITY' }, { p: [64, 3], t: 'GARAGE' }, { p: [0, 46], t: 'POOL' }, { p: [-8, -32], t: 'LIMOUSINE' });
    const STUCCO = 0xe4dccc, TRIM = 0xb8ac94, SLATE = 0x2e3036;
    /* ---------- underground garage ---------- */
    W.building({ x: 64.5, z: 3, w: 30, d: 30, h: 4.3, y: .15, wallCol: 0x8a8a86, inCol: 0x9a9a96, floorMat: MAT.CONC, floorCol: 0x5a5a58, roof: 'none', noCeil: true, lightI: 2, lightR: 14, lightCol: 0xe8f0ff,
      doors: [{ side: 'e', at: 0, w: 8, h: 3.8, open: true, none: true }, { side: 'w', at: 10, label: 'SERVICE DOOR', metal: true, col: 0x5a5e62 }], rooms: [[-15, -15, 15, 15, 'empty']], lamps: false });
    W.slab(49.5, -12, 79.5, 18, 4.75, .3, 0x6a6862, MAT.CONC, 'concrete', [[50.2, 9, 54, 17.3]]);
    W.stairs(52.1, 17, 'n', 1.6, 4.6, 7.5, 0x6a6a66, MAT.CONC, 'concrete', .15);
    for (const s of [-1, 1]) W.box(52.1 + s * 1.95, 5.3, 13.1, .1, 1, 8.2, 0x2a2a2a, MAT.METAL, { surf: 'metal' }); W.box(52.1, 5.3, 17.3, 3.8, 1, .1, 0x2a2a2a, MAT.METAL, { surf: 'metal' });
    W.B.col(0x2a2c30, MAT.METAL).box(52.1, 7.3, 13.1, 4.4, .1, 8.6); for (const [a, b] of [[50, 9], [54.2, 9], [50, 17.3], [54.2, 17.3]]) W.box(a, 6, b, .12, 2.6, .12, 0x2a2a2a, MAT.METAL, { surf: 'metal' });
    for (let x = 56; x < 79; x += 6) for (const z of [-6, 12]) { W.box(x, 2.4, z, .5, 4.5, .5, 0x8a8a86, MAT.CONC, { surf: 'concrete' }); }
    W.D.col(0xd8c040, MAT.PAINT); for (let x = 54; x < 78; x += 3.2) { W.D.box(x, .16, -9, .1, .01, 5).box(x, .16, 15, .1, .01, 5); }
    for (let i = 0; i < 5; i++) W.crate(76 - (i % 2), 16 - i * 1.1, .15, .9, .8, .9, 0x7a6a4a, i % 2 === 0); W.pallet(73, 16, .15);
    W.pipes(50, 17, 79, 17, 4, 3); W.box(77, 1, -11, 2, 2, .8, 0x3a6a3a, MAT.PAINT, { surf: 'metal' });
    // retaining wall + service yard
    W.box(79.8, 2.25, -36, .6, 4.5, 48, 0x8a8478, MAT.CONC, { surf: 'concrete' }); W.box(79.8, 2.25, 44, .6, 4.5, 52, 0x8a8478, MAT.CONC, { surf: 'concrete' });
    W.fence(80, -60, 80, -12, 'concrete', 1.2); W.fence(80, 18, 80, 70, 'concrete', 1.2);
    W.road([[150, -120], [118, -48], [96, 0], [80, 3]], 7, 0x2a2a2c, MAT.ASPH);
    for (let i = 0; i < 3; i++) W.box(96 + i * 2.4, 1, 26, 2, 2, 1.6, [0x2a4a2a, 0x3a3a6a, 0x5a3a2a][i], MAT.PAINT, { surf: 'metal' });
    for (const [x, z] of [[100, -20], [100, 25], [125, 0]]) W.streetLight(x, z, Math.PI / 2, 'power');
    /* ---------- the villa: ground floor ---------- */
    const gd = W.building({ x: 0, z: 8, w: 80, d: 40, h: 4.2, y: FY, wallCol: STUCCO, inCol: 0xe8e0cc, trim: TRIM, floorMat: MAT.TILE, floorCol: 0xd8d0c0, roof: 'none', noCeil: true, ceilCol: 0xf0ece4, lightCol: 0xffe8c0, frame: 0x3a2a1a, baseCol: 0x2a1e14,
      doors: [{ side: 'n', at: 0, w: 2.4, h: 2.8, label: 'MAIN ENTRANCE', col: 0x3a2214 }, { side: 's', at: 0, w: 2.4, h: 2.8, label: 'GARDEN DOORS', col: 0xd8d0c0 }, { side: 's', at: -30, w: 2, h: 2.6, label: 'TERRACE DOORS', col: 0xd8d0c0 }, { side: 's', at: -18, w: 2, h: 2.6, label: 'TERRACE DOORS', col: 0xd8d0c0 }, { side: 'e', at: 10, label: 'KITCHEN SERVICE DOOR', col: 0x6a6a66, metal: true }],
      windows: [-34, -27, -20, -13, 14, 20, 34].map(a => ({ side: 'n', at: a, w: 1.6, h: 2.3, y0: .8 })).concat([-36, -24, -12, 12, 20, 28, 36].map(a => ({ side: 's', at: a, w: 1.6, h: 2.3, y0: .8 })), [-14, -6, 6, 14].map(a => ({ side: 'w', at: a, w: 1.6, h: 2.3, y0: .8 })), [{ side: 'e', at: -15, w: 1.4, h: 1.4, y0: 1.2 }, { side: 'e', at: -9, w: 1.4, h: 1.4, y0: 1.2 }]),
      parts: [[-8, -20, -8, 8, -4, 3, true], [-8, 8, -8, 20, 0, 2.4, true], [8, -20, 8, -4, 0, 1.4, false, { label: 'LIBRARY' }], [8, -4, 8, 0, 0, 3, true], [8, 0, 8, 20, 0, 1.2, false, { label: 'STAFF ROOM' }], [-40, 8, -8, 8, 0, 4, true],
        [8, -4, 24, -4, 0, 1.2, false, { label: 'LIBRARY' }], [24, -4, 30, -4, 0, .9, false, { label: 'STORAGE' }], [30, -4, 40, -4, 0, .95, false, { label: 'SECURITY', metal: true, col: 0x4a4e52 }], [24, -20, 24, -4], [30, -20, 30, -4], [8, 0, 24, 0, 0, 1.2, false, { label: 'STAFF ROOM' }], [24, 0, 40, 0, 0, 2, true], [24, 0, 24, 20, 0, 1.2, false, { label: 'KITCHEN' }]],
      rooms: [[-40, -20, -8, 8, 'empty', 'ball'], [-40, 8, -8, 20, 'empty', 'din'], [-8, -20, 8, 20, 'empty', 'foy'], [8, -20, 24, -4, 'lounge', 'lib'], [24, -20, 30, -4, 'storage', 'sto'], [30, -20, 40, -4, 'security', 'sec'], [8, 0, 24, 20, 'lounge', 'staff'], [24, 0, 40, 20, 'kitchen', 'kit'], [8, -4, 40, 0, 'empty']] });
    // west wing ceiling + roof with balustrade
    W.slab(-40, -12, -8, 28, FY + 4.4, .22, 0xf0ece4, MAT.PAINT, 'concrete'); W.B.col(SLATE, MAT.CONC).box(-24, FY + 4.55, 8, 32.6, .1, 40.6);
    for (let x = -40; x <= -8; x += .6) { W.B.col(0xe8e0d0, MAT.CONC).cyl(x, FY + 4.6, -12.2, .08, .08, .7, 6).cyl(x, FY + 4.6, 28.2, .08, .08, .7, 6); } W.B.col(0xe8e0d0, MAT.CONC).box(-24, FY + 5.32, -12.2, 32.4, .1, .3).box(-24, FY + 5.32, 28.2, 32.4, .1, .3);
    // portico
    for (const x of [-4, -1.5, 1.5, 4]) { W.B.col(0xece6da, MAT.CONC).cyl(x, FY, -14.5, .32, .28, 5.4, 14); W.colBox(x, FY + 2.7, -14.5, .6, 5.4, .6, { surf: 'concrete' }); } W.box(0, FY + 5.6, -14, 10, .5, 4, 0xe8e0d0, MAT.CONC, { c: false }); W.B.col(0xe8e0d0, MAT.CONC).prism(0, FY + 5.85, -14.5, 10.4, 1.4, 4.4);
    W.slab(-6, -17, 6, -12.2, FY - .05, .3, 0xd8d0c0, MAT.TILE, 'concrete'); for (let i = 0; i < 2; i++) W.box(0, 4.55 + i * .03, -17.3 - i * .4, 10, .1, .4, 0xd0c8b8, MAT.CONC, { walk: true });
    /* ---------- upper floor ---------- */
    W.building({ x: 16, z: 8, w: 48, d: 40, h: 3.8, y: FY2, noFound: true, wallCol: STUCCO, inCol: 0xd8ccb4, trim: TRIM, floorMat: MAT.WOOD, floorCol: 0x5a3a24, roof: 'gable', roofCol: SLATE, roofMat: MAT.CONC, rh: 3.2, lightCol: 0xffe0b0, frame: 0x3a2a1a, baseCol: 0x2a1e14, lamps: false,
      holes: [[-8, -12, 8, 2], [-1.7, 2, 1.7, 8.7]],
      windows: [12, 20, 28, 36].map(a => ({ side: 'n', at: a - 16, w: 1.4, h: 2, y0: .8 })).concat([12, 20, 28, 36].map(a => ({ side: 's', at: a - 16, w: 1.4, h: 2, y0: .8 })), [{ side: 'e', at: -10, w: 1.4, h: 2, y0: .8 }, { side: 'e', at: 12, w: 1.4, h: 2, y0: .8 }], [{ side: 'n', at: -16, w: 3, h: 2.6, y0: .5 }, { side: 'w', at: -12, w: 3, h: 2.6, y0: .5 }]),
      parts: [[-8, -20, -8, -4], [-8, 4, -8, 20, 0, 1, false, { label: 'GUEST SUITE' }], [-8, -4, 8, -4, 0, 1, false, { label: 'OFFICE' }], [8, -4, 24, -4, 0, 1.1, false, { label: 'PRIVATE STUDY', col: 0x2a1a10 }], [8, 4, 24, 4, 0, 1.1, false, { label: 'MASTER SUITE' }], [-8, 4, 8, 4], [8, -20, 8, -4], [8, 4, 8, 20]],
      rooms: [[8, -20, 24, -4, 'commander', 'study'], [-8, -20, 8, -4, 'office', 'uoff'], [8, 4, 24, 20, 'bedroom', 'mbed'], [-8, 4, 8, 20, 'bedroom', 'gbed'], [-8, -4, 24, 4, 'empty', 'cor'], [-24, -6, -8, 20, 'empty', 'gal']] });
    W.stairs(0, 2.1, 's', 3.2, FY2 - FY, 6.5, 0xece6dc, MAT.TILE, 'concrete', FY);
    W.B.col(0x8a1a1a, MAT.CLOTH).box(0, FY + .02, -2, 3, .02, 8);
    // gallery railings
    for (const [a, b] of [[-8, -1.7], [1.7, 8]]) { W.box((a + b) / 2, FY2 + .5, 2, b - a, 1, .08, 0xc9a23a, MAT.METAL, { surf: 'metal', sight: false, bullet: false }); for (let x = a; x <= b; x += .3) W.D.col(0xc9a23a, MAT.METAL).cyl(x, FY2, 2, .015, .015, 1, 5); }
    for (const s of [-1, 1]) W.box(s * 1.75, FY2 + .5, 5.4, .08, 1, 6.6, 0xc9a23a, MAT.METAL, { surf: 'metal', sight: false, bullet: false });
    /* ---------- interiors: ballroom ---------- */
    const D = W.D;
    D.col(0x1a1a1a, MAT.TILE).box(-24, FY + .015, 0, 12, .01, 10); D.col(0xf0ece4, MAT.TILE); for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) if ((i + j) % 2 === 0) D.box(-29 + i * 2, FY + .02, -4 + j * 2, 2, .01, 2);
    W.box(-37.5, FY + .2, -2, 5, .4, 9, 0x3a2214, MAT.WOOD, { walk: true, surf: 'wood' }); W.piano(-37.5, -4, FY + .4, 1); for (const z of [0, 2]) { D.col(0x111111, MAT.METAL).cyl(-36, FY + .4, z, .015, .015, 1.5, 5); }
    D.col(0x6a1010, MAT.CLOTH).box(-39.85, FY + 2.2, -2, .05, 4, 9);
    W.barCounter(-36, -10, -27, -9.2, FY, 'bar'); W.barShelves(-31.5, -11.7, FY, 8, 0);
    for (const [x, z] of [[-24, -6], [-24, 6]]) W.chandelier(x, FY + 4.2, z, 1.2);
    for (const [x, z] of [[-16, -9], [-12, 4], [-32, 5], [-20, 6]]) { W.B.col(0xe8e4dc, MAT.CLOTH).cyl(x, FY, z, .05, .05, 1.05, 6).cyl(x, FY + 1.05, z, .4, .4, .04, 14); W.colBox(x, FY + .5, z, .6, 1.1, .6, { surf: 'wood', sight: false }); D.col(0xd8e8f0, MAT.GLASS).cyl(x + .1, FY + 1.1, z, .03, .03, .15, 6); }
    for (const [x, z, q] of [[-34, -11.85, 0], [-16, -11.85, 0], [-39.85, -8, 1], [-39.85, 6, 1]]) W.painting(x, FY + 2.4, z, q, 1.6, 1.1, x * z);
    for (const [x, z] of [[-10, -10.5], [-38.5, 6.5], [-10, 6.5]]) W.bigPlant(x, z, FY);
    // dining
    for (const [x, z] of [[-34, 18], [-24, 18], [-14, 18], [-29, 24], [-19, 24]]) W.roundTable(x, z, FY, 1, 'din', 6);
    W.chandelier(-24, FY + 4.2, 21, 1); W.painting(-39.85, FY + 2.4, 20, 1, 2, 1.3, 77); W.B.col(0x3a2214, MAT.WOOD).box(-24, FY + .5, 27.4, 6, 1, .6); W.colBox(-24, FY + .5, 27.4, 6, 1, .6, { surf: 'wood', sight: false });
    // foyer
    W.chandelier(0, FY2 + 3.6, -5, 1.7); W.statue(-5.5, -9); W.statue(5.5, -9); for (const [x, z] of [[-7, 26], [7, 26], [-7, -11], [7, -11]]) W.bigPlant(x, z, FY);
    W.desk(4.5, -7, FY, 3, false, 'host'); W.painting(-7.85, FY + 2.6, 14, 1, 2.4, 1.6, 12); W.painting(7.85, FY + 2.6, 14, 3, 2.4, 1.6, 13);
    // upper gallery
    W.sofa(-4, 20, FY2, 2, 'gal'); W.armchair(-6.5, 16, FY2, 1, 'gal'); W.tableLow(-4, 17.5, FY2); W.shelf(-7.7, 24, FY2, 1, 'books'); W.painting(0, FY2 + 2, 27.85, 2, 2.2, 1.4, 21); W.bigPlant(6.5, 26, FY2);
    W.addItem('evidence', [31.6, FY2 + .81, -6.5], .4); W.addItem('ammo', [35, FY + .9, -10], .2).ammo = true;
    // kitchen extra
    W.anchor('kit_work', { pos: [30, FY, 3.2], yaw: 0, kind: 'work' }); W.anchor('kit_work', { pos: [35, FY, 3.2], yaw: 0, kind: 'work' }); W.table(32, 12, FY, 3, 1, null, 0); W.clutter(32, 12, FY + .79, 'kitchen');
    for (let i = 0; i < 4; i++) W.crate(38.5, 18 - i, FY, .7, .6, .7, 0x7a6a4a);
    /* ---------- grounds ---------- */
    W.pool(-12, 40, 12, 52, 4.5);
    for (let i = 0; i < 6; i++) W.lounger(-10 + i * 4, 55.5, Math.PI); for (const x of [-15, 15]) W.parasol(x, 46);
    W.fountain(0, -30); W.fountain(0, 68);
    for (const x of [-40, -20, 20, 40]) W.stringLights([x, FY + 3.5, 30], [x * .8, FY + 3.5, 56], 12, .6);
    for (let x = -42; x <= 42; x += 1) if (Math.abs(x) > 2) { W.D.col(0xe8e0d0, MAT.CONC).cyl(x, 4.5, 34.5, .07, .07, .8, 6); } W.box(-22, 5.35, 34.5, 40, .1, .3, 0xe8e0d0, MAT.CONC, { surf: 'concrete', sight: false }); W.box(22, 5.35, 34.5, 40, .1, .3, 0xe8e0d0, MAT.CONC, { surf: 'concrete', sight: false });
    W.col(-42, 4.5, 34.3, -2, 5.4, 34.7, { sight: false, bullet: false }); W.col(2, 4.5, 34.3, 42, 5.4, 34.7, { sight: false, bullet: false });
    for (const [x0, z0, x1, z1] of [[-50, 60, -20, 61], [20, 60, 50, 61], [-50, 60, -49, 80], [49, 60, 50, 80], [-30, 70, -10, 71], [10, 70, 30, 71], [-60, 38, -59, 58], [59, 38, 60, 58]]) W.hedge(x0, z0, x1, z1, 1.6);
    for (const [x, z] of [[-30, 66], [30, 66], [-55, 30], [55, 30]]) W.statue(x, z);
    // gazebo
    { const gx = 40, gz = 72, y = W.th(gx, gz); W.B.col(0xe8e0d0, MAT.CONC).cyl(gx, y, gz, 4, 4, .3, 8); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; W.B.cyl(gx + Math.cos(a) * 3.7, y + .3, gz + Math.sin(a) * 3.7, .12, .12, 3, 8); W.colBox(gx + Math.cos(a) * 3.7, y + 1.8, gz + Math.sin(a) * 3.7, .25, 3, .25, { surf: 'concrete' }); } W.B.col(SLATE, MAT.CONC).cyl(gx, y + 3.3, gz, 4.4, 0, 1.6, 8); W.bench(gx, gz - 2, y + .3, 0); W.bench(gx, gz + 2, y + .3, 2); W.light([gx, y + 2.8, gz], 0xffd8a0, 1.5, 9, { glow: .4 }); }
    for (const [x, z] of [[-40, 38], [40, 38], [-25, 60], [25, 60], [-12, -24], [12, -24], [-30, -38], [30, -38], [-4, -60], [4, -60], [-4, -76], [4, -76]]) W.lanternPost(x, z, 3);
    for (let i = 0; i < 40; i++) { const x = (R() - .5) * 160, z = 20 + R() * 60; if (Math.abs(x) < 46 && z < 60) continue; W.tree(x, z, R() < .5 ? 'broadleaf' : 'pine', .9 + R() * .4); }
    for (let i = 0; i < 60; i++) { const a = R() * TAU, r = 105 + R() * 35; W.tree(Math.cos(a) * r, Math.sin(a) * r, R() < .4 ? 'pine' : 'broadleaf', 1 + R() * .5); }
    for (let i = 0; i < 18; i++) W.tree(-70 + R() * 10, -70 + i * 8, 'pine', 1 + R() * .3); for (let i = 0; i < 18; i++) W.tree(60 + R() * 8, -78 + i * 3.5, 'pine', 1 + R() * .3);
    // estate walls & gate
    W.fence(-86, -82, -6, -82, 'concrete', 2.6); W.fence(6, -82, 79, -82, 'concrete', 2.6); W.fence(-86, -82, -86, 86, 'concrete', 2.6); W.fence(-86, 86, 79, 86, 'concrete', 2.6);
    W.building({ x: 9.5, z: -79, w: 4, d: 4, h: 2.7, wallCol: STUCCO, inCol: 0xe8e0cc, floorMat: MAT.TILE, doors: [{ side: 'w', at: 0, w: .9 }], windows: [{ side: 'n', at: 0, w: 2, h: .9, y0: 1 }, { side: 's', at: 0, w: 2, h: .9, y0: 1 }], rooms: [[-2, -2, 2, 2, 'empty']], lightR: 5 });
    W.road([[0, -150], [0, -82], [0, -40]], 6, 0x8a847a, MAT.CONC);
    /* ---------- vehicles ---------- */
    const limo = G.addVehicle('suv', -8, -32, Math.PI, { color: 0x0a0a0c, name: 'LIMOUSINE', hotwire: true }); this._limo = limo;
    G.addVehicle('sedan', 14, -30, Math.PI * .9, { color: 0x6a0a10, hotwire: true }); G.addVehicle('sedan', 20, -33, Math.PI * .95, { color: 0xc8c8c0, hotwire: true });
    G.addVehicle('sedan', 58, -8, 0, { color: 0xb08020, hotwire: true }); G.addVehicle('suv', 64, -8, 0, { color: 0x1a2a3a, name: 'SUV' }); G.addVehicle('sedan', 70, -8, 0, { color: 0x2a2a2a, hotwire: true });
    /* ---------- surveillance ---------- */
    G.addCam([0, FY + 4, -12.3], Math.PI, 1, true).label = 'CAM 1 — FORECOURT'; G.addCam([78.6, 3.8, -11.5], Math.PI / 2 + .6, .7, true).label = 'CAM 2 — GARAGE';
    G.addCam([39.6, FY2 + 3.2, 8], Math.PI / 2, .6, true).label = 'CAM 3 — UPPER CORRIDOR'; G.addCam([0, FY + 4, 28.3], Math.PI, 1.1, true).label = 'CAM 4 — GARDEN';
    G.addCam([40.3, FY + 3.2, 14], -Math.PI / 2, .6, true).label = 'CAM 5 — SERVICE DOOR'; G.addCam([-7.6, FY + 3.8, -11.6], Math.PI * .75, .7, true).label = 'CAM 6 — FOYER';
    G.addSecurityConsole([35, FY + 1.15, -11.3], 'SECURITY CONSOLE');
    W.zones = [[30, -12, 40, 4, 'restricted', FY - 1, FY + 4], [24, -12, 30, 4, 'restricted', FY - 1, FY + 4], [-8, -12, 40, 28, 'restricted', FY2 - .5, FY2 + 4], [79.5, -70, 160, 70, 'public']];
    /* ---------- delivery truck (insertion & escape) ---------- */
    this._truckPath = [[150, -120], [118, -48], [96, 0], [84, 3], [64, 3]];
    /* ---------- people ---------- */
    const N = d => G.addNPC(d); const civ = (d) => N(Object.assign({ faction: 'civ', role: 'worker' }, d));
    // the target
    N({ id: 'count', name: 'Count Valmont', faction: 'civ', civ: false, role: 'commander', weapon: 'pistol', hp: 130, pos: [-22, -2], prop: 'glass',
      app: { top: 'tux', female: false, hairStyle: 'slick', hair: 0x8a8a86, beard: 'goatee', skin: 0xe0b896, bulk: 1.08, height: 1.03, gold: true, holster: false, eyewear: 'none' },
      routine: [{ t: 'talk', pos: [-22, -2.6], yaw: Math.PI, group: 'vip', dur: 45 }, { t: 'idle', pos: [-31, -8], yaw: 0, anim: 'drink', dur: 20 }, { t: 'talk', pos: [-22, -2.6], yaw: Math.PI, group: 'vip', dur: 35 },
        { t: 'patrol', direct: true, pts: [[0, 1.2], [0, 9.6], [12, 8], [32, 8], [32, 2]], wait: 0 }, { t: 'sit', direct: true, anchor: 'study_seat', dur: 55 }, { t: 'idle', direct: true, pos: [36, -9], yaw: 0, anim: 'phone', dur: 20 }, { t: 'patrol', direct: true, pts: [[32, 2], [32, 8], [12, 8], [0, 9.6], [0, 1.2], [-6, -2]], wait: 0 }] });
    for (let i = 0; i < 3; i++) civ({ group: 'vip', pos: [-21 + i, -4], prop: 'glass', routine: [{ t: 'talk', pos: [-23.5 + i * 1.6, -4.2], yaw: 0, group: 'vip' }] });
    // dancers
    for (let i = 0; i < 6; i++) { const x = -27 + (i % 3) * 3, z = -2 + Math.floor(i / 3) * 4; for (const s of [0, 1]) civ({ pos: [x, z + s * .9], routine: [{ t: 'dance', pos: [x, z + s * .9], yaw: s ? 0 : Math.PI, anim: i % 2 ? 'dance' : 'dance2' }] }); }
    // mingling groups
    const grp = (g, cx, cz, n, extra = {}) => { for (let i = 0; i < n; i++) { const a = i / n * TAU; civ(Object.assign({ group: g, pos: [cx + Math.cos(a), cz + Math.sin(a)], prop: i % 2 ? 'glass' : null, routine: [{ t: 'talk', pos: [cx + Math.cos(a) * .9, cz + Math.sin(a) * .9], yaw: Math.atan2(Math.cos(a), Math.sin(a)), group: g }] }, extra)); } };
    grp('g1', -14, -6, 3); grp('g2', -2, -4, 3); grp('g3', -20, 32, 3); grp('g4', 12, 31, 4); grp('g5', -30, 58, 2); grp('g6', 4, 20, 3);
    for (let i = 0; i < 9; i++) civ({ pos: [-30 + i * 2, 18], routine: [{ t: 'sit', anchor: 'din_seat', anim: i % 3 ? 'drink' : undefined }], prop: i % 3 ? null : 'glass' });
    for (let i = 0; i < 4; i++) civ({ pos: [-9 + i * 5, 56], routine: [{ t: 'idle', pos: [-9 + i * 5, 54.6], yaw: Math.PI, anim: i % 2 ? 'drink' : 'lean' }], prop: i % 2 ? 'glass' : null });
    for (let i = 0; i < 3; i++) civ({ pos: [-34 + i, -8], prop: 'glass', routine: [{ t: 'idle', pos: [-34 + i * 1.5, -8.2], yaw: 0, anim: 'drink' }] });
    civ({ pos: [-2, 26], routine: [{ t: 'patrol', pts: [[-2, 26], [-14, -6], [-24, 30], [0, 44], [16, 32]], wait: 6 }] }); civ({ pos: [2, 27], prop: 'cig', routine: [{ t: 'smoke', pos: [20, 33], yaw: Math.PI }] });
    // staff
    const staff = d => N(Object.assign({ faction: 'staff', role: 'worker', weapon: 'none' }, d));
    staff({ pos: [-31, -9], routine: [{ t: 'work', anchor: 'bar_work' }] }); staff({ pos: [30, 3], app: { top: 'shirt', topCol: 0xffffff }, routine: [{ t: 'work', anchor: 'kit_work' }] }); staff({ pos: [35, 3], routine: [{ t: 'work', anchor: 'kit_work' }] });
    for (let i = 0; i < 3; i++) staff({ pos: [30 - i * 3, 10], prop: 'tray', routine: [{ t: 'patrol', pts: [[30, 10], [10, -2], [-4, -2], [-16, -4][0] === -16 ? [-16, -2] : [-16, -2], [-20, 14], [-4, 20], [10, -2]], wait: 4 }] });
    // security
    const S = d => N(Object.assign({ faction: 'security' }, d));
    S({ post: 'Gate', group: 'sg', pos: [7, -78], routine: [{ t: 'talk', pos: [6.5, -77.5], yaw: Math.PI / 2, group: 'sg', dur: 60 }, { t: 'guard', pos: [3, -84], yaw: 0, dur: 40 }] }); S({ group: 'sg', pos: [5, -78], routine: [{ t: 'talk', pos: [5, -77.6], yaw: -Math.PI / 2, group: 'sg' }] });
    S({ post: 'Entrance', pos: [-3, -16], routine: [{ t: 'guard', pos: [-3, -16.5], yaw: Math.PI }] }); S({ pos: [3, -16], routine: [{ t: 'guard', pos: [3, -16.5], yaw: Math.PI }] });
    S({ pos: [-5.5, -6], routine: [{ t: 'guard', pos: [-6.5, 0], yaw: -Math.PI / 2, dur: 60 }, { t: 'patrol', pts: [[-6, 0], [-20, -10], [-36, 4], [-20, 14], [-6, 0]], wait: 4 }] });
    S({ pos: [-10, 26], routine: [{ t: 'patrol', pts: [[-10, 26], [-38, 26], [-38, 14], [-10, 14]], wait: 5 }] });
    S({ post: 'Garden', pos: [-30, 45], weapon: 'smg', routine: [{ t: 'patrol', pts: [[-30, 45], [-45, 70], [0, 76], [45, 70], [30, 45], [0, 38]], wait: 4, look: true }] });
    S({ pos: [30, 45], weapon: 'smg', routine: [{ t: 'patrol', pts: [[30, 45], [50, 30], [60, -40], [20, -40], [30, 45]], wait: 4, look: true }] });
    S({ post: 'Garage', pos: [70, 10], weapon: 'smg', routine: [{ t: 'patrol', pts: [[70, 10], [60, 10], [60, -2], [76, -2]], wait: 5 }] });
    S({ name: 'Moreau', camOp: true, radioOp: true, role: 'worker', pos: [35, -16], routine: [{ t: 'sit', anchor: 'sec_seat' }] });
    S({ post: 'Upstairs', y: FY2, direct: true, pos: [20, 8], routine: [{ t: 'patrol', direct: true, pts: [[12, 8], [37, 8]], wait: 6 }] });
    S({ y: FY2, direct: true, pos: [28, 3], weapon: 'smg', routine: [{ t: 'guard', direct: true, pos: [29, 5], yaw: Math.PI }] });
    S({ y: FY2, direct: true, pos: [-2, 16], routine: [{ t: 'patrol', direct: true, pts: [[-4, 12], [-4, 24], [4, 24], [4, 12]], wait: 5 }] });
    for (const g of ['vip', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6']) G.addGroup(g, pick(TALK_PARTY).concat(pick(TALK_PARTY))); G.addGroup('sg', pick(TALK_SEC).concat(pick(TALK_SEC)));
    G.civTotal = G.npcs.filter(n => n.civ).length;
  },
  start(G) {
    const v = G.introRoad({ path: this._truckPath, kind: 'truck', color: 0xe8e8e0, name: 'CATERING TRUCK', title: 'THE MANSION', sub: 'OPERATION GILDED CAGE', meta: 'VILLA VALMONT · 23:10 LOCAL · COVERT ENTRY', cineLen: 9, exitLabel: 'STEP OUT OF THE TRUCK',
      hint: 'You are disguised as catering staff. Keep your weapon holstered (press its slot key again) to blend in. Press [E] at the rear doors to step out.',
      shots: (t, v) => t < 3.2 ? [[30 + t * 4, 40, -60], [0, 8, 8]] : t < 6.2 ? [V.add(v.pos, [-14, 4, 8]), V.add(v.pos, [0, 1.5, 0])] : [[86, 3.5, 12], V.add(v.pos, [0, 1.5, 0])] });
    this._truck = v; P.holstered = true;
    G.W.interact.push({ r: 3.5, wide: true, pos: () => M4.pt(v.m, 0, 1.4, v.def.L * .5 - .3), label: () => P.state !== 'ground' ? '' : this.canExtract(G) ? '[E] CLIMB INTO THE TRUCK — ESCAPE' : '', anim: 'reach', dur: .7, at: .45, act: () => { if (this.canExtract(G)) this.extract(G); } });
  },
  update(G, dt) {
    const c = G.npcs.find(n => n.id === 'count');
    G.marker = !G.obj('count').done ? (c ? [c.pos[0], c.pos[1] + 2, c.pos[2]] : null) : [64, 2, 3];
    if (c && !c.dead && G.alarm >= 1 && !this._fled && c.state !== 'hostage') {
      this._fled = true; if (c.pos[1] > 8) { c.setState('cower'); c.def.kneel = false; G.speak(c, 'Lock the study! Nobody gets in!', true); }
      else { c.setState('flee'); c.goTo([-6.5, 0, -30], true); G.speak(c, 'Get me to the car! Now!', true); G.notify('VALMONT IS RUNNING FOR HIS LIMOUSINE', 'alarm'); }
    }
    if (c && !c.dead && c.state === 'flee' && V.dist2(c.pos, this._limo.pos) < 3.5 && !this._escaped) {
      this._escaped = true; c.dead = true; c.deathT = 99; const L = this._limo; L.locked = false; c.pos = [0, -50, 0];
      G.after(() => G.failMission('TARGET ESCAPED — VALMONT REACHED HIS LIMOUSINE'), 1500); L.engine = true; G.extraUpdaters.push(d => { L.speed = Math.min(18, L.speed + d * 6); L.pos[2] -= L.speed * d; L.yaw = Math.PI; this && G.vehicleBones(L); });
    }
  },
  onKill(G, n) { if (n.id === 'count') { G.complete('count'); G.after(() => G.notify('VALMONT IS DEAD — RETURN TO THE CATERING TRUCK IN THE GARAGE', 'good'), 1200); } },
  onPickup(G, item) { if (item === 'evidence') G.complete('evidence'); },
  onCamsOff(G) { G.complete('cams'); },
  canExtract(G) { return G.obj('count').done; },
  extract(G) { G.extractTruck(this._truck, [[64, 3], [84, 3], [96, 0], [118, -48], [150, -120]]); },
};
MISSIONS.push(MIS4);
