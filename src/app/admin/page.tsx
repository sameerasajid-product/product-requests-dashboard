import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import KanbanBoard from "@/components/KanbanBoard";

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/requests");
  }

  return (
    <div>
      <Navbar isAdmin={true} fullName={profile?.full_name ?? null} />
      <KanbanBoard />
    </div>
  );
}
