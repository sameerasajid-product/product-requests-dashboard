-- ============================================================
-- Migration: restrict signup to whitelisted department emails
-- Run this in Supabase SQL Editor if your project is already deployed.
-- (Fresh installs get this automatically from schema.sql.)
-- IMPORTANT: keep this list in sync with DEPARTMENT_EMAILS in src/lib/departments.ts
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
declare
  resolved_department text;
begin
  resolved_department := case lower(new.email)
    when 'operations@numbers.pk' then 'Operations'
    when 'sales@numbers.pk' then 'Sales'
    when 'finance@numbers.pk' then 'Finance'
    when 'marketing@numbers.pk' then 'Marketing'
    when 'support@numbers.pk' then 'Support'
    when 'product@numbers.pk' then 'Product'
    else null
  end;

  if resolved_department is null then
    raise exception 'Sign up with a recognized @numbers.pk department email.';
  end if;

  insert into public.profiles (id, email, full_name, department)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    resolved_department
  );
  return new;
end;
$$ language plpgsql security definer;
