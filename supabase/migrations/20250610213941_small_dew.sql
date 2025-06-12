/*
  # Add IPI number and PRO fields to profiles
  
  1. Changes
    - Ensures the trigger for handling sync proposal payments exists
    - Adds IPI number field to profiles table
    - Adds performing rights organization field to profiles table
*/

-- Ensure trigger exists
DROP TRIGGER IF EXISTS handle_sync_proposal_payment_trigger ON stripe_orders;

CREATE TRIGGER handle_sync_proposal_payment_trigger
AFTER INSERT OR UPDATE ON stripe_orders
FOR EACH ROW
EXECUTE FUNCTION handle_sync_proposal_payment();

-- Add IPI number and PRO fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ipi_number text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS performing_rights_org text;
