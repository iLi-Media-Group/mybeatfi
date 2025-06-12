/*
  # Create Test Client Accounts

  1. Changes
    - Creates test client accounts with proper auth users
    - Ensures foreign key constraints are met
    - Sets up profiles for testing

  2. Details
    - Creates auth users first
    - Links profiles to auth users
    - Sets up 4 test client accounts
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to create auth user and profile
CREATE OR REPLACE FUNCTION create_test_client(
  email_address text,
  client_number integer
) RETURNS void AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    uuid_generate_v4(),
    'authenticated',
    'authenticated',
    email_address,
    -- Password hash for 'abc123'
    crypt('abc123', gen_salt('bf')),
    now(),
    now(),
    now(),
    encode(gen_random_bytes(32), 'hex'),
    encode(gen_random_bytes(32), 'hex')
  ) RETURNING id INTO new_user_id;

  -- Create profile
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    account_type,
    age_verified,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    email_address,
    'Test',
    'Client ' || client_number,
    'client',
    true,
    now(),
    now()
  );
END;
$$ LANGUAGE plpgsql;

-- Create test clients
DO $$
DECLARE
  email_list text[] := ARRAY[
    'cabstudiosrio@gmail.com',
    'knockriobeats2@gmail.com',
    'babyimmastarrecords@gmail.com',
    'brasillivinginfo@gmail.com'
  ];
BEGIN
  FOR i IN 1..array_length(email_list, 1) LOOP
    PERFORM create_test_client(email_list[i], i);
  END LOOP;
END;
$$;

-- Clean up
DROP FUNCTION create_test_client;
