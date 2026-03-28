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
          m.democratCandidateId === (userParty === "Democrat" ? candidate.id : opponent.id) &&
          m.republicanCandidateId === (userParty === "Republican" ? candidate.id : opponent.id)
      );

      const democratWinProb = matchup ? matchup.democratWinProb / 100 : 0.5;
      const ownWin = userParty === "Democrat" ? democratWinProb : 1 - democratWinProb;
      const oppWin = 1 - ownWin;

      const contribution =
        opponentPrimaryProb * (ownWin * candidate.rating + oppWin * opponent.rating);

      score += contribution;

      details.push({
        opponent: opponent.name,
        ownWin,
        oppWin,
        contribution,
      });
    }

    return {
      id: candidate.id,
      name: candidate.name,
      score,
      details,
    };
  });
}