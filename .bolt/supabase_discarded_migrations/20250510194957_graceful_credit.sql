/*
  # Add Custom Sync Requests

  1. New Tables
    - `custom_sync_requests`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references profiles)
      - `project_title` (text)
      - `project_description` (text)
      - `sync_fee` (numeric)
      - `end_date` (timestamp with time zone)
      - `genre` (text)
      - `sub_genres` (text[])
      - `reference_artist` (text, nullable)
      - `reference_song` (text, nullable)
      - `reference_url` (text, nullable)
      - `is_open_request` (boolean)
      - `preferred_producer_id` (uuid, references profiles, nullable)
      - `submission_instructions` (text)
      - `submission_email` (text)
      - `status` (text)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `custom_sync_requests` table
    - Add policies for clients to create and manage their requests
    - Add policies for producers to view open requests
    - Add policies for admins to manage all requests
*/

-- Create custom sync requests table
CREATE TABLE IF NOT EXISTS custom_sync_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES profiles(id) NOT NULL,
  project_title text NOT NULL,
  project_description text NOT NULL,
  sync_fee numeric NOT NULL CHECK (sync_fee >= 0),
  end_date timestamptz NOT NULL,
  genre text NOT NULL,
  sub_genres text[] DEFAULT '{}',
  reference_artist text,
  reference_song text,
  reference_url text,
  is_open_request boolean DEFAULT false,
  preferred_producer_id uuid REFERENCES profiles(id),
  submission_instructions text NOT NULL,
  submission_email text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE custom_sync_requests ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_custom_sync_requests_updated_at
  BEFORE UPDATE ON custom_sync_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Policies for clients
CREATE POLICY "Clients can create sync requests"
  ON custom_sync_requests
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can view their own requests"
  ON custom_sync_requests
  FOR SELECT
  TO public
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can update their own requests"
  ON custom_sync_requests
  FOR UPDATE
  TO public
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- Policies for producers
CREATE POLICY "Producers can view open requests"
  ON custom_sync_requests
  FOR SELECT
  TO public
  USING (
    (is_open_request = true AND status = 'open') OR
    (preferred_producer_id = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND account_type = 'producer'
    ))
  );

-- Policies for admins
CREATE POLICY "Admins can manage all requests"
  ON custom_sync_requests
  FOR ALL
  TO public
  USING (
    (SELECT email FROM profiles WHERE id = auth.uid()) IN (
      'knockriobeats@gmail.com',
      'info@mybeatfi.io',
      'derykbanks@yahoo.com'
    )
  )
  WITH CHECK (
    (SELECT email FROM profiles WHERE id = auth.uid()) IN (
      'knockriobeats@gmail.com',
      'info@mybeatfi.io',
      'derykbanks@yahoo.com'
    )
  );

-- Create indexes
CREATE INDEX idx_custom_sync_requests_client_id ON custom_sync_requests(client_id);
CREATE INDEX idx_custom_sync_requests_preferred_producer_id ON custom_sync_requests(preferred_producer_id);
CREATE INDEX idx_custom_sync_requests_status ON custom_sync_requests(status);
CREATE INDEX idx_custom_sync_requests_created_at ON custom_sync_requests(created_at DESC);
CREATE INDEX idx_custom_sync_requests_end_date ON custom_sync_requests(end_date);
