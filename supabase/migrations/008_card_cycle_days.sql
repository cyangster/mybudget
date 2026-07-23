-- Store cycle day + month offset so dates follow the selected budget month.
-- next_closing defaults to +1 month; payment_due defaults to the selected month.

alter table public.payment_cards
  add column if not exists payment_due_day int
    check (payment_due_day is null or (payment_due_day >= 1 and payment_due_day <= 31)),
  add column if not exists payment_due_month_offset int not null default 0,
  add column if not exists next_closing_day int
    check (next_closing_day is null or (next_closing_day >= 1 and next_closing_day <= 31)),
  add column if not exists next_closing_month_offset int not null default 1;

update public.payment_cards
set payment_due_day = extract(day from payment_due_date)::int
where payment_due_date is not null
  and payment_due_day is null;

update public.payment_cards
set next_closing_day = extract(day from next_closing_date)::int
where next_closing_date is not null
  and next_closing_day is null;
