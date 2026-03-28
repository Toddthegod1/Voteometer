import type { Candidate, Matchup } from "@/lib/types";

type Props = {
  democrats: Candidate[];
  republicans: Candidate[];
  matchups: Matchup[];
  onChange: (matchups: Matchup[]) => void;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export default function MatchupEditor({
  democrats,
  republicans,
  matchups,
  onChange,
}: Props) {
  const handleMatchupChange = (
    party: "Democrat" | "Republican",
    candidateId: string,
    opponentId: string,
    value: number
  ) => {
    const updatedMatchups = matchups.map((matchup) => {
      if (
        matchup[`${party.toLowerCase()}CandidateId`] === candidateId &&
        matchup[`${party === "Democrat" ? "republican" : "democrat"}CandidateId`] ===
          opponentId
      ) {
        return {
          ...matchup,
          [`${party.toLowerCase()}WinProb`]: clampPercent(value),
        };
      }
      return matchup;
    });

    onChange(updatedMatchups);
  };

  return (
    <div className="space-y-6">
      {["Democrat", "Republican"].map((party) => (
        <div key={party}>
          <h3 className="text-lg font-medium text-slate-700">
            {party === "Democrat" ? "Democratic" : "Republican"} Matchups
          </h3>
          <div className="mt-4 space-y-4">
            {(party === "Democrat" ? democrats : republicans).map((candidate) => (
              <div key={candidate.id} className="space-y-2">
                <h4 className="text-sm font-medium text-slate-600">
                  {candidate.name}
                </h4>
                <div className="space-y-2">
                  {(party === "Democrat" ? republicans : democrats).map((opponent) => (
                    <div
                      key={`${candidate.id}-${opponent.id}`}
                      className="flex items-center gap-2"
                    >
                      <span className="text-sm text-slate-500">
                        {candidate.name} vs. {opponent.name}
                      </span>
                      <input
                        type="number"
                        value={
                          matchups.find(
                            (m) =>
                              m[`${party.toLowerCase()}CandidateId`] === candidate.id &&
                              m[`${party === "Democrat" ? "republican" : "democrat"}CandidateId`] ===
                                opponent.id
                          )?.[`${party.toLowerCase()}WinProb`] || 0
                        }
                        onChange={(e) =>
                          handleMatchupChange(
                            party as "Democrat" | "Republican", // Explicitly cast party
                            candidate.id,
                            opponent.id,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-20 rounded-md border border-slate-300 p-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}