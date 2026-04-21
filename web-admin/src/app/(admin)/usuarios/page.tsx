'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Plus } from 'lucide-react'
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery'
import PaginationControls from '@/components/shared/PaginationControls'
import UsersTable from '@/components/users/UsersTable'
import UserFormModal from '@/components/users/UserFormModal'
import { ChangeRoleModal, ToggleActiveModal } from '@/components/users/UserActionModals'
import type { Profile } from '@/types/database'

const PAGE_SIZE = 25

export default function UsuariosPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [roleUser, setRoleUser] = useState<Profile | null>(null)
  const [toggleUser, setToggleUser] = useState<Profile | null>(null)

  const { data, totalCount, page, setPage, loading, refetch } =
    usePaginatedQuery<Profile>({
      table: 'profiles',
      select: '*',
      filters: [],
      orderBy: { column: 'created_at', ascending: true },
      pageSize: PAGE_SIZE,
    })

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
            data={data}
            loading={loading}
            onChangeRole={setRoleUser}
            onToggleActive={setToggleUser}
          />
          <PaginationControls
            page={page}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <UserFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refetch}
      />

      <ChangeRoleModal
        user={roleUser}
        open={!!roleUser}
        onClose={() => setRoleUser(null)}
        onUpdated={refetch}
      />

      <ToggleActiveModal
        user={toggleUser}
        open={!!toggleUser}
        onClose={() => setToggleUser(null)}
        onUpdated={refetch}
      />
    </div>
  )
}
