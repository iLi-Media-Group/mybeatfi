/*
  # Fix Stripe Payment Workflow

  1. New Functions
    - `create_license_from_checkout` - Creates a license record when a checkout session is completed
    - `calculate_producer_earnings` - Updates producer earnings when a sale is made

  2. Triggers
    - Add trigger to handle completed checkout sessions
    - Ensure producer earnings are calculated correctly

  This migration ensures that when a Stripe payment is completed:
  1. A license record is created in the sales table
  2. The producer receives the appropriate earnings
  3. Sales data is properly recorded for reporting
*/

-- Function to create a license record from a completed checkout session
CREATE OR REPLACE FUNCTION create_license_from_checkout()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_track_id uuid;
  v_producer_id uuid;
  v_profile_data json;
BEGIN
  -- Only process completed payments
  IF NEW.payment_status != 'paid' OR NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Get the user_id for this customer
  SELECT user_id INTO v_user_id
  FROM stripe_customers
  WHERE customer_id = NEW.customer_id;

  -- Check if we have track_id in metadata (for single track purchases)
  IF NEW.metadata IS NOT NULL AND NEW.metadata->>'track_id' IS NOT NULL THEN
    -- Get track_id and producer_id
    v_track_id := (NEW.metadata->>'track_id')::uuid;
    
    -- Get producer_id for this track
    SELECT producer_id INTO v_producer_id
    FROM tracks
    WHERE id = v_track_id;
    
    -- Get user profile data for licensee info
    SELECT 
      json_build_object(
        'name', COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''),
        'email', email
      ) INTO v_profile_data
    FROM profiles
    WHERE id = v_user_id;
    
    -- Create license record if it doesn't already exist
    INSERT INTO sales (
      track_id,
      producer_id,
      buyer_id,
      license_type,
      amount,
      payment_method,
      transaction_id,
      licensee_info
    )
    SELECT
      v_track_id,
      v_producer_id,
      v_user_id,
      'Single Track',
      NEW.amount_total / 100, -- Convert from cents to dollars
      'stripe',
      NEW.payment_intent_id,
      v_profile_data
    WHERE NOT EXISTS (
      -- Check if this transaction already has a license record
      SELECT 1 FROM sales 
      WHERE transaction_id = NEW.payment_intent_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to create license records from completed checkout sessions
DROP TRIGGER IF EXISTS create_license_from_checkout_trigger ON stripe_orders;
CREATE TRIGGER create_license_from_checkout_trigger
AFTER INSERT OR UPDATE ON stripe_orders
FOR EACH ROW
EXECUTE FUNCTION create_license_from_checkout();

-- Ensure the calculate_producer_earnings function exists and works correctly
CREATE OR REPLACE FUNCTION calculate_producer_earnings()
RETURNS TRIGGER AS $$
DECLARE
  v_compensation_settings record;
  v_producer_rate numeric;
  v_producer_amount numeric;
  v_producer_id uuid;
BEGIN
  -- Get compensation settings
  SELECT * INTO v_compensation_settings FROM compensation_settings LIMIT 1;
  
  -- Default settings if none exist
  IF v_compensation_settings IS NULL THEN
    v_compensation_settings := ROW(1, 70, 80, 85, 30, 50, 2, now(), now(), 2, 5, 3)::compensation_settings;
  END IF;
  
  -- Get producer ID if not already set
  IF NEW.producer_id IS NULL THEN
    SELECT producer_id INTO v_producer_id
    FROM tracks
    WHERE id = NEW.track_id;
  ELSE
    v_producer_id := NEW.producer_id;
  END IF;
  
  -- Determine producer rate based on license type
  IF NEW.license_type ILIKE '%exclusive%' THEN
    v_producer_rate := v_compensation_settings.exclusive_rate / 100.0;
  ELSE
    v_producer_rate := v_compensation_settings.standard_rate / 100.0;
  END IF;
  
  -- Calculate producer amount
  v_producer_amount := NEW.amount * v_producer_rate;
  
  -- Update producer balance
  INSERT INTO producer_balances (
    producer_id, 
    pending_balance, 
    available_balance, 
    lifetime_earnings
  )
  VALUES (
    v_producer_id, 
    v_producer_amount, 
    0, 
    v_producer_amount
  )
  ON CONFLICT (producer_id) DO UPDATE
  SET 
    pending_balance = producer_balances.pending_balance + v_producer_amount,
    lifetime_earnings = producer_balances.lifetime_earnings + v_producer_amount;
  
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
    v_producer_id,
    v_producer_amount,
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

-- Make sure the trigger is properly set up
DROP TRIGGER IF EXISTS calculate_producer_earnings_trigger ON sales;
CREATE TRIGGER calculate_producer_earnings_trigger
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION calculate_producer_earnings();

-- Ensure the set_producer_id function exists
CREATE OR REPLACE FUNCTION set_producer_id_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.producer_id IS NULL THEN
    SELECT producer_id INTO NEW.producer_id
    FROM tracks
    WHERE id = NEW.track_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Make sure the trigger is properly set up
DROP TRIGGER IF EXISTS set_producer_id_trigger ON sales;
CREATE TRIGGER set_producer_id_trigger
BEFORE INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION set_producer_id_on_sale();
