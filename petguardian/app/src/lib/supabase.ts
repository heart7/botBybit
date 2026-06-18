/**
 * Supabase client for the Expo app.
 *
 * Uses the ANON key only. Every request carries the user's JWT, and Row-Level
 * Security (Doc 09 §4) ensures a user can only reach rows they own. The
 * service-role key is never present in the client.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { config } from './config';

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Mobile deep-links handle auth callbacks; there is no URL to parse on launch.
    detectSessionInUrl: false,
  },
});
