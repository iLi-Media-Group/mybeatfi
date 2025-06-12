/*
  # Add sync proposal client workflow

  1. New Columns
    - Add client_status, payment_status, invoice_id, and payment_date to sync_proposals table
    - Add constraints for new columns

  2. Functions
    - Create function to handle sync proposal payments
    - Update RLS policies for sync_proposals
*/

-- Add new columns to sync_proposals table if they don't exist
DO $$
BEGIN
  -- Add client_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_proposals' AND column_name = 'client_status'
  ) THEN
    ALTER TABLE sync_proposals ADD COLUMN client_status text DEFAULT 'pending';
    
    -- Add constraint for client_status
    ALTER TABLE sync_proposals ADD CONSTRAINT sync_proposals_client_status_check 
      CHECK (client_status = ANY (ARRAY['pending', 'accepted', 'rejected']));
  END IF;

  -- Add payment_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_proposals' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE sync_proposals ADD COLUMN payment_status text DEFAULT 'pending';
    
    -- Add constraint for payment_status
    ALTER TABLE sync_proposals ADD CONSTRAINT sync_proposals_payment_status_check 
      CHECK (payment_status = ANY (ARRAY['pending', 'paid', 'failed']));
  END IF;

  -- Add invoice_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_proposals' AND column_name = 'invoice_id'
  ) THEN
    ALTER TABLE sync_proposals ADD COLUMN invoice_id text;
  END IF;

  -- Add payment_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_proposals' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE sync_proposals ADD COLUMN payment_date timestamp with time zone;
  END IF;
END $$;

-- Create function to handle sync proposal payments
CREATE OR REPLACE FUNCTION handle_sync_proposal_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_proposal_id uuid;
  v_producer_id uuid;
  v_client_id uuid;
  v_track_id uuid;
  v_sync_fee numeric;
  v_compensation_settings record;
  v_producer_rate numeric;
  v_producer_amount numeric;
BEGIN
  -- Only process completed payments with proposal_id in metadata
  IF NEW.payment_status != 'paid' OR NEW.status != 'completed' OR 
     NEW.metadata IS NULL OR NEW.metadata->>'proposal_id' IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get proposal ID from metadata
  v_proposal_id := (NEW.metadata->>'proposal_id')::uuid;
  
  -- Get proposal details
  SELECT 
    track_id, 
    client_id, 
    sync_fee,
    tracks.producer_id
  INTO 
    v_track_id, 
    v_client_id, 
    v_sync_fee,
    v_producer_id
  FROM 
    sync_proposals
  JOIN
    tracks ON sync_proposals.track_id = tracks.id
  WHERE 
    sync_proposals.id = v_proposal_id;
  
  -- Update proposal payment status
  UPDATE sync_proposals
  SET 
    payment_status = 'paid',
    payment_date = NOW(),
    invoice_id = NEW.payment_intent_id
  WHERE 
    id = v_proposal_id;
  
  -- Get compensation settings
  SELECT * INTO v_compensation_settings FROM compensation_settings LIMIT 1;
  
  -- Default settings if none exist
  IF v_compensation_settings IS NULL THEN
    v_compensation_settings := ROW(1, 70, 80, 85, 30, 50, 2, now(), now(), 2, 5, 3)::compensation_settings;
  END IF;
  
  -- Use sync fee rate for producer compensation
  v_producer_rate := v_compensation_settings.sync_fee_rate / 100.0;
  
  -- Calculate producer amount
  v_producer_amount := v_sync_fee * v_producer_rate;
  
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
    'Sync Fee: ' || t.title,
    t.title,
    v_proposal_id::text
  FROM tracks t
  WHERE t.id = v_track_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to handle sync proposal payments
DROP TRIGGER IF EXISTS handle_sync_proposal_payment_trigger ON stripe_orders;
CREATE TRIGGER handle_sync_proposal_payment_trigger
AFTER INSERT OR UPDATE ON stripe_orders
FOR EACH ROW
EXECUTE FUNCTION handle_sync_proposal_payment();

-- Update RLS policies for sync_proposals if needed
-- First, check if the policy exists
DO $$
BEGIN
  -- Update client view policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sync_proposals' AND policyname = 'Clients can view their own proposals'
  ) THEN
    DROP POLICY "Clients can view their own proposals" ON sync_proposals;
    
    CREATE POLICY "Clients can view their own proposals" 
    ON sync_proposals 
    FOR SELECT 
    TO public 
    USING (uid() = client_id);
  END IF;
  
  -- Update client update policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sync_proposals' AND policyname = 'Clients can update their own proposals'
  ) THEN
    DROP POLICY "Clients can update their own proposals" ON sync_proposals;
    
    CREATE POLICY "Clients can update their own proposals" 
    ON sync_proposals 
    FOR UPDATE 
    TO public 
    USING (uid() = client_id)
    WITH CHECK (
      (uid() = client_id) AND 
      (
        (status = 'pending') OR 
        (status = 'accepted' AND client_status IN ('pending', 'accepted', 'rejected'))
      )
    );
  ELSE
    -- Create client update policy if it doesn't exist
    CREATE POLICY "Clients can update their own proposals" 
    ON sync_proposals 
    FOR UPDATE 
    TO public 
    USING (uid() = client_id)
    WITH CHECK (
      (uid() = client_id) AND 
      (
        (status = 'pending') OR 
        (status = 'accepted' AND client_status IN ('pending', 'accepted', 'rejected'))
      )
    );
  END IF;
END $$;
