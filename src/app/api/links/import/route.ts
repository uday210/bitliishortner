import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";
import { nanoid } from "nanoid";

const PLAN_LIMITS: Record<string, number | null> = {
  free: 20, basic: 100, premium: 500, unlimited: null,
};

export async function POST(req: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let { data: profile } = await supabase.from("profiles").select("*").eq("userId", user.id).single();
    if (!profile) {
      const { data: np } = await supabase.from("profiles").insert({ id: nanoid(), userId: user.id, subscription: "free" }).select().single();
      profile = np;
    }

    const subscription = profile?.subscription ?? "free";
    const limit = PLAN_LIMITS[subscription];

    const { rows } = await req.json() as { rows: { url: string; slug?: string; title?: string; tags?: string; expiresInDays?: number }[] };

    if (!rows?.length) return NextResponse.json({ error: "No rows provided" }, { status: 400 });

    // Check remaining daily quota
    if (limit !== null) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await supabase.from("links").select("*", { count: "exact", head: true }).eq("userId", user.id).gte("createdAt", todayStart.toISOString());
      const remaining = limit - (count ?? 0);
      if (remaining <= 0) return NextResponse.json({ error: "Daily limit reached", limitReached: true }, { status: 429 });
      if (rows.length > remaining) return NextResponse.json({ error: `Only ${remaining} links remaining in your daily quota` }, { status: 429 });
    }

    const results: { url: string; slug: string; success: boolean; error?: string }[] = [];

    for (const row of rows) {
      if (!row.url) { results.push({ url: "", slug: "", success: false, error: "Missing URL" }); continue; }
      try { new URL(row.url); } catch { results.push({ url: row.url, slug: "", success: false, error: "Invalid URL" }); continue; }

      const slug = row.slug?.trim() || nanoid(7);

      // Check slug uniqueness
      const { data: existing } = await supabase.from("links").select("id").eq("slug", slug).single();
      if (existing) { results.push({ url: row.url, slug, success: false, error: "Slug taken" }); continue; }

      let expiresAt: string | null = null;
      if (row.expiresInDays && row.expiresInDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + Number(row.expiresInDays));
        expiresAt = d.toISOString();
      }

      const tags = row.tags ? row.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

      const { error } = await supabase.from("links").insert({
        id: nanoid(),
        originalUrl: row.url,
        slug,
        title: row.title?.trim() || null,
        clicks: 0,
        userId: user.id,
        tags,
        expiresAt,
        isActive: true,
        password: null,
      });

      results.push({ url: row.url, slug, success: !error, error: error?.message });
    }

    return NextResponse.json({ results, imported: results.filter((r) => r.success).length, failed: results.filter((r) => !r.success).length });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
