// Model-free self-test: for every task and several seeds, the scripted correct solution must pass the check,
// a scripted plausible mistake must fail it, and doing nothing must fail it.   node harness/selftest.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { startApp } from '../app/server.mjs';
import { TASKS, prepare, login, extractAnswer } from '../tasks/tasks.mjs';

const seeds = [1, 2, 3, 4, 5, 6];
const app = await startApp();
const browser = await chromium.launch();
const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'bal-selftest-'));
let failures = 0;

for (const task of TASKS) {
  const marks = [];
  for (const seed of seeds) {
    for (const mode of ['solve', 'wrong', 'noop']) {
      const { state, params } = prepare(task, app, seed, { workdir });
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage(); page.base = app.url; page.setDefaultTimeout(10000);
      let answer = '', err = '';
      try { await login(page, app.url); if (mode !== 'noop') answer = await task[mode](page, params, state); } catch (e) { err = e.message.split('\n')[0]; }
      await ctx.close();
      const verdict = task.check(state, params, extractAnswer(answer));
      const expected = mode === 'solve';
      const good = verdict.ok === expected && !(mode !== 'noop' && err);
      if (!good) { failures++; console.log(`  FAIL ${task.id} seed=${seed} ${mode}: ok=${verdict.ok} (${verdict.why}) ${err}`); }
      marks.push(good ? '.' : 'X');
    }
  }
  console.log(`${task.id.padEnd(24)} ${marks.join('')}`);
}
await browser.close(); await app.close();
fs.rmSync(workdir, { recursive: true, force: true });
console.log(failures ? `\n${failures} FAILURES` : `\nself-test passed: ${TASKS.length} tasks x ${seeds.length} seeds x (solve passes, wrong fails, no-op fails)`);
process.exit(failures ? 1 : 0);
