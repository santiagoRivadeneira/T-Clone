import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useSSE } from '@/context/SSEContext'
import { formatTimeAgo } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function Messages() {
  const { conversationId } = useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeUsername, setActiveUsername] = useState(conversationId ?? null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const { data: convData, isLoading: convLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.messages.conversations(),
    refetchInterval: 30_000,
  })

  const { data: chatData, isLoading: chatLoading } = useQuery({
    queryKey: ['chat', activeUsername],
    queryFn: () => api.messages.get(activeUsername),
    enabled: !!activeUsername,
  })

  const conversations = convData?.conversations ?? []
  const messages = chatData?.messages ?? []
  const partner = chatData?.partner ?? null

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Real-time: receive new messages via SSE
  useSSE('new-message', ({ message, sender }) => {
    // Update chat if it's the active conversation
    if (sender.username === activeUsername) {
      queryClient.setQueryData(['chat', activeUsername], (old) => {
        if (!old) return old
        const exists = old.messages.some(m => m.id === message.id)
        if (exists) return old
        return { ...old, messages: [...old.messages, message] }
      })
      // Mark as read immediately since the chat is open
      api.messages.markRead(sender.username)
    }
    // Always refresh conversations list to update last message + unread count
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
    queryClient.invalidateQueries({ queryKey: ['msg-unread-count'] })
  })

  async function handleSend(e) {
    e?.preventDefault()
    if (!input.trim() || !activeUsername || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)
    try {
      const res = await api.messages.send(activeUsername, content)
      // Optimistically append own message
      queryClient.setQueryData(['chat', activeUsername], (old) => {
        if (!old) return old
        return { ...old, messages: [...old.messages, res.message] }
      })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    } catch {
      setInput(content)
    } finally {
      setSending(false)
    }
  }

  function openConversation(username) {
    setActiveUsername(username)
    // Mark as read
    api.messages.markRead(username).then(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['msg-unread-count'] })
    })
  }

  const showChat = !!activeUsername

  return (
    <div className="flex h-[calc(100vh-56px)] md:h-screen overflow-hidden">
      {/* Conversations list */}
      <div className={cn(
        'flex flex-col border-r border-dark-border',
        'w-full md:w-80 flex-shrink-0',
        showChat && 'hidden md:flex',
        !showChat && 'flex',
      )}>
        <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-dark-border px-4 py-3">
          <h1 className="text-xl font-bold text-[#e7e9ea]">Mensajes</h1>
        </div>

        {convLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center py-16 px-6 text-center gap-3">
            <p className="text-[#71767b] text-sm">Todavía no tenés mensajes.</p>
            <p className="text-[#71767b] text-sm">Buscá a alguien y empezá una conversación.</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            {conversations.map(({ user: conv, lastMessage, unreadCount }) => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv.username)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-hover/40 transition-colors text-left',
                  activeUsername === conv.username && 'bg-dark-hover/60',
                )}
              >
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={conv.avatarUrl} alt={conv.displayName} />
                  <AvatarFallback>{conv.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-[#e7e9ea] text-sm truncate">{conv.displayName}</span>
                    <span className="text-[#71767b] text-xs flex-shrink-0">
                      {formatTimeAgo(lastMessage.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[#71767b] text-sm truncate">{lastMessage.content}</p>
                    {unreadCount > 0 && (
                      <span className="bg-brand text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat panel */}
      {showChat ? (
        <div className="flex flex-col flex-1 min-w-0">
          {/* Chat header */}
          <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-dark-border px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setActiveUsername(null)}
              className="md:hidden p-2 -ml-2 rounded-full hover:bg-dark-hover transition-colors text-[#e7e9ea]"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {partner && (
              <>
                <Avatar className="w-9 h-9">
                  <AvatarImage src={partner.avatarUrl} alt={partner.displayName} />
                  <AvatarFallback>{partner.displayName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-[#e7e9ea] text-sm leading-tight">{partner.displayName}</p>
                  <p className="text-[#71767b] text-xs">@{partner.username}</p>
                </div>
              </>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
            {chatLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 text-brand animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-[#71767b] text-sm py-8">Todavía no hay mensajes. ¡Empezá la conversación!</p>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.senderId === user?.id
                return (
                  <div key={msg.id} className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[70%] px-4 py-2 rounded-2xl text-sm leading-relaxed break-words',
                      isOwn
                        ? 'bg-brand text-white rounded-br-sm'
                        : 'bg-[#1e2732] text-[#e7e9ea] rounded-bl-sm',
                    )}>
                      {msg.content}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            className="border-t border-dark-border px-4 py-3 flex items-center gap-3"
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e) }}
              placeholder="Escribí un mensaje..."
              maxLength={1000}
              className="flex-1 bg-[#1e2732] text-[#e7e9ea] placeholder-[#71767b] rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="p-2 rounded-full bg-brand text-white disabled:opacity-40 transition-opacity hover:bg-brand/90"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <p className="text-[#71767b]">Seleccioná una conversación</p>
        </div>
      )}
    </div>
  )
}
