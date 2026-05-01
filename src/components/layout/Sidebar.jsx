import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home, Search, Bell, Mail, Bookmark, User, Settings,
  MoreHorizontal, LogOut, Sun, Moon, Feather,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useSSE } from '@/context/SSEContext'
import PostComposer from '@/components/post/PostComposer'

const navItems = [
  { to: '/',              icon: Home,     label: 'Inicio',         exact: true },
  { to: '/explore',       icon: Search,   label: 'Explorar' },
  { to: '/messages',      icon: Mail,     label: 'Mensajes' },
  { to: '/bookmarks',     icon: Bookmark, label: 'Guardados' },
  { to: '/settings',      icon: Settings, label: 'Configuración' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [composerOpen, setComposerOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: unreadData } = useQuery({
    queryKey: ['notif-unread-count'],
    queryFn: api.notifications.unreadCount,
    staleTime: 60_000,
  })
  const unreadCount = unreadData?.count ?? 0

  const { data: msgUnreadData } = useQuery({
    queryKey: ['msg-unread-count'],
    queryFn: api.messages.unreadCount,
    staleTime: 60_000,
  })
  const msgUnreadCount = msgUnreadData?.count ?? 0

  useSSE('new-notification', () => {
    queryClient.setQueryData(['notif-unread-count'], (old) => ({ count: (old?.count ?? 0) + 1 }))
  })

  useSSE('new-message', () => {
    queryClient.setQueryData(['msg-unread-count'], (old) => ({ count: (old?.count ?? 0) + 1 }))
  })

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <>
      <aside className="fixed top-0 left-0 h-screen hidden md:flex flex-col items-end xl:w-[275px] lg:w-[88px] w-[88px] pr-2 xl:pr-3 py-2 z-40">
        <div className="flex flex-col h-full xl:w-[240px] w-14">
          {/* Logo */}
          <NavLink
            to="/"
            className="flex items-center justify-center xl:justify-start p-3 mb-1 rounded-full hover:bg-dark-hover w-fit transition-colors"
          >
            <div className="w-8 h-8 bg-brand rounded-full flex items-center justify-center flex-shrink-0">
              <Feather className="w-4 h-4 text-white" />
            </div>
            <span className="hidden xl:block ml-3 text-xl font-black text-[#e7e9ea]">
              TClone
            </span>
          </NavLink>

          {/* Nav items */}
          <nav className="flex flex-col gap-1 mb-4">
            {/* Inicio + Explorar */}
            {navItems.slice(0, 2).map(({ to, icon: Icon, label, exact }) => (
              <NavLink key={to} to={to} end={exact} className={({ isActive }) => cn('nav-item', isActive && 'active')}>
                <Icon className="sidebar-icon" />
                <span className="hidden xl:block text-[17px]">{label}</span>
              </NavLink>
            ))}

            {/* Notificaciones — with unread badge */}
            <NavLink
              to="/notifications"
              className={({ isActive }) => cn('nav-item', isActive && 'active')}
              onClick={() => queryClient.setQueryData(['notif-unread-count'], { count: 0 })}
            >
              <span className="relative">
                <Bell className="sidebar-icon" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>
              <span className="hidden xl:block text-[17px]">Notificaciones</span>
            </NavLink>

            {/* Mensajes — with unread badge */}
            <NavLink
              to="/messages"
              className={({ isActive }) => cn('nav-item', isActive && 'active')}
              onClick={() => queryClient.setQueryData(['msg-unread-count'], { count: 0 })}
            >
              <span className="relative">
                <Mail className="sidebar-icon" />
                {msgUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {msgUnreadCount > 99 ? '99+' : msgUnreadCount}
                  </span>
                )}
              </span>
              <span className="hidden xl:block text-[17px]">Mensajes</span>
            </NavLink>

            {/* Resto de items */}
            {navItems.slice(3).map(({ to, icon: Icon, label, exact }) => (
              <NavLink key={to} to={to} end={exact} className={({ isActive }) => cn('nav-item', isActive && 'active')}>
                <Icon className="sidebar-icon" />
                <span className="hidden xl:block text-[17px]">{label}</span>
              </NavLink>
            ))}
            <NavLink
              to={`/${user?.username}`}
              className={({ isActive }) =>
                cn('nav-item', isActive && 'active')
              }
            >
              <User className="sidebar-icon" />
              <span className="hidden xl:block text-[17px]">Perfil</span>
            </NavLink>
          </nav>

          {/* Post button */}
          <Button
            onClick={() => setComposerOpen(true)}
            className="xl:w-full w-12 h-12 xl:h-[52px] rounded-full text-base font-bold"
          >
            <Feather className="xl:hidden w-5 h-5" />
            <span className="hidden xl:block">Publicar</span>
          </Button>

          {/* User menu */}
          <div className="mt-auto mb-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-3 rounded-full hover:bg-dark-hover transition-colors w-full xl:w-auto">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={user?.avatarUrl ?? user?.avatar} alt={user?.displayName} />
                    <AvatarFallback>{user?.displayName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="hidden xl:flex flex-col items-start flex-1 min-w-0">
                    <span className="text-sm font-bold text-[#e7e9ea] truncate w-full">{user?.displayName}</span>
                    <span className="text-sm text-[#71767b] truncate w-full">@{user?.username}</span>
                  </div>
                  <MoreHorizontal className="hidden xl:block w-4 h-4 text-[#71767b] flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-64">
                <DropdownMenuItem onClick={toggleTheme} className="gap-3">
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {isDark ? 'Modo claro' : 'Modo oscuro'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="gap-3 text-red-400">
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión @{user?.username}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      <PostComposer open={composerOpen} onClose={() => setComposerOpen(false)} />
    </>
  )
}
