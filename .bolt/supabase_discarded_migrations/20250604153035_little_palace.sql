/*
  # Fix Producer Transactions RLS and Function

  1. Changes
    - Drop the trigger first, then the function to avoid dependency errors
    - Recreate the function with SECURITY DEFINER to run with elevated privileges
    - Recreate the trigger to use the new function
    - Add proper RLS policies for producer_transactions table

  2. Security
    - Use SECURITY DEFINER to ensure the function can insert records regardless of caller
    - Set search_path to prevent search path injection
    - Create appropriate RLS policies for different user roles
*/

-- First drop the trigger that depends on the function
DROP TRIGGER IF EXISTS calculate_producer_earnings_trigger ON sales;

-- Now we can safely drop the function
DROP FUNCTION IF EXISTS calculate_producer_earnings();

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION calculate_producer_earnings()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  producer_share numeric;
  producer_id uuid;
  compensation_rate integer;
BEGIN
  -- Get the producer ID from the track
  SELECT tracks.producer_id INTO producer_id
  FROM tracks
  WHERE tracks.id = NEW.track_id;

  -- Store producer_id in the sales record
  NEW.producer_id := producer_id;

  -- Get compensation settings
  SELECT 
    CASE 
      WHEN NEW.license_type = 'exclusive' OR NEW.license_type ILIKE '%exclusive%' THEN
        exclusive_rate
      WHEN NEW.license_type ILIKE '%sync%' THEN
        sync_fee_rate
      ELSE
        standard_rate
    END INTO compensation_rate
  FROM compensation_settings
  LIMIT 1;

  -- Default to 70% if no settings found
  IF compensation_rate IS NULL THEN
    compensation_rate := 70;
  END IF;

  -- Calculate producer's share
  producer_share := (NEW.amount * compensation_rate / 100);

  -- Insert producer transaction record
  INSERT INTO producer_transactions (
    producer_id,
    amount,
    type,
    status,
    description,
    track_title,
    reference_id
  )
  VALUES (
    producer_id,
    producer_share,
    'sale',
    'completed',
    'Sale revenue from ' || NEW.license_type || ' license',
    (SELECT title FROM tracks WHERE id = NEW.track_id),
    NEW.id::text
  );

  -- Update producer balance
  INSERT INTO producer_balances (
    producer_id,
    available_balance,
    pending_balance,
    lifetime_earnings
  )
  VALUES (
    producer_id,
    producer_share,
    0,
    producer_share
  )
  ON CONFLICT (producer_id) DO UPDATE
  SET 
    available_balance = producer_balances.available_balance + producer_share,
    lifetime_earnings = producer_balances.lifetime_earnings + producer_share;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER calculate_producer_earnings_trigger
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION calculate_producer_earnings();

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_producer_earnings() TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE producer_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Producers can view their own transactions" ON producer_transactions;
DROP POLICY IF EXISTS "Admin users can manage all transactions" ON producer_transactions;
DROP POLICY IF EXISTS "Allow authenticated read" ON producer_transactions;
DROP POLICY IF EXISTS "Allow inserts from service_role" ON producer_transactions;
DROP POLICY IF EXISTS "Allow internal inserts" ON producer_transactions;

-- Create new policies
CREATE POLICY "Producers can view their own transactions"
ON producer_transactions
FOR SELECT
TO public
USING (
  auth.uid() = producer_id
);

CREATE POLICY "Admin users can manage all transactions"
ON producer_transactions
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text])
);

CREATE POLICY "Allow authenticated read"
ON producer_transactions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow inserts from service_role"
ON producer_transactions
FOR INSERT
TO service_role
WITH CHECK (true);
