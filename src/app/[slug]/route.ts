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

  if (!link) {
    return NextResponse.redirect(new URL("/?error=not_found", req.url));
  }

  // Track click asynchronously (fire and forget)
  supabase
    .from("links")
    .update({ clicks: link.clicks + 1 })
    .eq("id", link.id)
    .then(() => {});

  supabase
    .from("visits")
    .insert({
      id: nanoid(),
      linkId: link.id,
      userAgent: req.headers.get("user-agent") ?? null,
      referer: req.headers.get("referer") ?? null,
    })
    .then(() => {});

  return NextResponse.redirect(link.originalUrl, { status: 301 });
}
