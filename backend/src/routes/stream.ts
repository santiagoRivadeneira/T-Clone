import { FastifyPluginAsync } from 'fastify'
import { subscribe } from '../lib/pubsub'

const streamRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const { token } = request.query as { token?: string }

    let userId: string
    try {
      const decoded = fastify.jwt.verify<{ sub: string }>(token ?? '')
      userId = decoded.sub
    } catch {
      fastify.log.warn('SSE connection rejected: invalid token')
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    // Tell the client to retry after 3s if connection drops
    reply.raw.write('retry: 3000\n\n')

    fastify.log.info({ userId }, 'SSE connected')

    const unsubscribe = subscribe(userId, {
      write: (chunk) => reply.raw.write(chunk),
    })

    // Keep-alive ping every 25s to prevent idle timeout
    const ping = setInterval(() => {
      try { reply.raw.write(': ping\n\n') } catch { clearInterval(ping) }
    }, 25_000)

    return new Promise<void>(resolve => {
      request.raw.on('close', () => {
        clearInterval(ping)
        unsubscribe()
        fastify.log.info({ userId }, 'SSE disconnected')
        resolve()
      })
    })
  })
}

export default streamRoutes
