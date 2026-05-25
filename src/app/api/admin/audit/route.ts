import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleAdminError } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Synthetic audit event built from existing tables.
// Real AdminLog table will replace this in a future migration.
interface SyntheticEvent {
  id:        string;
  type:      string;
  actorId:   string;
  actorEmail: string;
  targetId:  string;
  summary:   string;
  metadata:  Record<string, unknown>;
  timestamp: string;
}

const querySchema = z.object({
  limit:    z.coerce.number().int().min(1).max(200).default(50),
  cursor:   z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo:   z.string().optional(),
  type:     z.enum(["USER_SIGNUP", "GENERATION", "CREDIT_PURCHASE", "CREDIT_DEBIT", "CREDIT_REFUND"]).optional(),
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

    const { limit, dateFrom, dateTo, type } = parsed.data;

    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo)   dateFilter.lte = new Date(dateTo);
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const events: SyntheticEvent[] = [];

    const wantType = (t: string) => !type || type === t;

    // USER_SIGNUP events from User table
    if (wantType("USER_SIGNUP")) {
      const users = await prisma.user.findMany({
        where:   hasDateFilter ? { createdAt: dateFilter } : undefined,
        select:  { id: true, email: true, plan: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take:    limit,
      });
      for (const u of users) {
        events.push({
          id:         `signup:${u.id}`,
          type:       "USER_SIGNUP",
          actorId:    u.id,
          actorEmail: u.email,
          targetId:   u.id,
          summary:    `New user signed up on plan ${u.plan}`,
          metadata:   { plan: u.plan },
          timestamp:  u.createdAt.toISOString(),
        });
      }
    }

    // GENERATION events (failed only — completed ones are noise at volume)
    if (wantType("GENERATION")) {
      const gens = await prisma.generation.findMany({
        where: {
          status: "FAILED",
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
        select: {
          id: true, tool: true, model: true, status: true,
          creditsCost: true, errorMessage: true, createdAt: true,
          user: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take:    limit,
      });
      for (const g of gens) {
        events.push({
          id:         `gen:${g.id}`,
          type:       "GENERATION",
          actorId:    g.user.id,
          actorEmail: g.user.email,
          targetId:   g.id,
          summary:    `Generation FAILED — ${g.tool} / ${g.model}`,
          metadata:   { tool: g.tool, model: g.model, status: g.status, creditsCost: g.creditsCost, errorMessage: g.errorMessage },
          timestamp:  g.createdAt.toISOString(),
        });
      }
    }

    // CREDIT_PURCHASE / CREDIT_DEBIT / CREDIT_REFUND from CreditTransaction
    const txTypes: string[] = [];
    if (wantType("CREDIT_PURCHASE")) txTypes.push("PURCHASE");
    if (wantType("CREDIT_DEBIT"))    txTypes.push("DEBIT");
    if (wantType("CREDIT_REFUND"))   txTypes.push("REFUND");

    if (txTypes.length > 0 || (!type && !wantType("USER_SIGNUP") && !wantType("GENERATION"))) {
      const effectiveTxTypes = txTypes.length > 0 ? txTypes : ["PURCHASE", "DEBIT", "REFUND"];
      const txs = await prisma.creditTransaction.findMany({
        where: {
          type: { in: effectiveTxTypes },
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
        select: {
          id: true, amount: true, type: true, description: true, createdAt: true,
          user: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take:    limit,
      });
      for (const tx of txs) {
        const evType =
          tx.type === "PURCHASE" ? "CREDIT_PURCHASE" :
          tx.type === "REFUND"   ? "CREDIT_REFUND"   :
          "CREDIT_DEBIT";
        events.push({
          id:         `tx:${tx.id}`,
          type:       evType,
          actorId:    tx.user.id,
          actorEmail: tx.user.email,
          targetId:   tx.id,
          summary:    `${tx.type}: ${tx.description ?? ""} (${tx.amount > 0 ? "+" : ""}${tx.amount} credits)`,
          metadata:   { amount: tx.amount, txType: tx.type, description: tx.description },
          timestamp:  tx.createdAt.toISOString(),
        });
      }
    }

    // Sort all events by timestamp descending and apply limit
    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const page = events.slice(0, limit);

    return NextResponse.json({
      events: page,
      total:  page.length,
      note:   "Synthetic audit log built from existing tables. Real AdminLog table planned for a future migration.",
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    return handleAdminError(err);
  }
}
