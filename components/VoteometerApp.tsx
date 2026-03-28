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
  const [questions, setQuestions] = useState<string[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  const democrats = candidates.filter((candidate) => candidate.party === "Democrat");
  const republicans = candidates.filter((candidate) => candidate.party === "Republican");

  const partyQuestions: Record<Party, string[]> = {
    Democrat: [
      "Do you support universal healthcare?",
      "Should taxes be increased on the wealthy?",
    ],
    Republican: [
      "Do you support lower corporate taxes?",
      "Should the Second Amendment be protected at all costs?",
    ],
  };

  const scores = useMemo(() => {
    return calculateScores(userParty, candidates, matchups);
  }, [userParty, candidates, matchups]);

  useMemo(() => {
    setQuestions(partyQuestions[userParty]);
    setSelectedAnswers({}); // Reset answers when party changes
  }, [userParty]);

  const handleAnswerChange = (question: string, answer: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [question]: answer }));
  };

  const recommendedCandidate = useMemo(() => {
    if (!scores.length) return null;
    return scores.reduce((best, candidate) =>
      candidate.powerNumber > best.powerNumber ? candidate : best
    );
  }, [scores]);

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
              onClick={() => {
                setUserParty("Democrat");
                console.log("User selected: Democrat");
              }}
              className={`rounded-lg px-4 py-2 ${
                userParty === "Democrat"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white"
              }`}
            >
              Democrat
            </button>
            <button
              onClick={() => {
                setUserParty("Republican");
                console.log("User selected: Republican");
              }}
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

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-medium text-slate-700">Answer the questions</h2>
          <ul className="mt-4 space-y-4">
            {questions.map((question) => (
              <li key={question} className="flex flex-col">
                <span className="text-sm text-slate-700">{question}</span>
                <div className="mt-2 flex gap-3">
                  <button
                    onClick={() => handleAnswerChange(question, "Yes")}
                    className={`rounded-lg px-4 py-2 ${
                      selectedAnswers[question] === "Yes"
                        ? "bg-slate-900 text-white"
                        : "border border-slate-300 bg-white"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => handleAnswerChange(question, "No")}
                    className={`rounded-lg px-4 py-2 ${
                      selectedAnswers[question] === "No"
                        ? "bg-slate-900 text-white"
                        : "border border-slate-300 bg-white"
                    }`}
                  >
                    No
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-medium text-slate-700">Recommended Candidate</h2>
          {recommendedCandidate ? (
            <div className="mt-4">
              <p className="text-sm text-slate-700">
                Based on your answers, we recommend:
              </p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {recommendedCandidate.name} ({recommendedCandidate.party})
              </p>
              <p className="text-sm text-slate-600">
                Power Number: {recommendedCandidate.powerNumber.toFixed(2)}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">No recommendation available.</p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <CandidateEditor
            title="Democratic candidates"
            candidates={democrats}
            onChange={setCandidates}
            party="Democrat"
          />
          <CandidateEditor
            title="Republican candidates"
            candidates={republicans}
            onChange={setCandidates}
            party="Republican"
          />
        </div>
      </div>
    </main>
  );
}