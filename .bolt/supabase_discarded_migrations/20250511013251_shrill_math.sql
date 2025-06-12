/*
  # Producer Invitations System

  1. New Tables
    - `producer_invitations`
      - Manages producer invitation codes
      - Tracks invitation status and expiration
      - Links to admin users

  2. Security
    - Enable RLS
    - Admin-only access policies
    
  3. Functions
    - Validation and usage of invitation codes
*/

-- Create producer invitations table
CREATE TABLE IF NOT EXISTS producer_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invitation_code text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  used boolean DEFAULT false,
  used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES admin_users(id)
);

-- Enable RLS
ALTER TABLE producer_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_producer_invitations_email;
DROP INDEX IF EXISTS idx_producer_invitations_code;
DROP INDEX IF EXISTS idx_producer_invitations_used;

-- Create indexes
CREATE INDEX idx_producer_invitations_email ON producer_invitations(email);
CREATE INDEX idx_producer_invitations_code ON producer_invitations(invitation_code);
CREATE INDEX idx_producer_invitations_used ON producer_invitations(used) WHERE NOT used;

-- Create admin policies
CREATE POLICY "Only admins can manage producer invitations"
  ON producer_invitations
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'knockriobeats@gmail.com',
      'info@mybeatfi.io',
      'derykbanks@yahoo.com'
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') IN (
      'knockriobeats@gmail.com',
      'info@mybeatfi.io',
      'derykbanks@yahoo.com'
    )
  );

CREATE POLICY "Admins can manage producer invitations"
  ON producer_invitations
  FOR ALL
  TO public
  USING (
    (auth.jwt() ->> 'email') IN (
      'knockriobeats@gmail.com',
      'info@mybeatfi.io',
      'derykbanks@yahoo.com'
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') IN (
      'knockriobeats@gmail.com',
      'info@mybeatfi.io',
      'derykbanks@yahoo.com'
    )
  );

-- Create function to validate producer invitation
CREATE OR REPLACE FUNCTION validate_producer_invitation(code text, email_address text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM producer_invitations
    WHERE invitation_code = code
    AND email = email_address
    AND NOT used
    AND expires_at > now()
  );
END;
$$;

-- Create function to use producer invitation
CREATE OR REPLACE FUNCTION use_producer_invitation(code text, email_address text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE producer_invitations
  SET used = true,
      used_at = now()
  WHERE invitation_code = code
    AND email = email_address
    AND NOT used
    AND expires_at > now();
END;
$$;
