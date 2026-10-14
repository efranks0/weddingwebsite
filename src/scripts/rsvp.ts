type EventKey = 'warmup' | 'ceremony' | 'dinner';
interface Answer { guestId: number | null; extraSlot: number | null; event: EventKey; attending: boolean }
interface Invite {
  token: string;
  name: string;
  warmup: 'none' | 'emilios' | 'theo';
  events: EventKey[];
  maxExtra: number;
  guests: { id: number; name: string }[];
  response: { at: string; notes: string; answers: Answer[] } | null;
  deadline: string;
  locked: boolean;
}

const read = <T>(id: string): T | null => {
  const el = document.getElementById(id);
  try { return el ? (JSON.parse(el.textContent || 'null') as T) : null; } catch { return null; }
};

const copy = read<Record<string, any>>('rsvp-copy')!;
let invite = read<Invite>('invite-data');
const form = document.getElementById('rsvp-form') as HTMLFormElement | null;
const eventsEl = document.getElementById('rsvp-events')!;
const statusEl = document.getElementById('rsvp-status')!;

const formatDeadline = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...children: (Node | string)[]) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

function people(inv: Invite) {
  return [
    ...inv.guests.map((g) => ({ key: `g${g.id}`, guestId: g.id as number | null, extraSlot: null as number | null, name: g.name })),
    ...Array.from({ length: inv.maxExtra }, (_, i) => ({
      key: `x${i + 1}`, guestId: null, extraSlot: i + 1, name: inv.maxExtra > 1 ? `${copy.plusOne} ${i + 1}` : copy.plusOne,
    })),
  ];
}

function previous(inv: Invite, p: { guestId: number | null; extraSlot: number | null }, e: EventKey): boolean | null {
  const a = inv.response?.answers.find((x) => x.event === e && (p.guestId != null ? x.guestId === p.guestId : x.extraSlot === p.extraSlot));
  return a ? a.attending : null;
}

function render(inv: Invite) {
  eventsEl.replaceChildren();
  for (const e of inv.events) {
    const time = e === 'warmup' ? copy.warmupTimes[inv.warmup] : copy.eventTimes[e];
    const fs = el('fieldset', { class: 'rsvp__event' },
      el('legend', { class: 'rsvp__event-title' }, copy.events[e], ...(time ? [el('span', { class: 'rsvp__event-time' }, time)] : [])));
    for (const p of people(inv)) {
      const name = `${p.key}:${e}`;
      const prev = previous(inv, p, e);
      const choice = (value: 'yes' | 'no', label: string, checked: boolean) => {
        const input = el('input', { type: 'radio', name, value }) as HTMLInputElement;
        input.checked = checked;
        input.disabled = inv.locked;
        return el('label', { class: 'choice' }, input, el('span', {}, label));
      };
      fs.append(el('div', { class: 'rsvp__row' },
        el('span', { class: 'rsvp__name' }, p.name),
        el('span', { class: 'rsvp__choices', role: 'radiogroup', 'aria-label': `${p.name}, ${copy.events[e]}` },
          choice('yes', copy.yes, prev === true),
          choice('no', copy.no, prev === false || (prev === null && p.extraSlot != null && !!inv.response)))));
    }
    eventsEl.append(fs);
  }
  const notes = form!.elements.namedItem('notes') as HTMLTextAreaElement;
  notes.value = inv.response?.notes ?? '';
  notes.disabled = inv.locked;
  (form!.querySelector('button[type=submit]') as HTMLButtonElement).hidden = inv.locked;

  if (inv.locked) setStatus(copy.locked, '');
  else if (inv.response) setStatus(`${copy.thanks} ${copy.changeUntil} ${formatDeadline(inv.deadline)}.`, 'success');
}

function setStatus(text: string, kind: '' | 'success' | 'error') {
  statusEl.replaceChildren(text ? el('p', { class: `notice${kind ? ` notice--${kind}` : ''}` }, text) : '');
}

function collect(inv: Invite): Answer[] | null {
  const answers: Answer[] = [];
  for (const e of inv.events) for (const p of people(inv)) {
    const checked = form!.querySelector<HTMLInputElement>(`input[name="${p.key}:${e}"]:checked`);
    if (!checked) {
      if (p.extraSlot != null) { answers.push({ guestId: null, extraSlot: p.extraSlot, event: e, attending: false }); continue; }
      return null;
    }
    answers.push({ guestId: p.guestId, extraSlot: p.extraSlot, event: e, attending: checked.value === 'yes' });
  }
  return answers;
}

if (form && invite) {
  render(invite);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const inv = invite!;
    const answers = collect(inv);
    if (!answers) return setStatus(copy.missing, 'error');
    const button = form.querySelector('button[type=submit]') as HTMLButtonElement;
    button.disabled = true;
    button.textContent = copy.sending;
    try {
      const res = await fetch(`/api/rsvp/${inv.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, notes: (form.elements.namedItem('notes') as HTMLTextAreaElement).value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      invite = { ...data, token: inv.token };
      render(invite!);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Something went wrong. Please try again.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = copy.send;
    }
  });
}
