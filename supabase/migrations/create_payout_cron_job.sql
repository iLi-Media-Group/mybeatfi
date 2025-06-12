/*
  # Create monthly payout cron job

  This migration sets up a PostgreSQL cron job to automatically run the
  generate-monthly-payouts function on the 10th of each month at 3 AM UTC.
  This allows:
  1. Collection of all earnings through the end of the previous month
  2. Time for payment processing, refunds, and adjustments
  3. Buffer period for any account reconciliations
*/

-- Create the cron job (or update if it exists)
select cron.schedule(
  'monthly-producer-payouts',
  '0 3 10 * *', -- At 03:00 on day-of-month 10
  $$
    select net.http_post(
      url := supabase_url || '/functions/v1/generate-monthly-payouts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'month', to_char(current_date - interval '1 month', 'YYYY-MM')
    ) as request_id
    from secrets.supabase_url, secrets.service_role_key;
  $$
);

-- Enable the pg_cron extension if not already enabled
create extension if not exists pg_cron with schema extensions;
