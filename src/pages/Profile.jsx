import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, MapPin, Link2, Loader2 } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import PostCard from '@/components/post/PostCard'
import { useAuth } from '@/context/AuthContext'
import { formatCount } from '@/lib/utils'
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'

const TABS = [
  { key: 'posts', label: 'Posts' },
  { key: 'followers', label: 'Seguidores' },
  { key: 'following', label: 'Siguiendo' },
]

function UserListItem({ u }) {
  const navigate = useNavigate()
  const avatarUrl = u.avatarUrl ?? u.avatar
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-dark-hover cursor-pointer transition-colors border-b border-dark-border"
      onClick={() => navigate(`/${u.username}`)}
    >
      <Avatar className="w-10 h-10 flex-shrink-0">
        <AvatarImage src={avatarUrl} alt={u.displayName} />
        <AvatarFallback>{u.displayName[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#e7e9ea] text-sm truncate">{u.displayName}</p>
        <p className="text-[#71767b] text-sm truncate">@{u.username}</p>
        {u.bio && <p className="text-[#71767b] text-sm truncate mt-0.5">{u.bio}</p>}
      </div>
    </div>
  )
}

export default function Profile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('posts')
  const loaderRef = useRef(null)

  // User profile
  const { data: profileData, isLoading: profileLoading, isError: profileError } = useQuery({
    queryKey: ['user', username],
    queryFn: () => api.users.profile(username),
    staleTime: 30_000,
  })
  const profileUser = profileData?.user

  // Tweets (infinite)
  const {
    data: tweetsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: tweetsLoading,
  } = useInfiniteQuery({
    queryKey: ['user-tweets', username],
    queryFn: ({ pageParam = null }) => api.users.tweets(username, pageParam),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: activeTab === 'posts',
  })

  // Followers list
  const { data: followersData, isLoading: followersLoading } = useQuery({
    queryKey: ['followers', username],
    queryFn: () => api.users.followers(username),
    enabled: activeTab === 'followers',
  })

  // Following list
  const { data: followingData, isLoading: followingLoading } = useQuery({
    queryKey: ['following', username],
    queryFn: () => api.users.following(username),
    enabled: activeTab === 'following',
  })

  useInfiniteScroll({ sentinelRef: loaderRef, fetchNextPage, hasNextPage, isFetchingNextPage })

  function patchProfileCache(nextFollowing) {
    queryClient.setQueryData(['user', username], (old) => {
      if (!old?.user) return old
      const prev = old.user.isFollowing
      const delta = nextFollowing === prev ? 0 : (nextFollowing ? 1 : -1)
      return {
        ...old,
        user: {
          ...old.user,
          isFollowing: nextFollowing,
          _count: {
            ...(old.user._count || {}),
            followers: (old.user._count?.followers ?? 0) + delta,
          },
        },
      }
    })
  }

  function patchCurrentUserFollowingCount(delta) {
    queryClient.setQueryData(['user', currentUser?.username], (old) => {
      if (!old?.user) return old
      return {
        ...old,
        user: {
          ...old.user,
          _count: {
            ...(old.user._count || {}),
            following: (old.user._count?.following ?? 0) + delta,
          },
        },
      }
    })
  }

  async function handleFollowToggle() {
    if (!profileUser) return
    const wasFollowing = profileUser.isFollowing ?? false
    patchProfileCache(!wasFollowing)
    patchCurrentUserFollowingCount(wasFollowing ? -1 : 1)
    try {
      if (wasFollowing) await api.users.unfollow(profileUser.username)
      else await api.users.follow(profileUser.username)
      queryClient.invalidateQueries({ queryKey: ['followers', username] })
      queryClient.invalidateQueries({ queryKey: ['following', currentUser?.username] })
    } catch {
      patchProfileCache(wasFollowing)
      patchCurrentUserFollowingCount(wasFollowing ? 1 : -1)
    }
  }

  if (profileLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 text-brand animate-spin" />
      </div>
    )
  }

  if (profileError || !profileUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-2xl font-bold text-[#e7e9ea]">Esta cuenta no existe</p>
        <p className="text-[#71767b]">Intenta buscar otra cosa.</p>
        <Button onClick={() => navigate('/')} variant="outline">Volver al inicio</Button>
      </div>
    )
  }

  const isOwn = profileUser.id === currentUser?.id
  const isFollowing = profileUser.isFollowing ?? false
  const allTweets = tweetsData?.pages.flatMap(p => p.tweets) ?? []
  const avatarUrl = profileUser.avatarUrl ?? profileUser.avatar

  return (
    <div className="pb-16 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md px-4 py-3 flex items-center gap-6 border-b border-dark-border">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-dark-hover transition-colors text-[#e7e9ea]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#e7e9ea] leading-tight">{profileUser.displayName}</h1>
          <p className="text-[#71767b] text-sm">{formatCount(profileUser._count?.tweets ?? 0)} posts</p>
        </div>
      </div>

      {/* Banner */}
      <div className="h-48 bg-gradient-to-br from-brand-800 to-brand-600" />

      {/* Profile info */}
      <div className="px-4 pb-4">
        <div className="flex items-start justify-between -mt-12 mb-3">
          <Avatar className="w-24 h-24 border-4 border-black">
            <AvatarImage src={avatarUrl} alt={profileUser.displayName} />
            <AvatarFallback className="text-2xl">{profileUser.displayName[0]}</AvatarFallback>
          </Avatar>
          <div className="mt-14">
            {isOwn ? (
              <Button variant="outline" size="sm" className="font-bold" data-testid="edit-profile-btn" onClick={() => navigate('/settings/account')}>
                Editar perfil
              </Button>
            ) : (
              <Button
                variant={isFollowing ? 'unfollow' : 'follow'}
                size="sm"
                className="font-bold"
                onClick={handleFollowToggle}
                data-testid="follow-btn"
              >
                {isFollowing ? 'Siguiendo' : 'Seguir'}
              </Button>
            )}
          </div>
        </div>

        <div className="mb-3">
          <h2 className="text-xl font-bold text-[#e7e9ea]">{profileUser.displayName}</h2>
          <p className="text-[#71767b]">@{profileUser.username}</p>
        </div>

        {profileUser.bio && (
          <p className="text-[#e7e9ea] mb-3 leading-relaxed">{profileUser.bio}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[#71767b] text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>
              Se unió en{' '}
              {new Date(profileUser.createdAt).toLocaleDateString('es-ES', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        <div className="flex gap-5 text-sm">
          <button className="hover:underline" onClick={() => setActiveTab('following')}>
            <span className="font-bold text-[#e7e9ea]">{formatCount(profileUser._count?.following ?? 0)}</span>
            <span className="text-[#71767b] ml-1">Siguiendo</span>
          </button>
          <button className="hover:underline" onClick={() => setActiveTab('followers')}>
            <span className="font-bold text-[#e7e9ea]">{formatCount(profileUser._count?.followers ?? 0)}</span>
            <span className="text-[#71767b] ml-1">Seguidores</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dark-border sticky top-[57px] z-20 bg-black">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts tab */}
      {activeTab === 'posts' && (
        <>
          {tweetsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-brand animate-spin" />
            </div>
          ) : allTweets.length === 0 ? (
            <div className="flex flex-col items-center py-20 px-8 text-center">
              <p className="text-2xl font-bold text-[#e7e9ea] mb-2">Sin posts aún</p>
              <p className="text-[#71767b]">Cuando publique algo, aparecerá aquí.</p>
            </div>
          ) : (
            allTweets.map(post => <PostCard key={post.id} post={post} />)
          )}
          <div ref={loaderRef} className="flex justify-center py-4">
            {isFetchingNextPage && <Loader2 className="w-5 h-5 text-brand animate-spin" />}
          </div>
        </>
      )}

      {/* Followers tab */}
      {activeTab === 'followers' && (
        followersLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>
        ) : followersData?.users?.length === 0 ? (
          <div className="flex flex-col items-center py-20 px-8 text-center">
            <p className="text-2xl font-bold text-[#e7e9ea] mb-2">Sin seguidores aún</p>
          </div>
        ) : (
          followersData?.users?.map(u => <UserListItem key={u.id} u={u} />)
        )
      )}

      {/* Following tab */}
      {activeTab === 'following' && (
        followingLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>
        ) : followingData?.users?.length === 0 ? (
          <div className="flex flex-col items-center py-20 px-8 text-center">
            <p className="text-2xl font-bold text-[#e7e9ea] mb-2">No sigue a nadie aún</p>
          </div>
        ) : (
          followingData?.users?.map(u => <UserListItem key={u.id} u={u} />)
        )
      )}
    </div>
  )
}
