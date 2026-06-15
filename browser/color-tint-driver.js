// color-tint-driver.js — psd-eye-tinter のグルー例。
// 色計算 = Almide(wasm)、PSD decode / canvas 合成 / マスク = Node(ag-psd)/ブラウザ。
export async function loadColorTint(wasmUrl) {
  const bytes = await (await fetch(wasmUrl)).arrayBuffer();
  const mod = await WebAssembly.compile(bytes);
  const imports = {}; for (const i of WebAssembly.Module.imports(mod)) (imports[i.module] ??= {})[i.name] = () => 0;
  const { exports: ex } = await WebAssembly.instantiate(mod, imports); try { ex._start(); } catch {}
  const enc = new TextEncoder();
  const unpack = (p) => [(p >> 16) & 255, (p >> 8) & 255, p & 255];
  return {
    // 元ピクセル(sr,sg,sb)を目標色(tr,tg,tb)の色相+彩度で再着色 → [r,g,b]。
    tint(sr, sg, sb, tr, tg, tb) { return unpack(ex.tint(sr, sg, sb, tr, tg, tb)); },
    rgbHue(r, g, b) { return ex.rgb_hue(r, g, b); },
    rgbSat(r, g, b) { return ex.rgb_sat(r, g, b); },
    rgbVal(r, g, b) { return ex.rgb_val(r, g, b); },
    // 虹彩レイヤが無い PSD 向け: 彩度しきい値マスク。
    isIrisBySaturation(r, g, b) { return ex.is_iris_by_saturation(r, g, b) === 1; },
    // ヘテロクロミア(左右別色)用の左右判定。
    sideIsLeft(x, width) { return ex.side_is_left(x, width) === 1; },
    // PSD レイヤ名が虹彩レイヤ(eye/iris/hitomi/瞳/目)か。
    irisLayerMatches(name) {
      const b = enc.encode(name); const p = ex.in_alloc(b.length);
      new Uint8Array(ex.memory.buffer, Number(p), b.length).set(b);
      return ex.iris_matches() === 1;
    },
  };
}

// ImageData 全体の虹彩ピクセルを再着色する典型ループ(マスク or 彩度フォールバック)。
//   data: Uint8ClampedArray (RGBA), maskAlpha(x,y): 虹彩マスクの α(無ければ null)
export function retintImageData(ct, data, width, leftRgb, rightRgb, maskAlpha = null) {
  for (let i = 0; i < data.length; i += 4) {
    const px = i >> 2, x = px % width;
    if (maskAlpha) { if (maskAlpha(x, Math.floor(px / width)) < 16) continue; }
    else if (!ct.isIrisBySaturation(data[i], data[i + 1], data[i + 2])) continue;
    const [tr, tg, tb] = ct.sideIsLeft(x, width) ? leftRgb : rightRgb;
    const [nr, ng, nb] = ct.tint(data[i], data[i + 1], data[i + 2], tr, tg, tb);
    data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;
  }
  for (let i = 3; i < data.length; i += 4) data[i] = 255; // 不透明化
  return data;
}
