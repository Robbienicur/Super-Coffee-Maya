import { useState } from 'react'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await login(email, password)
    if (result.error) {
      setError(result.error)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-coffee-900 via-coffee-800 to-coffee-700">
      <form
        onSubmit={handleSubmit}
        className="bg-cream rounded-2xl p-10 w-[380px] shadow-2xl"
      >
        <div className="text-center mb-7">
          <img src={new URL('../assets/logo.png', import.meta.url).href} alt="Super Coffee Maya" className="w-24 h-24 mx-auto mb-2 rounded-full object-cover" />
          <h1 className="text-2xl font-bold text-coffee-900">Super Coffee Maya</h1>
          <p className="text-sm text-coffee-500 mt-1">Punto de Venta</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-medium text-coffee-700 mb-1">
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-coffee-100 border border-coffee-200 rounded-lg px-3 py-2.5 text-sm text-coffee-900 placeholder-coffee-300 focus:outline-none focus:ring-2 focus:ring-coffee-500"
            placeholder="correo@ejemplo.com"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-xs font-medium text-coffee-700 mb-1">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-coffee-100 border border-coffee-200 rounded-lg px-3 py-2.5 text-sm text-coffee-900 placeholder-coffee-300 focus:outline-none focus:ring-2 focus:ring-coffee-500"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-coffee-800 text-cream py-3 rounded-lg font-semibold text-sm hover:bg-coffee-900 transition-colors disabled:opacity-50"
        >
          {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </button>
      </form>
    </div>
  )
}
