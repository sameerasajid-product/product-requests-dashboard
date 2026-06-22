import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import RequestsClient from "./RequestsClient";

export default async function RequestsPage() {
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

  if (profile?.role === "admin") {
    redirect("/admin");
  }

  return (
    <div>
      <Navbar fullName={profile?.full_name ?? null} />
      <RequestsClient userId={user.id} department={profile?.department ?? null} />
    </div>
  );
}
