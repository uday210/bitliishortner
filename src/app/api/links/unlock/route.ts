import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  const { slug, password } = await req.json();

  const { data: link } = await supabase
    .from("links")
    .select("*")
    .eq("slug", slug)
    .eq("isActive", true)
    .single();

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  if (link.password !== password) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  // Track click
  supabase.from("links").update({ clicks: link.clicks + 1 }).eq("id", link.id).then(() => {});
  supabase.from("visits").insert({
    id: nanoid(),
    linkId: link.id,
    userAgent: req.headers.get("user-agent") ?? null,
    referer: req.headers.get("referer") ?? null,
  }).then(() => {});

  return NextResponse.json({ url: link.originalUrl });
}
