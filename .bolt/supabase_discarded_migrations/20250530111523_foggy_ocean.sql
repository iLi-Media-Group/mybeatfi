-- Add company_name to profiles
ALTER TABLE public.profiles 
ADD COLUMN company_name text;

-- Add producer_number to profiles
ALTER TABLE public.profiles 
ADD COLUMN producer_number text;

-- Create sequence for producer numbers
CREATE SEQUENCE IF NOT EXISTS producer_number_seq START 1;

-- Function to generate producer number
CREATE OR REPLACE FUNCTION generate_producer_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_number integer;
BEGIN
  -- Get next number from sequence
  SELECT nextval('producer_number_seq') INTO next_number;
  -- Format as mbfpr-XXX where XXX is padded with zeros
  RETURN 'mbfpr-' || LPAD(next_number::text, 3, '0');
END;
$$;

-- Set initial producer number for Knockriobeats
UPDATE public.profiles 
SET producer_number = 'mbfpr-001',
    company_name = 'MyBeatFi - iLi Media Group'
WHERE email = 'knockriobeats@gmail.com';

-- Trigger to auto-assign producer number
CREATE OR REPLACE FUNCTION assign_producer_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.account_type = 'producer' AND NEW.producer_number IS NULL THEN
    NEW.producer_number = generate_producer_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_producer_number_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION assign_producer_number();
