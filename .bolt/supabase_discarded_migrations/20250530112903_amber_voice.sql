-- Add phone and address fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN phone_number text,
ADD COLUMN street_address text,
ADD COLUMN city text,
ADD COLUMN state text,
ADD COLUMN postal_code text,
ADD COLUMN country text;

-- Create RLS policy to protect sensitive info
CREATE POLICY "Users can view their own sensitive info"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN ('knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com')
  )
);
