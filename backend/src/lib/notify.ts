import { prisma } from './prisma'
import { publish } from './pubsub'

const ACTOR_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const

type NotifType = 'FOLLOW' | 'LIKE' | 'RETWEET' | 'REPLY'

export async function createNotification(params: {
  userId: string   // recipient
  actorId: string  // who triggered it
  type: NotifType
  tweetId?: string
}) {
  // Never notify yourself
  if (params.userId === params.actorId) return

  const notif = await prisma.notification.create({
    data: params,
    include: {
      actor: { select: ACTOR_SELECT },
      tweet: { select: { id: true, content: true } },
    },
  })

  publish(params.userId, 'new-notification', notif)
}
