-- ============================================================
-- Migration: replace whitelist-based signup check with a simple
-- @numbers.pk domain check (individual employee accounts, not
-- shared department logins). Run this in Supabase SQL Editor.
-- This supersedes 002_department_signup_whitelist.sql.
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  if lower(new.email) not like '%@numbers.pk' then
    raise exception 'Sign up with your @numbers.pk work email.';
  end if;

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
