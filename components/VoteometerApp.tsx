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
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | number>>({});

  const democrats = candidates.filter((candidate) => candidate.party === "Democrat");
  const republicans = candidates.filter((candidate) => candidate.party === "Republican");

  const partyQuestions: Record<Party, string[]> = {
    Democrat: [
      "On a scale of -10 to 10, how would you rate Biden as president?",
      "On a scale of -10 to 10, how would you rate Sanders as president?",
      "In Biden vs. Sanders, what is the probability that Biden wins?",
      "In Biden vs. Trump, what is the probability Biden wins?",
      "In Biden vs. DeSantis, what is the probability Biden wins?",
      "In Sanders vs. Trump, what is the probability Sanders wins?",
      "In Sanders vs. DeSantis, what is the probability Sanders wins?",
    ],
    Republican: [
      "On a scale of -10 to 10, how would you rate Trump as president?",
      "On a scale of -10 to 10, how would you rate DeSantis as president?",
      "In Trump vs. DeSantis, what is the probability that Trump wins?",
      "In Trump vs. Biden, what is the probability Trump wins?",
      "In Trump vs. Sanders, what is the probability Trump wins?",
      "In DeSantis vs. Biden, what is the probability DeSantis wins?",
      "In DeSantis vs. Sanders, what is the probability DeSantis wins?",
    ],
  };

  const scores = useMemo(() => {
    return calculateScores(userParty, candidates, matchups);
  }, [userParty, candidates, matchups]);

  useMemo(() => {
    setQuestions(partyQuestions[userParty]);
    setSelectedAnswers({}); // Reset answers when party changes
  }, [userParty]);

  const handleAnswerChange = (question: string, answer: number) => {
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
                  {[...Array(11)].map((_, i) => {
                    const value = i - 5;
                    return (
                      <button
                        key={value}
                        onClick={() => handleAnswerChange(question, value)}
                        className={`rounded-lg px-4 py-2 ${
                          selectedAnswers[question] === value
                            ? "bg-slate-900 text-white"
                            : "border border-slate-300 bg-white"
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
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