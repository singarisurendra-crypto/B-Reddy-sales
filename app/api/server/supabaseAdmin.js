import { createClient } from '@supabase/supabase-js';

let client = null;

function getClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.');
  }

  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
  }

  client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
}

export const supabaseAdmin = {
  from(...args) {
    return getClient().from(...args);
  },

  rpc(...args) {
    return getClient().rpc(...args);
  },
};
