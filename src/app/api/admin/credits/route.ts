import { NextRequest, NextResponse } from "next/server";
import { prisma }                   from "@/lib/prisma";
import { requireAdmin, handleAdminError } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const page    = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const perPage = 50;
    const skip    = (page - 1) * perPage;

    const h24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalCredits,
      burnRate24h,
      issued30d,
      txTotal,
      transactions,
      topConsumersRaw,
    ] = await Promise.all([
      prisma.user.aggregate({ _sum: { credits: true } }),
      prisma.creditTransaction.aggregate({
        where: { type: "DEBIT", createdAt: { gte: h24 } },
        _sum:  { amount: true },
      }),
      prisma.creditTransaction.aggregate({
        where: { type: "PURCHASE", createdAt: { gte: d30 } },
        _sum:  { amount: true },
      }),
      prisma.creditTransaction.count(),
      prisma.creditTransaction.findMany({
        skip,
        take:    perPage,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true, name: true } } },
      }),
      // DEBIT amounts are negative — ascending sum = most consumed first
      prisma.creditTransaction.groupBy({
        by:    ["userId"],
        where: { type: "DEBIT", createdAt: { gte: d30 } },
        _sum:  { amount: true },
        orderBy: { _sum: { amount: "asc" } },
        take:  5,
      }),
    ]);

    const topUserIds = topConsumersRaw.map((c) => c.userId);
    const topUsers   = await prisma.user.findMany({
      where:  { id: { in: topUserIds } },
      select: { id: true, email: true, name: true, plan: true },
    });
    const userMap = Object.fromEntries(topUsers.map((u) => [u.id, u]));

    return NextResponse.json({
      totalCreditsInCirculation: totalCredits._sum.credits ?? 0,
      burnRate24h:  Math.abs(burnRate24h._sum.amount ?? 0),
      issued30d:    issued30d._sum.amount ?? 0,
      topConsumers: topConsumersRaw.map((c) => ({
        userId:   c.userId,
        email:    userMap[c.userId]?.email ?? "—",
        name:     userMap[c.userId]?.name  ?? null,
        plan:     userMap[c.userId]?.plan  ?? "—",
        consumed: Math.abs(c._sum.amount   ?? 0),
      })),
      transactions: transactions.map((tx) => ({
        id:          tx.id,
        userId:      tx.userId,
        userEmail:   tx.user?.email ?? "—",
        userName:    tx.user?.name  ?? null,
        amount:      tx.amount,
        type:        tx.type,
        description: tx.description ?? null,
        createdAt:   tx.createdAt.toISOString(),
      })),
      pagination: { page, perPage, total: txTotal, totalPages: Math.ceil(txTotal / perPage) },
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    return handleAdminError(err);
  }
}
