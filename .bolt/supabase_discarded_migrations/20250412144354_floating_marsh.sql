/*
  # Create Analytics View and Indexes

  1. Changes
    - Create proposal analytics view
    - Add necessary indexes
    - Grant permissions
*/

-- Create proposal analytics view
CREATE VIEW proposal_analytics AS
WITH daily_stats AS (
  SELECT
    DATE_TRUNC('day', sp.created_at) as date,
    t.producer_id,
    COUNT(*) as total_proposals,
    COUNT(CASE WHEN sp.status = 'accepted' THEN 1 END) as accepted_proposals,
    COUNT(CASE WHEN sp.status = 'rejected' THEN 1 END) as rejected_proposals,
    COUNT(CASE WHEN sp.status = 'expired' THEN 1 END) as expired_proposals,
    AVG(sp.sync_fee) as avg_sync_fee,
    COUNT(CASE WHEN sp.is_exclusive THEN 1 END) as exclusive_requests
  FROM sync_proposals sp
  JOIN tracks t ON t.id = sp.track_id
  GROUP BY DATE_TRUNC('day', sp.created_at), t.producer_id
)
SELECT
  date,
  producer_id,
  total_proposals,
  accepted_proposals,
  rejected_proposals,
  expired_proposals,
  ROUND(avg_sync_fee::numeric, 2) as avg_sync_fee,
  exclusive_requests
FROM daily_stats;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sync_proposals_created_at 
ON sync_proposals (created_at);

CREATE INDEX IF NOT EXISTS idx_sync_proposals_producer 
ON sync_proposals (track_id);

-- Grant necessary permissions
GRANT SELECT ON proposal_analytics TO authenticated;
GRANT SELECT ON proposal_analytics TO anon;
