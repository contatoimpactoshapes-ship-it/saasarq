import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
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

    const localDev =
      process.env.NODE_ENV === "development" &&
      process.env.LOCAL_INFINITE_CREDITS === "true";

    if (localDev) {
      console.log("[LOCAL_INFINITE_CREDITS ativo] /api/credits → 999999");
    }

    return NextResponse.json({
      credits: localDev || user.isAdmin ? 999999 : user.credits,
      plan: user.plan,
      userId: user.id,
      isAdmin: user.isAdmin,
    });
  } catch (error) {
    console.error("[GET /api/credits]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
