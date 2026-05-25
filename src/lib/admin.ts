import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── Admin-specific error ──────────────────────────────────────────────────────

export class AdminError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "AdminError";
  }
}

// ── Minimal user shape returned by requireAdmin ───────────────────────────────

export interface AdminUser {
  id:      string;
  email:   string;
  plan:    string;
  credits: number;
  isAdmin: true;
}

// ── requireAdmin ──────────────────────────────────────────────────────────────
//
// Call at the top of every /api/admin/* route handler.
//
// Security layers:
//   1. Clerk session — rejects unauthenticated requests immediately.
//   2. DB isAdmin flag — the primary gate; avoids currentUser() Clerk API calls.
//   3. ADMIN_EMAILS double-check — if the env var is set and non-empty, the
//      user's email must still be listed. This catches the case where an admin
//      was removed from ADMIN_EMAILS but their DB flag was never cleared.
//
// Does NOT call currentUser() — getOrCreateUser() is expensive (Clerk API
// round-trip). Admin routes query the DB directly via clerkId lookup.
//
// Throws AdminError (caught by handleAdminError) on any failure.

export async function requireAdmin(): Promise<AdminUser> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new AdminError("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where:  { clerkId },
    select: { id: true, email: true, isAdmin: true, plan: true, credits: true },
  });

  if (!user?.isAdmin) throw new AdminError("Forbidden", 403);

  // Defense-in-depth: if ADMIN_EMAILS is set, the email must still be listed.
  // Protects against stale isAdmin=true after the email is removed from env.
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length > 0 && !adminEmails.includes(user.email.toLowerCase())) {
    throw new AdminError("Forbidden", 403);
  }

  return user as AdminUser;
}

// ── Error response helper ─────────────────────────────────────────────────────
//
// Usage in route handlers:
//
//   } catch (err) {
//     return handleAdminError(err);
//   }

export function handleAdminError(err: unknown): NextResponse {
  if (err instanceof AdminError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[admin]", err);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}
