"use client";

import { Chart as ChartJS, CategoryScale, BarElement, LinearScale, Title, Tooltip } from "chart.js";
import { useEffect, useState, useMemo } from "react";
import CandidateEditor from "@/components/CandidateEditor";
import MatchupEditor from "@/components/MatchupEditor";
import ResultsPanel from "@/components/ResultsPanel";
import { calculateScores } from "@/lib/scoring";
import { seedCandidates, seedMatchups } from "@/lib/seedData";
import type { Candidate, Matchup, Party } from "@/lib/types";
import { Bar } from "react-chartjs-2";

// Register the required components
ChartJS.register(CategoryScale, BarElement, LinearScale, Title, Tooltip);

export default function VoteometerApp() {
  const [userParty, setUserParty] = useState<Party>("Democrat");
  const [candidates, setCandidates] = useState<Candidate[]>(seedCandidates);
  const [matchups, setMatchups] = useState<Matchup[]>(seedMatchups);
  const [questions, setQuestions] = useState<{ question: string; id: string }[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | number>>({});
  const [darkMode, setDarkMode] = useState(false);

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

  useEffect(() => {
    // Filter questions and reset answers for the selected party
    const defaultQuestions = partyQuestions[userParty].map((q) => ({ question: q, id: q }));
    setQuestions(defaultQuestions);
    setSelectedAnswers((prev) => {
      const filteredAnswers = Object.keys(prev)
        .filter((key) => defaultQuestions.some((dq) => dq.id === key))
        .reduce((acc, key) => ({ ...acc, [key]: prev[key] }), {});
      return filteredAnswers;
    });
  }, [userParty]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

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

    // Add head-to-head questions for the new candidate against all other candidates
    candidates.forEach((opponent) => {
      if (opponent.id !== newCandidate.id) {
        const [first, second] = [candidateName, opponent.name].sort(); // Ensure consistent ordering
        newQuestions.push({
          question: `In ${first} vs. ${second}, what is the probability that ${first} wins?`,
          id: `${first}-vs-${second}`,
        });
      }
    });

    setQuestions((prevQuestions) => [...prevQuestions, ...newQuestions]);
  };

  const validateProbability = (value) => {
    if (value < 0 || value > 100) {
      alert("Please enter a probability between 0 and 100.");
      return false;
    }
    return true;
  };

  const handleProbabilityInput = (questionId, value) => {
    if (validateProbability(value)) {
      setSelectedAnswers((prev) => ({ ...prev, [questionId]: value }));
    }
  };

  const calculatePowerNumbers = useMemo(() => {
    return candidates.map((candidate) => {
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
  }, [candidates, selectedAnswers]);

  const recommendedCandidate = useMemo(() => {
    if (!calculatePowerNumbers.length) return null;
    return calculatePowerNumbers
      .filter((candidate) => candidate.party === userParty) // Only consider candidates from the selected party
      .reduce((best, candidate) =>
        candidate.powerNumber > best.powerNumber ? candidate : best
      , { id: "", name: "", party: userParty, rating: 0, powerNumber: 0 }); // Default to a valid candidate object
  }, [calculatePowerNumbers, userParty]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  const powerNumberData = {
    labels: candidates.map((candidate) => candidate.name),
    datasets: [
      {
        label: "Power Numbers",
        data: candidates.map((candidate) => candidate.powerNumber),
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className={darkMode ? "dark" : ""}>
      <button onClick={toggleDarkMode} className="dark-mode-toggle">
        {darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      </button>
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

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-medium text-slate-700">{userParty} candidates</div>
            <div>
              <button
                onClick={() => {
                  const candidateName = prompt("Enter candidate name:");
                  if (candidateName) {
                    handleAddCandidate(userParty, candidateName);
                  }
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
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
                        className="text-sm text-red-500 hover:underline"
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

          <div>
            <h2>How the Math is Calculated</h2>
            <p>The Power Number is calculated using the following formula:</p>
            <ul>
              <li>Column 1: [Candidate Strength] x [Opponent Primary Win Probability] x [General Election Win Probability]</li>
              <li>Column 2: [Candidate Strength] x [Opponent Primary Win Probability] x [General Election Win Probability]</li>
              <li>Column 3: [Opponent Strength] x [Opponent Primary Win Probability] x [General Election Win Probability]</li>
              <li>Column 4: [Opponent Strength] x [Opponent Primary Win Probability] x [Opponent General Election Win Probability]</li>
            </ul>
          </div>

          <div>
            <h2>Power Number Comparison</h2>
            <Bar data={powerNumberData} />
          </div>
        </div>
      </main>
    </div>
  );
}