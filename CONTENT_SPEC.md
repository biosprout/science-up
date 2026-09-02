# SCIENCE UP! 教材データ仕様（CONTENT_SPEC）

このファイルを読めば、アプリ本体（index.html）を読まなくても固定4択問題を追加できる。
教材データの source of truth は `data/` 配下の JSON だけ。index.html には問題を持たない。

## 1. ファイル一覧

| ファイル | 役割 |
|---|---|
| `data/index.json` | manifest。分野ファイルの一覧と件数 |
| `data/phys.json` | 物理（光・音・力・電気）の4択問題 |
| `data/chem.json` | 化学（物質・化学変化）の4択問題 |
| `data/bio.json` | 生物（植物・動物・遺伝）の4択問題 |
| `data/earth.json` | 地学（大地・天気・天体）の4択問題 |
| `scripts/validate-content.mjs` | データ検証（Node.js、追加パッケージ不要） |
| `scripts/format-content.mjs` | データ整形（同上） |
| `sw.js` | Service Worker。オフライン用にデータをキャッシュする |

「理科の計算」（数値入力）は固定問題ではなく index.html 内の generator がその場で作る。data/ には含めない。

## source of truth

**教材の唯一の source of truth は `data/*.json` である。** 教材を直すときは JSON を直接編集し、`format-content.mjs` → `validate-content.mjs` を通して commit する。過去に JSON を生成するために使った元原稿（引き継ぎ資料の `add_*.js` `fix_*.js` など）は、生成が終わった時点で役目を終えた作業ファイルであり、今後の source of truth ではない。JSON と元原稿を別々に更新する運用はしない。

## 2. manifest（data/index.json）の schema

```json
{
  "version": 1,
  "levels": ["easy","std","hard"],
  "sets": [
    {"id":"phys","name":"物理（光・音・力・電気）","file":"phys.json","kind":"quiz","count":105},
    {"id":"chem","name":"化学（物質・化学変化）","file":"chem.json","kind":"quiz","count":103},
    {"id":"bio","name":"生物（植物・動物・遺伝）","file":"bio.json","kind":"quiz","count":95},
    {"id":"earth","name":"地学（大地・天気・天体）","file":"earth.json","kind":"quiz","count":95}
  ],
  "total": 398
}
```

| property | 必須 | 意味 |
|---|---|---|
| `version` | 必須 | manifest 形式の版。今は `1` 固定 |
| `levels` | 任意 | 難易度 ID の一覧（参考情報。アプリは index.html 内の定義を使う） |
| `sets[].id` | 必須 | 分野 ID。`phys` `chem` `bio` `earth` のいずれか |
| `sets[].name` | 必須 | 表示名（参考情報。アプリは index.html 内の `FIELDS` を表示に使う） |
| `sets[].file` | 必須 | `data/` からの相対ファイル名 |
| `sets[].kind` | 必須 | `quiz` 固定 |
| `sets[].count` | 必須 | そのファイルの items 件数。実件数と一致させる |
| `total` | 必須 | 全 sets の count の合計 |

アプリは起動時に index.json を読み、`sets` の順に各ファイルを取得して連結する。
分野を増やすには index.html 側の `FIELDS` `FICON` `CALC` 等も変更が必要なので、分野追加は今回の範囲外。

## 3. 分野ファイルの schema

```json
{
  "version": 1,
  "items": [
    {"id":"p_e1","f":"phys","lv":"easy","q":"光が鏡ではね返るとき、入射角と反射角の関係はどれか。","ch":["入射角が大きい","反射角が大きい","等しい","光の色による"],"a":2,"ex":"反射の法則。入射角＝反射角がつねに成り立つ。角度は鏡の面ではなく、面に垂直な線（法線）から測る。"}
  ]
}
```

### item の property（すべて必須。これ以外の property は追加しない）

| property | 型 | 意味 |
|---|---|---|
| `id` | string | 問題 ID。全ファイルを通して一意 |
| `f` | string | 分野 ID。ファイルの分野と一致させる（`phys` `chem` `bio` `earth`） |
| `lv` | string | 難易度。`easy`（基礎 中1〜中2）/ `std`（標準 中3）/ `hard`（入試） |
| `q` | string | 問題文 |
| `ch` | string[4] | 選択肢。ちょうど4件。同じ文字列を2つ入れない |
| `a` | integer | 正答の index。**0 始まり**（`ch[0]` が正解なら `0`）。0〜3 |
| `ex` | string | 解説。空にしない |

選択肢はアプリが表示時にシャッフルする。`ch` の並び順は画面には出ないが、`a` は `ch` の並び順に対する index なので、`ch` を並べ替えたら `a` も直す。

## 4. ID の命名規則

`<分野1文字>_<種別1文字><通し番号>`

- 分野: `p`=phys, `c`=chem, `b`=bio, `e`=earth
- 種別: `e`=easy, `s`=std, `h`=hard。後から追加した問題は `t` を使っている（例: `p_t3`）。難易度は `lv` の値が正で、ID の文字は目安にすぎない
- 通し番号は分野・種別ごとに増やす。既存の最大番号の次を使う
- 使える文字は英数字と `_` `-` のみ

### 一度公開した ID を変えてはいけない理由

学習記録は localStorage に `stats[問題ID] = {c: 正解数, w: 誤答数, d: 最終日, ...}` として保存されている。
ID を変えると、その問題の成績・苦手判定・復習間隔がすべて未着手扱いに戻る。
問題文を直すときは ID を保ったまま中身だけ変える。問題を削除する場合も既存 ID を別の問題に再利用しない。

## 5. 文字コードと JSON 形式

- UTF-8（BOM なし）。日本語はそのまま書き、`\uXXXX` に escape しない
- 改行コードは LF
- 問題1件を1行にする（`node scripts/format-content.mjs` が自動で整える）
- 制御文字（タブ等）は入れない

## 6. 新しい問題を追加する手順

1. 追加したい分野のファイル（例 `data/phys.json`）の `items` の末尾に item を足す
2. `data/index.json` の該当 `count` と `total` を増やす
3. `node scripts/format-content.mjs` で整形する
4. `node scripts/validate-content.mjs` を実行し、`✓ OK` になることを確認する
5. ローカルサーバで動作確認する（第8節）
6. index.html の `APP_VER` を上げる（`YYYYMMDD` + 英字。データだけの変更でもユーザーに更新を知らせたい場合）
7. commit する。GitHub への push は田中が行う

manifest の件数は手で直す。validator が実件数との不一致を error にするので、直し忘れは実行時に分かる。

## 7. validator と formatter

```
node scripts/validate-content.mjs      # 問題があれば exit 1 と一覧
node scripts/format-content.mjs        # 整形して書き戻す
node scripts/format-content.mjs --check  # 書き換えずに整形済みか確認
```

Node.js 18 以上。npm install は不要。

validator が見るもの: JSON として読めるか、UTF-8 か、manifest の参照先が存在するか、count / total が実件数と一致するか、必須 property と型、ID の空・重複・接頭辞、分野と難易度が定義内か、空文字と制御文字、選択肢が4件で重複なし、正答 index が 0〜3、manifest から参照されない JSON や `.DS_Store` の混入。

## 8. ローカルで動かす

fetch でデータを読むため、index.html をダブルクリック（file://）では動かない。

```
cd science-up
python3 -m http.server 8000
# ブラウザで http://localhost:8000/
```

## 9. Service Worker と教材更新の関係

- `sw.js` は index.html と `data/*.json` を network-first で取得する。オンラインなら常に最新の JSON が届き、取得できたものをキャッシュに保存する。オフラインのときだけキャッシュを返す
- そのため、JSON を更新するたびに `sw.js` の `CACHE` 名を変える必要はない
- `data/` に新しいファイルを増やしたときは、`sw.js` の `ASSETS` に追加し、`CACHE` 名の版数を上げる（初回オフライン用の precache に入れるため）（precache に失敗すると新しい Service Worker は install されず、旧版が使われ続ける。ASSETS の path 間違いに注意）
- cache 名は `scienceup-` で始まり（`CACHE_PREFIX`）、古い cache の掃除はこの prefix を持つものだけを対象にする。同じ origin にある他の BioSprout アプリの cache には触れない
- 404 や 500 などの error response は cache に保存しない。network が error を返したときは、正常な cache があればそちらを返す
- アイコン等の固定 asset は cache-first

## 10. してはいけない変更

- 公開済みの `id` の変更・再利用
- `a` を 1 始まりにする
- item への property 追加、property 名の変更（アプリと validator が前提にしている）
- `ch` を4件以外にする
- index.html に問題の fallback copy を戻す（source of truth が2つになる）
- 分野ファイルの中に他分野の問題を入れる
- 日本語を Unicode escape にする、ファイル全体を1行に戻す
