/*
  # Fix ambiguous producer_id reference in sales trigger
  
  1. Changes
    - Creates a new version of the set_producer_id_on_sale function
    - Properly qualifies column references to avoid ambiguity
    - Uses table aliases for clarity
    - Drops and recreates the trigger to use the updated function
*/

-- First drop the trigger that depends on the function
DROP TRIGGER IF EXISTS set_producer_id_on_sale_trigger ON sales;

-- Now create a new version of the function with proper column qualification
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

-- Recreate the trigger with the updated function
CREATE TRIGGER set_producer_id_on_sale_trigger
BEFORE INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION set_producer_id_on_sale();
