import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAuthStore } from '../store/authStore'

// Mock the logo asset URL to avoid import.meta.url issues in jsdom
vi.mock('../assets/logo.png', () => ({ default: 'logo.png' }))

const Login = (await import('./Login')).default

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza el formulario con campos de correo y contraseña', () => {
    const mockLogin = vi.fn().mockResolvedValue({ error: null })
    useAuthStore.setState({ login: mockLogin })

    render(<Login />)

    expect(screen.getByText('Super Coffee Maya')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('correo@ejemplo.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Iniciar Sesión/i })).toBeInTheDocument()
  })

  it('permite escribir en los campos', () => {
    const mockLogin = vi.fn().mockResolvedValue({ error: null })
    useAuthStore.setState({ login: mockLogin })

    render(<Login />)

    const emailInput = screen.getByPlaceholderText('correo@ejemplo.com')
    const passwordInput = screen.getByPlaceholderText('••••••••')

    fireEvent.change(emailInput, { target: { value: 'cajera@test.com' } })
    fireEvent.change(passwordInput, { target: { value: 'secreto' } })

    expect(emailInput).toHaveValue('cajera@test.com')
    expect(passwordInput).toHaveValue('secreto')
  })

  it('muestra error cuando el login falla', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ error: 'Credenciales incorrectas' })
    useAuthStore.setState({ login: mockLogin })

    render(<Login />)

    fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), {
      target: { value: 'cajera@test.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrong' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/i }))

    await waitFor(() => {
      expect(screen.getByText('Credenciales incorrectas')).toBeInTheDocument()
    })
  })

  it('llama a login con los argumentos correctos al enviar', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ error: null })
    useAuthStore.setState({ login: mockLogin })

    render(<Login />)

    fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), {
      target: { value: 'admin@coffeemaya.mx' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'mipassword' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@coffeemaya.mx', 'mipassword')
    })
  })
})
