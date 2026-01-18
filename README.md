# Pulse - Customer Feedback Intelligence 🫧

A Cloudflare-powered tool for aggregating and visualizing customer feedback with AI-driven categorization and sentiment analysis.

**Live Demo:** https://feedback-aggregator.rachel-chen.workers.dev

---

## What It Does

Pulse helps PMs understand customer pain points and prioritize what to build next by:

- **Aggregating feedback** from 6 sources: Support Tickets, GitHub Issues, Email, X/Twitter, Discord, and Community Forums
- **AI-powered analysis** using Workers AI (Llama 3) to extract themes and sentiment
- **Source reliability weighting** to prioritize high-signal channels over noisy ones
- **Bubble visualization** where size = evidence weight and color = sentiment
- **Actionable insights** with AI-generated summaries and build suggestions

---

## Key Features

### Source Reliability Weighting
Not all feedback is equal. Formal channels carry more weight than anonymous forums:

| Source | Weight |
|--------|--------|
| Customer Tickets | 1.0x |
| GitHub Issues | 0.8x |
| Email | 0.7x |
| X/Twitter | 0.6x |
| Discord | 0.5x |
| Community Forums | 0.4x |

### Bubble Visualization
- **Size** = Total weighted evidence (more sources + higher reliability = bigger bubble)
- **Color** = Sentiment (🔴 Negative / 🟡 Neutral / 🟢 Positive)
- **Click** to drill down into individual feedback items and build suggestions

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/feedback` | Submit feedback for AI analysis |
| `POST` | `/api/feedback/batch` | Submit multiple items |
| `GET` | `/api/bubbles` | Get aggregated categories |
| `GET` | `/api/feedback` | List all feedback (filterable) |
| `GET` | `/api/stats` | Overview statistics |
| `GET` | `/api/health` | Health check |

---

## Tech Stack

- **Runtime:** Cloudflare Workers
- **Framework:** Hono
- **AI:** Workers AI (Llama 3 8B Instruct)
- **Database:** D1 (SQLite)
- **UI:** Vanilla HTML/CSS/JS + Tailwind CSS

---

*Built for the Cloudflare PM Internship Take-Home Assignment • 2026*
