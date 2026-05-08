import React from 'react'

const variants = {
  planned: {
    accent: '#2d6bcf',
    iconBg: '#dceeff',
    border: '#d7e6fb',
  },
  unplanned: {
    accent: '#b7791f',
    iconBg: '#fff4d9',
    border: '#f8e5b8',
  },
}

export default function LeaveCard({ title, available, booked, variant }) {
  const styles = variants[variant] || variants.planned

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      padding: '1.5rem',
      borderRadius: '20px',
      border: `1px solid ${styles.border}`,
      background: '#fff',
      boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
      minWidth: '240px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '14px',
          background: styles.iconBg,
          display: 'grid',
          placeItems: 'center',
        }}>
          <span style={{ fontSize: '18px' }}>{variant === 'planned' ? '☀️' : '🌤️'}</span>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 600 }}>{title}</p>
        </div>
      </div>

      <div>
        <p style={{ margin: '0 0 0.5rem', fontSize: '12px', color: '#64748b' }}>Available</p>
        <p style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: styles.accent }}>{available}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <p style={{ margin: '0 0 0.25rem', fontSize: '12px', color: '#64748b' }}>Booked</p>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#334155' }}>{booked}</p>
        </div>
        <div style={{ width: '28px', height: '28px', borderRadius: '10px', border: `1px solid ${styles.border}`, display: 'grid', placeItems: 'center', color: styles.accent }}>
          <span style={{ fontSize: '14px' }}>i</span>
        </div>
      </div>
    </div>
  )
}
