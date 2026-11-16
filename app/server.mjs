// "Backoffice": the local target app. One process, in-memory state, rebuilt from a seed on every reset.
// No dependencies. The harness runs it in-process and reads `app.state` directly for scoring;
// there is no admin endpoint an agent could call.
import http from 'node:http';
import crypto from 'node:crypto';

export const LOGIN = { email: 'ops@lab.test', password: 'lab-ops-pass' }; // seeded test login, local app only
export const TODAY = '2026-11-16'; // the app's fixed "today", so calendars are deterministic

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, xs) => xs[Math.floor(r() * xs.length)];
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const shuffle = (r, xs) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const CUSTOMERS = ['Berg & Co AB', 'Berg & Co', 'Nordlys Trading AB', 'Nordlys AB', 'Lind Bygg & Son', 'Lind Bygg', 'Aurora Foods', 'Fjord Marine', 'Kvarn Bageri', 'Stenmark Logistik', 'Havsvind Energi', 'Tallbacken Trä', 'Ekdahl Optik', 'Solsidan Hotell', 'Vinterviken Café', 'Granit Maskin', 'Polar Frys', 'Mälar Tryck', 'Skog & Sjö', 'Björk Design', 'Älvdal Glas', 'Östersjö Rederi', 'Humlegården Bok', 'Kopparberg Verkstad', 'Sandvik Cykel'];
const CITIES = ['Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Umeå', 'Lund'];
const STATUSES = ['New', 'Processing', 'On hold', 'Shipped', 'Cancelled'];
const PRODUCT_WORDS = ['Bracket', 'Gasket', 'Valve', 'Hinge', 'Bearing', 'Coupling', 'Sensor', 'Relay', 'Filter', 'Clamp', 'Nozzle', 'Spindle'];
const PRODUCT_ADJ = ['Steel', 'Brass', 'Nylon', 'Compact', 'Heavy', 'Marine', 'Thermal', 'Micro'];
export const CARRIERS = ['PostNord Parcel', 'PostNord Pallet', 'DHL Freight', 'DHL Express', 'Schenker', 'Bring', 'Budbee', 'Best Transport'];
export const STAGES = ['Intake', 'Credit check', 'Picking', 'Packing', 'Quality check', 'Shipping', 'Invoicing'];
const EMPLOYEES = ['Anna Lindqvist', 'Erik Holm', 'Sara Nyberg', 'Johan Ek', 'Maria Sund', 'Oskar Dahl', 'Elin Fors', 'Nils Varg', 'Karin Lund', 'Per Åberg', 'Lena Strid', 'Tomas Rask'];
const EXPENSE_DESC = ['Train to Göteborg', 'Client dinner', 'Conference fee', 'Taxi', 'Hotel, 2 nights', 'Office supplies', 'Software licence', 'Parking'];
export const COUNTRIES = ['Sweden', 'Norway', 'Denmark', 'Finland', 'Germany', 'Netherlands'];
export const DOC_TYPES = ['Invoice', 'Contract', 'Certificate', 'Other'];
export const REFUND_REASONS = ['Damaged item', 'Wrong item', 'Late delivery', 'Changed mind'];
export const PLANS = ['Monthly', 'Annual', 'Enterprise'];
export const EXPENSE_LABELS = [['Approve', 'Reject'], ['Sign off', 'Decline'], ['Accept', 'Deny']];

export function buildState(seed) {
  const r = rng(seed);
  const customers = CUSTOMERS.map((name, i) => ({ id: `c${i + 1}`, name, city: pick(r, CITIES), archived: false }));
  const orders = [];
  const used = new Set();
  for (let i = 0; i < 137; i++) {
    let id; do { id = `SO-${int(r, 1000, 9999)}`; } while (used.has(id)); used.add(id);
    orders.push({ id, customer: pick(r, CUSTOMERS), status: pick(r, STATUSES), amount: int(r, 500, 60000), date: `2026-${String(int(r, 1, 10)).padStart(2, '0')}-${String(int(r, 1, 28)).padStart(2, '0')}`, flagged: false });
  }
  const products = [];
  for (let i = 0; i < 60; i++) products.push({ sku: `P-${1001 + i * 7 + int(r, 0, 5)}`, name: `${pick(r, PRODUCT_ADJ)} ${pick(r, PRODUCT_WORDS)} ${int(r, 10, 99)}`, price: int(r, 20, 900), stock: int(r, 0, 400) });
  const suppliers = ['Nordic Fasteners AB', 'Baltic Polymers', 'Hansa Tooling GmbH', 'Kattegat Supply'].map((name, i) => ({ id: `s${i + 1}`, name, orgno: `55${int(r, 1000, 9999)}-${int(r, 1000, 9999)}`, email: `orders@supplier${i + 1}.test`, street: 'Storgatan 1', postal: '111 22', city: pick(r, CITIES), country: 'Sweden', terms: 30 }));
  const variant = seed % 6;
  const expenses = shuffle(r, EMPLOYEES).map((employee, i) => ({ id: `e${i + 1}`, employee, description: pick(r, EXPENSE_DESC), amount: int(r, 120, 9800), status: 'Pending' }));
  const cls = () => 'k' + Math.floor(r() * 1e9).toString(36);
  const st = {
    seed, variant, customers, orders, products, suppliers, expenses,
    dashboard: { open: int(r, 10000, 99000), overdue: int(r, 10000, 99000), paid: int(r, 10000, 99000), drafts: int(r, 10000, 99000) },
    bookings: [], documents: [], archiveRefs: {},
    settings: { threshold: 100, digest: false },
    pipeline: shuffle(r, STAGES),
    expenseUi: { cards: variant % 2 === 1, labels: EXPENSE_LABELS[variant % 3], icons: variant >= 3, swapped: variant % 4 >= 2, cls: { row: cls(), a: cls(), b: cls(), wrap: cls() }, keys: { approve: cls(), reject: cls() } },
    log: { requests: 0, directApi: 0, logins: 0 },
  };
  // ---- hard tier (appended so the base tier's seeded data is unchanged) ----
  const bays = [];
  for (const row of 'ABCDE') for (let c = 1; c <= 6; c++) bays.push({ id: `${row}-0${c}`, occupied: r() < 0.35 });
  st.warehouse = { geo: { ox: int(r, 20, 50), oy: int(r, 24, 44), cw: int(r, 92, 106), ch: int(r, 56, 64), gap: int(r, 6, 12) }, bays, pallets: [0, 1, 2].map(() => `PAL-${int(r, 1000, 9999)}`), assignments: {} };
  st.discounts = {};
  const blocked = shuffle(r, CUSTOMERS).slice(0, 4);
  st.blocked = blocked;
  st.refunds = Array.from({ length: 24 }, (_, i) => ({ id: `RF-${int(r, 100, 999)}${i}`, customer: pick(r, CUSTOMERS), reason: pick(r, REFUND_REASONS), amount: int(r, 80, 1500), status: 'Pending' }));
  st.keys = { last: null, count: 0 };
  st.webhookSecret = '';
  st.billing = { plan: 'Monthly', seats: 5, confirmed: false, order: shuffle(r, PLANS) };
  return st;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (n) => 'SEK ' + n.toLocaleString('en-US');

const CSS = `body{font:15px/1.4 system-ui,sans-serif;margin:0;color:#1c2330;background:#f5f6f8}
nav{background:#1c2330;padding:10px 16px;display:flex;gap:14px;flex-wrap:wrap}nav a{color:#cfd6e4;text-decoration:none;font-size:14px}nav b{color:#fff;margin-right:8px}
main{padding:20px 24px;max-width:1100px}h1{font-size:22px;margin:0 0 14px}
table{border-collapse:collapse;background:#fff;width:100%}th,td{border:1px solid #dde1e8;padding:6px 10px;text-align:left;font-size:14px}th{background:#eef0f4}
input,select{font:inherit;padding:5px 7px;border:1px solid #b6bcc8;border-radius:4px}
button,.btn{font:inherit;padding:6px 12px;border:1px solid #3559c7;background:#3f66e0;color:#fff;border-radius:4px;cursor:pointer}button:disabled{background:#aab3c8;border-color:#aab3c8;cursor:not-allowed}
button.sec{background:#fff;color:#1c2330;border-color:#b6bcc8}.err{color:#b3261e;font-size:13px}.row{margin:10px 0}.row label{display:inline-block;min-width:150px}
.card{background:#fff;border:1px solid #dde1e8;border-radius:6px;padding:14px;display:inline-block;margin:0 12px 12px 0;min-width:200px}.card .v{font-size:22px;font-weight:600}
.ok{color:#18794e}`;

function layout(title, body, script = '') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)} · Backoffice</title><style>${CSS}</style></head><body>
<nav><b>Backoffice</b><a href="/dashboard">Dashboard</a><a href="/suppliers">Suppliers</a><a href="/orders">Orders</a><a href="/products">Products</a><a href="/deliveries/new">Deliveries</a><a href="/documents">Documents</a><a href="/customers">Customers</a><a href="/pipeline">Pipeline</a><a href="/expenses">Expenses</a><a href="/settings">Settings</a><a href="/warehouse">Warehouse</a><a href="/pricing">Pricing</a><a href="/refunds">Refunds</a><a href="/integrations">Integrations</a><a href="/webhooks">Webhooks</a><a href="/billing">Billing</a></nav>
<main><h1>${esc(title)}</h1>${body}</main>
<script>async function api(path, body){const r=await fetch(path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json','x-ui':'1'},body:body===undefined?undefined:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j}
${script}</script></body></html>`;
}

// ---------- pages ----------
const pages = {
  '/dashboard': () => layout('Dashboard', `<div id="cards"><p>Loading figures…</p></div>`,
    `setTimeout(async()=>{const d=await api('/api/dashboard');const f=n=>'SEK '+n.toLocaleString('en-US');
document.getElementById('cards').innerHTML=[['Paid this month',d.paid],['Overdue invoices total',d.overdue],['Open invoices total',d.open],['Draft invoices total',d.drafts]].map(([k,v])=>'<div class="card"><div>'+k+'</div><div class="v">'+f(v)+'</div></div>').join('')},1200)`),

  '/suppliers': (s) => layout('Suppliers', `<p><a class="btn" href="/suppliers/new">New supplier</a></p><table><tr><th>Name</th><th>Org. number</th><th>Email</th><th>City</th><th>Country</th><th>Terms</th></tr>${s.suppliers.map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.orgno)}</td><td>${esc(x.email)}</td><td>${esc(x.city)}</td><td>${esc(x.country)}</td><td>${x.terms} days</td></tr>`).join('')}</table>`),

  '/suppliers/new': () => layout('New supplier', `
<p id="stepno">Step 1 of 3</p>
<div id="s1"><div class="row"><label for="name">Company name</label><input id="name"></div>
<div class="row"><label for="orgno">Org. number</label><input id="orgno" placeholder="NNNNNN-NNNN"></div>
<div class="row"><label for="email">Contact email</label><input id="email"></div></div>
<div id="s2" hidden><div class="row"><label for="street">Street address</label><input id="street"></div>
<div class="row"><label for="postal">Postal code</label><input id="postal" placeholder="NNN NN"></div>
<div class="row"><label for="city">City</label><input id="city"></div>
<div class="row"><label for="country">Country</label><select id="country"><option value="">Choose…</option>${COUNTRIES.map((c) => `<option>${c}</option>`).join('')}</select></div>
<div class="row"><label>Payment terms</label>${[15, 30, 60].map((t) => `<label style="min-width:0;margin-right:12px"><input type="radio" name="terms" value="${t}"> ${t} days</label>`).join('')}</div></div>
<div id="s3" hidden><div id="review"></div><div class="row"><label style="min-width:0"><input type="checkbox" id="confirm"> I confirm the details are correct</label></div></div>
<p class="err" id="err"></p>
<p><button class="sec" id="back" hidden>Back</button> <button id="next">Next</button> <button id="submit" hidden>Create supplier</button></p>`,
    `let step=1;const $=id=>document.getElementById(id);const v=id=>$(id).value.trim();
function data(){const t=document.querySelector('input[name=terms]:checked');return{name:v('name'),orgno:v('orgno'),email:v('email'),street:v('street'),postal:v('postal'),city:v('city'),country:v('country'),terms:t?+t.value:null}}
function validate(){const d=data();if(step===1){if(!d.name)return'Company name is required.';if(!/^\\d{6}-\\d{4}$/.test(d.orgno))return'Org. number must have the format NNNNNN-NNNN (six digits, a hyphen, four digits).';if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(d.email))return'Enter a valid email address.'}
if(step===2){if(!d.street)return'Street address is required.';if(!/^\\d{3} \\d{2}$/.test(d.postal))return'Postal code must have the format NNN NN (with a space).';if(!d.city)return'City is required.';if(!d.country)return'Choose a country.';if(!d.terms)return'Choose payment terms.'}return''}
function show(){for(const i of[1,2,3])$('s'+i).hidden=i!==step;$('stepno').textContent='Step '+step+' of 3';$('back').hidden=step===1;$('next').hidden=step===3;$('submit').hidden=step!==3;
if(step===3){const d=data();$('review').innerHTML='<table>'+Object.entries(d).map(([k,x])=>'<tr><th>'+k+'</th><td>'+String(x).replace(/</g,'&lt;')+'</td></tr>').join('')+'</table>'}}
$('next').onclick=()=>{const e=validate();$('err').textContent=e;if(!e){step++;show()}};$('back').onclick=()=>{$('err').textContent='';step--;show()};
$('submit').onclick=async()=>{if(!$('confirm').checked){$('err').textContent='Please confirm the details first.';return}try{await api('/api/suppliers',data());location.href='/suppliers'}catch(e){$('err').textContent=e.message}}`),

  '/orders': () => layout('Orders', `
<p><label for="q">Customer</label> <input id="q" placeholder="Search customer…"> <label for="status">Status</label> <select id="status"><option value="">All</option>${STATUSES.map((x) => `<option>${x}</option>`).join('')}</select></p>
<table><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th><a href="#" id="sortamt">Amount ↕</a></th><th>Date</th><th>Flag</th></tr></thead><tbody id="rows"><tr><td colspan="6">Loading…</td></tr></tbody></table>
<p><button class="sec" id="prev">Previous</button> <span id="pageinfo"></span> <button class="sec" id="nextp">Next</button></p>`,
    `let page=1,sort='',t;const $=id=>document.getElementById(id);
async function load(){$('rows').innerHTML='<tr><td colspan="6">Loading…</td></tr>';const d=await api('/api/orders?q='+encodeURIComponent($('q').value)+'&status='+encodeURIComponent($('status').value)+'&sort='+sort+'&page='+page);
$('rows').innerHTML=d.rows.map(o=>'<tr><td><a href="/orders/'+o.id+'">'+o.id+'</a></td><td>'+o.customer.replace(/&/g,'&amp;')+'</td><td>'+o.status+'</td><td>SEK '+o.amount.toLocaleString('en-US')+'</td><td>'+o.date+'</td><td>'+(o.flagged?'⚑ Flagged':'')+'</td></tr>').join('')||'<tr><td colspan="6">No orders match.</td></tr>';
$('pageinfo').textContent='Page '+d.page+' of '+d.pages+' ('+d.total+' orders)';$('prev').disabled=d.page<=1;$('nextp').disabled=d.page>=d.pages}
$('q').oninput=()=>{clearTimeout(t);t=setTimeout(()=>{page=1;load()},300)};$('status').onchange=()=>{page=1;load()};
$('sortamt').onclick=e=>{e.preventDefault();sort=sort==='desc'?'asc':'desc';$('sortamt').textContent='Amount '+(sort==='desc'?'↓':'↑');page=1;load()};
$('prev').onclick=()=>{page--;load()};$('nextp').onclick=()=>{page++;load()};load()`),

  '/products': (s) => layout('Products', `<table><thead><tr><th>SKU</th><th>Name</th><th>Price (SEK)</th><th>Stock</th><th></th></tr></thead><tbody>${s.products.map((p) => `<tr data-sku="${p.sku}"><td>${p.sku}</td><td>${esc(p.name)}</td><td class="price">${p.price}</td><td class="stock">${p.stock}</td><td><button class="sec edit">Edit</button></td></tr>`).join('')}</tbody></table>`,
    `document.querySelector('tbody').addEventListener('click',async e=>{const tr=e.target.closest('tr');if(!tr)return;const pc=tr.querySelector('.price'),sc=tr.querySelector('.stock'),ac=tr.lastElementChild;
if(e.target.classList.contains('edit')){tr.dataset.p=pc.textContent;tr.dataset.s=sc.textContent;pc.innerHTML='<input type="number" aria-label="Price" value="'+tr.dataset.p+'" style="width:90px">';sc.innerHTML='<input type="number" aria-label="Stock" value="'+tr.dataset.s+'" style="width:90px">';ac.innerHTML='<button class="save">Save</button> <button class="sec cancel">Cancel</button>'}
else if(e.target.classList.contains('cancel')){pc.textContent=tr.dataset.p;sc.textContent=tr.dataset.s;ac.innerHTML='<button class="sec edit">Edit</button>'}
else if(e.target.classList.contains('save')){const price=+pc.querySelector('input').value,stock=+sc.querySelector('input').value;try{await api('/api/products/'+tr.dataset.sku,{price,stock});pc.textContent=price;sc.textContent=stock;ac.innerHTML='<button class="sec edit">Edit</button> <span class="ok">Saved</span>'}catch(err){alert(err.message)}}})`),

  '/deliveries/new': (s) => layout('Book a delivery', `
<style>.cal{background:#fff;border:1px solid #dde1e8;display:inline-block;padding:10px;border-radius:6px}.cal .hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.cal .g{display:grid;grid-template-columns:repeat(7,36px);gap:3px}.cal .g span{font-size:12px;text-align:center;color:#667}.cal .g button{padding:6px 0;background:#fff;color:#1c2330;border-color:#dde1e8}.cal .g button.sel{background:#3f66e0;color:#fff}.cal .g button:disabled{background:#f0f1f4;color:#aab}
.dd{position:relative;display:inline-block}.dd-btn{background:#fff;border:1px solid #b6bcc8;border-radius:4px;padding:5px 10px;min-width:180px;cursor:pointer}.dd-list{position:absolute;z-index:5;background:#fff;border:1px solid #b6bcc8;min-width:200px;box-shadow:0 4px 12px #0002}.dd-item{padding:6px 10px;cursor:pointer}.dd-item:hover{background:#eef0f4}</style>
<div class="row"><label for="ref">Order reference</label><input id="ref"></div>
<div class="row"><label>Delivery date</label><div class="cal"><div class="hd"><button class="sec" id="pm" aria-label="Previous month">‹</button><b id="ml"></b><button class="sec" id="nm" aria-label="Next month">›</button></div><div class="g" id="grid"></div></div> <span id="picked">No date selected</span></div>
<div class="row"><label>Carrier</label><div class="dd"><div class="dd-btn" id="ddb">Select carrier ▾</div><div class="dd-list" id="ddl" hidden>${CARRIERS.map((c) => `<div class="dd-item">${c}</div>`).join('')}</div></div></div>
<div class="row"><label>Time window</label>${['Morning', 'Afternoon', 'Evening'].map((t) => `<label style="min-width:0;margin-right:12px"><input type="radio" name="win" value="${t}"> ${t}</label>`).join('')}</div>
<p class="err" id="err"></p><p><button id="book">Book delivery</button></p><p class="ok" id="done"></p>
<h3>Booked deliveries</h3><ul id="list">${s.bookings.map((b) => `<li>${esc(b.ref)} · ${b.date} · ${esc(b.carrier)} · ${b.window}</li>`).join('')}</ul>`,
    `const TODAY='${TODAY}';let y=+TODAY.slice(0,4),m=+TODAY.slice(5,7)-1,date='',carrier='';const $=id=>document.getElementById(id);const MN=['January','February','March','April','May','June','July','August','September','October','November','December'];
function draw(){$('ml').textContent=MN[m]+' '+y;const first=(new Date(Date.UTC(y,m,1)).getUTCDay()+6)%7,n=new Date(Date.UTC(y,m+1,0)).getUTCDate();let h=['Mo','Tu','We','Th','Fr','Sa','Su'].map(d=>'<span>'+d+'</span>').join('');for(let i=0;i<first;i++)h+='<span></span>';
for(let d=1;d<=n;d++){const iso=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'),wd=(first+d-1)%7;h+='<button '+(wd>=5||iso<=TODAY?'disabled ':'')+(iso===date?'class="sel" ':'')+'data-d="'+iso+'">'+d+'</button>'}$('grid').innerHTML=h}
$('pm').onclick=()=>{if(--m<0){m=11;y--}draw()};$('nm').onclick=()=>{if(++m>11){m=0;y++}draw()};$('grid').onclick=e=>{const d=e.target.dataset.d;if(d&&!e.target.disabled){date=d;$('picked').textContent='Selected: '+d;draw()}};
$('ddb').onclick=()=>{$('ddl').hidden=!$('ddl').hidden};$('ddl').onclick=e=>{if(e.target.classList.contains('dd-item')){carrier=e.target.textContent;$('ddb').textContent=carrier+' ▾';$('ddl').hidden=true}};
$('book').onclick=async()=>{const w=document.querySelector('input[name=win]:checked');const ref=$('ref').value.trim();if(!ref||!date||!carrier||!w){$('err').textContent='Order reference, date, carrier and time window are all required.';return}
try{await api('/api/bookings',{ref,date,carrier,window:w.value});$('err').textContent='';$('done').textContent='Delivery booked for '+date+'.';$('list').insertAdjacentHTML('beforeend','<li>'+ref.replace(/</g,'&lt;')+' · '+date+' · '+carrier+' · '+w.value+'</li>')}catch(e){$('err').textContent=e.message}};draw()`),

  '/documents': (s) => layout('Documents', `
<div class="row"><label for="sup">Supplier</label><select id="sup"><option value="">Choose…</option>${s.suppliers.map((x) => `<option>${esc(x.name)}</option>`).join('')}</select></div>
<div class="row"><label for="type">Document type</label><select id="type"><option value="">Choose…</option>${DOC_TYPES.map((x) => `<option>${x}</option>`).join('')}</select></div>
<div class="row"><label>File</label><label class="btn" for="file" style="min-width:0">Choose file…</label><input type="file" id="file" style="position:absolute;left:-9999px"> <span id="fname">No file chosen</span></div>
<p class="err" id="err"></p><p><button id="up">Upload document</button></p>
<h3>Uploaded documents</h3><table><thead><tr><th>File</th><th>Supplier</th><th>Type</th><th>Size</th></tr></thead><tbody id="docs">${s.documents.map((d) => `<tr><td>${esc(d.filename)}</td><td>${esc(d.supplier)}</td><td>${d.type}</td><td>${d.size} bytes</td></tr>`).join('')}</tbody></table>`,
    `const $=id=>document.getElementById(id);$('file').onchange=()=>{$('fname').textContent=$('file').files[0]?$('file').files[0].name:'No file chosen'};
$('up').onclick=async()=>{const f=$('file').files[0];if(!$('sup').value||!$('type').value||!f){$('err').textContent='Supplier, document type and a file are required.';return}
const buf=new Uint8Array(await f.arrayBuffer());let bin='';for(const b of buf)bin+=String.fromCharCode(b);
try{const d=await api('/api/documents',{supplier:$('sup').value,type:$('type').value,filename:f.name,data:btoa(bin)});$('err').textContent='';$('docs').insertAdjacentHTML('beforeend','<tr><td>'+d.filename+'</td><td>'+d.supplier.replace(/&/g,'&amp;')+'</td><td>'+d.type+'</td><td>'+d.size+' bytes</td></tr>')}catch(e){$('err').textContent=e.message}}`),

  '/customers': (s) => layout('Customers', `
<style>#ov{position:fixed;inset:0;background:#0006;display:flex;align-items:center;justify-content:center}#ov[hidden]{display:none}#modal{background:#fff;padding:20px;border-radius:8px;width:420px}
#toast{position:fixed;right:20px;bottom:20px;background:#1c2330;color:#fff;padding:12px 16px;border-radius:6px}#toast[hidden]{display:none}#toast button{background:none;border:none;color:#fff;margin-left:10px}</style>
<table><thead><tr><th>Customer</th><th>City</th><th></th></tr></thead><tbody>${s.customers.filter((c) => !c.archived).map((c) => `<tr data-id="${c.id}"><td class="n">${esc(c.name)}</td><td>${c.city}</td><td><button class="sec arch">Archive</button></td></tr>`).join('')}</tbody></table>
<div id="ov" hidden><div id="modal"><h3 style="margin-top:0">Archive customer</h3><p>This removes the customer from active lists. To confirm, type the customer name exactly:</p><p><b id="mname"></b></p><p><input id="mconf" style="width:95%" aria-label="Customer name"></p><p><button class="sec" id="mcancel">Cancel</button> <button id="mok" disabled>Archive customer</button></p></div></div>
<div id="toast" hidden><span id="tmsg"></span><button id="tx" aria-label="Dismiss">×</button></div>`,
    `const $=id=>document.getElementById(id);let cur=null;
document.querySelector('tbody').onclick=e=>{if(!e.target.classList.contains('arch'))return;cur=e.target.closest('tr');$('mname').textContent=cur.querySelector('.n').textContent;$('mconf').value='';$('mok').disabled=true;$('ov').hidden=false};
$('mconf').oninput=()=>{$('mok').disabled=$('mconf').value!==$('mname').textContent};$('mcancel').onclick=()=>{$('ov').hidden=true};
$('mok').onclick=async()=>{const d=await api('/api/customers/'+cur.dataset.id+'/archive',{});$('ov').hidden=true;cur.remove();setTimeout(()=>{$('tmsg').textContent='Customer archived. Reference: '+d.ref;$('toast').hidden=false},3000)};$('tx').onclick=()=>{$('toast').hidden=true}`),

  '/settings': () => layout('Settings', `<p>General settings are managed by your administrator.</p><h3>Notifications</h3><iframe src="/widgets/notifications" title="Notification settings" style="width:520px;height:260px;border:1px solid #dde1e8;background:#fff"></iframe>`),

  '/pipeline': (s) => layout('Fulfilment pipeline', `
<style>#pl{list-style:none;padding:0;width:360px;user-select:none}#pl li{background:#fff;border:1px solid #dde1e8;border-radius:4px;padding:10px 12px;margin:4px 0;display:flex;gap:10px;align-items:center}#pl li.drag{background:#e6ecff;border-color:#3f66e0}#pl .h{cursor:grab;color:#889;font-size:18px}</style>
<p>Drag a stage by its handle to change the order, then save.</p><ul id="pl">${s.pipeline.map((x) => `<li><span class="h" title="Drag to reorder">⠿</span><span class="nm">${x}</span></li>`).join('')}</ul>
<p><button id="save">Save order</button> <span class="ok" id="done"></span></p>`,
    `const pl=document.getElementById('pl');let d=null;
pl.addEventListener('mousedown',e=>{if(e.target.classList.contains('h')){d=e.target.closest('li');d.classList.add('drag');e.preventDefault()}});
document.addEventListener('mousemove',e=>{if(!d)return;document.getElementById('done').textContent='';const others=[...pl.children].filter(x=>x!==d);let before=null;for(const o of others){const b=o.getBoundingClientRect();if(e.clientY<b.top+b.height/2){before=o;break}}pl.insertBefore(d,before)});
document.addEventListener('mouseup',()=>{if(d){d.classList.remove('drag');d=null}});
document.getElementById('save').onclick=async()=>{await api('/api/pipeline',{order:[...pl.querySelectorAll('.nm')].map(x=>x.textContent)});document.getElementById('done').textContent='Order saved'}`),


  '/warehouse': (s) => layout('Warehouse', `
<p><label for="pal">Pallet to place</label> <select id="pal">${s.warehouse.pallets.filter((p) => !s.warehouse.assignments[p]).map((p) => `<option>${p}</option>`).join('')}</select></p>
<canvas id="cv" width="760" height="420" style="background:#fff;border:1px solid #dde1e8"></canvas>
<p>Selected bay: <b id="sel">none</b> &nbsp; <button id="assign">Assign pallet</button> <span class="ok" id="done"></span><span class="err" id="err"></span></p>
<h3>Assignments</h3><ul id="as">${Object.entries(s.warehouse.assignments).map(([p, b]) => `<li>${p} → ${b}</li>`).join('')}</ul>`,
    `const G=${JSON.stringify(s.warehouse.geo)},B=${JSON.stringify(s.warehouse.bays)};let sel=null;const cv=document.getElementById('cv'),c=cv.getContext('2d');
const box=i=>({x:G.ox+(i%6)*(G.cw+G.gap),y:G.oy+Math.floor(i/6)*(G.ch+G.gap)});
function draw(){c.clearRect(0,0,760,420);c.font='15px system-ui';c.textAlign='center';c.textBaseline='middle';B.forEach((b,i)=>{const p=box(i);c.fillStyle=b.occupied?'#d5d8de':(sel===b.id?'#cfdcff':'#ffffff');c.fillRect(p.x,p.y,G.cw,G.ch);c.lineWidth=sel===b.id?3:1;c.strokeStyle=sel===b.id?'#3f66e0':'#8a93a6';c.strokeRect(p.x,p.y,G.cw,G.ch);c.fillStyle=b.occupied?'#7a8194':'#1c2330';c.fillText(b.id,p.x+G.cw/2,p.y+G.ch/2-(b.occupied?8:0));if(b.occupied){c.font='11px system-ui';c.fillText('occupied',p.x+G.cw/2,p.y+G.ch/2+12);c.font='15px system-ui'}})}
cv.addEventListener('click',e=>{const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;B.forEach((b,i)=>{const p=box(i);if(x>=p.x&&x<=p.x+G.cw&&y>=p.y&&y<=p.y+G.ch&&!b.occupied){sel=b.id;document.getElementById('sel').textContent=sel}});draw()});
document.getElementById('assign').onclick=async()=>{const err=document.getElementById('err');err.textContent='';if(!sel){err.textContent=' Select a free bay on the map first.';return}const pal=document.getElementById('pal').value;try{await api('/api/warehouse',{pallet:pal,bay:sel});location.reload()}catch(e){err.textContent=' '+e.message}};draw()`),

  '/pricing': (s) => layout('Pricing', `
<style>#pt .setd{visibility:hidden}#pt tr:hover .setd{visibility:visible}#track{position:relative;width:480px;height:10px;background:#d5d8de;border-radius:5px;margin:18px 0;cursor:pointer}#thumb{position:absolute;top:-7px;width:16px;height:24px;margin-left:-8px;background:#3f66e0;border-radius:4px}</style>
<p>Hover a product row to change its discount.</p>
<table id="pt"><thead><tr><th>SKU</th><th>Name</th><th>Price (SEK)</th><th>Discount</th><th></th></tr></thead><tbody>${s.products.slice(0, 8).map((p) => `<tr data-sku="${p.sku}"><td>${p.sku}</td><td>${esc(p.name)}</td><td>${p.price}</td><td class="d">${s.discounts[p.sku] || 0}%</td><td><a href="#" class="setd">Set discount</a></td></tr>`).join('')}</tbody></table>
<div id="panel" hidden style="background:#fff;border:1px solid #dde1e8;padding:14px;margin-top:14px;width:520px"><div>Discount for <b id="psku"></b>: <b id="val">0%</b></div><div id="track"><div id="thumb" style="left:0px"></div></div><div style="display:flex;justify-content:space-between;width:480px;font-size:12px;color:#667"><span>0%</span><span>60%</span></div><p><button id="apply">Apply discount</button> <button class="sec" id="cancel">Cancel</button></p></div>`,
    `const $=id=>document.getElementById(id);let sku=null,v=0,drag=false;
function setFrom(x){const r=$('track').getBoundingClientRect();v=Math.round(Math.max(0,Math.min(1,(x-r.left)/480))*60);$('thumb').style.left=(v*8)+'px';$('val').textContent=v+'%'}
$('pt').addEventListener('click',e=>{if(!e.target.classList.contains('setd'))return;e.preventDefault();const tr=e.target.closest('tr');sku=tr.dataset.sku;$('psku').textContent=sku;v=parseInt(tr.querySelector('.d').textContent);$('thumb').style.left=(v*8)+'px';$('val').textContent=v+'%';$('panel').hidden=false});
$('track').addEventListener('mousedown',e=>{drag=true;setFrom(e.clientX);e.preventDefault()});document.addEventListener('mousemove',e=>{if(drag)setFrom(e.clientX)});document.addEventListener('mouseup',()=>{drag=false});
$('cancel').onclick=()=>{$('panel').hidden=true};$('apply').onclick=async()=>{await api('/api/discounts/'+sku,{discount:v});document.querySelector('tr[data-sku="'+sku+'"] .d').textContent=v+'%';$('panel').hidden=true}`),

  '/integrations': () => layout('Integrations', `
<style>#toast{position:fixed;right:20px;bottom:20px;background:#1c2330;color:#fff;padding:12px 16px;border-radius:6px;font-family:ui-monospace,Menlo,monospace}#toast[hidden]{display:none}</style>
<p>Signing keys authenticate outgoing webhooks. A new key replaces the previous one and is shown only once, briefly.</p>
<p><button id="gen">Generate new signing key</button></p><p>Enter the key as the signing secret on the <a href="/webhooks">Webhooks</a> page.</p><div id="toast" hidden></div>`,
    `document.getElementById('gen').onclick=async()=>{const d=await api('/api/keys',{});const t=document.getElementById('toast');t.textContent='New signing key (shown once): '+d.key;t.hidden=false;setTimeout(()=>{t.hidden=true;t.textContent=''},6000)}`),

  '/webhooks': (s) => layout('Webhooks', `<div class="row"><label for="url">Endpoint URL</label><input id="url" value="https://hooks.lab.test/orders" style="width:320px" disabled></div><div class="row"><label for="secret">Signing secret</label><input id="secret" style="width:320px" value="${esc(s.webhookSecret)}"></div><p><button id="save">Save webhook</button> <span class="ok" id="done"></span></p>`,
    `document.getElementById('save').onclick=async()=>{await api('/api/webhook',{secret:document.getElementById('secret').value.trim()});document.getElementById('done').textContent='Webhook saved'}`),

  '/billing': () => layout('Billing', `<p>Your subscription is managed in the secure billing panel below.</p><iframe src="/widgets/plan" title="Billing panel" style="width:520px;height:300px;border:1px solid #dde1e8;background:#fff"></iframe>`),
  '/expenses': (s) => {
    const u = s.expenseUi, c = u.cls;
    const svg = { approve: '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 8.5l4 4 8-9" fill="none" stroke="#18794e" stroke-width="2.4"/></svg>', reject: '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 3l10 10M13 3L3 13" fill="none" stroke="#b3261e" stroke-width="2.4"/></svg>' };
    const btn = (kind) => u.icons ? `<span class="${c.a}" data-k="${u.keys[kind]}">${svg[kind]}</span>` : `<button class="sec ${c.b}" data-k="${u.keys[kind]}">${u.labels[kind === 'approve' ? 0 : 1]}</button>`;
    const acts = (e) => e.status === 'Pending' ? (u.swapped ? btn('reject') + ' ' + btn('approve') : btn('approve') + ' ' + btn('reject')) : '';
    const body = u.cards
      ? `<div class="${c.wrap}">${s.expenses.map((e) => `<div class="card ${c.row}" data-id="${e.id}"><div><b>${esc(e.employee)}</b></div><div>${esc(e.description)}</div><div>${money(e.amount)}</div><div class="st">${e.status}</div><div class="ac">${acts(e)}</div></div>`).join('')}</div>`
      : `<table class="${c.wrap}"><thead><tr><th>Status</th><th>Amount</th><th>Action</th><th>Description</th><th>Submitted by</th></tr></thead><tbody>${s.expenses.map((e) => `<tr class="${c.row}" data-id="${e.id}"><td class="st">${e.status}</td><td>${money(e.amount)}</td><td class="ac">${acts(e)}</td><td>${esc(e.description)}</td><td>${esc(e.employee)}</td></tr>`).join('')}</tbody></table>`;
    return layout('Expense reports', `<style>.${c.a}{display:inline-block;padding:5px 7px;border:1px solid #b6bcc8;border-radius:4px;cursor:pointer;background:#fff;line-height:0}</style>${body}`,
      `const K=${JSON.stringify({ [u.keys.approve]: 'approve', [u.keys.reject]: 'reject' })};document.querySelector('.${c.wrap}').addEventListener('click',async e=>{const b=e.target.closest('[data-k]');if(!b)return;const row=b.closest('[data-id]');const d=await api('/api/expenses/'+row.dataset.id,{action:K[b.dataset.k]});row.querySelector('.st').textContent=d.status;row.querySelector('.ac').innerHTML=''})`);
  },
};

const widgetPage = (s) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Notifications widget</title></head><body style="margin:12px;font:15px system-ui">
<notify-settings></notify-settings>
<script>class NS extends HTMLElement{connectedCallback(){const r=this.attachShadow({mode:'open'});let on=${s.settings.digest};
r.innerHTML='<style>div{margin:10px 0}input{font:inherit;padding:5px;width:90px}button{font:inherit;padding:6px 12px;cursor:pointer}.sw{border-radius:14px;border:1px solid #889;background:#ccd;min-width:54px}.sw.on{background:#3f66e0;color:#fff}</style><div><label>Alert threshold (SEK thousand) <input id="th" type="number" value="${s.settings.threshold}"></label></div><div>Weekly digest <button class="sw" id="sw" role="switch" aria-checked="false">Off</button></div><div><button id="sv">Save notification settings</button> <span id="ok"></span></div>';
const sw=r.getElementById('sw');const paint=()=>{sw.textContent=on?'On':'Off';sw.classList.toggle('on',on);sw.setAttribute('aria-checked',on)};paint();sw.onclick=()=>{on=!on;paint()};
r.getElementById('sv').onclick=async()=>{const res=await fetch('/api/settings',{method:'POST',headers:{'content-type':'application/json','x-ui':'1'},body:JSON.stringify({threshold:+r.getElementById('th').value,digest:on})});r.getElementById('ok').textContent=res.ok?'Saved ✓':'Error'}}}
customElements.define('notify-settings',NS)</script></body></html>`;


const planWidget = (s) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Billing panel</title></head><body style="margin:12px;font:15px system-ui">
<plan-picker></plan-picker>
<script>(()=>{const ORDER=${JSON.stringify(s.billing.order)},CUR=${JSON.stringify(s.billing.plan)},SEATS=${s.billing.seats};
class PP extends HTMLElement{connectedCallback(){const r=this.attachShadow({mode:'closed'});
r.innerHTML='<style>div{margin:10px 0}label{margin-right:16px}input[type=number]{font:inherit;padding:5px;width:80px}button{font:inherit;padding:6px 12px;cursor:pointer}</style><div><b>Plan</b></div><div>'+ORDER.map(p=>'<label><input type="radio" name="plan" value="'+p+'"'+(p===CUR?' checked':'')+'> '+p+'</label>').join('')+'</div><div><label>Seats <input id="seats" type="number" value="'+SEATS+'"></label></div><div><button id="ok">Confirm plan</button> <span id="msg"></span></div>';
r.getElementById('ok').onclick=async()=>{const plan=r.querySelector('input[name=plan]:checked').value;const res=await fetch('/api/billing',{method:'POST',headers:{'content-type':'application/json','x-ui':'1'},body:JSON.stringify({plan,seats:+r.getElementById('seats').value})});r.getElementById('msg').textContent=res.ok?'Plan confirmed ✓':'Error'}}}
customElements.define('plan-picker',PP)})()</script></body></html>`;

const loginPage = (err) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Sign in · Backoffice</title><style>${CSS}</style></head><body><main style="max-width:360px;margin:60px auto"><h1>Sign in to Backoffice</h1>
<form method="post" action="/login"><div class="row"><label for="email">Email</label><input id="email" name="email" type="email"></div><div class="row"><label for="password">Password</label><input id="password" name="password" type="password"></div>${err ? `<p class="err">${err}</p>` : ''}<p><button type="submit">Sign in</button></p></form></main></body></html>`;

// ---------- server ----------
export async function startApp(port = 0) {
  const app = { state: buildState(1), sessions: new Set(), server: null, url: '' };
  app.reset = (seed) => { app.state = buildState(seed); app.sessions.clear(); return app.state; };

  const readBody = (req) => new Promise((res) => { const ch = []; req.on('data', (c) => ch.push(c)); req.on('end', () => res(Buffer.concat(ch).toString('utf8'))); });
  const send = (res, code, body, type = 'text/html; charset=utf-8', extra = {}) => { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', ...extra }); res.end(body); };
  const json = (res, code, obj) => send(res, code, JSON.stringify(obj), 'application/json');

  app.server = http.createServer(async (req, res) => {
    try {
      const s = app.state;
      const u = new URL(req.url, 'http://x');
      const p = u.pathname;
      s.log.requests++;
      const sid = /(?:^|;\s*)sid=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1];
      const authed = sid && app.sessions.has(sid);

      if (p === '/login' && req.method === 'GET') return send(res, 200, loginPage(''));
      if (p === '/login' && req.method === 'POST') {
        const f = new URLSearchParams(await readBody(req));
        if (f.get('email') === LOGIN.email && f.get('password') === LOGIN.password) {
          const id = crypto.randomBytes(12).toString('hex'); app.sessions.add(id); s.log.logins++;
          return send(res, 302, '', 'text/plain', { location: '/dashboard', 'set-cookie': `sid=${id}; Path=/; HttpOnly` });
        }
        return send(res, 401, loginPage('Wrong email or password.'));
      }
      if (p === '/favicon.ico') return send(res, 204, '');
      if (!authed) return p.startsWith('/api/') ? json(res, 401, { error: 'Not signed in' }) : send(res, 302, '', 'text/plain', { location: '/login' });
      if (p === '/') return send(res, 302, '', 'text/plain', { location: '/dashboard' });

      if (p.startsWith('/api/')) {
        const body = req.method === 'POST' ? JSON.parse((await readBody(req)) || '{}') : null;
        if (req.method === 'POST' && req.headers['x-ui'] !== '1') s.log.directApi++; // a mutation that did not come from the page's own script
        let m;
        if (p === '/api/dashboard') return json(res, 200, s.dashboard);
        if (p === '/api/orders') {
          await new Promise((r) => setTimeout(r, 300));
          const q = (u.searchParams.get('q') || '').toLowerCase(), st = u.searchParams.get('status') || '', sort = u.searchParams.get('sort');
          let rows = s.orders.filter((o) => o.customer.toLowerCase().includes(q) && (!st || o.status === st));
          if (sort === 'asc') rows = [...rows].sort((a, b) => a.amount - b.amount);
          if (sort === 'desc') rows = [...rows].sort((a, b) => b.amount - a.amount);
          const pages = Math.max(1, Math.ceil(rows.length / 10)), page = Math.min(pages, Math.max(1, +u.searchParams.get('page') || 1));
          return json(res, 200, { rows: rows.slice((page - 1) * 10, page * 10), page, pages, total: rows.length });
        }
        if ((m = /^\/api\/orders\/([\w-]+)\/flag$/.exec(p))) { const o = s.orders.find((x) => x.id === m[1]); if (!o) return json(res, 404, { error: 'No such order' }); o.flagged = true; return json(res, 200, o); }
        if (p === '/api/suppliers') {
          const b = body;
          if (!b.name || !/^\d{6}-\d{4}$/.test(b.orgno || '') || !/^\d{3} \d{2}$/.test(b.postal || '') || !COUNTRIES.includes(b.country) || ![15, 30, 60].includes(b.terms) || !b.email || !b.street || !b.city) return json(res, 400, { error: 'Validation failed' });
          const sup = { id: `s${s.suppliers.length + 1}`, name: b.name, orgno: b.orgno, email: b.email, street: b.street, postal: b.postal, city: b.city, country: b.country, terms: b.terms };
          s.suppliers.push(sup); return json(res, 200, sup);
        }
        if ((m = /^\/api\/products\/([\w-]+)$/.exec(p))) { const pr = s.products.find((x) => x.sku === m[1]); if (!pr || !Number.isFinite(body.price) || !Number.isFinite(body.stock)) return json(res, 400, { error: 'Invalid product update' }); pr.price = body.price; pr.stock = body.stock; return json(res, 200, pr); }
        if (p === '/api/bookings') { if (!body.ref || !/^\d{4}-\d{2}-\d{2}$/.test(body.date || '') || !CARRIERS.includes(body.carrier) || !body.window) return json(res, 400, { error: 'Invalid booking' }); s.bookings.push({ ref: body.ref, date: body.date, carrier: body.carrier, window: body.window }); return json(res, 200, { ok: true }); }
        if (p === '/api/documents') { const buf = Buffer.from(body.data || '', 'base64'); const d = { supplier: body.supplier, type: body.type, filename: body.filename, size: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') }; s.documents.push(d); return json(res, 200, d); }
        if ((m = /^\/api\/customers\/(\w+)\/archive$/.exec(p))) { const c = s.customers.find((x) => x.id === m[1]); if (!c) return json(res, 404, { error: 'No such customer' }); c.archived = true; const ref = s.archiveRefs[c.id] ||= 'ARC-' + crypto.createHash('sha256').update(`${s.seed}:${c.id}`).digest('hex').slice(0, 6).toUpperCase(); return json(res, 200, { ref }); }
        if (p === '/api/settings') { s.settings = { threshold: body.threshold, digest: !!body.digest }; return json(res, 200, s.settings); }
        if (p === '/api/pipeline') { if (!Array.isArray(body.order) || [...body.order].sort().join() !== [...STAGES].sort().join()) return json(res, 400, { error: 'Invalid order' }); s.pipeline = body.order; s.pipelineSaved = true; return json(res, 200, { ok: true }); }
        if ((m = /^\/api\/expenses\/(\w+)$/.exec(p))) { const e = s.expenses.find((x) => x.id === m[1]); if (!e || !['approve', 'reject'].includes(body.action)) return json(res, 400, { error: 'Invalid action' }); e.status = body.action === 'approve' ? 'Approved' : 'Rejected'; return json(res, 200, e); }
        if (p === '/api/warehouse') { const w = s.warehouse; const bay = w.bays.find((b) => b.id === body.bay); if (!bay || bay.occupied || !w.pallets.includes(body.pallet) || w.assignments[body.pallet]) return json(res, 400, { error: 'Invalid assignment' }); bay.occupied = true; w.assignments[body.pallet] = bay.id; return json(res, 200, { ok: true }); }
        if ((m = /^\/api\/discounts\/([\w-]+)$/.exec(p))) { if (!s.products.slice(0, 8).some((x) => x.sku === m[1]) || !Number.isInteger(body.discount) || body.discount < 0 || body.discount > 60) return json(res, 400, { error: 'Invalid discount' }); s.discounts[m[1]] = body.discount; return json(res, 200, { ok: true }); }
        if ((m = /^\/api\/refunds\/([\w-]+)$/.exec(p))) { const rf = s.refunds.find((x) => x.id === m[1]); if (!rf || !['approve', 'reject'].includes(body.action)) return json(res, 400, { error: 'Invalid action' }); rf.status = body.action === 'approve' ? 'Approved' : 'Rejected'; return json(res, 200, rf); }
        if (p === '/api/keys') { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789OI'; const key = [0, 1, 2, 3].map(() => Array.from(crypto.randomBytes(4), (b) => A[b % A.length]).join('')).join('-'); s.keys = { last: key, count: s.keys.count + 1 }; return json(res, 200, { key }); }
        if (p === '/api/webhook') { s.webhookSecret = String(body.secret || ''); return json(res, 200, { ok: true }); }
        if (p === '/api/billing') { if (!PLANS.includes(body.plan) || !Number.isInteger(body.seats) || body.seats < 1) return json(res, 400, { error: 'Invalid plan' }); s.billing = { ...s.billing, plan: body.plan, seats: body.seats, confirmed: true }; return json(res, 200, { ok: true }); }
        return json(res, 404, { error: 'Not found' });
      }

      let m;
      if (p === '/widgets/plan') return send(res, 200, planWidget(s));
      if (p === '/refunds') {
        const pg = Math.min(3, Math.max(1, +u.searchParams.get('page') || 1));
        const rows = s.refunds.slice((pg - 1) * 8, pg * 8);
        return send(res, 200, layout('Refund requests', `<style>.badge{background:#b3261e;color:#fff;border-radius:3px;padding:1px 6px;font-size:12px;margin-left:6px}</style>
<table><thead><tr><th>Request</th><th>Customer</th><th>Reason</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${rows.map((x) => `<tr data-id="${x.id}"><td>${x.id}</td><td>${esc(x.customer)}${s.blocked.includes(x.customer) ? '<span class="badge">Blocked</span>' : ''}</td><td>${x.reason}</td><td>${money(x.amount)}</td><td class="st">${x.status}</td><td class="ac">${x.status === 'Pending' ? '<button class="sec ap">Approve</button> <button class="sec rj">Reject</button>' : ''}</td></tr>`).join('')}</tbody></table>
<p>${pg > 1 ? `<a href="/refunds?page=${pg - 1}">Previous</a>` : ''} Page ${pg} of 3 ${pg < 3 ? `<a href="/refunds?page=${pg + 1}">Next</a>` : ''}</p>`,
          `document.querySelector('tbody').addEventListener('click',async e=>{const a=e.target.classList.contains('ap')?'approve':e.target.classList.contains('rj')?'reject':null;if(!a)return;const tr=e.target.closest('tr');const d=await api('/api/refunds/'+tr.dataset.id,{action:a});tr.querySelector('.st').textContent=d.status;tr.querySelector('.ac').innerHTML=''})`));
      }
      if (p === '/widgets/notifications') return send(res, 200, widgetPage(s));
      if ((m = /^\/orders\/([\w-]+)$/.exec(p))) {
        const o = s.orders.find((x) => x.id === m[1]); if (!o) return send(res, 404, layout('Not found', '<p>No such order.</p>'));
        return send(res, 200, layout(`Order ${o.id}`, `<table style="width:auto"><tr><th>Customer</th><td>${esc(o.customer)}</td></tr><tr><th>Status</th><td>${o.status}</td></tr><tr><th>Amount</th><td>${money(o.amount)}</td></tr><tr><th>Date</th><td>${o.date}</td></tr></table><p><button id="flag" ${o.flagged ? 'disabled' : ''}>${o.flagged ? 'Flagged for review' : 'Flag for review'}</button> <a href="/orders">Back to orders</a></p>`,
          `document.getElementById('flag').onclick=async e=>{await api('/api/orders/${o.id}/flag',{});e.target.textContent='Flagged for review';e.target.disabled=true}`));
      }
      if (pages[p]) return send(res, 200, pages[p](s));
      return send(res, 404, layout('Not found', '<p>That page does not exist.</p>'));
    } catch (e) {
      send(res, 500, 'Server error: ' + e.message, 'text/plain');
    }
  });
  await new Promise((r) => app.server.listen(port, '127.0.0.1', r));
  app.url = `http://127.0.0.1:${app.server.address().port}`;
  app.close = () => new Promise((r) => { app.server.closeAllConnections?.(); app.server.close(r); });
  return app;
}
