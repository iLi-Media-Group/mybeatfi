/*
  # Add Missing Tables for Site Settings and Clients
  
  1. New Tables
    - `site_settings`: Stores site-wide configuration values
    - `clients`: Stores client showcase information
  
  2. Security
    - Enable RLS on both tables
    - Add policies for public read access
    - Add policies for admin management
*/

-- Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'site_settings' 
    AND policyname = 'Everyone can read site settings'
  ) THEN
    DROP POLICY "Everyone can read site settings" ON public.site_settings;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'site_settings' 
    AND policyname = 'Only admins can manage site settings'
  ) THEN
    DROP POLICY "Only admins can manage site settings" ON public.site_settings;
  END IF;
END $$;

-- Add policies for site_settings
CREATE POLICY "Everyone can read site settings"
  ON public.site_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can manage site settings"
  ON public.site_settings
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text]));

-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL CHECK (image_url ~ '^https?://.*$'),
  link_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'clients' 
    AND policyname = 'Public read access to clients'
  ) THEN
    DROP POLICY "Public read access to clients" ON public.clients;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'clients' 
    AND policyname = 'Admin management of clients'
  ) THEN
    DROP POLICY "Admin management of clients" ON public.clients;
  END IF;
END $$;

-- Add policies for clients
CREATE POLICY "Public read access to clients"
  ON public.clients
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin management of clients"
  ON public.clients
  FOR ALL
  TO public
  USING ((auth.jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text]))
  WITH CHECK ((auth.jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text]));

-- Create index for faster client retrieval
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);
