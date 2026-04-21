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
    if (password.length < 10 || !/\d/.test(password)) {
      setError('La contraseña debe tener mínimo 10 caracteres e incluir al menos un número.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'No se pudo crear el usuario.')
        setLoading(false)
        return
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.')
      setLoading(false)
      return
    }

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
              placeholder="Mínimo 10 caracteres, incluir un número"
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
