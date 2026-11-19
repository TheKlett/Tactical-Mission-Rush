#!/usr/bin/env bash
# Assembles the single-file game: index.html (HTML + CSS + JS inlined).
set -euo pipefail
cd "$(dirname "$0")"
node -e '
const fs=require("fs");
const tpl=fs.readFileSync("src/index.template.html","utf8");
const css=fs.readFileSync("src/style.css","utf8");
const js=fs.readdirSync("src/js").filter(f=>f.endsWith(".js")).sort().map(f=>"/* ---- "+f+" ---- */\n"+fs.readFileSync("src/js/"+f,"utf8")).join("\n");
const out=tpl.replace("/*__CSS__*/",()=>css).replace("/*__JS__*/",()=>js);
fs.writeFileSync("index.html",out);
console.log("index.html",(out.length/1024).toFixed(1)+" KB");
'
