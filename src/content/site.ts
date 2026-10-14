// All visible copy lives here. Edit text here, never in the components.
// Taken from the Bliss & Bone site (myblissandbone.com/etwedding).

const maps = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export const site = {
  couple: 'Emilios & Theodora',
  logo: 'Emilios and Theodora', // script logo, top left
  title: 'Emilios & Theodora',

  hero: {
    menuLabel: "It's Happening",
    title: 'Emilios & Theodora are finally getting married',
    date: '30th of January 2027',
    lines: ['Saturday', 'The Warehouse by IT Quarter', 'Limassol', 'Dress Code: Black Tie'],
  },

  // TODO(copy): intro text from the B&B site. The section is hidden while empty.
  intro: {
    title: '',
    paragraphs: [] as string[],
  },

  dressCode: {
    title: 'Dress Code',
    label: 'Black Tie',
    paragraphs: ["It's going to be a Black Tie event.", "The reception is indoors, but bring a coat for the church steps; it's January."],
  },

  // `show` decides who sees each block/entry on a personal invite page:
  //   warmup (anyone with a warm-up), warmup-emilios / warmup-theo, ceremony, dinner.
  // Blocks with `public: false` never appear on the shared front page.
  day: {
    title: 'The Day',
    blocks: [
      {
        title: 'Warm-up drinks', show: 'warmup', public: false, rsvpEvent: 'warmup',
        entries: [
          { show: 'warmup-emilios', time: '15:00', lines: ['Emilios', 'Odyssea Elyti, 2', 'Germasogeia, Limassol'], map: maps('Odyssea Elyti 2, Germasogeia, Limassol, Cyprus') },
          { show: 'warmup-theo', time: '15:30', lines: ['Theodora', 'Kyparissas, 49', 'Germasogeia, Limassol'], map: maps('Kyparissas 49, Germasogeia, Limassol, Cyprus') },
        ],
        footer: [] as string[], map: '',
      },
      {
        title: 'Ceremony', show: 'ceremony', public: true, rsvpEvent: 'ceremony',
        entries: [
          { show: '', time: '17:00', lines: ['Saint Paraskevi Church', 'Germasogeia, Limassol'], map: maps('Saint Paraskevi Church, Germasogeia, Limassol, Cyprus') },
        ],
        footer: [] as string[], map: '',
      },
      {
        title: 'Dinner', show: 'dinner', public: true, rsvpEvent: 'dinner',
        entries: [
          { show: '', time: '19:00', lines: ['Cocktails'], map: '' },
          { show: '', time: '20:00', lines: ['Dinner'], map: '' },
        ],
        footer: ['The Warehouse by IT Quarter', 'Limassol'],
        map: maps('The Warehouse by IT Quarter, Limassol, Cyprus'),
      },
    ],
    locationButton: 'Location',
  },

  album: {
    title: 'Photo Album',
    paragraphs: ['Just scan the QR code on your table or at the bar.', 'Photos go straight into our shared album; no app needed.'],
    url: '', // TODO: Wedibox album link (button hidden while empty)
    qrImage: '', // TODO: put the Wedibox QR in public/images/ and set e.g. '/images/wedibox-qr.png'
    button: 'Open album',
  },

  faq: {
    title: 'FAQ',
    items: [
      { q: 'What time should I arrive at the church for the ceremony?', a: ['The ceremony starts at 17:00.', 'Please be seated by 16:45.'] },
      { q: 'What is the dress code?', a: ["It's going to be a Black Tie event.", "The reception is indoors, but bring a coat for the church steps; it's January."] },
      { q: 'Is there parking at The Warehouse?', a: ['Yes, on site.'] },
      { q: 'Are children welcome?', a: ['Children are welcome at the ceremony, however The Warehouse portion of the wedding is adult only.'] },
      { q: 'What time does it all end?', a: ['Dinner is at 20:00 and the party runs until late.', 'Late-night food comes out around 01:00.'] },
      { q: 'How do I share my photos from the wedding?', a: ['Just scan the QR code on your table or at the bar.', 'Photos go straight into our shared album; no app needed.'] },
      // TODO(copy): real contact name and number (B&B site still shows the placeholder).
      { q: 'Who do I contact on the day of the wedding?', a: ['Fresh Events.', 'AAAA, +35700000000'] },
    ],
  },

  rsvp: {
    title: 'RSVP',
    publicText: 'Please reply using the personal link in your invitation message. Can’t find it? Just send us a message.',
    greeting: 'Dear', // "Dear <household name>"
    intro: 'Let us know who will be joining us. You can reopen this page and change your answer until the deadline.',
    yes: 'Yes',
    no: 'No',
    plusOne: 'Plus-one',
    notesLabel: 'Dietary requirements or notes',
    notesPlaceholder: 'Allergies, vegetarian, anything we should know',
    send: 'Send',
    sending: 'Sending…',
    thanks: 'Thank you! We have your reply.',
    changeUntil: 'You can change your answer until',
    locked: 'The RSVP deadline has passed. If something has changed, please message us directly.',
    missing: 'Please answer for everyone before sending.',
    events: {
      warmup: 'Warm-up drinks',
      ceremony: 'Ceremony',
      dinner: 'Cocktails & dinner',
    },
  },

  footer: 'Emilios & Theodora · 30.01.2027',
};

export type DayBlock = (typeof site.day.blocks)[number];
