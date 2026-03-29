import type { Candidate, Matchup } from "@/lib/types";

export const seedCandidates: Candidate[] = [
  { id: "d1", name: "Kamala Harris", party: "Democrat", rating: 5 },
  { id: "d2", name: "Gavin Newsom", party: "Democrat", rating: 6 },
  { id: "r1", name: "JD Vance", party: "Republican", rating: -6 },
  { id: "r2", name: "Ron DeSantis", party: "Republican", rating: -5 },
];

export const seedMatchups: Matchup[] = [
  { democratCandidateId: "d1", republicanCandidateId: "r1", democratWinProb: 48 },
  { democratCandidateId: "d1", republicanCandidateId: "r2", democratWinProb: 50 },
  { democratCandidateId: "d2", republicanCandidateId: "r1", democratWinProb: 47 },
  { democratCandidateId: "d2", republicanCandidateId: "r2", democratWinProb: 49 },
];