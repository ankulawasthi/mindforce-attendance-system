import React from 'react'

export default function LeaveTable({ rows }) {
  return (
    <div style={{
      borderRadius: '20px',
      background: '#fff',
      boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
      padding: '1rem',
      overflowX: 'auto',
    }}>
      <div style={{ padding: '1rem 0 0.5rem', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Upcoming Leaves & Holidays</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '420px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '13px', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Date</th>
            <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '13px', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Event Name</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '14px', color: '#334155', fontSize: '14px' }}>{row.date}</td>
              <td style={{ padding: '14px', color: '#334155', fontSize: '14px' }}>{row.event}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
