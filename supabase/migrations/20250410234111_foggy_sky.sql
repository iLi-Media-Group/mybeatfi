/*
  # Add client features

  1. New Tables
    - `favorites`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `track_id` (uuid, references tracks)
      - `created_at` (timestamp)

  2. Changes to Existing Tables
    - Add `expiry_date` to `sales` table
    - Add `license_duration` to `licenses` table

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users to manage their favorites
*/

-- Add expiry_date to sales table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'expiry_date'
  ) THEN
    ALTER TABLE sales ADD COLUMN expiry_date timestamptz;
  END IF;
END $$;

-- Add license_duration to licenses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'licenses' AND column_name = 'license_duration'
  ) THEN
    ALTER TABLE licenses ADD COLUMN license_duration interval;
  END IF;
END $$;

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles NOT NULL,
  track_id uuid REFERENCES tracks NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- Enable RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing favorites policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view their own favorites" ON favorites;
  DROP POLICY IF EXISTS "Users can add their own favorites" ON favorites;
  DROP POLICY IF EXISTS "Users can remove their own favorites" ON favorites;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Favorites policies
CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Drop existing function and trigger if they exist
DROP FUNCTION IF EXISTS calculate_expiry_date CASCADE;
DROP TRIGGER IF EXISTS set_expiry_date ON sales;

-- Create function to calculate expiry date
CREATE OR REPLACE FUNCTION calculate_expiry_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.license_type IS NOT NULL THEN
    SELECT license_duration INTO NEW.expiry_date
    FROM licenses
    WHERE track_id = NEW.track_id AND license_type = NEW.license_type;
    
    IF NEW.expiry_date IS NOT NULL THEN
      NEW.expiry_date := NEW.created_at + NEW.expiry_date;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sales expiry date
CREATE TRIGGER set_expiry_date
  BEFORE INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION calculate_expiry_date();
