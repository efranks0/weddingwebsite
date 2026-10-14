type EventKey = 'warmup' | 'ceremony' | 'dinner';
const EVENTS: EventKey[] = ['warmup', 'ceremony', 'dinner'];
const EVENT_LABEL: Record<EventKey, string> = { warmup: 'Warm-up drinks', ceremony: 'Church ceremony', dinner: 'Cocktails & dinner' };

interface HH {
  id: number; key: string; name: string; side: 'bride' | 'groom'; listOwner: string; phone: string | null;
  warmup: string; ceremony: boolean; dinner: boolean; maxExtra: number; link: string;
  respondedAt: string | null; notes: string; guestCount: number; sentAt: string | null;
}
interface Row {
  householdId: number; household: string; guestId: number | null; guest: string; side: string; listOwner: string;
  invited: Record<EventKey, boolean>; answer: Record<EventKey, boolean | null>;
}
interface Data { households: HH[]; rows: Row[]; templates: { send_template: string; reminder_template: string }; deadline: string }

let data: Data;
let tab = 'overview';
const panel = document.getElementById('panel')!;

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const sideLabel = (s: string) => (s === 'bride' ? 'Bride' : 'Groom');
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const fill = (tpl: string, h: HH) => tpl.replaceAll('{name}', h.name).replaceAll('{link}', h.link);
const waLink = (h: HH, tpl: string) => `https://wa.me/${(h.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(fill(tpl, h))}`;

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json' } });
  if (res.status === 401) { location.href = '/admin/login'; throw new Error('unauthorised'); }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

function stats(rows: Row[], e: EventKey) {
  const named = rows.filter((r) => r.guestId != null && r.invited[e]);
  const replied = named.filter((r) => r.answer[e] != null).length;
  const yes = named.filter((r) => r.answer[e] === true).length;
  const extras = rows.filter((r) => r.guestId == null && r.invited[e] && r.answer[e] === true).length;
  return { invited: named.length, replied, yes, extras, no: named.filter((r) => r.answer[e] === false).length, pending: named.length - replied };
}

function overview() {
  const hh = data.households;
  const replied = hh.filter((h) => h.respondedAt).length;
  const cards = [
    ['Households', hh.length], ['Replied', replied], ['Not replied', hh.length - replied],
    ['Guests', data.rows.filter((r) => r.guestId != null).length], ['Invites sent', hh.filter((h) => h.sentAt).length],
  ];
  const owners = [...new Set(data.rows.map((r) => r.listOwner))].sort();
  const groups: [string, Row[]][] = [
    ['All', data.rows],
    ['Bride', data.rows.filter((r) => r.side === 'bride')],
    ['Groom', data.rows.filter((r) => r.side === 'groom')],
    ...owners.map((o) => [o, data.rows.filter((r) => r.listOwner === o)] as [string, Row[]]),
  ];
  const tables = EVENTS.map((e) => {
    if (!data.rows.some((r) => r.invited[e])) return '';
    const body = groups.map(([label, rows], i) => {
      const s = stats(rows, e);
      return `<tr class="${i === 0 ? 'is-total' : ''}"><td>${esc(label)}</td><td class="num">${s.invited}</td><td class="num">${s.replied}</td>
        <td class="num">${s.yes}${s.extras ? ` <span class="admin__muted">+${s.extras}</span>` : ''}</td><td class="num">${s.no}</td><td class="num">${s.pending}</td></tr>`;
    }).join('');
    return `<h2>${EVENT_LABEL[e]}</h2><div class="table-wrap"><table class="table">
      <thead><tr><th></th><th class="num">Invited</th><th class="num">Replied</th><th class="num">Yes</th><th class="num">No</th><th class="num">Pending</th></tr></thead>
      <tbody>${body}</tbody></table></div>`;
  }).join('');
  panel.innerHTML = `<div class="cards">${cards.map(([l, v]) => `<div class="card"><div class="card__value">${v}</div><div class="card__label">${l}</div></div>`).join('')}</div>
    ${tables}<p class="admin__muted">“+N” = plus-ones coming, on top of named guests. RSVP deadline: ${esc(fmt(data.deadline))}.</p>`;
}

function pending() {
  const list = data.households.filter((h) => !h.respondedAt);
  panel.innerHTML = `<p class="admin__muted">${list.length} households haven’t replied. The reminder button opens WhatsApp with the reminder message (edit it in the Send tab).</p>
    <div class="table-wrap"><table class="table"><thead><tr><th>Household</th><th>Side</th><th>List</th><th class="num">Guests</th><th>Phone</th><th>Invite sent</th><th></th></tr></thead><tbody>
    ${list.map((h) => `<tr><td>${esc(h.name)}</td><td>${sideLabel(h.side)}</td><td>${esc(h.listOwner)}</td><td class="num">${h.guestCount}</td>
      <td>${esc(h.phone || '—')}</td><td>${esc(fmt(h.sentAt) || 'no')}</td>
      <td><a class="p-button" target="_blank" rel="noopener" href="${esc(waLink(h, data.templates.reminder_template))}">Remind</a></td></tr>`).join('')}
    </tbody></table></div>`;
}

function dietary() {
  const list = data.households.filter((h) => h.notes.trim());
  const coming = (h: HH) => data.rows.filter((r) => r.householdId === h.id && r.answer.dinner === true).length;
  panel.innerHTML = list.length
    ? `<div class="table-wrap"><table class="table"><thead><tr><th>Household</th><th class="num">At dinner</th><th>Dietary / notes</th></tr></thead><tbody>
      ${list.map((h) => `<tr><td>${esc(h.name)}</td><td class="num">${coming(h)}</td><td>${esc(h.notes).replace(/\n/g, '<br>')}</td></tr>`).join('')}
      </tbody></table></div>`
    : '<p class="admin__muted">No dietary notes yet.</p>';
}

function send() {
  const rows = data.households.map((h) => `<tr class="${h.sentAt ? 'is-sent' : ''}">
      <td>${esc(h.name)}</td><td>${esc(h.phone || '—')}</td>
      <td><a class="p-button" target="_blank" rel="noopener" data-send="${h.id}" href="${esc(waLink(h, data.templates.send_template))}">WhatsApp</a></td>
      <td><button class="p-button p-button--ghost" type="button" data-copy="${esc(h.link)}">Copy link</button></td>
      <td><label><input type="checkbox" data-sent="${h.id}" ${h.sentAt ? 'checked' : ''}> ${esc(fmt(h.sentAt))}</label></td></tr>`).join('');
  panel.innerHTML = `
    <label class="p-field"><span class="p-label">Invitation message. <code>{name}</code> and <code>{link}</code> are filled in per household.</span>
      <textarea class="p-input" id="tpl-send">${esc(data.templates.send_template)}</textarea></label>
    <label class="p-field"><span class="p-label">Reminder message (used on “Not replied”)</span>
      <textarea class="p-input" id="tpl-reminder">${esc(data.templates.reminder_template)}</textarea></label>
    <p><button class="p-button" type="button" id="tpl-save">Save messages</button> <span id="tpl-status" class="admin__muted"></span></p>
    <h2>Households</h2>
    <p class="admin__muted">Tapping WhatsApp opens the chat with the message ready and ticks “sent”.</p>
    <div class="table-wrap"><table class="table"><thead><tr><th>Household</th><th>Phone</th><th></th><th></th><th>Sent</th></tr></thead><tbody>${rows}</tbody></table></div>`;

  document.getElementById('tpl-save')!.addEventListener('click', async () => {
    const t = {
      send_template: (document.getElementById('tpl-send') as HTMLTextAreaElement).value,
      reminder_template: (document.getElementById('tpl-reminder') as HTMLTextAreaElement).value,
    };
    await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(t) });
    data.templates = t;
    send();
    document.getElementById('tpl-status')!.textContent = 'Saved.';
  });
}

function guests() {
  const cell = (r: Row, e: EventKey) => !r.invited[e] ? '' : r.answer[e] == null ? '<span class="pill">…</span>'
    : r.answer[e] ? '<span class="pill pill--yes">Yes</span>' : '<span class="pill pill--no">No</span>';
  panel.innerHTML = `<label class="p-field"><input class="p-input" id="filter" aria-label="Filter" placeholder="Filter by name, list, side…"></label>
    <div class="table-wrap"><table class="table"><thead><tr><th>Guest</th><th>Household</th><th>Side</th><th>List</th>${EVENTS.map((e) => `<th>${EVENT_LABEL[e]}</th>`).join('')}</tr></thead>
    <tbody id="guest-rows">${data.rows.map((r) => `<tr data-q="${esc(`${r.guest} ${r.household} ${r.listOwner} ${sideLabel(r.side)}`.toLowerCase())}">
      <td>${esc(r.guest)}</td><td>${esc(r.household)}</td><td>${sideLabel(r.side)}</td><td>${esc(r.listOwner)}</td>${EVENTS.map((e) => `<td>${cell(r, e)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  document.getElementById('filter')!.addEventListener('input', (ev) => {
    const q = (ev.target as HTMLInputElement).value.toLowerCase();
    document.querySelectorAll<HTMLTableRowElement>('#guest-rows tr').forEach((tr) => { tr.hidden = !tr.dataset.q!.includes(q); });
  });
}

const views: Record<string, () => void> = { overview, pending, dietary, send, guests };
const show = () => views[tab]();

document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => b.addEventListener('click', () => {
  tab = b.dataset.tab!;
  document.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
  show();
}));

async function markSent(id: number, sent: boolean) {
  const r = await api('/api/admin/sent', { method: 'POST', body: JSON.stringify({ id, sent }) });
  const h = data.households.find((x) => x.id === id);
  if (h) h.sentAt = r.sentAt;
}

panel.addEventListener('click', async (ev) => {
  const t = ev.target as HTMLElement;
  const copyBtn = t.closest<HTMLElement>('[data-copy]');
  if (copyBtn) { await navigator.clipboard.writeText(copyBtn.dataset.copy!); copyBtn.textContent = 'Copied'; return; }
  const sendLink = t.closest<HTMLElement>('[data-send]');
  if (sendLink) { await markSent(Number(sendLink.dataset.send), true); setTimeout(show, 300); }
});
panel.addEventListener('change', async (ev) => {
  const t = ev.target as HTMLInputElement;
  if (t.dataset.sent) { await markSent(Number(t.dataset.sent), t.checked); show(); }
});

api('/api/admin/data').then((d) => { data = d; show(); }).catch((e) => { panel.textContent = `Could not load: ${e.message}`; });
