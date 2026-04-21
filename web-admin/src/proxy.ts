import { type NextRequest, NextResponse } from 'next/server'
import { createProxyClient } from '@/lib/supabase/proxy'

const INACTIVITY_LIMIT_MS = 8 * 60 * 60 * 1000

export async function proxy(request: NextRequest) {
  const { supabase, response } = createProxyClient(request)
  const { pathname } = request.nextUrl

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response()
  }

  if (pathname === '/no-autorizado') {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response()
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active, last_activity_at')
    .eq('id', user.id)
    .single<{ role: string; is_active: boolean; last_activity_at: string | null }>()

  if (!profile || !profile.is_active || profile.role !== 'admin') {
    return NextResponse.redirect(new URL('/no-autorizado', request.url))
  }

  if (profile.last_activity_at) {
    const elapsed = Date.now() - new Date(profile.last_activity_at).getTime()
    if (elapsed > INACTIVITY_LIMIT_MS) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  await supabase
    .from('profiles')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', user.id)

  return response()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
