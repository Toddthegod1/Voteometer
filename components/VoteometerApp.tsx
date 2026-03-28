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
  const [questions, setQuestions] = useState<{ question: string; id: string }[]>([]);
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

  const calculatePowerNumbers = useMemo(() => {
    const updatedCandidates = candidates.map((candidate) => {
      const candidateAnswers = Object.entries(selectedAnswers).filter(([question]) =>
        question.includes(candidate.name)
      );

      let powerNumber = 0;
      candidateAnswers.forEach(([question, value]) => {
        if (typeof value === "number") {
          powerNumber += value;
        }
      });

      return {
        ...candidate,
        powerNumber,
      };
    });

    return updatedCandidates;
  }, [candidates, selectedAnswers]);

  const recommendedCandidate = useMemo(() => {
    if (!calculatePowerNumbers.length) return null;
    return calculatePowerNumbers.reduce((best, candidate) =>
      candidate.powerNumber > best.powerNumber ? candidate : best
    );
  }, [calculatePowerNumbers]);

  useMemo(() => {
    // Fix for setting questions: Map partyQuestions to match the updated questions state type
    setQuestions(
      partyQuestions[userParty].map((q) => ({ question: q, id: q }))
    );
    setSelectedAnswers({}); // Reset answers when party changes
  }, [userParty]);

  const handleAnswerChange = (question: string, answer: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [question]: answer }));
  };

  const handleAddCandidate = (party: Party, candidateName: string) => {
    const newCandidate: Candidate = {
      id: crypto.randomUUID(),
      name: candidateName,
      party,
      rating: 0,
    };
    setCandidates((prev) => [...prev, newCandidate]);

    // Add a question for the new candidate
    const newQuestions = [
      { question: `On a scale of -10 to 10, how would you rate ${candidateName} as a candidate?`, id: candidateName },
    ];

    // Add head-to-head questions for the new candidate against opposing party candidates
    const opposingParty = party === "Democrat" ? "Republican" : "Democrat";
    const opposingCandidates = candidates.filter((c) => c.party === opposingParty);

    opposingCandidates.forEach((opponent) => {
      newQuestions.push({
        question: `In ${candidateName} vs. ${opponent.name}, what is the probability that ${candidateName} wins?`,
        id: `${candidateName}-vs-${opponent.name}`,
      });
    });

    setQuestions((prevQuestions) => [...prevQuestions, ...newQuestions]);
  };

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
          <div className="mb-3 text-sm font-medium text-slate-700">{userParty} candidates</div>
          <div>
            <button
              onClick={() => {
                const candidateName = prompt("Enter candidate name:");
                if (candidateName) {
                  handleAddCandidate(userParty, candidateName);
                  console.log(`Candidate ${candidateName} added.`);
                }
              }}
            >
              Add candidate
            </button>
            <ul>
              {candidates
                .filter((candidate) => candidate.party === userParty)
                .map((candidate) => (
                  <li key={candidate.id} className="flex items-center gap-3">
                    <span>{candidate.name}</span>
                    <button
                      onClick={() =>
                        setCandidates((prev) =>
                          prev.filter((c) => c.id !== candidate.id)
                        )
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-medium text-slate-700">Answer the questions</h2>
          <ul className="mt-4 space-y-6">
            {questions.map((q) => (
              <li key={q.id} className="flex flex-col">
                <span className="text-sm text-slate-700">{q.question}</span>
                {q.question.includes("rate") ? (
                  <div className="flex gap-2">
                    {[...Array(11).keys()].map((value) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name={q.id}
                          value={value}
                          onChange={() => handleAnswerChange(q.id, value)}
                        />
                        {value}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    type="number"
                    name={q.id}
                    onChange={(e) =>
                      handleAnswerChange(q.id, parseFloat(e.target.value) || 0)
                    }
                    className="w-20 rounded-md border border-slate-300 p-2 text-sm"
                  />
                )}
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
      </div>
    </main>
  );
}