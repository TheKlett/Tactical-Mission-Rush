/* =====================================================================
   PROPS v2 — luxury interiors, gardens, bank & city furniture; working
   elevators; road-vehicle insertion cinematic (truck / van).
   ===================================================================== */
Object.assign(World.prototype, {
  chandelier(x, y, z, s = 1, group = 'power') {
    const D = this.D; D.col(0xc9a23a, MAT.METAL).cyl(x, y - .1, z, .02, .02, 1.2, 5).torus(x, y - .9 * s, z, .45 * s, .02, 18, 4).torus(x, y - 1.15 * s, z, .3 * s, .018, 16, 4).sph(x, y - 1.1 * s, z, .08, .25 * s, .08, 8, 5);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; const px = x + Math.cos(a) * .45 * s, pz = z + Math.sin(a) * .45 * s; D.col(0xfff2c8, MAT.EMIT).sph(px, y - .82 * s, pz, .04, .06, .04, 6, 4); D.col(0xe8f0f8, MAT.GLASS).sph(px, y - 1.0 * s, pz, .02, .08, .02, 5, 3); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; D.col(0xe8f0f8, MAT.GLASS).sph(x + Math.cos(a) * .3 * s, y - 1.25 * s, z + Math.sin(a) * .3 * s, .015, .05, .015, 4, 3); }
    return this.light([x, y - 1.2 * s, z], 0xffe2b0, 2.4, 13 * s, { group, glow: .9 });
  },
  painting(x, y, z, q, w = 1.2, h = .9, seed = 1) {
    const B = this.D; const R0 = mulberry(seed * 31); B.push().t(x, y, z).ry(q * Math.PI / 2);
    B.col(0xa07a30, MAT.METAL).box(0, 0, 0, w + .12, h + .12, .05); B.col(0x2a2018, MAT.PAINT).box(0, 0, .02, w, h, .02);
    const pal = [[0x5a6a3a, 0x8a7a4a, 0x3a4a5a], [0x7a2a1a, 0xc08040, 0x2a1a10], [0x2a3a5a, 0x8a9ab0, 0xd0c8a0], [0x3a2a3a, 0xa08a6a, 0x6a1a1a]][Math.abs(seed * 7 | 0) % 4];
    for (let i = 0; i < 8; i++) { B.col(pal[(R0() * 3) | 0], MAT.CANVAS).box((R0() - .5) * w * .7, (R0() - .5) * h * .7, .032, w * (.15 + R0() * .4), h * (.1 + R0() * .35), .004); }
    B.pop();
  },
  piano(x, z, fy, q) {
    const B = this.B; B.push().t(x, fy, z).ry(q * Math.PI / 2); B.col(0x0a0a0c, MAT.PLASTIC);
    B.box(0, .75, .2, 1.5, .3, 1.8).box(.2, .95, .7, 1.1, .05, 1.0); B.push().t(0, 1.25, .2).rx(-.6).box(0, .3, .5, 1.5, .03, 1.4).pop();
    B.col(0xf0f0ea, MAT.PLASTIC).box(0, .78, -.72, 1.3, .03, .16); B.col(0x0a0a0a, MAT.PLASTIC); for (let i = 0; i < 26; i++) if (i % 7 !== 2 && i % 7 !== 6) B.box(-.62 + i * .05, .8, -.74, .022, .02, .09);
    B.col(0x0a0a0c, MAT.PLASTIC); for (const [a, b] of [[-.65, -.5], [.65, -.5], [0, .95]]) B.cyl(a, 0, b, .05, .06, .6, 8); B.col(0xc9a23a, MAT.METAL).box(0, .1, -.3, .2, .05, .05);
    B.col(0x0a0a0c, MAT.LEATHER).box(0, .48, -1.15, .7, .08, .35); B.pop();
    this.colRot(x, fy, z, q, 0, .2, 1.5, 1.1, 1.8, { surf: 'wood' });
  },
  barCounter(x0, z0, x1, z1, fy, tag) {
    const B = this.B; const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    B.col(0x3a1e12, MAT.WOOD).box(cx, fy + .55, cz, w, 1.1, d); B.col(0x1a1a1a, MAT.CONC).box(cx, fy + 1.12, cz, w + .1, .05, d + .1); B.col(0xc9a23a, MAT.METAL).box(cx, fy + .15, cz + (d / 2 + .08) * (w > d ? 1 : 0), w > d ? w : .03, .03, w > d ? .03 : d);
    this.colBox(cx, fy + .57, cz, w, 1.15, d, { surf: 'wood', sight: false });
    const D = this.D; for (let i = 0; i < 8; i++) { const t = (i + .5) / 8; D.col([0x2a5a2a, 0x6a4a1a, 0xc0c0c0, 0x5a1a1a][i % 4], MAT.GLASS).cyl(lerp(x0, x1, t), fy + 1.15, lerp(z0, z1, t), .035, .03, .3, 6); }
    if (tag) this.anchor(tag + '_work', { pos: [cx, fy, cz - (w > d ? d / 2 + .5 : 0)], yaw: 0, kind: 'work' });
  },
  barShelves(x, z, fy, w, q) { const B = this.B; B.push().t(x, fy, z).ry(q * Math.PI / 2); B.col(0x2a1a10, MAT.WOOD).box(0, 1.4, 0, w, 2.8, .3); B.col(0xd0d8e0, MAT.GLASS).box(0, 1.6, -.16, w - .2, 1.6, .01); for (let r = 0; r < 3; r++) for (let i = 0; i < w / .12 - 2; i++) { B.col([0x2a5a2a, 0x6a3a10, 0xc8b878, 0x5a1020, 0x1a1a1a][(i + r) % 5], MAT.GLASS).cyl(-w / 2 + .2 + i * .12, 1.0 + r * .55, -.05, .035, .03, .3, 6); } B.pop(); this.colRot(x, fy, z, q, 0, 0, w, 2.8, .3, { surf: 'wood' }); },
  roundTable(x, z, fy, r, tag, chairs = 6, cloth = 0xf2f0ea) {
    const B = this.B; B.col(cloth, MAT.CLOTH).cyl(x, fy + .3, z, r + .06, r + .02, .47, 18); B.cyl(x, fy + .76, z, r, r, .02, 18); B.col(0x3a2a1a, MAT.WOOD).cyl(x, fy, z, .2, .08, .3, 8);
    this.D.col(0xd0e0e8, MAT.GLASS); for (let i = 0; i < chairs; i++) { const a = i / chairs * TAU; this.D.cyl(x + Math.cos(a) * r * .7, fy + .78, z + Math.sin(a) * r * .7, .03, .03, .14, 6); this.D.col(0xf8f8f8, MAT.PLASTIC).cyl(x + Math.cos(a) * r * .75, fy + .775, z + Math.sin(a) * r * .75, .12, .12, .01, 10); this.D.col(0xd0e0e8, MAT.GLASS); }
    this.D.col(0xfff0c0, MAT.EMIT).cyl(x, fy + .78, z, .03, .03, .12, 6); this.D.col(0x2a5a2a, MAT.LEAF).blob(x, fy + .9, z, .18, .1, x + z, .3, 6, 4);
    this.colBox(x, fy + .4, z, r * 1.6, .8, r * 1.6, { surf: 'wood', sight: false });
    for (let i = 0; i < chairs; i++) { const a = i / chairs * TAU + .3; const cx = x + Math.cos(a) * (r + .45), cz = z + Math.sin(a) * (r + .45); const yaw = Math.atan2(-(x - cx), -(z - cz)); const B2 = this.B; B2.push().t(cx, fy, cz).ry(yaw + Math.PI); this.chairGeo(B2); B2.pop(); if (tag) this.anchor(tag + '_seat', { pos: [cx, fy, cz], yaw, kind: 'sit' }); }
  },
  hedge(x0, z0, x1, z1, h = 1.4) { const y = this.th((x0 + x1) / 2, (z0 + z1) / 2); const w = Math.abs(x1 - x0) || .9, d = Math.abs(z1 - z0) || .9; this.B.col(0x2a4a22, MAT.LEAF); this.B.jit = .05; this.B.box((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2, w, h, d); this.B.jit = 0; this.D.col(0x355a28, MAT.LEAF); for (let i = 0; i < (w + d) / .8; i++) this.D.blob(lerp(x0, x1, this.R()), y + h - .05, lerp(z0, z1, this.R()), .35, .18, i + x0, .3, 6, 3); this.colBox((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2, w, h, d, { surf: 'grass', sight: true }); this.mline(x0, z0, x1, z0); this.mline(x1, z0, x1, z1); this.mline(x1, z1, x0, z1); this.mline(x0, z1, x0, z0); },
  fountain(x, z) { const y = this.th(x, z); const B = this.B; B.col(0xd8d0c0, MAT.CONC).cyl(x, y, z, 3.2, 3.3, .55, 24).cyl(x, y + .3, z, .5, .6, 1.4, 12).cyl(x, y + 1.6, z, 1.1, .4, .25, 16).sph(x, y + 2.1, z, .25, .4, .25, 10, 6); B.col(0x3a6a8a, MAT.GLASS).cyl(x, y + .45, z, 3, 3, .02, 24); B.col(0x6a9ab0, MAT.GLASS).cyl(x, y + 1.82, z, 1, 1, .02, 16); this.colBox(x, y + .4, z, 6, .8, 6, { surf: 'concrete', sight: false }); this.light([x, y + .8, z], 0x80c0ff, 1.2, 6, { glow: .3 }); this.fountains = (this.fountains || []).concat([[x, y + 2.3, z]]); },
  pool(x0, z0, x1, z1, y) {
    const B = this.B; const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    B.col(0xe8e4dc, MAT.TILE).box(cx, y - .02, z0 - .4, w + 1.6, .1, .8).box(cx, y - .02, z1 + .4, w + 1.6, .1, .8).box(x0 - .4, y - .02, cz, .8, .1, d).box(x1 + .4, y - .02, cz, .8, .1, d);
    B.col(0x7ac0d8, MAT.TILE).box(cx, y - 1.6, cz, w, .1, d); B.box(cx, y - .8, z0 + .05, w, 1.6, .1).box(cx, y - .8, z1 - .05, w, 1.6, .1).box(x0 + .05, y - .8, cz, .1, 1.6, d).box(x1 - .05, y - .8, cz, .1, 1.6, d);
    B.col(0x2a8ab0, MAT.GLASS).box(cx, y - .12, cz, w - .1, .02, d - .1);
    for (let i = 0; i < 6; i++) this.light([lerp(x0 + 1, x1 - 1, i / 5), y - 1.2, cz], 0x40b0ff, 1.4, 7, { glow: 0 });
    this.col(x0 - .8, y - 2, z0 - .8, x1 + .8, y + .2, z0, { surf: 'concrete', walk: true }); this.col(x0 - .8, y - 2, z1, x1 + .8, y + .2, z1 + .8, { surf: 'concrete', walk: true });
    this.col(x0, y - 2, z0, x1, y + .9, z1, { surf: 'water', sight: false, bullet: false }); this.mline(x0, z0, x1, z0); this.mline(x1, z0, x1, z1); this.mline(x1, z1, x0, z1); this.mline(x0, z1, x0, z0);
  },
  lounger(x, z, yaw) { const y = this.th(x, z); const B = this.B; B.push().t(x, y, z).ry(yaw); B.col(0xf0f0ea, MAT.PLASTIC).box(0, .3, .3, .65, .06, 1.3).push().t(0, .3, -.35).rx(.7).box(0, 0, -.3, .65, .06, .65).pop(); B.col(0x1a3a5a, MAT.CLOTH).box(0, .35, .3, .6, .05, 1.25); B.col(0xc0c0c0, MAT.METAL).box(-.3, .15, .3, .03, .3, 1.2).box(.3, .15, .3, .03, .3, 1.2); B.pop(); this.colBox(x, y + .3, z, .9, .6, 1.6, { surf: 'wood', sight: false }); },
  parasol(x, z, col = 0xe8e0d0) { const y = this.th(x, z); const B = this.B; B.col(0x3a2a1a, MAT.WOOD).cyl(x, y, z, .03, .03, 2.4, 6); B.col(col, MAT.CANVAS).cyl(x, y + 2.1, z, 1.6, .05, .5, 12, 1); this.colBox(x, y + 1.2, z, .1, 2.4, .1, { surf: 'wood' }); },
  stringLights(p0, p1, n = 12, sag = .6) { const D = this.D; for (let i = 0; i <= n; i++) { const t = i / n; const p = [lerp(p0[0], p1[0], t), lerp(p0[1], p1[1], t) - Math.sin(t * Math.PI) * sag, lerp(p0[2], p1[2], t)]; D.col(0xfff0b0, MAT.EMIT).sph(p[0], p[1], p[2], .05, .06, .05, 5, 3); } D.col(0x111111, MAT.RUBBER).beam(p0, [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 - sag, (p0[2] + p1[2]) / 2], .01).beam([(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 - sag, (p0[2] + p1[2]) / 2], p1, .01); this.light([(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 - sag, (p0[2] + p1[2]) / 2], 0xffd890, 1.4, 10, { glow: 0 }); },
  statue(x, z, s = 1) { const y = this.th(x, z); const B = this.B; B.col(0xd8d4cc, MAT.CONC).box(x, y + .6, z, 1, 1.2, 1); B.col(0xe8e4dc, MAT.ROCK).cyl(x, y + 1.2, z, .25 * s, .2 * s, 1.1 * s, 10).sph(x, y + 2.45 * s, z, .14 * s, .17 * s, .14 * s, 10, 6).sph(x, y + 2.1 * s, z, .3 * s, .2 * s, .2 * s, 10, 6).blob(x, y + 1.7 * s, z, .3 * s, .4 * s, x, .1); this.colBox(x, y + 1, z, 1, 2, 1, { surf: 'concrete' }); },
  lanternPost(x, z, h = 3, group = 'power') { const y = this.th(x, z); this.B.col(0x1a1a1a, MAT.METAL).cyl(x, y, z, .07, .05, h, 8).box(x, y + h + .2, z, .3, .4, .3); this.B.col(0xfff0c0, MAT.EMIT).box(x, y + h + .2, z, .24, .32, .24); this.colBox(x, y + h / 2, z, .2, h, .2, { surf: 'metal' }); return this.light([x, y + h + .1, z], 0xffd8a0, 2, 12, { group, glow: .6 }); },
  bigPlant(x, z, fy) { const D = this.D; D.col(0xd8d0c0, MAT.CONC).cyl(x, fy, z, .3, .35, .6, 12); D.col(0x2e5a26, MAT.LEAF); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + this.R(); D.beam([x, fy + .55, z], [x + Math.cos(a) * .7, fy + 1.4 + this.R() * .8, z + Math.sin(a) * .7], .14, .015); } this.colBox(x, fy + .4, z, .6, .8, .6, { surf: 'wood', sight: false }); },
  tellerCounter(x0, x1, z, fy, tag) {
    const B = this.B; const cx = (x0 + x1) / 2, w = x1 - x0; B.col(0xe0dcd4, MAT.CONC).box(cx, fy + .55, z, w, 1.1, .8); B.col(0x2a2a2e, MAT.CONC).box(cx, fy + 1.12, z, w + .05, .05, .85);
    B.col(0xa8c8d0, MAT.GLASS).box(cx, fy + 1.75, z - .2, w, 1.2, .02); B.col(0x8a8a8a, MAT.METAL); for (let x = x0; x <= x1 + .01; x += 2) B.box(x, fy + 1.75, z - .2, .05, 1.2, .05);
    for (let x = x0 + 1; x < x1; x += 2) { B.col(0x1a1a1a, MAT.PLASTIC).box(x, fy + 1.35, z + .1, .45, .32, .04); B.col(0x3a6a9a, MAT.EMIT).box(x, fy + 1.35, z + .078, .4, .27, .004); B.col(0x111111, MAT.PLASTIC).box(x, fy + 1.15, z + .2, .4, .02, .14); if (tag) this.anchor(tag + '_work', { pos: [x, fy, z + .75], yaw: 0, kind: 'work' }); }
    this.col(x0, fy, z - .45, x1, fy + 2.35, z + .4, { surf: 'concrete', sight: false, bullet: true }); this.mline(x0, z, x1, z);
  },
  glassWall(x0, z0, x1, z1, fy, h, door) {
    const alongX = Math.abs(z1 - z0) < .01; const L = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0); const ops = door !== undefined && door !== null ? [{ at: L / 2 + door, w: 1, h: 2.1, kind: 'door', door: { col: 0x8a9aa0, label: 'GLASS DOOR' } }] : [];
    // frame + glass panes (destructible)
    const B = this.B; B.col(0x9a9a9a, MAT.METAL); const segs = Math.max(1, Math.round(L / 1.6));
    for (let i = 0; i <= segs; i++) { const t = i / segs; const x = lerp(x0, x1, t), z = lerp(z0, z1, t); B.box(x, fy + h / 2, z, .06, h, .06); }
    B.box((x0 + x1) / 2, fy + h - .03, (z0 + z1) / 2, alongX ? L : .06, .06, alongX ? .06 : L); B.box((x0 + x1) / 2, fy + .05, (z0 + z1) / 2, alongX ? L : .08, .1, alongX ? .08 : L);
    const dA = ops.length ? ops[0].at - .55 : 1e9, dB = ops.length ? ops[0].at + .55 : -1e9;
    for (let i = 0; i < segs; i++) { const s0 = i / segs * L, s1 = (i + 1) / segs * L; if (s1 > dA && s0 < dB) continue; const m = (s0 + s1) / 2; const x = alongX ? Math.min(x0, x1) + m : x0, z = alongX ? z0 : Math.min(z0, z1) + m; this.addGlass(x, fy + h / 2, z, alongX ? (s1 - s0) - .06 : .02, h - .2, alongX ? .02 : (s1 - s0) - .06); }
    if (ops.length) { const a = alongX ? [Math.min(x0, x1) + dA + .05, z0] : [x0, Math.min(z0, z1) + dA + .05]; const b2 = alongX ? [Math.min(x0, x1) + dB - .05, z0] : [x0, Math.min(z0, z1) + dB - .05]; this.addDoor(a, b2, fy, 2.1, alongX, { col: 0xa8c0c8, label: 'GLASS DOOR' }, .05); B.col(0xa8c8d0, MAT.GLASS).box(alongX ? (a[0] + b2[0]) / 2 : x0, fy + 2.6, alongX ? z0 : (a[1] + b2[1]) / 2, alongX ? 1 : .02, h - 2.2, alongX ? .02 : 1); }
    this.mline(x0, z0, x1, z1);
  },
  vaultDoor(x, y, z, q, open = .9) {
    const B = this.B; B.push().t(x, y, z).ry(q * Math.PI / 2);
    B.col(0x4a4e52, MAT.METAL).box(-1.75, 1.5, 0, .5, 3, .8).box(1.75, 1.5, 0, .5, 3, .8).box(0, 3.2, 0, 4, .5, .8);
    B.push().t(-1.4, 1.5, -.4).ry(-open * 1.6); B.col(0x8a8e92, MAT.METAL).cylZ(1.4, 0, -.35, 1.35, .7, 32); B.col(0x6a6e72, MAT.METAL).cylZ(1.4, 0, -.72, 1.1, .05, 32); B.col(0xc0c4c8, MAT.METAL).cylZ(1.4, 0, -.78, .3, .1, 16);
    for (let i = 0; i < 3; i++) B.push().t(1.4, 0, -.82).rz(i * Math.PI / 3).box(0, 0, 0, 1.1, .08, .06).pop(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; B.col(0xa8acb0, MAT.METAL).cylZ(1.4 + Math.cos(a) * 1.2, Math.sin(a) * 1.2, .05, .08, .3, 10); } B.pop();
    B.pop(); this.colRot(x, y, z, q, -1.75, 0, .5, 3, .8, { surf: 'metal' }); this.colRot(x, y, z, q, 1.75, 0, .5, 3, .8, { surf: 'metal' });
  },
  depositBoxes(x, z, fy, w, q) { const B = this.B; B.push().t(x, fy, z).ry(q * Math.PI / 2); B.col(0x8a7a5a, MAT.METAL).box(0, 1.3, 0, w, 2.6, .4); for (let r = 0; r < 8; r++) for (let i = 0; i < w / .32 - 1; i++) { B.col(this.R() < .15 ? 0x2a2a2a : 0xa8986a, MAT.METAL).box(-w / 2 + .25 + i * .32, .2 + r * .31, -.205, .28, .27, .01); B.col(0x3a3a3a, MAT.METAL).box(-w / 2 + .25 + i * .32 + .09, .2 + r * .31, -.212, .03, .03, .01); } B.pop(); this.colRot(x, fy, z, q, 0, 0, w, 2.6, .4, { surf: 'metal' }); },
  pipes(x0, z0, x1, z1, y, n = 3) { const D = this.D; for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * .22; const alongX = Math.abs(z1 - z0) < .01; D.col([0x6a6e6a, 0x8a4a2a, 0x3a5a7a][i % 3], MAT.METAL).tube([x0 + (alongX ? 0 : o), y - i * .05, z0 + (alongX ? o : 0)], [x1 + (alongX ? 0 : o), y - i * .05, z1 + (alongX ? o : 0)], .06 + (i % 2) * .03, undefined, 8); } },
  facade(x, z, w, d, h, col, seed) {
    const y = this.th(x, z); const B = this.B; const R0 = mulberry(seed * 13 + 7);
    B.col(col, MAT.CONC); B.box(x, y + h / 2, z, w, h, d); this.colBox(x, y + h / 2, z, w, h, d, { surf: 'concrete' }); this.mapRects.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
    const fl = Math.floor(h / 3.4); const D = this.D;
    for (const [nx, nz, len, alongX] of [[0, -d / 2 - .02, w, true], [0, d / 2 + .02, w, true], [-w / 2 - .02, 0, d, false], [w / 2 + .02, 0, d, false]]) {
      const cols = Math.floor(len / 2.2);
      for (let f = 1; f < fl; f++) for (let c = 0; c < cols; c++) { const t = (c + .5) / cols - .5; const lit = R0() < .35; const px = x + nx + (alongX ? t * len : 0), pz = z + nz + (alongX ? 0 : t * len), py = y + f * 3.4 + 1.6;
        D.col(lit ? [0xffe0a8, 0xd8e8ff, 0xffd090][(R0() * 3) | 0] : 0x1a2228, lit ? MAT.EMIT : MAT.GLASS).box(px, py, pz, alongX ? 1.3 : .02, 1.6, alongX ? .02 : 1.3); }
      B.col(lin(col).map(v => v * .75), MAT.CONC); B.box(x + nx * 1.001, y + .6, z + nz * 1.001, alongX ? len : .1, 1.2, alongX ? .1 : len);
    }
    B.col(0x2a2a2a, MAT.METAL).box(x, y + h + .3, z, w * .3, .6, d * .3);
  },
  streetLight(x, z, yaw, group = 'street') { const y = this.th(x, z); const B = this.B; B.col(0x3a3e40, MAT.METAL).cyl(x, y, z, .1, .07, 7, 8); const fx = -Math.sin(yaw), fz = -Math.cos(yaw); B.beam([x, y + 7, z], [x + fx * 1.6, y + 7.2, z + fz * 1.6], .08); B.col(0xe8f0ff, MAT.EMIT).box(x + fx * 1.7, y + 7.1, z + fz * 1.7, .5, .06, .25); this.colBox(x, y + 3.5, z, .25, 7, .25, { surf: 'metal' }); return this.light([x + fx * 1.7, y + 6.9, z + fz * 1.7], 0xe8f0ff, 3, 22, { group, glow: .7, dir: [0, -1, 0], cone: .1 }); },
  barrier(x, z, yaw) { const y = this.th(x, z); this.B.push().t(x, y, z).ry(yaw); this.B.col(0xd8d8d0, MAT.CONC).tbox(0, .4, 0, 2, .8, .6, 1.9, .25); this.B.col(0xc02020, MAT.PAINT).box(0, .6, -.2, 1.8, .12, .02); this.B.pop(); const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw)); this.colBox(x, y + .4, z, 2 * c + .6 * s, .8, 2 * s + .6 * c, { surf: 'concrete', sight: false }); },
});
Object.assign(G, {
  /* ---------------- elevator ---------------- */
  addElevator(o) {
    const W = this.W; const { x, z, floors } = o; const w = 2.2, d = 2.2; const dirs = o.dirs; // door side per floor: 'n' or 's'
    const B = new MB(3000); B.b(0); B.col(0x8a8e92, MAT.METAL).box(0, -.08, 0, w - .1, .16, d - .1); B.col(0x6a5a4a, MAT.WOOD).box(0, 1.2, d / 2 - .07, w - .1, 2.4, .05).box(-w / 2 + .07, 1.2, 0, .05, 2.4, d - .1).box(w / 2 - .07, 1.2, 0, .05, 2.4, d - .1);
    B.col(0xc0c0c0, MAT.METAL).box(0, 1, d / 2 - .1, w - .2, .04, .04); B.col(0xd8d8d8, MAT.METAL).box(0, 2.48, 0, w - .1, .05, d - .1); B.col(0xfff4e0, MAT.EMIT).box(0, 2.45, 0, .8, .02, .8);
    B.col(0x222222, MAT.METAL).box(w / 2 - .1, 1.3, -d / 4, .02, .4, .18); B.col(0xff4020, MAT.EMIT).box(w / 2 - .115, 1.4, -d / 4, .005, .03, .03); B.col(0x40ff60, MAT.EMIT).box(w / 2 - .115, 1.25, -d / 4, .005, .03, .03);
    const ev = { x, z, floors, cur: o.start || 0, y: floors[o.start || 0], target: o.start || 0, mesh: B.mesh(), m: M4.create(), moving: false, doorOpen: 1, w, d, label: o.label || 'ELEVATOR' };
    ev.col = W.col(x - w / 2, ev.y - .2, z - d / 2, x + w / 2, ev.y, z + d / 2, { walk: true, surf: 'metal', nav: false });
    this.extras.push({ mesh: ev.mesh, m: ev.m, pos: [x, (floors[0] + floors[floors.length - 1]) / 2, z], r: 9 });
    // shaft walls (static) with door openings at each floor
    const top = floors[floors.length - 1] + 3, bot = floors[0] - .2;
    W.B.col(0x5a5e62, MAT.CONC); W.box(x - w / 2 - .15, (top + bot) / 2, z, .2, top - bot, d + .5, 0x5a5e62, MAT.CONC); W.box(x + w / 2 + .15, (top + bot) / 2, z, .2, top - bot, d + .5, 0x5a5e62, MAT.CONC);
    ev.doors = [];
    floors.forEach((fy, i) => {
      for (const s of ['n', 's']) {
        const zz = z + (s === 's' ? d / 2 + .15 : -d / 2 - .15); const opening = dirs[i] === s;
        if (!opening) { W.box(x, fy + 1.4, zz, w + .5, 2.8, .2, 0x5a5e62, MAT.CONC); continue; }
        W.box(x - w / 2, fy + 1.4, zz, .4, 2.8, .2, 0x5a5e62, MAT.CONC); W.box(x + w / 2, fy + 1.4, zz, .4, 2.8, .2, 0x5a5e62, MAT.CONC); W.box(x, fy + 2.6, zz, w, .4, .2, 0x5a5e62, MAT.CONC);
        W.D.col(0xc0c4c8, MAT.METAL).box(x, fy + 2.55, zz + (s === 's' ? .12 : -.12), w + .6, .1, .04); W.D.col(0xff9020, MAT.EMIT).box(x, fy + 2.7, zz + (s === 's' ? .12 : -.12), .4, .1, .01);
        const db = new MB(400); db.col(0xb8bcc0, MAT.METAL).box(0, 1.1, 0, (w - .4) / 2, 2.2, .05); const dm = db.mesh();
        const dl = { mesh: dm, m: M4.create(), pos: [x, fy + 1, zz], r: 2 }, dr = { mesh: dm, m: M4.create(), pos: [x, fy + 1, zz], r: 2 };
        const dcol = W.col(x - w / 2 + .2, fy, zz - .08, x + w / 2 - .2, fy + 2.2, zz + .08, { surf: 'metal', nav: false });
        ev.doors.push({ i, zz, fy, dl, dr, dcol, open: i === ev.cur ? 1 : 0 }); this.extras.push(dl, dr);
        W.interact.push({ r: 2.2, wide: true, pos: [x + w / 2 + .35, fy + 1.2, zz + (s === 's' ? .2 : -.2)], label: () => ev.moving || ev.cur === i ? '' : '[E] CALL ' + ev.label, anim: 'press', dur: .6, at: .45, act: () => this.callElevator(ev, i) });
      }
    });
    W.interact.push({ r: 1.6, wide: true, pos: () => [x + w / 2 - .12, ev.y + 1.3, z - d / 4], label: () => ev.moving ? '' : '[E] ' + ev.label + ' — GO TO ' + (o.names ? o.names[(ev.cur + 1) % floors.length] : 'FLOOR ' + ((ev.cur + 1) % floors.length)), anim: 'press', dur: .6, at: .45, act: () => this.callElevator(ev, (ev.cur + 1) % floors.length) });
    this.elevators = (this.elevators || []).concat([ev]); this.extraUpdaters.push(dt => this.updateElevator(ev, dt));
    this.updateElevator(ev, 0); return ev;
  },
  callElevator(ev, i) { if (ev.moving || ev.cur === i && ev.doorOpen > .9) return; ev.target = i; ev.phase = 'close'; ev.moving = true; AUD.beep(1200, .06, .2, [ev.x, ev.y + 1, ev.z]); },
  updateElevator(ev, dt) {
    const inside = !!P.pos && Math.abs(P.pos[0] - ev.x) < ev.w / 2 && Math.abs(P.pos[2] - ev.z) < ev.d / 2 && Math.abs(P.pos[1] - ev.y) < .6;
    if (ev.moving) {
      if (ev.phase === 'close') { ev.doorOpen = Math.max(0, ev.doorOpen - dt * 1.4); if (ev.doorOpen <= 0) { ev.phase = 'move'; if (!ev.snd && AUD.ready) ev.snd = AUD.engineLoop('car', [ev.x, ev.y, ev.z]); } }
      else if (ev.phase === 'move') { const ty = ev.floors[ev.target]; const dy = ty - ev.y; const st = Math.sign(dy) * Math.min(Math.abs(dy), dt * 1.8); ev.y += st; if (inside) { P.pos[1] += st; P.vel[1] = 0; } if (ev.snd) ev.snd.set(.15, .12, [ev.x, ev.y, ev.z]); if (Math.abs(dy) < .005) { ev.y = ty; ev.cur = ev.target; ev.phase = 'open'; AUD.beep(900, .12, .3, [ev.x, ev.y + 1, ev.z]); if (ev.snd) { ev.snd.stop(); ev.snd = null; } } }
      else if (ev.phase === 'open') { ev.doorOpen = Math.min(1, ev.doorOpen + dt * 1.4); if (ev.doorOpen >= 1) { ev.moving = false; ev.phase = null; } }
    }
    M4.trs(ev.m, M4.create(), ev.x, ev.y, ev.z, 0, 0, 0); this.W.moveCol(ev.col, [ev.x - ev.w / 2, ev.y - .2, ev.z - ev.d / 2], [ev.x + ev.w / 2, ev.y, ev.z + ev.d / 2]);
    for (const dd of ev.doors) { const want = dd.i === ev.cur && !ev.moving ? 1 : dd.i === ev.cur ? ev.doorOpen : 0; dd.open = damp(dd.open, want, 10, dt); const off = .15 + dd.open * (ev.w / 2 - .3);
      M4.trs(dd.dl.m, M4.create(), ev.x - off, dd.fy, dd.zz, 0, 0, 0); M4.trs(dd.dr.m, M4.create(), ev.x + off, dd.fy, dd.zz, 0, 0, 0); dd.dcol.on = dd.open < .8; }
  },
  /* ---------------- road vehicle insertion (delivery truck / police van) ---------------- */
  introRoad(o) {
    const v = this.addVehicle(o.kind || 'truck', o.path[0][0], o.path[0][1], 0, { drivable: false, color: o.color ?? 0xe8e8e0, name: o.name }); v.lightsOn = true; v.engine = true;
    const drv = new Rig(buildCharacter(appearanceFor(o.driverFaction || 'staff', this.rng, { top: 'combat', topCol: 0x2a3a4a, head: 'cap' }))); this.extras.push({ mesh: drv.mesh, bones: drv.bones, pos: v.pos, r: 3 });
    const pts = o.path; let s = 0; const len = pts.reduce((a, p, i) => i ? a + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);
    const place = () => { let acc = 0, i = 0; while (i < pts.length - 2 && acc + Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) < s) { acc += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); i++; } const a = pts[i], b = pts[i + 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const k = clamp((s - acc) / L, 0, 1); v.pos[0] = lerp(a[0], b[0], k); v.pos[2] = lerp(a[1], b[1], k); v.yaw = Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])); };
    v.yFn = o.yFn || null; place(); v.pos[1] = this.groundUnder(v); v.col.on = false;
    const ride = { v, done: false };
    const upd = dt => {
      if (!ride.done) { const sp = Math.min(12, (len - s) * .8 + 1.5); s += sp * dt; v.wheelRot += sp / v.def.wr * dt; if (s >= len - .05) { s = len - .05; ride.done = true; v.engine = false; AUD.click(400, .4, v.pos); } place(); v.speed = ride.done ? 0 : sp; v.yaw = dampAng(v.yaw, v.yaw, 1, dt); }
      v.pos[1] = damp(v.pos[1], this.groundUnder(v), 6, dt); this.vehicleBones(v); if (!v.sound && AUD.ready) v.sound = AUD.engineLoop('car', v.pos); if (v.sound) v.sound.set(ride.done ? .05 : .45, ride.done ? 0 : .7, v.pos);
      const j = P_(); poseSit(j, this.time, 2, false); pj(j, SK.UAL, .8, 0, -.1); pj(j, SK.FAL, .9, 0, 0); pj(j, SK.UAR, .8, 0, .1); pj(j, SK.FAR, .9, 0, 0); drv.tj.set(j); drv.tpy = -.5; drv.blend(10, dt); M4.copy(drv.root, v.m); M4.translate(drv.root, drv.root, -.42, 1.05, -v.def.L * .03); drv.solve(null, false);
      if (P.state === 'truckride') { const cm = M4.create(); M4.mul(cm, cm, v.m); M4.translate(cm, cm, 0, 1.9, v.def.L * .32); M4.rotY(cm, cm, Math.PI + clamp(P.yaw, -2, 2)); M4.rotX(cm, cm, P.pitch); P.camOverride = cm; P.pos = M4.pos(v.m); }
    };
    this.extraUpdaters.push(upd); this.roadRide = ride;
    this.W.interact.push({ r: 3.5, wide: true, pos: () => M4.pt(v.m, 0, 1.4, v.def.L * .5 - .3), label: () => P.state === 'truckride' && ride.done ? '[E] ' + (o.exitLabel || 'EXIT THE VEHICLE') : '', anim: 'reach', dur: .7, at: .45,
      act: () => { UI.fade(1, .25); this.after(() => { const p = M4.pt(v.m, 0, 0, v.def.L * .5 + 1.2); p[1] = this.W.ground(p[0], p[2], v.pos[1] + 1.5, 2); P.state = 'ground'; P.pos = p; P.vel = [0, 0, 0]; P.yaw = v.yaw + Math.PI; P.pitch = 0; P.camOverride = null; UI.fade(0, .5); this.complete('insert'); v.col.on = true; this.updateVehicleCol(v); o.onExit && o.onExit(); }, 300); } });
    let t = 0; this.state = 'intro'; this.cineLock = true; UI.letterbox(true); UI.title(o.title, o.sub, o.meta);
    this.cine = { hideVM: true, hideBody: true, update: dt => { t += dt; const shot = o.shots(t, v); P.camOverride = this.camLook(shot[0], shot[1]); if (t > o.cineLen - .5 && !this.cine._f) { this.cine._f = 1; UI.fade(1, .4); } if (t > o.cineLen) { this.cine = null; this.cineLock = false; UI.letterbox(false); UI.fade(0, .6); P.state = 'truckride'; P.yaw = 0; P.pitch = -.1; this.state = 'play'; UI.showHUD(true); IN.lock(); UI.hint(o.hint); } } };
    return v;
  },
});
