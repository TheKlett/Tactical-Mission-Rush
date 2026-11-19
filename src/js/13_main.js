/* =====================================================================
   BOOT
   ===================================================================== */
window.addEventListener('load', () => {
  try {
    G.init(); UI.init();
    const upd = () => { const n = MISSIONS.filter(m => G.career.completed[m.id]).length; const e = document.getElementById('mCamp'); if (e) e.textContent = n + ' / ' + MISSIONS.length; };
    upd(); setInterval(upd, 2000);
  } catch (e) {
    console.error(e); const el = document.getElementById('err'); el.style.display = 'flex';
    el.innerHTML = 'REDLINE could not start.<br><br>' + (e && e.message ? e.message : e) + '<br><br>A desktop browser with WebGL2 support (Chrome, Edge, Firefox) is required.';
  }
});
