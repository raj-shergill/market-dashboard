import { useEffect, useRef } from 'react'

const CONTAINER_ID = 'tradingview-chart-modal'

const SYMBOL_MAP = {
  'ES1!': 'OANDA:SPX500USD',
  'NQ1!': 'OANDA:NAS100USD',
  'RTY1!': 'OANDA:US2000USD',
  'YM1!': 'OANDA:US30USD',
  'DX-Y.NYB': 'CAPITALCOM:DXY',
  'CBOE:VIX': 'AMEX:VIXY',
  'VIX': 'AMEX:VIXY',
  'GC1!': 'OANDA:XAUUSD',
  'SI1!': 'OANDA:XAGUSD',
  'HG1!': 'CAPITALCOM:COPPER',
  'PL1!': 'OANDA:XPTUSD',
  'PA1!': 'OANDA:XPDUSD',
  'CL1!': 'OANDA:WTICOUSD',
  'NG1!': 'OANDA:NATGASUSD',
  'US10Y': 'NASDAQ:IEF',
  'US30Y': 'NASDAQ:TLT',
  'US2Y': 'NASDAQ:SHY',
  '^N225': 'OANDA:JP225USD',
  '^KS11': 'AMEX:EWY',
  '^NSEI': 'AMEX:INDA',
  '000001.SS': 'SSE:000001',
  '000300.SS': 'SZSE:399300',
  '^HSI': 'FXOPEN:HSI',
  '^FTSE': 'OANDA:UK100GBP',
  '^FCHI': 'OANDA:FR40EUR',
  '^GDAXI': 'OANDA:DE30EUR',
  'BTC': 'CRYPTOCAP:BTC',
  'ETH': 'CRYPTOCAP:ETH',
  'SOL': 'CRYPTOCAP:SOL',
  'XRP': 'CRYPTOCAP:XRP',
}

function getTradingViewSymbol(sym) {
  if (SYMBOL_MAP[sym]) return SYMBOL_MAP[sym]
  // Equities/ETFs: use as-is for US symbols (no ^ or special prefix)
  if (sym && /^[A-Z0-9.-]+$/.test(sym) && !sym.startsWith('^')) return sym
  return sym
}

export default function ChartModal({ symbol, onClose }) {
  const widgetRef = useRef(null)
  useEffect(() => {
    const tvSym = getTradingViewSymbol(symbol)
    function init() {
      if (!window.TradingView || !document.getElementById(CONTAINER_ID)) return
      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: tvSym,
        interval: 'D',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#0d0f12',
        backgroundColor: '#0d0f12',
        gridColor: 'rgba(255,255,255,0.06)',
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        container_id: CONTAINER_ID,
        studies: ['STD;SMA'],
      })
    }
    if (window.TradingView) {
      init()
    } else {
      window.addEventListener('load', init)
      const t = setInterval(() => {
        if (window.TradingView) {
          clearInterval(t)
          init()
        }
      }, 100)
      return () => {
        clearInterval(t)
        window.removeEventListener('load', init)
        if (widgetRef.current?.remove) try { widgetRef.current.remove() } catch (_) {}
      }
    }
    return () => {
      if (widgetRef.current?.remove) try { widgetRef.current.remove() } catch (_) {}
      widgetRef.current = null
    }
  }, [symbol])

  return (
    <div className="tv-modal-overlay" onClick={onClose} role="presentation">
      <div className="tv-modal-box" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="tv-modal-header">
          <span className="tv-modal-title">{symbol}</span>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        <div className="tv-frame-wrap">
          <div id={CONTAINER_ID} style={{ width: '100%', height: '100%', minHeight: 400 }} />
        </div>
      </div>
    </div>
  )
}
