import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const PASSWORD_HASH = bcrypt.hashSync('password123', 12)

const USERS = [
  {
    email: 'alex@example.com',
    username: 'alexdev',
    displayName: 'Alex Rivera',
    bio: 'Full-stack dev | TypeScript enthusiast | Building in public 🚀',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alexdev',
  },
  {
    email: 'maria@example.com',
    username: 'mariasol',
    displayName: 'María Sol',
    bio: 'UX/UI Designer | Figma addict | Design systems nerd ✨',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mariasol',
  },
  {
    email: 'carlos@example.com',
    username: 'carlos_ia',
    displayName: 'Carlos Mendez',
    bio: 'AI researcher | PhD candidate | Building smarter systems 🤖',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlosai',
  },
  {
    email: 'luisa@example.com',
    username: 'luisa_code',
    displayName: 'Luisa Fernández',
    bio: 'Backend engineer | Distributed systems | Rust fan 🦀',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luisacode',
  },
  {
    email: 'rafa@example.com',
    username: 'rafa_pm',
    displayName: 'Rafael Torres',
    bio: 'Product Manager | Turning ideas into products | Ex-Google',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rafapm',
  },
  {
    email: 'ana@example.com',
    username: 'ana_devrel',
    displayName: 'Ana Gómez',
    bio: 'Developer Relations | Community builder | International speaker 🌎',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=anadevrel',
  },
  {
    email: 'pablo@example.com',
    username: 'pablo_ent',
    displayName: 'Pablo Ruiz',
    bio: 'Serial entrepreneur | 2x founder | Currently building stealth startup',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pabloent',
  },
  {
    email: 'julia@example.com',
    username: 'julia_data',
    displayName: 'Julia Castro',
    bio: 'Data Scientist | Python | Visualizing complex data 📊',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=juliadata',
  },
  {
    email: 'miguel@example.com',
    username: 'miguel_sec',
    displayName: 'Miguel Vargas',
    bio: 'Security engineer | CTF player | OSS contributor 🔐',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=miguelsec',
  },
  {
    email: 'sofia@example.com',
    username: 'sofia_front',
    displayName: 'Sofía Morales',
    bio: 'Frontend developer | React specialist | CSS wizard 🎨',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sofiafront',
  },
]

const TWEETS_BY_USERNAME: Record<string, string[]> = {
  alexdev: [
    'Finally got that TypeScript generic right after 3 hours. Sometimes I question my life choices 😅',
    'Hot take: monorepos are underrated. Just set one up for a new project and the DX is chef\'s kiss 🍽️',
    'Vitest is genuinely the best testing framework I\'ve used in the JS ecosystem. Blazing fast ⚡',
    'Reminder to future me: don\'t start a refactor on a Friday afternoon.',
  ],
  mariasol: [
    'Design systems are 80% planning, 20% execution, and 200% maintenance. No one tells you this.',
    'Just redesigned our onboarding flow. Conversion went up 23%. Data-driven design > opinions 📈',
    'Figma tip: use auto layout everywhere. Your future self will thank you.',
    'Color contrast is not optional. Accessibility is design, not an afterthought.',
  ],
  carlos_ia: [
    'LLMs still can\'t reason reliably through multi-step math. Paper on this dropping next week.',
    'Fine-tuning vs. RAG: stop asking which is better. It depends entirely on your use case and budget.',
    'Excited to present at NeurIPS this year! First time as an author 🎉',
    'The problem with "AGI is 2 years away" discourse is that it\'s been "2 years away" for 10 years.',
  ],
  luisa_code: [
    'Rust\'s borrow checker is not the enemy. It\'s the strict teacher that makes you a better programmer.',
    'Distributed tracing saved us 4 hours of debugging today. If you\'re not using OpenTelemetry, start now.',
    'PostgreSQL > MySQL. I will die on this hill. ⚔️',
    'Event sourcing architecture post is finally live on my blog. 6 months of production lessons.',
  ],
  rafa_pm: [
    'The best PRD is one the engineering team actually reads. Keep it under 2 pages.',
    'Feature requests are hypotheses. Ship small, measure, iterate. That\'s the whole job.',
    'Stakeholder management is 60% of the PM job and nobody tells you this in interviews.',
    '"Move fast and break things" was always bad advice. Move fast and monitor things.',
  ],
  ana_devrel: [
    'Just shipped our new docs site! Writing good technical documentation is a genuine art form.',
    'Gave my first international talk today. The DevRel life is wild and I love every second 🌟',
    'Community building tip: show up consistently. There are no shortcuts in this work.',
    'Open source sustainability is a real problem and we need to talk about it more seriously.',
  ],
  pablo_ent: [
    'Y1: raised pre-seed. Y2: pivoted 3 times. Y3: acquired. Building startup #2. Buckle up.',
    'Stop waiting for the perfect moment to start. Ship something imperfect today.',
    'The hardest part of a startup isn\'t code or money. It\'s fighting your own doubt every single morning.',
    'Best VC meeting advice: know your numbers cold. If you hesitate on CAC or churn, it\'s over.',
  ],
  julia_data: [
    'New side project: visualizing 10 years of climate data in the browser. D3.js is still king for this.',
    'pandas 2.0 is a game changer. The performance improvements are genuinely insane.',
    'Data cleaning is not glamorous but it determines 80% of your model\'s performance. Respect the process.',
    'Just hit 10k rows of clean, labeled data. The real ML work is in the curation, not the model.',
  ],
  miguel_sec: [
    'Reminder: security is not a feature, it\'s a foundation. Build it in from day 1, not as an afterthought.',
    'CTF writeup for last weekend: SQL injection + SSRF chain to RCE. Blog post linked below.',
    'Reviewed an OSS project\'s auth implementation today. Found 3 critical issues in 20 minutes. Contribute to security audits.',
    'Zero-trust is not a product you buy. It\'s an architecture you design. Stop confusing the two.',
  ],
  sofia_front: [
    'CSS Grid changed my life and I don\'t say that lightly. Stop using hacks, learn the spec.',
    'React 19 server components are finally making sense to the broader community. Took a while.',
    'Accessibility is not optional. If your component doesn\'t work with a screen reader, it\'s broken.',
    'The best CSS you can write is less CSS. Every new rule is technical debt.',
  ],
}

// [followerIndex, followingIndex]
const FOLLOW_PAIRS = [
  [0, 1], [0, 3], [0, 6], [0, 9], // alexdev follows maria, luisa, pablo, sofia
  [1, 0], [1, 9], [1, 5], [1, 7], // mariasol follows alex, sofia, ana, julia
  [2, 3], [2, 7], [2, 8], [2, 0], // carlos follows luisa, julia, miguel, alex
  [3, 2], [3, 0], [3, 8],          // luisa follows carlos, alex, miguel
  [4, 6], [4, 5], [4, 0], [4, 1], // rafa follows pablo, ana, alex, maria
  [5, 0], [5, 4], [5, 1], [5, 9], // ana follows alex, rafa, maria, sofia
  [6, 4], [6, 0], [6, 2],          // pablo follows rafa, alex, carlos
  [7, 2], [7, 3], [7, 1],          // julia follows carlos, luisa, maria
  [8, 3], [8, 2], [8, 0],          // miguel follows luisa, carlos, alex
  [9, 1], [9, 0], [9, 5],          // sofia follows maria, alex, ana
]

// [likerIndex, authorUsername, tweetIndex]
const LIKE_SPECS: [number, string, number][] = [
  [1, 'alexdev', 0], [9, 'alexdev', 1], [3, 'alexdev', 2],
  [0, 'mariasol', 0], [9, 'mariasol', 2], [4, 'mariasol', 1],
  [3, 'carlos_ia', 0], [7, 'carlos_ia', 2], [8, 'carlos_ia', 1],
  [2, 'luisa_code', 2], [0, 'luisa_code', 0], [8, 'luisa_code', 1],
  [0, 'rafa_pm', 1], [5, 'rafa_pm', 0], [6, 'rafa_pm', 3],
  [0, 'ana_devrel', 0], [1, 'ana_devrel', 1], [4, 'ana_devrel', 2],
  [4, 'pablo_ent', 0], [0, 'pablo_ent', 1], [6, 'pablo_ent', 2],
  [2, 'julia_data', 0], [3, 'julia_data', 2], [7, 'julia_data', 1],
  [3, 'miguel_sec', 0], [2, 'miguel_sec', 1], [0, 'miguel_sec', 3],
  [1, 'sofia_front', 0], [0, 'sofia_front', 2], [5, 'sofia_front', 3],
]

async function main() {
  console.log('🌱  Seeding database...')

  await prisma.like.deleteMany()
  await prisma.follow.deleteMany()
  await prisma.tweet.deleteMany()
  await prisma.user.deleteMany()

  // Create users
  const createdUsers = await Promise.all(
    USERS.map((u) =>
      prisma.user.create({
        data: { ...u, passwordHash: PASSWORD_HASH },
      })
    )
  )
  console.log(`✅  Created ${createdUsers.length} users`)

  const userByUsername = Object.fromEntries(createdUsers.map((u) => [u.username, u]))

  // Create tweets
  const tweetsByUsername: Record<string, { id: string }[]> = {}
  for (const user of createdUsers) {
    const contents = TWEETS_BY_USERNAME[user.username] ?? []
    const tweets = await Promise.all(
      contents.map((content, i) =>
        prisma.tweet.create({
          data: {
            content,
            authorId: user.id,
            createdAt: new Date(Date.now() - (contents.length - i) * 3_600_000),
          },
        })
      )
    )
    tweetsByUsername[user.username] = tweets
  }
  const totalTweets = Object.values(tweetsByUsername).flat().length
  console.log(`✅  Created ${totalTweets} tweets`)

  // Create follows
  await Promise.all(
    FOLLOW_PAIRS.map(([fi, ti]) =>
      prisma.follow.create({
        data: {
          followerId: createdUsers[fi].id,
          followingId: createdUsers[ti].id,
        },
      })
    )
  )
  console.log(`✅  Created ${FOLLOW_PAIRS.length} follows`)

  // Create likes
  let likeCount = 0
  for (const [likerIdx, authorUsername, tweetIdx] of LIKE_SPECS) {
    const tweets = tweetsByUsername[authorUsername]
    const tweet = tweets?.[tweetIdx]
    if (!tweet) continue
    const liker = createdUsers[likerIdx]
    if (liker.id === userByUsername[authorUsername]?.id) continue // skip self-likes

    try {
      await prisma.like.create({ data: { userId: liker.id, tweetId: tweet.id } })
      likeCount++
    } catch {
      // skip duplicates
    }
  }
  console.log(`✅  Created ${likeCount} likes`)

  console.log('\n🎉  Seed complete!')
  console.log('\n📧  Demo credentials (all passwords: password123):')
  USERS.slice(0, 3).forEach((u) => console.log(`   ${u.email}`))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
