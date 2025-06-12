/*
  # Add proposal history table

  1. New Tables
    - `proposal_history`
      - `id` (uuid, primary key)
      - `proposal_id` (uuid, references sync_proposals)
      - `previous_status` (text, nullable)
      - `new_status` (text, not null)
      - `changed_by` (uuid, references profiles)
      - `changed_at` (timestamptz)

  2. Security
    - Enable RLS on `proposal_history` table
    - Add policies for:
      - Producers can view history for their proposals
      - Clients can view history for their proposals
      - Users can create history entries for proposals they're involved with

  3. Changes
    - Add foreign key constraints to sync_proposals and profiles tables
    - Add indexes for improved query performance
*/

-- Create the proposal history table
CREATE TABLE IF NOT EXISTS proposal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES sync_proposals(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid NOT NULL REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  
  -- Validate status values
  CONSTRAINT valid_status CHECK (
    new_status IN ('pending', 'accepted', 'rejected', 'expired')
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_proposal_history_proposal_id ON proposal_history(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_history_changed_by ON proposal_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_proposal_history_changed_at ON proposal_history(changed_at);

-- Enable RLS
ALTER TABLE proposal_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Producers can view history for their proposals"
ON proposal_history
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM sync_proposals sp
    JOIN tracks t ON t.id = sp.track_id
    WHERE sp.id = proposal_history.proposal_id
    AND t.producer_id = auth.uid()
  )
);

CREATE POLICY "Clients can view history for their proposals"
ON proposal_history
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM sync_proposals sp
    WHERE sp.id = proposal_history.proposal_id
    AND sp.client_id = auth.uid()
  )
);

CREATE POLICY "Users can create history entries for their proposals"
ON proposal_history
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sync_proposals sp
    LEFT JOIN tracks t ON t.id = sp.track_id
    WHERE sp.id = proposal_history.proposal_id
    AND (
      sp.client_id = auth.uid()
      OR t.producer_id = auth.uid()
    )
  )
  AND auth.uid() = changed_by
);
