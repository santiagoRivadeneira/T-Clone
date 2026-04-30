import { useEffect, useRef } from 'react'

/**
 * Attaches an IntersectionObserver to `sentinelRef`.
 * Calls `fetchNextPage` when the sentinel enters the viewport.
 * Uses refs so the observer is created once and never cascades.
 */
export function useInfiniteScroll({ sentinelRef, fetchNextPage, hasNextPage, isFetchingNextPage }) {
  const fetchRef = useRef(fetchNextPage)
  const hasNextRef = useRef(hasNextPage)
  const fetchingRef = useRef(isFetchingNextPage)

  useEffect(() => { fetchRef.current = fetchNextPage }, [fetchNextPage])
  useEffect(() => { hasNextRef.current = hasNextPage }, [hasNextPage])
  useEffect(() => { fetchingRef.current = isFetchingNextPage }, [isFetchingNextPage])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextRef.current && !fetchingRef.current) {
          fetchRef.current()
        }
      },
      { rootMargin: '0px 0px 400px 0px' } // start loading 400px before reaching the bottom
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [sentinelRef]) // stable: only runs once per mount
}
