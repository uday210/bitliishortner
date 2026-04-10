import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("links")
      .select("*")
      .order("createdAt", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("List links error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
