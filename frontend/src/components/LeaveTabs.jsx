import React from 'react'

export default function LeaveTabs({ tabs, activeTab, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          style={{
            border: 'none',
            borderRadius: '999px',
            padding: '0.85rem 1.25rem',
            cursor: 'pointer',
            background: activeTab === tab.key ? '#2d6bcf' : 'rgba(229, 231, 235, 0.8)',
            color: activeTab === tab.key ? '#fff' : '#475569',
            fontWeight: 600,
            fontSize: '13px',
            transition: 'all 0.2s ease',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
