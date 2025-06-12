import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseAdminUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseAdminUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase admin environment variables');
}

export const supabaseAdmin = createClient<Database>(
  supabaseAdminUrl, 
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
