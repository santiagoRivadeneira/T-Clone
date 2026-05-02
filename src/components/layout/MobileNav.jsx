import { NavLink } from 'react-router-dom'
import { Home, Search, Bell, Mail, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const items = [
  { to: '/',              icon: Home,   exact: true },
  { to: '/explore',       icon: Search },
  { to: '/notifications', icon: Bell },
  { to: '/messages',      icon: Mail },
]

export default function MobileNav() {
  const { user } = useAuth()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-dark-bg border-t border-dark-border flex items-center justify-around px-2 h-14">
      {items.map(({ to, icon: Icon, exact }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          className={({ isActive }) =>
            cn('flex items-center justify-center w-12 h-12 rounded-full transition-colors',
              isActive ? 'text-[#e7e9ea]' : 'text-[#71767b] hover:bg-dark-hover')
          }
        >
          <Icon className="w-6 h-6" />
        </NavLink>
      ))}
      <NavLink
        to={`/${user?.username}`}
        className={({ isActive }) =>
          cn('flex items-center justify-center w-12 h-12 rounded-full transition-colors',
            isActive ? 'text-[#e7e9ea]' : 'text-[#71767b] hover:bg-dark-hover')
        }
      >
        <User className="w-6 h-6" />
      </NavLink>
    </nav>
  )
}
