import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";
import { nanoid } from "nanoid";

const PLAN_LIMITS: Record<string, number | null> = {
  free: 20,
  basic: 100,
  premium: 500,
  unlimited: null,
};

export async function GET() {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("userId", user.id)
      .single();

    if (!profile) {
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({ id: nanoid(), userId: user.id, subscription: "free" })
        .select()
        .single();
      profile = newProfile;
    }

    const subscription = profile?.subscription ?? "free";
    const limit = PLAN_LIMITS[subscription];

    // Count today's links
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: todayCount } = await supabase
      .from("links")
      .select("*", { count: "exact", head: true })
      .eq("userId", user.id)
      .gte("createdAt", todayStart.toISOString());

    return NextResponse.json({
      email: user.email,
      subscription,
      limit,
      todayCount: todayCount ?? 0,
    });
  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
