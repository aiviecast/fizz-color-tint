# fizz-color-tint

虹彩(目)再着色のための**純粋な色変換コア**。Almide 1 コアを native + wasm の両方へ。
openaituber `src/converter/psdEyeColor.ts`(VRoid PSD の目テクスチャ再着色)から、
ピクセル単位の色計算だけを切り出した単一責任部品(§11 アセット変換ツール)。

PSD の decode / canvas 合成 / マスク描画 は host(ag-psd / ブラウザ Canvas)の責務。
**色をどう塗り替えるか**だけが純粋なのでここに集約する=単一の正本。

## API(コア)

| 関数 | 説明 |
|---|---|
| `tint(sr,sg,sb, tr,tg,tb) -> Int` | 元ピクセルを目標色の**色相+彩度**で再着色(明度は元のまま保持)。返り値は packed RGB `(r<<16)\|(g<<8)\|b` |
| `rgb_to_hue / rgb_to_sat / rgb_to_val` | RGB(0..255)→ HSV 各成分 |
| `pack_rgb(r,g,b) -> Int` | 3 チャンネルを 1 Int に |
| `is_iris_by_saturation(r,g,b) -> Bool` | 虹彩レイヤが無い PSD 用の彩度マスク(HSL 彩度 ≥ 0.25) |
| `side_is_left(x, width) -> Bool` | ヘテロクロミア用の左右分割(`x < 幅/2`) |
| `iris_layer_matches(name) -> Bool` | PSD レイヤ名が虹彩(eye/iris/hitomi/瞳/目)か |

明度(V)を保ったまま色相+彩度だけ移すので、瞳の陰影・ハイライトを壊さずに色だけ変わる。

## wasm 境界

色計算は **string を跨がせず Int/Float のみ**受け渡す(packed RGB は Int)。
`iris_matches` だけ文字列入力なので `in_alloc` バッファ経由で渡し、内部では
`from_list(to_list(g_in))` でコピーしてから文字列化する(almide#690 の
`to_string_lossy` エイリアス対策。多重読みも安全)。

ブラウザ例: [`browser/color-tint-driver.js`](browser/color-tint-driver.js)
(`retintImageData` に ImageData 全体の再着色ループも同梱)。

## ビルド / テスト

```sh
almide test spec/color_tint_test.almd
almide build src/main.almd -o build/fizz-color-tint     # native CLI
almide build src/bridge.almd --target wasm -o build/ct.wasm
node test/wasm-smoke.mjs                                 # wasm == native を検証
```

Almide v0.27.7 で native / wasm とも green。
