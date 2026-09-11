-- Kit fulfillment: prepaid label pool, package assets (COC), purchase records
-- Run in Supabase SQL editor once.

-- Package types: spot_check | extended | full_house

create table if not exists kit_package_assets (
  package_type text primary key
    check (package_type in ('spot_check', 'extended', 'full_house')),
  display_name text not null,
  stripe_payment_link_id text,
  stripe_payment_link_url text,
  coc_storage_path text,
  instructions_storage_path text,
  updated_at timestamptz not null default now()
);

insert into kit_package_assets (package_type, display_name)
values
  ('spot_check', 'Spot Check'),
  ('extended', 'Extended'),
  ('full_house', 'Full House')
on conflict (package_type) do nothing;

create table if not exists shipping_labels (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  file_name text,
  public_url text,
  status text not null default 'available'
    check (status in ('available', 'assigned', 'void')),
  package_type text
    check (package_type is null or package_type in ('spot_check', 'extended', 'full_house')),
  assigned_fulfillment_id uuid,
  created_at timestamptz not null default now(),
  assigned_at timestamptz
);

create index if not exists shipping_labels_status_created_idx
  on shipping_labels (status, created_at);

create table if not exists kit_fulfillments (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  stripe_payment_link_id text,
  customer_email text not null,
  customer_name text,
  package_type text not null
    check (package_type in ('spot_check', 'extended', 'full_house')),
  shipping_label_id uuid references shipping_labels(id),
  coc_storage_path text,
  instructions_storage_path text,
  email_status text default 'pending',
  email_error text,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists kit_fulfillments_email_idx
  on kit_fulfillments (lower(customer_email), created_at desc);

-- Optional: allow service role full access; anon/authenticated via backend only.
alter table kit_package_assets enable row level security;
alter table shipping_labels enable row level security;
alter table kit_fulfillments enable row level security;

-- Backend uses service_role key (bypasses RLS). No public policies needed.
