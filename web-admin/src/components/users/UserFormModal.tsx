'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { insertAuditLog } from '@/lib/auditLog'

interface UserFormModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export default function UserFormModal({
  open,
  onClose,
  onCreated,
}: UserFormModalProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'cashier'>('cashier')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function resetForm() {
    setEmail('')
    setName('')
    setPassword('')
    setRole('cashier')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password || !name) {
      setError('Email, nombre y contraseña son obligatorios.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)
    setError('')

    // Isolated client — signUp won't overwrite admin's session cookies
    const tempClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const newUserId = signUpData.user?.id
    if (!newUserId) {
      setError('No se pudo crear el usuario.')
      setLoading(false)
      return
    }

    // Use admin's authenticated client to update the profile
    const supabase = createClient()

    // Brief wait for the handle_new_user trigger to create the profile row
    await new Promise((resolve) => setTimeout(resolve, 500))

    const { error: updateError } = await supabase
      .from('profiles')
      // @ts-expect-error: supabase-js v2.103 schema inference issue
      .update({ name, role })
      .eq('id', newUserId)

    if (updateError) {
      setError(`Usuario creado pero falló actualizar perfil: ${updateError.message}`)
      setLoading(false)
      return
    }

    await insertAuditLog('USER_CREATED', 'user', newUserId, null, { email, name, role })

    setLoading(false)
    resetForm()
    onCreated()
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          resetForm()
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Usuario</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nombre *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre completo"
              required
            />
          </div>

          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
            />
          </div>

          <div>
            <Label>Contraseña *</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <div>
            <Label>Rol</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'cashier')}
              className="w-full h-8 rounded-md border border-input bg-transparent px-3 text-sm text-coffee-900"
            >
              <option value="cashier">Cajero</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
