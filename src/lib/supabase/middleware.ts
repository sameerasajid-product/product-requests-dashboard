import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/login" || path === "/signup";

  // Not logged in and trying to hit a protected page -> send to login
  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    // Deactivated account -> sign out immediately, everywhere, every request
    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("deactivated", "1");
      return NextResponse.redirect(url);
    }

    // Logged in and sitting on an auth page -> send to the right dashboard
    if (isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = profile?.role === "admin" ? "/admin" : "/requests";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
