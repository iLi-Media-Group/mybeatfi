/*
  # Sales Analytics Materialized View

  1. Overview
    Creates a materialized view for tracking sales analytics with producer-specific metrics
    
  2. Changes
    - Drops existing view and related objects
    - Creates materialized view with monthly and producer statistics
    - Adds refresh function and triggers
    - Creates optimized indexes
    
  3. Notes
    - Uses CONCURRENTLY refresh for better performance
    - Includes unique constraints for efficient refreshing
*/

-- Drop existing view and related objects
DROP MATERIALIZED VIEW IF EXISTS sales_analytics;
DROP TRIGGER IF EXISTS refresh_sales_analytics_on_sale ON sales;
DROP TRIGGER IF EXISTS refresh_sales_analytics_on_track ON tracks;
DROP FUNCTION IF EXISTS refresh_sales_analytics();

-- Create materialized view for sales analytics
CREATE MATERIALIZED VIEW sales_analytics AS
WITH monthly_stats AS (
  SELECT
    date_trunc('month', s.created_at) as month,
    COUNT(*) as monthly_sales_count,
    SUM(s.amount) as monthly_revenue,
    COUNT(DISTINCT s.buyer_id) as unique_buyers,
    COUNT(DISTINCT t.producer_id) as active_producers
  FROM sales s
  JOIN tracks t ON s.track_id = t.id
  GROUP BY date_trunc('month', s.created_at)
),
producer_stats AS (
  SELECT
    t.producer_id,
    p.email as producer_email,
    p.first_name,
    p.last_name,
    COUNT(DISTINCT s.id) as producer_sales_count,
    SUM(s.amount) as producer_revenue,
    COUNT(DISTINCT t.id) as track_count,
    MIN(t.created_at) as first_track_date,
    MAX(t.created_at) as last_track_date,
    COUNT(DISTINCT s.buyer_id) as customer_count
  FROM tracks t
  LEFT JOIN sales s ON t.id = s.track_id
  JOIN profiles p ON t.producer_id = p.id
  GROUP BY t.producer_id, p.email, p.first_name, p.last_name
)
SELECT
  ms.month,
  ms.monthly_sales_count,
  ms.monthly_revenue,
  ms.unique_buyers,
  ms.active_producers,
  ps.producer_id,
  ps.producer_email,
  ps.first_name,
  ps.last_name,
  ps.producer_sales_count,
  ps.producer_revenue,
  ps.track_count,
  ps.first_track_date,
  ps.last_track_date,
  ps.customer_count
FROM monthly_stats ms
CROSS JOIN producer_stats ps;

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_sales_analytics()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY sales_analytics;
  RETURN NULL;
END;
$$;

-- Create triggers to refresh the materialized view
CREATE TRIGGER refresh_sales_analytics_on_sale
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_sales_analytics();

CREATE TRIGGER refresh_sales_analytics_on_track
  AFTER INSERT OR UPDATE OR DELETE ON tracks
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_sales_analytics();

-- Create indexes
CREATE UNIQUE INDEX idx_sales_analytics_month_producer ON sales_analytics (month, producer_id);
CREATE INDEX idx_sales_analytics_producer_email ON sales_analytics (producer_email);
CREATE INDEX idx_sales_analytics_revenue ON sales_analytics (monthly_revenue DESC);
CREATE INDEX idx_sales_analytics_sales ON sales_analytics (monthly_sales_count DESC);
