'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ShieldX } from 'lucide-react'

export default function NoAutorizadoPage() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-dark">
      <div className="text-center space-y-4">
        <ShieldX size={64} className="mx-auto text-coffee-300" />
        <h1 className="text-2xl font-bold text-coffee-900">Acceso No Autorizado</h1>
        <p className="text-coffee-500 max-w-sm">
          Solo los administradores pueden acceder al panel web.
          Contacta al administrador si necesitas acceso.
        </p>
        <Button variant="outline" onClick={handleLogout}>
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}
