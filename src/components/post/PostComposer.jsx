import { useState, useRef } from 'react'
import { Image, Smile, MapPin, X } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

const MAX_CHARS = 280

export default function PostComposer({ open, onClose, onPost, minimal = false, replyToId }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [images, setImages] = useState([])
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const remaining = MAX_CHARS - text.length
  const canPost = text.trim().length > 0 && remaining >= 0

  // Normalize avatar field
  const avatarUrl = user?.avatarUrl ?? user?.avatar

  async function handlePost() {
    if (!canPost) return
    setPosting(true)
    setError('')
    try {
      const data = await api.tweets.create({
        content: text.trim(),
        ...(replyToId ? { replyToId } : {}),
      })
      // Let the parent patch its cache first (replies need to land before refetch invalidation)
      onPost?.(data.tweet)
      // Only invalidate queries that don't have an explicit cache patch path
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['user-tweets'] })
      setText('')
      setImages([])
      onClose?.()
    } catch (err) {
      setError(err.message || 'Error al publicar. Intenta de nuevo.')
    } finally {
      setPosting(false)
    }
  }

  function handleImageChange(e) {
    const files = Array.from(e.target.files)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => setImages(prev => [...prev, ev.target.result])
      reader.readAsDataURL(file)
    })
  }

  const composerContent = (
    <div className="flex gap-3 p-4 w-full">
      <Avatar className="w-10 h-10 flex-shrink-0 mt-0.5">
        <AvatarImage src={avatarUrl} alt={user?.displayName} />
        <AvatarFallback>{user?.displayName?.[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <textarea
          className="post-input min-h-[120px]"
          placeholder={replyToId ? 'Publica tu respuesta' : '¿Qué está pasando?'}
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={MAX_CHARS + 20}
          autoFocus={open}
        />

        {images.length > 0 && (
          <div className={cn('mt-2 grid gap-2', images.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
            {images.map((img, i) => (
              <div key={i} className="relative rounded-2xl overflow-hidden">
                <img src={img} alt="" className="w-full object-cover max-h-48" />
                <button
                  onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                  className="absolute top-2 right-2 bg-black/70 rounded-full p-1 hover:bg-black/90 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-dark-border">
          <div className="flex items-center gap-1 -ml-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageChange}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="p-2 rounded-full text-brand hover:bg-brand/10 transition-colors"
            >
              <Image className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-full text-brand hover:bg-brand/10 transition-colors">
              <Smile className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-full text-brand hover:bg-brand/10 transition-colors">
              <MapPin className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {text.length > 0 && (
              <div className="relative w-8 h-8">
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="13" fill="none" stroke="#2f3336" strokeWidth="2.5" />
                  <circle
                    cx="16" cy="16" r="13"
                    fill="none"
                    stroke={remaining < 20 ? (remaining < 0 ? '#f4212e' : '#ffd400') : '#6366f1'}
                    strokeWidth="2.5"
                    strokeDasharray={`${Math.max(0, (text.length / MAX_CHARS)) * 81.68} 81.68`}
                    strokeLinecap="round"
                  />
                </svg>
                {remaining <= 20 && (
                  <span className={cn(
                    'absolute inset-0 flex items-center justify-center text-[11px] font-bold',
                    remaining < 0 ? 'text-red-400' : 'text-[#71767b]'
                  )}>
                    {remaining}
                  </span>
                )}
              </div>
            )}
            <Button onClick={handlePost} disabled={!canPost || posting} size="default" className="px-5">
              {posting ? 'Publicando...' : replyToId ? 'Responder' : 'Publicar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  if (minimal) return composerContent

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] p-0">
        <DialogHeader className="px-4 py-3 border-b border-dark-border">
          <DialogTitle className="text-base">Crear post</DialogTitle>
        </DialogHeader>
        {composerContent}
      </DialogContent>
    </Dialog>
  )
}
