-- ============================================================
-- Product Requests Dashboard — Supabase schema
-- Run this in Supabase Dashboard > SQL Editor (entire file at once)
-- ============================================================

-- Extension for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------
-- ENUM TYPES
-- ----------------------------
create type request_status as enum (
  'in_review',
  'discussion_with_tech',
  'in_sprint',
  'deployed',
  'delayed_next_sprint'
);

create type request_type as enum (
  'new_feature',
  'enhancement',
  'bug'
);

create type request_urgency as enum (
  'low',
  'medium',
  'high'
);

create type user_role as enum (
  'requester',
  'admin'
);

-- ----------------------------
-- PROFILES
-- One row per auth.users user. Created automatically on signup via trigger below.
-- ----------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  department text,
  role user_role not null default 'requester',
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, department)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'department'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------
-- REQUESTS
-- ----------------------------
create table requests (
  id uuid primary key default gen_random_uuid(),
  ticket_number serial,                       -- human-friendly sequential number, shown as PR-0001
  title text not null,
  description text not null,
  type request_type not null default 'enhancement',
  urgency request_urgency not null default 'medium',
  department text,
  status request_status not null default 'in_review',
  sprint_name text,                            -- e.g. "Sprint 24" once it's scheduled
  requested_by uuid not null references profiles(id) on delete cascade,
  assigned_to uuid references profiles(id),     -- which product team member owns it
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index requests_requested_by_idx on requests(requested_by);
create index requests_status_idx on requests(status);

-- Keep updated_at fresh
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger requests_set_updated_at
  before update on requests
  for each row execute function set_updated_at();

-- ----------------------------
-- STATUS HISTORY
-- Every status change is logged here -> powers the timeline UI + audit trail
-- ----------------------------
create table status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  old_status request_status,
  new_status request_status not null,
  note text,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);

create index status_history_request_id_idx on status_history(request_id);

-- Automatically log a history row whenever a request's status changes
create or replace function log_status_change()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    insert into status_history (request_id, old_status, new_status, changed_by)
    values (new.id, null, new.status, new.requested_by);
  elsif (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    insert into status_history (request_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, new.assigned_to);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger requests_log_status_change
  after insert or update on requests
  for each row execute function log_status_change();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table requests enable row level security;
alter table status_history enable row level security;

-- Helper: is the current user a product-team admin?
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- PROFILES policies
create policy "Users can view their own profile"
  on profiles for select
  using (id = auth.uid());

create policy "Admins can view all profiles"
  on profiles for select
  using (is_admin());

create policy "Users can update their own profile"
  on profiles for update
  using (id = auth.uid());

-- REQUESTS policies
create policy "Users can view their own requests"
  on requests for select
  using (requested_by = auth.uid());

create policy "Admins can view all requests"
  on requests for select
  using (is_admin());

create policy "Users can create their own requests"
  on requests for insert
  with check (requested_by = auth.uid());

create policy "Admins can update any request"
  on requests for update
  using (is_admin());

-- STATUS HISTORY policies
create policy "Users can view history for their own requests"
  on status_history for select
  using (
    exists (
      select 1 from requests
      where requests.id = status_history.request_id
      and requests.requested_by = auth.uid()
    )
  );

create policy "Admins can view all history"
  on status_history for select
  using (is_admin());

-- ============================================================
-- REALTIME
-- Enable realtime so the dashboard updates live without a refresh
-- ============================================================
alter publication supabase_realtime add table requests;
alter publication supabase_realtime add table status_history;

-- ============================================================
-- MAKE SOMEONE A PRODUCT-TEAM ADMIN (run manually, per person)
-- ============================================================
-- update profiles set role = 'admin' where email = 'product-lead@yourcompany.com';
