/* =====================================================================
   OVERCAST — boot
   ===================================================================== */
window.addEventListener('load', () => {
  try { G.init(); UI.init(); }
  catch (e) { console.error(e); const el = document.getElementById('err'); el.style.display = 'flex'; el.innerHTML = 'OVERCAST could not start.<br><br>' + (e && e.message ? e.message : e) + '<br><br>A desktop browser with WebGL2 support (Chrome, Edge, Firefox) is required.'; }
});
