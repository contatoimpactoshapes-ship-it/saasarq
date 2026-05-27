import { NextResponse }           from "next/server";
import { requireAdmin, handleAdminError } from "@/lib/admin";
import { getActiveIncidents, getAllIncidents } from "@/lib/autonomous/incident-engine";

export const dynamic = "force-dynamic";

// GET /api/admin/incidents?all=true  → all (including resolved)
// GET /api/admin/incidents            → active only
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const all      = new URL(req.url).searchParams.get("all") === "true";
    const incidents = all ? getAllIncidents() : getActiveIncidents();
    return NextResponse.json({ incidents, count: incidents.length, ts: new Date().toISOString() });
  } catch (err) {
    return handleAdminError(err);
  }
}
