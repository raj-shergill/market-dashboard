import { useState, useEffect } from 'react'

function formatGMT(date) {
  return date.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function formatDateGMT(date) {
  return date.toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatSyncedGMT(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short', hour12: false }) + ' GMT'
  } catch {
    return iso
  }
}

function useUSMarketOpen() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    function check() {
      const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false })
      const parts = formatter.formatToParts(new Date())
      const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10)
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10)
      const mins = hour * 60 + minute
      const openMins = 9 * 60 + 30
      const closeMins = 16 * 60
      setOpen(mins >= openMins && mins < closeMins)
    }
    check()
    const t = setInterval(check, 60000)
    return () => clearInterval(t)
  }, [])
  return open
}

export default function Header({ generatedAt, children }) {
  const [now, setNow] = useState(() => new Date())
  const usOpen = useUSMarketOpen()

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">Market Dashboard</h1>
      </div>
      <div className="header-center">
        {children}
      </div>
      <div className="header-right">
        <div className="header-clock">
          <span className="date">{formatDateGMT(now)}</span>
          <span className="time">{formatGMT(now)} GMT</span>
        </div>
        <div className="header-synced">
          Data synced: {formatSyncedGMT(generatedAt)}
        </div>
        <div className={`header-market ${usOpen ? 'header-market--open' : 'header-market--closed'}`}>
          {usOpen ? 'US market open' : 'US market closed'}
        </div>
      </div>
    </header>
  )
}
