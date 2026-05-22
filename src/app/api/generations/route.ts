import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/credits";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
    const user = await getOrCreateUser(clerkId, email);

    const generations = await prisma.generation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(generations);
  } catch (error) {
    console.error("[GET /api/generations]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
