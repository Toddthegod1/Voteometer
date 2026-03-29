# Voteometer

Voteometer is a decision-support tool that helps voters choose the best candidate by combining **personal preference** with **electability** into a single score.

Instead of asking *“Who do I like?”* or *“Who can win?”*, Voteometer answers both at once.

---

## 🚨 Why This Matters

Voters often face a tradeoff between choosing the candidate they personally prefer and the one most likely to win.

Voteometer quantifies that tradeoff, helping users make more informed and strategic decisions instead of relying on intuition alone.

---

## ⚙️ What The App Does

Voteometer allows users to:

* Choose a party perspective (Democrat or Republican)
* Start with suggested 2028 candidates or add custom candidates
* Rate candidates on a **-10 to 10 scale**
* Answer dynamically generated matchup questions
* Automatically fill general-election probabilities using real-world market data
* Compare candidates using a unified **Power Number**

---

## 🧠 Core Idea

Each candidate is scored by combining:

* Candidate strength (user rating)
* Probability of winning the party nomination
* Probability of winning the general election
* Strength of opposing candidates

Voteometer computes a **Power Number** for each candidate by aggregating contributions across all matchups.

The results include:

* Recommended candidate
* Power Numbers
* Nomination probabilities
* Per-opponent contribution breakdown

---

## 📊 External Data Integration

Voteometer integrates with **Polymarket** to provide real-world probability estimates for cross-party general-election matchups.

* Data is fetched via a backend API route
* Cached for performance (5 minutes)
* Falls back to neutral estimates when data is unavailable

---

## 🧩 Key Features

* Dynamic candidate management
* Multi-candidate primary modeling
* Automatic question generation
* Optional expert-style probability estimates
* Interactive visualizations (Chart.js)

---

## 🛠 Tech Stack

* Next.js 16
* React 19
* TypeScript
* Tailwind CSS
* Chart.js

---

## ▶️ How to Run

```bash
npm install
npm run dev
```

Then open: http://localhost:3000

---

## 👤 Who Worked On It

Todd Klinger

Original concept inspired by Larry Hodges.

---

## 🤖 AI Usage

AI (ChatGPT and GitHub Copilot) was used to:

* assist with debugging and development
* suggest UI improvements and product features
* help implement complex logic such as multi-candidate modeling

All final design decisions and implementation were completed by the developer.

---

## 🎥 Demo

[Once I make video link I will put here]

