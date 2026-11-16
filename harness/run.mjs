// Run the lab.
//   node harness/run.mjs --tasks 01,07 --contestants mcp,pw-cli,pw-script,cua,stagehand --model claude-haiku-5-5 --repeat 1 --tag pilot --budget 2
// Concurrency is 1 by design. Every (task, trial) uses the same seed for all contestants, so cells are paired.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import dotenv from 'dotenv';
import { ROOT, RESULTS, WORK, LIMITS } from './config.mjs';
import { Meter } from './loop.mjs';
import { startApp } from '../app/server.mjs';
import { TASKS, prepare, extractAnswer } from '../tasks/tasks.mjs';

dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });
const require = createRequire(import.meta.url);

const registry = {
  mcp: async () => await import('./contestants/mcp.mjs'),
  'pw-cli': async () => (await import('./contestants/shell.mjs')).cli,
  'pw-script': async () => (await import('./contestants/shell.mjs')).script,
  cua: async () => await import('./contestants/cua.mjs'),
  stagehand: async () => await import('./contestants/stagehand.mjs'),
};

function args() {
  const a = { tasks: '', contestants: 'mcp', model: 'claude-haiku-5-5', repeat: 1, tag: 'pilot', seed: 100, budget: 2, resume: false };
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) { const k = v[i].replace(/^--/, ''); if (k === 'resume') a.resume = true; else a[k] = v[++i]; }
  a.repeat = +a.repeat; a.seed = +a.seed; a.budget = +a.budget;
  return a;
}
const pkgVersion = (name) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules', name, 'package.json'), 'utf8')).version; } catch { return null; } };

async function oneRun(app, task, name, model, seed, tag) {
  const runId = `${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}-${task.id.slice(0, 2)}-${name}-${crypto.randomBytes(2).toString('hex')}`;
  const rawDir = path.join(RESULTS, 'raw', runId); fs.mkdirSync(rawDir, { recursive: true });
  const workdir = path.join(WORK, runId); fs.mkdirSync(workdir, { recursive: true });
  const { state, params, instruction } = prepare(task, app, seed, { workdir });
  const transcript = fs.createWriteStream(path.join(rawDir, 'transcript.jsonl'));
  const meter = new Meter(model);
  const t0 = Date.now();
  const ctx = { runId, model, workdir, baseUrl: app.url, instruction, meter, limits: LIMITS, deadline: t0 + LIMITS.wallClockS * 1000, cleanup: [], log: (e) => transcript.write(JSON.stringify({ ms: Date.now() - t0, ...e }) + '\n') };
  process.stdout.write(`${runId}  ${task.id} | ${name} | ${model} | seed ${seed} ... `);

  let result;
  const contestant = await registry[name]();
  let timer;
  try {
    result = await Promise.race([
      contestant.run(ctx),
      new Promise((res) => { timer = setTimeout(() => res({ stopped_by: 'wall_clock', final_text: '' }), LIMITS.wallClockS * 1000 + 20000); }),
    ]);
  } catch (e) {
    result = { stopped_by: 'error', final_text: '', error: `${e.constructor?.name}: ${String(e.message || e).slice(0, 600)}` };
  }
  clearTimeout(timer);
  const elapsed = +((Date.now() - t0) / 1000).toFixed(1);
  for (const c of ctx.cleanup) { try { await Promise.race([c(), new Promise((r) => setTimeout(r, 15000))]); } catch {} }

  const answer = extractAnswer(result.final_text);
  const verdict = task.check(state, params, answer);
  const record = {
    run_id: runId, ts: new Date().toISOString(), tag, task: task.id, level: task.level, contestant: name, model, seed, variant: state.variant,
    package: contestant.pkg, package_version: pkgVersion(contestant.pkg),
    success: verdict.ok, why: verdict.why, stopped_by: result.stopped_by, error: result.error || null, elapsed_s: elapsed,
    ...meter.summary(), app: { ...state.log }, answer,
  };
  transcript.end();
  fs.writeFileSync(path.join(rawDir, 'final_text.md'), result.final_text || '');
  fs.writeFileSync(path.join(rawDir, 'record.json'), JSON.stringify({ ...record, instruction }, null, 2));
  fs.appendFileSync(path.join(RESULTS, 'runs.jsonl'), JSON.stringify(record) + '\n');
  fs.rmSync(workdir, { recursive: true, force: true });
  console.log(`${verdict.ok ? 'PASS' : 'FAIL'} (${result.stopped_by}; ${verdict.why}) calls=${record.model_calls} in=${record.tokens.total_in} out=${record.tokens.output} $${record.cost_usd.toFixed(4)} ${elapsed}s${result.error ? ' ERR ' + result.error : ''}`);
  return record;
}

const a = args();
fs.mkdirSync(RESULTS, { recursive: true });
const tasks = TASKS.filter((t) => !a.tasks || a.tasks.split(',').some((p) => t.id.startsWith(p)));
const names = a.contestants.split(',');
for (const n of names) if (!registry[n]) throw new Error(`unknown contestant ${n}`);
const done = new Map();
const runsFile = path.join(RESULTS, 'runs.jsonl');
if (a.resume && fs.existsSync(runsFile)) for (const l of fs.readFileSync(runsFile, 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); if (r.tag === a.tag && r.stopped_by !== 'error') done.set(`${r.task}|${r.contestant}|${r.model}|${r.seed}`, true); }

const app = await startApp();
let spent = 0, n = 0;
console.log(`app ${app.url} | tag ${a.tag} | ${tasks.length} tasks x ${names.length} contestants x ${a.repeat} trials on ${a.model} | batch budget $${a.budget}`);
try {
  outer: for (let trial = 0; trial < a.repeat; trial++) for (const task of tasks) for (const name of names) {
    const seed = a.seed + trial;
    if (done.has(`${task.id}|${name}|${a.model}|${seed}`)) continue;
    if (spent >= a.budget) { console.log(`batch budget $${a.budget} reached after ${n} runs; stopping`); break outer; }
    const r = await oneRun(app, task, name, a.model, seed, a.tag);
    spent += r.cost_usd; n++;
  }
} finally { await app.close(); }
console.log(`\n${n} runs, $${spent.toFixed(4)} spent`);
process.exit(0);
