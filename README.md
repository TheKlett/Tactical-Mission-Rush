# REDLINE — Tactical Mission Rush

A first-person tactical stealth/assault game in **one self-contained HTML file** (`index.html`).
No libraries, no external assets: rendering is a custom WebGL2 engine, every model is procedurally
modelled, and every sound is synthesized with the Web Audio API.

**Play:** open `index.html` in a desktop browser with WebGL2 (Chrome, Edge, Firefox). Headphones recommended.

## Controls

| Key | Action |
| --- | --- |
| W A S D | Move |
| Mouse | Look |
| LMB | Fire (with knife: slash; while holding RMB: throw) |
| RMB | Aim down sights / knife throw stance |
| F | Silent takedown (from behind an unaware enemy) |
| Q | Melee with the equipped weapon |
| E | Interact (hold for long actions: hotwire, plant, search, cut power) |
| R | Reload |
| Space | Jump / deploy parachute / vehicle handbrake |
| Shift | Sprint |
| Ctrl (or C on foot) | Crouch |
| 1 – 5 | Inventory slots (4 = mission bag, press again to cycle) |
| C (in vehicle) | Toggle driver / chase camera |
| Esc | Pause |

## Missions

1. **Swamp Infiltration** — HALO jump from a C-130 at dusk onto a cartel compound in the delta.
   Eliminate commander Ortega, extract by helicopter.
2. **Harbor Blackout** — RIB insertion into a storm-lashed PMC freight terminal at night. Steal the
   manifest drive, sabotage container K-7, escape by speedboat.
3. **Frostline** — helicopter insertion onto a snowbound mountain uplink station. Sabotage three relay
   transmitters, steal the launch codes from the vault, exfiltrate by truck.

Each mission supports a full stealth approach (shadows, foliage, crouching, takedowns, cutting power,
distractions) and a direct assault approach.

## Source layout

`index.html` is generated — edit the sources in `src/` and rebuild:

```
./build.sh        # concatenates src/style.css + src/js/*.js into src/index.template.html -> index.html
```

| File | Contents |
| --- | --- |
| `src/js/00_util.js` | math, matrices, noise |
| `src/js/01_audio.js` | synthesized audio engine (weapons, footsteps, voices, ambience, engines, music) |
| `src/js/02_gl.js` | WebGL2 renderer: procedural materials, shadow maps, lights, fog, sky, water, particles |
| `src/js/03_models.js` | character rig + models, viewmodel weapons, vehicles, aircraft, parachute |
| `src/js/04_world.js` | terrain, collision, raycasts, navigation (A*), doors, buildings & furnished interiors |
| `src/js/05_player.js` | input, movement, freefall/parachute, weapons, inventory, interactions |
| `src/js/06_viewmodel.js` | first-person arms with IK and procedural animation |
| `src/js/07_ai.js` | NPC perception, routines, investigation, search, combat, cameras |
| `src/js/08_game.js` | game core: combat, alerts, comms, items, takedowns, rendering, loop |
| `src/js/09_vehicles.js` | driving, hotwiring, insertion/extraction cinematics |
| `src/js/10_missions.js`, `11_missions2.js` | the three missions |
| `src/js/12_ui.js` | menus, briefing hologram map, armory, settings, statistics, HUD |
