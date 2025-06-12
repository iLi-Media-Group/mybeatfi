/*
  # Fix profiles table structure and policies

  1. New Structure
    - Modify profiles table to use account_type instead of is_producer
    - Add account_type check constraint for valid values
  
  2. Security
    - Enable RLS on all tables
    - Create appropriate policies for each table
    - Update policies to use account_type instead of is_producer
*/

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  account_type text CHECK (account_type IN ('client', 'producer', 'admin')),
  avatar_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tracks table if it doesn't exist
CREATE TABLE IF NOT EXISTS tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid REFERENCES profiles NOT NULL,
  title text NOT NULL,
  artist text NOT NULL,
  genres text NOT NULL,
  sub_genres text,
  moods text,
  bpm integer,
  duration text,
  audio_url text,
  image_url text,
  has_sting_ending boolean DEFAULT false,
  is_one_stop boolean DEFAULT false,
  mp3_url text,
  trackouts_url text,
  has_vocals boolean DEFAULT false,
  vocals_usage_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
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
  producer_id uuid REFERENCES profiles,
  license_type text NOT NULL,
  amount decimal NOT NULL,
  payment_method text NOT NULL,
  transaction_id text,
  created_at timestamptz DEFAULT now(),
  expiry_date timestamptz,
  deleted_at timestamptz,
  licensee_info jsonb
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
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
  USING (deleted_at IS NULL);

CREATE POLICY "Producers can insert own tracks"
  ON tracks FOR INSERT
  WITH CHECK (auth.uid() = producer_id AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND account_type = 'producer'
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
    auth.uid() = producer_id OR
    EXISTS (
      SELECT 1 FROM tracks WHERE tracks.id = track_id AND tracks.producer_id = auth.uid()
    )
  );

-- Create function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

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
