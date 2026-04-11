import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Verify link belongs to user
    const { data: link } = await supabase.from("links").select("id, userId, clicks, createdAt").eq("id", id).single();
    if (!link || link.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get all visits for this link
    const { data: visits } = await supabase
      .from("visits")
      .select("createdAt, referer, country, userAgent")
      .eq("linkId", id)
      .order("createdAt", { ascending: true });

    const rows = visits ?? [];

    // Clicks per day (last 30 days)
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    rows.forEach((v) => {
      const day = new Date(v.createdAt).toISOString().slice(0, 10);
      if (day in days) days[day]++;
    });
    const clicksPerDay = Object.entries(days).map(([date, count]) => ({ date, count }));

    // Top referrers
    const refMap: Record<string, number> = {};
    rows.forEach((v) => {
      let ref = "Direct";
      if (v.referer) {
        try { ref = new URL(v.referer).hostname; } catch { ref = v.referer; }
      }
      refMap[ref] = (refMap[ref] ?? 0) + 1;
    });
    const topReferrers = Object.entries(refMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    // Top countries
    const countryMap: Record<string, number> = {};
    rows.forEach((v) => {
      const c = v.country ?? "Unknown";
      countryMap[c] = (countryMap[c] ?? 0) + 1;
    });
    const topCountries = Object.entries(countryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    // Device breakdown from userAgent
    const deviceMap: Record<string, number> = { Mobile: 0, Tablet: 0, Desktop: 0 };
    rows.forEach((v) => {
      const ua = (v.userAgent ?? "").toLowerCase();
      if (/tablet|ipad/.test(ua)) deviceMap.Tablet++;
      else if (/mobile|android|iphone/.test(ua)) deviceMap.Mobile++;
      else deviceMap.Desktop++;
    });
    const devices = Object.entries(deviceMap).map(([name, count]) => ({ name, count }));

    return NextResponse.json({ totalClicks: link.clicks, clicksPerDay, topReferrers, topCountries, devices });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
