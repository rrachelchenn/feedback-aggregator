# Feedback Bubbles 🫧

A Cloudflare-powered tool for aggregating and visualizing customer feedback with AI-driven categorization and sentiment analysis.

## Architecture Overview

This prototype uses **4 Cloudflare Developer Platform products**:

### 1. **Cloudflare Workers** (Core Runtime)
The main application logic runs on Workers - Cloudflare's serverless edge computing platform. Using the Hono framework for a lightweight, Express-like experience.

**Why:** Workers provide instant global deployment, automatic scaling, and low-latency responses from 300+ edge locations worldwide.

### 2. **Workers AI** (NLP & Sentiment Analysis)
Uses the `@cf/meta/llama-3-8b-instruct` model to:
- Extract pain point categories from raw feedback text
- Analyze sentiment (-1.0 to 1.0 scale)
- No need to manage ML infrastructure

**Why:** Workers AI runs inference at the edge with zero cold starts, making it perfect for real-time feedback processing.

### 3. **D1 Database** (Structured Storage)
Cloudflare's serverless SQLite database stores:
- Individual feedback entries with source, category, sentiment, and weight
- Pre-aggregated "bubble" data for fast UI rendering

**Why:** D1 is natively integrated with Workers, requires zero configuration, and provides SQL familiarity.

### 4. **Cloudflare Pages/Assets** (Static UI Hosting)
The bubble visualization UI is served via Workers Assets (static file serving).

**Why:** Automatic edge caching, instant global distribution, and seamless integration with the Worker API.

---

## Key Features

### Source Reliability Weighting
Not all feedback is equal. A formal customer ticket carries more weight than an anonymous Reddit comment:

| Source | Weight |
|--------|--------|
| Customer Ticket | 1.0x |
| GitHub Issue | 0.8x |
| Email | 0.7x |
| Twitter/X | 0.6x |
| Discord | 0.5x |
| Reddit | 0.4x |

### Bubble Visualization
- **Size** = Total weighted evidence (more sources + higher reliability = bigger bubble)
- **Color** = Sentiment (🔴 Negative / 🟡 Neutral / 🟢 Positive)
- **Click** to drill down into individual feedback items

---

## Quick Start

```bash
# Install dependencies
npm install

# Initialize local D1 database
npm run db:init

# Seed with mock data
npm run db:seed

# Start development server
npm run dev
```

Visit [http://localhost:8787](http://localhost:8787)

---

## Deployment

1. **Login to Cloudflare:**
   ```bash
   npx wrangler login
   ```

2. **Create D1 Database:**
   ```bash
   npx wrangler d1 create feedback-aggregator-db
   ```
   Copy the `database_id` to `wrangler.toml`

3. **Initialize Production Database:**
   ```bash
   npx wrangler d1 execute FEEDBACK_DB --remote --file=./schema.sql
   npx wrangler d1 execute FEEDBACK_DB --remote --file=./seed.sql
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

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

## Friction Log Notes

While building this prototype, I documented pain points and suggestions for improving the Cloudflare developer experience. See the accompanying PDF submission for detailed product insights.

---

Built for the Cloudflare PM Internship Take-Home Assignment • 2026
