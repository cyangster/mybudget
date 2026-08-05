-- Per-user income preferences: pay cycle and monthly spend buffer.
-- RLS keeps each account isolated (user 1 cannot read/write user 2).

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  pay_cycle text not null default 'semimonthly'
    check (pay_cycle in ('weekly', 'biweekly', 'semimonthly', 'monthly')),
  monthly_spend_buffer numeric(12, 2) not null default 200
    check (monthly_spend_buffer >= 0),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users can select own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own settings"
  on public.user_settings for delete
  using (auth.uid() = user_id);
