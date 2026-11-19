/* ============================ MISSION 02 ============================ */
const M2 = {
  id: 'm2', code: 'OPERATION DEADLIGHT', name: 'HARBOR BLACKOUT', num: '02', location: 'Port Vasko — PMC-held freight terminal, Black Sea coast', time: '02:15 LOCAL — NIGHT', weather: 'Heavy rain · gale-force wind', difficulty: 3, size: 400, seed: 23, parTime: 1100, ambience: 'harbor', siren: true,
  briefing: 'Vanguard Risk Solutions, a private military contractor, is moving a shipment of stolen anti-air missiles through Port Vasko. The buyer arrives in 48 hours. Insert by rigid inflatable boat under cover of the storm, steal the encrypted manifest drive from the harbor office servers, and plant a demolition charge on container K-7 before exfiltrating by speedboat from the west pier.',
  intel: ['The server room door is keycard-locked. Security chief Brandt carries a card; a careless guard reportedly left a spare in the break room.', 'Container K-7 sits on the quay beneath the gantry crane, ready for loading onto the MV Kestrel.', 'The terminal substation in the north-east corner feeds every floodlight and camera. Kill it and the yard goes dark — but expect flashlights.', 'Vanguard operators are professionals: helmets, plate carriers and coordinated radio discipline.', 'Rain masks footsteps, but standing under sodium lamps will get you seen.'],
  objectives: [
    { id: 'insert', text: 'Climb onto the pier', type: 'hidden' },
    { id: 'drive', text: 'Steal the arms manifest drive from the harbor office server room', type: 'primary' },
    { id: 'charge', text: 'Plant a demolition charge on weapons container K-7', type: 'primary' },
    { id: 'extract', text: 'Escape on the speedboat at the west pier', type: 'primary' },
    { id: 'ghost', text: 'Remain undetected', type: 'optional', check: g => !g.stats.detected },
    { id: 'lights', text: 'Shut down the terminal substation', type: 'optional' },
    { id: 'restraint', text: 'Eliminate no more than 4 hostiles', type: 'optional', check: g => g.stats.kills <= 4 },
  ],
  startItems: ['charge'],
  env: { sunDir: [.3, .65, .45], sunCol: 0x8a9ab8, sunI: .32, sky: 0x2a3444, skyI: .32, gnd: 0x12161c, gndI: .35, fog: 0x1c222a, fogI: 1, fogD: .0105, fogH: 3, expo: 1.35, zen: 0x06080c, hor: 0x1c232c, cloud: .95, night: 1, rain: 1, wet: 1, vis: .28, wind: 2.2, skyFog: .7 },
  build(W, G) {
    const R = W.rng;
    const H = (x, z) => { let h = 2.5; if (z > 109) h = lerp(2.5, -9, smooth((z - 109) / 3)); if (z < -105) h += Math.pow((-105 - z) / 40, 1.6) * 12 + fbm(x * .03, z * .03) * 6; if (Math.abs(x) > 172 && z < 109) h += Math.pow((Math.abs(x) - 172) / 20, 1.5) * 8; return h; };
    W.initTerrain(H, 2);
    const C = colorTable({ asph: 0x2c2c2e, conc: 0x55534e, grass: 0x2a3424, rock: 0x3a3a38, sea: 0x101418 });
    W.buildTerrainMesh((x, z, h, n) => { if (h < 0) return { c: C.sea, m: MAT.ROCK }; if (h > 3.2) return n[1] < .8 ? { c: C.rock, m: MAT.ROCK } : { c: C.grass, m: MAT.GRASS }; if (z > 96) return { c: C.conc, m: MAT.CONC }; return vnoise(x * .05, z * .05) > .7 ? { c: C.conc, m: MAT.CONC } : { c: C.asph, m: MAT.ASPH }; });
    W.setWater(0, lin(0x16222a), lin(0x0a1014), .9, 2.4);
    W.surfFn = (x, z) => z > 96 ? 'concrete' : W.th(x, z) > 3.2 ? 'grass' : 'asphalt';
    const piers = [[126, 110, 134, 153], [-122, 109, -118, 169]];
    W.navOk = (x, z) => piers.some(p => x > p[0] && x < p[2] && z > p[1] && z < p[3]);
    W.pois.push({ p: [105, 5], t: 'HARBOR OFFICE' }, { p: [12, 98], t: 'K-7' }, { p: [-115, 15], t: 'WAREHOUSE 1' }, { p: [-115, 70], t: 'WAREHOUSE 2' }, { p: [150, -40], t: 'SUBSTATION' }, { p: [-120, 160], t: 'EXFIL' }, { p: [130, 150], t: 'INSERTION' }, { p: [10, 129], t: 'MV KESTREL' }, { p: [8, -64], t: 'GATE' });
    // quay wall, bollards, invisible barrier
    W.box(0, -1, 110.6, 352, 7, .9, 0x5a5852, MAT.CONC, { surf: 'concrete' });
    for (let x = -170; x <= 170; x += 9) { W.B.col(0x2a2a2a, MAT.METAL).cyl(x, 2.5, 110, .22, .18, .55, 8); W.B.col(0x111111, MAT.RUBBER).box(x + 4.5, 1.2, 111.1, 1, 1.6, .4); }
    for (let x = -175; x < 175; x += 10) { const ok = !piers.some(p => x + 10 > p[0] && x < p[2]); if (ok) W.col(x, 2.5, 110, x + 10, 3.6, 110.6, { surf: 'concrete', sight: false, bullet: false }); else { for (const p of piers) { if (x < p[0]) W.col(x, 2.5, 110, p[0], 3.6, 110.6, { sight: false, bullet: false }); if (x + 10 > p[2]) W.col(p[2], 2.5, 110, x + 10, 3.6, 110.6, { sight: false, bullet: false }); } } }
    // east concrete pier + ladder
    W.box(130, -1.75, 131.5, 8, 8.5, 43, 0x5a5852, MAT.CONC, { surf: 'concrete' }); W.col(125.6, 2.5, 110, 126, 3.6, 153, { sight: false, bullet: false }); W.col(134, 2.5, 110, 134.4, 3.6, 153, { sight: false, bullet: false });
    for (let y = -.4; y < 2.5; y += .35) W.B.col(0x3a3a38, MAT.RUST).box(130, y, 153.15, .7, .05, .05); W.B.box(129.65, 1.1, 153.15, .06, 3.2, .06).box(130.35, 1.1, 153.15, .06, 3.2, .06);
    for (let z = 115; z < 152; z += 6) { W.B.col(0x2a2a2a, MAT.METAL).cyl(126.4, 2.5, z, .2, .16, .5, 8).cyl(133.6, 2.5, z, .2, .16, .5, 8); }
    // west wooden pier (exfil)
    W.bridge(-120, 110.2, -120, 169, 4, 2.45); W.col(-122.2, 2.45, 110, -121.9, 3.6, 162, { sight: false, bullet: false }); W.col(-118.1, 2.45, 110, -117.8, 3.6, 162, { sight: false, bullet: false }); W.col(-122.2, 2.45, 168.9, -117.8, 3.6, 169.3, { sight: false, bullet: false });
    /* ---- cargo ship MV Kestrel ---- */
    const B = W.B;
    W.box(10, .5, 129, 120, 13, 22, 0x2a2e30, MAT.PAINT, { surf: 'metal' }); B.col(0x6a1a14, MAT.PAINT).box(10, -.3, 129, 120.2, 1.2, 22.2); B.col(0xc8c8c0, MAT.PAINT).box(10, 6.6, 129, 120.2, .5, 22.2);
    B.col(0x2a2e30, MAT.PAINT).push().t(-50, -6, 129).ry(Math.PI / 2).prism(0, 0, 0, 22, 13, 0).pop(); B.tbox(-55, .5, 129, 10, 13, 22, 2, 2);
    W.col(-62, -6, 120, -50, 7, 138, { surf: 'metal' });
    W.box(60, 13, 129, 14, 12, 18, 0xdcdcd4, MAT.PAINT, { surf: 'metal' }); for (let y = 0; y < 3; y++) for (let i = 0; i < 6; i++) { B.col(R() < .6 ? 0xffd890 : 0x2a3a40, R() < .6 ? MAT.EMIT : MAT.GLASS).box(52.9, 9.5 + y * 3.2, 122 + i * 2.6, .05, 1, 1.4); }
    W.box(60, 20, 129, 16, 2.4, 20, 0xdcdcd4, MAT.PAINT, { surf: 'metal' }); B.col(0x2a3a40, MAT.GLASS).box(52, 20.2, 129, .05, 1.2, 18);
    B.col(0x1a1a1a, MAT.PAINT).cyl(64, 21, 129, 1.8, 1.6, 7, 12); B.col(0x8a1a14, MAT.PAINT).cyl(64, 26.5, 129, 1.65, 1.6, 1, 12);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < (i + j) % 3 + 1; k++) W.container(-30 + i * 12, 124 + j * 9, 1, [0x8a1a14, 0x1a4a7a, 0x2a6a3a, 0xb07020, 0x6a6a6a][(i * 2 + j + k) % 5], 7 + k * 2.59);
    W.light([-40, 12, 129], 0xffe0a0, 4, 30, { group: 'ship', glow: .8, dir: [0, -1, 0], cone: .4 }); W.light([52, 9, 120], 0xfff0c0, 3, 20, { group: 'ship', glow: .6 });
    W.light([-49, 8, 118], 0xff2020, 1, 4, { group: 'ship', glow: .5 }); W.light([-49, 8, 140], 0x20ff40, 1, 4, { group: 'ship', glow: .5 });
    W.stairs(0, 111.4, 's', 1.4, 4.5, 6.5, 0x5a5e5a, MAT.METAL, 'metal', 2.5);
    /* ---- gantry crane ---- */
    B.col(0xc89a1a, MAT.PAINT); for (const [x, z] of [[16, 88], [36, 88], [16, 107], [36, 107]]) { W.box(x, 14.5, z, 1.2, 24, 1.2, 0xc89a1a, MAT.PAINT, { surf: 'metal' }); B.col(0x222222, MAT.METAL).box(x, 1, z, 2, 1, 2.4); }
    B.col(0xc89a1a, MAT.PAINT).box(26, 26.5, 88, 22, 1.5, 1.5).box(26, 26.5, 107, 22, 1.5, 1.5).box(16, 26.5, 97.5, 1.5, 1.5, 20).box(36, 26.5, 97.5, 1.5, 1.5, 20).box(26, 28, 120, 3, 1.4, 66);
    for (const x of [16, 36]) for (let y = 4; y < 24; y += 5) B.beam([x, y, 88], [x, y + 5, 107], .3); B.col(0x3a3a3a, MAT.METAL).box(26, 25, 105, 3, 2.5, 3); B.col(0xffd890, MAT.EMIT).box(26, 25.2, 103.45, 2.6, 1.2, .05);
    B.col(0x2a2a2a, MAT.METAL).beam([26, 27.4, 130], [26, 14, 130], .05); B.col(0x8a6a1a, MAT.PAINT).box(26, 13.6, 130, 2.6, .5, 6.2); W.container(26, 130, 1, 0x1a4a7a, 10.8);
    W.floodlight(22, 92, Math.atan2(22 - 12, 92 - 98), 12); W.floodlight(30, 104, Math.PI, 10);
    /* ---- container yard ---- */
    const ccol = [0x8a1a14, 0x1a4a7a, 0x2a6a3a, 0xb07020, 0x6a6a6a, 0x3a2a5a, 0x9a4a1a, 0x1a6a6a, 0x7a7a2a];
    for (const bx of [-55, -30, -5, 20, 45, 70]) for (const bz of [0, 18, 36, 54, 72]) {
      if (bx === 70 && bz < 20) continue; if (bx >= 20 && bz >= 72) continue;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { if (R() < .12) continue; const k = 1 + ((R() * 3) | 0); for (let kk = 0; kk < k; kk++) W.container(bx + (i - 1) * 6.25, bz + (j - .5) * 2.5, 1, ccol[(R() * ccol.length) | 0], 2.5 + kk * 2.59); }
    }
    // K-7
    W.container(12, 98, 1, 0x8a1a14, 2.5); B.col(0xeeeeee, MAT.PAINT).box(12, 4.2, 96.75, 1.6, .8, .02); B.col(0x111111, MAT.PAINT).box(11.7, 4.2, 96.73, .12, .6, .01).box(12.3, 4.2, 96.73, .12, .6, .01).box(12, 4.45, 96.73, .5, .1, .01);
    B.col(0xd0a020, MAT.PAINT).box(12, 2.53, 95.8, 7, .02, .2);
    /* ---- warehouses ---- */
    W.building({ x: -115, z: 15, w: 32, d: 22, h: 8, wallCol: 0x5a6068, wallMat: MAT.CORR, floorMat: MAT.CONC, floorCol: 0x4a4a48, roof: 'shed', roofCol: 0x3a3e40, lightI: 2.4, lightR: 18, lightCol: 0xd8e0ff,
      doors: [{ side: 'e', at: -3, w: 6, h: 5, open: true, none: true }, { side: 's', at: 10, label: 'WAREHOUSE DOOR', metal: true, col: 0x4a4e52 }], windows: [{ side: 'n', at: -8, w: 3, h: .9, y0: 5.5 }, { side: 'n', at: 8, w: 3, h: .9, y0: 5.5 }, { side: 'w', at: 0, w: 3, h: .9, y0: 5.5 }],
      parts: [[8, -11, 8, -3, 0], [8, -3, 16, -3, 0]], rooms: [[-16, -11, 8, 11, 'storage', 'w1'], [8, -11, 16, -3, 'office', 'w1o']] });
    forklift(W, -110, 22, 1.2); forklift(W, -100, 30, -.4); for (let i = 0; i < 4; i++) { W.pallet(-122 + i * 2.5, 22, 2.65); W.crate(-122 + i * 2.5, 22, 2.77, 1.1, .9, 1.1, 0x5a6a4a, i % 2 === 0); }
    W.building({ x: -115, z: 70, w: 28, d: 20, h: 8, wallCol: 0x6a5e52, wallMat: MAT.CORR, floorMat: MAT.CONC, floorCol: 0x4a4a48, roof: 'shed', roofCol: 0x3a3e40, lightI: 2.2, lightR: 16, lightCol: 0xd8e0ff,
      doors: [{ side: 'e', at: 2, w: 6, h: 5, open: true, none: true }, { side: 'n', at: -8, label: 'WAREHOUSE DOOR', metal: true, col: 0x4a4e52 }], windows: [{ side: 's', at: 0, w: 3, h: .9, y0: 5.5 }], rooms: [[-14, -10, 14, 10, 'storage', 'w2']] });
    W.container(-120, 73, 1, 0x1a4a7a, 2.65); W.crate(-110, 64, 2.65, 1.2, 1.2, 1.2, 0x3f4a2a); W.crate(-110, 64, 3.85, 1, .8, 1, 0x3f4a2a); W.ammoPickup(-109.6, 4.65, 64);
    /* ---- harbor office ---- */
    const of = W.building({ x: 105, z: 5, w: 22, d: 14, h: 3.4, wallCol: 0x7a5a48, wallMat: MAT.BRICK, inCol: 0xb8b0a0, floorMat: MAT.TILE, floorCol: 0x6a6a66, ac: true,
      doors: [{ side: 'n', at: -.5, w: 1.4, label: 'OFFICE ENTRANCE' }, { side: 'w', at: 0, label: 'SIDE DOOR' }, { side: 'e', at: 0, label: 'REAR DOOR' }],
      windows: [{ side: 'n', at: -7.5, w: 1.4 }, { side: 's', at: -6.5, w: 1.4 }, { side: 's', at: 1.5, w: 1.4 }, { side: 'w', at: -4, w: 1.2 }, { side: 'w', at: 4, w: 1.2 }, { side: 'e', at: 4, w: .8, h: .6, y0: 1.6 }],
      parts: [[-11, -1, -4, -1, 0, .95, false, { label: 'SECURITY' }], [-4, -1, 3, -1, 0, 3, true], [3, -1, 11, -1, 0, .95, false, { locked: true, key: 'keycard', metal: true, col: 0x4a4e52, label: 'SERVER ROOM' }], [-4, -7, -4, -1], [3, -7, 3, -1], [-11, 1, -2, 1, 0, .95, false, { label: 'BREAK ROOM' }], [-2, 1, 5, 1, 0, .95, false, { label: 'OFFICE' }], [5, 1, 11, 1, 0, .9, false, { label: 'RESTROOM' }], [-2, 1, -2, 7], [5, 1, 5, 7]],
      rooms: [[-11, -7, -4, -1, 'security', 'sec'], [-4, -7, 3, -1, 'lobby', 'lob'], [3, -7, 11, -1, 'server', 'srv'], [-11, 1, -2, 7, 'lounge', 'brk'], [-2, 1, 5, 7, 'office', 'off'], [5, 1, 11, 7, 'bath']] });
    W.addItem('drive', [115.15, of.fy + .81, .55], .4); W.addItem('keycard', [98.7, of.fy + .43, 9.2], .7);
    W.D.col(0xd0d0c0, MAT.EMIT).box(104.5, of.fy + 2.75, -2.2, 1.6, .3, .05); W.D.col(0x1a3a6a, MAT.PAINT).box(104.5, of.fy + 2.75, -2.23, 1.4, .2, .01);
    /* ---- gate, perimeter ---- */
    W.building({ x: 9, z: -64, w: 4, d: 4, h: 2.7, wallCol: 0x8a8a84, inCol: 0xa0a09a, floorMat: MAT.CONC, doors: [{ side: 'w', at: 0, w: .9, open: true, none: true }], windows: [{ side: 'n', at: 0, w: 2, h: .9, y0: 1 }, { side: 's', at: 0, w: 2, h: .9, y0: 1 }, { side: 'e', at: 0, w: 2, h: .9, y0: 1 }], rooms: [[-2, -2, 2, 2, 'empty']], lightR: 5 });
    W.chair(9.5, -64.5, 2.65, 3, 'gate'); W.box(4, 3.5, -62, .25, 2, .25, 0xc02020, MAT.PAINT, { surf: 'metal' }); W.B.col(0xeeeeee, MAT.PAINT).box(0, 3.4, -62, 8, .12, .12);
    W.fence(-172, -60, -6, -60, 'concrete', 3); W.fence(6, -60, 172, -60, 'concrete', 3);
    W.road([[0, -200], [0, -60], [0, -40], [100, -30], [100, -8]], 8, 0x222224, MAT.ASPH); W.road([[0, -40], [-100, -35], [-100, 2]], 8, 0x222224, MAT.ASPH);
    /* ---- substation ---- */
    W.fence(142, -46, 158, -46, 'chain', 2.6); W.fence(158, -46, 158, -34, 'chain', 2.6); W.fence(158, -34, 142, -34, 'chain', 2.6); W.fence(142, -34, 142, -38, 'chain', 2.6); W.fence(142, -42, 142, -46, 'chain', 2.6);
    for (const [x, z] of [[146, -42], [150, -42], [154, -42]]) { W.box(x, 3.75, z, 2, 2.5, 1.6, 0x6a6e6a, MAT.METAL, { surf: 'metal' }); B.col(0x4a4e4a, MAT.METAL); for (let i = 0; i < 6; i++) B.box(x - .9 + i * .36, 3.6, z + .85, .04, 2, .3); B.col(0x8a6a4a, MAT.PLASTIC); for (let i = -1; i <= 1; i++) B.cyl(x + i * .6, 5, z, .1, .08, .8, 8); }
    B.col(0x5a5e5a, MAT.METAL).box(150, 6.5, -38, 14, .2, .2); for (const x of [143, 157]) W.box(x, 4.5, -38, .3, 4, .3, 0x5a5e5a, MAT.METAL, { surf: 'metal' });
    W.generatorPanel(150, 3.8, -35.2, 2); W.sounds.push({ kind: 'hum', pos: [150, 3.5, -42], f: 100, vol: .2 });
    W.interact.push({ r: 1.8, pos: [150, 3.8, -35.2], hold: 3, anim: 'hotwire', label: () => G.powerOn ? '[E] SHUT DOWN SUBSTATION (HOLD)' : '', enabled: () => G.powerOn, act: () => {
      G.setPower(false); G.complete('lights'); AUD.explosion([150, 4, -42]); G.sparks([150, 5, -42]);
      G.after(() => { const op = G.npcs.find(n => !n.dead && n.def.radioOp); if (op) G.speak(op, 'Power is down across the terminal! Flashlights on. Two of you, check the substation!', true); for (const n of G.npcs) if (!n.dead && Math.random() < .7) n.flashlight = true; const al = G.npcs.filter(n => !n.dead && n.state === 'calm' && !n.def.static).sort((a, b) => V.dist(a.pos, [150, 0, -40]) - V.dist(b.pos, [150, 0, -40])).slice(0, 2); for (const n of al) { n.setSuspicious([150, 0, -38], false); n.setState('investigate'); n.suspPt = [150, 0, -38]; n.goTo([148, 0, -32], true); } }, 2500);
    } });
    /* ---- fuel tanks ---- */
    for (const [x, z] of [[150, 55], [150, 75], [165, 65]]) { W.box(x, 2.5 + 5, z, 9, 10, 9, 0xc8c8c0, MAT.PAINT, { c: false }); B.col(0xc8c8c0, MAT.PAINT).cyl(x, 2.5, z, 4.5, 4.5, 10, 18); W.colBox(x, 7.5, z, 8.5, 10, 8.5, { surf: 'metal' }); B.col(0x8a1a14, MAT.PAINT).cyl(x, 9, z, 4.55, 4.55, .5, 18); }
    for (let i = 0; i < 5; i++) W.barrel(138 + i * .7, 62 + (i % 2) * .7, 2.5, 0, true);
    /* ---- lamp posts & floodlights ---- */
    for (const [x, z] of [[-80, -40], [-40, -38], [0, -45], [40, -38], [80, -34], [-90, 45], [-80, 92], [-40, 92], [0, 92], [55, 92], [85, 60], [85, 25], [-15, 30], [32, 64], [120, -20], [-125, 105]]) W.lampPost(x, z, 6, 0xffa850);
    W.floodlight(-98, 8, Math.atan2(-98 - -60, 8 - 20), 7); W.floodlight(-98, 66, Math.atan2(-98 - -70, 66 - 60), 7); W.floodlight(96, -4, Math.atan2(96 - 80, -4 - -20), 6);
    /* ---- vehicles, props ---- */
    G.addVehicle('truck', -92, 42, 0, { hotwire: true, color: 0x2a3a4a }); G.addVehicle('suv', 92, -22, Math.PI / 2, { color: 0x111111 }); G.addVehicle('sedan', 70, -36, .2, { hotwire: true, color: 0x5a5a5a });
    forklift(W, 40, 86, 2); forklift(W, -62, 88, .3);
    for (const [x, z] of [[-75, 25], [-80, 60], [-40, 88], [60, 88], [95, 40], [-20, -10], [115, -20]]) { W.crateStack(x, z, 2.5); W.pallet(x + 1.4, z, 2.5); if (R() < .6) W.barrel(x - 1.2, z, 2.5, 0x2a4a7a); }
    for (let i = 0; i < 6; i++) W.crate(-128 + R() * 6, 106 - R() * 4, 2.5, .8, .7, .8, 0x6a5a3a, true);
    scatter(W, 70, (x, z) => W.tree(x, z, 'pine', .8 + R() * .5), (x, z) => W.th(x, z) > 5, R); scatter(W, 40, (x, z) => W.bush(x, z, 1, 0x2a3a22), (x, z) => W.th(x, z) > 4, R); scatter(W, 30, (x, z) => W.rock(x, z, 1 + R() * 2, 0x4a4a48), (x, z) => W.th(x, z) > 5, R);
    /* ---- cameras ---- */
    G.addCam([104.5, of.fy + 3.1, -2.4], 0, .8, true); G.addCam([-98.6, 8, 15], -Math.PI / 2, .9, true); G.addCam([8, 7, 84], 0, 1.1, true); G.addCam([7, 5.2, -61.8], 0, .7, true);
    W.box(8, 4.5, 84.3, .2, 4, .2, 0x4a4a4a, MAT.METAL, { surf: 'metal' });
    /* ---- exfil speedboat ---- */
    const sb = buildBoat('speed'); const boat = { mesh: sb.mesh, bones: new Float32Array(32), m: M4.create(), pos: [-116.8, 0, 164], yaw: Math.PI };
    boat.update = (dt, sp) => { const m = boat.m; M4.ident(m); M4.translate(m, m, boat.pos[0], W.waterY + Math.sin(G.time * 1.6) * .05 + (sp ? -.1 : 0), boat.pos[2]); M4.rotY(m, m, boat.yaw); M4.rotX(m, m, (sp || 0) * .006 + Math.sin(G.time * 1.2) * .02); M4.rotZ(m, m, Math.sin(G.time) * .02); boat.bones.set(m, 0); const pm = M4.create(); M4.translate(pm, m, 0, .2, 3.6); M4.rotZ(pm, pm, G.time * 30 * (sp ? 1 : 0)); boat.bones.set(pm, 16); };
    boat.update(0, 0); G.extras.push({ mesh: sb.mesh, bones: boat.bones, pos: boat.pos, r: 6 }); G.extraUpdaters.push(dt => { if (G.state !== 'cine') boat.update(dt, 0); }); this._boat = boat;
    W.interact.push({ r: 3, wide: true, pos: [-118, 3, 164.5], label: () => P.state !== 'ground' ? '' : this.canExtract(G) ? '[E] BOARD SPEEDBOAT' : 'SPEEDBOAT — COMPLETE PRIMARY OBJECTIVES FIRST', anim: 'reach', dur: .7, at: .45, act: () => { if (!this.canExtract(G)) return; G.extractBoat(boat, { camOff: [-14, -12] }); G.after(() => { G.explode([12, 4, 98], 12, 300); G.dlights.push({ pos: [12, 8, 98], col: [1, .5, .2], i: 20, range: 80, life: 2 }); }, 4200); } });
    plantSpot(W, G, [12, 3.7, 96.55], 'CONTAINER K-7', () => G.complete('charge'));
    /* ---- NPCs ---- */
    const N = d => G.addNPC(Object.assign({ faction: 'pmc' }, d));
    N({ post: 'Gate', group: 'gate', weapon: 'rifle', pos: [3, -66], flashlight: true, routine: [{ t: 'talk', pos: [3, -66], yaw: -Math.PI / 2, group: 'gate', dur: 60 }, { t: 'guard', pos: [2, -63], yaw: Math.PI, dur: 40 }] });
    N({ group: 'gate', weapon: 'smg', pos: [5, -66], routine: [{ t: 'talk', pos: [5.2, -66], yaw: Math.PI / 2, group: 'gate', dur: 50 }, { t: 'sit', anchor: 'gate_seat', dur: 40 }] });
    N({ name: 'Brandt', weapon: 'rifleL', radioOp: true, loot: 'keycard', pos: [100, -2], app: { head: 'cap', capCol: 0x111111, bulk: 1.1 }, routine: [{ t: 'patrol', pts: [[100, -4], [105, 3], [112, 6], [105, 3], [100, -6], [60, -20], [20, 60], [12, 92], [20, 60], [60, -20]], wait: 4 }] });
    N({ name: 'Kovac', weapon: 'smg', role: 'worker', camOp: true, pos: [98, 1], routine: [{ t: 'sit', anchor: 'sec_seat' }] });
    N({ weapon: 'smg', role: 'worker', pos: [106, 8], routine: [{ t: 'sit', anchor: 'off_seat', dur: 70 }, { t: 'idle', pos: [106, 5], yaw: Math.PI / 2, anim: 'radio', dur: 10 }] });
    N({ group: 'brk', weapon: 'rifle', pos: [97, 8], prop: 'cup', routine: [{ t: 'talk', pos: [97.3, 7.5], yaw: -Math.PI / 2, group: 'brk', dur: 90 }, { t: 'sit', anchor: 'brk_seat', dur: 40 }] });
    N({ group: 'brk', weapon: 'rifle', pos: [99.5, 7.5], routine: [{ t: 'talk', pos: [99.4, 7.4], yaw: Math.PI / 2, group: 'brk' }] });
    N({ weapon: 'rifle', pos: [-105, 15], routine: [{ t: 'work', anchor: 'w1_work', dur: 60 }, { t: 'patrol', pts: [[-98, 12], [-90, 12], [-98, 20]], wait: 3 }] });
    N({ role: 'worker', weapon: 'pistol', pos: [-112, 12], app: { head: 'cap', vest: false }, routine: [{ t: 'work', anchor: 'w1_work' }] });
    N({ role: 'worker', weapon: 'pistol', pos: [-103, 7], routine: [{ t: 'sit', anchor: 'w1o_seat' }] });
    N({ post: 'Warehouse', group: 'w2g', weapon: 'rifle', pos: [-104, 72], flashlight: true, routine: [{ t: 'talk', pos: [-104, 72.5], yaw: Math.PI / 2, group: 'w2g' }] });
    N({ group: 'w2g', weapon: 'smg', pos: [-106, 72], routine: [{ t: 'talk', pos: [-106, 72.4], yaw: -Math.PI / 2, group: 'w2g', dur: 70 }, { t: 'patrol', pts: [[-95, 80], [-95, 55], [-104, 72]], wait: 3 }] });
    N({ weapon: 'rifle', flashlight: true, pos: [-60, -20], routine: [{ t: 'patrol', pts: [[-60, -20], [-60, 45], [-42, 63], [-17, 45], [-17, 9], [-42, -9]], wait: 3, look: true }] });
    N({ weapon: 'rifle', flashlight: true, pos: [55, -20], routine: [{ t: 'patrol', pts: [[55, -20], [82, 10], [82, 45], [57, 63], [32, 45], [32, 9]], wait: 3, look: true }] });
    N({ weapon: 'rifleL', flashlight: true, pos: [-80, 95], routine: [{ t: 'patrol', pts: [[-80, 95], [-30, 95], [10, 104], [60, 95], [10, 104], [-30, 95]], wait: 4, look: true }] });
    N({ weapon: 'rifle', flashlight: true, pos: [-5, 27], routine: [{ t: 'patrol', pts: [[-5, 27], [-5, 63], [20, 81], [45, 63], [20, 27]], wait: 3 }] });
    N({ post: 'Crane', weapon: 'rifle', pos: [12, 94], routine: [{ t: 'guard', pos: [15, 94], yaw: -Math.PI / 4, look: true, dur: 80 }, { t: 'patrol', pts: [[5, 94], [26, 94], [26, 104], [5, 104]], wait: 3 }] });
    N({ weapon: 'smg', pos: [30, 102], prop: 'cig', routine: [{ t: 'smoke', pos: [30, 101], yaw: Math.PI / 2, dur: 50 }, { t: 'patrol', pts: [[30, 100], [0, 106], [-20, 104]], wait: 4 }] });
    N({ post: 'Deck', elevated: true, static: true, weapon: 'rifleL', pos: [-10, 121], routine: [{ t: 'guard', pos: [-10, 120.5], yaw: Math.PI, look: true }] });
    N({ elevated: true, static: true, weapon: 'rifle', pos: [40, 121], routine: [{ t: 'guard', pos: [40, 120.5], yaw: Math.PI, look: true }] });
    N({ post: 'Pier', weapon: 'rifle', pos: [-120, 130], flashlight: true, routine: [{ t: 'patrol', pts: [[-120, 114], [-120, 160], [-120, 114], [-100, 106]], wait: 5, look: true }] });
    N({ post: 'Substation', weapon: 'rifle', flashlight: true, pos: [140, -30], routine: [{ t: 'patrol', pts: [[139, -30], [139, -50], [162, -50], [162, -30], [150, -28]], wait: 3, look: true }] });
    for (const g of ['gate', 'brk', 'w2g']) G.addGroup(g, pick(TALK.pmc).concat(pick(TALK.pmc)));
  },
  start(G) { G.introBoat({ path: [[150, 330], [140, 240], [133, 180], [130.4, 156.2]], ladder: [130, 1.5, 152.8], top: [130, 2.5, 150], topYaw: 0, speed: 10, title: 'HARBOR BLACKOUT', sub: 'OPERATION DEADLIGHT', meta: 'PORT VASKO · 02:15 LOCAL · MARITIME INSERTION' }); },
  update(G) { G.marker = !G.obj('drive').done ? [105, 4, 5] : !G.obj('charge').done ? [12, 4, 98] : [-118, 4, 164]; },
  onPickup(G, item) { if (item === 'drive') G.complete('drive'); },
  canExtract(G) { return G.obj('drive').done && G.obj('charge').done; },
};

/* ============================ MISSION 03 ============================ */
function relayTower(W, x, z) {
  const y = W.th(x, z) - .2; const B = W.B; const H = 26; B.col(0x8a2a1a, MAT.PAINT);
  const leg = (sx, sz, t) => [x + sx * lerp(2.2, .35, t), y + t * H, z + sz * lerp(2.2, .35, t)];
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.tube(leg(a, b, 0), leg(a, b, 1), .1, .06, 5);
  for (let k = 0; k < 8; k++) { const t0 = k / 8, t1 = (k + 1) / 8; const c = k % 2 ? 0xd8d8d0 : 0x8a2a1a; B.col(c, MAT.PAINT); for (const [a, b, c2, d] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) { B.beam(leg(a, b, t0), leg(c2, d, t1), .05); B.beam(leg(c2, d, t0), leg(a, b, t1), .05); B.beam(leg(a, b, t1), leg(c2, d, t1), .05); } }
  B.col(0xd8d8d0, MAT.PAINT).cyl(x, y + H, z, .05, .03, 6, 5); B.col(0xdddddd, MAT.PAINT).push().t(x + .6, y + H * .8, z).rz(-.4).cyl(0, 0, 0, .9, .2, .4, 12).pop().push().t(x - .5, y + H * .65, z).rz(.4).cyl(0, 0, 0, .7, .15, .3, 12).pop();
  for (let i = 0; i < 3; i++) B.col(0x555555, MAT.METAL).box(x, y + H * (.55 + i * .1), z + .5, .2, 1.2, .2);
  W.light([x, y + H + 6, z], 0xff2020, 1.5, 4, { glow: .6, flicker: 0 });
  W.box(x + 3, y + 1.1, z, 1.2, 1.8, .9, 0x6a6e66, MAT.METAL, { surf: 'metal' }); B.col(0x30ff60, MAT.EMIT).box(x + 3, y + 1.6, z - .46, .5, .06, .01); B.col(0xffaa20, MAT.EMIT).box(x + 3.3, y + 1.4, z - .46, .1, .1, .01);
  W.D.col(0x111111, MAT.RUBBER).tube([x + 2.5, y + .3, z], [x + 1, y + .2, z], .04);
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) W.colBox(x + a * 2.1, y + 1.5, z + b * 2.1, .3, 3, .3, { surf: 'metal' });
  return [x + 3, y + 1.4, z - .6];
}
const M3 = {
  id: 'm3', code: 'OPERATION WHITE SPIDER', name: 'FROSTLINE', num: '03', location: 'Kazbek massif — "Station 9" satellite uplink, 2,900 m', time: '13:05 LOCAL — OVERCAST', weather: 'Blowing snow · −21 °C', difficulty: 4, size: 420, seed: 37, parTime: 1300, ambience: 'snow', siren: true,
  briefing: 'A rogue militia commander has seized Station 9, a Cold-War satellite uplink, and is using it to relay targeting data for the missiles you tracked in Port Vasko. Insert by helicopter onto the south-west slope, sabotage the three relay transmitters, and recover the launch authentication codes from the control-center vault. An exfil truck will wait on the lower road in the valley.',
  intel: ['Three relay transmitters ring the station; the third stands outside the wall on the northern ridge.', 'The vault door requires a keycard. Major Volkov carries it, and keeps a spare in his office desk.', 'Snowfall limits visibility at range, but open snowfields offer no cover — use rocks, trees and buildings.', 'The militia rotates radio check-ins with every post. A missing answer will draw attention.', 'An intelligence dossier on the buyer network may be in the comms room.'],
  objectives: [
    { id: 'insert', text: 'Exit the helicopter', type: 'hidden' },
    { id: 'relays', text: 'Sabotage the three relay transmitters (0/3)', type: 'primary' },
    { id: 'codes', text: 'Retrieve the launch codes from the control-center vault', type: 'primary' },
    { id: 'extract', text: 'Reach the exfil truck on the lower road', type: 'primary' },
    { id: 'ghost', text: 'Remain undetected', type: 'optional', check: g => !g.stats.detected },
    { id: 'noalarm', text: 'Prevent the general alarm', type: 'optional', check: g => g.stats.alarms === 0 },
    { id: 'dossier', text: 'Recover the buyer-network dossier', type: 'optional' },
  ],
  startItems: ['charge', 'charge', 'charge'],
  env: { sunDir: [.35, .7, .25], sunCol: 0xdde4ee, sunI: 1.05, sky: 0xb4c0cc, skyI: .95, gnd: 0x9aa2aa, gndI: .75, fog: 0xc4ccd4, fogI: 1, fogD: .0085, fogH: 40, expo: 1.0, zen: 0x7c8a9a, hor: 0xd0d6dc, cloud: .95, snow: 1, snowfall: 1, vis: .85, wind: 1.6, skyFog: .8 },
  build(W, G) {
    const R = W.rng;
    const H = (x, z) => {
      let h = 34 + fbm(x * .008 + 2, z * .008 + 5, 5) * 34; h += Math.pow(Math.max(0, fbm(x * .005 + 11, z * .005 + 3, 4) - .42), 1.4) * 260;
      const r = Math.hypot(x, z + 5); if (r < 105) h = lerp(h, 40 + fbm(x * .05, z * .05) * .8, smooth((105 - r) / 35));
      if (z > 50) { const cx = 8 + Math.sin(z * .025) * 14; const vx = Math.abs(x - cx); const k = smooth(1 - vx / 70) * smooth((z - 50) / 50); h = lerp(h, 40 - (z - 55) * .17, k); }
      if (z > 160) { const k = smooth((z - 160) / 15) * smooth(1 - Math.abs(z - 178) / 30); h = lerp(h, 19.5 + Math.abs(x) * .02, k * .9); }
      const e = Math.max(Math.abs(x), Math.abs(z)); if (e > 182) h += Math.pow((e - 182) / 30, 1.5) * 25; return h;
    };
    W.initTerrain(H, 2);
    const road = [[0, 64], [4, 90], [14, 120], [16, 150], [10, 172]], road2 = [[-205, 178], [-120, 178], [-40, 176], [10, 172], [70, 174], [150, 176], [205, 177]];
    W.flattenPath(road, 7, 5); W.flattenPath(road2, 8, 6); W.flatten(-14, -31, 14, -13, 40.1, 4); W.flatten(-51, 9, -29, 21, 40.1, 4); W.flatten(31, 14, 49, 26, 40.1, 4);
    const C = colorTable({ snow: 0xe6eaee, snow2: 0xd8dee4, rock: 0x5e6266, rock2: 0x4a4e52, road: 0xb0b4b8 });
    W.buildTerrainMesh((x, z, h, n) => { if (n[1] < .72) return { c: vnoise(x * .2, z * .2) > .5 ? C.rock : C.rock2, m: MAT.ROCK }; return { c: vnoise(x * .1, z * .1) > .5 ? C.snow : C.snow2, m: MAT.SNOW }; });
    W.surfFn = (x, z) => 'snow';
    W.road(road, 6, 0xb0b4b8, MAT.SNOW); W.road(road2, 7, 0xb0b4b8, MAT.SNOW);
    W.pois.push({ p: [0, -22], t: 'CONTROL CENTER' }, { p: [-40, 15], t: 'BARRACKS' }, { p: [38, -38], t: 'RADAR' }, { p: [40, 20], t: 'GARAGE' }, { p: [-62, -52], t: 'RELAY 1' }, { p: [64, -62], t: 'RELAY 2' }, { p: [-6, -92], t: 'RELAY 3' }, { p: [10, 172], t: 'EXFIL' }, { p: [-96, 78], t: 'LZ' });
    /* ---- perimeter wall ---- */
    const ring = []; for (let i = 0; i <= 20; i++) { const a = i / 20 * TAU; ring.push([Math.cos(a) * 74, -5 + Math.sin(a) * 70]); }
    for (let i = 0; i < 20; i++) { if (i === 5 || i === 12) continue; const a = ring[i], b = ring[i + 1]; W.fence(a[0], a[1], b[0], b[1], 'concrete', 3); }
    W.building({ x: 9, z: 60, w: 4, d: 4, h: 2.7, wallCol: 0x8a8a84, inCol: 0xa0a09a, floorMat: MAT.CONC, doors: [{ side: 'w', at: 0, w: .9 }], windows: [{ side: 'n', at: 0, w: 2, h: .9, y0: 1 }, { side: 's', at: 0, w: 2, h: .9, y0: 1 }, { side: 'e', at: 0, w: 2, h: .9, y0: 1 }], rooms: [[-2, -2, 2, 2, 'empty']], lightR: 5 });
    W.chair(9.5, 59.5, W.th(9, 60) + .15, 2, 'gate');
    /* ---- control center ---- */
    const cc = W.building({ x: 0, z: -22, w: 26, d: 16, h: 3.6, wallCol: 0x8a8e88, inCol: 0xb8bcb0, floorMat: MAT.TILE, floorCol: 0x5a5e5a, ac: true, lightCol: 0xe8f0ff,
      doors: [{ side: 's', at: 0, w: 1.3, label: 'CONTROL CENTER', metal: true, col: 0x4a5048 }, { side: 'e', at: 0, label: 'EAST DOOR', metal: true, col: 0x4a5048 }, { side: 'w', at: 0, label: 'WEST DOOR', metal: true, col: 0x4a5048 }],
      windows: [{ side: 's', at: -9, w: 1.6 }, { side: 's', at: 8.5, w: 1.6 }, { side: 'n', at: -9, w: 1.4 }, { side: 'n', at: 8, w: 1.4 }, { side: 'w', at: -4.5, w: 1.2 }, { side: 'e', at: 4.5, w: 1.2 }],
      parts: [[-13, -1, -5, -1, 0, .95, false, { label: 'COMMS ROOM' }], [-5, -1, 3, -1, 0, 1.1, false, { locked: true, key: 'keycard', metal: true, col: 0x3a3e42, label: 'VAULT' }], [3, -1, 13, -1, 0, .95, false, { label: 'SERVER ROOM' }], [-5, -8, -5, -1], [3, -8, 3, -1], [-13, 1, -4, 1, 0, .95, false, { label: "VOLKOV'S OFFICE" }], [-4, 1, 4, 1, 0, 2.5, true], [4, 1, 13, 1, 0, .95, false, { label: 'SECURITY' }], [-4, 1, -4, 8], [4, 1, 4, 8]],
      rooms: [[-13, -8, -5, -1, 'comms', 'com'], [-5, -8, 3, -1, 'empty', 'vault'], [3, -8, 13, -1, 'server', 'srv'], [-13, 1, -4, 8, 'office', 'chief'], [-4, 1, 4, 8, 'lobby', 'lob'], [4, 1, 13, 8, 'security', 'sec']] });
    // vault contents
    W.safe(-4, -29, cc.fy); W.safe(2, -29, cc.fy); W.table(-1, -26.5, cc.fy, 1.6, .8, null, 0); W.shelf(-4.6, -25.5, cc.fy, 1, 'books');
    for (let i = 0; i < 6; i++) W.B.col(0xc9a23a, MAT.METAL).box(-1.6 + (i % 3) * .3, cc.fy + .8 + (i / 3 | 0) * .1, -26.2, .25, .09, .12);
    W.addItem('codes', [-.7, cc.fy + .81, -26.7], .2); W.addItem('keycard', [-8.9, cc.fy + .81, -18.3], .5); W.addItem('dossier', [-9.4, cc.fy + .81, -29.5], .2);
    for (const [x, z] of [[-8, -24], [8, -24]]) { W.B.col(0x444444, MAT.METAL).cyl(x, cc.fy + 3.9, z, .05, .04, 5, 5); W.light([x, cc.fy + 9, z], 0xff2020, 1, 3, { glow: .4 }); }
    W.B.col(0xdddddd, MAT.PAINT).push().t(0, cc.fy + 4.6, -26).rx(-.6).cyl(0, 0, 0, 2, .3, .6, 16).pop();
    /* ---- barracks ---- */
    W.building({ x: -40, z: 15, w: 20, d: 11, h: 3.2, wallCol: 0x6a5a48, wallMat: MAT.WOOD, inCol: 0x8a7a64, frame: 0x3a2a1a, roof: 'gable', roofCol: 0x4a4e52, rh: 1.6,
      doors: [{ side: 's', at: -3, label: 'BARRACKS' }, { side: 'n', at: 7, label: 'KITCHEN DOOR' }], windows: [{ side: 's', at: -7, w: 1.2 }, { side: 's', at: 2, w: 1.2 }, { side: 'n', at: -6, w: 1.2 }, { side: 'n', at: 0, w: 1.2 }, { side: 'w', at: 0, w: 1.2 }, { side: 'e', at: -2.5, w: 1 }],
      parts: [[4, -5.5, 4, 5.5, -2.5], [4, 0, 10, 0, 0]], rooms: [[-10, -5.5, 4, 5.5, 'barracks', 'bar'], [4, -5.5, 10, 0, 'kitchen', 'bk'], [4, 0, 10, 5.5, 'bath']] });
    /* ---- radar dome ---- */
    const rd = W.building({ x: 38, z: -38, w: 12, d: 12, h: 4, wallCol: 0x9a9e98, inCol: 0xb8bcb0, floorMat: MAT.TILE, floorCol: 0x5a5e5a, doors: [{ side: 's', at: 0, label: 'RADAR', metal: true, col: 0x4a5048 }], windows: [{ side: 'w', at: 0, w: 1.2 }], rooms: [[-6, -6, 6, 6, 'server', 'rad']] });
    W.B.col(0xe8e8e4, MAT.PAINT).sph(38, rd.fy + 4.5, -38, 6.5, 6, 6.5, 20, 12); W.B.col(0x9a9e98, MAT.CONC).cyl(38, rd.fy + 4.2, -38, 6.4, 6.4, .6, 20);
    /* ---- garage ---- */
    W.building({ x: 40, z: 20, w: 16, d: 10, h: 4.5, wallCol: 0x5e6460, wallMat: MAT.CORR, floorMat: MAT.CONC, floorCol: 0x4a4a48, roof: 'shed', roofCol: 0x3e4244, doors: [{ side: 's', at: -2, w: 8, h: 4, open: true, none: true }], windows: [{ side: 'n', at: 0, w: 3, h: .8, y0: 3 }], rooms: [[-8, -5, 8, 5, 'garage', 'gar']] });
    G.addVehicle('truck', 38, 20.5, 0, { hotwire: true, color: 0x4a5040 }); G.addVehicle('suv', 54, 32, -.6, { color: 0x6a6e6a, name: 'UAZ' });
    /* ---- generator / power ---- */
    const gp = W.generator(20, 40, 1); W.gens = [{ pos: gp }]; W.box(20, W.th(20, 40) + 2, 40, 2.6, .15, 3.4, 0x4a4e52, MAT.CORR, { surf: 'metal' });
    W.generatorPanel(18.4, W.th(18.4, 41.5) + 1.2, 41.9, 0);
    W.interact.push({ r: 1.8, pos: [18.4, W.th(18.4, 41.5) + 1.2, 41.7], hold: 2.6, anim: 'hotwire', label: () => G.powerOn ? '[E] CUT STATION POWER (HOLD)' : '', enabled: () => G.powerOn, act: () => { G.setPower(false); G.after(() => { const n = G.npcs.find(x => !x.dead && x.state === 'calm' && !x.def.static); if (n) { G.speak(n, 'Generator just died. I will go look.', true); n.setSuspicious([20, 0, 40], false); n.setState('investigate'); n.suspPt = [20, 0, 40]; n.goTo([20, 0, 43], false); } }, 2500); } });
    /* ---- watchtowers, helipad, fuel ---- */
    const t1 = W.watchtower(-55, 45, 5), t2 = W.watchtower(60, -5, 5);
    const hy = W.th(-48, -35); W.B.col(0x6a6e6a, MAT.CONC).cyl(-48, hy - .3, -35, 9, 9, .4, 24); W.D.col(0xe0d040, MAT.PAINT).box(-48, hy + .11, -35, .6, .01, 5).box(-49.7, hy + .11, -35, .6, .01, 5).box(-46.3, hy + .11, -35, .6, .01, 5).box(-48, hy + .11, -35, 3.4, .01, .6);
    const ph = { mesh: buildHeli(0x5a6050), bones: new Float32Array(64), m: M4.create(), pos: [-48, hy + .1, -35], yaw: .8, rotor: 0, door: 0 }; G.heliBones(ph); G.extras.push({ mesh: ph.mesh, bones: ph.bones, pos: ph.pos, r: 10 }); W.colBox(-48, hy + 1.6, -35, 2.6, 3, 7, { surf: 'metal' });
    for (const [x, z] of [[-22, 46], [-14, 48]]) { const y = W.th(x, z); W.B.col(0xd8dcd8, MAT.PAINT).push().t(x, y + 1.6, z).ry(.2).cylZ(0, 0, 0, 1.5, 7, 16).pop(); W.colBox(x, y + 1.5, z, 3, 3, 7, { surf: 'metal' }); } for (let i = 0; i < 4; i++) W.barrel(-18 + i * .7, 42, W.th(-18, 42), 0, true);
    /* ---- relays ---- */
    let relays = 0; this._relays = [];
    for (const [x, z, n] of [[-62, -52, 'RELAY ONE'], [64, -62, 'RELAY TWO'], [-6, -92, 'RELAY THREE']]) { const sp = relayTower(W, x, z); this._relays.push({ p: [x, z], spot: plantSpot(W, G, sp, n, () => { relays++; const o = G.obj('relays'); o.text = 'Sabotage the three relay transmitters (' + relays + '/3)'; G.updateObjectivesHUD(); if (relays >= 3) G.complete('relays'); }) }); }
    /* ---- props ---- */
    for (const [x, z] of [[-20, -5], [20, -5], [-60, 0], [0, 30], [55, 45], [-30, -45]]) { const y = W.th(x, z); W.crateStack(x, z, y); if (R() < .6) W.sandbags(x + 2, z + 1.5, 2.5, R() < .5 ? 0 : 1); }
    for (let i = 0; i < 5; i++) W.crate(-30 + R() * 5, 32 + R() * 3, W.th(-30, 32), .8, .7, .8, 0x5a6a4a, true);
    W.ammoPickup(-27, W.th(-27, 30) + .05, 30);
    for (const [x, z] of [[-15, 10], [15, 10], [-25, -40], [30, 0], [0, 50], [-55, -20]]) W.lampPost(x, z, 5, 0xfff0d0);
    W.floodlight(-10, -5, Math.atan2(-10, -5 - -20), 6); W.floodlight(25, -50, Math.atan2(25 - 38, -50 - -38), 6);
    /* ---- vegetation & rocks ---- */
    const inSt = (x, z) => Math.hypot(x, z + 5) < 82; const nearR = (x, z) => [road, road2].some(r => r.some((p, i) => i < r.length - 1 && (() => { const a = r[i], b = r[i + 1]; const dx = b[0] - a[0], dz = b[1] - a[1]; const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz), 0, 1); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < 8; })()));
    scatter(W, 240, (x, z) => W.tree(x, z, 'pine', .8 + R() * .7), (x, z) => !inSt(x, z) && !nearR(x, z) && Math.hypot(x + 96, z - 78) > 14, R);
    scatter(W, 110, (x, z) => W.rock(x, z, 1 + R() * 2.5, 0x5a5e62), (x, z) => !inSt(x, z) && !nearR(x, z), R);
    scatter(W, 18, (x, z) => W.rock(x, z, .8 + R(), 0x5a5e62), (x, z) => inSt(x, z) && Math.hypot(x, z + 5) > 60 && W.query(x - 4, z - 4, x + 4, z + 4, []).length === 0, R);
    scatter(W, 60, (x, z) => W.bush(x, z, .7, 0x4a5a4a), (x, z) => !inSt(x, z) && !nearR(x, z), R);
    /* ---- cameras ---- */
    G.addCam([0, cc.fy + 3.3, -13.8], Math.PI, .9, true).label = 'CAM 1 — CONTROL CENTRE'; G.addCam([-13.2, cc.fy + 3.3, -22], Math.PI / 2, .8, true).label = 'CAM 2 — WEST WING'; G.addCam([46.5, W.th(46, 15) + 4, 14.8], Math.PI, .7, true).label = 'CAM 3 — GARAGE';
    G.addCam([-60, W.th(-60, -48) + 5, -48], Math.PI * .25, .9, true).label = 'CAM 4 — RELAY ONE'; G.addCam([9, W.th(9, 58) + 3.4, 57.8], 0, .9, true).label = 'CAM 5 — GATE';
    G.addSecurityConsole([8.5, cc.fy + 1.15, -20.2]);
    /* ---- exfil truck ---- */
    const ex = G.addVehicle('truck', 6, 172, -Math.PI / 2, { drivable: false, color: 0x4a5040 }); ex.lightsOn = false; this._ex = ex;
    const drv = new Rig(buildCharacter(appearanceFor('militia', R, { head: 'beanie', shirt: 0x3a4030, camo: false }))); G.extras.push({ mesh: drv.mesh, bones: drv.bones, pos: ex.pos, r: 3 });
    G.extraUpdaters.push(dt => { const j = P_(); poseSit(j, G.time, 2, false); pj(j, SK.UAL, .8, 0, -.1); pj(j, SK.FAL, .9, 0, 0); pj(j, SK.UAR, .8, 0, .1); pj(j, SK.FAR, .9, 0, 0); drv.tj.set(j); drv.tpy = -.5; drv.blend(10, dt); M4.copy(drv.root, ex.m); M4.translate(drv.root, drv.root, -.42, 1.05, -ex.def.L * .03); drv.solve(null, false); });
    W.interact.push({ r: 3, wide: true, pos: () => M4.pt(ex.m, 0, 1.6, ex.def.L * .5 + .3), label: () => P.state !== 'ground' ? '' : this.canExtract(G) ? '[E] BOARD EXFIL TRUCK' : 'EXFIL TRUCK — COMPLETE PRIMARY OBJECTIVES FIRST', anim: 'reach', dur: .7, at: .45, act: () => { if (!this.canExtract(G)) return; G.extractTruck(ex, road2.slice(3)); this._relays.forEach((r, i) => G.after(() => { const y = W.th(r.p[0], r.p[1]); G.explode([r.p[0] + 3, y + 1, r.p[1]], 8, 0); G.dlights.push({ pos: [r.p[0], y + 15, r.p[1]], col: [1, .5, .2], i: 20, range: 90, life: 1.5 }); }, 3500 + i * 1300)); } });
    /* ---- NPCs ---- */
    const N = d => G.addNPC(Object.assign({ faction: 'militia' }, d));
    N({ post: 'Gate', group: 'gate', weapon: 'ak', pos: [4, 64], routine: [{ t: 'talk', pos: [4, 64], yaw: Math.PI / 2, group: 'gate', dur: 60 }, { t: 'guard', pos: [2, 66], yaw: Math.PI, dur: 50 }] });
    N({ group: 'gate', weapon: 'rifle', pos: [2, 64], prop: 'cig', routine: [{ t: 'talk', pos: [2.2, 64.2], yaw: -Math.PI / 2, group: 'gate', dur: 70 }, { t: 'sit', anchor: 'gate_seat', dur: 40 }] });
    N({ name: 'Volkov', weapon: 'pistol', radioOp: true, loot: 'keycard', hp: 120, pos: [-8.5, -17], app: { head: 'beanie', beard: true, bulk: 1.15, vest: false }, routine: [{ t: 'sit', anchor: 'chief_seat', dur: 60 }, { t: 'patrol', pts: [[-2, -21], [-9, -24.5], [-2, -21], [0, -12], [-30, 5], [-40, 8], [-30, 5], [0, -12]], wait: 5 }, { t: 'sit', anchor: 'chief_seat', dur: 40 }] });
    N({ weapon: 'smg', role: 'worker', camOp: true, pos: [8, -18], routine: [{ t: 'sit', anchor: 'sec_seat' }] });
    N({ weapon: 'pistol', role: 'worker', pos: [-9, -28], routine: [{ t: 'sit', anchor: 'com_seat', dur: 80 }, { t: 'idle', pos: [-11, -24.5], yaw: Math.PI / 2, anim: 'radio', dur: 15 }] });
    N({ weapon: 'pistol', role: 'worker', pos: [10, -26], routine: [{ t: 'sit', anchor: 'srv_seat' }] });
    N({ weapon: 'ak', pos: [0, -19], routine: [{ t: 'patrol', pts: [[-10, -22], [10, -22], [0, -18], [0, -11]], wait: 4 }] });
    N({ weapon: 'ak', pos: [-45, 12], routine: [{ t: 'sit', anchor: 'bar_seat', dur: 90 }, { t: 'smoke', pos: [-43, 22], yaw: Math.PI, dur: 30 }], prop: 'cig' });
    N({ weapon: 'rifle', pos: [-40, 12], routine: [{ t: 'sit', anchor: 'bar_seat' }] });
    N({ group: 'kit', weapon: 'ak', pos: [-33, 12], prop: 'cup', routine: [{ t: 'talk', pos: [-33.2, 12.5], yaw: Math.PI / 2, group: 'kit' }] });
    N({ group: 'kit', weapon: 'shotgun', pos: [-35, 12], routine: [{ t: 'talk', pos: [-35, 12.4], yaw: -Math.PI / 2, group: 'kit' }] });
    N({ role: 'worker', weapon: 'pistol', pos: [40, 16], app: { head: 'beanie', vest: false }, routine: [{ t: 'work', anchor: 'gar_work' }] });
    N({ weapon: 'ak', pos: [44, 28], prop: 'cig', routine: [{ t: 'smoke', pos: [45, 28], yaw: Math.PI, dur: 50 }, { t: 'patrol', pts: [[45, 28], [55, 10], [45, -15], [45, 28]], wait: 3 }] });
    N({ role: 'worker', weapon: 'pistol', pos: [38, -38], routine: [{ t: 'sit', anchor: 'rad_seat' }] });
    N({ post: 'Tower one', elevated: true, static: true, weapon: 'rifleL', pos: [t1[0], t1[2]], routine: [{ t: 'guard', pos: [t1[0] - .5, t1[2] - .5], yaw: Math.PI * .7, look: true }] });
    N({ post: 'Tower two', elevated: true, static: true, weapon: 'rifleL', pos: [t2[0], t2[2]], routine: [{ t: 'guard', pos: [t2[0] - .5, t2[2] - .5], yaw: -Math.PI / 2, look: true }] });
    N({ post: 'Relay one', weapon: 'ak', pos: [-58, -50], routine: [{ t: 'patrol', pts: [[-58, -48], [-66, -56], [-56, -60]], wait: 6, look: true }] });
    N({ post: 'Relay two', weapon: 'ak', pos: [60, -60], routine: [{ t: 'guard', pos: [61, -58], yaw: Math.PI * .8, look: true, dur: 60 }, { t: 'patrol', pts: [[68, -58], [58, -68]], wait: 5 }] });
    N({ post: 'Relay three', weapon: 'rifle', pos: [-3, -88], prop: 'cig', routine: [{ t: 'smoke', pos: [-2, -88], yaw: Math.PI, dur: 60 }, { t: 'patrol', pts: [[-10, -86], [2, -90]], wait: 6, look: true }] });
    N({ weapon: 'rifle', pos: [-30, -30], routine: [{ t: 'patrol', pts: [[-30, -30], [-55, -10], [-50, 30], [-20, 45], [20, 45], [50, 20], [55, -30], [20, -50], [-10, -50]], wait: 3, look: true }] });
    N({ weapon: 'ak', pos: [20, -5], routine: [{ t: 'patrol', pts: [[20, -5], [-20, 0], [-20, 30], [20, 30]], wait: 4 }] });
    N({ group: 'pad', weapon: 'ak', pos: [-44, -30], routine: [{ t: 'talk', pos: [-44, -29.5], yaw: -Math.PI / 2, group: 'pad' }] });
    N({ group: 'pad', weapon: 'pistol', role: 'worker', pos: [-42, -30], app: { head: 'helmet', vest: false }, routine: [{ t: 'talk', pos: [-42.3, -29.7], yaw: Math.PI / 2, group: 'pad' }] });
    for (const g of ['gate', 'kit', 'pad']) G.addGroup(g, pick(TALK.militia).concat(pick(TALK.militia)));
  },
  start(G) { G.introHeli({ from: [-330, 160, 330], to: [-96, 78], toY: 0, color: 0x3a4232, title: 'FROSTLINE', sub: 'OPERATION WHITE SPIDER', meta: 'STATION 9 · 13:05 LOCAL · HELICOPTER INSERTION' }); G.heli.toY = G.W.th(-96, 78) + 2.4; },
  update(G) {
    let m = null; if (!G.obj('relays').done) { let bd = 1e9; for (const r of this._relays) if (!r.spot.planted) { const d = Math.hypot(r.p[0] - P.pos[0], r.p[1] - P.pos[2]); if (d < bd) { bd = d; m = [r.p[0] + 3, G.W.th(r.p[0], r.p[1]) + 2, r.p[1]]; } } }
    else if (!G.obj('codes').done) m = [-1, 42, -26]; else m = [6, 21, 172]; G.marker = m;
  },
  onPickup(G, item) { if (item === 'codes') G.complete('codes'); if (item === 'dossier') G.complete('dossier'); },
  canExtract(G) { return G.obj('relays').done && G.obj('codes').done; },
};
const MISSIONS = [M1, M2, M3];
