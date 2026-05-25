import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleAdminError } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;

    // Single $transaction → consistent snapshot for user + generations + transactions
    const [user, recentGenerations, recentTransactions] = await prisma.$transaction([
      prisma.user.findFirst({
        where: { id },
        select: {
          id:               true,
          email:            true,
          name:             true,
          avatarUrl:        true,
          plan:             true,
          credits:          true,
          isAdmin:          true,
          creditsReset:     true,
          stripeCustomerId: true,
          stripeSubId:      true,
          createdAt:        true,
          updatedAt:        true,
          _count: { select: { generations: true, spaces: true, projects: true } },
        },
      }),
      prisma.generation.findMany({
        where: { userId: id },
        select: {
          id:           true,
          tool:         true,
          model:        true,
          prompt:       true,
          status:       true,
          creditsCost:  true,
          outputUrls:   true,
          errorMessage: true,
          createdAt:    true,
          updatedAt:    true,
        },
        orderBy: { createdAt: "desc" },
        take:    20,
      }),
      prisma.creditTransaction.findMany({
        where:   { userId: id },
        select: {
          id:          true,
          amount:      true,
          type:        true,
          description: true,
          createdAt:   true,
        },
        orderBy: { createdAt: "desc" },
        take:    20,
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user, recentGenerations, recentTransactions });
  } catch (err) {
    return handleAdminError(err);
  }
}
