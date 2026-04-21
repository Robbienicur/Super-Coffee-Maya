'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { insertAuditLog } from '@/lib/auditLog'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { Profile } from '@/types/database'

interface ChangeRoleModalProps {
  user: Profile | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export function ChangeRoleModal({ user, open, onClose, onUpdated }: ChangeRoleModalProps) {
  const [newRole, setNewRole] = useState<'admin' | 'cashier'>('cashier')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const currentUser = useCurrentUser()

  const isSelf = !!(currentUser && user && currentUser.id === user.id)

  useEffect(() => {
    if (user && open) {
      setNewRole(user.role === 'admin' ? 'cashier' : 'admin')
      setError('')
    }
  }, [user, open])

  async function handleSubmit() {
    if (!user) return
    if (isSelf) {
      setError('No puedes modificar tu propia cuenta.')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      // @ts-expect-error: supabase-js v2.103 schema inference issue
      .update({ role: newRole })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    await insertAuditLog('ROLE_CHANGED', 'user', user.id, { role: user.role }, { role: newRole })

    setLoading(false)
    onUpdated()
    onClose()
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar Rol</DialogTitle>
          <DialogDescription>
            Cambiar rol de {user.name || user.email}
          </DialogDescription>
        </DialogHeader>
        {isSelf ? (
          <p className="text-danger text-sm">
            No puedes modificar tu propia cuenta.
          </p>
        ) : (
          <div>
            <Label>Nuevo rol</Label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'admin' | 'cashier')}
              className="w-full h-8 rounded-md border border-input bg-transparent px-3 text-sm text-coffee-900 mt-1"
            >
              <option value="cashier">Cajero</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        )}
        {error && <p className="text-danger text-sm">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || isSelf || newRole === user.role}
            title={isSelf ? 'No puedes modificar tu propia cuenta' : undefined}
          >
            {loading ? 'Guardando...' : 'Cambiar Rol'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ToggleActiveModalProps {
  user: Profile | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export function ToggleActiveModal({ user, open, onClose, onUpdated }: ToggleActiveModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const currentUser = useCurrentUser()

  const isSelf = !!(currentUser && user && currentUser.id === user.id)

  useEffect(() => {
    if (open) setError('')
  }, [open])

  async function handleConfirm() {
    if (!user) return
    if (isSelf) {
      setError('No puedes modificar tu propia cuenta.')
      return
    }
    setLoading(true)
    setError('')

    const newActive = !user.is_active
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      // @ts-expect-error: supabase-js v2.103 schema inference issue
      .update({ is_active: newActive })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    await insertAuditLog(
      newActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      'user',
      user.id,
      { is_active: user.is_active },
      { is_active: newActive }
    )

    setLoading(false)
    onUpdated()
    onClose()
  }

  if (!user) return null

  const action = user.is_active ? 'desactivar' : 'activar'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{user.is_active ? 'Desactivar' : 'Activar'} Usuario</DialogTitle>
          <DialogDescription>
            {isSelf
              ? 'No puedes modificar tu propia cuenta.'
              : `¿Estás seguro de ${action} a ${user.name || user.email}?${
                  user.is_active ? ' El usuario no podrá iniciar sesión.' : ''
                }`}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-danger text-sm">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant={user.is_active ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading || isSelf}
            title={isSelf ? 'No puedes modificar tu propia cuenta' : undefined}
          >
            {loading ? 'Procesando...' : user.is_active ? 'Desactivar' : 'Activar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
