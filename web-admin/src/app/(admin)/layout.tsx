import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single<{ role: string; is_active: boolean }>()

  if (!profile || !profile.is_active || profile.role !== 'admin') {
    redirect('/no-autorizado')
  }

  return (
    <div className="flex h-screen bg-cream-dark">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
