import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase, createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { STATUS_LABELS, RequestStatus } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { requestId, newStatus, sprintName, note } = body as {
    requestId: string;
    newStatus: RequestStatus;
    sprintName?: string;
    note?: string;
  };

  if (!requestId || !newStatus) {
    return NextResponse.json(
      { error: "requestId and newStatus are required" },
      { status: 400 }
    );
  }

  // Confirm the caller is a signed-in admin before doing anything privileged
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  // Use the admin client (service role) to perform the update + lookups
  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from("requests")
    .select("*, requester:profiles!requests_requested_by_fkey(email, full_name)")
    .eq("id", requestId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const { error: updateError } = await admin
    .from("requests")
    .update({
      status: newStatus,
      sprint_name: sprintName ?? existing.sprint_name,
      assigned_to: user.id,
    })
    .eq("id", requestId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Attach an optional note to the history row the DB trigger just created
  if (note) {
    await admin
      .from("status_history")
      .update({ note })
      .eq("request_id", requestId)
      .order("changed_at", { ascending: false })
      .limit(1);
  }

  // Email the requester when their request goes live
  if (newStatus === "deployed" && process.env.RESEND_API_KEY) {
    const requester = existing.requester as unknown as
      | { email: string; full_name: string | null }
      | null;

    if (requester?.email) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? "requests@yourcompany.com",
          to: requester.email,
          subject: `Deployed: ${existing.title} (PR-${String(existing.ticket_number).padStart(4, "0")})`,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 480px;">
              <p>Hi ${requester.full_name ?? "there"},</p>
              <p>Good news — the request you submitted is now live:</p>
              <p style="background:#F7F7F5; border-radius:8px; padding:16px; margin:16px 0;">
                <strong>PR-${String(existing.ticket_number).padStart(4, "0")}: ${existing.title}</strong>
              </p>
              <p>Thanks for flagging this — it's now part of the product.</p>
              ${appUrl ? `<p><a href="${appUrl}/requests">View it in the dashboard →</a></p>` : ""}
            </div>
          `,
        });
      } catch (emailError) {
        // Don't fail the status update if the email fails to send
        console.error("Failed to send deployed email:", emailError);
      }
    }
  }

  return NextResponse.json({ success: true });
}
