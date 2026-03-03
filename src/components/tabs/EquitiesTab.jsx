import DataTable from '../shared/DataTable'
import { TICKER_NAMES } from '../../lib/tickerNames'

const SECTIONS = [
  { key: 'etfmain', title: 'Major ETF Stats' },
  { key: 'submarket', title: 'S&P 500 Sub-Market Performance' },
  { key: 'sector', title: 'S&P 500 Sub-Sector' },
  { key: 'sectorew', title: 'S&P 500 EW Sub-Sector' },
  { key: 'thematic', title: 'Top Thematic Sectors' },
  { key: 'country', title: 'Country ETFs' },
]

const EQUITY_COLUMNS_BASE = [
  { id: 'sym', label: 'ETF', left: true },
  { id: 'grade', label: 'Grade' },
  { id: 'price', label: 'Price', format: 'price' },
  { id: 'd1', label: '1D%', pct: true },
  { id: 'w1', label: '1W%', pct: true },
  { id: 'hi52', label: '52W Hi%', pct: true },
  { id: 'ytd', label: 'YTD%', pct: true },
  { id: 'spark', label: '5D', spark: true },
  { id: 'atr_pct', label: 'ATR%', pct: false },
  { id: 'atrx', label: 'ATRx' },
  { id: 'vars', label: 'VARS' },
  { id: 'ema_uptrend', label: 'Trend' },
]

function getEquityColumns(showRank) {
  if (!showRank) return EQUITY_COLUMNS_BASE
  return [{ id: '_rank', label: '#', rank: true, width: 32 }, ...EQUITY_COLUMNS_BASE]
}

export default function EquitiesTab({ data, holdings, onOpenChart, onOpenColumnGuide }) {
  if (!data) return null

  return (
    <>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={onOpenColumnGuide}>
          Column guide
        </button>
      </div>
      <div className="sections-grid sections-grid--single">
        {SECTIONS.map(({ key, title }) => {
          const rows = data[key]
          if (!rows || rows.length === 0) return null
          const showRank = key !== 'etfmain'
          const columns = getEquityColumns(showRank)
          return (
            <div key={key} className="section-card">
              <div className="section-card-header">
                <span>{title}</span>
                {showRank && <span className="section-card-sort">Sorted by 1W%</span>}
              </div>
              <div className="table-wrap">
                <DataTable
                  columns={columns}
                  rows={rows}
                  onOpenChart={onOpenChart}
                  showHoldings
                  holdings={holdings}
                  colSpan={columns.length + 1}
                  highlightTopN={showRank ? 3 : 0}
                  tickerNames={TICKER_NAMES}
                />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
