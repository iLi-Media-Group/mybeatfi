import { supabase, supabaseAdmin } from './supabase';

export const fetchProducerEarnings = async (month: string, producerId: string) => {
  try {
    // First try with admin client (service role)
    const { data: adminData, error: adminError } = await supabaseAdmin.rpc(
      'calculate_producer_earnings',
      {
        month_input: month,
        producer_id_input: producerId
      }
    );

    if (!adminError) return adminData;

    // Fallback to regular client if admin fails
    const { data, error } = await supabase.rpc(
      'calculate_producer_earnings',
      {
        month_input: month,
        producer_id_input: producerId
      }
    );

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching earnings:', error);
    throw new Error('Failed to fetch earnings data');
  }
};

// Usage example:
// const earnings = await fetchProducerEarnings('2023-12', 'producer-uuid-here');
