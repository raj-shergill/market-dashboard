import DataTable from '../shared/DataTable'
import MacroEventsPanel from '../shared/MacroEventsPanel'
import { TICKER_NAMES } from '../../lib/tickerNames'

const SECTIONS = [
  { key: 'futures', title: 'US Index Futures' },
  { key: 'dxvix', title: 'Volatility & Dollar' },
  { key: 'crypto', title: 'Crypto' },
  { key: 'metals', title: 'Precious & Base Metals' },
  { key: 'energy', title: 'Energy Commodities' },
  { key: 'yields', title: 'US Treasury Yields' },
  { key: 'global', title: 'Global Market Indices' },
]

const ROW_THRESHOLD = 8

const MACRO_FIRST_COL_LABEL = {
  futures: 'Contract',
  dxvix: 'Instrument',
  crypto: 'Asset',
  metals: 'Metal',
  energy: 'Commodity',
  yields: 'Tenor',
  global: 'Index',
}

const MACRO_COLUMNS_BASE = [
  { id: 'price', label: 'Price', format: 'price' },
  { id: 'd1', label: '1D%', pct: true },
  { id: 'w1', label: '1W%', pct: true },
  { id: 'hi52', label: '52W Hi%', pct: true },
  { id: 'ytd', label: 'YTD%', pct: true },
  { id: 'spark', label: '5D', spark: true },
]

function getMacroColumns(sectionKey) {
  const firstLabel = MACRO_FIRST_COL_LABEL[sectionKey] ?? 'Contract / Instrument'
  return [
    { id: 'sym', label: firstLabel, left: true },
    ...MACRO_COLUMNS_BASE,
  ]
}

export default function MacroTab({ data, events, eventsPanelOpen, setEventsPanelOpen, onOpenChart }) {
  if (!data) return null

  return (
    <>
      <MacroEventsPanel events={events} open={eventsPanelOpen} onToggle={() => setEventsPanelOpen(!eventsPanelOpen)} />
      <div className="sections-grid">
        {SECTIONS.map(({ key, title }) => {
          const rows = data[key]
          if (!rows || rows.length === 0) return null
          const isWide = rows.length > ROW_THRESHOLD
          return (
            <div key={key} className={`section-card${isWide ? ' section-card--full-width' : ''}`}>
              <div className="section-card-header">{title}</div>
              <div className="table-wrap">
                <DataTable columns={getMacroColumns(key)} rows={rows} onOpenChart={onOpenChart} tickerNames={TICKER_NAMES} />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
