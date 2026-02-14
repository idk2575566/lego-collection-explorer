import { useEffect, useMemo, useState } from 'react'
import './App.css'

type LegoSet = {
  id: string
  name: string
  number: string
  variant: string
  theme: string
  subtheme: string | null
  themeGroup: string | null
  category: string | null
  availability: string | null
  packaging: string | null
  pieces: number | null
  minifigsCount: number
  minifigs: string[]
  yearFrom: number
  retailPrice: { us: number | null; uk: number | null; ca: number | null; de: number | null }
  bricklink: { new: number | null; used: number | null }
  skus: { us: string | null; eu: string | null; ean: string | null; upc: string | null }
  dimensions: { width: number | null; height: number | null; depth: number | null; weight: number | null }
  image: string | null
  thumb: string | null
}

type ThemeStat = {
  theme: string
  sets: number
  value: number
  earliestYear: number
  latestYear: number
}

type SortOption = 'retail' | 'year' | 'name'

const formatCurrency = (value?: number | null, currency = 'GBP') => {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value)
}

const preferredRetail = (set: LegoSet) =>
  set.retailPrice.uk ?? set.retailPrice.us ?? set.retailPrice.ca ?? set.retailPrice.de ?? null

const yearFromSet = (set: LegoSet) => set.yearFrom || 0

function App() {
  const [sets, setSets] = useState<LegoSet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTheme, setActiveTheme] = useState<string>('All Themes')
  const [search, setSearch] = useState('')
  const [selectedSet, setSelectedSet] = useState<LegoSet | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('retail')
  const [suggestions, setSuggestions] = useState<LegoSet[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}sets.json`)
        if (!response.ok) throw new Error('Failed to load sets.json')
        const payload = (await response.json()) as LegoSet[]
        if (!cancelled) {
          setSets(payload)
          setLoading(false)
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setError('Failed to load collection data. Refresh to try again.')
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!search.trim()) {
      setSuggestions([])
      return
    }
    const term = search.toLowerCase()
    const matches = sets
      .filter((set) => `${set.name} ${set.number}`.toLowerCase().includes(term))
      .slice(0, 6)
    setSuggestions(matches)
  }, [search, sets])

  const themeStats = useMemo(() => {
    const map = new Map<string, ThemeStat>()
    for (const set of sets) {
      const key = set.theme || 'Misc'
      const existing = map.get(key) ?? {
        theme: key,
        sets: 0,
        value: 0,
        earliestYear: Number.MAX_SAFE_INTEGER,
        latestYear: 0,
      }
      existing.sets += 1
      existing.value += preferredRetail(set) ?? 0
      const year = yearFromSet(set)
      if (year) {
        existing.earliestYear = Math.min(existing.earliestYear, year)
        existing.latestYear = Math.max(existing.latestYear, year)
      }
      map.set(key, existing)
    }
    return Array.from(map.values())
      .map((stat) => ({
        ...stat,
        earliestYear: stat.earliestYear === Number.MAX_SAFE_INTEGER ? 0 : stat.earliestYear,
      }))
      .sort((a, b) => b.value - a.value)
  }, [sets])

  const overallStats = useMemo(() => {
    const totalRetail = sets.reduce((sum, set) => sum + (preferredRetail(set) ?? 0), 0)
    const totalBricklinkNew = sets.reduce((sum, set) => sum + (set.bricklink.new ?? 0), 0)
    const totalPieces = sets.reduce((sum, set) => sum + (set.pieces ?? 0), 0)
    return { totalRetail, totalBricklinkNew, totalPieces }
  }, [sets])

  const filteredSets = useMemo(() => {
    return sets.filter((set) => {
      const matchesTheme = activeTheme === 'All Themes' || set.theme === activeTheme
      const matchesSearch = search
        ? `${set.name} ${set.number}`.toLowerCase().includes(search.toLowerCase())
        : true
      return matchesTheme && matchesSearch
    })
  }, [activeTheme, search, sets])

  const sortedSets = useMemo(() => {
    const clone = [...filteredSets]
    switch (sortBy) {
      case 'year':
        return clone.sort((a, b) => yearFromSet(b) - yearFromSet(a))
      case 'name':
        return clone.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      case 'retail':
      default:
        return clone.sort((a, b) => (preferredRetail(b) ?? 0) - (preferredRetail(a) ?? 0))
    }
  }, [filteredSets, sortBy])

  const activeThemeStat = activeTheme === 'All Themes'
    ? null
    : themeStats.find((stat) => stat.theme === activeTheme)

  if (loading) {
    return (
      <div className="app-shell">
        <p className="loading">Loading collection…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-shell">
        <p className="error">{error}</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Jarvis Labs · LEGO Explorer</p>
          <h1>Grant&apos;s LEGO Collection Explorer</h1>
          <p className="lede">
            Browse {sets.length.toLocaleString()} sets spanning {themeStats.length} themes. Tap a theme to filter, then
            dive into the set detail panel for minifigs, pricing, and trivia.
          </p>
        </div>
        <div className="badge">
          <span>Total Retail</span>
          <strong>{formatCurrency(overallStats.totalRetail)}</strong>
        </div>
      </header>

      <section className="stats-grid">
        <article>
          <p>BrickLink (New)</p>
          <h2>{formatCurrency(overallStats.totalBricklinkNew)}</h2>
          <small>Aggregate sold listings across the collection.</small>
        </article>
        <article>
          <p>Total Pieces</p>
          <h2>{overallStats.totalPieces.toLocaleString()}</h2>
          <small>Equivalent to ~{Math.round(overallStats.totalPieces / 1000)}k bricks.</small>
        </article>
        <article>
          <p>Average Price / Set</p>
          <h2>{formatCurrency(overallStats.totalRetail / sets.length)}</h2>
          <small>Based on preferred retail currency per set.</small>
        </article>
      </section>

      <section className="theme-section">
        <div className="section-heading">
          <h3>Theme spotlight</h3>
          <p>Tap to filter. Size indicates RRP footprint.</p>
        </div>
        <div className="theme-grid">
          <button
            className={activeTheme === 'All Themes' ? 'theme-card active' : 'theme-card'}
            onClick={() => setActiveTheme('All Themes')}
          >
            <strong>All Themes</strong>
            <span>{sets.length} sets</span>
          </button>
          {themeStats.slice(0, 15).map((theme) => (
            <button
              key={theme.theme}
              className={activeTheme === theme.theme ? 'theme-card active' : 'theme-card'}
              onClick={() => setActiveTheme(theme.theme)}
            >
              <strong>{theme.theme}</strong>
              <span>{theme.sets} sets · {formatCurrency(theme.value)}</span>
              <div className="progress" style={{ width: `${Math.min(100, (theme.value / themeStats[0].value) * 100)}%` }} />
            </button>
          ))}
        </div>
      </section>

      {activeThemeStat && (
        <section className="theme-detail">
          <div>
            <p className="eyebrow">Theme focus</p>
            <h2>{activeThemeStat.theme}</h2>
            <p className="meta">{activeThemeStat.sets} sets · {formatCurrency(activeThemeStat.value)} total retail</p>
          </div>
          <div className="theme-detail-stats">
            <div>
              <span>Earliest release</span>
              <strong>{activeThemeStat.earliestYear || '—'}</strong>
            </div>
            <div>
              <span>Latest release</span>
              <strong>{activeThemeStat.latestYear || '—'}</strong>
            </div>
            <div>
              <span>Avg retail</span>
              <strong>{formatCurrency(activeThemeStat.value / activeThemeStat.sets)}</strong>
            </div>
          </div>
          <button className="chip" onClick={() => setActiveTheme('All Themes')}>
            Clear theme
          </button>
        </section>
      )}

      <section className="filters">
        <div className="search-block">
          <label htmlFor="search">Search sets</label>
          <input
            id="search"
            type="search"
            placeholder="E.g. Falcon, 75313, minifig"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {suggestions.length > 0 && (
            <ul className="suggestion-list">
              {suggestions.map((set) => (
                <li key={set.id}>
                  <button
                    onClick={() => {
                      setSelectedSet(set)
                      setSuggestions([])
                      setSearch(set.name)
                    }}
                  >
                    <strong>{set.name}</strong>
                    <span>#{set.number} · {set.theme}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="sort-block">
          <label htmlFor="sort">Sort by</label>
          <select id="sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
            <option value="retail">Highest retail value</option>
            <option value="year">Newest release</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </div>
        <p className="result-count">{sortedSets.length} sets</p>
      </section>

      <section className="gallery">
        {sortedSets.map((set) => (
          <article key={set.id} className="set-card" onClick={() => setSelectedSet(set)}>
            <div className="thumb">
              {set.thumb ? (
                <img src={set.thumb} alt={set.name} loading="lazy" />
              ) : (
                <div className="thumb-placeholder">{set.number}</div>
              )}
            </div>
            <div>
              <p className="set-theme">{set.theme}</p>
              <h4>{set.name}</h4>
              <p className="meta">#{set.number} · {set.pieces?.toLocaleString()} pcs</p>
              <p className="price">{formatCurrency(preferredRetail(set))}</p>
            </div>
          </article>
        ))}
        {sortedSets.length === 0 && <p className="empty">No sets match that search.</p>}
      </section>

      {selectedSet && (
        <div className="drawer" role="dialog" aria-modal>
          <div className="drawer-panel">
            <button className="close" onClick={() => setSelectedSet(null)} aria-label="Close detail" />
            <div className="drawer-hero">
              {selectedSet.image ? (
                <img src={selectedSet.image} alt={selectedSet.name} loading="lazy" />
              ) : (
                <div className="thumb-placeholder">{selectedSet.number}</div>
              )}
              <div>
                <p className="set-theme">{selectedSet.theme}</p>
                <h2>{selectedSet.name}</h2>
                <p className="meta">Set #{selectedSet.number} · {selectedSet.pieces?.toLocaleString()} pieces</p>
                <div className="price-grid">
                  <div>
                    <span>Retail</span>
                    <strong>{formatCurrency(preferredRetail(selectedSet))}</strong>
                  </div>
                  <div>
                    <span>BrickLink (New)</span>
                    <strong>{formatCurrency(selectedSet.bricklink.new)}</strong>
                  </div>
                  <div>
                    <span>BrickLink (Used)</span>
                    <strong>{formatCurrency(selectedSet.bricklink.used)}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="info-grid">
              <div>
                <h5>Theme</h5>
                <p>{selectedSet.theme} {selectedSet.subtheme ? `· ${selectedSet.subtheme}` : ''}</p>
              </div>
              <div>
                <h5>Release year</h5>
                <p>{selectedSet.yearFrom || '—'}</p>
              </div>
              <div>
                <h5>Availability</h5>
                <p>{selectedSet.availability ?? '—'}</p>
              </div>
              <div>
                <h5>Packaging</h5>
                <p>{selectedSet.packaging ?? '—'}</p>
              </div>
            </div>

            <div>
              <h3>Minifig lineup ({selectedSet.minifigsCount})</h3>
              {selectedSet.minifigs.length === 0 ? (
                <p className="meta">No minifigs included.</p>
              ) : (
                <ul className="minifig-grid">
                  {selectedSet.minifigs.map((code) => (
                    <li key={code}>
                      <div className="minifig-chip">{code}</div>
                      <span>Character code</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
