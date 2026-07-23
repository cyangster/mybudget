-- Credit card statement tracking fields on payment_cards (manual snapshot).

alter table public.payment_cards
  add column if not exists total_balance numeric(12, 2) not null default 0,
  add column if not exists statement_balance numeric(12, 2) not null default 0,
  add column if not exists minimum_payment numeric(12, 2) not null default 0,
  add column if not exists payment_due_date date,
  add column if not exists next_closing_date date;
