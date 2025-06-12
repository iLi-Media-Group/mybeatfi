/*
  # Fix producer_id column in sales table

  1. Changes
    - Adds producer_id column to sales table if it doesn't exist
    - Creates index for better performance
    - Adds RLS policy for producers to view their own sales
    - Updates existing sales records to set producer_id based on track's producer_id
*/

-- Add producer_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'producer_id'
  ) THEN
    ALTER TABLE sales
    ADD COLUMN producer_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_sales_producer_id ON sales(producer_id);

-- Add RLS policy for producers to view their own sales if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sales' AND policyname = 'Producers can view their own sales'
  ) THEN
    CREATE POLICY "Producers can view their own sales"
    ON sales
    FOR SELECT
    TO public
    USING (producer_id = auth.uid());
  END IF;
END $$;

-- Update existing sales records to set producer_id based on track's producer_id
UPDATE sales
SET producer_id = tracks.producer_id
FROM tracks
WHERE sales.track_id = tracks.id AND sales.producer_id IS NULL;
