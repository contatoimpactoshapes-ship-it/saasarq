import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleAdminError } from "@/lib/admin";

export const dynamic = "force-dynamic";

const VALID_PLANS = ["FREE", "ESSENTIAL", "PREMIUM", "PREMIUM_PLUS", "PRO"] as const;

const querySchema = z.object({
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(100).default(20),
  search:  z.string().trim().max(200).optional(),
  plan:    z.enum(VALID_PLANS).optional(),
  // "true" | "false" string from query param — converted below
  isAdmin: z.enum(["true", "false"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const raw    = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Query inválida", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { page, limit, search, plan, isAdmin } = parsed.data;

    const where = {
      ...(search ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { name:  { contains: search, mode: "insensitive" as const } },
        ],
      } : {}),
      ...(plan    !== undefined ? { plan }                       : {}),
      ...(isAdmin !== undefined ? { isAdmin: isAdmin === "true" } : {}),
    };

    // $transaction guarantees findMany + count share the same DB snapshot
    // so pagination totals stay consistent under concurrent writes
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: {
          id:               true,
          email:            true,
          name:             true,
          plan:             true,
          credits:          true,
          isAdmin:          true,
          stripeCustomerId: true,
          stripeSubId:      true,
          createdAt:        true,
          updatedAt:        true,
          _count: { select: { generations: true, spaces: true } },
        },
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    return handleAdminError(err);
  }
}
