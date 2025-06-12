-- Add new columns to compensation_settings table
ALTER TABLE compensation_settings 
ADD COLUMN IF NOT EXISTS no_sales_bucket_rate INTEGER NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS growth_bonus_rate INTEGER NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS no_sale_bonus_rate INTEGER NOT NULL DEFAULT 3;

-- Update default values for standard_rate and sync_fee_rate
UPDATE compensation_settings
SET 
  standard_rate = 75,  -- Updated to 75% (from 70%)
  sync_fee_rate = 90,  -- Updated to 90% (from 85%)
  no_sales_bucket_rate = 2,
  growth_bonus_rate = 5,
  no_sale_bonus_rate = 3
WHERE id = 1;

-- Modify the calculate_producer_earnings function to use the new rates
CREATE OR REPLACE FUNCTION calculate_producer_earnings()
RETURNS TRIGGER AS $$
DECLARE
  producer_id UUID;
  earnings NUMERIC;
  rate NUMERIC;
  settings RECORD;
BEGIN
  -- Get compensation settings
  SELECT * INTO settings FROM compensation_settings WHERE id = 1;
  
  -- Get producer ID from track
  SELECT producer_id INTO producer_id FROM tracks WHERE id = NEW.track_id;
  
  -- Determine rate based on license type
  IF NEW.license_type = 'exclusive' THEN
    rate := settings.exclusive_rate / 100.0;
  ELSE
    rate := settings.standard_rate / 100.0;
  END IF;
  
  -- Calculate earnings
  earnings := NEW.amount * rate;
  
  -- Update producer balance
  INSERT INTO producer_balances (producer_id, available_balance, pending_balance, lifetime_earnings)
  VALUES (producer_id, 0, earnings, earnings)
  ON CONFLICT (producer_id) DO UPDATE
  SET 
    pending_balance = producer_balances.pending_balance + earnings,
    lifetime_earnings = producer_balances.lifetime_earnings + earnings,
    updated_at = now();
  
  -- Create transaction record
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
    producer_id,
    earnings,
    'sale',
    'pending',
    'Sale: ' || t.title,
    t.title,
    NEW.id
  FROM tracks t
  WHERE t.id = NEW.track_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to distribute membership revenue
CREATE OR REPLACE FUNCTION distribute_membership_revenue(
  membership_revenue NUMERIC,
  month_date DATE
)
RETURNS VOID AS $$
DECLARE
  settings RECORD;
  total_producers INTEGER;
  active_producers INTEGER;
  inactive_producers INTEGER;
  no_sales_bucket NUMERIC;
  producer_record RECORD;
  producer_share NUMERIC;
  growth_bonus NUMERIC;
  no_sale_bonus NUMERIC;
  producer_bucket_total NUMERIC;
BEGIN
  -- Get compensation settings
  SELECT * INTO settings FROM compensation_settings WHERE id = 1;
  
  -- Calculate the producer bucket (45% of total membership revenue)
  producer_bucket_total := membership_revenue * 0.45;
  
  -- Calculate the number of producers
  SELECT 
    COUNT(*) INTO total_producers 
  FROM profiles 
  WHERE account_type = 'producer';
  
  -- Calculate active producers (those with sales in the last month)
  SELECT 
    COUNT(DISTINCT producer_id) INTO active_producers 
  FROM producer_transactions 
  WHERE 
    type = 'sale' 
    AND created_at >= date_trunc('month', month_date)
    AND created_at < date_trunc('month', month_date) + interval '1 month';
  
  -- Calculate inactive producers
  inactive_producers := total_producers - active_producers;
  
  -- Calculate no sales bucket (2% of producer bucket)
  no_sales_bucket := producer_bucket_total * (settings.no_sales_bucket_rate / 100.0);
  
  -- Distribute to active producers based on their sales performance
  FOR producer_record IN 
    SELECT 
      p.id AS producer_id,
      COALESCE(SUM(t.amount), 0) AS monthly_sales,
      (
        SELECT COALESCE(SUM(t_prev.amount), 0)
        FROM producer_transactions t_prev
        WHERE 
          t_prev.producer_id = p.id
          AND t_prev.type = 'sale'
          AND t_prev.created_at >= date_trunc('month', month_date) - interval '1 month'
          AND t_prev.created_at < date_trunc('month', month_date)
      ) AS previous_month_sales
    FROM 
      profiles p
      LEFT JOIN producer_transactions t ON p.id = t.producer_id AND t.type = 'sale'
        AND t.created_at >= date_trunc('month', month_date)
        AND t.created_at < date_trunc('month', month_date) + interval '1 month'
    WHERE 
      p.account_type = 'producer'
    GROUP BY p.id
  LOOP
    -- Calculate base share for this producer
    IF producer_record.monthly_sales > 0 THEN
      -- Active producer - gets share based on sales performance
      producer_share := (producer_record.monthly_sales / (SELECT SUM(amount) FROM producer_transactions WHERE type = 'sale' AND created_at >= date_trunc('month', month_date) AND created_at < date_trunc('month', month_date) + interval '1 month')) * (producer_bucket_total - no_sales_bucket);
      
      -- Check for growth bonus
      IF producer_record.monthly_sales > producer_record.previous_month_sales THEN
        growth_bonus := producer_share * (settings.growth_bonus_rate / 100.0);
        producer_share := producer_share + growth_bonus;
      END IF;
    ELSE
      -- Inactive producer - gets share from no sales bucket only if they have zero sales
      producer_share := no_sales_bucket / NULLIF(inactive_producers, 0);
      
      -- Add no sale bonus
      no_sale_bonus := producer_share * (settings.no_sale_bonus_rate / 100.0);
      producer_share := producer_share + no_sale_bonus;
    END IF;
    
    -- Update producer balance
    UPDATE producer_balances
    SET 
      available_balance = available_balance + producer_share,
      lifetime_earnings = lifetime_earnings + producer_share,
      updated_at = now()
    WHERE producer_id = producer_record.producer_id;
    
    -- Create transaction record
    INSERT INTO producer_transactions (
      producer_id,
      amount,
      type,
      status,
      description
    ) VALUES (
      producer_record.producer_id,
      producer_share,
      'sale',
      'completed',
      'Membership Revenue Share: ' || to_char(month_date, 'Month YYYY')
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;
