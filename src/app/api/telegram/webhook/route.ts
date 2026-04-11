import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { nanoid } from "nanoid";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL!;

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

function isValidUrl(str: string) {
  try { new URL(str); return true; } catch { return false; }
}

const PLAN_LIMITS: Record<string, number | null> = {
  free: 20, basic: 100, premium: 500, unlimited: null,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId: number = message.chat.id;
    const text: string = (message.text ?? "").trim();

    // Handle /start TOKEN — link Telegram account
    if (text.startsWith("/start")) {
      const token = text.split(" ")[1];
      if (!token) {
        await sendMessage(chatId, "👋 Welcome to *Snip*!\n\nTo connect your account, click *Connect Telegram* in your Snip dashboard and use the link provided.");
        return NextResponse.json({ ok: true });
      }

      // Find profile with this token
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("telegramToken", token)
        .single();

      if (!profile) {
        await sendMessage(chatId, "❌ This link is invalid or has expired. Please generate a new one from your dashboard.");
        return NextResponse.json({ ok: true });
      }

      if (profile.telegramTokenExpiresAt && new Date(profile.telegramTokenExpiresAt) < new Date()) {
        await sendMessage(chatId, "⏰ This link has expired. Please generate a new one from your dashboard.");
        return NextResponse.json({ ok: true });
      }

      // Save chatId, clear token
      await supabase.from("profiles").update({
        telegramChatId: String(chatId),
        telegramToken: null,
        telegramTokenExpiresAt: null,
      }).eq("id", profile.id);

      await sendMessage(chatId, "✅ *Snip connected!*\n\nJust send me any URL and I'll shorten it for you instantly.");
      return NextResponse.json({ ok: true });
    }

    // Handle /help
    if (text === "/help") {
      await sendMessage(chatId, "📎 *Snip Bot*\n\nSend me any URL and I'll shorten it.\n\nCommands:\n/help — show this message\n/disconnect — unlink your Snip account");
      return NextResponse.json({ ok: true });
    }

    // Handle /disconnect
    if (text === "/disconnect") {
      await supabase.from("profiles").update({ telegramChatId: null }).eq("telegramChatId", String(chatId));
      await sendMessage(chatId, "👋 Disconnected from Snip. You can reconnect anytime from your dashboard.");
      return NextResponse.json({ ok: true });
    }

    // Handle URL shortening
    const url = text;
    if (!isValidUrl(url)) {
      await sendMessage(chatId, "⚠️ Please send a valid URL (e.g. https://example.com)");
      return NextResponse.json({ ok: true });
    }

    // Find user by chatId
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("telegramChatId", String(chatId))
      .single();

    if (!profile) {
      await sendMessage(chatId, "❌ Your account is not connected. Please go to your Snip dashboard and click *Connect Telegram*.");
      return NextResponse.json({ ok: true });
    }

    // Check daily limit
    const limit = PLAN_LIMITS[profile.subscription ?? "free"];
    if (limit !== null) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await supabase.from("links").select("*", { count: "exact", head: true })
        .eq("userId", profile.userId).gte("createdAt", todayStart.toISOString());
      if ((count ?? 0) >= limit) {
        await sendMessage(chatId, `⛔ You've reached your daily limit of ${limit} links. Upgrade your plan at ${BASE_URL}/dashboard`);
        return NextResponse.json({ ok: true });
      }
    }

    // Create short link
    const slug = nanoid(7);
    const { error } = await supabase.from("links").insert({
      id: nanoid(),
      originalUrl: url,
      slug,
      title: null,
      clicks: 0,
      userId: profile.userId,
      tags: [],
      expiresAt: null,
      isActive: true,
      password: null,
    });

    if (error) {
      await sendMessage(chatId, "❌ Failed to shorten the link. Please try again.");
      return NextResponse.json({ ok: true });
    }

    const shortUrl = `${BASE_URL}/${slug}`;
    await sendMessage(chatId, `✅ *Link shortened!*\n\n\`${shortUrl}\`\n\n[Open dashboard](${BASE_URL}/dashboard)`);
    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}
