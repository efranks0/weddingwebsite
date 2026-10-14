-- Households: one personal link each.
CREATE TABLE households (
  id          INTEGER PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,          -- stable id from the guest workbook (seed upserts on it)
  token       TEXT NOT NULL UNIQUE,          -- 12-char secret in etwedding.io/i/<token>
  name        TEXT NOT NULL,                 -- greeting, e.g. "Maria & Nikos"
  side        TEXT NOT NULL CHECK (side IN ('bride','groom')),
  list_owner  TEXT NOT NULL,                 -- Zoe | Athena & Costas | Family | Couple
  phone       TEXT,                          -- digits only, international, for wa.me
  warmup      TEXT NOT NULL DEFAULT 'none' CHECK (warmup IN ('none','emilios','theo')),
  ceremony    INTEGER NOT NULL DEFAULT 1,
  dinner      INTEGER NOT NULL DEFAULT 1,
  max_extra   INTEGER NOT NULL DEFAULT 0,    -- known plus-ones this household may bring
  active      INTEGER NOT NULL DEFAULT 1,
  invite_sent_at TEXT,                       -- set when the WhatsApp link is tapped in admin "Send"
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE guests (
  id            INTEGER PRIMARY KEY,
  household_id  INTEGER NOT NULL REFERENCES households(id),
  key           TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  sort          INTEGER NOT NULL DEFAULT 0,
  active        INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX guests_household ON guests(household_id);

-- Append-only. The latest response per household wins.
CREATE TABLE responses (
  id            INTEGER PRIMARY KEY,
  household_id  INTEGER NOT NULL REFERENCES households(id),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  notes         TEXT NOT NULL DEFAULT '',    -- dietary / notes, one field per household
  user_agent    TEXT
);
CREATE INDEX responses_household ON responses(household_id, id);

-- One row per (person, event). guest_id is NULL for a plus-one slot.
CREATE TABLE response_answers (
  response_id  INTEGER NOT NULL REFERENCES responses(id),
  guest_id     INTEGER REFERENCES guests(id),
  extra_slot   INTEGER,                      -- 1..max_extra when guest_id is NULL
  event        TEXT NOT NULL CHECK (event IN ('warmup','ceremony','dinner')),
  attending    INTEGER NOT NULL CHECK (attending IN (0,1))
);
CREATE INDEX answers_response ON response_answers(response_id);

CREATE VIEW latest_responses AS
  SELECT r.* FROM responses r
  WHERE r.id = (SELECT MAX(id) FROM responses WHERE household_id = r.household_id);

CREATE TABLE settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
