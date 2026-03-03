import { useState, Fragment } from 'react'
import Sparkline from './Sparkline'

function pctClass(v) {
  if (v == null) return 'num-neu'
  if (v > 0) return 'num-up'
  if (v < 0) return 'num-dn'
  return 'num-neu'
}

function formatPct(v) {
  if (v == null) return '—'
  const s = v >= 0 ? '+' : ''
  return `${s}${Number(v).toFixed(2)}%`
}

function formatPrice(v) {
  if (v == null) return '—'
  const n = Number(v)
  if (n >= 1000) return n.toFixed(0)
  if (n >= 1) return n.toFixed(2)
  return n.toFixed(4)
}

export default function DataTable({
  columns,
  rows,
  onOpenChart,
  showGrade,
  showHoldings,
  holdings,
  colSpan,
  highlightTopN = 0,
  tickerNames = {},
}) {
  const [expandedRow, setExpandedRow] = useState(null)

  return (
    <table>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.id} className={col.left ? 'left' : ''}>
              {col.label}
            </th>
          ))}
          {showHoldings && <th className="left">Holdings</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const sym = row.sym
          const list = holdings?.[sym] ?? (sym && holdings?.[String(sym).replace(/[!1]/g, '')]) ?? null
          const hasHoldings = list && list.length > 0
          const isExpanded = expandedRow === i
          const isTopRow = highlightTopN > 0 && i < highlightTopN
          return (
            <Fragment key={sym ?? i}>
              <tr className={isTopRow ? 'row-top-3' : undefined}>
                {columns.map((col) => {
                  const val = row[col.id]
                  if (col.rank) {
                    return (
                      <td key={col.id} className="rank-cell">
                        <span className="rank-num">{i + 1}</span>
                      </td>
                    )
                  }
                  if (col.spark && Array.isArray(val)) {
                    const w1 = row.w1
                    const positive = w1 != null ? w1 >= 0 : undefined
                    return (
                      <td key={col.id} className="spark-cell">
                        <Sparkline values={val} positive={positive} />
                      </td>
                    )
                  }
                  if (col.pct) {
                    return (
                      <td key={col.id} className={pctClass(val)}>
                        {formatPct(val)}
                      </td>
                    )
                  }
                  if (col.format === 'price') {
                    return <td key={col.id}>{formatPrice(val)}</td>
                  }
                  if (col.id === 'sym' && onOpenChart) {
                    const displaySym = val != null ? String(val) : (sym != null ? String(sym) : '—')
                    const name = tickerNames[sym] ?? tickerNames[displaySym]
                    return (
                      <td key={col.id} className="left">
                        <button type="button" className="ticker-link" onClick={() => onOpenChart(sym)}>
                          {name ? (
                            <>
                              <span className="ticker-name">{name}</span>
                              <span className="ticker-sym">{displaySym}</span>
                            </>
                          ) : (
                            displaySym
                          )}
                        </button>
                      </td>
                    )
                  }
                  if (col.id === 'grade' && val) {
                    return (
                      <td key={col.id}>
                        <span className={`grade grade-${val}`}>{val}</span>
                      </td>
                    )
                  }
                  if (col.id === 'ema_uptrend') {
                    return (
                      <td key={col.id}>
                        {val === true ? <span className="num-up">▲</span> : val === false ? <span className="num-dn">▼</span> : '—'}
                      </td>
                    )
                  }
                  return (
                    <td key={col.id} className={col.left ? 'left' : ''}>
                      {val != null ? String(val) : '—'}
                    </td>
                  )
                })}
                {showHoldings && (
                  <td className="left">
                    {hasHoldings ? (
                      <button
                        type="button"
                        className={`holdings-toggle ${isExpanded ? 'open' : ''}`}
                        onClick={() => setExpandedRow(isExpanded ? null : i)}
                      >
                        {isExpanded ? '▼' : '▶'} Top 10
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                )}
              </tr>
              {showHoldings && hasHoldings && isExpanded && (
                <tr className="holdings-row show">
                  <td colSpan={colSpan ?? columns.length + 1} className="holdings-inner">
                    <div className="holdings-list">
                      {list.map((h, j) => (
                        <span key={j} className="holding-item">
                          <span className="sym">{h.s}</span>
                          <span className="name">{h.n}</span>
                          {h.w != null && <span className="pct">{h.w}%</span>}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )
}
