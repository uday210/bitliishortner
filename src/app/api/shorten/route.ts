import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const { url, slug, title } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const finalSlug = slug?.trim() || nanoid(7);

    if (slug?.trim()) {
      const { data: existing } = await supabase
        .from("links")
        .select("id")
        .eq("slug", finalSlug)
        .single();

      if (existing) {
        return NextResponse.json({ error: "This slug is already taken" }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from("links")
      .insert({
        id: nanoid(),
        originalUrl: url,
        slug: finalSlug,
        title: title?.trim() || null,
        clicks: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Shorten error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
