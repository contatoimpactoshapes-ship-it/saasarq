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
