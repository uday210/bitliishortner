import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const valid = token ? await verifySessionToken(token) : false;

  if (!valid) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Only protect the homepage, dashboard, and API routes
  // /[slug] redirect routes and /login are NOT matched → always public
  matcher: ["/", "/dashboard/:path*", "/api/shorten", "/api/links/:path*"],
};
