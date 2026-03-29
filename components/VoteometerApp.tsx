"use client";

import { Chart as ChartJS, CategoryScale, BarElement, LinearScale, Title, Tooltip } from "chart.js";
import { useEffect, useState, useMemo } from "react";
import { seedCandidates, seedMatchups } from "@/lib/seedData";
import type { Candidate, Matchup, Party } from "@/lib/types";
import { Bar } from "react-chartjs-2";

// Register the required components
ChartJS.register(CategoryScale, BarElement, LinearScale, Title, Tooltip);

export default function VoteometerApp() {
  const [stage, setStage] = useState<"setup" | "questions" | "results">("setup");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userParty, setUserParty] = useState<Party>("Democrat");
  const [candidates, setCandidates] = useState<Candidate[]>(seedCandidates);
  const [questions, setQuestions] = useState<{ question: string; id: string }[]>([
    { question: "Static question 1", id: "q1" },
    { question: "Static question 2", id: "q2" },
  ]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | number>>({
    q1: 50,
    q2: 75,
  });
  const [removedCandidateNames, setRemovedCandidateNames] = useState<string[]>([]);
  const [isApplyingExpertEstimates, setIsApplyingExpertEstimates] = useState(false);
  const [expertEstimateMessage, setExpertEstimateMessage] = useState<string | null>(null);

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
    const defaultQuestions = partyQuestions[userParty]
      .filter((q) => !removedCandidateNames.some((name) => q.includes(name)))
      .map((q) => ({ question: q, id: q }));
    setQuestions(defaultQuestions);
    setSelectedAnswers((prev) => {
      const filteredAnswers = Object.keys(prev)
        .filter((key) => defaultQuestions.some((dq) => dq.id === key))
        .reduce((acc, key) => ({ ...acc, [key]: prev[key] }), {});
      return filteredAnswers;
    });
  }, [userParty, removedCandidateNames]);

  const handleAnswerChange = (question: string, answer: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [question]: answer }));
  };

  const handleAddCandidate = (party: Party, candidateName: string) => {
    const normalizedName = candidateName.trim();
    if (!normalizedName) return;

    const nameAlreadyExists = candidates.some(
      (candidate) => candidate.party === party && candidate.name.toLowerCase() === normalizedName.toLowerCase()
    );
    if (nameAlreadyExists) {
      alert("That candidate already exists for this party.");
      return;
    }

    const newCandidate: Candidate = {
      id: `test-id-${Date.now()}`, // Replace crypto.randomUUID() with a static ID for testing
      name: normalizedName,
      party,
      rating: 0,
    };
    setCandidates((prev) => [...prev, newCandidate]);
    setRemovedCandidateNames((prev) => {
      if (!prev.includes(normalizedName)) return prev;
      return prev.filter((name) => name !== normalizedName);
    });

    // Add a question for the new candidate
    const newQuestions = [
      { question: `On a scale of -10 to 10, how would you rate ${normalizedName} as a candidate?`, id: normalizedName },
    ];

    // Add head-to-head questions for the new candidate against all other candidates
    candidates.forEach((opponent) => {
      if (opponent.id !== newCandidate.id) {
        const [first, second] = [normalizedName, opponent.name].sort(); // Ensure consistent ordering
        newQuestions.push({
          question: `In ${first} vs. ${second}, what is the probability that ${first} wins?`,
          id: `${first}-vs-${second}`,
        });
      }
    });

    setQuestions((prevQuestions) => [...prevQuestions, ...newQuestions]);
  };

  const handleRemoveCandidate = (candidateToRemove: Candidate) => {
    setCandidates((prev) => prev.filter((candidate) => candidate.id !== candidateToRemove.id));
    setRemovedCandidateNames((prev) =>
      prev.includes(candidateToRemove.name) ? prev : [...prev, candidateToRemove.name]
    );
    setQuestions((prevQuestions) =>
      prevQuestions.filter((q) => !q.question.includes(candidateToRemove.name) && !q.id.includes(candidateToRemove.name))
    );
    setSelectedAnswers((prevAnswers) =>
      Object.keys(prevAnswers)
        .filter((key) => !key.includes(candidateToRemove.name))
        .reduce((acc, key) => ({ ...acc, [key]: prevAnswers[key] }), {})
    );
  };

  const getQuestionCandidates = (question: string) => {
    const matches = candidates
      .map((candidate) => ({
        candidate,
        position: question.indexOf(candidate.name),
      }))
      .filter((entry) => entry.position >= 0)
      .sort((a, b) => a.position - b.position)
      .map((entry) => entry.candidate);

    const uniqueById = new Map(matches.map((candidate) => [candidate.id, candidate]));
    return Array.from(uniqueById.values()).slice(0, 2);
  };

  const getExpertProbabilityForQuestion = (question: string, matchups: Matchup[]) => {
    if (question.toLowerCase().includes("rate")) return null;

    const [candidateA, candidateB] = getQuestionCandidates(question);
    if (!candidateA || !candidateB) return null;
    if (candidateA.party === candidateB.party) return null;

    const matchup = matchups.find(
      (m) =>
        (m.democratCandidateId === candidateA.id && m.republicanCandidateId === candidateB.id) ||
        (m.democratCandidateId === candidateB.id && m.republicanCandidateId === candidateA.id)
    );
    if (!matchup) return null;

    const winner = [candidateA, candidateB].find((candidate) =>
      question.includes(`${candidate.name} wins`)
    );
    if (!winner) return null;

    const democratCandidateId =
      candidateA.party === "Democrat" ? candidateA.id : candidateB.id;
    const democratWinProb =
      matchup.democratCandidateId === democratCandidateId
        ? matchup.democratWinProb
        : 100 - matchup.democratWinProb;

    return winner.party === "Democrat" ? democratWinProb : 100 - democratWinProb;
  };

  const applyExpertEstimates = async (questionId?: string) => {
    setIsApplyingExpertEstimates(true);
    setExpertEstimateMessage(null);

    try {
      const response = await fetch("/api/matchups");
      if (!response.ok) {
        throw new Error("Unable to fetch expert matchup data.");
      }

      const matchups = (await response.json()) as Matchup[];
      const questionsToFill = questions.filter(
        (q) => !q.question.toLowerCase().includes("rate") && (!questionId || q.id === questionId)
      );

      let filledCount = 0;
      const updates: Record<string, number> = {};
      for (const q of questionsToFill) {
        const expertProb = getExpertProbabilityForQuestion(q.question, matchups);
        if (typeof expertProb === "number") {
          updates[q.id] = expertProb;
          filledCount += 1;
        }
      }

      if (filledCount === 0) {
        setExpertEstimateMessage("No expert estimate available for this question set.");
        return;
      }

      setSelectedAnswers((prev) => ({ ...prev, ...updates }));
      setExpertEstimateMessage(
        questionId
          ? "Expert estimate applied to this question."
          : `Expert estimates applied to ${filledCount} electability questions.`
      );
    } catch {
      setExpertEstimateMessage("Could not load expert estimates right now. Try again.");
    } finally {
      setIsApplyingExpertEstimates(false);
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

  const ownPartyCandidates = candidates.filter((candidate) => candidate.party === userParty);
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const currentAnswer = currentQuestion ? selectedAnswers[currentQuestion.id] : undefined;
  const isCurrentQuestionAnswered = typeof currentAnswer === "number";
  const progressPercent = totalQuestions > 0
    ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)
    : 0;

  const startQuestionnaire = () => {
    if (!questions.length) {
      alert("No questions are available yet.");
      return;
    }
    setCurrentQuestionIndex(0);
    setStage("questions");
  };

  const goToNextQuestion = () => {
    if (!currentQuestion) return;
    if (!isCurrentQuestionAnswered) {
      alert("Please answer this question before continuing.");
      return;
    }

    if (currentQuestionIndex >= totalQuestions - 1) {
      setStage("results");
      return;
    }
    setCurrentQuestionIndex((prev) => prev + 1);
  };

  const goToPreviousQuestion = () => {
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-100 text-black">
      <main className="min-h-screen">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <header className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium tracking-wide text-zinc-600">
                DECISION TOOL
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight">Voteometer</h1>
              <p className="mt-2 max-w-2xl text-base text-zinc-600">
                Compare how much you like each candidate with how likely they are to win.
              </p>
            </div>
          </header>

          {stage === "setup" && (
            <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <h2 className="text-lg font-semibold text-zinc-900">Step 1: Setup</h2>
              <p className="mt-1 text-sm text-zinc-600">Choose your party and confirm candidates before starting the flashcards.</p>

              <div className="mt-5 inline-flex rounded-xl border border-zinc-300 bg-zinc-50 p-1">
                <button
                  onClick={() => setUserParty("Democrat")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    userParty === "Democrat"
                      ? "bg-black text-white"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  Democrat
                </button>
                <button
                  onClick={() => setUserParty("Republican")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    userParty === "Republican"
                      ? "bg-black text-white"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  Republican
                </button>
              </div>

              <div className="mt-6 border-t border-zinc-200 pt-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">{userParty} candidates</h3>
                  <button
                    onClick={() => {
                      const candidateName = prompt("Enter candidate name:");
                      if (candidateName) {
                        handleAddCandidate(userParty, candidateName);
                      }
                    }}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-50"
                  >
                    Add candidate
                  </button>
                </div>

                <ul className="mt-4 flex flex-wrap gap-2">
                  {ownPartyCandidates.map((candidate) => (
                    <li key={candidate.id} className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-100">
                      <span className="font-medium text-zinc-800">{candidate.name}</span>
                      <button
                        onClick={() => handleRemoveCandidate(candidate)}
                        className="rounded-full px-1 text-red-600 hover:bg-red-50"
                        aria-label={`Remove ${candidate.name}`}
                      >
                        x
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={startQuestionnaire}
                  className="rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800"
                >
                  Continue to Flashcards
                </button>
              </div>
            </section>
          )}

          {stage === "questions" && currentQuestion && (
            <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-zinc-600">
                  Step 2: Question {currentQuestionIndex + 1} of {totalQuestions}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => applyExpertEstimates()}
                    disabled={isApplyingExpertEstimates}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isApplyingExpertEstimates ? "Applying..." : "Use expert estimates"}
                  </button>
                  <button
                    onClick={() => setStage("setup")}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Back to setup
                  </button>
                </div>
              </div>

              {expertEstimateMessage && (
                <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                  {expertEstimateMessage}
                </div>
              )}

              <div className="mb-6 h-2 overflow-hidden rounded-full bg-zinc-200">
                <div
                  className="h-full rounded-full bg-black transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
                <p className="text-lg font-semibold leading-relaxed text-zinc-900">{currentQuestion.question}</p>

                {currentQuestion.question.includes("rate") ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {Array.from({ length: 21 }, (_, i) => i - 10).map((value) => {
                      const checked = selectedAnswers[currentQuestion.id] === value;
                      return (
                        <label
                          key={value}
                          className={`inline-flex cursor-pointer items-center rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                            checked
                              ? "border-black bg-black text-white"
                              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                          }`}
                        >
                          <input
                            type="radio"
                            name={currentQuestion.id}
                            value={value}
                            checked={checked}
                            onChange={() => handleAnswerChange(currentQuestion.id, value)}
                            className="sr-only"
                          />
                          {value}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 max-w-xs">
                    <label htmlFor={currentQuestion.id} className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Enter probability (0 to 100)
                    </label>
                    <input
                      id={currentQuestion.id}
                      type="number"
                      name={currentQuestion.id}
                      min={0}
                      max={100}
                      value={typeof selectedAnswers[currentQuestion.id] === "number" ? (selectedAnswers[currentQuestion.id] as number) : ""}
                      onChange={(e) => {
                        const raw = parseFloat(e.target.value);
                        if (Number.isNaN(raw)) {
                          handleAnswerChange(currentQuestion.id, 0);
                          return;
                        }
                        handleAnswerChange(currentQuestion.id, Math.max(0, Math.min(100, raw)));
                      }}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                    />
                    <button
                      onClick={() => applyExpertEstimates(currentQuestion.id)}
                      disabled={isApplyingExpertEstimates}
                      className="mt-3 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isApplyingExpertEstimates ? "Applying..." : "Use expert estimate for this question"}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={goToPreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-zinc-50"
                >
                  Previous
                </button>

                <button
                  onClick={goToNextQuestion}
                  className="rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800"
                >
                  {currentQuestionIndex === totalQuestions - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </section>
          )}

          {stage === "results" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-zinc-900">How The Math Works</h2>
                    <button
                      onClick={() => setStage("questions")}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Review answers
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-zinc-600">
                    We combine your candidate ratings with both primary odds and general-election odds to compute expected value.
                  </p>

                  <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs text-zinc-700">
{`D1 = [D1P x R1W x D1R1] + [D1P x R2W x D1R2] + [R1P x R1W x R1D1] + [R2P x R2W x R2D1]
D2 = [D2P x R1W x D2R1] + [D2P x R2W x D2R2] + [R1P x R1W x R1D2] + [R2P x R2W x R2D2]`}
                  </div>

                  <details className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-zinc-800">Worked example (expand)</summary>
                    <div className="mt-3 space-y-2 text-sm text-zinc-700">
                      <p>D1P = 5, D2P = 9, R1P = -10, R2P = -8</p>
                      <p>R1W = 0.9, R2W = 0.1</p>
                      <p>D1R1 = 0.7, D1R2 = 0.5, D2R1 = 0.4, D2R2 = 0.2</p>
                      <p className="pt-1 font-medium">D1 = 3.15 + 0.25 - 2.70 - 0.32 = 0.38</p>
                      <p className="font-medium">D2 = 3.24 + 0.18 - 5.40 - 0.64 = -2.62</p>
                    </div>
                  </details>
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-zinc-900 bg-zinc-900 p-6 text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Recommended Candidate</p>
                  {recommendedCandidate ? (
                    <>
                      <h2 className="mt-2 text-3xl font-bold">{recommendedCandidate.name}</h2>
                      <p className="mt-1 text-sm text-zinc-300">{recommendedCandidate.party}</p>
                      <div className="mt-5 rounded-xl bg-white/10 p-3">
                        <p className="text-xs uppercase tracking-wide text-zinc-300">Power Number</p>
                        <p className="mt-1 text-2xl font-semibold">{recommendedCandidate.powerNumber.toFixed(2)}</p>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-300">No recommendation available yet.</p>
                  )}
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-900">Power Number Comparison</h2>
                      <p className="text-sm text-zinc-600">Compare overall scores across your party candidates.</p>
                    </div>
                    <button
                      onClick={() => setStage("setup")}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      New setup
                    </button>
                  </div>
                  <div className="h-[360px]">
                    <Bar data={powerNumberData} options={chartOptions} />
                  </div>
                </section>
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}