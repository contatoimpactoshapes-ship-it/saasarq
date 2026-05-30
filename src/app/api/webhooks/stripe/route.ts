import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { PLAN_CREDITS } from "@/lib/plans";
import { CREDIT_PACKS } from "@/lib/economy/pricing";
import { emitAdminEvent } from "@/lib/realtime";
import type Stripe from "stripe";
import type { Plan } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[Stripe webhook] Invalid signature", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId  = session.metadata?.userId;
        if (!userId) break;

        if (session.mode === "subscription") {
          // Persist customer ID created during checkout
          await prisma.user.update({
            where: { id: userId },
            data:  { stripeCustomerId: session.customer as string },
          });
        } else if (
          session.mode === "payment" &&
          session.metadata?.type === "credit_pack"
        ) {
          await fulfillCreditPack(session);
        }
        break;
      }

      case "customer.subscription.created": {
        // New subscription: set credits to the plan allocation (fresh start).
        const sub     = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price.id;
        const planMap: Record<string, Plan> = {
          [process.env.STRIPE_ESSENTIAL_PRICE_ID!]:    "ESSENTIAL",
          [process.env.STRIPE_PREMIUM_PRICE_ID!]:      "PREMIUM",
          [process.env.STRIPE_PREMIUM_PLUS_PRICE_ID!]: "PREMIUM_PLUS",
          [process.env.STRIPE_PRO_PRICE_ID!]:          "PRO",
        };
        const newPlan = planMap[priceId] ?? "FREE";
        const user    = await prisma.user.findFirst({ where: { stripeCustomerId: sub.customer as string } });
        if (user) {
          const creditsToAdd = PLAN_CREDITS[newPlan] ?? 0;
          await prisma.$transaction([
            prisma.user.update({
              where: { id: user.id },
              data:  { plan: newPlan, stripeSubId: sub.id, credits: creditsToAdd },
            }),
            ...(creditsToAdd > 0 ? [prisma.creditTransaction.create({
              data: { userId: user.id, amount: creditsToAdd, type: "PURCHASE", description: `Créditos do plano ${newPlan} — nova assinatura` },
            })] : []),
          ]);
        }
        break;
      }

      case "customer.subscription.updated": {
        // Plan change or renewal: never reduce an existing balance.
        // Uses GREATEST(current, planCredits) so purchased pack credits and
        // accumulated rollovers are preserved across upgrades and renewals.
        const sub     = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price.id;
        const planMap: Record<string, Plan> = {
          [process.env.STRIPE_ESSENTIAL_PRICE_ID!]:    "ESSENTIAL",
          [process.env.STRIPE_PREMIUM_PRICE_ID!]:      "PREMIUM",
          [process.env.STRIPE_PREMIUM_PLUS_PRICE_ID!]: "PREMIUM_PLUS",
          [process.env.STRIPE_PRO_PRICE_ID!]:          "PRO",
        };
        const newPlan = planMap[priceId] ?? "FREE";
        const user    = await prisma.user.findFirst({ where: { stripeCustomerId: sub.customer as string } });
        if (user) {
          const planCredits    = PLAN_CREDITS[newPlan] ?? 0;
          const currentCredits = user.credits ?? 0;
          // Only increase: if the user already has more credits (from packs or
          // accumulated balance), keep their balance intact.
          const newBalance  = Math.max(currentCredits, planCredits);
          const actualAdded = newBalance - currentCredits;
          await prisma.$transaction([
            prisma.user.update({
              where: { id: user.id },
              data:  { plan: newPlan, stripeSubId: sub.id, credits: newBalance },
            }),
            ...(actualAdded > 0 ? [prisma.creditTransaction.create({
              data: { userId: user.id, amount: actualAdded, type: "PURCHASE", description: `Créditos do plano ${newPlan} — atualização/renovação` },
            })] : []),
          ]);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub  = event.data.object as Stripe.Subscription;
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: sub.customer as string },
        });

        if (user) {
          // Only downgrade plan and clear subscription ID.
          // credits are intentionally NOT zeroed: pack credits are paid assets
          // that must survive subscription cancellation.
          await prisma.user.update({
            where: { id: user.id },
            data:  { plan: "FREE", stripeSubId: null },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe webhook handler]", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

// ── Credit pack fulfillment ────────────────────────────────────────────────────
// Idempotent: stripeSessionId has a @unique constraint in PackPurchase.
// If Stripe retries the webhook, the second call catches the P2002 error and
// returns cleanly without double-crediting the user.

async function fulfillCreditPack(session: Stripe.Checkout.Session): Promise<void> {
  const { userId, packId } = session.metadata ?? {};

  if (!userId || !packId) {
    console.error("[fulfillCreditPack] Missing metadata", { userId, packId, sessionId: session.id });
    return;
  }

  // Validate pack against source of truth (not metadata — can't be tampered with)
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) {
    console.error("[fulfillCreditPack] Unknown packId:", packId);
    return;
  }

  // Validate user exists
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    console.error("[fulfillCreditPack] User not found:", userId);
    return;
  }

  const totalCredits  = pack.credits + pack.bonus;
  const amountPaidBRL = (session.amount_total ?? Math.round(pack.priceBRL * 100)) / 100;

  try {
    // Atomic transaction: increment credits + log transaction + create PackPurchase
    // The PackPurchase.stripeSessionId @unique constraint makes this idempotent —
    // a Prisma P2002 error on retry means it was already fulfilled.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data:  { credits: { increment: totalCredits } },
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          amount:      totalCredits,
          type:        "PACK_PURCHASE",
          description: `Pack ${pack.name} — ${pack.credits.toLocaleString("pt-BR")} cr${pack.bonus > 0 ? ` + ${pack.bonus.toLocaleString("pt-BR")} bônus` : ""}`,
        },
      }),
      prisma.packPurchase.create({
        data: {
          userId,
          packId,
          stripeSessionId: session.id,
          creditsAdded:    pack.credits,
          bonusCredits:    pack.bonus,
          amountPaidBRL,
        },
      }),
    ]);

    console.log(`[fulfillCreditPack] OK — user=${userId} pack=${packId} credits=+${totalCredits} session=${session.id}`);
    emitAdminEvent({ type: "pack:purchased", id: crypto.randomUUID(), ts: Date.now(), userId, packId, totalCredits });
  } catch (err: unknown) {
    // P2002 = unique constraint violation → already fulfilled (idempotent retry)
    if (isPrismaUniqueConstraintError(err)) {
      console.log(`[fulfillCreditPack] Already fulfilled (idempotent skip) — session=${session.id}`);
      return;
    }
    throw err;
  }
}

function isPrismaUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}
