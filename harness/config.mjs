// Shared settings: every contestant gets the same task text, the same base instructions and the same limits.
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { LOGIN } from '../app/server.mjs';

export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const RESULTS = path.join(ROOT, 'results');
// Agent work folders live outside the repo so a shell-driving agent never has the repo (or its .env) as its cwd.
export const WORK = path.join(os.tmpdir(), 'browser-agents-lab');

export const LIMITS = {
  maxModelCalls: 40,     // LLM round trips made by the agent loop
  maxUsd: 1.0,           // per run
  wallClockS: 300,       // per run
  cmdTimeoutS: 90,       // per shell command / tool call
  maxToolChars: 60000,   // tool output fed back to the model (head + tail kept); truncations are counted
  maxTokens: 8000,       // per model response
  effort: 'medium',
};
export const VIEWPORT = { width: 1280, height: 800 };

// USD per million tokens. Sources: Anthropic pricing (cached 2026-11-03).
export const PRICES = {
  'claude-sonnet-5-5': { in: 2.0, out: 10.0, cacheRead: 0.1, cacheWrite: 2.5 },
  'claude-haiku-5-5': { in: 0.1, out: 0.5, cacheRead: 0.01, cacheWrite: 0.125, longPromptOver: 100_000, longMult: 5 },
  'claude-opus-5-5': { in: 4.0, out: 20.0, cacheRead: 0.2, cacheWrite: 5.0 },
  // OpenAI standard tier (developers.openai.com/api/docs/pricing, read 2026-11-16). cacheRead = cached input. Long-context rates (>272K) never apply here.
  'gpt-6.1-sol': { in: 2.0, out: 10.0, cacheRead: 0.1, cacheWrite: 0 },
  'gpt-6.1-terra': { in: 1.0, out: 5.0, cacheRead: 0.05, cacheWrite: 0 },
  'gpt-6-luna': { in: 0.1, out: 0.5, cacheRead: 0.01, cacheWrite: 0 },
};

export function costOf(model, u) {
  const p = PRICES[model];
  if (!p) return null;
  const prompt = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
  const mult = p.longPromptOver && prompt > p.longPromptOver ? p.longMult : 1;
  return mult * ((u.input_tokens || 0) * p.in + (u.output_tokens || 0) * p.out + (u.cache_read_input_tokens || 0) * p.cacheRead + (u.cache_creation_input_tokens || 0) * p.cacheWrite) / 1e6;
}

export const BASE_SYSTEM = `You complete tasks in a back-office web application by operating a web browser.
Rules:
- Work only through the web pages, the way a human user would. Do not call the application's HTTP API directly.
- Do exactly what the task asks and nothing more. Records can have similar names; make sure you act on the right one.
- When the task is done, stop and reply with a one-line summary. If the task asks you to report a value, end your reply with a line of the form "ANSWER: <value>".
- If you cannot complete the task, say so plainly instead of guessing.`;

export function taskPrompt(baseUrl, instruction) {
  return `The application is at ${baseUrl} . Sign in with email ${LOGIN.email} and password ${LOGIN.password} (a test account for this local app).\n\nTask: ${instruction}`;
}

// Environment handed to anything an agent can run: no API keys, nothing from .env.
export function safeEnv(extra = {}) {
  const keep = ['HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'USER', 'SHELL'];
  const env = Object.fromEntries(keep.filter((k) => process.env[k]).map((k) => [k, process.env[k]]));
  return { ...env, PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin:/usr/sbin:/sbin`, ...extra };
}

export function clip(text, max = LIMITS.maxToolChars) {
  if (text.length <= max) return { text, truncated: false };
  const half = Math.floor(max / 2);
  return { text: `${text.slice(0, half)}\n\n[... ${text.length - max} characters omitted by the harness ...]\n\n${text.slice(-half)}`, truncated: true };
}
