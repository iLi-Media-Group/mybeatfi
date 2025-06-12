/*
  # Add Crypto Payments Support

  1. New Tables
    - `crypto_payments` - Stores crypto payment information
  
  2. Changes
    - Remove `paypal` option from payment methods
    - Add crypto-specific fields to payment methods
*/

-- Create crypto_payments table
CREATE TABLE IF NOT EXISTS crypto_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  amount numeric NOT NULL,
  currency text NOT NULL,
  status text NOT NULL,
  product_id text,
  track_id uuid REFERENCES tracks(id),
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_crypto_payments_user_id ON crypto_payments(user_id);

-- Create index on payment_id
CREATE INDEX IF NOT EXISTS idx_crypto_payments_payment_id ON crypto_payments(payment_id);

-- Enable RLS on crypto_payments
ALTER TABLE crypto_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for crypto_payments
CREATE POLICY "Users can view their own crypto payments"
  ON crypto_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin users can view all crypto payments"
  ON crypto_payments
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text]));

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_crypto_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crypto_payments_updated_at
BEFORE UPDATE ON crypto_payments
FOR EACH ROW
EXECUTE FUNCTION update_crypto_payments_updated_at();

-- Modify producer_payment_methods to remove PayPal and update crypto options
ALTER TABLE producer_payment_methods
DROP CONSTRAINT IF EXISTS producer_payment_methods_account_type_check;

ALTER TABLE producer_payment_methods
ADD CONSTRAINT producer_payment_methods_account_type_check
CHECK (account_type = ANY (ARRAY['bank'::text, 'crypto'::text]));
