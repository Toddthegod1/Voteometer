export type Party = "Democrat" | "Republican";

export type Candidate = {
  id: string;
  name: string;
  party: Party;
  rating: number;
};

export type Matchup = {
  democratCandidateId: string;
  republicanCandidateId: string;
  democratWinProb: number;
};

export type ScoreDetail = {
  opponent: string;
  ownWin: number;
  oppWin: number;
  contribution: number;
};

export type CandidateScore = {
  id: string;
  name: string;
  score: number;
  details: ScoreDetail[];
};