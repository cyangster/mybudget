-- Optional note on each cost line item

alter table public.category_entries
  add column if not exists notes text not null default '';
