// One manual Messages-API tool loop shared by the MCP, CLI, script, computer-use and Stagehand-tools contestants,
// so they differ only in the tools they expose. Meters tokens, cost, calls and enforces the shared limits.
import Anthropic from '@anthropic-ai/sdk';
import { LIMITS, costOf } from './config.mjs';

let client;
export class Meter {
  constructor(model) { Object.assign(this, { model, calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, toolCalls: 0, toolErrors: 0, truncations: 0, peakPrompt: 0, extra: {} }); }
  add(u) {
    this.calls++; this.input += u.input_tokens || 0; this.output += u.output_tokens || 0;
    this.cacheRead += u.cache_read_input_tokens || 0; this.cacheWrite += u.cache_creation_input_tokens || 0;
    this.cost += costOf(this.model, u) ?? 0;
    this.peakPrompt = Math.max(this.peakPrompt, (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0));
  }
  summary() {
    return { model_calls: this.calls, tokens: { input: this.input, output: this.output, cache_read: this.cacheRead, cache_write: this.cacheWrite, total_in: this.input + this.cacheRead + this.cacheWrite }, peak_prompt_tokens: this.peakPrompt, cost_usd: +this.cost.toFixed(6), tool_calls: this.toolCalls, tool_errors: this.toolErrors, truncations: this.truncations, extra: this.extra };
  }
}

/**
 * exec(block) -> { content: string | contentBlocks[], is_error?: boolean, extraFields?: object }
 * Runs tool calls of one turn in order. Returns { stopped_by, final_text }.
 */
export async function agentLoop({ model, system, tools, prompt, exec, meter, deadline, log, limits = LIMITS }) {
  client ??= new Anthropic();
  const messages = [{ role: 'user', content: prompt }];
  let finalText = '';
  for (;;) {
    if (meter.calls >= limits.maxModelCalls) return { stopped_by: 'max_calls', final_text: finalText };
    if (meter.cost >= limits.maxUsd) return { stopped_by: 'budget', final_text: finalText };
    if (Date.now() >= deadline) return { stopped_by: 'wall_clock', final_text: finalText };
    const resp = await client.messages.create({
      model, max_tokens: limits.maxTokens, system, tools, messages,
      cache_control: { type: 'ephemeral' },
      output_config: { effort: limits.effort },
    }, { timeout: Math.max(5000, deadline - Date.now() + 5000), maxRetries: 2 });
    meter.add(resp.usage);
    const text = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (text) finalText = text;
    log?.({ t: 'model', stop: resp.stop_reason, text, usage: resp.usage, calls: resp.content.filter((b) => b.type === 'tool_use').map((b) => ({ name: b.name, input: b.input })) });
    if (resp.stop_reason === 'refusal') return { stopped_by: 'refusal', final_text: finalText };
    if (resp.stop_reason === 'max_tokens') return { stopped_by: 'max_tokens', final_text: finalText };
    if (resp.stop_reason !== 'tool_use') return { stopped_by: 'done', final_text: finalText };
    messages.push({ role: 'assistant', content: resp.content });
    const results = [];
    let failed = false;
    for (const b of resp.content.filter((x) => x.type === 'tool_use')) {
      let r;
      if (failed && b.toolset_name) r = { content: 'Not executed: an earlier computer action in this turn failed.', is_error: true };
      else {
        meter.toolCalls++;
        try { r = Date.now() >= deadline ? { content: 'Time limit reached.', is_error: true } : await exec(b); }
        catch (e) { r = { content: `Error: ${String(e.message || e).slice(0, 2000)}`, is_error: true }; }
        if (r.is_error) { meter.toolErrors++; failed = true; }
      }
      log?.({ t: 'tool', name: b.name, is_error: !!r.is_error, result: typeof r.content === 'string' ? r.content.slice(0, 4000) : r.content.map((c) => (c.type === 'text' ? c.text.slice(0, 4000) : `[${c.type}]`)).join('\n') });
      results.push({ type: 'tool_result', tool_use_id: b.id, content: r.content, ...(r.is_error ? { is_error: true } : {}), ...(b.toolset_name ? { toolset_name: b.toolset_name } : {}) });
    }
    messages.push({ role: 'user', content: results });
  }
}
