-- Store full payment snapshot fields per month (not just paid/choice).

alter table public.card_month_status
  add column if not exists total_balance numeric(12, 2) not null default 0,
  add column if not exists statement_balance numeric(12, 2) not null default 0,
  add column if not exists statement_balance_as_of date,
  add column if not exists minimum_payment numeric(12, 2) not null default 0,
  add column if not exists payment_due_date date,
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;
