-- Personal budget schema with RLS scoped to the authenticated user

create extension if not exists "pgcrypto";

create type public.budget_section as enum (
  'income',
  'fixed',
  'variable',
  'investments',
  'savings'
);

create table public.months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  unique (user_id, label)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months (id) on delete cascade,
  section public.budget_section not null,
  name text not null,
  budgeted_amount numeric(12, 2) not null default 0,
  actual_amount numeric(12, 2) not null default 0,
  sort_order int not null default 0
);

create index categories_month_id_idx on public.categories (month_id);
create index categories_month_section_sort_idx on public.categories (month_id, section, sort_order);
create index months_user_id_label_idx on public.months (user_id, label);

alter table public.months enable row level security;
alter table public.categories enable row level security;

create policy "Users can select own months"
  on public.months for select
  using (auth.uid() = user_id);

create policy "Users can insert own months"
  on public.months for insert
  with check (auth.uid() = user_id);

create policy "Users can update own months"
  on public.months for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own months"
  on public.months for delete
  using (auth.uid() = user_id);

create policy "Users can select own categories"
  on public.categories for select
  using (
    exists (
      select 1 from public.months m
      where m.id = categories.month_id and m.user_id = auth.uid()
    )
  );

create policy "Users can insert own categories"
  on public.categories for insert
  with check (
    exists (
      select 1 from public.months m
      where m.id = categories.month_id and m.user_id = auth.uid()
    )
  );

create policy "Users can update own categories"
  on public.categories for update
  using (
    exists (
      select 1 from public.months m
      where m.id = categories.month_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.months m
      where m.id = categories.month_id and m.user_id = auth.uid()
    )
  );

create policy "Users can delete own categories"
  on public.categories for delete
  using (
    exists (
      select 1 from public.months m
      where m.id = categories.month_id and m.user_id = auth.uid()
    )
  );
