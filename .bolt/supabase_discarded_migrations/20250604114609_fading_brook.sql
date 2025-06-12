/*
# Fix Producer ID on Sales

1. Changes
   - Ensures producer_id column exists in sales table
   - Creates index for better performance
   - Adds RLS policy for producers to view their own sales
   - Updates existing sales records with correct producer_id
   - Creates function and trigger to automatically set producer_id on new sales

2. Fixes
   - Properly handles materialized view refresh with error checking
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

-- Create a function to automatically set producer_id when a new sale is created
CREATE OR REPLACE FUNCTION set_producer_id_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the producer_id from the track
  SELECT producer_id INTO NEW.producer_id
  FROM tracks
  WHERE id = NEW.track_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function before a new sale is inserted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_producer_id_on_sale_trigger'
  ) THEN
    CREATE TRIGGER set_producer_id_on_sale_trigger
    BEFORE INSERT ON sales
    FOR EACH ROW
    EXECUTE FUNCTION set_producer_id_on_sale();
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If the trigger already exists, do nothing
    NULL;
END $$;

-- Check if the materialized view exists before refreshing it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE matviewname = 'sales_analytics'
  ) THEN
    EXECUTE 'REFRESH MATERIALIZED VIEW sales_analytics';
  END IF;
END $$;
