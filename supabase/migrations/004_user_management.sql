-- ============================================================
-- Migration: user management (deactivate accounts, admin role changes)
-- Run this in Supabase SQL Editor.
-- ============================================================

-- Add is_active column (defaults everyone to active — no one gets locked out)
alter table profiles add column if not exists is_active boolean not null default true;

-- Allow admins to update any profile (role, is_active) — needed for the
-- new Admin > Users screen. Users can still only update their own profile
-- otherwise (unchanged).
drop policy if exists "Admins can update any profile" on profiles;
create policy "Admins can update any profile"
  on profiles for update
  using (is_admin())
  with check (is_admin());
