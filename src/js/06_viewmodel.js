/* =====================================================================
   VIEWMODEL — first-person arms & weapons. Procedural keyframed
   animation with 2-bone IK so hands physically interact with weapons,
   magazines, doors, buttons, items, steering wheels and parachute toggles.
   ===================================================================== */
const VM = {
  shR: [.2, -.26, .05], shL: [-.2, -.26, .05], sprint: 0, low: 0, magDrop: null, knifeVis: 0,
  restL: [-.24, -.62, -.2], restR: [.24, -.62, -.2],
  // basis helpers
  gripBasis(W) { const hx = V.norm(M4.dir(W, 1, 0, 0)), hy = V.norm(M4.dir(W, 0, .5, .9)); return [hx, hy, V.cross(hx, hy)]; },
  foreBasis(W) { const hx = V.norm(M4.dir(W, .3, .95, 0)), hz = V.norm(M4.dir(W, 0, 0, 1)); const hy = V.cross(hz, hx); return [hx, hy, hz]; },
  reachBasis(sh, T, left) { const hy = V.norm(V.sub(sh, T)); let hx = V.norm(V.cross(hy, [0, 1, 0])); if (!isFinite(hx[0])) hx = [1, 0, 0]; if (left) hx = V.sc(hx, -1); hx = V.sc(hx, -1); const hz = V.cross(hx, hy); return [hx, hy, hz]; },
  blendBasis(a, b, k) { const hx = V.norm(V.lerp(a[0], b[0], k)); let hy = V.lerp(a[1], b[1], k); hy = V.norm(V.sub(hy, V.sc(hx, V.dot(hy, hx)))); return [hx, hy, V.cross(hx, hy)]; },
  // wrist position so that the fist centre lands on `c`
  wrist(c, bs, left) { const sx = left ? -1 : 1; return V.sub(c, V.add(V.sc(bs[0], -sx * .015), V.sc(bs[1], -.065))); },
  update(dt) {
    const L = P.vmL; const A = P.anim; const w = P.weapon; const u = A.d > 1e8 ? 0 : clamp(A.t / A.d, 0, 1);
    const W8 = WEAPONS[w]; const isP = w === 'pistol', isR = W8 && W8.type === 'rifle', isK = w === 'knife';
    const item = P.curItemKind(); const st = P.state;
    const optic = G.loadout.optic;
    let cfg = isP ? VM_CFG.pistol : isR ? VM_CFG.rifle : VM_CFG.knife;
    const adsP = isR ? (optic === 'reddot' ? VM_CFG.rifleRD.ads : optic === 'holo' ? VM_CFG.rifleHolo.ads : cfg.ads) : (cfg.ads || cfg.hip);
    const pos = V.lerp(cfg.hip, adsP, P.ads); let rx = 0, ry = 0, rz = 0;
    const b = P.bob, ba = P.bobAmt * (1 - P.ads * .85);
    pos[0] += Math.sin(b) * .011 * ba; pos[1] += -Math.abs(Math.cos(b)) * .013 * ba; rz += Math.sin(b) * .02 * ba; ry += Math.cos(b) * .01 * ba;
    pos[1] += Math.sin(G.time * 1.6) * .0022 * (1 - P.ads * .8); rx += Math.sin(G.time * 1.6) * .004 * (1 - P.ads);
    const sw = 1 - P.ads * .75; pos[0] += P.swayX * sw; pos[1] += P.swayY * sw; ry += P.swayX * 2.2 * sw; rx += -P.swayY * 2 * sw;
    this.sprint = damp(this.sprint, P.sprinting && !P.busy() ? 1 : 0, 9, dt); const sp = this.sprint;
    if (isR) { pos[0] -= .02 * sp; pos[1] -= .06 * sp; pos[2] += .04 * sp; ry += .75 * sp; rx -= .3 * sp; rz += .3 * sp; }
    else { pos[1] -= .07 * sp; rx -= .75 * sp; pos[2] += .05 * sp; }
    rz -= .06 * P.crouch * (1 - P.ads);
    pos[2] += P.kickZ; rx += P.kickP * .55; rz += P.kickR * .3; pos[1] += P.kickP * .01;
    pos[1] -= P.land * .05; rx -= P.land * .1;
    if (A.k === 'holster') { const k = ease(u); pos[1] -= .38 * k; rx -= 1.1 * k; }
    if (A.k === 'draw') { const k = 1 - ease(u); pos[1] -= .38 * k; rx -= 1.1 * k; rz += .3 * k; if (isP) { /* slide check */ } }
    if (A.k === 'reload') { const k = isR ? smooth(seg(u, 0, .12)) * (1 - smooth(seg(u, .88, 1))) : smooth(seg(u, 0, .1)) * (1 - smooth(seg(u, .9, 1))); rz += (isR ? .5 : .35) * k; rx += .18 * k; pos[0] -= .03 * k; pos[1] += .02 * k; ry -= .15 * k; }
    if (A.k === 'melee') { const w1 = smooth(seg(u, 0, .3)), w2 = smooth(seg(u, .3, .48)), w3 = smooth(seg(u, .55, 1)); const k = w1 * (1 - w3); ry += (.6 * w1 - 1.5 * w2) * (1 - w3); pos[0] += (.1 * w1 - .18 * w2) * (1 - w3); pos[2] -= .15 * w2 * (1 - w3); rz += .5 * k; pos[1] += .04 * k; }
    // lower the weapon for interactions
    const lowT = (A.k === 'interact' || A.k === 'hold' || A.k === 'takedown' || st === 'fall' || st === 'chute' || st === 'vehicle' || st === 'boatride' || st === 'heliride' || A.k === 'chutepull') ? 1 : 0;
    this.low = damp(this.low, lowT, 8, dt);
    pos[1] -= .35 * this.low; rx -= .9 * this.low; pos[0] += .06 * this.low;
    const Wm = M4.trs(L[VB.WPN], M4.create(), pos[0], pos[1], pos[2], rx, ry, rz);
    // -------- hands --------
    let RT, RB, LT, LB;
    const gun = isP || isR;
    if (gun) {
      const gb = this.gripBasis(Wm); const gc = M4.pt(Wm, ...(isP ? [0, -.05, .012] : [0, -.045, .03]));
      RB = gb; RT = this.wrist(gc, gb, false);
      if (isR) { const fb = this.foreBasis(Wm); LB = fb; LT = this.wrist(M4.pt(Wm, 0, .012, -.31), fb, true); }
      else { LB = gb; LT = this.wrist(M4.pt(Wm, -.022, -.065, .03), gb, true); }
    } else {
      // knife or item in right hand
      const kp = V.copy(pos); if (isK) { kp[1] += .02; }
      const kb = [V.norm([1, 0, .25]), V.norm([.15, .55, .85]), null]; kb[2] = V.cross(kb[0], kb[1]);
      const Wk = M4.trs(M4.create(), M4.create(), kp[0], kp[1], kp[2], rx, ry, rz);
      RB = [V.norm(M4.dir(Wk, ...kb[0])), V.norm(M4.dir(Wk, ...kb[1])), null]; RB[2] = V.cross(RB[0], RB[1]);
      RT = M4.pt(Wk, 0, 0, 0); LT = V.copy(this.restL); LB = this.reachBasis(this.shL, LT, true);
      if (item && !isK) { LT = V.add(RT, [-.12, .01, -.03]); LB = this.reachBasis(this.shL, LT, true); }
    }
    // -------- action overrides --------
    const shL = this.shL, shR = this.shR;
    const camInv = M4.invert(M4.create(), P.camM);
    const toCam = p => M4.pt(camInv, p[0], p[1], p[2]);
    let magOff = null, magHand = null, slide = 0, itemShow = null, itemHand = 'L', knifeShow = isK ? 1 : 0, wpnShow = gun ? 1 : 0;
    if (A.k === 'reload' && isR) {
      const magC = M4.pt(Wm, 0, -.08, -.13); const below = V.add(magC, [-.02, -.5, .1]);
      const k1 = smooth(seg(u, .05, .17)), k2 = smooth(seg(u, .17, .34)), k3 = smooth(seg(u, .34, .5)), k4 = smooth(seg(u, .5, .64)), k5 = smooth(seg(u, .64, .72)), k6 = smooth(seg(u, .74, .8)), k7 = smooth(seg(u, .8, .86)), k8 = smooth(seg(u, .88, 1));
      const grab = V.add(magC, [-.01, -.03, .02]);
      let h = V.lerp(LT, grab, k1); let off = [0, 0, 0];
      if (k1 >= 1) { off = [0, -.12 * k2, .03 * k2]; h = V.add(grab, off); }
      if (k2 >= 1) { h = V.lerp(V.add(grab, [0, -.12, .03]), below, k3); }
      if (k3 >= 1) { h = V.lerp(below, V.add(grab, [0, -.09, .02]), k4); }
      if (k4 >= 1) { h = V.lerp(V.add(grab, [0, -.09, .02]), grab, k5); }
      const ch = M4.pt(Wm, -.03, .07, .06);
      if (k5 >= 1) { h = V.lerp(grab, ch, k6); }
      if (k6 >= 1) { h = V.add(ch, [0, 0, .06 * k7 * (1 - smooth(seg(u, .86, .88)))]); slide = .06 * k7 * (1 - smooth(seg(u, .86, .88))); }
      if (k7 >= 1) h = V.lerp(ch, LT, k8);
      if (u > .17 && u < .72) magHand = true;
      const rb = this.reachBasis(shL, h, true); LB = this.blendBasis(LB, rb, (u > .06 && u < .9) ? 1 : 0); LT = h;
      if (!A.s1 && u > .2) { A.s1 = 1; AUD.mech('magOut'); } if (!A.s2 && u > .7) { A.s2 = 1; AUD.mech('magIn'); } if (!A.s3 && u > .81) { A.s3 = 1; AUD.mech('rack'); }
      if (magHand) magOff = h;
    } else if (A.k === 'reload' && isP) {
      const magC = M4.pt(Wm, 0, -.12, .02); const below = [-.18, -.55, -.15];
      const k1 = smooth(seg(u, .2, .42)), k2 = smooth(seg(u, .45, .66)), k3 = smooth(seg(u, .68, .74)), k4 = smooth(seg(u, .74, .84)), k5 = smooth(seg(u, .86, 1));
      let h = V.lerp(LT, below, k1); if (k1 >= 1) h = V.lerp(below, V.add(magC, [0, -.06, .0]), k2);
      if (k2 >= 1) h = V.lerp(V.add(magC, [0, -.06, 0]), V.add(magC, [0, -.01, 0]), k3);
      const sl = M4.pt(Wm, -.03, .06, -.02); if (k3 >= 1) h = V.lerp(V.add(magC, [0, -.01, 0]), sl, k4);
      if (k4 >= 1) h = V.lerp(sl, LT, k5);
      if (u < .45) { magOff = 'drop'; } else if (u < .74) { magHand = true; magOff = V.add(h, [0, .03, 0]); }
      slide = u < .8 ? 1 : 0;
      const rb = this.reachBasis(shL, h, true); LB = this.blendBasis(LB, rb, (u > .15 && u < .9) ? 1 : 0); LT = h;
      if (!A.s1 && u > .08) { A.s1 = 1; AUD.mech('magOut'); this.magDrop = { t: 0 }; } if (!A.s2 && u > .72) { A.s2 = 1; AUD.mech('magIn'); } if (!A.s3 && u > .82) { A.s3 = 1; AUD.mech('slide'); }
    } else if (A.k === 'interact' || A.k === 'hold') {
      const tgt = A.k === 'hold' ? (typeof A.it.pos === 'function' ? A.it.pos() : A.it.pos) : A.target;
      let T = toCam(tgt); const dist = V.len(V.sub(T, shL)); if (dist > VM_UA + VM_FA) T = V.add(shL, V.sc(V.norm(V.sub(T, shL)), (VM_UA + VM_FA) * .98));
      let k;
      if (A.k === 'hold') {
        k = smooth(clamp(A.t / .35, 0, 1)); const j = G.time; const kind = A.kind;
        const jit = kind === 'hotwire' ? [Math.sin(j * 9) * .02, Math.sin(j * 13) * .015, Math.cos(j * 7) * .015] : kind === 'plant' ? [Math.sin(j * 4) * .02, Math.sin(j * 6) * .01, 0] : [Math.sin(j * 5) * .015, Math.cos(j * 3) * .01, 0];
        T = V.add(T, jit);
        if (kind === 'hotwire' || kind === 'plant' || kind === 'search') { // both hands
          const T2 = V.add(T, [.12, -.02 + Math.sin(j * 11) * .02, .02]); const rb2 = this.reachBasis(shR, T2, false);
          RT = V.lerp(RT, T2, k); RB = this.blendBasis(RB, rb2, k); wpnShow = 0; knifeShow = 0;
          if (kind === 'plant') { itemShow = 'charge'; itemHand = 'R'; }
          if (kind === 'hotwire' && Math.random() < dt * 6) G.sparks(tgt);
        }
      } else {
        const at = A.at; const k1 = smooth(seg(u, 0, at)), k2 = smooth(seg(u, at + .08, 1)); k = k1 * (1 - k2);
        if (A.kind === 'press') T = V.add(T, V.sc(V.norm(V.sub(T, shL)), .03 * bump(u, at - .1, at + .1)));
        if (A.kind === 'door') { const off = smooth(seg(u, at, at + .25)); T = V.add(T, [0, 0, -.1 * off]); }
        if (A.kind === 'pickup' && u > at) { const pd = smooth(seg(u, at, 1)); T = V.lerp(T, [-.12, -.65, -.05], pd); k = 1 - smooth(seg(u, .9, 1)); itemShow = A.item; }
      }
      const rb = this.reachBasis(shL, T, true); LT = V.lerp(LT, T, k); LB = this.blendBasis(LB, rb, k);
    } else if (A.k === 'takedown') {
      const k1 = smooth(seg(u, 0, .2)), k2 = smooth(seg(u, .85, 1));
      const neck = [-.02, -.28, -.42]; const T = V.lerp(LT, neck, k1 * (1 - k2)); LT = T; LB = this.blendBasis(LB, this.reachBasis(shL, neck, true), k1 * (1 - k2));
      const hasKnife = !P.thrownKnife;
      const rs = [.22, -.28, -.28], stab = [.03, -.25, -.5];
      const s1 = smooth(seg(u, .25, .4)), s2 = smooth(seg(u, .4, .5)), s3 = smooth(seg(u, .7, .95));
      let rp = V.lerp(RT, rs, s1); if (s1 >= 1) rp = V.lerp(rs, stab, s2); if (s2 >= 1) rp = V.lerp(stab, RT, s3);
      if (!hasKnife) rp = V.lerp(RT, [.06, -.3, -.38], k1 * (1 - k2));
      RT = rp; RB = this.blendBasis(RB, [V.norm([1, 0, .3]), V.norm([.1, .4, .9]), null].map((v, i, a) => i === 2 ? V.cross(a[0], a[1]) : v), s1 * (1 - s3));
      wpnShow = 0; knifeShow = hasKnife ? 1 : 0;
    } else if (A.k === 'stab') {
      const k1 = smooth(seg(u, 0, .2)), k2 = smooth(seg(u, .3, 1)); const side = A.side;
      const tgt = side > 0 ? [-.05, -.18, -.62] : [.08, -.2, -.6];
      RT = V.lerp(RT, tgt, k1 * (1 - k2)); const sb = [V.norm([1, side * .6, 0]), V.norm([0, .3, 1]), null]; sb[2] = V.cross(sb[0], sb[1]); RB = this.blendBasis(RB, sb, k1 * (1 - k2));
    } else if (A.k === 'throw') {
      const k1 = smooth(seg(u, 0, .3)), k2 = smooth(seg(u, .3, .42)), k3 = smooth(seg(u, .5, 1));
      let h = V.lerp(RT, [.28, .02, .05], k1); if (k1 >= 1) h = V.lerp([.28, .02, .05], [.05, -.08, -.6], k2); if (k2 >= 1) h = V.lerp([.05, -.08, -.6], [.24, -.62, -.2], k3 * 0 + k3);
      RT = h; if (u > .32) knifeShow = 0;
      LT = V.lerp(LT, [-.15, -.15, -.5], bump(u, 0, .6)); LB = this.reachBasis(shL, LT, true);
    } else if (A.k === 'gadget') {
      const k1 = smooth(seg(u, 0, .38)), k2 = smooth(seg(u, .38, .5)), k3 = smooth(seg(u, .55, 1));
      let h = V.lerp(RT, [.26, .05, .06], k1); if (k1 >= 1) h = V.lerp([.26, .05, .06], [.05, -.02, -.6], k2); if (k2 >= 1) h = V.lerp([.05, -.02, -.6], RT, k3);
      RT = h; if (A.fired) { itemShow = null; }
      LT = V.lerp(LT, [-.12, -.12, -.5], bump(u, 0, .7)); LB = this.reachBasis(shL, LT, true);
    } else if (A.k === 'chutepull') {
      const k1 = smooth(seg(u, 0, .35)), k2 = smooth(seg(u, .35, .7));
      const rc = [.1, -.32, -.22]; RT = V.lerp(V.lerp(this.restR, rc, k1), [.32, .18, -.3], k2); RB = this.reachBasis(shR, RT, false); wpnShow = 0; knifeShow = 0;
      LT = V.lerp(this.restL, [-.45, -.05, -.3], k1); LB = this.reachBasis(shL, LT, true);
    }
    // state-based hand placement
    if (st === 'fall' && A.k !== 'chutepull') { const fl = Math.sin(G.time * 7) * .015; LT = [-.36, -.1 + fl, -.42]; RT = [.36, -.1 - fl, -.42]; LB = this.reachBasis(shL, LT, true); RB = this.reachBasis(shR, RT, false); wpnShow = 0; knifeShow = 0; }
    if (st === 'chute' && A.k !== 'chutepull') {
      const tl = IN.k('KeyA') ? .2 : 0, tr = IN.k('KeyD') ? .2 : 0, fl = IN.k('KeyS') ? .22 : 0;
      LT = [-.34, .26 - tl - fl, -.22]; RT = [.34, .26 - tr - fl, -.22]; LB = this.reachBasis(shL, LT, true); RB = this.reachBasis(shR, RT, false); wpnShow = 0; knifeShow = 0;
    }
    if (st === 'vehicle') { const hs = G.vehicleHands(toCam); LT = hs[0]; RT = hs[1]; LB = hs[2]; RB = hs[3]; wpnShow = 0; knifeShow = 0; }
    if (st === 'boatride' || st === 'heliride') { LT = [-.28, -.42, -.32]; RT = [.25, -.45, -.3]; LB = this.reachBasis(shL, LT, true); RB = this.reachBasis(shR, RT, false); wpnShow = 0; knifeShow = 0; }
    if (item && !isK && !gun && A.k !== 'hold') { itemShow = itemShow ?? item; if (A.k !== 'interact') itemHand = 'R'; if (A.k === 'gadget' && A.fired) itemShow = null; }
    if (P.state === 'dead') { wpnShow = 0; knifeShow = 0; }
    // -------- IK solve --------
    const solveArm = (S, T, bs, ua, fa, hb, left) => {
      const r = ik2(S, T, VM_UA, VM_FA, V.add(S, left ? [-.55, -1, .25] : [.55, -1, .25]));
      const side = left ? [-1, 0, 0] : [1, 0, 0];
      segMat(L[ua], S, r.E, side); segMat(L[fa], r.E, r.T, side); M4.basis(L[hb], bs[0], bs[1], bs[2], r.T);
    };
    solveArm(shR, RT, RB, VB.UAR, VB.FAR, VB.HR, false); solveArm(shL, LT, LB, VB.UAL, VB.FAL, VB.HL, true);
    // -------- attachments --------
    if (!wpnShow) M4.copy(L[VB.WPN], ZERO_M);
    // magazine
    if (wpnShow) {
      M4.copy(L[VB.MAG], Wm);
      if (magOff === 'drop') { if (this.magDrop) { this.magDrop.t += dt; const tt = this.magDrop.t; M4.translate(L[VB.MAG], Wm, 0, -tt * tt * 5 - tt * .4, 0); if (tt > .5) M4.copy(L[VB.MAG], ZERO_M); } }
      else if (magOff) { const mc = isR ? [0, -.08, -.13] : [0, -.07, .015]; const cur = M4.pt(Wm, ...mc); const d = V.sub(V.add(magOff, [0, .05, 0]), cur); L[VB.MAG][12] += d[0]; L[VB.MAG][13] += d[1]; L[VB.MAG][14] += d[2]; }
      // slide / charging handle
      const sl = isP ? (slide ? .035 : .03 * P.slideBack) + (P.ammo.pistol && P.ammo.pistol.mag === 0 && A.k !== 'reload' ? .035 : 0) : slide;
      M4.translate(L[VB.SLD], Wm, 0, 0, Math.min(.035, sl));
    } else { M4.copy(L[VB.MAG], ZERO_M); M4.copy(L[VB.SLD], ZERO_M); }
    // knife in right hand
    if (knifeShow) { M4.mul(L[VB.KNIFE], L[VB.HR], M4.trs(M4.create(), M4.create(), -.015, -.065, 0, -Math.PI / 2, 0, 0)); } else M4.copy(L[VB.KNIFE], ZERO_M);
    if (itemShow) { const hb = itemHand === 'R' ? VB.HR : VB.HL; M4.mul(L[VB.ITEM], L[hb], M4.trs(M4.create(), M4.create(), (itemHand === 'R' ? -1 : 1) * .03, -.08, -.02, .3, 0, 0)); this.itemKind = itemShow; } else { M4.copy(L[VB.ITEM], ZERO_M); this.itemKind = null; }
    // -------- to world --------
    const out = P.vmBones; const tmp = M4.create();
    for (let i = 0; i < VB.N; i++) { if (L[i][15] === 0) { out.set(ZERO_M, i * 16); continue; } M4.mul(tmp, P.camM, L[i]); out.set(tmp, i * 16); }
    this.wpnWorld = M4.mul(M4.create(), P.camM, Wm); this.isR = isR; this.isP = isP; this.gun = gun && wpnShow;
  },
  muzzleWorld() { return M4.pt(this.wpnWorld, 0, this.isR ? .045 : .042, this.isR ? -.77 : -.33); },
  ejectWorld() { return M4.pt(this.wpnWorld, .03, .05, this.isR ? -.1 : -.06); },
  drawList() {
    const list = [{ mesh: P.vmArms, bones: P.vmBones }];
    const w = P.weapon;
    if (w === 'pistol') list.push({ mesh: P.vmMeshes.pistol, bones: P.vmBones }); else if (WEAPONS[w] && WEAPONS[w].type === 'rifle') list.push({ mesh: P.vmMeshes.rifle, bones: P.vmBones });
    list.push({ mesh: P.vmMeshes.knife, bones: P.vmBones });
    if (this.itemKind && P.vmMeshes.items[this.itemKind]) list.push({ mesh: P.vmMeshes.items[this.itemKind], bones: P.vmBones });
    return list;
  },
};
