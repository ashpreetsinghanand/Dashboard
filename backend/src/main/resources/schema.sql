-- KRSI schema. Idempotent: runs on every start (spring.sql.init.mode=always).
-- Human-readable codes (BK-000001, ENWR-000001 ...) are generated from the numeric id.

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL,                 -- FARMER | MERCHANT | WAREHOUSE_OWNER | AUDITOR
  category TEXT NOT NULL,             -- sign-up card: farmer | fpo | trader | fpu | warehouse_owner | auditor
  language TEXT NOT NULL DEFAULT 'English',
  password_hash TEXT NOT NULL,
  district TEXT,
  state TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  wallet_address TEXT NOT NULL UNIQUE, -- the user's identity on the ledger
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS otp_phone_idx ON otp_challenges (phone, created_at);

CREATE TABLE IF NOT EXISTS commodities (
  name TEXT PRIMARY KEY,
  category TEXT NOT NULL,             -- Grain | Pulses | Oilseeds | Spices | Coffee & Tea
  image_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commodity_prices (
  commodity TEXT PRIMARY KEY REFERENCES commodities (name),
  grade TEXT NOT NULL,
  price_per_kg NUMERIC(12, 2) NOT NULL,
  previous_price_per_kg NUMERIC(12, 2) NOT NULL,
  best_market TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlist (
  user_id BIGINT NOT NULL REFERENCES users (id),
  commodity TEXT NOT NULL REFERENCES commodities (name),
  PRIMARY KEY (user_id, commodity)
);

CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,                -- URL slug, e.g. nayak (matches /store/:id in the UI)
  owner_id BIGINT NOT NULL REFERENCES users (id),
  name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,          -- registration code, e.g. WAH-UP-0823
  operator TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Private',
  description TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL,              -- "Lalitpur, Uttar Pradesh"
  district TEXT NOT NULL,             -- "Lalitpur, UP"
  state TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  total_capacity_mt NUMERIC(12, 2) NOT NULL,
  available_capacity_mt NUMERIC(12, 2) NOT NULL,
  storage_rate_per_mt_month NUMERIC(12, 2) NOT NULL,
  crops TEXT[] NOT NULL DEFAULT '{}',
  amenities TEXT[] NOT NULL DEFAULT '{}',
  licenses TEXT[] NOT NULL DEFAULT '{}',
  photos TEXT[] NOT NULL DEFAULT '{}',
  suitable_for TEXT NOT NULL DEFAULT '',
  access_hours TEXT NOT NULL DEFAULT '24/7',
  connectivity TEXT NOT NULL DEFAULT '',
  year_established INTEGER,
  total_area_sqft INTEGER,
  rating NUMERIC(2, 1) NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  wdra_registered BOOLEAN NOT NULL DEFAULT false,
  verified BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ledger_hash TEXT,
  CONSTRAINT warehouse_capacity_ck CHECK (available_capacity_mt >= 0 AND available_capacity_mt <= total_capacity_mt)
);
CREATE INDEX IF NOT EXISTS warehouse_owner_idx ON warehouses (owner_id);

CREATE TABLE IF NOT EXISTS warehouse_attributes (
  warehouse_id TEXT NOT NULL REFERENCES warehouses (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (warehouse_id, label)
);

CREATE TABLE IF NOT EXISTS warehouse_audits (
  id BIGSERIAL PRIMARY KEY,
  code TEXT GENERATED ALWAYS AS ('AUD-' || lpad(id::text, 6, '0')) STORED,
  warehouse_id TEXT NOT NULL REFERENCES warehouses (id),
  auditor_id BIGINT NOT NULL REFERENCES users (id),
  audited_on DATE NOT NULL,
  result TEXT NOT NULL,               -- PASSED | PASSED_WITH_OBSERVATIONS | FAILED
  rating NUMERIC(2, 1) NOT NULL,
  stock_recorded_mt NUMERIC(12, 2) NOT NULL,
  stock_verified_mt NUMERIC(12, 2) NOT NULL,
  findings TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ledger_hash TEXT
);
CREATE INDEX IF NOT EXISTS audit_warehouse_idx ON warehouse_audits (warehouse_id, audited_on DESC);

CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  code TEXT GENERATED ALWAYS AS ('BK-' || lpad(id::text, 6, '0')) STORED,
  depositor_id BIGINT NOT NULL REFERENCES users (id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses (id),
  commodity TEXT NOT NULL REFERENCES commodities (name),
  grade TEXT NOT NULL DEFAULT 'Raw',
  quantity_qtl NUMERIC(12, 2) NOT NULL CHECK (quantity_qtl > 0),
  preferred_date DATE NOT NULL,
  status TEXT NOT NULL,               -- PENDING | ACCEPTED | REJECTED | CANCELLED | DEPOSITED
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  ledger_hash TEXT
);
CREATE INDEX IF NOT EXISTS booking_depositor_idx ON bookings (depositor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS booking_warehouse_idx ON bookings (warehouse_id, status);

-- Electronic Negotiable Warehouse Receipts: the tradable, financeable title to stored produce.
CREATE TABLE IF NOT EXISTS enwrs (
  id BIGSERIAL PRIMARY KEY,
  receipt_no TEXT GENERATED ALWAYS AS ('ENWR-' || lpad(id::text, 6, '0')) STORED,
  booking_id BIGINT REFERENCES bookings (id),
  parent_id BIGINT REFERENCES enwrs (id),   -- set when a partial sale split this receipt off another
  owner_id BIGINT NOT NULL REFERENCES users (id),
  depositor_id BIGINT NOT NULL REFERENCES users (id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses (id),
  commodity TEXT NOT NULL REFERENCES commodities (name),
  grade TEXT NOT NULL,
  quantity_mt NUMERIC(12, 3) NOT NULL CHECK (quantity_mt >= 0),
  stored_on DATE NOT NULL,
  valid_till DATE NOT NULL,
  status TEXT NOT NULL,               -- PENDING_AUDIT | ACTIVE | LISTED | PLEDGED | SOLD | RELEASED | REJECTED
  moisture_pct NUMERIC(5, 2),
  foreign_matter_pct NUMERIC(5, 2),
  quality_remarks TEXT,
  inspected_by BIGINT REFERENCES users (id),
  inspected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ledger_hash TEXT
);
CREATE INDEX IF NOT EXISTS enwr_owner_idx ON enwrs (owner_id, status);
CREATE INDEX IF NOT EXISTS enwr_warehouse_idx ON enwrs (warehouse_id, status);

CREATE TABLE IF NOT EXISTS listings (
  id BIGSERIAL PRIMARY KEY,
  code TEXT GENERATED ALWAYS AS ('LST-' || lpad(id::text, 6, '0')) STORED,
  enwr_id BIGINT NOT NULL REFERENCES enwrs (id),
  seller_id BIGINT NOT NULL REFERENCES users (id),
  quantity_mt NUMERIC(12, 3) NOT NULL CHECK (quantity_mt >= 0),   -- remaining
  original_quantity_mt NUMERIC(12, 3) NOT NULL,
  asking_price_per_mt NUMERIC(14, 2) NOT NULL CHECK (asking_price_per_mt > 0),
  min_quantity_mt NUMERIC(12, 3) NOT NULL CHECK (min_quantity_mt > 0),
  valid_until DATE NOT NULL,
  status TEXT NOT NULL,               -- ACTIVE | SOLD | WITHDRAWN (UNDER_OFFER and EXPIRED are derived)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ledger_hash TEXT
);
CREATE INDEX IF NOT EXISTS listing_seller_idx ON listings (seller_id, status);
CREATE INDEX IF NOT EXISTS listing_status_idx ON listings (status, created_at DESC);

CREATE TABLE IF NOT EXISTS bids (
  id BIGSERIAL PRIMARY KEY,
  code TEXT GENERATED ALWAYS AS ('BID-' || lpad(id::text, 6, '0')) STORED,
  listing_id BIGINT NOT NULL REFERENCES listings (id),
  buyer_id BIGINT NOT NULL REFERENCES users (id),
  quantity_mt NUMERIC(12, 3) NOT NULL CHECK (quantity_mt > 0),
  price_per_mt NUMERIC(14, 2) NOT NULL CHECK (price_per_mt > 0),
  status TEXT NOT NULL,               -- ACTIVE | ACCEPTED | REJECTED | WITHDRAWN
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  ledger_hash TEXT
);
CREATE INDEX IF NOT EXISTS bid_buyer_idx ON bids (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bid_listing_idx ON bids (listing_id, status);

CREATE TABLE IF NOT EXISTS trades (
  id BIGSERIAL PRIMARY KEY,
  code TEXT GENERATED ALWAYS AS ('TRD-' || lpad(id::text, 6, '0')) STORED,
  listing_id BIGINT NOT NULL REFERENCES listings (id),
  bid_id BIGINT NOT NULL UNIQUE REFERENCES bids (id),
  seller_id BIGINT NOT NULL REFERENCES users (id),
  buyer_id BIGINT NOT NULL REFERENCES users (id),
  source_enwr_id BIGINT NOT NULL REFERENCES enwrs (id),
  buyer_enwr_id BIGINT NOT NULL REFERENCES enwrs (id),
  commodity TEXT NOT NULL,
  quantity_mt NUMERIC(12, 3) NOT NULL,
  price_per_mt NUMERIC(14, 2) NOT NULL,
  total_value NUMERIC(16, 2) NOT NULL,
  settled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ledger_hash TEXT
);
CREATE INDEX IF NOT EXISTS trade_seller_idx ON trades (seller_id, settled_at DESC);
CREATE INDEX IF NOT EXISTS trade_buyer_idx ON trades (buyer_id, settled_at DESC);

CREATE TABLE IF NOT EXISTS invoices (
  id BIGSERIAL PRIMARY KEY,
  invoice_no TEXT GENERATED ALWAYS AS ('INV-' || lpad(id::text, 6, '0')) STORED,
  enwr_id BIGINT NOT NULL REFERENCES enwrs (id),
  depositor_id BIGINT NOT NULL REFERENCES users (id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses (id),
  commodity TEXT NOT NULL,
  grade TEXT NOT NULL,
  quantity_mt NUMERIC(12, 3) NOT NULL,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  rate_per_mt_month NUMERIC(12, 2) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL,               -- PENDING | PAID | CANCELLED (OVERDUE is derived from due_date)
  paid_at TIMESTAMPTZ,
  payment_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ledger_hash TEXT
);
CREATE INDEX IF NOT EXISTS invoice_depositor_idx ON invoices (depositor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invoice_warehouse_idx ON invoices (warehouse_id, status);

CREATE TABLE IF NOT EXISTS loans (
  id BIGSERIAL PRIMARY KEY,
  code TEXT GENERATED ALWAYS AS ('LN-' || lpad(id::text, 6, '0')) STORED,
  enwr_id BIGINT NOT NULL REFERENCES enwrs (id),
  borrower_id BIGINT NOT NULL REFERENCES users (id),
  principal NUMERIC(14, 2) NOT NULL CHECK (principal > 0),
  outstanding NUMERIC(14, 2) NOT NULL CHECK (outstanding >= 0),
  interest_rate_pct NUMERIC(5, 2) NOT NULL,
  status TEXT NOT NULL,               -- ACTIVE | CLOSED
  sanctioned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  ledger_hash TEXT
);
CREATE INDEX IF NOT EXISTS loan_borrower_idx ON loans (borrower_id, status);

-- Append-only hash chain. Each block's hash covers its content and the previous block's hash,
-- so editing or deleting any past row breaks verification (GET /api/ledger/verify).
CREATE TABLE IF NOT EXISTS ledger_blocks (
  height BIGINT PRIMARY KEY,
  block_hash TEXT NOT NULL UNIQUE,
  prev_hash TEXT NOT NULL,
  created_at_ms BIGINT NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  actor_address TEXT NOT NULL,
  payload TEXT NOT NULL               -- canonical JSON, hashed byte-for-byte
);
CREATE INDEX IF NOT EXISTS ledger_entity_idx ON ledger_blocks (entity_type, entity_id, height);

-- Backfill: bookings whose receipt was rejected at inspection end as REJECTED (new rejections do this in EnwrService.inspect).
UPDATE bookings SET status = 'REJECTED', decision_note = COALESCE(decision_note, 'Receipt rejected at inspection'), decided_at = COALESCE(decided_at, now())
WHERE status = 'DEPOSITED' AND id IN (SELECT booking_id FROM enwrs WHERE status = 'REJECTED' AND booking_id IS NOT NULL);

-- KYC (Aadhaar via DigiLocker through Setu). provider 'mock' issues dummy request ids until Setu is switched on.
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'NONE'; -- NONE | VERIFIED
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS kyc_records (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id),
  provider TEXT NOT NULL,              -- mock | setu
  request_id TEXT NOT NULL UNIQUE,     -- Setu DigiLocker request id (or mock-<uuid>)
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | VERIFIED | FAILED
  full_name TEXT,
  date_of_birth TEXT,
  gender TEXT,
  aadhaar_last4 TEXT,                  -- only the last 4 digits are ever stored
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- In-app notifications, written from ledger events after each business change commits (NotificationService).
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id),
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,                           -- dashboard route to open, e.g. /store/booking
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS notification_user_idx ON notifications (user_id, id DESC);
