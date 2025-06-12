/*
  # Fix Producer ID Function

  1. Changes
     - Drops the existing function with CASCADE to handle dependencies
     - Recreates the function with proper column qualification
  
  2. Purpose
     - Ensures the producer_id is automatically set when a sale is created
     - Uses proper table aliasing to avoid ambiguity
*/

-- Drop the existing function with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS set_producer_id_on_sale() CASCADE;

-- Recreate the function with proper column qualification
CREATE OR REPLACE FUNCTION set_producer_id_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the producer_id from the tracks table using an alias
  SELECT t.producer_id INTO NEW.producer_id
  FROM tracks t
  WHERE t.id = NEW.track_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger that was dropped by CASCADE
CREATE TRIGGER set_producer_id_trigger
BEFORE INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION set_producer_id_on_sale();
