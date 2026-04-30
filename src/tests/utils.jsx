import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'

export function renderWithProviders(ui, { route = '/', ...options } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </MemoryRouter>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

export const mockUser = {
  id: 'user-1',
  email: 'alex@example.com',
  username: 'alexdev',
  displayName: 'Alex Dev',
  avatarUrl: null,
  bio: 'Software engineer',
  createdAt: '2024-01-01T00:00:00.000Z',
}

export const mockTweet = {
  id: 'tweet-1',
  content: 'Hello world from tests!',
  createdAt: new Date().toISOString(),
  likesCount: 3,
  repliesCount: 1,
  retweetsCount: 0,
  liked: false,
  author: {
    id: 'user-1',
    username: 'alexdev',
    displayName: 'Alex Dev',
    avatarUrl: null,
  },
}
