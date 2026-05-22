import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";

interface ClerkUserEvent {
  data: {
    id: string;
    email_addresses: { email_address: string; id: string }[];
    primary_email_address_id: string;
  };
  type: string;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  let event: ClerkUserEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { id: clerkId, email_addresses, primary_email_address_id } = event.data;
  const primaryEmail = email_addresses.find(
    (e) => e.id === primary_email_address_id
  )?.email_address ?? email_addresses[0]?.email_address ?? "";

  if (event.type === "user.created") {
    await prisma.user.upsert({
      where: { clerkId },
      update: {},
      create: {
        clerkId,
        email: primaryEmail,
        plan: "FREE",
        credits: 0,
      },
    });
  } else if (event.type === "user.updated") {
    await prisma.user.upsert({
      where: { clerkId },
      update: { email: primaryEmail },
      create: {
        clerkId,
        email: primaryEmail,
        plan: "FREE",
        credits: 0,
      },
    });
  } else if (event.type === "user.deleted") {
    await prisma.user.deleteMany({ where: { clerkId } });
  }

  return NextResponse.json({ ok: true });
}
