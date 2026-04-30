import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, mockUser, mockTweet } from './utils'
import PostComposer from '@/components/post/PostComposer'

vi.mock('@/lib/api', () => ({
  api: {
    auth: {
      login: vi.fn(),
      register: vi.fn(),
      me: vi.fn(),
      updateMe: vi.fn(),
    },
    tweets: {
      create: vi.fn(),
    },
    users: {},
  },
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  }
})

import { api } from '@/lib/api'

// Render PostComposer with a logged-in user by pre-seeding localStorage
function renderComposer(props = {}) {
  localStorage.setItem('tc_user', JSON.stringify(mockUser))
  localStorage.setItem('tc_token', 'fake-token')
  return renderWithProviders(<PostComposer minimal {...props} />)
}

describe('PostComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders the textarea with correct placeholder', () => {
    renderComposer()
    expect(screen.getByPlaceholderText('¿Qué está pasando?')).toBeInTheDocument()
  })

  it('disables the publish button when textarea is empty', () => {
    renderComposer()
    const btn = screen.getByRole('button', { name: /publicar/i })
    expect(btn).toBeDisabled()
  })

  it('enables publish button after typing text', async () => {
    renderComposer()
    await userEvent.type(screen.getByPlaceholderText('¿Qué está pasando?'), 'Hello world')
    expect(screen.getByRole('button', { name: /publicar/i })).not.toBeDisabled()
  })

  it('calls api.tweets.create with the typed content', async () => {
    api.tweets.create.mockResolvedValueOnce({ tweet: mockTweet })
    const onPost = vi.fn()
    renderComposer({ onPost })

    await userEvent.type(screen.getByPlaceholderText('¿Qué está pasando?'), 'Test tweet content')
    await userEvent.click(screen.getByRole('button', { name: /publicar/i }))

    await waitFor(() => {
      expect(api.tweets.create).toHaveBeenCalledWith({ content: 'Test tweet content' })
      expect(onPost).toHaveBeenCalledWith(mockTweet)
    })
  })

  it('clears the textarea after successful post', async () => {
    api.tweets.create.mockResolvedValueOnce({ tweet: mockTweet })
    renderComposer()

    const textarea = screen.getByPlaceholderText('¿Qué está pasando?')
    await userEvent.type(textarea, 'Tweet to clear')
    await userEvent.click(screen.getByRole('button', { name: /publicar/i }))

    await waitFor(() => {
      expect(textarea).toHaveValue('')
    })
  })

  it('shows error message when API call fails', async () => {
    api.tweets.create.mockRejectedValueOnce(new Error('Error al publicar'))
    renderComposer()

    await userEvent.type(screen.getByPlaceholderText('¿Qué está pasando?'), 'Failing tweet')
    await userEvent.click(screen.getByRole('button', { name: /publicar/i }))

    await waitFor(() => {
      expect(screen.getByText('Error al publicar')).toBeInTheDocument()
    })
  })

  it('uses reply placeholder when replyToId is provided', () => {
    renderComposer({ replyToId: 'tweet-123' })
    expect(screen.getByPlaceholderText('Publica tu respuesta')).toBeInTheDocument()
  })

  it('includes replyToId in the API call when replying', async () => {
    api.tweets.create.mockResolvedValueOnce({ tweet: mockTweet })
    renderComposer({ replyToId: 'tweet-123' })

    await userEvent.type(screen.getByPlaceholderText('Publica tu respuesta'), 'My reply')
    await userEvent.click(screen.getByRole('button', { name: /responder/i }))

    await waitFor(() => {
      expect(api.tweets.create).toHaveBeenCalledWith({
        content: 'My reply',
        replyToId: 'tweet-123',
      })
    })
  })
})
