import { useState, useEffect } from 'react'
import Header from './components/layout/Header'
import Tabs from './components/tabs/Tabs'
import MacroTab from './components/tabs/MacroTab'
import EquitiesTab from './components/tabs/EquitiesTab'
import BreadthTab from './components/tabs/BreadthTab'
import ColumnGuideModal from './components/modals/ColumnGuideModal'
import ChartModal from './components/modals/ChartModal'
const DATA_URL = '/data/data.json'
const EVENTS_URL = '/data/events.json'

export default function App() {
  const [data, setData] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('macro')
  const [columnGuideOpen, setColumnGuideOpen] = useState(false)
  const [chartSymbol, setChartSymbol] = useState(null)
  const [eventsPanelOpen, setEventsPanelOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [dataRes, eventsRes] = await Promise.all([
          fetch(DATA_URL),
          fetch(EVENTS_URL).catch(() => ({ ok: false })),
        ])
        if (!dataRes.ok) throw new Error('Failed to load data')
        const json = await dataRes.json()
        if (!cancelled) setData(json)
        if (eventsRes.ok) {
          const ev = await eventsRes.json()
          if (!cancelled) setEvents(Array.isArray(ev) ? ev : [])
        } else if (json.events) {
          if (!cancelled) setEvents(json.events)
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <div className="app">
        <Header generatedAt={null}><Tabs activeTab="macro" setActiveTab={() => {}} /></Header>
        <div className="main">
          <div className="loading">
            {error}. Run <code>python scripts/build_data.py --out-dir public/data</code> and ensure <code>public/data/data.json</code> exists.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Header generatedAt={data?.generated_at ?? null}>
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      </Header>
      <div className="main">
        {loading ? (
          <div className="loading">Loading market data…</div>
        ) : (
          <>
            {activeTab === 'macro' && (
              <MacroTab
                data={data}
                events={events}
                eventsPanelOpen={eventsPanelOpen}
                setEventsPanelOpen={setEventsPanelOpen}
                onOpenChart={setChartSymbol}
              />
            )}
            {activeTab === 'equities' && (
              <EquitiesTab
                data={data}
                holdings={data?.holdings || {}}
                onOpenChart={setChartSymbol}
                onOpenColumnGuide={() => setColumnGuideOpen(true)}
              />
            )}
            {activeTab === 'breadth' && <BreadthTab data={data?.breadth} />}
          </>
        )}
      </div>
      {columnGuideOpen && (
        <ColumnGuideModal onClose={() => setColumnGuideOpen(false)} />
      )}
      {chartSymbol && (
        <ChartModal symbol={chartSymbol} onClose={() => setChartSymbol(null)} />
      )}
    </div>
  )
}
