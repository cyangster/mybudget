-- Date for each cost line item within a category

alter table public.category_entries
  add column if not exists entry_date date not null default current_date;

create index if not exists category_entries_category_date_idx
  on public.category_entries (category_id, entry_date);
