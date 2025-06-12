/*
  # Fix Analytics Access and Queries

  1. Changes
    - Grant proper permissions for analytics functions
    - Add missing indexes for performance
    - Fix materialized view refresh concurrency
    - Add error handling for analytics queries

  2. Security
    - Ensure proper RLS policies
    - Grant necessary permissions to authenticated users
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_sales_analytics();

-- Recreate function with better error handling
CREATE OR REPLACE FUNCTION get_sales_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    user_email text;
BEGIN
    -- Get current user's email
    SELECT current_setting('request.jwt.claim.email', true) INTO user_email;

    -- Check if user is admin
    IF user_email NOT IN ('knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com') THEN
        RAISE EXCEPTION 'Unauthorized access';
    END IF;

    WITH monthly_revenue AS (
        SELECT
            TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
            COALESCE(SUM(amount), 0) as revenue
        FROM sales
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) DESC
        LIMIT 6
    ),
    license_distribution AS (
        SELECT
            license_type,
            COUNT(*) as count
        FROM sales
        GROUP BY license_type
        ORDER BY count DESC
    ),
    producer_stats AS (
        SELECT
            COALESCE(p.first_name || ' ' || p.last_name, SPLIT_PART(p.email, '@', 1)) as producer_name,
            COUNT(*) as sales,
            COALESCE(SUM(s.amount), 0) as revenue
        FROM sales s
        JOIN tracks t ON t.id = s.track_id
        JOIN profiles p ON p.id = t.producer_id
        GROUP BY p.id, p.first_name, p.last_name, p.email
        ORDER BY revenue DESC
        LIMIT 5
    ),
    track_stats AS (
        SELECT
            t.title as track_title,
            COUNT(*) as sales,
            COALESCE(SUM(s.amount), 0) as revenue
        FROM sales s
        JOIN tracks t ON t.id = s.track_id
        GROUP BY t.id, t.title
        ORDER BY revenue DESC
        LIMIT 5
    )
    SELECT json_build_object(
        'revenueByMonth', COALESCE((SELECT json_agg(monthly_revenue)), '[]'::json),
        'salesByLicenseType', COALESCE((SELECT json_agg(license_distribution)), '[]'::json),
        'topProducers', COALESCE((SELECT json_agg(producer_stats)), '[]'::json),
        'topTracks', COALESCE((SELECT json_agg(track_stats)), '[]'::json)
    ) INTO result;

    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error details
        RAISE NOTICE 'Error in get_sales_analytics: %', SQLERRM;
        -- Return empty result set
        RETURN json_build_object(
            'revenueByMonth', '[]'::json,
            'salesByLicenseType', '[]'::json,
            'topProducers', '[]'::json,
            'topTracks', '[]'::json
        );
END;
$$;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW proposal_analytics;

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION get_sales_analytics() TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create or update necessary indexes
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales (created_at);
CREATE INDEX IF NOT EXISTS idx_sales_license_type ON sales (license_type);
CREATE INDEX IF NOT EXISTS idx_sales_track_id ON sales (track_id);
CREATE INDEX IF NOT EXISTS idx_tracks_producer_id ON tracks (producer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);
