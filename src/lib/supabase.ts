import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wrktigeorjtsxqhxgfgq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indya3RpZ2Vvcmp0c3hxaHhnZmdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTA4MjksImV4cCI6MjA3ODM2NjgyOX0.13a_AG-lJwMn3ygytePA2gXf7eOTLVDmrbRNu2xxee4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

