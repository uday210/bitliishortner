import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
  // Allow CORS preflight through
  if (req.method === "OPTIONS") return NextResponse.next();

  // Allow API key authenticated requests through
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer snip_")) return NextResponse.next();

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return response;
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/api/shorten", "/api/links/:path*"],
};
