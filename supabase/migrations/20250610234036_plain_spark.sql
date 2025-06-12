/*
  # Add IPI number and PRO fields to profiles table
  
  1. Changes
     - Add ipi_number column to profiles table
     - Add performing_rights_org column to profiles table
     - Ensure handle_sync_proposal_payment_trigger exists
*/

-- Add IPI number and PRO fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ipi_number text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS performing_rights_org text;

-- Create trigger for sync proposal payment handling
-- Using DO block to check if trigger exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'handle_sync_proposal_payment_trigger'
  ) THEN
    CREATE TRIGGER handle_sync_proposal_payment_trigger
    AFTER INSERT OR UPDATE ON stripe_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_sync_proposal_payment();
  END IF;
END
$$;
