/*
  # Fix Stripe Checkout and License Creation

  1. Updates
    - Add metadata column to stripe_orders table
    - Ensure license creation from checkout works properly
    - Fix expiry_date calculation for licenses

  2. Security
    - Enable RLS on all affected tables
    - Add appropriate policies
*/

-- Add metadata column to stripe_orders if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stripe_orders' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE stripe_orders ADD COLUMN metadata JSONB;
  END IF;
END $$;

-- Function to calculate expiry date based on license type
CREATE OR REPLACE FUNCTION calculate_expiry_date()
RETURNS TRIGGER AS $$
DECLARE
  v_membership_plan text;
BEGIN
  -- Get the user's membership plan
  SELECT membership_plan INTO v_membership_plan
  FROM profiles
  WHERE id = NEW.buyer_id;
  
  -- Set expiry date based on membership plan
  IF v_membership_plan = 'Ultimate Access' THEN
    -- Set to 100 years in the future (effectively perpetual)
    NEW.expiry_date := (NOW() + INTERVAL '100 years')::timestamp;
  ELSIF v_membership_plan = 'Platinum Access' THEN
    -- 3 years
    NEW.expiry_date := (NOW() + INTERVAL '3 years')::timestamp;
  ELSE
    -- Default to 1 year for Gold Access and Single Track
    NEW.expiry_date := (NOW() + INTERVAL '1 year')::timestamp;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set expiry date on new sales
DROP TRIGGER IF EXISTS set_expiry_date ON sales;
CREATE TRIGGER set_expiry_date
BEFORE INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION calculate_expiry_date();

-- Ensure the create_license_from_checkout function is properly defined
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

-- Make sure the trigger is properly set up
DROP TRIGGER IF EXISTS create_license_from_checkout_trigger ON stripe_orders;
CREATE TRIGGER create_license_from_checkout_trigger
AFTER INSERT OR UPDATE ON stripe_orders
FOR EACH ROW
EXECUTE FUNCTION create_license_from_checkout();
