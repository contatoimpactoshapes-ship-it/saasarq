import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { PLAN_CREDITS } from "@/lib/plans";
import type Stripe from "stripe";
import type { Plan } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.text();
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
        const userId = session.metadata?.userId;
        if (!userId || session.mode !== "subscription") break;

        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: session.customer as string },
        });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price.id;

        const planMap: Record<string, Plan> = {
          [process.env.STRIPE_ESSENTIAL_PRICE_ID!]: "ESSENTIAL",
          [process.env.STRIPE_PREMIUM_PRICE_ID!]: "PREMIUM",
          [process.env.STRIPE_PREMIUM_PLUS_PRICE_ID!]: "PREMIUM_PLUS",
          [process.env.STRIPE_PRO_PRICE_ID!]: "PRO",
        };

        const newPlan = planMap[priceId] ?? "FREE";

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: sub.customer as string },
        });

        if (user) {
          const creditsToAdd = PLAN_CREDITS[newPlan] ?? 0;
          // Set plan, sub ID, and reset credits to the plan allocation in one transaction.
          // We do NOT call addCredits() here because that would *increment* on top of
          // the value we just set, resulting in double credits.
          await prisma.$transaction([
            prisma.user.update({
              where: { id: user.id },
              data: {
                plan: newPlan,
                stripeSubId: sub.id,
                credits: creditsToAdd,
              },
            }),
            ...(creditsToAdd > 0
              ? [
                  prisma.creditTransaction.create({
                    data: {
                      userId: user.id,
                      amount: creditsToAdd,
                      type: "PURCHASE",
                      description: `Créditos do plano ${newPlan} — renovação mensal`,
                    },
                  }),
                ]
              : []),
          ]);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: sub.customer as string },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { plan: "FREE", stripeSubId: null, credits: 0 },
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
