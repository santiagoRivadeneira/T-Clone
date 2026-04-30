import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, UserPlus, Repeat2, MessageCircle, Bell, Loader2 } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useSSE } from '@/context/SSEContext'
import { formatTimeAgo, cn } from '@/lib/utils'

const TYPE_CONFIG = {
  LIKE:    { icon: Heart,         color: 'text-pink-500',    bg: 'bg-pink-500/20',    label: 'le dio me gusta a tu post' },
  RETWEET: { icon: Repeat2,       color: 'text-emerald-500', bg: 'bg-emerald-500/20', label: 'reposteó tu post' },
  FOLLOW:  { icon: UserPlus,      color: 'text-brand',       bg: 'bg-brand/20',       label: 'empezó a seguirte' },
  REPLY:   { icon: MessageCircle, color: 'text-brand',       bg: 'bg-brand/20',       label: 'respondió tu post' },
}

export default function Notifications() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.list(),
  })

  const [localNotifs, setLocalNotifs] = useState(null)
  useEffect(() => {
    if (data?.notifications) setLocalNotifs(data.notifications)
  }, [data?.notifications])

  // Mark all as read when the page is visited
  useEffect(() => {
    api.notifications.markRead().then(() => {
      queryClient.setQueryData(['notif-unread-count'], { count: 0 })
    })
  }, [])

  // Receive new notifications via SSE and prepend them
  useSSE('new-notification', (notif) => {
    setLocalNotifs(prev => (prev ? [notif, ...prev] : [notif]))
    queryClient.setQueryData(['notif-unread-count'], (old) => ({ count: (old?.count ?? 0) + 1 }))
  })

  const notifications = localNotifs ?? data?.notifications ?? []

  function handleClick(notif) {
    if (notif.type === 'FOLLOW') navigate(`/${notif.actor.username}`)
    else if (notif.tweet) navigate(`/${notif.actor.username}/status/${notif.tweet.id}`)
  }

  return (
    <div className="pb-16 md:pb-0">
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-dark-border px-4 py-3">
        <h1 className="text-xl font-bold text-[#e7e9ea]">Notificaciones</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-brand animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center py-24 px-8 text-center gap-4">
          <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center">
            <Bell className="w-8 h-8 text-brand" />
          </div>
          <h2 className="text-2xl font-bold text-[#e7e9ea]">Sin notificaciones</h2>
          <p className="text-[#71767b] max-w-xs">Cuando alguien interactúe contigo, aparecerá aquí.</p>
        </div>
      ) : (
        notifications.map(notif => {
          const cfg = TYPE_CONFIG[notif.type]
          const Icon = cfg?.icon
          return (
            <div
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={cn(
                'flex gap-3 px-4 py-4 border-b border-dark-border hover:bg-dark-hover cursor-pointer transition-colors',
                !notif.read && 'bg-brand/5'
              )}
            >
              <div className="flex-shrink-0 w-10 flex justify-end pt-1">
                <div className={cn('w-9 h-9 rounded-full flex items-center justify-center', cfg?.bg)}>
                  {Icon && <Icon className={cn('w-5 h-5', cfg?.color)} />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <Avatar className="w-9 h-9 mb-2">
                  <AvatarImage src={notif.actor.avatarUrl} alt={notif.actor.displayName} />
                  <AvatarFallback>{notif.actor.displayName[0]}</AvatarFallback>
                </Avatar>
                <p className="text-[#e7e9ea] text-sm">
                  <span className="font-bold hover:underline">{notif.actor.displayName}</span>
                  {' '}
                  <span className="text-[#71767b]">{cfg?.label}</span>
                  {' '}
                  <span className="text-[#71767b] text-xs ml-1">{formatTimeAgo(notif.createdAt)}</span>
                </p>
                {notif.tweet?.content && (
                  <p className="text-[#71767b] text-sm mt-1 truncate">{notif.tweet.content}</p>
                )}
                {!notif.read && (
                  <span className="inline-block w-2 h-2 rounded-full bg-brand mt-1" />
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
