-- MMGC General Trading — Job application support system
-- Creates secure applicant records, job-application tracking, generated document drafts
-- and private Supabase Storage policies for uploaded CVs, PDFs and images.

begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create schema if not exists app_private;
revoke all on schema app_private from public;
revoke all on schema app_private from anon;
grant usage on schema app_private to authenticated;

create table if not exists app_private.staff_access (
  email extensions.citext primary key,
  role text not null check (role in ('owner', 'admin', 'staff')),
  created_at timestamptz not null default now()
);

alter table app_private.staff_access enable row level security;

drop policy if exists staff_access_no_client_access on app_private.staff_access;
create policy staff_access_no_client_access
on app_private.staff_access
for all
to authenticated
using (false)
with check (false);

insert into app_private.staff_access (email, role)
values ('mmgcgeneraltrading@gmail.com', 'owner')
on conflict (email) do update set role = excluded.role;

create or replace function app_private.current_staff_role()
returns text
language sql
stable
security definer
set search_path = app_private, auth
as $$
  select s.role
  from app_private.staff_access s
  join auth.users u on lower(u.email) = lower(s.email::text)
  where u.id = (select auth.uid())
  limit 1
$$;

revoke all on function app_private.current_staff_role() from public;
grant execute on function app_private.current_staff_role() to authenticated;

create or replace function app_private.is_mmgc_staff()
returns boolean
language sql
stable
security definer
set search_path = app_private
as $$
  select app_private.current_staff_role() is not null
$$;

revoke all on function app_private.is_mmgc_staff() from public;
grant execute on function app_private.is_mmgc_staff() to authenticated;

create or replace function public.current_mmgc_staff_role()
returns text
language sql
stable
set search_path = app_private
as $$
  select app_private.current_staff_role()
$$;

revoke all on function public.current_mmgc_staff_role() from public;
grant execute on function public.current_mmgc_staff_role() to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  location text,
  profile_type text not null default 'applicant' check (profile_type in ('applicant', 'customer', 'supplier')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_posts (
  id uuid primary key default extensions.gen_random_uuid(),
  source_id text unique,
  title text not null,
  employer text not null,
  location text,
  category text,
  arrangement text,
  summary text,
  requirements text[] not null default '{}'::text[],
  required_documents text[] not null default array['CV', 'Application letter']::text[],
  application_method text not null default 'not_specified' check (application_method in ('online', 'email', 'hand_delivered', 'not_specified')),
  source_url text,
  deadline timestamptz,
  hand_delivery_required boolean not null default false,
  mmgc_apply_enabled boolean not null default true,
  status text not null default 'published' check (status in ('draft', 'published', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.job_application_ref_seq;

create table if not exists public.job_applications (
  id uuid primary key default extensions.gen_random_uuid(),
  reference_no text not null unique default (
    'MMGC-JOB-' || to_char(now(), 'YYYY') || '-' ||
    lpad(nextval('public.job_application_ref_seq')::text, 3, '0')
  ),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_post_id uuid references public.job_posts(id) on delete set null,
  job_post_external_id text,
  job_title text not null,
  employer text,
  source_url text,
  deadline timestamptz,
  application_method text not null default 'not_specified' check (application_method in ('online', 'email', 'hand_delivered', 'not_specified')),
  applicant_name text not null,
  applicant_email text,
  phone text not null,
  location text,
  highest_qualification text,
  career_summary text,
  education_summary text,
  experience_summary text,
  skills text,
  current_cv_text text,
  why_right_fit text,
  referees text,
  wants_new_cv boolean not null default false,
  wants_cv_tailoring boolean not null default false,
  wants_application_letter boolean not null default false,
  wants_printing boolean not null default false,
  hand_delivery_required boolean not null default false,
  shop_collection_required boolean not null default false,
  service_level text not null default 'self_service' check (service_level in ('self_service', 'mmgc_assisted', 'print_only')),
  status text not null default 'received' check (
    status in (
      'received',
      'reviewing',
      'cv_requested',
      'cv_ready',
      'letter_ready',
      'print_packaging',
      'ready_for_collection',
      'submitted',
      'completed',
      'cancelled'
    )
  ),
  collection_status text not null default 'not_required' check (
    collection_status in ('not_required', 'pending', 'ready', 'collected')
  ),
  public_notes text,
  internal_notes text,
  privacy_consent boolean not null default false check (privacy_consent = true),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.application_documents (
  id uuid primary key default extensions.gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null default 'other' check (
    document_type in ('cv', 'application_letter', 'certificate', 'id_copy', 'reference', 'job_post', 'photo', 'other')
  ),
  file_path text not null,
  file_name text not null,
  file_mime text,
  file_size bigint,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.generated_application_documents (
  id uuid primary key default extensions.gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('cv', 'application_letter')),
  title text not null,
  content text not null,
  generation_mode text not null default 'website_draft' check (generation_mode in ('website_draft', 'ai_assisted', 'mmgc_staff')),
  print_requested boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.application_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  sender_type text not null check (sender_type in ('applicant', 'staff', 'system')),
  message text not null,
  created_at timestamptz not null default now()
);

create or replace function app_private.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function app_private.touch_updated_at();

drop trigger if exists job_posts_touch_updated_at on public.job_posts;
create trigger job_posts_touch_updated_at
before update on public.job_posts
for each row execute function app_private.touch_updated_at();

drop trigger if exists job_applications_touch_updated_at on public.job_applications;
create trigger job_applications_touch_updated_at
before update on public.job_applications
for each row execute function app_private.touch_updated_at();

drop trigger if exists generated_docs_touch_updated_at on public.generated_application_documents;
create trigger generated_docs_touch_updated_at
before update on public.generated_application_documents
for each row execute function app_private.touch_updated_at();

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    phone = coalesce(nullif(excluded.phone, ''), public.profiles.phone),
    updated_at = now();
  return new;
end;
$$;

revoke all on function app_private.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.job_posts enable row level security;
alter table public.job_applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.generated_application_documents enable row level security;
alter table public.application_messages enable row level security;

drop policy if exists profiles_select_own_or_staff on public.profiles;
create policy profiles_select_own_or_staff
on public.profiles
for select
to authenticated
using (id = (select auth.uid()) or app_private.is_mmgc_staff());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_staff_update on public.profiles;
drop policy if exists profiles_update_own_or_staff on public.profiles;
create policy profiles_update_own_or_staff
on public.profiles
for update
to authenticated
using (id = (select auth.uid()) or app_private.is_mmgc_staff())
with check (
  app_private.is_mmgc_staff()
  or (
    id = (select auth.uid())
    and profile_type in ('applicant', 'customer', 'supplier')
  )
);

drop policy if exists job_posts_public_read_published on public.job_posts;
drop policy if exists job_posts_staff_manage on public.job_posts;
drop policy if exists job_posts_anon_read_published on public.job_posts;
drop policy if exists job_posts_authenticated_read_published_or_staff on public.job_posts;
drop policy if exists job_posts_staff_insert on public.job_posts;
drop policy if exists job_posts_staff_update on public.job_posts;
drop policy if exists job_posts_staff_delete on public.job_posts;

create policy job_posts_anon_read_published
on public.job_posts
for select
to anon
using (status = 'published');

create policy job_posts_authenticated_read_published_or_staff
on public.job_posts
for select
to authenticated
using (status = 'published' or app_private.is_mmgc_staff());

create policy job_posts_staff_insert
on public.job_posts
for insert
to authenticated
with check (app_private.is_mmgc_staff());

create policy job_posts_staff_update
on public.job_posts
for update
to authenticated
using (app_private.is_mmgc_staff())
with check (app_private.is_mmgc_staff());

create policy job_posts_staff_delete
on public.job_posts
for delete
to authenticated
using (app_private.is_mmgc_staff());

drop policy if exists job_applications_select_own_or_staff on public.job_applications;
create policy job_applications_select_own_or_staff
on public.job_applications
for select
to authenticated
using (user_id = (select auth.uid()) or app_private.is_mmgc_staff());

drop policy if exists job_applications_insert_own on public.job_applications;
create policy job_applications_insert_own
on public.job_applications
for insert
to authenticated
with check (user_id = (select auth.uid()) and privacy_consent = true);

drop policy if exists job_applications_update_own on public.job_applications;
drop policy if exists job_applications_staff_update on public.job_applications;
drop policy if exists job_applications_update_own_or_staff on public.job_applications;
drop policy if exists job_applications_staff_status_update on public.job_applications;
create policy job_applications_staff_status_update
on public.job_applications
for update
to authenticated
using (app_private.is_mmgc_staff())
with check (app_private.is_mmgc_staff());

drop policy if exists application_documents_select_own_or_staff on public.application_documents;
create policy application_documents_select_own_or_staff
on public.application_documents
for select
to authenticated
using (
  user_id = (select auth.uid())
  or app_private.is_mmgc_staff()
);

drop policy if exists application_documents_insert_own on public.application_documents;
create policy application_documents_insert_own
on public.application_documents
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.job_applications ja
    where ja.id = application_id
      and ja.user_id = (select auth.uid())
  )
);

drop policy if exists generated_docs_select_own_or_staff on public.generated_application_documents;
create policy generated_docs_select_own_or_staff
on public.generated_application_documents
for select
to authenticated
using (
  user_id = (select auth.uid())
  or app_private.is_mmgc_staff()
);

drop policy if exists generated_docs_insert_own on public.generated_application_documents;
create policy generated_docs_insert_own
on public.generated_application_documents
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.job_applications ja
    where ja.id = application_id
      and ja.user_id = (select auth.uid())
  )
);

drop policy if exists generated_docs_update_own_or_staff on public.generated_application_documents;
create policy generated_docs_update_own_or_staff
on public.generated_application_documents
for update
to authenticated
using (user_id = (select auth.uid()) or app_private.is_mmgc_staff())
with check (user_id = (select auth.uid()) or app_private.is_mmgc_staff());

drop policy if exists application_messages_select_own_or_staff on public.application_messages;
create policy application_messages_select_own_or_staff
on public.application_messages
for select
to authenticated
using (
  app_private.is_mmgc_staff()
  or exists (
    select 1
    from public.job_applications ja
    where ja.id = application_id
      and ja.user_id = (select auth.uid())
  )
);

drop policy if exists application_messages_insert_own_or_staff on public.application_messages;
create policy application_messages_insert_own_or_staff
on public.application_messages
for insert
to authenticated
with check (
  app_private.is_mmgc_staff()
  or (
    sender_type = 'applicant'
    and user_id = (select auth.uid())
    and exists (
      select 1
      from public.job_applications ja
      where ja.id = application_id
        and ja.user_id = (select auth.uid())
    )
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-applications',
  'job-applications',
  false,
  15728640,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists job_application_files_select_own_or_staff on storage.objects;
create policy job_application_files_select_own_or_staff
on storage.objects
for select
to authenticated
using (
  bucket_id = 'job-applications'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or app_private.is_mmgc_staff()
  )
);

drop policy if exists job_application_files_insert_own on storage.objects;
create policy job_application_files_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'job-applications'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.extension(name)) in ('pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif')
);

drop policy if exists job_application_files_delete_own_or_staff on storage.objects;
create policy job_application_files_delete_own_or_staff
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'job-applications'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or app_private.is_mmgc_staff()
  )
);

create index if not exists job_applications_user_id_idx on public.job_applications (user_id);
create index if not exists job_applications_job_post_id_idx on public.job_applications (job_post_id);
create index if not exists job_applications_status_created_idx on public.job_applications (status, created_at desc);
create index if not exists application_documents_application_id_idx on public.application_documents (application_id);
create index if not exists application_documents_user_id_idx on public.application_documents (user_id);
create index if not exists generated_application_documents_application_id_idx on public.generated_application_documents (application_id);
create index if not exists generated_application_documents_user_id_idx on public.generated_application_documents (user_id);
create index if not exists application_messages_application_id_idx on public.application_messages (application_id);
create index if not exists application_messages_user_id_idx on public.application_messages (user_id);

grant usage on schema public to anon, authenticated;
grant select on public.job_posts to anon;
grant select, insert, update, delete on public.job_posts to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.job_applications to authenticated;
grant select, insert on public.application_documents to authenticated;
grant select, insert, update on public.generated_application_documents to authenticated;
grant select, insert on public.application_messages to authenticated;
grant usage, select on sequence public.job_application_ref_seq to authenticated;

comment on table public.job_applications is 'Applicant requests for MMGC CV, application-letter, printing and job-application support.';
comment on table public.application_documents is 'Private metadata for uploaded CVs, PDFs, job-post screenshots and supporting images.';
comment on table public.generated_application_documents is 'Website or AI generated CV/application-letter drafts for applicant review and MMGC printing.';

commit;
