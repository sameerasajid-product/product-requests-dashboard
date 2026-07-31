-- ============================================================
-- Migration: edit/cancel own request, comments, and the DB-side
-- support bulk admin actions rely on (no new tables needed for
-- bulk actions itself — it just reuses the existing update-status route).
--
-- IMPORTANT: run this in TWO SEPARATE queries in Supabase SQL Editor,
-- in order. Postgres won't let a new enum value be used in the same
-- transaction/query it was added in.
-- ============================================================

-- ========== QUERY 1 — run this first, on its own ==========
alter type request_status add value if not exists 'cancelled';
