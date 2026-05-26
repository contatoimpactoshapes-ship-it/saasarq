import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleAdminError } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { CREDIT_PACKS } from "@/lib/economy/pricing";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const page    = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const perPage = 50;
    const skip    = (page - 1) * perPage;

    const [purchases, total] = await Promise.all([
      prisma.packPurchase.findMany({
        skip,
        take:    perPage,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true, plan: true } } },
      }),
      prisma.packPurchase.count(),
    ]);

    const packNameMap = Object.fromEntries(CREDIT_PACKS.map((p) => [p.id, p.name]));

    return NextResponse.json({
      purchases: purchases.map((p) => ({
        id:             p.id,
        userId:         p.userId,
        userEmail:      (p as typeof p & { user?: { email: string; plan: string } }).user?.email ?? "—",
        userPlan:       (p as typeof p & { user?: { email: string; plan: string } }).user?.plan ?? "—",
        packId:         p.packId,
        packName:       packNameMap[p.packId] ?? p.packId,
        creditsAdded:   p.creditsAdded,
        bonusCredits:   p.bonusCredits,
        totalCredits:   p.creditsAdded + p.bonusCredits,
        amountPaidBRL:  p.amountPaidBRL,
        stripeSessionId: p.stripeSessionId,
        createdAt:      p.createdAt.toISOString(),
      })),
      pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    });
  } catch (err) {
    return handleAdminError(err);
  }
}
