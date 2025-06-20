/*
  # Update Producer Applications Schema and Policies

  1. Schema Updates
    - Align table structure with React component requirements
    - Add review_tier column for tier management
    - Ensure all fields match form requirements
    - Add auto_disqualified flag

  2. Security Updates
    - Maintain RLS with proper policies
    - Allow public inserts for applications
    - Add admin CRUD policies
*/

-- Update table structure if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'producer_applications') THEN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'producer_applications' AND column_name = 'review_tier'
    ) THEN
      ALTER TABLE public.producer_applications ADD COLUMN review_tier text;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'producer_applications' AND column_name = 'auto_disqualified'
    ) THEN
      ALTER TABLE public.producer_applications ADD COLUMN auto_disqualified boolean DEFAULT false;
    END IF;
  ELSE
    -- Create new table if it doesn't exist
    CREATE TABLE public.producer_applications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamp with time zone DEFAULT timezone('utc', now()),

      name text NOT NULL,
      email text NOT NULL,

      primary_genre text NOT NULL,
      secondary_genre text,

      years_experience text NOT NULL,
      daws_used text NOT NULL,
      team_type text NOT NULL,

      tracks_per_week text NOT NULL,
      spotify_link text NOT NULL,
      instruments text,

      sample_use text NOT NULL,  -- Expecting "Yes" or "No"
      splice_use text NOT NULL,  -- Expecting "Yes" or "No"
      loop_use text NOT NULL,    -- Expecting "Yes" or "No"

      artist_collab text,
      business_entity text,
      additional_info text,

      review_tier text,
      auto_disqualified boolean DEFAULT false
    );
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.producer_applications ENABLE ROW LEVEL SECURITY;

-- Public insert policy (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'producer_applications'
    AND policyname = 'Allow inserts for anonymous users'
  ) THEN
    CREATE POLICY "Allow inserts for anonymous users"
    ON public.producer_applications
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- Admin CRUD policies (if not exists)
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
