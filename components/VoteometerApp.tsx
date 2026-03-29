"use client";

import { Chart as ChartJS, CategoryScale, BarElement, LinearScale, Title, Tooltip } from "chart.js";
import { useEffect, useState, useMemo } from "react";
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

  const partyQuestions: Record<Party, string[]> = {
    Democrat: [
      "On a scale of -10 to 10, how would you rate Biden as president?",
      "On a scale of -10 to 10, how would you rate Sanders as president?",
      "On a scale of -10 to 10, how would you rate Trump as president?",
      "On a scale of -10 to 10, how would you rate DeSantis as president?",
      "In Biden vs. Sanders, what is the probability that Biden wins?",
      "In Trump vs. DeSantis, what is the probability that Trump wins?",
      "In Biden vs. Trump, what is the probability Biden wins?",
      "In Biden vs. DeSantis, what is the probability Biden wins?",
      "In Sanders vs. Trump, what is the probability Sanders wins?",
      "In Sanders vs. DeSantis, what is the probability Sanders wins?",
    ],
    Republican: [
      "On a scale of -10 to 10, how would you rate Biden as president?",
      "On a scale of -10 to 10, how would you rate Sanders as president?",
      "On a scale of -10 to 10, how would you rate Trump as president?",
      "On a scale of -10 to 10, how would you rate DeSantis as president?",
      "In Trump vs. DeSantis, what is the probability that Trump wins?",
      "In Biden vs. Sanders, what is the probability that Biden wins?",
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

  const getCandidateRating = (candidate: Candidate) => {
    const ratingQuestion = Object.entries(selectedAnswers).find(([question]) =>
      question.toLowerCase().includes("how would you rate") && question.includes(candidate.name)
    );
    if (ratingQuestion && typeof ratingQuestion[1] === "number") {
      return ratingQuestion[1] as number;
    }
    return candidate.rating;
  };

  const getWinProbability = (candidateA: Candidate, candidateB: Candidate) => {
    const directQuestion = Object.entries(selectedAnswers).find(([question]) =>
      question.includes(candidateA.name) &&
      question.includes(candidateB.name) &&
      question.toLowerCase().includes("probability")
    );

    if (!directQuestion || typeof directQuestion[1] !== "number") {
      const seedMatchup = seedMatchups.find(
        (m) =>
          m.democratCandidateId === candidateA.id && m.republicanCandidateId === candidateB.id
      );
      if (seedMatchup) return seedMatchup.democratWinProb / 100;

      const reverseSeedMatchup = seedMatchups.find(
        (m) =>
          m.democratCandidateId === candidateB.id && m.republicanCandidateId === candidateA.id
      );
      if (reverseSeedMatchup) return 1 - reverseSeedMatchup.democratWinProb / 100;

      return 0.5;
    }

    const [question, value] = directQuestion;
    const probability = (value as number) / 100;
    return question.includes(`${candidateA.name} wins`) ? probability : 1 - probability;
  };

  const getOpponentPrimaryProbabilities = (opponents: Candidate[]) => {
    if (opponents.length !== 2) {
      const uniform = 1 / Math.max(opponents.length, 1);
      return new Map(opponents.map((opponent) => [opponent.id, uniform]));
    }

    const [opp1, opp2] = opponents;
    const pOpp1 = getWinProbability(opp1, opp2);
    return new Map<string, number>([
      [opp1.id, pOpp1],
      [opp2.id, 1 - pOpp1],
    ]);
  };

  const calculatePowerNumbers = useMemo(() => {
    const opponentParty: Party = userParty === "Democrat" ? "Republican" : "Democrat";
    const ownCandidates = candidates.filter((candidate) => candidate.party === userParty);
    const opponentCandidates = candidates.filter((candidate) => candidate.party === opponentParty);
    const opponentPrimaryProbabilities = getOpponentPrimaryProbabilities(opponentCandidates);

    return ownCandidates.map((candidate) => {
      const ownRating = getCandidateRating(candidate);

      const powerNumber = opponentCandidates.reduce((sum, opponent) => {
        const opponentRating = getCandidateRating(opponent);
        const opponentPrimaryProb = opponentPrimaryProbabilities.get(opponent.id) ?? 0;
        const ownGeneralWinProb = getWinProbability(candidate, opponent);

        const expectedValueAgainstOpponent =
          ownGeneralWinProb * ownRating + (1 - ownGeneralWinProb) * opponentRating;

        return sum + opponentPrimaryProb * expectedValueAgainstOpponent;
      }, 0);

      return {
        ...candidate,
        powerNumber,
      };
    });
  }, [candidates, selectedAnswers, userParty]);

  const recommendedCandidate = useMemo(() => {
    const ownPartyCandidates = calculatePowerNumbers.filter(
      (candidate) => candidate.party === userParty
    );
    if (!ownPartyCandidates.length) return null;

    return ownPartyCandidates.reduce((best, candidate) =>
      candidate.powerNumber > best.powerNumber ? candidate : best
    , ownPartyCandidates[0]);
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
                      {Array.from({ length: 21 }, (_, i) => i - 10).map((value) => (
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
              For the two candidates in your party, we compute a Power Number by combining:
              candidate quality, opponent primary odds, and general-election odds.
            </p>

            <h3 className="mt-4 font-semibold text-gray-800">Variable Key</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
              <li>D1, D2: Democratic candidates (for example, Biden and Sanders)</li>
              <li>R1, R2: Republican candidates (for example, Trump and DeSantis)</li>
              <li>D1P, D2P, R1P, R2P: your rating for each candidate (scale -10 to 10)</li>
              <li>R1W, R2W: probability each Republican wins the Republican primary</li>
              <li>D1R1: probability D1 beats R1 in the general election</li>
              <li>R1D1 = 1 - D1R1 (same matchup from R1 perspective)</li>
            </ul>

            <h3 className="mt-4 font-semibold text-gray-800">Four-Column Form (Democratic primary)</h3>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
{`D1 = [D1P x R1W x D1R1] + [D1P x R2W x D1R2] + [R1P x R1W x R1D1] + [R2P x R2W x R2D1]
D2 = [D2P x R1W x D2R1] + [D2P x R2W x D2R2] + [R1P x R1W x R1D2] + [R2P x R2W x R2D2]`}
            </pre>
            <p className="mt-2 text-sm text-gray-600">
              Read each term as: chance that this opponent reaches the general election,
              times the expected value of that matchup.
            </p>

            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
              <p className="font-semibold">Worked Example (Democrat)</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>D1P = 5, D2P = 9, R1P = -10, R2P = -8</li>
                <li>R1W = 0.9, R2W = 0.1</li>
                <li>D1R1 = 0.7, D1R2 = 0.5, D2R1 = 0.4, D2R2 = 0.2</li>
                <li>R1D1 = 0.3, R2D1 = 0.5, R1D2 = 0.6, R2D2 = 0.8</li>
              </ul>

              <p className="mt-3 font-medium">D1 (Biden)</p>
              <p>
                [5 x 0.9 x 0.7] + [5 x 0.1 x 0.5] + [-10 x 0.9 x 0.3] + [-8 x 0.1 x 0.4]
              </p>
              <p>
                = 3.15 + 0.25 - 2.70 - 0.32 = <strong>0.38</strong>
              </p>

              <p className="mt-3 font-medium">D2 (Sanders)</p>
              <p>
                [9 x 0.9 x 0.4] + [9 x 0.1 x 0.2] + [-10 x 0.9 x 0.6] + [-8 x 0.1 x 0.8]
              </p>
              <p>
                = 3.24 + 0.18 - 5.40 - 0.64 = <strong>-2.62</strong>
              </p>

              <p className="mt-3 text-gray-600">
                Since 0.38 is greater than -2.62, D1 is recommended.
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