import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
});

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  userId: string,
  successUrl: string,
  cancelUrl: string
) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: { userId },
    locale: "pt-BR",
    currency: "brl",
  });
}

export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  existingCustomerId?: string | null
): Promise<string> {
  if (existingCustomerId) return existingCustomerId;

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  return customer.id;
}
