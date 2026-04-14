import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

const INACTIVITY_LIMIT_MS = 8 * 60 * 60 * 1000 // 8 horas

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)
  const { pathname } = request.nextUrl

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // /login: redirigir a dashboard si ya autenticado
  if (pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response()
  }

  // /no-autorizado: permitir acceso a usuarios autenticados (no-admins)
  if (pathname === '/no-autorizado') {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response()
  }

  // Sin sesión → login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verificar rol admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active || profile.role !== 'admin') {
    return NextResponse.redirect(new URL('/no-autorizado', request.url))
  }

  // Verificar inactividad de 8 horas
  const lastActivity = request.cookies.get('last_activity')?.value
  if (lastActivity) {
    const elapsed = Date.now() - parseInt(lastActivity, 10)
    if (elapsed > INACTIVITY_LIMIT_MS) {
      await supabase.auth.signOut()
      const redirect = NextResponse.redirect(new URL('/login', request.url))
      redirect.cookies.delete('last_activity')
      return redirect
    }
  }

  // Actualizar timestamp de actividad
  const res = response()
  res.cookies.set('last_activity', Date.now().toString(), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
  })

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
