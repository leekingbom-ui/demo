create extension if not exists pgcrypto;

create table if not exists public.order_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  fan_phone text not null,
  masked_phone text not null,
  order_id text not null,
  status text not null default 'pending',
  status_label text not null default '待确认',
  status_detail text not null default '已提交，等待运营审核',
  source text not null default 'public_web'
);

create index if not exists order_applications_created_at_idx
  on public.order_applications (created_at desc);

alter table public.order_applications enable row level security;

drop policy if exists "deny direct reads" on public.order_applications;
create policy "deny direct reads"
  on public.order_applications
  for select
  to anon, authenticated
  using (false);

drop policy if exists "deny direct inserts" on public.order_applications;
create policy "deny direct inserts"
  on public.order_applications
  for insert
  to anon, authenticated
  with check (false);
