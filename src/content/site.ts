// All visible copy lives here. Edit text here, never in the components.
//
// TODO(copy): Everything marked TODO is a placeholder. Paste the final text
// from the Bliss & Bone site (myblissandbone.com/etwedding) over it.

export const site = {
  couple: 'Emilios & Theodora',
  title: 'Emilios & Theodora',
  date: 'TODO date', // e.g. 'Saturday 12 June 2027'
  place: 'TODO place', // e.g. 'Athens, Greece'

  hero: {
    eyebrow: "It's Happening",
    title: 'Emilios and Theodora are finally getting married',
  },

  intro: {
    title: 'Welcome', // TODO(copy)
    paragraphs: [
      // TODO(copy)
      'We are so happy to share our wedding day with the people we love most. Here you will find everything you need to know about the day.',
    ],
  },

  dressCode: {
    title: 'Dress Code',
    label: 'Black Tie',
    paragraphs: [
      // TODO(copy)
      'Floor-length gowns or elegant cocktail dresses; tuxedos or dark suits with a bow tie.',
    ],
  },

  // `show` decides who sees each item on a personal invite page:
  //   warmup-emilios / warmup-theo → household's warm-up list
  //   ceremony / dinner           → household flags
  // `public: true` items also appear on the password-protected front page.
  day: {
    title: 'The Day',
    items: [
      { show: 'warmup-emilios', public: false, time: 'TODO', title: 'Warm-up drinks', venue: 'TODO venue (Emilios)', note: '' },
      { show: 'warmup-theo', public: false, time: 'TODO', title: 'Warm-up drinks', venue: 'TODO venue (Theodora)', note: '' },
      { show: 'ceremony', public: true, time: '17:00', title: 'Church ceremony', venue: 'TODO church', note: '' },
      { show: 'dinner', public: true, time: '19:00', title: 'Cocktails', venue: 'TODO venue', note: '' },
      { show: 'dinner', public: true, time: '20:00', title: 'Dinner', venue: 'TODO venue', note: '' },
    ],
  },

  album: {
    title: 'Photo Album',
    paragraphs: [
      // TODO(copy)
      'Help us collect every moment. Scan the code or tap the button to add your photos and videos to our shared album.',
    ],
    url: 'https://wedibox.com/TODO', // TODO: Wedibox album link
    qrImage: '', // TODO: drop the Wedibox QR into public/images/ and set e.g. '/images/wedibox-qr.png'
    button: 'Open the album',
  },

  faq: {
    title: 'FAQ',
    items: [
      // TODO(copy): paste Q&As from the B&B site
      { q: 'Can I bring a plus-one?', a: 'Your personal invitation lists everyone we have the joy of hosting. If a plus-one is included, you will see it there.' },
      { q: 'Are children welcome?', a: 'TODO' },
      { q: 'Where should I stay?', a: 'TODO' },
    ],
  },

  rsvp: {
    title: 'RSVP',
    publicText: 'Please reply using the personal link in your invitation message. Can’t find it? Just send us a message.',
    greeting: 'Dear', // "Dear <household name>"
    intro: 'Let us know who will be joining us. You can reopen this page and change your answer until the deadline.',
    yes: 'Joyfully accepts',
    no: 'Regretfully declines',
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
      ceremony: 'Church ceremony',
      dinner: 'Cocktails & dinner',
    },
  },

  footer: 'Emilios & Theodora',
} as const;

export type DayItem = (typeof site.day.items)[number];
