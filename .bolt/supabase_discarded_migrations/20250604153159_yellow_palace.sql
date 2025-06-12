/*
  # Fix ambiguous producer_id reference

  1. Changes
    - Drop and recreate the set_producer_id_on_sale trigger function with qualified column references
    - Ensure proper table aliases are used to avoid ambiguity

  2. Technical Details
    - Properly qualifies producer_id references with table names
    - Uses explicit table aliases for clarity
    - Maintains existing functionality while fixing the ambiguity
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS set_producer_id_on_sale();

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
