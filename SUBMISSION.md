# Pulse: Customer Feedback Intelligence Tool
## Cloudflare PM Internship Take-Home Submission

---

## Architecture Overview

### Product Summary
**Pulse** is a feedback aggregation and analysis tool that helps PMs understand customer pain points and prioritize what to build next. It ingests feedback from multiple sources, uses AI to categorize and analyze sentiment, and presents actionable insights through an intuitive bubble visualization.

### Cloudflare Products Used

#### 1. **Cloudflare Workers** (Core Runtime)
**What:** Serverless JavaScript/TypeScript execution at the edge using the Hono framework.

**Why I chose it:**
- Zero cold starts means instant response times for the API
- Runs in 300+ locations globally, so the tool works fast for distributed PM teams
- No infrastructure to manage - perfect for rapid prototyping
- Native integration with all other Cloudflare services via bindings

**How it's used:**
- Hosts the API endpoints (`POST /api/feedback`, `GET /api/bubbles`, `GET /api/stats`)
- Orchestrates the AI analysis pipeline
- Serves the static frontend via Workers Assets

---

#### 2. **Workers AI** (NLP & Sentiment Analysis)
**What:** Serverless AI inference using the `@cf/meta/llama-3-8b-instruct` model.

**Why I chose it:**
- No ML infrastructure or model hosting required
- Sub-second inference at the edge (no round-trip to centralized GPU clusters)
- Pay-per-request pricing ideal for a prototype with variable usage
- Native binding to Workers - just `env.AI.run()` and it works

**How it's used:**
- Extracts pain point categories from raw feedback text (e.g., "Performance Issues", "Documentation")
- Analyzes sentiment on a -1.0 to 1.0 scale
- Generates structured JSON output for database storage

**Prompt Engineering:**
```
Analyze this customer feedback and respond with ONLY a JSON object:
{"category": "1-3 word topic", "sentiment": number from -1 to 1}

Feedback: "${feedbackText}"
```

---

#### 3. **D1 Database** (Structured Storage)
**What:** Cloudflare's serverless SQLite database with automatic replication.

**Why I chose it:**
- SQL familiarity - no need to learn a new query language
- Zero configuration - just add a binding and start querying
- Perfect for structured data like feedback entries and aggregations
- Local development works identically to production

**How it's used:**
- `feedback` table: Stores individual feedback entries with source, category, sentiment, and weight
- `bubbles` table: Pre-aggregated category data with AI-generated summaries and build ideas for fast UI rendering

**Schema Design:**
```sql
-- Feedback entries
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL,  -- ticket, github, discord, email, twitter, forum
  category TEXT,
  sentiment_score REAL,
  weight REAL,
  created_at DATETIME
);

-- Pre-aggregated bubbles for fast queries
CREATE TABLE bubbles (
  category TEXT UNIQUE,
  total_weight REAL,
  avg_sentiment REAL,
  feedback_count INTEGER,
  action_summary TEXT,      -- AI-generated insight
  build_ideas TEXT          -- Pipe-separated suggestions
);
```

---

#### 4. **Workers Assets** (Static File Serving)
**What:** Serve static files (HTML, CSS, JS) directly from Workers.

**Why I chose it:**
- Single deployment for both API and frontend
- Automatic edge caching for fast load times
- No need for a separate Pages project for a simple prototype

**How it's used:**
- Serves `index.html` with the bubble visualization UI
- Tailwind CSS loaded from CDN, so no build step required

---

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│   │   Browser   │────▶│   Workers   │────▶│  Workers AI │      │
│   │  (Pulse UI) │◀────│   (Hono)    │◀────│  (Llama 3)  │      │
│   └─────────────┘     └──────┬──────┘     └─────────────┘      │
│                              │                                  │
│                              ▼                                  │
│                       ┌─────────────┐                          │
│                       │     D1      │                          │
│                       │  (SQLite)   │                          │
│                       └─────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Ingestion:** Feedback arrives via POST request (simulating scraping from tickets, GitHub, Discord, etc.)
2. **Analysis:** Workers AI extracts category and sentiment
3. **Weighting:** Source reliability multiplier applied (Tickets: 1.0x → Forums: 0.4x)
4. **Storage:** Saved to D1 with category aggregation updated
5. **Visualization:** UI fetches aggregated bubbles and displays prioritized action items

---

## Friction Log

### Insight 1: Node.js Version Incompatibility with `create-cloudflare`

**Title:** CLI fails silently on Node 18 with cryptic error

**Problem:**  
When running `npm create cloudflare@latest`, the CLI crashed with a `ReferenceError: File is not defined` error buried in stack traces pointing to `undici` internals. The actual issue was Node.js 18 incompatibility, but this was never stated. I spent 10+ minutes debugging before realizing I needed to either upgrade Node or set up the project manually.

```
ReferenceError: File is not defined
    at .../undici/lib/web/webidl/index.js
```

**Suggestion:**  
1. **Add a Node version check at CLI startup** - Before doing anything, check `process.version` and show a clear message: "create-cloudflare requires Node 20+. You're running Node 18.20.8. Please upgrade."
2. **Update package.json `engines` field** - Specify `"node": ">=20"` so npm warns users before installation
3. **Improve error handling** - Catch undici errors and surface a user-friendly message instead of raw stack traces

---

### Insight 2: D1 Local vs. Remote Flag Confusion

**Title:** Default behavior for D1 commands is unclear

**Problem:**  
Every D1 command requires explicitly passing `--local` or `--remote`. When I first ran `wrangler d1 execute`, I wasn't sure if it would affect my production database or local dev. The warning message mentions "To execute on your remote database, add a --remote flag" but doesn't clearly state what the default is. This created anxiety about accidentally modifying production data.

**Suggestion:**  
1. **Make the default explicit** - Change the output message to: "🔒 Executing on LOCAL database (safe for development). Add --remote to target production."
2. **Add a confirmation prompt for remote** - When `--remote` is used, prompt: "This will modify your production database. Type 'yes' to continue."
3. **Visual differentiation** - Use color coding: green for local operations, yellow/red for remote

---

### Insight 3: Workers AI Billing Surprise in Local Development

**Title:** No way to mock AI locally - every dev request costs money

**Problem:**  
While testing my feedback analysis pipeline locally, I discovered that Workers AI always hits the real Cloudflare API—even in `wrangler dev`. The warning appeared, but only after I'd already made dozens of AI calls:

```
▲ [WARNING] Using Workers AI always accesses your Cloudflare account 
in order to run AI models, and so will incur usage charges even in 
local development.
```

For a prototype with rapid iteration, this creates unexpected costs and slows development (waiting for real API calls instead of mocked responses).

**Suggestion:**  
1. **Add `--mock-ai` flag** - Return placeholder responses like `{"category": "Mock Category", "sentiment": 0.5}` for development
2. **Show cost estimate upfront** - "This session has made 47 AI calls (~$0.02). Add --mock-ai to use free placeholder responses."
3. **Prompt before first AI call** - "Workers AI requests incur charges. Continue? (y/n/always)"

---

### Insight 4: Assets Configuration Buried in Documentation

**Title:** Hard to find how to serve static files from a Worker

**Problem:**  
I wanted to serve my HTML frontend directly from the Worker instead of setting up a separate Pages project. Finding the correct `wrangler.toml` syntax took multiple documentation searches. The Workers docs focus on API use cases, and the Assets feature isn't prominently linked. I eventually found it through a GitHub discussion, not the official docs.

The correct syntax (`[assets] directory = "./public"`) wasn't in the "Get Started" guide or the Workers configuration reference—it was in a separate "Static Assets" page that wasn't linked from the main navigation.

**Suggestion:**  
1. **Add "Serving Static Files" to the Workers quick start** - Many developers want full-stack apps, not just APIs
2. **Include common patterns in wrangler.toml reference** - Show a complete example with bindings + assets
3. **Cross-link from Pages docs** - "For simpler use cases, you can serve static files directly from Workers. See [link]"

---

### Insight 5: Wrangler Version Warnings Are Noisy and Anxiety-Inducing

**Title:** Constant "update available" warnings create alert fatigue

**Problem:**  
Every single Wrangler command displayed this warning:

```
⛅️ wrangler 3.114.17 (update available 4.59.2)
▲ [WARNING] The version of Wrangler you are using is now out-of-date.
Please update to the latest version to prevent critical errors.
```

The phrase "prevent critical errors" is alarming—it suggests my current version might break at any moment. But when I checked the changelog, there were no critical fixes relevant to my use case. This warning appeared ~50 times during my development session, creating noise that made me ignore actual important warnings (like the AI billing one).

**Suggestion:**  
1. **Show update notice once per session, not every command** - Store a flag in a temp file
2. **Distinguish severity levels** - "Security update available" vs. "New features available" vs. "Minor update"
3. **Remove fear-inducing language** - Change "prevent critical errors" to "for latest features and fixes" unless there's actually a critical CVE
4. **Add `--quiet` flag** - For CI/CD and power users who want clean output

---

### Bonus Insight: Excellent DX for Bindings

**Title:** (Positive) Bindings "just work" - excellent developer experience

**Problem:** N/A - This is positive feedback!

**What worked well:**  
The bindings system is genuinely delightful. Adding D1 and AI to my Worker was two lines in `wrangler.toml`, and then `env.FEEDBACK_DB` and `env.AI` were immediately available with full TypeScript types. No SDK installation, no API key management, no connection strings. 

The local development experience with Miniflare was seamless—D1 worked identically locally and in production, and hot reload made iteration fast.

**Suggestion:**  
This is a competitive advantage worth highlighting more prominently in marketing. The "zero config" aspect of bindings vs. traditional database/AI setup (connection strings, API keys, SDKs) is a major selling point that could be emphasized more in the getting started experience.

---

## Technical Notes

### Source Reliability Weighting
The tool applies multipliers to weight feedback by source reliability:

| Source | Weight | Rationale |
|--------|--------|-----------|
| Customer Tickets | 1.0x | Paying customers, high intent |
| GitHub Issues | 0.8x | Technical, actionable, verified users |
| Email | 0.7x | Direct, but could be anyone |
| X/Twitter | 0.6x | Public but low detail |
| Discord | 0.5x | Community, real-time, casual |
| Forums | 0.4x | Anonymous, unverified |

### Bubble Sizing Algorithm
Bubble size is proportional to total weighted evidence:
```javascript
const normalizedWeight = bubble.total_weight / maxWeight;
const size = minSize + (maxSize - minSize) * normalizedWeight;
```

### Color Coding
- 🔴 **Red bubbles:** avg_sentiment < -0.2 (pain points)
- 🟢 **Green bubbles:** avg_sentiment > 0.2 (positive)
- 🟡 **Yellow bubbles:** neutral sentiment

---

## Deployment Instructions

```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Create D1 database
npx wrangler d1 create feedback-aggregator-db
# Copy the database_id to wrangler.toml

# 3. Initialize production database
npx wrangler d1 execute FEEDBACK_DB --remote --file=./schema.sql
npx wrangler d1 execute FEEDBACK_DB --remote --file=./seed.sql

# 4. Deploy
npx wrangler deploy
```

---

*Built with Cursor + Claude • January 2026*
