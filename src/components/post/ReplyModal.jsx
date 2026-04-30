import { useState } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import { formatTimeAgo } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export default function ReplyModal({ open, onClose, replyTo, onReply }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  async function handleReply() {
    if (!text.trim() || !replyTo) return
    setPosting(true)
    setError('')
    try {
      const data = await api.tweets.create({
        content: text.trim(),
        replyToId: replyTo.id,
      })
      // Patch parent tweet cache so reply shows up if user opens detail page
      queryClient.setQueryData(['tweet', replyTo.id], (old) => {
        if (!old?.tweet) return old
        const exists = old.tweet.replies?.some(r => r.id === data.tweet.id)
        if (exists) return old
        return {
          ...old,
          tweet: {
            ...old.tweet,
            replies: [...(old.tweet.replies || []), data.tweet],
            repliesCount: (old.tweet.repliesCount ?? 0) + 1,
          },
        }
      })
      // Bump repliesCount in feed / user-tweets caches
      const bumpCount = (old) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            tweets: page.tweets.map(t =>
              t.id === replyTo.id
                ? { ...t, repliesCount: (t.repliesCount ?? 0) + 1 }
                : t
            ),
          })),
        }
      }
      queryClient.setQueriesData({ queryKey: ['feed'] }, bumpCount)
      queryClient.setQueriesData({ queryKey: ['user-tweets'] }, bumpCount)
      onReply?.(data.tweet)
      setText('')
      onClose()
    } catch (err) {
      console.error('[reply-modal] error', err)
      setError(err.message || 'Error al responder. Intenta de nuevo.')
    } finally {
      setPosting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] p-0">
        <div className="p-4">
          {/* Original post */}
          {replyTo && (
            <div className="flex gap-3 mb-4">
              <div className="flex flex-col items-center">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={replyTo.author.avatarUrl ?? replyTo.author.avatar} />
                  <AvatarFallback>{replyTo.author.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="w-0.5 flex-1 bg-dark-border mt-1 min-h-[20px]" />
              </div>
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#e7e9ea] text-sm">{replyTo.author.displayName}</span>
                  <span className="text-[#71767b] text-sm">@{replyTo.author.username}</span>
                  <span className="text-[#71767b] text-sm">· {formatTimeAgo(replyTo.createdAt)}</span>
                </div>
                <p className="text-[#e7e9ea] text-sm mt-1 line-clamp-3">{replyTo.content}</p>
                <p className="text-[#71767b] text-sm mt-2">
                  Respondiendo a <span className="text-brand">@{replyTo.author.username}</span>
                </p>
              </div>
            </div>
          )}

          {/* Reply composer */}
          <div className="flex gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={user?.avatarUrl ?? user?.avatar} />
              <AvatarFallback>{user?.displayName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <textarea
                className="post-input min-h-[100px]"
                placeholder="Escribe tu respuesta"
                value={text}
                onChange={e => setText(e.target.value)}
                autoFocus
              />
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
              <div className="flex justify-end mt-3 pt-3 border-t border-dark-border">
                <Button
                  onClick={handleReply}
                  disabled={!text.trim() || posting}
                  size="default"
                  className="px-5"
                >
                  {posting ? 'Respondiendo...' : 'Responder'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
