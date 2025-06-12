/*
  # Fix Producer Transactions RLS Policies
  
  1. Security
    - Enable RLS on producer_transactions table
    - Create policy for service_role to insert transactions
    - Ensure producers can only view their own transactions
    - Allow admin users to manage all transactions
*/

-- Ensure RLS is enabled on the table
ALTER TABLE producer_transactions ENABLE ROW LEVEL SECURITY;

-- Check if the policy already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'producer_transactions' AND policyname = 'Allow internal inserts'
  ) THEN
    -- Create policy for service_role to insert transactions
    -- For INSERT policies, we need WITH CHECK instead of USING
    CREATE POLICY "Allow internal inserts"
    ON producer_transactions
    FOR INSERT
    TO service_role
    WITH CHECK (true);
  END IF;
END $$;

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
