// Aggregate results/runs.jsonl.   node harness/report.mjs [--tag pilot]
import fs from 'node:fs';
import path from 'node:path';
import { RESULTS } from './config.mjs';

const tag = process.argv.includes('--tag') ? process.argv[process.argv.indexOf('--tag') + 1] : null;
let rows = fs.readFileSync(path.join(RESULTS, 'runs.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => !tag || r.tag === tag);
const errored = rows.filter((r) => r.stopped_by === 'error');
if (errored.length) console.log(`(excluded ${errored.length} runs that ended in a harness/provider error)\n`);
rows = rows.filter((r) => r.stopped_by !== 'error');
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2 : 0; };
const group = (key) => { const m = new Map(); for (const r of rows) { const k = key(r); m.set(k, [...(m.get(k) || []), r]); } return m; };

console.log(`## By approach and model (${rows.length} runs)\n`);
console.log('| Approach | Model | n | Success | Cost/run | Cost per success | Median calls | Median input tok | Median output tok | Median time | Stops other than done |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|');
for (const [k, rs] of [...group((r) => `${r.contestant}|${r.model}`)].sort()) {
  const [c, m] = k.split('|'); const ok = rs.filter((r) => r.success).length; const spend = rs.reduce((s, r) => s + r.cost_usd, 0);
  const stops = Object.entries(rs.reduce((o, r) => (r.stopped_by !== 'done' ? { ...o, [r.stopped_by]: (o[r.stopped_by] || 0) + 1 } : o), {})).map(([a, b]) => `${a} x${b}`).join(', ') || '–';
  console.log(`| ${c} | ${m} | ${rs.length} | ${ok}/${rs.length} | $${(spend / rs.length).toFixed(4)} | ${ok ? '$' + (spend / ok).toFixed(4) : 'n/a'} | ${median(rs.map((r) => r.model_calls))} | ${Math.round(median(rs.map((r) => r.tokens.total_in)))} | ${Math.round(median(rs.map((r) => r.tokens.output)))} | ${median(rs.map((r) => r.elapsed_s)).toFixed(0)}s | ${stops} |`);
}

const cs = [...new Set(rows.map((r) => `${r.contestant}|${r.model}`))].sort();
console.log(`\n## Per task (passes/n · median cost)\n\n| Task | ${cs.map((c) => c.replace('|', ' · ')).join(' | ')} |\n|---|${cs.map(() => '---|').join('')}`);
for (const t of [...new Set(rows.map((r) => r.task))].sort()) {
  console.log(`| ${t} | ${cs.map((c) => { const rs = rows.filter((r) => r.task === t && `${r.contestant}|${r.model}` === c); return rs.length ? `${rs.filter((r) => r.success).length}/${rs.length} · $${median(rs.map((r) => r.cost_usd)).toFixed(4)}` : '–'; }).join(' | ')} |`);
}

console.log('\n## Failures\n');
for (const r of rows.filter((x) => !x.success)) console.log(`- ${r.run_id} ${r.task} ${r.contestant} ${r.model}: ${r.stopped_by}; ${r.why}`);
for (const r of errored) console.log(`- ERROR ${r.run_id} ${r.task} ${r.contestant}: ${r.error}`);
