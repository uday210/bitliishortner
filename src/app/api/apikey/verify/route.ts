import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const apiKey = authHeader?.startsWith("Bearer snip_") ? authHeader.slice(7) : null;

  if (!apiKey) {
    return NextResponse.json({ valid: false }, { status: 401, headers: CORS });
  }

  const { data } = await supabase.from("profiles").select("userId").eq("apiKey", apiKey).single();

  if (!data) {
    return NextResponse.json({ valid: false }, { status: 401, headers: CORS });
  }

  return NextResponse.json({ valid: true }, { headers: CORS });
}
