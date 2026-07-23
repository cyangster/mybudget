-- Per-card custom metric values for fully customizable Cards catalog fields.
alter table public.payment_cards
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;
