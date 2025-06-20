/*
  # Update Producer Applications RLS Policies

  1. Security Updates
    - Enable RLS if not already enabled
    - Add admin CRUD policies
    - Maintain existing insert policy for authenticated users
    - Add admin update/delete capabilities

  2. Policy Details
    - "Admins can read, update, delete": Full CRUD access for admin role
    - Keeps existing "Enable insert for authenticated users" policy
*/

-- Step 1: Enable RLS if not already enabled
ALTER TABLE public.producer_applications ENABLE ROW LEVEL SECURITY;

-- Step 2: Create admin CRUD policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'producer_applications'
    AND policyname = 'Admins can read, update, delete'
  ) THEN
    CREATE POLICY "Admins can read, update, delete"
    ON public.producer_applications
    FOR SELECT, UPDATE, DELETE
    USING (
      auth.jwt() ->> 'role' = 'admin'
    );
  END IF;
END $$;

-- Keep existing insert policy for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'producer_applications'
    AND policyname = 'Enable insert for authenticated users'
  ) THEN
    CREATE POLICY "Enable insert for authenticated users" 
    ON public.producer_applications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;
