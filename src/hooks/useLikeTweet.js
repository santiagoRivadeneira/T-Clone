import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCallback } from 'react'

export function useLikeTweet() {
  const queryClient = useQueryClient()

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['feed'] })
    queryClient.invalidateQueries({ queryKey: ['tweet'] })
    queryClient.invalidateQueries({ queryKey: ['user-tweets'] })
  }, [queryClient])

  async function toggleLike(tweetId, currentlyLiked) {
    try {
      if (currentlyLiked) {
        await api.tweets.unlike(tweetId)
      } else {
        await api.tweets.like(tweetId)
      }
      invalidate()
    } catch {
      // Optimistic update already applied by caller — no rollback needed
      // unless caller implements it explicitly
    }
  }

  return { toggleLike }
}
