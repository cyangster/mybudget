-- Display-only categories (e.g. 401k already in net) stay on the card
-- but are excluded from budget totals, leftover, and can-spend.
alter table public.categories
  add column if not exists excluded_from_budget boolean not null default false;
