// Sample households for /preview pages (design QA). Not real guests.
const deadline = '2026-12-15T23:59:59+02:00';
const guests = [
  { id: 1, name: 'Sophia Papadopoulou' },
  { id: 2, name: 'Alexandros Konstantinidis-Georgiou' }, // long name on purpose
  { id: 3, name: 'Mia' },
];
const base = { token: 'PREVIEW00000', name: 'Sophia, Alex & Mia', warmup: 'theo', events: ['warmup', 'ceremony', 'dinner'], maxExtra: 1, guests, deadline, locked: false };
const answers = [
  ...[1, 2].flatMap((g) => ['warmup', 'ceremony', 'dinner'].map((event) => ({ guestId: g, extraSlot: null, event, attending: true }))),
  { guestId: 3, extraSlot: null, event: 'warmup', attending: false },
  { guestId: 3, extraSlot: null, event: 'ceremony', attending: true },
  { guestId: 3, extraSlot: null, event: 'dinner', attending: false },
  { guestId: null, extraSlot: 1, event: 'ceremony', attending: true },
  { guestId: null, extraSlot: 1, event: 'dinner', attending: true },
];
const response = { at: '2026-11-22T18:40:00Z', notes: 'Sophia is vegetarian. Mia has a nut allergy.', answers };

export const samples = {
  firstVisit: base,
  replied: { ...base, response },
  closed: { ...base, response, locked: true },
  closedNoReply: { ...base, locked: true },
  single: { ...base, name: 'Giorgos', warmup: 'none', events: ['ceremony', 'dinner'], maxExtra: 0, guests: [{ id: 9, name: 'Giorgos Example' }] },
};
