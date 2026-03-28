import type { Candidate, Party } from "@/lib/types";

type Props = {
  title: string;
  candidates: Candidate[];
  onChange: (candidates: Candidate[]) => void;
  party: Party;
};

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function clampRating(value: number) {
  return Math.max(-10, Math.min(10, value));
}

export default function CandidateEditor({ title, candidates, onChange, party }: Props) {
  function updateCandidate(id: string, field: "name" | "rating", value: string) {
    onChange(
      candidates.map((candidate) =>
        candidate.id === id
          ? {
              ...candidate,
              [field]: field === "rating" ? clampRating(Number(value)) : value,
            }
          : candidate
      )
    );
  }

  function addCandidate() {
    onChange([
      ...candidates,
      {
        id: makeId(),
        name: `${party === "Democrat" ? "D" : "R"}${candidates.length + 1}`,
        party,
        rating: 0,
      },
    ]);
  }

  function removeCandidate(id: string) {
    if (candidates.length <= 1) return;
    onChange(candidates.filter((candidate) => candidate.id !== id));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button
          onClick={addCandidate}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
        >
          Add candidate
        </button>
      </div>

      <div className="space-y-3">
        {candidates.map((candidate) => (
          <div
            key={candidate.id}
            className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_140px_100px]"
          >
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={candidate.name}
              onChange={(e) => updateCandidate(candidate.id, "name", e.target.value)}
}