import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase, createAdminClient } from "@/lib/supabase/server";

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
