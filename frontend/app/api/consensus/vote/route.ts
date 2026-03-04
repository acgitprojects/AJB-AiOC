/**
 * app/api/consensus/vote/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/consensus/vote         — record agent vote on decision
 *
 * SPRINT 2: Multi-agent consensus voting
 * Agents vote on decisions/proposals and system calculates consensus
 *
 * Vote types: AGREE, DISAGREE, ABSTAIN
 * Consensus calculation: AGREE >= 51% = PASSED, DISAGREE >= 51% = REJECTED
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit-log";
import { checkRateLimit } from "@/lib/rate-limit";

interface Vote {
  proposalId: string;
  agentId: string;
  vote: "AGREE" | "DISAGREE" | "ABSTAIN";
  reasoning?: string;
  timestamp: string;
}

interface VoteRecord {
  proposalId: string;
  votes: Vote[];
  createdAt: string;
  updatedAt: string;
}

// Simple in-memory vote store (for dev; prod would use KV)
const voteStore = new Map<string, VoteRecord>();

export interface VoteRequest {
  proposalId: string;
  agentId: string;
  vote: "AGREE" | "DISAGREE" | "ABSTAIN";
  reasoning?: string;
}

export interface VoteResponse {
  ok: boolean;
  vote?: Vote;
  consensus?: {
    status: "PASSED" | "REJECTED" | "PENDING";
    totalVotes: number;
    agreedCount: number;
    disagreedCount: number;
    abstainedCount: number;
    agreementPercentage: number;
  };
  error?: string;
}

/**
 * Calculate consensus based on votes
 * PASSED if AGREE >= 51% of total votes (abstentions not counted)
 * REJECTED if DISAGREE >= 51% of total votes
 * PENDING otherwise
 */
function calculateConsensus(votes: Vote[]): NonNullable<VoteResponse["consensus"]> {
  const agreedCount = votes.filter(v => v.vote === "AGREE").length;
  const disagreedCount = votes.filter(v => v.vote === "DISAGREE").length;
  const abstainedCount = votes.filter(v => v.vote === "ABSTAIN").length;
  const totalVotes = votes.length;

  // Count only AGREE and DISAGREE for consensus threshold
  const decisiveVotes = agreedCount + disagreedCount;
  const agreementPercentage =
    decisiveVotes > 0 ? (agreedCount / decisiveVotes) * 100 : 0;

  let status: "PASSED" | "REJECTED" | "PENDING" = "PENDING";

  if (decisiveVotes > 0) {
    if (agreementPercentage >= 51) {
      status = "PASSED";
    } else if (agreementPercentage <= 49) {
      status = "REJECTED";
    }
  }

  return {
    status,
    totalVotes,
    agreedCount,
    disagreedCount,
    abstainedCount,
    agreementPercentage,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse<VoteResponse>> {
  // SECURITY: Verify user is authenticated
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: VoteRequest;
  try {
    body = (await req.json()) as VoteRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!body.proposalId || !body.agentId || !body.vote) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing required fields: proposalId, agentId, vote",
      },
      { status: 400 }
    );
  }

  // Validate vote value
  if (!["AGREE", "DISAGREE", "ABSTAIN"].includes(body.vote)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid vote value; must be AGREE, DISAGREE, or ABSTAIN",
      },
      { status: 400 }
    );
  }

  // RATE LIMITING: Check if agent has exceeded rate limits
  const rateLimitCheck = await checkRateLimit(body.agentId);
  if (!rateLimitCheck.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Rate limit exceeded for agent",
        retryAfter: rateLimitCheck.resetAt,
        limitType: rateLimitCheck.limitType,
      },
      {
        status: 429,
        headers: {
          "Retry-After": new Date(rateLimitCheck.resetAt).getTime().toString(),
        },
      }
    );
  }

  try {
    const proposalId = body.proposalId;
    const now = new Date().toISOString();

    // Get or create vote record
    let record = voteStore.get(proposalId);
    if (!record) {
      record = {
        proposalId,
        votes: [],
        createdAt: now,
        updatedAt: now,
      };
    }

    // Check if agent already voted
    const existingVoteIndex = record.votes.findIndex(
      v => v.agentId === body.agentId
    );
    if (existingVoteIndex >= 0) {
      // Update existing vote
      record.votes[existingVoteIndex] = {
        proposalId,
        agentId: body.agentId,
        vote: body.vote,
        reasoning: body.reasoning,
        timestamp: now,
      };
    } else {
      // Add new vote
      record.votes.push({
        proposalId,
        agentId: body.agentId,
        vote: body.vote,
        reasoning: body.reasoning,
        timestamp: now,
      });
    }

    record.updatedAt = now;
    voteStore.set(proposalId, record);

    // Calculate current consensus
    const consensus = calculateConsensus(record.votes);

    // Log audit trail
    await logAudit({
      timestamp: now,
      userEmail: session.email,
      action: "vote_cast",
      resource: "proposal",
      resourceId: proposalId,
      details: {
        agentId: body.agentId,
        vote: body.vote,
        consensusStatus: consensus.status,
      },
      status: "success",
    });

    return NextResponse.json(
      {
        ok: true,
        vote: {
          proposalId,
          agentId: body.agentId,
          vote: body.vote,
          reasoning: body.reasoning,
          timestamp: now,
        },
        consensus,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[consensus/vote] Failed to record vote:", err);

    await logAudit({
      timestamp: new Date().toISOString(),
      userEmail: session.email,
      action: "vote_cast",
      resource: "proposal",
      resourceId: body.proposalId,
      details: { error: String(err) },
      status: "failure",
    });

    return NextResponse.json(
      { ok: false, error: "Failed to record vote" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/consensus/vote?proposalId=...
 * Retrieve current voting state and consensus for a proposal
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // SECURITY: Verify user is authenticated
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const proposalId = searchParams.get("proposalId");

  if (!proposalId) {
    return NextResponse.json(
      { error: "Missing proposalId query parameter" },
      { status: 400 }
    );
  }

  try {
    const record = voteStore.get(proposalId);

    if (!record) {
      return NextResponse.json(
        { ok: true, proposal: null, consensus: null },
        { status: 200 }
      );
    }

    const consensus = calculateConsensus(record.votes);

    return NextResponse.json(
      {
        ok: true,
        proposal: {
          proposalId: record.proposalId,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          voteCount: record.votes.length,
        },
        votes: record.votes,
        consensus,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[consensus/vote] Failed to fetch votes:", err);
    return NextResponse.json(
      { error: "Failed to fetch votes" },
      { status: 500 }
    );
  }
}
