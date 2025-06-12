/*
  # Producer Transactions RLS Policy

  1. New Policies
    - Add service_role policy for producer_transactions
    - Ensure proper access control for transaction data

  2. Security
    - Allow only backend role (triggers/functions) to insert transactions
    - Maintain data integrity for financial records
*/

-- Check if the policy already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'producer_transactions' AND policyname = 'Allow internal inserts'
  ) THEN
    -- Create policy for service_role to insert transactions
    CREATE POLICY "Allow internal inserts"
    ON producer_transactions
    FOR INSERT
    TO service_role
    USING (true);
  END IF;
END $$;

-- Ensure RLS is enabled on the table
ALTER TABLE producer_transactions ENABLE ROW LEVEL SECURITY;

-- Make sure producers can only view their own transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'producer_transactions' AND policyname = 'Producers can view their own transactions'
  ) THEN
    CREATE POLICY "Producers can view their own transactions"
    ON producer_transactions
    FOR SELECT
    TO public
    USING (producer_id = auth.uid());
  END IF;
END $$;

-- Allow admin users to manage all transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'producer_transactions' AND policyname = 'Admin users can manage all transactions'
  ) THEN
    CREATE POLICY "Admin users can manage all transactions"
    ON producer_transactions
    FOR ALL
    TO authenticated
    USING ((jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text]));
  END IF;
END $$;
