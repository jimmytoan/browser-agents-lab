// (a) Playwright MCP: the official @playwright/mcp server over stdio, default capabilities, its tools passed
// to the model unchanged. Headless and --isolated (in-memory profile owned by the lab).
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ROOT, BASE_SYSTEM, VIEWPORT, safeEnv, clip, taskPrompt } from '../config.mjs';
import { agentLoop } from '../loop.mjs';

export const pkg = '@playwright/mcp';

export async function run(ctx) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(ROOT, 'node_modules/@playwright/mcp/cli.js'), '--browser', 'chromium', '--headless', '--isolated', '--viewport-size', `${VIEWPORT.width}x${VIEWPORT.height}`, '--output-dir', path.join(ctx.workdir, '.mcp-out')],
    cwd: ctx.workdir, env: safeEnv(), stderr: 'ignore',
  });
  const mcp = new Client({ name: 'browser-agents-lab', version: '0.1.0' });
  ctx.cleanup.push(() => mcp.close().catch(() => {}));
  await mcp.connect(transport);
  const { tools: mcpTools } = await mcp.listTools();
  const tools = mcpTools.map((t) => ({ name: t.name, description: t.description || '', input_schema: t.inputSchema }));
  ctx.meter.extra.tool_count = tools.length;
  ctx.meter.extra.tool_schema_chars = JSON.stringify(tools).length;

  const exec = async (b) => {
    const r = await mcp.callTool({ name: b.name, arguments: b.input }, undefined, { timeout: ctx.limits.cmdTimeoutS * 1000 });
    const content = [];
    for (const c of r.content || []) {
      if (c.type === 'text') { const k = clip(c.text, ctx.limits.maxToolChars); if (k.truncated) ctx.meter.truncations++; content.push({ type: 'text', text: k.text }); }
      else if (c.type === 'image') content.push({ type: 'image', source: { type: 'base64', media_type: c.mimeType, data: c.data } });
    }
    return { content: content.length ? content : 'OK', is_error: !!r.isError };
  };
  return agentLoop({
    model: ctx.model, tools, exec, meter: ctx.meter, deadline: ctx.deadline, log: ctx.log, limits: ctx.limits,
    system: `${BASE_SYSTEM}\n\nYou control the browser through the Playwright MCP tools (browser_*). The browser starts on a blank page.`,
    prompt: taskPrompt(ctx.baseUrl, ctx.instruction),
  });
}
