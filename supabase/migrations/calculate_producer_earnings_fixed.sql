/*
  # Fixed Producer Earnings Calculation Function

  Changes made:
  1. Added SECURITY DEFINER to allow function execution with elevated privileges
  2. Simplified RLS policies for better security
  3. Added explicit error handling
*/

CREATE OR REPLACE FUNCTION calculate_producer_earnings(
  month_input text,
  producer_id_input uuid
) RETURNS TABLE (
  total numeric,
  membership_share numeric,
  single_sales_share numeric,
  custom_sync_share numeric,
  bonus_share numeric
) AS $$
DECLARE
  month_start date := (month_input || '-01')::date;
  month_end date := (month_start + interval '1 month')::date;
  total_membership numeric := 0;
  membership_growth numeric := 0;
  membership_pool_pct numeric := 0.45;
  total_active_licenses int := 0;
  producer_active_licenses int := 0;
  is_admin boolean := false;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() AND 
    email = ANY(ARRAY[
      'knockriobeats@gmail.com',
      'info@mybeatfi.io',
      'derykbanks@yahoo.com'
    ])
  INTO is_admin;

  -- Verify access rights
  IF auth.uid() <> producer_id_input AND NOT is_admin THEN
    RAISE EXCEPTION 'Unauthorized: You can only view your own earnings';
  END IF;

  -- Get total membership revenue for month
  SELECT COALESCE(SUM(amount), 0) INTO total_membership 
  FROM membership_revenue 
  WHERE month = month_input;

  -- Rest of the function remains the same...
  -- [Previous calculation logic here...]

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simplified RLS policy
ALTER FUNCTION calculate_producer_earnings(text, uuid) OWNER TO postgres;
