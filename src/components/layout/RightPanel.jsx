import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { MOCK_TRENDING } from '@/data/mockData'
import { formatCount } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export default function RightPanel() {
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

  // Suggestions: pull users from search with empty term won't work — use a small list of seed users
  const { data: suggestions } = useQuery({
    queryKey: ['who-to-follow'],
    queryFn: () => api.users.search('a'),
    staleTime: 60_000,
  })

  const whoToFollow = (suggestions?.users ?? [])
    .filter(u => u.id !== user?.id)
    .slice(0, 3)

  return (
    <aside className="hidden lg:flex flex-col w-[350px] xl:w-[390px] pl-8 py-2 sticky top-0 h-screen overflow-y-auto flex-shrink-0">
      {/* Search */}
      <div className="relative mb-4 mt-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71767b]" />
        <Input
          placeholder="Buscar"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-11 rounded-full bg-dark-input border-transparent focus:border-brand h-11"
          onKeyDown={e => {
            if (e.key === 'Enter' && searchQuery.trim()) {
              navigate('/explore')
            }
          }}
        />
      </div>

      {/* Trending */}
      <div className="bg-dark-surface rounded-2xl mb-4 overflow-hidden">
        <h2 className="text-xl font-bold text-[#e7e9ea] p-4">Tendencias para ti</h2>
        {MOCK_TRENDING.map((trend, idx) => (
          <div
            key={trend.id}
            className="px-4 py-3 hover:bg-dark-hover cursor-pointer transition-colors"
          >
            <p className="text-xs text-[#71767b]">{trend.category} · Tendencia</p>
            <p className="font-bold text-[#e7e9ea] text-sm mt-0.5">{trend.tag}</p>
            <p className="text-xs text-[#71767b] mt-0.5">{formatCount(trend.postsCount)} posts</p>
          </div>
        ))}
        <button
          onClick={() => navigate('/explore')}
          className="w-full px-4 py-4 text-brand text-sm hover:bg-dark-hover transition-colors text-left"
        >
          Ver más
        </button>
      </div>

      {/* Who to follow */}
      <div className="bg-dark-surface rounded-2xl overflow-hidden">
        <h2 className="text-xl font-bold text-[#e7e9ea] p-4">A quién seguir</h2>
        {whoToFollow.map(u => (
          <WhoToFollowItem key={u.id} user={u} />
        ))}
        <button
          className="w-full px-4 py-4 text-brand text-sm hover:bg-dark-hover transition-colors text-left"
        >
          Ver más
        </button>
      </div>

      {/* Footer links */}
      <div className="mt-4 px-1 flex flex-wrap gap-x-2 gap-y-1">
        {['Términos', 'Privacidad', 'Cookies', 'Accesibilidad', 'Anuncios'].map(t => (
          <span key={t} className="text-xs text-[#71767b] hover:underline cursor-pointer">{t}</span>
        ))}
        <span className="text-xs text-[#71767b]">© 2024 TClone</span>
      </div>
    </aside>
  )
}

function WhoToFollowItem({ user }) {
  const [following, setFollowing] = useState(user.isFollowing ?? false)
  const [pending, setPending] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const avatarUrl = user.avatarUrl ?? user.avatar

  // Sync with server state when query refetches
  useEffect(() => {
    if (!pending) setFollowing(user.isFollowing ?? false)
  }, [user.isFollowing])

  async function handleClick(e) {
    e.stopPropagation()
    if (pending) return
    const wasFollowing = following
    setFollowing(!wasFollowing)
    setPending(true)
    // Patch current user's following count immediately
    queryClient.setQueryData(['user', currentUser?.username], (old) => {
      if (!old?.user) return old
      return {
        ...old,
        user: {
          ...old.user,
          _count: {
            ...(old.user._count || {}),
            following: (old.user._count?.following ?? 0) + (wasFollowing ? -1 : 1),
          },
        },
      }
    })
    try {
      if (wasFollowing) await api.users.unfollow(user.username)
      else await api.users.follow(user.username)
      queryClient.setQueryData(['who-to-follow'], (old) => {
        if (!old?.users) return old
        return {
          ...old,
          users: old.users.map(u =>
            u.id === user.id ? { ...u, isFollowing: !wasFollowing } : u
          ),
        }
      })
      queryClient.invalidateQueries({ queryKey: ['user', user.username] })
      queryClient.invalidateQueries({ queryKey: ['following', currentUser?.username] })
    } catch (err) {
      setFollowing(wasFollowing)
      // Rollback count
      queryClient.setQueryData(['user', currentUser?.username], (old) => {
        if (!old?.user) return old
        return {
          ...old,
          user: {
            ...old.user,
            _count: {
              ...(old.user._count || {}),
              following: (old.user._count?.following ?? 0) + (wasFollowing ? 1 : -1),
            },
          },
        }
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-dark-hover transition-colors">
      <Avatar
        className="w-10 h-10 cursor-pointer flex-shrink-0"
        onClick={() => navigate(`/${user.username}`)}
      >
        <AvatarImage src={avatarUrl} alt={user.displayName} />
        <AvatarFallback>{user.displayName[0]}</AvatarFallback>
      </Avatar>
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => navigate(`/${user.username}`)}
      >
        <p className="text-sm font-bold text-[#e7e9ea] truncate leading-tight">{user.displayName}</p>
        <p className="text-sm text-[#71767b] truncate">@{user.username}</p>
      </div>
      <Button
        variant={following ? 'unfollow' : 'follow'}
        size="sm"
        className="flex-shrink-0 text-sm h-8"
        onClick={handleClick}
        disabled={pending}
      >
        {following ? 'Siguiendo' : 'Seguir'}
      </Button>
    </div>
  )
}
