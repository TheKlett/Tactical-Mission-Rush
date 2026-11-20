# OVERCAST — Part One: The Drop · Part Two: The Green

A first-person story game in a single HTML file, built on the RED LINE engine
(custom WebGL2 renderer, procedural models, synthesized sound).

**Play:** open `overcast/index.html` in a desktop browser (Chrome / Edge / Firefox).

## Controls
| Key | Action |
| --- | --- |
| Mouse | Look |
| W A S D | Move · in conversations W / S (or mouse wheel) choose an answer |
| Shift | Jog |
| Right mouse | Zoom 3× (mouse wheel up to 10×) · in combat: aim |
| E | Interact · confirm an answer · wake / sit up / stand up |
| Ctrl / C | Crouch (Part 2) |
| Q | Draw / holster sidearm (Part 2) |
| Left mouse | Fire (Part 2) |
| R | Reload (Part 2) |
| F | Silent takedown from behind (Part 2) |
| Esc | Pause |

## Build
`bash overcast/build.sh` concatenates `src/style.css` and `src/js/*.js` into `index.html`.
