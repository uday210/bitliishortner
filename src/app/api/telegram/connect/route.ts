import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";
import { nanoid } from "nanoid";

export async function POST() {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Generate a short one-time token
    const token = nanoid(16);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Store token in existing profile
    await supabase.from("profiles").update({
      telegramToken: token,
      telegramTokenExpiresAt: expiresAt,
    }).eq("userId", user.id);

    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    const deepLink = `https://t.me/${botUsername}?start=${token}`;

    return NextResponse.json({ token, deepLink });
  } catch (error) {
    console.error("Telegram connect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
