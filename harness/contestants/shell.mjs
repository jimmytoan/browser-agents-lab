// (b) Two shell-driven contestants that share one bash tool:
//   pw-cli    : Microsoft's playwright-cli (@playwright/cli) with its bundled skill, as its README intends
//   pw-script : the agent writes Playwright scripts (Node) and runs them
// The shell has no API keys in its environment, runs in a work folder outside the repo, and refuses a short
// list of commands that have no business in this lab (secrets, docker, sudo, other repos).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ROOT, BASE_SYSTEM, safeEnv, clip, taskPrompt } from '../config.mjs';
import { agentLoop } from '../loop.mjs';
import { profile, available, BROWSERS } from '../sandbox.mjs';

const BLOCK = /\.env\b|\.ssh\b|\bsudo\b|\bdocker\b|\bgit\s+push\b|\/git\/me\/|\bkillall\b|\bpkill\b|\bosascript\b|\brm\s+-[a-z]*r[a-z]*\s+[\/~]/i;

let sandboxFile = null;
function prepareSandbox(ctx, env) {
  if (!available()) throw new Error('sandbox-exec not available: refusing to give an agent an unsandboxed shell');
  sandboxFile = path.join(path.dirname(ctx.workdir), 'shell.sb');
  fs.writeFileSync(sandboxFile, profile());
  const home = path.join(ctx.workdir, '.home'); fs.mkdirSync(home, { recursive: true });
  Object.assign(env, { HOME: home, PLAYWRIGHT_BROWSERS_PATH: BROWSERS });
  ctx.meter.extra.sandbox = 'seatbelt';
}
const SHELL_NOTE = 'Every command runs in a fresh, sandboxed shell that starts in the task work folder (the current directory); files written elsewhere are refused, so stay in it, and there is no internet access beyond the application.';

function sh(cmd, { cwd, env, timeoutS }) {
  return new Promise((resolve) => {
    const child = sandboxFile ? spawn('/usr/bin/sandbox-exec', ['-f', sandboxFile, '/bin/bash', '-c', cmd], { cwd, env, detached: true }) : spawn('/bin/bash', ['-c', cmd], { cwd, env, detached: true });
    let out = '';
    const on = (d) => { if (out.length < 2_000_000) out += d; };
    child.stdout.on('data', on); child.stderr.on('data', on);
    const timer = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch {} out += `\n[timed out after ${timeoutS}s]`; }, timeoutS * 1000);
    child.on('close', (code) => { clearTimeout(timer); resolve({ out, code }); });
    child.on('error', (e) => { clearTimeout(timer); resolve({ out: String(e), code: 127 }); });
  });
}

async function runShell(ctx, { system, env }) {
  prepareSandbox(ctx, env);
  system += '\n\n' + SHELL_NOTE;
  const commands = [];
  ctx.meter.extra.blocked = 0;
  const exec = async (b) => {
    if (b.input.restart) return { content: 'Shell restarted.' };
    const cmd = String(b.input.command || '');
    commands.push(cmd);
    if (BLOCK.test(cmd)) { ctx.meter.extra.blocked++; return { content: 'Blocked by lab policy: this command is outside what the task needs.', is_error: true }; }
    const { out, code } = await sh(cmd, { cwd: ctx.workdir, env, timeoutS: ctx.limits.cmdTimeoutS });
    const k = clip(out || '(no output)', ctx.limits.maxToolChars); if (k.truncated) ctx.meter.truncations++;
    return { content: `${k.text}\n[exit code ${code}]`, is_error: false };
  };
  const result = await agentLoop({ model: ctx.model, tools: [{ type: 'bash_20250124', name: 'bash' }], exec, meter: ctx.meter, deadline: ctx.deadline, log: ctx.log, limits: ctx.limits, system, prompt: taskPrompt(ctx.baseUrl, ctx.instruction) });
  ctx.meter.extra.commands = commands.length;
  ctx.meter.extra.curl_like = commands.filter((c) => /\bcurl\b|\bwget\b|fetch\(/.test(c)).length;
  return result;
}

export const cli = {
  pkg: '@playwright/cli',
  async run(ctx) {
    const session = `lab-${ctx.runId.slice(-10)}`;
    // Lab-owned bundled Chromium (not the system Chrome); Chrome's inner sandbox cannot start inside the outer seatbelt sandbox.
    const env = safeEnv({ PLAYWRIGHT_CLI_SESSION: session, PLAYWRIGHT_MCP_BROWSER: 'chromium', PLAYWRIGHT_MCP_SANDBOX: 'false' });
    env.PATH = `${path.join(ROOT, 'node_modules/.bin')}:${env.PATH}`;
    ctx.cleanup.push(() => sh('playwright-cli close', { cwd: ctx.workdir, env, timeoutS: 20 }));
    const skillDir = path.join(ROOT, 'node_modules/@playwright/cli/skills/playwright-cli');
    const skill = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
    return runShell(ctx, {
      env,
      system: `${BASE_SYSTEM}\n\nYou have a bash tool. Drive the browser with the \`playwright-cli\` command, which is installed and on PATH. It runs a headless browser that stays open between commands. Its skill file follows; the reference files it mentions are in ${skillDir}/references/ .\n\n<skill name="playwright-cli">\n${skill}\n</skill>`,
    });
  },
};

export const script = {
  pkg: 'playwright',
  async run(ctx) {
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(ctx.workdir, 'node_modules'));
    fs.writeFileSync(path.join(ctx.workdir, 'package.json'), '{"type":"module","private":true}\n');
    return runShell(ctx, {
      env: safeEnv(),
      system: `${BASE_SYSTEM}\n\nYou have a bash tool. Drive the browser by writing Playwright scripts and running them with Node: the \`playwright\` package (JavaScript, ESM) is installed in the current directory, for example \`import { chromium } from 'playwright'\` in a .mjs file, then \`node file.mjs\`. Launch Chromium headless. Each script run starts a fresh browser, so a script must sign in again; data you changed in the application persists between runs. Print whatever you need to see (page text, element lists) to stdout. Do not use any other browser tool.`,
    });
  },
};
