export default function ColumnGuideModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="column-guide-title">
        <div className="modal-header">
          <span id="column-guide-title">Column guide</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <dl>
            <dt>Grade</dt>
            <dd>A = uptrend (EMA10 &gt; EMA20 &gt; SMA50). B = mixed. C = downtrend.</dd>
            <dt>ATR%</dt>
            <dd>14-day Average True Range as a percentage of price. Higher = more volatility.</dd>
            <dt>ATRx</dt>
            <dd>Distance from 50-day SMA in ATR units. Positive = above SMA, negative = below.</dd>
            <dt>VARS</dt>
            <dd>Volatility Adjusted Relative Strength vs SPY over the last 21 days (0–100). Above 50 = outperforming SPY.</dd>
            <dt>1D% / 1W%</dt>
            <dd>One-day and one-week percentage change.</dd>
            <dt>52W Hi%</dt>
            <dd>Current price as % of 52-week high.</dd>
            <dt>YTD%</dt>
            <dd>Year-to-date return.</dd>
            <dt>5D</dt>
            <dd>Last 5 daily percentage changes (spark).</dd>
            <dt>Trend</dt>
            <dd>▲ = EMA10 above EMA20 (short-term uptrend). ▼ = below.</dd>
          </dl>
        </div>
      </div>
    </div>
  )
}
