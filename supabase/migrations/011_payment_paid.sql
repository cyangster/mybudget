-- Track whether the current statement payment has been made.

alter table public.payment_cards
  add column if not exists payment_paid boolean not null default false;
