import { prisma } from "@/lib/prisma";
import { CONCURRENCY_LIMITS } from "./pricing";

export async function checkConcurrencyLimit(
  userId: string,
  planId: string,
): Promise<{ allowed: boolean; limit: number; active: number }> {
  const limit = CONCURRENCY_LIMITS[planId] ?? 1;
  const active = await prisma.generation.count({
    where: { userId, status: { in: ["PENDING", "PROCESSING"] } },
  });
  return { allowed: active < limit, limit, active };
}
