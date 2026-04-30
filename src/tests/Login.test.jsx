import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, mockUser } from './utils'
import Login from '@/pages/Login'

// Mock the api module
vi.mock('@/lib/api', () => ({
  api: {
    auth: {
      login: vi.fn(),
      register: vi.fn(),
      me: vi.fn(),
      updateMe: vi.fn(),
    },
    tweets: {},
    users: {},
  },
}))

// Mock react-router-dom navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

import { api } from '@/lib/api'

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders login form by default', () => {
    renderWithProviders(<Login />)
    expect(screen.getByText('Inicia sesión')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('shows validation error when submitting empty form', async () => {
    renderWithProviders(<Login />)
    const submitBtn = screen.getByRole('button', { name: /iniciar sesión/i })
    await userEvent.click(submitBtn)
    expect(screen.getByText('Por favor completa todos los campos.')).toBeInTheDocument()
  })

  it('calls login API with correct credentials and redirects', async () => {
    api.auth.login.mockResolvedValueOnce({ token: 'tok-123', user: mockUser })
    renderWithProviders(<Login />)

    await userEvent.type(screen.getByPlaceholderText('tu@email.com'), 'alex@example.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(api.auth.login).toHaveBeenCalledWith({
        email: 'alex@example.com',
        password: 'password123',
      })
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('displays API error message on failed login', async () => {
    api.auth.login.mockRejectedValueOnce(new Error('Credenciales inválidas'))
    renderWithProviders(<Login />)

    await userEvent.type(screen.getByPlaceholderText('tu@email.com'), 'wrong@example.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument()
    })
  })

  it('switches to register mode and shows extra fields', async () => {
    renderWithProviders(<Login />)
    await userEvent.click(screen.getByRole('button', { name: /regístrate/i }))

    expect(screen.getByText('Crea tu cuenta')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Tu nombre')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('usuario123')).toBeInTheDocument()
  })

  it('calls register API with all required fields', async () => {
    api.auth.register.mockResolvedValueOnce({ token: 'tok-456', user: mockUser })
    renderWithProviders(<Login />)

    await userEvent.click(screen.getByRole('button', { name: /regístrate/i }))

    await userEvent.type(screen.getByPlaceholderText('Tu nombre'), 'Alex Dev')
    await userEvent.type(screen.getByPlaceholderText('usuario123'), 'alexdev')
    await userEvent.type(screen.getByPlaceholderText('tu@email.com'), 'alex@example.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123')

    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(api.auth.register).toHaveBeenCalledWith({
        email: 'alex@example.com',
        password: 'password123',
        username: 'alexdev',
        displayName: 'Alex Dev',
      })
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('shows demo credentials hint', () => {
    renderWithProviders(<Login />)
    expect(screen.getByText(/alex@example\.com/)).toBeInTheDocument()
  })
})
