/*
  # Add Proposal History and Analytics

  1. New Tables
    - `proposal_history`
      - Tracks all proposal status changes
      - Enables analytics and reporting
    - `proposal_analytics`
      - Materialized view for quick analytics access
      - Updated daily

  2. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create proposal history table
CREATE TABLE IF NOT EXISTS proposal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES sync_proposals NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES profiles NOT NULL,
  changed_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE proposal_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all proposal history"
  ON proposal_history
  FOR SELECT
  USING ((auth.jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text]));

CREATE POLICY "Users can view their own proposal history"
  ON proposal_history
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sync_proposals sp
    WHERE sp.id = proposal_history.proposal_id
    AND (sp.client_id = auth.uid() OR EXISTS (
      SELECT 1 FROM tracks t
      WHERE t.id = sp.track_id
      AND t.producer_id = auth.uid()
    ))
  ));

-- Create trigger function to track proposal history
CREATE OR REPLACE FUNCTION track_proposal_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO proposal_history (
      proposal_id,
      previous_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER track_proposal_status_changes
  BEFORE UPDATE ON sync_proposals
  FOR EACH ROW
  EXECUTE FUNCTION track_proposal_history();

-- Create materialized view for analytics
CREATE MATERIALIZED VIEW proposal_analytics AS
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
GROUP BY DATE_TRUNC('day', sp.created_at), t.producer_id;

-- Create index for better query performance
CREATE INDEX idx_proposal_analytics_date ON proposal_analytics (date);
CREATE INDEX idx_proposal_analytics_producer ON proposal_analytics (producer_id);

-- Create function to refresh analytics
CREATE OR REPLACE FUNCTION refresh_proposal_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY proposal_analytics;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to refresh analytics daily
SELECT cron.schedule(
  'refresh_proposal_analytics',
  '0 0 * * *',  -- Run at midnight every day
  'SELECT refresh_proposal_analytics()'
);
