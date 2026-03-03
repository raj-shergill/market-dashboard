const TABS = [
  { id: 'macro', label: 'Macro overview' },
  { id: 'equities', label: 'Equities overview' },
  { id: 'breadth', label: 'Market breadth & sentiment' },
]

export default function Tabs({ activeTab, setActiveTab }) {
  return (
    <div className="tabs">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={`tab ${activeTab === id ? 'active' : ''}`}
          onClick={() => setActiveTab(id)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
