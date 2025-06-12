/*
  # Fix Producer Revenue Calculation

  1. Ensure producer_id column exists
  This migration ensures the producer_id column exists in the sales table
  and properly updates all existing sales records with the correct producer_id
  from the associated track.

  2. Create Trigger for New Sales
  Adds a trigger to automatically set the producer_id when a new sale is created,
  ensuring that revenue calculations always work correctly.
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

-- Refresh the sales_analytics materialized view to include the updated data
REFRESH MATERIALIZED VIEW IF EXISTS sales_analytics;
