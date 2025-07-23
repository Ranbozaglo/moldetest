import { supabase } from './supabase';

export async function requireSupabaseSession(redirect = null) {
  console.log('🔍 PROD DEBUG: requireSupabaseSession called with redirect:', redirect);
  
  const { data: { session }, error } = await supabase.auth.getSession();
  console.log('🔍 PROD DEBUG: Supabase session check - session:', session ? 'exists' : 'null', 'error:', error);

  if (error || !session || !session.access_token) {
    console.warn('🔍 PROD DEBUG: No valid Supabase session found.');
    
    // Check if we have a regular auth user instead
    const savedUser = localStorage.getItem('mth_user');
    if (savedUser) {
      console.log('🔍 PROD DEBUG: Found regular auth user in localStorage, allowing access');
      try {
        const userData = JSON.parse(savedUser);
        if (userData.access_token) {
          console.log('🔍 PROD DEBUG: User has access token, returning mock session');
          return { access_token: userData.access_token, user: userData };
        }
      } catch (e) {
        console.error('🔍 PROD DEBUG: Error parsing saved user for Supabase fallback:', e);
      }
    }
    
    console.log('🔍 PROD DEBUG: No valid session found, redirecting to:', redirect);
    if (redirect) {
      window.location.href = redirect;
    }
    throw new Error('User not authenticated with Supabase.');
  }
  
  console.log('🔍 PROD DEBUG: Valid Supabase session found, returning session');
  return session;
} 