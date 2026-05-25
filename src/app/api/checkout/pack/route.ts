import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { getOrCreateUser } from "@/lib/credits";
import { CREDIT_PACKS, meetsMinPlan } from "@/lib/economy";
import type { PlanId } from "@/lib/plans";

const packSchema = z.object({ packId: z.string() });

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body   = await req.json();
    const parsed = packSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const { packId } = parsed.data;
    const pack = CREDIT_PACKS.find((p) => p.id === packId);
    if (!pack) return NextResponse.json({ error: "Pack não encontrado" }, { status: 400 });

    const clerkUser = await currentUser();
    const email     = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
    const user      = await getOrCreateUser(clerkId, email);

    if (!meetsMinPlan(user.plan, pack.minPlan as PlanId)) {
      return NextResponse.json(
        { error: `Este pack requer plano ${pack.minPlan} ou superior` },
        { status: 403 }
      );
    }

    const customerId = await getOrCreateStripeCustomer(user.id, email, user.stripeCustomerId);

    if (user.stripeCustomerId !== customerId) {
      const { prisma } = await import("@/lib/prisma");
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const totalCredits = pack.credits + pack.bonus;

    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      mode:                 "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency:     "brl",
          product_data: {
            name:        `Pack ${pack.name} — ${totalCredits.toLocaleString("pt-BR")} créditos`,
            description: pack.bonus > 0
              ? `${pack.credits.toLocaleString("pt-BR")} créditos + ${pack.bonus.toLocaleString("pt-BR")} bônus`
              : `${pack.credits.toLocaleString("pt-BR")} créditos`,
          },
          unit_amount: Math.round(pack.priceBRL * 100),
        },
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/credits?success=true&pack=${packId}`,
      cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/app/credits`,
      metadata:    { userId: user.id, packId, credits: String(totalCredits), type: "credit_pack" },
      locale:      "pt-BR",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[POST /api/checkout/pack]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
