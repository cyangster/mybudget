-- Line items / individual costs within a category (e.g. two $400 rent payments)

create table public.category_entries (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  label text not null default '',
  amount numeric(12, 2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index category_entries_category_id_idx
  on public.category_entries (category_id);

alter table public.category_entries enable row level security;

create policy "Users can select own category entries"
  on public.category_entries for select
  using (
    exists (
      select 1
      from public.categories c
      join public.months m on m.id = c.month_id
      where c.id = category_entries.category_id
        and m.user_id = auth.uid()
    )
  );

create policy "Users can insert own category entries"
  on public.category_entries for insert
  with check (
    exists (
      select 1
      from public.categories c
      join public.months m on m.id = c.month_id
      where c.id = category_entries.category_id
        and m.user_id = auth.uid()
    )
  );

create policy "Users can update own category entries"
  on public.category_entries for update
  using (
    exists (
      select 1
      from public.categories c
      join public.months m on m.id = c.month_id
      where c.id = category_entries.category_id
        and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.categories c
      join public.months m on m.id = c.month_id
      where c.id = category_entries.category_id
        and m.user_id = auth.uid()
    )
  );

create policy "Users can delete own category entries"
  on public.category_entries for delete
  using (
    exists (
      select 1
      from public.categories c
      join public.months m on m.id = c.month_id
      where c.id = category_entries.category_id
        and m.user_id = auth.uid()
    )
  );
