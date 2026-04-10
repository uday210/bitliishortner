import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.link.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete link error:", error);
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const link = await prisma.link.findUnique({
      where: { id },
      include: {
        visits: { orderBy: { createdAt: "desc" }, take: 50 },
        _count: { select: { visits: true } },
      },
    });
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    return NextResponse.json(link);
  } catch (error) {
    console.error("Get link error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
