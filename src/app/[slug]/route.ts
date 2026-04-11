import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { nanoid } from "nanoid";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: link } = await supabase
    .from("links")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!link || !link.isActive) {
    return NextResponse.redirect(new URL("/?error=not_found", req.url));
  }

  // Check expiry
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    // Auto-disable
    await supabase.from("links").update({ isActive: false }).eq("id", link.id);
    return NextResponse.redirect(new URL("/?error=expired", req.url));
  }

  // Password protected → redirect to password page
  if (link.password) {
    return NextResponse.redirect(new URL(`/p/${slug}`, req.url));
  }

  // Track click
  supabase.from("links").update({ clicks: link.clicks + 1 }).eq("id", link.id).then(() => {});
  supabase.from("visits").insert({
    id: nanoid(),
    linkId: link.id,
    userAgent: req.headers.get("user-agent") ?? null,
    referer: req.headers.get("referer") ?? null,
    country: req.headers.get("cf-ipcountry") ?? req.headers.get("x-vercel-ip-country") ?? null,
  }).then(() => {});

  return NextResponse.redirect(link.originalUrl, { status: 301 });
}
