import { createServiceRoleClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { username, password, role, fullName } = await request.json();

        if (!username || !password || !role) {
            return NextResponse.json(
                { error: 'Faltan datos requeridos (usuario, contraseña, rol)' },
                { status: 400 }
            );
        }

        // Create the internal email
        // We use a specific domain to identify these internal users
        const email = `${username.toLowerCase().replace(/\s+/g, '')}@internal.sfl`;

        const supabaseAdmin = createServiceRoleClient();

        // 1. Create User in Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // Auto-confirm
            user_metadata: {
                full_name: fullName || username,
            }
        });

        if (authError) {
            console.error('Error creating auth user:', authError);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        if (!authData.user) {
            return NextResponse.json({ error: 'No se pudo crear el usuario' }, { status: 500 });
        }

        // 2. Create Profile (Assuming trigger might handle it, but for safety we can insert if not exists)
        // Since we are using admin client, RLS bypasses.
        // But usually, an INSERT trigger on auth.users creates the profile. 
        // We will check if we need to update the role manually because triggers usually set a default role.

        // Wait a small bit for trigger? Or just Upsert.
        // Let's Upsert the profile to ensure role is correct.
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authData.user.id,
                email: email,
                full_name: fullName || username,
                role: role,
                is_active: true
            });

        if (profileError) {
            console.error('Error creating profile:', profileError);
            // Even if profile update fails, user is created. We might want to rollback or warn.
            // For now, return error.
            return NextResponse.json({ error: 'Usuario creado pero falló al asignar perfil: ' + profileError.message }, { status: 500 });
        }

        return NextResponse.json({
            user: {
                id: authData.user.id,
                username: username,
                role: role
            }
        });

    } catch (error: any) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
