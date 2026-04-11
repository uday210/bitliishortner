import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";
import { nanoid } from "nanoid";

const PLAN_LIMITS: Record<string, number | null> = {
  free: 20,
  basic: 100,
  premium: 500,
  unlimited: null,
};

export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null;
    let profile = null;

    // Try API key auth first
    const authHeader = req.headers.get("authorization");
    const apiKey = authHeader?.startsWith("Bearer snip_") ? authHeader.slice(7) : null;

    if (apiKey) {
      const { data: p } = await supabase.from("profiles").select("*").eq("apiKey", apiKey).single();
      if (!p) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
      profile = p;
      userId = p.userId;
    } else {
      const authClient = await createClient();
      const { data: { user } } = await authClient.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      userId = user.id;
    }

    if (!profile) {
      let { data: p } = await supabase.from("profiles").select("*").eq("userId", userId).single();
      if (!p) {
        const { data: np } = await supabase.from("profiles").insert({ id: nanoid(), userId, subscription: "free" }).select().single();
        p = np;
      }
      profile = p;
    }

    const subscription = profile?.subscription ?? "free";
    const limit = PLAN_LIMITS[subscription];

    if (limit !== null) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await supabase.from("links").select("*", { count: "exact", head: true }).eq("userId", userId).gte("createdAt", todayStart.toISOString());
      if (count !== null && count >= limit) {
        return NextResponse.json({ error: `Daily limit of ${limit} links reached. Upgrade your plan.`, limitReached: true }, { status: 429 });
      }
    }

    const { url, slug, title, password, tags, expiresInDays } = await req.json();

    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });
    try { new URL(url); } catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }

    const finalSlug = slug?.trim() || nanoid(7);

    if (slug?.trim()) {
      const { data: existing } = await supabase.from("links").select("id").eq("slug", finalSlug).single();
      if (existing) return NextResponse.json({ error: "This slug is already taken" }, { status: 409 });
    }

    let expiresAt: string | null = null;
    if (expiresInDays && expiresInDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() + expiresInDays);
      expiresAt = d.toISOString();
    }

    const { data, error } = await supabase
      .from("links")
      .insert({
        id: nanoid(),
        originalUrl: url,
        slug: finalSlug,
        title: title?.trim() || null,
        clicks: 0,
        userId,
        password: password?.trim() || null,
        tags: tags?.filter(Boolean) ?? [],
        expiresAt,
        isActive: true,
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
