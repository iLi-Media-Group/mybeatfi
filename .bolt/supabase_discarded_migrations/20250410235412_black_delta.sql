/*
  # Add Vocal Tracks Support

  1. Changes to Existing Tables
    - Add `has_vocals` and `vocals_usage_type` to tracks table
    - Add sync proposals table for vocal tracks

  2. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Add vocal track fields to tracks table
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS has_vocals boolean DEFAULT false;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS vocals_usage_type text CHECK (vocals_usage_type IN ('normal', 'sync_only'));

-- Create sync proposals table
CREATE TABLE IF NOT EXISTS sync_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid REFERENCES tracks NOT NULL,
  client_id uuid REFERENCES profiles NOT NULL,
  project_type text NOT NULL,
  duration text NOT NULL,
  is_exclusive boolean DEFAULT false,
  sync_fee decimal NOT NULL,
  payment_terms text CHECK (payment_terms IN ('immediate', 'net30', 'net60', 'net90')),
  expiration_date timestamptz NOT NULL,
  is_urgent boolean DEFAULT false,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sync_proposals ENABLE ROW LEVEL SECURITY;

-- Create policies for sync proposals
CREATE POLICY "Clients can create proposals"
  ON sync_proposals FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can view their own proposals"
  ON sync_proposals FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Producers can view proposals for their tracks"
  ON sync_proposals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tracks
    WHERE tracks.id = track_id
    AND tracks.producer_id = auth.uid()
  ));

-- Create trigger for updated_at
CREATE TRIGGER update_sync_proposals_updated_at
  BEFORE UPDATE ON sync_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
