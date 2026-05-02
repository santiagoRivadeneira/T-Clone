import { useState, useRef } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, ArrowUp } from 'lucide-react'
import PostCard from '@/components/post/PostCard'
import PostComposer from '@/components/post/PostComposer'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useTimelineSSE } from '@/hooks/useTimelineSSE'
import { useSSE } from '@/context/SSEContext'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'

async function fetchFeedPage({ pageParam = null }) {
  const data = await api.tweets.timeline(pageParam)
  return { tweets: data.tweets, nextPage: data.nextCursor }
}

export default function Home() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('for-you')
  const loaderRef = useRef(null)

  const avatarUrl = user?.avatarUrl ?? user?.avatar

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['feed', activeTab],
    queryFn: fetchFeedPage,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled: activeTab === 'following',
  })

  useInfiniteScroll({ sentinelRef: loaderRef, fetchNextPage, hasNextPage, isFetchingNextPage })

  const allPosts = data?.pages.flatMap(p => p.tweets) ?? []

  const [pendingTweets, setPendingTweets] = useState([])

  useTimelineSSE((tweet) => {
    setPendingTweets(prev => [tweet, ...prev])
  })

  useSSE('delete-tweet', ({ id }) => {
    queryClient.setQueryData(['feed', 'following'], (old) => {
      if (!old?.pages) return old
      return {
        ...old,
        pages: old.pages.map(page => ({
          ...page,
          tweets: page.tweets.filter(t => t.id !== id),
        })),
      }
    })
    setPendingTweets(prev => prev.filter(t => t.id !== id))
  })

  function handleShowNew() {
    queryClient.setQueryData(['feed', 'following'], (old) => {
      if (!old?.pages?.length) return old
      const [first, ...rest] = old.pages
      return {
        ...old,
        pages: [{ ...first, tweets: [...pendingTweets, ...first.tweets] }, ...rest],
      }
    })
    setPendingTweets([])
  }

  function handleNewPost() {
    queryClient.invalidateQueries({ queryKey: ['feed'] })
    setPendingTweets([])
  }

  return (
    <div className="pb-16 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-blur-header backdrop-blur-md border-b border-dark-border">
        <div className="flex">
          {['for-you', 'following'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-item ${activeTab === tab ? 'active' : ''}`}
            >
              {tab === 'for-you' ? 'Para ti' : 'Siguiendo'}
            </button>
          ))}
        </div>
      </div>

      {/* New tweets banner */}
      {pendingTweets.length > 0 && activeTab === 'following' && (
        <button
          onClick={handleShowNew}
          className="w-full py-3 text-brand text-sm font-medium hover:bg-brand/5 transition-colors border-b border-dark-border flex items-center justify-center gap-2"
        >
          <ArrowUp className="w-4 h-4" />
          {pendingTweets.length === 1 ? '1 nuevo tweet' : `${pendingTweets.length} nuevos tweets`}
        </button>
      )}

      {/* Composer inline */}
      <div className="border-b border-dark-border hidden md:flex">
        <PostComposer minimal onPost={handleNewPost} />
      </div>

      {/* Tab: Para ti — static placeholder (no personalized feed without ML) */}
      {activeTab === 'for-you' && (
        <div className="flex flex-col items-center py-20 px-8 text-center">
          <p className="text-2xl font-bold text-[#e7e9ea] mb-2">Bienvenido</p>
          <p className="text-[#71767b]">
            Seguí a usuarios para ver sus tweets aquí, o cambiá a <strong className="text-[#e7e9ea]">Siguiendo</strong>.
          </p>
        </div>
      )}

      {/* Tab: Siguiendo — real timeline */}
      {activeTab === 'following' && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-brand animate-spin" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center py-20 text-center px-8">
              <p className="text-[#e7e9ea] font-bold mb-1">No se pudo cargar el timeline</p>
              <p className="text-[#71767b] text-sm">Verificá tu conexión e intentá de nuevo.</p>
            </div>
          ) : allPosts.length === 0 ? (
            <div className="flex flex-col items-center py-20 px-8 text-center">
              <p className="text-2xl font-bold text-[#e7e9ea] mb-2">Tu timeline está vacío</p>
              <p className="text-[#71767b]">Seguí a usuarios para ver sus tweets aquí.</p>
            </div>
          ) : (
            allPosts.map(post => <PostCard key={post.id} post={post} />)
          )}

          {/* Infinite scroll sentinel */}
          <div ref={loaderRef} className="flex justify-center py-6">
            {isFetchingNextPage && <Loader2 className="w-5 h-5 text-brand animate-spin" />}
            {!hasNextPage && allPosts.length > 0 && (
              <p className="text-[#71767b] text-sm">Ya viste todo por hoy 🎉</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
