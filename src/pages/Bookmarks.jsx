import { useRef } from 'react'
import { Bookmark, Loader2 } from 'lucide-react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import PostCard from '@/components/post/PostCard'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'

export default function Bookmarks() {
  const loaderRef = useRef(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['bookmarks'],
    queryFn: ({ pageParam = null }) => api.tweets.bookmarks(pageParam),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })

  useInfiniteScroll({ sentinelRef: loaderRef, fetchNextPage, hasNextPage, isFetchingNextPage })

  const tweets = data?.pages.flatMap(p => p.tweets) ?? []

  return (
    <div className="pb-16 md:pb-0">
      <div className="sticky top-0 z-30 bg-blur-header backdrop-blur-md border-b border-dark-border px-4 py-3">
        <h1 className="text-xl font-bold text-[#e7e9ea]">Guardados</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-brand animate-spin" />
        </div>
      ) : tweets.length === 0 ? (
        <div className="flex flex-col items-center py-24 px-8 text-center gap-4">
          <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center">
            <Bookmark className="w-8 h-8 text-brand" />
          </div>
          <h2 className="text-2xl font-bold text-[#e7e9ea]">Sin guardados</h2>
          <p className="text-[#71767b] max-w-xs">Guarda posts para verlos más tarde.</p>
        </div>
      ) : (
        <>
          {tweets.map(tweet => (
            <PostCard key={tweet.id} post={tweet} />
          ))}
          <div ref={loaderRef} className="py-4 flex justify-center">
            {isFetchingNextPage && <Loader2 className="w-5 h-5 text-brand animate-spin" />}
          </div>
        </>
      )}
    </div>
  )
}
