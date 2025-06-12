/*
  # Fix Sales Table and Add Favorites

  1. New Tables
    - `favorites` - Stores user's favorite tracks
  
  2. Changes
    - Add `expiry_date` to `sales` table
    - Add `license_duration` to `licenses` table
    
  3. Functions
    - `calculate_expiry_date()` - Calculates expiry date for sales
*/

-- Add expiry_date to sales table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'sales' AND column_name = 'expiry_date'
    ) THEN
      ALTER TABLE sales ADD COLUMN expiry_date timestamptz;
    END IF;
  END IF;
END $$;

-- Add license_duration to licenses table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'licenses') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'licenses' AND column_name = 'license_duration'
    ) THEN
      ALTER TABLE licenses ADD COLUMN license_duration interval;
    END IF;
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

-- Create function to calculate expiry date if sales table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales') THEN
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
    DROP TRIGGER IF EXISTS set_expiry_date ON sales;
    CREATE TRIGGER set_expiry_date
      BEFORE INSERT ON sales
      FOR EACH ROW
      EXECUTE FUNCTION calculate_expiry_date();
  END IF;
END $$;
