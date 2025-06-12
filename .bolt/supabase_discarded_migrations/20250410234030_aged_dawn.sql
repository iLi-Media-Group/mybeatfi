/*
  # Initial Schema Setup for Music Licensing Platform

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, matches auth.users)
      - `email` (text)
      - `full_name` (text)
      - `avatar_url` (text)
      - `is_producer` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `tracks`
      - `id` (uuid, primary key)
      - `producer_id` (uuid, references profiles)
      - `title` (text)
      - `artist` (text)
      - `genres` (text[])
      - `sub_genres` (text[])
      - `moods` (text[])
      - `bpm` (integer)
      - `duration` (interval)
      - `audio_url` (text)
      - `image_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `track_files`
      - `id` (uuid, primary key)
      - `track_id` (uuid, references tracks)
      - `license_type` (text)
      - `format` (text)
      - `file_url` (text)
      - `created_at` (timestamp)
    
    - `licenses`
      - `id` (uuid, primary key)
      - `track_id` (uuid, references tracks)
      - `license_type` (text)
      - `base_price` (decimal)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `sales`
      - `id` (uuid, primary key)
      - `track_id` (uuid, references tracks)
      - `buyer_id` (uuid, references profiles)
      - `license_type` (text)
      - `amount` (decimal)
      - `payment_method` (text)
      - `transaction_id` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add specific policies for producers
*/

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  is_producer boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tracks table if it doesn't exist
CREATE TABLE IF NOT EXISTS tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid REFERENCES profiles NOT NULL,
  title text NOT NULL,
  artist text NOT NULL,
  genres text[] NOT NULL DEFAULT '{}',
  sub_genres text[] NOT NULL DEFAULT '{}',
  moods text[] NOT NULL DEFAULT '{}',
  bpm integer,
  duration interval,
  audio_url text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create track_files table if it doesn't exist
CREATE TABLE IF NOT EXISTS track_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid REFERENCES tracks NOT NULL,
  license_type text NOT NULL,
  format text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create licenses table if it doesn't exist
CREATE TABLE IF NOT EXISTS licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid REFERENCES tracks NOT NULL,
  license_type text NOT NULL,
  base_price decimal NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sales table if it doesn't exist
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid REFERENCES tracks NOT NULL,
  buyer_id uuid REFERENCES profiles NOT NULL,
  license_type text NOT NULL,
  amount decimal NOT NULL,
  payment_method text NOT NULL,
  transaction_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
DO $$ 
BEGIN
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE track_files ENABLE ROW LEVEL SECURITY;
  ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Tracks are viewable by everyone" ON tracks;
  DROP POLICY IF EXISTS "Producers can insert own tracks" ON tracks;
  DROP POLICY IF EXISTS "Producers can update own tracks" ON tracks;
  DROP POLICY IF EXISTS "Track files are viewable by track owners and buyers" ON track_files;
  DROP POLICY IF EXISTS "Producers can manage track files" ON track_files;
  DROP POLICY IF EXISTS "Licenses are viewable by everyone" ON licenses;
  DROP POLICY IF EXISTS "Producers can manage licenses" ON licenses;
  DROP POLICY IF EXISTS "Sales are viewable by involved parties" ON sales;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Tracks policies
CREATE POLICY "Tracks are viewable by everyone"
  ON tracks FOR SELECT
  USING (true);

CREATE POLICY "Producers can insert own tracks"
  ON tracks FOR INSERT
  WITH CHECK (auth.uid() = producer_id AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_producer = true
  ));

CREATE POLICY "Producers can update own tracks"
  ON tracks FOR UPDATE
  USING (auth.uid() = producer_id);

-- Track files policies
CREATE POLICY "Track files are viewable by track owners and buyers"
  ON track_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tracks WHERE tracks.id = track_id AND tracks.producer_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM sales WHERE sales.track_id = track_id AND sales.buyer_id = auth.uid()
    )
  );

CREATE POLICY "Producers can manage track files"
  ON track_files FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tracks WHERE tracks.id = track_id AND tracks.producer_id = auth.uid()
    )
  );

-- Licenses policies
CREATE POLICY "Licenses are viewable by everyone"
  ON licenses FOR SELECT
  USING (true);

CREATE POLICY "Producers can manage licenses"
  ON licenses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tracks WHERE tracks.id = track_id AND tracks.producer_id = auth.uid()
    )
  );

-- Sales policies
CREATE POLICY "Sales are viewable by involved parties"
  ON sales FOR SELECT
  USING (
    auth.uid() = buyer_id OR
    EXISTS (
      SELECT 1 FROM tracks WHERE tracks.id = track_id AND tracks.producer_id = auth.uid()
    )
  );

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Create function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_tracks_updated_at ON tracks;
DROP TRIGGER IF EXISTS update_licenses_updated_at ON licenses;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON tracks
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_licenses_updated_at
  BEFORE UPDATE ON licenses
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
