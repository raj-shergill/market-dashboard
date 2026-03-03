import './BreadthTab.css'

function GaugeCircle({ label, value, sub, valueColor = 'var(--accent)' }) {
  return (
    <div className="breadth-gauge">
      <div className="breadth-gauge__ring">
        <div className="breadth-gauge__inner">
          <span className="breadth-gauge__value" style={{ color: valueColor }}>{value}</span>
          {sub != null && sub !== '' && (
            <span className="breadth-gauge__sub">{sub}</span>
          )}
        </div>
      </div>
      <div className="breadth-gauge__label">{label}</div>
    </div>
  )
}

export default function BreadthTab({ data }) {
  if (!data) return <div className="loading">No breadth data</div>

  const ad = data.advance_decline
  const nhl = data.new_high_low
  const fg = data.fear_greed
  const naaim = data.naaim

  return (
    <>
      <div className="section-card breadth-section">
        <div className="section-card-header">
          <span>Market breadth & sentiment</span>
          <span className="breadth-badge">S&P 500 internals · Updated daily</span>
        </div>
        <div className="breadth-cluster">
          {ad && (
            <>
              <GaugeCircle
                label="Advances"
                value={ad.advancers}
                sub="adv"
                valueColor="var(--green)"
              />
              <GaugeCircle
                label="Declines"
                value={ad.decliners}
                sub="dec"
                valueColor="var(--red)"
              />
            </>
          )}
          {nhl && (
            <>
              <GaugeCircle
                label="52W Highs"
                value={nhl.new_highs}
                sub="new highs"
                valueColor="var(--green)"
              />
              <GaugeCircle
                label="52W Lows"
                value={nhl.new_lows}
                sub="new lows"
                valueColor="var(--red)"
              />
            </>
          )}
          {data.pct_above_sma20 != null && (
            <GaugeCircle
              label="% above SMA 20"
              value={`${data.pct_above_sma20}%`}
              sub="S&P 500"
            />
          )}
          {data.pct_above_sma50 != null && (
            <GaugeCircle
              label="% above SMA 50"
              value={`${data.pct_above_sma50}%`}
              sub="S&P 500"
            />
          )}
          {data.pct_above_sma200 != null && (
            <GaugeCircle
              label="% above SMA 200"
              value={`${data.pct_above_sma200}%`}
              sub="S&P 500"
            />
          )}
          {fg && (
            <GaugeCircle
              label="Fear & Greed"
              value={fg.score}
              sub={fg.rating}
              valueColor="var(--amber)"
            />
          )}
          {naaim && (
            <GaugeCircle
              label="NAAIM Exposure"
              value={`${naaim.value}%`}
              sub={naaim.date}
            />
          )}
        </div>
      </div>
    </>
  )
}
