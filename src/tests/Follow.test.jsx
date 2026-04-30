import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, mockUser, mockTweet } from './utils'
import PostCard from '@/components/post/PostCard'
import Profile from '@/pages/Profile'

vi.mock('@/lib/api', () => ({
  api: {
    auth: { login: vi.fn(), register: vi.fn(), me: vi.fn(), updateMe: vi.fn() },
    tweets: {
      like: vi.fn(),
      unlike: vi.fn(),
      create: vi.fn(),
    },
    users: {
      profile: vi.fn(),
      tweets: vi.fn(),
      followers: vi.fn(),
      following: vi.fn(),
      follow: vi.fn(),
      unfollow: vi.fn(),
      search: vi.fn(),
    },
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ username: 'alexdev' }),
  }
})

import { api } from '@/lib/api'

const otherUser = {
  id: 'user-2',
  username: 'mariasol',
  displayName: 'Maria Sol',
  avatarUrl: null,
  bio: 'Designer',
  createdAt: '2024-01-01T00:00:00.000Z',
  isFollowing: false,
  _count: { tweets: 5, followers: 10, following: 3 },
}

describe('Follow / Unfollow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('tc_user', JSON.stringify(mockUser))
    localStorage.setItem('tc_token', 'fake-token')
  })

  it('shows "Seguir" button for another user\'s profile', async () => {
    api.users.profile.mockResolvedValueOnce({ user: otherUser })
    api.users.tweets.mockResolvedValueOnce({ tweets: [], nextCursor: null })

    renderWithProviders(<Profile />, { route: '/mariasol' })

    await waitFor(() => {
      expect(screen.getByTestId('follow-btn')).toHaveTextContent('Seguir')
    })
  })

  it('clicking "Seguir" calls the follow API and shows "Siguiendo"', async () => {
    api.users.profile.mockResolvedValueOnce({ user: otherUser })
    api.users.tweets.mockResolvedValueOnce({ tweets: [], nextCursor: null })
    api.users.follow.mockResolvedValueOnce({})
    api.users.profile.mockResolvedValueOnce({ user: { ...otherUser, isFollowing: true } })

    renderWithProviders(<Profile />, { route: '/mariasol' })

    const followBtn = await screen.findByTestId('follow-btn')
    await userEvent.click(followBtn)

    await waitFor(() => {
      expect(api.users.follow).toHaveBeenCalledWith('mariasol')
      expect(screen.getByTestId('follow-btn')).toHaveTextContent('Siguiendo')
    })
  })

  it('shows "Editar perfil" for own profile', async () => {
    const ownProfile = {
      ...otherUser,
      id: mockUser.id,
      username: mockUser.username,
      displayName: mockUser.displayName,
    }
    api.users.profile.mockResolvedValueOnce({ user: ownProfile })
    api.users.tweets.mockResolvedValueOnce({ tweets: [], nextCursor: null })

    renderWithProviders(<Profile />, { route: '/alexdev' })

    await waitFor(() => {
      expect(screen.getByTestId('edit-profile-btn')).toBeInTheDocument()
    })
  })

  it('reverts optimistic follow on API error', async () => {
    api.users.profile.mockResolvedValueOnce({ user: otherUser })
    api.users.tweets.mockResolvedValueOnce({ tweets: [], nextCursor: null })
    api.users.follow.mockRejectedValueOnce(new Error('Network error'))

    renderWithProviders(<Profile />, { route: '/mariasol' })

    const followBtn = await screen.findByTestId('follow-btn')
    // Use fireEvent to trigger synchronous optimistic update before rejection settles
    fireEvent.click(followBtn)

    // After API failure, button reverts to "Seguir"
    await waitFor(() => {
      expect(screen.getByTestId('follow-btn')).toHaveTextContent('Seguir')
    })
  })
})

describe('PostCard — like interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('tc_user', JSON.stringify(mockUser))
    localStorage.setItem('tc_token', 'fake-token')
  })

  function getLikeButton(container) {
    // The like button has the "like" class in the tweet action buttons row
    return container.querySelector('.tweet-action-btn.like')
  }

  it('shows like count from post data', () => {
    const post = { ...mockTweet, likesCount: 5, liked: false }
    const { container } = renderWithProviders(<PostCard post={post} />)
    expect(getLikeButton(container)).toHaveTextContent('5')
  })

  it('optimistically increments like count on click', async () => {
    api.tweets.like.mockResolvedValueOnce({})
    const post = { ...mockTweet, likesCount: 3, liked: false }
    const { container } = renderWithProviders(<PostCard post={post} />)

    const likeBtn = getLikeButton(container)
    expect(likeBtn).toHaveTextContent('3')

    fireEvent.click(likeBtn)

    expect(likeBtn).toHaveTextContent('4')
    await waitFor(() => expect(api.tweets.like).toHaveBeenCalledWith(post.id))
  })

  it('reverts like count on API failure', async () => {
    api.tweets.like.mockRejectedValueOnce(new Error('Server error'))
    const post = { ...mockTweet, likesCount: 3, liked: false }
    const { container } = renderWithProviders(<PostCard post={post} />)

    const likeBtn = getLikeButton(container)
    fireEvent.click(likeBtn)

    // Optimistic: shows 4
    expect(likeBtn).toHaveTextContent('4')

    // After failure: reverts to 3
    await waitFor(() => {
      expect(likeBtn).toHaveTextContent('3')
    })
  })

  it('unlike decrements count when post is already liked', async () => {
    api.tweets.unlike.mockResolvedValueOnce({})
    const post = { ...mockTweet, likesCount: 7, liked: true }
    const { container } = renderWithProviders(<PostCard post={post} />)

    const likeBtn = getLikeButton(container)
    fireEvent.click(likeBtn)

    expect(likeBtn).toHaveTextContent('6')
    await waitFor(() => expect(api.tweets.unlike).toHaveBeenCalledWith(post.id))
  })
})
