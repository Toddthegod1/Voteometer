import { NextResponse } from "next/server";

const POLYMARKET_EVENT_URL =
  "https://gamma-api.polymarket.com/events?slug=presidential-election-winner-2028";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const DEFAULT_ELECTION_YEAR = 2028;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

interface CandidateProbability {
  name: string;
  normalizedName: string;
  winProb: number; // 0–100
}

interface PolymarketMarket {
  question?: string;
  outcomePrices?: string;
  active?: boolean;
  liquidity?: string | number;
}

interface PolymarketEvent {
  markets?: PolymarketMarket[];
}

let cachedCandidates: CandidateProbability[] | null = null;
let cacheExpiresAt = 0;

async function fetchPolymarketCandidates(): Promise<CandidateProbability[]> {
  const now = Date.now();
  if (cachedCandidates && now < cacheExpiresAt) {
    return cachedCandidates;
  }

  const res = await fetch(POLYMARKET_EVENT_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Polymarket API returned ${res.status}`);

  const events: PolymarketEvent[] = await res.json();
  const event = Array.isArray(events) ? events[0] : (events as unknown as PolymarketEvent);
  const markets: PolymarketMarket[] = event?.markets ?? [];

  const candidates: CandidateProbability[] = [];

  for (const market of markets) {
    if (!market.active || Number(market.liquidity ?? 0) <= 0) continue;

    const { question, outcomePrices } = market;
    if (!question || !outcomePrices) continue;

    const match = question.match(
      /^Will (.+) win the 2028 US Presidential Election\?$/
    );
    if (!match) continue;

    const name = match[1];
    let prices: string[];
    try {
      prices = JSON.parse(outcomePrices);
    } catch {
      continue;
    }

    const winProb = parseFloat(prices[0]) * 100;
    if (isNaN(winProb)) continue;

    candidates.push({ name, normalizedName: normalize(name), winProb });
  }

  cachedCandidates = candidates;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return candidates;
}

function findCandidate(
  name: string,
  candidates: CandidateProbability[]
): CandidateProbability | null {
  const normalizedInput = normalize(name);
  if (!normalizedInput) return null;
  return (
    candidates.find((c) => c.normalizedName === normalizedInput) ??
    candidates.find(
      (c) =>
        c.normalizedName.includes(normalizedInput) ||
        normalizedInput.includes(c.normalizedName)
    ) ??
    null
  );
}

type NameMatchup = {
  democratName: string;
  republicanName: string;
  democratWinProb: number;
  source: "polymarket" | "name-estimate";
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const electionYear = Number(
    searchParams.get("electionYear") ?? DEFAULT_ELECTION_YEAR
  );
  const democratsParam = searchParams.get("democrats") ?? "";
  const republicansParam = searchParams.get("republicans") ?? "";

  const democrats = democratsParam
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

  const republicans = republicansParam
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

  let polymarketCandidates: CandidateProbability[] = [];
  try {
    polymarketCandidates = await fetchPolymarketCandidates();
  } catch {
    // Fall through — matchups will use name-estimate fallback
  }

  const nameMatchups: NameMatchup[] = [];

  for (const demName of democrats) {
    for (const repName of republicans) {
      const demCandidate = findCandidate(demName, polymarketCandidates);
      const repCandidate = findCandidate(repName, polymarketCandidates);

      if (demCandidate && repCandidate) {
        const total = demCandidate.winProb + repCandidate.winProb;
        const ratio = total > 0 ? demCandidate.winProb / total : 0.5;
        nameMatchups.push({
          democratName: demName,
          republicanName: repName,
          democratWinProb: Math.max(1, Math.min(99, Math.round(ratio * 100))),
          source: "polymarket",
        });
      } else {
        nameMatchups.push({
          democratName: demName,
          republicanName: repName,
          democratWinProb: 50,
          source: "name-estimate",
        });
      }
    }
  }

  return NextResponse.json({
    electionYear,
    source: polymarketCandidates.length > 0 ? "polymarket" : "fallback",
    democrats,
    republicans,
    nameMatchups,
  });
}