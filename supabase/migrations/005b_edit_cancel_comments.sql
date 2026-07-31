-- ============================================================
-- Migration: edit/cancel own request, comments.
-- Run this AFTER 005a_enum_cancelled.sql has been run and committed
-- (run 005a as its own query first, then run this one separately).
-- ============================================================

-- ----------------------------
-- COMMENTS TABLE
-- ----------------------------
create table if not exists request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists request_comments_request_id_idx on request_comments(request_id);

alter table request_comments enable row level security;

drop policy if exists "Users can view comments on their own requests" on request_comments;
create policy "Users can view comments on their own requests"
  on request_comments for select
  using (
    exists (
      select 1 from requests
      where requests.id = request_comments.request_id
      and requests.requested_by = auth.uid()
    )
  );

drop policy if exists "Admins can view all comments" on request_comments;
create policy "Admins can view all comments"
  on request_comments for select
  using (is_admin());

drop policy if exists "Users can comment on their own requests" on request_comments;
create policy "Users can comment on their own requests"
  on request_comments for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from requests
      where requests.id = request_comments.request_id
      and requests.requested_by = auth.uid()
    )
  );

drop policy if exists "Admins can comment on any request" on request_comments;
create policy "Admins can comment on any request"
  on request_comments for insert
  with check (author_id = auth.uid() and is_admin());

alter publication supabase_realtime add table request_comments;

-- ----------------------------
-- REQUESTER SELF-EDIT / CANCEL
-- ----------------------------
drop policy if exists "Requesters can edit or cancel their own submitted request" on requests;
create policy "Requesters can edit or cancel their own submitted request"
  on requests for update
  using (requested_by = auth.uid() and status = 'submitted')
  with check (requested_by = auth.uid());

create or replace function enforce_requester_update_limits()
returns trigger as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if is_admin() then
    return new;
  end if;

  if old.status != 'submitted' then
    raise exception 'You can only edit or cancel a request while it is still Submitted.';
  end if;

  if new.status not in ('submitted', 'cancelled') then
    raise exception 'You can only cancel your own request, not change it to another status.';
  end if;

  new.urgency := old.urgency;
  new.type := old.type;
  new.department := old.department;
  new.sprint_name := old.sprint_name;
  new.eta_label := old.eta_label;
  new.rating := old.rating;
  new.assigned_to := old.assigned_to;
  new.requested_by := old.requested_by;
  new.prd_problem_statement := old.prd_problem_statement;
  new.prd_user_stories := old.prd_user_stories;
  new.prd_acceptance_criteria := old.prd_acceptance_criteria;
  new.prd_affected_teams := old.prd_affected_teams;
  new.prd_success_metrics := old.prd_success_metrics;
  new.prd_additional_notes := old.prd_additional_notes;
  new.ticket_number := old.ticket_number;
  new.created_at := old.created_at;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists requests_enforce_requester_update_limits on requests;
create trigger requests_enforce_requester_update_limits
  before update on requests
  for each row execute function enforce_requester_update_limits();
