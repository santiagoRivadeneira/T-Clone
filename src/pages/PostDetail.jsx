import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, MessageCircle, Repeat2, BarChart2, Bookmark, Share, Loader2 } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import PostCard from '@/components/post/PostCard'
import PostComposer from '@/components/post/PostComposer'
import { formatCount, formatFullDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export default function PostDetail() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [liked, setLiked] = useState(null) // null = use server value
  const [retweeted, setRetweeted] = useState(null)
  const [bookmarked, setBookmarked] = useState(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tweet', postId],
    queryFn: () => api.tweets.get(postId),
  })

  const post = data?.tweet

  const isLiked = liked !== null ? liked : post?.liked ?? false
  const isRetweeted = retweeted !== null ? retweeted : post?.retweeted ?? false
  const isBookmarked = bookmarked !== null ? bookmarked : post?.bookmarked ?? false

  const likesCount = (post?.likesCount ?? 0) + (
    liked !== null ? (liked ? 1 : -1) - (post?.liked ? 1 : 0) : 0
  )
  const displayRetweetsCount = (post?.retweetsCount ?? 0) + (
    retweeted !== null ? (retweeted ? 1 : -1) - (post?.retweeted ? 1 : 0) : 0
  )

  async function handleLike() {
    if (!post) return
    const wasLiked = isLiked
    setLiked(!wasLiked)
    try {
      if (wasLiked) await api.tweets.unlike(post.id)
      else await api.tweets.like(post.id)
      queryClient.setQueryData(['tweet', postId], old =>
        old ? { ...old, tweet: { ...old.tweet, liked: !wasLiked } } : old
      )
    } catch {
      setLiked(wasLiked)
    }
  }

  async function handleRetweet() {
    if (!post) return
    const wasRetweeted = isRetweeted
    setRetweeted(!wasRetweeted)
    try {
      if (wasRetweeted) await api.tweets.unretweet(post.id)
      else await api.tweets.retweet(post.id)
      queryClient.setQueryData(['tweet', postId], old =>
        old ? { ...old, tweet: { ...old.tweet, retweeted: !wasRetweeted } } : old
      )
    } catch {
      setRetweeted(wasRetweeted)
    }
  }

  async function handleBookmark() {
    if (!post) return
    const wasBookmarked = isBookmarked
    setBookmarked(!wasBookmarked)
    try {
      if (wasBookmarked) await api.tweets.unbookmark(post.id)
      else await api.tweets.bookmark(post.id)
      queryClient.setQueryData(['tweet', postId], old =>
        old ? { ...old, tweet: { ...old.tweet, bookmarked: !wasBookmarked } } : old
      )
    } catch {
      setBookmarked(wasBookmarked)
    }
  }

  function handleNewReply(newReply) {
    // Patch the cache directly to avoid race with refetch invalidation
    queryClient.setQueryData(['tweet', postId], (old) => {
      if (!old?.tweet) return old
      const existing = old.tweet.replies?.some(r => r.id === newReply.id)
      if (existing) return old
      return {
        ...old,
        tweet: {
          ...old.tweet,
          replies: [...(old.tweet.replies || []), newReply],
          repliesCount: (old.tweet.repliesCount ?? 0) + 1,
        },
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 text-brand animate-spin" />
      </div>
    )
  }

  if (isError || !post) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-2xl font-bold text-[#e7e9ea]">Post no encontrado</p>
        <Button onClick={() => navigate('/')} variant="outline">Volver al inicio</Button>
      </div>
    )
  }

  const avatarUrl = post.author.avatarUrl ?? post.author.avatar
  const allReplies = post.replies ?? []

  return (
    <div className="pb-16 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-blur-header backdrop-blur-md px-4 py-3 flex items-center gap-4 border-b border-dark-border">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-dark-hover transition-colors text-[#e7e9ea]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-[#e7e9ea]">Post</h1>
      </div>

      {/* Post detallado */}
      <article className="px-4 py-4 border-b border-dark-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar
            className="w-12 h-12 cursor-pointer"
            onClick={() => navigate(`/${post.author.username}`)}
          >
            <AvatarImage src={avatarUrl} alt={post.author.displayName} />
            <AvatarFallback>{post.author.displayName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p
              className="font-bold text-[#e7e9ea] hover:underline cursor-pointer"
              onClick={() => navigate(`/${post.author.username}`)}
            >
              {post.author.displayName}
            </p>
            <p className="text-[#71767b] text-sm">@{post.author.username}</p>
          </div>
        </div>

        <p className="text-[22px] text-[#e7e9ea] leading-relaxed mb-4 whitespace-pre-wrap">
          {post.content}
        </p>

        {post.imageUrl && (
          <div className="mb-4 rounded-2xl overflow-hidden border border-dark-border">
            <img src={post.imageUrl} alt="" className="w-full object-cover max-h-96" />
          </div>
        )}

        <p className="text-[#71767b] text-sm mb-4 pb-4 border-b border-dark-border">
          {formatFullDate(post.createdAt)}
        </p>

        {/* Stats */}
        <div className="flex gap-5 pb-4 border-b border-dark-border text-sm">
          {likesCount > 0 && (
            <span>
              <strong className="text-[#e7e9ea]">{formatCount(likesCount)}</strong>
              <span className="text-[#71767b] ml-1">Me gusta</span>
            </span>
          )}
          {displayRetweetsCount > 0 && (
            <span>
              <strong className="text-[#e7e9ea]">{formatCount(displayRetweetsCount)}</strong>
              <span className="text-[#71767b] ml-1">Retweets</span>
            </span>
          )}
          {post.repliesCount > 0 && (
            <span>
              <strong className="text-[#e7e9ea]">{formatCount(post.repliesCount)}</strong>
              <span className="text-[#71767b] ml-1">Respuestas</span>
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-around pt-1">
          <button className="tweet-action-btn">
            <span className="icon-wrap"><MessageCircle className="w-5 h-5" /></span>
          </button>
          <button
            className={cn('tweet-action-btn retweet', isRetweeted && 'active')}
            onClick={handleRetweet}
          >
            <span className="icon-wrap"><Repeat2 className="w-5 h-5" /></span>
          </button>
          <button
            className={cn('tweet-action-btn like', isLiked && 'active')}
            onClick={handleLike}
          >
            <span className="icon-wrap">
              <Heart className={cn('w-5 h-5', isLiked && 'fill-pink-500')} />
            </span>
          </button>
          <button className="tweet-action-btn">
            <span className="icon-wrap"><BarChart2 className="w-5 h-5" /></span>
          </button>
          <button
            className={cn('tweet-action-btn bookmark', isBookmarked && 'active')}
            onClick={handleBookmark}
          >
            <span className="icon-wrap">
              <Bookmark className={cn('w-5 h-5', isBookmarked && 'fill-brand')} />
            </span>
          </button>
          <button className="tweet-action-btn">
            <span className="icon-wrap"><Share className="w-5 h-5" /></span>
          </button>
        </div>
      </article>

      {/* Reply composer */}
      <div className="border-b border-dark-border">
        <PostComposer minimal onPost={handleNewReply} replyToId={post.id} />
      </div>

      {/* Replies */}
      {allReplies.map(reply => (
        <PostCard key={reply.id} post={reply} />
      ))}
    </div>
  )
}
