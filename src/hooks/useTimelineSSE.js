import { useSSE } from '@/context/SSEContext'

export function useTimelineSSE(onNewTweet) {
  useSSE('new-tweet', onNewTweet)
}
