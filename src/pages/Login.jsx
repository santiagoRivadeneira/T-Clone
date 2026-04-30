import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Feather, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '',
    password: '',
    username: '',
    displayName: '',
  })

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError('Por favor completa todos los campos.')
      return
    }
    if (mode === 'register' && (!form.username || !form.displayName)) {
      setError('Por favor completa todos los campos.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password })
      } else {
        await register({
          email: form.email,
          password: form.password,
          username: form.username,
          displayName: form.displayName,
        })
      }
      navigate('/')
    } catch (err) {
      setError(err.message || 'Algo salió mal. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function switchMode() {
    setMode(m => (m === 'login' ? 'register' : 'login'))
    setError('')
    setForm({ email: '', password: '', username: '', displayName: '' })
  }

  return (
    <div className="min-h-screen bg-black flex flex-col lg:flex-row">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-12">
        <div className="text-white max-w-md">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-8">
            <Feather className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-black mb-6 leading-tight">
            Todo lo que pasa, <br />pasa aquí.
          </h1>
          <p className="text-xl text-brand-100 leading-relaxed">
            Únete a la conversación. Comparte ideas, descubre tendencias y conecta con personas de todo el mundo.
          </p>
          <div className="flex gap-4 mt-8">
            {['100K+ usuarios', '1M+ posts', 'Tiempo real'].map(stat => (
              <div key={stat} className="bg-white/10 rounded-xl px-4 py-2 text-sm font-medium">
                {stat}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center">
              <Feather className="w-6 h-6 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-black text-[#e7e9ea] mb-2">
            {mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}
          </h2>
          <p className="text-[#71767b] mb-8">
            {mode === 'login' ? 'Bienvenido de vuelta' : 'Únete a la comunidad hoy'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#e7e9ea]">Nombre completo</label>
                  <Input
                    name="displayName"
                    type="text"
                    placeholder="Tu nombre"
                    value={form.displayName}
                    onChange={handleChange}
                    className="h-12"
                    autoComplete="name"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#e7e9ea]">Nombre de usuario</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71767b]">@</span>
                    <Input
                      name="username"
                      type="text"
                      placeholder="usuario123"
                      value={form.username}
                      onChange={handleChange}
                      className="h-12 pl-7"
                      autoComplete="username"
                    />
                  </div>
                  <p className="text-xs text-[#71767b]">3-15 caracteres, solo letras, números y _</p>
                </div>
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#e7e9ea]">Email</label>
              <Input
                name="email"
                type="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={handleChange}
                className="h-12"
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#e7e9ea]">Contraseña</label>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  className="h-12 pr-12"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71767b] hover:text-[#e7e9ea] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {mode === 'register' && (
                <p className="text-xs text-[#71767b]">Mínimo 8 caracteres</p>
              )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <Button type="submit" size="xl" disabled={loading} className="mt-2 w-full">
              {loading
                ? mode === 'login' ? 'Iniciando...' : 'Creando cuenta...'
                : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </Button>
          </form>

          <div className="mt-4 p-3 bg-brand/10 border border-brand/20 rounded-xl">
            <p className="text-sm text-brand text-center">
              Demo: <strong>alex@example.com</strong> / <strong>password123</strong>
            </p>
          </div>

          <div className="mt-6 text-center">
            <span className="text-[#71767b] text-sm">
              {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            </span>
            <button onClick={switchMode} className="text-brand text-sm font-bold hover:underline">
              {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
