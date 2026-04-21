import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single<{ role: string; is_active: boolean }>()

  if (!callerProfile || !callerProfile.is_active || callerProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admins pueden crear usuarios' }, { status: 403 })
  }

  let body: { name?: string; email?: string; password?: string; role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { name, email, password, role } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Nombre, email y contraseña son obligatorios' }, { status: 400 })
  }
  if (password.length < 10 || !/\d/.test(password)) {
    return NextResponse.json(
      { error: 'La contraseña debe tener mínimo 10 caracteres e incluir al menos un número' },
      { status: 400 }
    )
  }
  if (role !== 'admin' && role !== 'cashier') {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
  }

  const admin = createAdminClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? 'No se pudo crear el usuario' },
      { status: 400 }
    )
  }

  const newUserId = created.user.id

  // Actualizar nombre y, si corresponde, promover a admin (el trigger handle_new_user crea como cashier)
  const { error: updateError } = await admin
    .from('profiles')
    // @ts-expect-error: supabase-js v2.103 schema inference issue with manual Database types
    .update({ name, role })
    .eq('id', newUserId)

  if (updateError) {
    return NextResponse.json(
      { error: `Usuario creado pero falló actualizar perfil: ${updateError.message}`, id: newUserId },
      { status: 500 }
    )
  }

  await admin
    .from('audit_logs')
    // @ts-expect-error: supabase-js v2.103 schema inference issue with manual Database types
    .insert({
      user_id: user.id,
      user_email: user.email ?? '',
      action: 'USER_CREATED',
      entity_type: 'user',
      entity_id: newUserId,
      old_value: null,
      new_value: { email, name, role },
    })

  return NextResponse.json({ ok: true, id: newUserId })
}
