-- First check if profiles table exists and create it if needed
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    CREATE TABLE profiles (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      first_name TEXT,
      last_name TEXT,
      account_type TEXT CHECK (account_type IN ('client', 'producer', 'admin')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  END IF;
END $$;

-- Create the compensation_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS compensation_settings (
  id BIGINT PRIMARY KEY,
  standard_rate INTEGER NOT NULL DEFAULT 70,
  exclusive_rate INTEGER NOT NULL DEFAULT 80,
  sync_fee_rate INTEGER NOT NULL DEFAULT 85,
  holding_period INTEGER NOT NULL DEFAULT 30,
  minimum_withdrawal NUMERIC NOT NULL DEFAULT 50,
  processing_fee NUMERIC NOT NULL DEFAULT 2,
  no_sales_bucket_rate INTEGER NOT NULL DEFAULT 2,
  growth_bonus_rate INTEGER NOT NULL DEFAULT 5,
  no_sale_bonus_rate INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default values if not exists
INSERT INTO compensation_settings (id, standard_rate, exclusive_rate, sync_fee_rate, holding_period, minimum_withdrawal, processing_fee, no_sales_bucket_rate, growth_bonus_rate, no_sale_bonus_rate)
VALUES (1, 75, 80, 90, 30, 50, 2, 2, 5, 3)
ON CONFLICT (id) DO UPDATE
SET 
  standard_rate = 75,  -- Updated to 75% (from 70%)
  sync_fee_rate = 90,  -- Updated to 90% (from 85%)
  no_sales_bucket_rate = 2,
  growth_bonus_rate = 5,
  no_sale_bonus_rate = 3;

-- Create producer_balances table if it doesn't exist
CREATE TABLE IF NOT EXISTS producer_balances (
  producer_id UUID PRIMARY KEY REFERENCES profiles(id),
  available_balance NUMERIC NOT NULL DEFAULT 0,
  pending_balance NUMERIC NOT NULL DEFAULT 0,
  lifetime_earnings NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT positive_available_balance CHECK (available_balance >= 0),
  CONSTRAINT positive_pending_balance CHECK (pending_balance >= 0),
  CONSTRAINT positive_lifetime_earnings CHECK (lifetime_earnings >= 0)
);

-- Create producer_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS producer_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES profiles(id),
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sale', 'withdrawal', 'adjustment')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'rejected')),
  description TEXT NOT NULL,
  track_title TEXT,
  reference_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Check if tracks table exists before creating functions that reference it
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tracks') THEN
    -- Create the function outside the DO block
    EXECUTE $FUNC$
    CREATE OR REPLACE FUNCTION calculate_producer_earnings()
    RETURNS TRIGGER AS $BODY$
    DECLARE
      producer_id UUID;
      earnings NUMERIC;
      rate NUMERIC;
      settings RECORD;
    BEGIN
      -- Get compensation settings
      SELECT * INTO settings FROM compensation_settings WHERE id = 1;
      
      -- Get producer ID from track with explicit table alias
      SELECT t.producer_id INTO producer_id 
      FROM tracks t 
      WHERE t.id = NEW.track_id;
      
      -- Determine rate based on license type
      IF NEW.license_type = 'exclusive' THEN
        rate := settings.exclusive_rate / 100.0;
      ELSE
        rate := settings.standard_rate / 100.0;
      END IF;
      
      -- Calculate earnings
      earnings := NEW.amount * rate;
      
      -- Update producer balance with explicit column references
      INSERT INTO producer_balances (producer_id, available_balance, pending_balance, lifetime_earnings)
      VALUES (producer_id, 0, earnings, earnings)
      ON CONFLICT (producer_id) DO UPDATE
      SET 
        pending_balance = producer_balances.pending_balance + EXCLUDED.pending_balance,
        lifetime_earnings = producer_balances.lifetime_earnings + EXCLUDED.lifetime_earnings,
        updated_at = now();
      
      -- Create transaction record with explicit references to function variables
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
    $BODY$ LANGUAGE plpgsql;
    $FUNC$;

    -- Create the second function
    EXECUTE $FUNC$
    CREATE OR REPLACE FUNCTION distribute_membership_revenue(
      membership_revenue NUMERIC,
      month_date DATE
    )
    RETURNS VOID AS $BODY$
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
      FROM profiles p
      WHERE p.account_type = 'producer';
      
      -- Calculate active producers (those with sales in the last month)
      SELECT 
        COUNT(DISTINCT pt.producer_id) INTO active_producers 
      FROM producer_transactions pt
      WHERE 
        pt.type = 'sale' 
        AND pt.created_at >= date_trunc('month', month_date)
        AND pt.created_at < date_trunc('month', month_date) + interval '1 month';
      
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
          producer_share := (producer_record.monthly_sales / (
            SELECT SUM(pt.amount) 
            FROM producer_transactions pt 
            WHERE pt.type = 'sale' 
            AND pt.created_at >= date_trunc('month', month_date) 
            AND pt.created_at < date_trunc('month', month_date) + interval '1 month'
          )) * (producer_bucket_total - no_sales_bucket);
          
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
        
        -- Update producer balance with explicit references
        UPDATE producer_balances pb
        SET 
          available_balance = pb.available_balance + producer_share,
          lifetime_earnings = pb.lifetime_earnings + producer_share,
          updated_at = now()
        WHERE pb.producer_id = producer_record.producer_id;
        
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
    $BODY$ LANGUAGE plpgsql;
    $FUNC$;
  END IF;
END $$;
