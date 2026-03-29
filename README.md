# Voteometer

Voteometer is a Next.js web app for comparing primary candidates based on two things at once:

- how good you think each candidate would be as president
- how likely each candidate is to reach and win the general election

The app turns those inputs into a "Power Number" so a voter can compare candidates in a more structured way instead of looking at preference and electability separately.

## Who Worked On It
It was a solo project by Todd Klinger! However the original idea was from my former Table Tennis Coach Larry Hodges who was the brain behind the probability equations!

## What The App Does

Voteometer lets a user:

- choose a party perspective: Democrat or Republican
- start with suggested 2028 candidates and add custom names
- rate candidates on a `-10` to `10` scale
- enter primary and general-election win probabilities through flashcard-style questions
- pull expert estimates for cross-party general-election matchups from Polymarket's 2028 presidential market when available
- compare candidates by final Power Number, nomination probability, and per-opponent score breakdown

## Core Idea

Each candidate is scored by combining:

- the user's rating for that candidate
- the modeled chance that candidate wins their party nomination
- the modeled chance they beat each opposing candidate in a general election
- the nomination chances of the opposing-party candidates

In two-candidate primary setups, the app uses the simpler two-candidate logic.

In three-or-more-candidate primary setups, the app asks same-party pairwise primary questions and converts those answers into nomination probabilities using a normalized pairwise log-odds model.

The results page shows:

- the recommended candidate
- each candidate's Power Number
- modeled nomination probabilities
- opposing field assumptions
- a detailed contribution breakdown showing how each opponent affects the score

## Polymarket Integration

The app includes a server route at `app/api/matchups/route.ts` that:

- fetches the Polymarket 2028 presidential event
- caches candidate probabilities for 5 minutes
- matches requested Democrat and Republican names to market names
- returns cross-party matchup estimates
- falls back to neutral `50/50` estimates when market data is unavailable

Important limitation:

- expert estimates currently apply to cross-party general-election matchups only
- same-party primary probabilities are driven by the user's answers unless future polling or other priors are added

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Chart.js / react-chartjs-2

## Project Structure

- `app/`: App Router pages and API routes
- `components/`: main Voteometer UI and results views
- `lib/`: seed candidates, types, scoring helpers, and app data
- `prisma/`: Prisma schema files currently kept in the repo

## Running The Project

Install dependencies:

```bash
npm install
```

Start development mode:

```bash
npm run dev
```

Run a production build:

```bash
npm run build
```

The main app runs from the repository root.

## Notes About This Repo

There is also a nested `voteometer/` directory in the repository that contains a separate Next.js app scaffold. The final project described in this README is the root app, not the nested one.

The root TypeScript configuration excludes that nested folder so the main project can build independently.

## Current Status

This final project includes:

- dynamic candidate management
- 2028-oriented starter candidates
- dynamic flashcard question generation
- multi-candidate primary modeling
- Polymarket-powered general-election estimates
- results explanations and debug views for primary inputs

## Future Improvements

Natural next steps for the project would be:

- add polling-based priors for same-party primary questions
- add clearer warnings when nomination probabilities are still fallback-driven
- persist sessions or share saved setups
- add more polished explanations for the math in the UI

## AI Usage

AI (ChatGPT and Github Copilot) was used to:
- assist with debugging (Tailwind dark mode, React issues)
- help design features such as expert estimate autofill
- Implementing multi-candidate math logic
- UI design in general
- Gave the idea for using Vercel!

All implementation decisions and final code integration were done by me!
