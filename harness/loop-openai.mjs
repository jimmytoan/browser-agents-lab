// The same agent loop for OpenAI models (Responses API), so the GPT columns use the same contestants, tools,
// prompts and limits. Contestants keep their Anthropic-shaped tool lists and exec(); this file translates:
//   {name, description, input_schema}   -> function tool
//   {type: 'bash_20250124'}             -> function tool "bash" {command}
//   {type: 'computer_toolset_20260801'} -> OpenAI's built-in {type: 'computer'} tool (actions array -> exec per action)
// Conversation state is chained with previous_response_id.
import OpenAI from 'openai';
import { LIMITS } from './config.mjs';

let client;

function toOpenAITools(tools) {
  return tools.map((t) => {
    if (t.type === 'computer_toolset_20260801') return { type: 'computer' };
    if (t.type && t.type.startsWith('bash_')) return { type: 'function', name: 'bash', description: 'Run a bash command in a persistent working directory and return its combined stdout and stderr.', parameters: { type: 'object', properties: { command: { type: 'string', description: 'The command to run.' } }, required: ['command'] }, strict: false };
    return { type: 'function', name: t.name, description: t.description || '', parameters: t.input_schema || { type: 'object', properties: {} }, strict: false };
  });
}

// Anthropic-style content (string or blocks) -> function_call_output.output
function toFnOutput(content) {
  if (typeof content === 'string') return content;
  if (content.every((c) => c.type === 'text')) return content.map((c) => c.text).join('\n');
  return content.map((c) => (c.type === 'text' ? { type: 'input_text', text: c.text } : { type: 'input_image', image_url: `data:${c.source.media_type};base64,${c.source.data}` }));
}
const textOf = (content) => (typeof content === 'string' ? content : content.map((c) => (c.type === 'text' ? c.text : `[${c.type}]`)).join('\n'));

// One OpenAI computer action -> the cua contestant's action block.
function mapAction(a) {
  const mods = (a.keys || []).join('+') || undefined;
  switch (a.type) {
    case 'click': {
      const name = { left: 'left_click', right: 'right_click', wheel: 'middle_click', middle: 'middle_click' }[a.button || 'left'];
      if (!name) return { name: 'wait', input: { duration: 0.2 } }; // back/forward mouse buttons: not available
      return { name, input: { coordinate: [a.x, a.y], text: mods } };
    }
    case 'double_click': return { name: 'double_click', input: { coordinate: [a.x, a.y], text: mods } };
    case 'move': return { name: 'mouse_move', input: { coordinate: [a.x, a.y] } };
    case 'drag': { const p = (a.path || []).map((q) => (Array.isArray(q) ? q : [q.x, q.y])); return { name: 'left_click_drag', input: { start_coordinate: p[0], coordinate: p[p.length - 1] } }; }
    case 'scroll': {
      const dx = a.scroll_x || 0, dy = a.scroll_y || 0;
      const vertical = Math.abs(dy) >= Math.abs(dx);
      return { name: 'scroll', input: { coordinate: [a.x, a.y], scroll_direction: vertical ? (dy < 0 ? 'up' : 'down') : (dx < 0 ? 'left' : 'right'), scroll_amount: Math.max(0.2, Math.abs(vertical ? dy : dx) / 100), text: mods } };
    }
    case 'keypress': return { name: 'key', input: { text: (a.keys || []).join('+') } };
    case 'type': return { name: 'type', input: { text: a.text || '' } };
    case 'wait': return { name: 'wait', input: { duration: 1 } };
    case 'screenshot': return null;
    default: return { name: a.type, input: a };
  }
}

export async function agentLoopOpenAI({ model, system, tools, prompt, exec, meter, deadline, log, limits = LIMITS }) {
  client ??= new OpenAI();
  const oaTools = toOpenAITools(tools);
  let input = [{ role: 'user', content: prompt }];
  let previous;
  let finalText = '';
  for (;;) {
    if (meter.calls >= limits.maxModelCalls) return { stopped_by: 'max_calls', final_text: finalText };
    if (meter.cost >= limits.maxUsd) return { stopped_by: 'budget', final_text: finalText };
    if (Date.now() >= deadline) return { stopped_by: 'wall_clock', final_text: finalText };
    const resp = await client.responses.create({
      model, instructions: system, tools: oaTools, input, max_output_tokens: limits.maxTokens,
      reasoning: { effort: limits.effort }, ...(previous ? { previous_response_id: previous } : {}),
    }, { timeout: Math.max(5000, deadline - Date.now() + 5000), maxRetries: 2 });
    previous = resp.id;
    const u = resp.usage || {};
    const cached = u.input_tokens_details?.cached_tokens || 0;
    meter.add({ input_tokens: (u.input_tokens || 0) - cached, cache_read_input_tokens: cached, output_tokens: u.output_tokens || 0 });
    meter.extra.reasoning_tokens = (meter.extra.reasoning_tokens || 0) + (u.output_tokens_details?.reasoning_tokens || 0);

    const out = resp.output || [];
    const text = out.filter((o) => o.type === 'message').flatMap((o) => o.content || []).filter((c) => c.type === 'output_text').map((c) => c.text).join('\n').trim();
    const refused = out.some((o) => o.type === 'message' && (o.content || []).some((c) => c.type === 'refusal'));
    if (text) finalText = text;
    const fnCalls = out.filter((o) => o.type === 'function_call');
    const cuCalls = out.filter((o) => o.type === 'computer_call');
    log?.({ t: 'model', stop: resp.status, text, usage: u, calls: [...fnCalls.map((c) => ({ name: c.name, input: c.arguments })), ...cuCalls.flatMap((c) => (c.actions || (c.action ? [c.action] : [])).map((a) => ({ name: a.type, input: a })))] });
    if (refused) return { stopped_by: 'refusal', final_text: finalText };
    if (resp.status === 'incomplete' && !fnCalls.length && !cuCalls.length) return { stopped_by: 'max_tokens', final_text: finalText };
    if (!fnCalls.length && !cuCalls.length) return { stopped_by: 'done', final_text: finalText };

    input = [];
    const run = async (block) => {
      meter.toolCalls++;
      let r;
      try { r = Date.now() >= deadline ? { content: 'Time limit reached.', is_error: true } : await exec(block); }
      catch (e) { r = { content: `Error: ${String(e.message || e).slice(0, 2000)}`, is_error: true }; }
      if (r.is_error) meter.toolErrors++;
      log?.({ t: 'tool', name: block.name, is_error: !!r.is_error, result: textOf(r.content).slice(0, 4000) });
      return r;
    };
    for (const c of fnCalls) {
      let args = {};
      try { args = JSON.parse(c.arguments || '{}'); } catch { /* fall through with {} */ }
      const r = await run({ name: c.name, input: args });
      const o = toFnOutput(r.content);
      input.push({ type: 'function_call_output', call_id: c.call_id, output: r.is_error && typeof o === 'string' ? `ERROR: ${o}` : o });
    }
    for (const c of cuCalls) {
      const notes = [];
      let failed = false;
      for (const a of c.actions || (c.action ? [c.action] : [])) {
        const block = mapAction(a);
        if (!block) continue;
        if (failed) { notes.push(`${a.type}: not executed, an earlier action in this batch failed.`); continue; }
        const r = await run(block);
        const t = textOf(r.content);
        if (r.is_error) { failed = true; notes.push(`${a.type} failed: ${t}`); }
        else if (t && t !== 'OK' && !t.startsWith('[')) notes.push(t);
      }
      const shot = await exec({ name: '_shot', input: {} });
      meter.extra.screenshots_sent = (meter.extra.screenshots_sent || 0) + 1;
      const img = shot.content.find((x) => x.type === 'image');
      const checks = c.pending_safety_checks || [];
      if (checks.length) meter.extra.safety_checks = (meter.extra.safety_checks || 0) + checks.length;
      input.push({ type: 'computer_call_output', call_id: c.call_id, ...(checks.length ? { acknowledged_safety_checks: checks } : {}), output: { type: 'computer_screenshot', image_url: `data:${img.source.media_type};base64,${img.source.data}`, detail: 'original' } });
      const dialog = shot.content.find((x) => x.type === 'text');
      if (dialog) notes.push(dialog.text);
      if (notes.length) input.push({ role: 'user', content: [{ type: 'input_text', text: `[Computer environment] ${[...new Set(notes)].join(' ')}` }] });
    }
  }
}
