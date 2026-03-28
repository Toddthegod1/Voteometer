import type { Candidate, CandidateScore, Matchup, Party } from "@/lib/types";

export function calculateScores(
  userParty: Party,
  candidates: Candidate[],
  matchups: Matchup[]
): CandidateScore[] {
  const ownCandidates = candidates.filter((candidate) => candidate.party === userParty);
  const opponentParty: Party = userParty === "Democrat" ? "Republican" : "Democrat";
  const opponentCandidates = candidates.filter((candidate) => candidate.party === opponentParty);

  return ownCandidates.map((candidate) => {
    let powerNumber = 0;
    const details: CandidateScore["details"] = [];

    for (const opponent of opponentCandidates) {
      const matchup = matchups.find(
        (m) =>
          (m.democratCandidateId === candidate.id && m.republicanCandidateId === opponent.id) ||
          (m.republicanCandidateId === candidate.id && m.democratCandidateId === opponent.id)
      );

      if (matchup) {
        const ownWinProb =
          matchup.democratCandidateId === candidate.id
            ? matchup.democratWinProb
            : 1 - matchup.democratWinProb; // Republican win probability is 1 - Democrat win probability

        const oppWinProb = 1 - ownWinProb;
        const ownStrength = candidate.rating;
        const oppStrength = opponent.rating;

        // Calculate contributions for all columns
        const column1 = ownStrength * oppWinProb * ownWinProb;
        const column2 = ownStrength * oppWinProb * ownWinProb;
        const column3 = oppStrength * oppWinProb * ownWinProb;
        const column4 = oppStrength * oppWinProb * oppWinProb;

        const contribution = column1 + column2 + column3 + column4;
        powerNumber += contribution;

        details.push({
          opponent: opponent.id,
          ownWin: ownWinProb,
          oppWin: oppWinProb,
          contribution,
        });
      }
    }

    return {
      id: candidate.id,
      name: candidate.name,
      score: powerNumber,
      details,
      powerNumber,
      party: candidate.party,
    };
  });
}