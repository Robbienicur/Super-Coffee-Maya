'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, Power } from 'lucide-react'
import { formatDateMX } from '@/lib/format'
import type { Profile } from '@/types/database'

interface UsersTableProps {
  data: Profile[]
  loading: boolean
  onChangeRole: (user: Profile) => void
  onToggleActive: (user: Profile) => void
}

export default function UsersTable({
  data,
  loading,
  onChangeRole,
  onToggleActive,
}: UsersTableProps) {
  if (loading) {
    return <p className="text-coffee-300 text-sm py-8 text-center">Cargando usuarios...</p>
  }

  if (data.length === 0) {
    return <p className="text-coffee-300 text-sm py-8 text-center">No hay usuarios.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Creado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="text-sm font-medium text-coffee-900">
              {user.name || '—'}
            </TableCell>
            <TableCell className="text-sm">{user.email}</TableCell>
            <TableCell>
              <Badge
                variant={user.role === 'admin' ? 'default' : 'secondary'}
                className="text-[10px]"
              >
                {user.role === 'admin' ? 'Administrador' : 'Cajero'}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant={user.is_active ? 'default' : 'destructive'}
                className="text-[10px]"
              >
                {user.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-coffee-500">
              {formatDateMX(user.created_at)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onChangeRole(user)}
                  title="Cambiar rol"
                >
                  <Shield size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onToggleActive(user)}
                  title={user.is_active ? 'Desactivar' : 'Activar'}
                >
                  <Power
                    size={14}
                    className={user.is_active ? 'text-success' : 'text-coffee-300'}
                  />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
