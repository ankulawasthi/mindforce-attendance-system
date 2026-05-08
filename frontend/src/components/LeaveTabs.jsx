import React, { useState } from 'react'

export default function LeaveTabs({ tabs, activeTab, onChange }) {
  const [hoveredTab, setHoveredTab] = useState(null)

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.key
        const isHovered = hoveredTab === tab.key
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            onMouseEnter={() => setHoveredTab(tab.key)}
            onMouseLeave={() => setHoveredTab(null)}
            style={{
              border: 'none',
              borderRadius: '999px',
              padding: '0.85rem 1.25rem',
              cursor: 'pointer',
              background: isActive ? '#1e40af' : isHovered ? 'rgba(229, 231, 235, 0.9)' : 'rgba(229, 231, 235, 0.8)',
              color: isActive ? '#fff' : '#475569',
              fontWeight: 600,
              fontSize: '13px',
              transition: 'all 0.2s ease',
              boxShadow: isActive ? '0 4px 12px rgba(30, 64, 175, 0.3)' : 'none',
              transform: isActive ? 'translateY(-1px)' : 'none',
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
