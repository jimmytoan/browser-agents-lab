// (d) Stagehand v4. The current release has no built-in agent(); its primitives are act / observe / extract.
// Its authors expose exactly these (plus navigate) to agents through their MCP server, so the contestant is
// the same outer model loop with those four tools, backed by a local headless Chromium.
// Stagehand makes its own LLM calls inside act/observe/extract (same model); their tokens are added to the bill.
import { chromium } from 'playwright';
import { localBrowser, Stagehand } from '@browserbasehq/stagehand';
import { BASE_SYSTEM, VIEWPORT, PRICES, clip, taskPrompt } from '../config.mjs';
import { agentLoop } from '../loop.mjs';

export const pkg = '@browserbasehq/stagehand';

const tools = [
  { name: 'navigate', description: 'Navigate the browser to a URL.', input_schema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
  { name: 'act', description: 'Perform one action on the current page, described in natural language, for example "click the Sign in button" or "type 42 into the Quantity field". One atomic action per call.', input_schema: { type: 'object', properties: { action: { type: 'string' } }, required: ['action'] } },
  { name: 'observe', description: 'List elements on the current page that match a natural-language description, for example "the buttons in the row for order SO-1234". Returns candidate actions with selectors.', input_schema: { type: 'object', properties: { instruction: { type: 'string' } }, required: ['instruction'] } },
  { name: 'extract', description: 'Extract information from the current page, described in natural language, for example "the total shown in the summary card".', input_schema: { type: 'object', properties: { instruction: { type: 'string' } }, required: ['instruction'] } },
];

export async function run(ctx) {
  const browser = await localBrowser.launch({ headless: true, viewport: VIEWPORT, executablePath: chromium.executablePath() });
  ctx.cleanup.push(() => browser.close().catch(() => {}));
  const stagehand = await Stagehand.create({ browser, model: { modelName: `anthropic/${ctx.model}`, apiKey: process.env.ANTHROPIC_API_KEY } });
  ctx.cleanup.unshift(() => stagehand.close().catch(() => {}));
  const page = () => browser.context.pages().then((p) => p[p.length - 1]);

  const out = (v) => { const k = clip(typeof v === 'string' ? v : JSON.stringify(v), ctx.limits.maxToolChars); if (k.truncated) ctx.meter.truncations++; return k.text; };
  const exec = async (b) => {
    if (b.name === 'navigate') { const p = await page(); await p.goto(b.input.url); return { content: `Navigated. Current URL: ${p.url()}` }; }
    if (b.name === 'act') { const r = await stagehand.act(b.input.action); const p = await page(); return { content: out({ ...(r.data ?? r), url: p.url() }), is_error: (r.data ?? r).success === false }; }
    if (b.name === 'observe') { const r = await stagehand.observe(b.input.instruction); return { content: out(r.data ?? r) }; }
    if (b.name === 'extract') { const r = await stagehand.extract(b.input.instruction); return { content: out(r.data ?? r) }; }
    return { content: `Unknown tool ${b.name}`, is_error: true };
  };
  try {
    return await agentLoop({
      model: ctx.model, tools, exec, meter: ctx.meter, deadline: ctx.deadline, log: ctx.log, limits: ctx.limits,
      system: `${BASE_SYSTEM}\n\nYou control the browser through four tools: navigate, act, observe and extract. They are carried out on the live page by a browser automation layer that understands natural language. The browser starts on a blank page.`,
      prompt: taskPrompt(ctx.baseUrl, ctx.instruction),
    });
  } finally {
    // Add Stagehand's own inference to the bill (no cache-write figure is reported; cached input is priced as cache reads).
    try {
      const m = await stagehand.metrics();
      const t = { input: m.totalPromptTokens ?? m.totalInputTokens ?? 0, output: m.totalCompletionTokens ?? m.totalOutputTokens ?? 0, cached: m.totalCachedInputTokens ?? 0, reasoning: m.totalReasoningTokens ?? 0 };
      const p = PRICES[ctx.model];
      const inner = p ? ((t.input - t.cached) * p.in + t.cached * p.cacheRead + t.output * p.out) / 1e6 : 0;
      ctx.meter.extra.inner = { ...t, cost_usd: +inner.toFixed(6), raw: m };
      ctx.meter.extra.outer_cost_usd = +ctx.meter.cost.toFixed(6);
      ctx.meter.cost += inner; ctx.meter.input += t.input - t.cached; ctx.meter.cacheRead += t.cached; ctx.meter.output += t.output;
    } catch (e) { ctx.meter.extra.inner_error = String(e.message || e); }
  }
}
