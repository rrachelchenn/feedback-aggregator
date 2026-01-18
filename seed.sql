-- Mock feedback data matching the assignment sources
-- Sources: ticket, github, discord, email, twitter, forum

INSERT INTO feedback (content, source_type, category, sentiment_score, weight) VALUES
  -- Performance Issues (4 signals)
  ('The dashboard keeps timing out when I try to view analytics. Very frustrating! This has been happening for 3 days now.', 'ticket', 'Performance Issues', -0.8, 1.0),
  ('Anyone else getting 502 errors on the edge? Been happening for days and support hasnt responded...', 'forum', 'Performance Issues', -0.7, 0.4),
  ('Dashboard latency is killing our workflow. Takes 10+ seconds to load simple queries.', 'github', 'Performance Issues', -0.75, 0.8),
  ('Is it just me or is the API super slow today? Getting timeouts on basic requests', 'discord', 'Performance Issues', -0.6, 0.5),

  -- Documentation (3 signals)
  ('Love the new API but the rate limiting docs are confusing. Had to dig through 5 pages to find the limits.', 'github', 'Documentation', -0.3, 0.8),
  ('Cannot figure out how to set up custom domains, docs are unclear and examples dont work', 'discord', 'Documentation', -0.6, 0.5),
  ('Your getting started guide is outdated - half the screenshots dont match the current UI', 'email', 'Documentation', -0.5, 0.7),

  -- Billing & Pricing (3 signals)
  ('Billing page shows wrong usage numbers, need urgent fix - were being overcharged!', 'ticket', 'Billing & Pricing', -0.9, 1.0),
  ('The pricing calculator doesnt include all the hidden fees. Got surprised by my first bill.', 'forum', 'Billing & Pricing', -0.7, 0.4),
  ('Can you explain why my bill jumped 3x this month? Usage looks the same to me.', 'email', 'Billing & Pricing', -0.6, 0.7),

  -- Developer Experience (4 signals)
  ('Wrangler CLI crashes randomly on Windows. Have to restart it multiple times per day.', 'github', 'Developer Experience', -0.7, 0.8),
  ('Error messages are cryptic, spent 4 hours debugging what turned out to be a simple CORS issue', 'github', 'Developer Experience', -0.6, 0.8),
  ('The Workers playground is so helpful for testing! Saved me hours of debugging.', 'twitter', 'Developer Experience', 0.8, 0.6),
  ('Hot reload on wrangler dev is chef kiss. Finally a good DX!', 'discord', 'Developer Experience', 0.85, 0.5),

  -- Observability (3 signals)
  ('Why is there no way to see real-time logs in the dashboard? Have to use CLI for everything', 'discord', 'Observability', -0.5, 0.5),
  ('Analytics data is delayed by hours, makes debugging production issues impossible', 'ticket', 'Observability', -0.8, 1.0),
  ('Need better tracing - cant follow a request through multiple workers', 'github', 'Observability', -0.6, 0.8),

  -- Support Response (2 signals)
  ('Support response time is terrible, waited 5 days for a basic question about DNS', 'ticket', 'Support Response', -0.85, 1.0),
  ('Opened a P1 ticket 48 hours ago and still no response. This is unacceptable for enterprise.', 'email', 'Support Response', -0.9, 0.7),

  -- Workers AI (2 signals - positive!)
  ('Workers AI is amazing! Built a whole chatbot in 2 hours with zero ML experience', 'twitter', 'Workers AI', 0.9, 0.6),
  ('The AI inference speed is incredible. Sub-100ms responses at the edge!', 'forum', 'Workers AI', 0.85, 0.4),

  -- R2 Storage (2 signals - positive!)
  ('R2 pricing is super competitive, migrating everything from S3 this week', 'twitter', 'R2 Storage', 0.85, 0.6),
  ('Zero egress fees on R2 is a game changer for our video platform', 'forum', 'R2 Storage', 0.9, 0.4),

  -- D1 Database (2 signals)
  ('D1 database migrations are a pain, wish there was a proper migration tool', 'github', 'D1 Database', -0.5, 0.8),
  ('D1 is perfect for small projects but documentation on limits is confusing', 'discord', 'D1 Database', -0.3, 0.5),

  -- Pages (1 signal - positive!)
  ('New Pages deployment is buttery smooth, great work team! Deploys in under 30 seconds.', 'twitter', 'Pages', 0.95, 0.6);

-- Pre-aggregate bubbles with AI-generated summaries
INSERT INTO bubbles (category, total_weight, avg_sentiment, feedback_count, action_summary, build_ideas) VALUES
  ('Performance Issues', 2.7, -0.71, 4, 
   'Users are experiencing consistent timeouts, 502 errors, and slow dashboard load times. This is causing significant workflow disruption and frustration.',
   '1. Add performance monitoring dashboard with real-time latency metrics|2. Implement automatic failover for edge locations|3. Add loading skeletons and progressive data loading to dashboard'),
  
  ('Documentation', 2.0, -0.47, 3,
   'Documentation is outdated, confusing, and missing practical examples. Users struggle with basic setup tasks like custom domains and rate limits.',
   '1. Audit and update all screenshots to match current UI|2. Add interactive code examples that users can run|3. Create video walkthroughs for common setup tasks'),
  
  ('Billing & Pricing', 2.1, -0.73, 3,
   'Users are confused by pricing, surprised by bills, and seeing incorrect usage data. Trust issue forming around billing transparency.',
   '1. Add cost breakdown and prediction tool in dashboard|2. Send proactive alerts when usage spikes|3. Fix usage calculation bugs and add audit trail'),
  
  ('Developer Experience', 2.7, 0.09, 4,
   'Mixed signals - CLI stability issues and cryptic errors frustrate developers, but playground and hot reload are well-loved.',
   '1. Improve error messages with specific fix suggestions|2. Add Windows-specific testing to CI pipeline|3. Document the beloved features more prominently'),
  
  ('Observability', 2.3, -0.63, 3,
   'Developers cannot debug production issues effectively. Logs are not real-time, analytics are delayed hours, and distributed tracing is missing.',
   '1. Build real-time log streaming in dashboard|2. Reduce analytics delay to under 5 minutes|3. Add distributed tracing across worker chains'),
  
  ('Support Response', 1.7, -0.88, 2,
   'Enterprise customers waiting 2-5 days for responses on critical issues. Major risk to enterprise retention and reputation.',
   '1. Implement SLA-based ticket routing|2. Add live chat for enterprise tier|3. Create self-service troubleshooting wizard'),
  
  ('Workers AI', 1.0, 0.88, 2,
   'Customers love the ease of use and edge inference speed. Strong positive sentiment - this is a competitive advantage.',
   '1. Create more templates and starter projects|2. Add case studies showcasing customer wins|3. Consider expanding model selection'),
  
  ('R2 Storage', 1.0, 0.88, 2,
   'Zero egress fees are a major differentiator driving S3 migrations. Customers actively promoting this benefit.',
   '1. Create S3-to-R2 migration wizard|2. Add cost comparison calculator|3. Publish customer migration success stories'),
  
  ('D1 Database', 1.3, -0.40, 2,
   'Users want better migration tooling and clearer documentation on database limits and capabilities.',
   '1. Build a proper migration CLI tool|2. Add clear limits documentation page|3. Create schema versioning feature'),
  
  ('Pages', 0.6, 0.95, 1,
   'Fast deployment times are delighting users. This is working well - maintain and promote.',
   '1. Highlight deploy speed in marketing|2. Add deployment time tracking|3. Create comparison benchmarks vs competitors');
