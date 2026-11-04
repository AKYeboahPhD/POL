create sequence if not exists reg_seq start 1;
create table attendees (
  id uuid primary key default gen_random_uuid(),
  reg_code text unique default ('HR-' || lpad(nextval('reg_seq')::text, 4, '0')),
  full_name text not null,
  phone text not null unique,           -- stored as 233XXXXXXXXX
  email text,
  source text not null default 'preregistered' check (source in ('preregistered','walkin')),
  checked_in_at timestamptz,
  created_at timestamptz default now()
);
create table sms_outbox (
  id uuid primary key default gen_random_uuid(),
  attendee_id uuid references attendees(id) on delete cascade,
  message text not null,
  status text not null default 'queued' check (status in ('queued','sent','delivered','failed')),
  provider_id text, error text, attempts int default 0,
  updated_at timestamptz default now()
);
-- Deliberately NO link to attendees: keeps testimonies anonymous.
create table testimonies (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) <= 2000),
  theme text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);
alter table attendees enable row level security;
alter table sms_outbox enable row level security;
alter table testimonies enable row level security;  -- no policies: only the server (service role) can access
