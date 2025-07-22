import { supabase } from './supabase';

export async function requireSupabaseSession(redirect = null) {
  const { data: { session }, error } = await supabase.auth.getSession();
  console.log('🔍 DEBUG: Supabase session check:', session, error);

  if (error || !session || !session.access_token) {
    console.warn('🔍 DEBUG: No valid Supabase session found.');
    if (redirect) {
      window.location.href = redirect;
    }
    throw new Error('User not authenticated with Supabase.');
  }
  return session;
} 