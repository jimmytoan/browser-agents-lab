// (c) Vision-based computer use: Anthropic's computer toolset (computer_toolset_20260801, GA, no beta header).
// The "computer" is a headless Chromium viewport owned by the lab: screenshots in, mouse and keyboard out.
// The model never sees the DOM.
import { chromium } from 'playwright';
import { BASE_SYSTEM, VIEWPORT, taskPrompt } from '../config.mjs';
import { agentLoop } from '../loop.mjs';

export const pkg = 'playwright';

const KEYMAP = { return: 'Enter', enter: 'Enter', kp_enter: 'Enter', backspace: 'Backspace', delete: 'Delete', escape: 'Escape', esc: 'Escape', tab: 'Tab', space: 'Space', up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', page_down: 'PageDown', pagedown: 'PageDown', next: 'PageDown', page_up: 'PageUp', pageup: 'PageUp', prior: 'PageUp', home: 'Home', end: 'End', ctrl: 'ControlOrMeta', control: 'ControlOrMeta', cmd: 'Meta', super: 'Meta', meta: 'Meta', alt: 'Alt', option: 'Alt', shift: 'Shift' };
const combo = (text) => String(text).split('+').map((k) => KEYMAP[k.trim().toLowerCase()] || (k.trim().length === 1 ? k.trim() : k.trim()[0].toUpperCase() + k.trim().slice(1))).join('+');

export async function run(ctx) {
  const browser = await chromium.launch({ headless: true });
  ctx.cleanup.push(() => browser.close().catch(() => {}));
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  // Native <select> popups are drawn by the OS and never appear in a page screenshot, so a vision agent in a
  // headless viewport could not see them. Draw the option list in the page instead (cua only; the DOM is not shown to the model).
  await context.addInitScript(() => {
    document.addEventListener('mousedown', (e) => {
      const old = document.getElementById('__lab_select'); if (old) old.remove();
      const sel = e.target.closest && e.target.closest('select'); if (!sel) return;
      e.preventDefault(); sel.focus();
      const r = sel.getBoundingClientRect(); const box = document.createElement('div'); box.id = '__lab_select';
      box.style.cssText = `position:fixed;left:${r.left}px;top:${r.bottom}px;min-width:${r.width}px;background:#fff;border:1px solid #777;box-shadow:0 4px 14px #0004;z-index:2147483647;font:14px system-ui;max-height:320px;overflow:auto`;
      for (const o of sel.options) { const d = document.createElement('div'); d.textContent = o.textContent; d.style.cssText = 'padding:5px 12px;cursor:default' + (o.selected ? ';background:#dde6ff' : '');
        d.addEventListener('mousedown', (ev) => { ev.preventDefault(); ev.stopPropagation(); sel.value = o.value; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); box.remove(); }); box.appendChild(d); }
      document.body.appendChild(box);
    }, true);
  });
  const page = await context.newPage();
  await page.goto(ctx.baseUrl + '/');
  let pos = [0, 0];
  let chooser = null; // a pending native file dialog, emulated as "type the path, press Enter"
  let typedPath = '';
  page.on('filechooser', (fc) => { chooser = fc; typedPath = ''; });
  ctx.meter.extra.screenshots = 0;

  const shot = async (clip) => { ctx.meter.extra.screenshots++; const buf = await page.screenshot({ type: 'png', ...(clip ? { clip } : {}) }); return [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: buf.toString('base64') } }]; };
  const withMods = async (text, fn) => { const mods = text ? String(text).split('+').map((m) => KEYMAP[m.trim().toLowerCase()] || m.trim()) : []; for (const m of mods) await page.keyboard.down(m); try { await fn(); } finally { for (const m of mods.reverse()) await page.keyboard.up(m); } };
  const click = async (i, button, count) => { if (i.coordinate) pos = i.coordinate; await withMods(i.text, () => page.mouse.click(pos[0], pos[1], { button, clickCount: count })); await page.waitForTimeout(250); return 'OK'; };
  const dialogNote = () => (chooser ? ' A file selection dialog is now open: type the absolute path of the file and press Return to choose it, or press Escape to cancel.' : '');

  const actions = {
    screenshot: () => (chooser ? [{ type: 'text', text: 'A file selection dialog is open and covers the page: type the absolute path of the file and press Return, or press Escape to cancel.' }] : shot()),
    // Used by the OpenAI loop, whose computer tool expects an image after every call: the page image, plus the dialog note if one is open.
    _shot: async () => [...(await shot()), ...(chooser ? [{ type: 'text', text: 'A file selection dialog is open and covers the page: type the absolute path of the file and press Return, or press Escape to cancel.' }] : [])],
    zoom: (i) => { const [x0, y0, x1, y1] = i.region; return shot({ x: x0, y: y0, width: Math.max(1, x1 - x0), height: Math.max(1, y1 - y0) }); },
    left_click: async (i) => (await click(i, 'left', 1)) + dialogNote(),
    right_click: (i) => click(i, 'right', 1),
    middle_click: (i) => click(i, 'middle', 1),
    double_click: (i) => click(i, 'left', 2),
    triple_click: (i) => click(i, 'left', 3),
    mouse_move: async (i) => { pos = i.coordinate; await page.mouse.move(pos[0], pos[1], { steps: 5 }); return 'OK'; },
    left_mouse_down: async () => { await page.mouse.down(); return 'OK'; },
    left_mouse_up: async () => { await page.mouse.up(); return 'OK'; },
    left_click_drag: async (i) => { const [sx, sy] = i.start_coordinate; pos = i.coordinate; await page.mouse.move(sx, sy); await page.mouse.down(); await page.mouse.move(pos[0], pos[1], { steps: 15 }); await page.waitForTimeout(100); await page.mouse.up(); await page.waitForTimeout(200); return 'OK'; },
    cursor_position: () => `X=${pos[0]}, Y=${pos[1]}`,
    scroll: async (i) => { if (i.coordinate) { pos = i.coordinate; await page.mouse.move(pos[0], pos[1]); } const n = (i.scroll_amount || 3) * 100; const d = { up: [0, -n], down: [0, n], left: [-n, 0], right: [n, 0] }[i.scroll_direction] || [0, n]; await withMods(i.text, () => page.mouse.wheel(d[0], d[1])); await page.waitForTimeout(250); return 'OK'; },
    type: async (i) => { if (chooser) { typedPath += i.text; return 'OK'; } await page.keyboard.type(i.text, { delay: 5 }); return 'OK'; },
    key: async (i) => {
      const k = combo(i.text);
      if (chooser) {
        if (k === 'Enter') { const fc = chooser; chooser = null; try { await fc.setFiles(typedPath.trim()); return 'File chosen; the dialog closed.'; } catch (e) { return { err: `The dialog could not open "${typedPath.trim()}": ${e.message.split('\n')[0]}. The dialog closed.` }; } }
        if (k === 'Escape') { chooser = null; return 'Dialog cancelled.'; }
        if (k === 'Backspace') { typedPath = typedPath.slice(0, -1); return 'OK'; }
        if (/^ControlOrMeta\+a$/i.test(k)) { typedPath = ''; return 'OK'; }
        return 'OK';
      }
      for (let n = 0; n < Math.min(i.repeat || 1, 100); n++) await page.keyboard.press(k);
      await page.waitForTimeout(150); return 'OK';
    },
    hold_key: async (i) => { const k = combo(i.text); await page.keyboard.down(k); await page.waitForTimeout(Math.min(i.duration || 1, 5) * 1000); await page.keyboard.up(k); return 'OK'; },
    wait: async (i) => { await page.waitForTimeout(Math.min(i.duration || 1, 10) * 1000); return 'OK'; },
  };

  const exec = async (b) => {
    const fn = actions[b.name];
    if (!fn) return { content: `Unknown computer action: ${b.name}`, is_error: true };
    const r = await fn(b.input || {});
    if (r && r.err) return { content: r.err, is_error: true };
    return { content: typeof r === 'string' ? [{ type: 'text', text: r }] : r };
  };
  return agentLoop({
    model: ctx.model, tools: [{ type: 'computer_toolset_20260801' }], exec, meter: ctx.meter, deadline: ctx.deadline, log: ctx.log, limits: ctx.limits,
    system: `${BASE_SYSTEM}\n\nYou control the browser only by looking at screenshots and using the mouse and keyboard. The screen is a ${VIEWPORT.width}x${VIEWPORT.height} browser window that already shows the application; there is no address bar, so navigate with the links on the page. End each group of actions with a screenshot so you can verify the result before continuing.`,
    prompt: taskPrompt(ctx.baseUrl, ctx.instruction),
  });
}
