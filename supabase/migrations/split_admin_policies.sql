/*
  # Split Admin RLS Policies into Separate Update and Delete Policies

  1. Security Updates
    - Replace combined admin CRUD policy with separate update and delete policies
    - Maintain existing admin select policy
    - Keep existing insert policy for authenticated users

  2. Policy Details
    - "Admins can update": Update access for admin role
    - "Admins can delete": Delete access for admin role
    - Preserves existing "Enable read access for admins" policy
    - Maintains "Enable insert for authenticated users" policy
*/

-- First ensure RLS is enabled
ALTER TABLE public.producer_applications ENABLE ROW LEVEL SECURITY;

-- Remove the combined CRUD policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'producer_applications'
    AND policyname = 'Admins can read, update, delete'
  ) THEN
    DROP POLICY "Admins can read, update, delete" ON public.producer_applications;
  END IF;
END $$;

-- Create separate update policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'producer_applications'
    AND policyname = 'Admins can update'
  ) THEN
    CREATE POLICY "Admins can update"
    ON public.producer_applications
    FOR UPDATE
    USING (
      auth.jwt() ->> 'role' = 'admin'
    );
  END IF;
END $$;

-- Create separate delete policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'producer_applications'
    AND policyname = 'Admins can delete'
  ) THEN
    CREATE POLICY "Admins can delete"
    ON public.producer_applications
    FOR DELETE
    USING (
      auth.jwt() ->> 'role' = 'admin'
    );
  END IF;
END $$;

-- Keep existing select policy for admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'producer_applications'
    AND policyname = 'Enable read access for admins'
  ) THEN
    CREATE POLICY "Enable read access for admins"
    ON public.producer_applications
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.account_type = 'admin'
      )
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
