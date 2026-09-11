-- MMGC General Trading core application schema
-- Apply to the dedicated MMGC Supabase project after project creation.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('admin','staff','client','supplier')),
  company_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_tenders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  tender_key text,
  title text not null,
  issuer text,
  reference text,
  deadline timestamptz,
  source_url text,
  status text not null default 'active' check (status in ('active','submitted','won','lost','expired','archived')),
  site_visit_status text,
  pre_bid_status text,
  bid_security text,
  document_fee text,
  notes text,
  source_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tender_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  tender_id uuid references public.saved_tenders(id) on delete cascade,
  file_name text not null,
  storage_path text,
  mime_type text,
  file_size bigint,
  document_type text default 'tender',
  extraction_status text default 'pending' check (extraction_status in ('pending','processing','complete','failed')),
  extracted_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tender_costings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  tender_id uuid references public.saved_tenders(id) on delete set null,
  title text not null default 'Tender costing',
  currency text not null default 'M',
  document_fee numeric(14,2) not null default 0,
  transport numeric(14,2) not null default 0,
  other_costs numeric(14,2) not null default 0,
  overhead_percent numeric(8,3) not null default 0,
  contingency_percent numeric(8,3) not null default 0,
  markup_percent numeric(8,3) not null default 0,
  vat_percent numeric(8,3) not null default 15,
  bid_security_percent numeric(8,3) not null default 0,
  subtotal numeric(14,2) not null default 0,
  total_ex_vat numeric(14,2) not null default 0,
  total_inc_vat numeric(14,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.costing_items (
  id uuid primary key default gen_random_uuid(),
  costing_id uuid not null references public.tender_costings(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  line_no integer,
  description text not null,
  specification text,
  unit text,
  quantity numeric(14,3) not null default 1,
  unit_cost numeric(14,2) not null default 0,
  source_name text,
  source_url text,
  source_location text,
  confidence text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  contact_name text,
  email text,
  phone text,
  location text,
  categories text[] not null default '{}',
  brands text[] not null default '{}',
  authorised_reseller boolean not null default false,
  delivery_coverage text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_prices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  item_name text not null,
  specification text,
  unit text,
  unit_price numeric(14,2),
  currency text not null default 'M',
  vat_included boolean,
  source_url text,
  quoted_at timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.assistant_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text,
  current_tender_id uuid references public.saved_tenders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.assistant_sessions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists saved_tenders_owner_idx on public.saved_tenders(owner_id, created_at desc);
create index if not exists tender_costings_owner_idx on public.tender_costings(owner_id, updated_at desc);
create index if not exists costing_items_costing_idx on public.costing_items(costing_id, line_no);
create index if not exists suppliers_owner_idx on public.suppliers(owner_id, business_name);
create index if not exists supplier_prices_item_idx on public.supplier_prices(owner_id, item_name);
create index if not exists assistant_messages_session_idx on public.assistant_messages(session_id, created_at);

alter table public.profiles enable row level security;
alter table public.saved_tenders enable row level security;
alter table public.tender_documents enable row level security;
alter table public.tender_costings enable row level security;
alter table public.costing_items enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_prices enable row level security;
alter table public.assistant_sessions enable row level security;
alter table public.assistant_messages enable row level security;

create policy "profiles_self" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "saved_tenders_owner" on public.saved_tenders for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "tender_documents_owner" on public.tender_documents for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "tender_costings_owner" on public.tender_costings for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "costing_items_owner" on public.costing_items for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "suppliers_owner" on public.suppliers for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "supplier_prices_owner" on public.supplier_prices for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "assistant_sessions_owner" on public.assistant_sessions for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "assistant_messages_owner" on public.assistant_messages for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
