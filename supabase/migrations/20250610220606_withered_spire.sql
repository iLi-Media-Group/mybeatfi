/*
  # Add USDC payout functionality
  
  1. New Functions
    - `get_producer_monthly_earnings` - Calculate a producer's earnings for a specific month
    - `generate_monthly_producer_payouts` - Generate payout records for all producers for a month
  
  2. Enhancements
    - Add payment_method field to producer_payouts table
    - Add paid_at timestamp to producer_payouts table
    - Add retry_count for tracking failed payment attempts
*/

-- Add new fields to producer_payouts table
ALTER TABLE producer_payouts 
ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('usdc_solana', 'usdc_polygon', 'bank_transfer'));

ALTER TABLE producer_payouts 
ADD COLUMN IF NOT EXISTS paid_at timestamptz;

ALTER TABLE producer_payouts 
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;

-- Create function to get producer monthly earnings
CREATE OR REPLACE FUNCTION get_producer_monthly_earnings(
  p_producer_id uuid,
  p_month text
)
RETURNS numeric AS $$
DECLARE
  v_start_date timestamptz;
  v_end_date timestamptz;
  v_earnings numeric := 0;
  v_standard_rate numeric;
  v_exclusive_rate numeric;
  v_sync_fee_rate numeric;
BEGIN
  -- Parse month (format: YYYY-MM)
  v_start_date := to_timestamp(p_month || '-01', 'YYYY-MM-DD');
  v_end_date := v_start_date + interval '1 month';
  
  -- Get compensation rates
  SELECT 
    standard_rate / 100, 
    exclusive_rate / 100, 
    sync_fee_rate / 100
  INTO 
    v_standard_rate, 
    v_exclusive_rate, 
    v_sync_fee_rate
  FROM compensation_settings 
  LIMIT 1;
  
  -- Default rates if not found
  IF v_standard_rate IS NULL THEN
    v_standard_rate := 0.7; -- 70%
    v_exclusive_rate := 0.8; -- 80%
    v_sync_fee_rate := 0.85; -- 85%
  END IF;
  
  -- Calculate earnings from sales
  SELECT COALESCE(SUM(
    CASE
      -- For sales
      WHEN t.type = 'sale' THEN t.amount * v_standard_rate
      -- For adjustments (already calculated with rate)
      WHEN t.type = 'adjustment' AND t.amount > 0 THEN t.amount
      -- Ignore withdrawals and negative adjustments
      ELSE 0
    END
  ), 0) INTO v_earnings
  FROM producer_transactions t
  WHERE t.producer_id = p_producer_id
  AND t.created_at >= v_start_date
  AND t.created_at < v_end_date
  AND t.status = 'completed';
  
  RETURN v_earnings;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate monthly payouts for all producers
CREATE OR REPLACE FUNCTION generate_monthly_producer_payouts(
  p_month text,
  p_force_regenerate boolean DEFAULT false
)
RETURNS TABLE (
  producer_id uuid,
  amount_usdc numeric,
  status text
) AS $$
DECLARE
  v_producer record;
  v_earnings numeric;
  v_payout_id uuid;
BEGIN
  -- Check if month format is valid
  IF p_month !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'Invalid month format. Use YYYY-MM';
  END IF;
  
  -- Delete existing payouts if force regenerate is true
  IF p_force_regenerate THEN
    DELETE FROM producer_payouts WHERE month = p_month;
  END IF;
  
  -- Loop through all producers
  FOR v_producer IN 
    SELECT id, usdc_address FROM profiles WHERE account_type = 'producer'
  LOOP
    -- Calculate earnings
    v_earnings := get_producer_monthly_earnings(v_producer.id, p_month);
    
    -- Determine status
    IF v_earnings <= 0 OR v_producer.usdc_address IS NULL THEN
      -- Skip if no earnings or no USDC address
      INSERT INTO producer_payouts (
        producer_id, 
        amount_usdc, 
        month, 
        status
      ) VALUES (
        v_producer.id,
        v_earnings,
        p_month,
        'skipped'
      ) RETURNING id INTO v_payout_id;
      
      producer_id := v_producer.id;
      amount_usdc := v_earnings;
      status := 'skipped';
      RETURN NEXT;
    ELSE
      -- Create pending payout
      INSERT INTO producer_payouts (
        producer_id, 
        amount_usdc, 
        month, 
        status,
        payment_method
      ) VALUES (
        v_producer.id,
        v_earnings,
        p_month,
        'pending',
        'usdc_solana'
      ) RETURNING id INTO v_payout_id;
      
      producer_id := v_producer.id;
      amount_usdc := v_earnings;
      status := 'pending';
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;
