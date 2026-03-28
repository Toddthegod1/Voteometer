import { NextRequest, NextResponse } from "next/server";
import { calculateScores } from "@/lib/scoring";
import type { Candidate, Matchup, Party } from "@/lib/types";

type CalculateRequestBody = {
  userParty: Party;
  candidates: Candidate[];
  matchups: Matchup[];
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CalculateRequestBody;
  const { userParty, candidates, matchups } = body;

  const scores = calculateScores(userParty, candidates, matchups);
  return NextResponse.json(scores);
}