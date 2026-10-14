// Fills the RSVP component (src/components/RsvpPersonal.astro). No markup or
// styling decisions here: it clones <template>s and sets [data-slot] text.
type EventKey = 'warmup' | 'ceremony' | 'dinner';
type State = 'form' | 'sent' | 'closed';
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
interface Person { key: string; guestId: number | null; extraSlot: number | null; name: string }

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

function init(root: HTMLElement) {
  const json = <T>(sel: string): T | null => { try { return JSON.parse(root.querySelector(sel)?.textContent || 'null'); } catch { return null; } };
  const copy = json<Record<string, any>>('script[data-copy]')!;
  let inv = json<Invite>('script[data-invite]');
  if (!inv) return;
  const preview = root.dataset.previewState as State | undefined;

  const form = root.querySelector<HTMLFormElement>('.rsvp__form')!;
  const notes = form.elements.namedItem('notes') as HTMLTextAreaElement;
  const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const slots = (name: string) => root.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`);
  const fill = (el: Element, name: string, text: string) => { const s = el.querySelector(`[data-slot="${name}"]`); if (s) s.textContent = text; };
  const clone = (name: string) => (root.querySelector<HTMLTemplateElement>(`template[data-template="${name}"]`)!.content.firstElementChild!.cloneNode(true) as HTMLElement);
  const text = (s: string, i: Invite) => s.replace('{deadline}', fmtDate(i.deadline)).replace('{date}', i.response ? fmtDate(i.response.at) : '');

  const people = (i: Invite): Person[] => [
    ...i.guests.map((g) => ({ key: `g${g.id}`, guestId: g.id, extraSlot: null, name: g.name })),
    ...Array.from({ length: i.maxExtra }, (_, n) => ({
      key: `x${n + 1}`, guestId: null, extraSlot: n + 1, name: i.maxExtra > 1 ? `${copy.plusOne} ${n + 1}` : copy.plusOne,
    })),
  ];
  const previous = (i: Invite, p: Person, e: EventKey) =>
    i.response?.answers.find((a) => a.event === e && (p.guestId != null ? a.guestId === p.guestId : a.extraSlot === p.extraSlot))?.attending ?? null;
  const eventTime = (i: Invite, e: EventKey) => (e === 'warmup' ? copy.warmupTimes[i.warmup] : copy.eventTimes[e]) || '';

  function renderForm(i: Invite) {
    const guests = root.querySelector('[data-slot="guests"]')!;
    guests.replaceChildren();
    for (const p of people(i)) {
      const card = clone('guest');
      fill(card, 'name', p.name);
      const events = card.querySelector('[data-slot="events"]')!;
      for (const e of i.events) {
        const row = clone('event');
        fill(row, 'label', copy.events[e]);
        fill(row, 'time', eventTime(i, e));
        row.setAttribute('aria-label', `${p.name}: ${copy.events[e]}`);
        const prev = previous(i, p, e);
        // A plus-one left blank in an earlier reply was saved as "no".
        const value = prev ?? (p.extraSlot != null && i.response ? false : null);
        row.querySelectorAll<HTMLInputElement>('input[type=radio]').forEach((input) => {
          input.name = `${p.key}:${e}`;
          input.checked = value != null && (input.value === 'yes') === value;
        });
        events.append(row);
      }
      guests.append(card);
    }
    notes.value = i.response?.notes ?? '';
    slots('intro').forEach((s) => (s.textContent = text(i.response ? copy.introReplied : copy.intro, i)));
    slots('error').forEach((s) => (s.textContent = ''));
  }

  function renderSummary(i: Invite) {
    for (const container of slots('summary')) {
      container.replaceChildren();
      if (!i.response) continue;
      for (const p of people(i)) {
        const answers = i.events.map((e) => [e, previous(i, p, e)] as const);
        if (p.extraSlot != null && !answers.some(([, a]) => a)) continue; // hide plus-ones not coming
        const g = clone('summary-guest');
        fill(g, 'name', p.name);
        const list = g.querySelector('[data-slot="events"]')!;
        for (const [e, a] of answers) {
          const li = clone('summary-event');
          fill(li, 'label', copy.events[e]);
          fill(li, 'answer', a ? copy.yes : copy.no);
          list.append(li);
        }
        container.append(g);
      }
      if (i.response.notes) {
        const n = clone('summary-notes');
        fill(n, 'label', copy.summaryNotes);
        fill(n, 'text', i.response.notes);
        container.append(n);
      }
    }
    slots('sent-text').forEach((s) => (s.textContent = text(copy.sentText, i)));
    slots('closed-text').forEach((s) => (s.textContent = text(i.response ? copy.closedText : copy.closedNoReply, i)));
  }

  function show(state: State) {
    root.dataset.state = state;
    if (state === 'form') renderForm(inv!);
    else renderSummary(inv!);
  }

  function collect(i: Invite): Answer[] | null {
    const out: Answer[] = [];
    for (const p of people(i)) for (const e of i.events) {
      const checked = form.querySelector<HTMLInputElement>(`input[name="${p.key}:${e}"]:checked`);
      if (!checked && p.guestId != null) return null;
      out.push({ guestId: p.guestId, extraSlot: p.extraSlot, event: e, attending: checked?.value === 'yes' });
    }
    return out;
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const i = inv!;
    const answers = collect(i);
    const error = (m: string) => slots('error').forEach((s) => (s.textContent = m));
    if (!answers) return error(copy.missing);
    if (preview) { inv = { ...i, response: { at: new Date().toISOString(), notes: notes.value, answers } }; return show('sent'); }
    button.disabled = true;
    button.textContent = copy.sending;
    try {
      const res = await fetch(`/api/rsvp/${i.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, notes: notes.value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403) { inv = { ...i, locked: true }; return show('closed'); }
        throw new Error(data.error || copy.failed);
      }
      inv = { ...data, token: i.token };
      show('sent');
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      error(err instanceof Error ? err.message : copy.failed);
    } finally {
      button.disabled = false;
      button.textContent = copy.send;
    }
  });
  root.querySelector('[data-action="edit"]')?.addEventListener('click', () => show('form'));

  show(preview ?? (inv.locked ? 'closed' : 'form'));
}

document.querySelectorAll<HTMLElement>('[data-rsvp]').forEach(init);
