-- Per-month notebook notes (synced across devices).

alter table public.months
  add column if not exists notes text not null default '';
