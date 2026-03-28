"use client";

import { useMemo, useState } from "react";
import CandidateEditor from "@/components/CandidateEditor";
import MatchupEditor from "@/components/MatchupEditor";
import ResultsPanel from "@/components/ResultsPanel";
import { calculateScores } from "@/lib/scoring";
import { seedCandidates, seedMatchups } from "@/lib/seedData";
import type { Candidate, Matchup, Party } from "@/lib/types";

export default function VoteometerApp() {
  const [userParty, setUserParty] = useState<Party>("Democrat");
  const [candidates, setCandidates] = useState<Candidate[]>(seedCandidates);
  const [matchups, setMatchups] = useState<Matchup[]>(seedMatchups);

  const democrats = candidates.filter((candidate) => candidate.party === "Democrat");
  const republicans = candidates.filter((candidate) => candidate.party === "Republican");

  const scores = useMemo(() => {
    return calculateScores(userParty, candidates, matchups);
  }, [userParty, candidates, matchups]);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Voteometer</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Compare how much you like each candidate with how likely they are to win.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-sm font-medium text-slate-700">Choose your party</div>
          <div className="flex gap-3">
            <button
              onClick={() => setUserParty("Democrat")}
              className={`rounded-lg px-4 py-2 ${
                userParty === "Democrat"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white"
              }`}
            >
              Democrat
            </button>
            <button
              onClick={() => setUserParty("Republican")}
              className={`rounded-lg px-4 py-2 ${
                userParty === "Republican"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white"
              }`}
            >
              Republican
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <CandidateEditor
            title="Democratic candidates"
            candidates={democrats}
}