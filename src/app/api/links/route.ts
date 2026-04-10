import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const links = await prisma.link.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { visits: true } },
      },
    });
    return NextResponse.json(links);
  } catch (error) {
    console.error("List links error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
