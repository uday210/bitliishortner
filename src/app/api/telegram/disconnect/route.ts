import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";

export async function POST() {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await supabase.from("profiles").update({
      telegramChatId: null,
      telegramToken: null,
      telegramTokenExpiresAt: null,
    }).eq("userId", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram disconnect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
