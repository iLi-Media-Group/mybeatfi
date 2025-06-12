-- Create compensation_settings table
CREATE TABLE IF NOT EXISTS compensation_settings (
  id BIGINT PRIMARY KEY,
  standard_rate INTEGER NOT NULL DEFAULT 70,
  exclusive_rate INTEGER NOT NULL DEFAULT 80,
  sync_fee_rate INTEGER NOT NULL DEFAULT 85,
  holding_period INTEGER NOT NULL DEFAULT 30,
  minimum_withdrawal NUMERIC NOT NULL DEFAULT 50,
  processing_fee NUMERIC NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  no_sales_bucket_rate INTEGER NOT NULL DEFAULT 2,
  growth_bonus_rate INTEGER NOT NULL DEFAULT 5,
  no_sale_bonus_rate INTEGER NOT NULL DEFAULT 3
);

-- Insert default settings
INSERT INTO compensation_settings (id, standard_rate, exclusive_rate, sync_fee_rate, holding_period, minimum_withdrawal, processing_fee, no_sales_bucket_rate, growth_bonus_rate, no_sale_bonus_rate)
VALUES (1, 70, 80, 85, 30, 50, 2, 2, 5, 3)
ON CONFLICT (id) DO NOTHING;

-- Create producer_balances table
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

-- Create producer_payment_methods table
CREATE TABLE IF NOT EXISTS producer_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES profiles(id),
  account_type TEXT NOT NULL CHECK (account_type IN ('bank', 'paypal', 'crypto')),
  account_details JSONB NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create producer_transactions table
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

-- Create producer_withdrawals table
CREATE TABLE IF NOT EXISTS producer_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES profiles(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method_id UUID NOT NULL REFERENCES producer_payment_methods(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create function to calculate producer earnings
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

-- Create trigger for new sales
DROP TRIGGER IF EXISTS calculate_producer_earnings_trigger ON sales;
CREATE TRIGGER calculate_producer_earnings_trigger
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION calculate_producer_earnings();

-- Create function to release pending funds
CREATE OR REPLACE FUNCTION release_pending_funds()
RETURNS VOID AS $$
DECLARE
  settings RECORD;
  producer RECORD;
BEGIN
  -- Get compensation settings
  SELECT * INTO settings FROM compensation_settings WHERE id = 1;
  
  -- Find all producers with pending balances
  FOR producer IN
    SELECT producer_id, pending_balance
    FROM producer_balances
    WHERE pending_balance > 0
  LOOP
    -- Find transactions that have passed the holding period
    UPDATE producer_transactions
    SET status = 'completed'
    WHERE producer_id = producer.producer_id
      AND status = 'pending'
      AND type = 'sale'
      AND created_at < (now() - (settings.holding_period || ' days')::interval);
    
    -- Calculate total amount to release
    WITH released_transactions AS (
      SELECT SUM(amount) as released_amount
      FROM producer_transactions
      WHERE producer_id = producer.producer_id
        AND status = 'completed'
        AND type = 'sale'
        AND created_at > (now() - '1 day'::interval)
    )
    UPDATE producer_balances
    SET 
      available_balance = available_balance + COALESCE((SELECT released_amount FROM released_transactions), 0),
      pending_balance = pending_balance - COALESCE((SELECT released_amount FROM released_transactions), 0),
      updated_at = now()
    WHERE producer_id = producer.producer_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on tables if not already enabled
ALTER TABLE producer_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE producer_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE producer_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE producer_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors
DO $$
BEGIN
    -- producer_balances policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'producer_balances' AND policyname = 'Producers can view their own balances') THEN
        DROP POLICY "Producers can view their own balances" ON producer_balances;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'producer_balances' AND policyname = 'Admin users can view all balances') THEN
        DROP POLICY "Admin users can view all balances" ON producer_balances;
    END IF;
    
    -- producer_payment_methods policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'producer_payment_methods' AND policyname = 'Producers can manage their own payment methods') THEN
        DROP POLICY "Producers can manage their own payment methods" ON producer_payment_methods;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'producer_payment_methods' AND policyname = 'Admin users can view all payment methods') THEN
        DROP POLICY "Admin users can view all payment methods" ON producer_payment_methods;
    END IF;
    
    -- producer_transactions policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'producer_transactions' AND policyname = 'Producers can view their own transactions') THEN
        DROP POLICY "Producers can view their own transactions" ON producer_transactions;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'producer_transactions' AND policyname = 'Admin users can manage all transactions') THEN
        DROP POLICY "Admin users can manage all transactions" ON producer_transactions;
    END IF;
    
    -- producer_withdrawals policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'producer_withdrawals' AND policyname = 'Producers can view and create their own withdrawals') THEN
        DROP POLICY "Producers can view and create their own withdrawals" ON producer_withdrawals;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'producer_withdrawals' AND policyname = 'Producers can create withdrawal requests') THEN
        DROP POLICY "Producers can create withdrawal requests" ON producer_withdrawals;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'producer_withdrawals' AND policyname = 'Admin users can manage all withdrawals') THEN
        DROP POLICY "Admin users can manage all withdrawals" ON producer_withdrawals;
    END IF;
    
    -- compensation_settings policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compensation_settings' AND policyname = 'Everyone can view compensation settings') THEN
        DROP POLICY "Everyone can view compensation settings" ON compensation_settings;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'compensation_settings' AND policyname = 'Admin users can manage compensation settings') THEN
        DROP POLICY "Admin users can manage compensation settings" ON compensation_settings;
    END IF;
END
$$;

-- Create policies for producer_balances
CREATE POLICY "Producers can view their own balances"
ON producer_balances
FOR SELECT
TO public
USING (auth.uid() = producer_id);

CREATE POLICY "Admin users can view all balances"
ON producer_balances
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text]));

-- Create policies for producer_payment_methods
CREATE POLICY "Producers can manage their own payment methods"
ON producer_payment_methods
FOR ALL
TO public
USING (auth.uid() = producer_id);

CREATE POLICY "Admin users can view all payment methods"
ON producer_payment_methods
FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text]));

-- Create policies for producer_transactions
CREATE POLICY "Producers can view their own transactions"
ON producer_transactions
FOR SELECT
TO public
USING (auth.uid() = producer_id);

CREATE POLICY "Admin users can manage all transactions"
ON producer_transactions
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text]));

-- Create policies for producer_withdrawals
CREATE POLICY "Producers can view and create their own withdrawals"
ON producer_withdrawals
FOR SELECT
TO public
USING (auth.uid() = producer_id);

CREATE POLICY "Producers can create withdrawal requests"
ON producer_withdrawals
FOR INSERT
TO public
WITH CHECK (auth.uid() = producer_id);

CREATE POLICY "Admin users can manage all withdrawals"
ON producer_withdrawals
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text]));

-- Create policies for compensation_settings
CREATE POLICY "Everyone can view compensation settings"
ON compensation_settings
FOR SELECT
TO public
USING (true);

CREATE POLICY "Admin users can manage compensation settings"
ON compensation_settings
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text]));
