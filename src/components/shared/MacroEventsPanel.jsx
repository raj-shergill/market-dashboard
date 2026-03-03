export default function MacroEventsPanel({ events, open, onToggle }) {
  return (
    <div className="panel">
      <div className="panel-header" onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onToggle()}>
        <span>Macro events (next 7 days)</span>
        <span>{open ? '▼' : '▶'}</span>
      </div>
      {open && (
        <div className="panel-body">
          {!events || events.length === 0 ? (
            <p>No high-importance U.S. macro events in the next 7 days.</p>
          ) : (
            events.map((e, i) => (
              <div key={i} className="event-item">
                <span className="event-datetime">{e.date} {e.time}</span>
                {' · '}
                {e.event}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
