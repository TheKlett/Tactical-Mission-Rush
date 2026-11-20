# OVERCAST — Part One: The Drop

A first-person story game in a single HTML file, built on the RED LINE engine
(custom WebGL2 renderer, procedural models, synthesized sound).

**Play:** open `overcast/index.html` in a desktop browser (Chrome / Edge / Firefox).

## Controls
| Key | Action |
| --- | --- |
| Mouse | Look |
| W A S D | Move · in conversations W / S (or mouse wheel) choose an answer |
| Shift | Jog |
| E | Interact · confirm an answer |
| F | Stand up (in the aircraft) |
| Esc | Pause |

## Build
`bash overcast/build.sh` concatenates `src/style.css` and `src/js/*.js` into `index.html`.
