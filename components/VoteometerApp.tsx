"use client";

import { Chart as ChartJS, CategoryScale, BarElement, LinearScale, Title, Tooltip } from "chart.js";
import { useEffect, useState, useMemo } from "react";
import { seedCandidates, seedMatchups } from "@/lib/seedData";
import type { Candidate, Matchup, Party } from "@/lib/types";
import { Bar } from "react-chartjs-2";

type NameMatchup = {
  democratName: string;
  republicanName: string;
  democratWinProb: number;
  source: "polymarket" | "seed-exact" | "name-estimate";
};

type ExpertSource = NameMatchup["source"];

const suggested2028Candidates: Record<Party, string[]> = {
  Democrat: ["Kamala Harris", "Gavin Newsom", "Gretchen Whitmer", "Josh Shapiro", "Pete Buttigieg", "Wes Moore"],
  Republican: ["JD Vance", "Ron DeSantis", "Nikki Haley", "Glenn Youngkin", "Vivek Ramaswamy", "Marco Rubio"],
};

function clampProbability(probability: number) {
  return Math.max(0.01, Math.min(0.99, probability));
}

function buildQuestionsForCandidates(candidates: Candidate[], userParty: Party) {
  const ownCandidates = candidates.filter((candidate) => candidate.party === userParty);
  const opponentParty: Party = userParty === "Democrat" ? "Republican" : "Democrat";
  const opponentCandidates = candidates.filter((candidate) => candidate.party === opponentParty);
  const allCandidates = [...ownCandidates, ...opponentCandidates];

  const ratingQuestions = allCandidates.map((candidate) => ({
    question: `On a scale of -10 to 10, how would you rate ${candidate.name} as president?`,
    id: `rating:${candidate.party}:${candidate.name}`,
  }));

  const ownPrimaryQuestions = ownCandidates.length > 2
    ? ownCandidates.flatMap((candidate, index) =>
        ownCandidates.slice(index + 1).map((opponent) => ({
          question: `In ${candidate.name} vs. ${opponent.name}, what is the probability that ${candidate.name} wins the ${candidate.party.toLowerCase()} primary?`,
          id: `primary:${candidate.party}:${candidate.name}:${opponent.name}`,
        }))
      )
    : [];

  const opponentPrimaryQuestions = opponentCandidates.flatMap((candidate, index) =>
    opponentCandidates.slice(index + 1).map((opponent) => ({
      question: `In ${candidate.name} vs. ${opponent.name}, what is the probability that ${candidate.name} wins the ${candidate.party.toLowerCase()} primary?`,
      id: `primary:${candidate.party}:${candidate.name}:${opponent.name}`,
    }))
  );

  const generalElectionQuestions = ownCandidates.flatMap((ownCandidate) =>
    opponentCandidates.map((opponent) => ({
      question: `In ${ownCandidate.name} vs. ${opponent.name}, what is the probability that ${ownCandidate.name} wins?`,
      id: `general:${ownCandidate.name}:${opponent.name}`,
    }))
  );

  return [...ratingQuestions, ...ownPrimaryQuestions, ...opponentPrimaryQuestions, ...generalElectionQuestions];
}

// Register the required components
ChartJS.register(CategoryScale, BarElement, LinearScale, Title, Tooltip);

export default function VoteometerApp() {
  const [stage, setStage] = useState<"setup" | "questions" | "results">("setup");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userParty, setUserParty] = useState<Party>("Democrat");
  const [candidates, setCandidates] = useState<Candidate[]>(seedCandidates);
  const [questions, setQuestions] = useState<{ question: string; id: string }[]>(() =>
    buildQuestionsForCandidates(seedCandidates, "Democrat")
  );
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | number>>({});
  const [removedCandidateNames, setRemovedCandidateNames] = useState<string[]>([]);
  const [isApplyingExpertEstimates, setIsApplyingExpertEstimates] = useState(false);
  const [expertEstimateMessage, setExpertEstimateMessage] = useState<string | null>(null);
  const [expertEstimateSources, setExpertEstimateSources] = useState<Record<string, ExpertSource>>({});

  useEffect(() => {
    const generatedQuestions = buildQuestionsForCandidates(candidates, userParty);
    setQuestions(generatedQuestions);
    setSelectedAnswers((prev) => {
      const filteredAnswers = Object.keys(prev)
        .filter((key) => generatedQuestions.some((generatedQuestion) => generatedQuestion.id === key))
        .reduce((acc, key) => ({ ...acc, [key]: prev[key] }), {});
      return filteredAnswers;
    });
    setExpertEstimateSources((prev) =>
      Object.keys(prev)
        .filter((key) => generatedQuestions.some((generatedQuestion) => generatedQuestion.id === key))
        .reduce((acc, key) => ({ ...acc, [key]: prev[key] }), {} as Record<string, ExpertSource>)
    );
  }, [candidates, userParty]);

  const handleAnswerChange = (question: string, answer: number, origin: "manual" | "expert" = "manual") => {
    setSelectedAnswers((prev) => ({ ...prev, [question]: answer }));
    if (origin === "manual") {
      setExpertEstimateSources((prev) => {
        if (!(question in prev)) return prev;
        const { [question]: _discard, ...rest } = prev;
        return rest;
      });
    }
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
    setExpertEstimateSources((prevSources) =>
      Object.keys(prevSources)
        .filter((key) => !key.includes(candidateToRemove.name))
        .reduce((acc, key) => ({ ...acc, [key]: prevSources[key] }), {} as Record<string, ExpertSource>)
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

  const getExpertProbabilityForQuestion = (
    question: string,
    matchups: Matchup[],
    nameMatchups: NameMatchup[]
  ): { probability: number; source: ExpertSource } | null => {
    if (question.toLowerCase().includes("rate")) return null;

    const [candidateA, candidateB] = getQuestionCandidates(question);
    if (!candidateA || !candidateB) return null;
    if (candidateA.party === candidateB.party) return null;

    const winner = [candidateA, candidateB].find((candidate) =>
      question.includes(`${candidate.name} wins`)
    );
    if (!winner) return null;

    const democrat = candidateA.party === "Democrat" ? candidateA : candidateB;
    const republican = candidateA.party === "Republican" ? candidateA : candidateB;

    // Prefer explicit name-based lookups so custom candidates can still be estimated.
    const byName = nameMatchups.find(
      (m) =>
        m.democratName.toLowerCase() === democrat.name.toLowerCase() &&
        m.republicanName.toLowerCase() === republican.name.toLowerCase()
    );
    if (byName) {
      return {
        probability: winner.party === "Democrat"
          ? byName.democratWinProb
          : 100 - byName.democratWinProb,
        source: byName.source,
      };
    }

    const matchup = matchups.find(
      (m) =>
        (m.democratCandidateId === candidateA.id && m.republicanCandidateId === candidateB.id) ||
        (m.democratCandidateId === candidateB.id && m.republicanCandidateId === candidateA.id)
    );
    if (!matchup) return null;

    const democratCandidateId =
      candidateA.party === "Democrat" ? candidateA.id : candidateB.id;
    const democratWinProb =
      matchup.democratCandidateId === democratCandidateId
        ? matchup.democratWinProb
        : 100 - matchup.democratWinProb;

    return {
      probability: winner.party === "Democrat" ? democratWinProb : 100 - democratWinProb,
      source: "seed-exact",
    };
  };

  const applyExpertEstimates = async (questionId?: string) => {
    setIsApplyingExpertEstimates(true);
    setExpertEstimateMessage(null);

    try {
      const activeCandidateNames = Array.from(new Set(candidates.map((candidate) => candidate.name))).join(",");
      const democrats = candidates
        .filter((candidate) => candidate.party === "Democrat")
        .map((candidate) => candidate.name)
        .join(",");
      const republicans = candidates
        .filter((candidate) => candidate.party === "Republican")
        .map((candidate) => candidate.name)
        .join(",");
      const response = await fetch(
        `/api/matchups?electionYear=2028&candidates=${encodeURIComponent(activeCandidateNames)}&democrats=${encodeURIComponent(democrats)}&republicans=${encodeURIComponent(republicans)}`
      );
      if (!response.ok) {
        throw new Error("Unable to fetch expert matchup data.");
      }

      const payload = (await response.json()) as {
        source?: string;
        matchups?: Matchup[];
        nameMatchups?: NameMatchup[];
      };
      const matchups = Array.isArray(payload.matchups) ? payload.matchups : [];
      const nameMatchups = Array.isArray(payload.nameMatchups) ? payload.nameMatchups : [];
      const questionsToFill = questions.filter(
        (q) => !q.question.toLowerCase().includes("rate") && (!questionId || q.id === questionId)
      );

      let filledCount = 0;
      const updates: Record<string, number> = {};
      const sourceUpdates: Record<string, ExpertSource> = {};
      for (const q of questionsToFill) {
        const expertProb = getExpertProbabilityForQuestion(q.question, matchups, nameMatchups);
        if (expertProb) {
          updates[q.id] = expertProb.probability;
          sourceUpdates[q.id] = expertProb.source;
          filledCount += 1;
        }
      }

      if (filledCount === 0) {
        setExpertEstimateMessage("No expert estimate available for this question set.");
        return;
      }

      setSelectedAnswers((prev) => ({ ...prev, ...updates }));
      setExpertEstimateSources((prev) => ({ ...prev, ...sourceUpdates }));
      setExpertEstimateMessage(
        questionId
          ? "Expert estimate applied to this question."
          : `Expert estimates applied to ${filledCount} electability questions (${payload.source ?? "unknown source"}).`
      );
    } catch {
      setExpertEstimateMessage("Could not load expert estimates right now. Try again.");
    } finally {
      setIsApplyingExpertEstimates(false);
    }
  };

  const getCandidateRating = (candidate: Candidate) => {
    const ratingQuestion = Object.entries(selectedAnswers).find(([question]) =>
      question.startsWith("rating:") && question.includes(candidate.name)
    );
    if (ratingQuestion && typeof ratingQuestion[1] === "number") {
      return ratingQuestion[1] as number;
    }
    return candidate.rating;
  };

  const getStoredPairwiseProbability = (
    type: "primary" | "general",
    firstCandidateName: string,
    secondCandidateName: string,
    party?: Party
  ) => {
    const forwardId = type === "primary"
      ? `primary:${party}:${firstCandidateName}:${secondCandidateName}`
      : `general:${firstCandidateName}:${secondCandidateName}`;
    const reverseId = type === "primary"
      ? `primary:${party}:${secondCandidateName}:${firstCandidateName}`
      : `general:${secondCandidateName}:${firstCandidateName}`;

    const forwardValue = selectedAnswers[forwardId];
    if (typeof forwardValue === "number") {
      return forwardValue / 100;
    }

    const reverseValue = selectedAnswers[reverseId];
    if (typeof reverseValue === "number") {
      return 1 - reverseValue / 100;
    }

    return null;
  };

  const getStoredPairwiseProbabilityDebug = (
    type: "primary" | "general",
    firstCandidateName: string,
    secondCandidateName: string,
    party?: Party
  ) => {
    const forwardId = type === "primary"
      ? `primary:${party}:${firstCandidateName}:${secondCandidateName}`
      : `general:${firstCandidateName}:${secondCandidateName}`;
    const reverseId = type === "primary"
      ? `primary:${party}:${secondCandidateName}:${firstCandidateName}`
      : `general:${secondCandidateName}:${firstCandidateName}`;

    const forwardValue = selectedAnswers[forwardId];
    if (typeof forwardValue === "number") {
      return {
        probability: forwardValue / 100,
        source: "answered",
        answerId: forwardId,
      } as const;
    }

    const reverseValue = selectedAnswers[reverseId];
    if (typeof reverseValue === "number") {
      return {
        probability: 1 - reverseValue / 100,
        source: "answered-reversed",
        answerId: reverseId,
      } as const;
    }

    return {
      probability: 0.5,
      source: "fallback-50-50",
      answerId: null,
    } as const;
  };

  const getWinProbability = (candidateA: Candidate, candidateB: Candidate) => {
    const pairwiseProbability = candidateA.party === candidateB.party
      ? getStoredPairwiseProbability("primary", candidateA.name, candidateB.name, candidateA.party)
      : getStoredPairwiseProbability("general", candidateA.name, candidateB.name);

    if (typeof pairwiseProbability !== "number") {
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

    return pairwiseProbability;
  };

  const getPrimaryWinProbabilities = (partyCandidates: Candidate[]) => {
    if (partyCandidates.length === 0) {
      return new Map<string, number>();
    }

    if (partyCandidates.length === 1) {
      return new Map([[partyCandidates[0].id, 1]]);
    }

    if (partyCandidates.length === 2) {
      const [candidateA, candidateB] = partyCandidates;
      const pCandidateA = getWinProbability(candidateA, candidateB);
      return new Map<string, number>([
        [candidateA.id, pCandidateA],
        [candidateB.id, 1 - pCandidateA],
      ]);
    }

    const strengths = partyCandidates.map((candidate) => {
      const averageLogit = partyCandidates
        .filter((opponent) => opponent.id !== candidate.id)
        .reduce((sum, opponent) => {
          const pairwiseWinProb = clampProbability(getWinProbability(candidate, opponent));
          return sum + Math.log(pairwiseWinProb / (1 - pairwiseWinProb));
        }, 0) / Math.max(partyCandidates.length - 1, 1);

      return {
        id: candidate.id,
        strength: Math.exp(averageLogit),
      };
    });

    const totalStrength = strengths.reduce((sum, candidate) => sum + candidate.strength, 0);
    return new Map(
      strengths.map((candidate) => [candidate.id, totalStrength > 0 ? candidate.strength / totalStrength : 1 / partyCandidates.length])
    );
  };

  const opponentParty: Party = userParty === "Democrat" ? "Republican" : "Democrat";
  const ownPartyCandidates = candidates.filter((candidate) => candidate.party === userParty);
  const opposingPartyCandidates = candidates.filter((candidate) => candidate.party === opponentParty);
  const ownPrimaryProbabilities = useMemo(
    () => getPrimaryWinProbabilities(ownPartyCandidates),
    [ownPartyCandidates, selectedAnswers]
  );
  const opponentPrimaryProbabilities = useMemo(
    () => getPrimaryWinProbabilities(opposingPartyCandidates),
    [opposingPartyCandidates, selectedAnswers]
  );
  const ownPrimaryIsModeled = ownPartyCandidates.length > 2;
  const opponentPrimaryIsModeled = opposingPartyCandidates.length > 2;
  const isMultiCandidateMode = ownPrimaryIsModeled || opponentPrimaryIsModeled;

  const calculatePowerNumbers = useMemo(() => {
    return ownPartyCandidates.map((candidate) => {
      const ownRating = getCandidateRating(candidate);

      const breakdown = opposingPartyCandidates.map((opponent) => {
        const opponentRating = getCandidateRating(opponent);
        const opponentPrimaryProb = opponentPrimaryProbabilities.get(opponent.id) ?? 0;
        const ownGeneralWinProb = getWinProbability(candidate, opponent);

        const expectedValueAgainstOpponent =
          ownGeneralWinProb * ownRating + (1 - ownGeneralWinProb) * opponentRating;

        return {
          opponentId: opponent.id,
          opponentName: opponent.name,
          opponentRating,
          opponentNominationProbability: opponentPrimaryProb,
          ownGeneralWinProbability: ownGeneralWinProb,
          expectedValueAgainstOpponent,
          weightedContribution: opponentPrimaryProb * expectedValueAgainstOpponent,
        };
      });

      const presidencyValueIfNominated = breakdown.reduce(
        (sum, detail) => sum + detail.weightedContribution,
        0
      );

      const ownPrimaryProb = ownPrimaryIsModeled ? ownPrimaryProbabilities.get(candidate.id) ?? 0 : 1;

      const powerNumber = ownPrimaryProb * presidencyValueIfNominated;

      return {
        ...candidate,
        nominationProbability: ownPrimaryIsModeled ? ownPrimaryProb : null,
        presidencyValueIfNominated,
        breakdown,
        powerNumber,
      };
    });
  }, [opposingPartyCandidates, opponentPrimaryProbabilities, ownPartyCandidates, ownPrimaryIsModeled, ownPrimaryProbabilities, selectedAnswers]);

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

  const suggestedCandidatesForParty = suggested2028Candidates[userParty].filter(
    (name) => !ownPartyCandidates.some((candidate) => candidate.name.toLowerCase() === name.toLowerCase())
  );
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const currentAnswer = currentQuestion ? selectedAnswers[currentQuestion.id] : undefined;
  const isCurrentQuestionAnswered = typeof currentAnswer === "number";
  const progressPercent = totalQuestions > 0
    ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)
    : 0;

  const nominationProbabilityLabel = (probability: number | null | undefined) => {
    if (typeof probability !== "number") {
      return "Not modeled in 2-candidate mode";
    }

    return `${Math.round(probability * 100)}%`;
  };

  const percentLabel = (probability: number) => `${Math.round(probability * 100)}%`;
  const primaryDebugRows = (partyCandidates: Candidate[], party: Party) =>
    partyCandidates.flatMap((candidate, index) =>
      partyCandidates.slice(index + 1).map((opponent) => {
        const debugInfo = getStoredPairwiseProbabilityDebug("primary", candidate.name, opponent.name, party);
        return {
          id: `${candidate.id}:${opponent.id}`,
          leftName: candidate.name,
          rightName: opponent.name,
          probability: debugInfo.probability,
          source: debugInfo.source,
          answerId: debugInfo.answerId,
        };
      })
    );

  const dynamicFormulaText = isMultiCandidateMode
    ? `For each candidate C:\nPowerNumber(C) = NominationProb(C) x Sum over opponent O of [OpponentNominationProb(O) x (Rating(C) x WinProb(C,O) + Rating(O) x (1 - WinProb(C,O)))]`
    : `D1 = [D1P x R1W x D1R1] + [D1P x R2W x D1R2] + [R1P x R1W x R1D1] + [R2P x R2W x R2D1]\nD2 = [D2P x R1W x D2R1] + [D2P x R2W x D2R2] + [R1P x R1W x R1D2] + [R2P x R2W x R2D2]`;

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
    <div className="relative min-h-screen overflow-x-clip text-black">
      <div className="pointer-events-none absolute -left-16 top-12 h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-28 h-72 w-72 rounded-full bg-amber-200/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-8 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-teal-200/30 blur-3xl" />
      <main className="min-h-screen">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <header className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-emerald-800">
                DECISION TOOL
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900 md:text-5xl">Voteometer</h1>
              <p className="mt-2 max-w-2xl text-base text-zinc-600 md:text-lg">
                Compare how much you like each candidate with how likely they are to win.
              </p>
            </div>
          </header>

          {stage === "setup" && (
            <section className="vm-card mx-auto max-w-3xl rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5">
              <h2 className="text-lg font-semibold text-zinc-900">Step 1: Setup</h2>
              <p className="mt-1 text-sm text-zinc-600">Choose your party and confirm candidates before starting the flashcards.</p>
              <p className="mt-2 text-sm text-zinc-500">Voteometer always asks about every candidate's rating, the other party's primary odds, and cross-party general-election matchups. If either party has three or more candidates, it also asks same-party primary matchups for that party and converts them into nomination probabilities.</p>

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

              <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Potential 2028 candidates</h3>
                    <p className="mt-1 max-w-2xl text-sm text-zinc-600">
                      Tap a suggested name to add it to your {userParty.toLowerCase()} candidate list.
                    </p>
                  </div>
                  <span className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                    Suggestions only
                  </span>
                </div>

                {suggestedCandidatesForParty.length > 0 ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {suggestedCandidatesForParty.map((candidateName) => (
                      <li key={candidateName}>
                        <button
                          onClick={() => handleAddCandidate(userParty, candidateName)}
                          className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                        >
                          + {candidateName}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-zinc-600">All suggested {userParty.toLowerCase()} candidates are already in your list.</p>
                )}
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
            <section className="vm-card mx-auto max-w-3xl rounded-2xl p-6">
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
                        handleAnswerChange(currentQuestion.id, Math.max(0, Math.min(100, raw)), "manual");
                      }}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                    />
                    {expertEstimateSources[currentQuestion.id] && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-700">
                          <span>🗂</span>
                          {expertEstimateSources[currentQuestion.id] === "polymarket"
                            ? "Source: Polymarket prediction market"
                            : expertEstimateSources[currentQuestion.id] === "seed-exact"
                            ? "Source: Expert historical polling data"
                            : "Source: Calculated from party win averages"}
                        </span>
                      </div>
                    )}
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
                <section className="vm-card rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5">
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
                    {isMultiCandidateMode
                      ? "We combine your ratings, primary matchup answers, and general-election odds into nomination probabilities and expected general-election value."
                      : "We combine your candidate ratings with primary odds and general-election odds to compute expected value in the two-candidate model."}
                  </p>

                  <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs text-zinc-700">
{dynamicFormulaText}
                  </div>

                  {isMultiCandidateMode ? (
                    <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
                      <p>
                        When a party has three or more candidates, Voteometer turns the same-party pairwise primary answers into a nomination probability for each candidate using normalized pairwise log-odds.
                      </p>
                      <p className="mt-2">
                        That nomination probability is then multiplied by the candidate's expected general-election value against the opposing field.
                      </p>
                      <p className="mt-2 text-zinc-500">
                        Your party nomination probabilities are {ownPrimaryIsModeled ? "fully modeled from your same-party primary answers." : "not separately modeled because your party currently has only two candidates."} The opposing party nomination probabilities are {opponentPrimaryIsModeled ? "modeled from the opposing party's primary answers." : "taken directly from the single opposing primary head-to-head question."}
                      </p>
                    </div>
                  ) : (
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
                  )}
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-emerald-800/20 bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-900 p-6 text-white shadow-[0_20px_50px_rgba(17,24,39,0.35)] transition-all duration-300 hover:-translate-y-0.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Recommended Candidate</p>
                  {recommendedCandidate ? (
                    <>
                      <h2 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">{recommendedCandidate.name}</h2>
                      <p className="mt-1 text-sm text-zinc-300">{recommendedCandidate.party}</p>
                      <div className="mt-5 rounded-xl border border-white/10 bg-white/10 p-3">
                        <p className="text-xs uppercase tracking-wide text-zinc-300">Power Number</p>
                        <p className="mt-1 text-2xl font-semibold">{recommendedCandidate.powerNumber.toFixed(2)}</p>
                      </div>
                      <div className="mt-3 rounded-xl border border-white/10 bg-white/10 p-3">
                        <p className="text-xs uppercase tracking-wide text-zinc-300">Nomination Probability</p>
                        <p className="mt-1 text-sm font-medium text-zinc-100">{nominationProbabilityLabel(recommendedCandidate.nominationProbability)}</p>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-300">No recommendation available yet.</p>
                  )}
                </section>

                <section className="vm-card rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5">
                  <h2 className="text-lg font-semibold text-zinc-900">Opposing Field Assumptions</h2>
                  <p className="mt-1 text-sm text-zinc-600">These are the nomination probabilities currently assigned to the opposing party candidates.</p>
                  <div className="mt-4 space-y-2">
                    {opposingPartyCandidates.map((candidate) => (
                      <div key={candidate.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                        <div>
                          <p className="font-medium text-zinc-900">{candidate.name}</p>
                          <p className="text-xs text-zinc-500">Rating: {getCandidateRating(candidate)}</p>
                        </div>
                        <p className="font-semibold text-zinc-900">
                          {opponentPrimaryIsModeled
                            ? percentLabel(opponentPrimaryProbabilities.get(candidate.id) ?? 0)
                            : opposingPartyCandidates.length === 1
                            ? "100%"
                            : percentLabel(opponentPrimaryProbabilities.get(candidate.id) ?? 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="vm-card rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5">
                  <h2 className="text-lg font-semibold text-zinc-900">Debug Primary Inputs</h2>
                  <p className="mt-1 text-sm text-zinc-600">This shows the raw same-party primary values the nomination model is currently using.</p>
                  <div className="mt-4 space-y-3">
                    {[{ title: `${userParty} primary`, rows: primaryDebugRows(ownPartyCandidates, userParty) }, { title: `${opponentParty} primary`, rows: primaryDebugRows(opposingPartyCandidates, opponentParty) }].map((section) => (
                      <details key={section.title} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-zinc-900">{section.title}</summary>
                        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                          <table className="min-w-full divide-y divide-zinc-200 text-left text-sm text-zinc-700">
                            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                              <tr>
                                <th className="px-3 py-2 font-semibold">Matchup</th>
                                <th className="px-3 py-2 font-semibold">Used Prob.</th>
                                <th className="px-3 py-2 font-semibold">Source</th>
                                <th className="px-3 py-2 font-semibold">Answer Key</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200">
                              {section.rows.length > 0 ? section.rows.map((row) => (
                                <tr key={row.id}>
                                  <td className="px-3 py-2 font-medium text-zinc-900">{row.leftName} vs {row.rightName}</td>
                                  <td className="px-3 py-2">{percentLabel(row.probability)}</td>
                                  <td className="px-3 py-2">{row.source}</td>
                                  <td className="px-3 py-2 text-xs text-zinc-500">{row.answerId ?? "none"}</td>
                                </tr>
                              )) : (
                                <tr>
                                  <td colSpan={4} className="px-3 py-3 text-sm text-zinc-500">No same-party matchup inputs for this side.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    ))}
                  </div>
                </section>

                <section className="vm-card rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5">
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
                  <div className="mt-5 space-y-2">
                    {calculatePowerNumbers.map((candidate) => (
                      <div key={candidate.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                        <div>
                          <p className="font-medium text-zinc-900">{candidate.name}</p>
                          <p className="text-xs text-zinc-500">Nomination probability: {nominationProbabilityLabel(candidate.nominationProbability)}</p>
                        </div>
                        <p className="font-semibold text-zinc-900">{candidate.powerNumber.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="vm-card rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5">
                  <h2 className="text-lg font-semibold text-zinc-900">Why Each Score Looks Like This</h2>
                  <p className="mt-1 text-sm text-zinc-600">Expand a candidate to see the compact contribution table for their score.</p>
                  <div className="mt-4 space-y-4">
                    {calculatePowerNumbers.map((candidate) => (
                      <details key={candidate.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                        <summary className="cursor-pointer list-none">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-base font-semibold text-zinc-900">{candidate.name}</h3>
                              <p className="mt-1 text-sm text-zinc-600">
                                Rating {getCandidateRating(candidate)}. Presidency value if nominated: {candidate.presidencyValueIfNominated.toFixed(2)}. Final power number: {candidate.powerNumber.toFixed(2)}.
                              </p>
                            </div>
                            <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-right text-sm text-zinc-700">
                              <p>Nomination probability</p>
                              <p className="font-semibold text-zinc-900">{nominationProbabilityLabel(candidate.nominationProbability)}</p>
                            </div>
                          </div>
                        </summary>

                        <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                          <table className="min-w-full divide-y divide-zinc-200 text-left text-sm text-zinc-700">
                            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                              <tr>
                                <th className="px-3 py-2 font-semibold">Opponent</th>
                                <th className="px-3 py-2 font-semibold">Opp. Nom.</th>
                                <th className="px-3 py-2 font-semibold">Win Chance</th>
                                <th className="px-3 py-2 font-semibold">Matchup Value</th>
                                <th className="px-3 py-2 font-semibold">Contribution</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200">
                              {candidate.breakdown.map((detail: { opponentId: string; opponentName: string; opponentNominationProbability: number; ownGeneralWinProbability: number; expectedValueAgainstOpponent: number; weightedContribution: number; }) => (
                                <tr key={detail.opponentId}>
                                  <td className="px-3 py-2 font-medium text-zinc-900">{detail.opponentName}</td>
                                  <td className="px-3 py-2">{percentLabel(detail.opponentNominationProbability)}</td>
                                  <td className="px-3 py-2">{percentLabel(detail.ownGeneralWinProbability)}</td>
                                  <td className="px-3 py-2">{detail.expectedValueAgainstOpponent.toFixed(2)}</td>
                                  <td className="px-3 py-2 font-semibold text-zinc-900">{detail.weightedContribution.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    ))}
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