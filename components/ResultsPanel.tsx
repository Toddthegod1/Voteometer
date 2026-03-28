import type { CandidateScore } from "@/lib/types";

type Props = {
  scores: CandidateScore[];
};

export default function ResultsPanel({ scores }: Props) {
  const winner = [...scores].sort((a, b) => b.score - a.score)[0];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold">Results</h2>

      {winner && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm text-emerald-700">Recommended choice</div>
          <div className="text-2xl font-bold text-emerald-900">{winner.name}</div>
          <div className="text-sm text-emerald-800">Score: {winner.score.toFixed(2)}</div>
        </div>
      )}

      <div className="space-y-4">
        {scores.map((score) => (
          <div key={score.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="font-semibold">{score.name}</div>
              <div>{score.score.toFixed(2)}</div>
            </div>

            <div className="mt-3 space-y-2 text-sm text-slate-600">
              {score.details.map((detail) => (
                <div key={detail.opponent} className="rounded-lg bg-slate-50 px-3 py-2">
                  Against {detail.opponent}: own win {(detail.ownWin * 100).toFixed(0)}%, contribution {detail.contribution.toFixed(2)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}