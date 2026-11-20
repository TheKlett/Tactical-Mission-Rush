/* =====================================================================
   WEAPONS v2 — catalog (gameplay stats + prices), attachments, and
   detailed first-person models with animated components.
   ===================================================================== */
const WEAPONS = {
  // pistols (slot 1)
  pistol: { name: 'P-9 SD', type: 'pistol', mag: 15, reserve: 60, dmg: 48, rpm: 380, auto: false, spread: .012, adsSpread: .0025, recoil: .035, suppressed: true, reload: 1.6, adsFov: 58, noise: 10, sound: 'pistolS', price: 0, desc: '9mm · integral suppressor · reliable sidearm' },
  p45: { name: 'VKR-45 SD', type: 'pistol', mag: 10, reserve: 50, dmg: 74, rpm: 300, auto: false, spread: .013, adsSpread: .002, recoil: .052, suppressed: true, reload: 1.8, adsFov: 56, noise: 12, sound: 'pistolS', price: 2200, desc: '.45 ACP · one-shot headshots through helmets' },
  mp18: { name: 'MX-18 MACHINE PISTOL', type: 'pistol', mag: 22, reserve: 110, dmg: 30, rpm: 900, auto: true, spread: .022, adsSpread: .006, recoil: .022, suppressed: true, reload: 1.9, adsFov: 58, noise: 14, sound: 'pistolS', price: 3400, desc: 'Full-auto · suppressed · close quarters' },
  // rifles (slot 2)
  ar7: { name: 'AR-7 CARBINE', type: 'rifle', mag: 30, reserve: 150, dmg: 34, rpm: 760, auto: true, spread: .03, adsSpread: .004, recoil: .022, suppressed: false, reload: 2.3, adsFov: 50, noise: 140, sound: 'rifle', price: 0, desc: '5.56 · 30 rds · light and controllable' },
  mk17: { name: 'MK-17 BATTLE RIFLE', type: 'rifle', mag: 20, reserve: 100, dmg: 52, rpm: 560, auto: true, spread: .034, adsSpread: .003, recoil: .036, suppressed: false, reload: 2.6, adsFov: 46, noise: 160, sound: 'rifle2', price: 1800, desc: '7.62 · 20 rds · defeats body armour' },
  vx9: { name: 'VX-9 SD CARBINE', type: 'rifle', mag: 30, reserve: 150, dmg: 27, rpm: 820, auto: true, spread: .028, adsSpread: .005, recoil: .018, suppressed: true, reload: 2.2, adsFov: 52, noise: 18, sound: 'pistolS', price: 4200, desc: 'Integrally suppressed · stealth automatic' },
  sniper: { name: 'AWR-338 SNIPER RIFLE', type: 'rifle', sniper: true, mag: 5, reserve: 25, dmg: 260, rpm: 46, auto: false, spread: .09, adsSpread: .00015, recoil: .15, suppressed: false, reload: 3.3, adsFov: 18, noise: 240, sound: 'rifle2', price: 7600, desc: '.338 bolt-action · 4–12× variable scope · scroll to zoom while aiming' },
  dmr: { name: 'SR-25 MARKSMAN RIFLE', type: 'rifle', mag: 15, reserve: 75, dmg: 88, rpm: 300, auto: false, spread: .04, adsSpread: .0007, recoil: .06, suppressed: false, reload: 2.7, adsFov: 40, noise: 170, sound: 'rifle2', price: 5200, desc: '7.62 semi-auto · long range precision' },
  // knives (slot 3)
  knife: { name: 'CK-1 COMBAT KNIFE', type: 'knife', dmg: 150, throwDmg: 90, throwSpeed: 24, swing: .5, td: 1.75, noise: 0, price: 0, desc: 'Balanced fighting knife' },
  tanto: { name: 'TK-7 TANTO', type: 'knife', dmg: 170, throwDmg: 160, throwSpeed: 30, swing: .48, td: 1.65, noise: 0, price: 1200, desc: 'Heavy throwing blade · lethal throws' },
  karambit: { name: 'KR-3 KARAMBIT', type: 'knife', dmg: 160, throwDmg: 70, throwSpeed: 22, swing: .34, td: 1.3, noise: 0, price: 1600, desc: 'Fast slashes · quicker silent takedowns' },
};
const ATTACH = {
  optics: { iron: { name: 'IRON SIGHTS', price: 0, desc: 'Widest view' }, reddot: { name: 'RED DOT', price: 600, desc: '1× reflex · fast target acquisition' }, holo: { name: 'HOLOGRAPHIC', price: 900, desc: '1.25× ring reticle' }, scope: { name: '3× SCOPE', price: 1500, desc: '3× magnified optic · long range' } },
  muzzle: { none: { name: 'STANDARD MUZZLE', price: 0, desc: 'Loud' }, sup: { name: 'RIFLE SUPPRESSOR', price: 2500, desc: 'Gunshot noise −85% · damage −10%' } },
  mag: { std: { name: 'STANDARD MAGAZINE', price: 0, desc: '' }, ext: { name: 'EXTENDED MAGAZINES', price: 1100, desc: '+50% capacity · all guns' } },
  laser: { off: { name: 'NO LASER', price: 0, desc: '' }, on: { name: 'LASER MODULE', price: 700, desc: 'Hip-fire spread −30%' } },
};
const GEAR = {
  noisemaker: { name: 'NOISE MAKER ×2', price: 0, count: 2, desc: 'Lures guards to investigate' },
  smoke: { name: 'SMOKE GRENADE ×2', price: 500, count: 2, desc: 'Blocks line of sight ~15 s' },
  emp: { name: 'EMP CHARGE ×2', price: 1400, count: 2, desc: 'Disables cameras & lights in 18 m for 25 s' },
  medkit: { name: 'FIELD MEDKIT ×2', price: 800, count: 2, desc: 'Restores 70 health' },
};
const UPGRADES = {
  armor: { name: 'LEVEL IIIA SOFT ARMOUR', price: 2000, desc: 'Incoming damage −30%' },
  boots: { name: 'SILENT-SOLE BOOTS', price: 1300, desc: 'Footstep noise −40%' },
  extraMags: { name: '+2 SPARE MAGAZINES', price: 400, desc: 'More reserve ammunition' },
};
/* effective stats for the current loadout */
function effWeapon(id, L) {
  const w = Object.assign({ id }, WEAPONS[id]);
  if (w.type === 'rifle') {
    if (L.muzzle === 'sup' && !w.suppressed) { w.suppressed = true; w.noise = 22; w.dmg *= .9; w.sound = 'riflS'; }
    if (w.sniper) { w.optic = 'sniper'; if (L.muzzle === 'sup') { w.noise = 30; w.dmg = 230; } }
    else if (L.optic === 'scope') { w.adsFov = 22; w.adsSpread *= .6; } else if (L.optic === 'holo') w.adsFov *= .86;
  }
  if (w.type !== 'knife') { if (L.mag === 'ext') w.mag = Math.round(w.mag * 1.5); if (L.laser === 'on') w.spread *= .7; }
  return w;
}
const VM_CFG = {
  pistol: { hip: [.135, -.15, -.5], ads: [0, -.0565, -.33] },
  rifle: { hip: [.13, -.165, -.36], ads: [0, -.119, -.2] },
  rifleRD: { ads: [0, -.122, -.17] }, rifleHolo: { ads: [0, -.13, -.16] }, rifleScope: { ads: [0, -.136, -.09] },
  knife: { hip: [.17, -.2, -.45] },
};
/* ---------------- pistols ---------------- */
function buildPistolVM(B, kind = 'pistol') {
  const big = kind === 'p45', mp = kind === 'mp18'; const frameC = big ? 0x4a4234 : 0x202224, slideC = big ? 0x2e2e2c : 0x2b2d2f;
  const L = big ? .205 : .19, H = big ? .034 : .03;
  B.b(VB.WPN).col(frameC, MAT.PLASTIC);
  B.push().t(0, -.005, .01).rx(-.22).tbox(0, -.05, 0, .029, .105, .046, .03, .044).pop();
  B.col(lin(frameC).map(v => v * .7), MAT.RUBBER); for (let i = 0; i < 6; i++) B.push().t(0, -.018 - i * .015, .01).rx(-.22).box(0, 0, -.024, .031, .005, .004).box(.0155, 0, 0, .002, .005, .035).box(-.0155, 0, 0, .002, .005, .035).pop();
  B.col(frameC, MAT.PLASTIC).box(0, .012, -.06, .027, .028, .16).box(0, .015, .032, .03, .02, .02);
  B.col(lin(frameC).map(v => v * .85), MAT.PLASTIC).box(0, -.012, -.105, .022, .012, .07); for (let i = 0; i < 4; i++) B.box(0, -.019, -.08 - i * .016, .024, .003, .006);
  B.box(0, -.017, -.035, .006, .005, .055).box(0, -.035, -.005, .006, .028, .006).box(0, -.006, -.06, .006, .03, .006); // trigger guard
  B.col(0x111111, MAT.METAL).push().t(0, -.002, -.035).rx(.3).box(0, -.009, 0, .006, .022, .006).pop();
  B.col(0x1a1a1a, MAT.METAL).box(.0145, .005, -.025, .002, .008, .012).box(.0145, .022, .0, .003, .006, .02); // mag release, slide stop
  // suppressor (integral)
  const sl = mp ? .14 : .17, sr = big ? .017 : .015;
  B.col(0x0e0e0e, MAT.METAL).cylZ(0, .042, -L - sl / 2 + .015, sr, sl, 16).cylZ(0, .042, -L + .01, sr + .002, .012, 16).cylZ(0, .042, -L - sl + .02, sr + .001, .01, 16);
  B.col(0x232323, MAT.METAL); for (let i = 0; i < 7; i++) B.cylZ(0, .042, -L - .01 - i * .02, sr - .0005, .003, 14);
  B.col(0x050505, MAT.METAL).cylZ(0, .042, -L - sl + .014, .005, .004, 8);
  if (mp) { B.col(0x1a1a1a, MAT.PLASTIC).box(0, -.03, -.095, .02, .03, .02).box(0, -.045, -.095, .02, .006, .045); B.col(0x111111, MAT.METAL).box(.017, .045, -.02, .003, .01, .015); }
  // slide (moving)
  B.b(VB.SLD).col(slideC, MAT.METAL).box(0, .042, -L / 2 + .03, .028, H, L);
  B.col(lin(slideC).map(v => v * 1.15), MAT.METAL).box(0, .059, -L / 2 + .03, .02, .004, L - .01);
  B.col(0x141414, MAT.METAL); for (let i = 0; i < 7; i++) { B.box(0, .042, .02 - i * .0065, .0285, .022, .002); B.box(0, .042, -L + .045 + i * .0065, .0285, .018, .0018); }
  B.col(0x0a0a0a, MAT.METAL).box(.0141, .046, -.06, .001, .014, .034); B.col(0xb08a40, MAT.METAL).box(.012, .046, -.06, .002, .008, .02);
  B.col(0x111111, MAT.METAL).box(0, .061, .025, .022, .009, .012).box(0, .061, -L + .05, .007, .009, .009);
  B.col(0xd0f040, MAT.EMIT).box(0, .066, -L + .05, .002, .002, .002).box(-.006, .066, .025, .002, .002, .002).box(.006, .066, .025, .002, .002, .002);
  B.col(0x111111, MAT.METAL).box(0, .05, .036, .01, .016, .01); // hammer
  // magazine
  B.b(VB.MAG).col(0x151515, MAT.METAL).push().rx(-.22).box(0, -.06, .012, .022, .11, .035).col(0x2a2a2a, MAT.PLASTIC).box(0, -.118, .012, .026, .012, .042);
  if (mp) B.col(0x151515, MAT.METAL).box(0, -.15, .012, .022, .06, .035).col(0x2a2a2a, MAT.PLASTIC).box(0, -.182, .012, .026, .01, .042);
  B.col(0xb08a40, MAT.METAL).cylZ(0, -.004, .012, .004, .02, 6); B.pop();
}
/* ---------------- rifles ---------------- */
function buildRifleVM(B, variant, optic, muzzle) {
  if (variant === 'sniper') return buildSniperVM(B, muzzle);
  const mk = variant === 'mk17', vx = variant === 'vx9', dm = variant === 'dmr';
  B.b(VB.WPN);
  const rc = mk ? 0x5d5444 : dm ? 0x3a3c36 : 0x232425, rc2 = lin(rc).map(v => v * .8);
  const len = dm ? .42 : mk ? .34 : .3; // upper length
  B.col(0x1d1e1f, MAT.PLASTIC).push().t(0, -.004, .012).rx(-.35).tbox(0, -.045, 0, .03, .1, .046, .032, .042).pop();
  B.col(0x141414, MAT.RUBBER); for (let i = 0; i < 4; i++) B.push().t(0, -.02 - i * .02, .025 + i * .007).rx(-.35).box(0, 0, -.022, .032, .005, .004).pop();
  B.col(rc, MAT.METAL).box(0, .012, -.09, .044, .045, .22).box(0, .012, -.215, .044, .03, .04);       // lower + magwell
  B.col(rc2, MAT.METAL).box(.023, .012, -.13, .003, .035, .055);
  B.col(rc, MAT.METAL).box(0, .05, -.15, .046, .04, len);                                              // upper
  B.col(0x0b0b0b, MAT.METAL).box(.0235, .05, -.1, .002, .022, .065);                                   // ejection port
  B.col(rc2, MAT.METAL).box(.026, .05, -.06, .006, .03, .012).box(.026, .058, -.04, .008, .012, .016);  // brass deflector, forward assist
  B.col(0x141414, MAT.METAL).box(0, .077, -.15 - (len - .3) / 2, .024, .012, len + .06);              // top rail
  for (let i = 0; i < 18 + (dm ? 5 : 0); i++) B.box(0, .084, .02 - i * .022, .026, .004, .008);
  const hgL = dm ? .34 : vx ? .3 : mk ? .26 : .24, hgZ = -.32 - hgL / 2;
  B.col(rc, MAT.METAL).box(0, .042, hgZ, .052, .05, hgL);
  B.col(0x0d0d0d, MAT.METAL); for (let i = 0; i < Math.floor(hgL / .045); i++) { const z = -.34 - i * .045; B.box(.027, .045, z, .002, .028, .02).box(-.027, .045, z, .002, .028, .02).box(0, .016, z, .028, .002, .02); }
  B.col(0x141414, MAT.METAL).box(0, .012, hgZ, .02, .008, hgL - .04);
  // barrel / suppressor
  const bEnd = -.32 - hgL;
  if (vx) { B.col(0x0e0e0e, MAT.METAL).cylZ(0, .045, bEnd - .08, .022, .2, 16); B.col(0x1d1d1d, MAT.METAL); for (let i = 0; i < 6; i++) B.cylZ(0, .045, bEnd + .0 - i * .03, .0225, .004, 16); }
  else {
    const bl = dm ? .2 : .14; B.col(0x101010, MAT.METAL).cylZ(0, .045, bEnd - bl / 2 + .02, dm ? .011 : .01, bl, 12);
    const me = bEnd - bl + .02;
    if (muzzle === 'sup') { B.col(0x161616, MAT.METAL).cylZ(0, .045, me - .085, .021, .17, 16); B.col(0x0a0a0a, MAT.METAL); for (let i = 0; i < 5; i++) B.cylZ(0, .045, me - .03 - i * .025, .0213, .003, 16); B.cylZ(0, .045, me - .17, .008, .004, 10); }
    else { B.col(0x1a1a1a, MAT.METAL).cylZ(0, .045, me - .025, .016, .05, 10); for (let i = 0; i < 3; i++) B.box(0, .045 + (i - 1) * .009, me - .03, .034, .003, .03); }
    B.col(0x121212, MAT.METAL).cylZ(0, .045, bEnd + .02, .016, .03, 10);
  }
  // sights
  if (optic === 'iron' || !optic) { B.col(0x121212, MAT.METAL).box(0, .1, .03, .022, .03, .02).box(0, .118, .03, .009, .009, .012).box(0, .097, -.48, .016, .03, .016).box(0, .115, -.48, .004, .018, .004); }
  else { B.col(0x121212, MAT.METAL).box(0, .09, -.5, .016, .008, .02); }
  // stock
  B.col(0x1d1e1f, MAT.PLASTIC).cylZ(0, .035, .07, .015, .14, 12);
  if (dm) B.col(0x2a2c28, MAT.PLASTIC).tbox(0, .03, .2, .045, .11, .14, .046, .12).box(0, .08, .17, .02, .02, .1);
  else B.col(0x1d1e1f, MAT.PLASTIC).tbox(0, .02, .19, .04, .1, .12, .042, .1);
  B.box(0, -.035, .25, .045, .02, .02); B.col(0x0e0e0e, MAT.RUBBER).box(0, .015, .256, .046, .12, .016);
  // grip, trigger, controls
  B.col(0x111111, MAT.METAL).box(0, -.017, -.045, .006, .005, .055).push().t(0, 0, -.035).rx(.3).box(0, -.008, 0, .005, .018, .005).pop();
  B.col(0x1a1a1a, MAT.METAL).box(.024, .005, -.025, .004, .01, .02); // selector
  B.col(0x1a1a1a, MAT.PLASTIC).cyl(0, -.075, -.42, .014, .016, .07, 10); B.col(0x111111, MAT.RUBBER); for (let i = 0; i < 3; i++) B.cyl(0, -.07 + i * .02, -.42, .0165, .0165, .004, 10);
  if (dm) { B.col(0x1a1a1a, MAT.METAL).box(.01, -.005, -.55, .01, .01, .16).box(-.01, -.005, -.55, .01, .01, .16); }
  B.col(0x222222, MAT.PLASTIC).box(.032, .03, -.48, .018, .028, .06); B.col(G && G.loadout && G.loadout.laser === 'on' ? 0xff2020 : 0x30ff50, MAT.EMIT).box(.032, .03, -.511, .006, .006, .002);
  B.col(0x111111, MAT.METAL).torus(-.03, .03, .1, .012, .002, 8, 3); B.col(0x2a2a24, MAT.CANVAS).tube([-.03, .03, .1], [-.034, -.02, .3], .006);
  // optics
  if (optic === 'reddot') {
    B.col(0x151515, MAT.METAL).box(0, .1, -.15, .04, .015, .07).cylZ(0, .122, -.15, .022, .065, 16, 0);
    B.col(0x0b0b0b, MAT.METAL); for (const z of [-.118, -.182]) B.torus(0, .122, z, .022, .004, 16, 4); B.box(.024, .122, -.15, .008, .012, .016);
    B.col(0x406060, MAT.GLASS).push().t(0, .122, -.16).rx(Math.PI / 2).cyl(0, 0, 0, .019, .019, .002, 14).pop(); B.col(0xff2020, MAT.EMIT).box(0, .122, -.13, .0012, .0012, .0005);
  } else if (optic === 'holo') {
    B.col(0x151515, MAT.METAL).box(0, .1, -.14, .05, .015, .09).box(-.022, .13, -.14, .006, .05, .09).box(.022, .13, -.14, .006, .05, .09).box(0, .158, -.14, .05, .006, .09);
    B.col(0x406060, MAT.GLASS).vplane(0, .13, -.11, .036, .042); B.col(0xff2a2a, MAT.EMIT).box(0, .13, -.112, .0015, .0015, .0005);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; B.box(Math.cos(a) * .006, .13 + Math.sin(a) * .006, -.112, .0012, .0012, .0005); }
  } else if (optic === 'scope') {
    B.col(0x151515, MAT.METAL).box(0, .1, -.08, .03, .02, .02).box(0, .1, -.2, .03, .02, .02);
    B.col(0x1a1a1a, MAT.METAL).cylZ(0, .136, -.14, .017, .16, 16).cylZ(0, .136, -.24, .025, .05, 16).cylZ(0, .136, -.045, .021, .04, 16);
    B.col(0x111111, MAT.METAL).cyl(0, .152, -.14, .011, .011, .02, 10).push().t(.016, .136, -.14).rz(-Math.PI / 2).cyl(0, 0, 0, .011, .011, .02, 10).pop();
    B.col(0x284858, MAT.GLASS).push().t(0, .136, -.265).rx(Math.PI / 2).cyl(0, 0, 0, .023, .023, .002, 16).pop().push().t(0, .136, -.026).rx(Math.PI / 2).cyl(0, 0, 0, .019, .019, .002, 16).pop();
    B.col(0x111111, MAT.PAINT).box(0, .136, -.0255, .036, .0006, .0004).box(0, .136, -.0255, .0006, .036, .0004); B.col(0xff2020, MAT.EMIT).box(0, .136, -.0256, .0012, .0012, .0004);
  }
  // magazine (moving)
  B.b(VB.MAG).col(mk || dm ? 0x1b1b1b : 0x252525, MAT.METAL);
  if (mk || dm) B.push().t(0, -.01, -.13).rx(.08).box(0, -.08, 0, .03, .16, .07).box(0, -.165, 0, .034, .012, .075).col(0x2a2a2a, MAT.METAL).box(.0155, -.08, 0, .001, .12, .05).pop();
  else { B.push().t(0, -.01, -.13).rx(.12).box(0, -.06, 0, .026, .12, .065).rx(.2).box(0, -.15, .01, .026, .08, .062).box(0, -.19, .012, .03, .012, .066).pop(); B.col(0x1a1a1a).push().t(0, -.01, -.13).rx(.12); for (let i = 0; i < 4; i++) B.box(.0135, -.03 - i * .025, 0, .001, .015, .05); B.pop(); }
  B.col(0xb08a40, MAT.METAL).push().t(0, -.012, -.13).cylZ(0, 0, 0, .004, .045, 6).pop();
  // charging handle + visible bolt carrier (moving)
  B.b(VB.SLD).col(0x111111, MAT.METAL).box(0, .066, .03, .02, .01, .03).box(0, .066, .045, .05, .01, .01);
  B.col(0x3a3a38, MAT.METAL).box(.019, .05, -.1, .006, .016, .06);
}
/* bolt-action sniper rifle: chassis stock, fluted heavy barrel, 4-12x scope, folded bipod */
function buildSniperVM(B, muzzle) {
  B.b(VB.WPN);
  const od = 0x3b3f33, od2 = 0x2c2f27, blk = 0x151515;
  // pistol grip (same hand position as the carbines)
  B.col(0x1d1e1f, MAT.RUBBER).push().t(0, -.004, .012).rx(-.3).tbox(0, -.045, 0, .032, .1, .048, .034, .044).pop();
  B.col(0x141414, MAT.RUBBER); for (let i = 0; i < 4; i++) B.push().t(0, -.02 - i * .02, .025 + i * .007).rx(-.3).box(0, 0, -.023, .034, .005, .004).pop();
  // chassis / receiver
  B.col(od, MAT.PAINT).box(0, .01, -.1, .05, .045, .24).box(0, .03, .03, .046, .05, .06);
  B.col(0x26282a, MAT.METAL).cylZ(0, .052, -.12, .021, .26, 16);
  B.col(0x0b0b0b, MAT.METAL).box(.02, .052, -.09, .004, .02, .07);
  B.col(blk, MAT.METAL).box(0, .075, -.13, .022, .008, .3);
  for (let i = 0; i < 12; i++) B.box(0, .081, .0 - i * .024, .024, .004, .008);
  // trigger guard + trigger
  B.col(0x111111, MAT.METAL).box(0, -.022, -.04, .008, .005, .07).push().t(0, 0, -.03).rx(.3).box(0, -.008, 0, .005, .018, .005).pop();
  // stock: skeleton chassis, adjustable cheek riser, butt pad
  B.col(od, MAT.PAINT).box(0, .045, .12, .04, .03, .16).box(0, -.04, .17, .036, .022, .1).push().t(0, 0, .085).rx(.55).box(0, -.02, 0, .036, .07, .022).pop();
  B.col(od2, MAT.PAINT).box(0, .085, .14, .034, .03, .13); B.col(0x777777, MAT.METAL).cyl(0, .066, .1, .004, .004, .04, 6).cyl(0, .066, .18, .004, .004, .04, 6);
  B.col(od, MAT.PAINT).box(0, .015, .23, .044, .13, .03); B.col(0x0e0e0e, MAT.RUBBER).box(0, .015, .248, .046, .14, .014);
  B.col(blk, MAT.METAL).box(0, -.06, .19, .012, .03, .012); // monopod stub
  // free-float handguard
  B.col(od, MAT.PAINT).box(0, .045, -.42, .05, .05, .34);
  B.col(0x0d0d0d, MAT.METAL); for (let i = 0; i < 6; i++) { const z = -.3 - i * .05; B.box(.026, .05, z, .002, .024, .024).box(-.026, .05, z, .002, .024, .024); }
  B.col(blk, MAT.METAL).box(0, .016, -.42, .022, .008, .3);
  // folded bipod
  B.col(0x1a1a1a, MAT.METAL).box(0, .01, -.56, .03, .02, .03).box(.012, .0, -.47, .008, .008, .17).box(-.012, .0, -.47, .008, .008, .17);
  B.col(0x0e0e0e, MAT.RUBBER).box(.012, .0, -.385, .011, .011, .02).box(-.012, .0, -.385, .011, .011, .02);
  // fluted heavy barrel + brake / suppressor
  B.col(0x121212, MAT.METAL).cylZ(0, .048, -.76, .013, .36, 14);
  B.col(0x070707, MAT.METAL); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; B.box(Math.cos(a) * .012, .048 + Math.sin(a) * .012, -.74, .003, .003, .26); }
  if (muzzle === 'sup') { B.col(0x161616, MAT.METAL).cylZ(0, .048, -1.02, .024, .2, 16); B.col(0x0a0a0a, MAT.METAL); for (let i = 0; i < 6; i++) B.cylZ(0, .048, -.95 - i * .025, .0243, .003, 16); }
  else { B.col(0x1a1a1a, MAT.METAL).cylZ(0, .048, -.97, .019, .07, 12); B.col(0x050505, MAT.METAL); for (let i = 0; i < 3; i++) B.box(0, .048, -.95 - i * .02, .044, .01, .008); }
  // scope: rings, 30mm tube, turrets, objective bell, eyepiece
  B.col(0x141414, MAT.METAL); for (const z of [-.07, -.2]) B.box(0, .1, z, .03, .03, .022).cylZ(0, .136, z, .022, .024, 16);
  B.col(0x1b1c1c, MAT.METAL).cylZ(0, .136, -.13, .018, .22, 18).cylZ(0, .136, -.285, .032, .07, 20).cylZ(0, .136, -.255, .024, .03, 18).cylZ(0, .136, -.005, .023, .07, 18).cylZ(0, .136, -.05, .02, .03, 18);
  B.col(0x0d0d0d, MAT.RUBBER).cylZ(0, .136, .028, .024, .012, 18);
  B.col(0x111111, MAT.METAL).cyl(0, .166, -.13, .013, .013, .026, 12).push().t(.03, .136, -.13).rz(-Math.PI / 2).cyl(0, 0, 0, .012, .012, .024, 12).pop().push().t(-.026, .136, -.11).rz(Math.PI / 2).cyl(0, 0, 0, .009, .009, .016, 10).pop();
  B.col(0x2a2a2a, MAT.METAL); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; B.box(Math.cos(a) * .0135, .172, -.13 + Math.sin(a) * .0135, .002, .012, .002); }
  B.col(0xb02020, MAT.PAINT).box(0, .18, -.13, .004, .002, .012);
  B.col(0x284858, MAT.GLASS).push().t(0, .136, -.322).rx(Math.PI / 2).cyl(0, 0, 0, .03, .03, .002, 20).pop().push().t(0, .136, .035).rx(Math.PI / 2).cyl(0, 0, 0, .02, .02, .002, 16).pop();
  // magazine (moving): short 5-round box
  B.b(VB.MAG).col(0x1b1b1b, MAT.METAL).push().t(0, -.01, -.13).box(0, -.045, 0, .032, .09, .075).box(0, -.093, 0, .036, .012, .08).pop();
  B.col(0xb08a40, MAT.METAL).push().t(0, -.008, -.13).cylZ(0, 0, 0, .005, .06, 6).pop();
  // bolt + handle (moving)
  B.b(VB.SLD).col(0x2e2e2e, MAT.METAL).cylZ(0, .052, -.02, .012, .06, 12);
  B.push().t(.012, .052, -.005).rz(-.5).box(.03, 0, 0, .06, .008, .008).pop(); B.col(0x111111, MAT.RUBBER).sph(.065, .02, -.005, .012, .012, .012, 10, 8);
}
/* ---------------- knives ---------------- */
function buildKnifeVM(B, bone, kind = 'knife') {
  B.b(bone);
  const handle = kind === 'karambit' ? 0x3a2a1a : 0x1b1b1b;
  B.col(handle, kind === 'karambit' ? MAT.WOOD : MAT.RUBBER).cyl(0, -.06, 0, .014, .016, .11, 10);
  B.col(lin(handle).map(v => v * .7), MAT.RUBBER); for (let i = 0; i < 6; i++) B.cyl(0, -.052 + i * .016, 0, .0165, .0165, .004, 10);
  B.col(0x222222, MAT.METAL).cyl(0, -.07, 0, .015, .015, .012, 10);
  if (kind === 'karambit') { B.col(0x8a8e92, MAT.METAL).torus(0, -.08, 0, .018, .004, 14, 5); }
  else B.col(0x222222, MAT.METAL).box(0, .055, 0, .05, .01, .022);
  const steel = kind === 'tanto' ? 0x2a2c2e : 0xb8bcc0, edge = kind === 'tanto' ? 0x9a9ea2 : 0x8a8e92;
  B.push().t(0, .06, 0);
  if (kind === 'karambit') {
    B.col(steel, MAT.METAL); let px = 0, py = 0; for (let i = 0; i < 8; i++) { const a = i / 8 * 1.6; const nx = Math.sin(a) * .06, ny = (1 - Math.cos(a)) * -.02 + i * .012; B.beam([px, py, 0], [nx * 0 + px + .0, ny + .012, -Math.sin(a) * .03], .005, .02 - i * .002); px = 0; py = ny + .012; }
    B.pop(); return;
  }
  B.begin(); const L = kind === 'tanto' ? .16 : .17; B.col(steel, MAT.METAL);
  if (kind === 'tanto') {
    B.quad([-.003, 0, -.016], [.003, 0, -.016], [.003, L * .78, -.016], [-.003, L * .78, -.016]); B.tri([-.003, L * .78, -.016], [.003, L * .78, -.016], [0, L, .012]);
  } else { B.quad([-.003, 0, -.016], [.003, 0, -.016], [.003, L * .8, -.012], [-.003, L * .8, -.012]); B.tri([-.003, L * .8, -.012], [.003, L * .8, -.012], [0, L, .004]); }
  B.col(edge, MAT.METAL).quad([.003, 0, -.016], [.0005, 0, .016], [.0005, L * .85, .008], [.003, L * .8, -.014]);
  B.quad([-.0005, 0, .016], [-.003, 0, -.016], [-.003, L * .8, -.014], [-.0005, L * .85, .008]);
  B.tri([.0005, L * .85, .008], [0, L, .008], [.003, L * .8, -.014]); B.tri([-.003, L * .8, -.014], [0, L, .008], [-.0005, L * .85, .008]);
  B.col(0x2a2a2a, MAT.METAL).box(0, .05, -.016, .007, .1, .004);
  if (kind === 'knife') { B.col(0x5a5e62, MAT.METAL); for (let i = 0; i < 5; i++) B.box(0, .02 + i * .01, -.019, .006, .004, .004); }
  B.pop();
}

/* ---------------- operators (cosmetic + functional perks) ---------------- */
const OPERATORS = {
  viper: { name: 'VIPER', role: 'RECON SPECIALIST', price: 0, perk: 'Balanced kit — no trade-offs', sleeve: 0x4a5038, glove: 0x1c1c1a, app: { top: 'combat', camo: true, topCol: 0x4a5038, botCol: 0x3f4430, head: 'helmet', helmetCol: 0x3a3f2e, vest: 'plate', vestCol: 0x3a3e2c, gloves: true, feet: 'combat', hairStyle: 'buzz', skin: 0xc89670, beard: 'stubble', eyeCol: 0x3a2a1a }, perks: {} },
  ghost: { name: 'GHOST', role: 'INFILTRATION', price: 2500, perk: 'Footsteps 25% quieter · 15% harder to see', sleeve: 0x1e2024, glove: 0x0e0e0e, app: { top: 'combat', camo: false, topCol: 0x1e2024, botCol: 0x1a1c1e, head: 'balaclava', vest: 'rig', vestCol: 0x18191b, gloves: true, feet: 'combat', skin: 0xe0b896, eyeCol: 0x2a4a6a }, perks: { quiet: .75, vis: .85 } },
  wolf: { name: 'WOLF', role: 'ASSAULT', price: 3500, perk: '+30 maximum health · faster recovery', sleeve: 0x8a7a5a, glove: 0x3a2a1a, app: { top: 'combat', camo: true, topCol: 0x8a7a5a, botCol: 0x6a5e48, head: 'cap', capCol: 0x5a4a32, vest: 'plate', vestCol: 0x6a5e44, gloves: true, feet: 'combat', hairStyle: 'short', beard: 'full', skin: 0xa87452, bulk: 1.1 }, perks: { hp: 130, regen: 1.5 } },
  raven: { name: 'RAVEN', role: 'COUNTER-TERROR', price: 4500, perk: 'Slow-motion lasts 5 s longer, recharges 30% faster', sleeve: 0x4a4e54, glove: 0x1a1a1c, app: { female: true, top: 'combat', camo: true, topCol: 0x4a4e54, botCol: 0x3a3e44, head: 'none', hairStyle: 'pony', hair: 0x2a1a10, vest: 'plate', vestCol: 0x2e3238, gloves: true, feet: 'combat', skin: 0xd8b090, eyeCol: 0x3a5a3a }, perks: { slowDur: 20, slowRe: .7 } },
};
const SHOP_DEFAULT_OWNED = ['pistol', 'ar7', 'knife', 'iron', 'none', 'std', 'off', 'noisemaker', 'viper'];
function owns(id) { return G.career.owned.includes(id); }
function operatorPerks() { const o = OPERATORS[G.loadout.operator] || OPERATORS.viper; return o.perks || {}; }
