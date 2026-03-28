import type { Candidate, CandidateScore, Matchup, Party } from "@/lib/types";

export function calculateScores(
  userParty: Party,
  candidates: Candidate[],
  matchups: Matchup[]
): CandidateScore[] {
  const ownCandidates = candidates.filter((candidate) => candidate.party === userParty);
  const opponentParty: Party = userParty === "Democrat" ? "Republican" : "Democrat";
  const opponentCandidates = candidates.filter((candidate) => candidate.party === opponentParty);

  const opponentPrimaryProb = opponentCandidates.length > 0 ? 1 / opponentCandidates.length : 0;

  return ownCandidates.map((candidate) => {
    let score = 0;
    const details: CandidateScore["details"] = [];

    for (const opponent of opponentCandidates) {
      const matchup = matchups.find(
        (m) =>
          (m.democratCandidateId === candidate.id && m.republicanCandidateId === opponent.id) ||
          (m.republicanCandidateId === candidate.id && m.democratCandidateId === opponent.id)
      );

      if (matchup) {
        const contribution =
          matchup.democratCandidateId === candidate.id
            ? matchup.democratWinProb
            : 1 - matchup.democratWinProb; // Republican win probability is 1 - Democrat win probability
        score += contribution;
        details.push({
          opponent: opponent.id,
          ownWin: matchup.democratCandidateId === candidate.id ? matchup.democratWinProb : 1 - matchup.democratWinProb,
          oppWin: matchup.democratCandidateId === candidate.id ? 1 - matchup.democratWinProb : matchup.democratWinProb,
          contribution,
        });
      }
    }

    return {
      id: candidate.id,
      name: candidate.name,
      score,
      details,
      powerNumber: score * 100, // Example calculation for power number
      party: candidate.party, // Include the party from the candidate
    };
  });
}