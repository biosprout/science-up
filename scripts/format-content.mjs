#!/usr/bin/env node
/* SCIENCE UP! 教材データ整形。実行: node scripts/format-content.mjs（Node.js 18 以上、追加パッケージ不要）
   --check を付けると書き換えずに、整形が必要なファイルがあれば exit 1 で終わる。

   方針：
   - 何度実行しても同じ結果になる（決定的）
   - property の順序、item の並び順、値はいっさい変えない（書き込み前に deep equality を確認する）
   - 日本語は Unicode escape にしない
   - 「論理的な1 item を1行」にして、git diff で追加した item だけが見えるようにする
   - app code や HTML には触らない */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const CHECK = process.argv.includes('--check');

/* ファイルごとに「どの深さまで改行で展開するか」を決める。
   index.json / 分野ファイル: 2（items 配列を展開し、問題1件を1行にする） */
function depthFor(){ return 2; }

function fmt(v, depth, ed){
  const pad = '  '.repeat(depth), pad1 = '  '.repeat(depth + 1);
  if(Array.isArray(v)){
    if(!v.length) return '[]';
    if(depth < ed && v.some(x => x && typeof x === 'object')) return '[\n' + v.map(x => pad1 + fmt(x, depth + 1, ed)).join(',\n') + '\n' + pad + ']';
    return JSON.stringify(v);
  }
  if(v && typeof v === 'object'){
    const keys = Object.keys(v);
    if(!keys.length) return '{}';
    if(depth < ed) return '{\n' + keys.map(k => pad1 + JSON.stringify(k) + ': ' + fmt(v[k], depth + 1, ed)).join(',\n') + '\n' + pad + '}';
    return JSON.stringify(v);
  }
  return JSON.stringify(v);
}
function formatJson(value, ed){ return fmt(value, 0, ed) + '\n'; }

let changed = 0, failed = 0;
for(const f of fs.readdirSync(DATA).filter(x => x.endsWith('.json')).sort()){
  const full = path.join(DATA, f);
  const before = fs.readFileSync(full, 'utf8');
  let value;
  try{ value = JSON.parse(before); }catch(e){ console.error(`✗ ${f}: JSON として parse できません（${e.message}）`); failed++; continue; }
  const after = formatJson(value, depthFor(f));
  if(JSON.stringify(JSON.parse(after)) !== JSON.stringify(value)){ console.error(`✗ ${f}: 整形後の内容が元と一致しません（書き込みを中止）`); failed++; continue; }
  if(after === before){ console.log(`  ${f}: 整形済み`); continue; }
  changed++;
  if(CHECK){ console.log(`  ${f}: 整形が必要です`); continue; }
  fs.writeFileSync(full, after);
  console.log(`  ${f}: 整形しました`);
}
if(failed){ process.exit(1); }
if(CHECK && changed){ console.error(`\n✗ ${changed} ファイルが未整形です。node scripts/format-content.mjs を実行してください`); process.exit(1); }
console.log(changed ? `\n✓ ${changed} ファイルを整形しました` : '\n✓ すべて整形済みです');
