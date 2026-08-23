-- Per-month payment status so July paid/choice does not carry into August.

create table public.card_month_status (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months (id) on delete cascade,
  card_id uuid not null references public.payment_cards (id) on delete cascade,
  payment_paid boolean not null default false,
  payment_choice text
    check (
      payment_choice is null
      or payment_choice in ('total', 'statement', 'minimum')
    ),
  unique (month_id, card_id)
);

create index card_month_status_month_id_idx
  on public.card_month_status (month_id);

alter table public.card_month_status enable row level security;

create policy "Users can select own card month status"
  on public.card_month_status for select
  using (
    exists (
      select 1 from public.months m
      where m.id = card_month_status.month_id and m.user_id = auth.uid()
    )
  );

create policy "Users can insert own card month status"
  on public.card_month_status for insert
  with check (
    exists (
      select 1 from public.months m
      where m.id = card_month_status.month_id and m.user_id = auth.uid()
    )
  );

create policy "Users can update own card month status"
  on public.card_month_status for update
  using (
    exists (
      select 1 from public.months m
      where m.id = card_month_status.month_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.months m
      where m.id = card_month_status.month_id and m.user_id = auth.uid()
    )
  );

create policy "Users can delete own card month status"
  on public.card_month_status for delete
  using (
    exists (
      select 1 from public.months m
      where m.id = card_month_status.month_id and m.user_id = auth.uid()
    )
  );
