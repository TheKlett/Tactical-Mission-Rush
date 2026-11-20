/* =====================================================================
   OVERCAST — the title in the sky: giant glowing block letters laid
   flat beneath the jumper, placed exactly on the predicted fall path,
   and the end card.
   ===================================================================== */
Story.buildTitle = function (p, yaw) {
  const right = [Math.cos(yaw), 0, -Math.sin(yaw)], fwd = [-Math.sin(yaw), 0, -Math.cos(yaw)];
  // predict where the jumper will be at a given depth (same physics as P.updateFall, no input)
  const predict = depth => { const v = V.copy(P.fallVel), q = V.copy(p); const dt = 1 / 30; let n = 0; while (p[1] - q[1] < depth && n++ < 3000) { v[1] -= 9.8 * dt; const sp = Math.hypot(v[0], v[1], v[2]); const dr = .0039 * sp * sp; v[0] -= v[0] / sp * dr * dt; v[1] -= v[1] / sp * dr * dt; v[2] -= v[2] / sp * dr * dt; v[0] = damp(v[0], P.drift[0], .7, dt); v[2] = damp(v[2], P.drift[2], .7, dt); q[0] += v[0] * dt; q[1] += v[1] * dt; q[2] += v[2] * dt; } return q; };
  const drank = !!Cabin.drank;
  const items = [
    ['OVERCAST', 3.4, 160, 0xf4f6fa, { edge: 0x9cc8ff }], ['PART ONE', 1.4, 290, 0xdfe6ee], ['THE DROP', 1.4, 318, 0xdfe6ee],
    ['STARRING', .7, 450, 0xc8d0d8], ['YOU', 1.1, 466, 0xffffff], ['AND MOX', .8, 520, 0xc8d0d8], [drank ? 'AND ONE APPLE JUICE' : 'AND ONE UNTOUCHED APPLE JUICE', .55, 575, 0xffd27a],
  ];
  this.titles = [];
  for (const [txt, px, depth, col, o] of items) {
    const B = new MB(20000); const w = buildText(B, txt, px, px * .9, col, MAT.EMIT, o || {});
    const c = predict(depth); const off = o && o.edge ? 0 : (depth > 400 ? 6 : 0);
    const m = M4.basis(M4.create(), right, fwd, [0, 1, 0], [c[0] + right[0] * off, p[1] - depth, c[2] + right[2] * off]);
    const d = { mesh: B.mesh(), m, pos: [c[0], p[1] - depth, c[2]], r: w * .6 + 10, noShadow: true }; G.extraDyn.push(d); this.titles.push(d);
  }
  // slow shimmer: each line gently brightens as you pass it
  G.updaters.push(dt => { for (const d of Story.titles || []) { const dy = G.cam.pos[1] - d.pos[1]; d.tint = [1 + clamp(1 - Math.abs(dy) / 60, 0, 1) * .6, 1 + clamp(1 - Math.abs(dy) / 60, 0, 1) * .6, 1 + clamp(1 - Math.abs(dy) / 60, 0, 1) * .6, 0]; } });
};
Story.ending = function () {
  this.phase = 'end'; UI.hint(''); UI.objective('');
  UI.fadeTo(1, 2.2);
  setTimeout(() => {
    try { if (Flight.wind) Flight.wind.stop(); } catch (e) { }
    AUD.stopAllLoops(); if (window.speechSynthesis) speechSynthesis.cancel(); Flight.wind = null;
    UI.endCard(); AUD.pad('title');
  }, 2300);
};
