import type { Candidate, Matchup } from "@/lib/types";

type Props = {
  democrats: Candidate[];
  republicans: Candidate[];
  matchups: Matchup[];
  onChange: (matchups: Matchup[]) => void;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export default function MatchupEditor({
  democrats,
  republicans,
  matchups,
  onChange,
}: Props) {
  function getProb(democratCandidateId: string, republicanCandidateId: string) {
    return (
      matchups.find(
        (m) =>
          m.democratCandidateId === democratCandidateId &&
          m.republicanCandidateId === republicanCandidateId
      )?.democratWinProb ?? 50
    );
  }

  function setProb(
    democratCandidateId: string,
    republicanCandidateId: string,
    value: number
  ) {
    const safeValue = clampPercent(value);

    const existing = matchups.find(
      (m) =>
        m.democratCandidateId === democratCandidateId &&
        m.republicanCandidateId === republicanCandidateId
    );

    if (existing) {
      onChange(
        matchups.map((m) =>
          m.democratCandidateId === democratCandidateId &&
          m.republicanCandidateId === republicanCandidateId
            ? { ...m, democratWinProb: safeValue }
            : m
        )
      );
      return;
    }

    onChange([
      ...matchups,
      {
        democratCandidateId,
        republicanCandidateId,
        democratWinProb: safeValue,
      },
    ]);
  }
}