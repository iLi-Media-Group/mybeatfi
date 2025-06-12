/*
  # Create producer_payouts table

  1. New Tables
    - `producer_payouts`
      - `producer_id` (uuid, foreign key to profiles)
      - `amount_usdc` (numeric)
      - `month` (text, format YYYY-MM)
      - `status` (text, enum: pending/paid)
      - `payment_txn_id` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
  2. Security
    - Enable RLS on producer_payouts
    - Producers can only view their own payouts
    - Admins can manage all payouts
*/

CREATE TABLE IF NOT EXISTS producer_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid NOT NULL REFERENCES profiles(id),
  amount_usdc numeric NOT NULL,
  month text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  payment_txn_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE producer_payouts ENABLE ROW LEVEL SECURITY;

-- Producers can view their own payouts
CREATE POLICY "Producers can view their payouts"
  ON producer_payouts
  FOR SELECT
  USING (auth.uid() = producer_id);

-- Admins can manage all payouts
CREATE POLICY "Admins can manage payouts"
  ON producer_payouts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN ('knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com')
    )
  );

-- Add USDC wallet address column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS usdc_address text;
