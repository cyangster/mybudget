-- Payment cards for tagging costs (e.g. Freedom), plus optional
-- per-month display overrides when tracked totals don't match the real statement.

create table public.payment_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index payment_cards_user_id_idx on public.payment_cards (user_id);

alter table public.payment_cards enable row level security;

create policy "Users can select own payment cards"
  on public.payment_cards for select
  using (auth.uid() = user_id);

create policy "Users can insert own payment cards"
  on public.payment_cards for insert
  with check (auth.uid() = user_id);

create policy "Users can update own payment cards"
  on public.payment_cards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own payment cards"
  on public.payment_cards for delete
  using (auth.uid() = user_id);

alter table public.category_entries
  add column if not exists card_id uuid references public.payment_cards (id) on delete set null;

create index category_entries_card_id_idx on public.category_entries (card_id);

create table public.card_month_overrides (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months (id) on delete cascade,
  card_id uuid not null references public.payment_cards (id) on delete cascade,
  display_total numeric(12, 2) not null,
  unique (month_id, card_id)
);

create index card_month_overrides_month_id_idx
  on public.card_month_overrides (month_id);

alter table public.card_month_overrides enable row level security;

create policy "Users can select own card month overrides"
  on public.card_month_overrides for select
  using (
    exists (
      select 1 from public.months m
      where m.id = card_month_overrides.month_id and m.user_id = auth.uid()
    )
  );

create policy "Users can insert own card month overrides"
  on public.card_month_overrides for insert
  with check (
    exists (
      select 1 from public.months m
      where m.id = card_month_overrides.month_id and m.user_id = auth.uid()
    )
  );

create policy "Users can update own card month overrides"
  on public.card_month_overrides for update
  using (
    exists (
      select 1 from public.months m
      where m.id = card_month_overrides.month_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.months m
      where m.id = card_month_overrides.month_id and m.user_id = auth.uid()
    )
  );

create policy "Users can delete own card month overrides"
  on public.card_month_overrides for delete
  using (
    exists (
      select 1 from public.months m
      where m.id = card_month_overrides.month_id and m.user_id = auth.uid()
    )
  );
