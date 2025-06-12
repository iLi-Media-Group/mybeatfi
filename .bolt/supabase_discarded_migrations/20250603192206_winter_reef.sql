/*
  # Create Site Settings and Clients Tables

  1. New Tables
    - `site_settings`
      - `key` (text, primary key)
      - `value` (text)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)
    
    - `clients`
      - `id` (uuid, primary key)
      - `name` (text)
      - `image_url` (text)
      - `link_url` (text)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read data
    - Add policies for admin users to manage data
*/

-- Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for reading site_settings (public access)
CREATE POLICY "Allow public read access to site_settings"
  ON public.site_settings
  FOR SELECT
  TO public
  USING (true);

-- Create policy for admin to manage site_settings
CREATE POLICY "Allow admin to manage site_settings"
  ON public.site_settings
  FOR ALL
  TO authenticated
  USING (auth.email() IN ('knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com'));

-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  link_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create policy for reading clients (public access)
CREATE POLICY "Allow public read access to clients"
  ON public.clients
  FOR SELECT
  TO public
  USING (true);

-- Create policy for admin to manage clients
CREATE POLICY "Allow admin to manage clients"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (auth.email() IN ('knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com'));

-- Insert default logo URL into site_settings
INSERT INTO public.site_settings (key, value)
VALUES ('logo_url', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop')
ON CONFLICT (key) DO NOTHING;

-- Insert demo clients if none exist
INSERT INTO public.clients (name, image_url, link_url)
VALUES 
  ('Tech Review Weekly', 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop', 'https://example.com/tech-review'),
  ('Nature Documentary Series', 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop', 'https://example.com/nature-docs'),
  ('Fitness Journey Podcast', 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=800&auto=format&fit=crop', 'https://example.com/fitness-podcast'),
  ('Cooking with Chef Maria', 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop', 'https://example.com/cooking-show'),
  ('Travel Diaries', 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=800&auto=format&fit=crop', 'https://example.com/travel'),
  ('Gaming Reviews Channel', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop', 'https://example.com/gaming')
ON CONFLICT (id) DO NOTHING;
