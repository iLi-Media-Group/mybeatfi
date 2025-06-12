/*
  # Calculate Producer Earnings Function

  1. Function Purpose
    - Calculates detailed earnings breakdown for producers
    - Handles membership revenue sharing
    - Includes single sales and custom sync licensing
    - Provides growth-based bonus adjustments

  2. Parameters
    - month_input: YYYY-MM format string
    - producer_id_input: UUID of producer

  3. Return Structure
    - total: Sum of all earnings
    - membership_share: Revenue from membership pool
    - single_sales_share: Revenue from single track sales
    - custom_sync_share: Revenue from custom sync licenses
    - bonus_share: Growth-based bonus payments

  4. Business Logic
    - Membership pool: 45-50% of total membership revenue
    - Single sales: 75% to producer
    - Custom syncs: 90% to producer
    - Growth bonus: 2% if >15% growth and no direct sales
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
BEGIN
  -- Get total membership revenue for month
  SELECT COALESCE(SUM(amount), 0) INTO total_membership 
  FROM membership_revenue 
  WHERE month = month_input;

  -- Calculate membership growth rate
  SELECT (curr.amount - prev.amount)/NULLIF(prev.amount, 0)
    INTO membership_growth
  FROM membership_revenue curr
  JOIN membership_revenue prev ON prev.month = to_char(month_start - interval '1 month', 'YYYY-MM')
  WHERE curr.month = month_input;

  -- Adjust pool percentage if significant growth
  IF membership_growth > 0.15 THEN
    membership_pool_pct := 0.50;
  END IF;

  -- Count active licenses
  SELECT COUNT(*) INTO total_active_licenses 
  FROM active_licenses 
  WHERE month = month_input;

  SELECT COUNT(*) INTO producer_active_licenses 
  FROM active_licenses 
  WHERE month = month_input AND producer_id = producer_id_input;

  -- Calculate membership share
  IF total_active_licenses > 0 THEN
    membership_share := (total_membership * membership_pool_pct) * 
                       (producer_active_licenses::numeric / total_active_licenses);
  ELSE
    membership_share := 0;
  END IF;

  -- Calculate bonus for producers with no direct sales but active licenses
  IF producer_active_licenses > 0 THEN
    SELECT COUNT(*) INTO single_sales_share FROM licenses
    WHERE type = 'single' 
      AND producer_id = producer_id_input 
      AND created_at >= month_start 
      AND created_at < month_end;

    SELECT COUNT(*) INTO custom_sync_share FROM licenses
    WHERE type = 'custom' 
      AND producer_id = producer_id_input 
      AND created_at >= month_start 
      AND created_at < month_end;

    IF single_sales_share = 0 AND custom_sync_share = 0 THEN
      bonus_share := total_membership * 0.02 * 
                    (producer_active_licenses::numeric / total_active_licenses);
    ELSE
      bonus_share := 0;
    END IF;
  ELSE
    bonus_share := 0;
  END IF;

  -- Calculate single track sales revenue (75% to producer)
  SELECT COALESCE(SUM(price * 0.75), 0) INTO single_sales_share
  FROM licenses
  WHERE type = 'single'
    AND producer_id = producer_id_input
    AND created_at >= month_start 
    AND created_at < month_end;

  -- Calculate custom sync revenue (90% to producer)
  SELECT COALESCE(SUM(price * 0.90), 0) INTO custom_sync_share
  FROM licenses
  WHERE type = 'custom'
    AND producer_id = producer_id_input
    AND created_at >= month_start 
    AND created_at < month_end;

  -- Calculate total earnings
  total := membership_share + bonus_share + single_sales_share + custom_sync_share;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy for function access
CREATE POLICY "Producers can view own earnings" 
  ON FUNCTION calculate_producer_earnings(text, uuid) 
  TO authenticated 
  USING (auth.uid() = producer_id_input);

CREATE POLICY "Admins can view all earnings" 
  ON FUNCTION calculate_producer_earnings(text, uuid) 
  TO authenticated 
  USING (
    (auth.jwt() ->> 'email'::text) = ANY (
      ARRAY[
        'knockriobeats@gmail.com'::text, 
        'info@mybeatfi.io'::text, 
        'derykbanks@yahoo.com'::text
      ]
    )
  );
