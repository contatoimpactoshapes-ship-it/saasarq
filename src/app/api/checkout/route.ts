import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stripe, createCheckoutSession, getOrCreateStripeCustomer } from "@/lib/stripe";
import { getOrCreateUser } from "@/lib/credits";
import { getPlan } from "@/lib/plans";

const checkoutSchema = z.object({
  planId: z.string(),
  billing: z.enum(["monthly", "annual"]).default("monthly"),
  action: z.enum(["subscribe", "portal"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { planId, billing, action } = parsed.data;
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
    const user = await getOrCreateUser(clerkId, email);

    const customerId = await getOrCreateStripeCustomer(
      user.id,
      email,
      user.stripeCustomerId
    );

    // Persist customer ID if newly created
    if (user.stripeCustomerId !== customerId) {
      const { prisma } = await import("@/lib/prisma");
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Billing portal
    if (action === "portal") {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/app`,
      });
      return NextResponse.json({ url: session.url });
    }

    // Resolve price ID from new plans config
    const plan = getPlan(planId);
    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 400 });
    }

    const priceId =
      billing === "annual"
        ? plan.stripePriceIdAnnual
        : plan.stripePriceIdMonthly;

    if (!priceId) {
      return NextResponse.json(
        { error: "Preço não configurado para este plano/período" },
        { status: 400 }
      );
    }

    const session = await createCheckoutSession(
      customerId,
      priceId,
      user.id,
      `${process.env.NEXT_PUBLIC_APP_URL}/app?success=true`,
      `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[POST /api/checkout]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
