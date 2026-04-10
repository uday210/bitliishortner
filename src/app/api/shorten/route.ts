import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const { url, slug, title } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const finalSlug = slug?.trim() || nanoid(7);

    // Check slug uniqueness if custom
    if (slug?.trim()) {
      const existing = await prisma.link.findUnique({
        where: { slug: finalSlug },
      });
      if (existing) {
        return NextResponse.json(
          { error: "This slug is already taken" },
          { status: 409 }
        );
      }
    }

    const link = await prisma.link.create({
      data: {
        originalUrl: url,
        slug: finalSlug,
        title: title?.trim() || null,
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("Shorten error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
