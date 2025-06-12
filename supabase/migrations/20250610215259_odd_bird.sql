/*
  # Add Producer Payouts Table

  1. New Tables
    - `producer_payouts` - Tracks producer payouts in USDC
      - `id` (uuid, primary key)
      - `producer_id` (uuid, references profiles)
      - `amount_usdc` (numeric)
      - `month` (text)
      - `status` (text, check constraint)
      - `payment_txn_id` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `producer_payouts` table
    - Add policies for producers to view their own payouts
    - Add policies for admins to manage all payouts
*/

-- Create producer_payouts table
CREATE TABLE IF NOT EXISTS producer_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount_usdc numeric NOT NULL,
  month text NOT NULL,
  status text CHECK (status IN ('pending', 'paid', 'skipped')) NOT NULL DEFAULT 'pending',
  payment_txn_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for efficient querying by producer and month
CREATE INDEX IF NOT EXISTS idx_producer_month ON producer_payouts(producer_id, month);

-- Enable RLS
ALTER TABLE producer_payouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Producers can view their own payouts"
  ON producer_payouts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = producer_id);

CREATE POLICY "Admin users can manage all payouts"
  ON producer_payouts
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text]));

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_producer_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_producer_payouts_updated_at
BEFORE UPDATE ON producer_payouts
FOR EACH ROW
EXECUTE FUNCTION update_producer_payouts_updated_at();

-- Add USDC address field to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS usdc_address text;

-- Create function to calculate producer earnings for a given month
CREATE OR REPLACE FUNCTION calculate_producer_earnings(
  month_input text,
  producer_id_input uuid
)
RETURNS TABLE (
  total numeric
) AS $$
DECLARE
  month_start timestamp;
  month_end timestamp;
  compensation_rate numeric;
BEGIN
  -- Parse month input (format: YYYY-MM)
  month_start := to_timestamp(month_input || '-01', 'YYYY-MM-DD');
  month_end := month_start + interval '1 month';
  
  -- Get compensation rate from settings
  SELECT standard_rate INTO compensation_rate 
  FROM compensation_settings 
  LIMIT 1;
  
  -- Default to 70% if no settings found
  IF compensation_rate IS NULL THEN
    compensation_rate := 70;
  END IF;
  
  -- Calculate total earnings for the month
  RETURN QUERY
  SELECT COALESCE(SUM(
    CASE
      -- For sales
      WHEN t.type = 'sale' THEN t.amount * (compensation_rate / 100)
      -- For adjustments (already calculated with rate)
      WHEN t.type = 'adjustment' AND t.amount > 0 THEN t.amount
      -- Ignore withdrawals and negative adjustments
      ELSE 0
    END
  ), 0) AS total
  FROM producer_transactions t
  WHERE t.producer_id = producer_id_input
  AND t.created_at >= month_start
  AND t.created_at < month_end
  AND t.status = 'completed';
END;
$$ LANGUAGE plpgsql;
