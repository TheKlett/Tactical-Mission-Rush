/* =====================================================================
   CHARACTERS v2 — modular human builder: male/female anatomy, faces,
   hair, facial hair, layered clothing, footwear, tactical equipment,
   headgear. Plus the full procedural pose library.
   ===================================================================== */
function buildHand(B, bone, left, glove, skin, open = false) {
  const sx = left ? -1 : 1; B.b(bone); const gl = glove !== skin;
  const C = () => B.col(glove, gl ? MAT.LEATHER : MAT.SKIN);
  C(); B.tbox(0, -.05, 0, .032, .095, .084, .03, .088);              // palm
  B.cyl(0, -.012, 0, .024, .026, .026, 8);                            // wrist
  if (gl) { B.col(0x161616, MAT.RUBBER).box(sx * .018, -.07, 0, .007, .03, .074); B.col(0x2a2a2a, MAT.CLOTH).cyl(0, -.02, 0, .03, .03, .022, 8); }
  else { B.col(lin(skin).map(v => v * .9), MAT.SKIN).box(sx * .017, -.083, 0, .004, .012, .07); }
  const curl = open ? .3 : 1.2;
  for (let i = 0; i < 4; i++) {
    const z = -.031 + i * .0205; const ln = [.034, .039, .037, .029][i]; const r = [.0085, .0088, .0085, .0075][i];
    C(); B.push().t(0, -.096, z).rz(-sx * curl * .5);
    B.cyl(0, -ln, 0, r * .95, r, ln, 6); B.sph(0, 0, 0, r * 1.15, r * 1.1, r * 1.1, 6, 3);
    B.push().t(0, -ln, 0).rz(-sx * curl * .75); B.cyl(0, -ln * .7, 0, r * .85, r * .95, ln * .7, 6);
    B.push().t(0, -ln * .7, 0).rz(-sx * curl * .4); B.cyl(0, -ln * .55, 0, r * .75, r * .85, ln * .55, 6); B.sph(0, -ln * .55, 0, r * .75, r * .7, r * .75, 5, 3); if (!gl) { B.col(0xe8c8b8, MAT.PLASTIC).box(sx * r * .55, -ln * .35, 0, .002, ln * .4, r * 1.2); } B.pop();
    B.pop(); B.pop();
  }
  C(); B.push().t(-sx * .01, -.028, -.042).rx(-.55).rz(-sx * (open ? .3 : .85));
  B.cyl(0, -.034, 0, .011, .013, .034, 6); B.t(0, -.034, 0).rz(-sx * .35).cyl(0, -.026, 0, .009, .011, .026, 6).sph(0, -.026, 0, .009, .008, .009, 5, 3);
  B.pop();
}
/* hair cap: sphere band whose lower edge follows a hairline (front/back elevation) */
function hairCap(B, cx, cy, cz, rx, ry, rz, front, side, back, seg = 14, rings = 7, noise = 0) {
  B.begin(); const R0 = mulberry(7);
  const P = (i, j) => { const th = i / seg * TAU; const az = Math.cos(th + Math.PI / 2); // -z (front) => az=+1 ... back => -1
    const lim = az > 0 ? lerp(side, front, az) : lerp(side, back, -az); const ph = j / rings * lim; const k = noise ? 1 + Math.sin(i * 2.3 + j * 3.1) * noise : 1;
    const sx = Math.sin(ph) * Math.cos(th), sy = Math.cos(ph), sz = Math.sin(ph) * Math.sin(th); return [cx + sx * rx * k, cy + sy * ry * k, cz + sz * rz * k, sx / rx, sy / ry, sz / rz]; };
  for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) { const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1); for (const q of [a, c, b, a, d, c]) { const n = B.tn(q[3], q[4], q[5]); B.vtx(q[0], q[1], q[2], n[0], n[1], n[2]); } }
}
const FACTIONS = {
  cartel: { tops: ['tshirt', 'shirt', 'polo', 'tshirt', 'jacket', 'hoodie', 'shirt'], topCols: [0x6b5b45, 0x3b4a3a, 0x7a2e2a, 0x2f3b4c, 0x8c8478, 0x4a4a42, 0x5e6b52, 0xd8d0c0, 0x22262a], bottoms: ['jeans', 'cargo', 'jeans', 'slacks'], botCols: [0x2c2a26, 0x3d3a30, 0x24303a, 0x4a4235, 0x2a3a5a], heads: ['cap', 'none', 'none', 'bandana', 'cap', 'beanie', 'none'], hair: ['short', 'slick', 'buzz', 'curly', 'side', 'bald', 'pony'], vest: .35, vestType: 'rig', feet: ['combat', 'sneakers', 'combat', 'shoes'], beard: .5, glasses: .2, holster: .5 },
  pmc: { tops: ['combat', 'combat', 'shirt'], topCols: [0x1d2024, 0x23272b, 0x2b2e30, 0x3a3e36], bottoms: ['cargo'], botCols: [0x1b1e21, 0x25282a, 0x2e3128], heads: ['helmet', 'helmet', 'cap', 'helmet', 'headset'], hair: ['buzz', 'short', 'side'], vest: 1, vestType: 'plate', feet: ['combat'], beard: .45, glasses: .1, holster: .9, camo: 0, gloves: 1, vestCols: [0x2a2d2f, 0x3a3b33, 0x24272a] },
  militia: { tops: ['parka', 'combat', 'parka', 'hoodie'], topCols: [0xb8bcc0, 0x9ea4a8, 0x6d7378, 0x4e5458], bottoms: ['snow', 'cargo'], botCols: [0x8f969b, 0x5b6166, 0xa9aeb2], heads: ['beanie', 'hood', 'beanie', 'helmet', 'balaclava', 'beanie'], hair: ['buzz', 'short', 'bald'], vest: .7, vestType: 'rig', feet: ['combat'], beard: .7, glasses: .05, holster: .5, camo: .7, gloves: .9, vestCols: [0x6f7468, 0x5a5e54] },
  security: { tops: ['guard'], topCols: [0x15161a, 0x1c1d22], bottoms: ['slacks'], botCols: [0x15161a], heads: ['earpiece'], hair: ['buzz', 'short', 'slick', 'bald', 'side'], vest: 0, feet: ['shoes'], beard: .3, glasses: .35, holster: 1, gloves: 0 },
  civ: { tops: ['suit', 'tux', 'suit', 'dress', 'dress', 'shirt', 'dress', 'blouse'], topCols: [0x1a1c24, 0x2a2a30, 0x3a2a24, 0x5a1420, 0x14284a, 0xd8c8a8, 0x1a3a2a, 0x6a1a5a, 0xc0a060, 0x101010], bottoms: ['slacks'], botCols: [0x1a1a20, 0x2a2a30], heads: ['none'], hair: ['slick', 'side', 'short', 'long', 'bun', 'pony', 'curly', 'bald'], vest: 0, feet: ['shoes'], beard: .25, glasses: .2, holster: 0, gloves: 0, civ: true },
  staff: { tops: ['waiter'], topCols: [0xeeeeea], bottoms: ['slacks'], botCols: [0x111114], heads: ['none'], hair: ['short', 'slick', 'bun', 'pony', 'side'], vest: 0, feet: ['shoes'], beard: .1, glasses: .15, holster: 0, gloves: 0, civ: true },
  bank: { tops: ['shirt', 'blouse', 'suit', 'polo', 'jacket', 'tshirt', 'dress'], topCols: [0xd8dce4, 0x9ab0c8, 0xe8e0d0, 0x3a4a5a, 0x6a3a3a, 0x2a2a2a, 0x7a8a5a], bottoms: ['slacks', 'jeans'], botCols: [0x2a2a30, 0x3a3a44, 0x24303a], heads: ['none', 'none', 'cap'], hair: ['short', 'long', 'side', 'bun', 'pony', 'curly', 'bald', 'slick'], vest: 0, feet: ['shoes', 'sneakers'], beard: .3, glasses: .35, holster: 0, gloves: 0, civ: true },
  robber: { tops: ['hoodie', 'jacket', 'tshirt', 'combat'], topCols: [0x1a1a1a, 0x2a2e36, 0x4a3a2a, 0x3a1a1a, 0x22262a], bottoms: ['jeans', 'cargo'], botCols: [0x1c2430, 0x2a2a2a, 0x3a3a30], heads: ['skimask', 'skimask', 'balaclava', 'skimask'], hair: ['buzz', 'short'], vest: .6, vestType: 'rig', feet: ['sneakers', 'combat'], beard: 0, glasses: 0, holster: .6, gloves: .9, vestCols: [0x1a1a1a, 0x2a2d2a] },
};
function appearanceFor(faction, rng, o = {}) {
  const F = FACTIONS[faction] || FACTIONS.cartel; const P = a => a[(rng() * a.length) | 0];
  const skins = [0xf0d0b4, 0xe0b896, 0xc89670, 0xa87452, 0x8a5a3c, 0x6b4430, 0x543424];
  let top = P(F.tops); const female = top === 'dress' || top === 'blouse' || (F.civ && rng() < .45 && top !== 'tux') || (faction === 'robber' && rng() < .2) || (faction === 'security' && rng() < .2);
  if (female && (top === 'suit' || top === 'tux')) top = rng() < .6 ? 'dress' : 'blouse';
  if (!female && (top === 'dress' || top === 'blouse')) top = 'suit';
  let hair = P(F.hair); if (female && ['buzz', 'bald', 'slick'].includes(hair)) hair = P(['long', 'bun', 'pony', 'long', 'curly']);
  const a = {
    female, skin: P(skins), hairStyle: hair, hair: P([0x1a1410, 0x3a2a1c, 0x5a4530, 0x111111, 0x7a5a30, 0x2a1a10, 0xa08060, 0x6a6460]),
    top, topCol: P(F.topCols), accent: P([0xe8e4dc, 0x7a1010, 0x1a3a6a, 0xc0a040, 0x2a2a2a, 0x8a8a8a]), bottom: female && top === 'dress' ? 'dress' : P(F.bottoms), botCol: P(F.botCols),
    feet: female && F.civ ? 'heels' : P(F.feet), head: P(F.heads), beard: !female && rng() < F.beard ? P(['stubble', 'full', 'goatee', 'mustache', 'stubble']) : 'none',
    eyewear: rng() < F.glasses ? P(['sunglasses', 'glasses']) : 'none', vest: rng() < F.vest ? (F.vestType || 'plate') : 'none', vestCol: P(F.vestCols || [0x3f3c30, 0x2a2e22, 0x4d4636]),
    camo: rng() < (F.camo ?? .15), gloves: rng() < (F.gloves ?? .5), holster: rng() < F.holster, bulk: (female ? .9 : .95) + rng() * .18, height: (female ? .93 : .97) + rng() * .08,
    rolled: rng() < .3, backpack: faction !== 'civ' && faction !== 'staff' && faction !== 'bank' && rng() < .12, kneepads: rng() < .4, eyeCol: P([0x3a2a1a, 0x2a4a6a, 0x3a5a3a, 0x1a1a1a]), faction,
    dressLong: rng() < .35, tie: P([0x7a1010, 0x1a2a5a, 0x111111, 0x5a5a1a]), radio: faction === 'pmc' || faction === 'militia' || faction === 'security', watch: rng() < .5,
  };
  if (faction === 'cartel' && a.top === 'jacket') a.accent = 0xd8d0c0;
  o = Object.assign({}, o);
  if (o.suit) { o.top = o.top || 'suit'; } if (o.shirt !== undefined) o.topCol = o.shirt; if (o.pants !== undefined) o.botCol = o.pants;
  if (o.head === 'hair') { o.head = 'none'; o.hairStyle = o.hairStyle || 'slick'; } if (o.head === 'bald') { o.head = 'none'; o.hairStyle = 'bald'; }
  if (o.glasses === true) { o.eyewear = 'sunglasses'; } if (o.beard === true) o.beard = 'full'; if (o.vest === true) o.vest = 'plate'; if (o.vest === false) o.vest = 'none';
  if (o.camo === true && !o.top) o.top = 'combat';
  return Object.assign(a, o);
}
/* ======================= BUILD ======================= */
function buildCharacter(app) {
  app = Object.assign({ hair: 0x2a1a10, skin: 0xc89670, eyeCol: 0x3a2a1a, tie: 0x7a1010, accent: 0xe8e4dc, vestCol: 0x3a3e2c, topCol: app.shirt ?? 0x4a5038, botCol: app.pants ?? 0x2c2a26 }, app);
  const B = new MB(26000); const bk = app.bulk || 1; const F = !!app.female;
  const skin = app.skin, sk = () => B.col(skin, MAT.SKIN);
  const top = app.top || (app.suit ? 'suit' : app.camo ? 'combat' : 'tshirt');
  const topCol = app.topCol ?? app.shirt ?? 0x4a5038, botCol = app.botCol ?? app.pants ?? 0x2c2a26;
  const clothMat = (app.camo && (top === 'combat' || top === 'parka')) ? MAT.CAMO : MAT.CLOTH;
  const TC = () => B.col(top === 'suit' || top === 'guard' || top === 'tux' ? (app.suit ?? topCol) : topCol, clothMat);
  const bottom = app.bottom || (app.camo ? 'cargo' : 'cargo'); const BC = () => B.col(bottom === 'jeans' ? (app.botCol ?? 0x2a3a5a) : botCol, bottom === 'cargo' && app.camo ? MAT.CAMO : MAT.CLOTH);
  const dark = c => lin(c).map(v => v * .65), light = c => lin(c).map(v => Math.min(1, v * 1.35));
  const sw = F ? .88 : 1, hw = F ? 1.1 : 1; // shoulder / hip width
  const formal = ['suit', 'tux', 'guard', 'waiter'].includes(top);
  /* ---------- PELVIS ---------- */
  B.b(SK.PEL); BC();
  B.tbox(0, -.01, 0, .3 * bk * hw, .2, .2 * bk, .3 * bk * (F ? .95 : 1), .2 * bk);
  B.sph(-.072 * hw, -.05, .055, .095 * bk, .085, .075, 8, 5); B.sph(.072 * hw, -.05, .055, .095 * bk, .085, .075, 8, 5);
  B.tbox(0, -.1, -.01, .14, .06, .14, .1, .12);
  if (bottom === 'jeans') { B.col(0xc8a050, MAT.METAL).box(0, .03, -.104 * bk, .006, .07, .004); B.col(dark(app.botCol ?? 0x2a3a5a), MAT.CLOTH).box(-.07, -.02, .108 * bk, .07, .08, .01).box(.07, -.02, .108 * bk, .07, .08, .01); }
  // belt
  if (bottom !== 'dress') {
    B.col(0x1a1714, MAT.LEATHER).cyl(0, .055, 0, .158 * bk * hw, .158 * bk * hw, .042, 14); B.col(0x8a8478, MAT.METAL).box(0, .076, -.155 * bk * hw, .05, .034, .012);
    if (!formal && !F) { B.col(0x2a2a26, MAT.CANVAS).box(.155 * bk, .04, .03, .045, .075, .085).box(-.155 * bk, .04, .04, .045, .07, .07).box(-.1, .04, .13 * bk, .07, .06, .04); }
    if (app.radio && !app.vest) { B.col(0x161616, MAT.PLASTIC).box(-.16 * bk, .07, -.03, .03, .1, .055); B.col(0x0d0d0d, MAT.RUBBER).cyl(-.16 * bk, .12, -.03, .004, .003, .09, 4); }
  }
  if (top === 'jacket' || top === 'suit' || top === 'guard' || top === 'tux') { B.col(app.suit ?? topCol, MAT.CLOTH).tbox(0, .02, 0, .335 * bk * hw, .14, .225 * bk, .32 * bk * hw, .22 * bk); }
  if (top === 'parka') { TC(); B.tbox(0, 0, 0, .36 * bk, .18, .26 * bk, .37 * bk, .27 * bk); }
  if (top === 'waiter') { B.col(0x111114, MAT.CLOTH).box(0, -.12, -.115 * bk, .26, .3, .012); }
  if (bottom === 'dress') {
    const len = app.dressLong ? .82 : .5, fl = app.dressLong ? .26 : .3; B.col(topCol, MAT.CLOTH); B.cyl(0, -len - .05, 0, fl, .17 * bk, len + .14, 16, 1);
    B.col(dark(topCol), MAT.CLOTH).cyl(0, -len - .05, 0, fl + .004, fl + .004, .02, 16, 0);
  }
  /* ---------- CHEST ---------- */
  B.b(SK.CH); TC();
  const cw = .33 * bk * sw, cwT = (F ? .35 : .42) * bk * sw;
  B.tbox(0, .1, 0, F ? .27 * bk : .3 * bk, .2, .2 * bk, cw * .98, .21 * bk);                 // abdomen
  B.tbox(0, .29, 0, cw, .2, .21 * bk, cwT, .225 * bk);                                         // chest
  B.tbox(0, .41, .005, cwT * .8, .06, .2 * bk, .2 * sw, .13);                                  // trapezius
  if (F) { B.sph(-.065, .28, -.085 * bk, .075, .07, .065, 8, 5); B.sph(.065, .28, -.085 * bk, .075, .07, .065, 8, 5); }
  else { B.sph(-.08, .3, -.075 * bk, .1 * bk, .085, .055, 8, 5); B.sph(.08, .3, -.075 * bk, .1 * bk, .085, .055, 8, 5); }
  B.sph(-.19 * bk * sw, .37, 0, .075 * bk, .072, .085 * bk, 8, 5); B.sph(.19 * bk * sw, .37, 0, .075 * bk, .072, .085 * bk, 8, 5);
  B.sph(0, .27, .07 * bk, .14 * bk * sw, .14, .06, 8, 5); // upper back
  sk(); B.cyl(0, .37, .005, F ? .045 : .055, F ? .04 : .05, .13, 9); if (!F) B.sph(0, .44, -.04, .012, .016, .012, 5, 3);
  const collar = () => { TC(); B.push().t(-.045, .435, -.06).rz(.5).rx(-.5).box(0, 0, 0, .06, .012, .05).pop().push().t(.045, .435, -.06).rz(-.5).rx(-.5).box(0, 0, 0, .06, .012, .05).pop(); B.torus(0, .43, .0, .062, .012, 12, 4); };
  const buttons = (c, n = 5) => { B.col(c, MAT.PLASTIC); for (let i = 0; i < n; i++) B.sph(0, .38 - i * .065, -.112 * bk - (F && i < 2 ? .02 : 0), .006, .006, .004, 5, 3); };
  if (top === 'tshirt') { B.col(dark(topCol), MAT.CLOTH).torus(0, .42, -.005, .065, .01, 12, 4); if (app.accent && Math.random() < .5) B.col(app.accent, MAT.PAINT).box(0, .3, -.118 * bk, .1, .06, .004); }
  if (top === 'shirt' || top === 'polo' || top === 'blouse') { collar(); buttons(dark(topCol), top === 'polo' ? 3 : 6); if (top === 'shirt') { B.col(dark(topCol), MAT.CLOTH).box(-.085, .31, -.115 * bk, .07, .07, .008).box(-.085, .345, -.117 * bk, .072, .02, .01).box(.085, .31, -.115 * bk, .07, .07, .008); } B.col(dark(topCol)).box(0, .25, -.111 * bk, .02, .3, .004); }
  if (top === 'combat') { collar(); B.col(dark(topCol), MAT.CLOTH).box(0, .28, -.113 * bk, .015, .3, .004); }
  if (top === 'hoodie') { B.col(dark(topCol), MAT.CLOTH).torus(0, .44, .03, .08, .035, 14, 6); B.blob(0, .43, .1, .1, .06, 3, .2, 7, 4); B.box(0, .12, -.112 * bk, .2, .1, .02); B.col(0xdddddd, MAT.CLOTH).tube([-.03, .42, -.08], [-.035, .3, -.115], .004).tube([.03, .42, -.08], [.035, .3, -.115], .004); }
  if (top === 'parka') { TC(); B.tbox(0, .22, 0, cw * 1.12, .42, .27 * bk, cwT * 1.1, .28 * bk); B.col(dark(topCol)); for (let i = 0; i < 4; i++) B.torus(0, .06 + i * .1, 0, .17 * bk, .008, 14, 3); B.col(0x8a7a62, MAT.HAIR).torus(0, .45, .01, .09, .035, 14, 6); B.col(0x222222, MAT.METAL).box(0, .25, -.14 * bk, .012, .4, .006); }
  if (top === 'jacket') { B.col(app.accent ?? 0xd8d0c0, MAT.CLOTH).box(0, .27, -.112 * bk, .1, .3, .01); TC(); B.box(-.1, .24, -.115 * bk, .1, .38, .016).box(.1, .24, -.115 * bk, .1, .38, .016); B.push().t(-.06, .39, -.12 * bk).rz(-.4).box(0, 0, 0, .04, .1, .012).pop().push().t(.06, .39, -.12 * bk).rz(.4).box(0, 0, 0, .04, .1, .012).pop(); B.col(0x111111, MAT.METAL).box(-.05, .25, -.124 * bk, .004, .3, .004); }
  if (formal || top === 'tux') {
    const shirtC = top === 'guard' ? 0x2a2a30 : 0xf0eee8; B.col(shirtC, MAT.CLOTH).tbox(0, .33, -.112 * bk, .1, .16, .012, .05, .012);
    const jc = app.suit ?? topCol;
    if (top === 'waiter') { B.col(0x111114, MAT.CLOTH).tbox(0, .2, -.11 * bk, .26, .26, .02, .2, .02); buttons(0x777777, 3); B.col(0x111111, MAT.CLOTH).box(0, .42, -.115 * bk, .05, .02, .01).sph(-.02, .42, -.118 * bk, .015, .012, .006).sph(.02, .42, -.118 * bk, .015, .012, .006); }
    else {
      B.col(jc, MAT.CLOTH); B.push().t(-.065, .32, -.122 * bk).rz(-.33).box(0, 0, 0, .045, .22, .014).pop().push().t(.065, .32, -.122 * bk).rz(.33).box(0, 0, 0, .045, .22, .014).pop();
      B.col(lin(jc).map(v => v * (top === 'tux' ? .5 : .8)), top === 'tux' ? MAT.PLASTIC : MAT.CLOTH).push().t(-.06, .35, -.127 * bk).rz(-.33).box(0, 0, 0, .028, .14, .006).pop().push().t(.06, .35, -.127 * bk).rz(.33).box(0, 0, 0, .028, .14, .006).pop();
      B.col(0x222222, MAT.PLASTIC).sph(0, .17, -.118 * bk, .007, .007, .004, 5, 3).sph(0, .11, -.118 * bk, .007, .007, .004, 5, 3);
      if (top === 'tux') { B.col(0x0a0a0a, MAT.CLOTH).box(0, .42, -.118 * bk, .05, .02, .01).sph(-.022, .42, -.12 * bk, .016, .013, .006).sph(.022, .42, -.12 * bk, .016, .013, .006); }
      else if (top === 'guard') { B.col(0x111111, MAT.CLOTH).tbox(0, .3, -.122 * bk, .035, .2, .008, .02, .008); B.col(0x222222, MAT.PLASTIC).box(.13, .34, -.11 * bk, .03, .015, .004); }
      else { B.col(app.tie, MAT.CLOTH).tbox(0, .3, -.122 * bk, .035, .22, .008, .02, .008).box(0, .415, -.12 * bk, .028, .025, .012); B.col(0xe8e4dc, MAT.CLOTH).box(-.1, .32, -.124 * bk, .03, .015, .004); }
    }
    if (app.gold) { B.col(0xd4af37, MAT.METAL).torus(0, .4, -.02, .075, .005, 16, 4); }
  }
  if (top === 'dress') {
    B.col(topCol, MAT.CLOTH); sk(); B.tbox(0, .37, -.01, .2, .1, .17, .16, .14); // décolleté skin
    B.col(topCol, MAT.CLOTH).box(-.075, .395, -.02, .02, .06, .1).box(.075, .395, -.02, .02, .06, .1);
    B.col(0xe8e4e0, MAT.METAL).torus(0, .41, -.03, .055, .004, 14, 3).sph(0, .36, -.095, .008, .01, .006, 5, 3);
  }
  // tactical vest
  if (app.vest === 'plate' || app.vest === true) {
    const vc = app.vestCol; B.col(vc, MAT.CANVAS);
    B.tbox(0, .25, -.07 * bk, .3 * bk, .3, .07, .29 * bk, .06); B.tbox(0, .25, .085 * bk, .3 * bk, .32, .07, .29 * bk, .06);
    B.box(-.16 * bk, .14, 0, .03, .14, .22 * bk).box(.16 * bk, .14, 0, .03, .14, .22 * bk);
    B.box(-.12 * bk, .39, 0, .07, .025, .26 * bk).box(.12 * bk, .39, 0, .07, .025, .26 * bk);
    for (let i = -1; i <= 1; i++) { B.col(vc, MAT.CANVAS).box(i * .085, .17, -.125 * bk, .07, .11, .05); B.col(0x161616, MAT.PLASTIC).box(i * .085 - .015, .245, -.125 * bk, .022, .04, .03).box(i * .085 + .015, .245, -.125 * bk, .022, .04, .03); }
    B.col(dark(vc), MAT.CANVAS); for (let y = .2; y < .38; y += .03) B.box(0, y, -.106 * bk, .27 * bk, .008, .004);
    B.col(vc, MAT.CANVAS).box(.08, .33, -.12 * bk, .1, .08, .03); B.col(0x7a1010, MAT.RUBBER).box(-.09, .34, -.12 * bk, .04, .08, .03);
    if (app.radio) { B.col(0x141414, MAT.PLASTIC).box(-.14 * bk, .3, -.115 * bk, .04, .1, .03); B.col(0x0a0a0a, MAT.RUBBER).cyl(-.14 * bk, .35, -.115 * bk, .004, .003, .1, 4).tube([-.13, .34, -.11], [-.06, .43, -.06], .004); }
  } else if (app.vest === 'rig') {
    const vc = app.vestCol; B.col(vc, MAT.CANVAS).box(-.11 * bk, .3, 0, .04, .2, .25 * bk).box(.11 * bk, .3, 0, .04, .2, .25 * bk);
    B.box(0, .17, -.12 * bk, .28 * bk, .12, .05); for (let i = -1; i <= 1; i++) { B.col(0x161616, MAT.PLASTIC).box(i * .085, .245, -.125 * bk, .03, .04, .028); }
    if (app.radio) { B.col(0x141414, MAT.PLASTIC).box(.12 * bk, .26, -.11 * bk, .04, .09, .03); }
  }
  if (app.backpack) { B.col(0x3a3b30, MAT.CANVAS).tbox(0, .22, .17 * bk, .28, .36, .14, .26, .12); B.col(dark(0x3a3b30), MAT.CANVAS).box(0, .12, .25 * bk, .22, .12, .05).box(-.1, .3, .07, .04, .3, .03).box(.1, .3, .07, .04, .3, .03); B.col(0x111111, MAT.METAL).box(0, .38, .245, .1, .01, .02); }
  /* ---------- HEAD ---------- */
  B.b(SK.HD); sk(); const hs = F ? .95 : 1;
  B.cyl(0, -.04, .005, F ? .044 : .052, F ? .041 : .049, .1, 9);
  B.sph(0, .14, .008, .09 * hs, .112 * hs, .1 * hs, 14, 9);
  B.tbox(0, .055, -.03, .11 * hs, .08, .1 * hs, (F ? .095 : .105) * hs, .1 * hs); B.sph(0, .035, -.075, .028 * hs, .022, .022, 7, 4);
  B.sph(-.048 * hs, .1, -.07, .03, .022, .025, 6, 4); B.sph(.048 * hs, .1, -.07, .03, .022, .025, 6, 4);
  B.tbox(0, .135, -.098, .02, .05, .02, .013, .016); B.sph(0, .11, -.106, .015, .013, .014, 7, 4); B.col(lin(skin).map(v => v * .7), MAT.SKIN).sph(-.009, .103, -.103, .005, .004, .004, 4, 2).sph(.009, .103, -.103, .005, .004, .004, 4, 2);
  const lip = lin(skin).map((v, i) => v * (i === 0 ? .82 : .62)); B.col(F ? lin(0x9a3040) : lip, MAT.SKIN).box(0, .081, -.098, .036, .007, .012).box(0, .072, -.095, .032, .008, .012);
  sk(); for (const s of [-1, 1]) { B.push().t(s * .092 * hs, .13, .008).rz(s * .15).tbox(0, 0, 0, .014, .05, .03, .01, .024).pop(); B.col(lin(skin).map(v => v * .75), MAT.SKIN).box(s * .099 * hs, .13, .008, .004, .03, .016); sk(); }
  for (const s of [-1, 1]) {
    B.col(0x2a1a14, MAT.SKIN).box(s * .035, .153, -.089, .03, .019, .006);
    B.col(0xf4f0ea, MAT.GLASS).sph(s * .035, .153, -.089, .015, .009, .007, 7, 4);
    B.col(app.eyeCol ?? 0x3a2a1a, MAT.GLASS).sph(s * .035, .153, -.095, .006, .006, .003, 6, 3); B.col(0x050505, MAT.GLASS).sph(s * .035, .153, -.097, .003, .003, .002, 5, 2);
    sk(); B.push().t(s * .035, .161, -.092).rx(-.3).box(0, 0, 0, .03, .006, .012).pop();
    B.col(app.hair, MAT.HAIR).push().t(s * .036, .174, -.095).rz(s * (F ? .08 : -.05)).box(0, 0, 0, .034, F ? .006 : .009, .01).pop();
  }
  // facial hair
  const hc = app.hair; const stub = lin(skin).map((v, i) => lerp(v, lin(hc)[i], .45));
  if (app.beard === 'stubble') { B.col(stub, MAT.SKIN).tbox(0, .062, -.035, .114, .06, .104, .108, .104); }
  if (app.beard === 'full' || app.beard === true) { B.col(hc, MAT.HAIR).tbox(0, .062, -.04, .122, .075, .11, .112, .106); B.sph(0, .045, -.08, .035, .035, .03, 7, 4); B.box(0, .09, -.103, .05, .012, .014); }
  if (app.beard === 'goatee') { B.col(hc, MAT.HAIR).box(0, .045, -.09, .03, .04, .02).box(0, .09, -.103, .046, .01, .012); }
  if (app.beard === 'mustache') { B.col(hc, MAT.HAIR).box(0, .09, -.104, .05, .013, .012); }
  // hair
  const hst = app.hairStyle || ({ hair: 'short', cap: 'short', bandana: 'short', bald: 'bald' })[app.head] || 'short';
  const covered = ['helmet', 'balaclava', 'skimask', 'hood'].includes(app.head);
  B.col(hc, MAT.HAIR);
  if (!covered) {
    if (hst === 'buzz') hairCap(B, 0, .142, .01, .094, .114, .104, 1.05, 1.35, 1.95);
    else if (hst === 'short' || hst === 'side') { hairCap(B, 0, .143, .01, .097, .118, .106, 1.0, 1.4, 1.95); if (hst === 'side') B.push().t(-.02, .245, -.04).rz(.25).box(0, 0, 0, .12, .025, .1).pop(); }
    else if (hst === 'slick') { B.col(hc, MAT.PLASTIC); hairCap(B, 0, .145, .016, .097, .118, .106, .95, 1.35, 1.9); }
    else if (hst === 'curly') hairCap(B, 0, .15, .01, .107, .125, .115, 1.05, 1.45, 2.0, 16, 8, .08);
    else if (hst === 'long' || hst === 'pony' || hst === 'bun') {
      hairCap(B, 0, .143, .012, .099, .12, .108, 1.0, 1.5, 2.1);
      if (hst === 'long') { B.tbox(0, .02, .05, .17, .26, .08, .2, .1); B.tbox(-.085, .06, -.01, .03, .2, .07, .04, .06); B.tbox(.085, .06, -.01, .03, .2, .07, .04, .06); }
      if (hst === 'pony') { B.tube([0, .16, .1], [0, -.06, .14], .035, .02, 7); B.col(0x111111, MAT.RUBBER).cyl(0, .13, .105, .02, .02, .02, 6); }
      if (hst === 'bun') { B.sph(0, .23, .07, .05, .045, .05, 8, 5); }
    }
    else if (hst === 'mohawk') { B.box(0, .23, .02, .025, .07, .2); }
  }
  // headgear
  const hd = app.head;
  if (hd === 'cap') { const cc = app.capCol ?? [0x2b2b2b, 0x4a3b28, 0x1f2a3a, 0x6a1d1d, 0x2a3a2a][(app.skin >> 3) % 5]; B.col(cc, MAT.CLOTH); hairCap(B, 0, .155, .01, .103, .1, .112, 1.25, 1.5, 1.75); B.push().t(0, .2, -.11).rx(-.15).box(0, 0, -.04, .17, .012, .1).pop(); B.sph(0, .255, .01, .012, .008, .012, 5, 3); }
  if (hd === 'beanie' || hd === 'hood') { const cc = hd === 'hood' ? topCol : [0x2b2b2b, 0x5a5f63, 0x3b2f2a, 0x6a2020][(app.skin >> 4) % 4]; B.col(cc, MAT.CLOTH); hairCap(B, 0, .15, .01, .106, .13, .114, 1.35, 1.55, 1.8); B.col(dark(cc), MAT.CLOTH).cyl(0, .155, .01, .108, .108, .04, 14); if (hd === 'hood') { B.col(cc, MAT.CLOTH); hairCap(B, 0, .14, .02, .125, .14, .13, 1.75, 1.95, 2.4); } }
  if (hd === 'helmet') {
    const hcol = app.helmetCol ?? 0x2e3229; B.col(hcol, MAT.PAINT); hairCap(B, 0, .155, .012, .12, .115, .13, 1.35, 1.6, 1.85, 16, 7);
    B.col(dark(hcol), MAT.PAINT).torus(0, .14, .012, .118, .008, 18, 4);
    for (const s of [-1, 1]) { B.col(0x1a1a1a, MAT.PLASTIC).box(s * .118, .15, .0, .012, .025, .09); B.col(0x222222, MAT.CLOTH).tube([s * .1, .12, .0], [s * .07, .03, -.03], .006); }
    B.col(0x151515, MAT.RUBBER).box(0, .22, -.12, .045, .035, .02); B.col(dark(hcol), MAT.CANVAS).box(0, .225, .1, .07, .04, .03);
  }
  if (hd === 'headset' || hd === 'earpiece') {
    if (hd === 'headset') { B.col(0x1a1a1a, MAT.PLASTIC).torus(0, .2, .0, .1, .008, 14, 4).sph(-.1, .13, .01, .02, .035, .03, 7, 4).sph(.1, .13, .01, .02, .035, .03, 7, 4).tube([-.1, .11, -.01], [-.05, .07, -.09], .004); }
    else { B.col(0x222222, MAT.PLASTIC).sph(.096, .13, .0, .008, .008, .008, 5, 3); B.col(0xc8c8c8, MAT.PLASTIC).tube([.096, .12, .0], [.07, -.02, .04], .002); }
  }
  if (hd === 'bandana') { B.col(0x7a1515, MAT.CLOTH); hairCap(B, 0, .155, .01, .104, .1, .112, 1.15, 1.5, 1.85); B.tube([0, .14, .11], [.02, .08, .14], .015); }
  if (hd === 'balaclava' || hd === 'skimask') {
    const mc = hd === 'skimask' ? (app.maskCol ?? [0x111111, 0x2a2a3a, 0x3a1a1a, 0x1a2a1a][(app.skin >> 2) % 4]) : 0x1c1c1c; B.col(mc, MAT.CLOTH);
    B.sph(0, .14, .008, .097, .12, .108, 14, 9); B.tbox(0, .07, -.03, .12, .1, .112, .11, .11); B.sph(0, .11, -.1, .02, .022, .02, 6, 3);
    sk(); B.box(0, .153, -.096, .085, .032, .02); B.col(0x2a1a14).box(-.035, .153, -.105, .028, .016, .004).box(.035, .153, -.105, .028, .016, .004);
    B.col(0xf4f0ea, MAT.GLASS).sph(-.035, .153, -.106, .012, .008, .004, 6, 3).sph(.035, .153, -.106, .012, .008, .004, 6, 3);
    if (hd === 'skimask') { sk(); B.box(0, .078, -.1, .035, .02, .02); B.col(lin(skin).map(v => v * .6), MAT.SKIN).box(0, .078, -.108, .03, .006, .004); B.col(dark(mc), MAT.CLOTH).cyl(0, .23, .01, .03, .02, .04, 6); }
  }
  if (app.eyewear === 'sunglasses' || app.glasses === true) { B.col(0x0a0a0a, MAT.GLASS).box(-.035, .153, -.104, .042, .026, .006).box(.035, .153, -.104, .042, .026, .006); B.col(0x111111, MAT.METAL).box(0, .158, -.104, .03, .005, .006).box(-.083, .158, -.05, .004, .006, .1).box(.083, .158, -.05, .004, .006, .1); }
  if (app.eyewear === 'glasses') { B.col(0x3a3a3a, MAT.METAL); for (const s of [-1, 1]) { B.torus(s * .035, .153, -.103, .018, .0025, 10, 3); B.box(s * .084, .158, -.05, .004, .004, .1); } B.box(0, .155, -.104, .016, .004, .004); }
  if (F && !covered) { B.col(0xd4af37, MAT.METAL).sph(-.095, .11, .008, .006, .01, .006, 5, 3).sph(.095, .11, .008, .006, .01, .006, 5, 3); }
  /* ---------- ARMS ---------- */
  const longSleeve = !['tshirt', 'polo', 'dress'].includes(top) && !(app.rolled && (top === 'shirt' || top === 'combat'));
  const sleeveCol = (formal || top === 'jacket') ? (top === 'waiter' ? 0xf0eee8 : (app.suit ?? topCol)) : topCol;
  for (const L of [1, 0]) {
    const ua = L ? SK.UAL : SK.UAR, fa = L ? SK.FAL : SK.FAR, h = L ? SK.HL : SK.HR; const sx = L ? -1 : 1;
    B.b(ua);
    if (top === 'dress') { sk(); B.sph(0, 0, 0, .05, .05, .05, 8, 5); B.cyl(0, -.29, 0, .036, .045, .3, 9); }
    else {
      B.col(sleeveCol, clothMat).sph(0, -.01, 0, .062 * bk, .062, .062 * bk, 8, 5);
      if (longSleeve || top === 'parka') { B.cyl(0, -.29, 0, .045 * bk, .059 * bk * (top === 'parka' ? 1.15 : 1), .3, 9); B.col(dark(sleeveCol), clothMat).cyl(0, -.17, 0, .056 * bk, .056 * bk, .01, 9); if (top === 'combat') { B.col(sleeveCol, clothMat).box(sx * .052, -.1, 0, .012, .07, .06); B.col(0x6a1010, MAT.CLOTH).box(sx * .059, -.085, 0, .003, .03, .045); } }
      else { B.cyl(0, -.14, 0, .056 * bk, .06 * bk, .15, 9); B.col(dark(sleeveCol), clothMat).cyl(0, -.145, 0, .058 * bk, .058 * bk, .02, 9); sk(); B.cyl(0, -.29, 0, .04 * bk, .048 * bk, .16, 9); }
    }
    B.b(fa);
    if (longSleeve && top !== 'dress') {
      B.col(sleeveCol, clothMat).cyl(0, -.24, 0, .036 * bk, .047 * bk, .25, 9).sph(0, 0, 0, .047 * bk, .045, .047 * bk, 7, 4);
      B.col(formal && top !== 'guard' ? 0xf0eee8 : dark(sleeveCol), MAT.CLOTH).cyl(0, -.255, 0, .034, .034, .025, 9);
      if (formal) { B.col(0xc8c8c8, MAT.METAL).sph(sx * .02, -.245, -.025, .005, .005, .005, 4, 2); }
    } else { if (app.rolled && top !== 'dress' && top !== 'tshirt' && top !== 'polo') { B.col(sleeveCol, clothMat).cyl(0, -.06, 0, .05, .05, .07, 9); } sk(); B.cyl(0, -.25, 0, .029, .04, .26, 9).sph(0, 0, 0, .04, .04, .04, 7, 4); }
    sk(); B.cyl(0, -.27, 0, .027, .03, .03, 7);
    if (L && app.watch) { B.col(0x141414, MAT.RUBBER).cyl(0, -.235, 0, .034, .034, .018, 10); B.col(0x8a8a8a, MAT.METAL).box(0, -.226, -.034, .022, .022, .006); }
    if (F && top === 'dress' && !L) { B.col(0xd4af37, MAT.METAL).torus(0, -.245, 0, .033, .004, 10, 3); }
    buildHand(B, h, !!L, app.gloves ? (app.gloveCol ?? 0x1c1c1c) : skin, skin);
  }
  /* ---------- LEGS ---------- */
  const legSkin = bottom === 'dress';
  const LC = () => legSkin ? B.col(app.stockings ? 0x222222 : skin, MAT.SKIN) : BC();
  for (const L of [1, 0]) {
    const th = L ? SK.THL : SK.THR, shn = L ? SK.SHL : SK.SHR, ft = L ? SK.FTL : SK.FTR; const sx = L ? -1 : 1;
    B.b(th); LC(); const tr = (legSkin ? .068 : (bottom === 'snow' ? .095 : .085)) * bk;
    B.cyl(0, -.46, 0, legSkin ? .048 : .058, tr, .47, 10); B.sph(0, -.02, 0, tr * 1.02, tr * .8, tr * 1.05, 8, 4);
    if (bottom === 'cargo' || bottom === 'snow') { BC(); B.box(sx * .075 * bk, -.24, .0, .03, .13, .1); B.col(dark(botCol), MAT.CLOTH).box(sx * .09 * bk, -.185, 0, .004, .02, .1); }
    if (bottom === 'jeans') { B.col(dark(app.botCol ?? 0x2a3a5a), MAT.CLOTH).box(sx * .066, -.25, 0, .004, .46, .01); }
    if (bottom === 'slacks') { B.col(dark(botCol), MAT.CLOTH).box(0, -.25, -.072, .004, .45, .004); }
    if (app.holster && !L && !legSkin && !formal) { B.col(0x161616, MAT.PLASTIC).box(.085 * bk, -.18, .0, .035, .16, .07); B.col(0x111111, MAT.CANVAS).box(.07, -.12, 0, .05, .02, .12).box(.07, -.22, 0, .05, .02, .12); B.col(0x1a1a1a, MAT.PLASTIC).push().t(.085 * bk, -.07, .015).rx(-.2).box(0, 0, 0, .03, .06, .035).pop(); }
    if (app.holster && !L && formal) { /* concealed shoulder holster under jacket: visible strap */ }
    B.b(shn); LC();
    if (legSkin) { B.cyl(0, -.42, 0, .032, .045, .43, 9); B.sph(0, -.13, .01, .042, .07, .04, 7, 4); }
    else {
      B.cyl(0, -.31, 0, (bottom === 'snow' ? .066 : .05) * bk, (bottom === 'snow' ? .08 : .06) * bk, .33, 9); B.sph(0, 0, 0, .062 * bk, .055, .062 * bk, 7, 4);
      if (app.kneepads && (bottom === 'cargo' || bottom === 'snow')) { B.col(0x1c1c1c, MAT.RUBBER).tbox(0, -.04, -.055, .1, .11, .035, .09, .03); B.col(0x111111, MAT.CANVAS).cyl(0, -.08, 0, .063, .063, .015, 9); }
      if (bottom === 'slacks' || bottom === 'jeans') { BC(); B.cyl(0, -.42, 0, .055, .055, .12, 9); }
    }
    const fw = app.feet || app.boots && 'combat' || 'combat';
    B.b(ft);
    if (fw === 'combat') {
      const bc = app.bootCol ?? (typeof app.boots === 'number' ? app.boots : 0x2a2018); B.col(bc, MAT.LEATHER);
      B.cyl(0, -.02, .005, .052, .056, .17, 9); B.tbox(0, -.03, -.06, .1, .08, .2, .092, .17); B.sph(0, -.035, -.14, .048, .04, .05, 7, 4);
      B.col(0x111111, MAT.RUBBER).box(0, -.067, -.055, .106, .028, .28); B.box(0, -.06, .06, .095, .04, .06);
      B.col(0x0d0d0d, MAT.CLOTH); for (let i = 0; i < 4; i++) B.box(0, .01 + i * .03, -.054 + i * .004, .04, .004, .008);
    } else if (fw === 'sneakers') {
      const uc = [0xdddddd, 0x222222, 0x8a1a1a, 0x2a3a6a][(app.skin >> 5) % 4]; B.col(uc, MAT.CLOTH).tbox(0, -.035, -.06, .092, .07, .23, .08, .16).sph(0, -.035, -.15, .044, .035, .05, 7, 4);
      B.col(0xf0f0f0, MAT.RUBBER).box(0, -.065, -.06, .098, .025, .27); B.col(0xeeeeee, MAT.CLOTH).box(0, -.0, -.08, .03, .005, .08);
    } else if (fw === 'heels') {
      const hc2 = [0x111111, 0x6a1020, 0xc0a060, 0x1a1a1a][(app.skin >> 4) % 4]; B.col(hc2, MAT.LEATHER).push().t(0, -.02, -.06).rx(-.22).tbox(0, 0, -.02, .07, .05, .18, .06, .12).pop();
      B.box(0, -.06, .05, .025, .07, .025); B.col(lin(skin), MAT.SKIN).box(0, -.0, -.08, .06, .03, .08);
    } else {
      B.col(0x111111, MAT.LEATHER).tbox(0, -.04, -.06, .095, .06, .25, .085, .2).sph(0, -.04, -.17, .045, .03, .045, 7, 4); B.col(0x050505, MAT.RUBBER).box(0, -.068, -.06, .1, .015, .28);
    }
  }
  /* ---------- props & weapon ---------- */
  B.b(SK.PROP);
  if (app.prop === 'cig') { B.col(0xeeeeee, MAT.PAINT).cylZ(0, 0, 0, .004, .07, 5); B.col(0xc89a5a, MAT.PAINT).cylZ(0, 0, .03, .0042, .02, 5); B.col(0xff5a1a, MAT.EMIT).cylZ(0, 0, -.036, .0045, .006, 5); }
  if (app.prop === 'cup') { B.col(0x8a2a1a, MAT.PLASTIC).cyl(0, -.04, 0, .03, .035, .09, 10); }
  if (app.prop === 'glass') { B.col(0xd8e8f0, MAT.GLASS).cyl(0, -.03, 0, .028, .028, .01, 10).cyl(0, -.02, 0, .004, .004, .08, 5).cyl(0, .06, 0, .006, .035, .07, 10); B.col(0xd8b860, MAT.EMIT).cyl(0, .075, 0, .028, .028, .03, 10); }
  if (app.prop === 'phone') { B.col(0x111111, MAT.PLASTIC).box(0, 0, 0, .07, .14, .01); B.col(0x6fa0d0, MAT.EMIT).box(0, 0, -.006, .06, .12, .002); }
  if (app.prop === 'clipboard') { B.col(0x7a5a3a, MAT.WOOD).box(0, 0, 0, .22, .3, .01); B.col(0xeeeeee, MAT.PAINT).box(0, -.01, -.006, .2, .25, .002); }
  if (app.prop === 'tray') { B.col(0xc0c0c0, MAT.METAL).cyl(0, 0, 0, .2, .2, .01, 16); B.col(0xd8e8f0, MAT.GLASS); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; B.cyl(Math.cos(a) * .1, .01, Math.sin(a) * .1, .025, .028, .1, 8); } }
  B.b(SK.WPN); if (app.weapon) buildNpcWeapon(B, app.weapon);
  return B.mesh();
}
function buildNpcWeapon(B, w) {
  const blk = 0x1a1b1c, M = MAT.METAL;
  if (w === 'ak') {
    B.col(0x232323, M).box(0, .03, -.12, .044, .075, .32); B.col(0x161616, M).box(0, .072, -.13, .036, .012, .3).box(.023, .045, -.12, .003, .02, .08);
    B.col(0x7a4220, MAT.WOOD).tbox(0, .03, -.37, .05, .055, .2, .05, .045).box(0, .065, -.35, .044, .025, .14);
    B.col(0x222222, M).cylZ(0, .045, -.6, .011, .36, 7).cylZ(0, .07, -.43, .008, .2, 6).box(0, .09, -.66, .01, .045, .012).box(0, .085, -.24, .03, .02, .03).cylZ(0, .045, -.79, .015, .04, 7);
    B.col(0x7a4220, MAT.WOOD).tbox(0, -.005, .25, .042, .1, .27, .036, .2).box(0, -.06, .04, .04, .11, .045);
    B.col(0x2a1a10, M).push().t(0, -.03, -.17).rx(.35).box(0, -.07, 0, .034, .16, .07).rx(.2).box(0, -.16, .03, .034, .06, .068).pop();
    B.col(0x111111, M).box(0, -.02, -.04, .006, .03, .05);
  } else if (w === 'shotgun') {
    B.col(blk, M).box(0, .03, -.1, .05, .075, .27).cylZ(0, .05, -.52, .014, .58, 9).cylZ(0, .022, -.45, .013, .46, 9).box(0, .07, -.79, .008, .012, .008);
    B.col(0x4a2e18, MAT.WOOD).cylZ(0, .022, -.42, .026, .17, 10); for (let i = 0; i < 6; i++) B.col(0x3a2210, MAT.WOOD).cylZ(0, .022, -.36 - i * .022, .027, .006, 10);
    B.col(0x4a2e18, MAT.WOOD).tbox(0, -.01, .25, .045, .1, .28, .04, .22).box(0, -.05, .06, .04, .09, .05); B.col(0x111111, MAT.RUBBER).box(0, -.01, .39, .046, .12, .02);
  } else if (w === 'smg') {
    B.col(0x1b1b1b, M).box(0, .03, -.08, .045, .08, .28).cylZ(0, .045, -.29, .02, .16, 10).box(0, -.08, -.12, .028, .16, .035).box(0, -.05, .03, .034, .09, .04);
    B.col(0x262626, MAT.PLASTIC).box(0, .03, .13, .025, .03, .18).box(0, .0, .22, .04, .08, .015); B.col(0x111111, M).box(0, .08, -.06, .025, .02, .12);
  } else if (w === 'pistol') {
    B.col(0x1b1b1b, M).box(0, .035, -.06, .03, .034, .19).box(0, .012, -.07, .026, .02, .14); B.col(0x161616, MAT.PLASTIC).push().t(0, 0, .0).rx(-.25).box(0, -.05, 0, .028, .1, .04).pop();
    B.col(0x0d0d0d, M).cylZ(0, .035, -.16, .006, .01, 6);
  } else {
    B.col(0x1e1f20, M).box(0, .035, -.08, .05, .07, .3).box(0, .035, -.34, .056, .062, .24); B.col(0x121212, M); for (let i = 0; i < 6; i++) B.box(.029, .035, -.25 - i * .035, .004, .03, .015).box(-.029, .035, -.25 - i * .035, .004, .03, .015);
    B.cylZ(0, .045, -.58, .012, .22, 7).cylZ(0, .045, -.7, .017, .06, 7); B.box(0, .08, -.15, .028, .012, .36);
    B.col(0x2a2c2d, MAT.PLASTIC).cylZ(0, .03, .1, .014, .12, 8).tbox(0, .02, .22, .044, .09, .1, .046, .09).box(0, -.06, .03, .034, .1, .045);
    B.col(0x222222, M).push().t(0, -.05, -.17).rx(.18).box(0, -.07, 0, .03, .15, .068).pop();
    if (w === 'rifleL') { B.col(0x111111, MAT.PLASTIC).box(0, .11, -.12, .035, .04, .1); B.col(0x406060, MAT.GLASS).box(0, .11, -.175, .03, .03, .004); B.col(0x111111, MAT.PLASTIC).box(.035, .04, -.4, .02, .03, .06); }
    else { B.col(0x111111, M).box(0, .1, -.05, .015, .03, .02).box(0, .095, -.42, .012, .03, .012); }
  }
}
/* ======================= POSE LIBRARY ======================= */
function P_() { return new Float32Array(45); }
function pj(a, b, x, y, z) { a[b * 3] = x; a[b * 3 + 1] = y; a[b * 3 + 2] = z; }
function poseWalk(a, ph, amp, run, carry) {
  const s = Math.sin(ph), c = Math.cos(ph), s2 = Math.sin(ph * 2);
  const legA = amp * (run ? .78 : .46);
  // legs: swing, knee flex in swing phase, slight flex on contact, foot roll
  pj(a, SK.THL, s * legA - (run ? .18 : .02), .04, -.03); pj(a, SK.THR, -s * legA - (run ? .18 : .02), -.04, .03);
  pj(a, SK.SHL, -(Math.max(0, -c) * (run ? 1.5 : .75) + Math.max(0, c) * .08) * amp - .05, 0, 0); pj(a, SK.SHR, -(Math.max(0, c) * (run ? 1.5 : .75) + Math.max(0, -c) * .08) * amp - .05, 0, 0);
  pj(a, SK.FTL, (Math.max(0, s) * .35 - Math.max(0, -s) * .2) * amp, 0, 0); pj(a, SK.FTR, (Math.max(0, -s) * .35 - Math.max(0, s) * .2) * amp, 0, 0);
  // hips rotate & sway, torso counter-rotates, slight lean
  pj(a, SK.PEL, 0, s * .1 * amp, Math.sin(ph) * .04 * amp); pj(a, SK.CH, (run ? -.24 : -.05) + s2 * .02 * amp, -s * .16 * amp, -Math.sin(ph) * .03 * amp);
  if (!carry) {
    pj(a, SK.UAL, -s * (run ? .75 : .38) * amp, .05, -.09 - (run ? .1 : 0)); pj(a, SK.UAR, s * (run ? .75 : .38) * amp, -.05, .09 + (run ? .1 : 0));
    pj(a, SK.FAL, (run ? 1.35 : .25) + Math.max(0, -s) * .35 * amp, 0, 0); pj(a, SK.FAR, (run ? 1.35 : .25) + Math.max(0, s) * .35 * amp, 0, 0);
  }
  pj(a, SK.HD, (run ? .14 : .03) - s2 * .015, s * .07 * amp, 0);
  return Math.abs(Math.cos(ph)) * (run ? .065 : .032) * amp;
}
function poseIdle(a, t, kind, k) {
  const br = Math.sin(t * 1.6 + k) * .022, sh = Math.sin(t * .23 + k * 3) * .05; // breathing & weight shift
  pj(a, SK.PEL, 0, sh * .5, sh * .4); pj(a, SK.THL, -.02, .06, -.05 - sh * .3); pj(a, SK.THR, .02, -.06, .05 - sh * .3); pj(a, SK.SHL, -.04 - Math.max(0, sh) * .3, 0, 0); pj(a, SK.SHR, -.03 - Math.max(0, -sh) * .3, 0, 0);
  pj(a, SK.CH, br, -sh * .4, -sh * .3); pj(a, SK.HD, -br * .6, Math.sin(t * .3 + k) * .25, sh * .2);
  pj(a, SK.UAL, .06 + br, .05, -.13); pj(a, SK.UAR, .06 + br, -.05, .13); pj(a, SK.FAL, .28, 0, 0); pj(a, SK.FAR, .28, 0, 0);
  const g = Math.sin(t * 2.3 + k) * .5 + .5, g2 = Math.sin(t * 1.7 + k * 2) * .5 + .5;
  switch (kind) {
    case 'talk': pj(a, SK.UAR, .5 + g * .45, -.3, .25); pj(a, SK.FAR, 1.2 + g2 * .65, 0, 0); pj(a, SK.UAL, .2 + g2 * .35, .2, -.2); pj(a, SK.FAL, .9 + g * .55, 0, 0); pj(a, SK.HD, Math.sin(t * 3.1 + k) * .08, Math.sin(t * .8 + k) * .18, Math.sin(t * 1.3) * .05); pj(a, SK.CH, br, Math.sin(t * .9 + k) * .12, 0); break;
    case 'listen': pj(a, SK.UAL, .35, .5, -.35); pj(a, SK.FAL, 1.95, 0, 0); pj(a, SK.UAR, .35, -.5, .35); pj(a, SK.FAR, 1.95, 0, 0); pj(a, SK.HD, Math.sin(t * 2.1 + k) > .7 ? -.14 : -.02, Math.sin(t * .5 + k) * .1, .06); break;
    case 'smoke': { const cyc = (t * .18 + k) % 1; const up = bump(cyc, .05, .35); pj(a, SK.UAL, .25 + up * .35, .1, -.1 + up * .35); pj(a, SK.FAL, .8 + up * 1.6, 0, 0); pj(a, SK.UAR, .1, 0, .1); pj(a, SK.FAR, .2, 0, 0); pj(a, SK.HD, -.05 + up * .12, 0, 0); break; }
    case 'drink': { const cyc = (t * .15 + k) % 1; const up = bump(cyc, .1, .35); pj(a, SK.UAL, .45 + up * .3, .2, -.15 + up * .3); pj(a, SK.FAL, 1.3 + up * 1, 0, 0); pj(a, SK.HD, up * .25, 0, 0); pj(a, SK.UAR, .3 + g * .3, -.2, .2); pj(a, SK.FAR, .8 + g2 * .5, 0, 0); break; }
    case 'radio': pj(a, SK.UAL, .35, -.2, -.95); pj(a, SK.FAL, 2.3, 0, 0); pj(a, SK.HD, .05, .2, -.08); break;
    case 'phone': pj(a, SK.UAL, .5, -.3, -.8); pj(a, SK.FAL, 2.4, 0, 0); pj(a, SK.HD, .05 + Math.sin(t) * .03, .15, -.1); pj(a, SK.UAR, .3, 0, .4); pj(a, SK.FAR, 1.6, 0, 0); break;
    case 'work': { pj(a, SK.CH, -.32, 0, 0); pj(a, SK.HD, -.35, 0, 0); const w1 = Math.sin(t * 2.2 + k), w2 = Math.sin(t * 1.7 + k + 1); pj(a, SK.UAL, .72 + w1 * .1, 0, -.05); pj(a, SK.FAL, .6 + w2 * .18, 0, 0); pj(a, SK.UAR, .75 + w2 * .12, 0, .05); pj(a, SK.FAR, .55 + w1 * .22, 0, 0); pj(a, SK.THL, -.08, .1, -.1); pj(a, SK.THR, .05, -.1, .1); break; }
    case 'look': pj(a, SK.HD, .05, Math.sin(t * .9 + k) * .9, 0); pj(a, SK.CH, 0, Math.sin(t * .9 + k) * .3, 0); break;
    case 'guard': pj(a, SK.THL, 0, .18, -.12); pj(a, SK.THR, 0, -.18, .12); pj(a, SK.HD, 0, Math.sin(t * .4 + k) * .6, 0); pj(a, SK.UAL, .1, .3, -.25); pj(a, SK.FAL, 1.4, 0, 0); pj(a, SK.UAR, .1, -.3, .25); pj(a, SK.FAR, 1.4, 0, 0); break;
    case 'surrender': pj(a, SK.UAL, 2.8, 0, -.4); pj(a, SK.FAL, .5, 0, 0); pj(a, SK.UAR, 2.8, 0, .4); pj(a, SK.FAR, .5, 0, 0); pj(a, SK.HD, -.15 + Math.sin(t * 7) * .03, 0, 0); break;
    case 'dance': case 'dance2': {
      const bt = t * (kind === 'dance' ? 4.4 : 3.6) + k; const b = Math.sin(bt), b2 = Math.sin(bt * .5);
      pj(a, SK.PEL, 0, b2 * .25, b * .08); pj(a, SK.CH, .05 + Math.abs(b) * .05, -b2 * .3, -b * .1); pj(a, SK.HD, Math.abs(b) * .12 - .05, b2 * .3, b * .1);
      pj(a, SK.THL, .15 + Math.max(0, b) * .35, .1, -.08); pj(a, SK.SHL, -.3 - Math.max(0, b) * .5, 0, 0); pj(a, SK.THR, .15 + Math.max(0, -b) * .35, -.1, .08); pj(a, SK.SHR, -.3 - Math.max(0, -b) * .5, 0, 0);
      if (kind === 'dance') { pj(a, SK.UAL, .9 + b * .4, .4, -.4 - b2 * .3); pj(a, SK.FAL, 1.4 + b * .3, 0, 0); pj(a, SK.UAR, .9 - b * .4, -.4, .4 - b2 * .3); pj(a, SK.FAR, 1.4 - b * .3, 0, 0); }
      else { pj(a, SK.UAL, .5 + b2 * .5, 0, -.6); pj(a, SK.FAL, .6, 0, 0); pj(a, SK.UAR, 1.6 + b * .6, 0, .7 + b2 * .3); pj(a, SK.FAR, .4, 0, 0); }
      break;
    }
    case 'cower': pj(a, SK.CH, -.6, 0, 0); pj(a, SK.HD, -.6, 0, 0); pj(a, SK.UAL, 2.6, .4, -.2); pj(a, SK.FAL, 2.3, 0, 0); pj(a, SK.UAR, 2.6, -.4, .2); pj(a, SK.FAR, 2.3, 0, 0); pj(a, SK.THL, 1.6, 0, -.1); pj(a, SK.THR, 1.6, 0, .1); pj(a, SK.SHL, -2.2, 0, 0); pj(a, SK.SHR, -2.2, 0, 0); pj(a, SK.FTL, .6, 0, 0); pj(a, SK.FTR, .6, 0, 0); pj(a, SK.PEL, 0, Math.sin(t * 9) * .03, 0); break;
    case 'kneel': pj(a, SK.THL, .2, 0, -.08); pj(a, SK.THR, .2, 0, .08); pj(a, SK.SHL, -1.75, 0, 0); pj(a, SK.SHR, -1.75, 0, 0); pj(a, SK.FTL, .8, 0, 0); pj(a, SK.FTR, .8, 0, 0); pj(a, SK.UAL, 2.6, .3, -.5); pj(a, SK.FAL, 2.2, 0, 0); pj(a, SK.UAR, 2.6, -.3, .5); pj(a, SK.FAR, 2.2, 0, 0); pj(a, SK.HD, -.3 + Math.sin(t * .7 + k) * .1, Math.sin(t * .4 + k) * .3, 0); pj(a, SK.CH, -.1, 0, 0); break;
    case 'held': pj(a, SK.UAL, 1.3, .5, -.2); pj(a, SK.FAL, 2.2, 0, 0); pj(a, SK.UAR, 1.2, -.5, .3); pj(a, SK.FAR, 2.1, 0, 0); pj(a, SK.HD, .35 + Math.sin(t * 6) * .04, Math.sin(t * 2.3) * .25, 0); pj(a, SK.CH, .18, Math.sin(t * 3) * .05, 0); pj(a, SK.THL, -.1, 0, -.1); pj(a, SK.THR, .05, 0, .1); break;
    case 'struggle': { const q = Math.sin(t * 14); pj(a, SK.UAL, 1.4 + q * .4, .5, -.4); pj(a, SK.FAL, 1.9, 0, 0); pj(a, SK.UAR, 1.4 - q * .4, -.5, .4); pj(a, SK.FAR, 1.9, 0, 0); pj(a, SK.CH, .2, q * .3, q * .15); pj(a, SK.HD, .3, q * .4, 0); break; }
    case 'elbow': pj(a, SK.CH, .1, -1.1, 0); pj(a, SK.UAR, .9, -.9, 1.2); pj(a, SK.FAR, 2.4, 0, 0); pj(a, SK.HD, 0, -.9, 0); pj(a, SK.UAL, .3, .2, -.3); pj(a, SK.FAL, 1.2, 0, 0); break;
    case 'panic': pj(a, SK.UAL, 1.8 + g * .5, .3, -.5); pj(a, SK.FAL, 1.8, 0, 0); pj(a, SK.UAR, 1.8 + g2 * .5, -.3, .5); pj(a, SK.FAR, 1.8, 0, 0); pj(a, SK.HD, .1, Math.sin(t * 4) * .6, 0); pj(a, SK.CH, -.15, 0, 0); break;
    case 'lean': pj(a, SK.PEL, 0, .2, .12); pj(a, SK.THL, .1, .2, -.25); pj(a, SK.THR, -.05, 0, .25); pj(a, SK.CH, .08, 0, -.08); pj(a, SK.UAL, .2, .6, -.4); pj(a, SK.FAL, 1.9, 0, 0); pj(a, SK.UAR, .2, -.6, .4); pj(a, SK.FAR, 1.9, 0, 0); break;
  }
}
function poseSit(a, t, k, table) {
  pj(a, SK.THL, 1.55, .08, -.06); pj(a, SK.THR, 1.55, -.08, .06); pj(a, SK.SHL, -1.45 + Math.sin(t * .3 + k) * .08, 0, 0); pj(a, SK.SHR, -1.55, 0, 0); pj(a, SK.FTL, .1, 0, 0); pj(a, SK.FTR, .05, 0, 0);
  pj(a, SK.CH, table ? -.15 : .14 + Math.sin(t * 1.6 + k) * .015, Math.sin(t * .2 + k) * .1, 0); pj(a, SK.HD, table ? -.25 : Math.sin(t * .5 + k) * .1, Math.sin(t * .35 + k) * .35, 0);
  if (table) { const w = Math.sin(t * 1.9 + k); pj(a, SK.UAL, .9, 0, -.1); pj(a, SK.FAL, .6 + w * .1, 0, 0); pj(a, SK.UAR, .9, 0, .1); pj(a, SK.FAR, .55 - w * .15, 0, 0); }
  else { pj(a, SK.UAL, .5, .1, -.18); pj(a, SK.FAL, .95, 0, 0); pj(a, SK.UAR, .5, -.1, .18); pj(a, SK.FAR, .95, 0, 0); }
}
function poseCrouch(a, ph, moving) {
  const s = moving ? Math.sin(ph) : 0;
  pj(a, SK.THL, 1.1 + s * .3, .05, -.1); pj(a, SK.THR, 1.1 - s * .3, -.05, .1); pj(a, SK.SHL, -1.9 + Math.max(0, s) * .3, 0, 0); pj(a, SK.SHR, -1.9 + Math.max(0, -s) * .3, 0, 0);
  pj(a, SK.FTL, .7, 0, 0); pj(a, SK.FTR, .7, 0, 0); pj(a, SK.CH, -.35, s * .1, 0); pj(a, SK.HD, .3, 0, 0);
}
function poseDead(a, k) {
  const v = (k * 7) % 1;
  pj(a, SK.THL, .2 + v * .4, 0, -.15 - v * .2); pj(a, SK.THR, -.1 + v * .3, 0, .2); pj(a, SK.SHL, -.4 - v * .5, 0, 0); pj(a, SK.SHR, -.1, 0, 0);
  pj(a, SK.UAL, .4 + v, 0, -1.1); pj(a, SK.UAR, -.2, 0, .9 + k * .6); pj(a, SK.FAL, .6 + v * .8, 0, 0); pj(a, SK.FAR, .3, 0, 0); pj(a, SK.HD, -.2, .6 * (k - .5), v * .3); pj(a, SK.CH, 0, 0, (v - .5) * .2);
}
