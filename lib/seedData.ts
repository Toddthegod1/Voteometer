import type { Candidate, Matchup } from "@/lib/types";

export const seedCandidates: Candidate[] = [
  { id: "d1", name: "Biden", party: "Democrat", rating: 5 },
  { id: "d2", name: "Sanders", party: "Democrat", rating: 9 },
  { id: "r1", name: "Trump", party: "Republican", rating: -10 },
  { id: "r2", name: "DeSantis", party: "Republican", rating: -8 },
];

export const seedMatchups: Matchup[] = [
  { democratCandidateId: "d1", republicanCandidateId: "r1", democratWinProb: 70 },
  { democratCandidateId: "d1", republicanCandidateId: "r2", democratWinProb: 50 },
  { democratCandidateId: "d2", republicanCandidateId: "r1", democratWinProb: 40 },
  { democratCandidateId: "d2", republicanCandidateId: "r2", democratWinProb: 20 },
];