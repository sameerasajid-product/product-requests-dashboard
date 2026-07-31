import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/AdminSidebar";
import DashboardView from "@/components/admin/DashboardView";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
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
    <div className="flex min-h-screen bg-admin-bg">
      <AdminSidebar fullName={profile?.full_name ?? null} />
      <main className="flex-1 min-w-0">
        <DashboardView />
      </main>
    </div>
  );
}
