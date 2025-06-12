/*
  # Fix membership display and license creation issues

  1. Updates
    - Ensure all sales records have producer_id populated
    - Add explicit foreign key references in queries
    - Update RLS policies for proper access control
  
  2. Security
    - Add policy for producers to view their own sales
*/

-- Make sure producer_id column exists
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

-- Refresh the sales_analytics materialized view to include the updated data
REFRESH MATERIALIZED VIEW sales_analytics;
