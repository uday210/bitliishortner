import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const link = await prisma.link.findUnique({ where: { slug } });

  if (!link) {
    return NextResponse.redirect(new URL("/?error=not_found", req.url));
  }

  // Track click asynchronously
  await Promise.all([
    prisma.link.update({
      where: { id: link.id },
      data: { clicks: { increment: 1 } },
    }),
    prisma.visit.create({
      data: {
        linkId: link.id,
        userAgent: req.headers.get("user-agent") ?? undefined,
        referer: req.headers.get("referer") ?? undefined,
      },
    }),
  ]);

  return NextResponse.redirect(link.originalUrl, { status: 301 });
}
