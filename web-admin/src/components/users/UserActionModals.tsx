'use client'

import { useState } from 'react'
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

  // Initialize newRole to opposite of current when modal opens
  const targetRole = user?.role === 'admin' ? 'cashier' : 'admin'

  async function handleSubmit() {
    if (!user) return
    setLoading(true)

    const supabase = createClient()
    // @ts-expect-error: supabase-js v2.103 schema inference issue
    await supabase.from('profiles').update({ role: newRole }).eq('id', user.id)
    await insertAuditLog('ROLE_CHANGED', 'user', user.id, { role: user.role }, { role: newRole })

    setLoading(false)
    onUpdated()
    onClose()
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose() } else { setNewRole(targetRole) } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar Rol</DialogTitle>
          <DialogDescription>
            Cambiar rol de {user.name || user.email}
          </DialogDescription>
        </DialogHeader>
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || newRole === user.role}>
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

  async function handleConfirm() {
    if (!user) return
    setLoading(true)

    const newActive = !user.is_active
    const supabase = createClient()
    // @ts-expect-error: supabase-js v2.103 schema inference issue
    await supabase.from('profiles').update({ is_active: newActive }).eq('id', user.id)
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
            ¿Estás seguro de {action} a {user.name || user.email}?
            {user.is_active && ' El usuario no podrá iniciar sesión.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant={user.is_active ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Procesando...' : user.is_active ? 'Desactivar' : 'Activar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
