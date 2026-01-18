-- Feedback entries table
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('ticket', 'github', 'discord', 'email', 'twitter', 'forum')),
  category TEXT,
  sentiment_score REAL DEFAULT 0,
  weight REAL DEFAULT 1.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Aggregated categories/bubbles table for efficient querying
CREATE TABLE IF NOT EXISTS bubbles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT UNIQUE NOT NULL,
  total_weight REAL DEFAULT 0,
  avg_sentiment REAL DEFAULT 0,
  feedback_count INTEGER DEFAULT 0,
  action_summary TEXT,
  build_ideas TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster category lookups
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_source ON feedback(source_type);
