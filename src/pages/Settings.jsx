import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, User, Lock, Bell, Palette, Globe,
  Shield, HelpCircle, LogOut, ChevronRight, Sun, Moon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'

const sections = [
  { id: 'account',       icon: User,     label: 'Tu cuenta' },
  { id: 'security',      icon: Lock,     label: 'Seguridad y acceso' },
  { id: 'notifications', icon: Bell,     label: 'Notificaciones' },
  { id: 'appearance',    icon: Palette,  label: 'Apariencia' },
  { id: 'accessibility', icon: Globe,    label: 'Accesibilidad' },
  { id: 'privacy',       icon: Shield,   label: 'Privacidad' },
  { id: 'help',          icon: HelpCircle, label: 'Centro de ayuda' },
]

export default function Settings() {
  const { section } = useParams()
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || '',
  })
  const [saved, setSaved] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function handleSaveProfile() {
    updateUser(profileForm)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const activeSection = section || null

  return (
    <div className="flex h-full pb-16 md:pb-0">
      {/* Sidebar */}
      <div className={cn(
        'flex flex-col border-r border-dark-border',
        activeSection ? 'hidden md:flex md:w-[320px]' : 'flex w-full md:w-[320px]'
      )}>
        <div className="sticky top-0 bg-black/80 backdrop-blur-md px-4 py-3 border-b border-dark-border">
          <h1 className="text-xl font-bold text-[#e7e9ea]">Configuración</h1>
        </div>

        {/* Search settings */}
        <div className="px-4 py-2 border-b border-dark-border">
          <Input
            placeholder="Buscar configuración"
            className="rounded-full bg-dark-input border-transparent h-9"
          />
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-dark-border">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={user?.avatarUrl ?? user?.avatar} alt={user?.displayName} />
            <AvatarFallback>{user?.displayName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-bold text-[#e7e9ea] text-sm truncate">{user?.displayName}</p>
            <p className="text-[#71767b] text-sm truncate">@{user?.username}</p>
          </div>
        </div>

        {/* Menu items */}
        <nav className="flex-1 overflow-y-auto">
          {sections.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => navigate(`/settings/${id}`)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3.5 hover:bg-dark-hover transition-colors border-b border-dark-border text-left',
                section === id && 'bg-dark-hover'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-[#e7e9ea]" />
                <span className="text-[#e7e9ea] text-[15px]">{label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#71767b]" />
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-dark-hover transition-colors text-red-400"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[15px]">Cerrar sesión</span>
          </button>
        </nav>
      </div>

      {/* Detail panel */}
      {activeSection ? (
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md px-4 py-3 border-b border-dark-border flex items-center gap-4">
            <button
              onClick={() => navigate('/settings')}
              className="md:hidden p-2 -ml-2 rounded-full hover:bg-dark-hover text-[#e7e9ea]"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-[#e7e9ea]">
              {sections.find(s => s.id === activeSection)?.label || activeSection}
            </h2>
          </div>

          <div className="p-4">
            {activeSection === 'account' && (
              <div className="flex flex-col gap-5 max-w-lg">
                <p className="text-[#71767b] text-sm">Gestiona la información de tu cuenta.</p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#e7e9ea]">Nombre</label>
                  <Input
                    value={profileForm.displayName}
                    onChange={e => setProfileForm(p => ({ ...p, displayName: e.target.value }))}
                    className="h-12"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#e7e9ea]">Biografía</label>
                  <textarea
                    className="post-input border border-dark-border rounded-xl p-3 min-h-[100px] bg-dark-input"
                    value={profileForm.bio}
                    onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                    maxLength={160}
                  />
                  <p className="text-[#71767b] text-xs text-right">{profileForm.bio.length}/160</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#e7e9ea]">Ubicación</label>
                  <Input
                    value={profileForm.location}
                    onChange={e => setProfileForm(p => ({ ...p, location: e.target.value }))}
                    className="h-12"
                    placeholder="Ciudad, País"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#e7e9ea]">Sitio web</label>
                  <Input
                    value={profileForm.website}
                    onChange={e => setProfileForm(p => ({ ...p, website: e.target.value }))}
                    className="h-12"
                    placeholder="https://tusitio.com"
                  />
                </div>
                <Button onClick={handleSaveProfile} className="w-fit px-6">
                  {saved ? '✓ Guardado' : 'Guardar cambios'}
                </Button>
              </div>
            )}

            {activeSection === 'appearance' && (
              <div className="flex flex-col gap-6 max-w-lg">
                <p className="text-[#71767b] text-sm">Personaliza cómo se ve TClone para ti.</p>
                <div className="flex items-center justify-between p-4 bg-dark-surface rounded-2xl">
                  <div className="flex items-center gap-3">
                    {isDark ? <Moon className="w-5 h-5 text-brand" /> : <Sun className="w-5 h-5 text-brand" />}
                    <div>
                      <p className="font-medium text-[#e7e9ea]">Modo {isDark ? 'oscuro' : 'claro'}</p>
                      <p className="text-[#71767b] text-sm">Cambia el tema de la interfaz</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors',
                      isDark ? 'bg-brand' : 'bg-[#71767b]'
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                      isDark ? 'translate-x-6' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>
                <div className="p-4 bg-dark-surface rounded-2xl">
                  <p className="font-medium text-[#e7e9ea] mb-3">Color de acento</p>
                  <div className="flex gap-3">
                    {['#6366f1','#2563eb','#0891b2','#059669','#d97706','#dc2626','#9333ea'].map(color => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded-full border-2 border-transparent hover:border-white transition-colors"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="flex flex-col gap-4 max-w-lg">
                <p className="text-[#71767b] text-sm">Elige qué notificaciones quieres recibir.</p>
                {[
                  { label: 'Me gusta en mis posts', key: 'likes' },
                  { label: 'Reposts de mis posts', key: 'retweets' },
                  { label: 'Respuestas a mis posts', key: 'replies' },
                  { label: 'Nuevos seguidores', key: 'follows' },
                  { label: 'Menciones', key: 'mentions' },
                  { label: 'Mensajes directos', key: 'dms' },
                ].map(({ label, key }) => (
                  <NotificationToggle key={key} label={label} />
                ))}
              </div>
            )}

            {!['account', 'appearance', 'notifications'].includes(activeSection) && (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center mb-4">
                  {(() => { const s = sections.find(x => x.id === activeSection); return s ? <s.icon className="w-8 h-8 text-brand" /> : null })()}
                </div>
                <p className="text-xl font-bold text-[#e7e9ea] mb-2">
                  {sections.find(s => s.id === activeSection)?.label}
                </p>
                <p className="text-[#71767b]">Esta sección se conectará con tu backend.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <p className="text-[#71767b]">Selecciona una sección de configuración.</p>
        </div>
      )}
    </div>
  )
}

function NotificationToggle({ label }) {
  const [enabled, setEnabled] = useState(true)
  return (
    <div className="flex items-center justify-between p-4 bg-dark-surface rounded-2xl">
      <span className="text-[#e7e9ea]">{label}</span>
      <button
        onClick={() => setEnabled(e => !e)}
        className={cn('relative w-12 h-6 rounded-full transition-colors', enabled ? 'bg-brand' : 'bg-[#2f3336]')}
      >
        <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', enabled ? 'translate-x-6' : 'translate-x-0.5')} />
      </button>
    </div>
  )
}
