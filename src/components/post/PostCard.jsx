import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Heart, MessageCircle, Repeat2, BarChart2,
  Bookmark, Share, MoreHorizontal, Trash2, UserMinus,
} from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, formatCount, formatTimeAgo } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import ReplyModal from './ReplyModal'

export default function PostCard({ post, onDelete, showThread = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [liked, setLiked] = useState(post.liked ?? false)
  const [likesCount, setLikesCount] = useState(post.likesCount ?? 0)
  const [repliesCount, setRepliesCount] = useState(post.repliesCount ?? 0)
  const [retweeted, setRetweeted] = useState(post.retweeted ?? false)
  const [bookmarked, setBookmarked] = useState(post.bookmarked ?? false)
  const [retweetsCount, setRetweetsCount] = useState(post.retweetsCount ?? 0)
  const [replyOpen, setReplyOpen] = useState(false)


  // Normalize avatar field — backend uses avatarUrl, mock data may use avatar
  const avatarUrl = post.author.avatarUrl ?? post.author.avatar

  const isOwn = post.author.id === user?.id

  function patchCaches(changes) {
    const patcher = (old) => {
      if (!old) return old
      // InfiniteQuery pages
      if (old.pages) {
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            tweets: page.tweets.map(t => t.id === post.id ? { ...t, ...changes } : t),
          })),
        }
      }
      // Single tweet
      if (old.tweet?.id === post.id) return { ...old, tweet: { ...old.tweet, ...changes } }
      return old
    }
    queryClient.setQueriesData({ queryKey: ['feed'] }, patcher)
    queryClient.setQueriesData({ queryKey: ['user-tweets'] }, patcher)
    queryClient.setQueriesData({ queryKey: ['tweet', post.id] }, patcher)
  }

  async function handleLike(e) {
    e.stopPropagation()
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikesCount(c => wasLiked ? c - 1 : c + 1)
    try {
      if (wasLiked) await api.tweets.unlike(post.id)
      else await api.tweets.like(post.id)
      patchCaches({ liked: !wasLiked, likesCount: likesCount + (wasLiked ? -1 : 1) })
    } catch {
      setLiked(wasLiked)
      setLikesCount(c => wasLiked ? c + 1 : c - 1)
    }
  }

  async function handleRetweet(e) {
    e.stopPropagation()
    const wasRetweeted = retweeted
    setRetweeted(!wasRetweeted)
    setRetweetsCount(c => wasRetweeted ? c - 1 : c + 1)
    try {
      if (wasRetweeted) await api.tweets.unretweet(post.id)
      else await api.tweets.retweet(post.id)
      patchCaches({ retweeted: !wasRetweeted, retweetsCount: retweetsCount + (wasRetweeted ? -1 : 1) })
    } catch {
      setRetweeted(wasRetweeted)
      setRetweetsCount(c => wasRetweeted ? c + 1 : c - 1)
    }
  }

  async function handleBookmark(e) {
    e.stopPropagation()
    const wasBookmarked = bookmarked
    setBookmarked(!wasBookmarked)
    try {
      if (wasBookmarked) await api.tweets.unbookmark(post.id)
      else await api.tweets.bookmark(post.id)
      patchCaches({ bookmarked: !wasBookmarked })
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
    } catch {
      setBookmarked(wasBookmarked)
    }
  }

  function handleReply(e) {
    e.stopPropagation()
    setReplyOpen(true)
  }

  function handleCardClick() {
    navigate(`/${post.author.username}/status/${post.id}`)
  }

  function handleAvatarClick(e) {
    e.stopPropagation()
    navigate(`/${post.author.username}`)
  }

  function handleUsernameClick(e) {
    e.stopPropagation()
    navigate(`/${post.author.username}`)
  }

  // Normalize images — backend has imageUrl (string|null), mock has images (array)
  const images = post.images?.length
    ? post.images
    : post.imageUrl
    ? [post.imageUrl]
    : []

  return (
    <>
      <article
        className="flex gap-3 px-4 py-3 border-b border-dark-border hover:bg-dark-hover/30 cursor-pointer transition-colors"
        onClick={handleCardClick}
      >
        {/* Avatar */}
        <div className="flex flex-col items-center flex-shrink-0">
          <Avatar
            className="w-10 h-10 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={handleAvatarClick}
          >
            <AvatarImage src={avatarUrl} alt={post.author.displayName} />
            <AvatarFallback>{post.author.displayName[0]}</AvatarFallback>
          </Avatar>
          {showThread && <div className="w-0.5 flex-1 bg-dark-border mt-1" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0 flex-wrap">
              <span
                className="font-bold text-[#e7e9ea] text-[15px] hover:underline cursor-pointer truncate"
                onClick={handleUsernameClick}
              >
                {post.author.displayName}
              </span>
              {post.author.verified && (
                <svg className="w-4 h-4 text-brand flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                </svg>
              )}
              <span className="text-[#71767b] text-[15px] truncate">@{post.author.username}</span>
              <span className="text-[#71767b] text-[15px]">·</span>
              <span className="text-[#71767b] text-[15px] flex-shrink-0">{formatTimeAgo(post.createdAt)}</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                <button className="p-1.5 rounded-full text-[#71767b] hover:text-brand hover:bg-brand/10 transition-colors flex-shrink-0 -mr-1">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                {isOwn ? (
                  <DropdownMenuItem
                    className="text-red-400 gap-2"
                    onClick={async () => {
                      try {
                        await api.tweets.delete(post.id)
                        queryClient.invalidateQueries({ queryKey: ['feed'] })
                        queryClient.invalidateQueries({ queryKey: ['user-tweets'] })
                        queryClient.invalidateQueries({ queryKey: ['tweet'] })
                        onDelete?.(post.id)
                      } catch {}
                    }}
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar post
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem className="gap-2">
                    <UserMinus className="w-4 h-4" /> Dejar de seguir @{post.author.username}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="text-[15px] text-[#e7e9ea] mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
            {post.content}
          </p>

          {images.length > 0 && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-dark-border">
              {images.map((img, i) => (
                <img key={i} src={img} alt="" className="w-full object-cover max-h-80" />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-3 -ml-1.5 max-w-[425px]">
            <button className="tweet-action-btn" onClick={handleReply}>
              <span className="icon-wrap"><MessageCircle className="w-[18px] h-[18px]" /></span>
              {repliesCount > 0 && <span className="text-sm">{formatCount(repliesCount)}</span>}
            </button>

            <button
              className={cn('tweet-action-btn retweet', retweeted && 'active')}
              onClick={handleRetweet}
            >
              <span className="icon-wrap"><Repeat2 className="w-[18px] h-[18px]" /></span>
              {retweetsCount > 0 && <span className="text-sm">{formatCount(retweetsCount)}</span>}
            </button>

            <button
              className={cn('tweet-action-btn like', liked && 'active')}
              onClick={handleLike}
            >
              <span className="icon-wrap">
                <Heart className={cn('w-[18px] h-[18px]', liked && 'fill-pink-500')} />
              </span>
              {likesCount > 0 && <span className="text-sm">{formatCount(likesCount)}</span>}
            </button>

            <div className="flex items-center gap-1">
              <button className="tweet-action-btn" onClick={e => e.stopPropagation()}>
                <span className="icon-wrap"><BarChart2 className="w-[18px] h-[18px]" /></span>
                {(post.viewsCount ?? 0) > 0 && (
                  <span className="text-sm">{formatCount(post.viewsCount)}</span>
                )}
              </button>

              <button
                className={cn('tweet-action-btn bookmark', bookmarked && 'active')}
                onClick={handleBookmark}
              >
                <span className="icon-wrap">
                  <Bookmark className={cn('w-[18px] h-[18px]', bookmarked && 'fill-brand')} />
                </span>
              </button>

              <button className="tweet-action-btn" onClick={e => e.stopPropagation()}>
                <span className="icon-wrap"><Share className="w-[18px] h-[18px]" /></span>
              </button>
            </div>
          </div>
        </div>
      </article>

      <ReplyModal
        open={replyOpen}
        onClose={() => setReplyOpen(false)}
        replyTo={post}
        onReply={() => setRepliesCount(c => c + 1)}
      />
      {/* Note: ReplyModal already patches caches; the onReply callback above just updates this card's local count */}
    </>
  )
}
