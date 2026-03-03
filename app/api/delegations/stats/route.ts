/**
 * app/api/delegations/stats/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/delegations/stats           — delegation workflow statistics
 *
 * SPRINT 2 PHASE 3: Monitoring and analytics
 * Returns metrics on delegation workflow health
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDelegationStats } from "@/lib/delegation-store";

export async function GET(req: NextRequest) {
  // SECURITY: Verify user is authenticated
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const stats = await getDelegationStats();

    return NextResponse.json(
      {
        ok: true,
        stats,
        health: {
          avgApprovalTime: "N/A", // Would calculate from timestamps
          approvalRate:
            stats.total > 0
              ? Math.round((stats.accepted / stats.total) * 100) + "%"
              : "N/A",
          pendingCount: stats.proposed + stats.pendingApproval,
          activeCount: stats.active,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[delegations/stats] Failed to get stats:", err);
    return NextResponse.json(
      { error: "Failed to get delegation stats" },
      { status: 500 }
    );
  }
}
