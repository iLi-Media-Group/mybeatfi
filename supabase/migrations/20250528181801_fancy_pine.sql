/*
  # Fix sales analytics refresh trigger permissions

  1. Changes
    - Modify refresh_sales_analytics trigger function to use SECURITY DEFINER
    - Grant necessary permissions to public role
    - Drop and recreate trigger to apply changes

  2. Security
    - Function will now execute with owner privileges
    - Public role gets minimal required permissions
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS refresh_sales_analytics_on_sale ON sales;

-- Recreate function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION refresh_sales_analytics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY sales_analytics;
  RETURN NULL;
END;
$$;

-- Recreate trigger
CREATE TRIGGER refresh_sales_analytics_on_sale
  AFTER INSERT OR DELETE OR UPDATE ON sales
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_sales_analytics();

-- Grant necessary permissions
GRANT SELECT ON sales_analytics TO public;
GRANT EXECUTE ON FUNCTION refresh_sales_analytics() TO public;
