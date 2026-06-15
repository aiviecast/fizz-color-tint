import { readFileSync } from "node:fs";
const mod = await WebAssembly.compile(readFileSync(new URL("../build/ct.wasm", import.meta.url)));
const imports = {}; for (const i of WebAssembly.Module.imports(mod)) (imports[i.module] ??= {})[i.name] = () => 0;
const { exports: ex } = await WebAssembly.instantiate(mod, imports); try { ex._start(); } catch {}
const enc = new TextEncoder();
const unpack = (p) => [(p >> 16) & 255, (p >> 8) & 255, p & 255];
const tint = (sr, sg, sb, tr, tg, tb) => unpack(ex.tint(sr, sg, sb, tr, tg, tb));
const matches = (name) => { const b = enc.encode(name); const p = ex.in_alloc(b.length); new Uint8Array(ex.memory.buffer, Number(p), b.length).set(b); return ex.iris_matches() === 1; };
let ok = true; const ck = (c, m) => { if (!c) { console.error("FAIL " + m); ok = false; } };

// 色再着色: native と同じ (18,36,120)。
{ const [r, g, b] = tint(120, 110, 100, 30, 60, 200); ck(r === 18 && g === 36 && b === 120, `tint=${r},${g},${b}`); }
// 純色: 白を赤へ → (255,0,0)。
{ const [r, g, b] = tint(255, 255, 255, 200, 0, 0); ck(r === 255 && g === 0 && b === 0, `pure=${r},${g},${b}`); }
ck(Math.round(ex.rgb_hue(0, 0, 255)) === 240, "hue blue");
ck(Math.round(ex.rgb_sat(255, 0, 0) * 100) === 100, "sat red");
ck(Math.round(ex.rgb_val(255, 0, 0) * 100) === 100, "val red");
ck(ex.is_iris_by_saturation(200, 30, 40) === 1, "iris sat yes");
ck(ex.is_iris_by_saturation(128, 128, 128) === 0, "iris sat no");
ck(ex.side_is_left(10, 100) === 1, "left");
ck(ex.side_is_left(50, 100) === 0, "not left");
ck(matches(" Eye ") === true, "iris name Eye");
ck(matches("Skin") === false, "non-iris name");
// 多重読み: 同じ入力で iris_matches を複数回 + 色計算を挟んでも g_in 健在 (almide#690 回避)。
{ const b = enc.encode("HITOMI"); const p = ex.in_alloc(b.length); new Uint8Array(ex.memory.buffer, Number(p), b.length).set(b);
  ck(ex.iris_matches() === 1 && ex.iris_matches() === 1, "multi-read matches");
  ex.tint(10, 20, 30, 40, 50, 60);
  ck(ex.iris_matches() === 1, "matches after tint (g_in intact)"); }
console.log(ok ? "wasm OK — color math + iris match (incl. multi-read) match native" : "FAIL"); if (!ok) process.exit(1);
