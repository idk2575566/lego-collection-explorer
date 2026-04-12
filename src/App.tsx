import { useEffect, useMemo, useState } from 'react'
import './App.css'

type CollectionItem = {
  id: string
  name: string
  number: string
  theme: string
  faction: string
  retailPrice: { uk: number | null }
  image: string | null
  thumb: string | null
}

type ThemeStat = {
  theme: string
  sets: number
  value: number
}

type SortOption = 'retail' | 'name' | 'release'

const formatCurrency = (value?: number | null, currency = 'GBP') => {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value)
}

const preferredRetail = (set: CollectionItem) => set.retailPrice.uk ?? null

function App() {
  const [sets, setSets] = useState<CollectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTheme, setActiveTheme] = useState<string>('All Themes')
  const [search, setSearch] = useState('')
  const [selectedSet, setSelectedSet] = useState<CollectionItem | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('retail')
  const [suggestions, setSuggestions] = useState<CollectionItem[]>([])

  useEffect(() => {
    let cancelled = false
    const sheetId = (import.meta.env.VITE_TRANSFORMERS_SHEET_ID as string) || '1jXpMbJ18-weODPfyR8KIqIYFNcEMIuL8vV5Z8O92I5g'
    const gid = (import.meta.env.VITE_TRANSFORMERS_SHEET_GID as string) || '1360451326' // Site Source Clean
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`

    const parseCurrency = (v?: string) => {
      if (!v) return null
      const num = v.replace(/[^0-9.\-]/g, '')
      const n = parseFloat(num)
      return Number.isFinite(n) ? n : null
    }

    const load = async () => {
      try {
        const res = await fetch(csvUrl)
        if (!res.ok) throw new Error('Failed to fetch sheet CSV')
        const text = await res.text()
        const rows = text.split(/\r?\n/).map((r) => r.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/))
        const headers = rows[0].map((h) => h.trim().replace(/^"|"$/g, ''))
        const data = rows.slice(1).filter((r) => r.length >= 2).map((r, idx) => {
          const obj: any = {}
          headers.forEach((h, i) => (obj[h] = (r[i] || '').trim().replace(/^"|"$/g, '')))
          return {
            id: String(idx + 1),
            name: obj['Figure'] || obj['Figure/Release'] || 'Untitled',
            number: obj['Release Order'] || '',
            theme: obj['Faction'] || 'Unknown',
            faction: obj['Faction'] || 'Unknown',
            retailPrice: { uk: parseCurrency(obj['RRP / Launch Retail (GBP)'] || obj['RRP'] || obj['Price (GBP)']) },
            image: obj['Image URL'] || obj['Image'] || '',
            thumb: obj['Image URL'] || obj['Thumb'] || obj['Image'] || '',
          } as CollectionItem
        }).filter((item) => item.image)
        if (!cancelled) {
          setSets(data)
          setLoading(false)
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setError('Failed to load Transformers collection data from the clean sheet tab.')
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
      }
      existing.sets += 1
      existing.value += preferredRetail(set) ?? 0
      map.set(key, existing)
    }
    return Array.from(map.values())
      .sort((a, b) => b.value - a.value)
  }, [sets])

  const overallStats = useMemo(() => {
    const totalRetail = sets.reduce((sum, set) => sum + (preferredRetail(set) ?? 0), 0)
    return { totalRetail }
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
      case 'release':
        return clone.sort((a, b) => Number(a.number || 0) - Number(b.number || 0))
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
          <p className="eyebrow">Jarvis Labs · Transformers Explorer</p>
          <h1>Grant&apos;s Transformers Collection</h1>
          <p className="lede">
            Browse {sets.length.toLocaleString()} figures. Filter by faction, search by name, and tap a card for a larger view.
          </p>
        </div>
        <div className="badge">
          <span>Total Retail</span>
          <strong>{formatCurrency(overallStats.totalRetail)}</strong>
        </div>
      </header>

      <section className="stats-grid">
        <article>
          <p>Total Retail</p>
          <h2>{formatCurrency(overallStats.totalRetail)}</h2>
          <small>Based on launch retail prices in GBP.</small>
        </article>
        <article>
          <p>Average Price / Figure</p>
          <h2>{formatCurrency(overallStats.totalRetail / sets.length)}</h2>
          <small>Across the current clean Transformers dataset.</small>
        </article>
      </section>

      <section className="theme-section">
        <div className="section-heading">
          <h3>Faction filter</h3>
          <p>Tap to filter the collection.</p>
        </div>
        <div className="theme-grid">
          <button
            className={activeTheme === 'All Themes' ? 'theme-card active' : 'theme-card'}
            onClick={() => setActiveTheme('All Themes')}
          >
            <strong>All Figures</strong>
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
            <p className="meta">{activeThemeStat.sets} figures · {formatCurrency(activeThemeStat.value)} total retail</p>
          </div>
          <div className="theme-detail-stats">
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
          <label htmlFor="search">Search figures</label>
          <input
            id="search"
            type="search"
            placeholder="E.g. Optimus, Soundwave, 86"
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
                    <span>#{set.number} · {set.faction}</span>
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
            <option value="release">Release order</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </div>
        <p className="result-count">{sortedSets.length} figures</p>
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
              <p className="meta">Release #{set.number}</p>
              <p className="price">{formatCurrency(preferredRetail(set))}</p>
            </div>
          </article>
        ))}
        {sortedSets.length === 0 && <p className="empty">No figures match that search.</p>}
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
                <p className="meta">Release #{selectedSet.number}</p>
                <div className="price-grid">
                  <div>
                    <span>Retail</span>
                    <strong>{formatCurrency(preferredRetail(selectedSet))}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="info-grid">
              <div>
                <h5>Faction</h5>
                <p>{selectedSet.faction || '—'}</p>
              </div>
              <div>
                <h5>Release order</h5>
                <p>{selectedSet.number || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
