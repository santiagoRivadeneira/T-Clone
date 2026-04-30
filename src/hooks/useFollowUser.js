import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useFollowUser() {
  const queryClient = useQueryClient()

  async function toggleFollow(username, currentlyFollowing) {
    try {
      if (currentlyFollowing) {
        await api.users.unfollow(username)
      } else {
        await api.users.follow(username)
      }
      queryClient.invalidateQueries({ queryKey: ['user', username] })
    } catch {
      // Optimistic update already applied by caller
    }
  }

  return { toggleFollow }
}
