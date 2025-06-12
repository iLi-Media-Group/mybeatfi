/*
  # Fix producer transactions RLS and permissions

  1. Changes
    - Add SECURITY DEFINER to calculate_producer_earnings function
    - Grant EXECUTE permission on the function to authenticated users
    - Add RLS policies for producer_transactions table
    
  2. Security
    - Function will run with owner privileges
    - Authenticated users can execute the function
    - Service role can insert records
    - Producers can view their own transactions
    - Admins can view all transactions
*/

-- Drop and recreate the function with SECURITY DEFINER
DROP FUNCTION IF EXISTS calculate_producer_earnings();

CREATE OR REPLACE FUNCTION calculate_producer_earnings()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  producer_share numeric;
  producer_id uuid;
BEGIN
  -- Get the producer ID from the track
  SELECT tracks.producer_id INTO producer_id
  FROM tracks
  WHERE tracks.id = NEW.track_id;

  -- Calculate producer share based on license type
  SELECT 
    CASE 
      WHEN NEW.license_type = 'exclusive' THEN
        (SELECT exclusive_rate FROM compensation_settings LIMIT 1)
      WHEN NEW.license_type LIKE '%sync%' THEN
        (SELECT sync_fee_rate FROM compensation_settings LIMIT 1)
      ELSE
        (SELECT standard_rate FROM compensation_settings LIMIT 1)
    END INTO producer_share;

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
    (NEW.amount * producer_share / 100),
    'sale',
    'completed',
    'Sale revenue from ' || NEW.license_type || ' license',
    (SELECT title FROM tracks WHERE id = NEW.track_id),
    NEW.id::text
  );

  RETURN NEW;
END;
$$;

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
  uid() = producer_id
);

CREATE POLICY "Admin users can manage all transactions"
ON producer_transactions
FOR ALL
TO authenticated
USING (
  (SELECT email FROM profiles WHERE id = uid()) IN (
    'knockriobeats@gmail.com',
    'info@mybeatfi.io',
    'derykbanks@yahoo.com'
  )
)
WITH CHECK (
  (SELECT email FROM profiles WHERE id = uid()) IN (
    'knockriobeats@gmail.com',
    'info@mybeatfi.io',
    'derykbanks@yahoo.com'
  )
);

CREATE POLICY "Allow service role to insert transactions"
ON producer_transactions
FOR INSERT
TO service_role
WITH CHECK (true);
