'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import UsersTable from '@/components/users/UsersTable'
import UserFormModal from '@/components/users/UserFormModal'
import { ChangeRoleModal, ToggleActiveModal } from '@/components/users/UserActionModals'
import type { Profile } from '@/types/database'

export default function UsuariosPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [roleUser, setRoleUser] = useState<Profile | null>(null)
  const [toggleUser, setToggleUser] = useState<Profile | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })

    setUsers((data as Profile[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-coffee-900">Usuarios</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          Nuevo Usuario
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Users size={16} className="text-coffee-500" />
          <CardTitle className="text-sm font-medium text-coffee-500">
            Gestión de Usuarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable
            data={users}
            loading={loading}
            onChangeRole={setRoleUser}
            onToggleActive={setToggleUser}
          />
        </CardContent>
      </Card>

      <UserFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchUsers}
      />

      <ChangeRoleModal
        user={roleUser}
        open={!!roleUser}
        onClose={() => setRoleUser(null)}
        onUpdated={fetchUsers}
      />

      <ToggleActiveModal
        user={toggleUser}
        open={!!toggleUser}
        onClose={() => setToggleUser(null)}
        onUpdated={fetchUsers}
      />
    </div>
  )
}
