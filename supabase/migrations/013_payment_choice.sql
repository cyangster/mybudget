-- Which amount the user plans to pay this cycle: total, statement, or minimum.

alter table public.payment_cards
  add column if not exists payment_choice text
    check (
      payment_choice is null
      or payment_choice in ('total', 'statement', 'minimum')
    );
