/*
# Producer Payment Methods and Withdrawals

1. New Tables
   - `producer_payment_methods`: Stores payment method details for producers
   - `producer_withdrawals`: Tracks withdrawal requests and their status

2. Security
   - Enable RLS on both tables
   - Add policies for producers to manage their own payment methods
   - Add policies for admins to manage all payment methods and withdrawals

3. Features
   - Support for bank accounts, PayPal, and cryptocurrency payments
   - Primary payment method designation
   - Withdrawal request workflow
*/

-- Create producer_payment_methods table if it doesn't exist
CREATE TABLE IF NOT EXISTS producer_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES profiles(id),
  account_type TEXT NOT NULL CHECK (account_type IN ('bank', 'paypal', 'crypto')),
  account_details JSONB NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create producer_withdrawals table if it doesn't exist
CREATE TABLE IF NOT EXISTS producer_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES profiles(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method_id UUID NOT NULL REFERENCES producer_payment_methods(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on producer_payment_methods
ALTER TABLE producer_payment_methods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for producer_payment_methods
CREATE POLICY "Producers can manage their own payment methods"
ON producer_payment_methods
FOR ALL
TO public
USING (producer_id = auth.uid());

CREATE POLICY "Admin users can view all payment methods"
ON producer_payment_methods
FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text]));

-- Enable RLS on producer_withdrawals
ALTER TABLE producer_withdrawals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for producer_withdrawals
CREATE POLICY "Producers can view and create their own withdrawals"
ON producer_withdrawals
FOR SELECT
TO public
USING (producer_id = auth.uid());

CREATE POLICY "Producers can create withdrawal requests"
ON producer_withdrawals
FOR INSERT
TO public
WITH CHECK (producer_id = auth.uid());

CREATE POLICY "Admin users can manage all withdrawals"
ON producer_withdrawals
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text]));

-- Create a function to handle withdrawal requests
CREATE OR REPLACE FUNCTION process_withdrawal_request()
RETURNS TRIGGER AS $$
DECLARE
  available_balance NUMERIC;
  minimum_withdrawal NUMERIC;
BEGIN
  -- Get the producer's available balance
  SELECT pb.available_balance INTO available_balance
  FROM producer_balances pb
  WHERE pb.producer_id = NEW.producer_id;
  
  -- Get minimum withdrawal amount from settings
  SELECT cs.minimum_withdrawal INTO minimum_withdrawal
  FROM compensation_settings cs
  WHERE cs.id = 1;
  
  -- Check if the producer has enough balance
  IF available_balance < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient balance for withdrawal';
  END IF;
  
  -- Check if the amount meets the minimum withdrawal requirement
  IF NEW.amount < minimum_withdrawal THEN
    RAISE EXCEPTION 'Withdrawal amount is below the minimum requirement of $%', minimum_withdrawal;
  END IF;
  
  -- Deduct the amount from the producer's available balance
  UPDATE producer_balances
  SET available_balance = available_balance - NEW.amount,
      updated_at = now()
  WHERE producer_id = NEW.producer_id;
  
  -- Create a transaction record for the withdrawal
  INSERT INTO producer_transactions (
    producer_id,
    amount,
    type,
    status,
    description
  ) VALUES (
    NEW.producer_id,
    -NEW.amount,
    'withdrawal',
    'pending',
    'Withdrawal Request'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger for the process_withdrawal_request function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'process_withdrawal_request_trigger'
  ) THEN
    CREATE TRIGGER process_withdrawal_request_trigger
    BEFORE INSERT ON producer_withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION process_withdrawal_request();
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If the trigger already exists, do nothing
    NULL;
END $$;
