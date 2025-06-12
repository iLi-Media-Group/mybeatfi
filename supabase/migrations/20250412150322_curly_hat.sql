/*
  # Add Sales Analytics Function

  1. New Function
    - Creates a stored procedure to calculate sales analytics
    - Returns revenue by month, sales by license type, top producers, and top tracks
    - Optimized for performance with proper indexing
*/

-- Create function to get sales analytics
CREATE OR REPLACE FUNCTION get_sales_analytics()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    result json;
BEGIN
    WITH monthly_revenue AS (
        SELECT
            TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
            SUM(amount) as revenue
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
            COALESCE(p.first_name, SPLIT_PART(p.email, '@', 1)) as producer_name,
            COUNT(*) as sales,
            SUM(s.amount) as revenue
        FROM sales s
        JOIN tracks t ON t.id = s.track_id
        JOIN profiles p ON p.id = t.producer_id
        GROUP BY p.id, p.first_name, p.email
        ORDER BY revenue DESC
        LIMIT 5
    ),
    track_stats AS (
        SELECT
            t.title as track_title,
            COUNT(*) as sales,
            SUM(s.amount) as revenue
        FROM sales s
        JOIN tracks t ON t.id = s.track_id
        GROUP BY t.id, t.title
        ORDER BY revenue DESC
        LIMIT 5
    )
    SELECT json_build_object(
        'revenueByMonth', (SELECT json_agg(monthly_revenue)),
        'salesByLicenseType', (SELECT json_agg(license_distribution)),
        'topProducers', (SELECT json_agg(producer_stats)),
        'topTracks', (SELECT json_agg(track_stats))
    ) INTO result;

    RETURN result;
END;
$$;

-- Create indexes to optimize analytics queries
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales (created_at);
CREATE INDEX IF NOT EXISTS idx_sales_license_type ON sales (license_type);
CREATE INDEX IF NOT EXISTS idx_sales_track_id ON sales (track_id);
CREATE INDEX IF NOT EXISTS idx_tracks_producer_id ON tracks (producer_id);

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_sales_analytics() TO authenticated;
