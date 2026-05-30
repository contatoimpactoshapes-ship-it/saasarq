import { prisma } from "./prisma";

// Active only when NODE_ENV=development AND LOCAL_INFINITE_CREDITS=true.
// NODE_ENV is hard-set to "production" by Next.js on every Vercel build,
// making this structurally impossible to trigger in production.
function isLocalInfiniteCredits(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.LOCAL_INFINITE_CREDITS === "true"
  );
}

export async function getUserCredits(userId: string): Promise<number> {
  if (isLocalInfiniteCredits()) {
    console.log("[LOCAL_INFINITE_CREDITS ativo] getUserCredits → 999999");
    return 999999;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  return user?.credits ?? 0;
}

export async function debitCredits(
  userId: string,
  amount: number,
  description: string,
  generationId?: string
): Promise<void> {
  if (isLocalInfiniteCredits()) {
    console.log("[LOCAL_INFINITE_CREDITS ativo] debitCredits ignorado:", description, amount);
    return;
  }
  // Admins never have credits deducted
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (user?.isAdmin) return;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        amount: -amount,
        type: "DEBIT",
        description,
      },
    }),
  ]);
}

export async function refundCredits(
  userId: string,
  amount: number,
  description: string
): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        amount,
        type: "REFUND",
        description,
      },
    }),
  ]);
}

export async function addCredits(
  userId: string,
  amount: number,
  description: string
): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        amount,
        type: "PURCHASE",
        description,
      },
    }),
  ]);
}

export async function hasEnoughCredits(
  userId: string,
  required: number
): Promise<boolean> {
  if (isLocalInfiniteCredits()) {
    console.log("[LOCAL_INFINITE_CREDITS ativo] hasEnoughCredits → true (required:", required, ")");
    return true;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true, isAdmin: true },
  });
  if (user?.isAdmin) return true;
  return (user?.credits ?? 0) >= required;
}

// ── Atomic conditional debit ──────────────────────────────────────────────────
// Returns true if the debit succeeded, false if the user has insufficient
// credits. Uses a conditional UPDATE so concurrent requests can never both
// pass when the shared balance is only enough for one.
export async function tryDebitCredits(
  userId:      string,
  amount:      number,
  description: string,
): Promise<boolean> {
  if (isLocalInfiniteCredits()) {
    console.log("[LOCAL_INFINITE_CREDITS ativo] tryDebitCredits ignorado:", description, amount);
    return true;
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (user?.isAdmin) return true;

  try {
    await prisma.$transaction(async (tx) => {
      // Single UPDATE with WHERE credits >= amount — atomically checks + debits.
      // If no row is affected (balance too low), the thrown error aborts the tx.
      const count = await tx.$executeRaw`
        UPDATE "User"
        SET credits = credits - ${amount}
        WHERE id = ${userId}
          AND credits >= ${amount}
      `;

      if (count === 0) throw new Error("INSUFFICIENT_CREDITS");

      await tx.creditTransaction.create({
        data: { userId, amount: -amount, type: "DEBIT", description },
      });
    });
    return true;
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_CREDITS") return false;
    throw err;
  }
}

// ── Idempotent fail + conditional refund ──────────────────────────────────────
// Marks a generation as FAILED only if it is not already in a terminal state
// (FAILED or COMPLETED). Issues a credit refund only when this call is the
// first to transition the record — preventing double-refunds when both the
// FAL webhook and the status-polling route detect the same failure.
export async function failGenerationAndRefund(
  generationId:      string,
  userId:            string,
  creditsCost:       number,
  errorMessage:      string,
  refundDescription: string,
): Promise<void> {
  const { count } = await prisma.generation.updateMany({
    where: { id: generationId, status: { notIn: ["FAILED", "COMPLETED"] } },
    data:  { status: "FAILED", errorMessage },
  });

  // count === 0 means another process already settled this generation.
  if (count > 0) {
    await refundCredits(userId, creditsCost, refundDescription);
  }
}

export async function getOrCreateUser(clerkId: string, email: string) {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = adminEmails.includes(email.toLowerCase());

  return prisma.user.upsert({
    where: { clerkId },
    update: isAdmin ? { isAdmin: true, plan: "PRO", credits: 999999 } : {},
    create: {
      clerkId,
      email,
      plan: isAdmin ? "PRO" : "FREE",
      credits: isAdmin ? 999999 : 20000,
      isAdmin,
    },
  });
}
