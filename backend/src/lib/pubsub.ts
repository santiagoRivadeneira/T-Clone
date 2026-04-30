type Subscriber = { write: (chunk: string) => void }

const subscribers = new Map<string, Set<Subscriber>>()

export function subscribe(userId: string, sub: Subscriber): () => void {
  if (!subscribers.has(userId)) subscribers.set(userId, new Set())
  subscribers.get(userId)!.add(sub)
  return () => {
    subscribers.get(userId)?.delete(sub)
    if (subscribers.get(userId)?.size === 0) subscribers.delete(userId)
  }
}

export function publish(userId: string, event: string, data: unknown): void {
  const subs = subscribers.get(userId)
  if (!subs?.size) return
  const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  subs.forEach(sub => {
    try { sub.write(chunk) } catch { /* client disconnected */ }
  })
}
