/*
  # Fix Producer Revenue Calculation

  1. New Functions
    - `calculate_producer_earnings()` - Calculates producer earnings from sales
    - `set_producer_id_on_sale()` - Automatically sets producer_id on new sales

  2. Triggers
    - `calculate_producer_earnings_trigger` - Runs after a sale is inserted
    - `set_producer_id_on_sale_trigger` - Runs before a sale is inserted

  3. Changes
    - Ensures producer_id column exists on sales table
    - Updates existing sales records to set producer_id
    - Adds RLS policy for producers to view their own sales
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_sales_producer_id'
  ) THEN
    CREATE INDEX idx_sales_producer_id ON sales(producer_id);
  END IF;
END $$;

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

-- Create a function to calculate producer earnings from sales
CREATE OR REPLACE FUNCTION calculate_producer_earnings()
RETURNS TRIGGER AS $$
DECLARE
  producer_share NUMERIC;
  compensation_rate INTEGER;
BEGIN
  -- Get the appropriate compensation rate based on license type
  SELECT 
    CASE 
      WHEN NEW.license_type = 'Single Track' THEN standard_rate
      WHEN NEW.license_type ILIKE '%exclusive%' THEN exclusive_rate
      WHEN NEW.license_type ILIKE '%sync%' THEN sync_fee_rate
      ELSE standard_rate
    END INTO compensation_rate
  FROM compensation_settings
  LIMIT 1;

  -- Default to 70% if no settings found
  IF compensation_rate IS NULL THEN
    compensation_rate := 70;
  END IF;

  -- Calculate producer's share
  producer_share := (NEW.amount * compensation_rate / 100);

  -- Create a transaction record for the producer
  INSERT INTO producer_transactions (
    producer_id,
    amount,
    type,
    status,
    description,
    track_title,
    reference_id
  )
  SELECT
    NEW.producer_id,
    producer_share,
    'sale',
    'completed',
    'Sale: ' || t.title || ' (' || NEW.license_type || ')',
    t.title,
    NEW.id
  FROM tracks t
  WHERE t.id = NEW.track_id;

  -- Update producer balance
  INSERT INTO producer_balances (
    producer_id,
    available_balance,
    pending_balance,
    lifetime_earnings
  )
  VALUES (
    NEW.producer_id,
    producer_share,
    0,
    producer_share
  )
  ON CONFLICT (producer_id) DO UPDATE
  SET 
    available_balance = producer_balances.available_balance + producer_share,
    lifetime_earnings = producer_balances.lifetime_earnings + producer_share;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the earnings function after a new sale is inserted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'calculate_producer_earnings_trigger'
  ) THEN
    CREATE TRIGGER calculate_producer_earnings_trigger
    AFTER INSERT ON sales
    FOR EACH ROW
    EXECUTE FUNCTION calculate_producer_earnings();
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If the trigger already exists, do nothing
    NULL;
END $$;

-- Update existing sales records to set producer_id based on track's producer_id
UPDATE sales
SET producer_id = tracks.producer_id
FROM tracks
WHERE sales.track_id = tracks.id AND sales.producer_id IS NULL;

-- Refresh the sales_analytics materialized view if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE matviewname = 'sales_analytics'
  ) THEN
    EXECUTE 'REFRESH MATERIALIZED VIEW sales_analytics';
  END IF;
END $$;
