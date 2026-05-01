const BASE = '/api'

function getToken() {
  return localStorage.getItem('tc_token')
}

async function req(path, opts = {}) {
  const headers = {}
  if (opts.body) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...headers, ...(opts.headers ?? {}) },
  })

  if (res.status === 204) return null

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('tc_token')
      localStorage.removeItem('tc_user')
      window.location.href = '/login'
    }
    throw new Error(data.error || `Error ${res.status}`)
  }

  return data
}

export const api = {
  auth: {
    register: (d) => req('/auth/register', { method: 'POST', body: JSON.stringify(d) }),
    login: (d) => req('/auth/login', { method: 'POST', body: JSON.stringify(d) }),
    me: () => req('/auth/me'),
    updateMe: (d) => req('/auth/me', { method: 'PATCH', body: JSON.stringify(d) }),
  },
  tweets: {
    timeline: (cursor) => req(`/tweets/timeline${cursor ? `?cursor=${cursor}` : ''}`),
    create: (d) => req('/tweets', { method: 'POST', body: JSON.stringify(d) }),
    get: (id) => req(`/tweets/${id}`),
    delete: (id) => req(`/tweets/${id}`, { method: 'DELETE' }),
    like: (id) => req(`/tweets/${id}/like`, { method: 'POST' }),
    unlike: (id) => req(`/tweets/${id}/like`, { method: 'DELETE' }),
    retweet: (id) => req(`/tweets/${id}/retweet`, { method: 'POST' }),
    unretweet: (id) => req(`/tweets/${id}/retweet`, { method: 'DELETE' }),
    bookmark: (id) => req(`/tweets/${id}/bookmark`, { method: 'POST' }),
    unbookmark: (id) => req(`/tweets/${id}/bookmark`, { method: 'DELETE' }),
    bookmarks: (cursor) => req(`/tweets/bookmarks/list${cursor ? `?cursor=${cursor}` : ''}`),
  },
  notifications: {
    list: (cursor) => req(`/notifications${cursor ? `?cursor=${cursor}` : ''}`),
    unreadCount: () => req('/notifications/unread-count'),
    markRead: () => req('/notifications/read', { method: 'PATCH' }),
  },
  messages: {
    conversations: () => req('/messages'),
    unreadCount: () => req('/messages/unread-count'),
    get: (username, cursor) => req(`/messages/${username}${cursor ? `?cursor=${cursor}` : ''}`),
    send: (username, content) => req(`/messages/${username}`, { method: 'POST', body: JSON.stringify({ content }) }),
    markRead: (username) => req(`/messages/${username}/read`, { method: 'PATCH' }),
  },
  users: {
    profile: (username) => req(`/users/${username}`),
    tweets: (username, cursor) =>
      req(`/users/${username}/tweets${cursor ? `?cursor=${cursor}` : ''}`),
    followers: (username) => req(`/users/${username}/followers`),
    following: (username) => req(`/users/${username}/following`),
    search: (q) => req(`/users/search?q=${encodeURIComponent(q)}`),
    follow: (username) => req(`/users/${username}/follow`, { method: 'POST' }),
    unfollow: (username) => req(`/users/${username}/follow`, { method: 'DELETE' }),
  },
}
