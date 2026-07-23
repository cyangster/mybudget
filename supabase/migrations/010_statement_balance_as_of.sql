-- Date the statement balance applies to ("as of").
alter table public.payment_cards
  add column if not exists statement_balance_as_of date;
