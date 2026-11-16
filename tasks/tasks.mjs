// Ten tasks. Each has: setup (seeded, may adjust state and returns params), instruction (plain language),
// check (reads backend state, plus the agent's ANSWER line where a value must be reported),
// solve (scripted correct solution) and wrong (scripted plausible mistake) for the model-free self-test.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { rng, LOGIN, CARRIERS, COUNTRIES, STAGES } from '../app/server.mjs';

const pick = (r, xs) => xs[Math.floor(r() * xs.length)];
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function extractAnswer(text) {
  const m = [...String(text || '').matchAll(/ANSWER:\s*(.+)/gi)].pop();
  return m ? m[1].trim().replace(/[*`]/g, '') : '';
}
const res = (ok, why) => ({ ok, why });

export async function login(page, base) {
  await page.goto(base + '/login');
  await page.fill('#email', LOGIN.email);
  await page.fill('#password', LOGIN.password);
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard');
}

export const TASKS = [
  {
    id: '01_login_read', title: 'Log in and read a value', level: 1,
    setup: (s) => ({ value: s.dashboard.open, decoy: s.dashboard.overdue }),
    instruction: () => 'Report the amount shown for "Open invoices total" on the Dashboard page.',
    check: (s, p, answer) => answer.replace(/\D/g, '') === String(p.value) ? res(true, 'answer matches') : res(false, `answer "${answer}" != ${p.value}`),
    solve: async (page) => { await page.goto(page.base + '/dashboard'); const t = await page.locator('.card', { hasText: 'Open invoices total' }).locator('.v').innerText(); return `ANSWER: ${t}`; },
    wrong: async (page) => { await page.goto(page.base + '/dashboard'); const t = await page.locator('.card', { hasText: 'Overdue invoices total' }).locator('.v').innerText(); return `ANSWER: ${t}`; },
  },
  {
    id: '02_wizard', title: 'Multi-step form with validation', level: 2,
    setup: (s, r) => {
      const name = `${pick(r, ['Vättern', 'Siljan', 'Dalälv', 'Kebne', 'Öresund'])} ${pick(r, ['Components', 'Industri', 'Metall', 'Teknik'])} AB`;
      const org = String(int(r, 556000, 559999)) + String(int(r, 1000, 9999));
      const postal = String(int(r, 11100, 98999));
      return { name, orgRaw: org, orgno: `${org.slice(0, 6)}-${org.slice(6)}`, email: `inkop@${name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, 'a')}.test`, street: `${pick(r, ['Hamngatan', 'Industrivägen', 'Kungsgatan', 'Verkstadsgatan'])} ${int(r, 1, 98)}`, postalRaw: postal, postal: `${postal.slice(0, 3)} ${postal.slice(3)}`, city: pick(r, ['Jönköping', 'Linköping', 'Karlstad', 'Sundsvall']), country: pick(r, COUNTRIES.slice(1)), terms: pick(r, [15, 60]) };
    },
    instruction: (p) => `Register a new supplier (Suppliers → New supplier) with these details: company name "${p.name}", organisation number ${p.orgRaw}, contact email ${p.email}, street address "${p.street}", postal code ${p.postalRaw}, city ${p.city}, country ${p.country}, payment terms ${p.terms} days. The form may require specific formats; follow what it asks for. Complete all steps so the supplier is created.`,
    check: (s, p) => {
      const added = s.suppliers.slice(4);
      if (added.length !== 1) return res(false, `${added.length} suppliers created`);
      const bad = ['name', 'orgno', 'email', 'street', 'postal', 'city', 'country', 'terms'].filter((k) => added[0][k] !== p[k]);
      return bad.length ? res(false, `wrong fields: ${bad.join(',')}`) : res(true, 'supplier matches');
    },
    solve: async (page, p) => wizard(page, p, p.terms),
    wrong: async (page, p) => wizard(page, p, 30),
  },
  {
    id: '03_search_filter', title: 'Search, filter, sort and paginate', level: 3,
    setup: (s, r) => {
      for (const o of s.orders) if (o.customer.startsWith('Nordlys') && o.status === 'On hold') o.status = 'Processing';
      const free = s.orders.filter((o) => !o.customer.startsWith('Nordlys'));
      const chosen = []; while (chosen.length < 4) { const o = pick(r, free); if (!chosen.includes(o)) chosen.push(o); }
      const top = int(r, 20000, 38000);
      [top, top - int(r, 300, 2500), top - int(r, 3000, 9000)].forEach((a, i) => Object.assign(chosen[i], { customer: 'Nordlys AB', status: 'On hold', amount: a }));
      Object.assign(chosen[3], { customer: 'Nordlys Trading AB', status: 'On hold', amount: top + int(r, 800, 6000) });
      // a bigger Nordlys AB order that is NOT on hold, as a second decoy
      const other = s.orders.find((o) => o.customer === 'Nordlys AB' && o.status !== 'On hold'); if (other) other.amount = top + 9000;
      return { target: chosen[0].id, decoy: chosen[3].id };
    },
    instruction: () => 'On the Orders page, look at the orders of the customer "Nordlys AB" (exactly that customer, not similarly named ones) that have status "On hold". Open the one with the highest amount and flag it for review. Do not flag any other order.',
    check: (s, p) => { const f = s.orders.filter((o) => o.flagged).map((o) => o.id); return f.length === 1 && f[0] === p.target ? res(true, 'right order flagged') : res(false, `flagged ${JSON.stringify(f)}, wanted ${p.target}`); },
    solve: async (page, p) => flagTop(page, 'Nordlys AB', true),
    wrong: async (page, p) => flagTop(page, 'Nordlys', false),
  },
  {
    id: '04_table_edit', title: 'Edit a row in a long table', level: 2,
    setup: (s, r) => { const i = int(r, 22, 56); const pr = s.products[i]; return { sku: pr.sku, neighbour: s.products[i + 1].sku, price: pr.price + int(r, 5, 60), stock: pr.stock + int(r, 3, 40), before: JSON.stringify(s.products) }; },
    instruction: (p) => `On the Products page, change product ${p.sku}: set its price to ${p.price} and its stock to ${p.stock}, then save the row. Do not change any other product.`,
    check: (s, p) => {
      const before = JSON.parse(p.before);
      const diff = s.products.filter((x, i) => x.price !== before[i].price || x.stock !== before[i].stock);
      if (diff.length !== 1 || diff[0].sku !== p.sku) return res(false, `changed rows: ${diff.map((d) => d.sku).join(',') || 'none'}`);
      return diff[0].price === p.price && diff[0].stock === p.stock ? res(true, 'row updated') : res(false, `values ${diff[0].price}/${diff[0].stock}`);
    },
    solve: async (page, p) => editRow(page, p.sku, p.price, p.stock),
    wrong: async (page, p) => editRow(page, p.neighbour, p.price, p.stock),
  },
  {
    id: '05_datepicker_dropdown', title: 'Custom date picker and dropdown', level: 3,
    setup: (s, r) => {
      const off = int(r, 2, 4); const y = 2027, m = off - 2; // Jan..Mar 2027
      let d; do { d = int(r, 1, 28); } while ([0, 6].includes(new Date(Date.UTC(y, m, d)).getUTCDay()));
      const carrier = pick(r, CARRIERS);
      return { ref: pick(r, s.orders).id, iso: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, human: `${d} ${MONTHS[m]} ${y}`, clicks: off, carrier, wrongCarrier: CARRIERS[(CARRIERS.indexOf(carrier) + 1) % CARRIERS.length], window: pick(r, ['Morning', 'Afternoon', 'Evening']) };
    },
    instruction: (p) => `Book a delivery (Deliveries page) for order reference ${p.ref}: delivery date ${p.human}, carrier "${p.carrier}", time window ${p.window}. Make exactly one booking.`,
    check: (s, p) => {
      if (s.bookings.length !== 1) return res(false, `${s.bookings.length} bookings`);
      const b = s.bookings[0]; const bad = [['ref', p.ref], ['date', p.iso], ['carrier', p.carrier], ['window', p.window]].filter(([k, v]) => b[k] !== v).map(([k]) => `${k}=${b[k]}`);
      return bad.length ? res(false, `wrong: ${bad.join(', ')}`) : res(true, 'booking matches');
    },
    solve: async (page, p) => book(page, p, p.carrier),
    wrong: async (page, p) => book(page, p, p.wrongCarrier),
  },
  {
    id: '06_upload', title: 'Upload a file', level: 2,
    setup: (s, r, ctx) => {
      const n = int(r, 4000, 4999);
      const mk = (name) => { const f = path.join(ctx.workdir, name); const body = `%PDF-1.4\n% lab fixture ${name} ${Math.floor(r() * 1e12)}\n`; fs.writeFileSync(f, body); return { path: f, sha256: crypto.createHash('sha256').update(body).digest('hex') }; };
      const good = mk(`invoice-${n}.pdf`); const draft = mk(`invoice-${n}-draft.pdf`);
      return { filename: `invoice-${n}.pdf`, path: good.path, sha256: good.sha256, draftPath: draft.path, supplier: pick(r, s.suppliers).name, type: 'Invoice' };
    },
    instruction: (p) => `On the Documents page, upload the file ${p.path} for supplier "${p.supplier}" with document type "${p.type}". Upload it exactly once. (There is also a draft file in that folder; do not upload the draft.)`,
    check: (s, p) => {
      if (s.documents.length !== 1) return res(false, `${s.documents.length} documents uploaded`);
      const d = s.documents[0]; const bad = ['supplier', 'type', 'filename', 'sha256'].filter((k) => d[k] !== p[k]);
      return bad.length ? res(false, `wrong: ${bad.join(',')}`) : res(true, 'document matches');
    },
    solve: async (page, p) => upload(page, p, p.path),
    wrong: async (page, p) => upload(page, p, p.draftPath),
  },
  {
    id: '07_modal_toast', title: 'Confirmation modal and delayed toast', level: 3,
    setup: (s, r) => { const [name, decoy] = pick(r, [['Berg & Co', 'Berg & Co AB'], ['Lind Bygg', 'Lind Bygg & Son'], ['Nordlys AB', 'Nordlys Trading AB']]); return { name, decoy, id: s.customers.find((c) => c.name === name).id }; },
    instruction: (p) => `On the Customers page, archive the customer "${p.name}" (exactly that customer, not a similarly named one). After archiving, the app shows a confirmation with a reference code of the form ARC-XXXXXX; report that reference code.`,
    check: (s, p, answer) => {
      const arch = s.customers.filter((c) => c.archived).map((c) => c.name);
      if (arch.length !== 1 || arch[0] !== p.name) return res(false, `archived ${JSON.stringify(arch)}`);
      const ref = s.archiveRefs[p.id];
      return answer.toUpperCase().includes(ref) ? res(true, 'archived, reference reported') : res(false, `archived but answer "${answer}" lacks ${ref}`);
    },
    solve: async (page, p) => archive(page, p.name),
    wrong: async (page, p) => archive(page, p.decoy),
  },
  {
    id: '08_iframe_shadow', title: 'Widget inside an iframe and shadow DOM', level: 2,
    setup: (s, r) => ({ threshold: int(r, 15, 90) * 10 + 5 }),
    instruction: (p) => `On the Settings page, in the Notifications section, set the alert threshold to ${p.threshold}, turn the weekly digest on, and save the notification settings.`,
    check: (s, p) => s.settings.threshold === p.threshold && s.settings.digest === true ? res(true, 'settings saved') : res(false, `settings ${JSON.stringify(s.settings)}`),
    solve: async (page, p) => widget(page, p.threshold, true),
    wrong: async (page, p) => widget(page, p.threshold, false),
  },
  {
    id: '09_drag_reorder', title: 'Drag-and-drop reorder', level: 4,
    setup: (s, r) => {
      const n = s.pipeline.length; let i, j; do { i = int(r, 0, n - 1); j = int(r, 0, n - 1); } while (Math.abs(i - j) < 2);
      const order = [...s.pipeline]; const [x] = order.splice(i, 1); order.splice(j, 0, x);
      let k, l; do { k = int(r, 0, n - 1); l = int(r, 0, n - 1); } while (Math.abs(k - l) < 2 || order[k] === x);
      const [y] = order.splice(k, 1); order.splice(l, 0, y); // two moves, so one drag is not enough
      return { order, start: [...s.pipeline] };
    },
    instruction: (p) => `On the Pipeline page, reorder the stages by dragging so that the order from top to bottom is exactly: ${p.order.join(', ')}. Then save the order.`,
    check: (s, p) => s.pipelineSaved && s.pipeline.join('|') === p.order.join('|') ? res(true, 'order saved') : res(false, `saved=${!!s.pipelineSaved} order=${s.pipeline.join(', ')}`),
    solve: async (page, p) => reorder(page, p.order),
    wrong: async (page, p) => reorder(page, p.start),
  },
  {
    id: '10_layout_shift', title: 'Layout and labels change between runs', level: 4,
    setup: (s, r) => { const a = pick(r, s.expenses); let b; do { b = pick(r, s.expenses); } while (b === a); return { approve: a.employee, reject: b.employee, aid: a.id, bid: b.id, variant: s.variant }; },
    instruction: (p) => `On the Expenses page, approve the expense report submitted by ${p.approve} and reject the expense report submitted by ${p.reject}. Leave every other expense report pending.`,
    check: (s, p) => {
      const bad = s.expenses.filter((e) => e.status !== (e.id === p.aid ? 'Approved' : e.id === p.bid ? 'Rejected' : 'Pending')).map((e) => `${e.employee}=${e.status}`);
      return bad.length ? res(false, `wrong: ${bad.join(', ')}`) : res(true, 'statuses match');
    },
    solve: async (page, p, s) => expenses(page, p, s, false),
    wrong: async (page, p, s) => expenses(page, p, s, true),
  },
  {
    id: '11_canvas_map', title: 'Canvas-rendered map (no DOM for the targets)', level: 5,
    setup: (s, r) => { const free = s.warehouse.bays.filter((b) => !b.occupied); const bay = pick(r, free); let other; do { other = pick(r, free); } while (other === bay); return { pallet: s.warehouse.pallets[1], bay: bay.id, other: other.id }; },
    instruction: (p) => `On the Warehouse page, assign pallet ${p.pallet} to bay ${p.bay}: choose that pallet, select the bay on the map, and assign it. Make only this one assignment.`,
    check: (s, p) => { const a = s.warehouse.assignments; return Object.keys(a).length === 1 && a[p.pallet] === p.bay ? res(true, 'assignment matches') : res(false, `assignments ${JSON.stringify(a)}`); },
    solve: async (page, p, s) => assign(page, p.pallet, p.bay, s),
    wrong: async (page, p, s) => assign(page, p.pallet, p.other, s),
  },
  {
    id: '12_hover_slider', title: 'Hover-revealed action and a custom slider', level: 5,
    setup: (s, r) => { const i = int(r, 2, 7); let d; do { d = int(r, 6, 54); } while (d % 5 === 0); return { sku: s.products[i].sku, other: s.products[i - 1].sku, discount: d }; },
    instruction: (p) => `On the Pricing page, set the discount for product ${p.sku} to exactly ${p.discount}% and apply it. Do not change any other product's discount.`,
    check: (s, p) => { const d = Object.entries(s.discounts).filter(([, v]) => v !== 0); return d.length === 1 && d[0][0] === p.sku && d[0][1] === p.discount ? res(true, 'discount matches') : res(false, `discounts ${JSON.stringify(s.discounts)}`); },
    solve: async (page, p) => discount(page, p.sku, p.discount),
    wrong: async (page, p) => discount(page, p.sku, p.discount + 1),
  },
  {
    id: '13_bulk_policy', title: 'Long job: apply a policy across a paginated list', level: 5,
    setup: (s, r) => {
      const ok = CUSTOMER_NAMES(s).filter((c) => !s.blocked.includes(c));
      const idx = []; while (idx.length < 5) { const i = int(r, 0, 23); if (!idx.includes(i)) idx.push(i); }
      Object.assign(s.refunds[idx[0]], { customer: pick(r, ok), reason: 'Damaged item', amount: 500 });
      Object.assign(s.refunds[idx[1]], { customer: pick(r, ok), reason: 'Damaged item', amount: 501 });
      Object.assign(s.refunds[idx[2]], { customer: s.blocked[0], reason: 'Damaged item', amount: int(r, 100, 400) });
      Object.assign(s.refunds[idx[3]], { customer: s.blocked[1], reason: 'Wrong item', amount: int(r, 600, 1400) });
      Object.assign(s.refunds[idx[4]], { customer: pick(r, ok), reason: 'Damaged item', amount: int(r, 90, 300) });
      const expected = Object.fromEntries(s.refunds.map((x) => [x.id, s.blocked.includes(x.customer) ? 'Rejected' : x.reason === 'Damaged item' && x.amount <= 500 ? 'Approved' : 'Pending']));
      return { expected, trap: s.refunds[idx[2]].id };
    },
    instruction: () => 'On the Refunds page (it has several pages), process the pending refund requests by this policy: reject every request from a customer marked "Blocked"; of the remaining requests, approve those whose reason is "Damaged item" and whose amount is at most SEK 500; leave all other requests pending. Go through every page.',
    check: (s, p) => { const bad = s.refunds.filter((x) => x.status !== p.expected[x.id]); return bad.length ? res(false, `${bad.length} wrong, e.g. ${bad.slice(0, 3).map((x) => `${x.id}=${x.status} (want ${p.expected[x.id]})`).join(', ')}`) : res(true, 'all 24 statuses match'); },
    solve: async (page, p) => refunds(page, p.expected),
    wrong: async (page, p) => refunds(page, { ...p.expected, [p.trap]: 'Approved' }),
  },
  {
    id: '14_transient_key', title: 'Copy a key from a toast that disappears', level: 5,
    setup: () => ({}),
    instruction: () => 'On the Integrations page, generate a new signing key. The key is shown only briefly. Then enter that exact key as the signing secret on the Webhooks page and save. Generate a key only once if you can; the saved secret must equal the most recently generated key.',
    check: (s) => !s.keys.last ? res(false, 'no key generated') : s.webhookSecret === s.keys.last ? res(true, `secret matches (keys generated: ${s.keys.count})`) : res(false, `secret "${s.webhookSecret}" != key "${s.keys.last}" (generated ${s.keys.count})`),
    solve: async (page) => keyCopy(page, (k) => k),
    wrong: async (page) => keyCopy(page, (k) => k.replace(/-/g, '')),
  },
  {
    id: '15_closed_shadow', title: 'Widget in an iframe with a closed shadow root', level: 5,
    setup: (s, r) => ({ plan: pick(r, ['Annual', 'Enterprise']), seats: int(r, 6, 40) }),
    instruction: (p) => `On the Billing page, change the subscription to the ${p.plan} plan with ${p.seats} seats and confirm the plan.`,
    check: (s, p) => s.billing.confirmed && s.billing.plan === p.plan && s.billing.seats === p.seats ? res(true, 'plan confirmed') : res(false, `billing ${JSON.stringify({ plan: s.billing.plan, seats: s.billing.seats, confirmed: s.billing.confirmed })}`),
    solve: async (page, p, s) => plan(page, p.plan, p.seats, s),
    wrong: async (page, p, s) => plan(page, 'Monthly', p.seats, s),
  },
];

// ---------- scripted solutions (self-test only) ----------
async function wizard(page, p, terms) {
  await page.goto(page.base + '/suppliers/new');
  await page.fill('#name', p.name); await page.fill('#orgno', p.orgno); await page.fill('#email', p.email); await page.click('#next');
  await page.fill('#street', p.street); await page.fill('#postal', p.postal); await page.fill('#city', p.city); await page.selectOption('#country', p.country);
  await page.check(`input[name=terms][value="${terms}"]`); await page.click('#next');
  await page.check('#confirm'); await page.click('#submit'); await page.waitForURL('**/suppliers'); return '';
}
async function flagTop(page, q, exact) {
  await page.goto(page.base + '/orders');
  await page.fill('#q', q); await page.selectOption('#status', 'On hold'); await page.click('#sortamt'); await page.waitForTimeout(1200);
  const rows = page.locator('#rows tr');
  const n = await rows.count();
  for (let i = 0; i < n; i++) {
    const cust = await rows.nth(i).locator('td').nth(1).innerText();
    if (!exact || cust === q) { await rows.nth(i).locator('a').click(); break; }
  }
  await page.click('#flag'); await page.waitForSelector('#flag[disabled]'); return '';
}
async function editRow(page, sku, price, stock) {
  await page.goto(page.base + '/products');
  const tr = page.locator(`tr[data-sku="${sku}"]`);
  await tr.locator('.edit').click(); await tr.locator('.price input').fill(String(price)); await tr.locator('.stock input').fill(String(stock));
  await tr.locator('.save').click(); await tr.locator('.ok').waitFor(); return '';
}
async function book(page, p, carrier) {
  await page.goto(page.base + '/deliveries/new');
  await page.fill('#ref', p.ref);
  for (let i = 0; i < p.clicks; i++) await page.click('#nm');
  await page.click(`button[data-d="${p.iso}"]`);
  await page.click('#ddb'); await page.locator('.dd-item', { hasText: new RegExp(`^${carrier}$`) }).click();
  await page.check(`input[name=win][value="${p.window}"]`); await page.click('#book');
  await page.waitForFunction(() => document.getElementById('done').textContent !== ''); return '';
}
async function upload(page, p, file) {
  await page.goto(page.base + '/documents');
  await page.selectOption('#sup', p.supplier); await page.selectOption('#type', p.type); await page.setInputFiles('#file', file);
  await page.click('#up'); await page.locator('#docs tr').first().waitFor(); return '';
}
async function archive(page, name) {
  await page.goto(page.base + '/customers');
  await page.locator('tbody tr').filter({ has: page.locator('.n', { hasText: new RegExp(`^${name.replace(/[&]/g, '\\$&')}$`) }) }).locator('.arch').click();
  await page.fill('#mconf', name); await page.click('#mok');
  await page.locator('#toast').waitFor({ state: 'visible', timeout: 8000 });
  return 'ANSWER: ' + (await page.locator('#tmsg').innerText()).split('Reference: ')[1];
}
async function widget(page, threshold, digest) {
  await page.goto(page.base + '/settings');
  const f = page.frameLocator('iframe');
  await f.locator('#th').fill(String(threshold)); if (digest) await f.locator('#sw').click();
  await f.locator('#sv').click(); await f.locator('#ok', { hasText: 'Saved' }).waitFor(); return '';
}
async function reorder(page, target) {
  await page.goto(page.base + '/pipeline');
  for (let k = 0; k < target.length; k++) {
    const names = await page.locator('#pl .nm').allInnerTexts();
    if (names[k] === target[k]) continue;
    const from = await page.locator('#pl li').nth(names.indexOf(target[k])).locator('.h').boundingBox();
    const to = await page.locator('#pl li').nth(k).boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
    await page.mouse.move(to.x + 40, to.y + 6, { steps: 8 }); await page.mouse.up();
  }
  await page.click('#save'); await page.waitForFunction(() => document.getElementById('done').textContent !== ''); return '';
}
async function expenses(page, p, s, invert) {
  await page.goto(page.base + '/expenses');
  const u = s.expenseUi;
  const act = async (id, kind) => { if (invert) kind = kind === 'approve' ? 'reject' : 'approve'; const row = page.locator(`[data-id="${id}"]`); await row.locator(`[data-k="${u.keys[kind]}"]`).click(); await row.locator('.ac:empty').waitFor({ state: 'attached' }); };
  await act(p.aid, 'approve'); await act(p.bid, 'reject'); return '';
}


const CUSTOMER_NAMES = (s) => s.customers.map((c) => c.name);
async function assign(page, pallet, bay, s) {
  await page.goto(page.base + '/warehouse');
  await page.selectOption('#pal', pallet);
  const g = s.warehouse.geo, i = s.warehouse.bays.findIndex((b) => b.id === bay);
  await page.locator('#cv').click({ position: { x: g.ox + (i % 6) * (g.cw + g.gap) + g.cw / 2, y: g.oy + Math.floor(i / 6) * (g.ch + g.gap) + g.ch / 2 } });
  await page.click('#assign'); await page.locator('#as li').first().waitFor(); return '';
}
async function discount(page, sku, d) {
  await page.goto(page.base + '/pricing');
  const tr = page.locator(`tr[data-sku="${sku}"]`);
  await tr.hover(); await tr.locator('.setd').click();
  const b = await page.locator('#track').boundingBox();
  await page.mouse.move(b.x + d * 8, b.y + 5); await page.mouse.down(); await page.mouse.up();
  await page.click('#apply'); await page.locator('#panel').waitFor({ state: 'hidden' }); return '';
}
async function refunds(page, expected) {
  for (const pg of [1, 2, 3]) {
    await page.goto(page.base + '/refunds?page=' + pg);
    for (const id of await page.locator('tbody tr').evaluateAll((trs) => trs.map((t) => t.dataset.id))) {
      if (expected[id] === 'Pending') continue;
      const tr = page.locator(`tr[data-id="${id}"]`);
      await tr.locator(expected[id] === 'Approved' ? '.ap' : '.rj').click(); await tr.locator('.ac:empty').waitFor({ state: 'attached' });
    }
  }
  return '';
}
async function keyCopy(page, f) {
  await page.goto(page.base + '/integrations'); await page.click('#gen');
  await page.locator('#toast').waitFor({ state: 'visible' });
  const key = (await page.locator('#toast').innerText()).split(': ')[1].trim();
  await page.goto(page.base + '/webhooks'); await page.fill('#secret', f(key)); await page.click('#save');
  await page.waitForFunction(() => document.getElementById('done').textContent !== ''); return '';
}
async function plan(page, target, seats, s) {
  await page.goto(page.base + '/billing');
  const box = await page.locator('iframe').boundingBox();
  await page.waitForTimeout(300);
  await page.mouse.click(box.x + 300, box.y + 250); // empty area inside the frame, to focus its document
  await page.keyboard.press('Tab'); // the checked radio
  const delta = s.billing.order.indexOf(target) - s.billing.order.indexOf('Monthly');
  for (let i = 0; i < Math.abs(delta); i++) await page.keyboard.press(delta > 0 ? 'ArrowRight' : 'ArrowLeft');
  await page.keyboard.press('Tab'); await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.type(String(seats));
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await page.waitForTimeout(500); return '';
}

export function prepare(task, app, seed, ctx) {
  const state = app.reset(seed);
  const params = task.setup(state, rng(seed * 7919 + 13), ctx);
  state.log = { requests: 0, directApi: 0, logins: 0 };
  return { state, params, instruction: task.instruction(params) };
}
export { STAGES };
