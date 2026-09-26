import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lehiaorbhcxrriathvhf.supabase.co';
const supabaseAnonKey = 'sb_publishable_mnvgj1COfpXJqgqeBXdjvg_Hi59OT9l';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
