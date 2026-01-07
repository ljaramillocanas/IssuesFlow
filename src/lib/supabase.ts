import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Cliente para uso en componentes de cliente y servidor
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente básico para uso general
export const createSupabaseClient = () => {
    return createClient(supabaseUrl, supabaseAnonKey);
};

// Cliente de servidor con service role (solo para API routes)
export const createServiceRoleClient = () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
};
