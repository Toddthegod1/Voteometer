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
  const [questions, setQuestions] = useState<{ question: string; id: string }[]>([
    { question: "Static question 1", id: "q1" },
    { question: "Static question 2", id: "q2" },
  ]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | number>>({
    q1: 50,
    q2: 75,
  });

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

  const handleAnswerChange = (question: string, answer: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [question]: answer }));
  };

  const handleAddCandidate = (party: Party, candidateName: string) => {
    const newCandidate: Candidate = {
      id: `test-id-${Date.now()}`, // Replace crypto.randomUUID() with a static ID for testing
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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#000000",
        },
      },
      title: {
        display: true,
        text: "Power Number Comparison",
        color: "#000000",
      },
    },
    scales: {
      x: {
        ticks: { color: "#000000" },
        grid: { color: "rgba(0,0,0,0.1)" },
      },
      y: {
        ticks: { color: "#000000" },
        grid: { color: "rgba(0,0,0,0.1)" },
      },
    },
  };

  const powerNumberData = {
    labels: calculatePowerNumbers.map((candidate) => candidate.name),
    datasets: [
      {
        label: "Power Numbers",
        data: calculatePowerNumbers.map((candidate) => candidate.powerNumber),
        backgroundColor: "rgba(75,192,192,0.2)",
        borderColor: "rgba(75,192,192,1)",
        borderWidth: 1,
      },
    ],
  };

  useEffect(() => {
    console.log("Datasets:", powerNumberData.datasets);
  }, [powerNumberData]);

  return (
    <div className="min-h-screen bg-white text-black">
      <main className="min-h-screen p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Voteometer</h1>
            <p className="mt-2 max-w-3xl text-gray-600">
              Compare how much you like each candidate with how likely they are to win.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-medium text-gray-700">Choose your party</div>
            <div className="flex gap-3">
              <button
                onClick={() => setUserParty("Democrat")}
                className={`rounded-lg px-4 py-2 ${
                  userParty === "Democrat"
                    ? "bg-black text-white"
                    : "border border-gray-300 bg-white text-black"
                }`}
              >
                Democrat
              </button>
              <button
                onClick={() => setUserParty("Republican")}
                className={`rounded-lg px-4 py-2 ${
                  userParty === "Republican"
                    ? "bg-black text-white"
                    : "border border-gray-300 bg-white text-black"
                }`}
              >
                Republican
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-medium text-gray-700">{userParty} candidates</div>
            <div>
              <button
                onClick={() => {
                  const candidateName = prompt("Enter candidate name:");
                  if (candidateName) {
                    handleAddCandidate(userParty, candidateName);
                  }
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-black hover:bg-gray-50"
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

          <div className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-medium text-gray-700">Answer the questions</h2>
            <ul className="mt-4 space-y-6">
              {questions.map((q) => (
                <li key={q.id} className="flex flex-col">
                  <span className="text-sm text-gray-700">{q.question}</span>
                  {q.question.includes("rate") ? (
                    <div className="flex gap-2">
                      {[...Array(11).keys()].map((value) => (
                        <label key={value} className="text-gray-700">
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
                      className="w-20 rounded-md border border-gray-300 p-2 text-sm text-black"
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-medium text-gray-700">Recommended Candidate</h2>
            {recommendedCandidate ? (
              <div className="mt-4">
                <p className="text-sm text-gray-700">
                  Based on your answers, we recommend:
                </p>
                <p className="mt-2 text-xl font-bold text-black">
                  {recommendedCandidate.name} ({recommendedCandidate.party})
                </p>
                <p className="text-sm text-gray-600">
                  Power Number: {recommendedCandidate.powerNumber.toFixed(2)}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-600">No recommendation available.</p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-medium text-gray-700">How the Math is Calculated</h2>
            <p className="mt-2 text-gray-600">
              Each candidate gets a <strong>Power Number</strong> — a single score that combines how much
              you like them with how likely they are to win. The higher the number, the better the pick.
            </p>

            <h3 className="mt-4 font-semibold text-gray-800">Step 1 — Rate the candidate</h3>
            <p className="mt-1 text-gray-600">
              You rate each candidate on a scale of <strong>0 to 10</strong> (how good you think they
              would be). This is their <em>Candidate Strength</em>.
            </p>

            <h3 className="mt-4 font-semibold text-gray-800">Step 2 — Estimate head-to-head win probabilities</h3>
            <p className="mt-1 text-gray-600">
              For every matchup (e.g. Biden vs. Trump), you enter a probability (0–100) representing how
              likely the candidate is to win that race.
            </p>

            <h3 className="mt-4 font-semibold text-gray-800">Step 3 — Sum all scores</h3>
            <p className="mt-1 text-gray-600">
              The Power Number is the <strong>sum</strong> of every answer that involves that candidate —
              their rating plus all of their matchup probabilities. A candidate who is both highly rated
              and likely to win in multiple matchups will accumulate the highest total.
            </p>

            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
              <p className="font-semibold">Example:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>You rate Biden an <strong>8</strong></li>
                <li>Biden vs. Trump win probability: <strong>60</strong></li>
                <li>Biden vs. DeSantis win probability: <strong>55</strong></li>
                <li>Biden vs. Sanders win probability: <strong>70</strong></li>
              </ul>
              <p className="mt-3">
                Biden's Power Number = 8 + 60 + 55 + 70 = <strong>193</strong>
              </p>
              <p className="mt-2 text-gray-500">
                The candidate with the highest Power Number among your party is shown as the recommendation.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-medium text-gray-700">Power Number Comparison</h2>
            <div style={{ height: '400px', width: '100%' }} className="mt-4">
              <Bar data={powerNumberData} options={chartOptions} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}