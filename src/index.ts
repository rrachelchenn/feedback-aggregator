import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Type definitions
interface Env {
  FEEDBACK_DB: D1Database;
  AI: Ai;
}

interface FeedbackInput {
  content: string;
  source_type: 'ticket' | 'github' | 'discord' | 'forum' | 'twitter' | 'email';
}

interface Feedback {
  id: number;
  content: string;
  source_type: string;
  category: string | null;
  sentiment_score: number;
  weight: number;
  created_at: string;
}

interface Bubble {
  id: number;
  category: string;
  total_weight: number;
  avg_sentiment: number;
  feedback_count: number;
  action_summary: string | null;
  build_ideas: string | null;
}

interface AIResponse {
  response: string;
}

// Source reliability weights - formal channels get higher weight
const SOURCE_WEIGHTS: Record<string, number> = {
  ticket: 1.0,      // Customer Support Tickets - highest priority, paying customers
  github: 0.8,      // GitHub Issues - structured, technical, actionable
  email: 0.7,       // Email - direct communication, usually important
  twitter: 0.6,     // X/Twitter - public, visible, but less detailed
  discord: 0.5,     // Discord - community, real-time, but casual
  forum: 0.4,       // Community Forums - valuable but anonymous/unverified
};

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for the frontend
app.use('/*', cors());

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/feedback - Submit new feedback for AI analysis
app.post('/api/feedback', async (c) => {
  const env = c.env;
  
  try {
    const body = await c.req.json<FeedbackInput>();
    
    if (!body.content || !body.source_type) {
      return c.json({ error: 'Missing content or source_type' }, 400);
    }
    
    // Get source weight
    const weight = SOURCE_WEIGHTS[body.source_type] ?? 0.5;
    
    // Use Workers AI to analyze the feedback
    const aiPrompt = `Analyze this customer feedback and respond with ONLY a JSON object (no markdown, no code blocks, just raw JSON):
{
  "category": "A 1-3 word category describing the main pain point or topic",
  "sentiment": A number between -1.0 (very negative) and 1.0 (very positive)
}

Feedback: "${body.content}"`;

    const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
      prompt: aiPrompt,
      max_tokens: 100,
    }) as AIResponse;
    
    // Parse AI response
    let category = 'Uncategorized';
    let sentiment = 0;
    
    try {
      // Extract JSON from response (handle potential markdown wrapping)
      const responseText = aiResponse.response || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        category = parsed.category || 'Uncategorized';
        sentiment = typeof parsed.sentiment === 'number' 
          ? Math.max(-1, Math.min(1, parsed.sentiment)) 
          : 0;
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
    }
    
    // Insert into database
    const result = await env.FEEDBACK_DB.prepare(
      `INSERT INTO feedback (content, source_type, category, sentiment_score, weight)
       VALUES (?, ?, ?, ?, ?)
       RETURNING *`
    ).bind(body.content, body.source_type, category, sentiment, weight).first<Feedback>();
    
    // Update or insert bubble aggregate
    await env.FEEDBACK_DB.prepare(`
      INSERT INTO bubbles (category, total_weight, avg_sentiment, feedback_count)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(category) DO UPDATE SET
        total_weight = total_weight + excluded.total_weight,
        avg_sentiment = (avg_sentiment * feedback_count + excluded.avg_sentiment) / (feedback_count + 1),
        feedback_count = feedback_count + 1,
        updated_at = CURRENT_TIMESTAMP
    `).bind(category, weight, sentiment).run();
    
    return c.json({
      success: true,
      feedback: result,
      analysis: { category, sentiment, weight }
    });
    
  } catch (error) {
    console.error('Error processing feedback:', error);
    return c.json({ error: 'Failed to process feedback' }, 500);
  }
});

// POST /api/feedback/batch - Submit multiple feedback items
app.post('/api/feedback/batch', async (c) => {
  const env = c.env;
  
  try {
    const items = await c.req.json<FeedbackInput[]>();
    
    if (!Array.isArray(items)) {
      return c.json({ error: 'Expected array of feedback items' }, 400);
    }
    
    const results = [];
    
    for (const item of items) {
      if (!item.content || !item.source_type) continue;
      
      const weight = SOURCE_WEIGHTS[item.source_type] ?? 0.5;
      
      // Use Workers AI
      const aiPrompt = `Analyze this customer feedback and respond with ONLY a JSON object:
{"category": "1-3 word topic", "sentiment": number from -1 to 1}

Feedback: "${item.content}"`;

      const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
        prompt: aiPrompt,
        max_tokens: 100,
      }) as AIResponse;
      
      let category = 'Uncategorized';
      let sentiment = 0;
      
      try {
        const responseText = aiResponse.response || '';
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          category = parsed.category || 'Uncategorized';
          sentiment = typeof parsed.sentiment === 'number' 
            ? Math.max(-1, Math.min(1, parsed.sentiment)) 
            : 0;
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
      
      await env.FEEDBACK_DB.prepare(
        `INSERT INTO feedback (content, source_type, category, sentiment_score, weight)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(item.content, item.source_type, category, sentiment, weight).run();
      
      await env.FEEDBACK_DB.prepare(`
        INSERT INTO bubbles (category, total_weight, avg_sentiment, feedback_count)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(category) DO UPDATE SET
          total_weight = total_weight + excluded.total_weight,
          avg_sentiment = (avg_sentiment * feedback_count + excluded.avg_sentiment) / (feedback_count + 1),
          feedback_count = feedback_count + 1,
          updated_at = CURRENT_TIMESTAMP
      `).bind(category, weight, sentiment).run();
      
      results.push({ content: item.content.substring(0, 50) + '...', category, sentiment, weight });
    }
    
    return c.json({ success: true, processed: results.length, results });
    
  } catch (error) {
    console.error('Batch error:', error);
    return c.json({ error: 'Failed to process batch' }, 500);
  }
});

// GET /api/bubbles - Get aggregated categories for the bubble UI
app.get('/api/bubbles', async (c) => {
  const env = c.env;
  
  try {
    const bubbles = await env.FEEDBACK_DB.prepare(`
      SELECT category, total_weight, avg_sentiment, feedback_count, action_summary, build_ideas
      FROM bubbles
      ORDER BY total_weight DESC
    `).all<Bubble>();
    
    return c.json({
      success: true,
      bubbles: bubbles.results || []
    });
    
  } catch (error) {
    console.error('Error fetching bubbles:', error);
    return c.json({ error: 'Failed to fetch bubbles' }, 500);
  }
});

// GET /api/feedback - Get all feedback entries with optional filtering
app.get('/api/feedback', async (c) => {
  const env = c.env;
  const category = c.req.query('category');
  const source = c.req.query('source');
  
  try {
    let query = 'SELECT * FROM feedback WHERE 1=1';
    const params: string[] = [];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (source) {
      query += ' AND source_type = ?';
      params.push(source);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 100';
    
    const stmt = env.FEEDBACK_DB.prepare(query);
    const result = await (params.length > 0 
      ? stmt.bind(...params) 
      : stmt
    ).all<Feedback>();
    
    return c.json({
      success: true,
      feedback: result.results || []
    });
    
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return c.json({ error: 'Failed to fetch feedback' }, 500);
  }
});

// GET /api/stats - Get overview statistics
app.get('/api/stats', async (c) => {
  const env = c.env;
  
  try {
    const totalFeedback = await env.FEEDBACK_DB.prepare(
      'SELECT COUNT(*) as count FROM feedback'
    ).first<{ count: number }>();
    
    // Count actual negative and positive feedback items
    const negativeFeedback = await env.FEEDBACK_DB.prepare(
      'SELECT COUNT(*) as count FROM feedback WHERE sentiment_score < -0.2'
    ).first<{ count: number }>();
    
    const positiveFeedback = await env.FEEDBACK_DB.prepare(
      'SELECT COUNT(*) as count FROM feedback WHERE sentiment_score > 0.2'
    ).first<{ count: number }>();
    
    // Count total action suggestions (build ideas across all bubbles)
    const actionSuggestions = await env.FEEDBACK_DB.prepare(
      'SELECT COUNT(*) as count FROM bubbles WHERE build_ideas IS NOT NULL AND build_ideas != \'\''
    ).first<{ count: number }>();
    
    const bySource = await env.FEEDBACK_DB.prepare(`
      SELECT source_type, COUNT(*) as count, AVG(sentiment_score) as avg_sentiment
      FROM feedback
      GROUP BY source_type
    `).all();
    
    const topPainPoints = await env.FEEDBACK_DB.prepare(`
      SELECT category, total_weight, avg_sentiment, feedback_count, action_summary, build_ideas
      FROM bubbles
      WHERE avg_sentiment < 0
      ORDER BY total_weight DESC
      LIMIT 5
    `).all<Bubble>();
    
    const topPraise = await env.FEEDBACK_DB.prepare(`
      SELECT category, total_weight, avg_sentiment, feedback_count, action_summary, build_ideas
      FROM bubbles
      WHERE avg_sentiment > 0
      ORDER BY total_weight DESC
      LIMIT 5
    `).all<Bubble>();
    
    return c.json({
      success: true,
      stats: {
        totalFeedback: totalFeedback?.count || 0,
        negativeFeedbackCount: negativeFeedback?.count || 0,
        positiveFeedbackCount: positiveFeedback?.count || 0,
        actionSuggestions: actionSuggestions?.count || 0,
        bySource: bySource.results || [],
        topPainPoints: topPainPoints.results || [],
        topPraise: topPraise.results || []
      }
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

// DELETE /api/reset - Reset database (for demo purposes)
app.delete('/api/reset', async (c) => {
  const env = c.env;
  
  try {
    await env.FEEDBACK_DB.prepare('DELETE FROM feedback').run();
    await env.FEEDBACK_DB.prepare('DELETE FROM bubbles').run();
    
    return c.json({ success: true, message: 'Database reset' });
  } catch (error) {
    return c.json({ error: 'Failed to reset' }, 500);
  }
});

export default app;
