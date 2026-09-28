-- Open tracking for kit purchase emails.
-- Additive. Kit fulfillment still works if these columns are missing.
-- Run in Supabase SQL editor, then redeploy the API.

alter table kit_fulfillments
  add column if not exists email_open_token text,
  add column if not exists email_opened_at timestamptz,
  add column if not exists email_open_count integer not null default 0;

create unique index if not exists kit_fulfillments_email_open_token_idx
  on kit_fulfillments (email_open_token)
  where email_open_token is not null;
