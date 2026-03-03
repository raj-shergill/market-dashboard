/**
 * Mini line chart (sparkline) for 5D % change or VARS series.
 * values: array of numbers (daily % changes or VARS 0-100)
 * positive: if true use green, else red (for 5D by 1W%); omit for neutral/accent (e.g. VARS)
 */
export default function Sparkline({ values, width = 80, height = 28, positive }) {
  if (!values || values.length === 0) return null
  const arr = Array.isArray(values) ? values : []
  if (arr.length < 2) return <span className="spark-mini">{arr[0] != null ? `${arr[0] > 0 ? '+' : ''}${arr[0]}%` : '—'}</span>

  const padding = 2
  const w = width - padding * 2
  const h = height - padding * 2
  const min = Math.min(...arr)
  const max = Math.max(...arr)
  const range = max - min || 1
  const scaleY = (v) => padding + h - ((v - min) / range) * h
  const scaleX = (i) => padding + (i / (arr.length - 1)) * w

  const points = arr.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(' ')
  const pathD = `M ${points}`

  let stroke = 'var(--accent)'
  if (positive === true) stroke = 'var(--green)'
  else if (positive === false) stroke = 'var(--red)'

  return (
    <svg
      width={width}
      height={height}
      className="sparkline-svg"
      aria-hidden
    >
      <path
        d={pathD}
        fill="none"
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
