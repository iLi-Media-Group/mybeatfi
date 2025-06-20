/*
  # Create Producer Applications Table

  1. New Tables
    - `producer_applications`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `email` (text, required)
      - `primary_genre` (text)
      - `secondary_genre` (text)
      - `years_experience` (integer)
      - `daws` (text)
      - `team_type` (text: solo, small_team, band)
      - `tracks_per_week` (integer)
      - `best_track_link` (text)
      - `instruments` (text)
      - `instrument_proficiency` (integer)
      - `uses_splice` (text: yes/no)
      - `uses_loops` (text: yes/no)
      - `records_artists` (text: yes/no)
      - `artist_example_link` (text)
      - `has_business_entity` (text: yes/no)
      - `additional_notes` (text)
      - `auto_disqualified` (boolean, default false)
      - `score` (integer, default 0)
      - `submission_date` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `producer_applications` table
    - Add policy for authenticated users to insert applications
    - Add policy for admins to read all applications
*/

CREATE TABLE IF NOT EXISTS public.producer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name text NOT NULL,
  email text NOT NULL,
  primary_genre text,
  secondary_genre text,
  years_experience integer,
  daws text,
  team_type text, -- solo, small_team, band
  tracks_per_week integer,
  best_track_link text,
  instruments text,
  instrument_proficiency integer,
  uses_splice text, -- yes/no
  uses_loops text,  -- yes/no
  records_artists text, -- yes/no
  artist_example_link text,
  has_business_entity text, -- yes/no
  additional_notes text,

  auto_disqualified boolean NOT NULL DEFAULT false,
  score integer DEFAULT 0,
  submission_date timestamptz DEFAULT timezone('utc', now()),

  created_at timestamptz DEFAULT timezone('utc', now())
);

ALTER TABLE public.producer_applications ENABLE ROW LEVEL SECURITY;

-- Only create insert policy if it doesn't exist
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

-- Only create select policy if it doesn't exist
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
