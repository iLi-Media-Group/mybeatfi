/*
  # Add Negotiation Features to Sync Proposals

  1. New Tables
    - `proposal_negotiations`
      - Tracks counter-offers and negotiations
      - Stores message history between parties
    - `proposal_files`
      - Stores shared files for sync proposals
      - Tracks file access and permissions

  2. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create proposal negotiations table
CREATE TABLE IF NOT EXISTS proposal_negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES sync_proposals NOT NULL,
  sender_id uuid REFERENCES profiles NOT NULL,
  message text NOT NULL,
  counter_offer numeric,
  counter_terms text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create proposal files table
CREATE TABLE IF NOT EXISTS proposal_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES sync_proposals NOT NULL,
  uploader_id uuid REFERENCES profiles NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE proposal_negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_files ENABLE ROW LEVEL SECURITY;

-- Create policies for proposal negotiations
CREATE POLICY "Users can view negotiations for their proposals"
  ON proposal_negotiations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sync_proposals sp
      WHERE sp.id = proposal_id
      AND (
        sp.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM tracks t
          WHERE t.id = sp.track_id
          AND t.producer_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create negotiations for their proposals"
  ON proposal_negotiations
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM sync_proposals sp
      WHERE sp.id = proposal_id
      AND (
        sp.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM tracks t
          WHERE t.id = sp.track_id
          AND t.producer_id = auth.uid()
        )
      )
    )
  );

-- Create policies for proposal files
CREATE POLICY "Users can view files for their proposals"
  ON proposal_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sync_proposals sp
      WHERE sp.id = proposal_id
      AND (
        sp.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM tracks t
          WHERE t.id = sp.track_id
          AND t.producer_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can upload files to their proposals"
  ON proposal_files
  FOR INSERT
  WITH CHECK (
    auth.uid() = uploader_id
    AND EXISTS (
      SELECT 1 FROM sync_proposals sp
      WHERE sp.id = proposal_id
      AND (
        sp.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM tracks t
          WHERE t.id = sp.track_id
          AND t.producer_id = auth.uid()
        )
      )
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_proposal_negotiations_updated_at
  BEFORE UPDATE ON proposal_negotiations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add status for negotiation
ALTER TABLE sync_proposals 
ADD COLUMN IF NOT EXISTS negotiation_status text 
CHECK (negotiation_status IN ('pending', 'negotiating', 'agreed', 'declined'))
DEFAULT 'pending';
