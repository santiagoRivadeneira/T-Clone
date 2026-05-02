import { createContext, useContext, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'

const SSEContext = createContext(null)

export function SSEProvider({ children }) {
  const { user } = useAuth()
  // Map of eventName -> Set of callback functions
  const listenersRef = useRef({})

  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem('tc_token')
    if (!token) return

    const es = new EventSource(`/api/stream?token=${encodeURIComponent(token)}`)

    const dispatch = (eventName) => (e) => {
      try {
        const data = JSON.parse(e.data)
        listenersRef.current[eventName]?.forEach(cb => cb(data))
      } catch {}
    }

    es.addEventListener('new-tweet', dispatch('new-tweet'))
    es.addEventListener('delete-tweet', dispatch('delete-tweet'))
    es.addEventListener('new-notification', dispatch('new-notification'))
    es.addEventListener('new-message', dispatch('new-message'))

    return () => es.close()
  }, [user?.id]) // reconnect only when the logged-in user changes

  function on(eventName, callback) {
    if (!listenersRef.current[eventName]) listenersRef.current[eventName] = new Set()
    listenersRef.current[eventName].add(callback)
    return () => listenersRef.current[eventName]?.delete(callback)
  }

  return <SSEContext.Provider value={{ on }}>{children}</SSEContext.Provider>
}

export function useSSE(eventName, callback) {
  const ctx = useContext(SSEContext)
  // Keep the callback in a ref so changing it doesn't re-subscribe
  const callbackRef = useRef(callback)
  useEffect(() => { callbackRef.current = callback })

  useEffect(() => {
    if (!ctx) return
    return ctx.on(eventName, (data) => callbackRef.current(data))
  }, [eventName, ctx])
}
