import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase, createAdminClient } from "@/lib/supabase/server";
import { MAX_OPEN_REQUESTS, OPEN_STATUSES } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prd, chatTranscript, userId, department } = body as {
    prd: {
      title: string;
      type: "new_feature" | "enhancement";
      urgency: "low" | "medium" | "high";
      problem_statement: string;
      user_stories: string[];
      acceptance_criteria: string[];
      affected_teams: string[];
      success_metrics: string;
      additional_notes: string;
    };
    chatTranscript: { role: string; content: string }[];
    userId: string;
    department: string | null;
  };

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: requesterProfile } = await admin
    .from("profiles")
    .select("is_active")
    .eq("id", userId)
    .single();

  if (requesterProfile && requesterProfile.is_active === false) {
    return NextResponse.json(
      { error: "This account has been deactivated. Contact your Product team admin." },
      { status: 403 }
    );
  }

  const { count: openCount, error: countError } = await admin
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("requested_by", userId)
    .in("status", OPEN_STATUSES);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((openCount ?? 0) >= MAX_OPEN_REQUESTS) {
    return NextResponse.json(
      {
        error: `You already have ${MAX_OPEN_REQUESTS} open requests. Wait for one to be Deployed or Rejected before submitting another.`,
      },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from("requests")
    .insert({
      title: prd.title,
      description: prd.problem_statement,
      type: prd.type,
      urgency: prd.urgency,
      department: department,
      requested_by: userId,
      prd_problem_statement: prd.problem_statement,
      prd_user_stories: prd.user_stories,
      prd_acceptance_criteria: prd.acceptance_criteria,
      prd_affected_teams: prd.affected_teams,
      prd_success_metrics: prd.success_metrics,
      prd_additional_notes: prd.additional_notes,
      chat_transcript: chatTranscript,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ request: data });
}
