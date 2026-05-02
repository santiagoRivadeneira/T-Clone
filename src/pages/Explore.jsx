import { useState, useEffect, useRef } from 'react'
import { Search, X, TrendingUp, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { MOCK_TRENDING } from '@/data/mockData'
import { formatCount } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const tabs = ['Para ti', 'Tendencias', 'Noticias', 'Deportes', 'Entretenimiento']

export default function Explore() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeTab, setActiveTab] = useState('Para ti')
  const navigate = useNavigate()
  const timerRef = useRef(null)

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebouncedQuery(query), 350)
    return () => clearTimeout(timerRef.current)
  }, [query])

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => api.users.search(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
  })

  const isSearching = query.length > 0
  const users = searchResults?.users ?? []

  return (
    <div className="pb-16 md:pb-0">
      {/* Search bar */}
      <div className="sticky top-0 z-30 bg-blur-header backdrop-blur-md px-4 py-3 border-b border-dark-border">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71767b]" />
          <Input
            placeholder="Buscar usuarios"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-11 pr-10 rounded-full bg-dark-input border-transparent focus:border-brand h-11"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-brand text-white hover:bg-brand-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {!isSearching && (
        <div className="flex overflow-x-auto border-b border-dark-border sticky top-[68px] z-20 bg-dark-bg scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-item whitespace-nowrap flex-shrink-0 px-5 ${activeTab === tab ? 'active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Search results */}
      {isSearching ? (
        <div>
          {searching ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-brand animate-spin" />
            </div>
          ) : users.length > 0 ? (
            <div>
              <h3 className="px-4 py-3 font-bold text-[#e7e9ea]">Personas</h3>
              {users.map(u => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-dark-hover cursor-pointer transition-colors"
                  onClick={() => navigate(`/${u.username}`)}
                >
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={u.avatarUrl} alt={u.displayName} />
                    <AvatarFallback>{u.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#e7e9ea] text-sm truncate">{u.displayName}</p>
                    <p className="text-[#71767b] text-sm truncate">@{u.username}</p>
                    {u.bio && <p className="text-[#e7e9ea] text-sm truncate mt-0.5">{u.bio}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-16 px-8 text-center">
              <p className="text-2xl font-bold text-[#e7e9ea] mb-2">Sin resultados para "{query}"</p>
              <p className="text-[#71767b]">Intenta con otras palabras o un nombre de usuario.</p>
            </div>
          )}
        </div>
      ) : (
        /* Trending */
        <div className="px-4 py-3">
          <h2 className="text-xl font-bold text-[#e7e9ea] mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand" />
            Tendencias
          </h2>
          {MOCK_TRENDING.map((trend, idx) => (
            <div
              key={trend.id}
              className="py-3 border-b border-dark-border hover:bg-dark-hover -mx-4 px-4 cursor-pointer transition-colors"
              onClick={() => setQuery(trend.tag)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-[#71767b]">{idx + 1} · {trend.category}</p>
                  <p className="font-bold text-[#e7e9ea] mt-0.5">{trend.tag}</p>
                  <p className="text-xs text-[#71767b] mt-0.5">{formatCount(trend.postsCount)} posts</p>
                </div>
                <TrendingUp className="w-4 h-4 text-[#71767b] mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
